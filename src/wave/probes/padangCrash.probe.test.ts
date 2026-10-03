import { execSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import type { FrontPoint } from '../barrel/BreakingFront';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { CrashCurve, createCrashSlice } from '../barrel/crashCurve';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import type { ProfileLibrary } from '../barrel/ProfileLibrary';
import { PACE } from '../barrel/SweptCrash';
import { BARREL_SLOPE, LOFT } from '../barrel/sweptLoft';
import { GRAVITY } from '../dispersion';
import { SOURCE_REACH } from '../PlungingLip';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[], digits = 2) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits)).join(' / ')
    + ` (max ${sorted.at(-1)!.toFixed(digits)}, n ${sorted.length})`;
};

/** The value at index ⌊q n⌋ of the sorted finite values (the quantile every line here uses); NaN when there are none. */
const quantile = (values: number[], q: number) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  return sorted.length ? sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))] : Number.NaN;
};

/** The same 10 / 50 / 90 %, for signed values: with the least and the most. */
const spread = (values: number[], digits = 2) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return '—';
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits);
  return `${at(0.1)} / ${at(0.5)} / ${at(0.9)} (min ${sorted[0].toFixed(digits)}, max ${sorted.at(-1)!.toFixed(digits)}, n ${sorted.length})`;
};

const percent = (part: number, whole: number) => (whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : '—');
const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '-');
/** `part` of `whole`, with its share. */
const outOf = (part: number, whole: number) => `${part} of ${whole} (${percent(part, whole)})`;
/** The 90th percentile and the median of `values`, and how many: one quantity's own order statistics. */
const ninetyMedian = (values: number[], digits = 2) => `90th percentile ${fixed(quantile(values, 0.9), digits)} (median ${fixed(quantile(values, 0.5), digits)}, n ${values.length})`;

/**
 * A move this large in one step, m, is a jump: 15 m/s at 30 steps a second, about 2.5 times a 6 m/s crest. The jump
 * tallies split those by their largest part (the probe's threshold, provisional).
 */
const JUMP = 0.5;
/** A clock slower than this share of real time over a step has paused; one faster than `FAST` × real time has jumped (the probe's). */
const PAUSED = 0.05;
const FAST = 2;

/**
 * The anchor's hand-back as the advisor ruled it (2026-10-03), recomputed here to check the loft's: u = 3x² − 2x³,
 * x = τ / (0.8 T) clamped to 0–1, and u̇ per second of the clock.
 */
function handBack(tau: number, touchdown: number): { u: number; rate: number } {
  const window = LOFT.handoverStart * touchdown;
  const x = Math.min(1, Math.max(0, tau / window));
  return { u: x * x * (3 - 2 * x), rate: x > 0 && x < 1 ? (6 * x * (1 - x)) / window : 0 };
}

/**
 * One front point as `JetTracker` followed it (the ids are unique over a run). The tube phases are the library's: before
 * the throw (τ < 0), open (to touchdown T), then pouring and closing (to the end of its collapse: its slice fades).
 */
interface Life {
  id: number;
  /** Its tube's touchdown T (the open time) and collapse, s (the library's, as `SweptCrash` reads them). */
  touchdown: number;
  collapse: number;
  /** Its first sighting: the step, its clock then, and whether it was on a drawn front. */
  bornStep: number;
  bornTau: number;
  bornDrawn: boolean;
  /** The last step it stood on the front, when, its clock then, and whether the front matched it by its pace then. */
  lastStep: number;
  lastTime: number;
  lastTau: number;
  lastOnPace: boolean;
  /** When last seen: on a drawn front (two points or more, `SweptCrash`'s runs), and under an earlier front's barrel (`SweptCrash`'s covered test). */
  drawn: boolean;
  covered: boolean;
  /** Its `jetStrip` when last seen: undefined (never thrown), −1 (no jet: covered, missed or no water) or a strip. */
  jetStrip: number | undefined;
  /**
   * Its pace (every thrown point, jet or not): the step it was first seen paced (0: never), the solver time and its clock
   * at its throw (`jetAt`), C, the clamped crest-normal speed c_n its pace was made from, m/s, its pace along its column
   * c_n / n_z, m/s, H, the wave height its window was measured with, m, and whether it had no throw point (`throwZ` null).
   */
  pacedStep: number;
  pacedTime: number;
  pacedTau: number;
  normal: number;
  pace: number;
  height: number;
  unanchored: boolean;
  /** Its jet: the step it first held one (0: none) and its strip; the step and solver time it crashed (0 until then), how, and whether under an earlier front's barrel then. */
  thrownStep: number;
  strip: number;
  crashedStep: number;
  crashTime: number;
  crash: '' | 'own' | 'alone' | 'past' | 'exit' | 'lost';
  coveredAtCrash: boolean;
  /** The step its jet's void closed (0 until it has). */
  closeStep: number;
  /** The step it left the front at a stall (0: never; `SweptCrash.exited`), its clock then, and whether it was drawn when last seen. */
  exitStep: number;
  exitTau: number;
  exitDrawn: boolean;
  /** Steps it ran on its pace with no crest in reach; its present run of them and the runs it has had. */
  coasted: number;
  run: number;
  episodes: number;
  /** Holding an uncrashed jet: steps off a drawn front, steps more than three open times old on which it claimed a crest, and the oldest it stood, in open times since its throw. */
  alone: number;
  lateClaims: number;
  oldest: number;
  /** Whether its touchdown has been read; its release (the step its clock passed `jetUntil`, its slice faded; 0 until then), and whether it was on the front the step after. */
  atTouchdown: boolean;
  releaseStep: number;
  backAfterRelease: boolean;
  /** Its slice at its last measured step (see `Step`). */
  previous?: Step;
  /**
   * The most its hand-back's term reached, per second of its clock and per real second, m/s; its steps measured inside the
   * hand-back and per real second; the most its drawn crest stood from it along its ray, m, and the steps that measured.
   */
  handover: number;
  realHandover: number;
  steps: number;
  realSteps: number;
  crestDistance: number;
  crestSteps: number;
  /** Its place among the traced jets (0: not traced). */
  traced: number;
}

/**
 * A point's slice at one step: its clock and hand-back u, the anchor A, the crest point K = S − c n, the throw point T′
 * (the anchor itself before the throw), the profile's crest landmark c along the ray, the ray, its z, and whether it had
 * a throw point (τ ≥ 0 and `throwZ`).
 */
interface Step {
  step: number;
  time: number;
  tau: number;
  u: number;
  ax: number;
  az: number;
  kx: number;
  kz: number;
  tx: number;
  tz: number;
  landmark: number;
  rayX: number;
  rayZ: number;
  z: number;
  anchored: boolean;
}

/**
 * What the swept crash does to its jets and to every thrown point, followed point by point from outside (the Padang
 * Padang spec, Part B, PR 5; the advisor's rulings of 2026-10-01 and 2026-10-03). After each step it reads the front's
 * points, the crash's counters, its covered test and its stalls, and the lip's strips, and checks its own tallies against
 * the code's. The terms:
 * - **A thrown point** is one whose pace `SweptCrash` set at its throw (`jetPace`), jet or not; **a jet** is one that held
 *   a strip (`jetStrip` ≥ 0) from its throw. A jet is **resolved** by its crash or when its point left the front for
 *   good; **pending** otherwise: uncrashed at the run's end with its point on the front.
 * - **Crashed on its own point:** the crash ran on its point in a drawn front (two points or more) with its tube live
 *   (`SweptCrash`'s `crashes`); those under an earlier front's barrel (whose curl the loft draws instead) are counted
 *   apart. **Alone at touchdown:** not on a drawn front at its touchdown, crashed as foreseen (`foreseen`); of those,
 *   **past their collapse** were on a drawn front with their tube over. **At a stall:** its point left the front 2 T
 *   after its throw short of touchdown (`SweptCrash.exited`), its jet crashed where foreseen. **Lost:** its point left
 *   the front any other way before its crash (`lost`).
 * - **Coasted:** a step on which a point on its pace claimed no crest and ran on it (`BreakingFront.coasted`, jets or
 *   not); an **episode** is a run of such steps. **The flight** is the solver time from the throw to the crash over T.
 * - **On its pace** at a step: the front matched the point by its pace (`runsOnPace`, before the step's clock and crash:
 *   paced, its clock short of `jetUntil` = touchdown + collapse). Only then is its `crestZ` this step's claim. **The
 *   release** is the step its clock passes `jetUntil` (still matched by its pace, its slice faded): the gap there is the
 *   crest it claimed less its z, the jump it makes back on the ordinary match.
 * - **The hand-back** is τ from the throw to 0.8 T, u from 0 to 1 by u = 3x² − 2x³, x = τ / 0.8 T. **C** is the point's
 *   crest speed c_n, the clamped crest-normal speed its pace was made from. The slice is the loft's (a
 *   `CrashCurve.slice` at the point's own σ, which mirrors the loft in drawing mode): **K** = S − c n is the crest point,
 *   **T′** the throw point on the ray (the slice with the anchor held at the throw), and A = T′ + u (K − T′), checked.
 *   K − T′ is split along the ray n (+ forward) and across it, t = (n_z, −n_x) (+ toward +σ): on the ray, across is 0.
 * - **The hand-back's own term** is |u̇ (K − T′)|, the loft's own anchor motion (`sliceAnchorVX`), on top of its following
 *   motion (1 − u) dT′/dt + u dK/dt, per second of the slice's clock, at each step with 0 < u < 1. **Per real second** it
 *   is the hand-back's part of the anchor's move over each step the hand-back moves in (u₀ < 1, u₁ > 0), over Δt, the
 *   clock's own rate in it. Over a step from one with a throw point the anchor's move is exactly Δu (K₀ − T′₀) (the
 *   hand-back's) + u₁ ΔK + (1 − u₁) ΔT′ (its following). Over **the step entering the hand-back**, from the step before
 *   the throw (the anchor on K₀ then; its slice from that step's front), it is exactly u₁ (K₁ − T′₁) (the hand-back's) +
 *   (T′₁ − K₁) (the throw point's appearance) + ΔK. K's move is Δz along z − Δc n₁ − c₀ Δn (the point's z, the profile's
 *   crest landmark c, the ray n turning as its front bends). Each is checked.
 * - **The drawn crest's distance from its point** is the drawn crest landmark less S, along the ray (+ forward), from the
 *   throw to touchdown: (1 − u) of the throw point's capped offset.
 * - **The step onto the pace:** at its throw step a point's z is still the solver's crest's (`SweptCrash` sets the pace
 *   after the step's z), and the step after it is jetBase + jetPace τ: its z at the throw step less its pace there.
 * - **A slice dropped mid-tube** is a point that left the front for good while its tube was open or pouring (0 ≤ τ <
 *   touchdown + collapse), the stalls apart; one before its throw is counted apart. A **flicker** is a point unseen for a
 *   while that came back.
 * - **A void closed as its pour began** (`PlungingLip.closedAtPour`): none should, as a held jet pours only from its crash
 *   or as its point leaves the front, and both close its void first.
 */
