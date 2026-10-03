import { describe, expect, it } from 'vitest';
import { BreakingFront, type FrontOptions, type FrontPoint } from './BreakingFront';
import type { CrestSample } from './crestOnset';
import { onsetTiming } from './sliceClock';

/**
 * A 7 m wedge foot under 16 s swell: a crest 1.6 m high over 6–5 m joins where the solver first breaks it, 3.18 m deep,
 * and, 1.6 m at the foot too, throws 2.456 m deep.
 */
const TIMING = onsetTiming(7, 16);
const FOOT = 1.6;
const JOIN = TIMING.joinDepth(FOOT);
const THROW = TIMING.throwDepth(FOOT);

/** A crest sample at one-metre columns. */
function sample(column: number, z: number, depth: number, strength: number, eta = FOOT): CrestSample {
  return { column, row: Math.floor(z), x: column + 0.5, z, eta, wave: eta, strength, rise: 0.5, depth, b: 0.3, speed: 5 };
}

/** An oblique straight crest over `columns`, z = z0 + slope · x. */
function line(columns: readonly number[], z0: number, slope: number, depth: number, strength: number, eta = FOOT): CrestSample[] {
  return columns.map((column) => sample(column, z0 + slope * (column + 0.5), depth, strength, eta));
}

/** Follows a crest from the foot (0.2 s before `time`), then brings it to its join depth, breaking, at `time`. */
function joinAt(front: BreakingFront, columns: readonly number[], z0: number, slope: number, time: number): void {
  const foot = line(columns, z0 - 0.4, slope, TIMING.h0, 0);
  front.update(foot, foot.length, time - 0.2);
  const joining = line(columns, z0, slope, JOIN, 0.5);
  front.update(joining, joining.length, time);
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => from + k);
const fronts = (front: BreakingFront) => new Set(front.points.map((point) => point.front)).size;

