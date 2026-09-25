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
  Vector4,
} from 'three';
import type { FarFieldProfile } from '../wave/FarFieldProfile';
import { buildGridGeometry, gradedAxis, type HoleRect } from './gridGeometry';
import { DEFAULT_WATER_CHOP, waterChopNormal, waterChopPars } from './waterChop';

export type { HoleRect } from './gridGeometry';

const MAX_COMPONENTS = 64;

const farVertexPars = /* glsl */ `
uniform sampler2D farTable;
uniform int farCount;
uniform int farShoreSamples;
uniform int farOffshoreSamples;
uniform vec3 farZ;
uniform float farCenterX;
uniform float farKx[${MAX_COMPONENTS}];
uniform float farTemporal[${MAX_COMPONENTS}];
uniform float farGerstner;
uniform vec4 farHole;
uniform float farWaveHeight;
uniform vec3 waterBaseColor;
uniform vec3 waterCrestColor;
uniform vec3 waterFoamColor;
varying vec3 vWaterColor;
varying vec3 vWaterWorld;

float farRowFor( float z ) {
  float reference = float( farShoreSamples - 1 );
  if ( z >= farZ.y ) return clamp( ( farZ.x - z ) / ( farZ.x - farZ.y ), 0.0, 1.0 ) * reference;
  return reference + clamp( ( farZ.y - z ) / ( farZ.y - farZ.z ), 0.0, 1.0 ) * float( farOffshoreSamples - 1 );
}
`;

// Replaces <beginnormal_vertex>: the far-field sum of every tabulated component.
const farBeginNormal = /* glsl */ `
vec2 farXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
int farSamples = farShoreSamples + farOffshoreSamples - 1;
int farSide = farXZ.x < farCenterX ? 0 : 1;
float farRow = farRowFor( farXZ.y );
int farRow0 = int( floor( farRow ) );
int farRow1 = min( farRow0 + 1, farSamples - 1 );
float farBlend = farRow - float( farRow0 );
int farBase0 = farSide * farSamples + farRow0;
int farBase1 = farSide * farSamples + farRow1;
float farDepth = mix( texelFetch( farTable, ivec2( farCount, farBase0 ), 0 ).r, texelFetch( farTable, ivec2( farCount, farBase1 ), 0 ).r, farBlend );
// Gerstner sharpening fades out within 60 m of the tank so both meshes meet.
float farGerstnerFade = smoothstep( 0.0, 60.0, length( farXZ - clamp( farXZ, farHole.xz, farHole.yw ) ) );
float farHeight = 0.0;
vec2 farSlope = vec2( 0.0 );
vec2 farShift = vec2( 0.0 );
float farCap = 1.0;
for ( int c = 0; c < ${MAX_COMPONENTS}; c ++ ) {
  if ( c >= farCount ) break;
  vec4 farA = texelFetch( farTable, ivec2( c, farBase0 ), 0 );
  vec4 farB = texelFetch( farTable, ivec2( c, farBase1 ), 0 );
  farCap = mix( farA.w, farB.w, farBlend );
  float farAmplitude = mix( farA.y, farB.y, farBlend ) * farCap;
  vec2 farK = vec2( farKx[ c ], mix( farA.z, farB.z, farBlend ) );
  float farPsi = farK.x * farXZ.x + mix( farA.x, farB.x, farBlend ) - farTemporal[ c ];
  float farSin = sin( farPsi );
  farHeight += farAmplitude * cos( farPsi );
  farSlope -= farAmplitude * farK * farSin;
  farShift -= farGerstner * farGerstnerFade * farAmplitude * farK / max( length( farK ), 1e-6 ) * farSin;
}
bool farDry = farDepth <= 0.05;
if ( farDry ) {
  // Tuck dry land's water just under the seabed mesh.
  farHeight = -farDepth - 0.05;
  farSlope = vec2( 0.0 );
  farShift = vec2( 0.0 );
}
vec3 objectNormal = normalize( vec3( -farSlope.x, 1.0, -farSlope.y ) );
float farCrest = clamp( farHeight / max( farWaveHeight, 0.01 ) * 0.6, 0.0, 0.6 );
float farFoam = farDry ? 0.0 : clamp( ( 1.0 - farCap ) * 1.4, 0.0, 0.85 );
vWaterColor = mix( mix( waterBaseColor, waterCrestColor, farCrest ), waterFoamColor, farFoam );
`;

/**
 * The analytic ocean around and beyond the tank (plan §2.2, G2): the same
 * seeded components as the tank's boundary, refracted and shoaled along the
 * cross-shore axis by `FarFieldProfile`, with a slight Gerstner crest, a
 * breaking-foam proxy beside the window, wind chop, and a fade into the sky.
 */
export class FarFieldOcean {
  readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>;
  private texture?: DataTexture;
  private profile?: FarFieldProfile;
  private readonly uniforms: Record<string, { value: unknown }>;

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
      farWaveHeight: { value: 1 },
      farFocus: { value: new Vector2() },
      farFade: { value: new Vector2(1000, 1450) },
      waterBaseColor: { value: new Color('#0c8f9d') },
      waterCrestColor: { value: new Color('#4fc1b5') },
      waterFoamColor: { value: new Color('#d8f2e9') },
      waterTime: { value: 0 },
      waterChop: { value: DEFAULT_WATER_CHOP },
    };
    const material = new MeshPhysicalMaterial({
      color: '#ffffff', roughness: 0.62, metalness: 0.01, clearcoat: 0.12, clearcoatRoughness: 0.55,
      side: DoubleSide, transparent: true,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${farVertexPars}`)
        .replace('#include <beginnormal_vertex>', farBeginNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position.x + farShift.x, farHeight, position.z + farShift.y );\nvWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', `#include <common>\nvarying vec3 vWaterColor;\nuniform vec2 farFocus;\nuniform vec2 farFade;\n${waterChopPars}`)
        .replace('#include <normal_fragment_begin>', waterChopNormal)
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= vWaterColor;\ndiffuseColor.a *= 1.0 - smoothstep( farFade.x, farFade.y, length( vWaterWorld.xz - farFocus ) );');
    };
    material.customProgramCacheKey = () => 'breakline-far-field-ocean';
    this.mesh = new Mesh(new BufferGeometry(), material);
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
  }

  get textureSize(): { width: number; height: number } {
    return { width: this.texture?.image.width ?? 0, height: this.texture?.image.height ?? 0 };
  }

  get temporalPhases(): Float32Array {
    return this.uniforms.farTemporal.value as Float32Array;
  }

  /** Build the mesh around `hole` out to `extent` metres and upload the profile tables. */
  setProfile(profile: FarFieldProfile, hole: HoleRect, focus: { x: number; z: number }, options: { extent: number; waveHeight: number }): void {
    if (profile.count > MAX_COMPONENTS) throw new RangeError(`The far field supports ${MAX_COMPONENTS} components, got ${profile.count}`);
    this.profile = profile;
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
    (this.uniforms.farFade.value as Vector2).set(options.extent * 0.66, options.extent * 0.97);
    this.uniforms.farWaveHeight.value = options.waveHeight;
    this.mesh.visible = true;
  }

  /** Advance to sea time t: each component's ωt is reduced mod 2π in double precision. */
  update(seaTime: number): void {
    const profile = this.profile;
    if (!profile) return;
    const temporal = this.uniforms.farTemporal.value as Float32Array;
    for (let c = 0; c < profile.count; c += 1) temporal[c] = (profile.omega[c] * seaTime) % (2 * Math.PI);
    this.uniforms.waterTime.value = seaTime;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.texture?.dispose();
    this.mesh.material.dispose();
  }
}
