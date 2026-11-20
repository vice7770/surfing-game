/**
 * Step 3.2y: **the hull's roll restoring, measured under this rider** — and what the old rider's coupling does.
 *
 * Part 21 §1.2 set the new rider's overturning stiffness, m g h = 73 × 9.81 × 0.834 = **597 N·m/rad about the feet**,
 * against **−143 to −227 N·m/rad** of hull. That second number was *read* from `PLANT_SPEEDS`' 7.5 and 8 m/s rows,
 * which are a captive tow of the board with a **rigid point payload on flat still water**, and Part 22 §6 flagged it:
 * nobody has measured the roll spring the board presents while the game's rider stands on it, at the trim condition
 * where it capsizes. This probe measures it.
 *
 * ## The method: a captive roll hold, shown settled where it settles (ruling 29t)
 *
 * The harness is `trimbank.ts`'s cell unchanged — the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s),
 * the board placed AHEAD of the crest and SIDE off the fall line, the entry speed the face's own plus EXTRAS, the
 * stances, `water.advance(STEP)` every frame, the stick at zero. On top of it, **the board's roll is held** each
 * substep, as `roll-plant/plant.ts`'s `Lab` holds it: the orientation is rewritten to the held roll about the board's
 * own long axis (Euler, q = Qy(ψ) Qx(−θ) Qz(φ), rotation about the composite centre of mass) and the Euler roll rate
 * is set to zero. Heading, pitch and all three translations stay free, as does every other state — the rider's bank,
 * its leg, the water. **Nothing about the game changes**: the hold is an instrument that lives in this file, the way
 * the roll-plant lab's is, and no source file is touched. Ruling 29t's rule — a captive hold's number is not used until
 * the hold is shown settled — is why the quoted numbers come from `WATER=flat` and not from the face: the probe prints
 * a settle ladder for every cell, and on the face the ladder never stops moving because the board drifts off the
 * condition inside a second.
 *
 * With the roll rate zeroed, the roll acceleration the system wants at that angle is read **after** the substep:
 * `ω̇ = φ̇_after / h`, which is the net roll moment divided by the coupled system's effective roll inertia. Zeroing the
 * rate is what makes it a spring measurement and not a spring-plus-damper one.
 *
 * **Signs and datums, which this project has got wrong eight times in two weeks.** Everything this probe prints in
 * degrees or rad/s² is in **the deck's own roll about the heading from the world's level, positive when the board's
 * level-left side goes down** — `trimbank.ts`'s `roll` column, the angle the ankle spans. `rollAccel` is in that same
 * sense (`−φ̇_euler/h`), so a **positive `rollAccel` at a positive `roll` is divergent**: the roll runs away.
 * `rail` is that roll less the water's own normal, the angle the hull feels, as `trimbank.ts` takes it.
 *
 * NOTE: `trimbank.ts`'s own `roll` and `rollRate` columns are in **opposite** senses (its `roll` is
 * `atan2(up·levelLeft, up.y)`, its `rollRate` is `ω · forward`, and those differ by a sign). Parts 21 and 22 only ever
 * quote their absolute peaks, so nothing there turns on it; this probe prints `rollRateTb` and `rollRateSigned` side
 * by side so the reader can see it rather than be told.
 *
 * ## The configurations (`RIDER`)
 *
 * - `new` / `old`: the game's riders, `AttachedRider` attached, as `trimbank.ts` runs them.
 * - `none`: no rider at all — the bare hull, whose roll inertia about its own long axis is exactly
 *   `bodyInertia[8]` (printed), so `rollAccel × I` is a moment in N·m with no calibration.
 * - `rigid`: a 73 kg point payload at `roll-plant/plant.ts`'s own `RIDER_POINT` (0.915 m up, 0.30 m back) — the very
 *   configuration `PLANT_SPEEDS` was measured in, now on this face at this trim instead of flat still water.
 *
 * `UPRIGHT=off` removes the old rider's **counter-roll drive**: `AttachedRider.uprightVelocity` adds a drive velocity
 * of (−ω_x, 0, −ω_z) × offset to the body's carried point, which cancels the board's roll and pitch rates and so holds
 * the old rider's centre of mass where it is in the world as the deck rolls under it. The new rider returns early from
 * that same function (`if (this.freeBody) return out`), so `UPRIGHT=off` on the old rider is **exactly the new
 * rider's own coupling**, with nothing else changed. The switch is a one-line patch applied here, to the instance.
 *
 * ## The modes
 *
 * - `MODE=moment` (**the one the numbers come from**): the hull's roll MOMENT, N·m, about the deck under the feet.
 *   `ω̇` on its own is not a moment — `ω̇ = M / (I_dry + I_water)`, and the water's own added roll inertia is applied
 *   implicitly INSIDE the solve, so no impulse applied before a substep can measure it. `PAYLOAD_SPREAD=0,0.1,...`
 *   splits the rigid payload into two halves at x = ±s, which leaves the mass, the centre of mass and so the whole
 *   attitude, draft and velocity identical while raising the dry roll inertia by 2 × (m/2) s². Then
 *   `1/ω̇ = (I_dry + I_water)/M` is a straight line in `I_dry` whose slope is 1/M and whose intercept is I_water/M;
 *   the probe fits it, prints M, `K = M/roll`, `I_water` and the fit's R², and prints the five drafts beside every row
 *   so the reader can see the condition did not move. A negative `I_water` means the cell is invalid (it moved).
 * - `MODE=hold`: the roll ladder in `rollAccel` alone, rad/s², with the settle ladder beside it.
 * - `MODE=inertia`: the same with a steady lateral force `PUSH` N at `PUSH_AT` (board frame, y) each substep. This
 *   measures the DRY effective inertia and nothing more, for the method's zero check: `AIR=<m>` (face harness only)
 *   raises the placement clear of the water, where `I = ΔM/Δω̇` must come back as `1/(f · I⁻¹ · f)` exactly.
 * - `MODE=free`: no hold at all. `trimbank.ts`'s own runs, with the body's bank, the board's roll, the side force and
 *   the board's roll per degree of body bank, and least-squares fits of `rollAccel` and `bankAccel` on their own angle
 *   and rate. **Those two fits are not identifiable** — the board's roll tracks the body's bank at 0.94, so the
 *   regressors are collinear — and Part 23 §6 says so rather than quoting them.
 *
 * ## The water, the tow, and what else can be held
 *
 * - `WATER=face` (default) is `trimbank.ts`'s Canyon-matched `FaceWater`, where the capsize happens and where **the
 *   hold does not settle**: the board leaves the condition inside a second. `WATER=flat` is still water at y = 0 with
 *   a level placement, the condition `PLANT_SPEEDS` was measured in, where it settles exactly and antisymmetrically.
 * - `TOW=<m/s>` holds the centre's horizontal speed each substep, as the captive tables' tow does.
 * - `HOLD_FROM` / `HOLD_RAMP`: the hold engages at HOLD_FROM s and ramps to its target over HOLD_RAMP s, so a rider
 *   is not slammed to the angle on the first frame. `SETTLE` / `WINDOW`: the window, after the ramp closes.
 * - `HOLD_YAW` / `HOLD_SLIP` hold the heading's rate and the path's angle as `roll-plant/plant.probe.ts`'s captive
 *   derivatives do. Left unset they are FREE, which is what the board does under a rider.
 * - `SUBSTEPS` sets the board's own substep count (its default is 4; every quoted cell here is 64, and the ladder from
 *   4 to 1024 is in `results/32y/checks-32y.txt` §2).
 * - `PAYLOAD_Y` puts the rigid payload's centre of mass where it is wanted. **At `PAYLOAD_Y=0.07` the composite centre
 *   of mass sits at the deck, so the hold's own reference point IS the feet** and no moment transfer (which would need
 *   the side force) is involved. That is where every quoted stiffness is taken.
 *
 * Run from the repository's root (the bundle needs `node_modules` beside it):
 *   npx rolldown docs/research/new-rider/3.2/rollspring.ts -o <scratch>/rs.mjs --format esm --platform node
 *   MODE=moment SUBSTEPS=64 PAYLOAD_SPREAD=0,0.1,0.2,0.35,0.5 WATER=flat TOW=7.5 HOLD_FROM=0 HOLD_RAMP=0.3 \
 *     SETTLE=4 WINDOW=1 SECONDS=7 RIDER=rigid PAYLOAD_Y=0.07 ROLLS=1,2,5,10,20,30,45,60 node <scratch>/rs.mjs
 *   MODE=free RIDER=old UPRIGHT=off STANCES=tall,compress EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/rs.mjs
 *   MODE=free RIDER=new UPRIGHT=force STANCES=tall,compress EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/rs.mjs
 *   AIR=30 MODE=inertia RIDER=rigid PAYLOAD_Y=0.07 PUSH_AT=1.0 ROLLS=0 PUSH=0,50,200 \
 *     HOLD_FROM=0 HOLD_RAMP=0 SETTLE=0.03 WINDOW=0.05 SECONDS=1 node <scratch>/rs.mjs
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

/** Flat still water, 3 m deep, surface at y = 0: `roll-plant/plant.ts`'s own `Flat`, copied so this file stands alone. */
class Flat implements SurfWater {
  surfaceAt(): number { return 0; }
  sampleAt(_x: number, _y: number, _z: number, out: WaterSample): WaterSample {
    Object.assign(out, {
      surfaceY: 0, stillDepth: 3, waterDepth: 3, bedY: -3, wet: true, outsideDomain: false, slopeX: 0, slopeZ: 0,
      normalX: 0, normalY: 1, normalZ: 0, flowX: 0, flowY: 0, flowZ: 0, regime: 'profile', breaking: 0, voidFraction: 0,
      bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand',
    });
    return out;
  }
  advance(): void {}
  addReaction(): void {}
}

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);
const list = (name: string, fallback: string) => (process.env[name] ?? fallback).split(',').map(Number);

