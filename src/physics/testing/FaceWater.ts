import type { SurfWater, WaterSample } from '../SurfWater';

const GRAVITY = 9.81;

export interface FaceOptions {
  /** Still depth under the trough ahead of the face, m. */
  depth: number;
  /** The crest's height over the trough, m. */
  height: number;
  /** The face's slope at its steepest, degrees. */
  slope: number;
  /** The crest's speed toward +z, m/s: √(g (d + H)) unless given. */
  speed?: number;
  /** Where the crest starts (z, m). */
  crestZ?: number;
  /** How much longer the back is than the face. */
  back?: number;
  /**
   * The water's vertical flow at the surface: 'surface', its rise at a fixed point, ∂η/∂t (what `PhysicalSurfWater`
   * reconstructs from continuity); 'particle', the water's own, ∂η/∂t + u ∂η/∂z (the kinematic surface condition).
   */
  vertical?: 'surface' | 'particle';
}

const smooth = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
const smoothRate = (t: number) => (t <= 0 || t >= 1 ? 0 : 6 * t * (1 - t));

/**
 * An analytic, endless wave face for ride tests (the movement-flow spec's pumping): one crest `height` over the
 * trough, the same along x, running toward +z at `speed`. The face falls from the crest to the trough as a
 * smoothstep over 1.5 height / tan(slope), so it is steepest halfway down at `slope`, concave below and convex above;
 * the back falls `back` times as long. Under it the water moves at the current mass conservation gives,
 * u = c η / (d + η) over a still trough, and rises as `vertical` says, carried down linearly to nothing at the flat
 * bed. It takes no reactions. Test-only.
 */
export class FaceWater implements SurfWater {
  readonly options: Required<FaceOptions>;
  /** The face's length from the crest to the trough, m. */
  readonly front: number;
  readonly speed: number;
  private time = 0;

  constructor(options: FaceOptions) {
    this.options = { speed: Math.sqrt(GRAVITY * (options.depth + options.height)), crestZ: 0, back: 4, vertical: 'surface', ...options };
    this.speed = this.options.speed;
    this.front = (1.5 * this.options.height) / Math.tan((this.options.slope * Math.PI) / 180);
  }

  advance(dt: number): void {
    this.time += dt;
  }

  /** Where the crest is now (z, m). */
  crestZ(): number {
    return this.options.crestZ + this.speed * this.time;
  }

  /** Height on the face at z: 0 at the trough ahead, 1 at the crest, and 1 behind it. */
  faceFraction(z: number): number {
    const ahead = z - this.crestZ();
    return ahead >= 0 ? this.rise(ahead) / this.options.height : 1;
  }

  surfaceAt(_x: number, z: number): number {
    return this.rise(z - this.crestZ());
  }

  sampleAt(_x: number, y: number, z: number, out: WaterSample): WaterSample {
    const { depth, vertical } = this.options;
    const ahead = z - this.crestZ();
    const rise = this.rise(ahead);
    const slopeZ = this.riseRate(ahead);
    const column = depth + rise;
    const current = (this.speed * rise) / column;
    const surfaceRise = -(this.speed - (vertical === 'particle' ? current : 0)) * slopeZ;
    const height = Math.min(column, Math.max(0, y + depth));
    const norm = Math.hypot(1, slopeZ);
    Object.assign(out, {
      surfaceY: rise, stillDepth: depth, waterDepth: column, bedY: -depth, bedNormalX: 0, bedNormalY: 1, bedNormalZ: 0, bedMaterial: 'sand' as const,
      wet: true, outsideDomain: false, slopeX: 0, slopeZ, normalX: 0, normalY: 1 / norm, normalZ: -slopeZ / norm,
      flowX: 0, flowY: (surfaceRise * height) / column, flowZ: current, regime: 'shallow' as const, breaking: 0, voidFraction: 0, turbulence: 0,
    });
    return out;
  }

  addReaction(): void {}

  /** The surface over the trough at `ahead` m from the crest (negative behind it), and its slope along z. */
  private rise(ahead: number): number {
    const { height, back } = this.options;
    return ahead >= 0 ? height * (1 - smooth(ahead / this.front)) : height * (1 - smooth(-ahead / (back * this.front)));
  }

  private riseRate(ahead: number): number {
    const { height, back } = this.options;
    return ahead >= 0 ? (-height * smoothRate(ahead / this.front)) / this.front : (height * smoothRate(-ahead / (back * this.front))) / (back * this.front);
  }
}
