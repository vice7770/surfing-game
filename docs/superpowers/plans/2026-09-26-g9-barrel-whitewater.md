# G9 · Barrel and Whitewater Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:**
- **Part A:** make the barrel read in the Rich look: the void cut per vertex on the GPU, and the lip drawn as a smooth, thick, sky-lit water curtain.
- **Part B:** model breaking whitewater physically (aeration, splash-up, trapped air with collapse and spit, the foam ball, the bubble plume) and draw it in Rich.

**Architecture:**
- **Part A:** the worker sends the page raw render heights plus a small table of flying tubes. One pure carve function (`tubeTable.ts`), interpolated between neighbouring columns, serves the physics, the page's Classic texture and the page's sampler. A GLSL twin cuts the void in the Rich patch. The lip sheet gets a Rich builder (spline-smoothed, as thick as its water) and a Rich material built on the G3 optics.
- **Part B:** new state lives beside the lip in the worker: an aeration field on the solver grid, secondary splash-up strips, and tube collapse with air accounting. It reaches the page through new snapshot buffers and new spray kinds, and is drawn only in Rich.

**Tech Stack:** TypeScript, three r186 (WebGLRenderer, `MeshPhysicalMaterial` with `onBeforeCompile`), vitest, the surf-zone Web Worker.

**Spec:** `docs/superpowers/specs/2026-09-26-g9-barrel-whitewater.md`

## Global Constraints

- Everything drawn is what the physics has. The lip is as thick as its water and the tube as big as its overturn; resolution and shading may improve, sizes never grow.
- Rich only. Classic keeps today's water, far ocean, spray and lip sheet byte for byte: the Classic snapshots in `src/scene/waterLooks.test.ts` extend to `LipSheetMesh` and must never change.
- Part B's physics runs whatever the look. Its drawing is Rich only.
- Whitewater puts no forces on bodies. The tube's collapse is the exception, because it reshapes the existing carve. Splash-up strips never touch the rider.
- Mass is conserved: the lip's water through splash-up, and the tube's air through the collapse (escaped plus entrained equals trapped).
- Every Part B value comes from a measured range, or is marked provisional in code and in `docs/research/whitewater-sources.md`.
- Edits to `main.ts`, `PhysicalMode.ts`, `SurfZoneRunner.ts` and the settings files stay to a few lines each; other sessions work there.
- Performance is measured on the M1 Air and recorded, never a gate.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Merge via PR when ready: Part A as its own PR, then Part B.

## Review Focus

1. **Page carve equals worker carve.** The Classic texture and the page's `heightAt` must be exactly what the worker carves, now that the page carves from raw heights and the tube table (Task A2 test "carves the page's heights exactly as the worker does").
2. **The sliding window.** Tube columns are world columns. The aeration field must follow window shifts like the foam, and the GPU's column index must be rebuilt when the grid's `xMin` moves (Task A3 test "indexes tubes by world column across a window shift"; Task B2 test "follows the window").
3. **Degenerate tubes.** No tubes, more tubes than `TUBE_CAPACITY`, tubes outside the render grid, zero open length, a scale of 0: none may draw holes or throw (Task A1 and A3 tests).
4. **Conservation.** Splash-up must conserve the lip's volume and momentum. Collapse must conserve the trapped air (Task B3 and B4 tests).
5. **Classic spray and lip.** New spray kinds (the foam ball) must not appear in Classic, and Classic's lip must not change (Task B5 test "keeps the foam ball out of the Classic spray"; Task A4 snapshot).

---

## Part A · The barrel look

### Task 1 (A1): The tube table and the interpolated carve

**Files:**
- Create: `src/wave/tubeTable.ts`, `src/wave/tubeTable.test.ts`
- Modify: `src/wave/PlungingLip.ts` (the carve goes through the table; `forEachTubeExtent` goes), `src/wave/SurfZoneSimulation.ts` (`writeUniformSurface(data, grid, carve = true)` uses `carveGrid`)

**Interfaces:**
- Produces:
  ```ts
  export const TUBE_STRIDE = 12; // crestX, crestZ, y, dirX, dirZ, open, length, width, tilt, column, scale, air
  export const TUBE_CAPACITY = 128;
  export function tubeFloor(table: ArrayLike<number>, tube: number, x: number, z: number): number; // floor height, m, or NaN
  export function carveAt(table: ArrayLike<number>, count: number, columnWidth: number, x: number, z: number, surface: number): number;
  export function carveGrid(data: Float32Array, grid: SurfaceGrid, table: ArrayLike<number>, count: number, columnWidth: number): void; // interleaved (height, foam)
  // PlungingLip
  get tubeCount(): number;
  writeTubes(into: Float32Array, capacity: number): number;
  ```

