import { GRAVITY } from './dispersion';

export type DepthFunction = (x: number, z: number) => number;

/** Along-shore edges: reflecting walls, wrap-around, or zero-gradient open edges. */
export type AlongShoreBoundary = 'wall' | 'periodic' | 'open';

export interface SolverGrid {
  nx: number;
  xMin: number;
  dx: number;
  /** nz + 1 increasing cell-edge positions along z (shoreward), m; spacing may vary. */
  zEdges: ArrayLike<number>;
  xBoundary?: AlongShoreBoundary;
}

export interface SolverOptions {
  gravity?: number;
  /** Manning bottom roughness n, s/m^(1/3). */
  manning?: number;
  /** Depth at or below which a cell carries no momentum, m. */
  dryDepth?: number;
  courant?: number;
  /** Still-water level above datum (tide), m. */
  waterLevel?: number;
}

export interface WaterTarget {
  eta: number;
  qx: number;
  qz: number;
}

export interface RelaxationZone {
  /** Per-step blend weight for each cell (index iz * nx + ix): 0 leaves it free, 1 prescribes it. */
  weights: Float64Array;
  target(x: number, z: number, t: number, out: WaterTarget): void;
}

/** Jacobsen et al. (2012) ramp: 0 at the zone's inner edge, 1 at its outer boundary. */
export function relaxationRamp(s: number): number {
  const clamped = Math.min(1, Math.max(0, s));
  return (Math.exp(Math.pow(clamped, 3.5)) - 1) / (Math.E - 1);
}

export function uniformEdges(start: number, end: number, count: number): Float64Array {
  const edges = new Float64Array(count + 1);
  for (let i = 0; i <= count; i += 1) edges[i] = start + ((end - start) * i) / count;
  return edges;
}

/**
 * Cross-shore edges from `offshore` to `shore`: uniform cells of about `fine`
 * shoreward of `fineFrom`, growing by at most `growth` per cell to `coarse`
 * toward `offshore`. The offshore cells are scaled together to fit exactly.
 */
export function stretchedEdges(offshore: number, shore: number, fineFrom: number, fine: number, coarse: number, growth = 1.08): Float64Array {
  const fineCount = Math.max(1, Math.round((shore - fineFrom) / fine));
  const fineSpacing = (shore - fineFrom) / fineCount;
  const span = fineFrom - offshore;
  const spacings: number[] = [];
  let covered = 0;
  let spacing = fineSpacing;
  while (covered < span) {
    spacing = Math.min(coarse, spacing * growth);
    spacings.push(spacing);
    covered += spacing;
  }
  const scale = spacings.length > 0 ? span / covered : 1;
  const edges = new Float64Array(spacings.length + fineCount + 1);
  edges[0] = offshore;
  let z = offshore;
  for (let k = spacings.length - 1; k >= 0; k -= 1) {
    z += spacings[k] * scale;
    edges[spacings.length - k] = z;
  }
  edges[spacings.length] = fineFrom;
  for (let k = 1; k <= fineCount; k += 1) edges[spacings.length + k] = fineFrom + k * fineSpacing;
  edges[edges.length - 1] = shore;
  return edges;
}

const WALL = 0;
const PERIODIC = 1;
const OPEN = 2;