class JetTracker {
  private readonly lives = new Map<number, Life>();
  /** Jets whose void hasn't closed yet, followed each step whether their point is on the front or not. */
  private open: Life[] = [];
  /** Jets holding an uncrashed jet at the last step (to find the lost). */
  private holding: Life[] = [];
  private readonly curve: CrashCurve;
  private readonly slice = createCrashSlice();
  private readonly held = createCrashSlice();
  private readonly prior = createCrashSlice();
  private readonly slope: number;
  private readonly heightAt: (x: number, z: number) => number;
  private step = 0;
  private coastedBefore = 0;
  private tracing = 0;
  /** This step's front points, and `SweptCrash`'s runs as [start, end) per point (−1 outside); the last step's, by id. */
  private points: readonly FrontPoint[] = [];
  private starts = new Int32Array(0);
  private ends = new Int32Array(0);
  private previousPoints: readonly FrontPoint[] = [];
  private previousStarts = new Int32Array(0);
  private previousEnds = new Int32Array(0);
  private previousIndex = new Map<number, number>();
  /** Pace tallies from the throws, all thrown points (to check `SweptCrash`'s counters) and jets; the measured crest speed over the long-wave speed, and the rays' z parts (jets). */
  paceSlow = 0;
  paceFast = 0;
  paceUnmeasured = 0;
  readonly jetPace = { slow: 0, fast: 0, unmeasured: 0 };
  readonly speedRatio: number[] = [];
  readonly rayZs: number[] = [];
  /** Disagreements with the code's own numbers (see `report`). */
  paceDiffers = 0;
  untilDiffers = 0;
  coastDiffers = 0;
  anchorDiffers = 0;
  acrossDiffers = 0;
  zDiffers = 0;
  anchorStepDiffers = 0;
  crestStepDiffers = 0;
  /** Readings at touchdown off the pace (a jet thrown past it). */
  offPaceAtTouchdown = 0;
  /** At a jet's throw step, its z (still the solver's crest's) less its pace there, m: the step it takes onto its pace the step after. */
  readonly throwSteps: number[] = [];
  /** The gap at touchdown, m and over H, and those with no crest in reach. */
  readonly landGap: number[] = [];
  readonly landGapOverH: number[] = [];
  noCrestAtLanding = 0;
  /** At the release (jets): the crest claimed less the z, m and over H; those coasting; and how many were back on the ordinary match the step after. */
  readonly releaseGap: number[] = [];
  readonly releaseGapOverH: number[] = [];
  releasedCoasting = 0;
  returned = 0;
  /**
   * Per hand-back step (0 < u < 1, on a drawn front), on the jets with a throw point: the term (m/s per second of the
   * clock) and over C, K − T′ along and across the ray. The same over C on the thrown points with no jet. Per step the
   * hand-back moves in, with a slice the step before: the term per real second over C, the drawn anchor's speed and K's
   * over C.
   */
  readonly terms: number[] = [];
  readonly termShares: number[] = [];
  readonly alongs: number[] = [];
  readonly acrosses: number[] = [];
  readonly otherShares: number[] = [];
  readonly realShares: number[] = [];
  readonly anchorShares: number[] = [];
  readonly crestPointShares: number[] = [];
  /** The steps the hand-back moved in with a slice the step before, the entering ones among them, and those with none (unmeasured), entering ones apart. */
  realMeasured = 0;
  enteringMeasured = 0;
  realUnmeasured = 0;
  enteringUnmeasured = 0;
  /** Hand-back steps on a point off a drawn front, which has no slice to measure; jets with no throw point (the anchor on K, term 0). */
  unmeasuredHandover = 0;
  /** The drawn crest's distance from its point along the ray, m, per step from the throw to touchdown (jets on a drawn front). */
  readonly crestDistances: number[] = [];
  /** Steps the hand-back moved in whose move passed JUMP, m, by which part was largest: the anchor's, and K's. */
  readonly anchorJumps = { handover: 0, crestPoint: 0, throwPoint: 0, appearance: 0, largest: 0 };
  readonly crestPointJumps = { z: 0, landmark: 0, ray: 0, largest: 0 };
  /** The clock's rate (τ gained over the step's time) over each step from a jet's throw to its touchdown. */
  readonly openRates: number[] = [];
  /** How many steps each finished run of coasting lasted. */
  readonly episodeLengths: number[] = [];
  /** Unseen points that came back: how long, s, and whether mid-tube. */
  readonly flickers: { seconds: number; midTube: boolean }[] = [];
  /** Every stall exit: its point's life, read as it left. */
  readonly exits: Life[] = [];
  /** The first `trace` jets' hand-backs, one line a step (see the probe's `TRACE`). */
  readonly traceLines: string[] = [];

  constructor(private readonly simulation: SurfZoneSimulation, private readonly library: ProfileLibrary, private readonly trace = 0) {
    this.slope = BARREL_SLOPE.padang as number;
    this.curve = new CrashCurve(library, this.slope);
    const { solver } = simulation;
    this.heightAt = (x, z) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
  }

