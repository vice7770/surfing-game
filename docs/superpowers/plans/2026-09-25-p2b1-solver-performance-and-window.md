# P2b-1 Solver Performance, Boundaries, Stretched Grid and Sliding Window

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the P2a solver fit the game. Bring the 33.6k-cell step from 7.5 ms toward the 4 ms worker budget. Add open along-shore boundaries, a stretched cross-shore grid, and a window that slides along shore over the fixed spot seabed ([plan](../../research/wave-formation-plan.md) §1.5, Q10, Q24, Q30).

**Architecture:**
- `ShallowWaterSolver` sweeps rows and columns in place with a stride. It no longer copies each line, and it keeps only two cells' face states at a time.
- Relaxation zones remember which rows they touch.
- `xBoundary` replaces `periodicX` and adds zero-gradient `'open'` edges.
- `stretchedEdges()` builds geometric cross-shore spacing.
- `shiftAlongShore()` moves the window by whole columns. New columns sample the spot seabed and extend the edge water surface (or the rest level) and velocity.

**Tech Stack:** TypeScript 5.9 strict, Vitest 5.

## Global Constraints

- The behaviour stays validated: every existing solver and validation test keeps passing, with its tolerances unchanged.
- Determinism: identical inputs give bit-identical states.
- No gameplay changes; the solver is still standalone.
- Performance numbers are measured in Node on the development machine and recorded, not asserted.
- Commit on `feat/wave-formation-p1-sea-state`; do not push.

---

### Task 1: In-place strided sweeps, cheaper friction, row-bounded zones

**Files:**
- Modify: `src/wave/ShallowWaterSolver.ts` (replace the `Line`/`solveLine` machinery; change `periodicX` to `xBoundary`)
- Modify: `src/wave/ShallowWaterSolver.test.ts`, `src/wave/ShallowWaterValidation.test.ts` (`periodicX: true` becomes `xBoundary: 'periodic'`; add a determinism test)

**Interfaces:**
- Produces:
  - `type AlongShoreBoundary = 'wall' | 'periodic' | 'open'`
  - `SolverGrid.xBoundary?: AlongShoreBoundary` (default `'wall'`)
  - Every other export is unchanged.

- [ ] **Step 1: Write the failing test.** Change the call sites with `sed -i '' "s/periodicX: true/xBoundary: 'periodic'/" src/wave/ShallowWaterSolver.test.ts src/wave/ShallowWaterValidation.test.ts`. Then append to the `describe` in `src/wave/ShallowWaterSolver.test.ts`, and add `import { longWaveTarget } from './shallowWaterTestSupport';` at the top:

```ts
  it('repeats bit-identical states for identical runs', () => {
    const run = () => {
      const solver = new ShallowWaterSolver(
        { nx: 24, xMin: -48, dx: 4, zEdges: uniformEdges(-160, 20, 60), xBoundary: 'open' }, createSpot('reef', 1).depthAt,
      );
      solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(-120, -160), target: longWaveTarget(0.5, 9, 10) });
      for (let frame = 0; frame < 200; frame += 1) solver.step(1 / 30);
      return [Array.from(solver.h), Array.from(solver.qx), Array.from(solver.qz)];
    };
    expect(run()).toEqual(run());
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts`
Expected: FAIL. TypeScript accepts the unknown `xBoundary` at runtime, but the determinism test's `'open'` edge is treated as a wall, so it passes. The periodic Stoker case then fails because `periodicX` is no longer read. If both happen to pass, move on: Step 3 is a refactor guarded by the existing suite.

- [ ] **Step 3: Replace the implementation.** An intermediate version kept two cells' faces in objects and called a per-cell `reconstruct` method. It measured 6.8 ms per step (bundled Node), and CPU profiling put 36 % of the time in `reconstruct` and 33 % in `sweepLine`. The version below instead reconstructs each line into typed face arrays inline, reads the grid in place, and skips fully dry stretches. It measured **6.3 ms**, against 7.9 ms for the P2a code. Benchmark in bundled Node (`npx rolldown` plus `node`), because Vitest's module transform distorts timings (it reported 11 ms for the same code). Replace `src/wave/ShallowWaterSolver.ts` with:

