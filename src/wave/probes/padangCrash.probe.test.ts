import { execSync } from 'node:child_process';
import { appendFileSync, writeFileSync } from 'node:fs';
import { loadavg } from 'node:os';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import type { FrontPoint } from '../barrel/BreakingFront';
import { libraryFromBytes } from '../barrel/barrelLibrary';
import { CrashCurve, createCrashSlice } from '../barrel/crashCurve';
import { readBarrelCases } from '../barrel/nodeBarrelCases';
import { LANDMARK, PROFILE_POINTS, type ProfileLibrary } from '../barrel/ProfileLibrary';
import { PACE } from '../barrel/SweptCrash';
import { BARREL_SLOPE } from '../barrel/sweptLoft';
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
/** The largest |value| (0 for none). */
const largest = (values: number[]) => values.reduce((most, value) => Math.max(most, Math.abs(value)), 0);

/**
 * A move this large in one step, m, is a jump: 15 m/s at 30 steps a second, about 2.5 times a 6 m/s crest. The jump
 * tallies split those by their largest part (the probe's threshold, provisional).
 */
const JUMP = 0.5;
/** A clock slower than this share of real time over a step has paused; one faster than `FAST` × real time has jumped (the probe's). */
const PAUSED = 0.05;
const FAST = 2;
/** Identities the probe checks hold to this, m: rounding only. */
const CHECK = 1e-6;

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
   * Its pace (every thrown point, jet or not): the step it was paced (its throw; 0: never), the solver time and its clock
   * then (`jetAt`), C, the clamped crest-normal speed c_n its pace was made from, m/s, its pace along its column c_n / n_z,
   * m/s, H, the wave height its window was measured with, m, and whether it had no throw point (`throwZ` null).
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
  /**
   * Its stall exits (`SweptCrash.exited` and `fadeExited`; 0: never): short of touchdown 2 T after its throw, or still on
   * its pace 2 (T + collapse) after it; its clock then, and whether it was drawn when last seen.
   */
  exitStep: number;
  exitTau: number;
  exitDrawn: boolean;
  fadeExitStep: number;
  fadeExitTau: number;
  fadeExitDrawn: boolean;
  /** Steps it ran on its pace with no crest in reach; its present run of them and the runs it has had. */
  coasted: number;
  run: number;
  episodes: number;
  /** Holding an uncrashed jet: steps off a drawn front, steps more than three open times old on which it claimed a crest, and the oldest it stood, in open times since its throw. */
  alone: number;
  lateClaims: number;
  oldest: number;
  /**
   * On its pace: the solver time of the last step the front matched it by its pace; whether `SweptCrash` held it on its
   * pace past touchdown; the crests it claimed past touchdown (its clock at T or later at the front's match), and the
   * oldest of those claims, in open times since its throw.
   */
  paceLatest: number;
  pastTouchdown: boolean;
  fadeClaims: number;
  oldestFadeClaim: number;
  /** Whether its touchdown has been read; its release (the step its clock passed `jetUntil`, its slice faded; 0 until then), and whether it was on the front the step after. */
  atTouchdown: boolean;
  releaseStep: number;
  backAfterRelease: boolean;
  /** Its slice at its last measured step (see `Step`). */
  previous?: Step;
  /** The most its drawn crest stood off its point, m, over the steps that measured it (from its throw through its fade, on a drawn front). */
  crestOff: number;
  crestSteps: number;
  /** Its place among the traced jets (0: not traced). */
  traced: number;
}

/**
 * A point's slice at one step: its clock, the anchor A, the crest point K = S − c n (c the profile's crest landmark, read
 * from the library as the loft reads it), the drawn crest, the ray, and the point S itself.
 */
interface Step {
  step: number;
  time: number;
  tau: number;
  ax: number;
  az: number;
  kx: number;
  kz: number;
  cx: number;
  cz: number;
  landmark: number;
  rayX: number;
  rayZ: number;
  x: number;
  z: number;
}

