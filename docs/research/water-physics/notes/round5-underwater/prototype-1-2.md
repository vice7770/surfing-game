# Underwater items 1–2: a throwaway prototype (2026-09-29)

A throwaway prototype of underwater items 1–2 from [underwater.md](../../underwater.md), in Rich only, following the owner's decisions of 2026-09-29: physical colour and fading with a 6–8 m readability floor, and Classic unchanged. It was built in a scratch worktree (`scratch/uw-proto`, off `425ae4a`) and never committed. The diff is [prototype-1-2.diff](prototype-1-2.diff).

- **Tags:** [sourced] a cited value; [est] an estimate or a rendering choice.
- **Paths:** `path:line` refers to the prototype worktree.

![Reef, today against the prototype, at midday and dusk: looking up 65°, level and down 45°, seaward from 2 m under the lineup](img/prototype-1-2-reef.jpg)

![Beach, the same views from 1.3 m under the lineup, in 2.5 m of water](img/prototype-1-2-beach.jpg)

## What changed

**Item 1: colour and fog from each spot's own water.**
- **Where:** `src/scene/underwater.ts`, a new file.
- **How it works:** while the camera is under water in Rich, `main.ts` draws the scene into a float target, and one composite pass fades each pixel toward the water's own radiance in its direction.
  - The target is drawn at `main.ts:966` and `underwater.ts:168`.
  - The pass fades each pixel by e^(−c·d) per channel along its real view distance (`underwater.ts:146-150`).
  - `setUnderwater` switches it on (`main.ts:1071-1086`). Classic keeps its `FogExp2`.
- **Eye-path attenuation:** the spot's own beam attenuation c from `waterOptics.ts` [sourced: Pope & Fry, per-spot b_p]. It is scaled down, keeping the hue, so that 4.8/c_G is never under 7 m (`underwater.ts:17-35`).
  - Sighting 4.8/c is from Davies-Colley and Zaneveld & Pegau [sourced].
  - The 7 m floor is the middle of the owner's 6–8 m [est].
  - The Reef is left physical (c_G = 0.214 m⁻¹, 22.4 m).
  - The Beach is scaled from c_G = 2.16 to 0.686 m⁻¹. The Point would be scaled too.
