import { Vector3 } from 'three';
import {
  BED_RAY_FLOOR, WATER_ABSORPTION, WATER_IOR, applyOptics, backscattering, particleAbsorption, type OpticsUniforms, type Rgb, type WaterOptics,
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
