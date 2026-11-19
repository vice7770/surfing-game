/**
 * **Step 3.5h: can the game's own rider fold its trunk while its legs stay where they are — and does the mass go
 * with the fold?** The probe for rows 1, 2 and 3 of `docs/research/new-rider/3.5/engine-target.md`.
 *
 * ## What is being measured, and what is NOT
 *
 * Row 2 of the engine target quotes **≥ 60°** of trunk travel and the video-12 read quotes **80°**. **Neither is a
 * target here and neither is used anywhere below.** Both are image-plane angles; video 13 then found the trunk angle
 * has an admissibility gate of its own (projected shoulder→waistband ÷ head length near 1.6–1.8) that **no visibly
 * folded frame has ever passed in thirteen clips**, and the reviewer's geometry point removes even the lower-bound
 * reading: foreshortening only shrinks a *single* angle under a level camera at fixed yaw, and a trunk *span* is the
 * difference of two projected angles across 2.4 s of a turn, during which the yaw moved. **So after thirteen clips
 * the series has no gated measurement of trunk angular travel at all**, and this file reports the range the engine
 * reaches as **a fact about the engine**, with no footage figure beside it. The owner rides the feel.
 *
 * What is being measured is the **structural** defect, which needs no camera:
 *
 * - **row 1** — `standingBody.hip.angle` is read in three places and **never moves `this.parts`**
 *   (`AttachedRider.ts:4186`, `:5209`, and inside `StandingBody`), so the centre of mass, the inertia tensor, the
 *   per-part water forces and the drawn body are all computed from an **unfolded** trunk while the trunk folds. The
 *   metric is **the gap between the centre of mass the mass model uses and the one the rotor's angle implies**, and
 *   its target is **zero**, and §3.2 of `trunk-mass.md` says why the FIRST version of this check was a tautology
 *   and had to be thrown away. (`foldCheck` and `lagGap` below.)
 * - **row 2** — `HumanoidRig.ts:1383–1385` is `wanted = ((tall + (deep − tall) * depth) * π) / 180` with
 *   `depth = (STANDING_PELVIS − pelvisOverDeck)/CROUCH_DEPTH`, the drawn pelvis height and nothing else. **Folding at
 *   a fixed leg depth is impossible at any value of `hinge.tall` or `hinge.deep`.** The metric is **the trunk travel
 *   reachable inside a window in which a depth channel does not move.** (`holdTrunkSpan` and `legTrunkSpan` below.)
 * - **row 3** — the **fraction of live frames where the trunk and the leg depth move in opposite directions**, which
 *   is exactly 0 by construction today (within a stage the drawn correlation is +1). It is a capability question with
 *   a yes/no answer, and it is rows 1 and 2's acceptance test. (`opposed` below.)
 *
 * ## The two channels, read where the drawing reads them
 *
 * **The trunk.** `HumanoidRig` builds the drawn body's `up` as `points[torso] − points[pelvis]` (`:905–907`) and its
 * `chestUp` as `points[head] − points[torso]` (`:1071–1073`), and `renderPoint`/`partPosition` map `this.parts`
 * rigidly into the world. So the **board-local** angle of `parts[torso] − parts[pelvis]` off the posture's up **is**
 * the rig's own trunk input, and that is what `trunk` below is. It needs no rig, no camera and no render.
 *
 * **The leg depth.** `pelvisOverDeck` reads `points[0]`, the **pelvis** (`posturePoints.ts:36–41`), which the fold
 * does not move — the pelvis is the pivot. So `depth` below is `parts[pelvis].y − deckHeight`, the rig's own input to
 * the formula above, in metres, and the two channels are read from one snapshot of one array.
 *
 * ## The arms
 *
 * Paired: one sea, one placement, one stance, one entry and one steer per pair, with **one option changed** —
 * `trunk: 'mass'` on or off. The owner's own address otherwise (`RIDER=new FELT=deck BODY=two`). Both stances are
 * run, because the fold's pivot and axis have to be right in regular and in goofy; standing, every part of
 * `riderPosture`'s posture sits on the stringer and the goofy mirror only swaps parts across it, so the two should
 * come out alike, and that is checked rather than assumed.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/trunk.ts -o <scratch>/trunk.mjs --format esm --platform node
 *   STEERS=0,0.5,1 STANCES=regular,goofy SECONDS=9 node <scratch>/trunk.mjs
 *
 * `ARMS=off` alone runs the default path only, which is how the default is proved unchanged: the same bundle built
 * from the merge base and from this branch must print identical rows.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { CROUCH_DEPTH } from '../../../../src/physics/AttachedRider';
import { HIP_PITCH_SHARE } from '../../../../src/physics/standingBody';
import { RIDER_PARTS, deckHeight, riderPartMasses, riderPose, stanceFeet } from '../../../../src/physics/riderPosture';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

/** The Canyon-matched face (PR #223): height m, slope °, crest speed m/s; and the water's depth, m. */
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0,0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'regular,goofy').split(',') as ('regular' | 'goofy')[];
const ARMS = (process.env.ARMS ?? 'off,mass').split(',') as ('off' | 'mass')[];
const CROUCHES = (process.env.CROUCHES ?? '0,1').split(',').map(Number);
/**
 * `RIDER=new|old`: the new surfer, which is the only rider with a hip rotor, or the SHIPPED one. `old` exists so the
 * default-path proof covers the rider the owner actually rides by default as well as the one the switch touches.
 */
