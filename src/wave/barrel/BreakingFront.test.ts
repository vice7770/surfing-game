import { describe, expect, it } from 'vitest';
import { BreakingFront } from './BreakingFront';
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

  // PR 5 (the advisor, 2026-10-01): once its lip is thrown the solver's crest maximum leaps 3–8 m as the face turns
  // into a bore, so from the throw to its crash a point runs on its own pace and only claims its column's crest.
  it('runs a point holding an uncrashed jet on its own pace to its crash, claiming its crest over the throw’s window, at most 10 m (PR 5)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 7), 10, 0, 1);
    const ids = front.points.map((point) => point.id);
    const hold = (k: number, strip: number, window: number, crashedAt?: number) => {
      Object.assign(front.points[k], { jetStrip: strip, jetWindow: window, jetPace: 5, jetBase: 10, ...(crashedAt !== undefined ? { crashedAt } : {}) });
    };
    hold(1, 4, 3);
    hold(2, 5, 20);
    // A window too short for the jump: it claims no crest, and runs on all the same.
    hold(5, 7, 0.5);
    // Crashed, or threw none: matched as before.
    hold(3, 6, 3, 1.05);
    hold(4, -1, 3);
    // Every crest leaps 5 m shoreward in 0.1 s: past the 3 m match reach. The paced points run 0.5 m and claim the crest
    // 4.5 m ahead, inside 3 + 3 m and the 10 m cap, without taking its z.
    const jumped = line(range(0, 7), 15, 0, 2.4, 0.5);
    front.update(jumped, jumped.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual([ids[1], ids[2], ids[5]]);
    expect(front.points.map((point) => point.z)).toEqual([10.5, 10.5, 10.5]);
    expect(front.points.map((point) => point.jetStrip)).toEqual([4, 5, 7]);
    expect(front.coasted).toBe(1);
    // Linked on their own z: columns 1 and 2 one front, column 5 apart from them.
    expect(fronts(front)).toBe(2);
    // Now at 11 m: column 1's crest 6.5 m away is past its 3 + 3 m, and column 2's 10.5 m away past the 10 m cap on 3 + 20 m.
    // None claims a crest, and all run on at their pace until their crash.
    const far = [sample(1, 17.5, 2.3, 0.5), sample(2, 21.5, 2.3, 0.5)];
    front.update(far, far.length, 1.2);
    expect(front.points.map((point) => point.id)).toEqual([ids[1], ids[2], ids[5]]);
    expect(front.points.map((point) => point.z)).toEqual([11, 11, 11]);
    expect(fronts(front)).toBe(2);
    expect(front.coasted).toBe(4);
    // Crashed, they match as before: with no crest in reach they leave.
    for (const point of front.points) point.crashedAt = 1.25;
    front.update(far, far.length, 1.3);
    expect(front.points).toHaveLength(0);
  });

  it('gives a paced point the crest nearest its own z, ahead of the others, and the ordinary match once it crashes (PR 5)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 3), 10, 0, 1);
    const ids = front.points.map((point) => point.id);
    Object.assign(front.points[1], { jetStrip: 2, jetWindow: 3, jetPace: 4, jetBase: 10 });
    // Column 1's crest split about its dip: shoulders 3.5 m behind and 3.2 m ahead of where it was; it ran 0.4 m.
    const split = [sample(0, 10.3, 2.4, 0.5), sample(1, 6.5, 2.4, 0.5), sample(1, 13.2, 2.4, 0.5), sample(2, 10.3, 2.4, 0.5)];
    front.update(split, split.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points[1].z).toBeCloseTo(10.4, 12);
    expect(front.points[1].height).toBe(split[2].eta);
    // Crashed, it matches as before: the crest 0.2 m away is its own, and it takes that crest's z.
    front.points[1].crashedAt = 1.15;
    const near = [sample(0, 10.6, 2.4, 0.5), sample(1, 10.6, 2.4, 0.5), sample(2, 10.6, 2.4, 0.5)];
    front.update(near, near.length, 1.2);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points[1].z).toBe(10.6);
  });

  it('keeps a crashed point on its pace while it blends toward the crest it claims, and lets one with none go (PR 5)', () => {
    const front = new BreakingFront(1, TIMING);
    joinAt(front, range(0, 3), 10, 0, 1);
    const ids = front.points.map((point) => point.id);
    for (const k of [1, 2]) Object.assign(front.points[k], { jetStrip: k, jetWindow: 3, jetPace: 5, jetBase: 10, jetBlend: 0.2, jetUntil: 0.5, crashedAt: 1, tau: 0.3 });
    // Column 1's crest leaps 4.5 m ahead of its paced z, in reach; column 2 has none.
    const crests = [sample(0, 10.3, 2.4, 0.5), sample(1, 15, 2.4, 0.5)];
    front.update(crests, crests.length, 1.1);
    expect(front.points.map((point) => point.id)).toEqual([ids[0], ids[1]]);
    expect(front.points[1].crestZ).toBe(15);
    expect(front.points[1].z).toBeCloseTo(10.5, 12);
    // Past its blend it matches as before: the crest 4.5 m away is past the match reach, and it leaves.
    front.points[1].tau = 0.6;
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

  // PR 5 with #105's jump rule: the held jets claim their crests first, and the sized crests follow the furthest crest
  // ahead of them among the others.
  it('with a jump reach, leaves the crest a jet-holding point keeps to the point, and follows a sized crest on the others (PR 5 with #105)', () => {
    const front = new BreakingFront(1, TIMING, { jumpReach: 10 });
    joinAt(front, [0], 20, 0, 1);
    // A sized crest on its way in, 15 m behind the point in its column.
    front.update([sample(0, 5, 7, 0), sample(0, 20.3, 2.9, 0.5)], 2, 1.05);
    expect(front.points).toHaveLength(1);
    expect(front.exportState().tracks).toHaveLength(1);
    Object.assign(front.points[0], { jetStrip: 1, jetWindow: 7, jetPace: 5, jetBase: 20 });
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
