import { waveHeightAt } from '../CrestKinematics';
import { GRAVITY } from '../dispersion';
import { SOURCE_REACH, STRIP_PARCELS, type PlungingLip } from '../PlungingLip';
import type { ShallowWaterSolver } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import { CrashCurve, createCrashSlice, type CrashSlice, type JetMotion } from './crashCurve';
import type { ProfileLibrary } from './ProfileLibrary';

/**
 * A thrown jet's point runs on its crest's pace from the throw to the crash, held to `slowest`–`fastest` × the long-wave
 * speed √(g (h + η)) at its crest, as the contact's crest pace is (CREST_SPEED; the advisor, 2026-10-01, provisional).
 */
export const PACE = { slowest: 0.5, fastest: 1.5 } as const;

/** What the crash reads and writes each step: the water, its lip, still level (m) and the swell's period (s), and the breaking. */
export interface CrashSea {
  solver: ShallowWaterSolver;
  lip: PlungingLip;
  stillLevel: number;
  period: number;
  /** The solver's breaking strength, and the whitewater's copy of it, which the crash withholds over open curls. */
  strength: ArrayLike<number>;
  whitewater: Float64Array;
}

/** A point pouring this step (Part D's crash curve): where its lip lands, m, the jet's velocity, m/s, and the air its void still holds, m³. */
export interface CrashPoint {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  air: number;
}

/** The crash's tallies since the start. */
export interface CrashCounts {
  /** Kennedy onsets whose lip the swept barrel stood in for (the solver's own lip throws none at a swept spot). */
  onsets: number;
  /** Jets thrown, the water asked and thrown, m³, and the throws their crest starved, with the water short, m³. */
  throws: number;
  asked: number;
  thrown: number;
  starved: number;
  starvedVolume: number;
  /** Crashes; those that threw in the same step (a point first seen past touchdown); points seen only past their collapse, which throw nothing. */
  crashes: number;
  late: number;
  missed: number;
  /** Points whose throw came under an earlier front's barrel, which the drawing shows instead (first wins): no jet. */
  covered: number;
  /**
   * Points holding a jet the barrel couldn't crash at their touchdown, alone on their front (no ray to draw them by) or
   * past their collapse: their jet crashed as foreseen at its throw (`PlungingLip.closeJet`).
   */
  foreseen: number;
  /** Jets whose point's pace was held to the clamp, slow or fast, or unmeasured (the long-wave speed then): see `PACE`. */
  paceSlow: number;
  paceFast: number;
  paceUnmeasured: number;
  /** Cells whose breaking the whitewater waited on, summed over steps. */
  gated: number;
}

/**
 * The swept barrel's jets (the Padang Padang spec, Part B, 13.1 and 13.6; the advisor's rulings, 2026-10-01). The solver
 * stays the mass ledger, but at a swept spot its lips leave and land on the barrel's clock. Each step, for every point
 * of every front the loft draws (two points or more):
 * - **The throw** (its clock reaches 0): the jet the loft will draw, the cases' held frames' A_J, blended and scaled as
 *   their frames, over the point's share of its front times the loft's end weight, leaves the solver's crest under it by
 *   the lip's own rule (#86): from the wave's upper half, its momentum along the held lip's velocity taken nearest first,
 *   never reversed, the rest counted. It waits as a held strip (`PlungingLip.holdJet`, in the sea handover), its pour
 *   foreseen where the lip would land from the throw's anchor.
 * - **The crash** (its clock reaches touchdown): its void closes, trapping the held frame's A_O over its share, and its
 *   water pours from where the lip lands (`CrashCurve`), a parcel every 1/7 of the tube's collapse √(2W/g), each landing as
 *   a lip parcel does. A point first seen past touchdown throws and pours at once; past its collapse it was never drawn,
 *   and throws nothing.
 * - **The pour** follows the drawn lip as its anchor hands back, until it has all left.
 * - **The whitewater** waits for the touchdown: over the drawn curl's footprint in the point's column, the breaking is
 *   withheld from the whitewater (the foam's bore source, its spray and bubbles, the bore's air and turbulence, the roar).
 *   An open tube's face is clear water; Kennedy's onset leads the lip by up to 2 s on Padang Padang's wedge.
 * A point lost while its jet is held, or alone on its front at its touchdown, pours where and when it was foreseen, its
 * void closing as it starts to; the front keeps a jet's point on its crest over the throw's window meanwhile
 * (BreakingFront). Where two fronts' barrels overlap, the loft draws the first (PR 4), so a later front's point under it
 * throws nothing and gates nothing. Only + − × ÷ and √ (online determinism).
 */
