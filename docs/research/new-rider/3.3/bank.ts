/**
 * Step 3.3l: **what makes his body lean, attributed per source.**
 *
 * Step 3.3k closed with the strongest ordering this track has measured — *the body's bank passes 10° before the
 * deck's roll does in 48 of 48 runs, median +0.100 s* — and with the one sentence it was not entitled to answer:
 * *"what makes the body's bank run away from 0.22 s is the next question and this round does not answer it."* Nine
 * rounds have now measured everything reachable at the ankle and found all of it innocent: the rest's bound (3.3k),
 * the sole's own moment (3.3i), the hip (3.2x), the knee, the stance's reach, the whole-body counter-roll. **The lean
 * is upstream of all of them and this probe is the read.**
 *
 * ## What it measures, and why it can be exact
 *
 * The bank is the **eighth unknown of the board's own solve** — `AttachedRider.coupleStanding` assembles one linear
 * system `A x = b` over the board's six, the leg's rate, the bank's speed across the leg and (the new surfer) the
 * body's speed along it. `A` is the plant; `b` is the substep's explicit forces and torques. The solve is **linear in
 * `b`**, so splitting `b` into named parts and solving once per part gives an attribution that sums to the solve's own
 * answer identically. That is `src/physics/bankLedger.ts`, and its three closure tests (`split`, `closure`,
 * `residual`) are this round's positive control, predicted at machine precision before it ran
 * (`results/33l/33l-predictions.md`, P0).
 *
 * And the body's own lean rate is the sum of **two** of those unknowns, which `AttachedRider.finish` says in the code:
 *
 *   `θ̇_body = Δu̇ / L + ω_board · rollAxis`
 *
 * — the leg's own angle opening at the ankle **plus** the deck rolling underneath it. So every entry is booked three
 * times: `own` (the body's lean), `relative` (the ankle half) and `deck` (the board half), with `own = relative +
 * deck` per source by construction.
 *
 * **The datum.** Every angle and every acceleration here is in the **raw board frame**: `+` means the body's lean, or
 * the deck's roll, toward the board's own **+x** (its left), about `AttachedRider.rollAxis` — the heading's own roll
 * axis, yaw only. It is the sense steps 3.3j §2 and 3.3k §2 use and **not** the `dir`-signed "toward the turn's
 * inside" convention: with the stick never touched there is no commanded turn to have an inside. Beside it, each
 * table also prints the entry **signed by the lean that actually happened** (`× sign(bank at the fall)`), so positive
 * means *drives the lean he fell with*; which of the two a column is in is stated in its own name (`…Lean`).
 *
 * ## The two populations, named, and never pooled
 *
 * 1. **Step 3.3k's own unsteered arm, reproduced**: the Canyon-matched `FaceWater` (1.4 m / 16° / 5.7 m/s, 2.6 m deep,
 *    the board 0.75 fronts ahead of the crest and 45° off the fall line), the stance held, the stick **never
 *    touched**, eight relative entry speeds (`EXTRAS`) × three stances, 9 s a run.
 * 2. **The owner's own low-speed cell, built here for the first time** (`ENTRIES`): the same water and the same
 *    placement, but the entry speed set **absolutely** rather than as an offset from the wave's own celerity over
 *    cos 45°, at 1–6 m/s — the speeds of *"getting positioning in a wave"*. Step 3.3k's §8 named this gap in its own
 *    caveat: its unsteered arm runs at **4.99–10.00 m/s at the fall**, which is not low speed, and its low end
 *    (entry −3) is the nearest it comes. The board's speed **through the water** is printed every frame so the cell is
 *    read rather than assumed.
 *
 * `ENTRIES` and `EXTRAS` are two different populations and nothing below pools them.
 *
 * Read-only: it drives the shipped inputs, reads public fields and turns on one read-only ledger. Run from the root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/bank.ts -o <scratch>/bk.mjs --format esm --platform node
 *   RIDER=new node <scratch>/bk.mjs
 *
 * Env: `RIDER=new|old`, `STANCES`, `EXTRAS` (relative entries, 3.3k's arm), `ENTRIES` (absolute entries, m/s, the
 * owner's cell — when set, `EXTRAS` is ignored), `STEERS`, `SECONDS`, `FELT=deck`, `LEDGER=off` (the reproduction
 * arm), `OUT` (one JSON line a run), `TRACE` (every frame of every run as TSV).
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { BANK_SOURCES, bankLedger, type BankSource } from '../../../../src/physics/bankLedger';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own MAX_BANK, °, restated so the probe never imports a private: the clamp 3.3k flagged. */
const MAX_BANK = 70;

const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '-3,-2,-1,0,1,1.5,2,3').split(',').map(Number);
const ENTRIES = process.env.ENTRIES ? process.env.ENTRIES.split(',').map(Number) : null;
const STEERS = (process.env.STEERS ?? '0').split(',').map(Number);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';
const FELT = process.env.FELT === 'deck' ? 'deck' : undefined;
const LEDGER = process.env.LEDGER !== 'off';

type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : Number.NaN; };
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

