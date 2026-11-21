/**
 * **Step 3.5r: the video series' photogrammetric rulers, calibrated against a subject whose true joint angles are
 * known — the game's own rider.**
 *
 * Sixteen clips have been read with a handful of rulers, each of which is a ratio of PROJECTED distances between
 * joints. Most are now known or suspected to be broken, and **not one has ever been run against a subject whose true
 * joint angles are known.** This probe does that, and it needs no pixels: it poses the game's own skeletons, reads the
 * truth off the 3D joints with the game's own `StanceGauge`, projects the same joints through a pinhole camera, and
 * computes every ruler from the projected points. **The discrepancy is the ruler's bias.**
 *
 * Nothing under `src/` is touched. The probe only reads: `readGlbSkeleton` (the four committed surfers), `HumanoidRig`
 * (the pose), `StanceGauge` (the truth), `posturePoints` (the physics' seven points).
 *
 * ## What is measured
 *
 * - **R1, the leg chain** — `|hip→ankle| ÷ (|hip→knee| + |knee→ankle|)`, projected. Truth: the knee's flexion in 3D.
 * - **R2, the thigh/shin admissibility test** — projected `|hip→knee| ÷ |knee→ankle|`, against the subject's own 3D
 *   ratio (which is NOT 1.0–1.1 for every body, and that is one of the findings).
 * - **R3, the trunk gate** — projected `|acromion→waistband| ÷ head length`. Two waistband conventions, because the
 *   published 1.6–1.8 band is a garment convention, not an anatomical constant.
 * - **R3a, the projected trunk angle** from the image's vertical. Truth: `StanceAngles.trunkTilt`.
 * - **R4, THE SPAN CLAIM** — R3a at a FIXED pose (zero anatomical flexion by construction) as the body swivels in
 *   yaw. Anything it moves is manufactured.
 * - **R5, hip above the deck ÷ head length**, swept over the stance's span at FIXED true knee flexion.
 * - **R6, apparent stature in head-lengths**, swept over the lens's elevation.
 *
 * ## The pixel scale is part of the measurement
 *
 * Every projected landmark is **rounded to a whole pixel** on a grid scaled so the subject's projected head length is
 * `HEADS` px (the clips ran 20–90). On top of that, a seeded Monte Carlo adds an independent uniform **±`JITTER` px**
 * to each landmark coordinate, which is the reader's own placement error (the clips quote ±3 source px). Both bands
 * are reported: a ruler whose signal is smaller than its noise is useless however unbiased it is.
 *
 * ## Controls, because a metric that cannot fail is worthless
 *
 * - **P1/P2, positive controls.** A limb's own plane, or the trunk-and-vertical plane, placed IN the image plane is
 *   the one camera where the ruler is known correct. The probe projects from exactly there and checks it recovers the
 *   3D value. If P1/P2 do not recover, nothing else in the output means anything.
 * - **N1, the shuffle.** Each ruler's correlation with the truth, and with a seeded shuffle of the same truths. A
 *   ruler that "cannot fail" scores the same both ways.
 * - **N2, the finite guard.** Every ruler value is checked finite at the point of computation and the run THROWS on a
 *   non-finite. Nothing is filtered against `NaN`, which is how the last round published a negative control reading
 *   zero.
 * - **N3, the range guard.** Every ruler's output range over its sweep is printed. A broken ruler's range is 0.
 *
 * Run (nothing is installed; `SP` is a scratch directory):
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/rulers.ts -o "$SP/r.mjs" --format esm --platform node
 *   node "$SP/r.mjs" > "$SP/out.txt"
 *
 * `MODE=full` adds the per-5° sweeps; the default prints the report's tables only.
 */
import { readFileSync } from 'node:fs';
import { Quaternion, Vector3, type Bone } from 'three';
import { BOARD_CENTRE, BOARD_LENGTH, deckAt, railHalfWidth } from '../../../../src/scene/rig/boardDeck';
import { readGlbSkeleton } from '../../../../src/scene/rig/glbSkeleton';
import { HumanoidRig } from '../../../../src/scene/rig/HumanoidRig';
import { BONES, type Side } from '../../../../src/scene/rig/humanoidBones';
import { posturePoints } from '../../../../src/scene/rig/posturePoints';
import { POINT, createRiderVisualState, type RiderVisualState } from '../../../../src/scene/rig/riderVisualState';
import { StanceGauge, createStanceJoints, type StanceAngles, type StanceJoints } from '../../../../src/scene/rig/stanceGauge';
import { createTestHumanoid } from '../../../../src/scene/rig/testHumanoid';

const DEG = 180 / Math.PI;
const RAD = Math.PI / 180;
const UP = new Vector3(0, 1, 0);
/** The board is level at the origin and Regular: its nose is +z, its toes' rail −x, and the rider faces −x. */
const BOARD = { boardPosition: new Vector3(0, 0, 0), boardQuaternion: new Quaternion() };
const NOSE = new Vector3(0, 0, 1);
const TOES = new Vector3(-1, 0, 0);
/** A standing human's stature in head-lengths: the series' own denominator (`video-ref-9` §0.6). */
const HEADS_TALL = 7.7;
/** Where a boardshorts waistband sits, as a share of stature: the skill's own figure, and clip 13's gate rests on it. */
const WAISTBAND_SHARE = 0.6;
/** Head lengths in source pixels, as the clips ran them (20–90). */
const HEADS = [20, 40, 90] as const;
/** The reader's own landmark error, px, on top of the whole-pixel grid (the clips quote ±3 source px). */
const JITTER = [0, 1, 3] as const;
/** Monte Carlo draws per jitter band. */
const DRAWS = 240;
/** The camera's distance from the rider, m: a long lens on a surfer is near-orthographic; 8 m and 60 m bound it. */
const DIST = 20;

// ───────────────────────────────── statistics, named so nobody has to guess ─────────────────────────────────
const sorted = (v: readonly number[]) => [...v].sort((a, b) => a - b);
/** The UPPER middle element at p = 0.5 (this codebase's own `qt`), said out loud so no reader assumes a mean of two. */
const qt = (v: readonly number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const mean = (v: readonly number[]) => v.reduce((a, b) => a + b, 0) / v.length;
const min = (v: readonly number[]) => v.reduce((a, b) => Math.min(a, b), Infinity);
const max = (v: readonly number[]) => v.reduce((a, b) => Math.max(a, b), -Infinity);
const sd = (v: readonly number[]) => { const m = mean(v); return Math.sqrt(v.reduce((a, b) => a + (b - m) ** 2, 0) / Math.max(1, v.length - 1)); };
/** Pearson's r between two equal-length series. */
function correlation(a: readonly number[], b: readonly number[]): number {
  const ma = mean(a); const mb = mean(b);
  let top = 0; let la = 0; let lb = 0;
  for (let i = 0; i < a.length; i += 1) { top += (a[i] - ma) * (b[i] - mb); la += (a[i] - ma) ** 2; lb += (b[i] - mb) ** 2; }
  return top / Math.sqrt(la * lb);
}
/** A seeded generator, so every number in the report reproduces exactly. */
function random(seed: number): () => number {
  let s = seed >>> 0;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}
const f = (x: number, n = 2) => (Number.isFinite(x) ? x.toFixed(n) : 'n/a');
/** N2: nothing is ever compared against `NaN` in this probe — a non-finite throws where it is made. */
function finite(x: number, what: string): number {
  if (!Number.isFinite(x)) throw new Error(`${what} is not finite (${x}): the pipeline is broken, not the ruler.`);
  return x;
}

// ───────────────────────────────── the subjects: the game's own bodies ─────────────────────────────────
interface Subject {
  name: string;
  bones: Map<string, Bone>;
  gauge: StanceGauge;
  rig: HumanoidRig;
  /** Rest geometry, m: the mesh's own height (sole to crown), the head segment, and the limb lengths. */
  stature: number;
  headLength: number;
  /** The crown above the head bone at rest, m, along the head's own up. */
  crownOver: number;
  thigh: number;
  shin: number;
  /** The acromion and the hip joints' rest heights as shares of stature, for the trunk gate's two conventions. */
  acromionShare: number;
  hipShare: number;
  /** The 0.60-stature waistband above the hip joints at rest, m, along the pelvis's own up. */
  waistOver: number;
  /** The head's up and the pelvis's up, in their own bones' frames (carried when posed). */
  headUpLocal: Vector3;
  pelvisUpLocal: Vector3;
}

/** A GLB's own bounding box in the bind pose, from the JSON chunk's POSITION accessor bounds — no binary parsing. */
function glbHeight(bytes: ArrayBuffer): { low: number; high: number } {
  const view = new DataView(bytes);
  if (view.getUint32(0, true) !== 0x46546c67) throw new Error('Not a GLB.');
  const length = view.getUint32(12, true);
  const json = JSON.parse(new TextDecoder().decode(new Uint8Array(bytes, 20, length))) as {
    meshes?: { primitives: { attributes: Record<string, number> }[] }[];
    accessors?: { min?: number[]; max?: number[] }[];
  };
  let low = Infinity; let high = -Infinity;
  for (const mesh of json.meshes ?? []) {
    for (const primitive of mesh.primitives) {
      const accessor = json.accessors?.[primitive.attributes.POSITION];
      if (accessor?.min && accessor.max) { low = Math.min(low, accessor.min[1]); high = Math.max(high, accessor.max[1]); }
    }
  }
  return { low: finite(low, 'a GLB\'s lowest vertex'), high: finite(high, 'a GLB\'s highest vertex') };
}

function subjectOf(name: string, bones: Map<string, Bone>, stature: number, low: number): Subject {
  const gauge = new StanceGauge(bones);
  const rest = gauge.joints();
  const at = (bone: string) => bones.get(bone)!.getWorldPosition(new Vector3());
  const headBone = at(BONES.head);
  const headUp = headBone.clone().sub(at(BONES.neck)).normalize();
  const headQuaternion = bones.get(BONES.head)!.getWorldQuaternion(new Quaternion());
  const hipsQuaternion = bones.get(BONES.hips)!.getWorldQuaternion(new Quaternion());
  const headLength = stature / HEADS_TALL;
  const acromion = (rest.shoulder.left.y + rest.shoulder.right.y) / 2;
  const hips = rest.hips.y;
  const rig = new HumanoidRig(bones);
  return {
    name, bones, gauge, rig,
    stature,
    headLength,
    // The crown is the mesh's own highest vertex; the chin is one head-length below it (the series' convention).
    crownOver: (low + stature) - headBone.y,
    thigh: rest.hip.left.distanceTo(rest.knee.left),
    shin: rest.knee.left.distanceTo(rest.ankle.left),
    acromionShare: (acromion - low) / stature,
    hipShare: (hips - low) / stature,
    waistOver: (low + WAISTBAND_SHARE * stature) - hips,
    headUpLocal: headUp.clone().applyQuaternion(headQuaternion.clone().invert()),
    pelvisUpLocal: UP.clone().applyQuaternion(hipsQuaternion.clone().invert()),
  };
}

function subjects(): Subject[] {
  const out: Subject[] = [];
  for (const name of ['surfer1', 'surfer2', 'surfer3', 'surfer4']) {
    const bytes = readFileSync(`public/assets/surfers/${name}.glb`);
    const buffer = bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength);
    const { bones } = readGlbSkeleton(buffer);
    const { low, high } = glbHeight(buffer);
    out.push(subjectOf(name, bones, high - low, low));
  }
  // The rig tests' own stand-in, kept in the population because every published rig figure was read on it.
  const { bones } = createTestHumanoid();
  out.push(subjectOf('test-rig', bones, 1.72, 0));
  return out;
}