export class SweptCrash {
  readonly counts: CrashCounts = {
    onsets: 0, throws: 0, asked: 0, thrown: 0, starved: 0, starvedVolume: 0, crashes: 0, late: 0, missed: 0, covered: 0, foreseen: 0,
    paceSlow: 0, paceFast: 0, paceUnmeasured: 0, gated: 0,
  };
  /** This step's crash curve: the points pouring. */
  readonly curve: CrashPoint[] = [];
  /** The crash's own time, ms, summed over its updates (a diagnostic). */
  updateMs = 0;
  private readonly geometry: CrashCurve;
  private readonly foreseen = createCrashSlice();
  private readonly motion: JetMotion = { tipAlong: 0, tipUp: 0, crestSpeed: 0 };
  private readonly pool: CrashPoint[] = [];
  /** This step's drawn fronts, as [start, end) pairs of point indices. */
  private readonly runs: number[] = [];
  /** Per point this step: as drawn; whether it is live (before its collapse ends), and under an earlier front's barrel. */
  private slices: CrashSlice[] = [];
  private live = new Uint8Array(0);
  private covered = new Uint8Array(0);
  /** Per point, its strip's footprint: corners (x, z × 4) and box (x0, x1, z0, z1), as the loft judges overlaps. */
  private corners = new Float64Array(0);
  private boxes = new Float64Array(0);

  constructor(library: ProfileLibrary, slope: number) {
    this.geometry = new CrashCurve(library, slope);
  }

  /** One step, after the fronts' clocks have advanced: the throws, crashes and pours, and the whitewater. Returns this step's throws and their water, m³. */
  update(points: FrontPoint[], sea: CrashSea): { throws: number; volume: number } {
    const started = performance.now();
    this.curve.length = 0;
    sea.whitewater.set(sea.strength);
    // A point holding an uncrashed jet runs on its pace, on its clock (BreakingFront): z = jetBase + jetPace τ.
    for (const p of points) {
      if (p.jetPace !== undefined && p.jetBase !== undefined && p.crashedAt === undefined && p.jetStrip !== undefined && p.jetStrip >= 0) {
        p.z = p.jetBase + p.jetPace * p.tau;
      }
    }
    const { solver } = sea;
    const heightAt = (x: number, z: number) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
    // The fronts the loft draws: two points or more, not bunched at one σ.
    const runs = this.runs;
    runs.length = 0;
    let start = 0;
    while (start < points.length) {
      let end = start + 1;
      while (end < points.length && points[end].front === points[start].front) end += 1;
      if (end - start >= 2 && points[end - 1].sigma - points[start].sigma > 1e-6) runs.push(start, end);
      start = end;
    }
    // Each live point as drawn, and its footprint.
    this.reserve(points.length);
    for (let r = 0; r < runs.length; r += 2) {
      for (let k = runs[r]; k < runs[r + 1]; k += 1) {
        const p = points[k];
        // Past its tube's collapse a point has nothing left to do (most of a front: the bore behind the barrel).
        const times = this.geometry.times(p);
        this.live[k] = p.tau < times.touchdownSeconds + times.collapseSeconds ? 1 : 0;
        if (!this.live[k]) {
          if (p.jetStrip === undefined) {
            // Its lip was never drawn: no jet lands.
            p.jetStrip = -1;
            this.counts.missed += 1;
          }
          continue;
        }
        this.footprint(k, this.geometry.slice(points, runs[r], runs[r + 1], k, sea.stillLevel, heightAt, this.slices[k]));
      }
    }
    this.dropOverlaps(runs);
    let throws = 0;
    let volume = 0;
    for (let r = 0; r < runs.length; r += 2) {
      for (let k = runs[r]; k < runs[r + 1]; k += 1) {
        if (!this.live[k]) continue;
        const thrown = this.advance(points, runs[r], runs[r + 1], k, sea, heightAt);
        if (thrown > 0) {
          throws += 1;
          volume += thrown;
        }
      }
    }
    // A point holding a jet the runs didn't crash at its touchdown: alone on its front, with no ray to draw it by, or past
    // its collapse. Its jet crashes as foreseen at its throw, and the point lets its crest go (BreakingFront).
    for (const p of points) {
      if (p.jetStrip === undefined || p.jetStrip < 0 || p.crashedAt !== undefined) continue;
      if (p.tau < this.geometry.times(p).touchdownSeconds) continue;
      sea.lip.closeJet(p.jetStrip);
      p.crashedAt = sea.solver.time;
      this.counts.foreseen += 1;
    }
    this.updateMs += performance.now() - started;
    return { throws, volume };
  }

