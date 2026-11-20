# Foam light diagnosis (ruling 25d): why foam is no brighter than the pool water

2026-11-12. Measuring only. No change to `src/`. Main's look (no streak code), Rich, 90 s, held frame.

Ride address: `pool&waves=barrel&swell=medium&tubeSeam=blend&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&poolSize=ref&tubeForm=early&loftMesh=arc&wallFoot=dug`.

## The short answer

- **The water is too bright. The foam is not too dim.**
- The cause is the water's body gain: `RICH_WATER.bodyGain = 4` (`src/scene/water/richWaterGlsl.ts` line 148). The body's reflectance (0.18, 0.55, 0.66 over the pale pool floor) is multiplied by 4. So the pool water has an albedo of (0.74, 2.18, 2.66). That is more than 1, so it sends back more light than falls on it. The foam's albedo is (0.78, 0.91, 0.86).
- The same gain feeds the light seen through the lip (`sweptWall`, `src/scene/barrel/SweptBarrelMesh.ts` line 241). The clean lip is 99 % this term.
- In linear light the flat water is 2.3 to 3 times brighter than the white pile in green and blue. The tone map squeezes the top, so on screen both read about the same (luma 217 and 217).
- The real ratio goes the other way: sunlit foam is about 1.4 to 3.7 times brighter than clear water over a pale floor (sources below; part inference).
- Two held-frame tests prove it. Gain 4 → 1 alone: foam stands out (pile/flat luminance 0.97 → 1.72). Exposure up alone: foam still about equals the water (238 against 224; luminance 1.13).

## 1. How it was measured

- One held frame (`../step14/hold.mjs`, `--advance=60`, so 90 s). It repeats exactly: a still taken again after all the tests differs by 0 pixels.
- `curl-lip` was rebuilt in the page as step 15 did: `curl-front`'s line of sight at 0.4 of its distance (`jobs/00-setup.js`).
- **Linear light** (before the tone map), two ways that agree to 0.01:
  1. The whole frame with three's `LinearToneMapping` at exposure 0.25, so each pixel stores sRGB(L / 4) (`jobs/01-base.js`).
  2. Debug outputs of `outgoingLight` and each term, written after the tone map (`jobs/02-terms.js`).
- The terms are caught in file-scope variables. The block's own variables are out of scope at the end of `main` (a first try failed on that).
- **Display** = the normal still: `NeutralToneMapping`, exposure 1.05 (`src/main.ts` lines 261–262).
- **Regions** come from mask stills drawn by the shader (which mesh, the foam cover, the sheet's weight, the inner face's weight, N·L), not from fixed boxes (`regions.mjs`).
- **The sky photo is not tone mapped** (`toneMapped: false`, `src/scene/PhotoBackground.ts` line 153). It is drawn as shot. For the cloud, "linear" below is the scene light that the Neutral tone map would need to draw that colour (its inverse).
- In this pool, the barrel mesh draws nearly all the water you see (the flat water in front, the back wall, the lip). The sea's mesh draws the white pile on the right.

## 2. The six regions

Linear (r, g, b) is light before the exposure and the tone map. Display is the 8-bit value on screen. Luma is Rec. 709 on the display values.

### Midday (sun high, behind the wave: N·L on the lip's face 0.16)

| Region | View | Pixels | Linear | Display | Luma |
|---|---|---|---|---|---|
| Cloud (brightest 5 % of the sky) | both | 18 432 | ≈ 0.71, 0.73, 0.83 (tone-map equivalent) | 216, 220, 233 | 220 |
| Sunlit white pile (sea foam, cover > 0.9, N·L 0.6) | lip | 19 708 | 0.62, 0.73, 0.74 | 203, 220, 222 | 217 |
| | front | 21 788 | 0.66, 0.77, 0.78 | 210, 225, 227 | 222 |
| Sea foam turned from the sun (N·L 0.43; the only shaded foam in view) | front | 328 | 0.60, 0.71, 0.72 | 202, 217, 219 | 214 |
| The lip's white tip (fray, 3 cm sheet) | lip | 9 548 | 0.53, 0.75, 0.86 | 183, 209, 221 | 204 |
| Clean lip, outer face (sheet 0.20 m, cover 0) | lip | 25 719 | 0.26, 1.38, 1.97 | 127, 217, 249 | 200 |
| Flat pool water in front (depth 1.1–1.4 m) | lip | 89 558 | 0.71, 1.83, 2.34 | 166, 229, 251 | 217 |
| | front | 161 992 | 0.84, 2.06, 2.50 | 178, 235, 252 | 224 |
| Back wall inside the tube (depth 1.7–1.8 m) | lip | 120 685 | 0.33, 1.32, 1.84 | 124, 211, 244 | 195 |
| | front | 12 906 | 0.26, 1.13, 1.61 | 111, 205, 241 | 188 |

