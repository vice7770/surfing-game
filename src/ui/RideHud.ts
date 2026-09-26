import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { ridePrompt, type PromptKeys } from './ridePrompt';
import { t } from './strings';
import { speedParts, type Units } from './units';

/** The balance meter turns to the accent colour below this reserve. */
const LOW_BALANCE = 0.3;

export interface HintKeys extends PromptKeys {
  steer: string;
  pause: string;
}

/**
 * The clean ride HUD (plan P8): one prompt line, the speed, a balance meter while
 * standing, a pause button (touch has no Esc), and key hints until the first ride.
 * Built once and updated in place every frame.
 */
export class RideHud {
  readonly root: HTMLElement;
  private readonly prompt = el('p', { class: 'hud-prompt', attrs: { 'aria-live': 'polite' } });
  private readonly speedValue = el('strong');
  private readonly speedUnit = el('small');
  private readonly balance = el('div', { class: 'hud-balance', attrs: { role: 'meter', 'aria-label': t('hud.balance'), 'aria-valuemin': '0', 'aria-valuemax': '100' } });
  private readonly balanceFill = el('div', { class: 'hud-balance-fill' });
  private readonly hints = el('div', { class: 'hud-hints' });
  private hintKeys = '';

  constructor(onPause: () => void) {
    this.balance.append(this.balanceFill);
    this.root = el('section', { class: 'ride-hud', attrs: { 'aria-label': t('hud.speed') } },
      this.prompt,
      el('div', { class: 'hud-readout' },
        this.balance,
        el('div', { class: 'hud-speed' }, this.speedValue, this.speedUnit)),
      el('button', { class: 'hud-pause', attrs: { type: 'button', 'aria-label': t('hud.pause') }, on: { click: onPause } }, icon(ICONS.pause)),
      this.hints);
  }

  update(ride: SurfZoneStatus['ride'] | undefined, units: Units, keys: HintKeys, showHints: boolean): void {
    const prompt = ridePrompt(ride, keys);
    if (this.prompt.textContent !== prompt) this.prompt.textContent = prompt;
    this.prompt.hidden = prompt === '';
    const { value, unit } = speedParts(ride?.speed ?? 0, units);
    this.speedValue.textContent = value;
    this.speedUnit.textContent = unit;
    const standing = ride?.phase === 'standing' || ride?.phase === 'recover';
    this.balance.hidden = !standing;
    if (standing) {
      const reserve = ride.balance;
      this.balanceFill.style.transform = `scaleY(${reserve.toFixed(3)})`;
      this.balance.classList.toggle('is-low', reserve < LOW_BALANCE);
      this.balance.setAttribute('aria-valuenow', Math.round(reserve * 100).toString());
    }
    this.hints.hidden = !showHints;
    const signature = `${keys.paddle}|${keys.popUp}|${keys.steer}|${keys.pause}`;
    if (showHints && signature !== this.hintKeys) {
      this.hintKeys = signature;
      const hint = (key: string, label: Parameters<typeof t>[0]) => el('span', {}, el('span', { class: 'keycap', text: key }), ` ${t(label)}`);
      this.hints.replaceChildren(hint(keys.paddle, 'hud.hint.paddle'), hint(keys.popUp, 'hud.hint.popUp'), hint(keys.steer, 'hud.hint.steer'), hint(keys.pause, 'hud.hint.pause'));
    }
  }
}
