# G3 Physically Based Water Shading Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Shade both water meshes from water optics: Fresnel reflection, per-channel Beer–Lambert absorption down to the seabed, and sunlight transmitted through thin crests ([plan](../../research/wave-formation-plan.md) §2.3, Q7, Q17).

**Architecture:** A new `src/scene/waterOptics.ts` holds the optics model twice: as TypeScript functions (the tested reference) and as a GLSL chunk whose uniforms are computed by those functions, so the two cannot drift. The tank water gets a second, static float texture with the bed elevation per render node. Its fragment shader computes the water-body reflectance from the local depth and adds crest transmission by marching the refracted view ray through the height texture. The far field uses the same body reflectance with its tabulated depth. Fresnel comes from three's own physical lighting by setting `ior = 1.333`.

**Tech Stack:** TypeScript, three.js r186 `MeshPhysicalMaterial.onBeforeCompile`, GLSL ES 3.0 (WebGL2), Vitest.

## Global Constraints

- One water state (ADR 0002): shading adds pixels, never a second wave. The shader reads only the heights and bed that the physics or legacy field already produce.
- Channels (R, G, B) stand for 650, 550 and 450 nm.
- Pure-water absorption (Pope & Fry 1997): a = 0.340, 0.0565, 0.00922 m⁻¹. Through 1 m red keeps 71 %, green 94 %, blue 99 %.
- Fresnel F₀ = ((n − 1)/(n + 1))² = 0.020 for n = 1.333.
- Budget: per-pixel ALU plus at most 4 extra height lookups for the crest (plan §2.3). Upload ≤ 0.5 ms on the main thread (§3.1), so the per-frame texture stays RG and the bed uploads only when it changes.
- Readability of the face and the pocket wins any conflict (§2.8).
- Tests run in Node; shader behaviour is tested through CPU mirrors, and each shader patch through a test that every replaced `#include` exists.

## Sources (checked 2026-09-25)

- Shallow-water reflectance R = R∞ + (A − R∞)·e^{−2KH}: Maritorena, Morel & Gentili 1994, *Limnol. Oceanogr.* 39, 1689–1703. Stage 1 uses the plan's beam attenuation along the refracted sun and view paths in place of 2KH.
- R∞ ≈ 0.33 b_b/(a + b_b): Morel & Prieur 1977; Gordon et al. 1975.
- Molecular scattering b_m = 0.0076 (400/λ)^4.32 m⁻¹ (Smith & Baker 1981 Table 1, after Morel 1974); backscatter is half of it.
- Particle backscatter fraction 0.0183 (Petzold average phase function, Mobley 1994).
- Particle beam attenuation: about 0.01 m⁻¹ in the open ocean, 0.5 to more than 2.5 m⁻¹ in turbid coastal water (IOCCG beam-c protocol 2019; Antarctic Peninsula and coastal AVHRR studies).

## File Structure

- Create `src/scene/waterOptics.ts`: constants, per-spot optics, CPU model, GLSL chunk, uniform helpers.
- Create `src/scene/waterOptics.test.ts`.
- Modify `src/scene/WaterSurface.ts`: bed texture, optics uniforms, fragment shading, `setOptics`, `setSun`.
- Modify `src/scene/LegacySurfaceSource.ts`, `src/scene/PhysicalSurfaceSource.ts`: `bedRevision`, `writeBed`.
- Modify `src/wave/SurfZoneSimulation.ts`: `writeUniformBed`.
- Modify `src/scene/FarFieldOcean.ts`: body reflectance, `setOptics`, `setSun`.
- Modify `src/game/PhysicalMode.ts`, `src/main.ts`: per-spot optics and the sun.
- Tests: `src/scene/WaterSurface.test.ts`, `src/scene/PhysicalSurfaceSource.test.ts`, `src/scene/FarFieldOcean.test.ts`, `src/game/PhysicalMode.test.ts`.

---

### Task 1: Water optics model

**Files:**
- Create: `src/scene/waterOptics.ts`
- Test: `src/scene/waterOptics.test.ts`

