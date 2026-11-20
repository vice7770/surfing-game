/**
 * Step 3.3f: **where the turn rate goes between the spikes, and what ends each one.**
 *
 * Step 3.3e closed the depth question (our Compress already holds the hips 0.48 m over the deck, a 114°-flexed knee,
 * deeper than every measured surfing posture bar an elite pro's aerial landing) and left one sentence as the next
 * question: *"We have the rate in spikes, not in an arc."* Our **peak** heading rate is 72.7–228.6 °/s = 1.3–4.0 rad/s,
 * which brackets Forsyth et al. 2024's measured 1.9 ± 0.1 rad/s on 835 turns — and yet 85° of heading takes us
 * 2.30–3.53 s against their 99° in 0.96 ± 0.04 s. This probe is the measurement of that gap. **It reads; it does not
 * change the game.**
 *
 * **What it found, so the sections below are not read as conclusions** (the round is Part 29 of `3.3/README.md`): the
 * framing above is wrong in two places and both are this probe's own doing. **3.3e's fall test could not see a balance
 * separation**, so its "84 of 84 stood" is the test and not the rides — 96 of 96 runs here fall, and 22.7–92.7 % of
 * 3.3e's measurement window is frames after the rider came off the board, with every rider column frozen. And **the
 * 72.7–228.6 °/s pools both riders and the Snap stances**: taken apart, 0 of 24 default-rider runs in tall or Compress
 * reach Forsyth's 109 °/s, while the new rider at a full stick turns **37–88° in 0.87–2.33 s in a monotone arc** and
 * then falls off 0.2–0.7 s later. So `arc`, `mean` and `peakOverMean` are the columns that carry the round, the spike
 * census answers its question by dissolving it, and the lean cap below is refuted on this cell.
 *
 * ## The instrument, and the two ways 3.3e's own headline could be wrong
 *
 * 3.3e's peak rate is the largest **one-frame** heading difference over a 1/60 s step. Two things can inflate it, and
 * both are measured here rather than argued:
 *
 * - **A one-frame difference is not a rate an IMU would report.** Forsyth's 1.9 rad/s is from a board-mounted inertial
 *   unit, necessarily filtered. So the probe reports the peak of the heading rate **smoothed over 0.10 s and over
 *   0.25 s** beside the one-frame peak. If the one-frame peak is three times the 0.25 s peak, the rate we "have" is a
 *   frame of noise and not a turn.
 * - **An oscillation has a large rate and goes nowhere.** `|turned|` is the heading's **net** change; the probe also
 *   accumulates the **total absolute** heading travel, and their ratio (`arc`, 0–1) says what share of the board's
 *   yawing went into the turn. A board that wags 10° each way at 200 °/s has a huge peak rate and an `arc` near 0.
 *
 * ## The candidate this round was built to test
 *
 * `prepareBank` caps the lean at what a turn of TURN_RADIUS = 4.5 m can hold at the board's own speed **through the
 * water**: `most = planing ? min(MAX_BANK, atan(v²/(g·R))) : 0` [R, `prepareBank`]. Two consequences, and
 * this probe is about both:
 *
 * 1. **The cap falls as the square of the speed.** 36° at 5.7 m/s, 20° at 4 m/s, 11° at 3 m/s, 5° at 2 m/s. A turn
 *    that scrubs speed lowers its own ceiling, so the lean the player asked for is withdrawn by the turn itself.
 * 2. **Off the plane the cap is exactly zero.** `planing` latches on at PLANING_SPEED = 4 m/s and off at
 *    PLANING_DROP = 3 m/s [R], so a turn that takes the board under 3 m/s does not merely lean less — it is allowed
 *    **no lean at all** until it is back over 4. 3.3e measured median speeds of 2.10–5.78 m/s on this cell, so this is
 *    not a hypothetical band.
 *
 * `leanProbe` is the rider's own four numbers for this (the cap, the lean asked after it, the speed it is built on,
 * and the plane), read out of `prepareBank` rather than re-derived here, because re-deriving them outside the class would
 * mean re-implementing `planing`'s latch and getting it subtly wrong.
 *
 * ## The spike census
 *
 * A **spike** is a maximal run of frames whose smoothed |rate| is over `SPIKE` (default 0.5) of that run's own
 * smoothed peak, at least `SPIKE_MIN` s long. For each spike the probe records its duration, the gap to the next, and
 * the state at the frame it ended on, against five named terminators read at that frame: the plane lost, the cap
 * fallen under the rail, the rail past RAIL_BITE, the steer centred (the turn is simply finished), and the balance's
 * knees firing. A spike may end on none of them or on several; the census prints the counts and does not pick.
 *
 * ## The contrast columns, for step 3.3f's other half
 *
 * `knees`, `kneeCause` and the leg's rest are read every frame, because the same round has to measure what the
 * balance's own knee drop is doing to the **standing** stance: `stanceRoom(0).kneeTravel` is **0.30 m**, exactly
 * `CROUCH_DEPTH`, so at `knees` = 1 a standing rider's leg rests as deep as Compress commands and the button has
 * nothing left to add. (3.3e put that contrast at 0.03–0.12 m; measured without the dead frames it is 0.067–0.299 m,
 * which is why the `deadShare` column exists.)
 *
 * Run from the repository's root:
 *   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/turn.ts -o <scratch>/tn.mjs --format esm --platform node
 *   RIDER=new node <scratch>/tn.mjs
 *   RIDER=new STANCES=compress TRACE=1 EXTRAS=0 STEERS=1 node <scratch>/tn.mjs
 *
 * Env: `RIDER=new|old`, `STANCES`, `EXTRAS`, `STEERS`, `SECONDS`, `ACROSS`, `OUT` (one JSON line a run), `TRACE`
 * (print every frame of every run as TSV), `SPIKE`, `KNEEROOM` (the step 3.3f switch, passed to the rider).
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
/** `AttachedRider`'s own, restated here so the probe never imports a private: the rail's bite, °, and the deadband. */
const RAIL_BITE = 48;
const STEER_DEADBAND = 0.05;

