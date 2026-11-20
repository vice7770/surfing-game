/**
 * **Does the drawn chest clip? — the reader for the `twistMost` question (2026-11-20).**
 *
 * The claim under test, as it was published: `RIG_DETAIL.cascade.twistMost = 45` (`HumanoidRig.ts:315`) "clamps the
 * drawn chest and hips to 45° of twist", so during ordinary riding "the drawn torso sits saturated" while the physics
 * twists to 50–57°.
 *
 * **The arithmetic in the code is not that.** At `HumanoidRig.ts:990–1003` the chest starts at the key pose's own
 * `this.pose.chest` and the clamped turn is *added*:
 *
 * ```
 * let chest = upright ? this.pose.chest : 0;
 * const chestTurn = clamp(±most, toNose * blend * (cascade.chest * state.yawRate + state.twist));
 * chest += chestTurn;
 * ```
 *
 * So `twistMost` bounds the **turn contribution**, not the final drawn chest, and the whole block is inside
 * `if (state.phase === 'standing')` — it says nothing about a prone or landing pose. "Saturated at 45°" does not
 * follow from that line, and this reader exists to replace the inference with a measurement.
 *
 * **What it measures, and why that is the honest quantity.** Because the clamp sits on an additive offset, and
 * because `this.pose.chest`, the two followers (`chestFollower`, `aimFollower`) and the stick's lead are the *same*
 * in both arms, the shortfall of the **final drawn chest** is exactly the clamp's excess, delayed by the follower.
 * This reader does not assume that: it runs the real rig twice over the *same* recorded drawn frames — once at the
 * shipped `twistMost = 45` and once with the clamp lifted out of the way (`LIFT`, instrument-only, never shipped) —
 * and reads the final drawn chest, hips and head off `StanceGauge`, the project's own instrument, in each arm. The
 * difference between the arms is the clipping, measured after the followers rather than argued before them.
 *
 * ## Arms
 *
 * | arm | env | what it is |
 * |---|---|---|
 * | **ships** | `RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on` | the owner's own address: `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on` |
 * | **old** | `RIDER=old` | the control. The old rotor's twist is hard-clamped at `TWIST_RANGE = 45°` in the physics (`AttachedRider.ts:557`, `:4039`), exactly where the drawing clamps, so on this rider the clamp can only ever bite the yaw-rate anticipation term |
 *
 * ## ☠️ What a broken result would look like, and the controls that catch it
 *
 * 1. **`nClip = 0` on both arms** would mean the detector never fired. The raw unclamped turn is printed as a
 *    distribution beside the count, so an empty filter shows as a count rather than as a clean-looking zero.
 * 2. **`chestGap` identically 0 while `nClip > 0`** would mean the two rigs are the same read. They are two
 *    independent `PosedBody` instances on two independent skeletons, replayed over identical frames; the `old` arm's
 *    own spread is the proof that the instrument resolves a difference at all.
 * 3. **`twistPeak` at exactly 45° on the `new` arm** would mean the physics twist is still the old rotor's, i.e. the
 *    switch did not reach the rider. `TWIST_BODY_RANGE = 0.87 rad = 49.85°` with only a soft end stop, so the new
 *    arm must read past 45° if it is the new rider at all. Printed per arm.
 * 4. **Every number is `Number.isFinite`-filtered and printed beside its count**, so no share is ever read off an
 *    empty set.
 * 5. **The canyon seatbelt**: the solver's grid is printed. Canyon B is 400 × 451 = 180 400 cells; the default
 *    Canyon is 400 × 507. A run that prints the wrong grid is not a Canyon B run.
 *
 * Reproduce:
 * ```sh
 * ./node_modules/.bin/rolldown docs/research/new-rider/3.5/twistclip.ts -o "$SP/tc.mjs" --format esm --platform node
 * RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on node "$SP/tc.mjs"
 * ```
 */
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { RIG_DETAIL } from '../../../../src/scene/rig/HumanoidRig';
import { PosedBody } from '../../../../src/scene/rig/posedBody';
import { RiderMotion } from '../../../../src/scene/rig/riderMotion';
import { RIG_SWITCHES } from '../../../../src/scene/rig/stanceBlend';
import { StanceGauge } from '../../../../src/scene/rig/stanceGauge';
import { createTestHumanoid } from '../../../../src/scene/rig/testHumanoid';
import { createRiderVisualState, type RiderVisualState } from '../../../../src/scene/rig/riderVisualState';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** The clamp lifted out of the way for the instrument arm. Never shipped; `RIG_DETAIL` is restored before the report. */
const LIFT = 100000;

