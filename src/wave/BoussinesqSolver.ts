import { GRAVITY } from './dispersion';
import { OPEN, PERIODIC, ShallowWaterSolver, WALL, type DepthFunction, type RelaxationZone, type SolverGrid, type SolverOptions } from './ShallowWaterSolver';

/** Madsen & Sørensen (1992) dispersion coefficient: the [2,2] Padé fit to Airy. */
export const MADSEN_SORENSEN_B = 1 / 15;
const ALPHA = MADSEN_SORENSEN_B + 1 / 3;
/** A cell disperses only where it and its neighbours hold at least this much water, over this much still depth, m. */
const DISPERSIVE_DEPTH = 0.05;
/** Tonelli & Petti (2009), FUNWAVE-TVD's default: shallow water where the surface stands this high over the still depth. */
const SWITCH_RATIO = 0.8;

/** Phase speed ω/k the Madsen–Sørensen equations give at depth d: ω² = g d k² (1 + B(kd)²)/(1 + α(kd)²). */
export function madsenSorensenCelerity(omega: number, depth: number, g = GRAVITY): number {
  const B = MADSEN_SORENSEN_B;
  let k = omega / Math.sqrt(g * depth);
  for (let i = 0; i < 60; i += 1) {
    const s = (k * depth) ** 2;
    const ratio = (1 + B * s) / (1 + ALPHA * s);
    const f = g * depth * k * k * ratio - omega * omega;
    const dRatio = ((B - ALPHA) * 2 * k * depth * depth) / (1 + ALPHA * s) ** 2;
    const df = g * depth * (2 * k * ratio + k * k * dRatio);
    const next = k - f / df;
    if (Math.abs(next - k) < 1e-14 * k) return omega / next;
    k = next;
  }
  return omega / k;
}

/**
 * Kennedy et al. (2000) breaking: a cell breaks when its surface rises faster
 * than η_t*, which ramps from `onset` to `end` (fractions of √(gh), h the still
 * depth) over `transition` · √(h/g) after breaking starts, and the breaking
 * water mixes momentum with eddy viscosity ν = B δ² (h + η) η_t.
 */
export interface KennedyOptions {
  onset: number;
  end?: number;
  transition?: number;
  delta?: number;
}

export interface BoussinesqOptions extends SolverOptions {
  /** Madsen–Sørensen dispersive terms (default on); off, with no breaking, the solver is stage 1 exactly. */
  dispersion?: boolean;
  /** Eddy-viscosity breaking; false (the default) leaves it out. */
  breaking?: KennedyOptions | false;
}

/** What a device port of the step reads from the solver (plan P6). */
export interface BoussinesqDeviceLayout {
  gravity: number;
  dryDepth: number;
  manning: number;
  /** WALL, PERIODIC or OPEN. */
  xBoundary: number;
  dispersive: boolean;
  /** Kennedy breaking with the onset already scaled by the wind; absent when waves do not break. */
  breaking?: { onset: number; end: number; transition: number; mixing: number };
  /** Still depth and its slopes along x and z. */
  still: Float64Array;
  slopeX: Float64Array;
  slopeZ: Float64Array;
  /** Distance to the neighbour centre below and above each row, and to the next row's centre, m. */
  below: Float64Array;
  above: Float64Array;
  gaps: Float64Array;
  /** Changes whenever the window shifted: the bed, still depth and carried state moved with it. */
  version: number;
  zones: readonly RelaxationZone[];
}

/** Thinner water does not break, m. */
const BREAKING_DEPTH = 0.05;
/** The eddy viscosity never exceeds this share of H √(gH): a mixing length of the depth at the long-wave speed. */
const MAX_EDDY = 0.3;

/** Solve a tridiagonal system in place (Thomas): lower a, diagonal b, upper c, right side r → solution in r. */
function thomas(a: Float64Array, b: Float64Array, c: Float64Array, r: Float64Array, scratch: Float64Array, n: number): void {
  let denominator = b[0];
  scratch[0] = c[0] / denominator;
  r[0] /= denominator;
  for (let i = 1; i < n; i += 1) {
    denominator = b[i] - a[i] * scratch[i - 1];
    scratch[i] = c[i] / denominator;
    r[i] = (r[i] - a[i] * r[i - 1]) / denominator;
  }
  for (let i = n - 2; i >= 0; i -= 1) r[i] -= scratch[i] * r[i + 1];
}