const FACE = (process.env.FACE ?? '1.4,16,5.7').split(',').map(Number);
const DEPTH = Number(process.env.DEPTH ?? 2.6);
const AHEAD = Number(process.env.AHEAD ?? 0.75);
const SIDE = Number(process.env.SIDE ?? -45);
const SECONDS = Number(process.env.SECONDS ?? 9);
const RIDER = process.env.RIDER === 'new' ? 'new' : 'old';
const EXTRAS = (process.env.EXTRAS ?? '0,1.5,3').split(',').map(Number);
const STEERS = (process.env.STEERS ?? '0.5,1').split(',').map(Number);
const ACROSS = Number(process.env.ACROSS ?? 85);
const OUT = process.env.OUT;
const TRACE = process.env.TRACE === '1';
const SPIKE = Number(process.env.SPIKE ?? 0.5);
const SPIKE_MIN = Number(process.env.SPIKE_MIN ?? 0.05);
const KNEEROOM = process.env.KNEEROOM;

type Stance = 'tall' | 'crouch' | 'compress' | 'snap' | 'snapdrive' | 'compressflex';
const STANCES = (process.env.STANCES ?? 'tall,compress,snapdrive').split(',') as Stance[];

const f = (v: number, d = 2) => (Number.isFinite(v) ? v.toFixed(d) : '–');
const r = (x: number, d = 3) => (Number.isFinite(x) ? +x.toFixed(d) : null);
const sorted = (v: number[]) => v.filter(Number.isFinite).sort((a, b) => a - b);
const qt = (v: number[], p: number) => { const s = sorted(v); return s.length ? s[Math.min(s.length - 1, Math.floor(p * s.length))] : Number.NaN; };
const median = (v: number[]) => qt(v, 0.5);
const peak = (v: number[]) => { const s = sorted(v); return s.length ? s[s.length - 1] : Number.NaN; };
const least = (v: number[]) => { const s = sorted(v); return s.length ? s[0] : Number.NaN; };
const span = (v: number[], d = 2) => { const s = sorted(v); return s.length ? `${f(s[0], d)}–${f(s[s.length - 1], d)}` : '–'; };

