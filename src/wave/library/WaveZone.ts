import type { ShallowWaterSolver } from '../ShallowWaterSolver';
import { BORE_FOAM } from './boreFoam';
import { buildLanes, LANE, type LaneField } from './Handover';
import { CURVE, LibraryLoft } from './libraryLoft';
import { WAVE_LANDMARK } from './caseFormat';

/** The worker's contact lofts only the slices within this of a body, m (a rider covers far less in a step). */
export const NEAR_BODIES = 30;
import { SliceField, type SliceFieldState } from './SliceField';
import type { WaveLibrary } from './WaveLibrary';
import { ZoneSurface, type NodeGrid } from './zoneSurface';

/**
 * C2 step 3 (`?wave=library`; docs/research/wave-strategy-alternatives/c2-step3.md): the library's zone in the surf
 * zone's worker. Each step after the sea's: its lanes follow the sea's crests and hand them over (`SliceField`), the zone
 * writes the library's heights into the render nodes (`ZoneSurface`), and the overturn's loft is built over those nodes
 * for the contact (`LibraryLoft`). The sea runs on underneath, unchanged: nothing here writes the solver.
 */
export interface WaveZoneSetup {
  /** The incoming crests' direction on the platform, rad from +z toward +x (the sea's main component's). */
  direction: number;
  /** The platform's still depth, m, and the row on it the lanes are traced from, z, m. */
  platformDepth: number;
  baseZ: number;
  /** The base row's span in x, m (lanes that never reach the throw contour are dropped). */
  fromX: number;
  toX: number;
  /** The machine's period, s. */
  period: number;
  /** Which traced lanes are the reef's (by their toe and throw points); all without it. */
  keep?: (toeX: number, toeZ: number, throwX: number, throwZ: number) => boolean;
}

/** One sea station's bilinear cells: the first cell (row × nx + column), and its two weights, for each lane station. */
interface StationCells { cell: Int32Array; tx: Float64Array; tz: Float64Array }

export class WaveZone {
  readonly lanes: LaneField;
  readonly field: SliceField;
  readonly surface: ZoneSurface;
  /** The contact's loft over the felt nodes, rebuilt each step (`contactLoft`). */
  readonly loft = new LibraryLoft();
  /** The last step's cost, ms: the hand-over and slices, the zone's surface. */
  readonly costs = { field: 0, surface: 0 };
  private readonly width: number;
  private readonly xMin: number;
  private readonly cells: StationCells;

  constructor(readonly solver: ShallowWaterSolver, readonly library: WaveLibrary, setup: WaveZoneSetup, grid: NodeGrid) {
    this.width = solver.nx * solver.dx;
    this.xMin = solver.xCenters[0] - 0.5 * solver.dx;
    const still = (x: number, z: number) => solver.restLevel - this.sampleBed(x, z);
    this.lanes = buildLanes(still, setup.direction, setup.baseZ, setup.fromX, setup.toX, setup.platformDepth, setup.keep);
    this.field = new SliceField(library, this.lanes, setup.period);
    this.surface = new ZoneSurface(this.field, this.lanes, grid);
    this.cells = this.stationCells();
  }

  /** The sea's surface over still water at (x, z), m, periodic along shore (NaN on dry cells). */
  readonly seaLevel = (x: number, z: number): number => {
    const { solver } = this;
    const { cell, tx, tz } = this.locate(x, z);
    const { h, bed, nx } = solver;
    const i = cell;
    const right = this.right(i);
    const a = h[i];
    const b = h[right];
    const c = h[i + nx];
    const d = h[right + nx];
    if (!(a > 0.05 && b > 0.05 && c > 0.05 && d > 0.05)) return Number.NaN;
    const top = (a + bed[i]) * (1 - tx) + (b + bed[right]) * tx;
    const bottom = (c + bed[i + nx]) * (1 - tx) + (d + bed[right + nx]) * tx;
    return top * (1 - tz) + bottom * tz - solver.restLevel;
  };

  /** The tracker's sea: a lane station's, from its stored cells (the same arithmetic as `seaLevel`). */
  private readonly stationLevel = (k: number, j: number): number => {
    const { solver } = this;
    const o = k * this.lanes.stations + j;
    const i = this.cells.cell[o];
    const tx = this.cells.tx[o];
    const tz = this.cells.tz[o];
    const { h, bed, nx } = solver;
    const right = this.right(i);
    const a = h[i];
    const b = h[right];
    const c = h[i + nx];
    const d = h[right + nx];
    if (!(a > 0.05 && b > 0.05 && c > 0.05 && d > 0.05)) return Number.NaN;
    const top = (a + bed[i]) * (1 - tx) + (b + bed[right]) * tx;
    const bottom = (c + bed[i + nx]) * (1 - tx) + (d + bed[right + nx]) * tx;
    return top * (1 - tz) + bottom * tz - solver.restLevel;
  };

  /** One step at the solver's time: the slices, then the zone's surface. */
  step(): void {
    const time = this.solver.time;
    let start = performance.now();
    // Lane stations are read from their stored cells; any other point by `seaLevel`.
    const sea = (x: number, z: number) => this.seaLevel(x, z);
    this.field.update(time, sea, (k, j) => this.stationLevel(k, j));
    let end = performance.now();
    this.costs.field = end - start;
    start = end;
    this.surface.update(time, sea);
    end = performance.now();
    this.costs.surface = end - start;
  }