// ───────────────────────────────── posing: the physics' own crouch, settled ─────────────────────────────────
/**
 * The seven points of the standing posture with the five trunk-and-hand points dropped `depth` m, which is how the
 * physics crouches (`AttachedRider`: one scalar vertical shift of five of seven parts), and the feet's span widened by
 * `span` m (the front foot forward, the rear back — the stance's own width in the image of a side-on lens).
 */
function pose(depth: number, span: number, out: RiderVisualState): RiderVisualState {
  const state = posturePoints('standing', 'regular', BOARD.boardPosition, BOARD.boardQuaternion, out);
  for (const index of [POINT.pelvis, POINT.torso, POINT.head, POINT.leftHand, POINT.rightHand]) state.points[index].y -= depth;
  // Regular: the left foot is the front one (+z, the nose).
  state.points[POINT.leftFoot].z += span / 2;
  state.points[POINT.rightFoot].z -= span / 2;
  return state;
}

/**
 * The subject settled at a pose and read: the rig's followers are time-filtered, so the pose is solved `STEPS` times
 * at 60 Hz from a reset, and the KNEES are checked identical over the last second — a settled pose, not a transient.
 * The trunk never settles exactly because the rig breathes (`Breathing`): the breath's own band over that last second
 * is recorded in `WOBBLE` and printed with the report, so no reader mistakes it for a measurement's error.
 */
const STEPS = 240;
const WOBBLE: number[] = [];
interface Posed { angles: StanceAngles; joints: StanceJoints; feet: [Vector3, Vector3]; crown: Vector3; chin: Vector3; waist: Vector3; acromion: Vector3 }
/** Poses are deterministic in (subject, depth, span), so they are solved once and kept: the sweeps re-read them. */
const POSES = new Map<string, Posed>();
function posed(subject: Subject, depth: number, span = 0): Posed {
  const key = `${subject.name}|${depth}|${span}`;
  const got = POSES.get(key);
  if (got) return got;
  const made = solve(subject, depth, span);
  POSES.set(key, made);
  return made;
}
function solve(subject: Subject, depth: number, span: number): Posed {
  const state = createRiderVisualState();
  subject.rig.reset();
  let knees = Number.NaN;
  const trunk: number[] = [];
  for (let step = 0; step < STEPS; step += 1) {
    pose(depth, span, state);
    state.clock = step / 60;
    subject.rig.solve(state);
    if (step === STEPS - 60) knees = subject.gauge.measure(BOARD, 'regular').kneeFront;
    if (step >= STEPS - 60) trunk.push(subject.gauge.measure(BOARD, 'regular').trunkTilt);
  }
  const angles = subject.gauge.measure(BOARD, 'regular');
  if (Math.abs(finite(angles.kneeFront, 'the settled front knee') - knees) > 1e-9) {
    throw new Error(`${subject.name} at depth ${depth} has not settled: front knee ${knees} then ${angles.kneeFront}.`);
  }
  WOBBLE.push(max(trunk) - min(trunk));
  const joints = subject.gauge.joints(createStanceJoints());
  const headUp = subject.headUpLocal.clone().applyQuaternion(subject.bones.get(BONES.head)!.getWorldQuaternion(new Quaternion())).normalize();
  const pelvisUp = subject.pelvisUpLocal.clone().applyQuaternion(subject.bones.get(BONES.hips)!.getWorldQuaternion(new Quaternion())).normalize();
  const crown = joints.head.clone().addScaledVector(headUp, subject.crownOver);
  return {
    angles,
    joints,
    feet: [state.points[POINT.leftFoot].clone(), state.points[POINT.rightFoot].clone()],
    crown,
    chin: crown.clone().addScaledVector(headUp, -subject.headLength),
    waist: joints.hips.clone().addScaledVector(pelvisUp, subject.waistOver),
    acromion: joints.shoulder.left.clone().add(joints.shoulder.right).multiplyScalar(0.5),
  };
}

/**
 * The same body with its TRUNK FOLDED `extra` degrees further and its LEGS UNTOUCHED — the posture the clips actually
 * read (a fold over a hip that does not move), which the rig itself cannot make because its drawn trunk is a function
 * of leg depth. The acromion, crown and chin are turned rigidly about the hip joints' centre, in the plane the rig's
 * own hinge folds in (taken from the body's current trunk direction), so no segment changes length and the legs, the
 * feet and the deck are exactly as the rig left them.
 */
function foldedFurther(body: Posed, extra: number, head: 'carried' | 'upright' = 'carried'): Posed {
  const hips = body.joints.hips;
  const trunk = body.acromion.clone().sub(hips);
  const horizontal = new Vector3(trunk.x, 0, trunk.z);
  // A trunk already dead upright has no fold plane of its own: fold it toward the toes, which is the rig's own way.
  if (horizontal.lengthSq() < 1e-8) horizontal.copy(TOES);
  horizontal.normalize();
  const axis = new Vector3().crossVectors(UP, horizontal).normalize();
  const turn = new Quaternion().setFromAxisAngle(axis, extra * RAD);
  const about = (p: Vector3) => p.clone().sub(hips).applyQuaternion(turn).add(hips);
  const acromion = about(body.acromion);
  // `carried`: the head goes with the chest, chin toward it — the worst case for any head-length denominator.
  // `upright`: the head keeps its own direction and rides along with the shoulders, which is what a rider looking down
  // the line actually does. The two bracket every real posture.
  if (head === 'carried') return { ...body, acromion, crown: about(body.crown), chin: about(body.chin) };
  const shift = acromion.clone().sub(body.acromion);
  return { ...body, acromion, crown: body.crown.clone().add(shift), chin: body.chin.clone().add(shift) };
}
/** Which way the body's trunk leans, as a bearing in the camera's own units (0 the toes' rail, +90 the nose). */
function foldBearing(body: Posed): number {
  const trunk = body.acromion.clone().sub(body.joints.hips);
  return Math.atan2(trunk.dot(NOSE), trunk.dot(TOES)) * DEG;
}

