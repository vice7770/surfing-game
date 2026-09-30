# Padang Padang Part B, PR 3: the drawn swept barrel — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Draw Padang Padang's barrel as one surface lofted along the breaking front from the profile library, sewn into the water by pinned ends and a dithered top-down mask, in both looks.

**Architecture:**
- **The worker** already tracks the fronts and their slice clocks (PR 2). It now also records each point's foot crest and throw point, and sends every point to the page in the snapshot (8 floats each).
- **The page** holds the profile library (PR 1). After the water uploads its heights each frame, it:
  - lofts one grid per front: 0.5 m slices × (128 profile samples + 3 extension samples each end), on the CPU in plain float arithmetic, so the contact (PR 4) can run the same code in the worker;
  - rasterises the grid's footprint into a mask at the render grid's spacing;
  - draws the grid with the water's own shading.
- **The water** discards its pixels where the mask covers them, with a dither that the swept surface mirrors. So in the 1 m overlap band each pixel shows exactly one surface. The mask's code is compiled into the water's program only while a swept spot runs, so every other spot's program, and so its pixels, is today's byte for byte.

**Tech Stack:** TypeScript, Three.js (`MeshPhysicalMaterial` shader patches, as `WaterSurface` and `FarFieldOcean` do), vitest.

**Spec:** `docs/superpowers/specs/2026-09-28-padang-padang.md`: §Part B decisions 13–17, Judging § Part B, Delivery § Part B item 3. Read with the Part B plan (`docs/superpowers/plans/2026-09-29-padang-padang-part-b.md`), whose PRs 1–2 this builds on.

**The advisor's rulings for this PR (2026-09-30), which this plan implements:**
1. **Scale.** A slice's h0 is η_foot / A0_case. Cases are blended by A0 = η_foot / d_foot at the tide, so inside the library's A0 range (0.2–0.45) the slice scales by its foot depth. Outside it, the nearest case scales by η_foot / A0_case. The solver's η after onset is never used: the eddy viscosity makes it too low and broad.
2. **Anchor.**
   - Before the throw, the profile's crest sits on the solver's crest now.
   - From the throw, the profile's τ = 0 crest sits at the throw point, where the crest crossed its throw depth. The two meet at the throw.
   - After touchdown the anchor blends back to the solver's crest over a few tenths of a second, for the roller's handover.
   - Log the offset between the anchored crest and the solver's crest over each tube's life. Tell the advisor if it passes about 2 m before touchdown.
3. **Seam.** All [inferred]: engineering choices after Surf's Up.
   - Pin 6 samples at each end to the height field, sampled as the water mesh draws it. Pin by landmark: at the front only past the toe (index 112), at the back only behind the crest. Never pin the lip or the throat.
   - Extend 1.5 m past each end, with a 1 m dithered overlap.
   - Draw the mask top-down at the render grid's spacing.
4. **Resampling.**
   - Slices every 0.5 m, refined to 0.25 m where neighbours differ by more than 3 library frames (0.063 s at h0 7 m; only slow peels trigger it).
   - Budget 40k vertices. Past it, clamp neighbouring slices' τ to T_open/4 (|dτ/dσ| ≤ T_open/(4Δσ)) and count the clamps.

**Measured facts this plan relies on:**
- The cases' 128 samples run about 2.3 h0 behind the crest to 1.0 h0 ahead, about 0.063 h0 (0.44 m at 7 m) apart.
- Samples 0–5 sit about 1.5 h0 behind the crest on the wave's back, and samples 122–127 sit at least 10 samples past the toe. So pinning 6 at each end never reaches the lip or throat.
- The frame loop runs `physicalMode.update()`, then `drawPhysical()`, which calls `water.update()` (`src/main.ts:921–945`). The loft must run after `water.update()`.

## Global Constraints

