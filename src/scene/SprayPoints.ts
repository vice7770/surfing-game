import {
  BufferAttribute, BufferGeometry, Color, CubeUVReflectionMapping, Euler, Matrix3, Matrix4, NormalBlending, PerspectiveCamera, Points, ShaderMaterial,
  Uint16BufferAttribute, Uint32BufferAttribute, Vector2, Vector3, Vector4, type Scene, type Texture,
} from 'three';
import { SPRAY_CAPACITY, SPRAY_STRIDE, WHITEWATER_CAPACITY } from '../wave/SprayCloud';
import { REFERENCE_LIGHT } from './PhotoSky';
import { churnTexture } from './water/churnTexture';
import { FOAM_BALL } from './water/mist';
import { richSprayFragment, richSprayVertex } from './water/richSpray';
import type { WaterLook } from './water/waterLook';

/**
 * What the renderer needs from a spray cloud: packed x, y, z, size, opacity and kind per particle (`SPRAY_STRIDE`), then
 * for the Rich look its streak, optical depth, the optical depth round it, its share of clear water, and the width and
 * opacity it is drawn with; and how many are live.
 */
export interface RenderableSpray {
  readonly particles: Float32Array;
  readonly count: number;
}

/**
 * The sky's irradiance on a level surface, in the scene's light units, recovered from the sun the scene is lit by:
 * `skyExposure` scales each photographed sky so that the sky plus the sun's level share is
 * REFERENCE_LIGHT × (0.4 + 0.6 √sin h), whatever the photo, so what the sun does not bring is the sky's [its colour
 * taken as neutral, provisional]. The Rich spray takes the sky's own light from its environment map where the scene has
 * one, and this before the photograph loads. The painted sky shown till then is not scaled so, and may leave nothing:
 * the sky then keeps a tenth of the total [provisional].
 */
export function skyIrradiance(sunHeight: number, sunRadiance: { r: number; g: number; b: number }): number {
  const sine = Math.max(0, sunHeight);
  const level = REFERENCE_LIGHT * (0.4 + 0.6 * Math.sqrt(sine));
  return Math.max(0.1 * level, level - (0.2126 * sunRadiance.r + 0.7152 * sunRadiance.g + 0.0722 * sunRadiance.b) * sine);
}

/**
 * The defines that sample a PMREM environment map (CubeUV) at a given size, as three derives them for its own
 * materials (WebGLProgram's `generateCubeUVSize`), or none for anything else.
 */
export function cubeUVDefines(environment: Texture | null | undefined): Record<string, string> | undefined {
  const height = environment && environment.mapping === CubeUVReflectionMapping ? (environment.image as { height?: number } | undefined)?.height : undefined;
  if (!height) return undefined;
  const maxMip = Math.log2(height) - 2;
  return {
    ENVMAP_TYPE_CUBE_UV: '',
    CUBEUV_TEXEL_WIDTH: String(1 / (3 * Math.max(2 ** maxMip, 7 * 16))),
    CUBEUV_TEXEL_HEIGHT: String(1 / height),
    CUBEUV_MAX_MIP: `${maxMip}.0`,
  };
}

/** Draw-order buckets per e-fold of distance from the eye, and the distances they span, m: about 1 % of the distance each. */
const ORDER_BUCKETS = 1024;
const ORDER_NEAR = 0.05;
const ORDER_PER_E = (ORDER_BUCKETS - 1) / Math.log(4000 / ORDER_NEAR);

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
 * spray and mist as it always has. The Rich look draws its sprites from the
 * farthest to the nearest, so the opaque foam balls hide what is behind them
 * and not what is in front, and lights them with the photographed sky.
 */
