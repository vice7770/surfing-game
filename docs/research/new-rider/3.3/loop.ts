/**
 * Step 3.3n: **what the balance's own loop is doing while the rider goes over.**
 *
 * Step 3.3m closed the plant. The ankle moves the body's lean at 21–58 °/s² per N·m, delivers a median 28.1 N·m
 * (peaks 40–90), books a median −655 °/s² against a net lean drive of +39.9 to +95.9, and the board's roll resistance
 * is 1.7× the sourced planing value. *"It is not starved. It loses anyway."* (Part 36 §0 item 5.) What is left in the
 * chain is **the command** — and the loop that writes it has never been read.
 *
 * That loop is `src/physics/predictiveBalance.ts`: a Smith predictor with LQR gains, running at `CONTROL_STEP`,
 * sensing through a 0.1 s delay line, acting on a forward prediction of the state **now**. This probe opens it.
 *
 * ## The four instruments, and what each is an identity of
 *
 * **1. The command, decomposed exactly.** `tick` computes [R, `predictiveBalance.ts:1230–1239`]
 *
 *     raw[0] = ref.u[0] − b̂₀ − Σ_j K[0][j] (x̂[j] − ref.x[j])            sent[0] = clamp(raw[0], ±limits.ankle)
 *
 * so the three terms **are** the command and their sum must reproduce `raw[0]` to floating point (P0a). The probe
 * reads `reference.u`, `reference.x`, `bias`, `predicted` (all public "for probes") and the blended `K` off the
 * controller's own scratch design, and prints the feedforward, the bias and the feedback separately, with the
 * feedback split per state. **Nothing here is a model: it is the same arithmetic the controller just did.**
 *
 * **2. The prediction error, measured.** The controller is handed the sense **now** every tick and delays it itself
 * (`senses`, newest last; the filter reads `senses[len−1−N]`). So at one instant the probe can read:
 *
 *   - `C x̂` — what the predictor thinks the senses are now;
 *   - `senses[len−1]` — what they actually are now, the controller's own copy;
 *   - `senses[len−1−N]` — the stale sense the filter is fed, which is what **not** predicting would give.
 *
 * `predErr = C x̂ − now` and `staleErr = stale − now` are then the predictor's error and the error of doing nothing,
 * **on the same instant, in the same units, off the same arrays**. A predictor is worth its delay only if the first
 * is smaller than the second. Nobody has measured either.
 *
 * **3. The prediction's own contribution to the command.** The counterfactual `u_stale = ref.u − b̂ − K(ê − ref.x)`
 * — the same gains acting on the filter's estimate of the state 0.1 s ago instead of the forward prediction — is a
 * read-only back-substitution through the controller's own numbers. The difference `raw[0] − u_stale` is how much of
 * the command the **prediction** is responsible for, as against the filter.
 *
 * **4. Worse than nothing.** `humanGains: { bank: 0, bankRate: 0, forward: 0 }` is a shipped probe option that
 * replaces the predictor with 3.2's delayed law at zero gain, which pins the commanded rest at exactly 0 — a passive
 * ankle spring and damper and nothing else, and 3.2w's own gain-0 row. The twist goes passive with it, exactly as it
 * did in 3.2w, so this is 3.2w's comparison re-run on this round's cells and not a new one.
 *
 * ## The populations, named, never pooled
 *
 * 1. **step 3.3k's / 3.3l's / 3.3m's own unsteered arm**: the Canyon-matched `FaceWater` (1.4 m / 16° / 5.7 m/s,
 *    2.6 m deep, the board 0.75 fronts ahead of the crest and 45° off the fall line), the stance held, the stick
 *    **never touched**, eight relative entry speeds × three stances, 9 s a run — 24 trajectories, on both fall
 *    filters.
 * 2. **the owner's own low-speed cell** (`ENTRIES`): the same water and placement with the entry set **absolutely**
 *    at 1–6 m/s through the water × three stances — 18 runs. **This is the bar.**
 * 3. **a steered arm** (`STEERS`), for the owner's *"correction balance while turning"*: the stick held from the
 *    first frame, both ways.
 * 4. **the dead-ankle arm** (`GAINS=zero`), on cells 1 and 2.
 *
 * Read-only: it drives the shipped inputs, reads public fields, and names every private it reads
 * (`PredictiveController.senses`, `.estimate`, `.blendedDesign`; `AttachedRider.ankleRest`, `.ankleRoom`,
 * `.ankleBite`, `.heldAnkleRaw`, `.leanAsked`, `.schedRail`). It turns on no ledger and changes no source file.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/loop.ts -o <scratch>/lp.mjs --format esm --platform node
 *   RIDER=new FELT=deck node <scratch>/lp.mjs
 *
 * Env: `RIDER=new|old`, `STANCES`, `EXTRAS` (relative entries), `ENTRIES` (absolute entries, m/s — when set,
 * `EXTRAS` is ignored), `STEERS`, `SECONDS`, `FELT=deck`, `GAINS=zero`, `OUT`, `TRACE`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;
/** `AttachedRider`'s own MAX_BANK, °, restated so the probe never imports a private: the clamp 3.3k flagged. */
const MAX_BANK = 70;
/** `AttachedRider`'s own ANKLE_REST_RANGE, rad, and the rail's bite — restated, both read in the code [R]. */
const ANKLE_REST_RANGE = 0.25;
const RAIL_BITE = 48;

