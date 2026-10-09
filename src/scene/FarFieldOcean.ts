import {
  BufferGeometry,
  Color,
  DataTexture,
  DoubleSide,
  FloatType,
  Mesh,
  MeshPhysicalMaterial,
  NearestFilter,
  RGBAFormat,
  Vector2,
  Vector3,
  Vector4,
} from 'three';
import type { WaterLook } from './water/waterLook';
import { RICH_FAR_FOAM, RICH_REFLECTION, RICH_WATER, richFarNormal, richFragmentPars, richReflectionPars } from './water/richWaterGlsl';
import { rippleStrength, rippleTexture, waterRipplePars } from './water/rippleTexture';
import { CLASSIC_ROUGHNESS, RICH_BASE_ROUGHNESS, waterSpecularPars } from './water/specular';
import type { FarFieldProfile } from '../wave/FarFieldProfile';
import { createEdgeBandUniforms, edgeBandPars } from './water/edgeBandGlsl';
import { waterHeightPars } from './WaterSurface';
import { buildGridGeometry, gradedAxis, type HoleRect } from './gridGeometry';
import { foamPatternPars, foamTileTexture } from './foamPattern';
import { DEFAULT_WATER_CHOP, chopFieldUniforms, waterChopNormal, waterChopPars } from './waterChop';
import { WATER_BODY_GAIN, WATER_IOR, applyOptics, applySun, createOpticsUniforms, waterBodyFragment, waterOpticsPars, type WaterOptics } from './waterOptics';

export type { HoleRect } from './gridGeometry';

const MAX_COMPONENTS = 64;

/**
 * The far ocean's linear sea (`FarFieldProfile`), as a function both its own mesh and the tank's edge band (`EdgeBand`)
 * evaluate: `farSeaAt( xz, gerstner, … )` gives the height, slope, still depth and breaking cap at xz, and with
 * `gerstner` the horizontal shift that sharpens its crests; dry land's water is tucked just under the bed.
 */
export const farSeaPars = /* glsl */ `
uniform sampler2D farTable;
uniform int farCount;
uniform int farShoreSamples;
uniform int farOffshoreSamples;
uniform vec3 farZ;
uniform float farCenterX;
uniform float farKx[${MAX_COMPONENTS}];
uniform float farTemporal[${MAX_COMPONENTS}];

float farRowFor( float z ) {
  float reference = float( farShoreSamples - 1 );
  if ( z >= farZ.y ) return clamp( ( farZ.x - z ) / ( farZ.x - farZ.y ), 0.0, 1.0 ) * reference;
  return reference + clamp( ( farZ.y - z ) / ( farZ.y - farZ.z ), 0.0, 1.0 ) * float( farOffshoreSamples - 1 );
}

void farSeaAt( vec2 xz, float gerstner, out float height, out vec2 slope, out vec2 shift, out float depth, out float cap ) {
  int samples = farShoreSamples + farOffshoreSamples - 1;
  int side = xz.x < farCenterX ? 0 : 1;
  float row = farRowFor( xz.y );
  int row0 = int( floor( row ) );
  int row1 = min( row0 + 1, samples - 1 );
  float blend = row - float( row0 );
  int base0 = side * samples + row0;
  int base1 = side * samples + row1;
  depth = mix( texelFetch( farTable, ivec2( farCount, base0 ), 0 ).r, texelFetch( farTable, ivec2( farCount, base1 ), 0 ).r, blend );
  height = 0.0;
  slope = vec2( 0.0 );
  shift = vec2( 0.0 );
  cap = 1.0;
  for ( int c = 0; c < ${MAX_COMPONENTS}; c ++ ) {
    if ( c >= farCount ) break;
    vec4 a = texelFetch( farTable, ivec2( c, base0 ), 0 );
    vec4 b = texelFetch( farTable, ivec2( c, base1 ), 0 );
    cap = mix( a.w, b.w, blend );
    float amplitude = mix( a.y, b.y, blend ) * cap;
    vec2 k = vec2( farKx[ c ], mix( a.z, b.z, blend ) );
    float psi = k.x * xz.x + mix( a.x, b.x, blend ) - farTemporal[ c ];
    float s = sin( psi );
    height += amplitude * cos( psi );
    slope -= amplitude * k * s;
    shift -= gerstner * amplitude * k / max( length( k ), 1e-6 ) * s;
  }
  if ( depth <= 0.05 ) {
    // Tuck dry land's water just under the seabed mesh.
    height = -depth - 0.05;
    slope = vec2( 0.0 );
    shift = vec2( 0.0 );
  }
}
`;

