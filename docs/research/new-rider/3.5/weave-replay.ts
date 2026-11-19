/**
 * **Step 3.5h, part 1: does the stale-sense / present-design mismatch produce the command?**
 *
 * The owner rode `claude/ride-everything` and reported, in tall, crouch and Compress alike: *"the board starts going
 * left and right and the surfer cannot stabilize it and falls. Like a skate board going down the lane"*, clarified
 * since as *"weaving start starts on its own, no turn needed"*. ⚠️ **His own ride is a FEEL REPORT and not a
 * zero-input measurement** — the sampled pad values in it are unknown, and today's Compress finding shows the input
 * layer can differ from what a player believes he asked for. The clean zero-command comparison is the saved `cue`
 * trace: zero steer, zero asked lean, which is what this file replays.
 *
 * ## The hypothesis under test, stated so it can fail
 *
 * `PredictiveController.tick` [R, `predictiveBalance.ts:1531–1578`] builds its whole design from the speed the board
 * has **now**:
 *
 *     const d = this.blend(speed, depth, rail);                 // the CURRENT speed, depth and rail
 *     ...
 *     const yk  = this.senses[this.senses.length - 1 - N];      // the sense from N ticks (0.1 s) ago
 *     const old = this.commands[this.commands.length - 1 - N];  // the command from N ticks ago
 *     // and then `yk` and `old` are propagated through d.phiE / d.gammaE / d.cE / d.l — all from `d`.
 *
 * So **a measurement taken 0.1 s ago is propagated by a model built for the speed the board has now.** The reading
 * on offer was that on a wave whose through-water speed swings hard, that mismatch produces the command.
 *
 * ⛔ **The hypothesis is DAMAGED before this file runs, and the damage is recorded here rather than discovered
 * later.** `cue` wave 6 has the LARGER speed jump (+4.93 m/s in 0.117 s against wave 1's +2.01) and produces a
 * command span of 2.5° against wave 1's 23.45°, with 0.199° of deck roll against 24.3°. A speed-driven mechanism
 * predicts the opposite ordering. This file therefore measures the schedule's contribution rather than assuming it,
 * and wave 6 is a row of the table and not an aside.
 *
 * ## The measurement: matched-observation, which is the only version that isolates the schedule
 *
 * Every arm is fed **the same saved tick inputs in the same order** — the eight arguments `AttachedRider` passes at
 * `:3724`, recorded by `3.5/weave-split.ts` on the probe's side — so the arms differ in the design table and in
 * nothing else. No arm re-simulates: a re-simulation would change the state the next tick sees and the comparison
 * would no longer be of the schedule.
 *
 * | arm | the estimator's `phiE`, `gammaE`, `cE`, `l` | the predictor's `phiN`, `pred`, `predD` | `k`, the reference |
 * | --- | --- | --- | --- |
 * | **`ships`** | the design at the speed NOW | NOW | NOW |
 * | **`harness`** | NOW, through THIS FILE's own rewrite of `tick` | NOW | NOW |
 * | **`estThen`** | **the design at the speed the sense was TAKEN at** | NOW | NOW |
 * | **`chainThen`** | **TAKEN** | **TAKEN** | NOW |
 *
 * ⭐ **Two positive controls, and the round is void without both:**
 *
 *  1. **`ships` must reproduce the recorded command bit for bit** (`u0`, `u1`, `raw0`, `raw1`). It is the real
 *     `PredictiveController.tick` fed the real inputs, so any difference is a harness fault — a dropped tick, a
 *     rounded input, the wrong weights — and not a finding.
 *  2. **`harness` must equal `ships` bit for bit.** `harness` is this file's own rewrite of `tick` with the
 *     historical design set equal to the current one, so it is the SAME arithmetic by a different route. If it
 *     differs, the rewrite is wrong and `estThen`/`chainThen` measure the rewrite's bug, not the schedule.
 *
 * `N` is `Design.steps` = `round(PREDICT_DELAY / CONTROL_STEP)` = `round(0.1 / (1/60))` = **6 ticks**, and the same
 * for every design because `delay` and `step` come from the weights, not the speed [R, `predictiveBalance.ts:1202`].
 * On the first `N` ticks there is no tick 6 back; those are counted (`earlyTicks`) and take the earliest recorded
 * speed, which is stated on the row rather than hidden.
 *
 * ## The weights are the SHIPPED ones, taken off a live rider and not retyped
 *
 * `AttachedRider` builds `new PredictiveController(weights, options.balance?.turn ?? 'tan')` in its constructor
 * [R, `:2558`], and the weights come out of the owner's own address through the game's own switch parsing. This file
 * constructs a `RideSession` on that address and reads the private `weights` and `turn` off the live controller, so
 * the design table under every arm is the table the ride ran on. `weightsHash` is emitted so a reader can see the
 * two files agree.
 *
 * ## Units and frames, because four slipped on this track today
 *
 * Every angle in `tick`'s arguments and returns is **radians in `predictiveBalance.ts`'s own signs**, which are the
 * engine's negated: `sense[0] = −bank.angle`, the ask is `−leanAsked`, and `AttachedRider` reads the command back as
 * `heldAnkleRaw = −predictor.raw[0]`. Degrees appear only in the `*Deg` columns, converted exactly once. `speed` is
 * the **through-water along-heading** speed — `boardVelocity · forward − waterFlow·forward` on the RIDER's 3-D
 * heading [R, `:3714`] — and **not** the over-ground magnitude; it is the same quantity the lean cap is built on.
 * `depth` is `yawDepth`, m. `rail` is the SCHEDULE's rail, rad, the rail that would hold the lean asked.
 *
 * Reads only. Imports nothing it writes to, changes no constant, no switch and no pose.
 *
 *     ./node_modules/.bin/rolldown docs/research/new-rider/3.5/weave-replay.ts -o <s>/rraw.mjs --format esm --platform node
 *     printf "globalThis.location = { search: '' };\n" > <s>/weave-replay.mjs
 *     cat <s>/rraw.mjs >> <s>/weave-replay.mjs
 *     cd <s> && env TICKS=<s>/ticks.jsonl WAVES=1,2,6,11 SCRIPT=cue node weave-replay.mjs
 */
