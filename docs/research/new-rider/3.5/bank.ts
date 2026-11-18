/**
 * **Does the body bank with the deck? — the probe for step 3.5i (`?bodyBank=hip`).**
 *
 * The mechanism this is aimed at is `3.5/board-slips-away.md`'s, measured there and not re-argued here:
 *
 * > *The board does not slide across his soles and does not fly off them — it ROTATES out from under them. Turning on
 * > his own spot the deck banks past 20° at 0.683 s, the body does not bank with it, his foot support is only 0.260 m
 * > across, so the line from his centre of mass to the deck leaves his feet 0.08 s later, the centre of pressure pins
 * > at the support edge (`limit = 'tip'`, 90 of 90 riders), and the contact can no longer put force where the body
 * > needs it.*
 *
 * **The quantity that round did not have is the one this probe is built around: the body's bank against the deck's.**
 * The mismatch between them **is the ankle's own angle**, `bank.angle − roll`, and the stance pins when
 * `height · tan(mismatch)` passes the support's half-width — 10.9° at the median 0.676 m centre of mass.
 *
 * ## The four arms, and why each exists
 *
 * | arm | env | what it is |
 * |---|---|---|
 * | **ships** | (none) | the owner's own address, byte for byte. The baseline every number is read against |
 * | **both** | `BANK=hip` | the drive AND the contact's missing term: step 3.5i whole |
 * | **cop** | `BANK=hip HIPGAIN=0` | the contact's term alone. **Must be a near-no-op**: the rotor is driven by nothing but its own return spring, so the term is only as large as that |
 * | **drive** | `HIPGAIN=716` | the hip drive alone, at the derived gain — **step 3.2x's own arm**, which it measured and dropped (*"falls sooner on 36 of 60 rides"*). Stated as a prediction before the read: **this arm should be no better than `ships` and may be worse**, because the rotor's push is paid for at the sole |
 *
 * ## ☠️ What a broken result would look like, and the controls that catch it
 *
 * A metric that cannot fail is worthless, so each of these is named before anything is run:
 *
 * 1. **`relief` non-zero on the `ships` arm.** `AttachedRider.copRelief` is 0 in every substep off the switch by
 *    construction; a probe that reads it otherwise has found a bug in the gate, not a number. **Reported as a count.**
 * 2. **`tTip` zero everywhere.** `limitTime.tip` fired in 90 of 90 turning riders in the last round; if this probe
 *    reads 0 on the `ships` arm it has broken the detector (the slip round's own fault 2: `limit` is ONE substep of
 *    32 and `limitTime` is the step's memory). **Every bind here is read off `limitTime`.**
 * 3. **`mismatch` identically zero** would mean the two columns are the same read — they are not: `bank` comes from
 *    the body's centre-of-mass lean (`AttachedRider.frame`) and `roll` from the board's orientation, and the probe
 *    computes neither from the other. The `ships` arm's own spread is the proof.
 * 4. **A comparison against `NaN` emptying a filter** — tonight's own published zero. Every threshold here is
 *    `Number.isFinite(x) && …`, and the frame counts are printed beside every share so an empty filter shows up as a
 *    count of 0 rather than as a clean-looking 0.00.
 * 5. **The positive control, `CONTROL=pos`:** `HIPGAIN` at 20 000 N·m/m on a steep fast face. The rotor **must**
 *    saturate at `SWING_TORQUE = 200 N·m` and `|relief|` must sit at `h·200/j_y ≈ 200/N ≈ 0.28 m` at one body weight
 *    and never above it. A control that shows no saturation means the rotor's own bound is not being applied.
 * 6. **The negative control, `CONTROL=neg`:** a planing board on a 0.5° face, stick never touched. The rotor should
 *    be near silent and `relief` near zero even with the switch on; a large relief in quiet trim is a broken gate.
 * 7. **The probe is inert:** `MODE=probe` runs the same bench with every extra read-out on and off and compares the
 *    shared columns bit for bit. The private fields it reads (`limit`, `limitTime`, `frictionUsed`, `desiredCop`,
 *    `legLoad`, `hipCapture`) go through one accessor that only gets.
 *
 * ## The frozen window
 *
 * `AttachedRider.separate` (`:5227–5232`) sets `attached` / `climbing` / `inContact` / `separation` and **never
 * `phase` or `upright`**, so every rider column freezes afterwards. **Every run is cut at its first `attached == 0`,
 * that frame emitted and nothing after it read**, and the kept count is in every summary line.
 *
 * ## ⚠️ `SINK=0.06`
 *
 * The flush placement every rig in this track uses (`3.5/foam.ts`, `3.3/plant.ts`) starts the hull **dry** and the leg
 * **unloaded** — frame 1 dry in 480 of 480 runs — costing a median 32 frames (0.53 s) of settling, with 101 of 480
 * runs falling before ever becoming a ride. **`SINK=0.06` fixes it and every bench below uses it.**
 *
 * ## Running it
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/bank.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <s>/bank.mjs   # an OBJECT, never a string
 *   cat <s>/raw.mjs >> <s>/bank.mjs
 *
 * `MODE=sea` prints the grid it got off the solver on its first line, which must read `400x451 = 180400` for Canyon B
 * (the default Canyon is 400 × 507 = 202 800), and the CPU spin-up's own seconds.
 *
 * Env: `MODE=grid|sea|probe`, `CONTROL=neg|pos`, `BANK=hip`, `HIPGAIN=<N·m/m>`, `RIDER`, `FELT`, `BODY`, `REACH`,
 * `DEEPEN`, `SPEEDS`, `SLOPES`, `STANCES`, `STICKS`, `ENTRIES`, `SECONDS`, `HEIGHT`, `DEPTH`, `SIDE`, `SEED`, `SIZE`,
 * `TRIALS`, `GAP`, `AHEAD`, `SINK`, `PROBE=on|off`, `OUT`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own rotor bound, re-stated so the positive control's expectation is legible beside the class. */
