import {
  AdditiveBlending, Camera, Color, DoubleSide, HalfFloatType, Mesh, NoToneMapping, PlaneGeometry, RGBAFormat, Scene, ShaderMaterial, Vector4,
  WebGLRenderTarget, type Texture, type WebGLRenderer,
} from 'three';
import { waterChopPars } from './waterChop';
import { WATER_IOR } from './waterOptics';

/**
 * The map covers a square of CAUSTIC_WINDOW metres around the view, refracted through
 * VERTICES × VERTICES rays into TARGET × TARGET pixels: fine enough (about
 * 0.13 m) to resolve the wind chop's shortest ripples, which make most of the
 * visible caustics; the solver's own waves are too long to focus in the surf
 * zone's few metres of water. Its light fades out over the outer EDGE share.
 */
export const CAUSTIC_WINDOW = 48;
const VERTICES = 384;
const TARGET = 512;
const EDGE = 0.2;
/** The brightest a fold of rays may paint the bed, relative to flat water. */
export const CAUSTIC_PEAK = 16;

/** Surface uniforms the pass reads: the same objects the water mesh renders from. */
export interface CausticSource {
  waterTime: { value: number };
  waterChop: { value: number };
  waterSurface: { value: Texture };
  waterBed: { value: Texture };
  waterGrid: { value: Vector4 };
  waterGridSize: { value: { x: number; y: number } };
  waterSunDirection: { value: { x: number; y: number; z: number } };
}

/** What a material needs to light its bed with the map: the texture, its world rectangle (x, z, width, length) and strength (0 off). */
export interface CausticUniforms {
  causticMap: { value: Texture | null };
  causticDomain: { value: Vector4 };
  causticStrength: { value: number };
}

export function createCausticUniforms(): CausticUniforms {
  return { causticMap: { value: null }, causticDomain: { value: new Vector4(0, 0, 1, 1) }, causticStrength: { value: 0 } };
}

/** GLSL: relative sunlight on the bed at world `xz` from the caustic map (1 where there is no map). */
export const causticLookupPars = /* glsl */ `
uniform sampler2D causticMap;
uniform vec4 causticDomain;
uniform float causticStrength;

float causticLightAt( vec2 xz ) {
  if ( causticStrength <= 0.0 ) return 1.0;
  vec2 uv = ( xz - causticDomain.xy ) / causticDomain.zw;
  if ( uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0 ) return 1.0;
  vec2 edge = min( uv, 1.0 - uv ) / ${EDGE.toFixed(2)};
  float fade = smoothstep( 0.0, 1.0, min( edge.x, edge.y ) );
  return mix( 1.0, min( texture( causticMap, uv ).r, ${CAUSTIC_PEAK.toFixed(1)} ), causticStrength * fade );
}
`;

const vertexShader = /* glsl */ `
uniform sampler2D waterSurface;
uniform sampler2D waterBed;
uniform vec4 waterGrid;
uniform vec2 waterGridSize;
uniform vec3 waterSunDirection;
uniform vec4 causticDomain;
varying vec2 vFlat;
varying vec2 vLit;
varying float vWet;
${waterChopPars}

// The water mesh's bilinear lookups (WaterSurface.ts).
float heightAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  if ( g.x < 0.0 || g.y < 0.0 || g.x >= waterGridSize.x - 1.0 || g.y >= waterGridSize.y - 1.0 ) return 0.0;
  ivec2 c = ivec2( floor( g ) );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterSurface, c, 0 ).r, texelFetch( waterSurface, c + ivec2( 1, 0 ), 0 ).r, t.x );
  float bottom = mix( texelFetch( waterSurface, c + ivec2( 0, 1 ), 0 ).r, texelFetch( waterSurface, c + ivec2( 1, 1 ), 0 ).r, t.x );
  return mix( top, bottom, t.y );
}

float bedAt( vec2 xz ) {
  vec2 g = clamp( ( xz - waterGrid.xy ) / waterGrid.z, vec2( 0.0 ), waterGridSize - 1.0 );
  ivec2 c = min( ivec2( floor( g ) ), ivec2( waterGridSize ) - 2 );
  vec2 t = g - vec2( c );
  float top = mix( texelFetch( waterBed, c, 0 ).r, texelFetch( waterBed, c + ivec2( 1, 0 ), 0 ).r, t.x );
  float bottom = mix( texelFetch( waterBed, c + ivec2( 0, 1 ), 0 ).r, texelFetch( waterBed, c + ivec2( 1, 1 ), 0 ).r, t.x );
  return mix( top, bottom, t.y );
}

void main() {
  vec2 xz = causticDomain.xy + uv * causticDomain.zw;
  float surface = heightAt( xz );
  float depth = surface - bedAt( xz );
  vec2 stepX = vec2( waterGrid.z, 0.0 );
  vec2 stepZ = vec2( 0.0, waterGrid.z );
  float slopeX = ( heightAt( xz + stepX ) - heightAt( xz - stepX ) ) / ( 2.0 * waterGrid.z );
  float slopeZ = ( heightAt( xz + stepZ ) - heightAt( xz - stepZ ) ) / ( 2.0 * waterGrid.z );
  // The drawn surface's normal: the solver's waves and the shading chop together.
  vec2 chop = waterChop * waterChopSlope( xz, waterTime );
  vec3 normal = normalize( vec3( -slopeX - chop.x, 1.0, -slopeZ - chop.y ) );
  vec3 incident = -normalize( waterSunDirection );
  vec3 ray = refract( incident, normal, ${(1 / WATER_IOR).toFixed(6)} );
  vec3 flatRay = refract( incident, vec3( 0.0, 1.0, 0.0 ), ${(1 / WATER_IOR).toFixed(6)} );
  float below = max( depth, 0.0 );
  // causticMath.bedHit: across the water to the bed below the entry point.
  vLit = xz + ray.xz * ( below / max( 1e-3, -ray.y ) );
  vFlat = xz + flatRay.xz * ( below / max( 1e-3, -flatRay.y ) );
  vWet = depth > 0.02 && incident.y < 0.0 ? 1.0 : 0.0;
  gl_Position = vec4( ( vLit - causticDomain.xy ) / causticDomain.zw * 2.0 - 1.0, 0.0, 1.0 );
}
`;

