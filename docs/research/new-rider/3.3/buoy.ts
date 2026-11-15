/**
 * Step 3.3d: **the hydrostatic support re-pointed onto the HULL's normal, built behind `?buoyFrame=hull` and measured
 * — with the blend's own regime measured first, because the blend is the whole design.**
 *
 * The wave-shape advisor's item 2 (`docs/research/water-physics/consult-log.md`, 2026-11-15): *"resolve the hydrostatic
 * support along the **hull** normal while the deck is dry and the board planes, blending to the surface normal as it
 * floats or submerges"*. Its warrant is Savitsky's own method, where the whole load — the buoyant term included — is
 * the bottom-pressure resultant **normal to the bottom**, which is what makes his pressure drag `Δ tan τ`: hydrostatic
 * pressure on a bottom wetted on one side under a **dry deck** has no side walls to turn it vertical. Ours does the
 * closed-body thing (`hullForces.ts`, `−support·slopeX, support, −support·slopeZ`), and for a **closed** immersed
 * volume that is right — Archimedes, by the divergence theorem on the waterplane that closes it.
 *
 * **The owner's terms** (put to them with step 3.3c's measured numbers): *"Yes, behind a switch — build it opt-in and
 * off by default, measure it, and show me an A/B on one wave. Nothing changes for me until I say so."* So
 * `?buoyFrame=hull`, off unless typed, pinned off for online rooms.
 *
 * **What this probe is for, and what it is not.** Step 3.3c (`README.md` Part 27 §5) already measured the *geometry* of
 * an **unconditional** re-pointing, with `hullForces.patchForce` itself on the live board's last-substep arrays: the
 * across-deck in-plane force goes **−45.9…+22.1 N → −0.1…0.0 N** (essentially all of it), the along-board component
 * falls **45–77 %** (the advisor's premise refuted — the trim angle), and as a world-horizontal force buoyancy
 * **strengthens**, 2.9–15.8 → 11.0–39.3 N. Those are the **prediction** the built switch is tested against, and the
 * switch is not unconditional, so the first question is how much of the ride the blend actually re-points:
 *
 * - `HULL_BUOYANCY`'s blend is `(1 − deck) · F_d²/(1 + F_d²)` per patch — its own **dry-deck share** and a local
 *   **planing** share on the Froude number of the patch's immersion depth. Our draft is 0.085 m on a 0.0667 m board
 *   (`predictiveBalance.ts:211`, 7.5 m/s) against Savitsky's 0.056 m, which puts the undisturbed waterline **over the
 *   deck** — so *"the deck is dry"* may rarely hold, and **a blend that is in practice always at one end is a constant
 *   and is reported as one.** `hullShare`, `dryShare` and `planeShare` below are support-weighted over the whole hull,
 *   every frame.
 * - the blend goes to 0 under a wetted deck, which is also what stops a **capsized** board being pushed under by its
 *   own buoyancy (its hull normal points down). So the payoff is expected to **fade out** where the capsize is, and
 *   that is a column, not an assumption.
 *
 * **The shadow pair, step 3.3c's technique.** The switch changes the ride, so the cells are two populations. On one
 * trajectory the walk therefore resolves each patch's support **three** ways, read-only, off the engine's own
 * last-substep arrays and through `hullForces.patchForce` itself: as shipped (`hullBuoyancy = 0`), as the **switch**
 * does it (`hullBuoyancy = 1`, the blend), and **unconditionally** on the hull normal at the same magnitude (Part 27's
 * convention, so this round reproduces it). The difference between the first two is the switch's own change to the
 * force with no trajectory confound at all.
 *
 * **One caveat on the walk, stated rather than hidden.** `patchForce` needs the patch's relative velocity for the
 * blend's Froude term, and the engine's own per-patch `relative` is a single scratch that does not survive the step. So
 * the walk rebuilds it as `board.velocityAt(patch) − sample.flow`, which is the **post-step** velocity rather than the
 * last substep's: one substep of acceleration, 1/(60·32) s. `planeSens` prints the sensitivity that buys —
 * `d(planing)/d(ln v) = 2·planing·(1 − planing)` — so the error can be read rather than argued about. The *engine's*
 * own blend, in the `BUOY=hull` cells, is exact; only the shadow carries this.
 *
 * Everything below is step 3.3c's `felt.ts` with those columns added, `FELT=deck|world` included, because the brief is
 * to measure the force fix **with the filter both ways**: they are the two halves of one deficit.
 *
 * `BUOY=hull` turns the real switch on (`BoardBodyOptions.buoyFrame`); the shadow columns are printed either way.
 *
 * ---
 *
 * Step 3.3c: **the felt vertical's low pass moved into the DECK's frame, re-measured; and the along-board column that
 * tests the advisor's geometry claim about re-pointing `buoyancy`.**
 *
 * Step 3.3b (`README.md` Part 26) attributed the bank-gain deficit on the deck's own axes and found two halves and no
 * third: `buoyancy`'s in-plane across force (0.111–0.181 ° of tilt per ° of roll in every cell) and **the instrument's
 * own 0.1 s lag** (0.084–0.132 °/° in all seven shipped-hull cells) — because `pairFelt` is low-passed over
 * `SPECIFIC_FORCE_TIME` **in the world** and only then projected onto the deck's *current* axes
 * [R, `AttachedRider.ts` `captureStep`], so a force locked exactly to the deck normal still reads an across component
 * of order `Ω · T` the moment the deck rolls. One frame before the traced fall the real in-plane force gives −6.5° and
 * the test reads −15.5°, at 130 °/s, and 0.1 s × 130 °/s = 13°.
 *
 * The wave-shape advisor's **second ruling** (`docs/research/water-physics/consult-log.md`, merged `c3ae0147`) is that
 * **the 0.1 s is defensible and its frame is not**: from Laurens 2022 (Front. Syst. Neurosci. 16:886284) the brain's
 * gravity estimate is built in **egocentric** coordinates and the otolith is a **body-fixed** sensor, so whatever
 * smoothing a human does is in body coordinates, where the same lag costs `T · d(tilt)/dt` ≈ 0.65° on this trajectory
 * against the world frame's `Ω · T` = 13° — *a factor of twenty for the same time constant*. Its ruling: the faithful
 * change is **not** to remove the filter but to keep its state on the deck's axes, `dG/dt = (A − G)/T`, which is what a
 * head-fixed sensor does and preserves the smoothing the filter exists for. That is `feltFrame: 'deck'`
 * (`?feltFrame=deck`), built opt-in and off by default, and this probe is `FELT=deck` against `FELT=world`.
 *
 * **It is not only a readout**: `humanBalance.ts`'s `px = offset.x − height · nx` puts the same filtered vertical into
 * the **capture point**, so it moves the fall margin itself and the trajectory with it. The cells below are therefore
 * re-runs, not re-reads — the falls move.
 *
 * **The second deliverable, and it is a test the probe can fail.** The advisor's item 2 (re-pointing `buoyancy` from the
 * water-surface normal to the hull normal) is the owner's decision and is NOT built here. But its ruling §1(b) claims:
 *
 *   *"The rail rotation is about the board's own long axis, so re-pointing `buoyancy` leaves its along-board component —
 *   the wave's push down the line — unchanged to first order, and rotates only the across part, by the rail angle. At
 *   trim, where rail ≈ 0, the two directions coincide exactly and nothing changes at all."*
 *
 * So the probe prints that column. After every step it **re-walks the board's own patches off the live instance's
 * last-substep arrays** (`normal`, `point`, `samples`, `area`, `thickness`, `bandSide`, `localUp` — the same arrays
 * `substep` itself wrote, so no rotation is re-derived) and recomputes each patch's `support` exactly as
 * `hullForces.patchForce` does, then resolves the buoyancy **two ways**: along the water-surface normal, as shipped
 * (`(−slopeX, 1, −slopeZ)`), and along the **hull** normal (`−patch.normal`, or the station's own `band.up` on a band
 * facet) at the same force magnitude. Both are projected on the board's own three axes, so the along-board component is
 * read before and after. **Its seatbelt is printed and is not assumed**: the re-walk's water-normal sum against the
 * ledger's own `forces.buoyancy`, which is a **mean over the step's 32 substeps** where the re-walk is the last
 * substep's — so they agree only as far as one frame of motion allows, and the probe says by how much rather than
 * claiming they must match. The second convention (the same **vertical** component rather than the same magnitude,
 * which is what a Savitsky load does) is printed beside it, because the claim should not depend on which one is meant.
 *
 * The probe also carries, **as instructions from the advisor**: `F_s` in **newtons** and `F_s/F_n` in **degrees**,
 * **un-lagged**, with `F_s` regressed on `sin(rail)` in newtons — the column that joins the pooled `sin(roll)` slope to
 * the per-frame in-plane ratio — because the bank gain is retired as the headline instrument: it conflates a force, a
 * filter and a hull unload. And TN 4187's `cos τ cos ψ` is measured at **roll ≤ 15°** while these falls happen at
 * 20.9–63.0°, where the advisor withdrew it as a bar: **1.000 is not the target and nothing here aims at it.**
 *
 * **Everything else is step 3.3b's `deck.ts` unchanged**, deliberately: the same `trimbank.ts` cell (the Canyon-matched
 * `FaceWater` 1.4 m / 2.6 m deep / 16° / 5.7 m/s, the board 0.75 fronts ahead of the crest and 45° off the fall line,
 * entry speed the face's own plus −3, −2, −1, 0, +1.5 or +3, the stances Compress and tall, 9 s a run, twelve runs a
 * cell), the same cross-check columns that reproduce Parts 24, 25 and 26 to the digit, the same `latPair`/`latWater`
 * and ledger-against-momentum seatbelts, the same pooled slopes and the same `cap.omega > 0` guard.
 *
 * Run from the repository's root (the bundle needs `node_modules` beside it; use `./node_modules/.bin/rolldown`
 * rather than `npx` — a tree without `node_modules` makes `npx` print an install banner and that has exited 0 here):
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/buoy.ts -o <scratch>/by.mjs --format esm --platform node
 *   RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/w0.jsonl node <scratch>/by.mjs
 *   BUOY=hull RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/wh0.jsonl node <scratch>/by.mjs
 *   FELT=deck BUOY=hull RIDER=new STEER=0 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/by.mjs
 *   [FELT=deck] [BUOY=hull] RIDER=new STEER=0.5 STEER_SIGN=roll STEER_FROM=0.3 STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 node <scratch>/by.mjs
 *     (STEER_FROM=0.3 is Part 25 §2's own ladder setting — after the mount's 0.17 s contact transient; the probe's
 *      own default is 0, so the six steered cells all carry it explicitly)
 *   VERTICAL=particle / HULL=rail as 3.3b's ninth and eighth cells. TRACE=<file> appends EVERY frame of every run in
 *   the invocation, which is how `results/33d/frames-world-off.jsonl` (13,422 frames) was collected: the nine cells'
 *   `world-off` legs, TRACE pointed at one file.
 *
 *   zsh does NOT word-split an unquoted variable, so `env $BASE ...` with BASE a string of assignments sets the FIRST
 *   variable to the whole string and silently runs the OLD rider on one run. Use `${=BASE}` or write them out. This
 *   round lost a whole 36-cell ladder to it and noticed only because every cell said "fell: 1 of 1".
 *
 * Env: BUOY=hull|off, FELT=deck|world, RIDER=new|old, STANCES, EXTRAS, STEER, STEER_SIGN=roll|fixed, STEER_FROM, RISE,
 * HULL=rail, VERTICAL=particle, SECONDS, SIDE, AHEAD, FACE=h,slope,speed, DEPTH, SUBSTEPS, OUT (one JSON line a run),
 * TRACE.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createPatchForce, patchForce, type WorldPatch } from '../../../../src/physics/hullForces';
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
 * **Step 3.3c's own switch.** `'deck'` is `AttachedRiderOptions.feltFrame` (`?feltFrame=deck`): the felt vertical's
 * 0.1 s low pass held on the **deck's own axes**, `dG/dt = (A − G)/T` in the board's frame, which is what a body-fixed
 * sensor does. `'world'` is the shipped behaviour — low-passed in the world, then projected on the deck's *current*
 * axes, which 3.3b measured as worth 0.084–0.132 ° of tilt per ° of roll of pure instrument at 65–330 °/s of roll.
 * **Off by default**, so a run with no `FELT` is the game's own rider.
 */
