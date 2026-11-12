import { describe, expect, it } from 'vitest';
import { LIP_STREAK, lipStreakLace } from './lipLook';

/**
 * Ruling 25c's F2, read on the pattern itself (the CPU mirror reads the same texels as the GPU): the streaks' mask
 * (covered over half) on a (u, s) grid 4 m along the crest by 2 m round the curl at 1 cm steps, cover 0.3.
 * The correlation length is the lag where the autocorrelation first falls under 1/e (capped at half the grid).
 * Two readings (step 16 README): the raw mask, whose first fall is the lace's own walls (isotropic, by design: the
 * lace is the same both ways), and the mask's local share over one lace cell, which is the streak (where the lace is
 * gathered). The ruling's 2.5 is held on the second; the first is printed and only checked at long lags.
 */
const STEP = 0.01, NU = 400, NS = 200;

function mask(cover: number): Float64Array {
  const m = new Float64Array(NU * NS);
  for (let j = 0; j < NS; j += 1) for (let i = 0; i < NU; i += 1) m[j * NU + i] = lipStreakLace(i * STEP, j * STEP, cover) > 0.5 ? 1 : 0;
  return m;
}

/** The local share of `m` over a box `radius` samples either side (every second sample). */
function localShare(m: Float64Array, radius: number): Float64Array {
  const out = new Float64Array(NU * NS);
  for (let j = 0; j < NS; j += 1) for (let i = 0; i < NU; i += 1) {
    let s = 0, n = 0;
    for (let dj = -radius; dj <= radius; dj += 2) for (let di = -radius; di <= radius; di += 2) {
      const a = i + di, b = j + dj;
      if (a < 0 || b < 0 || a >= NU || b >= NS) continue;
      s += m[b * NU + a]; n += 1;
    }
    out[j * NU + i] = s / n;
  }
  return out;
}

function correlation(f: Float64Array) {
  let mean = 0; for (const v of f) mean += v; mean /= f.length;
  let variance = 0; for (const v of f) variance += (v - mean) ** 2; variance /= f.length;
  const rho = (du: number, ds: number) => {
    let sum = 0, n = 0;
    for (let j = 0; j + ds < NS; j += 2) for (let i = 0; i + du < NU; i += 2) { sum += (f[j * NU + i] - mean) * (f[(j + ds) * NU + i + du] - mean); n += 1; }
    return sum / n / variance;
  };
  const length = (along: boolean) => {
    const cap = (along ? NU : NS) / 2;
    for (let lag = 1; lag < cap; lag += 1) if (rho(along ? lag : 0, along ? 0 : lag) < 1 / Math.E) return lag * STEP;
    return cap * STEP;
  };
  return { mean, rho, along: length(true), round: length(false) };
}

describe('the lip streaks’ pattern (ruling 25c, F2)', () => {
  const raw = mask(0.3);
  const rawC = correlation(raw);
  const share = correlation(localShare(raw, Math.round(LIP_STREAK.lace / STEP / 2)));
  const tail = (along: boolean) => [30, 40, 60, 80, 100].reduce((s, l) => s + rawC.rho(along ? l : 0, along ? 0 : l), 0) / 5;

  it('covers about its cover', () => {
    expect(rawC.mean).toBeGreaterThan(0.25);
    expect(rawC.mean).toBeLessThan(0.4);
  });

  it('gathers the lace into streaks at least 2.5 times longer round the curl than along the crest', () => {
    const report = `F2 pattern at cover 0.3: covered ${rawC.mean.toFixed(3)}; raw mask 1/e length along ${rawC.along.toFixed(2)} m, round ${rawC.round.toFixed(2)} m (ratio ${(rawC.round / rawC.along).toFixed(2)}); `
      + `local share over ${LIP_STREAK.lace} m: along ${share.along.toFixed(2)} m, round ${share.round.toFixed(2)} m (ratio ${(share.round / share.along).toFixed(2)}, round capped at 1 m); `
      + `raw mask's mean correlation at 0.3-1 m lags: along ${tail(true).toFixed(2)}, round ${tail(false).toFixed(2)}`;
    expect(report).toBeTruthy();
    if (process.env.LIP_F2_REPORT) process.stdout.write(`${report}\n`);
    expect(share.round / share.along).toBeGreaterThanOrEqual(2.5);
    // Far lags on the raw mask: the streak keeps it correlated round the curl, not along the crest.
    expect(tail(false)).toBeGreaterThan(tail(true) + 0.08);
  });
});
