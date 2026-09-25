import { Color, Vector3 } from 'three';
import type { SpotName } from '../wave/Bathymetry';

/**
 * Water optics for physically based shading (plan §2.3, G3). The functions here
 * are the tested reference; the shader chunks mirror them and take their
 * uniforms from them. Channels (R, G, B) stand for 650, 550 and 450 nm.
 */
export type Rgb = readonly [number, number, number];

export const WATER_IOR = 1.333;
/** Normal-incidence Fresnel reflectance of water, ((n − 1)/(n + 1))² ≈ 0.020. */
export const WATER_F0 = ((WATER_IOR - 1) / (WATER_IOR + 1)) ** 2;
/** Pure-water absorption at 650, 550 and 450 nm, m⁻¹ (Pope & Fry 1997). */
export const WATER_ABSORPTION: Rgb = [0.34, 0.0565, 0.00922];
/** Pure-seawater backscattering: half of b_m = 0.0076 (400/λ)^4.32 m⁻¹ (Smith & Baker 1981, after Morel 1974). */
export const WATER_BACKSCATTER: Rgb = [650, 550, 450].map((nm) => 0.5 * 0.0076 * (400 / nm) ** 4.32) as unknown as Rgb;
/** Backscatter fraction of the Petzold average particle phase function (Mobley 1994). */
export const PARTICLE_BACKSCATTER_FRACTION = 0.0183;
/** Single-scattering albedo assumed for suspended sediment, b_p/(a_p + b_p): mostly scattering mineral grains. */
export const PARTICLE_ALBEDO = 0.95;

export interface WaterOptics {
  /** Suspended-particle scattering b_p, m⁻¹, spectrally flat; the particles also absorb b_p (1 − ω)/ω. */
  readonly turbidity: number;
  /** Seabed albedo, linear RGB. */
  readonly bedAlbedo: Rgb;
}

/**
 * Water per spot. Particle beam attenuation runs from about 0.01 m⁻¹ offshore to
 * 0.5–2.5 m⁻¹ and more in turbid coastal water (IOCCG 2019): the beach's surf is
 * sandy, the reef's water clear over bright carbonate sand.
 */
export const SPOT_OPTICS: Record<SpotName, WaterOptics> = {
  beach: { turbidity: 2, bedAlbedo: [0.42, 0.36, 0.24] },
  point: { turbidity: 1, bedAlbedo: [0.36, 0.33, 0.24] },
  reef: { turbidity: 0.15, bedAlbedo: [0.5, 0.47, 0.36] },
  canyon: { turbidity: 1, bedAlbedo: [0.42, 0.36, 0.24] },
};

const perChannel = (value: (channel: number) => number): Rgb => [value(0), value(1), value(2)];

export function schlickFresnel(cosine: number, f0 = WATER_F0): number {
  const c = Math.min(1, Math.max(0, cosine));
  return f0 + (1 - f0) * (1 - c) ** 5;
}

/** Cosine from the normal of the ray refracted under water, for an air-side cosine. */
export function refractedCosine(cosine: number): number {
  const c = Math.min(1, Math.max(0, cosine));
  return Math.sqrt(1 - (1 - c * c) / (WATER_IOR * WATER_IOR));
}

const particleAbsorption = (optics: WaterOptics) => (optics.turbidity * (1 - PARTICLE_ALBEDO)) / PARTICLE_ALBEDO;
const backscattering = (optics: WaterOptics, i: number) => WATER_BACKSCATTER[i] + PARTICLE_BACKSCATTER_FRACTION * optics.turbidity;

/** Beam attenuation c = a + b_p, m⁻¹: what a direct ray loses (pure-water scattering is negligible here). */
export function beamAttenuation(optics: WaterOptics): Rgb {
  return perChannel((i) => WATER_ABSORPTION[i] + particleAbsorption(optics) + optics.turbidity);
}

/** Diffuse attenuation K ≈ a + b_b, m⁻¹ per unit path (Gordon 1989), for light that may scatter forward on its way. */
export function diffuseAttenuation(optics: WaterOptics): Rgb {
  return perChannel((i) => WATER_ABSORPTION[i] + particleAbsorption(optics) + backscattering(optics, i));
}

/** Share of a direct ray left after `path` metres of water, e^{−c·path} (Beer–Lambert). */
export function transmittance(optics: WaterOptics, path: number): Rgb {
  const attenuation = beamAttenuation(optics);
  return perChannel((i) => Math.exp(-attenuation[i] * path));
}

