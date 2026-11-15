/**
 * C2 step 5h: what optical depth the drawn veil actually paints, measured from the particles themselves.
 *
 *   node docs/research/wave-strategy-alternatives/c2-step5h-optics.mjs <probe-at<N>s.json> [more probes...]
 *
 * 5g's covered-pixel column summed each sprite's projected disc with **no allowance for overlap**, so it was an upper
 * bound on what the cloud could paint and said nothing about how hard it paints it. This rasterises instead, into the
 * stills' own cameras (`waterSheetShots`, fov 55, 1280 x 720, three's lookAt with up +y -- the same arithmetic as
 * `c2-step5g-project.mjs`, which was checked against its stills), accumulating per pixel the optical depth
 *
 *     tau(pixel) = sum over sprites of -ln( 1 - alpha_i * profile_i(r) )
 *
 * because alpha blending composites as a product of transmissions, so optical depths add. `profile` is the shader's
 * own radial falloff: (1 - r)^2 for a mist sprite, 1 - r^2 for a drop cluster (`richSpray.ts`).
 *
 * Two alpha rules are run over the **same** particles, so the opacity change is isolated from everything else:
 *   - `drawn`: the alpha the probe carries, which is what the page drew;
 *   - `5g`: the constant 0.8 per drop cluster and 0.25 per mist sprite that step 5g shipped.
 *
 * The target is the owner's photograph's own optical depth, which `../tube-spray-reference-2026-11-14/README.md`
 * item 2 brackets at tau = 0.35-1.2 along the ray (centre about 0.5) -- a bracket, not a number.
 */
import { readFileSync } from 'node:fs';

const MIST_KINDS = new Set([1, 4]);
/** A pixel counts as inside the veil's footprint once it is painted this hard: below it nothing is visible. */
const FOOTPRINT = 0.02;

function viewOf(shot, camera) {
  const [ex, ey, ez] = shot.eye;
  const [tx, ty, tz] = shot.target;
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  let xx = zz, xy = 0, xz = -zx;
  const xl = Math.hypot(xx, xy, xz);
  if (xl < 1e-6) { xx = 1; xy = 0; xz = 0; } else { xx /= xl; xy /= xl; xz /= xl; }
  const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
  const tanHalf = Math.tan((camera.fov * Math.PI) / 360);
  const aspect = camera.width / camera.height;
  return (px, py, pz) => {
    const vx = px - ex, vy = py - ey, vz = pz - ez;
    const cx = vx * xx + vy * xy + vz * xz;
    const cy = vx * yx + vy * yy + vz * yz;
    const depth = -(vx * zx + vy * zy + vz * zz);
    if (!(depth > camera.near) || depth > camera.far) return undefined;
    return {
      depth,
      x: ((cx / (depth * tanHalf * aspect)) + 1) / 2 * camera.width,
      y: (1 - cy / (depth * tanHalf)) / 2 * camera.height,
      radius: (0.5 / (depth * tanHalf)) * camera.height,
    };
  };
}

const quantile = (sorted, q) => (sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : 0);

function raster(particles, project, camera, alphaOf) {
  const tau = new Float64Array(camera.width * camera.height);
  let discs = 0;
  let ink = 0;
  for (const p of particles) {
    const [px, py, pz, size, , kind] = p;
    if (kind === 2) continue; // a foam ball is a tube's whitewater, not the veil
    const at = project(px, py, pz);
    if (!at) continue;
    // The Rich mist sprite is drawn 1.6x wide (`richSprayVertex`); a drop cluster at its own size.
    const mist = MIST_KINDS.has(kind);
    const r = at.radius * size * (mist ? 1.6 : 1);
    if (!(r > 0)) continue;
    const alpha = alphaOf(p);
    if (!(alpha > 0)) continue;
    discs += Math.PI * r * r;
    const x0 = Math.max(0, Math.floor(at.x - r)), x1 = Math.min(camera.width - 1, Math.ceil(at.x + r));
    const y0 = Math.max(0, Math.floor(at.y - r)), y1 = Math.min(camera.height - 1, Math.ceil(at.y + r));
    for (let y = y0; y <= y1; y += 1) {
      for (let x = x0; x <= x1; x += 1) {
        const d = Math.hypot(x + 0.5 - at.x, y + 0.5 - at.y) / r;
        if (d > 1) continue;
        const profile = mist ? (1 - d) * (1 - d) : 1 - d * d;
        const a = Math.min(0.999999, alpha * profile);
        if (a <= 0) continue;
        tau[y * camera.width + x] += -Math.log(1 - a);
        ink += a;
      }
    }
  }
  const lit = [];
  let painted = 0;
  for (const t of tau) {
    if (t > 0) painted += 1;
    if (t > FOOTPRINT) lit.push(t);
  }
  lit.sort((a, b) => a - b);
  return {
    discs, ink, painted, lit: lit.length,
    median: quantile(lit, 0.5), p75: quantile(lit, 0.75), p95: quantile(lit, 0.95),
    thin: lit.filter((t) => t >= 0.35 && t <= 1.2).length, // the owner's photograph's own bracket
    opaque: lit.filter((t) => t > 2.3).length, // transmission under 10 %: a white mass, not a veil
  };
}

const camera = { fov: 55, width: 1280, height: 720, near: 0.1, far: 4000 };
const frame = camera.width * camera.height;
const drawnAlpha = (p) => p[4];
const constantAlpha = (p) => (MIST_KINDS.has(p[5]) ? 0.25 : 0.8);

for (const file of process.argv.slice(2)) {
  const probe = JSON.parse(readFileSync(file, 'utf8'));
  const particles = probe.spray?.particles ?? probe.particles ?? [];
  console.log(`\n### ${file}  (${particles.length} live particles)`);
  const alphas = particles.filter((p) => p[5] !== 2).map((p) => p[4]).sort((a, b) => a - b);
  console.log(`alpha over ${alphas.length} drawn sprites: min ${quantile(alphas, 0).toFixed(3)}, p25 ${quantile(alphas, 0.25).toFixed(3)}, median ${quantile(alphas, 0.5).toFixed(3)}, p75 ${quantile(alphas, 0.75).toFixed(3)}, max ${alphas[alphas.length - 1]?.toFixed(3)}; distinct values ${new Set(alphas).size}`);
  console.log('| shot | rule | painted px | % of frame | unit-opacity px (the ink) | % of frame | τ median / p75 / p95 | px in the photograph\'s 0.35–1.2 | px over τ 2.3 (opaque) |');
  console.log('| --- | --- | --- | --- | --- | --- | --- | --- | --- |');
  for (const shot of probe.shots ?? []) {
    const project = viewOf(shot, camera);
    for (const [name, rule] of [['drawn', drawnAlpha], ['5g constant', constantAlpha]]) {
      const r = raster(particles, project, camera, rule);
      if (r.painted === 0) continue;
      console.log(`| \`${shot.name}\` | ${name} | ${r.painted} | ${(100 * r.painted / frame).toFixed(2)} % | ${Math.round(r.ink)} | ${(100 * r.ink / frame).toFixed(2)} % | **${r.median.toFixed(2)}** / ${r.p75.toFixed(2)} / ${r.p95.toFixed(2)} | ${r.thin} | ${r.opaque} |`);
    }
  }
}
