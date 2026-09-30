import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { BoussinesqSolver, madsenSorensenWaveNumber } from '../BoussinesqSolver';
import { uniformEdges, type RelaxationZone, type WaterTarget } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';
import { BREAKING_ONSET } from '../SurfZoneSimulation';

/**
 * Where the game's solver first breaks swell on Padang Padang's transect (the advisor, 2026-09-30): one column wide,
 * a regular wave driven in 7 m of water, then 150 m of 7 m flat, the 1:19 wedge up to the 1.25 m reef flat, and an
 * absorbing end. For each wave, the crest's height as it passes the wedge's foot, and the still depth under the crest
 * where Kennedy's fresh test first fires on its face (η_t ≥ 0.65 √(g d), the join's own condition). Medians over the
 * waves once the run has settled. The swept barrel's join depth, d_join(η_foot, T). Opt-in (PROBE=1); LOG.
 */
describe.runIf(process.env.PROBE)('periodic onset on the Padang Padang transect', () => {
  it('logs the onset depth per height and period', () => {
    const log = process.env.LOG ?? 'periodic-onset.txt';
    writeFileSync(log, 'T s | H at 7 m | η at the foot (median, waves) | η in 6–5 m (its highest) | fresh onset: still depth under the crest (median, 10–90 %)\n');
    const heights = (process.env.HEIGHTS ?? '1,1.5,2,2.5,3,3.5').split(',').map(Number);
    const periods = (process.env.PERIODS ?? '14,16,17,18').split(',').map(Number);
    for (const period of periods) for (const height of heights) appendFileSync(log, `${run(height, period)}\n`);
  }, 7_200_000);
});

const H0 = 7;
const FLAT = 1.25;
const SLOPE = 1 / 19;
const DRIVE = 130;
const TOE = DRIVE + 150;
const TOP = TOE + (H0 - FLAT) / SLOPE;
const END = TOP + 150;
const ABSORB = 60;
const LENGTH = END + ABSORB;
const depthAt = (z: number) => (z < TOE ? H0 : z < TOP ? H0 - SLOPE * (z - TOE) : FLAT);
/** The reference band nearer the break, still seaward of every onset (the advisor, 2026-09-30): still depth 6 to 5 m. */
const BAND = [6, 5] as const;
const bandRows = (solver: BoussinesqSolver) => {
  const rows: number[] = [];
  for (let row = 0; row < solver.nz; row += 1) {
    const d = depthAt(solver.zCenters[row]);
    if (solver.zCenters[row] >= TOE && d <= BAND[0] && d >= BAND[1]) rows.push(row);
  }
  return rows;
};

function run(height: number, period: number): string {
  const dz = 1;
  const solver = new BoussinesqSolver(
    { nx: 4, xMin: 0, dx: dz, zEdges: uniformEdges(0, LENGTH, LENGTH / dz), xBoundary: 'periodic' },
    (_x, z) => depthAt(z), { breaking: { onset: BREAKING_ONSET.padang } },
  );
  const omega = (2 * Math.PI) / period;
  const k = madsenSorensenWaveNumber(omega, H0);
  const c = omega / k;
  const drive: RelaxationZone = {
    weights: solver.zoneWeightsAlongZ(DRIVE, 0),
    target(_x: number, z: number, t: number, out: WaterTarget) {
      const ramp = Math.min(1, t / (2 * period));
      const eta = ramp * 0.5 * height * Math.cos(k * z - omega * t);
      out.eta = eta;
      out.qx = 0;
      out.qz = c * eta;
    },
  };
  const absorb: RelaxationZone = {
    weights: solver.zoneWeightsAlongZ(END, LENGTH),
    target(_x: number, _z: number, _t: number, out: WaterTarget) {
      out.eta = 0;
      out.qx = 0;
      out.qz = 0;
    },
  };
  solver.addRelaxationZone(drive);
  solver.addRelaxationZone(absorb);
  const column = 1;
  const nx = solver.nx;
  const toeRow = solver.rowBelow(TOE);
  const eta = (row: number) => solver.h[row * nx + column] + solver.bed[row * nx + column];
  const feet: number[] = [];
  const references: number[] = [];
  const referenceRows = bandRows(solver);
  let referenceCrest = -Infinity;
  const onsets: number[] = [];
  let footCrest = -Infinity;
  let footPeriod = Math.floor(solver.time / period);
  let lastOnsetZ = Infinity;
  const settled = 4 * period;
  const tEnd = 16 * period;
  while (solver.time < tEnd) {
    solver.step(Math.min(solver.maxStableStep(), 1 / 30));
    // The crest passing the foot: the largest η at the toe in each period.
    const n = Math.floor(solver.time / period);
    if (n !== footPeriod) {
      if (solver.time > settled + period) {
        feet.push(footCrest);
        references.push(referenceCrest);
      }
      footCrest = -Infinity;
      referenceCrest = -Infinity;
      footPeriod = n;
    }
    footCrest = Math.max(footCrest, eta(toeRow));
    for (const row of referenceRows) referenceCrest = Math.max(referenceCrest, eta(row));
    // The most seaward cell on the wedge rising at the fresh onset: a new wave's when it jumps seaward.
    let face = -1;
    for (let row = toeRow; row < solver.rowBelow(END); row += 1) {
      const i = row * nx + column;
      const d = Math.max(0.05, -solver.bed[i]);
      if (solver.h[i] > 0.05 && solver.surfaceRiseRate[i] >= 0.65 * Math.sqrt(GRAVITY * d)) {
        face = row;
        break;
      }
    }
    if (face < 0) continue;
    const z = solver.zCenters[face];
    if (z < lastOnsetZ - 20 && solver.time > settled) {
      // Its crest: the highest water within 10 m seaward of the face (the crest's segment reaches 10 m shoreward).
      let crest = face;
      for (let row = face; row >= 0 && z - solver.zCenters[row] <= 10; row -= 1) if (eta(row) > eta(crest)) crest = row;
      onsets.push(-solver.bed[crest * nx + column]);
    }
    lastOnsetZ = z;
  }
  const q = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : NaN;
  };
  return `${period} | ${height} | ${q(feet, 0.5).toFixed(2)} m (${feet.length}) | ${q(references, 0.5).toFixed(2)} m | ${q(onsets, 0.5).toFixed(2)} m (${q(onsets, 0.1).toFixed(2)}–${q(onsets, 0.9).toFixed(2)}, ${onsets.length} waves)`;
}
