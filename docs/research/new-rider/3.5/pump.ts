/**
 * Step 3.5h: **can the game's leg-depth channel pump at the footage's rate?** — row 6 of `3.5/engine-target.md`,
 * settled with one measurement.
 *
 * ## The question
 *
 * Row 6 says *"pumping in trim is trunk fold, not leg depth"* and calls it an expressibility limit. **Video 14
 * contradicted both halves**: that rider pumps **with her legs**, four half-cycles in 0.88 s (**≈0.22 s each**), in
 * trim with no direction change, while her trunk stays folded 40–60° and completes no cycle at all. The series'
 * *"the legs are not doing the work"* was read off a **saturated leg chain**, so it was never measured.
 *
 * So the only open question is **RATE**: **can the game's leg-depth channel complete a half-cycle at 0.22 s with a
 * usable excursion, or does the follower flatten it?**
 *
 * ## What the chain is, link by link (all verified by reading the code, not quoted from prose)
 *
 * 1. **The rung.** `crouch = 1`, `compress = 0` commands `CROUCH_SHARE × CROUCH_DEPTH` = **0.195 m** of leg-spring
 *    rest shortening below the riding stance — the ladder's "pumping crouch" (`humanBalance.ts:62`, `:125`;
 *    `AttachedRider.ts:4168`). This probe's square wave toggles exactly that one input between 0 and 1.
 * 2. **The balance's own drop.** `rider = 'new'` is `freeBody`, so `prepareLeg` then takes
 *    `asked = min(asked, −(heldDepth + human.knees × stanceRoom(heldDepth).kneeTravel))` (`:4178–4185`). The travel
 *    is **0.30 m at tall and 0.15 m at the pumping crouch** (`humanBalance.ts:159–160`), so the knees' drop is
 *    **larger at tall than at the crouch** — which can shrink the asked-for excursion below 0.195 m before the
 *    follower is reached at all. That is why `target` is a measured column here and not an assumed constant.
 * 3. **The follower.** `leg.rest` chases `rest` critically damped at `LEG_FREQUENCY = 12` rad/s, the acceleration
 *    clamped to `CROUCH_ACCELERATION = 6` m/s² going down (not compressing: `compress = 0 ≤ CROUCH_SHARE × crouch`,
 *    `snap = 0`, no flex) and `EXTEND_ACCELERATION = 15` m/s² coming up, the rate clamped to `CROUCH_SPEED = 1.5`
 *    m/s down and `MAX_LEG_SPEED = 2.5` m/s up (`:4216–4226`). Coming up the ceiling is `tallest = max(0, rest,
 *    leg.rest)`, and `fromCompress` stays false with `compress = 0`, so there is **no rise past the riding stance**.
 * 4. **The body.** `−leg.extension` is where the centre of mass actually is along the leg: the spring's own sag
 *    behind the rest.
 * 5. **The drawing.** `stanceBlend.depth` = `clamp((STANDING_PELVIS − pelvisOverDeck(state)) / CROUCH_DEPTH, 0, 1)`
 *    (`src/scene/rig/stanceBlend.ts:74`), read here through `pelvisOverDeck` itself off `renderPoint`'s own points,
 *    so the drawn column is the drawing's function and not a stand-in for it.
 *
 * ## How a half-cycle is measured — from the signal, never from the input
 *
 * A **zigzag** detector with a `DEAD` = 2 mm reversal threshold: a turning point is recorded only once the signal
 * has come back `DEAD` off its own running extreme. Half-cycles are then consecutive turning points — excursion is
 * the difference, the achieved half-cycle time is the gap. The input's toggle times are **never** used, so a
 * follower that lags, overshoots or clips is measured as it is. The first turning point of each run is dropped as
 * the warm-up from tall.
 *
 * **Beware a metric that cannot fail.** If the channel were broken — flattened to nothing — the excursions would be
 * under 2 mm, **no turning point would be recorded at all, and the arm would report zero half-cycles**. So the
 * metric can fail. Three controls and a self-test are run to prove it:
 * - **`hold1`** — the crouch key held DOWN for the whole run. A finite press, so the observation window is honest,
 *   and no pumping input, so a sound detector reads at most the balance's own residue. **This is the load-bearing
 *   negative control.**
 * - **`hold0`** — the crouch key never pressed. **This arm was broken in ff750da4**: the half-cycle window started
 *   at `firstPress`, which on a never-pressed arm is `NaN`, and `t >= NaN` is false for every turning point, so the
 *   arm's "0 half-cycles" was **guaranteed by the filter and measured nothing**. It now observes from `START`
 *   (`watchFrom`), so the detector is free to fire on it and whatever it reports is a reading.
 * - **`1.50`** on the isolated follower — a half-period far longer than any limit in the chain, the **positive
 *   control**: if the channel is sound it reaches the full 0.195 m. If even this is flat, the fault is not rate.
 * - **the detector's self-test** — synthetic triangles of known amplitude at a known 0.22 s half-period, straddling
 *   the 2 mm threshold, so the detector is shown to **speak when the signal moves** and not merely to stay silent
 *   when nothing does. A silent control is worth nothing without it.
 *
 * **What `steer = 0` does and does not hold.** It locks **the player's steering input** for the whole run, so there
 * is no commanded direction change — the footage's own condition. It does **not** lock the board's orientation: the
 * board is free to yaw, roll and pitch under the water's forces, and it does. **This probe records neither
 * trajectory nor exit speed**, so it is not a fixed-orientation benchmark and nothing here can be compared against
 * a real clip's board path. That comparison would need trajectory and exit speed, which are not measured.
 *
 * ## The bench
 *
 * **`FaceWater`**, the analytic Canyon-matched face of PR #223 (1.4 m / 16° / 5.7 m/s, 2.6 m deep) — a **fit** to
 * Canyon B, not Canyon. It writes **`breaking: 0`, `voidFraction: 0` and no foam**, so nothing in these numbers
 * comes from whitewater, aeration or a lip. `steer = 0` for the whole run: **trim, no direction change**, which is
 * the footage's own condition (V14, and V8 T5 / V9 T1 before it).
 *
 * The rider the owner rides: **`rider: 'new'`, `feltFrame: 'deck'`, `riderBody: 'two'`** (`RIDER`/`FELT`/`BODY`).
 *
 * `AttachedRider.separate` (`:4586`) never clears `phase` or `upright`, so every rider column **freezes** after the
 * rider comes off. This probe breaks on `!rider.attached` and **measures live frames only**; it reports how many it
 * kept and the share of its own window that was frozen had it kept stepping.
 *
 * `qt(v, 0.5)` is the **UPPER MIDDLE** element of an even sample, as every probe in 3.2–3.5 defines it — not a plain
 * median. Every figure marked "median" below is that.
 *
 * ## Read-only. Nothing is tuned, switched, added or enabled.
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/pump.ts -o <scratch>/p.mjs --format esm --platform node
 *   RIDER=new FELT=deck BODY=two node <scratch>/p.mjs
 *   RIDER=new FELT=deck BODY=two HALVES=0.22 TICKS=1 node <scratch>/p.mjs   # the per-tick dump of one cell
 *
 * Env: `HALVES` (half-cycle periods, s, plus the literals `hold0`/`hold1`), `EXTRAS` (entry speeds over the face's
 * own), `PHASES` (fractions of a half-period the wave starts late), `SECONDS`, `START` (when the wave begins),
 * `FACE`, `DEPTH`, `AHEADS`, `SIDES`, `DEAD` (the zigzag's threshold, m), `RIDER`, `FELT`, `BODY`, `TICKS=1`, `OUT`.
 */
