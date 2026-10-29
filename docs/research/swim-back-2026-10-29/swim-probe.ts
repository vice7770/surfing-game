/**
 * Back to the board after a wipeout, scripted (swim-back, 2026-10-29; headless `RideSession`, no SurfZoneRunner rider
 * sessions). One rider per script, all on the same water, is put off its board, and from then on each script plays the
 * player:
 * - idle: no input;
 * - swim: the paddle held (the stroke) and steered toward the board's middle, the pop-up pressed whenever it is in reach;
 * - reel: the pop-up key held (the reel, and the grab once in reach);
 * - both: swim and reel together;
 * - away: the paddle held, steered straight out to sea (swimming free: the speed through the water, the board in tow).
 * The falls:
 * - `--water flat|chop --from prone`: lying at rest, let go, the board flung `--fling` m/s shoreward (to the leash's end);
 * - `--water flat|chop --from standing`: standing at `--speed` m/s down the line for a second, then let go;
 * - `--water canyon --state <sea> [--size medium] [--inside m]`: lying at the default start of the game's Canyon sea, or
 *   `--inside` m shoreward of it (stepped on the CPU, the riders not pushing it, `--spread` m apart along shore), until
 *   broken water reaches the rider (breaking at least 0.5 for `--white` s), which lets it go if it has not knocked it
 *   off already. The swim then starts. With `--ride` (a saved sea from `catch-probe.ts --save-at`, the wave on its way),
 *   each rider instead catches the wave as the catch probe's good script does (sprinting once its crest is 2 s away,
 *   up at the game's cue) and rides it until it falls: a real wipeout, the board where the fall threw it. `--riders n`
 *   riders a script.
 * Per script: the time from the fall to the surface (the head out with control), to the grab and to lying on the board;
 * while swimming, the speed toward the board and through the water, the control, the thrust and drag; and a trace
 * (`--trace <script>`) of the stroke's thrust, the drag, the control and the leash.
 *   rolldown docs/research/swim-back-2026-10-29/swim-probe.ts -o dist/scripts/swim-probe.mjs --format esm --platform node \
 *     && node dist/scripts/swim-probe.mjs [--water flat|chop|canyon] [--from prone|standing] [--fling 4] [--speed 5]
 *        [--seconds 20] [--scripts swim,reel] [--trace swim] [--swim old]
 */
import { Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { PlaneWater } from '../../../src/physics/PlaneWater';
import { RideSession, type RideInput } from '../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../src/physics/SurfWater';
import { ChopWater } from '../../../src/physics/testing/ChopWater';
import { SurfZoneSimulation, rideLineupOffset, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState } from '../../../src/wave/surfZoneState';
import { readFileSync } from 'node:fs';
import { inTakeOffWindow } from '../../../src/physics/takeOffCue';
import { WaveFrameGauge } from '../../../src/physics/waveFrame';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const STEP = 1 / 60;
const waterName = option('water') ?? 'flat';
const from = option('from') ?? 'prone';
const fling = Number(option('fling') ?? 4);
const speed = Number(option('speed') ?? 5);
const seconds = Number(option('seconds') ?? 20);
const scripts = (option('scripts') ?? 'idle,swim,reel,both,away').split(',');
const traced = option('trace');
const swimOption = option('swim') as 'old' | undefined;
const wrap = (a: number) => Math.atan2(Math.sin(a), Math.cos(a));

let water: SurfWater;
let advance: () => void;
let start = { x: 0, z: 0 };
let sim: SurfZoneSimulation | undefined;
if (waterName === 'canyon') {
  const size = (option('size') ?? 'medium') as SwellSize;
  const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const config: SurfZoneConfig = { ...surfZoneConfigFor(settings, Number(option('seed') ?? 1), true), compute: 'cpu', ...(swimOption ? { swim: swimOption } as never : {}) };
  sim = new SurfZoneSimulation(config, 'warm');
  sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(option('state')!))));
  const physical = PhysicalSurfWater.forSimulation(sim);
  water = { sampleAt: (x, y, z, o) => physical.sampleAt(x, y, z, o), surfaceAt: (x, z) => physical.surfaceAt(x, z), addReaction: () => {}, setSampleTime: (o) => physical.setSampleTime(o) };
  const focus = sim.breakPoint();
  // `--inside m`: that far shoreward of the default start (the inside, where the broken water runs).
  start = { x: focus.x, z: focus.z - rideLineupOffset(config) + Number(option('inside') ?? 0) };
  advance = () => sim!.step(STEP);
} else if (waterName === 'chop') {
  const chop = new ChopWater(Number(option('scale') ?? 1), Number(option('seed') ?? 1));
  water = chop;
  advance = () => chop.advance(STEP);
} else {
  water = new PlaneWater({ depth: 3 });
  advance = () => {};
}