/**
 * Stage 2 surf-zone solver (plan §1.8): the shallow-water fluxes of stage 1 plus
 * the Madsen & Sørensen (1992) dispersive terms in modified-flux form,
 *
 *   P̄ = P − α d²(P_xx + Q_xy) − d d_x(P_x/3 + Q_y/6) − d d_y Q_x/6,
 *   P̄_t + (shallow-water terms) = B g d³(η_xxx + η_xyy) + B g d² d_x(2η_xx + η_yy) + B g d² d_y η_xy,
 *
 * and the same along y (here z) with x and y exchanged: d is the still depth
 * and α = B + 1/3. A step advances P̄ and Q̄ with the Hancock step's rates and
 * the dispersive sources at the half step, then recovers P by one tridiagonal
 * solve per row and Q by one per column; the cross terms use the latest other
 * flux (the hybrid FV/FD structure of Celeris and FUNWAVE-TVD). Where the
 * water is thin or the surface stands above 0.8 of the still depth (Tonelli
 * and Petti 2009) a cell reverts to shallow water, so bores stay shock-captured.
 */
export class BoussinesqSolver extends ShallowWaterSolver {
  readonly dispersive: boolean;
  /** Breaking strength B in [0, 1], seconds since the bore over each cell began breaking, surface rise rate η_t (m/s) and eddy viscosity (m²/s). */
  readonly breakingStrength: Float64Array;
  readonly breakingAge: Float64Array;
  readonly riseRate: Float64Array;
  readonly viscosity: Float64Array;
  /** Multiplies the breaking onset; the local wind shifts it (plan Q23). */
  onsetScale = 1;
  private readonly kennedy?: Required<KennedyOptions>;

  /** Whether waves break inside the step (Kennedy eddy viscosity). */
  get breaks(): boolean {
    return this.kennedy !== undefined;
  }
  private readonly nextStrength: Float64Array;
  private readonly nextAge: Float64Array;
  private readonly viscousX: Float64Array;
  private readonly viscousZ: Float64Array;
  private viscosityPeak = 0;
  /** The still depth and its slopes follow the bed; recomputed when the window shifts. */
  private depthDirty = true;
  private layoutVersion = 0;
  /** Column solves, all columns at once row by row: the eliminated upper band and right side. */
  private readonly columnUpper: Float64Array;
  private readonly columnRight: Float64Array;
  private readonly finest: number;
  /** Still depth, m, and whether each cell disperses this step (1) or is shallow water (0). */
  readonly still: Float64Array;
  readonly mask: Float64Array;
  private readonly pBar: Float64Array;
  private readonly qBar: Float64Array;
  private readonly sourceX: Float64Array;
  private readonly sourceZ: Float64Array;
  private readonly halfEta: Float64Array;
  private readonly dX: Float64Array;
  private readonly dZ: Float64Array;
  /** Derivative scratch. */
  private readonly f1: Float64Array;
  private readonly f2: Float64Array;
  private readonly f3: Float64Array;
  private readonly f4: Float64Array;
  private readonly f5: Float64Array;
  private readonly f6: Float64Array;
  /** Distance to the neighbour centre below and above each row (ghosts beyond the walls), m. */
  private readonly below: Float64Array;
  private readonly above: Float64Array;
  private readonly lowerBand: Float64Array;
  private readonly diagonal: Float64Array;
  private readonly upperBand: Float64Array;
  private readonly right: Float64Array;
  private readonly scratch: Float64Array;
  private readonly spare: Float64Array;
  /** P and Q as the step began, to measure the acceleration beyond shallow water for the next predictor. */
  private readonly startP: Float64Array;
  private readonly startQ: Float64Array;

