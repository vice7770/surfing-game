# P2c-1 Surf-Zone Simulation and Rendering Building Blocks

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build every module the view-only physical mode needs (the user chose option (a) for P2c), each tested in Node. P2c-2 then wires them into `main.ts` and the Wave Lab.

**Architecture:**
- `SurfZoneSimulation` assembles:
  - a spot seabed inside a numerical wave tank (flat offshore depth blending into the spot),
  - a seeded `SeaState` with shallow-water dispersion,
  - the stretched `ShallowWaterSolver` with open along-shore edges,
  - a `SeaStateBoundary` zone,
  - a WKB warm start timed by `planSetRun`, then a CFL-limited spin-up.

  It samples the surface bilinearly and resamples it to a uniform render grid.
- `WaterSurface` takes a `SurfaceSource` (the grid plus a `write(data)` of height and foam per node). `LegacySurfaceSource` holds the old per-node foam rule. `PhysicalSurfaceSource` wraps the simulation.
- `SpotSeabed` meshes the spot bed.
- `SpectatorCamera` offers overview, profile and below views.

**Tech Stack:** TypeScript 5.9 strict, Three.js 0.186, Vitest 5.

## Global Constraints

- The legacy game stays the default and plays exactly as before, and every existing test passes.
- The physical mode is view-only (no board coupling) until P4; the legacy Wave speed slider stays for the legacy mode.
- Determinism: a seed and its settings reproduce the simulation bit for bit.
- Commit on `feat/wave-formation-p1-sea-state`; do not push.

---

### Task 1: Canyon clear of the tank boundary, and bilinear sampling of solver fields

**Files:**
- Modify: `src/wave/Bathymetry.ts` (`CANYON.fadeStart` 260 → 200, `fadeEnd` 320 → 250)
- Modify: `src/wave/ShallowWaterSolver.ts` (add `sampleCentered`)
- Test: `src/wave/Bathymetry.test.ts`, `src/wave/ShallowWaterSolver.test.ts`

- [ ] **Step 1: Write the failing tests**

In `src/wave/Bathymetry.test.ts`, change the canyon fade check to the tank's zone line:

```ts
    expect(Math.abs(canyon.depthAt(CANYON.axisX, -270) - canyon.depthAt(CANYON.axisX + 120, -270))).toBeLessThan(0.05);
```

Append to `src/wave/ShallowWaterSolver.test.ts` (inside the `describe`):

```ts
  it('samples cell-centred fields bilinearly on the stretched grid', () => {
    const solver = new ShallowWaterSolver({ nx: 6, xMin: 0, dx: 2, zEdges: stretchedEdges(-40, 10, -10, 1, 3) }, (x, z) => 5 + 0.1 * x - 0.05 * z);
    const ix = 2;
    const iz = 20;
    const i = iz * solver.nx + ix;
    expect(solver.sampleCentered(solver.bed, solver.xCenters[ix], solver.zCenters[iz])).toBe(solver.bed[i]);
    const x = 0.5 * (solver.xCenters[ix] + solver.xCenters[ix + 1]);
    const z = 0.5 * (solver.zCenters[iz] + solver.zCenters[iz + 1]);
    const expected = 0.25 * (solver.bed[i] + solver.bed[i + 1] + solver.bed[i + solver.nx] + solver.bed[i + solver.nx + 1]);
    expect(solver.sampleCentered(solver.bed, x, z)).toBeCloseTo(expected, 12);
    expect(solver.sampleCentered(solver.bed, -100, -100)).toBe(solver.bed[0]);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/wave/ShallowWaterSolver.test.ts`
Expected: FAIL. The canyon is still present at 270 m offshore, and `sampleCentered` is not a function.

- [ ] **Step 3: Implement**

In `src/wave/Bathymetry.ts`: `export const CANYON = { axisX: 0, halfWidth: 30, depth: 14, head: 60, fullAt: 160, fadeStart: 200, fadeEnd: 250 };`

In `src/wave/ShallowWaterSolver.ts`, add after `cellIndex`:

```ts
  /** Bilinear sample of a cell-centred field at (x, z), clamped to the outermost centres. */
  sampleCentered(values: Float64Array, x: number, z: number): number {
    const gx = Math.min(this.nx - 1, Math.max(0, (x - this.xCenters[0]) / this.dx));
    const ix = Math.min(this.nx - 2, Math.floor(gx));
    const tx = gx - ix;
    const iz = this.rowBelow(z);
    const tz = Math.min(1, Math.max(0, (z - this.zCenters[iz]) / (this.zCenters[iz + 1] - this.zCenters[iz])));
    const i = iz * this.nx + ix;
    return (values[i] * (1 - tx) + values[i + 1] * tx) * (1 - tz)
      + (values[i + this.nx] * (1 - tx) + values[i + this.nx + 1] * tx) * tz;
  }

  /** Largest row whose centre is at or below z, clamped to [0, nz − 2]. */
  rowBelow(z: number): number {
    let low = 0;
    let high = this.nz - 1;
    while (high - low > 1) {
      const middle = (low + high) >> 1;
      if (this.zCenters[middle] <= z) low = middle;
      else high = middle;
    }
    return Math.min(low, this.nz - 2);
  }
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/wave/Bathymetry.test.ts src/wave/ShallowWaterSolver.test.ts && npx tsc -b`
Expected: PASS.