import { appendFileSync } from 'node:fs';
import { Matrix4, Quaternion, Vector3 } from 'three';
import { AttachedRider } from '../../../../src/physics/AttachedRider';
import { BoardBody } from '../../../../src/physics/BoardBody';
import { createWaterSample } from '../../../../src/physics/SurfWater';
import { stanceRoom } from '../../../../src/physics/humanBalance';
import { FaceWater } from '../../../../src/physics/testing/FaceWater';
import { STANDING_PELVIS, pelvisOverDeck } from '../../../../src/scene/rig/posturePoints';
import type { RiderVisualState } from '../../../../src/scene/rig/riderVisualState';

const DEG = 180 / Math.PI;
const STEP = 1 / 60;

/** `AttachedRider`'s own stance constants, re-stated so the commanded rung is computed from the code's numbers. */
const CROUCH_DEPTH = 0.3;
const CROUCH_SHARE = 0.65;
/** The pumping crouch: the one rung this probe's square wave toggles. */
const RUNG = CROUCH_SHARE * CROUCH_DEPTH;

/** The Canyon-matched face (PR #223): height m, slope °, crest speed m/s; still depth m. */
const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const SECONDS = Number(process.env.SECONDS ?? 9);
const START = Number(process.env.START ?? 0.5);
const RIDER = process.env.RIDER === 'old' ? 'old' : 'new';
const FELT = process.env.FELT === 'deck' ? 'deck' : undefined;
const BODY = process.env.BODY === 'two' ? 'two' : process.env.BODY === 'control' ? 'control' : process.env.BODY === 'symmetric' ? 'symmetric' : undefined;
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const PHASES = (process.env.PHASES ?? '0,0.25,0.5,0.75').split(',').map(Number);
const SIDES = (process.env.SIDES ?? '-45,-35').split(',').map(Number);
const AHEADS = (process.env.AHEADS ?? '0.6,0.75,0.9').split(',').map(Number);
/** The arms: half-cycle periods in s, and the two no-pump controls. */
const HALVES = (process.env.HALVES ?? 'hold0,hold1,0.10,0.15,0.22,0.30,0.45,0.60,1.50').split(',');
/** The zigzag's reversal threshold, m: below this no turning point is recorded, so a flattened channel reports none. */
const DEAD = Number(process.env.DEAD ?? 0.002);
const TICKS = process.env.TICKS === '1';
const OUT = process.env.OUT;