const FELT = process.env.FELT === 'deck' ? 'deck' as const : 'world' as const;

/**
 * **Step 3.3d's own switch.** `'hull'` is `BoardBodyOptions.buoyFrame` (`?buoyFrame=hull`): the hydrostatic support
 * resolved along the **hull** normal where the deck is dry and the patch planes, blending back to the water-surface
 * normal as it floats or submerges (`hullForces`' `HULL_BUOYANCY`). **Off by default**, so a run with no `BUOY` is the
 * game's own hull law, and every shadow column below is printed in both cells.
 */
const BUOY = process.env.BUOY === 'hull' ? 'hull' as const : 'off' as const;

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
   * °: **step 3.3c's paired columns.** The deck-frame tilt two shadow filters give on the SAME trajectory — one held in
   * the world and read on the deck's current axes (`tiltShadowW`, which is what the shipped rider does and must
   * reproduce the test's own `tilt` in a `FELT=world` cell), one held on the deck's axes (`tiltShadowD`, which is what
   * `feltFrame: 'deck'` does). Their difference is the instrument's, with no trajectory confound at all.
   */
  tiltShadowW: number;
  tiltShadowD: number;
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
   * °/s: the deck's own **roll rate**, `d(roll)/dt`. Step 3.3b needs it for two reasons and neither is cosmetic.
   * (1) `pairFelt` is low-passed over 0.1 s in the **world** and only then projected on the deck's *current* axes, so
   * a force locked to the deck normal still reads an across component of about `Ω · T` once the deck is rolling —
   * the felt vertical lags the deck, and that is a property of the instrument, not a force. (2) The force ledger is
   * accumulated over the step's substeps at each substep's own rotation and read against the end-of-step orientation,
   * so every entry carries a residue of order `F · Ω · h/2` on the across axis for the same reason.
   */
  rollRate: number;
  /**
   * N: **the water's support on the rider's own hand** (`AttachedRider.handSupport`), its across component on the
   * board's level-left axis and its magnitude. Step 3.3c needed this: it is a water force on the **pair** that is NOT
   * in `BoardBody.forces`, so whenever the hand is in the water the momentum route and the board's force ledger must
   * disagree by exactly it — which is what broke the `latPair − latWater` seatbelt in the deck-frame cells' last
   * frames, where the rider rolls past 70° and puts a hand in. Its reaction is on the water (`handSupport`'s own law).
   */
  handLat: number;
  handMag: number;
  /** °/s about the world vertical, and `speed × that` in m/s² — Forsyth's steady-turn identity on our own board. */
  turnRate: number;
  vOmega: number;
  speed: number;
  drift: number;
  /** °: the lean the steer asks the balance for (`AttachedRider.leanAsked`), the only channel the stick has on this rider. */
  leanAsked: number;
  /**
   * **Step 3.3c's buoyancy geometry.** The board's own patches re-walked off the live instance's last-substep arrays
   * and each patch's `support` recomputed exactly as `hullForces.patchForce` does, then the buoyancy resolved two ways
   * and projected on the board's own axes, N: `bn` as shipped (along the water-surface normal `(−slopeX, 1, −slopeZ)`)
   * and `bh` along the **hull** normal (`−patch.normal`, or the station's `band.up` on a band facet) **at the same force
   * magnitude**. `A` is the along-board axis (the board's local +z), `S` the across axis in the plane of the deck (local
   * +x) and `N` the deck normal (local +y). `bhvA` is the second convention: the same **vertical** component instead of
   * the same magnitude, which is what a Savitsky load does.
   */
  bnA: number;
  bnS: number;
  bnN: number;
  bhA: number;
  bhS: number;
  bhN: number;
  bhvA: number;
  /** N: the same two, horizontal magnitude — the "push down the line" as a world-horizontal force rather than a board-axis one. */
  bnHoriz: number;
  bhHoriz: number;
  /**
   * N: the same two projected on the world-horizontal direction **down the water's own slope** at the board
   * (`(−slopeX, −slopeZ)` normalised), which is the direction `buoyancy`'s shipped term literally points in. The
   * along-board column is the advisor's axis; this one is where the force it re-points actually goes.
   */
  bnDown: number;
  bhDown: number;
  /** N: the re-walk's own water-normal sum against the ledger's `forces.buoyancy` — the seatbelt, a last substep against a 32-substep mean. */
  bWalkMag: number;
  bLedgerMag: number;
  bWalkGap: number;
  /** The patches the re-walk found wet, and how many of them are rail-band facets (0 on the default flat section). */
  wetPatches: number;
  bandPatches: number;
  /**
   * °: the deck normal against the WATER's normal, decomposed on the deck's own axes — the **roll** part (about the
   * board's long axis, which is the rotation the advisor's claim is about) and the **trim** part (about the across axis,
   * which is the one that moves the ALONG-board component). The claim holds only if the trim part is small.
   */
  rollPartDeg: number;
  trimPartDeg: number;
  /**
   * **Step 3.3d's own columns.** The same walk, resolved a third way: `bb*` is what the **switch** does — the blend
   * `HULL_BUOYANCY` applies, read out of `hullForces.patchForce` itself with `hullBuoyancy = 1`, so it is the shipped
   * law and not a re-derivation of it. `bn*` (shipped) and `bh*` (unconditional, Part 27) are the two ends it lies
   * between. On one trajectory, so `bb − bn` is the switch's own change to the force with no population confound.
   */
  bbA: number;
  bbS: number;
  bbN: number;
  bbHoriz: number;
  bbDown: number;
  /**
   * The **regime**, support-weighted over every wet patch this frame, which is the question the blend's design turns
   * on: `hullShare` is `patchForce`'s own blend `(1 − deck) · planing` (0 = all on the water's normal, 1 = all on the
   * hull's), `dryShare` the deck's dry part of it and `planeShare` the local Froude part. `hullShareHigh` is the share
   * of the support on patches past 0.5, so "always at one end" can be read rather than inferred from a mean.
   */
  hullShare: number;
  dryShare: number;
  planeShare: number;
  hullShareHigh: number;
  /** `d(planing)/d(ln v)` = `2·planing·(1 − planing)`, support-weighted: how much the walk's rebuilt velocity can cost. */
  planeSens: number;
  /**
   * **The one column the coordinator asked for on the owner's behalf, and it is a diagnostic for the NEXT round, not a
   * finding of this one.** `AttachedRider.predictor.sent` and `.raw` are public "for probes" [R,
   * `predictiveBalance.ts:1091`]: the ankle command the predictor sends, rad, after and before its clamps. The owner
   * has now named "correction while turning" from three separate rides, and 3.2w measured that the shipped predictor
   * does no better than pinning its output to zero. The question is whether its command treats a **commanded** lean
   * the same way it treats an unwanted roll — if the slope of this command on the deck's roll is the same sign and
   * size in a steered cell as in the unsteered one, then it does not distinguish them.
   * **Regressed, never read as a sign**: `predictiveBalance`'s own sign convention is not this probe's, so only a
   * comparison of two slopes taken by the same instrument is quoted.
   *
   * **And `cmdOnLeanSlope`/`cmdOnLeanR2` are printed but are NOT usable, which is why this is said here and in the
   * report.** `leanAsked` ramps 0 → the steer's ask over about 0.55 s and then sits **flat** for the rest of the run
   * (0 → 25.00° by 0.85 s, then 25.00 for 2.3 s on the traced run), so it is a near-constant regressor and its low R²
   * (0.000–0.084 over the six steered cells, against 0.158–0.543 for the same command on the roll) is mostly that, not
   * a statement about the controller. Do not read it as "the command carries no information about the ask".
   */
  cmdAnkle: number;
  cmdAnkleRaw: number;
  cmdHip: number;
}

