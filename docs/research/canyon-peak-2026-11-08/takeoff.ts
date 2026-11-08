/** canyon-peak (2026-11-08): the advisor's third ruling's take-off probe (canyon-c-3's scratch), its imports made relative,
 * with `--zshift <m>` (the start moved shoreward, to follow the bank's contour down the line with `--x`) and each break's
 * own face (`at` the break, the steepest front face within 15 cells of the crest when it first breaks). Its crest-speed
 * column is broken (the frame probe's are right). Take-off probe: per crest passing the rider's start (x0, zStart), the unbroken face's max slope, H, crest speed,
 * and whether it breaks before / at / after the start. Wave metrics only. */
import { SWELLS } from '../../../src/game/SurfConditions';
import { POOL, POOL_EDGE_HEIGHT, regularSignificantHeight } from '../../../src/wave/pool';
import { SurfZoneSimulation, takeOffPoint, rideLineupOffset, canyonTakeOffDepth, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';
const opt = (n: string) => { const i = process.argv.indexOf(`--${n}`); return i >= 0 ? process.argv[i + 1] : undefined; };
const spot = (opt('spot') ?? 'canyon') as 'canyon' | 'pool';
const size = (opt('size') ?? 'medium') as keyof typeof SWELLS;
const seed = Number(opt('seed') ?? 1);
const periods = Number(opt('periods') ?? 10);
const bed = opt('bed');
const xOver = opt('x');
const sw = SWELLS[size];
applyCanyonShape(opt('canyon'));
const config = (spot === 'pool'
  ? { spot, seed, significantHeight: regularSignificantHeight(POOL_EDGE_HEIGHT[size]), peakPeriod: POOL.period, directionDegrees: 0, spreading: 1000, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu' }
  : { spot, seed, significantHeight: sw.significantHeight, peakPeriod: sw.peakPeriod, directionDegrees: 0, spreading: sw.spreading ?? 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu', ...(bed ? { canyonBed: bed } : {}) }) as unknown as SurfZoneConfig;
const sim = new SurfZoneSimulation(config);
const { solver } = sim;
const { nx, nz, xCenters, zCenters } = solver;
const tp = takeOffPoint(config);
const off = rideLineupOffset(config);
const x0 = xOver ? Number(xOver) : tp.x;
const col = Math.round((x0 - xCenters[0]) / solver.dx);
const rowOf = (z: number) => { let best = 0; for (let i = 0; i < nz; i++) if (Math.abs(zCenters[i] - z) < Math.abs(zCenters[best] - z)) best = i; return best; };
const zStart = tp.z - off + Number(opt('zshift') ?? 0); // seaward is -z
const r0 = rowOf(zStart);
const eta = (iz: number) => solver.h[iz * nx + col] + solver.bed[iz * nx + col] - solver.restLevel;
const depth = (iz: number) => solver.restLevel - solver.bed[iz * nx + col];
const str = (sim as unknown as { breaking: { strength: Float64Array } }).breaking.strength;
console.log(`${spot} ${bed ?? ''} ${size} seed ${seed}: take-off (${tp.x.toFixed(1)}, ${tp.z.toFixed(1)}) depth ${depth(rowOf(tp.z)).toFixed(2)} m; start ${off.toFixed(1)} m out at z ${zStart.toFixed(1)}, depth ${depth(r0).toFixed(2)} m; column x ${xCenters[col].toFixed(1)}; dz ${(zCenters[r0+1]-zCenters[r0]).toFixed(2)}`);
const STEP = 1 / 30; const steps = Math.round(periods * config.peakPeriod / STEP);
// Track each crest passing r0: at each step find the local max of eta within r0-25..r0+25 nearest r0 moving shoreward.
type Rec = { breakFace?: number; t: number; H: number; slope: number; slope8: number; c: number; brokeBefore: boolean; brokeAt: boolean; brokeWithin: number };
const recs: Rec[] = [];
let prevCrestZ = NaN; let prevT = 0;
let pending: { t: number; H: number; slope: number; slope8: number; c: number; brokeBefore: boolean } | null = null;
let pendingSince = 0;
const W = 30;
for (let n = 1; n <= steps; n++) {
  sim.step(STEP);
  const t = solver.time;
  // the crest: highest eta in rows r0-W..r0+W
  let best = -1, bestE = -Infinity;
  for (let iz = Math.max(1, r0 - W); iz <= Math.min(nz - 2, r0 + W); iz++) { const e = eta(iz); if (e > bestE && e >= eta(iz - 1) && e >= eta(iz + 1)) { bestE = e; best = iz; } }
  if (best < 0) continue;
  const cz = zCenters[best];
  // crossing r0 going shoreward
  if (prevCrestZ < zStart && cz >= zStart && cz - prevCrestZ < 3) {
    // H: crest minus min eta within 40 m either side; face slope shoreward (front, +z) max, and mean over 8 m below the crest
    let lo = Infinity; for (let iz = Math.max(0, best - 40); iz <= Math.min(nz - 1, best + 40); iz++) lo = Math.min(lo, eta(iz));
    let slope = 0; for (let iz = best; iz < Math.min(nz - 1, best + 15); iz++) slope = Math.max(slope, (eta(iz) - eta(iz + 1)) / (zCenters[iz + 1] - zCenters[iz]));
    // face mean slope from crest to where eta falls to trough + 0.2 H
    let k = best; const H = bestE - lo; while (k < nz - 1 && eta(k) > lo + 0.2 * H && k < best + 40) k++;
    const slope8 = (bestE - eta(k)) / Math.max(1, zCenters[k] - cz);
    let brokeBefore = false; for (let iz = best - 2; iz <= best + 2; iz++) if (str[iz * nx + col] > 0.3) brokeBefore = true;
    const c = (cz - prevCrestZ) / (t - prevT);
    if (pending) recs.push({ ...pending, brokeAt: false, brokeWithin: NaN });
    pending = { t, H, slope, slope8, c, brokeBefore }; pendingSince = t;
  }
  // after the crest crosses: does it break within 25 m shoreward?
  if (pending && !pending.brokeBefore) {
    let br = false; for (let iz = best - 2; iz <= best + 2; iz++) if (str[iz * nx + col] > 0.3) br = true;
    if (br && cz - zStart <= 25) {
      let breakFace = 0; for (let iz = best; iz < Math.min(nz - 1, best + 15); iz++) breakFace = Math.max(breakFace, (eta(iz) - eta(iz + 1)) / (zCenters[iz + 1] - zCenters[iz]));
      recs.push({ ...pending, brokeAt: true, brokeWithin: cz - zStart, breakFace }); pending = null;
    }
    else if (cz - zStart > 25 || t - pendingSince > 8) { recs.push({ ...pending, brokeAt: false, brokeWithin: NaN }); pending = null; }
  } else if (pending) { recs.push({ ...pending, brokeAt: false, brokeWithin: NaN }); pending = null; }
  prevCrestZ = cz; prevT = t;
}
const spin = 0;
const pct = (a: number[], p: number) => { const s = [...a].sort((x, y) => x - y); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : NaN; };
const big = recs.filter((r) => r.H > 0.3);
const deg = (s: number) => (Math.atan(s) * 180 / Math.PI);
for (const r of big) console.log(`t ${r.t.toFixed(1)} H ${r.H.toFixed(2)} c ${r.c.toFixed(1)} face max ${deg(r.slope).toFixed(1)}° mean ${deg(r.slope8).toFixed(1)}° ${r.brokeBefore ? 'BROKEN at start' : r.brokeAt ? `breaks ${r.brokeWithin.toFixed(0)} m in at ${deg(r.breakFace ?? 0).toFixed(1)}°` : 'unbroken past 25 m'}`);
const un = big.filter((r) => !r.brokeBefore);
console.log(`waves H>0.3: ${big.length}; broken at start ${big.filter(r=>r.brokeBefore).length}; break within 25 m ${big.filter(r=>r.brokeAt).length}; pass unbroken ${big.filter(r=>!r.brokeBefore&&!r.brokeAt).length}`);
console.log(`unbroken at start: H p50 ${pct(un.map(r=>r.H),0.5).toFixed(2)} p90 ${pct(un.map(r=>r.H),0.9).toFixed(2)}; face max p50 ${deg(pct(un.map(r=>r.slope),0.5)).toFixed(1)}° p90 ${deg(pct(un.map(r=>r.slope),0.9)).toFixed(1)}°; mean p50 ${deg(pct(un.map(r=>r.slope8),0.5)).toFixed(1)}°; c p50 ${pct(un.map(r=>r.c),0.5).toFixed(1)}`);
for (const th of [8, 10, 12, 15]) console.log(`  unbroken with max face ≥ ${th}° and H ≥ 0.8 m: ${un.filter(r=>deg(r.slope)>=th && r.H>=0.8).length} of ${big.length}`);
const near = big.filter((r) => r.brokeAt && r.brokeWithin >= 5 && r.brokeWithin <= 25);
console.log(`break 5–25 m inside: ${near.length} of ${big.length}; with the break's face ≥ 15°: ${near.filter((r) => deg(r.breakFace ?? 0) >= 15).length}; with the start's face ≥ 15°: ${near.filter((r) => deg(r.slope) >= 15).length}; break faces p50 ${deg(pct(near.map((r) => r.breakFace ?? 0), 0.5)).toFixed(1)}°`);
console.log(`all H p50 ${pct(big.map((r) => r.H), 0.5).toFixed(2)} p90 ${pct(big.map((r) => r.H), 0.9).toFixed(2)}`);
