# G3 Physically Based Water Shading: Design Record

> Built test-first on `claude/charming-sanderson-d9a2c0` (from `feat/wave-formation-p1-sea-state` after P3b and the Reef relocation). The implementation plan this record replaces is in the history of this file (`fa7ab0a`). Test code lives in the files listed.

**Goal:** Shade both water meshes from water optics: Fresnel reflection, per-channel absorption down to the seabed, and sunlight transmitted through thin crests ([plan](../../research/wave-formation-plan.md) §2.3, Q7, Q17).

## Sources (checked 2026-09-25)

- Pure-water absorption at 650, 550 and 450 nm: 0.340, 0.0565 and 0.00922 m⁻¹ (Pope & Fry 1997; plan §2.3).
- Shallow-water reflectance R = R∞ + (A − R∞)·e^{−2KH}, with K the diffuse attenuation: Maritorena, Morel & Gentili 1994, *Limnol. Oceanogr.* 39, 1689–1703.
- R∞ ≈ 0.33 b_b/(a + b_b): Morel & Prieur 1977; Gordon et al. 1975. K ≈ a + b_b per unit path: Gordon 1989.
- Molecular scattering b_m = 0.0076 (400/λ)^4.32 m⁻¹ (Smith & Baker 1981 Table 1, after Morel 1974); backscatter is half of it.
- Particle backscatter fraction 0.0183 (Petzold average phase function, Mobley 1994).
- Particle beam attenuation: about 0.01 m⁻¹ in the open ocean, 0.5 to more than 2.5 m⁻¹ in turbid coastal water (IOCCG beam-c protocol 2019; coastal AVHRR and Antarctic Peninsula studies).

## Design

- **`src/scene/waterOptics.ts`** is the tested reference. The GLSL chunks mirror it, and every uniform comes from its functions (`applyOptics`), so the shader cannot drift from the model.
  - **Fresnel:** three's own physical lighting with `ior = 1.333` (F₀ = 0.020) and no clearcoat, since water has one interface. `schlickFresnel` is the CPU mirror, used for the crest light.
  - **Water per spot:** `SPOT_OPTICS` gives a turbidity (particle scattering b_p, m⁻¹) and a bed albedo. Particles absorb b_p (1 − ω)/ω with an assumed single-scattering albedo ω = 0.95 (mostly scattering mineral sediment; not sourced). The values are beach 2, point 1, canyon 1 and reef 0.15 m⁻¹, inside the sourced coastal range. The reef has the brightest bed (carbonate sand).
  - **Two attenuations:** the beam c = a + b_p is what a direct ray loses (Beer–Lambert, the crest light). The diffuse K = a + b_b lights the bed, because forward-scattered light still reaches it and the eye.
  - **Water body:** `shallowReflectance` is Maritorena's model with 2KH replaced by K along the refracted sun path down and view path up. Each path is at most 1.51× the depth, since refraction bends rays toward the normal.
  - **Crest light:** sunlight crossing a crest from its sunlit back to the face in view. From each fragment the shader marches horizontally toward the sun, sampling the height texture at 0.25, 1, 2.5 and 6 m, and interpolates where the ray leaves the back of the crest (`crestThickness`). A ray that never enters water (flat water, the sunlit back) is opaque. The glow is `CREST_SCATTER` (0.35) × (dot(view, sun))⁴ × (1 − F) × sun radiance × e^{−c·thickness} × (1 − foam).
  - **Readability:** `WATER_BODY_GAIN` = 3 brightens the body reflectance. Physically it is 1, but the scene's lights and fixed exposure were tuned for the old painted water, and at 1 the bed barely showed.
- **Seabed under the tank water:** each render source writes the bed elevation per node (`writeBed`), and `WaterSurface` uploads it to a static R32F texture only when `bedRevision` changes (the legacy grid scrolls; the physical window slides). The per-frame texture stays RG (height, foam). The vertex shader passes the depth (surface − bed) and the foam as varyings.
- **Far field:** the same body reflectance from its tabulated depth. There is no crest light, because the far field has no height texture to march.
- **Wiring:** the physical mode applies `SPOT_OPTICS[spot]` to both meshes. The legacy spots borrow the physical spot they resemble (Training and Custom use Beach, Point uses Point, Reef uses Reef). Both meshes take the scene's sun direction and its colour × intensity.
- **Removed:** the height-based crest tint (`waterBaseColor`, `waterCrestColor`, the source's `waveHeight`, the far field's `waveHeight` option).

