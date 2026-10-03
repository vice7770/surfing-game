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

/** How far before its handover window (s of its clock) a jet's slice is followed, so the window's first step has a step before (the probe's, provisional). */
const MARGIN = 0.1;
/**
 * A move this large in one step, m, is a jump: 15 m/s at 30 steps a second, about 2.5 times a 6 m/s crest. The jump
 * tallies split those by their largest part (the probe's threshold, provisional).
 */
const JUMP = 0.5;

/**
 * One front point as `JetTracker` followed it (the ids are unique over a run). The tube phases are the library's: before
 * the throw (τ < 0), open (to touchdown), then pouring and closing (to the end of its collapse).
 */
interface Life {
  id: number;
  /** Its tube's touchdown T (the open time) and collapse, s (the library's, as `SweptCrash` reads them). */
  touchdown: number;
  collapse: number;
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
  /** The step it first held a jet and the step it crashed it (0 until then), how it crashed, and whether it lay under an earlier front's barrel then. */
  thrownStep: number;
  crashedStep: number;
  crash: '' | 'own' | 'alone' | 'past';
  coveredAtCrash: boolean;
  /** C: the clamped crest-normal speed c_n its pace was made from, m/s; its pace along its column, c_n / n_z, m/s; and H, the wave height its jet was thrown with, m. */
  normal: number;
  pace: number;
  height: number;
  /** The solver time and the clock at its throw, and the solver time of its crash, s (0 until then). */
  thrownTime: number;
  thrownTau: number;
  crashTime: number;
  /** Its jet's strip, and the step its void closed (0 until it has): at its crash, or as its pour began (`PlungingLip.closedAtPour`). */
  strip: number;
  closeStep: number;
  /** Steps it ran on its pace with no crest in reach, and steps it stood off a drawn front, both holding an uncrashed jet. */
  coasted: number;
  alone: number;
  /** The steps in its present run of coasting, the runs it has had, and the steps its uncrashed jet, more than three open times old, claimed a crest. */
  run: number;
  episodes: number;
  lateClaims: number;
  /** Whether the blend's start and its touchdown have been read, and whether its anchor had no throw point (`throwZ` null). */
  atBlend: boolean;
  atTouchdown: boolean;
  unanchored: boolean;
  /** Its slice at the step before, in its handover window (see `Step`). */
  previous?: Step;
  /** The most its handover term reached, per second of its clock and per real second, m/s, and the steps measured inside its handover. */
  handover: number;
  realHandover: number;
  steps: number;
  /** Its place among the traced jets (0: not traced). */
  traced: number;
}

/** A jet's slice at one step of its handover window: the clock and blend, the anchor A, the crest point K, the throw point T′, the ray, and its z. */
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
  /** The profile's crest landmark along the ray from the anchor, m (K = S − c n). */
  landmark: number;
  rayX: number;
  rayZ: number;
  z: number;
  /** The claimed crest's z less the paced z, m, 0 with none claimed (z = paced + u × this, `SweptCrash`). */
  gap: number;
  claimed: boolean;
}

/**
 * What the swept crash does to its jets, followed point by point from outside (the Padang Padang spec, Part B, PR 5; the
 * advisor's rulings of 2026-10-01). After each step it reads the front's points, the crash's counters and its covered
 * test, and the lip's held strips, and checks its own tallies against the code's. The terms:
 * - **A jet** is a front point that held a strip (`jetStrip` ≥ 0) from its throw. It is **resolved** by its crash or when
 *   its point left the front for good; **pending** otherwise: uncrashed at the run's end with its point on the front or held.
 * - **Crashed on its own point:** the crash ran on its point in a drawn front (two points or more) with its tube live
 *   (`SweptCrash`'s `crashes`). That counter doesn't ask whether the point lay under an earlier front's barrel (whose
 *   curl the loft draws instead); those are counted apart. **Alone at touchdown:** its point wasn't on a drawn front at its
 *   touchdown, and the jet crashed as foreseen (`foreseen`); of those, **past their collapse** were on a drawn front with
 *   their tube over. **Dropped before the crash:** the point left the front for good (not on it, not held) uncrashed.
 * - **Coasted:** a step on which an uncrashed jet's point claimed no crest and ran on its pace (`BreakingFront.coasted`); an
 *   **episode** is a run of such steps. **The flight** is the solver time from the throw to the crash over the open time T.
 * - **On its pace** at a step: the front matched the point by its pace (`runsOnPace` before the step's clock and crash:
 *   holding its jet, and uncrashed or its clock short of `jetUntil`). Only then is its `crestZ` this step's claim: back on
 *   the ordinary match the point keeps its last one, stale.
 * - **The blend's start:** the first step after the throw with τ ≥ `jetBlend` (0.8 T). **The gap** there is the solver's
 *   crest it claimed (`crestZ`) less its paced z, `jetBase + jetPace τ`, m; none when no crest is in reach (coasting).
 *   **H** is the wave height its jet was thrown with (`jetWindow / SOURCE_REACH`: crest to trough within half a wave).
 * - **The handover** is τ from `jetBlend` to `jetBlend + LOFT.handover`, u from 0 to 1. **C** is the jet's crest speed:
 *   c_n, the clamped crest-normal speed its pace was made from (the pace along its column is c_n / n_z). The slice is
 *   the loft's (a `CrashCurve.slice` at the point's own σ, which mirrors the loft in drawing mode): **K** = S − c n is
 *   the crest point it hands over to (the loft's "C"), **T′** the throw point it leaves (the slice with the throw's
 *   anchor held), and the anchor A = T′ + u (K − T′), which is checked.
 * - **The anchor's extra speed** is the handover's own term |K − T′| / `LOFT.handover`: the loft's own anchor motion
 *   while it hands over (`sliceAnchorVX`), on top of its following motion (1 − u) dT′/dt + u dK/dt, per second of the
 *   slice's clock, at each step with 0 < u < 1. **Per real second** it is |Δu (K₀ − T′₀)| / Δt over each step the
 *   handover moves in (u₀ < 1, u₁ > 0: the step completing it counts), the clock's own rate included. Over a step the
 *   anchor's move is exactly Δu (K₀ − T′₀) (the handover's) + u₁ ΔK + (1 − u₁) ΔT′ (its following), and K's is Δz along
 *   z − Δc n₁ − c₀ Δn (the point's z, the profile's crest landmark c, the ray n turning as its front bends).
 * - **The point's z beyond its pace** over a step is Δz − pace Δt, exactly pace (Δτ − Δt) (the clock's rate) + Δu g₀
 *   (the blend closing the gap) + u₁ (g₁ − g₀) (the claimed crest's own moves, a claim lost or regained included), g
 *   the gap (0 unclaimed): z = paced + u g. Each is checked. A crashed jet whose clock passes `jetUntil` keeps the z the
 *   front advanced it to for that step (`SweptCrash` blends only short of `jetUntil`), and goes back to the ordinary
 *   match the next: the gap it was left at then (the crest it claimed less its z) is given apart.
 * - **A slice dropped mid-tube** is a point that left the front for good while its tube was open or pouring (0 ≤ τ <
 *   touchdown + collapse); one before its throw is counted apart. A **flicker** is a point unseen for a while that came back.
 * - **A void closed as its pour began** (`PlungingLip.closedAtPour`): its first parcel left before its crash. `holdJet`
 *   times the pour from the lip's clock, which steps after the crash, so a slice clock at real time pours one step before
 *   its crash: the lag in steps is given.
 */
