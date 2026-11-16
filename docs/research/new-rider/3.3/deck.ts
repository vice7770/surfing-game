/**
 * Step 3.3b: **the water force re-projected onto the DECK's own axes, and the residual tilt attributed by source.**
 *
 * Step 3.3a (Part 25) measured the bank gain — the felt vertical's tilt per extra degree of the deck's roll — at
 * **0.625–0.832 pooled over seven cells** (R² 0.751–0.946, 768–2317 frames a cell) and the hull's lateral force at
 * **547 N per unit sin(rail)** on 75.54 kg, and said the gap was structural. The wave-shape advisor's ruling on that
 * (`docs/research/water-physics/consult-log.md`, merged `e2dc402c`) is that **below one is our artefact and it is a
 * direction, not a size**, and it supplied the identity this probe is built on, exact and prior to any source:
 *
 *   on the deck's own axes `tilt = atan(F_s / F_n)`, with `F_s` the water force's across component **in the plane of
 *   the deck** and `F_n` its deck-normal component — so **a force locked to the deck normal gives a bank gain of
 *   exactly 1.000 at any magnitude**, any sinkage and any face slope, and the whole 0.17–0.37° residual is `F_s`.
 *
 * That identity is not an assumption here, it is checkable in this code: `humanBalance.ts:435` takes
 * `tiltAcross = atan2(felt.x, felt.y)` on `AttachedRider.captureFelt`, which is the pair's specific force rotated into
 * the **board's** frame, and the pair's specific force is the water force over the pair's mass because gravity cancels
 * inside the pair. So this probe prints `atan(F_s/F_n)` from the force ledger, the same tilt from the momentum route,
 * and the test's own `tiltAcross`, and all three must agree up to the 0.1 s low pass.
 *
 * **The round is a falsification, not a confirmation.** The advisor named its own three suspects — `buoyancy`
 * (`hullForces.ts:264`, `(−support·slopeX, support, −support·slopeZ)`) and `radiation` + `addedMass`
 * (`BoardBody.ts:1501–1506`, along `surfaceNormal`), all three pointed along the **water-surface** normal rather than
 * the hull's — and gave the test that breaks it: a flat athwartships bottom cannot make any `F_s`, because with rocker
 * but no cross-section every patch normal lies in the fore–aft plane, so `pressure` should read **≈ 0** on the deck's
 * across axis. 3.3a's published `pressure` median of **81.6 N** is a **horizontal**-axis projection, which mixes `F_n`
 * and `F_s`. **If `pressure` shows up in the in-plane column, the hull geometry is the suspect and the advisor is
 * wrong** — its own words, and the probe prints that line by name.
 *
 * Two more things it carries, both from the advisor's ranking:
 *
 * 1. **The datum correction.** 3.3a's 547 N per unit sine was regressed on `sin(rail)`. The force's *direction* is set
 *    by the deck's **roll** (world datum — the pressure is normal to the hull) and only its *magnitude* by the rail
 *    (water-relative incidence), so the `sin(roll)` slope is the one to put against the sourced bar of **741 N**
 *    (`W` on 75.54 kg; `F_lat / sin φ ≥ W`, rising as `1/cos φ`). `across.ts` computed that slope and printed it in its
 *    own pool line; Part 25 did not publish it. This probe publishes it in newtons, against the bar.
 * 2. **The consistency check the advisor offers as its own test.** `(1 − gain) × roll` = 5.4–16.4° over the 20.9–63.0°
 *    of roll at the fall, which should bracket the measured absolute tilt of 7.4–15.9° — the gain deficit should
 *    account for essentially all of the tilt with little intercept hiding behind it. So the pooled fits' **intercepts**
 *    are printed too, which 3.3a did not compute at all.
 *
 * **Everything else is step 3.3a's `across.ts` unchanged**, deliberately: the same `trimbank.ts` cell (the
 * Canyon-matched `FaceWater` 1.4 m / 2.6 m deep / 16° / 5.7 m/s, the board 0.75 fronts ahead of the crest and 45° off
 * the fall line, entry speed the face's own plus −3, −2, −1, 0, +1.5 or +3, the stances Compress and tall, 9 s a run,
 * twelve runs a cell), the same cross-check columns that reproduce Part 24's published twelve to the digit, the same
 * `latPair`/`latWater` seatbelt, the same pooled slopes and the same `cap.omega > 0` guard. The only additions are the
 * deck-axis projections, the intercept, and `VERTICAL`.
 *
 * **No source file is touched and no switch reaches the game.** Everything is read off the live instance (private to
 * TypeScript, present at run time) or set on it, and `STEER` is the player's own stick; at `STEER=0` with no `HULL`
 * this is the game's own configuration.
 *
 * Run from the repository's root (the bundle needs `node_modules` beside it):
 *   npx rolldown docs/research/new-rider/3.3/deck.ts -o <scratch>/dk.mjs --format esm --platform node
 *   RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/d0.jsonl node <scratch>/dk.mjs
 *   VERTICAL=particle RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/dk.mjs
 *   RIDER=new STEER=0.5 STEER_SIGN=roll STEER_FROM=0.3 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/dk.mjs
 *     (STEER_FROM=0.3 is Part 25 §2's own ladder setting — after the mount's 0.17 s contact transient; the probe's
 *      own default is 0, so the six steered cells in `results/33b/` all carry it explicitly)
 *   HULL=rail RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/dk.mjs
 *
 * Env: RIDER=new|old, STANCES, EXTRAS, STEER, STEER_SIGN=roll|fixed, STEER_FROM, RISE, HULL=rail, VERTICAL=particle,
 * SECONDS, SIDE, AHEAD, FACE=h,slope,speed, DEPTH, SUBSTEPS, OUT (one JSON line a run), TRACE (one line a frame).
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
/** `AttachedRider`'s own low-pass time for the felt vertical, s [R, `AttachedRider.ts:794`]. */
const SPECIFIC_FORCE_TIME = 0.1;
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
/**
 * `FaceWater`'s vertical flow law. `'surface'` is its own default and the one 3.3a (and 3.2w–3.2z) ran: ∂η/∂t at a
 * fixed point, which the advisor measured as **over-reading the upwelling by ~26 %** against the kinematic
 * `'particle'` (1.63 against 1.29 m/s on this face) — so the gain 3.3a published is, if anything, flattered. This
 * round re-runs the shipped cell both ways rather than asserting which it was. `VERTICAL=particle` for the other.
 */
const VERTICAL = process.env.VERTICAL === 'particle' ? 'particle' as const : 'surface' as const;
/**
 * **Step 3.3g's one addition to this probe, `FELT=deck`, off by default so every published 3.3b row is reproduced
 * byte for byte when it is unset.** It moves BOTH ends of the felt reading onto the deck's own axes, which is step
 * 3.3c's `?feltFrame=deck` and what the owner rides with:
 * - the rider is built with `feltFrame: 'deck'`, so the game's own filter state is held on the deck's axes;
 * - and this probe's per-source low pass is held there too — each entry is rotated into the board's frame and the
 *   filter runs on those components (`dG/dt = (A − G)/T` in the board's frame) instead of being filtered in the world
 *   and projected afterwards.
 * The second half is the point: filtering in the world and projecting afterwards charges the reading `Ω · T` of
 * in-plane force whenever the deck is rolling (up to 268 °/s at the fall and 354 °/s in peak on the full-stick cell
 * this round reports), which is a frame error and not a
 * force, so an attribution made that way **manufactures its own biggest source**. With `FELT=deck` the in-plane
 * column is the force's own.
 */
