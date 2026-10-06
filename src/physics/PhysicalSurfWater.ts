import type { BedMaterial } from '../wave/Bathymetry';
import { createContactHit, tubeState, type SweptSurfaceQueries } from '../wave/barrel/sweptContact';
import { waveNumber } from '../wave/dispersion';
import type { ShallowWaterSolver } from '../wave/ShallowWaterSolver';
import type { LensPoint, RollerLens } from '../wave/SpillingRoller';
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
/**
 * The surface roller (Svendsen 1984; the gameplay spec's P11, only its push brought
 * forward): in a bore the aerated roller on the front moves at about the bore's
 * speed, √(g d). Within ROLLER_SHARE of the set-up under the surface the flow is
 * carried toward breaking × √(g d) along the current, fading linearly to the
 * depth-averaged current at the roller's bottom; slower than MIN_ROLLER_FLOW, m/s,
 * the current gives no direction. The roller rides the front toward the shore
 * (+z): a current running more than 60° off it (ROLLER_SHOREWARD, a rip or the
 * backwash, or along the shore) carries none. Provisional.
 */
const ROLLER_SHARE = 0.5;
/** At the bed, the turbulence is this share of the surface's (provisional). */
const NEAR_BED = 0.3;
const MIN_ROLLER_FLOW = 0.05;
const ROLLER_SHOREWARD = 0.5;
const GRAVITY = 9.81;
/**
 * A swept contact normal's least upward part, for its slope (the advisor, 2026-09-30, provisional): buoyancy is
 * support × (−s_x, 1, −s_z), so it grows as 1/n_y; past 60° the slope is held at tan 60° = 1.73 along the face's own
 * direction, at most twice the support. The normal itself is kept as it is, for anything that plans off the face.
 */
const MIN_NORMAL_Y = 0.5;
/** The steepest slope the clamp allows: tan of its tilt. */
const STEEPEST = Math.sqrt(1 - MIN_NORMAL_Y * MIN_NORMAL_Y) / MIN_NORMAL_Y;
/**
 * A roller lens's air at its top, C = 0.9: its drawn and hit top is the C = 0.9 level, Chanson's Y₉₀ (Shi et al. 2023b's
 * near-toe profile; R3 §2.1, docs/research/water-physics/notes/round3-whitewater-build/roller-build.md).
 */
const LENS_TOP_VOID = 0.9;
/** A roller lens's shear layer: its water reaches the lens's own flow by this share of its height (Misra et al. 2008; R3 §3.2). */
const LENS_SHEAR = 0.3;

/**
 * A roller lens's void fraction at height ζ within it (0 at its underside, 1 at its top): 0.9·ζ^N with N = 0.9/ᾱ − 1,
 * whose mean over the lens is ᾱ (Shi et al. 2023b; R3 §2.1). Above 0.638 of the lens (ᾱ 0.25) a prone rider on a 30 L
 * board cannot float (α > 0.28): the board bogs. Felt only on the rider's own machine, so `Math.pow` is fine here.
 */
export function lensVoidFraction(zeta: number, voidMean: number): number {
  if (!(zeta > 0)) return 0;
  return LENS_TOP_VOID * Math.pow(Math.min(1, zeta), LENS_TOP_VOID / voidMean - 1);
}

/** The share of a roller lens's own flow at height ζ within it: smoothstep(0, 0.3, ζ), the shear layer below (R3 §3.2). */
export function lensFlowShare(zeta: number): number {
  const s = Math.min(1, Math.max(0, zeta / LENS_SHEAR));
  return s * s * (3 - 2 * s);
}

/**
 * The water at height `y` in a column a roller lens covers (the Canyon roller lens, S3; R3 §3.2–3.3), on a sample
 * whose surface is the lens's top: the underside lies `lens.thickness` below it. The column is broken water, its flow
 * the depth-averaged current (u, w); inside the lens it is carried toward the lens's own, ū + S(ζ)·g·(c·n̂ − ū), and its
 * air is the more of the lens's and the plume's (they describe the same air; the lens's is better resolved). The
 * vertical flow is left as it is.
 */