```bash
git add src/wave/Bathymetry.ts src/wave/Bathymetry.test.ts src/wave/ShallowWaterSolver.ts src/wave/ShallowWaterSolver.test.ts
git commit -m "feat: sample solver fields bilinearly and clear the canyon from the tank edge"
```

---

### Task 2: `SurfZoneSimulation`

**Files:**
- Create: `src/wave/SurfZoneSimulation.ts`
- Test: `src/wave/SurfZoneSimulation.test.ts`

**Interfaces:**
- Produces:
  - `TANK`, `OFFSHORE_DEPTH`, `tankDepth(spot, offshoreDepth, x, z)`
  - `interface SurfZoneConfig`
  - `interface RenderGrid { xMin; zMin; spacing; nx; nz }`
  - `class SurfZoneSimulation`, with:
    - `constructor(config)`
    - fields `spot`, `sea`, `solver`, `plan`, `config`, `lastStepMs`
    - getters `seaTime`, `timeToSet`, `windowXMin`
    - `step(dt)`, `heightAt(x, z)`, `bedAt(x, z)`, `renderGrid(spacing)`, `writeUniformSurface(data, grid)`, `breakPoint()`

- [ ] **Step 1: Write the failing test** — `src/wave/SurfZoneSimulation.test.ts`

```ts
import { describe, expect, it } from 'vitest';
import { SurfZoneSimulation, TANK, type SurfZoneConfig } from './SurfZoneSimulation';

const small: Omit<SurfZoneConfig, 'spot'> = {
  seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 10, spreading: 12, tide: 0,
  componentCount: 12, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('SurfZoneSimulation', () => {
  it('builds a finite, wave-filled surf zone for every spot and hands over before the set', () => {
    for (const spot of ['beach', 'point', 'reef', 'canyon'] as const) {
      const simulation = new SurfZoneSimulation({ ...small, spot });
      const { solver } = simulation;
      let finite = true;
      let largest = 0;
      for (let i = 0; i < solver.h.length; i += 1) {
        finite &&= Number.isFinite(solver.h[i]) && solver.h[i] >= 0 && Number.isFinite(solver.qz[i]);
        const z = solver.zCenters[Math.floor(i / solver.nx)];
        if (z > TANK.zoneInner && z < TANK.blendEnd && solver.h[i] > 0) largest = Math.max(largest, Math.abs(solver.surfaceAt(i)));
      }
      expect(finite).toBe(true);
      expect(largest).toBeGreaterThan(0.25 * small.significantHeight);
      expect(simulation.timeToSet).toBeCloseTo(25, 6);
    }
  });

  it('replays a seed exactly and changes with another', () => {
    const run = (seed: number) => {
      const simulation = new SurfZoneSimulation({ ...small, spot: 'beach', seed });
      for (let frame = 0; frame < 30; frame += 1) simulation.step(1 / 30);
      return Array.from(simulation.solver.h);
    };
    expect(run(3)).toEqual(run(3));
    expect(run(4)).not.toEqual(run(3));
  });

  it('renders the surface it samples, with dry land tucked under the bed', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const grid = simulation.renderGrid(1);
    const data = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(data, grid);
    let wetChecked = 0;
    let dryChecked = 0;
    for (let iz = 0; iz < grid.nz; iz += 7) {
      for (let ix = 0; ix < grid.nx; ix += 3) {
        const x = grid.xMin + ix * grid.spacing;
        const z = grid.zMin + iz * grid.spacing;
        const height = data[(iz * grid.nx + ix) * 2];
        if (simulation.solver.sampleCentered(simulation.solver.h, x, z) > 0.01) {
          expect(height).toBeCloseTo(simulation.heightAt(x, z), 5);
          wetChecked += 1;
        } else {
          expect(height).toBeLessThan(simulation.bedAt(x, z));
          dryChecked += 1;
        }
      }
    }
    expect(wetChecked).toBeGreaterThan(100);
    expect(dryChecked).toBeGreaterThan(5);
  });

  it('finds the break line where the still depth is Hs / 0.78', () => {
    const simulation = new SurfZoneSimulation({ ...small, spot: 'beach' });
    const point = simulation.breakPoint();
    expect(simulation.spot.depthAt(point.x, point.z)).toBeCloseTo(1.4 / 0.78, 1);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts`
Expected: FAIL — cannot resolve `./SurfZoneSimulation`.

- [ ] **Step 3: Implement** — `src/wave/SurfZoneSimulation.ts`