class JetTracker {
  private readonly lives = new Map<number, Life>();
  /** Jets whose void hasn't closed yet, followed each step whether their point is on the front or not. */
  private open: Life[] = [];
  private readonly curve: CrashCurve;
  private readonly slice = createCrashSlice();
  private readonly held = createCrashSlice();
  private readonly slope: number;
  private readonly heightAt: (x: number, z: number) => number;
  private step = 0;
  private coastedBefore = 0;
  private tracing = 0;
  /** This step's front points, and `SweptCrash`'s runs as [start, end) per point (−1 outside). */
  private points: readonly FrontPoint[] = [];
  private starts = new Int32Array(0);
  private ends = new Int32Array(0);
  /** Pace tallies from the throws (to check `SweptCrash`'s counters), the measured crest speed over the long-wave speed, and the rays' z parts. */
  paceSlow = 0;
  paceFast = 0;
  paceUnmeasured = 0;
  readonly speedRatio: number[] = [];
  readonly rayZs: number[] = [];
  /** Disagreements with the code's own numbers (see `report`). */
  paceDiffers = 0;
  blendDiffers = 0;
  coastDiffers = 0;
  anchorDiffers = 0;
  zDiffers = 0;
  anchorStepDiffers = 0;
  crestStepDiffers = 0;
  /** Handover steps off the pace (none should be: inside the window its clock is short of `jetUntil`), and readings at the blend's start or touchdown off it (a jet crashed at its throw). */
  staleInside = 0;
  offPaceAtBlend = 0;
  /** The gap at the blend's start (m, over H, the u it was read at) and at touchdown, and those with no crest in reach. */
  readonly blendGap: number[] = [];
  readonly blendGapOverH: number[] = [];
  readonly blendHeights: number[] = [];
  readonly blendU: number[] = [];
  noCrestAtBlend = 0;
  readonly landGap: number[] = [];
  readonly landGapOverH: number[] = [];
  noCrestAtLanding = 0;
  /**
   * Per handover step (0 < u < 1, on a drawn front): the handover term (m/s per second of the clock) and over C, over the
   * pace, for the anchored jets and for all (zeros for the jets with no throw point). Per step the handover moves in (u₀ <
   * 1 and u₁ > 0, its completing step included) with a step before: the term per real second over C, the drawn anchor's
   * speed and K's over C, and the clock's rate.
   */
  readonly terms: number[] = [];
  readonly termShares: number[] = [];
  readonly anchoredTerms: number[] = [];
  readonly anchoredShares: number[] = [];
  readonly anchoredPaceShares: number[] = [];
  readonly realShares: number[] = [];
  readonly anchorShares: number[] = [];
  readonly crestPointShares: number[] = [];
  readonly aboveShares: number[] = [];
  readonly clockRates: number[] = [];
  /**
   * Per handover step with a step before: the point's z beyond its pace, m (its z blended, `unblended` the completing
   * steps of crashed jets, whose z the front advanced), and the claimed crest's own step, crestZ₁ − crestZ₀, m (both
   * steps claiming). At the step a crashed jet's clock passes `jetUntil` ('last'), the crest it claimed less its z, m,
   * the gap its blend left; and how many were back on the ordinary match the step after.
   */
  readonly beyond: number[] = [];
  readonly crestMoves: number[] = [];
  unblended = 0;
  readonly residuals: number[] = [];
  returned = 0;
  /** Handover steps whose move passed JUMP, m, by which part was largest: the anchor's, K's and the point's z beyond its pace. */
  readonly anchorJumps = { handover: 0, crestPoint: 0, throwPoint: 0, largest: 0 };
  readonly crestPointJumps = { z: 0, landmark: 0, ray: 0, largest: 0 };
  readonly zJumps = { clock: 0, blend: 0, crest: 0, largest: 0, claimChanged: 0 };
  /** How many steps each finished run of coasting lasted. */
  readonly episodeLengths: number[] = [];
  /** Handover steps on a point off a drawn front, which has no slice to measure. */
  unmeasuredHandover = 0;
  /** Unseen points that came back: how long, s, and whether mid-tube. */
  readonly flickers: { seconds: number; midTube: boolean }[] = [];
  /** The first `trace` jets' handover windows, one line a step (see the probe's `TRACE`). */
  readonly traceLines: string[] = [];

  /** `cell`: the fine zone's cell, m (the solver's crest rows are this far apart). */
  constructor(private readonly simulation: SurfZoneSimulation, private readonly library: ProfileLibrary, private readonly cell: number, private readonly trace = 0) {
    this.slope = BARREL_SLOPE.padang as number;
    this.curve = new CrashCurve(library, this.slope);
    const { solver } = simulation;
    this.heightAt = (x, z) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
  }