// ───────────────────────────────── the camera, and the pixel grid ─────────────────────────────────
interface Camera {
  /** Bearing from the toes' rail toward the nose, °: 0 side-on from the side the rider faces, ±90 down the line. */
  azimuth: number;
  /** The lens above the rider, °: 0 water level, + raised (the beach lens, the drone). */
  elevation: number;
  distance?: number;
  /** A free camera, overriding the bearing: the positive controls place the lens on a plane's own normal. */
  eye?: Vector3;
  up?: Vector3;
}
interface Film { x: (p: Vector3) => number; y: (p: Vector3) => number; at: (p: Vector3) => [number, number] }

/** A pinhole camera looking at `target`, in normalised image units (y down), with no roll. */
function film(camera: Camera, target: Vector3): Film {
  const distance = camera.distance ?? DIST;
  const horizontal = TOES.clone().multiplyScalar(Math.cos(camera.azimuth * RAD)).addScaledVector(NOSE, Math.sin(camera.azimuth * RAD));
  const eye = camera.eye ?? target.clone()
    .addScaledVector(horizontal, distance * Math.cos(camera.elevation * RAD))
    .addScaledVector(UP, distance * Math.sin(camera.elevation * RAD));
  const forward = target.clone().sub(eye).normalize();
  const world = camera.up ?? UP;
  const right = new Vector3().crossVectors(forward, world).normalize();
  if (!Number.isFinite(right.x)) throw new Error('The camera looks straight up its own up.');
  const up = new Vector3().crossVectors(right, forward).normalize();
  const image = (p: Vector3) => {
    const v = p.clone().sub(eye);
    const z = v.dot(forward);
    if (z <= 1e-6) throw new Error('A landmark is behind the lens.');
    return [v.dot(right) / z, -v.dot(up) / z] as [number, number];
  };
  return { x: (p) => image(p)[0], y: (p) => image(p)[1], at: image };
}

/**
 * A frame: every landmark projected, scaled so the head segment is `heads` px long, rounded to whole pixels, and
 * jittered by ±`jitter` px on each coordinate (the reader's own placement error).
 */
interface Frame { p: (name: keyof Marks) => [number, number] }
interface Marks {
  crown: Vector3; chin: Vector3; acromion: Vector3; waist: Vector3; hips: Vector3; deck: Vector3;
  hipL: Vector3; kneeL: Vector3; ankleL: Vector3; hipR: Vector3; kneeR: Vector3; ankleR: Vector3;
}
function marks(body: Posed): Marks {
  return {
    crown: body.crown, chin: body.chin, acromion: body.acromion, waist: body.waist, hips: body.joints.hips,
    deck: body.feet[0].clone().add(body.feet[1]).multiplyScalar(0.5),
    hipL: body.joints.hip.left, kneeL: body.joints.knee.left, ankleL: body.joints.ankle.left,
    hipR: body.joints.hip.right, kneeR: body.joints.knee.right, ankleR: body.joints.ankle.right,
  };
}
function frameOf(body: Posed, camera: Camera, heads: number, jitter: number, draw: () => number): Frame {
  const all = marks(body);
  const target = all.hips.clone();
  const lens = film(camera, target);
  const crown = lens.at(all.crown); const chin = lens.at(all.chin);
  const headPx = Math.hypot(crown[0] - chin[0], crown[1] - chin[1]);
  const scale = heads / finite(headPx, 'the projected head length');
  const shake = () => (jitter === 0 ? 0 : Math.round((draw() * 2 - 1) * jitter));
  const cache = new Map<string, [number, number]>();
  return {
    p: (name) => {
      const got = cache.get(name);
      if (got) return got;
      const [x, y] = lens.at(all[name]);
      const point: [number, number] = [Math.round(x * scale) + shake(), Math.round(y * scale) + shake()];
      cache.set(name, point);
      return point;
    },
  };
}
const span = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);

// ───────────────────────────────── the rulers, each exactly as the clips compute it ─────────────────────────────────
/** R1: `|hip→ankle| ÷ (|hip→knee| + |knee→ankle|)`, as a percentage. */
function legChain(frame: Frame, side: 'L' | 'R'): number {
  const hip = frame.p(`hip${side}` as keyof Marks); const knee = frame.p(`knee${side}` as keyof Marks); const ankle = frame.p(`ankle${side}` as keyof Marks);
  const chain = span(hip, knee) + span(knee, ankle);
  return finite((100 * span(hip, ankle)) / chain, `the leg chain (${side})`);
}
/** R2: the projected thigh ÷ shin. */
function thighShin(frame: Frame, side: 'L' | 'R'): number {
  const hip = frame.p(`hip${side}` as keyof Marks); const knee = frame.p(`knee${side}` as keyof Marks); const ankle = frame.p(`ankle${side}` as keyof Marks);
  return finite(span(hip, knee) / span(knee, ankle), `the thigh/shin ratio (${side})`);
}
/** R3: the projected acromion→waistband ÷ head length. `waist: 'hip'` uses the hip joints, `'shorts'` the 0.60 line. */
function trunkGate(frame: Frame, waist: 'hip' | 'shorts'): number {
  const head = span(frame.p('crown'), frame.p('chin'));
  return finite(span(frame.p('acromion'), frame.p(waist === 'hip' ? 'hips' : 'waist')) / head, 'the trunk gate');
}
/** R3a: the projected trunk's angle from the image's vertical, °, as a gridded frame is read. */
function trunkAngle(frame: Frame, waist: 'hip' | 'shorts'): number {
  const top = frame.p('acromion'); const low = frame.p(waist === 'hip' ? 'hips' : 'waist');
  // Image y runs down: the trunk's own up is (top − low) with y negated.
  return finite(Math.abs(Math.atan2(top[0] - low[0], low[1] - top[1])) * DEG, 'the projected trunk angle');
}
/** R5: the hip above the deck, in head-lengths, measured vertically in the image as the clips measure it. */
function hipOverDeck(frame: Frame): number {
  const head = span(frame.p('crown'), frame.p('chin'));
  return finite((frame.p('deck')[1] - frame.p('hips')[1]) / head, 'the hip above the deck');
}
/** R6: apparent stature in head-lengths — the crown above the deck, vertically, over the head's own projected length. */
function statureHeads(frame: Frame): number {
  const head = span(frame.p('crown'), frame.p('chin'));
  return finite((frame.p('deck')[1] - frame.p('crown')[1]) / head, 'the apparent stature');
}

/**
 * The truth for the trunk gate's own segment, in 3D: the angle of `acromion → waistband` from the world's vertical, °,
 * and that segment's length in head-lengths. **It is not `StanceAngles.trunkTilt`**, which is the spine's base to the
 * neck: a ruler must be calibrated against the angle of the segment it actually measures.
 */
function trueTrunk(subject: Subject, body: Posed, waist: 'hip' | 'shorts'): { angle: number; heads: number } {
  const low = waist === 'hip' ? body.joints.hips : body.waist;
  const segment = body.acromion.clone().sub(low);
  return {
    angle: finite(Math.atan2(Math.hypot(segment.x, segment.z), segment.y) * DEG, 'the true trunk angle'),
    heads: segment.length() / subject.headLength,
  };
}

/** The truth, in 3D, from the same joints: the knee's flexion (0 straight), and the 3D leg chain and thigh/shin. */
function trueLeg(body: Posed, side: Side): { flexion: number; chain: number; thighShin: number } {
  const hip = body.joints.hip[side]; const knee = body.joints.knee[side]; const ankle = body.joints.ankle[side];
  const thigh = hip.distanceTo(knee); const shin = knee.distanceTo(ankle);
  return {
    flexion: 180 - (side === 'left' ? body.angles.kneeFront : body.angles.kneeRear),
    chain: (100 * hip.distanceTo(ankle)) / (thigh + shin),
    thighShin: thigh / shin,
  };
}

/** A band of a ruler's values over the Monte Carlo: the clean value, and the 5th–95th of the jittered draws. */
function band(make: (draw: () => number) => number, jitter: number, seed: number): { value: number; low: number; high: number; sd: number } {
  const clean = make(() => 0.5);
  if (jitter === 0) return { value: clean, low: clean, high: clean, sd: 0 };
  const draw = random(seed);
  const values: number[] = [];
  for (let i = 0; i < DRAWS; i += 1) values.push(make(draw));
  return { value: clean, low: qt(values, 0.05), high: qt(values, 0.95), sd: sd(values) };
}

// ───────────────────────────────── the depth ladder: one sweep every experiment reads ─────────────────────────────────
/**
 * The crouch's depth sweep, m: from 0.12 ABOVE the standing pelvis (the legs as straight as the rig will take them)
 * down to Compress's own `CROUCH_DEPTH` (0.3). The game's standing pose is not a straight leg — §0 says how far from
 * one it is — so the sweep has to reach above it to get near the footage's extended frames at all.
 */