const RIDER = process.env.RIDER === 'old' ? 'old' : 'new';
const OUT = process.env.OUT;
/**
 * The band inside which the rig's own depth input counts as **not having moved**, m. 0.002 m is well under a tenth of
 * `CROUCH_DEPTH`'s 0.30 m and under the pelvis's own placement precision; `HOLD` prints on every row so the window is
 * never read without its own tolerance.
 */
const HOLD = Number(process.env.HOLD ?? 0.002);
/** The per-frame noise floor each channel must clear before its sign is counted, rad and m per frame. */
const TRUNK_FLOOR = Number(process.env.TRUNK_FLOOR ?? 0.0005);
const DEPTH_FLOOR = Number(process.env.DEPTH_FLOOR ?? 0.00002);
/**
 * **`CTRL`: the negative controls for `foldCheck`, because a check that cannot fail is not a check.** Each one builds
 * the EXPECTED geometry wrongly in exactly one way, and each must drive `errWorld` clearly off 0 on the `mass` arm:
 * - `axis` — about the body's forward axis instead of `across`;
 * - `pivot` — about the torso instead of the pelvis;
 * - `sign` — by `-fold` instead of `+fold`;
 * - `none` (the default) — the real check.
 */
const CTRL = (process.env.CTRL ?? 'none') as 'none' | 'axis' | 'pivot' | 'sign';

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
/** `qt(v, 0.5)` is the UPPER middle element, not a plain median, and every caller below says which it used. */
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const span = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] - s[0] : Number.NaN; };

interface Frame {
  t: number;
  /** The rotor's own angle, rad (forward +). */
  hip: number;
  /** The fold the mass model carried this frame, rad: `AttachedRider.trunkFold`, 0 on the default path. */
  fold: number;
  /** The drawing's own trunk input: the board-local pitch of `parts[torso] − parts[pelvis]` off the posture's up, rad. */
  trunk: number;
  /** The posture's own trunk pitch, from `this.parts`: the trunk the MASS MODEL carries, rad (forward +). */
  partTrunk: number;
  /** The DRAWN pelvis over the deck, m: exactly the quantity `pelvisOverDeck` reads, off `renderPoint(0)`. */
  pelvis: number;
  /** The posture's own pelvis over the deck, m: the leg's own channel, which the fold's pivot never moves. */
  posturePelvis: number;
  /**
   * The drawing's own depth input, dimensionless: `(STANDING_PELVIS - pelvisOverDeck) / CROUCH_DEPTH`, exactly
   * `stanceBlend.ts:75`'s. **Bigger is deeper**, which is the sense rows 2 and 3 are written in, so a trunk slaved to
   * it has correlation +1 and "opposite directions" means `sign(dTrunk) !== sign(dRigDepth)`.
   */
  rigDepth: number;
  /** The leg spring's own numbers, m. */
  legRest: number;
  legExt: number;
  /** `foldCheck`'s three errors, m: the world check on torso and head, the arms in the posture frame, and what must not move. */
  errWorld: number;
  errArms: number;
  errStill: number;
  /** How far the fold has actually moved the body's centre of mass, m: ACTUAL offsets from the pelvis against NEUTRAL ones, mass-weighted. */
  comMoved: number;
  /** The pitch ankle's own torque, N.m, and the threshold the ROTOR needs it to pass: `HIP_PITCH_SHARE * load * reach`. */
  ankle: number;
  rotorRoom: number;
}