  /** After a step: follow every point on the front, the stalls, and every jet's void. */
  observe(): void {
    const { front, solver, crash, lip } = this.simulation;
    const points = front!.points;
    this.points = points;
    // SweptCrash's covered test for this step's points (private: read as the crash left it), and the lip's strips.
    const covered = crash!['covered'];
    const strips = lip['strips'];
    const time = solver.time;
    this.step += 1;
    const { step } = this;
    this.findRuns(points);
    // The stalls: SweptCrash took them off the front before this observation, crashing their jets where foreseen. The
    // front matched them by their pace this step first, and counted any that coasted.
    let coastedHere = 0;
    for (const p of crash!.exited) {
      const life = this.lives.get(p.id);
      if (!life) continue;
      const onPace = life.pacedStep > 0 && life.pacedStep < step && life.lastStep === step - 1 && p.jetUntil !== undefined && life.lastTau < p.jetUntil;
      if (onPace && p.crestZ === undefined) {
        life.coasted += 1;
        coastedHere += 1;
        life.run += 1;
        if (life.run === 1) life.episodes += 1;
      }
      life.exitStep = step;
      life.exitTau = p.tau;
      life.exitDrawn = life.drawn && !life.covered;
      if (life.thrownStep > 0 && life.crashedStep === 0) {
        life.crashedStep = step;
        life.crashTime = time;
        life.crash = 'exit';
      }
      if (life.run > 0) {
        this.episodeLengths.push(life.run);
        life.run = 0;
      }
      this.exits.push(life);
    }
    const seen = new Set<number>();
    for (let k = 0; k < points.length; k += 1) {
      const p = points[k];
      seen.add(p.id);
      let life = this.lives.get(p.id);
      if (!life) {
        life = this.born(p, step);
        this.lives.set(p.id, life);
      } else if (life.lastStep < step - 1) {
        this.flickers.push({ seconds: time - life.lastTime, midTube: life.lastTau >= 0 && life.lastTau < life.touchdown + life.collapse });
      }
      const drawn = this.starts[k] >= 0;
      const isCovered = drawn && covered[k] === 1;
      if (life.bornStep === step) life.bornDrawn = drawn;
      // At this step's front update (before its clock, throw and crash): did the front match it by its pace (`runsOnPace`)?
      // Its clock then was the one it was last seen with.
      const onPace = life.pacedStep > 0 && life.pacedStep < step && life.lastStep === step - 1 && p.jetUntil !== undefined && life.lastTau < p.jetUntil;
      const claimed = onPace && p.crestZ !== undefined;
      if (onPace && !claimed) {
        life.coasted += 1;
        coastedHere += 1;
        life.run += 1;
        if (life.run === 1) life.episodes += 1;
      } else if (life.run > 0) {
        this.episodeLengths.push(life.run);
        life.run = 0;
      }
      if (life.thrownStep > 0 && life.crashedStep === 0) {
        const age = (time - life.pacedTime) / life.touchdown;
        life.oldest = Math.max(life.oldest, age);
        if (claimed && age > 3) life.lateClaims += 1;
        if (!drawn) life.alone += 1;
      }
      if (life.pacedStep === 0 && p.jetPace !== undefined) this.paced(life, p, k, step);
      if (life.thrownStep === 0 && p.jetStrip !== undefined && p.jetStrip >= 0) this.thrown(life, p, step);
      if (life.thrownStep > 0 && life.crashedStep === 0 && p.crashedAt !== undefined) {
        life.crashedStep = step;
        life.crashTime = time;
        life.crash = !drawn ? 'alone' : p.tau < life.touchdown + life.collapse ? 'own' : 'past';
        life.coveredAtCrash = life.crash === 'own' && isCovered;
      }
      // The release: the step its clock passed `jetUntil`, still matched by its pace; back on the ordinary match the step after.
      if (life.thrownStep > 0 && life.releaseStep > 0 && life.releaseStep === step - 1) {
        life.backAfterRelease = true;
        this.returned += 1;
      }
      if (onPace && life.releaseStep === 0 && p.tau >= p.jetUntil!) {
        life.releaseStep = step;
        if (life.thrownStep > 0) {
          if (claimed) {
            this.releaseGap.push(p.crestZ! - p.z);
            this.releaseGapOverH.push((p.crestZ! - p.z) / life.height);
          } else {
            this.releasedCoasting += 1;
          }
        }
      }
      if (life.pacedStep > 0) this.measure(life, p, k, time, drawn, step, onPace, claimed);
      life.lastStep = step;
      life.lastTime = time;
      life.lastTau = p.tau;
      life.lastOnPace = onPace;
      life.drawn = drawn;
      life.covered = isCovered;
      life.jetStrip = p.jetStrip;
    }
    // The lost: an uncrashed jet's point gone from the front this step, not at a stall.
    for (const life of this.holding) {
      if (seen.has(life.id) || life.crashedStep > 0) continue;
      life.crashedStep = step;
      life.crashTime = time;
      life.crash = 'lost';
      if (life.run > 0) {
        this.episodeLengths.push(life.run);
        life.run = 0;
      }
    }
    this.holding = [];
    for (const p of points) {
      const life = this.lives.get(p.id)!;
      if (life.thrownStep > 0 && life.crashedStep === 0) this.holding.push(life);
    }
    const coasted = front!.coasted - this.coastedBefore;
    this.coastedBefore = front!.coasted;
    if (coasted !== coastedHere) this.coastDiffers += 1;
    // The voids: the step each closed.
    let closed = false;
    for (const life of this.open) {
      const tube = strips.get(life.strip)?.tube;
      if (tube && !Number.isNaN(tube.closedAt)) {
        life.closeStep = step;
        closed = true;
      }
    }
    if (closed) this.open = this.open.filter((life) => life.closeStep === 0);
    // This step's front and runs, for the next step's entering hand-backs.
    this.previousPoints = points;
    if (this.previousStarts.length < points.length) {
      this.previousStarts = new Int32Array(this.starts.length);
      this.previousEnds = new Int32Array(this.ends.length);
    }
    this.previousStarts.set(this.starts.subarray(0, points.length));
    this.previousEnds.set(this.ends.subarray(0, points.length));
    this.previousIndex.clear();
    points.forEach((p, k) => this.previousIndex.set(p.id, k));
  }

  /** The point's first sighting. */
  private born(p: FrontPoint, step: number): Life {
    const times = this.library.profileTimes({ slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth });
    return {
      id: p.id, touchdown: times.touchdownSeconds, collapse: times.collapseSeconds, bornStep: step, bornTau: p.tau, bornDrawn: false, lastStep: step, lastTime: 0,
      lastTau: p.tau, lastOnPace: false, drawn: false, covered: false, jetStrip: p.jetStrip, pacedStep: 0, pacedTime: 0, pacedTau: 0, normal: 0,
      pace: 0, height: 0, unanchored: false, thrownStep: 0, strip: -1, crashedStep: 0, crashTime: 0, crash: '', coveredAtCrash: false,
      closeStep: 0, exitStep: 0, exitTau: 0, exitDrawn: false, coasted: 0, run: 0, episodes: 0, alone: 0, lateClaims: 0, oldest: 0,
      atTouchdown: false, releaseStep: 0, backAfterRelease: false, handover: 0, realHandover: 0, steps: 0, realSteps: 0, crestDistance: 0, crestSteps: 0,
      traced: 0,
    };
  }

  /** `SweptCrash`'s runs this step: the fronts of two points or more with some length, as [start, end) per point (−1 outside). */
  private findRuns(points: readonly FrontPoint[]): void {
    if (this.starts.length < points.length) {
      this.starts = new Int32Array(2 * points.length);
      this.ends = new Int32Array(2 * points.length);
    }
    this.starts.fill(-1, 0, points.length);
    let start = 0;
    while (start < points.length) {
      let end = start + 1;
      while (end < points.length && points[end].front === points[start].front) end += 1;
      if (end - start >= 2 && points[end - 1].sigma - points[start].sigma > 1e-6) {
        for (let k = start; k < end; k += 1) {
          this.starts[k] = start;
          this.ends[k] = end;
        }
      }
      start = end;
    }
  }

  /** The step a point is first seen paced (its throw): its pace as `SweptCrash.pace` makes it, checked against the point's. */
  private paced(life: Life, p: FrontPoint, k: number, step: number): void {
    life.pacedStep = step;
    life.pacedTime = p.jetAt ?? Number.NaN;
    life.pacedTau = p.tau;
    life.height = (p.jetWindow ?? 0) / SOURCE_REACH;
    life.pace = p.jetPace ?? Number.NaN;
    life.unanchored = p.throwZ === null;
    const wave = Math.sqrt(GRAVITY * Math.max(0, p.crestDepth + p.height));
    const measured = p.crestSpeed !== undefined && p.crestSpeed > 0;
    let normal = measured ? p.crestSpeed! : wave;
    const jet = p.jetStrip !== undefined && p.jetStrip >= 0;
    if (!measured) {
      this.paceUnmeasured += 1;
      if (jet) this.jetPace.unmeasured += 1;
    } else {
      if (jet) this.speedRatio.push(p.crestSpeed! / wave);
      if (normal < PACE.slowest * wave) {
        normal = PACE.slowest * wave;
        this.paceSlow += 1;
        if (jet) this.jetPace.slow += 1;
      } else if (normal > PACE.fastest * wave) {
        normal = PACE.fastest * wave;
        this.paceFast += 1;
        if (jet) this.jetPace.fast += 1;
      }
    }
    life.normal = normal;
    if (Math.abs((p.jetAt ?? Number.NaN) - this.simulation.solver.time) > 1e-9) this.paceDiffers += 1;
    if (!(Math.abs((p.jetUntil ?? Number.NaN) - (life.touchdown + life.collapse)) <= 1e-9)) this.untilDiffers += 1;
    if (this.starts[k] < 0) {
      this.paceDiffers += 1;
      return;
    }
    const s = this.curve.slice(this.points, this.starts[k], this.ends[k], k, this.simulation.solver.restLevel, this.heightAt, this.slice);
    if (jet) this.rayZs.push(s.rayZ);
    const pace = normal / Math.max(PACE.leastRayZ, s.rayZ);
    if (!(Math.abs(pace - (p.jetPace ?? Number.NaN)) <= 1e-9 * Math.max(1, pace))) this.paceDiffers += 1;
  }

  /** The step a point first holds its jet (its throw). */
  private thrown(life: Life, p: FrontPoint, step: number): void {
    life.thrownStep = step;
    life.strip = p.jetStrip!;
    this.open.push(life);
    if (this.tracing < this.trace) {
      this.tracing += 1;
      life.traced = this.tracing;
      this.traceLines.push(
        `# jet ${life.traced} (point ${life.id}): thrown at step ${step} (τ ${fixed(p.tau, 3)} s${life.bornStep === step ? ', its first step' : ''}), H ${fixed(life.height)} m, C = c_n ${fixed(life.normal)} m/s, `
        + `pace ${fixed(life.pace)} m/s, T ${fixed(life.touchdown)} s, collapse ${fixed(life.collapse)} s, the hand-back to τ ${fixed(LOFT.handoverStart * life.touchdown)} s; throw point ${p.throwZ === null ? 'none (the anchor on K)' : 'yes'}`,
        '# mode: pace (on its pace, a crest claimed), coast (on its pace, none in reach), last (its clock passed jetUntil this step), match (back on the ordinary match), throw (its first paced step), off (not on a drawn front: no slice)',
        '# jet  step  τ  τ/T  u  mode  z−paced(m)  term/C  real/C  (K−T′)·n(m)  (K−T′)·t(m)  crest−S along n(m)  clock rate',
      );
    }
  }

