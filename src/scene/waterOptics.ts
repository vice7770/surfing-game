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

export interface WaterOptics {
  /** Suspended-particle scattering, m⁻¹. Spectrally flat, it adds to the beam attenuation and backscatters 1.83 %. */
  readonly turbidity: number;
  /** Seabed albedo, linear RGB. */
  readonly bedAlbedo: Rgb;
}

/**
 * Water per spot. Particle beam attenuation runs from about 0.01 m⁻¹ offshore to
 * 0.5–2.5 m⁻¹ and more in turbid coastal water; these keep the bed readable a few
 * metres down, clearest over the reef's carbonate sand.
 */
export const SPOT_OPTICS: Record<SpotName, WaterOptics> = {
  beach: { turbidity: 0.3, bedAlbedo: [0.42, 0.36, 0.24] },
  point: { turbidity: 0.18, bedAlbedo: [0.36, 0.33, 0.24] },
  reef: { turbidity: 0.06, bedAlbedo: [0.5, 0.47, 0.36] },
  canyon: { turbidity: 0.2, bedAlbedo: [0.42, 0.36, 0.24] },
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

/** Beam attenuation c = a_w + turbidity, m⁻¹. */
export function beamAttenuation(optics: WaterOptics): Rgb {
  return perChannel((i) => WATER_ABSORPTION[i] + optics.turbidity);
}

/** Share of light left after `path` metres of water, e^{−c·path} (Beer–Lambert). */
export function transmittance(optics: WaterOptics, path: number): Rgb {
  const attenuation = beamAttenuation(optics);
  return perChannel((i) => Math.exp(-attenuation[i] * path));
}

/** Reflectance of bottomless water just below the surface, R∞ = 0.33 b_b/(a + b_b) (Morel & Prieur 1977). */
export function deepReflectance(optics: WaterOptics): Rgb {
  return perChannel((i) => {
    const backscatter = WATER_BACKSCATTER[i] + PARTICLE_BACKSCATTER_FRACTION * optics.turbidity;
    return (0.33 * backscatter) / (WATER_ABSORPTION[i] + backscatter);
  });
}

/**
 * Reflectance of water `depth` metres deep over the seabed, R = R∞ + (A − R∞)·T
 * (Maritorena, Morel & Gentili 1994), with T the beam transmittance along the
 * refracted sun path down and view path up.
 */
export function shallowReflectance(optics: WaterOptics, depth: number, viewCosine: number, sunCosine: number): Rgb {
  const path = Math.max(0, depth) * (1 / refractedCosine(viewCosine) + 1 / refractedCosine(sunCosine));
  const deep = deepReflectance(optics);
  const through = transmittance(optics, path);
  return perChannel((i) => deep[i] + (optics.bedAlbedo[i] - deep[i]) * through[i]);
}

export interface Point3 { x: number; y: number; z: number }

/** Distances along the refracted view ray where the shader samples the surface, m (plan §2.3: 2–4 lookups). */
export const CREST_SAMPLES = [0.5, 1, 2, 4] as const;
/** Thickness reported when the ray is still under water after the last sample. */
export const OPAQUE = 1e4;

/**
 * Water a refracted view ray entering at `origin` crosses before it leaves the
 * back of a crest, interpolating the surface crossing between samples.
 */
export function crestThickness(heightAt: (x: number, z: number) => number, origin: Point3, direction: Point3): number {
  let previous = 0;
  let previousGap = 0;
  for (const distance of CREST_SAMPLES) {
    const gap = heightAt(origin.x + direction.x * distance, origin.z + direction.z * distance) - (origin.y + direction.y * distance);
    if (gap <= 0) return previous + ((distance - previous) * previousGap) / (previousGap - gap);
    previous = distance;
    previousGap = gap;
  }
  return OPAQUE;
}