const FELT = process.env.FELT === 'deck' ? 'deck' as const : undefined;
/**
 * **Step 3.3h's first addition, `ROLL=on`, off by default.** Turns `BoardBody.rollLedger` on and prints **who rolls
 * the board, per source, in N·m** (§6). This is the instrument step 3.3g closed by saying it had not built: it
 * measured the in-plane *force*, and an in-plane force at the hull is not a roll moment about the pair's centre.
 *
 * The ledger is read-only — `rollLedger.test.ts` asserts the board's trajectory is identical to the digit with it on
 * — and it is a `static`, so the probe sets it once for the whole run and clears it at the end.
 */
const ROLL = process.env.ROLL === 'on';
/**
 * **Step 3.3h's second addition, `REACH=keep`, off by default.** Builds the rider with `stanceReach: 'keep'`, the
 * game's own `?stanceReach=keep`: a deep crouch keeps the riding stance's hip range and free arms, which is the
 * owner's ruling of 2026-11-16 on the trade step 3.3g measured (the crouch wins the moment bar by 1.3–1.7× and
 * loses the catching reach by 1.4–2.2×).
 */
const REACH = process.env.REACH === 'keep' ? 'keep' as const : undefined;

/** All ten of `BoardBody.forces` — turnpath's own nine plus `suction`, which is 0 on the default flat-bottomed board. */
const WATER_KEYS = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth', 'suction'] as const;
/**
 * The roll ledger's own keys: the same ten water entries, plus `gyro` (the free body's own term, which the solve
 * carries on the right-hand side) and `rider` — **a residual**, `total` less every other entry, so everything the
 * rider's coupling carries: the feet's push on the deck and the pair's inertia resisting the roll together. It is
 * never a measured contact torque and is not reported as one.
 */