  /** A thrown point's step: its z, its gaps, the clock, and its slice through the hand-back and the open window. */
  private measure(life: Life, p: FrontPoint, k: number, time: number, drawn: boolean, step: number, onPace: boolean, claimed: boolean): void {
    if (p.jetBase === undefined || p.jetPace === undefined || p.jetUntil === undefined) return;
    const jet = life.thrownStep > 0;
    const paced = p.jetBase + p.jetPace * p.tau;
    // On its pace `SweptCrash` keeps its z there from the step after its throw until its slice has faded (at the throw
    // step its z is still the solver's crest's: the pace is set after the step's z).
    if (life.pacedStep === step) {
      if (jet) this.throwSteps.push(p.z - paced);
    } else if (p.tau < p.jetUntil && Math.abs(p.z - paced) > 1e-6) {
      this.zDiffers += 1;
    }
    if (jet && !life.atTouchdown && p.tau >= life.touchdown) {
      life.atTouchdown = true;
      if (!onPace) this.offPaceAtTouchdown += 1;
      else if (!claimed) this.noCrestAtLanding += 1;
      else {
        this.landGap.push(p.crestZ! - paced);
        this.landGapOverH.push((p.crestZ! - paced) / life.height);
      }
    }
    if (jet && life.lastStep === step - 1 && life.lastTau >= 0 && p.tau < life.touchdown && life.pacedStep < step) {
      this.openRates.push((p.tau - life.lastTau) / (time - life.lastTime));
    }
    const mode = life.pacedStep === step ? 'throw' : !onPace ? 'match' : p.tau >= p.jetUntil ? 'last' : claimed ? 'pace' : 'coast';
    // Its slice: from the throw to touchdown (the open window), and the step completing the hand-back however far its clock stepped.
    const before = life.previous !== undefined && life.previous.step === step - 1 ? life.previous : undefined;
    const { u, rate } = handBack(p.tau, life.touchdown);
    // Whether the hand-back moved this step (u₀ < 1, u₁ > 0), u₀ from its clock the step before (0 before its throw); unknown
    // for a point first seen this step.
    const u0 = life.lastStep === step - 1 ? handBack(life.lastTau, life.touchdown).u : Number.NaN;
    const moved = u > 0 && !(u0 >= 1);
    if (!(p.tau < life.touchdown || moved)) {
      life.previous = undefined;
      return;
    }
    const anchored = p.tau >= 0 && p.throwZ !== null;
    if (!drawn) {
      if (u > 0 && u < 1 && anchored && jet) this.unmeasuredHandover += 1;
      if (moved) {
        this.realUnmeasured += 1;
        if (life.pacedStep === step) this.enteringUnmeasured += 1;
      }
      life.previous = undefined;
      this.traceRow(life, step, p, u, 'off', paced);
      return;
    }
    const { points } = this;
    const { solver } = this.simulation;
    const s = this.curve.slice(points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.slice);
    const t = this.curve.slice(points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.held, { throwAnchor: true });
    const now = this.stepOf(p, s, t, step, time, life.touchdown);
    // The anchor as the loft places it: T′ + u (K − T′), with the hand-back's u recomputed; K before a throw point.
    const ex = anchored ? now.tx + u * (now.kx - now.tx) : now.kx;
    const ez = anchored ? now.tz + u * (now.kz - now.tz) : now.kz;
    if (Math.hypot(ex - now.ax, ez - now.az) > 1e-6) this.anchorDiffers += 1;
    // K − T′ along the ray (+ forward) and across it (+ toward +σ: t = (n_z, −n_x)).
    const dx = now.kx - now.tx;
    const dz = now.kz - now.tz;
    const along = dx * now.rayX + dz * now.rayZ;
    const across = dx * now.rayZ - dz * now.rayX;
    if (Math.abs(across) > 1e-6) this.acrossDiffers += 1;
    const term = rate * Math.hypot(dx, dz);
    if (u > 0 && u < 1 && anchored) {
      if (jet) {
        this.terms.push(term);
        this.termShares.push(term / life.normal);
        this.alongs.push(along);
        this.acrosses.push(across);
        life.handover = Math.max(life.handover, term);
        life.steps += 1;
      } else {
        this.otherShares.push(term / life.normal);
        life.handover = Math.max(life.handover, term);
        life.steps += 1;
      }
    }
    // The drawn crest's distance from its point along its ray, from the throw to touchdown.
    let crestAlong = Number.NaN;
    if (p.tau < life.touchdown) {
      crestAlong = (s.crestX - p.x) * s.rayX + (s.crestZ - p.z) * s.rayZ;
      if (jet) {
        this.crestDistances.push(crestAlong);
        life.crestDistance = Math.max(life.crestDistance, Math.abs(crestAlong));
        life.crestSteps += 1;
      }
    }
    // Over the step: from this point's slice the step before, or, entering the hand-back at its throw, from its slice the
    // step before on that step's front (its anchor on K then).
    const entering = life.pacedStep === step;
    let from = before;
    if (from === undefined && entering) from = this.priorStep(p);
    let real = Number.NaN;
    let rateOfClock = Number.NaN;
    if (moved) {
      if (from === undefined) {
        this.realUnmeasured += 1;
        if (entering) this.enteringUnmeasured += 1;
      } else {
        const dt = time - from.time;
        rateOfClock = (p.tau - from.tau) / dt;
        const dax = now.ax - from.ax;
        const daz = now.az - from.az;
        const dkx = now.kx - from.kx;
        const dkz = now.kz - from.kz;
        // The anchor's move: the hand-back's own part, and the rest.
        let hx: number;
        let hz: number;
        let parts: number[];
        if (from.anchored) {
          hx = (u - from.u) * (from.kx - from.tx);
          hz = (u - from.u) * (from.kz - from.tz);
          const fkx = u * dkx;
          const fkz = u * dkz;
          const ftx = (1 - u) * (now.tx - from.tx);
          const ftz = (1 - u) * (now.tz - from.tz);
          if (Math.hypot(hx + fkx + ftx - dax, hz + fkz + ftz - daz) > 1e-6) this.anchorStepDiffers += 1;
          parts = [Math.hypot(hx, hz), Math.hypot(fkx, fkz), Math.hypot(ftx, ftz), 0];
        } else {
          // From before the throw: A₀ = K₀, so A₁ − A₀ = u₁ (K₁ − T′₁) + (T′₁ − K₁) + ΔK.
          hx = u * (now.kx - now.tx);
          hz = u * (now.kz - now.tz);
          const appearX = now.tx - now.kx;
          const appearZ = now.tz - now.kz;
          if (Math.hypot(hx + appearX + dkx - dax, hz + appearZ + dkz - daz) > 1e-6) this.anchorStepDiffers += 1;
          parts = [Math.hypot(hx, hz), Math.hypot(dkx, dkz), 0, Math.hypot(appearX, appearZ)];
        }
        real = Math.hypot(hx, hz) / dt;
        if (anchored && jet) {
          this.realShares.push(real / life.normal);
          this.anchorShares.push(Math.hypot(dax, daz) / dt / life.normal);
          this.crestPointShares.push(Math.hypot(dkx, dkz) / dt / life.normal);
          life.realHandover = Math.max(life.realHandover, real);
          life.realSteps += 1;
        }
        this.realMeasured += 1;
        if (entering) this.enteringMeasured += 1;
        if (Math.hypot(dax, daz) > JUMP) {
          this.anchorJumps.largest = Math.max(this.anchorJumps.largest, Math.hypot(dax, daz));
          const most = parts.indexOf(Math.max(...parts));
          if (most === 0) this.anchorJumps.handover += 1;
          else if (most === 1) this.anchorJumps.crestPoint += 1;
          else if (most === 2) this.anchorJumps.throwPoint += 1;
          else this.anchorJumps.appearance += 1;
        }
        // K's move: the point's z, the crest landmark's advance along the ray, and the ray turning (x stays on its column).
        const dzPoint = now.z - from.z;
        const dc = now.landmark - from.landmark;
        const crestDx = -dc * now.rayX - from.landmark * (now.rayX - from.rayX);
        const crestDz = dzPoint - dc * now.rayZ - from.landmark * (now.rayZ - from.rayZ);
        if (Math.hypot(crestDx - dkx, crestDz - dkz) > 1e-6) this.crestStepDiffers += 1;
        const kMove = Math.hypot(dkx, dkz);
        if (kMove > JUMP) {
          this.crestPointJumps.largest = Math.max(this.crestPointJumps.largest, kMove);
          const kParts = [Math.abs(dzPoint), Math.abs(dc), Math.abs(from.landmark) * Math.hypot(now.rayX - from.rayX, now.rayZ - from.rayZ)];
          const most = kParts.indexOf(Math.max(...kParts));
          if (most === 0) this.crestPointJumps.z += 1;
          else if (most === 1) this.crestPointJumps.landmark += 1;
          else this.crestPointJumps.ray += 1;
        }
      }
    }
    life.previous = now;
    this.traceRow(life, step, p, u, mode, paced, {
      term: u > 0 && u < 1 && anchored ? term : Number.NaN, real, along, across, crestAlong, rate: rateOfClock,
    });
  }