const DEPTHS = Array.from({ length: 29 }, (_, i) => -0.12 + (i * 0.42) / 28);
const print = (line: string) => process.stdout.write(`${line}\n`);

function proportions(all: Subject[]): void {
  print('## 0. The subjects — the game\'s own four surfers and the rig tests\' stand-in');
  print('');
  print('| subject | stature m | head length m | thigh m | shin m | thigh/shin (3D, rest) | acromion / stature | hip joints / stature | gate in-plane, hip line | gate in-plane, 0.60 line | knee flexion standing ° (front / rear) |');
  print('|---|---|---|---|---|---|---|---|---|---|---|');
  for (const s of all) {
    const standing = posed(s, 0);
    print(`| ${s.name} | ${f(s.stature, 3)} | ${f(s.headLength, 3)} | ${f(s.thigh, 3)} | ${f(s.shin, 3)} | **${f(s.thigh / s.shin)}** | ${f(s.acromionShare, 3)} | ${f(s.hipShare, 3)} | **${f(trueTrunk(s, standing, 'hip').heads)}** | **${f(trueTrunk(s, standing, 'shorts').heads)}** | ${f(trueLeg(standing, 'left').flexion, 1)} / ${f(trueLeg(standing, 'right').flexion, 1)} |`);
  }
  print('');
  print(`The gate columns are the 3D length of the segment the ruler measures, in the subject's own head-lengths, in the game's standing pose: **the in-plane value the ruler can read at best.** The published band is 1.6–1.8.`);
  print('');
}

/** P1 and P2: the one camera where each ruler is known correct, and whether the pipeline recovers the 3D value. */
function controls(all: Subject[]): void {
  print('## 1. Controls');
  print('');
  print('### 1.1 P1 — the leg chain read from the leg\'s OWN plane (the ruler is correct there by construction)');
  print('');
  print('| subject | heads px | true flexion ° | 3D chain % | projected chain % | error points |');
  print('|---|---|---|---|---|---|');
  const errors: number[] = [];
  for (const s of all) {
    for (const depth of [0, 0.15, 0.3]) {
      const body = posed(s, depth);
      const truth = trueLeg(body, 'left');
      for (const heads of HEADS) {
        // The leg's own plane: the lens on its normal, looking at the knee, with the thigh as the image's up.
        const hip = body.joints.hip.left; const knee = body.joints.knee.left; const ankle = body.joints.ankle.left;
        const normal = new Vector3().crossVectors(hip.clone().sub(knee), ankle.clone().sub(knee)).normalize();
        if (!Number.isFinite(normal.x) || normal.lengthSq() < 0.5) continue; // a straight leg has no plane: P2 covers it
        const eye = body.joints.hips.clone().addScaledVector(normal, DIST);
        const frame = frameOf(body, { azimuth: 0, elevation: 0, eye, up: hip.clone().sub(knee).normalize() }, heads, 0, () => 0.5);
        const got = legChain(frame, 'L');
        errors.push(Math.abs(got - truth.chain));
        if (heads === 90) print(`| ${s.name} | ${heads} | ${f(truth.flexion, 1)} | ${f(truth.chain, 2)} | ${f(got, 2)} | ${f(Math.abs(got - truth.chain), 2)} |`);
      }
    }
  }
  print('');
  print(`**P1 over ${errors.length} readings (5 subjects × 3 depths × 3 head sizes): error ${f(min(errors), 2)}–${f(max(errors), 2)} points, upper-middle ${f(qt(errors, 0.5), 2)}.** A broken pipeline cannot pass this.`);
  print('');
  print('### 1.2 P2 — the trunk angle read from the trunk-and-vertical plane (the ruler is correct there too)');
  print('');
  print('| subject | heads px | true 3D angle of acromion→hip ° | projected ° | error ° |');
  print('|---|---|---|---|---|');
  const tilts: number[] = [];
  for (const s of all) {
    for (const depth of [0, 0.15, 0.3]) {
      const body = posed(s, depth);
      const truth = trueTrunk(s, body, 'hip').angle;
      const trunk = body.acromion.clone().sub(body.joints.hips);
      const normal = new Vector3().crossVectors(trunk, UP).normalize();
      if (normal.lengthSq() < 0.5) continue;
      for (const heads of HEADS) {
        const eye = body.joints.hips.clone().addScaledVector(normal, DIST);
        const frame = frameOf(body, { azimuth: 0, elevation: 0, eye }, heads, 0, () => 0.5);
        const got = trunkAngle(frame, 'hip');
        const error = Math.abs(got - truth);
        tilts.push(error);
        if (heads === 90) print(`| ${s.name} | ${heads} | ${f(truth, 1)} | ${f(got, 1)} | ${f(error, 2)} |`);
      }
    }
  }
  print('');
  print(`**P2 over ${tilts.length} readings: error ${f(min(tilts), 2)}–${f(max(tilts), 2)}°, upper-middle ${f(qt(tilts, 0.5), 2)}°.** The rig's own breathing moves the trunk ${f(min(WOBBLE), 2)}–${f(max(WOBBLE), 2)}° inside a second, which is part of that error and not the ruler's.`);
  print('');
}

