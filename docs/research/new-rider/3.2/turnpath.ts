/**
 * Step 3.2v: **where the rest of the turn goes.**
 *
 * Part 19 measured, with `COMPRESS_PULL` deleted and `?hull=rail` on, a body lean of 31.1° (from 0.60°) and a lateral
 * load factor of 0.418 g (from 0.005) — *more than twice* the 0.19 g the cheat fakes — and the compressed turn still
 * stopping at 49–79° of the 85° the acceptance gate asks, against 101–137° with the cheat. This probe answers the one
 * question that leaves: **where does the rest of the turn go?**
 *
 * It runs the owner's own acceptance movement (`libturn.ts` part F: the Canyon-matched `FaceWater` — 1.4 m, 2.6 m deep,
 * 16°, 5.7 m/s — in trim across the face at SIDE off the fall line, Compress held, the stick over to `steer` until the
 * board is ACROSS° off the fall line, then centred and held) and traces, **every frame**:
 *
 * - **The heading, signed and unwrapped** (`turnedDeg`), beside the probe's own unsigned `acos` gate metric
 *   (`fromFallDeg`). 3.2q's lesson was an unsigned metric read as a signed one; this says in one column whether the
 *   gate's number folds. The axis is the **world vertical** throughout.
 * - **The roll path, link by link**: the stick, the lean the balance asks for (`bankReference`), the lean the body
 *   holds (`bank.angle`), the board's roll against the water's normal, and the heading — with each link's own rate, so
 *   a rate limit shows as a flat-topped rate and a travel limit as a flat-topped angle.
 * - **The yaw ledger by source** (`BoardBody.yawLedger`, step 3.2q's tool): who twisted the board about the world
 *   vertical — the fins, the rails' side faces, the hull's pressure, the friction, the added mass, the suction, and
 *   `rider`, the residual the contact carries. Integrated over the turn this is the heading's **angular impulse booked
 *   by source**, which is the "where does it come from" ledger in N·m·s.
 * - **The three bugs told apart.** 101–137° with the cheat against 49–79° without can be a rate limit, a duration limit
 *   or a fall arriving first, and those are three different bugs. Each run is classed: `gate` (reached ACROSS while the
 *   stick was still over), `window` (the stick centred at TURN_LIMIT with the rider still up and the heading short), or
 *   `fell` (down before the window closed, heading still advancing).
 *
 * Two diagnostic flags close Part 19 §5's open `[I]` — *why does the section make him lean at all* — and neither needs
 * a fourth hull, which is the reason it named them: `RAIL_POWER=2` puts the **squared** taper back on the section's own
 * patch layout (the band kept, the thickness redistribution undone), and `RAIL_FACES=on` re-enables the **rail
 * side-face foils** alongside the band. Part 19's own named test already refuted the patch-centre-quantization
 * hypothesis (12 across: bank 0.95° against 4-across's 0.60°), so that is not re-run.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/new-rider/3.2/turnpath.ts -o <scratch>/tp.mjs --format esm --platform node
 *
 *   # the six cells: the cheat and the section, each with its own turn window
 *   RIDER=old                             OUT=<scratch>/flat-on.jsonl  node <scratch>/tp.mjs
 *   RIDER=old PULL=off                    OUT=<scratch>/flat-off.jsonl node <scratch>/tp.mjs
 *   RIDER=old PULL=off HULL=rail RAIL_SUCTION=off OUT=<scratch>/sec-off.jsonl node <scratch>/tp.mjs
 *
 *   # the two flags Part 19 §5 named
 *   RIDER=old PULL=off HULL=rail RAIL_SUCTION=off RAIL_POWER=2 OUT=<scratch>/sec-sq.jsonl   node <scratch>/tp.mjs
 *   RIDER=old PULL=off HULL=rail RAIL_SUCTION=off RAIL_FACES=on OUT=<scratch>/sec-faces.jsonl node <scratch>/tp.mjs
 *
 * Env: RIDER=new|old, STANCES, EXTRAS, STEERS, ACROSS, TURN_LIMIT, HOLD, SIDE, AHEAD, HULL=rail, RAIL_SUCTION=off,
 * RAIL_POWER, RAIL_FACES=on, PULL=off, LEG_DRIVE, SUBSTEPS, OUT (one JSON line a run), TRACE (one JSON line a frame).
 */