```ts
import { createSpot, smoothstep, type SpotName, type SurfSpot } from './Bathymetry';
import { shallowWaterWaveNumber } from './dispersion';
import { SeaState } from './SeaState';
import { SeaStateBoundary } from './SeaStateBoundary';
import { ShallowWaterSolver, stretchedEdges } from './ShallowWaterSolver';
import { BREAKER_INDEX } from './SwellReadout';
import { planSetRun, warmStart, type SetRunPlan } from './warmStart';

export interface SurfZoneConfig {
  spot: SpotName;
  seed: number;
  /** Offshore significant wave height Hs, m. */
  significantHeight: number;
  peakPeriod: number;
  /** Mean direction from shore-normal, degrees (positive toward +x). */
  directionDegrees: number;
  /** cos-2s spreading exponent s. */
  spreading: number;
  /** Still-water level above datum, m. */
  tide: number;
  componentCount?: number;
  /** Along-shore window width, m. */
  alongShore?: number;
  dx?: number;
  fineSpacing?: number;
  coarseSpacing?: number;
  spinUpPeriods?: number;
  /** Seconds between hand-over and the next set peak at the zone. */
  lead?: number;
}

export interface RenderGrid {
  xMin: number;
  zMin: number;
  spacing: number;
  nx: number;
  nz: number;
}

/** Wave-tank layout across shore, m (z increases toward the beach). */
export const TANK = { offshore: -330, zoneInner: -270, blendEnd: -190, fineFrom: -150, shore: 30 };

/** Flat tank bed offshore of each spot's blend, m below datum. */
export const OFFSHORE_DEPTH: Record<SpotName, number> = { beach: 5, point: 8, reef: 10, canyon: 5 };

/** Spot seabed with a flat offshore floor under the relaxation zone, blended over TANK.zoneInner…blendEnd. */
export function tankDepth(spot: SurfSpot, offshoreDepth: number, x: number, z: number): number {
  const toSpot = smoothstep(TANK.zoneInner, TANK.blendEnd, z);
  return offshoreDepth + (spot.depthAt(x, z) - offshoreDepth) * toSpot;
}

const WET = 0.01;

/**
 * Stage 1 physical surf zone for one spot: a seeded sea enters through an
 * offshore relaxation zone into the stretched finite-volume solver, which
 * starts from a warm WKB field a set's lead time before its peak.
 */
export class SurfZoneSimulation {
  readonly spot: SurfSpot;
  readonly sea: SeaState;
  readonly solver: ShallowWaterSolver;
  readonly plan: SetRunPlan;
  lastStepMs = 0;
  private readonly seaTimeOffset: number;
  private mapping?: {
    grid: RenderGrid; xMin: number; columns: Int32Array; columnWeights: Float64Array;
    rows: Int32Array; rowWeights: Float64Array; heights: Float64Array; wet: Uint8Array;
  };

  constructor(readonly config: SurfZoneConfig) {
    this.spot = createSpot(config.spot, config.seed);
    const offshoreDepth = OFFSHORE_DEPTH[config.spot];
    const alongShore = config.alongShore ?? 160;
    const dx = config.dx ?? 1;
    this.solver = new ShallowWaterSolver(
      {
        nx: Math.round(alongShore / dx), xMin: -alongShore / 2, dx, xBoundary: 'open',
        zEdges: stretchedEdges(TANK.offshore, TANK.shore, TANK.fineFrom, config.fineSpacing ?? 1, config.coarseSpacing ?? 4),
      },
      (x, z) => tankDepth(this.spot, offshoreDepth, x, z),
      { waterLevel: config.tide },
    );
    this.sea = SeaState.fromSpectrum({
      significantHeight: config.significantHeight,
      peakPeriod: config.peakPeriod,
      direction: (config.directionDegrees * Math.PI) / 180,
      spreading: config.spreading,
      componentCount: config.componentCount ?? 24,
      depth: offshoreDepth + config.tide,
    }, config.seed, shallowWaterWaveNumber);
    const spinUp = (config.spinUpPeriods ?? 2) * config.peakPeriod;
    this.plan = planSetRun(this.sea, 0, TANK.zoneInner, 0, config.lead ?? 25, spinUp);
    this.seaTimeOffset = this.plan.warmStartSeaTime;
    warmStart(this.solver, this.sea, { referenceZ: TANK.zoneInner, seaTime: this.plan.warmStartSeaTime });
    this.solver.addRelaxationZone(new SeaStateBoundary(
      this.solver, this.sea, this.solver.zoneWeightsAlongZ(TANK.zoneInner, TANK.offshore), this.seaTimeOffset,
    ));
    // Settle the nonlinear shape at the CFL limit, re-checking stability every quarter second.
    while (this.solver.time < spinUp - 1e-9) this.solver.step(Math.min(0.25, spinUp - this.solver.time));
  }

  get seaTime(): number {
    return this.solver.time + this.seaTimeOffset;
  }

  /** Seconds until the planned set peaks at the offshore zone line (negative once it has passed). */
  get timeToSet(): number {
    return this.plan.setPeakSeaTime - this.seaTime;
  }

  get windowXMin(): number {
    return this.solver.xCenters[0] - 0.5 * this.solver.dx;
  }

  step(dt: number): void {
    const start = performance.now();
    this.solver.step(dt);
    this.lastStepMs = performance.now() - start;
  }

  /** Water surface elevation, m; on dry land this is the bed. */
  heightAt(x: number, z: number): number {
    return this.solver.sampleCentered(this.solver.h, x, z) + this.bedAt(x, z);
  }

  bedAt(x: number, z: number): number {
    return this.solver.sampleCentered(this.solver.bed, x, z);
  }

  /** Uniform render grid covering the window and the whole tank. */
  renderGrid(spacing: number): RenderGrid {
    const width = this.solver.nx * this.solver.dx;
    return {
      xMin: this.windowXMin,
      zMin: TANK.offshore,
      spacing,
      nx: Math.round(width / spacing) + 1,
      nz: Math.round((TANK.shore - TANK.offshore) / spacing) + 1,
    };
  }

  /**
   * Resample the water to interleaved (height, foam) per render node. Dry nodes
   * sit 5 cm under the bed so the seabed mesh hides them. Foam here is only the
   * steep-slope tint; breaking foam arrives with P3.
   */
  writeUniformSurface(data: Float32Array, grid: RenderGrid): void {
    const mapping = this.mappingFor(grid);
    const { h, bed, nx } = this.solver;
    const { columns, columnWeights, rows, rowWeights, heights, wet } = mapping;
    for (let r = 0; r < grid.nz; r += 1) {
      const row = rows[r] * nx;
      const tz = rowWeights[r];
      for (let c = 0; c < grid.nx; c += 1) {
        const i = row + columns[c];
        const tx = columnWeights[c];
        const depth = (h[i] * (1 - tx) + h[i + 1] * tx) * (1 - tz) + (h[i + nx] * (1 - tx) + h[i + nx + 1] * tx) * tz;
        const bottom = (bed[i] * (1 - tx) + bed[i + 1] * tx) * (1 - tz) + (bed[i + nx] * (1 - tx) + bed[i + nx + 1] * tx) * tz;
        const k = r * grid.nx + c;
        wet[k] = depth > WET ? 1 : 0;
        heights[k] = wet[k] ? depth + bottom : bottom - 0.05;
      }
    }
    const inverse = 1 / (2 * grid.spacing);
    for (let r = 0; r < grid.nz; r += 1) {
      for (let c = 0; c < grid.nx; c += 1) {
        const k = r * grid.nx + c;
        data[k * 2] = heights[k];
        if (!wet[k] || r === 0 || c === 0 || r === grid.nz - 1 || c === grid.nx - 1) {
          data[k * 2 + 1] = 0;
          continue;
        }
        const slope = Math.hypot((heights[k + 1] - heights[k - 1]) * inverse, (heights[k + grid.nx] - heights[k - grid.nx]) * inverse);
        data[k * 2 + 1] = Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5));
      }
    }
  }

  /** Where the still depth first reaches Hs / γ on the x = 0 transect: the camera's break focus. */
  breakPoint(): { x: number; z: number } {
    const target = this.config.significantHeight / BREAKER_INDEX;
    for (let z = TANK.blendEnd; z < TANK.shore; z += 0.5) {
      if (this.spot.depthAt(0, z) + this.config.tide <= target) return { x: 0, z };
    }
    return { x: 0, z: TANK.fineFrom };
  }

  private mappingFor(grid: RenderGrid) {
    const { solver } = this;
    const size = grid.nx * grid.nz;
    let mapping = this.mapping;
    if (!mapping || mapping.grid.nx !== grid.nx || mapping.grid.nz !== grid.nz
      || mapping.grid.spacing !== grid.spacing || mapping.grid.zMin !== grid.zMin) {
      const rows = new Int32Array(grid.nz);
      const rowWeights = new Float64Array(grid.nz);
      for (let r = 0; r < grid.nz; r += 1) {
        const z = grid.zMin + r * grid.spacing;
        const iz = solver.rowBelow(z);
        rows[r] = iz;
        rowWeights[r] = Math.min(1, Math.max(0, (z - solver.zCenters[iz]) / (solver.zCenters[iz + 1] - solver.zCenters[iz])));
      }
      mapping = {
        grid: { ...grid }, xMin: Number.NaN, columns: new Int32Array(grid.nx), columnWeights: new Float64Array(grid.nx),
        rows, rowWeights, heights: new Float64Array(size), wet: new Uint8Array(size),
      };
      this.mapping = mapping;
    }
    if (mapping.xMin !== grid.xMin) {
      for (let c = 0; c < grid.nx; c += 1) {
        const gx = Math.min(solver.nx - 1, Math.max(0, (grid.xMin + c * grid.spacing - solver.xCenters[0]) / solver.dx));
        const ix = Math.min(solver.nx - 2, Math.floor(gx));
        mapping.columns[c] = ix;
        mapping.columnWeights[c] = gx - ix;
      }
      mapping.xMin = grid.xMin;
    }
    return mapping;
  }
}
```

