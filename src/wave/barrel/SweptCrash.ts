import { waveHeightAt } from '../CrestKinematics';
import { STRIP_PARCELS, type PlungingLip } from '../PlungingLip';
import type { ShallowWaterSolver } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import { CrashCurve, createCrashSlice, type CrashSlice, type JetMotion } from './crashCurve';
import type { ProfileLibrary } from './ProfileLibrary';

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
 * A point lost while its jet is held pours where and when it was foreseen. Only + − × ÷ and √ (online determinism).
 */
export class SweptCrash {
  readonly counts: CrashCounts = {
    onsets: 0, throws: 0, asked: 0, thrown: 0, starved: 0, starvedVolume: 0, crashes: 0, late: 0, missed: 0, gated: 0,
  };
  /** This step's crash curve: the points pouring. */
  readonly curve: CrashPoint[] = [];
  /** The crash's own time, ms, summed over its updates (a diagnostic). */
  updateMs = 0;
  private readonly geometry: CrashCurve;
  private readonly slice = createCrashSlice();
  private readonly foreseen = createCrashSlice();
  private readonly motion: JetMotion = { tipAlong: 0, tipUp: 0, crestSpeed: 0 };
  private readonly pool: CrashPoint[] = [];

  constructor(library: ProfileLibrary, slope: number) {
    this.geometry = new CrashCurve(library, slope);
  }

  /** One step, after the fronts' clocks have advanced: the throws, crashes and pours, and the whitewater. Returns this step's throws and their water, m³. */
  update(points: FrontPoint[], sea: CrashSea): { throws: number; volume: number } {
    const started = performance.now();
    this.curve.length = 0;
    sea.whitewater.set(sea.strength);
    const { solver } = sea;
    const heightAt = (x: number, z: number) => solver.sampleCentered(solver.h, x, z) + solver.sampleCentered(solver.bed, x, z);
    let throws = 0;
    let volume = 0;
    let start = 0;
    while (start < points.length) {
      let end = start + 1;
      while (end < points.length && points[end].front === points[start].front) end += 1;
      // A front of one point, or bunched at one σ, has no barrel (the loft draws none).
      if (end - start >= 2 && points[end - 1].sigma - points[start].sigma > 1e-6) {
        for (let k = start; k < end; k += 1) {
          const thrown = this.advance(points, start, end, k, sea, heightAt);
          if (thrown > 0) {
            throws += 1;
            volume += thrown;
          }
        }
      }
      start = end;
    }
    this.updateMs += performance.now() - started;
    return { throws, volume };
  }

  /** Point k's step: the gate, the throw, the crash and the pour. Returns the water it threw. */
  private advance(points: FrontPoint[], start: number, end: number, k: number, sea: CrashSea, heightAt: (x: number, z: number) => number): number {
    const p = points[k];
    // Past its tube's collapse a point has nothing left to do (most of a front: the bore behind the barrel).
    const times = this.geometry.times(p);
    if (p.tau >= times.touchdownSeconds + times.collapseSeconds) {
      if (p.jetStrip === undefined) {
        // Its lip was never drawn: no jet lands.
        p.jetStrip = -1;
        this.counts.missed += 1;
      }
      return 0;
    }
    const s = this.geometry.slice(points, start, end, k, sea.stillLevel, heightAt, this.slice);
    if (p.tau < s.touchdown && s.endWeight > 0) this.gate(p, s, sea);
    let thrown = 0;
    let throwing = false;
    if (p.jetStrip === undefined && p.tau >= 0) {
      thrown = this.throwJet(points, start, end, k, s, sea, heightAt);
      throwing = true;
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