- [ ] **Step 1: Write the failing tests** in `src/wave/tubeTable.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { tubeFloorDepth } from './Overturn';
import { TUBE_STRIDE, carveAt, carveGrid, tubeFloor } from './tubeTable';

const tube = (column: number, over: Partial<Record<'crestX' | 'crestZ' | 'y' | 'open' | 'scale', number>> = {}) => [
  over.crestX ?? column + 0.5, over.crestZ ?? 0, over.y ?? 2, 0, 1, over.open ?? 3, 2, 0.8, 0.6, column, over.scale ?? 1, 0,
];

describe('tube table', () => {
  it('puts the floor where tubeFloorDepth does, ahead of the crest along its travel', () => {
    const table = tube(4);
    expect(tubeFloor(table, 0, 4.5, 0.7)).toBeCloseTo(2 - tubeFloorDepth({ length: 2, width: 0.8, tilt: 0.6 }, 0.7), 12);
    expect(tubeFloor(table, 0, 4.5, -0.1)).toBeNaN();
    expect(tubeFloor(tube(4, { open: 0.5 }), 0, 4.5, 0.7)).toBeNaN();
    expect(tubeFloor(tube(4, { scale: 0 }), 0, 4.5, 0.7)).toBeNaN();
  });

  it('carves a column centre exactly as that column’s tube, and blends linearly toward an uncarved neighbour', () => {
    const table = tube(4);
    const floor = tubeFloor(table, 0, 4.5, 0.7);
    expect(carveAt(table, 1, 1, 4.5, 0.7, 5)).toBeCloseTo(floor, 12);
    expect(carveAt(table, 1, 1, 5.5, 0.7, 5)).toBe(5);
    expect(carveAt(table, 1, 1, 5, 0.7, 5)).toBeCloseTo((floor + 5) / 2, 12);
    expect(carveAt([], 0, 1, 5, 0.7, 5)).toBe(5);
  });

  it('keeps the lower floor where two tubes of one column overlap, and never raises the surface', () => {
    const table = [...tube(4, { y: 2 }), ...tube(4, { y: 1.5 })];
    expect(carveAt(table, 2, 1, 4.5, 0.7, 5)).toBeCloseTo(tubeFloor(table, 1, 4.5, 0.7), 12);
    expect(carveAt(table, 2, 1, 4.5, 0.7, 0)).toBe(0);
  });

  it('carves each render node once, from its raw height, inside the tubes’ reach only', () => {
    const grid = { xMin: 0, zMin: -2, spacing: 1, nx: 10, nz: 6 };
    const data = new Float32Array(grid.nx * grid.nz * 2).fill(5);
    const table = [...tube(4), ...tube(4, { y: 1.5 })];
    carveGrid(data, grid, table, 2, 1);
    for (let j = 0; j < grid.nz; j += 1) {
      for (let i = 0; i < grid.nx; i += 1) {
        const k = (j * grid.nx + i) * 2;
        expect(data[k]).toBeCloseTo(carveAt(table, 2, 1, i, grid.zMin + j, 5), 6);
        expect(data[k + 1]).toBe(5);
      }
    }
  });

  it('packs to TUBE_STRIDE', () => {
    expect(tube(0)).toHaveLength(TUBE_STRIDE);
  });
});
```

