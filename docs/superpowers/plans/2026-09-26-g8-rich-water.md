# G8: Rich Water — Design Record

> Built test-first on `claude/g8-water`, from `main` at `b2577cf` (P8 menus, G7 Part A). The implementation plan this record replaces is in the history of this file (`135911c`). Requirements: [G8 spec](../specs/2026-09-26-g8-rich-water.md).

**Goal:** Give the water a Surf World Series–like look, detailed and glossy but not photoreal: a smooth wave face with fine flow-carried ripples and sharp highlights, foam streaks up steep faces, fresh whitewater as clumpy churn opening into lace, lit mist, and a far ocean that matches. Keep today's water as a cheaper choice for weaker machines. Rendering only: the physics is unchanged.

## Design

### The setting

- **Water look: Classic / Rich** is a choice row in P8's Graphics › Advanced, after Sea detail. It applies instantly, with no new wave.
- **Presets:** Low → Classic; Medium, High and Ultra → Rich. Saves from before G8 load with their preset's look, so an old Low (or Auto that detected Low) stays Classic. An old Custom save stays Classic where the benchmark rated the machine Low.
- **One water, two looks:** `WaterSurface`, `FarFieldOcean` and `SprayPoints` each have `setLook(look)`. The look is part of the program cache key, so switching compiles once per look and switching back reuses Classic's program.
- **Classic is byte-identical:** vitest snapshots pin Classic's compiled shaders for all three. Every Rich difference sits behind the look, including constants: Rich has its own uniforms rather than changed shared values.
- **The legacy wave stays Classic.** Rich needs the physics' Catmull-Rom surface (`SurfaceSource.cubic`), so the legacy field draws Classic even when Rich is chosen.
- **`main.ts`** calls `applyWaterLook(look)` from `applyGraphics` and hands the spray the water's uniforms and the sun, a few lines in all.

### The wave face

- **The physics' own surface** (`water/cubicSurface.ts`): Rich draws the Catmull-Rom surface over the 1 m render nodes, clamped at the grid edges exactly as `PhysicalSurfWater.surfaceAt` is, so the board sits on what is drawn. The height comes per vertex. The normal comes per pixel from the analytic derivative, flipped by `faceDirection` for the underside. `sampleCubicSurface` is its CPU mirror.
- **The dense patch** (`water/richPatch.ts`): a 96 m square of 0.25 m cells follows the camera, centred 0.3 of its size ahead along the view and snapped to render nodes. A skirt hangs 0.3 m below its rim to hide seams.
  - It shares the coarse water's material. An `onPatch` vertex attribute tells the two apart, and the coarse water discards its fragments under the patch. The coarse geometry carries real zero `skirt` and `onPatch` attributes, not three's `defaultAttributeValues`, which are context-wide state another material can overwrite.
  - The skirt's inner faces are discarded, so it hangs no curtain in the underwater view.
  - Both meshes place the patch from the camera about to draw them, so the answer never depends on draw order.
- **Fine ripples** (`water/rippleTexture.ts`): two layers (4 m and 1.3 m repeats) of one baked 256² tile.
  - The tile is an integer-wave-vector sum of 48 cosines around the wind, so it tiles exactly. The amplitudes fall as |n|⁻², scaled to an rms slope of 0.1.
  - It is stored as RGBA half floats (sx, sz, sx², sz²) with mipmaps, so a filtered read gives each pixel footprint's mean slope and its variance. The variance is taken per layer and per phase (`rippleVariance` is its CPU mirror), so ripples the footprint resolves leave none.
  - The currents carry it in the foam lace's two flow-map phases (2 s).
  - Strength: 0.8–1.0 with the wind chop, times a foam gain that is glassy on clean water (0.35), busiest in thin turbulent foam, and damped under thick foam.
