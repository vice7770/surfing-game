/**
 * **The merge bench for PR #426 (`claude/ride-all-three`): one script that measures `?armCarry`, `?trunk` and
 * `?bodyBank` alone, in pairs and all three, and proves a merge changed nothing.** Build and run it like `bank.ts`:
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/merge-bench.ts -o <s>/raw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <s>/bench.mjs   # an OBJECT, never a string
 *     cat <s>/raw.mjs >> <s>/bench.mjs
 *     cd <s> && env MODE=sea ARMCARRY=on TRUNK=mass BANK=hip OUT=<s>/out.jsonl node --max-old-space-size=3200 bench.mjs
 *     python3 -I docs/research/new-rider/3.5/table.py <s>/out.jsonl        # the combination table
 *     python3 -I docs/research/new-rider/3.5/compare.py <a>.jsonl <b>.jsonl  # two arms, value by value
 *
 * ---
 *
 * ## ☠️ TWO TRAPS, BOTH OF WHICH PRINT A CLEAN-LOOKING ANSWER WHILE BEING WRONG
 *
 * **1. In zsh, `SECONDS=<x> node bench.mjs` goes through zsh's own special INTEGER variable. `4` survives as `"4"`,
 * but `0.5` arrives as `"0"`, every run ends at frame 1, and the bench still prints a tidy summary with no error.
 * Use `env SECONDS=…`.** Measured in zsh 5.9: `SECONDS=0.5 node -e '…'` prints `"0"`, `env SECONDS=0.5` prints
 * `"0.5"`. **Published 4-second benches are unaffected** — the default here is 4 and an integer survives the trip —
 * so this bites only a sub-second horizon, and it bites silently. Every `env` invocation above is deliberate.
 *
 * **2. "CoP-pinned 52.0 %" is `limitTime.tip > 0`, the step's decaying memory — NOT `limit === 'tip'`, which reads
 * 16.50 % on the same file.** `limit` is ONE substep of 32 and the step keeps only the last. Anyone re-measuring the
 * pinned share off `limit` would publish a third of #421's figure and conclude the bench was broken. `table.py`
 * prints both, as `pinned%` (the published quantity) and `pinNow%` (the demanded centre of pressure outside the
 * support box right now, 17.12 % on `ships`).
 *
 * ---
 *
 * One script, run unchanged at five commits (main,
 * `claude/arm-channel`, `claude/trunk-mass-3-5h`, `claude/body-banks` and the combined branch), so that "each switch
 * alone reproduces its own branch" and "the default is still main" are file comparisons and not readings of prose.
 *
 * It is `3.5/bank.ts`'s own rig — the same flush placement, the same `SINK`, the same frozen window at the first
 * `attached == 0`, the same Canyon seatbelt printed off the solver — widened to emit **every column the three
 * switches can possibly move**, so that a merge that changed something has somewhere to show up:
 *
 *  * the board's own state: position, orientation (4), velocity, angular velocity — 13 numbers;
 *  * the rider's dynamics: `bank`, `bankRaw`, `swing`, `contact` (force, centre of pressure, frontShare, weight,
 *    load, feasible), the support box, `balanceMargin`, `rawMargin`, `captureLoad`, `leanProbe`, `limit`,
 *    `limitTime`, `inContact`, `attached`, `upright`, `phase`;
 *  * `?trunk=mass`'s own channel: the 21 part coordinates, `localCenter`, `trunkFold` and `standingBody.hip`;
 *  * `?bodyBank=hip`'s own channel: `copRelief`, `copMoment`, `swingTorque`, `desiredCop`;
 *  * `?armCarry=on`'s own channel, which is **drawing only** and therefore invisible in every column above: the
 *    seven `renderPoint`s (21 numbers) and `armCarriage`.
 *
 * Options are passed through one `as` cast, exactly as `bank.ts` does, so the same file bundles at a commit where a
 * given option does not exist yet — and an option a commit has never heard of is simply ignored by the class, which
 * is what makes "the same bench at both commits" meaningful.
 *
 * Env: `MODE=grid|sea`, `ARMCARRY=on|rest`, `TRUNK=mass`, `BANK=hip`, `SINK`, `SEED`, `SECONDS`, `OUT`, and the rest
 * of `bank.ts`'s cell knobs. The owner's own address is `RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on`, which is
 * the default here.
 *
 * `MODE=grid` is the deterministic `FaceWater` cross (3 slopes × 4 entry speeds × 3 stances = 36 runs, no seed) used
 * for the bit-for-bit proofs; `MODE=sea` is the real Canyon on his own spot (90 riders, seatbelt **400 × 451 =
 * 180 400**) used for the combination table. **`SINK` defaults to 0.06 and must stay there**: the flush placement
 * starts the hull dry and the leg unloaded.
 *
 * ⚠️ **The copy that produced PR #426's numbers ran from the worktree root**, so its eight imports read `./src/…`
 * where this one reads `../../../../src/…`. **That import prefix is the only difference**, and `docs/` is outside
 * `tsconfig.json`'s `include` and `vitest.config.ts`'s globs, so this file is neither type-checked nor run by the
 * suites — exactly as `bank.ts` and `trunk.ts` beside it.
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

const MODE = (process.env.MODE ?? 'grid') as 'grid' | 'sea';
const RIDER = (process.env.RIDER ?? 'new') as 'old' | 'new';
const FELT = (process.env.FELT ?? 'deck') as 'deck' | undefined;
const BODY = (process.env.BODY ?? 'two') as 'two' | undefined;
const REACH = (process.env.REACH ?? 'keep') as 'keep' | undefined;
const DEEPEN = (process.env.DEEPEN ?? 'on') as 'on' | undefined;
/** The three switches under test. Absent = the shipped default, which is the whole point of arm "ships". */
const ARMCARRY = process.env.ARMCARRY as 'on' | 'rest' | undefined;
const TRUNK = process.env.TRUNK as 'mass' | undefined;
const BANK = process.env.BANK as 'hip' | undefined;
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
/** ⚠️ The flush placement starts the hull DRY and the leg UNLOADED. 0.06 and nothing else. */
const SINK = Number(process.env.SINK ?? 0.06);

