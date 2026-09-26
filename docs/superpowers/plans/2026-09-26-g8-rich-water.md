# G8 Rich Water Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a **Rich** water look beside today's **Classic**, per the spec:
- the physics' Catmull-Rom surface on a dense camera patch, with per-pixel normals;
- flow-carried ripples with a glossy, anti-aliased finish;
- face streaks;
- churn whitewater that opens into lace;
- sun-lit mist;
- all switched by a new P8 graphics setting.

**Architecture:**
- **Two looks.** `WaterSurface`, `FarFieldOcean` and `SprayPoints` each get `setLook('classic' | 'rich')`. Classic keeps today's shader-chunk replacements byte for byte (pinned by snapshots); Rich swaps in new chunks from `src/scene/water/`.
- **Textures** (ripple slopes with their squares for variance, churn) are generated in code from seeded, exactly tileable sums, as `foamTileTexture` is.
- **Water sheet.** A dev page drives the real game through its recording hooks to render fixed shots, Classic beside Rich, under the three skies.

**Tech Stack:** three r186 (`MeshPhysicalMaterial` chunk replacement, `DataTexture` half float with mipmaps), TypeScript, Vitest (with snapshots).

**Spec:** [G8 · Rich water](../specs/2026-09-26-g8-rich-water.md)

## Global Constraints

- **Rendering only:** no file under `src/physics/` or `src/wave/` changes.
- **The drawn surface:** Rich draws the physics' Catmull-Rom surface (`PhysicalSurfWater.surfaceAt`) and never lifts foam off it.
- **Classic parity:** Classic's compiled shader sources stay byte-identical to today's.
- **The setting:** **Water look: Classic / Rich** in Graphics › Advanced. Low picks Classic; Medium, High and Ultra pick Rich. It applies instantly.
- **Shared files:** edits to `main.ts`, `PhysicalMode.ts`, `Settings.ts`, `Graphics.ts`, `settingsModel.ts` and `strings.ts` stay small (other sessions work there too).
- **Assets:** no downloaded assets and no new dependencies; textures are generated in code.
- **Legacy:** the legacy wave stays Classic (its physics is bilinear); Rich applies only to sources that declare `cubic: true`.
- **Out of scope:** P7's lip sheet (`LipSheetMesh`).
- **Performance** is measured on this machine (M1 Air) with the browser pane shown, and recorded; never a gate.

## Review Focus

