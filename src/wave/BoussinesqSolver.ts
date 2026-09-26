import { GRAVITY } from './dispersion';
import { PERIODIC, ShallowWaterSolver, WALL, type DepthFunction, type SolverGrid, type SolverOptions } from './ShallowWaterSolver';

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

export interface BoussinesqOptions extends SolverOptions {
  /** Madsen–Sørensen dispersive terms (default on); off, the solver is stage 1 exactly. */
  dispersion?: boolean;
  /** Kennedy et al. (2000) eddy-viscosity breaking (Task 3); false leaves it out. */
  breaking?: false;
}

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
    const size = this.nx * this.nz;
    const make = () => new Float64Array(size);
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
    if (!this.dispersive) {
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
    for (let i = 0; i < h.length; i += 1) {
      h[i] = Math.max(0, h[i] + dt * rateH[i]);
      const wet = h[i] > dryDepth;
      pBar[i] = wet ? pBar[i] + dt * (rateQx[i] + sourceX[i]) : 0;
      qBar[i] = wet ? qBar[i] + dt * (rateQz[i] + sourceZ[i]) : 0;
    }
    this.recoverRows();
    this.recoverColumns();
    const { startP, startQ, predictorX, predictorZ } = this;
    for (let i = 0; i < h.length; i += 1) {
      if (h[i] > dryDepth) {
        // What the dispersive terms added to the acceleration this step: the next predictor's estimate.
        predictorX![i] = (qx[i] - startP[i]) / dt - rateQx[i];
        predictorZ![i] = (qz[i] - startQ[i]) / dt - rateQz[i];
        continue;
      }
      qx[i] = 0;
      qz[i] = 0;
      predictorX![i] = 0;
      predictorZ![i] = 0;
    }
    this.applyFriction(dt);
  }

  /**
   * Still depth and the dispersive mask. A cell disperses when every cell its
   * stencils reach (two along each axis, one diagonally) holds water over still
   * depth, and its surface stands below the Tonelli–Petti ratio.
   */
  private updateMask(): void {
    const { nx, nz, h, bed, still, mask, restLevel, f1: wet } = this;
    for (let i = 0; i < h.length; i += 1) {
      still[i] = Math.max(0, restLevel - bed[i]);
      wet[i] = h[i] > DISPERSIVE_DEPTH && still[i] > DISPERSIVE_DEPTH ? 1 : 0;
    }
    const periodic = this.xBoundary === PERIODIC;
    const column = (ix: number) => (ix < 0 ? (periodic ? ix + nx : 0) : ix >= nx ? (periodic ? ix - nx : nx - 1) : ix);
    const row = (iz: number) => Math.min(nz - 1, Math.max(0, iz));
    for (let iz = 0; iz < nz; iz += 1) {
      for (let ix = 0; ix < nx; ix += 1) {
        const i = iz * nx + ix;
        let all = wet[i] > 0 && h[i] - still[i] <= SWITCH_RATIO * still[i];
        for (let k = -2; k <= 2 && all; k += 1) all = wet[iz * nx + column(ix + k)] > 0 && wet[row(iz + k) * nx + ix] > 0;
        for (let k = -1; k <= 1 && all; k += 2) all = wet[row(iz + k) * nx + column(ix - 1)] > 0 && wet[row(iz + k) * nx + column(ix + 1)] > 0;
        mask[i] = all ? 1 : 0;
      }
    }
    this.derivativeX(still, this.dX, false);
    this.derivativeZ(still, this.dZ, false);
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
    const { nx, nz, qx: P, qz: Q, qBar, still: d, dX, dZ, mask, below, above, f2, f4, f6 } = this;
    const { lowerBand: a, diagonal: b, upperBand: c, right: r, scratch } = this;
    this.derivativeX(P, f2, true);
    this.derivativeZ(f2, f4, false);
    this.derivativeZ(P, f6, false);
    for (let ix = 0; ix < nx; ix += 1) {
      let any = false;
      for (let iz = 0; iz < nz; iz += 1) {
        const i = iz * nx + ix;
        if (mask[i] > 0) {
          any = true;
          const minus = below[iz];
          const plus = above[iz];
          const sum = minus + plus;
          const A = ALPHA * d[i] * d[i];
          const E = (d[i] * dZ[i]) / 3;
          a[iz] = -(A * (2 / (minus * sum)) + E * (-plus / (minus * sum)));
          b[iz] = 1 - (A * (-2 / (minus * plus)) + E * ((plus - minus) / (plus * minus)));
          c[iz] = -(A * (2 / (plus * sum)) + E * (minus / (plus * sum)));
          r[iz] = qBar[i] + A * f4[i] + (d[i] * dZ[i] * f2[i]) / 6 + (d[i] * dX[i] * f6[i]) / 6;
        } else {
          a[iz] = 0;
          b[iz] = 1;
          c[iz] = 0;
          r[iz] = qBar[i];
        }
      }
      if (!any) {
        for (let iz = 0; iz < nz; iz += 1) Q[iz * nx + ix] = qBar[iz * nx + ix];
        continue;
      }
      b[0] -= a[0];
      a[0] = 0;
      b[nz - 1] -= c[nz - 1];
      c[nz - 1] = 0;
      thomas(a, b, c, r, scratch, nz);
      for (let iz = 0; iz < nz; iz += 1) Q[iz * nx + ix] = r[iz];
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
