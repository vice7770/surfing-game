import { describe, expect, it } from 'vitest';
import { BreakingFront, type FrontPoint } from '../barrel/BreakingFront';
import type { CrestSample } from '../barrel/crestOnset';
import { onsetTiming } from '../barrel/sliceClock';
import { fastFront, formatFastFronts, lineAt, logPoints, type FastFront, type Moment, type PointLog } from './fastFrontDump';

const moment = (t: number, x: number, z: number, overrides: Partial<Moment> = {}): Moment => ({ t, x, z, eta: 1.5, d: 3.2, travel: 4.25, line: -31.5, ...overrides });

describe('the fast fronts dump', () => {
  const front: FastFront = {
    front: 600, throws: 2, span: 61.4, throwPeel: 104.23, joinPeel: 16.6, breakPeel: Number.NaN,
    points: [
      { id: 9, column: 41, join: moment(10.5, 41.5, 52.25), throw: moment(11.75, 41.5, 55.5, { eta: 1.62, d: 2.4, travel: null, line: null }), joinDepth: 3.18, throwDepth: 2.456 },
      { id: 7, column: 40, join: moment(10.25, 40.5, 52), throw: moment(11.5, 40.5, 55.25), joinDepth: 3.18, throwDepth: 2.456 },
    ],
  };

  it('writes one row a point, in column order, join and throw side by side', () => {
    const text = formatFastFronts([front], 'the whole run');
    const lines = text.trimEnd().split('\n');
    const names = lines.find((line) => !line.startsWith('#'))!.split('\t');
    expect(names.slice(0, 4)).toEqual(['front', 'point', 'column', 'join_t']);
    expect(names.slice(-3)).toEqual(['lag', 'join_table_d', 'throw_table_d']);
    const rows = lines.filter((line) => !line.startsWith('#')).slice(1).map((line) => line.split('\t'));
    expect(rows).toHaveLength(2);
    for (const row of rows) expect(row).toHaveLength(names.length);
    // Column 40 first.
    expect(rows[0].slice(0, 3)).toEqual(['f600', '7', '40']);
    expect(rows[1].slice(0, 3)).toEqual(['f600', '9', '41']);
    const cell = (row: string[], name: string) => row[names.indexOf(name)];
    expect(cell(rows[0], 'join_t')).toBe('10.250');
    expect(cell(rows[0], 'throw_z')).toBe('55.25');
    expect(cell(rows[0], 'join_travel')).toBe('4.3');
    expect(cell(rows[0], 'lag')).toBe('1.250');
    expect(cell(rows[0], 'join_table_d')).toBe('3.180');
    expect(cell(rows[0], 'throw_table_d')).toBe('2.456');
  });

  it('leaves a cell empty for a bearing the probe did not have, and says so in the front\'s line', () => {
    const text = formatFastFronts([front], 'after 90 s');
    const names = text.split('\n').find((line) => !line.startsWith('#'))!.split('\t');
    const row = text.split('\n').find((line) => line.startsWith('f600\t9\t'))!.split('\t');
    expect(row[names.indexOf('throw_travel')]).toBe('');
    expect(row[names.indexOf('throw_line')]).toBe('');
    expect(row[names.indexOf('throw_eta')]).toBe('1.620');
    expect(text).toContain('# after 90 s');
    expect(text).toContain('# front f600: 2 throws over 61 m, peel by throws 104.2 m/s, by joins 16.6 m/s, by the solver\'s first breaks n/a m/s');
  });

  it('writes the header alone when no front is fast', () => {
    const text = formatFastFronts([], 'the whole run');
    expect(text).toContain('# 0 fast fronts');
    expect(text.split('\n').filter((line) => line && !line.startsWith('#'))).toHaveLength(1);
  });
});

/** A front point at column `id` of front `front`, on a line of slope `slope` through (0.5, 10). */
function point(id: number, front: number, slope: number, overrides: Partial<FrontPoint> = {}): FrontPoint {
  return {
    id, front, column: id, sigma: id, x: id + 0.5, z: 10 + slope * id, b: 0.3, height: 1.6, joined: 5 + 0.1 * id, depth: 3.18,
    throwDepth: 2.456, crestDepth: 3, thrown: null, throwZ: null, footHeight: 1.6, footDepth: 7, broke: 5, tau: -3, fresh: null, seen: 5.1,
    ...overrides,
  };
}

