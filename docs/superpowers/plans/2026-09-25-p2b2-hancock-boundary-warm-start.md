# P2b-2 MUSCL-Hancock Stepping, Sea-State Boundary, Warm Start and Set Timing

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Finish P2b of [the wave formation plan](../../research/wave-formation-plan.md).
- Get the solver step within the 4 ms worker budget.
- Drive the offshore relaxation zone from the seeded `SeaState`, using the solver's own dispersion so target and solution agree.
- Warm-start the domain from the linear sea, shoaled and refracted along each column.
- Time runs to the next set.

**Architecture:**
- The solver switches from SSP-RK2 to fused MUSCL-Hancock. One pass reconstructs MC-limited faces and applies the well-balanced Hancock predictor, then one Riemann-flux corrector pass runs per direction.
- `SeaStateBoundary` implements `RelaxationZone`. Spatial phases are precomputed per zone row and per column, so each step costs two multiply-adds per component per cell, and the sliding window stays correct.
- `warmStart()` applies straight-contour WKB per column (kx conserved, kz from local depth, amplitude from conserved cross-shore energy flux, capped at γh).
- `planSetRun()` picks warm-start, hand-over and set-peak times.

**Tech Stack:** TypeScript 5.9 strict, Vitest 5.

## Global Constraints

- All 93 existing tests keep passing, with their tolerances unchanged.
- Determinism: identical inputs give bit-identical states.
- Benchmarks run in bundled Node (`npx rolldown` plus `node`), because Vitest's transform distorts timings. They are recorded, not asserted.
- The stage 1 solver is non-dispersive, so the zone target uses `shallowWaterWaveNumber` (plan §1.7). Airy dispersion remains the far-field and stage 2 choice.
- No gameplay changes. Commit on `feat/wave-formation-p1-sea-state`; do not push.

---

### Task 1: Fused MUSCL-Hancock stepping

**Files:**
- Modify: `src/wave/ShallowWaterSolver.ts`. Remove the stage arrays, `computeRates`, `sweepLine` and the per-line face arrays. Add 16 per-cell face arrays (`xhW … zuN`), and the `advance`, `predictFaces`, `fluxAlongX` and `fluxAlongZ` methods below.

**Interfaces:** the public API is unchanged.

**Evidence** (spike, bundled Node, development machine; profiles from `node --cpu-prof`):

| Variant | 33.6k uniform | 36.2k stretched spot domain | 24.2k at 1.5 m |
|---|---:|---:|---:|
| SSP-RK2, typed-array sweeps (P2b-1) | 6.30 ms | 7.00 ms | 4.63 ms |
| MUSCL-Hancock, separate reconstruct and predict | 4.43 ms | 5.22 ms | 3.37 ms |
| **MUSCL-Hancock, fused reconstruct and predict** | **4.0–4.2 ms** | **4.05 ms** | **2.7–2.9 ms** |

Validation metrics are unchanged or better:

| Check | SSP-RK2 | MUSCL-Hancock |
|---|---|---|
| √(gh) speed | 1.0003 | 1.0000 |
| Reflection | 0.27 % | 0.15 % |
| Green's law (measured ÷ predicted) | 1.0011 | 0.9958 |
| Snell error | 0.14° | 0.11° |

The stretched grid reflects 1.5 % with speed 1.0001.

- [ ] **Step 1: Guard.** This is a refactor, so the existing solver and validation suites are the failing-first safety net. Run them before and after.
- [ ] **Step 2: Implement.** Replace the stepping methods with:

```ts
  /**
   * MUSCL-Hancock step: reconstruct faces once, advance them half a step with
   * each cell's own face fluxes (the Hancock predictor), then take one full
   * conservative step with Riemann fluxes of the predicted faces. One flux
   * evaluation per step instead of SSP-RK2's two.
   */
  private advance(dt: number): void {
    const { h, qx, qz, rateH, rateQx, rateQz } = this;
    this.predictFaces(0.5 * dt);
    rateH.fill(0);
    rateQx.fill(0);
    rateQz.fill(0);
    this.fluxAlongX();
    this.fluxAlongZ();
    for (let i = 0; i < h.length; i += 1) {
      h[i] = Math.max(0, h[i] + dt * rateH[i]);
      const wet = h[i] > this.dryDepth;
      qx[i] = wet ? qx[i] + dt * rateQx[i] : 0;
      qz[i] = wet ? qz[i] + dt * rateQz[i] : 0;
    }
    if (this.manning > 0) {
      const factor = dt * this.gravity * this.manning * this.manning;
      for (let i = 0; i < h.length; i += 1) {
        const depth = h[i];
        if (depth <= this.dryDepth) continue;
        const speed = Math.sqrt(qx[i] * qx[i] + qz[i] * qz[i]) / depth;
        // Semi-implicit Manning friction; depth^(4/3) = depth · ∛depth.
        const damping = 1 + (factor * speed) / (depth * Math.cbrt(depth));
        qx[i] /= damping;
        qz[i] /= damping;
      }
    }
  }

  /**
   * MC-limited faces of every cell along x and z (walls mirror, open edges extend
   * the cell), advanced half a step by the Hancock predictor in the same pass:
   * each cell's own face fluxes and the corrector's bed-slope source, so a lake
   * at rest predicts no change.
   */
  private predictFaces(half: number): void {
    const { nx, nz, h, qx, qz, bed, u, w, eta, dz, zGaps, dryDepth, gravity: g } = this;
    const { xhW, xhE, xetaW, xetaE, xuW, xuE, xwW, xwE, zhS, zhN, zetaS, zetaN, zwS, zwN, zuS, zuN } = this;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > dryDepth;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
      eta[i] = h[i] + bed[i];
    }
    const periodic = this.xBoundary === PERIODIC;
    const wallX = this.xBoundary === WALL;
    const invDx = 1 / this.dx;
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      const hasBelow = iz > 0;
      const hasAbove = iz < nz - 1;
      const backScale = hasBelow ? dz[iz] / zGaps[iz - 1] : 1;
      const forwardScale = hasAbove ? dz[iz] / zGaps[iz] : 1;
      const invDz = 1 / dz[iz];
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const hasLeft = ix > 0 || periodic;
        const hasRight = ix < nx - 1 || periodic;
        const left = ix > 0 ? i - 1 : row + nx - 1;
        const right = ix < nx - 1 ? i + 1 : row;
        const below = i - nx;
        const above = i + nx;
        const hi = h[i];
        const hL = hasLeft ? h[left] : hi;
        const hR = hasRight ? h[right] : hi;
        const hB = hasBelow ? h[below] : hi;
        const hA = hasAbove ? h[above] : hi;
        const ei = eta[i];
        if (hi <= 0 && hL <= 0 && hR <= 0 && hB <= 0 && hA <= 0) {
          xhW[i] = 0; xhE[i] = 0; xetaW[i] = ei; xetaE[i] = ei; xuW[i] = 0; xuE[i] = 0; xwW[i] = 0; xwE[i] = 0;
          zhS[i] = 0; zhN[i] = 0; zetaS[i] = ei; zetaN[i] = ei; zwS[i] = 0; zwN[i] = 0; zuS[i] = 0; zuN[i] = 0;
          continue;
        }
        const ui = u[i];
        const wi = w[i];
        // Along x: normal velocity u, tangential w.
        const shx = 0.5 * limited(hi - hL, hR - hi);
        const sex = 0.5 * limited(ei - (hasLeft ? eta[left] : ei), (hasRight ? eta[right] : ei) - ei);
        const sux = 0.5 * limited(ui - (hasLeft ? u[left] : wallX ? -ui : ui), (hasRight ? u[right] : wallX ? -ui : ui) - ui);
        const swx = 0.5 * limited(wi - (hasLeft ? w[left] : wi), (hasRight ? w[right] : wi) - wi);
        // Along z: normal velocity w, tangential u; walls at both ends.
        const shz = 0.5 * limited((hi - hB) * backScale, (hA - hi) * forwardScale);
        const sez = 0.5 * limited((ei - (hasBelow ? eta[below] : ei)) * backScale, ((hasAbove ? eta[above] : ei) - ei) * forwardScale);
        const swz = 0.5 * limited((wi - (hasBelow ? w[below] : -wi)) * backScale, ((hasAbove ? w[above] : -wi) - wi) * forwardScale);
        const suz = 0.5 * limited((ui - (hasBelow ? u[below] : ui)) * backScale, ((hasAbove ? u[above] : ui) - ui) * forwardScale);
        const westRaw = hi - shx;
        const eastRaw = hi + shx;
        const southRaw = hi - shz;
        const northRaw = hi + shz;
        const hW = westRaw > 0 ? westRaw : 0;
        const hE = eastRaw > 0 ? eastRaw : 0;
        const hS = southRaw > 0 ? southRaw : 0;
        const hN = northRaw > 0 ? northRaw : 0;
        const uW = ui - sux; const uE = ui + sux; const vW = wi - swx; const vE = wi + swx;
        const wS = wi - swz; const wN = wi + swz; const tS = ui - suz; const tN = ui + suz;
        const etaW = ei - sex; const etaE = ei + sex; const etaS = ei - sez; const etaN = ei + sez;
        // Hancock predictor.
        const massX = hE * uE - hW * uW;
        const massZ = hN * wN - hS * wS;
        const pressureX = hE * uE * uE + 0.5 * g * hE * hE - hW * uW * uW - 0.5 * g * hW * hW
          - g * 0.5 * (hW + hE) * ((etaW - hW) - (etaE - hE));
        const pressureZ = hN * wN * wN + 0.5 * g * hN * hN - hS * wS * wS - 0.5 * g * hS * hS
          - g * 0.5 * (hS + hN) * ((etaS - hS) - (etaN - hN));
        const shearX = hE * uE * vE - hW * uW * vW;
        const shearZ = hN * wN * tN - hS * wS * tS;
        const dH = -half * (massX * invDx + massZ * invDz);
        const dQx = -half * (pressureX * invDx + shearZ * invDz);
        const dQz = -half * (shearX * invDx + pressureZ * invDz);
        let depth = hW + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; xuW[i] = (hW * uW + dQx) * inverse; xwW[i] = (hW * vW + dQz) * inverse; }
        else { depth = depth > 0 ? depth : 0; xuW[i] = 0; xwW[i] = 0; }
        xetaW[i] = etaW + depth - hW; xhW[i] = depth;
        depth = hE + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; xuE[i] = (hE * uE + dQx) * inverse; xwE[i] = (hE * vE + dQz) * inverse; }
        else { depth = depth > 0 ? depth : 0; xuE[i] = 0; xwE[i] = 0; }
        xetaE[i] = etaE + depth - hE; xhE[i] = depth;
        depth = hS + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; zwS[i] = (hS * wS + dQz) * inverse; zuS[i] = (hS * tS + dQx) * inverse; }
        else { depth = depth > 0 ? depth : 0; zwS[i] = 0; zuS[i] = 0; }
        zetaS[i] = etaS + depth - hS; zhS[i] = depth;
        depth = hN + dH;
        if (depth > dryDepth) { const inverse = 1 / depth; zwN[i] = (hN * wN + dQz) * inverse; zuN[i] = (hN * tN + dQx) * inverse; }
        else { depth = depth > 0 ? depth : 0; zwN[i] = 0; zuN[i] = 0; }
        zetaN[i] = etaN + depth - hN; zhN[i] = depth;
      }
    }
  }

  /** Riemann fluxes and well-balanced sources across x faces, row by row. */
  private fluxAlongX(): void {
    const { nx, nz, rateH, rateQx, rateQz, flux, gravity: g } = this;
    const { xhW, xhE, xetaW, xetaE, xuW, xuE, xwW, xwE } = this;
    const periodic = this.xBoundary === PERIODIC;
    const wall = this.xBoundary === WALL;
    const invDx = 1 / this.dx;
    const interfaces = periodic ? nx : nx - 1;
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < interfaces; ix += 1) {
        const left = row + ix;
        const right = ix + 1 < nx ? left + 1 : row;
        if (xhE[left] <= 0 && xhW[right] <= 0) continue;
        interfaceFlux(xhE[left], xetaE[left], xuE[left], xwE[left], xhW[right], xetaW[right], xuW[right], xwW[right], g, flux);
        rateH[left] -= flux.mass * invDx;
        rateQx[left] -= (flux.normal + flux.leftCorrection) * invDx;
        rateQz[left] -= flux.tangent * invDx;
        rateH[right] += flux.mass * invDx;
        rateQx[right] += (flux.normal + flux.rightCorrection) * invDx;
        rateQz[right] += flux.tangent * invDx;
      }
      if (!periodic) {
        const first = row;
        if (xhW[first] > 0) {
          interfaceFlux(xhW[first], xetaW[first], wall ? -xuW[first] : xuW[first], xwW[first],
            xhW[first], xetaW[first], xuW[first], xwW[first], g, flux);
          rateH[first] += flux.mass * invDx;
          rateQx[first] += (flux.normal + flux.rightCorrection) * invDx;
          rateQz[first] += flux.tangent * invDx;
        }
        const last = row + nx - 1;
        if (xhE[last] > 0) {
          interfaceFlux(xhE[last], xetaE[last], xuE[last], xwE[last],
            xhE[last], xetaE[last], wall ? -xuE[last] : xuE[last], xwE[last], g, flux);
          rateH[last] -= flux.mass * invDx;
          rateQx[last] -= (flux.normal + flux.leftCorrection) * invDx;
          rateQz[last] -= flux.tangent * invDx;
        }
      }
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const depthSum = xhW[i] + xhE[i];
        if (depthSum <= 0) continue;
        rateQx[i] += g * 0.5 * depthSum * ((xetaW[i] - xhW[i]) - (xetaE[i] - xhE[i])) * invDx;
      }
    }
  }

  /** Riemann fluxes and well-balanced sources across z faces, with walls at both cross-shore ends. */
  private fluxAlongZ(): void {
    const { nx, nz, dz, rateH, rateQx, rateQz, flux, gravity: g } = this;
    const { zhS, zhN, zetaS, zetaN, zwS, zwN, zuS, zuN } = this;
    for (let iz = 0; iz < nz - 1; iz += 1) {
      const invLower = 1 / dz[iz];
      const invUpper = 1 / dz[iz + 1];
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const lower = row + ix;
        const upper = lower + nx;
        if (zhN[lower] <= 0 && zhS[upper] <= 0) continue;
        interfaceFlux(zhN[lower], zetaN[lower], zwN[lower], zuN[lower], zhS[upper], zetaS[upper], zwS[upper], zuS[upper], g, flux);
        rateH[lower] -= flux.mass * invLower;
        rateQz[lower] -= (flux.normal + flux.leftCorrection) * invLower;
        rateQx[lower] -= flux.tangent * invLower;
        rateH[upper] += flux.mass * invUpper;
        rateQz[upper] += (flux.normal + flux.rightCorrection) * invUpper;
        rateQx[upper] += flux.tangent * invUpper;
      }
    }
    const invFirst = 1 / dz[0];
    const invLast = 1 / dz[nz - 1];
    const lastRow = (nz - 1) * nx;
    for (let ix = 0; ix < nx; ix += 1) {
      const south = ix;
      if (zhS[south] > 0) {
        interfaceFlux(zhS[south], zetaS[south], -zwS[south], zuS[south], zhS[south], zetaS[south], zwS[south], zuS[south], g, flux);
        rateH[south] += flux.mass * invFirst;
        rateQz[south] += (flux.normal + flux.rightCorrection) * invFirst;
        rateQx[south] += flux.tangent * invFirst;
      }
      const north = lastRow + ix;
      if (zhN[north] > 0) {
        interfaceFlux(zhN[north], zetaN[north], zwN[north], zuN[north], zhN[north], zetaN[north], -zwN[north], zuN[north], g, flux);
        rateH[north] -= flux.mass * invLast;
        rateQz[north] -= (flux.normal + flux.leftCorrection) * invLast;
        rateQx[north] -= flux.tangent * invLast;
      }
    }
    for (let iz = 0; iz < nz; iz += 1) {
      const inverse = 1 / dz[iz];
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        const i = row + ix;
        const depthSum = zhS[i] + zhN[i];
        if (depthSum <= 0) continue;
        rateQz[i] += g * 0.5 * depthSum * ((zetaS[i] - zhS[i]) - (zetaN[i] - zhN[i])) * inverse;
      }
    }
  }
```