  /** A slice as a `Step`: K from the profile's crest landmark, T′ from the slice held at the throw (the anchor before a throw point). */
  private stepOf(
    p: FrontPoint, s: ReturnType<typeof createCrashSlice>, t: ReturnType<typeof createCrashSlice>, step: number, time: number, touchdown: number,
  ): Step {
    const landmark = (s.crestX - s.anchorX) * s.rayX + (s.crestZ - s.anchorZ) * s.rayZ;
    const kx = p.x - landmark * s.rayX;
    const kz = p.z - landmark * s.rayZ;
    const anchored = p.tau >= 0 && p.throwZ !== null;
    return {
      step, time, tau: p.tau, u: handBack(p.tau, touchdown).u,
      ax: s.anchorX, az: s.anchorZ, kx, kz, tx: anchored ? t.anchorX : s.anchorX, tz: anchored ? t.anchorZ : s.anchorZ, landmark, rayX: s.rayX,
      rayZ: s.rayZ, z: p.z, anchored,
    };
  }

  /** A point's slice the step before, on that step's front (for the step entering its hand-back); undefined if it wasn't on a drawn front then. */
  private priorStep(p: FrontPoint): Step | undefined {
    const j = this.previousIndex.get(p.id);
    if (j === undefined || this.previousStarts[j] < 0) return undefined;
    const q = this.previousPoints[j];
    const { solver } = this.simulation;
    const s = this.curve.slice(this.previousPoints, this.previousStarts[j], this.previousEnds[j], j, solver.restLevel, this.heightAt, this.prior);
    const anchored = q.tau >= 0 && q.throwZ !== null;
    const t = anchored ? this.curve.slice(this.previousPoints, this.previousStarts[j], this.previousEnds[j], j, solver.restLevel, this.heightAt, this.held, { throwAnchor: true }) : s;
    const life = this.lives.get(p.id)!;
    return this.stepOf(q, s, t, this.step - 1, life.lastTime, life.touchdown);
  }

  /** A traced jet's line at a measured step (fields it couldn't measure are '-'). */
  private traceRow(
    life: Life, step: number, p: FrontPoint, u: number, mode: string, paced: number,
    m: { term: number; real: number; along: number; across: number; crestAlong: number; rate: number } = {
      term: Number.NaN, real: Number.NaN, along: Number.NaN, across: Number.NaN, crestAlong: Number.NaN, rate: Number.NaN,
    },
  ): void {
    if (!life.traced) return;
    const c = life.normal;
    this.traceLines.push([
      life.traced, step, fixed(p.tau, 3), fixed(p.tau / life.touchdown), fixed(u), mode, fixed(p.z - paced), fixed(m.term / c), fixed(m.real / c),
      fixed(m.along), fixed(m.across, 6), fixed(m.crestAlong), fixed(m.rate),
    ].join('  '));
  }