/** Reflectance of bottomless water just below the surface, R∞ = 0.33 b_b/(a + b_b) (Morel & Prieur 1977). */
export function deepReflectance(optics: WaterOptics): Rgb {
  return perChannel((i) => {
    const backscatter = backscattering(optics, i);
    return (0.33 * backscatter) / (WATER_ABSORPTION[i] + particleAbsorption(optics) + backscatter);
  });
}

/**
 * Reflectance of water `depth` metres deep over the seabed, R = R∞ + (A − R∞)·e^{−K·path}
 * (Maritorena, Morel & Gentili 1994, whose 2KH becomes K along the refracted
 * sun path down and view path up).
 */
export function shallowReflectance(optics: WaterOptics, depth: number, viewCosine: number, sunCosine: number): Rgb {
  const path = Math.max(0, depth) * (1 / refractedCosine(viewCosine) + 1 / refractedCosine(sunCosine));
  const deep = deepReflectance(optics);
  const attenuation = diffuseAttenuation(optics);
  return perChannel((i) => deep[i] + (optics.bedAlbedo[i] - deep[i]) * Math.exp(-attenuation[i] * path));
}

export interface Point3 { x: number; y: number; z: number }

/** Distances along the ray where the shader samples the surface, m (plan §2.3: 2–4 lookups). */
export const CREST_SAMPLES = [0.25, 1, 2.5, 6] as const;
/**
 * Brightness applied to the water body's reflectance for readability (plan §2.8:
 * readability wins). Physically it is 1; the scene's lights and fixed exposure
 * were tuned for brighter, painted water, and at 1 the bed is barely visible.
 */
export const WATER_BODY_GAIN = 3;

/**
 * Share of the sunlight crossing a crest that scatters toward the viewer: a
 * rendering constant (the single-scattering phase integral is not modelled).
 */
export const CREST_SCATTER = 0.35;
/** Thickness reported when no crest lies across the ray: it never enters water, or is still under water after the last sample. */
export const OPAQUE = 1e4;

/**
 * Water a ray from a surface point at `origin` crosses before it leaves the
 * back of a crest, interpolating the surface crossing between samples.
 */
export function crestThickness(heightAt: (x: number, z: number) => number, origin: Point3, direction: Point3): number {
  let previous = 0;
  let previousGap = 0;
  for (const distance of CREST_SAMPLES) {
    const gap = heightAt(origin.x + direction.x * distance, origin.z + direction.z * distance) - (origin.y + direction.y * distance);
    if (gap <= 0) return previousGap > 0 ? previous + ((distance - previous) * previousGap) / (previousGap - gap) : OPAQUE;
    previous = distance;
    previousGap = gap;
  }
  return OPAQUE;
}

const glsl = (value: number) => value.toFixed(6);

/** Uniforms and functions shared by both water meshes; `waterBodyReflectance` mirrors `shallowReflectance`. */
export const waterOpticsPars = /* glsl */ `
uniform vec3 waterAttenuation;
uniform vec3 waterDiffuseAttenuation;
uniform vec3 waterDeepReflectance;
uniform vec3 waterBedAlbedo;
uniform vec3 waterSunDirection;
uniform vec3 waterSunRadiance;
uniform float waterBodyGain;

float waterFresnel( float c ) {
  return ${glsl(WATER_F0)} + ( 1.0 - ${glsl(WATER_F0)} ) * pow( 1.0 - clamp( c, 0.0, 1.0 ), 5.0 );
}

float waterRefractedCosine( float c ) {
  c = clamp( c, 0.0, 1.0 );
  return sqrt( 1.0 - ( 1.0 - c * c ) / ( ${WATER_IOR} * ${WATER_IOR} ) );
}

vec3 waterBodyReflectance( float depth, float viewCosine, float sunCosine ) {
  float path = max( depth, 0.0 ) * ( 1.0 / waterRefractedCosine( viewCosine ) + 1.0 / waterRefractedCosine( sunCosine ) );
  return waterDeepReflectance + ( waterBedAlbedo - waterDeepReflectance ) * exp( -waterDiffuseAttenuation * path );
}
`;

