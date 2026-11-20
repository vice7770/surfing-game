/**
 * Step 3.3e: **how deep our stances actually stand, and how long our turn actually takes.**
 *
 * The owner's question, in their words: *"when a surfer starts a wave and position himself on the wave, how deep are
 * they to allow them to turn sharply and keep balance"*, and their reading of the shipped game: *"in Compress the
 * surfer is not down enough, or in Snap. So the surfer doesn't turn fast enough."* This probe is the measurement side
 * of that round. It changes nothing: it reads four public fields off the rider and reports them.
 *
 * ## What it measures, and in what frame
 *
 * - **`rest`** — `AttachedRider.leg.rest`, m, the leg's own rest length against the riding stance: **0 is the riding
 *   stance and negative is crouched**. This is the depth the stance *asks for*. Compress asks `CROUCH_DEPTH` (0.3 m),
 *   Snap asks `SNAP_DEPTH × CROUCH_DEPTH` (also 0.3 m as shipped), the manual tuck 0.45 m.
 * - **`legLen`** — `leg.height + leg.extension`, m, the body's centre of mass above the feet. This is the length the
 *   balance's own inverted pendulum uses (`ω₀ = √(g/legLen)`), and it is the column Part 22 §6 reported as
 *   `comHeight`. It is **not** the pelvis: the physics body is a point mass on one leg, so this is the CoM.
 * - **`posture`** — `parts[1]` (the pelvis, `RIDER_PARTS[0]`, in the **board's own frame**) less the deck's height at
 *   the stance's middle (`deckHeight(shape, (rear+front)/2)` from `stanceFeet`): the same expression
 *   `AttachedRider.legDrive` calls `stance`. **This probe's first run read it as the stance's depth and it is not.** It
 *   came back **0.78 m to three decimals in all seven stances**, because `parts` is the pose's own skeleton and is
 *   rewritten only when the phase changes (`frame`), so the crouch never touches it. It is kept as a column precisely
 *   because it is a constant: it is the check that `deckY` here is the private `base.y` the code uses (0.78 m matches
 *   the leg-drive comment's own figure), and it is the datum the pelvis is built on.
 * - **`pelvis`** — `posture + leg.extension`, m: the hips over the deck as `legDrive` itself computes them
 *   (`stance + (position − target) · up`, and `leg.extension` is that dot product). This is the column the code's
 *   "0.78 m standing ... 0.48 m in Compress's crouch" comment is in. `height` and `ext` are printed beside it so the
 *   sum is read and not inferred.
 * - **`turned`** — the board's heading change from its own start, °, unwrapped. `t45` and `t85` are the first times it
 *   passes 45° and 85°; `yawPeak` is the largest |heading rate| over the run, °/s. The datum for all four is the
 *   board's heading at the first frame, and the sign is folded out (|turned|), because the two steer signs are
 *   different experiments and are never averaged.
 *
 * ## The movement, and the water
 *
 * `libturn.ts`'s own movement, which is the owner's: in trim across the face, the stance held, the stick over to
 * `STEER` until the board is `ACROSS`° off the fall line, then centred and held. `across.ts`'s own cell for the water:
 * the **Canyon-matched** `FaceWater` — 1.4 m, 2.6 m deep, 16°, 5.7 m/s — which is PR #223's calibration of Canyon B's
 * arm, the owner's stated test spot (`?canyonWaves=true`, spilling). **It is a fit to Canyon, not Canyon**, and the
 * doc says so wherever it quotes a number from it. The board is placed `AHEAD` face lengths onshore of the crest, 45°
 * off the fall line, at the face's own speed plus an entry extra; the first ~0.17 s of every run carries a contact
 * transient, as every probe in 3.2 and 3.3 does.
 *
 * ## Read-only, and off by default
 *
 * Nothing here is wired into the game. The stances it drives are the shipped inputs (`crouch`, `compress`, `snap`,
 * `steer`); the three opt-in switches it exercises (`snapDepth: 'deep'`, `carveFlex: 'on'`, `snapLegs: 'drive'`) are
 * the ones `AttachedRider` already ships behind a flag, and this probe does not change any default.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/new-rider/3.3/stance.ts -o <scratch>/st.mjs --format esm --platform node
 *   RIDER=new node <scratch>/st.mjs
 *   RIDER=old node <scratch>/st.mjs
 *   RIDER=new STANCES=snap,snapdeep node <scratch>/st.mjs
 *
 * Env: `RIDER=new|old`, `STANCES` (tall,crouch,compress,snap,snapdeep,compressflex,snapdrive), `EXTRAS` (entry speeds
 * over the face's own), `STEERS`, `SECONDS`, `ACROSS`, `OUT` (one JSON line a run).
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

/** The Canyon-matched face (PR #223): height m, slope °, crest speed m/s; and the water's depth, m. */
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
/** Face lengths onshore of the crest the board starts at, and its heading off the fall line, °. */
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const ACROSS = Number(process.env.ACROSS ?? 85);
const OUT = process.env.OUT;

