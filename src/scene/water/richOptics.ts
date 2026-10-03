import { Vector3 } from 'three';
import { smoothstep } from '../../wave/Bathymetry';
import {
  BED_RAY_FLOOR, CAUSTIC_PEAK, CAUSTIC_RESOLVED, CAUSTIC_WINDOW_FADE, WATER_ABSORPTION, WATER_IOR, applyOptics, backscattering, particleAbsorption,
  refractedCosine, schlickFresnel, type OpticsUniforms, type Rgb, type WaterOptics,
} from '../waterOptics';
import type { WaterLook } from './waterLook';

/**
 * What the Rich look adds to the water's optics, compiled into the Rich programs only: Classic keeps `waterOptics.ts`
 * byte for byte.
 */

/**
 * The least cosine the Rich shading normal keeps with the eye, in view space. A rendering constant [provisional]: a
 * perturbed shading normal that faces away from the eye has no physical meaning, and 0.05 (87° off the eye) keeps the
 * grazing Fresnel while the surface stays visible.
 */
export const RICH_NORMAL_FLOOR = 0.05;

/**
 * CPU twin of `RICH_NORMAL_GUARD`: the normal pushed back along the eye direction until it faces the eye by the floor,
 * n += (floor − n·v) v, then renormalised. A normal that already faces the eye by the floor is returned unchanged; one
 * turned away is turned back in the plane it makes with the eye.
 */
export function guardedNormal(normal: Vector3, toEye: Vector3, floor = RICH_NORMAL_FLOOR): Vector3 {
  const facing = normal.dot(toEye);
  const guarded = normal.clone();
  if (facing < floor) guarded.addScaledVector(toEye, floor - facing).normalize();
  return guarded;
}

/**
 * GLSL, run right after a Rich normal chunk (view space). `waterBodyFragment` gives a surface turned away from the eye
 * R∞ alone (the deep water's colour: navy-cobalt in Padang Padang's clear water), and the Rich normal adds the chop, the
 * ripples and the churn per pixel, so at grazing angles nothing kept it facing the eye: pixels along the edge of a
 * trough, the far waterline and a face's silhouette turned away and painted saturated dashes. Pushing the normal back
 * to the visible hemisphere keeps their colour and the sky's sheen (`guardedNormal`). `vViewPosition` points from the
 * fragment to the eye.
 */
export const RICH_NORMAL_GUARD = /* glsl */ `
{
  vec3 richGuardView = isOrthographic ? vec3( 0.0, 0.0, 1.0 ) : normalize( vViewPosition );
  float richGuardCos = dot( normal, richGuardView );
  if ( richGuardCos < ${RICH_NORMAL_FLOOR.toFixed(2)} ) normal = normalize( normal + ( ${RICH_NORMAL_FLOOR.toFixed(2)} - richGuardCos ) * richGuardView );
}
`;

/** GLSL `refract`: the incident direction bent through a surface with unit normal `normal`, by the index ratio `eta` (zero past total reflection). */
export function refractRay(incident: Vector3, normal: Vector3, eta = 1 / WATER_IOR): Vector3 {
  const d = normal.dot(incident);
  const k = 1 - eta * eta * (1 - d * d);
  if (k < 0) return new Vector3();
  return incident.clone().multiplyScalar(eta).addScaledVector(normal, -(eta * d + Math.sqrt(k)));
}

/**
 * Metres of water the view ray and the sun's ray cross for each metre of depth, 1/|r_v.y| + 1/|r_s.y|, from the
 * refracted rays' world-vertical components, each held at `BED_RAY_FLOOR` (`waterBodyFragment`'s Rich body).
 */
export function bedPathFactor(refractedView: Vector3, refractedSun: Vector3): number {
  return 1 / Math.max(BED_RAY_FLOOR, -refractedView.y) + 1 / Math.max(BED_RAY_FLOOR, -refractedSun.y);
}