/** The far ocean's foam: the breaking proxy where its cap cuts the waves, none on dry land. */
export const FAR_FOAM = 'clamp( ( 1.0 - farCap ) * 1.4, 0.0, 0.85 )';

/** How far offshore the far ocean's rim follows the drawn tank before its own sea takes over, m (`farRim`). */
export const FAR_RIM_FADE = 40;

const farVertexPars = /* glsl */ `
${farSeaPars}
uniform float farGerstner;
uniform vec4 farHole;
uniform float farRim;
${waterHeightPars}
${edgeBandPars}
varying float vWaterDepth;
varying float vWaterFoam;
varying vec2 vWaterFlow;
varying vec3 vWaterWorld;
`;

// Replaces <beginnormal_vertex>: the far-field sum of every tabulated component.
const farBeginNormal = /* glsl */ `
vec2 farXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
// Gerstner sharpening fades out within 60 m of the tank so both meshes meet.
float farGerstnerFade = smoothstep( 0.0, 60.0, length( farXZ - clamp( farXZ, farHole.xz, farHole.yw ) ) );
float farHeight;
vec2 farSlope;
vec2 farShift;
float farDepth;
float farCap;
farSeaAt( farXZ, farGerstner * farGerstnerFade, farHeight, farSlope, farShift, farDepth, farCap );
bool farDry = farDepth <= 0.05;
// Offshore of the tank, the rim follows the water drawn on its edge (the tank's offshore row, and its edge band's),
// the gap to the linear sea fading out over FAR_RIM_FADE.
if ( farRim > 0.5 && !farDry && farXZ.y < waterBandZ.x ) {
  vec2 farRimXZ = vec2( farXZ.x, waterBandZ.x );
  float farRimOff = waterBandZ.x - farXZ.y;
  float farRimShare = ( 1.0 - smoothstep( 0.0, ${FAR_RIM_FADE.toFixed(1)}, farRimOff ) ) * ( 1.0 - waterBandWeight( farRimXZ ) );
  if ( farRimShare > 0.0 ) {
    float farRimHeight;
    vec2 farRimSlope;
    vec2 farRimShift;
    float farRimDepth;
    float farRimCap;
    farSeaAt( farRimXZ, 0.0, farRimHeight, farRimSlope, farRimShift, farRimDepth, farRimCap );
    float farRimGap = waterHeightAt( farRimXZ ) - farRimHeight;
    farHeight += farRimShare * farRimGap;
    // d(share)/dz: the fade's, as the gap's own along-shore change is slight.
    float farRimT = clamp( farRimOff / ${FAR_RIM_FADE.toFixed(1)}, 0.0, 1.0 );
    farSlope.y += farRimGap * ( 1.0 - waterBandWeight( farRimXZ ) ) * 6.0 * farRimT * ( 1.0 - farRimT ) / ${FAR_RIM_FADE.toFixed(1)};
  }
}
vec3 objectNormal = normalize( vec3( -farSlope.x, 1.0, -farSlope.y ) );
vWaterDepth = max( 0.0, farDepth + farHeight );
vWaterFoam = farDry ? 0.0 : ${FAR_FOAM};
vWaterFlow = vec2( 0.0 );
`;

const farFragmentPars = /* glsl */ `
uniform vec2 farFocus;
uniform vec2 farFade;
uniform vec3 waterFoamColor;
varying float vWaterDepth;
varying float vWaterFoam;
varying vec2 vWaterFlow;
${waterOpticsPars}
${waterChopPars}
${foamPatternPars}
`;

/**
 * The analytic ocean around and beyond the tank (plan §2.2, G2): the same
 * seeded components as the tank's boundary, refracted and shoaled along the
 * cross-shore axis by `FarFieldProfile`, with a slight Gerstner crest, a
 * breaking-foam proxy beside the window, wind chop, and a fade into the sky.
 * It shades like the tank water from its tabulated depth, without crest light.
 */
/** The fade into the sky as fractions of the extent: far to the horizon, or near for the Low preset. */
const VIEW_FADE = { far: [0.66, 0.97], near: [0.3, 0.47] } as const;

const RIM_KEYS = ['farRim', 'waterSurface', 'waterGrid', 'waterGridSize', 'waterBand', 'waterBandZ'] as const;

export class FarFieldOcean {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private texture?: DataTexture;
  private profile?: FarFieldProfile;
  private readonly uniforms: Record<string, { value: unknown }>;
  private extent = 1500;
  private view: 'near' | 'far' = 'far';
  private currentLook: WaterLook = 'classic';
  private drawnTime = Number.NaN;
  private rimVersion = 0;

