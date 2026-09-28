import type { SurfWater, WaterSample } from '../SurfWater';

const GRAVITY = 9.81;

export interface BoreOptions {
  /** Still depth ahead of the bore, m. */
  depth: number;
  /** The bore's height over the still water, m. */
  height: number;
  /** Where the front starts (z, m); it runs toward +z (the shore). */
  frontZ: number;
  /** The front's speed, m/s: √(g d) unless given. */
  speed?: number;
  /** How long the broken crest is behind its front, m, before the water falls back to still. */
  length?: number;
  /** How far behind the front the roller rides on the face, m (where the water breaks). */
  rollerLength?: number;
  /** The roller's thickness as a share of the local rise (`PhysicalSurfWater`'s ROLLER_SHARE, 0.5). */
  rollerShare?: number;
}

/** The front's ramp from still water to the crest's full height, m, and its back's, m. */
const RAMP = 1;
const BACK = 4;

function smoothstep(t: number): number {
  const s = Math.min(1, Math.max(0, t));
  return s * s * (3 - 2 * s);
}

/**
 * An analytic broken wave for body tests (the wipeout spec's duck-dive checks):
 * a crest of `height` over still water `depth` deep, `length` long, its front
 * ramped over RAMP and running toward +z at `speed`, its back falling to still
 * water over BACK. Under the crest the water moves at the depth-averaged
 * current mass conservation gives, c η / (d + η); on the front `rollerLength`,
 * where it breaks, the top `rollerShare` of the rise is carried from that
 * current up to the front's speed at the surface: `PhysicalSurfWater`'s
 * surface-roller rule, without a solver. Elsewhere the water is still. Test-only.
 */
export class BoreWater implements SurfWater {
  readonly options: Required<BoreOptions>;
  readonly reaction = { x: 0, y: 0, z: 0 };
  private time = 0;

  constructor(options: BoreOptions) {
    const speed = options.speed ?? Math.sqrt(GRAVITY * options.depth);
    this.options = { length: 8, rollerLength: 3, rollerShare: 0.5, ...options, speed };
  }

  advance(dt: number): void {
    this.time += dt;
  }

  /** Where the front is now (z, m). */
  frontZ(): number {
    return this.options.frontZ + this.options.speed * this.time;
  }

  /** The rise over still water at (z), m. */
  surfaceAt(_x: number, z: number): number {
    const behind = this.frontZ() - z;
    return this.options.height * smoothstep(behind / RAMP) * smoothstep((this.options.length - behind) / BACK);
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const { depth, speed, rollerLength, rollerShare } = this.options;
    const rise = this.surfaceAt(x, z);
    const e = 1e-3;
    const slopeZ = (this.surfaceAt(x, z + e) - this.surfaceAt(x, z - e)) / (2 * e);
    const norm = Math.hypot(1, slopeZ);
    const current = (speed * rise) / (depth + rise);
    // On the breaking front the roller carries the top of the rise from the current up to the front's speed.
    const behind = this.frontZ() - z;
    const breaking = behind > 0 && behind < rollerLength;
    const roller = breaking ? rollerShare * rise : 0;
    const inRoller = roller > 0 ? Math.min(1, Math.max(0, (y - (rise - roller)) / roller)) : 0;
    const flow = current + inRoller * (speed - current);
    Object.assign(out, {
      surfaceY: rise, stillDepth: depth, waterDepth: depth + rise, bedY: -depth, bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand' as const,
      wet: true, outsideDomain: false, slopeX: 0, slopeZ, normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: 0, flowY: 0, flowZ: flow, regime: 'profile', breaking: breaking ? 1 : 0,
    });
    return out;
  }

  addReaction(_x: number, _z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.reaction.x += impulseX;
    this.reaction.y += impulseY;
    this.reaction.z += impulseZ;
  }
}