```ts
import { GRAVITY } from './dispersion';

export type DepthFunction = (x: number, z: number) => number;

/** Along-shore edges: reflecting walls, wrap-around, or zero-gradient open edges. */
export type AlongShoreBoundary = 'wall' | 'periodic' | 'open';

export interface SolverGrid {
  nx: number;
  xMin: number;
  dx: number;
  /** nz + 1 increasing cell-edge positions along z (shoreward), m; spacing may vary. */
  zEdges: ArrayLike<number>;
  xBoundary?: AlongShoreBoundary;
}

export interface SolverOptions {
  gravity?: number;
  /** Manning bottom roughness n, s/m^(1/3). */
  manning?: number;
  /** Depth at or below which a cell carries no momentum, m. */
  dryDepth?: number;
  courant?: number;
  /** Still-water level above datum (tide), m. */
  waterLevel?: number;
}

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

export function uniformEdges(start: number, end: number, count: number): Float64Array {
  const edges = new Float64Array(count + 1);
  for (let i = 0; i <= count; i += 1) edges[i] = start + ((end - start) * i) / count;
  return edges;
}

const WALL = 0;
const PERIODIC = 1;
const OPEN = 2;

interface Flux {
  mass: number;
  normal: number;
  tangent: number;
  leftCorrection: number;
  rightCorrection: number;
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

interface ZoneEntry {
  zone: RelaxationZone;
  firstRow: number;
  lastRow: number;
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
  protected readonly restLevel: number;
  protected readonly depthAt: DepthFunction;
  private readonly manning: number;
  private readonly courant: number;
  private readonly xBoundary: number;
  private readonly zEdges: Float64Array;
  private readonly zGaps: Float64Array;
  private readonly u: Float64Array;
  private readonly w: Float64Array;
  private readonly eta: Float64Array;
  private readonly stageH: Float64Array;
  private readonly stageQx: Float64Array;
  private readonly stageQz: Float64Array;
  private readonly rateH: Float64Array;
  private readonly rateQx: Float64Array;
  private readonly rateQz: Float64Array;
  private readonly flux: Flux = { mass: 0, normal: 0, tangent: 0, leftCorrection: 0, rightCorrection: 0 };
  private readonly hW: Float64Array;
  private readonly hE: Float64Array;
  private readonly etaW: Float64Array;
  private readonly etaE: Float64Array;
  private readonly unW: Float64Array;
  private readonly unE: Float64Array;
  private readonly utW: Float64Array;
  private readonly utE: Float64Array;
  private readonly zones: ZoneEntry[] = [];
  private readonly target: WaterTarget = { eta: 0, qx: 0, qz: 0 };
  /** Depth array the current sweep reads (h or the RK stage). */
  private lineDepth: Float64Array;

  constructor(grid: SolverGrid, depthAt: DepthFunction, options: SolverOptions = {}) {
    this.nx = grid.nx;
    this.nz = grid.zEdges.length - 1;
    this.dx = grid.dx;
    this.xBoundary = grid.xBoundary === 'periodic' ? PERIODIC : grid.xBoundary === 'open' ? OPEN : WALL;
    this.depthAt = depthAt;
    this.gravity = options.gravity ?? GRAVITY;
    this.manning = options.manning ?? 0.02;
    this.dryDepth = options.dryDepth ?? 1e-4;
    this.courant = options.courant ?? 0.45;
    this.restLevel = options.waterLevel ?? 0;
    this.zEdges = Float64Array.from(grid.zEdges);
    this.xCenters = new Float64Array(this.nx);
    for (let ix = 0; ix < this.nx; ix += 1) this.xCenters[ix] = grid.xMin + (ix + 0.5) * grid.dx;
    this.zCenters = new Float64Array(this.nz);
    this.dz = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.zCenters[iz] = 0.5 * (this.zEdges[iz] + this.zEdges[iz + 1]);
      this.dz[iz] = this.zEdges[iz + 1] - this.zEdges[iz];
    }
    this.zGaps = new Float64Array(this.nz);
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.zGaps[iz] = iz < this.nz - 1 ? this.zCenters[iz + 1] - this.zCenters[iz] : this.dz[iz];
    }
    const size = this.nx * this.nz;
    const make = () => new Float64Array(size);
    this.bed = make(); this.h = make(); this.qx = make(); this.qz = make();
    this.u = make(); this.w = make(); this.eta = make();
    this.stageH = make(); this.stageQx = make(); this.stageQz = make();
    this.rateH = make(); this.rateQx = make(); this.rateQz = make();
    this.lineDepth = this.h;
    const lineLength = Math.max(this.nx, this.nz);
    const face = () => new Float64Array(lineLength);
    this.hW = face(); this.hE = face(); this.etaW = face(); this.etaE = face();
    this.unW = face(); this.unE = face(); this.utW = face(); this.utE = face();
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        this.bed[i] = -depthAt(this.xCenters[ix], this.zCenters[iz]);
        this.h[i] = Math.max(0, this.restLevel - this.bed[i]);
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
      const inverseDz = 1 / this.dz[iz];
      for (let ix = 0; ix < this.nx; ix += 1) {
        const i = iz * this.nx + ix;
        const depth = this.h[i];
        if (depth <= this.dryDepth) continue;
        const c = Math.sqrt(this.gravity * depth);
        rate = Math.max(rate, (Math.abs(this.qx[i] / depth) + c) / this.dx, (Math.abs(this.qz[i] / depth) + c) * inverseDz);
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
      this.relax();
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

  addRelaxationZone(zone: RelaxationZone): void {
    let firstRow = this.nz;
    let lastRow = -1;
    for (let iz = 0; iz < this.nz; iz += 1) {
      for (let ix = 0; ix < this.nx; ix += 1) {
        if (zone.weights[iz * this.nx + ix] <= 0) continue;
        firstRow = Math.min(firstRow, iz);
        lastRow = Math.max(lastRow, iz);
      }
    }
    this.zones.push({ zone, firstRow, lastRow });
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

  /** Blend relaxation zones toward their prescribed water after each sub-step. */
  private relax(): void {
    for (const { zone, firstRow, lastRow } of this.zones) {
      for (let iz = firstRow; iz <= lastRow; iz += 1) {
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
        const speed = Math.sqrt(qx[i] * qx[i] + qz[i] * qz[i]) / depth;
        // Semi-implicit Manning friction; depth^(4/3) = depth · ∛depth.
        const damping = 1 + (factor * speed) / (depth * Math.cbrt(depth));
        qx[i] /= damping;
        qz[i] /= damping;
      }
    }
  }

  private computeRates(h: Float64Array, qx: Float64Array, qz: Float64Array): void {
    const { u, w, eta, bed, rateH, rateQx, rateQz } = this;
    for (let i = 0; i < h.length; i += 1) {
      const wet = h[i] > this.dryDepth;
      u[i] = wet ? qx[i] / h[i] : 0;
      w[i] = wet ? qz[i] / h[i] : 0;
      eta[i] = h[i] + bed[i];
      rateH[i] = 0;
      rateQx[i] = 0;
      rateQz[i] = 0;
    }
    this.lineDepth = h;
    for (let iz = 0; iz < this.nz; iz += 1) {
      this.sweepLine(iz * this.nx, 1, this.nx, this.xBoundary, null, this.dx, u, w, rateQx, rateQz);
    }
    for (let ix = 0; ix < this.nx; ix += 1) {
      this.sweepLine(ix, this.nx, this.nz, WALL, this.dz, 0, w, u, rateQz, rateQx);
    }
  }

  /** Second-order fluxes and well-balanced sources along one row or column, read in place. */
  private sweepLine(
    base: number, stride: number, n: number, boundary: number,
    widths: Float64Array | null, uniformWidth: number,
    normal: Float64Array, tangent: Float64Array, rateNormal: Float64Array, rateTangent: Float64Array,
  ): void {
    const h = this.lineDepth;
    const { eta, rateH, flux, gravity: g, hW, hE, etaW, etaE, unW, unE, utW, utE } = this;
    const gaps = widths ? this.zGaps : null;
    const wall = boundary === WALL;
    const periodic = boundary === PERIODIC;
    for (let j = 0; j < n; j += 1) {
      const index = base + j * stride;
      const hj = h[index];
      const hasPrevious = j > 0 || periodic;
      const hasNext = j < n - 1 || periodic;
      const previous = j > 0 ? index - stride : base + (n - 1) * stride;
      const following = j < n - 1 ? index + stride : base;
      const hPrevious = hasPrevious ? h[previous] : hj;
      const hNext = hasNext ? h[following] : hj;
      if (hj <= 0 && hPrevious <= 0 && hNext <= 0) {
        hW[j] = 0; hE[j] = 0;
        continue;
      }
      const width = widths ? widths[j] : uniformWidth;
      const backScale = hasPrevious ? width / (gaps ? gaps[j > 0 ? j - 1 : n - 1] : uniformWidth) : 1;
      const forwardScale = hasNext ? width / (gaps ? gaps[j < n - 1 ? j : n - 1] : uniformWidth) : 1;
      const etaj = eta[index];
      const unj = normal[index];
      const utj = tangent[index];
      const etaPrevious = hasPrevious ? eta[previous] : etaj;
      const etaNext = hasNext ? eta[following] : etaj;
      const unPrevious = hasPrevious ? normal[previous] : wall ? -unj : unj;
      const unNext = hasNext ? normal[following] : wall ? -unj : unj;
      const utPrevious = hasPrevious ? tangent[previous] : utj;
      const utNext = hasNext ? tangent[following] : utj;
      const sh = 0.5 * limited((hj - hPrevious) * backScale, (hNext - hj) * forwardScale);
      const se = 0.5 * limited((etaj - etaPrevious) * backScale, (etaNext - etaj) * forwardScale);
      const su = 0.5 * limited((unj - unPrevious) * backScale, (unNext - unj) * forwardScale);
      const sv = 0.5 * limited((utj - utPrevious) * backScale, (utNext - utj) * forwardScale);
      const west = hj - sh;
      const east = hj + sh;
      hW[j] = west > 0 ? west : 0;
      hE[j] = east > 0 ? east : 0;
      etaW[j] = etaj - se;
      etaE[j] = etaj + se;
      unW[j] = unj - su;
      unE[j] = unj + su;
      utW[j] = utj - sv;
      utE[j] = utj + sv;
    }
    const interfaces = periodic ? n : n - 1;
    for (let j = 0; j < interfaces; j += 1) {
      const k = j + 1 < n ? j + 1 : 0;
      if (hE[j] <= 0 && hW[k] <= 0) continue;
      const left = base + j * stride;
      const right = base + k * stride;
      const leftWidth = widths ? widths[j] : uniformWidth;
      const rightWidth = widths ? widths[k] : uniformWidth;
      interfaceFlux(hE[j], etaE[j], unE[j], utE[j], hW[k], etaW[k], unW[k], utW[k], g, flux);
      rateH[left] -= flux.mass / leftWidth;
      rateNormal[left] -= (flux.normal + flux.leftCorrection) / leftWidth;
      rateTangent[left] -= flux.tangent / leftWidth;
      rateH[right] += flux.mass / rightWidth;
      rateNormal[right] += (flux.normal + flux.rightCorrection) / rightWidth;
      rateTangent[right] += flux.tangent / rightWidth;
    }
    if (!periodic) {
      if (hW[0] > 0) {
        const width = widths ? widths[0] : uniformWidth;
        interfaceFlux(hW[0], etaW[0], wall ? -unW[0] : unW[0], utW[0], hW[0], etaW[0], unW[0], utW[0], g, flux);
        rateH[base] += flux.mass / width;
        rateNormal[base] += (flux.normal + flux.rightCorrection) / width;
        rateTangent[base] += flux.tangent / width;
      }
      const lastJ = n - 1;
      if (hE[lastJ] > 0) {
        const last = base + lastJ * stride;
        const width = widths ? widths[lastJ] : uniformWidth;
        interfaceFlux(hE[lastJ], etaE[lastJ], unE[lastJ], utE[lastJ], hE[lastJ], etaE[lastJ], wall ? -unE[lastJ] : unE[lastJ], utE[lastJ], g, flux);
        rateH[last] -= flux.mass / width;
        rateNormal[last] -= (flux.normal + flux.leftCorrection) / width;
        rateTangent[last] -= flux.tangent / width;
      }
    }
    // Centred bed-slope source of the second-order hydrostatic reconstruction.
    for (let j = 0; j < n; j += 1) {
      const depthSum = hW[j] + hE[j];
      if (depthSum <= 0) continue;
      const width = widths ? widths[j] : uniformWidth;
      rateNormal[base + j * stride] += (g * 0.5 * depthSum * ((etaW[j] - hW[j]) - (etaE[j] - hE[j]))) / width;
    }
  }

}
```

