import type { Maneuver } from '../game/rideAnalysis';
import type { RideInput } from '../physics/RideSession';
import type { GameplaySettings } from '../game/Settings';
import type { SurfConditions } from '../game/SurfConditions';
import type { SurfZoneStatus } from '../wave/SurfZoneRunner';
import { el, icon } from './dom';
import { ICONS } from './icons';
import { MANEUVER_LABELS } from './RideEndCard';
import { ridePrompt, type PromptKeys } from './ridePrompt';
import { t } from './strings';
import { speedParts, type Units } from './units';

/** Whether the balance meter shows (spec P9): by default on the Practice swell only, where the mechanics are learned. */
export function showsBalanceMeter(setting: GameplaySettings['balanceMeter'], swell: SurfConditions['swell']): boolean {
  return setting === 'always' || (setting === 'practice' && swell === 'practice');
}

/** Whether the breath meter shows after a wipeout (the wipeout spec, Part B): by the balance meter's rule. */
export function showsBreathMeter(setting: GameplaySettings['breathMeter'], swell: SurfConditions['swell']): boolean {
  return setting === 'always' || (setting === 'practice' && swell === 'practice');
}

/** The screen's edges darken as the breath falls below half, to MAX_VIGNETTE at none (Part B). */
const MAX_VIGNETTE = 0.85;
export function breathVignette(breath: number): number {
  return breath >= 0.5 ? 0 : MAX_VIGNETTE * Math.min(1, (0.5 - breath) / 0.5);
}

/** "Held down too long", once for each rescue (`seen` counts the rescues already told). */
export function heldDownNotice(rescues: number, seen: number): { seen: number; text?: string } {
  return rescues > seen ? { seen: rescues, text: t('hud.heldDown').toUpperCase() } : { seen: rescues };
}

/**
 * The callout for the ride's latest manoeuvre (P9): its name, the first time it is
 * seen (`key` names the one shown last); nothing between rides, which forgets it.
 */
export function maneuverCallout(live: Maneuver | undefined, shown: string): { key: string; text?: string } {
  if (!live) return { key: '' };
  const key = `${live.kind}@${live.start.toFixed(2)}`;
  return key === shown ? { key } : { key, text: t(MANEUVER_LABELS[live.kind]).toUpperCase() };
}

/** The stance readout's height: Compress past half its travel, the crouch past CROUCH_SHOWN, else normal. */
const CROUCH_SHOWN = 0.3;
export type StanceLevel = 'normal' | 'crouch' | 'compress';

/**
 * What the stance readout shows (the movement-flow spec): the height asked for, the weight (−1 back to 1 forward)
 * and the rotation (−1 left to 1 right, as the stick is pushed; undefined when the body turns by itself). Inputs
 * only: it names no manoeuvre.
 */