- "every value is sourced or marked provisional, and nothing is hand-shaped".
- "Classic's pixels change only where there is a lip or a tube; everything else stays byte-identical" (spec 15).
- "Performance is measured, never a gate. Target an M4 Pro; an M1 Air may run slowly."
- "Don't change the Reef (Teahupo'o)". Only `SWEPT_BARREL` spots (Padang Padang) draw the swept barrel.
- **Online determinism:** the loft uses only + − × ÷ and √, with no `Math.sin`, `exp` or `hypot` (PR 4's contact runs it in the worker).
- Work in your own worktree, and never touch other sessions' worktrees under `.claude/worktrees/`.
- Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. PR bodies end with `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- The user merges.

**Scope: in and out.**
- **In:** the drawn surface, the seam and the mask.
- **Out:**
  - the rider's contact (PR 4); until then the physics keeps today's carved tube at Padang Padang, so what is drawn and what is ridden differ there;
  - the crash curve and pour parcels (PR 5);
  - the lip glow and dark throat (PR 6);
  - the roller;
  - every other spot (PR 7).
- After touchdown a slice fades back into the height field over the handover time, a stand-in until the roller.

## Review Focus

1. **A front of one point, or of points bunched in one column:** it draws nothing, since it has no tangent, and never NaN (Task 3).
2. **A slice whose foot crest is outside the library's range** (a tiny set at low tide, a Big set past A0 0.45): it scales the nearest case and is counted as clamped (Tasks 2 and 3).
3. **The window's edge:** a front reaching the render grid's edge rasterises only inside the grid, with no wrap and no out-of-range write (Task 4).
4. **No front, or the library still loading:** the water's mask is off and its Classic pixels are exactly today's; the swept mesh is hidden (Tasks 5 and 6).
5. **A handed-over sea** (a player joining late): the front records, throw point included, come through the handover exactly, so both players loft the same barrel (Task 1).

---

## File structure

| File | Responsibility |
|---|---|
| `src/wave/barrel/BreakingFront.ts` | Points carry `footHeight`, `footDepth` and `throwZ` |
| `src/wave/barrel/frontRecords.ts` (new) | The snapshot's front record: `FRONT_STRIDE`, `FRONT_CAPACITY`, `FRONT_FIELD`, `writeFrontRecords` |
| `src/wave/SurfZoneRunner.ts`, `src/game/WorkerSurfZone.ts`, `src/game/SurfZoneWorkerCore.ts` | Carry `front` / `frontCount` in the snapshot |
| `src/wave/barrel/ProfileLibrary.ts` | Scaled by the foot crest (ruling 1); reports touchdown and frame length in seconds |
| `src/wave/barrel/sweptLoft.ts` (new) | Pure: front records + library + a height sampler → one grid per front (positions, normals, mask weights, indices, per-slice diagnostics) |
| `src/scene/barrel/barrelMask.ts` (new) | Pure: a loft's footprint rasterised into a `Uint8Array` on the render grid |
| `src/scene/barrel/barrelMaskGlsl.ts` (new) | GLSL: the mask lookup, the shared dither, the water's and the swept surface's discards |
| `src/scene/WaterSurface.ts` | The mask texture and its discard in both looks, compiled in only while a swept spot runs (`setBarrelEnabled`); exports its vertex and fragment chunks and uniforms; `drawnLook` |
| `src/wave/barrel/toyCase.ts` (new) | The tests' toy barrel case, shared by the library's, the loft's and the barrel's tests |
| `src/scene/barrel/SweptBarrelMesh.ts` (new) | The drawn grid: the water's shading on lofted vertices |
| `src/scene/barrel/SweptBarrel.ts` (new) | Loads the library, lofts after the water updates, sets the mask, updates the mesh |
| `src/game/SurfZoneHost.ts` | `SnapshotSurfZone` stops carving the drawn water at swept spots |
| `src/game/PhysicalMode.ts`, `src/main.ts` | Wire it: the swept barrel at `SWEPT_BARREL` spots, the lip sheet hidden there |
| `src/wave/SurfZoneSimulation.ts` | `sweptBarrelOn(config)` |
| `src/wave/probes/padangLoft.probe.test.ts` (new) | Loft cost, slices, clamps, crest offsets, open-curl length, neighbour τ steps |
| `docs/research/barrel-library.md` | The loft's measured cost and offsets |

---

### Task 1: The front's record for the loft, and in the snapshot

**Files:**
- Modify: `src/wave/barrel/BreakingFront.ts`, `src/wave/SurfZoneRunner.ts`, `src/game/WorkerSurfZone.ts`, `src/game/SurfZoneWorkerCore.ts`
- Create: `src/wave/barrel/frontRecords.ts`
- Test: `src/wave/barrel/BreakingFront.test.ts`, `src/wave/barrel/frontRecords.test.ts`, `src/wave/surfZoneState.test.ts`

**Interfaces:**
- Produces:
  - `FrontPoint` gains `footHeight: number` (the track's crest height at the foot, m), `footDepth: number` (`timing.h0`, m) and `throwZ: number | null`. `throwZ` is the crest's z when it crossed its throw depth, interpolated as `thrown` is, and null until then.
  - `frontRecords.ts`:
    - `FRONT_STRIDE = 8`;
    - `FRONT_CAPACITY = 2048`;
    - `FRONT_FIELD = { x: 0, z: 1, front: 2, sigma: 3, tau: 4, footHeight: 5, footDepth: 6, throwZ: 7 }`;
    - `writeFrontRecords(points: readonly FrontPoint[], out: Float32Array): number`, which writes in the points' order (by front, then σ), NaN for a null `throwZ`, and returns the count written.
  - `SurfZoneBuffers` gains `front: Float32Array` (`FRONT_CAPACITY * FRONT_STRIDE`) and `frontCount: number`, filled by `SurfZoneRunner.fill` (0 where no front runs).

- [ ] **Step 1: Write the failing tests.**

In `BreakingFront.test.ts`, extend the existing test "keeps every point’s ID, join and clock while its crest breaks on into shallower water…":

```ts
    // The foot crest and the throw point travel with the point (PR 3's loft).
    expect(front.points.every((point) => point.footHeight === FOOT && point.footDepth === TIMING.h0)).toBe(true);
    expect(front.points[0].throwZ).toBeCloseTo(10 + 0.5 * 0.5 + (0.3 * (JOIN - THROW)) / (JOIN - 2.2), 12);
```

Before the `front.update(next, …)` call in that test, add `expect(front.points.every((point) => point.throwZ === null)).toBe(true);`. (The crest crossed its throw depth between z = 10 + 0.5·x and z + 0.3; `line` puts column 0's crest at z0 + slope · 0.5.)

Create `src/wave/barrel/frontRecords.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import type { FrontPoint } from './BreakingFront';
import { FRONT_FIELD, FRONT_STRIDE, writeFrontRecords } from './frontRecords';

const point = (id: number, throwZ: number | null): FrontPoint => ({
  id, front: 3, column: id, sigma: id * 1.1, x: id + 0.5, z: -150 + id, b: 0.3, height: 1.7, joined: 5, depth: 3.1,
  throwDepth: 2.5, crestDepth: 2.4, thrown: throwZ === null ? null : 6, broke: 5.2, tau: 0.25 * id, seen: 7, fresh: null,
  footHeight: 1.6, footDepth: 7, throwZ,
});

describe('the front records the snapshot carries', () => {
  it('writes each point’s place, clock, foot and throw, NaN before the throw, and stops at capacity', () => {
    const out = new Float32Array(2 * FRONT_STRIDE);
    expect(writeFrontRecords([point(0, -151.5), point(1, null), point(2, null)], out)).toBe(2);
    expect(Array.from(out.subarray(0, FRONT_STRIDE))).toEqual([0.5, -150, 3, 0, 0, 1.600000023841858, 7, -151.5]);
    expect(out[FRONT_STRIDE + FRONT_FIELD.throwZ]).toBeNaN();
    expect(out[FRONT_STRIDE + FRONT_FIELD.tau]).toBeCloseTo(0.25, 6);
  });
});
```

In `surfZoneState.test.ts`, "carries a breaking front through its bytes exactly…": add `footHeight: 1.64, footDepth: 7.2, throwZ: -141.123456789` to `point`, and `throwZ: null` in the held copy (`{ ...point, id: 8, tau: 0, thrown: 52.0123456789, throwZ: null }`).

- [ ] **Step 2: Run them to see them fail:** `npx vitest run src/wave/barrel src/wave/surfZoneState.test.ts`. Expect type errors or failures on `footHeight`, `throwZ` and the missing module.

- [ ] **Step 3: Implement.**

In `BreakingFront.ts`:
- add the three fields to `FrontPoint` with doc comments;
- replace `crossing` with a fraction helper, and use it for both the time and the z:

```ts
/** How far between a crest at `fromDepth` and at `depth` it crossed `at`, 0–1, linear in depth; null if it has not. */
function crossingFraction(fromDepth: number, depth: number, at: number): number | null {
  if (depth > at) return null;
  return fromDepth > depth ? Math.min(1, Math.max(0, (fromDepth - at) / (fromDepth - depth))) : 1;
}
```

- in the matched-point branch:

```ts
        let { thrown, throwZ } = point;
        if (thrown === null) {
          const f = crossingFraction(point.crestDepth, s.depth, point.throwDepth);
          if (f !== null) {
            thrown = point.seen + f * (time - point.seen);
            throwZ = point.z + f * (s.z - point.z);
          }
        }
        points.push({ ...point, sigma: 0, x: s.x, z: s.z, b: s.b, height: s.eta, crestDepth: s.depth, thrown, throwZ, seen: time, fresh });
```

- in the join branch, compute `const joinF = crossingFraction(track.depth, s.depth, joinDepth)` for `crossed` (as `track.seen + joinF * (time - track.seen)`), and `const throwF = crossingFraction(track.depth, s.depth, throwDepth)`. Push the point with:
  - `thrown: throwF === null ? null : track.seen + throwF * (time - track.seen)`;
  - `throwZ: throwF === null ? null : track.z + throwF * (s.z - track.z)`;
  - `footHeight: next.footHeight`;
  - `footDepth: this.timing.h0`.

Create `frontRecords.ts` with the constants above and:

```ts
export function writeFrontRecords(points: readonly FrontPoint[], out: Float32Array): number {
  const count = Math.min(points.length, Math.floor(out.length / FRONT_STRIDE));
  for (let k = 0; k < count; k += 1) {
    const p = points[k];
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = p.x;
    out[o + FRONT_FIELD.z] = p.z;
    out[o + FRONT_FIELD.front] = p.front;
    out[o + FRONT_FIELD.sigma] = p.sigma;
    out[o + FRONT_FIELD.tau] = p.tau;
    out[o + FRONT_FIELD.footHeight] = p.footHeight;
    out[o + FRONT_FIELD.footDepth] = p.footDepth;
    out[o + FRONT_FIELD.throwZ] = p.throwZ ?? Number.NaN;
  }
  return count;
}
```

In `SurfZoneRunner.ts`:
- add `front` and `frontCount` to `SurfZoneBuffers` (doc: "The swept barrel's front points (Part B, PR 3): `FRONT_STRIDE` floats each");
- allocate `front: new Float32Array(FRONT_CAPACITY * FRONT_STRIDE), frontCount: 0` in `createBuffers`;
- in `fill`: `buffers.frontCount = simulation.front ? writeFrontRecords(simulation.front.points, buffers.front) : 0;`.

In `WorkerSurfZone.ts` `emptyLike`, add `front: new Float32Array(snapshot.front.length), frontCount: 0`. In `SurfZoneWorkerCore.ts` `transferables`, add `buffers.front.buffer`.

- [ ] **Step 4: Run:** `npx vitest run src/wave/barrel src/wave/surfZoneState.test.ts src/game/SurfZoneWorkerCore.test.ts src/game/WorkerSurfZone.test.ts` and `npx tsc --noEmit -p .`. Expected PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the front's points carry their foot crest and throw point, and the snapshot carries them to the page".

### Task 2: The library scaled by the foot crest

**Files:**
- Modify: `src/wave/barrel/ProfileLibrary.ts`
- Test: `src/wave/barrel/ProfileLibrary.test.ts`

**Interfaces:**
- Produces:
  - `ProfileQuery = { slope: number; footHeight: number; footDepth: number; seconds: number }`. It replaces `nonlinearity` and `height`: A0 = footHeight / footDepth.
  - `ProfileLookup` gains `touchdownSeconds: number` and `frameSeconds: number` (τ's step, s).
  - The scale is footDepth inside the blend, and footHeight / A0_case where A0 is clamped to a case.

- [ ] **Step 1: Rewrite the tests** that call `profileAt` (the file's three uses) in the new query, and add the ruling's test:

```ts
  it('scales a slice by its foot: its foot depth inside the cases, the nearest case’s own A0 outside (the advisor, 2026-09-30)', () => {
    const library = new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);
    const out = new Float32Array(2 * PROFILE_POINTS);
    // A0 0.3: blended, h0 the foot depth, 7 m; τ's unit √(7/g), the touchdown 0.5 of it, a frame 0.25 of it.
    const inside = library.profileAt({ slope: 0.05, footHeight: 2.1, footDepth: 7, seconds: 0 }, out);
    expect(inside.scale).toBe(7);
    expect(inside.clamped).toBe(false);
    expect(inside.touchdownSeconds).toBeCloseTo(0.5 * Math.sqrt(7 / 9.81), 12);
    expect(inside.frameSeconds).toBeCloseTo(0.25 * Math.sqrt(7 / 9.81), 12);
    // A0 0.1: the 0.2 case, scaled so its foot crest is the slice's: h0 = 0.7 / 0.2 = 3.5 m.
    const small = library.profileAt({ slope: 0.05, footHeight: 0.7, footDepth: 7, seconds: 0 }, out);
    expect(small.scale).toBeCloseTo(3.5, 12);
    expect(small.clamped).toBe(true);
    // A0 0.6: the 0.4 case, h0 = 4.2 / 0.4 = 10.5 m.
    expect(library.profileAt({ slope: 0.05, footHeight: 4.2, footDepth: 7, seconds: 0 }, out).scale).toBeCloseTo(10.5, 12);
  });
