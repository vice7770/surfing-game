/**
 * **The board slips away from his feet — the probe.**
 *
 * The owner played and reported:
 *
 * > *"Im playing the new code, the surfer cannot keep himself on the board. He falls when the speed increases, the
 * > board sleeps away from his feet and he falls. Looks quite realistic, but unplayable"*
 *
 * (*"sleeps"* is *"slips"*.) He then said he played **`main`**, which is `1a29a6c7`. **`?rider=new` is opt-in**
 * [R, `PhysicalMode.riderSwitch`], so "plain `main`" and "`main` + his usual switches" are **two different riders**,
 * and which one reproduces decides whether the balance track of the last weeks is even aimed at the rider he rides.
 * **So `RIDER` is an arm here, never a setting.**
 *
 * ## What the contact actually is, read before anything was measured
 *
 * `AttachedRider.project` [R, `:5339`] is a Coulomb cone on the feet. For a standing rider it
 *
 *  1. caps the normal at the knees' strength — `limit = 'impact'`;
 *  2. clamps the centre of pressure into the foot support — `limit = 'tip'`;
 *  3. clamps the tangential into `FOOT_FRICTION · normal`, `FOOT_FRICTION = 0.9` [R, `:25`] — `limit = 'slip'`.
 *
 * Step 3 is **the board slipping under the feet**, by name, and `SEPARATION.slip = 'foot slip'` [R, `:1762`]. So the
 * owner's words name a code path that exists. **The cone's half-angle is `atan(0.9) = 41.99°`, and the body may ask
 * for up to `MAX_BANK = 70°` [R, `:474`].**
 *
 * ## The two channels this probe has to keep apart, and why neither alone is admissible
 *
 * **His trigger is SPEED. The board study (#285) found the contact makes 4–23 kW above roughly 26° upward or 30–38°
 * downward slope — a SLOPE finding.** On a real wave the two rise together: a faster rider is further up a steeper
 * face. **So the real sea cannot separate them and `MODE=grid` does not use it:** `FaceWater` takes `slope` as a free
 * parameter and the board's entry speed is set at placement, so **speed and slope are crossed by construction** with
 * the wave's own height and celerity held. `MODE=sea` then checks the grid's answer on his own spot.
 *
 * ## Modes
 *
 * - **`MODE=grid`** — `FaceWater`, `SPEEDS × SLOPES × STANCES × STICKS`, one rider arm per run. The discriminator.
 * - **`MODE=sea`** — the real Canyon as `?canyonWaves=true` builds it (`canyonBed: 'b'`), `ENTRIES` the sweep. His spot.
 * - **`MODE=probe`** — the probe's own A/B: the same bench with every extra read-out on and off, compared bit for bit.
 *
 * ## Controls, because a metric that cannot fail is worthless
 *
 * A broken probe here would read **`slips: 0` everywhere** (a column never written, a comparison against `NaN`, a
 * read of a frozen field), or **a constant** in a column that must move. So:
 *
 * - **`CONTROL=neg`** — flat water, 2 m/s, stick never touched. **The cone must never bind and the rider must stay on.**
 *   A probe reporting slip here is broken.
 * - **`CONTROL=pos`** — the steepest slope and the highest speed in the grid. **The cone must bind.** A probe
 *   reporting no slip here is broken.
 * - **The cone is read TWICE by two independent routes** and the two are printed side by side: `frictionUsed` (the
 *   class's own saturating ratio, read off the instance) and `coneTan`, which is `tan` of the angle between
 *   `contact.force` — a **public** mean force [R, `:1895`] — and the deck normal. **When the clamp binds, `coneTan`
 *   must sit at 0.900.** Neither is used alone as the discriminator, as the brief requires.
 * - **The frozen window.** `AttachedRider.separate` [R, `:5227`] sets `attached`/`climbing`/`inContact`/`separation`
 *   and **never `phase` or `upright`**, so every rider column freezes afterwards. **Every run is cut at its first
 *   `attached == 0`, that frame emitted and nothing after it read**, and the cut frame count is reported.
 *
 * ## Read-only
 *
 * **No byte under `src/` or `server/` is changed** — `git diff` against the merge base touches only `docs/`. No
 * ledger is turned on. The private fields this file reads (`frictionUsed`, `kneeUsed`, `rawMargin`, `limit`,
 * `legLoad`, `sway`) are read through one accessor that only gets, never sets; `MODE=probe` proves the reads are
 * inert by running the same bench with them on and off.
 *
 * Run from the repository's root. **`MODE=sea` needs the Canyon seatbelt PREPENDED to the bundle as an OBJECT** — a
 * bare string silently benches the default Canyon through `devTools.ts:9` — and the run's first line prints the grid
 * it got, which must read `400x451 = 180400` for Canyon B (the default Canyon is 400 × 507 = 202 800):
 *
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/slip.ts -o <scratch>/raw.mjs --format esm --platform node
 *   printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <scratch>/slip.mjs
 *   cat <scratch>/raw.mjs >> <scratch>/slip.mjs
 *
 * The runs this round's document rests on, in order:
 *
 *   # the controls, and the proof the probe is inert (0 differences over 81 575 values)
 *   MODE=grid CONTROL=neg RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on node <scratch>/slip.mjs
 *   MODE=grid CONTROL=pos RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on node <scratch>/slip.mjs
 *   for P in on off; do MODE=probe PROBE=$P RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on \
 *     SPEEDS=4,6,8,10 SLOPES=6,18,30 OUT=<scratch>/ab-$P.jsonl node <scratch>/slip.mjs; done
 *
 *   # speed CROSSED with slope (§2, §3): 480 runs
 *   MODE=grid SINK=0.06 RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on SLOPES=12,14,16,18,20 \
 *     SPEEDS=3,4,4.5,5,5.5,6,6.5,7,7.5,8,8.5,9,9.5,10,11,12 STICKS=0,1 SECONDS=5 OUT=<scratch>/T3.jsonl node <scratch>/slip.mjs
 *
 *   # `?legPower=cap` is a bit-for-bit NO-OP on his address (416 832 values, 0 differences)
 *   for L in "" cap; do MODE=grid SINK=0.06 RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on LEGPOWER=$L \
 *     SLOPES=12,16,20,26 SPEEDS=4,6,8,10 STICKS=0,1 OUT=<scratch>/LP-${L:-off}.jsonl node <scratch>/slip.mjs; done
 *
 *   # his own spot (§4 stick zero, §5 stick hard over): 90 riders each, ~2 min of spin-up apiece
 *   MODE=sea SINK=0.06 RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on \
 *     ENTRIES=2,3,4,5,6,7,8,9,10,12 STICKS=0 TRIALS=3 SECONDS=5 OUT=<scratch>/SEA-A.jsonl node <scratch>/slip.mjs
 *   MODE=sea SINK=0.06 RIDER=new FELT=deck BODY=two REACH=keep DEEPEN=on \
 *     ENTRIES=2,3,4,5,6,7,8,9,10,12 STICKS=1 TRIALS=3 SECONDS=5 OUT=<scratch>/SEA-STICK.jsonl node <scratch>/slip.mjs
 *
 * ⚠️ **`SINK=0.06` matters.** At the flush placement every rig in this track uses, the hull starts dry and the leg
 * unloaded, the pair needs a median 32 frames to become a ride, and 101 of 480 runs never got there. See `placePair`.
 *
 * Env: `MODE=grid|sea|probe`, `CONTROL=neg|pos`, `RIDER=old|new`, `FELT=deck`, `BODY=two`, `REACH=keep`, `DEEPEN=on`, `LEGPOWER=cap`, `SPEEDS`, `SLOPES`,
 * `STANCES`, `STICKS`, `ENTRIES`, `SECONDS`, `HEIGHT`, `DEPTH`, `SIDE`, `SEED`, `SIZE`, `TRIALS`, `GAP`, `AHEAD`, `SINK`,
 * `PROBE=on|off`, `OUT`.
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
/** `AttachedRider`'s own cone, re-stated so the read is legible beside the class [R, `:25`]. */
const FOOT_FRICTION = 0.9;

