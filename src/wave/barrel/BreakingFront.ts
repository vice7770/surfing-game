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
/** A point's crest speed is the mean of its crest's `crestMotion` speeds over about this long, s (PR 5; provisional). */
const PACE_SECONDS = 0.1;
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
  /**
   * The swept barrel's crash (PR 5, `SweptCrash`): the lip strip holding its jet from its throw on (−1 when it threw
   * none), and when its lip touched down, s. Absent until then; they travel with the point, and in the sea handover.
   */
  jetStrip?: number;
  crashedAt?: number;
  /**
   * The throw's own window, m: how far from the crest it took the jet (#86's source reach, 2 H). Until its crash the
   * point claims its column's crest over it too (`BreakingFront.update`). Set with `jetStrip`.
   */
  jetWindow?: number;
  /**
   * From its throw (PR 5; the advisor, 2026-10-01): its z runs at `jetPace` (m/s along its column), fixed at the throw,
   * from `jetBase` (its z at τ = 0, m), z = jetBase + jetPace τ, not on the solver's crest; from τ = `jetBlend` it blends
   * toward the crest it claims (`crestZ`) as the loft hands its anchor back, fully by `jetUntil`, and then matches as
   * before. Set with `jetStrip` (`SweptCrash`, which keeps z on it each step).
   */
  jetPace?: number;
  jetBase?: number;
  jetBlend?: number;
  jetUntil?: number;
  /** The solver's crest it claimed this step while on its pace, m; absent with none in reach (PR 5). */
  crestZ?: number;
  /** Its crest's speed along its column over the last few frames, m/s (`crestMotion`, PACE_SECONDS); absent unmeasured. */
  crestSpeed?: number;
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
  /** Steps a point holding an uncrashed jet ran on at its pace with no crest in reach (PR 5; a diagnostic). */
  coasted = 0;
  private readonly linkReach: number;
  private readonly matchReach: number;

  /** `cell`: the rows' spacing where fronts form, m; `timing`: the wedge’s foot, the join and throw depths (sliceClock). */
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
    // A point holding an uncrashed jet runs on its own pace and claims its crest apart (PR 5; see `keptCrests`).
    const jetCrests = this.keptCrests(previous, samples, count, time);
    const plainOf = jetCrests ? byColumn(previous.filter((point) => !runsOnPace(point))) : pointsOf;
    for (let k = 0; k < count; k += 1) {
      const s = samples[k];
      const holder = jetCrests?.get(s);
      if (holder && !matched.has(holder)) {
        // Its slice runs on from the throw at its own pace: the crest says its wave is still there, and where its z
        // blends to as the loft hands its anchor back (SweptCrash).
        matched.add(holder);
        points.push({
          ...holder, sigma: 0, x: s.x, z: holder.z + holder.jetPace! * (time - holder.seen), b: s.b, height: s.eta, crestDepth: s.depth,
          seen: time, crestZ: s.z,
        });
        continue;
      }
      // On a front: it stays while its segment breaks at all.
      const point = this.nearest(plainOf.get(s.column), matched, s.z);
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
        // Its crest's speed over the last few frames: the pace its slice runs on once its jet is thrown (PR 5).
        const crestSpeed = s.speed > 0
          ? point.crestSpeed === undefined ? s.speed : point.crestSpeed + (s.speed - point.crestSpeed) * Math.min(1, (time - point.seen) / PACE_SECONDS)
          : point.crestSpeed;
        points.push({
          ...point, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta, crestDepth: s.depth, thrown, throwZ, seen: time, fresh,
          ...(crestSpeed === undefined ? {} : { crestSpeed }),
        });
        continue;
      }
      const track = this.nearest(tracksOf.get(s.column), followed, s.z, TRACK_REACH);
      if (!track) {
        // A new crest past the foot: followed from here, sized by its height if it is at the foot.
        if (s.depth <= h0) {
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
        // It joins if the solver breaks it before its lip would throw (at the latest in the step its crest reaches the
        // depth), so a tube never throws off water the solver has not broken (the advisor, 2026-09-30).
        if (next.crossed !== null && s.strength > 0 && track.depth > throwDepth) {
          this.joins += 1;
          const throwF = crossingFraction(track.depth, s.depth, throwDepth);
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
        // Past its throw depth and not broken: the solver spilled it, broke it late or not at all, so it has no barrel.
        if (next.crossed !== null && track.depth <= throwDepth) {
          this.unbroken += 1;
          continue;
        }
      }
      tracks.push(next);
    }
    // A point holding an uncrashed jet stays on its front until its crash, with a crest or without: with none in reach
    // it runs on at its pace (PR 5). It goes in by column and z, as the samples come, for the links.
    let coasting = false;
    for (const point of previous) {
      if (matched.has(point) || !runsOnPace(point) || point.crashedAt !== undefined) continue;
      matched.add(point);
      this.coasted += 1;
      coasting = true;
      points.push({ ...point, sigma: 0, z: point.z + point.jetPace! * (time - point.seen), seen: time, crestZ: undefined });
    }
    if (coasting) points.sort((a, b) => a.column - b.column || a.z - b.z);
    this.points = this.link(points);
    this.held = previous.filter((old) => !matched.has(old) && time - old.seen <= HOLD);
    const kept = this.tracks.filter((old) => !followed.has(old) && time - old.seen <= HOLD);
    for (const old of this.tracks) if (!followed.has(old) && !kept.includes(old) && old.footHeight !== null) this.lost += 1;
    this.tracks = [...tracks, ...kept];
  }

  /**
   * The swept barrel's crash (PR 5; the advisor, 2026-10-01). Once its lip is thrown, the depth-averaged solver can't
   * hold the overturn: the crest's highest cell leaps 3–8 m as the face turns into a bore, so it no longer says where
   * the plunging wave is, and following it made the drawing jump and the links break. So from the throw to its crash a
   * point runs on its own pace (`jetPace`): its z advances from where it was last seen, and its links are tested there.
   * It still claims its column's crest nearest that z within the match reach plus the throw's window (`jetWindow`, #86's
   * 2 H), at most TRACK_REACH (waves stand about 100 m apart), so no second point forms on its wave in the column, but it
   * doesn't take the crest's z (`crestZ`; its z blends toward it from `jetBlend` to `jetUntil`, as the loft hands its
   * anchor back). Each such point picks its crest here, before the others match; two wanting one crest: the nearer
   * keeps it. With none in reach it runs on all the same (`coasted`) until its crash. Past `jetUntil`, or crashed with
   * no crest in reach, it goes back to the ordinary match. Points without jets are matched as before; none run on a pace
   * without the crash (undefined then).
   */
  private keptCrests(previous: readonly FrontPoint[], samples: readonly CrestSample[], count: number, time: number): Map<CrestSample, FrontPoint> | undefined {
    let kept: Map<CrestSample, FrontPoint> | undefined;
    let samplesOf: Map<number, CrestSample[]> | undefined;
    for (const point of previous) {
      if (!runsOnPace(point)) continue;
      samplesOf ??= byColumn(samples.slice(0, count));
      const z = point.z + point.jetPace! * (time - point.seen);
      const reach = Math.min(TRACK_REACH, this.matchReach + point.jetWindow!);
      let best: CrestSample | undefined;
      for (const s of samplesOf.get(point.column) ?? []) {
        if (!(Math.abs(s.z - z) < reach)) continue;
        if (!best || Math.abs(s.z - z) < Math.abs(best.z - z)) best = s;
      }
      if (!best) continue;
      kept ??= new Map();
      const other = kept.get(best);
      if (!other || Math.abs(best.z - z) < Math.abs(best.z - (other.z + other.jetPace! * (time - other.seen)))) kept.set(best, point);
    }
    return kept;
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

/**
 * Whether a point runs on its own pace (PR 5; `keptCrests`): it holds a jet whose pace is set, until its crash or, still
 * blending toward its crest then, until `jetUntil`.
 */
function runsOnPace(point: FrontPoint): boolean {
  return point.jetStrip !== undefined && point.jetStrip >= 0 && point.jetPace !== undefined && point.jetWindow !== undefined
    && point.jetWindow > 0 && (point.crashedAt === undefined || (point.jetUntil !== undefined && point.tau < point.jetUntil));
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
