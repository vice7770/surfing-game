/**
 * Catching the Canyon's waves from the default start, scripted (canyon-catch, 2026-10-29; no SurfZoneRunner rider
 * sessions): the game's own Canyon sea at a size, stepped on the CPU at the worker's 1/60 s, and for every wave that
 * crosses a point PROBE m seaward of the start, a set of headless riders (`RideSession`, as the game's) placed prone at
 * rest at the start, nose to the beach, each with its own script. The riders read the water and do not push it, so they
 * share one sea. Each script paddles straight in from its placement, sprints once the crest is `sprint` s away (the
 * gauge's distance to the crest over the closing speed), and pops up when the game's cue lights (the HUD's: the rider's
 * planing cue or `inTakeOffWindow`); `lift` also pops when the crest is about to pass under a sprinting rider with no
 * cue (as a player might, feeling the board lifted). Each trial is then read as:
 * - rode: standing at least RIDE_TIME s on the face ahead of the crest, moving at least RIDE_SHARE of its speed;
 * - no cue: the cue never lit before the wave passed (left behind lying down);
 * - left on the crest: popped, but the wave went on without the rider (behind the crest, or off the back);
 * - white water: knocked off (or lying down) while the crest at the rider was breaking;
 * - fell: knocked off with an unbroken crest elsewhere.
 * Per trial it also gives the cue's, the pop's and the stand's times against the crest reaching the rider, the face under
 * the board at the pop and the wave's face at the start (the gauge's, the most seen while the crest was 0–10 m away).
 *   rolldown docs/research/canyon-catch-2026-10-29/catch-probe.ts -o dist/scripts/catch-probe.mjs --format esm --platform node \
 *     && node dist/scripts/catch-probe.mjs --size medium --seed 1 --periods 12 [--start <m out>] [--state <sea>] [--json <file>]
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../src/game/SurfConditions';
import { PhysicalSurfWater } from '../../../src/physics/PhysicalSurfWater';
import { RideSession } from '../../../src/physics/RideSession';
import { createWaterSample, type SurfWater } from '../../../src/physics/SurfWater';
import { inTakeOffWindow } from '../../../src/physics/takeOffCue';
import { WaveFrameGauge, type WaveFrame } from '../../../src/physics/waveFrame';
import { SurfZoneSimulation, rideLineupOffset, type SurfZoneConfig } from '../../../src/wave/SurfZoneSimulation';
import { decodeSurfZoneState, encodeSurfZoneState } from '../../../src/wave/surfZoneState';

const option = (name: string) => { const at = process.argv.indexOf(`--${name}`); return at < 0 ? undefined : process.argv[at + 1]; };
const size = (option('size') ?? 'medium') as SwellSize;
const seed = Number(option('seed') ?? 1);
const periods = Number(option('periods') ?? 12);
const STEP = 1 / 60;
/** Where an incoming crest is first noticed, m seaward of the start: inside the gauge's 40 m look behind the rider. */
const PROBE = 36;
/** A trial's riders live this long, s. */
const TRIAL = 16;
const RIDE_TIME = 2;
const RIDE_SHARE = 0.6;
/** `lift`: the crest within this many m of a sprinting rider, high on the face, and no cue yet. */
const LIFT_AHEAD = 1.5;
const LIFT_FRACTION = 0.6;
const [traceTrial, traceScript] = (option('trace') ?? '-1:').split(':').map((v, i) => (i === 0 ? Number(v) : v)) as [number, string];
const STROKES = (option('strokes') ?? 'feather,old').split(',') as ('feather' | 'old')[];
const SCRIPTS = STROKES.flatMap((stroke) => [
  { name: `good${stroke === 'old' ? '/old' : ''}`, stroke, sprint: 2, lift: false },
  { name: `early${stroke === 'old' ? '/old' : ''}`, stroke, sprint: 4, lift: false },
  { name: `late${stroke === 'old' ? '/old' : ''}`, stroke, sprint: 0.8, lift: false },
  { name: `lift${stroke === 'old' ? '/old' : ''}`, stroke, sprint: 2, lift: true },
]);

