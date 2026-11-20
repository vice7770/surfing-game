/**
 * Step 3.2w: **why the new rider falls standing still.**
 *
 * Step 3.2v's control (`turnpath.ts`, `RIDER=new STEERS=0`) measured the one thing this round is for: the new rider
 * falls **12 of 12** riding in trim with the stick never touched, on the Canyon-matched `FaceWater` the old rider rides
 * **0 of 12** on. Its trace said the body's bank runs 8.8 → 60.7° monotonically with the board's roll following the
 * other way, the board tracking inside 3.2° of straight and the feet keeping 91 % of their grip. It could not say
 * **which link of the roll loop** does that, because every link between the senses and the ankle is private.
 *
 * This probe reads them. Same harness as `turnpath.ts`'s trim cell — the same `FaceWater` (1.4 m, 2.6 m deep, 16°,
 * 5.7 m/s), the same placement 45° off the fall line AHEAD of the crest, the same `water.advance(STEP)`, the stick at
 * zero throughout — and traces, every frame, the roll loop **link by link** off the live instance (private to
 * TypeScript, present at run time):
 *
 * - **the body's bank** (`bank.angle`) and its rate, and **the board's roll about the heading from the world's level**,
 *   which is the angle the ankle actually spans (`prepareBank`'s own `roll`), plus the **rail** angle against the
 *   water's own normal, which is what the hull feels. 3.2v traced the rail and called it the roll; they are not the
 *   same number on a 16° face and the difference is the face's slope.
 * - **the ankle's own span** `bank.angle − roll − ankleRest`, the angle HUMAN_ANKLE_STIFFNESS acts on. A human ankle
 *   has about ±0.5 rad of travel; this is the number that says whether the model's ankle is inside a body's.
 * - **the commands**: `ankleRest` (the rest the balance sends, through the motor lag), `heldAnkleRaw` (what the
 *   predictor asked for before the feet's reach and the rail's bite clipped it), `ankleTorque`, and the hip's
 *   `swingTorque` with `swing.angle` — so a command that saturates shows as a flat top and a command that is simply
 *   absent shows as a zero.
 * - **the senses the controller is fed**: the load the soles feel (`loadSense`, m/s², adapted), the board's nose-up
 *   pitch rate (`pitchRateSense`), and the feet's load in body weights (`captureLoad`), which is the capture point's
 *   own validity condition.
 * - **the balance's three limits** and the capture point split into its position and velocity terms, as 3.2v's.
 *
 * Variants, each one switch and no code change:
 * - `GAINS=bank,rate,forward` passes `humanGains`, which turns the **predictor off** and runs step 3.2's own delayed
 *   law (`humanBank`) with those gains. `GAINS=0,0.1,0.1` is HUMAN_BANK_*' own values. This is the one knob that tells
 *   a predictor bug from a plant bug: if the body diverges under both laws it is not the controller.
 * - `RATE_SENSE=difference` feeds the controller the bank's change over a substep instead of the canals' absolute rate.
 * - **step 3.2x**: `HIP_GAIN` is `balance.hipCapture`, N·m/m — the hip's gain on the capture point past HIP_SHARE of
 *   the feet's half-width (`HumanBalance.sensedCaptureHip`). `HIP_GAIN=0` is 3.2w's rider, the hip untriggered;
 *   a negative one is the sign check. `ANKLE_RATE` is `balance.ankleRestRate`, rad/s, the rest's slew bound
 *   (`ANKLE_RATE=inf` for 3.2w's unbounded rest). The probe adds the hip's own columns: the trigger signal `capHip`,
 *   the swing's angle and torque (already traced), and the first time the swing torque passes 20 N·m.
 * - `SUBSTEPS`, `YAW_INERTIA`, `FACE`, `DEPTH`, `SIDE`, `AHEAD`, `SECONDS` as the other probes.
 * - `FROZEN=1` holds the stick at zero **and** the wave still (no `water.advance`), to separate the face moving under
 *   the rider from the rider's own loop.
 *
 * **Step 3.2z adds no switch and three ideas**, all columns (`3.2/README.md` Part 24):
 * - **the across-speed, split into the body's half and the base's half.** `CaptureState.speedAcross` is a
 *   DIFFERENCE, and its two halves are not the same claim: a body crossing a base that stays put is a balance
 *   failure, a base sliding out from under a body that stays put is not. The split is taken on the test's own feet
 *   point (`captureFeet`) against the test's own board-frame felt vertical (`captureFelt`), both read off the
 *   instance, and it reconstructs `speedAcross` exactly — `checkAtFall` is the residual and reads 0.0000 m/s.
 * - **the test's own across-speed tolerance**, `velTol = reachAcross × ω₀`: with the weight at the feet's edge this
 *   is the across-speed the fall test tolerates and no more, so it is the number a measured across-speed has to be
 *   compared with before it is compared with a human's. `reachAcross` is rebuilt from `captureStep`'s own expression
 *   because `CaptureState.reach` is whichever direction is further past; `reachCheck` is the proof it agrees.
 * - **the across accelerations**, from the differenced world velocity VECTORS projected after, not the derivative of
 *   a projection onto an axis that rolls 63° at 98 °/s.
 *
 * Three traps these columns set, each one a wrong number this probe printed first (Part 24 §4): the split must be
 * read on a frame BEFORE the separation frame, the tolerance must not be taken from the along reach, and the whole
 * set must be gated on `cap.omega > 0` — the old rider never runs `captureStep`, so unguarded it read a feet
 * across-speed of 277 m/s. On the old rider these columns are NaN by design.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/new-rider/3.2/trimbank.ts -o <scratch>/tb.mjs --format esm --platform node
 *   RIDER=new STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/new.jsonl node <scratch>/tb.mjs
 *   RIDER=old STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/old.jsonl node <scratch>/tb.mjs
 *   RIDER=new STANCES=tall EXTRAS=0 TRACE=<scratch>/t.jsonl node <scratch>/tb.mjs
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { rotorImpulse, stanceRoom } from '../../../../src/physics/humanBalance';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0').split(',').map(Number);
type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall').split(',') as Stance[];
const SECONDS = num('SECONDS', 9);
const SIDE = num('SIDE', -45);
const AHEAD = num('AHEAD', 0.75);
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = num('DEPTH', 2.6);
const FROZEN = process.env.FROZEN === '1';
const GAINS = process.env.GAINS ? process.env.GAINS.split(',').map(Number) : undefined;
/** Step 3.2x: the hip's gain, N·m/m, and the ankle rest's slew bound, rad/s ('inf' for none). Unset leaves the code's own. */
const HIP_GAIN = process.env.HIP_GAIN === undefined ? undefined : Number(process.env.HIP_GAIN);
const ANKLE_RATE = process.env.ANKLE_RATE === undefined ? undefined
  : /^inf/i.test(process.env.ANKLE_RATE) ? Number.POSITIVE_INFINITY : Number(process.env.ANKLE_RATE);
