/**
 * Scratch check (big-start): TWO short scripted catches of one wave at Canyon Big from the new start, on the same sea
 * (the riders read the water but do not push it): one from rest, one already paddling (1.6 m/s), each paddling straight
 * in and popping up at the cue. Based on the catch diagnosis's catch-probe.ts. Reports where on the face the board is
 * picked up (first at 0.8 of the crest's speed within 6 m of it) and whether it drops in.
 * Run: rolldown docs/research/big-start-2026-10-22/catch-check.ts -o dist/scripts/catch-check.mjs --format esm --platform node
 *      && node dist/scripts/catch-check.mjs <seed> <crestTimeAtStart> <out m> [lead s]
 */
import { RideSession } from '../../../src/physics/RideSession';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater } from '../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../src/physics/takeOffCue';
import { WaveFrameGauge } from '../../../src/physics/waveFrame';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';

const [seedText, crestText, outText, leadText] = process.argv.slice(2);
const config = {
  spot: 'canyon', seed: Number(seedText), significantHeight: 2.4, peakPeriod: 14, directionDegrees: 0, spreading: 150,
  tide: 0, windSpeed: 0, stage: 2, compute: 'cpu',
} as unknown as SurfZoneConfig;
const crestAt = Number(crestText);
const out = Number(outText);
const lead = Number(leadText ?? 6);
const PEEL = 55;
const STEP = 1 / 60;
const t0wall = Date.now();
const sim = new SurfZoneSimulation(config);
const physical = PhysicalSurfWater.forSimulation(sim);
const water: SurfWater = {
  sampleAt: (x, y, z, o) => physical.sampleAt(x, y, z, o),
  surfaceAt: (x, z) => physical.surfaceAt(x, z),
  addReaction: () => {},
};
const focus = sim.breakPoint();
while (sim.solver.time < crestAt - lead) sim.step(STEP);
console.log(`canyon Big seed ${config.seed}: take-off (${focus.x}, ${focus.z.toFixed(1)}), start ${out} m out (${(-sim.bedAt(focus.x, focus.z - out)).toFixed(2)} m deep), `
  + `crest at the start ≈ ${crestAt} s; placed at ${sim.solver.time.toFixed(2)} s (${((Date.now() - t0wall) / 1000).toFixed(0)} s wall)`);

interface Variant {
  name: string; speed: number; session: RideSession; gauge: WaveFrameGauge; popped: number; done: boolean; log: string[];
  pickup?: { t: number; fraction: number; ahead: number; face: number; slope: number }; popFraction: number; maxSpeed: number; minFractionAfterPop: number; faceMax: number;
}
const variants: Variant[] = [
  { name: 'from rest', speed: 0 },
  { name: 'already paddling (1.6 m/s)', speed: 1.6 },
].map((v) => ({ ...v, session: new RideSession(), gauge: new WaveFrameGauge({ directionX: 0, directionZ: 1 }), popped: Number.NaN, done: false, log: [], popFraction: Number.NaN, maxSpeed: 0, minFractionAfterPop: Infinity, faceMax: 0 }));
for (const v of variants) v.session.place({ x: focus.x, z: focus.z - out, heading: 0, speed: v.speed, phase: 'prone' }, water);

const sample = createWaterSample();
const t0 = sim.solver.time;
for (let n = 0; n < Math.round((lead + 6) / STEP); n += 1) {
  sim.step(STEP);
  const t = sim.solver.time - t0;
  for (const v of variants) {
    if (v.done) continue;
    const s = v.session;
    const frame = v.gauge.update(water, s.board.centerOfMass, s.board.velocity, STEP, PEEL);
    const cue = s.rider.popUpCue || inTakeOffWindow(frame);
    const pop = Number.isNaN(v.popped) && s.phase === 'prone' && cue;
    if (pop) { v.popped = t; v.popFraction = frame.faceFraction; }
    s.step(STEP, water, { paddle: s.phase === 'prone' && !pop, popUp: pop, steer: 0 });
    if (!s.rider.attached) {
      v.log.push(`  t ${t.toFixed(2)} SEPARATED: ${s.separation}`);
      v.done = true;
      continue;
    }
    const b = s.board;
    const q = b.orientation;
    const [fx, fy, fz] = [2 * (q.x * q.z + q.w * q.y), 2 * (q.y * q.z - q.w * q.x), 1 - 2 * (q.x * q.x + q.y * q.y)];
    const pitch = (Math.atan2(fy, Math.hypot(fx, fz)) * 180) / Math.PI;
    water.sampleAt(b.centerOfMass.x, b.centerOfMass.y, b.centerOfMass.z, sample);
    const slope = (Math.atan(-sample.slopeZ) * 180) / Math.PI;
    const speed = Math.hypot(b.velocity.x, b.velocity.z);
    const near = frame.valid && frame.crestSpeed > 3 && frame.aheadOfCrest >= 0 && frame.aheadOfCrest < 6;
    if (!v.pickup && near && frame.speedShoreward >= 0.8 * frame.crestSpeed) {
      v.pickup = { t, fraction: frame.faceFraction, ahead: frame.aheadOfCrest, face: frame.faceHeight, slope };
    }
    if (!Number.isNaN(v.popped)) {
      v.maxSpeed = Math.max(v.maxSpeed, speed);
      if (frame.valid) v.minFractionAfterPop = Math.min(v.minFractionAfterPop, frame.faceFraction);
    }
    if (frame.valid) v.faceMax = Math.max(v.faceMax, frame.faceHeight);
    if (n % 6 === 0 && t > lead - 3) {
      v.log.push(`  t ${t.toFixed(2)} ${s.phase.padEnd(8)} dz ${(b.centerOfMass.z - focus.z).toFixed(1)} v ${speed.toFixed(2)} vz ${b.velocity.z.toFixed(2)} | crest c ${frame.crestSpeed.toFixed(1)} ahead ${frame.aheadOfCrest.toFixed(1)} `
        + `face ${frame.faceHeight.toFixed(2)} frac ${frame.faceFraction.toFixed(2)} brk ${frame.crestBreaking.toFixed(2)} | slope@board ${slope.toFixed(0)}° pitch ${pitch.toFixed(0)}° posErr ${s.rider.postureError.toFixed(2)}${cue ? ' CUE' : ''}`);
    }
  }
}
for (const v of variants) {
  const p = v.pickup;
  console.log(`== ${v.name}: picked up ${p ? `at ${p.t.toFixed(2)} s, ${(100 * p.fraction).toFixed(0)} % up a ${p.face.toFixed(2)} m face, ${p.ahead.toFixed(1)} m ahead of the crest, ${p.slope.toFixed(0)}° under the board` : 'never'}; `
    + `popped ${Number.isNaN(v.popped) ? 'never' : `at ${v.popped.toFixed(2)} s, ${(100 * v.popFraction).toFixed(0)} % up`}; after the pop: top speed ${v.maxSpeed.toFixed(1)} m/s, lowest ${(100 * v.minFractionAfterPop).toFixed(0)} % up; `
    + `end ${v.session.phase}${v.session.separation ? ` (${v.session.separation})` : ''}`);
  for (const line of v.log) console.log(line);
}
console.log(`wall ${((Date.now() - t0wall) / 1000).toFixed(0)} s`);