/** The drawn swing's share of the trunk's roll (`AttachedRider`'s `SWING_DRAWN_CHEST`, not exported) [R, :828]. */
const SWING_DRAWN_CHEST = 0.35;

/**
 * **An independent check that the right parts turned about the right pivot on the right axis.**
 *
 * This replaces an earlier metric that re-applied the probe's own rotation to `parts` and differenced the two centres
 * of mass. **That number is zero by construction at matched angles, however wrong the part set, the pivot or the
 * axis** — a metric that reads correct whatever the code does is not evidence, and it is the error family that has
 * cost this track the most. So nothing here is derived from `foldTrunk`'s own formula applied to its own output.
 *
 * The reference is the **neutral posture**, `riderPose(shape, 'standing', stance).parts`, which the probe builds
 * itself and never touches, and the comparison is per part:
 *
 * - **in the WORLD, off `renderPoint`, for the pelvis, the torso and the head.** The actual world offset from the
 *   pelvis is un-swung (`swung` turns the drawn upper body about the body's forward axis by `SWING_DRAWN_CHEST` of
 *   `swing.angle`, through the pelvis [R, `:3092–3098`]) and then compared with the neutral offset turned into the
 *   world by `rider.orientation` and rotated by `fold` about **`across` = X turned by `rider.orientation`** — which
 *   is the axis `StandingBody.couple` puts the rotor's couple on, because upright `orientation` **is** `bodyFrame`
 *   [R, `:5146`] and `across` is `X` turned by `bodyFrame` [R, `:5278`]. A wrong axis, a wrong sense or a wrong pivot
 *   all show up here, and so does a part left behind or dragged along. `turned` is identity without `?agile=on`.
 * - **in the posture frame for the arms and the legs**, whose drawn points go through the arm spread and the feet's
 *   own deck placement and so are not a clean read of the part. The arms must have turned with the rotor; **both
 *   legs must be exactly the neutral posture**, and the **pelvis's own height must be the neutral one** — nothing
 *   may move them, and a pelvis moved twice shows here.
 *
 * Returns the largest error over the parts, m, split into the three groups.
 */