const MODE = (process.env.MODE ?? 'grid') as 'grid' | 'sea' | 'probe';
const CONTROL = process.env.CONTROL as 'neg' | 'pos' | undefined;
const RIDER = (process.env.RIDER ?? 'old') as 'old' | 'new';
const FELT = process.env.FELT as 'deck' | undefined;
const BODY = process.env.BODY as 'two' | undefined;
/**
 * **The owner's own two leg switches, which no bench in this track had ever run.** His address is
 * `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`.
 *
 * - `REACH=keep` → `stanceReach: 'keep'`: the hip's range and the arms are read at the **riding stance** whatever the
 *   leg's depth is (±1.2 rad instead of ±0.4 at Compress), the knees' travel left as the stance's own
 *   [R, `humanBalance.stanceRoom`]. It is a **stop** as well as a credit: `humanSwingStep` clamps the hip's real
 *   lateral swing to the range.
 * - `DEEPEN=on` → `deepen: 'on'`: full manual crouch reaches the tube tuck's **0.45 m anywhere** instead of the
 *   pumping crouch's share, and Compress does not fade it [R, `AttachedRider:4167`].
 *
 * Both change **how far and how freely the legs travel**, which is the contact's own geometry, so they are arms.
 */
/**
 * **`LEGPOWER=cap` → `legPower: 'cap'`, ruling 27's A-lite.** It **is built** — `legPowerSwitch`
 * [R, `PhysicalMode.ts:1083`], `SurfZoneConfig.legPower`, `RideSessionOptions.legPower` [R, `RideSession.ts:159`],
 * `AttachedRider`'s `capsLegs` [R, `:2500`] and the physics in `BoardBody` and `AttachedRider` — with its own study
 * at `docs/research/board-in-water/a-lite/`. It is **off by default and the owner has never ridden it**, so it is an
 * arm here, measured and not recommended.
 */
