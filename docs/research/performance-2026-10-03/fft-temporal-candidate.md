# 30 Hz FFT shading candidate

Status: rejected after the matched live trial. Production `FftChop.ts` and its test are restored byte-for-byte to HEAD `5606527dbf15409eb407cbdebd2cf7f05209fdff`; the untracked production temporal helper is removed. The corrected source/test/helper and report script remain in [the candidate archive](fft-temporal-candidate-source/manifest.json), with a complete [candidate patch](fft-temporal-candidate.patch) including the new helper file. The first CPU quality JSON is preserved unchanged.

The archived candidate computes the two 30 Hz sea-time endpoints enclosing each fresh displayed snapshot and composites their slope fields at that snapshot's actual time. An adjacent interval reuses the old right endpoint as the new left. It keeps the original single `output` texture read by water, barrel, far-field and caustic shaders. The composite covers 256² texels rather than adding a second sampler fetch at every shaded water pixel. It changes wind-sea shading only; physics, water heights, fixed solver step, seaTime, waterTime, the 256² spectrum, its 64 m repeating patch, wind and seed remain unchanged.

| Request | Issued render passes |
| --- | ---: |
| Exact same renderer, spectrum and held seaTime | 0 |
| Initial request, changed wind/seed/renderer, skipped interval or backward interval | 35: two original 17-pass FFTs plus a composite |
| Changed time inside the same interval | 1 composite |
| Next interval | 18: one original FFT plus a composite |
| Steady 60 Hz fresh sea-time sequence, excluding startup | 9.5 per fresh time, versus the original 17 |

This schedule issues about 44.1% fewer passes in the steady 60 Hz case. It does not establish a GPU-time or FPS improvement. A sparse sequence that repeatedly skips intervals can instead issue more work. Two additional half-float RGBA endpoint targets use 1 MiB at 256²; the existing half-float output and float work targets keep their formats.

The absolute time brackets support rewinds. Spectrum and renderer identity invalidate endpoint reuse. A failed FFT or composite restores the previous render target and invalidates the partially modified cache. Disabling shading and later returning to the same held time restores the existing sampler without additional work. Dispose releases each target once, including swapped endpoints.

## CPU quality evidence

[Raw quality report](fft-temporal-quality.json) compares ideal temporal interpolation with the retained original `chopSpectrum`, `slopeSpectrum` and `inverseFft2d`. Six wind/seed cases use winds −8, 0 and +8 m/s and seeds 1 and 7. They cover intervals starting at 0, 2.5 and 400 simulated seconds and shares 0, ⅛, ¼, ½, ¾ and ⅞: 108 samples at the full 256² size. All six spectrum hashes match the original.

| Largest observed error over those samples | Value |
| --- | ---: |
| Slope vector RMS | 0.00118254 |
| RMS as a fraction of nominal chop slope | 0.9103% |
| Point slope vector error | 0.00468221 |
| Flat-water normal angle RMS | 0.018083° |
| Flat-water normal angle at any point | 0.070084° |
| Spectrum-weighted harmonic RMS fraction | 0.9091% |

The normal measurements apply the game's actual wind-strength law to a flat unit base normal with full chop fade. They do not bound normals on steep tube geometry. The ideal CPU calculations also exclude GLSL float32 phase/arithmetic and the extra half-float endpoint/composite rounding.

For the highest supported wavenumber, ω ≤ 13.20374 rad/s. Linear interpolation across 1/30 s has travelling-harmonic amplitude error bounded by ω²h²/8 = 2.4214%; its midpoint error is 2.4116%. The report additionally checks the spectrum-weighted instantaneous spatial RMS bound using Parseval and both counter-rotating amplitudes, and a conservative pointwise triangle bound. No sample violates either bound. Relative instantaneous field error can be large near phase cancellation; the harmonic percentage is not a universal pointwise relative error.

Nonlinear caustic intersections, folded ray bundles, brightness peaks, Fresnel response and tube appearance remain unproven. The prepared visual trial was not run after the performance rejection. Existing `src/gpuCheck.ts` diagnostic wording assumes 17 passes per fresh time; it remains accurate for the final original production implementation.

## Provenance and reproduction

The immutable source reference is HEAD `3313de72f3c18e4c0f0fcc7ee40af2cbacba6b5d` before this candidate. Original `FftChop.ts` SHA-256: `6939107ec1ddb046e08b5e0ab2659a7eb15a43cd81e7c174411afb5b149858fd`. The retained oracle is `/private/tmp/fft-temporal-canonical-3313.mjs`, SHA-256 `edc033b6529de80a2662a390010884f668008471e501f819e530df01ced7119e`. The raw JSON fingerprints the current candidate, helper, unchanged math and report script separately; the shared checkout has concurrent unrelated work.

```sh
git apply docs/research/performance-2026-10-03/fft-temporal-candidate.patch
npx vitest run src/scene/FftChop.test.ts src/scene/fftChopMath.test.ts
npx tsc --noEmit
npx rolldown scripts/fft-chop-temporal-report.ts -o /private/tmp/fft-chop-temporal-report.mjs --format esm --platform node
node /private/tmp/fft-chop-temporal-report.mjs --oracle=/private/tmp/fft-temporal-canonical-3313.mjs --out=/private/tmp/fft-temporal-quality.json
```

