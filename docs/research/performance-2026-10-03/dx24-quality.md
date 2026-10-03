# Uniform dx4 physics rejected: delayed and missing tube events

One controlled GPU quality pair completed successfully on immutable port 4201. **The uniform dx4 default is rejected.** Broad native images remain similar, but dx4 delays the first new material lip launch by 3.5 seconds and produces no drawable tube at the five-second checkpoint. Later tube topology also differs. Small crest-height RMS and fewer cells do not qualify this approximation for a default change. No ordinary FPS run followed the rejection; production/defaults remain unchanged.

The [planning record](dx24-quality-intent.md) describes the fixed inputs. Both grids independently spun up the canonical water solver for 36 seconds to sea time 400, then completed 1,800 exact 1/60 steps to `429.9999999999983`. Start solver time/sea offset were exactly 36/364 in both. All source/build, finite, per-step/cumulative clock, native and contact/request guards passed. GPU fallback and browser failures were absent. Owned Chrome closed cleanly and CDP 9524 had no listener afterward.

Actual worker requests echoed seed 8761, Padang Big Hs 3.8/T 18/spreading 150/64 components, fine spacing 1, dx2 or dx4, `rider=false`, `contact=true`, render spacing 1 and four barrel cases. Contact was added to the actual start request, retaining all original options, rather than to a dropped scene field. Retained timeline samples with active fronts and positive contact timing numbered 26/24. Nonempty checkpoint lofts appeared at 5/15/30 seconds for dx2 and 15/30 seconds for dx4. This establishes the contact/geometry workload, not rider or buoyancy equivalence.

Native High/Rich/High particles, production pixel normals, caustics/spray, numeric 60 cap and independent 1 m mask were guarded. CSS viewport was 1708 × 926, browser DPR 2 and canvas 2989 × 1620 (effective ratio 1.75); native compositor PNGs are 3416 × 1852. The same cloned camera, midday lighting, held rendering and immutable code were used. Every served index/JS/CSS byte matched the directory; both aggregate hashes were `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3`.

| Simulated seconds | Crest-neighborhood height RMS / p95 | Matched peak-height RMS | Matched peak-phase RMS | Unmatched peaks |
| --- | ---: | ---: | ---: | ---: |
| 0, after independent spin-up | 0.0420 / 0.0822 m | 0.0361 m | 0.318 m | 0 |
| 5 | 0.0804 / 0.1683 m | 0.0958 m | 0.366 m | 1 |
| 15 | 0.1005 / 0.2227 m | 0.0690 m | 0.456 m | 0 |
| 30 | 0.1215 / 0.2489 m | 0.0883 m | 0.560 m | 3 |

Initial differences are retained, not subtracted. Peak locations are sampled at 0.5 m intervals. At 30 seconds the common break-band height/slope RMS was 0.1328 m / 0.0410; maxima were 0.5647 m / 0.8042.

The first front appears at 4.0 seconds in both; the first positive thrown-front clock occurs at 4.433/4.500 seconds. **Those differ from the first actual new lip launch: 4.45 seconds for dx2 versus 7.95 for dx4.** At five seconds dx2 has seven front points, 33 loft slices and five cumulative material launches; dx4 has one point, no loft slices and no launch. A single point cannot form the loft's required two-point/nonzero-span front. The empty geometry is not an omitted QA contact option or camera mismatch. The data do not isolate the full coarse-water/front-eligibility/authored-clock/crash-gate causal sequence; they do establish lost/delayed gameplay events.

| Checkpoint | dx2 | dx4 |
| --- | ---: | ---: |
| 5 s: points / loft slices / cumulative launch volume | 7 / 33 / 4.052 m³ | 1 / 0 / 0 m³ |
| 15 s: points / slices / launch volume | 45 / 105 / 82.574 m³ | 18 / 69 / 68.298 m³ |
| 30 s: points / slices / launch volume | 90 / 119 / 423.878 m³ | 45 / 122 / 415.036 m³ |
| 30 s: active column-width proxy | 180 m | 180 m |
| 30 s: unjoined adjacent slice pairs / dropped overlaps | 4 / 0 | 13 / 5 |
| 30 s: helper maximum endpoint weight | 0 | 0.89600003 |