interface Flux {
  mass: number;
  normal: number;
  tangent: number;
  leftCorrection: number;
  rightCorrection: number;
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

interface ZoneEntry {
  zone: RelaxationZone;
  firstRow: number;
  lastRow: number;
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
  protected readonly restLevel: number;
  protected readonly depthAt: DepthFunction;
  private readonly manning: number;
  private readonly courant: number;
  private readonly xBoundary: number;
  private readonly zEdges: Float64Array;
  private readonly zGaps: Float64Array;
  private readonly u: Float64Array;
  private readonly w: Float64Array;
  private readonly eta: Float64Array;
  private readonly stageH: Float64Array;
  private readonly stageQx: Float64Array;
  private readonly stageQz: Float64Array;
  private readonly rateH: Float64Array;
  private readonly rateQx: Float64Array;
  private readonly rateQz: Float64Array;
  private readonly flux: Flux = { mass: 0, normal: 0, tangent: 0, leftCorrection: 0, rightCorrection: 0 };
  private readonly hW: Float64Array;
  private readonly hE: Float64Array;
  private readonly etaW: Float64Array;
  private readonly etaE: Float64Array;
  private readonly unW: Float64Array;
  private readonly unE: Float64Array;
  private readonly utW: Float64Array;
  private readonly utE: Float64Array;
  private readonly zones: ZoneEntry[] = [];
  private readonly target: WaterTarget = { eta: 0, qx: 0, qz: 0 };
  /** Depth array the current sweep reads (h or the RK stage). */
  private lineDepth: Float64Array;

  constructor(grid: SolverGrid, depthAt: DepthFunction, options: SolverOptions = {}) {
    this.nx = grid.nx;
    this.nz = grid.zEdges.length - 1;
    this.dx = grid.dx;
    this.xBoundary = grid.xBoundary === 'periodic' ? PERIODIC : grid.xBoundary === 'open' ? OPEN : WALL;
    this.depthAt = depthAt;
    this.gravity = options.gravity ?? GRAVITY;
    this.manning = options.manning ?? 0.02;
    this.dryDepth = options.dryDepth ?? 1e-4;
    this.courant = options.courant ?? 0.45;
    this.restLevel = options.waterLevel ?? 0;
    this.zEdges = Float64Array.from(grid.zEdges);
    this.xCenters = new Float64Array(this.nx);
    for (let ix = 0; ix < this.nx; ix += 1) this.xCenters[ix] = grid.xMin + (ix + 0.5) * grid.dx;
    this.zCenters = new Float64Array(this.nz);
    this.dz = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.zCenters[iz] = 0.5 * (this.zEdges[iz] + this.zEdges[iz + 1]);
      this.dz[iz] = this.zEdges[iz + 1] - this.zEdges[iz];
    }
    this.zGaps = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.zGaps[iz] = iz < this.nz - 1 ? this.zCenters[iz + 1] - this.zCenters[iz] : this.dz[iz];
    }
    const size = this.nx * this.nz;
    const make = () => new Float64Array(size);
    this.bed = make(); this.h = make(); this.qx = make(); this.qz = make();
    this.u = make(); this.w = make(); this.eta = make();
    this.stageH = make(); this.stageQx = make(); this.stageQz = make();
    this.rateH = make(); this.rateQx = make(); this.rateQz = make();
    this.lineDepth = this.h;
    const lineLength = Math.max(this.nx, this.nz);
    const face = () => new Float64Array(lineLength);
    this.hW = face(); this.hE = face(); this.etaW = face(); this.etaE = face();
    this.unW = face(); this.unE = face(); this.utW = face(); this.utE = face();
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        this.bed[i] = -depthAt(this.xCenters[ix], this.zCenters[iz]);
        this.h[i] = Math.max(0, this.restLevel - this.bed[i]);
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
      const inverseDz = 1 / this.dz[iz];
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        const depth = this.h[i];
        if (depth <= this.dryDepth) continue;
        const c = Math.sqrt(this.gravity * depth);
        rate = Math.max(rate, (Math.abs(this.qx[i] / depth) + c) / this.dx, (Math.abs(this.qz[i] / depth) + c) * inverseDz);
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
      this.relax();
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

