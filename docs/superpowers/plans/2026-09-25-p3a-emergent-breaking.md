# P3a Emergent Breaking: Design Record

> Built test-first on `feat/wave-formation-p1-sea-state` after G2. This record documents the design, the measurements that changed it, and the verification.

**Goal:** Let the physical waves break by themselves (plan §1.8–1.9, Q5, Q13, Q23, Q27): a breaking indicator, whitewater, breaker type, measured peel angle with close-out explanations, and local wind.

## What shipped

- **`src/wave/Breaking.ts`**
  - **`BreakingModel`:** per-cell strength B ∈ [0, 1] with a breaking age that bores carry by inheriting it from breaking neighbours.
    - **Kennedy et al. (2000) test:** onset threshold = onset fraction of √(gh), set per spot (0.35 on the barred Beach, 0.65 elsewhere); it ramps to 0.15 √(gh) over T* = 5√(h/g).
    - **Stage 1 bore criterion:** a rising front that is steep (slope 0.10 → 0.25) and depth-limited (η/h 0.15 → 0.30).
    - B is the larger of the two.
  - **`breakerDepthFor`:** h_b = (Hs·D^¼/γ)^⅘, where Green's-law shoaling reaches H = γh.
  - **`PeelTracker`:** fits breaking-onset time against x. The break point moves at V = 1/|dt/dx|, and sin α = c_b/V (Walker 1974; Hutt, Black & Mead 2001).
  - **`skillForPeel`:** the Hutt ladder (60° beginner, 40° intermediate, 29° advanced, 27° professional, below that a close-out).
- **`SurfZoneSimulation`:**
  - Steps the breaking model after every solver step.
  - Marks a peel onset when a column's most offshore breaking cell jumps seaward by more than 5 m; the first pass after the spin-up only arms this.
  - Break point: scans the simulated tank bed from the relaxation zone inward, so a reef apex inside the blend band counts.
  - Iribarren number: taken at the break point, using H_b = γ h_b.
  - Breaking share: the fraction of wet surf-zone cells with B > 0.3.
  - Render foam: the larger of the slope tint and 2.5 B.
- **`PhysicalSurfaceSource`:** per-node whitewater memory (0.9 of peak, fading over 4 s). G4 will replace this with advected foam.
- **Wave Lab:** a **Local wind** slider (−12 to +12 m/s). It sets the chop (`chopForWind`) and scales both breaking thresholds (`windOnsetScale`, ±20 %). The readout gains BREAKER, BREAKING, PEEL and WIND.

## Measurements that changed the design

1. **Kennedy alone is resolution dependent in stage 1.** The shallow-water solver smears a bore over 2–3 cells, so the peak rise rate on the reef was 0.33 √(gh) with 2 m cells and 0.70 √(gh) with 1 m cells, against a 0.65 onset. Kennedy remains the stage 2 criterion as Q27 decided. Stage 1 adds the bore criterion so the flag fires on bores.
2. **The bore criterion needs its depth condition.** Offshore fronts on the Beach steepen to slope 0.21 in 5 m of water (the solver has no dispersion), so slope alone would flag them. With η/h ≥ 0.15–0.30 added, at 1 m cells it fires on Reef, Beach and Point (breaking on 273, 404 and 600 of 600 frames) with **zero offshore false positives**.
3. **The surf zone needs cells of 1 m or finer.** At 2 m cells neither criterion detects bores on the Beach or Reef, so the 1.5 m along-shore phone-tier fallback considered in P2b cannot be used for the surf zone.
4. **Peel onset must come from the outer break.** With several bores in the surf zone at once, up to 160 of 160 columns were breaking continuously, and column-level onsets starved the tracker. Onsets now come from seaward jumps of each column's outermost break.
5. **Peel values are physically plausible but mostly close-outs** for the current spots and a 10–25° swell: 1–16°, with some waves at 30° ("advanced"). Refraction bends crests toward the contours before they break. Per-spot rideability statistics (P3b) will quantify and tune this.

## Verification

- `Breaking.test.ts` (8 tests):
  - quiet over a lake at rest;
  - flags the dam-break bore and keeps it breaking as it travels 6 m or more;
  - offshore wind reduces breaking;
  - the bore criterion needs both steepness and height;
  - the breaker-depth identity holds;
  - peel from a synthetic along-shore onset gives asin(c/V) within 0.5°;
  - a simultaneous break reads as a close-out;
  - the skill ladder is correct.
- `SurfZoneSimulation.test.ts`:
  - the break line sits at the shoaled breaker depth;
  - Point waves break, get a peel measurement and paint whitewater;
  - peel keeps being measured with bores in the surf zone;
  - the reef break sits on its edge with a non-flat breaker type;
  - no spurious close-out from the spin-up;
  - wind shifts the onset thresholds.
- `PhysicalSurfaceSource.test.ts` checks that whitewater lingers and fades at e^(−t/4). `PhysicalMode.test.ts` checks the chop from wind and the new readout rows.
- Suite: 132 tests; build passes.
- Browser (`?physical`, Reef, Hs 2 m, 25°):
  - readout "BREAKER ξ 0.92 · PLUNGING", "BREAKING 2 %", peel measured, no console errors;
  - whitewater is visible as a pale streak where waves break on the reef flank;
  - the lateral far-field seam (G2 limitation) is visible at the window edge.

## Deferred to P3b

- storm mode;
- the mass-conserving plunging lip (Iribarren-gated) in the physical mode;
- per-spot rideability statistics;
- a cited source for the wind-on-breaking magnitude.
