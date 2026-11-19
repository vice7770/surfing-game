/**
 * Step 3.5m: **where the capture test's across VELOCITY comes from on flat still water, with no across force.**
 *
 * The minimal reproduction this round is about is step 33q's `C3-steer` cell (`3.3/aim.ts`,
 * `3.3/results/33q/C3-steer.jsonl`, written up in `3.3/README.md` Part 40 §4 check 4): on a literal plane —
 * `surfaceY = 0`, `stillDepth = 3`, no slope, no flow, `addReaction` a no-op — a standing `rider: 'new'` under a
 * constant tow **falls in 23 of 24 runs**, and the **six zero-stick runs all fall, at 0.750–1.617 s**, with the
 * committed settle ladder reading `Fe` 0.0 N, `Fx` 0.0 N and `axFeet` 0.000 m/s² at every rung to the fall.
 *
 * The fall test is `HumanBalance.fallen` = `state.beyond && state.weightPast`, and the capture point it is built on is
 * `s.across = px + vx / omega` (`humanBalance.ts:454–483`), where
 *
 * - `px = offset.x − height · nx` is a **position**, m, board +x, and
 * - `vx = velocity.x − along · nx` is a **speed**, m/s, board +x, built from
 *   `velocity = (rider CoM world velocity − board.velocityAt(feet))` **rotated into the deck frame**
 *   (`AttachedRider.ts` `captureStep`, ~:5355).
 *
 * The track's closing state says *"what ends it is a VELOCITY, not a position"*. Two routes to that velocity were left
 * unseparated, and this probe separates them:
 *
 * - **(a) generated inside the rider** — the body's own plant or command moving its centre of mass sideways **over the
 *   ground**;
 * - **(b) purely kinematic** — the board moving under him, so the relative velocity at the feet needs **no across
 *   force** at all (a roll moment can exist while the net across force is exactly zero).
 *
 * ## The instrument: an exact three-term decomposition of the quantity the test reads
 *
 * `{eLevel, ŷ, fLevel}` is an orthonormal **world** basis — `fLevel` the world-horizontal heading, `eLevel` the
 * world-horizontal axis across it (`(fwd.z, 0, −fwd.x)` normalised, `rollspring.ts`'s `side`), `ŷ` the world vertical.
 * So for the relative velocity vector `w = v_rider − board.velocityAt(feet)`, **world frame, m/s**, the across
 * component the capture test reads is **exactly**
 *
 *     relAcrossDeck = w · xDeck
 *                   = (w · eLevel)(xDeck · eLevel)  +  (w · ŷ)(xDeck · ŷ)  +  (w · fLevel)(xDeck · fLevel)
 *                   =      cLevel                   +       cUp            +        cAlong
 *
 * with `xDeck` the deck's own across axis (the board's local +x applied to its orientation — `trimbank.ts`'s
 * `acrossAxis`, and the axis `CaptureState.speedAcross` lives on). The three terms are an identity, not a fit, and the
 * probe prints all three plus their sum beside the measured `relAcrossDeck` so the identity can be checked row by row.
 *
 * **What each term means for the two routes.** `cUp` is a **vertical** relative velocity read sideways because the
 * deck is rolled: `xDeck · ŷ ≈ sin(roll)`, so it is **zero at zero roll and needs no across motion of anything** —
 * route (b) in its purest form. `cAlong` is an along-heading relative velocity leaked by the deck's attitude, also
 * route (b). `cLevel` is genuine horizontal across motion, and it is split again into whose it is:
 *
 *     w · eLevel = (v_rider · eLevel) − (board.velocityAt(feet) · eLevel)
 *                = riderLevelAcross − feetLevelAcross,
 *     feetLevelAcross = boardCmLevelAcross + (ω × (feet − board.position)) · eLevel   [the roll/yaw lever at the feet]
 *
 * so a `cLevel` carried by `riderLevelAcross` is route (a) and one carried by the feet's own sideways motion is
 * route (b). **Both series are printed, never a ratio.**
 *
 * Two further route-(b) predictions are printed beside them, because the brief names one of them:
 * - `leverFeet`, m/s = `(ω × (feet − board.position)) · xDeck` — the deck point's own across velocity from the board's
 *   rotation, measured as `board.velocityAt(feet) · xDeck − board.velocity · xDeck`;
 * - `leverHeight`, m/s = `−rollRate · height` — what a body **rigidly rolling with the deck** at the capture state's
 *   own CoM height would show. The rider standing is a free centre of mass (`AttachedRider.freeBody`) and does **not**
 *   rotate with the deck, so this is the arithmetic the brief asked for and not a prediction of the model; it is
 *   printed as such.
 *
 * `rollRate`, rad/s, is the **Euler roll rate** `φ̇` about the board's own long axis, taken from the same Euler triple
 * `rollspring.ts` and `3.3/aim.ts` use. `rollDeg` is the angle between `xDeck` and `eLevel`, i.e. the deck's roll about
 * the heading from the world's level, degrees.
 *
 * ## The validity control: the probe reconstructs the feet and the frame, and checks it against the engine
 *
 * `captureOffset` and `captureVelocity` are private. The probe rebuilds the feet point from the **public** surface —
 * `support` (public field), `deckHeight(shape, midZ)` (exported), `board.toWorld` — and then checks its own
 * reconstruction against the engine's own published column: **`offset.x` must equal `CaptureState.offsetAcross` to the
 * printed digit.** `offsetMiss` is that difference, m, and it is a hard control: if it is not ~0 the frame or the feet
 * point is wrong and nothing else in the row may be read. Nothing is inferred about the felt vertical; `feltAcross` is
 * the engine's own `nx` and `speedAcross` is the engine's own `vx`, both read out, never re-derived.
 *
 * ## ⚠️ The hazard in the committed rig, measured rather than assumed
 *
 * 33q's tow is a **per-substep velocity constraint on the board alone** — `level = hypot(v.x, v.z); v.x *= tow/level;
 * v.z *= tow/level` on `board.velocity`, with nothing applied to the rider body. It scales x and z by the **same**
 * factor, and drag makes that factor > 1, so **it multiplies any existing across component every substep**: a
 * geometric amplifier on exactly the quantity the capture test reads. `RIG` runs three rigs on the same cells:
 *
 * - `RIG=tow` — the committed constraint, byte for byte from `3.3/aim.ts`. The control.
 * - `RIG=along` — the **along-heading-only** hold: `v += fLevel · (tow − v · fLevel)`. It holds the speed the same way
 *   and injects **exactly zero** across velocity, which is the discriminating rig.
 * - `RIG=none` — no tow at all; the board coasts down from its entry speed.
 *
 * `towInjLevel` and `towInjDeck`, m/s, are what the rig actually added to the board's across velocity **this substep**,
 * measured as (after − before) on `eLevel` and on `xDeck` with the pre-rig axes, and `towInjLevelCum` is their running
 * sum over the run. `towFactor` is the scale the `tow` rig applied. So the rig's own injection sits in the same rows as
 * the rider's own motion and can be read off beside it.
 *
 * ## ⚠️ The resolution: substeps, not frames
 *
 * The handoff's 2026-11-19 closing state records that **`beyond && weightPast` is both-true on 0 of 2 123 and 0 of
 * 3 744 live frames** — the conjunction is reached inside a substep, so a frame-rate trace of this quantity measures
 * nothing. `rider.finish` (and `captureStep` inside it) is called from `BoardBody.substep` (`BoardBody.ts:1685`), so
 * this probe wraps `board.substep` — as `3.3/aim.ts` and `rollspring.ts` wrap it — and reads the state **after** each
 * substep. Standing forces at least `STANDING_SUBSTEPS` (`BoardBody.ts:859`), and `SUBSTEPS=64` is passed to match
 * 33q, so a substep is 1/3840 s.
 *
 * ## The two arms
 *
 * `ARM=probe` is 33q's own `{ phase: 'standing', rider: 'new' }` — **the control, whose 24 rows must reproduce**.
 * `ARM=owner` is the owner's full address, copied from `3.5/forward.ts:142`:
 * `{ phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on' }`.
 * Four of his five switches are off in 33q, and the felt-vertical filter's frame is one of them: Part 34 measured the
 * world filter and the deck filter as **different populations** (0.77–1.95 s against 1.10–2.07 s), so the control arm's
 * numbers may not be carried to his game without this comparison.
 *
 * ⛔ **Measurement only.** No source file is touched: `git diff -- src/` is empty. The rig and the trace are wrapped
 * round `board.substep` inside this file, so there is no switch to ship. No gain, no constant and no tuning is
 * proposed. Every private read is through the one declared cast below, and only `get`s.
 *
 * Run from the repository root (the bundle needs `node_modules` beside it):
 *   npx rolldown docs/research/new-rider/3.5/acrossvel.ts -o <scratch>/acrossvel.mjs --format esm --platform node
 *   ARM=probe RIG=tow  STANCES=tall,compress TOWS=5,7,9 STEERS=0,0.25,0.5,1 SUBSTEPS=64 SECONDS=4 \
 *     OUT=<scratch>/control.jsonl node <scratch>/acrossvel.mjs
 *   ARM=probe RIG=tow  STANCES=tall,compress TOWS=5,7,9 STEERS=0 TRACE=<scratch>/t.jsonl … node <scratch>/acrossvel.mjs
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { deckHeight } from '../../../../src/physics/riderPosture';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);

/** Flat still water, 3 m deep, surface at y = 0: `3.3/aim.ts`'s own `Flat`, copied unchanged so this file stands alone. */
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
  advance(): void { /* still */ }
  addReaction(): void { /* the hull's reaction goes nowhere on still water */ }
}

