# P3b Storm Mode, Plunging Lip and Rideability: Design Record

> Built test-first on `feat/wave-formation-p1-sea-state` after P3a. This record documents the design, the sources and measurements that changed it, and the verification.

**Goal:** Finish P3 (plan §1.2, §1.8–1.9, Q12, Q13, Q22, Q23).
- Derive the swell from a storm.
- Source the wind's effect on breaking.
- Throw a mass-conserving lip from plunging breakers in the physical mode.
- Report per-spot rideability.

## What shipped

- **`src/wave/StormSwell.ts`: `stormSwell({ windSpeed, fetchKm, durationHours, distanceKm })`.**
  - **Growth:** fetch-limited JONSWAP in U₁₀, g Hs/U² = 1.6e-3 X^½ and g Tp/U = 0.2857 X^⅓ with X = gF/U². It is capped by a fully developed Pierson–Moskowitz sea (0.22 U²/g, g Tp/U = 7.35).
  - **Duration:** converted to an equivalent fetch with CEM II-2-35, g t/U₁₀ = 77.23 X^0.67.
  - **Dispersion window:** the frequencies arriving together span Δω/ω = (F + c_g D)/R.
  - **Angular window:** the directions span F/R (a round storm).
  - **Hs at the spot:** falls by the share of the storm spectrum inside both windows, because spectral density is conserved along rays.
  - **Reported:** growth regime, storm Hs and Tp, delivered Hs, Tp, s and bandwidth, and travel time R/c_g.
- **`SeaState.fromSpectrum`** takes an optional `bandwidth`: a Gaussian window exp(−(ω/ω_p − 1)²/2w²) on the JONSWAP shape.
- **Wave Lab storm mode:**
  - A **Swell source** select (Buoy or Storm). Storm mode shows wind, fetch, duration and distance sliders with a live derived line.
  - A STORM readout row, and the SPREAD row shows the band.
  - The tank takes at most Hs 3 m and Tp 18 s (the buoy slider limits), and the readout says when a storm delivers more.
- **`windOnsetScale(windSpeed, breakerDepth)`:** with u = U/√(g h_b), the thresholds scale by 1 − 0.10u onshore and 1 + 0.05|u| offshore, clamped to 0.6–1.1. It replaces P3a's placeholder ±0.015 U. The WIND row shows the factor.
- **`src/wave/PlungingLip.ts`:**
  - **`lipThrow`:** a lip only for 0.4 ≤ ξ_b ≤ 2.0.
    - **Volume:** the overturn area A/H² from Feddersen et al. 2023 (0.2 at U/C = 0.75, 0.4 offshore) times H² times the crest length.
    - **Tube shape:** W/L goes from almond (1:3) at ξ = 0.4 to round at ξ = 2.0, tilted −0.18 per unit U/C.
    - **Launch:** level, at the speed (L/W)·√(gH/2) that lands the lip one tube length ahead.
  - **`PlungingLip`:**
    - At launch, a throw takes up to a fifth of the water from the crest cell and its across-shore neighbours, keeping their velocity. It becomes four ballistic parcels with speeds 0.8–1.2 of nominal and mean 1.
    - On landing, each parcel returns its volume and horizontal momentum to the cell it hits.
- **`SurfZoneSimulation` throws lips at breaking onsets.**
  - The crest is the highest surface up to four cells seaward of the outer break. There, H_b = γh, and ξ uses the local bed gradient.
  - A column throws at most once per 0.7 Tp, and only where the still depth is at least 0.4 h_b.
  - The simulation counts `lipLaunches` and `lipVolume`.
- **`src/scene/LipPoints.ts`** draws the airborne parcels as points. `PhysicalMode` owns it, and the readout gains a LIP row.
- **`src/wave/Rideability.ts`:**
  - **`rideability(samples)`:** shares of close-outs, mixed peaks, and cumulative makeable waves per Hutt level, a 10° histogram and the median angle.
  - **`measureRideability(config, { periods })`:** samples the peel once per peak period.
  - The skill thresholds (`PEEL_SKILL_MINIMUM`) and the mixed-peak fit (`MIXED_PEAK_FIT`) are shared with the readout.
- **`scripts/rideability-report.ts`** and **`npm run report:rideability`** (bundled with rolldown into `dist/scripts/`) write [the rideability report](../../research/rideability-report.md).

## Sources and measurements that changed the design

1. **The duration coefficient.**
   - The plan's placeholder was the SPM 1984 form g t/U = 68.8 X^⅔. The research check found that it uses the SPM's adjusted wind U_A, not U₁₀.
   - CEM II-2-35 (g t/U₁₀ = 77.23 X^0.67) is in U₁₀; its worked example II-2-9 reproduces.
   - The CEM's u\*-based chain (II-2-36 to II-2-38) is internally about 20 % off from II-2-35. It gives a similar Hs but a Tp about 20 % shorter, and a higher fully developed cap.
   - Stage 1 keeps the plan's JONSWAP-in-U₁₀ with the PM cap and uses II-2-35 only for the duration.
2. **Sandwell's "17 s needs 27 m/s" is a c = U rule.** The PM peak sits 17 % above the period where the crest speed equals the wind speed. So 17 s peaks need about 23 m/s, and 27 m/s gives Tp 20 s, as the plan's consistency check expects. The test brackets 17 s between 20 and 27 m/s.
3. **Wind on breaking is asymmetric and scales with U/√(g h_b).**
   - Lab studies (Douglass 1990; King & Baker 1996; reviewed by Zdyrski & Feddersen 2022) find:
     - onshore wind lowers H_b/h_b by up to ~40 % at U/√(gh) ≈ 4;
     - offshore wind raises it by up to ~10 %.
   - The review's summary sentence states the signs the wrong way round. The reading used here matches the other sources.
   - Douglass 1990 itself is paywalled, and Sous et al. 2021's formula could not be verified.
