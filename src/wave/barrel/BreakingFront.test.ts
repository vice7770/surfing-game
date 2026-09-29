import { describe, expect, it } from 'vitest';
import { BreakingFront } from './BreakingFront';
import type { CrestSample } from './crestOnset';

/** A crest sample over breaking water (B past the face's threshold) at one-metre columns. */
function sample(column: number, z: number, b = 0.7): CrestSample {
  return { column, row: Math.floor(z), x: column + 0.5, z, eta: 1, b, speed: 5, dirX: 0, dirZ: 1 };
}

/** An oblique straight crest over `columns`, z = z0 + slope · x. */
function line(columns: readonly number[], z0: number, slope: number, b = 0.7): CrestSample[] {
  return columns.map((column) => sample(column, z0 + slope * (column + 0.5), b));
}

const range = (from: number, to: number) => Array.from({ length: to - from }, (_, k) => from + k);
const fronts = (front: BreakingFront) => new Set(front.points.map((point) => point.front)).size;

describe('the breaking front as lines', () => {
  it('links an oblique straight crest into one front, σ its arc length from the −x end', () => {
    const front = new BreakingFront();
    const samples = line(range(0, 20), 10, 0.5);
    front.update(samples, samples.length, 0);
    expect(front.points).toHaveLength(20);
    expect(fronts(front)).toBe(1);
    front.points.forEach((point, k) => expect(point.sigma).toBeCloseTo(k * Math.sqrt(1 + 0.5 ** 2), 9));
  });

  it('keeps every point’s ID when the crest moves 0.3 m shoreward', () => {
    const front = new BreakingFront();
    const first = line(range(0, 20), 10, 0.5);
    front.update(first, first.length, 0);
    const ids = front.points.map((point) => point.id);
    front.points.forEach((point) => { point.tau = 0.25; point.thrown = true; });
    const next = line(range(0, 20), 10.3, 0.5);
    front.update(next, next.length, 0.1);
    expect(front.points.map((point) => point.id)).toEqual(ids);
    expect(front.points.every((point) => point.tau === 0.25 && point.thrown)).toBe(true);
  });

  it('leaves out crests whose B has not reached the face', () => {
    const front = new BreakingFront();
    const samples = line(range(0, 20), 10, 0.5, 0.5);
    front.update(samples, samples.length, 0);
    expect(front.points).toHaveLength(0);
  });

  // Review Focus 5: two crests in the same columns are two fronts.
  it('makes two fronts of two crests 15 m apart in the same columns', () => {
    const front = new BreakingFront();
    const samples = range(0, 20).flatMap((column) => [sample(column, 10), sample(column, 25)]);
    front.update(samples, samples.length, 0);
    expect(front.points).toHaveLength(40);
    expect(fronts(front)).toBe(2);
    for (const id of new Set(front.points.map((point) => point.front))) {
      expect(front.points.filter((point) => point.front === id).map((point) => point.column)).toEqual(range(0, 20));
    }
  });

  // Review Focus 2: a front that breaks apart keeps each side's points.
  it('splits a front at five empty columns, each side keeping its IDs', () => {
    const front = new BreakingFront();
    const whole = line(range(0, 20), 10, 0.5);
    front.update(whole, whole.length, 0);
    const idOf = new Map(front.points.map((point) => [point.column, point.id]));
    const split = line([...range(0, 8), ...range(13, 20)], 10.2, 0.5);
    front.update(split, split.length, 0.1);
    expect(fronts(front)).toBe(2);
    for (const point of front.points) expect(point.id).toBe(idOf.get(point.column));
    const left = front.points.filter((point) => point.column < 8);
    const right = front.points.filter((point) => point.column >= 13);
    expect(new Set(left.map((point) => point.front)).size).toBe(1);
    expect(new Set(right.map((point) => point.front)).size).toBe(1);
    expect(left[0].front).not.toBe(right[0].front);
    expect(right[0].sigma).toBe(0);
  });

  it('holds a point missing for a moment, and drops it after half a second', () => {
    const front = new BreakingFront();
    const whole = line(range(0, 5), 10, 0);
    front.update(whole, whole.length, 0);
    const id = front.points[2].id;
    const gap = line([0, 1, 3, 4], 10, 0);
    front.update(gap, gap.length, 0.1);
    expect(front.points.map((point) => point.column)).toEqual([0, 1, 3, 4]);
    front.update(whole, whole.length, 0.2);
    expect(front.points[2].id).toBe(id);
    for (let t = 0.3; t < 1; t += 0.1) front.update(gap, gap.length, t);
    front.update(whole, whole.length, 1);
    expect(front.points[2].id).not.toBe(id);
  });

  it('rates B’s rise per second from one step to the next', () => {
    const front = new BreakingFront();
    const before = line(range(0, 3), 10, 0, 0.7);
    front.update(before, before.length, 0);
    const after = line(range(0, 3), 10.2, 0, 0.72);
    front.update(after, after.length, 0.1);
    for (const point of front.points) expect(point.bRate).toBeCloseTo(0.2, 9);
  });

  it('carries its state through export and import', () => {
    const front = new BreakingFront();
    const whole = line(range(0, 20), 10, 0.5);
    front.update(whole, whole.length, 0);
    const gap = line(range(0, 18), 10.1, 0.5);
    front.update(gap, gap.length, 0.1);
    const copy = new BreakingFront();
    copy.importState(structuredClone(front.exportState()));
    expect(copy.points).toEqual(front.points);
    front.update(whole, whole.length, 0.2);
    copy.update(whole, whole.length, 0.2);
    expect(copy.points).toEqual(front.points);
  });
});