const ride = process.argv.includes('--ride');
const perScript = Number(option('riders') ?? 1);
interface Trial {
  gauge: WaveFrameGauge; seenBehind: boolean; sprinting: boolean; popped: boolean;
  script: string; session: RideSession; fellAt: number; surfaced: number; grabbed: number; mounted: number; whiteTime: number;
  swimTime: number; closing: number; travelled: number; gain: number; thrust: number; drag: number; lastDistance: number;
  lastCenter: Vector3; trace: string[]; cause?: string; climbing: number; climbFalls: number; own: number; ownTime: number;
}
const spread = Number(option('spread') ?? 3);
const trials: Trial[] = scripts.flatMap((script) => Array.from({ length: perScript }, () => script)).map((script, k, all) => {
  const session = new RideSession(swimOption ? ({ swim: swimOption } as never) : {});
  const x = start.x + (waterName === 'canyon' ? (k - (all.length - 1) / 2) * spread : 0);
  if (from === 'standing') session.place({ x, z: start.z, heading: 0, speed, phase: 'standing', followSurface: true }, water);
  else session.place({ x, z: start.z, heading: 0, speed: 0, phase: 'prone' }, water);
  return { gauge: new WaveFrameGauge({ directionX: 0, directionZ: 1 }), seenBehind: false, sprinting: false, popped: false, script, session, fellAt: Number.NaN, surfaced: Number.NaN, grabbed: Number.NaN, mounted: Number.NaN, whiteTime: 0, swimTime: 0, closing: 0, travelled: 0,
    gain: 0, thrust: 0, drag: 0, lastDistance: Number.NaN, lastCenter: new Vector3(Number.NaN, 0, 0), trace: [], climbing: Number.NaN, climbFalls: 0, own: 0, ownTime: 0 };
});
const center = new Vector3();
const sample = createWaterSample();
/** The grab's targets (`BoardRecovery.targetAt`): the hands at the rails, the chest over the deck's middle. */
const targetAt = (board: RideSession['board'], xSign: number, height: number, out: Vector3) => {
  const half = board.halfExtents;
  return out.set(xSign * Math.min(0.22, half.x * 0.5), half.y + height, xSign === 0 ? 0 : Math.min(0.25, half.z * 0.25)).applyQuaternion(board.orientation).add(board.position);
};
const scratch = new Vector3();
const up = new Vector3();
/** While holding: aligned, the deck's up, the board's spin, and the hands' and chest's distances to their targets. */
const holdState = (session: RideSession) => {
  const { board, surfer, recovery } = session;
  up.set(0, 1, 0).applyQuaternion(board.orientation);
  const left = surfer.nodes[3].position.distanceTo(targetAt(board, -1, 0.02, scratch));
  const right = surfer.nodes[4].position.distanceTo(targetAt(board, 1, 0.02, scratch));
  const chest = surfer.nodes[1].position.distanceTo(targetAt(board, 0, 0.2, scratch));
  return `${recovery.aligned ? 'aligned' : 'turning'} up ${up.y.toFixed(2)} spin ${board.angularVelocity.length().toFixed(1)} hands ${left.toFixed(2)}/${right.toFixed(2)} chest ${chest.toFixed(2)}`;
};
const idle: RideInput = { paddle: false, popUp: false, steer: 0 };
let t = 0;
for (let n = 0; n < Math.round(seconds / STEP) && trials.some((trial) => Number.isNaN(trial.mounted)); n += 1) {
  advance();
  t += STEP;
  for (const trial of trials) {
    const { session, script } = trial;
    if (!Number.isNaN(trial.mounted)) continue;
    const { surfer, board, recovery, leash } = session;
    // Before the fall: lying still (or riding) until the fall's moment.
    if (Number.isNaN(trial.fellAt)) {
      let letGo = false;
      if (ride) {
        // Catching and riding the wave, until it falls.
        const frame = trial.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
        if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) trial.seenBehind = true;
        const closing = frame.crestSpeed - frame.speedShoreward;
        const toCrest = trial.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Infinity;
        const prone = session.phase === 'prone';
        if (prone && trial.seenBehind && !trial.sprinting && toCrest <= 2) trial.sprinting = true;
        const pop = prone && !trial.popped && trial.seenBehind && (session.rider.popUpCue || inTakeOffWindow(frame));
        trial.popped ||= pop;
        if (!session.rider.attached) {
          trial.cause = session.separation;
          trial.fellAt = t;
        } else {
          session.step(STEP, water, { paddle: prone && !trial.popped, sprint: prone && trial.sprinting && !trial.popped, popUp: pop, steer: 0 });
        }
        if (Number.isNaN(trial.fellAt)) continue;
      } else if (waterName === 'canyon') {
        water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
        trial.whiteTime = sample.breaking >= 0.5 ? trial.whiteTime + STEP : 0;
        letGo = trial.whiteTime >= Number(option('white') ?? 0.5) || !session.rider.attached;
      } else letGo = t >= 1 || !session.rider.attached;
      if (letGo) {
        trial.cause = session.rider.attached ? 'let go' : session.separation;
        if (session.rider.attached) session.separate('balance');
        if (from === 'prone' && waterName !== 'canyon') board.velocity.z += fling;
        trial.fellAt = t;
      }
      session.step(STEP, water, idle);
      continue;
    }
    let input: RideInput = idle;
    if (surfer.active) {
      surfer.centerOfMass(center);
      const bearing = Math.atan2(board.position.x - center.x, board.position.z - center.z);
      const swim = script === 'swim' || script === 'both' || script === 'away';
      const aim = script === 'away' ? Math.PI : bearing;
      const inReach = recovery.inReach(board);
      input = {
        // Steering only while swimming free: holding the board, the hands turn it to the swimmer.
        paddle: swim && recovery.state === 'free', steer: swim && recovery.state === 'free' ? Math.max(-1, Math.min(1, 2 * wrap(aim - surfer.heading))) : 0,
        popUp: (script === 'swim' && inReach) || ((script === 'reel' || script === 'both') && Number.isNaN(trial.grabbed) && trial.lastDistance !== trial.lastDistance),
        reel: script === 'reel' || script === 'both',
      };
    }
    session.step(STEP, water, input);
    const since = t - trial.fellAt;
    if (Number.isNaN(trial.grabbed) && (recovery.state !== 'free' || session.rider.attached)) trial.grabbed = since;
    // On the board: climbing on (attached, in the climb), then lying on it.
    if (session.rider.attached) {
      if (script === traced && session.rider.climbingOn) {
        const r = session.rider as unknown as { limit: string; postureError: number; position: Vector3; target: Vector3 };
        up.set(0, 1, 0).applyQuaternion(board.orientation);
        const local = board.toLocal(r.position, scratch);
        trial.trace.push(`t ${since.toFixed(2)} CLIMB limit ${r.limit} err ${r.postureError.toFixed(3)} load ${session.rider.contact.load.toFixed(2)} feasible ${session.rider.contact.feasible} `
          + `| board up ${up.y.toFixed(2)} spin ${board.angularVelocity.length().toFixed(1)} v ${board.velocity.length().toFixed(2)} | body local ${local.x.toFixed(2)} ${local.y.toFixed(2)} ${local.z.toFixed(2)}`);
      }
      if (Number.isNaN(trial.climbing)) trial.climbing = since;
      if (session.phase === 'prone' && !session.rider.climbingOn) trial.mounted = since;
      continue;
    }
    // Back in the water during a climb: it failed (the next grab starts again).
    if (!Number.isNaN(trial.climbing)) { trial.climbFalls += 1; trial.climbing = Number.NaN; }
    if (!surfer.active) continue;
    surfer.centerOfMass(center);
    if (Number.isNaN(trial.surfaced) && !surfer.underwater && surfer.controlGain > 0.5) trial.surfaced = since;
    const distance = center.distanceTo(board.position);
    if (input.paddle && surfer.controlGain > 0.5) {
      // The swim's own speed: the centre of mass's velocity through the water at it, along the heading.
      const momentum = surfer.linearMomentum();
      water.sampleAt(center.x, center.y, center.z, sample);
      const along = ((momentum.x / surfer.mass - sample.flowX) * Math.sin(surfer.heading) + (momentum.z / surfer.mass - sample.flowZ) * Math.cos(surfer.heading));
      trial.ownTime += STEP;
      trial.own += along * STEP;
    }
    if (input.paddle) {
      trial.swimTime += STEP;
      trial.gain += surfer.controlGain * STEP;
      trial.thrust += surfer.lastForces.swim.length() * STEP;
      trial.drag += Math.hypot(surfer.lastForces.drag.x, surfer.lastForces.drag.z) * STEP;
      if (!Number.isNaN(trial.lastDistance)) trial.closing += trial.lastDistance - distance;
      if (!Number.isNaN(trial.lastCenter.x)) trial.travelled += Math.hypot(center.x - trial.lastCenter.x, center.z - trial.lastCenter.z);
    }
    trial.lastDistance = distance;
    trial.lastCenter.copy(center);
    if (script === traced && n % 15 === 0) {
      const momentum = surfer.linearMomentum();
      water.sampleAt(center.x, center.y, center.z, sample);
      trial.trace.push(`t ${since.toFixed(2)} ${recovery.state.padEnd(8)} chest-board ${distance.toFixed(2)} m | gain ${surfer.controlGain.toFixed(2)} spin ${surfer.angularSpeed.toFixed(1)} `
        + `under ${surfer.underwater ? 'y' : 'n'} brk ${sample.breaking.toFixed(2)} flow ${Math.hypot(sample.flowX, sample.flowZ).toFixed(2)} | swim ${surfer.lastForces.swim.length().toFixed(0)} N `
        + `drag ${Math.hypot(surfer.lastForces.drag.x, surfer.lastForces.drag.z).toFixed(0)} N v ${(Math.hypot(momentum.x, momentum.z) / surfer.mass).toFixed(2)} m/s `
        + `| leash ${leash.distance.toFixed(2)}/${leash.length.toFixed(2)} m ${leash.tension.toFixed(0)} N${leash.reeling ? ' reeling' : ''} | board ${board.velocity.length().toFixed(2)} m/s`
        + (recovery.state !== 'free' ? ` | ${holdState(session)}` : '') + ` | air ${(sample.voidFraction ?? 0).toFixed(2)} depth pelvis/chest/head/legs `
        + `${[0, 1, 2, 5].map((k) => (surfer.nodes[k].position.y - sample.surfaceY).toFixed(2)).join('/')} board ${(board.position.y - sample.surfaceY).toFixed(2)}`);
    }
  }
}
const f = (x: number) => (Number.isNaN(x) ? '—' : `${x.toFixed(2)} s`);
for (const trial of trials) {
  console.log(`${waterName} ${from} ${trial.script.padEnd(5)}: fell ${Number.isNaN(trial.fellAt) ? 'never' : `at ${trial.fellAt.toFixed(1)} s (${trial.cause})`}; surfaced ${f(trial.surfaced)}, grabbed ${f(trial.grabbed)}, `
    + `climbing ${f(trial.climbing)}${trial.climbFalls > 0 ? ` (${trial.climbFalls} fell back)` : ''}, lying on the board ${f(trial.mounted)}`
    + (trial.swimTime > 0 ? ` | swimming ${trial.swimTime.toFixed(1)} s: toward the board ${(trial.closing / trial.swimTime).toFixed(2)} m/s, over the ground ${(trial.travelled / trial.swimTime).toFixed(2)} m/s, `
      + `through the water along the heading ${trial.ownTime > 0 ? (trial.own / trial.ownTime).toFixed(2) : '—'} m/s (${trial.ownTime.toFixed(1)} s with control), `
      + `control ${(trial.gain / trial.swimTime).toFixed(2)}, thrust ${(trial.thrust / trial.swimTime).toFixed(0)} N, drag ${(trial.drag / trial.swimTime).toFixed(0)} N` : ''));
  if (trial.trace.length > 0) console.log(`  ${trial.trace.join('\n  ')}`);
}