- **Light from above:** the light keeps the physical K = a + b_b [sourced: Gordon, the game's `diffuseAttenuation`], as Subnautica decoupled the sun's attenuation from the eye path's.
  - E_d(z) = E_sun·e^(−Kz/μ_w) + E_sky·e^(−1.2Kz) (`underwater.ts:79-83`).
  - E_sun and E_sky are the scene's actual sun and the photo sky's measured irradiance, after Fresnel. Diffuse Fresnel is 0.066 [sourced, textbook]. The 1.2 stretch for diffuse light and the grey sky colour are [est] (`underwater.ts:38-55`, `main.ts:1088-1096`, `PhotoSky.ts:147`).
- **The water's radiance by direction** (`underwater.ts:85-95`):
  - Level: 7·R∞·E_d/π, with R∞ from Morel & Prieur [sourced], Q = π [est] and Tyler's level-to-nadir ratio of 7 [sourced].
  - Down to the nadir: it falls to R∞·E_d/π.
  - Up to the zenith: it rises toward Tyler's 25× the level, capped at n²(1 − F)·E_d/π, what a uniform sky can send through the window. The shape between is log-interpolated as μ^1.5 [est].
  - The in-scatter is taken at the depth 1/c along the ray [est].
- **Seabed:** under water it is a Lambertian bed of the spot's `bedAlbedo`, lit by A·E_d(z)/π, with the direct sun through the caustic map (`SpotSeabed.ts:72-80`). The painted gradient stays above water.

**Item 2: the surface from below.**
- **Where:** the `UNDERSIDE` block in `src/scene/water/richWaterGlsl.ts:80-105`, run only when `uwActive` is set and the pixel is a back face. The tube's roof seen from above water is unchanged.
- **Snell's window:** the view is refracted out with n = 1.333 (`:82`).
  - Inside the window it shows the sky map and the sun, × (1 − F) × n² [sourced: Snell, and the n² radiance law].
  - The sun is spread over a 2π/801 sr lobe [est].
- **The mirror:** beyond 48.6° (F = 1), and for the reflected share inside the window, the surface mirrors the water's own radiance and, through `vWaterDepth`, the lit bed (`:86`).
- **The sky reflection** is switched off on the underside (`RICH_REFLECTION_TANK`, `:149`).
- **Foam** glows as a diffuser across the whole ceiling at 0.45·E_d(0)/π [est from Koepke's 55 % reflectance].
- **The plume** glows by two-stream transmission 1/(1 + 0.1125τ), with τ = 1500·α·depth (a = 1 mm, g = 0.85) [sourced, round 5 §3.5].
- **No caustics under whitewater:** on the bed, foam or plume above turns the sun diffuse. The caustics go and 0.45 of the light gets through (`SpotSeabed.ts:74-79`) [est].

## Measured checks

**Method:**
- Water sheet, CPU tier, SwiftShader, 1280 × 720, at the lineup. The eye is 2 m under at the Reef (10.5 m of water) and 1.3 m under at the Beach (2.5 m of water).
- Pixels are decoded to linear and three's Neutral tone map is inverted.
- Visibility comes from a 1.5 m black box straight ahead at 1–40 m: the slope of ln(background − box) against distance gives c, and the sighting is 4.8/c.
- The window is the lowest strong brightness step (> 1.5× across 16 rows), looking up 65°.
- "Up/level" is the zenith radiance over the level radiance, from frames at exposure 0.15.

| Check | Target | Today (main) | Prototype |
| --- | --- | --- | --- |
| Black object, Reef | About 20 m (optics 22.4 m) | Contrast still 0.25 at 40 m; FogExp2 reaches 1 % near 61 m everywhere | c_G 0.214 m⁻¹ → **22.5 m**; on screen the box falls under 1 grey level beyond about 15 m (0.6 of a level at 20 m) |
| Black object, Beach | 6–8 m floor (7 m used; physical 2.2 m) | As the Reef | c_G 0.675 m⁻¹ → **7.1 m**; under 1 grey level beyond about 6–8 m |
| Window, full angle | 97.2° on flat water; about 122° at 16° slopes (Lynch) | No window: no edge found | Reef **98.3°** midday, **98.4°** dusk; Beach **97.5°** dusk, and at midday no clean edge (waves and 1.3 m of turbid water) |
| Zenith ÷ level radiance | About 25× (Tyler 1960, overcast lake, 6.1 m) | Reef 0.22 midday, 0.56 dusk; Beach 0.31 and 0.72: the ceiling is darker than the fog | Reef **6.5× midday, 10.2× dusk**; Beach **3.9× and 5.0×** |
| Seabed, dusk against midday | Darker at dusk | Identical (luminance 0.184 and 0.183) | 43 % darker (0.035 → 0.020), with caustics at midday |
| Classic look | Unchanged | — | Pixel-identical to main at both spots |

## What failed or is doubtful

1. **Up/level is 4–10×, not 25×.**
   - Tyler's figure is for an overcast lake. Under a sun, the sun counts in E_d, which lifts the level radiance while the zenith sky does not rise with it.
   - Q = π probably makes the level radiance too bright; measured Q is 3–5.
   - The Beach's high R∞ (0.062 in green) makes its fog bright and flat.
   - The sunny radiance data (Tyler 1958, part I) was never opened.
2. **The frames are dark.**
   - With physical radiance at the Rich exposure, the level Reef water has a linear luminance of 0.10 at midday and 0.06 at dusk. Today's flat fog is 0.20 at both.
   - The Reef bed at 10 m reads navy.
   - Above water the owner already accepted readability gains (`WATER_BODY_GAIN = 3`, Rich 4×). The prototype adds none underwater.
3. **The colours lack the coastal green.**
   - The Reef reads saturated blue rather than blue-green, and the Beach cyan-grey rather than green.
   - The optics have no CDOM or chlorophyll absorption term (round 5 §3.1 gap).
4. **Dusk is only about 45 % darker.** The photo sky's exposure compresses low suns (`REFERENCE_LIGHT·(0.4 + 0.6√sin h)`), so it goes only part of the way to "dusk goes dark".
5. **The Beach window stays sharp.** In turbid water, forward scattering should blur the window and its ring (Lynch). The composite fades toward the fog but never blurs.
6. **The screen shortens sighting.** At 8 bits, the last few per cent of contrast on a dim background is below one grey level, so the Reef reads about 15–20 m on screen, not 22 m.
7. **The composite's side effects:**
   - Transparent objects (bubbles, spray) are fogged by the depth behind them.
   - The float target has no MSAA.
   - The far-field ocean and the lip sheet keep their old underside.
   - Nothing was timed (SwiftShader).
8. **Plumes don't white out yet.** They glow only on the ceiling; the volume is item 4.

## What a real implementation PR must do differently

1. **Fog in the materials.** Do the fog inside the materials, or as a shared fog chunk with per-channel uniforms, rather than a separate float pass. That spares the tile-memory round trip on Apple GPUs (round 5 §4.3), and fogs transparent objects correctly.
2. **The level radiance.** Fit it against measured sunny radiance distributions (Q, and a refracted-sun aureole), not Tyler's overcast ratios. Then re-measure up/level against sourced sunny values.
3. **The owner's calls.** Take the owner's decision on an underwater exposure gain before tuning (below), and check the result on the water sheet at 8 bits.
4. **Colour.** Add a sourced CDOM and chlorophyll absorption spectrum per spot, or accept the blue Reef and grey Beach.
5. **Blur the window with turbidity.** A mip bias on the sky lookup scaled by b·d would do [est].
6. **Every underside.** Extend the underside to the far-field ocean and the lip sheet, and later the swept barrel's cavity.
7. **Keep the Beach floor honest in the fog.** Today the floor scales c in every direction, including the light that reaches the bed through the mirror.
8. **Tests.**
   - Unit-test `eyeAttenuation` and `underwaterIrradiance` against the table above.
   - Keep `waterLooks.test.ts`'s check that the tank shader contains `RICH_REFLECTION`: the prototype had to append its underside rule after that chunk rather than edit it.

## Test status

On the prototype worktree:
- `npm install` ran.
- `tsc -p tsconfig.json` passes.
- `vitest run` passes: 199 files, 1,662 tests and 13 expected failures, the same as the untouched baseline.

## Owner decisions this raises

1. **An underwater exposure or readability gain:** the level view is 2–3× darker than today's and the bed view about 5–9× darker.
2. **The floor distance:** 7 m was used. Should it apply only to the Beach, or to the Point too (physically 4.3 m)?
3. **Water colour:** accept the blue Reef and grey Beach, or fund a sourced CDOM term.
