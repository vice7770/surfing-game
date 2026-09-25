# P1 Sea-State Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the SI-unit wave foundation from phase P1 of [the wave formation plan](../../research/wave-formation-plan.md): Airy dispersion, a seeded JONSWAP sea state with an analytic linear sampler and set predictor, a Froude-consistent time-scale, and live physics readouts. The legacy solver stays the playable default.

**Architecture:**
- New pure modules in `src/wave/`: `dispersion.ts`, `SeaState.ts` and `SwellReadout.ts`. They carry no Three.js dependency and are fully unit-tested.
- `src/game/timeScale.ts` converts wall time to simulated time.
- The legacy `InteractiveWaterField` only gains a read-only `maxBedSlope()` for the readouts.
- A small `src/ui/PhysicsReadoutPanel.ts` renders readout rows into the Wave Lab.

**Tech Stack:** TypeScript 5.9 (strict, `noUnusedLocals`), Vite 8, Vitest 5, Three.js 0.186 (UI wiring only).

## Global Constraints

- SI units in all new modules, with `g = 9.81 m/s²` (`GRAVITY` in `src/wave/dispersion.ts`).
- Determinism: no `Math.random`. Everything random comes from the seeded PRNG in `SeaState.ts`.
- The legacy solver's dynamics must not change. Every existing test keeps passing unchanged (52 tests at plan time).
- **Scope change from the parent plan.** Removing `effectiveGravity` and the Wave speed slider, and the `legacy` flag, move to P2, where the new solver lands. Doing them in P1 would make the current wave about 6.3 m/s while the board is tuned for 3 m/s until P4.
- Readout copy uses the HUD's uppercase monospace style and names the theory ("AIRY") next to the legacy simulation value, so the gap is explicit.
- Run `npm test` and `npm run build` before each commit. Commit on branch `feat/wave-formation-p1-sea-state`; do not push.

---

### Task 1: Airy dispersion utilities

**Files:**
- Create: `src/wave/dispersion.ts`
- Test: `src/wave/dispersion.test.ts`

**Interfaces:**
- Produces:
  - `GRAVITY: number`
  - `waveNumber(omega, depth, g?): number` (Guo 2002 explicit)
  - `exactWaveNumber(omega, depth, g?): number`
  - `waveKinematics(period, depth, g?): WaveKinematics`
  - `depthClass(depth, wavelength): DepthClass`
  - Types: `WaveKinematics { k; wavelength; phaseSpeed; groupSpeed; kh }` and `DepthClass = 'deep' | 'transitional' | 'shallow'`
  - `depth` may be `Infinity` (deep water). It must be `> 0`.

- [ ] **Step 1: Write the failing test** — `src/wave/dispersion.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { GRAVITY, depthClass, exactWaveNumber, waveKinematics, waveNumber } from './dispersion';

describe('linear dispersion', () => {
  it('solves ω² = g k tanh(kh) exactly', () => {
    for (const period of [3, 8, 18]) {
      for (const depth of [0.4, 4, 40, 400]) {
        const omega = (2 * Math.PI) / period;
        const k = exactWaveNumber(omega, depth);
        expect(GRAVITY * k * Math.tanh(k * depth) / (omega * omega)).toBeCloseTo(1, 12);
      }
    }
  });

  it('keeps the explicit Guo wavenumber within 0.8 % of the exact root', () => {
    let worst = 0;
    for (let period = 2; period <= 25; period += 0.5) {
      for (const depth of [0.2, 0.5, 1, 2, 4, 8, 15, 30, 60, 200, 1000]) {
        const omega = (2 * Math.PI) / period;
        worst = Math.max(worst, Math.abs(waveNumber(omega, depth) / exactWaveNumber(omega, depth) - 1));
      }
    }
    expect(worst).toBeLessThan(0.008);
  });

  it('reduces to the deep- and shallow-water limits', () => {
    const deep = waveKinematics(8, Infinity);
    expect(deep.wavelength).toBeCloseTo((GRAVITY * 64) / (2 * Math.PI), 9);
    expect(deep.groupSpeed / deep.phaseSpeed).toBeCloseTo(0.5, 9);
    const shallow = waveKinematics(18, 0.5);
    expect(shallow.phaseSpeed / Math.sqrt(GRAVITY * 0.5)).toBeCloseTo(1, 2);
    expect(shallow.groupSpeed / shallow.phaseSpeed).toBeGreaterThan(0.99);
  });

  it('reproduces the plan reference values for an 8 s swell in 4 m of water', () => {
    const swell = waveKinematics(8, 4);
    expect(swell.wavelength).toBeCloseTo(48.0, 1);
    expect(swell.phaseSpeed).toBeCloseTo(6.0, 2);
    expect(swell.groupSpeed).toBeCloseTo(5.52, 2);
    expect(swell.kh).toBeCloseTo(0.52, 2);
  });

  it('classifies depth against half and one twentieth of a wavelength', () => {
    expect(depthClass(30, 50)).toBe('deep');
    expect(depthClass(4, 48)).toBe('transitional');
    expect(depthClass(1, 37.6)).toBe('shallow');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/dispersion.test.ts`
Expected: FAIL — cannot resolve `./dispersion`.

- [ ] **Step 3: Write minimal implementation** — `src/wave/dispersion.ts`