/** As `fall.ts` and `deck.ts`: the deeper of crouch and Compress wins in the code, so Compress holds the crouch at 0.6. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

interface Frame {
  t: number;
  /** The board's speed over the ground, m/s, and through the water under it (the cell's own independent variable). */
  speed: number;
  through: number;
  /** The deck's own bank from the WORLD vertical, ° (+ = the deck normal toward board +x), and its rate by difference. */
  roll: number;
  rollRate: number;
  /** The body's own lean from the WORLD vertical, ° (`AttachedRider.bank.angle`), and its rate by difference. */
  bank: number;
  bankRate: number;
  /** The joint's own angle across, ° (bank − roll), and whether the bank is at MAX_BANK's clamp this frame. */
  rel: number;
  clamped: number;
  /**
   * **The face's own across tilt at the board, °** (+ = its normal toward board +x), and the rail, `roll − waterTilt`.
   * These two are in the table because of what the first smoke run showed: the board is **placed square to the
   * water's surface** and the body is mounted **square to the deck**, so on a 16° face taken 45° off the fall line
   * both the deck's roll and the body's bank start at the face's own across tilt — about 11° — **from the world
   * vertical, at the first frame, with nothing having moved.** Any reading of "the bank passed 10°" has to carry this.
   */
  waterTilt: number;
  rail: number;
  /** The fall test's two conditions and the place it is built on. */
  beyond: number;
  weightPast: number;
  px: number;
  /** The ledger: the body's own lean acceleration this frame, °/s², and its two halves. */
  ownTotal: number;
  relTotal: number;
  deckTotal: number;
  /**
   * **The quantity the ledger is the derivative of**, read off the rider itself: `rider.angularVelocity · rollAxis`,
   * °/s. `AttachedRider.finish` builds it as `bankSpeedAfter / L + ω_board · rollAxis` — the ledger's `relative` and
   * `deck` halves exactly — so the frame-to-frame change in this column is what `ownTotal` must integrate to. It is a
   * public field and the probe reads it; nothing here re-derives it.
   */
  ownRate: number;
  /**
   * The two **kinematic** terms the ledger cannot contain, because they are not forces, named and measured here
   * rather than left in a residual. `ownRate` is `bankSpeed / L + ω_board · rollAxis`, so it also moves when
   *
   * - **the leg's own length changes** (`L̇`): the same speed across a shorter leg is a faster lean. Compress
   *   shortens the leg over its first second, so this term is not small in the owner's own stance;
   * - **the roll axis turns** with the heading: `d/dt (ω · u) = α · u + ω · u̇`, and `u̇` is the yaw carrying the
   *   axis round.
   *
   * Both are computed from frame differences of public fields, and the control below adds them to the ledger's own
   * total rather than tuning anything.
   */
  legL: number;
  boardRoll: number;
  relRate: number;
  axisX: number;
  axisZ: number;
  stretchTerm: number;
  axisTerm: number;
  /**
   * Step 3.3j's and 3.3k's own ankle ledger, three columns of it, so this round's attribution can be read beside the
   * instrument the last two rounds were built on: the joint's own angle θ − φ, the rest the balance COMMANDED, and
   * the torque delivered, all three the step's own means. `AttachedRider.ankleLedger` is a pure observer
   * (`ankleLedger.test.ts` asserts it to the digit).
   */
  ankleAngle: number;
  ankleRest: number;
  ankleTq: number;
  /** The ledger's three closure tests, the worst of the frame's substeps, its counters, and the substeps booked. */
  split: number;
  closure: number;
  residual: number;
  apart: number;
  singular: number;
  steps: number;
  /** Per source: the body's own lean acceleration, °/s², + toward board +x. */
  own: Record<BankSource, number>;
  rel2: Record<BankSource, number>;
  deck2: Record<BankSource, number>;
}

/**
 * **The grouping, declared here and not chosen after the read.** The per-source table is the measurement; this is a
 * second reading of it, and its one job is to put the terms that **hold each other up** in one row:
 *
 * - `support` — the leg's own force and the water the hull stands on (pressure, buoyancy, added mass, suction). The
 *   leg presses the rider's weight onto the deck and the water holds it up, so these are one pair whose difference is
 *   a roll about wherever the two lines of force fail to meet.
 * - `weightAll` — the two weights, the rider's and the board's.
 * - `foils` — the fins, the rails and the hull's friction: the board's grip, not its support.
 * - `joints` — everything inside the body and between it and the deck: the ankle, the swing, the twist, the pitch
 *   ankle and hip, the hand, and the legs' yaw coupling. **An internal torque cannot change the pair's own angular
 *   momentum**, so this group's total is the test of whether the balance has any authority over the lean at all —
 *   the inference step 3.3k §8 explicitly refused to claim without measuring it.
 * - `other` — the rider's own water force, the gyroscopic term, and the entries that are identically zero for the new
 *   surfer (`assist`, `drive`, `limbs`, `carry`), kept in the table so that is read rather than assumed.
 */
