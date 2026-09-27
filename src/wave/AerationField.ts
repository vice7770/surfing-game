import { GRAVITY } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

/**
 * The air breaking drives into the water (G9), from `docs/research/whitewater-sources.md`:
 * - `share` (β): share of the dissipated energy spent entraining air against buoyancy, 4–14 % in
 *   surf-zone breakers (Blenkinsopp & Chaplin 2007);
 * - `plungeDepth` (κ_p) and `boreDepth` (κ_s): plume depth per breaker or bore height (provisional);
 * - `riseSpeed` (w_b): bubbles of radius above 0.5 mm rise at 0.2–0.3 m/s (Deane & Stokes 2002);
 * - `peak` (α_max): the most air a surf-zone plume holds, about 20 % under plunging breakers
 *   (Blenkinsopp & Chaplin 2007). Air driven in beyond it vents at once.
 */
export const AERATION = { share: 0.1, plungeDepth: 0.8, boreDepth: 0.3, riseSpeed: 0.25, peak: 0.2 } as const;

const DENSITY = 1025;
const WET = 0.01;
const TRACE = 1e-7;
/** Plumes thinner than this still degas at this depth's rate, m (a numerical floor). */
const MIN_DEPTH = 0.05;

/**
 * Entrained air on the solver grid (G9): per cell, the air it holds per unit
 * area (m³/m², its depth if it were one layer) and the plume's depth. Air
 * enters where lip water lands (a share of the impact's energy spent against
 * buoyancy, carried down to half the plunge's depth on average), where bores
 * dissipate, and where trapped tubes break into bubbles. A plunge's or a
 * tube's bubbles fill a plume as wide as it is deep (provisional). It is carried by the
 * current semi-Lagrangian, like the foam, and degasses as its bubbles rise
 * out of the plume. It never feeds back into the water.
 */
export class AerationField {
  readonly air: Float64Array;
  readonly depth: Float64Array;
  private readonly nextAir: Float64Array;
  private readonly nextDepth: Float64Array;
  private windowX: number;

  constructor(private readonly solver: ShallowWaterSolver) {
    const size = solver.h.length;
    this.air = new Float64Array(size);
    this.depth = new Float64Array(size);
    this.nextAir = new Float64Array(size);
    this.nextDepth = new Float64Array(size);
    this.windowX = solver.xCenters[0];
  }

  /** A plunge that dissipated `energy` J at (x, z), driving its bubbles `penetration` m down. */
  addPlunge(x: number, z: number, energy: number, penetration: number): void {
    this.followWindow();
    const cell = this.solver.cellIndex(x, z);
    const reach = this.reach(cell, penetration);
    if (!(reach > 0) || !(energy > 0)) return;
    this.spread(x, z, (AERATION.share * energy) / (DENSITY * GRAVITY * (reach / 2)), reach);
  }

  /**
   * A bore dissipating `dissipation` (energy per unit crest length over ρ,
   * m⁴/s³, `boreDissipation`) for `dt` s in `cell`, `height` m high: β of the
   * energy its cell's width of crest loses, as air held against buoyancy at
   * half the plume's depth (the cell holds it, where the bore dissipates).
   */
  addBore(cell: number, dissipation: number, height: number, dt: number): void {
    this.followWindow();
    const reach = this.reach(cell, AERATION.boreDepth * height);
    if (!(reach > 0) || !(dissipation > 0)) return;
    this.addTo(cell, (AERATION.share * dissipation * dt * this.solver.dx) / (GRAVITY * (reach / 2)), reach);
  }

  /** Trapped air of `volume` m³ broken into bubbles at (x, z), `penetration` m down. */
  addAir(x: number, z: number, volume: number, penetration: number): void {
    this.followWindow();
    const cell = this.solver.cellIndex(x, z);
    const reach = this.reach(cell, penetration);
    if (!(reach > 0) || !(volume > 0)) return;
    this.spread(x, z, volume, reach);
  }

  /** The void fraction the plume holds: its air over its depth, 0 … 1. */
  voidFraction(cell: number): number {
    const depth = this.depth[cell];
    return depth > 0 ? Math.min(1, this.air[cell] / depth) : 0;
  }

