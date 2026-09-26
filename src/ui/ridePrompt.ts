import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import { t } from './strings';

/** The key (or button) labels the prompts name. */
export interface PromptKeys {
  paddle: string;
  popUp: string;
  retry: string;
}

/**
 * The one line the ride HUD says (plan P8): what to do next while paddling,
 * getting up or after a fall, and nothing while riding, so the screen stays clean.
 */
export function ridePrompt(ride: SurfZoneStatus['ride'] | undefined, keys: PromptKeys): string {
  if (!ride) return '';
  switch (ride.phase) {
    case 'prone':
      return ride.cue ? t('hud.prompt.popUp', { popUp: keys.popUp }) : t('hud.prompt.paddle', { paddle: keys.paddle });
    case 'push':
    case 'landing':
      return t('hud.prompt.rising');
    case 'fallen':
      return t('hud.prompt.fallen', { popUp: keys.popUp, retry: keys.retry });
    default:
      return '';
  }
}
