import type { ShallowWaterSolver } from './ShallowWaterSolver';

/** A same-step departure lookup shared by fields carried on unchanged water. */
export class AdvectionStencil {
  indices = new Uint32Array(0);
  /** The original tx/tz fractions, in double precision. */
  values = new Float64Array(0);
  private solver?: ShallowWaterSolver;
  private xCenters?: Float64Array;
  private zCenters?: Float64Array;
  private dt = Number.NaN;
  private time = Number.NaN;
  private xMin = Number.NaN;
  private zMin = Number.NaN;
  private dx = Number.NaN;
  private nx = 0;
  private nz = 0;
  private ready = false;

  /** Foam records a fresh lookup every update: h/q are mutable, even without a clock or window change. */
  begin(solver: ShallowWaterSolver, dt: number): void {
    this.ready = false;
    const size = solver.h.length;
    if (this.indices.length !== size) {
      this.indices = new Uint32Array(size);
      this.values = new Float64Array(size * 2);
    }
    this.solver = solver;
    this.xCenters = solver.xCenters;
    this.zCenters = solver.zCenters;
    this.dt = dt;
    this.time = solver.time;
    this.xMin = solver.xCenters[0];
    this.zMin = solver.zCenters[0];
    this.dx = solver.dx;
    this.nx = solver.nx;
    this.nz = solver.nz;
  }

  /** The whole lookup has been written; dry cells need no entry because both fields clear them. */
  commit(): void { this.ready = true; }

  /** Discard it when a caller changes h/q between the two field updates. */
  invalidate(): void { this.ready = false; }

  /**
   * Aeration may reuse it once, immediately after foam, while h/q stay unchanged.
   * A changed dt, grid, window or clock falls back to computing departures itself.
   * Consuming it prevents an unrelated later call at the same solver time from reusing mutable-water state.
   */
  take(solver: ShallowWaterSolver, dt: number): AdvectionStencil | undefined {
    const matches = this.ready && this.solver === solver && this.dt === dt && this.time === solver.time
      && this.xCenters === solver.xCenters && this.zCenters === solver.zCenters
      && this.xMin === solver.xCenters[0] && this.zMin === solver.zCenters[0]
      && this.dx === solver.dx && this.nx === solver.nx && this.nz === solver.nz;
    this.ready = false;
    return matches ? this : undefined;
  }
}
