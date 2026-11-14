/**
 * C2 step 5d (ruling 39 §"Next, in order" item 1): project the render nodes whose foam the bore changed into each
 * shot camera's frustum, and say whether the cameras miss the patch or something drops it between the field and the
 * draw.
 *
 *   node docs/research/wave-strategy-alternatives/c2-step5d-project.mjs <legA/probe-at72s.json> <legB/probe-at72s.json>
 *
 * Leg A is the branch as it stands; leg B is the same build with the bore's foam switched off (the `aired` block of
 * `WaveZone.applySnapshot` and `applyAeration`). Both probes dump the page's own (height, foam) field in the very
 * frame a still is shot, so the difference is the bore foam **as it reaches the draw** — not as the zone computes it.
 *
 * The frustum test uses the stills' own cameras (`waterSheetShots`, fov 55, 1280×720, three's lookAt with up +y), and
 * an occlusion march over the drawn surface itself says whether a node in view is in front of the water or behind it.
 */
import { readFileSync } from 'node:fs';

const unpack = (base64) => {
  const bytes = Buffer.from(base64, 'base64');
  return new Float32Array(bytes.buffer, bytes.byteOffset, bytes.byteLength / 4);
};

const [fileA, fileB] = process.argv.slice(2);
const A = JSON.parse(readFileSync(fileA, 'utf8'));
const B = JSON.parse(readFileSync(fileB, 'utf8'));
const grid = A.grid;
for (const key of ['nx', 'nz', 'spacing', 'xMin', 'zMin']) {
  if (A.grid[key] !== B.grid[key]) throw new Error(`the two legs' grids differ in ${key}`);
}
const sa = unpack(A.surface);
const sb = unpack(B.surface);
const aa = A.aeration ? unpack(A.aeration) : undefined;
const ab = B.aeration ? unpack(B.aeration) : undefined;
if (sa.length !== sb.length) throw new Error('the two legs\' fields are different sizes');

const at = (i, j) => (j * grid.nx + i) * 2;
const worldX = (i) => grid.xMin + i * grid.spacing;
const worldZ = (j) => grid.zMin + j * grid.spacing;

/** The drawn surface's height at (x, z), bilinear over leg A's own field (0 off the grid). */
const heightAt = (x, z) => {
  const gx = (x - grid.xMin) / grid.spacing;
  const gz = (z - grid.zMin) / grid.spacing;
  if (gx < 0 || gz < 0 || gx >= grid.nx - 1 || gz >= grid.nz - 1) return -Infinity;
  const i = Math.floor(gx);
  const j = Math.floor(gz);
  const tx = gx - i;
  const tz = gz - j;
  const h = (ii, jj) => sa[at(ii, jj)];
  return (h(i, j) * (1 - tx) + h(i + 1, j) * tx) * (1 - tz) + (h(i, j + 1) * (1 - tx) + h(i + 1, j + 1) * tx) * tz;
};

/**
 * The swept barrel's seam mask at (x, z), 0–255, from leg A's own rasterisation. Where it beats the pixel's dither the
 * water's fragment is DISCARDED (`WATER_BARREL_DISCARD`), so the node's foam never reaches a pixel: at 255 never, in
 * the band with probability 1 − mask/255.
 */
const maskAt = (() => {
  const mask = A.mask && A.mask.data ? Buffer.from(A.mask.data, 'base64') : undefined;
  const mg = A.mask ? A.mask.grid : undefined;
  if (!mask || !mg) return () => null;
  return (x, z) => {
    const gx = (x - mg.xMin) / mg.spacing;
    const gz = (z - mg.zMin) / mg.spacing;
    const i = Math.round(gx);
    const j = Math.round(gz);
    if (i < 0 || j < 0 || i >= mg.nx || j >= mg.nz) return 0;
    return mask[j * mg.nx + i];
  };
})();

const THRESHOLD = 0.02;
const changed = [];
let heightChanged = 0;
for (let j = 0; j < grid.nz; j += 1) {
  for (let i = 0; i < grid.nx; i += 1) {
    const o = at(i, j);
    if (Math.abs(sa[o] - sb[o]) > 1e-6) heightChanged += 1;
    const d = sa[o + 1] - sb[o + 1];
    if (Math.abs(d) <= THRESHOLD) continue;
    changed.push({
      i, j, x: worldX(i), z: worldZ(j), y: sa[o],
      foamA: sa[o + 1], foamB: sb[o + 1], d,
      airA: aa ? aa[o] : null, plumeA: aa ? aa[o + 1] : null, airB: ab ? ab[o] : null, plumeB: ab ? ab[o + 1] : null,
      mask: maskAt(worldX(i), worldZ(j)),
    });
  }
}