const SWING_TORQUE = 200;

const MODE = (process.env.MODE ?? 'grid') as 'grid' | 'sea' | 'probe';
const CONTROL = process.env.CONTROL as 'neg' | 'pos' | undefined;
const RIDER = (process.env.RIDER ?? 'new') as 'old' | 'new';
const FELT = process.env.FELT as 'deck' | undefined;
const BODY = process.env.BODY as 'two' | undefined;
const REACH = process.env.REACH as 'keep' | undefined;
const DEEPEN = process.env.DEEPEN as 'on' | undefined;
/** Step 3.5i's switch itself: the derived hip gain AND the contact's missing term. */
const BANK = process.env.BANK as 'hip' | undefined;
/** An explicit `balance.hipCapture`, N·m/m, which wins over the switch's derived value — so either half runs alone. */
const HIPGAIN = process.env.HIPGAIN === undefined ? undefined : Number(process.env.HIPGAIN);
const PROBE = (process.env.PROBE ?? 'on') === 'on';
const SECONDS = Number(process.env.SECONDS ?? 4);
const SIDE = Number(process.env.SIDE ?? -45);
const OUT = process.env.OUT;

const nums = (v: string | undefined, d: string): number[] => (v ?? d).split(',').map(Number);
const SPEEDS = nums(process.env.SPEEDS, '4,6,8,10');
const SLOPES = nums(process.env.SLOPES, '12,16,20');
const STICKS = nums(process.env.STICKS, '1');
const ENTRIES = nums(process.env.ENTRIES, '2,3,4,5,6,7,8,9,10,12');
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
const HEIGHT = Number(process.env.HEIGHT ?? 1.4);
const DEPTH = Number(process.env.DEPTH ?? 6);
const SINK = Number(process.env.SINK ?? 0);

type Stance = 'tall' | 'crouch' | 'compress';