describe('the breaking front as lines', () => {
  it('joins a crest where it reaches its breaking depth, sized by its height nearer the break', () => {
    expect(JOIN).toBeCloseTo(3.18, 12);
    const front = new BreakingFront(1, TIMING);
    // 1.395 m, first read past the band, breaks halfway between the table's 2.61 and 3.18 m: crossed between 4 and 2 m.
    const depth = (2.61 + 3.18) / 2;
    front.update([sample(0, 10, 7, 0, 1.1)], 1, 0);
    front.update([sample(0, 11, 4, 0, 1.395)], 1, 0.1);
    expect(front.points).toHaveLength(0);
    front.update([sample(0, 12, 2, 0.4, 1.6)], 1, 0.2);
    expect(front.points).toHaveLength(1);
    expect(front.points[0].joined).toBeCloseTo(0.1 + ((4 - depth) / (4 - 2)) * 0.1, 12);
    expect(front.points[0].depth).toBeCloseTo(depth, 12);
  });

  it('sizes a crest by its highest over the band of 6 to 5 m, not one reading', () => {
    const front = new BreakingFront(1, TIMING);
    front.update([sample(0, 10, 7, 0, 1)], 1, 0);
    front.update([sample(0, 11, 5.8, 0, 1.3)], 1, 0.1);
    front.update([sample(0, 12, 5.4, 0, 1.6)], 1, 0.2);
    front.update([sample(0, 13, 5.1, 0, 1.4)], 1, 0.3);
    const joinDepth = TIMING.joinDepth(1.6);
    front.update([sample(0, 14, joinDepth, 0.5, 1.9)], 1, 0.4);
    expect(front.points).toHaveLength(1);
    expect(front.points[0].depth).toBeCloseTo(joinDepth, 12);
  });

  it('joins at the crossing when the solver breaks it before its throw, and never after', () => {
    expect(JOIN).toBeCloseTo(3.18, 12);
    expect(THROW).toBeCloseTo(2.456, 12);
    const late = new BreakingFront(1, TIMING);
    late.update([sample(0, 10, 7, 0)], 1, 0);
    late.update([sample(0, 12, JOIN, 0)], 1, 1);
    late.update([sample(0, 13, 2.8, 0.5)], 1, 1.8);
    expect(late.points).toHaveLength(1);
    expect(late.points[0]).toMatchObject({ joined: 1, depth: JOIN, throwDepth: THROW, crestDepth: 2.8, thrown: null });
    // Broken in the step its crest reaches its throw depth: just in time, thrown as it crossed.
    const justInTime = new BreakingFront(1, TIMING);
    justInTime.update([sample(0, 10, 7, 0)], 1, 0);
    justInTime.update([sample(0, 12, JOIN, 0)], 1, 1);
    justInTime.update([sample(0, 13, 2.42, 0.5)], 1, 1.2);
    expect(justInTime.points).toHaveLength(1);
    expect(justInTime.points[0].thrown).toBeCloseTo(1 + ((JOIN - THROW) / (JOIN - 2.42)) * 0.2, 12);
    // Past it a step unbroken: no barrel, however soon the solver breaks it after.
    const never = new BreakingFront(1, TIMING);
    never.update([sample(0, 10, 7, 0)], 1, 0);
    never.update([sample(0, 12, JOIN, 0)], 1, 1);
    never.update([sample(0, 13, 2.42, 0)], 1, 1.2);
    never.update([sample(0, 14, 2.4, 0.5)], 1, 1.3);
    expect(never.points).toHaveLength(0);
    expect(never.unbroken).toBe(1);
  });

  it('throws no deeper than it joins', () => {
    // 2.5 m at the foot would throw 2.93 m deep; 1.19 m over the band joins at 2.61, and throws as it joins.
    const front = new BreakingFront(1, TIMING);
    front.update([sample(0, 10, 7, 0, 2.5)], 1, 0);
    front.update([sample(0, 11, 5.5, 0, 1.19)], 1, 0.5);
    front.update([sample(0, 12, 2.5, 0.5, 1.19)], 1, 1);
    expect(front.points).toHaveLength(1);
    expect(front.points[0].throwDepth).toBeCloseTo(2.61, 12);
    expect(front.points[0].thrown).toBe(front.points[0].joined);
  });

  it('never joins a crest first seen past the foot, unsized', () => {
    const front = new BreakingFront(1, TIMING);
    front.update([sample(0, 10, 5, 0)], 1, 0);
    front.update([sample(0, 12, JOIN, 0.8)], 1, 0.2);
    front.update([sample(0, 13, 2, 0.8)], 1, 0.4);
    expect(front.points).toHaveLength(0);
  });

  it('links an oblique straight crest into one front, σ its arc length from the −x end', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 20), 10, 0.5, 1);
    expect(front.points).toHaveLength(20);
    expect(fronts(front)).toBe(1);
    front.points.forEach((point, k) => expect(point.sigma).toBeCloseTo(k * Math.sqrt(1 + 0.5 ** 2), 9));
  });

  it('keeps every point’s ID, join and clock while its crest breaks on into shallower water, and drops it when it stops', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 20), 10, 0.5, 1);
    const ids = front.points.map((point) => point.id);
    front.points.forEach((point) => { point.tau = 0.25; });
    expect(front.points.every((point) => point.throwZ === null)).toBe(true);
    const next = line(range(0, 20), 10.3, 0.5, 2.2, 0.1);
    front.update(next, next.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points.every((point) => point.tau === 0.25 && point.joined === 1 && point.depth === JOIN)).toBe(true);
    // Past its throw depth, it records when its crest crossed.
    expect(front.points[0].thrown).toBeCloseTo(1 + ((JOIN - THROW) / (JOIN - 2.2)) * 0.1, 12);
    // The foot crest and the throw point travel with the point (PR 3's loft).
    expect(front.points.every((point) => point.footHeight === FOOT && point.footDepth === TIMING.h0)).toBe(true);
    expect(front.points[0].throwZ).toBeCloseTo(10 + 0.5 * 0.5 + (0.3 * (JOIN - THROW)) / (JOIN - 2.2), 12);
    const calm = line(range(0, 20), 10.6, 0.5, 2, 0);
    front.update(calm, calm.length, 1.2);
    expect(front.points).toHaveLength(0);
  });

  // Review Focus 5: two crests in the same columns are two fronts.
  it('makes two fronts of two crests 15 m apart in the same columns', () => {
    const front = new BreakingFront(1, TIMING);
    const foot = range(0, 20).flatMap((column) => [sample(column, 9.6, 7, 0), sample(column, 24.6, 7, 0)]);
    front.update(foot, foot.length, 0.8);
    const joining = range(0, 20).flatMap((column) => [sample(column, 10, JOIN, 0.5), sample(column, 25, JOIN, 0.5)]);
    front.update(joining, joining.length, 1);
    expect(front.points).toHaveLength(40);
    expect(fronts(front)).toBe(2);
    for (const id of new Set(front.points.map((point) => point.front))) {
      expect(front.points.filter((point) => point.front === id).map((point) => point.column)).toEqual(range(0, 20));
    }
  });

  // Review Focus 2: a front that breaks apart keeps each side's points.
  it('splits a front at five empty columns, each side keeping its IDs', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 20), 10, 0.5, 1);
    const idOf = new Map(front.points.map((point) => [point.column, point.id]));
    const split = line([...range(0, 8), ...range(13, 20)], 10.2, 0.5, 2.3, 0.5);
    front.update(split, split.length, 1.1);
    expect(fronts(front)).toBe(2);
    for (const point of front.points) expect(point.id).toBe(idOf.get(point.column));
    const left = front.points.filter((point) => point.column < 8);
    const right = front.points.filter((point) => point.column >= 13);
    expect(new Set(left.map((point) => point.front)).size).toBe(1);
    expect(new Set(right.map((point) => point.front)).size).toBe(1);
    expect(left[0].front).not.toBe(right[0].front);
    expect(right[0].sigma).toBe(0);
  });

  it('splits a front where neighbours joined too far apart to be one wave, and counts the splits', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 10), 10, 0, 1);
    // Five seconds on, a newer crest joins in the next ten columns, level with the older one's still-breaking crest.
    const older = line(range(0, 10), 10.5, 0, 2, 0.5);
    const foot = line(range(10, 20), 10.1, 0, TIMING.h0, 0);
    front.update([...older, ...foot], 20, 5.8);
    const joining = [...line(range(0, 10), 10.5, 0, 2, 0.5), ...line(range(10, 20), 10.5, 0, JOIN, 0.5)];
    front.update(joining, joining.length, 6);
    const byFront = new Map<number, number[]>();
    for (const point of front.points) byFront.set(point.front, [...(byFront.get(point.front) ?? []), point.column]);
    expect([...byFront.values()]).toEqual([range(0, 10), range(10, 20)]);
    expect(front.splits).toBe(1);
  });

  it('holds a point missing for a moment, and drops it after half a second', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 5), 10, 0, 1);
    const whole = line(range(0, 5), 10, 0, 2.4, 0.5);
    const id = front.points[2].id;
    const gap = line([0, 1, 3, 4], 10, 0, 2.4, 0.5);
    front.update(gap, gap.length, 1.1);
    expect(front.points.map((point) => point.column)).toEqual([0, 1, 3, 4]);
    front.update(whole, whole.length, 1.2);
    expect(front.points[2].id).toBe(id);
    for (let t = 1.3; t < 2; t += 0.1) front.update(gap, gap.length, t);
    front.update(whole, whole.length, 2);
    // Gone, and its crest, seen again past the foot, is not sized to join.
    expect(front.points.map((point) => point.column)).toEqual([0, 1, 3, 4]);
  });

  // PR 5 (the advisor, 2026-10-01 and 2026-10-03): once its lip is thrown the solver's crest maximum leaps 3–8 m as the
  // face turns into a bore, so from its throw until its slice has faded a point, jet or not, runs on its own pace and
  // only claims its column's crest.
  it('runs a point past its throw on its own pace, jet or not, crashed or not, claiming its crest over the throw’s window, at most 10 m (PR 5)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 7), 10, 0, 1);
    const ids = front.points.map((point) => point.id);
    const pace = (k: number, strip: number, window: number, crashedAt?: number) => {
      Object.assign(front.points[k], {
        jetStrip: strip, jetWindow: window, jetPace: 5, jetBase: 10, jetUntil: 2, tau: 0.3, ...(crashedAt !== undefined ? { crashedAt } : {}),
      });
    };
    pace(1, 4, 3);
    pace(2, 5, 20);
    // A window too short for the jump: it claims no crest, and runs on all the same.
    pace(5, 7, 0.5);
    // Crashed, or threw no jet: on their pace all the same, until their slice has faded.
    pace(3, 6, 3, 1.05);
    pace(4, -1, 3);
    // Every crest leaps 5 m shoreward in 0.1 s: past the 3 m match reach. The paced points run 0.5 m and claim the crest
    // 4.5 m ahead, inside 3 + 3 m and the 10 m cap, without taking its z; columns 0 and 6, not thrown, lose theirs.
    const jumped = line(range(0, 7), 15, 0, 2.4, 0.5);
    front.update(jumped, jumped.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual(ids.slice(1, 6));
    expect(front.points.map((point) => point.z)).toEqual([10.5, 10.5, 10.5, 10.5, 10.5]);
    expect(front.points.map((point) => point.jetStrip)).toEqual([4, 5, 6, -1, 7]);
    expect(front.points.map((point) => point.crestZ)).toEqual([15, 15, 15, 15, undefined]);
    expect(front.coasted).toBe(1);
    // Linked on their own z: one front.
    expect(fronts(front)).toBe(1);
    // Now at 11 m: column 1's crest 6.5 m away is past its 3 + 3 m, and column 2's 10.5 m away past the 10 m cap on 3 + 20 m.
    // None claims a crest, and all run on at their pace.
    const far = [sample(1, 17.5, 2.3, 0.5), sample(2, 21.5, 2.3, 0.5)];
    front.update(far, far.length, 1.2);
    expect(front.points.map((point) => point.id)).toEqual(ids.slice(1, 6));
    expect(front.points.map((point) => point.z)).toEqual([11, 11, 11, 11, 11]);
    expect(fronts(front)).toBe(1);
    expect(front.coasted).toBe(6);
    // Their slices faded (their clocks at `jetUntil`), they match as before: with no crest in reach they leave.
    for (const point of front.points) point.tau = 2;
    front.update(far, far.length, 1.3);
    expect(front.points).toHaveLength(0);
  });

  it('gives a paced point the crest nearest its own z, ahead of the others, and the ordinary match once its slice has faded (PR 5)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 3), 10, 0, 1);
    const ids = front.points.map((point) => point.id);
    Object.assign(front.points[1], { jetStrip: 2, jetWindow: 3, jetPace: 4, jetBase: 10, jetUntil: 1, tau: 0.3 });
    // Column 1's crest split about its dip: shoulders 3.5 m behind and 3.2 m ahead of where it was; it ran 0.4 m.
    const split = [sample(0, 10.3, 2.4, 0.5), sample(1, 6.5, 2.4, 0.5), sample(1, 13.2, 2.4, 0.5), sample(2, 10.3, 2.4, 0.5)];
    front.update(split, split.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points[1].z).toBeCloseTo(10.4, 12);
    expect(front.points[1].height).toBe(split[2].eta);
    // Crashed, it still runs on its pace: it claims the crest 0.2 m away, but not its z.
    front.points[1].crashedAt = 1.15;
    const near = [sample(0, 10.6, 2.4, 0.5), sample(1, 10.6, 2.4, 0.5), sample(2, 10.6, 2.4, 0.5)];
    front.update(near, near.length, 1.2);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points[1].z).toBeCloseTo(10.8, 12);
    expect(front.points[1].crestZ).toBe(10.6);
    // Its slice faded (its clock at `jetUntil`), it matches as before: the crest 0.2 m away is its own, and it takes its z.
    front.points[1].tau = 1;
    front.update(near, near.length, 1.3);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points[1].z).toBe(10.6);
  });

  it('holds a point on its pace through its slice’s fade, claiming a crest or coasting, then lets it go to the ordinary match (PR 5; the advisor, 2026-10-03)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 3), 10, 0, 1);
    const ids = front.points.map((point) => point.id);
    for (const k of [1, 2]) Object.assign(front.points[k], { jetStrip: k, jetWindow: 3, jetPace: 5, jetBase: 10, jetUntil: 0.5, crashedAt: 1, tau: 0.3 });
    // Pouring (crashed, its slice fading): column 1's crest leaps 4.5 m ahead of its paced z, in reach; column 2 has none.
    const crests = [sample(0, 10.3, 2.4, 0.5), sample(1, 15, 2.4, 0.5)];
    front.update(crests, crests.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points[1].crestZ).toBe(15);
    expect(front.points[1].z).toBeCloseTo(10.5, 12);
    expect(front.points[2].crestZ).toBeUndefined();
    expect(front.points[2].z).toBeCloseTo(10.5, 12);
    expect(front.coasted).toBe(1);
    // Its slice faded, it matches as before: the crest 4.5 m away is past the match reach, and with none column 2 leaves too.
    for (const k of [1, 2]) front.points[k].tau = 0.6;
    front.update(crests, crests.length, 1.2);
    expect(front.points.map((point) => point.id)).toEqual([ids[0]]);
  });

  it('keeps each point’s crest speed as the mean of its crest’s over the last few frames (PR 5)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 2), 10, 0, 1);
    const at = (z: number, speed: number) => [0, 1].map((column) => ({ ...sample(column, z, 2.4, 0.5), speed }));
    let crests = at(10.2, 4);
    front.update(crests, crests.length, 1 + 1 / 30);
    expect(front.points[0].crestSpeed).toBe(4);
    crests = at(10.4, 7);
    front.update(crests, crests.length, 1 + 2 / 30);
    // A third of the way in a thirtieth of a second (over 0.1 s).
    expect(front.points[0].crestSpeed).toBeCloseTo(5, 12);
    // An unmeasured crest (0) leaves it as it was.
    crests = at(10.6, 0);
    front.update(crests, crests.length, 1 + 3 / 30);
    expect(front.points[0].crestSpeed).toBeCloseTo(5, 12);
  });

  it('follows a crest across a whole row on a coarser grid', () => {
    const front = new BreakingFront(2, TIMING);
    const foot = range(0, 10).map((column) => ({ ...sample(column, 18, 7, 0), x: 2 * column + 1 }));
    front.update(foot, foot.length, 0.8);
    const first = range(0, 10).map((column) => ({ ...sample(column, 20, JOIN, 0.5), x: 2 * column + 1 }));
    front.update(first, first.length, 1);
    const ids = front.points.map((point) => point.id);
    expect(new Set(front.points.map((point) => point.front)).size).toBe(1);
    const next = first.map((s) => ({ ...s, z: 22 }));
    front.update(next, next.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual(ids);
  });

  // The Reef's rules (FrontOptions, PR 7): a crest's maximum jumps forward over a ledge.
  it('with a jump reach, follows a sized crest whose highest cell jumps ahead, and joins it there', () => {
    // Sized at the foot and over the band; then its face steepens and its maximum jumps 7 m to the ledge's edge, while
    // a lower maximum lingers where it was, and another crest stands 11 m ahead, beyond the reach.
    const steps = (front: BreakingFront) => {
      front.update([sample(0, 10, 7, 0)], 1, 0);
      front.update([sample(0, 11, 5.5, 0)], 1, 0.5);
      const jumped = [sample(0, 11.5, 3.4, 0, 1.2), sample(0, 18, 2.4, 0.5, 1.7), sample(0, 22.5, 2, 0, 0.4)];
      front.update(jumped, jumped.length, 0.6);
    };
    const following = new BreakingFront(1, TIMING, { jumpReach: 10 });
    steps(following);
    expect(following.points).toHaveLength(1);
    expect(following.points[0]).toMatchObject({ z: 18, footHeight: FOOT, throwDepth: THROW });
    // It crossed its join and throw depths between 5.5 and 2.4 m, and its throw between 11 and 18 m.
    expect(following.points[0].joined).toBeCloseTo(0.5 + ((5.5 - JOIN) / (5.5 - 2.4)) * 0.1, 12);
    expect(following.points[0].throwZ).toBeCloseTo(11 + ((5.5 - THROW) / (5.5 - 2.4)) * 7, 12);
    expect(following.jumps).toBe(1);
    // The point remembers that its crest's track jumped once before it joined.
    expect(following.points[0].jumped).toBe(1);
    // 7 m is past 1.5 of its 1.7 m wave (the advisor's first form of the reach).
    expect(following.waveJumps).toBe(0);
    // Without it (Padang Padang), the jump starts a crest of its own, unsized, which never joins: counted the same.
    const nearest = new BreakingFront(1, TIMING);
    steps(nearest);
    expect(nearest.points).toHaveLength(0);
    expect(nearest.jumps).toBe(1);
    expect(nearest.waveJumps).toBe(0);
    expect(nearest.unsized).toBe(2);
  });

  // PR 5 with #105's jump rule: the points on their pace (past their throw, jet or not, until their slice has faded: the
  // advisor, 2026-10-03) claim their crests first, and the sized crests follow the furthest crest ahead of them among
  // the others.
  it('with a jump reach, leaves the crest a jet-holding point keeps to the point, and follows a sized crest on the others (PR 5 with #105)', () => {
    const front = new BreakingFront(1, TIMING, { jumpReach: 10 });
    joinAt(front, [0], 20, 0, 1);
    // A sized crest on its way in, 15 m behind the point in its column.
    front.update([sample(0, 5, 7, 0), sample(0, 20.3, 2.9, 0.5)], 2, 1.05);
    expect(front.points).toHaveLength(1);
    expect(front.exportState().tracks).toHaveLength(1);
    // Thrown, its slice not yet faded (its clock short of `jetUntil`): on its pace.
    Object.assign(front.points[0], { jetStrip: 1, jetWindow: 7, jetPace: 5, jetBase: 20, jetUntil: 2, tau: 0.3 });
    // Two crests in both their reaches: the 14 is 6.8 m from the point's paced z (20.8), nearer than the 12, so the
    // point keeps it; the sized crest, whose reach is 2 to 15 m, follows the 12. Neither takes the other's, and the
    // sized crest's step is no jump.
    const crests = [sample(0, 12, 2.4, 0), sample(0, 14, 2.4, 0.5)];
    front.update(crests, crests.length, 1.15);
    expect(front.points).toHaveLength(1);
    expect(front.points[0]).toMatchObject({ jetStrip: 1, crestZ: 14 });
    expect(front.points[0].z).toBeCloseTo(20.8, 12);
    const { tracks } = front.exportState();
    expect(tracks).toHaveLength(1);
    expect(tracks[0]).toMatchObject({ z: 12, footHeight: FOOT });
    expect(front.jumps).toBe(0);
    expect(front.unsized).toBe(0);
  });

  // #105's fast fronts (the advisor, 2026-10-01): a jump moves a crest's segment into the bore ahead, whose strength
  // stays above zero without a fresh start.
  it('with its own onset, joins a jumped crest only when its own segment rises fresh, timed at that step', () => {
    const OPTIONS = { jumpReach: 10, ownOnset: true };
    const fresh = (s: CrestSample) => ({ ...s, rise: 0.7 });
    const sized = (front: BreakingFront) => {
      front.update([sample(0, 10, 7, 0)], 1, 0);
      front.update([sample(0, 11, 5.5, 0)], 1, 0.5);
    };
    // Carried past its throw depth by the jump, breaking (strength) but not rising fresh: no join, then dropped.
    const stale = new BreakingFront(1, TIMING, OPTIONS);
    sized(stale);
    stale.update([sample(0, 11.5, 3.4, 0, 1.2), sample(0, 18, 2.4, 0.5, 1.7)], 2, 0.6);
    expect(stale.points).toHaveLength(0);
    stale.update([fresh(sample(0, 18.3, 2.35, 0.5, 1.7))], 1, 0.7);
    expect(stale.points).toHaveLength(0);
    expect(stale.unbroken).toBe(1);
    expect(stale.unrisen).toBe(1);
    // Rising fresh in the jump's step: it joins and throws then, with no time interpolated across the jump.
    const own = new BreakingFront(1, TIMING, OPTIONS);
    sized(own);
    own.update([sample(0, 11.5, 3.4, 0, 1.2), fresh(sample(0, 18, 2.4, 0.5, 1.7))], 2, 0.6);
    expect(own.points).toHaveLength(1);
    expect(own.points[0]).toMatchObject({ joined: 0.6, thrown: 0.6, throwZ: 18, jumped: 1 });
    // Jumped short of its throw depth, it waits for its own onset, joins at that step, and throws later as it crosses.
    const waits = new BreakingFront(1, TIMING, OPTIONS);
    sized(waits);
    waits.update([sample(0, 11.5, 3.4, 0, 1.2), sample(0, 15, 2.9, 0.5, 1.7)], 2, 0.6);
    expect(waits.points).toHaveLength(0);
    waits.update([fresh(sample(0, 15.4, 2.8, 0.5, 1.7))], 1, 0.7);
    expect(waits.points).toHaveLength(1);
    expect(waits.points[0]).toMatchObject({ joined: 0.7, thrown: null });
    // A crest that hasn't jumped joins as before: strength above zero, no fresh rise needed.
    const plain = new BreakingFront(1, TIMING, OPTIONS);
    plain.update([sample(0, 10, 7, 0)], 1, 0);
    plain.update([sample(0, 12, JOIN, 0)], 1, 1);
    plain.update([sample(0, 13, 2.8, 0.5)], 1, 1.8);
    expect(plain.points).toHaveLength(1);
    expect(plain.points[0]).toMatchObject({ joined: 1, thrown: null });
  });

  // The Reef's rules (FrontOptions, PR 7): small waves break as they cross onto its top.
  it('with a join reach past the throw depth, joins a crest the solver breaks within it, throwing as it joins', () => {
    const passes = (front: BreakingFront, breaksAt: number) => {
      front.update([sample(0, 10, 7, 0)], 1, 0);
      front.update([sample(0, 12, JOIN, 0)], 1, 1);
      // It crosses its throw depth unbroken, its wave 1 m high there.
      front.update([{ ...sample(0, 13, 2.42, 0), wave: 1 }], 1, 1.2);
      front.update([sample(0, breaksAt, 2.4, 0.5)], 1, 1.3);
    };
    const passedZ = 12 + (JOIN - THROW) / (JOIN - 2.42);
    // Broken 1.05 m past where it crossed: within 1.5 of its wave's heights.
    const within = new BreakingFront(1, TIMING, { joinPast: 1.5 });
    passes(within, 14);
    expect(14 - passedZ).toBeLessThan(1.5);
    expect(within.points).toHaveLength(1);
    expect(within.points[0]).toMatchObject({ joined: 1, depth: JOIN, throwDepth: THROW, throwZ: 14 });
    expect(within.points[0].thrown).toBeCloseTo(1.3, 12);
    expect(within.latePasses).toBe(1);
    // Broken 1.65 m past: beyond it, no barrel.
    const beyond = new BreakingFront(1, TIMING, { joinPast: 1.5 });
    passes(beyond, 14.6);
    expect(beyond.points).toHaveLength(0);
    expect(beyond.unbroken).toBe(1);
    // Without it (Padang Padang): no barrel either way.
    const none = new BreakingFront(1, TIMING);
    passes(none, 14);
    expect(none.points).toHaveLength(0);
    expect(none.unbroken).toBe(1);
  });

  it('carries its state through export and import, crests on their way in included', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 20), 10, 0.5, 1);
    const byPlace = (a: CrestSample, b: CrestSample) => a.column - b.column || a.z - b.z;
    const next = [...line(range(0, 18), 10.1, 0.5, 2.4, 0.5), ...line(range(0, 20), 30, 0.5, TIMING.h0, 0)].sort(byPlace);
    front.update(next, next.length, 1.1);
    const copy = new BreakingFront(1, TIMING);
    copy.importState(JSON.parse(JSON.stringify(front.exportState())));
    expect(copy.points).toEqual(front.points);
    const later = [...line(range(0, 20), 10.4, 0.5, 2.3, 0.5), ...line(range(0, 20), 31, 0.5, JOIN, 0.5)].sort(byPlace);
    front.update(later, later.length, 1.3);
    copy.update(later, later.length, 1.3);
    expect(copy.exportState()).toEqual(front.exportState());
    expect(front.points.length).toBeGreaterThan(20);
  });
});