  /** The tallies at the run's end, against the crash's, the front's and the lip's own; and the summary lines. */
  report(counts: Record<string, number>, coasted: number, closedAtPour: number, summary: string[]): string[] {
    const { front } = this.simulation;
    const held = new Set(front!.exportState().held.map((p) => p.id));
    const lives = [...this.lives.values()];
    const gone = (life: Life) => life.lastStep < this.step && !held.has(life.id);
    const jets = lives.filter((life) => life.thrownStep > 0);
    const thrownPoints = lives.filter((life) => life.pacedStep > 0);
    const owners = jets.filter((life) => life.crash === 'own');
    const own = owners.length;
    const ownCovered = owners.filter((life) => life.coveredAtCrash).length;
    const alone = jets.filter((life) => life.crash === 'alone').length;
    const past = jets.filter((life) => life.crash === 'past').length;
    const stalled = jets.filter((life) => life.crash === 'exit').length;
    const lost = jets.filter((life) => life.crash === 'lost').length;
    const dropped = jets.filter((life) => life.crashedStep === 0 && gone(life));
    const pending = jets.filter((life) => life.crashedStep === 0 && !gone(life));
    const resolved = own + alone + past + stalled + lost + dropped.length;
    const coasters = thrownPoints.filter((life) => life.coasted > 0);
    const jetCoasters = jets.filter((life) => life.coasted > 0);
    const outcome = (life: Life) => life.crash || (gone(life) ? 'dropped' : 'pending');
    const outcomes = (list: Life[]) => ['own', 'alone', 'past', 'exit', 'lost', 'dropped', 'pending'].map((name) => `${name} ${list.filter((life) => outcome(life) === name).length}`).join(', ');
    const now = this.simulation.solver.time;
    const out: string[] = [];
    out.push(`  jets: ${jets.length} thrown (of ${thrownPoints.length} thrown points, jet or not); ${resolved} resolved, ${pending.length} pending at the run's end (uncrashed, their point still on the front or held)`);
    out.push(`    crashed on their own point: ${own} (${percent(own, resolved)} of the resolved, ${percent(own, jets.length)} of the thrown); of them under an earlier front's barrel at their crash (its curl drawn instead): ${ownCovered}; with their own curl drawn: ${own - ownCovered} (${percent(own - ownCovered, resolved)} of the resolved)`);
    out.push(`    alone on their front at touchdown (not on a drawn front): ${alone}, and past their collapse on a drawn front: ${past} (together ${percent(alone + past, resolved)} of the resolved)`);
    out.push(`    left the front at a stall (2 T after the throw short of touchdown; crashed where foreseen): ${stalled} (${percent(stalled, resolved)} of the resolved); lost (their point left the front any other way first; crashed where foreseen): ${lost}; dropped before the crash otherwise: ${dropped.length}`);
    if (pending.length) {
      const oldest = [...pending].sort((a, b) => a.pacedTime - b.pacedTime).slice(0, 12);
      out.push(`    the pending, oldest first (age since the throw, s / over T / τ over T / τ gained since the throw, s / steps coasted / coasting at the end): ${oldest.map((life) => `${(now - life.pacedTime).toFixed(1)} / ${((now - life.pacedTime) / life.touchdown).toFixed(2)} / ${(life.lastTau / life.touchdown).toFixed(2)} / ${(life.lastTau - life.pacedTau).toFixed(2)} / ${life.coasted} / ${life.run > 0 ? 'yes' : 'no'}`).join('; ')}`);
    }
    const oldestUncrashed = jets.map((life) => life.oldest);
    const heldPast = jets.filter((life) => life.oldest > 2 + 1 / (30 * life.touchdown) + 1e-9).length;
    out.push(`    the oldest an uncrashed jet stood on the front, in open times since its throw, per jet: ${spread(oldestUncrashed)}; held past 2 T (more than a step past it): ${heldPast}`);
    out.push(`    jets off a drawn front at some step before their crash: ${jets.filter((life) => life.alone > 0).length}; steps off, of the ${alone} alone at touchdown: ${spread(jets.filter((life) => life.crash === 'alone').map((life) => life.alone), 0)}`);
    out.push(`    coasted (ran on the pace with no crest in reach): ${outOf(coasters.length, thrownPoints.length)} thrown points, ${coasters.reduce((sum, life) => sum + life.coasted, 0)} point-steps (the front's counter ${coasted}); jets ${outOf(jetCoasters.length, jets.length)}, ${jetCoasters.reduce((sum, life) => sum + life.coasted, 0)} point-steps; steps per coasting jet ${spread(jetCoasters.map((life) => life.coasted), 0)}; their outcomes: ${outcomes(jetCoasters)}`);
    const lengths = [...this.episodeLengths, ...thrownPoints.filter((life) => life.run > 0 && !gone(life)).map((life) => life.run)];
    out.push(`    coasting episodes (runs of steps, thrown points): ${lengths.length}, ${lengths.filter((n) => n > 30).length} longer than a second, ${pending.filter((life) => life.run > 0).length} pending jets still coasting at the end; steps per episode ${spread(lengths, 0)}`);
    const claimers = jets.filter((life) => life.lateClaims > 0);
    out.push(`    steps on which an uncrashed jet more than three open times old claimed a crest: ${claimers.reduce((sum, life) => sum + life.lateClaims, 0)}, on ${claimers.length} jets`);
    const crashed = jets.filter((life) => life.crashedStep > 0);
    const flights = crashed.map((life) => (life.crashTime - life.pacedTime) / life.touchdown);
    out.push(`    the flight, the solver time from the throw to the crash over the open time T: ${spread(flights)}; more than 1.5 T: ${flights.filter((v) => v > 1.5).length} of ${flights.length}; more than 2 T: ${flights.filter((v) => v > 2).length}`);
    // The voids.
    const atCrash = jets.filter((life) => life.closeStep > 0 && life.closeStep === life.crashedStep);
    const before = jets.filter((life) => life.closeStep > 0 && (life.crashedStep === 0 || life.closeStep < life.crashedStep));
    const after = jets.filter((life) => life.closeStep > 0 && life.crashedStep > 0 && life.closeStep > life.crashedStep);
    const unclosed = jets.filter((life) => life.closeStep === 0);
    const byKind = (list: Life[]) => ['own', 'alone', 'past', 'exit', 'lost'].map((name) => `${name} ${list.filter((life) => life.crash === name).length}`).join(', ');
    out.push(`    voids closed at their crash (the same step): ${atCrash.length} (${byKind(atCrash)}); before it, as a pour began (PlungingLip.closedAtPour ${closedAtPour}): ${before.length}; after it: ${after.length}; still open at the end: ${unclosed.length} (pending ${unclosed.filter((life) => life.crashedStep === 0).length})`);
    out.push(`    the rays' z part n_z at the throws ${spread(this.rayZs)}; C (c_n) of the jets ${spread(jets.map((life) => life.normal))} m/s; their pace c_n / n_z ${spread(jets.map((life) => life.pace))} m/s`);
    // The stalls.
    const exitJets = this.exits.filter((life) => life.crash === 'exit');
    out.push(`  the 2 T exits (a point whose clock hadn't reached touchdown 2 T of solver time after its throw left the front): ${this.exits.length} (the crash's ${counts.exits}); with a jet ${exitJets.length} (the crash's ${counts.exitJets}), without ${this.exits.length - exitJets.length}; drawn when last seen (on a drawn front, not under an earlier front's barrel) ${this.exits.filter((life) => life.exitDrawn).length}, of them with a jet ${exitJets.filter((life) => life.exitDrawn).length}`);
    if (this.exits.length) {
      out.push(`    their clock at the exit over T ${spread(this.exits.map((life) => life.exitTau / life.touchdown))}; the clock gained since the throw, s ${spread(this.exits.map((life) => life.exitTau - life.pacedTau))}`);
    }
    // The joins past the throw.
    const lateJoins = thrownPoints.filter((life) => life.bornTau >= 0);
    out.push(`  points that joined already past their throw (first seen with τ ≥ 0): ${outOf(lateJoins.length, thrownPoints.length)} thrown points; jets among them ${lateJoins.filter((life) => life.thrownStep > 0).length}; on a drawn front at their first step ${lateJoins.filter((life) => life.bornDrawn).length}, paced then ${lateJoins.filter((life) => life.pacedStep === life.bornStep).length}; their τ over T then ${spread(lateJoins.map((life) => life.bornTau / life.touchdown))}`);
    // The gaps.
    out.push(`  a jet's z at its throw step (still the solver's crest's) less its pace there, m: the step it takes onto the pace the step after: ${spread(this.throwSteps)}; over ${JUMP} m either way ${outOf(this.throwSteps.filter((v) => Math.abs(v) > JUMP).length, this.throwSteps.length)}`);
    const overLand = this.landGapOverH.filter((g) => Math.abs(g) > 1).length;
    out.push(`  the gap at touchdown (the solver's crest z − the paced z, the first step at τ ≥ T), ${this.landGap.length} jets (${this.noCrestAtLanding} with no crest in reach; ${this.offPaceAtTouchdown} off the pace then): m ${spread(this.landGap)}; |gap|/H ${spread(this.landGapOverH.map(Math.abs))}; over 1 H: ${outOf(overLand, this.landGap.length)}`);
    const released = jets.filter((life) => life.releaseStep > 0);
    const atLast = released.filter((life) => life.releaseStep === this.step).length;
    const leftAtRelease = released.filter((life) => life.releaseStep < this.step && life.lastStep === life.releaseStep).length;
    const flickeredAfter = released.filter((life) => !life.backAfterRelease && life.lastStep > life.releaseStep).length;
    const ahead = this.releaseGapOverH.filter((g) => g > 1).length;
    const behind = this.releaseGapOverH.filter((g) => g < -1).length;
    out.push(`  the gap at release (the crest a jet's point claimed less its z, the step its clock passed touchdown + collapse, its slice faded: the jump back to the ordinary match), ${released.length} jets released (${this.releaseGap.length} with a crest in reach, ${this.releasedCoasting} coasting):`);
    out.push(`    m ${spread(this.releaseGap)}; in H ${spread(this.releaseGapOverH)}; more than 1 H either way ${outOf(ahead + behind, this.releaseGap.length)} (${ahead} with the crest ahead, ${behind} behind)`);
    out.push(`    of the ${released.length} released jets: back on the ordinary match the step after ${this.returned}; never seen after (left the front then, or unseen at the run's end) ${leftAtRelease}; unseen the step after but back later ${flickeredAfter}; released at the run's last step ${atLast}`);
    // The hand-back.
    const measuredJets = jets.filter((life) => life.steps > 0);
    const anchoredJets = measuredJets.filter((life) => !life.unanchored);
    const unanchoredJets = jets.filter((life) => life.unanchored).length;
    const mostShares = anchoredJets.map((life) => life.handover / life.normal);
    const realJets = jets.filter((life) => life.realSteps > 0 && !life.unanchored);
    const realMost = realJets.map((life) => life.realHandover / life.normal);
    out.push(`  the anchor's hand-back (from the throw to 0.8 T, u = 3x² − 2x³; C = c_n; K = S − c n the crest point, T′ the throw point on the ray, A = T′ + u (K − T′)): ${this.terms.length} steps inside it on ${anchoredJets.length} jets with a throw point on a drawn front (${this.unmeasuredHandover} more steps off one, unmeasured); ${unanchoredJets} jets had no throw point (the anchor on K all along: term 0)`);
    out.push(`    the hand-back's own term u̇ |K − T′| (per second of the slice's clock):`);
    out.push(`      per hand-back step, m/s: ${spread(this.terms)}; over C: ${spread(this.termShares)}; over 0.5 C on ${outOf(this.termShares.filter((v) => v > 0.5).length, this.termShares.length)} steps`);
    out.push(`      per jet, its largest, m/s: ${spread(anchoredJets.map((life) => life.handover))}; over C: ${spread(mostShares)}; over 0.5 C at some step on ${outOf(mostShares.filter((v) => v > 0.5).length, mostShares.length)} jets`);
    out.push(`    K − T′ per hand-back step, m: along the ray (+ forward) ${spread(this.alongs)}; across it (+ toward +σ) ${spread(this.acrosses, 9)}; |across| over 1e-6 m on ${this.acrossDiffers} steps (all points measured)`);
    out.push(`    per real second, the hand-back's part of the anchor's move over Δt, over each step it moves in (u₀ < 1, u₁ > 0; the clock's own rate in it; the step entering it from before the throw included): over C per step ${spread(this.realShares)}; over 0.5 C on ${outOf(this.realShares.filter((v) => v > 0.5).length, this.realShares.length)} steps; per jet, its largest (${realJets.length} jets with a measured step): ${spread(realMost)}`);
    out.push(`      steps it moved in, all thrown points: with a slice the step before ${this.realMeasured} (entering ${this.enteringMeasured}); with none (off a drawn front, unseen or joined past its throw the step before) ${this.realUnmeasured} (entering ${this.enteringUnmeasured})`);
    out.push(`    over those steps (finite differences, jets): the drawn anchor's speed |v_A| over C ${spread(this.anchorShares)}; K's |v_K| ${spread(this.crestPointShares)}`);
    const aj = this.anchorJumps;
    const kj = this.crestPointJumps;
    out.push(`    steps the hand-back moved in whose anchor moved more than ${JUMP} m: ${aj.handover + aj.crestPoint + aj.throwPoint + aj.appearance} of ${this.realMeasured} (largest ${fixed(aj.largest)} m); the largest part: the hand-back's ${aj.handover}, following K (u₁ ΔK, or ΔK entering) ${aj.crestPoint}, (1 − u₁) ΔT′ ${aj.throwPoint}, the throw point's appearance (entering) ${aj.appearance}`);
    out.push(`    those whose K moved more than ${JUMP} m: ${kj.z + kj.landmark + kj.ray} (largest ${fixed(kj.largest)} m); the largest part: the point's z ${kj.z}, the crest landmark's advance ${kj.landmark}, the ray turning (c₀ Δn) ${kj.ray}`);
    out.push(`    thrown points with no jet, with a throw point: the term over C per hand-back step ${spread(this.otherShares)}; per point, its largest ${spread(thrownPoints.filter((life) => life.thrownStep === 0 && life.steps > 0).map((life) => life.handover / life.normal))}`);
    out.push(`  the drawn crest's distance from its point along the ray (+ forward), m, per step from the throw to touchdown (jets on a drawn front): ${spread(this.crestDistances)}; per jet, its largest |…| (${jets.filter((life) => life.crestSteps > 0).length} jets with a measured step): ${spread(jets.filter((life) => life.crestSteps > 0).map((life) => life.crestDistance))}`);
    out.push(`  the clock's rate in the open window (τ gained over the step's time, each step from a jet's throw to its touchdown): ${spread(this.openRates)}; paused (under ${PAUSED}) on ${outOf(this.openRates.filter((v) => v < PAUSED).length, this.openRates.length)} steps, more than ${FAST} times real time on ${outOf(this.openRates.filter((v) => v > FAST).length, this.openRates.length)}`);
    // The clamp.
    out.push(`  the pace clamp (0.5–1.5 × √(g (h + η)) on c_n): of ${thrownPoints.length} thrown points ${this.paceSlow} slow, ${this.paceFast} fast, ${this.paceUnmeasured} unmeasured (the long-wave speed used); of ${jets.length} jets ${this.jetPace.slow} slow, ${this.jetPace.fast} fast, ${this.jetPace.unmeasured} unmeasured; jets' measured crest speed over √(g (h + η)): ${spread(this.speedRatio)}`);
    // The slices dropped.
    const left = lives.filter((life) => gone(life) && life.exitStep === 0);
    const phase = (life: Life) => (life.lastTau < 0 ? 'before' : life.lastTau < life.touchdown ? (life.thrownStep > 0 && life.crashedStep === 0 ? 'jet' : 'open') : life.lastTau < life.touchdown + life.collapse ? 'pour' : 'over');
    const by = (name: string) => left.filter((life) => phase(life) === name);
    const shown = (list: Life[]) => list.filter((life) => life.drawn && !life.covered).length;
    const mid = [...by('jet'), ...by('open'), ...by('pour')];
    const open = by('open');
    out.push(`  slices dropped mid-tube or mid-pour (the point left the front for good, 0 ≤ τ < touchdown + collapse; the 2 T exits apart): ${mid.length}; drawn when last seen (on a drawn front, not under an earlier front's barrel): ${shown(mid)}`);
    out.push(`    open and holding an uncrashed jet ${by('jet').length} (${shown(by('jet'))} drawn); open, no jet ${open.length} (${shown(open)} drawn: never thrown ${open.filter((life) => life.jetStrip === undefined).length}, no jet (−1) ${open.filter((life) => life.jetStrip === -1).length}); pouring or closing ${by('pour').length} (${shown(by('pour'))} drawn)`);
    out.push(`    the fade left on those pouring when they went (1 at touchdown, 0 when faded): ${spread(by('pour').map((life) => (life.collapse > 0 ? 1 - (life.lastTau - life.touchdown) / life.collapse : 0)))}`);
    out.push(`    left before their throw (τ < 0): ${by('before').length} (${shown(by('before'))} drawn); after their tube was over: ${by('over').length}; of ${lives.length} points followed`);
    const mids = this.flickers.filter((f) => f.midTube);
    out.push(`    flickers (unseen then back): ${this.flickers.length}, ${mids.length} mid-tube; how long, s: ${spread(this.flickers.map((f) => f.seconds))}`);
    // The checks.
    const checks: string[] = [];
    const agree = (name: string, mine: number, theirs: number) => {
      if (mine !== theirs) checks.push(`${name}: tracked ${mine}, counted ${theirs}`);
    };
    agree('jets thrown', jets.length, counts.throws);
    agree('crashed on their own point', own, counts.crashes);
    agree('crashed as foreseen', alone + past, counts.foreseen);
    agree('stall exits', this.exits.length, counts.exits);
    agree('stall exits with a jet', exitJets.length, counts.exitJets);
    agree('lost', lost, counts.lost);
    agree('pace slow', this.paceSlow, counts.paceSlow);
    agree('pace fast', this.paceFast, counts.paceFast);
    agree('pace unmeasured', this.paceUnmeasured, counts.paceUnmeasured);
    agree('coasted point-steps', coasters.reduce((sum, life) => sum + life.coasted, 0), coasted);
    agree('voids closed before their crash', before.length, closedAtPour);
    if (this.paceDiffers) checks.push(`${this.paceDiffers} points' pace or throw time differs from c_n / n_z and the step's time recomputed`);
    if (this.untilDiffers) checks.push(`${this.untilDiffers} points' jetUntil differs from touchdown + collapse`);
    if (this.coastDiffers) checks.push(`${this.coastDiffers} steps' coasting count differs from the front's`);
    if (this.anchorDiffers) checks.push(`${this.anchorDiffers} steps' anchor differs from T′ + u (K − T′) with u = 3x² − 2x³`);
    if (this.acrossDiffers) checks.push(`${this.acrossDiffers} steps' K − T′ lies off the ray by over 1e-6 m`);
    if (this.zDiffers) checks.push(`${this.zDiffers} steps' z differs from jetBase + jetPace τ on the pace`);
    if (this.anchorStepDiffers) checks.push(`${this.anchorStepDiffers} anchor steps differ from their parts`);
    if (this.crestStepDiffers) checks.push(`${this.crestStepDiffers} K steps differ from their parts`);
    out.push(`  cross-checks against the code's own counters, the loft's anchor and the pace: ${checks.length ? `DISAGREE: ${checks.join('; ')}` : 'all agree'}`);
    // The summary: the numbers the advisor asked for, in one place.
    const over = (values: number[], bar: number) => values.filter((v) => v > bar).length;
    summary.push(
      `    jets thrown ${jets.length}; resolved ${resolved}, pending ${pending.length}; crashed on their own point ${own} (${percent(own, resolved)} of the resolved; with their own curl drawn ${own - ownCovered}, ${percent(own - ownCovered, resolved)}); alone on their front at touchdown ${alone} (+ ${past} past their collapse); left at a stall ${stalled}; lost ${lost}; dropped before the crash otherwise ${dropped.length}; held past 2 T ${heldPast} (the oldest uncrashed, per jet, in T: ${ninetyMedian(oldestUncrashed)}, max ${fixed(Math.max(0, ...oldestUncrashed))})`,
      `    the hand-back's own term over C, per second of the clock, ${anchoredJets.length} jets with a throw point (+ ${unanchoredJets} without, term 0): per hand-back step, ${ninetyMedian(this.termShares)}; per jet (its largest), ${ninetyMedian(mostShares)}; over 0.5 C on ${outOf(over(this.termShares, 0.5), this.termShares.length)} steps and ${outOf(over(mostShares, 0.5), mostShares.length)} jets; the term in m/s per hand-back step, ${ninetyMedian(this.terms)}`,
      `    the same per real second over C: per step the hand-back moves in, ${ninetyMedian(this.realShares)}; per jet (its largest), ${ninetyMedian(realMost)}`,
      `    K − T′ per hand-back step, m: along the ray ${spread(this.alongs)}; across it ${spread(this.acrosses, 9)}`,
      `    the drawn crest from its point along the ray, m, per step from the throw to touchdown: ${spread(this.crestDistances)}; per jet, its largest |…|: ${ninetyMedian(jets.filter((life) => life.crestSteps > 0).map((life) => life.crestDistance))}`,
      `    the gap at release, m: ${spread(this.releaseGap)} (${this.releasedCoasting} released coasting); over 1 H ${outOf(ahead + behind, this.releaseGap.length)}; back on the ordinary match the step after ${this.returned} of ${released.length} released jets`,
      `    a jet's z step onto its pace the step after its throw (its z at the throw step less its pace there), m: ${spread(this.throwSteps)}`,
      `    2 T exits ${this.exits.length} (with a jet ${exitJets.length}; drawn when last seen ${this.exits.filter((life) => life.exitDrawn).length}); points joined past their throw ${lateJoins.length} of ${thrownPoints.length} thrown points (jets ${lateJoins.filter((life) => life.thrownStep > 0).length})`,
      `    slices dropped mid-tube or mid-pour, the exits apart: ${mid.length} (${shown(mid)} drawn when last seen); voids closed at their crash ${atCrash.length} of ${jets.length - unclosed.length} closed (as a pour began ${before.length}, after the crash ${after.length})`,
      `    the clock in the open window: paused on ${outOf(this.openRates.filter((v) => v < PAUSED).length, this.openRates.length)} steps, over ${FAST} times real time on ${outOf(this.openRates.filter((v) => v > FAST).length, this.openRates.length)}; clamp hits (jets) ${this.jetPace.slow + this.jetPace.fast} (slow ${this.jetPace.slow}, fast ${this.jetPace.fast}; unmeasured ${this.jetPace.unmeasured}) of ${jets.length}`,
    );
    return out;
  }
}