type RiderKind = 'new' | 'old' | 'none' | 'rigid';
const RIDER = (process.env.RIDER ?? 'new') as RiderKind;
const MODE = (process.env.MODE ?? 'hold') as 'hold' | 'inertia' | 'free' | 'moment';
/** The old rider's counter-roll drive (`uprightVelocity`): 'off' gives it the new rider's own coupling. */
const UPRIGHT = (process.env.UPRIGHT ?? 'on') as 'on' | 'off' | 'force';
const ROLLS = list('ROLLS', '-20,-10,-5,0,5,10,20');
const PUSHES = list('PUSH', '0');
const EXTRAS = list('EXTRAS', '0');
type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall').split(',') as Stance[];
/** The hold engages at HOLD_FROM s (the run is free before it) and ramps to its target over HOLD_RAMP s, so the rider
 *  is not slammed to the angle on its first frame. The window is SETTLE s after the ramp closes, WINDOW s wide. */
const HOLD_FROM = num('HOLD_FROM', 0.2);
const HOLD_RAMP = num('HOLD_RAMP', 0.15);
const SETTLE = num('SETTLE', 0.4);
const WINDOW = num('WINDOW', 0.2);
const SECONDS = num('SECONDS', 9);
const SIDE = num('SIDE', -45);
const AHEAD = num('AHEAD', 0.75);
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = num('DEPTH', 2.6);
const AIR = num('AIR', 0);
/** `flat`: still water at y = 0 and a level placement, as `PLANT_SPEEDS` was measured on, where a hold settles.
 *  `face`: the Canyon-matched `FaceWater` of `trimbank.ts`'s own cell, where the capsize happens. */