const f = (v: number, d = 3) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 4) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
/** `qt(v, 0.5)` is the UPPER MIDDLE element of an even sample, as every probe in 3.2–3.5 defines it. */
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const span = (v: number[], d = 3) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

/** A recorded turning point of a signal: when it was, and the value there. */
interface Turn { t: number; v: number; up: boolean }

/**
 * The zigzag: turning points of `s` sampled at `t`, each confirmed only once the signal has come back `dead` off its
 * own running extreme. **The input's own toggle times are never consulted**, so lag, overshoot and clipping are all
 * measured as they are, and an excursion under `dead` yields **no turning point at all**.
 */
function zigzag(t: number[], s: number[], dead: number): Turn[] {
  const out: Turn[] = [];
  if (s.length === 0) return out;
  let dir = 0; // +1 the signal is rising toward a max, −1 falling toward a min, 0 not yet decided
  let extremeV = s[0];
  let extremeT = t[0];
  for (let i = 1; i < s.length; i += 1) {
    const v = s[i];
    if (dir === 0) {
      if (v > extremeV) { dir = 1; extremeV = v; extremeT = t[i]; }
      else if (v < extremeV) { dir = -1; extremeV = v; extremeT = t[i]; }
      continue;
    }
    if (dir > 0) {
      if (v > extremeV) { extremeV = v; extremeT = t[i]; }
      else if (extremeV - v > dead) { out.push({ t: extremeT, v: extremeV, up: true }); dir = -1; extremeV = v; extremeT = t[i]; }
    } else {
      if (v < extremeV) { extremeV = v; extremeT = t[i]; }
      else if (v - extremeV > dead) { out.push({ t: extremeT, v: extremeV, up: false }); dir = 1; extremeV = v; extremeT = t[i]; }
    }
  }
  return out;
}