describe('the points the dump logs', () => {
  it('reads the front\'s line from the points two either side of a point on its front, folded to −90…90 degrees', () => {
    const line = [0, 1, 2, 3, 4].map((id) => point(id, 1, 1));
    expect(lineAt(line, 0)).toBeCloseTo(45, 9);
    expect(lineAt(line, 2)).toBeCloseTo(45, 9);
    expect(lineAt(line, 4)).toBeCloseTo(45, 9);
    // Another front beside it is not read, and a point alone has no line.
    const beside = [...line, point(9, 2, -0.5)];
    expect(lineAt(beside, 4)).toBeCloseTo(45, 9);
    expect(lineAt(beside, 5)).toBeNull();
    // A front listed with x falling (never from the front, but folded all the same) reads the same line.
    const backwards = [0, 1, 2].map((id) => point(id, 3, 1, { x: -id, z: 10 - id }));
    expect(lineAt(backwards, 1)).toBeCloseTo(45, 9);
    expect(lineAt([point(0, 1, -1), point(1, 1, -1)], 0)).toBeCloseTo(-45, 9);
  });

  it('logs a point\'s join the step it first stands, its throw the step it first has one, and leaves both as they were', () => {
    const logs = new Map<number, PointLog>();
    const travel = (p: FrontPoint) => (p.column === 1 ? null : 12.5);
    logPoints(logs, [point(0, 1, 0), point(1, 1, 0)], travel);
    expect(logs.size).toBe(2);
    expect(logs.get(0)).toMatchObject({ column: 0, joinDepth: 3.18, throwDepth: 2.456, join: { t: 5, x: 0.5, z: 10, eta: 1.6, d: 3, travel: 12.5, line: 0 } });
    expect(logs.get(0)!.thrown).toBeUndefined();
    expect(logs.get(1)!.join.travel).toBeNull();
    // Next step: point 0 has thrown (its crest crossed at 5.4, z 12), point 1 is changed but already logged.
    logPoints(logs, [point(0, 1, 0, { thrown: 5.4, throwZ: 12, height: 1.9, crestDepth: 2.4, z: 12.5 }), point(1, 1, 0, { height: 2, z: 14 })], travel);
    expect(logs.get(0)!.join.eta).toBe(1.6);
    expect(logs.get(0)!.thrown).toMatchObject({ t: 5.4, z: 12, eta: 1.9, d: 2.4, travel: 12.5 });
    expect(logs.get(1)!.join).toMatchObject({ eta: 1.6, z: 10 });
    // Later still: nothing is rewritten.
    logPoints(logs, [point(0, 1, 0, { thrown: 5.6, throwZ: 13, height: 2.5 })], travel);
    expect(logs.get(0)!.thrown).toMatchObject({ t: 5.4, z: 12, eta: 1.9 });
  });

  it('logs a point that joins already thrown with both at once, the throw at its crest\'s z when there is none', () => {
    const logs = new Map<number, PointLog>();
    logPoints(logs, [point(7, 2, 0, { thrown: 5, throwZ: null, z: 21 })], () => null);
    expect(logs.get(7)!.join).toMatchObject({ t: 5.7, z: 21 });
    expect(logs.get(7)!.thrown).toMatchObject({ t: 5, z: 21 });
  });
});

