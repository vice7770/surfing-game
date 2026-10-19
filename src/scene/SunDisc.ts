import { AdditiveBlending, Color, DataTexture, LinearFilter, Sprite, SpriteMaterial, type PerspectiveCamera, type Vector3 } from 'three';

/** The sun's angular radius, radians (0.27°). */
export const SUN_RADIUS = (0.27 * Math.PI) / 180;

/** A disc with a two-texel soft rim, as alpha. */
function discTexture(size = 32): DataTexture {
  const data = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const r = Math.hypot(x + 0.5 - size / 2, y + 0.5 - size / 2) / (size / 2);
      const alpha = Math.min(1, Math.max(0, (1 - r) * (size / 4)));
      data.set([255, 255, 255, Math.round(alpha * 255)], 4 * (y * size + x));
    }
  }
  const texture = new DataTexture(data, size, size);
  texture.minFilter = LinearFilter;
  texture.magFilter = LinearFilter;
  texture.needsUpdate = true;
  return texture;
}

/**
 * The sun's disc as HDR light, for the glow and colour grade only. The sky
 * photo's sun is a clipped white blob (its light was moved into the scene's
 * DirectionalLight); graded with AgX it would read grey and give the bloom
 * nothing to spread. This disc, drawn over it at the photo's sun, carries the
 * sun's colour and a radiance set by its intensity, so it grades to white and
 * glows; waves and the shore in front hide it.
 */
export class SunDisc {
  readonly sprite: Sprite;
  private readonly material: SpriteMaterial;

  constructor() {
    this.material = new SpriteMaterial({
      map: discTexture(), color: new Color(0, 0, 0), blending: AdditiveBlending, transparent: true,
      depthWrite: false, fog: false, toneMapped: false,
    });
    this.sprite = new Sprite(this.material);
    this.sprite.frustumCulled = false;
    this.sprite.renderOrder = -5;
  }

  /** The sun's colour (normalised to its brightest channel) and its intensity; `radiance` scene units per unit of intensity. */
  setLight(color: Color, intensity: number, radiance: number): void {
    this.material.color.copy(color).multiplyScalar(intensity * radiance);
  }

  /** Halfway to the camera's far plane toward the sun, sized to the sun's angle. */
  place(camera: PerspectiveCamera, towardSun: Vector3): void {
    const distance = camera.far * 0.5;
    this.sprite.position.copy(camera.position).addScaledVector(towardSun, distance);
    this.sprite.scale.setScalar(2 * distance * Math.tan(SUN_RADIUS));
  }

  dispose(): void {
    this.material.map?.dispose();
    this.material.dispose();
  }
}