const GROUP: Record<BankSource, string> = {
  weight: 'weightAll', gravity: 'weightAll',
  buoyancy: 'support', pressure: 'support', suction: 'support', addedMass: 'support', leg: 'support',
  fins: 'foils', rails: 'foils', friction: 'foils', froth: 'foils',
  ankle: 'joints', swing: 'joints', twist: 'joints', pitch: 'joints', hand: 'joints', yawCouple: 'joints',
  gyro: 'other', riderWater: 'other', assist: 'other', carry: 'other', drive: 'other', limbs: 'other',
};

const EMPTY = (): Record<BankSource, number> => {
  const out = {} as Record<BankSource, number>;
  for (const k of BANK_SOURCES) out[k] = Number.NaN;
  return out;
};

function oneRun(st: Stance, extra: number, entry0: number | null, steer: number): Record<string, unknown> {
  bankLedger.on = LEDGER;
  AttachedRider.ankleLedger = true;
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const px0 = 0;
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(px0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  // The cell's own entry: `fall.ts`'s offset from the wave's celerity over cos 45° (`EXTRAS`), or the absolute speed
  // through the water the owner's cell is built on (`ENTRIES`). The board is placed on the flow, so the speed through
  // the water at the first frame is exactly `entry`.
  const entry = entry0 ?? ((FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra);
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
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = steer;

  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  /** `AttachedRider.rollAxis`: the heading's own roll axis, `(0, 0, −1)` turned by the yaw. The ledger's own datum. */
  const rollAxis = new Vector3();
  const nW = new Vector3();
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    // `side` is the board's own +x horizontally (up × forward), so every across column below is in the board's frame.
    side.set(fwd.z, 0, -fwd.x);
    // `rollAxis` is `(0, 0, −1)` in the heading's frame, which is `−forward` horizontally: a right-handed rotation
    // about it tips the deck's normal toward board +x, the sense every angle here is in.
    rollAxis.set(-fwd.x, 0, -fwd.z);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const through = Math.hypot(board.velocity.x - (cen.outsideDomain ? 0 : cen.flowX), board.velocity.z - (cen.outsideDomain ? 0 : cen.flowZ));
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const tilt = Math.atan2(nW.dot(side), nW.y) * DEG;
    const state = rider.human.state;
    const bank = rider.bank.angle * DEG;
    const own = EMPTY();
    const rel2 = EMPTY();
    const deck2 = EMPTY();
    if (LEDGER) {
      for (const k of BANK_SOURCES) {
        own[k] = bankLedger.own[k] * DEG;
        rel2[k] = bankLedger.relative[k] * DEG;
        deck2[k] = bankLedger.deck[k] * DEG;
      }
    }
    frames.push({
      t,
      speed: board.velocity.length(),
      through,
      roll,
      rollRate: Number.NaN,
      bank,
      bankRate: Number.NaN,
      rel: bank - roll,
      clamped: Math.abs(bank) >= MAX_BANK - 1e-6 ? 1 : 0,
      waterTilt: tilt,
      rail: roll - tilt,
      beyond: state.beyond ? 1 : 0,
      weightPast: state.weightPast ? 1 : 0,
      px: state.pointAcross,
      ownRate: rider.angularVelocity.dot(rollAxis) * DEG,
      legL: Math.max(0.4, rider.leg.height + rider.leg.extension),
      boardRoll: board.angularVelocity.dot(rollAxis) * DEG,
      relRate: (rider.angularVelocity.dot(rollAxis) - board.angularVelocity.dot(rollAxis)) * DEG,
      axisX: rollAxis.x,
      axisZ: rollAxis.z,
      stretchTerm: Number.NaN,
      axisTerm: Number.NaN,
      ankleAngle: rider.ankle.substeps > 0 ? rider.ankle.angle * DEG : Number.NaN,
      ankleRest: rider.ankle.substeps > 0 ? rider.ankle.rest * DEG : Number.NaN,
      ankleTq: rider.ankle.substeps > 0 ? rider.ankle.torque : Number.NaN,
      ownTotal: LEDGER ? bankLedger.ownTotal * DEG : Number.NaN,
      relTotal: LEDGER ? bankLedger.relativeTotal * DEG : Number.NaN,
      deckTotal: LEDGER ? bankLedger.deckTotal * DEG : Number.NaN,
      split: LEDGER ? bankLedger.split : Number.NaN,
      closure: LEDGER ? bankLedger.closure : Number.NaN,
      residual: LEDGER ? bankLedger.residual : Number.NaN,
      apart: LEDGER ? bankLedger.apart : Number.NaN,
      singular: LEDGER ? bankLedger.singular : Number.NaN,
      steps: LEDGER ? bankLedger.steps : Number.NaN,
      own,
      rel2,
      deck2,
    });
    // The rates, filled on the frame after so each is a difference and never a one-frame value read as a rate.
    if (frames.length > 1) {
      const last = frames[frames.length - 1];
      const prev = frames[frames.length - 2];
      last.rollRate = (last.roll - prev.roll) / STEP;
      last.bankRate = (last.bank - prev.bank) / STEP;
      // The leg's own length changing, and the roll axis turning with the heading. `axisTerm` is `ω_body · u̇` with
      // `u̇` a plain frame difference of the axis (it is horizontal, so its two components are enough).
      last.stretchTerm = -last.relRate * ((last.legL - prev.legL) / STEP) / last.legL;
      const ax = (last.axisX - prev.axisX) / STEP;
      const az = (last.axisZ - prev.axisZ) / STEP;
      last.axisTerm = (rider.angularVelocity.x * ax + rider.angularVelocity.z * az) * DEG;
    }
    // `attached` is the test (step 3.3f §1): `separate` leaves `phase` and `upright` untouched.
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      fell = rider.attached ? rider.phase : (rider.separation ?? 'separated');
      fellAt = t;
      break;
    }
  }
  bankLedger.on = false;

  if (TRACE) {
    process.stdout.write(`# TRACE ${RIDER} ${st} entry=${f(entry, 3)} steer=${steer} felt=${FELT ?? 'world'}\n`);
    const flat = (x: Frame) => {
      const base: Record<string, number> = {};
      for (const [k, v] of Object.entries(x)) if (typeof v === 'number') base[k] = v;
      for (const k of BANK_SOURCES) {
        base[`own_${k}`] = x.own[k];
        base[`rel_${k}`] = x.rel2[k];
        base[`deck_${k}`] = x.deck2[k];
      }
      return base;
    };
    const keys = Object.keys(flat(frames[0]));
    process.stdout.write(`${keys.join('\t')}\n`);
    for (const x of frames) {
      const row = flat(x);
      process.stdout.write(`${keys.map((k) => (Number.isFinite(row[k]) ? row[k].toFixed(5) : 'NaN')).join('\t')}\n`);
    }
  }

  // The mount's contact transient is the first ~0.17 s in every probe of this folder, so every window below starts
  // after 0.2 s. The transient itself is reported on its own row (`mount…`) and never pooled with the ride.
  const mount = frames.filter((x) => x.t <= 0.2);
  const live = frames.filter((x) => x.t > 0.2);
  const end = frames[frames.length - 1];
  // The lean that actually happened, as its own sign: the bank at the fall. `Math.sign(0) || 1` picks +1 at random
  // (this folder's own named trap), so a run whose bank is exactly 0 at the fall is reported as NaN rather than +1.
  const dirLean = end && end.bank !== 0 ? Math.sign(end.bank) : Number.NaN;
  const windows: Record<string, Frame[]> = {
    // **The mount window, reported and never pooled with the ride.** Every probe in this folder drops the first
    // ~0.2 s as the placement's contact transient, and step 3.3l is the first round that needs to look inside it:
    // the lean is already several degrees by the time the transient is over, so an attribution that starts at 0.2 s
    // cannot say what STARTED it. It is published with the caveat it deserves — the owner pops up, he is not placed,
    // and this window contains the placement.
    mount,
    early: live.filter((x) => x.t <= 0.4),
    mid: live.filter((x) => x.t > 0.4 && x.t <= 1.0),
    late: live.filter((x) => x.t > 1.0),
    last02: end ? live.filter((x) => x.t > end.t - 0.2) : [],
    last05: end ? live.filter((x) => x.t > end.t - 0.5) : [],
    // The clamp step 3.3k carried forward as a known defect: `AttachedRider.frame` hard-clamps the measured bank at
    // MAX_BANK, and the ankle's torque is then computed from the clamped angle. Those frames are excluded from the
    // ride-wide window and the count is published.
    ride: live.filter((x) => x.clamped === 0),
  };
  const out: Record<string, unknown> = {
    rider: RIDER,
    stance: st,
    extra: entry0 === null ? extra : null,
    entryAsked: entry0,
    entry: r(entry, 3),
    steer,
    felt: FELT ?? 'world',
    ledger: LEDGER ? 'on' : 'off',
    fell,
    fellAt: r(fellAt, 3),
    frames: frames.length,
    // The cell, read: the speed through the water at the first live frame, at the fall, and its whole span.
    throughFirst: r(live[0]?.through ?? Number.NaN, 3),
    throughFall: r(end?.through ?? Number.NaN, 3),
    throughSpan: span(live.map((x) => x.through), 3),
    speedFall: r(end?.speed ?? Number.NaN, 3),
    // The angles at the fall, the raw board frame.
    rollFall: r(end?.roll ?? Number.NaN, 2),
    bankFall: r(end?.bank ?? Number.NaN, 2),
    relFall: r(end?.rel ?? Number.NaN, 2),
    railFall: r(end?.rail ?? Number.NaN, 2),
    // **The datum at the first frame**, because the board is placed square to the face and the body square to the
    // deck: on a tilted face both start off the WORLD vertical with nothing having moved.
    tilt0: r(frames[0]?.waterTilt ?? Number.NaN, 2),
    roll0: r(frames[0]?.roll ?? Number.NaN, 2),
    bank0: r(frames[0]?.bank ?? Number.NaN, 2),
    rel0: r(frames[0]?.rel ?? Number.NaN, 2),
    tilt02: r(mount[mount.length - 1]?.waterTilt ?? Number.NaN, 2),
    roll02: r(mount[mount.length - 1]?.roll ?? Number.NaN, 2),
    bank02: r(mount[mount.length - 1]?.bank ?? Number.NaN, 2),
    rel02: r(mount[mount.length - 1]?.rel ?? Number.NaN, 2),
    ownRate02: r(mount[mount.length - 1]?.ownRate ?? Number.NaN, 2),
    dirLean,
    rollPeak: r(Math.max(...frames.map((x) => Math.abs(x.roll))), 2),
    bankPeak: r(Math.max(...frames.map((x) => Math.abs(x.bank))), 2),
    clampedFrames: frames.filter((x) => x.clamped === 1).length,
    trigger: !end ? 'none' : end.beyond && end.weightPast ? 'both' : end.beyond ? 'beyond' : end.weightPast ? 'weightPast' : 'neither',
    pxFall: r(end?.px ?? Number.NaN, 4),
    // Step 3.3k's clock, reproduced on this probe's own frames: when each of the two passes 10° for good.
    bankPast10: r(passFor(frames, (x) => Math.abs(x.bank), 10), 3),
    rollPast10: r(passFor(frames, (x) => Math.abs(x.roll), 10), 3),
    // **The three clocks the datum forces this round to add.** The bank and the roll both START at the face's own
    // across tilt, so "passed 10°" is a degree and a half of movement; the RAIL starts at nothing (the board is
    // placed flat on the water) and the JOINT starts at nothing (the body is mounted square to the deck). So the
    // clock that says when the pair leaves the face is the rail's, and the clock that says when the body leans
    // against its own deck is the joint's.
    railPast10: r(passFor(frames, (x) => Math.abs(x.rail), 10), 3),
    railPast2: r(passFor(frames, (x) => Math.abs(x.rail), 2), 3),
    jointPast2: r(passFor(frames, (x) => Math.abs(x.rel), 2), 3),
    jointPast5: r(passFor(frames, (x) => Math.abs(x.rel), 5), 3),
  };
  out.leadBank = r((out.rollPast10 as number) - (out.bankPast10 as number), 3);
  if (!LEDGER) return out;
  // The controls, the worst over the whole ride.
  out.splitMax = r(Math.max(...frames.map((x) => x.split)), 12);
  out.closureMax = r(Math.max(...frames.map((x) => x.closure)), 12);
  out.residualMax = r(Math.max(...frames.map((x) => x.residual)), 12);
  // The solve-apart paths: substeps the standing 8×8/9×9 did NOT decide, so the attribution does not describe them.
  // Both counts are sums over the ride, and the share is the one number that says how much of the ride is covered.
  const apartAll = frames.reduce((a, x) => a + x.apart, 0);
  const stepsAll = frames.reduce((a, x) => a + x.steps, 0);
  out.apartSubsteps = apartAll;
  out.bookedSubsteps = stepsAll;
  out.apartShare = r(apartAll / Math.max(1, apartAll + stepsAll), 4);
  out.apartMax = Math.max(...frames.map((x) => x.apart));
  out.singularMax = Math.max(...frames.map((x) => x.singular));
  // **The control the ledger is actually the derivative of** (P8, rewritten after the first smoke run showed the
  // geometric bank is a different quantity): `ownTotal` integrated frame to frame against the change in
  // `rider.angularVelocity · rollAxis`, which `AttachedRider.finish` builds out of the ledger's own two halves. The
  // residual terms are named and not hidden: the rollAxis itself turns with the heading, the ledger's entries are
  // substep means read once a frame, and the apart substeps above are outside the system that was attributed.
  const check = frames.filter((x) => x.clamped === 0);
  out.ownRateSpan = span(check.map((x) => x.ownRate), 1);
  // The chain is walked twice, and the difference between the two walks is the measurement of what the apart
  // substeps cost: `all` keeps every unclamped frame, `clean` keeps only the frames the standing system decided
  // whole. Both are contiguous runs, so no frame's change is credited to a step that was not taken.
  const walk = (list: Frame[], label: string, kinematic = false) => {
    let integrated = list.length ? list[0].ownRate : Number.NaN;
    let worstStep = 0;
    let at = 0;
    for (let i = 1; i < list.length; i += 1) {
      if (list[i].t - list[i - 1].t > 1.5 * STEP) break;
      const add = list[i].ownTotal + (kinematic ? list[i].stretchTerm + list[i].axisTerm : 0);
      integrated += add * STEP;
      at = i;
      const step = Math.abs((list[i].ownRate - list[i - 1].ownRate) - add * STEP);
      if (step > worstStep) worstStep = step;
    }
    out[`${label}Frames`] = at + 1;
    out[`${label}From`] = r(list[0]?.ownRate ?? Number.NaN, 2);
    out[`${label}To`] = r(list[at]?.ownRate ?? Number.NaN, 2);
    out[`${label}Integrated`] = r(integrated, 2);
    out[`${label}Gap`] = r(integrated - (list[at]?.ownRate ?? Number.NaN), 2);
    out[`${label}StepMax`] = r(worstStep, 4);
  };
  walk(check, 'all');
  walk(frames.filter((x) => x.clamped === 0 && x.apart === 0), 'clean');
  walk(check, 'kin', true);
  // And the geometric bank angle's own rate beside it, which is a DIFFERENT quantity — the lean of the body's centre
  // of mass over the stance point, not the body's own angular velocity — and is reported as the comparison it is.
  out.bankRateSpan = span(check.map((x) => x.bankRate), 1);
  out.bankVsOwn = r(median(check.map((x) => x.bankRate - x.ownRate)), 2);
  // **The attribution.** Per window, per source: the MEAN over the window (means sum, medians do not — this folder's
  // own named error), raw board frame and signed by the lean that happened. The sum of the means is printed beside
  // them so the reader can check it against the window's own `ownTotal` mean.
  for (const [name, w] of Object.entries(windows)) {
    if (!w.length) continue;
    const block: Record<string, unknown> = { n: w.length, t: `${f(w[0].t, 3)}–${f(w[w.length - 1].t, 3)}` };
    block.ownTotal = r(mean(w.map((x) => x.ownTotal)), 2);
    block.relTotal = r(mean(w.map((x) => x.relTotal)), 2);
    block.deckTotal = r(mean(w.map((x) => x.deckTotal)), 2);
    block.bank = r(mean(w.map((x) => x.bank)), 2);
    block.roll = r(mean(w.map((x) => x.roll)), 2);
    block.rel = r(mean(w.map((x) => x.rel)), 2);
    block.tilt = r(mean(w.map((x) => x.waterTilt)), 2);
    block.rail = r(mean(w.map((x) => x.rail)), 2);
    block.ownRate = r(mean(w.map((x) => x.ownRate)), 2);
    // The share of this window's substeps the standing system did NOT decide: the attribution describes the rest.
    // **P2's own yardstick, computed from the window's own measured bank and leg length and nothing else**: the
    // inverted pendulum's term, `g sinθ / L`, in °/s². `gravity`'s entry is compared against it, never fitted to it.
    const legL = mean(w.map((x) => x.legL));
    block.legL = r(legL, 4);
    block.pendulum = r((9.81 * Math.sin(mean(w.map((x) => x.bank)) / DEG)) / legL * DEG, 2);
    const ap = w.reduce((a, x) => a + x.apart, 0);
    const bk = w.reduce((a, x) => a + x.steps, 0);
    block.apartIn = r(ap / Math.max(1, ap + bk), 4);
    block.ankleAngle = r(mean(w.map((x) => x.ankleAngle)), 2);
    block.ankleRest = r(mean(w.map((x) => x.ankleRest)), 2);
    block.ankleTq = r(mean(w.map((x) => x.ankleTq)), 2);
    let sum = 0;
    let gross = 0;
    const byGroup: Record<string, number> = { support: 0, weightAll: 0, foils: 0, joints: 0, other: 0 };
    for (const k of BANK_SOURCES) {
      const m = mean(w.map((x) => x.own[k]));
      if (!Number.isFinite(m) || m === 0) continue;
      sum += m;
      gross += Math.abs(m);
      byGroup[GROUP[k]] += m;
      block[`own_${k}`] = r(m, 2);
      block[`rel_${k}`] = r(mean(w.map((x) => x.rel2[k])), 2);
      block[`deck_${k}`] = r(mean(w.map((x) => x.deck2[k])), 2);
      if (Number.isFinite(dirLean)) block[`lean_${k}`] = r(m * dirLean, 2);
    }
    block.sumOwn = r(sum, 2);
    block.sumGap = r(sum - (block.ownTotal as number), 4);
    // **The cancellation ratio, and it is the first thing to read in every table below.** The entries sum to the
    // total, exactly; `gross / |total|` says by how much they cancel on the way there. A ratio of 2 is an attribution
    // where the names mean what they look like; a ratio of 100 is one where the lean is a small residual of large
    // opposed terms and no single name is "the cause" without its partner. It is published per window.
    block.gross = r(gross, 2);
    block.cancel = r(gross / Math.max(1e-9, Math.abs(sum)), 1);
    for (const [g, v] of Object.entries(byGroup)) {
      block[`g_${g}`] = r(v, 2);
      if (Number.isFinite(dirLean)) block[`gl_${g}`] = r(v * dirLean, 2);
    }
    out[name] = block;
  }
  return out;
}

