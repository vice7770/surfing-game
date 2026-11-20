/**
 * The Canyon's take-off column for the catch model (canyon-wave-r2, 2026-10-22; wave only, no riders): records the
 * solver's surface η, depth-averaged velocity u = q_z / h and breaking strength along one column (the take-off's x unless
 * `--x`), cell by cell from 45 m seaward of the take-off to 35 m inside it, every 1/15 s, and the waves' onsets within
 * x ± 4 m. The same sea as big-start's transect probe: stage 2 on the CPU, square, s = 150, mid tide, calm. `catch-model.mjs`
 * reads it.
 *   rolldown docs/research/canyon-wave-r2-2026-10-22/catch-probe.ts -o dist/scripts/catch-probe.mjs --format esm --platform node \
 *     && node dist/scripts/catch-probe.mjs --size medium --seed 1 --periods 8 [--canyon key=value,...] [--bed old] [--x -9] --out <file.json>
 */
import { writeFileSync } from 'node:fs';
import { SWELLS } from '../../../src/game/SurfConditions';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { applyCanyonShape } from '../../../scripts/canyonShape';

const option = (name: string): string | undefined => {
  const index = process.argv.indexOf(`--${name}`);
  return index >= 0 ? process.argv[index + 1] : undefined;
};
const size = (option('size') ?? 'medium') as keyof typeof SWELLS;
const swell = SWELLS[size];
const hs = Number(option('hs') ?? swell.significantHeight);
const tp = Number(option('tp') ?? swell.peakPeriod);
const seed = Number(option('seed') ?? 1);
const periods = Number(option('periods') ?? 8);
applyCanyonShape(option('canyon'));
const config = {
  spot: 'canyon', seed, significantHeight: hs, peakPeriod: tp, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
  ...(option('bed') === 'old' ? { canyonBed: 'old' } : {}),
} as unknown as SurfZoneConfig;
const t0 = Date.now();
const sim = new SurfZoneSimulation(config);
const { solver } = sim;
const takeOff = sim.breakPoint();
const x = Number(option('x') ?? takeOff.x);
const i = Math.min(solver.nx - 1, Math.max(0, Math.round((x - solver.xCenters[0]) / solver.dx)));
const rows: number[] = [];
for (let j = 0; j < solver.nz; j += 1) {
  const dz = solver.zCenters[j] - takeOff.z;
  if (dz >= -45 && dz <= 35) rows.push(j);
}
const zs = rows.map((j) => solver.zCenters[j]);
const depths = rows.map((j) => solver.restLevel - solver.bed[j * solver.nx + i]);
const onsets: { t: number; x: number; z: number; face: number; depth: number }[] = [];
sim.onBreak = (wave) => {
  if (Math.abs(wave.x - x) <= 4) onsets.push({ t: wave.time, x: wave.x, z: wave.z, face: wave.face, depth: -sim.bedAt(wave.x, wave.z) });
};
console.log(`canyon ${size} Hs ${hs} Tp ${tp} seed ${seed}: take-off (${takeOff.x}, ${takeOff.z}); column x ${solver.xCenters[i]}, ${rows.length} rows; spin-up ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const step = 1 / 30;
const steps = Math.round((periods * tp) / step);
const times: number[] = [];
const eta: number[][] = [];
const flow: number[][] = [];
const breaking: number[][] = [];
const round = (v: number, k = 1e4) => Math.round(v * k) / k;
for (let n = 0; n < steps; n += 1) {
  sim.step(step);
  if (n % 2 !== 0) continue;
  times.push(round(solver.time, 1e3));
  eta.push(rows.map((j) => round(solver.h[j * solver.nx + i] + solver.bed[j * solver.nx + i] - solver.restLevel)));
  flow.push(rows.map((j) => {
    const h = solver.h[j * solver.nx + i];
    return h > 0.02 ? round(solver.qz[j * solver.nx + i] / h, 1e3) : 0;
  }));
  breaking.push(rows.map((j) => round(sim.breaking.strength[j * solver.nx + i], 1e3)));
}
console.log(`ran ${periods} periods in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${onsets.length} onsets in the column`);
writeFileSync(option('out') ?? `catch-${size}-${seed}.json`, JSON.stringify({ size, hs, tp, seed, periods, takeOff, x: solver.xCenters[i], zs, depths, times, eta, flow, breaking, onsets }));
