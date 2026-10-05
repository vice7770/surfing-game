import { describe, expect, it } from 'vitest';
import { boundedCParameters, blendBoundedCParameters, sampleBoundedC, type BoundedCParameters } from './boundedCProfile';
import { pairInnerSheet, roofEnvelopeDifference, roofHeight } from './sharedUpperRoot';
import { readBarrelCases } from './nodeBarrelCases';
import { decodeCase } from './profileFormat';
import { ProfileLibrary } from './ProfileLibrary';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';

const cases = readBarrelCases().map(decodeCase);
const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
const frame = (c: typeof cases[number], f: number) => c.frames.slice(256 * f, 256 * (f + 1));
const blend = (a: Float32Array, b: Float32Array, t: number) => Float32Array.from(a, (v, i) => v + t * (b[i] - v));

function crossings(p: Float32Array, first = 0, last = 127): Set<string> {
  const result = new Set<string>();
  for (let i = first; i < last; i += 1) for (let j = i + 2; j < last; j += 1) {
    const ax = p[2 * i], ay = p[2 * i + 1], dx = p[2 * i + 2] - ax, dy = p[2 * i + 3] - ay;
    const bx = p[2 * j], by = p[2 * j + 1], ex = p[2 * j + 2] - bx, ey = p[2 * j + 3] - by;
    const den = dx * ey - dy * ex;
    if (Math.abs(den) < 1e-12) continue;
    const t = ((bx - ax) * ey - (by - ay) * ex) / den, u = ((bx - ax) * dy - (by - ay) * dx) / den;
    if (t > 1e-9 && t < 1 - 1e-9 && u > 1e-9 && u < 1 - 1e-9) result.add(`${i}/${j}`);
  }
  return result;
}

function records(height: number, center: number, curved: boolean): Float32Array {
  const data = new Float32Array(9 * FRONT_STRIDE);
  for (let k = 0; k < 9; k += 1) {
    const o = k * FRONT_STRIDE;
    data[o + FRONT_FIELD.x] = k + 0.5; data[o + FRONT_FIELD.z] = -100 + (curved ? 0.02 * (k - 4) ** 2 : 0);
    data[o + FRONT_FIELD.front] = 1; data[o + FRONT_FIELD.sigma] = k;
    data[o + FRONT_FIELD.footHeight] = height; data[o + FRONT_FIELD.footDepth] = 7;
    data[o + FRONT_FIELD.tau] = center + 0.006 * (k - 4); data[o + FRONT_FIELD.throwZ] = data[o + FRONT_FIELD.z];
  }
  return data;
}
const waters = [() => 0.5, (x: number, z: number) => 0.5 + 0.12 * (z + 100) + 0.03 * (x - 4.5),
  (x: number, z: number) => 0.5 - 0.09 * (z + 100) + 0.22 * Math.sin(0.8 * (z + 100)) + 0.04 * Math.cos(x)];

