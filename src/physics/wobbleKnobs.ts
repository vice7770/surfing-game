/**
 * **Step 3.6c's diagnostic knobs** (`docs/research/stability/wobble/README.md` M4, M5): probes, not arms. Each moves one
 * candidate's own frequency, or swaps one depth-dependent ingredient to the tall stance's, so a probe can see which one
 * carries the deep stances' 2.5–3 Hz yaw swing.
 *
 * Every field is at its identity by default, and at its identity every use runs the shipped expression unchanged (each
 * use is guarded, not multiplied by 1). No address, option or saved setting reads this object: only a probe script
 * that imports it and writes a field can change it, so it is off in the game and online by construction.
 *
 * - `knee`: the new rider's knee stiffness (`KNEE_STIFFNESS`) × this; the leg's damping follows at the same ratio, so
 *   its axial mode's damping ratio is unchanged and its frequency moves by √knee.
 * - `ankleGain`, `twistGain`: the balance's feedback gain row (`PredictiveController.tick`, K[0] for the ankle's rest,
 *   K[1] for the twist's torque) × this. The reference's feed-forward and the bias are untouched.
 * - `senseShift`: ticks the senses reach the controller later (+) or sooner (−) than its design assumes; the design,
 *   the filter and the predictor are unchanged, only the sense the filter reads moves.
 * - `fins`: every fin's force and its implicit damping × this (the fin's lift slope).
 * - `designDepth`: ≥ 0, the depth the controller's design is scheduled at, whatever the leg's (−1, off).
 * - `splitDepth`: ≥ 0, the depth the rider's yaw inertia's lower and upper shares are read at (`coupleYaw`) (−1, off).
 *
 * **Step 3.6d's two** (`docs/research/stability/response/README.md` §0.3), the same rules:
 * - `designDelay`: ≥ 0, the ticks every design the controller builds assumes (`scheduledDesign`: the design's own
 *   `steps`, so the senses' line, the filter's age and the predictor all move with it); its cache key carries them
 *   (−1, off: the shipped `PREDICT_DELAY`, 6 ticks).
 * - `captureDelay`: ≥ 0, the ticks (1/60 s each) every reader of `HumanBalance`'s own sensing line reads it late, and
 *   the line's span widened to keep them (−1, off: `BALANCE_DELAY`, 0.1 s).
 */
export const WOBBLE = {
  knee: 1,
  ankleGain: 1,
  twistGain: 1,
  senseShift: 0,
  fins: 1,
  designDepth: -1,
  splitDepth: -1,
  designDelay: -1,
  captureDelay: -1,
};

/** Whether every knob is at its identity (for probes to print). */
export function wobbleOff(): boolean {
  return WOBBLE.knee === 1 && WOBBLE.ankleGain === 1 && WOBBLE.twistGain === 1 && WOBBLE.senseShift === 0 && WOBBLE.fins === 1
    && WOBBLE.designDepth < 0 && WOBBLE.splitDepth < 0 && WOBBLE.designDelay < 0 && WOBBLE.captureDelay < 0;
}