/** Mirrors `crestThickness`; needs `waterHeightAt( vec2 )` declared first. */
export const waterCrestPars = /* glsl */ `
float waterCrestThickness( vec3 origin, vec3 direction ) {
  const float samples[${CREST_SAMPLES.length}] = float[${CREST_SAMPLES.length}]( ${CREST_SAMPLES.map((d) => d.toFixed(2)).join(', ')} );
  float previous = 0.0;
  float previousGap = 0.0;
  for ( int i = 0; i < ${CREST_SAMPLES.length}; i ++ ) {
    vec3 p = origin + direction * samples[ i ];
    float gap = waterHeightAt( p.xz ) - p.y;
    if ( gap <= 0.0 ) return previousGap > 0.0 ? previous + ( samples[ i ] - previous ) * previousGap / ( previousGap - gap ) : ${OPAQUE.toFixed(1)};
    previous = samples[ i ];
    previousGap = gap;
  }
  return ${OPAQUE.toFixed(1)};
}
`;

/**
 * Fragment block run after the normal is final (it replaces
 * `<emissivemap_fragment>`): the water body's colour from the depth under the
 * fragment, foam over it, and with `crestLight` the sunlight that crosses thin
 * crests when the sun is behind them. Needs `vWaterWorld`, `vWaterDepth`,
 * `vWaterFoam`, `vWaterFlow`, `waterFoamColor`, `waterTime` and `foamPatternPars`.
 */
export function waterBodyFragment(crestLight: boolean): string {
  // Sunlight crosses the crest from its sunlit back toward the face in view, so
  // march horizontally toward the sun; a height-field crest seldom lets the
  // refracted view ray out through its back.
  const crest = /* glsl */ `
    float waterBehind = pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 4.0 );
    vec2 waterSunward = waterSunDirection.xz;
    if ( waterBehind > 0.001 && dot( waterSunward, waterSunward ) > 1e-6 ) {
      vec2 waterToSun = normalize( waterSunward );
      float waterThickness = waterCrestThickness( vWaterWorld, vec3( waterToSun.x, 0.0, waterToSun.y ) );
      totalEmissiveRadiance += ${glsl(CREST_SCATTER)} * ( 1.0 - vWaterFoam ) * waterBehind * ( 1.0 - waterFresnel( waterViewCos ) )
        * waterSunRadiance * exp( -waterAttenuation * waterThickness );
    }`;
  return /* glsl */ `
#include <emissivemap_fragment>
{
  vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  vec3 waterV = normalize( cameraPosition - vWaterWorld );
  float waterViewCos = dot( waterN, waterV );
  vec3 waterBody = waterDeepReflectance;
  if ( waterViewCos > 0.0 ) {
    waterBody = waterBodyReflectance( vWaterDepth, waterViewCos, max( 0.0, dot( waterN, waterSunDirection ) ) );${crestLight ? crest : ''}
  }
  // Foam is a matte network over the water (plan §2.4) that drifts with the current.
  vec2 waterFootprint = fwidth( vWaterWorld.xz );
  float waterCover = mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern );
  diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, waterCover );
  roughnessFactor = mix( roughnessFactor, 0.9, waterCover );
}
`;
}

export type OpticsUniforms = Record<string, { value: unknown }>;

export function createOpticsUniforms(): OpticsUniforms {
  const uniforms: OpticsUniforms = {
    waterAttenuation: { value: new Vector3() },
    waterDiffuseAttenuation: { value: new Vector3() },
    waterDeepReflectance: { value: new Vector3() },
    waterBedAlbedo: { value: new Vector3() },
    waterSunDirection: { value: new Vector3(0, 1, 0) },
    waterSunRadiance: { value: new Color(1, 1, 1) },
    waterBodyGain: { value: WATER_BODY_GAIN },
  };
  applyOptics(uniforms, SPOT_OPTICS.beach);
  return uniforms;
}

export function applyOptics(uniforms: OpticsUniforms, optics: WaterOptics): void {
  (uniforms.waterAttenuation.value as Vector3).fromArray(beamAttenuation(optics));
  (uniforms.waterDiffuseAttenuation.value as Vector3).fromArray(diffuseAttenuation(optics));
  (uniforms.waterDeepReflectance.value as Vector3).fromArray(deepReflectance(optics));
  (uniforms.waterBedAlbedo.value as Vector3).fromArray(optics.bedAlbedo);
}

/** `direction` points toward the sun (world); `radiance` is the sun light's colour × intensity. */
export function applySun(uniforms: OpticsUniforms, direction: Vector3, radiance: Color): void {
  (uniforms.waterSunDirection.value as Vector3).copy(direction).normalize();
  (uniforms.waterSunRadiance.value as Color).copy(radiance);
}