/** The level trim `3.3/aim.ts`'s `flatPlace` starts from: pitch °, draft m. Copied so the control reproduces. */
const FLAT_PITCH = 2;
const FLAT_DRAFT = 0.085;

type Stance = 'tall' | 'crouch' | 'compress';
type Rig = 'tow' | 'along' | 'none';

const ARMS = (process.env.ARM ?? 'probe').split(',') as ('probe' | 'owner')[];
const RIGS = (process.env.RIG ?? 'tow').split(',') as Rig[];
const STANCES = (process.env.STANCES ?? 'tall,compress').split(',') as Stance[];
const TOWS = (process.env.TOWS ?? '5,7,9').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0').split(',').map(Number);
const SECONDS = num('SECONDS', 4);
const SUBSTEPS = num('SUBSTEPS', 64);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;
/** Emit every EVERY-th substep to TRACE, and every substep of the last KEEP before the run ends. */
const EVERY = num('EVERY', 16);
const KEEP = num('KEEP', 160);
/**
 * `INERT=1`: **the probe's own inertness control** (`3.5/forward.ts`'s pattern). Every read this file makes inside the
 * substep — the feet point, the relative velocity, the capture columns, the force sum, the second water sample — is
 * skipped and only the run's outcome is emitted. If the reads were changing the solve, `fellAtFrameS` would differ
 * between `INERT=1` and `INERT=0` on the same cells.
 */
const INERT = process.env.INERT === '1';