/** As `stance.ts`: the deeper of crouch and Compress wins in the code, so Compress's cell holds the crouch at 0.6. */
function stanceInputs(rider: AttachedRider, s: Stance): void {
  rider.crouch = s === 'crouch' ? 1 : s === 'compress' || s === 'compressflex' ? 0.6 : 0;
  rider.compress = s === 'compress' || s === 'compressflex' ? 1 : 0;
  rider.snap = s === 'snap' || s === 'snapdrive' ? 1 : 0;
}

function stanceOptions(s: Stance): Record<string, string> {
  const base: Record<string, string> = KNEEROOM ? { kneeRoom: KNEEROOM } : {};
  if (s === 'snapdrive') return { ...base, snapLegs: 'drive' };
  if (s === 'compressflex') return { ...base, carveFlex: 'on' };
  return base;
}

function emit(line: unknown): void {
  if (OUT) appendFileSync(OUT, `${JSON.stringify(line)}\n`);
  else process.stdout.write(`${JSON.stringify(line)}\n`);
}

/** A boxcar of `width` frames over `v`, centred, the ends shortened rather than padded. */
function smooth(v: number[], width: number): number[] {
  const half = Math.floor(width / 2);
  return v.map((_, i) => {
    let sum = 0;
    let n = 0;
    for (let k = Math.max(0, i - half); k <= Math.min(v.length - 1, i + half); k += 1) { sum += v[k]; n += 1; }
    return sum / n;
  });
}

interface Frame {
  t: number;
  rate: number;      // signed heading rate, °/s
  net: number;       // net heading change from the first frame, ° (signed)
  abs: number;       // cumulative |heading change|, °
  speed: number;     // board speed over the ground, m/s
  through: number;   // the board's forward speed through the water the cap is built on, m/s
  cap: number;       // the lean the turn can hold, ° (0 off the plane)
  ask: number;       // |the lean asked for| after the cap, °
  rail: number;      // |the rail|, °
  roll: number;      // |the roll from the world's level|, °
  planing: number;
  knees: number;
  cause: number;     // 0 none, 1 hip, 2 capture
  rest: number;      // the leg's rest below the riding stance, m (positive = deeper)
  hips: number;      // the hips over the deck, m
  steer: number;
  ankle: number;     // the predictor's ankle command as sent, ° (the new rider's only roll authority at the feet)
  past: number;      // the capture point past the feet's edge as the balance sensed it, m
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
  const feet = stanceFeet(board.shape);
  const deckY = deckHeight(board.shape, (feet.rear + feet.front) / 2);
  const frames: Frame[] = [];
  let fell = '';
  let fellAt = Number.NaN;
  let lastHeading = Number.NaN;
  let net = 0;
  let abs = 0;
  let t85 = Number.NaN;
  let t45 = Number.NaN;
  let centred = false;