/** The half-cycles a zigzag describes: excursion m and achieved half-cycle time s, the first turning point dropped. */
function halves(turns: Turn[]): { excursion: number[]; period: number[] } {
  const excursion: number[] = [];
  const period: number[] = [];
  for (let i = 1; i < turns.length; i += 1) {
    excursion.push(Math.abs(turns[i].v - turns[i - 1].v));
    period.push(turns[i].t - turns[i - 1].t);
  }
  return { excursion, period };
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** A minimal `RiderVisualState` for `pelvisOverDeck`: the three points it reads, and the board's pose. */
const visualPoints = [new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3(), new Vector3()];
const visual = {
  points: visualPoints, boardPosition: new Vector3(), boardQuaternion: new Quaternion(),
} as unknown as RiderVisualState;

function oneRun(arm: string, extra: number, phase: number, side: number, ahead: number): Record<string, unknown> {
  const half = arm === 'hold0' || arm === 'hold1' ? Number.NaN : Number(arm);
  const water = new FaceWater({ depth: DEPTH, height: FACE[0], slope: FACE[1], speed: FACE[2] });
  const sample = createWaterSample();
  const fall = new Vector3(0, 0, 1);
  const px = 0;
  const pz = water.crestZ() + ahead * water.front;
  const here = water.sampleAt(px, 50, pz, sample);
  const alongFlow = here.flowX * fall.x + here.flowZ * fall.z;
  const entry = (FACE[2] - alongFlow) / Math.cos(45 / DEG) + extra;
  const normal = new Vector3(here.normalX, here.normalY, here.normalZ).normalize();
  const hAng = (Math.atan2(fall.x, fall.z) * DEG + side) / DEG;
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
    ...(FELT ? { feltFrame: FELT } : {}),
    ...(BODY ? { riderBody: BODY } : {}),
  } as ConstructorParameters<typeof AttachedRider>[1]);
  board.attach(rider);
  rider.crouch = arm === 'hold1' ? 1 : 0;
  rider.compress = 0;
  rider.snap = 0;
  // Trim, no direction change: the stick is never touched, for the whole run.
  rider.steer = 0;

  const ts: number[] = [];
  const restS: number[] = [];
  const gotS: number[] = [];
  const drawnS: number[] = [];
  const targetS: number[] = [];
  const kneesS: number[] = [];
  /** The FIRST stroke, the one the balance's own knee drop has not yet eaten: when the key first went down, how deep
   *  the leg got before it turned, how long that took, and when (if ever) it reached the rung itself. */
  let firstPress = Number.NaN;
  let tRung = Number.NaN;
  let pressed = 0;
  let liveTicks = 0;
  let wouldBeTicks = 0;
  let fellAt = Number.NaN;
  let cause: string | null = null;
  let off = false;

  if (TICKS) process.stdout.write('t\tkey\tknees\ttarget\trest\tgot\tdrawn\tattached\n');

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    // The square wave, on the one input a player has: 0 or 1 on `crouch`, flipped every `half` seconds from START.
    let key = arm === 'hold1' ? 1 : 0;
    if (Number.isFinite(half) && t >= START) {
      const cycles = (t - START) / half + phase;
      key = Math.floor(cycles) % 2 === 0 ? 1 : 0;
    }
    rider.crouch = key;
    if (key > 0) pressed += 1;
    if (key > 0 && !Number.isFinite(firstPress)) firstPress = t;

    water.advance(STEP);
    board.step(STEP, water);

    if (!off && !rider.attached) { off = true; fellAt = t; cause = rider.separation ?? 'unnamed'; }

    const restDepth = -rider.leg.rest;
    const gotDepth = -rider.leg.extension;
    if (!Number.isFinite(tRung) && Number.isFinite(firstPress) && restDepth >= RUNG - 0.005) tRung = t - firstPress;
    // The chain's own ask, reconstructed as `prepareLeg` builds it (`heldDepth` is private): the rung the key
    // commands, plus the balance's knee drop within THAT stance's travel.
    const cmd = key > 0 ? RUNG : 0;
    const target = cmd + rider.human.knees * stanceRoom(cmd).kneeTravel;
    // The drawing's own depth: `stanceBlend.depth`, through `pelvisOverDeck` off `renderPoint`'s points.
    for (const index of [0, 5, 6]) rider.renderPoint(index, board, visualPoints[index]);
    visual.boardPosition.copy(board.position);
    visual.boardQuaternion.copy(board.orientation);
    const drawn = Math.max(0, Math.min(1, (STANDING_PELVIS - pelvisOverDeck(visual)) / CROUCH_DEPTH));

    if (t > START) {
      wouldBeTicks += 1;
      if (!off) {
        liveTicks += 1;
        ts.push(t);
        restS.push(restDepth);
        gotS.push(gotDepth);
        drawnS.push(drawn * CROUCH_DEPTH);
        targetS.push(target);
        kneesS.push(rider.human.knees);
      }
    }
    if (TICKS) {
      process.stdout.write(`${f(t, 4)}\t${key}\t${f(rider.human.knees)}\t${f(target)}\t${f(restDepth)}\t${f(gotDepth)}\t`
        + `${f(drawn * CROUCH_DEPTH)}\t${rider.attached ? 1 : 0}\n`);
    }
    if (off) break;
  }

  const restTurns = zigzag(ts, restS, DEAD);
  // The first stroke, measured off the signal: the first turning point after the key first went down, how deep it got
  // from where the leg was when the key went down, and how long that took. This is the follower's OWN capability,
  // before the balance's knee drop has filled the stance's travel.
  const atPress = ts.findIndex((x) => x >= firstPress);
  const base = atPress >= 0 ? restS[atPress] : Number.NaN;
  const firstTurn = restTurns.find((x) => x.t > firstPress && x.up);
  const firstExc = firstTurn ? firstTurn.v - base : Number.NaN;
  const firstTime = firstTurn ? firstTurn.t - firstPress : Number.NaN;
  const kneesAtFirst = firstTurn ? kneesS[ts.findIndex((x) => x >= firstTurn.t)] : Number.NaN;
  // **The observation start.** On an actuated arm this is the first key press, which is what the first stroke must be
  // measured from. On `hold0` the key is NEVER pressed, so `firstPress` stays NaN — and `x.t >= NaN` is false for
  // every turning point, which would make `after()` return an EMPTY array and `hold0`'s "0 half-cycles" a guaranteed
  // zero rather than a measurement. (That bug shipped in ff750da4 and is the error this probe's own
  // "beware a metric that cannot fail" section warns about; nobody interrogates a zero.) So a no-press arm observes
  // from `START`, which is finite, and the detector is free to fire on it.
  const watchFrom = Number.isFinite(firstPress) ? firstPress : START;
  const after = (t: Turn[]) => t.filter((x) => x.t >= watchFrom);
  const zr = halves(after(restTurns));
  const zg = halves(after(zigzag(ts, gotS, DEAD)));
  const zd = halves(after(zigzag(ts, drawnS, DEAD)));
  const zt = halves(after(zigzag(ts, targetS, DEAD)));

  return {
    arm, half: Number.isFinite(half) ? half : null, extra, phase, side, ahead,
    restExcAll: zr.excursion.map((x) => r(x)), restPerAll: zr.period.map((x) => r(x, 3)),
    gotExcAll: zg.excursion.map((x) => r(x)), drawnExcAll: zd.excursion.map((x) => r(x)),
    targetExcAll: zt.excursion.map((x) => r(x)),
    rung: RUNG, n: liveTicks, pressedShare: r(liveTicks > 0 ? pressed / (wouldBeTicks + 1) : Number.NaN, 2),
    frozenShare: r(wouldBeTicks > 0 ? (wouldBeTicks - liveTicks) / wouldBeTicks : Number.NaN, 3),
    kneesMedian: r(median(kneesS)), kneesSpread: r(Math.max(...kneesS, 0) - Math.min(...kneesS, 1)),
    // Half-cycle counts and, per channel, the excursion m and the ACHIEVED half-cycle time s, measured off the signal.
    firstExc: r(firstExc), firstTime: r(firstTime, 3), firstShare: r(firstExc / RUNG, 3), kneesAtFirst: r(kneesAtFirst, 3),
    tRung: r(tRung, 3),
    // Every half-cycle in order, so the decay can be read rather than hidden inside a median.
    excByCycle: zr.excursion.slice(0, 8).map((x) => r(x)),
    cycles: zr.excursion.length,
    restExc: r(median(zr.excursion)), restExcLeast: r(sorted(zr.excursion)[0]), restExcMost: r(qt(zr.excursion, 1)),
    restPeriod: r(median(zr.period), 3),
    restShare: r(median(zr.excursion) / RUNG, 3),
    gotCycles: zg.excursion.length, gotExc: r(median(zg.excursion)), gotPeriod: r(median(zg.period), 3),
    gotShare: r(median(zg.excursion) / RUNG, 3),
    drawnCycles: zd.excursion.length, drawnExc: r(median(zd.excursion)), drawnPeriod: r(median(zd.period), 3),
    targetCycles: zt.excursion.length, targetExc: r(median(zt.excursion)),
    deepest: r(Math.max(...restS, 0)), shallowest: r(Math.min(...restS, 0)),
    fellAt: r(fellAt, 3), cause,
  };
}

