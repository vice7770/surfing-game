import { waveHeightAt } from '../CrestKinematics';
import { GRAVITY } from '../dispersion';
import { SOURCE_REACH, STRIP_PARCELS, type PlungingLip } from '../PlungingLip';
import type { ShallowWaterSolver } from '../ShallowWaterSolver';
import type { FrontPoint } from './BreakingFront';
import type { CrestRayPlan } from './crestRays';
import { CrashCurve, createCrashSlice, type CrashSlice, type JetMotion } from './crashCurve';
import type { ProfileLibrary } from './ProfileLibrary';

/**
 * A thrown point, jet or not, runs on its crest's pace from the throw until its slice has faded (the advisor, 2026-10-01
 * and 2026-10-03), held to `slowest`–`fastest` × the long-wave speed √(g (h + η)) at its crest, as the contact's crest
 * pace is (CREST_SPEED; provisional), then turned along its column by the ray's z part, at least `leastRayZ` (a crest
 * line moving c_n along its normal crosses a column at c_n / cos θ).
 */
export const PACE = { slowest: 0.5, fastest: 1.5, leastRayZ: 0.5 } as const;

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
  /**
   * Points that left the front because their clock hadn't reached touchdown 2 T of solver time after their throw (the
   * advisor, 2026-10-03), and of them those holding a jet, which crashed where it was foreseen as they left.
   */
  exits: number;
  exitJets: number;
  /**
   * Points that left the front still on their pace 2 (T + collapse) of solver time after their throw, their clock stalled
   * in their slice's fade (the advisor, 2026-10-03), and of them those holding a jet, its pour running on from its last
   * place. Counted apart from the 2 T exits.
   */
  fadeExits: number;
  fadeExitJets: number;
  /** Held jets whose point left the front any other way (lost): they crashed where foreseen as it left. None are expected. */
  lost: number;
  /** Thrown points, jet or not, whose pace was held to the clamp, slow or fast, or unmeasured (the long-wave speed then): see `PACE`. */
  paceSlow: number;
  paceFast: number;
  paceUnmeasured: number;
  /** Cells whose breaking the whitewater waited on, summed over steps. */
  gated: number;
}

/** A throw this step (a diagnostic): its point, the solver's crest z it stood on, which its jet's water leaves (#86), and the ray's z part its pace was turned by. */
export interface PacedThrow {
  point: FrontPoint;
  crestZ: number;
  rayZ: number;
}

/**
 * The swept barrel's jets (the Padang Padang spec, Part B, 13.1 and 13.6; the advisor's rulings, 2026-10-01). The solver
 * stays the mass ledger, but at a swept spot its lips leave and land on the barrel's clock. Each step, for every point
 * of every front the loft draws (two points or more):
 * - **The throw** (its clock reaches 0): every point, jet or not, runs from here on its pace (`PACE`), claiming its crest
 *   (BreakingFront), until its slice has faded (the advisor, 2026-10-03). Its pace is set before its slice is taken, so
 *   from that very step its z, crest point, launch point and anchor run on z = jetBase + jetPace τ, from where its crest
 *   crossed its throw depth. The jet the loft will draw, the cases' held frames' A_J, blended and scaled as their
 *   frames, over the point's share of its front times the loft's end weight, still leaves the solver's crest under it by
 *   the lip's own rule (#86): from the wave's upper half, its momentum along the held lip's velocity taken nearest first,
 *   never reversed, the rest counted. It waits as a held strip
 *   (`PlungingLip.holdJet`, in the sea handover), its pour foreseen where the lip would land: the slice at its
 *   touchdown, on the anchor's own rule there with its paced z then.
 * - **The crash** (its clock reaches touchdown): its void closes, trapping the held frame's A_O over its share, and its
 *   water pours from where the lip lands (`CrashCurve`), a parcel every 1/7 of the tube's collapse √(2W/g), each landing as
 *   a lip parcel does. A held jet pours only at its crash, or as its point leaves the front. A point first seen past
 *   touchdown throws and pours at once; past its collapse it was never drawn, and throws nothing.
 * - **The pour** follows the drawn lip, until it has all left.
 * - **The whitewater** waits for the touchdown: over the drawn curl's footprint in the point's column, the breaking is
 *   withheld from the whitewater (the foam's bore source, its spray and bubbles, the bore's air and turbulence, the roar).
 *   An open tube's face is clear water; Kennedy's onset leads the lip by up to 2 s on Padang Padang's wedge.
 * - **A stall** (the advisor, 2026-10-03): a point whose clock hasn't reached touchdown 2 T of solver time after its
 *   throw leaves the front (`exits`), and its jet crashes where it was foreseen. One still on its pace 2 (T + collapse)
 *   after its throw, its clock stalled in its slice's fade, leaves too (`fadeExits`), its pour running on from its last
 *   place.
 * A point alone on its front at its touchdown, past its collapse, leaving the front at a stall or lost, crashes where it
 * was foreseen: its void closes, and its pour starts from the foreseen place at the foreseen spacing. Where two fronts'
 * barrels overlap, the loft draws the first (PR 4), so a later front's point under it throws nothing and gates nothing.
 * Only + − × ÷ and √ (online determinism).
 */