- [ ] **Step 2: Run to fail:** `npx vitest run src/wave/tubeTable.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement `tubeTable.ts`:**
  - `tubeFloor`: `ahead = (x − crestX)·dirX + (z − crestZ)·dirZ`; NaN unless `0 ≤ ahead ≤ open` and `scale > 0`; else `y − tubeFloorDepth({ length·scale, width·scale, tilt }, ahead)`, NaN through.
  - `carveAt`: `u = x / columnWidth − 0.5`, `c0 = floor(u)`, `t = u − c0`. `m0` and `m1` start at `surface` and take the min of the finite floors of tubes whose column is `c0` or `c0 + 1`. Return `m0 + (m1 − m0)·t`.
  - `carveGrid`: mark every node inside any tube's reach. The reach is x ∈ ((column − 0.5)·w, (column + 1.5)·w), and z from the crest to `crestZ + dirZ·min(open, length·cos tilt)` padded by one spacing on each side, clamped to the grid. Then carve each marked node once from its raw height. The mark buffer is cached per node count.
- [ ] **Step 4: Rewire `PlungingLip`:**
  - It keeps a growing `Float64Array` table.
  - `refreshTubes()` packs every live strip with a tube: its crest now (`x + dirX·crestSpeed·age`, `z + dirZ·crestSpeed·age`), `y`, its direction, `open = relativeSpeed·age`, its geometry, `column`, `scale = 1` and `air = 0`. It runs after `time` advances at the start of `step()`, and at the end of `launch()`.
  - `carve()` becomes `carveAt(table, tubeCount, solver.dx, x, z, surface)`.
  - `writeTubes(into, capacity)` copies up to `capacity` tubes and returns how many.
  - Delete `forEachTubeExtent`. `SurfZoneSimulation.writeUniformSurface(data, grid, carve = true)` calls `carveGrid` with the lip's table when `carve` is true.
- [ ] **Step 5: Run:** `npx vitest run src/wave`. Expected: PASS. Existing carve tests that sample a column off its centre may now see the interpolation. Update them only to the interpolated value, with a ledger ruling, never by loosening a tolerance.
- [ ] **Step 6: Commit:** `git add src/wave && git commit -m "feat: carve tubes from one table, blended between neighbouring columns"`

### Task 2 (A2): Raw heights and tubes cross to the page, which carves

**Files:**
- Modify:
  - `src/wave/SurfZoneRunner.ts`: `SurfZoneBuffers.tubes` and `tubeCount`; `fill` writes raw heights and packs tubes; `LIP_STRIDE` 7 → 8 adds the parcel's volume.
  - `src/game/SurfZoneWorkerCore.ts`: `transferables`.
  - `src/game/WorkerSurfZone.ts`: `emptyLike`.
  - `src/game/SurfZoneHost.ts`: `SnapshotSampler.heightAt` carves; `SnapshotSurfZone` gets `writeUniformSurface(data, grid, carve = true)`, `writeTubes` and `tubeColumnWidth`.
  - `src/scene/PhysicalSurfaceSource.ts` and the `SurfaceSource` interface in `src/scene/WaterSurface.ts`: `write(data, carve?)`, `writeTubes?`, `tubeColumnWidth?`.
  - `src/scene/WaterSurface.ts`: `update()` asks for raw heights only in Rich with a tube source.
- Test: `src/game/SurfZoneHost.test.ts`, `src/game/WorkerSurfZone.test.ts`

**Interfaces:**
- Consumes: `carveAt`, `carveGrid` and `TUBE_*` (A1).
- Produces:
  ```ts
  interface SurfaceSource { write(data: Float32Array, carve?: boolean): void; writeTubes?(into: Float32Array): number; readonly tubeColumnWidth?: number; }
  interface RenderableSurfZone { writeUniformSurface(data: Float32Array, grid: SurfaceGrid, carve?: boolean): void; writeTubes?(into: Float32Array): number; readonly tubeColumnWidth?: number; }
  ```

- [ ] **Step 1: Write the failing tests.**
  - In `SurfZoneHost.test.ts`: "carves the page's heights exactly as the worker does". Run a `LocalSurfZone` at the practice Reef until `snapshot.tubeCount > 0`, stepping at most 90 s of sea time. Then assert:
    - `SnapshotSurfZone.writeUniformSurface(data, grid)` equals `runner.simulation.writeUniformSurface(expected, grid)` (carved) element for element;
    - `writeUniformSurface(raw, grid, false)` differs from it somewhere, so the snapshot really carries raw heights;
    - `host.heightAt(x, z)` equals `simulation.heightAt(x, z)` to 1e-4 at the first tube's crest, 0.5 m ahead.
  - In `WorkerSurfZone.test.ts`: `transferables(buffers)` includes `buffers.tubes.buffer`.
- [ ] **Step 2: Run to fail:** `npx vitest run src/game/SurfZoneHost.test.ts src/game/WorkerSurfZone.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.**
  - `fill` calls `simulation.writeUniformSurface(buffers.surface, grid, false)` and `buffers.tubeCount = simulation.lip.writeTubes(buffers.tubes, TUBE_CAPACITY)`.
  - Add the tube buffer to `createBuffers`, `transferables` and `emptyLike`.
  - `SnapshotSampler.heightAt` returns `carveAt(snapshot.tubes, snapshot.tubeCount, init.dx, x, z, sampled)`.
  - `SnapshotSurfZone`:
    - `writeUniformSurface` copies, then runs `carveGrid(data, grid, tubes, tubeCount, dx)` unless `carve === false`;
    - `writeTubes` copies and returns the count;
    - `tubeColumnWidth` is `init.dx`.
  - `PhysicalSurfaceSource` passes both through.
  - `WaterSurface.update()` calls `this.source.write(this.surfaceData, !(this.effectiveLook === 'rich' && this.source.writeTubes))`.
  - `LIP_STRIDE` becomes 8, with the parcel's volume at index 7. `buildLipSheet` and the recorder read by the constant.
- [ ] **Step 4: Run:** `npx vitest run src/game src/scene src/wave`. Expected: PASS, with the Classic snapshots unchanged.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: send the page raw heights and the flying tubes, and carve there"`

### Task 3 (A3): The void cut per vertex and per pixel in Rich

**Files:**
- Create: `src/scene/water/tubeCarve.ts`, `src/scene/water/tubeCarve.test.ts`
- Modify: `src/scene/WaterSurface.ts` (tube textures and uniforms; Rich uses `waterCarvedCubic`), `src/scene/water/richWaterGlsl.ts`

**Interfaces:**
- Consumes: `TUBE_STRIDE`, `TUBE_CAPACITY` and `tubeFloor` (A1); `SurfaceSource.writeTubes` and `tubeColumnWidth` (A2).
- Produces:
  ```ts
  export const TUBE_BISECTIONS = 12;
  export function tubeFloorDepthApprox(length: number, width: number, tilt: number, ahead: number): number; // the GLSL twin
  export function packTubeTextures(table: ArrayLike<number>, count: number, grid: SurfaceGrid, columnWidth: number, tubes: Float32Array, columns: Float32Array): { column0: number; count: number };
  export function tubeColumnCount(grid: SurfaceGrid, columnWidth: number): number;
  export const waterTubePars: string; // float waterCarve( vec2 xz, float surface ); vec3 waterCarvedCubic( vec2 xz )
  ```

- [ ] **Step 1: Write the failing tests.**
  - `tubeCarve.test.ts`:
    - `tubeFloorDepthApprox` is within 5 mm of `tubeFloorDepth` over a grid of ahead values and three shapes;
    - `packTubeTextures` sorts tubes by column. Each column's (first, count) texel points at its tubes, the column index follows the grid's `xMin` ("indexes tubes by world column across a window shift": shift `xMin` by 7 m and check `column0` moves by 7);
    - more than 8 tubes in one column keeps the 8 deepest;
    - tubes outside the grid's columns are dropped;
    - `count` beyond `TUBE_CAPACITY` is clamped.
  - `waterLooks.test.ts`: the Rich fragment contains `waterCarvedCubic( vWaterWorld.xz )` and the vertex `waterCarvedCubic( waterXZ )`; the uniforms hold `waterTubeMap` and `waterTubeColumns`; Classic snapshots are unchanged.
