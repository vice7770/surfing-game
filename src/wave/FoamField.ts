import { GRAVITY } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

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
  private readonly nextDense: Float64Array;
  private readonly nextResidual: Float64Array;
  private windowX: number;

  constructor(private readonly solver: ShallowWaterSolver, readonly decay: FoamDecay) {
    const size = solver.nx * solver.nz;
    this.dense = new Float64Array(size);
    this.residual = new Float64Array(size);
    this.source = new Float64Array(size);
    this.nextDense = new Float64Array(size);
    this.nextResidual = new Float64Array(size);
    this.windowX = solver.xCenters[0];
  }

  totalAt(index: number): number {
    return this.dense[index] + this.residual[index];
  }

  /** Cover the cell a lip parcel of `volume` m³ lands in. */
  addSplash(x: number, z: number, volume: number): void {
    const { solver } = this;
    const cell = solver.cellIndex(x, z);
    const area = solver.dx * solver.dz[Math.floor(cell / solver.nx)];
    this.dense[cell] = Math.min(1, this.dense[cell] + volume / (area * SPLASH_DEPTH));
    this.residual[cell] = Math.min(this.residual[cell], 1 - this.dense[cell]);
  }

  /** Advance by `dt` seconds with the breaking strength B per cell. */
  update(dt: number, breaking: ArrayLike<number>): void {
    if (!(dt > 0)) return;
    this.followWindow();
    this.advect(dt);
    const { h, bed, restLevel } = this.solver;
    const keepDense = Math.exp(-dt / this.decay.dense);
    const keepLace = Math.exp(-dt / this.decay.residual);
    for (let i = 0; i < h.length; i += 1) {
      if (h[i] <= WET) {
        this.dense[i] = 0;
        this.residual[i] = 0;
        this.source[i] = 0;
        continue;
      }
      const previous = this.dense[i];
      let dense = previous * keepDense;
      const lace = this.residual[i] * keepLace + LACE_SHARE * (previous - dense);
      const strength = breaking[i];
      const rate = strength > 0 ? (strength * FOAM_SOURCE_RATE * boreDissipation(restLevel - bed[i], h[i])) / REFERENCE_DISSIPATION : 0;
      this.source[i] = rate;
      dense += rate * dt;
      // Flush traces the resampling spreads upstream; they would never show.
      this.dense[i] = dense < TRACE ? 0 : Math.min(1, dense);
      this.residual[i] = lace < TRACE ? 0 : Math.min(lace, 1 - this.dense[i]);
    }
  }

  /** Semi-Lagrangian step: each cell takes the foam found upstream at x − u·dt. */
  private advect(dt: number): void {
    const { nx, nz, h, qx, qz, xCenters, zCenters, dx } = this.solver;
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const depth = h[i];
        if (depth <= WET) {
          this.nextDense[i] = 0;
          this.nextResidual[i] = 0;
          continue;
        }
        const x = xCenters[ix] - (qx[i] / depth) * dt;
        const z = zCenters[iz] - (qz[i] / depth) * dt;
        const gx = Math.min(nx - 1, Math.max(0, (x - xCenters[0]) / dx));
        const column = Math.min(nx - 2, Math.floor(gx));
        const tx = gx - column;
        let row = Math.min(iz, nz - 2);
        while (row > 0 && zCenters[row] > z) row -= 1;
        while (row < nz - 2 && zCenters[row + 1] <= z) row += 1;
        const tz = Math.min(1, Math.max(0, (z - zCenters[row]) / (zCenters[row + 1] - zCenters[row])));
        const k = row * nx + column;
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        this.nextDense[i] = this.dense[k] * w00 + this.dense[k + 1] * w10 + this.dense[k + nx] * w01 + this.dense[k + nx + 1] * w11;
        this.nextResidual[i] = this.residual[k] * w00 + this.residual[k + 1] * w10 + this.residual[k + nx] * w01 + this.residual[k + nx + 1] * w11;
      }
    }
    this.dense.set(this.nextDense);
    this.residual.set(this.nextResidual);
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