/** 33q's own probe config, and the owner's full address copied from `3.5/forward.ts:142`. */
const optionsFor = (arm: 'probe' | 'owner'): Record<string, unknown> => (arm === 'probe'
  ? { phase: 'standing', rider: 'new' }
  : { phase: 'standing', rider: 'new', feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on' });

/**
 * The one cast that reads the rider's private columns, and only `get`s — the pattern `3.5/forward.ts` already uses.
 * Nothing is written through it and no source file changes.
 *
 * - `limit`, which contact limit is binding (`ContactLimit`), and `postureError`, m, how far past the posture;
 * - `captureFeet`, the feet's middle on the deck, **world frame, m** — the engine's own point, so the probe does not
 *   have to trust its own reconstruction of it;
 * - `captureOffset`, the centre of mass from that point, **deck frame, m** (x across, y up, z along);
 * - `captureVelocity`, its velocity relative to the deck point there, **deck frame, m/s** — this IS the quantity the
 *   question is about, before the felt vertical is projected out of it;
 * - `captureFelt`, the felt vertical there, **deck frame, m/s²** — read out so `n̂` is the engine's own and `nz` is
 *   never re-derived from `tiltAcross` with a root choice.
 *
 * ⚠️ These four are refreshed only on a substep the capture test is **not** frozen (`HumanBalance.frozen`,
 * CAPTURE_LOAD): `capture` returns its held state before touching anything when the feet are light. `captureOffset`,
 * `captureVelocity` and `captureFelt` are built in `captureStep` **before** that call, so they are live every substep,
 * while `CaptureState`'s own columns (`offsetAcross`, `speedAcross`, `across`, …) are **stale while frozen**. Every
 * control below is therefore taken on unfrozen substeps only, and `frozenShare` says how many there were.
 */
interface Inner {
  limit: string;
  postureError: number;
  captureFeet: Vector3;
  captureOffset: Vector3;
  captureVelocity: Vector3;
  captureFelt: Vector3;
}

const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const median = (v: number[]) => {
  const s = sorted(v);
  if (!s.length) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const span = (v: number[], d = 3) => {
  const s = sorted(v);
  return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–';
};
const peak = (v: number[]) => {
  const s = v.filter(Number.isFinite).map(Math.abs);
  return s.length ? Math.max(...s) : Number.NaN;
};
function emit(row: Record<string, unknown>, path: string): void { appendFileSync(path, `${JSON.stringify(row)}\n`); }

// ---- the Euler triple `rollspring.ts` holds the board in, copied unchanged from `3.3/aim.ts` ----
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
/** ω = a ŷ + b e₁ + c f (e₁ the level pitch axis, f the board's long axis): the Euler rates (ψ̇, −θ̇, φ̇). */
function eulerRates(q: Quaternion, w: Vector3): { a: number; b: number; c: number } {
  const { heading } = euler(q);
  const y = new Vector3(0, 1, 0);
  const e1 = new Vector3(Math.cos(heading), 0, -Math.sin(heading));
  const fw = new Vector3(0, 0, 1).applyQuaternion(q);
  const inv = new Matrix4().makeBasis(y, e1, fw).invert();
  const s = w.clone().applyMatrix4(inv);
  return { a: s.x, b: s.y, c: s.z };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Any = any;

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

/** One substep's row. Units and frames are in each field's comment; every force here is DELIVERED, never requested. */
interface Sub {
  /** s, time into the run at the END of this substep. */
  t: number;
  /** °, the angle between `xDeck` and `eLevel`; rad/s, the Euler roll rate φ̇ about the board's long axis; rad/s, ψ̇. */
  rollDeg: number;
  rollRate: number;
  yawRate: number;
  /** m/s, what the rig added to the BOARD's across velocity this substep, on `eLevel` and on `xDeck` (pre-rig axes). */
  towInjLevel: number;
  towInjDeck: number;
  towInjLevelCum: number;
  /**
   * m/s, what the rig added to the board's velocity **along the heading** this substep, and its running sum. ⚠️ On the
   * zero-stick cells the across injection is identically zero and THIS is the column that carries the rig's effect:
   * the constraint is on the board alone, so it restores the board's along speed every substep and gives the rider
   * body nothing, and the running sum is the along velocity the rider has to be dragged up to through the feet.
   */
  towInjAlong: number;
  towInjAlongCum: number;
  towFactor: number;
  /** m/s, the quantity the capture test reads, measured: `(v_rider − board.velocityAt(feet)) · xDeck`. */
  relAcrossDeck: number;
  /** m/s, the exact three-term decomposition of it, and its sum (a control: `termSum − relAcrossDeck` must be ~0). */
  cLevel: number;
  cUp: number;
  cAlong: number;
  termSum: number;
  /** m/s and unit: the three relative components, world frame, and `xDeck`'s own direction cosines on that basis. */
  relLevel: number;
  relUp: number;
  relAlong: number;
  wLevel: number;
  wUp: number;
  wAlong: number;
  /** m/s, whose horizontal across motion `relLevel` is: the body's over ground, against the deck point's under it. */
  riderLevel: number;
  feetLevel: number;
  boardCmLevel: number;
  /** m/s, the same split on the world vertical. */
  riderUp: number;
  feetUp: number;
  /** m/s, route (b)'s two predictions: the rotation's own lever at the feet, and `−φ̇ · height` (rigid-roll arithmetic). */
  leverFeet: number;
  leverHeight: number;
  /** The engine's own capture columns, read out, never re-derived (`CaptureState`). m, m/s, rad, 1/s. */
  speedAcross: number;
  pointAcross: number;
  across: number;
  offsetAcross: number;
  feltAcross: number;
  tiltDeg: number;
  height: number;
  omega: number;
  past: number;
  pastAcross: number;
  reach: number;
  beyond: boolean;
  weightPast: boolean;
  margin: number;
  /** m, the probe's reconstruction of `offset.x` minus the engine's `offsetAcross`: the HARD validity control. */
  offsetMiss: number;
  /** m, the probe's reconstruction of the feet point against the engine's own `captureFeet`: the second control. */
  feetMiss: number;
  // ---- the engine's own live inputs to the test, deck frame, and its arithmetic redone on them ----
  /** m/s, the relative velocity the test is handed, BEFORE the felt vertical is projected out (`captureVelocity`). */
  eVelX: number;
  eVelY: number;
  eVelZ: number;
  /** m, the offset the test is handed (`captureOffset`), and m/s² the felt vertical's magnitude (`captureFelt`). */
  eOffX: number;
  eOffY: number;
  eOffZ: number;
  feltMag: number;
  /** unit, the felt vertical's own direction in the deck frame: the engine's own n̂, never re-derived. */
  nx: number;
  ny: number;
  nz: number;
  /** m and m/s, the test's four terms recomputed on the engine's own inputs: a control on `speedAcross`/`pointAcross`. */
  eHeight: number;
  ePx: number;
  ePz: number;
  eVx: number;
  eVz: number;
  /** m/s, `eVx − speedAcross`: zero unless the published state is stale, which it is exactly while `frozen`. */
  vxMiss: number;
  /**
   * m/s, `relAcrossDeck − eVelX`: **the strongest control of all.** The probe builds the relative velocity itself from
   * `rider.velocity`, the engine's `captureFeet` and `board.velocityAt`, and projects it on `xDeck`; `eVelX` is the
   * engine's own `captureVelocity.x`, built by rotating the same difference into the deck frame. Zero means the vector
   * the three-term decomposition is taken of **is** the vector the capture test reads, not a look-alike.
   */
  relMiss: number;
  /** The capture test's own two halves as distances, m: the position term and the speed term of `s.across`. */
  posTerm: number;
  velTerm: number;
  // ---- the ALONG channel, the same way: `s.along = pz + vz/ω` against the feet's reach fore and aft ----
  /** °, the deck's pitch (nose up positive) and rad/s its Euler rate −θ̇: the along channel's own attitude. */
  pitchDeg: number;
  pitchRate: number;
  /** m, the CoM from the feet's middle on the deck's own long and normal axes (board +z, +y). */
  offsetAlong: number;
  offsetUp: number;
  /** m/s, the relative velocity on the deck's long axis, and the same exact three-term decomposition of it. */
  relAlongDeck: number;
  zLevel: number;
  zUp: number;
  zAlong: number;
  dLevel: number;
  dUp: number;
  dAlong: number;
  /** The engine's own along capture point, m, and the feet's reach each way and across, m. */
  /**
   * m/s, world-horizontal ALONG the heading: whose motion `relAlong` is. `riderAlong` is the body's own, `feetAlong`
   * the deck point's under it, `boardCmAlong` the board's centre, and `leverAlongFeet = feetAlong − boardCmAlong` the
   * board's own rotation lever at the feet. So `relAlong = (riderAlong − boardCmAlong) − leverAlongFeet`: the first
   * bracket is the body lagging the board's **centre** — which is the quantity the rig holds and the body does not —
   * and the second is the pitch/yaw lever, which needs no along force at all.
   */
  riderAlong: number;
  feetAlong: number;
  boardCmAlong: number;
  leverAlongFeet: number;
  sAlong: number;
  halfAcross: number;
  alongFront: number;
  alongBack: number;
  /** m, the two halves of `past` taken apart: which channel is outside the feet, and by how much. */
  pastX: number;
  pastZ: number;
  /** body weights, the feet's load this substep; whether the capture test is frozen (CAPTURE_LOAD). */
  load: number;
  frozen: boolean;
  /** N, the water's net force on the hull on `xDeck` and on `eLevel`, delivered, world frame, mean over the substep. */
  Fx: number;
  Fe: number;
  /** m/s, over-ground horizontal and through-water along-heading (they are NOT the same column). */
  speedGround: number;
  speedThrough: number;
  limit: string;
  attached: boolean;
}

const SOURCES = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth', 'suction'] as const;

function oneRun(arm: 'probe' | 'owner', rig: Rig, st: Stance, tow: number, steer: number): Record<string, unknown> {
  const water = new Flat();
  const sample = createWaterSample();
  const board = new BoardBody({ substeps: SUBSTEPS });
  board.place(
    new Vector3(0, -FLAT_DRAFT + board.shape.centerOfMass.y, 0),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -FLAT_PITCH / DEG),
    new Vector3(0, 0, tow),
  );
  const rider = new AttachedRider(board.shape, optionsFor(arm) as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stance(rider, st);
  rider.steer = steer;
  const inner = rider as unknown as Inner;

  const nDeck = new Vector3();
  const xDeck = new Vector3();
  const zDeck = new Vector3();
  const eLevel = new Vector3();
  const fLevel = new Vector3();
  const UP = new Vector3(0, 1, 0);
  const feet = new Vector3();
  const mineFeet = new Vector3();
  const feetVel = new Vector3();
  const nHat = new Vector3();
  const rel = new Vector3();
  const local = new Vector3();
  const sumF = new Vector3();
  const axes = (q: Quaternion) => {
    nDeck.set(0, 1, 0).applyQuaternion(q);
    xDeck.set(1, 0, 0).applyQuaternion(q);
    zDeck.set(0, 0, 1).applyQuaternion(q);
    fLevel.copy(zDeck).setY(0).normalize();
    eLevel.set(fLevel.z, 0, -fLevel.x);
  };

  const subs: Sub[] = [];
  let now = 0;
  let injCum = 0;
  let injAlongCum = 0;
  /** The index in `subs` of the FIRST substep that read detached: the substep the fall test actually fired on. */
  let fellIndex = -1;
  let lastInert: { t: number; attached: boolean } | undefined;

  // ---- the rig and the trace, wrapped round the board's own substep (nothing in src/ changes) ----
  const b = board as Any;
  const original = b.substep.bind(b);
  b.substep = (h: number, w: SurfWater) => {
    const v = board.velocity;
    axes(board.orientation);
    const preLevel = v.dot(eLevel);
    const preDeck = v.dot(xDeck);
    const preAlong = v.dot(fLevel);
    let factor = Number.NaN;
    if (rig === 'tow') {
      // 33q's own tow, byte for byte: a per-substep velocity constraint on the board alone, scaling x and z alike.
      const level = Math.hypot(v.x, v.z);
      if (level > 1e-9) { factor = tow / level; v.x *= factor; v.z *= factor; }
    } else if (rig === 'along') {
      // The discriminating rig: the SAME speed hold applied only along the heading, so zero across velocity is added.
      v.addScaledVector(fLevel, tow - v.dot(fLevel));
    }
    const injLevel = v.dot(eLevel) - preLevel;
    const injDeck = v.dot(xDeck) - preDeck;
    const injAlong = v.dot(fLevel) - preAlong;
    injCum += injLevel;
    injAlongCum += injAlong;

    original(h, w);
    now += h;
    if (INERT) { lastInert = { t: now, attached: rider.attached }; return; }

    // ---- the read, AFTER the solve: `rider.finish` (and `captureStep` in it) ran inside `original` ----
    axes(board.orientation);
    const rollDeg = Math.atan2(nDeck.dot(eLevel), nDeck.y) * DEG;
    const pitchDeg = euler(board.orientation).pitch * DEG;
    const rates = eulerRates(board.orientation, board.angularVelocity);
    // The feet point: the ENGINE's own `captureFeet` (world, m), with the probe's independent reconstruction of it from
    // the public surface — `support`, `deckHeight`, `board.toWorld` — kept beside it as `feetMiss`, a validity control.
    const support = rider.support;
    const midX = (support.xMin + support.xMax) / 2;
    const midZ = (support.zMin + support.zMax) / 2;
    board.toWorld(local.set(midX, deckHeight(board.shape, midZ), midZ), mineFeet);
    feet.copy(inner.captureFeet);
    const feetMiss = mineFeet.distanceTo(feet);
    board.velocityAt(feet, feetVel);
    rel.subVectors(rider.velocity, feetVel);

    const relAcrossDeck = rel.dot(xDeck);
    const relLevel = rel.dot(eLevel);
    const relUp = rel.y;
    const relAlong = rel.dot(fLevel);
    const wLevel = xDeck.dot(eLevel);
    const wUp = xDeck.y;
    const wAlong = xDeck.dot(fLevel);
    const cLevel = relLevel * wLevel;
    const cUp = relUp * wUp;
    const cAlong = relAlong * wAlong;

    const s = rider.human.state;
    const frozen = rider.human.frozen;
    // The engine's own live inputs to the test, deck frame: the offset, m, the relative velocity, m/s, and n̂.
    const eOffset = inner.captureOffset;
    const eVel = inner.captureVelocity;
    nHat.copy(inner.captureFelt);
    const feltMag = nHat.length();
    if (feltMag > 1e-6) nHat.divideScalar(feltMag);
    // The test's own arithmetic, redone on the engine's own inputs: height, the two position terms, the two speed terms.
    const eHeight = Math.max(0.2, eOffset.dot(nHat));
    const eAlongDot = eVel.dot(nHat);
    const eVx = eVel.x - eAlongDot * nHat.x;
    const eVz = eVel.z - eAlongDot * nHat.z;
    const ePx = eOffset.x - eHeight * nHat.x;
    const ePz = eOffset.z - eHeight * nHat.z;
    // The probe's own reconstruction of `offset`, board frame, to check `offset.x` against `offsetAcross`.
    local.subVectors(rider.position, feet);
    const mineOffsetX = local.dot(xDeck);
    const offsetAlong = local.dot(zDeck);
    const offsetUp = local.dot(nDeck);
    // The along channel, decomposed on the same world basis: an exact identity, same as the across one.
    const relAlongDeck = rel.dot(zDeck);
    const zLevel = zDeck.dot(eLevel);
    const zUp = zDeck.y;
    const zAlong = zDeck.dot(fLevel);
    const halfAcross = (support.xMax - support.xMin) / 2;
    const alongFront = support.zMax - midZ;
    const alongBack = midZ - support.zMin;

    sumF.set(0, 0, 0);
    for (const key of SOURCES) sumF.add((board.forces as Record<string, Vector3>)[key]);
    const cen = w.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const speedThrough = (board.velocity.x - cen.flowX) * zDeck.x + (board.velocity.y - cen.flowY) * zDeck.y
      + (board.velocity.z - cen.flowZ) * zDeck.z;

    subs.push({
      t: now,
      rollDeg,
      rollRate: rates.c,
      yawRate: rates.a,
      towInjLevel: injLevel,
      towInjDeck: injDeck,
      towInjLevelCum: injCum,
      towInjAlong: injAlong,
      towInjAlongCum: injAlongCum,
      towFactor: factor,
      relAcrossDeck,
      cLevel,
      cUp,
      cAlong,
      termSum: cLevel + cUp + cAlong,
      relLevel,
      relUp,
      relAlong,
      wLevel,
      wUp,
      wAlong,
      riderLevel: rider.velocity.dot(eLevel),
      feetLevel: feetVel.dot(eLevel),
      boardCmLevel: board.velocity.dot(eLevel),
      riderUp: rider.velocity.y,
      feetUp: feetVel.y,
      leverFeet: feetVel.dot(xDeck) - board.velocity.dot(xDeck),
      leverHeight: -rates.c * s.height,
      speedAcross: s.speedAcross,
      pointAcross: s.pointAcross,
      across: s.across,
      offsetAcross: s.offsetAcross,
      feltAcross: s.feltAcross,
      tiltDeg: s.tiltAcross * DEG,
      height: s.height,
      omega: s.omega,
      past: s.past,
      pastAcross: s.pastAcross,
      reach: s.reach,
      beyond: s.beyond,
      weightPast: s.weightPast,
      margin: s.margin,
      offsetMiss: mineOffsetX - s.offsetAcross,
      feetMiss,
      eVelX: eVel.x,
      eVelY: eVel.y,
      eVelZ: eVel.z,
      eOffX: eOffset.x,
      eOffY: eOffset.y,
      eOffZ: eOffset.z,
      feltMag,
      nx: nHat.x,
      ny: nHat.y,
      nz: nHat.z,
      eHeight,
      ePx,
      ePz,
      eVx,
      eVz,
      vxMiss: eVx - s.speedAcross,
      relMiss: relAcrossDeck - eVel.x,
      posTerm: s.pointAcross,
      velTerm: s.omega > 0 ? s.speedAcross / s.omega : Number.NaN,
      pitchDeg: pitchDeg,
      pitchRate: -rates.b,
      offsetAlong,
      offsetUp,
      relAlongDeck,
      zLevel,
      zUp,
      zAlong,
      dLevel: relLevel * zLevel,
      dUp: relUp * zUp,
      dAlong: relAlong * zAlong,
      riderAlong: rider.velocity.dot(fLevel),
      feetAlong: feetVel.dot(fLevel),
      boardCmAlong: board.velocity.dot(fLevel),
      leverAlongFeet: feetVel.dot(fLevel) - board.velocity.dot(fLevel),
      sAlong: s.along,
      halfAcross,
      alongFront,
      alongBack,
      pastX: Math.max(0, Math.abs(s.across) - halfAcross),
      pastZ: Math.max(0, s.along - alongFront, -s.along - alongBack),
      load: rider.captureLoad,
      frozen,
      Fx: sumF.dot(xDeck),
      Fe: sumF.dot(eLevel),
      speedGround: Math.hypot(board.velocity.x, board.velocity.z),
      speedThrough,
      limit: inner.limit,
      attached: rider.attached,
    });
    // ⚠️ `board.step` runs ALL of the frame's substeps: once the rider separates, `rider.finish` is no longer called
    // (`BoardBody.ts:1685` is gated on `rider?.attached`) but the board keeps solving to the end of the frame. So the
    // separating substep is the FIRST one that reads detached, not the last row of the run, and only on that one are
    // the engine's own capture columns the ones the test fired on. Taking the last row instead drifts the engine's
    // `captureVelocity` against a live read by the board's remaining travel (measured at 0.0052 m/s on tall/5/0.25).
    if (!rider.attached && fellIndex < 0) fellIndex = subs.length - 1;
    // `UP` is referenced so the basis is explicit in the file; the world vertical is read as `rel.y` above.
    void UP;
  };

  /**
   * `fellAtFrameS` is the frame-resolution fall time `3.3/aim.ts` reports — the end of the 1/60 s frame the rider
   * separated in — and it is the column the 24-row control must reproduce. `fellAtS` below is the substep-resolution
   * time (1/3840 s at SUBSTEPS=64), which is a finer measurement of the same event, not a different one.
   */
  let fellAtFrame = Number.NaN;
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    water.advance();
    board.step(STEP, water);
    if (!rider.attached) { fellAtFrame = (i + 1) * STEP; break; }
  }

  const fellAt = INERT
    ? (lastInert && !lastInert.attached ? lastInert.t : Number.NaN)
    : (fellIndex >= 0 ? subs[fellIndex].t : Number.NaN);
  const live = (fellIndex >= 0 ? subs.slice(0, fellIndex) : subs).filter((x) => x.attached);
  const last = live.length ? live[live.length - 1] : undefined;
  /**
   * The SEPARATING substep: the one on which `beyond && weightPast` was both-true. The handoff's closing state records
   * that this conjunction is both-true on **0 of 2 123 and 0 of 3 744 live frames** — it is reached inside a substep —
   * so `last` above (the last ATTACHED substep) is one substep before it and cannot show the test firing. `fall` is
   * that substep, read with the rider already detached, and it is the only place the conjunction can be seen.
   */
  const fall = fellIndex >= 0 ? subs[fellIndex] : undefined;
  const cell = { arm, rig, stance: st, tow, steer };

  if (TRACE) {
    const from = subs.length - KEEP;
    subs.forEach((x, i) => {
      if (i % EVERY === 0 || i >= from) emit({ bar: 'av-sub', ...cell, ...x }, TRACE);
    });
  }

  // The windows the headline is read over: the whole live run, and the last 0.1 s before the fall.
  const tail = live.filter((x) => Number.isFinite(fellAt) ? x.t > fellAt - 0.1 : x.t > (last?.t ?? 0) - 0.1);
  const col = (w: Sub[], pick: (x: Sub) => number) => median(w.map(pick));

  return {
    bar: 'av',
    kind: 'run',
    ...cell,
    inert: INERT,
    substeps: subs.length,
    /** s, frame resolution: the column `3.3/aim.ts` reports and the 24-row control must reproduce. */
    fellAtFrameS: Number.isFinite(fellAtFrame) ? r(fellAtFrame, 4) : null,
    /** s, substep resolution (1/3840 s at SUBSTEPS=64): the same event, measured finer. */
    fellAtS: Number.isFinite(fellAt) ? r(fellAt, 5) : null,
    separation: rider.separation ?? null,
    humanFallen: rider.human.fallen,
    limitAtEnd: inner.limit,
    postureErrorAtEnd: r(inner.postureError, 4),
    /**
     * ⚠️ THE CONTROLS. The two that compare against `CaptureState`'s **published** columns are taken on **unfrozen**
     * substeps only: those columns are held unchanged while the feet are light (`HumanBalance.frozen`, CAPTURE_LOAD),
     * so a frozen substep compares a live reconstruction against a stale reading and must not be counted.
     * `frozenShare` says how much of the live run that was.
     */
    frozenShare: live.length ? r(live.filter((x) => x.frozen).length / live.length, 4) : null,
    /** m, the probe's feet point against the engine's own `captureFeet`: valid frozen or not. */
    feetMissPeak: r(peak(live.map((x) => x.feetMiss)), 9),
    /** m, the probe's reconstruction of `offset.x` against the engine's published `offsetAcross`. */
    offsetMissPeak: r(peak(live.filter((x) => !x.frozen).map((x) => x.offsetMiss)), 9),
    /** m/s, the test's own `vx` recomputed on the engine's own inputs against its published `speedAcross`. */
    vxMissPeak: r(peak(live.filter((x) => !x.frozen).map((x) => x.vxMiss)), 9),
    /** m/s, the probe's own relative velocity against the engine's `captureVelocity.x`: the strongest control. */
    relMissPeak: r(peak(live.map((x) => x.relMiss)), 10),
    /** m/s, the across decomposition's identity: valid frozen or not (nothing published is in it). */
    termMissPeak: r(peak(live.map((x) => x.termSum - x.relAcrossDeck)), 10),
    /** m/s, the same identity for the ALONG channel. */
    alongTermMissPeak: r(peak(live.map((x) => x.dLevel + x.dUp + x.dAlong - x.relAlongDeck)), 10),
    // ---- the rig's own injection, m/s ----
    towInjLevelPeak: r(peak(subs.map((x) => x.towInjLevel)), 8),
    towInjLevelCum: r(subs.length ? subs[subs.length - 1].towInjLevelCum : Number.NaN, 6),
    towInjAlongPeak: r(peak(subs.map((x) => x.towInjAlong)), 8),
    towInjAlongCum: r(subs.length ? subs[subs.length - 1].towInjAlongCum : Number.NaN, 6),
    towFactorMedian: r(col(live, (x) => x.towFactor), 8),
    // ---- the quantity, and whose it is ----
    relAcrossDeckPeak: r(peak(live.map((x) => x.relAcrossDeck)), 4),
    cLevelPeak: r(peak(live.map((x) => x.cLevel)), 4),
    cUpPeak: r(peak(live.map((x) => x.cUp)), 4),
    cAlongPeak: r(peak(live.map((x) => x.cAlong)), 4),
    riderLevelPeak: r(peak(live.map((x) => x.riderLevel)), 4),
    feetLevelPeak: r(peak(live.map((x) => x.feetLevel)), 4),
    riderUpPeak: r(peak(live.map((x) => x.riderUp)), 4),
    feetUpPeak: r(peak(live.map((x) => x.feetUp)), 4),
    leverFeetPeak: r(peak(live.map((x) => x.leverFeet)), 4),
    leverHeightPeak: r(peak(live.map((x) => x.leverHeight)), 4),
    speedAcrossPeak: r(peak(live.map((x) => x.speedAcross)), 4),
    rollDegPeak: r(peak(live.map((x) => x.rollDeg)), 3),
    rollRatePeak: r(peak(live.map((x) => x.rollRate)), 4),
    FxPeak: r(peak(live.map((x) => x.Fx)), 3),
    FePeak: r(peak(live.map((x) => x.Fe)), 3),
    // ---- the last 0.1 s before it ends: the medians that decide the route ----
    tailN: tail.length,
    tailRelAcrossDeck: r(col(tail, (x) => x.relAcrossDeck)),
    tailCLevel: r(col(tail, (x) => x.cLevel)),
    tailCUp: r(col(tail, (x) => x.cUp)),
    tailCAlong: r(col(tail, (x) => x.cAlong)),
    tailRiderLevel: r(col(tail, (x) => x.riderLevel)),
    tailFeetLevel: r(col(tail, (x) => x.feetLevel)),
    tailRiderUp: r(col(tail, (x) => x.riderUp)),
    tailFeetUp: r(col(tail, (x) => x.feetUp)),
    tailLeverFeet: r(col(tail, (x) => x.leverFeet)),
    tailLeverHeight: r(col(tail, (x) => x.leverHeight)),
    tailSpeedAcross: r(col(tail, (x) => x.speedAcross)),
    tailRollDeg: r(col(tail, (x) => x.rollDeg), 3),
    tailRollRate: r(col(tail, (x) => x.rollRate)),
    tailPosTerm: r(col(tail, (x) => x.posTerm)),
    tailVelTerm: r(col(tail, (x) => x.velTerm)),
    tailLoad: r(col(tail, (x) => x.load), 3),
    tailFx: r(col(tail, (x) => x.Fx), 3),
    tailFe: r(col(tail, (x) => x.Fe), 3),
    // ---- the ALONG channel over the same windows ----
    pastXPeak: r(peak(live.map((x) => x.pastX)), 4),
    pastZPeak: r(peak(live.map((x) => x.pastZ)), 4),
    relAlongDeckPeak: r(peak(live.map((x) => x.relAlongDeck)), 4),
    sAlongPeak: r(peak(live.map((x) => x.sAlong)), 4),
    pitchDegPeak: r(peak(live.map((x) => x.pitchDeg)), 3),
    relUpPeak: r(peak(live.map((x) => x.relUp)), 4),
    tailSAlong: r(col(tail, (x) => x.sAlong)),
    tailOffsetAlong: r(col(tail, (x) => x.offsetAlong)),
    tailRelAlongDeck: r(col(tail, (x) => x.relAlongDeck)),
    tailDLevel: r(col(tail, (x) => x.dLevel)),
    tailDUp: r(col(tail, (x) => x.dUp)),
    tailDAlong: r(col(tail, (x) => x.dAlong)),
    tailRelUp: r(col(tail, (x) => x.relUp)),
    tailPitchDeg: r(col(tail, (x) => x.pitchDeg), 3),
    tailPitchRate: r(col(tail, (x) => x.pitchRate)),
    tailZUp: r(col(tail, (x) => x.zUp), 5),
    tailRelAlong: r(col(tail, (x) => x.relAlong)),
    tailRiderAlong: r(col(tail, (x) => x.riderAlong)),
    tailFeetAlong: r(col(tail, (x) => x.feetAlong)),
    tailBoardCmAlong: r(col(tail, (x) => x.boardCmAlong)),
    tailLeverAlongFeet: r(col(tail, (x) => x.leverAlongFeet)),
    tailBodyLagsCentre: r(col(tail, (x) => x.riderAlong - x.boardCmAlong)),
    endSAlong: last ? r(last.sAlong) : null,
    endOffsetAlong: last ? r(last.offsetAlong) : null,
    endOffsetUp: last ? r(last.offsetUp) : null,
    endRelAlongDeck: last ? r(last.relAlongDeck) : null,
    endDLevel: last ? r(last.dLevel) : null,
    endDUp: last ? r(last.dUp) : null,
    endDAlong: last ? r(last.dAlong) : null,
    endRelUp: last ? r(last.relUp) : null,
    endRiderUp: last ? r(last.riderUp) : null,
    endFeetUp: last ? r(last.feetUp) : null,
    endPitchDeg: last ? r(last.pitchDeg, 3) : null,
    endPitchRate: last ? r(last.pitchRate) : null,
    endZUp: last ? r(last.zUp, 5) : null,
    endEVelX: last ? r(last.eVelX) : null,
    endEVelY: last ? r(last.eVelY) : null,
    endEVelZ: last ? r(last.eVelZ) : null,
    endEOffX: last ? r(last.eOffX) : null,
    endEOffZ: last ? r(last.eOffZ) : null,
    endNx: last ? r(last.nx, 6) : null,
    endNy: last ? r(last.ny, 6) : null,
    endNz: last ? r(last.nz, 6) : null,
    endEVx: last ? r(last.eVx) : null,
    endEVz: last ? r(last.eVz) : null,
    endEPx: last ? r(last.ePx) : null,
    endEPz: last ? r(last.ePz) : null,
    endEHeight: last ? r(last.eHeight) : null,
    endFeltMag: last ? r(last.feltMag, 3) : null,
    endFrozenFlag: last ? last.frozen : null,
    endRelAlong: last ? r(last.relAlong) : null,
    endRiderAlong: last ? r(last.riderAlong) : null,
    endFeetAlong: last ? r(last.feetAlong) : null,
    endBoardCmAlong: last ? r(last.boardCmAlong) : null,
    endLeverAlongFeet: last ? r(last.leverAlongFeet) : null,
    endBodyLagsCentre: last ? r(last.riderAlong - last.boardCmAlong) : null,
    endPastX: last ? r(last.pastX) : null,
    endPastZ: last ? r(last.pastZ) : null,
    endHalfAcross: last ? r(last.halfAcross) : null,
    endAlongFront: last ? r(last.alongFront) : null,
    endAlongBack: last ? r(last.alongBack) : null,
    // ---- the separating substep, where the conjunction `beyond && weightPast` is actually both-true ----
    fallBeyond: fall ? fall.beyond : null,
    fallWeightPast: fall ? fall.weightPast : null,
    fallPastX: fall ? r(fall.pastX) : null,
    fallPastZ: fall ? r(fall.pastZ) : null,
    fallReach: fall ? r(fall.reach) : null,
    fallAcross: fall ? r(fall.across) : null,
    fallSAlong: fall ? r(fall.sAlong) : null,
    fallPosTermAcross: fall ? r(fall.posTerm) : null,
    fallVelTermAcross: fall ? r(fall.velTerm) : null,
    fallSpeedAcross: fall ? r(fall.speedAcross) : null,
    fallOffsetAcross: fall ? r(fall.offsetAcross) : null,
    fallOffsetAlong: fall ? r(fall.offsetAlong) : null,
    fallRelAlongDeck: fall ? r(fall.relAlongDeck) : null,
    fallRelUp: fall ? r(fall.relUp) : null,
    fallDUp: fall ? r(fall.dUp) : null,
    fallDAlong: fall ? r(fall.dAlong) : null,
    fallDLevel: fall ? r(fall.dLevel) : null,
    fallPitchDeg: fall ? r(fall.pitchDeg, 3) : null,
    fallRollDeg: fall ? r(fall.rollDeg, 3) : null,
    fallOmega: fall ? r(fall.omega) : null,
    fallHeight: fall ? r(fall.height) : null,
    fallLoad: fall ? r(fall.load, 3) : null,
    fallRelAcrossDeck: fall ? r(fall.relAcrossDeck) : null,
    fallRelMiss: fall ? r(fall.relMiss, 10) : null,
    fallTermMiss: fall ? r(fall.termSum - fall.relAcrossDeck, 12) : null,
    fallFrozenFlag: fall ? fall.frozen : null,
    fallEVelX: fall ? r(fall.eVelX) : null,
    fallEVelY: fall ? r(fall.eVelY) : null,
    fallEVelZ: fall ? r(fall.eVelZ) : null,
    fallEVx: fall ? r(fall.eVx) : null,
    fallEVz: fall ? r(fall.eVz) : null,
    fallEPx: fall ? r(fall.ePx) : null,
    fallEPz: fall ? r(fall.ePz) : null,
    fallEOffX: fall ? r(fall.eOffX) : null,
    fallEOffZ: fall ? r(fall.eOffZ) : null,
    fallNx: fall ? r(fall.nx, 6) : null,
    fallNz: fall ? r(fall.nz, 6) : null,
    fallEHeight: fall ? r(fall.eHeight) : null,
    fallFrozen: fall ? fall.frozen : null,
    fallCLevel: fall ? r(fall.cLevel) : null,
    fallCUp: fall ? r(fall.cUp) : null,
    fallCAlong: fall ? r(fall.cAlong) : null,
    fallRiderLevel: fall ? r(fall.riderLevel) : null,
    fallFeetLevel: fall ? r(fall.feetLevel) : null,
    fallLeverFeet: fall ? r(fall.leverFeet) : null,
    fallLeverHeight: fall ? r(fall.leverHeight) : null,
    fallRollRate: fall ? r(fall.rollRate) : null,
    // ---- the very last live substep: the fall's own frame ----
    endT: last ? r(last.t, 4) : null,
    endAcross: last ? r(last.across) : null,
    endPosTerm: last ? r(last.posTerm) : null,
    endVelTerm: last ? r(last.velTerm) : null,
    endSpeedAcross: last ? r(last.speedAcross) : null,
    endRelAcrossDeck: last ? r(last.relAcrossDeck) : null,
    endCLevel: last ? r(last.cLevel) : null,
    endCUp: last ? r(last.cUp) : null,
    endCAlong: last ? r(last.cAlong) : null,
    endRiderLevel: last ? r(last.riderLevel) : null,
    endFeetLevel: last ? r(last.feetLevel) : null,
    endLeverFeet: last ? r(last.leverFeet) : null,
    endLeverHeight: last ? r(last.leverHeight) : null,
    endHeight: last ? r(last.height) : null,
    endOmega: last ? r(last.omega) : null,
    endRollDeg: last ? r(last.rollDeg, 3) : null,
    endRollRate: last ? r(last.rollRate) : null,
    endPast: last ? r(last.past) : null,
    endReach: last ? r(last.reach) : null,
    endBeyond: last ? last.beyond : null,
    endWeightPast: last ? last.weightPast : null,
    endMargin: last ? r(last.margin) : null,
    endFeltAcross: last ? r(last.feltAcross) : null,
    endTiltDeg: last ? r(last.tiltDeg, 3) : null,
    endLoad: last ? r(last.load, 3) : null,
    endFrozen: last ? last.frozen : null,
    endSpeedGround: last ? r(last.speedGround, 3) : null,
    endSpeedThrough: last ? r(last.speedThrough, 3) : null,
  };
}

const rows: Record<string, unknown>[] = [];
const started = Date.now();
for (const arm of ARMS) {
  for (const rig of RIGS) {
    for (const st of STANCES) {
      for (const tow of TOWS) {
        for (const steer of STEERS) {
          const row = oneRun(arm, rig, st, tow, steer);
          rows.push(row);
          console.log(JSON.stringify(row));
          if (OUT) emit(row, OUT);
        }
      }
    }
  }
}

const n = (x: unknown) => Number(x);
console.log('');
console.log(`## acrossvel — where the capture test's across velocity comes from. ${rows.length} runs, ${Math.round((Date.now() - started) / 1000)} s wall.`);
console.log(`   flat still water (surfaceY = 0, no slope, no flow, addReaction a no-op) · ${SUBSTEPS} substeps a frame = 1/${60 * SUBSTEPS} s a substep`);
console.log('   FRAMES: eLevel = world-horizontal across the heading · xDeck = the deck\'s own across axis (the capture test\'s axis) · ŷ = world up.');
console.log('   relAcrossDeck = (v_rider − board.velocityAt(feet)) · xDeck, m/s = cLevel + cUp + cAlong, exactly.');
console.log('');
console.log('   arm | rig | stance | tow | steer | fell, s | separation | end across | pos term | vel term | relAcross | cLevel | cUp | cAlong | roll° | φ̇ | tow inj cum');
for (const x of rows) {
  console.log(`   ${String(x.arm).padEnd(5)} | ${String(x.rig).padEnd(5)} | ${String(x.stance).padEnd(8)} | ${f(n(x.tow), 0).padStart(3)} | ${f(n(x.steer), 2).padStart(5)} | ${(x.fellAtFrameS === null ? '—' : f(n(x.fellAtFrameS), 4)).padStart(8)} | ${String(x.separation ?? '—').padEnd(10)} | ${f(n(x.endAcross), 4).padStart(10)} | ${f(n(x.endPosTerm), 4).padStart(8)} | ${f(n(x.endVelTerm), 4).padStart(8)} | ${f(n(x.endRelAcrossDeck), 4).padStart(9)} | ${f(n(x.endCLevel), 4).padStart(7)} | ${f(n(x.endCUp), 4).padStart(7)} | ${f(n(x.endCAlong), 4).padStart(7)} | ${f(n(x.endRollDeg), 2).padStart(6)} | ${f(n(x.endRollRate), 3).padStart(7)} | ${f(n(x.towInjLevelCum), 5).padStart(9)}`);
}
console.log('');
console.log('   the two route-(b) predictions against the measurement, last 0.1 s medians, m/s:');
console.log('   arm | rig | stance | tow | steer | relAcrossDeck | leverFeet (ω×r at the feet) | leverHeight (−φ̇·height) | riderLevel | feetLevel | riderUp | feetUp');
for (const x of rows) {
  console.log(`   ${String(x.arm).padEnd(5)} | ${String(x.rig).padEnd(5)} | ${String(x.stance).padEnd(8)} | ${f(n(x.tow), 0).padStart(3)} | ${f(n(x.steer), 2).padStart(5)} | ${f(n(x.tailRelAcrossDeck), 4).padStart(13)} | ${f(n(x.tailLeverFeet), 4).padStart(27)} | ${f(n(x.tailLeverHeight), 4).padStart(24)} | ${f(n(x.tailRiderLevel), 4).padStart(10)} | ${f(n(x.tailFeetLevel), 4).padStart(9)} | ${f(n(x.tailRiderUp), 4).padStart(7)} | ${f(n(x.tailFeetUp), 4).padStart(6)}`);
}
console.log('');
console.log('   WHOSE ALONG MOTION IT IS, m/s, world-horizontal along the heading, last live substep:');
console.log('   relAlong = (riderAlong − boardCmAlong) − leverAlongFeet. The first bracket is the body lagging the board\'s CENTRE');
console.log('   (the quantity the rig holds and the body does not); the second is the board\'s own pitch/yaw lever at the feet.');
console.log('   arm | rig | stance | tow | steer | relAlong | rider | feet | board CM | lever at feet | body lags centre');
for (const x of rows) {
  console.log(`   ${String(x.arm).padEnd(5)} | ${String(x.rig).padEnd(5)} | ${String(x.stance).padEnd(8)} | ${f(n(x.tow), 0).padStart(3)} | ${f(n(x.steer), 2).padStart(5)} | ${f(n(x.endRelAlong), 4).padStart(8)} | ${f(n(x.endRiderAlong), 4).padStart(7)} | ${f(n(x.endFeetAlong), 4).padStart(7)} | ${f(n(x.endBoardCmAlong), 4).padStart(8)} | ${f(n(x.endLeverAlongFeet), 4).padStart(13)} | ${f(n(x.endBodyLagsCentre), 4).padStart(16)}`);
}
console.log('');
console.log('   WHICH CHANNEL LEAVES THE FEET: pastX = |across|−halfAcross, pastZ = along past the feet fore/aft, m (0 inside);');
console.log('   and the ALONG channel decomposed on the same world basis: relAlongDeck = dLevel + dUp + dAlong, m/s, exactly.');
console.log('   arm | rig | stance | tow | steer | pastX | pastZ | reach | s.along | offset along | relAlong | dLevel | dUp | dAlong | relUp | pitch° | zDeck·ŷ');
for (const x of rows) {
  console.log(`   ${String(x.arm).padEnd(5)} | ${String(x.rig).padEnd(5)} | ${String(x.stance).padEnd(8)} | ${f(n(x.tow), 0).padStart(3)} | ${f(n(x.steer), 2).padStart(5)} | ${f(n(x.endPastX), 4).padStart(6)} | ${f(n(x.endPastZ), 4).padStart(6)} | ${f(n(x.endReach), 4).padStart(6)} | ${f(n(x.endSAlong), 4).padStart(7)} | ${f(n(x.endOffsetAlong), 4).padStart(12)} | ${f(n(x.endRelAlongDeck), 4).padStart(8)} | ${f(n(x.endDLevel), 4).padStart(7)} | ${f(n(x.endDUp), 4).padStart(7)} | ${f(n(x.endDAlong), 4).padStart(7)} | ${f(n(x.endRelUp), 4).padStart(7)} | ${f(n(x.endPitchDeg), 2).padStart(6)} | ${f(n(x.endZUp), 4)}`);
}
console.log('');
console.log(`   CONTROL feetMiss (the probe's feet point against the engine's own captureFeet), m: peak ${span(rows.map((x) => n(x.feetMissPeak)), 9)}`);
console.log(`   CONTROL offsetMiss (the probe's offset.x against the engine's offsetAcross, UNFROZEN substeps), m: peak ${span(rows.map((x) => n(x.offsetMissPeak)), 9)}`);
console.log(`   CONTROL vxMiss (the test's vx redone on the engine's own inputs against its speedAcross, UNFROZEN), m/s: peak ${span(rows.map((x) => n(x.vxMissPeak)), 9)}`);
console.log(`   CONTROL relMiss (the probe's own relative velocity against the engine's captureVelocity.x), m/s: peak ${span(rows.map((x) => n(x.relMissPeak)), 11)}`);
console.log(`   CONTROL the across identity, |cLevel+cUp+cAlong − relAcrossDeck|, m/s: peak ${span(rows.map((x) => n(x.termMissPeak)), 11)}`);
console.log(`   CONTROL the along identity, |dLevel+dUp+dAlong − relAlongDeck|, m/s: peak ${span(rows.map((x) => n(x.alongTermMissPeak)), 11)}`);
console.log(`   the share of live substeps the capture test was FROZEN (feet light, CAPTURE_LOAD): ${span(rows.map((x) => n(x.frozenShare)), 4)}`);
console.log(`   the rig's injected ACROSS velocity, cumulative over the run, m/s: ${span(rows.map((x) => n(x.towInjLevelCum)), 6)}`);
console.log(`   the rig's injected ALONG velocity, cumulative over the run, m/s: ${span(rows.map((x) => n(x.towInjAlongCum)), 6)} (peak a substep ${span(rows.map((x) => n(x.towInjAlongPeak)), 8)})`);
console.log(`   peak |relAcrossDeck| ${span(rows.map((x) => n(x.relAcrossDeckPeak)), 4)} · peak |speedAcross| ${span(rows.map((x) => n(x.speedAcrossPeak)), 4)} m/s`);
console.log(`   peak |Fx| ${span(rows.map((x) => n(x.FxPeak)), 3)} N · peak |Fe| ${span(rows.map((x) => n(x.FePeak)), 3)} N (delivered, world frame)`);
console.log(`   falls: ${rows.filter((x) => x.fellAtFrameS !== null).length} of ${rows.length}, at ${span(rows.filter((x) => x.fellAtFrameS !== null).map((x) => n(x.fellAtFrameS)), 4)} s (frame resolution, 3.3/aim.ts's own column)`);
const causes: Record<string, number> = {};
for (const x of rows) { const k = String(x.separation ?? 'none'); causes[k] = (causes[k] ?? 0) + 1; }
console.log(`   separations: ${Object.entries(causes).map(([k, v]) => `${k} ${v}`).join(' · ')}`);
console.log(JSON.stringify({ bar: 'av', kind: 'done', runs: rows.length, wallS: Math.round((Date.now() - started) / 1000) }));