export function applyLens(out: WaterSample, y: number, lens: LensPoint, voidMean: number, u: number, w: number): void {
  out.regime = 'bore';
  out.flowX = u;
  out.flowZ = w;
  const underside = out.surfaceY - lens.thickness;
  if (!(lens.thickness > 0) || y < underside) return;
  const zeta = (y - underside) / lens.thickness;
  out.voidFraction = Math.max(out.voidFraction ?? 0, lensVoidFraction(zeta, voidMean));
  const share = lensFlowShare(zeta) * lens.g;
  out.flowX = u + share * (lens.flowX - u);
  out.flowZ = w + share * (lens.flowZ - w);
}

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
  /** Render node spacing, m: body contact interpolates the same nodes as the renderer. */
  nodeSpacing?: number;
  /** What the bed is made of at (x, z), from the spot (the Teahupo'o Reef, Part C); sand when absent. */
  materialAt?: (x: number, z: number) => BedMaterial;
  /**
   * The whitewater plume (G9's `AerationField`): each cell's void fraction and the
   * plume's depth under the surface. Bodies sample its air (the wipeout spec, Part B).
   */
  aeration?: { voidFraction(cell: number): number; readonly depth: ArrayLike<number>; readonly turbulence?: ArrayLike<number> };
  /** Lowers the surface where a flying lip's void leaves it (the plunging lip's `carve`). */
  carve?: (x: number, z: number, surface: number) => number;
  /**
   * The swept barrel's contact (the Padang Padang spec, Part B, PR 4): where its loft is, it answers the surface, the
   * curl's layers and the lip's flow, in place of a carve.
   */
  swept?: SweptSurfaceQueries;
  /**
   * A spilling spot's roller lenses (the Canyon roller lens, S3): their tops join the render nodes, and in their
   * columns the water is broken, carried by the lens and aerated by it. With a roller the P11 roller push is off.
   */
  roller?: RollerLens;
}

/** Only numeric state read by the existing plain-height sampler; no complete solver facade. */
type PlainHeightState = Pick<ShallowWaterSolver,
  'nx' | 'nz' | 'dx' | 'restLevel' | 'h' | 'bed' | 'xCenters' | 'zCenters' | 'dz' | 'sampleCentered' | 'rowBelow'>;

/** The private contact owns these two functions, not mutable height arrays or a partial loft. */
export interface OwnedPlainSurface {
  capture(): void;
  heightAt(x: number, z: number): number;
}

/** One literal stencil/cache implementation shared by live and privately owned plain-height state. */
class PlainHeightSurface {
  protected readonly nodes = new Float64Array(16);
  private surfaceCacheActive = false;
  private surfaceCacheEpoch = 0;
  private surfaceCacheHeights = new Float64Array(0);
  private surfaceCacheStamps = new Uint32Array(0);
  private surfaceCacheXMin = Number.NaN;
  private surfaceCacheZMin = Number.NaN;
  private surfaceCacheLastX = -1;
  private surfaceCacheLastZ = -1;

  constructor(private readonly heightState: PlainHeightState, protected readonly spacing: number,
    private readonly heightOptions: Pick<PhysicalSurfWaterOptions, 'carve' | 'roller'> = {}, owned = false) {
    this.surfaceCacheActive = owned;
  }

  /**
   * Reuse exact render-node heights during a synchronous read-only build. The water, bed and carve must stay fixed;
   * a caller that changes them inside the scope must call `invalidateSurfaceNodeCache`. Every scope starts and ends
   * with invalidation, so ordinary samples and later builds never reuse untracked mutable water.
   */
  withSurfaceNodeCache<T>(read: () => T): T {
    const active = this.surfaceCacheActive;
    this.invalidateSurfaceNodeCache();
    this.surfaceCacheActive = true;
    try {
      return read();
    } finally {
      this.surfaceCacheActive = active;
      this.invalidateSurfaceNodeCache();
    }
  }

  /** Explicitly discard node heights after a water, bed or grid change within a scoped build. */
  invalidateSurfaceNodeCache(): void {
    this.surfaceCacheEpoch = (this.surfaceCacheEpoch + 1) >>> 0;
    if (this.surfaceCacheEpoch === 0) {
      this.surfaceCacheStamps.fill(0);
      this.surfaceCacheEpoch = 1;
    }
  }

