/**
 * Step 3.5b: **where the commanded stance depth goes on `?rider=new`** — the whole chain from the button to the hips,
 * one column per link, on step 3.3e's own cell.
 *
 * The owner's complaint is *"in Compress the surfer is not down enough"*, and step 3.3e measured on `?rider=new` that
 * **Compress adds only 0.025–0.115 m of depth over tall in 4 of 6 runs** against 0.300–0.336 m on the default rider.
 * This probe asks which link of the chain loses it. It changes nothing: it reads public fields off the rider and
 * reconstructs the two private ones (`legLoad`, `legStiffness`) from the leg's own force balance.
 *
 * ## The chain, named link by link (every column says which physical quantity it is)
 *
 * 1. **`cmd`** — the depth the player's button commands, m of **leg-spring rest-length shortening** below the riding
 *    stance. It is `prepareLeg`'s own `held × CROUCH_DEPTH` and it is a **constant of the run**, computed here from the
 *    same inputs the code reads: tall 0, crouch `CROUCH_SHARE × 0.3` = 0.195, Compress `CROUCH_DEPTH` = 0.3. It is
 *    `AttachedRider.heldDepth`, which is private, so it is recomputed rather than read — and the recomputation is
 *    checked against `rest` on the default rider, where no other term may touch it.
 * 2. **`target`** — the depth the new surfer's leg is **asked** for after the balance's own knee drop is added:
 *    `cmd + knees × stanceRoom(cmd).kneeTravel`, which is `prepareLeg`'s `asked = Math.min(asked, -(heldDepth +
 *    human.knees × travel))` with both signs flipped to depths. `knees` is `HumanBalance.knees` (public), 0–1 of the
 *    stance's travel left.
 * 3. **`rest`** — `−AttachedRider.leg.rest`, m: the **leg spring's rest length shortening the leg actually holds**,
 *    after the acceleration limit, the speed limit, the `tallest`/`deepest` window and the feet-only-push `slack`
 *    clamp. This is the "command as the leg holds it".
 * 4. **`got`** — `−AttachedRider.leg.extension`, m: **where the body's centre of mass actually is along the leg**,
 *    below the riding stance. This is the achieved depth, and `rest − got` is the spring's own deflection (`sag`).
 * 5. **`hips`** — `0.78 + leg.extension`, m: **the pelvis above the deck**, which is step 3.3e's `pelvis` column and
 *    `AttachedRider.legDrive`'s own `stance + (position − target)·up`. 0.78 m is `riderPosture`'s placed pelvis
 *    (`parts[1] − base.y`, a constant: `parts` is the pose's skeleton and the crouch never rewrites it), printed as
 *    `posture` so the sum is read and not inferred.
 *
 * **`slack`** is `prepareLeg`'s own feet-only-push clamp, `leg.extension − legLoad / legStiffness`, reconstructed from
 * `leg.force = legLoad − k (extension − rest) − c · rate` with `k` = KNEE_STIFFNESS = 20 000 N/m and
 * `c = 2 ζ √(k m)`, ζ = `RIDER_LEG.axialDamping` = 0.35 — exact for the new surfer, whose `legStiffness` is that
 * constant and not the crouch-softened `LEG_STIFFNESS`. `slackBind` counts the ticks where `leg.rest` sits on
 * `min(0, slack)`, i.e. where the clamp is what the leg's rest is.
 *
 * ## The fall test, which is the reason step 3.3e's own numbers cannot be read as they stand
 *
 * `AttachedRider.separate` sets `attached`/`climbing`/`inContact`/`separation` and **never `phase` or `upright`**
 * (step 3.3f), so `!upright || phase !== 'standing'` — 3.3e's test — never fires for a balance fall, `prepare` stops
 * being called, and every rider column freezes at its last value. This probe breaks on **`!rider.attached`** and
 * reports both windows so the artefact can be read rather than argued about:
 * - **live** columns: 0.5 s to the frame before the rider comes off (the honest ones);
 * - **`dead*`** columns: 3.3e's own window, 0.5 s to the end of the run, frozen frames included.
 *
 * ## Read-only, and nothing is wired into the game
 *
 * The stances are the shipped inputs (`crouch`, `compress`); `?kneeRoom=achieved` and `?stanceReach=keep` are the two
 * shipped opt-in switches this probe can turn on for an A/B. No default moves.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/depth.ts -o <scratch>/d.mjs --format esm --platform node
 *   RIDER=new node <scratch>/d.mjs
 *   RIDER=old node <scratch>/d.mjs
 *   RIDER=new KNEEROOM=achieved node <scratch>/d.mjs
 *   RIDER=new STANCES=compress EXTRAS=1.5 STEERS=1 TICKS=1 node <scratch>/d.mjs   # the per-tick dump
 *
 * Env: `RIDER=new|old`, `STANCES` (tall,crouch,compress,tuck), `EXTRAS` (entry speeds over the face's own), `STEERS`,
 * `SECONDS`, `ACROSS`, `KNEEROOM=achieved`, `REACH=keep`, `TICKS=1` (per-tick TSV to stdout), `OUT` (one JSON a run).
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { deckHeight, stanceFeet } from '../../../../src/physics/riderPosture';
import { stanceRoom } from '../../../../src/physics/humanBalance';
import { stanceAt } from '../../../../src/physics/predictiveBalance';
import { DEFAULT_WEIGHTS, STANCE_TABLE } from '../../../../src/physics/predictiveBalance';
import { KNEE_STIFFNESS } from '../../../../src/physics/standingBody';
import { RIDER_LEG } from '../../../../src/physics/legSpring';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

/** `AttachedRider`'s own stance constants, re-stated so `cmd` is computed from the code's numbers and not from prose. */
const CROUCH_DEPTH = 0.3;
const CROUCH_SHARE = 0.65;
/** The default rider's own leg spring, for the `slack` reconstruction on that rider (the new surfer's is KNEE_STIFFNESS). */
const LEG_STIFFNESS = 44_000;
const CROUCH_SOFTENING = 0.5;

