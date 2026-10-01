import type { WaveFrame } from './waveFrame';

/**
 * The take-off window (Kimura and Kakinuma 2015: the board's speed relative to
 * the crest and its place on the face): the wave has caught the board when it
 * keeps pace with the crest, moving shoreward at least CAUGHT_SHARE of the
 * crest's speed, while it sits at least HIGH_ON_FACE up the face, between
 * CLEAR_OF_LIP and NEAR_CREST, m, ahead of the crest. The crest and the board
 * must both move at least CAUGHT_SPEED, m/s: a paddler sprints at 1.5–1.9 m/s,
 * small waves run about 3 m/s (Paine 1974), and the gauge's crest speed reads
 * near 0 for a moment when it picks up a new crest.
 *
 * Traced on the reference wave, the pop-up cue's planing rule lit only 4–5 m
 * ahead of the crest at 7–9 m/s: the face's water runs shoreward with the wave,
 * so a caught board barely planes (1–4 % of the weight at 2.6–3 m ahead, 77–83 %
 * up the face, 5 m/s against a crest at 6.5 m/s), and after the 1.2 s pop-up
 * riders stood on the flat. Pop-ups begun within 2 m of the crest, in the lip,
 * mostly failed or were kicked out; from 2–4 m they stood on the face. Those
 * faces were about 1.8 m (the gauge's crest over trough), so the window scales
 * with the face, CLEAR_OF_LIP to NEAR_CREST face heights ahead: on the Wave
 * Pool's 1.1 m faces a caught board rides only 0.7–1.5 m ahead of its 4 m/s
 * crest, and a 2–4 m window lit only once the wave had died over the lagoon
 * (the movement-flow spec's flow probe). Bigger faces keep the traced 2–4 m,
 * as the bigger spots' catches were tuned with it. Modelling values.
 */
const CAUGHT_SHARE = 0.8;
const CAUGHT_SPEED = 3;
const HIGH_ON_FACE = 0.5;
const CLEAR_OF_LIP = 1.1;
const NEAR_CREST = 2.2;
const CLEAR_OF_LIP_MOST = 2;
const NEAR_CREST_MOST = 4;

export function inTakeOffWindow(frame: WaveFrame): boolean {
  const face = Math.max(0, frame.faceHeight);
  return frame.valid && frame.crestSpeed >= CAUGHT_SPEED
    && frame.speedShoreward >= Math.max(CAUGHT_SHARE * frame.crestSpeed, CAUGHT_SPEED)
    && frame.faceFraction >= HIGH_ON_FACE
    && frame.aheadOfCrest >= Math.min(CLEAR_OF_LIP_MOST, CLEAR_OF_LIP * face) && frame.aheadOfCrest <= Math.min(NEAR_CREST_MOST, NEAR_CREST * face);
}
