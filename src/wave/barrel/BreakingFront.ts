import type { CrestSample } from './crestOnset';
import type { OnsetTiming } from './sliceClock';

/** Crests in neighbouring columns this many rows apart in z are one front (provisional). */
const LINK_ROWS = 3;
/** A crest this close in z to last step's in its column is the same point, m (provisional: 20 m/s × 0.1 s), plus a row, its cell's jump. */
const MATCH_REACH = 2;
/**
 * A crest on its way in, not yet breaking, is the same one this close, m: a long swell's crest is broad and flat on
 * the ramp, so its highest cell jumps metres between steps, while crests there stand a wavelength (100 m and more) apart
 * (provisional).
 */
const TRACK_REACH = 10;
/** A point unseen this long is gone, s. */
const HOLD = 0.5;
/**
 * Neighbours whose joins differ by more than this per metre between them are two waves, not a peel: 1 s/m is a peel
 * under 1 m/s, a crest running almost straight up the contours (θ > 79° at c ≈ 5 m/s), where Padang Padang peels at
 * 0.1–0.2 s/m and consecutive waves join most of a 16 s period apart (the advisor, 2026-09-30).
 */
const SPLIT = 1;
/** A crest first seen this far shoreward of the wedge's foot has no foot height to size it by, m (provisional). */
const FOOT_BAND = 1;
/** A crest that crossed its join depth joins if its segment breaks within this long, s; else the solver never broke it (the advisor, provisional). */
const JOIN_WINDOW = 1;
/** Kennedy's fresh onset for Padang Padang, η_t over √(g d): the swell table's own condition (a diagnostic here). */
const FRESH = 0.65;

/** A crest followed shoreward from the wedge's foot until it joins a front, or is dropped. */
export interface CrestTrack {
  column: number;
  z: number;
  /** Its height above still water as it crossed the foot, m; null when first seen past the foot band (it never joins). */
  footHeight: number | null;
  /** The still depth under it at its last step, m, and when that was, s. */
  depth: number;
  seen: number;
  /** When it crossed its join depth, s; null until then. */
  crossed: number | null;
  /** The still depth where its segment first rose at Kennedy's fresh onset, m; null until then (a diagnostic). */
  fresh: number | null;
}

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
  /** U/C, a diagnostic (crestOnset); NaN unmeasured. */
  b: number;
  /** The crest's height above still water, m. */
  height: number;
  /** When its crest crossed its join depth (it joined), s, and that depth, m: its clock's start. */
  joined: number;
  depth: number;
  /** The slice's clock as drawn, s from its lip's throw: smoothed along the front, never running back (sliceClock). */
  tau: number;
  /** The still depth where its crest first rose at Kennedy's fresh onset, m; null until then (a diagnostic of the join table). */
  fresh: number | null;
  /** When it was last seen, s. */
  seen: number;
}

export interface FrontState {
  nextId: number;
  nextFront: number;
  /** The points seen at the last update, then those held unseen. */
  points: FrontPoint[];
  held: FrontPoint[];
  /** Crests followed from the foot, not yet joined. */
  tracks: CrestTrack[];
}

/**
 * The breaking front as lines of points (swept-barrel-build.md, "Front line"; Thürey et al. 2007).
 *
 * - **The join, by depth** (the advisor, 2026-09-30). Each crest is followed from where it crosses the wedge's foot
 *   (the timing's h0), its height there sizing it before anything near it breaks. It joins where it crosses the depth
 *   at which a wave that size first breaks fresh (the 1D runs, `OnsetTiming.joinDepth`), at the moment it crosses,
 *   provided its segment breaks within JOIN_WINDOW. A crest reads its own place, not its rise: once a neighbour
 *   breaks, the eddy viscosity damps a column's rise (fresh crossings came ~2 s late, or never) and its inherited age
 *   is the event's, so neither can time a peel. Here the peel is each column's crest reaching its breaking depth in
 *   turn, from the bed.
 * - **On the front** a crest stays while its segment breaks. Crests in neighbouring columns within LINK_ROWS rows in
 *   z link, a column's own never do (two crests in a column are two fronts, an empty column splits one), and
 *   neighbours whose joins differ by more than SPLIT per metre are two waves: two fronts, smoothed apart. A point
 *   matched to last step's in its column keeps its ID, join and clock.
 *
 * Columns go in order, with no randomness, and only + − × ÷ and √, for online determinism.
 */
export class BreakingFront {
  /** This step's points, by front (in order of their −x ends) and σ. */
  points: FrontPoint[] = [];
  /** Points unseen since an earlier step, kept HOLD s for a crest that flickers. */
  private held: FrontPoint[] = [];
  private nextId = 0;
  private nextFront = 0;
  private tracks: CrestTrack[] = [];
  /** Links refused since the start because the two crests joined too far apart to be one wave (a diagnostic). */
  splits = 0;
  /** Crests followed from past the foot unsized, dropped having crossed without breaking, and lost unjoined (diagnostics). */
  unsized = 0;
  unbroken = 0;
  lost = 0;
  private readonly linkReach: number;
  private readonly matchReach: number;

  /** `cell`: the rows' spacing where fronts form, m; `timing`: the wedge's foot and the join depths (sliceClock). */
  constructor(cell: number, private readonly timing: OnsetTiming) {
    this.linkReach = LINK_ROWS * cell;
    this.matchReach = MATCH_REACH + cell;
  }