export class SprayPoints {
  readonly mesh: Points<BufferGeometry, ShaderMaterial>;
  private readonly positions: BufferAttribute;
  private readonly looks: BufferAttribute;
  private readonly kinds: BufferAttribute;
  /** Rich only: the width and opacity a cluster is drawn with (Classic's are `looks`, as they always were). */
  private readonly shapes: BufferAttribute;
  /** Rich only: what a cluster travels while it is drawn, its optical depth, the depth of the spray round it and its clear water. */
  private readonly streaks: BufferAttribute;
  private readonly depths: BufferAttribute;
  private readonly columns: BufferAttribute;
  private readonly glasses: BufferAttribute;
  /** Rich only: the draw order, farthest first. */
  private readonly order: BufferAttribute;
  private readonly buffer = new Vector2();
  private readonly eye = new Vector3();
  private readonly bucketOf: Uint16Array;
  private readonly buckets = new Uint32Array(ORDER_BUCKETS + 1);
  /** The foam balls among the drawn sprites, and their distances from the eye, for their shadows. */
  private readonly balls: number[] = [];
  private readonly ballDistance = new Map<number, number>();
  private environment: Texture | null = null;
  private largestPoint?: number;
  private readonly rotation = new Matrix4();
  private readonly euler = new Euler();
  private drawn = 0;
  private currentLook: WaterLook = 'classic';