const LEGPOWER = process.env.LEGPOWER as 'cap' | undefined;
const REACH = process.env.REACH as 'keep' | undefined;
const DEEPEN = process.env.DEEPEN as 'on' | undefined;
const PROBE = (process.env.PROBE ?? 'on') === 'on';
const SECONDS = Number(process.env.SECONDS ?? 4);
const SIDE = Number(process.env.SIDE ?? -45);
const OUT = process.env.OUT;

const nums = (v: string | undefined, d: string): number[] => (v ?? d).split(',').map(Number);
const SPEEDS = nums(process.env.SPEEDS, '2,3,4,5,6,7,8,9,10,12');
const SLOPES = nums(process.env.SLOPES, '6,10,14,18,22,26,30');
const STICKS = nums(process.env.STICKS, '0');
const ENTRIES = nums(process.env.ENTRIES, '2,3,4,5,6,7,8,9,10,12');
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];
const HEIGHT = Number(process.env.HEIGHT ?? 1.4);
const DEPTH = Number(process.env.DEPTH ?? 6);
/** Metres below flush the pair is placed, so the hull starts at a draft rather than dry (see `placePair`). */
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

// ---------------------------------------------------------------------------------------------------------------
// One run: a board and a rider on one water, stepped until it comes off or the clock runs out.
// ---------------------------------------------------------------------------------------------------------------
interface Run {
  cell: Record<string, unknown>;
  board: BoardBody;
  rider: AttachedRider;
  water: SurfWater;
  frame: number;
  done: boolean;
  /** The frame the rider came off on, and what it was named. */
  fellAt: number | null;
  cause: string;
  /** Carried between frames for the rates. */
  lastWork: number;
  lastRoll: number | null;
  lastSpeed: number | null;
  /** The deck's own speed along its normal at the stance point last frame, for `demand`. */
  lastDeckUp: number | null;
  /** How long the hull has had no submerged patch, s, and the board's velocity last frame. */
  dry: number;
  lastVel: Vector3 | null;
  /** The deck's velocity at the stance point and the body's, last frame, for `feetG` / `riderG`. */
  lastDeckVel: Vector3 | null;
  lastRiderVel: Vector3 | null;
  /** The first frame each limit was seen binding, and the first frame each threshold was crossed. */
  first: Record<string, number>;
  /** Frames kept (live), and frames that would have been read after separation had the run not been cut. */
  kept: number;
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
  /**
   * **`SINK`, and why a flush placement is not a neutral choice.** `3.5/foam.ts` and `3.3/plant.ts` place the board
   * with its centre of mass one `shape.centerOfMass.y` along the surface normal, i.e. **the hull's bottom exactly ON
   * the water**, and the rider's leg at its rest length. Measured here, that start is **fully dry and unloaded on
   * frame 1 of every run** (`clear` +0.028 to +0.053 m), the pair then needed a median **32 frames (0.53 s)** to
   * reach a frame that was both wet and loaded, and **101 of 480 runs fell before they ever got there** — so a fifth
   * of that bench was never a ride and the rest spent half its life settling. `SINK` drops the placement by that many
   * metres along the normal so the hull starts at a draft, and the settling is reported with every number below.
   */
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
    ...(LEGPOWER ? { legPower: LEGPOWER } : {}),
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
const feetW = new Vector3();
const relV = new Vector3();
const offL = new Vector3();
const forceV = new Vector3();
const tmp = new Vector3();
const deckV = new Vector3();
const pW = new Vector3();

/** Mark the first frame a named condition held. */
function mark(e: Run, key: string, held: boolean): void {
  if (held && e.first[key] === undefined) e.first[key] = e.frame;
}

function stepRun(e: Run): void {
  const { board, rider, water } = e;
  e.frame += 1;
  board.step(STEP, water);

  // The live window: `separate` never clears `phase`/`upright`, so every rider column freezes. Cut here, emit this
  // frame, read nothing after it.
  const off = !rider.attached;

  fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
  sideV.set(fwd.z, 0, -fwd.x);
  boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
  const roll = Math.atan2(boardUp.dot(sideV), boardUp.y) * DEG;

  const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, scratch2);
  nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
  const tilt = Math.atan2(nW.dot(sideV), nW.y) * DEG;
  /**
   * **The water's own slope under the board, resolved ALONG THE TRAVEL** — the board study's channel. Positive is
   * uphill ahead of the board (climbing), negative is downhill (dropping). `atan` of the surface gradient dotted into
   * the heading, so it is the slope the board is actually driving into and not the face's nominal steepness.
   */
  const slopeAlong = Math.atan(-(cen.slopeX * fwd.x + cen.slopeZ * fwd.z)) * DEG;
  const slopeMax = Math.atan(Math.hypot(cen.slopeX, cen.slopeZ)) * DEG;

