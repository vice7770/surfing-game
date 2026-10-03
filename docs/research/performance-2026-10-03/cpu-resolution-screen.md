# Preliminary CPU resolution screen

Command: `node /private/tmp/physics-resolution.mjs --seconds 8 --out /private/tmp/physics-resolution.json` after bundling `scripts/physics-resolution-report.ts` with Rolldown.

Both runs use a warm 40 m Padang Big window, seed 1, Hs 3.8 m / Tp 18 s, spreading 150, calm wind, 8 components, and 1/60 s steps. They skip solver settling. Ordinary gameplay uses a wider window and more components. These are short transient results, not a settled surf-height or long-term stability gate.

| Measurement | Fine dx 1 m / dz 1 m | Coarse dx 2 m / dz 1.5 m |
| --- | ---: | ---: |
| Physics cells | 29000.000 | 10880.000 |
| Mean CPU step, ms | 31.515 | 16.024 |
| Whole-grid foam area at 8 s, m² | 276.172 | 464.136 |
| Whole-grid entrained air at 8 s, m³ | 0.814 | 204.614 |
| Finite nonnegative water | yes | yes |

The matched near-break surface RMS difference is 0.0358 m against a fine-field RMS of 0.803 m (4.46%). At the take-off, the peak changes from 1.111 to 1.138 m and its sample time from 3.4 to 3.5 s; 30 m farther shoreward it changes from 1.175 to 1.197 m and from 6.9 to 7.0 s. Both traces sample every 0.1 s, so the measured timing shift is one sample.

Body interpolation agrees with the raw render cubic surface at both 1 m and 2 m render spacing: 2,125 samples per run and spacing, maximum height difference under 1.1e-7 m and slope difference under 3e-7. This verifies the render-spacing constructor wiring. It does not check held-lip contact against the drawn loft.

No grouped breaking wave, joined front or thrown front appears during this 8 s window, so it cannot establish breaker/barrel arrival or face-height parity. Whole-grid foam and especially entrained air differ substantially during startup; a coarser default needs a settled, wider-window comparison and visual inspection. The water and air divergence should not be dismissed as an exact optimization.

Wind onset scaling is independent of grid resolution; the script records its values for offshore −5 m/s, calm and onshore 6 m/s. This run simulates calm wind only.

Raw parameters, stage costs, probe traces and contact errors are in `cpu-resolution-screen.json`. The report script supports longer runs and a `--winds -5,0,6` sweep when no live browser capture is active.
