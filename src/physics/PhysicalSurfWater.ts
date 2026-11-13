import type { BedMaterial } from '../wave/Bathymetry';
import { createContactHit, NEAREST, tubeState, type ContactHit, type SweptSurfaceQueries } from '../wave/barrel/sweptContact';
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
export function applyLens(out: WaterSample, y: number, lens: LensPoint, voidMean: number, u: number, w: number, thickness = true): void {
  out.regime = 'bore';
  out.flowX = u;
  out.flowZ = w;
  out.lensFlowX = u + lens.g * (lens.flowX - u);
  out.lensFlowZ = w + lens.g * (lens.flowZ - w);
  out.lensScale = lens.g;
  if (thickness) {
    out.lensThickness = lens.thickness;
    out.lensReach = lens.xi;
    out.lensSpeedX = lens.flowX;
    out.lensSpeedZ = lens.flowZ;
    const slope = Math.hypot(out.slopeX, out.slopeZ);
    out.lensGrip = SEAWATER_DENSITY * (1 - voidMean) * GRAVITY * lens.thickness * (slope / Math.hypot(1, slope));
  }
  const underside = out.surfaceY - lens.thickness;
  if (!(lens.thickness > 0) || y < underside) return;
  const zeta = (y - underside) / lens.thickness;
  out.voidFraction = Math.max(out.voidFraction ?? 0, lensVoidFraction(zeta, voidMean));
  const share = lensFlowShare(zeta) * lens.g;
  out.flowX = u + share * (lens.flowX - u);
  out.flowZ = w + share * (lens.flowZ - w);
  out.lensShare = share;
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
   * With `swept`: the step 3 ruling's support (`TubeFace.union`; the pool's straight Barrel): never under the solver's
   * surface. The water is the union of the solver's and the swept surface's: a point under the solver's surface is in
   * water, and over it the swept surface answers as before, its floor raised to the solver's where it lies under it.
   */
  sweptUnion?: boolean;
  /**
   * With `sweptUnion`: step 7's wall water (`TubeFace.wallFlow`; the advisor's 2026-11-04 ruling §1.4.3). In the swept
   * surface's water above the solver's surface with no air under it (the case's wall), the flow is a wave face's: its
   * component normal to the swept surface is that surface's own normal speed (the kinematic condition), and along the ray
   * it ramps from the solver's at the anchor's height to B·C at the crest (B 0.85 before the throw, 1 from it: Derakhti et
   * al. 2020; the ramp itself inferred), by the slices' weight; along the crest the solver's is kept. Without it, the
   * solver's flow there, as before.
   */
  sweptWall?: boolean;
  /**
   * With `sweptUnion`: the step 7 follow-up's nearest surface (`TubeFace.contact`; the advisor's 2026-11-05 ruling §1). In
   * the case's wall (its water with no air under it, over the solver's surface or under it where the case's surface stands
   * over it), a body takes the surface nearest it along its own normal (`SweptContact`'s crossing above or the face just
   * ahead, blended): its immersion is the depth along that normal (the surface reported that far above the point), its
   * normal and its surface's speed that surface's; the face ahead counts only where the solver's water does not stand over
   * the point's height there (faded over `NEAREST.blend`). The wall's water (`sweptWall`) applies under the solver's surface
   * too where the case's surface stands over it, and its kinematic normal part fades to the solver's flow from 0.3 to 0.6 m
   * deep (`WALL_WATER.fade`). Without it, the vertical line through the point answers, as before.
   */
  sweptNearest?: boolean;
  /**
   * With `sweptWall`: ruling 3's smooth wall (`TubeFace.track`; the advisor's advisor-ruling-3.md §1). The wall water blends
   * into the solver's flow across the solver's surface: its share is the smoothstep of the wall's height over the solver's
   * surface in that column (the case's surface over the solver's) over `WALL_WATER.blend`, so a body crossing between the
   * two waters (where the case's surface meets the solver's, about the anchor's height) sees one continuous flow. Without
   * it, the wall water at full weight wherever the case's surface stands over the solver's, as before.
   */
  sweptBlend?: boolean;
  /**
   * With `sweptWall`: ruling 3's added-mass inertia (`TubeFace.inertia`; §2). Samples in the case's wall water are marked
   * (`WaterSample.wallWater`), and a hull there takes the water's own acceleration on its added mass (`BoardBody`). Without
   * it, no sample is marked, as before.
   */
  sweptInertia?: boolean;
  /**
   * With `sweptInertia`: step 2 of the surfer track (`TubeFace.follow`, docs/research/board-in-water/b-wall). Wall water
   * samples are also marked `WaterSample.wallFollow`: the hull takes the water's own acceleration, not the change along
   * its path. Without it, as before.
   */
  sweptFollow?: boolean;
  /**
   * With `sweptWall`: ruling 3's rank 5 (`TubeFace.buoy`; §1). In the wall water, where the surface's normal is steeper than
   * the slope clamp (`MIN_NORMAL_Y`) or overhangs, the buoyancy acts along that normal at the clamp's size,
   * ρgV/`MIN_NORMAL_Y` (`WaterSample.buoyancyNormal`), not along the clamped slope's fixed 60° up the face. Without it, the
   * clamped slope, as before.
   */
  sweptBuoy?: boolean;
  /**
   * With `sweptWall`: ruling 5's seam blend (`TubeFace.seam`; the advisor's advisor-ruling-5.md §4). The wall water's
   * flow is weighed by the case's share α at the surface over the point (`ContactHit.seam`), the same weight its loft's
   * height took, and where that share is 0 with no air under the case (its surface is the solver's) the solver's water
   * answers whole: the answering source no longer switches on which of two equal surfaces reads a hair higher.
   */
  sweptSeam?: boolean;
  /**
   * With `sweptSeam`: ruling 6's streamline wall water (`TubeFace.stream`; the advisor's advisor-ruling-6.md §4,
   * docs/research/wall-body-2026-11-11). The wall water's target is `streamWallFlow`'s (the surface a streamline in the
   * wave's frame, its speed from the height under the crest) in place of the case surface's own differenced speed.
   */
  sweptStream?: boolean;
  /**
   * With `sweptSeam`: ruling 21's dug foot (`TubeFace.dug`, `?wallFoot=dug`;
   * docs/research/pool-look-reference-2026-11-11/ruling-21.md). Where the swept floor is the case's own front and lies
   * under the solver's surface (`ContactHit.dug` over 0), a body's water surface is the swept one: its immersion, its
   * normal and the wall water's share are read from it, and there is no solver water over it (one water, as drawn).
   */
  sweptDug?: boolean;
  /**
   * A spilling spot's roller lenses (the Canyon roller lens, S3): their tops join the render nodes, and in their
   * columns the water is broken, carried by the lens and aerated by it. With a roller the P11 roller push is off.
   */
  roller?: RollerLens;
  /**
   * C2 step 3's library zone (`?wave=library`, `ZoneSurface`): its heights over the sea's at the render nodes, the very
   * nodes the snapshot draws (drawn = felt). Within it the sea's rise through the bodies' step is weighed out (the
   * library's surface is held through the step, as the swept contact's is). Absent: the sea's nodes, as before.
   */
  zone?: ZoneNodes;
  /**
   * 'old': the surface held still through the bodies' step, as before popup-moving-face (2026-10-29; the
   * `?surfaceMotion=old` dev switch, for A/Bs). By default it moves at its rise rate to each substep's time
   * (`setSampleTime`).
   */
  surfaceMotion?: 'old';
  /**
   * 'old': the plain surface's heights read as before pool-barrel-perf (2026-11-06; the `?plainHeight=old` dev switch): each
   * sample gathers its 16 nodes again and weighs them through `catmullRomWeights`' arrays. By default a sample inside a
   * cache scope whose stencil is the last one's keeps its nodes, and the weights are computed inline: the same bits.
   */
  plainHeight?: 'old';
  /**
   * 'old': the samples carry no lens thickness, reach, own speed or grip, so the board's froth drag acts on its whole
   * wetted hull anywhere in a lens's footprint, past the g-blended flow and uncapped, as before bottom-stop (2026-10-29;
   * the `?froth=old` dev switch, for A/Bs).
   */
  froth?: 'old';
}