- [ ] **Step 4: Run tests and measure**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts src/wave/ShallowWaterValidation.test.ts`
Expected: PASS (4 + 4 tests).

Then re-run the P2a benchmark (a temporary `src/wave/__bench_tmp.test.ts`: the 160 × 210 beach grid with a relaxation zone, 600 steps of 1/60 s after a warm-up; delete the file afterwards) and record the ms per step.

- [ ] **Step 5: Commit**

```bash
git add src/wave/ShallowWaterSolver.ts src/wave/ShallowWaterSolver.test.ts src/wave/ShallowWaterValidation.test.ts
git commit -m "perf: sweep the shallow-water solver in place"
```

---

### Task 2: Open along-shore boundaries

**Files:**
- Test: `src/wave/ShallowWaterSolver.test.ts` (append)

`'open'` is implemented in Task 1's `reconstruct` and `sweepLine`: ghosts copy the edge cell. This task proves the behaviour.

- [ ] **Step 1: Write the test** (append inside the `describe`)

```ts
  it('lets waves leave through open along-shore boundaries', () => {
    const excessEnergy = (xBoundary: 'wall' | 'open') => {
      const grid = { nx: 80, xMin: -80, dx: 2, zEdges: uniformEdges(-20, 20, 20), xBoundary };
      const still = new ShallowWaterSolver(grid, () => 3, { manning: 0 }).totalEnergy();
      const solver = new ShallowWaterSolver(grid, () => 3, { manning: 0 });
      for (let iz = 0; iz < solver.nz; iz += 1) {
        for (let ix = 0; ix < solver.nx; ix += 1) solver.h[iz * solver.nx + ix] = 3 + 0.3 * Math.exp(-(solver.xCenters[ix] ** 2) / 40);
      }
      for (let frame = 0; frame < 400; frame += 1) solver.step(0.1);
      return solver.totalEnergy() - still;
    };
    expect(excessEnergy('open')).toBeLessThan(0.1 * excessEnergy('wall'));
  });