/**
 * Padang Padang's game-size seas before and after the swept barrel's crash (Part B, PR 5; the advisor's condition,
 * 2026-10-01: the throw moves from Kennedy's onset to the barrel's τ = 0, so the solver's water is checked both ways).
 * Per seed and swell, at DX m cells (1): with the crash (CRASH=1, the library given) or without it (CRASH=0: Kennedy's lip,
 * as before PR 5), for SECONDS of sea after the spin-up. It logs:
 * - stability: every cell finite, and the fastest water (|q|/h over cells deeper than 5 cm), where and when;
 * - the peel (the peel meter's estimate) and the surf readout at the take-off (H1/3 and H1/10 over the last 2 min);
 * - the lips' water: throws, water thrown and asked, starved throws and water, unplaced momentum;
 * - with the crash: its counts, the pour's impact speeds, the jet per metre, and the crash's cost against the step's;
 * - with the crash, the jets and every thrown point point by point (`JetTracker`): crashed on their own point, alone on
 *   their front at touchdown, at a stall, lost or dropped, coasted, held past 2 T; the 2 T exits; the points joined past
 *   their throw; the gaps at touchdown and at release; the anchor's hand-back (per step and per jet, per second of the
 *   clock and per real second; K − T′ along and across the ray); the drawn crest's distance from its point; the clock's
 *   rate in the open window; the pace clamp's hits; the slices dropped mid-tube; the voids' closes. It checks its tallies
 *   against the crash's, the front's, the lip's and the loft's own (the definitions are on the class), and ends each case
 *   with a summary of those numbers;
 * - the case's wall and CPU time, and the load average at its start (and its end).
 * Opt-in (PROBE=1); DX (1), SEEDS (1,2), SWELLS (small,medium), SECONDS (120), CRASH (1), LOG; TRACE (0): the first n jets'
 * steps from the throw through their hand-back to touchdown, one line a step, in LOG.trace; and every ten seconds of sea
 * a progress line in LOG.progress. All three files are emptied at the start.
 */
