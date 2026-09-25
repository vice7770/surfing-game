# P2a Bathymetry and Finite-Volume Solver Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and validate stage 1 of the surf-zone physics from [the wave formation plan](../../research/wave-formation-plan.md) §1.4–1.7. It has two parts: composable 2D seabeds for the four spots, and a well-balanced, positivity-preserving finite-volume nonlinear shallow-water solver with wet/dry cells and relaxation zones. The solver is standalone; P2b adds the sea-state boundaries and sliding window, and P2c wires it into the game.

**Architecture:**
- `src/wave/Bathymetry.ts` exposes `createSpot(name, seed)`, which returns pure depth functions.
- `src/wave/ShallowWaterSolver.ts` implements MUSCL reconstruction (MC limiter) of h, η and velocities, the hydrostatic reconstruction of Audusse et al. (2004), HLL fluxes with dry-front speeds, and SSP-RK2 time stepping. It also has semi-implicit Manning friction and Jacobsen relaxation zones.
- A single 1D line routine handles x rows (uniform spacing) and z columns (spacing may vary, ready for the stretched grid).
- Validation tests check the solver against analytic physics: lake at rest, conservation, the Stoker dam break, √(gh) phase speed, relaxation reflection, Green's-law shoaling and Snell refraction.

**Tech Stack:** TypeScript 5.9 strict, Vitest 5. No new dependencies.

## Global Constraints