const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '-3,-2,-1,0,1,1.5,2,3').split(',').map(Number);
const ENTRIES = process.env.ENTRIES ? process.env.ENTRIES.split(',').map(Number) : null;
const STEERS = (process.env.STEERS ?? '0').split(',').map(Number);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';
const FELT = process.env.FELT === 'deck' ? 'deck' : undefined;
/** `GAINS=zero`: 3.2w's own gain-0 row — the commanded rest pinned at 0, the passive ankle alone, no control. */
const GAINS = process.env.GAINS === 'zero' ? 'zero' : 'shipped';
/**
 * `BIAS=off`: the command-bias estimator removed, which `DesignWeights.bias` documents as its own setting — *"The
 * muscles' slow bias, a random walk per √s on each command … which the internal model estimates and the commands
 * cancel (offset-free control). **Empty: none.**"* [R, `predictiveBalance.ts:646–651`]. It is a weights variant of
 * the shipped design, not a source change: with `bias: []` the estimate's model loses its two extra states, `b̂` is
 * identically zero, the command does not subtract it and the forward prediction does not propagate it.
 */
const BIAS = process.env.BIAS === 'off' ? 'off' : 'shipped';

type Stance = 'tall' | 'crouch' | 'compress';
const STANCES = (process.env.STANCES ?? 'tall,crouch,compress').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };
/** `Math.max(...list, NaN)` is NaN for every list — this folder's own trap, avoided by hand. */
const peak = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] : Number.NaN; };
const countTrue = (v: boolean[]) => v.filter(Boolean).length;

/** As `fall.ts`, `bank.ts`, `deck.ts` and `roll.ts`: the deeper of crouch and Compress wins, so Compress holds the crouch at 0.6. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' ? 0.6 : 0;
  rider.compress = s === 'compress' ? 1 : 0;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/**
 * The controller's own three scratch holdings, private to TypeScript and present at run time. **Read, never
 * written.** `senses` is the sense line the controller fills itself (newest last, at most `steps + 1` long);
 * `estimate` is the filter's state as it was `steps` ticks ago, with the two bias states after it; `blendedDesign`
 * is the design the tick just used — the eight table points blended **in place**, so it must be read after the tick
 * and before the next one, which is what one read a frame does.
 */
interface ControlInner {
  senses: number[][];
  estimate: number[];
  blendedDesign?: { k: number[][]; c: number[][]; steps: number; phi: number[][] };
}

/** `AttachedRider`'s own privates this probe reads, each named here rather than reached for anonymously. */
interface RiderInner {
  /** The lagged rest the ankle's spring actually works against, rad, game sign (`lagRest`'s output). */
  ankleRest: number;
  /** `restRange()` this frame, rad: what the predictor was told as `limits.ankle`. */
  ankleRoom: number;
  /** The rail's bite, rad: the room on the side that would roll further onto the rail it is on. */
  ankleBite: number;
  /** `−predictor.raw[0]`: the predictor's unclamped command in the game's sign, before the game's own clamp. */
  heldAnkleRaw: number;
  /** The lean the player asks for, rad, after its own easing. 0 with the stick untouched. */
  leanAsked: number;
  /** The rail the schedule was read at, rad (capped at SCHEDULE_RAIL_CAP = 12°). */
  schedRail: number;
}

/** One control tick's row. Every angle is in degrees and every datum is named beside it. */
interface Tick {
  t: number;
  /** The controller's own tick count, so a frame that ran no tick is never counted as one. */
  ticks: number;
  through: number;
  /** The deck's roll and the body's bank, ° in the probe's own frame (+ = the deck normal / the body's lean). */
  roll: number;
  bank: number;
  rail: number;
  clamped: number;
  /** The lean the player asks for, ° (the probe's sign): 0 on every unsteered arm. */
  leanAsked: number;