const RIDER = (process.env.RIDER ?? 'new') as 'old' | 'new';
const FELT = process.env.FELT as 'deck' | undefined;
const BODY = process.env.BODY as 'two' | undefined;
const REACH = process.env.REACH as 'keep' | undefined;
const DEEPEN = process.env.DEEPEN as 'on' | undefined;
const SEED = Number(process.env.SEED ?? 1);
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SECONDS = Number(process.env.SECONDS ?? 4);
const TRIALS = Number(process.env.TRIALS ?? 2);
const GAP = Number(process.env.GAP ?? 1.5);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SINK = Number(process.env.SINK ?? 0);
/**
 * Snap held, 0–1 (`AttachedRider.snap`). It matters to this question on the OLD rider: off the rotation stick its twist
 * rotor rests at 0 (`twistStep`: `rotate` is NaN, so `asked` is 0), and Snap is the other thing that winds it —
 * `snapAim()` winds the shoulders to `SNAP_DRIVE_TURN = TWIST_RANGE = 45°`, exactly where the drawing clamps.
 */
const SNAP = Number(process.env.SNAP ?? 0);
/** The pad's rotation, −1 to 1, or unset (NaN) for a player with no rotation stick. The old rotor's only other input. */
const ROTATE = process.env.ROTATE === undefined ? Number.NaN : Number(process.env.ROTATE);
const nums =(value: string | undefined, fallback: string) => (value ?? fallback).split(',').map(Number);
const ENTRIES = nums(process.env.ENTRIES, '4,6,8,10');
const STICKS = nums(process.env.STICKS, '0,0.5,1');
type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];

const r = (x: number, dp = 3) => (Number.isFinite(x) ? Number(x.toFixed(dp)) : null);
const q = (xs: readonly number[], p: number): number => {
  const s = xs.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!s.length) return Number.NaN;
  const i = (s.length - 1) * p;
  const lo = Math.floor(i);
  const hi = Math.ceil(i);
  return s[lo] + (s[hi] - s[lo]) * (i - lo);
};
function show(label: string, xs: readonly number[], dp = 2, unit = ''): void {
  const ok = xs.filter(Number.isFinite);
  if (!ok.length) {
    console.log(`  ${label.padEnd(34)} n=0  (no values)`);
    return;
  }
  console.log(`  ${label.padEnd(34)} n=${String(ok.length).padStart(6)}  median ${q(ok, 0.5).toFixed(dp)}${unit}`
    + `  range ${Math.min(...ok).toFixed(dp)} … ${Math.max(...ok).toFixed(dp)}${unit}`
    + `  (q1 ${q(ok, 0.25).toFixed(dp)}, q3 ${q(ok, 0.75).toFixed(dp)})`);
}

/** One drawn frame, kept exactly as the rig reads it, so both arms replay the same ride. */
interface Frame {
  run: number;
  t: number;
  points: number[];
  phase: RiderVisualState['phase'];
  heading: number;
  boardPosition: [number, number, number];
  boardQuaternion: [number, number, number, number];
  twist: number;
  weight: number;
  snap: number;
  steer: number;
  /** The board's roll, °, + its left rail down: the capsize filter, so "ordinary riding" is not read off a spinning board. */
  roll: number;
}

const scratch = createWaterSample();