type Stance = 'tall' | 'crouch' | 'compress';

/**
 * ⚠️ **Rounding is the enemy of a bit-for-bit claim**, so nothing here is rounded: every number is emitted at full
 * precision and the comparison is exact. `null` stands in for a non-finite value so the column still exists.
 */
const v = (x: number): number | null => (Number.isFinite(x) ? x : null);
const emit = (line: unknown): void => {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
};
/** The one read of a field TypeScript calls private. It only gets. */
const peek = (o: unknown, k: string): number => (o as Record<string, number>)[k];
const peekS = (o: unknown, k: string): string => (o as Record<string, string>)[k];
const peekO = (o: unknown, k: string): Record<string, number> => (o as Record<string, Record<string, number>>)[k];

/** The arm's name: which of the three switches this run has on, in the branches' own order. */
const ARM = [ARMCARRY ? `arm-${ARMCARRY}` : '', TRUNK ? 'trunk' : '', BANK ? 'bank' : ''].filter(Boolean).join('+') || 'ships';

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
  kept: number;
  rolls: number[];
  rollRates: number[];
  /** Frames in which the demanded centre of pressure was clamped at the support's edge (`limit === 'tip'`). */
  nPinned: number;
  nTipEver: number;
}
const runs: Run[] = [];

const scratch = createWaterSample();
const scratch2 = createWaterSample();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
const drawn = new Vector3();

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
    ...(ARMCARRY ? { armCarry: ARMCARRY } : {}),
    ...(TRUNK ? { trunk: TRUNK } : {}),
    ...(BANK ? { bodyBank: BANK } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rd);
  rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rd.compress = stance === 'compress' ? 1 : 0;
  rd.steer = stick;
  return { board, rider: rd };
}