const ROLL_KEYS = [...WATER_KEYS, 'gyro', 'rider'] as const;
if (ROLL) BoardBody.rollLedger = true;

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
function fit(xs: number[], ys: number[]): { slope: number; r2: number; n: number; intercept: number } {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < xs.length; i += 1) if (Number.isFinite(xs[i]) && Number.isFinite(ys[i])) { x.push(xs[i]); y.push(ys[i]); }
  const n = x.length;
  if (n < 3) return { slope: Number.NaN, r2: Number.NaN, n, intercept: Number.NaN };
  const mx = mean(x);
  const my = mean(y);
  let sxy = 0;
  let sxx = 0;
  let syy = 0;
  for (let i = 0; i < n; i += 1) { sxy += (x[i] - mx) * (y[i] - my); sxx += (x[i] - mx) ** 2; syy += (y[i] - my) ** 2; }
  const slope = sxx > 0 ? sxy / sxx : Number.NaN;
  // Step 3.3b publishes the **intercept** too: the bank gain is a marginal slope with a fitted intercept, and the
  // advisor's own consistency test — `(1 − gain) × roll` should bracket the measured absolute tilt — only holds if
  // little of the tilt is hiding in that intercept. 3.3a computed the slope and did not print it.
  return { slope, r2: sxx > 0 && syy > 0 ? (sxy * sxy) / (sxx * syy) : Number.NaN, n, intercept: my - (sxx > 0 ? slope * mx : 0) };
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
  /**
   * **Step 3.3b's own columns.** The same ten water entries projected on the **deck's own axes** instead of the
   * horizontal: `onN` is each entry's component along the deck normal `n̂` (the board's local +y in the world) and
   * `onS` its component along the deck's across axis `ŝ` (the board's local +x, **in the plane of the deck**).
   *
   * The identity the advisor's diagnosis rests on, exact and prior to any source: the pair's felt vertical is the water
   * force over the pair's mass (gravity cancels inside the pair), and `humanBalance`'s `tiltAcross` is
   * `atan2(felt·x̂, felt·ŷ)` in the board's frame [R, `humanBalance.ts:435` on `AttachedRider.captureFelt`] — so
   * `tilt = atan(F_s / F_n)` with `F_s = Σ onS` and `F_n = Σ onN`, and a force locked to the deck normal has
   * `F_s = 0` and therefore a bank gain of exactly 1.000 at **any** magnitude. The whole residual tilt is `F_s`, by
   * named source, in newtons.
   */
  onN: Record<string, number>;
  onS: Record<string, number>;
  /** N: the ten entries summed on the deck's normal and on the deck's across axis. */
  fN: number;
  fS: number;
  /** °: `atan2(fS, fN)` — the deck-frame tilt from the force ledger, un-low-passed. Compare with `tilt` (lagged 0.1 s) and `tiltPair`. */
  tiltForce: number;
  /**
   * °: the same deck-frame tilt from the **momentum** route instead — the pair's own specific force `a + g ŷ` rotated
   * into the board's frame. Two independent ends of the same Newton's-third-law quantity; their difference is the
   * seatbelt on the whole attribution, exactly as `latPair − latWater` was 3.3a's.
   */
  tiltPair: number;
  /**
   * The same two projections of each entry **low-passed over `SPECIFIC_FORCE_TIME` in the world** before being
   * projected, which is exactly what `pairFelt` does to the total [R, `AttachedRider.ts:4513`] — so these are the
   * components of the force the **body actually feels**, and their ratio must reproduce the test's own `tiltAcross`.
   *
   * This is not a cosmetic smoothing. The raw step-mean entries swing by tens of newtons frame to frame (`addedMass`
   * peaks at 227 N in-plane against a 153 N normal median), so the instantaneous `atan(F_s/F_n)` is noisy by tens of
   * degrees, and a median over a 9 s run is dominated by the early low-roll frames where there is no tilt to explain.
   * The low-passed pair is the one quantity that both closes on the measured tilt and can be attributed by source.
   */
  lpOnN: Record<string, number>;
  lpOnS: Record<string, number>;
  /** N: the low-passed ten summed on the deck's axes, and the tilt they give — checked against the test's own. */
  lpN: number;
  lpS: number;
  tiltFelt: number;
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
  /**
   * Step 3.3h: the room's own **catching reach** that the fall test measured the capture point against this frame, m
   * (`CaptureState.reach` — `reachAcross` where the across way binds, `reachAlong` where the along way does), and the
   * centre of mass's height over the feet the balance read, m. The two halves of the owner's ruling, read rather than
   * re-derived: `?stanceReach=keep` is meant to move the first and leave the second alone.
   */
  reach: number;
  heightOverFeet: number;
  /**
   * °/s: the deck's own **roll rate**, `d(roll)/dt`. Step 3.3b needs it for two reasons and neither is cosmetic.
   * (1) `pairFelt` is low-passed over 0.1 s in the **world** and only then projected on the deck's *current* axes, so
   * a force locked to the deck normal still reads an across component of about `Ω · T` once the deck is rolling —
   * the felt vertical lags the deck, and that is a property of the instrument, not a force. (2) The force ledger is
   * accumulated over the step's substeps at each substep's own rotation and read against the end-of-step orientation,
   * so every entry carries a residue of order `F · Ω · h/2` on the across axis for the same reason.
   */
  rollRate: number;
  /** °/s about the world vertical, and `speed × that` in m/s² — Forsyth's steady-turn identity on our own board. */
  turnRate: number;
  vOmega: number;
  speed: number;
  drift: number;
  /** °: the lean the steer asks the balance for (`AttachedRider.leanAsked`), the only channel the stick has on this rider. */
  leanAsked: number;
  /**
   * **Step 3.3h: the roll moment by source, N·m, `ROLL=on` only** (NaN otherwise, so every pooled column is empty
   * rather than zero — the `Number(null) === 0` trap of 3.3f).
   *
   * **The datum, and it is not the ledger's raw one.** `BoardBody.roll` is positive in the right-hand sense about the
   * board's +z, which lifts the +x rail; this probe's own `roll`, `bank` and `rail` columns are positive the other
   * way (`roll = atan2(boardUp·side, boardUp.y)` is `−θ` for a rotation `θ` about +z, checked). So every entry here is
   * **negated into this probe's own roll sense** and then **multiplied by `rollSense`** — the sign of the deck's roll
   * at the **last** frame of the run, i.e. the way this run actually went over, applied to the whole run after the
   * loop (the frames are mutated in place, so the pool carries the same sign) — so that
   *
   *   **positive = pushing the board FURTHER OVER the way it actually went.**
   *
   * One convention, stated once, signed by the run's own outcome rather than by a per-frame quantity: step 3.3g
   * published an across column signed by `sign(nx)`, which is the deck's bank error and not the turn's side, read 22
   * of 24 falls as "outboard", and had to withdraw it. **It is signed at the end rather than latched at STEER_FROM
   * because at STEER_FROM = 0 the roll is still 0.0° and `Math.sign(0) || 1` would pick a sign at random** — a trap
   * the same shape as 3.3f's `Number(null) === 0`, caught by running it.
   */
  rollBy: Record<string, number>;
  /** N·m in the same sense: the ten water entries plus `gyro` summed (so `rollWater + rollBy.rider = rollTotal`), and the board's own angular impulse over the step. */
  rollWater: number;
  rollTotal: number;
  /**
   * **The independent reading of the residual, N·m in the same sense.** `rollBy.rider` is a residual, so it is not
   * evidence of a contact torque on its own. This is the contact's roll moment taken **directly**, from two public
   * fields the ledger never touches: `AttachedRider.contact.force` (the mean force on the RIDER over the step, N,
   * world) and `AttachedRider.contact.centreOfPressure` (where it acts, board frame). By Newton's third law the board
   * gets `−force` at that point, so its moment about the composite centre the ledger's torques are taken about
   * (`BoardBody.centerOfMass`, read in `substep`) is `(P − C) × (−F)`, and negating it into this probe's roll sense
   * gives `(P − C) × F` on the board's long axis.
   *
   * If the two agree, the residual **is** the contact and may be called that; if they do not, the residual is holding
   * something else and must stay a residual. §6 prints the difference, and nothing in this round calls the residual a
   * contact torque unless it does.
   */
  rollContact: number;
  /**
   * m: `rollBy.rider` over the contact's own normal load (`contact.force` on the deck normal) — **where on the deck
   * the residual implies the load is pressing.** The feet's modelled half-width across is 0.13 m
   * [R, `riderPosture.ts:96`], so an implied arm inside 0.13 m says the residual is exactly what a foot-borne load
   * off the centreline makes, and one outside it says it is not. A falsification, not a confirmation.
   */
  rollRiderArm: number;
  /** °/s²: `rollTotal` over the board's own roll inertia about its long axis, kg·m² — what that moment does to a board this light. */
  rollAlpha: number;
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
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2], vertical: VERTICAL });
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
  const board = new BoardBody({
    ...(process.env.HULL === 'rail' ? { hull: 'rail' as const } : {}),
    // `BUOY=hull`, step 3.3g's second probe-only addition, off by default: step 3.3d's own `?buoyFrame=hull`, so the
    // in-plane column can be read with the one fix that exists already applied, and what is LEFT can be named.
    ...(process.env.BUOY === 'hull' ? { buoyFrame: 'hull' as const } : {}),
  });
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(REACH ? { stanceReach: REACH } : {}),
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
  /** Step 3.3b: the deck's own across axis (the board's local +x in the world) and the pair's whole specific force. */
  const deckAcross = new Vector3();
  const pairSpec = new Vector3();
  const lpInverse = new Quaternion();
  const lpReading = new Vector3();
  /** Step 3.3b: each water entry held low-passed in the world over SPECIFIC_FORCE_TIME, the way `pairFelt` is. */
  const lp: Record<string, Vector3> = Object.fromEntries(WATER_KEYS.map((k) => [k, new Vector3()]));
  const lpDelta = new Vector3();
  let lpFresh = true;
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
  /**
   * The board's own roll inertia about its long axis, kg·m² — read off the live instance (private to TypeScript,
   * present at run time) so `rollAlpha` is a measured division and not an assumed one. The board frame's z is the
   * long axis, so `bodyInertia[8]` is I_zz.
   */
  const rollInertia = (board as unknown as { bodyInertia: number[] }).bodyInertia[8];
  /** Step 3.3h's scratch: the contact's centre of pressure in the world relative to the composite centre, and the board's long axis. */
  const copWorld = new Vector3();
  const deckLong = new Vector3();
  let lastHeading = Number.NaN;
  let lastRoll = Number.NaN;
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
    /**
     * **Step 3.3b.** The pair's whole specific force, not only its two projections: `a + g ŷ`, m/s². This is the same
     * momentum difference `latPair` is taken from and the same quantity `captureStep` low-passes into `pairFelt`
     * [R, `AttachedRider.ts:4507–4518`], and `WATER.gravity` is 9.81 [R, `hullForces.ts:7`], which is `G` here.
     */
    const havePair = Number.isFinite(lastMomentum.x);
    pairSpec.subVectors(momentum, lastMomentum).multiplyScalar(1 / (STEP * pairMass));
    pairSpec.y += G;
    lastMomentum.copy(momentum);
    // The same quantity off the force ledger. `BoardBody.forces` are mean forces over the latest step.
    total.set(0, 0, 0);
    for (const key of WATER_KEYS) total.add((board.forces as unknown as Record<string, Vector3>)[key]);
    const latWater = total.dot(side) / pairMass;
    /**
     * **Step 3.3b's measurement.** The deck's own axes: `n̂` is the board's local **+y** in the world (`boardUp`,
     * already built above for `roll`) and `ŝ` its local **+x** — the across axis **in the plane of the deck**, which
     * is what `side` is only the horizontal *projection* of. Every one of the ten water entries is projected on both,
     * so `tilt = atan(F_s / F_n)` attributes the residual tilt by named source in newtons, and an entry locked to the
     * deck normal contributes **nothing** to `F_s` at any magnitude.
     */
    deckAcross.set(1, 0, 0).applyQuaternion(board.orientation);
    const onN: Record<string, number> = {};
    const onS: Record<string, number> = {};
    let fN = 0;
    let fS = 0;
    for (const key of WATER_KEYS) {
      const F = (board.forces as unknown as Record<string, Vector3>)[key];
      const n = F.dot(boardUp);
      const s = F.dot(deckAcross);
      onN[key] = n;
      onS[key] = s;
      fN += n;
      fS += s;
    }
    const tiltForce = Math.atan2(fS, fN) * DEG;
    const tiltPair = havePair ? Math.atan2(pairSpec.dot(deckAcross), pairSpec.dot(boardUp)) * DEG : Number.NaN;
    // The same ten entries low-passed in the WORLD over SPECIFIC_FORCE_TIME and only then projected on the deck's
    // axes — the order `pairFelt` itself uses, which matters because the deck turns up to 98 °/s inside the filter.
    const blend = 1 - Math.exp(-STEP / SPECIFIC_FORCE_TIME);
    const lpOnN: Record<string, number> = {};
    const lpOnS: Record<string, number> = {};
    let lpN = 0;
    let lpS = 0;
    // `FELT=deck`: the filter's state on the deck's own axes (step 3.3c, step 3.3g's addition above). The held vector
    // is then already in the board's frame, so its +y IS the normal component and its +x the in-plane across one.
    if (FELT) lpInverse.copy(board.orientation).invert();
    for (const key of WATER_KEYS) {
      const F = (board.forces as unknown as Record<string, Vector3>)[key];
      const held = lp[key];
      const reading = FELT ? lpReading.copy(F).applyQuaternion(lpInverse) : F;
      if (lpFresh) held.copy(reading);
      else held.addScaledVector(lpDelta.copy(reading).sub(held), blend);
      const n = FELT ? held.y : held.dot(boardUp);
      const s = FELT ? held.x : held.dot(deckAcross);
      lpOnN[key] = n;
      lpOnS[key] = s;
      lpN += n;
      lpS += s;
    }
    lpFresh = false;
    const tiltFelt = Math.atan2(lpS, lpN) * DEG;
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
    const rollRate = Number.isFinite(lastRoll) ? (roll - lastRoll) / STEP : Number.NaN;
    lastRoll = roll;
    const heading = Math.atan2(fwd.x, fwd.z);
    let turnRate = Number.NaN;
    if (Number.isFinite(lastHeading)) {
      let d = heading - lastHeading;
      while (d > Math.PI) d -= 2 * Math.PI;
      while (d < -Math.PI) d += 2 * Math.PI;
      turnRate = (d / STEP) * DEG;
    }
    lastHeading = heading;
    /**
     * **Step 3.3h: the roll moment by source.** `rollSense` is latched once, at STEER_FROM, from the roll the board
     * already has — the same latch `steerSign` uses, so a run with no steer still gets one. Each entry is negated into
     * this probe's own roll sense (see `Frame.rollBy`) and multiplied by it, so **positive is further over the way the
     * run is going**. `rollWater` is the ten water entries plus `gyro`; `rollBy.rider` is the residual; the two sum to
     * `rollTotal` by construction, which is `BoardBody.roll.total`'s own definition and not a finding.
     */
    const rollBy: Record<string, number> = {};
    let rollWater = Number.NaN;
    let rollTotal = Number.NaN;
    let rollAlpha = Number.NaN;
    let rollContact = Number.NaN;
    let rollRiderArm = Number.NaN;
    if (ROLL) {
      const led = board.roll as unknown as Record<string, number>;
      let water = 0;
      for (const key of ROLL_KEYS) {
        // Negated into this probe's own roll sense here; the run's own sign is applied after the loop (`Frame.rollBy`).
        const value = -led[key];
        rollBy[key] = value;
        if (key !== 'rider') water += value;
      }
      rollWater = water;
      rollTotal = -led.total;
      rollAlpha = rollInertia > 0 ? (rollTotal / rollInertia) * DEG : Number.NaN;
      board.toWorld(rider.contact.centreOfPressure, copWorld).sub(board.centerOfMass);
      deckLong.set(0, 0, 1).applyQuaternion(board.orientation);
      rollContact = copWorld.cross(rider.contact.force).dot(deckLong);
      const normalLoad = rider.contact.force.dot(boardUp);
      rollRiderArm = Math.abs(normalLoad) > 1 ? rollBy.rider / normalLoad : Number.NaN;
    } else {
      for (const key of ROLL_KEYS) rollBy[key] = Number.NaN;
    }
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
      onN,
      onS,
      fN,
      fS,
      tiltForce,
      tiltPair,
      lpOnN,
      lpOnS,
      lpN,
      lpS,
      tiltFelt,
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
      reach: cap.reach,
      heightOverFeet: cap.height,
      rollRate,
      turnRate,
      vOmega: speed * (turnRate / DEG),
      speed,
      drift,
      leanAsked: (inner.leanAsked ?? inner.bankReference ?? 0) * DEG,
      rollBy,
      rollWater,
      rollTotal,
      rollContact,
      rollRiderArm,
      rollAlpha,
    };
    frames.push(frame);
    pool.push(frame);
    if (TRACE) emit(frame, TRACE);
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  /**
   * **Step 3.3h: the roll columns' one sign, applied here.** The way this run actually went over, read off the deck's
   * roll at the last frame; the frames are mutated in place so `pool` carries the same sign (see `Frame.rollBy`).
   */
  const rollSense = Math.sign(frames[frames.length - 1]?.roll ?? 0) || 1;
  if (ROLL) {
    for (const x of frames) {
      for (const key of ROLL_KEYS) x.rollBy[key] *= rollSense;
      x.rollWater *= rollSense;
      x.rollTotal *= rollSense;
      x.rollContact *= rollSense;
      x.rollRiderArm *= rollSense;
      x.rollAlpha *= rollSense;
    }
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
    bar: 'deck', rider: RIDER, stance: st, extra, steer: STEER, steerSign, steerFrom: STEER_FROM, vertical: VERTICAL,
    /** The pair's mass, kg — the divisor every m/s² column here is taken with, so the newtons can be re-derived. */
    pairMassKg: r(pairMass, 2),
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
    /**
     * **Step 3.3b, the deck's axes.** The water force resolved on the deck's own normal and across axis, N — medians
     * signed over the run and peaks absolute — and the tilt that ratio gives, three ways: from the force ledger
     * (`tiltForce`), from the momentum route (`tiltPair`) and the test's own low-passed `tilt`.
     */
    fNMedian: r(median(col('fN')), 1), fSMedian: r(median(col('fS')), 1),
    fNAtFall: r(last?.fN ?? Number.NaN, 1), fSAtFall: r(last?.fS ?? Number.NaN, 1),
    fSPeak: r(peak(abs('fS')), 1), fNPeak: r(peak(abs('fN')), 1),
    tiltForceMedian: r(median(col('tiltForce')), 2), tiltForceAtFall: r(last?.tiltForce ?? Number.NaN, 2),
    tiltPairMedian: r(median(col('tiltPair')), 2), tiltPairAtFall: r(last?.tiltPair ?? Number.NaN, 2),
    /** The seatbelt on the whole attribution: the ledger's deck-frame tilt against the momentum route's, °. */
    tiltLedgerResidualMedian: r(median(frames.map((x) => Math.abs(x.tiltForce - x.tiltPair))), 3),
    tiltLedgerResidualPeak: r(peak(frames.map((x) => Math.abs(x.tiltForce - x.tiltPair))), 3),
    /** And against the test's own `tiltAcross`, which carries SPECIFIC_FORCE_TIME's 0.1 s lag, so this is a lag and not an error. */
    tiltVsTestMedian: r(median(frames.map((x) => Math.abs(x.tiltForce - x.tilt))), 3),
    /**
     * **The felt split**, N: the low-passed water force on the deck's axes, and the tilt it gives against the test's
     * own `tiltAcross` — the seatbelt that says the attribution is of the quantity the body actually stands on.
     */
    lpNAtFall: r(last?.lpN ?? Number.NaN, 1), lpSAtFall: r(last?.lpS ?? Number.NaN, 1),
    tiltFeltAtFall: r(last?.tiltFelt ?? Number.NaN, 2), tiltFeltMedian: r(median(col('tiltFelt')), 2),
    tiltFeltVsTestMedian: r(median(frames.map((x) => Math.abs(x.tiltFelt - x.tilt))), 3),
    tiltFeltVsTestAtFall: r(Math.abs((last?.tiltFelt ?? Number.NaN) - (last?.tilt ?? Number.NaN)), 3),
    /** °/s: the deck's roll rate at the fall and its peak — the lag term's own input. */
    rollRateAtFall: r(last?.rollRate ?? Number.NaN, 1), rollRatePeak: r(peak(abs('rollRate')), 1),
    /** The lag's prediction, °: `−T · Ω` at the fall, against the measured tilt there. */
    lagPredictAtFall: r(-SPECIFIC_FORCE_TIME * (last?.rollRate ?? Number.NaN), 2),
    /** The attribution AT THE FALL, N in the deck's plane, per source — where the tilt is 7.4–15.9° and there is something to explain. */
    lpOnSAtFall: Object.fromEntries(WATER_KEYS.map((k) => [k, r(last?.lpOnS[k] ?? Number.NaN, 1)])),
    lpOnNAtFall: Object.fromEntries(WATER_KEYS.map((k) => [k, r(last?.lpOnN[k] ?? Number.NaN, 1)])),
    /** The per-source split on the deck's axes, N: medians signed and peaks absolute, normal then in-plane across. */
    onNMedian: Object.fromEntries(WATER_KEYS.map((k) => [k, r(median(frames.map((x) => x.onN[k])), 1)])),
    onSMedian: Object.fromEntries(WATER_KEYS.map((k) => [k, r(median(frames.map((x) => x.onS[k])), 2)])),
    onNPeak: Object.fromEntries(WATER_KEYS.map((k) => [k, r(peak(frames.map((x) => Math.abs(x.onN[k]))), 1)])),
    onSPeak: Object.fromEntries(WATER_KEYS.map((k) => [k, r(peak(frames.map((x) => Math.abs(x.onS[k]))), 2)])),
    /**
     * The advisor's own consistency test, run by run: `(1 − gain) × roll` against the measured absolute tilt at the
     * fall. The gain here is the run's own absolute ratio `feltWorld/roll` at the fall, which needs no fit.
     */
    predictedTiltAtFall: r((1 - (last?.feltWorld ?? Number.NaN) / (last?.roll ?? Number.NaN)) * Math.abs(last?.roll ?? Number.NaN), 2),
    absTiltAtFall: r(Math.abs(last?.tilt ?? Number.NaN), 2),
    /** The fall test, at the fall. */
    marginAtFall: r(last?.margin ?? Number.NaN, 3), pastAtFall: r(last?.past ?? Number.NaN, 3),
    relAcrossAtFall: r(split?.relAcross ?? Number.NaN, 3),
    bodyAcrossAtFall: r(split?.bodyAcross ?? Number.NaN, 3), feetAcrossAtFall: r(split?.feetAcross ?? Number.NaN, 3),
    relAcrossMeanRate: r(Math.abs((split?.relAcross ?? Number.NaN) / (split?.t ?? Number.NaN)), 2),
    checkAtFall: r((split?.relAcross ?? Number.NaN) - (split?.capSpeedTerm ?? Number.NaN) * (split?.omega ?? Number.NaN), 4),
    splitAtS: r(split?.t ?? Number.NaN, 3),
    /**
     * **Step 3.3h's roll-moment columns** (`ROLL=on`; all NaN otherwise). Every one is in the signed sense
     * `Frame.rollBy` states: **positive = further over the way this run is going.** `turn` columns are over the
     * COMMANDED window (`after`, from STEER_FROM to the fall), which is the window step 3.3g designed on because the
     * fall frame is already inside the capsize; `AtFall` is the last frame.
     */
    rollInertiaKgm2: r(rollInertia, 4),
    rollTotalTurnMedian: r(median(after.map((x) => x.rollTotal)), 2),
    rollTotalAtFall: r(last?.rollTotal ?? Number.NaN, 2),
    rollWaterTurnMedian: r(median(after.map((x) => x.rollWater)), 2),
    rollRiderTurnMedian: r(median(after.map((x) => x.rollBy.rider)), 2),
    rollWaterAtFall: r(last?.rollWater ?? Number.NaN, 2),
    rollRiderAtFall: r(last?.rollBy.rider ?? Number.NaN, 2),
    rollAlphaTurnMedian: r(median(after.map((x) => x.rollAlpha)), 0),
    rollAlphaAtFall: r(last?.rollAlpha ?? Number.NaN, 0),
    /** The seatbelt on the sign convention: the share of commanded frames whose NET roll moment is positive — further over. */
    rollOverShare: r(after.length ? after.filter((x) => x.rollTotal > 0).length / after.length : Number.NaN, 3),
    /** The ledger's closure, N·m: `total` less every entry including `rider`. Zero by construction; printed so a broken key shows. */
    rollClosure: r(peak(after.map((x) => Math.abs(x.rollTotal - x.rollWater - x.rollBy.rider))), 6),
    rollByTurnMedian: Object.fromEntries(ROLL_KEYS.map((k) => [k, r(median(after.map((x) => x.rollBy[k])), 2)])),
    rollByAtFall: Object.fromEntries(ROLL_KEYS.map((k) => [k, r(last?.rollBy[k] ?? Number.NaN, 2)])),
    /** The residual's independent reading and the arm it implies (see `Frame.rollContact`, `Frame.rollRiderArm`). */
    rollContactTurnMedian: r(median(after.map((x) => x.rollContact)), 2),
    rollContactVsRiderMedian: r(median(after.map((x) => Math.abs(x.rollContact - x.rollBy.rider))), 3),
    rollContactVsRiderPeak: r(peak(after.map((x) => Math.abs(x.rollContact - x.rollBy.rider))), 3),
    rollRiderArmTurnMedian: r(median(after.map((x) => x.rollRiderArm)), 4),
    /**
     * The room's catching reach, m, and the centre of mass's height over the feet, m — so the owner's ruling can be
     * read off the rows rather than inferred: `?stanceReach=keep` should move the reach and leave the height alone.
     */
    reachTurnMedian: r(median(after.map((x) => x.reach)), 4),
    reachAtFall: r(last?.reach ?? Number.NaN, 4),
    heightTurnMedian: r(median(after.map((x) => x.heightOverFeet)), 4),
    heightAtFall: r(last?.heightOverFeet ?? Number.NaN, 4),
    /** `a_max = g·d/h`, m/s², on the height the balance actually held over the commanded turn (d = 0.13 m, the feet's half-width). */
    aMaxTurn: r((G * 0.13) / median(after.map((x) => x.heightOverFeet)), 3),
    stanceReach: REACH ?? 'shipped',
  };
}

