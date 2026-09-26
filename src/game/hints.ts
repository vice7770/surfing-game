import type { RideInput } from '../physics/RideSession';

/** The riding mechanics taught once (spec P9); P8's first-ride key hints already cover paddling and standing. */
export type HintId = 'lean' | 'trim' | 'crouch' | 'hand';
const HINT_IDS: readonly HintId[] = ['lean', 'trim', 'crouch', 'hand'];

export const HINTS_KEY = 'breakline.hints.v1';

/**
 * Which hints the player has learned, kept across visits. Storage that fails
 * (private mode, full) leaves the book working in memory for the session.
 */
export class HintBook {
  private readonly learned = new Set<HintId>();

  constructor(private readonly storage?: Pick<Storage, 'getItem' | 'setItem'>) {
    try {
      const stored: unknown = JSON.parse(storage?.getItem(HINTS_KEY) ?? '[]');
      if (Array.isArray(stored)) for (const id of stored) if (HINT_IDS.includes(id)) this.learned.add(id);
    } catch {
      // Nothing remembered; the book starts fresh.
    }
  }

  /** Whether the hint should show now: it has not been learned. */
  offer(id: HintId): boolean {
    return !this.learned.has(id);
  }

  /** The player used it: retire the hint for good. */
  succeeded(id: HintId): void {
    if (this.learned.has(id)) return;
    this.learned.add(id);
    try {
      this.storage?.setItem(HINTS_KEY, JSON.stringify([...this.learned]));
    } catch {
      // Remembered for this session only.
    }
  }
}

/** What the coach reads each frame: whether the rider stands, the crest beside it, and what the player holds. */
export interface HintState {
  standing: boolean;
  crestBreaking: number;
  input: Pick<RideInput, 'steer' | 'trim' | 'crouch' | 'hand'>;
}

/** The lean shows after LEAN_AFTER s standing, trim and crouch after DEEPER_AFTER s; the hand when the crest breaks this strongly beside the rider. */
const LEAN_AFTER = 2;
const DEEPER_AFTER = 5;
const HAND_BREAKING = 0.3;
/** A hint is learned once its input has been held this long, s, standing. */
const LEARNED_AFTER = 0.5;

/**
 * When to show each hint (spec P9), one at a time: the hand when the crest breaks
 * beside the rider; the lean after 2 s standing; the trim, then the crouch, after
 * 5 s. A hint retires once its input is held for half a second standing, shown or
 * not.
 */
export class HintCoach {
  private standingTime = 0;
  private readonly held: Record<HintId, number> = { lean: 0, trim: 0, crouch: 0, hand: 0 };

  constructor(private readonly book: HintBook) {}

  /** The hint to show now, if any; `available` leaves out hints the player's device has no input for. */
  update(dt: number, state: HintState, available: (id: HintId) => boolean = () => true): HintId | undefined {
    if (!state.standing) {
      this.standingTime = 0;
      for (const id of HINT_IDS) this.held[id] = 0;
      return undefined;
    }
    this.standingTime += dt;
    const { input } = state;
    const using: Record<HintId, boolean> = {
      lean: Math.abs(input.steer) > 0.5,
      trim: Math.abs(input.trim ?? 0) > 0.5,
      crouch: (input.crouch ?? 0) > 0.5,
      hand: input.hand ?? false,
    };
    for (const id of HINT_IDS) {
      this.held[id] = using[id] ? this.held[id] + dt : 0;
      if (this.held[id] >= LEARNED_AFTER - 1e-9) this.book.succeeded(id);
    }
    const due: HintId[] = [];
    if (state.crestBreaking > HAND_BREAKING) due.push('hand');
    if (this.standingTime >= LEAN_AFTER - 1e-9) due.push('lean');
    if (this.standingTime >= DEEPER_AFTER - 1e-9) due.push('trim', 'crouch');
    return due.find((id) => available(id) && this.book.offer(id));
  }
}