  /** Point k's step: the gate, the throw, the crash and the pour. Returns the water it threw. */
  private advance(points: FrontPoint[], start: number, end: number, k: number, sea: CrashSea, heightAt: (x: number, z: number) => number): number {
    const p = points[k];
    const s = this.slices[k];
    // Under an earlier front's barrel the drawing shows that one: this point's curl is not drawn (first wins).
    const drawn = this.covered[k] === 0;
    if (drawn && p.tau < s.touchdown && s.endWeight > 0) this.gate(p, s, sea);
    let thrown = 0;
    let throwing = false;
    if (p.jetStrip === undefined && p.tau >= 0) {
      if (drawn) {
        thrown = this.throwJet(points, start, end, k, s, sea, heightAt);
        throwing = true;
      } else {
        // Water that was never drawn doesn't land.
        p.jetStrip = -1;
        this.counts.covered += 1;
      }
    }
    const strip = p.jetStrip ?? -1;
    if (strip >= 0 && p.crashedAt === undefined && p.tau >= s.touchdown) {
      const motion = this.geometry.jetMotion(p, this.motion);
      sea.lip.crashJet(strip, { x: s.landX, y: s.landY, z: s.landZ, spacing: s.collapse / (STRIP_PARCELS - 1), vy: motion.tipUp }, { x: s.crestX, y: s.crestY, z: s.crestZ });
      p.crashedAt = sea.solver.time;
      this.counts.crashes += 1;
      if (throwing) this.counts.late += 1;
    }
    if (strip >= 0 && p.crashedAt !== undefined && p.tau < s.touchdown + s.collapse) {
      sea.lip.movePour(strip, s.landX, s.landY, s.landZ);
      this.pour(p, s);
    }
    return thrown;
  }

