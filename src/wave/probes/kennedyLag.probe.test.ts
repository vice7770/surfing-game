import { appendFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { BoussinesqSolver } from '../BoussinesqSolver';
import { uniformEdges } from '../ShallowWaterSolver';
import { GRAVITY } from '../dispersion';
import { BREAKING_ONSET } from '../SurfZoneSimulation';

/**
 * The swept barrel's onset against Basilisk (the advisor, 2026-09-30): the game's solver on round 6's Padang Padang
 * transect, one column wide, with Basilisk's Green–Naghdi soliton (slope.c): h0 = 7 m, 1:19 from x = 17 h0 up to a
 * 1.25 m flat, A0 = 0.3 at x = 8 h0. Logs when and where Kennedy breaking starts at the crest, for comparison with
 * Basilisk's face going vertical (t ≈ 21.45 √(h0/g), level 11) and its touchdown (22.45). Opt-in (PROBE=1); DZ sets
 * the cells (1 m by default), A0 the wave, LOG the file.
 */
describe.runIf(process.env.PROBE)('Kennedy onset against Basilisk', () => {
  it('logs the onset', () => {
    const log = process.env.LOG ?? 'kennedy-lag.txt';
    const h0 = 7;
    const a0 = Number(process.env.A0 ?? 0.3);
    const slope = 0.0526316;
    const flat = 0.1785714;
    const toe = 17;
    const top = toe + (1 - flat) / slope;
    const dz = Number(process.env.DZ ?? 1);
    const length = 48 * h0;
    const unit = Math.sqrt(h0 / GRAVITY);
    const depth = (z: number) => {
      const x = z / h0;
      return h0 * (x < toe ? 1 : x < top ? 1 - slope * (x - toe) : flat);
    };
    const solver = new BoussinesqSolver(
      { nx: 4, xMin: 0, dx: dz, zEdges: uniformEdges(0, length, Math.round(length / dz)), xBoundary: 'periodic' },
      (_x, z) => depth(z), { breaking: { onset: BREAKING_ONSET.padang } },
    );
    // Basilisk's soliton (slope.c: waveGN, u = c η/(1 + η) in h0 and √(g h0)), so q = c η.
    const k = Math.sqrt(3 * a0) / (2 * Math.sqrt(1 + a0));
    const c = Math.sqrt(1 + a0) * Math.sqrt(GRAVITY * h0);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const x = solver.zCenters[iz] / h0 - 8;
      const eta = h0 * a0 / Math.cosh(k * x) ** 2;
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        solver.h[i] = depth(solver.zCenters[iz]) + eta;
        solver.qz[i] = c * eta;
        solver.qx[i] = 0;
      }
    }
    writeFileSync(log, `A0 ${a0}, dz ${dz} m, onset ${BREAKING_ONSET.padang} √(gh); the flat's edge at x = ${top.toFixed(3)} h0 (${(top * h0).toFixed(1)} m); time unit √(h0/g) = ${unit.toFixed(4)} s\n`);
    const column = 1;
    let started = false;
    let joined = false;
    let nextTrace = 17;
    const tEnd = Number(process.env.TMAX ?? 26) * unit;
    while (solver.time < tEnd) {
      solver.step(Math.min(solver.maxStableStep(), 0.02));
      let crest = 0;
      for (let iz = 1; iz < solver.nz; iz += 1) {
        const i = iz * solver.nx + column;
        if (solver.h[i] + solver.bed[i] > solver.h[crest * solver.nx + column] + solver.bed[crest * solver.nx + column]) crest = iz;
      }
      let strength = 0;
      let age = 0;
      let where = -1;
      for (let iz = crest; iz < solver.nz && solver.zCenters[iz] - solver.zCenters[crest] <= 10; iz += 1) {
        const i = iz * solver.nx + column;
        if (solver.breakingStrength[i] > strength) {
          strength = solver.breakingStrength[i];
          where = iz;
        }
        age = Math.max(age, solver.breakingAge[i]);
      }
      const crestCell = crest * solver.nx + column;
      const describe = (label: string) => {
        const t = solver.time;
        appendFileSync(log, `${label}: t ${(t / unit).toFixed(3)} √(h0/g) (${t.toFixed(2)} s), age ${age.toFixed(3)} s → began t ${((t - age) / unit).toFixed(3)} √(h0/g); ` +
          `crest at x ${(solver.zCenters[crest] / h0).toFixed(3)} h0 (${(solver.zCenters[crest] - top * h0).toFixed(1)} m from the flat's edge), ` +
          `η ${(solver.h[crestCell] + solver.bed[crestCell]).toFixed(2)} m over ${(-solver.bed[crestCell]).toFixed(2)} m; breaking at x ${where >= 0 ? (solver.zCenters[where] / h0).toFixed(3) : '-'} h0\n`);
      };
      const tau = solver.time / unit;
      if (tau >= nextTrace) {
        nextTrace += 0.5;
        describe(`trace (strength ${strength.toFixed(2)})`);
      }
      if (!started && strength > 0) {
        started = true;
        describe('Kennedy starts (strength > 0)');
      }
      if (!joined && strength > 0.3) {
        joined = true;
        describe('the front joins (strength > 0.3)');
      }
    }
    appendFileSync(log, started ? 'done\n' : 'no breaking\n');
  }, 3_600_000);
});
