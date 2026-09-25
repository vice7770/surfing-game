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
  target(x: number, z: number, t: number, out: WaterTarget, index: number): void;
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
  readonly restLevel: number;
  protected readonly depthAt: DepthFunction;
  private readonly manning: number;
  private readonly courant: number;
  private readonly xBoundary: number;
  private readonly zEdges: Float64Array;
  private readonly zGaps: Float64Array;
  private readonly u: Float64Array;
  private readonly w: Float64Array;
  private readonly eta: Float64Array;
  private readonly rateH: Float64Array;
  private readonly rateQx: Float64Array;
  private readonly rateQz: Float64Array;
  private readonly flux: Flux = { mass: 0, normal: 0, tangent: 0, leftCorrection: 0, rightCorrection: 0 };
  /** MUSCL face states per cell: x faces (west/east) and z faces (south/north). */
  private readonly xhW: Float64Array;
  private readonly xhE: Float64Array;
  private readonly xetaW: Float64Array;
  private readonly xetaE: Float64Array;
  private readonly xuW: Float64Array;
  private readonly xuE: Float64Array;
  private readonly xwW: Float64Array;
  private readonly xwE: Float64Array;
  private readonly zhS: Float64Array;
  private readonly zhN: Float64Array;
  private readonly zetaS: Float64Array;
  private readonly zetaN: Float64Array;
  private readonly zwS: Float64Array;
  private readonly zwN: Float64Array;
  private readonly zuS: Float64Array;
  private readonly zuN: Float64Array;
  private readonly zones: ZoneEntry[] = [];
  private readonly target: WaterTarget = { eta: 0, qx: 0, qz: 0 };

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
    this.rateH = make(); this.rateQx = make(); this.rateQz = make();
    this.xhW = make(); this.xhE = make(); this.xetaW = make(); this.xetaE = make();
    this.xuW = make(); this.xuE = make(); this.xwW = make(); this.xwE = make();
    this.zhS = make(); this.zhN = make(); this.zetaS = make(); this.zetaN = make();
    this.zwS = make(); this.zwN = make(); this.zuS = make(); this.zuN = make();
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

  /** Bilinear sample of a cell-centred field at (x, z), clamped to the outermost centres. */
  sampleCentered(values: Float64Array, x: number, z: number): number {
    const gx = Math.min(this.nx - 1, Math.max(0, (x - this.xCenters[0]) / this.dx));
    const ix = Math.min(this.nx - 2, Math.floor(gx));
    const tx = gx - ix;
    const iz = this.rowBelow(z);
    const tz = Math.min(1, Math.max(0, (z - this.zCenters[iz]) / (this.zCenters[iz + 1] - this.zCenters[iz])));
    const i = iz * this.nx + ix;
    return (values[i] * (1 - tx) + values[i + 1] * tx) * (1 - tz)
      + (values[i + this.nx] * (1 - tx) + values[i + this.nx + 1] * tx) * tz;
  }

  /** Largest row whose centre is at or below z, clamped to [0, nz − 2]. */
  rowBelow(z: number): number {
    let low = 0;
    let high = this.nz - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (this.zCenters[middle] <= z) low = middle;
      else high = middle;
    }
    return Math.min(low, this.nz - 2);
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

  /**
   * Move the window `columns` cells along shore (+x when positive) over the
   * fixed spot seabed. Overlapping water is kept exactly. New columns sample the
   * seabed and extend the old edge's surface and velocity, or rest at the still
   * level where the edge was dry. Relaxation weights move with their cells.
   */
  shiftAlongShore(columns: number): void {
    const shift = Math.trunc(columns);
    if (shift === 0) return;
    const { nx, nz } = this;
    if (Math.abs(shift) >= nx) throw new RangeError(`Cannot shift ${shift} columns in a ${nx}-column window`);
    for (let ix = 0; ix < nx; ix += 1) this.xCenters[ix] += shift * this.dx;
    const arrays = [this.bed, this.h, this.qx, this.qz, ...this.zones.map((entry) => entry.zone.weights)];
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      const oldEdge = shift > 0 ? row + nx - 1 : row;
      const edgeWet = this.h[oldEdge] > this.dryDepth;
      const edgeSurface = edgeWet ? this.h[oldEdge] + this.bed[oldEdge] : this.restLevel;
      const edgeU = edgeWet ? this.qx[oldEdge] / this.h[oldEdge] : 0;
      const edgeW = edgeWet ? this.qz[oldEdge] / this.h[oldEdge] : 0;
      for (const values of arrays) {
        if (shift > 0) values.copyWithin(row, row + shift, row + nx);
        else values.copyWithin(row - shift, row, row + nx + shift);
      }
      const keptEdge = shift > 0 ? row + nx - 1 - shift : row - shift;
      const start = shift > 0 ? nx - shift : 0;
      const end = shift > 0 ? nx : -shift;
      for (let ix = start; ix < end; ix += 1) {
        const i = row + ix;
        this.bed[i] = -this.depthAt(this.xCenters[ix], this.zCenters[iz]);
        const depth = Math.max(0, edgeSurface - this.bed[i]);
        const wet = depth > this.dryDepth;
        this.h[i] = depth;
        this.qx[i] = wet ? depth * edgeU : 0;
        this.qz[i] = wet ? depth * edgeW : 0;
        for (const entry of this.zones) entry.zone.weights[i] = entry.zone.weights[keptEdge];
      }
    }
  }

  /** Blend relaxation zones toward their prescribed water after each sub-step. */
  private relax(): void {
    for (const { zone, firstRow, lastRow } of this.zones) {
      for (let iz = firstRow; iz <= lastRow; iz += 1) {
        for (let ix = 0; ix < this.nx; ix += 1) {
          const i = iz * this.nx + ix;
          const weight = zone.weights[i];
          if (weight <= 0) continue;
          zone.target(this.xCenters[ix], this.zCenters[iz], this.time, this.target, i);
          const targetDepth = Math.max(0, this.target.eta - this.bed[i]);
          this.h[i] += weight * (targetDepth - this.h[i]);
          const wet = this.h[i] > this.dryDepth;
          this.qx[i] = wet ? this.qx[i] + weight * (this.target.qx - this.qx[i]) : 0;
          this.qz[i] = wet ? this.qz[i] + weight * (this.target.qz - this.qz[i]) : 0;
        }
      }
    }
  }

  /**
   * MUSCL-Hancock step: reconstruct faces once, advance them half a step with
   * each cell's own face fluxes (the Hancock predictor), then take one full
   * conservative step with Riemann fluxes of the predicted faces. One flux
   * evaluation per step instead of SSP-RK2's two.
   */
  private advance(dt: number): void {
    const { h, qx, qz, rateH, rateQx, rateQz } = this;
    this.predictFaces(0.5 * dt);
    rateH.fill(0);
    rateQx.fill(0);
    rateQz.fill(0);
    this.fluxAlongX();
    this.fluxAlongZ();
    for (let i = 0; i < h.length; i += 1) {
      h[i] = Math.max(0, h[i] + dt * rateH[i]);
      const wet = h[i] > this.dryDepth;
      qx[i] = wet ? qx[i] + dt * rateQx[i] : 0;
      qz[i] = wet ? qz[i] + dt * rateQz[i] : 0;
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

  /**
   * MC-limited faces of every cell along x and z (walls mirror, open edges extend
   * the cell), advanced half a step by the Hancock predictor in the same pass:
   * each cell's own face fluxes and the corrector's bed-slope source, so a lake
   * at rest predicts no change.
   */
  private predictFaces(half: number): void {
    const { nx, nz, h, qx, qz, bed, u, w, eta, dz, zGaps, dryDepth, gravity: g } = this;
    const { xhW, xhE, xetaW, xetaE, xuW, xuE, xwW, xwE, zhS, zhN, zetaS, zetaN, zwS, zwN, zuS, zuN } = this;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > dryDepth;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
      eta[i] = h[i] + bed[i];
    }
    const periodic = this.xBoundary === PERIODIC;
    const wallX = this.xBoundary === WALL;
    const invDx = 1 / this.dx;
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      const hasBelow = iz > 0;
      const hasAbove = iz < nz - 1;
      const backScale = hasBelow ? dz[iz] / zGaps[iz - 1] : 1;
      const forwardScale = hasAbove ? dz[iz] / zGaps[iz] : 1;
      const invDz = 1 / dz[iz];
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const hasLeft = ix > 0 || periodic;
        const hasRight = ix < nx - 1 || periodic;
        const left = ix > 0 ? i - 1 : row + nx - 1;
        const right = ix < nx - 1 ? i + 1 : row;
        const below = i - nx;
        const above = i + nx;
        const hi = h[i];
        const hL = hasLeft ? h[left] : hi;
        const hR = hasRight ? h[right] : hi;
        const hB = hasBelow ? h[below] : hi;
        const hA = hasAbove ? h[above] : hi;
        const ei = eta[i];
        if (hi <= 0 && hL <= 0 && hR <= 0 && hB <= 0 && hA <= 0) {
          xhW[i] = 0; xhE[i] = 0; xetaW[i] = ei; xetaE[i] = ei; xuW[i] = 0; xuE[i] = 0; xwW[i] = 0; xwE[i] = 0;
          zhS[i] = 0; zhN[i] = 0; zetaS[i] = ei; zetaN[i] = ei; zwS[i] = 0; zwN[i] = 0; zuS[i] = 0; zuN[i] = 0;
          continue;
        }
        const ui = u[i];
        const wi = w[i];
        // Along x: normal velocity u, tangential w.
        const shx = 0.5 * limited(hi - hL, hR - hi);
        const sex = 0.5 * limited(ei - (hasLeft ? eta[left] : ei), (hasRight ? eta[right] : ei) - ei);
        const sux = 0.5 * limited(ui - (hasLeft ? u[left] : wallX ? -ui : ui), (hasRight ? u[right] : wallX ? -ui : ui) - ui);
        const swx = 0.5 * limited(wi - (hasLeft ? w[left] : wi), (hasRight ? w[right] : wi) - wi);
        // Along z: normal velocity w, tangential u; walls at both ends.
        const shz = 0.5 * limited((hi - hB) * backScale, (hA - hi) * forwardScale);
        const sez = 0.5 * limited((ei - (hasBelow ? eta[below] : ei)) * backScale, ((hasAbove ? eta[above] : ei) - ei) * forwardScale);
        const swz = 0.5 * limited((wi - (hasBelow ? w[below] : -wi)) * backScale, ((hasAbove ? w[above] : -wi) - wi) * forwardScale);
        const suz = 0.5 * limited((ui - (hasBelow ? u[below] : ui)) * backScale, ((hasAbove ? u[above] : ui) - ui) * forwardScale);
        const westRaw = hi - shx;
        const eastRaw = hi + shx;
        const southRaw = hi - shz;
        const northRaw = hi + shz;
        const hW = westRaw > 0 ? westRaw : 0;
        const hE = eastRaw > 0 ? eastRaw : 0;
        const hS = southRaw > 0 ? southRaw : 0;
        const hN = northRaw > 0 ? northRaw : 0;
        const uW = ui - sux; const uE = ui + sux; const vW = wi - swx; const vE = wi + swx;
        const wS = wi - swz; const wN = wi + swz; const tS = ui - suz; const tN = ui + suz;
        const etaW = ei - sex; const etaE = ei + sex; const etaS = ei - sez; const etaN = ei + sez;
        // Hancock predictor.
        const massX = hE * uE - hW * uW;
        const massZ = hN * wN - hS * wS;
        const pressureX = hE * uE * uE + 0.5 * g * hE * hE - hW * uW * uW - 0.5 * g * hW * hW
          - g * 0.5 * (hW + hE) * ((etaW - hW) - (etaE - hE));
        const pressureZ = hN * wN * wN + 0.5 * g * hN * hN - hS * wS * wS - 0.5 * g * hS * hS
          - g * 0.5 * (hS + hN) * ((etaS - hS) - (etaN - hN));
        const shearX = hE * uE * vE - hW * uW * vW;
        const shearZ = hN * wN * tN - hS * wS * tS;
        const dH = -half * (massX * invDx + massZ * invDz);
        const dQx = -half * (pressureX * invDx + shearZ * invDz);
        const dQz = -half * (shearX * invDx + pressureZ * invDz);
        let depth = hW + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; xuW[i] = (hW * uW + dQx) * inverse; xwW[i] = (hW * vW + dQz) * inverse; }
        else { depth = depth > 0 ? depth : 0; xuW[i] = 0; xwW[i] = 0; }
        xetaW[i] = etaW + depth - hW; xhW[i] = depth;
        depth = hE + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; xuE[i] = (hE * uE + dQx) * inverse; xwE[i] = (hE * vE + dQz) * inverse; }
        else { depth = depth > 0 ? depth : 0; xuE[i] = 0; xwE[i] = 0; }
        xetaE[i] = etaE + depth - hE; xhE[i] = depth;
        depth = hS + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; zwS[i] = (hS * wS + dQz) * inverse; zuS[i] = (hS * tS + dQx) * inverse; }
        else { depth = depth > 0 ? depth : 0; zwS[i] = 0; zuS[i] = 0; }
        zetaS[i] = etaS + depth - hS; zhS[i] = depth;
        depth = hN + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; zwN[i] = (hN * wN + dQz) * inverse; zuN[i] = (hN * tN + dQx) * inverse; }
        else { depth = depth > 0 ? depth : 0; zwN[i] = 0; zuN[i] = 0; }
        zetaN[i] = etaN + depth - hN; zhN[i] = depth;
      }
    }
  }

  /** Riemann fluxes and well-balanced sources across x faces, row by row. */
  private fluxAlongX(): void {
    const { nx, nz, rateH, rateQx, rateQz, flux, gravity: g } = this;
    const { xhW, xhE, xetaW, xetaE, xuW, xuE, xwW, xwE } = this;
    const periodic = this.xBoundary === PERIODIC;
    const wall = this.xBoundary === WALL;
    const invDx = 1 / this.dx;
    const interfaces = periodic ? nx : nx - 1;
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < interfaces; ix += 1) {
        const left = row + ix;
        const right = ix + 1 < nx ? left + 1 : row;
        if (xhE[left] <= 0 && xhW[right] <= 0) continue;
        interfaceFlux(xhE[left], xetaE[left], xuE[left], xwE[left], xhW[right], xetaW[right], xuW[right], xwW[right], g, flux);
        rateH[left] -= flux.mass * invDx;
        rateQx[left] -= (flux.normal + flux.leftCorrection) * invDx;
        rateQz[left] -= flux.tangent * invDx;
        rateH[right] += flux.mass * invDx;
        rateQx[right] += (flux.normal + flux.rightCorrection) * invDx;
        rateQz[right] += flux.tangent * invDx;
      }
      if (!periodic) {
        const first = row;
        if (xhW[first] > 0) {
          interfaceFlux(xhW[first], xetaW[first], wall ? -xuW[first] : xuW[first], xwW[first],
            xhW[first], xetaW[first], xuW[first], xwW[first], g, flux);
          rateH[first] += flux.mass * invDx;
          rateQx[first] += (flux.normal + flux.rightCorrection) * invDx;
          rateQz[first] += flux.tangent * invDx;
        }
        const last = row + nx - 1;
        if (xhE[last] > 0) {
          interfaceFlux(xhE[last], xetaE[last], xuE[last], xwE[last],
            xhE[last], xetaE[last], wall ? -xuE[last] : xuE[last], xwE[last], g, flux);
          rateH[last] -= flux.mass * invDx;
          rateQx[last] -= (flux.normal + flux.leftCorrection) * invDx;
          rateQz[last] -= flux.tangent * invDx;
        }
      }
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const depthSum = xhW[i] + xhE[i];
        if (depthSum <= 0) continue;
        rateQx[i] += g * 0.5 * depthSum * ((xetaW[i] - xhW[i]) - (xetaE[i] - xhE[i])) * invDx;
      }
    }
  }

  /** Riemann fluxes and well-balanced sources across z faces, with walls at both cross-shore ends. */
  private fluxAlongZ(): void {
    const { nx, nz, dz, rateH, rateQx, rateQz, flux, gravity: g } = this;
    const { zhS, zhN, zetaS, zetaN, zwS, zwN, zuS, zuN } = this;
    for (let iz = 0; iz < nz - 1; iz += 1) {
      const invLower = 1 / dz[iz];
      const invUpper = 1 / dz[iz + 1];
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const lower = row + ix;
        const upper = lower + nx;
        if (zhN[lower] <= 0 && zhS[upper] <= 0) continue;
        interfaceFlux(zhN[lower], zetaN[lower], zwN[lower], zuN[lower], zhS[upper], zetaS[upper], zwS[upper], zuS[upper], g, flux);
        rateH[lower] -= flux.mass * invLower;
        rateQz[lower] -= (flux.normal + flux.leftCorrection) * invLower;
        rateQx[lower] -= flux.tangent * invLower;
        rateH[upper] += flux.mass * invUpper;
        rateQz[upper] += (flux.normal + flux.rightCorrection) * invUpper;
        rateQx[upper] += flux.tangent * invUpper;
      }
    }
    const invFirst = 1 / dz[0];
    const invLast = 1 / dz[nz - 1];
    const lastRow = (nz - 1) * nx;
    for (let ix = 0; ix < nx; ix += 1) {
      const south = ix;
      if (zhS[south] > 0) {
        interfaceFlux(zhS[south], zetaS[south], -zwS[south], zuS[south], zhS[south], zetaS[south], zwS[south], zuS[south], g, flux);
        rateH[south] += flux.mass * invFirst;
        rateQz[south] += (flux.normal + flux.rightCorrection) * invFirst;
        rateQx[south] += flux.tangent * invFirst;
      }
      const north = lastRow + ix;
      if (zhN[north] > 0) {
        interfaceFlux(zhN[north], zetaN[north], zwN[north], zuN[north], zhN[north], zetaN[north], -zwN[north], zuN[north], g, flux);
        rateH[north] -= flux.mass * invLast;
        rateQz[north] -= (flux.normal + flux.leftCorrection) * invLast;
        rateQx[north] -= flux.tangent * invLast;
      }
    }
    for (let iz = 0; iz < nz; iz += 1) {
      const inverse = 1 / dz[iz];
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const depthSum = zhS[i] + zhN[i];
        if (depthSum <= 0) continue;
        rateQz[i] += g * 0.5 * depthSum * ((zetaS[i] - zhS[i]) - (zetaN[i] - zhN[i])) * inverse;
      }
    }
  }
}