The column mapping depends on the solver window as well as `grid.xMin`. `PhysicalSurfaceSource` keeps `grid.xMin` equal to `windowXMin`, so a window shift always changes it and refreshes the columns.

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/wave/SurfZoneSimulation.test.ts && npx tsc -b`
Expected: PASS.

```bash
git add src/wave/SurfZoneSimulation.ts src/wave/SurfZoneSimulation.test.ts
git commit -m "feat: assemble a stage 1 physical surf zone for each spot"
```

---

### Task 3: Surface sources for `WaterSurface`

**Files:**
- Modify: `src/scene/WaterSurface.ts` (it takes a `SurfaceSource`; the geometry and texture follow the source grid)
- Create: `src/scene/LegacySurfaceSource.ts`, `src/scene/PhysicalSurfaceSource.ts`
- Modify: `src/scene/WaterSurface.test.ts` (construct through `LegacySurfaceSource`; add a rebuild test), `src/main.ts` (use `LegacySurfaceSource`)

**Interfaces:**
- Produces:
  - `interface SurfaceSource { readonly grid: SurfaceGrid; readonly waveHeight: number; write(data: Float32Array): void }`
  - `new WaterSurface(source)`, `WaterSurface.setSource(source)`, getter `grid`, field `surfaceData`
  - `new LegacySurfaceSource(wave)`
  - `new PhysicalSurfaceSource(simulation, spacing = 1)`

- [ ] **Step 1: Write the failing tests.** In `src/scene/WaterSurface.test.ts`:
  - add `import { LegacySurfaceSource } from './LegacySurfaceSource';`, `import { PhysicalSurfaceSource } from './PhysicalSurfaceSource';` and `import { SurfZoneSimulation } from '../wave/SurfZoneSimulation';`
  - replace both `new WaterSurface(wave)` with `new WaterSurface(new LegacySurfaceSource(wave))`
  - append inside the `describe`:

```ts
  it('rebuilds its mesh and texture for a differently sized physical source', () => {
    const wave = new InteractiveWaterField(7, { ...DEFAULT_WAVE_SETTINGS });
    const surface = new WaterSurface(new LegacySurfaceSource(wave));
    const simulation = new SurfZoneSimulation({
      spot: 'beach', seed: 3, significantHeight: 1.4, peakPeriod: 9, directionDegrees: 0, spreading: 12, tide: 0,
      componentCount: 8, alongShore: 40, dx: 2, fineSpacing: 2, coarseSpacing: 4, spinUpPeriods: 1,
    });
    surface.setSource(new PhysicalSurfaceSource(simulation, 2));
    surface.update();
    expect(surface.grid.nx).toBe(21);
    expect(surface.surfaceData.length).toBe(surface.grid.nx * surface.grid.nz * 2);
    expect(surface.mesh.geometry.getAttribute('position').count).toBe(surface.grid.nx * surface.grid.nz);
    expect(surface.mesh.position.x).toBeCloseTo(surface.grid.xMin + 20, 9);
    simulation.solver.shiftAlongShore(3);
    surface.update();
    expect(surface.grid.xMin).toBeCloseTo(-20 + 6, 9);
  });
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scene/WaterSurface.test.ts`
Expected: FAIL — cannot resolve `./LegacySurfaceSource`.

- [ ] **Step 3: Implement**

`src/scene/LegacySurfaceSource.ts`:

```ts
import type { InteractiveWaterField } from '../wave/WaveModel';
import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** The legacy field's node heights plus its decaying crest-foam memory. */
export class LegacySurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid;
  private readonly foamMemory: Float32Array;
  private lastWaveTime = 0;
  private lastZMin: number;

  constructor(private readonly wave: InteractiveWaterField) {
    this.grid = { xMin: wave.xMin, zMin: wave.zMin, spacing: wave.spacing, nx: wave.nx, nz: wave.nz };
    this.foamMemory = new Float32Array(wave.nx * wave.nz);
    this.lastZMin = wave.zMin;
  }

  get waveHeight(): number {
    return this.wave.settings.height;
  }

  write(data: Float32Array): void {
    const wave = this.wave;
    if (wave.zMin !== this.lastZMin) {
      const cells = Math.round((wave.zMin - this.lastZMin) / wave.spacing) * wave.nx;
      this.foamMemory.copyWithin(0, cells);
      this.foamMemory.fill(0, this.foamMemory.length - cells);
      this.lastZMin = wave.zMin;
    }
    const crestZ = wave.crestZ();
    const elapsed = Math.max(0, wave.time - this.lastWaveTime);
    this.lastWaveTime = wave.time;
    const foamDecay = Math.exp(-elapsed / 2.2);
    wave.copyHeights(data, 2, 0);
    for (let iz = 0; iz < wave.nz; iz += 1) {
      const z = wave.zMin + iz * wave.spacing;
      for (let ix = 0; ix < wave.nx; ix += 1) {
        const i = iz * wave.nx + ix;
        const x = wave.xMin + ix * wave.spacing;
        const slope = wave.slopeMagnitude(x, z);
        const crestDistance = (z - wave.crestZAt(x, crestZ)) / 1.15;
        const narrowFoam = Math.exp(-0.5 * crestDistance * crestDistance);
        const activeFoam = Math.max(
          Math.max(0, Math.min(0.12, (slope - 0.12) * 0.5)),
          wave.breakingAt(x, z, slope, crestZ) * narrowFoam * 0.88,
        );
        this.foamMemory[i] = Math.max(activeFoam, this.foamMemory[i] * foamDecay);
        data[i * 2 + 1] = Math.max(activeFoam, this.foamMemory[i] * 0.65);
      }
    }
    this.grid.zMin = wave.zMin;
  }
}
```

`src/scene/PhysicalSurfaceSource.ts`:

```ts
import type { SurfZoneSimulation } from '../wave/SurfZoneSimulation';
import type { SurfaceGrid, SurfaceSource } from './WaterSurface';

