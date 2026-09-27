import type { RiderPhase } from '../physics/AttachedRider';
import type { RideInput } from '../physics/RideSession';
import type { WaveFrame } from '../physics/waveFrame';
import type { GameplaySettings } from './Settings';
import type { SwellSize } from './SurfConditions';

/**
 * The pocket reflex (the riding-the-wave spec, decision 5): with no weight held,
 * the rider sits back when it has run far from the curl and leans forward when the
 * curl is on it, to stay about POCKET_DISTANCE, m, along the crest from it. Weight
 * only, POCKET_GAIN of trim per metre off that distance and no more than
 * POCKET_TRIM (the W/S keys reach ±1). Steering, crouch and the hand stay the
 * player's. Provisional.
 */
export const POCKET_DISTANCE = 4;
export const POCKET_TRIM = 0.6;
const POCKET_GAIN = 0.15;

/** The weight the reflex asks for on this frame: −1 back to 1 forward; 0 with no wave or no curl in reach. */
export function pocketTrim(frame: WaveFrame): number {
  if (!frame.valid || !Number.isFinite(frame.curlDistance)) return 0;
  return Math.max(-POCKET_TRIM, Math.min(POCKET_TRIM, -POCKET_GAIN * (frame.curlDistance - POCKET_DISTANCE)));
}

/** The input with the reflex's weight, standing and with no weight held; otherwise the input itself. */
export function withPocketReflex<T extends RideInput>(input: T, frame: WaveFrame | undefined, phase: RiderPhase | 'fallen'): T {
  if (!frame || phase !== 'standing' || (input.trim ?? 0) !== 0) return input;
  return { ...input, trim: pocketTrim(frame) };
}

/** Whether the reflex rides with the player: by default on the Practice swell only, like the balance meter. */
export function showsPocketReflex(setting: GameplaySettings['pocketReflex'], swell: SwellSize): boolean {
  return setting === 'always' || (setting === 'practice' && swell === 'practice');
}
