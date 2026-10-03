/**
 * The Jev player's senses, read the same way from the surf zone in Node (the
 * runner itself) and in the page (its host's snapshot): the rider's phase, the
 * HUD's prompt, speed, balance, the rider against the wave, and whether water
 * stands high just behind the board.
 */
import type { WaveFrame } from '../../physics/waveFrame';
import type { Phase, Senses } from './observe';

/** A wave is coming when water this share of the swell's height above still water stands within LOOK m behind the board (the catch report's rise). */
export const RISE = 0.25;
export const LOOK = 14;

export interface SenseInputs {
  phase: Phase;
  cue: boolean;
  speed: number;
  balance: number;
  wave: WaveFrame;
  heading: number;
  peelDirection: number;
  boardInReach: boolean;
  /** The board's position, and the break line's z. */
  x: number;
  z: number;
  focusZ: number;
  /** The water's surface height at a point, the tide, and the swell's significant height, m. */
  heightAt: (x: number, z: number) => number;
  tide: number;
  swellHeight: number;
}

export function readSenses(i: SenseInputs): Senses {
  let crest = -Infinity;
  for (let back = 2; back <= LOOK; back += 2) crest = Math.max(crest, i.heightAt(i.x, i.z - back));
  return {
    phase: i.phase,
    cue: i.cue,
    speed: i.speed,
    balance: i.balance,
    wave: i.wave,
    heading: i.heading,
    peelDirection: i.peelDirection,
    outside: i.focusZ - i.z,
    boardInReach: i.boardInReach,
    rising: crest - i.tide > RISE * i.swellHeight,
  };
}