```ts
/** Linear (Airy) water-wave dispersion, ω² = g k tanh(kh), in SI units. */
export const GRAVITY = 9.81;

export type DepthClass = 'deep' | 'transitional' | 'shallow';

export interface WaveKinematics {
  k: number;
  wavelength: number;
  phaseSpeed: number;
  groupSpeed: number;
  kh: number;
}

/**
 * Explicit wavenumber from Guo (2002), exact in both limits and within 0.8 %
 * of the dispersion root at every depth. Cheap enough for per-cell use.
 * `depth` is still-water depth in metres; Infinity means deep water.
 */
export function waveNumber(omega: number, depth: number, g = GRAVITY): number {
  if (!(depth > 0)) throw new RangeError(`Water depth must be positive, got ${depth}`);
  const deep = (omega * omega) / g;
  if (!Number.isFinite(depth)) return deep;
  const x = deep * depth;
  const y = omega * Math.sqrt(depth / g);
  return (x * Math.pow(1 - Math.exp(-Math.pow(y, 2.5)), -0.4)) / depth;
}

/** Exact dispersion root by Newton iteration from the Guo estimate, for setup-time use. */
export function exactWaveNumber(omega: number, depth: number, g = GRAVITY): number {
  let k = waveNumber(omega, depth, g);
  if (!Number.isFinite(depth)) return k;
  for (let iteration = 0; iteration < 20; iteration += 1) {
    const tanh = Math.tanh(k * depth);
    const residual = g * k * tanh - omega * omega;
    const slope = g * tanh + g * k * depth * (1 - tanh * tanh);
    const next = k - residual / slope;
    if (Math.abs(next - k) <= 1e-15 * k) return next;
    k = next;
  }
  return k;
}

export function waveKinematics(period: number, depth: number, g = GRAVITY): WaveKinematics {
  const omega = (2 * Math.PI) / period;
  const k = exactWaveNumber(omega, depth, g);
  const kh = k * depth;
  const n = Number.isFinite(kh) ? 0.5 * (1 + (2 * kh) / Math.sinh(2 * kh)) : 0.5;
  const phaseSpeed = omega / k;
  return { k, wavelength: (2 * Math.PI) / k, phaseSpeed, groupSpeed: n * phaseSpeed, kh };
}

/** Passyworld/Sandwell classes: deep above L/2, shallow below L/20. */
export function depthClass(depth: number, wavelength: number): DepthClass {
  const ratio = depth / wavelength;
  if (ratio > 0.5) return 'deep';
  if (ratio < 1 / 20) return 'shallow';
  return 'transitional';
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/dispersion.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/dispersion.ts src/wave/dispersion.test.ts
git commit -m "feat: add Airy dispersion utilities"
```

---

### Task 2: Seeded JONSWAP sea state

**Files:**
- Create: `src/wave/SeaState.ts`
- Test: `src/wave/SeaState.test.ts`

**Interfaces:**
- Consumes: `exactWaveNumber(omega, depth)` from Task 1.
- Produces:
  - `JONSWAP_GAMMA = 3.3`
  - `jonswapShape(omega, peakOmega, gamma?): number` (unnormalized)
  - Types:
    - `WaveComponent { amplitude; omega; direction; phase }`. Direction is in radians from shore-normal +z, positive toward +x.
    - `ResolvedComponent extends WaveComponent { k; kx; kz }`
    - `SpectrumParams { significantHeight; peakPeriod; direction; spreading; componentCount; depth }`
  - `class SeaState`:
    - `constructor(components: readonly WaveComponent[], depth: number)`
    - `static fromSpectrum(params: SpectrumParams, seed: number): SeaState`
    - `readonly components: readonly ResolvedComponent[]`
    - `readonly depth: number`
    - `get significantHeight(): number`

- [ ] **Step 1: Write the failing test** — `src/wave/SeaState.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { SeaState, jonswapShape, type SpectrumParams } from './SeaState';

const swell: SpectrumParams = {
  significantHeight: 1.4, peakPeriod: 8, direction: 0, spreading: 10, componentCount: 24, depth: 15,
};

function spread(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return Math.sqrt(values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length);
}

describe('SeaState spectrum', () => {
  it('peaks the JONSWAP shape at the peak frequency', () => {
    const peak = (2 * Math.PI) / 8;
    expect(jonswapShape(peak, peak)).toBeGreaterThan(jonswapShape(peak * 0.97, peak));
    expect(jonswapShape(peak, peak)).toBeGreaterThan(jonswapShape(peak * 1.03, peak));
  });

  it('matches the requested significant wave height', () => {
    const sea = SeaState.fromSpectrum(swell, 1);
    expect(sea.components).toHaveLength(24);
    expect(sea.significantHeight).toBeCloseTo(1.4, 12);
  });

  it('orders component frequencies around the peak', () => {
    const omegas = SeaState.fromSpectrum(swell, 3).components.map((component) => component.omega);
    const peak = (2 * Math.PI) / 8;
    for (let index = 1; index < omegas.length; index += 1) expect(omegas[index]).toBeGreaterThan(omegas[index - 1]);
    const median = omegas[omegas.length / 2];
    expect(median).toBeGreaterThan(0.95 * peak);
    expect(median).toBeLessThan(1.3 * peak);
  });

  it('repeats a seed and draws new phases for a new seed', () => {
    const first = SeaState.fromSpectrum(swell, 42).components;
    const again = SeaState.fromSpectrum(swell, 42).components;
    const other = SeaState.fromSpectrum(swell, 43).components;
    expect(again).toEqual(first);
    expect(other.map((component) => component.phase)).not.toEqual(first.map((component) => component.phase));
  });

  it('keeps directions shoreward and narrows them with higher spreading', () => {
    const broad = SeaState.fromSpectrum({ ...swell, spreading: 2, componentCount: 64, direction: 0.3 }, 5).components;
    const narrow = SeaState.fromSpectrum({ ...swell, spreading: 40, componentCount: 64, direction: 0.3 }, 5).components;
    for (const component of [...broad, ...narrow]) {
      expect(Math.abs(component.direction - 0.3)).toBeLessThanOrEqual(Math.PI / 2 + 1e-12);
    }
    const narrowDirections = narrow.map((component) => component.direction);
    expect(spread(broad.map((component) => component.direction))).toBeGreaterThan(2 * spread(narrowDirections));
    expect(narrowDirections.reduce((sum, value) => sum + value, 0) / narrowDirections.length).toBeCloseTo(0.3, 1);
  });

  it('resolves each component wavenumber from the reference depth', () => {
    const sea = new SeaState([{ amplitude: 0.5, omega: (2 * Math.PI) / 8, direction: Math.PI / 6, phase: 0 }], 4);
    const [component] = sea.components;
    expect((2 * Math.PI) / component.k).toBeCloseTo(48.0, 1);
    expect(component.kx).toBeCloseTo(component.k * 0.5, 12);
    expect(component.kz).toBeCloseTo(component.k * Math.cos(Math.PI / 6), 12);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/SeaState.test.ts`
