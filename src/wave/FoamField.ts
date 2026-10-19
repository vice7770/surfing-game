import { GRAVITY } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';
import { DepartureRows, rowsWithField, type AdvectionStencil } from './AdvectionStencil';

/** Foam e-folding times, s: dense whitewater, and the residual lace it leaves. */
export interface FoamDecay {
  readonly dense: number;
  readonly residual: number;
}

/**
 * Dense foam made per second by a fully breaking (B = 1) reference bore; a
 * roller is white, so it covers the surface within a quarter second. Bores
 * make foam in proportion to their dissipation, so weaker ones make less.
 */
export const FOAM_SOURCE_RATE = 4;
/** A modest surf bore: 0.25 m running onto 1 m of still water. */
export const REFERENCE_BORE = { stillDepth: 1, depth: 1.25 };
/** Share of the dense foam that decays into residual lace instead of vanishing (a game value). */
export const LACE_SHARE = 0.3;
/** Depth of landed lip water that covers a cell with foam, m. */
export const SPLASH_DEPTH = 0.05;
const WET = 0.01;
const TRACE = 1e-6;

/**
 * Energy a bore dissipates per unit crest length, divided by ρ, m³/s³: g q ΔH,
 * with the hydraulic-jump head loss ΔH = (h₂ − h₁)³/(4 h₁ h₂), the bore speed
 * c = √(g h₂ (h₁ + h₂)/(2 h₁)) and the discharge through it q = c h₁ (e.g. Chow 1959).
 * The still depth ahead is h₁ and the local depth behind the front h₂.
 */
export function boreDissipation(stillDepth: number, depth: number): number {
  if (!(stillDepth > 0) || !(depth > stillDepth)) return 0;
  const headLoss = (depth - stillDepth) ** 3 / (4 * stillDepth * depth);
  const speed = Math.sqrt((GRAVITY * depth * (stillDepth + depth)) / (2 * stillDepth));
  return GRAVITY * speed * stillDepth * headLoss;
}

const REFERENCE_DISSIPATION = boreDissipation(REFERENCE_BORE.stillDepth, REFERENCE_BORE.depth);

/**
 * Foam carried by the flow on the solver grid (plan §2.4, G4): ∂F/∂t + u·∇F = S − F/τ.
 * F is the fraction of the surface covered by foam, split into dense whitewater
 * and the residual lace it decays into, which lasts longer (the two regimes of
 * Callaghan et al. 2013). Each update advects both semi-Lagrangian with the
 * solver's depth-averaged velocity, decays them exactly, and adds the breaking
 * strength times the bore's dissipation. Lip splashes add foam where they land.
 * The foam never feeds back into the water.
 */
export class FoamField {
  readonly dense: Float64Array;
  readonly residual: Float64Array;
  /** Dense foam bores made per second in each cell at the last update (it also drives the bubbles). */
  readonly source: Float64Array;
  /** Positive bore sources, sorted by cell: the visual clouds skip the rest of the grid. */
  readonly sourceCells: Uint32Array;
  sourceCount = 0;
  /** Wet breaking cells and their dissipated power: aeration reads the same bore measurement. */
  readonly breakingCells: Uint32Array;
  readonly dissipation: Float64Array;
  breakingCount = 0;
  private readonly nextDense: Float64Array;
  private readonly nextResidual: Float64Array;
  /** The rows the departures read, when no shared stencil brings them, and which rows hold foam (`rowsWithField`). */
  private readonly rows = new DepartureRows();
  private readonly foamedRows: Int32Array;
  private windowX: number;
  /**
   * A shoreward surface drift per cell, m/s (+z), the foam alone rides on top of the depth-averaged current (the Canyon
   * spilling lip's look: `setDrift`); none by default. The advection stencil it records for the air stays the current's.
   */
  private drift?: Float64Array;

  constructor(private readonly solver: ShallowWaterSolver, readonly decay: FoamDecay) {
    const size = solver.nx * solver.nz;
    this.dense = new Float64Array(size);
    this.residual = new Float64Array(size);
    this.source = new Float64Array(size);
    this.sourceCells = new Uint32Array(size);
    this.breakingCells = new Uint32Array(size);
    this.dissipation = new Float64Array(size);
    this.nextDense = new Float64Array(size);
    this.nextResidual = new Float64Array(size);
    this.foamedRows = new Int32Array(solver.nz + 1);
    this.windowX = solver.xCenters[0];
  }