/**
 * **Step 3.3c.** The live `BoardBody`'s own last-substep arrays, private to TypeScript and present at run time: the
 * very arrays `substep` wrote this frame (`normal` and `point` world, `samples` each patch's own water, `localUp` the
 * station's deck direction in the BOARD frame). Read, never written — the probe re-walks the geometry the engine just
 * used rather than re-deriving a rotation, which is where the frame errors of the last fortnight came from.
 */
interface BoardInner {
  count: number;
  normal: Float64Array;
  point: Float64Array;
  area: Float64Array;
  thickness: Float64Array;
  bandSide: Int8Array;
  bandFace: Float64Array;
  bandGate: Float64Array;
  localUp: Float64Array;
  rotation: Float64Array;
  samples: Parameters<typeof patchForce>[1][];
  hollowOpen: boolean;
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
    // Step 3.3d, opt-in and off by default: the hydrostatic support along the hull's own normal where the deck is dry.
    ...(BUOY === 'hull' ? { buoyFrame: 'hull' as const } : {}),
  });
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    // Step 3.3c, opt-in and off by default: the felt vertical's low pass on the deck's own axes.
    ...(FELT === 'deck' ? { feltFrame: 'deck' as const } : {}),
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
  /** Step 3.3b: the deck's own across axis (the board's local +x in the world) and the pair's whole specific force. */
  const deckAcross = new Vector3();
  /** Step 3.3c: the board's own along axis (local +z in the world) and a scratch for a band station's deck direction. */
  const deckAlong = new Vector3();
  const patchUp = new Vector3();
  /** Step 3.3c: `patchForce`'s own inputs and output, re-used each patch. `walkZero` is the relative velocity it is given. */
  const walkPatch: WorldPatch = { position: { x: 0, y: 0, z: 0 }, normal: { x: 0, y: 0, z: 0 }, area: 0, thickness: 0 };
  const walkBand = { faceArea: 0, up: { x: 0, y: 0, z: 0 }, tangent: { x: 0, y: 0, z: 0 }, gate: 0 };
  const walkZero = { x: 0, y: 0, z: 0 };
  const walkForce = createPatchForce();
  /** Step 3.3d: the switch's own resolution needs its own output and the patch's rebuilt relative velocity. */
  const walkBlend = createPatchForce();
  const walkRel = { x: 0, y: 0, z: 0 };
  const walkVel = new Vector3();
  const pairSpec = new Vector3();
  /** Step 3.3c: how many frames the water asked for `buoyancyNormal`'s overhang branch (0 on a `FaceWater`), and how many found an open deck hollow. */
  let normalBranch = 0;
  let hollowFrames = 0;
  /** Step 3.3b: each water entry held low-passed in the world over SPECIFIC_FORCE_TIME, the way `pairFelt` is. */
  const lp: Record<string, Vector3> = Object.fromEntries(WATER_KEYS.map((k) => [k, new Vector3()]));
  const lpDelta = new Vector3();
  /** Step 3.3c: the reading rotated into whichever frame the low pass is held in, and the board's frame to rotate it by. */
  const lpRead = new Vector3();
  const boardFrame = new Quaternion();
  /** Step 3.3c: `pairFelt` brought back into the WORLD, since with `feltFrame: 'deck'` the field itself is board-frame. */
  const pfWorld = new Vector3();
  /**
   * **Step 3.3c's PAIRED comparison.** Two shadow copies of the rider's own filter, run side by side on **one**
   * trajectory off the probe's own `pairSpec` (the same momentum difference `captureStep` low-passes): `shadowW` held
   * in the WORLD and read on the deck's current axes, `shadowD` held on the DECK's axes. Both are read-only; neither
   * touches the rider. This is the only comparison of the two frames with **no population confound** — the cells
   * themselves cannot give one, because the filter feeds the capture point, so changing it changes the ride. `shadowW`
   * against the test's own `tiltAcross` is its seatbelt, and in the world cells it must reproduce it.
   */
  const shadowW = new Vector3();
  const shadowD = new Vector3();
  const shadowRead = new Vector3();
  let shadowFresh = true;
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
    // The two shadow filters, stepped on this frame's own reading. `boardFrame` is set below for the split; set here
    // too because the shadows need it before it, and copying a quaternion twice a frame costs nothing.
    boardFrame.copy(board.orientation).invert();
    if (havePair) {
      const sBlend = 1 - Math.exp(-STEP / SPECIFIC_FORCE_TIME);
      if (shadowFresh) {
        shadowW.set(0, G, 0);
        shadowD.set(0, G, 0).applyQuaternion(boardFrame);
        shadowFresh = false;
      } else {
        shadowW.addScaledVector(shadowRead.copy(pairSpec).sub(shadowW), sBlend);
        shadowD.addScaledVector(shadowRead.copy(pairSpec).applyQuaternion(boardFrame).sub(shadowD), sBlend);
      }
    }
    const tiltShadowW = shadowFresh ? Number.NaN : Math.atan2(shadowW.dot(deckAcross), shadowW.dot(boardUp)) * DEG;
    const tiltShadowD = shadowFresh ? Number.NaN : Math.atan2(shadowD.x, shadowD.y) * DEG;
    const tiltPair = havePair ? Math.atan2(pairSpec.dot(deckAcross), pairSpec.dot(boardUp)) * DEG : Number.NaN;
    // The same ten entries low-passed in the WORLD over SPECIFIC_FORCE_TIME and only then projected on the deck's
    // axes — the order `pairFelt` itself uses, which matters because the deck turns up to 98 °/s inside the filter.
    const blend = 1 - Math.exp(-STEP / SPECIFIC_FORCE_TIME);
    const lpOnN: Record<string, number> = {};
    const lpOnS: Record<string, number> = {};
    let lpN = 0;
    let lpS = 0;
    // **Step 3.3c: the split must follow the rider's own frame or it is not a split of what the body stands on.** With
    // `FELT=world` each entry is held low-passed in the WORLD and only then projected, which is what the shipped
    // `pairFelt` does. With `FELT=deck` each entry is rotated into the board's frame FIRST and held there, which is what
    // `feltFrame: 'deck'` does. Low-passing in the world and reading a deck-frame rider against it was the trap 3.3b
    // left for this round (its own lagged column gives `pressure` 0.193 °/°, nine times its real share, purely from
    // that mismatch), and the probe's seatbelt — the split's tilt against the test's own `tiltAcross` — is what catches
    // it either way.
    for (const key of WATER_KEYS) {
      const F = (board.forces as unknown as Record<string, Vector3>)[key];
      const held = lp[key];
      const reading = FELT === 'deck' ? lpRead.copy(F).applyQuaternion(boardFrame) : lpRead.copy(F);
      if (lpFresh) held.copy(reading);
      else held.addScaledVector(lpDelta.copy(reading).sub(held), blend);
      const n = FELT === 'deck' ? held.y : held.dot(boardUp);
      const s = FELT === 'deck' ? held.x : held.dot(deckAcross);
      lpOnN[key] = n;
      lpOnS[key] = s;
      lpN += n;
      lpS += s;
    }
    lpFresh = false;
    const tiltFelt = Math.atan2(lpS, lpN) * DEG;
    /**
     * **Step 3.3c's second deliverable: the along-board column.** The advisor's ruling §1(b) claims that re-pointing
     * `buoyancy` from the water-surface normal to the hull normal "leaves its along-board component — the wave's push
     * down the line — unchanged to first order, and rotates only the across part, by the rail angle". This is the
     * column that tests it, and it can fail: the deck normal differs from the water normal by a **trim** rotation about
     * the ACROSS axis as well as a **rail** rotation about the long axis, and it is the trim one that moves the
     * along-board component. Both are printed (`trimPartDeg`, `rollPartDeg`) so a failure says why.
     *
     * The walk recomputes each patch's `support` exactly as `hullForces.patchForce` does
     * (`density · g · area · thickness · submerged`, the submerged share taken on the slab from its bottom face to its
     * deck) off the engine's own arrays, and resolves it twice. `deckWet` is 1 because the deck hollow is off here, and
     * `hollowFrames` counts any frame where that is not true rather than assuming it.
     */
    deckAlong.set(0, 0, 1).applyQuaternion(board.orientation);
    const bb = board as unknown as BoardInner;
    if (bb.hollowOpen) hollowFrames += 1;
    let bnX = 0;
    let bnY = 0;
    let bnZ = 0;
    let bhX = 0;
    let bhY = 0;
    let bhZ = 0;
    let bhvX = 0;
    let bhvY = 0;
    let bhvZ = 0;
    let wetPatches = 0;
    let bandPatches = 0;
    /** Step 3.3d: the switch's own blended resolution, and the regime it chose, support-weighted. */
    let bbX = 0;
    let bbY = 0;
    let bbZ = 0;
    let wSum = 0;
    let wHull = 0;
    let wDry = 0;
    let wPlane = 0;
    let wHigh = 0;
    let wSens = 0;
    for (let k = 0; k < bb.count; k += 1) {
      walkPatch.position.x = bb.point[k * 3];
      walkPatch.position.y = bb.point[k * 3 + 1];
      walkPatch.position.z = bb.point[k * 3 + 2];
      walkPatch.normal.x = bb.normal[k * 3];
      walkPatch.normal.y = bb.normal[k * 3 + 1];
      walkPatch.normal.z = bb.normal[k * 3 + 2];
      walkPatch.area = bb.area[k];
      walkPatch.thickness = bb.thickness[k];
      const banded = bb.bandSide[k] !== 0;
      // The hull's own "up" through this patch: the band station's deck direction on a band facet (`patchForce`'s own
      // trap 1 — a near-vertical facet's deck is not along its own normal), else the bottom normal reversed.
      if (banded) {
        patchUp.set(bb.localUp[k * 3], bb.localUp[k * 3 + 1], bb.localUp[k * 3 + 2]).applyQuaternion(board.orientation);
        walkBand.faceArea = bb.bandFace[k];
        walkBand.up.x = patchUp.x;
        walkBand.up.y = patchUp.y;
        walkBand.up.z = patchUp.z;
        walkBand.tangent.x = bb.rotation[2];
        walkBand.tangent.y = bb.rotation[5];
        walkBand.tangent.z = bb.rotation[8];
        walkBand.gate = bb.bandGate[k];
        walkPatch.band = walkBand;
      } else {
        patchUp.set(-walkPatch.normal.x, -walkPatch.normal.y, -walkPatch.normal.z);
        walkPatch.band = undefined;
      }
      patchUp.normalize();
      // **The engine's own function, on the engine's own last-substep arrays** — not a re-derivation of `support`. The
      // relative velocity is passed as zero deliberately: `patchForce` sets `buoyancy` before its `speed > 0` gate, so
      // the hydrostatic term is exactly the shipped one while `pressure` and `friction` come back 0 and are not read.
      const out = patchForce(walkPatch, bb.samples[k], walkZero, 1, walkForce);
      const fx = out.buoyancy.x;
      const fy = out.buoyancy.y;
      const fz = out.buoyancy.z;
      const mag = Math.hypot(fx, fy, fz);
      if (!(mag > 0)) continue;
      wetPatches += 1;
      if (banded) bandPatches += 1;
      if (bb.samples[k].buoyancyNormal !== undefined) normalBranch += 1;
      bnX += fx;
      bnY += fy;
      bnZ += fz;
      // Re-pointed on the hull normal, two conventions: the same force MAGNITUDE, and the same VERTICAL component
      // (a Savitsky load, which still carries the weight). Direction is what item 2 changes; the probe refuses to
      // decide which magnitude is meant and prints both.
      bhX += mag * patchUp.x;
      bhY += mag * patchUp.y;
      bhZ += mag * patchUp.z;
      const lift = patchUp.y > 0.1 ? fy / patchUp.y : Number.NaN;
      bhvX += lift * patchUp.x;
      bhvY += lift * patchUp.y;
      bhvZ += lift * patchUp.z;
      /**
       * **Step 3.3d: the switch's own resolution, through `hullForces.patchForce` itself.** The blend needs the
       * patch's relative velocity, which the engine's own per-patch scratch does not keep, so it is rebuilt from the
       * board's post-step velocity at the patch minus the water's flow — one substep of acceleration later than the
       * engine's own (the header's caveat). `walkRel` carries it; `hullShare` comes back out of `patchForce`, so the
       * blend is read and not re-derived, and `planing` is recomputed only to split that share into its two factors.
       */
      board.velocityAt(walkVel.set(walkPatch.position.x, walkPatch.position.y, walkPatch.position.z), walkVel);
      walkRel.x = walkVel.x - bb.samples[k].flowX;
      walkRel.y = walkVel.y - bb.samples[k].flowY;
      walkRel.z = walkVel.z - bb.samples[k].flowZ;
      const blend = patchForce(walkPatch, bb.samples[k], walkRel, 1, walkBlend, 1, 0, 1, 1);
      bbX += blend.buoyancy.x;
      bbY += blend.buoyancy.y;
      bbZ += blend.buoyancy.z;
      const vsq = walkRel.x * walkRel.x + walkRel.y * walkRel.y + walkRel.z * walkRel.z;
      const head = G * Math.max(bb.samples[k].surfaceY - walkPatch.position.y, 0);
      const planing = vsq > 0 ? vsq / (vsq + head) : 0;
      wSum += mag;
      wHull += mag * blend.hullShare;
      wDry += mag * (planing > 0 ? blend.hullShare / planing : 0);
      wPlane += mag * planing;
      if (blend.hullShare > 0.5) wHigh += mag;
      wSens += mag * 2 * planing * (1 - planing);
    }
    const ledgerB = board.forces.buoyancy;
    /** The horizontal down-slope direction at the board, from the centre sample's own slope: `|(−slopeX, −slopeZ)|`. */
    const downHoriz = Math.hypot(cen.slopeX, cen.slopeZ);
    /**
     * The felt vertical, in the world and against the deck. `pairFelt` is `a + g ŷ`, low-passed SPECIFIC_FORCE_TIME.
     *
     * **Step 3.3c's own frame trap, caught by this round and worth the comment.** With `feltFrame: 'deck'` the field
     * `pairFelt` holds its state on the **board's** axes, not the world's — that is the whole change — so reading
     * `pf.x`, `pf.y`, `pf.z` as a world vector would make `feltWorld`, `pfLat`, `tiltCheck`, the bank gain and the
     * consistency check all nonsense in exactly the deck cells, while the headline columns (which run off the test's
     * own `tiltAcross`, a board-frame angle either way) stayed right. It is rotated back into the world here so that
     * every published column is the SAME quantity in both frames. The probe printed a bank gain of −0.346 before this
     * was found, which is what a world-frame instrument reads off a board-frame vector.
     */
    const pf = inner.pairFelt ? (FELT === 'deck' ? pfWorld.copy(inner.pairFelt).applyQuaternion(board.orientation) : pfWorld.copy(inner.pairFelt)) : undefined;
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
      tiltShadowW,
      tiltShadowD,
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
      rollRate,
      handLat: rider.handSupport.dot(side),
      handMag: rider.handSupport.length(),
      turnRate,
      vOmega: speed * (turnRate / DEG),
      speed,
      drift,
      leanAsked: (inner.leanAsked ?? inner.bankReference ?? 0) * DEG,
      // Step 3.3c: the buoyancy walk's two resolutions on the board's own axes, and its seatbelt against the ledger.
      bnA: bnX * deckAlong.x + bnY * deckAlong.y + bnZ * deckAlong.z,
      bnS: bnX * deckAcross.x + bnY * deckAcross.y + bnZ * deckAcross.z,
      bnN: bnX * boardUp.x + bnY * boardUp.y + bnZ * boardUp.z,
      bhA: bhX * deckAlong.x + bhY * deckAlong.y + bhZ * deckAlong.z,
      bhS: bhX * deckAcross.x + bhY * deckAcross.y + bhZ * deckAcross.z,
      bhN: bhX * boardUp.x + bhY * boardUp.y + bhZ * boardUp.z,
      bhvA: bhvX * deckAlong.x + bhvY * deckAlong.y + bhvZ * deckAlong.z,
      bnHoriz: Math.hypot(bnX, bnZ),
      bhHoriz: Math.hypot(bhX, bhZ),
      bnDown: downHoriz > 1e-9 ? (bnX * -cen.slopeX + bnZ * -cen.slopeZ) / downHoriz : 0,
      bhDown: downHoriz > 1e-9 ? (bhX * -cen.slopeX + bhZ * -cen.slopeZ) / downHoriz : 0,
      bWalkMag: Math.hypot(bnX, bnY, bnZ),
      bLedgerMag: ledgerB.length(),
      bWalkGap: Math.hypot(bnX - ledgerB.x, bnY - ledgerB.y, bnZ - ledgerB.z),
      wetPatches,
      bandPatches,
      rollPartDeg: Math.atan2(nW.dot(deckAcross), nW.dot(boardUp)) * DEG,
      trimPartDeg: Math.atan2(nW.dot(deckAlong), nW.dot(boardUp)) * DEG,
      // Step 3.3d: the switch's own blended resolution on the same three axes, and the regime it chose.
      bbA: bbX * deckAlong.x + bbY * deckAlong.y + bbZ * deckAlong.z,
      bbS: bbX * deckAcross.x + bbY * deckAcross.y + bbZ * deckAcross.z,
      bbN: bbX * boardUp.x + bbY * boardUp.y + bbZ * boardUp.z,
      bbHoriz: Math.hypot(bbX, bbZ),
      bbDown: downHoriz > 1e-9 ? (bbX * -cen.slopeX + bbZ * -cen.slopeZ) / downHoriz : 0,
      hullShare: wSum > 0 ? wHull / wSum : 0,
      dryShare: wSum > 0 ? wDry / wSum : 0,
      planeShare: wSum > 0 ? wPlane / wSum : 0,
      hullShareHigh: wSum > 0 ? wHigh / wSum : 0,
      planeSens: wSum > 0 ? wSens / wSum : 0,
      // The predictor's own command, read off its public probe fields. Nothing is written; the rider does not see this.
      cmdAnkle: rider.predictor.sent[0],
      cmdAnkleRaw: rider.predictor.raw[0],
      cmdHip: rider.predictor.sent[1],
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
    bar: 'felt', rider: RIDER, stance: st, extra, steer: STEER, steerSign, steerFrom: STEER_FROM, vertical: VERTICAL,
    /** Step 3.3c: which frame the felt vertical's low pass was held in. `'world'` is the shipped rider. */
    feltFrame: FELT,
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
    /**
     * The hand in the water, N: the frames it is in at all, its across force, and whether the `latPair − latWater`
     * residual IS it — `|residual × pairMass − handLat|`, which should be ~0 wherever the hand is the whole of it.
     */
    handFrames: frames.filter((x) => x.handMag > 1e-6).length,
    /**
     * The frames where the two routes part company at all (> 0.01 m/s²), and when the first one is. Read `pushCapped`
     * [R, `BoardBody.ts`]: with the standing rider's power window the board takes only a **share** of the feet's push,
     * so on a capped substep the pair's momentum is NOT the water's alone, by construction (ruling 27's A-lite). That
     * is what these frames are, and they are late and few; the pooled slopes carry them and this column sizes them.
     */
    ledgerOffFrames: frames.filter((x) => Number.isFinite(x.latPair) && Math.abs(x.latPair - x.latWater) > 0.01).length,
    ledgerOffFrom: r(frames.find((x) => Number.isFinite(x.latPair) && Math.abs(x.latPair - x.latWater) > 0.01)?.t ?? Number.NaN, 3),
    handLatPeak: r(peak(abs('handLat')), 1), handMagPeak: r(peak(abs('handMag')), 1),
    handExplainsPeak: r(peak(frames.map((x) => Math.abs((x.latPair - x.latWater) * pairMass - x.handLat))), 3),
    handExplainsMedian: r(median(frames.map((x) => Math.abs((x.latPair - x.latWater) * pairMass - x.handLat))), 3),
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
    /**
     * **Step 3.3c's paired columns**: the two shadow filters on the SAME trajectory. `shadowW` is the shipped order
     * (held in the world, read on the deck) and its agreement with the test's own `tiltAcross` is the seatbelt;
     * `shadowD` is the deck frame. The difference between them is the instrument's alone.
     */
    tiltShadowWAtFall: r(last?.tiltShadowW ?? Number.NaN, 2), tiltShadowDAtFall: r(last?.tiltShadowD ?? Number.NaN, 2),
    shadowWVsTestMedian: r(median(frames.map((x) => Math.abs(x.tiltShadowW - x.tilt))), 3),
    shadowWVsTestAtFall: r(Math.abs((last?.tiltShadowW ?? Number.NaN) - (last?.tilt ?? Number.NaN)), 3),
    /** The two shadows against the un-lagged truth, `atan(F_s/F_n)`: how much tilt each frame's filter ADDS, °. */
    shadowWErrAbsMedian: r(median(frames.map((x) => Math.abs(x.tiltShadowW - x.tiltForce))), 3),
    shadowDErrAbsMedian: r(median(frames.map((x) => Math.abs(x.tiltShadowD - x.tiltForce))), 3),
    shadowWErrAtFall: r((last?.tiltShadowW ?? Number.NaN) - (last?.tiltForce ?? Number.NaN), 2),
    shadowDErrAtFall: r((last?.tiltShadowD ?? Number.NaN) - (last?.tiltForce ?? Number.NaN), 2),
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
     * **Step 3.3c, the un-lagged columns the advisor asked be carried in place of the bank gain**: `F_s` in NEWTONS and
     * `F_s/F_n` in DEGREES, off the instantaneous ledger (no 0.1 s anywhere in them), and `F_s` regressed on
     * `sin(rail)` in newtons — the one column that joins the pooled `sin(roll)` slope to the per-frame in-plane ratio.
     * The bank gain is retired as the headline: it conflates a force, a filter and a hull unload.
     */
    fSAbsMedian: r(median(abs('fS')), 1), fSAtFallN: r(last?.fS ?? Number.NaN, 1),
    fNAtFallN: r(last?.fN ?? Number.NaN, 1),
    fSPerSinRailN: r(fit(frames.map((x) => Math.sin(x.rail / DEG)), col('fS')).slope, 1),
    fSPerSinRailR2: r(fit(frames.map((x) => Math.sin(x.rail / DEG)), col('fS')).r2, 3),
    /**
     * **Step 3.3c's buoyancy geometry.** The along-board component of `buoyancy` as it is now (`bnA`, along the water's
     * surface normal) and as it would be on the hull normal at the same magnitude (`bhA`) — the advisor's claim is that
     * these are equal to first order. `bhvA` is the same-vertical convention. And the deck normal's own misalignment
     * from the water's, split into the roll part (about the long axis, the rotation the claim is about) and the trim
     * part (about the across axis, the one that moves the along-board component).
     */
    bnAMedian: r(median(col('bnA')), 1), bhAMedian: r(median(col('bhA')), 1), bhvAMedian: r(median(col('bhvA')), 1),
    bnAAtFall: r(last?.bnA ?? Number.NaN, 1), bhAAtFall: r(last?.bhA ?? Number.NaN, 1), bhvAAtFall: r(last?.bhvA ?? Number.NaN, 1),
    bnSMedian: r(median(col('bnS')), 1), bhSMedian: r(median(col('bhS')), 1),
    bnSAtFall: r(last?.bnS ?? Number.NaN, 1), bhSAtFall: r(last?.bhS ?? Number.NaN, 1),
    bnNMedian: r(median(col('bnN')), 1), bhNMedian: r(median(col('bhN')), 1),
    bnHorizMedian: r(median(col('bnHoriz')), 1), bhHorizMedian: r(median(col('bhHoriz')), 1),
    bnDownMedian: r(median(col('bnDown')), 1), bhDownMedian: r(median(col('bhDown')), 1),
    bnDownAtFall: r(last?.bnDown ?? Number.NaN, 1), bhDownAtFall: r(last?.bhDown ?? Number.NaN, 1),
    /** The walk's seatbelt: its own water-normal sum against the ledger's `forces.buoyancy` (a last substep against a 32-substep mean), N and %. */
    bWalkMagMedian: r(median(col('bWalkMag')), 1), bLedgerMagMedian: r(median(col('bLedgerMag')), 1),
    bWalkGapMedian: r(median(col('bWalkGap')), 2), bWalkGapPeak: r(peak(abs('bWalkGap')), 2),
    bWalkGapShare: r((100 * median(col('bWalkGap'))) / median(col('bLedgerMag')), 2),
    wetPatchesMedian: r(median(col('wetPatches')), 0), bandPatchesPeak: r(peak(col('bandPatches')), 0),
    normalBranchFrames: normalBranch, hollowFrames,
    rollPartMedian: r(median(col('rollPartDeg')), 2), rollPartAtFall: r(last?.rollPartDeg ?? Number.NaN, 2),
    trimPartMedian: r(median(col('trimPartDeg')), 2), trimPartAtFall: r(last?.trimPartDeg ?? Number.NaN, 2),
    trimPartPeak: r(peak(abs('trimPartDeg')), 2), rollPartPeak: r(peak(abs('rollPartDeg')), 2),
    /**
     * **Step 3.3d.** The switch's own resolution (`bb*`) beside the shipped one and the unconditional one, on one
     * trajectory; and **the regime**, which is the design question: the blend's own share, its two factors and how much
     * of the support is past half. A blend that sits at one end is a constant, so these are printed with their spread
     * and at the fall, where the deck wets and the payoff is expected to fade.
     */
    bbAMedian: r(median(col('bbA')), 1), bbAAtFall: r(last?.bbA ?? Number.NaN, 1),
    bbSMedian: r(median(col('bbS')), 1), bbSAtFall: r(last?.bbS ?? Number.NaN, 1),
    bbNMedian: r(median(col('bbN')), 1),
    bbHorizMedian: r(median(col('bbHoriz')), 1), bbDownMedian: r(median(col('bbDown')), 1), bbDownAtFall: r(last?.bbDown ?? Number.NaN, 1),
    hullShareMedian: r(median(col('hullShare')), 3), hullShareAtFall: r(last?.hullShare ?? Number.NaN, 3),
    hullShareMin: r(Math.min(...col('hullShare')), 3), hullShareMax: r(Math.max(...col('hullShare')), 3),
    dryShareMedian: r(median(col('dryShare')), 3), dryShareAtFall: r(last?.dryShare ?? Number.NaN, 3),
    planeShareMedian: r(median(col('planeShare')), 4), planeShareMin: r(Math.min(...col('planeShare')), 4),
    hullShareHighMedian: r(median(col('hullShareHigh')), 3), hullShareHighAtFall: r(last?.hullShareHigh ?? Number.NaN, 3),
    planeSensMedian: r(median(col('planeSens')), 5), planeSensPeak: r(peak(col('planeSens')), 5),
    /** The frames the blend never left the shipped end (`hullShare` = 0) and the frames it was past 0.9, of the run. */
    hullShareZeroFrames: col('hullShare').filter((x) => x <= 0).length,
    hullShareFullFrames: col('hullShare').filter((x) => x >= 0.9).length,
    /**
     * The predictor's ankle command against the deck's ROLL and against the lean the steer ASKED, per run. The point of
     * the pair is the comparison: if the slope on roll is the same in a steered cell as in the unsteered one, the
     * predictor does not distinguish a commanded lean from an unwanted one.
     */
    cmdOnRollSlope: r(fit(col('roll'), col('cmdAnkle')).slope, 5),
    cmdOnRollR2: r(fit(col('roll'), col('cmdAnkle')).r2, 3),
    cmdOnLeanSlope: r(fit(col('leanAsked'), col('cmdAnkle')).slope, 5),
    cmdOnLeanR2: r(fit(col('leanAsked'), col('cmdAnkle')).r2, 3),
    cmdAnkleAbsMedian: r(median(abs('cmdAnkle')), 5), cmdAnklePeak: r(peak(abs('cmdAnkle')), 5),
    cmdClampedFrames: frames.filter((x) => Math.abs(x.cmdAnkleRaw - x.cmdAnkle) > 1e-9).length,
  };
}