/**
 * CPU twin of the Rich body (`waterBodyFragment`'s `rich` option): R∞ (1 − e) + A · bedLight · e, e = e^{−K · depth ·
 * bedPathFactor}, for a water of diffuse attenuation `diffuse` and deep reflectance `deep` over a bed of albedo `bed`.
 */
export function richShallowReflectance(
  water: { deep: Rgb; diffuse: Rgb; bed: Rgb }, depth: number, refractedView: Vector3, refractedSun: Vector3, bedLight = 1,
): Rgb {
  const path = Math.max(0, depth) * bedPathFactor(refractedView, refractedSun);
  return [0, 1, 2].map((i) => {
    const reach = Math.exp(-water.diffuse[i] * path);
    return water.deep[i] * (1 - reach) + water.bed[i] * bedLight * reach;
  }) as unknown as Rgb;
}

/**
 * The share of the caustic map's light a pixel keeps for its footprint on the map, `texelsPerPixel` texels across: whole
 * while the pattern is resolved, the mean, 1, once a pixel spans several texels (`CAUSTIC_RESOLVED`). CPU twin of the
 * first weight of `waterBodyFragment`'s Rich caustic lookup.
 */
export function causticResolvedWeight(texelsPerPixel: number): number {
  return 1 - smoothstep(CAUSTIC_RESOLVED.from, CAUSTIC_RESOLVED.to, texelsPerPixel);
}

/**
 * The share of the map's light kept at map coordinate (u, v) in [0, 1]²: whole within half the window's half-width of its
 * centre and gone at its inscribed circle (`CAUSTIC_WINDOW_FADE`), a function of the distance alone, so the square
 * window's straight edges never show. CPU twin of the second weight.
 */
export function causticWindowWeight(u: number, v: number): number {
  return 1 - smoothstep(CAUSTIC_WINDOW_FADE.from, CAUSTIC_WINDOW_FADE.to, 2 * Math.hypot(u - 0.5, v - 0.5));
}

/**
 * CPU twin of the Rich body's caustic light: `map`, the sampled light (capped at `CAUSTIC_PEAK` as Classic's lookup caps
 * it), mixed toward flat water's 1 by the two weights and the map's `strength` (0 when no map is drawn).
 */
export function richCausticLight(map: number, texelsPerPixel: number, u: number, v: number, strength = 1): number {
  const weight = strength * causticResolvedWeight(texelsPerPixel) * causticWindowWeight(u, v);
  return 1 + weight * (Math.min(map, CAUSTIC_PEAK) - 1);
}

/** The game's channels (R, G, B) stand for these wavelengths, nm (waterOptics.ts). */
export const WAVELENGTHS = [650, 550, 450] as const;

/**
 * Phytoplankton-only absorption, a_φ(λ) = A_φ · Chl^E_φ, A_φ in m²/mg and Chl in mg/m³, at 650, 550 and 450 nm
 * (Bricaud et al. 1998, JGR 103:31033; a = A · Chl^E is Mobley's Eq. 1 and NASA's convention): the Aphi and Ephi
 * columns of aph_bricaud_1998.txt, the file POLYMER and NASA's l2gen read (notes/round5-underwater/water-colour.md §6).
 * Interpolated to 443 nm they match the law Bricaud, Ciotti & Gentili 2012 quote, 0.0375 Chl^0.620, within 1 %. The
 * paper's total-particle columns (Ap, Ep) include detritus, which `bricaudCdm`'s term counts already: not used.
 */
export const PHYTOPLANKTON: readonly { readonly A: number; readonly E: number }[] = [
  { A: 0.00777566, E: 0.815461 },
  { A: 0.00702755, E: 0.9311673 },
  { A: 0.0349905, E: 0.599299 },
];

export function phytoplanktonAbsorption(chlorophyll: number): Rgb {
  return PHYTOPLANKTON.map(({ A, E }) => A * chlorophyll ** E) as unknown as Rgb;
}

/** Dissolved and detrital matter, a_g(λ) = a_g(440) · e^{−S (λ − 440)} (Bricaud, Morel & Prieur 1981's form). */
export function dissolvedAbsorption(cdom440: number, slope: number): Rgb {
  return WAVELENGTHS.map((lambda) => cdom440 * Math.exp(-slope * (lambda - 440))) as unknown as Rgb;
}