export class SweptCrash {
  readonly counts: CrashCounts = {
    onsets: 0, throws: 0, asked: 0, thrown: 0, starved: 0, starvedVolume: 0, crashes: 0, late: 0, missed: 0, covered: 0, foreseen: 0,
    exits: 0, exitJets: 0, fadeExits: 0, fadeExitJets: 0, lost: 0, paceSlow: 0, paceFast: 0, paceUnmeasured: 0, gated: 0,
  };
  /** This step's crash curve: the points pouring. */
  readonly curve: CrashPoint[] = [];
  /** The points that left the front this step at a stall, short of touchdown and in the fade (diagnostics): see `CrashCounts`. */
  readonly exited: FrontPoint[] = [];
  readonly fadeExited: FrontPoint[] = [];
  /** This step's throws, paced before their slices were taken (a diagnostic). */
  readonly paced: PacedThrow[] = [];
  /** The crash's own time, ms, summed over its updates (a diagnostic). */
  updateMs = 0;
  private readonly geometry: CrashCurve;
  private readonly foreseen = createCrashSlice();
  private readonly motion: JetMotion = { tipAlong: 0, tipUp: 0, crestSpeed: 0 };
  private readonly pool: CrashPoint[] = [];
  /** This step's drawn fronts, as [start, end) pairs of point indices. */
  private readonly runs: number[] = [];
  /** Explicit plans for this update's fronts, rebuilt whenever a coordinate-finalization stage changes them. */
  private readonly rayPlans: CrestRayPlan[] = [];
  /**
   * Per point this step: as drawn; whether it is live (before its collapse ends), and under an earlier front's barrel;
   * whether it throws, and the solver's crest cell its water leaves and the wave height measured there.
   */
  private slices: CrashSlice[] = [];
  private live = new Uint8Array(0);
  private covered = new Uint8Array(0);
  private throwing = new Uint8Array(0);
  private throwCell = new Int32Array(0);
  private throwHeight = new Float64Array(0);
  private readonly ray = { x: 0, z: 1 };
  /** Per point, its strip's footprint: corners (x, z × 4) and box (x0, x1, z0, z1), as the loft judges overlaps. */
  private corners = new Float64Array(0);
  private boxes = new Float64Array(0);
  /** This step's points' held jets, by strip. */
  private readonly holders = new Set<number>();
  /** Analytic strips whose air ledger follows current drawn voids, including already sealed strips. */
  private readonly analyticVoids = new Set<number>();
  private readonly observedVoids = new Set<number>();
  private readonly presentVoids = new Set<number>();

  constructor(library: ProfileLibrary, slope: number) {
    this.geometry = new CrashCurve(library, slope);
  }