const settings = physicalSettingsFor('canyon', { swell: size, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const base = surfZoneConfigFor(settings, seed, true);
const config: SurfZoneConfig = { ...base, compute: 'cpu' };
const statePath = option('state');
const wall = Date.now();
let sim: SurfZoneSimulation;
if (statePath && existsSync(statePath)) {
  sim = new SurfZoneSimulation(config, 'warm');
  sim.importState(decodeSurfZoneState(new Uint8Array(readFileSync(statePath))));
} else {
  sim = new SurfZoneSimulation(config);
  if (statePath) writeFileSync(statePath, encodeSurfZoneState(sim.exportState()));
}
const physical = PhysicalSurfWater.forSimulation(sim);
const water: SurfWater = {
  sampleAt: (x, y, z, out) => physical.sampleAt(x, y, z, out),
  surfaceAt: (x, z) => physical.surfaceAt(x, z),
  addReaction: () => {},
};
const focus = sim.breakPoint();
const out = option('start') !== undefined ? Number(option('start')) : rideLineupOffset(config);
const start = { x: focus.x, z: focus.z - out };
const depthAt = (z: number) => -sim.bedAt(start.x, z) + sim.solver.restLevel;
console.log(`canyon ${size} seed ${seed}: take-off (${focus.x}, ${focus.z.toFixed(1)}), start ${out} m out at z ${start.z.toFixed(1)} (${depthAt(start.z).toFixed(2)} m deep); `
  + `t ${sim.solver.time.toFixed(1)} s after the spin-up (${((Date.now() - wall) / 1000).toFixed(0)} s wall)`);

type Outcome = 'rode' | 'no cue' | 'left on the crest' | 'white water' | 'fell';
interface Rider {
  script: (typeof SCRIPTS)[number];
  session: RideSession;
  gauge: WaveFrameGauge;
  sprinting: boolean;
  cueAt?: number; popAt?: number; standAt?: number; fellAt?: number; fellCause?: string;
  passedAt?: number; arrival?: number; seenBehind: boolean; trace?: string[];
  popSlope?: number; popFace?: number; popFraction?: number; popAhead?: number; popSpeed?: number; popCrest?: number;
  fellBreaking?: number; fellAhead?: number; proneBreaking: number;
  maxSpeedProne: number; face: number; riding: number; done: boolean;
}
interface Trial { placed: number; riders: Rider[]; arrival?: number; last: number[] }
const trials: Trial[] = [];
const active: Trial[] = [];
const sample = createWaterSample();

function place(): Trial {
  const trial: Trial = {
    placed: sim.solver.time, last: [],
    riders: SCRIPTS.map((script) => ({
      script, session: new RideSession({ stroke: script.stroke }), gauge: new WaveFrameGauge({ directionX: 0, directionZ: 1 }), sprinting: false,
      proneBreaking: 0, maxSpeedProne: 0, face: 0, riding: 0, done: false, seenBehind: false,
      ...(traceTrial === trials.length && traceScript === script.name ? { trace: [] } : {}),
    })),
  };
  for (const rider of trial.riders) rider.session.place({ x: start.x, z: start.z, heading: 0, speed: 0, phase: 'prone' }, water);
  return trial;
}

function slopeUnder(rider: Rider): number {
  const b = rider.session.board.centerOfMass;
  water.sampleAt(b.x, b.y, b.z, sample);
  return (Math.atan(-sample.slopeZ) * 180) / Math.PI;
}

function stepRider(rider: Rider, t: number): void {
  const { session, script } = rider;
  const board = session.board;
  const frame: WaveFrame = rider.gauge.update(water, board.centerOfMass, board.velocity, STEP, 55);
  // The trial's wave: its crest first seen behind the rider (the one the probe saw coming), then reaching it.
  if (frame.valid && frame.aheadOfCrest > 3 && frame.crestSpeed > 2) rider.seenBehind = true;
  const closing = frame.crestSpeed - frame.speedShoreward;
  const toCrest = rider.seenBehind && frame.valid && frame.aheadOfCrest > 0 && closing > 0.5 ? frame.aheadOfCrest / closing : Number.POSITIVE_INFINITY;
  const prone = session.phase === 'prone';
  if (frame.valid && frame.aheadOfCrest >= 0 && frame.aheadOfCrest <= 10) rider.face = Math.max(rider.face, frame.faceHeight);
  // The crest reaching the rider: the first step it is under or past it.
  if (rider.arrival === undefined && rider.seenBehind && frame.valid && frame.aheadOfCrest <= 0.5 && frame.crestSpeed > 2) rider.arrival = t;
  const cue = prone && (session.rider.popUpCue || inTakeOffWindow(frame));
  if (cue && rider.cueAt === undefined) rider.cueAt = t;
  let pop = false;
  if (prone && rider.popAt === undefined && rider.seenBehind) {
    if (!rider.sprinting && toCrest <= script.sprint) rider.sprinting = true;
    if (cue) pop = true;
    if (script.lift && rider.sprinting && frame.valid && frame.aheadOfCrest < LIFT_AHEAD && frame.aheadOfCrest > 0 && frame.faceFraction > LIFT_FRACTION) pop = true;
    rider.maxSpeedProne = Math.max(rider.maxSpeedProne, Math.hypot(board.velocity.x, board.velocity.z));
    rider.proneBreaking = Math.max(rider.proneBreaking, frame.valid && Math.abs(frame.aheadOfCrest) < 2 ? frame.crestBreaking : 0);
  }
  if (pop) {
    rider.popAt = t;
    rider.popSlope = slopeUnder(rider);
    rider.popFace = frame.faceHeight;
    rider.popFraction = frame.faceFraction;
    rider.popAhead = frame.aheadOfCrest;
    rider.popSpeed = frame.speedShoreward;
    rider.popCrest = frame.crestSpeed;
  }
  session.step(STEP, water, { paddle: prone && !pop && rider.popAt === undefined, sprint: prone && rider.sprinting && !pop, popUp: pop, steer: 0 });
  if (session.phase === 'standing' && rider.standAt === undefined) rider.standAt = t;
  if (session.phase === 'fallen' && rider.fellAt === undefined) {
    rider.fellAt = t;
    rider.fellCause = session.separation;
    rider.fellBreaking = frame.valid ? frame.crestBreaking : 0;
    rider.fellAhead = frame.valid ? frame.aheadOfCrest : Number.NaN;
  }
  if (session.phase === 'standing' && frame.valid && frame.aheadOfCrest >= 0 && frame.speedShoreward >= RIDE_SHARE * frame.crestSpeed) rider.riding += STEP;
  // The wave gone past: its crest ahead of the rider (the gauge sees crests up to 12 m ahead).
  if (rider.passedAt === undefined && rider.arrival !== undefined && frame.valid && frame.aheadOfCrest < -1.5 && session.phase !== 'standing') rider.passedAt = t;
  if (rider.trace && Math.round(t / STEP) % 6 === 0) {
    const b = session.board;
    rider.trace.push(`t ${t.toFixed(2)} ${session.phase.padEnd(8)} z ${(b.centerOfMass.z - start.z).toFixed(1)} v ${Math.hypot(b.velocity.x, b.velocity.z).toFixed(2)} `
      + `lift ${(b.forces.pressure.y / ((b.mass + session.rider.mass) * 9.81)).toFixed(2)} | c ${frame.crestSpeed.toFixed(1)} ahead ${frame.aheadOfCrest.toFixed(1)} face ${frame.faceHeight.toFixed(2)} `
      + `frac ${frame.faceFraction.toFixed(2)} brk ${frame.crestBreaking.toFixed(2)} slope ${slopeUnder(rider).toFixed(0)}° vs ${frame.speedShoreward.toFixed(2)}${cue ? ' CUE' : ''}${rider.sprinting ? ' sprint' : ''}`);
  }
  // Done: down, ridden, or the wave gone a second past.
  if (rider.fellAt !== undefined || rider.riding >= RIDE_TIME + 1 || (rider.passedAt !== undefined && t > rider.passedAt + 1)) rider.done = true;
}

function outcome(rider: Rider): Outcome {
  if (rider.riding >= RIDE_TIME) return 'rode';
  if (rider.fellAt !== undefined) {
    const broke = (rider.fellBreaking ?? 0) >= 0.3 && Math.abs(rider.fellAhead ?? Infinity) <= 4;
    if (broke || (rider.popAt === undefined && rider.proneBreaking >= 0.3)) return 'white water';
    if ((rider.fellAhead ?? 0) < 0 || rider.popAt !== undefined) return rider.standAt === undefined && (rider.fellBreaking ?? 0) >= 0.3 ? 'white water' : 'left on the crest';
    return 'fell';
  }
  if (rider.popAt === undefined) return rider.proneBreaking >= 0.5 ? 'white water' : 'no cue';
  return 'left on the crest';
}

// Incoming crests at the probe: a local top of the surface, prominent over the last half period's lowest.
const probeZ = start.z - PROBE;
/** The trial's crest reaches the start no sooner than half its shallow-water travel time from the probe. */
const earliest = (0.5 * PROBE) / Math.sqrt(9.81 * depthAt(start.z - PROBE / 2));
const history: number[] = [];
const span = Math.round((0.5 * config.peakPeriod) / STEP);
const minRise = 0.3 * config.significantHeight;
let lastTrigger = Number.NEGATIVE_INFINITY;
const end = sim.solver.time + periods * config.peakPeriod;
while (sim.solver.time < end || active.length > 0) {
  sim.step(STEP);
  const t = sim.solver.time;
  if (t < end) {
    history.push(water.surfaceAt(start.x, probeZ));
    if (history.length > span) history.shift();
    const n = history.length;
    if (n >= 3 && history[n - 2] > history[n - 3] && history[n - 2] >= history[n - 1] && history[n - 2] - Math.min(...history) >= minRise
      && t - lastTrigger > 0.4 * config.peakPeriod) {
      lastTrigger = t;
      const trial = place();
      trials.push(trial);
      active.push(trial);
    }
  }
  for (let k = active.length - 1; k >= 0; k -= 1) {
    const trial = active[k];
    // The trial's crest passing the start: the first top of the surface there once it can have come from the probe.
    if (trial.arrival === undefined) {
      const last = trial.last;
      last.push(water.surfaceAt(start.x, start.z));
      if (last.length > 3) last.shift();
      if (last.length === 3 && last[1] > last[0] && last[1] >= last[2] && t - STEP - trial.placed >= earliest) trial.arrival = t - STEP - trial.placed;
    }
    for (const rider of trial.riders) if (!rider.done) stepRider(rider, t - trial.placed);
    if (t - trial.placed >= TRIAL || trial.riders.every((rider) => rider.done)) active.splice(k, 1);
  }
}
console.log(`stepped to t ${sim.solver.time.toFixed(1)} s; ${trials.length} waves tried (${((Date.now() - wall) / 1000).toFixed(0)} s wall)`);

// Sets: the top third of the waves by their face at the start (the good script's gauge).
const faces = trials.map((trial) => trial.riders[0].face).sort((a, b) => b - a);
const setFace = faces[Math.max(0, Math.ceil(faces.length / 3) - 1)] ?? Infinity;
const rows = trials.map((trial) => ({
  placed: +trial.placed.toFixed(2), arrival: trial.arrival === undefined ? undefined : +trial.arrival.toFixed(2), face: +trial.riders[0].face.toFixed(2), set: trial.riders[0].face >= setFace,
  riders: trial.riders.map((rider) => {
    const at = (time?: number) => (time === undefined || trial.arrival === undefined ? undefined : +(time - trial.arrival).toFixed(2));
    return {
      script: rider.script.name, outcome: outcome(rider), reached: rider.arrival === undefined ? undefined : +(rider.arrival - (trial.arrival ?? Number.NaN)).toFixed(2),
      cue: at(rider.cueAt), pop: at(rider.popAt), stand: at(rider.standAt), fell: at(rider.fellAt), cause: rider.fellCause,
      popSlope: rider.popSlope === undefined ? undefined : +rider.popSlope.toFixed(1), popFraction: rider.popFraction === undefined ? undefined : +rider.popFraction.toFixed(2),
      popAhead: rider.popAhead === undefined ? undefined : +rider.popAhead.toFixed(2), popSpeed: rider.popSpeed === undefined ? undefined : +rider.popSpeed.toFixed(2),
      popCrest: rider.popCrest === undefined ? undefined : +rider.popCrest.toFixed(2), maxSpeedProne: +rider.maxSpeedProne.toFixed(2), riding: +rider.riding.toFixed(2),
    };
  }),
}));
for (const trial of trials) for (const rider of trial.riders) if (rider.trace) console.log(`trace, wave ${trials.indexOf(trial)} (${trial.placed.toFixed(1)} s), ${rider.script.name}:\n  ${rider.trace.join('\n  ')}`);
const jsonPath = option('json');
if (jsonPath) writeFileSync(jsonPath, JSON.stringify({ size, seed, out, start, focus, setFace, rows }, null, 1));
for (const script of SCRIPTS) {
  for (const group of ['sets', 'all'] as const) {
    const list = rows.filter((row) => group === 'all' || row.set).map((row) => row.riders.find((r) => r.script === script.name)!);
    const count = (o: Outcome) => list.filter((r) => r.outcome === o).length;
    const rode = list.filter((r) => r.outcome === 'rode');
    const med = (values: number[]) => { const s = values.filter(Number.isFinite).sort((a, b) => a - b); return s.length ? s[Math.floor(s.length / 2)] : Number.NaN; };
    console.log(`${script.name.padEnd(9)} ${group.padEnd(4)} ${list.length}: rode ${count('rode')}, no cue ${count('no cue')}, left on the crest ${count('left on the crest')}, white water ${count('white water')}, fell ${count('fell')}; `
      + `rides: pop ${med(rode.map((r) => r.pop ?? NaN)).toFixed(2)} s, stand ${med(rode.map((r) => (r.stand ?? NaN) - (r.pop ?? NaN))).toFixed(2)} s after the pop, `
      + `face under the board ${med(rode.map((r) => r.popSlope ?? NaN)).toFixed(0)}°, ${med(rode.map((r) => r.popFraction ?? NaN)).toFixed(2)} up; `
      + `paddling top speed ${med(list.map((r) => r.maxSpeedProne)).toFixed(2)} m/s`);
  }
}
console.log(`set faces ≥ ${setFace.toFixed(2)} m; wall ${((Date.now() - wall) / 1000).toFixed(0)} s`);