- [ ] **Step 3: Verify.** Run `npm test && npm run build`. Expected: 93 tests pass.
- [ ] **Step 4: Commit.** `git commit -m "perf: step the shallow-water solver with fused MUSCL-Hancock"`

---

### Task 2: Sea-state relaxation boundary

**Files:**
- Modify: `src/wave/dispersion.ts` (add `shallowWaterWaveNumber` and `WaveNumberFunction`), `src/wave/SeaState.ts` (optional wavenumber function), `src/wave/ShallowWaterSolver.ts` (`RelaxationZone.target` receives the cell index; `restLevel` becomes public)
- Create: `src/wave/SeaStateBoundary.ts`
- Test: `src/wave/SeaState.test.ts` (append), `src/wave/SeaStateBoundary.test.ts`

**Interfaces:**
- Produces:
  - `type WaveNumberFunction = (omega: number, depth: number) => number`
  - `shallowWaterWaveNumber(omega, depth, g?)`
  - `new SeaState(components, depth, waveNumberAt?)`, `SeaState.fromSpectrum(params, seed, waveNumberAt?)`, `SeaState.waveNumberAt`
  - `RelaxationZone.target(x, z, t, out, index)`
  - `ShallowWaterSolver.restLevel` (public, readonly)
  - `class SeaStateBoundary implements RelaxationZone { constructor(grid: ZoneGrid, sea: SeaState, weights: Float64Array, timeOffset = 0) }`
  - `interface ZoneGrid { nx; nz; xCenters; zCenters }`