const WATER = (process.env.WATER ?? 'face') as 'face' | 'flat';
/** The tow: the centre's horizontal speed held at this each substep, m/s (0: free, the board's own drag slows it). */
const TOW = num('TOW', 0);
/** Held with the roll, as `roll-plant/plant.probe.ts`'s captive derivatives are: the heading's rate, rad/s, and the
 *  path's angle to the heading in the level plane, °. Unset leaves them FREE, which is what the board does under a
 *  rider — it slides and turns rather than righting, and that is the difference between the two derivatives (§). */
const HOLD_YAW = process.env.HOLD_YAW === undefined ? undefined : Number(process.env.HOLD_YAW);
const HOLD_SLIP = process.env.HOLD_SLIP === undefined ? undefined : Number(process.env.HOLD_SLIP);
const FLAT_PITCH = num('FLAT_PITCH', 8);
const FLAT_DRAFT = num('FLAT_DRAFT', 0.08);
/** The settle ladder's right-hand edges, s: `rollAccel` is averaged over the LADDER_WIDTH s ending at each. */
const LADDER = (process.env.LADDER ?? '0.25,0.5,0.75,1,1.5,2,3').split(',').map(Number);
const LADDER_WIDTH = num('LADDER_WIDTH', 0.25);
/** The payload a `rigid` run carries: `roll-plant/plant.ts`'s own RIDER_POINT and 73 kg. */
const PAYLOAD = { mass: num('PAYLOAD_MASS', 73), point: { x: 0, y: num('PAYLOAD_Y', 0.915), z: num('PAYLOAD_Z', -0.30) } };
/**
 * `PAYLOAD_SPREAD` splits the rigid payload into two halves at x = ±s, which leaves the mass, the centre of mass and
 * so the whole hydrodynamic condition **identical** and raises the dry roll inertia by 2 × (m/2) s². That is the only
 * honest way to get a moment out of this probe: ω̇ = M / (I_dry + I_water), and the water's own added roll inertia is
 * implicit inside the solve, so no impulse applied before a substep can measure it. Two or more spreads give
 * 1/ω̇ = (I_dry + I_water)/M — a straight line in I_dry whose slope is 1/M and whose intercept is I_water/M.
 */
const SPREADS = list('PAYLOAD_SPREAD', '0');
const payloadsAt = (spread: number) => (spread > 0
  ? [{ mass: PAYLOAD.mass / 2, point: { ...PAYLOAD.point, x: spread } }, { mass: PAYLOAD.mass / 2, point: { ...PAYLOAD.point, x: -spread } }]
  : [PAYLOAD]);
/** The deck point a push acts at, board frame (`rail-dig/settled.probe.ts`'s DECK). */
const DECK = { x: 0, y: 0.07, z: -0.30 };
/** The push's own point, board frame: the deck by default. Raised (`PUSH_AT`, m) it gives a roll arm against a
 *  centre of mass that sits at the deck, which is the only way to calibrate the low-payload cell's inertia. */
const PUSH_AT = { x: 0, y: num('PUSH_AT', DECK.y), z: DECK.z };
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const rr = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const median = (v: number[]) => {
  const s = sorted(v);
  if (!s.length) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const mean = (v: number[]) => {
  const s = v.filter(Number.isFinite);
  return s.length ? s.reduce((a, b) => a + b, 0) / s.length : Number.NaN;
};
const span = (v: number[], d = 1) => {
  const s = sorted(v);
  return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–';
};
const quart = (v: number[], d = 3) => {
  const s = sorted(v);
  if (!s.length) return '–';
  const at = (p: number) => s[Math.min(s.length - 1, Math.max(0, Math.round(p * (s.length - 1))))];
  return `${f(at(0.25), d)} / ${f(at(0.5), d)} / ${f(at(0.75), d)}`;
};

/** The least-squares slope of y on x through a cloud of pairs (no intercept constraint). */
function slope(pts: [number, number][]): number {
  const ok = pts.filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1]));
  if (ok.length < 4) return Number.NaN;
  const n = ok.length;
  const mx = ok.reduce((a, q) => a + q[0], 0) / n;
  const my = ok.reduce((a, q) => a + q[1], 0) / n;
  const sxx = ok.reduce((a, q) => a + (q[0] - mx) ** 2, 0);
  const sxy = ok.reduce((a, q) => a + (q[0] - mx) * (q[1] - my), 0);
  return sxx > 0 ? sxy / sxx : Number.NaN;
}

