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

/** The same 10 / 50 / 90 % (the value at index ⌊q n⌋ of the sorted list), for signed values: with the least and the most. */
const spread = (values: number[], digits = 2) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!sorted.length) return '—';
  const at = (q: number) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(digits);
  return `${at(0.1)} / ${at(0.5)} / ${at(0.9)} (min ${sorted[0].toFixed(digits)}, max ${sorted.at(-1)!.toFixed(digits)}, n ${sorted.length})`;
};

const percent = (part: number, whole: number) => (whole > 0 ? `${((100 * part) / whole).toFixed(1)} %` : '—');
const fixed = (value: number, digits = 2) => (Number.isFinite(value) ? value.toFixed(digits) : '-');

/** How far either side of its handover window (s) a jet's anchor is followed, so its finite differences have a step before. */
const MARGIN = 0.1;

/**
 * One front point as `JetTracker` followed it (the ids are unique over a run). The tube phases are the library's: before
 * the throw (τ < 0), open (to touchdown), then pouring and closing (to the end of its collapse).
 */
interface Life {
  id: number;
  /** Its tube's touchdown and collapse, s (the library's, as `SweptCrash` reads them). */
  touchdown: number;
  collapse: number;
  /** The last step it stood on the front, when, its clock then, and whether its front was drawn (two points or more, `SweptCrash`'s runs). */
  lastStep: number;
  lastTime: number;
  lastTau: number;
  drawn: boolean;
  /** The step it first held a jet and the step it crashed it (0 until then), and how it crashed. */
  thrownStep: number;
  crashedStep: number;
  crash: '' | 'own' | 'alone' | 'past';
  /** The clamped crest-normal speed its pace was made from, m/s (the C of the shares), and the wave height H its jet was thrown with, m. */
  normal: number;
  height: number;
  /** The solver time of its throw and of its crash, s (0 until then). */
  thrownTime: number;
  crashTime: number;
  /** Steps it ran on its pace with no crest in reach, and steps it stood alone on its front, both holding an uncrashed jet. */
  coasted: number;
  alone: number;
  /** The steps in its present run of coasting, the runs it has had, and the steps its uncrashed jet, more than three open times old, claimed a crest. */
  run: number;
  episodes: number;
  lateClaims: number;
  /** Whether the blend's start and its touchdown have been measured, and whether its anchor had no throw point (`throwZ` null). */
  atBlend: boolean;
  atTouchdown: boolean;
  unanchored: boolean;
  /** Its anchor, crest point and z (and the crest it claimed) at the last step it was followed in its handover, for the finite differences. */
  previous?: { time: number; tau: number; ax: number; az: number; cx: number; cz: number; z: number; crestZ: number | undefined };
  /** The most its handover term and its drawn surge reached, m/s, and the steps measured inside its handover. */
  handover: number;
  surge: number;
  steps: number;
  /** Its place among the traced jets (0: not traced). */
  traced: number;
}