- [ ] **Step 2: Run to fail:** `npx vitest run src/scene/water/tubeCarve.test.ts src/scene/waterLooks.test.ts`.
- [ ] **Step 3: Implement.**
  - `tubeFloorDepthApprox` bisects `u` in `TUBE_BISECTIONS` steps, as `tubeFloorDepth` does in 40.
  - `waterTubePars`:
    ```glsl
    uniform sampler2D waterTubeMap;     // 3 RGBA texels per tube, sorted by column
    uniform sampler2D waterTubeColumns; // per column: (first tube, count)
    uniform float waterTubeColumn0;
    uniform float waterTubeColumnWidth;
    uniform float waterTubeCount;
    float waterTubeFloorDepth( float L, float W, float tilt, float ahead ) {
      float c = cos( tilt ); float s = sin( tilt );
      if ( ahead < 0.0 || ahead > L * c ) return -1.0;
      float lo = 0.0; float hi = 1.0;
      for ( int i = 0; i < ${TUBE_BISECTIONS}; i ++ ) {
        float m = 0.5 * ( lo + hi );
        float hw = 1.299038106 * m * sqrt( max( 0.0, 1.0 - m ) );
        if ( L * m * c - W * hw * s < ahead ) lo = m; else hi = m;
      }
      float u = 0.5 * ( lo + hi );
      return W * 0.5 + L * u * s + W * 1.299038106 * u * sqrt( max( 0.0, 1.0 - u ) ) * c;
    }
    float waterTubeFloor( int k, vec2 xz ) {
      vec4 a = texelFetch( waterTubeMap, ivec2( 0, k ), 0 ); // crestX, crestZ, y, dirX
      vec4 b = texelFetch( waterTubeMap, ivec2( 1, k ), 0 ); // dirZ, open, length, width
      vec4 c = texelFetch( waterTubeMap, ivec2( 2, k ), 0 ); // tilt, column, scale, air
      float ahead = ( xz.x - a.x ) * a.w + ( xz.y - a.y ) * b.x;
      if ( ahead < 0.0 || ahead > b.y || c.z <= 0.0 ) return 1e6;
      float depth = waterTubeFloorDepth( b.z * c.z, b.w * c.z, c.x, ahead );
      return depth < 0.0 ? 1e6 : a.z - depth;
    }
    float waterColumnCarve( float column, vec2 xz, float surface ) {
      int c = int( column - waterTubeColumn0 );
      if ( c < 0 || c >= textureSize( waterTubeColumns, 0 ).x ) return surface;
      vec2 span = texelFetch( waterTubeColumns, ivec2( c, 0 ), 0 ).rg;
      float carved = surface;
      for ( int i = 0; i < 8; i ++ ) {
        if ( float( i ) >= span.y ) break;
        carved = min( carved, waterTubeFloor( int( span.x ) + i, xz ) );
      }
      return carved;
    }
    float waterCarve( vec2 xz, float surface ) {
      if ( waterTubeCount < 0.5 ) return surface;
      float u = xz.x / waterTubeColumnWidth - 0.5;
      float c0 = floor( u );
      return mix( waterColumnCarve( c0, xz, surface ), waterColumnCarve( c0 + 1.0, xz, surface ), u - c0 );
    }
    vec3 waterCarvedCubic( vec2 xz ) {
      vec3 s = waterCubic( xz );
      float h = waterCarve( xz, s.x );
      if ( h >= s.x - 1e-4 ) return s;
      const float e = 0.05;
      vec2 ex = vec2( e, 0.0 ); vec2 ez = vec2( 0.0, e );
      float hx = waterCarve( xz + ex, waterCubic( xz + ex ).x );
      float hz = waterCarve( xz + ez, waterCubic( xz + ez ).x );
      return vec3( h, ( hx - h ) / e, ( hz - h ) / e );
    }
    ```
  - `WaterSurface`:
    - holds `tubeTable` (`TUBE_CAPACITY·TUBE_STRIDE`) and two float `DataTexture`s: `waterTubeMap` (RGBA, 3 × `TUBE_CAPACITY`) and `waterTubeColumns` (RG, `tubeColumnCount(grid, w)` × 1, rebuilt in `setSource`);
    - in `update()`, in Rich, it runs `count = source.writeTubes(tubeTable)` and `packTubeTextures(...)`, and sets `waterTubeColumn0`, `waterTubeColumnWidth` and `waterTubeCount`;
    - in Classic, or with no `writeTubes`, `waterTubeCount` is 0.
  - `richBeginNormal` and `richNormalFragment` sample `waterCarvedCubic`; the Rich pars include `waterTubePars` after `waterCubicPars`.