/** The Canyon-matched face (PR #223, step 3.3e's and 3.3f's cell): height m, slope °, crest speed m/s; water depth m. */
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const ACROSS = Number(process.env.ACROSS ?? 85);
const KNEEROOM = process.env.KNEEROOM === 'achieved' ? 'achieved' : undefined;
const REACH = process.env.REACH === 'keep' ? 'keep' : undefined;
/**
 * Step 3.5b: the ladder's fourth rung read by the balance (`?stanceDeep`), and the deepen button (`?deepen=on`).
 *
 * **Step 3.5c: `STANCEDEEP=off` is now the interesting arm**, because the owner's ruling D of 2026-11-17 ("keep the
 * row") made the rung the DEFAULT. Unset is the shipped plant; `off` is the old three-row ladder with `stanceAt`'s
 * 0.30 m clamp, which is the leg 3.5b's own tables were the `off` column of.
 */
const STANCEDEEP = process.env.STANCEDEEP === 'on' ? 'on' : process.env.STANCEDEEP === 'off' ? 'off' : undefined;
const DEEPEN = process.env.DEEPEN === 'on' ? 'on' : undefined;
/** `AttachedRider.MANUAL_CROUCH_DEPTH`, re-stated so `cmd` is computed from the code's number and not from prose. */
const MANUAL_CROUCH_DEPTH = 0.45;
/**
 * Step 3.5b's dip, timed: `DIP=<from>,<hold>` presses the crouch key from `from` s for `hold` s **on top of whatever
 * stance the cell holds** and lets it go again, so the tall -> low -> tall cycle can be read off the leg's own trace
 * rather than argued about. It answers one question: **does the deepening come back up on its own while the key is
 * still held?** Nothing is timed inside the game — the press is this probe's input, exactly as a player's would be.
 */
const DIP = process.env.DIP ? process.env.DIP.split(',').map(Number) : undefined;
const TICKS = process.env.TICKS === '1';
/**
 * `KEEP=1`: keep stepping after the rider has come off, as step 3.3e's probe did, so its own window (0.5 s → 9 s, the
 * frozen frames included) can be reproduced in the `dead*` columns and the size of the artefact read off one run.
 */
const KEEP = process.env.KEEP === '1';
const OUT = process.env.OUT;

type Stance = 'tall' | 'crouch' | 'compress' | 'tuck';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];

