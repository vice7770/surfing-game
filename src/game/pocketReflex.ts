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
 * player's. It sits back only while the board planes: fully above SIT_BACK_FULL,
 * m/s over ground, and not at all below SIT_BACK_FROM (held back on a board
 * already slowing, the tail sank with the nose 30–60° up and the rider fell).
 * Provisional.
 */
export const POCKET_DISTANCE = 4;
export const POCKET_TRIM = 0.6;
const POCKET_GAIN = 0.15;
const SIT_BACK_FROM = 3;
const SIT_BACK_FULL = 5;
/**
 * The reflex holds a line: steering at least POCKET_STEER, the weight is the
 * turn's (sat back through a crouched full-steer bottom turn at 10 m/s, the
 * board wobbled in yaw and threw the rider).
 */
const POCKET_STEER = 0.5;

/** The weight the reflex asks for on this frame: −1 back to 1 forward; 0 with no wave or no curl in reach. */
export function pocketTrim(frame: WaveFrame): number {
  if (!frame.valid || !Number.isFinite(frame.curlDistance)) return 0;
  const trim = Math.max(-POCKET_TRIM, Math.min(POCKET_TRIM, -POCKET_GAIN * (frame.curlDistance - POCKET_DISTANCE)));
  if (trim >= 0) return trim;
  const planing = Math.max(0, Math.min(1, (frame.speedOverGround - SIT_BACK_FROM) / (SIT_BACK_FULL - SIT_BACK_FROM)));
  return planing > 0 ? trim * planing : 0;
}

/** The input with the reflex's weight, standing, with no weight held and no hard steer; otherwise the input itself. */
export function withPocketReflex<T extends RideInput>(input: T, frame: WaveFrame | undefined, phase: RiderPhase | 'fallen'): T {
  if (!frame || phase !== 'standing' || (input.trim ?? 0) !== 0 || Math.abs(input.steer) >= POCKET_STEER) return input;
  return { ...input, trim: pocketTrim(frame) };
}

/** Whether the reflex rides with the player: by default on the Practice swell only, like the balance meter. */
export function showsPocketReflex(setting: GameplaySettings['pocketReflex'], swell: SwellSize): boolean {
  return setting === 'always' || (setting === 'practice' && swell === 'practice');
}