  /** The render nodes' surface, never the swept contact's: what the contact lofts over. */
  plainSurfaceAt(x: number, z: number): number {
    if (this.outside(x, z)) return this.heightState.restLevel;
    const { nodes } = this;
    const { gx, gz } = this.gatherNodes(x, z);
    const wx = catmullRomWeights(gx - Math.floor(gx));
    const wz = catmullRomWeights(gz - Math.floor(gz));
    let value = 0;
    for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) value += wz[j] * wx[i] * nodes[j * 4 + i];
    return value;
  }

  /**
   * Height at a render node (the renderer's `writeUniformSurface` convention: dry nodes 5 cm under the bed), with any
   * roller lens's top on wet ones, as the snapshot's nodes have it (S3: what is drawn is what is hit).
   */
  private nodeHeight(x: number, z: number): number {
    const { heightState: solver } = this;
    const { roller } = this.heightOptions;
    const depth = solver.sampleCentered(solver.h, x, z);
    const bottom = solver.sampleCentered(solver.bed, x, z);
    const height = depth > WET ? (roller ? depth + bottom + roller.riseAt(x, z) : depth + bottom) : bottom - 0.05;
    return this.heightOptions.carve ? this.heightOptions.carve(x, z, height) : height;
  }

  /** Fill the 4 × 4 node stencil around (x, z); returns the node-space coordinates. */
  protected gatherNodes(x: number, z: number): { gx: number; gz: number } {
    const { heightState: solver, spacing } = this;
    const xMin = solver.xCenters[0] - solver.dx / 2;
    const zMin = solver.zCenters[0] - solver.dz[0] / 2;
    const zSpan = solver.zCenters[solver.nz - 1] + solver.dz[solver.nz - 1] / 2 - zMin;
    const lastX = Math.round((solver.nx * solver.dx) / spacing);
    const lastZ = Math.round(zSpan / spacing);
    const gx = (x - xMin) / spacing;
    const gz = (z - zMin) / spacing;
    const i0 = Math.floor(gx);
    const j0 = Math.floor(gz);
    if (this.surfaceCacheActive) {
      // A moved window or different grid cannot reuse the old integer node addresses, even within a scope.
      if (this.surfaceCacheXMin !== xMin || this.surfaceCacheZMin !== zMin
        || this.surfaceCacheLastX !== lastX || this.surfaceCacheLastZ !== lastZ) {
        this.invalidateSurfaceNodeCache();
        this.surfaceCacheXMin = xMin;
        this.surfaceCacheZMin = zMin;
        this.surfaceCacheLastX = lastX;
        this.surfaceCacheLastZ = lastZ;
      }
      const size = (lastX + 1) * (lastZ + 1);
      if (this.surfaceCacheHeights.length < size) {
        this.surfaceCacheHeights = new Float64Array(size);
        this.surfaceCacheStamps = new Uint32Array(size);
      }
    }
    for (let j = 0; j < 4; j += 1) {
      const nz = Math.min(lastZ, Math.max(0, j0 + j - 1));
      for (let i = 0; i < 4; i += 1) {
        const nx = Math.min(lastX, Math.max(0, i0 + i - 1));
        if (this.surfaceCacheActive) {
          const at = nz * (lastX + 1) + nx;
          if (this.surfaceCacheStamps[at] !== this.surfaceCacheEpoch) {
            this.surfaceCacheHeights[at] = this.nodeHeight(xMin + nx * spacing, zMin + nz * spacing);
            this.surfaceCacheStamps[at] = this.surfaceCacheEpoch;
          }
          this.nodes[j * 4 + i] = this.surfaceCacheHeights[at];
        } else {
          this.nodes[j * 4 + i] = this.nodeHeight(xMin + nx * spacing, zMin + nz * spacing);
        }
      }
    }
    return { gx, gz };
  }

  protected outside(x: number, z: number): boolean {
    const { heightState: solver } = this;
    const xMin = solver.xCenters[0] - solver.dx / 2;
    const zMin = solver.zCenters[0] - solver.dz[0] / 2;
    const zMax = solver.zCenters[solver.nz - 1] + solver.dz[solver.nz - 1] / 2;
    return x < xMin || x > xMin + solver.nx * solver.dx || z < zMin || z > zMax;
  }

}