const rows: Record<string, unknown>[] = [];
const t0 = Date.now();
for (const st of STANCES) for (const extra of EXTRAS) rows.push(oneRun(st, extra));
for (const row of rows) emit(row, OUT);
const nf = (k: string) => rows.map((x) => Number(x[k]));
const nfSome = (k: string) => rows.map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const fellRows = rows.filter((x) => x.fell);
console.log(`## buoy (3.3d) — rider ${RIDER}${process.env.HULL === 'rail' ? ' · hull=rail' : ''}, steer ${STEER}${STEER !== 0 ? ` (${STEER_SIGN}, from ${STEER_FROM} s)` : ''} · FaceWater vertical '${VERTICAL}' · FELT FRAME '${FELT}'${FELT === 'deck' ? ' (feltFrame: deck, step 3.3c, OPT-IN)' : ' (the shipped filter)'} · BUOY FRAME '${BUOY}'${BUOY === 'hull' ? ' (buoyFrame: hull, step 3.3d, OPT-IN)' : ' (the shipped hull law)'}`);
console.log(`   ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall · face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s, ${SECONDS} s each`);
console.log(`   fell: ${fellRows.length} of ${rows.length}${fellRows.length ? ` at ${span(fellRows.map((x) => Number(x.fellAtS)), 2)} s` : ''}`);
console.log(`   CHECK vs Part 24's twelve: bank peak ${span(nf('bankPeakDeg'))}° · roll peak ${span(nf('rollPeakDeg'))}° · rail peak ${span(nf('railPeakDeg'))}° · drift peak ${span(nf('driftPeakDeg'))}°`);
console.log(`   §1 the base's across acceleration, m/s² (+ toward the board's level-left):`);
console.log(`      the PAIR's own (momentum): mean ${span(nf('latPairMeanSigned'), 2)} · median ${span(nf('latPairMedian'), 2)} · |median| ${span(nf('latPairAbsMedian'), 2)} · peak ${span(nf('latPairPeak'), 2)}`);
console.log(`      the same off the water force ledger: mean ${span(nf('latWaterMeanSigned'), 2)} · |median| ${span(nf('latWaterAbsMedian'), 2)} · SEATBELT |difference| median ${span(nf('latResidualMedian'), 3)} peak ${span(nf('latResidualPeak'), 3)}`);
console.log(`      and WHAT the residual is: the water's support on the RIDER'S HAND, which is not in BoardBody.forces — in ${span(nf('handFrames'), 0)} frames a run, across force peak ${span(nf('handLatPeak'), 1)} N (|support| peak ${span(nf('handMagPeak'), 1)} N) · |residual × mass − handLat| median ${span(nf('handExplainsMedian'), 3)} N, peak ${span(nf('handExplainsPeak'), 3)} N`);
console.log(`      the frames the two routes part company at all (> 0.01 m/s², which pushCapped's shared push makes by construction): ${span(nf('ledgerOffFrames'), 0)} of ${span(nf('frames'), 0)} a run, from ${span(nfSome('ledgerOffFrom'), 3)} s`);
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
console.log(`   §4 THE DECK'S OWN AXES (3.3b/c) — n̂ the deck normal, ŝ the across axis IN THE PLANE OF THE DECK, all ${pool.length} frames pooled:`);
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
console.log(`      THE FELT SPLIT (each entry low-passed over ${SPECIFIC_FORCE_TIME} s in the ${FELT === 'deck' ? "DECK's own frame" : 'world, then projected'}): F_n at the fall ${span(nf('lpNAtFall'), 1)} N · F_s at the fall ${span(nf('lpSAtFall'), 1)} N`);
console.log(`      SEATBELT its tilt against the test's own tiltAcross: |difference| median ${span(nf('tiltFeltVsTestMedian'), 3)}° · at the fall ${span(nf('tiltFeltVsTestAtFall'), 3)}° (its own tilt ${span(nf('tiltFeltAtFall'), 2)}° against the test's ${span(nf('tiltAtFall'), 1)}°)`);
console.log(`      THE ATTRIBUTION AT THE FALL, N in the deck's plane: ${WATER_KEYS.map((k) => `${k} ${span(rows.map((x) => Number((x.lpOnSAtFall as Record<string, number>)[k])), 1)}`).join(' | ')}`);
console.log(`   §5 WHERE THE RESIDUAL TILT COMES FROM — the deck-frame tilt regressed on the deck's roll, °/° over the pool:`);
console.log(`      the REAL in-plane force (instantaneous ledger) ${f(tiltOnRollForce.slope, 3)} (R² ${f(tiltOnRollForce.r2, 3)}) · the momentum route ${f(tiltOnRollPair.slope, 3)} (R² ${f(tiltOnRollPair.r2, 3)})`);
console.log(`      the FELT tilt (the same force low-passed 0.1 s in the ${FELT === 'deck' ? "DECK's own frame" : 'world, then projected'}) ${f(tiltOnRollFelt.slope, 3)} (R² ${f(tiltOnRollFelt.r2, 3)}) · the test's own tiltAcross ${f(tiltOnRollTest.slope, 3)} (R² ${f(tiltOnRollTest.r2, 3)})`);
console.log(`      so the gain deficit splits: the force's own share ${f(-tiltOnRollForce.slope, 3)} and the FILTER's lag ${f(tiltOnRollForce.slope - tiltOnRollTest.slope, 3)} of the measured ${f(-tiltOnRollTest.slope, 3)}`);
console.log(`      THE LAG'S OWN LAW: the test's tilt per °/s of ROLL RATE ${f(tiltOnRate.slope, 4)}° (R² ${f(tiltOnRate.r2, 3)}) against −T = ${f(-SPECIFIC_FORCE_TIME, 4)} · roll rate ${span(nf('rollRateAtFall'), 1)}°/s at the fall (peak ${span(nf('rollRatePeak'), 1)}) · −T·Ω predicts ${span(nf('lagPredictAtFall'), 2)}° against the measured tilt ${span(nf('tiltAtFall'), 1)}°`);
console.log(`      and pressure's own in-plane residue per °/s of roll rate ${f(pressureOnRate.slope, 3)} N (R² ${f(pressureOnRate.r2, 3)}) against the ledger's own within-step rotation F_n,pressure · h/2 = ${f((median(pool.map((x) => x.onN.pressure)) * STEP) / (2 * DEG), 3)} N per °/s`);
console.log(`      THE MARGINAL ATTRIBUTION of the REAL in-plane force, ° of tilt per ° of roll (d(F_s)/d(roll) over F_n = ${f(fNpool, 1)} N):`);
for (const e of perSource) if (Math.abs(e.deficit) > 0.0005) console.log(`         ${e.k.padEnd(10)} ${f(e.deficit, 3)}  (${f(e.slope, 2)} N per ° of roll, R² ${f(e.r2, 3)})`);
console.log(`         SUM ${f(deficitSum, 3)} against the instantaneous ledger's own fitted ${f(-tiltOnRollForce.slope, 3)} and the measured deficit ${f(-tiltOnRollTest.slope, 3)}`);
console.log(`      the same on the LOW-PASSED force in the ${FELT} frame (the lag folded in, so NOT an attribution of forces):`);
for (const e of perSourceLag) if (Math.abs(e.deficit) > 0.0005) console.log(`         ${e.k.padEnd(10)} ${f(e.deficit, 3)}  (${f(e.slope, 2)} N per ° of roll, R² ${f(e.r2, 3)})`);
console.log(`         SUM ${f(deficitSumLag, 3)} against the felt tilt's own fitted ${f(-tiltOnRollFelt.slope, 3)}`);
console.log(`      the pooled fit's own INTERCEPT, which the test says should be small: feltWorld on roll ${f(poolFelt.slope, 3)}° per ° with intercept ${f(poolFelt.intercept, 3)}° · un-lagged ${f(poolOwn.slope, 3)} with intercept ${f(poolOwn.intercept, 3)}°`);
/**
 * **Step 3.3c's own two blocks.**
 *
 * §6 carries the advisor's instructed columns, all un-lagged: `F_s` in newtons, `F_s/F_n` in degrees, and `F_s`
 * regressed on `sin(rail)` in newtons — pooled, with the population said. Nothing here is a bank gain, and 1.000 is not
 * a target: TN 4187's `cos τ cos ψ` is measured at roll ≤ 15° and these falls happen at 20.9–63.0°.
 *
 * §7 is the along-board test of the advisor's geometry claim, with its seatbelt first.
 */
