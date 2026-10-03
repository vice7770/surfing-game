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
/**
 * The crest jump's reach in wave heights, as the advisor first put it (about 1.5 H or 10 m, whichever is smaller,
 * 2026-10-01): recorded beside the metres (`BreakingFront.waveJumps`), not used, since the Reef's maxima jump 2.8–10.8 H.
 */
const JUMP_WAVES = 1.5;
/**
 * With `clockLink`: the farthest a front's head may be from the chain end it continues, m (provisional: the crest jump's
 * reach; the advisor, 2026-10-03).
 */
const CLOCK_REACH = 10;
/**
 * With `clockLink`: the most the two joins may differ per metre between them, s/m (provisional): twice the 0.083 s/m at
 * which the fronts' own joins peeled on Padang Padang's base before the jump rule (the padangFrontGap runs; the medians
 * on #105's are 0.086–0.090). That is 6 times under SPLIT, so a peel links and a split wave does not: of the probe's 364
 * true splits on Medium, 2 passed it at some frame, and 0 of 4 on Small.
 */
const CLOCK_SLOPE = 2 * 0.083;
/** With `clockLink`: how many empty columns a head may bridge to the chain end it continues (the advisor, 2026-10-03: one-column gaps). */
const CLOCK_BRIDGE = 1;

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
  /**
   * With `jumpReach`: a crest that has jumped joins only on its own fresh onset, its segment's rise at least FRESH at the
   * jump's step or later while its throw depth is still ahead (the jump's step even past it). Strength above zero alone
   * no longer qualifies it: a bore's front keeps breaking without starting to break again (Kennedy et al. 2000's split
   * between 0.65 and the 0.15 floor), and a jump moves the crest's segment into the bore ahead. Its join is that step's
   * time, never a fraction across the jump (a spatial step), and past its throw depth it throws as it joins (the advisor,
   * 2026-10-01; #105's fast fronts were all jumped crests over the +x channel and by the −x edge).
   */
  ownOnset?: boolean;
  /**
   * Links by the clock what the 3-row reach and an empty column split (the advisor, 2026-10-03; off): one breaking crest
   * drawn as two fronts end to end. On #105's Small sea (150 s) 1262 such pairs formed, 638 of them where the highest cell
   * jumped and the crest restarted unsized, 190 where the neighbour stood 3 rows or more off in z and 79 where a point
   * flickered; Medium's 3071 were led by 1109 restarted points. A point that no neighbour in the column before took continues
   * the nearest chain end in that column or the one before it (a one-column gap) within CLOCK_REACH, when their joins
   * differ by at most CLOCK_SLOPE per metre between them. The 1 s/m split (SPLIT) is left as it is: it still refuses the
   * neighbours it refused, and the clock's slope is a sixth of it, so a pair it refuses is never linked as it stands.
   * Nothing asks that the two ends lie on one crest line: within 10 m it may join two waves' fronts whose joins agree (the
   * padangFrontGap probe counts those links).
   *
   * Each step keeps every link the rules above make, and the next step matches crests to points in the order the front
   * lists them without the switch (`FrontState.order`): a crest exactly as far from two points in its column takes the
   * one listed first, and the joined fronts list them otherwise. So its points stay the switch-off front's, the same
   * crests with the same IDs and joins, step after step; only the links differ, and with them the fronts' numbers, σ and
   * the clocks smoothed along them.
   */
  clockLink?: boolean;
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
  /** How many times it continued as a crest ahead of the one nearest it (`FrontOptions.jumpReach`); absent: none (a diagnostic). */
  jumped?: number;
  /** With `FrontOptions.ownOnset`: whether its own fresh onset has come since its last jump; absent: it hasn't jumped. */
  risen?: boolean;
}