  /**
   * The snapshot's render nodes (`SurfZoneSimulation.writeUniformSnapshot`): the library's heights over the sea's, and
   * the sea's drawn foam and air held off its water until its touchdown (`FOAM_HOLD`). The same nodes the rider feels.
   *
   * C2 step 5b: from a slice's touchdown its own bore foam takes the place of the sea's, by the same weight the height
   * takes and in the same form ((1 − A) the sea's + the library's weighted own), so the bore hands back to the sea's
   * own whitewater without a seam. Its plume is as deep as the consult's white-through-water tint asks wherever its
   * foam is live (`BORE_FOAM.plume`); the look caps that at the water's own depth.
   */
  applySnapshot(surface: Float32Array, aeration: Float32Array | undefined, grid: NodeGrid): void {
    const zone = this.surface;
    const own = zone.grid;
    if (grid.nx !== own.nx || grid.nz !== own.nz || grid.spacing !== own.spacing || grid.xMin !== own.xMin || grid.zMin !== own.zMin) return;
    zone.forEachWritten((node, weight, height, hold, aired, cover, air) => {
      const o = 2 * node;
      surface[o] = (1 - weight) * surface[o] + height;
      if (hold > 0) {
        surface[o + 1] *= 1 - hold;
        if (aeration) aeration[o] *= 1 - hold;
      }
      if (aired > 0) {
        surface[o + 1] = (1 - aired) * surface[o + 1] + cover;
        if (aeration) {
          aeration[o] = (1 - aired) * aeration[o] + air;
          aeration[o + 1] = (1 - aired) * aeration[o + 1] + aired * BORE_FOAM.plume;
        }
      }
    });
  }

  /**
   * C2 step 5b: the aeration alone, for the in-page path that asks for the three fields separately
   * (`SurfZoneSimulation.writeUniformAeration`); `applySnapshot` does the same where it is given an aeration buffer.
   */
  applyAeration(aeration: Float32Array, grid: NodeGrid): void {
    const zone = this.surface;
    const own = zone.grid;
    if (grid.nx !== own.nx || grid.nz !== own.nz || grid.spacing !== own.spacing || grid.xMin !== own.xMin || grid.zMin !== own.zMin) return;
    zone.forEachWritten((node, _weight, _height, hold, aired, _cover, air) => {
      const o = 2 * node;
      if (hold > 0) aeration[o] *= 1 - hold;
      if (aired > 0) {
        aeration[o] = (1 - aired) * aeration[o] + air;
        aeration[o + 1] = (1 - aired) * aeration[o + 1] + aired * BORE_FOAM.plume;
      }
    });
  }

  /**
   * The contact's loft over the felt nodes (`heightAt`: the water's render-node surface); with `near`, only the slices
   * whose crest stands within `NEAR_BODIES` m of one of those points (x, z pairs): the bodies' (the step's cost).
   */
  contactLoft(heightAt: (x: number, z: number) => number, near?: ArrayLike<number>) {
    const curves = this.surface.curves;
    const keep = near ? (o: number) => {
      const s = curves[o + CURVE.points + 2 * WAVE_LANDMARK.crest];
      const x = curves[o + CURVE.baseX] + s * curves[o + CURVE.rayX];
      const z = curves[o + CURVE.baseZ] + s * curves[o + CURVE.rayZ];
      for (let i = 0; i + 1 < near.length; i += 2) {
        const dx = x - near[i];
        const dz = z - near[i + 1];
        if (dx * dx + dz * dz < NEAR_BODIES * NEAR_BODIES) return true;
      }
      return false;
    } : undefined;
    return this.loft.build(curves, this.surface.curveCount, heightAt, keep);
  }

  exportState(): SliceFieldState {
    return this.field.exportState();
  }

  importState(state: SliceFieldState): void {
    this.field.importState(state);
  }

  private sampleBed(x: number, z: number): number {
    const { cell, tx, tz } = this.locate(x, z);
    const { bed, nx } = this.solver;
    const right = this.right(cell);
    return (bed[cell] * (1 - tx) + bed[right] * tx) * (1 - tz) + (bed[cell + nx] * (1 - tx) + bed[right + nx] * tx) * tz;
  }

  /** The cell to the right of cell i, across the wrap. */
  private right(i: number): number {
    const nx = this.solver.nx;
    return i % nx === nx - 1 ? i - nx + 1 : i + 1;
  }

  /** (x, z)'s first cell and weights: x wrapped into the window (the pool's sides wrap), z clamped. */
  private readonly located = { cell: 0, tx: 0, tz: 0 };
  private locate(x: number, z: number): { cell: number; tx: number; tz: number } {
    const { solver } = this;
    let u = (x - this.xMin) % this.width;
    if (u < 0) u += this.width;
    // Cell centres sit half a cell in; past the last centre the cell wraps to the first.
    const gx = u / solver.dx - 0.5;
    let ix = Math.floor(gx);
    let tx = gx - ix;
    if (ix < 0) { ix = solver.nx - 1; tx = gx + 1; }
    const iz = solver.rowBelow(z);
    const tz = Math.min(1, Math.max(0, (z - solver.zCenters[iz]) / (solver.zCenters[iz + 1] - solver.zCenters[iz])));
    const out = this.located;
    out.cell = iz * solver.nx + ix;
    out.tx = tx;
    out.tz = tz;
    return out;
  }

  private stationCells(): StationCells {
    const { lanes } = this;
    const n = lanes.count * lanes.stations;
    const out: StationCells = { cell: new Int32Array(n), tx: new Float64Array(n), tz: new Float64Array(n) };
    for (let k = 0; k < lanes.count; k += 1) {
      for (let j = 0; j < lanes.stations; j += 1) {
        const s = j * LANE.step;
        const { cell, tx, tz } = this.locate(lanes.baseX[k] + s * lanes.rayX[k], lanes.baseZ[k] + s * lanes.rayZ[k]);
        const o = k * lanes.stations + j;
        out.cell[o] = cell;
        out.tx[o] = tx;
        out.tz[o] = tz;
      }
    }
    return out;
  }
}