/** The physical surf zone resampled onto a uniform render grid that follows the sliding window. */
export class PhysicalSurfaceSource implements SurfaceSource {
  readonly grid: SurfaceGrid;

  constructor(private readonly simulation: SurfZoneSimulation, spacing = 1) {
    this.grid = simulation.renderGrid(spacing);
  }

  get waveHeight(): number {
    return this.simulation.config.significantHeight;
  }

  write(data: Float32Array): void {
    this.grid.xMin = this.simulation.windowXMin;
    this.simulation.writeUniformSurface(data, this.grid);
  }
}
```

In `src/scene/WaterSurface.ts`, replace the class (keep `SurfaceGrid`, the two samplers and both GLSL strings unchanged) with:

```ts
/** Supplies interleaved (height, foam) for every node of a uniform render grid. */
export interface SurfaceSource {
  readonly grid: SurfaceGrid;
  /** Wave height used to scale the crest tint, m. */
  readonly waveHeight: number;
  write(data: Float32Array): void;
}

export class WaterSurface {
  readonly mesh: Mesh<PlaneGeometry, MeshPhysicalMaterial>;
  /** Interleaved (height, foam) per grid node, uploaded as an RG float texture each frame. */
  surfaceData: Float32Array;
  private texture: DataTexture;
  private readonly uniforms: Record<string, { value: unknown }>;

