import { devParam } from '../../devTools';
import { poolRefOn } from '../../wave/pool';
import { GLOW } from '../glowMath';
import { RICH_WATER } from './richWaterGlsl';
import type { WaterLook } from './waterLook';

/**
 * The "water light" (ruling 25e, 2026-11-12, `docs/research/pool-look-reference-2026-11-11/ruling-25.md` and
 * `foam-light/README.md`): the Rich water's body gain 4 → 1 and the display exposure 1.05 → 1.6, as one change.
 *
 * Why: over the pool's pale floor the body reflectance is (0.18, 0.55, 0.66); × 4 the water's albedo is above 1, so
 * it sends back more light than falls on it and out-shines its own foam. Gain 1 is the reflectance just under the
 * surface. The exposure then lifts the whole frame, as a camera exposing for the darker water, so the foam reaches
 * white. The sky photo is not tone mapped and does not change.
 *
 * Reach: on in the 2 m pool (`?poolSize=ref`, `poolRefOn`) with no parameter of its own; `?waterLight=on` turns it on
 * at any other spot, `?waterLight=off` off in the pool (A/Bs). Every other sea draws exactly as before. Online rooms
 * pin the switch absent (and `poolSize` too), so a room draws the default. Drawing only: nothing the solver, the rider
 * or the foam field reads changes.
 *
 * Rich only (the advisor, step 17 review): in the Classic look (the Low preset's) neither the gain nor the exposure
 * changes, so Classic draws exactly as before. Under the glow (AgX grade, its own exposure) the grade's exposure is
 * scaled by the same ratio, 1.6 / 1.05, so the water at gain 1 is not left dark there (`WaterLightState`).
 */
export const WATER_LIGHT = { bodyGain: 1, exposure: 1.6 } as const;

/** The display exposure without the water light (`src/main.ts`, NeutralToneMapping). */
export const DISPLAY_EXPOSURE = 1.05;

export type WaterLightSwitch = 'on' | 'off';

/** The `?waterLight=on|off` dev switch (`SurfZoneConfig.waterLight`); anything else: absent (the spot's default). */
export function waterLightSwitch(search?: string): { waterLight?: WaterLightSwitch } {
  const value = devParam('waterLight', search)?.trim().toLowerCase();
  return value === 'on' || value === 'off' ? { waterLight: value } : {};
}

/** Whether a sea draws with the water light: the switch if given, else the 2 m pool alone. */
export function waterLightOn(config: (Parameters<typeof poolRefOn>[0] & { waterLight?: WaterLightSwitch }) | undefined): boolean {
  if (!config) return false;
  if (config.waterLight !== undefined) return config.waterLight === 'on';
  return poolRefOn(config);
}

/**
 * The Rich body gain as one shared uniform: the lip and spray sheets bind this object itself, so one write reaches
 * every sheet already drawn. The sea and the far field copy it into their own (shared with Classic) on a look change
 * and on `refreshBodyGain`.
 */
export const richBodyGain: { value: number } = { value: RICH_WATER.bodyGain };

/** What the frame draws with: the Rich body gain, the canvas's exposure and the glow's (AgX) exposure. */
export interface WaterLightState {
  /** The light in effect: wanted by the sea's config and the Rich look drawn. */
  on: boolean;
  gain: number;
  exposure: number;
  glowExposure: number;
}

/** The light in effect for a sea that wants it (`waterLightOn`) and the look drawn: Rich alone. */
export function waterLightState(wanted: boolean, look: WaterLook | undefined): WaterLightState {
  const on = wanted && look === 'rich';
  return {
    on,
    gain: on ? WATER_LIGHT.bodyGain : RICH_WATER.bodyGain,
    exposure: waterLightExposure(on),
    glowExposure: on ? GLOW.exposure * (WATER_LIGHT.exposure / DISPLAY_EXPOSURE) : GLOW.exposure,
  };
}

/** Set the water light's gain (the caller sets the exposure: `waterLightExposure`). */
export function setWaterLight(on: boolean): void {
  richBodyGain.value = on ? WATER_LIGHT.bodyGain : RICH_WATER.bodyGain;
}

/** The display exposure with the water light on or off. */
export function waterLightExposure(on: boolean): number {
  return on ? WATER_LIGHT.exposure : DISPLAY_EXPOSURE;
}