import { appendFileSync, writeFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { buildBoardShape } from '../../../../src/physics/BoardShape';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const G = 9.81;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const STANCES = (process.env.STANCES ?? 'compress').split(',') as Stance[];
const ACROSS = num('ACROSS', 85);
const HOLD = num('HOLD', 5);
const TURN_LIMIT = num('TURN_LIMIT', 4);
const SIDE = num('SIDE', -45);
const AHEAD = num('AHEAD', 0.75);
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = num('DEPTH', 2.6);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;
type Stance = 'tall' | 'crouch' | 'compress';

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 2) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
/** A true median — the mean of the middle two on an even count, which is what Part 19's own tables report. */
const median = (v: number[]) => {
  const s = sorted(v);
  if (!s.length) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const peak = (v: number[]) => (sorted(v).length ? Math.max(...sorted(v)) : Number.NaN);
const span = (v: number[]) => (sorted(v).length ? `${f(sorted(v)[0])}–${f(peak(v))}` : '–');

/** The yaw ledger's own columns, in the order they are reported. `rider` is the residual the contact carries. */
const YAW = ['fins', 'rails', 'pressure', 'friction', 'addedMass', 'radiation', 'buoyancy', 'froth', 'suction', 'bed', 'gyro', 'rider', 'total'] as const;
const WATER = ['buoyancy', 'pressure', 'addedMass', 'radiation', 'friction', 'bed', 'fins', 'rails', 'froth'] as const;

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown, path = OUT): void {
  if (path) appendFileSync(path, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** Wrapped to (−180, 180]. */
const wrap = (d: number) => ((d + 540) % 360) - 180;

interface Frame {
  t: number;
  phase: string;
  steer: number;
  /** Signed, unwrapped, °: how far the board's nose has come round from where it started, positive the turn's way. */
  turned: number;
  /** The probe's own gate metric, `acos(fwd · fall)` — unsigned, so it folds past 180°. */
  fromFall: number;
  /** Signed, unwrapped, °: how far the board's **path** through the water has come round, same datum and sign. */
  pathTurned: number;
  /** The three links of the roll path, signed, °: the lean the balance asks for, the lean the body holds, the board's roll. */
  leanRef: number;
  bank: number;
  roll: number;
  /** °/s, each link's own rate. */
  turnRate: number;
  bankRate: number;
  rollRate: number;
  /** Signed drift: the path's angle off the nose, horizontal, positive the turn's way (the way a carve slips out). */
  drift: number;
  /** The system's horizontal acceleration toward the buried rail, g. */
  latG: number;
  speed: number;
  nUp: number;
  wet: number;
  /** The yaw ledger, N·m about the **world vertical**, positive turning the nose toward the board's left. */
  yaw: Record<string, number>;
  /** The cheat's own work on the body this frame, J (`RiderWork.assist`), and the carry's and the lean-out's. */
  assistW: number;
  carryW: number;
  leanOutW: number;
  /**
   * **The balance's three limits, every frame** (`AttachedRider.balanceReserve`, step 3.2v's job 1a). The reserve the
   * game shows is `min` of these; which one it is, the game computes and throws away:
   * - `margin` — the capture point's own margin, 0 at the feet's edge plus whatever the hip swing can still catch;
   * - `gripLeft` = 1 − `frictionUsed`, the feet's grip left against the push across the deck;
   * - `kneeLeft` = 1 − `kneeUsed`, the knees' strength left under the load.
   * `limit` is the contact's own binding limit this frame (`'tip'`, `'slip'`, `'impact'`, `'flight'`, `'none'`),
   * `binds` which of the three is least, and `load` the feet's own load in body weights — the capture test's validity
   * condition, because under CAPTURE_LOAD the margin is frozen and means nothing.
   */
  margin: number;
  gripLeft: number;
  kneeLeft: number;
  reserve: number;
  binds: string;
  limit: string;
  load: number;
  /** `capture.beyond` and `capture.weightPast`: the two the fall test is actually `&&` of. */
  beyond: boolean;
  weightPast: boolean;
  /**
   * **Which way the weight leaves the feet** — the one number that says what kind of fall this is, and the game throws
   * it away too. `past` is how far the capture point is past the feet's edge, m, and `axis` whether that is **across**
   * the board (rail to rail: the weight off the side, which is what a washout looks like) or **along** it (over the
   * nose or the tail). Read off `CaptureState`: `pastAcross` carries the across part signed, and `past` is the larger
   * of the two, so `|pastAcross| >= past` means across bound.
   */
  past: number;
  pastAcross: number;
  axis: string;
  /**
   * **The capture point across, split into its two terms**, because they are two different bugs. It is
   * `pointAcross + speedAcross / ω`: the first is where the body's own weight line meets the deck (the body **leaning
   * out**, a position), the second how fast the body is moving across relative to the feet over the pendulum's own
   * rate (the body **being left behind**, a velocity). Both in m, on the across axis of the board, signed the turn's
   * way. If the fall is the position term the body is out of place; if it is the velocity term the body is in place
   * and moving, which is a different cure.
   */
  capAcross: number;
  capPoint: number;
  capSpeedTerm: number;
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
  const h = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(h), 0, Math.cos(h));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const section = process.env.HULL === 'rail' ? ('rail' as const) : ('flat' as const);
  const power = process.env.RAIL_POWER ? Number(process.env.RAIL_POWER) : undefined;
  const across = num('ACROSS_N', 4);
  const board = new BoardBody({
    ...(section === 'rail' ? { hull: 'rail' as const } : {}),
    ...(process.env.RAIL_SUCTION === 'off' ? { railSuction: 'off' as const } : {}),
    ...(process.env.RAIL_FACES === 'on' ? { railFaces: 'on' as const } : {}),
    ...(across === 4 && power === undefined ? {} : { shape: buildBoardShape(undefined, 12, across, section, power) }),
  });
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(process.env.LEG_DRIVE === 'on' || process.env.LEG_DRIVE === 'turn' ? { legDrive: process.env.LEG_DRIVE as 'on' | 'turn' } : {}),
    ...(process.env.PULL === 'off' ? { compressPull: 'off' as const } : {}),
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
  });
  board.attach(rider);
  stance(rider, st);
  const weight = (board.mass + rider.mass) * G;
  /**
   * Read off the instance: private to TypeScript, present at run time. `bankReference` is the old rider's balance
   * reference and `leanAsked` the new one's; `frictionUsed`, `kneeUsed` and `limit` are the two of
   * `balanceReserve`'s three terms the game does not expose and the contact's own binding limit.
   */
  const inner = rider as unknown as {
    bankReference?: number; leanAsked?: number; frictionUsed?: number; kneeUsed?: number; limit?: string;
  };
  const fwd = new Vector3();
  const up = new Vector3();
  const total = new Vector3();
  const vRel = new Vector3();
  const leftB = new Vector3();
  const nW = new Vector3();
  const sideV = new Vector3();
  const fallAngle = Math.atan2(fall.x, fall.z) * DEG;
  /** The signed heading off the fall line, unwrapped across frames: `undefined` until the first frame sets the datum. */
  let unwrapped = Number.NaN;
  let lastRaw = Number.NaN;
  let pathUnwrapped = Number.NaN;
  let lastPathRaw = Number.NaN;
  const heading = () => {
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const raw = wrap(Math.atan2(fwd.x, fwd.z) * DEG - fallAngle);
    if (!Number.isFinite(unwrapped)) unwrapped = raw;
    else unwrapped += wrap(raw - lastRaw);
    lastRaw = raw;
    return unwrapped;
  };
  const pathHeading = () => {
    const s = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const vx = board.velocity.x - s.flowX;
    const vz = board.velocity.z - s.flowZ;
    if (!(Math.hypot(vx, vz) > 0.05)) return pathUnwrapped;
    const raw = wrap(Math.atan2(vx, vz) * DEG - fallAngle);
    if (!Number.isFinite(pathUnwrapped)) pathUnwrapped = raw;
    else pathUnwrapped += wrap(raw - lastPathRaw);
    lastPathRaw = raw;
    return pathUnwrapped;
  };
  BoardBody.yawLedger = true;
  const frames: Frame[] = [];
  const h0 = heading();
  const p0 = pathHeading();
  /**
   * The turn's sign: the **stick's**, measured — a positive steer takes the signed heading up, so `way = sign(steer)`
   * makes every signed column below read positive for progress.
   *
   * It is the stick's and not the placement's, and that is worth a line because it is the shape of the movement.
   * Placed at SIDE = −45° the board is 45° round from the fall line on one side, and the stick turns it **toward and
   * straight through** the fall line, out to +87° on the other side: the gate's own unsigned `acos` therefore runs
   * **45° → 0.5° → 85°**, not 45° → 85°. So the gate asks for about **130° of heading rotation**, not 40°, and its
   * metric is not monotonic in the turn. Reading the sign the other way round takes the maximum off the wrong end of
   * the series, which is how this probe's first run reported a 91° "fold" that was its own bug.
   */
  const way = Math.sign(steer) || 1;
  let phase = 'turn';
  let fell = '';
  let fellAt = Number.NaN;
  let acrossAt = Number.NaN;
  let lastH = h0;
  let lastP = p0;
  let lastBank = 0;
  let lastRoll = 0;
  let lastAssist = 0;
  let lastCarry = 0;
  let lastLeanOut = 0;
  rider.steer = steer;
  for (let i = 0; i < Math.round((TURN_LIMIT + HOLD) / STEP); i += 1) {
    const t = (i + 1) * STEP;
    // The wave moves under the rider, as `libturn.ts` part F steps it. Leaving it out is not a small difference: it
    // took this probe's flat/cheat-on cell from Part 19's 101–137° to 110–156° and its flat/cheat-off gate from
    // 0 of 6 to 2 of 6, because a standing wave never catches up with the board and never takes the face away.
    water.advance(STEP);
    board.step(STEP, water);
    const hNow = heading();
    const pNow = pathHeading();
    total.set(0, 0, 0);
    for (const key of WATER) total.add((board.forces as unknown as Record<string, Vector3>)[key]);
    up.set(0, 1, 0).applyQuaternion(board.orientation);
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
    const sp = vRel.length();
    leftB.set(1, 0, 0).applyQuaternion(board.orientation);
    nW.set(cen.normalX, cen.normalY, cen.normalZ);
    const roll = Math.asin(Math.max(-1, Math.min(1, leftB.dot(nW)))) * DEG;
    // Toward the buried rail: the board's own −x·sign(roll) side, on the horizontal.
    const buried = Math.sign(roll) || 1;
    sideV.set(-buried, 0, 0).applyQuaternion(board.orientation).setY(0);
    const latG = sideV.lengthSq() > 1e-9
      ? (total.x * sideV.normalize().x + total.z * sideV.z) / weight
      : Number.NaN;
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const drift = Math.hypot(vRel.x, vRel.z) > 0.05
      ? Math.atan2(vRel.x * fwd.z - vRel.z * fwd.x, vRel.x * fwd.x + vRel.z * fwd.z) * DEG
      : 0;
    // The board's roll rate about its own long axis, °/s.
    fwd.set(0, 0, 1).applyQuaternion(board.orientation);
    const rollRate = board.angularVelocity.dot(fwd) * DEG;
    const work = rider.work as unknown as Record<string, number>;
    // The three limits `balanceReserve` takes the least of, named so a fall can say which one broke.
    const cap = rider.human.state;
    const margin = cap.margin;
    const gripLeft = 1 - (inner.frictionUsed ?? 0);
    const kneeLeft = 1 - (inner.kneeUsed ?? 0);
    const binds = margin <= gripLeft && margin <= kneeLeft ? 'margin' : gripLeft <= kneeLeft ? 'grip' : 'knee';
    const bank = rider.bank.angle * DEG;
    const leanRef = (inner.bankReference ?? inner.leanAsked ?? 0) * DEG;
    const frame: Frame = {
      t,
      phase,
      steer: rider.steer,
      turned: way * (hNow - h0),
      fromFall: Math.abs(wrap(hNow)),
      pathTurned: way * (pNow - p0),
      leanRef: way * leanRef,
      bank: way * bank,
      roll: way * roll,
      turnRate: (way * (hNow - lastH)) / STEP,
      bankRate: (way * (bank - lastBank)) / STEP,
      rollRate: way * rollRate,
      drift: way * drift,
      latG,
      speed: sp,
      nUp: total.dot(up) / weight,
      wet: board.wettedArea,
      yaw: Object.fromEntries(YAW.map((k) => [k, way * (board.yaw as unknown as Record<string, number>)[k]])),
      assistW: work.assist - lastAssist,
      carryW: work.carry - lastCarry,
      leanOutW: work.leanOut - lastLeanOut,
      margin, gripLeft, kneeLeft, reserve: rider.balanceReserve, binds, limit: inner.limit ?? 'none',
      load: Number.isFinite(rider.contact.weight) ? rider.contact.weight : Number.NaN,
      beyond: cap.beyond, weightPast: cap.weightPast,
      past: cap.past, pastAcross: way * cap.pastAcross,
      axis: cap.past <= 0 ? 'none' : Math.abs(cap.pastAcross) >= cap.past - 1e-12 ? 'across' : 'along',
      capAcross: way * cap.across, capPoint: way * cap.pointAcross,
      capSpeedTerm: cap.omega > 0 ? (way * cap.speedAcross) / cap.omega : Number.NaN,
    };
    frames.push(frame);
    lastH = hNow;
    lastP = pNow;
    lastBank = bank;
    lastRoll = roll;
    lastAssist = work.assist;
    lastCarry = work.carry;
    lastLeanOut = work.leanOut;
    if (TRACE) emit({ bar: 'turnpath-frame', cell: cellName(), stance: st, extra, steer, ...frame }, TRACE);
    // The movement's own rule, `libturn.ts`'s verbatim: the stick is centred when the gate's **unsigned** metric
    // reaches ACROSS, or when the turn window runs out — whichever comes first.
    if (phase === 'turn' && (frame.fromFall >= ACROSS || t >= TURN_LIMIT)) { phase = 'hold'; acrossAt = t; rider.steer = 0; }
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  BoardBody.yawLedger = false;
  const turning = frames.filter((x) => x.phase === 'turn');
  const col = (k: keyof Frame) => frames.map((x) => Number(x[k]));
  const turnCol = (k: keyof Frame) => turning.map((x) => Number(x[k]));
  const maxTurned = peak(col('turned'));
  const maxFromFall = peak(col('fromFall'));
  /**
   * The same heading **without** the gate's wrap: `|SIDE| + turned`. Past 180° the gate's own `acos` folds back and
   * reads a smaller number for a bigger turn — 3.2q's unsigned-metric artefact, stated here as a column rather than
   * assumed away.
   */
  const maxUnfolded = peak(frames.map((x) => Math.abs(h0 + way * x.turned)));
  const reached = maxFromFall >= ACROSS;
  /** When the heading stopped advancing: the frame of its own maximum. */
  const atMax = frames.reduce((best, x) => (x.turned > best.turned ? x : best), frames[0]);
  /** The three bugs, told apart. */
  const why = reached && Number.isFinite(acrossAt) && acrossAt < TURN_LIMIT - 1e-9 ? 'gate'
    : fell && Number.isFinite(fellAt) && fellAt < TURN_LIMIT - 1e-9 ? 'fell'
      : 'window';
  /** The angular impulse about the world vertical, by source, over the turn: N·m·s. */
  const impulse = Object.fromEntries(YAW.map((k) => [k, r(turning.reduce((sum, x) => sum + x.yaw[k] * STEP, 0), 3)]));
  /** The last half second of the turn: a heading still climbing here is a window limit, a flat one an equilibrium. */
  const tail = turning.filter((x) => x.t >= (turning[turning.length - 1]?.t ?? 0) - 0.5);
  /**
   * **Job 1a and 1b, the fall's own ledger.** The three limits at the last frame and over the half second before it;
   * which one bound; whether the feet's grip was saturated on the way down (`limit === 'slip'` at any point in that
   * window), which is the signature of a slide rather than a topple; and **the window a recovery would have had** —
   * how long the board was slipping more than SLIDE° before the rider let go. A short window means no recovery could
   * have helped; a long one means the rider had the time and did nothing with it.
   */
  const SLIDE = num('SLIDE', 8);
  const last = frames[frames.length - 1];
  const half = frames.filter((x) => x.t >= (last?.t ?? 0) - 0.5);
  const loaded = half.filter((x) => Number.isFinite(x.load) && x.load >= 0.1);
  /** The first frame of the unbroken run of slipping that ends at the fall: the slide's own start. */
  let slideFrom = Number.NaN;
  for (let i = frames.length - 1; i >= 0; i -= 1) {
    if (Math.abs(frames[i].drift) >= SLIDE) slideFrom = frames[i].t;
    else if (Number.isFinite(slideFrom)) break;
  }
  const everSlid = frames.some((x) => Math.abs(x.drift) >= SLIDE);
  return {
    bar: 'turnpath', cell: cellName(), rider: RIDER, stance: st, extra, steer, side: SIDE, across: ACROSS, turnLimit: TURN_LIMIT,
    why, reached, fell, fellAtS: r(fellAt, 2), acrossAtS: r(acrossAt, 2), frames: frames.length, turnFrames: turning.length,
    startFromFallDeg: r(frames[0]?.fromFall ?? Number.NaN, 1),
    maxTurnedDeg: r(maxTurned, 1), maxFromFallDeg: r(maxFromFall, 1), atMaxS: r(atMax?.t ?? Number.NaN, 2),
    /** What the gate's unsigned metric reports against the unfolded heading: a gap is a fold. */
    maxUnfoldedDeg: r(maxUnfolded, 1), foldDeg: r(maxUnfolded - maxFromFall, 2),
    turnedInWindowDeg: r(turning.length ? turning[turning.length - 1].turned : Number.NaN, 1),
    turnRateMedian: r(median(turnCol('turnRate')), 2), turnRatePeak: r(peak(turnCol('turnRate')), 2),
    turnRateTail: r(median(tail.map((x) => x.turnRate)), 2),
    pathTurnedInWindowDeg: r(turning.length ? turning[turning.length - 1].pathTurned : Number.NaN, 1),
    leanRefPeakDeg: r(peak(turnCol('leanRef')), 1), bankPeakDeg: r(peak(turnCol('bank')), 1), rollPeakDeg: r(peak(turnCol('roll')), 1),
    leanRefMedianDeg: r(median(turnCol('leanRef')), 1), bankMedianDeg: r(median(turnCol('bank')), 1), rollMedianDeg: r(median(turnCol('roll')), 1),
    bankRatePeak: r(peak(turnCol('bankRate')), 1), rollRatePeak: r(peak(turnCol('rollRate')), 1),
    driftMedianDeg: r(median(turnCol('drift')), 2), driftPeakDeg: r(peak(turnCol('drift')), 1),
    latGMedian: r(median(turnCol('latG')), 3), latGPeak: r(peak(turnCol('latG')), 3),
    nUpMedian: r(median(turnCol('nUp')), 3),
    speedStart: r(turning[0]?.speed ?? Number.NaN, 2), speedMedian: r(median(turnCol('speed')), 2),
    assistJ: r(turning.reduce((s, x) => s + x.assistW, 0), 1),
    carryJ: r(turning.reduce((s, x) => s + x.carryW, 0), 1),
    leanOutJ: r(turning.reduce((s, x) => s + x.leanOutW, 0), 1),
    yawImpulse: impulse,
    yawMedian: Object.fromEntries(YAW.map((k) => [k, r(median(turning.map((x) => x.yaw[k])), 3)])),
    // Job 1a: the three limits at the fall, and which bound.
    bindsAtFall: last?.binds ?? null, limitAtFall: last?.limit ?? null,
    marginAtFall: r(last?.margin ?? Number.NaN, 3), gripAtFall: r(last?.gripLeft ?? Number.NaN, 3), kneeAtFall: r(last?.kneeLeft ?? Number.NaN, 3),
    beyondAtFall: last?.beyond ?? null, weightPastAtFall: last?.weightPast ?? null,
    /** Over the half second before the end, loaded frames only — the margin means nothing under CAPTURE_LOAD. */
    marginHalf: r(median(loaded.map((x) => x.margin)), 3), gripHalf: r(median(loaded.map((x) => x.gripLeft)), 3), kneeHalf: r(median(loaded.map((x) => x.kneeLeft)), 3),
    bindsHalf: ['margin', 'grip', 'knee'].map((k) => `${k}:${loaded.filter((x) => x.binds === k).length}`).join(' '),
    slipInHalf: half.filter((x) => x.limit === 'slip').length, tipInHalf: half.filter((x) => x.limit === 'tip').length,
    loadedInHalf: loaded.length, framesInHalf: half.length,
    // Job 1b: the slide, and the window a recovery would have had.
    everSlid, slideFromS: r(slideFrom, 2), slideWindowS: r((last?.t ?? Number.NaN) - slideFrom, 2),
    driftAtFall: r(last?.drift ?? Number.NaN, 1), speedAtFall: r(last?.speed ?? Number.NaN, 2),
    /** Which way the weight left the feet at the fall, and how far past the edge it was, m. */
    axisAtFall: last?.axis ?? null, pastAtFall: r(last?.past ?? Number.NaN, 3), pastAcrossAtFall: r(last?.pastAcross ?? Number.NaN, 3),
    capAcrossAtFall: r(last?.capAcross ?? Number.NaN, 3), capPointAtFall: r(last?.capPoint ?? Number.NaN, 3), capSpeedAtFall: r(last?.capSpeedTerm ?? Number.NaN, 3),
    /**
     * **How long the margin took to collapse**: from the last frame at which it was still over `MARGIN_FROM` (0.5 by
     * default — half the reserve left) to the fall. It is the window *any* in-the-loop recovery would have, whatever
     * the recovery is, so it bounds job 1c before job 1c is designed.
     */
    marginFellOverS: r((() => {
      const level = num('MARGIN_FROM', 0.5);
      const end = last?.t ?? Number.NaN;
      for (let i = frames.length - 1; i >= 0; i -= 1) if (frames[i].margin > level) return end - frames[i].t;
      return Number.NaN;
    })(), 2),
    /**
     * **Does a postural settle exist today?** (step 3.2v, the owner's model: *player makes a move → balance changes →
     * the surfer's own system fixes it*.) The movement centres the stick at `acrossAt` and then holds for HOLD s, so
     * the settle is already in every run: `reserveAtCentre` is the reserve on the frame the stick goes to zero and
     * `reserveAfter*` the reserve that long after it, with `settleGain` the best of the three less the reserve at the
     * centring. A system that restores the reserve toward neutral shows a positive gain; one that only reflects the
     * physics shows zero or less. Frames after the rider is off the board do not exist, so a run that falls inside the
     * window reports `null` past the fall and is counted separately.
     */
    ...(() => {
      const centre = frames.find((x) => x.phase === 'hold');
      if (!centre) return { reserveAtCentre: null, reserveAfter05: null, reserveAfter1: null, reserveAfter2: null, settleGain: null, settleHeld: false };
      const at = (dt: number) => frames.find((x) => x.t >= centre.t + dt - 1e-9)?.reserve ?? Number.NaN;
      const after = [at(0.5), at(1), at(2)];
      return {
        reserveAtCentre: r(centre.reserve, 3),
        reserveAfter05: r(after[0], 3), reserveAfter1: r(after[1], 3), reserveAfter2: r(after[2], 3),
        settleGain: r(peak(after) - centre.reserve, 3),
        settleHeld: after.every(Number.isFinite),
      };
    })(),
  };
}