  /** After a step: follow every point on the front, and every jet's void. */
  observe(): void {
    const { front, solver, crash, lip } = this.simulation;
    const points = front!.points;
    this.points = points;
    // SweptCrash's covered test for this step's points (private: read as the crash left it), and the lip's held strips.
    const covered = crash!['covered'];
    const strips = lip['strips'];
    const time = solver.time;
    this.step += 1;
    const { step } = this;
    this.findRuns(points);
    let coastedHere = 0;
    for (let k = 0; k < points.length; k += 1) {
      const p = points[k];
      let life = this.lives.get(p.id);
      if (!life) {
        life = this.born(p, step);
        this.lives.set(p.id, life);
      } else if (life.lastStep < step - 1) {
        this.flickers.push({ seconds: time - life.lastTime, midTube: life.lastTau >= 0 && life.lastTau < life.touchdown + life.collapse });
      }
      const drawn = this.starts[k] >= 0;
      const isCovered = drawn && covered[k] === 1;
      // At this step's front update (before its clock, throw and crash): did the front match it by its pace (`runsOnPace`)?
      // Its clock then was the one it was last seen with; a crash this step is found below.
      const crashedBefore = life.crashedStep > 0;
      const holding = life.thrownStep > 0 && !crashedBefore;
      const onPace = life.thrownStep > 0 && p.jetPace !== undefined && p.jetWindow !== undefined && p.jetWindow > 0
        && (!crashedBefore || (p.jetUntil !== undefined && life.lastTau < p.jetUntil));
      const claimed = onPace && p.crestZ !== undefined;
      if (holding && onPace && !claimed) {
        life.coasted += 1;
        coastedHere += 1;
        life.run += 1;
        if (life.run === 1) life.episodes += 1;
      } else if (life.run > 0) {
        this.episodeLengths.push(life.run);
        life.run = 0;
      }
      if (holding && claimed && time - life.thrownTime > 3 * life.touchdown) life.lateClaims += 1;
      if (holding && !drawn) life.alone += 1;
      if (life.thrownStep === 0 && p.jetStrip !== undefined && p.jetStrip >= 0) this.thrown(life, p, k, step);
      if (life.thrownStep > 0 && life.crashedStep === 0 && p.crashedAt !== undefined) {
        life.crashedStep = step;
        life.crashTime = time;
        life.crash = !drawn ? 'alone' : p.tau < life.touchdown + life.collapse ? 'own' : 'past';
        life.coveredAtCrash = life.crash === 'own' && isCovered;
        // A run of coasting ends with the crash.
        if (life.run > 0) {
          this.episodeLengths.push(life.run);
          life.run = 0;
        }
      }
      // Back on the ordinary match the step after its handover (crashed, its clock past `jetUntil`).
      if (crashedBefore && !onPace && life.lastOnPace && life.lastStep === step - 1) this.returned += 1;
      if (life.thrownStep > 0 && life.thrownStep < step) this.measure(life, p, k, time, drawn, step, onPace, claimed, crashedBefore);
      life.lastStep = step;
      life.lastTime = time;
      life.lastTau = p.tau;
      life.lastOnPace = onPace;
      life.drawn = drawn;
      life.covered = isCovered;
      life.jetStrip = p.jetStrip;
    }
    const coasted = front!.coasted - this.coastedBefore;
    this.coastedBefore = front!.coasted;
    if (coasted !== coastedHere) this.coastDiffers += 1;
    // The voids: the step each closed, at its crash or as its pour began.
    let closed = false;
    for (const life of this.open) {
      const tube = strips.get(life.strip)?.tube;
      if (tube && !Number.isNaN(tube.closedAt)) {
        life.closeStep = step;
        closed = true;
      }
    }
    if (closed) this.open = this.open.filter((life) => life.closeStep === 0);
  }

