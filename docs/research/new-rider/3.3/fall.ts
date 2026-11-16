/**
 * Step 3.3g: **why the rider comes off, measured as the lean a turn demands against the lean the body holds.**
 *
 * Step 3.3f (Part 29) closed the turn's clock — on `?rider=new` at a full stick the board puts 37–88° on in
 * 0.87–2.33 s in a monotone arc, the best 87.5° in 1.117 s against Forsyth et al. 2024's 99 ± 4° in 0.96 ± 0.04 s —
 * and handed over one sentence: *"in every one of the 18 monotone runs the rider comes off 0.22–0.73 s **after** the
 * turn ends."* This probe is the measurement of the fall itself, and its first job was to reproduce that sentence.
 *
 * **It does not reproduce.** Recomputed from 3.3f's own 48 published rows, `fellAt − turnFor` is 0.216–0.734 s, which
 * is the published span; but `turnFor` is a **duration** (`last.t − first.t`) over a window that starts at the probe's
 * own 0.2 s mount transient, so `fellAt − turnFor` is the gap **plus 0.2167 s**. The gap itself,
 * `fellAt − (first.t + turnFor)`, is **−0.001 to 0.517 s with a median of 0.000, and 13 of the 18 monotone runs are
 * exactly 0.000** — the fall **is** the end of the commanded turn in 13 of 18, and only the 5 runs that reached 85° and
 * centred the stick have a gap at all. So the question this probe was briefed with — *why just after the turn rather
 * than during it* — is the frame error's question and not the rider's. **He comes off during the turn.** See §1 of
 * Part 30.
 *
 * ## What it measures instead, and why these columns
 *
 * The fall test standing free is `HumanBalance.fallen` = `beyond && weightPast` [R]: the capture point past the feet's
 * edge by more than the room left can catch, **and** the centre of mass's own push line past the edge. Both are read
 * across the **felt vertical** — the pair's (board + body) specific force, low-passed SPECIFIC_FORCE_TIME = 0.1 s —
 * and in a banked turn the felt vertical leans toward the turn's **inside**, so
 *
 *   `px = offset.x − height · nx`
 *
 * is the body's across place **minus the across place the turn demands of it**. `height · nx` is therefore **the
 * demand**: the across offset the centre of mass must hold for the balance to read zero error. `offset.x` is **what
 * the body holds**. The probe reads both out of `CaptureState` (`offsetAcross`, `feltAcross`, step 3.3g's two report
 * fields) rather than re-deriving `nx` from `tiltAcross` with `nz` unknown, and reports:
 *
 * - **the sign**: `px · sign(nx)` — negative means the weight is **outboard** of where the turn wants it (the body
 *   failed to lean in, or was thrown out), positive means it leaned in **past** the turn's own demand;
 * - **the share**: `offset.x / (height · nx)` — how much of the demanded lean the body actually achieved;
 * - **which condition fired last**, `beyond` or `weightPast`, since the fall needs both, so the later one is the
 *   proximate trigger and the earlier one had been standing by;
 * - **the turn's own books**: the delivered radius `v / ω_yaw` against `TURN_RADIUS` = 4.5 m, the bank the delivered
 *   turn needs (`atan(a_lat / g)` from the board's own across acceleration) against the rail the board carries, so the
 *   demand can be attributed to the board's bank falling short of its own turn rather than inferred;
 * - **the freeze** (CAPTURE_LOAD = 0.2 body weights): whether the test was held in the 0.2 s before the fall, which
 *   would make the fall a reading resumed on a body already gone rather than one that developed under load.
 *
 * The feet's half-width across is **0.13 m** (`riderPosture.ts`, standing) and the height is about 0.9 m, so
 * `weightPast` fires at about **8°** of lean error across: that is the tolerance every number below is against.
 *
 * ## The cell, the movement and the population
 *
 * Step 3.3f's exactly, so the columns are comparable: the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°,
 * 5.7 m/s — PR #223's **fit** to Canyon B's arm, not Canyon), the board placed 0.75 face lengths onshore of the crest
 * 45° off the fall line, the stance held and the stick over from the first frame until the board is 85° round, then
 * centred. Three entry speeds × four sticks = twelve cells a stance, 9 s each, every span below the whole population.
 *
 * Read-only: it drives the shipped inputs and reads public fields. Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/fall.ts -o <scratch>/fl.mjs --format esm --platform node
 *   RIDER=new node <scratch>/fl.mjs
 *
 * ## The owner's rule, and the bar it implies
 *
 * The owner's ruling of 2026-11-16 — *"in compress the surfer should not fall in the lower speed of getting
 * positioning in a wave ... because the centre of gravity is supposed to do that"* — is a prediction with a number.
 * Topple about the loaded edge: `m·g·d` restoring against `m·a·h` overturning, so a stance tolerates
 * **`a_max = g·d/h`**, inversely proportional to the centre of mass's height. The **static** criterion
 * (`m·g·(d − x)`) does not contain `h` at all, which is 3.3e §1.4 and was carried into this round's brief as "depth is
 * the wrong axis" — true standing still, false in a turn. `weightPast` is that bar exactly, so the probe prints
 * `aMax` at the height the balance actually holds, the turn's own lateral acceleration **held for 0.2 s**, and the
 * part of it the deck's bank does not support (the residual, which by `tilt = atan(F_s/F_n)` is the in-plane water
 * force over the pair's mass). `reachAcross` is beside them because the fall needs `beyond` as well, and the stance
 * table's hip range sets that.
 *
 * Env: `RIDER=new|old`, `STANCES`, `EXTRAS`, `STEERS`, `SECONDS`, `FELT=deck` (the `feltFrame: 'deck'` switch the
 * owner rides with), `KNEEROOM`, `HAND=balanced` with `GAIN` (the causal test, above), `OUT` (one JSON line a run),
 * `TRACE` (every frame of every run as TSV).
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { deckHeight, stanceFeet } from '../../../../src/physics/riderPosture';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;
/** `AttachedRider`'s own, restated so the probe never imports a private: the stick's deadband and the lean's range. */
const STEER_DEADBAND = 0.05;
/** `riderPosture.ts`'s standing support across, m: the feet's half-width the fall test is against. */
const HALF_ACROSS = 0.13;