function foldCheck(
  rider: AttachedRider, board: BoardBody, neutral: ArrayLike<number>, fold: number, legs: readonly number[],
  scratch: { world: Vector3[]; a: Vector3; b: Vector3; q: Quaternion; axis: Vector3 },
): { world: number; arms: number; still: number } {
  const { world, a, b, q, axis } = scratch;
  for (let k = 0; k < 3; k += 1) rider.renderPoint(k, board, world[k]);
  axis.set(CTRL === 'axis' ? 0 : 1, 0, CTRL === 'axis' ? 1 : 0).applyQuaternion(rider.orientation);
  const turn = CTRL === 'sign' ? -fold : fold;
  // `pivot`: the control differences against the TORSO as the pivot, so a rotation about the pelvis reads as an error.
  const base = CTRL === 'pivot' ? 1 : 0;
  // The drawn swing, undone: it turns about the body's forward axis through the pelvis, and it is not the fold.
  const unswing = q.setFromAxisAngle(b.set(0, 0, 1).applyQuaternion(rider.orientation), -SWING_DRAWN_CHEST * rider.swing.angle);
  let worst = 0;
  for (const k of [1, 2]) {
    const actual = a.copy(world[k]).sub(world[0]).applyQuaternion(unswing);
    const want = b.set(neutral[k * 3] - neutral[base * 3], neutral[k * 3 + 1] - neutral[base * 3 + 1], neutral[k * 3 + 2] - neutral[base * 3 + 2])
      .applyQuaternion(rider.orientation).applyAxisAngle(axis, turn);
    worst = Math.max(worst, actual.distanceTo(want));
  }
  // The arms, in the posture frame: the same turn about the pelvis, on the same axis, which in `parts`' own frame is X.
  let arms = 0;
  const parts = rider.parts;
  for (let i = 1; i < RIDER_PARTS.length; i += 1) {
    if (i < 3 || legs.includes(i)) continue;
    const want = b.set(neutral[i * 3] - neutral[0], neutral[i * 3 + 1] - neutral[1], neutral[i * 3 + 2] - neutral[2]).applyAxisAngle(X_LOCAL, fold);
    arms = Math.max(arms, a.set(parts[i * 3] - parts[0], parts[i * 3 + 1] - parts[1], parts[i * 3 + 2] - parts[2]).distanceTo(want));
  }
  // What must not have moved at all: both legs whole, and the pelvis's own height.
  let still = Math.abs(parts[1] - neutral[1]);
  for (const i of legs) {
    still = Math.max(still, Math.abs(parts[i * 3] - neutral[i * 3]), Math.abs(parts[i * 3 + 1] - neutral[i * 3 + 1]), Math.abs(parts[i * 3 + 2] - neutral[i * 3 + 2]));
  }
  return { world: worst, arms, still };
}

const X_LOCAL = new Vector3(1, 0, 0);

/**
 * How far the fold has moved the body's centre of mass, m. **Descriptive, not an acceptance test.** Each part's
 * ACTUAL offset from the pelvis against its NEUTRAL one, mass-weighted: the posture's own translation is common to
 * the pelvis and every part that shifts, so it cancels in the offsets and what is left is the fold alone. Nothing
 * here re-applies `foldTrunk`'s formula.
 */