  for (let i = 0; i < Math.round(SECONDS / STEP); i += 1) {
    const t = (i + 1) * STEP;
    water.advance(STEP);
    board.step(STEP, water);
    fwd.set(0, 0, 1).applyQuaternion(board.orientation).setY(0).normalize();
    side.set(fwd.z, 0, -fwd.x);
    boardUp.set(0, 1, 0).applyQuaternion(board.orientation);
    const roll = Math.atan2(boardUp.dot(side), boardUp.y) * DEG;
    const cen = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
    nW.set(cen.normalX, cen.normalY, cen.normalZ).normalize();
    const rail = roll - Math.atan2(nW.dot(side), nW.y) * DEG;
    const heading = Math.atan2(fwd.x, fwd.z);
    if (!Number.isFinite(lastHeading)) lastHeading = heading;
    let d = heading - lastHeading;
    while (d > Math.PI) d -= 2 * Math.PI;
    while (d < -Math.PI) d += 2 * Math.PI;
    lastHeading = heading;
    net += d * DEG;
    abs += Math.abs(d) * DEG;
    if (!Number.isFinite(t45) && Math.abs(net) >= 45) t45 = t;
    if (!Number.isFinite(t85) && Math.abs(net) >= ACROSS) t85 = t;
    if (!centred && Math.abs(net) >= ACROSS) centred = true;
    const used = centred ? 0 : steer;
    frames.push({
      t,
      rate: (d / STEP) * DEG,
      net,
      abs,
      speed: board.velocity.length(),
      through: rider.leanProbe.speedThrough,
      cap: rider.leanProbe.cap * DEG,
      ask: Math.abs(rider.leanProbe.ask) * DEG,
      rail: Math.abs(rail),
      roll: Math.abs(roll),
      planing: rider.leanProbe.planing,
      knees: rider.human.knees,
      cause: rider.human.kneeCause === 'capture' ? 2 : rider.human.kneeCause === 'hip' ? 1 : 0,
      rest: -rider.leg.rest,
      hips: rider.parts[1] - deckY + rider.leg.extension,
      steer: rider.steer,
      ankle: rider.predictor.sent[0] * DEG,
      past: rider.human.state.past,
    });
    rider.steer = used;
    // **The fall test, and why it is not 3.3e's.** `AttachedRider.separate` sets `attached = false` and leaves `phase`
    // and `upright` exactly as they were, so a **balance separation while standing** moves neither of them: the rider
    // is off the board and `phase === 'standing' && upright === true` for the rest of the run. 3.3e's probe (and this
    // one, until it was traced) tested `!upright || phase !== 'standing'` and therefore **never saw a balance fall at
    // all** — it reported "84 of 84 stood" and went on measuring the heading of a board with nobody on it, with
    // `prepare` no longer called, so every rider column froze at its last value. `attached` is the test.
    if (!rider.attached || !rider.upright || rider.phase !== 'standing') {
      fell = rider.attached ? rider.phase : (rider.separation ?? 'separated');
      fellAt = t;
      break;
    }
  }

  // The mount's contact transient is the first ~0.17 s in every probe of this folder; every column below starts at 0.2 s.
  const live = frames.filter((x) => x.t > 0.2);
  // **The commanded turn, and why every turn column is restricted to it.** The movement centres the stick once the
  // board is ACROSS° round, and the board then wanders with nobody asking it to turn. Pooling those frames with the
  // turn's own inflates the total heading travel (so it deflates the arc) and fills the spike census with spikes that
  // ended because the turn was over. The stick's own deadband is the boundary.
  const turn = live.filter((x) => Math.abs(x.steer) > STEER_DEADBAND);
  const settled = frames.filter((x) => x.t > 0.5);
  const rates = turn.map((x) => x.rate);
  const s100 = smooth(rates, 6);
  const s250 = smooth(rates, 15);
  const absPeak = (v: number[]) => peak(v.map(Math.abs));

  // The spike census, on the 0.10 s rate.
  const thresh = SPIKE * absPeak(s100);
  const spikes: { from: number; to: number; dur: number; ends: Record<string, number> }[] = [];
  let open = -1;
  for (let i = 0; i < s100.length; i += 1) {
    const hot = Math.abs(s100[i]) >= thresh;
    if (hot && open < 0) open = i;
    if ((!hot || i === s100.length - 1) && open >= 0) {
      const to = hot ? i : i - 1;
      const dur = (to - open + 1) * STEP;
      if (dur >= SPIKE_MIN) {
        const e = turn[to];
        const b = turn[Math.max(0, open)];
        spikes.push({
          from: b.t,
          to: e.t,
          dur,
          ends: {
            // The plane lost at or within 0.1 s after the spike's end.
            plane: turn.slice(to, to + 7).some((x) => x.planing === 0) ? 1 : 0,
            // The cap has fallen under the rail the board is already on: the ceiling withdrew below the floor.
            capUnder: e.cap < e.rail ? 1 : 0,
            // The cap has fallen under the lean the stick is still asking for.
            capUnderAsk: e.cap < e.ask - 0.5 ? 1 : 0,
            bite: e.rail >= RAIL_BITE ? 1 : 0,
            centred: Math.abs(e.steer) <= STEER_DEADBAND ? 1 : 0,
            knees: e.knees > 0.5 ? 1 : 0,
          },
        });
      }
      open = -1;
    }
  }
  const gaps = spikes.slice(1).map((s, i) => s.from - spikes[i].to);
  const count = (k: string) => spikes.filter((s) => s.ends[k] === 1).length;

