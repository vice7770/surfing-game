/**
 * Step 3.2aa: **the board's own ACROSS authority — how hard it can move its base sideways, and on which axis.**
 *
 * Part 24 §6 left one discrepancy standing and marked it first in line:
 *
 * > 3.2y measured the board's side force at **−384 N/rad of roll at 7.5 m/s**, which on the pair's 75.54 kg at the
 * > 20–63° of roll these falls reach "would be **1.8–5.6 m/s²** of lateral acceleration … and nothing like the
 * > **0.00–0.38 m/s²** of net base drift actually measured. **I am not resolving that gap.**"
 *
 * This probe resolves it, and the resolution is an **axis**, not a magnitude. The two numbers are the same water force
 * resolved on two axes that differ by the roll angle:
 *
 * - 3.2y's side force (and `PLANT_SPEEDS`' `Y` row) is on the **world-horizontal axis across the heading** —
 *   `rollspring.ts` builds it as `side = (fwd.z, 0, −fwd.x)` with `y` zeroed, and `PLANT_SPEEDS`' own `Y` is the lab's
 *   horizontal side force. That axis is the one a **turn** is measured on.
 * - Part 24's net base drift is on the **deck's own across axis** — `trimbank.ts`'s `acrossAxis`, the board's local
 *   `+x` applied to its orientation, which is the axis `CaptureState.speedAcross`, the capture point and the whole
 *   fall test live on. That axis is the one a **topple** is measured on.
 *
 * At a roll of φ those two axes are φ apart, and a force along the **deck normal** is `sin φ` of itself on the first
 * and **exactly zero** on the second. So the probe's job is to measure how close the water's net force on this hull
 * lies to the deck normal, and to publish the same force on both axes at once, in newtons, at the speeds the rides run.
 *
 * ## The quantities, each with its unit, its frame and its axis, stated once
 *
 * The water's net force on the board is `BoardBody.forces` summed over its ten entries — a **mean over the latest
 * step, newtons, world frame** (`BoardBody.ts:337`). Gravity is not in it and the rider's coupling is not in it, which
 * is what makes it the right thing to resolve: gravity cancels inside the pair, so the water force over the **pair's**
 * mass is the pair's own specific force, which is the identity the bank-gain consultation works in
 * (`docs/research/water-physics/consult-log.md`, 2026-11-15).
 *
 * The five axes it is resolved on, all unit vectors in the **world** frame:
 *
 * - `nDeck` — the deck normal, the board's local `+y` applied to its orientation.
 * - `xDeck` — **the deck's own across axis**, the board's local `+x` applied to its orientation. `trimbank.ts`'s
 *   `acrossAxis` exactly. In-deck-plane.
 * - `zDeck` — the board's long axis, its local `+z`. In-deck-plane.
 * - `eLevel` — **the world-horizontal axis across the heading**, `(fwd.z, 0, −fwd.x)` normalised with `y` zeroed.
 *   `rollspring.ts`'s `side` exactly.
 * - `fLevel` — the world-horizontal heading.
 *
 * `xDeck` and `eLevel` are the two axes the discrepancy lives between, and `rollDeg` is the angle between them.
 *
 * Every force column is **delivered**, not requested: it is what the water actually put on the hull over the step,
 * read back after the solve. Nothing in this probe asks for a force.
 *
 * Every speed column distinguishes **over-ground** (`speedGround`, the centre's world speed) from **through-water
 * along-heading** (`speedThrough`, `(v − flow) · zDeck`), because the model's own turn ceiling
 * (`AttachedRider.ts:3524`, `speed = boardVelocity·forward − flow·forward`, then `atan(v²/(g·R))`) uses the second and
 * reading the first has already made that formula look 1.5× wrong once on this track.
 *
 * ## The three force columns that answer the question
 *
 * - `Fe` = `ΣF · eLevel`, N — the **turn** force. 3.2y's side force and `PLANT_SPEEDS`' `Y` are this column.
 * - `Fx` = `ΣF · xDeck`, N — **the across authority.** The only component of the water's force that can move the
 *   base across the deck relative to a body standing on it. Split per source, because the consultation predicts
 *   `pressure ≈ 0` here on a flat section and names `buoyancy` as the largest term.
 * - `Fn` = `ΣF · nDeck`, N — the deck-normal load, the denominator of the felt vertical's across tilt
 *   `atan(Fx / Fn)`.
 *
 * And the two accelerations they are to be compared with, both **m/s²**:
 *
 * - `aeLevel` = `(Δv_centre/Δt) · eLevel`, the pair's own horizontal lateral acceleration — the world velocity
 *   **vector** differenced and projected **after**, never the derivative of a projection onto a rolling axis.
 * - `axFeet` = `(Δv_feet/Δt) · xDeck`, **Part 24's own net-base-drift datum**: the board's world velocity at the deck
 *   point under the feet, differenced as a vector and projected on the deck's across axis as it is now. The feet point
 *   is `{0, 0.07, −0.30}` in the board's frame — `PLANT_SPEEDS`' own roll-moment station and 3.2y's reference point,
 *   so this round adds no third datum.
 *
 * `aeHead` = `Δ(v · eLevel)/Δt` is kept beside `aeLevel` because **they are not the same number and `rollspring.ts`'s
 * `sideForce` is the second**: with the across axis turning at the yaw rate, `d(v·e)/dt = a·e − ψ̇ (v·f)`, so in a
 * settled turn the second reads **zero** while the first reads the turn's whole centripetal acceleration. 3.2y's
 * −384 N/rad came out of a cell with `HOLD_YAW=0`, where the two coincide. `YAW=free` against `YAW=0` on the same cell
 * is this round's discriminating check, and it is the one line that tells a magnitude error from an axis error.
 *
 * ## The method: 3.2y's own harness, nothing added to the game
 *
 * `rollspring.ts`'s flat-water cell unchanged and for the same reason (ruling 29t: a captive hold's number is not used
 * until the hold is shown settled, and on the `FaceWater` this hold does not settle) — still water at y = 0, the board
 * placed level at the tow's speed, `TOW` holding the centre's horizontal speed each substep, the board's roll held
 * about its own long axis through the composite centre of mass each substep with the Euler roll rate zeroed, ramped
 * over `HOLD_RAMP` and read in a window after `SETTLE`. `PAYLOAD_Y=0.07` puts the composite centre of mass at the deck
 * so the hold's reference point is the feet. The hold is wrapped round `board.substep` **in this file**; no source
 * file is touched and there is no switch to ship.
 *
 * `YAW=0` additionally holds the Euler yaw rate at zero and the path's angle at the heading, which is the captive
 * condition `PLANT_SPEEDS` and 3.2y's check 3 were measured in. `YAW=free` (the default) leaves both free, which is
 * what the board does under a rider.
 *
 * `RIDER=rigid` carries `roll-plant`'s 73 kg point payload, the configuration the captive table was measured in;
 * `RIDER=new` and `RIDER=old` attach the game's own riders and `STEER` holds their stick, which is what makes `Fx` per
 * unit of steer a measurement of the **player's** across authority and not just the hull's. `STEER` is the only input
 * the game gives the base's aim: `AttachedRider.ts:3536` turns it into `steer × RAIL_RANGE` of **bank** and nothing
 * else, capped by `atan(speedThrough² / (g · radius))`.
 *
 * Run from the repository's root (the bundle needs `node_modules` beside it):
 *   npx rolldown docs/research/new-rider/3.3/aim.ts -o <scratch>/aim.mjs --format esm --platform node
 *   RIDER=rigid PAYLOAD_Y=0.07 SUBSTEPS=64 TOWS=5,6,7,8,9 ROLLS=5,10,20,30,40,60 YAW=free \
 *     HOLD_RAMP=0.3 SETTLE=4 WINDOW=1 SECONDS=7 OUT=<scratch>/aim-free.jsonl node <scratch>/aim.mjs
 *   RIDER=rigid PAYLOAD_Y=0.07 SUBSTEPS=64 TOWS=5,6,7,8,9 ROLLS=5,10,20,30,40,60 YAW=0 … node <scratch>/aim.mjs
 *   RIDER=new STEERS=0,0.25,0.5,0.75,1 TOWS=5,7,9 ROLLS=none SECONDS=4 … node <scratch>/aim.mjs
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample, type SurfWater, type WaterSample } from '../../../../src/physics/SurfWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);

/** Flat still water, 3 m deep, surface at y = 0: `rollspring.ts`'s own `Flat`, copied so this file stands alone. */
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