  /**
   * ☠️ **`demand` WAS MY PROPOSED PREDICTOR AND THE DATA REFUTED IT. It is kept, labelled, so that nobody builds on
   * it.** `project` returns flight when `j.y <= 0` [R, `:5348`] — the impulse the body needs along the DECK's own
   * normal is negative, i.e. the contact would have to **pull the body down onto the deck**, and feet can only push.
   * Writing the body's required acceleration as the deck's own at the stance point, that condition is
   *
   *     demand  =  a_deck·û  +  g (ŷ·û)   <  0
   *
   * where `û` is the deck normal: the deck accelerating down its own normal faster than gravity can carry the body
   * after it. **Measured over 32 100 frames it agrees with `limitTime.flight` only 64.3 % of the time, and only
   * 16.5 % of the frames actually in flight had `demand < 0`.** It fails for a reason worth keeping in mind for every
   * column in this file: **it is a difference over one frame and the contact's loss is a SUBSTEP event** (32 a frame).
   * *(The quantity it was reaching for is real: the board is 2.54 kg against the rider's 73 kg
   * [R, `boardReference.ts`], **28.7 : 1**, so the deck can be accelerated far harder than the body it carries. The
   * frame-rate read of it just cannot see it.)*
   */
  const speed3 = board.velocity.length();
  const through = Math.hypot(board.velocity.x - cen.flowX, board.velocity.z - cen.flowZ);

  const row: Record<string, unknown> = {
    ...e.cell, frame: e.frame, t: r(e.frame * STEP, 4), off: off ? 1 : 0,
    speed: r(speed3, 4), through: r(through, 4),
    accel: e.lastSpeed === null ? null : r((speed3 - e.lastSpeed) / STEP, 3),
    slopeAlong: r(slopeAlong, 3), slopeMax: r(slopeMax, 3),
    roll: r(roll, 3), rollRate: e.lastRoll === null ? null : r((roll - e.lastRoll) / STEP, 2),
    tilt: r(tilt, 3), rail: r(roll - tilt, 3),
  };