- SI units, with `GRAVITY` from `src/wave/dispersion.ts`. Coordinates: +x along shore, +z toward the beach, z = 0 is the shoreline at x = 0 (the Point headland moves it offshore). Depth is positive below datum and negative on dry land. Bed elevation is `b = −depth` and the free surface is `η = h + b`.
- Determinism: seeded randomness only via `src/wave/random.ts`.
- The legacy `InteractiveWaterField` and all gameplay stay untouched, and all 74 existing tests keep passing.
- The solver is stage 1 (non-dispersive). Tests compare it against shallow-water theory (√(gh)), not Airy, per plan §1.7.
- Run `npm test` and `npm run build` before each commit. Commit on branch `feat/wave-formation-p1-sea-state` (it continues P1's unpushed branch); do not push.

---

### Task 1: Seeded random stream and composable spot bathymetry

**Files:**
- Create: `src/wave/random.ts`, `src/wave/Bathymetry.ts`
- Modify: `src/wave/SeaState.ts` (use `seededRandom`)
- Test: `src/wave/Bathymetry.test.ts`

**Interfaces:**
- Produces:
  - `seededRandom(seed: number, salt?: number): () => number`
  - `smoothstep(edge0, edge1, value): number`
  - `deanDepth(offshore, a?, maxDepth?, landSlope?): number`
  - `type SpotName = 'beach' | 'point' | 'reef' | 'canyon'`
  - `interface SurfSpot { readonly name: SpotName; depthAt(x: number, z: number): number }`
  - `createSpot(name: SpotName, seed: number): SurfSpot`
  - Design constants: `BEACH_BAR`, `POINT_HEADLAND`, `REEF`, `CANYON`

- [ ] **Step 1: Write the failing test** — `src/wave/Bathymetry.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { BEACH_BAR, CANYON, POINT_HEADLAND, REEF, createSpot, deanDepth, type SurfSpot } from './Bathymetry';

/** Offshore bed slope: depth increase per metre toward −z. */
function slopeZ(spot: SurfSpot, x: number, z: number, step = 0.5): number {
  return (spot.depthAt(x, z - step) - spot.depthAt(x, z + step)) / (2 * step);
}

function gradientX(spot: SurfSpot, x: number, z: number, step = 0.5): number {
  return (spot.depthAt(x + step, z) - spot.depthAt(x - step, z)) / (2 * step);
}

describe('surf spot bathymetry', () => {
  it('shapes the beach as a Dean profile with the design slope where a 1.4 m wave breaks', () => {
    const beach = createSpot('beach', 1);
    let ripX = 0;
    let deepest = -Infinity;
    for (let x = -200; x <= 200; x += 1) {
      const depth = beach.depthAt(x, -BEACH_BAR.offshore);
      if (depth > deepest) {
        deepest = depth;
        ripX = x;
      }
    }
    expect(deanDepth(58)).toBeCloseTo(1.8, 1);
    expect(slopeZ(beach, ripX, -58)).toBeCloseTo(0.0207, 3);
  });

  it('builds a sandbar between rip channels that move with the seed', () => {
    const beach = createSpot('beach', 1);
    const other = createSpot('beach', 2);
    const crest = -BEACH_BAR.offshore;
    const depths: number[] = [];
    let seedsDiffer = false;
    for (let x = -200; x <= 200; x += 1) {
      depths.push(beach.depthAt(x, crest));
      if (Math.abs(other.depthAt(x, crest) - beach.depthAt(x, crest)) > 0.3) seedsDiffer = true;
    }
    expect(Math.max(...depths) - Math.min(...depths)).toBeGreaterThan(0.8);
    expect(seedsDiffer).toBe(true);
    expect(createSpot('beach', 1).depthAt(37, crest)).toBe(beach.depthAt(37, crest));
  });

  it('angles the point contours about 31 degrees to the coast on the headland flank', () => {
    const point = createSpot('point', 1);
    const z = -POINT_HEADLAND.protrusion / 2 - 60;
    const angle = (Math.atan2(Math.abs(gradientX(point, 0, z)), Math.abs(slopeZ(point, 0, z))) * 180) / Math.PI;
    expect(angle).toBeGreaterThan(28);
    expect(angle).toBeLessThan(34);
  });

  it('raises the reef shelf steeply enough to plunge', () => {
    const reef = createSpot('reef', 1);
    const x = REEF.halfWidth + 50;
    let steepest = 0;
    for (let z = -260; z <= -40; z += 0.5) steepest = Math.max(steepest, slopeZ(reef, x, z));
    expect(steepest).toBeGreaterThan(0.1);
    expect(steepest).toBeLessThan(0.2);
    expect(reef.depthAt(x, REEF.edge + REEF.edgeWidth)).toBeCloseTo(REEF.shelfDepth, 1);
    expect(reef.depthAt(x, REEF.edge - REEF.edgeWidth)).toBeCloseTo(REEF.channelDepth, 1);
  });

  it('cuts a canyon that is far deeper on its axis and fades before the offshore boundary', () => {
    const canyon = createSpot('canyon', 1);
    expect(canyon.depthAt(CANYON.axisX, -200) - canyon.depthAt(CANYON.axisX + 120, -200)).toBeGreaterThan(8);
    expect(Math.abs(canyon.depthAt(CANYON.axisX, -340) - canyon.depthAt(CANYON.axisX + 120, -340))).toBeLessThan(0.05);
  });

  it('puts dry land shoreward of every shoreline and stays finite', () => {
    for (const name of ['beach', 'point', 'reef', 'canyon'] as const) {
      const spot = createSpot(name, 3);
      for (let x = -300; x <= 300; x += 25) {
        expect(spot.depthAt(x, 20)).toBeLessThan(0);
        for (let z = -400; z <= 30; z += 10) expect(Number.isFinite(spot.depthAt(x, z))).toBe(true);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/Bathymetry.test.ts`
Expected: FAIL — cannot resolve `./Bathymetry`.

- [ ] **Step 3: Write minimal implementation**

`src/wave/random.ts`:

```ts
/** Deterministic mulberry32 stream; `salt` separates independent streams drawn from one seed. */
export function seededRandom(seed: number, salt = 0): () => number {
  let value = (seed ^ salt) >>> 0;
  return () => {
    value = (value + 0x6d2b79f5) >>> 0;
    let t = value;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

In `src/wave/SeaState.ts`, delete the private `seededRandom` function, add `import { seededRandom } from './random';`, and change the call in `fromSpectrum` to `const random = seededRandom(seed, 0x5eaa57a7);`. The stream is unchanged.

`src/wave/Bathymetry.ts`:

```ts
import { seededRandom } from './random';

export type SpotName = 'beach' | 'point' | 'reef' | 'canyon';

/**
 * Still-water depth below datum, m; negative on dry land. +x runs along shore,
 * +z toward the beach, and z = 0 is the shoreline at x = 0.
 */
export interface SurfSpot {
  readonly name: SpotName;
  depthAt(x: number, z: number): number;
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = Math.min(1, Math.max(0, (value - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}

/** Dean (1991) equilibrium profile h = A s^(2/3) at offshore distance s, capped, with a planar foreshore on land. */
export function deanDepth(offshore: number, a = 0.12, maxDepth = 12, landSlope = 0.06): number {
  if (offshore <= 0) return offshore * landSlope;
  return Math.min(maxDepth, a * Math.pow(offshore, 2 / 3));
}

export const BEACH_BAR = { offshore: 90, height: 0.9, width: 18, ripSpacing: 110, ripWidth: 22, ripJitter: 25 };
export const POINT_HEADLAND = { center: 0, halfWidth: 150, protrusion: 120, slope: 0.04, maxDepth: 12 };
export const REEF = { edge: -150, apexX: 0, protrusion: 100, halfWidth: 250, edgeWidth: 80, shelfDepth: 2, channelDepth: 10 };
export const CANYON = { axisX: 0, halfWidth: 30, depth: 14, head: 60, fullAt: 160, fadeStart: 260, fadeEnd: 320 };

function beach(seed: number): SurfSpot {
  const random = seededRandom(seed, 0xbeac4);
  const rips: number[] = [];
  for (let k = -8; k <= 8; k += 1) rips.push(k * BEACH_BAR.ripSpacing + (random() * 2 - 1) * BEACH_BAR.ripJitter);
  return {
    name: 'beach',
    depthAt(x, z) {
      const offshore = -z;
      let gap = 0;
      for (const rip of rips) gap = Math.max(gap, Math.exp(-(((x - rip) / BEACH_BAR.ripWidth) ** 2)));
      const bar = BEACH_BAR.height * Math.exp(-(((offshore - BEACH_BAR.offshore) / BEACH_BAR.width) ** 2)) * (1 - gap);
      return deanDepth(offshore) - bar;
    },
  };
}

function point(): SurfSpot {
  const { center, halfWidth, protrusion, slope, maxDepth } = POINT_HEADLAND;
  return {
    name: 'point',
    depthAt(x, z) {
      // The shoreline steps offshore across the headland; its flank sets the contour angle.
      const shoreline = -protrusion * smoothstep(center + halfWidth, center - halfWidth, x);
      const offshore = shoreline - z;
      return offshore <= 0 ? offshore * 0.06 : Math.min(maxDepth, slope * offshore);
    },
  };
}

function reef(): SurfSpot {
  return {
    name: 'reef',
    depthAt(x, z) {
      const edgeZ = REEF.edge - REEF.protrusion * Math.max(0, 1 - Math.abs(x - REEF.apexX) / REEF.halfWidth);
      const beachDepth = deanDepth(-z);
      const onReef = smoothstep(edgeZ - REEF.edgeWidth / 2, edgeZ + REEF.edgeWidth / 2, z);
      const channel = Math.max(beachDepth, REEF.channelDepth);
      const shelf = Math.min(beachDepth, REEF.shelfDepth);
      return channel + (shelf - channel) * onReef;
    },
  };
}

function canyon(): SurfSpot {
  return {
    name: 'canyon',
    depthAt(x, z) {
      const offshore = -z;
      const along = smoothstep(CANYON.head, CANYON.fullAt, offshore) * (1 - smoothstep(CANYON.fadeStart, CANYON.fadeEnd, offshore));
      return deanDepth(offshore) + CANYON.depth * Math.exp(-(((x - CANYON.axisX) / CANYON.halfWidth) ** 2)) * along;
    },
  };
}

export function createSpot(name: SpotName, seed: number): SurfSpot {
  switch (name) {
    case 'beach': return beach(seed);
    case 'point': return point();
    case 'reef': return reef();
    case 'canyon': return canyon();
  }
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/wave/SeaState.test.ts`
Expected: PASS (6 + 11 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/random.ts src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts src/wave/SeaState.ts
git commit -m "feat: add composable surf-spot bathymetry"
```

---

### Task 2: Well-balanced finite-volume shallow-water core

**Files:**
- Create: `src/wave/ShallowWaterSolver.ts`
- Test: `src/wave/ShallowWaterSolver.test.ts`

**Interfaces:**
- Consumes: `GRAVITY` (dispersion.ts); `createSpot` (Task 1, in the test).
- Produces:
  - `type DepthFunction = (x: number, z: number) => number`
  - `interface SolverGrid { nx; xMin; dx; zEdges: ArrayLike<number>; periodicX? }`
  - `interface SolverOptions { gravity?; manning?; dryDepth?; courant?; waterLevel? }`
  - `uniformEdges(start, end, count): Float64Array`
  - `class ShallowWaterSolver`, with:
    - `constructor(grid, depthAt, options?)`
    - fields `nx`, `nz`, `dx`, `xCenters`, `zCenters`, `dz`, `bed`, `h`, `qx`, `qz`, `time`
    - `step(dt)`, `maxStableStep()`, `totalVolume()`, `totalEnergy()`, `surfaceAt(index)`, `cellIndex(x, z)`

- [ ] **Step 1: Write the failing test** — `src/wave/ShallowWaterSolver.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { createSpot } from './Bathymetry';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';

// Stoker's wet-bed dam break for 2.0 m → 0.5 m (computed by bisection on the Riemann invariants).
const STOKER = { left: 2, right: 0.5, middle: 1.1035, shockSpeed: 4.1663, tailSpeed: -1.0116 };

describe('ShallowWaterSolver', () => {
  it('keeps a lake at rest over every spot, including its dry shoreline', () => {
    for (const name of ['beach', 'point', 'reef', 'canyon'] as const) {
      const spot = createSpot(name, 1);
      const solver = new ShallowWaterSolver(
        { nx: 40, xMin: -80, dx: 4, zEdges: uniformEdges(-300, 30, 110) }, spot.depthAt, { waterLevel: 0.3 },
      );
      const initialDepth = Float64Array.from(solver.h);
      for (let frame = 0; frame < 120; frame += 1) solver.step(1 / 15);
      let largestFlow = 0;
      let depthChange = 0;
      let dryCells = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
        // Dry cells may pick up round-off films (~1e-24 m), so compare depths, not surfaces.
        depthChange = Math.max(depthChange, Math.abs(solver.h[i] - initialDepth[i]));
        if (initialDepth[i] === 0) dryCells += 1;
      }
      expect(dryCells).toBeGreaterThan(0);
      expect(largestFlow).toBeLessThan(1e-9);
      expect(depthChange).toBeLessThan(1e-9);
    }
  });

  it('conserves volume, stays positive and loses energy while a hump sloshes in a closed basin', () => {
    const solver = new ShallowWaterSolver({ nx: 40, xMin: -40, dx: 2, zEdges: uniformEdges(-40, 40, 40) }, () => 2);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const r2 = solver.xCenters[ix] ** 2 + solver.zCenters[iz] ** 2;
        solver.h[iz * solver.nx + ix] = 2 + 0.4 * Math.exp(-r2 / 60);
      }
    }
    const volume = solver.totalVolume();
    const energy = solver.totalEnergy();
    let shallowest = Infinity;
    for (let frame = 0; frame < 300; frame += 1) {
      solver.step(1 / 30);
      for (const depth of solver.h) shallowest = Math.min(shallowest, depth);
    }
    expect(solver.totalVolume() / volume).toBeCloseTo(1, 12);
    expect(shallowest).toBeGreaterThan(0);
    expect(solver.totalEnergy()).toBeLessThan(energy);
  });

  it('matches the Stoker dam-break solution on a wet bed', () => {
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-50, 50, 400), periodicX: true }, () => 1, { manning: 0 },
    );
    for (let iz = 0; iz < solver.nz; iz += 1) {
      const depth = solver.zCenters[iz] < 0 ? STOKER.left : STOKER.right;
      for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] = depth;
    }
    const duration = 3;
    while (solver.time < duration - 1e-9) solver.step(Math.min(0.02, duration - solver.time));
    const plateauZ = 0.5 * (STOKER.tailSpeed + STOKER.shockSpeed) * duration;
    expect(solver.h[solver.cellIndex(0.5, plateauZ)] / STOKER.middle).toBeCloseTo(1, 1);
    let shockZ = -Infinity;
    for (let iz = solver.nz - 1; iz >= 0; iz -= 1) {
      if (solver.h[iz * solver.nx] > 0.5 * (STOKER.middle + STOKER.right)) {
        shockZ = solver.zCenters[iz];
        break;
      }
    }
    expect(Math.abs(shockZ - STOKER.shockSpeed * duration)).toBeLessThan(0.75);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts`
Expected: FAIL — cannot resolve `./ShallowWaterSolver`.

- [ ] **Step 3: Write minimal implementation** — `src/wave/ShallowWaterSolver.ts`

```ts
import { GRAVITY } from './dispersion';

export type DepthFunction = (x: number, z: number) => number;

export interface SolverGrid {
  nx: number;
  xMin: number;
  dx: number;
  /** nz + 1 increasing cell-edge positions along z (shoreward), m; spacing may vary. */
  zEdges: ArrayLike<number>;
  /** Wrap the along-shore boundaries (true) or treat them as walls (default). */
  periodicX?: boolean;
}

export interface SolverOptions {
  gravity?: number;
  /** Manning bottom roughness n, s/m^(1/3). */
  manning?: number;
  /** Depth at or below which a cell carries no momentum, m. */
  dryDepth?: number;
  courant?: number;
  /** Initial still-water level above datum (tide), m. */
  waterLevel?: number;
}

export function uniformEdges(start: number, end: number, count: number): Float64Array {
  const edges = new Float64Array(count + 1);
  for (let i = 0; i <= count; i += 1) edges[i] = start + ((end - start) * i) / count;
  return edges;
}

interface Flux {
  mass: number;
  normal: number;
  tangent: number;
  leftCorrection: number;
  rightCorrection: number;
}

/** Scratch arrays for one row or column of cells. */
class Line {
  readonly h: Float64Array;
  readonly eta: Float64Array;
  readonly un: Float64Array;
  readonly ut: Float64Array;
  readonly width: Float64Array;
  /** gap[j]: distance between centres j and j + 1 (the last entry closes a periodic line). */
  readonly gap: Float64Array;
  readonly hW: Float64Array;
  readonly hE: Float64Array;
  readonly etaW: Float64Array;
  readonly etaE: Float64Array;
  readonly unW: Float64Array;
  readonly unE: Float64Array;
  readonly utW: Float64Array;
  readonly utE: Float64Array;
  readonly rh: Float64Array;
  readonly rn: Float64Array;
  readonly rt: Float64Array;

  constructor(size: number) {
    const make = () => new Float64Array(size);
    this.h = make(); this.eta = make(); this.un = make(); this.ut = make();
    this.width = make(); this.gap = make();
    this.hW = make(); this.hE = make(); this.etaW = make(); this.etaE = make();
    this.unW = make(); this.unE = make(); this.utW = make(); this.utE = make();
    this.rh = make(); this.rn = make(); this.rt = make();
  }
}

/** Monotonized-central limited slope from backward and forward differences. */
function limited(back: number, forward: number): number {
  if (back * forward <= 0) return 0;
  const magnitude = Math.min(Math.abs(0.5 * (back + forward)), 2 * Math.abs(back), 2 * Math.abs(forward));
  return back > 0 ? magnitude : -magnitude;
}

/**
 * HLL flux with the hydrostatic reconstruction of Audusse et al. (2004): both
 * sides are lowered onto the higher bed, and the pressure lost in doing so is
 * returned to each cell as a correction. This keeps a lake at rest exactly at
 * rest over any bed, and dry cells positive.
 */
function interfaceFlux(
  hL: number, etaL: number, uL: number, vL: number,
  hR: number, etaR: number, uR: number, vR: number,
  g: number, out: Flux,
): void {
  const bedStar = Math.max(etaL - hL, etaR - hR);
  const hLs = Math.max(0, etaL - bedStar);
  const hRs = Math.max(0, etaR - bedStar);
  out.leftCorrection = 0.5 * g * (hL * hL - hLs * hLs);
  out.rightCorrection = 0.5 * g * (hR * hR - hRs * hRs);
  if (hLs <= 0 && hRs <= 0) {
    out.mass = 0; out.normal = 0; out.tangent = 0;
    return;
  }
  const cL = Math.sqrt(g * hLs);
  const cR = Math.sqrt(g * hRs);
  let sL: number;
  let sR: number;
  if (hLs <= 0) { sL = uR - 2 * cR; sR = uR + cR; }
  else if (hRs <= 0) { sL = uL - cL; sR = uL + 2 * cL; }
  else { sL = Math.min(uL - cL, uR - cR); sR = Math.max(uL + cL, uR + cR); }
  const massL = hLs * uL;
  const massR = hRs * uR;
  const normalL = massL * uL + 0.5 * g * hLs * hLs;
  const normalR = massR * uR + 0.5 * g * hRs * hRs;
  const tangentL = massL * vL;
  const tangentR = massR * vR;
  if (sL >= 0) { out.mass = massL; out.normal = normalL; out.tangent = tangentL; return; }
  if (sR <= 0) { out.mass = massR; out.normal = normalR; out.tangent = tangentR; return; }
  const inverse = 1 / (sR - sL);
  out.mass = (sR * massL - sL * massR + sL * sR * (hRs - hLs)) * inverse;
  out.normal = (sR * normalL - sL * normalR + sL * sR * (massR - massL)) * inverse;
  out.tangent = (sR * tangentL - sL * tangentR + sL * sR * (hRs * vR - hLs * vL)) * inverse;
}

/** Second-order fluxes and well-balanced sources along one line of cells (wall or periodic ends). */
function solveLine(line: Line, n: number, periodic: boolean, g: number, flux: Flux): void {
  const { h, eta, un, ut, width, gap, hW, hE, etaW, etaE, unW, unE, utW, utE, rh, rn, rt } = line;
  for (let j = 0; j < n; j += 1) {
    const hasPrevious = j > 0 || periodic;
    const hasNext = j < n - 1 || periodic;
    const previous = j > 0 ? j - 1 : n - 1;
    const next = j < n - 1 ? j + 1 : 0;
    // Walls mirror the cell: same depth and surface, reversed normal velocity.
    const backScale = width[j] / (j > 0 ? gap[j - 1] : periodic ? gap[n - 1] : width[j]);
    const forwardScale = width[j] / (j < n - 1 ? gap[j] : periodic ? gap[n - 1] : width[j]);
    const hPrevious = hasPrevious ? h[previous] : h[j];
    const hNext = hasNext ? h[next] : h[j];
    const etaPrevious = hasPrevious ? eta[previous] : eta[j];
    const etaNext = hasNext ? eta[next] : eta[j];
    const unPrevious = hasPrevious ? un[previous] : -un[j];
    const unNext = hasNext ? un[next] : -un[j];
    const utPrevious = hasPrevious ? ut[previous] : ut[j];
    const utNext = hasNext ? ut[next] : ut[j];
    const sh = 0.5 * limited((h[j] - hPrevious) * backScale, (hNext - h[j]) * forwardScale);
    const se = 0.5 * limited((eta[j] - etaPrevious) * backScale, (etaNext - eta[j]) * forwardScale);
    const su = 0.5 * limited((un[j] - unPrevious) * backScale, (unNext - un[j]) * forwardScale);
    const sv = 0.5 * limited((ut[j] - utPrevious) * backScale, (utNext - ut[j]) * forwardScale);
    hW[j] = Math.max(0, h[j] - sh);
    hE[j] = Math.max(0, h[j] + sh);
    etaW[j] = eta[j] - se;
    etaE[j] = eta[j] + se;
    unW[j] = un[j] - su;
    unE[j] = un[j] + su;
    utW[j] = ut[j] - sv;
    utE[j] = ut[j] + sv;
    rh[j] = 0;
    rn[j] = 0;
    rt[j] = 0;
  }
  const interfaces = periodic ? n : n - 1;
  for (let j = 0; j < interfaces; j += 1) {
    const k = j + 1 < n ? j + 1 : 0;
    interfaceFlux(hE[j], etaE[j], unE[j], utE[j], hW[k], etaW[k], unW[k], utW[k], g, flux);
    rh[j] -= flux.mass / width[j];
    rn[j] -= (flux.normal + flux.leftCorrection) / width[j];
    rt[j] -= flux.tangent / width[j];
    rh[k] += flux.mass / width[k];
    rn[k] += (flux.normal + flux.rightCorrection) / width[k];
    rt[k] += flux.tangent / width[k];
  }
  if (!periodic) {
    interfaceFlux(hW[0], etaW[0], -unW[0], utW[0], hW[0], etaW[0], unW[0], utW[0], g, flux);
    rh[0] += flux.mass / width[0];
    rn[0] += (flux.normal + flux.rightCorrection) / width[0];
    rt[0] += flux.tangent / width[0];
    const last = n - 1;
    interfaceFlux(hE[last], etaE[last], unE[last], utE[last], hE[last], etaE[last], -unE[last], utE[last], g, flux);
    rh[last] -= flux.mass / width[last];
    rn[last] -= (flux.normal + flux.leftCorrection) / width[last];
    rt[last] -= flux.tangent / width[last];
  }
  // Centred bed-slope source of the second-order hydrostatic reconstruction.
  for (let j = 0; j < n; j += 1) {
    rn[j] += (g * 0.5 * (hW[j] + hE[j]) * ((etaW[j] - hW[j]) - (etaE[j] - hE[j]))) / width[j];
  }
}

/**
 * Stage 1 surf-zone solver: nonlinear shallow-water equations on a grid that is
 * uniform along shore (x) and may stretch across shore (z). Breaking waves
 * become shock-captured bores; there is no dispersion (see plan §1.7).
 */
export class ShallowWaterSolver {
  readonly nx: number;
  readonly nz: number;
  readonly dx: number;
  readonly xCenters: Float64Array;
  readonly zCenters: Float64Array;
  readonly dz: Float64Array;
  /** Bed elevation b = −depth, m. */
  readonly bed: Float64Array;
  /** Total water depth, m. */
  readonly h: Float64Array;
  /** Depth-integrated flow along x and z, m²/s. */
  readonly qx: Float64Array;
  readonly qz: Float64Array;
  time = 0;
  protected readonly gravity: number;
  protected readonly dryDepth: number;
  private readonly manning: number;
  private readonly courant: number;
  private readonly periodicX: boolean;
  private readonly zEdges: Float64Array;
  private readonly u: Float64Array;
  private readonly w: Float64Array;
  private readonly eta: Float64Array;
  private readonly stageH: Float64Array;
  private readonly stageQx: Float64Array;
  private readonly stageQz: Float64Array;
  private readonly rateH: Float64Array;
  private readonly rateQx: Float64Array;
  private readonly rateQz: Float64Array;
  private readonly line: Line;
  private readonly flux: Flux = { mass: 0, normal: 0, tangent: 0, leftCorrection: 0, rightCorrection: 0 };

  constructor(grid: SolverGrid, depthAt: DepthFunction, options: SolverOptions = {}) {
    this.nx = grid.nx;
    this.nz = grid.zEdges.length - 1;
    this.dx = grid.dx;
    this.periodicX = grid.periodicX ?? false;
    this.gravity = options.gravity ?? GRAVITY;
    this.manning = options.manning ?? 0.02;
    this.dryDepth = options.dryDepth ?? 1e-4;
    this.courant = options.courant ?? 0.45;
    this.zEdges = Float64Array.from(grid.zEdges);
    this.xCenters = new Float64Array(this.nx);
    for (let ix = 0; ix < this.nx; ix += 1) this.xCenters[ix] = grid.xMin + (ix + 0.5) * grid.dx;
    this.zCenters = new Float64Array(this.nz);
    this.dz = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.zCenters[iz] = 0.5 * (this.zEdges[iz] + this.zEdges[iz + 1]);
      this.dz[iz] = this.zEdges[iz + 1] - this.zEdges[iz];
    }
    const size = this.nx * this.nz;
    const make = () => new Float64Array(size);
    this.bed = make(); this.h = make(); this.qx = make(); this.qz = make();
    this.u = make(); this.w = make(); this.eta = make();
    this.stageH = make(); this.stageQx = make(); this.stageQz = make();
    this.rateH = make(); this.rateQx = make(); this.rateQz = make();
    this.line = new Line(Math.max(this.nx, this.nz));
    const level = options.waterLevel ?? 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        this.bed[i] = -depthAt(this.xCenters[ix], this.zCenters[iz]);
        this.h[i] = Math.max(0, level - this.bed[i]);
      }
    }
  }

  surfaceAt(index: number): number {
    return this.h[index] + this.bed[index];
  }

  /** Index of the cell containing (x, z), clamped to the grid. */
  cellIndex(x: number, z: number): number {
    const ix = Math.min(this.nx - 1, Math.max(0, Math.floor((x - this.xCenters[0]) / this.dx + 0.5)));
    let low = 0;
    let high = this.nz;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (this.zEdges[middle] <= z) low = middle;
      else high = middle;
    }
    return low * this.nx + ix;
  }

  /** Largest time step the CFL condition allows for the current state, s. */
  maxStableStep(): number {
    let rate = 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        const depth = this.h[i];
        if (depth <= this.dryDepth) continue;
        const c = Math.sqrt(this.gravity * depth);
        rate = Math.max(rate, (Math.abs(this.qx[i] / depth) + c) / this.dx, (Math.abs(this.qz[i] / depth) + c) / this.dz[iz]);
      }
    }
    return rate > 0 ? this.courant / rate : Infinity;
  }

  /** Advance by dt seconds, sub-stepping as the CFL condition requires. */
  step(dt: number): void {
    if (!(dt > 0) || !Number.isFinite(dt)) return;
    const substeps = Math.max(1, Math.ceil(dt / this.maxStableStep()));
    const sub = dt / substeps;
    for (let s = 0; s < substeps; s += 1) {
      this.advance(sub);
      this.time += sub;
      this.afterSubstep(sub);
    }
  }

  totalVolume(): number {
    let volume = 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) volume += this.h[iz * this.nx + ix] * this.dx * this.dz[iz];
    }
    return volume;
  }

  /** Kinetic plus potential energy relative to datum, per unit density, m⁵/s². */
  totalEnergy(): number {
    let energy = 0;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        const depth = this.h[i];
        const surface = depth + this.bed[i];
        const kinetic = depth > this.dryDepth ? (0.5 * (this.qx[i] ** 2 + this.qz[i] ** 2)) / depth : 0;
        energy += (kinetic + 0.5 * this.gravity * (surface * surface - this.bed[i] * this.bed[i])) * this.dx * this.dz[iz];
      }
    }
    return energy;
  }

  /** Hook for boundary work after each sub-step (relaxation zones in Task 3). */
  protected afterSubstep(_dt: number): void {}

  private advance(dt: number): void {
    const { h, qx, qz, stageH, stageQx, stageQz, rateH, rateQx, rateQz } = this;
    this.computeRates(h, qx, qz);
    for (let i = 0; i < h.length; i += 1) {
      stageH[i] = Math.max(0, h[i] + dt * rateH[i]);
      const wet = stageH[i] > this.dryDepth;
      stageQx[i] = wet ? qx[i] + dt * rateQx[i] : 0;
      stageQz[i] = wet ? qz[i] + dt * rateQz[i] : 0;
    }
    this.computeRates(stageH, stageQx, stageQz);
    for (let i = 0; i < h.length; i += 1) {
      h[i] = Math.max(0, 0.5 * (h[i] + stageH[i] + dt * rateH[i]));
      const wet = h[i] > this.dryDepth;
      qx[i] = wet ? 0.5 * (qx[i] + stageQx[i] + dt * rateQx[i]) : 0;
      qz[i] = wet ? 0.5 * (qz[i] + stageQz[i] + dt * rateQz[i]) : 0;
    }
    if (this.manning > 0) {
      const factor = dt * this.gravity * this.manning * this.manning;
      for (let i = 0; i < h.length; i += 1) {
        const depth = h[i];
        if (depth <= this.dryDepth) continue;
        const speed = Math.hypot(qx[i], qz[i]) / depth;
        const damping = 1 + (factor * speed) / Math.pow(depth, 4 / 3);
        qx[i] /= damping;
        qz[i] /= damping;
      }
    }
  }

  private computeRates(h: Float64Array, qx: Float64Array, qz: Float64Array): void {
    const { nx, nz, u, w, eta, bed, rateH, rateQx, rateQz, line, flux, gravity } = this;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > this.dryDepth;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
      eta[i] = h[i] + bed[i];
      rateH[i] = 0;
      rateQx[i] = 0;
      rateQz[i] = 0;
    }
    line.width.fill(this.dx, 0, nx);
    line.gap.fill(this.dx, 0, nx);
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      for (let ix = 0; ix < nx; ix += 1) {
        line.h[ix] = h[row + ix]; line.eta[ix] = eta[row + ix]; line.un[ix] = u[row + ix]; line.ut[ix] = w[row + ix];
      }
      solveLine(line, nx, this.periodicX, gravity, flux);
      for (let ix = 0; ix < nx; ix += 1) {
        rateH[row + ix] += line.rh[ix]; rateQx[row + ix] += line.rn[ix]; rateQz[row + ix] += line.rt[ix];
      }
    }
    for (let iz = 0; iz < nz; iz += 1) {
      line.width[iz] = this.dz[iz];
      line.gap[iz] = iz < nz - 1 ? this.zCenters[iz + 1] - this.zCenters[iz] : this.dz[iz];
    }
    for (let ix = 0; ix < nx; ix += 1) {
      for (let iz = 0; iz < nz; iz += 1) {
        const i = iz * nx + ix;
        line.h[iz] = h[i]; line.eta[iz] = eta[i]; line.un[iz] = w[i]; line.ut[iz] = u[i];
      }
      solveLine(line, nz, false, gravity, flux);
      for (let iz = 0; iz < nz; iz += 1) {
        const i = iz * nx + ix;
        rateH[i] += line.rh[iz]; rateQz[i] += line.rn[iz]; rateQx[i] += line.rt[iz];
      }
    }
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/wave/ShallowWaterSolver.ts src/wave/ShallowWaterSolver.test.ts
git commit -m "feat: add well-balanced finite-volume shallow-water solver"
```

---

### Task 3: Relaxation zones and physics validation

**Files:**
- Modify: `src/wave/ShallowWaterSolver.ts` (relaxation zones)
- Create: `src/wave/shallowWaterTestSupport.ts` (long-wave target and gauge helpers)
- Test: `src/wave/ShallowWaterValidation.test.ts`

**Interfaces:**
- Produces:
  - `interface WaterTarget { eta; qx; qz }`
  - `interface RelaxationZone { weights: Float64Array; target(x, z, t, out: WaterTarget): void }`
  - `relaxationRamp(s): number`
  - `ShallowWaterSolver.addRelaxationZone(zone)`
  - `ShallowWaterSolver.zoneWeightsAlongZ(inner, outer): Float64Array`
  - Test support: `longWaveTarget(amplitude, period, depth, angle?)`, `calmTarget`, `upCrossings(times, values)`, `meanLag(leading, lagging)`

- [ ] **Step 1: Write the failing test** — `src/wave/ShallowWaterValidation.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { GRAVITY } from './dispersion';
import { ShallowWaterSolver, uniformEdges } from './ShallowWaterSolver';
import { calmTarget, longWaveTarget, meanLag, upCrossings } from './shallowWaterTestSupport';

describe('shallow-water validation', () => {
  it('carries a small long wave at √(gh) and absorbs it with little reflection', () => {
    const depth = 4;
    const amplitude = 0.02;
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(0, 600, 600), periodicX: true }, () => depth, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: longWaveTarget(amplitude, 20, depth) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(450, 600), target: calmTarget });
    const gaugeA = solver.cellIndex(0.5, 200.5);
    const gaugeB = solver.cellIndex(0.5, 300.5);
    const times: number[] = [];
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    const envelope = new Float64Array(solver.nz);
    while (solver.time < 150) {
      solver.step(0.1);
      if (solver.time < 100) continue;
      times.push(solver.time);
      seriesA.push(solver.surfaceAt(gaugeA));
      seriesB.push(solver.surfaceAt(gaugeB));
      for (let iz = 0; iz < solver.nz; iz += 1) envelope[iz] = Math.max(envelope[iz], Math.abs(solver.surfaceAt(iz * solver.nx)));
    }
    const speed = 100 / meanLag(upCrossings(times, seriesA), upCrossings(times, seriesB));
    expect(Math.abs(speed / Math.sqrt(GRAVITY * depth) - 1)).toBeLessThan(0.02);
    let largest = 0;
    let smallest = Infinity;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      if (solver.zCenters[iz] < 150 || solver.zCenters[iz] > 420) continue;
      largest = Math.max(largest, envelope[iz]);
      smallest = Math.min(smallest, envelope[iz]);
    }
    expect((largest - smallest) / (largest + smallest)).toBeLessThan(0.1);
    expect(Math.abs(0.5 * (largest + smallest) / amplitude - 1)).toBeLessThan(0.1);
  });

  it("shoals a long wave by Green's law on a gentle slope", () => {
    const depthAt = (_x: number, z: number) => (z < 200 ? 6 : z > 1100 ? 1.5 : 6 - (4.5 * (z - 200)) / 900);
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 2, zEdges: uniformEdges(0, 1400, 700), periodicX: true }, depthAt, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(150, 0), target: longWaveTarget(0.015, 30, 6) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(1200, 1400), target: calmTarget });
    const deepGauge = solver.cellIndex(1, 251);
    const shallowGauge = solver.cellIndex(1, 1051);
    let deepEnvelope = 0;
    let shallowEnvelope = 0;
    while (solver.time < 330) {
      solver.step(0.1);
      if (solver.time < 270) continue;
      deepEnvelope = Math.max(deepEnvelope, Math.abs(solver.surfaceAt(deepGauge)));
      shallowEnvelope = Math.max(shallowEnvelope, Math.abs(solver.surfaceAt(shallowGauge)));
    }
    const expected = Math.pow(depthAt(0, 251) / depthAt(0, 1051), 0.25);
    expect(Math.abs(shallowEnvelope / deepEnvelope / expected - 1)).toBeLessThan(0.1);
  }, 60_000);

  it("refracts an oblique long wave by Snell's law over a sloping bed", () => {
    const nx = 89;
    const dx = 4;
    const period = 20;
    const omega = (2 * Math.PI) / period;
    const deep = 8;
    const shallow = 2;
    const depthAt = (_x: number, z: number) => (z < 150 ? deep : z > 350 ? shallow : deep + ((shallow - deep) * (z - 150)) / 200);
    const kx = (2 * Math.PI) / (nx * dx);
    const incident = Math.asin(kx / (omega / Math.sqrt(GRAVITY * deep)));
    const solver = new ShallowWaterSolver(
      { nx, xMin: 0, dx, zEdges: uniformEdges(0, 500, 125), periodicX: true }, depthAt, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: longWaveTarget(0.02, period, deep, incident) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(430, 500), target: calmTarget });
    const gaugeA = solver.cellIndex(solver.xCenters[0], 370);
    const gaugeB = solver.cellIndex(solver.xCenters[0], 410);
    const times: number[] = [];
    const seriesA: number[] = [];
    const seriesB: number[] = [];
    while (solver.time < 160) {
      solver.step(0.1);
      if (solver.time < 110) continue;
      times.push(solver.time);
      seriesA.push(solver.surfaceAt(gaugeA));
      seriesB.push(solver.surfaceAt(gaugeB));
    }
    const kz = (omega * meanLag(upCrossings(times, seriesA), upCrossings(times, seriesB))) / 40;
    const measured = (Math.atan2(kx, kz) * 180) / Math.PI;
    const expected = (Math.asin(kx / (omega / Math.sqrt(GRAVITY * shallow))) * 180) / Math.PI;
    expect(Math.abs(measured - expected)).toBeLessThan(2);
  }, 60_000);

  it('runs a wave up a dry beach without negative depth or non-finite state', () => {
    const depthAt = (_x: number, z: number) => (z < 0 ? 4 : 4 - 0.05 * z);
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: uniformEdges(-60, 120, 180), periodicX: true }, depthAt,
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-20, -60), target: longWaveTarget(0.3, 10, 4) });
    let shallowest = Infinity;
    let highestWetZ = -Infinity;
    let finite = true;
    while (solver.time < 60) {
      solver.step(1 / 30);
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && Number.isFinite(solver.qz[i]);
        shallowest = Math.min(shallowest, solver.h[i]);
        if (solver.h[i] > 0.01) highestWetZ = Math.max(highestWetZ, solver.zCenters[Math.floor(i / solver.nx)]);
      }
    }
    expect(finite).toBe(true);
    expect(shallowest).toBeGreaterThanOrEqual(0);
    expect(highestWetZ).toBeGreaterThan(80);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/wave/ShallowWaterValidation.test.ts`
Expected: FAIL — cannot resolve `./shallowWaterTestSupport`.

- [ ] **Step 3: Write minimal implementation**

`src/wave/shallowWaterTestSupport.ts`:

```ts
import { GRAVITY } from './dispersion';
import type { WaterTarget } from './ShallowWaterSolver';

/** Linear long wave η = a cos(k·x − ωt) with shallow-water flux q = c η along its direction. */
export function longWaveTarget(amplitude: number, period: number, depth: number, angle = 0) {
  const omega = (2 * Math.PI) / period;
  const c = Math.sqrt(GRAVITY * depth);
  const kx = (omega / c) * Math.sin(angle);
  const kz = (omega / c) * Math.cos(angle);
  return (x: number, z: number, t: number, out: WaterTarget): void => {
    const eta = amplitude * Math.cos(kx * x + kz * z - omega * t);
    out.eta = eta;
    out.qx = c * eta * Math.sin(angle);
    out.qz = c * eta * Math.cos(angle);
  };
}

export function calmTarget(_x: number, _z: number, _t: number, out: WaterTarget): void {
  out.eta = 0;
  out.qx = 0;
  out.qz = 0;
}

/** Linearly interpolated times of zero up-crossings. */
export function upCrossings(times: number[], values: number[]): number[] {
  const crossings: number[] = [];
  for (let i = 1; i < values.length; i += 1) {
    if (values[i - 1] < 0 && values[i] >= 0) {
      crossings.push(times[i - 1] + ((times[i] - times[i - 1]) * -values[i - 1]) / (values[i] - values[i - 1]));
    }
  }
  return crossings;
}

/** Mean delay from each leading crossing to the next lagging crossing (the lag must be under one period). */
export function meanLag(leading: number[], lagging: number[]): number {
  let total = 0;
  let count = 0;
  for (const time of leading) {
    const next = lagging.find((value) => value > time);
    if (next === undefined) continue;
    total += next - time;
    count += 1;
  }
  return total / count;
}
```

In `src/wave/ShallowWaterSolver.ts`, add these exports near the top (after `SolverOptions`):

```ts
export interface WaterTarget {
  eta: number;
  qx: number;
  qz: number;
}

export interface RelaxationZone {
  /** Per-step blend weight for each cell (index iz * nx + ix): 0 leaves it free, 1 prescribes it. */
  weights: Float64Array;
  target(x: number, z: number, t: number, out: WaterTarget): void;
}

/** Jacobsen et al. (2012) ramp: 0 at the zone's inner edge, 1 at its outer boundary. */
export function relaxationRamp(s: number): number {
  const clamped = Math.min(1, Math.max(0, s));
  return (Math.exp(Math.pow(clamped, 3.5)) - 1) / (Math.E - 1);
}
```

Inside `class ShallowWaterSolver`, add these fields:

```ts
  private readonly zones: RelaxationZone[] = [];
  private readonly target: WaterTarget = { eta: 0, qx: 0, qz: 0 };
```

Add these methods:

```ts
  addRelaxationZone(zone: RelaxationZone): void {
    this.zones.push(zone);
  }

  /** Weights for a zone spanning z from `inner` (weight 0) to `outer` (weight 1). */
  zoneWeightsAlongZ(inner: number, outer: number): Float64Array {
    const weights = new Float64Array(this.nx * this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      const s = (this.zCenters[iz] - inner) / (outer - inner);
      if (s <= 0) continue;
      weights.fill(relaxationRamp(s), iz * this.nx, (iz + 1) * this.nx);
    }
    return weights;
  }
```

Replace the empty `afterSubstep` hook with:

```ts
  /** Blend relaxation zones toward their prescribed water after each sub-step. */
  protected afterSubstep(_dt: number): void {
    for (const zone of this.zones) {
      for (let iz = 0; iz < this.nz; iz += 1) {
        for (let ix = 0; ix < this.nx; ix += 1) {
          const i = iz * this.nx + ix;
          const weight = zone.weights[i];
          if (weight <= 0) continue;
          zone.target(this.xCenters[ix], this.zCenters[iz], this.time, this.target);
          const targetDepth = Math.max(0, this.target.eta - this.bed[i]);
          this.h[i] += weight * (targetDepth - this.h[i]);
          const wet = this.h[i] > this.dryDepth;
          this.qx[i] = wet ? this.qx[i] + weight * (this.target.qx - this.qx[i]) : 0;
          this.qz[i] = wet ? this.qz[i] + weight * (this.target.qz - this.qz[i]) : 0;
        }
      }
    }
  }
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/wave/ShallowWaterValidation.test.ts`
Expected: PASS (4 tests). The shoaling and Snell tests may take several seconds each.

- [ ] **Step 5: Commit**

```bash
git add src/wave/ShallowWaterSolver.ts src/wave/shallowWaterTestSupport.ts src/wave/ShallowWaterValidation.test.ts
git commit -m "feat: add relaxation zones and validate the shallow-water solver"
```

---

### Task 4: Measure cost and record P2a

**Files:**
- Modify: `docs/research/wave-formation-plan.md` (P2 row and §3.3), `ROADMAP.md` (P2 entry)

- [ ] **Step 1: Measure.** Temporarily add `src/wave/__bench_tmp.test.ts`. It builds a `beach` spot solver of 160 × 210 cells (1 m cells, z from −180 to 30) with a long-wave relaxation zone, runs 600 steps of 1/60 s after a 60-step warm-up, and throws an error that reports the mean ms per step. Run it with `npx vitest run src/wave/__bench_tmp.test.ts`, record the number, then delete the file.
- [ ] **Step 2: Record.** In the plan's §4.1 P2 row and §3.3 cost table, add: "P2a done: bathymetry and stage 1 solver validated (lake at rest, conservation, Stoker, √(gh), reflection, Green, Snell, run-up); measured X ms/step for 34k cells in Node." Mark P2 `In Progress` in `ROADMAP.md`, with a checked P2a item and unchecked P2b and P2c items:
  - P2b: sea-state relaxation boundary with refraction, warm start and skip-to-set, stretched grid, along-shore window.
  - P2c: game integration behind a flag, g = 9.81, Wave speed slider removed, rendering and seabed from the spot, worker, bicubic sampling.
- [ ] **Step 3: Commit**

```bash
git add docs/research/wave-formation-plan.md ROADMAP.md docs/superpowers/plans/2026-09-25-p2a-bathymetry-and-solver.md
git commit -m "docs: record P2a bathymetry and stage 1 solver"
```