/** The level trim `rollspring.ts`'s `flatPlace` starts from: pitch °, draft m. */
const FLAT_PITCH = 2;
const FLAT_DRAFT = 0.085;

const RIDER = (process.env.RIDER ?? 'rigid') as 'rigid' | 'new' | 'old' | 'none';
type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall').split(',') as Stance[];
const TOWS = (process.env.TOWS ?? '7.5').split(',').map(Number);
/** The held rolls, degrees, + the board's level-left side down. `ROLLS=none` runs with no hold at all. */
const ROLLS = (process.env.ROLLS ?? '5,10,20').toLowerCase() === 'none'
  ? [undefined] : (process.env.ROLLS ?? '5,10,20').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0').split(',').map(Number);
const YAW_FREE = (process.env.YAW ?? 'free') === 'free';
const PAYLOAD_Y = num('PAYLOAD_Y', 0.07);
const PAYLOAD_MASS = num('PAYLOAD_MASS', 73);
const HOLD_RAMP = num('HOLD_RAMP', 0.3);
const SETTLE = num('SETTLE', 4);
const WINDOW = num('WINDOW', 1);
const SECONDS = num('SECONDS', 7);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;

/** The deck point under the feet, board frame: `PLANT_SPEEDS`' own roll-moment station and 3.2y's reference point. */
const FEET_LOCAL = new Vector3(0, 0.07, -0.30);