```

- [ ] **Step 2: Run it**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts`
Expected: PASS (5 tests). If it fails, the open ghost in `reconstruct` or `sweepLine` is wrong; fix the code, not the test.

- [ ] **Step 3: Commit**

```bash
git add src/wave/ShallowWaterSolver.test.ts
git commit -m "test: verify open along-shore boundaries release waves"
```

---

### Task 3: Stretched cross-shore grid

**Files:**
- Modify: `src/wave/ShallowWaterSolver.ts` (add `stretchedEdges`)
- Test: `src/wave/ShallowWaterSolver.test.ts`, `src/wave/ShallowWaterValidation.test.ts` (append)

**Interfaces:**
- Produces: `stretchedEdges(offshore, shore, fineFrom, fine, coarse, growth = 1.08): Float64Array`

- [ ] **Step 1: Write the failing tests**

Append to `src/wave/ShallowWaterSolver.test.ts`, and add `stretchedEdges` to its import:

```ts
  it('stretches cross-shore cells smoothly from fine to coarse', () => {
    const edges = stretchedEdges(-300, 30, -150, 1, 4);
    expect(edges[0]).toBe(-300);
    expect(edges[edges.length - 1]).toBe(30);
    let largest = 0;
    let smallest = Infinity;
    let worstRatio = 1;
    for (let i = 1; i < edges.length; i += 1) {
      const spacing = edges[i] - edges[i - 1];
      largest = Math.max(largest, spacing);
      smallest = Math.min(smallest, spacing);
      if (i > 1) {
        const previous = edges[i - 1] - edges[i - 2];
        worstRatio = Math.max(worstRatio, spacing / previous, previous / spacing);
      }
    }
    expect(largest).toBeLessThanOrEqual(4 + 1e-9);
    expect(smallest).toBeGreaterThan(0.99);
    expect(worstRatio).toBeLessThan(1.081);
    expect(edges.length - 1).toBeLessThan(260);
  });
```