/**
 * Fixed ordinary grid, owned fields. The actual bilinear and binary-search methods run with this numeric receiver;
 * neither is bound to the live solver. Public/custom physical water never selects this private contact factory.
 */
class OwnedHeightState implements PlainHeightState {
  readonly nx: number;
  readonly nz: number;
  readonly dx: number;
  restLevel: number;
  readonly h: Float64Array;
  readonly bed: Float64Array;
  readonly xCenters: Float64Array;
  readonly zCenters: Float64Array;
  readonly dz: Float64Array;
  readonly sampleCentered: PlainHeightState['sampleCentered'];
  readonly rowBelow: PlainHeightState['rowBelow'];

  constructor(source: PlainHeightState) {
    this.nx = source.nx; this.nz = source.nz; this.dx = source.dx; this.restLevel = source.restLevel;
    this.h = new Float64Array(source.h.length); this.bed = new Float64Array(source.bed.length);
    this.xCenters = new Float64Array(source.xCenters.length);
    this.zCenters = source.zCenters.slice(); this.dz = source.dz.slice();
    this.sampleCentered = source.sampleCentered; this.rowBelow = source.rowBelow;
  }

  capture(source: PlainHeightState): void {
    this.h.set(source.h); this.bed.set(source.bed); this.xCenters.set(source.xCenters);
    this.restLevel = source.restLevel;
  }
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
export class PhysicalSurfWater extends PlainHeightSurface implements SurfWater {
  /** Vertical impulse handed over but not representable in the depth-averaged water, N·s. */
  unappliedVerticalImpulse = 0;
  /** This water's own horizontal reactions since the last `drainReaction`: weight Σ|J|, Σ|J|·x, Σ|J|·z, ΣJx, ΣJz. */
  private readonly tally = { weight: 0, x: 0, z: 0, jx: 0, jz: 0 };
  private readonly omega: number;
  private readonly cells = new Int32Array(4);
  private readonly weights = new Float64Array(4);
  private readonly hit = createContactHit();
  private readonly lens: LensPoint = { thickness: 0, rise: 0, g: 0, flowX: 0, flowZ: 0 };

  constructor(private readonly solver: ShallowWaterSolver, private readonly options: PhysicalSurfWaterOptions) {
    super(solver, options.nodeSpacing ?? 1, options);
    this.omega = (2 * Math.PI) / options.peakPeriod;
  }

  /**
   * The simulation's water; with the swept barrel's contact, that in place of the lip's carve (Part B, PR 4). At a
   * spilling spot, its roller lenses (S3), and the breaking the rider feels behind the visible front (the advisor's Q1).
   */
  static forSimulation(simulation: SurfZoneSimulation, swept?: SweptSurfaceQueries, nodeSpacing = 1): PhysicalSurfWater {
    const { lip, roller } = simulation;
    return new PhysicalSurfWater(simulation.solver, {
      peakPeriod: simulation.config.peakPeriod, breaking: simulation.feltBreaking, nodeSpacing,
      ...(swept ? { swept } : { carve: (x: number, z: number, surface: number) => lip.carve(x, z, surface) }),
      aeration: simulation.aeration, materialAt: simulation.spot.materialAt ? (x, z) => simulation.spot.materialAt!(x, z) : undefined,
      ...(roller ? { roller } : {}),
    });
  }