const fragmentShader = /* glsl */ `
varying vec2 vFlat;
varying vec2 vLit;
varying float vWet;

void main() {
  // A patch's area under flat water over its area now (causticMath.causticProfile), summed by blending.
  vec2 fx = dFdx( vFlat );
  vec2 fy = dFdy( vFlat );
  vec2 lx = dFdx( vLit );
  vec2 ly = dFdy( vLit );
  float flatArea = abs( fx.x * fy.y - fx.y * fy.x );
  float litArea = abs( lx.x * ly.y - lx.y * ly.x );
  gl_FragColor = vec4( vWet * flatArea / max( litArea, flatArea / ${CAUSTIC_PEAK.toFixed(1)} ), 0.0, 0.0, 1.0 );
}
`;

/**
 * Caustics from the real surface (plan §2.5, G5): each frame the drawn
 * surface around the view (the solver's heights and the wind chop's normals)
 * refracts a grid of sun rays onto the seabed into a float map, lit by how
 * much the surface's curvature gathers or spreads them. Water and seabed
 * materials read it through `causticLookupPars`; its strength is 0 when no
 * map is drawn.
 */
export class CausticMap {
  private readonly target = new WebGLRenderTarget(TARGET, TARGET, { type: HalfFloatType, format: RGBAFormat, depthBuffer: false });
  private readonly scene = new Scene();
  private readonly camera = new Camera();
  private readonly mesh: Mesh<PlaneGeometry, ShaderMaterial>;
  private readonly clearColor = new Color();

  constructor(source: CausticSource, readonly uniforms: CausticUniforms = createCausticUniforms()) {
    const material = new ShaderMaterial({
      uniforms: { ...(source as unknown as Record<string, { value: unknown }>), causticDomain: uniforms.causticDomain },
      vertexShader,
      fragmentShader,
      blending: AdditiveBlending,
      // Where rays cross, their patches fold over and face the other way: draw both faces.
      side: DoubleSide,
      depthTest: false,
      depthWrite: false,
      transparent: true,
    });
    this.mesh = new Mesh(new PlaneGeometry(1, 1, VERTICES - 1, VERTICES - 1), material);
    this.mesh.frustumCulled = false;
    this.scene.add(this.mesh);
  }

  /** Draw the map around world point (x, z) for the surface as it stands, and light the readers with it. */
  render(renderer: WebGLRenderer, focusX: number, focusZ: number): void {
    // Snap the window to its pixels so the pattern does not swim as the view moves.
    const pixel = CAUSTIC_WINDOW / TARGET;
    const x = Math.round((focusX - CAUSTIC_WINDOW / 2) / pixel) * pixel;
    const z = Math.round((focusZ - CAUSTIC_WINDOW / 2) / pixel) * pixel;
    this.uniforms.causticDomain.value.set(x, z, CAUSTIC_WINDOW, CAUSTIC_WINDOW);
    const previousTarget = renderer.getRenderTarget();
    const previousTone = renderer.toneMapping;
    renderer.getClearColor(this.clearColor);
    const previousAlpha = renderer.getClearAlpha();
    renderer.toneMapping = NoToneMapping;
    renderer.setRenderTarget(this.target);
    renderer.setClearColor(0x000000, 0);
    renderer.clear(true, false, false);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(previousTarget);
    renderer.setClearColor(this.clearColor, previousAlpha);
    renderer.toneMapping = previousTone;
    this.uniforms.causticMap.value = this.target.texture;
    this.uniforms.causticStrength.value = 1;
  }

  /** Stop lighting the readers (the map is not drawn this frame). */
  disable(): void {
    this.uniforms.causticStrength.value = 0;
  }

  dispose(): void {
    this.target.dispose();
    this.mesh.geometry.dispose();
    this.mesh.material.dispose();
  }

}