/** Step 3.2x: the share of the deck's own roll the ankle's rest carries, 0-1 (0 is 3.2w's rider, square to the deck). */
const PLUMB = process.env.PLUMB === undefined ? undefined : Number(process.env.PLUMB);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const median = (v: number[]) => {
  const s = sorted(v);
  if (!s.length) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const span = (v: number[], d = 1) => (sorted(v).length ? `${f(sorted(v)[0], d)}–${f(sorted(v)[sorted(v).length - 1], d)}` : '–');
/**
 * Step 3.2z: a column's largest value, ignoring the NaNs. `Math.max(...)` over a column with one NaN in it returns
 * NaN, which `r` then turns into null and `nf` into **zero** — a peak that reads 0.00 beside a median of 3.00. Step
 * 3.2z's first run of the split columns printed exactly that, because their first frame is NaN by construction (no
 * previous velocity to difference, and no `captureFeet` before the first substep). Every peak taken over a column
 * that can hold a NaN goes through here.
 */
const peak = (v: number[]) => {
  const s = sorted(v);
  return s.length ? s[s.length - 1] : Number.NaN;
};

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown, path?: string): void {
  if (path) appendFileSync(path, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** The roll loop's links, read off the instance every frame. */
interface Frame {
  t: number;
  /** °: the body's lean on its feet, the board's roll about the heading from the world's level, and the rail against the water's normal. */
  bank: number;
  roll: number;
  rail: number;
  /** °/s. */
  bankRate: number;
  rollRate: number;
  /** °: the ankle's own span, `bank − roll − ankleRest`, the angle HUMAN_ANKLE_STIFFNESS acts on. */
  ankleSpan: number;
  /** °: the rest commanded (through the motor lag) and what the controller asked for before the clips. */
  ankleRest: number;
  ankleRaw: number;
  /** N·m. */
  ankleTorque: number;
  swingTorque: number;
  /** °. */
  swingAngle: number;
  /** The senses: m/s², rad/s, body weights. */
  loadSense: number;
  pitchRateSense: number;
  captureLoad: number;
  /** The three limits and the capture point's split. */
  margin: number;
  gripLeft: number;
  kneeLeft: number;
  binds: string;
  limit: string;
  past: number;
  /** Step 3.2z: how far past the feet's edge the capture point is ACROSS, m, signed (`CaptureState.pastAcross`): with `past` it says which direction is the binding one. */
  pastAcross: number;
  capAcross: number;
  capPoint: number;
  capSpeedTerm: number;
  /** Step 3.2x: the hip's trigger signal, m — the capture point past HIP_SHARE of the feet's half-width, signed board +x. */
  capHip: number;
  /** The capture point's own terms: ω₀ (1/s), the CoM's height over the feet (m), the felt vertical's tilt across (°),
   * the room the hip can still catch past the edge (m), and the two booleans the fall test is the `&&` of. */
  omega: number;
  comHeight: number;
  tilt: number;
  reach: number;
  beyond: boolean;
  weightPast: boolean;
  /**
   * **Step 3.2z: the across-speed, split into its two halves.** `cap.speedAcross` is the body's velocity relative to
   * the feet, on the board's own +x axis — the quantity the capture point's velocity term is built from, and the
   * quantity Part 22 §6 quoted at a median 1.21 m/s over 636 falls. It is a DIFFERENCE, and the two halves are not
   * the same claim: the body crossing a base that stays put is a human balance failure, and a base sliding out from
   * under a body that stays put is not. These three columns are the halves and the check.
   * - `bodyAcross`: the rider's own world velocity on the board's +x axis, m/s.
   * - `feetAcross`: the board's world velocity **at the very point the test used for the feet** (`captureFeet`,
   *   read off the instance) on the same axis, m/s. The feet are rigidly on the deck, so this is the base's own
   *   across-velocity, roll and slide together.
   * - `relAcross`: their difference, which should reproduce `cap.speedAcross` to the felt vertical's own small
   *   projection (`capture` removes the component along the felt vertical before taking x); the gap is the check.
   */
  bodyAcross: number;
  feetAcross: number;
  relAcross: number;
  /**
   * The across **accelerations**, m/s²: the feet point's and the body's own world-velocity change over the frame,
   * projected on the board's across axis as it is **now**.
   *
   * This is not `d(feetAcross)/dt`, and the difference matters. `feetAcross` is a projection onto an axis that rolls
   * with the board — up to 63° over a run here, at up to 98 °/s — so its time derivative carries a `v · daxis/dt`
   * term that is pure axis rotation and reaches 15 m/s² on its own at this probe's speeds. Differencing the world
   * velocity **vector** first and projecting after leaves only the point's own acceleration. It is still resolved on a
   * turning axis, so it is the lateral acceleration *in the deck's frame at that instant*, which is the frame the
   * capture test works in; it is not a body-fixed component of a world acceleration and is not claimed as one.
   */
  feetAccel: number;
  bodyAccel: number;
  /**
   * **The test's own ACROSS-speed tolerance, m/s** — `reachAcross × omega`. The fall needs the capture point past the
   * feet's edge by more than the room the hip can still catch that way, and the capture point's velocity term across
   * is `speedAcross / omega`, so with the centre of mass exactly at the across edge the test tolerates an across-speed
   * of `reachAcross × omega` and no more. It is the number the measured across-speed has to be compared with before
   * it is compared with a human's.
   *
   * **Why it is reconstructed here and not read off `CaptureState.reach`.** `capture` sets `s.reach` to whichever
   * direction is further past — `pastX >= pastZ ? reachAcross : reachAlong` — so on a frame where the ALONG direction
   * binds, `s.reach` is the hip-in-pitch's reach along the board and multiplying it by ω₀ gives a tolerance for a
   * different axis. Step 3.2z's first table did exactly that and read a tolerance of 1.689 m/s on a run whose across
   * reach was smaller. So `reachAcross` is rebuilt from the same expression `captureStep` uses —
   * `rotorImpulse(human.swingInertia, SWING_TORQUE, hipRange − |swing.angle|) / (mass · height · ω₀)` — off the live
   * instance, with SWING_TORQUE's 200 N·m written in because `AttachedRider` does not export it. `reachCheck` below
   * is the proof it is the same number: on every frame where the across direction is the binding one it must equal
   * `s.reach`, and the probe prints the largest disagreement over the run.
   */
  velTol: number;
  reachAcross: number;
  /** `reachAcross − s.reach` on the frames where across is the binding direction, else NaN: the reconstruction's check. */
  reachCheck: number;
  /**
   * **The old rider's own fall test, read on the new rider** (`AttachedRider.endStep`: the body's position error from
   * its postural target, m, against RECOVERABLE_ERROR = 0.25). The two riders do not share a fall test — standing
   * free it is `human.fallen`, the capture point; otherwise it is this — so this column says whether the new rider
   * would have stayed up under the old rider's test on the same water.
   */
  sway: number;
  /** The board's own motion, for context. */
  speed: number;
  drift: number;
}

interface Inner {
  bankReference?: number;
  leanAsked?: number;
  frictionUsed?: number;
  kneeUsed?: number;
  limit?: string;
  ankleRest?: number;
  ankleTorque?: number;
  swingTorque?: number;
  swing?: { angle: number; rate: number };
  heldAnkleRaw?: number;
  loadSense?: number;
  pitchRateSense?: number;
  captureLoad?: number;
  legLoad?: number;
  bankSpeed?: number;
  legLength?: number;
  sway?: { x: number; y: number; z: number };
  postureError?: number;
  /**
   * Step 3.2z: the feet's world point the capture test used this substep (`AttachedRider.captureFeet`), and the felt
   * vertical it used, already in the board's frame (`AttachedRider.captureFelt`). Both private to TypeScript, present
   * at run time, and both are the test's own values from the latest substep — so the split below is taken in the same
   * place, on the same axis and against the same vertical as the number the test acted on.
   */
  captureFeet?: { x: number; y: number; z: number };
  captureFelt?: { x: number; y: number; z: number };
  /** Step 3.2z: the leg depth the stance holds, m (`AttachedRider.stanceDepth`, a private getter). */
  stanceDepth?: number;
}

function oneRun(st: Stance, extra: number): Record<string, unknown> {
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const px = 0;
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(px, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = (FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody({});
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(GAINS ? { humanGains: { bank: GAINS[0], bankRate: GAINS[1], forward: GAINS[2] } } : {}),
    ...(process.env.RATE_SENSE || process.env.WEIGHTS || process.env.RAIL_CAP || HIP_GAIN !== undefined || ANKLE_RATE !== undefined || PLUMB !== undefined
      ? {
        balance: {
          ...(process.env.RATE_SENSE ? { rateSense: process.env.RATE_SENSE as 'canal' | 'difference' } : {}),
          ...(process.env.WEIGHTS ? { weights: JSON.parse(process.env.WEIGHTS) } : {}),
          ...(process.env.RAIL_CAP ? { railCap: Number(process.env.RAIL_CAP) } : {}),
          ...(HIP_GAIN !== undefined ? { hipCapture: HIP_GAIN } : {}),
          ...(ANKLE_RATE !== undefined ? { ankleRestRate: ANKLE_RATE } : {}),
          ...(PLUMB !== undefined ? { anklePlumb: PLUMB } : {}),
        },
      }
      : {}),
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
    ...(process.env.YAW_INERTIA ? { yawInertiaScale: Number(process.env.YAW_INERTIA) } : {}),
  });
  board.attach(rider);
  stance(rider, st);
  rider.steer = 0;
  const inner = rider as unknown as Inner;
  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const vRel = new Vector3();
  // Step 3.2z: the across-speed's two halves, on the board's own +x axis.
  const feetPoint = new Vector3();
  const feetVel = new Vector3();
  const acrossAxis = new Vector3();
  const feetDelta = new Vector3();
  const bodyDelta = new Vector3();
  const boardInv = new Quaternion();
  const lastFeetVel = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  const lastBodyVel = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let lastBank = Number.NaN;
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    if (!FROZEN) water.advance(STEP);
    board.step(STEP, water);
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    // `prepareBank`'s own two angles, recomputed here: the board's roll about the heading from the world's level
    // (what the ankle spans), and the rail against the water's own normal (what the hull feels).
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    fwd.set(0, 0, 1).applyQuaternion(board.orientation);
    const rollRate = board.angularVelocity.dot(fwd) * DEG;
    const bank = rider.bank.angle * DEG;
    const ankleRest = (inner.ankleRest ?? 0) * DEG;
    vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const cap = rider.human.state;
    const gripLeft = 1 - (inner.frictionUsed ?? 0);
    const kneeLeft = 1 - (inner.kneeUsed ?? 0);
    // Step 3.2z: the across-speed's halves. The board's +x axis in the world is the axis `cap.speedAcross` lives on
    // (`captureStep` rotates both velocities into the board's frame and takes x), and the feet's point is the test's
    // own (`captureFeet`), so the two columns below are the same difference the test takes, in the same place.
    // `capture` works in the board's frame and takes the across component AFTER removing the part along the felt
    // vertical (`vx = velocity.x − (velocity · n) nx`). That removal is not distributive over an arbitrary split, but
    // it IS linear in the velocity, so applying it to each half separately gives two numbers that add back to exactly
    // the test's own `speedAcross`. Taking the raw board-frame x of each half instead disagrees with the test by up to
    // 0.38 m/s here, because the felt vertical is tilted 7–16° across and the velocity along it is several m/s.
    boardInv.copy(board.orientation).invert();
    let bodyAcross = Number.NaN;
    let feetAcross = Number.NaN;
    // **The guard, and it is not cosmetic.** `AttachedRider.endStep` runs `captureStep` only for the free body
    // (`if (free) this.captureStep(...)`), so on the OLD rider `captureFeet` and `captureFelt` are never written and
    // keep their constructed zeros — and `board.velocityAt(the world origin)` on a board tens of metres away and
    // turning reads a velocity of hundreds of m/s. The first run of these columns on `RIDER=old` printed a feet
    // across-speed peak of 277 m/s and a base acceleration of 4750 m/s². `cap.omega` is zero until the capture state
    // is first filled, so it is the one test that says the state is live. On the old rider these three columns and
    // the two accelerations are NaN by design: **the old rider has no capture point, so it has no split.**
    if (cap.omega > 0 && inner.captureFelt) {
      const fx = inner.captureFelt.x;
      const fy = inner.captureFelt.y;
      const fz = inner.captureFelt.z;
      const g = Math.hypot(fx, fy, fz);
      const nx = g > 1e-6 ? fx / g : 0;
      const ny = g > 1e-6 ? fy / g : 1;
      const nz = g > 1e-6 ? fz / g : 0;
      const across = (v: Vector3) => {
        bodyDelta.copy(v).applyQuaternion(boardInv);
        return bodyDelta.x - (bodyDelta.x * nx + bodyDelta.y * ny + bodyDelta.z * nz) * nx;
      };
      bodyAcross = across(rider.velocity);
      if (inner.captureFeet) {
        feetPoint.set(inner.captureFeet.x, inner.captureFeet.y, inner.captureFeet.z);
        feetAcross = across(board.velocityAt(feetPoint, feetVel));
      }
    }
    acrossAxis.set(1, 0, 0).applyQuaternion(board.orientation);
    if (!inner.captureFeet) feetVel.set(Number.NaN, Number.NaN, Number.NaN);
    // The across reach, rebuilt from `captureStep`'s own expression (see `Frame.velTol`). SWING_TORQUE is 200 N·m
    // (`AttachedRider.ts`, not exported). The check compares it with `cap.reach` only where across is the binding
    // direction, which is where `capture` sets `s.reach` to this very quantity.
    const reachAcross = cap.omega > 0
      ? rotorImpulse(rider.human.swingInertia, 200, stanceRoom(inner.stanceDepth ?? 0).hipRange - Math.abs(inner.swing?.angle ?? 0)) / (rider.mass * cap.height * cap.omega)
      : Number.NaN;
    const reachCheck = cap.omega > 0 && Math.abs(cap.pastAcross) >= cap.past - 1e-9 && cap.past > 0 ? reachAcross - cap.reach : Number.NaN;
    // The accelerations: difference the world velocity VECTORS, then project on the axis as it is now, so no part of
    // the axis's own rotation is counted as an acceleration. The first frame has no previous sample and reads NaN.
    const feetAccel = lastFeetVel.x === lastFeetVel.x ? feetDelta.subVectors(feetVel, lastFeetVel).dot(acrossAxis) / STEP : Number.NaN;
    const bodyAccel = lastBodyVel.x === lastBodyVel.x ? bodyDelta.subVectors(rider.velocity, lastBodyVel).dot(acrossAxis) / STEP : Number.NaN;
    lastFeetVel.copy(feetVel);
    lastBodyVel.copy(rider.velocity);
    const frame: Frame = {
      t,
      bank,
      roll,
      rail,
      bankRate: Number.isFinite(lastBank) ? (bank - lastBank) / STEP : Number.NaN,
      rollRate,
      ankleSpan: bank - roll - ankleRest,
      ankleRest,
      ankleRaw: (inner.heldAnkleRaw ?? Number.NaN) * DEG,
      ankleTorque: inner.ankleTorque ?? Number.NaN,
      swingTorque: inner.swingTorque ?? Number.NaN,
      swingAngle: (inner.swing?.angle ?? Number.NaN) * DEG,
      loadSense: inner.loadSense ?? Number.NaN,
      pitchRateSense: inner.pitchRateSense ?? Number.NaN,
      captureLoad: inner.captureLoad ?? Number.NaN,
      margin: cap.margin,
      gripLeft,
      kneeLeft,
      binds: cap.margin <= gripLeft && cap.margin <= kneeLeft ? 'margin' : gripLeft <= kneeLeft ? 'grip' : 'knee',
      limit: inner.limit ?? 'none',
      past: cap.past,
      pastAcross: cap.pastAcross,
      capAcross: cap.across,
      capPoint: cap.pointAcross,
      capSpeedTerm: cap.omega > 0 ? cap.speedAcross / cap.omega : Number.NaN,
      capHip: cap.hipPast,
      omega: cap.omega,
      comHeight: cap.height,
      tilt: cap.tiltAcross * DEG,
      reach: cap.reach,
      beyond: cap.beyond,
      weightPast: cap.weightPast,
      reachAcross,
      reachCheck,
      bodyAcross,
      feetAcross,
      relAcross: bodyAcross - feetAcross,
      feetAccel,
      bodyAccel,
      velTol: reachAcross * cap.omega,
      sway: Math.hypot(inner.sway?.x ?? Number.NaN, inner.sway?.z ?? Number.NaN),
      speed: vRel.length(),
      drift: Math.hypot(vRel.x, vRel.z) > 0.05
        ? Math.atan2(vRel.x * fwd.z - vRel.z * fwd.x, vRel.x * fwd.x + vRel.z * fwd.z) * DEG
        : 0,
    };
    frames.push(frame);
    lastBank = bank;
    if (TRACE) emit({ bar: 'trimbank-frame', rider: RIDER, stance: st, extra, ...frame }, TRACE);
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  const col = (k: keyof Frame) => frames.map((x) => Number(x[k]));
  const abs = (k: keyof Frame) => frames.map((x) => Math.abs(Number(x[k])));
  const last = frames[frames.length - 1];
  /**
   * **Step 3.2z: the frame the split is read on, and why it is not always the last one.** The two halves are read off
   * the live instance AFTER `board.step` returns, and on the frame the rider separates its velocity and the feet's
   * point have already been re-set by the separation, so the halves stop reconstructing the test's own `speedAcross`
   * on exactly that one frame (checked: the gap is 0.0000 on all 97 earlier frames of the trace run and −0.223 on the
   * last). The split is therefore read on the latest frame where the halves still add back to the test's number
   * within 0.01 m/s, and `splitLateBy` says how many frames before the end that was — 1 whenever the run ended in a
   * fall, 0 when it ran out the clock. Every other `...AtFall` column is the last frame's, as in 3.2w–3.2y.
   */
  const consistent = frames.filter((x) => Math.abs(x.relAcross - x.capSpeedTerm * x.omega) < 0.01);
  const split = consistent[consistent.length - 1] ?? last;
  return {
    bar: 'trimbank', rider: RIDER, stance: st, extra, gains: GAINS?.join(',') ?? 'predictor', frozen: FROZEN,
    fell, fellAtS: r(fellAt, 2), frames: frames.length,
    /** The first frame's own numbers: the lean the mount leaves the body with (square to the deck), and the deck's own roll. */
    bank0Deg: r(frames[0]?.bank ?? Number.NaN, 2), roll0Deg: r(frames[0]?.roll ?? Number.NaN, 2),
    /** The body's CoM offset across at the first frame, m, against the feet's own half-width (0.13 m). */
    offset0: r((frames[0]?.comHeight ?? Number.NaN) * Math.sin((frames[0]?.bank ?? Number.NaN) / DEG), 3),
    bankPeakDeg: r(Math.max(...abs('bank')), 1), rollPeakDeg: r(Math.max(...abs('roll')), 1),
    railPeakDeg: r(Math.max(...abs('rail')), 1),
    ankleSpanPeakDeg: r(Math.max(...abs('ankleSpan')), 1), ankleSpanMedianDeg: r(median(abs('ankleSpan')), 1),
    ankleRestPeakDeg: r(Math.max(...abs('ankleRest')), 2), ankleRawPeakDeg: r(Math.max(...abs('ankleRaw')), 2),
    ankleTorquePeak: r(Math.max(...abs('ankleTorque')), 0), ankleTorqueMedian: r(median(abs('ankleTorque')), 0),
    swingTorquePeak: r(Math.max(...abs('swingTorque')), 0), swingAnglePeakDeg: r(Math.max(...abs('swingAngle')), 1),
    /** Step 3.2x: the hip's trigger — its peak signal, m, the first time it opened, s, and the first time the swing passed 20 N·m, s. */
    capHipPeak: r(Math.max(...abs('capHip')), 3),
    hipOpenedAtS: r(frames.find((x) => Math.abs(x.capHip) > 0)?.t ?? Number.NaN, 2),
    hipFiredAtS: r(frames.find((x) => Math.abs(x.swingTorque) > 20)?.t ?? Number.NaN, 2),
    loadSensePeak: r(Math.max(...abs('loadSense')), 2), pitchSensePeak: r(Math.max(...abs('pitchRateSense')), 2),
    captureLoadMedian: r(median(col('captureLoad')), 2),
    marginAtFall: r(last?.margin ?? Number.NaN, 3), bindsAtFall: last?.binds ?? '–', limitAtFall: last?.limit ?? '–',
    pastAtFall: r(last?.past ?? Number.NaN, 3),
    capAtFall: r(last?.capAcross ?? Number.NaN, 3), capPointAtFall: r(last?.capPoint ?? Number.NaN, 3),
    capSpeedAtFall: r(last?.capSpeedTerm ?? Number.NaN, 3),
    driftAtFall: r(last?.drift ?? Number.NaN, 2), speedAtFall: r(last?.speed ?? Number.NaN, 2),
    driftPeakDeg: r(Math.max(...abs('drift')), 1),
    swayPeak: r(Math.max(...abs('sway')), 3), swayAtFall: r(last?.sway ?? Number.NaN, 3),
    /** The frames whose sway passed RECOVERABLE_ERROR: 0 means the old rider's test would not have called this a fall. */
    swayOver: frames.filter((x) => x.sway > 0.25).length,
    omegaMedian: r(median(col('omega')), 2), comHeightMedian: r(median(col('comHeight')), 3),
    tiltPeakDeg: r(Math.max(...abs('tilt')), 1), reachMedian: r(median(col('reach')), 3),
    reachAtFall: r(last?.reach ?? Number.NaN, 3), tiltAtFall: r(last?.tilt ?? Number.NaN, 1),
    omegaAtFall: r(last?.omega ?? Number.NaN, 2),
    /**
     * **Step 3.2z: the across-speed, split.** `relAcrossAtFall` is the difference the capture point's velocity term is
     * built from (the quantity Part 22 §6 quoted at a median 1.21 m/s), and `bodyAcrossAtFall` / `feetAcrossAtFall`
     * are its two halves on the board's own +x axis. `checkAtFall` is `relAcross − capSpeed × ω₀`: the gap between
     * this probe's own difference and the one the test took, which is the felt vertical's projection and should be
     * small. `velTolAtFall` is `reach × ω₀`, the across-speed the test itself tolerates with the weight at the edge.
     */
    bodyAcrossAtFall: r(split?.bodyAcross ?? Number.NaN, 3), feetAcrossAtFall: r(split?.feetAcross ?? Number.NaN, 3),
    relAcrossAtFall: r(split?.relAcross ?? Number.NaN, 3),
    checkAtFall: r((split?.relAcross ?? Number.NaN) - (split?.capSpeedTerm ?? Number.NaN) * (split?.omega ?? Number.NaN), 4),
    splitAtS: r(split?.t ?? Number.NaN, 3), splitLateBy: frames.length - 1 - frames.indexOf(split as Frame),
    /**
     * The capture point's own terms **on the split frame**, so the decomposition is taken on one frame and not across
     * two. Mixing them is a real error and step 3.2z made it once: `capPointAtFall` is the last frame's and
     * `reachAcrossAtFall` the split frame's, and compared with each other they said a run was inside the reach that
     * had already fallen. `pastXAtSplit` is `|capAcross| − 0.13`, which `capture` compares with the across reach.
     */
    capPointAtSplit: r(split?.capPoint ?? Number.NaN, 3), capAcrossAtSplit: r(split?.capAcross ?? Number.NaN, 3),
    pastXAtSplit: r(Math.abs(split?.capAcross ?? Number.NaN) - 0.13, 3),
    beyondAtSplit: split?.beyond ?? null, weightPastAtSplit: split?.weightPast ?? null,
    velTolAtFall: r(split?.velTol ?? Number.NaN, 3), velTolMedian: r(median(col('velTol')), 3),
    reachAcrossAtFall: r(split?.reachAcross ?? Number.NaN, 3),
    /** The reconstruction's own check: the largest |reachAcross − s.reach| over the frames where across binds, m. */
    reachCheckWorst: r(peak(abs('reachCheck')), 6),
    /** How many frames of the run had the ALONG direction further past than the across one — where `s.reach` is not the across reach. */
    alongBoundFrames: frames.filter((x) => x.past > 0 && Math.abs(x.pastAcross) < x.past - 1e-9).length,
    /** The two halves' own peaks and medians over the whole run, m/s: which half carries the across-speed, not just at the fall. */
    bodyAcrossPeak: r(peak(abs('bodyAcross')), 3), feetAcrossPeak: r(peak(abs('feetAcross')), 3),
    relAcrossPeak: r(peak(abs('relAcross')), 3),
    bodyAcrossMedian: r(median(abs('bodyAcross')), 3), feetAcrossMedian: r(median(abs('feetAcross')), 3),
    /**
     * The base's own across-acceleration, m/s², peak and median of the absolute — what the board actually gives the
     * feet to catch the body with, the "move the base of support" mechanism's own delivery on this plant. The body's
     * is beside it. Both are the world-velocity difference projected on the current axis (see `Frame.feetAccel`), not
     * the derivative of the projection.
     *
     * `baseMeanAccel` is the blunter number and the one that does not depend on a frame: the base's across-velocity
     * at the fall over the time to the fall, m/s² — the mean rate the base built its across-speed at. `bodyMeanAccel`
     * is the same for the body, and the two together say by how much the base failed to keep up.
     */
    feetAccelPeak: r(peak(abs('feetAccel')), 2), feetAccelMedian: r(median(abs('feetAccel')), 2),
    bodyAccelPeak: r(peak(abs('bodyAccel')), 2), bodyAccelMedian: r(median(abs('bodyAccel')), 2),
    baseMeanAccel: r(Math.abs((split?.feetAcross ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
    bodyMeanAccel: r(Math.abs((split?.bodyAcross ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
  };
}

const rows: Record<string, unknown>[] = [];
const t0 = Date.now();
for (const st of STANCES) for (const extra of EXTRAS) rows.push(oneRun(st, extra));
for (const row of rows) emit(row, OUT);
const nf = (k: string) => rows.map((x) => Number(x[k]));
/** As `nf`, but a null (never happened) stays NaN instead of becoming 0, so `span` prints '–' and not '0.00–0.00'. */
const nfSome = (k: string) => rows.map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const fellRows = rows.filter((x) => x.fell);
const law = RIDER === 'old' ? "the old rider's own" : GAINS ? `gains ${GAINS.join(',')}` : 'predictor';
console.log(`## trimbank — rider ${RIDER}, law ${law}${FROZEN ? ', wave frozen' : ''}${process.env.WEIGHTS ? ` · weights ${process.env.WEIGHTS}` : ''}`);
console.log(`   ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall · face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s, ${SECONDS} s each`);
console.log(`   fell: ${fellRows.length} of ${rows.length}${fellRows.length ? ` at ${span(fellRows.map((x) => Number(x.fellAtS)), 2)} s` : ''} · bound ${['margin', 'grip', 'knee'].map((k) => `${k} ${fellRows.filter((x) => x.bindsAtFall === k).length}`).join(' · ')}`);
console.log(`   the mount: the body's first-frame lean ${span(nf('bank0Deg'), 2)}° on a deck rolled ${span(nf('roll0Deg'), 2)}° · its CoM ${span(nf('offset0'), 3)} m across, feet's half-width 0.130 m`);
console.log(`   the body's bank peak ${span(nf('bankPeakDeg'))}° · the board's roll peak ${span(nf('rollPeakDeg'))}° · the rail peak ${span(nf('railPeakDeg'))}°`);
console.log(`   the ankle's own span: peak ${span(nf('ankleSpanPeakDeg'))}° · median ${span(nf('ankleSpanMedianDeg'))}° (a human ankle has about ±29°)`);
console.log(`   the commands: rest peak ${span(nf('ankleRestPeakDeg'), 2)}° · raw peak ${span(nf('ankleRawPeakDeg'), 2)}° · ankle torque peak ${span(nf('ankleTorquePeak'), 0)} N·m (median ${span(nf('ankleTorqueMedian'), 0)})`);
console.log(`   the hip: swing torque peak ${span(nf('swingTorquePeak'), 0)} N·m · swing angle peak ${span(nf('swingAnglePeakDeg'))}°`);
console.log(`   the hip's trigger (3.2x): signal peak ${span(nf('capHipPeak'), 3)} m · opened at ${span(nfSome('hipOpenedAtS'), 2)} s (in ${rows.filter((x) => x.hipOpenedAtS !== null).length} of ${rows.length}) · swing passed 20 N·m at ${span(nfSome('hipFiredAtS'), 2)} s (in ${rows.filter((x) => x.hipFiredAtS !== null).length} of ${rows.length})`);
console.log(`   the senses: load ${span(nf('loadSensePeak'), 2)} m/s² · pitch rate ${span(nf('pitchSensePeak'), 2)} rad/s · feet's load median ${span(nf('captureLoadMedian'), 2)} body weights`);
console.log(`   at the fall: margin ${span(nf('marginAtFall'), 3)} · past ${span(nf('pastAtFall'), 3)} m · capture ${span(nf('capAtFall'), 3)} m = lean ${span(nf('capPointAtFall'), 3)} + speed ${span(nf('capSpeedAtFall'), 3)}`);
console.log(`   the capture point's own terms: ω₀ median ${span(nf('omegaMedian'), 2)} 1/s · CoM height ${span(nf('comHeightMedian'), 3)} m · the hip's reach past the edge ${span(nf('reachMedian'), 3)} m (feet's half-width 0.13) · felt tilt peak ${span(nf('tiltPeakDeg'))}°`);
console.log(`   at the fall: ω₀ ${span(nf('omegaAtFall'), 2)} · reach ${span(nf('reachAtFall'), 3)} m · felt tilt ${span(nf('tiltAtFall'))}°`);
console.log(`   STEP 3.2z — the across-speed SPLIT at the fall, m/s: relative ${span(nfSome('relAcrossAtFall'), 3)} = body ${span(nfSome('bodyAcrossAtFall'), 3)} − feet ${span(nfSome('feetAcrossAtFall'), 3)} · read at ${span(nfSome('splitAtS'), 3)} s, ${span(nfSome('splitLateBy'), 0)} frames before the end · reconstructs the test's own difference to ${span(nfSome('checkAtFall'), 4)} m/s`);
console.log(`      over the whole run: |body| peak ${span(nfSome('bodyAcrossPeak'), 3)} (median ${span(nfSome('bodyAcrossMedian'), 3)}) · |feet| peak ${span(nfSome('feetAcrossPeak'), 3)} (median ${span(nfSome('feetAcrossMedian'), 3)}) · |relative| peak ${span(nfSome('relAcrossPeak'), 3)}`);
console.log(`      the base's own across-acceleration, m/s²: peak ${span(nfSome('feetAccelPeak'), 2)} · median ${span(nfSome('feetAccelMedian'), 2)} · the body's peak ${span(nf('bodyAccelPeak'), 2)} · median ${span(nf('bodyAccelMedian'), 2)}`);
console.log(`      the mean rate each built its across-speed at (speed at the fall over the time to it), m/s²: the base ${span(nfSome('baseMeanAccel'), 2)} · the body ${span(nfSome('bodyMeanAccel'), 2)}`);
console.log(`      the TEST's own across-speed tolerance (reach × ω₀), m/s: at the fall ${span(nfSome('velTolAtFall'), 3)} · median ${span(nfSome('velTolMedian'), 3)}`);
console.log(`   the old rider's own test, read on this rider: posture error peak ${span(nf('swayPeak'), 3)} m against RECOVERABLE_ERROR 0.250 · at the fall ${span(nf('swayAtFall'), 3)} m · frames over it ${span(nf('swayOver'), 0)}`);
console.log(`   the board: drift peak ${span(nf('driftPeakDeg'))}° · at the fall ${span(nf('driftAtFall'), 2)}° at ${span(nf('speedAtFall'), 2)} m/s`);