/**
 * What the swept crash does to its jets and to every thrown point, followed point by point from outside (the Padang
 * Padang spec, Part B, PR 5; the advisor's rulings of 2026-10-01 and 2026-10-03). After each step it reads the front's
 * points, the crash's counters, its covered test, its stalls and its throws, and the lip's strips, and checks its own
 * tallies against the code's. The terms:
 * - **A thrown point** is one whose pace `SweptCrash` set at its throw (`jetPace`), jet or not; **a jet** is one that held
 *   a strip (`jetStrip` ≥ 0) from its throw. A jet is **resolved** by its crash or when its point left the front for
 *   good; **pending** otherwise: uncrashed at the run's end with its point on the front.
 * - **Crashed on its own point:** the crash ran on its point in a drawn front (two points or more) with its tube live
 *   (`SweptCrash`'s `crashes`); those under an earlier front's barrel (whose curl the loft draws instead) are counted
 *   apart. **Alone at touchdown:** not on a drawn front at its touchdown, crashed as foreseen (`foreseen`); of those,
 *   **past their collapse** were on a drawn front with their tube over. **At a stall:** its point left the front 2 T
 *   after its throw short of touchdown (`SweptCrash.exited`), its jet crashed where foreseen. **Lost:** its point left
 *   the front any other way before its crash (`lost`). **With the exits apart:** of the resolved less those at a stall,
 *   which stand in for stalled clocks.
 * - **A fade exit:** a point still on its pace 2 (T + collapse) after its throw, its clock stalled in its slice's fade,
 *   left the front (`SweptCrash.fadeExited`); its jet had crashed already, and its pour runs on.
 * - **Coasted:** a step on which a point on its pace claimed no crest and ran on it (`BreakingFront.coasted`, jets or
 *   not); an **episode** is a run of such steps. **The flight** is the solver time from the throw to the crash over T.
 * - **On its pace** at a step: the front matched the point by its pace (`runsOnPace`, before the step's clock and crash:
 *   paced, its clock short of `jetUntil` = touchdown + collapse). Only then is its `crestZ` this step's claim. **The
 *   release** is the step its clock passes `jetUntil` (still matched by its pace, its slice faded): the gap there is the
 *   crest it claimed less its z, the jump it makes back on the ordinary match.
 * - **The anchor** (the advisor, 2026-10-03: u = 1 from the throw): the slice is the loft's (a `CrashCurve.slice` at the
 *   point's own σ, which mirrors the loft in drawing mode). Every measured step from the throw through the fade, its
 *   anchor A is checked against the crest point K = S − c n, c read from the library as the loft reads it, and its drawn
 *   crest against the point S, along the ray n (+ forward) and across it, t = (n_z, −n_x) (+ toward +σ). The hand-back's
 *   own term is 0 where A = K. **C** is the point's crest speed c_n, the clamped crest-normal speed its pace was made from.
 * - **The throw step:** the step a point is paced (`SweptCrash.paced`), before its slice is taken, so its z, crest point
 *   and anchor are on z = jetBase + jetPace τ there. The drawn crest's move along the ray from the step before (its
 *   slice then on that step's front) is exactly (−(z₀ − jetBase) + jetPace τ₁) n_z + Δx n_x: **the clock's lag** z₀ −
 *   jetBase, the solver's crest the step before less the pace's origin (`throwZ`, or with no throw point its z at the
 *   throw less its pace since τ = 0), and **the crest's own step** jetPace τ₁, one step's pace at most. Checked.
 * - **Over each step in the open window** (jets, from the throw step to touchdown, with a slice the step before): the
 *   anchor's move ΔA = ΔK, exactly Δz along z − Δc n₁ − c₀ Δn (the point's z, the crest landmark's advance, the ray
 *   turning as its front bends). Checked.
 * - **A slice dropped mid-tube** is a point that left the front for good while its tube was open or pouring (0 ≤ τ <
 *   touchdown + collapse), the exits apart; one before its throw is counted apart. A **flicker** is a point unseen for a
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
  private readonly prior = createCrashSlice();
  private readonly profile = new Float32Array(2 * PROFILE_POINTS);
  private readonly ray = { x: 0, z: 0 };
  private readonly slope: number;
  private readonly heightAt: (x: number, z: number) => number;
  private step = 0;
  private coastedBefore = 0;
  private coastedHere = 0;
  private tracing = 0;
  /** This step's front points, and `SweptCrash`'s runs as [start, end) per point (−1 outside); the last step's, by id. */
  private points: readonly FrontPoint[] = [];
  private starts = new Int32Array(0);
  private ends = new Int32Array(0);
  private previousPoints: readonly FrontPoint[] = [];
  private previousStarts = new Int32Array(0);
  private previousEnds = new Int32Array(0);
  private previousIndex = new Map<number, number>();
  /** This step's throws (`SweptCrash.paced`) by point, and the front as it stood when they were paced (their z the solver's crests'). */
  private readonly throwsNow = new Map<number, { crestZ: number; rayZ: number }>();
  private thrownFront: readonly FrontPoint[] = [];
  /** Pace tallies from the throws, all thrown points (to check `SweptCrash`'s counters) and jets; the measured crest speed over the long-wave speed, and the rays' z parts at the throws (jets). */
  paceSlow = 0;
  paceFast = 0;
  paceUnmeasured = 0;
  readonly jetPace = { slow: 0, fast: 0, unmeasured: 0 };
  readonly speedRatio: number[] = [];
  readonly rayZs: number[] = [];
  /** Disagreements with the code's own numbers (see `report`). */
  paceDiffers = 0;
  rayDiffers = 0;
  untilDiffers = 0;
  coastDiffers = 0;
  anchorDiffers = 0;
  crestDiffers = 0;
  zDiffers = 0;
  throwMoveDiffers = 0;
  crestStepDiffers = 0;
  /** Readings at touchdown off the pace (a jet thrown past it). */
  offPaceAtTouchdown = 0;
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
   * The anchor from the throw through the fade, per measured step (thrown points on a drawn front): the steps, the most
   * |A − K|, m, and the drawn crest less its point along the ray and across it, m (jets apart).
   */
  anchorSteps = 0;
  anchorWorst = 0;
  readonly crestAlongs: number[] = [];
  readonly crestAcrosses: number[] = [];
  readonly jetCrestAlongs: number[] = [];
  readonly jetCrestAcrosses: number[] = [];
  /**
   * The throw step (thrown points measured both steps on a drawn front): the drawn crest's move along the ray, m (all,
   * jets, with and without a throw point), its parts along the ray, the clock's lag −(z₀ − jetBase) n_z and the crest's
   * own step jetPace τ₁ n_z, the lag along the column z₀ − jetBase, m, the column's own move Δx n_x (0 expected), and the
   * throws it couldn't measure (jets apart).
   */
  readonly throwMoves: number[] = [];
  readonly throwMovesJets: number[] = [];
  readonly throwMovesAnchored: number[] = [];
  readonly throwMovesUnanchored: number[] = [];
  readonly lagParts: number[] = [];
  readonly stepParts: number[] = [];
  readonly lags: number[] = [];
  readonly stepTaus: number[] = [];
  throwXMoves = 0;
  throwUnmeasured = 0;
  throwUnmeasuredJets = 0;
  /** Over each step in the open window (jets): the steps measured, the drawn anchor's speed over C, and the steps whose anchor moved more than JUMP, by their largest part. */
  openMeasured = 0;
  readonly anchorShares: number[] = [];
  readonly anchorJumps = { z: 0, landmark: 0, ray: 0, largest: 0 };
  /** The clock's rate (τ gained over the step's time) over each step from a jet's throw to its touchdown. */
  readonly openRates: number[] = [];
  /** How many steps each finished run of coasting lasted. */
  readonly episodeLengths: number[] = [];
  /** Unseen points that came back: how long, s, and whether mid-tube. */
  readonly flickers: { seconds: number; midTube: boolean }[] = [];
  /** Every stall exit, short of touchdown and in the fade: its point's life, read as it left. */
  readonly exits: Life[] = [];
  readonly fadeExits: Life[] = [];
  /** The first `trace` jets' steps, one line a step (see the probe's `TRACE`). */
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
    // This step's throws, and the front as it stood when SweptCrash paced them: their z still the solver's crests'.
    this.throwsNow.clear();
    for (const thrown of crash!.paced) this.throwsNow.set(thrown.point.id, { crestZ: thrown.crestZ, rayZ: thrown.rayZ });
    this.thrownFront = this.throwsNow.size ? points.map((p) => (this.throwsNow.has(p.id) ? { ...p, z: this.throwsNow.get(p.id)!.crestZ } : p)) : points;
    // The stalls: SweptCrash took them off the front before this observation (crashing a 2 T exit's jet where foreseen).
    // The front matched them by their pace this step first, and counted any that coasted.
    this.coastedHere = 0;
    for (const [kind, list] of [['exit', crash!.exited], ['fade', crash!.fadeExited]] as const) {
      for (const p of list) {
        const life = this.lives.get(p.id);
        if (!life) continue;
        this.frontMatch(life, p, step, time);
        if (kind === 'exit') {
          life.exitStep = step;
          life.exitTau = p.tau;
          life.exitDrawn = life.drawn && !life.covered;
          if (life.thrownStep > 0 && life.crashedStep === 0) {
            life.crashedStep = step;
            life.crashTime = time;
            life.crash = 'exit';
          }
          this.exits.push(life);
        } else {
          life.fadeExitStep = step;
          life.fadeExitTau = p.tau;
          life.fadeExitDrawn = life.drawn && !life.covered;
          this.fadeExits.push(life);
        }
        if (life.run > 0) {
          this.episodeLengths.push(life.run);
          life.run = 0;
        }
      }
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
      // At this step's front update (before its clock, throw and crash): did the front match it by its pace?
      const { onPace, claimed } = this.frontMatch(life, p, step, time);
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
    if (coasted !== this.coastedHere) this.coastDiffers += 1;
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
    // This step's front and runs, for the next step's throws.
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

  /**
   * At this step's front update (before its clock, throw and crash): whether the front matched the point by its pace
   * (`runsOnPace`: paced before this step, its clock then short of `jetUntil`), and whether it claimed a crest (else it
   * coasted). Its clock then was the one it was last seen with.
   */
  private frontMatch(life: Life, p: FrontPoint, step: number, time: number): { onPace: boolean; claimed: boolean } {
    const onPace = life.pacedStep > 0 && life.pacedStep < step && life.lastStep === step - 1 && p.jetUntil !== undefined && life.lastTau < p.jetUntil;
    const claimed = onPace && p.crestZ !== undefined;
    if (onPace) {
      life.paceLatest = time;
      if (claimed && life.lastTau >= life.touchdown) {
        life.fadeClaims += 1;
        life.oldestFadeClaim = Math.max(life.oldestFadeClaim, (time - life.pacedTime) / life.touchdown);
      }
    }
    if (onPace && !claimed) {
      life.coasted += 1;
      this.coastedHere += 1;
      life.run += 1;
      if (life.run === 1) life.episodes += 1;
    } else if (life.run > 0) {
      this.episodeLengths.push(life.run);
      life.run = 0;
    }
    return { onPace, claimed };
  }

  /** The point's first sighting. */
  private born(p: FrontPoint, step: number): Life {
    const times = this.library.profileTimes({ slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth });
    return {
      id: p.id, touchdown: times.touchdownSeconds, collapse: times.collapseSeconds, bornStep: step, bornTau: p.tau, bornDrawn: false, lastStep: step, lastTime: 0,
      lastTau: p.tau, lastOnPace: false, drawn: false, covered: false, jetStrip: p.jetStrip, pacedStep: 0, pacedTime: 0, pacedTau: 0, normal: 0,
      pace: 0, height: 0, unanchored: false, thrownStep: 0, strip: -1, crashedStep: 0, crashTime: 0, crash: '', coveredAtCrash: false,
      closeStep: 0, exitStep: 0, exitTau: 0, exitDrawn: false, fadeExitStep: 0, fadeExitTau: 0, fadeExitDrawn: false, coasted: 0, run: 0, episodes: 0,
      alone: 0, lateClaims: 0, oldest: 0, paceLatest: 0, pastTouchdown: false, fadeClaims: 0, oldestFadeClaim: 0, atTouchdown: false, releaseStep: 0,
      backAfterRelease: false, crestOff: 0, crestSteps: 0, traced: 0,
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

  /**
   * The step a point is paced (its throw): its pace as `SweptCrash.pace` makes it, checked against the point's, with the
   * ray recomputed on the front as it stood when it was paced (this step's throws on the solver's crests they stood on).
   */
  private paced(life: Life, p: FrontPoint, k: number, step: number): void {
    life.pacedStep = step;
    life.pacedTime = p.jetAt ?? Number.NaN;
    life.paceLatest = life.pacedTime;
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
    const thrown = this.throwsNow.get(p.id);
    if (!thrown || this.starts[k] < 0) {
      this.paceDiffers += 1;
      return;
    }
    const rayZ = this.curve.ray(this.thrownFront, this.starts[k], this.ends[k], k, this.ray).z;
    if (rayZ !== thrown.rayZ) this.rayDiffers += 1;
    if (jet) this.rayZs.push(thrown.rayZ);
    const pace = normal / Math.max(PACE.leastRayZ, rayZ);
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
        + `pace ${fixed(life.pace)} m/s, T ${fixed(life.touchdown)} s, collapse ${fixed(life.collapse)} s; throw point ${p.throwZ === null ? 'none (the pace from its z at the throw)' : 'yes'}`,
        '# mode: throw (its throw step, paced), pace (on its pace, a crest claimed), coast (on its pace, none in reach), last (its clock passed jetUntil this step), match (back on the ordinary match), off (not on a drawn front: no slice)',
        '# jet  step  τ  τ/T  mode  z−paced(m)  |A−K|(m)  crest−S along n(m)  crest−S across(m)  throw step: move along n(m)  lag part(m)  own step part(m)  |ΔA|(m)  clock rate',
      );
    }
  }

  /** A thrown point's step: its z, its gaps, the clock, and its slice from the throw through its fade. */
  private measure(life: Life, p: FrontPoint, k: number, time: number, drawn: boolean, step: number, onPace: boolean, claimed: boolean): void {
    if (p.jetBase === undefined || p.jetPace === undefined || p.jetUntil === undefined) return;
    const jet = life.thrownStep > 0;
    const paced = p.jetBase + p.jetPace * p.tau;
    // On its pace `SweptCrash` keeps its z there from its throw step itself (the advisor, 2026-10-03) until its slice has faded.
    if (p.tau < p.jetUntil) {
      if (Math.abs(p.z - paced) > CHECK) this.zDiffers += 1;
      if (p.tau >= life.touchdown) life.pastTouchdown = true;
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
    const throwing = life.pacedStep === step;
    const mode = throwing ? 'throw' : !onPace ? 'match' : p.tau >= p.jetUntil ? 'last' : claimed ? 'pace' : 'coast';
    // Its slice, from its throw through its fade, on a drawn front.
    if (!drawn || !(p.tau < life.touchdown + life.collapse)) {
      if (throwing) {
        this.throwUnmeasured += 1;
        if (jet) this.throwUnmeasuredJets += 1;
      }
      life.previous = undefined;
      this.traceRow(life, step, p, mode, paced);
      return;
    }
    const { solver } = this.simulation;
    const s = this.curve.slice(this.points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.slice);
    const now = this.stepOf(p, s, step, time);
    // The anchor against K; the drawn crest against its point, along the ray and across it.
    const offK = Math.hypot(now.ax - now.kx, now.az - now.kz);
    this.anchorSteps += 1;
    this.anchorWorst = Math.max(this.anchorWorst, offK);
    if (!(offK <= CHECK)) this.anchorDiffers += 1;
    const crestAlong = (now.cx - p.x) * now.rayX + (now.cz - p.z) * now.rayZ;
    const crestAcross = (now.cx - p.x) * now.rayZ - (now.cz - p.z) * now.rayX;
    this.crestAlongs.push(crestAlong);
    this.crestAcrosses.push(crestAcross);
    if (jet) {
      this.jetCrestAlongs.push(crestAlong);
      this.jetCrestAcrosses.push(crestAcross);
    }
    if (!(Math.max(Math.abs(crestAlong), Math.abs(crestAcross)) <= CHECK)) this.crestDiffers += 1;
    life.crestOff = Math.max(life.crestOff, Math.abs(crestAlong), Math.abs(crestAcross));
    life.crestSteps += 1;
    // The throw step: the drawn crest's move along the ray from the step before, on that step's front.
    const before = throwing ? this.priorStep(p) : life.previous?.step === step - 1 ? life.previous : undefined;
    const row = { offK, crestAlong, crestAcross, move: Number.NaN, lagPart: Number.NaN, stepPart: Number.NaN, anchorMove: Number.NaN };
    if (throwing) {
      if (before === undefined) {
        this.throwUnmeasured += 1;
        if (jet) this.throwUnmeasuredJets += 1;
      } else {
        const move = (now.cx - before.cx) * now.rayX + (now.cz - before.cz) * now.rayZ;
        const lag = before.z - p.jetBase;
        const lagPart = -lag * now.rayZ;
        const stepPart = p.jetPace * p.tau * now.rayZ;
        const xPart = (now.x - before.x) * now.rayX;
        if (!(Math.abs(move - (lagPart + stepPart + xPart)) <= CHECK)) this.throwMoveDiffers += 1;
        if (!(Math.abs(xPart) <= CHECK)) this.throwXMoves += 1;
        this.throwMoves.push(move);
        if (jet) this.throwMovesJets.push(move);
        (life.unanchored ? this.throwMovesUnanchored : this.throwMovesAnchored).push(move);
        this.lagParts.push(lagPart);
        this.stepParts.push(stepPart);
        this.lags.push(lag);
        this.stepTaus.push(p.tau);
        row.move = move;
        row.lagPart = lagPart;
        row.stepPart = stepPart;
      }
    }
    // Over each step in the open window (jets): the anchor's move, ΔA = ΔK, by its parts.
    let rateOfClock = Number.NaN;
    if (jet && p.tau < life.touchdown && before !== undefined) {
      const dt = time - before.time;
      rateOfClock = (p.tau - before.tau) / dt;
      const dax = now.ax - before.ax;
      const daz = now.az - before.az;
      const anchorMove = Math.hypot(dax, daz);
      row.anchorMove = anchorMove;
      this.openMeasured += 1;
      this.anchorShares.push(anchorMove / dt / life.normal);
      // K's move: the point's z, the crest landmark's advance along the ray, and the ray turning (x stays on its column).
      const dz = now.z - before.z;
      const dc = now.landmark - before.landmark;
      const crestDx = now.x - before.x - dc * now.rayX - before.landmark * (now.rayX - before.rayX);
      const crestDz = dz - dc * now.rayZ - before.landmark * (now.rayZ - before.rayZ);
      if (!(Math.hypot(crestDx - (now.kx - before.kx), crestDz - (now.kz - before.kz)) <= CHECK)) this.crestStepDiffers += 1;
      if (anchorMove > JUMP) {
        this.anchorJumps.largest = Math.max(this.anchorJumps.largest, anchorMove);
        const parts = [Math.abs(dz), Math.abs(dc), Math.abs(before.landmark) * Math.hypot(now.rayX - before.rayX, now.rayZ - before.rayZ)];
        const most = parts.indexOf(Math.max(...parts));
        if (most === 0) this.anchorJumps.z += 1;
        else if (most === 1) this.anchorJumps.landmark += 1;
        else this.anchorJumps.ray += 1;
      }
    }
    life.previous = now;
    this.traceRow(life, step, p, mode, paced, { ...row, rate: rateOfClock });
  }

  /** A slice as a `Step`: K from the profile's crest landmark read from the library as the loft reads it (its drawing at the point's clock). */
  private stepOf(p: FrontPoint, s: ReturnType<typeof createCrashSlice>, step: number, time: number): Step {
    this.library.profileAt({ slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth, seconds: p.tau, hold: 'drawing' }, this.profile);
    const landmark = this.profile[2 * LANDMARK.crest];
    return {
      step, time, tau: p.tau, ax: s.anchorX, az: s.anchorZ, kx: p.x - landmark * s.rayX, kz: p.z - landmark * s.rayZ, cx: s.crestX, cz: s.crestZ,
      landmark, rayX: s.rayX, rayZ: s.rayZ, x: p.x, z: p.z,
    };
  }

  /** A point's slice the step before, on that step's front (for its throw step); undefined if it wasn't on a drawn front then. */
  private priorStep(p: FrontPoint): Step | undefined {
    const j = this.previousIndex.get(p.id);
    if (j === undefined || this.previousStarts[j] < 0) return undefined;
    const life = this.lives.get(p.id)!;
    if (life.lastStep !== this.step - 1) return undefined;
    const q = this.previousPoints[j];
    const { solver } = this.simulation;
    const s = this.curve.slice(this.previousPoints, this.previousStarts[j], this.previousEnds[j], j, solver.restLevel, this.heightAt, this.prior);
    return this.stepOf(q, s, this.step - 1, life.lastTime);
  }

  /** A traced jet's line at a measured step (fields it couldn't measure are '-'). */
  private traceRow(
    life: Life, step: number, p: FrontPoint, mode: string, paced: number,
    m: { offK: number; crestAlong: number; crestAcross: number; move: number; lagPart: number; stepPart: number; anchorMove: number; rate: number } = {
      offK: Number.NaN, crestAlong: Number.NaN, crestAcross: Number.NaN, move: Number.NaN, lagPart: Number.NaN, stepPart: Number.NaN, anchorMove: Number.NaN, rate: Number.NaN,
    },
  ): void {
    if (!life.traced) return;
    this.traceLines.push([
      life.traced, step, fixed(p.tau, 3), fixed(p.tau / life.touchdown), mode, fixed(p.z - paced), fixed(m.offK, 9), fixed(m.crestAlong, 9),
      fixed(m.crestAcross, 9), fixed(m.move), fixed(m.lagPart), fixed(m.stepPart), fixed(m.anchorMove), fixed(m.rate),
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
    const apart = resolved - stalled;
    const coasters = thrownPoints.filter((life) => life.coasted > 0);
    const jetCoasters = jets.filter((life) => life.coasted > 0);
    const outcome = (life: Life) => life.crash || (gone(life) ? 'dropped' : 'pending');
    const outcomes = (list: Life[]) => ['own', 'alone', 'past', 'exit', 'lost', 'dropped', 'pending'].map((name) => `${name} ${list.filter((life) => outcome(life) === name).length}`).join(', ');
    const now = this.simulation.solver.time;
    const out: string[] = [];
    out.push(`  jets: ${jets.length} thrown (of ${thrownPoints.length} thrown points, jet or not); ${resolved} resolved, ${pending.length} pending at the run's end (uncrashed, their point still on the front or held; not among the resolved)`);
    out.push(`    crashed on their own point: ${own} (${percent(own, resolved)} of the resolved, ${percent(own, jets.length)} of the thrown); with the 2 T exits apart: ${own} of ${apart} (${percent(own, apart)}); of them under an earlier front's barrel at their crash (its curl drawn instead): ${ownCovered}; with their own curl drawn: ${own - ownCovered} (${percent(own - ownCovered, resolved)} of the resolved; ${percent(own - ownCovered, apart)} with the 2 T exits apart)`);
    out.push(`    alone on their front at touchdown (not on a drawn front): ${alone}, and past their collapse on a drawn front: ${past} (together ${percent(alone + past, resolved)} of the resolved)`);
    out.push(`    left the front at a stall (2 T after the throw short of touchdown; crashed where foreseen): ${stalled} (${percent(stalled, resolved)} of the resolved); lost (their point left the front any other way first; crashed where foreseen): ${lost}; dropped before the crash otherwise: ${dropped.length}`);
    if (pending.length) {
      const oldest = [...pending].sort((a, b) => a.pacedTime - b.pacedTime).slice(0, 12);
      out.push(`    the pending, oldest first (age since the throw, s / over T / τ over T / τ gained since the throw, s / steps coasted / coasting at the end): ${oldest.map((life) => `${(now - life.pacedTime).toFixed(1)} / ${((now - life.pacedTime) / life.touchdown).toFixed(2)} / ${(life.lastTau / life.touchdown).toFixed(2)} / ${(life.lastTau - life.pacedTau).toFixed(2)} / ${life.coasted} / ${life.run > 0 ? 'yes' : 'no'}`).join('; ')}`);
    }
    const oldestUncrashed = jets.map((life) => life.oldest);
    const heldPast = jets.filter((life) => life.oldest > 2 + 1 / (30 * life.touchdown) + 1e-9).length;
    out.push(`    the oldest an uncrashed jet stood on the front, in open times since its throw, per jet: ${spread(oldestUncrashed)}; held past 2 T short of touchdown (more than a step past it): ${heldPast}`);
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
    out.push(`    the rays' z part n_z at the throws ${spread(this.rayZs)}; C (c_n) of the jets ${spread(jets.map((life) => life.normal))} m/s; their pace c_n / n_z ${spread(jets.map((life) => life.pace))} m/s; jets with no throw point (their pace from their z at the throw) ${jets.filter((life) => life.unanchored).length}`);
    // On the pace past touchdown, and the fade exits.
    const pastPoints = thrownPoints.filter((life) => life.pastTouchdown);
    const onPaceT = (life: Life) => (life.paceLatest - life.pacedTime) / life.touchdown;
    const overFade = thrownPoints.filter((life) => life.paceLatest - life.pacedTime > 2 * (life.touchdown + life.collapse) + 1 / 30 + 1e-9).length;
    const fadeClaimers = thrownPoints.filter((life) => life.fadeClaims > 0);
    const fadeExitJets = this.fadeExits.filter((life) => life.thrownStep > 0);
    out.push(`  on the pace past touchdown (its slice's fade; the advisor, 2026-10-03): ${pastPoints.length} thrown points held on it past touchdown (${pastPoints.filter((life) => life.thrownStep > 0).length} jets)`);
    out.push(`    the longest on its pace, the solver time from its throw to the last step the front matched it by its pace, in T, per point: ${spread(pastPoints.map(onPaceT))}; jets ${spread(pastPoints.filter((life) => life.thrownStep > 0).map(onPaceT))}; over 2 (T + collapse) (more than a step past it), all thrown points: ${overFade}`);
    out.push(`    crests claimed past touchdown (the clock at T or later at the front's match): ${fadeClaimers.reduce((sum, life) => sum + life.fadeClaims, 0)} steps on ${fadeClaimers.length} points (jets ${fadeClaimers.filter((life) => life.thrownStep > 0).length}); the oldest such claim per point, in T since the throw: ${spread(fadeClaimers.map((life) => life.oldestFadeClaim))}`);
    out.push(`    the fade exits (still on their pace 2 (T + collapse) after their throw): ${this.fadeExits.length} (the crash's ${counts.fadeExits}); with a jet ${fadeExitJets.length} (the crash's ${counts.fadeExitJets}); drawn when last seen ${this.fadeExits.filter((life) => life.fadeExitDrawn).length}, of them with a jet ${fadeExitJets.filter((life) => life.fadeExitDrawn).length}`);
    if (this.fadeExits.length) {
      out.push(`      their clock at the exit over T ${spread(this.fadeExits.map((life) => life.fadeExitTau / life.touchdown))}; its fade left (1 at touchdown, 0 when faded) ${spread(this.fadeExits.map((life) => (life.collapse > 0 ? 1 - (life.fadeExitTau - life.touchdown) / life.collapse : 0)))}`);
    }
    // The 2 T exits.
    const exitJets = this.exits.filter((life) => life.crash === 'exit');
    out.push(`  the 2 T exits (a point whose clock hadn't reached touchdown 2 T of solver time after its throw left the front): ${this.exits.length} (the crash's ${counts.exits}); with a jet ${exitJets.length} (the crash's ${counts.exitJets}), without ${this.exits.length - exitJets.length}; drawn when last seen (on a drawn front, not under an earlier front's barrel) ${this.exits.filter((life) => life.exitDrawn).length}, of them with a jet ${exitJets.filter((life) => life.exitDrawn).length}`);
    if (this.exits.length) {
      out.push(`    their clock at the exit over T ${spread(this.exits.map((life) => life.exitTau / life.touchdown))}; the clock gained since the throw, s ${spread(this.exits.map((life) => life.exitTau - life.pacedTau))}`);
    }
    // The joins past the throw.
    const lateJoins = thrownPoints.filter((life) => life.bornTau >= 0);
    out.push(`  points that joined already past their throw (first seen with τ ≥ 0): ${outOf(lateJoins.length, thrownPoints.length)} thrown points; jets among them ${lateJoins.filter((life) => life.thrownStep > 0).length}; on a drawn front at their first step ${lateJoins.filter((life) => life.bornDrawn).length}, paced then ${lateJoins.filter((life) => life.pacedStep === life.bornStep).length}; their τ over T then ${spread(lateJoins.map((life) => life.bornTau / life.touchdown))}`);
    // The throw step.
    const overJump = (values: number[]) => values.filter((v) => Math.abs(v) > JUMP).length;
    out.push(`  the throw step (each thrown point paced before its slice is taken; the advisor, 2026-10-03): the drawn crest's move along the ray (+ forward) from the step before, m, ${this.throwMoves.length} thrown points measured (on a drawn front both steps; ${this.throwUnmeasured} not, ${this.throwUnmeasuredJets} of them jets):`);
    out.push(`    all ${spread(this.throwMoves)}; |move| over ${JUMP} m ${outOf(overJump(this.throwMoves), this.throwMoves.length)}; jets ${spread(this.throwMovesJets)}, over ${JUMP} m ${outOf(overJump(this.throwMovesJets), this.throwMovesJets.length)}; with a throw point ${spread(this.throwMovesAnchored)}; without ${spread(this.throwMovesUnanchored)}`);
    out.push(`    its parts along the ray: the clock's lag, −(z₀ − jetBase) n_z ${spread(this.lagParts)}; the crest's own step, jetPace τ₁ n_z ${spread(this.stepParts)}; the lag along the column, z₀ − jetBase (the solver's crest the step before less the pace's origin), m ${spread(this.lags)}; τ₁ at the throw step, s ${spread(this.stepTaus, 3)}`);
    out.push(`    checked: the move less its two parts (and the column's own move, 0 expected) over ${CHECK} m on ${this.throwMoveDiffers} throws; the column moved on ${this.throwXMoves}`);
    // The gaps.
    const overLand = this.landGapOverH.filter((g) => Math.abs(g) > 1).length;
    out.push(`  the gap at touchdown (the solver's crest z − the paced z, the first step at τ ≥ T), ${this.landGap.length} jets (${this.noCrestAtLanding} with no crest in reach; ${this.offPaceAtTouchdown} off the pace then): m ${spread(this.landGap)}; |gap|/H ${spread(this.landGapOverH.map(Math.abs))}; over 1 H: ${outOf(overLand, this.landGap.length)}`);
    const released = jets.filter((life) => life.releaseStep > 0);
    const atLast = released.filter((life) => life.releaseStep === this.step).length;
    const leftAtRelease = released.filter((life) => life.releaseStep < this.step && life.lastStep === life.releaseStep).length;
    const flickeredAfter = released.filter((life) => !life.backAfterRelease && life.lastStep > life.releaseStep).length;
    const ahead = this.releaseGapOverH.filter((g) => g > 1).length;
    const behind = this.releaseGapOverH.filter((g) => g < -1).length;
    out.push(`  the gap at release (the crest a jet's point claimed less its z, the step its clock passed touchdown + collapse, its slice faded: the jump back to the ordinary match), ${released.length} jets released (${this.releaseGap.length} with a crest in reach, ${this.releasedCoasting} coasting; the fade exits left without a release):`);
    out.push(`    m ${spread(this.releaseGap)}; in H ${spread(this.releaseGapOverH)}; more than 1 H either way ${outOf(ahead + behind, this.releaseGap.length)} (${ahead} with the crest ahead, ${behind} behind)`);
    out.push(`    of the ${released.length} released jets: back on the ordinary match the step after ${this.returned}; never seen after (left the front then, or unseen at the run's end) ${leftAtRelease}; unseen the step after but back later ${flickeredAfter}; released at the run's last step ${atLast}`);
    // The anchor from the throw.
    out.push(`  the anchor from the throw (u = 1: A = K = S − c n; the advisor, 2026-10-03), every measured step of a thrown point from its throw through its fade on a drawn front: ${this.anchorSteps} steps; |A − K| at most ${this.anchorWorst.toExponential(2)} m, over ${CHECK} m on ${this.anchorDiffers}; the hand-back's own term is 0 where A = K`);
    out.push(`    the drawn crest less its point, m, per step: along the ray (+ forward) ${spread(this.crestAlongs, 9)}; across it (+ toward +σ) ${spread(this.crestAcrosses, 9)}; over ${CHECK} m either way on ${this.crestDiffers} steps; jets ${spread(this.jetCrestAlongs, 9)} along, ${spread(this.jetCrestAcrosses, 9)} across; per jet, its largest |…| (${jets.filter((life) => life.crestSteps > 0).length} jets with a measured step) ${spread(jets.filter((life) => life.crestSteps > 0).map((life) => life.crestOff), 9)}`);
    const aj = this.anchorJumps;
    out.push(`  over each step in the open window (jets, from the throw step to touchdown, with a slice the step before): ${this.openMeasured} steps; the drawn anchor's speed |ΔA|/Δt over C ${spread(this.anchorShares)}; steps whose anchor moved more than ${JUMP} m: ${aj.z + aj.landmark + aj.ray} (largest ${fixed(aj.largest)} m), by their largest part: the point's z ${aj.z}, the crest landmark's advance ${aj.landmark}, the ray turning (c₀ Δn) ${aj.ray}`);
    out.push(`  the clock's rate in the open window (τ gained over the step's time, each step from a jet's throw to its touchdown): ${spread(this.openRates)}; paused (under ${PAUSED}) on ${outOf(this.openRates.filter((v) => v < PAUSED).length, this.openRates.length)} steps, more than ${FAST} times real time on ${outOf(this.openRates.filter((v) => v > FAST).length, this.openRates.length)}`);
    // The clamp.
    out.push(`  the pace clamp (0.5–1.5 × √(g (h + η)) on c_n): of ${thrownPoints.length} thrown points ${this.paceSlow} slow, ${this.paceFast} fast, ${this.paceUnmeasured} unmeasured (the long-wave speed used); of ${jets.length} jets ${this.jetPace.slow} slow, ${this.jetPace.fast} fast, ${this.jetPace.unmeasured} unmeasured; jets' measured crest speed over √(g (h + η)): ${spread(this.speedRatio)}`);
    // The slices dropped.
    const left = lives.filter((life) => gone(life) && life.exitStep === 0 && life.fadeExitStep === 0);
    const phase = (life: Life) => (life.lastTau < 0 ? 'before' : life.lastTau < life.touchdown ? (life.thrownStep > 0 && life.crashedStep === 0 ? 'jet' : 'open') : life.lastTau < life.touchdown + life.collapse ? 'pour' : 'over');
    const by = (name: string) => left.filter((life) => phase(life) === name);
    const shown = (list: Life[]) => list.filter((life) => life.drawn && !life.covered).length;
    const mid = [...by('jet'), ...by('open'), ...by('pour')];
    const open = by('open');
    out.push(`  slices dropped mid-tube or mid-pour (the point left the front for good, 0 ≤ τ < touchdown + collapse; the 2 T and fade exits apart): ${mid.length}; drawn when last seen (on a drawn front, not under an earlier front's barrel): ${shown(mid)}`);
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
    agree('2 T exits', this.exits.length, counts.exits);
    agree('2 T exits with a jet', exitJets.length, counts.exitJets);
    agree('fade exits', this.fadeExits.length, counts.fadeExits);
    agree('fade exits with a jet', fadeExitJets.length, counts.fadeExitJets);
    agree('lost', lost, counts.lost);
    agree('pace slow', this.paceSlow, counts.paceSlow);
    agree('pace fast', this.paceFast, counts.paceFast);
    agree('pace unmeasured', this.paceUnmeasured, counts.paceUnmeasured);
    agree('coasted point-steps', coasters.reduce((sum, life) => sum + life.coasted, 0), coasted);
    agree('voids closed before their crash', before.length, closedAtPour);
    if (this.paceDiffers) checks.push(`${this.paceDiffers} points' pace or throw time differs from c_n / n_z and the step's time recomputed`);
    if (this.rayDiffers) checks.push(`${this.rayDiffers} throws' ray differs from the one recomputed on the front as it stood`);
    if (this.untilDiffers) checks.push(`${this.untilDiffers} points' jetUntil differs from touchdown + collapse`);
    if (this.coastDiffers) checks.push(`${this.coastDiffers} steps' coasting count differs from the front's`);
    if (this.anchorDiffers) checks.push(`${this.anchorDiffers} steps' anchor differs from K = S − c n by over ${CHECK} m`);
    if (this.crestDiffers) checks.push(`${this.crestDiffers} steps' drawn crest stands off its point by over ${CHECK} m`);
    if (this.zDiffers) checks.push(`${this.zDiffers} steps' z differs from jetBase + jetPace τ on the pace, the throw step included`);
    if (this.throwMoveDiffers) checks.push(`${this.throwMoveDiffers} throw steps' move differs from the clock's lag and the crest's own step`);
    if (this.crestStepDiffers) checks.push(`${this.crestStepDiffers} K steps differ from their parts`);
    out.push(`  cross-checks against the code's own counters, the loft's anchor and the pace: ${checks.length ? `DISAGREE: ${checks.join('; ')}` : 'all agree'}`);
    // The summary: the numbers the advisor asked for, in one place.
    summary.push(
      `    jets thrown ${jets.length}; resolved ${resolved}, pending ${pending.length}; crashed on their own point ${own} (${percent(own, resolved)} of the resolved; with the 2 T exits apart ${percent(own, apart)} of ${apart}; with their own curl drawn ${own - ownCovered}, ${percent(own - ownCovered, resolved)}, with the 2 T exits apart ${percent(own - ownCovered, apart)}); alone on their front at touchdown ${alone} (+ ${past} past their collapse); left at a 2 T stall ${stalled}; lost ${lost}; dropped before the crash otherwise ${dropped.length}`,
      `    held past 2 T short of touchdown ${heldPast} (the oldest uncrashed, per jet, in T: ${ninetyMedian(oldestUncrashed)}, max ${fixed(Math.max(0, ...oldestUncrashed))}); on the pace past 2 (T + collapse) ${overFade} (the longest on its pace past touchdown, per point, in T: ${ninetyMedian(pastPoints.map(onPaceT))}, max ${fixed(Math.max(0, ...pastPoints.map(onPaceT)))}); crests claimed past touchdown ${fadeClaimers.reduce((sum, life) => sum + life.fadeClaims, 0)} steps on ${fadeClaimers.length} points; fade exits ${this.fadeExits.length} (with a jet ${fadeExitJets.length}; drawn when last seen ${this.fadeExits.filter((life) => life.fadeExitDrawn).length})`,
      `    the anchor from the throw: |A − K| at most ${this.anchorWorst.toExponential(2)} m over ${this.anchorSteps} steps (over ${CHECK} m on ${this.anchorDiffers}): the hand-back's term 0; the drawn crest less its point, at most ${largest(this.crestAlongs).toExponential(2)} m along the ray and ${largest(this.crestAcrosses).toExponential(2)} m across it (over ${CHECK} m on ${this.crestDiffers} steps)`,
      `    the throw step, the drawn crest's move along the ray, m: all thrown points ${spread(this.throwMoves)}, over ${JUMP} m ${outOf(overJump(this.throwMoves), this.throwMoves.length)}; jets ${spread(this.throwMovesJets)}, over ${JUMP} m ${outOf(overJump(this.throwMovesJets), this.throwMovesJets.length)}; the clock's lag part ${spread(this.lagParts)}; the crest's own step part ${spread(this.stepParts)}; move less its parts over ${CHECK} m on ${this.throwMoveDiffers}`,
      `    2 T exits ${this.exits.length} (with a jet ${exitJets.length}; drawn when last seen ${this.exits.filter((life) => life.exitDrawn).length}); points joined past their throw ${lateJoins.length} of ${thrownPoints.length} thrown points (jets ${lateJoins.filter((life) => life.thrownStep > 0).length})`,
      `    slices dropped mid-tube or mid-pour, the exits apart: ${mid.length} (${shown(mid)} drawn when last seen); voids closed at their crash ${atCrash.length} of ${jets.length - unclosed.length} closed (as a pour began ${before.length}, after the crash ${after.length})`,
      `    the gap at release, m: ${spread(this.releaseGap)} (${this.releasedCoasting} released coasting); over 1 H ${outOf(ahead + behind, this.releaseGap.length)}; back on the ordinary match the step after ${this.returned} of ${released.length} released jets`,
      `    the open window (jets): the anchor moved more than ${JUMP} m on ${aj.z + aj.landmark + aj.ray} of ${this.openMeasured} steps (largest ${fixed(aj.largest)} m; by their largest part: z ${aj.z}, landmark ${aj.landmark}, ray ${aj.ray}); the clock paused on ${outOf(this.openRates.filter((v) => v < PAUSED).length, this.openRates.length)} steps, over ${FAST} times real time on ${outOf(this.openRates.filter((v) => v > FAST).length, this.openRates.length)}; clamp hits (jets) ${this.jetPace.slow + this.jetPace.fast} (slow ${this.jetPace.slow}, fast ${this.jetPace.fast}; unmeasured ${this.jetPace.unmeasured}) of ${jets.length}`,
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
 * - with the crash, the jets and every thrown point point by point (`JetTracker`): crashed on their own point (and with
 *   the 2 T exits apart), alone on their front at touchdown, at a stall, lost or dropped, coasted, held past 2 T short of
 *   touchdown; on the pace past touchdown, its crest claims there and the fade exits; the 2 T exits; the points joined
 *   past their throw; the throw step (the drawn crest's move, split into the clock's lag and the crest's own step); the
 *   gaps at touchdown and at release; the anchor against K and the drawn crest against its point from the throw; the
 *   anchor's moves over the open window; the clock's rate there; the pace clamp's hits; the slices dropped mid-tube; the
 *   voids' closes. It checks its tallies against the crash's, the front's, the lip's and the loft's own (the definitions
 *   are on the class), and ends each case with a summary of those numbers;
 * - the case's wall and CPU time, and the load average at its start (and its end).
 * Opt-in (PROBE=1); DX (1), SEEDS (1,2), SWELLS (small,medium), SECONDS (120), CRASH (1), LOG; TRACE (0): the first n jets'
 * steps from the throw through their fade, one line a step, in LOG.trace; and every ten seconds of sea a progress line in
 * LOG.progress. All three files are emptied at the start.
 */
describe.runIf(process.env.PROBE)('Padang Padang crash probe', () => {
  it('runs each sea with and without the crash and logs what the water did', () => {
    const log = process.env.LOG ?? 'padang-crash.txt';
    writeFileSync(log, '');
    writeFileSync(`${log}.progress`, '');
    writeFileSync(`${log}.trace`, '');
    const crash = process.env.CRASH !== '0';
    const library = crash ? libraryFromBytes(readBarrelCases('padang')) : undefined;
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