  /** Advance by `dt` s: carry with the current, and degas as the bubbles rise out of the plume. */
  update(dt: number): void {
    if (!(dt > 0)) return;
    this.followWindow();
    this.advect(dt);
    const { h } = this.solver;
    for (let i = 0; i < h.length; i += 1) {
      if (h[i] <= WET || this.air[i] === 0) {
        // Dry water holds no air, and water with none has nothing to degas.
        this.air[i] = 0;
        this.depth[i] = 0;
        continue;
      }
      const depth = Math.min(this.depth[i], h[i]);
      const air = this.air[i] * Math.exp((-AERATION.riseSpeed * dt) / Math.max(MIN_DEPTH, depth));
      this.air[i] = air < TRACE ? 0 : Math.min(air, AERATION.peak * depth);
      this.depth[i] = this.air[i] > 0 ? depth : 0;
    }
  }

  private reach(cell: number, penetration: number): number {
    return Math.min(penetration, this.solver.h[cell]);
  }

  /**
   * `volume` m³ of air over the wet cells whose centres lie within `radius` of
   * (x, z) (always the cell it lands in), evenly per square metre, each down to
   * `radius` or its water's depth.
   */
  private spread(x: number, z: number, volume: number, radius: number): void {
    const { nx, nz, xCenters, zCenters, dx, dz, h } = this.solver;
    const centre = this.solver.cellIndex(x, z);
    const column = centre % nx;
    const row = Math.floor(centre / nx);
    const span = Math.ceil(radius / dx);
    const cells = this.plume;
    cells.length = 0;
    let area = 0;
    for (const step of [-1, 1]) {
      for (let iz = step < 0 ? row : row + 1; iz >= 0 && iz < nz; iz += step) {
        const across = zCenters[iz] - z;
        if (iz !== row && Math.abs(across) > radius) break;
        for (let ix = Math.max(0, column - span); ix <= Math.min(nx - 1, column + span); ix += 1) {
          const i = iz * nx + ix;
          const inside = i === centre || Math.hypot(xCenters[ix] - x, across) <= radius;
          if (!inside || h[i] <= WET) continue;
          cells.push(i);
          area += dx * dz[iz];
        }
      }
    }
    for (const i of cells) this.addTo(i, (volume * dx * dz[Math.floor(i / nx)]) / area, this.reach(i, radius));
  }

  private readonly plume: number[] = [];

  private addTo(cell: number, volume: number, reach: number): void {
    const { dx, dz, nx } = this.solver;
    const area = dx * dz[Math.floor(cell / nx)];
    this.depth[cell] = Math.max(this.depth[cell], reach);
    this.air[cell] = Math.min(AERATION.peak * this.depth[cell], this.air[cell] + volume / area);
  }

  /** Semi-Lagrangian step: each cell takes the air (and plume depth) found upstream at x − u·dt. */
  private advect(dt: number): void {
    const { nx, nz, h, qx, qz, xCenters, zCenters, dx } = this.solver;
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const water = h[i];
        if (water <= WET) {
          this.nextAir[i] = 0;
          this.nextDepth[i] = 0;
          continue;
        }
        const x = xCenters[ix] - (qx[i] / water) * dt;
        const z = zCenters[iz] - (qz[i] / water) * dt;
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
        this.nextAir[i] = this.air[k] * w00 + this.air[k + 1] * w10 + this.air[k + nx] * w01 + this.air[k + nx + 1] * w11;
        this.nextDepth[i] = Math.max(this.depth[k] * (w00 > 0 ? 1 : 0), this.depth[k + 1] * (w10 > 0 ? 1 : 0), this.depth[k + nx] * (w01 > 0 ? 1 : 0), this.depth[k + nx + 1] * (w11 > 0 ? 1 : 0));
      }
    }
    this.air.set(this.nextAir);
    this.depth.set(this.nextDepth);
  }

  /**
   * Shift with the solver when its window slides, so air stays on the same
   * water; new columns start clear. Every add follows first, so air added in
   * the window it arrives in is not shifted again.
   */
  private followWindow(): void {
    const { nx, nz, dx, xCenters } = this.solver;
    const shift = Math.round((xCenters[0] - this.windowX) / dx);
    this.windowX = xCenters[0];
    if (shift === 0) return;
    for (const values of [this.air, this.depth]) {
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