/**
 * Bricaud, Ciotti & Gentili 2012 (Global Biogeochemical Cycles 26), Table 1, the November 2007 fit: a_cdm(443) =
 * 10^−1.161 · Chl^1.070 and S = 10^−2.581 · a_cdm(443)^−0.448, S clamped to 0.011–0.025 nm⁻¹ (POLYMER's rule). Fits to
 * values retrieved from twelve years of SeaWiFS data, which the authors say are not designed for predictive use:
 * provisional. a_cdm(443) stands in for a_g(440), within 3–8 %.
 */
export function bricaudCdm(chlorophyll: number): { cdom440: number; slope: number } {
  const cdom440 = 10 ** -1.161 * chlorophyll ** 1.07;
  return { cdom440, slope: Math.min(0.025, Math.max(0.011, 10 ** -2.581 * cdom440 ** -0.448)) };
}

/**
 * The Rich look's absorption, m⁻¹ per channel: pure water (Pope & Fry 1997) plus, where the spot has a chlorophyll,
 * the phytoplankton, the dissolved and detrital matter and the flat term in place of the grey absorption the particles
 * were assumed to carry, b_p (1 − ω)/ω (underwater-colour.md's decision 6: replaced, not added to, which would
 * overshoot the satellite's Kd490 up to 1.8× at the Beach). A spot without one keeps Classic's water.
 */
export function richAbsorption(optics: WaterOptics): Rgb {
  if (optics.chlorophyll === undefined) return WATER_ABSORPTION.map((a) => a + particleAbsorption(optics)) as unknown as Rgb;
  const derived = bricaudCdm(optics.chlorophyll);
  const phytoplankton = phytoplanktonAbsorption(optics.chlorophyll);
  const dissolved = dissolvedAbsorption(optics.cdom440 ?? derived.cdom440, optics.cdomSlope ?? derived.slope);
  return WATER_ABSORPTION.map((a, i) => a + phytoplankton[i] + dissolved[i] + (optics.flatAbsorption ?? 0)) as unknown as Rgb;
}

/** Beam attenuation c = a + b_p, m⁻¹ (`beamAttenuation` with the Rich absorption): the scattering is the spot's own. */
export function richBeamAttenuation(optics: WaterOptics): Rgb {
  return richAbsorption(optics).map((a) => a + optics.turbidity) as unknown as Rgb;
}

/** Diffuse attenuation K ≈ a + b_b, m⁻¹ per unit path (Gordon 1989; `diffuseAttenuation` with the Rich absorption). */
export function richDiffuseAttenuation(optics: WaterOptics): Rgb {
  return richAbsorption(optics).map((a, i) => a + backscattering(optics, i)) as unknown as Rgb;
}

/** Reflectance of bottomless water just below the surface, R∞ = 0.33 b_b/(a + b_b) (Morel & Prieur 1977), with the Rich absorption. */
export function richDeepReflectance(optics: WaterOptics): Rgb {
  return richAbsorption(optics).map((a, i) => (0.33 * backscattering(optics, i)) / (a + backscattering(optics, i))) as unknown as Rgb;
}

/**
 * The water's optics uniforms (`createOpticsUniforms`) for a material drawn in the Rich look: the same names Classic's
 * programs read, carrying the Rich look's own water (decision 5 of underwater-colour.md: Rich above water too). So
 * every Rich program bound to a water's uniform objects, the swept barrel's curl and the bubble plume included, takes
 * the sourced colour with nothing of its own; `waterBodyGain` switches with the look the same way.
 */
export function applyRichWater(uniforms: OpticsUniforms, optics: WaterOptics): void {
  (uniforms.waterAttenuation.value as Vector3).fromArray(richBeamAttenuation(optics));
  (uniforms.waterDiffuseAttenuation.value as Vector3).fromArray(richDiffuseAttenuation(optics));
  (uniforms.waterDeepReflectance.value as Vector3).fromArray(richDeepReflectance(optics));
  (uniforms.waterBedAlbedo.value as Vector3).fromArray(optics.bedAlbedo);
}

