/**
 * Dev only: the cases the GPU check page's tier modes run (src/dev/tierParityPage.ts), and the Node script that
 * runs their CPU half (scripts/tier-cpu.ts): each surf zone as the game builds it, with no DOM in sight.
 */
import { DEFAULT_PHYSICAL_SETTINGS, GPU_TIER_COMPONENTS, swellFor, type PhysicalSettings } from '../game/PhysicalMode';
import { physicalSettingsFor, type SwellSize } from '../game/SurfConditions';
import type { SpotName } from '../wave/Bathymetry';
import { SURF_ZONE_STEP } from '../wave/SurfZoneRunner';
import type { SurfZoneConfig } from '../wave/SurfZoneSimulation';

/** One run: its sea, 'game' (the game's runner at SURF_ZONE_STEP, with its spray) or 'probe' (the bare surf zone at `step`), and how long after the spin-up. */
export interface TierCase {
  name: string;
  config: SurfZoneConfig;
  shape: 'game' | 'probe';
  step: number;
  seconds: number;
  /** The fastest water its CI probe allows, m/s. */
  guard?: number;
}

/** The surf zone the game builds for these settings (as PhysicalMode.start does), on a sea of `components`. */
export function gameConfig(settings: PhysicalSettings, seed: number, components: number): SurfZoneConfig {
  const swell = swellFor(settings);
  return {
    spot: settings.spot, seed, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
    directionDegrees: swell.directionDegrees ?? settings.directionDegrees, spreading: swell.spreading, bandwidth: swell.bandwidth,
    tide: settings.tide, windSpeed: settings.windSpeed, stage: 2,
    ...(settings.source === 'practice' ? { heightAt: 'edge' as const } : {}),
    componentCount: components,
  };
}

/** A Surf screen choice at mid tide in calm air. */
const surfScreen = (spot: SpotName, swell: SwellSize) => physicalSettingsFor(spot, { swell, tide: 'mid', wind: 'calm', time: 'midday' }, { stage: 2, compute: 'auto' });
/** The Wave Lab's default swell (buoy Hs 1.4 m, Tp 10 s, from 10°) at a spot. */
const labDefault = (spot: SpotName): PhysicalSettings => ({ ...DEFAULT_PHYSICAL_SETTINGS, spot });

export const PARITY_CASES: Record<string, () => PhysicalSettings> = {
  beach: () => labDefault('beach'),
  point: () => labDefault('point'),
  reef: () => labDefault('reef'),
  canyon: () => labDefault('canyon'),
  'reef-practice': () => surfScreen('reef', 'practice'),
  'reef-big': () => surfScreen('reef', 'big'),
  'reef-small': () => surfScreen('reef', 'small'),
  'reef-medium': () => surfScreen('reef', 'medium'),
  'beach-practice': () => surfScreen('beach', 'practice'),
  'point-practice': () => surfScreen('point', 'practice'),
  'canyon-practice': () => surfScreen('canyon', 'practice'),
};
export const DEFAULT_PARITY = ['beach', 'point', 'reef', 'canyon', 'reef-practice', 'reef-big'];

/** The Reef's CI stability probes (SurfZoneSimulation.test.ts, "the steep Reef holds"): the Big swell in a 40 m window, seed 3, 1/30 s steps for 45 s. */
const CI_PROBE: SurfZoneConfig = {
  spot: 'reef', seed: 3, significantHeight: 3, peakPeriod: 17, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 12, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};
const ciProbe = (name: string, overrides: Partial<SurfZoneConfig>, guard: number): TierCase => ({
  name, config: { ...CI_PROBE, ...overrides }, shape: 'probe', step: 1 / 30, seconds: 45, guard,
});
/** The Reef report's game-size probes: the Big swell on the GPU tier's sea (64 components) in the game's window, 45 s. */
const gameProbe = (name: string, overrides: Partial<SurfZoneConfig>, seconds = 45): TierCase => ({
  name, config: { ...gameConfig(surfScreen('reef', 'big'), 3, GPU_TIER_COMPONENTS), ...overrides }, shape: 'game', step: SURF_ZONE_STEP, seconds,
});

export const PROBE_CASES: Record<string, () => TierCase> = {
  'ci-big': () => ciProbe('ci-big', {}, 30),
  'ci-low': () => ciProbe('ci-low', { tide: -0.6 }, 30),
  'ci-minus': () => ciProbe('ci-minus', { directionDegrees: -25, alongShore: 60 }, 20),
  'ci-plus': () => ciProbe('ci-plus', { directionDegrees: 25, alongShore: 60 }, 20),
  'ci-lagoon': () => ciProbe('ci-lagoon', { tide: -1, alongShore: 60 }, 30),
  'ci-edge': () => ciProbe('ci-edge', { directionDegrees: 25 }, 30),
  'game-big': () => gameProbe('game-big', {}),
  'game-low': () => gameProbe('game-low', { tide: -0.6 }),
  'game-lower': () => gameProbe('game-lower', { tide: -1 }),
  'game-minus': () => gameProbe('game-minus', { directionDegrees: -25 }),
  'game-plus': () => gameProbe('game-plus', { directionDegrees: 25 }),
  // The open edge's offshore peak (Hs 3 m at the edge, 18 s, tide +1, seed 3, the default sea; ~21 m/s at t ≈ 95 s on the CPU).
  'edge-offshore': () => gameProbe('edge-offshore', { significantHeight: 3, heightAt: 'edge', peakPeriod: 18, tide: 1, componentCount: 24 }, 100),
};
export const DEFAULT_PROBES = Object.keys(PROBE_CASES);

export function describeConfig(config: SurfZoneConfig): string {
  const window = config.alongShore ? `, ${config.alongShore} m window` : '';
  return `${config.spot}, Hs ${config.significantHeight} m${config.heightAt === 'edge' ? ' at the edge' : ''}, Tp ${config.peakPeriod} s, from ${config.directionDegrees}°, `
    + `s ${config.spreading.toFixed(1)}${config.bandwidth ? `, band ${config.bandwidth}` : ''}, tide ${config.tide} m, `
    + `${config.componentCount ?? 24} components, seed ${config.seed}${window}`;
}

/** A parity case (PARITY_CASES) as a run of the game's runner, or undefined for an unknown name. */
export function parityCase(name: string, seed: number, components: number, seconds: number): TierCase | undefined {
  const settings = PARITY_CASES[name]?.();
  return settings && { name, config: gameConfig(settings, seed, components), shape: 'game', step: SURF_ZONE_STEP, seconds };
}
