/**
 * One pop-up on a real wave, replayed and taken apart (popup-moving-face, 2026-10-29; no SurfZoneRunner rider sessions):
 * a saved sea (`catch-probe.ts --save-at t --save <sea>`), one headless rider placed prone at rest at the start as the
 * catch probe places it, sprinting once the crest is `--lead` s away and popping up at the game's cue. From the pop on, a
 * line per frame: the phase, how the substeps' contact went (none / flight / slip / tip / impact, and the hold's least
 * normal impulse over the body's weight), the posture error, the board's heave (vertical speed and acceleration), its
 * pitch against the surface under it, and the wave frame. Ends with the outcome.
 *   rolldown docs/research/popup-moving-face-2026-10-29/popup-replay.ts -o dist/scripts/popup-replay.mjs --format esm --platform node \
 *     && node dist/scripts/popup-replay.mjs --state <sea> [--size big] [--spot canyon] [--lead 2] [--seconds 14] [--popup old] [--quiet]
 */
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { AttachedRider } from '../../../src/physics/AttachedRider';
import { BoardBody } from '../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { RideSession } from '../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../src/physics/takeOffCue';
import { WaveFrameGauge } from '../../../src/physics/waveFrame';
import { SurfZoneSimulation, rideLineupOffset, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const spot = (option('spot') ?? 'canyon') as 'canyon';
const size = (option('size') ?? 'big') as SwellSize;
const lead = Number(option('lead') ?? 2);
const seconds = Number(option('seconds') ?? 14);
const quiet = process.argv.includes('--quiet');
const popup = option('popup') as 'old' | undefined;
const STEP = 1 / 60;
const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const config: SurfZoneConfig = { ...surfZoneConfigFor(settings, Number(option('seed') ?? 1), true), compute: 'cpu' };
const sim = new SurfZoneSimulation(config, 'warm');
sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
const physical = PhysicalSurfWater.forSimulation(sim);
// `--advance` (experiment): the sampled surface moves within the frame at its rise rate (continuity, ∂η/∂t = −∇·q, the
// sample's flowY at the surface), from the frame's end state back to each substep's time, instead of holding still.
const advance = process.argv.includes('--advance');
const clock = { tau: STEP };
const riseSample = createWaterSample();
const riseAt = (x: number, z: number, surfaceY: number) => physical.sampleAt(x, surfaceY, z, riseSample).flowY;
const water: SurfWater = {
  sampleAt: (x, y, z, o) => {
    const s = physical.sampleAt(x, y, z, o);
    if (advance && !s.outsideDomain) s.surfaceY += riseAt(x, z, s.surfaceY) * (clock.tau - STEP);
    return s;
  },
  surfaceAt: (x, z) => { const y = physical.surfaceAt(x, z); return advance ? y + riseAt(x, z, y) * (clock.tau - STEP) : y; },
  addReaction: () => {},
};
const boardProto = BoardBody.prototype as unknown as { substep(h: number, w: SurfWater): void };
const substepOf = boardProto.substep;
boardProto.substep = function (h, w) { substepOf.call(this, h, w); clock.tau += h; };
const focus = sim.breakPoint();
const out = option('start') !== undefined ? Number(option('start')) : rideLineupOffset(config);
// `--riders n`: n riders, spread `--spread` m along shore about the start (each its own trial of the same wave).
const count = Number(option('riders') ?? 1);
const spread = Number(option('spread') ?? 4);
type Limit = 'none' | 'flight' | 'slip' | 'tip' | 'impact';
interface Trial {
  session: RideSession; gauge: WaveFrameGauge; dx: number; sprinting: boolean; seenBehind: boolean; popped: number; stood: number;
  riding: number; lastVy: number; log: string[]; done: boolean; popAhead?: number; popFrac?: number; popSlope?: number; popSpeed?: number; popCrest?: number;
}
const trials: Trial[] = Array.from({ length: count }, (_, k) => {
  const dx = count === 1 ? 0 : -spread + (2 * spread * k) / (count - 1);
  const session = new RideSession(popup ? ({ popup } as never) : {});
  session.place({ x: focus.x + dx, z: focus.z - out, heading: 0, speed: 0, phase: 'prone' }, water);
  return { session, gauge: new WaveFrameGauge({ directionX: 0, directionZ: 1 }), dx, sprinting: false, seenBehind: false, popped: NaN, stood: NaN, riding: 0, lastVy: 0, log: [], done: false };
});

// The contact, substep by substep: wrap the private projection the hold and the stance go through.
const tally = { none: 0, flight: 0, slip: 0, tip: 0, impact: 0, leastNormal: Infinity, normal: 0, wanted: 0 };
// `--subs`: each substep's asked normal and across/along impulses over its weight, and its length (1 = a quarter frame).
const subs: string[] = [];
const showSubs = process.argv.includes('--subs');
const proto = AttachedRider.prototype as unknown as { project(j: unknown, h: number, b: unknown, o: unknown): unknown };
const project = proto.project;
proto.project = function (this: { limit: Limit; mass: number }, impulse, h, board, outVector) {
  const result = project.call(this, impulse, h, board, outVector);
  tally[this.limit] += 1;
  const local = (this as unknown as { scratch: { y: number } }).scratch;
  tally.leastNormal = Math.min(tally.leastNormal, local.y / (this.mass * 9.81 * h));
  if (showSubs) {
    const w = this.mass * 9.81 * h;
    const self = this as unknown as { external: { y: number }; drive: { x: number; y: number; z: number }; velocity: { y: number }; boardVelocity: { y: number } };
    subs.push(`${this.limit[0]}${(h * 240).toFixed(2)}:${(local.y / w).toFixed(2)}/${(local.x / w).toFixed(2)}/${(local.z / w).toFixed(2)} ext ${(self.external.y / (this.mass * 9.81)).toFixed(2)} dr ${self.drive.y.toFixed(2)} bv ${self.boardVelocity.y.toFixed(2)}`);
  }
  // The frame's normal impulse the hold asked for and the one it gave (out, in the world, along the board's up).
  tally.wanted += local.y / (this.mass * 9.81 * STEP);
  const given = outVector as { x: number; y: number; z: number };
  const q = (board as { orientation: { x: number; y: number; z: number; w: number } }).orientation;
  const upY = 1 - 2 * (q.x * q.x + q.z * q.z);
  const upX = 2 * (q.x * q.y - q.w * q.z);
  const upZ = 2 * (q.y * q.z + q.w * q.x);
  tally.normal += (given.x * upX + given.y * upY + given.z * upZ) / (this.mass * 9.81 * STEP);
  return result;
};

const sample = createWaterSample();
const t0 = sim.solver.time;
for (let n = 0; n < Math.round(seconds / STEP) && trials.some((trial) => !trial.done); n += 1) {
  sim.step(STEP);
  const t = sim.solver.time - t0;
  for (const trial of trials) {
    if (trial.done) continue;
    const { session } = trial;
    const board = session.board;
    const frame = trial.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
    if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) trial.seenBehind = true;
    const closing = frame.crestSpeed - frame.speedShoreward;
    const toCrest = trial.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Infinity;
    const prone = session.phase === 'prone';
    const cue = prone && (session.rider.popUpCue || inTakeOffWindow(frame));
    let pop = false;
    if (prone && Number.isNaN(trial.popped) && trial.seenBehind) {
      if (!trial.sprinting && toCrest <= lead) trial.sprinting = true;
      if (cue) pop = true;
    }
    water.sampleAt(board.centerOfMass.x, board.centerOfMass.y, board.centerOfMass.z, sample);
    const slope = (Math.atan(-sample.slopeZ) * 180) / Math.PI;
    if (pop) {
      trial.popped = t;
      trial.popAhead = frame.aheadOfCrest; trial.popFrac = frame.faceFraction; trial.popSlope = slope; trial.popSpeed = frame.speedShoreward; trial.popCrest = frame.crestSpeed;
    }
    for (const k of Object.keys(tally) as (keyof typeof tally)[]) tally[k] = k === 'leastNormal' ? Infinity : 0;
    subs.length = 0;
    clock.tau = 0;
    session.step(STEP, water, { paddle: prone && !pop && Number.isNaN(trial.popped), sprint: prone && trial.sprinting && !pop, popUp: pop, steer: 0 });
    if (session.phase === 'standing' && Number.isNaN(trial.stood)) trial.stood = t;
    if (session.phase === 'standing' && frame.valid && frame.aheadOfCrest >= 0 && frame.speedShoreward >= 0.6 * frame.crestSpeed) trial.riding += STEP;
    const vy = board.velocity.y;
    const ay = (vy - trial.lastVy) / STEP;
    trial.lastVy = vy;
    if (!Number.isNaN(trial.popped) && t <= trial.popped + 2) {
      const q = board.orientation;
      const pitch = (Math.atan2(2 * (q.y * q.z - q.w * q.x), Math.hypot(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y))) * 180) / Math.PI;
      const r = session.rider;
      trial.log.push(`t ${(t - trial.popped).toFixed(3)} ${session.phase.padEnd(8)} ${['none', 'flight', 'slip', 'tip', 'impact'].map((k) => `${k[0]}${tally[k as Limit]}`).join(' ')} least ${tally.leastNormal.toFixed(2)} asked ${tally.wanted.toFixed(2)} gave ${tally.normal.toFixed(2)} `
        + `err ${r.postureError.toFixed(3)} | v ${Math.hypot(board.velocity.x, board.velocity.z).toFixed(2)} vy ${vy.toFixed(2)} ay ${ay.toFixed(0)} pitch ${pitch.toFixed(1)} slope ${slope.toFixed(1)} `
        + `lift ${(board.forces.pressure.y / ((board.mass + r.mass) * 9.81)).toFixed(2)} | ahead ${frame.aheadOfCrest.toFixed(2)} frac ${frame.faceFraction.toFixed(2)}`
        + (showSubs ? `\n      ${subs.join('\n      ')}` : ''));
    }
    if (session.phase === 'fallen' || trial.riding >= 3 || (!Number.isNaN(trial.popped) && t > trial.popped + 6)) trial.done = true;
  }
}
const outcome = (trial: Trial) => (trial.session.phase === 'fallen' ? (Number.isNaN(trial.stood) ? `fell popping up (${trial.session.separation})` : `fell standing (${trial.session.separation})`)
  : trial.riding >= 3 ? 'rode' : Number.isNaN(trial.popped) ? 'no pop' : 'left behind');
