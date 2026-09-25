import { waveNumber } from '../wave/dispersion';
import type { ShallowWaterSolver } from '../wave/ShallowWaterSolver';
import type { SurfZoneSimulation } from '../wave/SurfZoneSimulation';
import type { SurfWater, WaterSample } from './SurfWater';

/** Seawater density, kg/m³: turns a body's impulse into depth-integrated flow. */
export const SEAWATER_DENSITY = 1025;
/** A column shallower than this is dry, m: the renderer's convention. */
const WET = 0.01;
/** Breaking above this means a bore, where the linear profile does not hold. */
const BORE = 0.3;
/** Below this kh the profile is uniform to within 0.1 %. */
const SHALLOW_KH = 0.05;
/** Largest profile factor applied, u/ū. */
const MAX_PROFILE = 2;

/** Catmull-Rom weights for nodes −1, 0, 1, 2 at fraction t of the way from node 0 to node 1. */
export function catmullRomWeights(t: number): [number, number, number, number] {
  const t2 = t * t;
  const t3 = t2 * t;
  return [(-t3 + 2 * t2 - t) / 2, (3 * t3 - 5 * t2 + 2) / 2, (-3 * t3 + 4 * t2 + t) / 2, (t3 - t2) / 2];
}

/** d/dt of `catmullRomWeights`. */
function catmullRomSlopes(t: number): [number, number, number, number] {
  const t2 = t * t;
  return [(-3 * t2 + 4 * t - 1) / 2, (9 * t2 - 10 * t) / 2, (-9 * t2 + 8 * t + 1) / 2, (3 * t2 - 2 * t) / 2];
}

export interface PhysicalSurfWaterOptions {
  /** Peak period, s: sets k for the vertical profile at each local depth. */
  peakPeriod: number;
  /** Breaking strength per cell, if the water breaks. */
  breaking?: ArrayLike<number>;
  /** Render node spacing, m (the physical mode renders at 1 m). */
  nodeSpacing?: number;
}

/**
 * The physical surf zone through the SurfWater seam (board plan B0, wave plan
 * P4b, Q10), for bodies stepped with the solver in its worker.
 *
 * - **Surface:** Catmull-Rom over the uniform render nodes, each node being the
 *   solver's bilinear cell sample, which is exactly the value the renderer uploads.
 *   At render vertices the board meets the drawn surface and the shader's
 *   central-difference normal, and between nodes the slope stays continuous.
 * - **Flow:** the depth-averaged current reshaped by the linear profile
 *   u/ū = kh cosh(k s)/sinh(kh) at height s above the bed (§1.10), with k from the
 *   peak period at the local depth, capped at 2. It stays depth-averaged in bores
 *   and very shallow water. Vertical flow is reconstructed from continuity
 *   (∂η/∂t = −∇·q) and the same profile; it is not solver state.
 * - **Reactions:** the water takes −J over the four nearest wet cells,
 *   Δq = −J/(ρA), conserving momentum. The vertical part cannot enter a
 *   depth-averaged solver; it is only tallied.
 */
export class PhysicalSurfWater implements SurfWater {
  /** Vertical impulse handed over but not representable in the depth-averaged water, N·s. */
  unappliedVerticalImpulse = 0;
  private readonly spacing: number;
  private readonly omega: number;
  private readonly nodes = new Float64Array(16);
  private readonly cells = new Int32Array(4);
  private readonly weights = new Float64Array(4);

  constructor(private readonly solver: ShallowWaterSolver, private readonly options: PhysicalSurfWaterOptions) {
    this.spacing = options.nodeSpacing ?? 1;
    this.omega = (2 * Math.PI) / options.peakPeriod;
  }