  // --- 1. the command, decomposed (all ° in the MODEL's sign, which is the probe's reversed) ---
  /** `raw[0]`, the command before the clamp. */
  raw: number;
  /** `sent[0]`, the command after it — the value the predictor records as having been sent. */
  sent: number;
  /** `ref.u[0]`, the steady turn's own ankle rest for the lean asked: the feedforward. */
  ff: number;
  /** `−b̂₀`, the estimated command bias, negated as the command applies it. */
  bi: number;
  /** `−Σ_j K[0][j](x̂[j] − ref.x[j])`, the LQR feedback on the prediction's error from the reference. */
  fb: number;
  /** `ff + bi + fb − raw`: P0a, the identity, relative to the largest term. Must be ~0. */
  idRes: number;
  /** The feedback's biggest single state term, and which state index it is. */
  fbTop: number;
  fbTopAt: number;
  /** The feedback split on the four roll states: the board's roll and rate, the body's bank and rate, and the lagged rest. */
  fbRoll: number;
  fbRollRate: number;
  fbBank: number;
  fbBankRate: number;
  fbRest: number;
  /** The limit the predictor was told, °, and whether the command was at it. */
  limit: number;
  sat: number;
  /**
   * **The rest the game COMMANDED the ankle this frame, ° (probe's sign), before the motor lag** — recomputed here
   * exactly as the bank step computes it [R, `AttachedRider.ts:3458–3461`], with `anklePlumb = 0` by default so
   * `wanted = heldAnkleRaw = −raw[0]`:
   *     lean = rail > 0 ? max(−room, min(range, wanted)) : max(−range, min(room, wanted))
   * This is the quantity that is comparable with `sent`. `applied` below is the **lagged** rest the spring actually
   * works against, which is a different thing and is compared with the model's own lagged state instead.
   */
  cmd: number;
  /** The lagged rest the ankle's spring works against, ° (probe's sign): `lagRest`'s output. */
  applied: number;
  /** The bound actually applied to `cmd` on the side it was asking: `min(range, room)` on that side. */
  appliedBound: number;
  /** Whether `cmd` was at its own applied bound. */
  atBound: number;
  /** Whether the rail's bite had shut the room on the asking side (the only way `cmd` and `−sent` can part). */
  biteShut: number;
  /** `cmd + sent`, °: the gap between the rest the game commanded and what the predictor recorded sending. */
  cmdGap: number;
  /** `applied + x̂[8]·DEG`, °: the model's predicted LAGGED rest against the game's own. An unsensed state's error. */
  restErr: number;

  // --- 2. the prediction error, against doing nothing ---
  /** `(C x̂)[0] − now[0]`, °: the predicted body bank less the bank now. The predictor's own error. */
  predBank: number;
  /** `stale[0] − now[0]`, °: the error of NOT predicting — the delayed sense the filter is fed. */
  staleBank: number;
  /** The same pair on the bank's rate, °/s. */
  predBankRate: number;
  staleBankRate: number;
  /** The same pair on the ankle's own angle, ° (sense row 5). */
  predAnkle: number;
  staleAnkle: number;
  /** The whole sense vector's error, as a root-mean-square over the seven rows in their own units (rad, rad/s). */
  predRms: number;
  staleRms: number;
  /** The filter's own fit to the measurement it was handed: `(C ê)[0] − stale[0]`, ° — the innovation. */
  innovBank: number;
  /** The predicted bank itself, ° (probe's sign), beside the bank now. */
  predictedBank: number;

  // --- 3. the prediction's own contribution to the command ---
  /** `ref.u − b̂ − K(ê − ref.x)`, the same gains on the filter's 0.1 s-old estimate: the no-prediction command, °. */
  stalecmd: number;
  /** `raw − stalecmd`, °: how much of the command the forward prediction is responsible for. */
  predShare: number;

  // --- 4. does it fight the input ---
  /** `fb / ff` where `|ff| > 0.1°`: the share of the feedforward the feedback cancels (negative = it opposes). */
  fbOverFf: number;
}