const poolFSRail = fit(pool.map((x) => Math.sin(x.rail / DEG)), pool.map((x) => x.fS));
const poolFSRoll = fit(pool.map((x) => Math.sin(x.roll / DEG)), pool.map((x) => x.fS));
const poolRatio = pool.map((x) => (Math.atan2(x.fS, x.fN) * DEG));
const poolRateTilt = fit(pool.map((x) => x.rollRate), pool.map((x) => x.tilt));
/** Step 3.3c's paired block: the two shadow filters' own laws over the pool, on one trajectory. */
const shadowWRate = fit(pool.map((x) => x.rollRate), pool.map((x) => x.tiltShadowW));
const shadowDRate = fit(pool.map((x) => x.rollRate), pool.map((x) => x.tiltShadowD));
const shadowWRoll = fit(pool.map((x) => x.roll), pool.map((x) => x.tiltShadowW));
const shadowDRoll = fit(pool.map((x) => x.roll), pool.map((x) => x.tiltShadowD));
console.log(`   §5b THE PAIRED COMPARISON — two shadow filters on the SAME ${pool.length} frames, no trajectory confound:`);
console.log(`      SEATBELT the WORLD shadow against the test's own tiltAcross (it is the shipped order): |difference| median ${span(nf('shadowWVsTestMedian'), 3)}° · at the fall ${span(nf('shadowWVsTestAtFall'), 3)}°`);
console.log(`      each shadow's own tilt per °/s of ROLL RATE: world ${f(shadowWRate.slope, 4)}° (R² ${f(shadowWRate.r2, 3)}) · DECK ${f(shadowDRate.slope, 4)}° (R² ${f(shadowDRate.r2, 3)}) · against −T = ${f(-SPECIFIC_FORCE_TIME, 4)}`);
console.log(`      each shadow's own tilt per ° of ROLL: world ${f(shadowWRoll.slope, 3)} (R² ${f(shadowWRoll.r2, 3)}) · DECK ${f(shadowDRoll.slope, 3)} (R² ${f(shadowDRoll.r2, 3)}) · the un-lagged truth atan(F_s/F_n) ${f(tiltOnRollForce.slope, 3)}`);
console.log(`      how much tilt each ADDS over the un-lagged truth, °: world |median| ${span(nf('shadowWErrAbsMedian'), 3)} · DECK |median| ${span(nf('shadowDErrAbsMedian'), 3)} · at the fall world ${span(nf('shadowWErrAtFall'), 2)} · DECK ${span(nf('shadowDErrAtFall'), 2)}`);
console.log(`   §6 UN-LAGGED, the advisor's instructed columns (no 0.1 s anywhere in them), all ${pool.length} frames of the ${rows.length} runs:`);
console.log(`      F_s in NEWTONS: pooled median ${f(median(pool.map((x) => x.fS)), 1)} · |median| ${f(median(pool.map((x) => Math.abs(x.fS))), 1)} · per run |median| ${span(nf('fSAbsMedian'), 1)} · at the fall ${span(nf('fSAtFallN'), 1)} against F_n ${span(nf('fNAtFallN'), 1)}`);
console.log(`      F_s per unit sin(RAIL), N: pooled ${f(poolFSRail.slope, 1)} (R² ${f(poolFSRail.r2, 3)}, intercept ${f(poolFSRail.intercept, 1)} N) · per run ${span(nfSome('fSPerSinRailN'), 1)} (R² ${span(nfSome('fSPerSinRailR2'), 3)}) · per unit sin(ROLL) ${f(poolFSRoll.slope, 1)} (R² ${f(poolFSRoll.r2, 3)})`);
console.log(`      F_s/F_n in DEGREES, un-lagged: pooled median ${f(median(poolRatio), 2)}° · |median| ${f(median(poolRatio.map(Math.abs)), 2)}° · per run at the fall ${span(nf('tiltForceAtFall'), 2)}° · the TEST's own (0.1 s, frame '${FELT}') ${span(nf('tiltAtFall'), 2)}°`);
console.log(`      THE FILTER'S OWN COST in this frame: the test's tilt per °/s of roll rate ${f(poolRateTilt.slope, 4)}° (R² ${f(poolRateTilt.r2, 3)}) against −T = ${f(-SPECIFIC_FORCE_TIME, 4)} · |ledger − the test| median ${span(nf('tiltVsTestMedian'), 3)}°`);
console.log(`   §7 THE ADVISOR'S ALONG-BOARD CLAIM — buoyancy re-pointed from the water normal to the HULL normal, N on the board's own axes:`);
console.log(`      SEATBELT the walk against the ledger's own forces.buoyancy (a last substep against a 32-substep mean): |difference| median ${span(nf('bWalkGapMedian'), 2)} N of ${span(nf('bLedgerMagMedian'), 1)} N = ${span(nf('bWalkGapShare'), 2)} % (peak ${span(nf('bWalkGapPeak'), 2)} N) · wet patches ${span(nf('wetPatchesMedian'), 0)} of which band facets ${span(nf('bandPatchesPeak'), 0)} · buoyancyNormal branch ${span(nf('normalBranchFrames'), 0)} frames · hollow open ${span(nf('hollowFrames'), 0)} frames`);
console.log(`      ALONG-BOARD (the wave's push down the line): as shipped ${span(nf('bnAMedian'), 1)} N median, ${span(nf('bnAAtFall'), 1)} at the fall · on the HULL normal, same magnitude ${span(nf('bhAMedian'), 1)} / ${span(nf('bhAAtFall'), 1)} · same VERTICAL ${span(nf('bhvAMedian'), 1)} / ${span(nf('bhvAAtFall'), 1)}`);
console.log(`      ACROSS, in the plane of the deck: as shipped ${span(nf('bnSMedian'), 1)} N median, ${span(nf('bnSAtFall'), 1)} at the fall · on the hull normal ${span(nf('bhSMedian'), 1)} / ${span(nf('bhSAtFall'), 1)} · on the deck NORMAL ${span(nf('bnNMedian'), 1)} → ${span(nf('bhNMedian'), 1)}`);
console.log(`      and as a WORLD-HORIZONTAL force: magnitude as shipped ${span(nf('bnHorizMedian'), 1)} N median · on the hull normal ${span(nf('bhHorizMedian'), 1)} · the component DOWN THE WATER'S SLOPE (where the shipped term points) ${span(nf('bnDownMedian'), 1)} → ${span(nf('bhDownMedian'), 1)} N median, ${span(nf('bnDownAtFall'), 1)} → ${span(nf('bhDownAtFall'), 1)} at the fall`);
console.log(`      THE MISALIGNMENT the claim rests on — the WATER's normal against the DECK's, on the deck's own axes: the ROLL part (about the long axis, what the claim says it all is) ${span(nf('rollPartMedian'), 2)}° median, peak ${span(nf('rollPartPeak'), 2)}° · the TRIM part (about the across axis, which moves the ALONG component) ${span(nf('trimPartMedian'), 2)}° median, peak ${span(nf('trimPartPeak'), 2)}°`);
const alongPool = fit(pool.map((x) => x.bnA), pool.map((x) => x.bhA));
console.log(`      pooled over all ${pool.length} frames: the along-board component median ${f(median(pool.map((x) => x.bnA)), 1)} N as shipped → ${f(median(pool.map((x) => x.bhA)), 1)} N on the hull normal; the per-frame |difference| median ${f(median(pool.map((x) => Math.abs(x.bhA - x.bnA))), 2)} N, peak ${f(peak(pool.map((x) => Math.abs(x.bhA - x.bnA))), 2)} N, as a share of |buoyancy| ${f((100 * median(pool.map((x) => Math.abs(x.bhA - x.bnA)))) / median(pool.map((x) => x.bWalkMag)), 1)} % · hull-on-shipped slope ${f(alongPool.slope, 3)} (R² ${f(alongPool.r2, 3)})`);
/**
 * **Step 3.3d's own block.** §8 first says which REGIME the blend sat in — if it is at one end it is a constant and is
 * reported as one — and only then what the switch does to the force, paired on one trajectory (`bb` against `bn`) with
 * the unconditional re-pointing (`bh`, Part 27's convention) beside it as the ceiling.
 */