4. **The lip fed back on itself.**
   - The first integration threw 2,611 lips in 20 s on a 40-column Point. Each throw lowered the crest, which re-flagged breaking, and the new flag counted as another onset.
   - One throw per column per 0.7 Tp broke the loop. The same run now throws 40, one per column for the one set wave.
5. **Swash bores counted as onsets.** On the 6 s Beach (spilling, ξ ≈ 0.05–0.18 at the break), 18 throws came from bores reaching the shoreline at h ≈ 0.25 m after a lull. There, H_b = γh made ξ ≈ 0.9. The 0.4 h_b depth floor removes them; such lips would carry almost no water, since volume ∝ H².
6. **The Reef breaks inside the tank's boundary blend.**
   - The shelf edge (10 m → 2 m) spans about z −290 to −210 at the apex, inside the relaxation and blend band (−270 to −190), with coarse cells.
   - The breaking flag first fires on the bore crossing the flat shelf, where ξ = 0, so the Reef throws no lip.
   - This needs a layout fix (moving the reef shoreward of `TANK.fineFrom`), recorded in the roadmap and offered as a follow-up task.
   - The lip test uses the Point at Tp 14 s instead (ξ ≈ 0.45–0.9 at its breaks).

7. **The current spots mostly close out: the stage 1 physics gives real outcomes, not scripted peels.**
   - [The report](../../research/rideability-report.md) at the Wave Lab defaults (Hs 1.4 m, Tp 10 s, 10°, s 12; 3 seeds × 20 periods):

     | Spot | Close-out | Mixed | Pro-makeable | Median α |
     |---|---:|---:|---:|---:|
     | Beach | 35 % | 63 % | 2 % | 11° |
     | Point | 57 % | 42 % | 2 % | 14° |
     | Reef | 57 % | 37 % | 7 % | 11° |
     | Canyon | 21 % | 70 % | 9 % | 15° |

   - A clean 30° groundswell (s 24; 2 seeds × 12 periods) does not help the Point: 63 % close-outs, 0 % makeable, median 12°. The Canyon rises to 18 % pro-makeable.
   - **Cause:** the Point's contours are straight at 31°. Refraction turns the crests parallel to the contours before they break, so each crest breaks along its whole length at once. Peel needs isobaths whose angle to the crest persists through refraction: curved contours, or depth changing along the crest (Walker 1974; Hutt et al. 2001). The Canyon, the one spot with along-shore depth gradients, does best.
   - The high "mixed" shares come from the short-crested default sea (s 12) putting several peaks in the 160 m window at once.
   - **Consequence:** shaping the spots to peel (a curved point, a reef with an along-shore depth gradient) is spot design work for the user to decide on (plan Q16 and Q29). It is not a stage 1 physics defect.

## Verification

- **Tests:**
  - **`StormSwell.test.ts` (5 tests):**
    - fetch-limited JONSWAP values (Tp 7.1 s at 15 m/s over 100 km, as the plan predicts);
    - the PM cap and its constant;
    - duration limiting;
    - the Sandwell bracket;
    - farther storms deliver lower Hs, higher s and a narrower band, arriving after R/c_g.
  - **`SeaState.test.ts`:** a bandwidth narrows the sampled frequencies, and Infinity leaves them unchanged.
  - **`PlungingLip.test.ts` (7 tests):**
    - in a closed basin, grid plus airborne volume is conserved to 1e-12 relative through launch, flight and landing;
    - the source cap is a fifth of the local water;
    - the lip lands ahead of the crest and hands over exactly V·v of momentum;
    - the parcel pool is bounded;
    - no throw below ξ 0.4 or above 2.0;
    - the Feddersen overturn areas;
    - the tube ratios and the launch-speed law.
  - **`SurfZoneSimulation.test.ts`:**
    - plunging Point waves throw lips (no more than one per column per wave), and they land;
    - the spilling 6 s Beach breaks but throws none;
    - the wind factor matches the sourced law.
  - **`PhysicalMode.test.ts`:** buoy versus storm inputs, the tank limits, a storm-built sea with its STORM, SWELL and SPREAD rows, lip points in the scene that follow the parcels, and the LIP row.
  - **`Rideability.test.ts`:** the aggregator shares, histogram and median, and one sample per period from a running surf zone.
- **Report:** `npm run report:rideability -- --seeds 3 --periods 20` ran all four spots in 6.9 min in Node. The script takes `--spots`, `--hs`, `--tp`, `--direction`, `--spread` and `--out` for probes like the groundswell run above.
- **Suite:** 155 tests in `src`; the build passes.
- **Browser (`?physical`):**
  - Beach storm, 18 m/s over 600 km for 36 h, 4000 km away. Readout: "STORM Hs 7.1 m · Tp 13.5 s · fetch-limited · arrives after 4.4 days", "SWELL Hs 1.4 m · Tp 13.5 s", "SPREAD s 75 · band ±14 %".
  - Point at Tp 14 s: "BREAKER ξ 0.51 · PLUNGING" and "LIP 267 throws · 196.3 m³ · 2.2 m³ airborne" after about a minute.
  - No console errors.
  - The parcels could not be caught on screen: the Browser pane was hidden, and a lip is airborne for about half a second.

## Deferred

- **Ride-time distributions** (plan §4 item 11) need the P4 rider in the physical mode.
- **The Reef layout fix** (point 6 above).
- **Shaping the spots to peel** (point 7): a user decision on the spot designs.
- **Lip impact foam and the splash-up rendering** go to G4. So does the parcel-to-foam source (plan §1.12).
- **Swell dissipation over distance** (e.g., Ardhuin et al. 2009) is left out of storm mode.