  // The deck's own velocity at the stance point, for `demand`. Taken before the extra reads so it is in both arms.
  board.toWorld(tmp.set((rider.support.xMin + rider.support.xMax) / 2, 0, (rider.support.zMin + rider.support.zMax) / 2), feetW);
  board.velocityAt(feetW, deckV);
  const upDotY = boardUp.y;
  const deckUpSpeed = deckV.dot(boardUp);
  const demand = e.lastDeckUp === null ? Number.NaN : (deckUpSpeed - e.lastDeckUp) / STEP + 9.81 * upDotY;
  /**
   * **The acceleration AT THE FEET**, g — the board study's 17–58 g throws. This is the deck's own acceleration at
   * the stance point, `|Δv_deck| / Δt / g`, which is what a foot standing there is thrown by; `riderG` is the body's
   * own for comparison. Both are frame differences over 1/60 s, so they are **frame means over 32 substeps and will
   * read LOWER than any substep peak** — which is why no figure here is offered as a refutation of #285's peaks.
   */
  const feetG = e.lastDeckVel === null ? Number.NaN : deckV.distanceTo(e.lastDeckVel) / STEP / 9.81;
  const riderG = e.lastRiderVel === null ? Number.NaN : rider.velocity.distanceTo(e.lastRiderVel) / STEP / 9.81;
  row.feetG = r(feetG, 3);
  row.riderG = r(riderG, 3);
  if (e.lastDeckVel === null) e.lastDeckVel = deckV.clone(); else e.lastDeckVel.copy(deckV);
  if (e.lastRiderVel === null) e.lastRiderVel = rider.velocity.clone(); else e.lastRiderVel.copy(rider.velocity);
  row.demand = r(demand, 3);
  row.deckUp = r(deckUpSpeed, 4);
  e.lastDeckUp = deckUpSpeed;
  /**
   * **Is the BOARD out of the water?** `clear` is the board's centre of mass above the local surface, m, less its own
   * height on the hull, so **positive means the hull has left the water**; `wet` counts how many of the hull's own
   * patches are still submerged, and `drySpell` how long none has been. This separates two very different readings of
   * *"the board slips away from his feet"*: a hull that **launches off the face** (no planing force at all, both
   * bodies ballistic) from a hull that stays **in** the water while the contact under the feet breaks.
   */
  let wet = 0;
  for (const patch of board.shape.patches) {
    board.toWorld(patch.position, pW);
    const sp = water.sampleAt(pW.x, pW.y, pW.z, scratch);
    if (sp.wet && !sp.outsideDomain && sp.surfaceY - pW.y > 0) wet += 1;
  }
  row.wet = wet;
  row.patches = board.shape.patches.length;
  row.clear = r(board.position.y - board.shape.centerOfMass.y - cen.surfaceY, 4);
  e.dry = wet === 0 ? e.dry + STEP : 0;
  row.drySpell = r(e.dry, 4);
  /** The board's own centre-of-mass acceleration, g — the board study's channel, on the BOARD rather than the rider. */
  const aMag = e.lastVel === null ? Number.NaN : board.velocity.distanceTo(e.lastVel) / STEP / 9.81;
  row.boardG = r(aMag, 3);
  if (e.lastVel === null) e.lastVel = board.velocity.clone();
  else e.lastVel.copy(board.velocity);

