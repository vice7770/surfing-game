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
/** Kennedy's fresh onset for Padang Padang, η_t over √(g d): the swell table's own condition (a diagnostic here). */
const FRESH = 0.65;
/**
 * The crest jump's reach in wave heights, as the advisor first put it (about 1.5 H or 10 m, whichever is smaller,
 * 2026-10-01): recorded beside the metres (`BreakingFront.waveJumps`), not used, since the Reef's maxima jump 2.8–10.8 H.
 */
const JUMP_WAVES = 1.5;

/**
 * A spot's rules for following its crests beyond Padang Padang's; none of them is Padang Padang's front (the
 * advisor's rulings for the Reef, PR 7, 2026-10-01).
 */
export interface FrontOptions {
  /**
   * m: as a crest's face steepens over a ledge, its highest cell jumps forward to the ledge's edge (the Reef's Practice
   * sea: 4 m at the median, 10 m at the 90th percentile, 2.8–10.8 of the wave's heights), and the crest ahead starts a
   * track of its own, unsized, which never joins. With this reach a sized crest continues as the furthest crest ahead
   * of it in its column within it: the tracker follows the wave, not its maximum. 1.5 H would catch none of 200 measured
   * jumps; 10 m catches 192.
   */
  jumpReach?: number;
  /**
   * Wave heights: a sized crest past its throw depth that the solver has not broken may still join while it runs this
   * many of its wave heights past that depth, throwing where the solver breaks it (the Reef's small waves break only as
   * they cross onto its top).
   */
  joinPast?: number;
}

