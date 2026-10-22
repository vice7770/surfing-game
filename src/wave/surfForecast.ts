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
  // Refitted on canyon-long-wave's planar arm (2026-10-22) by the same runs as on 2026-09-27: Hs 1, 2 and 3 m at 14 s,
  // given at the edge, seed 1, 240 s each, at today's take-off (1.50 + 1.00 Hs deep). Its take-off faces grow only as
  // about Hs^0.4, and less with the period than Tp^0.4: at the game's own swells the take-off measures Small 1.85,
  // Medium 2.41 and Big 2.96 m (H1/3), where this fit says 1.26, 1.94 and 3.29 m, so the Surf screen shows those
  // measured faces (SWELL_SURF) and this curve serves every other sea (the Wave Lab's sliders).
  canyon: { a: 0.5677, sets: 1.110 },
  // Fitted by the size report on Padang Padang's calibrated swells, Medium and Big at the take-offs that follow their
  // breaks (its plan, Task 8, 2026-09-30).
  padang: { a: 0.6318, sets: 1.080 },
  // The Wave Pool's faces are its sizes (POOL_FACES); this fit only turns the Wave Lab's sliders into a line, through
  // Medium's face (1.25 m from Hs 1.27 m at 10 s), with every wave the same.
  pool: { a: 0.41, sets: 1 },
};

/** The practice groundswell's measured surf at each spot's take-off (the size report, 2026-09-27). */
export const PRACTICE_SURF: Record<SpotName, SurfForecast> = {
  beach: { typical: 1.43, sets: 1.52 },
  point: { typical: 2.27, sets: 2.39 },
  reef: { typical: 2.08, sets: 2.27 },
  // Re-measured on canyon-long-wave's planar arm (2026-10-22).
  canyon: { typical: 2.25, sets: 2.31 },
  // Padang Padang's own practice groundswell, measured by the size report (its plan, Task 8, 2026-09-30).
  padang: { typical: 2.22, sets: 2.35 },
  // The Wave Pool has no practice groundswell: Practice rides its Medium size.
  pool: { typical: 1.25, sets: 1.25 },
};

/**
 * A spot's own Small, Medium and Big swells' surf as measured at its take-off, where its forecast's power law can't
 * follow them (the size report's `--swells` runs, docs/research/sizes/<spot>-swell-<size>.json): the Surf screen shows
 * these, as it does PRACTICE_SURF and the Wave Pool's faces.
 */
export const SWELL_SURF: Partial<Record<SpotName, Record<'small' | 'medium' | 'big', SurfForecast>>> = {
  // The Canyon's planar arm (2026-10-22): seed 1, 240 s each, 44, 30 and 23 waves at the take-off.
  canyon: {
    small: { typical: 1.85, sets: 2.10 },
    medium: { typical: 2.41, sets: 2.68 },
    big: { typical: 2.96, sets: 3.20 },
  },
};

/** The surf a buoy swell will make at a spot, from its calibrated fit. */
export function forecastSurf(spot: SpotName, significantHeight: number, period: number): SurfForecast {
  const { a, sets } = SURF_FORECAST[spot];
  const typical = a * significantHeight ** 0.8 * period ** 0.4;
  return { typical, sets: Math.max(1, sets) * typical };
}
