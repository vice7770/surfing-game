import { describe, expect, it, vi } from 'vitest';
import * as provider from './boundedCProfile';
import { pairInnerSheet } from './sharedUpperRoot';
import { ProfileLibrary, type BarrelCase } from './ProfileLibrary';
import { decodeCase } from './profileFormat';
import { readBarrelCases } from './nodeBarrelCases';
import { GRAVITY } from '../dispersion';

const cases = readBarrelCases().map(decodeCase);
const frame = (c: BarrelCase, f: number) => c.frames.slice(256 * f, 256 * (f + 1));
const blend = (a: Float32Array, b: Float32Array, w: number) => Float32Array.from(a, (v, i) => v + w * (b[i] - v));

describe('lifecycle and demand cap evaluation', () => {
  it('agrees with the complete contour on every asset frame, adjacent blend and both cap derivative stencils', () => {
    let frames = 0, adjacent = 0;
    function check(raw: Float32Array, z: provider.BoundedCParameters) {
      const original = raw.slice(), out = raw.slice(), clock = provider.boundedCLifecycle(z);
      const meta = provider.sampleBoundedC(z, out, false, clock.impactEvent, true);
      pairInnerSheet(out, meta);
      expect(clock.impactEvent).toEqual(meta.impactEvent);
      expect(clock.impactTau).toBe(meta.impactTau);
      expect(clock.retiredTau).toBe(meta.retiredTau);
      expect(clock.fullyFormedTau).toBe(meta.fullyFormedTau);
      expect(provider.boundedCCap(z, clock.impactEvent)).toEqual([out[128], out[129]]);
      const dt = 1e-5 * z.authoredTD;
      for (const tau of [z.tau - dt, z.tau + dt]) {
        const sample = raw.slice(), at = { ...z, tau };
        const stencil = provider.sampleBoundedC(at, sample, false, clock.impactEvent, true);
        pairInnerSheet(sample, stencil);
        expect(provider.boundedCCap(at, clock.impactEvent)).toEqual([sample[128], sample[129]]);
      }
      expect(raw).toEqual(original);
    }
    for (const c of cases) {
      const n = c.frames.length / 256;
      for (let f = 0; f < n; f += 1) {
        const a = frame(c, f), za = provider.boundedCParameters(a, c.touchdown, c.tauStart + f * c.tauStep);
        check(a, za); frames += 1;
        if (f + 1 < n) {
          const b = frame(c, f + 1), zb = provider.boundedCParameters(b, c.touchdown, c.tauStart + (f + 1) * c.tauStep);
          for (const w of [0.25, 0.5, 0.75]) {
            check(blend(a, b, w), provider.blendBoundedCParameters(za, zb, w)); adjacent += 1;
          }
        }
      }
    }
    expect(frames).toBe(1224); expect(adjacent).toBe(3648);
  }, 60000);

  it('uses the moving carrier and final event clock in the metric cap velocity', () => {
    const library = new ProfileLibrary(cases, { geometry: 'bounded-C' });
    for (const c of cases) {
      const q = { slope: c.slope, footHeight: c.nonlinearity * 7, footDepth: 7 };
      const times = library.profileTimes(q), blend = library.caseBlend(q), unit = Math.sqrt(times.scale / GRAVITY);
      const authoredTD = blend.lower.touchdown + blend.weight * (blend.upper.touchdown - blend.lower.touchdown);
      const dt = Math.max(1e-8, 1e-5 * authoredTD * unit);
      for (const seconds of [0.4 * c.touchdown * unit, c.touchdown * unit,
        times.touchdownSeconds, times.touchdownSeconds + 0.5 * times.collapseSeconds]) {
        const out = new Float32Array(256), earlier = new Float32Array(256), later = new Float32Array(256);
        const lookup = library.profileAt({ ...q, seconds }, out);
        library.profileAt({ ...q, seconds: seconds - dt }, earlier);
        library.profileAt({ ...q, seconds: seconds + dt }, later);
        expect(lookup.tipAlong).toBe((later[128] - earlier[128]) / (2 * dt));
        expect(lookup.tipUp).toBe((later[129] - earlier[129]) / (2 * dt));
        expect(lookup.touchdownSeconds).toBe(times.touchdownSeconds);
        expect(lookup.collapseSeconds).toBe(times.collapseSeconds);
        expect(out.every(Number.isFinite)).toBe(true);
      }
    }
  });

  it('constructs no full contours for clocks and only one contour plus two scalar stencils per profile', () => {
    const full = vi.spyOn(provider, 'sampleBoundedC'), caps = vi.spyOn(provider, 'boundedCCap');
    const clocks = vi.spyOn(provider, 'boundedCLifecycle');
    const rows = Array.from({ length: 32 }, (_, i) => ({ slope: cases[0].slope, footHeight: 1.45 + 0.6 * i / 31, footDepth: 7 }));
    try {
      for (const scenario of ['cold-clock', 'warm-clock', 'cold-profile', 'warm-clock-profile']) {
        const library = new ProfileLibrary(cases, { geometry: 'bounded-C' }), out = new Float32Array(256);
        if (scenario.startsWith('warm')) for (const q of rows) library.profileTimes(q);
        full.mockClear(); caps.mockClear(); clocks.mockClear();
        for (const q of rows) {
          if (scenario.endsWith('clock')) library.profileTimes(q);
          else library.profileAt({ ...q, seconds: 0.4 }, out);
        }
        expect(full.mock.calls.length).toBe(scenario.endsWith('clock') ? 0 : 32);
        expect(caps.mock.calls.length).toBe(scenario.endsWith('clock') ? 0 : 64);
        expect(clocks.mock.calls.length).toBe(scenario.startsWith('warm') ? 0 : 32);
      }
    } finally { vi.restoreAllMocks(); }
  });
});