function stepRun(e: Run): void {
  const { board, rider, water } = e;
  e.frame += 1;
  board.step(STEP, water);
  const off = !rider.attached;

  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;

  const lt = peekO(rider, 'limitTime');
  const want = peekO(rider, 'desiredCop');
  const sup = rider.support;
  const row: Record<string, unknown> = {
    ...e.cell, frame: e.frame, off: off ? 1 : 0,
    // --- the board, 13 numbers
    px: v(board.position.x), py: v(board.position.y), pz: v(board.position.z),
    qx: v(board.orientation.x), qy: v(board.orientation.y), qz: v(board.orientation.z), qw: v(board.orientation.w),
    vx: v(board.velocity.x), vy: v(board.velocity.y), vz: v(board.velocity.z),
    wx: v(board.angularVelocity.x), wy: v(board.angularVelocity.y), wz: v(board.angularVelocity.z),
    roll: v(roll),
    // --- the rider's dynamics
    rx: v(rider.position.x), ry: v(rider.position.y), rz: v(rider.position.z),
    bankA: v(rider.bank.angle), bankR: v(rider.bank.rate), bankRaw: v(rider.bankRaw),
    swingA: v(rider.swing.angle), swingR: v(rider.swing.rate), swingT: v(peek(rider, 'swingTorque')),
    fx: v(rider.contact.force.x), fy: v(rider.contact.force.y), fz: v(rider.contact.force.z),
    copX: v(rider.contact.centreOfPressure.x), copY: v(rider.contact.centreOfPressure.y), copZ: v(rider.contact.centreOfPressure.z),
    front: v(rider.contact.frontShare), weight: v(rider.contact.weight), load: v(rider.contact.load),
    feasible: rider.contact.feasible ? 1 : 0,
    supXMin: v(sup.xMin), supXMax: v(sup.xMax), supZMin: v(sup.zMin), supZMax: v(sup.zMax),
    margin: v(rider.balanceMargin), rawMargin: v(peek(rider, 'rawMargin')), capture: v(rider.captureLoad),
    leanCap: v(rider.leanProbe.cap), leanAsk: v(rider.leanProbe.ask), leanSpeed: v(rider.leanProbe.speedThrough),
    planing: rider.leanProbe.planing, leanWant: v(rider.leanProbe.want), leanHeld: v(rider.leanProbe.held), leanRadius: v(rider.leanProbe.radius),
    limit: peekS(rider, 'limit'), tTip: v(lt.tip), tSlip: v(lt.slip), tFlight: v(lt.flight), tImpact: v(lt.impact),
    wantX: v(want.x), wantZ: v(want.z),
    inContact: rider.inContact ? 1 : 0, attached: rider.attached ? 1 : 0, upright: rider.upright ? 1 : 0,
    phase: peekS(rider, 'phase'), sep: rider.separation ?? null,
    hipPast: v(rider.human.state.hipPast),
    // --- `?trunk=mass`'s own channel
    trunkFold: v(rider.trunkFold ?? Number.NaN), hipAngle: v(rider.standingBody.hip.angle), hipRate: v(rider.standingBody.hip.rate),
    hipTorque: v(rider.standingBody.hip.torque),
    lcx: v(peekO(rider, 'localCenter').x), lcy: v(peekO(rider, 'localCenter').y), lcz: v(peekO(rider, 'localCenter').z),
    // --- `?bodyBank=hip`'s own channel
    relief: v(rider.copRelief ?? Number.NaN), copNm: v(rider.copMoment ?? Number.NaN),
  };
  // --- the 21 part coordinates (`?trunk=mass` moves these and nothing else does)
  for (let i = 0; i < 7; i += 1) {
    row[`p${i}x`] = v(rider.parts[i * 3]);
    row[`p${i}y`] = v(rider.parts[i * 3 + 1]);
    row[`p${i}z`] = v(rider.parts[i * 3 + 2]);
  }
  // --- the 21 DRAWN points: `?armCarry` is drawing only and lives here alone.
  for (let i = 0; i < 7; i += 1) {
    rider.renderPoint(i, board, drawn);
    row[`d${i}x`] = v(drawn.x);
    row[`d${i}y`] = v(drawn.y);
    row[`d${i}z`] = v(drawn.z);
  }
  const car = (rider as unknown as { armCarriage?: { reach: number; over: number; inside: number } }).armCarriage;
  row.carReach = car ? v(car.reach) : null;
  row.carOver = car ? v(car.over) : null;
  row.carInside = car ? v(car.inside) : null;

  e.rolls.push(roll);
  if (e.lastRoll !== null) e.rollRates.push(Math.abs((roll - e.lastRoll) / STEP));
  if (peekS(rider, 'limit') === 'tip') e.nPinned += 1;
  if (lt.tip > 0) e.nTipEver += 1;
  e.lastRoll = roll;
  e.kept += 1;
  emit(row);

  if (off) {
    e.done = true;
    e.fellAt = e.frame;
    e.cause = rider.separation ?? '?';
  } else if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
}