  /**
   * Foam drifts shoreward at `drift` m/s per cell on top of the current (the Canyon spilling lip, round 2): nature clears
   * a shoulder of the last waves' foam by the breakers' shoreward surface drift (Hansen & Svendsen 1984), which a
   * depth-averaged current lacks. Look only: the foam is drawn, never felt, and the stencil the air reuses keeps the
   * current's own departure points. Undefined: none.
   */
  setDrift(drift: Float64Array | undefined): void {
    if (drift && drift.length !== this.dense.length) throw new Error('A foam drift from another grid');
    this.drift = drift;
  }

  totalAt(index: number): number {
    return this.dense[index] + this.residual[index];
  }

  /** Cover the cell a lip parcel of `volume` m³ lands in; none past an open edge, where it has left the window. */
  addSplash(x: number, z: number, volume: number): void {
    const { solver } = this;
    if (solver.beyondOpenEdge(x)) return;
    const cell = solver.cellIndex(x, z);
    const area = solver.dx * solver.dz[Math.floor(cell / solver.nx)];
    this.dense[cell] = Math.min(1, this.dense[cell] + volume / (area * SPLASH_DEPTH));
    this.residual[cell] = Math.min(this.residual[cell], 1 - this.dense[cell]);
  }

  /**
   * Advance by `dt` seconds with the breaking strength B per cell: carry the foam semi-Lagrangian, decay it exactly and
   * add the bores' foam, in one pass over the cells (the M1 CPU study, 2026-10-19). A row whose departures read only
   * rows with no foam carries none and takes no departures (`DepartureRows`, widened by the drift); its bores still add
   * theirs. `drawn` (the Canyon spilling lip's look): the breaking whose foam is drawn, at most `breaking` in every cell;
   * the foam, its source and the visual clouds that read the source follow it, while the bore measurement the air reads
   * (`breakingCells`, `dissipation`) stays `breaking`'s.
   */
  update(dt: number, breaking: ArrayLike<number>, stencil?: AdvectionStencil, drawn?: ArrayLike<number>): void {
    if (!(dt > 0)) return;
    this.followWindow();
    const { nx, nz, h, qx, qz, xCenters, zCenters, dx, bed, restLevel } = this.solver;
    stencil?.begin(this.solver, dt);
    const rows = stencil ? stencil.rows : this.rows;
    if (!stencil) rows.begin(this.solver, dt);
    const { dense, residual, nextDense, nextResidual, source, sourceCells, breakingCells, dissipation, drift } = this;
    const foamed = rowsWithField(nx, nz, this.foamedRows, dense, residual);
    const indices = stencil?.indices;
    const values = stencil?.values;
    const keepDense = Math.exp(-dt / this.decay.dense);
    const keepLace = Math.exp(-dt / this.decay.residual);
    let sources = 0;
    let breakers = 0;
    for (let iz = 0; iz < nz; iz += 1) {
      // Only rows next to foam-free rows can be quiet; the rest need not look.
      const clear = foamed[Math.min(nz, iz + 2)] - foamed[Math.max(0, iz - 1)] === 0 && rows.quiet(iz, foamed, drift);
      if (clear) {
        stencil?.skip(iz);
        // Nothing carried in: a cell ends with foam only from its own bore (0·keep + 0 is +0, flushed as before).
        const start = iz * nx;
        const end = start + nx;
        nextDense.fill(0, start, end);
        nextResidual.fill(0, start, end);
        source.fill(0, start, end);
        for (let i = start; i < end; i += 1) {
          const strength = breaking[i];
          if (!(strength > 0) || h[i] <= WET) continue;
          const bore = boreDissipation(restLevel - bed[i], h[i]);
          breakingCells[breakers++] = i;
          dissipation[i] = strength * bore;
          const shown = drawn ? drawn[i] : strength;
          const rate = shown > 0 ? (shown * FOAM_SOURCE_RATE * bore) / REFERENCE_DISSIPATION : 0;
          source[i] = rate;
          if (rate > 0) sourceCells[sources++] = i;
          const next = 0 + rate * dt;
          const kept = next < TRACE ? 0 : Math.min(1, next);
          nextDense[i] = kept;
        }
        continue;
      }
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const depth = h[i];
        if (depth <= WET) {
          nextDense[i] = 0;
          nextResidual[i] = 0;
          source[i] = 0;
          continue;
        }
        let previous = 0;
        let carried = 0;
        if (!clear) {
          const x = xCenters[ix] - (qx[i] / depth) * dt;
          const z = zCenters[iz] - (qz[i] / depth) * dt;
          const gx = Math.min(nx - 1, Math.max(0, (x - xCenters[0]) / dx));
          const column = Math.min(nx - 2, Math.floor(gx));
          const tx = gx - column;
          let row = Math.min(iz, nz - 2);
          while (row > 0 && zCenters[row] > z) row -= 1;
          while (row < nz - 2 && zCenters[row + 1] <= z) row += 1;
          const tz = Math.min(1, Math.max(0, (z - zCenters[row]) / (zCenters[row + 1] - zCenters[row])));
          let k = row * nx + column;
          if (indices && values) {
            indices[i] = k;
            values[i * 2] = tx;
            values[i * 2 + 1] = tz;
          }
          let tzd = tz;
          const shift = drift ? drift[i] * dt : 0;
          if (shift > 0) {
            // The foam's own departure, further seaward by its drift: the stencil above keeps the current's.
            const zd = z - shift;
            let rowd = row;
            while (rowd > 0 && zCenters[rowd] > zd) rowd -= 1;
            tzd = Math.min(1, Math.max(0, (zd - zCenters[rowd]) / (zCenters[rowd + 1] - zCenters[rowd])));
            k = rowd * nx + column;
          }
          const w00 = (1 - tx) * (1 - tzd);
          const w10 = tx * (1 - tzd);
          const w01 = (1 - tx) * tzd;
          const w11 = tx * tzd;
          previous = dense[k] * w00 + dense[k + 1] * w10 + dense[k + nx] * w01 + dense[k + nx + 1] * w11;
          carried = residual[k] * w00 + residual[k + 1] * w10 + residual[k + nx] * w01 + residual[k + nx + 1] * w11;
        }
        let next = previous * keepDense;
        const lace = carried * keepLace + LACE_SHARE * (previous - next);
        const strength = breaking[i];
        let bore = 0;
        if (strength > 0) {
          bore = boreDissipation(restLevel - bed[i], depth);
          breakingCells[breakers++] = i;
          dissipation[i] = strength * bore;
        }
        const shown = drawn ? drawn[i] : strength;
        const rate = strength > 0 && shown > 0 ? (shown * FOAM_SOURCE_RATE * bore) / REFERENCE_DISSIPATION : 0;
        source[i] = rate;
        if (rate > 0) sourceCells[sources++] = i;
        next += rate * dt;
        // Flush traces the resampling spreads upstream; they would never show.
        const kept = next < TRACE ? 0 : Math.min(1, next);
        nextDense[i] = kept;
        nextResidual[i] = lace < TRACE ? 0 : Math.min(lace, 1 - kept);
      }
    }
    this.sourceCount = sources;
    this.breakingCount = breakers;
    dense.set(nextDense);
    residual.set(nextResidual);
    stencil?.commit();
  }

  /** Rebuild the derived index after a tool or test directly edits `source`; normal updates build it as they go. */
  reindexSources(): void {
    this.sourceCount = 0;
    for (let i = 0; i < this.source.length; i += 1) {
      if (this.source[i] > 0) this.sourceCells[this.sourceCount++] = i;
    }
  }

  /** Shift with the solver when its window slides, so foam stays on the same water; new columns start clean. */
  private followWindow(): void {
    const { nx, nz, dx, xCenters } = this.solver;
    const shift = Math.round((xCenters[0] - this.windowX) / dx);
    this.windowX = xCenters[0];
    if (shift === 0) return;
    for (const values of [this.dense, this.residual]) {
      for (let iz = 0; iz < nz; iz += 1) {
        const row = iz * nx;
        if (Math.abs(shift) >= nx) {
          values.fill(0, row, row + nx);
        } else if (shift > 0) {
          values.copyWithin(row, row + shift, row + nx);
          values.fill(0, row + nx - shift, row + nx);
        } else {
          values.copyWithin(row - shift, row, row + nx + shift);
          values.fill(0, row, row - shift);
        }
      }
    }
  }
}