export interface FrontPoint {
  /** Fixed while the point is matched step to step. */
  id: number;
  /** Which front (line) it is on. */
  front: number;
  column: number;
  /** Arc length along its front from the −x end, m (straight across a gap the front bridged, `FrontOptions.clockLink`). */
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
  /** How many times its crest's track jumped ahead before it joined (`CrestTrack.jumped`); absent: none (a diagnostic). */
  jumped?: number;
  /** When it was last seen, s. */
  seen: number;
  /**
   * The swept barrel's crash (PR 5, `SweptCrash`): the lip strip holding its jet from its throw on (−1 when it threw
   * none), and when its lip touched down, s. Absent until then; they travel with the point, and in the sea handover.
   */
  jetStrip?: number;
  crashedAt?: number;
  /**
   * The throw's own window, m: how far from the crest a jet takes its water (#86's source reach, 2 H). While on its pace
   * the point claims its column's crest over it too (`BreakingFront.update`). Set at the throw, with the pace.
   */
  jetWindow?: number;
  /**
   * From its throw, jet or not (PR 5; the advisor, 2026-10-01 and 2026-10-03): its z runs at `jetPace` (m/s along its
   * column), fixed at the throw, from `jetBase` (its z at τ = 0, m), z = jetBase + jetPace τ, not on the solver's crest,
   * though it claims the crest (`crestZ`), until τ reaches `jetUntil`, its slice's end (touchdown + collapse, s); then it
   * matches as before. `jetAt`: the solver time of its throw, s (a stall: `SweptCrash`). Set at its throw by `SweptCrash`,
   * which keeps z on the pace each step.
   */
  jetPace?: number;
  jetBase?: number;
  jetUntil?: number;
  jetAt?: number;
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
  /**
   * With `FrontOptions.clockLink`: the points' IDs in the order the front lists them without it, which it matches crests
   * by; absent when that is their order here (no clock link joined any).
   */
  order?: number[];
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
 * - **The clock link** (`FrontOptions.clockLink`, off): after the links above, a point left at the head of a new chain
 *   continues the nearest chain end up to a column further back, within CLOCK_REACH m, when their joins agree within
 *   CLOCK_SLOPE per metre. It only joins chains the rules above left apart: every link they make stands, the points stay
 *   the switch-off front's, and with the switch off none of this runs.
 *
 * Columns go in order, with no randomness, and only + − × ÷ and √, for online determinism.
 */
export class BreakingFront {
  /** This step's points, by front (in order of their −x ends) and σ. */
  points: FrontPoint[] = [];
  /**
   * With `clockLink`, after a step whose clock links joined fronts: the same points as the chains list them before the
   * joins, the order the front lists them in without the switch. The next step matches crests to points in this order, so
   * a crest as far from two points in its column takes the one it would take without the switch.
   */
  private order: FrontPoint[] | undefined;
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
  /** Steps a point on its pace (jet or not) ran on at it with no crest in reach (PR 5; a diagnostic). */
  coasted = 0;
  /** With `ownOnset`: jumped crests that crossed their throw depth before their own fresh onset came (a diagnostic). */
  unrisen = 0;
  /**
   * With `clockLink`, counted a step as `splits` is (diagnostics): the heads that continued a chain end in the column before,
   * each past the 3-row reach (an end within it that the 1 s/m split refused, the clock refuses too), and those that
   * continued one across a column in which neither chain had a point (another front's may stand there).
   */
  clockLinks = 0;
  bridges = 0;
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
    const previous = [...(this.order ?? this.points), ...this.held];
    const pointsOf = byColumn(previous);
    const tracksOf = byColumn(this.tracks);
    const matched = new Set<FrontPoint>();
    const followed = new Set<CrestTrack>();
    const points: FrontPoint[] = [];
    const tracks: CrestTrack[] = [];
    const { h0 } = this.timing;
    // A point past its throw runs on its own pace and claims its crest apart (PR 5; see `keptCrests`).
    const jetCrests = this.keptCrests(previous, samples, count, time);
    const plainOf = jetCrests ? byColumn(previous.filter((point) => !runsOnPace(point))) : pointsOf;
    const jumped = new Set<CrestTrack>();
    const leading = this.options.jumpReach === undefined ? undefined : this.leadingCrests(samples, count, tracksOf, plainOf, jetCrests, followed, jumped);
    for (let k = 0; k < count; k += 1) {
      const s = samples[k];
      const holder = jetCrests?.get(s);
      if (holder && !matched.has(holder)) {
        // Its slice runs on from the throw at its own pace: the crest says its wave is still there (SweptCrash).
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
      const jumpedNow = jumped.has(track);
      if (jumpedNow) next.jumped = (track.jumped ?? 0) + 1;
      // With `ownOnset`, a jump waits for its crest's own fresh onset, which may come in the jump's step itself.
      const ownOnset = this.options.ownOnset === true && next.jumped !== undefined;
      if (ownOnset && jumpedNow) next.risen = false;
      if (ownOnset && s.rise >= FRESH) next.risen = true;
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
          // Across a jump (a spatial step) a fraction between the two crests' depths would invent a time.
          if (joinF !== null) next.crossed = ownOnset && jumpedNow ? time : track.seen + joinF * (time - track.seen);
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
        // With `ownOnset`, a jumped crest joins on its own fresh onset alone, in the jump's step or while its throw depth
        // is still ahead, and its join is that step's time; past its throw depth it throws as it joins.
        const own = ownOnset && next.risen === true;
        if (next.crossed !== null && s.strength > 0 && (!ownOnset || own) && (track.depth > throwDepth || late || (own && jumpedNow))) {
          this.joins += 1;
          if (track.depth <= throwDepth) this.latePasses += 1;
          // Past its throw depth, it throws as it joins: after it (late), or carried past it by the jump.
          const past = track.depth <= throwDepth || (ownOnset && jumpedNow && s.depth <= throwDepth);
          const throwF = past ? 1 : crossingFraction(track.depth, s.depth, throwDepth);
          points.push({
            id: this.nextId++, front: -1, column: s.column, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta,
            joined: ownOnset ? time : next.crossed, depth: joinDepth, throwDepth, crestDepth: s.depth,
            thrown: throwF === null ? null : track.seen + throwF * (time - track.seen),
            throwZ: throwF === null ? null : track.z + throwF * (s.z - track.z),
            footHeight: next.footHeight, footDepth: this.timing.h0,
            // Its clock starts at the library's earliest frame; the first advance puts it where the fit does.
            broke: time, tau: this.timing.earliest, seen: time, fresh: next.fresh,
            ...(next.jumped ? { jumped: next.jumped } : {}),
          });
          continue;
        }
        // Past its throw depth (and the join's reach) and not broken: the solver spilled it, broke it late or not at
        // all, so it has no barrel.
        if (next.crossed !== null && track.depth <= throwDepth && !late) {
          this.unbroken += 1;
          if (ownOnset && track.risen === false) this.unrisen += 1;
          continue;
        }
      }
      tracks.push(next);
    }
    // A point on its pace stays on its front until its slice has faded, with a crest or without: with none in reach it
    // runs on at its pace (PR 5; the advisor, 2026-10-03). It goes in by column and z, as the samples come, for the links.
    let coasting = false;
    for (const point of previous) {
      if (matched.has(point) || !runsOnPace(point)) continue;
      matched.add(point);
      this.coasted += 1;
      coasting = true;
      points.push({ ...point, sigma: 0, z: point.z + point.jetPace! * (time - point.seen), seen: time, crestZ: undefined });
    }
    if (coasting) points.sort((a, b) => a.column - b.column || a.z - b.z);
    const linked = this.link(points);
    this.points = linked.fronts;
    this.order = linked.order;
    this.held = previous.filter((old) => !matched.has(old) && time - old.seen <= HOLD);
    const kept = this.tracks.filter((old) => !followed.has(old) && time - old.seen <= HOLD);
    for (const old of this.tracks) if (!followed.has(old) && !kept.includes(old) && old.footHeight !== null) this.lost += 1;
    this.tracks = [...tracks, ...kept];
  }