/** A camera from a shot's eye and target: three's lookAt, up +y, vertical fov. */
function viewOf(shot, camera) {
  const [ex, ey, ez] = shot.eye;
  const [tx, ty, tz] = shot.target;
  let zx = ex - tx, zy = ey - ty, zz = ez - tz;
  const zl = Math.hypot(zx, zy, zz) || 1;
  zx /= zl; zy /= zl; zz /= zl;
  // x = normalize(up × z), with three's fallback when z is parallel to up.
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
    };
  };
}

/** Is the straight line from the eye to the node under the drawn surface anywhere along the way? */
function occluded(eye, node) {
  const [ex, ey, ez] = eye;
  const dx = node.x - ex;
  const dz = node.z - ez;
  const dyy = node.y - ey;
  const span = Math.hypot(dx, dz);
  if (!(span > 0)) return false;
  const steps = Math.max(4, Math.ceil(span / 0.5));
  // Stop short of the node itself (the last half metre is its own cell).
  for (let k = 1; k < steps; k += 1) {
    const t = k / steps;
    if (t > 1 - 0.5 / span) break;
    const x = ex + dx * t;
    const z = ez + dz * t;
    const y = ey + dyy * t;
    const h = heightAt(x, z);
    if (h === -Infinity) continue;
    if (y < h - 0.05) return true;
  }
  return false;
}

const least = (values) => values.reduce((m, v) => (v < m ? v : m), Infinity);
const most = (values) => values.reduce((m, v) => (v > m ? v : m), -Infinity);

const report = {
  legs: { a: { file: fileA, seconds: A.seconds, compute: A.compute }, b: { file: fileB, seconds: B.seconds, compute: B.compute } },
  grid, camera: A.camera,
  field: {
    nodes: grid.nx * grid.nz,
    foamChangedOver: THRESHOLD,
    changedNodes: changed.length,
    heightChangedNodes: heightChanged,
    meanChange: changed.length ? +(changed.reduce((s, n) => s + n.d, 0) / changed.length).toFixed(4) : 0,
    maxChange: changed.length ? +most(changed.map((n) => n.d)).toFixed(4) : 0,
    foamAmean: changed.length ? +(changed.reduce((s, n) => s + n.foamA, 0) / changed.length).toFixed(4) : 0,
    foamBmean: changed.length ? +(changed.reduce((s, n) => s + n.foamB, 0) / changed.length).toFixed(4) : 0,
    mask: A.mask ? {
      active: A.mask.active, set: A.mask.set, full: A.mask.full, nodes: A.mask.nodes, grid: A.mask.grid,
      changedUnderFullMask: changed.filter((n) => n.mask !== null && n.mask >= 250).length,
      changedUnderAnyMask: changed.filter((n) => n.mask !== null && n.mask > 0).length,
      changedClearOfMask: changed.filter((n) => n.mask === 0).length,
      meanMaskOnChanged: changed.length ? +(changed.reduce((s, n) => s + (n.mask ?? 0), 0) / changed.length).toFixed(1) : 0,
    } : null,
    bounds: changed.length ? {
      x: [least(changed.map((n) => n.x)), most(changed.map((n) => n.x))],
      z: [least(changed.map((n) => n.z)), most(changed.map((n) => n.z))],
      y: [+least(changed.map((n) => n.y)).toFixed(3), +most(changed.map((n) => n.y)).toFixed(3)],
    } : null,
  },
  shots: {},
};

for (const shot of A.shots) {
  const project = viewOf(shot, A.camera);
  let inFront = 0, inside = 0, visible = 0;
  let strongInside = 0, strongVisible = 0, drawable = 0, clearOfMask = 0;
  const seen = [];
  for (const n of changed) {
    const p = project(n.x, n.y, n.z);
    if (!p.inFront) continue;
    inFront += 1;
    if (!p.inside) continue;
    inside += 1;
    if (n.d >= 0.3) strongInside += 1;
    if (occluded(shot.eye, n)) continue;
    visible += 1;
    if (n.d >= 0.3) strongVisible += 1;
    if ((n.mask ?? 0) < 250) drawable += 1;
    if ((n.mask ?? 0) === 0) clearOfMask += 1;
    seen.push({ x: +n.x.toFixed(1), z: +n.z.toFixed(1), y: +n.y.toFixed(2), d: +n.d.toFixed(3), mask: n.mask, px: p.px, py: p.py, depth: +p.depth.toFixed(1) });
  }
  seen.sort((a, b) => b.d - a.d);
  report.shots[shot.name] = {
    eye: shot.eye, target: shot.target,
    changedInFront: inFront, changedInsideFrustum: inside, changedVisible: visible,
    strongInsideFrustum: strongInside, strongVisible,
    visibleAndDrawable: drawable, visibleAndClearOfMask: clearOfMask,
    nearest: seen.length ? least(seen.map((s) => s.depth)) : null,
    sample: seen.slice(0, 12),
  };
}

console.log(JSON.stringify(report, null, 2));