const r = (v: number, n: number): number | null => (Number.isFinite(v) ? Number(v.toFixed(n)) : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
/** The one read of a field TypeScript calls private. It only gets. */
const peek = (o: unknown, k: string): number => (o as Record<string, number>)[k];
const peekS = (o: unknown, k: string): string => (o as Record<string, string>)[k];

/** The arm's name, so every row carries which rider produced it. */
const ARM = BANK === 'hip' ? (HIPGAIN === 0 ? 'cop' : 'both') : HIPGAIN !== undefined && HIPGAIN !== 0 ? 'drive' : 'ships';

interface Run {
  cell: Record<string, unknown>;
  board: BoardBody;
  rider: AttachedRider;
  water: SurfWater;
  frame: number;
  done: boolean;
  fellAt: number | null;
  cause: string;
  lastRoll: number | null;
  /** The first frame each named condition held. */
  first: Record<string, number>;
  /** Live frames kept. */
  kept: number;
  /** Per-run series, for plain medians and peaks in the summary (no `qt`: the upper middle has moved a headline here). */
  mis: number[];
  rolls: number[];
  banks: number[];
  reliefs: number[];
  torques: number[];
  tols: number[];
  rollRates: number[];
  /** Counts the controls need. */
  nReliefNonZero: number;
  nTorqueSat: number;
  nReliefOverBound: number;
  nOvershoot: number;
  nBankClamped: number;
  nTip: number;
}
const runs: Run[] = [];

/** Place a pair flush on the surface at `x,z`, heading `SIDE`° off the fall line, at `speed` through the water. */
function placePair(water: SurfWater, x: number, z: number, speed: number, stance: Stance, stick: number): { board: BoardBody; rider: AttachedRider } | null {
  const sy = water.surfaceAt(x, z);
  const here = water.sampleAt(x, sy, z, scratch);
  if (!here.wet || here.outsideDomain) return null;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const fall = new Vector3(here.slopeX, 0, here.slopeZ);
  if (fall.lengthSq() < 1e-12) fall.set(0, 0, 1);
  fall.normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(x, sy, z).addScaledVector(normal, board.shape.centerOfMass.y - SINK),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(speed).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rd = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(BODY ? { riderBody: BODY } : {}),
    ...(REACH ? { stanceReach: REACH } : {}),
    ...(DEEPEN ? { deepen: DEEPEN } : {}),
    ...(BANK ? { bodyBank: BANK } : {}),
    ...(HIPGAIN === undefined ? {} : { balance: { hipCapture: HIPGAIN } }),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rd);
  rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rd.compress = stance === 'compress' ? 1 : 0;
  rd.steer = stick;
  return { board, rider: rd };
}

const scratch = createWaterSample();
const scratch2 = createWaterSample();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
const nW = new Vector3();
const offL = new Vector3();
const tmp = new Vector3();

function mark(e: Run, key: string, held: boolean): void {
  if (held && e.first[key] === undefined) e.first[key] = e.frame;
}

