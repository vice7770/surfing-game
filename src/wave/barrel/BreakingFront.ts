import { ONSET, type CrestSample } from './crestOnset';

/** Crests in neighbouring columns this close in z are one front, m (provisional: three 1 m cells). */
const LINK_REACH = 3;
/** A crest this close in z to last step's in its column is the same point, m (provisional: 20 m/s × 0.1 s). */
const MATCH_REACH = 2;
/** A point unseen this long is gone, s. */
const HOLD = 0.5;

export interface FrontPoint {
  /** Fixed while the point is matched step to step. */
  id: number;
  /** Which front (line) it is on. */
  front: number;
  column: number;
  /** Arc length along its front from the −x end, m. */
  sigma: number;
  x: number;
  z: number;
  /** U/C (crestOnset). */
  b: number;
  /** How fast b rose over the last step, per s. */
  bRate: number;
  /** The crest's height above still water, m. */
  height: number;
  /** Whether its B has reached the throw, and when, s (sliceClock). */
  thrown: boolean;
  onset: number;
  /** The slice's clock as drawn, s from its lip's throw: smoothed along the front, never running back (sliceClock). */
  tau: number;
  /** When it was last seen, s. */
  seen: number;
}

export interface FrontState {
  nextId: number;
  nextFront: number;
  /** The points seen at the last update, then those held unseen. */
  points: FrontPoint[];
  held: FrontPoint[];
}

/**
 * The breaking front as lines of points (swept-barrel-build.md, "Front line"; Thürey et al. 2007). A crest whose B
 * has reached the face joins a front; crests in neighbouring columns within LINK_REACH in z link, and a column's own
 * crests never do, so two crests in a column are two fronts and an empty column splits one. A point matched to last
 * step's in its column keeps its ID and clock. Columns go in order, with no randomness, for online determinism.
 */
export class BreakingFront {
  /** This step's points, by front (in order of their −x ends) and σ. */
  points: FrontPoint[] = [];
  /** Points unseen since an earlier step, kept HOLD s for a crest that flickers. */
  private held: FrontPoint[] = [];
  private nextId = 0;
  private nextFront = 0;

  update(samples: readonly CrestSample[], count: number, time: number): void {
    const joining = ONSET.face * ONSET.depthAveraged;
    const previous = [...this.points, ...this.held];
    const byColumn = new Map<number, FrontPoint[]>();
    for (const old of previous) byColumn.set(old.column, [...(byColumn.get(old.column) ?? []), old]);
    const matched = new Set<FrontPoint>();
    const points: FrontPoint[] = [];
    for (let k = 0; k < count; k += 1) {
      const s = samples[k];
      if (!(s.b >= joining)) continue;
      let best: FrontPoint | undefined;
      for (const old of byColumn.get(s.column) ?? []) {
        if (matched.has(old) || !(Math.abs(old.z - s.z) < MATCH_REACH)) continue;
        if (!best || Math.abs(old.z - s.z) < Math.abs(best.z - s.z)) best = old;
      }
      if (best) matched.add(best);
      points.push({
        id: best ? best.id : this.nextId++,
        front: best ? best.front : -1,
        column: s.column,
        sigma: 0,
        x: s.x,
        z: s.z,
        b: s.b,
        bRate: best && time > best.seen ? (s.b - best.b) / (time - best.seen) : 0,
        height: s.eta,
        thrown: best ? best.thrown : false,
        onset: best ? best.onset : 0,
        tau: best ? best.tau : 0,
        seen: time,
      });
    }
    this.points = this.link(points);
    this.held = previous.filter((old) => !matched.has(old) && time - old.seen <= HOLD);
  }

  /** Chains the points column to column into fronts, each numbered as its first matched point's was. */
  private link(points: FrontPoint[]): FrontPoint[] {
    const chains: FrontPoint[][] = [];
    let start = 0;
    while (start < points.length) {
      // Points arrive by column; [start, end) is one column. A chain this column has already grown ends in it, so
      // no two of a column's points link.
      let end = start;
      while (end < points.length && points[end].column === points[start].column) end += 1;
      const column = points[start].column;
      const before = chains.filter((chain) => chain.at(-1)!.column === column - 1);
      for (let k = start; k < end; k += 1) {
        const point = points[k];
        let best: FrontPoint[] | undefined;
        for (const chain of before) {
          const tail = chain.at(-1)!;
          if (tail.column !== column - 1 || !(Math.abs(tail.z - point.z) < LINK_REACH)) continue;
          if (!best || Math.abs(tail.z - point.z) < Math.abs(best.at(-1)!.z - point.z)) best = chain;
        }
        if (best) {
          const tail = best.at(-1)!;
          point.sigma = tail.sigma + Math.hypot(point.x - tail.x, point.z - tail.z);
          best.push(point);
        } else {
          chains.push([point]);
        }
      }
      start = end;
    }
    const claimed = new Set<number>();
    for (const chain of chains) {
      const inherited = chain.find((point) => point.front >= 0 && !claimed.has(point.front))?.front;
      const front = inherited ?? this.nextFront++;
      claimed.add(front);
      for (const point of chain) point.front = front;
    }
    return chains.flat();
  }

  exportState(): FrontState {
    return { nextId: this.nextId, nextFront: this.nextFront, points: this.points.map((p) => ({ ...p })), held: this.held.map((p) => ({ ...p })) };
  }

  importState(state: FrontState): void {
    this.nextId = state.nextId;
    this.nextFront = state.nextFront;
    this.points = state.points.map((p) => ({ ...p }));
    this.held = state.held.map((p) => ({ ...p }));
  }
}