/**
 * What the swept crash does to its jets, followed point by point from outside (the Padang Padang spec, Part B, PR 5; the
 * advisor's rulings of 2026-10-01). It reads only the front's points and the crash's counters after each step, and checks
 * its own tallies against the counters. The terms:
 * - **A jet** is a front point that held a strip (`jetStrip` ≥ 0) from its throw. It is **resolved** by its crash or when
 *   its point left the front for good; **pending** otherwise: uncrashed at the run's end with its point on the front or held
 *   (a young jet, or one whose clock has stalled: its age and τ are listed).
 * - **Crashed on its own point:** the crash ran in the drawn front (two points or more) with the point's tube live
 *   (`SweptCrash`'s `crashes`). **Alone at touchdown:** the point stood alone on its front at its touchdown, and the jet
 *   crashed as foreseen (`foreseen`); of them **past their collapse** are those on a drawn front whose tube was over.
 *   **Dropped before the crash:** the point left the front for good (not on it, not held) with its jet uncrashed.
 * - **Coasted:** a step on which an uncrashed jet's point claimed no crest and ran on its pace (`BreakingFront.coasted`); an
 *   **episode** is a run of such steps. **The flight** is the time from the throw to the crash, in open times.
 * - **The blend's start:** the first step after the throw with τ ≥ `jetBlend` (0.8 of the open time). **The gap** there is
 *   the solver's crest it claimed (`crestZ`) less its paced z, `jetBase + jetPace τ`, m; none when no crest is in reach.
 *   **H** is the wave height the jet was thrown with (`jetWindow / SOURCE_REACH`).
 * - **The handover** is τ from `jetBlend` to `jetBlend + LOFT.handover`, u from 0 to 1. The anchor is the loft's (a
 *   `CrashCurve.slice` at the point's own σ, which mirrors the loft in drawing mode); C is the crest point S − c n it hands
 *   over to, T′ the throw point it leaves (the slice with the throw's anchor held), and the anchor is T′ + u (C − T′),
 *   which is checked. **The handover term** is |C − T′| over `LOFT.handover`: the anchor's own motion while it hands over,
 *   on top of its following the crest (`anchorVX`). **The surge** is |v_a − v_C|, the drawn anchor's velocity less the
 *   crest point's, each a finite difference over a step: how fast the drawn curl moves against the wave. Both are given
 *   in m/s and as shares of the jet's c_n, the clamped crest-normal speed its pace is made from. **A crest move** is how
 *   far the crest a point claims moves in a step beyond its pace, and **a point move** how far the point's z does: the
 *   solver crest's jitter, and how much of it the blend passes on.
 * - **A slice dropped mid-tube** is a point that left the front for good while its tube was open or pouring (0 ≤ τ < touchdown
 *   + collapse); one before its throw is counted apart. A **flicker** is a point unseen for a while that came back.
 */
class JetTracker {
  private readonly lives = new Map<number, Life>();
  private readonly curve: CrashCurve;
  private readonly slice = createCrashSlice();
  private readonly held = createCrashSlice();
  private readonly slope: number;
  private readonly heightAt: (x: number, z: number) => number;
  private step = 0;
  private coastedBefore = 0;
  private tracing = 0;
  /** This step's front points. */
  private points: readonly FrontPoint[] = [];
  private starts = new Int32Array(0);
  private ends = new Int32Array(0);
  /** Pace tallies from the throws (to check `SweptCrash`'s counters), the measured crest speed over the long-wave speed, and the rays' z parts. */
  paceSlow = 0;
  paceFast = 0;
  paceUnmeasured = 0;
  readonly speedRatio: number[] = [];
  readonly rayZs: number[] = [];
  /** Disagreements with the code's own numbers: the pace, the blend's times, the coasting count, the anchor's blend. */
  paceDiffers = 0;
  blendDiffers = 0;
  coastDiffers = 0;
  anchorDiffers = 0;
  /** The gap at the blend's start and at touchdown (m, and over H), and those with no crest in reach. */
  readonly blendGap: number[] = [];
  readonly blendGapOverH: number[] = [];
  readonly blendHeights: number[] = [];
  noCrestAtBlend = 0;
  readonly landGap: number[] = [];
  readonly landGapOverH: number[] = [];
  noCrestAtLanding = 0;
  /** The handover, per step: the term, the surge, the drawn anchor's speed and the crest point's (m/s), each with the jet's c_n. */
  readonly terms: number[] = [];
  readonly termShares: number[] = [];
  readonly surges: number[] = [];
  readonly surgeShares: number[] = [];
  readonly anchorShares: number[] = [];
  readonly crestShares: number[] = [];
  /** The same terms for the jets with a throw point (the others have the anchor on the crest all along, so no term). */
  readonly anchoredTerms: number[] = [];
  readonly anchoredShares: number[] = [];
  /** The claimed crest's and the point's moves beyond the pace in a handover step, m, and the clock's rate (τ gained over the step). */
  readonly crestMoves: number[] = [];
  readonly pointMoves: number[] = [];
  readonly clockRates: number[] = [];
  /** How many steps each finished run of coasting lasted. */
  readonly episodeLengths: number[] = [];
  /** Handover steps on a point alone on its front, which has no slice to measure. */
  unmeasuredHandover = 0;
  /** Unseen points that came back: how long, s, and whether mid-tube. */
  readonly flickers: { seconds: number; midTube: boolean }[] = [];
  /** The first `trace` jets' handover steps, one line each (see the probe's `TRACE`). */
  readonly traceLines: string[] = [];