Append to `src/wave/ShallowWaterValidation.test.ts`, and add `stretchedEdges` to its import:

```ts
  it('passes a long wave from coarse to fine cells without reflection or speed error', () => {
    const depth = 4;
    const solver = new ShallowWaterSolver(
      { nx: 2, xMin: 0, dx: 1, zEdges: stretchedEdges(0, 600, 300, 1, 4), xBoundary: 'periodic' }, () => depth, { manning: 0 },
    );
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(100, 0), target: longWaveTarget(0.02, 20, depth) });
    solver.addRelaxationZone({ weights: solver.zoneWeightsAlongZ(450, 600), target: calmTarget });
    const gaugeA = solver.cellIndex(0.5, 320.5);
    const gaugeB = solver.cellIndex(0.5, 420.5);
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
      if (solver.zCenters[iz] < 120 || solver.zCenters[iz] > 280) continue;
      largest = Math.max(largest, envelope[iz]);
      smallest = Math.min(smallest, envelope[iz]);
    }
    expect((largest - smallest) / (largest + smallest)).toBeLessThan(0.05);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts src/wave/ShallowWaterValidation.test.ts`
Expected: FAIL — `stretchedEdges is not a function`.

- [ ] **Step 3: Implement** (add after `uniformEdges` in `src/wave/ShallowWaterSolver.ts`)