const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.25,0.5,0.75,1').split(',').map(Number);
const ACROSS = Number(process.env.ACROSS ?? 85);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';
const FELT = process.env.FELT === 'deck' ? 'deck' : undefined;
/**
 * **The balanced hand** (`HAND=balanced`), the round's causal test and **not a change to the game**: the stick is an
 * input, so a probe may move it. Each frame it integrates the balance's own over-bank — the felt vertical's tilt off
 * the deck normal across (`CaptureState.tiltAcross`, + toward the turn's inside when the deck is banked past what the
 * turn supports) — out of the stick, within [0, the cell's own stick]:
 *
 *   `steer ← clamp(steer − GAIN · over_bank · h, 0, stick)`
 *
 * so the hand asks for as much turn as it can get **without banking the deck past the bank its own turn supports**. No
 * force is added, removed or re-pointed and nothing is read that the game does not already compute; the only thing
 * that moves is the player's thumb. **It is not a playable input** — it closes a loop at 60 Hz on a quantity a player
 * cannot see — and nothing here is offered as a feel. Its one job is to say whether the over-bank is what the fall is
 * made of, by taking it away and leaving everything else where it was.
 */
const HAND = process.env.HAND === 'balanced' ? 'balanced' : 'fixed';
const GAIN = Number(process.env.GAIN ?? 0.6);
const KNEEROOM = process.env.KNEEROOM;
/**
 * **Step 3.3h, `REACH=keep`, off by default**: the game's own `?stanceReach=keep` — a deep crouch keeps the riding
 * stance's hip range and free arms, the owner's ruling of 2026-11-16 on the trade step 3.3g measured. This probe is
 * where the owner's bar lives (Compress, the low entry speeds of getting into position, the mixed-stick ladder), so
 * the A/B that answers the ruling is run here as well as on `deck.ts`.
 */
const REACH = process.env.REACH === 'keep' ? 'keep' as const : undefined;
/**
 * **Step 3.3i, `ANKLE_LIMIT=feet`, off by default**: the game's own `?ankleLimit=feet` — the ankle's torque bounded by
 * the moment the soles can transmit (`legLoad` × the feet's half-width across, the bound `AttachedRider`'s
 * LEAN_IN_RATE note derives at 93 N·m and nothing enforced). With it unset this probe is the shipped rider, and its
 * shipped arm reproduces step 3.3g's and 3.3h's own published tables.
 */
const ANKLE_LIMIT = process.env.ANKLE_LIMIT === 'feet' ? 'feet' as const : undefined;

type Stance = 'tall' | 'crouch' | 'compress' | 'snap' | 'snapdrive';
const STANCES = (process.env.STANCES ?? 'tall,compress').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

