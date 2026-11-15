/**
 * Step 3.2w: **why the new rider falls standing still.**
 *
 * Step 3.2v's control (`turnpath.ts`, `RIDER=new STEERS=0`) measured the one thing this round is for: the new rider
 * falls **12 of 12** riding in trim with the stick never touched, on the Canyon-matched `FaceWater` the old rider rides
 * **0 of 12** on. Its trace said the body's bank runs 8.8 → 60.7° monotonically with the board's roll following the
 * other way, the board tracking inside 3.2° of straight and the feet keeping 91 % of their grip. It could not say
 * **which link of the roll loop** does that, because every link between the senses and the ankle is private.
 *
 * This probe reads them. Same harness as `turnpath.ts`'s trim cell — the same `FaceWater` (1.4 m, 2.6 m deep, 16°,
 * 5.7 m/s), the same placement 45° off the fall line AHEAD of the crest, the same `water.advance(STEP)`, the stick at
 * zero throughout — and traces, every frame, the roll loop **link by link** off the live instance (private to
 * TypeScript, present at run time):
 *
 * - **the body's bank** (`bank.angle`) and its rate, and **the board's roll about the heading from the world's level**,
 *   which is the angle the ankle actually spans (`prepareBank`'s own `roll`), plus the **rail** angle against the
 *   water's own normal, which is what the hull feels. 3.2v traced the rail and called it the roll; they are not the
 *   same number on a 16° face and the difference is the face's slope.
 * - **the ankle's own span** `bank.angle − roll − ankleRest`, the angle HUMAN_ANKLE_STIFFNESS acts on. A human ankle
 *   has about ±0.5 rad of travel; this is the number that says whether the model's ankle is inside a body's.
 * - **the commands**: `ankleRest` (the rest the balance sends, through the motor lag), `heldAnkleRaw` (what the
 *   predictor asked for before the feet's reach and the rail's bite clipped it), `ankleTorque`, and the hip's
 *   `swingTorque` with `swing.angle` — so a command that saturates shows as a flat top and a command that is simply
 *   absent shows as a zero.
 * - **the senses the controller is fed**: the load the soles feel (`loadSense`, m/s², adapted), the board's nose-up
 *   pitch rate (`pitchRateSense`), and the feet's load in body weights (`captureLoad`), which is the capture point's
 *   own validity condition.
 * - **the balance's three limits** and the capture point split into its position and velocity terms, as 3.2v's.
 *
 * Variants, each one switch and no code change:
 * - `GAINS=bank,rate,forward` passes `humanGains`, which turns the **predictor off** and runs step 3.2's own delayed
 *   law (`humanBank`) with those gains. `GAINS=0,0.1,0.1` is HUMAN_BANK_*' own values. This is the one knob that tells
 *   a predictor bug from a plant bug: if the body diverges under both laws it is not the controller.
 * - `RATE_SENSE=difference` feeds the controller the bank's change over a substep instead of the canals' absolute rate.
 * - **step 3.2x**: `HIP_GAIN` is `balance.hipCapture`, N·m/m — the hip's gain on the capture point past HIP_SHARE of
 *   the feet's half-width (`HumanBalance.sensedCaptureHip`). `HIP_GAIN=0` is 3.2w's rider, the hip untriggered;
 *   a negative one is the sign check. `ANKLE_RATE` is `balance.ankleRestRate`, rad/s, the rest's slew bound
 *   (`ANKLE_RATE=inf` for 3.2w's unbounded rest). The probe adds the hip's own columns: the trigger signal `capHip`,
 *   the swing's angle and torque (already traced), and the first time the swing torque passes 20 N·m.
 * - `SUBSTEPS`, `YAW_INERTIA`, `FACE`, `DEPTH`, `SIDE`, `AHEAD`, `SECONDS` as the other probes.
 * - `FROZEN=1` holds the stick at zero **and** the wave still (no `water.advance`), to separate the face moving under
 *   the rider from the rider's own loop.
 *
 * Run from the repository's root:
 *   npx rolldown docs/research/new-rider/3.2/trimbank.ts -o <scratch>/tb.mjs --format esm --platform node
 *   RIDER=new STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/new.jsonl node <scratch>/tb.mjs
 *   RIDER=old STANCES=compress,tall EXTRAS=-3,-2,-1,0,1.5,3 OUT=<scratch>/old.jsonl node <scratch>/tb.mjs
 *   RIDER=new STANCES=tall EXTRAS=0 TRACE=<scratch>/t.jsonl node <scratch>/tb.mjs
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
const num = (name: string, fallback: number) => (process.env[name] ? Number(process.env[name]) : fallback);

const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0').split(',').map(Number);
type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall').split(',') as Stance[];
const SECONDS = num('SECONDS', 9);
const SIDE = num('SIDE', -45);
const AHEAD = num('AHEAD', 0.75);
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = num('DEPTH', 2.6);
const FROZEN = process.env.FROZEN === '1';
const GAINS = process.env.GAINS ? process.env.GAINS.split(',').map(Number) : undefined;
/** Step 3.2x: the hip's gain, N·m/m, and the ankle rest's slew bound, rad/s ('inf' for none). Unset leaves the code's own. */
const HIP_GAIN = process.env.HIP_GAIN === undefined ? undefined : Number(process.env.HIP_GAIN);
const ANKLE_RATE = process.env.ANKLE_RATE === undefined ? undefined
  : /^inf/i.test(process.env.ANKLE_RATE) ? Number.POSITIVE_INFINITY : Number(process.env.ANKLE_RATE);
