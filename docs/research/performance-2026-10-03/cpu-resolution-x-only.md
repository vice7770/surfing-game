# Preliminary along-shore resolution screen

Command: `node /private/tmp/physics-resolution.mjs --seconds 8 --coarse-dz 1 --out /private/tmp/physics-resolution-x-only.json` after bundling `scripts/physics-resolution-report.ts`.

The same warm 40 m Padang Big fixture compares dx 1 m / cross-shore fine spacing 1 m with dx 2 m / cross-shore fine spacing 1 m. Both use seed 1, Hs 3.8 m / Tp 18 s, spreading 150, calm wind, 8 components, no solver settling, and 1/60 s steps. This is a short startup screen; it is not a full-window settled wave or long-term stability gate.

| Measurement | Original 1 × 1 m | Along-shore 2 × 1 m |
| --- | ---: | ---: |
| Physics cells | 29000.000 | 14500.000 |
| Mean CPU water step, ms | 33.580 | 31.408 |
| Whole-grid foam at 8 s, m² | 276.172 | 426.813 |
| Whole-grid air at 8 s, m³ | 0.814 | 19.275 |
| Finite nonnegative water | yes | yes |

The matched near-break surface RMS difference is 0.03631 m against an original-field RMS of 0.80288 m (4.52%). This is similar to the earlier 2 × 1.5 m screen (0.03579 m), rather than a clear improvement in surface agreement. The take-off peak changes from 1.111 to 1.139 m and its sample time from 3.4 to 3.5 s. At 30 m shoreward the peak changes from 1.175 to 1.205 m, both at 6.9 s. Traces sample every 0.1 s.

Keeping cross-shore spacing at 1 m reduces the startup air divergence: 19.275 m³ versus 204.614 m³ for the earlier 2 × 1.5 m grid. It is still about 24 times the original 0.814 m³. Foam area is 54.5% higher. These whole-grid startup differences require settled evidence before declaring particle/source fidelity.

Body contact matches the raw render cubic surface at either 1 m or 2 m render spacing, with 2,125 samples per run and spacing: maximum height error 1.22e-7 m and slope error 2.8e-7. The comparison checks the background surface interpolation, not held-lip geometry.

No grouped breaking wave or joined/thrown front appears within 8 s, so this screen does not establish breaker/barrel arrival or face-height parity. CPU water cost also does not halve with cell count; these runs did not record solver substep counts, and do not isolate the cause. Use the live GPU substep diagnostics for that assessment.

Raw parameters, stage costs, probe traces and contact errors are in `cpu-resolution-x-only.json`. The fine transported fields remain exactly equal to the earlier screen after the shared-advection optimization.