**Interfaces:**
- Produces: `type Rgb`, `WATER_IOR`, `WATER_F0`, `WATER_ABSORPTION`, `WATER_BACKSCATTER`, `interface WaterOptics { turbidity; bedAlbedo }`, `SPOT_OPTICS: Record<SpotName, WaterOptics>`, `schlickFresnel(cosine, f0?)`, `refractedCosine(cosine)`, `beamAttenuation(optics)`, `transmittance(optics, path)`, `deepReflectance(optics)`, `shallowReflectance(optics, depth, viewCosine, sunCosine)`, `CREST_SAMPLES`, `OPAQUE`, `crestThickness(heightAt, origin, direction)`.

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, expect, it } from 'vitest';
import {
  OPAQUE, SPOT_OPTICS, WATER_F0, beamAttenuation, crestThickness, deepReflectance, refractedCosine,
  schlickFresnel, shallowReflectance, transmittance, type WaterOptics,
} from './waterOptics';

const pure: WaterOptics = { turbidity: 0, bedAlbedo: [0.4, 0.35, 0.25] };

describe('water optics', () => {
  it('reflects 2 % at normal incidence and everything at grazing (Schlick, n = 1.333)', () => {
    expect(WATER_F0).toBeCloseTo(0.0204, 4);
    expect(schlickFresnel(1)).toBeCloseTo(WATER_F0, 12);
    expect(schlickFresnel(0)).toBe(1);
    expect(schlickFresnel(0.2)).toBeGreaterThan(schlickFresnel(0.6));
  });

  // Plan §2.3: through 1 m of water red transmits 71 %, green 94 % and blue 99 %.
  it('absorbs red first: 1 m of pure water keeps 71 %, 94 % and 99 %', () => {
    const [r, g, b] = transmittance(pure, 1);
    expect(r).toBeCloseTo(0.71, 2);
    expect(g).toBeCloseTo(0.945, 3);
    expect(b).toBeCloseTo(0.991, 3);
    const murky = { ...pure, turbidity: 0.5 };
    expect(beamAttenuation(murky)[1]).toBeCloseTo(0.0565 + 0.5, 12);
  });

  it('makes deep clear water blue, and turbidity brightens it', () => {
    const [r, g, b] = deepReflectance(pure);
    expect(b).toBeGreaterThan(5 * g);
    expect(g).toBeGreaterThan(5 * r);
    expect(b).toBeCloseTo(0.33 * 0.00229 / (0.00922 + 0.00229), 3);
    expect(deepReflectance({ ...pure, turbidity: 0.3 })[1]).toBeGreaterThan(g);
  });

  it('refracts toward the normal, so paths under water stay within 1.5× the depth', () => {
    expect(refractedCosine(1)).toBe(1);
    expect(refractedCosine(0)).toBeCloseTo(Math.sqrt(1 - 1 / 1.333 ** 2), 12);
  });

  it('shows a shallow sandbar as turquoise and a deep channel as the deep-water colour', () => {
    const beach = SPOT_OPTICS.beach;
    const bar = shallowReflectance(beach, 1.5, 1, 0.8);
    const channel = shallowReflectance(beach, 12, 1, 0.8);
    const deep = deepReflectance(beach);
    for (let i = 0; i < 3; i += 1) expect(channel[i]).toBeCloseTo(deep[i], 2);
    expect(bar[1]).toBeGreaterThan(3 * channel[1]);
    expect(bar[1] / bar[0]).toBeGreaterThan(beach.bedAlbedo[1] / beach.bedAlbedo[0]);
    let previous = Infinity;
    for (let depth = 0; depth <= 20; depth += 0.5) {
      const green = shallowReflectance(beach, depth, 1, 0.8)[1];
      expect(green).toBeLessThanOrEqual(previous);
      previous = green;
    }
    expect(shallowReflectance(beach, 0, 1, 1)).toEqual(beach.bedAlbedo);
  });

  it('hides the bed sooner in turbid water', () => {
    const contrast = (optics: WaterOptics) => shallowReflectance(optics, 3, 1, 1)[1] - deepReflectance(optics)[1];
    expect(contrast(SPOT_OPTICS.reef)).toBeGreaterThan(contrast(SPOT_OPTICS.beach));
  });

  it('measures the thickness a refracted ray crosses before leaving the back of a crest', () => {
    const ridge = (_x: number, z: number) => 1.5 * Math.exp(-((z / 0.8) ** 2));
    const z0 = -0.5;
    const origin = { x: 0, y: ridge(0, z0), z: z0 };
    const direction = { x: 0, y: -0.25, z: 0.97 };
    const thickness = crestThickness(ridge, origin, direction);
    // The ray leaves the back face near z ≈ +0.35 m, about 0.9 m from the entry point.
    expect(thickness).toBeGreaterThan(0.6);
    expect(thickness).toBeLessThan(1.2);
    expect(crestThickness(() => 0, { x: 0, y: 0, z: 0 }, { x: 0, y: -0.5, z: 0.87 })).toBe(OPAQUE);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/scene/waterOptics.test.ts`
Expected: FAIL, "Failed to resolve import './waterOptics'".

- [ ] **Step 3: Implement `src/scene/waterOptics.ts`**

```ts
import type { SpotName } from '../wave/Bathymetry';

/** Linear RGB; the channels stand for 650, 550 and 450 nm. */
export type Rgb = readonly [number, number, number];

export const WATER_IOR = 1.333;
/** Normal-incidence Fresnel reflectance of water, ((n − 1)/(n + 1))² ≈ 0.020. */
export const WATER_F0 = ((WATER_IOR - 1) / (WATER_IOR + 1)) ** 2;
/** Pure-water absorption at 650, 550 and 450 nm, m⁻¹ (Pope & Fry 1997). */
export const WATER_ABSORPTION: Rgb = [0.34, 0.0565, 0.00922];
/** Pure-seawater backscattering: half of b_m = 0.0076 (400/λ)^4.32 m⁻¹ (Smith & Baker 1981, after Morel 1974). */
export const WATER_BACKSCATTER: Rgb = [650, 550, 450].map((nm) => 0.5 * 0.0076 * (400 / nm) ** 4.32) as unknown as Rgb;
/** Backscatter fraction of the Petzold average particle phase function (Mobley 1994). */
export const PARTICLE_BACKSCATTER_FRACTION = 0.0183;

export interface WaterOptics {
  /** Suspended-particle scattering, m⁻¹. Spectrally flat, it adds to the beam attenuation and backscatters 1.83 %. */
  readonly turbidity: number;
  /** Seabed albedo, linear RGB. */
  readonly bedAlbedo: Rgb;
}

/**
 * Water per spot. Particle beam attenuation runs from about 0.01 m⁻¹ offshore to
 * 0.5–2.5 m⁻¹ and more in turbid coastal water; these keep the bed readable a few
 * metres down, clearest over the reef's carbonate sand.
 */
export const SPOT_OPTICS: Record<SpotName, WaterOptics> = {
  beach: { turbidity: 0.3, bedAlbedo: [0.42, 0.36, 0.24] },
  point: { turbidity: 0.18, bedAlbedo: [0.36, 0.33, 0.24] },
  reef: { turbidity: 0.06, bedAlbedo: [0.5, 0.47, 0.36] },
  canyon: { turbidity: 0.2, bedAlbedo: [0.42, 0.36, 0.24] },
};

const perChannel = (value: (channel: number) => number): Rgb => [value(0), value(1), value(2)];

export function schlickFresnel(cosine: number, f0 = WATER_F0): number {
  const c = Math.min(1, Math.max(0, cosine));
  return f0 + (1 - f0) * (1 - c) ** 5;
}

/** Cosine from the normal of the ray refracted under water, for an air-side cosine. */
export function refractedCosine(cosine: number): number {
  const c = Math.min(1, Math.max(0, cosine));
  return Math.sqrt(1 - (1 - c * c) / (WATER_IOR * WATER_IOR));
}

/** Beam attenuation c = a_w + turbidity, m⁻¹. */
export function beamAttenuation(optics: WaterOptics): Rgb {
  return perChannel((i) => WATER_ABSORPTION[i] + optics.turbidity);
}

/** Share of light left after `path` metres of water, e^{−c·path} (Beer–Lambert). */
export function transmittance(optics: WaterOptics, path: number): Rgb {
  const attenuation = beamAttenuation(optics);
  return perChannel((i) => Math.exp(-attenuation[i] * path));
}

/** Reflectance of bottomless water just below the surface, R∞ = 0.33 b_b/(a + b_b) (Morel & Prieur 1977). */
export function deepReflectance(optics: WaterOptics): Rgb {
  return perChannel((i) => {
    const backscatter = WATER_BACKSCATTER[i] + PARTICLE_BACKSCATTER_FRACTION * optics.turbidity;
    return (0.33 * backscatter) / (WATER_ABSORPTION[i] + backscatter);
  });
}

/**
 * Reflectance of water `depth` metres deep over the seabed, R = R∞ + (A − R∞)·T
 * (Maritorena, Morel & Gentili 1994), with T the beam transmittance along the
 * refracted sun path down and view path up.
 */
export function shallowReflectance(optics: WaterOptics, depth: number, viewCosine: number, sunCosine: number): Rgb {
  const path = Math.max(0, depth) * (1 / refractedCosine(viewCosine) + 1 / refractedCosine(sunCosine));
  const deep = deepReflectance(optics);
  const through = transmittance(optics, path);
  return perChannel((i) => deep[i] + (optics.bedAlbedo[i] - deep[i]) * through[i]);
}

export interface Point3 { x: number; y: number; z: number }

/** Distances along the refracted view ray where the shader samples the surface, m (plan §2.3: 2–4 lookups). */
export const CREST_SAMPLES = [0.5, 1, 2, 4] as const;
/** Thickness reported when the ray is still under water after the last sample. */
export const OPAQUE = 1e4;

/**
 * Water a refracted view ray entering at `origin` crosses before it leaves the
 * back of a crest, interpolating the surface crossing between samples.
 */
export function crestThickness(heightAt: (x: number, z: number) => number, origin: Point3, direction: Point3): number {
  let previous = 0;
  let previousGap = 0;
  for (const distance of CREST_SAMPLES) {
    const gap = heightAt(origin.x + direction.x * distance, origin.z + direction.z * distance) - (origin.y + direction.y * distance);
    if (gap <= 0) return previous + ((distance - previous) * previousGap) / (previousGap - gap);
    previous = distance;
    previousGap = gap;
  }
  return OPAQUE;
}
```

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/scene/waterOptics.test.ts`
Expected: PASS (7 tests). If the crest thickness bound fails, print the value and fix the expected window from the geometry (the entry is at z = −0.5 on a 1.5 m Gaussian ridge of width 0.8 m), not the algorithm.

- [ ] **Step 5: Commit**

```bash
git add src/scene/waterOptics.ts src/scene/waterOptics.test.ts
git commit -m "feat: add the water optics model for physically based shading"
```

### Task 2: Seabed elevation for the tank water

**Files:**
- Modify: `src/scene/WaterSurface.ts` (`SurfaceSource`, bed texture, `sampleSurfaceBed`)
- Modify: `src/scene/LegacySurfaceSource.ts`, `src/scene/PhysicalSurfaceSource.ts`
- Modify: `src/wave/SurfZoneSimulation.ts` (`writeUniformBed`)
- Test: `src/scene/WaterSurface.test.ts`, `src/scene/PhysicalSurfaceSource.test.ts`

**Interfaces:**
- Produces: `SurfaceSource.bedRevision: number`, `SurfaceSource.writeBed(data: Float32Array): void` (bed elevation per render node, m, negative below datum), `WaterSurface.bedData: Float32Array`, `sampleSurfaceBed(bed, grid, x, z): number` (bilinear like `sampleSurfaceHeight`), `SurfZoneSimulation.writeUniformBed(data, grid)`, `RenderableSurfZone.writeUniformBed`.

- [ ] **Step 1: Write the failing tests**

In `src/scene/WaterSurface.test.ts`:

```ts
  it('uploads the legacy bed and follows it when the grid scrolls', () => {
    const { wave, surface } = advancedSurface({}, 1);
    const check = () => {
      for (let iz = 0; iz < wave.nz; iz += 9) {
        for (let ix = 0; ix < wave.nx; ix += 5) {
          const x = wave.xMin + ix * wave.spacing;
          const z = wave.zMin + iz * wave.spacing;
          expect(surface.bedData[iz * wave.nx + ix]).toBeCloseTo(-wave.depthAt(x, z), 6);
          expect(sampleSurfaceBed(surface.bedData, surface.grid, x, z)).toBeCloseTo(-wave.depthAt(x, z), 6);
        }
      }
    };
    check();
    const zMin = wave.zMin;
    for (let i = 0; i < 60 * 30 && wave.zMin === zMin; i += 1) { wave.step(1 / 60); surface.update(); }
    expect(wave.zMin).not.toBe(zMin);
    check();
  });
```

In `src/scene/PhysicalSurfaceSource.test.ts` (use the file's existing small `SurfZoneSimulation` setup):

```ts
  it('writes the bed under every render node, 5 cm above the tucked-in dry surface', () => {
    const source = new PhysicalSurfaceSource(simulation, 1);
    const nodes = source.grid.nx * source.grid.nz;
    const surface = new Float32Array(nodes * 2);
    const bed = new Float32Array(nodes);
    source.write(surface);
    source.writeBed(bed);
    let dry = 0;
    let wet = 0;
    for (let k = 0; k < nodes; k += 1) {
      const depth = surface[k * 2] - bed[k];
      if (depth < 0) { expect(depth).toBeCloseTo(-0.05, 5); dry += 1; } else { expect(depth).toBeGreaterThan(0.009); wet += 1; }
    }
    expect(dry).toBeGreaterThan(0);
    expect(wet).toBeGreaterThan(0);
    expect(source.bedRevision).toBe(simulation.windowXMin);
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/scene/WaterSurface.test.ts src/scene/PhysicalSurfaceSource.test.ts`
Expected: FAIL (`sampleSurfaceBed` not exported; `bedData`, `writeBed` undefined).

- [ ] **Step 3: Implement**

`WaterSurface.ts`: add to `SurfaceSource`

```ts
  /** Changes whenever `writeBed` would write different values. */
  readonly bedRevision: number;
  /** Bed elevation per grid node, m (negative below datum). */
  writeBed(data: Float32Array): void;
```

add the CPU mirror

```ts
/** CPU mirror of `waterBedAt` in the shaders: bilinear bed elevation, m. */
export function sampleSurfaceBed(bed: Float32Array, grid: SurfaceGrid, x: number, z: number): number {
  const gx = Math.min(grid.nx - 1, Math.max(0, (x - grid.xMin) / grid.spacing));
  const gz = Math.min(grid.nz - 1, Math.max(0, (z - grid.zMin) / grid.spacing));
  const x0 = Math.min(grid.nx - 2, Math.floor(gx));
  const z0 = Math.min(grid.nz - 2, Math.floor(gz));
  const tx = gx - x0;
  const tz = gz - z0;
  const i = z0 * grid.nx + x0;
  const top = bed[i] * (1 - tx) + bed[i + 1] * tx;
  const bottom = bed[i + grid.nx] * (1 - tx) + bed[i + grid.nx + 1] * tx;
  return top * (1 - tz) + bottom * tz;
}
```

and in `WaterSurface`: a `bedData` array and an R32F `bedTexture` (`RedFormat`, `FloatType`, nearest) created with the surface texture, bound as uniform `waterBed`, rebuilt in `setSource` when the grid changes, and refreshed in `update()`:

```ts
    if (this.source !== this.bedSource || this.source.bedRevision !== this.bedRevision) {
      this.source.writeBed(this.bedData);
      this.bedSource = this.source;
      this.bedRevision = this.source.bedRevision;
      this.bedTexture.needsUpdate = true;
    }
```

`LegacySurfaceSource`: `get bedRevision() { return this.wave.zMin; }` and

```ts
  writeBed(data: Float32Array): void {
    const wave = this.wave;
    for (let iz = 0; iz < wave.nz; iz += 1) {
      const z = wave.zMin + iz * wave.spacing;
      for (let ix = 0; ix < wave.nx; ix += 1) data[iz * wave.nx + ix] = -wave.depthAt(wave.xMin + ix * wave.spacing, z);
    }
  }
```

`SurfZoneSimulation.writeUniformBed(data, grid)`: the same bilinear bed interpolation as `writeUniformSurface` (`mappingFor(grid)`, `bottom` per node) written to `data[k]`. `PhysicalSurfaceSource`: `get bedRevision() { return this.simulation.windowXMin; }` and `writeBed(data) { this.grid.xMin = this.simulation.windowXMin; this.simulation.writeUniformBed(data, this.grid); }`; add `writeUniformBed` to `RenderableSurfZone`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/scene src/wave/SurfZoneSimulation.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/WaterSurface.ts src/scene/WaterSurface.test.ts src/scene/LegacySurfaceSource.ts src/scene/PhysicalSurfaceSource.ts src/scene/PhysicalSurfaceSource.test.ts src/wave/SurfZoneSimulation.ts
git commit -m "feat: give the water shader the seabed under every node"
```

### Task 3: Tank water shading

**Files:**
- Modify: `src/scene/waterOptics.ts` (GLSL chunk and uniform helpers)
- Modify: `src/scene/WaterSurface.ts`
- Test: `src/scene/waterOptics.test.ts`, `src/scene/WaterSurface.test.ts`

**Interfaces:**
- Consumes: Task 1's model; Task 2's `waterBed` texture.
- Produces: `waterOpticsPars` (GLSL: uniforms `waterAttenuation`, `waterDeepReflectance`, `waterBedAlbedo`, `waterSunDirection`, `waterSunRadiance`, `waterBodyGain`; functions `waterFresnel(c)`, `waterRefractedCosine(c)`, `waterBodyReflectance(depth, viewCos, sunCos)`), `createOpticsUniforms(): Record<string, { value: unknown }>`, `applyOptics(uniforms, optics)`, `applySun(uniforms, direction: Vector3, radiance: Color)`, `WaterSurface.setOptics(optics)`, `WaterSurface.setSun(direction, radiance)`.

- [ ] **Step 1: Write the failing tests**

In `waterOptics.test.ts`:

```ts
  it('feeds the shader uniforms from the same model', () => {
    const uniforms = createOpticsUniforms();
    applyOptics(uniforms, SPOT_OPTICS.reef);
    const vector = (name: string) => (uniforms[name].value as Vector3).toArray();
    expect(vector('waterAttenuation')).toEqual([...beamAttenuation(SPOT_OPTICS.reef)]);
    expect(vector('waterDeepReflectance')).toEqual([...deepReflectance(SPOT_OPTICS.reef)]);
    expect(vector('waterBedAlbedo')).toEqual([...SPOT_OPTICS.reef.bedAlbedo]);
    expect(waterOpticsPars).toContain(`${WATER_IOR}`);
  });
```

In `WaterSurface.test.ts`, a patch test:

```ts
import { ShaderLib } from 'three';

  it('patches every shader chunk it replaces', () => {
    const { surface } = advancedSurface({}, 1);
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    surface.mesh.material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain('waterBedAt');
    expect(shader.vertexShader).not.toContain('#include <beginnormal_vertex>');
    expect(shader.vertexShader).not.toContain('#include <begin_vertex>');
    expect(shader.fragmentShader).toContain('waterBodyReflectance( vWaterDepth');
    expect(shader.fragmentShader).toContain('waterCrestThickness');
    expect(shader.fragmentShader).not.toContain('#include <color_fragment>');
    expect(surface.mesh.material.ior).toBeCloseTo(1.333, 6);
    expect(Object.keys(shader.uniforms)).toEqual(expect.arrayContaining(['waterBed', 'waterAttenuation', 'waterSunDirection']));
  });
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/scene/waterOptics.test.ts src/scene/WaterSurface.test.ts`
Expected: FAIL (`createOpticsUniforms` missing; shader lacks `waterBedAt`).

- [ ] **Step 3: Implement**

Add to `waterOptics.ts`:

```ts
export const waterOpticsPars = /* glsl */ `
uniform vec3 waterAttenuation;
uniform vec3 waterDeepReflectance;
uniform vec3 waterBedAlbedo;
uniform vec3 waterSunDirection;
uniform vec3 waterSunRadiance;
uniform float waterBodyGain;

float waterFresnel( float c ) { return ${WATER_F0.toFixed(6)} + ( 1.0 - ${WATER_F0.toFixed(6)} ) * pow( 1.0 - clamp( c, 0.0, 1.0 ), 5.0 ); }
float waterRefractedCosine( float c ) { c = clamp( c, 0.0, 1.0 ); return sqrt( 1.0 - ( 1.0 - c * c ) / ( ${WATER_IOR} * ${WATER_IOR} ) ); }
// shallowReflectance() in waterOptics.ts.
vec3 waterBodyReflectance( float depth, float viewCosine, float sunCosine ) {
  float path = max( depth, 0.0 ) * ( 1.0 / waterRefractedCosine( viewCosine ) + 1.0 / waterRefractedCosine( sunCosine ) );
  return waterDeepReflectance + ( waterBedAlbedo - waterDeepReflectance ) * exp( -waterAttenuation * path );
}
`;

export function createOpticsUniforms(): Record<string, { value: unknown }> {
  const uniforms = {
    waterAttenuation: { value: new Vector3() }, waterDeepReflectance: { value: new Vector3() }, waterBedAlbedo: { value: new Vector3() },
    waterSunDirection: { value: new Vector3(0, 1, 0) }, waterSunRadiance: { value: new Color(1, 1, 1) }, waterBodyGain: { value: 1 },
  };
  applyOptics(uniforms, SPOT_OPTICS.beach);
  return uniforms;
}

export function applyOptics(uniforms: Record<string, { value: unknown }>, optics: WaterOptics): void {
  (uniforms.waterAttenuation.value as Vector3).fromArray(beamAttenuation(optics));
  (uniforms.waterDeepReflectance.value as Vector3).fromArray(deepReflectance(optics));
  (uniforms.waterBedAlbedo.value as Vector3).fromArray(optics.bedAlbedo);
}

/** `direction` points toward the sun (world); `radiance` is the sun light's colour × intensity. */
export function applySun(uniforms: Record<string, { value: unknown }>, direction: Vector3, radiance: Color): void {
  (uniforms.waterSunDirection.value as Vector3).copy(direction).normalize();
  (uniforms.waterSunRadiance.value as Color).copy(radiance);
}
```

In `WaterSurface.ts`:
- Material: `ior: WATER_IOR`, `clearcoat: 0` (water has one interface), keep roughness for now (tuned in Task 5).
- Uniforms: spread `createOpticsUniforms()`, add `waterBed`, drop `waterBaseColor` and `waterCrestColor`.
- Vertex pars: `uniform sampler2D waterBed; varying float vWaterDepth; varying float vWaterFoam;` and `waterBedAt(xz)` (the `sampleSurfaceBed` lookup). `waterBeginNormal` sets `vWaterDepth = max( 0.0, waterHeight - waterBedAt( waterXZ ) ); vWaterFoam = waterFoamAt( waterXZ );` instead of `vWaterColor`.
- Fragment: `#include <common>` gets the height lookup (`waterHeightAt`, shared string with the vertex pars), `waterOpticsPars`, the chop pars and

```glsl
float waterCrestThickness( vec3 origin, vec3 direction ) {
  const float samples[4] = float[4]( 0.5, 1.0, 2.0, 4.0 );
  float previous = 0.0;
  float previousGap = 0.0;
  for ( int i = 0; i < 4; i ++ ) {
    vec3 p = origin + direction * samples[ i ];
    float gap = waterHeightAt( p.xz ) - p.y;
    if ( gap <= 0.0 ) return previous + ( samples[ i ] - previous ) * previousGap / ( previousGap - gap );
    previous = samples[ i ];
    previousGap = gap;
  }
  return 1e4;
}
```

  `#include <color_fragment>` becomes empty, and `#include <emissivemap_fragment>` becomes

```glsl
#include <emissivemap_fragment>
{
  vec3 waterN = normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
  vec3 waterV = normalize( cameraPosition - vWaterWorld );
  float waterViewCos = dot( waterN, waterV );
  vec3 waterBody = waterDeepReflectance;
  if ( waterViewCos > 0.0 ) {
    waterBody = waterBodyReflectance( vWaterDepth, waterViewCos, max( 0.0, dot( waterN, waterSunDirection ) ) );
    // Thin crests glow where the sun is behind them (plan §2.3).
    float waterBehind = pow( max( 0.0, dot( -waterV, waterSunDirection ) ), 4.0 );
    if ( waterBehind > 0.001 ) {
      vec3 waterRay = refract( -waterV, waterN, 1.0 / ${WATER_IOR} );
      float waterThickness = waterCrestThickness( vWaterWorld, waterRay );
      totalEmissiveRadiance += ( 1.0 - vWaterFoam ) * waterBehind * ( 1.0 - waterFresnel( waterViewCos ) )
        * waterSunRadiance * exp( -waterAttenuation * waterThickness );
    }
  }
  diffuseColor.rgb = mix( waterBody * waterBodyGain, waterFoamColor, vWaterFoam );
}
```

- `setOptics(optics)` → `applyOptics(this.uniforms, optics)`; `setSun(direction, radiance)` → `applySun(...)`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/scene`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/scene/waterOptics.ts src/scene/waterOptics.test.ts src/scene/WaterSurface.ts src/scene/WaterSurface.test.ts
git commit -m "feat: shade the tank water with Fresnel, absorption and crest light"
```

### Task 4: Far field shading and wiring

**Files:**
- Modify: `src/scene/FarFieldOcean.ts`, `src/game/PhysicalMode.ts`, `src/main.ts`
- Test: `src/scene/FarFieldOcean.test.ts`, `src/game/PhysicalMode.test.ts`

**Interfaces:**
- Consumes: `waterOpticsPars`, `createOpticsUniforms`, `applyOptics`, `applySun`, `SPOT_OPTICS`, `WaterSurface.setOptics`.
- Produces: `FarFieldOcean.setOptics(optics)`, `FarFieldOcean.setSun(direction, radiance)`; `PhysicalMode.start` applies `SPOT_OPTICS[settings.spot]` to both meshes; `main.ts` applies the sun on start and whenever it moves, and maps the legacy spots (training and custom → beach, point → point, reef → reef).

- [ ] **Step 1: Write the failing tests**

`FarFieldOcean.test.ts`:

```ts
  it('shades the far field with the tank water optics', () => {
    const ocean = new FarFieldOcean();
    const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader };
    ocean.mesh.material.onBeforeCompile(shader as never, undefined as never);
    expect(shader.vertexShader).toContain('vWaterDepth = max( 0.0, farDepth + farHeight )');
    expect(shader.fragmentShader).toContain('waterBodyReflectance( vWaterDepth');
    expect(shader.fragmentShader).not.toContain('#include <color_fragment>');
    expect(ocean.mesh.material.ior).toBeCloseTo(1.333, 6);
  });
```

`PhysicalMode.test.ts` (inside the existing start test): after `mode.start({ ...DEFAULT_PHYSICAL_SETTINGS, spot: 'reef' }, …)`, expect the far field's and the water's `waterDeepReflectance` uniform to equal `deepReflectance(SPOT_OPTICS.reef)` (expose `uniforms` read-only on both classes as `opticsUniforms` for this).

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/scene/FarFieldOcean.test.ts src/game/PhysicalMode.test.ts`
Expected: FAIL.

- [ ] **Step 3: Implement**

`FarFieldOcean`: same material changes as the tank (`ior`, no clearcoat), `createOpticsUniforms()` merged into its uniforms, `varying float vWaterDepth; varying float vWaterFoam;` set in `farBeginNormal` (`vWaterDepth = max( 0.0, farDepth + farHeight ); vWaterFoam = farFoam;`), and the fragment block of Task 3 without the crest term (a far-field fragment has no height texture to march). `PhysicalMode.start`: `water.setOptics(SPOT_OPTICS[settings.spot]); this.farField.setOptics(SPOT_OPTICS[settings.spot]);`. `main.ts`: a `LEGACY_OPTICS` map, `setOptics` in `startRun`, and a `refreshSun()` called where the sun position or intensity changes, passing `this.environment.sunPosition` (direction) and `sunlight.color × sunlight.intensity` to both meshes.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run`
Expected: all tests PASS; `npx tsc -b` clean.

- [ ] **Step 5: Commit**

```bash
git add src/scene/FarFieldOcean.ts src/scene/FarFieldOcean.test.ts src/game/PhysicalMode.ts src/game/PhysicalMode.test.ts src/main.ts
git commit -m "feat: shade the far field and set water optics per spot"
```

### Task 5: Browser verification, tuning and record

**Files:**
- Modify: `src/scene/waterOptics.ts` (tuned `SPOT_OPTICS`, gain), `src/scene/WaterSurface.ts` (roughness), this plan (becomes the design record), `docs/research/wave-formation-plan.md` §2.3 and §4.1, `ROADMAP.md`.

- [ ] **Step 1:** Start the dev server (`.claude/launch.json`, `npm run dev`) and open `?physical`. Check the console for shader errors.
- [ ] **Step 2: Exit criterion 1, bathymetry from above.** Overview camera, Beach then Reef, sun high. The Beach sandbar and rip gaps and the Reef shelf and channel must read as turquoise against blue. If the water body is too dark to read, raise `waterBodyGain` (keep it one constant for all spots) before touching the physical constants.
- [ ] **Step 3: Exit criterion 2, backlit crests.** Profile view looking offshore with the sun low and offshore (sun direction ±20°, height 0.15). Thin crests and lips must glow turquoise. Tune only the lobe exponent (4) and the roughness.
- [ ] **Step 4: Legacy mode.** The default legacy ride still reads (face, pocket, foam) in the chase view; screenshot before and after.
- [ ] **Step 5: Budget.** Compare frame time before and after in the in-app browser on the same view (both modes), and record it.
- [ ] **Step 6:** Rewrite this plan as a design record (Design, Verification, Deviations), mark G3 done in the plan's §4.1 table with a link, add the ROADMAP line, run `npx vitest run` and `npm run build`, and commit (`docs: record G3 water shading`).

## Self-review notes

- Spec coverage: Fresnel (Task 3 via `ior`, CPU mirror Task 1), Beer–Lambert per channel with per-spot turbidity (Tasks 1, 3, 4), path from the height field for shallow water (Task 2 bed + Task 3) and thin crests (Task 1 `crestThickness`, Task 3 shader), sun-behind-wave weighting (Task 3), PMREM reflections kept (existing `envMap`). SSR/refraction is the WebGPU tier (P6), out of scope. Quality tiers do not exist yet; the crest term is the medium-tier feature and stays on until the Q24 quality scaler lands.
- The underwater fog (§2.7) stays single-colour; it is not part of G3's exit criteria.
