import type { RideInput } from '../physics/RideSession';
import type { RIDER_PHASES } from '../wave/SurfZoneRunner';
import type { SwellSize } from './SurfConditions';

/**
 * The mechanics taught once: riding (spec P9; P8's first-ride key hints already
 * cover paddling and standing), and the duck-dive and pulling the leash in (the
 * wipeout spec).
 */
export type HintId = 'lean' | 'trim' | 'crouch' | 'compress' | 'hand' | 'duckDive' | 'reel';
const HINT_IDS: readonly HintId[] = ['lean', 'trim', 'crouch', 'compress', 'hand', 'duckDive', 'reel'];
const RIDING = ['lean', 'trim', 'crouch', 'compress', 'hand'] as const satisfies readonly HintId[];

export const HINTS_KEY = 'breakline.hints.v1';

/** Where a hint may be offered: Compress in Practice, where the riding is taught (the stances spec); the rest in any ride. */
export function offersHint(id: HintId, swell: SwellSize): boolean {
  return id !== 'compress' || swell === 'practice';
}

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

/**
 * What the coach reads each frame: whether the rider stands, the crest beside
 * it, and what the player holds; and for the wipeout spec's hints the rider's
 * phase, how far broken water coming at it is (m; Infinity when none), and
 * whether the leash is whole and the board in reach.
 */
export interface HintState {
  standing: boolean;
  crestBreaking: number;
  input: Pick<RideInput, 'steer' | 'trim' | 'crouch' | 'compress' | 'hand' | 'duckDive' | 'reel'>;
  phase?: (typeof RIDER_PHASES)[number];
  whitewaterAhead?: number;
  leashIntact?: boolean;
  boardInReach?: boolean;
}

/** The lean shows after LEAN_AFTER s standing, trim, crouch and Compress after DEEPER_AFTER s; the hand when the crest breaks this strongly beside the rider. */
const LEAN_AFTER = 2;
const DEEPER_AFTER = 5;
const HAND_BREAKING = 0.3;
/** A hint is learned once its input has been held this long, s, standing (or lying down, or in the water, for its own). */
const LEARNED_AFTER = 0.5;
/**
 * The duck-dive shows while broken water is within DUCK_AHEAD, m, of a prone
 * rider: about three body lengths, time to read it before the 1–2 lengths the
 * dive wants (survey §5).
 */
const DUCK_AHEAD = 8;

/**
 * When to show each hint (spec P9), one at a time: the hand when the crest breaks
 * beside the rider; the lean after 2 s standing; the trim, then the crouch, then
 * Compress (the bottom turn's sequence: crouch on the drop, compress at the bottom)
 * after 5 s. A hint retires once its input is held for half a second standing,
 * shown or not.
 */
export class HintCoach {
  private standingTime = 0;
  private readonly held: Record<HintId, number> = { lean: 0, trim: 0, crouch: 0, compress: 0, hand: 0, duckDive: 0, reel: 0 };

  constructor(private readonly book: HintBook) {}

  /** The hint to show now, if any; `available` leaves out hints the player's device has no input for. */
  update(dt: number, state: HintState, available: (id: HintId) => boolean = () => true): HintId | undefined {
    if (!state.standing) {
      this.standingTime = 0;
      for (const id of RIDING) this.held[id] = 0;
      return this.inTheWater(dt, state, available);
    }
    this.standingTime += dt;
    const { input } = state;
    const using: Record<(typeof RIDING)[number], boolean> = {
      lean: Math.abs(input.steer) > 0.5,
      trim: Math.abs(input.trim ?? 0) > 0.5,
      crouch: (input.crouch ?? 0) > 0.5,
      compress: (input.compress ?? 0) > 0.5,
      hand: input.hand ?? false,
    };
    for (const id of RIDING) {
      this.held[id] = using[id] ? this.held[id] + dt : 0;
      if (this.held[id] >= LEARNED_AFTER - 1e-9) this.book.succeeded(id);
    }
    const due: HintId[] = [];
    if (state.crestBreaking > HAND_BREAKING) due.push('hand');
    if (this.standingTime >= LEAN_AFTER - 1e-9) due.push('lean');
    if (this.standingTime >= DEEPER_AFTER - 1e-9) due.push('trim', 'crouch', 'compress');
    return due.find((id) => available(id) && this.book.offer(id));
  }

  /**
   * Lying down or in the water (the wipeout spec): the duck-dive while broken
   * water comes at a prone rider, and pulling the leash in after a wipeout while
   * the board is out of reach on a whole leash. Each retires once held half a
   * second where it applies.
   */
  private inTheWater(dt: number, state: HintState, available: (id: HintId) => boolean): HintId | undefined {
    const prone = state.phase === 'prone';
    const fallen = state.phase === 'fallen';
    this.held.duckDive = prone && (state.input.duckDive ?? 0) > 0.5 ? this.held.duckDive + dt : 0;
    this.held.reel = fallen && state.input.reel ? this.held.reel + dt : 0;
    for (const id of ['duckDive', 'reel'] as const) if (this.held[id] >= LEARNED_AFTER - 1e-9) this.book.succeeded(id);
    const due: HintId[] = [];
    if (prone && (state.whitewaterAhead ?? Infinity) <= DUCK_AHEAD) due.push('duckDive');
    if (fallen && state.leashIntact && !state.boardInReach) due.push('reel');
    return due.find((id) => available(id) && this.book.offer(id));
  }
}