describe('shared inner-sheet sampling', () => {
  it('keeps asset frames and adjacent parameter blends finite, ordered and free of new proper crossings', () => {
    let frames = 0, adjacent = 0;
    function check(raw: Float32Array, z: BoundedCParameters) {
      const before = raw.slice(), out = raw.slice();
      sampleBoundedC(z, before, false);
      const meta = sampleBoundedC(z, out, false, undefined, true);
      const paired = pairInnerSheet(out, meta);
      expect(out.every(Number.isFinite)).toBe(true);
      for (let i = 0; i < 128; i += 1) if (i <= 32 || i >= 102 || i >= 60 && i <= 80) {
        expect(out[2 * i]).toBe(before[2 * i]);
        expect(out[2 * i + 1]).toBe(before[2 * i + 1]);
      }
      const original = crossings(before);
      expect([...crossings(out)].filter(pair => !original.has(pair))).toEqual([]);
      for (let i = 38; i <= 58; i += 1) {
        const j = 126 - i;
        expect(out[2 * i]).toBe(out[2 * j]);
        expect(out[2 * i + 1]).toBeGreaterThanOrEqual(out[2 * j + 1]);
      }
      // This value measures the actual roof graph; material indices are intentionally resampled.
      expect(paired.maximumRoofEnvelopeChange).toBe(roofEnvelopeDifference(before, out));
      expect(Number.isFinite(paired.maximumRoofEnvelopeChange)).toBe(true);
    }
    for (const c of cases) {
      const n = c.frames.length / 256;
      for (let f = 0; f < n; f += 1) {
        const a = frame(c, f), za = boundedCParameters(a, c.touchdown, c.tauStart + f * c.tauStep);
        check(a, za); frames += 1;
        if (f + 1 < n) {
          const b = frame(c, f + 1), zb = boundedCParameters(b, c.touchdown, c.tauStart + (f + 1) * c.tauStep);
          for (const w of [0.25, 0.5, 0.75]) {
            check(blend(a, b, w), blendBoundedCParameters(za, zb, w)); adjacent += 1;
          }
        }
      }
    }
    expect(frames).toBe(1224); expect(adjacent).toBe(3648);
  }, 30000);

  it('measures roof graph differences at union breakpoints and completes a vertical facet with its highest endpoint', () => {
    const a = new Float32Array(256);
    for (let i = 32; i <= 60; i += 1) { a[2 * i] = i - 32; a[2 * i + 1] = 10 - (i - 32) / 2; }
    a[2 * 47] = a[2 * 46];
    expect(roofHeight(a, 14)).toBe(3);
    const b = a.slice();
    for (let i = 32; i <= 60; i += 1) b[2 * i + 1] += 0.125;
    expect(roofEnvelopeDifference(a, b)).toBe(0.125);
    expect(roofEnvelopeDifference(b, a)).toBe(0.125);
    expect(() => roofHeight(a, -1)).toThrow('missing roof crossing');
    a[2 * 40] = 6;
    expect(() => roofHeight(a, 14)).toThrow('backward roof domain');
  });

  it('shares actual paired triangle footprints and deferred projected datum across straight/curved adjacent-age rows', () => {
    let pairedCells = 0;
    for (const c of cases) {
      const q = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 }, times = library.profileTimes(q);
      for (const center of [0.8 * times.clearSeconds, times.clearSeconds, times.touchdownSeconds - 0.03, times.touchdownSeconds + 0.4 * times.collapseSeconds]) {
        for (const heightAt of waters) for (const curved of [false, true]) {
          const data = records(q.footHeight, center, curved);
          const draw = new SweptLoft(library, c.slope).build(data, 9, 0.5, heightAt);
          const deferred = SweptLoft.forContactQueries(library, c.slope), last = deferred.build(data, 9, 0.5, heightAt);
          for (let row = 0; row < draw.sliceCount; row += 1) deferred.prepareRow(row);
          expect(last.positions.subarray(0, 3 * draw.vertexCount)).toEqual(draw.positions.subarray(0, 3 * draw.vertexCount));
          expect(last.indices.subarray(0, draw.indexCount)).toEqual(draw.indices.subarray(0, draw.indexCount));
          expect(draw.vertexCount).toBeLessThanOrEqual(LOFT.budget); expect(LOFT_SAMPLES).toBe(134);
          let base = 0;
          for (let s = 0; s + 1 < draw.sliceCount; s += 1) {
            if (!draw.sliceJoined[s]) continue;
            const p = draw.positions, rootPaired = (row: number) => {
              for (let k = 0; k < 21; k += 1) {
                const a = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 38 + k), b = 3 * (row * LOFT_SAMPLES + LOFT.extensionSamples + 88 - k);
                if (p[a] !== p[b] || p[a + 2] !== p[b + 2]) return false;
              }
              return true;
            };
            if (rootPaired(s) && rootPaired(s + 1)) for (let k = 0; k < 20; k += 1) {
              const cells = [38 + k, 87 - k].map(i => [0, 3].map(offset => {
                const t = base + 6 * (LOFT.extensionSamples + i) + offset;
                return [draw.indices[t], draw.indices[t + 1], draw.indices[t + 2]].map(v => [p[3 * v], p[3 * v + 2]].join(',')).sort().join('|');
              }).sort());
              expect(cells[1]).toEqual(cells[0]);
              pairedCells += 1;
            }
            base += 6 * (LOFT_SAMPLES - 1);
          }
        }
      }
    }
    expect(pairedCells).toBeGreaterThan(1000);
  }, 30000);
});