  if (TRACE) {
    process.stdout.write(`# TRACE ${RIDER} ${st} extra=${extra} steer=${steer}\n`);
    process.stdout.write('t\trate\tnet\tspeed\tthrough\tcap\task\trail\troll\tplaning\tknees\tcause\trest\thips\tsteer\n');
    for (const x of frames) {
      process.stdout.write([x.t, x.rate, x.net, x.speed, x.through, x.cap, x.ask, x.rail, x.roll, x.planing, x.knees, x.cause, x.rest, x.hips, x.steer]
        .map((v) => (typeof v === 'number' ? v.toFixed(3) : v)).join('\t') + '\n');
    }
  }

  const first = turn[0];
  const last = turn[turn.length - 1];
  const dir = Math.sign((last?.net ?? 0) - (first?.net ?? 0)) || 1;
  // The rail's own history through the commanded turn: where it peaked, and whether it came back down while the stick
  // was still asking for more lean than it carried AND the cap was still above it — so neither the player nor the
  // ceiling can be what took it away.
  let railTop = 0;
  let railTopAt = Number.NaN;
  let railTopAsk = Number.NaN;
  let unwind = 0;
  for (let i = 1; i < turn.length; i += 1) {
    // The ask at the rail's peak is the denominator of `railOverAsk`; below 5° it is not a ratio worth printing
    // (one `snapdrive` run returned 5145 from an ask of 0.015° and that is how this guard got here).
    if (turn[i].rail > railTop) { railTop = turn[i].rail; railTopAt = turn[i].t; railTopAsk = turn[i].ask > 5 ? turn[i].ask : Number.NaN; }
    const falling = (turn[i].rail - turn[i - 1].rail) / STEP <= -2;
    if (falling && turn[i].ask - turn[i].rail > 5 && turn[i].cap > turn[i].rail + 2) unwind += 1;
  }
  return {
    rider: RIDER, stance: st, extra, steer, kneeRoom: KNEEROOM ?? 'shipped',
    // The instrument check: the one-frame peak against the 0.10 s and 0.25 s peaks, °/s.
    peak1: r(absPeak(rates), 1), peak100: r(absPeak(s100), 1), peak250: r(absPeak(s250), 1),
    // The arc, over the COMMANDED turn only: the net heading change over the total absolute heading travel,
    // 0–1 — 1 is one monotone turn, 0 a wag that goes nowhere.
    net: r(Math.abs((last?.net ?? Number.NaN) - (first?.net ?? Number.NaN)), 1),
    abs: r((last?.abs ?? Number.NaN) - (first?.abs ?? Number.NaN), 1),
    arc: r(Math.abs(((last?.net ?? Number.NaN) - (first?.net ?? 0)) / ((last?.abs ?? Number.NaN) - (first?.abs ?? 0)))),
    // The share of commanded frames whose signed rate runs against the turn's own direction.
    against: r(turn.length ? turn.filter((x) => x.rate * dir < 0).length / turn.length : Number.NaN),
    t45: r(t45), t85: r(t85), turnFor: r(last ? last.t - (first?.t ?? 0) : Number.NaN),
    // **The arc's shape, which is the round's own headline.** `mean` is the net heading over the commanded turn's own
    // duration, °/s — the rate the turn actually delivers — and `peakOverMean` is the 0.25 s peak over it. A real
    // bottom turn runs at essentially its peak for the whole 0.96 s (Forsyth 2024: 99° in 0.96 s, mean 103 °/s, peak
    // 1.9 rad/s = 109 °/s, so 1.06). A rate that spikes and sags has a large ratio at the same peak.
    mean: r(last && last.t > (first?.t ?? 0) ? Math.abs(last.net - (first?.net ?? 0)) / (last.t - (first?.t ?? 0)) : Number.NaN, 1),
    peakOverMean: r(absPeak(s250) / (last && last.t > (first?.t ?? 0) ? Math.abs(last.net - (first?.net ?? 0)) / (last.t - (first?.t ?? 0)) : Number.NaN)),
    // The cap and its speed over the commanded turn — the turn's own ceiling while the turn is being asked for.
    capMedian: r(median(turn.map((x) => x.cap)), 1), capLeast: r(least(turn.map((x) => x.cap)), 1),
    throughMedian: r(median(turn.map((x) => x.through)), 2), throughLeast: r(least(turn.map((x) => x.through)), 2),
    offPlane: r(turn.length ? turn.filter((x) => x.planing === 0).length / turn.length : Number.NaN),
    // How often the ceiling is under what the stick asks, and under the rail the board already carries.
    capBinds: r(turn.length ? turn.filter((x) => x.cap < x.ask - 0.5).length / turn.length : Number.NaN),
    capUnderRail: r(turn.length ? turn.filter((x) => x.cap < x.rail).length / turn.length : Number.NaN),
    railMedian: r(median(turn.map((x) => x.rail)), 1), railPeak: r(railTop, 1),
    askMedian: r(median(turn.map((x) => x.ask)), 1), railOverAsk: r(railTop / railTopAsk), railTopAt: r(railTopAt),
    // The unwind: commanded frames where the rail is coming down at 2 °/s or more with the ask above it and the cap above it.
    unwind: r(turn.length ? unwind / turn.length : Number.NaN),
    ankleMedian: r(median(turn.map((x) => x.ankle)), 2), ankleAgainst: r(turn.length ? turn.filter((x) => x.ankle * dir < 0).length / turn.length : Number.NaN),
    pastMedian: r(median(turn.map((x) => x.past))), pastPeak: r(absPeak(turn.map((x) => x.past))),
    // The spikes.
    spikes: spikes.length, spikeDur: r(median(spikes.map((s) => s.dur))), spikeGap: r(median(gaps)),
    endPlane: count('plane'), endCapUnder: count('capUnder'), endCapUnderAsk: count('capUnderAsk'),
    endBite: count('bite'), endCentred: count('centred'), endKnees: count('knees'),
    // The contrast columns. **The window is `t > 0.5` and not `t > 0.2`, to be `stance.ts`'s own window exactly**: the
    // only difference left between these medians and 3.3e's published ones is then the fall test, which is the point.
    hipsMedian: r(median(settled.map((x) => x.hips))), restMedian: r(median(settled.map((x) => x.rest))),
    kneesMedian: r(median(settled.map((x) => x.knees))), kneesPeak: r(absPeak(settled.map((x) => x.knees))),
    kneeCapture: r(settled.length ? settled.filter((x) => x.cause === 2).length / settled.length : Number.NaN),
    // What share of `stance.ts`'s own 0.5–9 s window is frames after the rider has already come off the board.
    deadShare: r(1 - (settled.length * STEP) / (SECONDS - 0.5)),
    fell: fell || null, fellAt: r(fellAt),
  };
}

