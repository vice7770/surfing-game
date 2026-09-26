import {
  Color,
  EquirectangularReflectionMapping,
  PMREMGenerator,
  SRGBColorSpace,
  TextureLoader,
  Vector3,
  type MeshStandardMaterial,
  type Scene,
  type Texture,
  type WebGLRenderer,
  type WebGLRenderTarget,
} from 'three';
import { HDRLoader } from 'three/examples/jsm/loaders/HDRLoader.js';

export type TimeOfDay = 'dawn' | 'midday' | 'sunset';

/** One photographed sky, as `npm run assets:skies` writes it to `skies.json`. */
export interface SkyEntry {
  id: string;
  timeOfDay: TimeOfDay;
  hdr: string;
  background: string;
  /** The sun moved out of the HDR: its unrotated direction and its irradiance per channel, in the HDR's units. */
  sun: { direction: [number, number, number]; irradiance: [number, number, number] };
  /** Horizontal irradiance of the sky without the sun, in the HDR's units. */
  skyIrradiance: number;
}

/** The Wave Lab's sun-height slider (0–1) as a sun elevation, degrees. */
export function sunElevationFromSlider(value: number): number {
  return 60 * Math.min(1, Math.max(0, value));
}

const elevationOf = (sky: SkyEntry) => (Math.asin(sky.sun.direction[1]) * 180) / Math.PI;

/** The photo whose measured sun elevation is nearest: the slider snaps to it. */
export function nearestSky(skies: readonly SkyEntry[], elevationDegrees: number): SkyEntry {
  return skies.reduce((best, sky) => (Math.abs(elevationOf(sky) - elevationDegrees) < Math.abs(elevationOf(best) - elevationDegrees) ? sky : best));
}

/**
 * The turn about +y that brings the photo's sun to the game's azimuth
 * (`Environment` puts the sun at x = sin a, z = −cos a). A turn θ adds θ to a
 * direction's atan2(x, z), as `rotatedSun` and three's `makeRotationY` do.
 */
export function skyRotation(photoSun: readonly [number, number, number], azimuthDegrees: number): number {
  const a = (azimuthDegrees * Math.PI) / 180;
  return Math.atan2(Math.sin(a), -Math.cos(a)) - Math.atan2(photoSun[0], photoSun[2]);
}

export function rotatedSun(photoSun: readonly [number, number, number], rotation: number, out: Vector3): Vector3 {
  const c = Math.cos(rotation);
  const s = Math.sin(rotation);
  return out.set(photoSun[0] * c + photoSun[2] * s, photoSun[1], -photoSun[0] * s + photoSun[2] * c).normalize();
}

/**
 * Horizontal light for a high sun, in the scene's light units. An
 * art-direction value tuned on the screenshot sheet (the old painted scene lit
 * a level surface with about 3), not a measured illuminance.
 */
export const REFERENCE_LIGHT = 3.2;

/**
 * Photos are exposed differently, so each is scaled to a horizontal light set
 * by its sun's height: `REFERENCE_LIGHT` overhead, 40 % at the horizon (low
 * suns are dimmer, compressed for play). The environment and the sun share the
 * scale, so each photo keeps its own sun-to-sky balance. The sun's colour is
 * its irradiance over its brightest channel, and its intensity that channel.
 */
export function skyExposure(entry: SkyEntry): { environment: number; sun: number; sunColor: Color } {
  const [r, g, b] = entry.sun.irradiance;
  const sine = Math.max(0, entry.sun.direction[1]);
  const horizontal = entry.skyIrradiance + (0.2126 * r + 0.7152 * g + 0.0722 * b) * sine;
  const scale = (REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(sine))) / Math.max(1e-6, horizontal);
  const peak = Math.max(r, g, b);
  return {
    environment: scale,
    sun: scale * peak,
    sunColor: peak > 0 ? new Color(r / peak, g / peak, b / peak) : new Color(1, 1, 1),
  };
}

/** A photographed sky: the visible background, the environment for lighting and reflections, and its sun. */
export class PhotoSky {
  readonly sunDirection = new Vector3(0, 1, 0);
  readonly sunColor = new Color(1, 1, 1);
  sunIntensity = 0;
  environment?: Texture;
  background?: Texture;
  environmentIntensity = 1;
  /** The turn about +y applied to the photo, radians. */
  rotation = 0;
  private skies?: readonly SkyEntry[];
  private current?: SkyEntry;
  private target?: WebGLRenderTarget;

  /** `baseUrl` is where `public/assets/` is served, relative to the page. */
  constructor(private readonly renderer: WebGLRenderer, private readonly baseUrl = 'assets/') {}

  get ready(): boolean {
    return this.environment !== undefined;
  }

  get timeOfDay(): TimeOfDay | undefined {
    return this.current?.timeOfDay;
  }

  async loadManifest(): Promise<readonly SkyEntry[]> {
    if (!this.skies) {
      const response = await fetch(`${this.baseUrl}skies/skies.json`);
      if (!response.ok) throw new Error(`sky manifest: ${response.status}`);
      this.skies = (await response.json()).skies as SkyEntry[];
    }
    return this.skies;
  }

  /** Loads the sky nearest `elevationDegrees` unless it is already current, and turns it to `azimuthDegrees`. Resolves true when the sky changed. */
  async select(elevationDegrees: number, azimuthDegrees: number): Promise<boolean> {
    const entry = nearestSky(await this.loadManifest(), elevationDegrees);
    const changed = entry !== this.current;
    if (changed) {
      const [hdr, background] = await Promise.all([
        new HDRLoader().loadAsync(`${this.baseUrl}${entry.hdr}`),
        new TextureLoader().loadAsync(`${this.baseUrl}${entry.background}`),
      ]);
      hdr.mapping = EquirectangularReflectionMapping;
      background.mapping = EquirectangularReflectionMapping;
      background.colorSpace = SRGBColorSpace;
      const pmrem = new PMREMGenerator(this.renderer);
      const target = pmrem.fromEquirectangular(hdr);
      pmrem.dispose();
      hdr.dispose();
      this.target?.dispose();
      this.background?.dispose();
      this.target = target;
      this.environment = target.texture;
      this.background = background;
      this.current = entry;
      const exposure = skyExposure(entry);
      this.environmentIntensity = exposure.environment;
      this.sunIntensity = exposure.sun;
      this.sunColor.copy(exposure.sunColor);
    }
    this.rotation = skyRotation(entry.sun.direction, azimuthDegrees);
    rotatedSun(entry.sun.direction, this.rotation, this.sunDirection);
    return changed;
  }

  /** The background and environment on the scene, and the same map turned the same way on materials that carry their own. */
  applyTo(scene: Scene, materials: readonly MeshStandardMaterial[]): void {
    if (!this.environment) return;
    scene.environment = this.environment;
    scene.environmentIntensity = this.environmentIntensity;
    scene.environmentRotation.set(0, this.rotation, 0);
    scene.backgroundRotation.set(0, this.rotation, 0);
    for (const material of materials) {
      if (material.envMap !== this.environment) material.needsUpdate = true;
      material.envMap = this.environment;
      material.envMapIntensity = this.environmentIntensity;
      material.envMapRotation.set(0, this.rotation, 0);
    }
  }
}
