/**
 * Step 3.3a: **the board's own across authority, and where the base's acceleration actually goes.**
 *
 * Part 24 (step 3.2z) closed the body side of the fall — three roll authorities spent, the hull in the right physical
 * band, the fall test kinder than a human's — and left one mechanism unmeasured: *"the base's across-acceleration is
 * busy and unaimed"*, median absolute **1.17–3.00 m/s²** with peaks **6.93–25.55** against a **net** rate of
 * **0.00–0.38**, while the felt vertical stays **7.4–15.9° across the deck** right through to the fall. Its closing
 * line: *"the next measurement is the board's own across authority under this rider ... I did not measure it and I am
 * not claiming the board can deliver it."* It also handed over a discrepancy it would not resolve: 3.2y's hull side
 * force of **−384 N/rad** of roll, which at the 20–63° these runs reach should give **1.8–5.6 m/s²**, against the
 * 0.00–0.38 net.
 *
 * This probe measures three things on `trimbank.ts`'s own cell, and the first of them resolves the discrepancy before
 * any supply question is asked.
 *
 * ## 1. What the two numbers are, and why they are not the same quantity
 *
 * `trimbank.ts`'s `baseMeanAccel` — Part 24's "net across rate" — is `|feetAcross| / t`, and `feetAcross` is the
 * base's velocity **in the board's rotating frame with the component along the felt vertical removed**. That is the
 * quantity the fall test's velocity term is built from, and it is the right one for the test; it is **not** the base's
 * acceleration in any inertial frame, and a board that is accelerating hard and steadily sideways in the world can
 * carry a `feetAcross` that never grows, because the frame it is resolved in rolls with the board and the felt
 * vertical it is projected against rotates with the acceleration itself.
 *
 * So this probe measures the base's across acceleration **three** ways and prints them side by side:
 * - `latPair`: the **pair's** (board + body) horizontal acceleration along the board's own level-left axis, m/s², from
 *   differencing the pair's momentum exactly as `captureStep` does before it low-passes it. Only the water and gravity
 *   move the pair's centre of mass, and gravity has no horizontal component, so this **is** the water's net horizontal
 *   side force divided by the pair's mass, with the rider's own pushes cancelled inside the pair.
 * - `latWater`: the same thing read off the other end — `BoardBody.forces`, all ten water entries summed and projected
 *   on that same horizontal axis, over the pair's mass. `latPair − latWater` is a seatbelt, not a result: the two are
 *   the same Newton's-third-law quantity read from the momentum and from the force ledger, and they must agree.
 * - `feetAccel`: 3.2z's own column, the feet point's world velocity differenced and projected on the board's +x axis
 *   **as it is now**. Kept so this round's rows can be compared with Part 24's table key by key.
 *
 * ## 2. Where the authority has already gone: the felt vertical, in the world
 *
 * The capture test's `tiltAcross` is the angle between the deck's normal and **`pairFelt`**, the pair's low-passed
 * specific force (`a + g ŷ`) — so the tilt the body slides down is not the deck's roll, it is the deck's roll **less
 * whatever the board's own lateral acceleration has already rotated the felt vertical by**. This probe prints that
 * split frame by frame:
 * - `feltWorld`: `pairFelt`'s own tilt from the **world** vertical, in the across plane, °;
 * - `roll`: the deck's roll about the heading from the world's level, `trimbank.ts`'s own column and sense;
 * - `tilt`: the test's `tiltAcross`, the residual between them.
 * `tiltCheck = roll − feltWorld − tilt` is the identity those three must satisfy, printed so the datums are pinned by
 * a number and not by a sentence. A large `feltWorld` with a small `tilt` means the board is **already aimed** and the
 * residual is all that is left to find; a small `feltWorld` means it is not.
 *
 * ## 3. The supply: what a steer buys, and how fast
 *
 * `STEER` holds the stick at a constant value from `STEER_FROM` s. On the new rider the stick reaches the plant
 * through one channel and it is a visible one: `prepareBank` turns `steer × RAIL_RANGE` (50°) into `leanAsked`, the
 * balance's own lean reference, eased at `leanPace` and capped by `most = atan(v²/(g·TURN_RADIUS))` — the lean a turn
 * at the board's speed through a 4.5 m radius holds. The rider then leans, the ankle rolls the board, and the rolled
 * hull and the fins make the side force. **There is no other steer**: nothing applies a yaw moment or a lateral force
 * to the board directly, so a steer costs exactly what a lean costs and the measurement has to say so.
 *
 * `STEER_SIGN=roll` multiplies `STEER` by the sign of the deck's roll at `STEER_FROM`, so a positive `STEER` steers
 * **into** the capsize (the way the board is already going over) and a negative one fights it. The two are different
 * experiments and the probe never averages them.
 *
 * Timing columns, because a correction that arrives after 0.25 s is no use against a capsize of τ 0.245 s:
 * `latAt100/200/300/500` are `latPair` at 0.1, 0.2, 0.3 and 0.5 s after `STEER_FROM`, and `latRiseTo` is the first
 * time `|latPair|` passes `RISE` m/s² (default 1.3, the low end of `g · sin(the felt tilt)`), measured from
 * `STEER_FROM`.
 *
 * ## The harness, and what it shares with 3.2
 *
 * `trimbank.ts`'s cell, copied so this file stands alone and not imported, because 3.2's probes are a published
 * record: the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s), the board placed AHEAD of the crest and
 * SIDE off the fall line, the entry speed the face's own plus EXTRAS, the stances, `water.advance(STEP)` every frame,
 * 9 s a run. **Twelve runs a cell** (two stances × six entry speeds). `bankPeakDeg`, `rollPeakDeg`, `railPeakDeg`,
 * `fellAtS` and `driftPeakDeg` are carried deliberately: at `STEER=0` they must reproduce Part 24's published twelve
 * (12 of 12 at 0.77–1.70 s, bank peak 20.7–65.7°, rail peak 10.9–62.9°, drift peak 1.9–4.9°), which is this probe's
 * check that it is running the same cell as 3.2w–3.2z and not a new one.
 *
 * **No source file is touched and no switch reaches the game.** Everything here is read off the live instance
 * (private to TypeScript, present at run time) or set on it, and `STEER` is the player's own stick.
 *
 * Run from the repository's root (the bundle needs `node_modules` beside it):
 *   npx rolldown docs/research/new-rider/3.3/across.ts -o <scratch>/ac.mjs --format esm --platform node
 *   RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/s0.jsonl node <scratch>/ac.mjs
 *   RIDER=new STEER=1 STEER_SIGN=roll STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/ac.mjs
 *   RIDER=old STEER=1 STEER_SIGN=roll STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/ac.mjs
 *   HULL=rail RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/ac.mjs
 *   RIDER=new STEER=1 STEER_SIGN=roll STANCES=tall EXTRAS=0 TRACE=<scratch>/t.jsonl node <scratch>/ac.mjs
 *
 * Env: RIDER=new|old, STANCES, EXTRAS, STEER, STEER_SIGN=roll|fixed, STEER_FROM, RISE, HULL=rail, SECONDS, SIDE,
 * AHEAD, FACE=h,slope,speed, DEPTH, SUBSTEPS, OUT (one JSON line a run), TRACE (one JSON line a frame).
 *
 * **`HULL=rail`** builds the board with step 3.2u's shaped rail band (`?hull=rail`), which is opt-in and **off** in
 * the game: the default board's section is a flat sheet with a knife edge. It is here because the band is the one
 * existing switch that moves where the lateral force comes from, so §3's question — what makes the side force — gets
 * an answer with and without it. The default stays the default; no `HULL` is the game's own board.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;
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
const STEER = num('STEER', 0);
const STEER_FROM = num('STEER_FROM', 0);
const STEER_SIGN = process.env.STEER_SIGN === 'roll' ? 'roll' : 'fixed';
const RISE = num('RISE', 1.3);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;

/** All ten of `BoardBody.forces` — turnpath's own nine plus `suction`, which is 0 on the default flat-bottomed board. */
const WATER_KEYS = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth', 'suction'] as const;

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
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
/** The largest value, the NaNs dropped (3.2z's trap: `Math.max(...)` over a column with one NaN returns NaN). */
const peak = (v: number[]) => {
  const s = sorted(v);
  return s.length ? s[s.length - 1] : Number.NaN;
};
const span = (v: number[], d = 1) => {
  const s = sorted(v);
  return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–';
};
/** A least-squares slope of y on x through a fitted intercept, with the fit's R². */
function fit(xs: number[], ys: number[]): { slope: number; r2: number; n: number } {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < xs.length; i += 1) if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) { x.push(xs[i]); y.push(ys[i]); }
  const n = x.length;
  if (n < 3) return { slope: Number.NaN, r2: Number.NaN, n };
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const slope = sxx > 0 ? sxy / sxx : Number.NaN;
  return { slope, r2: sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : Number.NaN, n };
}

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown, path?: string): void {
  if (path) appendFileSync(path, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

interface Frame {
  t: number;
  steer: number;
  /** °: the body's lean on its feet, the deck's roll about the heading from the WORLD's level (+ the board's level-left side down), the rail against the water's own normal. */
  bank: number;
  roll: number;
  rail: number;
  /** °: `pairFelt`'s tilt from the WORLD vertical in the across plane, and the test's own `tiltAcross` (felt against the DECK). */
  feltWorld: number;
  tilt: number;
  /**
   * `roll − feltWorld + tilt`, °: the identity the three must satisfy. A seatbelt on the datums, not a result, and the
   * **plus** is measured: `tiltAcross` is taken on the board's +x in the board's frame and `roll`/`feltWorld` on the
   * horizontal projection of that axis, and the two senses are opposite. The probe printed a 32.0° residual with a
   * minus before this was checked frame by frame.
   */
  tiltCheck: number;
  /** `pairFelt` itself, m/s²: its component on the horizontal level-left axis, its vertical, and its length — so `feltWorld` is read and not inferred. */
  pfLat: number;
  pfUp: number;
  pfMag: number;
  /**
   * The probe's **own** felt vertical, so the bank gain does not depend on a field only the new rider writes
   * (`captureStep` runs for the free body alone, so `pairFelt` on the old rider never leaves its constructed
   * `(0, g, 0)`): `pairAy` is the pair's vertical acceleration from the same momentum difference `latPair` comes from,
   * and `feltOwn` is `atan2(latPair, g + pairAy)` in degrees — the specific force's own tilt from the world vertical in
   * the across plane, **un-low-passed**, where `feltWorld` carries `SPECIFIC_FORCE_TIME`'s 0.1 s lag.
   */
  pairAy: number;
  feltOwn: number;
  /**
   * The lateral force by source, N, on that same horizontal level-left axis: every entry of `BoardBody.forces`
   * projected on it. This is the "through what inputs" ledger — which part of the water makes the side force, and so
   * what a controller would have to command. Each entry is a force the water puts on the hull and whose reaction the
   * water carries; nothing here is applied by the rider.
   */
  bySource: Record<string, number>;
  /** m/s²: the pair's horizontal acceleration along the board's level-left axis (momentum differenced), and the same from the water force ledger. */
  latPair: number;
  latWater: number;
  /** m/s²: 3.2z's own columns, the world velocity differenced and projected on the board's +x axis as it is now. */
  feetAccel: number;
  bodyAccel: number;
  /** m/s: the base's and the body's across velocity the TEST's way (felt-vertical component removed, board frame), and their difference. */
  bodyAcross: number;
  feetAcross: number;
  relAcross: number;
  /** m/s: the base's RAW world across velocity on the board's +x axis — no felt removal, for the frame question. */
  feetAcrossRaw: number;
  /** The capture test's own terms. */
  margin: number;
  past: number;
  omega: number;
  capSpeedTerm: number;
  /** °/s about the world vertical, and `speed × that` in m/s² — Forsyth's steady-turn identity on our own board. */
  turnRate: number;
  vOmega: number;
  speed: number;
  drift: number;
  /** °: the lean the steer asks the balance for (`AttachedRider.leanAsked`), the only channel the stick has on this rider. */
  leanAsked: number;
}

interface Inner {
  frictionUsed?: number;
  kneeUsed?: number;
  leanAsked?: number;
  bankReference?: number;
  captureFeet?: { x: number; y: number; z: number };
  captureFelt?: { x: number; y: number; z: number };
  /** The pair's low-passed specific force in the WORLD, m/s² (`AttachedRider.pairFelt`): what `tiltAcross` is taken against. */
  pairFelt?: { x: number; y: number; z: number };
}

/**
 * Every frame of every run in the cell, pooled. The per-run regressions below are quoted with their R² and several of
 * them are not worth quoting — a run that never leaves 20° of roll has no slope in it — so the hull's own slope and the
 * bank gain are taken over the **pool**, where the angle actually spans a range, and the per-run spread is printed
 * beside it so a reader can see how much of the pool is one run's.
 */
const pool: Frame[] = [];

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
  // `HULL=rail` is the shaped rail band (`?hull=rail`, step 3.2u), opt-in in the game and off by default: the default
  // board's section is a flat sheet with a knife edge, whose rail side-face foils carry 3 % of the side force measured
  // below. The band is the one existing switch that changes where the lateral force comes from, so the bank gain is
  // measured with it as well as without — no new code, and the default stays the default.
  const board = new BoardBody({ ...(process.env.HULL === 'rail' ? { hull: 'rail' as const } : {}) });
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
  });
  board.attach(rider);
  stance(rider, st);
  rider.steer = 0;
  const inner = rider as unknown as Inner;
  const pairMass = board.mass + rider.mass;
  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const vRel = new Vector3();
  const total = new Vector3();
  const feetPoint = new Vector3();
  const feetVel = new Vector3();
  const acrossAxis = new Vector3();
  const feetDelta = new Vector3();
  const bodyDelta = new Vector3();
  const boardInv = new Quaternion();
  const momentum = new Vector3();
  const lastMomentum = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  const lastFeetVel = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  const lastBodyVel = new Vector3(Number.NaN, Number.NaN, Number.NaN);
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let steerSign = 0;
  let lastHeading = Number.NaN;
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    // `prepareBank`'s own two angles, as `trimbank.ts` recomputes them: the deck's roll about the heading from the
    // world's level (what the ankle spans), and the rail against the water's own normal (what the hull feels).
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    // The steer. Its sign is taken ONCE, at STEER_FROM, from the roll the board already has, so `STEER>0` means
    // "into the capsize" in every run whichever way that run went over.
    if (STEER !== 0 && t >= STEER_FROM - 1e-9) {
      if (steerSign === 0) steerSign = STEER_SIGN === 'roll' ? (Math.sign(roll) || 1) : 1;
      rider.steer = STEER * steerSign;
    }
    // The pair's own horizontal across acceleration, m/s². `captureStep` builds `pairFelt` from exactly this momentum
    // difference before low-passing it; only the water and gravity move the pair's centre of mass and gravity is
    // vertical, so this IS the water's net horizontal side force over the pair's mass.
    momentum.copy(board.velocity).multiplyScalar(board.mass).addScaledVector(rider.velocity, rider.mass);
    const latPair = Number.isFinite(lastMomentum.x)
      ? (bodyDelta.subVectors(momentum, lastMomentum).dot(side)) / (STEP * pairMass)
      : Number.NaN;
    const pairAy = Number.isFinite(lastMomentum.x) ? (momentum.y - lastMomentum.y) / (STEP * pairMass) : Number.NaN;
    lastMomentum.copy(momentum);
    // The same quantity off the force ledger. `BoardBody.forces` are mean forces over the latest step.
    total.set(0, 0, 0);
    for (const key of WATER_KEYS) total.add((board.forces as unknown as Record<string, Vector3>)[key]);
    const latWater = total.dot(side) / pairMass;
    // The felt vertical, in the world and against the deck. `pairFelt` is `a + g ŷ`, low-passed SPECIFIC_FORCE_TIME.
    const pf = inner.pairFelt;
    const feltWorld = pf ? Math.atan2(pf.x * side.x + pf.z * side.z, pf.y) * DEG : Number.NaN;
    const cap = rider.human.state;
    const tilt = cap.tiltAcross * DEG;
    // Step 3.2z's split, taken the test's own way: the removal of the felt-vertical component is linear in the
    // velocity, so applying it to each half separately gives two numbers that add back to `speedAcross` exactly.
    boardInv.copy(board.orientation).invert();
    let bodyAcross = Number.NaN;
    let feetAcross = Number.NaN;
    let feetAcrossRaw = Number.NaN;
    acrossAxis.set(1, 0, 0).applyQuaternion(board.orientation);
    if (cap.omega > 0 && inner.captureFelt) {
      const g = Math.hypot(inner.captureFelt.x, inner.captureFelt.y, inner.captureFelt.z);
      const nx = g > 1e-6 ? inner.captureFelt.x / g : 0;
      const ny = g > 1e-6 ? inner.captureFelt.y / g : 1;
      const nz = g > 1e-6 ? inner.captureFelt.z / g : 0;
      const across = (v: Vector3) => {
        bodyDelta.copy(v).applyQuaternion(boardInv);
        return bodyDelta.x - (bodyDelta.x * nx + bodyDelta.y * ny + bodyDelta.z * nz) * nx;
      };
      bodyAcross = across(rider.velocity);
      if (inner.captureFeet) {
        feetPoint.set(inner.captureFeet.x, inner.captureFeet.y, inner.captureFeet.z);
        feetAcross = across(board.velocityAt(feetPoint, feetVel));
        feetAcrossRaw = feetVel.dot(acrossAxis);
      }
    }
    // **3.2z's `cap.omega` trap, in a new place, and this probe fell into it once.** `captureFeet` is a constructed
    // `Vector3`, so `inner.captureFeet` is ALWAYS truthy and `if (!inner.captureFeet)` guards nothing: on the old
    // rider, whose `captureStep` never runs, the block above is skipped and `feetVel` keeps the zero it was built
    // with, so `feetAccel` printed a tidy **0.00 m/s²** for twelve runs and `deficitMean` silently became the body's
    // own mean. The guard is `cap.omega > 0`, which is the one test that says the capture state is live — the old
    // rider has no capture point, so it has no feet velocity here and none is quoted.
    if (!(cap.omega > 0) || !inner.captureFelt) feetVel.set(Number.NaN, Number.NaN, Number.NaN);
    const feetAccel = Number.isFinite(lastFeetVel.x) ? feetDelta.subVectors(feetVel, lastFeetVel).dot(acrossAxis) / STEP : Number.NaN;
    const bodyAccel = Number.isFinite(lastBodyVel.x) ? bodyDelta.subVectors(rider.velocity, lastBodyVel).dot(acrossAxis) / STEP : Number.NaN;
    lastFeetVel.copy(feetVel);
    lastBodyVel.copy(rider.velocity);
    vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
    const speed = vRel.length();
    const heading = Math.atan2(fwd.x, fwd.z);
    let turnRate = Number.NaN;
    if (Number.isFinite(lastHeading)) {
      let d = heading - lastHeading;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      turnRate = (d / STEP) * DEG;
    }
    lastHeading = heading;
    const drift = Math.hypot(vRel.x, vRel.z) > 0.05
      ? Math.atan2(vRel.x * fwd.z - vRel.z * fwd.x, vRel.x * fwd.x + vRel.z * fwd.z) * DEG
      : 0;
    const frame: Frame = {
      t,
      steer: rider.steer,
      bank: rider.bank.angle * DEG,
      roll,
      rail,
      feltWorld,
      tilt,
      tiltCheck: roll - feltWorld + tilt,
      pfLat: pf ? pf.x * side.x + pf.z * side.z : Number.NaN,
      pfUp: pf ? pf.y : Number.NaN,
      pfMag: pf ? Math.hypot(pf.x, pf.y, pf.z) : Number.NaN,
      pairAy,
      feltOwn: Math.atan2(latPair, G + pairAy) * DEG,
      bySource: Object.fromEntries(WATER_KEYS.map((k) => [k, (board.forces as unknown as Record<string, Vector3>)[k].dot(side)])),
      latPair,
      latWater,
      feetAccel,
      bodyAccel,
      bodyAcross,
      feetAcross,
      relAcross: bodyAcross - feetAcross,
      feetAcrossRaw,
      margin: cap.margin,
      past: cap.past,
      omega: cap.omega,
      capSpeedTerm: cap.omega > 0 ? cap.speedAcross / cap.omega : Number.NaN,
      turnRate,
      vOmega: speed * (turnRate / DEG),
      speed,
      drift,
      leanAsked: (inner.leanAsked ?? inner.bankReference ?? 0) * DEG,
    };
    frames.push(frame);
    pool.push(frame);
    if (TRACE) emit(frame, TRACE);
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  const col = (k: keyof Frame) => frames.map((x) => Number(x[k]));
  const abs = (k: keyof Frame) => frames.map((x) => Math.abs(Number(x[k])));
  const last = frames[frames.length - 1];
  // 3.2z's rule: the split is read on the latest frame where the halves still reconstruct the test's own number,
  // because on the separation frame the rider's velocity and the feet's point have already been re-set.
  const consistent = frames.filter((x) => Math.abs(x.relAcross - x.capSpeedTerm * x.omega) < 0.01);
  const split = consistent[consistent.length - 1] ?? last;
  /** The frames from STEER_FROM on, in the sign the steer was applied in: the window every supply column is taken over. */
  const after = frames.filter((x) => x.t >= STEER_FROM - 1e-9);
  const atAfter = (dt: number) => after.find((x) => x.t >= STEER_FROM + dt - 1e-9)?.latPair ?? Number.NaN;
  const signed = (v: number) => (steerSign ? v * steerSign : v);
  const rise = after.find((x) => Math.abs(x.latPair) >= RISE);
  return {
    bar: 'across', rider: RIDER, stance: st, extra, steer: STEER, steerSign, steerFrom: STEER_FROM,
    fell, fellAtS: r(fellAt, 2), frames: frames.length,
    /** The cross-check against Part 24's published twelve: at STEER=0 these must reproduce them. */
    bankPeakDeg: r(peak(abs('bank')), 1), rollPeakDeg: r(peak(abs('roll')), 1), railPeakDeg: r(peak(abs('rail')), 1),
    driftPeakDeg: r(peak(abs('drift')), 1), speedAtFall: r(last?.speed ?? Number.NaN, 2),
    /** §1: the base's across acceleration, three ways. `latPair` and `latWater` are the pair's; both signed toward the board's level-left. */
    latPairMedian: r(median(col('latPair')), 2), latPairMeanSigned: r(mean(col('latPair')), 2),
    latPairPeak: r(peak(abs('latPair')), 2), latPairAbsMedian: r(median(abs('latPair')), 2),
    latWaterMeanSigned: r(mean(col('latWater')), 2), latWaterAbsMedian: r(median(abs('latWater')), 2),
    /** The seatbelt: the momentum route against the force-ledger route, m/s². */
    latResidualPeak: r(peak(frames.map((x) => Math.abs(x.latPair - x.latWater))), 3),
    latResidualMedian: r(median(frames.map((x) => Math.abs(x.latPair - x.latWater))), 3),
    /** 3.2z's own two columns, so the rows join Part 24's table. */
    feetAccelAbsMedian: r(median(abs('feetAccel')), 2), feetAccelPeak: r(peak(abs('feetAccel')), 2),
    feetAccelMeanSigned: r(mean(col('feetAccel')), 2),
    bodyAccelAbsMedian: r(median(abs('bodyAccel')), 2), bodyAccelMeanSigned: r(mean(col('bodyAccel')), 2),
    /** Part 24's `baseMeanAccel`: `|feetAcross| / t`, the quantity its "net across rate" column is. */
    baseMeanAccel: r(Math.abs((split?.feetAcross ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
    bodyMeanAccel: r(Math.abs((split?.bodyAcross ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
    /** The base's RAW world across velocity and the mean rate it built it at — the same book-keeping without the felt removal and without the frame's roll. */
    feetAcrossRawPeak: r(peak(abs('feetAcrossRaw')), 3),
    feetAcrossRawMeanRate: r(Math.abs((split?.feetAcrossRaw ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
    /** §2: where the authority has already gone. */
    feltWorldMedian: r(median(col('feltWorld')), 1), feltWorldPeak: r(peak(abs('feltWorld')), 1),
    feltWorldAtFall: r(last?.feltWorld ?? Number.NaN, 1),
    tiltMedian: r(median(col('tilt')), 1), tiltAtFall: r(last?.tilt ?? Number.NaN, 1),
    rollAtFall: r(last?.roll ?? Number.NaN, 1),
    tiltCheckPeak: r(peak(abs('tiltCheck')), 3),
    /** `pairFelt` read, not inferred: its lateral and vertical parts and its length at the fall, m/s². */
    pfLatAtFall: r(last?.pfLat ?? Number.NaN, 2), pfUpAtFall: r(last?.pfUp ?? Number.NaN, 2),
    pfMagAtFall: r(last?.pfMag ?? Number.NaN, 2), pfUpMedian: r(median(col('pfUp')), 2),
    /**
     * **The bank gain**: a least-squares slope of the felt vertical's own tilt on the deck's roll, °/°. A banked turn
     * that holds its lean has 1.0 here, and whatever it falls short by is the tilt the body is left sliding down. This
     * is the loop "roll → side force → felt vertical" read end to end, in the one unit where the answer has a datum.
     */
    feltPerRoll: r(fit(col('roll'), col('feltWorld')).slope, 3),
    feltPerRollR2: r(fit(col('roll'), col('feltWorld')).r2, 3),
    /** The same gain as a plain ratio at the fall, which needs no fit and no window: the felt vertical's tilt over the deck's roll. */
    feltOverRollAtFall: r((last?.feltWorld ?? Number.NaN) / (last?.roll ?? Number.NaN), 3),
    /**
     * The deficit the base has to close, m/s²: the body's own mean signed across acceleration less the base's. This is
     * the demand stated in the supply's own units — not `g · sin(tilt)`, which is the forcing before the body resists
     * any of it, and not Part 24's 0.00–0.38, which is a frame-relative velocity over a time.
     */
    deficitMean: r(mean(col('bodyAccel')) - mean(col('feetAccel')), 2),
    /** `g · sin(the felt tilt)`: the across forcing the body is left with, m/s². */
    tiltDemandAtFall: r(G * Math.sin(Math.abs(last?.tilt ?? Number.NaN) / DEG), 2),
    tiltDemandMedian: r(G * Math.sin(Math.abs(median(abs('tilt'))) / DEG), 2),
    /** The hull's own lateral authority under this rider: a least-squares slope of `latPair` on the rail, m/s² per rad, with its R². */
    latPerRailSlope: r(fit(frames.map((x) => x.rail / DEG), col('latPair')).slope, 1),
    latPerRailR2: r(fit(frames.map((x) => x.rail / DEG), col('latPair')).r2, 3),
    latPerRollSlope: r(fit(frames.map((x) => x.roll / DEG), col('latPair')).slope, 1),
    latPerRollR2: r(fit(frames.map((x) => x.roll / DEG), col('latPair')).r2, 3),
    /** §3: the turn itself. */
    turnRateMedian: r(median(col('turnRate')), 1), turnRatePeak: r(peak(abs('turnRate')), 1),
    vOmegaMedian: r(median(col('vOmega')), 2), vOmegaPeak: r(peak(abs('vOmega')), 2),
    leanAskedPeakDeg: r(peak(abs('leanAsked')), 1),
    /** The timing: `latPair` at 0.1, 0.2, 0.3, 0.5 s after the steer, signed INTO the steer, and when it first passed RISE. */
    latAt100: r(signed(atAfter(0.1)), 2), latAt200: r(signed(atAfter(0.2)), 2),
    latAt300: r(signed(atAfter(0.3)), 2), latAt500: r(signed(atAfter(0.5)), 2),
    latRiseTo: r(rise ? rise.t - STEER_FROM : Number.NaN, 3), riseBar: RISE,
    /**
     * The same four samples at ABSOLUTE times, un-signed. The runs are deterministic and identical up to `STEER_FROM`,
     * so differencing these against the `STEER=0` cell's own row for the same stance and entry speed gives the steer's
     * **own increment** and its rise — which the signed columns above cannot, because the board is already
     * accelerating sideways before any steer is applied.
     */
    latAbs400: r(frames.find((x) => x.t >= 0.4 - 1e-9)?.latPair ?? Number.NaN, 2),
    latAbs500: r(frames.find((x) => x.t >= 0.5 - 1e-9)?.latPair ?? Number.NaN, 2),
    latAbs600: r(frames.find((x) => x.t >= 0.6 - 1e-9)?.latPair ?? Number.NaN, 2),
    latAbs800: r(frames.find((x) => x.t >= 0.8 - 1e-9)?.latPair ?? Number.NaN, 2),
    rollAbs800: r(frames.find((x) => x.t >= 0.8 - 1e-9)?.roll ?? Number.NaN, 1),
    /** The probe's own un-low-passed felt tilt, available on both riders: median, at the fall, and its gain on the roll. */
    feltOwnMedian: r(median(col('feltOwn')), 1), feltOwnAtFall: r(last?.feltOwn ?? Number.NaN, 1),
    /** The lateral force by source over the run, N: the median signed and the peak absolute of each water entry. */
    byMedian: Object.fromEntries(WATER_KEYS.map((k) => [k, r(median(frames.map((x) => x.bySource[k])), 1)])),
    byPeak: Object.fromEntries(WATER_KEYS.map((k) => [k, r(peak(frames.map((x) => Math.abs(x.bySource[k]))), 1)])),
    /** The fall test, at the fall. */
    marginAtFall: r(last?.margin ?? Number.NaN, 3), pastAtFall: r(last?.past ?? Number.NaN, 3),
    relAcrossAtFall: r(split?.relAcross ?? Number.NaN, 3),
    bodyAcrossAtFall: r(split?.bodyAcross ?? Number.NaN, 3), feetAcrossAtFall: r(split?.feetAcross ?? Number.NaN, 3),
    relAcrossMeanRate: r(Math.abs((split?.relAcross ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
    checkAtFall: r((split?.relAcross ?? Number.NaN) - (split?.capSpeedTerm ?? Number.NaN) * (split?.omega ?? Number.NaN), 4),
    splitAtS: r(split?.t ?? Number.NaN, 3),
  };
}

const rows: Record<string, unknown>[] = [];
const t0 = Date.now();
for (const st of STANCES) for (const extra of EXTRAS) rows.push(oneRun(st, extra));
for (const row of rows) emit(row, OUT);
const nf = (k: string) => rows.map((x) => Number(x[k]));
const nfSome = (k: string) => rows.map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const fellRows = rows.filter((x) => x.fell);
console.log(`## across (3.3a) — rider ${RIDER}${process.env.HULL === 'rail' ? ' · hull=rail' : ''}, steer ${STEER}${STEER !== 0 ? ` (${STEER_SIGN}, from ${STEER_FROM} s)` : ''}`);
console.log(`   ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall · face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s, ${SECONDS} s each`);
console.log(`   fell: ${fellRows.length} of ${rows.length}${fellRows.length ? ` at ${span(fellRows.map((x) => Number(x.fellAtS)), 2)} s` : ''}`);
console.log(`   CHECK vs Part 24's twelve: bank peak ${span(nf('bankPeakDeg'))}° · roll peak ${span(nf('rollPeakDeg'))}° · rail peak ${span(nf('railPeakDeg'))}° · drift peak ${span(nf('driftPeakDeg'))}°`);
console.log(`   §1 the base's across acceleration, m/s² (+ toward the board's level-left):`);
console.log(`      the PAIR's own (momentum): mean ${span(nf('latPairMeanSigned'), 2)} · median ${span(nf('latPairMedian'), 2)} · |median| ${span(nf('latPairAbsMedian'), 2)} · peak ${span(nf('latPairPeak'), 2)}`);
console.log(`      the same off the water force ledger: mean ${span(nf('latWaterMeanSigned'), 2)} · |median| ${span(nf('latWaterAbsMedian'), 2)} · SEATBELT |difference| median ${span(nf('latResidualMedian'), 3)} peak ${span(nf('latResidualPeak'), 3)}`);
console.log(`      3.2z's feetAccel: |median| ${span(nfSome('feetAccelAbsMedian'), 2)} · peak ${span(nfSome('feetAccelPeak'), 2)} · MEAN SIGNED ${span(nfSome('feetAccelMeanSigned'), 2)} · the body's |median| ${span(nfSome('bodyAccelAbsMedian'), 2)} mean ${span(nfSome('bodyAccelMeanSigned'), 2)}`);
console.log(`      Part 24's "net across rate" (|feetAcross|/t, a frame-relative VELOCITY over a time): base ${span(nfSome('baseMeanAccel'), 2)} · body ${span(nfSome('bodyMeanAccel'), 2)} · the same base velocity RAW (no felt removal): peak ${span(nfSome('feetAcrossRawPeak'), 3)} m/s, rate ${span(nfSome('feetAcrossRawMeanRate'), 2)}`);
console.log(`   §2 where it has already gone: pairFelt's tilt from the WORLD vertical ${span(nf('feltWorldMedian'))}° median, ${span(nf('feltWorldPeak'))}° peak, ${span(nf('feltWorldAtFall'))}° at the fall`);
console.log(`      against the deck's roll ${span(nf('rollAtFall'))}° at the fall, leaving the test's tilt ${span(nf('tiltAtFall'))}° (median ${span(nf('tiltMedian'))}°) · identity residual ${span(nf('tiltCheckPeak'), 3)}°`);
console.log(`      pairFelt at the fall: lateral ${span(nf('pfLatAtFall'), 2)} · vertical ${span(nf('pfUpAtFall'), 2)} (median over the run ${span(nf('pfUpMedian'), 2)}) · length ${span(nf('pfMagAtFall'), 2)} m/s²`);
console.log(`      THE BANK GAIN, °/°: the felt vertical's tilt per degree of the deck's roll ${span(nf('feltPerRoll'), 3)} (R² ${span(nf('feltPerRollR2'), 3)}) — 1.000 is a turn that holds its own lean`);
console.log(`      the across forcing that leaves the body, g·sin(tilt): ${span(nf('tiltDemandAtFall'), 2)} m/s² at the fall (median ${span(nf('tiltDemandMedian'), 2)})`);
console.log(`      THE DEFICIT the base has to close (the body's mean signed across acceleration less the base's): ${span(nf('deficitMean'), 2)} m/s²`);
console.log(`      the hull's own slope: latPair per rad of RAIL ${span(nf('latPerRailSlope'), 1)} m/s²/rad (R² ${span(nf('latPerRailR2'), 3)}) · per rad of ROLL ${span(nf('latPerRollSlope'), 1)} (R² ${span(nf('latPerRollR2'), 3)})`);
console.log(`   §3 the turn: heading rate ${span(nf('turnRateMedian'), 1)}°/s median, ${span(nf('turnRatePeak'), 1)} peak · v·ω ${span(nf('vOmegaMedian'), 2)} m/s² median, ${span(nf('vOmegaPeak'), 2)} peak`);
console.log(`      the steer's own rise, m/s² into the steer: +0.1 s ${span(nfSome('latAt100'), 2)} · +0.2 ${span(nfSome('latAt200'), 2)} · +0.3 ${span(nfSome('latAt300'), 2)} · +0.5 ${span(nfSome('latAt500'), 2)} · first past ${RISE}: ${span(nfSome('latRiseTo'), 3)} s (in ${rows.filter((x) => x.latRiseTo !== null).length} of ${rows.length})`);
/**
 * The pool. `latPair` against `sin(rail)` and `sin(roll)` is the hull's lateral authority with the geometry's own
 * nonlinearity taken out, so its slope is in m/s² per unit of sine and comparable with `g` — a deck-normal lift of
 * `W / cos φ` on a pair of mass `m` would give exactly `g` there, and `PLANT_SPEEDS`' and 3.2y's side force per
 * **radian** is the same quantity at small angle. The bank gain is `pfLat` against `g · tan(roll)`: 1.000 is a turn
 * that holds its own lean and leaves the body nothing to slide down.
 */
const poolRail = fit(pool.map((x) => Math.sin(x.rail / DEG)), pool.map((x) => x.latPair));
const poolRoll = fit(pool.map((x) => Math.sin(x.roll / DEG)), pool.map((x) => x.latPair));
const poolBank = fit(pool.map((x) => G * Math.tan(x.roll / DEG)), pool.map((x) => x.pfLat));
const poolFelt = fit(pool.map((x) => x.roll), pool.map((x) => x.feltWorld));
const poolOwn = fit(pool.map((x) => x.roll), pool.map((x) => x.feltOwn));
console.log(`   THE POOL, all ${pool.length} frames of the ${rows.length} runs together:`);
console.log(`      latPair per unit sin(rail) ${f(poolRail.slope, 2)} m/s² (R² ${f(poolRail.r2, 3)}, n ${poolRail.n}) · per unit sin(roll) ${f(poolRoll.slope, 2)} (R² ${f(poolRoll.r2, 3)}) · g is ${f(G, 2)}`);
console.log(`      the BANK GAIN pooled: pfLat per g·tan(roll) ${f(poolBank.slope, 3)} (R² ${f(poolBank.r2, 3)}) · feltWorld per ° of roll ${f(poolFelt.slope, 3)} (R² ${f(poolFelt.r2, 3)}) · the probe's OWN un-lagged felt per ° of roll ${f(poolOwn.slope, 3)} (R² ${f(poolOwn.r2, 3)}) · per-run spread ${span(nf('feltOverRollAtFall'), 3)} at the fall`);
console.log(`      latPair at absolute 0.4 / 0.5 / 0.6 / 0.8 s: ${span(nfSome('latAbs400'), 2)} · ${span(nfSome('latAbs500'), 2)} · ${span(nfSome('latAbs600'), 2)} · ${span(nfSome('latAbs800'), 2)} m/s² · the deck's roll at 0.8 s ${span(nfSome('rollAbs800'), 1)}°`);
console.log(`      THE LATERAL FORCE BY SOURCE, N on the same axis (median signed over the pool · peak absolute): ${WATER_KEYS.map((k) => `${k} ${f(median(pool.map((x) => x.bySource[k])), 1)} · ${f(peak(pool.map((x) => Math.abs(x.bySource[k]))), 1)}`).join(' | ')}`);
console.log(`   the fall: margin ${span(nf('marginAtFall'), 3)} · past ${span(nf('pastAtFall'), 3)} m · relative across-speed ${span(nfSome('relAcrossAtFall'), 3)} m/s = body ${span(nfSome('bodyAcrossAtFall'), 3)} − feet ${span(nfSome('feetAcrossAtFall'), 3)} · its mean rate ${span(nfSome('relAcrossMeanRate'), 2)} m/s² · reconstructs to ${span(nfSome('checkAtFall'), 4)}`);
