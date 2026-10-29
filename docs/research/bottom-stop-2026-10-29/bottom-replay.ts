/**
 * The ride to the bottom of a Big face, replayed and taken apart (bottom-stop, 2026-10-29; headless `RideSession`
 * riders, no SurfZoneRunner rider sessions): a saved sea (`catch-probe.ts --save-at t --save <sea>`), riders placed prone
 * at rest at the start, `--spread` m apart along shore, sprinting once the crest is 2 s away and popping up at the game's
 * cue, then riding with the script `--ride straight|turn` (turn: Compress and the steer toward `--side left|right` from
 * `--turn-at` s after standing for `--turn-for` s, a bottom turn; as the catch probe's turnL and turnR). From the stand on, a line every `--every` frames: the board's speed and
 * its change, the forces on it along its travel (each over the pair's weight: pressure, buoyancy, added mass, radiation,
 * friction, fins, rails, froth, the rider's contact), its pitch against the surface under it, the nose's and tail's depth
 * under the surface, the wetted area, and the wave frame. Prints each rider's outcome, the speed's fall through the
 * bottom (the most lost in 0.1 s), and the first stopped rider's log.
 *   rolldown docs/research/bottom-stop-2026-10-29/bottom-replay.ts -o dist/scripts/bottom-replay.mjs --format esm --platform node \
 *     && node dist/scripts/bottom-replay.mjs --state <sea> [--size big] [--riders 4] [--spread 3] [--seconds 16] [--ride straight|turn]
 *        [--turn-at 0.6] [--turn-for 0.8] [--side left|right] [--every 2] [--after 6] [--froth old] [--quiet]
 */