  if (PROBE) {
    /**
     * **THE CONE, READ TWICE BY TWO INDEPENDENT ROUTES.** `fric` is the class's own saturating ratio
     * `tangential / (FOOT_FRICTION · normal)`, read off the instance. `coneTan` is `tan` of the angle between the
     * step's mean contact force — a PUBLIC field — and the deck normal. When the clamp binds, `coneTan` must sit at
     * exactly FOOT_FRICTION. Neither is the discriminator alone.
     */
    forceV.copy(rider.contact.force);
    const along = forceV.dot(boardUp);
    const across = Math.sqrt(Math.max(0, forceV.lengthSq() - along * along));
    const coneTan = Math.abs(along) > 1e-9 ? across / along : Number.NaN;

    /**
     * **THE BOARD LEAVING THE FEET — and the three different things that phrase can mean, kept apart.**
     *
     * ⚠️ **`comRel` is NOT the soles sliding.** It is the body's centre of mass moving relative to the deck point
     * under the stance, and a body that merely LEANS over planted feet has a large one. A first version of this probe
     * called it `slipRate` and it read > 0.10 m/s on frame 1 of every run including the quiet control — i.e. it was
     * measuring the lean, exactly the confound the brief warns against. It is kept, correctly named, as the body's
     * motion over the deck; **it is not evidence of slip and nothing below rests on it.**
     *
     * The three that ARE the contact:
     *  1. **the soles sliding** — the tangential clamp binding: `limit == 'slip'`, `fric` at 1, `coneTan` at 0.900;
     *  2. **the deck leaving the soles** — the normal load going to zero: `limit == 'flight'`, `inContact == 0`,
     *     `load` 0, and the leg in **tension** (`legForce` negative) with the leg **stretched** (`legExt`);
     *  3. **the support running out under the line of action** — the free centre of pressure leaving the foot
     *     support: `overhang`, how far outside the support the unclamped CoP falls, m. The clamp that answers it is
     *     `limit == 'tip'`, and it is what MAKES the tangential demand that then slips [R, `project`, `:5369–5384`].
     */
    const support = rider.support;
    const midX = (support.xMin + support.xMax) / 2;
    const midZ = (support.zMin + support.zMax) / 2;
    board.toWorld(tmp.set(midX, 0, midZ), feetW);
    relV.subVectors(rider.velocity, board.velocityAt(feetW, tmp));
    const slipAcross = relV.dot(sideV);
    const slipAlong = relV.dot(fwd);
    board.toLocal(rider.position, offL);
    const height = Math.max(1e-6, offL.y);
    /**
     * The support's own geometry under the line of action. `desiredCop` is the class's own FREE centre of pressure —
     * where the body's line of force meets the deck with no clamp — written only while the feet are loaded
     * [R, `:5367`]. `overhang` is how far outside the support it falls: 0 while the stance can carry the line, and
     * the quantity `limit == 'tip'` is the clamp on.
     */
    const want = peek(rider, 'desiredCop') as unknown as { x: number; z: number };
    const outX = Math.max(0, Math.max(support.xMin - want.x, want.x - support.xMax));
    const outZ = Math.max(0, Math.max(support.zMin - want.z, want.z - support.zMax));
    const overhang = Math.hypot(outX, outZ);
    /** The cone's own geometric bound, as an angle: the line of action from the clamped CoP, degrees. */
    const cop = rider.contact.centreOfPressure;
    const lever = Math.hypot(offL.x - cop.x, offL.z - cop.z);
    const copLean = Math.atan2(lever, Math.max(1e-6, offL.y - cop.y)) * DEG;
    /** How far the body leans across the DECK, degrees: the quantity the 41.99° cone is a bound on. */
    const leanDeck = Math.atan2(Math.hypot(offL.x - midX, offL.z - midZ), height) * DEG;
    const leanAcross = Math.atan2(offL.x - midX, height) * DEG;

    const work = rider.work.contact;
    const power = (work - e.lastWork) / STEP;
    e.lastWork = work;

    /**
     * ⚠️ **`limit` is ONE SUBSTEP of 32, not the step.** `project` runs per substep and leaves `limit` at whatever the
     * LAST substep asked for; a first version of this probe read it as if it described the step, and it showed
     * `limit == 'flight'` for frames whose peak normal load was 0.89 body weights with `inContact == 1`. **The class's
     * own answer is `limitTime`** — how long each limit bound the contact, decaying over `CAUSE_MEMORY = 0.2 s`
     * [R, `:2048`, `:5127`] — and it is what `dominantLimit()` and therefore the separation's own NAME are built on.
     * **So `limitTime` is the signal here and `limit` is kept only as the last-substep sample, labelled as one.**
     */
    const limit = peekS(rider, 'limit');
    const lt = peek(rider, 'limitTime') as unknown as Record<string, number>;
    const fric = peek(rider, 'frictionUsed');
    const knee = peek(rider, 'kneeUsed');
    const sway = Math.hypot(peek(peek(rider, 'sway') as unknown as object, 'x'), peek(peek(rider, 'sway') as unknown as object, 'z'));

    Object.assign(row, {
      limitLast: limit, tSlip: r(lt.slip, 5), tTip: r(lt.tip, 5), tFlight: r(lt.flight, 5), tImpact: r(lt.impact, 5),
      fric: r(fric, 4), knee: r(knee, 4), coneTan: r(coneTan, 4),
      rawMargin: r(peek(rider, 'rawMargin'), 4), margin: r(rider.balanceMargin, 4),
      comAcross: r(slipAcross, 4), comAlong: r(slipAlong, 4), comRel: r(Math.hypot(slipAcross, slipAlong), 4),
      overhang: r(overhang, 5), outX: r(outX, 5), outZ: r(outZ, 5), copLean: r(copLean, 3),
      wantX: r(want.x, 4), wantZ: r(want.z, 4), copX: r(cop.x, 4), copZ: r(cop.z, 4),
      supX: r(support.xMax - support.xMin, 4), supZ: r(support.zMax - support.zMin, 4),
      offAcross: r(offL.x - midX, 4), offAlong: r(offL.z - midZ, 4), offUp: r(offL.y, 4),
      leanDeck: r(leanDeck, 3), leanAcross: r(leanAcross, 3),
      bank: r(rider.bank.angle * DEG, 3), cap: r(rider.leanProbe.cap * DEG, 3), ask: r(rider.leanProbe.ask * DEG, 3),
      planing: rider.leanProbe.planing, speedThrough: r(rider.leanProbe.speedThrough, 4),
      legLoad: r(peek(rider, 'legLoad'), 2), legExt: r(rider.leg.extension, 5), legForce: r(rider.leg.force, 2),
      legRest: r(rider.leg.rest, 5), load: r(rider.contact.load, 4), capture: r(rider.captureLoad, 4),
      powerW: r(power, 1), postureError: r(rider.postureError, 5), sway: r(sway, 5),
      flight: r(rider.flightTime, 4), inContact: rider.inContact ? 1 : 0, upright: rider.upright ? 1 : 0,
      steer: r(rider.steer, 4),
    });

    // What fails first: the first frame each named condition held. Every one of them is a different signal.
    // Every bind read off `limitTime`, the accumulator, never off the last substep's `limit`.
    mark(e, 'coneBind', lt.slip > 0);
    mark(e, 'tipBind', lt.tip > 0);
    mark(e, 'impactBind', lt.impact > 0);
    mark(e, 'flightBind', lt.flight > 0);
    mark(e, 'slipDominant', lt.slip > Math.max(lt.tip, lt.flight, lt.impact));
    mark(e, 'fricSat', fric >= 0.999);
    mark(e, 'kneeSat', knee >= 0.999);
    mark(e, 'coneAt09', Number.isFinite(coneTan) && Math.abs(coneTan - FOOT_FRICTION) < 1e-3);
    mark(e, 'comRel50', Math.hypot(slipAcross, slipAlong) > 0.50);
    mark(e, 'overhang', overhang > 1e-6);
    mark(e, 'overhang5cm', overhang > 0.05);
    mark(e, 'copLean42', copLean > Math.atan(FOOT_FRICTION) * DEG);
    mark(e, 'legTension', rider.leg.force < 0);
    mark(e, 'legStretch', rider.leg.extension > 0.05);
    mark(e, 'lean42', leanDeck > Math.atan(FOOT_FRICTION) * DEG);
    mark(e, 'posture', rider.postureError > 0.25);
    mark(e, 'swayOut', sway > 0.25);
    mark(e, 'marginLow', rider.balanceMargin < 0.1);
    mark(e, 'power4kW', Math.abs(power) > 4000);
    mark(e, 'demandNeg', Number.isFinite(demand) && demand < 0);
    mark(e, 'hullDry', wet === 0);
    mark(e, 'hullDry100ms', e.dry > 0.1);
    // The board study's own bands, so a run's summary says whether it ever reached them.
    mark(e, 'feet17g', Number.isFinite(feetG) && feetG > 17);
    mark(e, 'slopeUp26', slopeAlong > 26);
    mark(e, 'slopeDown30', slopeAlong < -30);
    mark(e, 'unloaded', !rider.inContact);
    mark(e, 'roll30', Math.abs(roll) > 30);
  }