  constructor(readonly capacity = SPRAY_CAPACITY + WHITEWATER_CAPACITY) {
    const geometry = new BufferGeometry();
    this.positions = new BufferAttribute(new Float32Array(capacity * 3), 3);
    this.looks = new BufferAttribute(new Float32Array(capacity * 2), 2);
    this.kinds = new BufferAttribute(new Float32Array(capacity), 1);
    this.shapes = new BufferAttribute(new Float32Array(capacity * 2), 2);
    this.streaks = new BufferAttribute(new Float32Array(capacity * 3), 3);
    this.depths = new BufferAttribute(new Float32Array(capacity), 1);
    this.columns = new BufferAttribute(new Float32Array(capacity), 1);
    this.glasses = new BufferAttribute(new Float32Array(capacity), 1);
    this.order = capacity <= 65536 ? new Uint16BufferAttribute(new Uint16Array(capacity), 1) : new Uint32BufferAttribute(new Uint32Array(capacity), 1);
    this.bucketOf = new Uint16Array(capacity);
    geometry.setAttribute('position', this.positions);
    geometry.setAttribute('look', this.looks);
    geometry.setAttribute('kind', this.kinds);
    geometry.setAttribute('shape', this.shapes);
    geometry.setAttribute('streak', this.streaks);
    geometry.setAttribute('tau', this.depths);
    geometry.setAttribute('column', this.columns);
    geometry.setAttribute('glass', this.glasses);
    geometry.setDrawRange(0, 0);
    const material = new ShaderMaterial({
      uniforms: {
        pixelsPerMetre: { value: 500 },
        // Rich only: the drawing buffer's height, px, and the largest point the GPU draws (ALIASED_POINT_SIZE_RANGE).
        screenHeight: { value: 720 },
        maxPointSize: { value: 64 },
        sprayColor: { value: [0.94, 0.97, 1] },
        // Rich only: the sun for the mist, and the water's height (shared with the water by `useWater`).
        spraySunDirection: { value: new Vector3(0, 1, 0) },
        spraySunRadiance: { value: new Color(1, 1, 1) },
        // Rich only: the sky's light, the photographed sky's own when the scene has one (`spraySkyPars`).
        spraySkyIrradiance: { value: REFERENCE_LIGHT },
        sprayEnvironment: { value: null },
        sprayEnvironmentIntensity: { value: 1 },
        sprayEnvironmentRotation: { value: new Matrix3() },
        // Rich only: the foam balls whose shadows a ball's pixels look through (centre and radius each, `ballShadow`).
        sprayBalls: { value: Array.from({ length: FOAM_BALL.shadows }, () => new Vector4()) },
        sprayBallCount: { value: 0 },
        waterSurface: { value: null },
        waterGrid: { value: new Vector4() },
        waterGridSize: { value: new Vector2() },
        // G9: the water's flying tubes, so the spray fades at the carved surface.
        waterTubeMap: { value: null },
        waterTubeColumns: { value: null },
        waterTubeColumn0: { value: 0 },
        waterTubeColumnWidth: { value: 1 },
        waterTubeCount: { value: 0 },
        // G9: the Rich foam ball is a ball of the churned whitewater, of the water's own foam (shared by `useWater`).
        waterChurnMap: { value: churnTexture() },
        waterFoamColor: { value: new Color('#d8f2e9') },
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
    this.mesh.onBeforeRender = (renderer, scene, camera) => {
      const height = renderer.getDrawingBufferSize(this.buffer).y;
      const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
      material.uniforms.pixelsPerMetre.value = height / (2 * Math.tan((fov * Math.PI) / 360));
      if (this.currentLook !== 'rich') return;
      material.uniforms.screenHeight.value = height;
      if (this.largestPoint === undefined) {
        const gl = renderer.getContext();
        this.largestPoint = Number((gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE) as Float32Array | null)?.[1] ?? 64);
      }
      material.uniforms.maxPointSize.value = this.largestPoint;
      // The draw order and the balls' shadows go up with the draw, so they are this camera's.
      const eye = this.mesh.worldToLocal(camera.getWorldPosition(this.eye));
      this.sortFrom(eye);
      this.castShadows(eye);
      if (scene) this.useEnvironment(scene);
    };
  }

  /** Graphics setting (G8): the Classic spray, or the Rich look. */
  setLook(look: WaterLook): void {
    if (look === this.currentLook) return;
    this.currentLook = look;
    const { material, geometry } = this.mesh;
    material.vertexShader = look === 'rich' ? richSprayVertex : vertexShader;
    material.fragmentShader = look === 'rich' ? richSprayFragment : fragmentShader;
    // Classic draws its sprites in the pool's order, with no environment, as it always has.
    geometry.setIndex(look === 'rich' ? this.order : null);
    material.defines = {};
    this.environment = null;
    // The Rich spray adds the light it scatters and hides only part of what is behind it: it blends as premultiplied light.
    material.premultipliedAlpha = look === 'rich';
    material.needsUpdate = true;
    if (look === 'rich') this.sortFrom(undefined);
  }

  /** The Rich spray fades into the water: read its height, and its foam colour, from the water's own uniforms. */
  useWater(uniforms: { waterSurface: { value: unknown }; waterGrid: { value: unknown }; waterGridSize: { value: unknown } }): void {
    const target = this.mesh.material.uniforms;
    const source = uniforms as unknown as Record<string, { value: unknown } | undefined>;
    for (const name of ['waterSurface', 'waterGrid', 'waterGridSize', 'waterTubeMap', 'waterTubeColumns', 'waterTubeColumn0', 'waterTubeColumnWidth', 'waterTubeCount', 'waterFoamColor']) {
      const shared = source[name];
      if (shared) target[name] = shared;
    }
  }

  /** The Rich mist glows toward the sun, and the foam balls are lit by it and by the sky (`skyIrradiance` until the photographed sky is up). */
  setSun(direction: Vector3, radiance: Color): void {
    const { uniforms } = this.mesh.material;
    const toSun = (uniforms.spraySunDirection.value as Vector3).copy(direction).normalize();
    (uniforms.spraySunRadiance.value as Color).copy(radiance);
    uniforms.spraySkyIrradiance.value = skyIrradiance(toSun.y, radiance);
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  update(spray: RenderableSpray): void {
    const positions = this.positions.array as Float32Array;
    const looks = this.looks.array as Float32Array;
    const kinds = this.kinds.array as Float32Array;
    const shapes = this.shapes.array as Float32Array;
    const streaks = this.streaks.array as Float32Array;
    const depths = this.depths.array as Float32Array;
    const columns = this.columns.array as Float32Array;
    const glasses = this.glasses.array as Float32Array;
    const rich = this.currentLook === 'rich';
    const balls = this.balls;
    balls.length = 0;
    let drawn = 0;
    for (let k = 0; k < spray.count && drawn < this.capacity; k += 1) {
      const o = k * SPRAY_STRIDE;
      const kind = spray.particles[o + 5];
      if (kind >= 2 && !rich) continue;
      positions[drawn * 3] = spray.particles[o];
      positions[drawn * 3 + 1] = spray.particles[o + 1];
      positions[drawn * 3 + 2] = spray.particles[o + 2];
      // Classic's size and opacity are the first six floats' in both looks, as they always were; Rich's are appended (`SPRAY_STRIDE`).
      looks[drawn * 2] = spray.particles[o + 3];
      looks[drawn * 2 + 1] = spray.particles[o + 4];
      kinds[drawn] = kind;
      if (kind === 2) balls.push(drawn);
      if (rich) {
        shapes[drawn * 2] = spray.particles[o + 12];
        shapes[drawn * 2 + 1] = spray.particles[o + 13];
        streaks[drawn * 3] = spray.particles[o + 6];
        streaks[drawn * 3 + 1] = spray.particles[o + 7];
        streaks[drawn * 3 + 2] = spray.particles[o + 8];
        depths[drawn] = spray.particles[o + 9];
        columns[drawn] = spray.particles[o + 10];
        glasses[drawn] = spray.particles[o + 11];
      }
      drawn += 1;
    }
    this.drawn = drawn;
    this.positions.needsUpdate = true;
    this.looks.needsUpdate = true;
    this.kinds.needsUpdate = true;
    if (rich) {
      this.shapes.needsUpdate = true;
      this.streaks.needsUpdate = true;
      this.depths.needsUpdate = true;
      this.columns.needsUpdate = true;
      this.glasses.needsUpdate = true;
    }
    this.mesh.geometry.setDrawRange(0, drawn);
    if (rich) this.sortFrom(undefined);
  }

  /**
   * The Rich draw order from `eye`, farthest first, by distance in buckets of about 1 % (a counting sort, so it costs
   * one pass over the sprites); in the pool's order until a camera has drawn it.
   */
  private sortFrom(eye: Vector3 | undefined): void {
    const order = this.order.array as Uint16Array | Uint32Array;
    const n = this.drawn;
    this.order.needsUpdate = true;
    if (!eye) {
      for (let k = 0; k < n; k += 1) order[k] = k;
      return;
    }
    const positions = this.positions.array as Float32Array;
    const { bucketOf, buckets } = this;
    buckets.fill(0);
    for (let k = 0; k < n; k += 1) {
      const d = Math.hypot(positions[3 * k] - eye.x, positions[3 * k + 1] - eye.y, positions[3 * k + 2] - eye.z);
      const bucket = Math.min(ORDER_BUCKETS - 1, Math.floor(ORDER_PER_E * Math.log(Math.max(d, ORDER_NEAR) / ORDER_NEAR)));
      bucketOf[k] = bucket;
      buckets[bucket] += 1;
    }
    // Farthest bucket first: each bucket's first place is the count of everything beyond it.
    let start = 0;
    for (let bucket = ORDER_BUCKETS - 1; bucket >= 0; bucket -= 1) {
      const count = buckets[bucket];
      buckets[bucket] = start;
      start += count;
    }
    for (let k = 0; k < n; k += 1) order[buckets[bucketOf[k]]++] = k;
  }

  /** The foam balls whose shadows the balls' pixels look through (`ballShadow`): all of them, or the nearest the eye if there are more than it takes. */
  private castShadows(eye: Vector3): void {
    const positions = this.positions.array as Float32Array;
    const looks = this.looks.array as Float32Array;
    let balls = this.balls;
    if (balls.length > FOAM_BALL.shadows) {
      const distance = this.ballDistance;
      distance.clear();
      for (const k of balls) distance.set(k, Math.hypot(positions[3 * k] - eye.x, positions[3 * k + 1] - eye.y, positions[3 * k + 2] - eye.z));
      balls = [...balls].sort((a, b) => distance.get(a)! - distance.get(b)!).slice(0, FOAM_BALL.shadows);
    }
    const { uniforms } = this.mesh.material;
    const slots = uniforms.sprayBalls.value as Vector4[];
    balls.forEach((k, j) => slots[j].set(positions[3 * k], positions[3 * k + 1], positions[3 * k + 2], looks[2 * k] / 2));
    uniforms.sprayBallCount.value = balls.length;
    this.mesh.material.uniformsNeedUpdate = true;
  }

  /** The scene's photographed sky, to light the Rich spray as the water is (`spraySkyPars`). */
  private useEnvironment(scene: Scene): void {
    const { material } = this.mesh;
    const environment = scene.environment ?? null;
    if (environment !== this.environment) {
      this.environment = environment;
      material.defines = cubeUVDefines(environment) ?? {};
      material.uniforms.sprayEnvironment.value = material.defines.ENVMAP_TYPE_CUBE_UV === undefined ? null : environment;
      material.needsUpdate = true;
    }
    material.uniforms.sprayEnvironmentIntensity.value = scene.environmentIntensity;
    // As three turns a PMREM environment for its own materials (WebGLMaterials): the rotation's transpose.
    (material.uniforms.sprayEnvironmentRotation.value as Matrix3).setFromMatrix4(this.rotation.makeRotationFromEuler(this.euler.copy(scene.environmentRotation))).transpose();
  }
}
