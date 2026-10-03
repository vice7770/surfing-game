/**
 * Which recording of a pool plays next (S1). A sound that fires many times a
 * second in one place (a lip crash, a paddle stroke) would machine-gun one file
 * with its tail, ring and click stacked on themselves, so such a sound has a
 * pool of recordings. The cycle is a round-robin over a shuffled order: every
 * recording is heard once before any is heard again, and never the same one twice
 * in a row, not even across the shuffle.
 */
export class VariantCycle {
  private order: number[] = [];
  private last = -1;

  /** `random` is uniform in [0, 1); tests pass a seeded one. */
  constructor(private readonly count: number, private readonly random: () => number = Math.random) {}

  next(): number {
    if (this.count <= 1) return 0;
    if (this.order.length === 0) {
      const order = Array.from({ length: this.count }, (_, i) => i);
      // Fisher–Yates.
      for (let i = order.length - 1; i > 0; i -= 1) {
        const j = Math.min(i, Math.floor(this.random() * (i + 1)));
        [order[i], order[j]] = [order[j], order[i]];
      }
      // The new round must not open with the recording that closed the last.
      if (order[0] === this.last) [order[0], order[order.length - 1]] = [order[order.length - 1], order[0]];
      this.order = order;
    }
    this.last = this.order.shift()!;
    return this.last;
  }
}