/** A crest followed shoreward from the wedge's foot until it joins a front, or is dropped. */
export interface CrestTrack {
  column: number;
  z: number;
  /** Its height above still water as it crossed the foot, m; null when first seen past the foot band (it never joins). */
  footHeight: number | null;
  /** Its highest over the timing's band of depth nearer the break, m, which sizes its join; null until it reaches it. */
  refHeight: number | null;
  /** The still depth under it at its last step, m, and when that was, s. */
  depth: number;
  seen: number;
  /** When it crossed its join depth, s; null until then. */
  crossed: number | null;
  /** The still depth where its segment first rose at Kennedy's fresh onset, m; null until then (a diagnostic). */
  fresh: number | null;
  /** With `FrontOptions.joinPast`: its crest's z where it crossed its throw depth unbroken, m, and its wave's height there, m. */
  passedZ?: number;
  passedWave?: number;
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
  /** The still depth where its lip throws, m (no deeper than its join), under its crest at its last step, m, and when its crest crossed it, s; null until then. */
  throwDepth: number;
  crestDepth: number;
  thrown: number | null;
  /** Its crest's z where it crossed its throw depth, m, as `thrown` is interpolated: the τ = 0 crest the loft anchors on; null until then. */
  throwZ: number | null;
  /** Its crest's height at the wedge's foot, m, and the still depth there, m: they size and scale its profile (the loft). */
  footHeight: number;
  footDepth: number;
  /** When the solver was first seen breaking its segment, s: its lip never throws before (sliceClock). */
  broke: number;
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
 *   (the timing's h0), and sized by its highest over a band of depth nearer the break (the timing's), before anything
 *   near it breaks. It joins where it crosses the depth at which the solver first breaks swell that size fresh (the 1D runs,
 *   `OnsetTiming.joinDepth`), at the moment it crosses, provided the solver breaks its segment before it reaches the
 *   depth where its lip throws, where the Navier–Stokes wave its foot height goes vertical (`OnsetTiming.throwDepth`),
 *   at the latest in the step it gets there. A crest reads its own place, not its rise: once a neighbour
 *   breaks, the eddy viscosity damps a column's rise (fresh crossings came ~2 s late, or never) and its inherited age
 *   is the event's, so neither can time a peel. Here the peel is each column's crest reaching its breaking depth in
 *   turn, from the bed.
 * - **On the front** a crest stays while its segment breaks. Crests in neighbouring columns within LINK_ROWS rows in
 *   z link, a column's own never do (two crests in a column are two fronts, an empty column splits one), and
 *   neighbours whose joins differ by more than SPLIT per metre are two waves: two fronts, smoothed apart. A point
 *   matched to last step's in its column keeps its ID, join and clock.
 * - **A spot's own rules** (`FrontOptions`; the Reef's): a sized crest follows its highest cell as it jumps forward
 *   over a ledge, and may join a little past its throw depth when the solver breaks it there.
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
  /**
   * Crests followed from the foot that joined, crossed their join depth without breaking, and were lost before either;
   * and crests first seen past the foot (reformed and broken water), never sized (diagnostics).
   */
  joins = 0;
  unbroken = 0;
  lost = 0;
  unsized = 0;
  /**
   * Crest jumps (diagnostics): with `jumpReach`, the sized crests that continued as a crest ahead of the one nearest them;
   * without, the new crests first seen ahead of a sized one in its column within TRACK_REACH, which the reach would give
   * it. `waveJumps`: those within JUMP_WAVES of the wave's heights. `latePasses`: joins past the throw depth (`joinPast`).
   */
  jumps = 0;
  waveJumps = 0;
  latePasses = 0;
  private readonly linkReach: number;
  private readonly matchReach: number;

  /**
   * `cell`: the rows' spacing where fronts form, m; `timing`: the wedge’s foot, the join and throw depths (sliceClock);
   * `options`: the spot's rules beyond Padang Padang's (none there).
   */
  constructor(cell: number, private readonly timing: OnsetTiming, private readonly options: FrontOptions = {}) {
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
    const leading = this.options.jumpReach === undefined ? undefined : this.leadingCrests(samples, count, tracksOf, pointsOf, followed);
    for (let k = 0; k < count; k += 1) {
      const s = samples[k];
      // On a front: it stays while its segment breaks at all.
      const point = this.nearest(pointsOf.get(s.column), matched, s.z);
      if (point) {
        if (!(s.strength > 0)) continue;
        matched.add(point);
        const fresh = point.fresh ?? (s.rise >= FRESH ? s.depth : null);
        let { thrown, throwZ } = point;
        if (thrown === null) {
          const f = crossingFraction(point.crestDepth, s.depth, point.throwDepth);
          if (f !== null) {
            thrown = point.seen + f * (time - point.seen);
            throwZ = point.z + f * (s.z - point.z);
          }
        }
        points.push({ ...point, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta, crestDepth: s.depth, thrown, throwZ, seen: time, fresh });
        continue;
      }
      const track = leading?.get(s) ?? this.nearest(tracksOf.get(s.column), followed, s.z, TRACK_REACH);
      if (!track) {
        // A new crest past the foot: followed from here, sized by its height if it is at the foot.
        if (s.depth <= h0) {
          if (!leading) this.countJump(tracksOf.get(s.column), s);
          const footHeight = s.depth >= h0 - FOOT_BAND ? s.eta : null;
          if (footHeight === null) this.unsized += 1;
          const refHeight = footHeight !== null && s.depth <= this.timing.band[0] ? s.eta : null;
          tracks.push({ column: s.column, z: s.z, footHeight, refHeight, depth: s.depth, seen: time, crossed: null, fresh: s.rise >= FRESH ? s.depth : null });
        }
        continue;
      }
      followed.add(track);
      const next: CrestTrack = { ...track, z: s.z, depth: s.depth, seen: time, fresh: track.fresh ?? (s.rise >= FRESH ? s.depth : null) };
      // Its highest over the band; past the band, the first reading if it crossed the band between two steps.
      const [deeper, shallower] = this.timing.band;
      if (track.footHeight !== null && s.depth <= deeper && (s.depth >= shallower || next.refHeight === null)) {
        next.refHeight = Math.max(next.refHeight ?? s.eta, s.eta);
      }
      if (next.footHeight !== null && next.refHeight !== null && s.depth < shallower) {
        const joinDepth = this.timing.joinDepth(next.refHeight);
        const throwDepth = Math.min(joinDepth, this.timing.throwDepth(next.footHeight));
        if (next.crossed === null) {
          const joinF = crossingFraction(track.depth, s.depth, joinDepth);
          if (joinF !== null) next.crossed = track.seen + joinF * (time - track.seen);
        }
        // With `joinPast`, where it crossed its throw depth, and whether it is still within the reach past it.
        const { joinPast } = this.options;
        if (joinPast !== undefined && next.passedZ === undefined && s.depth <= throwDepth) {
          const passF = crossingFraction(track.depth, s.depth, throwDepth) ?? 1;
          next.passedZ = track.z + passF * (s.z - track.z);
          next.passedWave = s.wave;
        }
        const late = joinPast !== undefined && next.passedZ !== undefined && s.z - next.passedZ <= joinPast * next.passedWave!;
        // It joins if the solver breaks it before its lip would throw (at the latest in the step its crest reaches the
        // depth), so a tube never throws off water the solver has not broken (the advisor, 2026-09-30). With
        // `joinPast` it may join up to that many of its wave heights past the depth, its lip throwing as it joins.
        if (next.crossed !== null && s.strength > 0 && (track.depth > throwDepth || late)) {
          this.joins += 1;
          const past = track.depth <= throwDepth;
          if (past) this.latePasses += 1;
          const throwF = past ? 1 : crossingFraction(track.depth, s.depth, throwDepth);
          points.push({
            id: this.nextId++, front: -1, column: s.column, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta,
            joined: next.crossed, depth: joinDepth, throwDepth, crestDepth: s.depth,
            thrown: throwF === null ? null : track.seen + throwF * (time - track.seen),
            throwZ: throwF === null ? null : track.z + throwF * (s.z - track.z),
            footHeight: next.footHeight, footDepth: this.timing.h0,
            // Its clock starts at the library's earliest frame; the first advance puts it where the fit does.
            broke: time, tau: this.timing.earliest, seen: time, fresh: next.fresh,
          });
          continue;
        }
        // Past its throw depth (and the join's reach) and not broken: the solver spilled it, broke it late or not at
        // all, so it has no barrel.
        if (next.crossed !== null && track.depth <= throwDepth && !late) {
          this.unbroken += 1;
          continue;
        }
      }
      tracks.push(next);
    }
    this.points = this.link(points);
    this.held = previous.filter((old) => !matched.has(old) && time - old.seen <= HOLD);
    const kept = this.tracks.filter((old) => !followed.has(old) && time - old.seen <= HOLD);
    for (const old of this.tracks) if (!followed.has(old) && !kept.includes(old) && old.footHeight !== null) this.lost += 1;
    this.tracks = [...tracks, ...kept];
  }

  /**
   * With `jumpReach`: each sized crest's continuation, the furthest crest in its column from a match reach behind it to
   * the jump reach ahead, claimed before the other crests match; a crest beside a front point is the point's. A jump
   * when it is not the crest nearest it.
   */
  private leadingCrests(
    samples: readonly CrestSample[], count: number, tracksOf: Map<number, CrestTrack[]>, pointsOf: Map<number, FrontPoint[]>,
    followed: Set<CrestTrack>,
  ): Map<CrestSample, CrestTrack> {
    const leading = new Map<CrestSample, CrestTrack>();
    const reach = this.options.jumpReach!;
    let start = 0;
    while (start < count) {
      // Samples arrive by column; [start, end) is one column.
      const column = samples[start].column;
      let end = start;
      while (end < count && samples[end].column === column) end += 1;
      const points = pointsOf.get(column) ?? [];
      for (const track of tracksOf.get(column) ?? []) {
        if (track.footHeight === null) continue;
        let furthest: CrestSample | undefined;
        let nearest: CrestSample | undefined;
        for (let k = start; k < end; k += 1) {
          const s = samples[k];
          const ahead = s.z - track.z;
          if (ahead < -this.matchReach || ahead > reach || leading.has(s)) continue;
          if (points.some((point) => Math.abs(point.z - s.z) < this.matchReach)) continue;
          if (!furthest || s.z > furthest.z) furthest = s;
          if (!nearest || Math.abs(ahead) < Math.abs(nearest.z - track.z)) nearest = s;
        }
        if (!furthest) continue;
        if (furthest !== nearest) {
          this.jumps += 1;
          if (furthest.z - track.z <= JUMP_WAVES * furthest.wave) this.waveJumps += 1;
        }
        leading.set(furthest, track);
        followed.add(track);
      }
      start = end;
    }
    return leading;
  }

  /** Without `jumpReach`: counts a new crest first seen ahead of a sized one in its column within TRACK_REACH. */
  private countJump(tracks: readonly CrestTrack[] | undefined, s: CrestSample): void {
    for (const sized of tracks ?? []) {
      const ahead = s.z - sized.z;
      if (sized.footHeight === null || !(ahead > 0) || ahead > TRACK_REACH) continue;
      this.jumps += 1;
      if (ahead <= JUMP_WAVES * s.wave) this.waveJumps += 1;
      return;
    }
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

/** How far between a crest at `fromDepth` and at `depth` it crossed `at`, 0–1, linear in depth; null if it has not. */
function crossingFraction(fromDepth: number, depth: number, at: number): number | null {
  if (depth > at) return null;
  return fromDepth > depth ? Math.min(1, Math.max(0, (fromDepth - at) / (fromDepth - depth))) : 1;
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
