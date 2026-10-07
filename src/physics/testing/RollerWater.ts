import { applyLens, catmullRomWeights } from '../PhysicalSurfWater';
import type { SurfWater, WaterSample } from '../SurfWater';
import { ROLLER_DEFAULTS, createLensPoint, crestThickness, lensThickness, rollerLength, type RollerOptions } from '../../wave/SpillingRoller';

const GRAVITY = 9.81;
/** Behind its crest the bore's back falls to still water over this, m (BoreWater's). */
const BACK = 4;

export interface RollerBoreOptions {
  /** Still depth ahead of the bore, h₁, m. */
  depth: number;
  /** The bore's height over it, H, m. */
  height: number;
  /** Where its toe starts across shore, z, m; it runs toward the shore (+z). */
  toeZ: number;
  /** Its speed, m/s: √(g(h₁ + H/2)) unless given (R3 §2.1: Booij's, which Martins et al. 2018 fit). 0 holds it still. */
  speed?: number;
  /** Its lens's development φ (0 at birth, 1 developed; sets its length) and scale g. */
  development?: number;
  scale?: number;
  /** How far the broken crest runs behind its crest before its back falls to still water, m. */
  length?: number;
  /** Whether it carries its lens (false: the same bore, bare, for the difference the lens makes). */
  lens?: boolean;
  /** The lens's shape: the recipe's quarter ellipse, or the wedge holding the same water (the advisor's Q2 fallback). */
  shape?: 'ellipse' | 'wedge';
  /** The roller's constants (`ROLLER_DEFAULTS`). */
  roller?: Partial<RollerOptions>;
  /**
   * The render nodes' spacing across shore, m: the surface a body meets is Catmull-Rom over nodes this far apart, as
   * `PhysicalSurfWater`'s is, so the lens's top is felt as the game draws it (its toe smoothed over a node).
   */
  nodeSpacing?: number;
}

function smoothstep(t: number): number {
  const s = Math.min(1, Math.max(0, t));
  return s * s * (3 - 2 * s);
}

/**
 * BoreWater's analytic broken wave with the real roller lens (the Canyon roller lens, S3, Task 3), for the rider's feel
 * tests. A bore of height H over still water h₁ deep runs toward the shore at c. Its face falls from the crest to the
 * toe over the roller's length L_r (the stage relation at its development), and its crest runs on flat for `length`
 * before its back falls to still water. Under it the water moves at the depth-averaged current mass conservation gives,
 * c η / (h₁ + η), rising at ∂η/∂t = −c ∂η/∂z at the surface and none at the bed.
 *
 * On the face, from the crest to the toe (and 0.3 L_r behind the crest), lies the lens: `SpillingRoller`'s shape
 * (crestThickness, lensThickness) at scale g, its top ᾱ t over the water, sampled through `PhysicalSurfWater`'s own
 * `applyLens` (its air by height, its flow c along +z above the shear layer). The water reports breaking B = 1 over
 * the lens and 0 elsewhere. Test-only.
 */
export class RollerWater implements SurfWater {
  readonly options: Required<Omit<RollerBoreOptions, 'roller'>> & { roller: RollerOptions };
  /** The roller's length L_r and crest thickness t_c (of the quarter ellipse, or the wedge's at its crest), m. */
  readonly rollerLength: number;
  readonly crestThickness: number;
  /** The water's reactions to the bodies' impulses so far, N·s (what the water exerted on them). */
  readonly reaction = { x: 0, y: 0, z: 0 };
  private time = 0;
  private readonly lens = createLensPoint();

  constructor(options: RollerBoreOptions) {
    const speed = options.speed ?? Math.sqrt(GRAVITY * (options.depth + options.height / 2));
    const roller = { ...ROLLER_DEFAULTS, ...options.roller };
    this.options = { development: 1, scale: 1, length: 8, lens: true, shape: 'ellipse', nodeSpacing: 1, ...options, speed, roller };
    this.rollerLength = rollerLength(0, options.height, this.options.development, roller);
    // The wedge holds the same water, (1 − ᾱ)·t_w·L/2 = K·H² (the plan's Q2: 0.26–0.44 H for L from 3.5 to 2.1 H).
    this.crestThickness = this.options.shape === 'wedge'
      ? (2 * roller.area * options.height * options.height) / ((1 - roller.voidMean) * this.rollerLength)
      : crestThickness(options.height, this.rollerLength, roller);
  }