/** A water's optics for the look it draws: Classic's (`applyOptics`, byte for byte as before), or the Rich look's own. */
export function applyLookOptics(uniforms: OpticsUniforms, optics: WaterOptics, look: WaterLook): void {
  if (look === 'rich') applyRichWater(uniforms, optics);
  else applyOptics(uniforms, optics);
}

/** How far under the surface the camera must be to count as under it, m (the game's `cameraBelowSurface` margin). */
export const UNDERWATER_MARGIN = 0.1;

/** Whether an eye at (x, y, z) is under a water. */
export type EyeTest = (x: number, y: number, z: number) => boolean;
const sceneEyes = new WeakMap<object, EyeTest>();

/**
 * A tank about to be drawn leaves its eye test with the scene it is drawn in, and the far ocean drawn in the same scene
 * asks it for its own camera (`eyeUnderwaterIn`): each water sets its own flag, and the answer never depends on which
 * drew first in a frame, nor on another scene's water.
 */
export function shareEyeTest(scene: object, test: EyeTest): void {
  sceneEyes.set(scene, test);
}

/** Whether an eye at (x, y, z) is under the water of the tank drawn in `scene`; above it if none has been. */
export function eyeUnderwaterIn(scene: object, x: number, y: number, z: number): boolean {
  return sceneEyes.get(scene)?.(x, y, z) ?? false;
}

/** A water's own flag for the Rich underside, 1 while the camera about to draw it is under the water. */
export function createUnderwaterUniforms(): { richUnderwater: { value: number } } {
  return { richUnderwater: { value: 0 } };
}

/** GLSL pars of the Rich underside (`richUndersideFragment`). */
export const richUndersidePars = /* glsl */ `
uniform float richUnderwater;
`;

/** The critical angle of water against air, asin(1/n) = 48.6° from the vertical. */
export const CRITICAL_ANGLE = Math.asin(1 / WATER_IOR);
/** Snell's window: the sky fills a cone of twice that, 97.2° across on flat water (Lynch 2014; the prototype measured 97.5–98.4°). */
export const WINDOW_ANGLE = 2 * CRITICAL_ANGLE;
/** Fresnel reflectance of uniform diffuse sky light entering water, ≈ 0.066 for n = 1.333 (textbook; the prototype's). */
export const DIFFUSE_FRESNEL = 0.066;
/** Diffuse sky light's mean path stretch under the surface, 1/μ̄_d with μ̄_d ≈ 0.83 [estimate, the prototype's]. */
export const DIFFUSE_STRETCH = 1.2;
/** The sun's disc seen through the window, spread over a pow(cos, 800) lobe of 2π/801 sr so it stays a small bright disc [estimate, the prototype's]. */
export const SUN_LOBE = 800;
/** Tyler 1960 (the prototype's water radiance): level radiance 7 times the nadir's, log-linear between them [the shape an estimate]. */
export const LEVEL_OVER_NADIR = 7;
/** How far below the horizontal a mirrored ray is kept, so a facet tilted past it still sends the eye's ray down into the water [provisional]. */
export const MIRROR_FLOOR = 0.02;
/** Foam seen from below passes 45 % of the light above it, from Koepke's 55 % reflectance of foam with little absorbed [estimate, the prototype's]. */
export const FOAM_TRANSMITTANCE = 0.45;
/** The bubble plume seen from below: 1 mm bubbles, g = 0.85, so τ = 3α/(2a) · depth = 1500 α depth (round 5 §3.5). */
export const PLUME_OPTICAL_DEPTH = 1500;

/**
 * The view ray leaving the water through a surface whose unit normal `normalDown` faces the eye (below it), by Snell's
 * law with n = 1.333; zero past the critical angle, where the surface mirrors the water instead.
 */