- [ ] **Step 1: Write the failing tests**

Append to `src/wave/SeaState.test.ts`, and add `shallowWaterWaveNumber` to the dispersion import:

```ts
describe('SeaState dispersion choice', () => {
  it('uses the stage 1 solver-consistent shallow-water dispersion when asked', () => {
    const omega = (2 * Math.PI) / 8;
    const shallow = new SeaState([{ amplitude: 0.3, omega, direction: 0, phase: 0 }], 4, shallowWaterWaveNumber);
    const airy = new SeaState([{ amplitude: 0.3, omega, direction: 0, phase: 0 }], 4);
    expect(omega / shallow.components[0].k).toBeCloseTo(Math.sqrt(9.81 * 4), 12);
    expect((2 * Math.PI) / airy.components[0].k).toBeCloseTo(48.0, 1);
    expect(SeaState.fromSpectrum({ ...swell, depth: 6 }, 2, shallowWaterWaveNumber).waveNumberAt).toBe(shallowWaterWaveNumber);
  });
});
```

`src/wave/SeaStateBoundary.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { shallowWaterWaveNumber } from './dispersion';
import { SeaState } from './SeaState';
import { SeaStateBoundary } from './SeaStateBoundary';
import { ShallowWaterSolver, uniformEdges, type WaterTarget } from './ShallowWaterSolver';

const spectrum = { significantHeight: 1, peakPeriod: 9, direction: 0.25, spreading: 8, componentCount: 16, depth: 8 };

function linearFlux(sea: SeaState, x: number, z: number, t: number): { qx: number; qz: number } {
  let qx = 0;
  let qz = 0;
  for (const c of sea.components) {
    const eta = c.amplitude * Math.cos(c.kx * x + c.kz * z - c.omega * t + c.phase);
    const speed = c.omega / c.k;
    qx += speed * Math.sin(c.direction) * eta;
    qz += speed * Math.cos(c.direction) * eta;
  }
  return { qx, qz };
}

describe('SeaStateBoundary', () => {
  it('matches the linear sea in every zone cell, also after the window slides', () => {
    const solver = new ShallowWaterSolver(
      { nx: 20, xMin: -50, dx: 5, zEdges: uniformEdges(-200, 0, 40), xBoundary: 'open' }, () => 8,
    );
    const sea = SeaState.fromSpectrum(spectrum, 4, shallowWaterWaveNumber);
    const weights = solver.zoneWeightsAlongZ(-160, -200);
    const boundary = new SeaStateBoundary(solver, sea, weights, 37);
    const out: WaterTarget = { eta: 0, qx: 0, qz: 0 };
    const check = (t: number) => {
      let checked = 0;
      for (let i = 0; i < weights.length; i += 1) {
        if (weights[i] <= 0) continue;
        const x = solver.xCenters[i % solver.nx];
        const z = solver.zCenters[Math.floor(i / solver.nx)];
        boundary.target(x, z, t, out, i);
        const flux = linearFlux(sea, x, z, t + 37);
        expect(out.eta).toBeCloseTo(sea.elevation(x, z, t + 37), 9);
        expect(out.qx).toBeCloseTo(flux.qx, 9);
        expect(out.qz).toBeCloseTo(flux.qz, 9);
        checked += 1;
      }
      expect(checked).toBeGreaterThan(100);
    };
    check(3.25);
    solver.shiftAlongShore(3);
    check(5.5);
  });

  it('generates the linear sea state inside a flat channel', () => {
    const depth = 6;
    const solver = new ShallowWaterSolver(
      { nx: 100, xMin: -100, dx: 2, zEdges: uniformEdges(0, 400, 200), xBoundary: 'open' }, () => depth, { manning: 0 },
    );
    const sea = SeaState.fromSpectrum({ ...spectrum, significantHeight: 0.6, peakPeriod: 10, spreading: 24, depth }, 7, shallowWaterWaveNumber);
    solver.addRelaxationZone(new SeaStateBoundary(solver, sea, solver.zoneWeightsAlongZ(80, 0)));
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(320, 400), target: (_x, _z, _t, out) => { out.eta = 0; out.qx = 0; out.qz = 0; } });
    const gauges = [-30, -15, 0, 15, 30].map((x) => ({ x, index: solver.cellIndex(x, 131) }));
    let simulated = 0;
    let linear = 0;
    while (solver.time < 200) {
      solver.step(0.1);
      if (solver.time < 80) continue;
      for (const gauge of gauges) {
        simulated += solver.surfaceAt(gauge.index) ** 2;
        linear += sea.elevation(solver.xCenters[gauge.index % solver.nx], 131, solver.time) ** 2;
      }
    }
    expect(Math.sqrt(simulated / linear)).toBeGreaterThan(0.9);
    expect(Math.sqrt(simulated / linear)).toBeLessThan(1.1);
  }, 60_000);
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/SeaState.test.ts src/wave/SeaStateBoundary.test.ts`
Expected: FAIL — `shallowWaterWaveNumber` is not exported, and `./SeaStateBoundary` cannot be resolved.