  constructor(private source: SurfaceSource) {
    const grid = source.grid;
    this.surfaceData = new Float32Array(grid.nx * grid.nz * 2);
    this.texture = WaterSurface.createTexture(this.surfaceData, grid);
    this.uniforms = {
      waterSurface: { value: this.texture },
      waterGrid: { value: new Vector4(grid.xMin, grid.zMin, grid.spacing, 0) },
      waterGridSize: { value: new Vector2(grid.nx, grid.nz) },
      waterWaveHeight: { value: source.waveHeight },
      waterBaseColor: { value: new Color('#0c8f9d') },
      waterCrestColor: { value: new Color('#4fc1b5') },
      waterFoamColor: { value: new Color('#d8f2e9') },
    };
    const material = new MeshPhysicalMaterial({
      color: '#ffffff',
      roughness: 0.62,
      metalness: 0.01,
      clearcoat: 0.12,
      clearcoatRoughness: 0.55,
      side: DoubleSide,
      flatShading: false,
    });
    material.onBeforeCompile = (shader) => {
      Object.assign(shader.uniforms, this.uniforms);
      shader.vertexShader = shader.vertexShader
        .replace('#include <common>', `#include <common>\n${waterVertexPars}`)
        .replace('#include <beginnormal_vertex>', waterBeginNormal)
        .replace('#include <begin_vertex>', 'vec3 transformed = vec3( position );\ntransformed.y = waterHeight;');
      shader.fragmentShader = shader.fragmentShader
        .replace('#include <common>', '#include <common>\nvarying vec3 vWaterColor;')
        .replace('#include <color_fragment>', 'diffuseColor.rgb *= vWaterColor;');
    };
    material.customProgramCacheKey = () => 'breakline-water-surface';
    this.mesh = new Mesh(WaterSurface.createGeometry(grid), material);
    this.mesh.frustumCulled = false;
    this.update();
  }

  get grid(): SurfaceGrid {
    return this.source.grid;
  }