export function refractOut(looking: Vector3, normalDown: Vector3): Vector3 {
  return refractRay(looking, normalDown, WATER_IOR);
}

/** Radiance gained entering the denser medium, n² (1 − F), for light that meets the surface at cosine `cosine`. */
export function windowGain(cosine: number): number {
  return WATER_IOR * WATER_IOR * (1 - schlickFresnel(cosine));
}

/**
 * The irradiance on a level plane just under the surface, and on the bed `depth` m down, from the sun at `sunCosine`
 * above the horizon (its irradiance on a plane square to it, `sun`) and the sky's irradiance on a level plane, `sky`:
 * each enters at (1 − F), the sun at its own Fresnel and the sky's diffuse 0.066; the sun then falls along its refracted
 * path, e^{−K z/μ_w}, μ_w the refracted cosine, and the sky along 1.2× the depth (the prototype's `uwDownwelling`).
 */
export function downwelling(sun: number, sunCosine: number, sky: number, diffuse: number, depth: number): number {
  const mu = Math.max(0, sunCosine);
  const sunIn = sun * mu * (1 - schlickFresnel(mu));
  const skyIn = sky * (1 - DIFFUSE_FRESNEL);
  return sunIn * Math.exp((-diffuse * Math.max(0, depth)) / refractedCosine(mu)) + skyIn * Math.exp(-DIFFUSE_STRETCH * diffuse * Math.max(0, depth));
}

/**
 * CPU twin of the Rich underside for one grey channel: what the eye sees looking `looking` (up) at a surface with unit
 * normal `normalDown`: inside the window the sky, `sky(direction)`, times n² (1 − F), plus the water mirrored by F;
 * beyond it, past the critical angle, total internal reflection mirrors the water, `mirror`.
 */
export function undersideRadiance(looking: Vector3, normalDown: Vector3, sky: (direction: Vector3) => number, mirror: number): number {
  const out = refractOut(looking, normalDown);
  if (out.lengthSq() < 0.5) return mirror;
  const cosine = out.dot(normalDown.clone().negate());
  return schlickFresnel(cosine) * mirror + windowGain(cosine) * sky(out);
}

/** The water's own radiance along a mirrored ray `mu` below the horizontal (< 0), over its level radiance: (1/7)^{−μ}. */
export function mirroredWaterShape(mu: number): number {
  return (1 / LEVEL_OVER_NADIR) ** -Math.min(-MIRROR_FLOOR, mu);
}

/**
 * The foam seen from below as a ceiling (the plume's whiteness): two-stream transmission, 1 / (1 + 0.75 (1 − g) τ) with
 * g = 0.85, of a plume of void fraction `air` over `depth` metres.
 */
export function plumeTransmission(air: number, depth: number): number {
  return 1 / (1 + 0.75 * 0.15 * PLUME_OPTICAL_DEPTH * air * depth);
}

/**
 * The surface seen from below, in the Rich look only, spliced after the foam composition inside `waterBodyFragment`'s
 * block (underwater.md items 1–2, decided 2026-09-29; the prototype in notes/round5-underwater). For a back face seen by
 * an eye under the water (`richUnderwater`, set per water for the camera about to draw it), the view ray is refracted
 * out of the water (n = 1.333). Inside the 48.6° critical angle it shows the sky from the environment times n² (1 − F)
 * (radiance gains n² entering the denser medium) and the sun as a small bright disc; beyond it, and for the reflected
 * share inside, the surface mirrors the water: its own radiance (R∞ under the light just below the surface, level 7
 * times the nadir's, Tyler 1960) and, where the water is shallow, the bed under the light that reaches it
 * (`downwelling`). Foam and plume glow as a ceiling lit from above (diffusers pass light in every direction, so the whole
 * ceiling, window or not). The environment is three's, so no texture is new; the fog stays inside the material and is
 * set elsewhere. `plume`: the tank's, which carries the bubble plume (`vWaterAir`); the far ocean has none.
 */