import { readFileSync } from 'node:fs';
import { surfZoneConfigFor } from '../../../../src/game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../../../../src/game/SurfConditions';
import { RideSession } from '../../../../src/physics/RideSession';
import { PredictiveController, type Design, type DesignWeights } from '../../../../src/physics/predictiveBalance';
import { type SurfZoneConfig } from '../../../../src/wave/SurfZoneSimulation';

const DEG = 180 / Math.PI;
const TICKS = process.env.TICKS ?? '';
const WAVES = (process.env.WAVES ?? '1,2,6,11').split(',').map(Number);
const SCRIPT = process.env.SCRIPT ?? 'cue';
const ADDRESS = process.env.ADDRESS ?? '?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on';
const SIZE = (process.env.SIZE ?? 'medium') as SwellSize;
const SEED = Number(process.env.SEED ?? 2);
/** The window to print tick by tick, in SECONDS after the stand; `0,0` prints none. */
const FROM = Number(process.env.FROM ?? 1.4);
const TO = Number(process.env.TO ?? 1.7);

const out = (s: string): void => process.stdout.write(`${s}\n`);
const f = (v: number, d = 4): string => (Number.isFinite(v) ? v.toFixed(d) : '–');
const pad = (s: string, w: number): string => s.padStart(w);

/** Which operating point a block of the tick reads its design at. */
type Where = 'now' | 'then' | 'frozen';
interface Point { speed: number; depth: number; rail: number }

interface TickRec {
  frame: number; tAt: number; n: number;
  sense: number[]; speed: number; depth: number; bank: number; twist: number;
  ankleLo: number; ankleHi: number; twistLim: number; rail: number; tilt: number;
  u0: number; u1: number; raw0: number; raw1: number;
}
interface Block { kind: string; arm: string; script: string; wave: number; stand: number | null; fell: number | null; ticks: TickRec[] }