```ts
/**
 * Cross-shore edges from `offshore` to `shore`: uniform cells of about `fine`
 * shoreward of `fineFrom`, growing by at most `growth` per cell to `coarse`
 * toward `offshore`. The offshore cells are scaled together to fit exactly.
 */
export function stretchedEdges(offshore: number, shore: number, fineFrom: number, fine: number, coarse: number, growth = 1.08): Float64Array {
  const fineCount = Math.max(1, Math.round((shore - fineFrom) / fine));
  const fineSpacing = (shore - fineFrom) / fineCount;
  const span = fineFrom - offshore;
  const spacings: number[] = [];
  let covered = 0;
  let spacing = fineSpacing;
  while (covered < span) {
    spacing = Math.min(coarse, spacing * growth);
    spacings.push(spacing);
    covered += spacing;
  }
  const scale = spacings.length > 0 ? span / covered : 1;
  const edges = new Float64Array(spacings.length + fineCount + 1);
  edges[0] = offshore;
  let z = offshore;
  for (let k = spacings.length - 1; k >= 0; k -= 1) {
    z += spacings[k] * scale;
    edges[spacings.length - k] = z;
  }
  edges[spacings.length] = fineFrom;
  for (let k = 1; k <= fineCount; k += 1) edges[spacings.length + k] = fineFrom + k * fineSpacing;
  edges[edges.length - 1] = shore;
  return edges;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts src/wave/ShallowWaterValidation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wave/ShallowWaterSolver.ts src/wave/ShallowWaterSolver.test.ts src/wave/ShallowWaterValidation.test.ts
git commit -m "feat: add a stretched cross-shore grid for the solver"
```