```

For the Froude test: the query becomes `{ slope: 0.05, footHeight: 1.2, footDepth: 4, seconds: 0.125 * Math.sqrt(4 / 9.81) }`, so A0 is 0.3 and h0 4 m. Its expectations are unchanged: scale 4, lip x, crest y 2. For the others:
- the clamping test uses `footHeight: 0.3 × 7, footDepth: 7`, then `0.9 × 7` and the slope 0.2;
- the tiny-breaker test uses `footHeight: 0.0105, footDepth: 0.035`.

- [ ] **Step 2: Run** `npx vitest run src/wave/barrel/ProfileLibrary.test.ts`. Expect failures on the query fields.
- [ ] **Step 3: Implement** in `profileAt`:
  - `const a0 = query.footHeight / query.footDepth;` and use `a0` wherever `query.nonlinearity` was.
  - After the bracket: `const scale = lower === upper ? query.footHeight / lower.nonlinearity : query.footDepth;`.
  - Drop the `breakerHeight` blend (H_I is no longer the scale).
  - `const unit = Math.sqrt(scale / GRAVITY);`, then `const tau = query.seconds / unit;`.
  - Return `touchdownSeconds: touchdown * unit` and `frameSeconds: (lower.tauStep + weight * (upper.tauStep - lower.tauStep)) * unit`.
  - Update the class's doc comment: "scales them to the slice's foot crest (h0 = η_foot / A0, the advisor 2026-09-30)".
- [ ] **Step 4: Run** the library tests and `npx tsc --noEmit -p .`. Expected PASS.
- [ ] **Step 5: Commit:** "feat(barrel): a slice's profile scaled by its foot crest, as the advisor ruled; the lookup reports its touchdown and frame in seconds".

### Task 3: The loft

**Files:**
- Create: `src/wave/barrel/sweptLoft.ts`, `src/wave/barrel/sweptLoft.test.ts`

**Interfaces:**
- Consumes: `FRONT_STRIDE`, `FRONT_FIELD` (Task 1); `ProfileLibrary.profileAt`, `ProfileLookup.touchdownSeconds`, `ProfileLookup.frameSeconds`, `PROFILE_POINTS`, `LANDMARK` (Task 2).
- Produces:

```ts
export const LOFT = { spacing: 0.5, fine: 0.25, frames: 3, budget: 40_000, pinned: 6, extension: 1.5, extensionSamples: 3, band: 1, endBlend: 2.5, handover: 0.3 } as const;
export const LOFT_SAMPLES = PROFILE_POINTS + 2 * LOFT.extensionSamples; // 134 vertices per slice
/** The library's runs' slope along the wave's path, per spot drawn with the swept barrel (the owner's 1:19 at Padang Padang). */
export const BARREL_SLOPE: Partial<Record<SpotName, number>> = { padang: 1 / 19 };
export interface LoftResult {
  positions: Float32Array;  // xyz per vertex
  normals: Float32Array;    // xyz per vertex
  mask: Float32Array;       // 0–1 per vertex: the seam mask's value
  indices: Uint32Array;
  vertexCount: number;
  indexCount: number;
  sliceCount: number;
  /** Per slice: its front, σ (m), τ (s), phase (0 before vertical, 1 open, 2 after touchdown), and the anchored crest's distance from the solver's (m; NaN where the anchor is the crest). */
  sliceFront: Int32Array; sliceSigma: Float32Array; sliceTau: Float32Array; slicePhase: Uint8Array; sliceCrestOffset: Float32Array;
  /** Neighbouring slices' τ clamped to T_open/4 because the budget was reached; lookups outside the library's cases. */
  clamps: number;
  clampedLookups: number;
}
export class SweptLoft {
  constructor(library: ProfileLibrary, slope: number);
  build(records: Float32Array, count: number, stillLevel: number, heightAt: (x: number, z: number) => number): LoftResult;
}
```

**The rule, per front** (records are ordered by front, then σ; a front of fewer than 2 points is skipped):
1. **Slices.**
   - σ runs from the first point's σ − `extension` to the last's + `extension`, every `spacing` m.
   - Between two slices whose τ differ by more than `frames × frameSeconds` (the lookup's), insert the midpoint (`fine`).
   - If the whole loft would exceed `budget` vertices: widen the spacing to fit (the total σ length over `budget / LOFT_SAMPLES` slices), insert no midpoints, and clamp each slice's τ to within T_open/4 of its predecessor's, counting each clamp. T_open is the lookup's `touchdownSeconds`.
2. **Interpolation** at σ, between the two points around it: x, z, τ, footHeight, footDepth, and throwZ (NaN unless both are thrown). Beyond the ends, the position runs on along the end segment's direction; everything else keeps the end values.
3. **Direction.**
   - The tangent t̂ is the difference of the positions at σ ± 2 m, normalised with √.
   - The ray n̂ is (−t̂z, t̂x) in (x, z), so it points shoreward when the front runs toward +x.
4. **The profile:** `profileAt({ slope, footHeight, footDepth, seconds: τ })`, into a reused array. Count `clamped` lookups.
5. **Anchor.** C is the solver's crest (x, z), and x₃₂ is the profile's crest x (index `LANDMARK.crest`).
   - The crest anchor is A_c = C − x₃₂·n̂. The throw anchor is A_t = (x, throwZ).
   - If τ < 0 or throwZ is NaN, A = A_c.
   - Else, before touchdown, A = A_t; record the crest offset |A_t + x₃₂·n̂ − C| (√).
   - After touchdown, with u = min(1, (τ − touchdownSeconds) / `handover`), A = A_t + u·(A_c − A_t).
6. **Weights.**
   - The ends: with d = min(σ − σ_first, σ_last − σ), w_end = 0 if d ≤ 0, else r²(3 − 2r) with r = min(1, d / `endBlend`).
   - The fade: w_fade = 1 until touchdown, then max(0, 1 − (τ − touchdownSeconds) / `handover`).
   - The slice's weight is w = w_end · w_fade.
   - The slice's mask factor is m_s = clamp(1 + d / `band`, 0, 1) if w_fade > 0, else 0.
7. **Vertices**, j = 0 … `LOFT_SAMPLES` − 1, with E = `extensionSamples`:
   - **Back extension**, j < E: along-ray x = x₀ − (E − j)·(`extension` / E); pin p = 1; mask m_j = max(0, 1 − (E − j)·(`extension` / E) / `band`).
   - **Profile**, E ≤ j < E + 128, sample i = j − E: x = xᵢ, y = yᵢ, m_j = 1. The pin is p = (`pinned` − i) / `pinned` for i < `pinned`, p = (i − (127 − `pinned`)) / `pinned` for i > 127 − `pinned`, else 0.
   - **Front extension**, j ≥ E + 128: x = x₁₂₇ + (j − E − 127)·(`extension` / E), p = 1, with m_j as at the back.
   - Place xz = A + x·n̂ and h = heightAt(xz). With e = w·(1 − p), y = h + e·(stillLevel + y − h); the extensions take y = h.
   - The vertex's mask is m_s · m_j.
8. **Normals:** normalize(∂P/∂j × ∂P/∂σ), by central differences (one-sided at the edges), normalised with √. A flat patch's normal is +y.
9. **Indices:** two triangles per quad between neighbouring slices and samples of one front; fronts are never joined.

Only + − × ÷ and √. The arrays are allocated once, for `budget` vertices plus one slice's worth, and reused.

- [ ] **Step 1: Write the failing tests** (`sweptLoft.test.ts`). The toy library comes from `ProfileLibrary.test.ts`'s `toyCase`: copy it into a shared `src/wave/barrel/toyCase.ts` (exported), and use it in both test files.

```ts
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from './frontRecords';
import { ProfileLibrary } from './ProfileLibrary';
import { LOFT, LOFT_SAMPLES, SweptLoft } from './sweptLoft';
import { toyCase } from './toyCase';

