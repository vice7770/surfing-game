/** Matched paddle-ins for the Canyon sharp-turn work order. Run as a Node bundle with rolldown. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { deflateSync } from 'node:zlib';
import { Vector3 } from 'three';
import { surfZoneConfigFor } from '../src/game/PhysicalMode';
import { physicalSettingsFor } from '../src/game/SurfConditions';
import { PhysicalSurfWater } from '../src/physics/PhysicalSurfWater';
import { RideSession } from '../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../src/physics/SurfWater';
import { encodeSurfZoneState } from '../src/wave/surfZoneState';
import { deckHeight } from '../src/physics/riderPosture';
import { inTakeOffWindow } from '../src/physics/takeOffCue';
import { WaveFrameGauge } from '../src/physics/waveFrame';
import { rideLineupAlong, rideLineupOffset, SurfZoneSimulation, type SurfZoneConfig } from '../src/wave/SurfZoneSimulation';

const step = 1 / 60;
const degrees = 180 / Math.PI;
const seed = Number(process.argv[2] ?? 2);
const candidate = process.argv[3];
const exercise = process.argv[4] ?? 'simultaneous';
const observationSeconds = Number(process.argv[5] ?? 3);
if (!Number.isFinite(observationSeconds) || observationSeconds <= 0) throw new Error('Standing observation time must be positive.');
const saveStart = exercise === 'standing-start';
if (!saveStart && exercise !== 'simultaneous' && exercise !== 'rail-first') throw new Error('Use simultaneous, rail-first or standing-start.');
if (saveStart && (seed !== 2 || candidate !== 'turnBalance=planing')) throw new Error('The standing checkpoint uses seed 2 with turnBalance=planing.');
if (!Number.isSafeInteger(seed) || !candidate) throw new Error('Pass a sea seed and the candidate rider query parameters.');
const base = '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const settings = physicalSettingsFor('canyon', { swell: 'medium', tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
function configFor(search: string): SurfZoneConfig {
  Object.defineProperty(globalThis, 'location', { configurable: true, value: { search } });
  return { ...surfZoneConfigFor(settings, seed, true), compute: 'cpu' };
}
const control = configFor(base);
const variant = configFor(base + '&' + candidate);
const switches = new URLSearchParams(candidate);
if (!switches.size) throw new Error('The candidate needs a rider option.');
for (const [key, value] of switches) {
  if (key !== 'plantFloor' && key !== 'compressRelease' && key !== 'hipRecruit' && key !== 'turnBalance') {
    throw new Error('Shared water permits rider options only. Unknown option ' + key);
  }
  if (switches.getAll(key).length !== 1 || variant[key] !== value) throw new Error('Invalid candidate value for ' + key);
}
const sea = new SurfZoneSimulation(control);
const surface = PhysicalSurfWater.forSimulation(sea, undefined, 1);
// Every rider samples the same evolving wave. Individual boards cannot disturb the other trials.
const water: SurfWater = {
  surfaceAt: (x, z) => surface.surfaceAt(x, z),
  sampleAt: (x, y, z, sample) => surface.sampleAt(x, y, z, sample),
  setSampleTime: offset => surface.setSampleTime(offset),
  addReaction() {},
};
const focus = sea.breakPoint();
const x = focus.x + rideLineupAlong(control);
const z = focus.z - rideLineupOffset(control);
const heading = control.directionDegrees / degrees;
type Input = readonly [name: string, steer: number, compress: number];
const conditions: readonly Input[] = exercise === 'rail-first' ? [
  ['left+half', 1, 0.5], ['right+half', -1, 0.5], ['left+full', 1, 1], ['right+full', -1, 1],
] : [
  ['neutral', 0, 0], ['left', 1, 0], ['right', -1, 0],
  ['compress', 0, 1], ['left+compress', 1, 1], ['right+compress', -1, 1],
];

let checkpointSaved = false;
let approachSea: ReturnType<SurfZoneSimulation['exportState']> | undefined;
const approachPlacement = { x, z, heading: 0, speed: 0, phase: 'prone' } as const;
const approachInputs: { steps: number; paddle: boolean; sprint: boolean; popUp: boolean }[] = [];
function recordApproachInput(paddle: boolean, sprint: boolean, popUp: boolean): void {
  const previous = approachInputs.at(-1);
  if (previous && !popUp && previous.paddle === paddle && previous.sprint === sprint && !previous.popUp) previous.steps++;
  else approachInputs.push({ steps: 1, paddle, sprint, popUp });
}

/** Store the standing paddle-in's water and player placement, using the same format as Surf School. */
function saveStandingStart(session: RideSession): void {
  const { board, heading } = session;
  const { x, z } = board.position;
  const sample = water.sampleAt(x, water.surfaceAt(x, z) - 0.05, z, createWaterSample());
  const speed = (board.velocity.x - sample.flowX) * Math.sin(heading) + (board.velocity.z - sample.flowZ) * Math.cos(heading);
  const placement = { x, z, heading, speed, phase: 'standing' };
  const approachTicks = approachInputs.reduce((total, row) => total + row.steps, 0);
  if (!approachSea || Math.abs(approachSea.solverTime + approachTicks * step - sea.solver.time) > 1e-6) {
    throw new Error('The recorded sea and paddle-in controls are out of step.');
  }
  const metadata = { config: variant, placement, solverTime: sea.solver.time, approachPlacement, approachInputs, approachSolverTime: approachSea.solverTime };
  const folder = 'public/debug/canyon';
  mkdirSync(folder, { recursive: true });
  writeFileSync(folder + '/approach.sea', deflateSync(encodeSurfZoneState(approachSea)));
  writeFileSync(folder + '/standing.json', JSON.stringify(metadata, null, 2) + '\n');
  checkpointSaved = true;
  console.log(`Recorded the first standing Canyon frame at solver time ${sea.solver.time.toFixed(3)} s.`);
}