- [ ] **Step 4: Run:** `npx vitest run src/scene`. Expected: PASS, Classic snapshots unchanged.
- [ ] **Step 5: Sheet check** (in Task A5's shots): the tube's inside curves smoothly in the patch, with no 1 m steps along the peel.
- [ ] **Step 6: Commit:** `git add src/scene && git commit -m "feat: cut the tube's void per vertex and per pixel in the Rich water"`

### Task 4 (A4): The lip as a smooth, thick, sky-lit curtain in Rich

**Files:**
- Create: `src/scene/water/richLip.ts`, `src/scene/water/richLip.test.ts`
- Modify:
  - `src/scene/LipSheetMesh.ts`: `setLook`, `setSun`, `setOptics`, `richMaterial`;
  - `src/main.ts`: `applyWaterLook`, `refreshSun` and `photoSky.applyTo` each take the lip, one line each;
  - `src/game/PhysicalMode.ts`: `lipSheet.setOptics` beside the water's, one line.
- Test: `src/scene/waterLooks.test.ts` (Classic lip snapshot; Rich lip chunks)

**Interfaces:**
- Consumes: `LIP_STRIDE` 8 with volume (A2); the G3 optics (`waterOpticsPars`, `createOpticsUniforms`, `applyOptics`, `applySun`); `RICH_BASE_ROUGHNESS`, `RICH_REFLECTION` and `richReflectionPars` (G8).
- Produces:
  ```ts
  export const LIP_SUBDIVISIONS = 3; // spline points between parcels, both ways
  export function buildRichLipSheet(parcels: Float32Array, count: number, width: number): { positions: Float32Array; normals: Float32Array; foam: Float32Array; thickness: Float32Array; indices: Uint32Array };
  export function lipThickness(volume: number, spacing: number, width: number): number; // m: the parcel's water over the sheet area it stands for
  // LipSheetMesh
  setLook(look: WaterLook): void; setSun(direction: Vector3, radiance: Color): void; setOptics(optics: WaterOptics): void; readonly richMaterial: MeshPhysicalMaterial;
  ```

- [ ] **Step 1: Write the failing tests.**
  - `richLip.test.ts`:
    - `lipThickness(0.2, 0.5, 1)` is 0.4, the volume over the area;
    - a single straight strip of 8 parcels builds a two-faced sheet whose faces lie `thickness/2` either side of the parcels' spline;
    - the spline passes through every parcel;
    - two strips linked across columns join with no gap;
    - a strip whose tip parcels have landed builds only its flying run;
    - `count = 0` builds nothing.
  - `waterLooks.test.ts`:
    - `LipSheetMesh`'s Classic shaders match a new snapshot, taken **before** any change, in a commit of its own;
    - `setLook('rich')` makes the mesh use `richMaterial`, whose compiled fragment contains the Beer–Lambert term `exp( -waterAttenuation * vLipThickness )` and `RICH_REFLECTION`;
    - `setLook('classic')` restores the Classic material and builder.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.**
  - `buildRichLipSheet` groups parcels into strips by (column, launch time) as `buildLipSheet` does. It chains strips linked across columns (`LINK_TIME`) into runs, and each run is a grid: columns × parcel index.
    - Each strip's flying range is Catmull-Rom subdivided along the strip, and each run across its columns, `LIP_SUBDIVISIONS` points per span. The spline passes through the parcels; ends are clamped.
    - Thickness per vertex is interpolated from `lipThickness(volume, spacing along the strip, width)`.
    - Two faces sit at ±thickness/2 along the smoothed normal, with rim quads around the run's edges, so the lip has a rounded edge.
    - Open sides get the half-column ribbon, as today.
  - The Rich material is a `MeshPhysicalMaterial` (transparent, double-sided, roughness `RICH_BASE_ROUGHNESS`) with `onBeforeCompile`:
    - the vertex passes `vLipFoam`, `vLipThickness` and the world position;
    - the fragment's body is the G3 deep reflectance times `waterBodyGain`, plus sunlight through the lip when the sun is behind it: `CREST_SCATTER · waterSunRadiance · exp( -waterAttenuation * vLipThickness ) · pow( max( 0, dot( -V, sunDirection ) ), 4 )`;
    - it mixes to the foam colour by `vLipFoam²`; foam roughness is 0.7;
    - opacity is `1 − exp( −4 · vLipThickness )`, at least 0.55 and 0.97 where foamy;
    - the sky reflection is scaled by `RICH_REFLECTION`.
  - `setSun`, `setOptics` and `setLook` swap the material and the builder. Classic keeps `buildLipSheet` and its `ShaderMaterial` untouched.
- [ ] **Step 4: Run:** `npx vitest run src/scene`. Expected: PASS, every Classic snapshot unchanged.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: draw the lip as a smooth, thick, sky-lit curtain in the Rich look"`

### Task 5 (A5): Tube shots, a clip, the record and the Part A PR

**Files:**
- Modify: `src/dev/waterSheet.ts` (`?waterSheet&spot=reef`: tube shots), `ROADMAP.md` (G9 entry, Part A), `docs/superpowers/specs/2026-09-26-g9-barrel-whitewater.md` (nothing unless a ruling changes it)

- [ ] **Step 1: Tube shots.**
  - With `spot=reef`, the sheet settles until the snapshot has a tube open by ≥ 0.8 m (the largest `min(open, length·cos tilt)`), for at most 150 s.
  - It aims three shots at that tube:
    - **beside:** 6 m to its side along the crest, 1.5 m above the crest, looking across its axis;
    - **shoulder:** from 8 m along the peel on the unbroken side, 0.5 m above the crest, looking along the tube;
    - **inside:** 0.6 m above the void's floor at mid-tube, looking along it toward the mouth.

    The shots are named `tube-beside`, `tube-shoulder` and `tube-inside`, and replace `face` and `bore` when `spot=reef`.
  - Check them: a smooth, curved void; a thick, glassy lip, backlit at sunset; no 1 m steps; no holes; Classic unchanged.
- [ ] **Step 2: A clip.** Run `npm run record:ride` and open `/?inpage&record&watch&spot=reef`, keeping the ride receiver's video. Judge the motion: no popping, no flicker along the peel.
- [ ] **Step 3: Measure and check.**
  - GPU cost: `waterSheetTime` on the tube shots, Classic against Rich.
  - `npx vitest run` (re-run alone any known load-sensitive timeouts) and `npm run build`.
- [ ] **Step 4: Record.** In `ROADMAP.md`, add a **G9 · Barrel and whitewater** entry with Part A done, its measurements and its rulings.
- [ ] **Step 5: Final review of Part A, then the PR.**
  - A fresh reviewer (on the most capable model) reviews Part A. Critical and Important findings get one test-first fix pass.
  - Merge `main`, push, open the PR, check CI and merge.
  - **Leave the user a message that Part A is out** (the user asked for one), then go on to Part B.

---

## Part B · Breaking whitewater

### Task 6 (B1): Sources and ranges

**Files:**
- Create: `docs/research/whitewater-sources.md`

- [ ] **Step 1: Read and cite.** For each quantity below, find the measured value or range and its conditions, from the spec's candidate sources and any better ones found:

  | Quantity | Symbol | Plan default (provisional) |
  | --- | --- | --- |
  | Share of dissipated energy spent entraining air (work against buoyancy) | β | 0.3 (Lamarre & Melville 1991: 30–50 %) |
  | Plume depth under a plunging break, per breaker height | κ_p | 0.8 (plunge penetrates about H) |
  | Plume depth under a spilling bore, per bore height | κ_s | 0.3 |
  | Bubble rise speed | w_b | 0.22 m/s (millimetre bubbles, Clift et al. 1978) |
  | Peak void fraction under plunging and spilling breakers | α_p, α_s | 0.5, 0.2 (Blenkinsopp & Chaplin 2007) |
  | Splash-up share of the landing jet's volume | σ | 0.3 |
  | Splash-up speed over impact speed: vertical, horizontal | ζ_v, ζ_h | 0.6, 0.8 (Peregrine 1983) |
  | Void collapse time | t_c | sqrt(2 W / g): the void's height in free fall |
  | Share of trapped air that escapes as spit, when the tube has a mouth | ε | 0.5 |
  | Spray and mist per m³ of escaping air | s_a | 40 rendered particles per m³ (render density) |
  | Roller cross-section, per H² | κ_r | 0.9 (Svendsen 1984) |

- [ ] **Step 2: Record.**
  - Write `docs/research/whitewater-sources.md`: each quantity, its source, its measured range and conditions, the value chosen, and whether it is **sourced** or **provisional**.
  - Record every change from a default as a ledger ruling. Later tasks read their constants from this document.
- [ ] **Step 3: Commit:** `git add docs/research && git commit -m "docs: sources and ranges for breaking whitewater"`

### Task 7 (B2): The aeration field, and churn by aeration

**Files:**
- Create: `src/wave/AerationField.ts`, `src/wave/AerationField.test.ts`
- Modify:
  - `src/wave/SurfZoneSimulation.ts`: an `aeration` field, fed by lip landings and bores, stepped after the foam; `writeUniformAeration(data, grid)`;
  - `src/wave/SurfZoneRunner.ts`: an `aeration` buffer of nodes × 2;
  - `src/game/SurfZoneWorkerCore.ts`, `src/game/WorkerSurfZone.ts`, `src/game/SurfZoneHost.ts`: the buffer passed through;
  - `src/scene/PhysicalSurfaceSource.ts`: `writeAeration?`;
  - `src/scene/WaterSurface.ts`: the `waterAeration` texture, and `vWaterAir` in Rich;
  - `src/scene/water/richWaterGlsl.ts`: freshness from aeration.

**Interfaces:**
- Consumes: B1's β, κ_p, κ_s, w_b and α ranges.
- Produces:
  ```ts
  export class AerationField {
    readonly air: Float64Array;   // entrained air per area, m³/m²
    readonly depth: Float64Array; // plume depth, m
    constructor(solver: ShallowWaterSolver);
    addPlunge(x: number, z: number, energy: number, penetration: number): void; // energy J dissipated on landing
    addBore(cell: number, dissipationRate: number, height: number, dt: number): void;
    addAir(x: number, z: number, volume: number, penetration: number): void; // trapped air broken into bubbles (B4)
    update(dt: number): void; // advect with the current, degas at w_b over the plume depth
    voidFraction(cell: number): number; // min(1, air / depth)
  }
  ```

- [ ] **Step 1: Write the failing tests.**
  - `addPlunge` puts `β·E / (ρ g · penetration / 2)` of air into the landing cell's area. Energy is conserved in that sense: air × ρ g × mean depth equals β E.
  - Degassing: with no current, air decays by `exp(−w_b·t / depth)`.
  - Advection moves a blob downstream at the current's speed. It "follows the window" when the solver's window slides, with new columns clean.
  - Dry cells hold no air.
  - A plunging landing gives a higher void fraction than a spilling bore of the same dissipation, through penetration and area.
  - Simulation level: a practice Reef run reaches a higher peak void fraction than a practice Beach run (reported, asserted only as reef > beach).
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.**
  - The field copies `FoamField`'s semi-Lagrangian advection and window following.
  - Each landing (`lip.onLand`) calls `addPlunge(x, z, ½ρV|v|², κ_p·H)`, with H the throwing breaker's height carried on the strip.
  - Bores add `addBore(cell, B·boreDissipation, height, dt)` with penetration κ_s·height.
  - The render grid gets (α, depth) per node in `writeUniformAeration`.
  - In Rich, `vWaterAir` comes from the aeration texture. `RICH_FOAM`'s `waterFresh` becomes `waterFreshness( vWaterAir ) * waterFoamPattern`, with `waterFreshness` re-ranged to the void fractions of B1 (α_s·0.5 up to α_p). The churn relief uses the same.
- [ ] **Step 4: Run:** `npx vitest run src/wave src/game src/scene`. Expected: PASS, Classic unchanged.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: track the air breaking waves drive into the water, and draw churn where it is"`

### Task 8 (B3): Splash-up

**Files:**
- Modify:
  - `src/wave/PlungingLip.ts`: secondary strips thrown from landings;
  - `src/wave/SurfZoneRunner.ts`: `LIP_STRIDE` 8 → 9 adds kind, 0 for a jet and 1 for a splash-up;
  - `src/scene/LipSheetMesh.ts` and `src/scene/water/richLip.ts`: splash-up strips drawn whiter, as aerated water;
  - `src/wave/SprayCloud.ts`: splash-up drops launched at ζ_v and ζ_h instead of `SPLASH_UP`/`SPLASH_FORWARD`.
- Test: `src/wave/PlungingLip.test.ts`

**Interfaces:**
- Consumes: B1's σ, ζ_v and ζ_h.
- Produces: `PlungingLip` splash-up strips (kind 1): no tube; skipped by `forEachContact` and `forEachContactNear`; landing without a further splash-up (one generation, provisional).

- [ ] **Step 1: Write the failing tests.**
  - A parcel landing at speed v re-throws σ of its volume as a splash-up parcel, with velocity (ζ_h·v_x, ζ_v·|v_y|, ζ_h·v_z). The rest returns to the solver at once.
  - Total water (solver + airborne) is conserved to 1e-9 through a jet, its splash-up and their landings. Horizontal momentum given to the solver equals the parcels' horizontal momentum at their final landings.
  - A splash-up strip is never offered to a rider: a body in its path sees no contact.
  - A splash-up landing throws no further splash-up.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.**
  - In `land()`, a jet parcel (kind 0) whose downward speed exceeds 0.5 m/s gives σ of its volume to a new splash-up strip of `STRIP_PARCELS` parcels released over `JET_RELEASE_TIME`, from where it landed.
  - The strip's kind is 1. It is linked like jet strips (only to other kind 1 strips), carries no tube, and is skipped in contact.
  - The lip sheet draws kind 1 with foam = 1 from its launch.
- [ ] **Step 4: Run:** `npx vitest run src/wave src/physics src/scene`. Expected: PASS. Existing ride and catch tests may shift slightly, because splash-up water returns later. Any test that changes gets a ledger ruling with the before and after values.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: throw a splash-up from each landing lip"`

### Task 9 (B4): Trapped air, the collapse and the spit

**Files:**
- Modify:
  - `src/wave/PlungingLip.ts`: tubes close when their jet lands, collapse over t_c, and account their air; tubes group into chains; a spit is emitted at the mouth, or an eruption on a close-out;
  - `src/wave/tubeTable.ts`: `scale` and `air` are live;
  - `src/wave/SprayCloud.ts`: `spits` and `eruptions` in the scene;
  - `src/wave/SurfZoneSimulation.ts`: entrained air to `aeration.addAir`.
- Test: `src/wave/PlungingLip.test.ts`, `src/wave/SprayCloud.test.ts`

**Interfaces:**
- Consumes: B1's t_c, ε and s_a; `AerationField.addAir` (B2).
- Produces:
  ```ts
  export interface TubeSpit { x: number; y: number; z: number; dirX: number; dirZ: number; speed: number; airRate: number } // m³/s
  export interface TubeEruption { x: number; y: number; z: number; airRate: number }
  // PlungingLip
  readonly spits: TubeSpit[]; readonly eruptions: TubeEruption[]; // this step's
  onAir?: (x: number, z: number, volume: number, penetration: number) => void; // air broken into bubbles
  ```

- [ ] **Step 1: Write the failing tests.**
  - A tube closes when its strip's first parcel lands. Its trapped air is `area·H²·columnWidth`; its scale falls linearly from 1 to 0 over `t_c = sqrt(2W/g)`, and the carve follows the scale.
  - Air is conserved: summed over a tube's collapse, the air leaving as spit or eruption, plus the air entrained, equals the trapped air, to 1e-9.
  - A chain of linked strips closing in turn, with its last strip still open, spits at the open end. The spit's speed is (Σ closing air rate) over the mouth area, the open end's void cross-section `area·H²`, and it points along the chain toward the open end.
  - A chain closing everywhere at once (a close-out) erupts: no spit, and the air rate goes up at the chain's centroid.
  - `SprayCloud` turns a spit into spray and mist launched at its speed and direction, at s_a particles per m³ of air, and an eruption into an upward burst.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.**
  - When a strip's first parcel lands, its tube closes: record `closedAt` and `air`.
  - `refreshTubes` packs `scale = max(0, 1 − (time − closedAt)/t_c)`, and the strip stays live until its parcels have landed **and** its scale is 0.
  - Chains are strips linked across columns within `LINK_TIME`. Each step, a closing strip releases `air/t_c·dt`:
    - ε of it leaves through the chain's mouth, if the chain has an open end: a spit with speed = rate / mouth area;
    - otherwise it erupts upward;
    - the rest goes to `onAir` with penetration κ_p·H.

  `spits` and `eruptions` are rebuilt each step and passed to the spray scene. Everything this adds is provisional per B1, except mass conservation.
- [ ] **Step 4: Run:** `npx vitest run src/wave src/physics`. Expected: PASS. Rulings for any ride or catch test that moves, because the collapse changes the carve for a fraction of a second.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: collapse tubes as their air escapes, spitting from the mouth"`

### Task 10 (B5): The foam ball

**Files:**
- Modify:
  - `src/wave/SprayCloud.ts`: a third kind, FOAM_BALL; `SPRAY_STRIDE` 5 → 6 adds kind;
  - `src/wave/PlungingLip.ts`: rollers for closing tubes;
  - `src/scene/SprayPoints.ts`: drops kind 2 when Classic; Rich draws kind 2 with the churn texture;
  - `src/scene/water/richSpray.ts`.
- Test: `src/wave/SprayCloud.test.ts`, `src/scene/waterLooks.test.ts`

**Interfaces:**
- Consumes: B1's κ_r; the churn texture (G8).
- Produces: `SprayScene.rollers?: { x: number; y: number; z: number; dirX: number; dirZ: number; speed: number; area: number; width: number }[]`, one per closing tube this step.

- [ ] **Step 1: Write the failing tests.**
  - A roller of area A over width w keeps about A·w / v_s foam-ball sprites alive, where v_s is one sprite's volume, (0.6 m)³·π/6 (provisional). They sit in its cross-section behind the crest and move with the crest's speed plus a tumble at speed/radius.
  - Particles carry their kind at stride offset 5.
  - "Keeps the foam ball out of the Classic spray": `SprayPoints.update` in Classic draws no kind 2 particle. The Classic shaders are unchanged.
  - The Rich fragment shades kind 2 with `waterChurnMap`.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** A closing tube's roller spawns and refreshes foam-ball sprites (kind 2, 0.5–0.8 m), which live until its scale reaches 0 plus 1 s. `SprayPoints` passes kind as an attribute in Rich. Rich draws kind 2 as an opaque-centred disc textured by the churn map, lit by the sun and sky.
- [ ] **Step 4: Run:** `npx vitest run src/wave src/scene`. Expected: PASS.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: tumble a foam ball in the collapsing tube"`

### Task 11 (B6): The bubble plume

**Files:**
- Modify: `src/scene/water/richWaterGlsl.ts` (the plume in the Rich body chunk: above, and from below)
- Test: `src/scene/waterLooks.test.ts`

- [ ] **Step 1: Write the failing test.** The Rich fragment computes `waterPlume = 1.0 - exp( -PLUME_DENSITY * vWaterAir * min( vWaterPlumeDepth, vWaterDepth ) )`. It whitens the body with it above (seen through `exp( -waterAttenuation * … )`) and the underside (faceDirection < 0). Classic is unchanged.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** The (α, depth) aeration texture feeds `vWaterAir` and `vWaterPlumeDepth`. `PLUME_DENSITY` is set on the sheet: a fully aerated 1 m plume reads near-white; it is a render constant.
- [ ] **Step 4: Run:** `npx vitest run src/scene`. Expected: PASS.
- [ ] **Step 5: Commit:** `git add src && git commit -m "feat: draw the bubble plume under the whitewater"`

### Task 12 (B7): Whitewater report, sheet, clip, record and the Part B PR

**Files:**
- Create: `scripts/whitewater-report.ts`, `docs/research/whitewater-report.md`
- Modify: `package.json` (`report:whitewater`), `src/dev/waterSheet.ts` (whitewater shots at the Reef and Beach), `ROADMAP.md`, this plan (rewritten as the design record)

- [ ] **Step 1: Report.**
  - `npm run report:whitewater -- --seeds 2 --periods 12` runs every spot at the Wave Lab defaults.
  - Per spot it reports: splash-up heights (median, 90th percentile), spit speeds, peak void fraction, plume depths, collapse times, foam-ball sprites, worker step time.
  - Each is checked against B1's ranges. It is reported, not asserted.
- [ ] **Step 2: Sheet and clip.** Whitewater shots at the Reef and Beach, Classic beside Rich, under the three skies, plus a `?record&watch` clip. The Reef should read explosive and the Beach gentle, without per-spot values.
- [ ] **Step 3: Full suite and build.** `npx vitest run` and `npm run build`. Measure the worker step and the GPU.
- [ ] **Step 4: Record.**
  - `ROADMAP.md`: G9 done, with the measurements and the Backlog (whitewater forces on bodies, the player's tube camera).
  - This plan is rewritten as the design record, with its deviations.
- [ ] **Step 5: Final review, fixes and PR.** A fresh reviewer on the most capable model reviews the whole branch, then one test-first fix pass. Merge `main`, open the PR, check CI and merge.