- [ ] **Step 3: Implement**

Append to `src/wave/dispersion.ts`:

```ts
export type WaveNumberFunction = (omega: number, depth: number) => number;

/** Non-dispersive shallow-water wavenumber k = ω/√(gh), consistent with the stage 1 solver. */
export function shallowWaterWaveNumber(omega: number, depth: number, g = GRAVITY): number {
  if (!(depth > 0) || !Number.isFinite(depth)) throw new RangeError(`Shallow-water waves need a finite positive depth, got ${depth}`);
  return omega / Math.sqrt(g * depth);
}
```

In `src/wave/SeaState.ts`:
- change the import to `import { exactWaveNumber, type WaveNumberFunction } from './dispersion';`
- change the constructor to `constructor(components: readonly WaveComponent[], readonly depth: number, readonly waveNumberAt: WaveNumberFunction = exactWaveNumber)` and use `const k = waveNumberAt(component.omega, depth);`
- change `fromSpectrum(params: SpectrumParams, seed: number)` to `fromSpectrum(params: SpectrumParams, seed: number, waveNumberAt: WaveNumberFunction = exactWaveNumber)`, ending with `return new SeaState(components, params.depth, waveNumberAt);`

In `src/wave/ShallowWaterSolver.ts`:
- change `target(x: number, z: number, t: number, out: WaterTarget): void;` to `target(x: number, z: number, t: number, out: WaterTarget, index: number): void;`
- in `relax()` call `zone.target(this.xCenters[ix], this.zCenters[iz], this.time, this.target, i);`
- change `protected readonly restLevel: number;` to `readonly restLevel: number;`

`src/wave/SeaStateBoundary.ts`:

