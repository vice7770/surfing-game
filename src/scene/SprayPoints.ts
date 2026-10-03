import { BufferAttribute, BufferGeometry, Color, NormalBlending, PerspectiveCamera, Points, ShaderMaterial, Vector2, Vector3, Vector4 } from 'three';
import { SPRAY_CAPACITY, SPRAY_STRIDE, WHITEWATER_CAPACITY } from '../wave/SprayCloud';
import { REFERENCE_LIGHT } from './PhotoSky';
import { churnTexture } from './water/churnTexture';
import { FOAM_BALL } from './water/mist';
import { richSprayFragment, richSprayVertex } from './water/richSpray';
import type { WaterLook } from './water/waterLook';

/**
 * What the renderer needs from a spray cloud: packed x, y, z, size, opacity and kind per particle (`SPRAY_STRIDE`), and for
 * the Rich look its velocity and optical depth after them; and how many are live.
 */
export interface RenderableSpray {
  readonly particles: Float32Array;
  readonly count: number;
}

/**
 * The sky's irradiance on a level surface, in the scene's light units, taken from the sun the scene is lit by
 * (`skyExposure` scales each photographed sky so that the sky plus the sun's horizontal share is
 * REFERENCE_LIGHT × (0.4 + 0.6 √sin h) whatever the photo): what the sun does not bring is the sky's. The sky's colour
 * is taken as neutral [provisional]. Painted-sky light (before the photo loads) does not follow that scale, so the sky
 * keeps a floor of 10 % of the total, about the least a clear sky's diffuse share is at noon [provisional].
 */
export function skyIrradiance(sunHeight: number, sunRadiance: { r: number; g: number; b: number }): number {
  const sine = Math.max(0, sunHeight);
  const horizontal = REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(sine));
  const sun = 0.2126 * sunRadiance.r + 0.7152 * sunRadiance.g + 0.0722 * sunRadiance.b;
  return Math.max(0.1 * horizontal, horizontal - sun * sine);
}

/**
 * The light the whitewater sheet under a foam ball gets, which it bounces up onto the ball's underside: the sky's and the
 * sun's horizontal share, times the foam's reflectance (`FOAM_BALL.bounce`).
 */
export function groundIrradiance(sky: number, sunHeight: number, sunRadiance: { r: number; g: number; b: number }): number {
  const sun = 0.2126 * sunRadiance.r + 0.7152 * sunRadiance.g + 0.0722 * sunRadiance.b;
  return FOAM_BALL.bounce * (sky + sun * Math.max(0, sunHeight));
}

const vertexShader = /* glsl */ `
attribute vec2 look;
uniform float pixelsPerMetre;
varying float vOpacity;

void main() {
  vec4 view = modelViewMatrix * vec4( position, 1.0 );
  gl_Position = projectionMatrix * view;
  gl_PointSize = max( 1.0, look.x * pixelsPerMetre / max( 0.1, -view.z ) );
  vOpacity = look.y;
}
`;

const fragmentShader = /* glsl */ `
uniform vec3 sprayColor;
varying float vOpacity;

void main() {
  // A soft round drop cluster: opaque in the middle, fading to its rim.
  float r = length( gl_PointCoord - 0.5 ) * 2.0;
  if ( r > 1.0 ) discard;
  gl_FragColor = vec4( sprayColor, vOpacity * ( 1.0 - r * r ) );
}
`;

/**
 * Draws a `SprayCloud` (or a snapshot of one) as soft points sized in metres,
 * fading with age. A closing tube's whitewater (kinds 2–4, G9: the foam ball,
 * the spit's and eruption's spray and mist) is Rich only: Classic draws the
 * spray and mist as it always has.
 */
export class SprayPoints {
  readonly mesh: Points<BufferGeometry, ShaderMaterial>;
  private readonly positions: BufferAttribute;
  private readonly looks: BufferAttribute;
  private readonly kinds: BufferAttribute;
  private readonly velocities: BufferAttribute;
  private readonly depths: BufferAttribute;
  private readonly buffer = new Vector2();
  private currentLook: WaterLook = 'classic';