  constructor() {
    this.uniforms = {
      farTable: { value: null },
      farCount: { value: 0 },
      farShoreSamples: { value: 2 },
      farOffshoreSamples: { value: 2 },
      farZ: { value: new Float32Array(3) },
      farCenterX: { value: 0 },
      farKx: { value: new Float32Array(MAX_COMPONENTS) },
      farTemporal: { value: new Float32Array(MAX_COMPONENTS) },
      farGerstner: { value: 0.6 },
      farHole: { value: new Vector4() },
      farFocus: { value: new Vector2() },
      farFade: { value: new Vector2(1000, 1450) },
      waterFoamColor: { value: new Color('#d8f2e9') },
      waterFoamTile: { value: foamTileTexture() },
      waterFoamPattern: { value: 1 },
      waterTime: { value: 0 },
      waterChop: { value: DEFAULT_WATER_CHOP },
      ...chopFieldUniforms,
      ...createOpticsUniforms(),
      // Rich only (G8): the tank's ripples, so the two meet without a step in gloss.
      waterRippleMap: { value: rippleTexture() },
      waterRippleStrength: { value: rippleStrength(DEFAULT_WATER_CHOP) },
      waterReflection: { value: RICH_WATER.reflection },
      // The rim's hold on the drawn tank (`attachRim`): off, with placeholders, until a tank's water is attached.
      farRim: { value: 0 },
      waterSurface: { value: null },
      waterGrid: { value: new Vector4(0, 0, 1, 0) },
      waterGridSize: { value: new Vector2(2, 2) },
      ...createEdgeBandUniforms(),
    };
    const material = new MeshPhysicalMaterial({
      color: '#ffffff', roughness: CLASSIC_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide, transparent: true,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      const rich = this.currentLook === 'rich';
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${farVertexPars}`)
        .replace('#include <beginnormal_vertex>', farBeginNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position.x + farShift.x, farHeight, position.z + farShift.y );\nvWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', rich
          ? `#include <common>\n${farFragmentPars}\n${richFragmentPars}\n${waterRipplePars}\n${waterSpecularPars}\n${richReflectionPars}`
          : `#include <common>\n${farFragmentPars}`)
        .replace('#include <normal_fragment_begin>', rich ? richFarNormal : waterChopNormal)
        .replace('#include <color_fragment>', 'diffuseColor.a *= 1.0 - smoothstep( farFade.x, farFade.y, length( vWaterWorld.xz - farFocus ) );')
        .replace('#include <emissivemap_fragment>', rich ? waterBodyFragment(false, false, RICH_FAR_FOAM) : waterBodyFragment(false))
        .replace('#include <lights_fragment_maps>', rich ? RICH_REFLECTION : '#include <lights_fragment_maps>');
    };
    // The rim's uniforms are taken in at compile (`attachRim`): a new attachment compiles again.
    material.customProgramCacheKey = () => `breakline-far-field-ocean-${this.currentLook}${this.rimVersion > 0 ? `-rim${this.rimVersion}` : ''}`;
    this.mesh = new Mesh(new BufferGeometry(), material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  /** Graphics setting (G8): the Classic water, or the Rich look. */
  setLook(look: WaterLook): void {
    if (look === this.currentLook) return;
    this.currentLook = look;
    this.mesh.material.roughness = look === 'rich' ? RICH_BASE_ROUGHNESS : CLASSIC_ROUGHNESS;
    this.uniforms.waterBodyGain.value = look === 'rich' ? RICH_WATER.bodyGain : WATER_BODY_GAIN;
    this.mesh.material.needsUpdate = true;
  }

  get look(): WaterLook {
    return this.currentLook;
  }

  get textureSize(): { width: number; height: number } {
    return { width: this.texture?.image.width ?? 0, height: this.texture?.image.height ?? 0 };
  }

  get temporalPhases(): Float32Array {
    return this.uniforms.farTemporal.value as Float32Array;
  }

  /** The uniforms `farSeaPars` reads (the same objects, so a program sharing them follows every profile and time). */
  get seaUniforms(): Record<string, { value: unknown }> {
    const { farTable, farCount, farShoreSamples, farOffshoreSamples, farZ, farCenterX, farKx, farTemporal } = this.uniforms;
    return { farTable, farCount, farShoreSamples, farOffshoreSamples, farZ, farCenterX, farKx, farTemporal };
  }

  /**
   * Hold the rim on the drawn tank (the edge band, `EdgeBand.rimUniforms`): offshore of the tank the far ocean takes the
   * height of the water drawn along its offshore edge (the tank's row, mirrored and handed over in its edge band), the
   * gap to its own linear sea fading out over FAR_RIM_FADE. The same uniform objects as the tank's water and its band;
   * `farRim` 1 holds it, 0 lets the rim go.
   */
  attachRim(uniforms: { farRim: { value: number }; waterSurface: { value: unknown }; waterGrid: { value: unknown }; waterGridSize: { value: unknown }; waterBand: { value: unknown }; waterBandZ: { value: unknown } }): void {
    if (RIM_KEYS.every((key) => this.uniforms[key] === uniforms[key])) return;
    for (const key of RIM_KEYS) this.uniforms[key] = uniforms[key];
    this.rimVersion += 1;
    this.mesh.material.needsUpdate = true;
  }

  /** Whether the rim holds on the drawn tank (`attachRim`). */
  get rimHeld(): boolean {
    return this.uniforms.farRim.value === 1;
  }

  /** Build the mesh around `hole` out to `extent` metres and upload the profile tables. */
  setProfile(profile: FarFieldProfile, hole: HoleRect, focus: { x: number; z: number }, options: { extent: number }): void {
    if (profile.count > MAX_COMPONENTS) throw new RangeError(`The far field supports ${MAX_COMPONENTS} components, got ${profile.count}`);
    this.profile = profile;
    this.drawnTime = Number.NaN;
    const xs = gradedAxis(focus.x - options.extent, focus.x + options.extent, hole.xMin, hole.xMax, 4, 40);
    const zs = gradedAxis(profile.offshoreZ, profile.shoreZ, hole.zMin, hole.zMax, 3, 40);
    this.mesh.geometry.dispose();
    this.mesh.geometry = buildGridGeometry(xs, zs, hole);
    this.texture?.dispose();
    this.texture = new DataTexture(profile.table, profile.count + 1, 2 * profile.samples, RGBAFormat, FloatType);
    this.texture.magFilter = NearestFilter;
    this.texture.minFilter = NearestFilter;
    this.texture.generateMipmaps = false;
    this.texture.needsUpdate = true;
    const kx = this.uniforms.farKx.value as Float32Array;
    kx.fill(0);
    kx.set(profile.kx);
    this.uniforms.farTable.value = this.texture;
    this.uniforms.farCount.value = profile.count;
    this.uniforms.farShoreSamples.value = profile.shoreSamples;
    this.uniforms.farOffshoreSamples.value = profile.offshoreSamples;
    (this.uniforms.farZ.value as Float32Array).set([profile.shoreZ, profile.referenceZ, profile.offshoreZ]);
    this.uniforms.farCenterX.value = 0.5 * (hole.xMin + hole.xMax);
    (this.uniforms.farHole.value as Vector4).set(hole.xMin, hole.xMax, hole.zMin, hole.zMax);
    (this.uniforms.farFocus.value as Vector2).set(focus.x, focus.z);
    this.extent = options.extent;
    this.applyFade();
    this.mesh.visible = true;
  }

  /** Graphics setting (plan P8): the far ocean fades out nearer on the Near setting. */
  setViewDistance(view: 'near' | 'far'): void {
    this.view = view;
    this.applyFade();
  }

  /** Where the far ocean starts and finishes fading into the sky, m from the focus. */
  get viewFade(): { start: number; end: number } {
    const fade = this.uniforms.farFade.value as Vector2;
    return { start: fade.x, end: fade.y };
  }

  private applyFade(): void {
    const [start, end] = VIEW_FADE[this.view];
    (this.uniforms.farFade.value as Vector2).set(this.extent * start, this.extent * end);
  }

  setOptics(optics: WaterOptics): void {
    applyOptics(this.uniforms, optics);
  }

  /** `direction` points toward the sun; `radiance` is the sun light's colour × intensity. */
  setSun(direction: Vector3, radiance: Color): void {
    applySun(this.uniforms, direction, radiance);
  }

  setChop(strength: number): void {
    this.uniforms.waterChop.value = strength;
    this.uniforms.waterRippleStrength.value = rippleStrength(strength);
  }

  /** Advance to sea time t: each component's ωt is reduced mod 2π in double precision. */
  /** The sea time its waves were last drawn at, s (NaN before the first). */
  get time(): number {
    return this.drawnTime;
  }

  update(seaTime: number): void {
    const profile = this.profile;
    if (!profile || seaTime === this.drawnTime) return;
    const temporal = this.uniforms.farTemporal.value as Float32Array;
    for (let c = 0; c < profile.count; c += 1) temporal[c] = (profile.omega[c] * seaTime) % (2 * Math.PI);
    this.uniforms.waterTime.value = seaTime;
    this.drawnTime = seaTime;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.texture?.dispose();
    this.mesh.material.dispose();
  }
}