const rows: Record<string, unknown>[] = [];
const t0 = Date.now();
for (const st of STANCES) for (const extra of EXTRAS) rows.push(oneRun(st, extra));
for (const row of rows) emit(row, OUT);
const nf = (k: string) => rows.map((x) => Number(x[k]));
const nfSome = (k: string) => rows.map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const fellRows = rows.filter((x) => x.fell);
console.log(`## deck (3.3b) — rider ${RIDER}${process.env.HULL === 'rail' ? ' · hull=rail' : ''}, steer ${STEER}${STEER !== 0 ? ` (${STEER_SIGN}, from ${STEER_FROM} s)` : ''} · FaceWater vertical '${VERTICAL}' · felt frame ${FELT ?? 'world'} · buoyancy on the ${process.env.BUOY === 'hull' ? 'HULL' : 'surface'} normal`);
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
/**
 * **Step 3.3b's own block: the attribution on the DECK's axes.**
 *
 * `tilt = atan(F_s / F_n)` is exact, so the per-source `F_s` column *is* the residual tilt by source, in newtons. The
 * advisor's falsification is printed first and named: **if `pressure` shows up in the in-plane column, the hull
 * geometry is the suspect and the diagnosis is wrong.**
 */
const MASS = Number(rows[0]?.pairMassKg ?? Number.NaN);
const WEIGHT = MASS * G;
const poolFN = median(pool.map((x) => x.fN));
const poolFS = median(pool.map((x) => x.fS));
const fNpool = median(pool.map((x) => x.fN));
const onSMed = (k: string) => median(pool.map((x) => x.onS[k]));
const onNMed = (k: string) => median(pool.map((x) => x.onN[k]));
console.log(`   §4 THE DECK'S OWN AXES (3.3b) — n̂ the deck normal, ŝ the across axis IN THE PLANE OF THE DECK, all ${pool.length} frames pooled:`);
console.log(`      SEATBELT the two routes to the same deck-frame tilt: |ledger − momentum| median ${span(nf('tiltLedgerResidualMedian'), 3)}° peak ${span(nf('tiltLedgerResidualPeak'), 3)}° · |ledger − the test's own (0.1 s lag)| median ${span(nf('tiltVsTestMedian'), 3)}°`);
console.log(`      the water force on the deck's axes, N: F_n median ${f(poolFN, 1)} (per run ${span(nf('fNMedian'), 1)}) · F_s median ${f(poolFS, 1)} (per run ${span(nf('fSMedian'), 1)}) · F_s peak ${span(nf('fSPeak'), 1)} · W is ${f(WEIGHT, 1)} N on ${f(MASS, 2)} kg`);
console.log(`      tilt = atan(F_s/F_n): from the ledger ${span(nf('tiltForceMedian'), 2)}° median, ${span(nf('tiltForceAtFall'), 2)}° at the fall · from the momentum route ${span(nf('tiltPairMedian'), 2)}° / ${span(nf('tiltPairAtFall'), 2)}° · the test's own ${span(nf('tiltMedian'), 1)}° / ${span(nf('tiltAtFall'), 1)}°`);
console.log(`      PER SOURCE, N (median signed over the pool): on the deck NORMAL n̂  ${WATER_KEYS.map((k) => `${k} ${f(onNMed(k), 1)}`).join(' | ')}`);
console.log(`      PER SOURCE, N (median signed over the pool): IN THE DECK'S PLANE ŝ  ${WATER_KEYS.map((k) => `${k} ${f(onSMed(k), 2)}`).join(' | ')}`);
console.log(`      PER SOURCE, N (peak absolute over the pool): IN THE DECK'S PLANE ŝ  ${WATER_KEYS.map((k) => `${k} ${f(peak(pool.map((x) => Math.abs(x.onS[k]))), 2)}`).join(' | ')}`);
console.log(`      THE FALSIFICATION: pressure's in-plane share of F_s is ${f((100 * onSMed('pressure')) / poolFS, 1)} % (${f(onSMed('pressure'), 2)} of ${f(poolFS, 1)} N) — the advisor predicts ~0 for a flat athwartships bottom and calls any share here a refutation`);
console.log(`      the three named suspects' share of F_s: buoyancy ${f((100 * onSMed('buoyancy')) / poolFS, 1)} % · addedMass ${f((100 * onSMed('addedMass')) / poolFS, 1)} % · radiation ${f((100 * onSMed('radiation')) / poolFS, 1)} % · together ${f((100 * (onSMed('buoyancy') + onSMed('addedMass') + onSMed('radiation'))) / poolFS, 1)} %`);
console.log(`      the datum correction: latPair per unit sin(ROLL) ${f(poolRoll.slope, 2)} m/s² = ${f(poolRoll.slope * MASS, 0)} N per unit sine (R² ${f(poolRoll.r2, 3)}), against the sourced bar W = ${f(WEIGHT, 0)} N rising as 1/cos φ · 3.3a's sin(RAIL) slope ${f(poolRail.slope, 2)} = ${f(poolRail.slope * MASS, 0)} N`);
/**
 * And the same magnitude against the load that is actually there rather than against an assumed vertical equilibrium.
 * A force locked to the deck normal of measured magnitude `F_n` gives `a_lat = (F_n/m) sin φ` **whatever** the board
 * is doing vertically — no equilibrium needed, which is the whole point of the identity — so the honest bar for the
 * sin(roll) slope is the measured `F_n/m`, not `g`. `W/cos φ` is that bar only where the vertical closes, and over
 * 0–63° of roll it runs 741 → 1632 N, so a single slope cannot be read against it at one number.
 */
