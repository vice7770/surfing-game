import { MIXED_PEAK_FIT, skillForPeel, type PeelEstimate } from '../../wave/Breaking';
import type { BreakerType } from '../../wave/SwellReadout';
import { t, type StringKey } from '../../ui/strings';
import { DEFAULT_SURFER_HEIGHT, describeSurf, type SurfWords } from '../../ui/surfHeight';
import { formatHeight, type Units } from '../../ui/units';
import type { SurfReading } from '../../wave/SurfMeter';

/** What the info card reads (spec L1): the face under the view, the swell's period, and the break's measures. */
export interface WaveInfoInput {
  face?: number;
  period: number;
  breaker: BreakerType;
  peel?: PeelEstimate;
  breakingFraction: number;
  timeToSet: number;
  /** A steady swell (Practice) has no sets. */
  steady: boolean;
  /** The surf measured at the take-off (the wave-sizes spec); undefined while measuring. */
  surf?: SurfReading;
}

export interface WaveInfo {
  summary: string;
  rows: { label: string; value: string }[];
}

/**
 * The peel in surfers' words: a surfer riding shoreward (+z) has −x on the right, so a peel toward +x is a left. A peak
 * peeling both ways (the Canyon's beach peaks) is "a peak, left and right", each arm's angle given, the faster arm's skill.
 */
function peelText(peel: PeelEstimate | undefined): { text: string; skill?: string; peak?: boolean } {
  if (!peel) return { text: t('lab.info.waiting') };
  const skill = skillForPeel(peel.angleDegrees);
  if (skill === 'closeout') return { text: t('lab.peel.closeout') };
  if (peel.fit < MIXED_PEAK_FIT) return { text: t('lab.peel.mixed') };
  const angle = Math.round(peel.angleDegrees);
  if (peel.peak) {
    const text = t('lab.peel.peak', { left: Math.round(peel.peak.left), right: Math.round(peel.peak.right) });
    return { text, skill: t(`lab.skill.${skill}` as StringKey), peak: true };
  }
  return { text: t(peel.direction > 0 ? 'lab.peel.left' : 'lab.peel.right', { angle }), skill: t(`lab.skill.${skill}` as StringKey) };
}

/** The info card (spec L1): one summary line and the rows under it, in the player's units, the surf first in the player's words. */
export function waveInfo(
  input: WaveInfoInput, units: Units, words: Omit<SurfWords, 'units'> = { scale: 'face', surferHeight: DEFAULT_SURFER_HEIGHT },
): WaveInfo {
  const breaker = t(`lab.breaker.${input.breaker}` as StringKey);
  const peel = peelText(input.peel);
  const set = input.steady ? t('lab.info.steady')
    : input.timeToSet > 0 ? t('lab.info.setIn', { seconds: Math.round(input.timeToSet) }) : t('lab.info.setNow');
  return {
    // A peak reads as one phrase with its breaker: "Spilling peak, left 50° and right 48°".
    summary: (peel.peak ? [t('lab.summary.peak', { breaker, peak: peel.text }), peel.skill] : [breaker, peel.text, peel.skill]).filter(Boolean).join(' · '),
    rows: [
      { label: t('lab.info.surf'), value: describeSurf(input.surf, { ...words, units }) },
      { label: t('lab.info.face'), value: input.face === undefined ? t('lab.info.noFace') : formatHeight(input.face, units) },
      { label: t('lab.info.period'), value: `${Math.round(input.period)} s` },
      { label: t('lab.info.breaker'), value: breaker },
      { label: t('lab.info.peel'), value: peel.text },
      { label: t('lab.info.breaking'), value: `${Math.round(input.breakingFraction * 100)} %` },
      { label: t('lab.info.nextSet'), value: set },
    ],
  };
}