  constructor(readonly capacity = SPRAY_CAPACITY + WHITEWATER_CAPACITY) {
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
    this.looks = new BufferAttribute(new Float32Array(capacity * 2), 2);
    this.kinds = new BufferAttribute(new Float32Array(capacity), 1);
    // Rich only: the particle's velocity (its streak) and its cluster's optical depth.
    this.velocities = new BufferAttribute(new Float32Array(capacity * 3), 3);
    this.depths = new BufferAttribute(new Float32Array(capacity), 1);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('look', this.looks);
    geometry.setAttribute('kind', this.kinds);
    geometry.setAttribute('velocity', this.velocities);
    geometry.setAttribute('tau', this.depths);
    geometry.setDrawRange(0, 0);
    const material = new ShaderMaterial({
      uniforms: {
        pixelsPerMetre: { value: 500 },
        sprayColor: { value: [0.94, 0.97, 1] },
        // Rich only: the sun for the mist, and the water's height (shared with the water by `useWater`).
        spraySunDirection: { value: new Vector3(0, 1, 0) },
        spraySunRadiance: { value: new Color(1, 1, 1) },
        spraySkyIrradiance: { value: REFERENCE_LIGHT },
        sprayGroundIrradiance: { value: FOAM_BALL.bounce * REFERENCE_LIGHT },
        waterSurface: { value: null },
        waterGrid: { value: new Vector4() },
        waterGridSize: { value: new Vector2() },
        // G9: the water's flying tubes, so the spray fades at the carved surface.
        waterTubeMap: { value: null },
        waterTubeColumns: { value: null },
        waterTubeColumn0: { value: 0 },
        waterTubeColumnWidth: { value: 1 },
        waterTubeCount: { value: 0 },
        // G9: the Rich foam ball is a ball of the churned whitewater.
        waterChurnMap: { value: churnTexture() },
      },
      vertexShader,
      fragmentShader,
      transparent: true,
      depthWrite: false,
      blending: NormalBlending,
    });
    this.mesh = new Points(geometry, material);
    this.mesh.frustumCulled = false;
    // Points are sized in metres: the screen's pixels per metre at unit distance come from the camera and viewport.
    this.mesh.onBeforeRender = (renderer, _scene, camera) => {
      const height = renderer.getDrawingBufferSize(this.buffer).y;
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
      material.uniforms.pixelsPerMetre.value = height / (2 * Math.tan((fov * Math.PI) / 360));
    };
  }

  /** Graphics setting (G8): the Classic spray, or the Rich look. */
  setLook(look: WaterLook): void {
    if (look === this.currentLook) return;
    this.currentLook = look;
    const { material } = this.mesh;
    material.vertexShader = look === 'rich' ? richSprayVertex : vertexShader;
    material.fragmentShader = look === 'rich' ? richSprayFragment : fragmentShader;
    // The Rich spray adds the light it scatters and hides only part of what is behind it: it blends as premultiplied light.
    material.premultipliedAlpha = look === 'rich';
    material.needsUpdate = true;
  }

  /** The Rich spray fades into the water: read its height from the water's own uniforms. */
  useWater(uniforms: { waterSurface: { value: unknown }; waterGrid: { value: unknown }; waterGridSize: { value: unknown } }): void {
    const target = this.mesh.material.uniforms;
    const source = uniforms as unknown as Record<string, { value: unknown } | undefined>;
    for (const name of ['waterSurface', 'waterGrid', 'waterGridSize', 'waterTubeMap', 'waterTubeColumns', 'waterTubeColumn0', 'waterTubeColumnWidth', 'waterTubeCount']) {
      const shared = source[name];
      if (shared) target[name] = shared;
    }
  }

  /** The Rich mist glows toward the sun, and the foam ball is lit by it and by the sky it leaves (`skyIrradiance`). */
  setSun(direction: Vector3, radiance: Color): void {
    const { uniforms } = this.mesh.material;
    const toSun = (uniforms.spraySunDirection.value as Vector3).copy(direction).normalize();
    (uniforms.spraySunRadiance.value as Color).copy(radiance);
    const sky = skyIrradiance(toSun.y, radiance);
    uniforms.spraySkyIrradiance.value = sky;
    uniforms.sprayGroundIrradiance.value = groundIrradiance(sky, toSun.y, radiance);
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  update(spray: RenderableSpray): void {
    const positions = this.positions.array as Float32Array;
    const looks = this.looks.array as Float32Array;
    const kinds = this.kinds.array as Float32Array;
    const velocities = this.velocities.array as Float32Array;
    const depths = this.depths.array as Float32Array;
    const rich = this.currentLook === 'rich';
    let drawn = 0;
    for (let k = 0; k < spray.count && drawn < this.capacity; k += 1) {
      const o = k * SPRAY_STRIDE;
      const kind = spray.particles[o + 5];
      if (kind >= 2 && !rich) continue;
      positions[drawn * 3] = spray.particles[o];
      positions[drawn * 3 + 1] = spray.particles[o + 1];
      positions[drawn * 3 + 2] = spray.particles[o + 2];
      looks[drawn * 2] = spray.particles[o + 3];
      looks[drawn * 2 + 1] = spray.particles[o + 4];
      kinds[drawn] = kind;
      // Kept current in both looks, so a switch to Rich draws at once, before the next snapshot.
      velocities[drawn * 3] = spray.particles[o + 6];
      velocities[drawn * 3 + 1] = spray.particles[o + 7];
      velocities[drawn * 3 + 2] = spray.particles[o + 8];
      depths[drawn] = spray.particles[o + 9];
      drawn += 1;
    }
    this.positions.needsUpdate = true;
    this.looks.needsUpdate = true;
    this.kinds.needsUpdate = true;
    this.velocities.needsUpdate = true;
    this.depths.needsUpdate = true;
    this.mesh.geometry.setDrawRange(0, drawn);
  }
}
