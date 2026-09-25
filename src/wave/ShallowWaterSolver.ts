import { GRAVITY } from './dispersion';

export type DepthFunction = (x: number, z: number) => number;

export interface SolverGrid {
  nx: number;
  xMin: number;
  dx: number;
  /** nz + 1 increasing cell-edge positions along z (shoreward), m; spacing may vary. */
  zEdges: ArrayLike<number>;
  /** Wrap the along-shore boundaries (true) or treat them as walls (default). */
  periodicX?: boolean;
}

export interface SolverOptions {
  gravity?: number;
  /** Manning bottom roughness n, s/m^(1/3). */
  manning?: number;
  /** Depth at or below which a cell carries no momentum, m. */
  dryDepth?: number;
  courant?: number;
  /** Initial still-water level above datum (tide), m. */
  waterLevel?: number;
}

export function uniformEdges(start: number, end: number, count: number): Float64Array {
  const edges = new Float64Array(count + 1);
  for (let i = 0; i <= count; i += 1) edges[i] = start + ((end - start) * i) / count;
  return edges;
}

interface Flux {
  mass: number;
  normal: number;
  tangent: number;
  leftCorrection: number;
  rightCorrection: number;
}

/** Scratch arrays for one row or column of cells. */
class Line {
  readonly h: Float64Array;
  readonly eta: Float64Array;
  readonly un: Float64Array;
  readonly ut: Float64Array;
  readonly width: Float64Array;
  /** gap[j]: distance between centres j and j + 1 (the last entry closes a periodic line). */
  readonly gap: Float64Array;
  readonly hW: Float64Array;
  readonly hE: Float64Array;
  readonly etaW: Float64Array;
  readonly etaE: Float64Array;
  readonly unW: Float64Array;
  readonly unE: Float64Array;
  readonly utW: Float64Array;
  readonly utE: Float64Array;
  readonly rh: Float64Array;
  readonly rn: Float64Array;
  readonly rt: Float64Array;

  constructor(size: number) {
    const make = () => new Float64Array(size);
    this.h = make(); this.eta = make(); this.un = make(); this.ut = make();
    this.width = make(); this.gap = make();
    this.hW = make(); this.hE = make(); this.etaW = make(); this.etaE = make();
    this.unW = make(); this.unE = make(); this.utW = make(); this.utE = make();
    this.rh = make(); this.rn = make(); this.rt = make();
  }
}

/** Monotonized-central limited slope from backward and forward differences. */
function limited(back: number, forward: number): number {
  if (back * forward <= 0) return 0;
  const magnitude = Math.min(Math.abs(0.5 * (back + forward)), 2 * Math.abs(back), 2 * Math.abs(forward));
  return back > 0 ? magnitude : -magnitude;
}

/**
 * HLL flux with the hydrostatic reconstruction of Audusse et al. (2004): both
 * sides are lowered onto the higher bed, and the pressure lost in doing so is
 * returned to each cell as a correction. This keeps a lake at rest exactly at
 * rest over any bed, and dry cells positive.
 */
function interfaceFlux(
  hL: number, etaL: number, uL: number, vL: number,
  hR: number, etaR: number, uR: number, vR: number,
  g: number, out: Flux,
): void {
  const bedStar = Math.max(etaL - hL, etaR - hR);
  const hLs = Math.max(0, etaL - bedStar);
  const hRs = Math.max(0, etaR - bedStar);
  out.leftCorrection = 0.5 * g * (hL * hL - hLs * hLs);
  out.rightCorrection = 0.5 * g * (hR * hR - hRs * hRs);
  if (hLs <= 0 && hRs <= 0) {
    out.mass = 0; out.normal = 0; out.tangent = 0;
    return;
  }
  const cL = Math.sqrt(g * hLs);
  const cR = Math.sqrt(g * hRs);
  let sL: number;
  let sR: number;
  if (hLs <= 0) { sL = uR - 2 * cR; sR = uR + cR; }
  else if (hRs <= 0) { sL = uL - cL; sR = uL + 2 * cL; }
  else { sL = Math.min(uL - cL, uR - cR); sR = Math.max(uL + cL, uR + cR); }
  const massL = hLs * uL;
  const massR = hRs * uR;
  const normalL = massL * uL + 0.5 * g * hLs * hLs;
  const normalR = massR * uR + 0.5 * g * hRs * hRs;
  const tangentL = massL * vL;
  const tangentR = massR * vR;
  if (sL >= 0) { out.mass = massL; out.normal = normalL; out.tangent = tangentL; return; }
  if (sR <= 0) { out.mass = massR; out.normal = normalR; out.tangent = tangentR; return; }
  const inverse = 1 / (sR - sL);
  out.mass = (sR * massL - sL * massR + sL * sR * (hRs - hLs)) * inverse;
  out.normal = (sR * normalL - sL * normalR + sL * sR * (massR - massL)) * inverse;
  out.tangent = (sR * tangentL - sL * tangentR + sL * sR * (hRs * vR - hLs * vL)) * inverse;
}

