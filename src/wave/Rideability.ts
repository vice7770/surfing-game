import { MIXED_PEAK_FIT, PEEL_SKILL_MINIMUM } from './Breaking';
import { SurfZoneSimulation, type SurfZoneConfig } from './SurfZoneSimulation';

export interface PeelSample {
  angleDegrees: number;
  /** r² of the onset-time fit. */
  fit: number;
}

type RiderSkill = keyof typeof PEEL_SKILL_MINIMUM;

export interface RideabilityStats {
  /** Peak periods sampled. */
  samples: number;
  /** Samples with a measured break. */
  waves: number;
  /** Shares of `waves`. */
  closeout: number;
  mixed: number;
  /** Share of waves a rider of each skill can make (cumulative toward professional). */
  makeable: Record<RiderSkill, number>;
  /** Clean waves per 10° bin of peel angle, 0–90°. */
  histogram: number[];
  /** Median peel angle of clean waves, degrees (NaN without any). */
  medianAngle: number;
}

/**
 * Rideability statistics (plan §4 item 11, Q13). A wave is makeable by a skill
 * level when its peel angle reaches that level's minimum (Hutt, Black & Mead
 * 2001), a close-out when it is below the professional 27°, and "mixed" when
 * the onset fit reads several peaks at once.
 */
export function rideability(samples: readonly (PeelSample | undefined)[]): RideabilityStats {
  const waves = samples.filter((sample): sample is PeelSample => sample !== undefined);
  const clean = waves.filter((wave) => wave.fit >= MIXED_PEAK_FIT).map((wave) => wave.angleDegrees).sort((a, b) => a - b);
  const share = (count: number) => (waves.length > 0 ? count / waves.length : 0);
  const atLeast = (minimum: number) => share(clean.filter((angle) => angle >= minimum).length);
  const histogram = new Array<number>(9).fill(0);
  for (const angle of clean) histogram[Math.min(8, Math.floor(angle / 10))] += 1;
  const middle = clean.length >> 1;
  return {
    samples: samples.length,
    waves: waves.length,
    closeout: share(clean.filter((angle) => angle < PEEL_SKILL_MINIMUM.professional).length),
    mixed: share(waves.length - clean.length),
    makeable: {
      beginner: atLeast(PEEL_SKILL_MINIMUM.beginner),
      intermediate: atLeast(PEEL_SKILL_MINIMUM.intermediate),
      advanced: atLeast(PEEL_SKILL_MINIMUM.advanced),
      professional: atLeast(PEEL_SKILL_MINIMUM.professional),
    },
    histogram,
    medianAngle: clean.length === 0 ? Number.NaN : clean.length % 2 ? clean[middle] : 0.5 * (clean[middle - 1] + clean[middle]),
  };
}

export interface RideabilityRun {
  samples: (PeelSample | undefined)[];
  stats: RideabilityStats;
  simulatedSeconds: number;
  lipLaunches: number;
  /** Mean share of the surf zone breaking at the sample times. */
  breakingFraction: number;
}

/** Run a surf zone for `periods` peak periods after its spin-up and sample the peel once per period. */
export function measureRideability(config: SurfZoneConfig, options: { periods: number; step?: number }): RideabilityRun {
  const step = options.step ?? 1 / 30;
  const simulation = new SurfZoneSimulation(config);
  const start = simulation.solver.time;
  const stepsPerPeriod = Math.max(1, Math.round(config.peakPeriod / step));
  const samples: (PeelSample | undefined)[] = [];
  let breaking = 0;
  for (let period = 0; period < options.periods; period += 1) {
    for (let index = 0; index < stepsPerPeriod; index += 1) simulation.step(step);
    const estimate = simulation.peelEstimate();
    samples.push(estimate && { angleDegrees: estimate.angleDegrees, fit: estimate.fit });
    breaking += simulation.breakingFraction();
  }
  return {
    samples,
    stats: rideability(samples),
    simulatedSeconds: simulation.solver.time - start,
    lipLaunches: simulation.lipLaunches,
    breakingFraction: options.periods > 0 ? breaking / options.periods : 0,
  };
}