const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
/** `qt(v, 0.5)` is the UPPER middle element of an even sample, as every probe in 3.2–3.4 defines it. */
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 3) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };
const mean = (v: number[]) => { const s = v.filter(Number.isFinite); return s.length ? s.reduce((a, b) => a + b, 0) / s.length : Number.NaN; };

/** The stance's own inputs, step 3.3e's exactly (the deeper of the crouch and Compress wins in the code). */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : s === 'tuck' ? 1 : 0;
  rider.compress = s === 'compress' ? 1 : s === 'tuck' ? 1 : 0;
  rider.snap = 0;
}

/**
 * The depth the button commands, m — `prepareLeg`'s `held × CROUCH_DEPTH`, recomputed. `tuck` reaches
 * MANUAL_CROUCH_DEPTH only under a tube's curl (`covered`), which this cell has none of, so on this water it is
 * Compress's own depth; it is listed so that a run of it says so rather than being assumed.
 */
function commanded(s: Stance): number {
  if (s === 'tall') return 0;
  // Step 3.5b's deepen button (`DEEPEN=on`) ungates the tuck, so full manual crouch commands MANUAL_CROUCH_DEPTH
  // anywhere and Compress no longer fades it: `manualCrouchShare(1, 0) × CROUCH_DEPTH` = 0.45 m.
  if (DEEPEN && (s === 'tuck' || s === 'crouch')) return MANUAL_CROUCH_DEPTH;
  if (s === 'crouch') return CROUCH_SHARE * CROUCH_DEPTH;
  return CROUCH_DEPTH;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

function oneRun(st: Stance, extra: number, steer: number): Record<string, unknown> {
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
  const board = new BoardBody();
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(KNEEROOM ? { kneeRoom: KNEEROOM } : {}),
    ...(REACH ? { stanceReach: REACH } : {}),
    ...(STANCEDEEP ? { stanceDeep: STANCEDEEP } : {}),
    ...(DEEPEN ? { deepen: DEEPEN } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = 0;

  const cmd = commanded(st);
  const room = stanceRoom(cmd, REACH);

  const fwd = new Vector3();
  const feet = stanceFeet(board.shape);
  const deckY = deckHeight(board.shape, (feet.rear + feet.front) / 2);

  // Live frames (0.5 s to the frame before the rider comes off) and 3.3e's window (0.5 s to the end, frozen included).
  const live = { rest: [] as number[], got: [] as number[], target: [] as number[], knees: [] as number[], sag: [] as number[], slackGap: [] as number[], load: [] as number[],
    // Step 3.5b: the plant the balance is actually designing on at this tick's ACHIEVED depth, read the way the plant
    // reads it (`stanceAt(yawDepth, deep)`): the pendulum length L, m; the lean rate omega0 = sqrt(g/L), rad/s; and
    // `riderCost`'s own bank limit, deg (`stateScale[2] × STANCE_TABLE[0].height / L`, `design`'s rank-one term).
    plantL: [] as number[], omega0: [] as number[], bankLimit: [] as number[], yawLower: [] as number[], twistUpper: [] as number[] };
  const dead = { rest: [] as number[], got: [] as number[] };
  let slackBind = 0;
  let follows = 0;
  /** Live ticks whose ACHIEVED leg depth is past `stanceAt`'s 0.30 m ceiling, so the plant is solving a shallower stance. */
  let pastCeiling = 0;
  let liveTicks = 0;
  let deadTicks = 0;
  let fellAt = Number.NaN;
  let cause: string | null = null;
  let off = false;
  let startHeading = Number.NaN;
  let lastHeading = Number.NaN;
  let unwrapped = 0;
  let t85 = Number.NaN;
  let centred = false;
  let restDeepest = 0;
  let gotDeepest = 0;
  /** The first time, s, the leg's own rest reaches the depth the button commands (within 5 mm), and the body with it. */
  let tCmd = Number.NaN;
  let tGot = Number.NaN;
  /** The dip's own trace: when the leg reaches the tuck after the press, the deepest it gets, whether it RISES while
   *  the key is still held (any rise over 5 mm off its own deepest, before the release), and when it is back up. */
  let dipDeepest = 0;
  let dipReached = Number.NaN;
  let dipRoseHeld = 0;
  let dipBackUp = Number.NaN;
  let dipAtRelease = Number.NaN;
  let dipBase = Number.NaN;

  if (TICKS) process.stdout.write('t\tknees\tcmd\ttarget\trest\tgot\thips\tsag\tslack\tslackBind\tlegLoad\tattached\n');

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const heading = Math.atan2(fwd.x, fwd.z);
    if (!Number.isFinite(startHeading)) { startHeading = heading; lastHeading = heading; }
    let d = heading - lastHeading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    unwrapped += d;
    lastHeading = heading;
    const turned = Math.abs(unwrapped) * DEG;
    if (!Number.isFinite(t85) && turned >= ACROSS) t85 = t;
    if (!centred && turned >= ACROSS) centred = true;
    rider.steer = centred ? 0 : steer;
    // The dip, as a momentary press of the crouch key over the cell's own stance (step 3.5b).
    if (DIP) rider.crouch = t >= DIP[0] && t < DIP[0] + DIP[1] ? 1 : (st === 'crouch' || st === 'tuck' ? 1 : 0);

    // The rider comes off through `separate`, which touches neither `phase` nor `upright` (step 3.3f).
    if (!off && !rider.attached) {
      off = true;
      fellAt = t;
      cause = rider.separation ?? 'unnamed';
    }

    const restDepth = -rider.leg.rest;
    const gotDepth = -rider.leg.extension;
    const hips = (rider.parts[1] - deckY) + rider.leg.extension;
    const knees = rider.human.knees;
    const target = cmd + knees * (KNEEROOM === 'achieved' ? stanceRoom(Math.max(cmd, restDepth), REACH).kneeTravel : room.kneeTravel);
    // `legLoad` and `legStiffness` are private; the leg's own force balance gives the load back exactly, and
    // `legStiffness` is a stated function of the rest on both riders (`prepareLeg`'s last lines).
    const k = RIDER === 'new' ? KNEE_STIFFNESS
      : LEG_STIFFNESS * (1 - (CROUCH_SOFTENING * Math.min(CROUCH_DEPTH, Math.max(0, restDepth))) / CROUCH_DEPTH);
    const damping = 2 * RIDER_LEG.axialDamping * Math.sqrt(k * rider.mass);
    const legLoad = rider.leg.force + k * (rider.leg.extension - rider.leg.rest) + damping * rider.leg.rate;
    const slack = rider.leg.extension - legLoad / k;
    const onSlack = Math.abs(rider.leg.rest - Math.min(0, slack)) < 1e-9;

    if (DIP) {
      const held = t >= DIP[0] && t < DIP[0] + DIP[1];
      if (!Number.isFinite(dipBase) && t >= DIP[0] - STEP * 1.5 && t < DIP[0]) dipBase = restDepth;
      if (held && !off) {
        if (restDepth > dipDeepest) dipDeepest = restDepth;
        else if (dipDeepest - restDepth > 0.005) dipRoseHeld += 1;
        if (!Number.isFinite(dipReached) && restDepth >= MANUAL_CROUCH_DEPTH - 0.005) dipReached = t - DIP[0];
      }
      if (!Number.isFinite(dipAtRelease) && t >= DIP[0] + DIP[1]) dipAtRelease = restDepth;
      if (t >= DIP[0] + DIP[1] && !Number.isFinite(dipBackUp) && Number.isFinite(dipBase) && restDepth <= dipBase + 0.005) dipBackUp = t - (DIP[0] + DIP[1]);
    }
    if (cmd > 0 && !Number.isFinite(tCmd) && restDepth >= cmd - 0.005) tCmd = t;
    if (cmd > 0 && !Number.isFinite(tGot) && gotDepth >= cmd - 0.005) tGot = t;
    if (t > 0.5) {
      deadTicks += 1;
      dead.rest.push(restDepth);
      dead.got.push(gotDepth);
      if (!off) {
        liveTicks += 1;
        live.rest.push(restDepth);
        live.got.push(gotDepth);
        live.target.push(target);
        live.knees.push(knees);
        live.sag.push(restDepth - gotDepth);
        live.slackGap.push(restDepth - Math.max(0, -Math.min(0, slack)));
        live.load.push(legLoad / (rider.mass * 9.81));
        // Step 3.5c: the rung ships, so the probe's reported plant follows the rider's — only `off` reads three rows.
        const st2 = stanceAt(-rider.leg.rest, STANCEDEEP !== 'off');
        live.plantL.push(st2.height);
        live.omega0.push(Math.sqrt(9.81 / st2.height));
        live.bankLimit.push(DEFAULT_WEIGHTS.stateScale[2] * (STANCE_TABLE[0].height / st2.height) * DEG);
        live.yawLower.push(st2.lower);
        live.twistUpper.push(st2.upper);
        if (onSlack) slackBind += 1;
        if (restDepth > 0.3005) pastCeiling += 1;
        // "Followed": the rest the leg holds is within 5 mm of the depth the chain asks for.
        if (Math.abs(restDepth - target) <= 0.005) follows += 1;
        if (restDepth > restDeepest) restDeepest = restDepth;
        if (gotDepth > gotDeepest) gotDeepest = gotDepth;
      }
    }
    if (TICKS) {
      process.stdout.write(`${f(t, 4)}\t${f(knees)}\t${f(cmd)}\t${f(target)}\t${f(restDepth)}\t${f(gotDepth)}\t${f(hips)}\t`
        + `${f(restDepth - gotDepth)}\t${f(slack)}\t${onSlack ? 1 : 0}\t${f(legLoad / (rider.mass * 9.81), 2)}\t${rider.attached ? 1 : 0}\n`);
    }
    if (off && !KEEP) break;
  }

  return {
    rider: RIDER, kneeRoom: KNEEROOM ?? null, reach: REACH ?? null, stance: st, extra, steer,
    cmd: r(cmd), kneeTravel: r(room.kneeTravel),
    // LIVE (0.5 s to the frame before the rider comes off): the depths, m below the riding stance.
    n: liveTicks,
    kneesMedian: r(median(live.knees)), kneesMean: r(mean(live.knees)),
    targetMedian: r(median(live.target)), restMedian: r(median(live.rest)), gotMedian: r(median(live.got)),
    restDeepest: r(restDeepest), gotDeepest: r(gotDeepest),
    hipsMedian: r(0.78 - median(live.got)),
    sagMedian: r(median(live.sag)), sagMost: r(qt(live.sag, 1)),
    followShare: r(liveTicks > 0 ? follows / liveTicks : Number.NaN, 3),
    slackShare: r(liveTicks > 0 ? slackBind / liveTicks : Number.NaN, 3),
    ceilingShare: r(liveTicks > 0 ? pastCeiling / liveTicks : Number.NaN, 3),
    loadMedian: r(median(live.load), 2),
    // The plant at the achieved depth (step 3.5b): with the row the deep ticks leave Compress's pendulum.
    plantLMedian: r(median(live.plantL)), plantLLeast: r(sorted(live.plantL)[0]),
    omega0Median: r(median(live.omega0), 3), bankLimitMedian: r(median(live.bankLimit), 3),
    yawLowerMedian: r(median(live.yawLower), 3), twistUpperMedian: r(median(live.twistUpper), 3),
    // 3.3e's own window, the frozen frames included, for the artefact's size.
    deadN: deadTicks, deadRestMedian: r(median(dead.rest)), deadGotMedian: r(median(dead.got)),
    deadShare: r(deadTicks > 0 ? (deadTicks - liveTicks) / deadTicks : Number.NaN, 3),
    tCmd: r(tCmd, 3), tGot: r(tGot, 3),
    fellAt: r(fellAt, 3), cause, t85: r(t85, 3),
    // The dip's own trace (step 3.5b, `DIP=<from>,<hold>`): all seconds; `dipRoseHeld` is the count of ticks where the
    // leg sat more than 5 mm above its own deepest WHILE THE KEY WAS STILL HELD — a self-release would be non-zero.
    ...(DIP ? {
      dipFrom: DIP[0], dipHold: DIP[1], dipBase: r(dipBase), dipDeepest: r(dipDeepest), dipReached: r(dipReached, 3),
      dipRoseHeld, dipAtRelease: r(dipAtRelease), dipBackUp: r(dipBackUp, 3),
    } : {}),
  };
}

const rows: Record<string, unknown>[] = [];
// `tall` first in every cell, as 3.3e's probe does, so its settled depth is the drop's datum.
const order = [...STANCES].sort((a, b) => (a === 'tall' ? -1 : b === 'tall' ? 1 : 0));
for (const extra of EXTRAS) {
  for (const steer of STEERS) {
    for (const st of order) {
      const row = oneRun(st, extra, steer);
      rows.push(row);
      if (!TICKS) emit(row);
    }
  }
}

if (!TICKS) {
  // `r()` returns null for a NaN and `Number(null) === 0`, so nulls are carried through as NaNs, which `sorted` drops.
  const col = (st: Stance, k: string) => rows.filter((x) => x.stance === st).map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
  console.log(`\n# step 3.5b — where the commanded depth goes, rider=${RIDER}${KNEEROOM ? ` kneeRoom=${KNEEROOM}` : ''}${REACH ? ` reach=${REACH}` : ''}${STANCEDEEP ? ` stanceDeep=${STANCEDEEP}` : ' stanceDeep=as it ships'}${DEEPEN ? ' deepen=on' : ''}`);
  console.log(`# Canyon-matched FaceWater ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s, ${DEPTH} m deep — a FIT to Canyon, not Canyon.`);
  console.log(`# ${EXTRAS.length} entry speeds × ${STEERS.length} sticks = ${EXTRAS.length * STEERS.length} runs a stance, ${SECONDS} s each; LIVE frames only (0.5 s → the frame before the rider comes off).`);
  console.log('# All depths are metres of leg shortening below the riding stance. hips = 0.78 m (the placed pelvis) − got.');
  console.log(`\n| stance | cmd, m | knee travel | knees | **target, m** | **rest, m** | **got, m** | **hips, m** | sag, m | followed | on slack | past 0.30 | load, BW | fell, s | live ticks | dead share | plant L, m | omega0 | bank limit, deg | yaw lower | twist upper |`);
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const st of order) {
    const n = rows.filter((x) => x.stance === st).length;
    console.log(`| ${st} | ${f(median(col(st, 'cmd')))} | ${f(median(col(st, 'kneeTravel')))} | ${span(col(st, 'kneesMedian'), 2)} `
      + `| ${span(col(st, 'targetMedian'))} | ${span(col(st, 'restMedian'))} | ${span(col(st, 'gotMedian'))} | ${span(col(st, 'hipsMedian'))} `
      + `| ${span(col(st, 'sagMedian'))} | ${span(col(st, 'followShare'), 2)} | ${span(col(st, 'slackShare'), 2)} | ${span(col(st, 'ceilingShare'), 2)} | ${span(col(st, 'loadMedian'), 2)} `
      + `| ${span(col(st, 'fellAt'), 2)} (${rows.filter((x) => x.stance === st && x.cause).length}/${n}) | ${span(col(st, 'n'), 0)} | ${span(col(st, 'deadShare'), 2)} `
      + `| ${span(col(st, 'plantLMedian'))} | ${span(col(st, 'omega0Median'), 2)} | ${span(col(st, 'bankLimitMedian'), 2)} | ${span(col(st, 'yawLowerMedian'))} | ${span(col(st, 'twistUpperMedian'))} |`);
  }
  // The paired contrast, cell by cell: the same entry speed and stick, tall against each deeper stance.
  console.log('\n| cell (entry, stick) | knees tall | hips tall, m | stance | hips, m | **Δ hips, m** | Δ on 3.3e\'s window, m |');
  console.log('|---|---|---|---|---|---|---|');
  for (const extra of EXTRAS) {
    for (const steer of STEERS) {
      const tall = rows.find((x) => x.extra === extra && x.steer === steer && x.stance === 'tall');
      if (!tall) continue;
      for (const st of order) {
        if (st === 'tall') continue;
        const row = rows.find((x) => x.extra === extra && x.steer === steer && x.stance === st);
        if (!row) continue;
        const dLive = Number(tall.hipsMedian) - Number(row.hipsMedian);
        const dDead = (0.78 - Number(tall.deadGotMedian)) - (0.78 - Number(row.deadGotMedian));
        console.log(`| ${extra}, ${steer} | ${f(Number(tall.kneesMedian), 2)} | ${f(Number(tall.hipsMedian))} | ${st} | ${f(Number(row.hipsMedian))} | **${f(dLive)}** | ${f(dDead)} |`);
      }
    }
  }
}