function cellName(): string {
  const bits = [process.env.HULL === 'rail' ? (process.env.RAIL_SUCTION === 'off' ? 'section' : 'section+suction') : 'flat'];
  bits.push(process.env.PULL === 'off' ? 'cheat off' : 'cheat on');
  if (process.env.RAIL_POWER) bits.push(`power ${process.env.RAIL_POWER}`);
  if (process.env.RAIL_FACES === 'on') bits.push('side faces');
  if (process.env.ACROSS_N) bits.push(`${process.env.ACROSS_N} across`);
  return bits.join(', ');
}

const rows: Record<string, unknown>[] = [];
if (OUT) writeFileSync(OUT, '');
if (TRACE) writeFileSync(TRACE, '');
const t0 = Date.now();
for (const st of STANCES) for (const extra of EXTRAS) for (const steer of STEERS) {
  const row = oneRun(st, extra, steer);
  rows.push(row);
  emit(row);
}
const take = (k: string) => rows.map((x) => Number(x[k])).filter(Number.isFinite);
console.log(`\n## turnpath — ${cellName()}, rider ${RIDER}, window ${f(TURN_LIMIT, 1)} s + ${f(HOLD, 1)} s hold, gate ${f(ACROSS, 0)}°, start ${f(Math.abs(SIDE), 0)}° off the fall line`);
console.log(`   ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall · the face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s, depth ${f(DEPTH, 1)} m`);
console.log(`   the gate: ${rows.filter((x) => x.reached).length} of ${rows.length} · why each run stopped: ${['gate', 'window', 'fell'].map((w) => `${w} ${rows.filter((x) => x.why === w).length}`).join(' · ')}`);
console.log(`   heading: reached ${span(take('maxFromFallDeg'))}° off the fall line · came round ${span(take('maxTurnedDeg'))}° from the start · in the window ${span(take('turnedInWindowDeg'))}° · the unsigned metric's fold ${span(take('foldDeg'))}°`);
console.log(`   the heading's own rate: ${f(median(take('turnRateMedian')), 2)} °/s median, ${f(peak(take('turnRatePeak')), 1)} °/s peak · over the window's last half second ${span(take('turnRateTail'))} °/s`);
console.log(`   the roll path: lean asked ${f(median(take('leanRefMedianDeg')))}° (peak ${f(peak(take('leanRefPeakDeg')))}°) → body ${f(median(take('bankMedianDeg')))}° (peak ${f(peak(take('bankPeakDeg')))}°) → board roll ${f(median(take('rollMedianDeg')))}° (peak ${f(peak(take('rollPeakDeg')))}°) → heading ${f(median(take('turnedInWindowDeg')))}°`);
console.log(`   drift ${f(median(take('driftMedianDeg')), 2)}° median, ${f(peak(take('driftPeakDeg')))}° peak · lateral ${f(median(take('latGMedian')), 3)} g median, ${f(peak(take('latGPeak')), 3)} g peak · nUp ${f(median(take('nUpMedian')), 3)}`);
console.log(`   the cheat's work on the body: assist ${f(median(take('assistJ')), 1)} J · carry ${f(median(take('carryJ')), 1)} J · lean-out ${f(median(take('leanOutJ')), 1)} J`);
const fell = rows.filter((x) => x.fell);
console.log(`   job 1a — the falls: ${fell.length} of ${rows.length} went down · by cause ${[...new Set(fell.map((x) => String(x.fell)))].map((c) => `${c} ${fell.filter((x) => x.fell === c).length}`).join(' · ') || '—'}`);
console.log(`     which of the three bound at the fall: ${['margin', 'grip', 'knee'].map((k) => `${k} ${fell.filter((x) => x.bindsAtFall === k).length}`).join(' · ')} · the contact's own limit there: ${[...new Set(fell.map((x) => String(x.limitAtFall)))].map((c) => `${c} ${fell.filter((x) => x.limitAtFall === c).length}`).join(' · ') || '—'}`);
console.log(`     the three over the half second before, loaded frames: margin ${f(median(fell.map((x) => Number(x.marginHalf))), 3)} · grip left ${f(median(fell.map((x) => Number(x.gripHalf))), 3)} · knee left ${f(median(fell.map((x) => Number(x.kneeHalf))), 3)}`);
console.log(`     the feet's grip saturated on the way down (limit 'slip'), frames of the last 0.5 s: ${span(fell.map((x) => Number(x.slipInHalf)))} of ${span(fell.map((x) => Number(x.framesInHalf)))} · tipping ${span(fell.map((x) => Number(x.tipInHalf)))}`);
console.log(`     which way the weight left the feet: ${['across', 'along', 'none'].map((k) => `${k} ${fell.filter((x) => x.axisAtFall === k).length}`).join(' · ')} · past the edge by ${span(fell.map((x) => Number(x.pastAtFall)))} m`);
console.log(`     the capture point across at the fall, ${f(median(fell.map((x) => Number(x.capAcrossAtFall))), 3)} m median = the body leaning out ${f(median(fell.map((x) => Number(x.capPointAtFall))), 3)} m + the body's own speed across ${f(median(fell.map((x) => Number(x.capSpeedAtFall))), 3)} m (spans ${span(fell.map((x) => Number(x.capPointAtFall)))} and ${span(fell.map((x) => Number(x.capSpeedAtFall)))})`);
console.log(`   job 1b — the slide: ${fell.filter((x) => x.everSlid).length} of ${fell.length} falls were sliding over ${f(num('SLIDE', 8), 0)}° at some point · for ${span(fell.filter((x) => x.everSlid).map((x) => Number(x.slideWindowS)))} s before going down · drift at the fall ${span(fell.map((x) => Number(x.driftAtFall)))}° at ${span(fell.map((x) => Number(x.speedAtFall)))} m/s`);
console.log(`     and the window **any** recovery would have: the margin fell from over ${f(num('MARGIN_FROM', 0.5), 2)} to the fall in ${span(fell.map((x) => Number(x.marginFellOverS)))} s (median ${f(median(fell.map((x) => Number(x.marginFellOverS))), 2)})`);
{
  const settled = rows.filter((x) => x.reserveAtCentre !== null);
  const held = settled.filter((x) => x.settleHeld);
  console.log(`   the settle after the stick is centred (the owner's "the surfer's own system fixes it"): ${settled.length} of ${rows.length} runs got that far · ${held.length} of them were still up 2 s later`);
  if (settled.length) {
    console.log(`     the reserve at the centring ${f(median(settled.map((x) => Number(x.reserveAtCentre))), 3)} → +0.5 s ${f(median(settled.map((x) => Number(x.reserveAfter05))), 3)} → +1 s ${f(median(settled.map((x) => Number(x.reserveAfter1))), 3)} → +2 s ${f(median(settled.map((x) => Number(x.reserveAfter2))), 3)} · the best gain ${f(median(settled.map((x) => Number(x.settleGain))), 3)} median (${span(settled.map((x) => Number(x.settleGain)))})`);
    console.log(`     runs whose reserve came back up at all after the centring: ${settled.filter((x) => Number(x.settleGain) > 0.01).length} of ${settled.length}`);
  }
}
console.log('   the yaw ledger over the turn, N·m·s about the world vertical (positive the turn\'s way):');
for (const k of YAW) {
  const v = rows.map((x) => Number((x.yawImpulse as Record<string, number>)[k])).filter(Number.isFinite);
  console.log(`     ${k.padEnd(10)} ${f(median(v), 3).padStart(9)} median  (${span(v)})`);
}
