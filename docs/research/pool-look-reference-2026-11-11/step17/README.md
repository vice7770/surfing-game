# Step 17: the water light (ruling 25e)

2026-11-12. One build. Drawing only. Rich look.

## What changed

- **Rich body gain 4 → 1** on every water drawing: the sea, the far field, the barrel mesh and the roller (they share the sea's uniforms), the lip sheets and the spray sheets.
  The value lives in one shared uniform (`richBodyGain`, `src/scene/water/waterLight.ts`). The lip and spray sheets bind this object itself. The sea and the far field copy it on a look change and on `refreshBodyGain()`. So all water has the same gain: no seam from the gain.
- **Display exposure 1.05 → 1.6** (`renderer.toneMappingExposure`, `src/main.ts`).
- **Where it is on:**
  - In the 2 m pool (`poolSize=ref`), with no extra parameter.
  - `?waterLight=on` turns it on at any other spot. `?waterLight=off` turns it off in the pool.
  - It is a field of the sea's config (`SurfZoneConfig.waterLight`, read by `waterLightSwitch()` in `PhysicalMode.ts`). The solver never reads it.
  - Online rooms pin `waterLight` absent (and `poolSize` already), in the same override list as the other switches. So a room draws the default (off).
  - `main.startPhysical` sets the light after each sea starts (`applyWaterLight(waterLightOn(config))`). Off = gain 4 and exposure 1.05, as before.
- **Classic:** its own gain (3) does not change. The exposure is the frame's, so a Classic pool with the light on gets exposure 1.6 too. Ruling 25e is about Rich; Classic in the 2 m pool may need its own look later.
- **Glow (AgX grade, off by default):** it has its own exposure. With the glow on, the light gives gain 1 but not exposure 1.6, so the water would look darker. Not handled, not measured.
- Files: `src/scene/water/waterLight.ts` (new), `waterLight.test.ts` (new), `src/main.ts`, `src/game/PhysicalMode.ts`, `src/wave/SurfZoneSimulation.ts` (the field), `src/scene/WaterSurface.ts`, `FarFieldOcean.ts`, `LipSheetMesh.ts`, `SpraySheetMesh.ts`.

## How it was measured

- One held frame at 90 s (`../step14/hold.mjs`, `--advance=60`), ride address of the 2 m pool.
- The default run (light on) was shot first. Then the light was turned off in the page (the app's own module) and the same views were shot again.
- The masks and region rules are the diagnosis's (`../foam-light/regions.mjs`), from its run on the same frame.
- **Check of the frame:** the light-off stills are pixel-equal to the diagnosis's stills of main (0 pixels differ, all four). A light-on still taken later in the run is pixel-equal to the diagnosis's "proposal 2" still. The first light-on still of a view differs from a later one in a few speckles on the white pile (5762 px, max 8 of 255). A first still of a view does that in any run (the `waterLight=off` URL run shows it too). It does not change the numbers below by more than 0.01.

## Bars (off → on)

| Bar | What | Off | On | Result |
|---|---|---|---|---|
| W1 | pile / flat water, luminance, `curl-lip` midday | 0.97 | **1.50** | pass (≥ 1.3) |
| W1 | same, `curl-front` midday | 0.96 | **1.33** | pass (≥ 1.3) |
| W1 | sunset, pile and flat water luma, `curl-lip` | 194 / 197 | **224 / 149** | pass (pile ≥ water) |
| W1 | sunset, `curl-front` | 202 / 208 | **223 / 192** | pass |
| W2 | step across the tube-mesh / sea-mesh join, `curl-front` midday (luma, 274 places with clear water on both sides) | 0.81 | **3.75** | **miss by the letter** (see below) |
| W2 | same at sunset | 22.2 | 33.4 | (larger) |
| W2 | the step over the water's own pixel-to-pixel texture beside it, midday / sunset | 2.45 / 6.55 | 4.74 / 6.69 | |
| W3 | deck, scenery, spray (what the tone map draws apart from water; 5 539 px `curl-front`, 7 432 px `curl-lip`): pixels at 255 | 0 % | **0 %** | pass |
| W3 | `lineup` view (pool deck and grass in the frame): pixels at 255 among them | 0 | **0** | pass. Deck luma 194 → 227 |
| W3 | rider | — | — | **not read** in the pool (no rider in any view). At the Reef (light on) a far rider shows: 0 clipped pixels in its box, on and off |
| W5 | pool at the default size, no switch: `curl-front`, `curl-lip`, `curl-inside` vs origin/main | | 0 px differ | pass |
| W5 | Canyon, no switch: `face`, `bore`, `lineup` vs origin/main | | 0 px differ | pass |
| W5 | program text with the light on and off | | equal (test) | pass |

Whole frame, pixels at 255 (mostly the sky photo, which does not change): `curl-front` 876 → 1157. The extra ~280 are sun glints on the water.

### W2, the join

- The join between the barrel mesh and the sea mesh is a dithered band below the white pile (`seam-front-midday-stretched.jpg`, contrast stretched: off above, on below).
- The step is there in main already. In linear light the sea and the barrel mesh differ by 6.8 % across the join. At gain 4 the water sits high on the tone map's shoulder (blue 251), so the screen hides it (0.81). At gain 1 the water comes down off the shoulder, and the step shows: 3.75 of 255 (1.8 %).
- It is not a new seam from the gain: the gain is one value on both meshes. A gain change on the tube alone gave 47.6 (the diagnosis's seam still).
- By eye at normal size: I cannot see a line. Zoomed 2× without stretch, a faint dotted band (the dither) shows below the pile.
- So W2 misses as written. The fix, if wanted, is the sea / barrel-mesh match in that band, not this change.

## What the stills show (my read)

- `front-midday-off-on.jpg`, `lip-midday-off-on.jpg` (off above, on below): with the light on the pool is a deeper turquoise. The face and the back wall get depth and visible ripples. The white lip and the pile now read white against the water. Off, the water is pale, almost as bright as the foam. Nothing is blown out. The sky does not change.
- `inside-midday-on.jpg`: the wall inside the tube is a clear mid blue with shading; off, it is flat and pale.
- Sunset (not kept as a still; numbers above): the lip glows peach, the water is blue below it. Good.
- Not murky in the pool. The foam is light grey-white (luma 238–240), the brightest thing in the water.

## Other spots, light on (W4, no bar)

`spots-waterlight-on.jpg`, top to bottom: Canyon (default) `bore`, Canyon B (`canyonWaves=true`) `bore`, Reef `tube-shoulder`. Foam over clear water, luminance, on the sea mesh:

| Spot, view | Off | On |
|---|---|---|
| Canyon, `face` | 1.64 | 3.95 |
| Canyon, `bore` | 2.03 | 3.81 |
| Canyon, `lineup` (little foam, 615 px) | 1.81 | 5.01 |
| Canyon B, `bore` | 1.70 | 3.38 |
| Reef, `tube-shoulder` | 1.15 | 2.25 |
| Reef, `tube-beside` | 1.03 | 2.10 |

- The ocean spots already had foam brighter than water (1.6–2.0 at the Canyon). With the light on it goes to 3.4–5.0, at or above the top of the real range (1.4–3.7).
- My read: at the Canyon the clear water turns a dark grey-green teal, (92, 135, 138); it looks murky next to the white foam. The Reef stays turquoise and reads well, close to the pool. This is the owner's call; the gain 4 was tuned on these spots.

## Checks run

- `npx tsc --noEmit -p .` and the server's: pass.
- Tests: `waterLight.test.ts` (switch, pool default, room pin, one gain on all four water materials, program text equal on and off, Classic keeps 3) and the related files: 6 files, 151 tests pass.

## Not run

- W2 missed as written, so I did not run the merge checks: the full suite, the Canyon byte check (`light17`) and the fps traces. The change is a uniform value and the exposure, so no cost is expected; this is not measured.
- No rider in the pool views; the Classic look; the glow path; dawn.