/** Second-order fluxes and well-balanced sources along one line of cells (wall or periodic ends). */
function solveLine(line: Line, n: number, periodic: boolean, g: number, flux: Flux): void {
  const { h, eta, un, ut, width, gap, hW, hE, etaW, etaE, unW, unE, utW, utE, rh, rn, rt } = line;
  for (let j = 0; j < n; j += 1) {
    const hasPrevious = j > 0 || periodic;
    const hasNext = j < n - 1 || periodic;
    const previous = j > 0 ? j - 1 : n - 1;
    const next = j < n - 1 ? j + 1 : 0;
    // Walls mirror the cell: same depth and surface, reversed normal velocity.
    const backScale = width[j] / (j > 0 ? gap[j - 1] : periodic ? gap[n - 1] : width[j]);
    const forwardScale = width[j] / (j < n - 1 ? gap[j] : periodic ? gap[n - 1] : width[j]);
    const hPrevious = hasPrevious ? h[previous] : h[j];
    const hNext = hasNext ? h[next] : h[j];
    const etaPrevious = hasPrevious ? eta[previous] : eta[j];
    const etaNext = hasNext ? eta[next] : eta[j];
    const unPrevious = hasPrevious ? un[previous] : -un[j];
    const unNext = hasNext ? un[next] : -un[j];
    const utPrevious = hasPrevious ? ut[previous] : ut[j];
    const utNext = hasNext ? ut[next] : ut[j];
    const sh = 0.5 * limited((h[j] - hPrevious) * backScale, (hNext - h[j]) * forwardScale);
    const se = 0.5 * limited((eta[j] - etaPrevious) * backScale, (etaNext - eta[j]) * forwardScale);
    const su = 0.5 * limited((un[j] - unPrevious) * backScale, (unNext - un[j]) * forwardScale);
    const sv = 0.5 * limited((ut[j] - utPrevious) * backScale, (utNext - ut[j]) * forwardScale);
    hW[j] = Math.max(0, h[j] - sh);
    hE[j] = Math.max(0, h[j] + sh);
    etaW[j] = eta[j] - se;
    etaE[j] = eta[j] + se;
    unW[j] = un[j] - su;
    unE[j] = un[j] + su;
    utW[j] = ut[j] - sv;
    utE[j] = ut[j] + sv;
    rh[j] = 0;
    rn[j] = 0;
    rt[j] = 0;
  }
  const interfaces = periodic ? n : n - 1;
  for (let j = 0; j < interfaces; j += 1) {
    const k = j + 1 < n ? j + 1 : 0;
    interfaceFlux(hE[j], etaE[j], unE[j], utE[j], hW[k], etaW[k], unW[k], utW[k], g, flux);
    rh[j] -= flux.mass / width[j];
    rn[j] -= (flux.normal + flux.leftCorrection) / width[j];
    rt[j] -= flux.tangent / width[j];
    rh[k] += flux.mass / width[k];
    rn[k] += (flux.normal + flux.rightCorrection) / width[k];
    rt[k] += flux.tangent / width[k];
  }
  if (!periodic) {
    interfaceFlux(hW[0], etaW[0], -unW[0], utW[0], hW[0], etaW[0], unW[0], utW[0], g, flux);
    rh[0] += flux.mass / width[0];
    rn[0] += (flux.normal + flux.rightCorrection) / width[0];
    rt[0] += flux.tangent / width[0];
    const last = n - 1;
    interfaceFlux(hE[last], etaE[last], unE[last], utE[last], hE[last], etaE[last], -unE[last], utE[last], g, flux);
    rh[last] -= flux.mass / width[last];
    rn[last] -= (flux.normal + flux.leftCorrection) / width[last];
    rt[last] -= flux.tangent / width[last];
  }
  // Centred bed-slope source of the second-order hydrostatic reconstruction.
  for (let j = 0; j < n; j += 1) {
    rn[j] += (g * 0.5 * (hW[j] + hE[j]) * ((etaW[j] - hW[j]) - (etaE[j] - hE[j]))) / width[j];
  }
}