class Trial {
  readonly session: RideSession;
  readonly gauge = new WaveFrameGauge({ directionX: Math.sin(heading), directionZ: Math.cos(heading) });
  private seenCrest = false;
  private sprinting = false;
  private pop = false;
  private stood?: number;
  private lastCourse = 0;
  private courseChange = 0;
  private peakCourse = 0;
  private peakBank = 0;
  private courseAtRelease?: number;
  private bodyHeightAtRelease?: number;
  private bodyHeightAfterRelease?: number;
  private climb = 0;
  private minHeight = Infinity;
  private lowestFaceSinceRelease?: number;
  private previousHeight?: number;
  private climbSpeed?: number;
  private speed = 0;
  private readonly local = new Vector3();

  constructor(readonly wave: number, readonly arm: string, readonly input: Input,
    config: SurfZoneConfig, readonly start: number) {
    this.session = new RideSession(config);
    this.session.place({ x, z, heading: 0, speed: 0, phase: 'prone' }, water);
  }

  advance(time: number): boolean {
    const { session } = this;
    const { board, rider } = session;
    const frame = this.gauge.update(water, board.centerOfMass, board.velocity, step, 55);
    if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) this.seenCrest = true;
    const closing = frame.crestSpeed - frame.speedShoreward;
    const prone = session.phase === 'prone';
    if (this.seenCrest && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 && frame.aheadOfCrest / closing <= 2) this.sprinting = true;
    const popUp = !this.pop && prone && this.seenCrest && (rider.popUpCue || inTakeOffWindow(frame));
    this.pop ||= popUp;
    const since = this.stood === undefined ? -1 : time - this.stood;
    const pulse = session.phase === 'standing' && since >= 0.3 && since < 0.3 + 0.9;
    const pressCompress = pulse && (exercise === 'simultaneous' || since >= 0.60);
    const paddle = prone && !this.pop;
    const sprint = prone && this.sprinting && !popUp;
    if (saveStart) recordApproachInput(paddle, sprint, popUp);
    session.step(step, water, {
      paddle, sprint, popUp,
      steer: pulse ? this.input[1] : 0, compress: pressCompress ? this.input[2] : 0,
    });
    if (this.stood === undefined && session.phase === 'standing') {
      if (saveStart) {
        saveStandingStart(session);
        return true;
      }
      this.stood = time;
      this.lastCourse = Math.atan2(board.velocity.x, board.velocity.z);
    }
    if (this.stood !== undefined && rider.attached) {
      const course = Math.atan2(board.velocity.x, board.velocity.z);
      this.courseChange += Math.atan2(Math.sin(course - this.lastCourse), Math.cos(course - this.lastCourse)) * degrees;
      this.lastCourse = course;
      if (Math.abs(this.courseChange) > Math.abs(this.peakCourse)) this.peakCourse = this.courseChange;
      const bank = rider.bank.angle * degrees;
      if (Math.abs(bank) > Math.abs(this.peakBank)) this.peakBank = bank;
      this.speed = rider.leanProbe.speedThrough;
      const local = board.toLocal(rider.position, this.local);
      const bodyHeight = local.y - deckHeight(board.shape, local.z);
      if (pulse) this.minHeight = Math.min(this.minHeight, bodyHeight);
      if (since >= 1.2) {
        this.bodyHeightAtRelease ??= bodyHeight;
        this.courseAtRelease ??= this.courseChange;
        if (since >= 1.7) this.bodyHeightAfterRelease ??= bodyHeight;
      }
      if (frame.valid) {
        const height = frame.faceHeight * frame.faceFraction;
        if (since >= 1.2) {
          this.lowestFaceSinceRelease = Math.min(this.lowestFaceSinceRelease ?? height, height);
          this.climb = Math.max(this.climb, height - this.lowestFaceSinceRelease);
          if (this.climbSpeed === undefined && this.previousHeight !== undefined && this.previousHeight < 0.9 && height >= 0.9 && this.lowestFaceSinceRelease < 0.9) {
            this.climbSpeed = this.speed;
          }
        }
        this.previousHeight = height;
      }
    }
    const elapsed = this.stood === undefined ? null : time - this.stood;
    if (rider.attached && (elapsed === null ? time < 20 : elapsed < observationSeconds)) return false;
    console.log(JSON.stringify({
      seed, wave: this.wave, arm: this.arm, exercise, observationSeconds, input: this.input[0],
      outcome: elapsed === null ? 'never stood' : rider.attached ? 'attached at cutoff' : session.separation,
      standingSeconds: elapsed, peakBodyBankDeg: this.peakBank, peakCourseChangeDeg: this.peakCourse,
      courseAtReleaseDeg: this.courseAtRelease ?? null, postReleaseClimbM: this.lowestFaceSinceRelease === undefined ? null : this.climb,
      bodyHeightAtReleaseM: this.bodyHeightAtRelease ?? null, bodyHeightHalfSecondLaterM: this.bodyHeightAfterRelease ?? null,
      minHeightDuringPulseM: Number.isFinite(this.minHeight) ? this.minHeight : null,
      finalThroughWaterMps: elapsed === null ? null : this.speed, climbAtPoint9Mps: this.climbSpeed ?? null,
    }));
    return true;
  }
}