// The clock link (FrontOptions.clockLink, the advisor, 2026-10-03): one breaking crest drawn as two fronts end to end.
describe('the clock link', () => {
  const PADANG = { jumpReach: 10 };
  const LINKED = { jumpReach: 10, clockLink: true };

  /** A crest segment: its columns, its z, and when it reaches its join depth, breaking, s. */
  interface Segment { columns: readonly number[]; z: number; join: number }
  /**
   * Steps `segments` every 0.25 s from just before the first joins to when the last does, and at each join; those that
   * joined earlier keep breaking. Each crosses its join depth in its join's step, so it joins at that time exactly.
   */
  function joinTogether(options: FrontOptions, segments: readonly Segment[]): BreakingFront {
    const front = new BreakingFront(1, TIMING, options);
    const joins = segments.map((segment) => segment.join);
    const first = Math.min(...joins) - 0.25;
    const last = Math.max(...joins);
    const times: number[] = [];
    for (let step = 0; first + step * 0.25 <= last; step += 1) times.push(first + step * 0.25);
    for (const join of joins) if (!times.includes(join)) times.push(join);
    for (const time of times.sort((a, b) => a - b)) {
      const samples = segments
        .flatMap((segment) => (time >= segment.join ? line(segment.columns, segment.z, 0, JOIN, 0.5) : line(segment.columns, segment.z, 0, TIMING.h0, 0)))
        .sort((a, b) => a.column - b.column || a.z - b.z);
      front.update(samples, samples.length, time);
    }
    return front;
  }
  /** A crest 0–9 and its other half from column `from`, `z` m on (the first half's z is 10), joining `later` s after it. */
  const halves = (from: number, z: number, later: number): Segment[] => [
    { columns: range(0, 10), z: 10, join: 1 },
    { columns: range(from, from + 10), z, join: 1 + later },
  ];
  const columnsOf = (front: BreakingFront) => front.points.map((point) => point.column);

  it('links two fronts end to end whose joins agree, though their ends stand more than 3 rows apart in z', () => {
    // The ends are (9.5, 10) and (10.5, 16): 6.08 m apart, their joins 0.25 s, 0.04 s/m.
    const segments = halves(10, 16, 0.25);
    expect(fronts(joinTogether(PADANG, segments))).toBe(2);
    const linked = joinTogether(LINKED, segments);
    expect(fronts(linked)).toBe(1);
    expect(columnsOf(linked)).toEqual(range(0, 20));
    // σ runs straight across: nine 1 m steps, the 6.08 m, nine more.
    const gap = Math.sqrt(1 + 6 ** 2);
    linked.points.forEach((point, k) => expect(point.sigma).toBeCloseTo(k < 10 ? k : 9 + gap + (k - 10), 9));
    expect(linked.clockLinks).toBe(1);
    expect(linked.bridges).toBe(0);
    expect(linked.splits).toBe(0);
  });

  it('links them while their joins differ by at most 0.166 s per metre between them, and no more', () => {
    // Ends 4.12 m apart: 0.5 s apart is 0.12 s/m and links; 0.75 s apart is 0.18 s/m and does not, which the 1 s/m split
    // would never refuse.
    expect(fronts(joinTogether(LINKED, halves(10, 14, 0.5)))).toBe(1);
    const apart = joinTogether(LINKED, halves(10, 14, 0.75));
    expect(fronts(apart)).toBe(2);
    expect(apart.splits).toBe(0);
    expect(apart.clockLinks).toBe(0);
    // Close to the line, across an empty column (2 m in x) with the joins 0.5 s apart: 2.27 m off in z the ends are
    // 3.025 m apart, 0.1653 s/m, and link; 2.23 m off they are 2.995 m apart, 0.1669 s/m, and do not. The metres are
    // straight between the ends: along z alone 0.5 s over 2.27 m would be 0.22 s/m.
    expect(fronts(joinTogether(LINKED, halves(11, 12.27, 0.5)))).toBe(1);
    expect(fronts(joinTogether(LINKED, halves(11, 12.23, 0.5)))).toBe(2);
    // On the line, which is within it: 2 m apart at one z, the joins 0.332 s apart, as 0.166 s/m × 2 m is in floating point
    // too. A tenth of a millisecond more (0.16605 s/m) is past it.
    const onLine = joinTogether(LINKED, [{ columns: range(0, 10), z: 10, join: 0 }, { columns: range(11, 21), z: 10, join: 0.332 }]);
    expect(onLine.points.map((point) => point.joined)).toEqual([...Array<number>(10).fill(0), ...Array<number>(10).fill(0.166 * 2)]);
    expect(fronts(onLine)).toBe(1);
    expect(onLine.bridges).toBe(1);
    expect(fronts(joinTogether(LINKED, [{ columns: range(0, 10), z: 10, join: 0 }, { columns: range(11, 21), z: 10, join: 0.3321 }]))).toBe(2);
  });

  it('links ends up to 10 m apart, measured straight between them, and none farther', () => {
    // Side by side (1 m in x): 9.9 m off in z the ends are 9.95 m apart and link; 10 m off they are 10.05 m apart and do
    // not, though only 10 m apart in z.
    expect(fronts(joinTogether(LINKED, halves(10, 19.9, 0.25)))).toBe(1);
    expect(fronts(joinTogether(LINKED, halves(10, 20, 0.25)))).toBe(2);
    // Exactly 10 m apart is within it: √99 m off in z, from z 0 so that their difference is √99 to the last bit. A millimetre
    // more in z (10.001 m apart) is past it.
    const z = Math.sqrt(99);
    expect(Math.sqrt(1 + z * z)).toBe(10);
    const atReach = (dz: number) => joinTogether(LINKED, [{ columns: range(0, 10), z: 0, join: 1 }, { columns: range(10, 20), z: dz, join: 1.25 }]);
    expect(fronts(atReach(z))).toBe(1);
    expect(atReach(z).clockLinks).toBe(1);
    expect(fronts(atReach(z + 0.001))).toBe(2);
  });

  it('bridges a one-column gap only when the clock link passes, and no wider gap', () => {
    // Column 10 is empty: the ends are 2 m apart, 0.25 s is 0.125 s/m, 0.5 s is 0.25 s/m (under the 1 s/m split).
    const bridged = joinTogether(LINKED, halves(11, 10, 0.25));
    expect(fronts(bridged)).toBe(1);
    expect(columnsOf(bridged)).toEqual([...range(0, 10), ...range(11, 21)]);
    bridged.points.forEach((point, k) => expect(point.sigma).toBeCloseTo(k < 10 ? k : 11 + (k - 10), 9));
    expect(bridged.bridges).toBe(1);
    expect(bridged.clockLinks).toBe(0);
    expect(fronts(joinTogether(PADANG, halves(11, 10, 0.25)))).toBe(2);
    const refused = joinTogether(LINKED, halves(11, 10, 0.5));
    expect(fronts(refused)).toBe(2);
    expect(refused.bridges).toBe(0);
    expect(refused.splits).toBe(0);
    // Two empty columns are the advisor's next question, not this link's.
    expect(fronts(joinTogether(LINKED, halves(12, 10, 0.25)))).toBe(2);
  });

  it('continues for each head in turn the nearest end left, as the 3-row link does, and an end only once', () => {
    // A 0–8 and a crest C 5 m behind it in the same columns, 0–9; a third piece from column 10 on A's line: A's end is 2 m
    // off across the empty column 9, C's 5.10 m off beside it, both with joins 0.25 s apart.
    const nearest = joinTogether(LINKED, [
      { columns: range(0, 9), z: 10, join: 1 }, { columns: range(0, 10), z: 15, join: 1 }, { columns: range(10, 20), z: 10, join: 1.25 },
    ]);
    expect(fronts(nearest)).toBe(2);
    const frontAt = (front: BreakingFront, column: number, z: number) => front.points.find((point) => point.column === column && point.z === z)!.front;
    expect(frontAt(nearest, 10, 10)).toBe(frontAt(nearest, 0, 10));
    expect(frontAt(nearest, 0, 15)).not.toBe(frontAt(nearest, 0, 10));
    expect(nearest.points.filter((point) => point.front === frontAt(nearest, 0, 15))).toHaveLength(10);
    // Two pieces in reach of one end, 8 m below it (8.06 m apart) and 5 m above (5.10 m): the first in z takes it, though
    // the other is nearer, and the other starts a front of its own.
    const first = joinTogether(LINKED, [
      { columns: range(0, 10), z: 10, join: 1 }, { columns: range(10, 20), z: 2, join: 1.25 }, { columns: range(10, 20), z: 15, join: 1.25 },
    ]);
    expect(fronts(first)).toBe(2);
    expect(frontAt(first, 10, 2)).toBe(frontAt(first, 0, 10));
    expect(frontAt(first, 10, 15)).not.toBe(frontAt(first, 0, 10));
    expect(first.clockLinks).toBe(1);
    // The first in z the nearer as well: it takes the end, and the end is taken once.
    const once = joinTogether(LINKED, [
      { columns: range(0, 10), z: 10, join: 1 }, { columns: range(10, 20), z: 14, join: 1.25 }, { columns: range(10, 20), z: 18, join: 1.25 },
    ]);
    expect(fronts(once)).toBe(2);
    expect(frontAt(once, 10, 14)).toBe(frontAt(once, 0, 10));
    expect(once.clockLinks).toBe(1);
  });

  it('leaves the 1 s/m split alone: a true split stays two fronts with the link on', () => {
    // Joined 5 s apart, side by side: the split rule's own case, refused once.
    const side = joinTogether(LINKED, halves(10, 10, 5));
    expect(fronts(side)).toBe(2);
    expect(side.splits).toBe(1);
    expect(side.clockLinks + side.bridges).toBe(0);
    // And across a one-column gap, or 6 m off in z, where only the clock link could reach them.
    expect(fronts(joinTogether(LINKED, halves(11, 10, 5)))).toBe(2);
    expect(fronts(joinTogether(LINKED, halves(10, 16, 9)))).toBe(2);
    expect(fronts(joinTogether(LINKED, halves(11, 16, 9)))).toBe(2);
  });

  it('refuses a handed-over order that names a point the state does not hold, or misses or repeats one, taking none of it', () => {
    // The last step's clock link joined the halves, so the state lists its points in the order they match by.
    const state = joinTogether(LINKED, halves(10, 16, 0.25)).exportState();
    expect(state.order).toBeDefined();
    const order = state.order!;
    const byNumber = (a: number, b: number) => a - b;
    expect([...order].sort(byNumber)).toEqual(state.points.map((point) => point.id).sort(byNumber));
    const front = new BreakingFront(1, TIMING, LINKED);
    const own = JSON.stringify(front.exportState());
    // The next ID, which no point has yet, in place of the last; one left out; one listed twice, as an extra or in the
    // last one's place.
    expect(() => front.importState({ ...state, order: [...order.slice(0, -1), state.nextId] }))
      .toThrow(`A front state whose order names point ${state.nextId}, which it does not hold`);
    for (const wrong of [order.slice(1), [order[0], ...order], [...order.slice(0, -1), order[0]]]) {
      expect(() => front.importState({ ...state, order: wrong })).toThrow(`A front state whose order does not list each of its ${order.length} points once`);
    }
    expect(JSON.stringify(front.exportState())).toBe(own);
    // The state as exported is taken whole.
    front.importState(state);
    expect(front.exportState()).toEqual(state);
  });

  interface CrestLine { z: number; first: number }
  /**
   * Seeded crest lines over 36 columns joining column by column (`lines`: each one's z, and the step its column 0 joins,
   * each next column a step later), in blocks of seven columns 6 m apart in z (past the 3-row reach), a tenth of the
   * columns held back 15 steps (true splits) and some samples missing (flicker, one-column gaps). Each crest's z wanders
   * up to `jitter` m; with `rows` it is rounded to a whole metre, as the solver's rows give it, so that crests can tie
   * (two on one row of a column are one).
   */
  function crestSteps(seed: number, lines: readonly CrestLine[], jitter: number, rows: boolean): CrestSample[][] {
    let state = seed;
    const random = () => (state = (state * 1664525 + 1013904223) % 4294967296) / 4294967296;
    const delayed = new Set(lines.flatMap((_, l) => range(0, 36).filter(() => random() < 0.1).map((column) => `${l}:${column}`)));
    const steps: CrestSample[][] = [];
    for (let step = 0; step < 80; step += 1) {
      const samples: CrestSample[] = [];
      lines.forEach((crest, l) => {
        for (let column = 0; column < 36; column += 1) {
          const join = crest.first + column + (delayed.has(`${l}:${column}`) ? 15 : 0);
          const joined = step >= join;
          if (random() < (joined ? 0.05 : 0.02)) continue;
          const wandered = crest.z + (Math.floor(column / 7) % 2) * 6 + 2 * jitter * random() - jitter;
          const z = rows ? Math.round(wandered) : wandered;
          if (rows && samples.some((s) => s.column === column && s.z === z)) continue;
          samples.push(sample(column, z, joined ? JOIN : TIMING.h0, joined ? 0.5 : 0));
        }
      });
      steps.push(samples.sort((a, b) => a.column - b.column || a.z - b.z));
    }
    return steps;
  }
  /** Three crest lines 38–40 m apart, their z with noise so that no two crests tie. */
  const THREE_LINES = crestSteps(20261003, [{ z: 12, first: 10 }, { z: 50, first: 20 }, { z: 90, first: 15 }], 0.3, false);
  /** Three crest lines 2 and 17 m apart, wandering a metre either way on whole rows: crests meet and tie in a column. */
  const CROWDED = crestSteps(7, [{ z: 12, first: 10 }, { z: 14, first: 13 }, { z: 31, first: 12 }], 1, true);

  it.each([['three lines', THREE_LINES], ['crowded rows', CROWDED]] as const)('only ever adds links when on, each from one front\'s last point to the next one\'s first: %s', (_, steps) => {
    const off = new BreakingFront(1, TIMING, PADANG);
    const on = new BreakingFront(1, TIMING, LINKED);
    /** A front's links: each point to the one before it on its front, as "before>point". */
    const links = (points: readonly FrontPoint[]) => new Set(points.slice(1).flatMap((point, k) => (point.front === points[k].front ? [`${points[k].id}>${point.id}`] : [])));
    const problems: string[] = [];
    let fewer = 0;
    let neighbours = 0;
    let bridges = 0;
    let copy: BreakingFront | undefined;
    steps.forEach((samples, step) => {
      const time = step * 0.1;
      for (const front of [off, on]) front.update(samples, samples.length, time);
      // The same points, with the same joins and places (crests that tie in a column included), the links the only difference.
      const ids = (front: BreakingFront) => front.points.map((point) => `${point.id}:${point.joined}:${point.z}`).sort().join();
      if (ids(on) !== ids(off)) problems.push(`${step}: different points`);
      const offLinks = links(off.points);
      const onLinks = links(on.points);
      for (const link of offLinks) if (!onLinks.has(link)) problems.push(`${step}: lost the link ${link}`);
      // Each front without the switch, its first point and its last (a front's points are listed together, −x end first).
      const byId = new Map(off.points.map((point) => [point.id, point]));
      const firstOf = new Map<number, number>();
      const lastOf = new Map<number, number>();
      for (const point of off.points) {
        if (!firstOf.has(point.front)) firstOf.set(point.front, point.id);
        lastOf.set(point.front, point.id);
      }
      for (const link of onLinks) {
        if (offLinks.has(link)) continue;
        const [a, b] = link.split('>').map((id) => byId.get(Number(id))!);
        const columns = b.column - a.column;
        const gap = Math.sqrt((b.x - a.x) ** 2 + (b.z - a.z) ** 2);
        const facing = a.front !== b.front && lastOf.get(a.front) === a.id && firstOf.get(b.front) === b.id;
        if (!(facing && columns >= 1 && columns <= 2 && gap <= 10 && Math.abs(b.joined - a.joined) <= 0.166 * gap)) problems.push(`${step}: a link ${link} the clock does not allow`);
        if (columns === 1) neighbours += 1;
        else bridges += 1;
      }
      // Each front's points together, σ growing along it.
      const done = new Set<number>();
      on.points.forEach((point, k) => {
        const previous = on.points[k - 1];
        if (previous?.front === point.front) {
          if (!(point.sigma > previous.sigma)) problems.push(`${step}: σ does not grow at ${point.id}`);
        } else if (done.has(point.front)) problems.push(`${step}: front ${point.front} is listed in two places`);
        done.add(point.front);
      });
      if (fronts(on) > fronts(off)) problems.push(`${step}: more fronts`);
      if (fronts(on) < fronts(off)) fewer += 1;
      // The linked front carries its state through export and import like the plain one.
      if (step === 39) {
        copy = new BreakingFront(1, TIMING, LINKED);
        copy.importState(JSON.parse(JSON.stringify(on.exportState())));
      } else if (copy) {
        copy.update(samples, samples.length, time);
        if (JSON.stringify(copy.exportState()) !== JSON.stringify(on.exportState())) problems.push(`${step}: an imported state drifts`);
      }
    });
    expect(problems).toEqual([]);
    // The run uses both links, the counters count each step's, and a good share of its steps have fewer fronts for it.
    expect(neighbours).toBeGreaterThan(0);
    expect(bridges).toBeGreaterThan(0);
    expect(on.clockLinks).toBe(neighbours);
    expect(on.bridges).toBe(bridges);
    expect(fewer).toBeGreaterThan(20);
    expect(off.clockLinks + off.bridges).toBe(0);
    expect(off.splits).toBe(on.splits);
  });

  /** A value with its objects' keys in order, so that its JSON does not depend on the order fields were written in. */
  const canonical = (value: unknown): unknown => (Array.isArray(value)
    ? value.map(canonical)
    : value !== null && typeof value === 'object'
      ? Object.fromEntries(Object.keys(value).sort().map((key) => [key, canonical((value as Record<string, unknown>)[key])]))
      : value);
  /**
   * The front's exported state and counters each step, fingerprinted (FNV-1a, 32 bits, over their JSON), with the run's
   * points and fronts a step summed and its splits.
   */
  function fingerprint(options: FrontOptions, steps: readonly CrestSample[][]) {
    const front = new BreakingFront(1, TIMING, options);
    let hash = 0x811c9dc5;
    let points = 0;
    let lines = 0;
    steps.forEach((samples, step) => {
      front.update(samples, samples.length, step * 0.1);
      const { splits, joins, unbroken, lost, unsized, jumps, waveJumps, latePasses, unrisen } = front;
      const text = JSON.stringify(canonical([front.exportState(), splits, joins, unbroken, lost, unsized, jumps, waveJumps, latePasses, unrisen]));
      for (let k = 0; k < text.length; k += 1) hash = Math.imul(hash ^ text.charCodeAt(k), 0x01000193);
      points += front.points.length;
      lines += fronts(front);
    });
    expect(front.clockLinks + front.bridges).toBe(0);
    return { hash: (hash >>> 0).toString(16).padStart(8, '0'), points, fronts: lines, splits: front.splits };
  }
  /**
   * The front from before the clock link (at the merge of #105 into this branch, before the switch was added), run on
   * these crest lines and fingerprinted. A ruled change to the switch-off front recomputes them, and says so in its commit.
   * On the owner's test build the front before the link is PR 5's (#102), whose points carry their crest's speed from the
   * samples' `speed`, so the hashes are its own (taken from e88a6437f, the build before the link's merge, which the merged
   * front matched step for step); the counts are the same.
   */
  const BEFORE = {
    // The jump rule changes nothing on the three lines: no crest there has another in its column within its reach.
    'three lines, no rules': { hash: 'b876f66e', points: 4739, fronts: 1330, splits: 258 },
    'three lines, Padang Padang': { hash: 'b876f66e', points: 4739, fronts: 1330, splits: 258 },
    'crowded rows, no rules': { hash: '1064366d', points: 4772, fronts: 1344, splits: 152 },
    'crowded rows, Padang Padang': { hash: '69752bf0', points: 4772, fronts: 1344, splits: 152 },
  };

  it('is the front from before the clock link, step for step, with the switch off', () => {
    const runs = { 'three lines': THREE_LINES, 'crowded rows': CROWDED };
    const rules = { 'no rules': {}, 'Padang Padang': PADANG };
    for (const [run, steps] of Object.entries(runs)) {
      for (const [name, options] of Object.entries(rules)) {
        const before = BEFORE[`${run}, ${name}` as keyof typeof BEFORE];
        expect(fingerprint(options, steps), `${run}, ${name}`).toEqual(before);
        expect(fingerprint({ ...options, clockLink: false }, steps), `${run}, ${name}, clockLink false`).toEqual(before);
      }
    }
  });
});
