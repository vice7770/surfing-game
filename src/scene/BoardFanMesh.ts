import {
  BufferAttribute, BufferGeometry, Color, DoubleSide, DynamicDrawUsage, Group, InstancedBufferGeometry, InstancedInterleavedBuffer, InterleavedBufferAttribute, Mesh,
  NormalBlending, PerspectiveCamera, ShaderMaterial, Vector2, Vector3, Vector4, type WebGLRenderer,
} from 'three';
import { BOARD_SHEET_STRIDE, SHEET_AT } from '../physics/boardSpray';
import { FAN, FAN_STRIDE, FanRing, throwFan } from '../wave/boardFan';
import { particleBudget, type ParticleLevel } from '../wave/particleBudget';
import { seededRandom } from '../wave/random';
import { churnTexture, CHURN_TILE } from './water/churnTexture';
import { mistPars } from './water/mist';
import type { WaterLook } from './water/waterLook';
import { waterHeightPars } from './WaterSurface';

/**
 * The boards' spray fan drawn (spray-rework, 2026-10-31; `wave/boardFan.ts` throws it): its drops as thin streaks along
 * their flight (a camera's exposure, `shutter`), its mist as soft puffs that glow when backlit (forward scattering, as the
 * spray's mist), and the white line a turn's rail leaves on the water (`CarveLine`). The GPU flies every drop from its
 * spawn record, so the page writes only the new ones. Rich and Classic share it: Rich lights it with the sun's forward
 * scattering and fades it into the water, Classic draws it plain white.
 */
/** The exposure the streaks are drawn over, s (the 180° shutter at 30 fps; the advisor). */
const SHUTTER = 1 / 60;
/** Streaks are at least this many pixels wide, fading by their real width's share of it rather than shrinking, and at most this. */
const MIN_WIDTH_PX = 1.25;
const MAX_WIDTH_PX = 24;

const fanPars = /* glsl */ `
attribute vec2 corner;
attribute vec4 birth;
attribute vec4 launch;
attribute vec4 look;
uniform float fanTime;
uniform float fanWind;
uniform vec2 fanResolution;
uniform float pixelsPerMetre;
uniform vec3 spraySunDirection;
uniform vec3 spraySunRadiance;
uniform float fanRich;
${waterHeightPars}
${mistPars}
// Where the record's drop is \`age\` s on (its velocity into \`velocity\`): dragged toward its terminal velocity with time
// constant launch.w (the wind along +z, g τ down) — \`fanPosition\` in boardFan.ts.
vec3 fanAt( float age, out vec3 velocity ) {
  float tau = launch.w;
  float e = exp( -age / tau );
  vec3 terminal = vec3( 0.0, -9.81 * tau, fanWind );
  velocity = terminal + ( launch.xyz - terminal ) * e;
  return birth.xyz + terminal * age + ( launch.xyz - terminal ) * tau * ( 1.0 - e );
}
`;