/** R1: the mapping from true knee flexion to the projected leg chain, with the pixel noise beside it. */
function r1(all: Subject[]): void {
  print('## 2. R1 — the leg chain against true knee flexion');
  print('');
  for (const azimuth of [0, 45, 90]) {
    print(`### 2.${azimuth === 0 ? 1 : azimuth === 45 ? 2 : 3} Camera: bearing ${azimuth}° (${azimuth === 0 ? 'side-on, the lens on the side the rider faces' : azimuth === 45 ? '45° off the board\'s axis' : 'down the line, off the nose'}), level lens`);
    print('');
    print('| true flexion ° (front) | 3D chain % | projected % @90 px | @40 px | @20 px | ±3 px band @40 px | thigh/shin @40 px |');
    print('|---|---|---|---|---|---|---|');
    const flexions: number[] = []; const chains: number[] = [];
    for (const depth of DEPTHS) {
      const rows = all.map((s) => {
        const body = posed(s, depth);
        const truth = trueLeg(body, 'left');
        const got = HEADS.map((heads) => legChain(frameOf(body, { azimuth, elevation: 0 }, heads, 0, () => 0.5), 'L'));
        const jittered = band((draw) => legChain(frameOf(body, { azimuth, elevation: 0 }, 40, 3, draw), 'L'), 3, 7 + Math.round(depth * 1000));
        const ratio = thighShin(frameOf(body, { azimuth, elevation: 0 }, 40, 0, () => 0.5), 'L');
        return { truth, got, jittered, ratio };
      });
      flexions.push(mean(rows.map((r) => r.truth.flexion)));
      chains.push(mean(rows.map((r) => r.got[2])));
      if (DEPTHS.indexOf(depth) % 2 === 0) {
        print(`| ${f(min(rows.map((r) => r.truth.flexion)), 1)}–${f(max(rows.map((r) => r.truth.flexion)), 1)} | ${f(min(rows.map((r) => r.truth.chain)), 1)}–${f(max(rows.map((r) => r.truth.chain)), 1)} | ${f(min(rows.map((r) => r.got[2])), 1)}–${f(max(rows.map((r) => r.got[2])), 1)} | ${f(min(rows.map((r) => r.got[1])), 1)}–${f(max(rows.map((r) => r.got[1])), 1)} | ${f(min(rows.map((r) => r.got[0])), 1)}–${f(max(rows.map((r) => r.got[0])), 1)} | ${f(min(rows.map((r) => r.jittered.low)), 1)}–${f(max(rows.map((r) => r.jittered.high)), 1)} | ${f(min(rows.map((r) => r.ratio)), 2)}–${f(max(rows.map((r) => r.ratio)), 2)} |`);
      }
    }
    print('');
    print(`**N3, the range guard: the projected chain spans ${f(min(chains), 1)}–${f(max(chains), 1)} % over ${f(min(flexions), 0)}–${f(max(flexions), 0)}° of true flexion** (a broken ruler's range is 0).`);
    // N1: the shuffle.
    const shuffledFlexions = [...flexions];
    const draw = random(99);
    for (let i = shuffledFlexions.length - 1; i > 0; i -= 1) { const j = Math.floor(draw() * (i + 1)); [shuffledFlexions[i], shuffledFlexions[j]] = [shuffledFlexions[j], shuffledFlexions[i]]; }
    print(`**N1, the shuffle: r(chain, true flexion) = ${f(correlation(chains, flexions), 3)}; against the shuffled truths, r = ${f(correlation(chains, shuffledFlexions), 3)}.**`);
    print('');
  }
  // The in-plane inverse, which a reader can apply with a calculator.
  print('### 2.4 The in-plane inverse: `chain = cos(flexion ÷ 2)`');
  print('');
  const deviations: number[] = [];
  for (const s of all) for (const depth of DEPTHS) { const t = trueLeg(posed(s, depth), 'left'); deviations.push(Math.abs(t.chain - 100 * Math.cos((t.flexion / 2) * RAD))); }
  print(`For equal thigh and shin the 3D chain is exactly \`cos(flexion ÷ 2)\`, so **flexion = 2·arccos(chain)**. Checked against the probe's own 3D readings over ${deviations.length} poses (5 subjects × ${DEPTHS.length} depths, thigh/shin 0.89–1.03): deviation **${f(min(deviations), 2)}–${f(max(deviations), 2)} points**, upper-middle ${f(qt(deviations, 0.5), 2)}. So a reader with an admissible frame can invert the chain to a knee angle; §2.1–2.3 say what to do when the frame is not admissible, which is **do not**.`);
  print('');
  // Signed, because "an upper bound" is a claim about the SIGN and the series rests on it.
  print('### 2.4a The sign of the bias — is the chain really an upper bound?');
  print('');
  print('| window | most it OVER-reads the 3D chain, points | most it UNDER-reads, points |');
  print('|---|---|---|');
  for (const [name, bearings] of [
    ['every bearing −90…+90 at 10°', Array.from({ length: 19 }, (_, i) => -90 + i * 10)],
    ['the board-end-on window, |bearing| ≥ 70°', [-90, -80, -70, 70, 80, 90]],
    ['|bearing| ≥ 80° only', [-90, -80, 80, 90]],
    ['|bearing| = 90° only', [-90, 90]],
  ] as const) {
    const excess: number[] = [];
    for (const s of all) for (const depth of DEPTHS) for (const azimuth of bearings) {
      const body = posed(s, depth);
      excess.push(legChain(frameOf(body, { azimuth, elevation: 0 }, 90, 0, () => 0.5), 'L') - trueLeg(body, 'left').chain);
    }
    print(`| ${name} | **+${f(max(excess), 1)}** | **${f(min(excess), 1)}** |`);
  }
  print('');
  // The resolution: the ruler's slope against the pixel noise. This is the number a video reader needs.
  print('### 2.5 ⭐ The resolution — how many degrees of knee flexion the ruler can actually resolve');
  print('');
  print('The slope is fitted over the whole sweep (least squares, 5 subjects × 29 depths). The noise is the 5th–95th');
  print('band of 240 seeded draws of ±jitter px on every landmark, at the deepest pose. The resolution is the flexion');
  print('change the band permits: `noise ÷ |slope|`. **Under that, two frames cannot be told apart.**');
  print('');
  print('| camera | heads px | jitter px | slope, points per ° | noise, points | **resolution, ° of flexion** |');
  print('|---|---|---|---|---|---|');
  for (const azimuth of [0, 30, 45, 60, 90]) {
    const flexions: number[] = []; const chains: number[] = [];
    for (const s of all) {
      for (const depth of DEPTHS) {
        const body = posed(s, depth);
        flexions.push(trueLeg(body, 'left').flexion);
        chains.push(legChain(frameOf(body, { azimuth, elevation: 0 }, 90, 0, () => 0.5), 'L'));
      }
    }
    const slope = (correlation(flexions, chains) * sd(chains)) / sd(flexions);
    for (const heads of HEADS) {
      for (const jitter of JITTER) {
        const noises = all.map((s) => {
          const body = posed(s, 0.3);
          const b = band((draw) => legChain(frameOf(body, { azimuth, elevation: 0 }, heads, jitter, draw), 'L'), jitter, 11);
          // The whole-pixel grid alone is a ±0.5 px placement, which the jitter=0 case must still carry.
          return jitter === 0 ? Math.abs(b.value - legChain(frameOf(body, { azimuth, elevation: 0 }, heads * 8, 0, () => 0.5), 'L')) * 2 : b.high - b.low;
        });
        const noise = max(noises);
        print(`| bearing ${azimuth}° | ${heads} | ±${jitter} | ${f(slope, 3)} | ${f(noise, 2)} | **${f(noise / Math.abs(slope), 1)}°** |`);
      }
    }
  }
  print('');
}

/**
 * The board's own projected shape at a bearing: its length over its width in the image. **It needs no body landmark
 * at all** — a reader measures the nose-to-tail and rail-to-rail spans of the board in the frame — and it is the
 * camera's bearing, read off the one object in the picture whose shape is known.
 */
function boardAspect(camera: Camera, heads: number): number {
  const lens = film(camera, new Vector3(0, 0, 0));
  const deck = (z: number, x = 0) => new Vector3(x, deckAt(z) - BOARD_CENTRE.y, z - BOARD_CENTRE.z);
  const nose = lens.at(deck(BOARD_LENGTH / 2 - 0.02));
  const tail = lens.at(deck(-BOARD_LENGTH / 2 + 0.02));
  const left = lens.at(deck(0, railHalfWidth(0)));
  const right = lens.at(deck(0, -railHalfWidth(0)));
  const round = (p: [number, number]): [number, number] => [Math.round(p[0] * heads), Math.round(p[1] * heads)];
  return finite(span(round(nose), round(tail)) / Math.max(1, span(round(left), round(right))), 'the board\'s aspect');
}

/** R2: does the 1.0–1.1 band admit in-plane legs and reject out-of-plane ones? */
function r2(all: Subject[]): void {
  print('## 3. R2 — the thigh/shin admissibility test, swept over the leg\'s bearing to the lens');
  print('');
  print('The last column is the replacement gate this probe proposes: **the BOARD\'s own projected length ÷ width**,');
  print('which needs no body landmark and is the camera\'s bearing read off the one object in the frame whose true');
  print('shape is known. The board here is the game\'s own (`boardShape`): 1.78 m long, 0.42 m at its widest, so its');
  print('true aspect is 4.2.');
  print('');
  for (const depth of [0.3, 0.15]) {
    const flexion = f(mean(all.map((s) => trueLeg(posed(s, depth), 'left').flexion)), 0);
    print(`### 3.${depth === 0.3 ? 1 : 2} At ${flexion}° of true front-knee flexion`);
    print('');
    print('| bearing ° | projected thigh/shin | in 1.0–1.1? | chain error vs 3D, points | the chain it would read % | board aspect (true 4.2) |');
    print('|---|---|---|---|---|---|');
    const rows: { azimuth: number; ratio: number; error: number; published: boolean }[] = [];
    for (let azimuth = -90; azimuth <= 90; azimuth += 10) {
      const got = all.map((s) => {
        const body = posed(s, depth);
        const frame = frameOf(body, { azimuth, elevation: 0 }, 40, 0, () => 0.5);
        const truth = trueLeg(body, 'left');
        const ratio = thighShin(frame, 'L');
        const chain = legChain(frame, 'L');
        return { ratio, chain, error: Math.abs(chain - truth.chain) };
      });
      const ratios = got.map((g) => g.ratio); const errors = got.map((g) => g.error);
      const published = ratios.some((r) => r >= 1.0 && r <= 1.1);
      print(`| ${azimuth} | ${f(min(ratios))}–${f(max(ratios))} | ${published ? '**yes**' : 'no'} | ${f(min(errors), 1)}–${f(max(errors), 1)} | ${f(min(got.map((g) => g.chain)), 1)}–${f(max(got.map((g) => g.chain)), 1)} | ${f(boardAspect({ azimuth, elevation: 0 }, 400), 2)} |`);
      rows.push({ azimuth, ratio: mean(ratios), error: mean(errors), published });
    }
    print('');
    const accurate = (r: typeof rows[number]) => r.error <= 2;
    const admitted = rows.filter((r) => r.published);
    const falseAccept = admitted.filter((r) => !accurate(r));
    const falseReject = rows.filter((r) => !r.published && accurate(r));
    print(`**Of ${rows.length} bearings at ${flexion}° of flexion, the published 1.0–1.1 band admits ${admitted.length} and refuses ${rows.length - admitted.length}.**`);
    print(`**False accepts (admitted with the chain more than 2 points off): ${falseAccept.length} of ${admitted.length}, at bearings ${falseAccept.map((r) => r.azimuth).join(', ') || 'none'}.**`);
    print(`**False rejects (refused though the chain is within 2 points): ${falseReject.length} of ${rows.length - admitted.length}, at bearings ${falseReject.map((r) => r.azimuth).join(', ') || 'none'}.**`);
    print(`**The bearings where the chain is within 2 points: ${rows.filter(accurate).map((r) => r.azimuth).join(', ')}. Where it is more than 10 points out: ${rows.filter((r) => r.error > 10).map((r) => r.azimuth).join(', ')}.**`);
    print('');
  }
  // The dead bearing, found to the degree: where the leg projects straight whatever the knee does.
  print('### 3.3 ☠️ The dead bearing — where the chain reads 100 % at every flexion');
  print('');
  // Why it is where it is, stated so a reader can transfer it to a real rider: the dead bearing is the direction the
  // KNEE itself is displaced in — which is visible in any frame as "where the knees point".
  print('| subject | the knee\'s own bend bearing ° (deep crouch) | the same, standing | the trunk\'s lean bearing ° (deep) |');
  print('|---|---|---|---|');
  for (const s of all) {
    const bend = (depth: number) => {
      const body = posed(s, depth);
      const hip = body.joints.hip.left; const knee = body.joints.knee.left; const ankle = body.joints.ankle.left;
      const line = ankle.clone().sub(hip).normalize();
      const offset = knee.clone().sub(hip);
      offset.addScaledVector(line, -offset.dot(line));
      return Math.atan2(offset.dot(NOSE), offset.dot(TOES)) * DEG;
    };
    print(`| ${s.name} | **${f(bend(0.3), 0)}** | ${f(bend(0), 0)} | ${f(foldBearing(posed(s, 0.3)), 0)} |`);
  }
  print('');
  print('**The dead bearing is the direction the knee itself is displaced in** — so it is not a property of this rig in');
  print('particular, it is wherever a given rider\'s knees point. A reader can see that in the frame.');
  print('');
  print('| bearing ° | chain at 24° of flexion % | at 86° % | at 99° % | **the whole sweep\'s range, points** |');
  print('|---|---|---|---|---|');
  for (let azimuth = 10; azimuth <= 45; azimuth += 5) {
    const row = all.map((s) => DEPTHS.map((depth) => legChain(frameOf(posed(s, depth), { azimuth, elevation: 0 }, 90, 0, () => 0.5), 'L')));
    const flat = row.map((chains) => max(chains) - min(chains));
    const at = (index: number) => all.map((_, i) => row[i][index]);
    print(`| ${azimuth} | ${f(min(at(0)), 1)}–${f(max(at(0)), 1)} | ${f(min(at(24)), 1)}–${f(max(at(24)), 1)} | ${f(min(at(DEPTHS.length - 1)), 1)}–${f(max(at(DEPTHS.length - 1)), 1)} | **${f(min(flat), 1)}–${f(max(flat), 1)}** |`);
  }
  print('');
}