  e.lastRoll = roll;
  e.lastSpeed = speed3;
  e.kept += 1;
  emit(row);

  if (off) {
    e.done = true;
    e.fellAt = e.frame;
    e.cause = rider.separation ?? '?';
  } else if (e.frame >= Math.round(SECONDS / STEP)) e.done = true;
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=grid — `FaceWater`: speed and slope CROSSED, the wave's height and celerity held.
// ---------------------------------------------------------------------------------------------------------------
function grid(): void {
  /**
   * **The negative control is a PLANING board on flat water.** A first attempt used 2 m/s and it fell in 1.00 s with
   * the board rolled to 63.7°: off the plane a floating board cannot hold a standing rider at all, which is step
   * 3.5f's own result and not a slip. So the quiet cell has to be one where the board planes: **6 m/s, 0.5° of
   * slope, stick never touched.** There the cone must not bind and the slip rate must stay small; a probe that
   * reports a bound cone here is broken.
   */
  const speeds = CONTROL === 'neg' ? [6] : CONTROL === 'pos' ? [Math.max(...SPEEDS)] : SPEEDS;
  const slopes = CONTROL === 'neg' ? [0.5] : CONTROL === 'pos' ? [Math.max(...SLOPES)] : SLOPES;
  const stances = CONTROL ? ['tall' as Stance] : STANCES;
  const sticks = CONTROL ? [0] : STICKS;
  for (const slope of slopes) {
    const water = new FaceWater({ depth: DEPTH, height: HEIGHT, slope, crestZ: 0, vertical: 'surface' });
    // The face is steepest halfway down it (smoothstep's own maximum rate), which is where `slope` is the nominal.
    const z = water.front / 2;
    for (const speed of speeds) {
      for (const stance of stances) {
        for (const stick of sticks) {
          const made = placePair(water, 0, z, speed, stance, stick);
          if (!made) continue;
          runs.push({
            cell: { mode: 'grid', control: CONTROL ?? 'none', rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point', reach: REACH ?? 'ships', deepen: DEEPEN ?? 'ships', legPower: LEGPOWER ?? 'ships', slope, entry: speed, stance, stick },
            board: made.board, rider: made.rider, water,
            frame: 0, done: false, fellAt: null, cause: '', lastWork: 0, lastRoll: null, lastSpeed: null, lastDeckUp: null, dry: 0, lastVel: null, lastDeckVel: null, lastRiderVel: null, first: {}, kept: 0,
          });
        }
      }
    }
  }
  // Each run has its own water (the face is analytic and takes no reactions), so they are stepped independently.
  for (const e of runs) {
    const face = e.water as FaceWater;
    // A fresh clock per run: the face is shared across the runs at one slope, so re-place against its own time.
    const t0 = (face as unknown as { time: number }).time;
    while (!e.done) {
      stepRun(e);
      face.advance(STEP);
    }
    (face as unknown as { time: number }).time = t0;
  }
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=sea — the real Canyon, as `?canyonWaves=true` builds it. His own spot.
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
  /**
   * **The Canyon seatbelt, read and printed.** Canyon B is **400 × 451 = 180 400** cells and the default Canyon is
   * **400 × 507 = 202 800**, so the grid line below says which bed actually built. `canyonBed: 'b'` is set on the
   * config explicitly here, which is what `?canyonWaves=true` sets [R, `PhysicalMode.canyonBedSwitch`], and the
   * bundle is additionally run under a wrapper that **prepends an OBJECT** `globalThis.location = { search:
   * '?canyonWaves=true' }` — a bare string silently benches the default Canyon through `devTools.ts:9`.
   */
  const { nx, nz } = sim.solver as unknown as { nx: number; nz: number };
  emit({ mode: 'sea', note: 'seatbelt', search: globalThis.location?.search ?? '(none)', grid: `${nx}x${nz}`, cells: nx * nz, spunUp: r((Date.now() - wall) / 1000, 2), focusX: r(focus.x, 3), focusZ: r(focus.z, 3) });

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
          if (!made) continue;
          runs.push({
            cell: { mode: 'sea', control: 'none', rider: RIDER, felt: FELT ?? 'ships', body: BODY ?? 'point', reach: REACH ?? 'ships', deepen: DEEPEN ?? 'ships', legPower: LEGPOWER ?? 'ships', trial: placed, entry, stance, stick: STICKS[0] },
            board: made.board, rider: made.rider, water,
            frame: 0, done: false, fellAt: null, cause: '', lastWork: 0, lastRoll: null, lastSpeed: null, lastDeckUp: null, dry: 0, lastVel: null, lastDeckVel: null, lastRiderVel: null, first: {}, kept: 0,
          });
        }
      }
    }
    for (const e of runs) if (!e.done) stepRun(e);
  }
}

// ---------------------------------------------------------------------------------------------------------------
// MODE=probe — the probe's own A/B. Nothing but the extra reads differ.
// ---------------------------------------------------------------------------------------------------------------
function probeAB(): void {
  grid();
}

const started = Date.now();
if (MODE === 'grid' || MODE === 'probe') (MODE === 'probe' ? probeAB : grid)();
else sea();

// The summary: one line per run, with the first frame of every named condition and the frame it came off on.
for (const e of runs) {
  emit({
    summary: true, ...e.cell, probe: PROBE ? 'on' : 'off',
    frames: e.kept, fellAt: e.fellAt, fellT: e.fellAt === null ? null : r(e.fellAt * STEP, 4), cause: e.cause || null,
    first: e.first,
  });
}
emit({ done: true, mode: MODE, control: CONTROL ?? 'none', rider: RIDER, reach: REACH ?? 'ships', deepen: DEEPEN ?? 'ships', legPower: LEGPOWER ?? 'ships', probe: PROBE ? 'on' : 'off', runs: runs.length, fell: runs.filter((e) => e.fellAt !== null).length, seconds: r((Date.now() - started) / 1000, 2) });
