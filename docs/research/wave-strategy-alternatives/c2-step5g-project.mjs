/**
 * C2 step 5g: project the live spray particles into each shot camera's frustum, and say how much of each frame they
 * can cover at all.
 *
 *   node docs/research/wave-strategy-alternatives/c2-step5g-project.mjs <probe-at<N>s.json> [more probes...]
 *
 * The frustum test uses the stills' own cameras (`waterSheetShots`, fov 55, 1280x720, three's lookAt with up +y) --
 * the same arithmetic as step 5d's `c2-step5g-project.mjs`, which was checked against the stills it explained.
 *
 * The covered-area column is the sum of each particle's projected disc, pi r^2, over the frame's 921 600 px, with
 * **no allowance for overlap**, so it is an upper bound on what the spray can paint. A sprite sized `size` m at
 * `depth` m subtends size / depth rad, which is (size / depth) / (2 tan(fov/2)) x 720 px across.
 */
import { readFileSync } from 'node:fs';

const KIND = ['spray', 'mist', 'foam ball', 'tube spray', 'tube mist'];

/** A camera from a shot's eye and target: three's lookAt, up +y, vertical fov. */
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
    const cz = vx * zx + vy * zy + vz * zz;
    const depth = -cz;
    if (!(depth > camera.near) || depth > camera.far) return { inFront: false };
    const ndcX = cx / (depth * tanHalf * aspect);
    const ndcY = cy / (depth * tanHalf);
    return {
      inFront: true, depth, ndcX, ndcY,
      inside: Math.abs(ndcX) <= 1 && Math.abs(ndcY) <= 1,
      px: Math.round(((ndcX + 1) / 2) * camera.width), py: Math.round(((1 - ndcY) / 2) * camera.height),
      tanHalf,
    };
  };
}

for (const file of process.argv.slice(2)) {
  const P = JSON.parse(readFileSync(file, 'utf8'));
  const camera = P.camera;
  const frame = camera.width * camera.height;
  console.log(`\n=== ${file}`);
  console.log(`address ${P.search}`);
  console.log(`held at ${P.seconds} s, compute ${P.compute}`);
  const kinds = P.spray.kinds;
  console.log(`spray: ${P.spray.count} live — ${kinds.map((n, k) => `${n} ${KIND[k]}`).join(', ')}`);
  console.log(`sea lip landings in the step: ${P.lip.count}`);
  const landed = P.landed.slices.filter((s) => s.phase === 2);
  console.log(`library slices: ${P.landed.count} drawn, ${landed.length} landed (phase 2)`);
  const p = P.spray.particles;
  if (p.length) {
    const y = p.map((q) => q[1]).sort((a, b) => a - b);
    console.log(`particle height over datum, m: min ${y[0]}, median ${y[Math.floor(y.length / 2)]}, 90 % ${y[Math.floor(y.length * 0.9)]}, max ${y[y.length - 1]}`);
  }

  // Distance from each particle to the nearest landed library crest: does the spray sit where the library broke?
  if (landed.length && p.length) {
    const near = p.map((q) => Math.min(...landed.map((s) => Math.hypot(q[0] - s.crest[0], q[2] - s.crest[2]))));
    const s = near.slice().sort((a, b) => a - b);
    console.log(`distance to the nearest landed library crest, m: median ${s[Math.floor(s.length / 2)].toFixed(1)}, 10 % ${s[Math.floor(s.length * 0.1)].toFixed(1)}, 90 % ${s[Math.floor(s.length * 0.9)].toFixed(1)}`);
  }

  console.log('');
  console.log('| shot | eye | in front | inside | nearest, m | covered px (upper bound) | % of frame |');
  console.log('| --- | --- | --- | --- | --- | --- | --- |');
  for (const shot of P.shots) {
    const project = viewOf(shot, camera);
    let inFront = 0;
    let inside = 0;
    let nearest = Infinity;
    let area = 0;
    const byKind = [0, 0, 0, 0, 0];
    for (const q of p) {
      const r = project(q[0], q[1], q[2]);
      if (!r.inFront) continue;
      inFront += 1;
      if (!r.inside) continue;
      inside += 1;
      byKind[q[5]] += 1;
      nearest = Math.min(nearest, r.depth);
      const pixels = (q[3] / r.depth) / (2 * r.tanHalf) * camera.height;
      area += Math.PI * (pixels / 2) ** 2;
    }
    console.log(`| \`${shot.name}\` | (${shot.eye.join(', ')}) | ${inFront} | **${inside}** | ${nearest === Infinity ? '—' : nearest.toFixed(1)} | ${Math.round(area)} | ${(100 * area / frame).toFixed(2)} % |`
      + (inside ? `  <!-- ${byKind.map((n, k) => `${n} ${KIND[k]}`).join(', ')} -->` : ''));
  }
}
