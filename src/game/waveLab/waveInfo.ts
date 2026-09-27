import { MIXED_PEAK_FIT, skillForPeel, type PeelEstimate } from '../../wave/Breaking';
import type { BreakerType } from '../../wave/SwellReadout';
import { t, type StringKey } from '../../ui/strings';
import { formatHeight, type Units } from '../../ui/units';

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
}

export interface WaveInfo {
  summary: string;
  rows: { label: string; value: string }[];
}

/** The peel in surfers' words: a surfer riding shoreward (+z) has −x on the right, so a peel toward +x is a left. */
function peelText(peel: PeelEstimate | undefined): { text: string; skill?: string } {
  if (!peel) return { text: t('lab.info.waiting') };
  const skill = skillForPeel(peel.angleDegrees);
  if (skill === 'closeout') return { text: t('lab.peel.closeout') };
  if (peel.fit < MIXED_PEAK_FIT) return { text: t('lab.peel.mixed') };
  const angle = Math.round(peel.angleDegrees);
  return { text: t(peel.direction > 0 ? 'lab.peel.left' : 'lab.peel.right', { angle }), skill: t(`lab.skill.${skill}` as StringKey) };
}

/** The info card (spec L1): one summary line and the rows under it, in the player's units. */
export function waveInfo(input: WaveInfoInput, units: Units): WaveInfo {
  const breaker = t(`lab.breaker.${input.breaker}` as StringKey);
  const peel = peelText(input.peel);
  const set = input.steady ? t('lab.info.steady')
    : input.timeToSet > 0 ? t('lab.info.setIn', { seconds: Math.round(input.timeToSet) }) : t('lab.info.setNow');
  return {
    summary: [breaker, peel.text, peel.skill].filter(Boolean).join(' · '),
    rows: [
      { label: t('lab.info.face'), value: input.face === undefined ? t('lab.info.noFace') : formatHeight(input.face, units) },
      { label: t('lab.info.period'), value: `${Math.round(input.period)} s` },
      { label: t('lab.info.breaker'), value: breaker },
      { label: t('lab.info.peel'), value: peel.text },
      { label: t('lab.info.breaking'), value: `${Math.round(input.breakingFraction * 100)} %` },
      { label: t('lab.info.nextSet'), value: set },
    ],
  };
}