export function stanceReadout(input: Pick<RideInput, 'crouch' | 'compress' | 'trim' | 'rotate'>): { level: StanceLevel; weight: number; rotate?: number } {
  const level = (input.compress ?? 0) >= 0.5 ? 'compress' : (input.crouch ?? 0) >= CROUCH_SHOWN ? 'crouch' : 'normal';
  const clamp = (x: number) => Math.max(-1, Math.min(1, x));
  return { level, weight: clamp(input.trim ?? 0), ...(input.rotate === undefined ? {} : { rotate: clamp(input.rotate) }) };
}

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
  /** A brief callout of each manoeuvre (P9), and the one shown last. */
  private readonly callout = el('p', { class: 'hud-callout', attrs: { 'aria-live': 'polite' } });
  private calloutKey = '';
  /** A one-time hint for a riding mechanic (P9). */
  private readonly coach = el('p', { class: 'hud-coach', attrs: { 'aria-live': 'polite' } });
  /** The breath after a wipeout, the screen's darkening edges, and the rescues told (the wipeout spec, Part B). */
  private readonly breath = el('div', { class: 'hud-balance hud-breath', attrs: { role: 'meter', 'aria-label': t('hud.breath'), 'aria-valuemin': '0', 'aria-valuemax': '100' } });
  private readonly breathFill = el('div', { class: 'hud-balance-fill' });
  private readonly vignette = el('div', { class: 'hud-vignette', attrs: { 'aria-hidden': 'true' } });
  private rescuesSeen = -1;
  /** The stance readout (the movement-flow spec): the height, and the weight and rotation as a dot on a track. */
  private readonly stance = el('div', { class: 'hud-stance', attrs: { role: 'group', 'aria-label': t('hud.stance') } });
  private readonly stanceLevel = el('span', { class: 'hud-stance-level' });
  private readonly weightDot = el('i');
  private readonly rotateDot = el('i');
  private readonly rotateRow = el('div', { class: 'hud-stance-row' });
  private stanceText = '';

  constructor(onPause: () => void) {
    this.balance.append(this.balanceFill);
    this.breath.append(this.breathFill);
    this.rotateRow.append(el('small', { text: t('hud.stance.rotation') }), el('span', { class: 'hud-track' }, this.rotateDot));
    this.stance.append(this.stanceLevel,
      el('div', { class: 'hud-stance-row' }, el('small', { text: t('hud.stance.weight') }), el('span', { class: 'hud-track' }, this.weightDot)),
      this.rotateRow);
    this.root = el('section', { class: 'ride-hud', attrs: { 'aria-label': t('hud.speed') } },
      this.vignette,
      this.prompt,
      this.callout,
      this.coach,
      el('div', { class: 'hud-readout' },
        this.balance,
        this.breath,
        el('div', { class: 'hud-speed' }, this.speedValue, this.speedUnit),
        this.stance),
      el('button', { class: 'hud-pause', attrs: { type: 'button', 'aria-label': t('hud.pause') }, on: { click: onPause } }, icon(ICONS.pause)),
      this.hints);
  }

  /** The stance readout, while standing and shown: the height asked for, the weight, and the pad's rotation. */
  updateStance(input: RideInput | undefined, standing: boolean, show: boolean): void {
    this.stance.hidden = !show || !standing || !input;
    if (this.stance.hidden || !input) return;
    const { level, weight, rotate } = stanceReadout(input);
    const text = t(`hud.stance.${level}`);
    if (text !== this.stanceText) {
      this.stanceText = text;
      this.stanceLevel.textContent = text;
      this.stance.dataset.level = level;
    }
    // The dots sit on their tracks from 0 (back, left) to 100 % (forward, right).
    this.weightDot.style.left = `${(50 + 50 * weight).toFixed(1)}%`;
    this.rotateRow.hidden = rotate === undefined;
    if (rotate !== undefined) this.rotateDot.style.left = `${(50 + 50 * rotate).toFixed(1)}%`;
  }

  /** `promptOverride`: the Surf School's own line in place of the ride's prompt (spec L2). */
  update(ride: SurfZoneStatus['ride'] | undefined, units: Units, keys: HintKeys, showHints: boolean, showBalance = true, coachHint = '', promptOverride?: string, showBreath = false): void {
    if (this.coach.textContent !== coachHint) this.coach.textContent = coachHint;
    this.coach.hidden = coachHint === '';
    const prompt = promptOverride ?? ridePrompt(ride, keys);
    if (this.prompt.textContent !== prompt) this.prompt.textContent = prompt;
    this.prompt.hidden = prompt === '';
    const callout = maneuverCallout(ride?.live, this.calloutKey);
    this.calloutKey = callout.key;
    // A rescue from a hold-down says so where the manoeuvres are called (the first status only counts them).
    const rescues = ride?.rescues ?? 0;
    const notice = this.rescuesSeen < 0 ? { seen: rescues } : heldDownNotice(rescues, this.rescuesSeen);
    this.rescuesSeen = notice.seen;
    if (notice.text) callout.text = notice.text;
    if (callout.text) {
      // Restart the fade for each new manoeuvre.
      this.callout.textContent = callout.text;
      this.callout.classList.remove('is-shown');
      void this.callout.offsetWidth;
      this.callout.classList.add('is-shown');
    }
    // Written only when they change: the HUD updates every frame.
    const { value, unit } = speedParts(ride?.speed ?? 0, units);
    if (this.speedValue.textContent !== value) this.speedValue.textContent = value;
    if (this.speedUnit.textContent !== unit) this.speedUnit.textContent = unit;
    const standing = ride?.phase === 'standing' || ride?.phase === 'recover';
    this.balance.hidden = !standing || !showBalance;
    if (standing) {
      const reserve = ride.balance;
      this.balanceFill.style.transform = `scaleY(${reserve.toFixed(3)})`;
      this.balance.classList.toggle('is-low', reserve < LOW_BALANCE);
      this.balance.setAttribute('aria-valuenow', Math.round(reserve * 100).toString());
    }
    const breath = ride?.breath ?? 1;
    this.breath.hidden = !showBreath || ride?.phase !== 'fallen' || breath >= 0.999;
    if (!this.breath.hidden) {
      this.breathFill.style.transform = `scaleY(${Math.max(0, breath).toFixed(3)})`;
      this.breath.classList.toggle('is-low', breath < LOW_BALANCE);
      this.breath.setAttribute('aria-valuenow', Math.round(Math.max(0, breath) * 100).toString());
    }
    const dark = breathVignette(breath).toFixed(2);
    if (this.vignette.style.opacity !== dark) this.vignette.style.opacity = dark;
    this.hints.hidden = !showHints;
    const signature = `${keys.paddle}|${keys.popUp}|${keys.steer}|${keys.pause}`;
    if (showHints && signature !== this.hintKeys) {
      this.hintKeys = signature;
      const hint = (key: string, label: Parameters<typeof t>[0]) => el('span', {}, el('span', { class: 'keycap', text: key }), ` ${t(label)}`);
      this.hints.replaceChildren(hint(keys.paddle, 'hud.hint.paddle'), hint(keys.popUp, 'hud.hint.popUp'), hint(keys.steer, 'hud.hint.steer'), hint(keys.pause, 'hud.hint.pause'));
    }
  }
}