function stepRun(e: Run): void {
  const { board, rider, water } = e;
  e.frame += 1;
  board.step(STEP, water);
  const off = !rider.attached;

  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  // `side` as the game builds it: X turned by the heading is (fwd.z, 0, −fwd.x), so `roll` here IS `prepareBank`'s.
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;

  const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, scratch2);
  nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
  const tilt = Math.atan2(nW.dot(sideV), nW.y) * DEG;

  const row: Record<string, unknown> = {
    ...e.cell, frame: e.frame, t: r(e.frame * STEP, 4), off: off ? 1 : 0,
    speed: r(board.velocity.length(), 4),
    roll: r(roll, 3), rollRate: e.lastRoll === null ? null : r((roll - e.lastRoll) / STEP, 2),
    tilt: r(tilt, 3), rail: r(roll - tilt, 3),
  };

  if (PROBE) {
    /**
     * ⭐ **THE BODY'S BANK AGAINST THE DECK'S — the quantity the last round did not have.**
     *
     * `bank` is `AttachedRider.bank.angle`, how far the body's centre of mass leans over its feet from the WORLD's
     * vertical toward the heading's +x, less the posture's own offset (`frame`, `:5256`); `roll` above is the deck's
     * own from the world's level about the same axis (`prepareBank`, `:5518`). **Their difference is the ankle's own
     * angle**, which is the datum of `HUMAN_ANKLE_STIFFNESS × (bank.angle − roll − ankleRest)`, and it is the
     * mismatch that pins the centre of pressure. `bankRaw` is the same reading **unclamped**, recorded always by the
     * class, so a run that spends its life at the ±70° clamp shows up as one rather than as a 70.000 plateau.
     */
    const bank = rider.bank.angle * DEG;
    const mismatch = bank - roll;
    board.toLocal(rider.position, offL);
    const support = rider.support;
    const midX = (support.xMin + support.xMax) / 2;
    const half = (support.xMax - support.xMin) / 2;
    const height = Math.max(1e-6, offL.y);
    /**
     * **The mismatch the stance tolerates NOW**, degrees: `atan((half + |relief|) / height)`. With no relief this is
     * `board-slips-away.md`'s own 10.9° at the median 0.676 m centre of mass and ±0.130 m of support; with the trunk
     * rotor's own angular momentum rate counted it is wider by exactly as much as the rotor is actually giving.
     * ⚠️ **This is a geometric identity on three live numbers, not a measurement of the fix** — the measurement is
     * `mismatch` itself, and `tol` is here so the two can be read against each other frame by frame.
     */
    const relief = rider.copRelief;
    const copNm = rider.copMoment;
    const tol = Math.atan((half + Math.abs(relief)) / height) * DEG;
    const tolBare = Math.atan(half / height) * DEG;

    const want = peek(rider, 'desiredCop') as unknown as { x: number; z: number };
    const outX = Math.max(0, Math.max(support.xMin - want.x, want.x - support.xMax));
    const outZ = Math.max(0, Math.max(support.zMin - want.z, want.z - support.zMax));
    const lt = peek(rider, 'limitTime') as unknown as Record<string, number>;
    const limit = peekS(rider, 'limit');
    const swingT = peek(rider, 'swingTorque');
    const hipPast = rider.human.state.hipPast;
    const load = rider.contact.load;

    Object.assign(row, {
      bank: r(bank, 3), bankRaw: r(rider.bankRaw * DEG, 3), mismatch: r(mismatch, 3),
      tol: r(tol, 3), tolBare: r(tolBare, 3), inTol: Math.abs(mismatch) <= tol ? 1 : 0,
      relief: r(relief, 5), copNm: r(copNm, 3),
      swingT: r(swingT, 2), swingA: r(rider.swing.angle * DEG, 3), swingR: r(rider.swing.rate, 4),
      hipPast: r(hipPast, 5), hipGain: r(peek(rider, 'hipCapture'), 2),
      limitLast: limit, tTip: r(lt.tip, 5), tSlip: r(lt.slip, 5), tFlight: r(lt.flight, 5), tImpact: r(lt.impact, 5),
      overhang: r(Math.hypot(outX, outZ), 5), outX: r(outX, 5), wantX: r(want.x, 4),
      copX: r(rider.contact.centreOfPressure.x, 4), supX: r(support.xMax - support.xMin, 4),
      offAcross: r(offL.x - midX, 4), offUp: r(height, 4),
      margin: r(rider.balanceMargin, 4), rawMargin: r(peek(rider, 'rawMargin'), 4),
      load: r(load, 4), capture: r(rider.captureLoad, 4), legLoad: r(peek(rider, 'legLoad'), 2),
      planing: rider.leanProbe.planing, cap: r(rider.leanProbe.cap * DEG, 3), ask: r(rider.leanProbe.ask * DEG, 3),
      inContact: rider.inContact ? 1 : 0, steer: r(rider.steer, 4),
    });

    // The series, for plain medians and peaks. Only live frames reach here (the run is cut at the first `off`).
    e.mis.push(mismatch);
    e.rolls.push(roll);
    e.banks.push(bank);
    e.reliefs.push(relief);
    e.torques.push(swingT);
    e.tols.push(tol);
    if (e.lastRoll !== null) e.rollRates.push(Math.abs((roll - e.lastRoll) / STEP));
    // The controls' own counters.
    if (relief !== 0) e.nReliefNonZero += 1;
    if (Math.abs(swingT) >= SWING_TORQUE - 1e-6) e.nTorqueSat += 1;
    /**
     * **The term's own hard bound, checked load-free.** A first version of this control compared `|relief|` in metres
     * against `SWING_TORQUE / (load · m g)` using `contact.load`, **the STEP's load, against a relief computed from
     * the SUBSTEP's own normal impulse** — and it flagged 6 frames at a 67 m relief as out of bound. The relief
     * really is metres wide when the feet go light (`h·τ/j_y` with `j_y` near zero), and that is the correct
     * statement: a hip strategy on unweighted feet buys nothing, the clamp binds, and the solve goes apart. **What is
     * bounded is the MOMENT**, `copMoment` — and the exact bound is **`|copMoment| ≤ |swingTorque|`**, because the
     * term is that torque resolved onto a unit axis. ⚠️ **It is NOT bounded by SWING_TORQUE**, and a second version
     * of this control that assumed so flagged 2 frames: `humanSwingStep` clamps only its `burst` to ±SWING_TORQUE and
     * then **adds the rotor's own return and damping term on top**, so `swingTorque` reaches 252 N·m on this arm and
     * **303 N·m on the shipped rider** — a pre-existing fact about the class, found by this control and reported
     * rather than smoothed. The projection check below is the one that can actually catch a bug in the new term.
     */
    if (Math.abs(copNm) > Math.abs(swingT) + 1e-3) e.nReliefOverBound += 1;
    // What throwing too hard costs: the relief carried the demand past the support's FAR edge (a real cost, not a bug).
    if (relief !== 0 && Math.abs(want.x - midX) > half && (want.x - midX) * relief > 0) e.nOvershoot += 1;
    if (Math.abs(rider.bankRaw * DEG) > 69.99) e.nBankClamped += 1;
    if (lt.tip > 0) e.nTip += 1;

    mark(e, 'tipBind', lt.tip > 0);
    mark(e, 'coneBind', lt.slip > 0);
    mark(e, 'flightBind', lt.flight > 0);
    mark(e, 'impactBind', lt.impact > 0);
    mark(e, 'roll20', Math.abs(roll) > 20);
    mark(e, 'bank20', Math.abs(bank) > 20);
    mark(e, 'mismatch11', Math.abs(mismatch) > 10.9);
    mark(e, 'mismatchPast', Number.isFinite(tol) && Math.abs(mismatch) > tol);
    mark(e, 'overhang5cm', Math.hypot(outX, outZ) > 0.05);
    mark(e, 'swing20Nm', Math.abs(swingT) > 20);
    mark(e, 'swingSat', Math.abs(swingT) >= SWING_TORQUE - 1e-6);
    mark(e, 'hipFired', hipPast !== 0);
    mark(e, 'reliefOn', relief !== 0);
    mark(e, 'relief5cm', Math.abs(relief) > 0.05);
    mark(e, 'offPlane', rider.leanProbe.planing === 0);
    mark(e, 'marginLow', rider.balanceMargin < 0.1);
    mark(e, 'bankClamped', Math.abs(rider.bankRaw * DEG) > 69.99);
  }

  e.lastRoll = roll;
  e.kept += 1;
  emit(row);

  if (off) {
    e.done = true;
    e.fellAt = e.frame;
    e.cause = rider.separation ?? '?';
  } else if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
}