console.log(`      the same against the load MEASURED on the deck normal: F_n median ${f(fNpool, 1)} N = ${f(fNpool / MASS, 2)} m/s², so the sin(roll) slope is ${f((100 * poolRoll.slope) / (fNpool / MASS), 1)} % of what a force locked to the deck normal of that size would give · latPair per g·tan(roll) ${f(fit(pool.map((x) => G * Math.tan(x.roll / DEG)), pool.map((x) => x.latPair)).slope, 3)} (1.000 = the deck-normal ideal at vertical equilibrium)`);
const predicted = nf('predictedTiltAtFall');
const measured = nf('absTiltAtFall');
console.log(`      THE CONSISTENCY CHECK, run by run at the fall: (1 − gain) × roll ${span(predicted, 2)}° against the measured |tilt| ${span(measured, 2)}° · per-run |difference| ${span(predicted.map((v, i) => Math.abs(v - measured[i])), 2)}°`);
/**
 * **The attribution the advisor asked for**, and the one quantity it can be taken on. The bank gain is a *marginal*
 * slope, so the attribution has to be marginal too: the residual tilt is `atan(F_s/F_n)`, so
 * `d(tilt)/d(roll) = (1/F_n) · d(F_s)/d(roll)` and the gain deficit `1 − gain` is that sum over the ten entries, each
 * term a named force's own contribution in degrees of tilt per degree of roll. Taken on the **low-passed** force,
 * which is what the body stands on and what `tiltAcross` is built from; the raw step-mean entries are noisy by tens
 * of newtons a frame and their run-median is dominated by the early frames where the roll — and so the tilt — is
 * still nothing.
 */
