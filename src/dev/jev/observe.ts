/**
 * What the Jev player sees: the game's own state (the rider's phase, the HUD's
 * pop-up prompt, speed, balance, and the rider measured against the wave under
 * it) turned into a few short phrases. The arithmetic stays here, in code: Jev
 * reads named buckets ("chest-high", "about to reach you"), never raw metres,
 * which is what the TypeSafe docs ask for (jev-1.13 jaggedness: numbers, math).
 *
 * The state is kept short on purpose: every key is a word or two, and only the
 * phrases the phase's questions need are sent.
 */
import type { WaveFrame } from '../../physics/waveFrame';

export type Phase = 'prone' | 'push' | 'landing' | 'standing' | 'recover' | 'fallen';

/** The raw senses, read from the running surf zone each decision. Angles in radians, heading from +z toward +x. */
export interface Senses {
  phase: Phase;
  /** The HUD's "Pop up now" prompt. */
  cue: boolean;
  /** Speed over ground, m/s. */
  speed: number;
  /** Balance reserve, 0–1. */
  balance: number;
  wave: WaveFrame;
  heading: number;
  /** +1 when the break peels toward +x, −1 toward −x, 0 for a close-out or unknown. */
  peelDirection: number;
  /** Metres seaward of the break line: positive outside it, negative inside. */
  outside: number;
  /** Fallen, the board is within the grab's reach. */
  boardInReach: boolean;
  /** A crest stands high behind the board: a wave is coming, whichever crest the gauge follows. */
  rising: boolean;
}

/** What the decision is built from: the phrases sent to Jev, and the facts the motor needs to act on its answers. */
export interface Observation {
  phase: Phase;
  state: Record<string, string>;
  /** Which way along the crest the open face lies (+1 toward +x, −1 toward −x, 0 none), as the rider would see it. */
  open: number;
  /** The open face's side for a rider facing the beach: 'left' for +x (the board's +x is its left). */
  openSide?: 'left' | 'right';
  /** The wave's travel direction, rad. */
  travel: number;
  /** The wave has passed the rider, or there is none: the ride (or the chance) is over. */
  passed: boolean;
  /** Far enough inside the break that a fresh start is worth offering. */
  inside: boolean;
}

const DEG = 180 / Math.PI;

export const wrap = (angle: number) => angle - 2 * Math.PI * Math.round(angle / (2 * Math.PI));

/** A face this high in metres reads as this, for a surfer. */
export function sizeWord(face: number): string {
  if (face < 0.5) return 'knee-high';
  if (face < 0.9) return 'waist-high';
  if (face < 1.3) return 'chest-high';
  if (face < 1.8) return 'head-high';
  if (face < 2.5) return 'overhead';
  return 'double overhead';
}

export function breakWord(wave: WaveFrame): string {
  if (wave.crestBreaking > 0.3) return 'breaking';
  if (wave.crestBreaking > 0.05) return 'starting to break';
  return 'unbroken';
}

/** A wave counts once its face stands this high, m. */
const MIN_FACE = 0.3;

/**
 * Where the wave is for a rider lying down, from its distance and closing speed. The gauge follows one crest and can
 * jump between crests, so water standing high just behind the board (`rising`) always reads as a wave coming.
 */
export function approachWord(wave: WaveFrame, rising = false): string {
  if (!wave.valid || wave.faceHeight < MIN_FACE) return rising ? 'coming, a few seconds away' : 'none close';
  if (wave.aheadOfCrest < 0) return rising ? 'coming, a few seconds away' : 'passed under you';
  if (wave.aheadOfCrest <= 4 && wave.faceFraction > 0.3) return 'lifting your board';
  const closing = Math.max(wave.crestSpeed - wave.speedShoreward, 0.5);
  const seconds = wave.aheadOfCrest / closing;
  if (seconds < 1.5) return 'about to reach you';
  if (seconds < 4 || rising) return 'coming, a few seconds away';
  return 'far behind';
}

/** Lying down, the board's speed against the wave's. */
export function paceWord(wave: WaveFrame): string {
  if (!wave.valid || wave.crestSpeed <= 0) return 'still';
  const share = wave.speedShoreward / wave.crestSpeed;
  if (share >= 0.8) return 'matching the wave';
  if (share >= 0.5) return 'slower than the wave';
  return 'much slower than the wave';
}

/** Standing, where on the wave the rider is. */
export function placeWord(wave: WaveFrame): string {
  if (!wave.valid || wave.faceHeight < MIN_FACE) return 'no wave under you';
  if (wave.aheadOfCrest < 0) return 'behind the crest';
  if (wave.aheadOfCrest > 8) return 'out in front on the flat';
  if (wave.faceFraction < 0.2) return 'at the bottom';
  if (wave.faceFraction < 0.5) return 'low on the face';
  if (wave.faceFraction < 0.8) return 'mid-face';
  return 'at the lip';
}

/** Standing, how near the breaking curl the rider is. */
export function curlWord(wave: WaveFrame): string {
  if (!wave.valid || !Number.isFinite(wave.curlDistance)) return 'nothing breaking near';
  if (wave.curlDistance === 0) return 'breaking on you';
  if (wave.curlDistance < 3) return 'right beside you, in the pocket';
  if (wave.curlDistance < 10) return 'close';
  return 'far, you are on the shoulder';
}