/** The last time `pick` crossed `bar` and stayed over it to the end: step 3.3k's own "passes 10° for good". */
function passFor(frames: Frame[], pick: (x: Frame) => number, bar: number): number {
  let at = Number.NaN;
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    if (pick(frames[i]) < bar) break;
    at = frames[i].t;
  }
  return at;
}

const rows: Record<string, unknown>[] = [];
for (const st of STANCES) {
  for (const steer of STEERS) {
    if (ENTRIES) for (const e of ENTRIES) rows.push(oneRun(st, Number.NaN, e, steer));
    else for (const extra of EXTRAS) rows.push(oneRun(st, extra, null, steer));
  }
}
for (const row of rows) emit(row);

// ---- the printed tables, so the round reads its own numbers rather than a file ----

const fellRows = rows.filter((x) => x.fell);
const num = (x: Record<string, unknown>, k: string) => (typeof x[k] === 'number' ? (x[k] as number) : Number.NaN);
const win = (x: Record<string, unknown>, w: string) => (x[w] ?? {}) as Record<string, unknown>;

process.stdout.write('\n# the cell, read\n');
// **The ride can end two ways and they are counted apart**: `balance` is `HumanBalance.fallen` (the fall test's two
// conditions together) and anything else is the rider separating for another reason — `lost board` when the board has
// got away from him, which the flat-across cell does nine times in twenty-four. A line that said only "fell 24 of 24"
// would hide that, and an earlier draft of Part 35 read four of those endings as step 3.3j's flat fall.
const balanceRows = rows.filter((x) => x.fell === 'balance');
process.stdout.write(`n ${rows.length}  the ride ended ${fellRows.length} of ${rows.length}  (balance fall ${balanceRows.length}, other ${fellRows.length - balanceRows.length}: ${[...new Set(fellRows.filter((x) => x.fell !== 'balance').map((x) => String(x.fell)))].join(', ') || 'none'})  at ${span(rows.map((x) => num(x, 'fellAt')), 2)} s\n`);
process.stdout.write(`entry asked ${span(rows.map((x) => num(x, 'entry')), 2)} m/s  through the water, first live frame ${span(rows.map((x) => num(x, 'throughFirst')), 2)}  at the fall ${span(rows.map((x) => num(x, 'throughFall')), 2)}\n`);
process.stdout.write(`roll at the fall ${span(rows.map((x) => num(x, 'rollFall')), 1)}°  bank ${span(rows.map((x) => num(x, 'bankFall')), 1)}°  joint ${span(rows.map((x) => num(x, 'relFall')), 1)}°  rail ${span(rows.map((x) => num(x, 'railFall')), 1)}°\n`);
process.stdout.write(`THE DATUM, first frame: the face's across tilt ${span(rows.map((x) => num(x, 'tilt0')), 1)}°, the deck's roll ${span(rows.map((x) => num(x, 'roll0')), 1)}°, the body's bank ${span(rows.map((x) => num(x, 'bank0')), 1)}°, the joint ${span(rows.map((x) => num(x, 'rel0')), 1)}°\n`);
process.stdout.write(`at 0.200 s: tilt ${span(rows.map((x) => num(x, 'tilt02')), 1)}°, roll ${span(rows.map((x) => num(x, 'roll02')), 1)}°, bank ${span(rows.map((x) => num(x, 'bank02')), 1)}°, joint ${span(rows.map((x) => num(x, 'rel02')), 1)}°, the body's own rate ${span(rows.map((x) => num(x, 'ownRate02')), 1)} °/s\n`);
const regime = (x: Record<string, unknown>) => { const v = Math.abs(num(x, 'rollFall')); return v < 10 ? 'A' : v < 60 ? 'B' : 'C'; };
process.stdout.write(`regimes A/B/C ${['A', 'B', 'C'].map((g) => rows.filter((x) => regime(x) === g).length).join(' / ')}\n`);
process.stdout.write(`the bank passes 10° first in ${rows.filter((x) => num(x, 'leadBank') > 0).length} of ${rows.filter((x) => Number.isFinite(num(x, 'leadBank'))).length}, median ${f(median(rows.map((x) => num(x, 'leadBank'))), 3)} s\n`);
process.stdout.write(`the clocks: the rail passes 2° at ${span(rows.map((x) => num(x, 'railPast2')), 3)} s and 10° at ${span(rows.map((x) => num(x, 'railPast10')), 3)}; the joint passes 2° at ${span(rows.map((x) => num(x, 'jointPast2')), 3)} and 5° at ${span(rows.map((x) => num(x, 'jointPast5')), 3)}; the bank passes 10° at ${span(rows.map((x) => num(x, 'bankPast10')), 3)}\n`);