describe('the dump of a front the front itself built', () => {
  it('writes each point that threw, its join and its throw as the front had them', () => {
    // A 7 m foot under 16 s swell (the BreakingFront tests' case): a crest 1.6 m high joins 3.18 m deep and throws 2.456 m deep.
    const timing = onsetTiming(7, 16);
    const join = timing.joinDepth(1.6);
    const throwDepth = timing.throwDepth(1.6);
    const crest = (column: number, depth: number, strength: number): CrestSample => ({
      column, row: 10, x: column + 0.5, z: 10 + 0.25 * column, eta: 1.6, wave: 1.6, strength, rise: 0.5, depth, b: 0.3, speed: 5,
    });
    const columns = Array.from({ length: 12 }, (_, k) => k);
    const front = new BreakingFront(1, timing);
    const logs = new Map<number, PointLog>();
    // Each point's front at its first throw, as the probe counts the throws.
    const throws = new Map<number, { front: number }>();
    const step = (samples: CrestSample[], time: number) => {
      front.update(samples, samples.length, time);
      logPoints(logs, front.points, (p) => (p.column % 2 === 0 ? 12.5 : null));
      for (const p of front.points) if (p.thrown !== null && !throws.has(p.id)) throws.set(p.id, { front: p.front });
    };
    // At the foot, then over the band, then a column joining every 0.05 s (a 20 m/s peel), then all past the throw depth at once.
    step(columns.map((c) => crest(c, 7, 0)), 0);
    step(columns.map((c) => crest(c, 5.5, 0)), 0.5);
    for (let k = 0; k < 12; k += 1) step(columns.map((c) => (c <= k ? crest(c, join, 0.5) : crest(c, 5.5, 0))), 1 + 0.05 * k);
    step(columns.map((c) => crest(c, 2, 0.5)), 1.7);
    expect(front.points).toHaveLength(12);
    expect(new Set(front.points.map((p) => p.front)).size).toBe(1);
    expect(throws.size).toBe(12);
    const dumped = fastFront({ front: front.points[0].front, throws: 12, span: 11, throwPeel: 0, joinPeel: 20, breakPeel: Number.NaN }, throws, logs);
    expect(dumped.points).toHaveLength(12);
    // Another front's throws are not this one's.
    expect(fastFront({ ...dumped, front: front.points[0].front + 1 }, throws, logs).points).toHaveLength(0);
    const text = formatFastFronts([dumped], 'a front of the front\'s own');
    const names = text.split('\n').find((line) => !line.startsWith('#'))!.split('\t');
    const rows = text.trimEnd().split('\n').filter((line) => !line.startsWith('#')).slice(1).map((line) => line.split('\t'));
    expect(rows.map((row) => row[names.indexOf('column')])).toEqual(columns.map(String));
    const cell = (row: string[], name: string) => Number(row[names.indexOf(name)]);
    for (const row of rows) {
      const p = front.points.find((point) => point.id === cell(row, 'point'))!;
      expect(cell(row, 'join_t')).toBeCloseTo(p.joined, 3);
      expect(cell(row, 'join_z')).toBeCloseTo(p.z, 2);
      expect(cell(row, 'join_d')).toBeCloseTo(join, 3);
      expect(cell(row, 'join_eta')).toBeCloseTo(1.6, 3);
      // The front's line where each joined, from the points standing then: the first stood alone.
      if (p.column === 0) expect(row[names.indexOf('join_line')]).toBe('');
      else expect(cell(row, 'join_line')).toBeCloseTo((Math.atan(0.25) * 180) / Math.PI, 1);
      expect(row[names.indexOf('join_travel')]).toBe(p.column % 2 === 0 ? '12.5' : '');
      expect(cell(row, 'throw_t')).toBeCloseTo(p.thrown!, 3);
      expect(cell(row, 'throw_z')).toBeCloseTo(p.throwZ!, 2);
      expect(cell(row, 'throw_d')).toBeCloseTo(2, 3);
      expect(cell(row, 'lag')).toBeCloseTo(p.thrown! - p.joined, 3);
      expect(cell(row, 'join_table_d')).toBeCloseTo(join, 3);
      expect(cell(row, 'throw_table_d')).toBeCloseTo(throwDepth, 3);
    }
    // The joins peel a column every 0.05 s; the throws fire together, each where its crest crossed 2.456 m.
    expect(rows.map((row) => cell(row, 'join_t'))).toEqual(columns.map((c) => Number((1 + 0.05 * c).toFixed(3))));
    expect(new Set(rows.map((row) => row[names.indexOf('throw_t')])).size).toBe(1);
  });
});