---

### Task 4: Along-shore sliding window

**Files:**
- Modify: `src/wave/ShallowWaterSolver.ts` (add `shiftAlongShore`)
- Test: `src/wave/ShallowWaterSolver.test.ts` (append)

**Interfaces:**
- Produces: `ShallowWaterSolver.shiftAlongShore(columns: number): void`. A positive value moves the window toward +x. It throws a `RangeError` when |columns| ≥ nx.

- [ ] **Step 1: Write the failing tests** (append inside the `describe`)

```ts
  it('slides the window along shore, keeping overlapping water and extending the edge', () => {
    const spot = createSpot('point', 1);
    const solver = new ShallowWaterSolver(
      { nx: 30, xMin: -60, dx: 4, zEdges: uniformEdges(-200, 20, 55), xBoundary: 'open' }, spot.depthAt, { waterLevel: 0.2 },
    );
    for (let i = 0; i < solver.h.length; i += 1) if (solver.h[i] > 0) solver.h[i] += 0.1 * Math.sin(i * 0.37);
    for (let frame = 0; frame < 30; frame += 1) solver.step(1 / 15);
    const before = Float64Array.from(solver.h);
    const edgeSurface = (iz: number) => before[iz * solver.nx + solver.nx - 1] + solver.bed[iz * solver.nx + solver.nx - 1];
    const edges = Array.from({ length: solver.nz }, (_, iz) => edgeSurface(iz));
    const edgeWet = Array.from({ length: solver.nz }, (_, iz) => before[iz * solver.nx + solver.nx - 1] > 1e-4);
    solver.shiftAlongShore(5);
    expect(solver.xCenters[0]).toBeCloseTo(-60 + 5 * 4 + 2, 12);
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx - 5; ix += 1) expect(solver.h[iz * solver.nx + ix]).toBe(before[iz * solver.nx + ix + 5]);
      for (let ix = solver.nx - 5; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        expect(solver.bed[i]).toBe(-spot.depthAt(solver.xCenters[ix], solver.zCenters[iz]));
        const surface = edgeWet[iz] ? edges[iz] : 0.2;
        expect(solver.h[i]).toBeCloseTo(Math.max(0, surface - solver.bed[i]), 12);
      }
    }
    expect(() => solver.shiftAlongShore(30)).toThrow(RangeError);
  });

  it('keeps a lake at rest while the window slides across the headland', () => {
    const spot = createSpot('point', 1);
    const solver = new ShallowWaterSolver(
      { nx: 30, xMin: -200, dx: 4, zEdges: uniformEdges(-200, 20, 55), xBoundary: 'open' }, spot.depthAt, { waterLevel: 0.2 },
    );
    for (let move = 0; move < 40; move += 1) {
      solver.step(1 / 15);
      solver.shiftAlongShore(move % 3 === 2 ? -1 : 3);
    }
    let largestFlow = 0;
    let depthError = 0;
    for (let iz = 0; iz < solver.nz; iz += 1) {
      for (let ix = 0; ix < solver.nx; ix += 1) {
        const i = iz * solver.nx + ix;
        largestFlow = Math.max(largestFlow, Math.abs(solver.qx[i]), Math.abs(solver.qz[i]));
        depthError = Math.max(depthError, Math.abs(solver.h[i] - Math.max(0, 0.2 - solver.bed[i])));
      }
    }
    expect(solver.xCenters[0]).toBeGreaterThan(0);
    expect(largestFlow).toBeLessThan(1e-9);
    expect(depthError).toBeLessThan(1e-9);
  });
```