  /**
   * With `jumpReach`: each sized crest's continuation, the furthest crest in its column from a match reach behind it to
   * the jump reach ahead, claimed before the other crests match; a crest beside a front point is the point's, and a
   * crest a point on its pace has kept (`kept`, from `keptCrests`, PR 5: jet or not, from its throw until its slice has
   * faded) is its: `pointsOf` holds the points that match by z, not those on their pace, which claim theirs apart. A
   * jump when it is not the crest nearest it.
   */
  private leadingCrests(
    samples: readonly CrestSample[], count: number, tracksOf: Map<number, CrestTrack[]>, pointsOf: Map<number, FrontPoint[]>,
    kept: ReadonlyMap<CrestSample, FrontPoint> | undefined, followed: Set<CrestTrack>, jumped: Set<CrestTrack>,
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
          if (ahead < -this.matchReach || ahead > reach || leading.has(s) || kept?.has(s)) continue;
          if (points.some((point) => Math.abs(point.z - s.z) < this.matchReach)) continue;
          if (!furthest || s.z > furthest.z) furthest = s;
          if (!nearest || Math.abs(ahead) < Math.abs(nearest.z - track.z)) nearest = s;
        }
        if (!furthest) continue;
        if (furthest !== nearest) {
          this.jumps += 1;
          jumped.add(track);
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

  /**
   * The swept barrel's crash (PR 5; the advisor, 2026-10-01 and 2026-10-03). Once its lip is thrown, the depth-averaged
   * solver can't hold the overturn: the crest's highest cell leaps 3–8 m as the face turns into a bore, so it no longer
   * says where the plunging wave is, and following it made the drawing jump and the links break. So from its throw until
   * its slice has faded (`jetUntil`) a point, jet or not, runs on its own pace (`jetPace`): its z advances from where it
   * was last seen, and its links are tested there. It still claims its column's crest nearest that z within the match
   * reach plus the throw's window (`jetWindow`, #86's 2 H), at most TRACK_REACH (waves stand about 100 m apart), so no
   * second point forms on its wave in the column, but it doesn't take the crest's z (`crestZ`). Each such point picks its
   * crest here, before the others match; two wanting one crest: the nearer keeps it. With none in reach it runs on all
   * the same (`coasted`). Past `jetUntil` it goes back to the ordinary match. Points before their throw are matched as
   * before; none run on a pace without the crash (undefined then).
   */
  private keptCrests(previous: readonly FrontPoint[], samples: readonly CrestSample[], count: number, time: number): Map<CrestSample, FrontPoint> | undefined {
    let kept: Map<CrestSample, FrontPoint> | undefined;
    let samplesOf: Map<number, CrestSample[]> | undefined;
    for (const point of previous) {
      if (!runsOnPace(point)) continue;
      samplesOf ??= byColumn(samples.slice(0, count));
      const z = point.z + point.jetPace! * (time - point.seen);
      const reach = Math.min(TRACK_REACH, this.matchReach + Math.max(0, point.jetWindow ?? 0));
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

  /**
   * Chains the points column to column into fronts, each numbered as its first matched point's was; with `clockLink`, when
   * its links joined chains, also the points as the chains list them before the joins (`order`).
   */
  private link(points: FrontPoint[]): { fronts: FrontPoint[]; order: FrontPoint[] | undefined } {
    const chains: FrontPoint[][] = [];
    // With `clockLink`: each chain that continues another, under the chain it continues, and the chains continued.
    const clock = this.options.clockLink === true ? { parents: new Map<FrontPoint[], FrontPoint[]>(), continued: new Set<FrontPoint[]>() } : undefined;
    let start = 0;
    while (start < points.length) {
      // Points arrive by column; [start, end) is one column. A chain this column has already grown ends in it, so
      // no two of a column's points link.
      let end = start;
      while (end < points.length && points[end].column === points[start].column) end += 1;
      const column = points[start].column;
      const before = chains.filter((chain) => chain.at(-1)!.column === column - 1);
      const heads: FrontPoint[][] | undefined = clock ? [] : undefined;
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
          const head = [point];
          chains.push(head);
          heads?.push(head);
        }
      }
      if (clock && heads && heads.length > 0) this.linkByClock(chains, heads, column, clock.parents, clock.continued);
      start = end;
    }
    const order = clock && clock.parents.size > 0 ? chains.flat() : undefined;
    const fronts = clock && order ? joinChains(chains, clock.parents) : chains;
    const claimed = new Set<number>();
    for (const chain of fronts) {
      const inherited = chain.find((point) => point.front >= 0 && !claimed.has(point.front))?.front;
      const front = inherited ?? this.nextFront++;
      claimed.add(front);
      for (const point of chain) point.front = front;
    }
    return { fronts: fronts.flat(), order };
  }

  /**
   * With `clockLink`, after a column's links: each of its heads (points no neighbour took) in turn, in the column's order
   * (z), continues the nearest end of a chain that stops in the column before or CLOCK_BRIDGE columns earlier and is not
   * continued yet, if that end lies within CLOCK_REACH of the head and its join within CLOCK_SLOPE per metre between them
   * of the head's, both bounds inclusive (the advisor's "within 10 m" and "≤ 0.166 s/m × the gap"). It is the 3-row
   * link's own order: with two heads in reach of one end, the first in z takes it, even when the other is nearer (pairing
   * the nearest first instead, synthetic crest lines had a third more clock links crossing one another, and fewer links). The
   * head's chain is recorded under the one it continues (`parents`); the chains themselves, and so the links above, are
   * left as they are.
   */
  private linkByClock(
    chains: readonly FrontPoint[][], heads: readonly FrontPoint[][], column: number,
    parents: Map<FrontPoint[], FrontPoint[]>, continued: Set<FrontPoint[]>,
  ): void {
    const ends = chains.filter((chain) => {
      const last = chain.at(-1)!.column;
      return last < column && last >= column - 1 - CLOCK_BRIDGE && !continued.has(chain);
    });
    for (const head of heads) {
      const point = head[0];
      let best: FrontPoint[] | undefined;
      let nearest = Infinity;
      for (const chain of ends) {
        if (continued.has(chain)) continue;
        const tail = chain.at(-1)!;
        const dx = point.x - tail.x;
        const dz = point.z - tail.z;
        const gap = Math.sqrt(dx * dx + dz * dz);
        if (gap <= CLOCK_REACH && Math.abs(point.joined - tail.joined) <= CLOCK_SLOPE * gap && gap < nearest) {
          best = chain;
          nearest = gap;
        }
      }
      if (!best) continue;
      parents.set(head, best);
      continued.add(best);
      if (best.at(-1)!.column === column - 1) this.clockLinks += 1;
      else this.bridges += 1;
    }
  }

  exportState(): FrontState {
    return {
      nextId: this.nextId, nextFront: this.nextFront, points: this.points.map((p) => ({ ...p })), held: this.held.map((p) => ({ ...p })),
      tracks: this.tracks.map((t) => ({ ...t })),
      ...(this.order ? { order: this.order.map((p) => p.id) } : {}),
    };
  }

  importState(state: FrontState): void {
    const points = state.points.map((p) => ({ ...p }));
    // The order lists these same points (`FrontState.order`). One that names a point the state lacks, or misses or
    // repeats one, is not this front's: it is refused before anything is taken over.
    const byId = new Map(points.map((p) => [p.id, p]));
    const order = state.order?.map((id) => {
      const point = byId.get(id);
      if (!point) throw new Error(`A front state whose order names point ${id}, which it does not hold`);
      return point;
    });
    if (order && (order.length !== points.length || new Set(order).size !== points.length)) {
      throw new Error(`A front state whose order does not list each of its ${points.length} points once`);
    }
    this.nextId = state.nextId;
    this.nextFront = state.nextFront;
    this.points = points;
    this.order = order;
    this.held = state.held.map((p) => ({ ...p }));
    this.tracks = (state.tracks ?? []).map((t) => ({ ...t }));
  }
}

/**
 * `chains` with each chain that continues another (`parents`) appended to the front it continues, as one line, its points'
 * σ carried on straight across the gap. Chains go in the order they began, so a parent comes before its child, and a
 * chain end is continued once, so a front's last point is always the end its next chain continues.
 */
function joinChains(chains: readonly FrontPoint[][], parents: ReadonlyMap<FrontPoint[], FrontPoint[]>): FrontPoint[][] {
  const fronts: FrontPoint[][] = [];
  const frontOf = new Map<FrontPoint[], FrontPoint[]>();
  for (const chain of chains) {
    const parent = parents.get(chain);
    if (!parent) {
      const front = [...chain];
      fronts.push(front);
      frontOf.set(chain, front);
      continue;
    }
    const front = frontOf.get(parent)!;
    const tail = front.at(-1)!;
    const dx = chain[0].x - tail.x;
    const dz = chain[0].z - tail.z;
    const offset = tail.sigma + Math.sqrt(dx * dx + dz * dz);
    for (const point of chain) {
      point.sigma += offset;
      front.push(point);
    }
    frontOf.set(chain, front);
  }
  return fronts;
}

/** How far between a crest at `fromDepth` and at `depth` it crossed `at`, 0–1, linear in depth; null if it has not. */
function crossingFraction(fromDepth: number, depth: number, at: number): number | null {
  if (depth > at) return null;
  return fromDepth > depth ? Math.min(1, Math.max(0, (fromDepth - at) / (fromDepth - depth))) : 1;
}

/**
 * Whether a point runs on its own pace (PR 5; `keptCrests`): its pace is set at its throw, jet or not, and its slice
 * hasn't faded (its clock short of `jetUntil`), crashed or not (the advisor, 2026-10-03).
 */
function runsOnPace(point: FrontPoint): boolean {
  return point.jetPace !== undefined && point.jetUntil !== undefined && point.tau < point.jetUntil;
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