const rows: Record<string, unknown>[] = [];
const order = [...STANCES].sort((a, b) => (a === 'tall' ? -1 : b === 'tall' ? 1 : 0));
for (const extra of EXTRAS) {
  for (const steer of STEERS) {
    for (const st of order) {
      const row = oneRun(st, extra, steer);
      rows.push(row);
      if (!TRACE) emit(row);
    }
  }
}

const col = (st: Stance, k: string) => rows.filter((x) => x.stance === st).map((x) => (x[k] === null || x[k] === undefined ? Number.NaN : Number(x[k])));
const reached = (st: Stance, k: string) => rows.filter((x) => x.stance === st && x[k] !== null).length;
const sum = (st: Stance, k: string) => rows.filter((x) => x.stance === st).reduce((a, x) => a + Number(x[k] ?? 0), 0);
if (!TRACE) {
  console.log(`\n# step 3.3f — the turn's clock, the arc and the cap, rider=${RIDER}, kneeRoom=${KNEEROOM ?? 'shipped'}`);
  console.log(`# Canyon-matched FaceWater ${FACE[0]} m / ${FACE[1]}° / ${FACE[2]} m/s, ${DEPTH} m deep — a FIT to Canyon, not Canyon.`);
  console.log(`# ${EXTRAS.length} entry speeds × ${STEERS.length} sticks = ${EXTRAS.length * STEERS.length} runs a stance, ${SECONDS} s each.`);
  console.log(`\n| stance | peak °/s 1 frame | 0.10 s | 0.25 s | MEAN °/s | peak/mean | net ° | arc | against | to 45° | to ${ACROSS}° | fell at | hips m | knees med/peak | stood |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const st of order) {
    const n = rows.filter((x) => x.stance === st).length;
    const stood = rows.filter((x) => x.stance === st && !x.fell).length;
    console.log(`| ${st} | ${span(col(st, 'peak1'), 1)} | ${span(col(st, 'peak100'), 1)} | ${span(col(st, 'peak250'), 1)} `
      + `| ${span(col(st, 'mean'), 1)} | ${span(col(st, 'peakOverMean'))} `
      + `| ${span(col(st, 'net'), 1)} | ${span(col(st, 'arc'))} | ${span(col(st, 'against'))} `
      + `| ${span(col(st, 't45'))} (${reached(st, 't45')}/${n}) | ${span(col(st, 't85'))} (${reached(st, 't85')}/${n}) `
      + `| ${span(col(st, 'fellAt'))} | ${span(col(st, 'hipsMedian'))} | ${span(col(st, 'kneesMedian'))}/${f(peak(col(st, 'kneesPeak')))} | ${stood} of ${n} |`);
  }
  console.log(`\n| stance | cap ° | cap least | through m/s | least | off plane | cap binds | cap<rail | rail med ° | rail peak ° | ask med ° | rail/ask | rail peaked at s | unwind | ankle ° | against | capture past m |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|`);
  for (const st of order) {
    console.log(`| ${st} | ${span(col(st, 'capMedian'), 1)} | ${span(col(st, 'capLeast'), 1)} | ${span(col(st, 'throughMedian'))} | ${span(col(st, 'throughLeast'))} `
      + `| ${span(col(st, 'offPlane'))} | ${span(col(st, 'capBinds'))} | ${span(col(st, 'capUnderRail'))} `
      + `| ${span(col(st, 'railMedian'), 1)} | ${span(col(st, 'railPeak'), 1)} | ${span(col(st, 'askMedian'), 1)} | ${span(col(st, 'railOverAsk'))} `
      + `| ${span(col(st, 'railTopAt'))} | ${span(col(st, 'unwind'))} | ${span(col(st, 'ankleMedian'))} | ${span(col(st, 'ankleAgainst'))} | ${span(col(st, 'pastPeak'))} |`);
  }
  console.log(`\n| stance | spikes | median duration s | median gap s | ended: plane lost | cap < rail | cap < ask | rail past bite | steer centred | knees > 0.5 |`);
  console.log(`|---|---|---|---|---|---|---|---|---|---|`);
  for (const st of order) {
    console.log(`| ${st} | ${sum(st, 'spikes')} | ${span(col(st, 'spikeDur'))} | ${span(col(st, 'spikeGap'))} `
      + `| ${sum(st, 'endPlane')} | ${sum(st, 'endCapUnder')} | ${sum(st, 'endCapUnderAsk')} | ${sum(st, 'endBite')} | ${sum(st, 'endCentred')} | ${sum(st, 'endKnees')} |`);
  }
}