if (LEDGER) {
  process.stdout.write('\n# the controls (P0)\n');
  process.stdout.write(`split ${span(rows.map((x) => num(x, 'splitMax')), 12)}  closure ${span(rows.map((x) => num(x, 'closureMax')), 12)}  residual ${span(rows.map((x) => num(x, 'residualMax')), 12)}\n`);
  process.stdout.write(`sum − total, worst window ${span(rows.flatMap((x) => ['mount', 'early', 'mid', 'late', 'last02', 'ride'].map((w) => Math.abs(Number(win(x, w).sumGap ?? 0)))), 6)} °/s²\n`);
  process.stdout.write(`apart ${span(rows.map((x) => num(x, 'apartSubsteps')), 0)} substeps of ${span(rows.map((x) => num(x, 'bookedSubsteps') + num(x, 'apartSubsteps')), 0)}, share ${span(rows.map((x) => num(x, 'apartShare')), 4)}  singular ${span(rows.map((x) => num(x, 'singularMax')), 0)}\n`);
  for (const lab of ['all', 'clean', 'kin']) {
    process.stdout.write(`the control, ${lab} frames (${span(rows.map((x) => num(x, `${lab}Frames`)), 0)}): ${span(rows.map((x) => num(x, `${lab}From`)), 1)} → integrated ${span(rows.map((x) => num(x, `${lab}Integrated`)), 1)} against the read ${span(rows.map((x) => num(x, `${lab}To`)), 1)} °/s, signed gap ${span(rows.map((x) => num(x, `${lab}Gap`)), 1)}, worst single step ${span(rows.map((x) => num(x, `${lab}StepMax`)), 3)}\n`);
  }
  process.stdout.write(`the geometric bank's own rate, a DIFFERENT quantity, less the body's own: median ${span(rows.map((x) => num(x, 'bankVsOwn')), 1)} °/s\n`);
  process.stdout.write(`cancellation ratio (Σ|entry| over |total|) by window: ${['mount', 'early', 'mid', 'late', 'last02', 'ride'].map((w) => `${w} ${span(rows.map((x) => Number(win(x, w).cancel)), 0)}`).join('  ')}\n`);

  process.stdout.write('\n# the five groups, °/s², LEAN-signed means (+ drives the lean he fell with)\n');
  process.stdout.write(`window\t${['support', 'weightAll', 'foils', 'joints', 'other'].join('\t')}\ttotal\n`);
  for (const w of ['mount', 'early', 'mid', 'late', 'last05', 'last02', 'ride']) {
    const present = rows.filter((x) => x[w]);
    if (!present.length) continue;
    const cells = ['support', 'weightAll', 'foils', 'joints', 'other']
      .map((g) => f(mean(present.map((x) => Number(win(x, w)[`gl_${g}`]))), 1));
    const tot = f(mean(present.map((x) => Number(win(x, w).ownTotal) * (Number(x.dirLean) || Number.NaN))), 1);
    process.stdout.write(`${w}\t${cells.join('\t')}\t${tot}\n`);
  }

  for (const w of ['mount', 'early', 'mid', 'late', 'last05', 'last02', 'ride']) {
    const present = rows.filter((x) => x[w]);
    if (!present.length) continue;
    process.stdout.write(`\n# ${w}: the body's own lean acceleration per source, °/s², MEANS over the window, ${present.length} runs\n`);
    process.stdout.write(`t ${present.map((x) => String(win(x, w).t)).slice(0, 1).join('')}…  bank ${span(present.map((x) => Number(win(x, w).bank)), 1)}°  roll ${span(present.map((x) => Number(win(x, w).roll)), 1)}°  joint ${span(present.map((x) => Number(win(x, w).rel)), 1)}°  leg ${span(present.map((x) => Number(win(x, w).legL)), 3)} m  g sinθ/L ${span(present.map((x) => Number(win(x, w).pendulum)), 1)} °/s²  face tilt ${span(present.map((x) => Number(win(x, w).tilt)), 1)}°  rail ${span(present.map((x) => Number(win(x, w).rail)), 1)}°  apart share ${span(present.map((x) => Number(win(x, w).apartIn)), 3)}  joint ${span(present.map((x) => Number(win(x, w).ankleAngle)), 2)}° rest ${span(present.map((x) => Number(win(x, w).ankleRest)), 2)}° torque ${span(present.map((x) => Number(win(x, w).ankleTq)), 1)} N·m  the body's own rate ${span(present.map((x) => Number(win(x, w).ownRate)), 1)} °/s\n`);
    process.stdout.write(`total own ${span(present.map((x) => Number(win(x, w).ownTotal)), 1)}  = relative ${span(present.map((x) => Number(win(x, w).relTotal)), 1)} + deck ${span(present.map((x) => Number(win(x, w).deckTotal)), 1)}\n`);
    process.stdout.write('source\town, mean of means\town, span\tLEAN-signed, mean\trelative, mean\tdeck, mean\tdriving in\n');
    const lines: [string, number, string, number, number, number, string][] = [];
    for (const k of BANK_SOURCES) {
      const owns = present.map((x) => Number(win(x, w)[`own_${k}`]));
      if (!owns.some(Number.isFinite)) continue;
      const leans = present.map((x) => Number(win(x, w)[`lean_${k}`]));
      const driving = leans.filter((v) => v > 0).length;
      lines.push([
        k, mean(owns), span(owns, 1), mean(leans),
        mean(present.map((x) => Number(win(x, w)[`rel_${k}`]))),
        mean(present.map((x) => Number(win(x, w)[`deck_${k}`]))),
        `${driving} of ${leans.filter(Number.isFinite).length}`,
      ]);
    }
    lines.sort((a, b) => Math.abs(b[3]) - Math.abs(a[3]));
    for (const l of lines) process.stdout.write(`${l[0]}\t${f(l[1], 1)}\t${l[2]}\t${f(l[3], 1)}\t${f(l[4], 1)}\t${f(l[5], 1)}\t${l[6]}\n`);
  }
}