/** Step 3.2x: the share of the deck's own roll the ankle's rest carries, 0-1 (0 is 3.2w's rider, square to the deck). */
const PLUMB = process.env.PLUMB === undefined ? undefined : Number(process.env.PLUMB);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE;

const f = (v: number, d = 1) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const median = (v: number[]) => {
  const s = sorted(v);
  if (!s.length) return Number.NaN;
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};
const span = (v: number[], d = 1) => (sorted(v).length ? `${f(sorted(v)[0], d)}–${f(sorted(v)[sorted(v).length - 1], d)}` : '–');

function stance(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown, path?: string): void {
  if (path) appendFileSync(path, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** The roll loop's links, read off the instance every frame. */
interface Frame {
  t: number;
  /** °: the body's lean on its feet, the board's roll about the heading from the world's level, and the rail against the water's normal. */
  bank: number;
  roll: number;
  rail: number;
  /** °/s. */
  bankRate: number;
  rollRate: number;
  /** °: the ankle's own span, `bank − roll − ankleRest`, the angle HUMAN_ANKLE_STIFFNESS acts on. */
  ankleSpan: number;
  /** °: the rest commanded (through the motor lag) and what the controller asked for before the clips. */
  ankleRest: number;
  ankleRaw: number;
  /** N·m. */
  ankleTorque: number;
  swingTorque: number;
  /** °. */
  swingAngle: number;
  /** The senses: m/s², rad/s, body weights. */
  loadSense: number;
  pitchRateSense: number;
  captureLoad: number;
  /** The three limits and the capture point's split. */
  margin: number;
  gripLeft: number;
  kneeLeft: number;
  binds: string;
  limit: string;
  past: number;
  capAcross: number;
  capPoint: number;
  capSpeedTerm: number;
  /** Step 3.2x: the hip's trigger signal, m — the capture point past HIP_SHARE of the feet's half-width, signed board +x. */
  capHip: number;
  /** The capture point's own terms: ω₀ (1/s), the CoM's height over the feet (m), the felt vertical's tilt across (°),
   * the room the hip can still catch past the edge (m), and the two booleans the fall test is the `&&` of. */
  omega: number;
  comHeight: number;
  tilt: number;
  reach: number;
  beyond: boolean;
  weightPast: boolean;
  /**
   * **The old rider's own fall test, read on the new rider** (`AttachedRider.endStep`: the body's position error from
   * its postural target, m, against RECOVERABLE_ERROR = 0.25). The two riders do not share a fall test — standing
   * free it is `human.fallen`, the capture point; otherwise it is this — so this column says whether the new rider
   * would have stayed up under the old rider's test on the same water.
   */
  sway: number;
  /** The board's own motion, for context. */
  speed: number;
  drift: number;
}

interface Inner {
  bankReference?: number;
  leanAsked?: number;
  frictionUsed?: number;
  kneeUsed?: number;
  limit?: string;
  ankleRest?: number;
  ankleTorque?: number;
  swingTorque?: number;
  swing?: { angle: number; rate: number };
  heldAnkleRaw?: number;
  loadSense?: number;
  pitchRateSense?: number;
  captureLoad?: number;
  legLoad?: number;
  bankSpeed?: number;
  legLength?: number;
  sway?: { x: number; y: number; z: number };
  postureError?: number;
}

function oneRun(st: Stance, extra: number): Record<string, unknown> {
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
  const board = new BoardBody({});
  board.place(
    new Vector3(px, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(GAINS ? { humanGains: { bank: GAINS[0], bankRate: GAINS[1], forward: GAINS[2] } } : {}),
    ...(process.env.RATE_SENSE || process.env.WEIGHTS || process.env.RAIL_CAP || HIP_GAIN !== undefined || ANKLE_RATE !== undefined || PLUMB !== undefined
      ? {
        balance: {
          ...(process.env.RATE_SENSE ? { rateSense: process.env.RATE_SENSE as 'canal' | 'difference' } : {}),
          ...(process.env.WEIGHTS ? { weights: JSON.parse(process.env.WEIGHTS) } : {}),
          ...(process.env.RAIL_CAP ? { railCap: Number(process.env.RAIL_CAP) } : {}),
          ...(HIP_GAIN !== undefined ? { hipCapture: HIP_GAIN } : {}),
          ...(ANKLE_RATE !== undefined ? { ankleRestRate: ANKLE_RATE } : {}),
          ...(PLUMB !== undefined ? { anklePlumb: PLUMB } : {}),
        },
      }
      : {}),
    ...(process.env.SUBSTEPS ? { standingSubsteps: Number(process.env.SUBSTEPS) } : {}),
    ...(process.env.YAW_INERTIA ? { yawInertiaScale: Number(process.env.YAW_INERTIA) } : {}),
  });
  board.attach(rider);
  stance(rider, st);
  rider.steer = 0;
  const inner = rider as unknown as Inner;
  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const vRel = new Vector3();
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let lastBank = Number.NaN;
  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    if (!FROZEN) water.advance(STEP);
    board.step(STEP, water);
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    // `prepareBank`'s own two angles, recomputed here: the board's roll about the heading from the world's level
    // (what the ankle spans), and the rail against the water's own normal (what the hull feels).
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    fwd.set(0, 0, 1).applyQuaternion(board.orientation);
    const rollRate = board.angularVelocity.dot(fwd) * DEG;
    const bank = rider.bank.angle * DEG;
    const ankleRest = (inner.ankleRest ?? 0) * DEG;
    vRel.set(board.velocity.x - cen.flowX, board.velocity.y - cen.flowY, board.velocity.z - cen.flowZ);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    const cap = rider.human.state;
    const gripLeft = 1 - (inner.frictionUsed ?? 0);
    const kneeLeft = 1 - (inner.kneeUsed ?? 0);
    const frame: Frame = {
      t,
      bank,
      roll,
      rail,
      bankRate: Number.isFinite(lastBank) ? (bank - lastBank) / STEP : Number.NaN,
      rollRate,
      ankleSpan: bank - roll - ankleRest,
      ankleRest,
      ankleRaw: (inner.heldAnkleRaw ?? Number.NaN) * DEG,
      ankleTorque: inner.ankleTorque ?? Number.NaN,
      swingTorque: inner.swingTorque ?? Number.NaN,
      swingAngle: (inner.swing?.angle ?? Number.NaN) * DEG,
      loadSense: inner.loadSense ?? Number.NaN,
      pitchRateSense: inner.pitchRateSense ?? Number.NaN,
      captureLoad: inner.captureLoad ?? Number.NaN,
      margin: cap.margin,
      gripLeft,
      kneeLeft,
      binds: cap.margin <= gripLeft && cap.margin <= kneeLeft ? 'margin' : gripLeft <= kneeLeft ? 'grip' : 'knee',
      limit: inner.limit ?? 'none',
      past: cap.past,
      capAcross: cap.across,
      capPoint: cap.pointAcross,
      capSpeedTerm: cap.omega > 0 ? cap.speedAcross / cap.omega : Number.NaN,
      capHip: cap.hipPast,
      omega: cap.omega,
      comHeight: cap.height,
      tilt: cap.tiltAcross * DEG,
      reach: cap.reach,
      beyond: cap.beyond,
      weightPast: cap.weightPast,
      sway: Math.hypot(inner.sway?.x ?? Number.NaN, inner.sway?.z ?? Number.NaN),
      speed: vRel.length(),
      drift: Math.hypot(vRel.x, vRel.z) > 0.05
        ? Math.atan2(vRel.x * fwd.z - vRel.z * fwd.x, vRel.x * fwd.x + vRel.z * fwd.z) * DEG
        : 0,
    };
    frames.push(frame);
    lastBank = bank;
    if (TRACE) emit({ bar: 'trimbank-frame', rider: RIDER, stance: st, extra, ...frame }, TRACE);
    if (!rider.attached) { fell = String(rider.separation); fellAt = t; break; }
  }
  const col = (k: keyof Frame) => frames.map((x) => Number(x[k]));
  const abs = (k: keyof Frame) => frames.map((x) => Math.abs(Number(x[k])));
  const last = frames[frames.length - 1];
  return {
    bar: 'trimbank', rider: RIDER, stance: st, extra, gains: GAINS?.join(',') ?? 'predictor', frozen: FROZEN,
    fell, fellAtS: r(fellAt, 2), frames: frames.length,
    /** The first frame's own numbers: the lean the mount leaves the body with (square to the deck), and the deck's own roll. */
    bank0Deg: r(frames[0]?.bank ?? Number.NaN, 2), roll0Deg: r(frames[0]?.roll ?? Number.NaN, 2),
    /** The body's CoM offset across at the first frame, m, against the feet's own half-width (0.13 m). */
    offset0: r((frames[0]?.comHeight ?? Number.NaN) * Math.sin((frames[0]?.bank ?? Number.NaN) / DEG), 3),
    bankPeakDeg: r(Math.max(...abs('bank')), 1), rollPeakDeg: r(Math.max(...abs('roll')), 1),
    railPeakDeg: r(Math.max(...abs('rail')), 1),
    ankleSpanPeakDeg: r(Math.max(...abs('ankleSpan')), 1), ankleSpanMedianDeg: r(median(abs('ankleSpan')), 1),
    ankleRestPeakDeg: r(Math.max(...abs('ankleRest')), 2), ankleRawPeakDeg: r(Math.max(...abs('ankleRaw')), 2),
    ankleTorquePeak: r(Math.max(...abs('ankleTorque')), 0), ankleTorqueMedian: r(median(abs('ankleTorque')), 0),
    swingTorquePeak: r(Math.max(...abs('swingTorque')), 0), swingAnglePeakDeg: r(Math.max(...abs('swingAngle')), 1),
    /** Step 3.2x: the hip's trigger — its peak signal, m, the first time it opened, s, and the first time the swing passed 20 N·m, s. */
    capHipPeak: r(Math.max(...abs('capHip')), 3),
    hipOpenedAtS: r(frames.find((x) => Math.abs(x.capHip) > 0)?.t ?? Number.NaN, 2),
    hipFiredAtS: r(frames.find((x) => Math.abs(x.swingTorque) > 20)?.t ?? Number.NaN, 2),
    loadSensePeak: r(Math.max(...abs('loadSense')), 2), pitchSensePeak: r(Math.max(...abs('pitchRateSense')), 2),
    captureLoadMedian: r(median(col('captureLoad')), 2),
    marginAtFall: r(last?.margin ?? Number.NaN, 3), bindsAtFall: last?.binds ?? '–', limitAtFall: last?.limit ?? '–',
    pastAtFall: r(last?.past ?? Number.NaN, 3),
    capAtFall: r(last?.capAcross ?? Number.NaN, 3), capPointAtFall: r(last?.capPoint ?? Number.NaN, 3),
    capSpeedAtFall: r(last?.capSpeedTerm ?? Number.NaN, 3),
    driftAtFall: r(last?.drift ?? Number.NaN, 2), speedAtFall: r(last?.speed ?? Number.NaN, 2),
    driftPeakDeg: r(Math.max(...abs('drift')), 1),
    swayPeak: r(Math.max(...abs('sway')), 3), swayAtFall: r(last?.sway ?? Number.NaN, 3),
    /** The frames whose sway passed RECOVERABLE_ERROR: 0 means the old rider's test would not have called this a fall. */
    swayOver: frames.filter((x) => x.sway > 0.25).length,
    omegaMedian: r(median(col('omega')), 2), comHeightMedian: r(median(col('comHeight')), 3),
    tiltPeakDeg: r(Math.max(...abs('tilt')), 1), reachMedian: r(median(col('reach')), 3),
    reachAtFall: r(last?.reach ?? Number.NaN, 3), tiltAtFall: r(last?.tilt ?? Number.NaN, 1),
    omegaAtFall: r(last?.omega ?? Number.NaN, 2),
  };
}

const rows: Record<string, unknown>[] = [];
const t0 = Date.now();
for (const st of STANCES) for (const extra of EXTRAS) rows.push(oneRun(st, extra));
for (const row of rows) emit(row, OUT);
const nf = (k: string) => rows.map((x) => Number(x[k]));
const fellRows = rows.filter((x) => x.fell);
const law = RIDER === 'old' ? "the old rider's own" : GAINS ? `gains ${GAINS.join(',')}` : 'predictor';
console.log(`## trimbank — rider ${RIDER}, law ${law}${FROZEN ? ', wave frozen' : ''}${process.env.WEIGHTS ? ` · weights ${process.env.WEIGHTS}` : ''}`);
console.log(`   ${rows.length} runs, ${f((Date.now() - t0) / 1000, 0)} s wall · face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s, ${SECONDS} s each`);
console.log(`   fell: ${fellRows.length} of ${rows.length}${fellRows.length ? ` at ${span(fellRows.map((x) => Number(x.fellAtS)), 2)} s` : ''} · bound ${['margin', 'grip', 'knee'].map((k) => `${k} ${fellRows.filter((x) => x.bindsAtFall === k).length}`).join(' · ')}`);
console.log(`   the mount: the body's first-frame lean ${span(nf('bank0Deg'), 2)}° on a deck rolled ${span(nf('roll0Deg'), 2)}° · its CoM ${span(nf('offset0'), 3)} m across, feet's half-width 0.130 m`);
console.log(`   the body's bank peak ${span(nf('bankPeakDeg'))}° · the board's roll peak ${span(nf('rollPeakDeg'))}° · the rail peak ${span(nf('railPeakDeg'))}°`);
console.log(`   the ankle's own span: peak ${span(nf('ankleSpanPeakDeg'))}° · median ${span(nf('ankleSpanMedianDeg'))}° (a human ankle has about ±29°)`);
console.log(`   the commands: rest peak ${span(nf('ankleRestPeakDeg'), 2)}° · raw peak ${span(nf('ankleRawPeakDeg'), 2)}° · ankle torque peak ${span(nf('ankleTorquePeak'), 0)} N·m (median ${span(nf('ankleTorqueMedian'), 0)})`);
console.log(`   the hip: swing torque peak ${span(nf('swingTorquePeak'), 0)} N·m · swing angle peak ${span(nf('swingAnglePeakDeg'))}°`);
console.log(`   the hip's trigger (3.2x): signal peak ${span(nf('capHipPeak'), 3)} m · opened at ${span(nf('hipOpenedAtS'), 2)} s · swing passed 20 N·m at ${span(nf('hipFiredAtS'), 2)} s`);
console.log(`   the senses: load ${span(nf('loadSensePeak'), 2)} m/s² · pitch rate ${span(nf('pitchSensePeak'), 2)} rad/s · feet's load median ${span(nf('captureLoadMedian'), 2)} body weights`);
console.log(`   at the fall: margin ${span(nf('marginAtFall'), 3)} · past ${span(nf('pastAtFall'), 3)} m · capture ${span(nf('capAtFall'), 3)} m = lean ${span(nf('capPointAtFall'), 3)} + speed ${span(nf('capSpeedAtFall'), 3)}`);
console.log(`   the capture point's own terms: ω₀ median ${span(nf('omegaMedian'), 2)} 1/s · CoM height ${span(nf('comHeightMedian'), 3)} m · the hip's reach past the edge ${span(nf('reachMedian'), 3)} m (feet's half-width 0.13) · felt tilt peak ${span(nf('tiltPeakDeg'))}°`);
console.log(`   at the fall: ω₀ ${span(nf('omegaAtFall'), 2)} · reach ${span(nf('reachAtFall'), 3)} m · felt tilt ${span(nf('tiltAtFall'))}°`);
console.log(`   the old rider's own test, read on this rider: posture error peak ${span(nf('swayPeak'), 3)} m against RECOVERABLE_ERROR 0.250 · at the fall ${span(nf('swayAtFall'), 3)} m · frames over it ${span(nf('swayOver'), 0)}`);
console.log(`   the board: drift peak ${span(nf('driftPeakDeg'))}° · at the fall ${span(nf('driftAtFall'), 2)}° at ${span(nf('speedAtFall'), 2)} m/s`);
