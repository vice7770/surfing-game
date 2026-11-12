import { overturnAt } from './heldOverturn';
import { heldFrame, type BarrelCase, type HeldFrame } from './ProfileLibrary';

/**
 * The most a held frame's jet area may be over the frame before's (ruling 16, pool-look-reference 2026-11-11;
 * provisional). The cause: in `periodic-pool-straight-big-l13` frame 176 the lip's underside has dropped onto the face
 * (the lip has rejoined), so the jet's area there counts the jet plus the void: 0.0754 h0² against 0.0336 at frame 175
 * (× 2.24), and the crash asks 1.7 times the water of the true jet. `heldFrame`'s two tests pass that frame all the
 * same. Every other library case steps × 1.02–1.16 into its held frame, so they keep theirs.
 */
export const HELD_JET_STEP = 1.25;

/** Which rule finds a case's held frame: 'jet-step', `heldFrameJetStep` (the reference pool's); none, `heldFrame` alone. */
export type HeldRule = 'jet-step';

/**
 * A case's held frame with one more test (`HELD_JET_STEP`): a frame whose jet area is over 1.25 × the frame before's
 * is refused too, and the search goes one frame back. A frame before with no jet at all (not yet overturned) refuses nothing.
 */
export function heldFrameJetStep(c: BarrelCase): HeldFrame {
  return heldFrame(c, (frames, frame) => {
    if (frame < 1) return false;
    const before = overturnAt(frames, frame - 1).jetArea;
    return before > 0 && overturnAt(frames, frame).jetArea > HELD_JET_STEP * before;
  });
}