Expected: FAIL — cannot resolve `./SeaState`.

- [ ] **Step 3: Write minimal implementation** — `src/wave/SeaState.ts`

```ts
import { exactWaveNumber } from './dispersion';

export interface WaveComponent {
  /** Amplitude a, m. */
  amplitude: number;
  /** Angular frequency ω, rad/s. */
  omega: number;
  /** Travel direction, rad from shore-normal +z, positive toward +x. */
  direction: number;
  /** Phase φ, rad. */
  phase: number;
}

export interface ResolvedComponent extends WaveComponent {
  k: number;
  kx: number;
  kz: number;
}

export interface SpectrumParams {
  /** Hs = 4√m0, m. */
  significantHeight: number;
  /** Tp, s. */
  peakPeriod: number;
  /** Mean direction, rad from shore-normal +z. */
  direction: number;
  /** cos-2s exponent s; larger values give narrower, cleaner lines. */
  spreading: number;
  componentCount: number;
  /** Reference still-water depth for each wavenumber, m (Infinity = deep water). */
  depth: number;
}

export const JONSWAP_GAMMA = 3.3;

/** JONSWAP spectral shape without the α g² scale, which fromSpectrum normalizes to Hs. */
export function jonswapShape(omega: number, peakOmega: number, gamma = JONSWAP_GAMMA): number {
  if (!(omega > 0)) return 0;
  const sigma = omega <= peakOmega ? 0.07 : 0.09;
  const r = Math.exp(-((omega - peakOmega) ** 2) / (2 * sigma * sigma * peakOmega * peakOmega));
  return Math.pow(omega, -5) * Math.exp(-1.25 * Math.pow(peakOmega / omega, 4)) * Math.pow(gamma, r);
}

function seededRandom(seed: number): () => number {
  let value = (seed ^ 0x5eaa57a7) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Tabulated inverse CDF of `density` on [lo, hi] (trapezoid rule, linear inversion). */
function inverseCdf(lo: number, hi: number, samples: number, density: (x: number) => number): (u: number) => number {
  const xs = new Float64Array(samples);
  const cdf = new Float64Array(samples);
  const dx = (hi - lo) / (samples - 1);
  xs[0] = lo;
  let previous = density(lo);
  for (let index = 1; index < samples; index += 1) {
    xs[index] = lo + index * dx;
    const value = density(xs[index]);
    cdf[index] = cdf[index - 1] + 0.5 * (value + previous) * dx;
    previous = value;
  }
  const total = cdf[samples - 1];
  return (u: number) => {
    const target = Math.min(1, Math.max(0, u)) * total;
    let low = 0;
    let high = samples - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (cdf[middle] < target) low = middle;
      else high = middle;
    }
    const span = cdf[high] - cdf[low];
    const t = span > 0 ? (target - cdf[low]) / span : 0;
    return xs[low] + t * (xs[high] - xs[low]);
  };
}

/** A linear sea: a fixed set of seeded Airy components over a reference depth. */
export class SeaState {
  readonly components: readonly ResolvedComponent[];

  constructor(components: readonly WaveComponent[], readonly depth: number) {
    this.components = components.map((component) => {
      const k = exactWaveNumber(component.omega, depth);
      return { ...component, k, kx: k * Math.sin(component.direction), kz: k * Math.cos(component.direction) };
    });
  }

  /**
   * Split a JONSWAP spectrum into equal-energy frequency bins and draw each bin's
   * frequency, direction (cos-2s, clipped to shoreward travel), and phase from the
   * seed. Equal energy per component makes the realized Hs exact.
   */
  static fromSpectrum(params: SpectrumParams, seed: number): SeaState {
    const count = Math.max(1, Math.floor(params.componentCount));
    const peakOmega = (2 * Math.PI) / params.peakPeriod;
    const frequencyAt = inverseCdf(0.5 * peakOmega, 4 * peakOmega, 2048, (omega) => jonswapShape(omega, peakOmega));
    const halfWidth = Math.PI / 2;
    const s = Math.max(0, params.spreading);
    const directionAt = inverseCdf(-halfWidth, halfWidth, 721, (theta) => Math.pow(Math.cos(theta / 2), 2 * s));
    const amplitude = params.significantHeight / Math.sqrt(8 * count);
    const random = seededRandom(seed);
    const components: WaveComponent[] = [];
    for (let index = 0; index < count; index += 1) {
      const omega = frequencyAt((index + 0.25 + 0.5 * random()) / count);
      const direction = params.direction + directionAt(random());
      components.push({ amplitude, omega, direction, phase: 2 * Math.PI * random() });
    }
    return new SeaState(components, params.depth);
  }

  get significantHeight(): number {
    let m0 = 0;
    for (const component of this.components) m0 += 0.5 * component.amplitude * component.amplitude;
    return 4 * Math.sqrt(m0);
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/SeaState.test.ts`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/SeaState.ts src/wave/SeaState.test.ts
git commit -m "feat: add seeded JONSWAP sea state"
```

---

### Task 3: Analytic linear sampler

**Files:**
- Modify: `src/wave/SeaState.ts` (add two methods to `SeaState`)
- Test: `src/wave/SeaState.test.ts` (append a `describe` block)

**Interfaces:**
- Consumes: `SeaState`, `waveKinematics` (Task 1, in the test).
- Produces:
  - `SeaState.elevation(x, z, t): number` (m)
  - `SeaState.depthAveragedVelocity(x, z, t): { x: number; z: number }` (m/s; zero when the depth is not finite)

- [ ] **Step 1: Write the failing test** (append to `src/wave/SeaState.test.ts`, and add `import { waveKinematics } from './dispersion';` at the top)

```ts
describe('SeaState linear sampler', () => {
  it('moves a single component at the Airy phase speed', () => {
    const sea = new SeaState([{ amplitude: 0.5, omega: (2 * Math.PI) / 8, direction: 0, phase: 0.3 }], 4);
    const speed = waveKinematics(8, 4).phaseSpeed;
    expect(sea.elevation(1.2, 5 + speed * 3.7, 3.7)).toBeCloseTo(sea.elevation(1.2, 5, 0), 9);
    expect(sea.elevation(0, 0, 0)).toBeCloseTo(0.5 * Math.cos(0.3), 12);
  });

  it('satisfies linear continuity between elevation and depth-averaged flow', () => {
    const depth = 6;
    const sea = SeaState.fromSpectrum({ ...swell, depth, direction: 0.2 }, 9);
    const epsilon = 1e-3;
    for (const [x, z, t] of [[1.3, -4.2, 2.5], [-7, 11, 9.1], [3.3, 0.4, 17]]) {
      const etaRate = (sea.elevation(x, z, t + epsilon) - sea.elevation(x, z, t - epsilon)) / (2 * epsilon);
      const divergence = (sea.depthAveragedVelocity(x + epsilon, z, t).x - sea.depthAveragedVelocity(x - epsilon, z, t).x) / (2 * epsilon)
        + (sea.depthAveragedVelocity(x, z + epsilon, t).z - sea.depthAveragedVelocity(x, z - epsilon, t).z) / (2 * epsilon);
      expect(Math.abs(etaRate + depth * divergence)).toBeLessThan(1e-6);
    }
  });

  it('reports no depth-averaged flow for deep water', () => {
    const sea = new SeaState([{ amplitude: 0.5, omega: 1, direction: 0, phase: 0 }], Infinity);
    expect(sea.depthAveragedVelocity(0, 0, 0)).toEqual({ x: 0, z: 0 });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/SeaState.test.ts`
Expected: FAIL — `sea.elevation is not a function`.

- [ ] **Step 3: Write minimal implementation** (add inside `class SeaState`, after `fromSpectrum`)

```ts
  /** Linear surface elevation η(x, z, t) = Σ a cos(k·x − ωt + φ), m. */
  elevation(x: number, z: number, t: number): number {
    let eta = 0;
    for (const component of this.components) {
      eta += component.amplitude * Math.cos(component.kx * x + component.kz * z - component.omega * t + component.phase);
    }
    return eta;
  }

  /** Depth-averaged horizontal flow from linear continuity, ū = η ω / (k h) along each component, m/s. */
  depthAveragedVelocity(x: number, z: number, t: number): { x: number; z: number } {
    const flow = { x: 0, z: 0 };
    if (!Number.isFinite(this.depth)) return flow;
    for (const component of this.components) {
      const speed = (component.amplitude * component.omega) / (component.k * this.depth)
        * Math.cos(component.kx * x + component.kz * z - component.omega * t + component.phase);
      flow.x += speed * Math.sin(component.direction);
      flow.z += speed * Math.cos(component.direction);
    }
    return flow;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/SeaState.test.ts`
Expected: PASS (9 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/SeaState.ts src/wave/SeaState.test.ts
git commit -m "feat: sample linear sea-state elevation and flow"
```

---

### Task 4: Set envelope and next-set predictor

**Files:**
- Modify: `src/wave/SeaState.ts` (add two methods)
- Test: `src/wave/SeaState.test.ts` (append a `describe` block)

**Interfaces:**
- Produces:
  - `SeaState.envelope(x, z, t): number`, the group envelope |Σ a e^{iψ}| in m.
  - `SeaState.nextSetPeak(x, z, fromTime, horizon = 600, step = 0.25): number`. It returns the first envelope maximum at or after `fromTime` that reaches 90 % of the horizon's largest envelope, refined parabolically.

- [ ] **Step 1: Write the failing test** (append)

```ts
describe('SeaState sets', () => {
  it('spaces two-component sets by the Munk beat period', () => {
    const periods = [12.5, 13];
    const sea = new SeaState(periods.map((period) => ({
      amplitude: 0.5, omega: (2 * Math.PI) / period, direction: 0, phase: 0,
    })), 30);
    const beat = (periods[0] * periods[1]) / Math.abs(periods[1] - periods[0]);
    const first = sea.nextSetPeak(0, 0, 1, 700);
    const second = sea.nextSetPeak(0, 0, first + 10, 700);
    expect(beat).toBeCloseTo(325, 6);
    expect(first / beat).toBeCloseTo(1, 2);
    expect((second - first) / beat).toBeCloseTo(1, 2);
    expect(sea.envelope(0, 0, first)).toBeCloseTo(1, 3);
  });

  it('finds a large-envelope moment in a spectral sea', () => {
    const sea = SeaState.fromSpectrum({ ...swell, spreading: 24 }, 11);
    const peak = sea.nextSetPeak(0, 0, 20, 300);
    let largest = 0;
    for (let t = 20; t <= 320; t += 0.25) largest = Math.max(largest, sea.envelope(0, 0, t));
    expect(peak).toBeGreaterThanOrEqual(20);
    expect(sea.envelope(0, 0, peak)).toBeGreaterThanOrEqual(0.89 * largest);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/SeaState.test.ts`
Expected: FAIL — `sea.nextSetPeak is not a function`.

- [ ] **Step 3: Write minimal implementation** (add inside `class SeaState`)

```ts
  /** Wave-group envelope |Σ a e^{iψ}|; its slow beats are the sets, m. */
  envelope(x: number, z: number, t: number): number {
    let real = 0;
    let imaginary = 0;
    for (const component of this.components) {
      const psi = component.kx * x + component.kz * z - component.omega * t + component.phase;
      real += component.amplitude * Math.cos(psi);
      imaginary += component.amplitude * Math.sin(psi);
    }
    return Math.hypot(real, imaginary);
  }

  /** First set peak after `fromTime`: an envelope maximum within 90 % of the horizon's largest, s. */
  nextSetPeak(x: number, z: number, fromTime: number, horizon = 600, step = 0.25): number {
    const count = Math.max(3, Math.ceil(horizon / step) + 1);
    const values = new Float64Array(count);
    let largest = 0;
    let largestIndex = 0;
    for (let index = 0; index < count; index += 1) {
      values[index] = this.envelope(x, z, fromTime + index * step);
      if (values[index] > largest) {
        largest = values[index];
        largestIndex = index;
      }
    }
    for (let index = 1; index < count - 1; index += 1) {
      const value = values[index];
      if (value < 0.9 * largest || value < values[index - 1] || value < values[index + 1]) continue;
      const curvature = values[index - 1] - 2 * value + values[index + 1];
      const offset = curvature < 0 ? (0.5 * (values[index - 1] - values[index + 1])) / curvature : 0;
      return fromTime + (index + offset) * step;
    }
    return fromTime + largestIndex * step;
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/SeaState.test.ts`
Expected: PASS (11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/SeaState.ts src/wave/SeaState.test.ts
git commit -m "feat: predict sea-state sets from the group envelope"
```

---

### Task 5: Froude-consistent time-scale

**Files:**
- Create: `src/game/timeScale.ts`
- Test: `src/game/timeScale.test.ts`
- Modify: `src/main.ts` (settings, slider wiring, frame loop), `index.html` (slider), `src/game/RunHistory.ts` (settings type)

**Interfaces:**
- Produces:
  - `TIME_SCALE_MIN = 0.4`, `TIME_SCALE_MAX = 1`
  - `simulatedSeconds(wallSeconds, timeScale): number`
  - `TuningSettings.timeScale: number`, applied with Apply & Replay like every other setting

- [ ] **Step 1: Write the failing test** — `src/game/timeScale.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { TIME_SCALE_MAX, TIME_SCALE_MIN, simulatedSeconds } from './timeScale';

describe('simulatedSeconds', () => {
  it('slows simulated time uniformly', () => {
    expect(simulatedSeconds(0.1, 0.5)).toBeCloseTo(0.05, 12);
    expect(simulatedSeconds(0.1, 1)).toBeCloseTo(0.1, 12);
  });

  it('clamps the scale to the Wave Lab range and ignores bad input', () => {
    expect(simulatedSeconds(1, 0.1)).toBeCloseTo(TIME_SCALE_MIN, 12);
    expect(simulatedSeconds(1, 3)).toBeCloseTo(TIME_SCALE_MAX, 12);
    expect(simulatedSeconds(1, Number.NaN)).toBeCloseTo(TIME_SCALE_MAX, 12);
    expect(simulatedSeconds(-0.2, 0.5)).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/game/timeScale.test.ts`
Expected: FAIL — cannot resolve `./timeScale`.

- [ ] **Step 3: Write minimal implementation** — `src/game/timeScale.ts`

```ts
export const TIME_SCALE_MIN = 0.4;
export const TIME_SCALE_MAX = 1;

/**
 * Convert wall-clock seconds into simulated seconds. Slowing every subsystem by
 * the same factor is Froude-consistent slow motion: g and the fixed physics
 * step are unchanged, so replays stay deterministic.
 */
export function simulatedSeconds(wallSeconds: number, timeScale: number): number {
  const scale = Number.isFinite(timeScale)
    ? Math.min(TIME_SCALE_MAX, Math.max(TIME_SCALE_MIN, timeScale))
    : TIME_SCALE_MAX;
  return Math.max(0, wallSeconds) * scale;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/game/timeScale.test.ts`
Expected: PASS (2 tests).

- [ ] **Step 5: Wire the setting into the game**

In `index.html`, insert after the `#spot-select` row:

```html
          <label class="slider-row"><span>Time scale <output id="time-scale-output">1.00×</output></span><input id="time-scale-slider" type="range" min="0.4" max="1" step="0.05" value="1" /></label>
```

In `src/main.ts`:
- add `import { simulatedSeconds } from './game/timeScale';`
- change the interface to `interface TuningSettings extends WaveSettings, PhysicsSettings { sunHeight: number; sunDirection: number; timeScale: number }`
- add `timeScale: 1,` to `DEFAULT_SETTINGS`
- in `readDraftSettings()` add `timeScale: number('#time-scale-slider'),`
- add `'#time-scale-slider',` to the `sliders` array in `bindUi()`
- in `refreshTuningUi()` add:

```ts
    getElement<HTMLInputElement>('#time-scale-slider').value = String(values.timeScale);
    getElement<HTMLOutputElement>('#time-scale-output').value = `${values.timeScale.toFixed(2)}×`;
```

In `frame`, replace the accumulator line and the three visual updates that use `elapsed`:

```ts
    const simElapsed = simulatedSeconds(elapsed, this.activeSettings.timeScale);
    this.accumulator = Math.min(this.accumulator + simElapsed, this.fixedStep * 6);
```

```ts
    this.surfer.update(this.physics, this.lastPaddle, simElapsed);
```

```ts
    this.boardWake.update(this.physics, this.wave, simElapsed);
```

```ts
    this.cameraRig.update(this.physics, this.wave, simElapsed || this.fixedStep);
```

In `src/game/RunHistory.ts`, widen the settings type to `settings: WaveSettings & { paddleForce: number; boardResponse: number; sunHeight?: number; sunDirection?: number; timeScale?: number };`.

- [ ] **Step 6: Verify and commit**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

```bash
git add src/game/timeScale.ts src/game/timeScale.test.ts src/main.ts src/game/RunHistory.ts index.html
git commit -m "feat: add Froude-consistent time-scale to the Wave Lab"
```

---

### Task 6: Swell physics readout in the Wave Lab

**Files:**
- Create: `src/wave/SwellReadout.ts`, `src/ui/PhysicsReadoutPanel.ts`
- Test: `src/wave/SwellReadout.test.ts`
- Modify: `src/wave/WaveModel.ts` (add `maxBedSlope()`), `src/wave/WaveModel.test.ts` (append a test), `src/main.ts`, `index.html`, `src/style.css`

**Interfaces:**
- Consumes: `waveKinematics`, `depthClass`, `GRAVITY` (Task 1).
- Produces:
  - `BREAKER_INDEX = 0.78`
  - Types:
    - `BreakerType = 'spilling' | 'plunging' | 'surging' | 'none'`
    - `SwellConditions { height; period; depth; bedSlope }`
    - `SwellReadout { deepWavelength; wavelength; phaseSpeed; groupSpeed; depthRatio; depthClass; breakerDepth; breakerSpeed; iribarren; breakerType }`
    - `ReadoutRow { label: string; value: string }`
  - `describeSwell(conditions: SwellConditions): SwellReadout`
  - `formatSwellReadout(readout: SwellReadout, context: { depth: number; simSpeed: number }): ReadoutRow[]`
  - `InteractiveWaterField.maxBedSlope(): number`
  - `class PhysicsReadoutPanel { constructor(list: HTMLElement); render(rows: ReadoutRow[]): void }`

- [ ] **Step 1: Write the failing tests** — `src/wave/SwellReadout.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { describeSwell, formatSwellReadout } from './SwellReadout';

describe('describeSwell', () => {
  it('reports Airy values and the depth-limited break for a 1.4 m, 8 s wave', () => {
    const readout = describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.05 });
    expect(readout.deepWavelength).toBeCloseTo(99.9, 1);
    expect(readout.wavelength).toBeCloseTo(48.0, 1);
    expect(readout.phaseSpeed).toBeCloseTo(6.0, 2);
    expect(readout.groupSpeed).toBeCloseTo(5.52, 2);
    expect(readout.depthClass).toBe('transitional');
    expect(readout.breakerDepth).toBeCloseTo(1.28 * 1.4, 2);
    expect(readout.breakerSpeed).toBeCloseTo(4.2, 1);
    expect(readout.iribarren).toBeCloseTo(0.42, 2);
    expect(readout.breakerType).toBe('plunging');
  });

  it('classifies spilling, surging, and flat-bed conditions by the Iribarren number', () => {
    expect(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.02 }).breakerType).toBe('spilling');
    expect(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0.3 }).breakerType).toBe('surging');
    const flat = describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0 });
    expect(flat.breakerType).toBe('none');
    expect(flat.iribarren).toBe(0);
  });
});

describe('formatSwellReadout', () => {
  it('labels the theory and shows the legacy simulation speed beside it', () => {
    const rows = formatSwellReadout(describeSwell({ height: 1.4, period: 8, depth: 4, bedSlope: 0 }), { depth: 4, simSpeed: 3 });
    const value = (label: string) => rows.find((row) => row.label === label)?.value;
    expect(value('WAVE SPEED · AIRY')).toBe('6.0 m/s');
    expect(value('WAVE SPEED · SIM')).toBe('3.0 m/s');
    expect(value('WAVELENGTH AT 4.0 M')).toBe('48.0 m');
    expect(value('BREAKS IN DEPTH')).toBe('1.79 m');
    expect(value('IRIBARREN ξ')).toBe('FLAT BED');
  });
});
```

Append to `src/wave/WaveModel.test.ts` (inside the existing `describe('InteractiveWaterField', ...)`):

```ts
  it('reports the steepest shelf bed slope for the physics readout', () => {
    expect(new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, shelfStrength: 0 }).maxBedSlope()).toBe(0);
    const reef = new InteractiveWaterField(1, { ...DEFAULT_WAVE_SETTINGS, height: 2.2, shelfStrength: 0.65 });
    const analytic = (reef.meanDepth * 0.58 * 0.65 * 1.5) / 28;
    expect(reef.maxBedSlope() / analytic).toBeCloseTo(1, 2);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/SwellReadout.test.ts src/wave/WaveModel.test.ts`
Expected: FAIL — cannot resolve `./SwellReadout`; `maxBedSlope is not a function`.

- [ ] **Step 3: Write minimal implementation** — `src/wave/SwellReadout.ts`

```ts
import { GRAVITY, depthClass, waveKinematics, type DepthClass } from './dispersion';

/** McCowan depth-limited breaker index H_b/h_b; Sandwell's d_b = 1.28 H_b is 1/0.78. */
export const BREAKER_INDEX = 0.78;

export type BreakerType = 'spilling' | 'plunging' | 'surging' | 'none';

export interface SwellConditions {
  /** Breaking wave height, m. */
  height: number;
  /** Period, s. */
  period: number;
  /** Still-water depth where speed and wavelength are reported, m. */
  depth: number;
  /** Steepest bed slope tanβ; 0 means a flat bed. */
  bedSlope: number;
}

export interface SwellReadout {
  deepWavelength: number;
  wavelength: number;
  phaseSpeed: number;
  groupSpeed: number;
  depthRatio: number;
  depthClass: DepthClass;
  breakerDepth: number;
  breakerSpeed: number;
  iribarren: number;
  breakerType: BreakerType;
}

export interface ReadoutRow {
  label: string;
  value: string;
}

export function describeSwell({ height, period, depth, bedSlope }: SwellConditions): SwellReadout {
  const kinematics = waveKinematics(period, depth);
  const deepWavelength = (GRAVITY * period * period) / (2 * Math.PI);
  const breakerDepth = height / BREAKER_INDEX;
  const slope = Math.max(0, bedSlope);
  const iribarren = slope > 0 && height > 0 ? slope / Math.sqrt(height / deepWavelength) : 0;
  // Battjes breaker-point thresholds for ξ_b.
  const breakerType: BreakerType = iribarren <= 0 ? 'none'
    : iribarren < 0.4 ? 'spilling'
      : iribarren <= 2 ? 'plunging' : 'surging';
  return {
    deepWavelength,
    wavelength: kinematics.wavelength,
    phaseSpeed: kinematics.phaseSpeed,
    groupSpeed: kinematics.groupSpeed,
    depthRatio: depth / kinematics.wavelength,
    depthClass: depthClass(depth, kinematics.wavelength),
    breakerDepth,
    breakerSpeed: Math.sqrt(GRAVITY * breakerDepth),
    iribarren,
    breakerType,
  };
}

export function formatSwellReadout(readout: SwellReadout, context: { depth: number; simSpeed: number }): ReadoutRow[] {
  return [
    { label: 'DEEP-WATER WAVELENGTH', value: `${readout.deepWavelength.toFixed(0)} m` },
    { label: `WAVELENGTH AT ${context.depth.toFixed(1)} M`, value: `${readout.wavelength.toFixed(1)} m` },
    { label: 'WAVE SPEED · AIRY', value: `${readout.phaseSpeed.toFixed(1)} m/s` },
    { label: 'WAVE SPEED · SIM', value: `${context.simSpeed.toFixed(1)} m/s` },
    { label: 'GROUP SPEED', value: `${readout.groupSpeed.toFixed(1)} m/s` },
    { label: 'DEPTH CLASS', value: `${readout.depthClass.toUpperCase()} · h/L ${readout.depthRatio.toFixed(3)}` },
    { label: 'BREAKS IN DEPTH', value: `${readout.breakerDepth.toFixed(2)} m` },
    { label: 'BREAKER SPEED', value: `${readout.breakerSpeed.toFixed(1)} m/s` },
    {
      label: 'IRIBARREN ξ',
      value: readout.breakerType === 'none' ? 'FLAT BED' : `${readout.iribarren.toFixed(2)} · ${readout.breakerType.toUpperCase()}`,
    },
  ];
}
```

In `src/wave/WaveModel.ts`, add after `depthAt(...)`:

```ts
  /** Steepest still-water bed slope |∂h/∂z| across the shelf, for the physics readout. */
  maxBedSlope(): number {
    const step = 0.25;
    let steepest = 0;
    for (let z = -40; z < 60; z += step) {
      steepest = Math.max(steepest, Math.abs(this.depthAt(0, z + step) - this.depthAt(0, z)) / step);
    }
    return steepest;
  }
```

`src/ui/PhysicsReadoutPanel.ts`:

```ts
import type { ReadoutRow } from '../wave/SwellReadout';

export class PhysicsReadoutPanel {
  constructor(private readonly list: HTMLElement) {}

  render(rows: ReadoutRow[]): void {
    this.list.replaceChildren(...rows.map(({ label, value }) => {
      const row = document.createElement('div');
      const term = document.createElement('dt');
      const detail = document.createElement('dd');
      term.textContent = label;
      detail.textContent = value;
      row.append(term, detail);
      return row;
    }));
  }
}
```

In `index.html`, insert after the `run-history` `<details>` element:

```html
          <details class="run-history physics-readout" open><summary>PHYSICS READOUT · LINEAR WAVE THEORY</summary><dl id="physics-readout"></dl></details>
```

In `src/style.css`, add after the `.run-history li small` rule:

```css
.physics-readout dl { display: grid; gap: 5px; margin: 9px 0 0; }
.physics-readout dl div { display: flex; justify-content: space-between; gap: 12px; font: 9px/1.4 var(--mono); }
.physics-readout dt { color: #537472; }
.physics-readout dd { margin: 0; color: #183f42; text-align: right; }
```

In `src/main.ts`:
- add the imports `import { PhysicsReadoutPanel } from './ui/PhysicsReadoutPanel';` and `import { describeSwell, formatSwellReadout } from './wave/SwellReadout';`
- add a field `private readonly readoutPanel = new PhysicsReadoutPanel(getElement<HTMLElement>('#physics-readout'));`
- add this method:

```ts
  private renderPhysicsReadout(): void {
    const settings = this.activeSettings;
    const readout = describeSwell({
      height: settings.height, period: settings.period, depth: this.wave.meanDepth, bedSlope: this.wave.maxBedSlope(),
    });
    this.readoutPanel.render(formatSwellReadout(readout, { depth: this.wave.meanDepth, simSpeed: settings.speed }));
  }
```

- call `this.renderPhysicsReadout();` at the end of `bindUi()` and in `startRun()` right after `this.renderHistory();`

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/SwellReadout.test.ts src/wave/WaveModel.test.ts`
Expected: PASS.

- [ ] **Step 5: Verify, check the browser and commit**

Run: `npm test && npm run build`
Expected: all tests pass; build succeeds.

Browser: open the running dev server. The Wave Lab should show the PHYSICS READOUT list, and on Training Beach it should read `WAVE SPEED · AIRY 6.0 m/s` and `WAVELENGTH AT 4.0 M 48.0 m`, next to `WAVE SPEED · SIM 3.0 m/s`. Changing the spot to Windy Reef and applying should show a plunging Iribarren value. There should be no console errors.

```bash
git add src/wave/SwellReadout.ts src/wave/SwellReadout.test.ts src/ui/PhysicsReadoutPanel.ts src/wave/WaveModel.ts src/wave/WaveModel.test.ts src/main.ts index.html src/style.css
git commit -m "feat: show linear wave theory readouts in the Wave Lab"
```

---

### Task 7: Record P1 in the project docs

**Files:**
- Modify: `docs/research/wave-formation-plan.md` (§4.1 P1 row, plus a status note), `CONTEXT.md` (glossary), `ROADMAP.md` (new milestone)

- [ ] **Step 1: Update the plan.** In §4.1, change the P1 row's content to the delivered scope: dispersion, `SeaState` (JONSWAP, cos-2s, seeded components, linear sampler, set predictor), time-scale and readouts. Move "remove `effectiveGravity` and the speed slider; legacy flag" into the P2 row, and add one sentence explaining why (the legacy wave would jump to about 6.3 m/s before the P4 board retune).
- [ ] **Step 2: Update the glossary.** Add these `CONTEXT.md` entries under `## Simulation`, in the file's existing format:
  - **Sea state:** The spectral description of the swell at the spot (Hs, Tp, direction, spread, tide), represented as seeded linear components. *Avoid:* wave settings.
  - **Set:** A group of larger waves produced by interference of nearby periods, arriving at the group velocity. *Avoid:* wave series.
  - **Time-scale:** A uniform slow-motion factor on simulated time; gravity and the fixed physics step are unchanged. *Avoid:* slow gravity.
  - **Breaker type:** Spilling, plunging or surging, classified by the Iribarren number. *Avoid:* wave style.
- [ ] **Step 3: Update the roadmap.** Run `git log -1 -- ROADMAP.md`, check whether another tool has changed the file, and re-read it if so. Then insert the §4.3 milestone from the wave formation plan at the top of `ROADMAP.md`, with G1 `Done` and P1 `Done`.
- [ ] **Step 4: Commit**

```bash
git add docs/research/wave-formation-plan.md CONTEXT.md ROADMAP.md
git commit -m "docs: record P1 sea-state foundation and next milestone"
```