/** R3: the trunk gate — its in-plane value, its yaw sweep, and whether it can tell yaw from proportion. */
function r3(all: Subject[]): void {
  print('## 4. R3 — the trunk gate');
  print('');
  for (const depth of [0, 0.3]) {
    print(`### 4.${depth === 0 ? 1 : 2} ${depth === 0 ? 'The game\'s standing pose' : 'Its deepest crouch (Compress\'s own 0.30 m)'} — the gate and the angle, swept over the bearing`);
    print('');
    print('| bearing ° | gate, hip line | gate, 0.60 line | projected trunk ° | true 3D angle ° | error ° |');
    print('|---|---|---|---|---|---|');
    const sweep: { azimuth: number; hip: number; shorts: number; angle: number; truth: number }[] = [];
    for (let azimuth = -90; azimuth <= 90; azimuth += 15) {
      const got = all.map((s) => {
        const body = posed(s, depth);
        const frame = frameOf(body, { azimuth, elevation: 0 }, 90, 0, () => 0.5);
        return { hip: trunkGate(frame, 'hip'), shorts: trunkGate(frame, 'shorts'), angle: trunkAngle(frame, 'hip'), truth: trueTrunk(s, body, 'hip').angle };
      });
      print(`| ${azimuth} | ${f(min(got.map((g) => g.hip)))}–${f(max(got.map((g) => g.hip)))} | ${f(min(got.map((g) => g.shorts)))}–${f(max(got.map((g) => g.shorts)))} | ${f(min(got.map((g) => g.angle)), 1)}–${f(max(got.map((g) => g.angle)), 1)} | ${f(min(got.map((g) => g.truth)), 1)}–${f(max(got.map((g) => g.truth)), 1)} | ${f(min(got.map((g) => Math.abs(g.angle - g.truth))), 1)}–${f(max(got.map((g) => Math.abs(g.angle - g.truth))), 1)} |`);
      sweep.push({ azimuth, hip: mean(got.map((g) => g.hip)), shorts: mean(got.map((g) => g.shorts)), angle: mean(got.map((g) => g.angle)), truth: mean(got.map((g) => g.truth)) });
    }
    print('');
    const level = sweep.find((r) => r.azimuth === 0)!;
    const worst = sweep.reduce((a, b) => (b.hip < a.hip ? b : a));
    const best = sweep.reduce((a, b) => (b.hip > a.hip ? b : a));
    print(`**Bearing 0° reads ${f(level.hip)} (hip line); the sweep runs ${f(worst.hip)} at ${worst.azimuth}° to ${f(best.hip)} at ${best.azimuth}°.** The angle's own error against the 3D truth is in the last column.`);
    print(`**Where the error is smallest: bearing ${sweep.reduce((a, b) => (Math.abs(b.angle - b.truth) < Math.abs(a.angle - a.truth) ? b : a)).azimuth}°. Where it is largest: ${sweep.reduce((a, b) => (Math.abs(b.angle - b.truth) > Math.abs(a.angle - a.truth) ? b : a)).azimuth}°.**`);
    print('');
  }
  // Can the gate tell an out-of-plane trunk from a differently-proportioned one?
  print('### 4.3 The question that decides whether it is a gate at all');
  print('');
  const standing = all.map((s) => posed(s, 0));
  const inPlane = all.map((s, i) => trueTrunk(s, standing[i], 'hip').heads);
  const shortsPlane = all.map((s, i) => trueTrunk(s, standing[i], 'shorts').heads);
  const spread = [...inPlane, ...shortsPlane];
  print(`**The in-plane value is not one number: ${f(min(spread))}–${f(max(spread))} across ${all.length} subjects × 2 garment conventions** (hip line ${f(min(inPlane))}–${f(max(inPlane))}, 0.60 line ${f(min(shortsPlane))}–${f(max(shortsPlane))}).`);
  print('');
  print('| subject | in-plane gate (hip line) | bearing that drops it to 1.6 | bearing that drops it to 1.0 | the TRUE angle error at the 1.6 bearing ° |');
  print('|---|---|---|---|---|');
  for (const [i, s] of all.entries()) {
    const body = standing[i];
    const rows: { azimuth: number; gate: number; error: number }[] = [];
    for (let azimuth = 0; azimuth <= 90; azimuth += 1) {
      const frame = frameOf(body, { azimuth, elevation: 0 }, 90, 0, () => 0.5);
      rows.push({ azimuth, gate: trunkGate(frame, 'hip'), error: Math.abs(trunkAngle(frame, 'hip') - trueTrunk(s, body, 'hip').angle) });
    }
    const to = (value: number) => rows.find((r) => r.gate <= value);
    const at16 = to(1.6);
    print(`| ${s.name} | ${f(inPlane[i])} | ${at16 ? `${at16.azimuth}°` : '**never, to 90°**'} | ${to(1.0) ? `${to(1.0)!.azimuth}°` : '**never, to 90°**'} | ${at16 ? f(at16.error, 1) : '—'} |`);
  }
  print('');
  // One number, two unknowns: the gate's value is the segment's projected length, which the FOLD shortens exactly as
  // the YAW does. So pairs of frames with the same gate can hold wildly different true angles.
  print('### 4.4 ☠️ One number, two unknowns — frames with the SAME gate and different true angles');
  print('');
  print('Every (fold, bearing) pair on `surfer1` whose gate lands within ±0.03 of the value in the first column,');
  print('with a trunk folded from the standing pose by `foldedFurther` (the legs untouched):');
  print('');
  print('| gate reads | pairs found | true 3D angle, ° | the angle the ruler would report ° | **the truth it cannot separate, °** |');
  print('|---|---|---|---|---|');
  const subject = all[0];
  const standingBody = posed(subject, 0);
  const grid: { gate: number; truth: number; read: number }[] = [];
  for (let extra = 0; extra <= 70; extra += 5) {
    const body = foldedFurther(standingBody, extra);
    const truth = trueTrunk(subject, body, 'hip').angle;
    for (let azimuth = -90; azimuth <= 90; azimuth += 5) {
      const frame = frameOf(body, { azimuth, elevation: 0 }, 90, 0, () => 0.5);
      grid.push({ gate: trunkGate(frame, 'hip'), truth, read: trunkAngle(frame, 'hip') });
    }
  }
  for (const value of [1.4, 1.6, 1.8, 2.0, 2.2]) {
    const near = grid.filter((g) => Math.abs(g.gate - value) <= 0.03);
    if (!near.length) { print(`| ${f(value)} | 0 | — | — | — |`); continue; }
    print(`| ${f(value)} | ${near.length} | ${f(min(near.map((g) => g.truth)), 1)}–${f(max(near.map((g) => g.truth)), 1)} | ${f(min(near.map((g) => g.read)), 1)}–${f(max(near.map((g) => g.read)), 1)} | **${f(max(near.map((g) => g.truth)) - min(near.map((g) => g.truth)), 1)}** |`);
  }
  print('');
  print(`Over the whole grid (${grid.length} readings: 15 folds × 37 bearings) the gate itself runs **${f(min(grid.map((g) => g.gate)))}–${f(max(grid.map((g) => g.gate)))}**, so nothing a camera and a fold can do to this body reads above that.`);
  print(`The rig's own trunk leans toward bearing **${f(foldBearing(posed(subject, 0.3)), 0)}°** in this probe's units, which is why the dead bearings of §2 and §4 are the same ones.`);
  print('');
}