function emit(line: unknown, path?: string): void {
  if (path) appendFileSync(path, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

// ---------------------------------------------------------------------------------------------------------------
// The Euler parametrisation of `roll-plant/plant.ts`, copied so this file stands alone: q = Qy(ψ) Qx(−θ) Qz(φ),
// heading ψ (from +z toward +x), pitch θ (nose up +), roll φ (the board's LEFT rail up +).
// ---------------------------------------------------------------------------------------------------------------
function euler(q: Quaternion): { heading: number; pitch: number; roll: number } {
  const fw = new Vector3(0, 0, 1).applyQuaternion(q);
  const heading = Math.atan2(fw.x, fw.z);
  const pitch = Math.asin(Math.max(-1, Math.min(1, fw.y)));
  const base = new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -pitch));
  const rest = base.clone().invert().multiply(q);
  const l = new Vector3(1, 0, 0).applyQuaternion(rest);
  return { heading, pitch, roll: Math.atan2(l.y, l.x) };
}
function fromEuler(heading: number, pitch: number, roll: number): Quaternion {
  return new Quaternion().setFromAxisAngle(new Vector3(0, 1, 0), heading)
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -pitch))
    .multiply(new Quaternion().setFromAxisAngle(new Vector3(0, 0, 1), roll));
}
/** ω = a ŷ + b e₁ + c f (e₁ the level pitch axis, f the board's long axis): the Euler rates (ψ̇, −θ̇, φ̇). */
function eulerRates(q: Quaternion, w: Vector3): { a: number; b: number; c: number; e1: Vector3; f: Vector3 } {
  const { heading } = euler(q);
  const y = new Vector3(0, 1, 0);
  const e1 = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const fw = new Vector3(0, 0, 1).applyQuaternion(q);
  const inv = new Matrix4().makeBasis(y, e1, fw).invert();
  const s = w.clone().applyMatrix4(inv);
  return { a: s.x, b: s.y, c: s.z, e1, f: fw };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

interface Frame {
  t: number;
  /** °, the deck's roll about the heading from the world's level, + the board's level-left side down (`trimbank.ts`'s `roll`). */
  roll: number;
  /** °, that roll less the water's own normal: what the hull feels (`trimbank.ts`'s `rail`). */
  rail: number;
  /** °/s, in the same sense as `roll` above, and `trimbank.ts`'s own column beside it (they are opposite). */
  rollRateSigned: number;
  rollRateTb: number;
  /** rad/s², in the same sense as `roll`: + at a + roll is divergent. */
  rollAccel: number;
  /** °, the body's bank on its feet, its rate (°/s) and its acceleration (rad/s², from the rate's own difference). */
  bank: number;
  bankRate: number;
  bankAccel: number;
  capPoint: number;
  comHeight: number;
  /** N, the water's net side force on the whole body: mass × the centre of mass's acceleration along the board's
   *  own level-left axis (on flat still water gravity is vertical, so nothing else is in it). */
  sideForce: number;
  /** m, the board's deepest patch below the surface, and m/s through the water. */
  draft: number;
  speed: number;
  attached: boolean;
}

interface RunOut extends Record<string, unknown> { frames: Frame[] }

/** `WATER=flat`: the board placed level on still water at the tow's speed, as `roll-plant/plant.ts`'s `Lab.place`. */
function flatPlace(board: BoardBody, speed: number): void {
  const q = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -FLAT_PITCH / DEG);
  board.place(new Vector3(0, -FLAT_DRAFT + board.shape.centerOfMass.y, 0), q, new Vector3(0, 0, speed));
}

