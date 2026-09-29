import { pelvisOverDeck } from './posturePoints';
import type { RiderVisualState } from './riderVisualState';

/**
 * Breathing (the riding body, step 4), from sources:
 * - `restRate`, `fullRate`: breaths a minute at rest (within the clinical 12–20)
 *   and at full exertion (Blackie et al. 1991, Chest 100: 136–142: 36 ± 9 at the
 *   end of maximal exercise);
 * - `quiet`, `deep`: the upper chest's front-to-back growth over a breath, quiet
 *   and deep (Yang et al. 2022, J Clin Med, by MRI at the aortic arch: 1.01–1.02
 *   and 1.20–1.22), on a chest `chestDepth` m deep (provisional);
 * - `rise`, `ease`: exertion follows the work within about `rise` s (breathing
 *   answers fast at the onset: Nicolò et al. 2017, Front Physiol 8: 922) and
 *   eases over `ease` s (provisional);
 * - `legSpeed`: the legs' speed, m/s, that counts as full work standing (a
 *   pump's; provisional).
 */
export const BREATH = { restRate: 16, fullRate: 36, quiet: 0.015, deep: 0.21, chestDepth: 0.2, rise: 5, ease: 30, legSpeed: 0.4 };
/** A step longer than this, s, is a gap: the breathing starts again at rest. */
const GAP = 0.25;

/**
 * The drawn chest's breathing: a cycle advanced with the clock at a rate and a
 * depth set by an exertion that follows the physics' work (paddling, swimming,
 * the legs pumping, and the breath a hold-down took), eased back at rest. Held
 * under water and in a duck-dive. A sine about the neutral pose, so the stance
 * reads the same on average. No noise: the same state breathes the same.
 */
export class Breathing {
  /** 0 (rest) to 1 (full work). */
  exertion = 0;
  /** Breaths a minute now. */
  rate = BREATH.restRate;
  private phase = 0;
  private clock = Number.NaN;
  private legs = Number.NaN;
  private extension = 0;

  /**
   * Advances to `state.clock` and returns the chest's extension, rad (+ lifting
   * the chest, back about the body's left), for a sternum `lever` m from where
   * the upper spine turns.
   */
  update(state: RiderVisualState, lever: number): number {
    const dt = state.clock - this.clock;
    const standing = state.phase === 'standing';
    const legs = standing ? pelvisOverDeck(state) : Number.NaN;
    if (!(dt >= 0) || dt >= GAP) {
      this.reset();
      this.clock = state.clock;
      this.legs = legs;
      return this.draw(lever);
    }
    if (dt === 0) return this.extension;
    const under = state.swim.under || state.duck > 0.3;
    let work = 0;
    if (state.phase === 'prone') work = Math.max(0, Math.min(1, state.stroking));
    else if (state.phase === 'fallen' && state.swim.stroking) work = 1;
    else if (standing && Number.isFinite(this.legs)) work = Math.min(1, Math.abs(legs - this.legs) / dt / BREATH.legSpeed);
    // Up from a hold, the body breathes for what it held.
    if (!under) work = Math.max(work, 1 - Math.max(0, Math.min(1, state.breath)));
    const time = work > this.exertion ? BREATH.rise : BREATH.ease;
    this.exertion += (work - this.exertion) * (1 - Math.exp(-dt / time));
    this.rate = BREATH.restRate + (BREATH.fullRate - BREATH.restRate) * this.exertion;
    if (!under) this.phase = (this.phase + (dt * this.rate) / 60) % 1;
    this.clock = state.clock;
    this.legs = legs;
    return this.draw(lever);
  }

  /** Starts again at rest. */
  reset(): void {
    this.exertion = 0;
    this.rate = BREATH.restRate;
    this.phase = 0;
    this.clock = Number.NaN;
    this.legs = Number.NaN;
    this.extension = 0;
  }

  /** The extension for the cycle's point: half the sternum's travel each way of the neutral pose, turned about `lever`. */
  private draw(lever: number): number {
    const growth = BREATH.quiet + (BREATH.deep - BREATH.quiet) * this.exertion;
    const swing = Math.asin(Math.min(1, (BREATH.chestDepth * growth) / Math.max(lever, 1e-3))) / 2;
    this.extension = swing * Math.sin(2 * Math.PI * this.phase);
    return this.extension;
  }
}