  constructor(private readonly simulation: SurfZoneSimulation, private readonly library: ProfileLibrary, private readonly trace = 0) {
    this.slope = BARREL_SLOPE.padang as number;
    this.curve = new CrashCurve(library, this.slope);
    const { solver } = simulation;
    this.heightAt = (x, z) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
  }

  /** After a step: follow every point on the front. */
  observe(): void {
    const { front, solver } = this.simulation;
    const points = front!.points;
    this.points = points;
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
      // Before this step's own throw and crash: did it hold an uncrashed jet, running on its pace (`runsOnPace`)?
      const holding = life.thrownStep > 0 && life.crashedStep === 0;
      const onPace = holding && p.jetPace !== undefined && p.jetWindow !== undefined && p.jetWindow > 0;
      if (onPace && p.crestZ === undefined) {
        life.coasted += 1;
        coastedHere += 1;
        life.run += 1;
        if (life.run === 1) life.episodes += 1;
      } else if (life.run > 0) {
        this.episodeLengths.push(life.run);
        life.run = 0;
      }
      if (onPace && p.crestZ !== undefined && time - life.thrownTime > 3 * life.touchdown) life.lateClaims += 1;
      if (holding && !drawn) life.alone += 1;
      if (life.thrownStep === 0 && p.jetStrip !== undefined && p.jetStrip >= 0) this.thrown(life, p, k, step);
      if (life.thrownStep > 0 && life.crashedStep === 0 && p.crashedAt !== undefined) {
        life.crashedStep = step;
        life.crashTime = time;
        life.crash = !drawn ? 'alone' : p.tau < life.touchdown + life.collapse ? 'own' : 'past';
        // A run of coasting ends with the crash.
        if (life.run > 0) {
          this.episodeLengths.push(life.run);
          life.run = 0;
        }
      }
      if (life.thrownStep > 0 && life.thrownStep < step) this.measure(life, p, k, time, drawn, step);
      life.lastStep = step;
      life.lastTime = time;
      life.lastTau = p.tau;
      life.drawn = drawn;
    }
    const coasted = front!.coasted - this.coastedBefore;
    this.coastedBefore = front!.coasted;
    if (coasted !== coastedHere) this.coastDiffers += 1;
  }

  /** The point's first sighting. */
  private born(p: FrontPoint, step: number): Life {
    const times = this.library.profileTimes({ slope: this.slope, footHeight: p.footHeight, footDepth: p.footDepth });
    return {
      id: p.id, touchdown: times.touchdownSeconds, collapse: times.collapseSeconds,
      lastStep: step, lastTime: 0, lastTau: p.tau, drawn: false, thrownStep: 0, crashedStep: 0, crash: '', normal: 0, height: 0,
      thrownTime: 0, crashTime: 0, coasted: 0, alone: 0, run: 0, episodes: 0, lateClaims: 0, atBlend: false, atTouchdown: false, unanchored: false, handover: 0, surge: 0, steps: 0, traced: 0,
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
    life.height = (p.jetWindow ?? 0) / SOURCE_REACH;
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
        `# jet ${life.traced} (point ${life.id}): thrown at step ${step}, H ${fixed(life.height)} m, c_n ${fixed(normal)} m/s, n_z ${fixed(s.rayZ)}, pace ${fixed(p.jetPace ?? Number.NaN)} m/s, `
        + `touchdown ${fixed(s.touchdown)} s, blend from ${fixed(p.jetBlend ?? Number.NaN)} s to ${fixed(p.jetUntil ?? Number.NaN)} s`,
        '# jet  step  tau  tau/T  u  gap(m)  z-paced(m)  crest move(m)  point move(m)  |v_a|/c_n  |v_C|/c_n  surge/c_n  term/c_n  crest claimed',
      );
    }
  }

  /** A jet's point on a step after its throw: the gaps, and the handover. */
  private measure(life: Life, p: FrontPoint, k: number, time: number, drawn: boolean, step: number): void {
    if (p.jetBase === undefined || p.jetPace === undefined || p.jetBlend === undefined || p.jetUntil === undefined) return;
    // The gap: the crest it claimed this step, less where its pace puts it.
    const paced = p.jetBase + p.jetPace * p.tau;
    if (!life.atBlend && p.tau >= p.jetBlend) {
      life.atBlend = true;
      if (p.crestZ === undefined) this.noCrestAtBlend += 1;
      else {
        this.blendGap.push(p.crestZ - paced);
        this.blendGapOverH.push((p.crestZ - paced) / life.height);
        this.blendHeights.push(life.height);
      }
    }
    if (!life.atTouchdown && p.tau >= life.touchdown) {
      life.atTouchdown = true;
      if (p.crestZ === undefined) this.noCrestAtLanding += 1;
      else {
        this.landGap.push(p.crestZ - paced);
        this.landGapOverH.push((p.crestZ - paced) / life.height);
      }
    }
    // The handover: followed on the slice from a step before its window to a step after, for the finite differences.
    if (!(p.tau > p.jetBlend - MARGIN && p.tau < p.jetUntil + MARGIN)) {
      life.previous = undefined;
      return;
    }
    if (!drawn) {
      if (p.tau > p.jetBlend && p.tau < p.jetUntil) this.unmeasuredHandover += 1;
      life.previous = undefined;
      return;
    }
    const { points } = this;
    const { solver } = this.simulation;
    const s = this.curve.slice(points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.slice);
    const crest = (s.crestX - s.anchorX) * s.rayX + (s.crestZ - s.anchorZ) * s.rayZ;
    const cx = p.x - crest * s.rayX;
    const cz = p.z - crest * s.rayZ;
    const u = Math.min(1, Math.max(0, (p.tau - LOFT.handoverStart * s.touchdown) / LOFT.handover));
    const before = life.previous;
    life.previous = { time, tau: p.tau, ax: s.anchorX, az: s.anchorZ, cx, cz, z: p.z, crestZ: p.crestZ };
    const dt = before && time - before.time > 0 && time - before.time < MARGIN ? time - before.time : 0;
    const inside = u > 0 && u < 1;
    let term = Number.NaN;
    if (inside) {
      // The handover term: from the throw point the anchor holds (soft-capped near the crest point) to the crest point.
      const t = this.curve.slice(points, this.starts[k], this.ends[k], k, solver.restLevel, this.heightAt, this.held, { throwAnchor: true });
      term = Math.hypot(cx - t.anchorX, cz - t.anchorZ) / LOFT.handover;
      if (Math.hypot(t.anchorX + u * (cx - t.anchorX) - s.anchorX, t.anchorZ + u * (cz - t.anchorZ) - s.anchorZ) > 1e-6) this.anchorDiffers += 1;
      if (p.throwZ === null) life.unanchored = true;
      else {
        this.anchoredTerms.push(term);
        this.anchoredShares.push(term / life.normal);
      }
      this.terms.push(term);
      this.termShares.push(term / life.normal);
      life.handover = Math.max(life.handover, term);
      life.steps += 1;
    }
    let va = Number.NaN;
    let vc = Number.NaN;
    let surge = Number.NaN;
    let crestMove = Number.NaN;
    let pointMove = Number.NaN;
    if (dt > 0 && before) {
      const ax = (s.anchorX - before.ax) / dt;
      const az = (s.anchorZ - before.az) / dt;
      const vx = (cx - before.cx) / dt;
      const vz = (cz - before.cz) / dt;
      va = Math.hypot(ax, az);
      vc = Math.hypot(vx, vz);
      surge = Math.hypot(ax - vx, az - vz);
      pointMove = Math.abs(p.z - before.z - p.jetPace * dt);
      if (p.crestZ !== undefined && before.crestZ !== undefined) crestMove = Math.abs(p.crestZ - before.crestZ - p.jetPace * dt);
      if (inside) {
        this.surges.push(surge);
        this.surgeShares.push(surge / life.normal);
        this.anchorShares.push(va / life.normal);
        this.crestShares.push(vc / life.normal);
        this.pointMoves.push(pointMove);
        this.clockRates.push((p.tau - before.tau) / dt);
        if (Number.isFinite(crestMove)) this.crestMoves.push(crestMove);
        life.surge = Math.max(life.surge, surge);
      }
    }
    if (life.traced) {
      this.traceLines.push([
        life.traced, step, fixed(p.tau, 3), fixed(p.tau / life.touchdown), fixed(u), p.crestZ === undefined ? '-' : fixed(p.crestZ - paced), fixed(p.z - paced),
        fixed(crestMove), fixed(pointMove), fixed(va / life.normal), fixed(vc / life.normal), fixed(surge / life.normal), fixed(term / life.normal),
        p.crestZ === undefined ? 'no' : 'yes',
      ].join('  '));
    }
  }

  /** The tallies at the run's end, against the crash's, the front's and the lip's own. */
  report(counts: Record<string, number>, coasted: number, closedAtPour: number): string[] {
    const { front } = this.simulation;
    const held = new Set(front!.exportState().held.map((p) => p.id));
    const lives = [...this.lives.values()];
    const gone = (life: Life) => life.lastStep < this.step && !held.has(life.id);
    const jets = lives.filter((life) => life.thrownStep > 0);
    const own = jets.filter((life) => life.crash === 'own').length;
    const alone = jets.filter((life) => life.crash === 'alone').length;
    const past = jets.filter((life) => life.crash === 'past').length;
    const dropped = jets.filter((life) => life.crashedStep === 0 && gone(life));
    const pending = jets.filter((life) => life.crashedStep === 0 && !gone(life));
    const resolved = own + alone + past + dropped.length;
    const coasters = jets.filter((life) => life.coasted > 0);
    const outcome = (life: Life) => life.crash || (gone(life) ? 'dropped' : 'pending');
    const outcomes = (list: Life[]) => ['own', 'alone', 'past', 'dropped', 'pending'].map((name) => `${name} ${list.filter((life) => outcome(life) === name).length}`).join(', ');
    const out: string[] = [];
    out.push(`  jets: ${jets.length} thrown; ${resolved} resolved, ${pending.length} pending at the run's end (uncrashed, their point still on the front or held)`);
    out.push(`    crashed on their own point: ${own} (${percent(own, resolved)} of the resolved, ${percent(own, jets.length)} of the thrown)`);
    out.push(`    alone on their front at touchdown: ${alone}, and past their collapse on a drawn front: ${past} (together ${percent(alone + past, resolved)} of the resolved)`);
    out.push(`    dropped before the crash (the point left the front first): ${dropped.length} (${percent(dropped.length, resolved)})`);
    if (dropped.length) {
      out.push(`      those left at ${quantiles(dropped.map((life) => life.lastTau / life.touchdown))} of the open time; their H ${spread(dropped.map((life) => life.height))} m`);
    }
    if (pending.length) {
      const now = this.simulation.solver.time;
      const oldest = [...pending].sort((a, b) => a.thrownTime - b.thrownTime).slice(0, 12);
      out.push(`    the pending, oldest first (age since the throw, s / τ over the open time / steps coasted / coasting at the end): ${oldest.map((life) => `${(now - life.thrownTime).toFixed(1)} / ${(life.lastTau / life.touchdown).toFixed(2)} / ${life.coasted} / ${life.run > 0 ? 'yes' : 'no'}`).join('; ')}`);
    }
    out.push(`    jets alone on their front at some step before their crash: ${jets.filter((life) => life.alone > 0).length}; steps alone, of the ${alone} alone at touchdown: ${spread(jets.filter((life) => life.crash === 'alone').map((life) => life.alone), 0)}`);
    out.push(`    coasted (ran on the pace with no crest in reach): ${coasters.length} jets (${percent(coasters.length, jets.length)}), ${coasters.reduce((sum, life) => sum + life.coasted, 0)} point-steps (the front's counter ${coasted}); steps per coasting jet ${spread(coasters.map((life) => life.coasted), 0)}; their outcomes: ${outcomes(coasters)}`);
    const lengths = [...this.episodeLengths, ...jets.filter((life) => life.crashedStep === 0 && life.run > 0).map((life) => life.run)];
    out.push(`    coasting episodes (runs of steps): ${lengths.length}, ${lengths.filter((n) => n > 30).length} longer than a second, ${pending.filter((life) => life.run > 0).length} still coasting at the end; steps per episode ${spread(lengths, 0)}`);
    const claimers = jets.filter((life) => life.lateClaims > 0);
    out.push(`    steps on which an uncrashed jet more than three open times old claimed a crest: ${claimers.reduce((sum, life) => sum + life.lateClaims, 0)}, on ${claimers.length} jets`);
    const flights = jets.filter((life) => life.crashedStep > 0).map((life) => (life.crashTime - life.thrownTime) / life.touchdown);
    out.push(`    the flight from the throw to the crash, in open times (1 if the clock ran at real time): ${spread(flights)}; more than 1.5: ${flights.filter((v) => v > 1.5).length} of ${flights.length}`);
    out.push(`    the lip's pour began before the point's crash on ${closedAtPour} jets (PlungingLip.closedAtPour: the point left, or its clock ran behind the pour foreseen at the throw); the rays' z part n_z ${spread(this.rayZs)}`);
    // The gap.
    const ahead = this.blendGapOverH.filter((g) => g > 1).length;
    const behind = this.blendGapOverH.filter((g) => g < -1).length;
    out.push(`  the gap at the blend's start (the solver's crest z − the paced z), ${this.blendGap.length} jets (${this.noCrestAtBlend} more with no crest in reach):`);
    out.push(`    m, 10 / 50 / 90 % (signed): ${spread(this.blendGap)}`);
    out.push(`    in H, signed: ${spread(this.blendGapOverH)}`);
    out.push(`    in H, absolute: ${spread(this.blendGapOverH.map(Math.abs))}`);
    out.push(`    more than 1 H either way: ${ahead + behind} of ${this.blendGap.length} (${ahead} with the crest ahead of the pace, ${behind} behind); H of these jets ${spread(this.blendHeights)} m`);
    const overLand = this.landGapOverH.filter((g) => Math.abs(g) > 1).length;
    out.push(`  the same gap at touchdown (the earlier table's reading), ${this.landGap.length} jets (${this.noCrestAtLanding} with no crest in reach): m ${spread(this.landGap)}; |gap|/H ${spread(this.landGapOverH.map(Math.abs))}; over 1 H: ${overLand} of ${this.landGap.length}`);
    // The handover.
    const measured = jets.filter((life) => life.steps > 0);
    const normals = jets.map((life) => life.normal).filter((v) => v > 0);
    out.push(`  the anchor in the handover, ${this.terms.length} steps on ${measured.length} jets (${this.unmeasuredHandover} steps on points alone on their front; ${measured.filter((life) => life.unanchored).length} of the jets with no throw point, so the anchor on the crest all along); c_n of the jets ${spread(normals)} m/s:`);
    out.push(`    the handover term |C − T′| / ${LOFT.handover} s, m/s: ${spread(this.terms)}`);
    out.push(`    as a share of c_n: ${spread(this.termShares)}; over 0.5 c_n on ${this.termShares.filter((v) => v > 0.5).length} of ${this.termShares.length} steps, on ${measured.filter((life) => life.handover > 0.5 * life.normal).length} of ${measured.length} jets at some step`);
    out.push(`    the jets' most, m/s: ${spread(measured.map((life) => life.handover))}; as a share of c_n: ${spread(measured.map((life) => life.handover / life.normal))}`);
    out.push(`    on the ${this.anchoredTerms.length} steps of jets with a throw point: ${spread(this.anchoredTerms)} m/s; as a share of c_n: ${spread(this.anchoredShares)}; over 0.5 c_n on ${this.anchoredShares.filter((v) => v > 0.5).length}; the jets' most: ${spread(measured.filter((life) => !life.unanchored).map((life) => life.handover / life.normal))} of c_n`);
    out.push(`    as a distance |C − T′|, m, on those steps: ${spread(this.anchoredTerms.map((v) => v * LOFT.handover))}; the handover time that would hold the term to 0.5 c_n (that distance over 0.5 c_n), s: ${spread(this.anchoredShares.map((v) => (v * LOFT.handover) / 0.5))}`);
    out.push(`    the drawn surge |v_a − v_C| (finite difference over a step), m/s: ${spread(this.surges)}; as a share of c_n: ${spread(this.surgeShares)}; over 0.5 c_n on ${this.surgeShares.filter((v) => v > 0.5).length} of ${this.surgeShares.length} steps`);
    out.push(`    the jets' most surge, m/s: ${spread(measured.map((life) => life.surge))}; as a share of c_n: ${spread(measured.map((life) => life.surge / life.normal))}`);
    out.push(`    the drawn anchor's speed |v_a| over c_n: ${spread(this.anchorShares)}; the crest point's |v_C| over c_n: ${spread(this.crestShares)}`);
    out.push(`    beyond the pace in a step: the claimed crest moves ${spread(this.crestMoves)} m; the point's z ${spread(this.pointMoves)} m`);
    out.push(`    the clock's rate (τ gained over the time of a step): ${spread(this.clockRates)}; paused on ${this.clockRates.filter((v) => v < 0.05).length} of ${this.clockRates.length} steps, more than twice real time on ${this.clockRates.filter((v) => v > 2).length}`);
    // The clamp.
    out.push(`  the pace clamp (0.5–1.5 × √(g (h + η)) on c_n): ${this.paceSlow} slow, ${this.paceFast} fast, ${this.paceUnmeasured} unmeasured (long-wave speed used) of ${jets.length} jets; measured crest speed over √(g (h + η)): ${spread(this.speedRatio)}`);
    // The slices dropped.
    const left = lives.filter(gone);
    const phase = (life: Life) => (life.lastTau < 0 ? 'before' : life.lastTau < life.touchdown ? (life.thrownStep > 0 && life.crashedStep === 0 ? 'jet' : 'open') : life.lastTau < life.touchdown + life.collapse ? 'pour' : 'over');
    const by = (name: string) => left.filter((life) => phase(life) === name);
    const drawnOf = (list: Life[]) => list.filter((life) => life.drawn).length;
    const mid = [...by('jet'), ...by('open'), ...by('pour')];
    out.push(`  slices dropped mid-tube (the point left the front for good, 0 ≤ τ < touchdown + collapse): ${mid.length}, ${drawnOf(mid)} of them on a drawn front when last seen`);
    out.push(`    open and holding an uncrashed jet ${by('jet').length} (${drawnOf(by('jet'))} drawn); open, no jet ${by('open').length} (${drawnOf(by('open'))}); pouring or closing ${by('pour').length} (${drawnOf(by('pour'))})`);
    out.push(`    the fade left on those pouring when they went (1 at touchdown, 0 when faded): ${spread(by('pour').map((life) => (life.collapse > 0 ? 1 - (life.lastTau - life.touchdown) / life.collapse : 0)))}`);
    out.push(`    left before their throw (τ < 0): ${by('before').length} (${drawnOf(by('before'))} drawn); after their tube was over: ${by('over').length}; of ${lives.length} points followed`);
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
    if (this.paceDiffers) checks.push(`${this.paceDiffers} jets' pace differs from c_n / n_z recomputed`);
    if (this.blendDiffers) checks.push(`${this.blendDiffers} jets' blend window differs from 0.8 × touchdown + ${LOFT.handover} s`);
    if (this.coastDiffers) checks.push(`${this.coastDiffers} steps' coasting count differs from the front's`);
    if (this.anchorDiffers) checks.push(`${this.anchorDiffers} handover steps' anchor differs from T′ + u (C − T′)`);
    out.push(`  cross-checks against the code's own counters and the loft's anchor: ${checks.length ? `DISAGREE: ${checks.join('; ')}` : 'all agree'}`);
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
 *   anchor's extra speed in the handover; the pace clamp's hits; the slices dropped mid-tube. It checks its tallies against the
 *   crash's, the front's and the loft's own numbers (the definitions are on the class).
 * - the case's wall and CPU time, and the load average at its start (and its end).
 * Opt-in (PROBE=1); DX (1), SEEDS (1,2), SWELLS (small,medium), SECONDS (120), CRASH (1), LOG; TRACE (0): the first n jets'
 * handover steps, one line each, in LOG.trace; and every ten seconds of sea a progress line in LOG.progress.
 */
describe.runIf(process.env.PROBE)('Padang Padang crash probe', () => {
  it('runs each sea with and without the crash and logs what the water did', () => {
    const log = process.env.LOG ?? 'padang-crash.txt';
    writeFileSync(log, '');
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
        if (tracker?.traceLines.length) appendFileSync(`${log}.trace`, tracker.traceLines.join('\n') + '\n');
        appendFileSync(log, [
          `${size} seed ${seed}, ${crash ? 'with the crash' : 'Kennedy’s lip (before PR 5)'}, ${dx} m cells, ${seconds} s of sea after the spin-up (commit ${commit}; started ${startedAt}; load at the start ${loadAtStart}):`,
          `  stability: ${bad ? `NON-FINITE ${bad}` : 'finite'}; fastest water ${fastest.toFixed(1)} m/s (${fastestAt})`,
          `  peel: ${peel ? `${peel.angleDegrees.toFixed(1)}°, ${peel.peelSpeed.toFixed(1)} m/s, fit r² ${peel.fit.toFixed(2)}, ${peel.columns} columns` : 'no estimate'}`,
          `  surf at the take-off: ${reading ? `typical ${reading.typical.toFixed(2)} m, sets ${reading.sets.toFixed(2)} m over ${reading.waves} waves` : 'measuring'}`,
          `  lips: ${simulation.lipJets} throws, ${simulation.lipVolume.toFixed(1)} m³ thrown (events: asked ${asked.toFixed(1)}, thrown ${thrown.toFixed(1)}), landed ${landed.toFixed(1)} m³, airborne ${lip.airborneVolume().toFixed(1)} m³`,
          `  starved: ${lip.starvedThrows} throws, ${lip.starvedVolume.toFixed(2)} m³; unplaced momentum: ${lip.momentumClamps} throws, ${lip.unplacedMomentum.toFixed(1)} m⁴/s`,
          `  jet impacts ${quantiles(impacts, 1)} m/s`,
          `  the fine zone's highest water above still level, per tenth of a second: ${quantiles(highest)} m; the front's thrown crests: ${quantiles(thrownCrests)} m`,
          counts ? `  crash: ${JSON.stringify(counts)}` : '',
          `  step ${(stepMs / steps).toFixed(0)} ms${simulation.crash ? `, the crash ${(simulation.crash.updateMs / steps).toFixed(2)} ms` : ''}`,
          ...(tracker && counts ? tracker.report(counts as unknown as Record<string, number>, simulation.front!.coasted, lip.closedAtPour) : []),
          `  wall time ${wall.toFixed(0)} s, CPU time ${((cpu.user + cpu.system) / 1e6).toFixed(0)} s (the case, with its spin-up and the tracker); load at the start ${loadAtStart}, at the end ${loads()}`,
          '',
        ].filter((line) => line !== '').join('\n') + '\n');
      }
    }
  }, 36_000_000);
});