const streakVertex = /* glsl */ `
${fanPars}
uniform float fanShutter;
varying float vAlpha;
varying vec2 vCorner;
varying vec3 vLight;
varying float vWidthPx;
varying float vSeed;

void main() {
  float age = fanTime - birth.w;
  vCorner = corner;
  vWidthPx = 1.0;
  vSeed = 0.0;
  if ( age < 0.0 || age > look.z ) {
    gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
    vAlpha = 0.0;
    vLight = vec3( 0.0 );
    return;
  }
  vec3 velocity;
  vec3 p = fanAt( age, velocity );
  // The streak: where the drop was over the exposure, head to tail, on the screen.
  vec4 head = projectionMatrix * viewMatrix * vec4( p, 1.0 );
  vec4 tail = projectionMatrix * viewMatrix * vec4( p - velocity * fanShutter, 1.0 );
  if ( head.w < 0.05 || tail.w < 0.05 ) {
    gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
    vAlpha = 0.0;
    vLight = vec3( 0.0 );
    return;
  }
  vec2 halfRes = fanResolution * 0.5;
  vec2 hs = head.xy / head.w * halfRes;
  vec2 ts = tail.xy / tail.w * halfRes;
  vec2 d = hs - ts;
  float len = length( d );
  vec2 dir = len > 1e-3 ? d / len : vec2( 0.0, 1.0 );
  vec2 side = vec2( -dir.y, dir.x );
  // The bundle of drops the streak stands for, spreading as they disperse (0.15 U a second either side, and along its
  // flight as their paces differ), drawn at most
  // FAN.widest wide; its opacity its optical depth over the area it covers, τ = 1.5 m / (ρ A r).
  float speed = length( launch.xyz );
  float bundle = ${FAN.bundle.toFixed(3)} + ${(2 * FAN.disperse).toFixed(2)} * speed * age;
  float drawn = min( ${FAN.widest.toFixed(2)}, bundle );
  // Along its flight it spreads too: its drops left a fifth faster or slower than it (\`throwFan\`'s pace).
  float along = max( ${FAN.bundle.toFixed(3)}, length( velocity ) * fanShutter ) + ${FAN.paceSpread.toFixed(2)} * speed * age;
  float depthOptical = 1.5 * look.y / ( 1025.0 * bundle * along * max( 1e-5, look.x * 0.5 ) );
  float px = drawn * pixelsPerMetre / max( 0.1, head.w );
  // At most MAX_WIDTH_PX wide on the screen (a bundle passing the lens is a blur, not a sheet of hairlines).
  float width = clamp( px, ${MIN_WIDTH_PX.toFixed(2)}, ${MAX_WIDTH_PX.toFixed(1)} );
  vec4 base = corner.y > 0.5 ? head : tail;
  base.xy += ( side * corner.x * width * 0.5 + dir * ( corner.y > 0.5 ? 0.5 : -0.5 ) * min( width, 6.0 ) ) / halfRes * base.w;
  gl_Position = base;
  vWidthPx = width;
  vSeed = look.w;
  // Thin bundles fade rather than shrink below a pixel or so; it fades in as it leaves and out as it falls in.
  float lifeShare = age / look.z;
  float fade = smoothstep( 0.0, 0.02, age ) * ( 1.0 - smoothstep( 0.85, 1.0, lifeShare ) );
  // Drops passing within a couple of metres of the camera fade out rather than fill the view.
  vAlpha = ( 1.0 - exp( -depthOptical ) ) * min( 1.0, px / width ) * fade * smoothstep( 0.6, 2.0, head.w );
  if ( fanRich > 0.5 ) {
    vAlpha *= smoothstep( -0.05, 0.08, p.y - waterHeightAt( p.xz ) );
    // Drops scatter the sun on toward the eye when backlit (a milder lobe than the mist's).
    float phase = 12.566370614 * henyeyGreenstein( dot( normalize( p - cameraPosition ), spraySunDirection ), 0.5 ) * 0.25;
    vLight = 0.45 + spraySunRadiance * ( 0.3 + 0.45 * phase );
  } else {
    vLight = vec3( 0.95 );
  }
}
`;

const streakFragment = /* glsl */ `
uniform vec3 sprayColor;
varying float vAlpha;
varying vec2 vCorner;
varying vec3 vLight;
varying float vWidthPx;
varying float vSeed;

void main() {
  float across = 1.0 - vCorner.x * vCorner.x;
  // A wide bundle is drawn as hairlines (its drops' streaks), about 3 px apart, keeping its mean cover; a dense one solid.
  float hairs = clamp( vWidthPx / 4.0, 1.0, 6.0 );
  float lane = fract( ( vCorner.x * 0.5 + 0.5 ) * hairs + vSeed * 7.13 );
  float hair = 1.0 - smoothstep( 0.18, 0.32, abs( lane - 0.5 ) );
  float hairy = hairs > 1.5 ? mix( hair * min( 1.0, vAlpha / 0.4 ), vAlpha, smoothstep( 0.5, 0.9, vAlpha ) ) : vAlpha;
  float alpha = hairy * across * mix( 0.45, 1.0, vCorner.y );
  if ( alpha < 0.004 ) discard;
  gl_FragColor = vec4( sprayColor * vLight, alpha );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

const mistVertex = /* glsl */ `
${fanPars}
varying float vAlpha;
varying vec2 vCorner;
varying vec3 vLight;