/** As `stance.ts` and `turn.ts`: the deeper of crouch and Compress wins in the code, so Compress holds the crouch at 0.6. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
  rider.snap = s === 'snap' || s === 'snapdrive' ? 1 : 0;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

interface Frame {
  t: number;
  steer: number;
  rate: number;       // the board's heading rate, °/s, signed
  net: number;        // net heading from the first frame, °
  speed: number;      // the board's speed over the ground, m/s
  radius: number;     // the delivered radius, v / |ω_yaw|, m
  rail: number;       // the rail against the water's surface, ° (+ = the deck normal toward board +x)
  roll: number;       // the deck's own bank from the WORLD vertical, ° (+ = the deck normal toward board +x)
  waterTilt: number;  // the water surface's own across tilt at the board, ° (+ = its normal toward board +x)
  needX: number;      // the board's own across acceleration as a bank, ° (signed with board +x), unfiltered, over g
  needEff: number;    // the same over the EFFECTIVE vertical (a_y + g): the bank the turn needs as a falling board feels it
  feltTilt: number;   // the felt vertical's own tilt off the deck normal across, ° (`CaptureState.tiltAcross`), + toward board +x
  nx: number;         // the felt vertical's across component the balance reads (unit, board +x; + = the turn's inside)
  height: number;     // the centre of mass over the feet along the felt vertical, m
  demand: number;     // height × nx, m: the across offset the turn demands of the centre of mass
  offX: number;       // offset.x, m: the across offset the body holds
  px: number;         // offset.x − height × nx, m: what the fall test is against (|px| > 0.13 m is `weightPast`)
  vx: number;         // the centre of mass's speed across the felt vertical, m/s
  capture: number;    // the capture point across, m (px + vx/ω₀)
  past: number;       // how far past the feet's edge the capture point is, m
  reach: number;      // what the room left can catch past the edge, m
  beyond: number;
  weightPast: number;
  margin: number;
  load: number;       // the feet's own load, body weights
  frozen: number;     // the capture point held because the feet are light (CAPTURE_LOAD)
  knees: number;
  arms: number;
  swing: number;      // the hip's across angle, rad
  ankle: number;      // the predictor's ankle command as sent, °
  bank: number;       // the body's own lean from the WORLD vertical, ° (`AttachedRider.bank.angle`, + toward board +x)
  rel: number;        // the body's lean relative to the DECK, ° (bank − roll): the leg's own angle across
  bankRate: number;   // the body's bank rate, °/s
  along: number;      // the capture point ALONG the board, m, so the across can be shown to be the narrow way
  pastAcross: number; // how far past the feet's edge the capture point is ACROSS, m, signed board +x
}

function oneRun(st: Stance, extra: number, steer: number): Record<string, unknown> {
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const px0 = 0;
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(px0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = (FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(px0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(KNEEROOM ? { kneeRoom: KNEEROOM } : {}),
    ...(REACH ? { stanceReach: REACH } : {}),
    ...(ANKLE_LIMIT ? { ankleLimit: ANKLE_LIMIT } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = 0;

  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const lastVel = new Vector3().copy(board.velocity);
  const accel = new Vector3();
  const feet = stanceFeet(board.shape);
  const deckY = deckHeight(board.shape, (feet.rear + feet.front) / 2);
  void deckY;
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let lastHeading = Number.NaN;
  let net = 0;
  let t85 = Number.NaN;
  let centred = false;
  let hand = steer;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    // `side` is the board's own +x horizontally (up × forward), so every across column below is in the board's frame.
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    const heading = Math.atan2(fwd.x, fwd.z);
    if (!Number.isFinite(lastHeading)) lastHeading = heading;
    let d = heading - lastHeading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    lastHeading = heading;
    net += d * DEG;
    if (!Number.isFinite(t85) && Math.abs(net) >= ACROSS) t85 = t;
    if (!centred && Math.abs(net) >= ACROSS) centred = true;
    let used = centred ? 0 : steer;
    if (HAND === 'balanced' && !centred) {
      // The over-bank as the balance itself reads it, ° toward the turn's inside; `dirNow` is the turn's own side so
      // far (the net heading's sign), which is the same `dir` the columns are signed by once the turn has a side.
      const dirNow = Math.sign(net) || 1;
      const over = -rider.human.state.tiltAcross * DEG * dirNow;
      hand = Math.max(0, Math.min(steer, hand - GAIN * over * STEP));
      used = hand;
    }
    // The board's own across acceleration this frame, as the bank it needs: a plain `atan(a_lat / g)` on the board
    // alone and unfiltered, beside the balance's own filtered pair reading, so the filter's share can be seen.
    accel.subVectors(board.velocity, lastVel).divideScalar(STEP);
    lastVel.copy(board.velocity);
    const aX = accel.dot(side);
    const state = rider.human.state;
    const h = state.height;
    const nx = state.feltAcross;
    const pxx = state.pointAcross;
    frames.push({
      t,
      steer: rider.steer,
      rate: (d / STEP) * DEG,
      net,
      speed: board.velocity.length(),
      radius: Math.abs(d) > 1e-6 ? board.velocity.length() / (Math.abs(d) / STEP) : Number.NaN,
      rail,
      roll,
      waterTilt: Math.atan2(nW.dot(side), nW.y) * DEG,
      needX: Math.atan2(aX, G) * DEG,
      needEff: Math.atan2(aX, Math.max(1, accel.y + G)) * DEG,
      feltTilt: state.tiltAcross * DEG,
      nx,
      height: h,
      demand: h * nx,
      offX: state.offsetAcross,
      px: pxx,
      vx: state.speedAcross,
      capture: state.across,
      past: state.past,
      reach: state.reach,
      beyond: state.beyond ? 1 : 0,
      weightPast: state.weightPast ? 1 : 0,
      margin: state.margin,
      load: rider.captureLoad,
      frozen: rider.human.frozen ? 1 : 0,
      knees: rider.human.knees,
      arms: rider.human.arms,
      swing: rider.swing.angle,
      ankle: rider.predictor.sent[0] * DEG,
      bank: rider.bank.angle * DEG,
      rel: (rider.bank.angle * DEG) - roll,
      bankRate: rider.bank.rate * DEG,
      along: state.along,
      pastAcross: state.pastAcross,
    });
    rider.steer = used;
    // `attached` is the test (step 3.3f §1): `separate` leaves `phase` and `upright` untouched.
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      fell = rider.attached ? rider.phase : (rider.separation ?? 'separated');
      fellAt = t;
      break;
    }
  }

  if (TRACE) {
    process.stdout.write(`# TRACE ${RIDER} ${st} extra=${extra} steer=${steer} felt=${FELT ?? 'world'}\n`);
    const keys = Object.keys(frames[0] ?? {}) as (keyof Frame)[];
    process.stdout.write(`${keys.join('\t')}\n`);
    for (const x of frames) process.stdout.write(`${keys.map((k) => x[k].toFixed(4)).join('\t')}\n`);
  }

  // The mount's contact transient is the first ~0.17 s in every probe of this folder.
  const live = frames.filter((x) => x.t > 0.2);
  const turn = live.filter((x) => Math.abs(x.steer) > STEER_DEADBAND);
  const first = turn[0];
  const last = turn[turn.length - 1];
  const end = frames[frames.length - 1];
  const dir = Math.sign((last?.net ?? 0) - (first?.net ?? 0)) || 1;
  // **3.3f's own gap, both ways.** `turnFor` is a duration over a window that starts at `first.t`, so the gap is
  // `fellAt − last.t`; `fellAt − (last.t − first.t)` is that gap plus `first.t` (0.2167 s), which is the published span.
  const gap = end && last ? end.t - last.t : Number.NaN;
  const gapNoOffset = end && last && first ? end.t - (last.t - first.t) : Number.NaN;

  // The run-up to the fall: how long each of the two conditions had been continuously true at the end.
  const held = (key: 'beyond' | 'weightPast') => {
    let i = frames.length - 1;
    if (!frames[i] || frames[i][key] === 0) return Number.NaN;
    while (i > 0 && frames[i - 1][key] === 1) i -= 1;
    return end.t - frames[i].t + STEP;
  };
  const beyondFor = held('beyond');
  const weightFor = held('weightPast');
  const trigger = !Number.isFinite(beyondFor) || !Number.isFinite(weightFor) ? 'neither'
    : beyondFor < weightFor ? 'beyond' : weightFor < beyondFor ? 'weightPast' : 'together';
  // **The owner's own rule, as a number** (their ruling of 2026-11-16: *"In compress the surfer should not fall in the
  // lower speed of getting positioning in a wave ... because the centre of gravity is supposed to do that"*). Topple
  // about the loaded edge: the restoring moment is `m·g·d` and the overturning one `m·a·h`, so the lateral
  // acceleration a stance tolerates is `a_max = g · d / h` — inversely proportional to the centre of mass's height,
  // which the STATIC criterion (`m·g·(d − x)`, 3.3e §1.4) does not contain. The fall test's own `weightPast` is
  // exactly that bar: `|offset.x − height · nx| > d` with `d` = 0.13 m, so with the body stacked on the deck
  // (`offset.x` ≈ 0) it fires at `|nx| > d/h`, i.e. at a RESIDUAL lateral acceleration of `g·d/h`. The residual is the
  // point: the deck's own bank carries the rest of the turn, and only the part the bank does not support lands on the
  // feet. So two columns, both the largest value HELD for 0.2 s before the fall rather than any one frame's peak:
  // `aLatHeld`, the board's own lateral acceleration, and `aResHeld`, the part of it the bank does not support.
  const held02 = (pick: (x: Frame) => number) => {
    const w = Math.round(0.2 / STEP);
    let best = 0;
    for (let i = w - 1; i < turn.length; i += 1) {
      let sum = 0;
      for (let k = i - w + 1; k <= i; k += 1) sum += Math.abs(pick(turn[k]));
      best = Math.max(best, sum / w);
    }
    return turn.length >= w ? best : Number.NaN;
  };
  const before = (dt: number) => frames.find((x) => x.t >= end.t - dt) ?? end;
  // **The sign convention, and why it is the turn's and not the felt vertical's.** `nx` is the felt vertical in the
  // BOARD's frame, so its sign is the deck's bank error and not the turn's side; signing the columns by it (as a first
  // pass of this probe did) mixes the two. Every column below is signed by `dir`, the sign of the net heading change,
  // and the heading's own sense is that an increasing `atan2(fwd.x, fwd.z)` turns the velocity toward board **+x**
  // (d/dt (sin h, 0, cos h) = (cos h, 0, −sin h) ḣ, which at h = 0 is +x), so the turn's INSIDE is `dir · x̂` and a
  // positive column means "toward the inside of the turn".
  const sign = dir;
  const win = (from: number, to: number) => live.filter((x) => x.t >= from && x.t <= to);
  const early = win(0.3, 0.8);
  const em = (k: keyof Frame) => median(early.map((x) => Number(x[k]) * (k === 'height' || k === 'margin' || k === 'load' ? 1 : sign)));
  const lastQuarter = frames.filter((x) => x.t > end.t - 0.25);
  // The first frame the weight is past the feet for good (`weightPast` true from there to the end).
  let pastFrom = Number.NaN;
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    if (frames[i].weightPast === 0) break;
    pastFrom = frames[i].t;
  }
  return {
    rider: RIDER, stance: st, extra, steer, felt: FELT ?? 'world', kneeRoom: KNEEROOM ?? 'shipped', stanceReach: REACH ?? 'shipped', ankleLimit: ANKLE_LIMIT ?? 'shipped', hand: HAND,
    // The balanced hand's own stick, for the comparison to be against a turn and not against a smaller one.
    stickMedian: r(median(turn.map((x) => Math.abs(x.steer)))), stickEnd: r(Math.abs(end.steer)),
    heightEnd: r(end.height), tolDeg: r(Math.atan2(HALF_ACROSS, end.height) * DEG, 1),
    heightMedian: r(median(turn.map((x) => x.height))),
    // `a_max = g · d / h` at the height the balance actually holds through the commanded turn, m/s², and in g.
    aMax: r((G * HALF_ACROSS) / median(turn.map((x) => x.height)), 2),
    aMaxEnd: r((G * HALF_ACROSS) / end.height, 2),
    // What the turn delivered, and what of it the deck's bank did not support: the largest 0.2 s mean, m/s².
    aLatHeld: r(held02((x) => G * Math.tan((x.needX / DEG))), 2),
    aResHeld: r(held02((x) => G * Math.tan((x.feltTilt / DEG))), 2),
    reachAcross: r(median(turn.map((x) => x.reach))),
    errDeg: r(Math.atan2(end.px * sign, end.height) * DEG, 1),
    // The capture point's two terms at the fall: its position part (`px`) and its velocity part (vx / ω₀).
    vTerm: r(end.capture - end.px === 0 ? 0 : (end.capture - end.px) * 1, 3), vTermSigned: r((end.capture - end.px) * sign),
    fell: fell || null, fellAt: r(fellAt), t85: r(t85), net: r(Math.abs((last?.net ?? 0) - (first?.net ?? 0)), 1),
    // The gap 3.3f reported, and the gap itself.
    turnEnd: r(last?.t ?? Number.NaN), gap: r(gap), gapNoOffset: r(gapNoOffset),
    // The demand and the lean, at the fall: signed so that + is toward the turn's own inside.
    nx: r(end.nx * sign), demand: r(end.demand * sign), offX: r(end.offX * sign), px: r(end.px * sign),
    // **The decomposition of the error.** `px = offset.x − height · nx`, so the deck's own bank error contributes
    // `−height · nx` and the body's own place contributes `offset.x`. This is the share of |px| the DECK brings.
    deckShare: r(Math.abs(end.px) > 1e-6 ? Math.abs(end.demand) / (Math.abs(end.demand) + Math.abs(end.offX)) : Number.NaN),
    // The angles at the fall, all + toward the turn's inside: the deck's bank from the world vertical, the water's own
    // across tilt, the bank the delivered turn needs (atan(a_lat/g)), and the deck's bank past it.
    roll: r(end.roll * sign, 1), waterTilt: r(end.waterTilt * sign, 1), overBank: r((end.roll - end.needX) * sign, 1),
    // The same in trim, before the turn has developed: the 0.3–0.8 s window.
    earlyRoll: r(em('roll'), 1), earlyWater: r(em('waterTilt'), 1), earlyNeed: r(em('needX'), 1),
    earlyOver: r(em('roll') - em('needX'), 1), earlyPx: r(em('px')), earlyOff: r(em('offX')), earlyDemand: r(em('demand')),
    pastFrom: r(pastFrom), pastFor: r(end.t - pastFrom),
    // The share of the demanded lean the body achieved, and the body's own lean about the feet, °.
    share: r(Math.abs(end.demand) > 0.02 ? end.offX / end.demand : Number.NaN),
    bodyLean: r(Math.atan2(end.offX * sign, end.height) * DEG, 1),
    feltLean: r(Math.atan2(end.nx * sign, Math.sqrt(Math.max(0, 1 - end.nx * end.nx))) * DEG, 1),
    // The turn's own books at the fall: what the delivered turn needs against what the board carries.
    needX: r(end.needX * sign, 1), needMedian: r(median(turn.map((x) => x.needX * sign)), 1),
    rail: r(end.rail * sign, 1), railMedian: r(median(turn.map((x) => x.rail * sign)), 1),
    radius: r(median(lastQuarter.map((x) => x.radius)), 2), speed: r(end.speed, 2),
    rollMedian: r(median(turn.map((x) => x.roll * sign)), 1), overMedian: r(median(turn.map((x) => (x.roll - x.needX) * sign)), 1),
    // **The two readings of the same over-bank**, both + toward the turn's inside and both over the commanded turn:
    // mine, the deck's roll past `atan(a_lat / g)` on the board's own acceleration; and the balance's own, the felt
    // vertical's tilt off the deck normal (`tiltAcross`), which is the pair's acceleration low-passed 0.1 s. And the
    // same as mine but over the EFFECTIVE vertical (a_y + g), which is what a board falling down a face feels.
    feltOverMedian: r(median(turn.map((x) => -x.feltTilt * sign)), 1),
    overEffMedian: r(median(turn.map((x) => (x.roll - x.needEff) * sign)), 1),
    feltOverLast: r(median(lastQuarter.map((x) => -x.feltTilt * sign)), 1),
    overLast: r(median(lastQuarter.map((x) => (x.roll - x.needX) * sign)), 1),
    overEffLast: r(median(lastQuarter.map((x) => (x.roll - x.needEff) * sign)), 1),
    needEffLast: r(median(lastQuarter.map((x) => x.needEff * sign)), 1), needLast: r(median(lastQuarter.map((x) => x.needX * sign)), 1),
    rollLast: r(median(lastQuarter.map((x) => x.roll * sign)), 1), waterLast: r(median(lastQuarter.map((x) => x.waterTilt * sign)), 1),
    waterMedian: r(median(turn.map((x) => x.waterTilt * sign)), 1),
    // The two conditions: how long each had been true, and which one fired last.
    beyondFor: r(beyondFor), weightFor: r(weightFor), trigger,
    past: r(end.past), reach: r(end.reach), capture: r(end.capture * sign), vx: r(end.vx * sign),
    // The build-up of `px`, signed with the turn's inside: 0.3 s before, 0.1 s before, and its rate over the last 0.2 s.
    px300: r(before(0.3).px * sign), px100: r(before(0.1).px * sign),
    pxRate: r((end.px - before(0.2).px) * sign / 0.2, 2),
    // The freeze: the feet light in the last 0.2 s, and the longest light window of the run.
    frozenLast: r(frames.filter((x) => x.t > end.t - 0.2).reduce((a, x) => a + x.frozen, 0) / Math.max(1, frames.filter((x) => x.t > end.t - 0.2).length)),
    lightLongest: r(rider.human.lightLongest), loadEnd: r(end.load),
    // The medians through the commanded turn, for the population's shape rather than its last frame.
    pxMedian: r(median(turn.map((x) => x.px * sign))), demandMedian: r(median(turn.map((x) => x.demand * sign))),
    offMedian: r(median(turn.map((x) => x.offX * sign))), marginMedian: r(median(turn.map((x) => x.margin))),
    kneesEnd: r(end.knees), armsEnd: r(end.arms), swingEnd: r(end.swing, 4), ankleEnd: r(end.ankle, 2),
    // How often, through the commanded turn, the body's lean is on the demand's own side at all.
    leanRight: r(turn.length ? turn.filter((x) => x.offX * Math.sign(x.nx) > 0).length / turn.length : Number.NaN),
    dir,
  };
}

const rows: Record<string, unknown>[] = [];
for (const extra of EXTRAS) {
  for (const steer of STEERS) {
    for (const st of STANCES) {
      const row = oneRun(st, extra, steer);
      rows.push(row);
      if (!TRACE) emit(row);
    }
  }
}

const col = (pick: (x: Record<string, unknown>) => boolean, k: string) => rows.filter(pick).map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
if (!TRACE) {
  console.log(`\n# step 3.3g — the lean a turn demands against the lean the body holds, rider=${RIDER}, felt=${FELT ?? 'world'}, hand=${HAND}${HAND === 'balanced' ? ` gain=${GAIN}` : ''}, kneeRoom=${KNEEROOM ?? 'shipped'}, stanceReach=${REACH ?? 'shipped'}, ankleLimit=${ANKLE_LIMIT ?? 'shipped'}`);
  console.log(`# Canyon-matched FaceWater ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s, ${DEPTH} m deep — a FIT to Canyon, not Canyon.`);
  console.log(`# ${EXTRAS.length} entry speeds × ${STEERS.length} sticks = ${EXTRAS.length * STEERS.length} runs a stance, ${SECONDS} s each; the feet's half-width across is ${HALF_ACROSS} m.`);
  const groups: { name: string; pick: (x: Record<string, unknown>) => boolean }[] = [
    ...STANCES.map((st) => ({ name: st as string, pick: (x: Record<string, unknown>) => x.stance === st })),
    ...STEERS.map((s) => ({ name: `stick ${s}`, pick: (x: Record<string, unknown>) => x.steer === s })),
    { name: 'all', pick: () => true },
  ];
  console.log(`\n| group | n | fell | fell at s | GAP to the turn's end s | 3.3f's fellAt−turnFor | net ° |`);
  console.log(`|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    const n = rows.filter(g.pick).length;
    console.log(`| ${g.name} | ${n} | ${rows.filter((x) => g.pick(x) && x.fell).length} | ${span(col(g.pick, 'fellAt'))} `
      + `| ${span(col(g.pick, 'gap'), 3)} | ${span(col(g.pick, 'gapNoOffset'), 3)} | ${span(col(g.pick, 'net'), 1)} |`);
  }
  console.log(`\n| group | DEMAND m | body holds m | px m | deck's share of px | body lean ° | px at −0.3 s | px at −0.1 s | px rate m/s |`);
  console.log(`|---|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    console.log(`| ${g.name} | ${span(col(g.pick, 'demand'))} | ${span(col(g.pick, 'offX'))} | ${span(col(g.pick, 'px'))} `
      + `| ${span(col(g.pick, 'deckShare'))} | ${span(col(g.pick, 'bodyLean'), 1)} | ${span(col(g.pick, 'px300'))} | ${span(col(g.pick, 'px100'))} | ${span(col(g.pick, 'pxRate'))} |`);
  }
  console.log(`\n| group | at the fall: roll ° | water ° | need ° | OVER-BANK ° | through the turn: roll ° | over-bank ° | in trim 0.3–0.8 s: roll ° | water ° | need ° | over-bank ° | px m |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    console.log(`| ${g.name} | ${span(col(g.pick, 'roll'), 1)} | ${span(col(g.pick, 'waterTilt'), 1)} | ${span(col(g.pick, 'needX'), 1)} | ${span(col(g.pick, 'overBank'), 1)} `
      + `| ${span(col(g.pick, 'rollMedian'), 1)} | ${span(col(g.pick, 'overMedian'), 1)} `
      + `| ${span(col(g.pick, 'earlyRoll'), 1)} | ${span(col(g.pick, 'earlyWater'), 1)} | ${span(col(g.pick, 'earlyNeed'), 1)} | ${span(col(g.pick, 'earlyOver'), 1)} | ${span(col(g.pick, 'earlyPx'))} |`);
  }
  console.log(`\n| group | trigger: beyond / weightPast / together | beyond held s | weight held s | past m | reach m | capture m | vx m/s | px rate m/s | frozen last 0.2 s | longest light s |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    const t = (k: string) => rows.filter((x) => g.pick(x) && x.trigger === k).length;
    console.log(`| ${g.name} | ${t('beyond')} / ${t('weightPast')} / ${t('together')} | ${span(col(g.pick, 'beyondFor'), 3)} | ${span(col(g.pick, 'weightFor'), 3)} `
      + `| ${span(col(g.pick, 'past'))} | ${span(col(g.pick, 'reach'))} | ${span(col(g.pick, 'capture'))} | ${span(col(g.pick, 'vx'))} `
      + `| ${span(col(g.pick, 'pxRate'))} | ${span(col(g.pick, 'frozenLast'))} | ${span(col(g.pick, 'lightLongest'))} |`);
  }
  console.log(`\n| group | OVER-BANK, the balance's own (felt) ° | mine, over g ° | mine, over a_y+g ° | last 0.25 s: felt ° | over g ° | over a_y+g ° | roll ° | need over g ° | need over a_y+g ° | water ° |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    console.log(`| ${g.name} | ${span(col(g.pick, 'feltOverMedian'), 1)} | ${span(col(g.pick, 'overMedian'), 1)} | ${span(col(g.pick, 'overEffMedian'), 1)} `
      + `| ${span(col(g.pick, 'feltOverLast'), 1)} | ${span(col(g.pick, 'overLast'), 1)} | ${span(col(g.pick, 'overEffLast'), 1)} `
      + `| ${span(col(g.pick, 'rollLast'), 1)} | ${span(col(g.pick, 'needLast'), 1)} | ${span(col(g.pick, 'needEffLast'), 1)} | ${span(col(g.pick, 'waterLast'), 1)} |`);
  }
  console.log(`\n| group | weight past the feet from s | for s | radius m | speed m/s | lean on the demand's side, share | knees | margin med |`);
  console.log(`|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    console.log(`| ${g.name} | ${span(col(g.pick, 'pastFrom'))} | ${span(col(g.pick, 'pastFor'))} | ${span(col(g.pick, 'radius'))} | ${span(col(g.pick, 'speed'))} `
      + `| ${span(col(g.pick, 'leanRight'))} | ${span(col(g.pick, 'kneesEnd'))} | ${span(col(g.pick, 'marginMedian'))} |`);
  }
  console.log(`\n| group | CoM height, m | a_max = g·d/h, m/s² | the turn's a_lat held 0.2 s | the RESIDUAL held 0.2 s | residual / a_max | tolerance ° | the room's reach, m |`);
  console.log(`|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    const ratio = rows.filter(g.pick).map((x) => Number(x.aResHeld) / Number(x.aMax));
    console.log(`| ${g.name} | ${span(col(g.pick, 'heightMedian'))} | ${span(col(g.pick, 'aMax'))} | ${span(col(g.pick, 'aLatHeld'))} `
      + `| ${span(col(g.pick, 'aResHeld'))} | ${span(ratio)} | ${span(col(g.pick, 'tolDeg'), 1)} | ${span(col(g.pick, 'reachAcross'))} |`);
  }
  console.log(`\n| group | stick asked | stick held, median | height m | tolerance ° (0.13 m at that height) | error ° at the fall | capture's velocity part m | its position part (px) m |`);
  console.log(`|---|---|---|---|---|---|---|---|`);
  for (const g of groups) {
    console.log(`| ${g.name} | ${span(col(g.pick, 'steer'))} | ${span(col(g.pick, 'stickMedian'))} | ${span(col(g.pick, 'heightEnd'))} | ${span(col(g.pick, 'tolDeg'), 1)} `
      + `| ${span(col(g.pick, 'errDeg'), 1)} | ${span(col(g.pick, 'vTermSigned'))} | ${span(col(g.pick, 'px'))} |`);
  }
}