/**
 * Stage 1 surf-zone solver: nonlinear shallow-water equations on a grid that is
 * uniform along shore (x) and may stretch across shore (z). Breaking waves
 * become shock-captured bores; there is no dispersion (see plan §1.7).
 */
export class ShallowWaterSolver {
  readonly nx: number;
  readonly nz: number;
  readonly dx: number;
  readonly xCenters: Float64Array;
  readonly zCenters: Float64Array;
  readonly dz: Float64Array;
  /** Bed elevation b = −depth, m. */
  readonly bed: Float64Array;
  /** Total water depth, m. */
  readonly h: Float64Array;
  /** Depth-integrated flow along x and z, m²/s. */
  readonly qx: Float64Array;
  readonly qz: Float64Array;
  time = 0;
  protected readonly gravity: number;
  protected readonly dryDepth: number;
  private readonly manning: number;
  private readonly courant: number;
  private readonly periodicX: boolean;
  private readonly zEdges: Float64Array;
  private readonly u: Float64Array;
  private readonly w: Float64Array;
  private readonly eta: Float64Array;
  private readonly stageH: Float64Array;
  private readonly stageQx: Float64Array;
  private readonly stageQz: Float64Array;
  private readonly rateH: Float64Array;
  private readonly rateQx: Float64Array;
  private readonly rateQz: Float64Array;
  private readonly line: Line;
  private readonly flux: Flux = { mass: 0, normal: 0, tangent: 0, leftCorrection: 0, rightCorrection: 0 };