const lpFNpool = median(pool.map((x) => x.lpN));
/** The marginal attribution on the **instantaneous** in-plane force — the real water force in the deck's plane. */
const perSource = WATER_KEYS.map((k) => {
  const g = fit(pool.map((x) => x.roll), pool.map((x) => x.onS[k]));
  return { k, slope: g.slope, r2: g.r2, deficit: (-g.slope / fNpool) * DEG };
});
const deficitSum = perSource.reduce((a, b) => a + b.deficit, 0);
/** The same on the **low-passed** force, which carries the filter's lag against the rolling deck as well. */
const perSourceLag = WATER_KEYS.map((k) => {
  const g = fit(pool.map((x) => x.roll), pool.map((x) => x.lpOnS[k]));
  return { k, slope: g.slope, r2: g.r2, deficit: (-g.slope / lpFNpool) * DEG };
});
const deficitSumLag = perSourceLag.reduce((a, b) => a + b.deficit, 0);
/** The four deck-frame tilts regressed on the roll, which is where the gain deficit has to come from. */
const tiltOnRollForce = fit(pool.map((x) => x.roll), pool.map((x) => x.tiltForce));
const tiltOnRollPair = fit(pool.map((x) => x.roll), pool.map((x) => x.tiltPair));
const tiltOnRollFelt = fit(pool.map((x) => x.roll), pool.map((x) => x.tiltFelt));
const tiltOnRollTest = fit(pool.map((x) => x.roll), pool.map((x) => x.tilt));
/** And the lag's own law: the test's tilt against the deck's roll RATE, whose slope should be −SPECIFIC_FORCE_TIME. */
const tiltOnRate = fit(pool.map((x) => x.rollRate), pool.map((x) => x.tilt));
const pressureOnRate = fit(pool.map((x) => x.rollRate), pool.map((x) => x.onS.pressure));
console.log(`      THE FELT SPLIT (each entry low-passed over ${SPECIFIC_FORCE_TIME} s ${FELT ? "on the DECK's own axes" : 'in the world'}, then projected): F_n at the fall ${span(nf('lpNAtFall'), 1)} N · F_s at the fall ${span(nf('lpSAtFall'), 1)} N`);
console.log(`      SEATBELT its tilt against the test's own tiltAcross: |difference| median ${span(nf('tiltFeltVsTestMedian'), 3)}° · at the fall ${span(nf('tiltFeltVsTestAtFall'), 3)}° (its own tilt ${span(nf('tiltFeltAtFall'), 2)}° against the test's ${span(nf('tiltAtFall'), 1)}°)`);
console.log(`      THE ATTRIBUTION AT THE FALL, N in the deck's plane: ${WATER_KEYS.map((k) => `${k} ${span(rows.map((x) => Number((x.lpOnSAtFall as Record<string, number>)[k])), 1)}`).join(' | ')}`);
console.log(`   §5 WHERE THE RESIDUAL TILT COMES FROM — the deck-frame tilt regressed on the deck's roll, °/° over the pool:`);
console.log(`      the REAL in-plane force (instantaneous ledger) ${f(tiltOnRollForce.slope, 3)} (R² ${f(tiltOnRollForce.r2, 3)}) · the momentum route ${f(tiltOnRollPair.slope, 3)} (R² ${f(tiltOnRollPair.r2, 3)})`);
console.log(`      the FELT tilt (the same force low-passed 0.1 s in the world, then projected) ${f(tiltOnRollFelt.slope, 3)} (R² ${f(tiltOnRollFelt.r2, 3)}) · the test's own tiltAcross ${f(tiltOnRollTest.slope, 3)} (R² ${f(tiltOnRollTest.r2, 3)})`);
console.log(`      so the gain deficit splits: the force's own share ${f(-tiltOnRollForce.slope, 3)} and the FILTER's lag ${f(tiltOnRollForce.slope - tiltOnRollTest.slope, 3)} of the measured ${f(-tiltOnRollTest.slope, 3)}`);
console.log(`      THE LAG'S OWN LAW: the test's tilt per °/s of ROLL RATE ${f(tiltOnRate.slope, 4)}° (R² ${f(tiltOnRate.r2, 3)}) against −T = ${f(-SPECIFIC_FORCE_TIME, 4)} · roll rate ${span(nf('rollRateAtFall'), 1)}°/s at the fall (peak ${span(nf('rollRatePeak'), 1)}) · −T·Ω predicts ${span(nf('lagPredictAtFall'), 2)}° against the measured tilt ${span(nf('tiltAtFall'), 1)}°`);
console.log(`      and pressure's own in-plane residue per °/s of roll rate ${f(pressureOnRate.slope, 3)} N (R² ${f(pressureOnRate.r2, 3)}) against the ledger's own within-step rotation F_n,pressure · h/2 = ${f((median(pool.map((x) => x.onN.pressure)) * STEP) / (2 * DEG), 3)} N per °/s`);
console.log(`      THE MARGINAL ATTRIBUTION of the REAL in-plane force, ° of tilt per ° of roll (d(F_s)/d(roll) over F_n = ${f(fNpool, 1)} N):`);
for (const e of perSource) if (Math.abs(e.deficit) > 0.0005) console.log(`         ${e.k.padEnd(10)} ${f(e.deficit, 3)}  (${f(e.slope, 2)} N per ° of roll, R² ${f(e.r2, 3)})`);
console.log(`         SUM ${f(deficitSum, 3)} against the instantaneous ledger's own fitted ${f(-tiltOnRollForce.slope, 3)} and the measured deficit ${f(-tiltOnRollTest.slope, 3)}`);
console.log(`      the same on the LOW-PASSED force (the lag folded in, so NOT an attribution of forces):`);
for (const e of perSourceLag) if (Math.abs(e.deficit) > 0.0005) console.log(`         ${e.k.padEnd(10)} ${f(e.deficit, 3)}  (${f(e.slope, 2)} N per ° of roll, R² ${f(e.r2, 3)})`);
console.log(`         SUM ${f(deficitSumLag, 3)} against the felt tilt's own fitted ${f(-tiltOnRollFelt.slope, 3)}`);
console.log(`      the pooled fit's own INTERCEPT, which the test says should be small: feltWorld on roll ${f(poolFelt.slope, 3)}° per ° with intercept ${f(poolFelt.intercept, 3)}° · un-lagged ${f(poolOwn.slope, 3)} with intercept ${f(poolOwn.intercept, 3)}°`);
/**
 * **§6 — step 3.3h: WHAT ROLLS THE BOARD, per source, in N·m.**
 *
 * The one thing step 3.3g said it had not measured. The discipline is 3.3b's own, moved one axis over:
 * - the datum is stated (`Frame.rollBy`: the board's own long axis, signed so positive is further over the way the
 *   run is going, the sense latched once per run);
 * - the pool is the **commanded** window, STEER_FROM to the fall, because the fall frame is already inside the
 *   capsize, and the fall frame is printed separately;
 * - each entry's figure is **its own median over the pool**, and medians do not sum — the sum's own median is printed
 *   beside them so the spread is visible rather than hidden, exactly as 3.3g's §4 caveat required;
 * - `rider` is a **residual** and is labelled one everywhere;
 * - and the positive control lives in `src/physics/rollLedger.test.ts`, not here.
 */