  constructor(grid: SolverGrid, depthAt: DepthFunction, options: BoussinesqOptions = {}) {
    super(grid, depthAt, options);
    this.dispersive = options.dispersion ?? true;
    if (options.breaking) this.kennedy = { end: 0.15, transition: 5, delta: 1.2, ...options.breaking };
    const size = this.nx * this.nz;
    const make = () => new Float64Array(size);
    this.breakingStrength = make(); this.breakingAge = make(); this.riseRate = make(); this.viscosity = make();
    this.nextStrength = make(); this.nextAge = make(); this.viscousX = make(); this.viscousZ = make();
    this.columnUpper = make(); this.columnRight = make();
    this.finest = Math.min(this.dx, ...this.dz);
    this.still = make(); this.mask = make();
    this.pBar = make(); this.qBar = make(); this.sourceX = make(); this.sourceZ = make(); this.halfEta = make();
    this.dX = make(); this.dZ = make();
    this.f1 = make(); this.f2 = make(); this.f3 = make(); this.f4 = make(); this.f5 = make(); this.f6 = make();
    this.below = new Float64Array(this.nz);
    this.above = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.below[iz] = iz > 0 ? this.zGaps[iz - 1] : this.dz[0];
      this.above[iz] = iz < this.nz - 1 ? this.zGaps[iz] : this.dz[this.nz - 1];
    }
    const longest = Math.max(this.nx, this.nz);
    this.lowerBand = new Float64Array(longest);
    this.diagonal = new Float64Array(longest);
    this.upperBand = new Float64Array(longest);
    this.right = new Float64Array(longest);
    this.scratch = new Float64Array(longest);
    this.spare = new Float64Array(longest);
    this.startP = make();
    this.startQ = make();
    if (this.dispersive) {
      this.predictorX = make();
      this.predictorZ = make();
    }
  }

  protected override advance(dt: number): void {
    if (!this.dispersive && !this.kennedy) {
      super.advance(dt);
      return;
    }
    const { h, qx, qz, rateH, rateQx, rateQz, pBar, qBar, sourceX, sourceZ, dryDepth } = this;
    this.startP.set(qx);
    this.startQ.set(qz);
    this.updateMask();
    this.modifiedFluxes();
    this.computeRates(dt);
    this.halfStepSurface();
    this.dispersiveSources();
    this.breakingTerms(dt);
    const { viscousX, viscousZ } = this;
    for (let i = 0; i < h.length; i += 1) {
      h[i] = Math.max(0, h[i] + dt * rateH[i]);
      const wet = h[i] > dryDepth;
      pBar[i] = wet ? pBar[i] + dt * (rateQx[i] + sourceX[i] + viscousX[i]) : 0;
      qBar[i] = wet ? qBar[i] + dt * (rateQz[i] + sourceZ[i] + viscousZ[i]) : 0;
    }
    this.recoverRows();
    this.recoverColumns();
    const { startP, startQ, predictorX, predictorZ } = this;
    for (let i = 0; i < h.length; i += 1) {
      if (h[i] > dryDepth) {
        // What the dispersive terms added to the acceleration this step: the next predictor's estimate.
        if (predictorX && predictorZ) {
          predictorX[i] = (qx[i] - startP[i]) / dt - rateQx[i];
          predictorZ[i] = (qz[i] - startQ[i]) / dt - rateQz[i];
        }
        continue;
      }
      qx[i] = 0;
      qz[i] = 0;
      if (predictorX && predictorZ) {
        predictorX[i] = 0;
        predictorZ[i] = 0;
      }
    }
    this.applyFriction(dt);
  }

  /** The dispersive acceleration the next Hancock predictor adds, per cell; absent without dispersion. */
  get predictor(): { x: Float64Array; z: Float64Array } | undefined {
    return this.predictorX && this.predictorZ ? { x: this.predictorX, z: this.predictorZ } : undefined;
  }

  /** The constants, still depth and zones a device step needs (refreshed first). */
  deviceLayout(): BoussinesqDeviceLayout {
    this.refreshStillDepth();
    const kennedy = this.kennedy;
    return {
      gravity: this.gravity,
      dryDepth: this.dryDepth,
      manning: this.manning,
      xBoundary: this.xBoundary,
      dispersive: this.dispersive,
      breaking: kennedy && {
        onset: kennedy.onset * this.onsetScale, end: kennedy.end, transition: kennedy.transition, mixing: kennedy.delta * kennedy.delta,
      },
      still: this.still,
      slopeX: this.dX,
      slopeZ: this.dZ,
      below: this.below,
      above: this.above,
      gaps: this.zGaps,
      version: this.layoutVersion,
      zones: this.relaxationZones,
    };
  }

  /**
   * Book a step of `elapsed` seconds that a device took and wrote back into h,
   * qx, qz and the breaking and predictor fields: the clock, and the eddy
   * viscosity's step limit from the viscosity it read back.
   */
  adoptDeviceStep(elapsed: number): void {
    this.time += elapsed;
    let peak = 0;
    for (const nu of this.viscosity) if (nu > peak) peak = nu;
    this.viscosityPeak = peak;
  }

  /** The CFL step, and for breaking water the explicit eddy viscosity's limit. */
  override maxStableStep(): number {
    const step = super.maxStableStep();
    return this.viscosityPeak > 0 ? Math.min(step, (0.2 * this.finest * this.finest) / this.viscosityPeak) : step;
  }

  /**
   * Kennedy breaking from this step's surface rise rate (the continuity rate),
   * and the eddy-viscosity terms R_x = ∂x(ν P_x) + ½∂y(ν(P_y + Q_x)),
   * R_y = ½∂x(ν(P_y + Q_x)) + ∂y(ν Q_y).
   */
  private breakingTerms(dt: number): void {
    const { viscousX, viscousZ } = this;
    const kennedy = this.kennedy;
    if (!kennedy) {
      viscousX.fill(0);
      viscousZ.fill(0);
      return;
    }
    const { nx, nz, h, rateH, breakingStrength: strength, breakingAge: age, nextStrength, nextAge, riseRate, viscosity: nu, gravity: g } = this;
    const onset = kennedy.onset * this.onsetScale;
    const mixing = kennedy.delta * kennedy.delta;
    let peak = 0;
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        const depth = h[i];
        const rise = rateH[i];
        riseRate[i] = rise;
        if (depth <= BREAKING_DEPTH) {
          nextStrength[i] = 0;
          nextAge[i] = 0;
          nu[i] = 0;
          continue;
        }
        let inherited = strength[i] > 0 ? age[i] : 0;
        if (ix > 0 && strength[i - 1] > 0) inherited = Math.max(inherited, age[i - 1]);
        if (ix < nx - 1 && strength[i + 1] > 0) inherited = Math.max(inherited, age[i + 1]);
        if (iz > 0 && strength[i - nx] > 0) inherited = Math.max(inherited, age[i - nx]);
        if (iz < nz - 1 && strength[i + nx] > 0) inherited = Math.max(inherited, age[i + nx]);
        // Thresholds scale with the still depth (Kennedy et al. 2000); the mixing acts over the whole column.
        const still = Math.max(BREAKING_DEPTH, this.still[i]);
        const ramp = Math.min(1, inherited / (kennedy.transition * Math.sqrt(still / g)));
        const threshold = Math.sqrt(g * still) * (onset + (kennedy.end - onset) * ramp);
        const breaking = Math.min(1, Math.max(0, rise / threshold - 1));
        nextStrength[i] = breaking;
        nextAge[i] = breaking > 0 ? inherited + dt : 0;
        nu[i] = breaking > 0 ? Math.min(MAX_EDDY * depth * Math.sqrt(g * depth), breaking * mixing * depth * rise) : 0;
        if (nu[i] > peak) peak = nu[i];
      }
    }
    strength.set(nextStrength);
    age.set(nextAge);
    this.viscosityPeak = peak;
    if (!(peak > 0)) {
      viscousX.fill(0);
      viscousZ.fill(0);
      return;
    }
    const { qx: P, qz: Q, below, above, f1, f2, f3 } = this;
    const periodic = this.xBoundary === PERIODIC;
    const pEdge = this.xBoundary === WALL ? -1 : 1;
    const inverse = 1 / (this.dx * this.dx);
    for (let iz = 0; iz < nz; iz += 1) {
      const minus = below[iz];
      const plus = above[iz];
      const across = 2 / (minus + plus);
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const left = ix > 0 ? i - 1 : periodic ? row + nx - 1 : -1;
        const right = ix < nx - 1 ? i + 1 : periodic ? row : -1;
        const nuL = left >= 0 ? 0.5 * (nu[i] + nu[left]) : nu[i];
        const nuR = right >= 0 ? 0.5 * (nu[i] + nu[right]) : nu[i];
        const pL = left >= 0 ? P[left] : pEdge * P[i];
        const pR = right >= 0 ? P[right] : pEdge * P[i];
        viscousX[i] = (nuR * (pR - P[i]) - nuL * (P[i] - pL)) * inverse;
        const down = iz > 0 ? i - nx : -1;
        const up = iz < nz - 1 ? i + nx : -1;
        const nuD = down >= 0 ? 0.5 * (nu[i] + nu[down]) : nu[i];
        const nuU = up >= 0 ? 0.5 * (nu[i] + nu[up]) : nu[i];
        const qD = down >= 0 ? Q[down] : -Q[i];
        const qU = up >= 0 ? Q[up] : -Q[i];
        viscousZ[i] = (nuU * (qU - Q[i]) / plus - nuD * (Q[i] - qD) / minus) * across;
      }
    }
    // The shear: S = ν(P_y + Q_x), odd across walls of either kind.
    this.derivativeZ(P, f1, false);
    this.derivativeX(Q, f2, false);
    for (let i = 0; i < f1.length; i += 1) f3[i] = nu[i] * (f1[i] + f2[i]);
    this.derivativeZ(f3, f1, true);
    this.derivativeX(f3, f2, true);
    for (let i = 0; i < f1.length; i += 1) {
      viscousX[i] += 0.5 * f1[i];
      viscousZ[i] += 0.5 * f2[i];
    }
  }

  /**
   * Still depth and the dispersive mask. A cell disperses when every cell its
   * stencils reach (two along each axis, one diagonally) holds water over still
   * depth, and its surface stands below the Tonelli–Petti ratio.
   */
  private updateMask(): void {
    const { h, still, mask, f1: wet, f2: alongX, f3: box, f4: work } = this;
    this.refreshStillDepth();
    for (let i = 0; i < h.length; i += 1) wet[i] = h[i] > DISPERSIVE_DEPTH && still[i] > DISPERSIVE_DEPTH ? 1 : 0;
    // Erode the wet cells by the stencils' reach: two along each axis, and the 3 × 3 box for the diagonals.
    this.erodeX(wet, alongX, 2);
    this.erodeX(wet, work, 1);
    this.erodeZ(work, box, 1);
    this.erodeZ(wet, work, 2);
    const on = this.dispersive ? 1 : 0;
    for (let i = 0; i < h.length; i += 1) {
      mask[i] = wet[i] > 0 && alongX[i] > 0 && work[i] > 0 && box[i] > 0 && h[i] - still[i] <= SWITCH_RATIO * still[i] ? on : 0;
    }
  }

  private refreshStillDepth(): void {
    if (!this.depthDirty) return;
    const { bed, restLevel, still } = this;
    for (let i = 0; i < still.length; i += 1) still[i] = Math.max(0, restLevel - bed[i]);
    this.derivativeX(still, this.dX, false);
    this.derivativeZ(still, this.dZ, false);
    this.depthDirty = false;
  }

  /** The smallest of `f` within `reach` cells along x (clamped at edges, wrapped when periodic). */
  private erodeX(f: Float64Array, out: Float64Array, reach: number): void {
    const { nx, nz } = this;
    const periodic = this.xBoundary === PERIODIC;
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        let least = f[row + ix];
        for (let k = -reach; k <= reach && least > 0; k += 1) {
          let j = ix + k;
          if (j < 0) j = periodic ? j + nx : 0;
          else if (j >= nx) j = periodic ? j - nx : nx - 1;
          least = Math.min(least, f[row + j]);
        }
        out[row + ix] = least;
      }
    }
  }

  /** The smallest of `f` within `reach` rows along z (clamped at the ends). */
  private erodeZ(f: Float64Array, out: Float64Array, reach: number): void {
    const { nx, nz } = this;
    for (let iz = 0; iz < nz; iz += 1) {
      const low = Math.max(0, iz - reach);
      const high = Math.min(nz - 1, iz + reach);
      for (let ix = 0; ix < nx; ix += 1) {
        let least = f[iz * nx + ix];
        for (let k = low; k <= high && least > 0; k += 1) least = Math.min(least, f[k * nx + ix]);
        out[iz * nx + ix] = least;
      }
    }
  }

  override shiftAlongShore(columns: number): void {
    super.shiftAlongShore(columns);
    this.depthDirty = true;
    this.layoutVersion += 1;
    // The breaking bores and the predictor's memory move with the water; new columns start quiet.
    const shift = Math.trunc(columns);
    if (shift === 0) return;
    const { nx, nz } = this;
    const carried = [this.breakingStrength, this.breakingAge, this.viscosity, ...(this.predictorX && this.predictorZ ? [this.predictorX, this.predictorZ] : [])];
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (const values of carried) {
        if (shift > 0) {
          values.copyWithin(row, row + shift, row + nx);
          values.fill(0, row + nx - shift, row + nx);
        } else {
          values.copyWithin(row - shift, row, row + nx + shift);
          values.fill(0, row, row - shift);
        }
      }
    }
  }

  /** P̄ and Q̄ from P and Q. */
  private modifiedFluxes(): void {
    const { qx: P, qz: Q, pBar, qBar, still: d, dX, dZ, mask, f1, f2, f3, f4, f5, f6 } = this;
    // P_xx, P_x, Q_y, then Q_xy = ∂x(Q_y), and Q_x.
    this.secondX(P, f1, true);
    this.derivativeX(P, f2, true);
    this.derivativeZ(Q, f3, true);
    this.derivativeX(f3, f4, false);
    this.derivativeX(Q, f5, false);
    for (let i = 0; i < P.length; i += 1) {
      pBar[i] = mask[i] > 0
        ? P[i] - ALPHA * d[i] * d[i] * (f1[i] + f4[i]) - d[i] * dX[i] * (f2[i] / 3 + f3[i] / 6) - (d[i] * dZ[i] * f5[i]) / 6
        : P[i];
    }
    // Q_yy, Q_y (in f3), P_xy = ∂y(P_x), P_x (in f2), and P_y.
    this.secondZ(Q, f1, true);
    this.derivativeZ(f2, f4, false);
    this.derivativeZ(P, f6, false);
    for (let i = 0; i < Q.length; i += 1) {
      qBar[i] = mask[i] > 0
        ? Q[i] - ALPHA * d[i] * d[i] * (f1[i] + f4[i]) - d[i] * dZ[i] * (f3[i] / 3 + f2[i] / 6) - (d[i] * dX[i] * f6[i]) / 6
        : Q[i];
    }
  }

  /** The surface at the half step, from the Hancock predictor's four faces of each cell. */
  private halfStepSurface(): void {
    const { halfEta, xetaW, xetaE, zetaS, zetaN } = this;
    for (let i = 0; i < halfEta.length; i += 1) halfEta[i] = 0.25 * (xetaW[i] + xetaE[i] + zetaS[i] + zetaN[i]);
  }

  /** Bg d³(η_xxx + η_xyy) + Bg d² d_x(2η_xx + η_yy) + Bg d² d_y η_xy, and its y twin. */
  private dispersiveSources(): void {
    const { halfEta: eta, still: d, dX, dZ, mask, sourceX, sourceZ, f1, f2, f3, f4, f5, f6, gravity: g } = this;
    this.secondX(eta, f1, false);
    this.carryCurvatureAcrossOpenEdges(f1);
    this.secondZ(eta, f2, false);
    this.derivativeZ(eta, f5, false);
    this.derivativeX(f5, f3, false);
    this.derivativeX(f1, f4, false);
    this.derivativeX(f2, f5, false);
    for (let i = 0; i < eta.length; i += 1) {
      if (!(mask[i] > 0)) {
        sourceX[i] = 0;
        continue;
      }
      const scale = MADSEN_SORENSEN_B * g * d[i] * d[i];
      sourceX[i] = scale * (d[i] * (f4[i] + f5[i]) + dX[i] * (2 * f1[i] + f2[i]) + dZ[i] * f3[i]);
    }
    this.derivativeZ(f2, f4, false);
    this.derivativeZ(f1, f6, false);
    for (let i = 0; i < eta.length; i += 1) {
      if (!(mask[i] > 0)) {
        sourceZ[i] = 0;
        continue;
      }
      const scale = MADSEN_SORENSEN_B * g * d[i] * d[i];
      sourceZ[i] = scale * (d[i] * (f4[i] + f6[i]) + dZ[i] * (2 * f2[i] + f1[i]) + dX[i] * f3[i]);
    }
  }

  /**
   * η_xx at each open edge column from its inner neighbour: the curvature
   * carries across the edge, as if η were extrapolated quadratically. The
   * extended ghost that serves the shallow-water fluxes would give −η_x/dx
   * there instead, not a curvature at all, and B g d³ η_xxx a surface-slope
   * force (B d²/2dx²) times the hydrostatic one: 2.7 times in 9 m of water on
   * a 1 m grid. Over a bed sloping across the edge, where any along-shore
   * outflow draws the surface down toward the shallower side, that force
   * pushes on the drawdown and runs away.
   */
  private carryCurvatureAcrossOpenEdges(curvature: Float64Array): void {
    const { nx, nz } = this;
    if (this.xBoundary !== OPEN || nx < 2) return;
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      const west = curvature[row + 1];
      const east = curvature[row + nx - 2];
      curvature[row] = west;
      curvature[row + nx - 1] = east;
    }
  }

  /**
   * P from P̄, row by row: P − α d² P_xx − (d d_x/3) P_x = P̄ + α d² Q_xy + d d_x Q_y/6 + d d_y Q_x/6,
   * the cross terms from the current Q.
   */
  private recoverRows(): void {
    const { nx, nz, qx: P, qz: Q, pBar, still: d, dX, dZ, mask, f3, f4, f5 } = this;
    const { lowerBand: a, diagonal: b, upperBand: c, right: r, scratch } = this;
    this.derivativeZ(Q, f3, true);
    this.derivativeX(f3, f4, false);
    this.derivativeX(Q, f5, false);
    const periodic = this.xBoundary === PERIODIC;
    const edge = this.xBoundary === WALL ? -1 : 1;
    const inverse = 1 / (this.dx * this.dx);
    const half = 1 / (2 * this.dx);
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      let any = false;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        if (mask[i] > 0) {
          any = true;
          const A = ALPHA * d[i] * d[i] * inverse;
          const E = ((d[i] * dX[i]) / 3) * half;
          a[ix] = -(A - E);
          b[ix] = 1 + 2 * A;
          c[ix] = -(A + E);
          r[ix] = pBar[i] + ALPHA * d[i] * d[i] * f4[i] + (d[i] * dX[i] * f3[i]) / 6 + (d[i] * dZ[i] * f5[i]) / 6;
        } else {
          a[ix] = 0;
          b[ix] = 1;
          c[ix] = 0;
          r[ix] = pBar[i];
        }
      }
      if (!any) {
        for (let ix = 0; ix < nx; ix += 1) P[row + ix] = pBar[row + ix];
        continue;
      }
      if (periodic) {
        this.cyclic(nx);
      } else {
        b[0] += edge * a[0];
        a[0] = 0;
        b[nx - 1] += edge * c[nx - 1];
        c[nx - 1] = 0;
        thomas(a, b, c, r, scratch, nx);
      }
      for (let ix = 0; ix < nx; ix += 1) P[row + ix] = r[ix];
    }
  }

  /**
   * Q from Q̄, column by column: Q − α d² Q_yy − (d d_y/3) Q_y = Q̄ + α d² P_xy + d d_y P_x/6 + d d_x P_y/6,
   * with walls (Q odd) at both cross-shore ends.
   */
  private recoverColumns(): void {
    const { nx, nz, qx: P, qz: Q, qBar, still: d, dX, dZ, mask, below, above, f2, f4, f6, columnUpper: upper, columnRight: right } = this;
    this.derivativeX(P, f2, true);
    this.derivativeZ(f2, f4, false);
    this.derivativeZ(P, f6, false);
    // Thomas elimination down every column at once, one row at a time, so memory is read in order.
    for (let iz = 0; iz < nz; iz += 1) {
      const minus = below[iz];
      const plus = above[iz];
      const sum = minus + plus;
      const secondLow = 2 / (minus * sum);
      const secondHigh = 2 / (plus * sum);
      const secondMid = -2 / (minus * plus);
      const firstLow = -plus / (minus * sum);
      const firstHigh = minus / (plus * sum);
      const firstMid = (plus - minus) / (plus * minus);
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        let a = 0;
        let b = 1;
        let c = 0;
        let r = qBar[i];
        if (mask[i] > 0) {
          const A = ALPHA * d[i] * d[i];
          const E = (d[i] * dZ[i]) / 3;
          a = -(A * secondLow + E * firstLow);
          b = 1 - (A * secondMid + E * firstMid);
          c = -(A * secondHigh + E * firstHigh);
          r += A * f4[i] + (d[i] * dZ[i] * f2[i]) / 6 + (d[i] * dX[i] * f6[i]) / 6;
          // Walls at both ends: the ghost carries −Q.
          if (iz === 0) {
            b -= a;
            a = 0;
          }
          if (iz === nz - 1) {
            b -= c;
            c = 0;
          }
        }
        if (iz === 0) {
          upper[i] = c / b;
          right[i] = r / b;
        } else {
          const denominator = b - a * upper[i - nx];
          upper[i] = c / denominator;
          right[i] = (r - a * right[i - nx]) / denominator;
        }
      }
    }
    const last = (nz - 1) * nx;
    for (let ix = 0; ix < nx; ix += 1) Q[last + ix] = right[last + ix];
    for (let iz = nz - 2; iz >= 0; iz -= 1) {
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) Q[row + ix] = right[row + ix] - upper[row + ix] * Q[row + ix + nx];
    }
  }

  /**
   * Cyclic tridiagonal solve (Sherman–Morrison) of the bands in place: row 0's
   * lower coefficient and the last row's upper one wrap around.
   */
  private cyclic(n: number): void {
    const { lowerBand: a, diagonal: b, upperBand: c, right: r, scratch, spare: u } = this;
    const beta = a[0];
    const alpha = c[n - 1];
    const gamma = -b[0];
    b[0] -= gamma;
    b[n - 1] -= (alpha * beta) / gamma;
    a[0] = 0;
    c[n - 1] = 0;
    u.fill(0, 0, n);
    u[0] = gamma;
    u[n - 1] = alpha;
    // Two solves with the same bands (`thomas` leaves them untouched).
    thomas(a, b, c, r, scratch, n);
    thomas(a, b, c, u, scratch, n);
    const factor = (r[0] + (beta * r[n - 1]) / gamma) / (1 + u[0] + (beta * u[n - 1]) / gamma);
    for (let i = 0; i < n; i += 1) r[i] -= factor * u[i];
  }

  /** ∂x of a cell field: central differences; ghosts mirror at walls (negated when `odd`), extend at open edges, wrap when periodic. */
  private derivativeX(f: Float64Array, out: Float64Array, odd: boolean): void {
    const { nx, nz } = this;
    const periodic = this.xBoundary === PERIODIC;
    const sign = this.xBoundary === WALL && odd ? -1 : 1;
    const half = 1 / (2 * this.dx);
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const left = ix > 0 ? f[i - 1] : periodic ? f[row + nx - 1] : sign * f[i];
        const right = ix < nx - 1 ? f[i + 1] : periodic ? f[row] : sign * f[i];
        out[i] = (right - left) * half;
      }
    }
  }

  private secondX(f: Float64Array, out: Float64Array, odd: boolean): void {
    const { nx, nz } = this;
    const periodic = this.xBoundary === PERIODIC;
    const sign = this.xBoundary === WALL && odd ? -1 : 1;
    const inverse = 1 / (this.dx * this.dx);
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const left = ix > 0 ? f[i - 1] : periodic ? f[row + nx - 1] : sign * f[i];
        const right = ix < nx - 1 ? f[i + 1] : periodic ? f[row] : sign * f[i];
        out[i] = (right - 2 * f[i] + left) * inverse;
      }
    }
  }

  /** ∂z on the stretched rows (second order); walls at both ends mirror, negated when `odd`. */
  private derivativeZ(f: Float64Array, out: Float64Array, odd: boolean): void {
    const { nx, nz, below, above } = this;
    const sign = odd ? -1 : 1;
    for (let iz = 0; iz < nz; iz += 1) {
      const minus = below[iz];
      const plus = above[iz];
      const sum = minus + plus;
      const wPlus = minus / (plus * sum);
      const wMinus = -plus / (minus * sum);
      const wCentre = (plus - minus) / (plus * minus);
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const down = iz > 0 ? f[i - nx] : sign * f[i];
        const up = iz < nz - 1 ? f[i + nx] : sign * f[i];
        out[i] = wPlus * up + wMinus * down + wCentre * f[i];
      }
    }
  }

  private secondZ(f: Float64Array, out: Float64Array, odd: boolean): void {
    const { nx, nz, below, above } = this;
    const sign = odd ? -1 : 1;
    for (let iz = 0; iz < nz; iz += 1) {
      const minus = below[iz];
      const plus = above[iz];
      const sum = minus + plus;
      const wPlus = 2 / (plus * sum);
      const wMinus = 2 / (minus * sum);
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const down = iz > 0 ? f[i - nx] : sign * f[i];
        const up = iz < nz - 1 ? f[i + nx] : sign * f[i];
        out[i] = wPlus * up + wMinus * down - (wPlus + wMinus) * f[i];
      }
    }
  }
}
