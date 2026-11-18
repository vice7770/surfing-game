/**
 * **The save window — a palm on the deck when the stance goes (`?saveHands=deck`), and the probe that measures it.**
 *
 * The gap this is aimed at, in the owner's own words: *"go build the save window"*. The footage behind it is clip 20
 * (`3.5/video-ref-20-the-re-stand.md`), **one instance, read on 27 consecutive native frames**: a rider loses his
 * stance at ≈4.97 s, is chest-down over his own board with his hips above his shoulders at 5.4186, his **hands leave
 * the deck at 5.70 ± 0.05** and he is **standing and riding again at 5.9022** — **lost → tall 0.93 ± 0.06 s** — and in
 * five gridded frames spanning the whole loss **neither hand ever reaches his own shoulder line.** He answers with
 * both hands AT THE DECK. ⚠️ **That is a population of one** and every comparison below says so.
 *
 * The mechanism is `3.5/board-slips-away.md`'s, measured there (PR #419) and not re-argued here:
 *
 * > *the line from the centre of mass to the deck leaves the 0.260 m foot support, the centre of pressure pins at the
 * > support edge (`limit = 'tip'`, 90 of 90 riders), and the contact can no longer put force where the body needs it.*
 *
 * **A hand on the deck extends the support polygon**, which acts on that mechanism directly rather than dodging it.
 *
 * ## ☠️ What this must NOT be, and what it therefore is
 *
 * **No clock stands the rider up.** `uprightVelocity` was a kinematic prescription and step 3.2y retired its whole
 * benchmark; PR #215 was rejected for inventing a moment with no limb behind it. So this round builds **the contact
 * and not the outcome**: the palm reaches the deck, and whether the body comes back is the solve's business.
 *
 * Concretely, the switch adds **no force, no torque, no drive and no constant of its own.** It widens, while a palm is
 * actually on the deck and only as far as that palm's own strength allows, **the box the existing paired contact
 * impulse's line of action may meet the deck inside** (`project`), and it credits the capture point with the same
 * distance as reach it can still catch past the feet (`captureStep`). Every newton still arrives through the one
 * contact pair the engine already has: `project` returns the impulse on the rider and `pushBoard` applies its exact
 * negative to the board **along the same line** (the identity is checked in `saveHands.test.ts`).
 *
 * ⚠️ **It is a DRY DECK contact, not a hand in the water.** The hand-water force (`applyWater`, engine-target row 19)
 * is untouched and this feature adds nothing to `waterMoment`. The two forces have different normals, frames and
 * denominators and are logged separately below (`press` against `handF`).
 *
 * ## The arms
 *
 * | arm | env | what it is |
 * |---|---|---|
 * | **ships** | (none) | the owner's own address, byte for byte. Every number is read against it |
 * | **deck** | `SAVE=deck` | the palm lands on the dry deck and loads |
 * | **miss** | `SAVE=miss` | ⭐ **the clear-deck miss**: the whole reach runs — trigger, travel, geometry, telemetry — and **the deck is treated as absent**, so nothing is extended. **It must be bit-identical to `ships`**, which is this round's own default-unchanged proof, and the difference `deck − miss` is the deck contact ALONE. Neither arm asserts that the rider should get up |
 *
 * ## ☠️ What a broken result would look like, and the controls that catch it
 *
 * 1. **`tTip` zero on the `ships` arm** would mean the detector is broken (`tip` fired in 90 of 90 turning riders in
 *    PR #419). Every bind here is read off `limitTime`, never off `limit`, which is **one substep of 32**.
 * 2. **`miss` differing from `ships` in any value** would mean the gate leaks. `MODE=cmp` compares two dumps value by
 *    value.
 * 3. **`press` non-zero on `ships` or `miss`** would mean the palm's load is being read where no palm is down.
 *    Reported as a count.
 * 4. **A filter emptied by a comparison against `NaN`** — this track's own published zero. Every threshold is
 *    `Number.isFinite(x) && …` and every share is printed beside its count.
 * 5. ⛔ **The exposed centre-of-pressure column is NOT used as the mechanism test.** On unchanged `main` the
 *    arithmetic makes it the CLIPPED point by construction (`tx = (local.x − copX)·normal/height` then
 *    `cx = local.x − height·tx/normal` ⇒ `cx ≡ copX` short of friction saturation), so it **cannot report an unpinned
 *    demand and cannot fail.** `tip` is the mechanism test. The four meanings are kept apart in every row: the **raw
 *    demand** (`wantX/wantZ`, `desiredCop`), the **clipped support** point (`clipX/clipZ`, recomputed here), the
 *    **post-friction effective line** (`copX`, the exposed column) and the **actual load** (`load`, `press`).
 * 6. **The probe is inert:** `PROBE=off` runs the same bench with every extra read-out gone and `MODE=cmp` compares
 *    the shared columns bit for bit.
 *
 * ## The frozen window
 *
 * `AttachedRider.separate` (`:5227–5232`) sets `attached` / `climbing` / `inContact` / `separation` and **never
 * `phase` or `upright`**, so every rider column freezes afterwards. **Every run is cut at its first `attached == 0`,
 * that frame emitted and nothing after it read**, and the kept count is in every summary. This matters more here than
 * usual: the feature lives exactly at separation.
 *
 * ## ⚠️ `SINK=0.06`
 *
 * The flush placement every rig in this track uses starts the hull **dry** and the leg **unloaded** (frame 1 dry in
 * 480 of 480 runs; 0.0611 m / 678.6 N / 0 of 72 dry with `SINK=0.06` against 0.00024 m / 604.7 N / 30 of 72 without,
 * and 68 of 72 outcomes differ). **Every bench below sets it.**
 *
 * ## Running it
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/save.ts -o <s>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <s>/save.mjs   # an OBJECT, never a string
 *   cat <s>/raw.mjs >> <s>/save.mjs
 *
 * `MODE=sea` prints the grid it got off the solver on its first line, which must read `400x451 = 180400` for Canyon B
 * (the default Canyon is 400 × 507 = 202 800), and the CPU spin-up's own seconds.
 *
 * Env: `MODE=grid|sea|cmp`, `SAVE=deck|miss`, `RIDER`, `FELT`, `BODY`, `REACH`, `DEEPEN`, `SPEEDS`, `SLOPES`,
 * `STANCES`, `STICKS`, `ENTRIES`, `SECONDS`, `HEIGHT`, `DEPTH`, `SIDE`, `SEED`, `SIZE`, `TRIALS`, `GAP`, `AHEAD`,
 * `SINK`, `PROBE=on|off`, `OUT`, `A`, `B` (the two dumps `MODE=cmp` compares).
 */