  advance(dt: number): void {
    this.time += dt;
  }

  /** Where the toe is now, and the crest, z, m. */
  toeZ(): number {
    return this.options.toeZ + this.options.speed * this.time;
  }

  crestZ(): number {
    return this.toeZ() - this.rollerLength;
  }

  /** The water's own rise over still water at z (no lens), m. */
  waterAt(z: number): number {
    const { height, length } = this.options;
    const behind = this.toeZ() - z;
    return height * smoothstep(behind / this.rollerLength) * smoothstep((this.rollerLength + length + BACK - behind) / BACK);
  }

  /** The lens's thickness at z, m: none without it, cut to half the water's depth as the roller's is. */
  thicknessAt(z: number): number {
    const { lens, scale, shape, roller, depth } = this.options;
    if (!lens) return 0;
    const xi = (z - this.crestZ()) / this.rollerLength;
    const thickness = shape === 'wedge' && xi >= 0
      ? (xi < 1 ? scale * this.crestThickness * (1 - xi) : 0)
      : lensThickness(xi, this.crestThickness, scale, roller.rearTaper);
    return Math.min(thickness, 0.5 * (depth + this.waterAt(z)));
  }

  /** The water's rise and the lens's top over it at a render node, m. */
  nodeAt(z: number): number {
    return this.waterAt(z) + this.options.roller.voidMean * this.thicknessAt(z);
  }

  /** The surface: Catmull-Rom over the render nodes across shore, as the game samples it, m. */
  surfaceAt(_x: number, z: number): number {
    const spacing = this.options.nodeSpacing;
    const g = z / spacing;
    const node = Math.floor(g);
    const weights = catmullRomWeights(g - node);
    let value = 0;
    for (let k = 0; k < 4; k += 1) value += weights[k] * this.nodeAt((node + k - 1) * spacing);
    return value;
  }

  sampleAt(x: number, y: number, z: number, out: WaterSample): WaterSample {
    const { depth, speed, roller } = this.options;
    const rise = this.waterAt(z);
    const e = 1e-3;
    const slopeZ = (this.surfaceAt(x, z + e) - this.surfaceAt(x, z - e)) / (2 * e);
    const norm = Math.hypot(1, slopeZ);
    const column = depth + rise;
    const current = (speed * rise) / column;
    const rising = (-speed * (this.waterAt(z + e) - this.waterAt(z - e))) / (2 * e);
    const height = Math.min(column, Math.max(0, y + depth));
    const thickness = this.thicknessAt(z);
    Object.assign(out, {
      surfaceY: this.surfaceAt(x, z), stillDepth: depth, waterDepth: column, bedY: -depth,
      bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand' as const, wet: true, outsideDomain: false,
      slopeX: 0, slopeZ, normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: 0, flowY: rising * (height / column), flowZ: current, regime: rise > 0 ? 'bore' : 'profile',
      breaking: thickness > 0 ? 1 : 0, voidFraction: 0, turbulence: 0, lensShare: undefined, lensFlowX: undefined, lensFlowZ: undefined, lensScale: undefined,
    });
    if (thickness > 0) {
      const { lens } = this;
      lens.thickness = thickness;
      lens.rise = roller.voidMean * thickness;
      lens.g = this.options.scale;
      lens.flowX = 0;
      lens.flowZ = speed;
      applyLens(out, y, lens, roller.voidMean, 0, current);
    }
    return out;
  }

  addReaction(_x: number, _z: number, impulseX: number, impulseY: number, impulseZ: number): void {
    this.reaction.x += impulseX;
    this.reaction.y += impulseY;
    this.reaction.z += impulseZ;
  }
}
