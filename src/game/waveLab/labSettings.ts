import type { SpotName } from '../../wave/Bathymetry';
import type { WaterLook } from '../../scene/water/waterLook';
import { DEFAULT_PHYSICAL_SETTINGS, TANK_SWELL_LIMITS, type PhysicalSettings } from '../PhysicalMode';
import { SURF_SPOTS, TIMES, type TimeOfDay } from '../SurfConditions';

/** The Wave Lab's settings (spec L1): the sea, the light and the water look, remembered between visits. */
export interface WaveLabSettings {
  physical: PhysicalSettings;
  /**
   * Which solver and compute run the sea: the graphics settings' (the Auto
   * benchmark's choice, as Surf uses), or `physical.stage` and `physical.compute`
   * as a developer chose them in the panel (dev tools only).
   */
  water: 'graphics' | 'chosen';
  sunHeight: number;
  sunDirection: number;
  waterLook: WaterLook;
}

export const LAB_KEY = 'breakline.wavelab.v1';

export function defaultLabSettings(): WaveLabSettings {
  return {
    physical: { ...DEFAULT_PHYSICAL_SETTINGS, spot: 'canyon', source: 'practice' },
    water: 'graphics',
    ...TIMES.midday,
    waterLook: 'rich',
  };
}

type Loose = Record<string, unknown>;
const record = (value: unknown): Loose => (value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Loose : {});
const oneOf = <T>(value: unknown, allowed: readonly T[], fallback: T): T => (allowed.includes(value as T) ? value as T : fallback);
const within = (value: unknown, min: number, max: number, fallback: number): number =>
  typeof value === 'number' && Number.isFinite(value) ? Math.min(max, Math.max(min, value)) : fallback;

/** Stored lab settings made safe: unknown choices fall back to the defaults, numbers stay on the sliders' ranges. */
export function sanitizeLabSettings(value: unknown): WaveLabSettings {
  const base = defaultLabSettings();
  const raw = record(value);
  const p = record(raw.physical);
  const d = base.physical;
  return {
    physical: {
      spot: oneOf<SpotName>(p.spot, SURF_SPOTS, d.spot),
      stage: oneOf<1 | 2>(p.stage, [1, 2], d.stage),
      compute: oneOf<'auto' | 'cpu'>(p.compute, ['auto', 'cpu'], d.compute),
      source: oneOf<PhysicalSettings['source']>(p.source, ['buoy', 'storm', 'practice'], d.source),
      significantHeight: within(p.significantHeight, TANK_SWELL_LIMITS.height.min, TANK_SWELL_LIMITS.height.max, d.significantHeight),
      peakPeriod: within(p.peakPeriod, TANK_SWELL_LIMITS.period.min, TANK_SWELL_LIMITS.period.max, d.peakPeriod),
      directionDegrees: within(p.directionDegrees, -40, 40, d.directionDegrees),
      spread: within(p.spread, 0, 1, d.spread),
      tide: within(p.tide, -1, 1, d.tide),
      windSpeed: within(p.windSpeed, -12, 12, d.windSpeed),
      stormWindSpeed: within(p.stormWindSpeed, 8, 30, d.stormWindSpeed),
      stormFetchKm: within(p.stormFetchKm, 50, 2000, d.stormFetchKm),
      stormDurationHours: within(p.stormDurationHours, 3, 96, d.stormDurationHours),
      stormDistanceKm: within(p.stormDistanceKm, 0, 10000, d.stormDistanceKm),
    },
    water: oneOf<WaveLabSettings['water']>(raw.water, ['graphics', 'chosen'], base.water),
    sunHeight: within(raw.sunHeight, 0, 1, base.sunHeight),
    sunDirection: within(raw.sunDirection, -180, 180, base.sunDirection),
    waterLook: oneOf<WaterLook>(raw.waterLook, ['classic', 'rich'], base.waterLook),
  };
}

/** Whether a drafted sea differs from the running one (spec L1: those changes wait for Apply); light and look never do. */
export function needsRebuild(running: WaveLabSettings, draft: WaveLabSettings): boolean {
  return running.water !== draft.water
    || (Object.keys(running.physical) as (keyof PhysicalSettings)[]).some((key) => running.physical[key] !== draft.physical[key]);
}

/** The solver and compute the lab's sea runs on: the graphics settings', unless a developer chose them. */
export function labWater(
  settings: WaveLabSettings, graphics: { stage: 1 | 2; compute: 'auto' | 'cpu' }, devTools: boolean,
): { stage: 1 | 2; compute: 'auto' | 'cpu' } {
  return devTools && settings.water === 'chosen' ? { stage: settings.physical.stage, compute: settings.physical.compute } : { ...graphics };
}

/** The preset whose sun this is, or 'custom'. */
export function timeOfDayFor(sun: { sunHeight: number; sunDirection: number }): TimeOfDay | 'custom' {
  const match = (Object.keys(TIMES) as TimeOfDay[]).find((time) =>
    Math.abs(TIMES[time].sunHeight - sun.sunHeight) < 1e-6 && Math.abs(TIMES[time].sunDirection - sun.sunDirection) < 1e-6);
  return match ?? 'custom';
}

/** The applied lab settings, kept in the browser; storage that fails keeps them for this visit only. */
export class LabStore {
  private current: WaveLabSettings;

  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    let stored: unknown;
    try {
      stored = JSON.parse(storage?.getItem(LAB_KEY) ?? 'null');
    } catch {
      stored = null;
    }
    this.current = stored ? sanitizeLabSettings(stored) : defaultLabSettings();
  }

  get value(): WaveLabSettings {
    return this.current;
  }

  save(settings: WaveLabSettings): void {
    this.current = sanitizeLabSettings(settings);
    try {
      this.storage?.setItem(LAB_KEY, JSON.stringify(this.current));
    } catch {
      // Remembered for this visit only.
    }
  }
}