- **Gloss and specular anti-aliasing** (`water/specular.ts`): the base roughness is 0.08. The slope variance a pixel averages away comes back as roughness in three's GGX alpha space (α = roughness², α² grows by 2·variance), capped at 0.6, so distant ripples dim to a sheen instead of sparkling. The underside keeps Classic's 0.62: from below, past the Snell window, the water reflects itself, not the sky.
- **Face streaks** (`water/streaks.ts`): the lace's walls are stretched 7× along the local current and carried by it, as thin lines of up to 55 % cover. The stretch turns with the current about anchors 6 m apart, each reading the current at its own node, and the four around a pixel are blended (tiled directional flow). So a turn of the current moves the lines by at most its angle times about 8 m, not times the distance to the world's origin. They appear only on steep faces (slope 0.25–0.5) with some foam (0.005–0.05), and fade once a pixel spans a lace cell.

### Whitewater

- **Churn** (`water/churnTexture.ts`): a baked 256² tileable cauliflower Worley pattern over 6 m. It has two octaves of domes 0.8 cells wide, giving about 81 % cover with creases between clumps. The currents carry it like the lace.
- **By freshness:** where the foam value is 0.55–0.9 and above, the churn takes over from the lace, with a crease shade of 0.88–1 and a 0.06 m relief in the normal. Thin fresh foam glows a little when the sun is behind it. It stays on the physics surface.
- **Composition:** `waterBodyFragment` takes its foam composition as a parameter. `CLASSIC_FOAM` is today's four lines verbatim, and `RICH_FOAM` layers churn, lace and streaks over a glossy body that turns matte (0.7) under foam.
- **Toggles:** Simple foam keeps the plain tint in Rich too, with no churn or streaks.

### Mist and spray

- **Rich spray** (`water/richSpray.ts`, `water/mist.ts`): sprites wider than 0.25 m are mist, drawn 1.6× larger as a softer disc. Mist is lit by a Henyey–Greenstein phase (g = 0.6), so it glows toward the sun; dim mist thins rather than greys.
- **Fading:** every sprite fades out just under the water's surface, read from the water's own height uniforms, so no hard line shows.
- **Tone mapping:** the Rich spray is tone-mapped like the scene, so an orange sunset sun cannot clip it.

### The far ocean

The far ocean gets Classic's analytic normal and chop plus the same ripples. They sit on still water and at the tank's strength, so near and far water meet without a step in gloss. It also has the Rich gloss and its own foam composition (`RICH_FAR_FOAM`).

### Colour

Tuned live on the water sheet against the reference stills:
- **`waterReflection` 0.5:** a Rich-only uniform scaling three's image-based specular. The photo sky sets `envMapIntensity` for both looks, and at 1.0 the glossy sea mirrored the pale dawn and sunset haze into a milky sheet.
- **Body gain 4 in Rich** (Classic keeps 3): set on the shared `waterBodyGain` uniform by look.
- **Unchanged:** `CREST_SCATTER` and the exposure.

### The water sheet

`?inpage&waterSheet` (or `water-sheet.html`) runs the real game on the Point practice swell. It settles until a face of slope ≥ 0.35 stands near the break, then renders five shots (lineup, face, bore, horizon, below) under the three skies, Classic beside Rich. It posts the PNG to the local receiver (`recordings/water-sheet.png`), since a hidden browser pane throttles the page.
- The bore shot aims at the fresh whitewater nearest the break.
- `waterSheetShot(name | view, look, time)` renders one shot at 1280×720.
- `waterSheetTime(name, look)` times one shot's render.

## Deviations from the plan

- **Patch:**
  - it shares the coarse water's material, told apart by an `onPatch` attribute, instead of a cloned material;
  - the attribute was first named `patch`, a GLSL ES 3.00 reserved word, and the Rich program did not compile. A test now checks the Rich program's names against the reserved words and that every added attribute is fed on both meshes.
