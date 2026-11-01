/**
 * pool-barrel (2026-11-01): a quick look at a pool floor's waves, wave by wave (no riders). For a machine height H at the
 * feed, after SETTLE s:
 * - each column's first onset per wave along both arms (the most seaward breaking cell, strength > 0.3, near the crest line),
 *   binned by |x|: its depth, the wave's height there, how many threw a lip jet, and the jets' Mead & Black X and Y, ξb and
 *   the void's size (`onThrow`);
 * - the tip's onsets (time, z, depth) wave by wave, and onsets deeper than DEEP m (a fault: the approach breaking);
 * - the wave's height over the platform at the take-off's knee, H/h there;
 * - the least water on the reef top, the fastest water, and the surf meter's reading.
 *   rolldown docs/research/pool-barrel-2026-11-01/scout.ts -o dist/scripts/pool-scout.mjs --format esm --platform node \
 *     && node dist/scripts/pool-scout.mjs --waves barrel --H 1.05 [--periods 12] [--settle 50] [--barrel key=value,...]
 */
import { POOL, POOL_BARREL, poolCrestZ, regularSignificantHeight, type PoolWaves } from '../../../src/wave/pool';
import { GRAVITY } from '../../../src/wave/dispersion';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const option = (name: string) => { const i = process.argv.indexOf(`--${name}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const waves = (option('waves') ?? 'barrel') as PoolWaves;
const height = Number(option('H') ?? 1.05);
const periods = Number(option('periods') ?? 12);
const settle = Number(option('settle') ?? 50);
const DEEP = Number(option('deep') ?? 2.6);
for (const pair of (option('barrel') ?? '').split(',').filter(Boolean)) {
  const [key, value] = pair.split('=');
  (POOL_BARREL as Record<string, number>)[key] = Number(value);
}
const config = {
  spot: 'pool', seed: 1, significantHeight: regularSignificantHeight(height), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(waves === 'barrel' ? { poolWaves: 'barrel' } : {}),
} as unknown as SurfZoneConfig;
const sim = new SurfZoneSimulation(config);
const { solver } = sim;
const { nx, nz, xCenters, zCenters } = solver;
const strength = sim.breaking.strength;
const L0 = (GRAVITY * POOL.period ** 2) / (2 * Math.PI);
const columnOf = (x: number) => Math.min(nx - 1, Math.max(0, Math.round((x - xCenters[0]) / solver.dx - 0.5 + (x >= 0 ? 0.5 : -0.5))));
const eta = (i: number) => solver.h[i] + solver.bed[i] - solver.restLevel;
const depthAt = (i: number) => solver.restLevel - solver.bed[i];

interface Throw { t: number; x: number; z?: number; depth?: number; X?: number; Y?: number; xi?: number; H: number; W: number; L: number; tilt: number }
const throws: Throw[] = [];
sim.onThrow = (e) => {
  if (solver.time < settle) return;
  throws.push({
    t: solver.time, x: e.x, z: e.z, depth: e.depth, X: e.orthogonalGradient ? 1 / e.orthogonalGradient : undefined, Y: e.vortexRatio, xi: e.iribarren,
    H: e.height, W: e.tube.width, L: e.tube.length, tilt: (e.tube.tilt * 180) / Math.PI,
  });
};

// Per column (|x| 0–75, both arms), its first onset per wave near the crest line.
const XS: number[] = [];
for (let x = -75; x <= 75; x += 1) XS.push(x);
const cols = XS.map((x) => Math.round((x - xCenters[0]) / solver.dx));
const last = XS.map(() => -Infinity);
const whiteZ = XS.map(() => Number.NaN);
interface Onset { t: number; x: number; z: number; depth: number; face: number }
const onsets: Onset[] = [];
const deep: Onset[] = [];
// The wave's height over the platform at the take-off's knee (x 27): its range there over the last periods.
const kneeZ = poolCrestZ(POOL.takeOffX) - ((POOL_BARREL.platformDepth - POOL_BARREL.armCrestDepth) / POOL_BARREL.gradient + POOL_BARREL.kneeRounding + 2) / 0.366;
const kneeCell = solver.rowBelow(kneeZ) * nx + Math.round((POOL.takeOffX - xCenters[0]) / solver.dx);
let kneeMax = -Infinity; let kneeMin = Infinity;
let leastTop = Infinity; let fastest = 0;
// The wave's height along each arm before it breaks: at the 3.0 m contour of the face (the deepest it should break) and
// on the platform 10 m seaward of the knee (square to the crest line), at x 0–55.
const PROFILE_X = [0, 5, 10, 15, 20, 27, 35, 45, 55];
const profileCells = PROFILE_X.map((x) => {
  const col = Math.round((x - xCenters[0]) / solver.dx);
  let z3 = poolCrestZ(x);
  while (z3 > poolCrestZ(x) - 120 && solver.restLevel - solver.bed[solver.rowBelow(z3) * nx + col] < 3.0) z3 -= 0.5;
  let zp = z3;
  while (zp > poolCrestZ(x) - 200 && solver.restLevel - solver.bed[solver.rowBelow(zp) * nx + col] < POOL_BARREL.platformDepth - 0.01) zp -= 0.5;
  zp -= 10;
  return { x, cells: [solver.rowBelow(z3) * nx + col, solver.rowBelow(zp) * nx + col], max: [-Infinity, -Infinity], min: [Infinity, Infinity] };
});
const step = 1 / 30;
const steps = Math.round((settle + periods * POOL.period) / step);
const t0 = Date.now();
for (let n = 1; n <= steps; n += 1) {
  sim.step(step);
  const time = solver.time;
  if (time < settle) continue;
  if (n % 3 === 0) {
    const e = eta(kneeCell); kneeMax = Math.max(kneeMax, e); kneeMin = Math.min(kneeMin, e);
    for (const p of profileCells) for (let k = 0; k < 2; k += 1) { const v = eta(p.cells[k]); p.max[k] = Math.max(p.max[k], v); p.min[k] = Math.min(p.min[k], v); }
    for (let a = 0; a < XS.length; a += 1) {
      const col = cols[a];
      let row = -1;
      for (let iz = 2; iz < nz - 2; iz += 1) {
        if (zCenters[iz] > -10) break;
        const i = iz * nx + col;
        if (strength[i] > 0.3 && depthAt(i) > 0.5 && solver.h[i] > 0.05) { row = iz; break; }
      }
      // A wave starting to break in this column: its most seaward white appearing, or jumping more than 10 m seaward.
      const z = row >= 0 ? zCenters[row] : Number.NaN;
      const before = whiteZ[a];
      whiteZ[a] = z;
      const fresh = row >= 0 && (!(before === before) || z < before - 10);
      if (fresh && depthAt(row * nx + col) > DEEP && Math.abs(XS[a]) <= POOL_BARREL.armLength) deep.push({ t: time, x: XS[a], z, depth: depthAt(row * nx + col), face: 0 });
      const near = row >= 0 && z >= poolCrestZ(XS[a]) - 70 && z <= poolCrestZ(XS[a]) + 8;
      if (fresh && near && time - last[a] > 4) {
        last[a] = time;
        let crest = -Infinity; let trough = Infinity;
        for (let iz = Math.max(0, row - 40); iz < Math.min(nz, row + 6); iz += 1) {
          const ee = eta(iz * nx + col);
          if (Math.abs(iz - row) <= 4) crest = Math.max(crest, ee);
          if (iz < row) trough = Math.min(trough, ee);
        }
        onsets.push({ t: time, x: XS[a], z: zCenters[row], depth: depthAt(row * nx + col), face: crest - trough });
      }
    }
    for (let i = 0; i < solver.h.length; i += 1) {
      const d = depthAt(i);
      // The reef's crest and top (still 0.6–1.2 m deep, seaward of the lagoon's beach face).
      if (d < 1.2 && d > 0.6 && zCenters[Math.floor(i / nx)] < -30) leastTop = Math.min(leastTop, solver.h[i]);
      if (solver.h[i] > 0.05) fastest = Math.max(fastest, Math.hypot(solver.qx[i], solver.qz[i]) / solver.h[i]);
    }
  }
}
const q = (values: number[], p: number) => { const v = values.filter(Number.isFinite).sort((a, b) => a - b); return v.length ? v[Math.min(v.length - 1, Math.floor(p * v.length))] : Number.NaN; };
const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '—');
console.log(`pool ${waves} H ${height} (${periods} periods after ${settle} s, ${((Date.now() - t0) / 1000).toFixed(0)} s wall); ${waves === 'barrel' ? JSON.stringify(POOL_BARREL) : ''}`);
const reading = sim.surf.reading(solver.time);
console.log(`surf meter ${JSON.stringify(reading)}; platform at the take-off's knee (z ${kneeZ.toFixed(0)}, ${f(depthAt(kneeCell))} m): H ${f(kneeMax - kneeMin)} m, H/h ${f((kneeMax - kneeMin) / depthAt(kneeCell))}; least water on the top ${f(leastTop)} m; fastest ${f(fastest)} m/s`);
console.log(`H along the arm before breaking, at the face's 3 m contour / on the platform 10 m seaward of the knee: ${profileCells.map((p) => `x ${p.x} ${f(p.max[0] - p.min[0])} / ${f(p.max[1] - p.min[1])}`).join(', ')}`);
const tips = onsets.filter((o) => o.x === 0);
console.log(`tip onsets: ${tips.map((o) => `t ${o.t.toFixed(1)} z ${o.z.toFixed(0)} d ${o.depth.toFixed(2)} f ${o.face.toFixed(2)}`).join(' | ')}`);
console.log(`onsets deeper than ${DEEP} m: ${deep.length}${deep.length ? ` (${deep.slice(0, 8).map((o) => `t ${o.t.toFixed(1)} x ${o.x} z ${o.z.toFixed(0)} d ${o.depth.toFixed(2)}`).join(', ')})` : ''}`);
for (let from = 0; from < 75; from += 5) {
  const band = (side: number) => onsets.filter((o) => side * o.x >= from && side * o.x < from + 5 && (from > 0 || o.x !== 0 || side > 0));
  const jets = (side: number) => throws.filter((j) => side * j.x >= from && side * j.x < from + 5);
  const line = [1, -1].map((side) => {
    const o = band(side); const j = jets(side);
    return `${side > 0 ? 'R' : 'L'} onsets ${o.length} d ${f(q(o.map((v) => v.depth), 0.5))} face ${f(q(o.map((v) => v.face), 0.5))}, jets ${j.length} X ${f(q(j.map((v) => v.X ?? Number.NaN), 0.5), 1)} Y ${f(q(j.map((v) => v.Y ?? Number.NaN), 0.5))} ξ ${f(q(j.map((v) => v.xi ?? Number.NaN), 0.5))} H ${f(q(j.map((v) => v.H), 0.5))} W ${f(q(j.map((v) => v.W), 0.5))} L ${f(q(j.map((v) => v.L), 0.5))} d ${f(q(j.map((v) => v.depth ?? Number.NaN), 0.5))}`;
  });
  console.log(`|x| ${String(from).padStart(2)}–${from + 5}: ${line.join(' ; ')}`);
}
// The onsets' face vs ξb from the bed along +z (rough), and the wave-by-wave arrival at |x| 27 and 45.
for (const x of [27, 45, -27, -45]) {
  const o = onsets.filter((v) => v.x === x);
  console.log(`x ${x}: ${o.map((v) => `t ${v.t.toFixed(1)} z ${v.z.toFixed(0)} d ${v.depth.toFixed(2)} f ${v.face.toFixed(2)}`).join(' | ')}`);
}
void L0;