const flat = () => 0.5;
/** A straight front along +x at z = −100, 1 m apart, every point at τ `tau(k)`, thrown at z −100.2 once τ ≥ 0. */
function records(n: number, tau: (k: number) => number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = tau(k); out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7;
    out[o + FRONT_FIELD.throwZ] = tau(k) >= 0 ? -100.2 : Number.NaN;
  }
  return out;
}
const loftOf = (tau: (k: number) => number, n = 21) =>
  new SweptLoft(new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]), 0.05).build(records(n, tau), n, 0.5, flat);

describe('the swept loft', () => {
  it('lofts a front every half metre, 1.5 m past each end, 134 vertices a slice', () => {
    const loft = loftOf(() => 0);
    expect(loft.sliceCount).toBe(Math.round((20 + 2 * LOFT.extension) / LOFT.spacing) + 1);
    expect(loft.vertexCount).toBe(loft.sliceCount * LOFT_SAMPLES);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
  });

  it('stands each profile on the front’s shoreward normal, pinned to the water at both ends', () => {
    const loft = loftOf(() => 0);
    const middle = Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES;
    const at = (j: number) => ({ x: loft.positions[3 * (middle + j)], y: loft.positions[3 * (middle + j) + 1], z: loft.positions[3 * (middle + j) + 2] });
    // Along one slice x stays put and z runs shoreward; the pinned ends sit on the water, the crest above it.
    expect(at(0).x).toBeCloseTo(at(LOFT_SAMPLES - 1).x, 6);
    expect(at(LOFT_SAMPLES - 1).z).toBeGreaterThan(at(0).z);
    expect(at(0).y).toBe(0.5);
    expect(at(LOFT.extensionSamples).y).toBe(0.5);
    expect(at(LOFT.extensionSamples + 32).y).toBeGreaterThan(0.5);
  });

  it('anchors the τ = 0 crest at the throw point, and before the throw on the solver’s crest', () => {
    const thrown = loftOf(() => 0.1);
    const early = loftOf(() => -0.1);
    const crestZ = (loft: ReturnType<typeof loftOf>) => loft.positions[3 * (Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + LOFT.extensionSamples + 32) + 2];
    // The toy's crest sits at x = 1 h0 at every τ; thrown, its τ = 0 origin is the throw point, before, the crest is the solver's.
    expect(crestZ(thrown)).toBeCloseTo(-100.2 + 7 * 1, 4);
    expect(crestZ(early)).toBeCloseTo(-100, 4);
    const middle = Math.floor(thrown.sliceCount / 2);
    expect(thrown.sliceCrestOffset[middle]).toBeCloseTo(6.8, 4);
    expect(early.sliceCrestOffset[middle]).toBeNaN();
  });

  it('blends into the water over 2.5 m at each end, and masks 1 m past them', () => {
    const loft = loftOf(() => 0);
    const first = LOFT.extensionSamples + 32;
    // The extended end slice is the water, unmasked; the middle slice is masked.
    expect(loft.positions[3 * first + 1]).toBe(0.5);
    expect(loft.mask[first]).toBe(0);
    expect(loft.mask[Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES + first]).toBe(1);
  });

  it('fades a slice into the water after touchdown and drops its mask', () => {
    // The toy's touchdown is 0.5 √(7/g) ≈ 0.42 s; 0.3 s later it is gone.
    const loft = loftOf(() => 0.5 * Math.sqrt(7 / 9.81) + LOFT.handover);
    const middle = Math.floor(loft.sliceCount / 2) * LOFT_SAMPLES;
    expect(loft.positions[3 * (middle + LOFT.extensionSamples + 32) + 1]).toBe(0.5);
    expect(loft.mask[middle + LOFT.extensionSamples + 32]).toBe(0);
    expect(loft.slicePhase[Math.floor(loft.sliceCount / 2)]).toBe(2);
  });

  it('refines where neighbouring clocks differ by more than three frames', () => {
    // A frame is 0.25 √(7/g) = 0.21 s, so three are 0.63 s; a clock stepping 1.5 s per metre differs by 0.75 s a slice.
    const coarse = loftOf(() => 0);
    const steep = loftOf((k) => k * 1.5);
    expect(steep.sliceCount).toBeGreaterThan(coarse.sliceCount);
  });

  // Review Focus 1.
  it('draws nothing for a front of one point, and stays finite', () => {
    const loft = loftOf(() => 0, 1);
    expect(loft.vertexCount).toBe(0);
    expect(loft.indexCount).toBe(0);
  });

  // Review Focus 2.
  it('counts a foot crest outside the library as clamped, and still draws it', () => {
    const recs = records(5, () => 0);
    for (let k = 0; k < 5; k += 1) recs[k * FRONT_STRIDE + FRONT_FIELD.footHeight] = 0.35; // A0 0.05
    const loft = new SweptLoft(new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]), 0.05).build(recs, 5, 0.5, flat);
    expect(loft.clampedLookups).toBe(loft.sliceCount);
    expect(loft.positions.subarray(0, 3 * loft.vertexCount).every(Number.isFinite)).toBe(true);
  });

  it('keeps to its budget on a long front, clamping the clock steps it must', () => {
    const loft = loftOf((k) => (k % 2) * 2, 400);
    expect(loft.vertexCount).toBeLessThanOrEqual(LOFT.budget);
    expect(loft.clamps).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/wave/barrel/sweptLoft.test.ts`: fails, since the module is missing.
- [ ] **Step 3: Implement `sweptLoft.ts`** by the rule above. Keep the per-front passes separate: collect slices, interpolate and look up, place vertices, then normals and indices. A module doc comment cites the advisor's rulings 2026-09-30 and the build sheet (`docs/research/water-physics/swept-barrel-build.md`, "Lofting" and "The seam"), and tags `LOFT`'s values: `pinned`, `extension`, `band`, `endBlend` and `handover` [inferred]; `frames` and `budget` the advisor's.
- [ ] **Step 4: Run** the loft tests and `npx tsc --noEmit -p .`. Expected PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the swept loft: profiles stood along each front, anchored at the throw, pinned into the water".

### Task 4: The seam mask

**Files:**
- Create: `src/scene/barrel/barrelMask.ts`, `src/scene/barrel/barrelMask.test.ts`

**Interfaces:**
- Consumes: `LoftResult` (Task 3); `SurfaceGrid` (`src/scene/WaterSurface.ts`).
- Produces: `rasterizeBarrelMask(loft: LoftResult, grid: SurfaceGrid, out: Uint8Array): number`. It fills `out` (length `grid.nx * grid.nz`, node order `k * nx + i`) with round(255 · mask), taking the maximum over triangles and interpolating barycentrically at each node's xz. It returns how many nodes are non-zero. Triangles with no area in xz are skipped. Nodes outside the grid are never written.

- [ ] **Step 1: Write the failing tests:**

```ts
import { describe, expect, it } from 'vitest';
import type { LoftResult } from '../../wave/barrel/sweptLoft';
import { rasterizeBarrelMask } from './barrelMask';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 10, nz: 10 };
/** One quad over x 2–6, z 2–6: mask 1 on its x = 2 side, 0 on its x = 6 side. */
function quad(): LoftResult {
  const positions = new Float32Array([2, 0, 2, 6, 0, 2, 2, 0, 6, 6, 0, 6]);
  return {
    positions, normals: new Float32Array(12), mask: new Float32Array([1, 0, 1, 0]), indices: new Uint32Array([0, 1, 2, 1, 3, 2]),
    vertexCount: 4, indexCount: 6, sliceCount: 2, sliceFront: new Int32Array(2), sliceSigma: new Float32Array(2), sliceTau: new Float32Array(2),
    slicePhase: new Uint8Array(2), sliceCrestOffset: new Float32Array(2), clamps: 0, clampedLookups: 0,
  };
}

describe('the barrel mask', () => {
  it('rasterises the loft’s footprint on the render grid’s nodes, interpolated, zero outside', () => {
    const out = new Uint8Array(100);
    expect(rasterizeBarrelMask(quad(), grid, out)).toBe(20);
    expect(out[3 * 10 + 2]).toBe(255);
    expect(out[3 * 10 + 4]).toBe(128);
    expect(out[3 * 10 + 6]).toBe(0);
    expect(out[1 * 10 + 3]).toBe(0);
  });

  // Review Focus 3.
  it('writes nothing outside the grid for a footprint running off it', () => {
    const loft = quad();
    loft.positions.set([8, 0, 8, 14, 0, 8, 8, 0, 14, 14, 0, 14]);
    const out = new Uint8Array(100);
    rasterizeBarrelMask(loft, grid, out);
    expect(out[9 * 10 + 8]).toBe(255);
    expect(out.length).toBe(100);
  });
});
```

(The quad covers the 25 nodes x 2–6 × z 2–6; the 5 at x = 6 read 0, so 20 are set. At x = 4 the mask is 0.5, which rounds to 128.)

- [ ] **Step 2: Run** `npx vitest run src/scene/barrel/barrelMask.test.ts`: fails.
- [ ] **Step 3: Implement.** For each triangle:
  - take the xz bounds as grid indices, clamped to [0, nx − 1] × [0, nz − 1];
  - for each node, find the barycentric weights (+ − × ÷, with the area as the denominator), and accept it inside with ε = 1e-6;
  - `out[i] = max(out[i], Math.round(255 * value))`.

  Clear `out` first.
- [ ] **Step 4: Run** the tests. Expected PASS.
- [ ] **Step 5: Commit:** "feat(barrel): the swept barrel's seam mask, its footprint on the render grid".

### Task 5: The water's mask, and the swept mesh

**Files:**
- Create: `src/scene/barrel/barrelMaskGlsl.ts`, `src/scene/barrel/SweptBarrelMesh.ts`, `src/scene/barrel/SweptBarrelMesh.test.ts`
- Modify: `src/scene/WaterSurface.ts`, `src/scene/waterLooks.test.ts` (new tests only; the existing snapshots must not change)

**Interfaces:**
- Produces:
  - `barrelMaskGlsl.ts`:
    - `waterBarrelMaskPars`;
    - `WATER_BARREL_DISCARD` and `SWEPT_BARREL_DISCARD`;
    - `mirrorsBarrelDither(fragment: string): boolean` (a test helper: the fragment reads the mask and the dither).
  - `WaterSurface`:
    - `setBarrelEnabled(on: boolean): void`. It compiles the mask's code into the water's program only while on: the program's cache key gains `-barrel`, and `needsUpdate` is set on a change.
    - `setBarrelMask(mask: Uint8Array | null): void` (a copy; null switches the discard off);
    - `get barrelMaskActive(): boolean`;
    - `get materialUniforms(): Record<string, { value: unknown }>` (the shared uniform objects);
    - `get drawnLook(): WaterLook` (the look actually drawn);
    - exported `waterVertexPars` and `waterFragmentPars`.
  - `SweptBarrelMesh`:
    - `constructor(uniforms: Record<string, { value: unknown }>)`;
    - `readonly mesh: Mesh<BufferGeometry, MeshPhysicalMaterial>`;
    - `setLook(look: WaterLook): void`;
    - `update(loft: LoftResult | undefined): void`.

**Why compile the mask in only while on:** `waterLooks.test.ts` pins the Classic water's shader text ("exactly as before G8"). Off, the water's program is byte for byte today's, at every spot but a swept one, which is what spec 15 asks.

The GLSL (node-centred texels, linear filtering; the dither is interleaved gradient noise, Jimenez 2014, the same per pixel in both passes):

```ts
export const waterBarrelMaskPars = /* glsl */ `
uniform sampler2D waterBarrelMask;
uniform float waterBarrelMaskActive;
float waterBarrelMaskAt( vec2 xz ) {
  vec2 g = ( xz - waterGrid.xy ) / waterGrid.z;
  return texture( waterBarrelMask, ( g + 0.5 ) / waterGridSize ).r;
}
float waterBarrelDither( vec2 fragCoord ) {
  return fract( 52.9829189 * fract( dot( fragCoord, vec2( 0.06711056, 0.00583715 ) ) ) );
}
`;
/** The water gives way where the mask covers it; in the band, where the mask beats the pixel's dither. */
export const WATER_BARREL_DISCARD = 'if ( waterBarrelMaskActive > 0.5 && waterBarrelMaskAt( vWaterWorld.xz ) > waterBarrelDither( gl_FragCoord.xy ) ) discard;';
/** The swept surface shows exactly where the water gave way: the same test, the other way. */
export const SWEPT_BARREL_DISCARD = 'if ( waterBarrelMaskAt( vWaterWorld.xz ) <= waterBarrelDither( gl_FragCoord.xy ) ) discard;';
export function mirrorsBarrelDither(fragment: string): boolean {
  return fragment.includes('waterBarrelMaskAt( vWaterWorld.xz )') && fragment.includes('waterBarrelDither( gl_FragCoord.xy )');
}
```

In `WaterSurface`:
- **The mask texture:** a `DataTexture(new Uint8Array(nx * nz), nx, nz, RedFormat, UnsignedByteType)` with `LinearFilter` for both min and mag and no mipmaps.
  - Add the uniforms `waterBarrelMask` and `waterBarrelMaskActive` (0).
  - Rebuild the texture in `setSource` when the grid changes, and dispose it in `dispose`.
- **`onBeforeCompile`:** when `this.barrelEnabled`, in both looks, add `waterBarrelMaskPars` after `waterFragmentPars`, and append `WATER_BARREL_DISCARD` after `#include <clipping_planes_fragment>`. In Rich, that is after `richPatchDiscard`, in the same replacement.
- **The cache key:** `` `breakline-water-surface-${this.effectiveLook}${this.barrelEnabled ? '-barrel' : ''}` ``.
- **`setBarrelMask`:** copy the mask into the texture's data, set `needsUpdate`, and set the active uniform to 1; null sets it to 0.

`SweptBarrelMesh`:
- **Geometry:** a `BufferGeometry` with `position` and `normal` as `DynamicDrawUsage` Float32 attributes sized for `LOFT.budget + LOFT_SAMPLES` vertices, and a `Uint32` index sized for their quads (`6 × (LOFT_SAMPLES − 1)` per slice pair). `update` copies `loft.positions` and `loft.normals` up to `vertexCount` and the indices up to `indexCount`, sets the draw range and `needsUpdate`, and hides the mesh when `indexCount` is 0 or `loft` is undefined.
- **The material:** `MeshPhysicalMaterial({ color: '#ffffff', roughness: CLASSIC_ROUGHNESS, metalness: 0, ior: WATER_IOR, side: DoubleSide })`, opaque, with `frustumCulled = false`.
- **Its `onBeforeCompile`** assigns the shared uniforms. By look (as `FarFieldOcean` does):
  - **Vertex:**
    - `#include <common>` + `waterVertexPars`;
    - `<beginnormal_vertex>` → `vec3 objectNormal = vec3( normal );` + `vWaterDepth = max( 0.0, position.y - waterBedAt( position.xz ) );` + `vWaterFoam = waterFoamAt( position.xz );` + `vWaterFlow = waterFlowAt( position.xz );` (one per line);
    - `<begin_vertex>` → `vec3 transformed = vec3( position );` + `vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;`.
  - **Classic fragment:**
    - `waterFragmentPars` + `waterBarrelMaskPars`;
    - `SWEPT_BARREL_DISCARD` after `#include <clipping_planes_fragment>`;
    - `<normal_fragment_begin>` → `waterChopNormal`;
    - `<color_fragment>` → '';
    - `<emissivemap_fragment>` → `waterBodyFragment(false, true)`.
  - **Rich fragment:**
    - `waterFragmentPars` + `richFragmentPars` + `waterRipplePars` + `waterSpecularPars` + `richReflectionPars` + `waterBarrelMaskPars`;
    - the same discard;
    - `richFarNormal`;
    - `waterBodyFragment(false, true, RICH_FAR_FOAM)`;
    - `RICH_REFLECTION` for `<lights_fragment_maps>`.
  - **No crest light:** its march reads the height field, which is the hump under the lip. The lip's own light is PR 6's.
- **Cache key and look:** `customProgramCacheKey` returns `` `breakline-swept-barrel-${look}` ``. `setLook` sets the roughness (`RICH_BASE_ROUGHNESS` or `CLASSIC_ROUGHNESS`) and `needsUpdate`.

- [ ] **Step 1: Write the failing tests.** In `waterLooks.test.ts`, keeping its `compiled`, `grid` and `source` as they are and importing `mirrorsBarrelDither`:

```ts
describe('the swept barrel’s seam in the water (Padang Padang, Part B, PR 3)', () => {
  it('leaves the water’s program exactly as before unless a swept spot turns the mask on', () => {
    const water = new WaterSurface(source);
    const before = compiled(water.mesh.material);
    water.setBarrelEnabled(true);
    expect(water.mesh.material.customProgramCacheKey()).toContain('-barrel');
    const on = compiled(water.mesh.material);
    expect(mirrorsBarrelDither(on.fragment)).toBe(true);
    expect(mirrorsBarrelDither(before.fragment)).toBe(false);
    water.setBarrelEnabled(false);
    expect(compiled(water.mesh.material)).toEqual(before);
    // The Rich look draws only over a source whose bodies ride its cubic surface.
    const rich = new WaterSurface({ ...source, cubic: true });
    rich.setLook('rich');
    expect(rich.drawnLook).toBe('rich');
    rich.setBarrelEnabled(true);
    expect(mirrorsBarrelDither(compiled(rich.mesh.material).fragment)).toBe(true);
  });

  it('switches the discard with the mask', () => {
    const water = new WaterSurface(source);
    water.setBarrelEnabled(true);
    expect(water.barrelMaskActive).toBe(false);
    water.setBarrelMask(new Uint8Array(grid.nx * grid.nz).fill(255));
    expect(water.barrelMaskActive).toBe(true);
    water.setBarrelMask(null);
    expect(water.barrelMaskActive).toBe(false);
  });
});
```

Create `src/scene/barrel/SweptBarrelMesh.test.ts`:

```ts
import { ShaderLib, type WebGLProgramParametersWithUniforms } from 'three';
import { describe, expect, it } from 'vitest';
import type { LoftResult } from '../../wave/barrel/sweptLoft';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { mirrorsBarrelDither, SWEPT_BARREL_DISCARD } from './barrelMaskGlsl';
import { SweptBarrelMesh } from './SweptBarrelMesh';

const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 8, nz: 8 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
function compiled(material: { onBeforeCompile: (shader: WebGLProgramParametersWithUniforms, renderer: never) => void }) {
  const shader = { uniforms: {}, vertexShader: ShaderLib.physical.vertexShader, fragmentShader: ShaderLib.physical.fragmentShader } as unknown as WebGLProgramParametersWithUniforms;
  material.onBeforeCompile(shader, undefined as never);
  return { vertex: shader.vertexShader, fragment: shader.fragmentShader };
}
function oneQuad(): LoftResult {
  return {
    positions: new Float32Array([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1]), normals: new Float32Array([0, 1, 0, 0, 1, 0, 0, 1, 0, 0, 1, 0]),
    mask: new Float32Array(4).fill(1), indices: new Uint32Array([0, 2, 1, 1, 2, 3]), vertexCount: 4, indexCount: 6, sliceCount: 2,
    sliceFront: new Int32Array(2), sliceSigma: new Float32Array(2), sliceTau: new Float32Array(2), slicePhase: new Uint8Array(2),
    sliceCrestOffset: new Float32Array(2), clamps: 0, clampedLookups: 0,
  };
}

describe('the swept barrel’s mesh', () => {
  it('shades lofted vertices as the water, showing exactly where the water gives way, in both looks', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    for (const look of ['classic', 'rich'] as const) {
      swept.setLook(look);
      const { vertex, fragment } = compiled(swept.mesh.material);
      expect(vertex).toContain('vec3 objectNormal = vec3( normal );');
      expect(vertex).toContain('vWaterWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;');
      expect(fragment).toContain(SWEPT_BARREL_DISCARD);
      expect(mirrorsBarrelDither(fragment)).toBe(true);
      expect(swept.mesh.material.customProgramCacheKey()).toBe(`breakline-swept-barrel-${look}`);
    }
  });

  it('draws a loft’s triangles, and hides for an empty loft or none', () => {
    const swept = new SweptBarrelMesh(new WaterSurface(source).materialUniforms);
    swept.update(oneQuad());
    expect(swept.mesh.visible).toBe(true);
    expect(swept.mesh.geometry.drawRange.count).toBe(6);
    expect(Array.from(swept.mesh.geometry.getAttribute('position').array.slice(0, 12))).toEqual([0, 0, 0, 1, 0, 0, 0, 0, 1, 1, 0, 1]);
    swept.update({ ...oneQuad(), indexCount: 0, vertexCount: 0 });
    expect(swept.mesh.visible).toBe(false);
    swept.update(undefined);
    expect(swept.mesh.visible).toBe(false);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/scene/waterLooks.test.ts src/scene/barrel`: fails.
- [ ] **Step 3: Implement** both as above.
- [ ] **Step 4: Run** `npx vitest run src/scene`. Expected PASS, with **no snapshot updated**. If a snapshot fails, the Classic program changed while off: fix the code, not the snapshot.
- [ ] **Step 5: Commit:** "feat(barrel): the water gives way under a barrel mask, compiled in only at a swept spot, with a dither the swept mesh mirrors; the swept mesh drawn with the water's shading".

### Task 6: Drawing it at Padang Padang

**Files:**
- Create: `src/scene/barrel/SweptBarrel.ts`, `src/scene/barrel/SweptBarrel.test.ts`
- Modify:
  - `src/wave/SurfZoneSimulation.ts`: `sweptBarrelOn`, used by the constructor;
  - `src/game/SurfZoneHost.ts`: `SnapshotSurfZone`'s option;
  - `src/game/PhysicalMode.ts`;
  - `src/main.ts`, after `this.water.update()` in `drawPhysical`.
- Test: `src/game/SurfZoneHost.test.ts`, `src/scene/barrel/SweptBarrel.test.ts`

**Interfaces:**
- Consumes: Tasks 1–5.
- Produces:
  - `sweptBarrelOn(config: Pick<SurfZoneConfig, 'spot' | 'sweptBarrel'>): boolean`, which is `config.sweptBarrel ?? SWEPT_BARREL.includes(config.spot)`. The simulation's constructor uses it in place of its inline test.
  - `new SnapshotSurfZone(host, options: { sweptBarrel?: boolean } = {})`. When swept, `writeUniformSurface` copies the raw heights whatever `carve` says, and `writeTubes` writes 0 rows. The swept tube is drawn, not carved; the physics' own carve stays until PR 4.
  - `SweptBarrel`:
    - `constructor(water: WaterSurface, load: () => Promise<ProfileLibrary> = () => loadBarrelLibrary())`;
    - `readonly mesh: SweptBarrelMesh`;
    - `readonly ready: Promise<void>`: resolves once the library has loaded, after the first `setSpot` that turns it on;
    - `setSpot(spot: SpotName | undefined): void`. On for a spot in `BARREL_SLOPE`: `water.setBarrelEnabled(true)` and the library's one load. Off otherwise: `water.setBarrelEnabled(false)`, the mask cleared, the mesh hidden.
    - `draw(front: Float32Array, count: number, stillLevel: number): void`;
    - `lastLoft: LoftResult | undefined`;
    - `dispose(): void`.
  - `PhysicalMode.drawBarrel(): void`: `main.ts` calls it after `this.water.update()` in `drawPhysical`. With a host at a swept spot it calls `sweptBarrel.draw(snapshot.front, snapshot.frontCount, config.tide)`, and otherwise nothing.

`SweptBarrel.draw`:
- off, or until the library has loaded: `water.setBarrelMask(null)` and `mesh.update(undefined)`;
- otherwise, the height sampler is the drawn look's (`water.drawnLook === 'rich'`: `sampleCubicSurface(water.surfaceData, water.grid, x, z).height`, else `sampleSurfaceHeight(water.surfaceData, water.grid, x, z)`);
- build the loft with a `SweptLoft` at `BARREL_SLOPE[spot]`, then `rasterizeBarrelMask` into a reused `Uint8Array` (reallocated when the grid's size changes);
- `water.setBarrelMask(set > 0 ? mask : null)`, `mesh.setLook(water.drawnLook)` when the look changed, `mesh.update(loft)`, and keep `lastLoft`.

In `PhysicalMode`:
- **In `start`:** create `this.sweptBarrel` on first use (`new SweptBarrel(water)`) and add its mesh to the scene. Then:
  - `water.setSource(new PhysicalSurfaceSource(new SnapshotSurfZone(host, { sweptBarrel: sweptBarrelOn(config) }), init.grid.spacing))`;
  - `this.sweptBarrel.setSpot(sweptBarrelOn(config) ? config.spot : undefined)`.
- **In `stop`:** `this.sweptBarrel?.setSpot(undefined)`.
- **In `update`:** skip `lipSheet.update` at a swept spot, and keep the lip sheet hidden there. The swept mesh's visibility follows the mode's `shown`, as the lip sheet's does, and `SweptBarrelMesh.update` hides it with no loft.

- [ ] **Step 1: Write the failing tests.**

In `SurfZoneHost.test.ts` (a stand-in host carries just the snapshot and the grid; the carving itself is tested in "carves the page's heights exactly as the worker does…"):

```ts
describe('SnapshotSurfZone at a swept spot (Padang Padang, Part B, PR 3)', () => {
  it('draws the water uncarved and hands the water no tubes, where the swept barrel draws the tube', () => {
    const grid = { xMin: 0, zMin: 0, spacing: 1, nx: 4, nz: 4 };
    const surface = new Float32Array(32).map((_, k) => k);
    const host = { init: { grid, dx: 1 }, snapshot: { surface, tubes: new Float32Array(2 * TUBE_STRIDE), tubeCount: 1 } } as unknown as SurfZoneHost;
    const swept = new SnapshotSurfZone(host, { sweptBarrel: true });
    const data = new Float32Array(32);
    swept.writeUniformSurface(data, grid, true);
    expect(Array.from(data)).toEqual(Array.from(surface));
    expect(swept.writeTubes(new Float32Array(2 * TUBE_STRIDE))).toBe(0);
    expect(new SnapshotSurfZone(host).writeTubes(new Float32Array(2 * TUBE_STRIDE))).toBe(1);
  });
});
```

(Import `type SurfZoneHost` from `./SurfZoneHost`.)

Create `src/scene/barrel/SweptBarrel.test.ts`:

```ts
import { describe, expect, it } from 'vitest';
import { FRONT_FIELD, FRONT_STRIDE } from '../../wave/barrel/frontRecords';
import { ProfileLibrary } from '../../wave/barrel/ProfileLibrary';
import { toyCase } from '../../wave/barrel/toyCase';
import { WaterSurface, type SurfaceSource } from '../WaterSurface';
import { SweptBarrel } from './SweptBarrel';

/** Flat water at 0 m over a grid holding the front and its 28 m toy profiles. */
const grid = { xMin: -5, zMin: -110, spacing: 1, nx: 40, nz: 50 };
const source: SurfaceSource = { grid, time: 0, bedRevision: 0, write: () => {}, writeBed: () => {} };
/** A straight front along +x at z = −100, thrown at z −100.2, τ 0.1 s. */
function straightFront(n: number): Float32Array {
  const out = new Float32Array(n * FRONT_STRIDE);
  for (let k = 0; k < n; k += 1) {
    const o = k * FRONT_STRIDE;
    out[o + FRONT_FIELD.x] = k + 0.5; out[o + FRONT_FIELD.z] = -100; out[o + FRONT_FIELD.front] = 1; out[o + FRONT_FIELD.sigma] = k;
    out[o + FRONT_FIELD.tau] = 0.1; out[o + FRONT_FIELD.footHeight] = 2.1; out[o + FRONT_FIELD.footDepth] = 7; out[o + FRONT_FIELD.throwZ] = -100.2;
  }
  return out;
}
const library = () => new ProfileLibrary([toyCase(0.2, 0), toyCase(0.4, 0.2)]);

describe('the swept barrel at a spot', () => {
  it('draws nothing and masks nothing until its library has loaded, or with no front', async () => {
    const water = new WaterSurface(source);
    let resolve!: (loaded: ProfileLibrary) => void;
    const barrel = new SweptBarrel(water, () => new Promise((r) => { resolve = r; }));
    barrel.setSpot('padang');
    barrel.draw(straightFront(21), 21, 0);
    expect(water.barrelMaskActive).toBe(false);
    expect(barrel.mesh.mesh.visible).toBe(false);
    resolve(library());
    await barrel.ready;
    barrel.draw(straightFront(21), 0, 0);
    expect(water.barrelMaskActive).toBe(false);
  });

  it('lofts a front over the drawn water, masks its footprint and shows the mesh', async () => {
    const water = new WaterSurface(source);
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('padang');
    await barrel.ready;
    barrel.draw(straightFront(21), 21, 0);
    expect(water.barrelMaskActive).toBe(true);
    expect(barrel.mesh.mesh.visible).toBe(true);
    expect(barrel.lastLoft!.vertexCount).toBeGreaterThan(0);
  });

  // Review Focus 4: every other spot keeps its water's program and pixels exactly.
  it('stays off at a spot without the swept barrel, its water’s program untouched', async () => {
    const water = new WaterSurface(source);
    const key = water.mesh.material.customProgramCacheKey();
    const barrel = new SweptBarrel(water, async () => library());
    barrel.setSpot('reef');
    barrel.draw(straightFront(21), 21, 0);
    expect(water.barrelMaskActive).toBe(false);
    expect(barrel.mesh.mesh.visible).toBe(false);
    expect(water.mesh.material.customProgramCacheKey()).toBe(key);
  });
});
```

- [ ] **Step 2: Run** `npx vitest run src/scene/barrel src/game/SurfZoneHost.test.ts`: fails.
- [ ] **Step 3: Implement** as above. In `main.ts`, add `this.physicalMode.drawBarrel();` right after `this.water.update();` in `drawPhysical`.
- [ ] **Step 4: Run** `npx vitest run src/scene src/game`, `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "^(?!.*holds).*$"`, `npx tsc --noEmit -p .` and `npm run build`. Expected PASS.
- [ ] **Step 5: Look at it.** Run vite as a background task on a free port: `npx vite --port 5199 --strictPort` (the preview-in-a-worktree note). Open `http://localhost:5199/` in the browser pane, and choose Padang Padang's Medium swell in the Wave Lab.
  - Screenshot a tube from the chase camera in both looks.
  - Then check Classic elsewhere: open `http://localhost:5199/?inpage&waterSheet` (the Point) on this branch, and the same page served from a checkout of `main`. Its Classic tiles must be identical, pixel for pixel.
  - Record both in the PR.
- [ ] **Step 6: Commit:** "feat(barrel): Padang Padang draws the swept barrel, sewn into the water by its mask; its lip strips and carve are off there".

### Task 7: Measure it

**Files:**
- Create: `src/wave/probes/padangLoft.probe.test.ts`
- Modify: `docs/research/barrel-library.md`, `docs/superpowers/plans/2026-09-29-padang-padang-part-b.md` (PR 3's status)

- [ ] **Step 1: Write the probe:**

```ts
import { appendFileSync, readFileSync, writeFileSync } from 'node:fs';
import { describe, it } from 'vitest';
import { PADANG } from '../Bathymetry';
import { loadBarrelLibrary } from '../barrel/barrelLibrary';
import { FRONT_CAPACITY, FRONT_STRIDE, writeFrontRecords } from '../barrel/frontRecords';
import { BARREL_SLOPE, SweptLoft } from '../barrel/sweptLoft';
import { SurfZoneSimulation } from '../SurfZoneSimulation';
import { sampleSurfaceHeight } from '../../scene/WaterSurface';
import { PADANG_SPREADING } from '../../game/PhysicalMode';
import { PADANG_SWELLS } from '../../game/SurfConditions';

const quantiles = (values: number[]) => {
  if (!values.length) return '—';
  const sorted = [...values].sort((a, b) => a - b);
  return [0.1, 0.5, 0.9].map((q) => sorted[Math.min(sorted.length - 1, Math.floor(q * sorted.length))].toFixed(2)).join(' / ') + ` (max ${sorted.at(-1)!.toFixed(2)})`;
};

/**
 * The swept loft on Padang Padang's Small swell (Part B, PR 3): its cost against the step, its slices and clamps, the
 * anchored crest's offset from the solver's (the advisor's ruling 2: report past about 2 m before touchdown), the open
 * curl's length along the crest (the checklist's 3–10 m) and neighbouring slices' clock steps in library frames (no
 * teeth: within one stage). The Classic look's bilinear heights, uncarved. Opt-in (PROBE=1); SECONDS, LOG.
 */
describe.runIf(process.env.PROBE)('Padang Padang loft probe', () => {
  it('lofts the fronts every step and logs what it drew', async () => {
    const log = process.env.LOG ?? 'padang-loft.txt';
    writeFileSync(log, '');
    const fetcher = (async (url: string) => {
      const bytes = readFileSync(`public/${url}`);
      return { ok: true, status: 200, arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
    }) as unknown as typeof fetch;
    const library = await loadBarrelLibrary(undefined, fetcher);
    const swell = PADANG_SWELLS.small;
    const simulation = new SurfZoneSimulation({
      spot: 'padang', seed: 3, significantHeight: swell.significantHeight, peakPeriod: swell.peakPeriod,
      directionDegrees: 0, spreading: PADANG_SPREADING, tide: 0, componentCount: 24,
      alongShore: PADANG.alongShore, dx: 1, fineSpacing: 1, coarseSpacing: 4, spinUpPeriods: 1,
    });
    const grid = simulation.renderGrid(1);
    const surface = new Float32Array(grid.nx * grid.nz * 2);
    const records = new Float32Array(FRONT_CAPACITY * FRONT_STRIDE);
    const loft = new SweptLoft(library, BARREL_SLOPE.padang!);
    const frameOf = library.profileAt({ slope: BARREL_SLOPE.padang!, footHeight: 1.6, footDepth: PADANG.baseDepth, seconds: 0 }, new Float32Array(256)).frameSeconds;
    let stepMs = 0;
    let loftMs = 0;
    let frames = 0;
    let over2 = 0;
    let openSlices = 0;
    let offsets: number[] = [];
    let curls: number[] = [];
    let steps: number[] = [];
    const seconds = Number(process.env.SECONDS ?? 120);
    for (let frame = 0; frame < seconds * 30; frame += 1) {
      let start = performance.now();
      simulation.step(1 / 30);
      stepMs += performance.now() - start;
      grid.xMin = simulation.windowXMin;
      simulation.writeUniformSurface(surface, grid, false);
      const count = writeFrontRecords(simulation.front!.points, records);
      start = performance.now();
      const result = loft.build(records, count, 0, (x, z) => sampleSurfaceHeight(surface, grid, x, z));
      loftMs += performance.now() - start;
      frames += 1;
      let run = 0;
      for (let s = 0; s < result.sliceCount; s += 1) {
        const open = result.slicePhase[s] === 1;
        if (open) {
          openSlices += 1;
          const offset = result.sliceCrestOffset[s];
          if (Number.isFinite(offset)) {
            offsets.push(offset);
            if (offset > 2) over2 += 1;
          }
        }
        const sameFront = s > 0 && result.sliceFront[s] === result.sliceFront[s - 1];
        if (sameFront) steps.push(Math.abs(result.sliceTau[s] - result.sliceTau[s - 1]) / frameOf);
        if (open && (run === 0 || sameFront)) run += 1;
        else {
          if (run > 1) curls.push((run - 1) * 0.5);
          run = open ? 1 : 0;
        }
      }
      if (run > 1) curls.push((run - 1) * 0.5);
      if (frame % 30 !== 29) continue;
      appendFileSync(log, `t ${simulation.solver.time.toFixed(0)} s | ${count} points, ${result.sliceCount} slices, ${result.vertexCount} vertices, clamps ${result.clamps}, clamped lookups ${result.clampedLookups} | crest offset (open) ${quantiles(offsets)} m | open curl ${quantiles(curls)} m | clock step ${quantiles(steps)} frames\n`);
      offsets = [];
      curls = [];
      steps = [];
    }
    appendFileSync(log, `the loft ${(loftMs / frames).toFixed(2)} ms a frame against the step's ${(stepMs / frames).toFixed(1)} ms (${((100 * loftMs) / stepMs).toFixed(1)} %); open slices with the crest over 2 m off: ${over2} of ${openSlices}\n`);
  }, 7_200_000);
});
```

(The open-curl run counts slices at the 0.5 m spacing. A refined 0.25 m slice undercounts slightly; the probe reports it as measured.)

- [ ] **Step 2: Run it:** `PROBE=1 LOG=<scratch>/padang-loft.txt npx vitest run src/wave/probes/padangLoft.probe.test.ts`.
- [ ] **Step 3: Write the results** into `barrel-library.md`, in a new section "The loft" [measured]:
  - its cost against the step;
  - the open curl's length against the checklist's 3–10 m;
  - neighbouring clock steps against one stage;
  - the crest offsets.

  Send the offsets and the open curl to the advisor (`uds:/tmp/cc-socks/4778.sock`), as ruling 2 asks. Mark PR 3 done in the Part B plan, with the numbers.
- [ ] **Step 4: Commit:** "docs: the swept loft measured on Padang Padang's Small swell", and open PR 3. Stack it on the clock branch until PRs 1–2 merge. The body lists:
  - the interim mismatch (drawn swept tube, ridden carved tube until PR 4);
  - the screenshots, and the Classic check at the Point.
