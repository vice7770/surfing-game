/**
 * Scratch probe (big-start, no rider): the faces along the Canyon's take-off column, from 30 m seaward of the take-off
 * to 40 m inside it, and where each wave starts breaking there. Based on the catch diagnosis's face-probe.ts: the same
 * sea (stage 2 on the CPU, s = 150, square, mid tide, calm), the same surface the rider feels (`PhysicalSurfWater`),
 * the same front slope (over 1 m) and the same waves (zero up-crossings of η about its mean at each point).
 * Run: rolldown docs/research/big-start-2026-10-22/transect-probe.ts -o dist/scripts/transect-probe.mjs --format esm --platform node
 *      && node dist/scripts/transect-probe.mjs <hs> <tp> <periods> <seed> <out.json>
 */
import { writeFileSync } from 'node:fs';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const [hsText, tpText, periodsText, seedText, outPath] = process.argv.slice(2);
const hs = Number(hsText);
const tp = Number(tpText);
const periods = Number(periodsText);
const seed = Number(seedText);
const config = {
  spot: 'canyon', seed, significantHeight: hs, peakPeriod: tp, directionDegrees: 0, spreading: 150, tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
} as unknown as SurfZoneConfig;
const t0 = Date.now();
const sim = new SurfZoneSimulation(config);
const water = PhysicalSurfWater.forSimulation(sim);
const { solver } = sim;
const focus = sim.breakPoint();
const onsets: { t: number; x: number; z: number; face: number; depth: number }[] = [];
sim.onBreak = (wave) => {
  if (Math.abs(wave.x - focus.x) <= 4) onsets.push({ t: wave.time, x: wave.x, z: wave.z, face: wave.face, depth: -sim.bedAt(wave.x, wave.z) });
};
// η along the column every 0.5 m, from 33.5 m seaward of the take-off to 43.5 m inside it.
const FROM = -33.5;
const TO = 43.5;
const zs: number[] = [];
for (let dz = FROM; dz <= TO + 1e-9; dz += 0.5) zs.push(dz);
const depths = zs.map((dz) => -sim.bedAt(focus.x, focus.z + dz));
console.log(`canyon Hs ${hs} Tp ${tp} seed ${seed}: take-off (${focus.x}, ${focus.z.toFixed(1)}) ${(-sim.bedAt(focus.x, focus.z)).toFixed(2)} m deep; spin-up ${((Date.now() - t0) / 1000).toFixed(0)} s`);
const step = 1 / 30;
const steps = Math.round((periods * tp) / step);
const times: number[] = [];
const rows: number[][] = [];
for (let n = 0; n < steps; n += 1) {
  sim.step(step);
  if (n % 2 !== 0) continue;
  times.push(solver.time);
  rows.push(zs.map((dz) => Math.round(water.surfaceAt(focus.x, focus.z + dz) * 1e4) / 1e4));
  if (n % 900 === 0) console.log(`  t ${solver.time.toFixed(0)} s (${((Date.now() - t0) / 1000).toFixed(0)} s)`);
}
console.log(`ran ${periods} periods in ${((Date.now() - t0) / 1000).toFixed(0)} s; ${onsets.length} onsets in the column`);
writeFileSync(outPath, JSON.stringify({ hs, tp, seed, periods, focus, zs, depths, times, rows, onsets }));