```ts
import type { SeaState } from './SeaState';
import type { RelaxationZone, WaterTarget } from './ShallowWaterSolver';

export interface ZoneGrid {
  readonly nx: number;
  readonly nz: number;
  readonly xCenters: ArrayLike<number>;
  readonly zCenters: ArrayLike<number>;
}

/**
 * Relaxation target reproducing a linear sea state inside a solver zone, with
 * the linear flux q = c η along each component. Each component's phase splits
 * into an along-shore part (per column, refreshed when the window slides) and
 * a cross-shore part (per zone row, refreshed per time), so a cell costs two
 * multiply-adds per component per step.
 */
export class SeaStateBoundary implements RelaxationZone {
  private readonly count: number;
  private readonly firstRow: number;
  private readonly rows: number;
  private readonly amplitude: Float64Array;
  private readonly kx: Float64Array;
  private readonly omega: Float64Array;
  private readonly speedX: Float64Array;
  private readonly speedZ: Float64Array;
  private readonly rowPhase: Float64Array;
  private readonly columnCos: Float64Array;
  private readonly columnSin: Float64Array;
  private readonly rowCos: Float64Array;
  private readonly rowSin: Float64Array;
  private cachedTime = Number.NaN;
  private cachedFirstX = Number.NaN;

  constructor(
    private readonly grid: ZoneGrid,
    readonly sea: SeaState,
    readonly weights: Float64Array,
    readonly timeOffset = 0,
  ) {
    const components = sea.components;
    this.count = components.length;
    let first = grid.nz;
    let last = -1;
    for (let iz = 0; iz < grid.nz; iz += 1) {
      for (let ix = 0; ix < grid.nx; ix += 1) {
        if (weights[iz * grid.nx + ix] <= 0) continue;
        first = Math.min(first, iz);
        last = Math.max(last, iz);
      }
    }
    this.firstRow = first;
    this.rows = Math.max(0, last - first + 1);
    const perComponent = () => new Float64Array(this.count);
    this.amplitude = perComponent(); this.kx = perComponent(); this.omega = perComponent();
    this.speedX = perComponent(); this.speedZ = perComponent();
    this.rowPhase = new Float64Array(this.rows * this.count);
    this.rowCos = new Float64Array(this.rows * this.count);
    this.rowSin = new Float64Array(this.rows * this.count);
    this.columnCos = new Float64Array(grid.nx * this.count);
    this.columnSin = new Float64Array(grid.nx * this.count);
    components.forEach((component, c) => {
      const speed = component.omega / component.k;
      this.amplitude[c] = component.amplitude;
      this.kx[c] = component.kx;
      this.omega[c] = component.omega;
      this.speedX[c] = speed * Math.sin(component.direction);
      this.speedZ[c] = speed * Math.cos(component.direction);
      for (let r = 0; r < this.rows; r += 1) {
        this.rowPhase[r * this.count + c] = component.kz * grid.zCenters[this.firstRow + r] + component.phase;
      }
    });
  }

  target(x: number, z: number, t: number, out: WaterTarget, index = -1): void {
    const row = index >= 0 ? Math.floor(index / this.grid.nx) - this.firstRow : -1;
    if (row < 0 || row >= this.rows) {
      this.direct(x, z, t, out);
      return;
    }
    this.refresh(t);
    const column = (index % this.grid.nx) * this.count;
    const rowBase = row * this.count;
    let eta = 0;
    let qx = 0;
    let qz = 0;
    for (let c = 0; c < this.count; c += 1) {
      // cos(kx·x + (kz·z + φ − ωt)) from the column and row factors.
      const value = this.amplitude[c] * (this.columnCos[column + c] * this.rowCos[rowBase + c] - this.columnSin[column + c] * this.rowSin[rowBase + c]);
      eta += value;
      qx += this.speedX[c] * value;
      qz += this.speedZ[c] * value;
    }
    out.eta = eta;
    out.qx = qx;
    out.qz = qz;
  }

  private refresh(t: number): void {
    const firstX = this.grid.xCenters[0];
    if (firstX !== this.cachedFirstX) {
      for (let ix = 0; ix < this.grid.nx; ix += 1) {
        const x = this.grid.xCenters[ix];
        for (let c = 0; c < this.count; c += 1) {
          this.columnCos[ix * this.count + c] = Math.cos(this.kx[c] * x);
          this.columnSin[ix * this.count + c] = Math.sin(this.kx[c] * x);
        }
      }
      this.cachedFirstX = firstX;
    }
    if (t !== this.cachedTime) {
      const seaTime = t + this.timeOffset;
      for (let r = 0; r < this.rows; r += 1) {
        for (let c = 0; c < this.count; c += 1) {
          const phase = this.rowPhase[r * this.count + c] - this.omega[c] * seaTime;
          this.rowCos[r * this.count + c] = Math.cos(phase);
          this.rowSin[r * this.count + c] = Math.sin(phase);
        }
      }
      this.cachedTime = t;
    }
  }

  private direct(x: number, z: number, t: number, out: WaterTarget): void {
    let eta = 0;
    let qx = 0;
    let qz = 0;
    const seaTime = t + this.timeOffset;
    this.sea.components.forEach((component, c) => {
      const value = component.amplitude * Math.cos(component.kx * x + component.kz * z - component.omega * seaTime + component.phase);
      eta += value;
      qx += this.speedX[c] * value;
      qz += this.speedZ[c] * value;
    });
    out.eta = eta;
    out.qx = qx;
    out.qz = qz;
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/SeaState.test.ts src/wave/SeaStateBoundary.test.ts && npx tsc -b`
Expected: PASS, with no type errors.

- [ ] **Step 5: Commit**

```bash
git add src/wave/dispersion.ts src/wave/SeaState.ts src/wave/SeaState.test.ts src/wave/ShallowWaterSolver.ts src/wave/SeaStateBoundary.ts src/wave/SeaStateBoundary.test.ts
git commit -m "feat: drive the solver boundary from the seeded sea state"
```

---

### Task 3: Column WKB warm start and set timing

**Files:**
- Create: `src/wave/warmStart.ts`
- Test: `src/wave/warmStart.test.ts`

**Interfaces:**
- Consumes: `SeaState` (with `waveNumberAt`), `ShallowWaterSolver` (`h`, `qx`, `qz`, `bed`, `restLevel`, `xCenters`, `zCenters`, `nx`, `nz`).
- Produces:
  - `warmStart(solver, sea, { referenceZ, seaTime, breakerIndex? }): void`
  - `planSetRun(sea, x, referenceZ, fromSeaTime, lead, spinUp, horizon?)`, returning `{ warmStartSeaTime, handOverSeaTime, setPeakSeaTime }`

