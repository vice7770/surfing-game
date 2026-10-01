import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import type { SpotName } from '../Bathymetry';
import { BoussinesqSolver, madsenSorensenWaveNumber } from '../BoussinesqSolver';
import { uniformEdges, type RelaxationZone, type WaterTarget } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';
import { BREAKING_ONSET } from '../SurfZoneSimulation';

/**
 * Where the game's solver first breaks swell on a spot's barrel transect (Padang Padang Part B, PR 7): the
 * periodicOnset probe's method on any spot's Navier–Stokes transect, flat at the foot's depth h0, one slope along the
 * wave's path up to a flat `flat` h0 deep (tools/basilisk/run_periodic.sh's bed). One column wide, a regular wave
 * driven in h0, then 150 m of flat, the slope, 150 m of the shallow flat and an absorbing end. For each wave, its crest
 * as it passes the foot, its highest over the band of still depth nearer the break (6/7 to 5/7 of h0, Padang's 6–5 m
 * at 7 m), and the still depth under its crest where Kennedy's fresh test first fires on its face (η_t ≥ 0.65 √(g d),
 * the join's condition). Medians over the waves once the run has settled: the spot's join depth, d_join(η_band, T).
 * On a plane beach a broken wave can trip the test again as it runs up (several onsets a wave), so each wave's
 * deepest onset over its period (its first) is reported too; where a wave onsets once, the two agree.
 * Opt-in (PROBE=1): SPOT names the spot's Kennedy onset; H0, SLOPE and FLAT the transect (m, rise over run, h0);
 * HEIGHTS and PERIODS the drive; LOG the file.
 */
describe.runIf(process.env.PROBE)('periodic onset on a spot’s barrel transect', () => {
  it('logs the onset depth per height and period', () => {
    const spot = (process.env.SPOT ?? 'padang') as SpotName;
    const transect = { h0: Number(process.env.H0 ?? 7), slope: Number(process.env.SLOPE ?? 1 / 19), flat: Number(process.env.FLAT ?? 1.25 / 7) };
    const log = process.env.LOG ?? `spot-onset-${spot}.txt`;
    writeFileSync(log, `${spot}: h0 ${transect.h0} m, slope 1:${(1 / transect.slope).toFixed(1)}, flat ${(transect.flat * transect.h0).toFixed(2)} m, Kennedy onset ${BREAKING_ONSET[spot]}\n`);
    appendFileSync(log, 'T s | H driven | η at the foot (median, waves) | η over the band (its highest; median) | fresh onset: still depth under the crest (median, 10–90 %) | each wave\'s first onset (median, 10–90 %, waves) | wall s\n');
    const heights = (process.env.HEIGHTS ?? '1,1.5,2,2.5,3').split(',').map(Number);
    const periods = (process.env.PERIODS ?? '9,11,12,14').split(',').map(Number);
    for (const period of periods) for (const height of heights) appendFileSync(log, `${run(spot, transect, height, period)}\n`);
  }, 14_400_000);
});

function run(spot: SpotName, transect: { h0: number; slope: number; flat: number }, height: number, period: number): string {
  const started = performance.now();
  const { h0, slope } = transect;
  const flat = transect.flat * h0;
  const DRIVE = 130;
  const TOE = DRIVE + 150;
  const TOP = TOE + (h0 - flat) / slope;
  const END = TOP + 150;
  const LENGTH = END + 60;
  const depthAt = (z: number) => (z < TOE ? h0 : z < TOP ? h0 - slope * (z - TOE) : flat);
  const dz = 1;
  const solver = new BoussinesqSolver(
    { nx: 4, xMin: 0, dx: dz, zEdges: uniformEdges(0, LENGTH, LENGTH / dz), xBoundary: 'periodic' },
    (_x, z) => depthAt(z), { breaking: { onset: BREAKING_ONSET[spot] } },
  );
  const omega = (2 * Math.PI) / period;
  const k = madsenSorensenWaveNumber(omega, h0);
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
  // The band nearer the break, still seaward of every onset: Padang Padang's 6–5 m at 7 m, scaled to h0.
  const band = [(6 / 7) * h0, (5 / 7) * h0];
  const bandRows: number[] = [];
  for (let row = 0; row < solver.nz; row += 1) {
    const d = depthAt(solver.zCenters[row]);
    if (solver.zCenters[row] >= TOE && d <= band[0] && d >= band[1]) bandRows.push(row);
  }
  const feet: number[] = [];
  const references: number[] = [];
  const onsets: number[] = [];
  // Each wave's deepest onset: the period windows the foot crest uses.
  const firsts: number[] = [];
  let first = -Infinity;
  let footCrest = -Infinity;
  let referenceCrest = -Infinity;
  let footPeriod = Math.floor(solver.time / period);
  let lastOnsetZ = Infinity;
  const settled = 4 * period;
  const tEnd = 16 * period;
  while (solver.time < tEnd) {
    solver.step(Math.min(solver.maxStableStep(), 1 / 30));
    const n = Math.floor(solver.time / period);
    if (n !== footPeriod) {
      if (solver.time > settled + period) {
        feet.push(footCrest);
        references.push(referenceCrest);
        if (Number.isFinite(first)) firsts.push(first);
      }
      footCrest = -Infinity;
      referenceCrest = -Infinity;
      first = -Infinity;
      footPeriod = n;
    }
    footCrest = Math.max(footCrest, eta(toeRow));
    for (const row of bandRows) referenceCrest = Math.max(referenceCrest, eta(row));
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
      let crest = face;
      for (let row = face; row >= 0 && z - solver.zCenters[row] <= 10; row -= 1) if (eta(row) > eta(crest)) crest = row;
      onsets.push(-solver.bed[crest * nx + column]);
      first = Math.max(first, -solver.bed[crest * nx + column]);
    }
    lastOnsetZ = z;
  }
  const q = (values: number[], p: number) => {
    const sorted = [...values].sort((a, b) => a - b);
    return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(p * sorted.length))] : NaN;
  };
  const wall = (performance.now() - started) / 1000;
  return `${period} | ${height} | ${q(feet, 0.5).toFixed(2)} m (${feet.length}) | ${q(references, 0.5).toFixed(2)} m | ${q(onsets, 0.5).toFixed(2)} m (${q(onsets, 0.1).toFixed(2)}–${q(onsets, 0.9).toFixed(2)}, ${onsets.length} waves) | ${q(firsts, 0.5).toFixed(2)} m (${q(firsts, 0.1).toFixed(2)}–${q(firsts, 0.9).toFixed(2)}, ${firsts.length}) | ${wall.toFixed(0)}`;
}
