import type { WaveFrame } from './waveFrame';

/**
 * The take-off window (Kimura and Kakinuma 2015: the board's speed relative to
 * the crest and its place on the face): the wave has caught the board when it
 * keeps pace with the crest, moving shoreward at least CAUGHT_SHARE of the
 * crest's speed, while it sits at least HIGH_ON_FACE up the face and no further
 * than NEAR_CREST, m, ahead of the crest. Traced on the reference wave, the
 * pop-up cue's planing rule lit only 4–5 m ahead of the crest at 7–9 m/s: the
 * face's water runs shoreward with the wave, so a caught board barely planes
 * (1–4 % of the weight at 2.6–3 m ahead, 77–83 % up the face, 5 m/s against a
 * crest at 6.5 m/s), and after the 1.2 s pop-up riders stood on the flat.
 * Modelling values.
 */
const CAUGHT_SHARE = 0.8;
const HIGH_ON_FACE = 0.5;
const NEAR_CREST = 4;

export function inTakeOffWindow(frame: WaveFrame): boolean {
  return frame.valid && frame.crestSpeed > 0 && frame.speedShoreward >= CAUGHT_SHARE * frame.crestSpeed
    && frame.faceFraction >= HIGH_ON_FACE && frame.aheadOfCrest >= 0 && frame.aheadOfCrest <= NEAR_CREST;
}