- [ ] **Step 1: Write the failing tests** — `src/wave/warmStart.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { shallowWaterWaveNumber } from './dispersion';
import { SeaState } from './SeaState';
import { SeaStateBoundary } from './SeaStateBoundary';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';
import { planSetRun, warmStart } from './warmStart';

const slope = (_x: number, z: number) => (z < 0 ? 8 : 8 - 0.02 * z);

describe('warmStart', () => {
  it('reproduces the analytic sea exactly over a flat bed', () => {
    const solver = new ShallowWaterSolver({ nx: 16, xMin: -40, dx: 5, zEdges: uniformEdges(-100, 100, 40), xBoundary: 'open' }, () => 8);
    const sea = SeaState.fromSpectrum(
      { significantHeight: 1, peakPeriod: 9, direction: 0.2, spreading: 10, componentCount: 12, depth: 8 }, 3, shallowWaterWaveNumber,
    );
    warmStart(solver, sea, { referenceZ: -100, seaTime: 12 });
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        expect(solver.surfaceAt(i)).toBeCloseTo(sea.elevation(solver.xCenters[ix], solver.zCenters[iz], 12), 9);
      }
    }
  });

  it("shoals by Green's law and caps the height at the breaker index", () => {
    const solver = new ShallowWaterSolver({ nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-50, 395, 445), xBoundary: 'open' }, slope);
    const amplitude = 0.2;
    const sea = new SeaState([{ amplitude, omega: (2 * Math.PI) / 12, direction: 0, phase: 0 }], 8, shallowWaterWaveNumber);
    const twoMetres = solver.cellIndex(0.5, 300.5);
    const thirtyCentimetres = solver.cellIndex(0.5, 385.5);
    let shoaled = 0;
    let capped = 0;
    for (let k = 0; k < 24; k += 1) {
      warmStart(solver, sea, { referenceZ: -50, seaTime: k * 0.5 });
      shoaled = Math.max(shoaled, Math.abs(solver.surfaceAt(twoMetres)));
      capped = Math.max(capped, Math.abs(solver.surfaceAt(thirtyCentimetres)));
    }
    const depthThere = 8 - 0.02 * 300.5;
    expect(shoaled / (amplitude * Math.pow(8 / depthThere, 0.25))).toBeCloseTo(1, 1);
    const depthCap = 8 - 0.02 * 385.5;
    expect(capped).toBeLessThanOrEqual((0.78 * depthCap * Math.SQRT2) / 4 + 1e-9);
  });

  it('starts close to a solution so the spin-up stays calm', () => {
    const solver = new ShallowWaterSolver({ nx: 40, xMin: -80, dx: 4, zEdges: uniformEdges(-100, 380, 240), xBoundary: 'open' }, slope);
    const sea = new SeaState([{ amplitude: 0.25, omega: (2 * Math.PI) / 10, direction: 0.3, phase: 0.4 }], 8, shallowWaterWaveNumber);
    warmStart(solver, sea, { referenceZ: -60, seaTime: 40 });
    solver.addRelaxationZone(new SeaStateBoundary(solver, sea, solver.zoneWeightsAlongZ(-60, -100), 40));
    let initial = 0;
    for (let i = 0; i < solver.h.length; i += 1) if (solver.h[i] > 0.5) initial = Math.max(initial, Math.abs(solver.surfaceAt(i)));
    let largest = 0;
    while (solver.time < 20) {
      solver.step(1 / 20);
      for (let i = 0; i < solver.h.length; i += 1) if (solver.h[i] > 0.5) largest = Math.max(largest, Math.abs(solver.surfaceAt(i)));
    }
    expect(largest).toBeLessThan(1.3 * initial);
  }, 30_000);
});

describe('planSetRun', () => {
  it('hands over a fixed lead before the next set peak, after the spin-up', () => {
    const sea = new SeaState([12, 14].map((period) => ({ amplitude: 0.4, omega: (2 * Math.PI) / period, direction: 0, phase: 0 })), 10);
    const plan = planSetRun(sea, 0, -60, 5, 20, 24);
    expect(plan.setPeakSeaTime - plan.handOverSeaTime).toBeCloseTo(20, 12);
    expect(plan.handOverSeaTime - plan.warmStartSeaTime).toBeCloseTo(24, 12);
    expect(plan.warmStartSeaTime).toBeGreaterThanOrEqual(5);
    expect(sea.envelope(0, -60, plan.setPeakSeaTime)).toBeGreaterThan(0.75);
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/warmStart.test.ts`
Expected: FAIL — cannot resolve `./warmStart`.

- [ ] **Step 3: Implement** — `src/wave/warmStart.ts`