/** R4 ⭐ THE SPAN CLAIM: a fixed lean, swivelled, and what it manufactures. */
function r4(all: Subject[]): void {
  print('## 5. R4 ⭐ The span claim — a FIXED lean, swivelled through yaw');
  print('');
  print('A pose is solved once and then the SAME 3D body is viewed from every bearing. Zero anatomical flexion happens');
  print('between the readings, by construction: the joints do not move at all. Anything the apparent angle does is');
  print('manufactured by the projection.');
  print('');
  print('| subject | true tilt ° | apparent ° @ bearing 0 | min | max | **range manufactured °** | over ±30° of yaw | over ±45° |');
  print('|---|---|---|---|---|---|---|---|');
  for (const s of all) {
    for (const depth of [0.15, 0.3]) {
      const body = posed(s, depth);
      const truth = trueTrunk(s, body, 'hip').angle;
      const all90: { azimuth: number; angle: number }[] = [];
      for (let azimuth = -90; azimuth <= 90; azimuth += 5) all90.push({ azimuth, angle: trunkAngle(frameOf(body, { azimuth, elevation: 0 }, 90, 0, () => 0.5), 'hip') });
      const angles = all90.map((a) => a.angle);
      const within = (limit: number) => all90.filter((a) => Math.abs(a.azimuth) <= limit).map((a) => a.angle);
      print(`| ${s.name} | ${f(truth, 1)} | ${f(all90.find((a) => a.azimuth === 0)!.angle, 1)} | ${f(min(angles), 1)} | ${f(max(angles), 1)} | **${f(max(angles) - min(angles), 1)}** | ${f(max(within(30)) - min(within(30)), 1)} | ${f(max(within(45)) - min(within(45)), 1)} |`);
    }
  }
  print('');
  // The same with the lens raised, since most clips are raised.
  print('| elevation ° | true tilt ° (5 subjects, 2 depths) | apparent range over ±90° of yaw | over ±45° | over ±30° |');
  print('|---|---|---|---|---|');
  for (const elevation of [0, 10, 20, 30, 45]) {
    const ranges90: number[] = []; const ranges45: number[] = []; const ranges30: number[] = []; const truths: number[] = [];
    for (const s of all) {
      for (const depth of [0.15, 0.3]) {
        const body = posed(s, depth);
        truths.push(trueTrunk(s, body, 'hip').angle);
        const rows: { azimuth: number; angle: number }[] = [];
        for (let azimuth = -90; azimuth <= 90; azimuth += 5) rows.push({ azimuth, angle: trunkAngle(frameOf(body, { azimuth, elevation }, 90, 0, () => 0.5), 'hip') });
        const within = (limit: number) => rows.filter((a) => Math.abs(a.azimuth) <= limit).map((a) => a.angle);
        ranges90.push(max(within(90)) - min(within(90)));
        ranges45.push(max(within(45)) - min(within(45)));
        ranges30.push(max(within(30)) - min(within(30)));
      }
    }
    print(`| ${elevation} | ${f(min(truths), 1)}–${f(max(truths), 1)} | ${f(min(ranges90), 1)}–${f(max(ranges90), 1)} | ${f(min(ranges45), 1)}–${f(max(ranges45), 1)} | ${f(min(ranges30), 1)}–${f(max(ranges30), 1)} |`);
  }
  print('');
  // The premise the span argument itself rests on: "foreshortening only SHRINKS an angle". It does — on a level lens.
  print('### 5.1 The premise under the premise — is a single projected angle even a lower bound?');
  print('');
  print('| elevation ° | most the apparent angle UNDER-reads the truth ° | most it OVER-reads ° | over-reads at all? |');
  print('|---|---|---|---|');
  for (const elevation of [0, 5, 10, 20, 30, 45]) {
    const under: number[] = []; const over: number[] = [];
    for (const s of all) {
      for (const depth of [0.15, 0.3]) {
        const body = posed(s, depth);
        const truth = trueTrunk(s, body, 'hip').angle;
        const excess: number[] = [];
        for (let azimuth = -90; azimuth <= 90; azimuth += 5) excess.push(trunkAngle(frameOf(body, { azimuth, elevation }, 90, 0, () => 0.5), 'hip') - truth);
        under.push(-min(excess));
        over.push(max(excess));
      }
    }
    print(`| ${elevation} | ${f(max(under), 1)} | ${f(max(over), 1)} | ${max(over) > 1 ? '**yes**' : 'no'} |`);
  }
  print('');
  print('A projected angle from vertical is a lower bound on the truth **only while the lens is level**. Raised, it');
  print('over-reads, and the over-reading grows with the elevation — so on a raised lens neither direction is safe.');
  print('');
}

/** R5: hip above the deck ÷ head length, and the stance-width confound at FIXED true knee flexion. */
function r5(all: Subject[]): void {
  print('## 6. R5 — hip above the deck ÷ head length, and the stance-width confound');
  print('');
  print('The stance\'s span is swept with the crouch\'s depth re-solved by bisection so the FRONT KNEE\'S TRUE FLEXION');
  print('is held to within 0.05°. Whatever the ruler then does is a confound, not a depth.');
  print('');
  print('| subject | span m | depth held m | true front flexion ° | true hip over deck m | R5, head-lengths | R5 change from the game\'s own span |');
  print('|---|---|---|---|---|---|---|');
  const moves: number[] = []; const trueMoves: number[] = [];
  for (const s of all) {
    // The game's own span is `stanceFeet`'s, which `pose(…, 0)` reproduces; hold the flexion it reaches at depth 0.2.
    const base = posed(s, 0.2);
    const target = trueLeg(base, 'left').flexion;
    const at0 = hipOverDeck(frameOf(base, { azimuth: 0, elevation: 0 }, 90, 0, () => 0.5));
    for (const widen of [-0.15, 0, 0.15, 0.3]) {
      // Bisect the depth for the same true flexion at this span.
      let low = -0.12; let high = 0.33; let body = base; let depth = 0.2;
      for (let step = 0; step < 22; step += 1) {
        depth = (low + high) / 2;
        body = posed(s, depth, widen);
        if (trueLeg(body, 'left').flexion < target) low = depth; else high = depth;
      }
      const got = trueLeg(body, 'left');
      if (Math.abs(got.flexion - target) > 0.5) { print(`| ${s.name} | ${f(widen + 0.63, 2)} | — | **no depth reaches ${f(target, 1)}° at this span** | — | — | — |`); continue; }
      const r = hipOverDeck(frameOf(body, { azimuth: 0, elevation: 0 }, 90, 0, () => 0.5));
      const trueHip = body.joints.hips.y - (body.feet[0].y + body.feet[1].y) / 2;
      print(`| ${s.name} | ${f(widen + 0.63, 2)} | ${f(depth, 3)} | ${f(got.flexion, 2)} | ${f(trueHip, 3)} | ${f(r)} | ${widen === 0 ? '—' : `${r - at0 >= 0 ? '+' : ''}${f(r - at0)}`} |`);
      if (widen !== 0) { moves.push(r - at0); trueMoves.push(trueHip); }
    }
  }
  print('');
  print(`**R5 moves ${f(min(moves))} to ${f(max(moves))} head-lengths with ZERO change in true knee flexion**, over a stance span swept −0.15 to +0.30 m about the game's own.`);
  print('');
}

