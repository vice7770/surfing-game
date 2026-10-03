# Foam and aeration: joint-pass feasibility

Read-only source audit, 2026-10-03. No production or scratch candidate was implemented, and no test, timing, browser or GPU run was performed. The earlier [finishing fusion](field-fusion.md) and [zero-foam shortcut](foam-zero-advection.md) remain rejected; neither experiment was repeated here.

## Existing dependency order

`SurfZoneSimulation.ts:799–815` advances the front and lip, then executes:

1. `FoamField.advect` (`:139–178`): reads old dense/residual, computes departures from h/q, records the same-step stencil, fills two Float64 scratch arrays, copies them to the stable public arrays.
2. `FoamField.update` finishing (`:98–128`): decays/caps coverage and derives this step's source, sorted source/breaking indices and dissipation.
3. `SurfZoneSimulation.aerateBores` (`:1124–1135`): visits the current breaking indices, calls `AerationField.addBore` and `stir`. Lip splash/plunge/trapped-air callbacks have already run (`SurfZoneSimulation.ts:599–615`).
4. `AerationField.advectStencil` (`:238–268`): reads the **already injected** air/depth/turbulence of four neighboring cells, fills three Float64 scratch arrays and copies them to stable public arrays.
5. `AerationField.update` finishing (`:133–156`): applies destination-local dry clearing, turbulent fade, degassing and caps.

Aeration does **not** perform another velocity or departure search on this normal path. It consumes the lookup once (`AdvectionStencil.ts:44–53`). Its remaining shared metadata reads are h, the index and the two Float64 fractions; it reconstructs the same four weights.

## Why a single interleaved cell pass is unsafe

Finishing foam cell i, injecting its bore and immediately interpolating air cell i would read neighbors whose bore sources have not yet been injected. The result depends on traversal order. Writing final dense/air values directly into their public arrays during that pass also overwrites upstream values needed by later cells. Tiling does not fix this without complete source preparation and preserved old-field inputs: departures can cross a tile or jump to a clamped boundary under public h/q mutation.

A **production-only** exact joint interpolation phase is possible in principle, but it needs a global preparation phase first:

- Follow both moving windows and derive all current sources/breaking indices/dissipation from the independent typed `whitewaterStrength` (`SurfZoneSimulation.ts:846–848`). Apply every bore-air/depth/turbulence injection before any air interpolation.
- Traverse each destination once, compute/record its departure and four weights, interpolate all five fields, and finish each destination using the original Float64 expressions. Retain scratch outputs until all old-field reads complete, then copy to the existing public arrays.

This must preserve injection/cap order, air depth's weighted-support `Math.max`, stirred flags, sorted indices and stale dissipation/index tails. It cannot silently replace the public `FoamField.update(ArrayLike)` path: breaking may alias dense/residual or be a getter, and the old implementation observes it after the entire foam advection/copy. Standalone aeration must retain stale/consumed-stencil fallback behavior. The internal fast path would need an explicit independent-input and immutable-water scope, with existing public methods retained.

**Verdict: another likely micro-optimization, not a major eliminated scan.** Compared with the already rejected finishing-fusion candidate, the joint interpolation scan is accompanied by a new full source-preparation scan: two full cell traversals remain. Its distinct saving is shared weights, one h read and the stencil consumer's metadata reads. At 116,000 cells that consumer metadata is nominally 3.25 MB (h + index + tx/tz); the five fields still require up to 18.56 MB of logical neighbor reads, scratch/public copies, all destination finishing, and all material injections. These byte counts are source work estimates, not measured DRAM traffic or a bandwidth claim. No evidence establishes a material worker win sufficient to justify the reordered API/ownership complexity.

## One larger structural alternative

An explicitly approximate **coarser visual coverage grid** could reduce the number of dense/residual destinations rather than optimize their arithmetic. Doubling spacing on both axes reduces those two fields' interpolation, copy and finishing cell count by about 75%. Keep fine-grid source rates/indices/dissipation and material air/depth/turbulence at 60 Hz, so particle spawning and body aeration still use the current authority. Fine-grid departures remain available for aeration; coarse coverage needs its own smaller lookup, so no net gain is assumed before measurement.

This has substantial contract costs: source/splash aggregation, wet/dry edges and transport become approximate; dense/residual public shape and exact replay cannot remain silently unchanged; WaveLab Follow's foam threshold, area reports, snapshot sampling and state handover (`SurfZoneSimulation.ts:681,705–726`) require an explicit representation/configuration. Resampling back into full public arrays every step could erase much of the saving. It therefore belongs in a separate visual-quality experiment, with moving foam coverage and event timing checked alongside material-air/particle parity, rather than an exact layout patch. No implementation or measured saving is proposed here.