  /**
   * One step, after the fronts' clocks have advanced: the stalls, the throws, crashes and pours, and the whitewater. A
   * stalled point is taken off `points` (the front's own list). Returns this step's throws and their water, m³.
   */
  update(points: FrontPoint[], sea: CrashSea): { throws: number; volume: number } {
    const started = performance.now();
    this.curve.length = 0;
    sea.whitewater.set(sea.strength);
    const { solver, lip } = sea;
    // The stalls (the advisor, 2026-10-03): a point whose clock hasn't reached touchdown 2 T of solver time after its
    // throw leaves the front, and its jet, if any, crashes where it was foreseen; one still on its pace 2 (T + collapse)
    // after its throw, its clock stalled in its slice's fade, leaves the front too, its pour running on from its last place.
    this.exited.length = 0;
    this.fadeExited.length = 0;
    let kept = 0;
    for (const p of points) {
      if (p.jetAt !== undefined && this.stalled(p, solver.time, lip)) continue;
      points[kept] = p;
      kept += 1;
    }
    points.length = kept;
    if (this.analyticVoids.size > 0) {
      this.presentVoids.clear();
      for (const p of points) if (p.jetStrip !== undefined && p.jetStrip >= 0) this.presentVoids.add(p.jetStrip);
      for (const strip of this.analyticVoids) if (!this.presentVoids.has(strip)) this.retireVoid(strip, lip);
    }
    // A held jet whose point has left the front any other way crashes where it was foreseen, as it leaves.
    const holders = this.holders;
    holders.clear();
    for (const p of points) if (p.jetStrip !== undefined && p.jetStrip >= 0 && p.crashedAt === undefined) holders.add(p.jetStrip);
    lip.forEachHeldJet((strip) => {
      if (holders.has(strip)) return;
      lip.closeJet(strip);
      this.counts.lost += 1;
    });
    // A point past its throw, jet or not, runs on its pace (BreakingFront), still claiming its crest, until its slice has
    // faded: z = jetBase + jetPace τ, with no blend (the advisor, 2026-10-03). Then it goes back to the ordinary match.
    for (const p of points) {
      if (p.jetPace === undefined || p.jetBase === undefined || p.jetUntil === undefined || !(p.tau < p.jetUntil)) continue;
      p.z = p.jetBase + p.jetPace * p.tau;
    }
    this.measureArc(points);
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
    // This step's throws (the advisor, 2026-10-03): a live point whose clock passed 0 this step is paced before its slice
    // is taken, from the front as it stands, so its z, crest point, launch point and anchor lie on its pace from this step;
    // its water still leaves the solver's crest under it (#86). Past its tube's collapse a point has nothing left to do
    // (most of a front: the bore behind the barrel).
    this.reserve(points.length);
    this.paced.length = 0;
    for (let r = 0; r < runs.length; r += 2) {
      const rays = this.rayPlans[r / 2] = this.geometry.prepareRays(points, runs[r], runs[r + 1], this.rayPlans[r / 2]);
      for (let k = runs[r]; k < runs[r + 1]; k += 1) {
        const p = points[k];
        const times = this.geometry.times(p);
        this.live[k] = p.tau < times.touchdownSeconds + times.collapseSeconds ? 1 : 0;
        if (this.live[k] && p.jetStrip === undefined && p.tau >= 0) this.paceThrow(points, runs[r], runs[r + 1], k, times, sea, rays);
      }
    }
    for (const thrown of this.paced) thrown.point.z = thrown.point.jetBase! + thrown.point.jetPace! * thrown.point.tau;
    if (this.paced.length > 0) {
      // All throws first read the same existing-paced geometry. Only after all their positions are finalized do
      // we replace its arc and ray plans; slices, widths and subsequently serialized records see this final stage.
      this.measureArc(points);
      for (let r = 0; r < runs.length; r += 2) this.geometry.prepareRays(points, runs[r], runs[r + 1], this.rayPlans[r / 2]);
    }
    // Each live point as drawn, and its footprint.
    for (let r = 0; r < runs.length; r += 2) {
      for (let k = runs[r]; k < runs[r + 1]; k += 1) {
        const p = points[k];
        if (!this.live[k]) {
          if (p.jetStrip === undefined) {
            // Its lip was never drawn: no jet lands.
            p.jetStrip = -1;
            this.counts.missed += 1;
          }
          continue;
        }
        this.footprint(k, this.geometry.slice(points, runs[r], runs[r + 1], k, sea.stillLevel, heightAt, this.slices[k], {}, this.rayPlans[r / 2]));
      }
    }
    this.dropOverlaps(runs);
    let throws = 0;
    let volume = 0;
    this.observedVoids.clear();
    for (let r = 0; r < runs.length; r += 2) {
      for (let k = runs[r]; k < runs[r + 1]; k += 1) {
        if (!this.live[k]) continue;
        const thrown = this.advance(points, runs[r], runs[r + 1], k, sea, heightAt, this.rayPlans[r / 2]);
        if (thrown > 0) {
          throws += 1;
          volume += thrown;
        }
      }
    }
    // Past retirement, isolated or missing strips have no actual drawn air left. This flush is independent of the
    // water parcels' final landing, and repeated empty updates cannot release the same trapped amount twice.
    for (const strip of this.analyticVoids) if (!this.observedVoids.has(strip)) this.retireVoid(strip, lip);
    // A point holding a jet the runs didn't crash at its touchdown: alone on its front, with no ray to draw it by, or past
    // its collapse. Its jet crashes where it was foreseen, its pour starting now; the point runs on its pace (BreakingFront).
    for (const p of points) {
      if (p.jetStrip === undefined || p.jetStrip < 0 || p.crashedAt !== undefined) continue;
      if (p.tau < this.geometry.times(p).touchdownSeconds) continue;
      lip.closeJet(p.jetStrip);
      p.crashedAt = sea.solver.time;
      this.counts.foreseen += 1;
    }
    this.updateMs += performance.now() - started;
    return { throws, volume };
  }