void main() {
  float age = fanTime - birth.w;
  vCorner = vec2( corner.x, corner.y * 2.0 - 1.0 );
  if ( age < 0.0 || age > look.z ) {
    gl_Position = vec4( 0.0, 0.0, 2.0, 1.0 );
    vAlpha = 0.0;
    vLight = vec3( 0.0 );
    return;
  }
  vec3 velocity;
  vec3 p = fanAt( age, velocity );
  float share = age / look.z;
  float size = look.x + ( ${FAN.mistGrown.toFixed(2)} - look.x ) * sqrt( share );
  vec4 view = viewMatrix * vec4( p, 1.0 );
  view.xy += vCorner * size * 0.5;
  gl_Position = projectionMatrix * view;
  // Its optical depth over its disc, τ = 1.5 m / (ρ A r): thinning as it spreads; fading in as it forms and out at its end.
  float depthOptical = 1.5 * look.y / ( 1025.0 * 0.7854 * size * size * ${FAN.mistRadius.toExponential(2)} );
  vAlpha = ( 1.0 - exp( -depthOptical ) ) * smoothstep( 0.0, 0.1, share ) * ( 1.0 - smoothstep( 0.6, 1.0, share ) );
  if ( fanRich > 0.5 ) {
    vAlpha *= smoothstep( -0.1, 0.25, p.y - waterHeightAt( p.xz ) );
    // Water drops' forward scattering (g 0.86; the advisor): the mist glows when backlit.
    float phase = 12.566370614 * henyeyGreenstein( dot( normalize( p - cameraPosition ), spraySunDirection ), 0.86 ) * 0.25;
    vLight = 0.35 + spraySunRadiance * min( 4.0, phase ) * 0.5;
    // Dim mist thins out rather than greying.
    float bright = min( 1.0, max( vLight.r, max( vLight.g, vLight.b ) ) );
    vAlpha *= bright;
    vLight /= max( 0.2, bright );
  } else {
    vLight = vec3( 0.95 );
  }
}
`;

const mistFragment = /* glsl */ `
uniform vec3 sprayColor;
varying float vAlpha;
varying vec2 vCorner;
varying vec3 vLight;