/** A rider placed standing on the water at `x, z`, as `bank.ts` places one: the owner's address, the folder's placement. */
function placePair(water: SurfWater, x: number, z: number, speed: number, stance: Stance, stick: number): { board: BoardBody; rider: AttachedRider } | null {
  const sy = water.surfaceAt(x, z);
  const here = water.sampleAt(x, sy, z, scratch);
  if (!here.wet || here.outsideDomain) return null;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const fall = new Vector3(here.slopeX, 0, here.slopeZ);
  if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
  fall.normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(x, sy, z).addScaledVector(normal, board.shape.centerOfMass.y - SINK),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(speed).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(BODY ? { riderBody: BODY } : {}),
    ...(REACH ? { stanceReach: REACH } : {}),
    ...(DEEPEN ? { deepen: DEEPEN } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  rider.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rider.compress = stance === 'compress' ? 1 : 0;
  rider.steer = stick;
  rider.snap = SNAP;
  rider.rotate = ROTATE;
  return { board, rider };
}

const point = new Vector3();

/** Steps one placed pair to its fall or to `SECONDS`, recording every frame the rig would be handed. */
function record(pair: { board: BoardBody; rider: AttachedRider }, water: SurfWater, run: number, out: Frame[]): { frames: number; fellAt: number | null } {
  const { board, rider } = pair;
  let t = 0;
  let kept = 0;
  const end = Math.round(SECONDS / STEP);
  for (let i = 0; i < end; i += 1) {
    if (!rider.attached) return { frames: kept, fellAt: t };
    board.step(STEP, water);
    t += STEP;
    if (!rider.attached) return { frames: kept, fellAt: t };
    const points: number[] = [];
    for (let k = 0; k < 7; k += 1) {
      rider.renderPoint(k, board, point);
      points.push(point.x, point.y, point.z);
    }
    const forward = new Vector3(0, 0, 1).applyQuaternion(board.orientation);
    out.push({
      run,
      t,
      points,
      phase: rider.phase,
      heading: Math.atan2(forward.x, forward.z),
      boardPosition: [board.position.x, board.position.y, board.position.z],
      boardQuaternion: [board.orientation.x, board.orientation.y, board.orientation.z, board.orientation.w],
      twist: rider.drawnTwist,
      weight: rider.contact.weight,
      snap: rider.snapping,
      steer: rider.steer,
      roll: -Math.asin(Math.max(-1, Math.min(1, new Vector3(1, 0, 0).applyQuaternion(board.orientation).y))) * DEG,
    });
    kept += 1;
  }
  return { frames: kept, fellAt: null };
}

/**
 * What one arm of the rig read on a frame: the drawn chest, hips and head off the board's nose, °, and the two
 * inputs the clamp sees (`state.standingBlend`, `state.yawRate`) as `RiderMotion` filled them.
 */
interface Drawn { chest: number; hips: number; head: number; blend: number; yawRate: number }

/** Replays the recorded frames through a real rig at the given clamp, through the page's own smoothing layer. */
function replay(frames: readonly Frame[], twistMost: number): (Drawn | null)[] {
  const was = RIG_DETAIL.cascade.twistMost;
  RIG_DETAIL.cascade.twistMost = twistMost;
  const out: (Drawn | null)[] = [];
  try {
    const { bones } = createTestHumanoid();
    const body = new PosedBody(bones);
    const gauge = new StanceGauge(bones);
    const state = createRiderVisualState();
    let motion = new RiderMotion();
    let run = -1;
    for (const frame of frames) {
      // A new run is a new body: nothing blends from the run before.
      if (frame.run !== run) {
        run = frame.run;
        body.reset();
        motion = new RiderMotion();
      }
      for (let k = 0; k < 7; k += 1) state.points[k].set(frame.points[k * 3], frame.points[k * 3 + 1], frame.points[k * 3 + 2]);
      state.phase = frame.phase;
      state.heading = frame.heading;
      state.boardPosition.set(...frame.boardPosition);
      state.boardQuaternion.set(...frame.boardQuaternion);
      state.twist = frame.twist;
      state.weight = frame.weight;
      state.snap = frame.snap;
      state.steer = frame.steer;
      state.stance = 'regular';
      state.stroking = 0;
      motion.update(state, frame.t);
      state.clock = frame.t;
      body.update(state);
      if (state.phase !== 'standing') {
        out.push(null);
        continue;
      }
      const j = gauge.joints();
      const fh = new Vector3(0, 0, 1).applyQuaternion(state.boardQuaternion).setY(0).normalize();
      const yaw = (v: Vector3) => Math.atan2(new Vector3().crossVectors(fh, v).y, fh.dot(v)) * DEG;
      out.push({ chest: yaw(j.chestFacing), hips: yaw(j.pelvisFacing), head: yaw(j.headFacing), blend: state.standingBlend, yawRate: state.yawRate });
    }
  } finally {
    RIG_DETAIL.cascade.twistMost = was;
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------
// The real Canyon as `?canyonWaves=true` builds it. His own spot.
// ---------------------------------------------------------------------------------------------------------------
const arm = `${RIDER}${FELT ? '+felt' : ''}${BODY ? '+body' : ''}${REACH ? '+reach' : ''}${DEEPEN ? '+deepen' : ''}`
  + `${SNAP ? `+snap${SNAP}` : ''}${Number.isFinite(ROTATE) ? `+rotate${ROTATE}` : ''}`;
const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
const base = surfZoneConfigFor(settings, SEED, true);
const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
const wall = Date.now();
const sim = new SurfZoneSimulation(config);
const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
const focus = sim.breakPoint();
const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
// The new surfer's twist is the pelvis's too, exactly as `PhysicalMode` sets it for `?rider=new`.
RIG_SWITCHES.twistHips = RIDER === 'new' ? 'whole' : undefined;
console.log(`SEATBELT arm=${arm} seed=${SEED} size=${SIZE} grid=${nx}x${nz} cells=${nx * nz} spunUp=${r((Date.now() - wall) / 1000, 2)}s`
  + ` focus=(${r(focus.x, 2)}, ${r(focus.z, 2)}) twistHips=${RIG_SWITCHES.twistHips ?? '(unset)'} shippedTwistMost=${RIG_DETAIL.cascade.twistMost}`);

const water: SurfWater = {
  sampleAt: (x, y, z, out) => physical.sampleAt(x, y, z, out),
  surfaceAt: (x, z) => physical.surfaceAt(x, z),
  addReaction: () => {},
  setSampleTime: (o: number) => physical.setSampleTime(o),
};

const frames: Frame[] = [];
const runs: { run: number; entry: number; stance: Stance; stick: number; trial: number; frames: number; fellAt: number | null }[] = [];
let placed = 0;
let t = 0;
let run = 0;
const started = Date.now();
while (placed < TRIALS) {
  sim.step(STEP);
  t += STEP;
  if (t >= GAP * (placed + 1)) {
    placed += 1;
    for (const entry of ENTRIES) {
      for (const stance of STANCES) {
        for (const stick of STICKS) {
          const pair = placePair(water, focus.x, focus.z - AHEAD, entry, stance, stick);
          if (!pair) continue;
          run += 1;
          const { frames: kept, fellAt } = record(pair, water, run, frames);
          runs.push({ run, entry, stance, stick, trial: placed, frames: kept, fellAt: fellAt === null ? null : Number(fellAt.toFixed(3)) });
        }
      }
    }
  }
}

const shipped = replay(frames, RIG_DETAIL.cascade.twistMost);
const lifted = replay(frames, LIFT);
const most = RIG_DETAIL.cascade.twistMost;

// Standing frames only: the clamp lives inside `if (state.phase === 'standing')`.
const standing: number[] = [];
for (let i = 0; i < frames.length; i += 1) if (shipped[i] && lifted[i]) standing.push(i);

const twistDeg = standing.map((i) => frames[i].twist * DEG);
const chestShipped = standing.map((i) => shipped[i]!.chest);
const chestLifted = standing.map((i) => lifted[i]!.chest);
const chestGap = standing.map((i) => Math.abs(lifted[i]!.chest - shipped[i]!.chest));
const hipsGap = standing.map((i) => Math.abs(lifted[i]!.hips - shipped[i]!.hips));
const headGap = standing.map((i) => Math.abs(lifted[i]!.head - shipped[i]!.head));
const clipped = standing.filter((_i, k) => chestGap[k] > 0.5);

console.log(`\nPOPULATION arm=${arm}  runs=${runs.length}  recorded frames=${frames.length}  standing frames=${standing.length}`
  + `  fell=${runs.filter((e) => e.fellAt !== null).length} of ${runs.length}  wall=${r((Date.now() - started) / 1000, 1)}s`);
console.log(`  placement: canyon bed B, focus −${AHEAD} m, side ${SIDE}°, entries ${ENTRIES.join('/')} m/s, sticks ${STICKS.join('/')}, stances ${STANCES.join('/')}, trials ${TRIALS}, ${SECONDS}s a run`);
console.log(`  clamp: RIG_DETAIL.cascade.twistMost = ${most}° (shipped) vs ${LIFT}° (lifted, instrument only)`);

console.log('\nTHE PHYSICS TWIST the rig is handed (|state.twist|, the snapshot\'s `drawnTwist`)');
show('|twist|, deg', twistDeg.map(Math.abs), 2, '°');
console.log(`  frames past the clamp (|twist| > ${most}°): ${twistDeg.filter((x) => Math.abs(x) > most).length} of ${standing.length}`);

console.log('\nTHE DRAWN CHEST off the board\'s nose, through the real rig and the stance gauge');
show('shipped, deg', chestShipped, 2, '°');
show('clamp lifted, deg', chestLifted, 2, '°');
show('|lifted − shipped| (the clipping)', chestGap, 2, '°');
console.log(`  frames clipped by more than 0.5°: ${clipped.length} of ${standing.length}`
  + (standing.length ? ` (${r((100 * clipped.length) / standing.length, 1)}%)` : ''));
if (clipped.length) {
  show('clipping where it clips, deg', clipped.map((i) => Math.abs(lifted[i]!.chest - shipped[i]!.chest)), 2, '°');
  show('|twist| where it clips, deg', clipped.map((i) => Math.abs(frames[i].twist) * DEG), 2, '°');
}

// Which term pushes the sum over the clamp: the physics twist on its own, or the yaw-rate anticipation the clamp was
// written to bound. `chestTurn = clamp(±most, blend * (0.3 * yawRate + twist))`, in degrees.
const twistTerm = standing.map((i) => Math.abs(shipped[i]!.blend * frames[i].twist) * DEG);
const leadTerm = standing.map((i) => Math.abs(shipped[i]!.blend * RIG_DETAIL.cascade.chest * shipped[i]!.yawRate) * DEG);
const rawTerm = standing.map((i) => Math.abs(shipped[i]!.blend * (RIG_DETAIL.cascade.chest * shipped[i]!.yawRate + frames[i].twist)) * DEG);
console.log('\nWHICH TERM GOES OVER THE CLAMP (the chest\'s turn before it is clamped, °)');
show('|blend · twist| alone', twistTerm, 2, '°');
show('|blend · 0.3 · yawRate| alone', leadTerm, 2, '°');
show('|the sum| (what is clamped)', rawTerm, 2, '°');
const clippedIdx = clipped;
const physicsOver = clippedIdx.filter((i) => Math.abs(shipped[i]!.blend * frames[i].twist) * DEG > most);
console.log(`  of the ${clippedIdx.length} clipped frames, the PHYSICS TWIST alone is already past ${most}°: ${physicsOver.length}`
  + (clippedIdx.length ? ` (${r((100 * physicsOver.length) / clippedIdx.length, 1)}%)` : '')
  + ` — on the rest the clamp is bounding the anticipation it was written for`);
show('standingBlend', standing.map((i) => shipped[i]!.blend), 3, '');
show('|yawRate|, rad/s', standing.map((i) => Math.abs(shipped[i]!.yawRate)), 2, '');

// ORDINARY RIDING: the board on a plausible rail and not spinning out, so the share below is not read off a capsize.
// 61 of 72 runs here end in a fall inside 3 s, and the frames just before one carry roll past any rail and yaw rates
// a rider never asks for; without this filter the headline share belongs partly to those.
const ordinary = standing.filter((i, k) => Math.abs(frames[i].roll) <= 45 && rawTerm[k] <= 60);
const ordinaryClipped = ordinary.filter((i) => Math.abs(lifted[i]!.chest - shipped[i]!.chest) > 0.5);
console.log('\nORDINARY RIDING ONLY (|board roll| ≤ 45° and the unclamped turn ≤ 60°: not a capsize)');
console.log(`  frames: ${ordinary.length} of ${standing.length} standing`);
show('|board roll| over all standing, deg', standing.map((i) => Math.abs(frames[i].roll)), 1, '°');
show('|twist| in ordinary riding, deg', ordinary.map((i) => Math.abs(frames[i].twist) * DEG), 2, '°');
console.log(`  clipped by more than 0.5°: ${ordinaryClipped.length} of ${ordinary.length}`
  + (ordinary.length ? ` (${r((100 * ordinaryClipped.length) / ordinary.length, 1)}%)` : ''));
if (ordinaryClipped.length) {
  show('clipping where it clips, deg', ordinaryClipped.map((i) => Math.abs(lifted[i]!.chest - shipped[i]!.chest)), 2, '°');
  show('|twist| where it clips, deg', ordinaryClipped.map((i) => Math.abs(frames[i].twist) * DEG), 2, '°');
  const over = ordinaryClipped.filter((i) => Math.abs(shipped[i]!.blend * frames[i].twist) * DEG > most);
  console.log(`  of those, the PHYSICS TWIST alone is already past ${most}°: ${over.length} (${r((100 * over.length) / ordinaryClipped.length, 1)}%)`);
}

console.log('\nTHE SIDE EFFECTS: the hips and the head in the same frames');
show('|lifted − shipped| hips, deg', hipsGap, 2, '°');
show('|lifted − shipped| head, deg', headGap, 2, '°');

console.log('\nRUNS');
for (const e of runs) console.log(`  run ${String(e.run).padStart(3)}  trial ${e.trial}  entry ${e.entry} m/s  ${e.stance.padEnd(8)} stick ${e.stick}  frames ${String(e.frames).padStart(4)}  fellAt ${e.fellAt ?? 'stood'}`);
console.log(`\nDONE arm=${arm} runs=${runs.length} standingFrames=${standing.length} clippedFrames=${clipped.length}`);