const acrossSwitch = fit(pool.map((x) => x.bnS), pool.map((x) => x.bbS));
const alongSwitch = fit(pool.map((x) => x.bnA), pool.map((x) => x.bbA));
console.log(`   §8 STEP 3.3d — the hydrostatic support on the HULL's normal. THE ENGINE'S OWN SWITCH IS ${BUOY === 'hull' ? 'ON (buoyFrame: hull)' : 'OFF (the shipped law)'}; the columns below are the read-only walk, paired on one trajectory.`);
console.log(`      THE REGIME, support-weighted over every wet patch, all ${pool.length} frames: the blend's own share hullShare = (1 − deck)·planing median ${span(nf('hullShareMedian'), 3)} (min ${span(nf('hullShareMin'), 3)}, max ${span(nf('hullShareMax'), 3)}) · at the fall ${span(nf('hullShareAtFall'), 3)}`);
console.log(`         its two factors: the DECK's DRY share ${span(nf('dryShareMedian'), 3)} median, ${span(nf('dryShareAtFall'), 3)} at the fall · the PLANING share ${span(nf('planeShareMedian'), 4)} median (min ${span(nf('planeShareMin'), 4)})`);
console.log(`         the support past half way over ${span(nf('hullShareHighMedian'), 3)} median, ${span(nf('hullShareHighAtFall'), 3)} at the fall · frames with NO re-pointing at all ${span(nf('hullShareZeroFrames'), 0)} of ${span(nf('frames'), 0)} · frames past 0.9 ${span(nf('hullShareFullFrames'), 0)}`);
console.log(`         SEATBELT on the walk's rebuilt velocity: d(planing)/d(ln v) = ${span(nf('planeSensMedian'), 5)} median, peak ${span(nf('planeSensPeak'), 5)} — a 1 % velocity error is a hundredth of that in the share`);
console.log(`      ACROSS, in the plane of the deck (item 2's whole payoff), N: shipped ${span(nf('bnSMedian'), 1)} median → the SWITCH ${span(nf('bbSMedian'), 1)} → unconditional ${span(nf('bhSMedian'), 1)} · at the fall ${span(nf('bnSAtFall'), 1)} → ${span(nf('bbSAtFall'), 1)} → ${span(nf('bhSAtFall'), 1)}`);
console.log(`         pooled: median ${f(median(pool.map((x) => x.bnS)), 2)} → ${f(median(pool.map((x) => x.bbS)), 2)} → ${f(median(pool.map((x) => x.bhS)), 2)} N · |median| ${f(median(pool.map((x) => Math.abs(x.bnS))), 2)} → ${f(median(pool.map((x) => Math.abs(x.bbS))), 2)} → ${f(median(pool.map((x) => Math.abs(x.bhS))), 2)} · switch-on-shipped slope ${f(acrossSwitch.slope, 3)} (R² ${f(acrossSwitch.r2, 3)})`);
console.log(`      ALONG-BOARD (the wave's push down the line), N: shipped ${span(nf('bnAMedian'), 1)} median → the SWITCH ${span(nf('bbAMedian'), 1)} → unconditional ${span(nf('bhAMedian'), 1)} · switch-on-shipped slope ${f(alongSwitch.slope, 3)} (R² ${f(alongSwitch.r2, 3)})`);
console.log(`      as a WORLD-HORIZONTAL force, N: magnitude shipped ${span(nf('bnHorizMedian'), 1)} → the SWITCH ${span(nf('bbHorizMedian'), 1)} → unconditional ${span(nf('bhHorizMedian'), 1)} · DOWN THE SLOPE ${span(nf('bnDownMedian'), 1)} → ${span(nf('bbDownMedian'), 1)} → ${span(nf('bhDownMedian'), 1)} median, ${span(nf('bnDownAtFall'), 1)} → ${span(nf('bbDownAtFall'), 1)} → ${span(nf('bhDownAtFall'), 1)} at the fall`);
console.log(`      the DECK NORMAL's own load, N (the denominator of every tilt): shipped ${span(nf('bnNMedian'), 1)} → the SWITCH ${span(nf('bbNMedian'), 1)} → unconditional ${span(nf('bhNMedian'), 1)}`);
const cmdRollPool = fit(pool.map((x) => x.roll), pool.map((x) => x.cmdAnkle));
const cmdLeanPool = fit(pool.map((x) => x.leanAsked), pool.map((x) => x.cmdAnkle));
console.log(`   §9 THE PREDICTOR'S OWN COMMAND (a diagnostic for the next round, NOT a result of this one; regressed, never read as a sign):`);
console.log(`      the ankle command on the deck's ROLL: pooled ${f(cmdRollPool.slope, 5)} rad/° (R² ${f(cmdRollPool.r2, 3)}) · per run ${span(nfSome('cmdOnRollSlope'), 5)} (R² ${span(nfSome('cmdOnRollR2'), 3)})`);
console.log(`      the same command on the lean the steer ASKED — NOT USABLE, a near-constant regressor (it ramps for ~0.55 s then sits flat): pooled ${f(cmdLeanPool.slope, 5)} rad/° (R² ${f(cmdLeanPool.r2, 3)}) · per run ${span(nfSome('cmdOnLeanSlope'), 5)} (R² ${span(nfSome('cmdOnLeanR2'), 3)}) · lean asked peak ${span(nf('leanAskedPeakDeg'), 1)}°`);
console.log(`      and the RAIL against that ask, which refutes reading a mid-run dip off one trace: rail peak ${span(nf('railPeakDeg'), 1)}° against the ask ${span(nf('leanAskedPeakDeg'), 1)}° — the peak OVERSHOOTS, because the peak is in the capsize. A windowed statistic is what the next round needs.`);
console.log(`      the command's own size, rad: |median| ${span(nf('cmdAnkleAbsMedian'), 5)} · peak ${span(nf('cmdAnklePeak'), 5)} · frames the clamp bound it ${span(nf('cmdClampedFrames'), 0)} of ${span(nf('frames'), 0)}`);
console.log(`   the fall: margin ${span(nf('marginAtFall'), 3)} · past ${span(nf('pastAtFall'), 3)} m · relative across-speed ${span(nfSome('relAcrossAtFall'), 3)} m/s = body ${span(nfSome('bodyAcrossAtFall'), 3)} − feet ${span(nfSome('feetAcrossAtFall'), 3)} · its mean rate ${span(nfSome('relAcrossMeanRate'), 2)} m/s² · reconstructs to ${span(nfSome('checkAtFall'), 4)}`);
