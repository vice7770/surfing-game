import { GRAVITY } from './dispersion';
import type { ShallowWaterSolver } from './ShallowWaterSolver';
import { DepartureRows, rowsWithField, type AdvectionStencil } from './AdvectionStencil';

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

/**
 * The plume's turbulence (the wipeout spec, Part B), provisional:
 * - under breaking of strength B in water h deep, the turbulent kinetic energy k
 *   relaxes over `rise` s toward (ratio · √(g h))² · B: Ting & Kirby (1995,
 *   1996) measured √k / √(g h) of about 0.1–0.2 under broken waves;
 * - once the breaking has passed it fades with an e-folding time of
 *   `decayShare` of the peak period, so it is all but gone within one period
 *   (plunging breakers dissipate their turbulence within about one wave period);
 * - it is carried by the current like the air.
 */
export const TURBULENCE = { ratio: 0.15, rise: 0.5, decayShare: 1 / 3 } as const;

const DENSITY = 1025;
const WET = 0.01;
const TRACE = 1e-7;
/** A plume spreads to the rows either side of where it lands. */
const ACROSS = [-1, 1] as const;
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
  /** The turbulent kinetic energy in each cell's water, m²/s² (`TURBULENCE`). */
  readonly turbulence: Float64Array;
  private readonly nextAir: Float64Array;
  private readonly nextDepth: Float64Array;
  private readonly nextTurbulence: Float64Array;
  /** Cells breaking stirred since the latest update: they hold their turbulence rather than fade. */
  private readonly stirred: Uint8Array;
  /** The rows the departures read, when no shared stencil brings them, and which rows hold air (`rowsWithField`). */
  private readonly rows = new DepartureRows();
  private readonly aeratedRows: Int32Array;
  private windowX: number;
  private readonly period: number;
  private stirDt = Number.NaN;
  private stirGain = 0;

  /** `period`: the swell's peak period, s, which sets how fast the turbulence fades. */
  constructor(private readonly solver: ShallowWaterSolver, options: { period?: number } = {}) {
    const size = solver.h.length;
    this.air = new Float64Array(size);
    this.depth = new Float64Array(size);
    this.turbulence = new Float64Array(size);
    this.nextAir = new Float64Array(size);
    this.nextDepth = new Float64Array(size);
    this.nextTurbulence = new Float64Array(size);
    this.stirred = new Uint8Array(size);
    this.aeratedRows = new Int32Array(solver.nz + 1);
    this.windowX = solver.xCenters[0];
    this.period = options.period ?? 10;
  }

  /** Breaking of strength `strength` (0–1) in `cell` for `dt` s stirs its water toward Ting & Kirby's intensity. */
  stir(cell: number, strength: number, dt: number): void {
    this.followWindow();
    const depth = this.solver.h[cell];
    if (!(depth > WET) || !(strength > 0)) return;
    this.stirred[cell] = 1;
    const target = (TURBULENCE.ratio * Math.sqrt(GRAVITY * depth)) ** 2 * Math.min(1, strength);
    if (target > this.turbulence[cell]) {
      if (dt !== this.stirDt) {
        this.stirDt = dt;
        this.stirGain = 1 - Math.exp(-dt / TURBULENCE.rise);
      }
      this.turbulence[cell] += (target - this.turbulence[cell]) * this.stirGain;
    }
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

  /**
   * Advance by `dt` s: carry with the current, and degas as the bubbles rise out of the plume, in one pass over the
   * cells (the M1 CPU study, 2026-10-19). Departures come from foam's stencil where it recorded them; a row whose
   * departures read only rows with no air, plume or turbulence carries none and is cleared (`DepartureRows`).
   */
  update(dt: number, stencil?: AdvectionStencil): void {
    if (!(dt > 0)) return;
    this.followWindow();
    const shared = stencil?.take(this.solver, dt);
    const { nx, nz, h, qx, qz, xCenters, zCenters, dx } = this.solver;
    const rows = shared ? shared.rows : this.rows;
    if (!shared) rows.begin(this.solver, dt);
    const { air, depth: plume, turbulence, nextAir, nextDepth, nextTurbulence, stirred } = this;
    const aerated = rowsWithField(nx, nz, this.aeratedRows, air, plume, turbulence);
    const recorded = shared?.recorded;
    const indices = shared?.indices;
    const values = shared?.values;
    const fade = Math.exp(-dt / (TURBULENCE.decayShare * this.period));
    for (let iz = 0; iz < nz; iz += 1) {
      const start = iz * nx;
      const end = start + nx;
      if (aerated[Math.min(nz, iz + 2)] - aerated[Math.max(0, iz - 1)] === 0 && rows.quiet(iz, aerated)) {
        // Nothing to carry in: every cell, dry or wet, ends with none (as a carried 0 degasses to).
        nextAir.fill(0, start, end);
        nextDepth.fill(0, start, end);
        nextTurbulence.fill(0, start, end);
        stirred.fill(0, start, end);
        continue;
      }
      const lookup = recorded !== undefined && recorded[iz] === 1;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = start + ix;
        const water = h[i];
        if (water <= WET) {
          nextAir[i] = 0;
          nextDepth[i] = 0;
          nextTurbulence[i] = 0;
          stirred[i] = 0;
          continue;
        }
        let k: number;
        let tx: number;
        let tz: number;
        if (lookup) {
          k = indices![i];
          tx = values![i * 2];
          tz = values![i * 2 + 1];
        } else {
          const x = xCenters[ix] - (qx[i] / water) * dt;
          const z = zCenters[iz] - (qz[i] / water) * dt;
          const gx = Math.min(nx - 1, Math.max(0, (x - xCenters[0]) / dx));
          const column = Math.min(nx - 2, Math.floor(gx));
          tx = gx - column;
          let row = Math.min(iz, nz - 2);
          while (row > 0 && zCenters[row] > z) row -= 1;
          while (row < nz - 2 && zCenters[row + 1] <= z) row += 1;
          tz = Math.min(1, Math.max(0, (z - zCenters[row]) / (zCenters[row + 1] - zCenters[row])));
          k = row * nx + column;
        }
        const w00 = (1 - tx) * (1 - tz);
        const w10 = tx * (1 - tz);
        const w01 = (1 - tx) * tz;
        const w11 = tx * tz;
        const carriedAir = air[k] * w00 + air[k + 1] * w10 + air[k + nx] * w01 + air[k + nx + 1] * w11;
        const carriedTurbulence = turbulence[k] * w00 + turbulence[k + 1] * w10 + turbulence[k + nx] * w01 + turbulence[k + nx + 1] * w11;
        const carriedDepth = Math.max(plume[k] * (w00 > 0 ? 1 : 0), plume[k + 1] * (w10 > 0 ? 1 : 0), plume[k + nx] * (w01 > 0 ? 1 : 0), plume[k + nx + 1] * (w11 > 0 ? 1 : 0));
        nextTurbulence[i] = carriedTurbulence < TRACE ? 0 : carriedTurbulence * (stirred[i] ? 1 : fade);
        stirred[i] = 0;
        if (carriedAir === 0) {
          // Water with no air has nothing to degas.
          nextAir[i] = 0;
          nextDepth[i] = 0;
          continue;
        }
        const reach = Math.min(carriedDepth, water);
        const left = carriedAir * Math.exp((-AERATION.riseSpeed * dt) / Math.max(MIN_DEPTH, reach));
        const kept = left < TRACE ? 0 : Math.min(left, AERATION.peak * reach);
        nextAir[i] = kept;
        nextDepth[i] = kept > 0 ? reach : 0;
      }
    }
    air.set(nextAir);
    plume.set(nextDepth);
    turbulence.set(nextTurbulence);
  }

  private reach(cell: number, penetration: number): number {
    return Math.min(penetration, this.solver.h[cell]);
  }

  /**
   * `volume` m³ of air over the wet cells whose centres lie within `radius` of
   * (x, z) (always the cell it lands in), evenly per square metre, each down to
   * `radius` or its water's depth. None from past an open edge: the plunge was
   * outside the window, and its cell would be the edge column's.
   */
  private spread(x: number, z: number, volume: number, radius: number): void {
    if (this.solver.beyondOpenEdge(x)) return;
    const { nx, nz, xCenters, zCenters, dx, dz, h } = this.solver;
    const centre = this.solver.cellIndex(x, z);
    const column = centre % nx;
    const row = Math.floor(centre / nx);
    const span = Math.ceil(radius / dx);
    const cells = this.plume;
    cells.length = 0;
    let area = 0;
    for (const step of ACROSS) {
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
    for (const values of [this.air, this.depth, this.turbulence]) {
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