  /** The point's first sighting. */
  private born(p: FrontPoint, step: number): Life {
    const times = this.library.profileTimes({ slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth });
    return {
      id: p.id, touchdown: times.touchdownSeconds, collapse: times.collapseSeconds, lastStep: step, lastTime: 0, lastTau: p.tau, lastOnPace: false,
      drawn: false, covered: false, jetStrip: p.jetStrip, thrownStep: 0, crashedStep: 0, crash: '', coveredAtCrash: false,
      normal: 0, pace: 0, height: 0, thrownTime: 0, thrownTau: 0, crashTime: 0, strip: -1, closeStep: 0, coasted: 0, alone: 0,
      run: 0, episodes: 0, lateClaims: 0, atBlend: false, atTouchdown: false, unanchored: false, handover: 0, realHandover: 0,
      steps: 0, traced: 0,
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

  /** The step a point first holds its jet: its pace from the throw, as `SweptCrash.throwJet` makes it, checked against the point's. */
  private thrown(life: Life, p: FrontPoint, k: number, step: number): void {
    life.thrownStep = step;
    life.thrownTime = this.simulation.solver.time;
    life.thrownTau = p.tau;
    life.height = (p.jetWindow ?? 0) / SOURCE_REACH;
    life.strip = p.jetStrip!;
    life.pace = p.jetPace ?? Number.NaN;
    this.open.push(life);
    if (this.tracing < this.trace) {
      this.tracing += 1;
      life.traced = this.tracing;
    }
    const wave = Math.sqrt(GRAVITY * Math.max(0, p.crestDepth + p.height));
    const measured = p.crestSpeed !== undefined && p.crestSpeed > 0;
    let normal = measured ? p.crestSpeed! : wave;
    if (!measured) this.paceUnmeasured += 1;
    else {
      this.speedRatio.push(p.crestSpeed! / wave);
      if (normal < PACE.slowest * wave) {
        normal = PACE.slowest * wave;
        this.paceSlow += 1;
      } else if (normal > PACE.fastest * wave) {
        normal = PACE.fastest * wave;
        this.paceFast += 1;
      }
    }
    life.normal = normal;
    if (this.starts[k] < 0) {
      this.paceDiffers += 1;
      return;
    }
    const s = this.curve.slice(this.points, this.starts[k], this.ends[k], k, this.simulation.solver.restLevel, this.heightAt, this.slice);
    this.rayZs.push(s.rayZ);
    const pace = normal / Math.max(PACE.leastRayZ, s.rayZ);
    if (!(Math.abs(pace - (p.jetPace ?? Number.NaN)) <= 1e-9 * Math.max(1, pace))) this.paceDiffers += 1;
    if (!(Math.abs((p.jetBlend ?? Number.NaN) - LOFT.handoverStart * s.touchdown) <= 1e-9) || !(Math.abs((p.jetUntil ?? Number.NaN) - ((p.jetBlend ?? 0) + LOFT.handover)) <= 1e-9)) {
      this.blendDiffers += 1;
    }
    if (life.traced) {
      this.traceLines.push(
        `# jet ${life.traced} (point ${life.id}): thrown at step ${step} (τ ${fixed(p.tau, 3)} s), H ${fixed(life.height)} m, C = c_n ${fixed(normal)} m/s, n_z ${fixed(s.rayZ)}, pace ${fixed(p.jetPace ?? Number.NaN)} m/s, `
        + `T ${fixed(s.touchdown)} s, blend from τ ${fixed(p.jetBlend ?? Number.NaN)} s to ${fixed(p.jetUntil ?? Number.NaN)} s; throw point ${p.throwZ === null ? 'none (anchor on K)' : 'yes'}`,
        '# mode: pace (claimed a crest, z blended), coast (on its pace, none in reach), last (crashed, its clock past jetUntil this step: z the front\'s advance), match (back on the ordinary match: its crestZ is stale), off (not on a drawn front: no slice)',
        '# jet  step  τ  τ/T  u  mode  gap(m)  z−paced(m)  Δz−pace·Δt(m) = clock + blend + crest  term/C  real/C  |v_A|/C  |v_K|/C  clock rate',
      );
    }
  }

  /** A jet's point on a step after its throw: the gaps, and the handover. */
  private measure(life: Life, p: FrontPoint, k: number, time: number, drawn: boolean, step: number, onPace: boolean, claimed: boolean, crashedBefore: boolean): void {
    if (p.jetBase === undefined || p.jetPace === undefined || p.jetBlend === undefined || p.jetUntil === undefined) return;
    // The gap: the crest it claimed this step, less where its pace puts it.
    const paced = p.jetBase + p.jetPace * p.tau;
    // Read where the front still matches it by its pace: off it (a jet crashed at its throw, its clock past `jetUntil`),
    // its crestZ would be stale.
    if (!life.atBlend && p.tau >= p.jetBlend) {
      life.atBlend = true;
      if (!onPace) this.offPaceAtBlend += 1;
      else if (!claimed) this.noCrestAtBlend += 1;
      else {
        this.blendGap.push(p.crestZ! - paced);
        this.blendGapOverH.push((p.crestZ! - paced) / life.height);
        this.blendHeights.push(life.height);
        this.blendU.push(Math.min(1, Math.max(0, (p.tau - p.jetBlend) / LOFT.handover)));
      }
    }
    if (!life.atTouchdown && p.tau >= life.touchdown) {
      life.atTouchdown = true;
      if (!onPace) this.offPaceAtBlend += 1;
      else if (!claimed) this.noCrestAtLanding += 1;
      else {
        this.landGap.push(p.crestZ! - paced);
        this.landGapOverH.push((p.crestZ! - paced) / life.height);
      }
    }
    // The handover: followed on the slice from a little before its window, for a step before its first, to the step that
    // completes it (u reaching 1, however far its clock stepped), and a little after for the trace.
    const u = Math.min(1, Math.max(0, (p.tau - p.jetBlend) / LOFT.handover));
    const before = life.previous;
    const completes = before !== undefined && before.step === step - 1 && before.u < 1;
    if (!(p.tau > p.jetBlend - MARGIN && (p.tau < p.jetUntil + MARGIN || completes))) {
      life.previous = undefined;
      return;
    }
    const inside = u > 0 && u < 1;
    // Inside the window the front matches it by its pace (its clock short of `jetUntil`), so its claim is this step's.
    if (inside && !onPace) this.staleInside += 1;
    // Its z is the blend `SweptCrash` sets, paced + u × gap, unless it crashed and its clock passed `jetUntil` this step:
    // then the front kept it on its pace, but its z stays where the front advanced it ('last').
    const blended = onPace && (!crashedBefore || (claimed && p.tau < p.jetUntil));
    const mode = !onPace ? 'match' : !blended ? 'last' : claimed ? 'pace' : 'coast';
    if (mode === 'last' && claimed) this.residuals.push(p.crestZ! - p.z);
    if (!drawn) {
      if (inside) this.unmeasuredHandover += 1;
      life.previous = undefined;
      this.traceRow(life, step, p, u, 'off', paced, claimed);
      return;
    }
    const { points } = this;
    const { solver } = this.simulation;
    const s = this.curve.slice(points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.slice);
    const t = this.curve.slice(points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.held, { throwAnchor: true });
    const landmark = (s.crestX - s.anchorX) * s.rayX + (s.crestZ - s.anchorZ) * s.rayZ;
    const kx = p.x - landmark * s.rayX;
    const kz = p.z - landmark * s.rayZ;
    // The anchor as the loft places it: T′ + u (K − T′).
    if (Math.hypot(t.anchorX + u * (kx - t.anchorX) - s.anchorX, t.anchorZ + u * (kz - t.anchorZ) - s.anchorZ) > 1e-6) this.anchorDiffers += 1;
    const gap = claimed ? p.crestZ! - paced : 0;
    // On its pace its z is the blend `SweptCrash` sets: paced + u × gap (paced alone while it coasts).
    if (blended && Math.abs(p.z - (paced + u * gap)) > 1e-6) this.zDiffers += 1;
    const distance = Math.hypot(kx - t.anchorX, kz - t.anchorZ);
    const term = distance / LOFT.handover;
    life.previous = {
      step, time, tau: p.tau, u, ax: s.anchorX, az: s.anchorZ, kx, kz, tx: t.anchorX, tz: t.anchorZ, landmark, rayX: s.rayX, rayZ: s.rayZ,
      z: p.z, gap, claimed,
    };
    if (inside) {
      if (p.throwZ === null) life.unanchored = true;
      else {
        this.anchoredTerms.push(term);
        this.anchoredShares.push(term / life.normal);
        this.anchoredPaceShares.push(term / life.pace);
      }
      this.terms.push(term);
      this.termShares.push(term / life.normal);
      life.handover = Math.max(life.handover, term);
      life.steps += 1;
    }
    let real = Number.NaN;
    let va = Number.NaN;
    let vk = Number.NaN;
    let rate = Number.NaN;
    let zBeyond = Number.NaN;
    let clockPart = Number.NaN;
    let blendPart = Number.NaN;
    let crestPart = Number.NaN;
    if (completes && u > 0) {
      const dt = time - before.time;
      const du = u - before.u;
      rate = (p.tau - before.tau) / dt;
      // The anchor's move over the step: the handover's Δu (K₀ − T′₀), and its following u₁ ΔK + (1 − u₁) ΔT′.
      const hx = du * (before.kx - before.tx);
      const hz = du * (before.kz - before.tz);
      const fkx = u * (kx - before.kx);
      const fkz = u * (kz - before.kz);
      const ftx = (1 - u) * (t.anchorX - before.tx);
      const ftz = (1 - u) * (t.anchorZ - before.tz);
      const dax = s.anchorX - before.ax;
      const daz = s.anchorZ - before.az;
      if (Math.hypot(hx + fkx + ftx - dax, hz + fkz + ftz - daz) > 1e-6) this.anchorStepDiffers += 1;
      const handoverMove = Math.hypot(hx, hz);
      real = handoverMove / dt;
      va = Math.hypot(dax, daz) / dt;
      vk = Math.hypot(kx - before.kx, kz - before.kz) / dt;
      if (p.throwZ !== null) this.realShares.push(real / life.normal);
      life.realHandover = Math.max(life.realHandover, real);
      this.anchorShares.push(va / life.normal);
      this.crestPointShares.push(vk / life.normal);
      this.aboveShares.push((va - vk) / life.normal);
      this.clockRates.push(rate);
      const moves = [handoverMove, Math.hypot(fkx, fkz), Math.hypot(ftx, ftz)];
      if (Math.hypot(dax, daz) > JUMP) {
        this.anchorJumps.largest = Math.max(this.anchorJumps.largest, Math.hypot(dax, daz));
        const most = moves.indexOf(Math.max(...moves));
        if (most === 0) this.anchorJumps.handover += 1;
        else if (most === 1) this.anchorJumps.crestPoint += 1;
        else this.anchorJumps.throwPoint += 1;
      }
      // K's move: the point's z, the crest landmark's advance along the ray, and the ray turning (x stays on its column).
      const dz = p.z - before.z;
      const dc = landmark - before.landmark;
      const crestDx = -dc * s.rayX - before.landmark * (s.rayX - before.rayX);
      const crestDz = dz - dc * s.rayZ - before.landmark * (s.rayZ - before.rayZ);
      if (Math.hypot(crestDx - (kx - before.kx), crestDz - (kz - before.kz)) > 1e-6) this.crestStepDiffers += 1;
      const kMove = Math.hypot(kx - before.kx, kz - before.kz);
      if (kMove > JUMP) {
        this.crestPointJumps.largest = Math.max(this.crestPointJumps.largest, kMove);
        const parts = [Math.abs(dz), Math.abs(dc), Math.abs(before.landmark) * Math.hypot(s.rayX - before.rayX, s.rayZ - before.rayZ)];
        const most = parts.indexOf(Math.max(...parts));
        if (most === 0) this.crestPointJumps.z += 1;
        else if (most === 1) this.crestPointJumps.landmark += 1;
        else this.crestPointJumps.ray += 1;
      }
      // The point's z beyond its pace: the clock's rate, the blend closing the gap, and the claimed crest's own moves.
      zBeyond = dz - p.jetPace * dt;
      // The claimed crest's own step: crestZ₁ − crestZ₀, with crestZ = paced + gap.
      if (claimed && before.claimed) this.crestMoves.push(gap - before.gap + p.jetPace * (p.tau - before.tau));
      if (!blended) this.unblended += 1;
      else {
        clockPart = p.jetPace * (p.tau - before.tau - dt);
        blendPart = du * before.gap;
        crestPart = u * (gap - before.gap);
        if (Math.abs(clockPart + blendPart + crestPart - zBeyond) > 1e-6) this.zDiffers += 1;
        this.beyond.push(zBeyond);
      }
      if (blended && Math.abs(zBeyond) > JUMP) {
        this.zJumps.largest = Math.max(this.zJumps.largest, Math.abs(zBeyond));
        if (claimed !== before.claimed) this.zJumps.claimChanged += 1;
        const parts = [Math.abs(clockPart), Math.abs(blendPart), Math.abs(crestPart)];
        const most = parts.indexOf(Math.max(...parts));
        if (most === 0) this.zJumps.clock += 1;
        else if (most === 1) this.zJumps.blend += 1;
        else this.zJumps.crest += 1;
      }
    }
    this.traceRow(life, step, p, u, mode, paced, claimed, {
      zBeyond, clockPart, blendPart, crestPart, term: inside ? term : Number.NaN, real, va, vk, rate,
    });
  }

  /** A traced jet's line at a step of its handover window (fields it couldn't measure are '-'). */
  private traceRow(
    life: Life, step: number, p: FrontPoint, u: number, mode: string, paced: number, claimed: boolean,
    m: { zBeyond: number; clockPart: number; blendPart: number; crestPart: number; term: number; real: number; va: number; vk: number; rate: number } = {
      zBeyond: Number.NaN, clockPart: Number.NaN, blendPart: Number.NaN, crestPart: Number.NaN, term: Number.NaN, real: Number.NaN, va: Number.NaN, vk: Number.NaN, rate: Number.NaN,
    },
  ): void {
    if (!life.traced) return;
    const c = life.normal;
    this.traceLines.push([
      life.traced, step, fixed(p.tau, 3), fixed(p.tau / life.touchdown), fixed(u), mode, claimed ? fixed(p.crestZ! - paced) : '-', fixed(p.z - paced),
      `${fixed(m.zBeyond)} = ${fixed(m.clockPart)} + ${fixed(m.blendPart)} + ${fixed(m.crestPart)}`,
      fixed(m.term / c), fixed(m.real / c), fixed(m.va / c), fixed(m.vk / c), fixed(m.rate),
    ].join('  '));
  }

  /** The tallies at the run's end, against the crash's, the front's and the lip's own; and the summary lines. */
  report(counts: Record<string, number>, coasted: number, closedAtPour: number, summary: string[]): string[] {
    const { front } = this.simulation;
    const held = new Set(front!.exportState().held.map((p) => p.id));
    const lives = [...this.lives.values()];
    const gone = (life: Life) => life.lastStep < this.step && !held.has(life.id);
    const jets = lives.filter((life) => life.thrownStep > 0);
    const owners = jets.filter((life) => life.crash === 'own');
    const own = owners.length;
    const ownCovered = owners.filter((life) => life.coveredAtCrash).length;
    const alone = jets.filter((life) => life.crash === 'alone').length;
    const past = jets.filter((life) => life.crash === 'past').length;
    const dropped = jets.filter((life) => life.crashedStep === 0 && gone(life));
    const pending = jets.filter((life) => life.crashedStep === 0 && !gone(life));
    const resolved = own + alone + past + dropped.length;
    const coasters = jets.filter((life) => life.coasted > 0);
    const outcome = (life: Life) => life.crash || (gone(life) ? 'dropped' : 'pending');
    const outcomes = (list: Life[]) => ['own', 'alone', 'past', 'dropped', 'pending'].map((name) => `${name} ${list.filter((life) => outcome(life) === name).length}`).join(', ');
    const now = this.simulation.solver.time;
    const out: string[] = [];
    out.push(`  jets: ${jets.length} thrown; ${resolved} resolved, ${pending.length} pending at the run's end (uncrashed, their point still on the front or held)`);
    out.push(`    crashed on their own point: ${own} (${percent(own, resolved)} of the resolved, ${percent(own, jets.length)} of the thrown); of them under an earlier front's barrel at their crash (its curl drawn instead): ${ownCovered}`);
    out.push(`    alone on their front at touchdown (not on a drawn front): ${alone}, and past their collapse on a drawn front: ${past} (together ${percent(alone + past, resolved)} of the resolved)`);
    out.push(`    dropped before the crash (the point left the front first): ${dropped.length} (${percent(dropped.length, resolved)} of the resolved)`);
    if (dropped.length) {
      out.push(`      those left at ${quantiles(dropped.map((life) => life.lastTau / life.touchdown))} of the open time; their H ${spread(dropped.map((life) => life.height))} m`);
    }
    if (pending.length) {
      const oldest = [...pending].sort((a, b) => a.thrownTime - b.thrownTime).slice(0, 12);
      out.push(`    the pending, oldest first (age since the throw, s / τ over T / τ gained since the throw, s / steps coasted / coasting at the end): ${oldest.map((life) => `${(now - life.thrownTime).toFixed(1)} / ${(life.lastTau / life.touchdown).toFixed(2)} / ${(life.lastTau - life.thrownTau).toFixed(2)} / ${life.coasted} / ${life.run > 0 ? 'yes' : 'no'}`).join('; ')}`);
    }
    out.push(`    jets off a drawn front at some step before their crash: ${jets.filter((life) => life.alone > 0).length}; steps off, of the ${alone} alone at touchdown: ${spread(jets.filter((life) => life.crash === 'alone').map((life) => life.alone), 0)}`);
    out.push(`    coasted (ran on the pace with no crest in reach): ${outOf(coasters.length, jets.length)} jets, ${coasters.reduce((sum, life) => sum + life.coasted, 0)} point-steps (the front's counter ${coasted}); steps per coasting jet ${spread(coasters.map((life) => life.coasted), 0)}; their outcomes: ${outcomes(coasters)}`);
    const lengths = [...this.episodeLengths, ...jets.filter((life) => life.crashedStep === 0 && life.run > 0).map((life) => life.run)];
    out.push(`    coasting episodes (runs of steps): ${lengths.length}, ${lengths.filter((n) => n > 30).length} longer than a second, ${pending.filter((life) => life.run > 0).length} still coasting at the end; steps per episode ${spread(lengths, 0)}`);
    const claimers = jets.filter((life) => life.lateClaims > 0);
    out.push(`    steps on which an uncrashed jet more than three open times old claimed a crest: ${claimers.reduce((sum, life) => sum + life.lateClaims, 0)}, on ${claimers.length} jets`);
    const crashed = jets.filter((life) => life.crashedStep > 0);
    const flights = crashed.map((life) => (life.crashTime - life.thrownTime) / life.touchdown);
    out.push(`    the flight, the solver time from the throw to the crash over the open time T: ${spread(flights)}; more than 1.5 T: ${flights.filter((v) => v > 1.5).length} of ${flights.length}`);
    // The voids closed as their pour began.
    const poured = jets.filter((life) => life.closeStep > 0 && (life.crashedStep === 0 || life.closeStep < life.crashedStep));
    const lags = poured.filter((life) => life.crashedStep > 0).map((life) => life.crashedStep - life.closeStep);
    const unclosed = jets.filter((life) => life.closeStep === 0).length;
    out.push(`    voids closed as their pour began (PlungingLip.closedAtPour ${closedAtPour}): ${poured.length}; of them crashed ${lags.length} steps later: 1 step ${lags.filter((n) => n === 1).length} (holdJet's pour, timed on the lip's clock before its step, leads a crash at real time by one), 2–3 steps ${lags.filter((n) => n >= 2 && n <= 3).length}, 4 or more ${lags.filter((n) => n >= 4).length} (the clock behind the foresight); lag ${spread(lags, 0)}; not crashed by the end ${poured.length - lags.length}; voids still open at the end ${unclosed}`);
    out.push(`    the rays' z part n_z at the throws ${spread(this.rayZs)}; C (c_n) of the jets ${spread(jets.map((life) => life.normal))} m/s; their pace c_n / n_z ${spread(jets.map((life) => life.pace))} m/s`);
    // The gap.
    const ahead = this.blendGapOverH.filter((g) => g > 1).length;
    const behind = this.blendGapOverH.filter((g) => g < -1).length;
    out.push(`  the gap at the blend's start (the solver's crest z − the paced z, the first step at τ ≥ 0.8 T), ${this.blendGap.length} jets (${this.noCrestAtBlend} more with no crest in reach; readings off the pace, at the blend's start or touchdown, skipped: ${this.offPaceAtBlend}):`);
    out.push(`    m, 10 / 50 / 90 % (signed): ${spread(this.blendGap)}`);
    out.push(`    in H, signed: ${spread(this.blendGapOverH)}`);
    out.push(`    in H, absolute: ${spread(this.blendGapOverH.map(Math.abs))}`);
    out.push(`    more than 1 H either way: ${outOf(ahead + behind, this.blendGap.length)} (${ahead} with the crest ahead of the pace, ${behind} behind); H of these jets ${spread(this.blendHeights)} m`);
    out.push(`    the u it was read at (the clock's step can pass 0.8 T): ${spread(this.blendU)}; past u 0.5 already: ${this.blendU.filter((v) => v > 0.5).length}`);
    const overLand = this.landGapOverH.filter((g) => Math.abs(g) > 1).length;
    out.push(`  the same gap at touchdown (the earlier table's reading), ${this.landGap.length} jets (${this.noCrestAtLanding} with no crest in reach): m ${spread(this.landGap)}; |gap|/H ${spread(this.landGapOverH.map(Math.abs))}; over 1 H: ${outOf(overLand, this.landGap.length)}`);
    // The handover.
    const measured = jets.filter((life) => life.steps > 0);
    const anchored = measured.filter((life) => !life.unanchored);
    const anchoredMost = anchored.map((life) => life.handover);
    const anchoredMostShares = anchored.map((life) => life.handover / life.normal);
    out.push(`  the anchor in the handover (C = c_n; K = S − c n the crest point, T′ the throw point, A = T′ + u (K − T′)): ${this.terms.length} steps on ${measured.length} jets on a drawn front (${this.unmeasuredHandover} more steps off one, unmeasured); ${measured.length - anchored.length} of the jets had no throw point (the anchor on K all along: term 0)`);
    out.push(`    the anchor's extra speed, the handover's own term |K − T′| / ${LOFT.handover} s (per second of the slice's clock), on the ${anchored.length} jets with a throw point:`);
    out.push(`      per handover step, m/s: ${spread(this.anchoredTerms)}; over C: ${spread(this.anchoredShares)}; over 0.5 C on ${outOf(this.anchoredShares.filter((v) => v > 0.5).length, this.anchoredShares.length)} steps`);
    out.push(`      per jet, its largest, m/s: ${spread(anchoredMost)}; over C: ${spread(anchoredMostShares)}; over 0.5 C at some step on ${outOf(anchoredMostShares.filter((v) => v > 0.5).length, anchoredMostShares.length)} jets`);
    out.push(`      over the pace along the column (c_n / n_z) instead of C, per step: ${spread(this.anchoredPaceShares)}`);
    out.push(`      as a distance |K − T′|, m, per step: ${spread(this.anchoredTerms.map((v) => v * LOFT.handover))}; the handover time that would hold the term to 0.5 C (that distance over 0.5 C), s: ${spread(this.anchoredShares.map((v) => (v * LOFT.handover) / 0.5))}`);
    out.push(`    per real second, |Δu (K₀ − T′₀)| / Δt over each step the handover moves in (u₀ < 1, u₁ > 0, the clock's own rate in it), over C, per step: ${spread(this.realShares)}; over 0.5 C on ${outOf(this.realShares.filter((v) => v > 0.5).length, this.realShares.length)} steps; per jet, its largest: ${spread(anchored.map((life) => life.realHandover / life.normal))}`);
    out.push(`    with the ${measured.length - anchored.length} jets with no throw point (term 0), per step, m/s: ${spread(this.terms)}; over C: ${spread(this.termShares)}; per jet, its largest, over C: ${spread(measured.map((life) => life.handover / life.normal))}`);
    out.push(`    over those steps (finite differences): the drawn anchor's speed |v_A| over C ${spread(this.anchorShares)}; K's |v_K| ${spread(this.crestPointShares)}; the anchor's speed above K's, |v_A| − |v_K| ${spread(this.aboveShares)}`);
    const aj = this.anchorJumps;
    const kj = this.crestPointJumps;
    const zj = this.zJumps;
    out.push(`    handover steps whose anchor moved more than ${JUMP} m: ${aj.handover + aj.crestPoint + aj.throwPoint} of ${this.anchorShares.length} (largest ${fixed(aj.largest)} m); the largest part: the handover's Δu (K₀ − T′₀) ${aj.handover}, its following u₁ ΔK ${aj.crestPoint}, (1 − u₁) ΔT′ ${aj.throwPoint}`);
    out.push(`    handover steps whose K moved more than ${JUMP} m: ${kj.z + kj.landmark + kj.ray} (largest ${fixed(kj.largest)} m); the largest part: the point's z ${kj.z}, the crest landmark's advance ${kj.landmark}, the ray turning (c₀ Δn) ${kj.ray}`);
    out.push(`    the point's z beyond its pace in those steps, its z blended, m: ${spread(this.beyond)}; more than ${JUMP} m on ${zj.clock + zj.blend + zj.crest} steps (largest ${fixed(zj.largest)} m; a claim lost or regained on ${zj.claimChanged}); the largest part: the clock's rate ${zj.clock}, the blend closing the gap ${zj.blend}, the claimed crest's moves × u ${zj.crest}; completing steps of crashed jets, z left at the front's advance: ${this.unblended}`);
    out.push(`    crashed jets at the step their clock passed jetUntil, their z the front's advance: the crest they claimed less their z (the gap the blend left), m: ${spread(this.residuals)}; over ${JUMP} m either way: ${this.residuals.filter((v) => Math.abs(v) > JUMP).length} of ${this.residuals.length}; back on the ordinary match the step after: ${this.returned}`);
    const cells = this.crestMoves.map((move) => Math.round(Math.abs(move) / this.cell));
    out.push(`    the claimed crest's own step (its solver cell's row), m: ${spread(this.crestMoves)}; in ${this.cell} m cells: none ${cells.filter((n) => n === 0).length}, one ${cells.filter((n) => n === 1).length}, two or more ${cells.filter((n) => n >= 2).length} (most ${cells.length ? Math.max(...cells) : 0})`);
    out.push(`    the clock's rate (τ gained over the step's time): ${spread(this.clockRates)}; paused on ${this.clockRates.filter((v) => v < 0.05).length} of ${this.clockRates.length} steps, more than twice real time on ${this.clockRates.filter((v) => v > 2).length}`);
    // The clamp.
    out.push(`  the pace clamp (0.5–1.5 × √(g (h + η)) on c_n): ${this.paceSlow} slow, ${this.paceFast} fast, ${this.paceUnmeasured} unmeasured (long-wave speed used) of ${jets.length} jets; measured crest speed over √(g (h + η)): ${spread(this.speedRatio)}`);
    // The slices dropped.
    const left = lives.filter(gone);
    const phase = (life: Life) => (life.lastTau < 0 ? 'before' : life.lastTau < life.touchdown ? (life.thrownStep > 0 && life.crashedStep === 0 ? 'jet' : 'open') : life.lastTau < life.touchdown + life.collapse ? 'pour' : 'over');
    const by = (name: string) => left.filter((life) => phase(life) === name);
    const shown = (list: Life[]) => list.filter((life) => life.drawn && !life.covered).length;
    const mid = [...by('jet'), ...by('open'), ...by('pour')];
    const open = by('open');
    out.push(`  slices dropped mid-tube (the point left the front for good, 0 ≤ τ < touchdown + collapse): ${mid.length}; drawn when last seen (on a drawn front, not under an earlier front's barrel): ${shown(mid)}`);
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
    agree('pace slow', this.paceSlow, counts.paceSlow);
    agree('pace fast', this.paceFast, counts.paceFast);
    agree('pace unmeasured', this.paceUnmeasured, counts.paceUnmeasured);
    agree('coasted point-steps', coasters.reduce((sum, life) => sum + life.coasted, 0), coasted);
    agree('voids closed as their pour began', poured.length, closedAtPour);
    if (this.paceDiffers) checks.push(`${this.paceDiffers} jets' pace differs from c_n / n_z recomputed`);
    if (this.blendDiffers) checks.push(`${this.blendDiffers} jets' blend window differs from 0.8 T + ${LOFT.handover} s`);
    if (this.coastDiffers) checks.push(`${this.coastDiffers} steps' coasting count differs from the front's`);
    if (this.anchorDiffers) checks.push(`${this.anchorDiffers} handover steps' anchor differs from T′ + u (K − T′)`);
    if (this.zDiffers) checks.push(`${this.zDiffers} handover steps' z differs from paced + u × gap, or its step from its parts`);
    if (this.anchorStepDiffers) checks.push(`${this.anchorStepDiffers} anchor steps differ from their parts`);
    if (this.crestStepDiffers) checks.push(`${this.crestStepDiffers} K steps differ from their parts`);
    if (this.staleInside) checks.push(`${this.staleInside} handover steps off the pace (a stale claim)`);
    out.push(`  cross-checks against the code's own counters, the loft's anchor and the blend: ${checks.length ? `DISAGREE: ${checks.join('; ')}` : 'all agree'}`);
    // The summary: the numbers the advisor asked for, in one place.
    const over = (values: number[], bar: number) => values.filter((v) => v > bar).length;
    summary.push(
      `    jets thrown ${jets.length}; resolved ${resolved}, pending ${pending.length}; crashed on their own point ${own} (${percent(own, resolved)} of the resolved, ${percent(own, jets.length)} of the thrown; ${ownCovered} of them under an earlier front's barrel at their crash); alone on their front at touchdown ${alone} (+ ${past} past their collapse); dropped before the crash ${dropped.length}; coasted ${coasters.length} jets, ${coasters.reduce((sum, life) => sum + life.coasted, 0)} point-steps, ${lengths.length} episodes`,
      `    gap at the blend's start, ${this.blendGap.length} jets (+ ${this.noCrestAtBlend} with no crest): ${fixed(quantile(this.blendGap, 0.1))} / ${fixed(quantile(this.blendGap, 0.5))} / ${fixed(quantile(this.blendGap, 0.9))} m; in H ${fixed(quantile(this.blendGapOverH, 0.1))} / ${fixed(quantile(this.blendGapOverH, 0.5))} / ${fixed(quantile(this.blendGapOverH, 0.9))} (|gap|/H ${fixed(quantile(this.blendGapOverH.map(Math.abs), 0.1))} / ${fixed(quantile(this.blendGapOverH.map(Math.abs), 0.5))} / ${fixed(quantile(this.blendGapOverH.map(Math.abs), 0.9))}); over 1 H ${outOf(ahead + behind, this.blendGap.length)} (${ahead} ahead, ${behind} behind)`,
      `    anchor's extra speed (|K − T′| / 0.3 s), ${anchored.length} jets with a throw point (+ ${measured.length - anchored.length} without, term 0): 90th percentile per handover step ${fixed(quantile(this.anchoredTerms, 0.9))} m/s = ${fixed(quantile(this.anchoredShares, 0.9))} C (median ${fixed(quantile(this.anchoredTerms, 0.5))} m/s = ${fixed(quantile(this.anchoredShares, 0.5))} C, n ${this.anchoredTerms.length}); per jet (its largest) ${fixed(quantile(anchoredMost, 0.9))} m/s = ${fixed(quantile(anchoredMostShares, 0.9))} C (median ${fixed(quantile(anchoredMost, 0.5))} m/s = ${fixed(quantile(anchoredMostShares, 0.5))} C); over 0.5 C on ${outOf(over(this.anchoredShares, 0.5), this.anchoredShares.length)} steps and ${outOf(over(anchoredMostShares, 0.5), anchoredMostShares.length)} jets; per real second, 90th percentile per step ${fixed(quantile(this.realShares, 0.9))} C`,
      `    clamp hits ${this.paceSlow + this.paceFast} (slow ${this.paceSlow}, fast ${this.paceFast}; unmeasured ${this.paceUnmeasured}) of ${jets.length}; slices dropped mid-tube ${mid.length} (${shown(mid)} drawn when last seen; ${by('jet').length} holding an uncrashed jet)`,
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
 * - with the crash, the jets point by point (`JetTracker`): thrown, crashed on their own point, alone on their front at
 *   touchdown, dropped before the crash, coasted; the gap at the blend's start (the solver's crest z less the paced z); the
 *   anchor's extra speed in the handover; the pace clamp's hits; the slices dropped mid-tube; the voids closed as their pour
 *   began. It checks its tallies against the crash's, the front's, the lip's and the loft's own (the definitions are on
 *   the class), and ends each case with a summary of those numbers;
 * - the case's wall and CPU time, and the load average at its start (and its end).
 * Opt-in (PROBE=1); DX (1), SEEDS (1,2), SWELLS (small,medium), SECONDS (120), CRASH (1), LOG; TRACE (0): the first n jets'
 * handover windows of each case, one line a step, in LOG.trace; and every ten seconds of sea a progress line in
 * LOG.progress. All three files are emptied at the start.
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
        const tracker = library ? new JetTracker(simulation, library, dx, trace) : undefined;
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
