# Fixed-step GPU resolution quality screen

`scripts/browser/gpu-resolution-fidelity.ts` compares the full Padang Big sea on the actual worker/GPU: Hs 3.8 m, Tp 18 s, direction 0°, spreading 150, seed 8761, 64 components, calm, tide 0, alongshore width 320 m. The only physical change is alongshore cell width, 1 m versus 2 m. Both retain 1 m fine cross-shore cells and explicitly use 1 m render/contact sampling, isolating the physics change from the separately measured render simplification. Their physical grids have 232,000 and 116,000 cells.

The two runs independently warm-start and settle for the same two periods (36 solver seconds), reaching sea time 400 s. This preserves differences caused by each grid's settling, which are measured at t=0. Each run then advances exactly 1,800 completed worker snapshots, one 1/60 s step at a time. Checkpoints at elapsed simulation times 5, 15 and 30 s therefore correspond to sea times 405, 415 and 430 s. GPU fallback, missing/automatic steps, mismatched initial/final clocks, invalid data or browser errors make the report invalid. Clock comparisons allow 1e-7 s for floating-point summation; they do not allow a different simulation cadence.

The Lab clock is paused before and after initialization. The script suspends automatic animation-frame callbacks after initialization, then manually draws checkpoint frames from an identical fixed camera. This bounds quality measurements and removes camera drift. **It measures quality, not live FPS or real-time throughput.** FPS is measured separately with the game rendering continuously.

The report retains compact profiles and aggregate measurements; it does not save the full sea-state arrays. At each checkpoint the physical SET1 export is decoded in-page, checked and reduced, then discarded. Areas use the repository's `tankLayout` and `stretchedEdges` functions and each cell's actual `dx × dz`. Fine and coarse profiles use the same 21 alongshore transects over ±40 m and 401 cross-shore coordinates over ±100 m around the fine run's initial break focus. The CPU mirror of Rich Catmull-Rom samples height and both slopes on the snapshot.

The schema distinguishes these measurements:

- `runs[].start` and `runs[].checkpoints[]` contain sea/solver clocks, physical array extrema and finite checks, domain and near-break foam-covered area and entrained air volume, recent column-onset history, front width/span, lip counters, common height/slope profiles, and paired PNG paths. `activeBreakingIndicatorAreaM2` measures wet cells with positive breaking strength; the transient `FoamField.source` is not exported, so this is explicitly a source proxy. `activeJetClaimAreaM2` sums each live jet's ±`jetWindow` claim times its column width; widths and claims can overlap across separate fronts.
- `runs[].timeline` records compact status once per simulated second. `runs[].events` retains first front presence and first new lip launch at 1/60 s resolution. Onset history contains each column's most recent onset, so its earliest time at a later checkpoint is not a cumulative first-ever onset.
- `comparisons[]` gives height/slope errors on common coordinates, errors within ±8 m of the fine run's dominant crests, separately matched crest peak height/location, and crest-aligned shape errors. Crest alignment helps distinguish a phase shift from a changed face shape. It also shows foam/air differences in the breaking region, rather than relying on a whole-domain height RMS.
- `tubeGeometry` reports independent loft folds, cuts, overlap losses, active endpoint weights and maximum neighboring ray angle. It checks active positions/normals/masks/lifts and index bounds. Reversed across-front orientation is a fold indicator, not a complete intersection/contact test. Existing slab/fold defects may appear on both grids; those must be assessed separately from changes in wave propagation and crest physics.
- `valid` means the GPU, cadence, clock and finite-data checks passed. `qualityDecision` remains a request for reviewing measured differences and paired images; the script does not accept coarser physics using an arbitrary RMS threshold.

The barrel's mask stays at an independent 1 m spacing. In this physics comparison both water grids also use 1 m. The frozen [render-spacing-fidelity screen](render-spacing-fidelity.md) separately establishes that changing only the render grid to 2 m preserves identical 1 m mask bytes for the same loft. This does not establish identical lofts between independently advanced physical grids.

Build the portable script and run it against an immutable served build only while other GPU benchmarks are idle:

```sh
./node_modules/.bin/rolldown scripts/browser/gpu-resolution-fidelity.ts -o /private/tmp/gpu-resolution-fidelity.mjs --format esm --platform node
node /private/tmp/gpu-resolution-fidelity.mjs --plan=true
node /private/tmp/gpu-resolution-fidelity.mjs --url=http://localhost:4188/ --dir=/private/tmp/surf-pipeline-side-times-fixed-20261003 --out=/private/tmp/padang-dx-quality
```

`--plan=true` opens no browser. It validates the injected JavaScript and prints resolved parameters, checkpoint cadence and grid sizes. The actual run verifies the served index and worker against the supplied frozen directory and records bundle and worker SHA-256 hashes and row-transpose/side-times markers. By default both variants must use the same bundle. Separate `--before`, `--after`, `--beforeDir` and `--afterDir` arguments are available; a deliberate combined code/grid experiment requires `--allowBuildDifference=true` and must be labeled accordingly. Warm periods and sea time are explicit overrides (`--spinUp=2`, `--seaTime=400`). The default post-initialization wall limit is 240 seconds per variant and initialization limit is 180 seconds. A partial report is saved if a run fails.

Preparation checks passed: bundling, JavaScript syntax, plan mode and execution of the injected helper against an existing frozen surface/loft and GPU SET1 export. The completed live GPU comparison is recorded below.

## Completed GPU results and decision

The [full report](gpu-resolution-x-only/report.json) is valid: both variants used the same verified bundle (`9c973728f9773479a9ad7543883ce5338fa33e54fc4cc32b70089c4e7db78697`), remained on the GPU and passed all finite-data checks. Both started at solver time 36 s / sea time 400 s with offset 364 s and ended at solver time 65.9999999999983 s / sea time 429.9999999999983 s. The 5/15/30 s checkpoint clocks matched between variants; no simulation time was shortened or skipped. The physical cell count fell from 232,000 to 116,000.

| Elapsed simulation time | Near-crest height RMS | Matched peak-height max difference | Peak-location p95 / max difference | Near-break foam area change | Near-break air-volume change |
| --- | ---: | ---: | ---: | ---: | ---: |
| 5 s | 8.16 cm | 24.28 cm | 0.5 / 1.0 m | +5.61% | +10.35% |
| 15 s | 7.04 cm | 16.08 cm | 0.5 / 0.5 m | +2.65% | +2.75% |
| 30 s | 8.59 cm | 18.17 cm | 1.0 / 2.5 m | +2.87% | −22.05% |

All 42 dominant fine-grid peaks matched at 5 and 15 s; 40 matched and two were unmatched at 30 s. Peak positions use 0.5 m profile sampling. Near-crest sample maxima were 32.83, 24.70 and 42.87 cm, respectively. The independently settled initial states already differed by 4.66 cm near-crest RMS. Front appearance occurred at 4.167 versus 4.000 s, and the first lip launch at 4.650 versus 4.450 s. These are material changes in numerical physics, even where the paired images look similar. The air-volume difference at 30 s particularly prevents a claim of equivalent whitewater physics.

The paired [15 s fine](gpu-resolution-x-only/dx1-15s.png), [15 s coarse](gpu-resolution-x-only/dx2-15s.png), [30 s fine](gpu-resolution-x-only/dx1-30s.png) and [30 s coarse](gpu-resolution-x-only/dx2-30s.png) frames were reviewed and showed similar broad crests and foam. Tube defects remain separate: at 30 s, the fine loft had 121 cuts, 35 lost open-overlap strips and 48 reversed roof samples; the coarse loft had 11 cuts and none in those latter two indicators, but 121 of 1,992 tested face samples were reversed. This comparison does not establish sound tube topology or rider contact, and fewer roof cuts do not constitute a tube-physics fix.

**Engineering decision:** accept `dx=2`, retaining `fineSpacing=1`, for ordinary Padang as a performance simplification with similar visuals. This is a visual engineering acceptance for the sampled Big sea, not exact physics parity, a broader sea-state validation, or an FPS result. Supplied room, replay and report overrides remain authoritative. Render sampling at 2 m is covered by the separate frozen screen and keeps the independent 1 m barrel mask; live riding and the remaining tube model defects still need their own evidence.