  /** The point's jet leaves the crest, held until it pours (see the class). */
  private throwJet(points: FrontPoint[], start: number, end: number, k: number, s: CrashSlice, sea: CrashSea, heightAt: (x: number, z: number) => number): number {
    const p = points[k];
    const { solver } = sea;
    const volume = s.jetArea * s.width * s.endWeight;
    if (!(volume > 0)) {
      p.jetStrip = -1;
      return 0;
    }
    const motion = this.geometry.jetMotion(p, this.motion);
    const cell = solver.cellIndex(p.x, p.z);
    const waveHeight = waveHeightAt(solver, cell, 0.5 * Math.max(0, motion.crestSpeed) * sea.period);
    // Where it will land, foreseen at the touchdown frame from the throw's anchor.
    const f = this.geometry.slice(points, start, end, k, sea.stillLevel, heightAt, this.foreseen, { tau: Math.max(p.tau, s.touchdown), throwAnchor: true });
    const { strip, thrown } = sea.lip.holdJet({
      cell, velocityX: motion.tipAlong * s.rayX, velocityZ: motion.tipAlong * s.rayZ, volume, waveHeight,
      launchX: s.crestX, launchY: s.crestY, launchZ: s.crestZ,
      pourX: f.landX, pourY: f.landY, pourZ: f.landZ, pourIn: Math.max(0, s.touchdown - p.tau), pourSpacing: s.collapse / (STRIP_PARCELS - 1),
      pourVY: motion.tipUp,
      voidLength: s.voidLength, axisX: s.axisX, axisY: s.axisY, voidHeight: s.voidHeight, voidArea: s.voidArea, span: s.width * s.endWeight,
      dirX: s.rayX, dirZ: s.rayZ, crestSpeed: motion.crestSpeed, relativeSpeed: motion.tipAlong - motion.crestSpeed,
    });
    p.jetStrip = strip;
    this.counts.asked += volume;
    if (strip >= 0) {
      this.counts.throws += 1;
      this.counts.thrown += thrown;
      // The throw's own window (#86's source reach, as `drawFromCrest` measures the wave): until its crash the point
      // claims its column's crest over it (BreakingFront).
      const height = waveHeight > 0 ? waveHeight : solver.h[cell] + solver.bed[cell] - solver.restLevel;
      p.jetWindow = SOURCE_REACH * Math.max(0, height);
      // Its pace from here to the crash: its crest's over the last few frames, held to PACE × the long-wave speed there.
      const wave = Math.sqrt(GRAVITY * Math.max(0, p.crestDepth + p.height));
      let pace = p.crestSpeed !== undefined && p.crestSpeed > 0 ? p.crestSpeed : wave;
      if (p.crestSpeed === undefined || !(p.crestSpeed > 0)) this.counts.paceUnmeasured += 1;
      else if (pace < PACE.slowest * wave) {
        pace = PACE.slowest * wave;
        this.counts.paceSlow += 1;
      } else if (pace > PACE.fastest * wave) {
        pace = PACE.fastest * wave;
        this.counts.paceFast += 1;
      }
      p.jetPace = pace;
      p.jetBase = (p.throwZ ?? p.z - pace * p.tau);
    }
    if (thrown < volume) {
      this.counts.starved += 1;
      this.counts.starvedVolume += volume - thrown;
    }
    return thrown;
  }

  /** A pouring point on this step's crash curve. */
  private pour(p: FrontPoint, s: CrashSlice): void {
    const n = this.curve.length;
    const point = this.pool[n] ?? (this.pool[n] = { x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, air: 0 });
    const motion = this.geometry.jetMotion(p, this.motion);
    point.x = s.landX;
    point.y = s.landY;
    point.z = s.landZ;
    point.vx = motion.tipAlong * s.rayX;
    point.vy = motion.tipUp;
    point.vz = motion.tipAlong * s.rayZ;
    // The air left as its void collapses (G9: the void's volume falls as the square of its shrinking scale).
    const left = s.collapse > 0 ? Math.max(0, 1 - (p.tau - s.touchdown) / s.collapse) : 0;
    point.air = s.voidArea * s.width * s.endWeight * left * left;
    this.curve.push(point);
  }

  /** Room for `count` points' slices and footprints. */
  private reserve(count: number): void {
    while (this.slices.length < count) this.slices.push(createCrashSlice());
    if (this.live.length < count) {
      const size = Math.max(count, 2 * this.live.length);
      this.live = new Uint8Array(size);
      this.covered = new Uint8Array(size);
      this.corners = new Float64Array(8 * size);
      this.boxes = new Float64Array(4 * size);
    }
    this.live.fill(0, 0, count);
    this.covered.fill(0, 0, count);
  }