function oneRun(st: Stance, extra: number, hold: number | undefined, push: number, spread = 0): RunOut {
  const water: SurfWater & { advance: (dt: number) => void } = WATER === 'flat'
    ? new Flat()
    : new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const board = new BoardBody({
    ...(RIDER === 'rigid' ? { payloads: payloadsAt(spread) } : {}),
    ...(process.env.SUBSTEPS ? { substeps: Number(process.env.SUBSTEPS) } : {}),
  });
  if (WATER === 'flat') {
    flatPlace(board, (TOW || 7.5) + extra);
  } else {
    const face = water as FaceWater;
    const fall = new Vector3(0, 0, 1);
    const px = 0;
    const pz = face.crestZ() + AHEAD * face.front;
    const here = face.sampleAt(px, 50, pz, sample);
    const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
    const entry = (FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra;
    const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
    const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
    const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
    const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
    const left = new Vector3().crossVectors(normal, forward).normalize();
    board.place(
      new Vector3(px, here.surfaceY + AIR, pz).addScaledVector(normal, board.shape.centerOfMass.y),
      new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
      forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
    );
  }
  let rider: AttachedRider | undefined;
  if (RIDER === 'new' || RIDER === 'old') {
    rider = new AttachedRider(board.shape, { phase: 'standing', ...(RIDER === 'new' ? { rider: 'new' as const } : {}) });
    board.attach(rider);
    stance(rider, st);
    rider.steer = 0;
    // The old rider's counter-roll drive, off: exactly the new rider's own early return from `uprightVelocity`.
    // `off`: the old rider loses the counter-roll drive, which leaves him exactly the new rider's own early return
    // from `uprightVelocity`. `force`: the new rider GAINS it, the same expression the old rider's path computes.
    if (UPRIGHT === 'off') (rider as Any).uprightVelocity = (_board: BoardBody, out: Vector3) => out;
    if (UPRIGHT === 'force') {
      const rr2 = rider as Any;
      (rider as Any).uprightVelocity = (bb: BoardBody, out: Vector3) => {
        if (!rr2.upright) return out;
        const offset = new Vector3().addVectors(rr2.carried, bb.centerOfMass).sub(rr2.baseWorld);
        const w = new Vector3(-bb.angularVelocity.x, 0, -bb.angularVelocity.z);
        return out.add(new Vector3().crossVectors(w, offset));
      };
    }
  }

  // ---- the hold, and the push, wrapped round the board's own substep (nothing in src/ changes) ----
  const b = board as Any;
  const original = b.substep.bind(b);
  const axisY = new Vector3(0, 1, 0);
  const pushDir = new Vector3();
  const pushAt = new Vector3();
  const pushArm = new Vector3();
  let accelSum = 0;
  let accelCount = 0;
  let pushMomentSum = 0;
  let held: number | undefined;
  let now = 0;
  b.substep = (h: number, w: SurfWater) => {
    if (hold !== undefined && now >= HOLD_FROM) {
      const q = board.orientation;
      const e = euler(q);
      if (held === undefined) held = e.roll;
      // Ramp from the roll the free run had reached to the target, then hold.
      const share = HOLD_RAMP > 0 ? Math.min(1, (now - HOLD_FROM) / HOLD_RAMP) : 1;
      const target = held + (hold - held) * share;
      q.copy(fromEuler(e.heading, e.pitch, target));
      b.updateRotation();
      const rates = eulerRates(q, board.angularVelocity);
      board.angularVelocity.set(0, 0, 0).addScaledVector(axisY, HOLD_YAW ?? rates.a).addScaledVector(rates.e1, rates.b);
      if (HOLD_SLIP !== undefined) {
        const v = board.velocity;
        const level = Math.hypot(v.x, v.z);
        const dir = euler(q).heading - HOLD_SLIP / DEG;
        v.x = level * Math.sin(dir);
        v.z = level * Math.cos(dir);
      }
      b.syncPosition();
    }
    if (TOW) {
      const v = board.velocity;
      const level = Math.hypot(v.x, v.z);
      if (level > 1e-9) { v.x *= TOW / level; v.z *= TOW / level; }
    }
    if (push !== 0) {
      // A steady lateral force at the deck under the rider, along the board's own left axis.
      pushDir.set(1, 0, 0).applyQuaternion(board.orientation);
      board.toWorld(PUSH_AT, pushAt);
      pushArm.subVectors(pushAt, board.centerOfMass);
      // The roll component of its moment about the centre of mass, in this probe's own (`roll`) sense.
      const m = new Vector3().crossVectors(pushArm, pushDir).multiplyScalar(push)
        .dot(new Vector3(0, 0, 1).applyQuaternion(board.orientation));
      pushMomentSum += -m;
      b.applyImpulse(pushDir.clone().multiplyScalar(push * h), pushAt);
    }
    original(h, w);
    now += h;
    const after = eulerRates(board.orientation, board.angularVelocity);
    if (hold === undefined || now >= HOLD_FROM + HOLD_RAMP) { accelSum += -after.c / h; accelCount += 1; }
  };

  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const vRel = new Vector3();
  const p = new Vector3();
  const frames: Frame[] = [];
  let fellAt = Number.NaN;
  let fellWhy = '';
  let lastLeft = 0;
  let pushMoment = Number.NaN;
  const pushMoments: number[] = [];
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    accelSum = 0;
    accelCount = 0;
    pushMomentSum = 0;
    board.step(STEP, water);
    const rollAccel = accelCount ? accelSum / accelCount : Number.NaN;
    if (accelCount) pushMoments.push(pushMomentSum / accelCount);
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    fwd.set(0, 0, 1).applyQuaternion(board.orientation);
    const rollRateTb = board.angularVelocity.dot(fwd) * DEG;
    vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
    let draft = -Infinity;
    for (const patch of board.shape.patches) { board.toWorld(patch.position, p); draft = Math.max(draft, cen.surfaceY - p.y); }
    const cap = rider?.human.state;
    const frame: Frame = {
      t,
      roll,
      rail,
      rollRateSigned: -rollRateTb,
      rollRateTb,
      rollAccel,
      bank: rider ? rider.bank.angle * DEG : Number.NaN,
      bankRate: rider ? rider.bank.rate * DEG : Number.NaN,
      bankAccel: Number.NaN,
      capPoint: cap?.pointAcross ?? Number.NaN,
      comHeight: cap?.height ?? Number.NaN,
      sideForce: Number.NaN,
      draft,
      speed: vRel.length(),
      attached: rider ? rider.attached : true,
    };
    const prev = frames[frames.length - 1];
    if (prev) frame.bankAccel = ((frame.bankRate - prev.bankRate) / DEG) / STEP;
    // The side force: the centre of mass's acceleration along the board's level-left axis, times the mass.
    side.set(fwd.z, 0, -fwd.x).setY(0).normalize();
    const vLeft = board.velocity.dot(side);
    if (prev) frame.sideForce = ((vLeft - lastLeft) / STEP) * board.mass;
    lastLeft = vLeft;
    frames.push(frame);
    if (TRACE) emit({ bar: 'rollspring-frame', rider: RIDER, upright: UPRIGHT, stance: st, extra, hold: hold === undefined ? null : rr(-hold * DEG, 2), push, ...frame }, TRACE);
    if (rider && !rider.attached) { fellAt = t; fellWhy = String(rider.separation); break; }
    if (MODE !== 'free' && t > (hold === undefined ? SETTLE : HOLD_FROM + HOLD_RAMP + SETTLE) + WINDOW + 1e-9) break;
  }
  pushMoment = mean(pushMoments);

  // The window the number comes from, and the settle ladder beside it.
  const from = hold === undefined ? SETTLE : HOLD_FROM + HOLD_RAMP + SETTLE;
  const inWindow = frames.filter((x) => x.t > from && x.t <= from + WINDOW && x.attached);
  const ladder = LADDER.map((end) => {
    const w = frames.filter((x) => x.t > end - LADDER_WIDTH && x.t <= end && x.attached);
    return w.length ? rr(mean(w.map((x) => x.rollAccel)), 3) : null;
  });

  // MODE=free: the least-squares fit of rollAccel = A roll + B rollRate + C over the run's own frames.
  const fit = (rows: Frame[], of: 'roll' | 'bank' = 'roll'): { A: number; B: number; C: number; n: number } => {
    const rowsOk = rows.filter((x) => Number.isFinite(of === 'roll' ? x.rollAccel : x.bankAccel));
    const n = rowsOk.length;
    if (n < 8) return { A: Number.NaN, B: Number.NaN, C: Number.NaN, n };
    // Normal equations for [angle (rad), rate (rad/s), 1].
    const X = rowsOk.map((x) => (of === 'roll' ? [x.roll / DEG, x.rollRateSigned / DEG, 1] : [x.bank / DEG, x.bankRate / DEG, 1]));
    const y = rowsOk.map((x) => (of === 'roll' ? x.rollAccel : x.bankAccel));
    const M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const v = [0, 0, 0];
    for (let k = 0; k < n; k += 1) {
      for (let i = 0; i < 3; i += 1) {
        v[i] += X[k][i] * y[k];
        for (let j = 0; j < 3; j += 1) M[i][j] += X[k][i] * X[k][j];
      }
    }
    // Gaussian elimination with partial pivoting.
    const a = M.map((row, i) => [...row, v[i]]);
    for (let c = 0; c < 3; c += 1) {
      let best = c;
      for (let rI = c + 1; rI < 3; rI += 1) if (Math.abs(a[rI][c]) > Math.abs(a[best][c])) best = rI;
      [a[c], a[best]] = [a[best], a[c]];
      if (Math.abs(a[c][c]) < 1e-12) return { A: Number.NaN, B: Number.NaN, C: Number.NaN, n };
      for (let rI = 0; rI < 3; rI += 1) {
        if (rI === c) continue;
        const k = a[rI][c] / a[c][c];
        for (let j = c; j < 4; j += 1) a[rI][j] -= k * a[c][j];
      }
    }
    return { A: a[0][3] / a[0][0], B: a[1][3] / a[1][1], C: a[2][3] / a[2][2], n };
  };
  const settled = frames.filter((x) => x.t >= 0.2 && x.attached);
  const all = fit(settled);
  const small = fit(settled.filter((x) => Math.abs(x.rail) <= 20));
  const bankAll = fit(settled, 'bank');
  const bankSmall = fit(settled.filter((x) => Math.abs(x.bank) <= 20), 'bank');

  const I = (board as Any).bodyInertia as number[];
  // The board's OWN effective inertia for a moment about its long axis, 1 / (f · I⁻¹ · f) in the world frame: the
  // quantity a push measures, and not `f · I · f` (which it equals only for a diagonal tensor). The `AIR` zero check
  // has to reproduce this one exactly.
  (board as Any).updateRotation();
  const WI = (board as Any).worldInverseInertia as number[];
  fwd.set(0, 0, 1).applyQuaternion(board.orientation);
  const fv = [fwd.x, fwd.y, fwd.z];
  let fif = 0;
  for (let i = 0; i < 3; i += 1) for (let j = 0; j < 3; j += 1) fif += fv[i] * WI[i * 3 + j] * fv[j];
  return {
    bar: 'rollspring', mode: MODE, rider: RIDER, upright: UPRIGHT, stance: st, extra,
    holdDeg: hold === undefined ? null : rr(-hold * DEG, 2), push, spread,
    frames,
    fellAtS: rr(fellAt, 2), fell: fellWhy, nFrames: frames.length,
    rollDeg: rr(median(inWindow.map((x) => x.roll)), 2),
    railDeg: rr(median(inWindow.map((x) => x.rail)), 2),
    rollAccel: rr(mean(inWindow.map((x) => x.rollAccel)), 3),
    pushMoment: rr(pushMoment, 2),
    bankDeg: rr(median(inWindow.map((x) => x.bank)), 2),
    capPoint: rr(median(inWindow.map((x) => x.capPoint)), 3),
    comHeight: rr(median(inWindow.map((x) => x.comHeight)), 3),
    draft: rr(median(inWindow.map((x) => x.draft)), 3),
    speed: rr(median(inWindow.map((x) => x.speed)), 2),
    sideForce: rr(median(inWindow.map((x) => x.sideForce)), 1),
    ladder,
    rollInertia: rr(I[8], 3),
    rollInertiaEff: rr(1 / fif, 4),
    boardMass: rr(board.mass, 2),
    fitA: rr(all.A, 2), fitB: rr(all.B, 2), fitC: rr(all.C, 2), fitN: all.n,
    smallA: rr(small.A, 2), smallB: rr(small.B, 2), smallC: rr(small.C, 2), smallN: small.n,
    bankA: rr(bankAll.A, 2), bankB: rr(bankAll.B, 2), bankC: rr(bankAll.C, 2), bankN: bankAll.n,
    bankSmallA: rr(bankSmall.A, 2), bankSmallB: rr(bankSmall.B, 2), bankSmallC: rr(bankSmall.C, 2), bankSmallN: bankSmall.n,
    bankPeakDeg: rr(Math.max(...frames.map((x) => Math.abs(x.bank))), 1),
    /** The slope of the board's roll against the body's bank over the run's frames: the series ratio k_a/(k_a − K). */
    rollPerBank: rr(slope(frames.filter((x) => x.attached && x.t >= 0.2).map((x) => [x.bank, x.roll] as [number, number])), 3),
    railPeakDeg: rr(Math.max(...frames.map((x) => Math.abs(x.rail))), 1),
  };
}