- [ ] **Step 2: Run tests to verify they fail**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts`
Expected: FAIL — `solver.shiftAlongShore is not a function`.

- [ ] **Step 3: Implement** (add inside `class ShallowWaterSolver`, after `zoneWeightsAlongZ`)

```ts
  /**
   * Move the window `columns` cells along shore (+x when positive) over the
   * fixed spot seabed. Overlapping water is kept exactly. New columns sample the
   * seabed and extend the old edge's surface and velocity, or rest at the still
   * level where the edge was dry. Relaxation weights move with their cells.
   */
  shiftAlongShore(columns: number): void {
    const shift = Math.trunc(columns);
    if (shift === 0) return;
    const { nx, nz } = this;
    if (Math.abs(shift) >= nx) throw new RangeError(`Cannot shift ${shift} columns in a ${nx}-column window`);
    for (let ix = 0; ix < nx; ix += 1) this.xCenters[ix] += shift * this.dx;
    const arrays = [this.bed, this.h, this.qx, this.qz, ...this.zones.map((entry) => entry.zone.weights)];
    for (let iz = 0; iz < nz; iz += 1) {
      const row = iz * nx;
      const oldEdge = shift > 0 ? row + nx - 1 : row;
      const edgeWet = this.h[oldEdge] > this.dryDepth;
      const edgeSurface = edgeWet ? this.h[oldEdge] + this.bed[oldEdge] : this.restLevel;
      const edgeU = edgeWet ? this.qx[oldEdge] / this.h[oldEdge] : 0;
      const edgeW = edgeWet ? this.qz[oldEdge] / this.h[oldEdge] : 0;
      for (const values of arrays) {
        if (shift > 0) values.copyWithin(row, row + shift, row + nx);
        else values.copyWithin(row - shift, row, row + nx + shift);
      }
      const keptEdge = shift > 0 ? row + nx - 1 - shift : row - shift;
      const start = shift > 0 ? nx - shift : 0;
      const end = shift > 0 ? nx : -shift;
      for (let ix = start; ix < end; ix += 1) {
        const i = row + ix;
        this.bed[i] = -this.depthAt(this.xCenters[ix], this.zCenters[iz]);
        const depth = Math.max(0, edgeSurface - this.bed[i]);
        const wet = depth > this.dryDepth;
        this.h[i] = depth;
        this.qx[i] = wet ? depth * edgeU : 0;
        this.qz[i] = wet ? depth * edgeW : 0;
        for (const entry of this.zones) entry.zone.weights[i] = entry.zone.weights[keptEdge];
      }
    }
  }
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npx vitest run src/wave/ShallowWaterSolver.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/wave/ShallowWaterSolver.ts src/wave/ShallowWaterSolver.test.ts
git commit -m "feat: slide the solver window along shore over the spot seabed"
```

---

### Task 5: Record P2b-1

- [ ] In `docs/research/wave-formation-plan.md` §3.3, add the measured post-optimization ms per step to the stage 1 row. In `ROADMAP.md`, split P2b into P2b-1 (checked: performance, open boundaries, stretched grid, sliding window) and P2b-2 (unchecked: sea-state relaxation target with model-consistent dispersion and precomputed phases, per-column WKB warm start, skip-to-set). State whether the 4 ms budget is met. If it isn't, give the next optimization lever as a P2b-2 item.
- [ ] Commit: `git add docs/research/wave-formation-plan.md ROADMAP.md docs/superpowers/plans/2026-09-25-p2b1-solver-performance-and-window.md && git commit -m "docs: record P2b-1 solver performance and window"`