  constructor(grid: SolverGrid, depthAt: DepthFunction, options: SolverOptions = {}) {
    this.nx = grid.nx;
    this.nz = grid.zEdges.length - 1;
    this.dx = grid.dx;
    this.periodicX = grid.periodicX ?? false;
    this.gravity = options.gravity ?? GRAVITY;
    this.manning = options.manning ?? 0.02;
    this.dryDepth = options.dryDepth ?? 1e-4;
    this.courant = options.courant ?? 0.45;
    this.zEdges = Float64Array.from(grid.zEdges);
    this.xCenters = new Float64Array(this.nx);
    for (let ix = 0; ix < this.nx; ix += 1) this.xCenters[ix] = grid.xMin + (ix + 0.5) * grid.dx;
    this.zCenters = new Float64Array(this.nz);
    this.dz = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.zCenters[iz] = 0.5 * (this.zEdges[iz] + this.zEdges[iz + 1]);
      this.dz[iz] = this.zEdges[iz + 1] - this.zEdges[iz];
    }
    const size = this.nx * this.nz;
    const make = () => new Float64Array(size);
    this.bed = make(); this.h = make(); this.qx = make(); this.qz = make();
    this.u = make(); this.w = make(); this.eta = make();
    this.stageH = make(); this.stageQx = make(); this.stageQz = make();
    this.rateH = make(); this.rateQx = make(); this.rateQz = make();
    this.line = new Line(Math.max(this.nx, this.nz));
    const level = options.waterLevel ?? 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        this.bed[i] = -depthAt(this.xCenters[ix], this.zCenters[iz]);
        this.h[i] = Math.max(0, level - this.bed[i]);
      }
    }
  }

  surfaceAt(index: number): number {
    return this.h[index] + this.bed[index];
  }

  /** Index of the cell containing (x, z), clamped to the grid. */
  cellIndex(x: number, z: number): number {
    const ix = Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.xCenters[0]) / this.dx + 0.5)));
    let low = 0;
    let high = this.nz;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (this.zEdges[middle] <= z) low = middle;
      else high = middle;
    }
    return low * this.nx + ix;
  }

  /** Largest time step the CFL condition allows for the current state, s. */
  maxStableStep(): number {
    let rate = 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        const depth = this.h[i];
        if (depth <= this.dryDepth) continue;
        const c = Math.sqrt(this.gravity * depth);
        rate = Math.max(rate, (Math.abs(this.qx[i] / depth) + c) / this.dx, (Math.abs(this.qz[i] / depth) + c) / this.dz[iz]);
      }
    }
    return rate > 0 ? this.courant / rate : Infinity;
  }

  /** Advance by dt seconds, sub-stepping as the CFL condition requires. */
  step(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const substeps = Math.max(1, Math.ceil(dt / this.maxStableStep()));
    const sub = dt / substeps;
    for (let s = 0; s < substeps; s += 1) {
      this.advance(sub);
      this.time += sub;
      this.afterSubstep(sub);
    }
  }

  totalVolume(): number {
    let volume = 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) volume += this.h[iz * this.nx + ix] * this.dx * this.dz[iz];
    }
    return volume;
  }

  /** Kinetic plus potential energy relative to datum, per unit density, m⁵/s². */
  totalEnergy(): number {
    let energy = 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        const depth = this.h[i];
        const surface = depth + this.bed[i];
        const kinetic = depth > this.dryDepth ? (0.5 * (this.qx[i] ** 2 + this.qz[i] ** 2)) / depth : 0;
        energy += (kinetic + 0.5 * this.gravity * (surface * surface - this.bed[i] * this.bed[i])) * this.dx * this.dz[iz];
      }
    }
    return energy;
  }

  /** Hook for boundary work after each sub-step (relaxation zones in Task 3). */
  protected afterSubstep(_dt: number): void {}

  private advance(dt: number): void {
    const { h, qx, qz, stageH, stageQx, stageQz, rateH, rateQx, rateQz } = this;
    this.computeRates(h, qx, qz);
    for (let i = 0; i < h.length; i += 1) {
      stageH[i] = Math.max(0, h[i] + dt * rateH[i]);
      const wet = stageH[i] > this.dryDepth;
      stageQx[i] = wet ? qx[i] + dt * rateQx[i] : 0;
      stageQz[i] = wet ? qz[i] + dt * rateQz[i] : 0;
    }
    this.computeRates(stageH, stageQx, stageQz);
    for (let i = 0; i < h.length; i += 1) {
      h[i] = Math.max(0, 0.5 * (h[i] + stageH[i] + dt * rateH[i]));
      const wet = h[i] > this.dryDepth;
      qx[i] = wet ? 0.5 * (qx[i] + stageQx[i] + dt * rateQx[i]) : 0;
      qz[i] = wet ? 0.5 * (qz[i] + stageQz[i] + dt * rateQz[i]) : 0;
    }
    if (this.manning > 0) {
      const factor = dt * this.gravity * this.manning * this.manning;
      for (let i = 0; i < h.length; i += 1) {
        const depth = h[i];
        if (depth <= this.dryDepth) continue;
        const speed = Math.hypot(qx[i], qz[i]) / depth;
        const damping = 1 + (factor * speed) / Math.pow(depth, 4 / 3);
        qx[i] /= damping;
        qz[i] /= damping;
      }
    }
  }

  private computeRates(h: Float64Array, qx: Float64Array, qz: Float64Array): void {
    const { nx, nz, u, w, eta, bed, rateH, rateQx, rateQz, line, flux, gravity } = this;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > this.dryDepth;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
      eta[i] = h[i] + bed[i];
      rateH[i] = 0;
      rateQx[i] = 0;
      rateQz[i] = 0;
    }
    line.width.fill(this.dx, 0, nx);
    line.gap.fill(this.dx, 0, nx);
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        line.h[ix] = h[row + ix]; line.eta[ix] = eta[row + ix]; line.un[ix] = u[row + ix]; line.ut[ix] = w[row + ix];
      }
      solveLine(line, nx, this.periodicX, gravity, flux);
      for (let ix = 0; ix < nx; ix += 1) {
        rateH[row + ix] += line.rh[ix]; rateQx[row + ix] += line.rn[ix]; rateQz[row + ix] += line.rt[ix];
      }
    }
    for (let iz = 0; iz < nz; iz += 1) {
      line.width[iz] = this.dz[iz];
      line.gap[iz] = iz < nz - 1 ? this.zCenters[iz + 1] - this.zCenters[iz] : this.dz[iz];
    }
    for (let ix = 0; ix < nx; ix += 1) {
      for (let iz = 0; iz < nz; iz += 1) {
        const i = iz * nx + ix;
        line.h[iz] = h[i]; line.eta[iz] = eta[i]; line.un[iz] = w[i]; line.ut[iz] = u[i];
      }
      solveLine(line, nz, false, gravity, flux);
      for (let iz = 0; iz < nz; iz += 1) {
        const i = iz * nx + ix;
        rateH[i] += line.rh[iz]; rateQz[i] += line.rn[iz]; rateQx[i] += line.rt[iz];
      }
    }
  }
}