### Sunset (sun low, to the side: N·L on the pile 0.09–0.11)

| Region | View | Linear | Display | Luma |
|---|---|---|---|---|
| Cloud | both | ≈ 0.64, 0.68, 0.68 | 208, 214, 214 | 213 |
| White pile = foam turned from the sun | lip | 0.66, 0.55, 0.52 | 208, 191, 188 | 194 |
| | front | 0.77, 0.59, 0.54 | 223, 198, 190 | 203 |
| The lip's white tip | lip | 1.15, 0.94, 0.84 | 241, 219, 206 | 223 |
| Clean lip | lip | 0.25, 1.06, 1.63 | 124, 209, 249 | 194 |
| Flat pool water | lip | 0.32, 0.99, 1.47 | 135, 210, 248 | 197 |
| | front | 0.52, 1.12, 1.55 | 161, 218, 249 | 208 |
| Back wall | lip | 0.33, 1.23, 1.77 | 133, 214, 248 | 199 |

**What the tables say.** Foam's light (0.6–0.8) is about the cloud's. The water's light (1.5–2.5 in green and blue) is two to three times the foam's. At sunset the water is still as bright as the foam, or brighter.

## 3. The terms

Terms at `curl-lip`, midday, linear (r, g, b). "Sun" = direct diffuse, "sky" = indirect diffuse, "spec" = sun and sky mirrored, "emit" = the shader's own added light.

### The clean lip (outer face)

| Term | Value | Share of green |
|---|---|---|
| **Back wall seen through the sheet** (`sweptReach · (1 − sky share) · sweptWall / π`) | **0.25, 1.37, 1.95** | **99 %** |
| Sky seen through the sheet (sky share 0 from in front) | 0, 0, 0 | 0 |
| Light through the sheet from a sun behind (crest scatter) | 0, 0, 0 | 0 |
| Sun through the far face | 0, 0, 0 (sunset 0.02, 0.01, 0) | 0 |
| The fray's light (none at 0.20 m) | 0, 0, 0 | 0 |
| Its own body colour (albedo 0.01, 0.02, 0.03), lit | ≈ 0.00, 0.00, 0.01 | < 1 % |
| Specular (Fresnel 0.035 at 51°, Rich mirrors half) | 0.01, 0.01, 0.01 | 1 % |

- **The largest term is the back wall's light through the sheet.** The wall's light behind it (`sweptWall`) is (0.94, 4.80, 6.79). That is the gain (4) × the wall's body reflectance × the light on the wall. So the lip is as bright as the wall it shows, and the gain makes both too bright.

### The flat pool water in front

| Term | Value |
|---|---|
| Albedo = body × gain 4 | 0.74, 2.18, 2.66 (body 0.18, 0.55, 0.66) |
| Sun (N·L 0.63, sun 2.55, 2.58, 2.36) | 0.37, 1.09, 1.20 |
| Sky | 0.19, 0.63, 1.04 |
| Specular | 0.15, 0.15, 0.16 |
| Emit | 0 |

- **What makes the pool water so bright:** the floor (albedo 0.6, 0.66, 0.68, `src/scene/waterOptics.ts` line 62) shows almost unchanged through 1–1.5 m of clear water. So the body reflectance is 0.55–0.66 in green and blue. That part is right (Maritorena, Morel and Gentili 1994, the model the code follows). Then the gain 4 makes it 2.2–2.7. The sun and the sky then light an albedo above 1.
- Sky reflection is small here (0.15). At the `curl-front` view (77° from the normal) real Fresnel is 0.25. Rich mirrors only half the sky (`RICH_WATER.reflection = 0.5`). This is a second, smaller departure; not tested.

### The foam (the white pile)

