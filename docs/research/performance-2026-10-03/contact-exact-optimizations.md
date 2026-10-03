# Exact contact construction optimizations — 2026-10-03

The worker rebuilt contact geometry across whole fronts even when the rider queried only a small area. `SweptContact` already indexes queries spatially; the changes here reduce construction work without changing its surface, slice budget, spacing, overlap decisions, end blending, or query semantics. Live FPS benefit has not yet been measured.

## Scoped render-node heights

`PhysicalSurfWater.withSurfaceNodeCache` retains the original Float64 height of each touched render node during one synchronous contact build. `plainSurfaceAt` still gathers the same 4 × 4 nodes and performs the same Catmull-Rom arithmetic in the same order. Adjacent loft vertices reuse those nodes instead of repeating two `solver.sampleCentered` calls per node, including their row searches.

`SurfZoneRunner.updateContact` enters the scope after the simulation finishes water mutations, and leaves it before the board/rider advances. Each scope invalidates on entry and in `finally`, including failed or nested builds. A translated window or changed render-grid bounds invalidates node addresses. A caller changing water, bed, or grid inside a scope must explicitly call `invalidateSurfaceNodeCache`; external `forSimulation` users and ordinary samples remain uncached. The existing 2 m body/render coupling is retained. Reusable storage costs 12 bytes per render node and is allocated when a scoped build first reads heights.

The focused curved-front fixture uses 17 front records over nonuniform water, 2 m render nodes, 39 slices, and 5,226 vertices. Instrumenting `sampleCentered` calls, with identical loft code and cache disabled/enabled, gave:

| Contact build | Solver sampling calls |
| --- | ---: |
| Eager node sampling | 107,872 |
| Scoped node sampling | 242 |
| Eliminated | 107,630 (99.776%) |

These are deterministic work counts, not wall-time measurements. The regression test requires over 95% fewer calls and exact equality of positions, normals, mask/lift, joined strips, weights, life and forward-rest fields. It also compares 30 floor queries and 150 vertical queries, including all hit fields, layers, lip motion and normals.

## Sorted front lookup

`SweptLoft.at` now finds its interpolation bracket with a lower-bound binary search over the documented front-record order. It preserves the original strict `< sigma` rule: the first record equal to the requested sigma stays on the right. Endpoint extrapolation, duplicate-sigma behavior, interpolation expressions and pace handling are unchanged. A 512-record regression fixture checks the result and limits sigma reads to 12; the former linear scan at sigma 400.5 required 403 reads including its bracket endpoints.

## Lazy strip buckets

`SweptContact.update` still captures every vertex's own/prior ray projection and builds the full spatial index. It now defers each strip's quad ranges and counting-sorted buckets until `crossings` or the overlap backstop first reaches that strip. Buckets use the captured Float32 projections, original slack and arithmetic, and ascending quad order. Every update resets readiness and the shared-storage cursor; later mutations of the public loft retain the previous eager projection/index behavior. No front, global loft budget, end blend, overlap cut, geometry or normal is cropped or changed.

The [raw bounded benchmark](contact-lazy-bench.json) compares the saved eager implementation with the lazy implementation on identical frozen geometry. The original mixed-sea Wave Lab specimens at 10 and 20 seconds contain 48/105 slices and 46/87 joined strips; the 15-second drawing has no slices and is explicitly skipped. A separate synthetic straight-front input spans **320 m**, with 297 slices and 296 joined strips after loft construction. Each specimen matched all hit fields and all query statistics exactly across **1,410 points**, including 1,000 fixed-seed points in a 100 m × 200 m region: **4,230 exact comparisons** in total.

The nearby-body fixture queries an 8 × 8 lattice spanning **1.05 m × 1.05 m**. The gauge-like fixture queries a **92 m cross-shore line and an 80 m alongshore line**, 346 points in total; it measures a bounded query pattern, not an actual rider trace. Thirty timed repetitions, after five warmups, gave:

| Frozen geometry | Nearby-body median, eager → lazy | Prepared strips, eager → lazy | Gauge-like median, eager → lazy | Gauge-like prepared strips |
| --- | ---: | ---: | ---: | ---: |
| Wave Lab, 10 s | 0.111 → 0.060 ms | 46 → 3 | 0.119 → 0.092 ms | 46 → 35 |
| Wave Lab, 20 s | 0.181 → 0.082 ms | 87 → 3 | 0.204 → 0.171 ms | 87 → 60 |
| Synthetic 320 m input | 0.555 → 0.248 ms | 296 → 1 | 0.601 → 0.369 ms | 296 → 75 |

These Node CPU microbenchmarks include projection, spatial indexing, bucket preparation and the listed queries, but **exclude loft construction, solver/body advancement, worker transfer, rendering and GPU work**. The captured Wave Lab geometries and toy front are not the final Big-wave ride. The measured nearby-query saving is 0.050–0.307 ms; gauge-like saving is 0.026–0.232 ms. No game FPS improvement is inferred. The focused contact suite passed **18 tests**, including full-scan parity, arbitrary query order/storage growth, reused/resized/empty updates, public-loft mutation and overlap backstop preparation.

## Rejected triangulation candidate

A contact-only topology cache was implemented and tested, then removed. Its [bounded microbenchmark](contact-triangulation-micro.json) compared 298 active slices, 297 joined strips and 237,006 exact indices: median generator time was 0.08535 ms versus 0.01560 ms for cache reuse, about **0.070 ms saved** at the maximum budget. Preserving the public mutable index array's ownership and repair behavior required a private shadow of up to 0.95 MB. This small isolated gain did not justify the extra storage and cache complexity or explain the several-millisecond late contact cost. Production triangulation remains the original generator; the artifact records a rejected experiment, with no FPS claim.

## Validation

`npx vitest run src/physics/PhysicalSurfWater.test.ts src/wave/barrel/sweptLoft.test.ts src/wave/barrel/sweptContact.test.ts` passed **94 tests across three files**. Added cases cover nonuniform water, clamped edges, 2 m nodes, explicit water/bed invalidation, moving windows, scope cleanup after errors, and equal/duplicate sigma brackets. GPU/live FPS measurements remain separate from these correctness tests and the rejected isolated microbenchmark.