const trials: Trial[] = [];
const history: number[] = [];
const end = sea.solver.time + 12 * control.peakPeriod;
let waves = 0;
let previousTrigger = -Infinity;
while (!checkpointSaved && ((waves < 2 && sea.solver.time < end) || trials.length)) {
  // A peak is detected one step after its crest. Preserve the preceding sea so the live worker
  // can advance normally, then place the board and apply the first recorded stroke on the same tick.
  if (saveStart && !waves && history.length >= 2) {
    const last = history[history.length - 1];
    if (last > history[history.length - 2] && last - Math.min(...history) >= 0.3 * control.significantHeight) {
      approachSea = sea.exportState();
    }
  }
  sea.step(step);
  const now = sea.solver.time;
  if (waves < 2 && now < end) {
    history.push(water.surfaceAt(x, z - 36));
    if (history.length > Math.round(0.5 * control.peakPeriod / step)) history.shift();
    const n = history.length;
    if (n >= 3 && history[n - 2] > history[n - 3] && history[n - 2] >= history[n - 1]
      && history[n - 2] - Math.min(...history) >= 0.3 * control.significantHeight && now - previousTrigger > 0.4 * control.peakPeriod) {
      previousTrigger = now;
      waves++;
      if (saveStart) {
        if (waves === 1) trials.push(new Trial(waves, 'candidate', conditions[0], variant, now));
      } else {
        for (const input of conditions) {
          trials.push(new Trial(waves, 'control', input, control, now), new Trial(waves, 'candidate', input, variant, now));
        }
      }
    }
  }
  for (let i = trials.length - 1; i >= 0; i--) {
    if (trials[i].advance(now - trials[i].start)) trials.splice(i, 1);
  }
}
if (saveStart && !checkpointSaved) throw new Error('The rider never stood on the checkpoint wave.');
if (!saveStart && waves !== 2) throw new Error('The sea did not supply both comparison waves.');
