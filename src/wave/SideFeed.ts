import { smoothstep } from './Bathymetry';
import type { SeaState } from './SeaState';
import { relaxationRamp, type RelaxationZone, type ShallowWaterSolver, type WaterTarget } from './ShallowWaterSolver';
import { transformedSea } from './warmStart';

/**
 * The side feed (the wave-sizes spec): the window's open side edges let a
 * directionally spread sea's energy drift out, and nothing entered from the
 * neighbouring coast, so a 160 m window lost up to a third of its wave height
 * within 150 m. The outer `width` m of each side now relax toward the incoming
 * sea, shoaled and refracted over the bed as the warm start fills it, from the
 * offshore zone's inner edge while the shoaled Hs stays under `breakingShare`
 * of the depth and the bed no steeper than `maxSlope` (where the warm start's
 * mild-slope transform holds: a reef's steep edge reflects), fading over
 * `fade` m. The share is the warm start's depth-limited cap (McCowan γ): the
 * feed reaches where the sets break, because a big day's outer surf zone is
 * hundreds of metres wide and stopping outside it (at 0.45 h) let it drain
 * (the user's decision, 2026-09-28).
 */
/** The warm start's depth-limited cap on the fed sea (McCowan γ). */
const GAMMA = 0.78;
export const SIDE_FEED = { width: 30, breakingShare: GAMMA, fade: 40, maxSlope: 0.06 };

/**
 * One side's strip. Its sea is the edge column's transform (per row: amplitude
 * and phase, as A cos Ψ and A sin Ψ, and the flux speeds), carried across the
 * strip by each component's along-shore phase kx·(x − x_edge): the row ×
 * column factoring the offshore zone uses, exact where the bed is uniform
 * along shore, and a few MB even on the longest tanks.
 */
interface Strip {
  edge: number;
  /** +1 from the left edge inward, −1 from the right. */
  step: number;
  columns: number;
  firstRow: number;
  rows: number;
  /** Per row × component: A cos Ψ, A sin Ψ, speed across (x) and along (z) the flux. */
  rowTable: Float64Array;
  /** Per column × component: cos and sin of kx·(x − x_edge). */
  columnTable: Float64Array;
}

/** A strip cell as the device reads it: its cell, weight, and where its row's and column's factors start. */
export interface SideFeedTables {
  components: number;
  omega: Float64Array;
  /** Per slot: cell index, weight, row-table offset, column-table offset (into `rows` and `columns`). */
  slots: Float64Array;
  rows: Float64Array;
  columns: Float64Array;
}

export class SideFeed implements RelaxationZone {
  readonly weights: Float64Array;
  /** Sea time at solver time 0, s (a handed-over sea takes the donor's, as the offshore zone does). */
  timeOffset: number;
  private readonly referenceZ: number;
  private readonly count: number;
  private readonly omega: Float64Array;
  private strips: Strip[] = [];
  /** Per solver cell: which strip, row and column it is (strip + 2·(column + columns·row)), or −1. */
  private readonly where: Int32Array;
  /** cos ωt and sin ωt of each component at the cached sea time. */
  private readonly timeCos: Float64Array;
  private readonly timeSin: Float64Array;
  private cachedSeaTime = Number.NaN;

  constructor(private readonly solver: ShallowWaterSolver, readonly sea: SeaState, options: { referenceZ: number; timeOffset: number }) {
    this.referenceZ = options.referenceZ;
    this.timeOffset = options.timeOffset;
    this.count = sea.components.length;
    this.omega = Float64Array.from(sea.components, (component) => component.omega);
    this.timeCos = new Float64Array(this.count);
    this.timeSin = new Float64Array(this.count);
    this.weights = new Float64Array(solver.nx * solver.nz);
    this.where = new Int32Array(solver.nx * solver.nz);
    this.build();
  }

  /** The window slid along shore: the strips stay at its edges, over the bed now under them. */
  afterShift(): void {
    this.build();
  }

  /** How many strip cells the device steps, and the sea's components. */
  deviceShape(): { slots: number; components: number } {
    let slots = 0;
    for (const weight of this.weights) if (weight > 0) slots += 1;
    return { slots, components: this.count };
  }

  target(_x: number, _z: number, t: number, out: WaterTarget, index: number): void {
    const where = index >= 0 ? this.where[index] : -1;
    if (where < 0) {
      out.eta = 0;
      out.qx = 0;
      out.qz = 0;
      return;
    }
    const seaTime = t + this.timeOffset;
    if (seaTime !== this.cachedSeaTime) {
      for (let c = 0; c < this.count; c += 1) {
        this.timeCos[c] = Math.cos(this.omega[c] * seaTime);
        this.timeSin[c] = Math.sin(this.omega[c] * seaTime);
      }
      this.cachedSeaTime = seaTime;
    }
    const strip = this.strips[where % 2];
    const cell = (where - (where % 2)) / 2;
    const column = cell % strip.columns;
    const row = (cell - column) / strip.columns;
    const rowBase = row * this.count * 4;
    const columnBase = column * this.count * 2;
    const { rowTable, columnTable } = strip;
    let eta = 0;
    let qx = 0;
    let qz = 0;
    for (let c = 0; c < this.count; c += 1) {
      const r = rowBase + c * 4;
      const k = columnBase + c * 2;
      // A e^{i(Ψ + kx·Δx)}, then its real part at the sea time: cos(Φ − ωt) = cos Φ cos ωt + sin Φ sin ωt.
      const real = rowTable[r] * columnTable[k] - rowTable[r + 1] * columnTable[k + 1];
      const imaginary = rowTable[r] * columnTable[k + 1] + rowTable[r + 1] * columnTable[k];
      const value = real * this.timeCos[c] + imaginary * this.timeSin[c];
      eta += value;
      qx += rowTable[r + 2] * value;
      qz += rowTable[r + 3] * value;
    }
    out.eta = eta;
    out.qx = qx;
    out.qz = qz;
  }

