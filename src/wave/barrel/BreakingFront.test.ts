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
  return { column, row: Math.floor(z), x: column + 0.5, z, eta, strength, rise: 0.5, depth, b: 0.3, speed: 5 };
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