| Term | Value |
|---|---|
| Albedo (`waterFoamColor` #d8f2e9 = 0.69, 0.89, 0.81, partly the band's flat 0.89) | 0.78, 0.91, 0.86 |
| Sun (N·L 0.60) | 0.39, 0.46, 0.40 |
| Sky | 0.14, 0.17, 0.20 |
| Specular | 0.13, 0.14, 0.18 |
| Emit (the band's wrapped sun) | 0.11, 0.12, 0.11 |
| Total | 0.64, 0.76, 0.77 |

- The foam's sun and sky terms are complete. No sky light is missing.
- Its albedo, 0.78–0.91, is **higher** than real fresh foam (0.4–0.6, sources below). So the foam is not too dim.
- The foam colour is mint (green over red by 0.2). Real fresh foam is flat across the visible (Whitlock et al. 1982, as cited by Dierssen 2019). A side note only.

### The tone map and the exposure

- `NeutralToneMapping` (Khronos PBR Neutral), exposure 1.05. It is linear up to 0.72 of scene light; above that it compresses toward 1 and desaturates.
- The foam (peak 0.77) sits at the start of the shoulder → 222 on screen.
- The water (peak 2.34) sits high on the shoulder → 251. Everything above about 1.5 maps to more than 0.94 of the range.
- So the tone map **hides** the overshoot. A 3× ratio in linear light shows as 1.13× on screen (blue). It does not cause it: with a linear tone map the water would still be brighter than the foam.
- Scene light: `REFERENCE_LIGHT = 3.2` (`src/scene/PhotoSky.ts` line 65). A white card lying flat at midday would read about 0.93 of scene light. The foam (0.6–0.8) and the cloud (≈ 0.7–0.8) fit that. The water (up to 2.5) does not.

## 4. Real ratios

| Quantity | Value | Measured or inferred | Source |
|---|---|---|---|
| Fresh dense foam, visible reflectance | ≈ 0.50 (Stage A, many layers); whitecaps on average ≈ 0.40; thin foam ≈ 0.18 | measured | Dierssen 2019 |
| Earlier foam values | flat in the visible, up to 0.60 (Whitlock et al. 1982); 0.20–0.55 at breaking, 0.03–0.10 after 10 s (Koepke 1984) | measured, as cited by Dierssen 2019 | Dierssen 2019 |
| Foam spectrum | falls in the near infrared, not in the visible | measured (abstract) | Frouin et al. 1996 |
| Coral sand floor | 0.28 (400 nm), 0.39 (500 nm), 0.46 (550 nm), 0.56 (650 nm) | measured | Maritorena et al. 1994, Fig. 6 (OSOAA data file) |
| Above-water from below-water reflectance | Rrs ≈ 0.5 rrs / (1 − 1.5 rrs), rrs = R / Q, Q ≈ π to 5 | published relation (seen in a search excerpt; the PDF did not read as text) | Lee et al. 1999 |
| Fresnel, air to water | 0.021 at normal | published | Mobley, Ocean Optics Web Book |
| Fresnel at the views | 0.035 at 51° (`curl-lip` lip), 0.060 at 60°, 0.25 at 77° (`curl-front` flat water) | computed from Fresnel's equations, n = 1.333 | — |
| Sea-surface sky reflectance factor (overcast, 40° view) | ≈ 0.028 | published (abstract) | Mobley 1999 |
| Clear pool water over a 0.6–0.68 floor, 1–1.5 m, seen from above | equivalent albedo π·Rrs ≈ (0.06–0.10, 0.18–0.33, 0.23–0.42); luminance 0.16–0.29 | **inference**: the game's own body values (0.18, 0.55, 0.66) through Lee et al.'s relation | — |
| Physical value of the body gain | 0.33–0.70 (the above ÷ the body); 1 is the reflectance just under the surface | **inference** | — |
| Foam : clear pool water, luminance, both sunlit | ≈ 1.4 to 3.7 (0.4–0.6 against 0.16–0.29) | **inference** from the rows above | — |
| Sunlit cumulus vs sunlit foam | about equal (both thick white scatterers under the same sun) | **inference**, not sourced | — |

**The game today:** foam : water luminance (linear, from the display) is 0.97 (`curl-lip`) and 0.96 (`curl-front`). It is upside down by a factor of about 1.5 to 4.

## 5. Where the game departs

1. **Water too bright: the body gain.** Rich 4 (`richWaterGlsl.ts` line 148), Classic 3 (`WATER_BODY_GAIN`, `waterOptics.ts` line 126). The comment there says "Physically it is 1 … tuned for brighter, painted water". It is used in:
   - the water's albedo: `richWaterGlsl.ts` line 114 (`waterUnder`), `waterOptics.ts` line 260 (the barrel mesh's foam line), `rollerGlsl.ts` lines 163–166, `richLip.ts` line 365;
   - the light seen through the lip: `SweptBarrelMesh.ts` line 241 (`sweptWall`);
   - set per look in `WaterSurface.ts` line 808, `FarFieldOcean.ts` line 284, `LipSheetMesh.ts` lines 180 and 241, `SpraySheetMesh.ts` lines 251 and 322.
   With the pool's pale floor, gain 4 gives an albedo above 1.
2. **Foam too dim: no.** Its albedo is above the real value. Its sun and sky terms are complete. Its light equals the cloud's.
3. **The tone map:** it squeezes the top and hides the overshoot. It is not the cause.

### Proof (held frame, patched in the page, `jobs/03-tests.js`)

The gain was scaled in the program text, on both the barrel mesh and the sea's mesh (the uniform is reset on every shot by `setWaterLook`).

| Test (`curl-lip`, midday) | Pile | Flat water | Clean lip | Back wall | Pile/flat luminance |
|---|---|---|---|---|---|
| Today | 203, 220, 222 (217) | 166, 229, 251 (217) | 127, 217, 249 (200) | 124, 211, 244 (195) | 0.97 |
| **Test 1: gain 4 → 1, nothing else** | 203, 220, 222 (217) | 109, 180, 202 (166) | 51, 154, 184 (134) | 57, 147, 175 (130) | **1.72** |
| **Test 2: exposure 1.05 → 1.6, nothing else** | 224, 242, 244 (238) | 182, 234, 253 (224) | 151, 223, 252 (210) | 146, 220, 250 (206) | 1.13 |

- Test 1 changes only the water. The foam does not move, and it now stands out.
- Test 2 lifts everything. The foam still equals the water. So the exposure and the tone map are not the cause.

## 6. Two proposals

Both are shown in the same stills: `crop-lip-midday-3-rows.jpg`, `crop-front-midday-3-rows.jpg`, `crop-lip-sunset-3-rows.jpg`. Rows, top to bottom: **today / proposal 1 / proposal 2**. `still-p2-lip-midday.jpg` is proposal 2's whole frame.

### Proposal 1: Rich body gain 4 → 1

- **Physical cause.** A gain on a reflectance must not make it more than 1. Water over a pale floor sends back at most the floor's light, dimmed by the water and by leaving through the surface (Maritorena et al. 1994; Lee et al. 1999). Gain 1 is the reflectance just below the surface, still above the physical 0.33–0.70 (inference), so it is the careful step.
- **Expected display** (measured on the held frame):

| | Cloud | Pile | Lip's white tip | Clean lip | Flat water | Back wall | Pile/flat lum. |
|---|---|---|---|---|---|---|---|
| `curl-lip` midday | 216, 220, 233 | 203, 220, 222 | 185, 199, 206 | 51, 154, 184 | 109, 180, 202 | 57, 147, 175 | 1.72 |
| `curl-front` midday | same | 210, 225, 227 | 186, 200, 207 | 51, 153, 183 | 131, 196, 215 | 44, 136, 163 | 1.49 |
| `curl-lip` sunset | 208, 214, 214 | 208, 191, 188 | 244, 208, 186 | 62, 138, 169 | 62, 131, 162 | 59, 142, 172 | — |

- **Look.** The pool turns a deeper turquoise. The lip's white roll and the pile now read white against it. The foam is still a light grey-white (luma 217), not a bright white.
- **Reach: all water at every spot** (sea, far ocean, lip sheet, spray sheet, the barrel mesh and its lip). A change to the barrel mesh alone leaves a seam: the sea's water right of the tube stays bright (`seam-tube-only-front-midday.jpg`). So it **needs an A/B switch and the owner's ride**, and stills at the other spots (not measured here). Classic's gain (3) is the same question.

### Proposal 2: proposal 1 plus exposure 1.05 → 1.6

- **Physical cause.** A camera sets its exposure for the scene. The exposure 1.05 was tuned for the over-bright water. With the water right, the frame can take more light, and the foam then reaches the white it has in photos. The sky photo is not tone mapped, so it does not change.
- **Expected display:**

| | Cloud | Pile | Lip's white tip | Clean lip | Flat water | Back wall | Pile/flat lum. |
|---|---|---|---|---|---|---|---|
| `curl-lip` midday | 216, 220, 233 | 224, 242, 244 | 216, 231, 239 | 74, 185, 220 | 133, 210, 235 | 77, 176, 208 | 1.50 |
| `curl-front` midday | same | 227, 243, 245 | 217, 232, 239 | 74, 184, 219 | 154, 222, 242 | 63, 165, 197 | 1.33 |
| `curl-lip` sunset | 208, 214, 214 | 238, 220, 217 | 250, 217, 197 | 86, 169, 205 | 87, 163, 198 | 82, 172, 206 | — |

- **Look.** The water is close to today's light turquoise, but the foam is now the brightest thing in the water (luma 238–240, above the cloud's 220). This is closest to the owner's photo.
- Gain 0.75 with exposure 2.0 gives nearly the same picture (pile 242, flat 194, lip 161). The gain sets foam against water; the exposure sets the whole frame.
- **Reach: the whole frame**, except the sky photo and the sun disc: riders, boards, sand, the pool's walls all get 1.5× more light. **Needs an A/B switch and the owner's ride**, and checks of the rider and the beach at every spot (not measured). With the glow on, AgX has its own exposure (not measured).

