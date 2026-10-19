import type { ShallowWaterSolver } from './ShallowWaterSolver';

const WET = 0.01;

/**
 * The rows a semi-Lagrangian step's departures from each solver row can read (the M1 CPU study, 2026-10-19): a cell's
 * departure lies `(qz / h)·dt` across shore from its centre, so a row's lies within its fastest across-shore current
 * over its shallowest wet depth, times dt; the departure search then reads the row below that point and the one above.
 * A field that is zero over all of those rows advects to zero there, whatever the departures: its carriers skip them.
 * Found lazily, row by row, for the water of one step (`begin`); h and q must not change meanwhile.
 */
export class DepartureRows {
  /** Per row, the lowest and highest row its departures read; low −1 when they cannot be bounded (a non-finite water). */
  private low = new Int32Array(0);
  private high = new Int32Array(0);
  private found = new Uint8Array(0);
  private solver?: ShallowWaterSolver;
  private dt = Number.NaN;

  begin(solver: ShallowWaterSolver, dt: number): void {
    const { nz } = solver;
    if (this.found.length !== nz) {
      this.low = new Int32Array(nz);
      this.high = new Int32Array(nz);
      this.found = new Uint8Array(nz);
    } else {
      this.found.fill(0);
    }
    this.solver = solver;
    this.dt = dt;
  }

  /**
   * Whether every departure from row `iz` reads only rows with no field: `prefix[r]` counts the rows below r that hold
   * some (length nz + 1).
   */
  quiet(iz: number, prefix: Int32Array): boolean {
    if (this.found[iz] === 0) this.find(iz);
    const low = this.low[iz];
    return low >= 0 && prefix[this.high[iz] + 1] - prefix[low] === 0;
  }

  private find(iz: number): void {
    const solver = this.solver!;
    const { nx, nz, h, qx, qz, zCenters } = solver;
    this.found[iz] = 1;
    let shallowest = Number.POSITIVE_INFINITY;
    let fastest = 0;
    for (let i = iz * nx, end = i + nx; i < end; i += 1) {
      const depth = h[i];
      // A dry cell takes no departure; NaN depth is wet to the carriers, and caught below.
      if (depth <= WET) continue;
      const along = qx[i];
      const across = qz[i];
      // x − x is 0 for a finite x, NaN for ±∞ or NaN.
      if ((depth - depth) + (along - along) + (across - across) !== 0) {
        this.low[iz] = -1;
        return;
      }
      shallowest = Math.min(shallowest, depth);
      fastest = Math.max(fastest, across < 0 ? -across : across);
    }
    if (shallowest === Number.POSITIVE_INFINITY) {
      // No wet cell: nothing departs, and the row's fields are cleared.
      this.low[iz] = iz;
      this.high[iz] = iz - 1;
      return;
    }
    // Rounding is monotonic, so |fl(fl(qz/h)·dt)| ≤ fl(fl(fastest/shallowest)·dt) in every cell; the pad is far past
    // the rounding of the departure's z.
    const reach = (fastest / shallowest) * this.dt;
    const centre = zCenters[iz];
    const pad = 1e-6 * (1 + (centre < 0 ? -centre : centre));
    this.low[iz] = rowAt(zCenters, nz, centre - reach - pad, iz);
    this.high[iz] = Math.min(nz - 1, rowAt(zCenters, nz, centre + reach + pad, iz) + 1);
  }
}

/** The carriers' departure search: the row below z (clamped to 0 … nz − 2), walking from `start`. */
function rowAt(zCenters: Float64Array, nz: number, z: number, start: number): number {
  let row = Math.min(start, nz - 2);
  while (row > 0 && zCenters[row] > z) row -= 1;
  while (row < nz - 2 && zCenters[row + 1] <= z) row += 1;
  return row;
}

/**
 * For each row, how many rows below it hold a field (`prefix[r]`, length nz + 1): any value other than ±0 in `a` or
 * `b` (or `c`). `DepartureRows.quiet` reads it.
 */
export function rowsWithField(nx: number, nz: number, prefix: Int32Array, a: Float64Array, b: Float64Array, c?: Float64Array): Int32Array {
  prefix[0] = 0;
  for (let iz = 0; iz < nz; iz += 1) {
    let some = 0;
    const end = (iz + 1) * nx;
    for (let i = iz * nx; i < end; i += 1) {
      if (a[i] !== 0 || b[i] !== 0 || (c !== undefined && c[i] !== 0)) {
        some = 1;
        break;
      }
    }
    prefix[iz + 1] = prefix[iz] + some;
  }
  return prefix;
}

/** A same-step departure lookup shared by fields carried on unchanged water. */
export class AdvectionStencil {
  indices = new Uint32Array(0);
  /** The original tx/tz fractions, in double precision. */
  values = new Float64Array(0);
  /** Rows whose departures foam recorded this step (it skips rows with no foam); the rest are left as they were. */
  recorded = new Uint8Array(0);
  /** The rows each row's departures read, on this step's water: aeration reuses foam's. */
  readonly rows = new DepartureRows();
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
    if (this.recorded.length !== solver.nz) this.recorded = new Uint8Array(solver.nz);
    // Every row counts as recorded unless its writer says otherwise (`skip`).
    this.recorded.fill(1);
    this.rows.begin(solver, dt);
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

  /** Row `iz`'s departures were not recorded: a reader finds them itself. */
  skip(iz: number): void { this.recorded[iz] = 0; }

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