```ts
import type { SeaState } from './SeaState';
import type { ShallowWaterSolver } from './ShallowWaterSolver';

export interface WarmStartOptions {
  /** Cross-shore line where the sea state is specified (the relaxation zone's inner edge), m. */
  referenceZ: number;
  /** Sea time the solver state should represent, s. */
  seaTime: number;
  /** Depth-limited cap on local Hs as a fraction of depth (McCowan γ). */
  breakerIndex?: number;
}

const MIN_DEPTH = 0.05;

/**
 * Fill the solver with the linear sea shoaled and refracted along each column.
 * Contours are treated as straight within a column (WKB): kx is conserved, kz
 * comes from the local depth with the sea's own dispersion, and amplitude
 * follows conserved cross-shore energy flux, a² c_g cosθ = const. Local Hs is
 * capped at γh, so the spin-up only has to settle the nonlinear shape.
 */
export function warmStart(solver: ShallowWaterSolver, sea: SeaState, options: WarmStartOptions): void {
  const { referenceZ, seaTime } = options;
  const gamma = options.breakerIndex ?? 0.78;
  const components = sea.components;
  const count = components.length;
  const referenceFlux = components.map((c) => groupSpeed(sea, c.omega, sea.depth) * (c.kz / c.k));
  const phase = new Float64Array(count);
  const alive = new Uint8Array(count);
  const amplitude = new Float64Array(count);
  const kxOverK = new Float64Array(count);
  const kzOverK = new Float64Array(count);
  const speed = new Float64Array(count);
  const { nx, nz } = solver;
  for (let ix = 0; ix < nx; ix += 1) {
    const x = solver.xCenters[ix];
    let previousZ = referenceZ;
    let previousKz = components.map((c) => c.kz);
    for (let c = 0; c < count; c += 1) {
      phase[c] = components[c].kx * x + components[c].kz * referenceZ + components[c].phase;
      alive[c] = 1;
    }
    for (let iz = 0; iz < nz; iz += 1) {
      const i = iz * nx + ix;
      const z = solver.zCenters[iz];
      const depth = solver.restLevel - solver.bed[i];
      let hs = 0;
      const localKz = new Array<number>(count);
      for (let c = 0; c < count; c += 1) {
        const component = components[c];
        if (z <= referenceZ) {
          // Offshore of the reference line the bed matches the sea's reference depth.
          amplitude[c] = component.amplitude;
          kxOverK[c] = component.kx / component.k;
          kzOverK[c] = component.kz / component.k;
          speed[c] = component.omega / component.k;
          localKz[c] = component.kz;
          continue;
        }
        if (!alive[c] || depth <= MIN_DEPTH) { alive[c] = 0; amplitude[c] = 0; localKz[c] = 0; continue; }
        const k = sea.waveNumberAt(component.omega, depth);
        if (k <= Math.abs(component.kx)) { alive[c] = 0; amplitude[c] = 0; localKz[c] = 0; continue; }
        const kz = Math.sqrt(k * k - component.kx * component.kx);
        localKz[c] = kz;
        phase[c] += 0.5 * (previousKz[c] + kz) * (z - previousZ);
        const flux = groupSpeed(sea, component.omega, depth) * (kz / k);
        amplitude[c] = component.amplitude * Math.sqrt(referenceFlux[c] / flux);
        kxOverK[c] = component.kx / k;
        kzOverK[c] = kz / k;
        speed[c] = component.omega / k;
        hs += 0.5 * amplitude[c] * amplitude[c];
      }
      if (z > referenceZ) {
        previousZ = z;
        previousKz = localKz;
      }
      hs = 4 * Math.sqrt(hs);
      const scale = depth > MIN_DEPTH && hs > gamma * depth ? (gamma * depth) / hs : 1;
      let eta = 0;
      let qx = 0;
      let qz = 0;
      for (let c = 0; c < count; c += 1) {
        if (amplitude[c] === 0) continue;
        const psi = z <= referenceZ
          ? components[c].kx * x + components[c].kz * z + components[c].phase - components[c].omega * seaTime
          : phase[c] - components[c].omega * seaTime;
        const value = scale * amplitude[c] * Math.cos(psi);
        eta += value;
        qx += speed[c] * kxOverK[c] * value;
        qz += speed[c] * kzOverK[c] * value;
      }
      const total = Math.max(0, solver.restLevel + eta - solver.bed[i]);
      const wet = total > 1e-4;
      solver.h[i] = total;
      solver.qx[i] = wet ? qx : 0;
      solver.qz[i] = wet ? qz : 0;
    }
  }
}

/** Group speed dω/dk for the sea's dispersion, by central difference. */
function groupSpeed(sea: SeaState, omega: number, depth: number): number {
  const step = omega * 1e-4;
  return (2 * step) / (sea.waveNumberAt(omega + step, depth) - sea.waveNumberAt(omega - step, depth));
}

export interface SetRunPlan {
  warmStartSeaTime: number;
  handOverSeaTime: number;
  setPeakSeaTime: number;
}

/**
 * Pick sea times so the player takes control `lead` seconds before the next
 * set peaks at (x, referenceZ), after a `spinUp` of simulated settling.
 */
export function planSetRun(
  sea: SeaState, x: number, referenceZ: number, fromSeaTime: number, lead: number, spinUp: number, horizon = 600,
): SetRunPlan {
  const setPeakSeaTime = sea.nextSetPeak(x, referenceZ, fromSeaTime + lead + spinUp, horizon);
  const handOverSeaTime = setPeakSeaTime - lead;
  return { warmStartSeaTime: handOverSeaTime - spinUp, handOverSeaTime, setPeakSeaTime };
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/warmStart.test.ts && npx tsc -b`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wave/warmStart.ts src/wave/warmStart.test.ts
git commit -m "feat: warm-start the solver from the shoaled sea and plan set runs"
```

---

### Task 4: Record P2b

- [ ] Update `docs/research/wave-formation-plan.md` §3.3: stage 1 now measures 4.05 ms per step on the 36.2k-cell stretched spot domain (bundled Node). Mark P2b done in `ROADMAP.md`, with the measured numbers. Leave P2c (game integration) as next.
- [ ] Commit: `git add docs/research/wave-formation-plan.md ROADMAP.md docs/superpowers/plans/2026-09-25-p2b2-hancock-boundary-warm-start.md && git commit -m "docs: record P2b solver budget, sea-state boundary and warm start"`