  update(): void {
    this.source.write(this.surfaceData);
    const grid = this.source.grid;
    (this.uniforms.waterGrid.value as Vector4).set(grid.xMin, grid.zMin, grid.spacing, 0);
    this.uniforms.waterWaveHeight.value = this.source.waveHeight;
    this.mesh.position.set(grid.xMin + ((grid.nx - 1) * grid.spacing) / 2, 0, grid.zMin + ((grid.nz - 1) * grid.spacing) / 2);
    this.texture.needsUpdate = true;
  }

  /** Switch to another water source, rebuilding the mesh and texture if its grid differs. */
  setSource(source: SurfaceSource): void {
    const previous = this.source.grid;
    this.source = source;
    const grid = source.grid;
    if (previous.nx === grid.nx && previous.nz === grid.nz && previous.spacing === grid.spacing) return;
    this.surfaceData = new Float32Array(grid.nx * grid.nz * 2);
    this.texture.dispose();
    this.texture = WaterSurface.createTexture(this.surfaceData, grid);
    this.uniforms.waterSurface.value = this.texture;
    (this.uniforms.waterGridSize.value as Vector2).set(grid.nx, grid.nz);
    this.mesh.geometry.dispose();
    this.mesh.geometry = WaterSurface.createGeometry(grid);
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    this.texture.dispose();
    this.mesh.material.dispose();
  }

  private static createTexture(data: Float32Array, grid: SurfaceGrid): DataTexture {
    const texture = new DataTexture(data, grid.nx, grid.nz, RGFormat, FloatType);
    texture.magFilter = NearestFilter;
    texture.minFilter = NearestFilter;
    texture.generateMipmaps = false;
    return texture;
  }

  /** Static vertices on the grid nodes, centred on the mesh origin; the vertex shader displaces them. */
  private static createGeometry(grid: SurfaceGrid): PlaneGeometry {
    const geometry = new PlaneGeometry((grid.nx - 1) * grid.spacing, (grid.nz - 1) * grid.spacing, grid.nx - 1, grid.nz - 1);
    geometry.rotateX(-Math.PI / 2);
    return geometry;
  }
}
```

In `src/main.ts`:
- add `import { LegacySurfaceSource } from './scene/LegacySurfaceSource';`
- construct with `this.water = new WaterSurface(new LegacySurfaceSource(this.wave));`
- in `startRun`, replace `this.water.setWave(this.wave);` with `this.water.setSource(new LegacySurfaceSource(this.wave));`

- [ ] **Step 4: Verify and commit**

Run: `npm test && npm run build`
Expected: all tests pass (the four G1 surface tests keep their exact assertions through `LegacySurfaceSource`), and the build succeeds.

```bash
git add src/scene/WaterSurface.ts src/scene/LegacySurfaceSource.ts src/scene/PhysicalSurfaceSource.ts src/scene/WaterSurface.test.ts src/main.ts
git commit -m "refactor: feed the water surface from legacy or physical sources"
```

---

### Task 4: Spot seabed mesh and spectator camera

**Files:**
- Create: `src/scene/SpotSeabed.ts`, `src/scene/SpectatorCamera.ts`
- Test: `src/scene/SpotSeabed.test.ts`, `src/scene/SpectatorCamera.test.ts`

**Interfaces:**
- Produces:
  - `class SpotSeabed { readonly mesh; setDepth(depthAt, xMin, zMin, width, length, spacing?) }`
  - `type SpectatorView = 'overview' | 'profile' | 'below'`
  - `interface SpectatorScene { heightAt(x, z): number; bedAt(x, z): number }`
  - `class SpectatorCamera { readonly camera; readonly view; setView(view); update(scene, focus, dt); resize(aspect) }`

- [ ] **Step 1: Write the failing tests**

`src/scene/SpotSeabed.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { Vector3 } from 'three';
import { SpotSeabed } from './SpotSeabed';

describe('SpotSeabed', () => {
  it('places every vertex on the spot bed', () => {
    const depthAt = (x: number, z: number) => 3 + 0.02 * x - 0.03 * z;
    const seabed = new SpotSeabed();
    seabed.setDepth(depthAt, -40, -120, 80, 150, 5);
    const positions = seabed.mesh.geometry.getAttribute('position');
    const world = new Vector3();
    for (let i = 0; i < positions.count; i += 37) {
      world.fromBufferAttribute(positions, i).add(seabed.mesh.position);
      expect(world.y).toBeCloseTo(-depthAt(world.x, world.z), 9);
    }
    expect(seabed.mesh.visible).toBe(true);
  });
});
```

`src/scene/SpectatorCamera.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { SpectatorCamera } from './SpectatorCamera';

const scene = { heightAt: () => 0.2, bedAt: () => -3 };