for (const trial of trials) {
  console.log(`dx ${trial.dx.toFixed(1).padStart(5)}: ${outcome(trial).padEnd(28)} pop ${Number.isNaN(trial.popped) ? '-' : trial.popped.toFixed(2)} ahead ${trial.popAhead?.toFixed(2) ?? '-'} frac ${trial.popFrac?.toFixed(2) ?? '-'} `
    + `slope ${trial.popSlope?.toFixed(1) ?? '-'} speed ${trial.popSpeed?.toFixed(2) ?? '-'}/${trial.popCrest?.toFixed(2) ?? '-'}`);
}
const failed = trials.find((trial) => trial.session.phase === 'fallen' && Number.isNaN(trial.stood));
if (failed && !quiet) console.log(`first fall popping up (dx ${failed.dx.toFixed(1)}):\n  ${failed.log.join('\n  ')}`);
const tallyOut = { rode: 0, popfall: 0, other: 0 };
for (const trial of trials) { const o = outcome(trial); if (o === 'rode') tallyOut.rode += 1; else if (o.startsWith('fell popping')) tallyOut.popfall += 1; else tallyOut.other += 1; }
console.log(`${spot} ${size}: ${count} riders: rode ${tallyOut.rode}, fell popping up ${tallyOut.popfall}, other ${tallyOut.other}`);
