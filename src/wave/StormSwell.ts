import { GRAVITY } from './dispersion';
import { SPECTRUM_RANGE, bandwidthWindow, jonswapShape } from './SeaState';

/** Storm-mode inputs (plan Q22): the wind field that raised the swell and how far away it blew. */
export interface StormParams {
  /** Wind speed at 10 m over the fetch, m/s. */
  windSpeed: number;
  fetchKm: number;
  durationHours: number;
  /** Distance from the storm to the spot, km; 0 means the spot sits in the storm. */
  distanceKm: number;
}

export type StormGrowth = 'fetch-limited' | 'duration-limited' | 'fully developed';

export interface StormSwell {
  growth: StormGrowth;
  /** Hs in the storm, m. */
  stormHeight: number;
  /** Tp in the storm, s. */
  stormPeriod: number;
  /** Hs of the swell arriving at the spot, m. */
  significantHeight: number;
  /** Tp at the spot, s: the storm's peak, which leads the energy. */
  peakPeriod: number;
  /** cos-2s exponent at the spot. */
  spreading: number;
  /** Relative width Δω/ω_p of the frequencies arriving together; Infinity inside the storm. */
  bandwidth: number;
  /** Travel time of the peak energy, R / c_g, hours. */
  travelHours: number;
}

/**
 * Fetch-limited JONSWAP growth in U10 (Hasselmann et al. 1973): g Hs/U² = 1.6e-3 X^½
 * and g Tp/U = X^⅓/3.5 = 0.2857 X^⅓, with X = gF/U². The CEM's u*-based fit
 * (II-2-36) gives a similar Hs but a Tp about 20 % shorter; the plan keeps
 * JONSWAP with a Pierson–Moskowitz cap (Q22).
 */
const FETCH_HEIGHT = 1.6e-3;
const FETCH_PERIOD = 0.2857;
/** Fully developed Pierson–Moskowitz sea in U10: Hs ≈ 0.21 U19.5²/g ≈ 0.22 U10²/g. */
export const FULLY_DEVELOPED_HEIGHT = 0.22;
/** PM peak ω_p = 0.877 g / U19.5, with U19.5 ≈ 1.026 U10, as g Tp / U10. */
export const FULLY_DEVELOPED_PERIOD = (2 * Math.PI * 1.026) / 0.877;
/** Dimensionless fetch at which the fetch-limited Hs reaches the PM value. */
const FULLY_DEVELOPED_FETCH = (FULLY_DEVELOPED_HEIGHT / FETCH_HEIGHT) ** 2;
/**
 * Duration-limited growth as an equivalent fetch, from the time a fetch needs to
 * grow its sea (USACE CEM EM 1110-2-1100 II-2-35, in U10; its worked example
 * II-2-9 reproduces): g t/U10 = 77.23 X^0.67. The older SPM 68.8 X^⅔ uses the
 * adjusted wind U_A, and CEM II-2-38 (in u*) gives an equivalent fetch about
 * 20 % shorter.
 */
const DURATION_GROWTH = 77.23;
const DURATION_EXPONENT = 0.67;
/** cos-2s exponent of the wind sea in the storm (the Wave Lab's windswell end). */
const STORM_SPREADING = 4;
/** Narrowest delivered spread: Goda's s_max for swell with a long decay distance. */
const MAX_SPREADING = 75;

/** Circular standard deviation of cos^{2s}(θ/2), √(2/(s+1)) rad, and its inverse. */
function spreadAngle(spreading: number): number {
  return Math.sqrt(2 / (spreading + 1));
}

/** Share of the JONSWAP energy inside the dispersion window of relative width `bandwidth`. */
function bandShare(bandwidth: number): number {
  if (!Number.isFinite(bandwidth)) return 1;
  const samples = 2048;
  const step = (SPECTRUM_RANGE.high - SPECTRUM_RANGE.low) / (samples - 1);
  let total = 0;
  let inside = 0;
  for (let index = 0; index < samples; index += 1) {
    const omega = SPECTRUM_RANGE.low + index * step;
    const weight = index === 0 || index === samples - 1 ? 0.5 : 1;
    const density = weight * jonswapShape(omega, 1);
    total += density;
    inside += density * bandwidthWindow(omega, 1, bandwidth);
  }
  return inside / total;
}

/**
 * Buoy values from a storm (plan §1.2, Q22). Growth: fetch-limited JONSWAP, with
 * the duration converted to an equivalent fetch and both capped by a fully
 * developed PM sea. Travel: energy moves at the deep-water group speed g T/4π,
 * and at distance R the spot only sees the waves that left the storm's fetch F
 * during its duration D, so the frequencies arriving together span
 * Δω/ω = (F + c_g D)/R and the directions span the storm's angular width W/R
 * (W = F, a round storm). Spectral density is conserved along rays, so Hs
 * falls by the share of the storm spectrum inside those two windows. Both
 * windows are Gaussians with the top-hat's standard deviation (width/√12).
 * Swell dissipation over distance is left out.
 */
export function stormSwell(storm: StormParams): StormSwell {
  const wind = Math.max(1, storm.windSpeed);
  const fetch = Math.max(1, storm.fetchKm * 1000);
  const duration = Math.max(1, storm.durationHours * 3600);
  const distance = Math.max(0, storm.distanceKm * 1000);
  const fetchLimit = (GRAVITY * fetch) / (wind * wind);
  const durationLimit = Math.pow((GRAVITY * duration) / (DURATION_GROWTH * wind), 1 / DURATION_EXPONENT);
  const effective = Math.min(fetchLimit, durationLimit);
  const growth: StormGrowth = effective >= FULLY_DEVELOPED_FETCH ? 'fully developed'
    : durationLimit < fetchLimit ? 'duration-limited' : 'fetch-limited';
  const stormHeight = (Math.min(FETCH_HEIGHT * Math.sqrt(effective), FULLY_DEVELOPED_HEIGHT) * wind * wind) / GRAVITY;
  const stormPeriod = (Math.min(FETCH_PERIOD * Math.cbrt(effective), FULLY_DEVELOPED_PERIOD) * wind) / GRAVITY;
  const groupSpeed = (GRAVITY * stormPeriod) / (4 * Math.PI);
  const bandwidth = distance > 0 ? (fetch + groupSpeed * duration) / (distance * Math.sqrt(12)) : Infinity;
  const sourceAngle = spreadAngle(STORM_SPREADING);
  const stormAngle = distance > 0 ? fetch / (distance * Math.sqrt(12)) : Infinity;
  const arrivalAngle = Number.isFinite(stormAngle) ? (sourceAngle * stormAngle) / Math.hypot(sourceAngle, stormAngle) : sourceAngle;
  const energy = bandShare(bandwidth) * (arrivalAngle / sourceAngle);
  return {
    growth,
    stormHeight,
    stormPeriod,
    significantHeight: stormHeight * Math.sqrt(energy),
    peakPeriod: stormPeriod,
    spreading: Math.min(MAX_SPREADING, 2 / (arrivalAngle * arrivalAngle) - 1),
    bandwidth,
    travelHours: distance / groupSpeed / 3600,
  };
}
