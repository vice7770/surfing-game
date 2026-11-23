import type { Vector3 } from 'three';
import type { SurfWater, WaterSample } from './SurfWater';
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

/**
 * `?cueLater=on` (step 3.5u, `docs/research/new-rider/3.5/cue-later.md`): the player's cue waits until the board can
 * carry a stand, its speed through the water at least this, m/s. The pop-up takes 1.2 s and costs 0.09–0.57 m/s against
 * paddling on (3.5t); from 3.6 every catch-start run's own prediction lands the stand at ≥ 4.4 m/s through the water,
 * the speed every organic stand that lasted ≥ 3 s had and every stand that fell within 1.2 s lacked. Modelling value.
 */
export const CUE_LATER_SPEED = 3.6;

/** The board's horizontal speed through the water under it, m/s: the planing latch's own measure. */
export function speedThroughWater(board: { position: Vector3; velocity: Vector3 }, water: SurfWater, sample: WaterSample): number {
  const under = water.sampleAt(board.position.x, board.position.y, board.position.z, sample);
  const flowX = under.outsideDomain ? 0 : under.flowX;
  const flowZ = under.outsideDomain ? 0 : under.flowZ;
  return Math.hypot(board.velocity.x - flowX, board.velocity.z - flowZ);
}

/**
 * The pop-up cue the player is shown (the HUD's prompt and everything that reads the ride status's `cue`). `today` is the
 * shipped cue (prone, and the rider's own planing cue or the take-off window); `throughWater` the board's speed through
 * the water, m/s. Off (`cueLater` false) it is exactly `today`; on, `today` AND the board at `CUE_LATER_SPEED` or more.
 * The rider's own `popUpCue`, which drives the paddle sprint, and the drawn body's cue bit stay on `today`'s rule.
 */
export function playerCue(today: boolean, throughWater: number, cueLater: boolean): boolean {
  return cueLater ? today && throughWater >= CUE_LATER_SPEED : today;
}