describe('SpectatorCamera', () => {
  it('frames the break from the cliff, at the water line, and from below the surface', () => {
    const spectator = new SpectatorCamera();
    const focus = { x: 5, z: -60 };
    spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.y).toBeGreaterThan(10);
    spectator.setView('profile');
    spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.y).toBeCloseTo(1.4, 9);
    spectator.setView('below');
    spectator.update(scene, focus, 1 / 60);
    expect(spectator.camera.position.y).toBeLessThan(0.2 - 0.5);
    expect(spectator.camera.position.y).toBeGreaterThan(-3);
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/scene/SpotSeabed.test.ts src/scene/SpectatorCamera.test.ts`
Expected: FAIL — cannot resolve the modules.

- [ ] **Step 3: Implement**

`src/scene/SpotSeabed.ts`:

```ts
import { BufferAttribute, Color, Mesh, MeshBasicMaterial, PlaneGeometry } from 'three';

/** Static seabed of a physical spot, shaded from pale sand in the shallows to deep blue-green. */
export class SpotSeabed {
  readonly mesh: Mesh<PlaneGeometry, MeshBasicMaterial>;
  private readonly shallow = new Color('#d6c69c');
  private readonly deep = new Color('#2f5f66');

  constructor() {
    this.mesh = new Mesh(new PlaneGeometry(1, 1), new MeshBasicMaterial({ vertexColors: true, fog: true }));
    this.mesh.visible = false;
    this.mesh.frustumCulled = false;
  }

  /** Rebuild over a rectangle from a depth function (positive below datum, m). */
  setDepth(depthAt: (x: number, z: number) => number, xMin: number, zMin: number, width: number, length: number, spacing = 2): void {
    const geometry = new PlaneGeometry(width, length, Math.max(1, Math.round(width / spacing)), Math.max(1, Math.round(length / spacing)));
    geometry.rotateX(-Math.PI / 2);
    const centerX = xMin + width / 2;
    const centerZ = zMin + length / 2;
    const positions = geometry.getAttribute('position');
    const colors = new Float32Array(positions.count * 3);
    const color = new Color();
    for (let i = 0; i < positions.count; i += 1) {
      const depth = depthAt(positions.getX(i) + centerX, positions.getZ(i) + centerZ);
      positions.setY(i, -depth);
      color.copy(this.shallow).lerp(this.deep, Math.min(1, Math.max(0, depth / 12)));
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }
    geometry.setAttribute('color', new BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    this.mesh.geometry.dispose();
    this.mesh.geometry = geometry;
    this.mesh.position.set(centerX, 0, centerZ);
    this.mesh.visible = true;
  }
}
```

`src/scene/SpectatorCamera.ts`:

```ts
import { PerspectiveCamera, Vector3 } from 'three';

export type SpectatorView = 'overview' | 'profile' | 'below';

export interface SpectatorScene {
  heightAt(x: number, z: number): number;
  bedAt(x: number, z: number): number;
}

/** View-only camera for the physical surf zone: cliff overview, water-line profile, or underwater. */
export class SpectatorCamera {
  readonly camera = new PerspectiveCamera(52, 1, 0.1, 900);
  private currentView: SpectatorView = 'overview';
  private readonly desired = new Vector3();
  private readonly target = new Vector3();
  private settled = false;

  get view(): SpectatorView {
    return this.currentView;
  }

  /** Change view and cut straight to it, so the camera never drifts through the surface. */
  setView(view: SpectatorView): void {
    this.currentView = view;
    this.settled = false;
  }

  update(scene: SpectatorScene, focus: { x: number; z: number }, dt: number): void {
    if (this.currentView === 'overview') {
      this.desired.set(focus.x + 70, 16, focus.z + 95);
      this.target.set(focus.x, 0, focus.z - 40);
    } else if (this.currentView === 'profile') {
      const x = focus.x + 40;
      this.desired.set(x, scene.heightAt(x, focus.z) + 1.2, focus.z);
      this.target.set(focus.x, 0.6, focus.z);
    } else {
      const z = focus.z - 12;
      const bed = scene.bedAt(focus.x, z);
      const surface = scene.heightAt(focus.x, z);
      this.desired.set(focus.x, Math.max(bed + 0.4, Math.min(surface - 0.8, bed + 1.2)), z);
      this.target.set(focus.x, surface - 0.2, focus.z - 60);
    }
    this.camera.position.lerp(this.desired, this.settled ? 1 - Math.exp(-3 * dt) : 1);
    this.settled = true;
    this.camera.lookAt(this.target);
  }

  resize(aspect: number): void {
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
  }
}
```

- [ ] **Step 4: Verify and commit**

Run: `npx vitest run src/scene/SpotSeabed.test.ts src/scene/SpectatorCamera.test.ts && npx tsc -b`
Expected: PASS.

```bash
git add src/scene/SpotSeabed.ts src/scene/SpectatorCamera.ts src/scene/SpotSeabed.test.ts src/scene/SpectatorCamera.test.ts
git commit -m "feat: add a spot seabed mesh and a spectator camera"
```