/** The library zone's nodes as the plain surface reads them (`ZoneSurface`). */
export interface ZoneNodes {
  at(node: number, sea: number): number;
  nodeAt(x: number, z: number): number;
  weightAt(x: number, z: number): number;
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
  /**
   * The stencil `nodes` holds (pool-barrel-perf, 2026-11-06): its first node's indices and the cache epoch it was read in
   * (−1: none). Inside a cache scope a sample whose stencil starts at the same node, in the same epoch, reads the same 16
   * cached heights, so `gatherNodes` keeps them; outside one, or with `plainHeight` 'old', it reads them again, as before.
   */
  private stencilI0 = 0;
  private stencilJ0 = 0;
  private stencilEpoch = -1;
  private readonly fastHeights: boolean;
  /** `gatherNodes`' node-space coordinates, one reused object (its callers read them at once). */
  private readonly gathered = { gx: 0, gz: 0 };

  constructor(private readonly heightState: PlainHeightState, protected readonly spacing: number,
    private readonly heightOptions: Pick<PhysicalSurfWaterOptions, 'carve' | 'roller' | 'plainHeight' | 'zone'> = {}, owned = false) {
    this.surfaceCacheActive = owned;
    this.fastHeights = heightOptions.plainHeight !== 'old';
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
    this.stencilEpoch = -1;
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
    if (!this.fastHeights) {
      const wx = catmullRomWeights(gx - Math.floor(gx));
      const wz = catmullRomWeights(gz - Math.floor(gz));
      let value = 0;
      for (let j = 0; j < 4; j += 1) for (let i = 0; i < 4; i += 1) value += wz[j] * wx[i] * nodes[j * 4 + i];
      return value;
    }
    // The same weights (`catmullRomWeights`' expressions) and the same sum in the same order, without their arrays.
    const tx = gx - Math.floor(gx);
    const tx2 = tx * tx;
    const tx3 = tx2 * tx;
    const wx0 = (-tx3 + 2 * tx2 - tx) / 2;
    const wx1 = (3 * tx3 - 5 * tx2 + 2) / 2;
    const wx2 = (-3 * tx3 + 4 * tx2 + tx) / 2;
    const wx3 = (tx3 - tx2) / 2;
    const tz = gz - Math.floor(gz);
    const tz2 = tz * tz;
    const tz3 = tz2 * tz;
    let value = 0;
    for (let j = 0; j < 4; j += 1) {
      const wz = j === 0 ? (-tz3 + 2 * tz2 - tz) / 2 : j === 1 ? (3 * tz3 - 5 * tz2 + 2) / 2 : j === 2 ? (-3 * tz3 + 4 * tz2 + tz) / 2 : (tz3 - tz2) / 2;
      const o = j * 4;
      value += wz * wx0 * nodes[o];
      value += wz * wx1 * nodes[o + 1];
      value += wz * wx2 * nodes[o + 2];
      value += wz * wx3 * nodes[o + 3];
    }
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
    const carved = this.heightOptions.carve ? this.heightOptions.carve(x, z, height) : height;
    const { zone } = this.heightOptions;
    if (!zone) return carved;
    const node = zone.nodeAt(x, z);
    return node >= 0 ? zone.at(node, carved) : carved;
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
      // The same 16 cached heights as the last stencil's (the grid unchanged, or the epoch would have moved).
      if (this.fastHeights && this.stencilEpoch === this.surfaceCacheEpoch && i0 === this.stencilI0 && j0 === this.stencilJ0) {
        const gathered = this.gathered;
        gathered.gx = gx;
        gathered.gz = gz;
        return gathered;
      }
    }
    const epoch = this.surfaceCacheEpoch;
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
    if (!this.fastHeights) return { gx, gz };
    // Kept only if all 16 came from the cache within one epoch.
    this.stencilEpoch = this.surfaceCacheActive && epoch === this.surfaceCacheEpoch ? epoch : -1;
    this.stencilI0 = i0;
    this.stencilJ0 = j0;
    const gathered = this.gathered;
    gathered.gx = gx;
    gathered.gz = gz;
    return gathered;
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
  /** Ruling 21 (`sweptDug`): `surfaceAt`'s own hit, so a sample's is left as it stands. */
  private readonly floorHit = createContactHit();
  private readonly lens: LensPoint = { thickness: 0, rise: 0, g: 0, flowX: 0, flowZ: 0, xi: 0 };
  /**
   * When the bodies' samples are taken, s, relative to the water's state (`setSampleTime`; ≤ 0, the step ends at the
   * state). The sea's surface rises at −∇·q (continuity: the depth-integrated mass equation, ∂η/∂t + ∇·q = 0), a face
   * at about c tan θ: 2.2 m/s on a Big Canyon set's 20° face at 6 m/s, so in one 1/60 s step it climbs 3.6 cm. Held
   * still through the step, the board slid down the frozen face, lost its water and fell free, then met the face
   * 3.6 cm higher at the next step: kicked at 60 Hz, which threw a rider pushing up off it (popup-moving-face,
   * 2026-10-29). Each sample's surface is moved back to its time at that rate, the plain surface's (the swept
   * barrel's contact answers its own).
   */
  private sampleTime = 0;
  /** This sample is in the case's wall water (`sweptWall`): set by `unionContact`. */
  private inWall = false;
  /** The solver's surface at this sample (`unionContact`), m: the wall water's blend (`sweptBlend`) reads it. */
  private plainY = Number.NaN;

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
    // C2 step 3's library zone: its nodes, and its overturn's contact (`swept`) answers plainly, without the old tube's rules.
    const zone = simulation.waveZone?.surface;
    if (zone) {
      return new PhysicalSurfWater(simulation.solver, {
        peakPeriod: simulation.config.peakPeriod, breaking: simulation.feltBreaking, nodeSpacing, zone,
        ...(swept ? { swept } : { carve: (x: number, z: number, surface: number) => lip.carve(x, z, surface) }),
        aeration: simulation.aeration, materialAt: simulation.spot.materialAt ? (x, z) => simulation.spot.materialAt!(x, z) : undefined,
        ...(roller ? { roller } : {}),
        ...(simulation.config.surfaceMotion ? { surfaceMotion: simulation.config.surfaceMotion } : {}),
        ...(simulation.config.plainHeight ? { plainHeight: simulation.config.plainHeight } : {}),
        ...(simulation.config.froth ? { froth: simulation.config.froth } : {}),
      });
    }
    return new PhysicalSurfWater(simulation.solver, {
      peakPeriod: simulation.config.peakPeriod, breaking: simulation.feltBreaking, nodeSpacing,
      ...(swept ? { swept } : { carve: (x: number, z: number, surface: number) => lip.carve(x, z, surface) }),
      ...(swept && simulation.tubeFace?.union ? { sweptUnion: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow ? { sweptWall: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.contact ? { sweptNearest: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.track ? { sweptBlend: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.inertia ? { sweptInertia: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.inertia && simulation.tubeFace.follow ? { sweptFollow: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.buoy ? { sweptBuoy: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.seam ? { sweptSeam: true } : {}),
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.seam && simulation.tubeFace.stream ? { sweptStream: true } : {}),
      aeration: simulation.aeration, materialAt: simulation.spot.materialAt ? (x, z) => simulation.spot.materialAt!(x, z) : undefined,
      ...(swept && simulation.tubeFace?.union && simulation.tubeFace.wallFlow && simulation.tubeFace.seam && simulation.tubeFace.dug ? { sweptDug: true } : {}),
      ...(roller ? { roller } : {}),
      ...(simulation.config.surfaceMotion ? { surfaceMotion: simulation.config.surfaceMotion } : {}),
      ...(simulation.config.plainHeight ? { plainHeight: simulation.config.plainHeight } : {}),
      ...(simulation.config.froth ? { froth: simulation.config.froth } : {}),
    });
  }

  setSampleTime(offset: number): void {
    this.sampleTime = this.options.surfaceMotion === 'old' ? 0 : offset;
  }

  /** Internal ordinary swept owner only: copy fresh fields before building, retain them through later demand. */
  createOwnedPlainSurface(): OwnedPlainSurface {
    const state = new OwnedHeightState(this.solver);
    const surface = new PlainHeightSurface(state, this.spacing, this.options.plainHeight ? { plainHeight: this.options.plainHeight } : {}, true);
    return Object.freeze({
      capture: () => { state.capture(this.solver); surface.invalidateSurfaceNodeCache(); },
      // The cache stays active for this owned generation. It never reads live flow, carve or height fields.
      heightAt: surface.plainSurfaceAt.bind(surface),
    });
  }

  /**
   * The worker's face contact's own plain surface (pool-barrel-perf, 2026-11-06): this water's render-node heights, the same
   * as `plainSurfaceAt`'s, through a node cache of its own that is always on and that `invalidate` empties. The contact
   * empties it at each update, after the water's step, and its rows on demand read it until the next: in between, the
   * water's heights, bed and window hold (the bodies push only discharge), so a node's height is found once a step,
   * whether the update or a body's query first needs it.
   */
  createCachedPlainSurface(): { invalidate(): void; heightAt(x: number, z: number): number; bedAt(x: number, z: number): number } {
    const { carve, roller, plainHeight, zone } = this.options;
    const surface = new PlainHeightSurface(this.solver, this.spacing, { ...(carve ? { carve } : {}), ...(roller ? { roller } : {}), ...(plainHeight ? { plainHeight } : {}), ...(zone ? { zone } : {}) }, true);
    // `bedAt`: the solver's bed under it (ruling 22's bed rule on the dug foot, `dugCap`); read only where the foot is dug.
    const { solver } = this;
    return Object.freeze({
      invalidate: () => surface.invalidateSurfaceNodeCache(),
      heightAt: surface.plainSurfaceAt.bind(surface),
      bedAt: (x: number, z: number) => solver.sampleCentered(solver.bed, x, z),
    });
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const { solver } = this;
    const { swept } = this.options;
    if (swept) this.clearLayers(out);
    // Ruling 3's marks (`sweptInertia`, `sweptBuoy`): a reused sample leaves its last point's behind.
    if (this.options.sweptInertia) out.wallWater = undefined;
    if (this.options.sweptFollow) out.wallFollow = undefined;
    if (this.options.sweptBuoy) out.buoyancyNormal = undefined;
    // A reused sample leaves the lens of its last point behind: only a lens here sets it again.
    if (this.options.roller) {
      out.lensShare = undefined;
      out.lensFlowX = undefined;
      out.lensFlowZ = undefined;
      out.lensScale = undefined;
      out.lensThickness = undefined;
      out.lensReach = undefined;
      out.lensSpeedX = undefined;
      out.lensSpeedZ = undefined;
      out.lensGrip = undefined;
    }
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
    this.inWall = false;
    // The surface's rise rate (continuity), m/s: found here when the sample's time needs it, else with the flow below.
    let rise = Number.NaN;
    if (contact && this.options.sweptUnion) {
      // The solver's surface at the sample's time, as below without the contact.
      if (this.sampleTime !== 0 && out.wet) {
        rise = 0 - (this.gradient(qx, x, z, 'x') + this.gradient(qz, x, z, 'z'));
        out.surfaceY += rise * this.sampleTime;
      }
      this.unionContact(y, out);
      if (this.options.sweptNearest) this.cellWeights(x, z);
    } else if (contact) this.fromContact(y, out);
    else if (this.sampleTime !== 0 && out.wet) {
      rise = 0 - (this.gradient(qx, x, z, 'x') + this.gradient(qz, x, z, 'z'));
      out.surfaceY += rise * this.sampleTime * this.seaShare(x, z);
    }
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
    if (rise !== rise) rise = 0 - (this.gradient(qx, x, z, 'x') + this.gradient(qz, x, z, 'z'));
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
    if (roller && roller.lensAt(x, z, this.lens)) applyLens(out, y, this.lens, roller.options.voidMean, u, w, this.options.froth !== 'old');
    if (contact && out.waterFloorY !== undefined) this.lipFlow(out);
    else if (this.inWall) this.wallFlow(out, y);
    if (this.options.sweptInertia && this.inWall) out.wallWater = true;
    if (this.options.sweptFollow && this.inWall) out.wallFollow = true;
    if (this.options.sweptBuoy && this.inWall && out.normalY < MIN_NORMAL_Y) out.buoyancyNormal = 1 / MIN_NORMAL_Y;
    return out;
  }

  surfaceAt(x: number, z: number): number {
    const { swept } = this.options;
    if (swept && !this.outside(x, z)) {
      if (this.options.sweptDug) {
        // Ruling 21: the case's own front under the solver's surface is the water's surface there (`unionContact`).
        const hit = this.floorHit;
        if (swept.query(x, Infinity, z, hit) && hit.dug !== undefined && hit.dug > 0) {
          const plain = this.plainAtSampleTime(x, z);
          return hit.floorY < plain ? hit.floorY : Math.max(hit.floorY, plain);
        }
      }
      const floor = swept.floorAt(x, z);
      // Under the face ruling, never under the solver's surface (`sweptUnion`).
      if (floor === floor) return this.options.sweptUnion ? Math.max(floor, this.plainAtSampleTime(x, z)) : floor;
    }
    return this.plainAtSampleTime(x, z);
  }

  /** The render nodes' surface at (x, z), moved to the bodies' sample time at its rise rate (`setSampleTime`). */
  private plainAtSampleTime(x: number, z: number): number {
    const surface = this.plainSurfaceAt(x, z);
    if (this.sampleTime === 0 || this.outside(x, z)) return surface;
    this.cellWeights(x, z);
    if (!(this.blend(this.solver.h) > WET)) return surface;
    const { qx, qz } = this.solver;
    return surface + (0 - (this.gradient(qx, x, z, 'x') + this.gradient(qz, x, z, 'z'))) * this.sampleTime * this.seaShare(x, z);
  }

  /** How much of the surface at (x, z) is the sea's own (1 outside a library zone, `zone`): its rise moves only that share. */
  private seaShare(x: number, z: number): number {
    const { zone } = this.options;
    return zone ? 1 - zone.weightAt(x, z) : 1;
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
      solver.markWater(i);
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
   * The swept surface's answer united with the solver's water (`sweptUnion`), `out` holding the solver's surface at the
   * sample's time. Under the solver's surface the point is in water: the solver's surface answers, unless the swept
   * water stands higher over it; the curl's water reaching down into the solver's is no longer a falling jet over air.
   * Over it the swept surface answers, its floor raised to the solver's where it lies under it (the tube's air stays
   * over the solver's water).
   */
  private unionContact(y: number, out: WaterSample): void {
    const { hit } = this;
    const plainY = out.surfaceY;
    this.plainY = plainY;
    const slopeX = out.slopeX;
    const slopeZ = out.slopeZ;
    const normalX = out.normalX;
    const normalY = out.normalY;
    const normalZ = out.normalZ;
    const plain = () => {
      out.surfaceY = plainY;
      out.slopeX = slopeX;
      out.slopeZ = slopeZ;
      out.normalX = normalX;
      out.normalY = normalY;
      out.normalZ = normalZ;
    };
    // Ruling 5 (`sweptSeam`): the case's surface here is the solver's (share 0, no air under it): the solver's water.
    const seamless = this.options.sweptSeam === true && hit.inWater && hit.seam !== undefined && hit.seam <= 0
      && !(hit.waterFloorY === hit.waterFloorY) && !(hit.ceilingY === hit.ceilingY);
    if (seamless) {
      plain();
      out.tube = tubeState(hit.life);
      out.covered = false;
      return;
    }
    if (this.options.sweptDug === true && hit.dug !== undefined && hit.dug > 0 && hit.floorY < plainY) {
      // Ruling 21 (`sweptDug`): the floor here is the case's own front, under the solver's surface. The swept surface
      // answers alone: its water under it, air over it (no solver water over the dug face), its floor not raised.
      this.fromContact(y, out);
      if (hit.inWater) {
        this.inWall = this.options.sweptWall === true && out.waterFloorY === undefined;
        if (this.options.sweptNearest && out.waterFloorY === undefined) this.nearestSurface(y, out);
      }
      return;
    }
    if (y < plainY) {
      if (hit.inWater && hit.surfaceY >= plainY) {
        this.fromContact(y, out);
        if (out.waterFloorY !== undefined && out.waterFloorY <= plainY) out.waterFloorY = undefined;
        if (this.options.sweptNearest && out.waterFloorY === undefined) {
          // The case's wall standing over the solver's surface (the step 7 follow-up): its water and its nearest surface.
          this.inWall = this.options.sweptWall === true;
          this.nearestSurface(y, out);
        }
        return;
      }
      // The solver's water: the swept surface says air or lies under it here.
      plain();
      out.tube = tubeState(hit.life);
      out.covered = false;
      return;
    }
    this.fromContact(y, out);
    if (hit.inWater) {
      if (out.waterFloorY !== undefined && out.waterFloorY <= plainY) out.waterFloorY = undefined;
      // Over the solver's surface in the swept water with no air under it: the case's wall (`sweptWall`).
      this.inWall = this.options.sweptWall === true && out.waterFloorY === undefined;
      if (this.options.sweptNearest && out.waterFloorY === undefined) this.nearestSurface(y, out);
      return;
    }
    // In air over the swept surface: the floor under the point is the higher of it and the solver's.
    if (hit.surfaceY < plainY) {
      plain();
      if (out.ceilingY !== undefined && !(out.ceilingY > plainY)) {
        out.ceilingY = undefined;
        out.ceilingTopY = undefined;
        out.clearance = undefined;
        out.covered = false;
      }
    }
  }

  /**
   * The step 7 follow-up's nearest surface (`sweptNearest`) at height `y` in the case's wall, `out` holding the crossing
   * above (`fromContact`): the face ahead's share (`ContactHit.aheadWeight`) where the solver's surface there stands under
   * the point's height (by `NEAREST.blend`; else the solver's water goes on past that face), and the two answers blended by
   * it: the depth along the normal (the surface reported that far above the point, so a hull reads its true immersion), the
   * normal with the slope clamp, and the surface's velocity for the wall's water (into the hit). Only + − × ÷ and √. The
   * caller restores the cell weights (`cellWeights`), which the solver's surface at the face ahead reads.
   */
  private nearestSurface(y: number, out: WaterSample): void {
    const hit = this.hit;
    if (!(hit.normalDepth === hit.normalDepth)) return;
    let w = hit.aheadWeight;
    if (w > 0) {
      const clear = y - this.plainAtSampleTime(hit.aheadX, hit.aheadZ);
      w *= Math.min(1, Math.max(0, clear / NEAREST.blend));
    }
    let nx = hit.normalX + w * (hit.aheadNormalX - hit.normalX);
    let ny = hit.normalY + w * (hit.aheadNormalY - hit.normalY);
    let nz = hit.normalZ + w * (hit.aheadNormalZ - hit.normalZ);
    const length = Math.sqrt(nx * nx + ny * ny + nz * nz);
    if (length > 1e-12) {
      nx /= length;
      ny /= length;
      nz /= length;
    } else {
      nx = hit.normalX;
      ny = hit.normalY;
      nz = hit.normalZ;
    }
    const depth = w > 0 ? hit.verticalDepth + w * (hit.aheadDepth - hit.verticalDepth) : hit.verticalDepth;
    if (w > 0 && hit.aheadAlong === hit.aheadAlong && hit.wallAlong === hit.wallAlong) {
      hit.wallAlong += w * (hit.aheadAlong - hit.wallAlong);
      hit.wallUp += w * (hit.aheadUp - hit.wallUp);
      // Ruling 5 (`sweptSeam`): the share with the surface's velocity it weighs.
      if (hit.seam !== undefined && hit.aheadSeam !== undefined) hit.seam += w * (hit.aheadSeam - hit.seam);
    }
    hit.normalX = nx;
    hit.normalY = ny;
    hit.normalZ = nz;
    hit.normalDepth = depth;
    out.surfaceY = y + depth;
    if (ny >= MIN_NORMAL_Y) {
      out.slopeX = -nx / ny;
      out.slopeZ = -nz / ny;
    } else {
      const across = Math.sqrt(nx * nx + nz * nz);
      out.slopeX = across > 0 ? (-nx / across) * STEEPEST : 0;
      out.slopeZ = across > 0 ? (-nz / across) * STEEPEST : 0;
    }
    out.normalX = nx;
    out.normalY = ny;
    out.normalZ = nz;
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

  /**
   * Step 7's wall water (`sweptWall`) at height `y`, `out` holding the solver's flow: the ray–vertical plane's flow ramps
   * from the solver's at the anchor's height to (B·C along the ray, 0 up) at the crest, its component along the swept
   * surface's normal then set to that surface's own normal speed, the whole weighed by the slices' weight; along the crest
   * the solver's is kept.
   */
  private wallFlow(out: WaterSample, y: number): void {
    const h = this.hit;
    if (!(h.wallWeight > 0) || !(h.wallSpeed === h.wallSpeed) || !(h.wallAlong === h.wallAlong)) return;
    // Ruling 5 (`sweptSeam`): by the case's share at the surface over the point, the weight its height took.
    let seam = 1;
    if (this.options.sweptSeam && h.seam !== undefined) {
      seam = Math.min(1, h.seam);
      if (!(seam > 0)) return;
    }
    // Ruling 6 (`sweptStream`): the streamline flow on the surface the rider touches, in place of the kinematic target.
    if (this.options.sweptStream) {
      streamWallFlow(out, out.surfaceY, h, seam);
      return;
    }
    if (!this.options.sweptBlend) {
      wallWaterFlow(out, y, h, seam);
      return;
    }
    // Ruling 3 (`sweptBlend`): by the wall's height over the solver's surface in this column, and by how far the case's
    // surface faces the wave's own plane (the ray and up).
    const u = Math.min(1, Math.max(0, (h.surfaceY - this.plainY) / WALL_WATER.blend));
    const na = h.normalX * -h.tangentZ + h.normalZ * h.tangentX;
    const facing = Math.sqrt(na * na + h.normalY * h.normalY);
    const [least, whole] = WALL_WATER.facing;
    const f = Math.min(1, Math.max(0, (facing - least) / (whole - least)));
    wallWaterFlow(out, y, h, u * u * (3 - 2 * u) * f * f * (3 - 2 * f) * seam);
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

/**
 * Step 7's wall water (`PhysicalSurfWaterOptions.sweptWall`; the advisor's 2026-11-04 ruling §1.4.3) at height `y` into
 * `out`, which holds the solver's flow there; `wall` is the swept surface's answer (its normal, the front's tangent, and its
 * `wall…` fields). In the ray–vertical plane two components are set and the third follows:
 * - normal to the swept surface: that surface's own normal speed (the kinematic condition: water does not cross its own
 *   free surface);
 * - along the ray: a ramp from the solver's at the anchor's height (`wallLow`) to B·C at the crest (`wallTop`), the crest's
 *   water moving forward at B·C (Derakhti et al. 2020: B 0.85 as the face goes vertical, 1 soon after; the ramp inferred);
 * - so the component along the face (up it, toward the crest) is what meets both: on a steep face moving forward faster than
 *   its water, the water climbs it, as a wave face's water streams up toward its crest in the wave's frame. *(Built so)*
 *   Where the face is steeper than `WALL_WATER.steepest` from level (and overhanging) the along-ray target can no longer be
 *   met at a finite climb: its normal's vertical share is held at that face's, and the climb at most C either way (the
 *   water at a wave face moves no faster than the wave; inferred).
 * The whole is weighed by the slices' weight; along the crest the solver's flow is kept.
 * - `blend`, m (ruling 3, `sweptBlend`; *built so*): the wall water's share is the smoothstep of the wall's height over the
 *   solver's surface over this band (`share`). Where the case's surface meets the solver's (about the anchor's height) the
 *   wall water was 2.9–6.0 m/s off the solver's flow at p90 (the advisor's traces); over 0.25 m, a body moving 1–3 m/s across
 *   it at 60 Hz meets about 1 m/s a step at most (inferred). Provisional.
 * - `facing` (ruling 3, `sweptBlend`; *built so*): the wall water is a wave face's flow in the wave's own plane (the ray and
 *   up), so its share is also the smoothstep of the case's surface's normal's part in that plane, from `facing[0]` (60° out
 *   of it) to `facing[1]` (37°). Where the nearest surface faces along the crest (a strip's side, at a front's end or a fold),
 *   its part in the plane is short and its direction there turned with every step: the largest wall-water steps measured
 *   (10–19 m/s, pool 1.5 m) were at normals 60–80° out of the plane, the climb's bound swinging the flow from −C to +C.
 */
export const WALL_WATER = { steepest: 0.2, fade: [0.3, 0.6], blend: 0.25, facing: [0.5, 0.8] } as const;

/**
 * Ruling 6's streamline wall water (`sweptStream`, `?wallBody=stream`; the advisor's advisor-ruling-6.md §4), `out`
 * holding the solver's flow. In the frame moving with the wave (c along the ray: `wallSpeed`, there the wave's own
 * advance) the forming face is nearly steady, so its surface is a streamline and the speed along it follows the height
 * under the crest: q² = q_c² + 2 g (y_top − y_surface), with q_c = (1 − B) c at the crest (B: `wallB`, the crest water's
 * share of the wave's speed). Back in the lab frame the flow is c r̂ + q t̂, t̂ = (−n_y, n_a) in the ray–vertical plane
 * (back over the crest, up the face, forward and down along a roof): along the ray c − q n_y, up q n_a. No profile point
 * is differenced between frames. The whole is weighed by the slices' weight times `share` (the seam's); along the crest
 * the solver's is kept. It has no fade with depth: a point a few decimetres under the surface takes the flow of the
 * surface over it (*measured*: `wallWaterFlow`'s 0.3–0.6 m fade, applied to this weight, put the jolts back as boards
 * sank through it, felt p99 0.55 → 2.71 m/s; docs/research/wall-body-2026-11-11/README.md).
 */
export function streamWallFlow(
  out: Pick<WaterSample, 'flowX' | 'flowY' | 'flowZ'>, surfaceY: number,
  wall: Pick<ContactHit, 'normalX' | 'normalY' | 'normalZ' | 'tangentX' | 'tangentZ' | 'wallTop' | 'wallSpeed' | 'wallB' | 'wallWeight'>,
  share = 1,
): void {
  const rx = -wall.tangentZ;
  const rz = wall.tangentX;
  let na = wall.normalX * rx + wall.normalZ * rz;
  let ny = wall.normalY;
  const length = Math.sqrt(na * na + ny * ny);
  if (!(length > 1e-9)) return;
  na /= length;
  ny /= length;
  const c = wall.wallSpeed;
  const crest = (1 - wall.wallB) * c;
  const q = Math.sqrt(crest * crest + 2 * GRAVITY * Math.max(0, wall.wallTop - surfaceY));
  const w = Math.min(1, Math.max(0, wall.wallWeight)) * share;
  if (!(w > 0)) return;
  const along = out.flowX * rx + out.flowZ * rz;
  const change = w * (c - q * ny - along);
  out.flowX += change * rx;
  out.flowZ += change * rz;
  out.flowY += w * (q * na - out.flowY);
}

export function wallWaterFlow(
  out: Pick<WaterSample, 'flowX' | 'flowY' | 'flowZ'>, y: number,
  wall: Pick<ContactHit, 'normalX' | 'normalY' | 'normalZ' | 'tangentX' | 'tangentZ' | 'wallAlong' | 'wallUp' | 'wallLow' | 'wallTop' | 'wallSpeed' | 'wallB' | 'wallWeight'>
    & Partial<Pick<ContactHit, 'normalDepth'>>,
  share = 1,
): void {
  // The ray: the front's normal, square to its tangent.
  const rx = -wall.tangentZ;
  const rz = wall.tangentX;
  const along = out.flowX * rx + out.flowZ * rz;
  const span = wall.wallTop - wall.wallLow;
  const r = span > 0 ? Math.min(1, Math.max(0, (y - wall.wallLow) / span)) : 1;
  const target = along + r * (wall.wallB * wall.wallSpeed - along);
  // The swept surface's normal in the ray–vertical plane, and its tangent up the face (its upward one).
  let na = wall.normalX * rx + wall.normalZ * rz;
  let ny = wall.normalY;
  const length = Math.sqrt(na * na + ny * ny);
  let flowAlong = target;
  let flowUp = out.flowY;
  if (length > 1e-9) {
    na /= length;
    ny /= length;
    const side = na >= 0 ? 1 : -1;
    let normal = wall.wallAlong * na + wall.wallUp * ny;
    // The step 7 follow-up (`sweptNearest`): deep in the wall the kinematic condition gives way to the solver's flow, faded
    // linearly over `WALL_WATER.fade` of the depth along the normal (inferred); NaN depth (without it): no fade.
    const depth = wall.normalDepth;
    if (depth !== undefined && depth === depth && depth > WALL_WATER.fade[0]) {
      const k = Math.max(0, (WALL_WATER.fade[1] - depth) / (WALL_WATER.fade[1] - WALL_WATER.fade[0]));
      normal = k * normal + (1 - k) * (along * na + out.flowY * ny);
    }
    // u = (normal) n̂ + climb t̂, t̂ = side (−n_y, n_a): its along-ray part normal n_a − climb side n_y is the target.
    const bound = Math.abs(wall.wallSpeed);
    const climb = Math.min(bound, Math.max(-bound, (side * (normal * na - target)) / Math.max(WALL_WATER.steepest, ny)));
    flowAlong = normal * na - climb * side * ny;
    flowUp = normal * ny + climb * side * na;
  }
  const w = share === 1 ? Math.min(1, Math.max(0, wall.wallWeight)) : Math.min(1, Math.max(0, wall.wallWeight)) * share;
  const change = w * (flowAlong - along);
  out.flowX += change * rx;
  out.flowZ += change * rz;
  out.flowY += w * (flowUp - out.flowY);
}