  addRelaxationZone(zone: RelaxationZone): void {
    let firstRow = this.nz;
    let lastRow = -1;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        if (zone.weights[iz * this.nx + ix] <= 0) continue;
        firstRow = Math.min(firstRow, iz);
        lastRow = Math.max(lastRow, iz);
      }
    }
    this.zones.push({ zone, firstRow, lastRow });
  }

  /** Weights for a zone spanning z from `inner` (weight 0) to `outer` (weight 1). */
  zoneWeightsAlongZ(inner: number, outer: number): Float64Array {
    const weights = new Float64Array(this.nx * this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      const s = (this.zCenters[iz] - inner) / (outer - inner);
      if (s <= 0) continue;
      weights.fill(relaxationRamp(s), iz * this.nx, (iz + 1) * this.nx);
    }
    return weights;
  }

  /** Blend relaxation zones toward their prescribed water after each sub-step. */
  private relax(): void {
    for (const { zone, firstRow, lastRow } of this.zones) {
      for (let iz = firstRow; iz <= lastRow; iz += 1) {
        for (let ix = 0; ix < this.nx; ix += 1) {
          const i = iz * this.nx + ix;
          const weight = zone.weights[i];
          if (weight <= 0) continue;
          zone.target(this.xCenters[ix], this.zCenters[iz], this.time, this.target);
          const targetDepth = Math.max(0, this.target.eta - this.bed[i]);
          this.h[i] += weight * (targetDepth - this.h[i]);
          const wet = this.h[i] > this.dryDepth;
          this.qx[i] = wet ? this.qx[i] + weight * (this.target.qx - this.qx[i]) : 0;
          this.qz[i] = wet ? this.qz[i] + weight * (this.target.qz - this.qz[i]) : 0;
        }
      }
    }
  }

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
        const speed = Math.sqrt(qx[i] * qx[i] + qz[i] * qz[i]) / depth;
        // Semi-implicit Manning friction; depth^(4/3) = depth · ∛depth.
        const damping = 1 + (factor * speed) / (depth * Math.cbrt(depth));
        qx[i] /= damping;
        qz[i] /= damping;
      }
    }
  }

  private computeRates(h: Float64Array, qx: Float64Array, qz: Float64Array): void {
    const { u, w, eta, bed, rateH, rateQx, rateQz } = this;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > this.dryDepth;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
      eta[i] = h[i] + bed[i];
      rateH[i] = 0;
      rateQx[i] = 0;
      rateQz[i] = 0;
    }
    this.lineDepth = h;
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.sweepLine(iz * this.nx, 1, this.nx, this.xBoundary, null, this.dx, u, w, rateQx, rateQz);
    }
    for (let ix = 0; ix < this.nx; ix += 1) {
      this.sweepLine(ix, this.nx, this.nz, WALL, this.dz, 0, w, u, rateQz, rateQx);
    }
  }

  /** Second-order fluxes and well-balanced sources along one row or column, read in place. */
  private sweepLine(
    base: number, stride: number, n: number, boundary: number,
    widths: Float64Array | null, uniformWidth: number,
    normal: Float64Array, tangent: Float64Array, rateNormal: Float64Array, rateTangent: Float64Array,
  ): void {
    const h = this.lineDepth;
    const { eta, rateH, flux, gravity: g, hW, hE, etaW, etaE, unW, unE, utW, utE } = this;
    const gaps = widths ? this.zGaps : null;
    const wall = boundary === WALL;
    const periodic = boundary === PERIODIC;
    for (let j = 0; j < n; j += 1) {
      const index = base + j * stride;
      const hj = h[index];
      const hasPrevious = j > 0 || periodic;
      const hasNext = j < n - 1 || periodic;
      const previous = j > 0 ? index - stride : base + (n - 1) * stride;
      const following = j < n - 1 ? index + stride : base;
      const hPrevious = hasPrevious ? h[previous] : hj;
      const hNext = hasNext ? h[following] : hj;
      if (hj <= 0 && hPrevious <= 0 && hNext <= 0) {
        hW[j] = 0; hE[j] = 0;
        continue;
      }
      const width = widths ? widths[j] : uniformWidth;
      const backScale = hasPrevious ? width / (gaps ? gaps[j > 0 ? j - 1 : n - 1] : uniformWidth) : 1;
      const forwardScale = hasNext ? width / (gaps ? gaps[j < n - 1 ? j : n - 1] : uniformWidth) : 1;
      const etaj = eta[index];
      const unj = normal[index];
      const utj = tangent[index];
      const etaPrevious = hasPrevious ? eta[previous] : etaj;
      const etaNext = hasNext ? eta[following] : etaj;
      const unPrevious = hasPrevious ? normal[previous] : wall ? -unj : unj;
      const unNext = hasNext ? normal[following] : wall ? -unj : unj;
      const utPrevious = hasPrevious ? tangent[previous] : utj;
      const utNext = hasNext ? tangent[following] : utj;
      const sh = 0.5 * limited((hj - hPrevious) * backScale, (hNext - hj) * forwardScale);
      const se = 0.5 * limited((etaj - etaPrevious) * backScale, (etaNext - etaj) * forwardScale);
      const su = 0.5 * limited((unj - unPrevious) * backScale, (unNext - unj) * forwardScale);
      const sv = 0.5 * limited((utj - utPrevious) * backScale, (utNext - utj) * forwardScale);
      const west = hj - sh;
      const east = hj + sh;
      hW[j] = west > 0 ? west : 0;
      hE[j] = east > 0 ? east : 0;
      etaW[j] = etaj - se;
      etaE[j] = etaj + se;
      unW[j] = unj - su;
      unE[j] = unj + su;
      utW[j] = utj - sv;
      utE[j] = utj + sv;
    }
    const interfaces = periodic ? n : n - 1;
    for (let j = 0; j < interfaces; j += 1) {
      const k = j + 1 < n ? j + 1 : 0;
      if (hE[j] <= 0 && hW[k] <= 0) continue;
      const left = base + j * stride;
      const right = base + k * stride;
      const leftWidth = widths ? widths[j] : uniformWidth;
      const rightWidth = widths ? widths[k] : uniformWidth;
      interfaceFlux(hE[j], etaE[j], unE[j], utE[j], hW[k], etaW[k], unW[k], utW[k], g, flux);
      rateH[left] -= flux.mass / leftWidth;
      rateNormal[left] -= (flux.normal + flux.leftCorrection) / leftWidth;
      rateTangent[left] -= flux.tangent / leftWidth;
      rateH[right] += flux.mass / rightWidth;
      rateNormal[right] += (flux.normal + flux.rightCorrection) / rightWidth;
      rateTangent[right] += flux.tangent / rightWidth;
    }
    if (!periodic) {
      if (hW[0] > 0) {
        const width = widths ? widths[0] : uniformWidth;
        interfaceFlux(hW[0], etaW[0], wall ? -unW[0] : unW[0], utW[0], hW[0], etaW[0], unW[0], utW[0], g, flux);
        rateH[base] += flux.mass / width;
        rateNormal[base] += (flux.normal + flux.rightCorrection) / width;
        rateTangent[base] += flux.tangent / width;
      }
      const lastJ = n - 1;
      if (hE[lastJ] > 0) {
        const last = base + lastJ * stride;
        const width = widths ? widths[lastJ] : uniformWidth;
        interfaceFlux(hE[lastJ], etaE[lastJ], unE[lastJ], utE[lastJ], hE[lastJ], etaE[lastJ], wall ? -unE[lastJ] : unE[lastJ], utE[lastJ], g, flux);
        rateH[last] -= flux.mass / width;
        rateNormal[last] -= (flux.normal + flux.leftCorrection) / width;
        rateTangent[last] -= flux.tangent / width;
      }
    }
    // Centred bed-slope source of the second-order hydrostatic reconstruction.
    for (let j = 0; j < n; j += 1) {
      const depthSum = hW[j] + hE[j];
      if (depthSum <= 0) continue;
      const width = widths ? widths[j] : uniformWidth;
      rateNormal[base + j * stride] += (g * 0.5 * depthSum * ((etaW[j] - hW[j]) - (etaE[j] - hE[j]))) / width;
    }
  }

}