import { appendFileSync, readFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { AttachedRider, RECOVERABLE_ERROR } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { PhysicalSurfWater } from '../../../../src/physics/PhysicalSurfWater';
import { deckHeight } from '../../../../src/physics/riderPosture';
import { createWaterSample, type SurfWater } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** The engine's own hand-force cap, re-stated so `press` can be read against it: HAND_FORCE_LIMIT × m g. */
const HAND_FORCE_LIMIT = 0.4;

const MODE = (process.env.MODE ?? 'grid') as 'grid' | 'sea' | 'cmp';
const RIDER = (process.env.RIDER ?? 'new') as 'old' | 'new';
const FELT = process.env.FELT as 'deck' | undefined;
const BODY = process.env.BODY as 'two' | undefined;
const REACH = process.env.REACH as 'keep' | undefined;
const DEEPEN = process.env.DEEPEN as 'on' | undefined;
/** The switch itself. */
const SAVE = process.env.SAVE as 'deck' | 'miss' | undefined;
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
const peekV = (o: unknown, k: string): Vector3 => (o as Record<string, Vector3>)[k];

const ARM = SAVE ?? 'ships';

interface Run {
  cell: Record<string, unknown>;
  board: BoardBody;
  rider: AttachedRider;
  water: SurfWater;
  frame: number;
  done: boolean;
  fellAt: number | null;
  cause: string;
  first: Record<string, number>;
  kept: number;
  /** Per-run series, for plain medians and peaks. */
  outXs: number[];
  outZs: number[];
  spanXs: number[];
  spanZs: number[];
  gaps: number[];
  presses: number[];
  handFs: number[];
  loads: number[];
  /** Counts. */
  nTip: number;
  nTipX: number;
  nTipZ: number;
  nDown: number;
  nPress: number;
  nCanReach: number;
  nCleared: number;
  /** Windows: a palm-down run of frames, and what it ended as. */
  windows: number[];
  windowOn: number;
  windowsCleared: number;
  /** The exit's own conditions at the last live frame. */
  exit: Record<string, unknown>;
  prev: Record<string, unknown> | null;
}
const runs: Run[] = [];

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
    ...(SAVE ? { saveHands: SAVE } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rd);
  rd.crouch = stance === 'crouch' ? 1 : stance === 'compress' ? 0.6 : 0;
  rd.compress = stance === 'compress' ? 1 : 0;
  rd.steer = stick;
  return { board, rider: rd };
}