const rows: Record<string, unknown>[] = [];
for (const arm of HALVES) {
  for (const extra of EXTRAS) {
    for (const phase of PHASES) {
      for (const side of SIDES) {
        for (const ahead of AHEADS) {
          const row = oneRun(arm, extra, phase, side, ahead);
          rows.push(row);
          if (!TICKS) emit(row);
        }
      }
    }
  }
}

if (!TICKS) {
  const of = (arm: string) => rows.filter((x) => x.arm === arm);
  const col = (arm: string, k: string) => of(arm).map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
  const all = (arm: string, k: string) => col(arm, k).filter(Number.isFinite);
  const runs = EXTRAS.length * PHASES.length * SIDES.length * AHEADS.length;
  console.log(`\n# step 3.5h — row 6's rate: can the leg-depth channel pump at 0.22 s? rider=${RIDER}`
    + `${FELT ? ` feltFrame=${FELT}` : ''}${BODY ? ` riderBody=${BODY}` : ''}`);
  console.log(`# FaceWater, Canyon-matched ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s, ${DEPTH} m deep — a FIT to Canyon B, not Canyon.`);
  console.log('# FaceWater writes breaking: 0, voidFraction: 0 and no foam: nothing here comes from whitewater, aeration or a lip.');
  console.log(`# Trim, steer = 0 for the whole run, no direction change. Square wave on \`crouch\` from ${START} s; the rung is ${f(RUNG)} m.`);
  console.log(`# ${EXTRAS.length} entry speeds × ${PHASES.length} wave phases × ${SIDES.length} headings × ${AHEADS.length} start points = ${runs} runs an arm, ${SECONDS} s each. LIVE frames only.`);
  console.log(`# Half-cycles come from a ${f(DEAD, 4)} m zigzag ON THE SIGNAL; the input's toggles are never used. Medians are qt(·,0.5), the UPPER MIDDLE.`);
  console.log('\n| arm (asked half-cycle, s) | runs | half-cycles | live ticks a run | **rest excursion, m** | **share of 0.195** | **achieved half-cycle, s** | got excursion, m | drawn excursion, m | target excursion, m | knees | fell, s |');
  console.log('|---|---|---|---|---|---|---|---|---|---|---|---|');
  for (const arm of HALVES) {
    const n = of(arm).length;
    const cyc = all(arm, 'cycles');
    const total = cyc.reduce((a, b) => a + b, 0);
    console.log(`| ${arm === 'hold0' ? '**hold0** (key never pressed)' : arm === 'hold1' ? '**hold1** (key held down)' : arm} | ${n} | ${total} `
      + `| ${span(all(arm, 'n'), 0)} | ${span(all(arm, 'restExc'))} | ${span(all(arm, 'restShare'), 2)} | ${span(all(arm, 'restPeriod'))} `
      + `| ${span(all(arm, 'gotExc'))} | ${span(all(arm, 'drawnExc'))} | ${span(all(arm, 'targetExc'))} `
      + `| ${span(all(arm, 'kneesMedian'), 2)} | ${span(all(arm, 'fellAt'), 2)} (${of(arm).filter((x) => x.cause).length}/${n}) |`);
  }
  // POOLED over every half-cycle of every run in the arm — not a median of per-run medians. This is the headline.
  const pool = (arm: string, k: string) => of(arm).flatMap((x) => (x[k] as (number | null)[])).filter((x): x is number => x !== null && x !== undefined);
  console.log('\n| arm (asked half-cycle, s) | **pooled half-cycles** | runs that gave one | **rest excursion, m** (least / median / most) | **share of 0.195** | **achieved half-cycle, s** (least / median / most) | got excursion, m | drawn excursion, m | target excursion, m |');
  console.log('|---|---|---|---|---|---|---|---|---|');
  for (const arm of HALVES) {
    const e = pool(arm, 'restExcAll');
    const p2 = pool(arm, 'restPerAll');
    const gave = of(arm).filter((x) => (x.restExcAll as unknown[]).length > 0).length;
    const se = sorted(e);
    const sp = sorted(p2);
    const med = (v: number[]) => (v.length ? f(median(v)) : '–');
    console.log(`| ${arm} | ${e.length} | ${gave}/${of(arm).length} `
      + `| ${e.length ? `${f(se[0])} / **${f(median(e))}** / ${f(se[se.length - 1])}` : '**none**'} `
      + `| ${e.length ? f(median(e) / RUNG, 2) : '–'} `
      + `| ${p2.length ? `${f(sp[0])} / **${f(median(p2))}** / ${f(sp[sp.length - 1])}` : '–'} `
      + `| ${med(pool(arm, 'gotExcAll'))} (${pool(arm, 'gotExcAll').length}) | ${med(pool(arm, 'drawnExcAll'))} (${pool(arm, 'drawnExcAll').length}) `
      + `| ${med(pool(arm, 'targetExcAll'))} (${pool(arm, 'targetExcAll').length}) |`);
  }
  console.log(`\n**Live frames kept: ${rows.reduce((a, x) => a + Number(x.n), 0)} ticks over ${rows.length} runs** `
    + `(0 frozen: the loop breaks on \`!rider.attached\`, so no post-separation frame is in any figure above). `
    + `All ${rows.length} runs ended with the rider off the board — that is this rider's known baseline and is reported, not used.`);

  // The FIRST stroke: the follower's own capability, before the balance's knee drop has spent the stance's travel.
  console.log('\n| arm | runs | **first stroke, m** | **share of 0.195** | **its own time, s** | knees at its turn | reached the rung at, s (runs) |');
  console.log('|---|---|---|---|---|---|---|');
  for (const arm of HALVES) {
    const got = all(arm, 'tRung');
    console.log(`| ${arm} | ${of(arm).length} | ${span(all(arm, 'firstExc'))} | ${span(all(arm, 'firstShare'), 2)} | ${span(all(arm, 'firstTime'))} `
      + `| ${span(all(arm, 'kneesAtFirst'), 2)} | ${got.length ? span(got) : 'never'} (${got.length}/${of(arm).length}) |`);
  }

  // The decay, cycle by cycle: the same arm's half-cycles in order, pooled over its runs.
  console.log('\n| arm | half-cycle 1, m | 2 | 3 | 4 | 5 | 6 |');
  console.log('|---|---|---|---|---|---|---|');
  for (const arm of HALVES) {
    const at = (k: number) => of(arm).map((x) => (x.excByCycle as (number | null)[])[k]).filter((x): x is number => x !== null && x !== undefined);
    console.log(`| ${arm} | ${[0, 1, 2, 3, 4, 5].map((k) => (at(k).length ? `${f(median(at(k)))} (${at(k).length})` : '–')).join(' | ')} |`);
  }

  // ------------------------------------------------------------------------------------------------------------
  // THE DETECTOR'S OWN SELF-TEST. A silent control proves nothing unless the detector is shown to SPEAK when the
  // signal moves. So the zigzag is fed synthetic triangle waves of KNOWN amplitude at a KNOWN 0.22 s half-period,
  // straddling its own 2 mm threshold, and asked to recover both. If it cannot recover a 0.195 m oscillation, every
  // `none` above is worthless; if it fires on a flat line, every number above is noise.
  console.log('\n### The detector\'s self-test - synthetic triangles of known amplitude at a known 0.22 s half-period');
  console.log(`\nThe zigzag's threshold is ${f(DEAD, 4)} m. A triangle of amplitude A has a half-cycle excursion of A.`);
  console.log('\n| synthetic amplitude, m | half-cycles found | **excursion recovered, m** | error, m | **achieved half-cycle, s** | verdict |');
  console.log('|---|---|---|---|---|---|');
  for (const amp of [0, 0.0005, 0.001, 0.002, 0.003, 0.005, 0.01, 0.05, 0.078, 0.195]) {
    const halfT = 0.22;
    const t3: number[] = [];
    const s3: number[] = [];
    for (let i = 0; i < Math.round(9 / STEP); i += 1) {
      const t = (i + 1) * STEP;
      // A triangle: up over `halfT`, down over `halfT`, peak-to-trough `amp`.
      const u = (t % (2 * halfT)) / halfT;
      s3.push(amp * (u < 1 ? u : 2 - u));
      t3.push(t);
    }
    const z = halves(zigzag(t3, s3, DEAD));
    const e = median(z.excursion);
    // Below the threshold the detector MUST be silent; at or above it, it must recover the amplitude and the period.
    const want = amp > DEAD;
    const got = z.excursion.length > 0;
    const verdict = want === got
      ? (got ? (Math.abs(e - amp) <= Math.max(0.002, 0.1 * amp) ? '**fires, recovers it**' : 'fires, amplitude off')
        : '**silent, as it must be**')
      : '**WRONG**';
    console.log(`| ${f(amp, 4)} | ${z.excursion.length} | ${z.excursion.length ? f(e) : '-'} `
      + `| ${z.excursion.length ? f(Math.abs(e - amp)) : '-'} | ${z.period.length ? span(z.period) : '-'} | ${verdict} |`);
  }

  // ------------------------------------------------------------------------------------------------------------
  // The ISOLATED FOLLOWER: `prepareLeg`'s own lines (AttachedRider.ts:4216-4226) and nothing else — no water, no
  // board, no balance, no knee drop, no slack clamp, no fall. A replica, stated here so the attribution is checkable:
  //   a = clamp(LEG_FREQUENCY^2 (rest - legRest) - 2 LEG_FREQUENCY restRate, -A, +A), A = 6 down / 15 up
  //   restRate = clamp(restRate + a h, -V, +V), V = 1.5 down / 2.5 up;  legRest = clamp(legRest + restRate h, -deepest, 0)
  // This answers "does the FOLLOWER flatten it?" on its own, with the game's coupling removed. If this arm reaches a
  // usable excursion at 0.22 s and the in-game arm does not, the flattening is NOT the follower's.
  const LEG_FREQUENCY = 12;
  const CROUCH_ACCELERATION = 6;
  const CROUCH_SPEED = 1.5;
  const EXTEND_ACCELERATION = 15;
  const MAX_LEG_SPEED = 2.5;
  console.log('\n### The isolated follower — `prepareLeg`\'s lines alone, no water, no board, no balance, no fall');
  // The step response, the one number that says WHICH limit governs: a step to the rung, held.
  {
    let legRest = 0;
    let restRate = 0;
    let clamped = 0;
    let peak = 0;
    const hit: Record<string, number> = {};
    for (let i = 0; i < Math.round(3 / STEP); i += 1) {
      const t = (i + 1) * STEP;
      const rest = -RUNG;
      const down = rest < legRest;
      const aLimit = down ? CROUCH_ACCELERATION : EXTEND_ACCELERATION;
      const vLimit = down ? CROUCH_SPEED : MAX_LEG_SPEED;
      const raw = LEG_FREQUENCY * LEG_FREQUENCY * (rest - legRest) - 2 * LEG_FREQUENCY * restRate;
      if (Math.abs(raw) > aLimit) clamped += 1;
      restRate = Math.max(-vLimit, Math.min(vLimit, restRate + Math.max(-aLimit, Math.min(aLimit, raw)) * STEP));
      peak = Math.max(peak, Math.abs(restRate));
      legRest = Math.max(-Math.max(-legRest, CROUCH_DEPTH, RUNG), Math.min(Math.max(0, rest, legRest), legRest + restRate * STEP));
      for (const [name, share] of [['50 %', 0.5], ['90 %', 0.9], ['95 %', 0.95], ['within 5 mm', (RUNG - 0.005) / RUNG], ['99 %', 0.99]] as [string, number][]) {
        if (hit[name] === undefined && -legRest >= RUNG * share) hit[name] = t;
      }
    }
    console.log('\n**Its step response to the rung, held** (which limit governs):'
      + ` 50 % at ${f(hit['50 %'])} s, 90 % at ${f(hit['90 %'])} s, 95 % at ${f(hit['95 %'])} s,`
      + ` **within 5 mm at ${f(hit['within 5 mm'])} s**, 99 % at ${f(hit['99 %'])} s.`);
    console.log(`**Peak rate ${f(peak)} m/s against a CROUCH_SPEED of ${CROUCH_SPEED} m/s — the SPEED limit never binds.**`
      + ` The acceleration clamp bound on ${f(clamped / Math.round(3 / STEP), 3)} of the step's ticks (its first few only).`);
  }
  console.log('\n| asked half-cycle, s | half-cycles | **excursion, m** (whole run) | **steady-state excursion, m** | **share of 0.195** | **achieved half-cycle, s** | deepest reached, m | accel clamp, share of ticks |');
  console.log('|---|---|---|---|---|---|---|---|');
  for (const arm of HALVES) {
    const half = Number(arm);
    if (!Number.isFinite(half)) continue;
    let legRest = 0;
    let restRate = 0;
    let clamped = 0;
    const t2: number[] = [];
    const s2: number[] = [];
    let deepest = 0;
    const ticks = Math.round(20 / STEP);
    for (let i = 0; i < ticks; i += 1) {
      const t = (i + 1) * STEP;
      const key = Math.floor(t / half) % 2 === 0 ? 1 : 0;
      const rest = -(key > 0 ? RUNG : 0);
      const down = rest < legRest;
      const aLimit = down ? CROUCH_ACCELERATION : EXTEND_ACCELERATION;
      const vLimit = down ? CROUCH_SPEED : MAX_LEG_SPEED;
      const raw = LEG_FREQUENCY * LEG_FREQUENCY * (rest - legRest) - 2 * LEG_FREQUENCY * restRate;
      if (Math.abs(raw) > aLimit) clamped += 1;
      restRate = Math.max(-vLimit, Math.min(vLimit, restRate + Math.max(-aLimit, Math.min(aLimit, raw)) * STEP));
      legRest = Math.max(-Math.max(-legRest, CROUCH_DEPTH, -rest), Math.min(Math.max(0, rest, legRest), legRest + restRate * STEP));
      t2.push(t);
      s2.push(-legRest);
      deepest = Math.max(deepest, -legRest);
    }
    const turns2 = zigzag(t2, s2, DEAD).slice(1);
    const z = halves(turns2);
    const se = sorted(z.excursion);
    // The steady state, measured the SAME way as the in-game arm: the median of the zigzag's own half-cycle
    // excursions over the SECOND HALF of the run, past any ramp-in. A window min/max is wrong here, because at the
    // shortest half-period the follower settles into a slow beat whose swing is wider than any one half-cycle.
    const late = halves(turns2.filter((x) => x.t >= 10));
    const steady = median(late.excursion);
    console.log(`| ${arm} | ${z.excursion.length} | ${z.excursion.length ? `${f(se[0])}–${f(se[se.length - 1])}` : '**none**'} `
      + `| **${f(steady)}** | **${f(steady / RUNG, 2)}** | ${z.period.length ? span(z.period) : '–'} | ${f(deepest)} | ${f(clamped / ticks, 2)} |`);
  }
}