/** Standing speed, with its trend (m/s per s) past this either way. */
const TREND = 1.5;
export function speedWord(speed: number, trend: number): string {
  const word = speed < 2 ? 'stalling' : speed < 4 ? 'slow' : speed < 7 ? 'good' : 'fast';
  if (trend < -TREND) return `${word}, slowing`;
  if (trend > TREND) return `${word}, gaining`;
  return word;
}

export function balanceWord(balance: number): string {
  if (balance > 0.7) return 'steady';
  if (balance > 0.4) return 'wobbling';
  return 'losing it';
}

/** The board's heading for a rider facing the beach, against the wave's travel and the open face. */
export function headingWord(heading: number, travel: number, open: number): string {
  const turned = wrap(heading - travel) * DEG;
  if (Math.abs(turned) < 15) return 'straight at the beach';
  if (Math.abs(turned) > 135) return 'out to sea';
  if (open === 0) return turned > 0 ? 'angled left' : 'angled right';
  const toward = open * turned;
  if (toward < 0) return 'angled toward the curl';
  if (toward < 70) return 'angled along the open face';
  if (toward <= 110) return 'along the wave';
  return 'up the face';
}

export function lineupWord(outside: number): string {
  if (outside > 3) return 'outside the break';
  if (outside > -3) return 'at the take-off spot';
  if (outside > -25) return 'inside the break';
  return 'far inside, near the beach';
}

/** More than this far inside the break line, m, with no wave coming, a fresh start (the game's R) is offered. */
export const INSIDE = 3;
/** Lying down, a curl this near (ahead of its crest, m) sets the open face; further off it is another crest's. */
const NEAR_CURL = 12;

/**
 * Turns senses into an observation. It keeps three things between looks: the
 * open face last seen lying down, the open face of the ride under way (fixed at
 * the pop-up: the gauge's curl jumps between crests, and a side that flips
 * between looks flips the rider's line with it), and the last speed, for the
 * trend.
 */
export class Observer {
  private seenOpen = 0;
  private rideOpen = 0;
  private lastSpeed = Number.NaN;
  private lastTime = Number.NaN;
  private lastPhase?: Phase;

  /** The observation of `s`, seen at time `t`, s. */
  observe(s: Senses, t: number): Observation {
    const { wave } = s;
    const travel = wave.valid ? Math.atan2(wave.directionX, wave.directionZ) : 0;
    const riding = s.phase === 'push' || s.phase === 'landing' || s.phase === 'standing';
    if (s.phase === 'prone' && this.lastPhase !== undefined && this.lastPhase !== 'prone') this.seenOpen = 0;
    if (!riding && wave.valid && wave.curlSide !== 0 && wave.aheadOfCrest >= 0 && wave.aheadOfCrest <= NEAR_CURL) this.seenOpen = -wave.curlSide;
    const seen = this.seenOpen !== 0 ? this.seenOpen : Math.sign(s.peelDirection);
    if (!riding) this.rideOpen = 0;
    else if (this.rideOpen === 0) this.rideOpen = seen;
    const open = riding ? this.rideOpen : seen;
    const openSide = open > 0 ? 'left' : open < 0 ? 'right' : undefined;
    const trend = Number.isFinite(this.lastSpeed) && t > this.lastTime ? (s.speed - this.lastSpeed) / (t - this.lastTime) : 0;
    this.lastSpeed = s.speed;
    this.lastTime = t;
    this.lastPhase = s.phase;
    const hasWave = wave.valid && wave.faceHeight >= MIN_FACE;
    const approach = approachWord(wave, s.rising);
    const passed = (!hasWave || wave.aheadOfCrest < 0) && !s.rising;
    const inside = s.outside < -INSIDE && (approach === 'passed under you' || approach === 'none close');
    const waveWord = hasWave ? `${sizeWord(wave.faceHeight)}, ${breakWord(wave)}` : 'flat';
    const state: Record<string, string> = {};
    switch (s.phase) {
      case 'prone':
      case 'recover':
        state.you = 'lying on the board';
        state.where = lineupWord(s.outside);
        state.wave = hasWave ? `${waveWord}, ${approach}` : s.rising ? `a wave, ${approach}` : 'flat, none close';
        if (hasWave && !passed) state.pace = paceWord(wave);
        state.facing = headingWord(s.heading, travel, open);
        if (openSide) state.open = `to your ${openSide}`;
        if (s.cue) state.prompt = 'POP UP NOW';
        break;
      case 'push':
      case 'landing':
      case 'standing':
        state.you = s.phase === 'standing' ? 'standing, riding' : 'popping up';
        state.wave = waveWord;
        state.on = placeWord(wave);
        state.curl = curlWord(wave);
        state.speed = speedWord(s.speed, trend);
        state.facing = headingWord(s.heading, travel, open);
        if (openSide) state.open = `to your ${openSide}`;
        state.balance = balanceWord(s.balance);
        break;
      case 'fallen':
        state.you = 'fell off, in the water';
        state.board = s.boardInReach ? 'within reach' : 'out of reach';
        state.where = lineupWord(s.outside);
        state.wave = hasWave ? `${waveWord}, ${approach}` : 'flat';
        break;
    }
    return { phase: s.phase, state, open, openSide, travel, passed, inside };
  }
}