  /** Internal ordinary swept owner only: copy fresh fields before building, retain them through later demand. */
  createOwnedPlainSurface(): OwnedPlainSurface {
    const state = new OwnedHeightState(this.solver);
    const surface = new PlainHeightSurface(state, this.spacing, {}, true);
    return Object.freeze({
      capture: () => { state.capture(this.solver); surface.invalidateSurfaceNodeCache(); },
      // The cache stays active for this owned generation. It never reads live flow, carve or height fields.
      heightAt: surface.plainSurfaceAt.bind(surface),
    });
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const { solver } = this;
    const { swept } = this.options;
    if (swept) this.clearLayers(out);
    if (this.outside(x, z)) return this.flatSea(out);
    const { h, bed, qx, qz } = solver;
    this.cellWeights(x, z);
    const depth = this.blend(h);
    const bottom = this.blend(bed);
    out.outsideDomain = false;
    out.waterDepth = depth;
    out.bedY = bottom;
    // The bed's normal from its gradient across half a cell each way (the solver's own bed, levelled at open edges).
    const half = 0.5 * solver.dx;
    const gx = (solver.sampleCentered(bed, x + half, z) - solver.sampleCentered(bed, x - half, z)) / (2 * half);
    const gz = (solver.sampleCentered(bed, x, z + half) - solver.sampleCentered(bed, x, z - half)) / (2 * half);
    const norm = Math.hypot(gx, 1, gz);
    out.bedNormalX = -gx / norm;
    out.bedNormalY = 1 / norm;
    out.bedNormalZ = -gz / norm;
    out.bedMaterial = this.options.materialAt ? this.options.materialAt(x, z) : 'sand';
    out.stillDepth = Math.max(0, solver.restLevel - bottom);
    out.wet = depth > WET;
    this.surface(x, z, out);
    const contact = swept !== undefined && swept.query(x, y, z, this.hit);
    if (contact) this.fromContact(y, out);
    out.voidFraction = this.airAt(y, out.surfaceY);
    out.turbulence = this.turbulenceAt(y, out.surfaceY, this.blend(bed));
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
    const { roller } = this.options;
    if (out.breaking > BORE) {
      out.regime = 'bore';
      const current = Math.hypot(u, w);
      const thickness = ROLLER_SHARE * Math.max(0, out.surfaceY - solver.restLevel);
      // With a roller (S3), its lenses carry the broken water in place of the P11 push.
      if (!roller && current > MIN_ROLLER_FLOW && thickness > 0 && w > ROLLER_SHOREWARD * current) {
        const share = Math.max(0, 1 - Math.max(0, out.surfaceY - y) / thickness);
        const carried = out.breaking * Math.sqrt(GRAVITY * depth);
        horizontal = 1 + Math.max(0, carried / current - 1) * share;
      }
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
    if (roller && roller.lensAt(x, z, this.lens)) applyLens(out, y, this.lens, roller.options.voidMean, u, w);
    if (contact && out.waterFloorY !== undefined) this.lipFlow(out);
    return out;
  }

  surfaceAt(x: number, z: number): number {
    const { swept } = this.options;
    if (swept && !this.outside(x, z)) {
      const floor = swept.floorAt(x, z);
      if (floor === floor) return floor;
    }
    return this.plainSurfaceAt(x, z);
  }

  addReaction(x: number, z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.unappliedVerticalImpulse += impulseY;
    const weight = Math.hypot(impulseX, impulseZ);
    const { tally } = this;
    tally.weight += weight;
    tally.x += x * weight;
    tally.z += z * weight;
    tally.jx += impulseX;
    tally.jz += impulseZ;
    this.push(x, z, impulseX, impulseZ);
  }

  /** Another player's board pushing on this water (spec N1): applied like a reaction, but not tallied as this player's own. */
  applyRemoteReaction(x: number, z: number, impulseX: number, impulseZ: number): void {
    this.push(x, z, impulseX, impulseZ);
  }

  /**
   * This water's own reactions since the last drain, for the network (spec N1):
   * `out` gets the impulse-weighted mean point (x, z) and the summed horizontal
   * impulse (jx, jz), or zeros; the tally starts again.
   */
  drainReaction(out: Float64Array): void {
    const { tally } = this;
    const weight = tally.weight;
    out[0] = weight > 0 ? tally.x / weight : 0;
    out[1] = weight > 0 ? tally.z / weight : 0;
    out[2] = tally.jx;
    out[3] = tally.jz;
    tally.weight = tally.x = tally.z = tally.jx = tally.jz = 0;
  }

  /** −J over the four nearest wet cells: Δq = −J/(ρA). */
  private push(x: number, z: number, impulseX: number, impulseZ: number): void {
    const { solver } = this;
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

  /** A reused sample leaves the swept layers of its last point behind: clear them. */
  private clearLayers(out: WaterSample): void {
    out.waterFloorY = undefined;
    out.ceilingY = undefined;
    out.ceilingTopY = undefined;
    out.covered = undefined;
    out.clearance = undefined;
    out.tube = undefined;
  }

  /** The swept surface in place of the render nodes' (the Padang Padang spec, Part B, PR 4). */
  private fromContact(y: number, out: WaterSample): void {
    const { hit } = this;
    out.surfaceY = hit.surfaceY;
    if (hit.normalY >= MIN_NORMAL_Y) {
      out.slopeX = -hit.normalX / hit.normalY;
      out.slopeZ = -hit.normalZ / hit.normalY;
    } else {
      // Steeper than the clamp, or overhanging: its steepest slope, along the face's own horizontal direction.
      const across = Math.sqrt(hit.normalX * hit.normalX + hit.normalZ * hit.normalZ);
      out.slopeX = across > 0 ? (-hit.normalX / across) * STEEPEST : 0;
      out.slopeZ = across > 0 ? (-hit.normalZ / across) * STEEPEST : 0;
    }
    out.normalX = hit.normalX;
    out.normalY = hit.normalY;
    out.normalZ = hit.normalZ;
    if (hit.waterFloorY === hit.waterFloorY) out.waterFloorY = hit.waterFloorY;
    if (hit.ceilingY === hit.ceilingY) {
      out.ceilingY = hit.ceilingY;
      out.ceilingTopY = hit.ceilingTopY;
      out.clearance = hit.ceilingY - y;
    }
    out.tube = tubeState(hit.life);
    out.covered = !hit.inWater && hit.ceilingY === hit.ceilingY && !(hit.life >= 1);
  }

  /**
   * The curl's water moves with its lip (the advisor's ruling 1): across the crest and up, the solver's flow ramps to
   * the tip's velocity by where the curl's top is (crest landmark 0, tip 1), and by the slices' weight, as their shape
   * does (at a front's ends and through the collapse; the advisor, 2026-09-30); along the crest the solver's is kept.
   */
  private lipFlow(out: WaterSample): void {
    const { tangentX: tx, tangentZ: tz, lipVX, lipVY, lipVZ } = this.hit;
    const r = this.hit.lipShare * this.hit.lipWeight;
    const along = out.flowX * tx + out.flowZ * tz;
    const lipAlong = lipVX * tx + lipVZ * tz;
    out.flowX = along * tx + (1 - r) * (out.flowX - along * tx) + r * (lipVX - lipAlong * tx);
    out.flowZ = along * tz + (1 - r) * (out.flowZ - along * tz) + r * (lipVZ - lipAlong * tz);
    out.flowY = (1 - r) * out.flowY + r * lipVY;
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

  /**
   * The plume's void fraction at height `y` under a surface at `surfaceY`: each of
   * the four cells' own where the point lies within its plume's depth, blended by
   * the cells' weights (from the latest `cellWeights`).
   */
  private airAt(y: number, surfaceY: number): number {
    const plume = this.options.aeration;
    if (!plume) return 0;
    const below = surfaceY - y;
    let air = 0;
    for (let c = 0; c < 4; c += 1) {
      const i = this.cells[c];
      if (this.weights[c] === 0 || below > plume.depth[i]) continue;
      air += this.weights[c] * plume.voidFraction(i);
    }
    return air;
  }

  /**
   * The turbulence at height `y`: the cells' blended energy, strongest at the
   * surface and falling to NEAR_BED of it at the bed (Ting & Kirby: the energy
   * the roller injects decays with depth, though under bores eddies reach the bed).
   */
  private turbulenceAt(y: number, surfaceY: number, bedY: number): number {
    const field = this.options.aeration?.turbulence;
    if (!field) return 0;
    let k = 0;
    for (let c = 0; c < 4; c += 1) if (this.weights[c] > 0) k += this.weights[c] * field[this.cells[c]];
    if (!(k > 0)) return 0;
    const column = surfaceY - bedY;
    const height = column > 0 ? Math.min(1, Math.max(0, (y - bedY) / column)) : 1;
    return k * (NEAR_BED + (1 - NEAR_BED) * height);
  }

  private flatSea(out: WaterSample): WaterSample {
    out.voidFraction = 0;
    out.turbulence = 0;
    out.surfaceY = this.solver.restLevel;
    out.stillDepth = 0;
    out.waterDepth = 0;
    out.bedY = -Infinity;
    out.bedNormalX = 0;
    out.bedNormalY = 1;
    out.bedNormalZ = 0;
    out.bedMaterial = 'sand';
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