const scratch = createWaterSample();
const fwd = new Vector3();
const sideV = new Vector3();
const boardUp = new Vector3();
const offL = new Vector3();
const shoulderW = new Vector3();
const shoulderL = new Vector3();
const palmL = new Vector3();
const carriedW = new Vector3();
const carriedL = new Vector3();

function mark(e: Run, key: string, held: boolean): void {
  if (held && e.first[key] === undefined) e.first[key] = e.frame;
}

function median(v: number[]): number {
  if (v.length === 0) return Number.NaN;
  const s = [...v].sort((a, b) => a - b);
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
const peakAbs = (v: number[]): number => (v.length ? Math.max(...v.map(Math.abs)) : Number.NaN);

function stepRun(e: Run): void {
  const { board, rider, water } = e;
  e.frame += 1;
  board.step(STEP, water);
  const off = !rider.attached;

  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;

  const row: Record<string, unknown> = {
    ...e.cell, frame: e.frame, t: r(e.frame * STEP, 4), off: off ? 1 : 0,
    speed: r(board.velocity.length(), 4), roll: r(roll, 3),
  };

  if (PROBE) {
    const support = rider.support;
    const midX = (support.xMin + support.xMax) / 2;
    const midZ = (support.zMin + support.zMax) / 2;
    board.toLocal(rider.position, offL);
    const lt = peek(rider, 'limitTime') as unknown as Record<string, number>;
    const limit = peekS(rider, 'limit');
    const want = peek(rider, 'desiredCop') as unknown as { x: number; z: number };

    /**
     * ⭐ **WHICH AXIS THE DEMAND ESCAPES ON — the question a deck palm's value turns on.** `outX` and `outZ` are how
     * far the RAW DEMAND (`desiredCop`, the free line of action's meeting point) lies outside the feet's own support
     * on each axis, m. A palm on the deck can extend the support ACROSS by at most
     * `halfWidth − 0.130 m` — the palm's PATCH EDGE at the rail (≈0.102 m on this board) — and ALONG by the whole deck, so the two are not
     * interchangeable and the shares below decide what the feature can reach.
     */
    const outX = Math.max(0, Math.max(support.xMin - want.x, want.x - support.xMax));
    const outZ = Math.max(0, Math.max(support.zMin - want.z, want.z - support.zMax));
    // The CLIPPED support point, recomputed here: the raw demand clamped into the support. Kept apart from `copX`.
    const clipX = Math.min(support.xMax, Math.max(support.xMin, want.x));
    const clipZ = Math.min(support.zMax, Math.max(support.zMin, want.z));

    const st = rider.human.state;
    const load = rider.contact.load;

    /**
     * **The palm's own geometry, computed here the same way the engine does** (so the `ships` arm says whether a hand
     * could have reached the deck at all, with nothing built): the shoulder out from the hips along the bent upper
     * body — `HAND_TORSO` at `HAND_TORSO_ANGLE` from the body's own up and across, `standingHand`'s own construction —
     * then the nearest point of the DECK to it, and the straight-line distance between the two against `ARM_LENGTH`.
     */
    const up = peekV(rider, 'up');
    const across = peekV(rider, 'across');
    const sign = Math.sign(want.x - midX) || 1;
    rider.partPosition(0, shoulderW).addScaledVector(up, 0.55 * Math.cos((60 * Math.PI) / 180))
      .addScaledVector(across, sign * 0.55 * Math.sin((60 * Math.PI) / 180));
    board.toLocal(shoulderW, shoulderL);
    const shape = board.shape;
    const pz = Math.min(shape.length / 2 - 0.08, Math.max(-shape.length / 2 + 0.08, shoulderL.z));
    // ⚠️ `curves.width` is the FULL width (0.464 m here), so the half-beam is half of it. This probe's first build
    // used it unhalved and read a 0.254 m across span where the deck allows 0.102 m.
    const hw = Math.max(0, shape.curves.width(Math.min(1, Math.max(0, pz / shape.length + 0.5))) / 2 - 0.08);
    const px = Math.min(hw, Math.max(-hw, shoulderL.x));
    palmL.set(px, deckHeight(shape, pz) + 0.08, pz);
    const reachNeeded = shoulderL.distanceTo(palmL);
    const canReach = reachNeeded <= 0.7;
    // ⭐ The TRAVEL, which is a different quantity from the REACH: the hand is carried `ARM_LENGTH` from the shoulder
    // down and out at `ARM_ANGLE` (`standingHand`'s own carriage), and that is where its journey to the deck starts.
    carriedW.copy(shoulderW).addScaledVector(up, -0.7 * Math.cos((25 * Math.PI) / 180))
      .addScaledVector(across, sign * 0.7 * Math.sin((25 * Math.PI) / 180));
    board.toLocal(carriedW, carriedL);
    const travelNeeded = carriedL.distanceTo(palmL);
    // The palm's PATCH EDGE past the feet's own support edge, on the side the demand is escaping toward.
    const alongSign = Math.sign(want.z - midZ) || 1;
    const spanX = sign > 0 ? Math.max(0, px + 0.08 - support.xMax) : Math.max(0, support.xMin - (px - 0.08));
    const spanZ = alongSign > 0 ? Math.max(0, pz + 0.08 - support.zMax) : Math.max(0, support.zMin - (pz - 0.08));

    // The switch's own read-outs (0 everywhere off it, where `saveStep` never runs).
    const press = rider.savePress;
    const extX = rider.saveExtendX;
    const extZ = rider.saveExtendZ;
    const down = rider.saveDown;
    const engSpanX = rider.saveSpanX;
    const engSpanZ = rider.saveSpanZ;
    const window = rider.saveTime;
    const cleared = rider.saveCleared;
    const gap = peek(rider, 'saveGap');
    const handF = Math.hypot(rider.handLoad[0], rider.handLoad[1]);

    const sway = peekV(rider, 'sway');
    const postureError = peek(rider, 'postureError');
    const flightTime = peek(rider, 'flightTime');

    Object.assign(row, {
      bank: r(rider.bank.angle * DEG, 3), mismatch: r(rider.bank.angle * DEG - roll, 3),
      limitLast: limit, tTip: r(lt.tip, 5), tSlip: r(lt.slip, 5), tFlight: r(lt.flight, 5), tImpact: r(lt.impact, 5),
      // The four meanings, never standing in for one another.
      wantX: r(want.x, 5), wantZ: r(want.z, 5), clipX: r(clipX, 5), clipZ: r(clipZ, 5),
      copX: r(rider.contact.centreOfPressure.x, 5), copZ: r(rider.contact.centreOfPressure.z, 5),
      load: r(load, 4), legLoad: r(peek(rider, 'legLoad'), 2), capLoad: r(rider.captureLoad, 4),
      outX: r(outX, 5), outZ: r(outZ, 5), supX: r(support.xMax - support.xMin, 4), supZ: r(support.zMax - support.zMin, 4),
      offUp: r(offL.y, 4), offAcross: r(offL.x - midX, 4), offAlong: r(offL.z - midZ, 4),
      // The capture point (the balance's own fall test).
      capAcross: r(st.across, 5), capAlong: r(st.along, 5), capPast: r(st.past, 5),
      beyond: st.beyond ? 1 : 0, weightPast: st.weightPast ? 1 : 0, capMargin: r(st.margin, 4), capReach: r(st.reach, 5),
      fallen: rider.human.fallen ? 1 : 0,
      swayMag: r(Math.hypot(sway.x, sway.z), 5), postureError: r(postureError, 5), flightTime: r(flightTime, 4),
      // The palm, geometry then contact.
      shoulderUp: r(shoulderL.y - deckHeight(shape, shoulderL.z), 4), reachNeeded: r(reachNeeded, 4),
      canReach: canReach ? 1 : 0, travelNeeded: r(travelNeeded, 4), palmX: r(px, 4), palmZ: r(pz, 4), spanX: r(spanX, 5), spanZ: r(spanZ, 5),
      down: r(down, 0), gap: r(gap, 5), extX: r(extX, 5), extZ: r(extZ, 5),
      engSpanX: r(engSpanX, 5), engSpanZ: r(engSpanZ, 5), window: r(window, 4), clearedNow: r(cleared, 0),
      // ⚠️ The DRY-DECK palm load and the HAND-WATER force, separately: different forces, frames and denominators.
      press: r(press, 3), handF: r(handF, 4),
      inContact: rider.inContact ? 1 : 0,
    });

    e.outXs.push(outX);
    e.outZs.push(outZ);
    e.spanXs.push(spanX);
    e.spanZs.push(spanZ);
    e.gaps.push(reachNeeded);
    e.presses.push(press);
    e.handFs.push(handF);
    e.loads.push(load);
    if (lt.tip > 0) e.nTip += 1;
    if (outX > 0) e.nTipX += 1;
    if (outZ > 0) e.nTipZ += 1;
    if (canReach) e.nCanReach += 1;
    // ⚠️ `Number.isFinite` first on every switch read-out: off the switch these fields do not exist, and a bare
    // `press !== 0` counted `undefined` as a press in this probe's first build — 40 of 40 frames on the `ships` arm.
    if (Number.isFinite(down) && down > 0) {
      e.nDown += 1;
      e.windowOn += 1;
    } else if (e.windowOn > 0) {
      e.windows.push(e.windowOn);
      // A window that ended with the rider still attached and the demand back inside the feet is a CLEARED one.
      if (!off && outX === 0 && outZ === 0) e.windowsCleared += 1;
      e.windowOn = 0;
    }
    if (Number.isFinite(press) && press !== 0) e.nPress += 1;
    if (Number.isFinite(cleared) && cleared > 0) e.nCleared += 1;

    mark(e, 'tipBind', lt.tip > 0);
    mark(e, 'coneBind', lt.slip > 0);
    mark(e, 'flightBind', lt.flight > 0);
    mark(e, 'outX', outX > 0);
    mark(e, 'outZ', outZ > 0);
    mark(e, 'canReach', canReach);
    mark(e, 'palmDown', Number.isFinite(down) && down > 0);
    mark(e, 'pressed', Number.isFinite(press) && press !== 0);
    mark(e, 'clearedTip', Number.isFinite(cleared) && cleared > 0);
    mark(e, 'beyond', st.beyond);
    mark(e, 'fallen', rider.human.fallen);
    mark(e, 'roll20', Math.abs(roll) > 20);

    e.exit = {
      flight: flightTime > 0.4 ? 1 : 0,
      fallen: rider.human.fallen ? 1 : 0,
      sway: Math.hypot(sway.x, sway.z) > RECOVERABLE_ERROR ? 1 : 0,
      posture: postureError > RECOVERABLE_ERROR && limit !== 'none' ? 1 : 0,
      limit, tTip: r(lt.tip, 5), tSlip: r(lt.slip, 5),
    };
  }

  e.kept += 1;
  emit(row);
  if (PROBE) e.prev = { ...e.exit };

  if (off) {
    e.done = true;
    e.fellAt = e.frame;
    e.cause = rider.separation ?? '?';
  } else if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
}

function makeRun(cell: Record<string, unknown>, made: { board: BoardBody; rider: AttachedRider }, water: SurfWater): Run {
  return {
    cell, board: made.board, rider: made.rider, water,
    frame: 0, done: false, fellAt: null, cause: '', first: {}, kept: 0,
    outXs: [], outZs: [], spanXs: [], spanZs: [], gaps: [], presses: [], handFs: [], loads: [],
    nTip: 0, nTipX: 0, nTipZ: 0, nDown: 0, nPress: 0, nCanReach: 0, nCleared: 0,
    windows: [], windowOn: 0, windowsCleared: 0, exit: {}, prev: null,
  };
}

function cellOf(extra: Record<string, unknown>): Record<string, unknown> {
  return {
    arm: ARM, rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point',
    reach: REACH ?? 'ships', deepen: DEEPEN ?? 'ships', ...extra,
  };
}

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

/** `MODE=cmp`: two dumps, matched by (arm-free) key, compared value by value over their shared columns. */
function cmp(): void {
  const load = (p: string): Map<string, Record<string, unknown>> => {
    const m = new Map<string, Record<string, unknown>>();
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      if (!line) continue;
      const o = JSON.parse(line) as Record<string, unknown>;
      if (o.done || o.note) continue;
      m.set(`${o.summary ? 'S' : 'F'}|${o.mode}|${o.trial ?? 0}|${o.slope ?? 0}|${o.entry}|${o.stance}|${o.stick}|${o.frame ?? 0}`, o);
    }
    return m;
  };
  const a = load(process.env.A as string);
  const b = load(process.env.B as string);
  let compared = 0;
  let diffs = 0;
  let missing = 0;
  const cols = new Set<string>();
  const worst: Record<string, number> = {};
  for (const [k, ra] of a) {
    const rb = b.get(k);
    if (!rb) {
      missing += 1;
      continue;
    }
    for (const key of Object.keys(ra)) {
      if (key === 'arm' || !(key in rb)) continue;
      cols.add(key);
      compared += 1;
      if (ra[key] !== rb[key]) {
        diffs += 1;
        if (typeof ra[key] === 'number' && typeof rb[key] === 'number') {
          worst[key] = Math.max(worst[key] ?? 0, Math.abs((ra[key] as number) - (rb[key] as number)));
        } else worst[key] = Number.POSITIVE_INFINITY;
      }
    }
  }
  // The run outcomes on their own, which is the statement an inert probe and an unchanged default must both make.
  let outcomes = 0;
  let outcomeDiffs = 0;
  for (const [k, ra] of a) {
    if (!k.startsWith('S|')) continue;
    const rb = b.get(k);
    if (!rb) continue;
    outcomes += 1;
    if (ra.fellAt !== rb.fellAt || ra.cause !== rb.cause || ra.frames !== rb.frames) outcomeDiffs += 1;
  }
  emit({ cmp: true, rowsA: a.size, rowsB: b.size, matched: a.size - missing, missing, columns: cols.size, compared, diffs, outcomes, outcomeDiffs, worst });
}

