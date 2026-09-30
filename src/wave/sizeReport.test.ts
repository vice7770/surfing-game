import { describe, expect, it } from 'vitest';
import type { BreakingWave } from './SurfMeter';
import { breakerDepthFor } from './Breaking';
import { sizeGates, sizeMarkdown, summariseRun, takeOffIndex, type SizeRun } from './sizeReport';
import { komarGaughan } from './surfForecast';

const wave = (time: number, face: number, z = -100): BreakingWave => ({ time, x: 0, z, face });
const base = { spot: 'beach' as const, source: 'buoy' as const, significantHeight: 3, period: 12, heightAt: 'deep' as const, takeOffZ: -100, stepMs: 5, cells: 1000 };

describe('size report', () => {
  it('finds the breaker index that seats a take-off where the sets broke (the refit on every tank)', () => {
    for (const index of [0.78, 1.14]) expect(takeOffIndex(3, 10, breakerDepthFor(3, 10, index))).toBeCloseTo(index, 12);
    // Sets breaking in deeper water call for a smaller index.
    expect(takeOffIndex(3, 10, 4)).toBeLessThan(takeOffIndex(3, 10, 3));
  });

  it('summarises a run: H1/3 and H1/10 of its waves, and where its sets broke at the take-off', () => {
    const faces = [1, 2, 3, 4, 5, 6];
    const takeOff = [wave(0, 6, -110), wave(12, 5, -106), wave(24, 1, -60), wave(36, 2, -70), wave(48, 1.5, -65), wave(60, 1.2, -62)];
    const run = summariseRun(base, faces.map((face, i) => wave(i * 12, face)), takeOff);
    expect(run.typical).toBeCloseTo(5.5, 12);
    expect(run.sets).toBe(6);
    expect(run.waves).toBe(6);
    // The sets are the take-off's highest third: 6 and 5, broken at −110 and −106.
    expect(run.setBreakZ).toBeCloseTo(-108, 12);
    // The take-off's own surf, as the game's readout measures it: H1/3 and H1/10 of its waves.
    expect(run.takeOffTypical).toBeCloseTo(5.5, 12);
    expect(run.takeOffSets).toBe(6);
    expect(run.takeOffWaves).toBe(6);
  });

  it('passes big days within 20 % of Komar-Gaughan and fails them outside', () => {
    const kg = komarGaughan(3, 12);
    const near: SizeRun = { ...summariseRun(base, [], []), typical: 1.1 * kg, sets: 1.4 * kg, waves: 30, setBreakZ: -104 };
    const far: SizeRun = { ...near, spot: 'point', typical: 0.5 * kg };
    const gates = sizeGates([near, far, { ...near, spot: 'reef' }], []);
    expect(gates.find((gate) => gate.name === 'beach Hs 3 m Tp 12 s')!.pass).toBe(true);
    expect(gates.find((gate) => gate.name === 'point Hs 3 m Tp 12 s')!.pass).toBe(false);
    expect(gates.find((gate) => gate.name === 'beach Hs 3 m Tp 12 s take-off')!.pass).toBe(true);
    // The Reef is reported, not gated (its bed belongs to the Reef rework).
    expect(gates.some((gate) => gate.name.startsWith('reef'))).toBe(false);
  });

  it('holds small days to within 5 % of the baseline, and the Canyon to the same faces', () => {
    const small: SizeRun = { ...summariseRun({ ...base, spot: 'point', significantHeight: 1, heightAt: 'edge' }, [], []), typical: 1.0, sets: 1.3, waves: 20, setBreakZ: -90 };
    const canyon: SizeRun = { ...small, spot: 'canyon', significantHeight: 2, heightAt: 'edge' };
    const gates = sizeGates([{ ...small, typical: 1.04 }, { ...canyon, typical: 1.2 }], [small, canyon]);
    expect(gates.find((gate) => gate.name === 'point Hs 1 m Tp 12 s small day')!.pass).toBe(true);
    expect(gates.find((gate) => gate.name === 'canyon Hs 2 m Tp 12 s unchanged')!.pass).toBe(false);
  });

  it('writes a table per spot with the empirical references', () => {
    const run: SizeRun = { ...summariseRun(base, [], []), typical: 4, sets: 5, waves: 30, setBreakZ: -104 };
    const markdown = sizeMarkdown([run], undefined, 'npm run report:sizes');
    expect(markdown).toContain('## beach');
    expect(markdown).toContain(komarGaughan(3, 12).toFixed(2));
  });
});