  static forSimulation(simulation: SurfZoneSimulation): PhysicalSurfWater {
    return new PhysicalSurfWater(simulation.solver, { peakPeriod: simulation.config.peakPeriod, breaking: simulation.breaking.strength });
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const { solver } = this;
    if (this.outside(x, z)) return this.flatSea(out);
    const { h, bed, qx, qz } = solver;
    this.cellWeights(x, z);
    const depth = this.blend(h);
    const bottom = this.blend(bed);
    out.outsideDomain = false;
    out.waterDepth = depth;
    out.stillDepth = Math.max(0, solver.restLevel - bottom);
    out.wet = depth > WET;
    this.surface(x, z, out);
    out.breaking = this.options.breaking ? this.blend(this.options.breaking) : 0;
    if (!out.wet) {
      out.flowX = 0;
      out.flowY = 0;
      out.flowZ = 0;
      out.regime = 'dry';
      return out;
    }
    let u = 0;
    let w = 0;
    for (let c = 0; c < 4; c += 1) {
      const i = this.cells[c];
      if (h[i] <= WET) continue;
      u += (this.weights[c] * qx[i]) / h[i];
      w += (this.weights[c] * qz[i]) / h[i];
    }
    const height = Math.min(depth, Math.max(0, y - bottom));
    const rise = 0 - (this.gradient(qx, x, z, 'x') + this.gradient(qz, x, z, 'z'));
    const kh = waveNumber(this.omega, depth) * depth;
    let horizontal = 1;
    let vertical = height / depth;
    if (out.breaking > BORE) {
      out.regime = 'bore';
    } else if (kh < SHALLOW_KH) {
      out.regime = 'shallow';
    } else {
      out.regime = 'profile';
      const k = kh / depth;
      horizontal = Math.min(MAX_PROFILE, (kh * Math.cosh(k * height)) / Math.sinh(kh));
      vertical = Math.sinh(k * height) / Math.sinh(kh);
    }
    out.flowX = u * horizontal;
    out.flowZ = w * horizontal;
    out.flowY = rise * vertical;
    return out;
  }

