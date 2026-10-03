# Exact foam/aeration fusion candidate

This candidate finishes decay, bore injection, saturation, turbulence fade, and air degassing in each destination's existing advection loop. All neighbor reads still use the previous public Float64 arrays. Final results are written to the existing scratch arrays, then copied into the same public arrays. This removes two whole-grid finishing scans without changing hydrodynamics or the source-event order.

The candidate was **rejected** and both production classes restored to the committed checkpoint. The bounded CPU result is too small and inconsistent to establish a useful performance improvement: **paired median saving 0.041 ms**, with one slower pair. These are prescribed-flow Node timings, not browser FPS. The candidate sources and exact two-file patch remain in `/private/tmp/foam-air-fusion-oracle/`; the differential regression and report script remain as checkpoint coverage.

## Correctness

Before editing either field, the unchanged classes from `1bcc7c0c99943e81fdb5378e5a8a16af3f133f54` were saved and compiled into `/private/tmp/foam-air-fusion-oracle/before.mjs`. The report independently reconstructs and compiles that same checkpoint using `git show`. The raw report records both checkpoint and candidate source hashes.

Four differential fixtures replay 90 steps each: uniform independent advection, stretched shared-stencil advection, clamped/open-boundary departures including zero bilinear weights, and stale-stencil fallback. Inputs change flow, water depth, step size, breaking strength, moving windows, splashes, plunge/air injection, bore injection, and stirring. Stale cases change the step, solver clock, window or grid, explicitly invalidate after mutable-water edits, and consume a lookup twice. Nonpositive steps remain no-ops. Two legal solver shifts before a field update cover clearing a whole window.

Each step compares bytes of dense foam, lace, source, full source indices, full breaking indices, dissipation, air, plume depth, and turbulence; source/breaking counts and public array identities also match. Area-weighted foam/air mass, air-mass change through degassing, turbulent energy, and void-fraction diagnostics match exactly. A seeded bubble cloud verifies identical material positions, counts, and internal ages. Stirred flags match, including destinations that dry after stirring. Private scratch arrays intentionally hold finished destinations in the candidate rather than intermediate advection values.

Foam's breaking input is independent and read-only. The sole production caller passes `SurfZoneSimulation.whitewaterStrength`; existing tests and reports also pass separate arrays. An input aliasing foam arrays, or a getter observing partial updates, is outside this call contract and was not used as a justification for a separate fallback implementation.

The original field/stencil suites passed **32 tests**, and the new checkpoint replay passed **4 tests**. Strict source TypeScript checking passed. No endurance tests were weakened.

```sh
node_modules/.bin/vitest run src/wave/FoamField.test.ts src/wave/AerationField.test.ts src/wave/AdvectionStencil.test.ts scripts/field-fusion-report.test.ts --maxWorkers=1
node_modules/.bin/tsc --noEmit --pretty false
```

## Bounded CPU comparison

Apple M5 Pro, Node v23.10.0. The ordinary Padang Big layout and bathymetry produce **160 × 725 = 116,000 cells** (`dx=2`, original 1 m fine cross-shore spacing), with 1,685 prescribed breaking cells. The swell layout is seed 8761, Hs 3.8 m, T 18 s, direction 0°, spreading 150, tide 0, and 64 components. The script does not solve the water or instantiate a running sea. It prescribes a steady wet/dry field and flow, with sparse bores, and seeds the same foam/air state for every run.

Each variant starts from identical state, receives 30 warm-up updates and 30 measured updates. Order alternates across three pairs. Sources/stirring still occur between foam and aeration. Final public-array hashes and mass/energy diagnostics match in every pair. The CPU/GPU quiet boundary was coordinated with the other agents; no Chrome, water solver stepping, or GPU work ran during the comparison.

| Pair order | Before total, ms/update | Candidate total, ms/update | Saved, ms/update |
| --- | ---: | ---: | ---: |
| Before → candidate | 2.952 | 3.028 | −0.076 |
| Candidate → before | 3.509 | 3.302 | +0.207 |
| Before → candidate | 3.487 | 3.447 | +0.041 |

The median of paired total savings is the comparison statistic. Subtracting the independent before/candidate medians would give 0.185 ms and would overstate this paired result. Stage medians are not added to derive total time. The changed source timing, despite identical source work, also shows measurement/JIT/cache variation at this scale.

Both variants constructed one Float64 array and one Uint32 array in warm-up for the lazy shared stencil, then **zero measured Float64/Uint32/Uint8 arrays**. This counter measures explicit typed-array construction only; it is not a general heap-allocation or GC measurement. Construction/storage sizes and public array identities are unchanged.

Raw measurements, per-frame stage timings, allocation counters, replay diagnostics, and source hashes are in [field-fusion-cpu.json](field-fusion-cpu.json). These commands compare the currently checked-out classes with the checkpoint. Reproducing the rejected candidate specifically requires its retained field sources/patch; with restored production classes they measure the checkpoint against itself.

```sh
node_modules/.bin/rolldown scripts/field-fusion-report.ts -o /private/tmp/field-fusion-report.mjs --format esm --platform node
node /private/tmp/field-fusion-report.mjs --frames 30 --trials 3 --warmup 30 --out /private/tmp/field-fusion-cpu.json
```

The report is intentionally bounded. Further timings or a browser sample require a new performance question; this result alone does not justify an FPS claim.