void main() {
  float r = length( vec2( vCorner.x, vCorner.y ) );
  if ( r > 1.0 ) discard;
  float alpha = vAlpha * ( 1.0 - r ) * ( 1.0 - r );
  if ( alpha < 0.003 ) discard;
  gl_FragColor = vec4( sprayColor * vLight, alpha );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

/**
 * The white line a turn's rail leaves on the water (spray-rework): the water it cut and churned, aerated, along the rail's
 * wetted path behind the board, fading over `CARVE_LINE.life` s. Drawn only, as a ribbon laid on the water's surface
 * (its height read each frame); the water itself is untouched.
 */
export const CARVE_LINE = {
  /** Its lace is gone this long after, s (the dense white goes first: `dense`). */
  life: 8,
  /** A new point once the rail has run this far, m. */
  spacing: 0.25,
  /** No line under this much water thrown, kg/s. */
  least: 4,
  /**
   * Its strength is the water thrown a metre of path, ṁ / V (kg/m; the air the turn entrains follows the energy it
   * spends, Blenkinsopp & Chaplin 2007), full at `perMetre`: 7–14 kg/m in a hard carve, under 1 in trim.
   */
  perMetre: 10,
  /** Its width, the wetted width across the stations that throw: from `min` to `max` m with its strength, doubling as it ages. */
  width: { min: 0.3, max: 0.5 },
  /**
   * Dense white while its bubbles rise from the rail's depth (D / 0.25 m/s: 0.4–1 s, longer the harder the turn), then
   * a lace at `lace` of it to the end (the advisor; lace lasts tens of seconds on the sea).
   */
  dense: { min: 0.4, max: 1 },
  lace: 0.15,
  /** Points kept per board side. */
  points: 256,
  /** It lies this far over the surface, m. */
  lift: 0.03,
} as const;

const lineVertex = /* glsl */ `
attribute vec3 line;
varying vec3 vLine;
varying vec3 vWorld;
void main() {
  vLine = line;
  vec4 world = modelMatrix * vec4( position, 1.0 );
  vWorld = world.xyz;
  gl_Position = projectionMatrix * viewMatrix * world;
}
`;

const lineFragment = /* glsl */ `
uniform vec3 sprayColor;
uniform vec3 spraySunRadiance;
uniform sampler2D waterChurnMap;
uniform float fanRich;
const float CHURN_TILE = ${CHURN_TILE.toFixed(3)};
varying vec3 vLine;
varying vec3 vWorld;
void main() {
  // vLine: across (−1 to 1), age (s), strength (0–1).
  float across = abs( vLine.x );
  float age = vLine.y;
  vec2 churn = texture( waterChurnMap, vWorld.xz / ( CHURN_TILE * 0.35 ) ).rg;
  // Dense white while its bubbles rise, then a lace that thins out to the end.
  float dense = ${CARVE_LINE.dense.min.toFixed(2)} + ${(CARVE_LINE.dense.max - CARVE_LINE.dense.min).toFixed(2)} * vLine.z;
  float rising = 1.0 - smoothstep( 0.6 * dense, 1.4 * dense, age );
  float lace = smoothstep( 0.4 - 0.2 * rising + 0.35 * across, 0.8, churn.x + 0.15 * churn.y );
  float cover = mix( ${CARVE_LINE.lace.toFixed(2)} * lace * 2.0, mix( lace, 1.0, 0.35 ), rising );
  float alpha = min( 1.0, vLine.z * 1.2 ) * ( 1.0 - smoothstep( 0.55, 1.0, across ) ) * cover
    * ( 1.0 - smoothstep( ${(CARVE_LINE.life * 0.6).toFixed(1)}, ${CARVE_LINE.life.toFixed(1)}, age ) ) * smoothstep( 0.0, 0.08, age );
  if ( alpha < 0.01 ) discard;
  vec3 light = fanRich > 0.5 ? 0.55 + spraySunRadiance * 0.45 : vec3( 0.95 );
  gl_FragColor = vec4( sprayColor * light * ( 0.85 + 0.15 * churn.y ), alpha );
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
}
`;

interface LinePoint { x: number; z: number; t: number; width: number; strength: number }

/** Each board side's line: its points, oldest first. */
class CarveLine {
  readonly points: LinePoint[] = [];
  last = 0;
}

export class BoardFanMesh {
  readonly group = new Group();
  readonly streaks: FanRing;
  readonly mistRing: FanRing;
  private readonly streakMesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly mistMesh: Mesh<InstancedBufferGeometry, ShaderMaterial>;
  private readonly lineMesh: Mesh<BufferGeometry, ShaderMaterial>;
  private readonly uniforms: Record<string, { value: unknown }>;
  private readonly random = seededRandom(1, 0xfa4);
  private readonly lines = new Map<string, CarveLine>();
  private readonly linePositions: Float32Array;
  private readonly lineData: Float32Array;
  private readonly size = new Vector2();
  private lastTime = Number.NaN;
  private share = 1;
  private pool = 1;
  private currentLook: WaterLook = 'classic';
  /** Drops thrown so far (the dev tools' count). */
  thrown = 0;

  constructor(private readonly capacity = FAN.pool, private readonly mistCapacity = FAN.mistPool) {
    this.streaks = new FanRing(capacity);
    this.mistRing = new FanRing(mistCapacity);
    this.uniforms = {
      fanTime: { value: 0 },
      fanWind: { value: 0 },
      fanShutter: { value: SHUTTER },
      fanResolution: { value: new Vector2(1280, 720) },
      fanRich: { value: 0 },
      pixelsPerMetre: { value: 500 },
      sprayColor: { value: new Color(0.94, 0.97, 1) },
      spraySunDirection: { value: new Vector3(0, 1, 0) },
      spraySunRadiance: { value: new Color(1, 1, 1) },
      waterSurface: { value: null },
      waterGrid: { value: new Vector4() },
      waterGridSize: { value: new Vector2() },
      waterChurnMap: { value: churnTexture() },
    };
    this.streakMesh = this.fanMesh(this.streaks, streakVertex, streakFragment);
    this.mistMesh = this.fanMesh(this.mistRing, mistVertex, mistFragment);
    // The carve lines: a strip of quads per side, rebuilt each frame on the water's surface.
    // Room for 8 sides' lines (the player's and three others'), each with its pair of joining copies.
    const lineVertices = 2 * 8 * (CARVE_LINE.points + 2);
    this.linePositions = new Float32Array(lineVertices * 3);
    this.lineData = new Float32Array(lineVertices * 3);
    const lineGeometry = new BufferGeometry();
    lineGeometry.setAttribute('position', new BufferAttribute(this.linePositions, 3).setUsage(DynamicDrawUsage));
    lineGeometry.setAttribute('line', new BufferAttribute(this.lineData, 3).setUsage(DynamicDrawUsage));
    const indices: number[] = [];
    for (let segment = 0; segment < lineVertices / 2 - 1; segment += 1) {
      const a = segment * 2;
      indices.push(a, a + 1, a + 2, a + 2, a + 1, a + 3);
    }
    lineGeometry.setIndex(indices);
    lineGeometry.setDrawRange(0, 0);
    this.lineMesh = new Mesh(lineGeometry, new ShaderMaterial({
      uniforms: this.uniforms, vertexShader: lineVertex, fragmentShader: lineFragment, transparent: true, depthWrite: false,
      blending: NormalBlending, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2,
    }));
    this.lineMesh.frustumCulled = false;
    this.group.add(this.lineMesh, this.streakMesh, this.mistMesh);
  }

  private fanMesh(ring: FanRing, vertexShader: string, fragmentShader: string): Mesh<InstancedBufferGeometry, ShaderMaterial> {
    const geometry = new InstancedBufferGeometry();
    geometry.setAttribute('corner', new BufferAttribute(new Float32Array([-1, 0, 1, 0, -1, 1, 1, 1]), 2));
    geometry.setIndex([0, 1, 2, 2, 1, 3]);
    const buffer = new InstancedInterleavedBuffer(ring.data, FAN_STRIDE).setUsage(DynamicDrawUsage);
    geometry.setAttribute('birth', new InterleavedBufferAttribute(buffer, 4, 0));
    geometry.setAttribute('launch', new InterleavedBufferAttribute(buffer, 4, 4));
    geometry.setAttribute('look', new InterleavedBufferAttribute(buffer, 4, 8));
    geometry.instanceCount = ring.capacity;
    // Both faces: a streak's quad turns whichever way its flight runs across the screen.
    const material = new ShaderMaterial({
      uniforms: this.uniforms, vertexShader, fragmentShader, transparent: true, depthWrite: false, blending: NormalBlending, side: DoubleSide,
    });
    const mesh = new Mesh(geometry, material);
    mesh.frustumCulled = false;
    // The records written since the last draw go up just before it (a sea stepped several times between draws keeps them all).
    mesh.onBeforeRender = (renderer: WebGLRenderer, _scene, camera) => {
      this.measure(renderer, camera);
      this.upload(ring, buffer);
    };
    return mesh;
  }

  private measure(renderer: WebGLRenderer, camera: unknown): void {
    renderer.getDrawingBufferSize(this.size);
    (this.uniforms.fanResolution.value as Vector2).copy(this.size);
    const fov = camera instanceof PerspectiveCamera ? camera.fov : 50;
    this.uniforms.pixelsPerMetre.value = this.size.y / (2 * Math.tan((fov * Math.PI) / 360));
  }

  setLook(look: WaterLook): void {
    this.currentLook = look;
    this.uniforms.fanRich.value = look === 'rich' ? 1 : 0;
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  setSun(direction: Vector3, radiance: Color): void {
    (this.uniforms.spraySunDirection.value as Vector3).copy(direction).normalize();
    (this.uniforms.spraySunRadiance.value as Color).copy(radiance);
  }

  /** The Particles setting: the share of drops thrown and of the pools drawn. */
  setLevel(level: ParticleLevel): void {
    const budget = particleBudget(level);
    this.share = budget.spawn;
    this.pool = budget.pool;
    this.streaks.setLimit(Math.max(1, Math.floor(this.capacity * this.pool)));
    this.mistRing.setLimit(Math.max(1, Math.floor(this.mistCapacity * this.pool)));
    this.streakMesh.geometry.instanceCount = this.streaks.limit;
    this.mistMesh.geometry.instanceCount = this.mistRing.limit;
  }

  /** The fan fades into the water: its height from the water's own uniforms (as `SprayPoints.useWater`). */
  useWater(uniforms: { waterSurface: { value: unknown }; waterGrid: { value: unknown }; waterGridSize: { value: unknown } }): void {
    this.uniforms.waterSurface = uniforms.waterSurface;
    this.uniforms.waterGrid = uniforms.waterGrid;
    this.uniforms.waterGridSize = uniforms.waterGridSize;
  }

  /**
   * This frame at sea time `now`: the drops the sheets threw since the last frame (`sheets`, `count` of them packed, the
   * player's; `others`, other players'), the GPU's clock, and the carve lines. `surfaceAt` is the water's height.
   */
  update(
    now: number, sheets: ArrayLike<number>, count: number, others: ArrayLike<number> | undefined, surfaceAt: (x: number, z: number) => number,
    wind = 0, offset?: { x: number; y: number; z: number },
  ): void {
    let dt = now - this.lastTime;
    if (!(dt >= 0) || dt > 1) {
      // A new sea or time run back: start over.
      if (!(dt >= 0)) this.clear();
      dt = 0;
    }
    this.lastTime = now;
    this.uniforms.fanTime.value = now;
    this.uniforms.fanWind.value = wind;
    if (dt > 0) {
      // The pools' share: throw into the front of each ring only (`instanceCount` draws that much).
      this.thrown += throwFan(sheets, count, now, dt, this.share, this.random, surfaceAt, wind, this.streaks, this.mistRing, offset);
      if (others && others.length) {
        this.thrown += throwFan(others, others.length / BOARD_SHEET_STRIDE, now, dt, this.share, this.random, surfaceAt, wind, this.streaks, this.mistRing);
      }
    }
    this.trace(now, sheets, count, others);
    this.layLines(now, surfaceAt);
  }

  private upload(ring: FanRing, buffer: InstancedInterleavedBuffer): void {
    if (ring.dirtyCount === 0) return;
    buffer.clearUpdateRanges();
    const first = Math.min(ring.dirtyCount, ring.limit - ring.dirtyFrom);
    buffer.addUpdateRange(ring.dirtyFrom * FAN_STRIDE, first * FAN_STRIDE);
    if (ring.dirtyCount > first) buffer.addUpdateRange(0, (ring.dirtyCount - first) * FAN_STRIDE);
    buffer.needsUpdate = true;
    ring.dirtyCount = 0;
  }

  /** Each side's line takes a point where its rail has run on far enough. */
  private trace(now: number, sheets: ArrayLike<number>, count: number, others?: ArrayLike<number>): void {
    const visit = (packed: ArrayLike<number>, n: number) => {
      const o = n * BOARD_SHEET_STRIDE;
      const flux = packed[o + SHEET_AT.flux];
      if (!(flux >= CARVE_LINE.least)) return;
      const key = `${packed[o + SHEET_AT.source]}:${packed[o + SHEET_AT.side]}`;
      let line = this.lines.get(key);
      if (!line) this.lines.set(key, (line = new CarveLine()));
      // Its aftmost exit: where the rail cut through the water last.
      const x = packed[o + SHEET_AT.x];
      const z = packed[o + SHEET_AT.z];
      const last = line.points[line.points.length - 1];
      if (last && Math.hypot(x - last.x, z - last.z) < CARVE_LINE.spacing && now - last.t < 0.25) return;
      const speed = Math.hypot(packed[o + SHEET_AT.boardX], packed[o + SHEET_AT.boardZ]);
      const strength = Math.min(1, flux / Math.max(1, speed) / CARVE_LINE.perMetre);
      const width = CARVE_LINE.width.min + (CARVE_LINE.width.max - CARVE_LINE.width.min) * strength;
      line.points.push({ x, z, t: now, width, strength });
      if (line.points.length > CARVE_LINE.points) line.points.shift();
      line.last = now;
    };
    for (let n = 0; n < count; n += 1) visit(sheets, n);
    if (others) for (let n = 0; n + 1 <= others.length / BOARD_SHEET_STRIDE; n += 1) visit(others, n);
  }

  /**
   * The lines as ribbons on the water now: a pair of vertices a point, across its path, one strip for all of them (each
   * line joined to the next by a pair of invisible copies).
   */
  private layLines(now: number, surfaceAt: (x: number, z: number) => number): void {
    let pairs = 0;
    const room = this.linePositions.length / 6;
    const pair = (x: number, y: number, z: number, tx: number, tz: number, half: number, age: number, strength: number) => {
      for (const sideSign of [-1, 1]) {
        const v = pairs * 2 + (sideSign > 0 ? 1 : 0);
        this.linePositions[v * 3] = x - tz * half * sideSign;
        this.linePositions[v * 3 + 1] = y;
        this.linePositions[v * 3 + 2] = z + tx * half * sideSign;
        this.lineData[v * 3] = sideSign;
        this.lineData[v * 3 + 1] = age;
        this.lineData[v * 3 + 2] = strength;
      }
      pairs += 1;
    };
    let previous: { x: number; y: number; z: number } | undefined;
    for (const [key, line] of this.lines) {
      while (line.points.length && now - line.points[0].t > CARVE_LINE.life) line.points.shift();
      if (line.points.length < 2) {
        if (!line.points.length && now - line.last > CARVE_LINE.life) this.lines.delete(key);
        continue;
      }
      if (pairs + line.points.length + 2 > room) break;
      const first = line.points[0];
      const firstY = surfaceAt(first.x, first.z) + CARVE_LINE.lift;
      if (previous) {
        // Invisible copies: the last line's end, then this one's start.
        pair(previous.x, previous.y, previous.z, 1, 0, 0, CARVE_LINE.life, 0);
        pair(first.x, firstY, first.z, 1, 0, 0, CARVE_LINE.life, 0);
      }
      for (let k = 0; k < line.points.length; k += 1) {
        const p = line.points[k];
        const a = line.points[Math.max(0, k - 1)];
        const b = line.points[Math.min(line.points.length - 1, k + 1)];
        let tx = b.x - a.x;
        let tz = b.z - a.z;
        const length = Math.hypot(tx, tz) || 1;
        tx /= length; tz /= length;
        const y = k === 0 ? firstY : surfaceAt(p.x, p.z) + CARVE_LINE.lift;
        const age = now - p.t;
        // Spreading to twice its width as it ages, as churned water does.
        pair(p.x, y, p.z, tx, tz, p.width * 0.5 * (1 + age / CARVE_LINE.life), age, p.strength);
        previous = { x: p.x, y, z: p.z };
      }
    }
    const geometry = this.lineMesh.geometry;
    geometry.setDrawRange(0, Math.max(0, (pairs - 1) * 6));
    for (const name of ['position', 'line']) {
      const attribute = geometry.getAttribute(name) as BufferAttribute;
      attribute.clearUpdateRanges();
      if (pairs > 0) {
        attribute.addUpdateRange(0, pairs * 6);
        attribute.needsUpdate = true;
      }
    }
  }

  /** Drops in flight now (the dev tools' count; walks the pools). */
  live(now = this.lastTime): { streaks: number; mist: number } {
    const count = (ring: FanRing, drawn: number) => {
      let live = 0;
      for (let k = 0; k < drawn; k += 1) {
        const o = k * FAN_STRIDE;
        const age = now - ring.data[o + 3];
        if (age >= 0 && age <= ring.data[o + 10]) live += 1;
      }
      return live;
    };
    return { streaks: count(this.streaks, this.streakMesh.geometry.instanceCount), mist: count(this.mistRing, this.mistMesh.geometry.instanceCount) };
  }

  /** Forget every drop and line (a new sea). */
  clear(): void {
    this.streaks.clear();
    this.mistRing.clear();
    this.lines.clear();
    this.lastTime = Number.NaN;
  }

  dispose(): void {
    for (const mesh of [this.streakMesh, this.mistMesh, this.lineMesh]) {
      mesh.geometry.dispose();
      mesh.material.dispose();
    }
  }
}