/** A PLAIN median: the mean of the two middle elements at even length. */
function median(x: number[]): number {
  if (x.length === 0) return Number.NaN;
  const s = [...x].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const peakAbs = (x: number[]): number => (x.length ? Math.max(...x.map(Math.abs)) : Number.NaN);

function makeRun(cell: Record<string, unknown>, made: { board: BoardBody; rider: AttachedRider }, water: SurfWater): Run {
  return {
    cell, board: made.board, rider: made.rider, water,
    frame: 0, done: false, fellAt: null, cause: '', lastRoll: null, kept: 0,
    rolls: [], rollRates: [], nPinned: 0, nTipEver: 0,
  };
}

function cellOf(extra: Record<string, unknown>): Record<string, unknown> {
  return { arm: ARM, ...extra };
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=grid — `FaceWater`: a slope and an entry speed, crossed. Deterministic, no solver, no seed.
// ---------------------------------------------------------------------------------------------------------------
function grid(): void {
  for (const slope of SLOPES) {
    const water = new FaceWater({ depth: DEPTH, height: HEIGHT, slope, crestZ: 0, vertical: 'surface' });
    const z = water.front / 2;
    for (const speed of SPEEDS) {
      for (const stance of STANCES) {
        for (const stick of STICKS) {
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
// MODE=sea — the real Canyon as `?canyonWaves=true` builds it. The owner's own spot.
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
  // The Canyon seatbelt, read off the SOLVER and printed: Canyon B is 400 x 451 = 180 400.
  const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
  emit({ mode: 'sea', note: 'seatbelt', arm: ARM, search: globalThis.location?.search ?? '(none)', grid: `${nx}x${nz}`, cells: nx * nz, spunUp: (Date.now() - wall) / 1000, focusX: focus.x, focusZ: focus.z });

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
    summary: true, ...e.cell,
    frames: e.kept, fellAt: e.fellAt, fellT: e.fellAt === null ? null : e.fellAt * STEP, cause: e.cause || null,
    rollMed: v(median(e.rolls.map(Math.abs))), rollPeak: v(peakAbs(e.rolls)),
    rollRateMed: v(median(e.rollRates)), rollRatePeak: v(peakAbs(e.rollRates)),
    nPinned: e.nPinned, nTipEver: e.nTipEver, pinnedShare: e.kept > 0 ? e.nPinned / e.kept : null,
  });
}
emit({
  done: true, mode: MODE, arm: ARM, sink: SINK,
  runs: runs.length, fell: runs.filter((e) => e.fellAt !== null).length,
  ride: v(median(runs.map((e) => (e.fellAt === null ? SECONDS : e.fellAt * STEP)))),
  tipRuns: runs.filter((e) => e.nTipEver > 0).length,
  pinned: runs.reduce((a, e) => a + e.nPinned, 0), live: runs.reduce((a, e) => a + e.kept, 0),
  rollPeakMed: v(median(runs.map((e) => peakAbs(e.rolls)))),
  seconds: (Date.now() - started) / 1000,
});