// ---------------------------------------------------------------------------------------------------------------
// The shipped weights, off a live rider on the owner's own address.
// ---------------------------------------------------------------------------------------------------------------
/**
 * The address, through the game's own switch parsing — `3.5/weave-split.ts`'s own `configFor`, `RIDER_KEYS` and
 * `riderOptions` copied VERBATIM, so the rider this file reads the design off is the rider that ran.
 */
const RIDER_KEYS = [
  'stroke', 'swim', 'extension', 'duckBody', 'snap', 'snapQuick', 'snapPivot', 'snapRecentre', 'snapDepth', 'snapStamp',
  'agile', 'legDrive', 'hull', 'railSuction', 'compressPull', 'carveFlex', 'snapLegs', 'snapCross', 'legPower', 'rider',
  'feltFrame', 'kneeRoom', 'stanceReach', 'ankleLimit', 'ankleRange', 'bankClamp', 'bodyBank', 'askCap', 'stanceDeep',
  'deepen', 'armCarry', 'trunk', 'buoyFrame', 'waterHeel', 'mountAgree', 'riderBody', 'riderCost', 'plantFloor',
  'deckHollow', 'snapUpturn',
] as const;
type Config = SurfZoneConfig & Record<string, unknown>;
function configFor(search: string): Config {
  (globalThis as { location?: { search: string } }).location = { search };
  const settings = physicalSettingsFor('canyon', { swell: SIZE, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
  return { ...surfZoneConfigFor(settings, SEED, true), compute: 'cpu' } as Config;
}
const config = configFor(ADDRESS);
const options: Record<string, unknown> = {};
for (const key of RIDER_KEYS) if (config[key] !== undefined) options[key] = config[key];
const live = new RideSession(options as ConstructorParameters<typeof RideSession>[0]);
const liveCtrl = live.rider.predictor as unknown as { weights?: DesignWeights; turn: 'linear' | 'tan' };
const WEIGHTS = liveCtrl.weights;
const TURN = liveCtrl.turn;
out(`# address: ${ADDRESS}`);
out(`# riderOptions: ${JSON.stringify(options)}`);
out(`# weights: ${WEIGHTS ? JSON.stringify(WEIGHTS) : 'undefined (DEFAULT_WEIGHTS)'}`);
out(`# turn: ${TURN}`);

// ---------------------------------------------------------------------------------------------------------------
// `tick`, rewritten here so the estimator's design can be a different one from the predictor's. Every line below is
// `predictiveBalance.ts:1531–1578` in order; the ONLY departure is which design each block reads.
// ---------------------------------------------------------------------------------------------------------------
const N_COMMAND = 2;
interface Arm {
  /** The design factories. Each is a real controller used only for its own `blend`, because `blend` returns a
   * SCRATCH object it mutates in place — two designs in one tick need two factories or the second overwrites the
   * first. Never ticked. */
  now: PredictiveController; then: PredictiveController;
  /**
   * ⭐ **Which operating point each block of the tick reads its design at.** This is the whole instrument: the three
   * blocks are independent, and a result that moves when one of them moves names that block.
   *   * `est`   — the estimator's `phiE`, `gammaE`, `cE`, `l`: the propagation of the 0.1 s-old sense.
   *   * `chain` — the predictor's `phiN`, `pred`, `predD`: the forward propagation from that estimate to now.
   *   * `gain`  — `k` and the reference: the response to the error.
   * `'now'` is the speed the board has now (what ships), `'then'` the speed the sense was TAKEN at (the hypothesis),
   * `'frozen'` a single fixed operating point for the whole ride (the schedule removed altogether).
   */
  est: Where; chain: Where; gain: Where;
  /** The fixed operating point any `'frozen'` block reads. */
  frozen?: Point;
  /** A third factory, so three different designs can be live inside one tick without sharing a scratch. */
  froz: PredictiveController;
  senses: number[][]; commands: number[][]; estimate: number[];
  predicted: number[]; sent: number[]; raw: number[];
}
const makeArm = (est: Where, chain: Where, gain: Where, frozen?: Point): Arm => ({
  now: new PredictiveController(WEIGHTS, TURN), then: new PredictiveController(WEIGHTS, TURN),
  froz: new PredictiveController(WEIGHTS, TURN),
  est, chain, gain, ...(frozen ? { frozen } : {}), senses: [], commands: [], estimate: [], predicted: [], sent: [0, 0], raw: [0, 0],
});
const blendOn = (ctrl: PredictiveController, speed: number, depth: number, rail: number): Design =>
  (ctrl as unknown as { blend: (s: number, d: number, r: number) => Design }).blend(speed, depth, rail);

function tickArm(a: Arm, t: TickRec, then: TickRec): readonly number[] {
  const at = (w: Where): Point => (w === 'now' ? { speed: t.speed, depth: t.depth, rail: t.rail }
    : w === 'then' ? { speed: then.speed, depth: then.depth, rail: then.rail }
      : a.frozen ?? { speed: t.speed, depth: t.depth, rail: t.rail });
  // ⚠️ **Three factories, one per block, and the SAME factory reused for the same `Where`.** `blend` writes into a
  // scratch object it mutates in place, so two designs live at once need two objects — and on the `harness` arm all
  // three `Where`s are `'now'`, which must give the very SAME object three times so that arm is the current design's
  // arithmetic by a different route and nothing else. The mapping below guarantees both.
  const factory = (w: Where): PredictiveController => (w === 'now' ? a.now : w === 'then' ? a.then : a.froz);
  const design = (w: Where): Design => { const o = at(w); return blendOn(factory(w), o.speed, o.depth, o.rail); };
  const dGain = design(a.gain);
  const dEstUse = design(a.est);
  const dChain = design(a.chain);
  const dNow = dGain;
  // The reference is solved on the GAIN block's design, so its ask goes through a tick at that operating point.
  const gp = at(a.gain);
  const refAt: TickRec = { ...t, speed: gp.speed, depth: gp.depth, rail: gp.rail };
  const n = dNow.phi.length;
  const p = dNow.c.length;
  const N = dNow.steps;
  const ne = dNow.phiE.length;
  if (a.estimate.length !== ne) a.estimate = new Array<number>(ne).fill(0);
  if (a.predicted.length !== n) a.predicted = new Array<number>(n).fill(0);
  a.senses.push(t.sense.slice());
  if (a.senses.length > N + 1) a.senses.shift();
  const e = a.estimate;
  if (a.senses.length > N) {
    const yk = a.senses[a.senses.length - 1 - N];
    const old = a.commands.length > N ? a.commands[a.commands.length - 1 - N] : [0, 0];
    const pred = new Array<number>(ne);
    for (let i = 0; i < ne; i += 1) {
      let s = dEstUse.gammaE[i][0] * old[0] + dEstUse.gammaE[i][1] * old[1];
      const row = dEstUse.phiE[i];
      for (let j = 0; j < ne; j += 1) s += row[j] * e[j];
      pred[i] = s;
    }
    const innov = new Array<number>(p);
    for (let i = 0; i < p; i += 1) {
      let s = yk[i];
      const row = dEstUse.cE[i];
      for (let j = 0; j < ne; j += 1) s -= row[j] * pred[j];
      innov[i] = s;
    }
    for (let i = 0; i < ne; i += 1) {
      let s = pred[i];
      const row = dEstUse.l[i];
      for (let j = 0; j < p; j += 1) s += row[j] * innov[j];
      e[i] = s;
    }
  }
  const b0 = dNow.bias ? e[n] : 0;
  const b1 = dNow.bias ? e[n + 1] : 0;
  const xh = a.predicted;
  for (let i = 0; i < n; i += 1) {
    let s = 0;
    const row = dChain.phiN[i];
    for (let j = 0; j < n; j += 1) s += row[j] * e[j];
    xh[i] = s;
  }
  for (let jj = 0; jj < N; jj += 1) {
    const back = N - jj;
    const uc = a.commands.length >= back ? a.commands[a.commands.length - back] : [0, 0];
    const pj = dChain.pred[jj];
    for (let i = 0; i < n; i += 1) xh[i] += pj[i][0] * (uc[0] + b0) + pj[i][1] * (uc[1] + b1);
  }
  if (dChain.predD && WEIGHTS?.waterHeel !== 'ref') for (let jj = 0; jj < N; jj += 1) for (let i = 0; i < n; i += 1) xh[i] += dChain.predD[jj][i][0] * t.tilt;
  // ⭐ The reference and the gain are the CURRENT design's in every arm, because the hypothesis is about the
  // estimator's own propagation of a stale measurement. `tick` solves the steady turn inline; rather than copy
  // `steadyTurn` out of `src/`, the real controller's own `tick` is run on a throwaway with the same design to get
  // `reference` — which is `tick`'s own public output and so cannot drift from it.
  const refCtrl = a.now;
  const held = refCtrl as unknown as { reference: { x: number[]; u: number[] } };
  refHelper(refCtrl, refAt);
  const ref = { x: held.reference.x, u: held.reference.u };
  const u = [0, 0];
  for (let q = 0; q < N_COMMAND; q += 1) {
    let s = ref.u[q] - (q === 0 ? b0 : b1);
    const row = dNow.k[q];
    for (let j = 0; j < n; j += 1) s -= row[j] * (xh[j] - ref.x[j]);
    u[q] = s;
  }
  a.raw[0] = u[0]; a.raw[1] = u[1];
  u[0] = Math.max(t.ankleLo, Math.min(t.ankleHi, u[0]));
  u[1] = Math.max(-t.twistLim, Math.min(t.twistLim, u[1]));
  a.commands.push(u);
  if (a.commands.length > N + 1) a.commands.shift();
  a.sent[0] = u[0]; a.sent[1] = u[1];
  return a.sent;
}

/**
 * The reference, got from the engine's own `tick`. A controller that has just been `reset()` and ticked once has a
 * zero estimate, so its `reference` is the ask's own steady turn on the design the tick blended and nothing else —
 * which is exactly the quantity wanted, and it is the ENGINE's arithmetic rather than a copy of it.
 */
const refPool = new Map<string, PredictiveController>();
function refHelper(ctrl: PredictiveController, t: TickRec): void {
  const key = 'ref';
  let r = refPool.get(key);
  if (!r) { r = new PredictiveController(WEIGHTS, TURN); refPool.set(key, r); }
  r.reset();
  r.tick(t.sense, t.speed, t.depth, t.bank, t.twist, { ankle: [t.ankleLo, t.ankleHi], twist: t.twistLim }, t.rail, t.tilt);
  const from = r as unknown as { reference: { x: number[]; u: number[] } };
  const to = ctrl as unknown as { reference: { x: number[]; u: number[] } };
  to.reference.x = from.reference.x.slice();
  to.reference.u = from.reference.u.slice();
}

// ---------------------------------------------------------------------------------------------------------------
// The run
// ---------------------------------------------------------------------------------------------------------------
const blocks: Block[] = readFileSync(TICKS, 'utf8').split('\n').filter((l) => l.length > 2)
  .map((l) => JSON.parse(l) as Block).filter((b) => b.kind === 'ticks' && b.script === SCRIPT && WAVES.includes(b.wave));
out(`# blocks: ${blocks.length} (script ${SCRIPT}, waves ${WAVES.join(',')})`);

const header = ['wave', 'ticks', 'shipsOk', 'harnOk', 'shipStep°', 'estStep°', 'chainStep°', 'frozTbl°', 'gain@med°', 'gain@lo°', 'gain@hi°', 'med/lo/hi', 'speedSpan'];
out('');
out(header.map((h, i) => pad(h, i === 0 ? 5 : 11)).join(' '));

for (const b of blocks) {
  const ts = b.ticks;
  const ships = new PredictiveController(WEIGHTS, TURN);
  const spare = new PredictiveController(WEIGHTS, TURN);
  const mid = (xs: number[]): number => xs.slice().sort((x, y) => x - y)[Math.floor(xs.length / 2)];
  const froze: Point = { speed: mid(ts.map((x) => x.speed)), depth: mid(ts.map((x) => x.depth)), rail: mid(ts.map((x) => x.rail)) };
  const armH = makeArm('now', 'now', 'now');                       // the harness control
  const armE = makeArm('then', 'now', 'now');                      // the hypothesis: re-time the ESTIMATOR only
  const armC = makeArm('then', 'then', 'now');                     // re-time the whole delay chain
  const armF = makeArm('frozen', 'frozen', 'frozen', froze);       // the schedule removed entirely
  const armFE = makeArm('frozen', 'frozen', 'now', froze);         // frozen TABLES, scheduled GAIN
  const armFG = makeArm('now', 'now', 'frozen', froze);            // scheduled tables, frozen GAIN
  // ⭐ **The discriminator between "the gain VARIES" and "the gain is simply HIGHER at these speeds".** Freezing the
  // gain at the median lowers the jump — but if the gain at 5.49 m/s is just a smaller number than the gain at the
  // speeds the ride visits, that is a magnitude story and not a scheduling one. So the same arm is run frozen at the
  // ride's LOWEST and HIGHEST speeds too. If the jump is small at ALL THREE fixed points, it is the VARIATION; if it
  // comes back at the high one, it is the MAGNITUDE at that speed.
  const lo: Point = { ...froze, speed: Math.min(...ts.map((x) => x.speed)) };
  const hi: Point = { ...froze, speed: Math.max(...ts.map((x) => x.speed)) };
  const armGLo = makeArm('now', 'now', 'frozen', lo);
  const armGHi = makeArm('now', 'now', 'frozen', hi);
  let N = 6;
  let early = 0;
  let maxShip = 0;
  let maxHarn = 0;
  let maxEst = 0;
  let maxChain = 0;
  let shipStep = 0;
  let estStep = 0;
  let prevShip = Number.NaN;
  let prevEst = Number.NaN;
  let prevFroz = Number.NaN;
  let frozStep = 0;
  let prevFE = Number.NaN;
  let feStep = 0;
  let prevFG = Number.NaN;
  let fgStep = 0;
  let prevChain = Number.NaN;
  let chainStep = 0;
  let prevGLo = Number.NaN;
  let gLoStep = 0;
  let prevGHi = Number.NaN;
  let gHiStep = 0;
  /** The command's own min and max per arm, so a jump can be read beside the command's SIZE. */
  const spanLo = new Array<number>(7).fill(Number.POSITIVE_INFINITY);
  const spanHi = new Array<number>(7).fill(Number.NEGATIVE_INFINITY);
  let lastK: number[] | null = null;
  let lastNorm = 0;
  let lastV = 0;
  let kElem = 0;
  let kNorm = 0;
  let dvTick = 0;
  let normLo = Number.POSITIVE_INFINITY;
  let normHi = Number.NEGATIVE_INFINITY;
  let refNonZero = 0;
  let askMax = 0;
  const lines: string[] = [];
  for (let i = 0; i < ts.length; i += 1) {
    const t = ts[i];
    const back = i - N;
    if (back < 0) early += 1;
    const then = ts[Math.max(0, back)];
    // ⭐ The MECHANISM's own two quantities, read off the design table and not inferred: how far the speed fed to
    // `blend` moves in one tick, and how far the ankle's own gain ROW moves with it (its Euclidean norm over the
    // plant's states, and the largest change in any single element). Both read on a spare factory.
    const dHere = blendOn(spare, t.speed, t.depth, t.rail);
    const k0 = dHere.k[0].slice();
    const norm = Math.sqrt(k0.reduce((acc, x) => acc + x * x, 0));
    if (lastK) {
      let worst = 0;
      for (let j = 0; j < k0.length; j += 1) worst = Math.max(worst, Math.abs(k0[j] - lastK[j]));
      kElem = Math.max(kElem, worst);
      kNorm = Math.max(kNorm, Math.abs(norm - lastNorm));
      dvTick = Math.max(dvTick, Math.abs(t.speed - lastV));
    }
    lastK = k0; lastNorm = norm; lastV = t.speed;
    // ⭐ **Does the `gain@*` arm differ from `ships` in `k` ALONE?** `tick` solves the reference from the same design
    // as the gain, so freezing one freezes both — unless the reference is identically zero, which it must be when
    // the ask is zero (`steadyTurn` on `bankAsked = 0, twistAsked = 0` with no drive, and the `'tan'` correction
    // gated off by `|bankAsked| > 1e-6`). On the `cue` script the ask IS zero, so this counts the ticks where the
    // reference is not all zeros. **If it reads 0, the frozen-gain arms differ in `k` and in nothing else**, and that
    // is what makes the column readable. Reported, never assumed.
    refHelper(spare, t);
    const refSeen = (spare as unknown as { reference: { x: number[]; u: number[] } }).reference;
    if (refSeen.u.some((x) => x !== 0) || refSeen.x.some((x) => x !== 0)) refNonZero += 1;
    askMax = Math.max(askMax, Math.abs(t.bank), Math.abs(t.twist));
    normLo = Math.min(normLo, norm); normHi = Math.max(normHi, norm);
    const got = ships.tick(t.sense, t.speed, t.depth, t.bank, t.twist, { ankle: [t.ankleLo, t.ankleHi], twist: t.twistLim }, t.rail, t.tilt);
    // ⚠️ Read off a SPARE controller, never off `ships`: `blend` returns a scratch object it mutates in place, and
    // `ships` is the arm whose own scratch the next tick reads.
    N = blendOn(spare, t.speed, t.depth, t.rail).steps;
    maxShip = Math.max(maxShip, Math.abs(got[0] - t.u0), Math.abs(got[1] - t.u1),
      Math.abs((ships as unknown as { raw: number[] }).raw[0] - t.raw0));
    const uh = tickArm(armH, t, then);
    const ue = tickArm(armE, t, then);
    const uc = tickArm(armC, t, then);
    const uf = tickArm(armF, t, then);
    const ufe = tickArm(armFE, t, then);
    const ufg = tickArm(armFG, t, then);
    const uglo = tickArm(armGLo, t, then);
    const ughi = tickArm(armGHi, t, then);
    for (const [k, v] of [[0, got[0]], [1, ue[0]], [2, uf[0]], [3, ufe[0]], [4, ufg[0]], [5, uglo[0]], [6, ughi[0]]] as [number, number][]) {
      spanLo[k] = Math.min(spanLo[k], v); spanHi[k] = Math.max(spanHi[k], v);
    }
    maxHarn = Math.max(maxHarn, Math.abs(uh[0] - got[0]), Math.abs(uh[1] - got[1]));
    maxEst = Math.max(maxEst, Math.abs(ue[0] - got[0]));
    maxChain = Math.max(maxChain, Math.abs(uc[0] - got[0]));
    if (Number.isFinite(prevShip)) shipStep = Math.max(shipStep, Math.abs(got[0] - prevShip));
    if (Number.isFinite(prevEst)) estStep = Math.max(estStep, Math.abs(ue[0] - prevEst));
    if (Number.isFinite(prevFroz)) frozStep = Math.max(frozStep, Math.abs(uf[0] - prevFroz));
    if (Number.isFinite(prevFE)) feStep = Math.max(feStep, Math.abs(ufe[0] - prevFE));
    if (Number.isFinite(prevFG)) fgStep = Math.max(fgStep, Math.abs(ufg[0] - prevFG));
    if (Number.isFinite(prevChain)) chainStep = Math.max(chainStep, Math.abs(uc[0] - prevChain));
    if (Number.isFinite(prevGLo)) gLoStep = Math.max(gLoStep, Math.abs(uglo[0] - prevGLo));
    if (Number.isFinite(prevGHi)) gHiStep = Math.max(gHiStep, Math.abs(ughi[0] - prevGHi));
    prevShip = got[0]; prevEst = ue[0]; prevFroz = uf[0]; prevFE = ufe[0]; prevFG = ufg[0]; prevChain = uc[0];
    prevGLo = uglo[0]; prevGHi = ughi[0];
    const since = b.stand === null ? Number.NaN : t.tAt - b.stand;
    if (FROM !== TO && since >= FROM && since <= TO) {
      lines.push(`    ${pad(f(since, 4), 8)} ${pad(f(t.speed, 3), 8)} ${pad(f(then.speed, 3), 8)} ${pad(f(-got[0] * DEG, 3), 10)} ${pad(f(-ue[0] * DEG, 3), 10)} ${pad(f(-uc[0] * DEG, 3), 10)} ${pad(f(t.rail * DEG, 2), 8)} ${pad(f(t.tilt * DEG, 2), 8)}`);
    }
  }
  const speeds = ts.map((t) => t.speed);
  void maxEst; void maxChain; void N; void frozStep;
  const row = [
    pad(String(b.wave), 5), pad(String(ts.length), 11),
    pad(maxShip < 1e-12 ? 'BIT' : `NO ${maxShip.toExponential(1)}`, 11),
    pad(maxHarn < 1e-12 ? 'BIT' : `NO ${maxHarn.toExponential(1)}`, 11),
    pad(f(shipStep * DEG, 3), 11), pad(f(estStep * DEG, 3), 11), pad(f(chainStep * DEG, 3), 11),
    pad(f(feStep * DEG, 3), 11),
    pad(f(fgStep * DEG, 3), 11), pad(f(gLoStep * DEG, 3), 11), pad(f(gHiStep * DEG, 3), 11),
    pad(`${f(froze.speed, 1)}/${f(lo.speed, 1)}/${f(hi.speed, 1)}`, 11),
    pad(`${f(Math.min(...speeds), 2)}-${f(Math.max(...speeds), 2)}`, 11),
  ];
  out(row.join(' '));
  // The command's own SPAN per arm, on the same line discipline: a jump that shrank because the whole command shrank
  // is a magnitude story, and a jump that shrank while the span held is a smoothness one.
  const names = ['ships', 'estThen', 'frozen', 'frozTbl', 'gain@med', 'gain@lo', 'gain@hi'];
  out(`    command span, deg: ${names.map((nm, k) => `${nm} ${f((spanHi[k] - spanLo[k]) * DEG, 2)}`).join('  ')}`);
  out(`    the mechanism: largest one-tick move in the speed fed to blend ${f(dvTick, 3)} m/s; in the ankle gain row's`
    + ` norm ${f(kNorm, 2)} (the row runs ${f(normLo, 1)}-${f(normHi, 1)} over the ride); largest in any single`
    + ` element ${f(kElem, 2)}`);
  out(`    the frozen-gain arm's own control: ticks whose reference is not all zeros ${refNonZero} of ${ts.length};`
    + ` largest |ask| over the ride ${f(askMax * DEG, 4)} deg.`
    + `${refNonZero === 0 ? ' So those arms differ from `ships` in the gain row k and in NOTHING else.' : ' ⚠️ The reference moves too, so those arms are NOT a gain-only change.'}`);
  if (lines.length) {
    out(`    ${pad('t+s', 8)} ${pad('vNow', 8)} ${pad('vThen', 8)} ${pad('ships°', 10)} ${pad('estThen°', 10)} ${pad('chainThen°', 10)} ${pad('rail°', 8)} ${pad('tilt°', 8)}`);
    for (const l of lines) out(l);
  }
}
out('');
out('# Every `*Step°` column is the LARGEST one-tick JUMP in the ankle command over the ride, in degrees of the');
out('# engine\'s own sign (−rad × 180/π), on the SAME saved inputs:');
out('#   shipStep°  — what ships.');
out('#   estStep°   — the hypothesis: the 0.1 s-old sense propagated by the design in force when it was TAKEN.');
out('#   chainStep° — the whole delay chain (estimator AND predictor) re-timed to that design.');
out('#   frozTbl°   — only the design TABLES frozen (estimator + predictor); the gain stays scheduled.');
out('#   gain@med/lo/hi° — only the GAIN and reference frozen, at the ride\'s median, lowest and highest speed.');
out('#                If the jump is small at ALL THREE, the jump comes from the gain VARYING between ticks; if it');
out('#                returns at the high one, it comes from the gain\'s MAGNITUDE at that speed. The command span');
out('#                line under each row says whether a smaller jump is a smaller command or a smoother one.');
out('# `BIT` is bit-identity (< 1e-12) and the round is VOID unless both control columns read BIT.');