  surfaceAt(x: number, z: number): number {
    if (this.outside(x, z)) return this.solver.restLevel;
    const { nodes } = this;
    const { gx, gz } = this.gatherNodes(x, z);
    const wx = catmullRomWeights(gx - Math.floor(gx));
    const wz = catmullRomWeights(gz - Math.floor(gz));
    let value = 0;
    for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) value += wz[j] * wx[i] * nodes[j * 4 + i];
    return value;
  }

  addReaction(x: number, z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    const { solver } = this;
    this.unappliedVerticalImpulse += impulseY;
    if (this.outside(x, z)) return;
    this.cellWeights(x, z);
    let wet = 0;
    for (let c = 0; c < 4; c += 1) if (solver.h[this.cells[c]] > WET) wet += this.weights[c];
    if (!(wet > 0)) return;
    for (let c = 0; c < 4; c += 1) {
      const i = this.cells[c];
      if (solver.h[i] <= WET || this.weights[c] === 0) continue;
      const mass = SEAWATER_DENSITY * solver.dx * solver.dz[Math.floor(i / solver.nx)];
      const share = this.weights[c] / wet;
      solver.qx[i] -= (impulseX * share) / mass;
      solver.qz[i] -= (impulseZ * share) / mass;
    }
  }

  /** Height at a render node (the renderer's `writeUniformSurface` convention: dry nodes 5 cm under the bed). */
  private nodeHeight(x: number, z: number): number {
    const { solver } = this;
    const depth = solver.sampleCentered(solver.h, x, z);
    const bottom = solver.sampleCentered(solver.bed, x, z);
    return depth > WET ? depth + bottom : bottom - 0.05;
  }

  /** Fill the 4 × 4 node stencil around (x, z); returns the node-space coordinates. */
  private gatherNodes(x: number, z: number): { gx: number; gz: number } {
    const { solver, spacing } = this;
    const xMin = solver.xCenters[0] - solver.dx / 2;
    const zMin = solver.zCenters[0] - solver.dz[0] / 2;
    const zSpan = solver.zCenters[solver.nz - 1] + solver.dz[solver.nz - 1] / 2 - zMin;
    const lastX = Math.round((solver.nx * solver.dx) / spacing);
    const lastZ = Math.round(zSpan / spacing);
    const gx = (x - xMin) / spacing;
    const gz = (z - zMin) / spacing;
    const i0 = Math.floor(gx);
    const j0 = Math.floor(gz);
    for (let j = 0; j < 4; j += 1) {
      const nz = Math.min(lastZ, Math.max(0, j0 + j - 1));
      for (let i = 0; i < 4; i += 1) {
        const nx = Math.min(lastX, Math.max(0, i0 + i - 1));
        this.nodes[j * 4 + i] = this.nodeHeight(xMin + nx * spacing, zMin + nz * spacing);
      }
    }
    return { gx, gz };
  }

  private surface(x: number, z: number, out: WaterSample): void {
    const { nodes, spacing } = this;
    const { gx, gz } = this.gatherNodes(x, z);
    const tx = gx - Math.floor(gx);
    const tz = gz - Math.floor(gz);
    const wx = catmullRomWeights(tx);
    const wz = catmullRomWeights(tz);
    const dx = catmullRomSlopes(tx);
    const dz = catmullRomSlopes(tz);
    let value = 0;
    let slopeX = 0;
    let slopeZ = 0;
    for (let j = 0; j < 4; j += 1) {
      for (let i = 0; i < 4; i += 1) {
        const node = nodes[j * 4 + i];
        value += wz[j] * wx[i] * node;
        slopeX += wz[j] * dx[i] * node;
        slopeZ += dz[j] * wx[i] * node;
      }
    }
    slopeX /= spacing;
    slopeZ /= spacing;
    const length = Math.hypot(slopeX, 1, slopeZ);
    out.surfaceY = value;
    out.slopeX = slopeX;
    out.slopeZ = slopeZ;
    out.normalX = -slopeX / length;
    out.normalY = 1 / length;
    out.normalZ = -slopeZ / length;
  }

  /** The four cells and bilinear weights `sampleCentered` would use at (x, z). */
  private cellWeights(x: number, z: number): void {
    const { solver } = this;
    const gx = Math.min(solver.nx - 1, Math.max(0, (x - solver.xCenters[0]) / solver.dx));
    const ix = Math.min(solver.nx - 2, Math.floor(gx));
    const tx = gx - ix;
    const iz = solver.rowBelow(z);
    const tz = Math.min(1, Math.max(0, (z - solver.zCenters[iz]) / (solver.zCenters[iz + 1] - solver.zCenters[iz])));
    const i = iz * solver.nx + ix;
    this.cells[0] = i;
    this.cells[1] = i + 1;
    this.cells[2] = i + solver.nx;
    this.cells[3] = i + solver.nx + 1;
    this.weights[0] = (1 - tx) * (1 - tz);
    this.weights[1] = tx * (1 - tz);
    this.weights[2] = (1 - tx) * tz;
    this.weights[3] = tx * tz;
  }

  private blend(values: ArrayLike<number>): number {
    let total = 0;
    for (let c = 0; c < 4; c += 1) total += this.weights[c] * values[this.cells[c]];
    return total;
  }

  /** Centred difference of a cell field along one axis, over one cell. */
  private gradient(values: Float64Array, x: number, z: number, axis: 'x' | 'z'): number {
    const { solver } = this;
    if (axis === 'x') {
      const step = solver.dx / 2;
      return (solver.sampleCentered(values, x + step, z) - solver.sampleCentered(values, x - step, z)) / (2 * step);
    }
    const step = solver.dz[solver.rowBelow(z)] / 2;
    return (solver.sampleCentered(values, x, z + step) - solver.sampleCentered(values, x, z - step)) / (2 * step);
  }

  private outside(x: number, z: number): boolean {
    const { solver } = this;
    const xMin = solver.xCenters[0] - solver.dx / 2;
    const zMin = solver.zCenters[0] - solver.dz[0] / 2;
    const zMax = solver.zCenters[solver.nz - 1] + solver.dz[solver.nz - 1] / 2;
    return x < xMin || x > xMin + solver.nx * solver.dx || z < zMin || z > zMax;
  }

  private flatSea(out: WaterSample): WaterSample {
    out.surfaceY = this.solver.restLevel;
    out.stillDepth = 0;
    out.waterDepth = 0;
    out.wet = false;
    out.outsideDomain = true;
    out.slopeX = 0;
    out.slopeZ = 0;
    out.normalX = 0;
    out.normalY = 1;
    out.normalZ = 0;
    out.flowX = 0;
    out.flowY = 0;
    out.flowZ = 0;
    out.regime = 'outside';
    out.breaking = 0;
    return out;
  }
}