if (ROLL) {
  const commanded = pool.filter((x) => Number.isFinite(x.rollTotal));
  const med = (k: string) => median(commanded.map((x) => x.rollBy[k]));
  const pk = (k: string) => peak(commanded.map((x) => Math.abs(x.rollBy[k])));
  const netMed = median(commanded.map((x) => x.rollTotal));
  const sumOfMedians = ROLL_KEYS.reduce((a, k) => a + med(k), 0);
  const waterMed = median(commanded.map((x) => x.rollWater));
  const riderMed = median(commanded.map((x) => x.rollBy.rider));
  console.log(`   §6 WHAT ROLLS THE BOARD (3.3h) — N·m about the board's own long axis, + = further over the way the run went, ${commanded.length} commanded frames pooled:`);
  console.log(`      the board's own roll inertia I_zz ${span(nf('rollInertiaKgm2'), 4)} kg·m², so 1 N·m is ${f(DEG / Number(rows[0]?.rollInertiaKgm2 ?? Number.NaN), 0)} °/s² on it`);
  console.log(`      SEATBELTS · the ledger's closure |total − water − rider| peak ${span(nf('rollClosure'), 6)} N·m · the share of commanded frames whose NET moment is positive ${span(nf('rollOverShare'), 3)}`);
  console.log(`      PER SOURCE over the commanded turn, N·m (median signed · peak absolute): ${ROLL_KEYS.map((k) => `${k} ${f(med(k), 2)} · ${f(pk(k), 2)}`).join(' | ')}`);
  console.log(`      THE TWO COLUMNS: the WATER's own (the ten entries + gyro) median ${f(waterMed, 2)} N·m, per run ${span(nf('rollWaterTurnMedian'), 2)} · the RIDER RESIDUAL median ${f(riderMed, 2)}, per run ${span(nf('rollRiderTurnMedian'), 2)}`);
  console.log(`      THE NET is their small difference: median of the sum ${f(netMed, 2)} N·m, per run ${span(nf('rollTotalTurnMedian'), 2)} · the sum of the medians ${f(sumOfMedians, 2)} (medians do not sum)`);
  console.log(`      — so NO share of the net is quoted: the net is ${f(Math.abs(100 * netMed) / Math.max(Math.abs(waterMed), Math.abs(riderMed)), 1)} % of the larger column, and a percentage of it would divide by a near-zero. The two columns are the result.`);
  console.log(`      THE RESIDUAL, CHECKED INDEPENDENTLY: the contact's own roll moment from its force and centre of pressure, median ${f(median(commanded.map((x) => x.rollContact)), 2)} N·m · |direct − residual| median ${f(median(commanded.map((x) => Math.abs(x.rollContact - x.rollBy.rider))), 3)} peak ${f(peak(commanded.map((x) => Math.abs(x.rollContact - x.rollBy.rider))), 3)}`);
  console.log(`      and WHERE it implies the load presses: the residual over the contact's normal load ${f(median(commanded.map((x) => x.rollRiderArm)), 4)} m median, ${f(peak(commanded.map((x) => Math.abs(x.rollRiderArm))), 4)} peak absolute — against the feet's own half-width across, 0.13 m`);
  console.log(`      AT THE FALL, per run, N·m: ${ROLL_KEYS.map((k) => `${k} ${span(rows.map((x) => Number((x.rollByAtFall as Record<string, number>)[k])), 1)}`).join(' | ')}`);
  console.log(`      the net at the fall ${span(nf('rollTotalAtFall'), 1)} N·m = water ${span(nf('rollWaterAtFall'), 1)} + the rider residual ${span(nf('rollRiderAtFall'), 1)}`);
  console.log(`      and what it does to a board this light: the roll ACCELERATION ${span(nf('rollAlphaTurnMedian'), 0)} °/s² over the turn, ${span(nf('rollAlphaAtFall'), 0)} at the fall · the measured roll rate at the fall ${span(nf('rollRateAtFall'), 1)}°/s (peak ${span(nf('rollRatePeak'), 1)})`);
}
/**
 * **§A — step 3.3h: the owner's ruling on the crouch's reach, as an A/B readable off the rows.** `REACH=keep` is the
 * game's own `?stanceReach=keep`. The two columns are the two halves of the owner's own sum: the catching reach the
 * fall test measures the capture point against, and the height the moment bar `a_max = g·d/h` is read on. The ruling
 * is that the first should rise and the second should not move.
 */
console.log(`   §A the stance's room — stanceReach ${REACH ?? 'shipped'}: the catching REACH ${span(nf('reachTurnMedian'), 3)} m over the turn, ${span(nf('reachAtFall'), 3)} at the fall · the CoM height over the feet ${span(nf('heightTurnMedian'), 3)} m, a_max = g·d/h ${span(nf('aMaxTurn'), 2)} m/s²`);
console.log(`   the fall: margin ${span(nf('marginAtFall'), 3)} · past ${span(nf('pastAtFall'), 3)} m · relative across-speed ${span(nfSome('relAcrossAtFall'), 3)} m/s = body ${span(nfSome('bodyAcrossAtFall'), 3)} − feet ${span(nfSome('feetAcrossAtFall'), 3)} · its mean rate ${span(nfSome('relAcrossMeanRate'), 2)} m/s² · reconstructs to ${span(nfSome('checkAtFall'), 4)}`);
if (ROLL) BoardBody.rollLedger = false;