/** R6: apparent stature in head-lengths, swept over the lens's elevation. */
function r6(all: Subject[]): void {
  print('## 7. R6 — apparent stature in head-lengths, against the lens\'s elevation');
  print('');
  print('| elevation ° | upright: R6 | folded: R6 | **difference** | true stature over deck, m (upright → folded) | true trunk tilt ° (upright → folded) | ±3 px noise @40 px |');
  print('|---|---|---|---|---|---|---|');
  for (const elevation of [0, 5, 10, 15, 20, 30, 45, 60]) {
    const rows = all.map((s) => {
      const tall = posed(s, 0); const deep = posed(s, 0.3);
      const at = (body: Posed) => statureHeads(frameOf(body, { azimuth: 0, elevation }, 90, 0, () => 0.5));
      const noise = band((draw) => statureHeads(frameOf(deep, { azimuth: 0, elevation }, 40, 3, draw)), 3, 23);
      const deckOf = (body: Posed) => (body.feet[0].y + body.feet[1].y) / 2;
      return {
        tall: at(tall), deep: at(deep), noise: noise.high - noise.low,
        trueTall: tall.crown.y - deckOf(tall), trueDeep: deep.crown.y - deckOf(deep),
        tiltTall: trueTrunk(s, tall, 'hip').angle, tiltDeep: trueTrunk(s, deep, 'hip').angle,
      };
    });
    print(`| ${elevation} | ${f(min(rows.map((r) => r.tall)))}–${f(max(rows.map((r) => r.tall)))} | ${f(min(rows.map((r) => r.deep)))}–${f(max(rows.map((r) => r.deep)))} | **${f(min(rows.map((r) => r.tall - r.deep)))}–${f(max(rows.map((r) => r.tall - r.deep)))}** | ${f(mean(rows.map((r) => r.trueTall)), 3)} → ${f(mean(rows.map((r) => r.trueDeep)), 3)} | ${f(mean(rows.map((r) => r.tiltTall)), 0)} → ${f(mean(rows.map((r) => r.tiltDeep)), 0)} | ±${f(mean(rows.map((r) => r.noise)) / 2)} |`);
  }
  print('');
  print('### 7.2 ⭐ The clips\' own posture: a PURE trunk fold over legs that do not move');
  print('');
  print('§7.1\'s crouch folds the trunk and bends the knees together, because the rig ties them. The clips\' frames are');
  print('a fold over a hip that barely moves, so the fold is applied here by `foldedFurther` — the trunk\'s landmarks');
  print('turned rigidly about the hip joints, the legs, the feet and the deck exactly as the rig left them. **This is');
  print('the test of clips 10 and 11\'s mechanism: does a raised lens turn the fold into a sideways translation and stop');
  print('apparent stature shrinking?**');
  print('');
  print('Two head modes bracket every real posture: **`carried`** turns the head with the chest (chin to chest, the');
  print('worst case for a head-length denominator) and **`upright`** keeps the head\'s own direction and rides it along');
  print('with the shoulders, which is what a rider looking down the line does.');
  print('');
  for (const head of ['upright', 'carried'] as const) {
    print(`#### Head ${head}`);
    print('');
    print('| elevation ° | bearing ° | R6 at 0° of extra fold | at 45° | **shrink, head-lengths** | R5 at 0° | R5 at 45° | R5\'s own move |');
    print('|---|---|---|---|---|---|---|---|');
    const folds: { elevation: number; azimuth: number; shrink: number; hip: number }[] = [];
    for (const elevation of [0, 10, 20, 30, 45, 60]) {
      for (const azimuth of [0, 45, 90, -45]) {
        const rows = all.map((s) => {
          const flat = posed(s, 0);
          const bent = foldedFurther(flat, 45, head);
          const at = (body: Posed) => frameOf(body, { azimuth, elevation }, 90, 0, () => 0.5);
          return { tall: statureHeads(at(flat)), fold: statureHeads(at(bent)), hipTall: hipOverDeck(at(flat)), hipFold: hipOverDeck(at(bent)) };
        });
        const shrink = mean(rows.map((r) => r.tall - r.fold));
        print(`| ${elevation} | ${azimuth} | ${f(min(rows.map((r) => r.tall)))}–${f(max(rows.map((r) => r.tall)))} | ${f(min(rows.map((r) => r.fold)))}–${f(max(rows.map((r) => r.fold)))} | **${f(min(rows.map((r) => r.tall - r.fold)))}–${f(max(rows.map((r) => r.tall - r.fold)))}** | ${f(min(rows.map((r) => r.hipTall)))}–${f(max(rows.map((r) => r.hipTall)))} | ${f(min(rows.map((r) => r.hipFold)))}–${f(max(rows.map((r) => r.hipFold)))} | ${f(min(rows.map((r) => r.hipFold - r.hipTall)))}–${f(max(rows.map((r) => r.hipFold - r.hipTall)))} |`);
        folds.push({ elevation, azimuth, shrink, hip: mean(rows.map((r) => r.hipFold - r.hipTall)) });
      }
    }
    print('');
    const smallest = folds.reduce((a, b) => (Math.abs(b.shrink) < Math.abs(a.shrink) ? b : a));
    print(`**The smallest shrink anywhere in the ${head} sweep is ${f(smallest.shrink)} head-lengths, at elevation ${smallest.elevation}° and bearing ${smallest.azimuth}°** — against a ±3 px reading noise of about ±0.5 at a 40 px head and ±0.2 at 90 px.`);
    print(`**R5's own move under the same pure fold: ${f(min(folds.map((g) => g.hip)))} to ${f(max(folds.map((g) => g.hip)))} head-lengths**, over every elevation and bearing in the table. R5 contains no trunk landmark, so anything it does here is its HEAD denominator moving.`);
    print('');
  }
  // How a MOVING lens cancels a real fold: the elevation at which an upright rider reads what a folded one reads level.
  print('### 7.3 ☠️ Where apparent stature really dies: a lens that CHANGES elevation between the two frames');
  print('');
  print('| subject | R6 upright, level | R6 after a 45° fold, level | the elevation at which the UPRIGHT body reads the folded value | ');
  print('|---|---|---|---|');
  const cancels: number[] = [];
  for (const s of all) {
    const flat = posed(s, 0);
    const bent = foldedFurther(flat, 45, 'upright');
    const level = statureHeads(frameOf(flat, { azimuth: 0, elevation: 0 }, 90, 0, () => 0.5));
    const target = statureHeads(frameOf(bent, { azimuth: 0, elevation: 0 }, 90, 0, () => 0.5));
    let found = Number.NaN;
    for (let elevation = 0; elevation <= 80; elevation += 1) {
      if (statureHeads(frameOf(flat, { azimuth: 0, elevation }, 90, 0, () => 0.5)) <= target) { found = elevation; break; }
    }
    if (Number.isFinite(found)) cancels.push(found);
    print(`| ${s.name} | ${f(level)} | ${f(target)} | ${Number.isFinite(found) ? `**${found}°**` : 'never, to 80°'} |`);
  }
  print('');
  print(`**An elevation change of ${f(min(cancels), 0)}–${f(max(cancels), 0)}° cancels a 45° fold exactly.** That is the ruler's real failure mode: not a raised lens, but a lens whose height CHANGES between the two frames being compared — a drone, a pan, a zoom that re-frames.`);
  print('');
}

/** The camera-distance sensitivity: a long lens is near-orthographic, and the clips are long lenses. */
function distances(all: Subject[]): void {
  print('## 8. The lens\'s distance — how much of any of this is perspective');
  print('');
  print('| distance m | R1 @ deep crouch, side-on | R3 in-plane | R6 upright, level | R6 upright, 20° raised |');
  print('|---|---|---|---|---|');
  for (const distance of [8, 20, 60, 200]) {
    const rows = all.map((s) => {
      const deep = posed(s, 0.3); const tall = posed(s, 0);
      return {
        chain: legChain(frameOf(deep, { azimuth: 0, elevation: 0, distance }, 90, 0, () => 0.5), 'L'),
        gate: trunkGate(frameOf(tall, { azimuth: 0, elevation: 0, distance }, 90, 0, () => 0.5), 'hip'),
        level: statureHeads(frameOf(tall, { azimuth: 0, elevation: 0, distance }, 90, 0, () => 0.5)),
        raised: statureHeads(frameOf(tall, { azimuth: 0, elevation: 20, distance }, 90, 0, () => 0.5)),
      };
    });
    print(`| ${distance} | ${f(min(rows.map((r) => r.chain)), 1)}–${f(max(rows.map((r) => r.chain)), 1)} | ${f(min(rows.map((r) => r.gate)))}–${f(max(rows.map((r) => r.gate)))} | ${f(min(rows.map((r) => r.level)))}–${f(max(rows.map((r) => r.level)))} | ${f(min(rows.map((r) => r.raised)))}–${f(max(rows.map((r) => r.raised)))} |`);
  }
  print('');
}

const all = subjects();
print('# The rulers, calibrated on the game\'s own rider');
print('');
print(`Subjects: ${all.map((s) => s.name).join(', ')}. Camera distance ${DIST} m unless stated; every landmark rounded to a whole pixel on a grid where the projected head is 20, 40 or 90 px; the jittered bands are ${DRAWS} seeded draws of ±1 or ±3 px per coordinate. \`qt(v, 0.5)\` here is this codebase's own: the UPPER middle element.`);
print('');
proportions(all);
controls(all);
r1(all);
r2(all);
r3(all);
r4(all);
r5(all);
r6(all);
distances(all);