const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const median = (v: number[]) => {
  const s = sorted(v);
  if (!s.length) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const span = (v: number[], d = 1) => {
  const s = sorted(v);
  return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–';
};
function emit(row: Record<string, unknown>, path: string): void { appendFileSync(path, `${JSON.stringify(row)}\n`); }

// ---- the Euler triple `rollspring.ts` holds the board in, copied unchanged ----
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

/**
 * `rollspring.ts`'s own rigid point payload, `roll-plant/plant.ts`'s `RIDER_POINT` with `PAYLOAD_Y` for its height.
 * One payload, not 3.2y's split pair: this round measures a force and not an inertia, so no spread is needed.
 */
const payloadsAt = () => [{ mass: PAYLOAD_MASS, point: { x: 0, y: PAYLOAD_Y, z: -0.30 } }];

const SOURCES = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth', 'suction'] as const;

interface Frame {
  t: number;
  /** °, the angle between `xDeck` and `eLevel`: the deck's roll about the heading from the world's level. */
  rollDeg: number;
  railDeg: number;
  /** N, the water's net force on the hull, resolved. `e` world-horizontal across the heading; `x`/`n`/`z` deck axes. */
  Fe: number;
  Fx: number;
  Fn: number;
  Fz: number;
  /** °, `atan(Fx / Fn)`: the felt vertical's own across tilt out of the deck normal, un-lagged. */
  tiltDeg: number;
  /** N, per source, on `xDeck` — the in-deck-plane across axis. */
  perSource: Record<string, number>;
  /** m/s², the pair's centre: the world velocity VECTOR differenced, projected after. */
  aeLevel: number;
  axCentre: number;
  /** m/s², `Δ(v · eLevel)/Δt`: the heading-following frame's residual, which is `rollspring.ts`'s own `sideForce`/m. */
  aeHead: number;
  /** m/s², Part 24's datum: the feet point's world velocity differenced as a vector, projected on `xDeck`. */
  axFeet: number;
  /** rad/s, the Euler yaw rate, and `speedThrough · ψ̇`, m/s²: the turn's own centripetal acceleration. */
  yawRate: number;
  turnAccel: number;
  /** °, the path's angle out of the heading in the level plane. */
  slipDeg: number;
  speedGround: number;
  speedThrough: number;
  draft: number;
  attached: boolean;
}

function oneRun(st: Stance, tow: number, hold: number | undefined, steer: number): Record<string, unknown> {
  const water = new Flat();
  const sample = createWaterSample();
  const board = new BoardBody({
    ...(RIDER === 'rigid' ? { payloads: payloadsAt() } : {}),
    ...(process.env.SUBSTEPS ? { substeps: Number(process.env.SUBSTEPS) } : {}),
    // `FINS=none`: the reference thruster removed (`BoardBodyOptions.fins = []`). This is the discriminating check on
    // §3's cancellation, not a configuration anybody rides.
    ...(process.env.FINS === 'none' ? { fins: [] } : {}),
  });
  board.place(
    new Vector3(0, -FLAT_DRAFT + board.shape.centerOfMass.y, 0),
    new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -FLAT_PITCH / DEG),
    new Vector3(0, 0, tow),
  );
  let rider: AttachedRider | undefined;
  if (RIDER === 'new' || RIDER === 'old') {
    rider = new AttachedRider(board.shape, { phase: 'standing', ...(RIDER === 'new' ? { rider: 'new' as const } : {}) });
    board.attach(rider);
    stance(rider, st);
    rider.steer = steer;
  }
  /** The pair's mass, kg: the board (and its rigid payload) plus the attached rider. */
  const pairMass = board.mass + (rider ? rider.mass : 0);

  // ---- 3.2y's captive hold, wrapped round the board's own substep (nothing in src/ changes) ----
  const b = board as Any;
  const original = b.substep.bind(b);
  const axisY = new Vector3(0, 1, 0);
  let held: number | undefined;
  let now = 0;
  b.substep = (h: number, w: SurfWater) => {
    if (hold !== undefined) {
      const q = board.orientation;
      const e = euler(q);
      if (held === undefined) held = e.roll;
      const share = HOLD_RAMP > 0 ? Math.min(1, now / HOLD_RAMP) : 1;
      const target = held + (hold - held) * share;
      q.copy(fromEuler(e.heading, e.pitch, target));
      b.updateRotation();
      const rates = eulerRates(q, board.angularVelocity);
      board.angularVelocity.set(0, 0, 0)
        .addScaledVector(axisY, YAW_FREE ? rates.a : 0)
        .addScaledVector(rates.e1, rates.b);
      if (!YAW_FREE) {
        // The captive condition: the path's angle held at the heading, as `roll-plant/plant.probe.ts` holds it.
        const v = board.velocity;
        const level = Math.hypot(v.x, v.z);
        const dir = euler(q).heading;
        v.x = level * Math.sin(dir);
        v.z = level * Math.cos(dir);
      }
      b.syncPosition();
    }
    if (tow) {
      const v = board.velocity;
      const level = Math.hypot(v.x, v.z);
      if (level > 1e-9) { v.x *= tow / level; v.z *= tow / level; }
    }
    original(h, w);
    now += h;
  };

  const nDeck = new Vector3();
  const xDeck = new Vector3();
  const zDeck = new Vector3();
  const eLevel = new Vector3();
  const fLevel = new Vector3();
  const sumF = new Vector3();
  const feetPoint = new Vector3();
  const feetVel = new Vector3();
  const dv = new Vector3();
  const lastCentre = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  const lastFeet = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  let lastVe = Number.NaN;
  const frames: Frame[] = [];

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance();
    board.step(STEP, water);
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);

    nDeck.set(0, 1, 0).applyQuaternion(board.orientation);
    xDeck.set(1, 0, 0).applyQuaternion(board.orientation);
    zDeck.set(0, 0, 1).applyQuaternion(board.orientation);
    fLevel.copy(zDeck).setY(0).normalize();
    eLevel.set(fLevel.z, 0, -fLevel.x);
    // `rollDeg` is the angle BETWEEN the two axes the discrepancy lives on, taken as `rollspring.ts` takes its `roll`.
    const rollDeg = Math.atan2(nDeck.dot(eLevel), nDeck.y) * DEG;
    const nW = new Vector3(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const railDeg = rollDeg - Math.atan2(nW.dot(eLevel), nW.y) * DEG;

    // The water's net force on the hull, N, world frame, mean over the step (`BoardBody.forces`).
    sumF.set(0, 0, 0);
    const perSource: Record<string, number> = {};
    for (const key of SOURCES) {
      const v = (board.forces as Record<string, Vector3>)[key];
      sumF.add(v);
      perSource[key] = v.dot(xDeck);
    }
    const Fe = sumF.dot(eLevel);
    const Fx = sumF.dot(xDeck);
    const Fn = sumF.dot(nDeck);
    const Fz = sumF.dot(zDeck);

    board.toWorld(FEET_LOCAL, feetPoint);
    board.velocityAt(feetPoint, feetVel);
    const centreVel = board.velocity;

    const aeLevel = Number.isFinite(lastCentre.x) ? dv.subVectors(centreVel, lastCentre).dot(eLevel) / STEP : Number.NaN;
    const axCentre = Number.isFinite(lastCentre.x) ? dv.subVectors(centreVel, lastCentre).dot(xDeck) / STEP : Number.NaN;
    const axFeet = Number.isFinite(lastFeet.x) ? dv.subVectors(feetVel, lastFeet).dot(xDeck) / STEP : Number.NaN;
    const ve = centreVel.dot(eLevel);
    const aeHead = Number.isFinite(lastVe) ? (ve - lastVe) / STEP : Number.NaN;
    lastCentre.copy(centreVel);
    lastFeet.copy(feetVel);
    lastVe = ve;

    const rates = eulerRates(board.orientation, board.angularVelocity);
    const speedThrough = (centreVel.x - cen.flowX) * zDeck.x + (centreVel.y - cen.flowY) * zDeck.y + (centreVel.z - cen.flowZ) * zDeck.z;
    const speedGround = Math.hypot(centreVel.x, centreVel.z);
    const slipDeg = (Math.atan2(centreVel.x, centreVel.z) - Math.atan2(fLevel.x, fLevel.z)) * DEG;
    let draft = -Infinity;
    const p = new Vector3();
    for (const patch of board.shape.patches) { board.toWorld(patch.position, p); draft = Math.max(draft, cen.surfaceY - p.y); }

    const frame: Frame = {
      t,
      rollDeg,
      railDeg,
      Fe,
      Fx,
      Fn,
      Fz,
      tiltDeg: Math.atan2(Fx, Fn) * DEG,
      perSource,
      aeLevel,
      axCentre,
      aeHead,
      axFeet,
      yawRate: rates.a,
      turnAccel: speedThrough * rates.a,
      slipDeg: ((slipDeg + 540) % 360) - 180,
      speedGround,
      speedThrough,
      draft,
      attached: rider ? rider.attached : true,
    };
    frames.push(frame);
    if (TRACE) {
      emit({ bar: 'aim-frame', rider: RIDER, yaw: YAW_FREE ? 'free' : '0', stance: st, tow, holdDeg: hold === undefined ? null : r(-hold * DEG, 2), steer, ...frame }, TRACE);
    }
    if (rider && !rider.attached) break;
  }

  const from = hold === undefined ? SETTLE : HOLD_RAMP + SETTLE;
  const inWindow = frames.filter((x) => x.t > from && x.t <= from + WINDOW && x.attached);
  const col = (pick: (x: Frame) => number) => median(inWindow.map(pick));
  const perSourceMedian: Record<string, number | null> = {};
  for (const key of SOURCES) perSourceMedian[key] = r(median(inWindow.map((x) => x.perSource[key])), 2);
  // The settle ladder: the same three columns over the 0.25 s ending at each of these times.
  const ladder = [0.5, 1, 2, 3, 4, 5].map((end) => {
    const w = frames.filter((x) => x.t > end - 0.25 && x.t <= end && x.attached);
    return w.length ? { t: end, Fe: r(median(w.map((x) => x.Fe)), 1), Fx: r(median(w.map((x) => x.Fx)), 1), axFeet: r(median(w.map((x) => x.axFeet)), 3) } : null;
  });

  const rollDeg = col((x) => x.rollDeg);
  const sinRoll = Math.sin(rollDeg / DEG);
  const Fe = col((x) => x.Fe);
  const Fx = col((x) => x.Fx);
  const Fn = col((x) => x.Fn);
  const Fz = col((x) => x.Fz);

  return {
    bar: 'aim',
    rider: RIDER,
    yaw: YAW_FREE ? 'free' : '0',
    stance: st,
    tow,
    holdDeg: hold === undefined ? null : r(-hold * DEG, 2),
    steer,
    pairMass: r(pairMass, 2),
    nFrames: inWindow.length,
    fellAtS: frames.length && !frames[frames.length - 1].attached ? r(frames[frames.length - 1].t, 3) : null,
    rollDeg: r(rollDeg, 2),
    railDeg: r(col((x) => x.railDeg), 2),
    // The forces, N, delivered.
    Fe: r(Fe, 1),
    Fx: r(Fx, 1),
    Fn: r(Fn, 1),
    Fz: r(Fz, 1),
    tiltDeg: r(col((x) => x.tiltDeg), 3),
    // The two slopes the discrepancy is quoted as: N per rad of roll and N per unit sin(roll), on each axis.
    FePerRad: rollDeg !== 0 ? r(Fe / (rollDeg / DEG), 1) : null,
    FexPerRad: rollDeg !== 0 ? r(Fx / (rollDeg / DEG), 1) : null,
    FePerSin: Math.abs(sinRoll) > 1e-6 ? r(Fe / sinRoll, 1) : null,
    FxPerSin: Math.abs(sinRoll) > 1e-6 ? r(Fx / sinRoll, 1) : null,
    /**
     * The share of the net water force that lies along the deck normal, `Fn / |ΣF|`, on the deck's own orthogonal
     * triple (`xDeck`, `nDeck`, `zDeck`). `Fe` is NOT in this triple — it is `eLevel`, which is not perpendicular to
     * any of them — so it must not appear here. 1.0000 means a force exactly along the deck normal, which is the
     * condition under which it is `sin(roll)` of itself on `eLevel` and exactly zero on `xDeck`.
     */
    normalShare: r(Fn / Math.hypot(Fx, Fn, Fz), 4),
    /** The same with the hull's own drag taken out, since `Fz` is mostly drag and is not part of the across question. */
    normalShareAcross: r(Fn / Math.hypot(Fx, Fn), 5),
    // The accelerations, m/s².
    aeLevel: r(col((x) => x.aeLevel), 3),
    axCentre: r(col((x) => x.axCentre), 3),
    aeHead: r(col((x) => x.aeHead), 3),
    axFeet: r(col((x) => x.axFeet), 3),
    /** `Fx / pairMass`: the across authority as an acceleration, against the body's 0.42–1.41 m/s² demand. */
    axFromFx: r(Fx / pairMass, 3),
    /** `Fe / pairMass`: what Part 24 §6's arithmetic computed. */
    aeFromFe: r(Fe / pairMass, 3),
    yawRate: r(col((x) => x.yawRate), 4),
    turnAccel: r(col((x) => x.turnAccel), 3),
    slipDeg: r(col((x) => x.slipDeg), 3),
    speedGround: r(col((x) => x.speedGround), 3),
    speedThrough: r(col((x) => x.speedThrough), 3),
    draft: r(col((x) => x.draft), 4),
    perSource: perSourceMedian,
    ladder,
  };
}