type Stance = 'tall' | 'crouch' | 'compress' | 'snap' | 'snapdeep' | 'compressflex' | 'snapdrive';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress,snap,snapdeep,compressflex,snapdrive').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
/** The largest, the NaNs dropped (3.2z's trap: `Math.max(...)` over a column with one NaN returns NaN). */
const peak = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] : Number.NaN; };
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

/** The stance's own inputs, and the options the three opt-in switches need. The deeper of crouch and Compress wins in the code. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' || s === 'compressflex' ? 0.6 : 0;
  rider.compress = s === 'compress' || s === 'compressflex' ? 1 : 0;
  rider.snap = s === 'snap' || s === 'snapdeep' || s === 'snapdrive' ? 1 : 0;
}

function stanceOptions(s: Stance): Record<string, string> {
  if (s === 'snapdeep') return { snapDepth: 'deep' };
  if (s === 'compressflex') return { carveFlex: 'on' };
  if (s === 'snapdrive') return { snapLegs: 'drive' };
  return {};
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
    ...stanceOptions(st),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = 0;

  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  // The deck's own height at the stance's middle: the datum the hips are measured over, in the board's frame.
  const feet = stanceFeet(board.shape);
  const deckY = deckHeight(board.shape, (feet.rear + feet.front) / 2);
  const rests: number[] = [];
  const legs: number[] = [];
  const pelvis: number[] = [];
  const posture: number[] = [];
  const heights: number[] = [];
  const exts: number[] = [];
  const rolls: number[] = [];
  const rails: number[] = [];
  const speeds: number[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let startHeading = Number.NaN;
  let lastHeading = Number.NaN;
  let unwrapped = 0;
  let yawPeak = 0;
  let t45 = Number.NaN;
  let t85 = Number.NaN;
  let centred = false;
  let restDeepest = 0;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    // `trimbank.ts`'s own two angles and senses: the deck's roll about the heading FROM THE WORLD'S LEVEL (+ with the
    // board's level-left side down), and the rail, which is that roll less the water's own normal.
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    const heading = Math.atan2(fwd.x, fwd.z);
    if (!Number.isFinite(startHeading)) { startHeading = heading; lastHeading = heading; }
    let d = heading - lastHeading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    unwrapped += d;
    lastHeading = heading;
    const rate = Math.abs(d / STEP) * DEG;
    // The mount's contact transient is the first ~0.17 s in every probe of this folder; the peak rate skips it.
    if (t > 0.2 && rate > yawPeak) yawPeak = rate;
    const turned = Math.abs(unwrapped) * DEG;
    if (!Number.isFinite(t45) && turned >= 45) t45 = t;
    if (!Number.isFinite(t85) && turned >= ACROSS) t85 = t;
    // The owner's movement: the stick over until the board is ACROSS° off the fall line, then centred and held.
    if (!centred && turned >= ACROSS) centred = true;
    rider.steer = centred ? 0 : steer;

    // The hips over the deck, in the board's own frame: `parts` is board-local and `RIDER_PARTS[0]` is the pelvis.
    const hips = rider.parts[1] - deckY;
    // The mount's contact transient is over by ~0.17 s; the stance's columns start at 0.5 s so the legs have settled.
    if (t > 0.5) {
      rests.push(rider.leg.rest);
      legs.push(rider.leg.height + rider.leg.extension);
      heights.push(rider.leg.height);
      exts.push(rider.leg.extension);
      posture.push(hips);
      pelvis.push(hips + rider.leg.extension);
      rolls.push(Math.abs(roll));
      rails.push(Math.abs(rail));
      speeds.push(board.velocity.length());
      if (rider.leg.rest < restDeepest) restDeepest = rider.leg.rest;
    }
    if (!rider.upright || rider.phase !== 'standing') { fell = rider.phase; fellAt = t; break; }
  }

  return {
    rider: RIDER, stance: st, extra, steer,
    // The depth the stance asks for, m below the riding stance (positive = deeper).
    restMedian: r(-median(rests)), restDeepest: r(-restDeepest),
    // The centre of mass above the feet, m: the balance's own pendulum length.
    legMedian: r(median(legs)), legLeast: r(qt(legs, 0)),
    // The hips over the deck, m, as `legDrive` computes them; `posture` is the constant datum, `ext` the crouch itself.
    pelvisMedian: r(median(pelvis)), pelvisLeast: r(qt(pelvis, 0)),
    postureMedian: r(median(posture)), heightMedian: r(median(heights)), extMedian: r(-median(exts)), extMost: r(-qt(exts, 0)),
    // The lean, so a slower turn can be read as a smaller lean or as the same lean the board does not follow.
    rollPeak: r(peak(rolls), 1), railPeak: r(peak(rails), 1), speedMedian: r(median(speeds), 2),
    // The turn.
    t45: r(t45), t85: r(t85), yawPeak: r(yawPeak, 1), turned: r(Math.abs(unwrapped) * DEG, 1),
    fell: fell || null, fellAt: r(fellAt),
  };
}

const rows: Record<string, unknown>[] = [];
// `tall` runs first in every cell so its settled hips are the drop's datum before any other stance is read.
const order = [...STANCES].sort((a, b) => (a === 'tall' ? -1 : b === 'tall' ? 1 : 0));
for (const extra of EXTRAS) {
  for (const steer of STEERS) {
    for (const st of order) {
      const row = oneRun(st, extra, steer);
      rows.push(row);
      emit(row);
    }
  }
}

// `r()` returns null for a NaN, and `Number(null)` is 0 — which the first run of this probe read as "reached 85° at
// 0.00 s" on every run that never reached it. So a null is carried through as a NaN, which `sorted` drops.
const col = (st: Stance, k: string) => rows.filter((x) => x.stance === st).map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const reached = (st: Stance, k: string) => rows.filter((x) => x.stance === st && x[k] !== null).length;
console.log(`\n# step 3.3e — the stances' depth and the turn's clock, rider=${RIDER}`);
console.log(`# Canyon-matched FaceWater ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s, ${DEPTH} m deep — a FIT to Canyon, not Canyon.`);
console.log(`# ${EXTRAS.length} entry speeds × ${STEERS.length} sticks = ${EXTRAS.length * STEERS.length} runs a stance, ${SECONDS} s each.`);
console.log(`\n| stance | asked, m | deepest asked | GOT, m (-ext) | deepest got | hips over the deck, m | CoM over feet, m | roll peak ° | rail peak ° | speed m/s | to 45° | to ${ACROSS}° | yaw peak °/s | stood |`);
console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
for (const st of order) {
  const stood = rows.filter((x) => x.stance === st && !x.fell).length;
  const n = rows.filter((x) => x.stance === st).length;
  console.log(`| ${st} | ${span(col(st, 'restMedian'))} | ${f(peak(col(st, 'restDeepest')))} `
    + `| ${span(col(st, 'extMedian'))} | ${f(peak(col(st, 'extMost')))} `
    + `| ${span(col(st, 'pelvisMedian'))} | ${span(col(st, 'legMedian'))} `
    + `| ${span(col(st, 'rollPeak'), 1)} | ${span(col(st, 'railPeak'), 1)} | ${span(col(st, 'speedMedian'))} `
    + `| ${span(col(st, 't45'))} (${reached(st, 't45')}/${n}) | ${span(col(st, 't85'))} (${reached(st, 't85')}/${n}) | ${span(col(st, 'yawPeak'), 1)} | ${stood} of ${n} |`);
}