function oneRun(st: Stance, extra: number, entry0: number | null, steer: number): Record<string, unknown> {
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const pz = water.crestZ() + AHEAD * water.front;
  const here = water.sampleAt(0, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = entry0 ?? ((FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra);
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + SIDE) / DEG;
  const level = new Vector3(Math.sin(hAng), 0, Math.cos(hAng));
  const forward = level.addScaledVector(normal, -level.dot(normal)).normalize();
  const left = new Vector3().crossVectors(normal, forward).normalize();
  const board = new BoardBody();
  board.place(
    new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y),
    new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward)),
    forward.clone().multiplyScalar(entry).add(new Vector3(here.flowX, here.flowY, here.flowZ)),
  );
  const rider = new AttachedRider(board.shape, {
    phase: 'standing',
    ...(RIDER === 'new' ? { rider: 'new' as const } : {}),
    ...(FELT ? { feltFrame: FELT } : {}),
    // 3.2w's own gain-0 row: the delayed law at zero gain, so the commanded rest is pinned at exactly 0. The
    // predictor is then never ticked at all (`this.predictive = newRider && humanGains === undefined` [R]), which is
    // what makes this the "no control" arm and not a detuning of the loop.
    ...(GAINS === 'zero' ? { humanGains: { bank: 0, bankRate: 0, forward: 0 } } : {}),
    ...(BIAS === 'off' ? { balance: { weights: { bias: [] } } } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  stanceInputs(rider, st);
  rider.steer = steer;

  const ctl = rider.predictor as unknown as ControlInner;
  const inner = rider as unknown as RiderInner;
  const fwd = new Vector3();
  const side = new Vector3();
  const boardUp = new Vector3();
  const nW = new Vector3();
  const ticks: Tick[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let lastTicks = -1;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    const through = Math.hypot(board.velocity.x - (cen.outsideDomain ? 0 : cen.flowX), board.velocity.z - (cen.outsideDomain ? 0 : cen.flowZ));
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const tilt = Math.atan2(nW.dot(side), nW.y) * DEG;
    const bank = rider.bank.angle * DEG;
    const rail = roll - tilt;

    // One read a frame, and only of a frame that actually ran a tick: the blend is refilled in place every tick, so a
    // read of a frame with no tick would be a read of the previous tick's design against this frame's state.
    const nTicks = rider.predictor.ticks;
    const d = ctl.blendedDesign;
    if (GAINS === 'shipped' && d && nTicks > lastTicks && ctl.senses.length > 0) {
      lastTicks = nTicks;
      const n = d.k[0].length;
      const p = d.c.length;
      const N = d.steps;
      const xh = rider.predictor.predicted;
      const ref = rider.predictor.reference;
      const e = ctl.estimate;
      const now = ctl.senses[ctl.senses.length - 1];
      const stale = ctl.senses.length > N ? ctl.senses[ctl.senses.length - 1 - N] : null;
      const b0 = rider.predictor.bias[0];

      // 1. the command, decomposed — the same arithmetic `tick` just did.
      const ff = ref.u[0];
      const bi = -b0;
      let fb = 0;
      let fbTop = 0;
      let fbTopAt = -1;
      const per = new Array<number>(n).fill(0);
      for (let j = 0; j < n; j += 1) {
        const term = -d.k[0][j] * (xh[j] - ref.x[j]);
        per[j] = term;
        fb += term;
        if (Math.abs(term) > Math.abs(fbTop)) { fbTop = term; fbTopAt = j; }
      }
      const raw = rider.predictor.raw[0];
      const sent = rider.predictor.sent[0];
      const biggest = Math.max(1e-30, Math.abs(ff), Math.abs(bi), Math.abs(fb));

      // 3. the no-prediction counterfactual: the same gains on the filter's estimate of the state 0.1 s ago.
      let stalecmd = ff + bi;
      for (let j = 0; j < n; j += 1) stalecmd -= d.k[0][j] * (e[j] - ref.x[j]);

      // 2. the prediction error, and the error of doing nothing, on the same instant off the same arrays.
      const cx = new Array<number>(p).fill(0);
      const ce = new Array<number>(p).fill(0);
      for (let q = 0; q < p; q += 1) {
        let sx = 0;
        let se = 0;
        for (let j = 0; j < n; j += 1) { sx += d.c[q][j] * xh[j]; se += d.c[q][j] * e[j]; }
        cx[q] = sx;
        ce[q] = se;
      }
      let pr = 0;
      let sr = 0;
      for (let q = 0; q < p; q += 1) {
        pr += (cx[q] - now[q]) ** 2;
        if (stale) sr += (stale[q] - now[q]) ** 2;
      }

      // The ankle's own applied bound this frame, read the way the bank step computes it [R, AttachedRider:3459–3461].
      const range = inner.ankleRoom;
      const room = inner.ankleBite;
      const wanted = inner.heldAnkleRaw;
      const cmd = rail > 0 ? Math.max(-room, Math.min(range, wanted)) : Math.max(-range, Math.min(room, wanted));
      const bound = wanted > 0 ? (rail > 0 ? range : room) : (rail > 0 ? room : range);
      const applied = inner.ankleRest;
      const shut = Math.abs(rail) >= RAIL_BITE;
      ticks.push({
        t,
        ticks: nTicks,
        through,
        roll,
        bank,
        rail,
        clamped: Math.abs(bank) >= MAX_BANK - 1e-6 ? 1 : 0,
        leanAsked: inner.leanAsked * DEG,
        raw: raw * DEG,
        sent: sent * DEG,
        ff: ff * DEG,
        bi: bi * DEG,
        fb: fb * DEG,
        idRes: Math.abs(ff + bi + fb - raw) / biggest,
        fbTop: fbTop * DEG,
        fbTopAt,
        fbRoll: per[0] * DEG,
        fbRollRate: per[1] * DEG,
        fbBank: per[2] * DEG,
        fbBankRate: per[3] * DEG,
        fbRest: n > 8 ? per[8] * DEG : Number.NaN,
        limit: range * DEG,
        sat: Math.abs(sent) >= range - 1e-12 ? 1 : 0,
        cmd: cmd * DEG,
        applied: applied * DEG,
        appliedBound: bound * DEG,
        atBound: Math.abs(Math.abs(cmd) - bound) < 1e-12 ? 1 : 0,
        biteShut: shut ? 1 : 0,
        cmdGap: (cmd + sent) * DEG,
        restErr: n > 8 ? (applied + xh[8]) * DEG : Number.NaN,
        predBank: (cx[0] - now[0]) * DEG,
        staleBank: stale ? (stale[0] - now[0]) * DEG : Number.NaN,
        predBankRate: (cx[1] - now[1]) * DEG,
        staleBankRate: stale ? (stale[1] - now[1]) * DEG : Number.NaN,
        predAnkle: (cx[5] - now[5]) * DEG,
        staleAnkle: stale ? (stale[5] - now[5]) * DEG : Number.NaN,
        predRms: Math.sqrt(pr / p),
        staleRms: stale ? Math.sqrt(sr / p) : Number.NaN,
        innovBank: stale ? (ce[0] - stale[0]) * DEG : Number.NaN,
        predictedBank: -xh[2] * DEG,
        stalecmd: stalecmd * DEG,
        predShare: (raw - stalecmd) * DEG,
        fbOverFf: Math.abs(ff * DEG) > 0.1 ? fb / ff : Number.NaN,
      });
    }

    // `attached` is the test (step 3.3f §1): `separate` leaves `phase` and `upright` untouched.
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      fell = rider.attached ? rider.phase : (rider.separation ?? 'separated');
      fellAt = t;
      break;
    }
  }

  if (TRACE) {
    process.stdout.write(`# TRACE ${RIDER} ${st} entry=${f(entry, 3)} steer=${steer} felt=${FELT ?? 'world'} gains=${GAINS}\n`);
    if (ticks.length) {
      const keys = Object.keys(ticks[0]);
      process.stdout.write(`${keys.join('\t')}\n`);
      for (const x of ticks) {
        const row = x as unknown as Record<string, number>;
        process.stdout.write(`${keys.map((k) => (Number.isFinite(row[k]) ? row[k].toFixed(6) : 'NaN')).join('\t')}\n`);
      }
    }
  }

  // Every window starts after 0.2 s: the placement's contact transient, as every probe in this folder. The
  // `MAX_BANK` clamp's frames are excluded frame by frame and the count published (a known defect, queued, not this
  // round's). `late` is the last 0.2 s before the ride ended — the window P2a is about.
  const live = ticks.filter((x) => x.t > 0.2 && x.clamped === 0);
  const end = ticks[ticks.length - 1];
  const endT = Number.isFinite(fellAt) ? fellAt : (end?.t ?? Number.NaN);
  const late = live.filter((x) => x.t >= endT - 0.2);
  const early = live.filter((x) => x.t <= 0.6);
  /** The first six ticks, P0d's own window: the filter has not run, so `x̂` carries no sense at all. */
  const virgin = ticks.filter((x) => x.ticks <= 6);
  const col = (w: Tick[], k: keyof Tick) => w.map((x) => Number(x[k]));
  const absCol = (w: Tick[], k: keyof Tick) => w.map((x) => Math.abs(Number(x[k])));

  const out: Record<string, unknown> = {
    rider: RIDER,
    gains: GAINS,
    biasArm: BIAS,
    stance: st,
    extra: entry0 === null ? extra : null,
    entryAsked: entry0,
    entry: r(entry, 3),
    steer,
    felt: FELT ?? 'world',
    fell,
    fellAt: r(fellAt, 3),
    frames: Math.round((Number.isFinite(fellAt) ? fellAt : SECONDS) / STEP),
    tickRows: ticks.length,
    liveRows: live.length,
    clampedRows: ticks.filter((x) => x.clamped === 1).length,
    throughFirst: r(ticks.filter((x) => x.t > 0.2)[0]?.through ?? Number.NaN, 3),
    throughFall: r(end?.through ?? Number.NaN, 3),
    rollFall: r(end?.roll ?? Number.NaN, 2),
    bankFall: r(end?.bank ?? Number.NaN, 2),
    railFall: r(end?.rail ?? Number.NaN, 2),
    leanAskedPeak: r(peak(absCol(live, 'leanAsked')), 2),
  };
  if (GAINS === 'zero' || live.length === 0) return out;

  // P0a and P0b, the two identities, over every tick of the run (not the window: an identity has no window).
  out.idResPeak = r(peak(col(ticks, 'idRes')), 12);
  out.clampCheck = ticks.every((x) => Math.abs(x.sent) <= x.limit + 1e-9
    && (Math.abs(x.raw) >= x.limit - 1e-12 ? x.sat === 1 : Math.abs(x.sent - x.raw) < 1e-12)) ? 1 : 0;
  // P0d, the positive control: over the first six ticks the predicted bank must be near zero and the error the sense.
  out.virginRows = virgin.length;
  out.virginPredBankPeak = r(peak(absCol(virgin, 'predictedBank')), 3);
  out.virginErrLessSense = r(peak(virgin.map((x) => Math.abs(Math.abs(x.predBank) - Math.abs(x.bank)))), 3);

  // 1. the command
  out.satRows = countTrue(live.map((x) => x.sat === 1));
  out.satShare = r(countTrue(live.map((x) => x.sat === 1)) / live.length, 3);
  out.atBoundRows = countTrue(live.map((x) => x.atBound === 1));
  out.atBoundShare = r(countTrue(live.map((x) => x.atBound === 1)) / live.length, 3);
  out.biteShutRows = countTrue(live.map((x) => x.biteShut === 1));
  out.satAndBiteOpen = countTrue(live.map((x) => x.sat === 1 && x.biteShut === 0));
  out.satOpenAtBound = countTrue(live.map((x) => x.sat === 1 && x.biteShut === 0 && x.atBound === 1));
  out.cmdGapPeak = r(peak(absCol(live, 'cmdGap')), 4);
  out.cmdGapOpenPeak = r(peak(live.filter((x) => x.biteShut === 0).map((x) => Math.abs(x.cmdGap))), 6);
  // Saturation over EVERY tick, not only the live window — so the `MAX_BANK` exclusion cannot hide it, and so the
  // per-tick share can be compared with Part 34's per-RUN count on the same footing.
  out.satRowsAll = countTrue(ticks.map((x) => x.sat === 1));
  out.satShareAll = r(countTrue(ticks.map((x) => x.sat === 1)) / ticks.length, 3);
  out.atBoundRowsAll = countTrue(ticks.map((x) => x.atBound === 1));
  out.satEver = countTrue(ticks.map((x) => x.sat === 1)) > 0 ? 1 : 0;
  out.atBoundEver = countTrue(ticks.map((x) => x.atBound === 1)) > 0 ? 1 : 0;
  out.rawAbsMedian = r(median(absCol(live, 'raw')), 3);
  out.rawPeak = r(peak(absCol(live, 'raw')), 2);
  out.rawPeakAll = r(peak(absCol(ticks, 'raw')), 2);
  out.appliedAbsMedian = r(median(absCol(live, 'applied')), 3);
  out.cmdAbsMedian = r(median(absCol(live, 'cmd')), 3);
  out.cmdPeak = r(peak(absCol(live, 'cmd')), 3);
  out.restErrAbsMedian = r(median(absCol(live, 'restErr')), 3);
  out.restErrPeak = r(peak(absCol(live, 'restErr')), 2);
  out.ffAbsMedian = r(median(absCol(live, 'ff')), 4);
  out.ffPeak = r(peak(absCol(live, 'ff')), 3);
  out.biAbsMedian = r(median(absCol(live, 'bi')), 4);
  out.biPeak = r(peak(absCol(live, 'bi')), 3);
  out.biAtFall = r(end?.bi ?? Number.NaN, 3);
  out.biSignedMedian = r(median(col(live, 'bi')), 4);
  // **P1c: is the bias an un-anti-wound integrator?** Its sign consistency over the live window, how much of the
  // bound it is worth at the end, and whether it grew monotonically (the share of ticks whose |bias| rose).
  out.biOneSign = r(Math.max(countTrue(live.map((x) => x.bi > 0)), countTrue(live.map((x) => x.bi < 0))) / live.length, 3);
  out.biOverLimit = r(Math.abs(Number(end?.bi ?? Number.NaN)) / (end?.limit ?? Number.NaN), 3);
  out.biRising = r(countTrue(live.slice(1).map((x, i) => Math.abs(x.bi) > Math.abs(live[i].bi))) / Math.max(1, live.length - 1), 3);
  out.fbAbsMedian = r(median(absCol(live, 'fb')), 3);
  out.fbPeak = r(peak(absCol(live, 'fb')), 2);
  // Of the saturated ticks, what the three terms were worth: the share of |raw| each carries at the median.
  const satTicks = live.filter((x) => x.sat === 1);
  out.satFfShare = r(median(satTicks.map((x) => Math.abs(x.ff) / Math.abs(x.raw))), 3);
  out.satBiShare = r(median(satTicks.map((x) => Math.abs(x.bi) / Math.abs(x.raw))), 3);
  out.satFbShare = r(median(satTicks.map((x) => Math.abs(x.fb) / Math.abs(x.raw))), 3);
  // Which state the feedback is mostly on, over the saturated ticks and over the live window.
  const tally = (w: Tick[]) => {
    const c = new Map<number, number>();
    for (const x of w) c.set(x.fbTopAt, (c.get(x.fbTopAt) ?? 0) + 1);
    return [...c.entries()].sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k}:${v}`).join(',');
  };
  out.fbTopTally = tally(live);
  out.fbTopTallySat = tally(satTicks);
  out.fbBankMedian = r(median(absCol(live, 'fbBank')), 3);
  out.fbBankRateMedian = r(median(absCol(live, 'fbBankRate')), 3);
  out.fbRollMedian = r(median(absCol(live, 'fbRoll')), 3);
  out.fbRollRateMedian = r(median(absCol(live, 'fbRollRate')), 3);
  out.fbRestMedian = r(median(absCol(live, 'fbRest')), 3);

  // 2. the prediction error, against doing nothing
  const withStale = live.filter((x) => Number.isFinite(x.staleBank));
  out.staleRows = withStale.length;
  out.predBankAbsMedian = r(median(absCol(withStale, 'predBank')), 3);
  out.predBankPeak = r(peak(absCol(withStale, 'predBank')), 2);
  out.staleBankAbsMedian = r(median(absCol(withStale, 'staleBank')), 3);
  out.staleBankPeak = r(peak(absCol(withStale, 'staleBank')), 2);
  out.predBeatsStaleBank = r(countTrue(withStale.map((x) => Math.abs(x.predBank) < Math.abs(x.staleBank))) / Math.max(1, withStale.length), 3);
  out.predOverStaleBank = r(median(withStale.map((x) => Math.abs(x.predBank) / Math.max(1e-12, Math.abs(x.staleBank)))), 3);
  out.predRmsMedian = r(median(col(withStale, 'predRms')), 5);
  out.staleRmsMedian = r(median(col(withStale, 'staleRms')), 5);
  out.predBeatsStaleRms = r(countTrue(withStale.map((x) => x.predRms < x.staleRms)) / Math.max(1, withStale.length), 3);
  const lateStale = late.filter((x) => Number.isFinite(x.staleBank));
  const earlyStale = early.filter((x) => Number.isFinite(x.staleBank));
  out.lateRows = lateStale.length;
  out.predBeatsStaleLate = r(countTrue(lateStale.map((x) => x.predRms < x.staleRms)) / Math.max(1, lateStale.length), 3);
  out.predBeatsStaleEarly = r(countTrue(earlyStale.map((x) => x.predRms < x.staleRms)) / Math.max(1, earlyStale.length), 3);
  out.predBankLatePeak = r(peak(absCol(lateStale, 'predBank')), 2);
  out.predBankEarlyPeak = r(peak(absCol(earlyStale, 'predBank')), 2);
  out.predAnkleAbsMedian = r(median(absCol(withStale, 'predAnkle')), 3);
  out.staleAnkleAbsMedian = r(median(absCol(withStale, 'staleAnkle')), 3);
  out.innovBankAbsMedian = r(median(absCol(withStale, 'innovBank')), 4);
  out.innovBankPeak = r(peak(absCol(withStale, 'innovBank')), 3);

  // 3. the prediction's own contribution to the command
  out.predSharePeak = r(peak(absCol(live, 'predShare')), 2);
  out.predShareAbsMedian = r(median(absCol(live, 'predShare')), 3);
  out.stalecmdSatRows = countTrue(live.map((x) => Math.abs(x.stalecmd) >= x.limit - 1e-12));
  out.stalecmdAbsMedian = r(median(absCol(live, 'stalecmd')), 3);
  out.predShareOverLimit = r(median(live.map((x) => Math.abs(x.predShare) / x.limit)), 3);

  // 4. does it fight the input
  const steered = live.filter((x) => Number.isFinite(x.fbOverFf));
  out.steeredRows = steered.length;
  out.fbOverFfMedian = r(median(col(steered, 'fbOverFf')), 3);
  out.fbOverFfOpposing = r(countTrue(steered.map((x) => x.fbOverFf < 0)) / Math.max(1, steered.length), 3);
  out.fbCancelsHalf = r(countTrue(steered.map((x) => x.fbOverFf < -0.5)) / Math.max(1, steered.length), 3);
  // Does the command end up with the asked lean's own sign? (The model's sign is reversed, so `ff` and `raw`
  // agreeing in sign means the command is going the way the steady turn asks.)
  out.rawWithFf = r(countTrue(steered.map((x) => x.raw * x.ff > 0)) / Math.max(1, steered.length), 3);
  out.appliedOverFf = r(median(steered.map((x) => -x.applied / x.ff)), 3);
  return out;
}

const rows: Record<string, unknown>[] = [];
const t0 = Date.now();
for (const st of STANCES) {
  for (const steer of STEERS) {
    if (ENTRIES) for (const en of ENTRIES) rows.push(oneRun(st, 0, en, steer));
    else for (const extra of EXTRAS) rows.push(oneRun(st, extra, null, steer));
  }
}
for (const row of rows) emit(row);

const nf = (k: string) => rows.map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const fellRows = rows.filter((x) => x.fell);
const arm = `${rows.length} runs · rider ${RIDER} · gains ${GAINS} · bias ${BIAS} · felt ${FELT ?? 'world'} · ${ENTRIES ? `ENTRIES ${ENTRIES.join('/')} m/s absolute` : `EXTRAS ${EXTRAS.join('/')} relative`} · steers ${STEERS.join('/')}`;
console.log(`## loop (3.3n) — ${arm}`);
console.log(`   face ${f(FACE[0], 2)} m / ${f(FACE[1], 0)}° / ${f(FACE[2], 2)} m/s, ${SECONDS} s each · ${f((Date.now() - t0) / 1000, 0)} s wall`);
console.log(`   fell ${fellRows.length} of ${rows.length}${fellRows.length ? ` at ${span(nf('fellAt'), 3)} s (median ${f(median(nf('fellAt')), 3)})` : ''} · kinds: ${[...new Set(rows.map((x) => String(x.fell)))].join(', ')}`);
console.log(`   REPRODUCTION columns: roll ${span(nf('rollFall'))}° · bank ${span(nf('bankFall'))}° · rail ${span(nf('railFall'))}° · frames ${span(nf('frames'), 0)} · through ${span(nf('throughFall'), 3)} m/s`);
if (GAINS === 'zero') {
  console.log('   (the dead-ankle arm: the commanded rest is pinned at 0 and the predictor is never ticked, so every loop column is absent by construction)');
} else {
  console.log(`   P0a the command's identity, peak relative residual: ${span(nf('idResPeak'), 14)} · P0b the clamp clamps on every tick: ${rows.filter((x) => x.clampCheck === 1).length} of ${rows.length} runs`);
  console.log(`   P0d the first six ticks (the filter has not run): |predicted bank| peak ${span(nf('virginPredBankPeak'), 3)}° · |its error| less |the sense| ${span(nf('virginErrLessSense'), 3)}°`);
  console.log('   §1 THE COMMAND, decomposed (° in the model\'s sign)');
  console.log(`      the sent command at its ±${f(ANKLE_REST_RANGE * DEG, 3)}° bound: share of live ticks ${span(nf('satShare'), 3)} · of ALL ticks ${span(nf('satShareAll'), 3)} · runs that EVER saturate ${rows.filter((x) => x.satEver === 1).length} of ${rows.length}`);
  console.log(`      the COMMANDED rest at its own applied bound: share of live ticks ${span(nf('atBoundShare'), 3)} · runs that ever reach it ${rows.filter((x) => x.atBoundEver === 1).length} of ${rows.length} · the bite shut on ${span(nf('biteShutRows'), 0)} ticks a run`);
  console.log(`      saturated ticks with the bite OPEN: ${span(nf('satAndBiteOpen'), 0)} a run, of which the commanded rest was at the bound in ${span(nf('satOpenAtBound'), 0)}`);
  console.log(`      |commanded + sent| (the gap between the rest the game commands and what the loop records sending): peak ${span(nf('cmdGapPeak'), 4)}° · with the bite OPEN ${span(nf('cmdGapOpenPeak'), 6)}°`);
  console.log(`      |raw| median ${span(nf('rawAbsMedian'), 3)}° peak ${span(nf('rawPeak'))}° (all ticks ${span(nf('rawPeakAll'))}°) · |commanded| median ${span(nf('cmdAbsMedian'), 3)}° peak ${span(nf('cmdPeak'), 3)}° · |lagged| median ${span(nf('appliedAbsMedian'), 3)}°`);
  console.log(`      the model's own prediction of that lagged rest against the game's: |error| median ${span(nf('restErrAbsMedian'), 3)}° peak ${span(nf('restErrPeak'))}°`);
  console.log(`      the BIAS as an integrator: one sign in ${span(nf('biOneSign'), 3)} of ticks · |bias| rising in ${span(nf('biRising'), 3)} · at the end it is ${span(nf('biOverLimit'), 3)} of the bound`);
  console.log(`      the three terms: |feedforward| median ${span(nf('ffAbsMedian'), 4)}° peak ${span(nf('ffPeak'), 3)}° · |bias| median ${span(nf('biAbsMedian'), 4)}° peak ${span(nf('biPeak'), 3)}° (at the fall ${span(nf('biAtFall'), 3)}°) · |feedback| median ${span(nf('fbAbsMedian'), 3)}° peak ${span(nf('fbPeak'))}°`);
  console.log(`      of the SATURATED ticks, each term's median share of |raw|: ff ${span(nf('satFfShare'), 3)} · bias ${span(nf('satBiShare'), 3)} · feedback ${span(nf('satFbShare'), 3)}`);
  console.log(`      the feedback's own split, |median| °: the board's roll ${span(nf('fbRollMedian'), 3)} · its rate ${span(nf('fbRollRateMedian'), 3)} · the bank ${span(nf('fbBankMedian'), 3)} · its rate ${span(nf('fbBankRateMedian'), 3)} · the lagged rest ${span(nf('fbRestMedian'), 3)}`);
  console.log('   §2 THE PREDICTION ERROR, against the error of not predicting (the stale sense the filter is fed)');
  console.log(`      the bank: the predictor's |error| median ${span(nf('predBankAbsMedian'), 3)}° peak ${span(nf('predBankPeak'))}° · the stale sense's |error| median ${span(nf('staleBankAbsMedian'), 3)}° peak ${span(nf('staleBankPeak'))}°`);
  console.log(`      the predictor beats the stale sense on the bank in ${span(nf('predBeatsStaleBank'), 3)} of ticks · |pred| / |stale| median ${span(nf('predOverStaleBank'), 3)}`);
  console.log(`      over all seven senses (rms in their own units): predictor ${span(nf('predRmsMedian'), 5)} · stale ${span(nf('staleRmsMedian'), 5)} · predictor better in ${span(nf('predBeatsStaleRms'), 3)} of ticks`);
  console.log(`      … in the FIRST 0.6 s ${span(nf('predBeatsStaleEarly'), 3)} · in the LAST 0.2 s before the ride ended ${span(nf('predBeatsStaleLate'), 3)}`);
  console.log(`      the predicted bank's own error, peak: early ${span(nf('predBankEarlyPeak'))}° · late ${span(nf('predBankLatePeak'))}°`);
  console.log(`      the filter's own fit to the measurement it is handed (the innovation on the bank): |median| ${span(nf('innovBankAbsMedian'), 4)}° peak ${span(nf('innovBankPeak'), 3)}°`);
  console.log('   §3 THE PREDICTION\'S OWN CONTRIBUTION to the command');
  console.log(`      |raw − (the same gains on the 0.1 s-old estimate)|: median ${span(nf('predShareAbsMedian'), 3)}° peak ${span(nf('predSharePeak'))}° · over the bound ${span(nf('predShareOverLimit'), 3)}`);
  console.log(`      the no-prediction command would itself have saturated on ${span(nf('stalecmdSatRows'), 0)} ticks a run · its |median| ${span(nf('stalecmdAbsMedian'), 3)}°`);
  console.log('   §4 DOES IT FIGHT THE INPUT (ticks whose feedforward is past 0.1°)');
  console.log(`      ticks ${span(nf('steeredRows'), 0)} a run · feedback / feedforward median ${span(nf('fbOverFfMedian'), 3)} · it OPPOSES in ${span(nf('fbOverFfOpposing'), 3)} of them · it cancels past half in ${span(nf('fbCancelsHalf'), 3)}`);
  console.log(`      the raw command keeps the feedforward's sign in ${span(nf('rawWithFf'), 3)} · the APPLIED rest over the steady turn's own ${span(nf('appliedOverFf'), 3)}`);
}
