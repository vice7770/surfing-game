import type { SpotName } from './Bathymetry';
import { GRAVITY } from './dispersion';

/** H1/10 over H1/3 in a Rayleigh sea (docs/research/surf-size-sources.md). */
export const SETS_OVER_TYPICAL = 1.27;
const FEET_PER_METRE = 3.28084;

/** Komar & Gaughan's breaker height from a deep-water height and period, m: H_b = 0.39 g^0.2 (T H0²)^0.4. */
export function komarGaughan(significantHeight: number, period: number): number {
  return 0.39 * GRAVITY ** 0.2 * (period * significantHeight ** 2) ** 0.4;
}

/**
 * Caldwell & Aucan's (2007) surf for Hawaii's highest-refraction outer reefs, an H1/10, m: the shoaling-only
 * breaker height H_b = H0^(4/5) (√g P / 4π)^(2/5) times their refraction K_r(H_b) (H_b in feet, 2.145 above 21 ft).
 */
export function caldwellAucan(significantHeight: number, period: number): number {
  const shoaled = significantHeight ** 0.8 * ((Math.sqrt(GRAVITY) * period) / (4 * Math.PI)) ** 0.4;
  const feet = shoaled * FEET_PER_METRE;
  const refraction = feet > 21 ? 2.145 : -0.0003 * feet ** 3 + 0.0099 * feet ** 2 - 0.025 * feet + 1.0747;
  return shoaled * refraction;
}

/** The surf a swell makes: the typical face (H1/3) and the sets (H1/10), m. */
export interface SurfForecast {
  typical: number;
  sets: number;
}

/** A spot's forecast in the Komar–Gaughan form: H1/3 = a Hs^0.8 Tp^0.4, and the sets `sets` times that. */
export interface ForecastFit {
  a: number;
  sets: number;
}

/** Least squares in log space of measured runs to the Komar–Gaughan form. */
export function fitForecast(runs: readonly { significantHeight: number; period: number; typical: number; sets: number }[]): ForecastFit {
  const usable = runs.filter((run) => run.typical > 0 && run.sets > 0);
  const logA = usable.reduce((sum, run) => sum + Math.log(run.typical / (run.significantHeight ** 0.8 * run.period ** 0.4)), 0) / usable.length;
  const logSets = usable.reduce((sum, run) => sum + Math.log(run.sets / run.typical), 0) / usable.length;
  return { a: Math.exp(logA), sets: Math.exp(logSets) };
}

/**
 * Each spot's forecast, fitted by the size report on the tank (`npm run report:sizes`) to the surf at the
 * take-off, which the game's readout measures, at mid tide with the Wave Lab's default direction and spread:
 * today's tank (Part A, 2026-09-27; Komar–Gaughan's a is 0.616).
 */
export const SURF_FORECAST: Record<SpotName, ForecastFit> = {
  beach: { a: 0.3153, sets: 1.111 },
  point: { a: 0.4772, sets: 1.056 },
  reef: { a: 0.5125, sets: 1.184 },
  canyon: { a: 0.4994, sets: 1.110 },
  // Fitted by the size report on Padang Padang's calibrated swells (its plan, Task 8, 2026-09-30).
  padang: { a: 0.6419, sets: 1.076 },
};

/** The practice groundswell's measured surf at each spot's take-off (the size report, 2026-09-27). */
export const PRACTICE_SURF: Record<SpotName, SurfForecast> = {
  beach: { typical: 1.43, sets: 1.52 },
  point: { typical: 2.27, sets: 2.39 },
  reef: { typical: 2.08, sets: 2.27 },
  canyon: { typical: 2.85, sets: 3.08 },
  // Padang Padang's own practice groundswell, measured by the size report (its plan, Task 8, 2026-09-30).
  padang: { typical: 2.22, sets: 2.35 },
};

/** The surf a buoy swell will make at a spot, from its calibrated fit. */
export function forecastSurf(spot: SpotName, significantHeight: number, period: number): SurfForecast {
  const { a, sets } = SURF_FORECAST[spot];
  const typical = a * significantHeight ** 0.8 * period ** 0.4;
  return { typical, sets: Math.max(1, sets) * typical };
}