These reproduction commands require explicitly applying the archived candidate patch first, including its temporal helper. The current production checkout deliberately does not contain that helper. The CPU report script is an experimental artifact rather than an active production command; its retained original oracle also needs to be rebuilt from the named baseline or available at the recorded path. The visual driver requires an explicitly identified candidate preview and immutable directory; it must not silently compare two original-FFT builds.

The 11 focused candidate tests passed, including an interrupted composite and interrupted endpoint FFT, renderer/spectrum changes, held reuse, 60 Hz scheduling, backward/forward jumps, constructor RNG parity, lazy allocation and target disposal. Strict TypeScript checking passed. No browser, GPU, app build or live performance run was performed for the original CPU quality report; the later live trials below were performed by the root profiling task.

## Allocation-only correction after the first frozen trial

The initial frozen candidate on 4203 eagerly constructed two extra render targets and a composite material. Three.js UUID creation consumes `Math.random`; these extra constructor allocations changed the later ordinary menu-selected sea seed from the baseline's 8761 to 3761. The completed candidate run therefore has a different configuration and is an invalid performance comparison, not evidence of a performance regression. That immutable build and its rejected report remain retained.

The corrected candidate creates the additional endpoint targets/material only on first actual FFT rendering. Its constructor retains exactly the original resource allocation sequence: scene/camera, geometry, ping/pong/output targets, the two original materials and mesh. A CPU probe of the retained canonical constructor found 72 random calls with the installed Three.js. The focused regression checks that same 72-call count and verifies no endpoint resources exist after construction, wind setup, disabling or unused disposal. Used targets and composite material are disposed once after endpoint swapping. Unused tiers avoid the extra 1 MiB as well.

Corrected archived `FftChop.ts` SHA-256: `acf29fd2ac320b3f0c654b1ec517eac94e59d2332ea6c4eb6c80c8c1c38845c5`. The first [108-sample JSON](fft-temporal-quality.json) is preserved unchanged with its original eager-candidate source fingerprint `ee233c137b43fec51536a40c262f3b6d59e3d8d28acde3660d904556ca06d682`. This follow-up changes allocation timing only: shaders, pass schedule, temporal helper (`32bb0e809b6f02f85faa8689eec8281b9dd1e119646a41d49be51a064cf4e9c3`) and math (`18dd410ab5a4fb927c0acc268202dd618bc422c3eca826a363e0722ec938e240`) remain unchanged. CPU quality loops were not repeated. The archive manifest fingerprints the corrected test/helper/script and patch independently.

## Passive live trial and rejection

All four reports are copied byte-for-byte from the original trial artifacts. [The compact summary](fft-temporal-fps-summary.json) retains their hashes, source/bundle provenance and configuration checks. Each sample used the ordinary menu route, five-second warmup and 90 passive seconds, High/Rich pixel normals, native browser DPR 2, effective render ratio 1.75, 1708×926 CSS viewport and 2989×1620 canvas. GPU timer queries were disabled. Matched runs used seed 8761, Padang Big, Hs 3.8 m, T 18 s, direction 0°, spreading 150, dx 2 m/fineSpacing 1 m and 64 components; physics worker bytes are identical in all four artifacts.

| Report | Configuration valid | Display FPS | Fresh water / fixed physics Hz | Simulation / wall |
| --- | --- | ---: | ---: | ---: |
| [Initial original](fft-temporal-before-fps.json) | Yes | 60 | 56.98 | 0.950 |
| [Eager candidate 4203](fft-temporal-after-fps.json) | **No: seed 3761** | 60 | 52.71 | 0.878 |
| [Corrected lazy candidate 4204](fft-temporal-lazy-after-fps.json) | Yes | 60 | 57.44 | 0.957 |
| [Return original](fft-temporal-lazy-baseline-return-fps.json) | Yes | 60 | 56.35 | 0.939 |

The two original samples differ by 0.63 fresh Hz. Their mean is 56.665 Hz; the corrected candidate is 0.775 Hz (about 1.37%) higher. This is one candidate sample with baseline variation and no repeated B phase. The initial baseline was nonadjacent to the corrected candidate: the invalid-seed run, allocation repair, checks/build and a separate eight-fixed-step-per-variant GPU kernel probe intervened. That diagnostic was not part of these passive samples and cannot be treated as another matched FPS observation. Thermal/load history and publication tails remain possible explanations.

The measured median worker total remains 16.7 ms in all three valid runs; foam 2.1 ms, aeration 1.6 ms, contact 1.1 ms and median water roughly 5.7–5.9 ms also remain similar. Independent stage quantiles must not be summed. These passive counters do not isolate FFT GPU cost, but they show no substantial worker critical-path reduction. The observed small gain from one sequence does not justify extra targets, cache state and an unvalidated optical approximation. The final decision is to keep the original FFT implementation, retain the rejected candidate for review and leave its visual trial unrun.

Frozen build provenance remains at `/private/tmp/surf-fft-temporal-20261003` (invalid seed trial) and `/private/tmp/surf-fft-temporal-lazy-20261003` (corrected candidate); neither directory was modified during rollback. Baseline artifact SHA-256 is `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3`; invalid candidate `e435580eb3776fd71f67baae8ef509499e6c6a005e592f4b15d09f733201119c`; corrected candidate `a9ba4e8c6ed8a986e5df0705ea3cfbc4b7d3dbd7c94eb3ea6483f8e1aecc010b`. All report artifact entries identify worker `assets/surfZoneWorker-BH6FhcTP.js`, SHA-256 `eb1a337b66c0eea19035241aee1c46a129a039548e21916d428a6a1a50d2d3c5`.