  /**
   * Point k's strip's footprint, as the loft judges overlapping fronts on its strips: the drawn reach, its extensions
   * included, from its anchor along its ray, half its share of the front either side along the front.
   */
  private footprint(k: number, s: CrashSlice): void {
    const { corners, boxes } = this;
    // The front's tangent, from its shoreward normal: n = (−t_z, t_x).
    const tx = s.rayZ;
    const tz = -s.rayX;
    const half = s.width / 2;
    let c = 8 * k;
    for (const side of [-half, half]) {
      for (const reach of [s.footBack, s.footFront]) {
        corners[c] = s.anchorX + side * tx + reach * s.rayX;
        corners[c + 1] = s.anchorZ + side * tz + reach * s.rayZ;
        c += 2;
      }
    }
    const b = 4 * k;
    boxes[b] = Infinity;
    boxes[b + 1] = -Infinity;
    boxes[b + 2] = Infinity;
    boxes[b + 3] = -Infinity;
    for (let i = 0; i < 4; i += 1) {
      boxes[b] = Math.min(boxes[b], corners[8 * k + 2 * i]);
      boxes[b + 1] = Math.max(boxes[b + 1], corners[8 * k + 2 * i]);
      boxes[b + 2] = Math.min(boxes[b + 2], corners[8 * k + 2 * i + 1]);
      boxes[b + 3] = Math.max(boxes[b + 3], corners[8 * k + 2 * i + 1]);
    }
  }

  /**
   * Overlapping fronts, as the loft drops them (PR 4: the first front wins, in the drawing and the contact alike): a
   * later front's point whose footprint overlaps a live, uncovered point of an earlier front is covered.
   */
  private dropOverlaps(runs: readonly number[]): void {
    const { boxes } = this;
    const apart = (i: number, j: number) =>
      boxes[i + 1] < boxes[j] || boxes[j + 1] < boxes[i] || boxes[i + 3] < boxes[j + 2] || boxes[j + 3] < boxes[i + 2];
    for (let later = 2; later < runs.length; later += 2) {
      for (let earlier = 0; earlier < later; earlier += 2) {
        for (let k = runs[later]; k < runs[later + 1]; k += 1) {
          if (!this.live[k] || this.covered[k]) continue;
          for (let j = runs[earlier]; j < runs[earlier + 1]; j += 1) {
            if (!this.live[j] || this.covered[j] || apart(4 * k, 4 * j) || !this.hullsOverlap(8 * k, 8 * j)) continue;
            this.covered[k] = 1;
            break;
          }
        }
      }
    }
  }

  /** Whether two footprints overlap: the convex hulls of their four corners each, by separating axes (the loft's test). */
  private hullsOverlap(a: number, b: number): boolean {
    const c = this.corners;
    for (let hull = 0; hull < 2; hull += 1) {
      const base = hull === 0 ? a : b;
      for (let i = 0; i < 4; i += 1) {
        for (let j = i + 1; j < 4; j += 1) {
          const ax = c[base + 2 * i + 1] - c[base + 2 * j + 1];
          const az = c[base + 2 * j] - c[base + 2 * i];
          if (ax === 0 && az === 0) continue;
          let minA = Infinity;
          let maxA = -Infinity;
          let minB = Infinity;
          let maxB = -Infinity;
          for (let k = 0; k < 4; k += 1) {
            const pa = c[a + 2 * k] * ax + c[a + 2 * k + 1] * az;
            const pb = c[b + 2 * k] * ax + c[b + 2 * k + 1] * az;
            minA = Math.min(minA, pa);
            maxA = Math.max(maxA, pa);
            minB = Math.min(minB, pb);
            maxB = Math.max(maxB, pb);
          }
          // Touching is apart, as the loft's half-open strips share no point.
          if (maxA <= minB || maxB <= minA) return false;
        }
      }
    }
    return true;
  }

  /** The point's column, over the drawn curl's footprint: the whitewater waits for its touchdown. */
  private gate(p: FrontPoint, s: CrashSlice, sea: CrashSea): void {
    const { solver, whitewater } = sea;
    const { nx, nz, dx, xCenters, zCenters } = solver;
    const column = Math.min(nx - 1, Math.max(0, Math.floor((p.x - xCenters[0]) / dx + 0.5)));
    const back = s.anchorZ + s.reachBack * s.rayZ;
    const front = s.anchorZ + s.reachFront * s.rayZ;
    const low = Math.min(back, front);
    const high = Math.max(back, front);
    for (let row = solver.rowBelow(low); row < nz && zCenters[row] <= high; row += 1) {
      if (zCenters[row] < low) continue;
      const cell = row * nx + column;
      if (whitewater[cell] !== 0) {
        whitewater[cell] = 0;
        this.counts.gated += 1;
      }
    }
  }
}
