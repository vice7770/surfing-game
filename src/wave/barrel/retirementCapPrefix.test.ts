import { describe, expect, it } from 'vitest';
import { FRONT_STRIDE } from './frontRecords';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { LANDMARK, ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft, collapseFade, type LoftResult } from './sweptLoft';
const cases = readBarrelCases().map(decodeCase), c = cases.find(c => c.id === 'pad19-a30-l12')!;
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const foot = Math.fround(c.nonlinearity * 7);
const times = library.profileTimes({ slope: c.slope, footHeight: foot, footDepth: 7 });
const retirement = (h: number, d: number) => { const t = library.profileTimes({ slope: c.slope, footHeight: h, footDepth: d }); return t.touchdownSeconds + t.collapseSeconds; };
function packet(xs: number[], front: number, z: number, ages: number[], heights = xs.map(() => foot), depths = xs.map(() => 7)) {
  const words = new Float32Array(xs.length * FRONT_STRIDE);
  xs.forEach((x, k) => words.set([x, z, front, x - xs[0], ages[k], heights[k], depths[k], z - 5, 4], k * FRONT_STRIDE));
  return words;
}
function concat(...parts: Float32Array[]) { const r = new Float32Array(parts.reduce((n, p) => n + p.length, 0)); let at = 0; for (const p of parts) { r.set(p, at); at += p.length; } return r; }
function build(words: Float32Array) { return new SweptLoft(library, c.slope, { sheet: false }).build(words, words.length / FRONT_STRIDE, 0, () => 0); }
function xAt(l: LoftResult, row: number) { return l.positions[3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + LANDMARK.crest)]; }

describe('C retirement cap preserves the first omitted ordered prefix', () => {
  it('stops after a dangling support rollback despite spare capacity, and cannot replace the first omission with a later interior-only front', () => {
    // 297 live stations from a constant-clock, 145m physical front, including its ordinary shoulders.
    const first = packet([0, 145], 1, 40, [times.touchdownSeconds, times.touchdownSeconds]);
    // One intrinsically live base station; its adjacent dead support cannot fit together with that live row.
    const second = packet([200, 210, 220], 2, 70, [100, retirement(foot, 7) - .02, 100]);
    // Fixed off-lattice raw endpoints are individually dead; the actual interpolated provider is live inside.
    // This is the existing carrier-support depth1/depth9 construction, not a searched station.
    const depths = [1, 9], heights = depths.map(d => Math.fround(c.nonlinearity * d));
    const third = packet([300.10, 300.15], 3, 100, heights.map((h, k) => retirement(h, depths[k]) + .01), heights, depths);
    const endpointFades = [0, 1].map(k => { const o = k * FRONT_STRIDE; const t = library.profileTimes({ slope: c.slope, footHeight: third[o + 5], footDepth: third[o + 6] }); return collapseFade(third[o + 4], t.touchdownSeconds, t.collapseSeconds); });
    const firstOnly = build(first), secondOnly = build(second), thirdOnly = build(third);
    const secondLive = Array.from({ length: secondOnly.sliceCount }, (_, s) => s).filter(s => secondOnly.sliceFade[s] > 0);
    const thirdLive = Array.from({ length: thirdOnly.sliceCount }, (_, s) => s).filter(s => thirdOnly.sliceFade[s] > 0);
    expect(firstOnly.sliceCount).toBe(297); expect(secondLive.map(s => xAt(secondOnly, s))).toEqual([210]); expect(endpointFades).toEqual([0, 0]); expect(thirdLive.length).toBeGreaterThan(0);
    const words = concat(first, second, third), before = words.slice(), now = build(words);
    expect(words).toEqual(before); expect(now.sliceCount).toBe(297); expect(now.vertexCount).toBeLessThan(LOFT.budget);
    expect(now.cSampling!.budgetTruncated).toBe(true); expect(now.cSampling!.omittedFronts).toBe(1);
    expect(now.cSampling!.firstOmittedPlannedX).toBeGreaterThan(200); expect(now.cSampling!.firstOmittedPlannedX).toBeLessThan(210);
    expect(now.sliceFront.subarray(0, now.sliceCount).every(f => f === 1)).toBe(true);
    // An omitted support owns the prefix even with spare capacity; a later live interior cannot replace it.
    expect(now.vertexCount).toBe(firstOnly.vertexCount);
    expect(now.positions.subarray(0, 3 * now.vertexCount)).toEqual(firstOnly.positions.subarray(0, 3 * firstOnly.vertexCount));
    expect(now.indices.subarray(0, now.indexCount)).toEqual(firstOnly.indices.subarray(0, firstOnly.indexCount));
    // The retained physical front's ending seal stays intact; no reconnection through omitted raw knots.
    expect(now.sliceWeight[now.sliceCount - 1]).toBe(0); expect(now.sliceJoined[now.sliceCount - 1]).toBe(0);
  });
});