import { readFileSync } from 'node:fs';
import { Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { RideSession } from '../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../src/physics/takeOffCue';
import { WaveFrameGauge } from '../../../src/physics/waveFrame';
import { createLensPoint } from '../../../src/wave/SpillingRoller';
import { SurfZoneSimulation, rideLineupOffset, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const STEP = 1 / 60;
const spot = (option('spot') ?? 'canyon') as 'canyon';
const size = (option('size') ?? 'big') as SwellSize;
const seconds = Number(option('seconds') ?? 16);
const every = Number(option('every') ?? 2);
const ride = option('ride') ?? 'straight';
const turnAt = Number(option('turn-at') ?? 0.6);
const turnFor = Number(option('turn-for') ?? 0.8);
const side = option('side') === 'right' ? -1 : 1;
// `--turn-compress c`: how far Compress is held through the turn (1: fully; 0: the steer alone).
const turnCompress = Number(option('turn-compress') ?? 1);
const quiet = process.argv.includes('--quiet');
const settings = physicalSettingsFor(spot, { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const config: SurfZoneConfig = {
  ...surfZoneConfigFor(settings, Number(option('seed') ?? 1), true), compute: 'cpu', ...(option('froth') === 'old' ? { froth: 'old' as const } : {}),
};
const sim = new SurfZoneSimulation(config, 'warm');
sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
const physical = PhysicalSurfWater.forSimulation(sim);
const water: SurfWater = {
  sampleAt: (x, y, z, o) => physical.sampleAt(x, y, z, o), surfaceAt: (x, z) => physical.surfaceAt(x, z), addReaction: () => {},
  setSampleTime: (offset) => physical.setSampleTime(offset),
};
const focus = sim.breakPoint();
const out = rideLineupOffset(config);
const count = Number(option('riders') ?? 4);
const spread = Number(option('spread') ?? 3);

interface Trial {
  session: RideSession; gauge: WaveFrameGauge; dx: number; seenBehind: boolean; sprinting: boolean; popped: boolean; stood: number; lastBoardWork?: Record<string, number>; lastRiderWork?: Record<string, number>;
  riding: number; done: boolean; log: string[]; speeds: number[]; topSpeed: number; worstDrop: number; worstAt: number;
}
const trials: Trial[] = Array.from({ length: count }, (_, k) => {
  const dx = count === 1 ? 0 : -spread + (2 * spread * k) / (count - 1);
  const session = new RideSession();
  session.place({ x: focus.x + dx, z: focus.z - out, heading: 0, speed: 0, phase: 'prone' }, water);
  return { session, gauge: new WaveFrameGauge({ directionX: 0, directionZ: 1 }), dx, seenBehind: false, sprinting: false, popped: false, stood: Number.NaN,
    riding: 0, done: false, log: [], speeds: [], topSpeed: 0, worstDrop: 0, worstAt: Number.NaN };
});

const sample = createWaterSample();
const lens = createLensPoint();
const local = new Vector3();
const point = new Vector3();
/** How far under the surface a board-frame point lies, m (negative above). */
const depthOf = (session: RideSession, z: number) => {
  const { board } = session;
  board.toWorld(local.set(0, 0, z), point);
  return water.surfaceAt(point.x, point.z) - point.y;
};
/** The board's patches in a lens's footprint at the latest substep: how many, their mean immersion and the lens's thickness there. */
const lensPatches = (session: RideSession) => {
  const b = session.board as unknown as { samples: { surfaceY: number; lensScale?: number; lensThickness?: number }[]; point: Float64Array; count: number };
  let n = 0; let immersion = 0; let thickness = 0;
  for (let k = 0; k < b.count; k += 1) {
    const s = b.samples[k];
    const d = s.surfaceY - b.point[k * 3 + 1];
    if (!(s.lensScale !== undefined && s.lensScale > 0) || !(d > 0)) continue;
    n += 1; immersion += d; thickness += s.lensThickness ?? Number.NaN;
  }
  return n ? ` | lens patches ${n}: immersed ${(immersion / n).toFixed(3)} lens ${(thickness / n).toFixed(3)}` : '';
};
/** The roller's lenses in the board's column: each slot's ξ there (0 its crest, 1 its toe, negative behind), scale g and crest thickness. */
const lensesHere = (x: number, z: number) => {
  const roller = sim.roller;
  if (!roller) return '';
  const column = Math.round((x - sim.solver.xCenters[0]) / sim.solver.dx);
  const parts: string[] = [];
  for (let slot = 0; slot < 4; slot += 1) {
    const l = roller.lens(column, slot);
    if (!l || !(l.g > 0)) continue;
    parts.push(`#${slot} ξ ${((z - l.crest) / l.length).toFixed(2)} g ${l.g.toFixed(2)} H ${l.height.toFixed(2)} L ${l.length.toFixed(1)}`);
  }
  return parts.length ? ` | slots ${parts.join(', ')}` : '';
};
const t0 = sim.solver.time;
for (let n = 0; n < Math.round(seconds / STEP) && trials.some((trial) => !trial.done); n += 1) {
  sim.step(STEP);
  const t = sim.solver.time - t0;
  for (const trial of trials) {
    if (trial.done) continue;
    const { session } = trial;
    const { board } = session;
    const frame = trial.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
    if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) trial.seenBehind = true;
    const closing = frame.crestSpeed - frame.speedShoreward;
    const toCrest = trial.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Infinity;
    const prone = session.phase === 'prone';
    if (prone && trial.seenBehind && !trial.sprinting && toCrest <= 2) trial.sprinting = true;
    const pop = prone && !trial.popped && trial.seenBehind && (session.rider.popUpCue || inTakeOffWindow(frame));
    trial.popped ||= pop;
    const standing = session.phase === 'standing';
    const since = standing ? t - trial.stood : 0;
    const turning = ride === 'turn' && standing && since >= turnAt && since < turnAt + turnFor;
    session.step(STEP, water, {
      paddle: prone && !trial.popped, sprint: prone && trial.sprinting && !trial.popped, popUp: pop,
      steer: turning ? side : 0, compress: turning ? turnCompress : 0,
    });
    if (session.phase === 'standing' && Number.isNaN(trial.stood)) trial.stood = t;
    if (session.phase === 'standing' && frame.valid && frame.aheadOfCrest >= 0 && frame.speedShoreward >= 0.6 * frame.crestSpeed) trial.riding += STEP;
    const speed = Math.hypot(board.velocity.x, board.velocity.z);
    if (!Number.isNaN(trial.stood)) {
      trial.speeds.push(speed);
      trial.topSpeed = Math.max(trial.topSpeed, speed);
      const back = trial.speeds.length - 7;
      if (back >= 0 && trial.speeds[back] - speed > trial.worstDrop) { trial.worstDrop = trial.speeds[back] - speed; trial.worstAt = t - trial.stood; }
      if (trial.log.length < 600 && (trial.speeds.length % every === 0 || session.phase === 'fallen')) {
        const weight = (board.mass + session.rider.mass) * 9.81;
        const travel = new Vector3(board.velocity.x, 0, board.velocity.z).normalize();
        const along = (v: Vector3) => (v.dot(travel) / weight).toFixed(2);
        const f = board.forces;
        const contact = session.rider.attached ? along(session.rider.contact.force.clone().multiplyScalar(-1)) : '-';
        const q = board.orientation;
        const pitch = (Math.atan2(2 * (q.y * q.z - q.w * q.x), Math.hypot(2 * (q.x * q.z + q.w * q.y), 1 - 2 * (q.x * q.x + q.y * q.y))) * 180) / Math.PI;
        water.sampleAt(board.centerOfMass.x, board.centerOfMass.y, board.centerOfMass.z, sample);
        const slope = (Math.atan(-(sample.slopeX * travel.x + sample.slopeZ * travel.z)) * 180) / Math.PI;
        const half = board.shape.length / 2;
        trial.log.push(`t ${(t - trial.stood).toFixed(3)} ${session.phase.padEnd(8)} v ${speed.toFixed(2)} | along: press ${along(f.pressure)} buoy ${along(f.buoyancy)} added ${along(f.addedMass)} rad ${along(f.radiation)} `
          + `fric ${along(f.friction)} fins ${along(f.fins)} rails ${along(f.rails)} froth ${along(f.froth)} contact ${contact} | pitch ${pitch.toFixed(1)} slope ${slope.toFixed(1)} `
          + `nose ${depthOf(session, half - 0.05).toFixed(3)} tail ${depthOf(session, -half + 0.05).toFixed(3)} wet ${board.wettedArea.toFixed(2)} vol ${(board.submergedVolume * 1000).toFixed(0)} L `
          + `sub ${board.substepsTaken} | ahead ${frame.aheadOfCrest.toFixed(2)} frac ${frame.faceFraction.toFixed(2)} brk ${sample.breaking.toFixed(2)} flow ${Math.hypot(sample.flowX, sample.flowZ).toFixed(2)}`
          + ` | lens ${sim.roller?.lensAt(board.centerOfMass.x, board.centerOfMass.z, lens) ? `t ${lens.thickness.toFixed(3)} g ${lens.g.toFixed(2)} c ${Math.hypot(lens.flowX, lens.flowZ).toFixed(2)}` : 'none'} `
          + `hull ${(board.lowestPoint() - sample.surfaceY).toFixed(3)}${lensPatches(session)}${lensesHere(board.centerOfMass.x, board.centerOfMass.z)}`);
      }
    }
    // --trace-dx D --trace-from T: per step, the board's and the rider's velocities and each ledger's work this step, J.
    if (option('trace-dx') !== undefined && Math.abs(trial.dx - Number(option('trace-dx'))) < 0.05 && !Number.isNaN(trial.stood)
      && t - trial.stood >= Number(option('trace-from') ?? 0)) {
      const bw = { ...board.work } as Record<string, number>;
      const rw = { ...session.rider.work } as Record<string, number>;
      const delta = (now: Record<string, number>, last: Record<string, number> | undefined) => Object.entries(now)
        .map(([key, value]) => [key, value - (last?.[key] ?? value)] as const).filter(([, d]) => Math.abs(d) > 5).map(([key, d]) => `${key} ${d.toFixed(0)}`).join(' ');
      const rv = session.rider.velocity;
      const ke = 0.5 * board.mass * board.velocity.lengthSq() + 0.5 * session.rider.mass * rv.lengthSq();
      console.log(`trace t ${(t - trial.stood).toFixed(3)} ${session.phase} board v ${board.velocity.x.toFixed(2)} ${board.velocity.y.toFixed(2)} ${board.velocity.z.toFixed(2)} `
        + `rider v ${rv.x.toFixed(2)} ${rv.y.toFixed(2)} ${rv.z.toFixed(2)} attached ${session.rider.attached} upright ${session.rider.upright} KE ${ke.toFixed(0)} `
        + `| board work ${delta(bw, trial.lastBoardWork)} | rider work ${delta(rw, trial.lastRiderWork)}`);
      trial.lastBoardWork = bw;
      trial.lastRiderWork = rw;
    }
    if (session.phase === 'fallen' || (!Number.isNaN(trial.stood) && t - trial.stood > Number(option('after') ?? 6)) || t > seconds) trial.done = true;
  }
}
for (const trial of trials) {
  const { session } = trial;
  const outcome = Number.isNaN(trial.stood) ? (session.phase === 'fallen' ? `fell popping up (${session.separation})` : 'never stood')
    : session.phase === 'fallen' ? `fell ${(trial.speeds.length * STEP).toFixed(2)} s after standing (${session.separation})` : 'still standing';
  console.log(`dx ${trial.dx.toFixed(1).padStart(5)}: ${outcome.padEnd(42)} top speed ${trial.topSpeed.toFixed(2)} m/s, riding ${trial.riding.toFixed(2)} s, `
    + `most lost in 0.1 s ${trial.worstDrop.toFixed(2)} m/s at ${trial.worstAt.toFixed(2)} s`);
}
// The log of the first rider who lost more than 2 m/s in 0.1 s, or of the rider at `--log-dx D`.
const logDx = option('log-dx');
const stopped = logDx !== undefined ? trials.find((trial) => Math.abs(trial.dx - Number(logDx)) < 0.05) : trials.find((trial) => trial.worstDrop > 2);
if (stopped && !quiet) console.log(`first stopped (dx ${stopped.dx.toFixed(1)}):\n  ${stopped.log.join('\n  ')}`);