const started = Date.now();
if (MODE === 'cmp') cmp();
else if (MODE === 'sea') sea();
else grid();

if (MODE !== 'cmp') {
  for (const e of runs) {
    emit({
      summary: true, ...e.cell, probe: PROBE ? 'on' : 'off',
      frames: e.kept, fellAt: e.fellAt, fellT: e.fellAt === null ? null : r(e.fellAt * STEP, 4), cause: e.cause || null,
      outXMed: r(median(e.outXs), 5), outXPeak: r(peakAbs(e.outXs), 5),
      outZMed: r(median(e.outZs), 5), outZPeak: r(peakAbs(e.outZs), 5),
      spanXMed: r(median(e.spanXs), 5), spanXPeak: r(peakAbs(e.spanXs), 5),
      spanZMed: r(median(e.spanZs), 5), spanZPeak: r(peakAbs(e.spanZs), 5),
      reachMed: r(median(e.gaps), 4), reachMin: e.gaps.length ? r(Math.min(...e.gaps), 4) : null,
      pressMed: r(median(e.presses.filter((v) => v !== 0)), 3), pressPeak: r(peakAbs(e.presses), 3),
      handFMed: r(median(e.handFs.filter((v) => v !== 0)), 4), handFPeak: r(peakAbs(e.handFs), 4),
      loadMed: r(median(e.loads), 4),
      nTip: e.nTip, nTipX: e.nTipX, nTipZ: e.nTipZ, nDown: e.nDown, nPress: e.nPress, nCanReach: e.nCanReach, nCleared: e.nCleared,
      windows: e.windows.length + (e.windowOn > 0 ? 1 : 0), windowFrames: e.nDown,
      windowMed: r(median(e.windows), 2), windowPeak: e.windows.length ? Math.max(...e.windows) : null,
      cleared: e.windowsCleared,
      exit: e.exit, prevExit: e.prev, first: e.first,
    });
  }
  emit({
    done: true, mode: MODE, arm: ARM, probe: PROBE ? 'on' : 'off', handCap: r(HAND_FORCE_LIMIT * 73 * 9.81, 1),
    runs: runs.length, fell: runs.filter((e) => e.fellAt !== null).length, seconds: r((Date.now() - started) / 1000, 2),
  });
}
