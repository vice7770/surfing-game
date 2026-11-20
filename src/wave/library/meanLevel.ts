/**
 * C2 step 3 (docs/research/wave-strategy-alternatives/c2-plan.md §1, "The blend"): the local mean level a library slice
 * stands on, a one-period running mean of the sea at each lane's station (the lane's toe, where its slices hand over).
 *
 * The sea is read every `every` s into a ring of one period's readings, so the mean is a plain boxcar over the last
 * period, the same on every client (only + and ÷). Until the ring has filled once the mean is over the readings so far.
 * Stations whose water is dry read still water.
 */
export class MeanLevel {
  /** The readings per station: `slots` a period. */
  readonly slots: number;
  private readonly ring: Float64Array;
  private readonly sums: Float64Array;
  private filled = 0;
  private next = 0;
  /** When the last reading was taken, s (NaN: none yet). */
  private last = Number.NaN;

  constructor(readonly stations: number, readonly period: number, readonly every = 0.25) {
    this.slots = Math.max(1, Math.round(period / every));
    this.ring = new Float64Array(stations * this.slots);
    this.sums = new Float64Array(stations);
  }

  /** Whether a reading is due at `time` s (one each `every` s, from the first). */
  due(time: number): boolean {
    return !(this.last === this.last) || time - this.last >= this.every - 1e-9;
  }

  /** Take one reading of every station: `level(k)`, m above still water. */
  read(time: number, level: (station: number) => number): void {
    const { slots, ring, sums } = this;
    const slot = this.next;
    const full = this.filled === slots;
    for (let k = 0; k < this.stations; k += 1) {
      const value = level(k);
      const at = k * slots + slot;
      if (full) sums[k] -= ring[at];
      ring[at] = value;
      sums[k] += value;
    }
    this.next = (slot + 1) % slots;
    if (!full) this.filled += 1;
    this.last = time;
  }

  /** The station's mean level, m above still water (0 before any reading). */
  at(station: number): number {
    return this.filled > 0 ? this.sums[station] / this.filled : 0;
  }

  exportState(): MeanLevelState {
    return { ring: Array.from(this.ring), sums: Array.from(this.sums), filled: this.filled, next: this.next, last: this.last === this.last ? this.last : null };
  }

  importState(state: MeanLevelState): void {
    if (state.ring.length !== this.ring.length) throw new Error('A mean level from another lane field');
    this.ring.set(state.ring);
    this.sums.set(state.sums);
    this.filled = state.filled;
    this.next = state.next;
    this.last = state.last ?? Number.NaN;
  }
}

export interface MeanLevelState { ring: number[]; sums: number[]; filled: number; next: number; last: number | null }