/** A PLAIN median: the mean of the two middle elements at even length. `qt(v, 0.5)` here is the upper middle and is used nowhere. */
function median(v: number[]): number {
  if (v.length === 0) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const peakAbs = (v: number[]): number => (v.length ? Math.max(...v.map(Math.abs)) : Number.NaN);

function makeRun(cell: Record<string, unknown>, made: { board: BoardBody; rider: AttachedRider }, water: SurfWater): Run {
  return {
    cell, board: made.board, rider: made.rider, water,
    frame: 0, done: false, fellAt: null, cause: '', lastRoll: null, first: {}, kept: 0,
    mis: [], rolls: [], banks: [], reliefs: [], torques: [], tols: [], rollRates: [],
    nReliefNonZero: 0, nTorqueSat: 0, nReliefOverBound: 0, nOvershoot: 0, nBankClamped: 0, nTip: 0,
  };
}

function cellOf(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    arm: ARM, control: CONTROL ?? 'none', rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point',
    reach: REACH ?? 'ships', deepen: DEEPEN ?? 'ships', bankSw: BANK ?? 'ships', hipgain: HIPGAIN ?? 'derived', ...extra,
  };
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=grid — `FaceWater`: a slope and an entry speed, crossed, with the wave's height and celerity held.
// ---------------------------------------------------------------------------------------------------------------
function grid(): void {
  // The negative control is a PLANING board on flat water: off the plane a floating board cannot hold a standing
  // rider at all (step 3.5f), which is not a bank mismatch. 6 m/s, 0.5°, stick never touched.
  const speeds = CONTROL === 'neg' ? [6] : CONTROL === 'pos' ? [Math.max(...SPEEDS)] : SPEEDS;
  const slopes = CONTROL === 'neg' ? [0.5] : CONTROL === 'pos' ? [Math.max(...SLOPES)] : SLOPES;
  const stances = CONTROL ? ['tall' as Stance] : STANCES;
  const sticks = CONTROL === 'neg' ? [0] : CONTROL === 'pos' ? [1] : STICKS;
  for (const slope of slopes) {
    const water = new FaceWater({ depth: DEPTH, height: HEIGHT, slope, crestZ: 0, vertical: 'surface' });
    const z = water.front / 2;
    for (const speed of speeds) {
      for (const stance of stances) {
        for (const stick of sticks) {
          const made = placePair(water, 0, z, speed, stance, stick);
          if (made) runs.push(makeRun(cellOf({ mode: 'grid', slope, entry: speed, stance, stick }), made, water));
        }
      }
    }
  }
  for (const e of runs) {
    const face = e.water as FaceWater;
    const t0 = (face as unknown as { time: number }).time;
    while (!e.done) {
      stepRun(e);
      face.advance(STEP);
    }
    (face as unknown as { time: number }).time = t0;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=sea — the real Canyon as `?canyonWaves=true` builds it. His own spot.
// ---------------------------------------------------------------------------------------------------------------
function sea(): void {
  const SEED = Number(process.env.SEED ?? 1);
  const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
  const TRIALS = Number(process.env.TRIALS ?? 3);
  const GAP = Number(process.env.GAP ?? 1.5);
  const AHEAD = Number(process.env.AHEAD ?? 0.75);
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  const base = surfZoneConfigFor(settings, SEED, true);
  const config: SurfZoneConfig = { ...base, compute: 'cpu', canyonBed: 'b' };
  const wall = Date.now();
  const sim = new SurfZoneSimulation(config);
  const physical = PhysicalSurfWater.forSimulation(sim, undefined, 1);
  const focus = sim.breakPoint();
  // The Canyon seatbelt, read off the solver and printed: Canyon B is 400 × 451 = 180 400 and the default Canyon
  // 400 × 507 = 202 800. The bundle is run under a wrapper that prepends an OBJECT, never a bare string.
  const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
  emit({ mode: 'sea', note: 'seatbelt', arm: ARM, search: globalThis.location?.search ?? '(none)', grid: `${nx}x${nz}`, cells: nx * nz, spunUp: r((Date.now() - wall) / 1000, 2), focusX: r(focus.x, 3), focusZ: r(focus.z, 3) });

  const water: SurfWater = {
    sampleAt: (x, y, z, out) => physical.sampleAt(x, y, z, out),
    surfaceAt: (x, z) => physical.surfaceAt(x, z),
    addReaction: () => {},
    setSampleTime: (o: number) => physical.setSampleTime(o),
  };

  let placed = 0;
  let t = 0;
  const horizon = SECONDS + GAP * TRIALS + 2;
  while (t < horizon) {
    sim.step(STEP);
    t += STEP;
    if (placed < TRIALS && t >= GAP * (placed + 1)) {
      placed += 1;
      for (const entry of ENTRIES) {
        for (const stance of STANCES) {
          const made = placePair(water, focus.x, focus.z - AHEAD, entry, stance, STICKS[0]);
          if (made) runs.push(makeRun(cellOf({ mode: 'sea', trial: placed, entry, stance, stick: STICKS[0] }), made, water));
        }
      }
    }
    for (const e of runs) if (!e.done) stepRun(e);
  }
}

const started = Date.now();
if (MODE === 'sea') sea();
else grid();

for (const e of runs) {
  emit({
    summary: true, ...e.cell, probe: PROBE ? 'on' : 'off',
    frames: e.kept, fellAt: e.fellAt, fellT: e.fellAt === null ? null : r(e.fellAt * STEP, 4), cause: e.cause || null,
    // Plain medians and absolute peaks over the run's live frames.
    misMed: r(median(e.mis.map(Math.abs)), 3), misPeak: r(peakAbs(e.mis), 3),
    rollMed: r(median(e.rolls.map(Math.abs)), 3), rollPeak: r(peakAbs(e.rolls), 3),
    bankMed: r(median(e.banks.map(Math.abs)), 3), bankPeak: r(peakAbs(e.banks), 3),
    rollRateMed: r(median(e.rollRates), 2), rollRatePeak: r(peakAbs(e.rollRates), 2),
    reliefMed: r(median(e.reliefs.map(Math.abs)), 5), reliefPeak: r(peakAbs(e.reliefs), 5),
    torqueMed: r(median(e.torques.map(Math.abs)), 2), torquePeak: r(peakAbs(e.torques), 2),
    tolMed: r(median(e.tols), 3), tolPeak: r(peakAbs(e.tols), 3),
    // The controls' counts, so a share can never be read off an empty filter.
    nReliefNonZero: e.nReliefNonZero, nTorqueSat: e.nTorqueSat, nReliefOverBound: e.nReliefOverBound, nOvershoot: e.nOvershoot,
    nBankClamped: e.nBankClamped, nTip: e.nTip,
    first: e.first,
  });
}
emit({
  done: true, mode: MODE, arm: ARM, control: CONTROL ?? 'none', probe: PROBE ? 'on' : 'off',
  runs: runs.length, fell: runs.filter((e) => e.fellAt !== null).length, seconds: r((Date.now() - started) / 1000, 2),
});