## Verification

- **Tests (171 in the suite; the build passes):**
  - **`waterOptics.test.ts` (10 tests):**
    - F₀ = 0.0204, and Schlick is 1 at grazing;
    - 1 m of pure water keeps 71 %, 94.5 % and 99.1 %;
    - diffuse attenuation is under a quarter of the beam in turbid water;
    - deep clear water is blue, at 0.33 b_b/(a + b_b);
    - refracted paths stay within 1.51× the depth;
    - a 1.5 m Beach bar is more than 3× greener than a 12 m channel, and greener than its own sand (red dies first);
    - reflectance falls monotonically with depth;
    - the reef shows its bed more than the beach;
    - `crestThickness` finds a ridge's back face within half a sample step (thin near the top, thicker lower, opaque on flat water and on the sunlit back);
    - the uniforms equal the model's values.
  - **`WaterSurface.test.ts`:**
    - the legacy bed equals −`depthAt` at the nodes and follows the scrolling grid;
    - the physical bed sits 5 cm above tucked-in dry nodes and under every wet one, and follows a window slide;
    - every replaced shader chunk exists in three's physical shader, and the patched shader samples the bed and runs the body and crest code with `ior` 1.333 and no clearcoat.
  - **`FarFieldOcean.test.ts`:** the far field's patch uses its depth and the body code, without the crest march.
  - **`PhysicalMode.test.ts`:** starting the Reef sets the Reef optics on both meshes.
- **Browser (local dev server, pixel colours read back from the rendered frame):**
  - No shader or console errors in either mode.
  - **Bathymetry from above (exit criterion 1, met):**
    - Beach: 1.8 m over the bar reads turquoise (sRGB 94, 154, 141) against teal-blue at 4 m (73, 115, 120).
    - Reef: the 2 m shelf is bright turquoise (104, 201, 192), 5.3 m on the edge cyan-blue (70, 156, 180), and the 10 m channel deep blue (44, 112, 164).
  - **Backlit crests (exit criterion 2, partly met):**
    - Viewed from water level into a low sun, the crest light fires on up to 2 % of the frame while a set's crests pass, adding about +34, +18, +12 (sRGB) to red, green and blue. That is a warm brightening, not a turquoise glow.
    - Stage 1 crests are broad: a 2 m crest on a 70 m wave is still about 10 m wide 10 cm below its top. So only the top few centimetres let sunlight through, and near the break foam covers them.
    - The effect is in place and becomes prominent with the stage 2 solver's peaked crests (P5) and a rendered lip (G4/G6).
  - **Legacy ride (`?demo=ride`):** the face and pocket still read in the chase view. The water is more muted: grey-blue-teal instead of the painted teal, because the Training Beach borrows the turbid beach water over its 4 m bed.
  - **GPU cost (timer queries, 1114 × 1510 px, this Mac):**
    - Physical frames take 2.9–4.2 ms; the budget is 8 ms (§3.1).
    - The tank water mesh is about 2.2 ms of that, and the crest march 0.2–0.5 ms.

## Deviations from the plan text

- **Crest path:** the plan's thickness "along the view ray" almost never leaves a height-field crest's back, because the refracted view ray dives. The shader marches toward the sun instead, which is the path sunlight takes from the back of the crest to the face in view. It still uses 4 lookups.
- **Bed attenuation:** the plan's T = e^{−(a + b_turb)d} is kept for rays through crests. For the bed, the model uses Maritorena's diffuse K. With the beam c the bed disappeared in any turbid water.
- **Readability gain:** the body reflectance is scaled by 3 (plan §2.8).
- **Quality tiers:** there is no tier system yet (Q24). The crest light is the plan's medium-tier feature and stays on everywhere until the quality scaler lands. Screen-space reflection and refraction stay with the WebGPU tier (P6).
- **Not in G3:** the underwater fog stays single-colour (plan §2.7), and the lip parcels are not shaded with transmission (G4/G6).