Counts can halve naturally when column width doubles; width and volume are retained separately. Late volume differs by −2.09%, but early event loss remains. `cuts` includes all unjoined adjacent slices, not only overlap removal. Both have zero `overlapsOpen`, clamps and tested reversed orientations. The endpoint indicator is a structural warning, not an independently measured seam gap; every dropped overlap is not necessarily an open-tube hole.

Near-break wet area **16000 → 16800 m² is ROI discretization, not 5% domain-water growth**. The helper includes each entire cell whose center lies within inclusive x bounds `[-90,-10]`, around focus x = −50. Dx2 selects 40 centers from −89 to −11, covering exactly 80 m. Dx4 selects 21 centers from −90 to −10, covering `[-92,-8]`, or 84 m. Both selected z spans sum to 200 m; the same 5% bias exists at t=0 and every checkpoint. At 30 seconds whole-domain wet area is 403597.9716 versus 403635.9716 m², a 38 m²/0.0094% difference.

Raw near-break integrated foam/air/plume/void-area differences remain uncorrected: spatial fields were not retained for exact boundary clipping. At 30 seconds these are +6.38%, −8.50%, −17.32% and +17.52%, over differing ROI support. Whole-domain differences, unaffected by that crop, are foam +4.52%, air volume −8.08%, plume-depth area −5.92% and void-fraction area −2.81%. At five seconds whole-domain air is already −11.81%. Material/whitewater differences extend beyond shading.

The advancing quality windows took 48.095/37.395 wall seconds, including controlled waits, CDP, exports and screenshots, with RAF drawing suppressed between checkpoints. **These durations are not ordinary FPS, isolated solver time or a speed guarantee.** No further hardware run was made.

| Native checkpoint | dx2 | dx4 |
| --- | --- | --- |
| 5 s: missing early tube | [Original PNG](dx24-quality/dx2-5s.png) | [Original PNG](dx24-quality/dx4-5s.png) |
| 30 s: later appearance | [Original PNG](dx24-quality/dx2-30s.png) | [Original PNG](dx24-quality/dx4-30s.png) |

The exact [raw JSON gzip](dx24-quality/report.json.gz), [summary](dx24-quality/summary.json), [manifest](dx24-quality/manifest.json), adapter, canonical/derived helper, compiled module, launcher and plan/metadata are archived together. Decompression reproduces all 7,495,670 original bytes; repeated compression is byte-identical. Gzip occupies 2,039,094 bytes. Four selected PNGs occupy 22,181,815 bytes without re-encoding. All eight original hashes, byte counts, dimensions and tmp paths are in the manifest; unarchived 0/15-second pairs remain exact in `/private/tmp/padang-dx24-quality-20261003`. No originals were discarded.

| Artifact | SHA-256 |
| --- | --- |
| Raw JSON content | `6b2835f20196acaffab54ee88307f5f46503471af466c2f9ae172e5b31ee2a3a` |
| Raw gzip | `4f2c32d6e0860ec73701255665c272fe63a35ba979acc9f48a57ea5ea4c3bd36` |
| Summary | `a5927163fcff9456deccc8319f665d3f006a0b7f2dd368f1dac65fd9309f0ca6` |
| Adapter | `78f5fb140697180d36fbc2a49efa57e49111065bee1d5e4adea1e06870162758` |
| Derived helper | `69dd43aedd980f94161f90bfe43aed0654f6661fce90b2150384bb5dbfc7fb02` |

Recompute without hardware:

```sh
node docs/research/performance-2026-10-03/dx24-quality/summarize.mjs docs/research/performance-2026-10-03/dx24-quality/report.json.gz /private/tmp/dx24-quality-summary-regenerated.json
```

The screen omits turbulence/transient foam source exports, long-term numerical endurance and actual rider/contact trajectories. Passing validity guards means trustworthy comparisons, not accepted coarse physics.