export function richUndersideFragment(plume: boolean): string {
  const eta = WATER_IOR.toFixed(3);
  return /* glsl */ `
  if ( richUnderwater > 0.5 && faceDirection < 0.0 ) {
    vec3 richUp = -waterN;
    vec3 richOut = refract( -waterV, waterN, ${eta} );
    // The light just under a level surface: the sun and the sky, each after its Fresnel (the sky's colour is the scene's).
    float richSunUp = max( waterSunDirection.y, 0.0 );
    vec3 richSkyDown = getAmbientLightIrradiance( ambientLightColor );
    #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
      richSkyDown += getIBLIrradiance( ( viewMatrix * vec4( 0.0, 1.0, 0.0, 0.0 ) ).xyz );
    #endif
    vec3 richSunIn = waterSunRadiance * richSunUp * ( 1.0 - waterFresnel( richSunUp ) );
    vec3 richSkyIn = richSkyDown * ${(1 - DIFFUSE_FRESNEL).toFixed(3)};
    vec3 richBelow = richSunIn + richSkyIn;
    // The water mirrored: its own radiance along the mirrored ray, and the bed where the water is shallow, under the light
    // that reaches it: the sun down its refracted path, the sky down its diffuse one.
    vec3 richMirrorDir = reflect( -waterV, waterN );
    richMirrorDir.y = min( richMirrorDir.y, -${MIRROR_FLOOR.toFixed(2)} );
    vec3 richWater = ${LEVEL_OVER_NADIR.toFixed(1)} * waterDeepReflectance * richBelow / PI * pow( ${(1 / LEVEL_OVER_NADIR).toFixed(4)}, -richMirrorDir.y );
    float richBedPath = vWaterDepth / max( ${BED_RAY_FLOOR.toFixed(2)}, -richMirrorDir.y );
    vec3 richBedLight = richSunIn * exp( -waterDiffuseAttenuation * vWaterDepth / waterRefractedCosine( richSunUp ) )
      + richSkyIn * exp( -waterDiffuseAttenuation * ${DIFFUSE_STRETCH.toFixed(1)} * vWaterDepth );
    vec3 richMirror = mix( richWater, waterBedAlbedo * richBedLight / PI, exp( -waterAttenuation * richBedPath ) );
    vec3 richCeiling = richMirror;
    if ( dot( richOut, richOut ) > 0.5 ) {
      float richF = waterFresnel( dot( richOut, richUp ) );
      vec3 richSky = richSkyDown / PI;
      #if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
        richSky = textureCubeUV( envMap, envMapRotation * richOut, 0.0 ).rgb * envMapIntensity;
      #endif
      richSky += waterSunRadiance * pow( max( 0.0, dot( richOut, waterSunDirection ) ), ${SUN_LOBE.toFixed(1)} ) * ${((SUN_LOBE + 1) / (2 * Math.PI)).toFixed(3)};
      richCeiling = richF * richMirror + ( 1.0 - richF ) * ${(WATER_IOR * WATER_IOR).toFixed(3)} * richSky;
    }${plume ? `
    float richTau = ${PLUME_OPTICAL_DEPTH.toFixed(1)} * vWaterAir * min( vWaterPlumeDepth, vWaterDepth );
    richCeiling = mix( richCeiling, waterFoamColor * richBelow / PI / ( 1.0 + ${(0.75 * 0.15).toFixed(4)} * richTau ), waterPlume );` : ''}
    richCeiling = mix( richCeiling, waterFoamColor * ${FOAM_TRANSMITTANCE.toFixed(2)} * richBelow / PI, waterCover );
    diffuseColor.rgb = vec3( 0.0 );
    totalEmissiveRadiance = richCeiling;
  }`;
}

/** Rich: no sky reflection on a surface seen from below (the underside shows the sky through the window instead), after `RICH_REFLECTION`. */
export const RICH_UNDERSIDE_REFLECTION = /* glsl */ `
#if defined( RE_IndirectSpecular )
  if ( richUnderwater > 0.5 && faceDirection < 0.0 ) radiance = vec3( 0.0 );
#endif`;