  /** The strips as flat tables for the device (GpuBoussinesq): every weighted cell, and each strip's factors. */
  deviceTables(): SideFeedTables {
    const rowOffsets: number[] = [];
    const columnOffsets: number[] = [];
    let rowsLength = 0;
    let columnsLength = 0;
    for (const strip of this.strips) {
      rowOffsets.push(rowsLength);
      columnOffsets.push(columnsLength);
      rowsLength += strip.rowTable.length;
      columnsLength += strip.columnTable.length;
    }
    const rows = new Float64Array(rowsLength);
    const columns = new Float64Array(columnsLength);
    this.strips.forEach((strip, s) => {
      rows.set(strip.rowTable, rowOffsets[s]);
      columns.set(strip.columnTable, columnOffsets[s]);
    });
    const slots: number[] = [];
    for (let i = 0; i < this.weights.length; i += 1) {
      if (!(this.weights[i] > 0)) continue;
      const where = this.where[i];
      const s = where % 2;
      const strip = this.strips[s];
      const cell = (where - s) / 2;
      const column = cell % strip.columns;
      const row = (cell - column) / strip.columns;
      slots.push(i, this.weights[i], rowOffsets[s] + row * this.count * 4, columnOffsets[s] + column * this.count * 2);
    }
    return { components: this.count, omega: this.omega, slots: Float64Array.from(slots), rows, columns };
  }

  private build(): void {
    const { solver, count } = this;
    const { nx, dx } = solver;
    this.weights.fill(0);
    this.where.fill(-1);
    // Each strip takes at most a quarter of the window, so a narrow window keeps its middle half free.
    const width = Math.min(SIDE_FEED.width, (nx * dx) / 4);
    const columns = Math.ceil(width / dx - 1e-9);
    const components = this.sea.components;
    this.strips = [0, nx - 1].map((edge, s): Strip => {
      const step = s === 0 ? 1 : -1;
      // The edge column's sea, row by row, until its shoaled Hs reaches the breaking share of the depth.
      const rows: { iz: number; values: Float64Array }[] = [];
      let end = Infinity;
      let previous: { z: number; depth: number } | undefined;
      transformedSea(solver, this.sea, this.referenceZ, edge, GAMMA, (iz, row) => {
        const z = solver.zCenters[iz];
        if (z <= this.referenceZ || end < Infinity) return;
        const slope = previous ? (previous.depth - row.depth) / (z - previous.z) : 0;
        previous = { z, depth: row.depth };
        if (!(row.depth > 0) || row.hs >= SIDE_FEED.breakingShare * row.depth || slope > SIDE_FEED.maxSlope) {
          end = z;
          return;
        }
        const values = new Float64Array(count * 4);
        for (let c = 0; c < count; c += 1) {
          const amplitude = row.scale * row.amplitude[c];
          values[c * 4] = amplitude * Math.cos(row.phase[c]);
          values[c * 4 + 1] = amplitude * Math.sin(row.phase[c]);
          values[c * 4 + 2] = row.speedX[c];
          values[c * 4 + 3] = row.speedZ[c];
        }
        rows.push({ iz, values });
      });
      const firstRow = rows.length ? rows[0].iz : 0;
      const rowTable = new Float64Array(rows.length * count * 4);
      rows.forEach((row, r) => rowTable.set(row.values, r * count * 4));
      const columnTable = new Float64Array(columns * count * 2);
      for (let j = 0; j < columns; j += 1) {
        const offset = solver.xCenters[edge + step * j] - solver.xCenters[edge];
        for (let c = 0; c < count; c += 1) {
          columnTable[(j * count + c) * 2] = Math.cos(components[c].kx * offset);
          columnTable[(j * count + c) * 2 + 1] = Math.sin(components[c].kx * offset);
        }
      }
      // Weights: ramped across the strip like the offshore zone, faded in the last metres before the surf zone.
      rows.forEach((row, r) => {
        const z = solver.zCenters[row.iz];
        const fade = end === Infinity ? 1 : smoothstep(end, end - SIDE_FEED.fade, z);
        for (let j = 0; j < columns; j += 1) {
          const fromEdge = (j + 0.5) * dx;
          const weight = relaxationRamp(1 - fromEdge / width) * fade;
          if (!(weight > 0)) continue;
          const i = row.iz * nx + edge + step * j;
          this.weights[i] = weight;
          this.where[i] = s + 2 * (j + columns * r);
        }
      });
      return { edge, step, columns, firstRow, rows: rows.length, rowTable, columnTable };
    });
  }
}