  update(samples: readonly CrestSample[], count: number, time: number): void {
    const previous = [...this.points, ...this.held];
    const pointsOf = byColumn(previous);
    const tracksOf = byColumn(this.tracks);
    const matched = new Set<FrontPoint>();
    const followed = new Set<CrestTrack>();
    const points: FrontPoint[] = [];
    const tracks: CrestTrack[] = [];
    const { h0 } = this.timing;
    for (let k = 0; k < count; k += 1) {
      const s = samples[k];
      // On a front: it stays while its segment breaks at all.
      const point = this.nearest(pointsOf.get(s.column), matched, s.z);
      if (point) {
        if (!(s.strength > 0)) continue;
        matched.add(point);
        const fresh = point.fresh ?? (s.rise >= FRESH ? s.depth : null);
        points.push({ ...point, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta, seen: time, fresh });
        continue;
      }
      const track = this.nearest(tracksOf.get(s.column), followed, s.z, TRACK_REACH);
      if (!track) {
        // A new crest past the foot: followed from here, sized by its height if it is at the foot.
        if (s.depth <= h0) {
          const footHeight = s.depth >= h0 - FOOT_BAND ? s.eta : null;
          if (footHeight === null) this.unsized += 1;
          tracks.push({ column: s.column, z: s.z, footHeight, depth: s.depth, seen: time, crossed: null, fresh: s.rise >= FRESH ? s.depth : null });
        }
        continue;
      }
      followed.add(track);
      const next: CrestTrack = { ...track, z: s.z, depth: s.depth, seen: time, fresh: track.fresh ?? (s.rise >= FRESH ? s.depth : null) };
      if (track.footHeight !== null) {
        const joinDepth = this.timing.joinDepth(track.footHeight);
        if (track.crossed === null && s.depth <= joinDepth) {
          // When it crossed, linear in depth between the last step and this one.
          const f = track.depth > s.depth ? Math.min(1, Math.max(0, (track.depth - joinDepth) / (track.depth - s.depth))) : 1;
          next.crossed = track.seen + f * (time - track.seen);
        }
        if (next.crossed !== null && s.strength > 0 && time - next.crossed <= JOIN_WINDOW) {
          points.push({
            id: this.nextId++, front: -1, column: s.column, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta,
            // Its clock starts at the library's earliest frame; the first advance puts it where the fit does.
            joined: next.crossed, depth: joinDepth, tau: this.timing.earliest, seen: time, fresh: next.fresh,
          });
          continue;
        }
        // Crossed and never broken: the solver spilled or did not break it, so it has no barrel.
        if (next.crossed !== null && time - next.crossed > JOIN_WINDOW) {
          this.unbroken += 1;
          continue;
        }
      }
      tracks.push(next);
    }
    this.points = this.link(points);
    this.held = previous.filter((old) => !matched.has(old) && time - old.seen <= HOLD);
    const kept = this.tracks.filter((old) => !followed.has(old) && time - old.seen <= HOLD);
    this.lost += this.tracks.length - followed.size - kept.length;
    this.tracks = [...tracks, ...kept];
  }

  /** The unclaimed one of `candidates` nearest `z` within the match reach. */
  private nearest<T extends { z: number }>(candidates: readonly T[] | undefined, claimed: Set<T>, z: number, reach = this.matchReach): T | undefined {
    let best: T | undefined;
    for (const candidate of candidates ?? []) {
      if (claimed.has(candidate) || !(Math.abs(candidate.z - z) < reach)) continue;
      if (!best || Math.abs(candidate.z - z) < Math.abs(best.z - z)) best = candidate;
    }
    return best;
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
          if (tail.column !== column - 1 || !(Math.abs(tail.z - point.z) < this.linkReach)) continue;
          const dx = point.x - tail.x;
          const dz = point.z - tail.z;
          if (Math.abs(point.joined - tail.joined) > SPLIT * Math.sqrt(dx * dx + dz * dz)) {
            this.splits += 1;
            continue;
          }
          if (!best || Math.abs(tail.z - point.z) < Math.abs(best.at(-1)!.z - point.z)) best = chain;
        }
        if (best) {
          const tail = best.at(-1)!;
          const dx = point.x - tail.x;
          const dz = point.z - tail.z;
          point.sigma = tail.sigma + Math.sqrt(dx * dx + dz * dz);
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
    return {
      nextId: this.nextId, nextFront: this.nextFront, points: this.points.map((p) => ({ ...p })), held: this.held.map((p) => ({ ...p })),
      tracks: this.tracks.map((t) => ({ ...t })),
    };
  }

  importState(state: FrontState): void {
    this.nextId = state.nextId;
    this.nextFront = state.nextFront;
    this.points = state.points.map((p) => ({ ...p }));
    this.held = state.held.map((p) => ({ ...p }));
    this.tracks = (state.tracks ?? []).map((t) => ({ ...t }));
  }
}

function byColumn<T extends { column: number }>(items: readonly T[]): Map<number, T[]> {
  const map = new Map<number, T[]>();
  for (const item of items) {
    const list = map.get(item.column);
    if (list) list.push(item);
    else map.set(item.column, [item]);
  }
  return map;
}
