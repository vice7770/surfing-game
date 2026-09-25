# G2 Far-Field Ocean and Wind Chop: Design Record

> Built test-first on `feat/wave-formation-p1-sea-state` after P2c. This record documents the design and the verification. Test code lives in the files listed.

**Goal:** Show the physical sea out to the horizon, continuous with the simulated tank, and add shading-only wind chop ([plan](../../research/wave-formation-plan.md) §2.2, Q11).

## Design

- **`src/wave/FarFieldProfile.ts`** holds cross-shore WKB tables per component: (phase, amplitude, kz, cap), plus still depth, for the −x and +x sides of the window.
  - **At the tank's offshore boundary** (z = −330 m) the table reproduces the tank's analytic sea exactly, so that seam is continuous by construction.
  - **Offshore** the bed deepens from the tank floor to 60 m over 870 m (Airy dispersion), and amplitudes conserve energy flux, a² c_g cosθ = constant.
  - **Beside the window** it continues each edge column's seabed with the sea's own (shallow-water) dispersion. Local Hs is capped at 0.78 h, and that cap drives a breaking-foam proxy.
  - **Table layout:** two uniform segments (shore → reference, reference → offshore), so the reference line is an exact sample.
- **`src/scene/FarFieldOcean.ts`** is a graded grid (`gridGeometry.ts`) with the tank rectangle left out: 4 m cells across the window, 3 m across the tank's cross-shore span, growing ×1.1 to 40 m, out to ±1.5 km.
  - The vertex shader sums the components from an RGBA float texture. Per-component ωt is reduced mod 2π in double precision on the CPU, so float32 phase stays accurate for any sea time.
  - Gerstner sharpening (Q = 0.6) fades to zero within 60 m of the tank so the two meshes meet. Dry cells tuck under the seabed.
  - The fragment alpha fades from 66 % to 97 % of the extent, into the sky, which now draws first (`renderOrder = −10`, no depth write).
- **`src/scene/waterChop.ts`**: six short deep-water waves (ω = √(gk), k·a ≈ 0.075) perturb the **shading normal only** on both water meshes and fade with distance. `waterChop` defaults to 0.25; P3's local wind will drive it.
- **`SpotSeabed.setDepthOnGrid`** extends the seabed under the side strips (edge-column profiles) and offshore (deepening floor), on graded axes. `SpectatorCamera` now reaches 3 km.

## Verification

- `FarFieldProfile.test.ts` (3 tests):
  - It matches the tank's sea at its boundary on both sides (to 1e-4 m).
  - It follows Green's law beside the tank (within 0.5 %) and keeps the γh cap, with zero amplitude on land.
  - Offshore wavenumber is within 0.5 % of Airy at 60 m, and amplitude conserves energy flux to 0.05 %.
- `FarFieldOcean.test.ts` (3 tests): the graded axes hit the tank edges exactly with coarse spacing ≤ 40 m; no triangle lies inside the tank and all three sides are covered; the texture size and the mod-2π temporal phases are correct.
- `PhysicalMode.test.ts` checks that the far field is added, visible, clocked to sea time and hidden with the mode.
- Suite: 117 tests; build passes.
- Browser (`?physical`, local dev server):
  - No shader or console errors.
  - The overview shows swell lines from the horizon with sun glint and chop, and the tank edges are gone.
  - The profile view shows the side-strip breaking proxy continuing along the coast.

## Deviations from the plan text

- **Chop:** procedural analytic ripples instead of scrolling normal-map textures. There is no texture asset, and the dispersion is correct by construction. The FFT chop remains part of the WebGPU tier (P6).
- **Legacy mode:** the far field exists only in the physical mode, because the legacy wave is not a spectral sea. Legacy water gets the chop.
- **Lateral seams:** beside the window the far field is a straight-contour WKB approximation, so a lateral seam with the tank's full 2D solution can show when bathymetry varies along shore (Point, Canyon). The offshore seam is exact.