1. **Old saves:** a player on the Low preset saved before G8 must load as Classic, not jump to the heavier Rich (Task 1 test "keeps an old Low save on Classic").
2. **The Below view:** Rich must light the underside correctly, so the flipped normals point down (Task 3 test "flips the per-pixel normal for the underside" on the GLSL string, plus the sheet's Below shot).
3. **Small grids:** a render grid smaller than the dense patch, and a camera outside the grid, must neither draw water beyond the tank nor leave holes (Task 4 tests "clamps the patch inside the grid" and "keeps the patch within a grid smaller than it").
4. **The legacy wave in Rich:** it must stay Classic, since its physics is bilinear (Task 3 test "keeps a bilinear source Classic").
5. **Look switching:** switching back and forth recompiles cleanly and leaves no stale program (Task 1 test "keys the program by look").

---

## File Structure

| File | Responsibility |
| --- | --- |
| `src/scene/water/waterLook.ts` | `WaterLook` type |
| `src/scene/water/cubicSurface.ts` (+ test) | GLSL Catmull-Rom height and gradient over the render nodes; CPU mirror |
| `src/scene/water/richPatch.ts` (+ test) | The dense camera patch: geometry with a skirt, and its placement |
| `src/scene/water/rippleTexture.ts` (+ test) | Tileable ripple slope texture (sx, sz, sx², sz²); GLSL flow-carried layers |
| `src/scene/water/specular.ts` (+ test) | Variance-based roughness (LEAN-style specular anti-aliasing), GLSL and CPU mirror |
| `src/scene/water/streaks.ts` (+ test) | Face streaks: stretched lace along the current on steep faces |
| `src/scene/water/churnTexture.ts` (+ test) | Tileable churn tile (density, height); the churn–lace blend |
| `src/scene/water/richWaterGlsl.ts` | Assembles Rich vertex, normal and body chunks for `WaterSurface` and `FarFieldOcean` |
| `src/scene/water/mist.ts` (+ test) | Henyey–Greenstein forward scattering and the mist size split for sprites |
| `src/scene/WaterSurface.ts` (+ test) | `setLook`, the `cubic` source flag, patch child, Rich uniforms |
| `src/scene/waterOptics.ts` | `waterBodyFragment` takes the foam composition as a parameter (Classic default, identical output) |
| `src/scene/FarFieldOcean.ts` (+ test) | `setLook`: ripples and gloss |
| `src/scene/SprayPoints.ts` (+ test) | `setLook`: lit mist, soft water fade |
| `src/scene/PhysicalSurfaceSource.ts` | `cubic = true` |
| `src/game/Settings.ts`, `src/game/Graphics.ts`, `src/ui/settingsModel.ts`, `src/ui/strings.ts` (+ tests) | The setting |
| `src/main.ts` | `applyGraphics` sets the look; `recording` gains `setWaterLook`, `setTimeOfDay`, `renderView`, `water`; the `?waterSheet` dev flag |
| `water-sheet.html`, `src/dev/waterSheet.ts` | The water sheet |
| `ROADMAP.md`, this plan (as the record) | Docs |

---

### Task 1: The Water look setting, look plumbing and Classic parity

**Files:**
- Create: `src/scene/water/waterLook.ts`, `src/scene/waterLooks.test.ts`
- Modify: `src/game/Settings.ts`, `src/game/Graphics.ts`, `src/ui/settingsModel.ts`, `src/ui/strings.ts`, `src/scene/WaterSurface.ts`, `src/scene/FarFieldOcean.ts`, `src/scene/SprayPoints.ts`, `src/main.ts` (`applyGraphics`)
- Test: `src/game/Settings.test.ts`, `src/game/Graphics.test.ts`, `src/ui/settingsModel.test.ts`

**Interfaces:**
- Produces:
  ```ts
  // waterLook.ts
  export type WaterLook = 'classic' | 'rich';
  // Settings.ts — AdvancedGraphics gains
  waterLook: WaterLook;
  // Graphics.ts — ResolvedGraphics gains
  waterLook: WaterLook;
  // WaterSurface / FarFieldOcean / SprayPoints
  setLook(look: WaterLook): void;
  get look(): WaterLook;
  ```

- [ ] **Step 1: Pin Classic before touching any shader.** Write `src/scene/waterLooks.test.ts`, which runs each material's `onBeforeCompile` on three's `ShaderLib.physical` sources and snapshots the result:

```ts
import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import { FarFieldOcean } from './FarFieldOcean';
import { SprayPoints } from './SprayPoints';
import { WaterSurface, type SurfaceSource } from './WaterSurface';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };

export function compiled(material: { onBeforeCompile: (s: WebGLProgramParametersWithUniforms, r: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}

describe('Classic water parity', () => {
  it('keeps the tank water’s Classic shaders exactly as before G8', () => {
    expect(compiled(new WaterSurface(source).mesh.material)).toMatchSnapshot();
  });
  it('keeps the far ocean’s Classic shaders exactly as before G8', () => {
    expect(compiled(new FarFieldOcean().mesh.material)).toMatchSnapshot();
  });
  it('keeps the spray’s Classic shaders exactly as before G8', () => {
    const { material } = new SprayPoints().mesh;
    expect({ vertex: material.vertexShader, fragment: material.fragmentShader }).toMatchSnapshot();
  });
});
```

Run it on the untouched code: `npx vitest run src/scene/waterLooks.test.ts` → 3 passed, with the snapshot file written. Commit the test and `__snapshots__/` alone first: `git commit -m "test: pin the Classic water shaders"`. Check `SurfaceSource`'s real required members in `WaterSurface.ts` and fill `source` to satisfy them.

- [ ] **Step 2: Write the failing setting tests.**

`Settings.test.ts`:
```ts
it('defaults the water look to Rich and keeps an old Low save on Classic', () => {
  expect(defaultSettings().graphics.waterLook).toBe('rich');
  const oldLow = { graphics: { preset: 'low', ...PRESETS.low, waterLook: undefined } };
  expect(sanitizeSettings(oldLow, false).graphics.waterLook).toBe('classic');
  const oldAuto = { graphics: { preset: 'auto', ...PRESETS.medium, waterLook: undefined }, detected: { preset: 'low', water: 'fast', adapter: 'x', at: 0 } };
  expect(sanitizeSettings(oldAuto, false).graphics.waterLook).toBe('classic');
});
```
Use the file's existing sanitizer name and signature (read the top of `Settings.ts`, which exports it, and the existing `Settings.test.ts` for how it is called), and the real `Detection` fields.

`Graphics.test.ts`:
```ts
it('puts Low on the Classic water and the others on Rich', () => {
  expect(PRESETS.low.waterLook).toBe('classic');
  for (const preset of ['medium', 'high', 'ultra'] as const) expect(PRESETS[preset].waterLook).toBe('rich');
  expect(resolveGraphics({ preset: 'low', ...PRESETS.low }, undefined, 2).waterLook).toBe('classic');
});
```

`settingsModel.test.ts`:
```ts
it('offers the water look among the advanced graphics and applies it without a preset change', () => {
  const rows = settingsModel('graphics', defaultSettings(), { detecting: false });
  const row = rows.find((r) => r.id === 'waterLook');
  expect(row).toMatchObject({ kind: 'choice', value: 'rich' });
  expect(applyRow(defaultSettings(), 'waterLook', 'classic')).toMatchObject({ tab: 'graphics', patch: { waterLook: 'classic' } });
});
```
Match the file's existing context and argument shapes.

`waterLooks.test.ts`, added:
```ts
it('keys the program by look, and switching back gives the Classic source again', () => {
  const water = new WaterSurface(source);
  const classic = compiled(water.mesh.material);
  expect(water.mesh.material.customProgramCacheKey()).toContain('classic');
  water.setLook('rich');
  expect(water.mesh.material.customProgramCacheKey()).toContain('rich');
  water.setLook('classic');
  expect(compiled(water.mesh.material)).toEqual(classic);
});
```

- [ ] **Step 3: Run to fail** — `npx vitest run src/game src/ui/settingsModel.test.ts src/scene/waterLooks.test.ts` → the new tests FAIL (no `waterLook`, no `setLook`).

- [ ] **Step 4: Implement.**
  - **`waterLook.ts`:** `export type WaterLook = 'classic' | 'rich';`
  - **`Settings.ts`:**
    - add `waterLook: WaterLook` to `AdvancedGraphics` and `waterLook: 'rich'` to the defaults (the Medium preset's values);
    - in the sanitizer, `waterLook: oneOf(graphics.waterLook, ['classic', 'rich'] as const, missingLook)`.
    - `missingLook` is `PRESETS[preset].waterLook` for a concrete stored preset, `PRESETS[detected?.preset ?? 'medium'].waterLook` for `auto`, and `g.waterLook` for `custom`. Import `PRESETS` from `./Graphics`, or, if that creates an import cycle, move the preset table into `Settings.ts` and re-export it from `Graphics.ts`.
  - **`Graphics.ts`:** set `waterLook` in each preset (low `'classic'`, others `'rich'`) and add `waterLook: graphics.waterLook` to `resolveGraphics`.
  - **`settingsModel.ts`:** add `'waterLook'` to `ADVANCED` after `'seaDetail'`, with the row `{ kind: 'choice', id: 'waterLook', label: t('settings.waterLook'), value: g.waterLook, options: options('settings.waterLook', ['classic', 'rich']) }` after the sea-detail row.
  - **`strings.ts`:** `'settings.waterLook': 'Water look'`, `'settings.waterLook.classic': 'Classic'`, `'settings.waterLook.rich': 'Rich'`.
  - **`WaterSurface`, `FarFieldOcean`, `SprayPoints`:**
    - a `private currentLook: WaterLook = 'classic'`;
    - `setLook(look)` that returns if unchanged, else stores the look and sets `material.needsUpdate = true`;
    - `get look()`;
    - `customProgramCacheKey` returns `` `breakline-water-surface-${this.currentLook}` `` (and likewise for the others).
    - `onBeforeCompile` stays the Classic code for now (Rich lands in later tasks). `SprayPoints` is a `ShaderMaterial`: `setLook` swaps its `vertexShader` and `fragmentShader` strings, the same strings for now.
  - **`main.ts`, `applyGraphics`:** after the existing lines, `this.water.setLook(resolved.waterLook); this.physicalMode.farField.setLook(resolved.waterLook); this.physicalMode.spray.setLook(resolved.waterLook);`.

- [ ] **Step 5: Run to pass** — the same command → PASS, and the Classic snapshots unchanged. Then `npx tsc -b`.

- [ ] **Step 6: Commit** — `git commit -am "feat: add the Water look setting, Classic or Rich"`

---

### Task 2: The water sheet

**Files:**
- Create: `water-sheet.html`, `src/dev/waterSheet.ts`
- Modify: `src/main.ts` (the `recording` hooks, a `drawPhysicalFrom(view)` helper shared with `physicalRender`, and the `?waterSheet` flag starting like `?record`)

**Interfaces:**
- Produces, on `game.recording`:
  ```ts
  setWaterLook(look: WaterLook): void;              // the same calls as applyGraphics
  setTimeOfDay(time: TimeOfDay): Promise<void>;      // applySun(TIMES[time]), resolved once the photo sky is in
  renderView(camera: PerspectiveCamera): void;       // draws the physical scene from `camera` (caustics and shadows follow it)
  water: WaterSurface;                              // surfaceData and grid, to find the shots
  ```

- [ ] **Step 1: Refactor `physicalRender`.** It becomes `this.drawPhysical(this.physicalMode.camera.camera)` plus the readout, with `drawPhysical(view)` holding the water update, caustics around `view`, the shadow follow and `renderer.render(scene, view)`. `applySun` returns the `photoSky.select(...).then(...)` promise. Everything else is unchanged.
- [ ] **Step 2: Add the hooks and the flag.**
  - `const waterSheetRequested = devFlag('waterSheet')`.
  - The frame loop does not start when it is set (as with `record`).
  - The app starts in the Wave Lab.
  - `if (waterSheetRequested) void import('./dev/waterSheet').then(({ renderWaterSheet }) => renderWaterSheet(game.recording));`
- [ ] **Step 3: Write `src/dev/waterSheet.ts`.**
  - **Start:** Point, practice groundswell, seed 1, stage 2, `compute: 'cpu'`, `?inpage`.
  - **Step until a wave breaks:** up to 90 s of `step({ paddle: false, popUp: false, steer: 0 })`, stopping once the snapshot's `breakingFraction` exceeds 0.02 and at least 40 s have passed.
  - **Find the shots from `recording.water.surfaceData` and `.grid`:**
    - *face*: the node with the steepest height gradient within 40 m of `mode.focus`; the camera is 9 m shoreward, 2.2 m above the crest, looking at it;
    - *bore*: the node with the highest foam; the camera is 12 m to its side, 3 m up;
    - *lineup*: 25 m outside the break line, 1.6 m up, looking along the shore;
    - *horizon*: 14 m up at the focus, looking seaward;
    - *below*: 1.2 m under the surface at the lineup, looking up at 20°.
  - **Render:** for each time of day (awaiting `setTimeOfDay`), each look (`setWaterLook`) and each shot, `renderView(camera)` at 1280 × 720 and draw it into a 6 × 5 grid of 320 × 180 tiles on a 2D canvas appended to the page. Label each tile (look · time · shot).
  - **Done flag:** set `window.waterSheetReady = true` when done.
- [ ] **Step 4: Write `water-sheet.html`** (dev only, like `character-sheet.html`): it redirects to `/?inpage&waterSheet`. A separate page keeps the main entry untouched.
- [ ] **Step 5: Check it.**
  - `npx tsc -b`.
  - Start `npx vite --port 5180`, open `/?inpage&waterSheet` in the browser pane (the pane shown), wait for `waterSheetReady`, and take a screenshot.
  - Expected: 30 tiles, all Classic for now (Rich equals Classic until Task 3).
  - Save the screenshot outside the repo as the "before" baseline.
- [ ] **Step 6: Commit** — `git add water-sheet.html src/dev/waterSheet.ts src/main.ts && git commit -m "feat: render a water sheet from the real game"`

---

### Task 3: The physics' Catmull-Rom surface and per-pixel normals

**Files:**
- Create: `src/scene/water/cubicSurface.ts`, `src/scene/water/cubicSurface.test.ts`, `src/scene/water/richWaterGlsl.ts`
- Modify: `src/scene/WaterSurface.ts` (`SurfaceSource.cubic?`, Rich `onBeforeCompile` branch), `src/scene/PhysicalSurfaceSource.ts` (`readonly cubic = true`)

**Interfaces:**
- Produces:
  ```ts
  export const waterCubicPars: string;   // GLSL: vec3 waterCubic( vec2 xz ) → (height, dη/dx, dη/dz), Catmull-Rom over clamped nodes
  export function sampleCubicSurface(data: Float32Array, grid: SurfaceGrid, x: number, z: number): { height: number; slopeX: number; slopeZ: number };
  // richWaterGlsl.ts
  export const richVertexHeight: string;        // replaces <begin_vertex> in Rich
  export const richBeginNormal: string;         // replaces <beginnormal_vertex> in Rich (foam, flow, depth varyings as Classic)
  export function richNormalFragment(opts: { ripples: boolean }): string;  // replaces <normal_fragment_begin>
  export const richFragmentPars: string;        // file-scope globals later chunks read: vec2 waterSurfaceSlope; float waterRippleVariance = 0.0;
  ```

- [ ] **Step 1: Write the failing tests** (`cubicSurface.test.ts`)

```ts
import { describe, expect, it } from 'vitest';
import { PhysicalSurfWater } from '../../physics/PhysicalSurfWater';
import { createWaterSample } from '../../physics/SurfWater';
import { SurfZoneSimulation, type SurfZoneConfig } from '../../wave/SurfZoneSimulation';
import { waterCubicPars, sampleCubicSurface } from './cubicSurface';
import { richNormalFragment } from './richWaterGlsl';

const config: SurfZoneConfig = {
  spot: 'point', seed: 3, significantHeight: 1.4, peakPeriod: 10, directionDegrees: 20, spreading: 24, tide: 0,
  componentCount: 8, alongShore: 40, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
};

describe('the drawn Catmull-Rom surface', () => {
  it('equals the board physics’ surface and slope between render nodes', () => {
    const simulation = new SurfZoneSimulation(config);
    for (let step = 0; step < 120; step += 1) simulation.step(1 / 60);
    const water = PhysicalSurfWater.forSimulation(simulation);
    const grid = simulation.renderGrid(1);
    const render = new Float32Array(grid.nx * grid.nz * 2);
    simulation.writeUniformSurface(render, grid);
    const out = createWaterSample();
    let checked = 0;
    for (let r = 2; r < grid.nz - 3; r += 7) {
      for (let c = 2; c < grid.nx - 3; c += 5) {
        const x = grid.xMin + (c + 0.37) * grid.spacing;
        const z = grid.zMin + (r + 0.61) * grid.spacing;
        water.sampleAt(x, 0, z, out);
        const drawn = sampleCubicSurface(render, grid, x, z);
        expect(drawn.height).toBeCloseTo(out.surfaceY, 5);
        const n = Math.hypot(drawn.slopeX, 1, drawn.slopeZ);
        expect(-drawn.slopeX / n).toBeCloseTo(out.normalX, 4);
        expect(-drawn.slopeZ / n).toBeCloseTo(out.normalZ, 4);
        checked += 1;
      }
    }
    expect(checked).toBeGreaterThan(150);
  });

  it('clamps nodes at the grid’s edges as the physics does', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 4 };
    const data = new Float32Array(32);
    for (let i = 0; i < 16; i += 1) data[i * 2] = i % 4; // height = column index
    expect(sampleCubicSurface(data, grid, 0.5, 1).height).toBeCloseTo(0.5, 6);
    expect(sampleCubicSurface(data, grid, -3, 1).height).toBeCloseTo(0, 6);
  });

  it('flips the per-pixel normal for the underside and writes it in view space', () => {
    const glsl = richNormalFragment({ ripples: false });
    expect(glsl).toContain('faceDirection');
    expect(glsl).toContain('viewMatrix');
    expect(waterCubicPars).toContain('texelFetch');
  });
});
```

In `waterLooks.test.ts`:
```ts
it('keeps a bilinear source Classic even when Rich is chosen', () => {
  const water = new WaterSurface(source); // no `cubic`
  water.setLook('rich');
  expect(compiled(water.mesh.material)).toEqual(compiled(new WaterSurface(source).mesh.material));
});
it('draws a cubic source’s Rich surface from the Catmull-Rom chunk', () => {
  const water = new WaterSurface({ ...source, cubic: true });
  water.setLook('rich');
  expect(compiled(water.mesh.material).vertex).toContain('waterCubic(');
});
```

- [ ] **Step 2: Run to fail** — `npx vitest run src/scene/water src/scene/waterLooks.test.ts` → FAIL.

- [ ] **Step 3: Implement `cubicSurface.ts`**

```ts
import type { SurfaceGrid } from '../WaterSurface';
import { catmullRomWeights } from '../../physics/PhysicalSurfWater';

/** d/dt of the Catmull-Rom weights (PhysicalSurfWater's `catmullRomSlopes`). */
function slopes(t: number): [number, number, number, number] {
  const t2 = t * t;
  return [(-3 * t2 + 4 * t - 1) / 2, (9 * t2 - 10 * t) / 2, (-9 * t2 + 8 * t + 1) / 2, (3 * t2 - 2 * t) / 2];
}

/**
 * CPU mirror of `waterCubic`: the Catmull-Rom surface over the render nodes
 * with nodes clamped to the grid, as `PhysicalSurfWater` samples it, so the
 * drawn water is the surface the board rides.
 */
export function sampleCubicSurface(data: Float32Array, grid: SurfaceGrid, x: number, z: number): { height: number; slopeX: number; slopeZ: number } {
  const gx = (x - grid.xMin) / grid.spacing;
  const gz = (z - grid.zMin) / grid.spacing;
  const i0 = Math.floor(gx);
  const j0 = Math.floor(gz);
  const wx = catmullRomWeights(gx - i0);
  const wz = catmullRomWeights(gz - j0);
  const dx = slopes(gx - i0);
  const dz = slopes(gz - j0);
  let height = 0;
  let hx = 0;
  let hz = 0;
  for (let j = 0; j < 4; j += 1) {
    const row = Math.min(grid.nz - 1, Math.max(0, j0 + j - 1));
    for (let i = 0; i < 4; i += 1) {
      const column = Math.min(grid.nx - 1, Math.max(0, i0 + i - 1));
      const node = data[(row * grid.nx + column) * 2];
      height += wz[j] * wx[i] * node;
      hx += wz[j] * dx[i] * node;
      hz += dz[j] * wx[i] * node;
    }
  }
  return { height, slopeX: hx / grid.spacing, slopeZ: hz / grid.spacing };
}

export const waterCubicPars = /* glsl */ `
vec4 waterCatmullRom( float t ) {
  float t2 = t * t; float t3 = t2 * t;
  return 0.5 * vec4( -t3 + 2.0 * t2 - t, 3.0 * t3 - 5.0 * t2 + 2.0, -3.0 * t3 + 4.0 * t2 + t, t3 - t2 );
}
vec4 waterCatmullRomSlope( float t ) {
  float t2 = t * t;
  return 0.5 * vec4( -3.0 * t2 + 4.0 * t - 1.0, 9.0 * t2 - 10.0 * t, -9.0 * t2 + 8.0 * t + 1.0, 3.0 * t2 - 2.0 * t );
}
float waterNode( ivec2 c ) {
  return texelFetch( waterSurface, clamp( c, ivec2( 0 ), ivec2( waterGridSize ) - 1 ), 0 ).r;
}
// Catmull-Rom over the render nodes, clamped at the grid, as PhysicalSurfWater samples it: (height, dη/dx, dη/dz).
vec3 waterCubic( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  ivec2 c = ivec2( floor( g ) );
  vec2 t = g - vec2( c );
  vec4 wx = waterCatmullRom( t.x );
  vec4 wz = waterCatmullRom( t.y );
  vec4 dx = waterCatmullRomSlope( t.x );
  vec4 dz = waterCatmullRomSlope( t.y );
  vec3 result = vec3( 0.0 );
  for ( int j = 0; j < 4; j ++ ) {
    vec4 row = vec4( waterNode( c + ivec2( -1, j - 1 ) ), waterNode( c + ivec2( 0, j - 1 ) ), waterNode( c + ivec2( 1, j - 1 ) ), waterNode( c + ivec2( 2, j - 1 ) ) );
    result += vec3( wz[ j ] * dot( wx, row ), wz[ j ] * dot( dx, row ), dz[ j ] * dot( wx, row ) );
  }
  return vec3( result.x, result.yz / waterGrid.z );
}
`;
```

`richWaterGlsl.ts` (this task's parts):

```ts
import { waterCubicPars } from './cubicSurface';

export { waterCubicPars };

/** Rich <beginnormal_vertex>: the Classic varyings, the height from the Catmull-Rom surface (the normal is per pixel). */
export const richBeginNormal = /* glsl */ `
vec2 waterXZ = ( modelMatrix * vec4( position, 1.0 ) ).xz;
vec3 waterCubicSample = waterCubic( waterXZ );
float waterHeight = waterCubicSample.x;
vec3 objectNormal = normalize( vec3( -waterCubicSample.y, 1.0, -waterCubicSample.z ) );
vWaterDepth = max( 0.0, waterHeight - waterBedAt( waterXZ ) );
vWaterFoam = waterFoamAt( waterXZ );
vWaterFlow = waterFlowAt( waterXZ );
`;

/** File-scope values the normal chunk computes and the body chunk reads (Rich fragment only). */
export const richFragmentPars = 'vec2 waterSurfaceSlope;\nfloat waterRippleVariance = 0.0;';

export const richVertexHeight = 'vec3 transformed = vec3( position );\ntransformed.y = waterHeight;\nvWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;';

/** Rich <normal_fragment_begin>: the Catmull-Rom normal per pixel, plus the chop (and ripples from Task 5), flipped for the underside. */
export function richNormalFragment(opts: { ripples: boolean }): string {
  return /* glsl */ `
#include <normal_fragment_begin>
{
  vec3 waterSurfaceSample = waterCubic( vWaterWorld.xz );
  waterSurfaceSlope = waterSurfaceSample.yz;
  vec2 waterSlope = waterSurfaceSample.yz;
  float chopFade = exp( -length( vWaterWorld - cameraPosition ) / 80.0 );
  waterSlope += waterChop * chopFade * waterChopSlope( vWaterWorld.xz, waterTime );
  ${opts.ripples ? 'waterSlope += waterRippleSlopeAt( vWaterWorld.xz, vWaterFlow );' : ''}
  vec3 waterWorldNormal = normalize( vec3( -waterSlope.x, 1.0, -waterSlope.y ) ) * faceDirection;
  normal = normalize( ( viewMatrix * vec4( waterWorldNormal, 0.0 ) ).xyz );
}
`;
}
```

In `WaterSurface.ts`:
- `SurfaceSource` gains `readonly cubic?: boolean` ("its bodies sample a Catmull-Rom surface over the render nodes").
- `effectiveLook = this.currentLook === 'rich' && this.source.cubic ? 'rich' : 'classic'`, used by the cache key and `onBeforeCompile`, recomputed in `setSource`.
- The Rich branch of `onBeforeCompile`:
  ```ts
  shader.vertexShader = shader.vertexShader
    .replace('#include <common>', `#include <common>\n${waterVertexPars}\n${waterCubicPars}`)
    .replace('#include <beginnormal_vertex>', richBeginNormal)
    .replace('#include <begin_vertex>', richVertexHeight);
  shader.fragmentShader = shader.fragmentShader
    .replace('#include <common>', `#include <common>\n${waterFragmentPars}\n${waterCubicPars}\n${richFragmentPars}`)
    .replace('#include <normal_fragment_begin>', richNormalFragment({ ripples: false }))
    .replace('#include <color_fragment>', '')
    .replace('#include <emissivemap_fragment>', waterBodyFragment(true, true));
  ```
- `waterFragmentPars` needs `uniform vec2 waterGridSize;` for `waterNode`; add it to `waterHeightPars` if absent. Check that it's there: `waterHeightPars` declares it, and `waterFragmentPars` includes `waterHeightPars`.

`PhysicalSurfaceSource.ts`: `readonly cubic = true;`.

- [ ] **Step 4: Run to pass** — `npx vitest run src/scene/water src/scene/waterLooks.test.ts src/scene/WaterSurface.test.ts` → PASS, Classic snapshots unchanged.

- [ ] **Step 5: Sheet check** — reopen the water sheet: Rich tiles now show smooth, unfaceted faces, and the Below tile is lit from below correctly. Save the screenshot outside the repo.

- [ ] **Step 6: Commit** — `git add src/scene && git commit -m "feat: draw the physics' Catmull-Rom water surface in the Rich look"`

---

### Task 4: The dense camera patch

**Files:**
- Create: `src/scene/water/richPatch.ts`, `src/scene/water/richPatch.test.ts`
- Modify: `src/scene/WaterSurface.ts` (a patch child mesh sharing the material; the base mesh discards under the patch in Rich)

**Interfaces:**
- Produces:
  ```ts
  export const PATCH_SIZE = 96;      // m
  export const PATCH_SPACING = 0.25; // m
  export interface PatchRect { x0: number; z0: number; x1: number; z1: number }
  export function patchRect(camera: { x: number; z: number; dirX: number; dirZ: number }, grid: SurfaceGrid, size?: number): PatchRect;
  export function createPatchGeometry(size: number, spacing: number, skirtDepth?: number): BufferGeometry; // grid + skirt, attribute `skirt` 0/1
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { PATCH_SIZE, PATCH_SPACING, createPatchGeometry, patchRect } from './richPatch';

const grid = { xMin: -100, zMin: -60, spacing: 1, nx: 301, nz: 181 };

describe('the dense water patch', () => {
  it('sits ahead of the camera, snapped to whole render nodes', () => {
    const rect = patchRect({ x: 10.3, z: 5.8, dirX: 0, dirZ: -1 }, grid);
    expect(rect.x1 - rect.x0).toBe(PATCH_SIZE);
    expect(Number.isInteger(rect.x0 - grid.xMin)).toBe(true);
    expect(Number.isInteger(rect.z0 - grid.zMin)).toBe(true);
    expect((rect.z0 + rect.z1) / 2).toBeLessThan(5.8); // ahead (−z)
  });
  it('clamps the patch inside the grid when the camera is outside it', () => {
    const rect = patchRect({ x: 900, z: -400, dirX: 1, dirZ: 0 }, grid);
    expect(rect.x1).toBeLessThanOrEqual(grid.xMin + (grid.nx - 1) * grid.spacing);
    expect(rect.z0).toBeGreaterThanOrEqual(grid.zMin);
  });
  it('keeps the patch within a grid smaller than it', () => {
    const small = { xMin: 0, zMin: 0, spacing: 1, nx: 41, nz: 31 };
    const rect = patchRect({ x: 20, z: 15, dirX: 0, dirZ: 1 }, small);
    expect(rect).toEqual({ x0: 0, z0: 0, x1: 40, z1: 30 });
  });
  it('builds a quarter-metre grid with a skirt round its rim', () => {
    const geometry = createPatchGeometry(8, PATCH_SPACING);
    const skirt = geometry.getAttribute('skirt');
    const n = 8 / PATCH_SPACING + 1;
    expect(geometry.getAttribute('position').count).toBe(n * n + 4 * (n - 1));
    let rim = 0;
    for (let i = 0; i < skirt.count; i += 1) rim += skirt.getX(i);
    expect(rim).toBe(4 * (n - 1));
  });
});
```

In `waterLooks.test.ts`:
```ts
it('adds the dense patch only for a Rich cubic source, and the base mesh discards under it', () => {
  const water = new WaterSurface({ ...source, cubic: true });
  expect(water.patch.visible).toBe(false);
  water.setLook('rich');
  expect(water.patch.visible).toBe(true);
  expect(compiled(water.mesh.material).fragment).toContain('waterPatchRect');
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement `richPatch.ts`.**
  - **`patchRect`:**
    - centre = camera + direction (normalised on the ground) × 0.3 × size;
    - half = min(size, grid width, grid depth) / 2 on each axis (per axis: min(size, extent));
    - snap the minimum corner to `grid.xMin + round((cx − half − grid.xMin) / spacing) · spacing`;
    - clamp to `[grid.xMin, grid.xMax − width]`, and the same for z.
  - **`createPatchGeometry`:**
    - an (n × n) vertex grid over [−size/2, size/2]² in xz (y = 0) with `skirt = 0`;
    - then the rim vertices again with `skirt = 1`, in rim order, as a strip joined to the rim;
    - indices for the grid and the skirt quads.

  In `WaterSurface`:
  - **The patch:** `readonly patch = new Mesh(createPatchGeometry(PATCH_SIZE, PATCH_SPACING), this.mesh.material)`, added as a child of `this.mesh`, with `frustumCulled = false` and `visible` equal to the Rich effective look.
  - **Placement:** a `patchRectUniform` (`Vector4` x0, z0, x1, z1) sits in the shared uniforms. Both meshes' `onBeforeRender(renderer, scene, camera)` compute the same `patchRect` from the camera's position and ground direction, so the answer doesn't depend on which draws first. The patch's `position` is set to the rect's centre minus the base mesh's position.
  - **Rich vertex shader:** skirt vertices go `0.3` m below the height, and `vWaterPatch` flags whether the base mesh vertex lies inside the patch.
  - **Rich fragment shader of the base mesh (`waterPatchBase` uniform = 1):** `if ( all( greaterThan( vWaterWorld.xz, waterPatchRect.xy + 0.5 ) ) && all( lessThan( vWaterWorld.xz, waterPatchRect.zw - 0.5 ) ) ) discard;`
  - **The patch's own material instance:** a clone sharing the uniforms but with `waterPatchBase = 0`. Use `material.clone()` with the same `onBeforeCompile` and a cache key `…-patch`.
  - **Shadows:** in `update()`, copy the base mesh's `receiveShadow` to the patch.

- [ ] **Step 4: Run to pass** (Classic snapshots unchanged).
- [ ] **Step 5: Sheet check** — Rich faces carry rounded crests, with no visible seam at the patch rim in any tile; the Below view shows no hole.
- [ ] **Step 6: Commit** — `git commit -am "feat: draw a dense water patch where the camera looks"` (and `git add` the new files).

---

### Task 5: Flow-carried ripples, gloss and specular anti-aliasing

**Files:**
- Create: `src/scene/water/rippleTexture.ts` (+ test), `src/scene/water/specular.ts` (+ test)
- Modify: `src/scene/water/richWaterGlsl.ts`, `src/scene/WaterSurface.ts`

**Interfaces:**
- Produces:
  ```ts
  export const RIPPLE_TILES = [4, 1.3] as const;   // m
  export const RIPPLE_SIZE = 256;                   // texels
  export const RIPPLE_PERIOD = 2;                   // s, the flow-map period (FOAM_FLOW_PERIOD)
  export const RIPPLE_RMS_SLOPE = 0.1;              // at strength 1
  export function rippleSlope(u: number, v: number, seed?: number): [number, number]; // tile coords 0–1, exact and tileable
  export function rippleTexture(seed?: number): DataTexture; // RGBA half float: sx, sz, sx², sz², mipmapped, repeat
  export const waterRipplePars: string;             // GLSL vec2 waterRippleSlopeAt( vec2 p, vec2 flow ); sets waterRippleVariance (declared in richFragmentPars)
  export const RICH_BASE_ROUGHNESS = 0.08;
  export function richRoughness(base: number, variance: number): number; // sqrt(base² + 2·variance), ≤ 0.6
  export const waterSpecularPars: string;           // GLSL richRoughness
  ```

- [ ] **Step 1: Write the failing tests**

```ts
// rippleTexture.test.ts
import { describe, expect, it } from 'vitest';
import { RIPPLE_RMS_SLOPE, RIPPLE_SIZE, rippleSlope, rippleTexture } from './rippleTexture';

describe('ripple texture', () => {
  it('tiles exactly: the slope at one edge equals the opposite edge', () => {
    for (const v of [0.1, 0.37, 0.8]) {
      const [a0, b0] = rippleSlope(0, v);
      const [a1, b1] = rippleSlope(1, v);
      expect(a1).toBeCloseTo(a0, 9);
      expect(b1).toBeCloseTo(b0, 9);
    }
  });
  it('has zero mean and the intended rms slope', () => {
    let sum = 0; let sq = 0; let n = 0;
    for (let i = 0; i < 64; i += 1) for (let j = 0; j < 64; j += 1) {
      const [sx, sz] = rippleSlope(i / 64, j / 64);
      sum += sx + sz; sq += sx * sx + sz * sz; n += 2;
    }
    expect(Math.abs(sum / n)).toBeLessThan(0.01);
    expect(Math.sqrt(sq / n)).toBeCloseTo(RIPPLE_RMS_SLOPE, 2);
  });
  it('stores each slope’s square beside it for filtered variance', () => {
    const texture = rippleTexture();
    expect(texture.image.width).toBe(RIPPLE_SIZE);
    expect(texture.generateMipmaps).toBe(true);
  });
});

// specular.test.ts
import { describe, expect, it } from 'vitest';
import { RICH_BASE_ROUGHNESS, richRoughness } from './specular';

describe('specular anti-aliasing', () => {
  it('keeps the base gloss where the ripples are resolved, and roughens monotonically with their unresolved variance', () => {
    expect(richRoughness(RICH_BASE_ROUGHNESS, 0)).toBeCloseTo(RICH_BASE_ROUGHNESS, 9);
    let last = 0;
    for (const variance of [0, 0.001, 0.004, 0.02, 0.1, 1]) {
      const r = richRoughness(RICH_BASE_ROUGHNESS, variance);
      expect(r).toBeGreaterThanOrEqual(last);
      last = r;
    }
    expect(richRoughness(RICH_BASE_ROUGHNESS, 10)).toBe(0.6);
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement.**
  - **`rippleSlope`:** a seeded sum of 48 cosines of the height `h = Σ a_k cos(2π(n_k · (u, v)) + φ_k)`.
    - Integer wave vectors `n_k` have |n| in 3–28, drawn around the +x wind direction with a cos² spread.
    - Amplitudes follow `a_k ∝ |n_k|^-2` (a wind-sea slope spectrum), and phases come from `seededRandom(seed)`.
    - The slope is the analytic derivative `(∂h/∂u, ∂h/∂v)`, scaled once (computed on a 64² sample) so the rms slope equals `RIPPLE_RMS_SLOPE`.
    - Integer wave vectors make it tile exactly.
  - **`rippleTexture`:**
    - fills a `RIPPLE_SIZE`² RGBA `HalfFloatType` `DataTexture` with (sx, sz, sx², sz²) through `DataUtils.toHalfFloat`;
    - `wrapS = wrapT = RepeatWrapping`, `minFilter = LinearMipmapLinearFilter`, `generateMipmaps = true`;
    - is cached.
  - **`waterRipplePars` (GLSL):**
    ```glsl
    uniform sampler2D waterRippleMap;
    uniform float waterRippleStrength;   // 0 glassy … 1
    // waterRippleVariance is declared in richFragmentPars; vWaterFoam in the water's fragment pars (the far ocean passes 0).
    vec4 waterRippleTap( vec2 p, float tile ) { return texture( waterRippleMap, p / tile ); }
    vec2 waterRippleSlopeAt( vec2 p, vec2 flow ) {
      float a = fract( waterTime / RIPPLE_PERIOD );
      float b = fract( a + 0.5 );
      float w = 1.0 - abs( 2.0 * a - 1.0 );
      vec2 pa = p - flow * a * RIPPLE_PERIOD;
      vec2 pb = p - flow * b * RIPPLE_PERIOD + vec2( 7.13, 3.31 );
      float strength = waterRippleStrength * mix( 0.35, 1.0, clamp( vWaterFoam * 2.0, 0.0, 1.0 ) );
      vec4 s = w * ( waterRippleTap( pa, RIPPLE_TILE_0 ) + 0.6 * waterRippleTap( pa, RIPPLE_TILE_1 ) )
             + ( 1.0 - w ) * ( waterRippleTap( pb, RIPPLE_TILE_0 ) + 0.6 * waterRippleTap( pb, RIPPLE_TILE_1 ) );
      vec2 mean = s.xy / 1.6;
      waterRippleVariance = strength * strength * max( 0.0, ( s.z + s.w ) / 1.6 - dot( mean, mean ) );
      return strength * s.xy;
    }
    ```
    The constants are interpolated from the TypeScript values.
  - **`specular.ts`:** `richRoughness = (base, variance) => Math.min(0.6, Math.sqrt(base * base + 2 * variance))` and the GLSL twin `float richRoughness( float base, float variance ) { return min( 0.6, sqrt( base * base + 2.0 * variance ) ); }`.
  - **`WaterSurface` Rich:**
    - uniforms `waterRippleMap: rippleTexture()`, `waterRippleStrength` (0.8, plus 0.2 × chop / DEFAULT_WATER_CHOP);
    - `richNormalFragment({ ripples: true })`;
    - the material's `roughness` is `RICH_BASE_ROUGHNESS` in Rich (restore 0.62 for Classic in `setLook`);
    - in the Rich body chunk, before the foam mix: `roughnessFactor = richRoughness( roughnessFactor, waterRippleVariance );`. This goes into the foam-composition parameter introduced in Task 7; for now, append it after `waterBodyFragment(...)` in the Rich replacement.

- [ ] **Step 4: Run to pass** (Classic snapshots unchanged).
- [ ] **Step 5: Sheet check** — Rich water shows fine moving ripples and a crisp sun glint; the horizon tile shows no sparkle or moiré.
- [ ] **Step 6: Commit** — `git add src/scene && git commit -m "feat: carry fine ripples on the currents with a glossy, anti-aliased finish"`

---

### Task 6: Face streaks

**Files:**
- Create: `src/scene/water/streaks.ts` (+ test)
- Modify: `src/scene/water/richWaterGlsl.ts` (the Rich body chunk calls `waterStreak`)

**Interfaces:**
- Produces:
  ```ts
  export const STREAK_STRETCH = 7;       // along-current stretch of the lace network
  export const STREAK_OPACITY = 0.55;
  export function streakFrame(x: number, z: number, flowX: number, flowZ: number): [number, number]; // (across, along / STREAK_STRETCH)
  export function streakMask(steepness: number, foam: number): number; // 0 on flat or foam-free water
  export const waterStreakPars: string; // GLSL: float waterStreak( vec2 p, vec2 flow, float steepness, float foam )
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { STREAK_STRETCH, streakFrame, streakMask } from './streaks';

describe('face streaks', () => {
  it('stretch the lace along the current: a step along it moves the pattern 1/STRETCH as far as a step across', () => {
    const [a0, b0] = streakFrame(0, 0, 1, 0);
    const [aAlong, bAlong] = streakFrame(1, 0, 1, 0);
    const [aAcross, bAcross] = streakFrame(0, 1, 1, 0);
    expect(Math.hypot(aAlong - a0, bAlong - b0)).toBeCloseTo(1 / STREAK_STRETCH, 9);
    expect(Math.hypot(aAcross - a0, bAcross - b0)).toBeCloseTo(1, 9);
  });
  it('appear only on steep faces with foam about', () => {
    expect(streakMask(0.05, 0.5)).toBe(0);
    expect(streakMask(0.8, 0)).toBe(0);
    expect(streakMask(0.8, 0.3)).toBeGreaterThan(0.5);
    expect(streakMask(0.9, 0.3)).toBeGreaterThanOrEqual(streakMask(0.6, 0.3));
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement.**
  - **`streakFrame`:** rotates (x, z) into the current's frame (unit direction; +z when still) and divides the along component by `STREAK_STRETCH`.
  - **`streakMask(s, f)`:** `smoothstep(0.35, 0.7, s) · smoothstep(0.02, 0.15, f)`.
  - **GLSL `waterStreak`:**
    - samples `waterFoamTile.r` (the lace wall distance) at `streakFrame(p − flow · a · T) / (FOAM_CELL · FOAM_TILE)` in both flow-map phases;
    - lines = `1 − smoothstep(0.0, 0.07, distance)`, blended by the phase weight;
    - returns `STREAK_OPACITY · lines · streakMask(length(slope), vWaterFoam)`.
  - **The Rich body chunk:** `waterCover = max( waterCover, waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam ) );`, where `waterSurfaceSlope` is kept from the normal chunk as a file-scope `vec2`, declared in the pars.
- [ ] **Step 4: Run to pass** (Classic snapshots unchanged).
- [ ] **Step 5: Sheet check** — thin streaks on the steep face in the face tile, none on calm water.
- [ ] **Step 6: Commit** — `git commit -am "feat: streak foam up steep faces along the current"` (and `git add` the new files).

---

### Task 7: Churn whitewater opening into lace

**Files:**
- Create: `src/scene/water/churnTexture.ts` (+ test)
- Modify: `src/scene/waterOptics.ts` (`waterBodyFragment` gains a `foam` composition parameter whose default reproduces today's four lines exactly), `src/scene/water/richWaterGlsl.ts`, `src/scene/WaterSurface.ts`

**Interfaces:**
- Produces:
  ```ts
  export const CHURN_TILE = 6;            // m
  export function churnSample(u: number, v: number): { density: number; height: number }; // tileable
  export function churnTexture(): DataTexture;     // RG8: density, height; mipmapped, repeat
  export function freshness(foam: number): number; // smoothstep(0.55, 0.9, foam)
  export const CLASSIC_FOAM: string;               // today's four foam lines, verbatim
  export const RICH_FOAM: string;                  // churn–lace–streak composition, matte, creases, backlit edges
  export function waterBodyFragment(crestLight: boolean, caustics?: boolean, foam?: string): string;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { churnSample, freshness } from './churnTexture';
import { CLASSIC_FOAM, waterBodyFragment } from '../waterOptics';

describe('churn whitewater', () => {
  it('tiles seamlessly', () => {
    for (const v of [0.05, 0.5, 0.93]) {
      expect(churnSample(0, v).density).toBeCloseTo(churnSample(1, v).density, 9);
      expect(churnSample(v, 0).height).toBeCloseTo(churnSample(v, 1).height, 9);
    }
  });
  it('is dense: mostly covered, with creases between clumps', () => {
    let covered = 0;
    for (let i = 0; i < 100; i += 1) for (let j = 0; j < 100; j += 1) covered += churnSample(i / 100, j / 100).density;
    expect(covered / 1e4).toBeGreaterThan(0.7);
    expect(covered / 1e4).toBeLessThan(0.95);
  });
  it('takes over from the lace only where the foam is fresh', () => {
    expect(freshness(0.3)).toBe(0);
    expect(freshness(0.95)).toBe(1);
    expect(freshness(0.7)).toBeGreaterThan(freshness(0.6));
  });
  it('keeps the Classic foam composition as the default body chunk', () => {
    expect(waterBodyFragment(true, true)).toBe(waterBodyFragment(true, true, CLASSIC_FOAM));
    expect(waterBodyFragment(true, true)).toContain('roughnessFactor = mix( roughnessFactor, 0.9, waterCover );');
  });
});
```

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement.**
  - **`churnSample`** is a cauliflower Worley pattern, tileable by wrapping the feature-point hash (reuse `foamPattern`'s PCG2D approach, period 8 cells):
    - the base is `F1` over 8×8 cells;
    - `height = 1 − smoothstep(0, 0.55, F1)`, clumps domed;
    - add a second octave at 2× frequency, weighted 0.35, with the same wrap;
    - `density = smoothstep(0.1, 0.35, height)`.
  - **`churnTexture`:** 256² RG8 of (density, height), mipmapped, repeating, cached.
  - **`waterOptics.ts`:**
    - export `CLASSIC_FOAM` as exactly today's four lines (`vec2 waterFootprint = …` through `roughnessFactor = mix( roughnessFactor, 0.9, waterCover );`);
    - `waterBodyFragment(crestLight, caustics = false, foam = CLASSIC_FOAM)` emits `${foam}` where those lines were;
    - the Classic snapshots must stay unchanged.
  - **`RICH_FOAM`:**
    ```glsl
    vec2 waterFootprint = fwidth( vWaterWorld.xz );
    float waterLace = mix( vWaterFoam, waterFoamCover( vWaterWorld.xz, vWaterFlow, vWaterFoam, waterTime, max( waterFootprint.x, waterFootprint.y ) ), waterFoamPattern );
    vec2 waterChurn = waterChurnAt( vWaterWorld.xz, vWaterFlow );            // (density, height), flow-carried two phases
    float waterFresh = smoothstep( 0.55, 0.9, vWaterFoam ) * waterFoamPattern;
    float waterCover = mix( waterLace, max( waterLace, waterChurn.x ), waterFresh );
    waterCover = max( waterCover, waterStreak( vWaterWorld.xz, vWaterFlow, length( waterSurfaceSlope ), vWaterFoam ) );
    float waterCrease = mix( 1.0, 0.72 + 0.28 * waterChurn.y, waterFresh );
    diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor * waterCrease, waterCover );
    roughnessFactor = mix( richRoughness( roughnessFactor, waterRippleVariance ), 0.7, waterCover );
    // Thin fresh foam glows when the sun is behind it.
    totalEmissiveRadiance += 0.18 * waterFresh * ( 1.0 - waterChurn.x ) * pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 6.0 ) * waterSunRadiance;
    ```
    - `waterChurnAt` samples `waterChurnMap` at `(p − flow · a · T) / CHURN_TILE` in two phases, blended.
    - Its height gradient bumps the normal where fresh. It is computed in the normal chunk from `waterChurnMap` with a small offset (`waterChurnBump` scaled by freshness, added to `waterSlope` before the normal is written), so `vWaterFoam` is read there too.
  - **`WaterSurface` Rich:** replaces `<emissivemap_fragment>` with `waterBodyFragment(true, true, RICH_FOAM)`, drops the Task 5 appended roughness line (now inside `RICH_FOAM`), and adds the uniform `waterChurnMap: churnTexture()`.
- [ ] **Step 4: Run to pass**, with the Classic snapshots unchanged (the proof that `CLASSIC_FOAM` is verbatim).
- [ ] **Step 5: Sheet check** — the bore tile shows a bright, clumpy mass fading into lace behind; foam still sits on the surface, never above it.
- [ ] **Step 6: Commit** — `git add src/scene && git commit -m "feat: draw fresh whitewater as churn that opens into lace"`

---

### Task 8: Lit mist and softer spray

**Files:**
- Create: `src/scene/water/mist.ts` (+ test)
- Modify: `src/scene/SprayPoints.ts` (the Rich shaders, `useWater(uniforms)`, `setSun(direction, radiance)`), `src/game/PhysicalMode.ts` (passes the water's height uniforms and the sun, one or two lines), `src/main.ts` (calls them in `refreshSun` and at start-up)

**Interfaces:**
- Produces:
  ```ts
  export const MIST_SIZE = 0.25;  // m: G6 mist is 0.35–0.8 m, drops 0.06–0.14 m
  export function isMist(size: number): boolean;
  export function henyeyGreenstein(cosTheta: number, g: number): number; // normalised over the sphere
  export const MIST_G = 0.6;
  // SprayPoints
  useWater(uniforms: { waterSurface: { value: unknown }; waterGrid: { value: unknown }; waterGridSize: { value: unknown } }): void;
  setSun(direction: Vector3, radiance: Color): void;
  ```

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import { MIST_G, henyeyGreenstein, isMist } from './mist';

describe('mist', () => {
  it('tells mist from drops by size', () => {
    expect(isMist(0.4)).toBe(true);
    expect(isMist(0.1)).toBe(false);
  });
  it('scatters forward: brightest looking toward the sun, normalised over the sphere', () => {
    expect(henyeyGreenstein(1, MIST_G)).toBeGreaterThan(10 * henyeyGreenstein(-1, MIST_G));
    let total = 0;
    const n = 2000;
    for (let i = 0; i < n; i += 1) { const c = -1 + (2 * (i + 0.5)) / n; total += henyeyGreenstein(c, MIST_G) * 2 * Math.PI * (2 / n); }
    expect(total).toBeCloseTo(1, 2);
  });
});
```

In `waterLooks.test.ts`: in Rich, `SprayPoints`' vertex shader reads `waterHeightAt` and its fragment uses `henyeyGreenstein`; switching to Classic restores the pinned snapshot strings.

- [ ] **Step 2: Run to fail.**

- [ ] **Step 3: Implement.**
  - **`mist.ts`:** `henyeyGreenstein(c, g) = (1 − g²) / (4π (1 + g² − 2gc)^1.5)`.
  - **Rich `SprayPoints` shaders:**
    - The vertex shader includes the water height lookup (`waterHeightAt`, as in `WaterSurface`'s pars), `vAbove = position.y − waterHeightAt(position.xz)`, and `vMist = look.x > MIST_SIZE`. Mist points are drawn 1.6× larger.
    - The fragment shader:
      - colour = `sprayColor · (0.35 + sunRadiance · (vMist ? 4π·HG(dot(viewDir, sunDir), MIST_G) · 0.25 : 1.0) · 0.5)`;
      - opacity × `smoothstep(-0.1, 0.35, vAbove)`, fading into the water with no hard line;
      - mist a softer disc: `(1 − r)²`.
  - **Wiring:** the uniforms `waterSurface`, `waterGrid` and `waterGridSize` are the water's own uniform objects, passed with `useWater(water.causticSource)` (it exposes those uniforms). The sun comes from `setSun(direction, radiance)`, called in `main.ts` `refreshSun` beside the water's `setSun`.
- [ ] **Step 4: Run to pass** (Classic snapshots unchanged).
- [ ] **Step 5: Sheet check** — at sunset, mist over the bore glows when backlit; drops stay small; no hard cut where sprites meet the water.
- [ ] **Step 6: Commit** — `git add src && git commit -m "feat: light the mist toward the sun and fade spray into the water"`

---

### Task 9: The far ocean in Rich

**Files:**
- Modify: `src/scene/FarFieldOcean.ts`, `src/scene/water/richWaterGlsl.ts`
- Test: `src/scene/waterLooks.test.ts`

**Interfaces:**
- Consumes: `waterRipplePars`, `rippleTexture`, `waterSpecularPars`, `richRoughness`, `RICH_BASE_ROUGHNESS` (Task 5).
- Produces: `FarFieldOcean.setLook('rich')` compiles ripple normals (strength 0.5, no current: `vWaterFlow` is zero) and the gloss with specular anti-aliasing.

- [ ] **Step 1: Write the failing test** — in Rich, the far ocean's fragment contains `waterRippleSlopeAt` and `richRoughness`; the Classic snapshot is unchanged after switching back.
- [ ] **Step 2: Run to fail.**
- [ ] **Step 3: Implement.** The Rich `onBeforeCompile` branch:
  - replaces `<normal_fragment_begin>` with the chop and ripple version: the analytic far normal as today, plus `waterRippleSlopeAt( vWaterWorld.xz, vec2( 0.0 ) )`, the far ocean having no current;
  - includes `richFragmentPars` (for `waterRippleVariance`);
  - sets roughness `RICH_BASE_ROUGHNESS` with `richRoughness` in the body chunk (`waterBodyFragment(false, false, RICH_FAR_FOAM)`, where `RICH_FAR_FOAM` is `CLASSIC_FOAM` with the Rich roughness line);
  - adds the uniforms `waterRippleMap` and `waterRippleStrength: 0.5`.
- [ ] **Step 4: Run to pass.**
- [ ] **Step 5: Sheet check** — the horizon tile: near and far water match in gloss and ripple, with no seam at the tank edge.
- [ ] **Step 6: Commit** — `git commit -am "feat: give the far ocean the Rich ripples and gloss"`

---

### Task 10: Colour tuning, performance and the record

**Files:**
- Modify: `src/scene/waterOptics.ts` (only the tuned constants, if the sheet calls for them), `ROADMAP.md`, this plan (rewritten as the design record)

- [ ] **Step 1: Tune on the sheet.**
  - Compare the Rich tiles (dawn, midday, sunset) with the reference stills (`TARlXzLDSBo` thumbnails and `ivd7SXxeaDI` storyboard frames, kept in the scratchpad).
  - Adjust only these knobs: `WATER_BODY_GAIN` (Rich may take its own gain uniform), `CREST_SCATTER`, the water material's `envMapIntensity` balance, and `renderer.toneMappingExposure`.
  - Record each value and why. Classic keeps its values: if a constant must differ, give Rich its own uniform so the Classic snapshots stay unchanged.
- [ ] **Step 2: Measure performance.**
  - With the browser pane shown, run a Point session at each preset (Low = Classic; Medium, High and Ultra = Rich), and also Medium forced to Classic.
  - Measure the median and 90th-percentile frame intervals over 240 frames (the `requestAnimationFrame` timing snippet from G7).
  - Record them in the record. Never a gate.
- [ ] **Step 3: Full suite and build** — `npx vitest run` (re-run alone any known load-sensitive timeouts) and `npm run build`.
- [ ] **Step 4: Docs.**
  - `ROADMAP.md`: a **G8 · Rich water** entry with what was built, the measured frame times, and the Backlog: the lip and tube look (after P7's tubes), reflections, refraction, and a middle water level if the M1 Air needs one.
  - This plan rewritten as the design record, with its deviations.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "docs: record G8, rich water"`