const rows: Record<string, unknown>[] = [];
const started = Date.now();
for (const st of STANCES) {
  for (const tow of TOWS) {
    for (const hold of ROLLS) {
      for (const steer of STEERS) {
        const row = oneRun(st, tow, hold === undefined ? undefined : -hold / DEG, steer);
        rows.push(row);
        console.log(JSON.stringify(row));
        if (OUT) emit(row, OUT);
      }
    }
  }
}

const n = (x: unknown) => Number(x);
console.log(`## aim — the board's across authority, rider ${RIDER}, yaw ${YAW_FREE ? 'free' : 'held at 0'}`);
console.log(`   ${rows.length} runs, ${Math.round((Date.now() - started) / 1000)} s wall · flat still water, towed · pair ${rows[0]?.pairMass} kg · ${rows[0]?.nFrames} frames a window`);
console.log('   AXES (all world-frame unit vectors): eLevel = horizontal, across the heading (3.2y and PLANT_SPEEDS own Y);');
console.log('         xDeck = the deck\'s own across axis, the board\'s local +x (trimbank.ts\'s acrossAxis, the fall test\'s axis).');
console.log('   Forces are DELIVERED (read back from BoardBody.forces after the solve), N, mean over the step.');
console.log('');
console.log('   tow, m/s | roll | rail | Fe (horiz across), N | Fx (deck across), N | Fn (deck normal), N | tilt=atan(Fx/Fn) | Fe/m | Fx/m | yaw rate | v·ψ̇ | slip | axFeet | draft');
for (const x of rows) {
  console.log(`   ${f(n(x.tow), 1).padStart(8)} | ${f(n(x.rollDeg), 1).padStart(5)}° | ${f(n(x.railDeg), 1).padStart(5)}° | ${f(n(x.Fe), 1).padStart(20)} | ${f(n(x.Fx), 1).padStart(19)} | ${f(n(x.Fn), 1).padStart(19)} | ${f(n(x.tiltDeg), 2).padStart(16)}° | ${f(n(x.aeFromFe), 2).padStart(5)} | ${f(n(x.axFromFx), 3).padStart(6)} | ${f(n(x.yawRate), 4).padStart(8)} | ${f(n(x.turnAccel), 2).padStart(5)} | ${f(n(x.slipDeg), 2).padStart(5)}° | ${f(n(x.axFeet), 3).padStart(6)} | ${f(n(x.draft), 3)}`);
}
console.log('');
console.log('   the slopes, both axes: N per rad of roll and N per unit sin(roll)');
console.log('   tow, m/s | roll | Fe per rad | Fx per rad | Fe per sin | Fx per sin');
for (const x of rows) {
  console.log(`   ${f(n(x.tow), 1).padStart(8)} | ${f(n(x.rollDeg), 1).padStart(5)}° | ${f(n(x.FePerRad), 1).padStart(10)} | ${f(n(x.FexPerRad), 1).padStart(10)} | ${f(n(x.FePerSin), 1).padStart(10)} | ${f(n(x.FxPerSin), 1).padStart(10)}`);
}
console.log('');
console.log('   Fx per source, N (in the plane of the deck, on xDeck):');
console.log(`   tow | roll | ${SOURCES.join(' | ')}`);
for (const x of rows) {
  const ps = x.perSource as Record<string, number | null>;
  console.log(`   ${f(n(x.tow), 1)} | ${f(n(x.rollDeg), 1)}° | ${SOURCES.map((k) => f(n(ps[k]), 2)).join(' | ')}`);
}
console.log('');
console.log(`   the two across-frame accelerations, m/s²: aeLevel (the pair's own horizontal lateral) ${span(rows.map((x) => n(x.aeLevel)), 2)}`);
console.log(`     against aeHead (Δ(v·eLevel)/Δt, which is rollspring's sideForce/m) ${span(rows.map((x) => n(x.aeHead)), 2)}`);
console.log(`     against axFeet (Part 24's net base drift datum, on the DECK's across axis) ${span(rows.map((x) => n(x.axFeet)), 3)}`);
console.log(`   the turn's own centripetal acceleration, speedThrough · ψ̇: ${span(rows.map((x) => n(x.turnAccel)), 2)} m/s²`);
console.log(`   the across authority, Fx / pairMass: ${span(rows.map((x) => n(x.axFromFx)), 3)} m/s², against the body's measured demand of 0.42–1.41`);
console.log(`   what Part 24 §6 computed instead, Fe / pairMass: ${span(rows.map((x) => n(x.aeFromFe)), 2)} m/s²`);
if (rows.some((x) => x.fellAtS !== null)) console.log(`   runs that fell: ${rows.filter((x) => x.fellAtS !== null).length} of ${rows.length}`);
console.log(`   the settle ladder (Fe, Fx, axFeet over the 0.25 s ending at 0.5/1/2/3/4/5 s) is in each row's "ladder".`);