- **Ripple variance:** the finer layer's squares are weighted by 0.36 and the combined mean subtracted, instead of the plan's sum over 1.6.
- **The underside keeps Classic's roughness.** At 0.08 the Below view mirrored the sky as bright streaks.
- **The foam composition parameter** came with the streaks (Task 6), not the churn (Task 7).
- **Streak ramps:** retuned from a face measured on the sheet. Its steep nodes carried foam with a median of 0.006 and a 90th percentile of 0.045, and the plan's ramps drew no visible streak. The changes: foam 0.005–0.05 (not 0.02–0.15), steepness 0.25–0.5 (not 0.35–0.7), line half-width 0.12 cells (not 0.07). The streaks also fade by pixel footprint and are off when foam is Simple.
- **Churn:**
  - domes 0.8 cells wide (0.55 gave 46 % cover against the plan's 70–95 %);
  - crease floor 0.88 (0.72 read as dirty grey veins).
- **Mist:** dim mist thins instead of greying, and the Rich spray is tone-mapped. It is wired in `main.ts` only, not `PhysicalMode`.
- **Far ocean:** it has the tank's ripple strength instead of 0.5.
- **Review fixes:**
  - streaks turn about local anchors (the plan's frame pivoted on the world origin and swam in motion);
  - the anti-aliasing works in GGX alpha space with per-layer variance (the plan's formula used perceptual roughness);
  - the skirt is hidden from below;
  - the coarse water has real zero attributes;
  - old Custom saves on machines rated Low stay Classic.
- **Colour:**
  - Rich gained its own reflection and body gain (0.5 and 4);
  - ripples are damped under thick foam, where a low sun lit them as white blotches on the foam.
- **Sheet:** it settles on a steep face, aims the bore at fresh whitewater, and gained single-shot and timing hooks.

## Verification

- **Review:** a fresh reviewer (Opus) found no Critical issues. The two Important ones (streaks swimming, the anti-aliasing maths) and three re-graded Minors (the skirt from below, the coarse attributes, old Custom saves) were fixed test-first.
- **Tests:** 53 new across 11 files, all green:
  - Classic parity snapshots and look switching (18 in `waterLooks.test.ts`), including:
    - the reserved-word and attribute checks;
    - the underside;
    - the spray and the far ocean;
    - the tuning uniforms;
  - Catmull-Rom agreement with the physics between nodes and at the clamped edges (3);
  - the patch's placement, snapping, small grids and skirt (4);
  - ripples tiling exactly with the intended rms slope, their per-layer variance, and the foam gain (7);
  - specular anti-aliasing in GGX alpha space (3);
  - streaks, including holding still when the current turns 100 m from the origin (7);
  - churn tiling, cover and freshness (4);
  - mist (3);
  - the setting (4): old Low, Auto-detected-Low and Custom-on-Low saves stay Classic, the presets' looks, and the row after Sea detail with no new wave.
- **Full suite:** 713 passed after the review fixes (earlier, 3 heavy simulation tests timed out while the sheet loaded the machine, and passed alone). **Build:** passes.
- **Sheet:**
  - Rich faces are smooth and glossy, with sharp glints and moving ripples, and no moiré at the horizon;
  - streaks show up the steep face and none on calm water;
  - the bore shows a bright, clumpy churn band opening into lace;
  - the Below view matches Classic, with faint ripple relief;
  - near and far water match in gloss.
- **Performance:** render cost per frame, measured by drawing each shot 120 times and waiting on a one-pixel read. The browser pane was hidden, which throttles animation frames, so frame intervals at each preset could not be measured. Apple M1 (ANGLE Metal), 1280×720 device pixels, median / 90th percentile in ms:

  | Shot | Classic | Rich |
  | --- | --- | --- |
  | Lineup | 8.1–8.3 / 8.9 | 8.5–8.6 / 9.1–9.4 |
  | Face | 8.3–8.4 / 9.3–9.9 | 8.5–8.6 / 9.7–10.0 |
  | Bore | 8.5–8.8 / 9.8–10.5 | 9.3–9.7 / 10.0–10.4 |

  Rich adds 0.2–0.9 ms (about 3–10 %) at this size. Most of it is per pixel, so it grows with resolution.
- **Game:** a Point session runs on the Rich water with no console errors.

## Open

- **Playtest:** judge Rich against Classic in play, and time frame intervals at each preset with the browser pane shown.
- **Pre-existing, not G8:** from high up, the tank's offshore swell ridge reads as a strip with a thin dark outline, and sand-coloured slivers show at its sides, in both looks. This is the tank/far-field geometric seam.