const rows: RunOut[] = [];
const t0 = Date.now();
if (MODE === 'free') {
  for (const st of STANCES) for (const extra of EXTRAS) rows.push(oneRun(st, extra, undefined, 0));
} else {
  for (const rollDeg of ROLLS) for (const push of PUSHES) for (const spread of (MODE === 'moment' ? SPREADS : [SPREADS[0]])) for (const st of STANCES) for (const extra of EXTRAS) {
    // The hold is set in the Euler roll, whose sign is the opposite of this probe's `roll` column.
    rows.push(oneRun(st, extra, -rollDeg / DEG, push, spread));
  }
}
for (const row of rows) emit({ ...row, frames: undefined }, OUT);

const I8 = Number(rows[0]?.rollInertia);
console.log(`## rollspring — ${MODE}, rider ${RIDER}${RIDER === 'old' || RIDER === 'new' ? `, counter-roll drive ${UPRIGHT}` : ''}${AIR ? `, placed ${f(AIR, 1)} m up (dry)` : ''}`);
console.log(`   ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall · face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s · board+payload ${f(Number(rows[0]?.boardMass), 2)} kg, its own roll inertia ${f(I8, 3)} kg·m² (effective for a roll moment, 1/(f·I⁻¹·f): ${f(Number(rows[0]?.rollInertiaEff), 4)})`);
console.log(`   datum: every angle is the DECK's roll about the heading from the WORLD's level, + the board's level-left side down; rollAccel is in that same sense, so + at a + roll is DIVERGENT.`);
if (MODE === 'free') {
  console.log(`   fell: ${rows.filter((x) => x.fellAtS !== null).length} of ${rows.length}${rows.some((x) => x.fellAtS !== null) ? ` at ${span(rows.filter((x) => x.fellAtS !== null).map((x) => Number(x.fellAtS)), 2)} s` : ''} · rail peak ${span(rows.map((x) => Number(x.railPeakDeg)))}°`);
  console.log(`   the fit over every frame past 0.2 s (${span(rows.map((x) => Number(x.fitN)), 0)} frames a run): A ${span(rows.map((x) => Number(x.fitA)), 2)} 1/s² · B ${span(rows.map((x) => Number(x.fitB)), 2)} 1/s · C ${span(rows.map((x) => Number(x.fitC)), 2)} rad/s²`);
  console.log(`   the same inside 20° of rail (${span(rows.map((x) => Number(x.smallN)), 0)} frames a run): A ${span(rows.map((x) => Number(x.smallA)), 2)} 1/s² · B ${span(rows.map((x) => Number(x.smallB)), 2)} 1/s · C ${span(rows.map((x) => Number(x.smallC)), 2)} rad/s²`);
  console.log(`   A > 0 is a divergent roll; A × the system's roll inertia is the net roll stiffness, N·m/rad, sign reversed.`);
  console.log(`   the BODY's own fit, bankAccel = A·bank + B·bankRate + C, every frame past 0.2 s (${span(rows.map((x) => Number(x.bankN)), 0)} frames a run):`);
  console.log(`     A ${span(rows.map((x) => Number(x.bankA)), 2)} 1/s² · B ${span(rows.map((x) => Number(x.bankB)), 2)} 1/s · C ${span(rows.map((x) => Number(x.bankC)), 2)} rad/s² · bank peak ${span(rows.map((x) => Number(x.bankPeakDeg)))}°`);
  console.log(`   the same inside 20° of bank (${span(rows.map((x) => Number(x.bankSmallN)), 0)} frames a run): A ${span(rows.map((x) => Number(x.bankSmallA)), 2)} 1/s² · B ${span(rows.map((x) => Number(x.bankSmallB)), 2)} 1/s · C ${span(rows.map((x) => Number(x.bankSmallC)), 2)} rad/s²`);
  console.log(`   A × m h² is the net stiffness the BODY feels about its feet, N·m/rad, sign reversed; the bare inverted pendulum's own A is g/h = ${f(9.81 / Number(median(rows.map((x) => Number(x.comHeight)))), 2)} 1/s² at a CoM height of ${f(Number(median(rows.map((x) => Number(x.comHeight)))), 3)} m.`);
  console.log(`   the board's roll per degree of the body's bank, least squares over each run's frames: ${span(rows.map((x) => Number(x.rollPerBank)), 3)}`);
} else {
  const key = (x: RunOut) => `${x.holdDeg}|${x.push}`;
  const cells = [...new Set(rows.map(key))];
  console.log(`   held roll | runs | the roll reached | the rail reached | rollAccel, rad/s² | the body's bank | its CoM across | draft | speed | still attached`);
  for (const c of cells) {
    const g = rows.filter((x) => key(x) === c);
    const up = g.filter((x) => x.rollAccel !== null);
    console.log(`   ${c.split('|')[0].padStart(7)}° push ${c.split('|')[1].padStart(4)} N | ${String(g.length).padStart(2)} | ${span(g.map((x) => Number(x.rollDeg)), 2).padStart(13)}° | ${span(g.map((x) => Number(x.railDeg)), 2).padStart(13)}° | ${span(up.map((x) => Number(x.rollAccel)), 3).padStart(15)} | ${span(g.map((x) => Number(x.bankDeg)), 2).padStart(13)}° | ${span(g.map((x) => Number(x.capPoint)), 3).padStart(13)} m | ${span(g.map((x) => Number(x.draft)), 3)} m | ${span(g.map((x) => Number(x.speed)), 2)} m/s | ${g.filter((x) => x.fellAtS === null).length} of ${g.length}`);
  }
  console.log(`   the settle ladder, rollAccel averaged over the ${f(LADDER_WIDTH, 2)} s ending at ${LADDER.join(' / ')} s:`);
  for (const c of cells) {
    const g = rows.filter((x) => key(x) === c);
    const cols = LADDER.map((_e, i) => span(g.map((x) => Number((x.ladder as (number | null)[])[i])), 2));
    console.log(`   ${c.split('|')[0].padStart(7)}° push ${c.split('|')[1].padStart(4)} N | ${cols.join(' | ')}`);
  }
  if (MODE === 'moment') {
    console.log(`   the moment, from 1/ω̇ = (I_dry + I_water)/M over ${SPREADS.length} payload spreads at each held roll (the spreads leave the mass, the`);
    console.log(`   centre of mass and so the whole hydrodynamic condition alone — check the draft column agrees across them):`);
    console.log(`     held roll | runs | the rail reached | M, N·m | K = M/roll, N·m/rad | I_water, kg·m² | fit R² | the drafts`);
    for (const rollDeg of ROLLS) {
      for (const st of STANCES) for (const extra of EXTRAS) {
        const g = SPREADS.map((sp) => rows.find((x) => Number(x.holdDeg) === rr(rollDeg, 2) && x.spread === sp && x.stance === st && x.extra === extra))
          .filter((x): x is RunOut => !!x && x.rollAccel !== null && Number.isFinite(Number(x.rollAccel)) && Number(x.rollAccel) !== 0);
        if (g.length < 2) continue;
        const pts = g.map((x) => [Number(x.rollInertiaEff), 1 / Math.abs(Number(x.rollAccel))] as [number, number]);
        const k = slope(pts);
        const mx = pts.reduce((a, q) => a + q[0], 0) / pts.length;
        const my = pts.reduce((a, q) => a + q[1], 0) / pts.length;
        const c = my - k * mx;
        const M = 1 / k;
        const sst = pts.reduce((a, q) => a + (q[1] - my) ** 2, 0);
        const sse = pts.reduce((a, q) => a + (q[1] - (k * q[0] + c)) ** 2, 0);
        const rollRad = Math.abs(Number(g[0].rollDeg)) / DEG;
        console.log(`     ${f(rollDeg, 1).padStart(9)}° | ${String(g.length).padStart(4)} | ${f(Number(g[0].railDeg), 2).padStart(16)}° | ${f(M, 2).padStart(6)} | ${f(M / rollRad, 1).padStart(19)} | ${f(c * M, 4).padStart(14)} | ${f(sst > 0 ? 1 - sse / sst : Number.NaN, 5)} | ${g.map((x) => f(Number(x.draft), 3)).join(' ')}`);
      }
    }
  }
  if (MODE === 'inertia') {
    console.log(`   the effective roll inertia, I = ΔM / Δω̇ against the push-0 cell at the same hold:`);
    for (const rollDeg of ROLLS) {
      const base = rows.filter((x) => Number(x.holdDeg) === rr(rollDeg, 2) && x.push === 0);
      for (const push of PUSHES) {
        if (push === 0) continue;
        const g = rows.filter((x) => Number(x.holdDeg) === rr(rollDeg, 2) && x.push === push);
        const Is = g.map((x, i) => {
          const b0 = base[i] ?? base[0];
          return Number(x.pushMoment) / (Number(x.rollAccel) - Number(b0?.rollAccel));
        });
        console.log(`   ${f(rollDeg, 1).padStart(6)}° push ${String(push).padStart(5)} N → ΔM ${span(g.map((x) => Number(x.pushMoment)), 1)} N·m · Δω̇ ${span(g.map((x, i) => Number(x.rollAccel) - Number((base[i] ?? base[0])?.rollAccel)), 3)} rad/s² · I ${span(Is, 3)} kg·m² (the board's own effective ${f(Number(rows[0]?.rollInertiaEff), 4)})`);
      }
    }
  }
  // The spring: a straight line through the ladder's own (rail, rollAccel) pairs, per push group.
  for (const push of PUSHES) {
    const pts = rows.filter((x) => x.push === push && x.rollAccel !== null)
      .map((x) => [Number(x.railDeg) / DEG, Number(x.rollAccel)] as [number, number])
      .filter((q) => Number.isFinite(q[0]) && Number.isFinite(q[1]));
    if (pts.length < 3) continue;
    const n = pts.length;
    const sx = pts.reduce((a, q) => a + q[0], 0) / n;
    const sy = pts.reduce((a, q) => a + q[1], 0) / n;
    const sxx = pts.reduce((a, q) => a + (q[0] - sx) ** 2, 0);
    const sxy = pts.reduce((a, q) => a + (q[0] - sx) * (q[1] - sy), 0);
    const A = sxy / sxx;
    const zero = sx - sy / A;
    console.log(`   the spring over ${n} held points (push ${push} N): dω̇/d(rail) = ${f(A, 2)} 1/s², ω̇ = 0 at a rail of ${f(zero * DEG, 2)}°${A > 0 ? `, divergent at ${f(Math.sqrt(A), 2)} 1/s` : ', restoring'}`);
    console.log(`   quartiles of rollAccel over every held run: ${quart(rows.filter((x) => x.push === push).map((x) => Number(x.rollAccel)))} rad/s²`);
  }
}