**Neither can go under `lipLook=fray` alone.** The departure is in the water, and the barrel mesh draws most of the pool's water.

## 7. Not measured, or unsure

- Other spots, Classic, dawn, `curl-inside`, the rider, the sand. The proposals' reach is all of these.
- The glow path (AgX grade). It is off by default and was off here.
- The physical gain (0.33–0.70) and the foam : water ratio (1.4–3.7) are my inference. The above/below relation was read from a search excerpt of Lee et al. 1999, not from the full text. Frouin et al. 1996 and Mobley 1999 were read as abstracts only.
- The cloud's "linear" is the inverse of the Neutral tone map (desaturation left out). The cloud : foam ratio has no source.
- Sea foam truly turned from the sun at midday: only 328 pixels in view (N·L 0.43). At sunset the whole pile is turned from the sun (N·L 0.1) and is used for that row.
- The sky reflection at grazing views (Rich mirrors half the sky) was not tested.
- The test stills patch the program in the page, not the source. Fps was not measured (the change is a constant, so no cost is expected).

## Sources

- Dierssen, H. M. (2019). Hyperspectral measurements, parameterizations, and atmospheric correction of whitecaps and foam from visible to shortwave infrared for ocean color remote sensing. *Frontiers in Earth Science* 7:14. https://www.frontiersin.org/articles/10.3389/feart.2019.00014 (opened; also the source for Whitlock et al. 1982 and Koepke 1984 values).
- Frouin, R., Schwindling, M., Deschamps, P.-Y. (1996). Spectral reflectance of sea foam in the visible and near-infrared: in situ measurements and remote sensing implications. *J. Geophys. Res.* 101(C6), 14361–14371. https://doi.org/10.1029/96JC00629 (abstract only).
- Maritorena, S., Morel, A., Gentili, B. (1994). Diffuse reflectance of oceanic shallow waters: influence of water depth and bottom albedo. *Limnology and Oceanography* 39(7), 1689–1703. https://doi.org/10.4319/lo.1994.39.7.1689. Coral sand values from their Fig. 6, as listed in the OSOAA data file: https://frouingroup.ucsd.edu/RT_demo/OSOAA/OSOAA_V2.0/fic/info_OSOAA_SEA_BOTTOM_REFLECTANCES.txt (opened).
- Lee, Z., Carder, K. L., Mobley, C. D., Steward, R. G., Patch, J. S. (1999). Hyperspectral remote sensing for shallow waters: 2. Deriving bottom depths and water properties by optimization. *Applied Optics* 38(18), 3831–3843. https://doi.org/10.1364/AO.38.003831 (relation seen in a search excerpt; the PDF did not read as text).
- Mobley, C. D. (2021). Fresnel's equations. *Ocean Optics Web Book*. https://www.oceanopticsbook.info/view/surfaces/level-2/fresnels-equations (opened).
- Mobley, C. D. (1999). Estimation of the remote-sensing reflectance from above-surface measurements. *Applied Optics* 38(36), 7442–7455. https://doi.org/10.1364/AO.38.007442 (abstract only).

## Files

- `jobs/00-setup.js` (helpers, `curl-lip`, the renderer), `jobs/01-base.js` (display and linear stills), `jobs/02-terms.js` (masks and every term, caught in file-scope variables), `jobs/03-tests.js` (gain and exposure tests). Run with `../step14/hold.mjs hold --serve=$PWD --port=5199 --out=<dir> --jobs=<dir> --advance=60 --spot=<ride address>`.
- `regions.mjs`: the six regions, their display, linear and terms (`node regions.mjs <out> lip-midday [variant-prefix]`).
- `fieldpng.mjs`: a false-colour picture of the mask fields, and a PNG writer. `rows.mjs`: stacks crops into one PNG (then `sips` makes the JPEG).
- Stills: `crop-lip-midday-3-rows.jpg`, `crop-front-midday-3-rows.jpg`, `crop-lip-sunset-3-rows.jpg` (today / proposal 1 / proposal 2), `still-p2-lip-midday.jpg`, `seam-tube-only-front-midday.jpg` (gain 1 on the barrel mesh only: a seam).