function comMovedBy(parts: ArrayLike<number>, neutral: ArrayLike<number>, masses: readonly number[]): number {
  let total = 0;
  const sum = [0, 0, 0];
  masses.forEach((m, i) => {
    for (let k = 0; k < 3; k += 1) {
      sum[k] += m * ((parts[i * 3 + k] - parts[k]) - (neutral[i * 3 + k] - neutral[k]));
    }
    total += m;
  });
  return Math.hypot(sum[0], sum[1], sum[2]) / total;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

function oneRun(arm: 'off' | 'mass', stance: 'regular' | 'goofy', crouch: number, extra: number, steer: number): Record<string, unknown> {
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
  // The owner's own address, plus the one option the pair changes.
  const rider = new AttachedRider(board.shape, {
    phase: 'standing', stance, ...(RIDER === 'new' ? { rider: 'new', feltFrame: 'deck', riderBody: 'two' } : {}),
    ...(arm === 'mass' ? { trunk: 'mass' } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  rider.crouch = crouch;
  rider.steer = steer;

  const feet = stanceFeet(board.shape);
  const middle = (feet.rear + feet.front) / 2;
  const deckY = deckHeight(board.shape, middle);
  // `STANDING_PELVIS`'s own definition (`posturePoints.ts:15-18`), rebuilt here so the probe imports no rig module.
  const standingPelvis = rider.parts[1] - deckY;
  // The feet's reach from the stance point to the support's end, m, as `preparePitch` computes `toe`/`heel`: the lever
  // the ankle's own torque has to pass HIP_PITCH_SHARE of before ANY of it reaches the hip rotor.
  const standingSupport = riderPose(board.shape, 'standing', stance).support;
  const reach = standingSupport.zMax - middle;
  // The rotor is every part the posture shifts bar the pelvis; the legs stand on the deck.
  const legs = RIDER_PARTS.map((p, i) => (p === 'leftLeg' || p === 'rightLeg' ? i : -1)).filter((i) => i >= 0);
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  // The three drawn trunk points, exactly as `RiderVisualState.points` carries them (`renderPoint` 0..2), in the
  // board's own frame. This is the rig's real input, and it is NOT the same as `parts`: `partPosition` subtracts
  // `localCenter`, which the fold moves, so the drawn pelvis rises a little as the trunk folds. That is a
  // CONSEQUENCE of the fold (the centre of mass drops and the leg holds its height), not a cause of it, and both
  // channels are reported so the distinction is visible instead of argued.
  const drawn = [new Vector3(), new Vector3(), new Vector3()];
  const inverse = new Quaternion();
  // `foldCheck`'s own reference and scratch: the neutral posture, built here and never touched.
  const neutral = riderPose(board.shape, 'standing', stance).parts;
  const masses = riderPartMasses(rider.mass);
  const scratch = { world: [new Vector3(), new Vector3(), new Vector3()], a: new Vector3(), b: new Vector3(), q: new Quaternion(), axis: new Vector3() };

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') { fell = rider.phase; fellAt = t; break; }
    // The mount's contact transient is the first ~0.17 s in every probe of this folder; 0.5 s lets the legs settle.
    if (t <= 0.5) continue;
    const parts = rider.parts;
    const hip = rider.standingBody.hip.angle;
    const fold = (rider as { trunkFold?: number }).trunkFold ?? 0;
    const err = foldCheck(rider, board, neutral, fold, legs, scratch);
    inverse.copy(board.orientation).invert();
    for (let k = 0; k < 3; k += 1) rider.renderPoint(k, board, drawn[k]).sub(board.position).applyQuaternion(inverse);
    const drawnPelvis = drawn[0].y + board.shape.centerOfMass.y - deckY;
    frames.push({
      t,
      hip,
      fold,
      // The rig's own `up` (`HumanoidRig:905-907`): the board-local pitch of torso−pelvis, forward (+z, nose) +.
      trunk: Math.atan2(drawn[1].z - drawn[0].z, drawn[1].y - drawn[0].y),
      // The posture's own trunk, from `parts`, which is what the mass model carries.
      partTrunk: Math.atan2(parts[1 * 3 + 2] - parts[2], parts[1 * 3 + 1] - parts[1]),
      pelvis: drawnPelvis,
      posturePelvis: parts[1] - deckY,
      rigDepth: (standingPelvis - drawnPelvis) / CROUCH_DEPTH,
      legRest: rider.leg.rest,
      legExt: rider.leg.extension,
      errWorld: err.world,
      errArms: err.arms,
      errStill: err.still,
      comMoved: comMovedBy(parts, neutral, masses),
      ankle: rider.standingBody.torque,
      rotorRoom: HIP_PITCH_SHARE * Math.max(0, rider.leg.force) * reach,
    });
  }

  /**
   * Row 2: the trunk's travel inside the **longest** window in which a depth channel does not move, to within
   * `tol`. Two channels are run, because they are not the same quantity and the difference is the honest part:
   * - **`legExt`**, the leg spring's own achieved compression, m: the leg's own state, and the cleanest reading of
   *   "a fixed leg depth". The fold does not enter it except through the load.
   * - **`pelvis`**, the DRAWN pelvis over the deck, m: the one input of `HumanoidRig.ts:1383-1385`'s formula. This
   *   one is **not** quite independent of the fold: `partPosition` subtracts `localCenter`, which the fold moves, so
   *   the drawn pelvis rises by about 19 mm at 0.5 rad of fold - the centre of mass dropped and the leg holds its
   *   height. That is a consequence of the fold, in the direction that would UNFOLD the old formula, and it is
   *   reported rather than argued away.
   */
  const holdOn = (pick: (x: Frame) => number, tol: number) => {
    let best = { frames: 0, trunk: Number.NaN, at: Number.NaN, moved: Number.NaN };
    for (let a = 0; a < frames.length; a += 1) {
      let lo = pick(frames[a]);
      let hi = lo;
      for (let b = a; b < frames.length; b += 1) {
        lo = Math.min(lo, pick(frames[b]));
        hi = Math.max(hi, pick(frames[b]));
        if (hi - lo > tol) break;
        const count = b - a + 1;
        const reach = span(frames.slice(a, b + 1).map((x) => x.partTrunk));
        if (count > best.frames || (count === best.frames && reach > best.trunk)) {
          best = { frames: count, trunk: reach, at: frames[a].t, moved: hi - lo };
        }
      }
    }
    return best;
  };
  const holdPelvis = holdOn((x) => x.pelvis, HOLD);
  const holdLeg = holdOn((x) => x.legExt, HOLD);

  // Row 3: the frames where the two channels move in OPPOSITE directions, both clear of their own noise floor.
  let moved = 0;
  let opposed = 0;
  let together = 0;
  for (let i = 1; i < frames.length; i += 1) {
    const dTrunk = frames[i].partTrunk - frames[i - 1].partTrunk;
    const dDepth = frames[i].rigDepth - frames[i - 1].rigDepth;
    if (Math.abs(dTrunk) < TRUNK_FLOOR || Math.abs(dDepth) < DEPTH_FLOOR / CROUCH_DEPTH) continue;
    moved += 1;
    // `rigDepth` is bigger when deeper, and the slaved formula makes the drawn trunk an INCREASING function of it, so
    // its own correlation is +1 and the row-3 event is the two signs DIFFERING.
    if (Math.sign(dTrunk) !== Math.sign(dDepth)) opposed += 1;
    else together += 1;
  }

  // The headline trunk channel is the fold ON THE LEGS (`partTrunk`), which is what the rotor turns and what the rig
  // reads through `up` once `orientation` is undone; `trunk` (the drawn points in the BOARD's frame) carries the body
  // frame's own pitch and bank as well and is kept only as a diagnostic.
  const trunks = frames.map((x) => x.partTrunk * DEG);
  const hips = frames.map((x) => x.hip * DEG);
  const depths = frames.map((x) => x.pelvis);
  const errWorld = frames.map((x) => x.errWorld);
  return {
    rider: RIDER, arm, stance, crouch, extra, steer, hold: HOLD,
    n: frames.length, fell: fell || null, fellAt: r(fellAt, 3),
    // The rotor itself, °: if this never moves there is nothing for rows 1-3 to carry.
    hipSpan: r(span(hips), 2), hipPeak: r(Math.max(0, ...hips.map(Math.abs)), 2),
    // The channel the DRAWING reads, °, and the one the drawn depth formula reads, m.
    trunkSpan: r(span(trunks), 2), trunkLow: r(qt(trunks, 0), 2), trunkHigh: r(span(trunks) + qt(trunks, 0), 2),
    pelvisSpan: r(span(depths), 4), pelvisUpperMid: r(qt(depths, 0.5), 4),
    // Row 2, on the two channels above. `hold*` is the drawn formula's own input; `leg*` is the leg spring's own.
    holdFrames: holdPelvis.frames, holdSeconds: r(holdPelvis.frames * STEP, 3), holdAt: r(holdPelvis.at, 3),
    holdDepthSpan: r(holdPelvis.moved, 5), holdTrunkSpan: r(holdPelvis.trunk * DEG, 2),
    legFrames: holdLeg.frames, legSeconds: r(holdLeg.frames * STEP, 3), legAt: r(holdLeg.at, 3),
    legMoved: r(holdLeg.moved, 5), legTrunkSpan: r(holdLeg.trunk * DEG, 2),
    // Row 3.
    moved, opposed, together, opposedShare: moved > 0 ? r(opposed / moved, 4) : null,
    // `foldCheck`: did the right parts turn about the right pivot on the right axis, and did the rest stay put? All
    // three are errors against the NEUTRAL posture and the rotor's angle, and all three target 0.
    errWorldPeak: r(Math.max(0, ...errWorld), 6), errArmsPeak: r(Math.max(0, ...frames.map((x) => x.errArms)), 6),
    errStillPeak: r(Math.max(0, ...frames.map((x) => x.errStill)), 6), ctrl: CTRL,
    // Descriptive: how far the fold actually moved the body's centre of mass, m.
    comMovedPeak: r(Math.max(0, ...frames.map((x) => x.comMoved)), 4),
    // **Row 1, at MATCHING time levels.** `foldTrunk` runs inside `updatePosture`, which `prepare()` calls BEFORE
    // `preparePitch` advances the rotor, so the parts carry the rotor's angle as of the previous substep. `foldGap`
    // is the fold the parts actually carry against `trunkFold`, the angle they were folded by — an identity, and it
    // must be 0. `lagGap` is the same thing against `hip.angle` read at the END of the frame, which is one substep
    // later: it is the SAMPLING LAG, not a disagreement, and on the default path it is the rotor's whole angle,
    // because `parts` never folds at all. That difference between the two columns is row 1's finding.
    foldGapPeak: r(Math.max(0, ...frames.map((x) => Math.abs(x.partTrunk - x.fold) * DEG)), 6),
    lagGapPeak: r(Math.max(0, ...frames.map((x) => Math.abs(x.partTrunk - x.hip) * DEG)), 4),
    // Whether the ROTOR is reachable at all on this bench: its drive is the ankle's torque past `rotorRoom`.
    anklePeak: r(Math.max(0, ...frames.map((x) => Math.abs(x.ankle))), 1),
    rotorRoomLow: r(qt(frames.map((x) => x.rotorRoom), 0), 1),
    overRoom: frames.filter((x) => Math.abs(x.ankle) > x.rotorRoom).length,
  };
}

const rows: Record<string, unknown>[] = [];
for (const arm of ARMS) {
  for (const stance of STANCES) {
    for (const crouch of CROUCHES) {
      for (const extra of EXTRAS) {
        for (const steer of STEERS) {
          const row = oneRun(arm, stance, crouch, extra, steer);
          rows.push(row);
          emit(row);
        }
      }
    }
  }
}

// The paired summary, so no single run is read as the finding.
for (const arm of ARMS) {
  const mine = rows.filter((x) => x.arm === arm);
  const num = (key: string) => mine.map((x) => Number(x[key])).filter(Number.isFinite);
  process.stderr.write(`${arm}: runs ${mine.length} frames ${num('n').reduce((a, b) => a + b, 0)} `
    + `hipSpan ${f(qt(num('hipSpan'), 0))}-${f(qt(num('hipSpan'), 1))}° `
    + `trunkSpan ${f(qt(num('trunkSpan'), 0))}-${f(qt(num('trunkSpan'), 1))}° `
    + `holdTrunkSpan ${f(qt(num('holdTrunkSpan'), 0))}-${f(qt(num('holdTrunkSpan'), 1))}° over ${f(qt(num('holdSeconds'), 0), 2)}-${f(qt(num('holdSeconds'), 1), 2)} s `
    + `legTrunkSpan ${f(qt(num('legTrunkSpan'), 0))}-${f(qt(num('legTrunkSpan'), 1))}° over ${f(qt(num('legSeconds'), 0), 2)}-${f(qt(num('legSeconds'), 1), 2)} s `
    + `opposed ${mine.reduce((a, x) => a + Number(x.opposed ?? 0), 0)} of ${mine.reduce((a, x) => a + Number(x.moved ?? 0), 0)} moving frames `
    + `errWorld ${f(qt(num('errWorldPeak'), 1), 6)} errArms ${f(qt(num('errArmsPeak'), 1), 6)} errStill ${f(qt(num('errStillPeak'), 1), 6)} m `
    + `foldGap ${f(qt(num('foldGapPeak'), 1), 6)}° lagGap ${f(qt(num('lagGapPeak'), 1), 3)}° comMoved ${f(qt(num('comMovedPeak'), 1), 4)} m `
    + `fell ${mine.filter((x) => x.fell).length} of ${mine.length}\n`);
}