  /** Point k's step: the gate, the throw, the crash and the pour. Returns the water it threw. */
  private advance(
    points: FrontPoint[], start: number, end: number, k: number, sea: CrashSea, heightAt: (x: number, z: number) => number, rays: CrestRayPlan,
  ): number {
    const p = points[k];
    const s = this.slices[k];
    // Under an earlier front's barrel the drawing shows that one: this point's curl is not drawn (first wins).
    const drawn = this.covered[k] === 0;
    if (drawn && p.tau < s.touchdown && s.endWeight > 0) this.gate(p, s, sea);
    let thrown = 0;
    let throwing = false;
    if (this.throwing[k]) {
      // Paced already this step (`paceThrow`), jet or not; its water leaves the solver's crest it stood on.
      if (drawn) {
        thrown = this.throwJet(points, start, end, k, s, sea, heightAt, this.geometry.jetMotion(p, this.motion), this.throwCell[k], this.throwHeight[k], rays);
        throwing = true;
      } else {
        // Water that was never drawn doesn't land.
        p.jetStrip = -1;
        this.counts.covered += 1;
      }
    }
    const strip = p.jetStrip ?? -1;
    if (strip >= 0 && s.analytic) {
      this.analyticVoids.add(strip);
      this.observedVoids.add(strip);
      sea.lip.setSweptVoid(strip, {
        area: drawn ? s.voidArea : 0, span: s.width, length: s.voidLength, height: s.voidHeight,
        axisX: s.axisX, axisY: s.axisY,
      });
    }
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

  /**
   * Whether point p, thrown at `jetAt`, leaves the front at a stall now (the advisor, 2026-10-03): short of touchdown 2 T
   * after its throw, its jet, if any, crashing where it was foreseen (`exits`); or still on its pace 2 (T + collapse)
   * after it, past touchdown (the first rule takes any short of it), its jet's pour running on from its last place
   * (`fadeExits`).
   */
  private stalled(p: FrontPoint, time: number, lip: PlungingLip): boolean {
    const { touchdownSeconds: touchdown, collapseSeconds: collapse } = this.geometry.times(p);
    const age = time - p.jetAt!;
    if (p.tau < touchdown && age >= 2 * touchdown) {
      this.exited.push(p);
      this.counts.exits += 1;
      if (p.jetStrip !== undefined && p.jetStrip >= 0 && p.crashedAt === undefined) {
        if (this.analyticVoids.has(p.jetStrip)) this.retireVoid(p.jetStrip, lip);
        lip.closeJet(p.jetStrip);
        p.crashedAt = time;
        this.counts.exitJets += 1;
      }
      return true;
    }
    if (p.jetUntil !== undefined && p.tau < p.jetUntil && age >= 2 * (touchdown + collapse)) {
      this.fadeExited.push(p);
      this.counts.fadeExits += 1;
      if (p.jetStrip !== undefined && this.analyticVoids.has(p.jetStrip)) this.retireVoid(p.jetStrip, lip);
      if (p.jetStrip !== undefined && p.jetStrip >= 0) this.counts.fadeExitJets += 1;
      return true;
    }
    return false;
  }

  /**
   * Front point k's throw this step, before its slice is taken: its pace (`pace`) from the front as it stands (this step's
   * other throws not yet on theirs), and the solver's crest cell it stands on, which its jet's water leaves (#86), with
   * the wave height measured there. Listed in `paced`.
   */
  private paceThrow(
    points: FrontPoint[], start: number, end: number, k: number, times: { touchdownSeconds: number; collapseSeconds: number },
    sea: CrashSea, rays: CrestRayPlan,
  ): void {
    const p = points[k];
    const motion = this.geometry.jetMotion(p, this.motion);
    const cell = sea.solver.cellIndex(p.x, p.z);
    const waveHeight = waveHeightAt(sea.solver, cell, 0.5 * Math.max(0, motion.crestSpeed) * sea.period);
    const rayZ = this.geometry.ray(points, start, end, k, this.ray, rays).z;
    this.pace(p, times, rayZ, sea, cell, waveHeight);
    this.throwing[k] = 1;
    this.throwCell[k] = cell;
    this.throwHeight[k] = waveHeight;
    this.paced.push({ point: p, crestZ: p.z, rayZ });
  }

  /**
   * A point's pace from its throw, jet or not (the advisor, 2026-10-01 and 2026-10-03): its crest's over the last few
   * frames (crestMotion's, along the crest's own normal), held to PACE × the long-wave speed there, then along its column:
   * c_n / n_z, n_z its ray's at the throw (`rayZ`, the loft's). It runs on it from where its crest crossed its throw depth
   * (`throwZ`; with none, from its z now less its pace since τ = 0) until its slice has faded, at touchdown + collapse,
   * and claims its column's crest over the throw's own window meanwhile (BreakingFront).
   */
  private pace(
    p: FrontPoint, times: { touchdownSeconds: number; collapseSeconds: number }, rayZ: number, sea: CrashSea, cell: number, waveHeight: number,
  ): void {
    const { solver } = sea;
    // The throw's own window: #86's source reach, as `drawFromCrest` measures the wave.
    const height = waveHeight > 0 ? waveHeight : solver.h[cell] + solver.bed[cell] - solver.restLevel;
    p.jetWindow = SOURCE_REACH * Math.max(0, height);
    const wave = Math.sqrt(GRAVITY * Math.max(0, p.crestDepth + p.height));
    let normal = p.crestSpeed !== undefined && p.crestSpeed > 0 ? p.crestSpeed : wave;
    if (p.crestSpeed === undefined || !(p.crestSpeed > 0)) this.counts.paceUnmeasured += 1;
    else if (normal < PACE.slowest * wave) {
      normal = PACE.slowest * wave;
      this.counts.paceSlow += 1;
    } else if (normal > PACE.fastest * wave) {
      normal = PACE.fastest * wave;
      this.counts.paceFast += 1;
    }
    const pace = normal / Math.max(PACE.leastRayZ, rayZ);
    // Keep the observed crest before all new throws reset their positions onto the pace; the next holder read may
    // cross its own throw depth after the neighbor-fitted clock started its throw.
    p.crestZ = p.z;
    p.jetPace = pace;
    p.jetBase = p.throwZ ?? p.z - pace * p.tau;
    p.jetUntil = times.touchdownSeconds + times.collapseSeconds;
    p.jetAt = solver.time;
  }

  /** The point's jet leaves the crest, held until it pours (see the class). */
  private throwJet(
    points: FrontPoint[], start: number, end: number, k: number, s: CrashSlice, sea: CrashSea, heightAt: (x: number, z: number) => number,
    motion: JetMotion, cell: number, waveHeight: number, rays: CrestRayPlan,
  ): number {
    const p = points[k];
    const volume = s.prospectiveJetArea * s.width * s.endWeight;
    if (!(volume > 0)) {
      p.jetStrip = -1;
      return 0;
    }
    // Where it will land, foreseen: the slice at its touchdown, on the anchor's own rule there with the paced z then.
    const tau = Math.max(p.tau, s.touchdown);
    const f = this.geometry.slice(points, start, end, k, sea.stillLevel, heightAt, this.foreseen, { tau, z: p.jetBase! + p.jetPace! * tau }, rays);
    const { strip, thrown } = sea.lip.holdJet({
      cell, velocityX: motion.tipAlong * s.rayX, velocityZ: motion.tipAlong * s.rayZ, volume, waveHeight,
      launchX: s.crestX, launchY: s.crestY, launchZ: s.crestZ,
      pourX: f.landX, pourY: f.landY, pourZ: f.landZ, pourSpacing: s.collapse / (STRIP_PARCELS - 1), pourVY: motion.tipUp,
      voidLength: s.voidLength, axisX: s.axisX, axisY: s.axisY, voidHeight: s.voidHeight, voidArea: s.voidArea,
      span: s.width * (s.analytic ? 1 : s.endWeight),
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
    point.air = s.analytic ? s.voidArea * s.width : s.voidArea * s.width * s.endWeight * left * left;
    this.curve.push(point);
  }

  private retireVoid(strip: number, lip: PlungingLip): void {
    lip.setSweptVoid(strip, { area: 0, span: 0, length: 0, height: 0, axisX: 1, axisY: 0 });
    this.analyticVoids.delete(strip);
  }

  /** Room for `count` points' slices, throws and footprints. */
  private reserve(count: number): void {
    while (this.slices.length < count) this.slices.push(createCrashSlice());
    if (this.live.length < count) {
      const size = Math.max(count, 2 * this.live.length);
      this.live = new Uint8Array(size);
      this.covered = new Uint8Array(size);
      this.throwing = new Uint8Array(size);
      this.throwCell = new Int32Array(size);
      this.throwHeight = new Float64Array(size);
      this.corners = new Float64Array(8 * size);
      this.boxes = new Float64Array(4 * size);
    }
    this.live.fill(0, 0, count);
    this.covered.fill(0, 0, count);
    this.throwing.fill(0, 0, count);
  }

  /** The current coordinates' arc length, reset at each surviving front's first point, before any plan or width. */
  private measureArc(points: FrontPoint[]): void {
    for (let k = 0; k < points.length; k += 1) {
      const point = points[k];
      const previous = points[k - 1];
      if (!previous || previous.front !== point.front) {
        point.sigma = 0;
      } else {
        const dx = point.x - previous.x;
        const dz = point.z - previous.z;
        point.sigma = previous.sigma + Math.sqrt(dx * dx + dz * dz);
      }
    }
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