describe.runIf(process.env.PROBE)('Padang Padang crash probe', () => {
  it('runs each sea with and without the crash and logs what the water did', () => {
    const log = process.env.LOG ?? 'padang-crash.txt';
    writeFileSync(log, '');
    writeFileSync(`${log}.progress`, '');
    writeFileSync(`${log}.trace`, '');
    const crash = process.env.CRASH !== '0';
    const library = crash ? libraryFromBytes(readBarrelCases()) : undefined;
    const dx = Number(process.env.DX ?? 1);
    const seeds = (process.env.SEEDS ?? '1,2').split(',').map(Number);
    const swells = (process.env.SWELLS ?? 'small,medium').split(',') as (keyof typeof PADANG_SWELLS)[];
    const seconds = Number(process.env.SECONDS ?? 120);
    const trace = Number(process.env.TRACE ?? 0);
    let commit = 'unknown';
    try {
      commit = execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim();
      if (execSync('git status --porcelain --untracked-files=no', { encoding: 'utf8' }).trim()) commit += ' plus uncommitted changes';
    } catch {
      // Not in a checkout: the log just says so.
    }
    const loads = () => loadavg().map((load) => load.toFixed(2)).join(' ');
    for (const size of swells) {
      for (const seed of seeds) {
        const started = performance.now();
        const cpuStarted = process.cpuUsage();
        const startedAt = new Date().toISOString();
        const loadAtStart = loads();
        const swell = PADANG_SWELLS[size];
        const simulation = new SurfZoneSimulation({
          spot: 'padang', seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod, directionDegrees: 0,
          spreading: PADANG_SPREADING, tide: 0, componentCount: 24, alongShore: PADANG.alongShore, dx, fineSpacing: dx, coarseSpacing: 4,
          spinUpPeriods: 1,
        }, 'spun-up', library);
        const { solver, lip } = simulation;
        const tracker = library ? new JetTracker(simulation, library, trace) : undefined;
        let asked = 0;
        let thrown = 0;
        simulation.onThrow = (event) => {
          asked += event.asked;
          thrown += event.thrown;
        };
        const impacts: number[] = [];
        // Whether the crests stand taller without Kennedy's lip taking water (the coordinator, 2026-10-01): each step's
        // highest water above still level in the fine zone, and the front's thrown crests' heights.
        const highest: number[] = [];
        const thrownCrests: number[] = [];
        const fineRow = solver.rowBelow(simulation.tank.fineFrom);
        let fastest = 0;
        let fastestAt = '';
        let bad = '';
        let stepMs = 0;
        let steps = 0;
        let landed = 0;
        const previous = lip.onLand!;
        lip.onLand = (x, z, volume, vx, vy, vz, flight) => {
          landed += volume;
          if ((flight?.kind ?? 0) === 0) impacts.push(Math.sqrt(vx * vx + vy * vy + vz * vz));
          previous(x, z, volume, vx, vy, vz, flight);
        };
        for (let frame = 0; frame < seconds * 30 && !bad; frame += 1) {
          const start = performance.now();
          simulation.step(1 / 30);
          stepMs += performance.now() - start;
          steps += 1;
          tracker?.observe();
          if (frame % 300 === 299) {
            appendFileSync(`${log}.progress`, `${size} seed ${seed} dx ${dx}: ${(frame + 1) / 30} of ${seconds} s of sea, ${((performance.now() - started) / 1000).toFixed(0)} s wall, ${(stepMs / steps).toFixed(0)} ms a step, load ${loads()}\n`);
          }
          if (frame % 3 !== 2) continue;
          let top = 0;
          for (let i = fineRow * solver.nx; i < solver.h.length; i += 1) {
            if (solver.h[i] > 0.05) top = Math.max(top, solver.h[i] + solver.bed[i] - solver.restLevel);
          }
          highest.push(top);
          for (const point of simulation.front?.points ?? []) if (point.tau >= 0) thrownCrests.push(point.height);
          for (let i = 0; i < solver.h.length; i += 1) {
            if (!(Number.isFinite(solver.h[i]) && Number.isFinite(solver.qx[i]) && Number.isFinite(solver.qz[i]))) {
              bad = `cell ${i} at t ${solver.time.toFixed(2)} s`;
              break;
            }
            if (solver.h[i] > 0.05) {
              const speed = Math.sqrt(solver.qx[i] * solver.qx[i] + solver.qz[i] * solver.qz[i]) / solver.h[i];
              if (speed > fastest) {
                fastest = speed;
                fastestAt = `t ${solver.time.toFixed(1)} s, x ${solver.xCenters[i % solver.nx].toFixed(0)}, z ${solver.zCenters[Math.floor(i / solver.nx)].toFixed(0)}, still depth ${(solver.restLevel - solver.bed[i]).toFixed(2)} m`;
              }
            }
          }
        }
        const reading = simulation.surf.reading(solver.time);
        const peel = simulation.peelEstimate();
        const counts = simulation.crash?.counts;
        const wall = (performance.now() - started) / 1000;
        const cpu = process.cpuUsage(cpuStarted);
        const title = `${size} seed ${seed}, ${crash ? 'with the crash' : 'Kennedy’s lip (before PR 5)'}, ${dx} m cells, ${seconds} s of sea after the spin-up (commit ${commit}; started ${startedAt}; load at the start ${loadAtStart})`;
        if (tracker?.traceLines.length) appendFileSync(`${log}.trace`, [`## ${title}`, ...tracker.traceLines].join('\n') + '\n');
        const summary: string[] = [];
        const jetLines = tracker && counts ? tracker.report(counts as unknown as Record<string, number>, simulation.front!.coasted, lip.closedAtPour, summary) : [];
        const cost = `step ${(stepMs / steps).toFixed(0)} ms${simulation.crash ? `, the crash ${(simulation.crash.updateMs / steps).toFixed(2)} ms` : ''}; wall time ${wall.toFixed(0)} s, CPU time ${((cpu.user + cpu.system) / 1e6).toFixed(0)} s (the case, with its spin-up and the tracker); load at the start ${loadAtStart}, at the end ${loads()}`;
        appendFileSync(log, [
          `${title}:`,
          `  stability: ${bad ? `NON-FINITE ${bad}` : 'finite'}; fastest water ${fastest.toFixed(1)} m/s (${fastestAt})`,
          `  peel: ${peel ? `${peel.angleDegrees.toFixed(1)}°, ${peel.peelSpeed.toFixed(1)} m/s, fit r² ${peel.fit.toFixed(2)}, ${peel.columns} columns` : 'no estimate'}`,
          `  surf at the take-off: ${reading ? `typical ${reading.typical.toFixed(2)} m, sets ${reading.sets.toFixed(2)} m over ${reading.waves} waves` : 'measuring'}`,
          `  lips: ${simulation.lipJets} throws, ${simulation.lipVolume.toFixed(1)} m³ thrown (events: asked ${asked.toFixed(1)}, thrown ${thrown.toFixed(1)}), landed ${landed.toFixed(1)} m³, airborne ${lip.airborneVolume().toFixed(1)} m³`,
          `  starved: ${lip.starvedThrows} throws, ${lip.starvedVolume.toFixed(2)} m³; unplaced momentum: ${lip.momentumClamps} throws, ${lip.unplacedMomentum.toFixed(1)} m⁴/s`,
          `  jet impacts ${quantiles(impacts, 1)} m/s`,
          `  the fine zone's highest water above still level, per tenth of a second: ${quantiles(highest)} m; the front's thrown crests: ${quantiles(thrownCrests)} m`,
          counts ? `  crash: ${JSON.stringify(counts)}` : '',
          ...jetLines,
          `  ${cost}`,
          ...(summary.length ? [`  SUMMARY (${size} seed ${seed}, ${dx} m cells, ${seconds} s; commit ${commit}):`, ...summary, `    ${cost}`] : []),
          '',
        ].filter((line) => line !== '').join('\n') + '\n');
      }
    }
  }, 36_000_000);
});
