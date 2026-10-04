# Private demanded contact height — source-only candidate

Ready for source/test review, **unexecuted**. No syntax/type check, test, actual fixture replay, build, benchmark, browser/server/GPU work or Git mutation was run. Production and the existing normal prototype are untouched.

The independent eager oracle is a minimal relative-import closure archived from `ef60d3cee120d6b157fe94386d923b6b4392205b`: 147 source/test/config files, 1,748,211 bytes. Candidate starts with that closure and the five frozen reviewed normal files, copied and hash-verified before editing. No docs, public assets or whole repository was cloned. Installed dependencies are a read-only-use symlink; first-fixture cases are decoded from its retained bytes. `start-manifest.json` pins this boundary; `candidate-manifest.json` and `candidate.patch` pin the written candidate.

## Runtime scope

Only three existing scratch runtime files change:

- `src/physics/PhysicalSurfWater.ts`: move the literal plain-height node/stencil/cache/outside implementation into an internal numeric sampler shared by live water and the owned provider. A minimal owned receiver reuses actual unbound solver `sampleCentered`/`rowBelow` methods. Fresh capture copies h, bed and **full xCenters**; fixed zCenters/dz/layout are copied once. Ordinary contact queries never bind the sampler to live fields. Public eager methods, carve callback expression, cache invalidation scopes and all flow/reaction methods retain their arithmetic.
- `src/wave/barrel/sweptLoft.ts`: private contact recipes retain four exact F64 values per vertex, original seal branch plus double row weight, and per-generation row readiness. Global profiles/XZ/rest/topology remain eager. Demand reproduces the original initial F32 Y store and separate seal F32 Y store, then provides final run-clamped rows to the existing selected normal calculation. Default public build remains eager. Unused private tip-Y metadata is completed only when its row is demanded; it does not force all rows.
- `src/wave/barrel/sweptContact.ts`: the existing private owner captures its provider before building. Crossings prepare their two rows after bucket bounds and before triangle Y reads; held tests stay XZ-only. Empty updates invalidate geometry/readiness without copying fields. The original public constructor/update path remains eager. Runner and WorkerCore selection stay frozen and exact.

No raw partial result is added to the ordinary facade. Existing internal build results remain backend-only; inspection in scratch tests uses prototype spies, not a production getter/drain. The numeric provider is deliberately the known ordinary fixed-grid plain path, not a general solver/callback capture mechanism.

## Written gates, not results

Twelve new independent tests plus the untouched existing `PhysicalSurfWater.test.ts` are selected by `vitest.height.config.ts`:

- Provider tests: actual shifted-origin/boundary arithmetic, mixed wet/dry and stretched rows, mutation before first deferred sample, capture replacement, and unchanged live/stateful-carve cache sequence.
- Synthetic contact tests: eager query/floor parity across epochs, explicit refinement and budget, outside and floor-only work, XZ-only holding, empty readiness, live field/window mutation before first demand, final-run normal halos including both profile edges, actual nonempty overlap seals with wrong DOUBLE/F32 and collapsed-store witnesses, and public eager stateful callback order.
- One original/native first-F64-fixture test: all 627 recorded initial/input/result calls, 28 hits, 65 selected normal vertices, unchanged ordered global rest reads, permitted row halo union, omitted initial callbacks, current active forced geometry and unchanged input arrays against the independent eager archive. It does not replay body trajectory or the other 14 count-only epochs.

After root source review, proposed commands are `npx tsc -p tsconfig.height.json --pretty false` and `npx vitest run --config vitest.height.config.ts`. They have **not** been executed. No checks are represented as passing. Any first failure must be retained before correction; the crafted chronology gates must not be loosened into an approximate comparison.

## Later cost gate

Copy both F64 fields and full xCenters inside every nonempty preparation. At the retained layout this is 1,857,280 bytes/update (1,856,000 field bytes plus 1,280 x-coordinate bytes); recipe writes, owned cache invalidation, all eager global preparation, demanded heights/seals/normals and the ordered query/floor stream also belong in the total. Count reduction alone is not a saving or FPS verdict. Compare the complete path against the reviewed normals-only owner and eager source only after parity; reject if the extra copies/recipes fail to produce a material saving. No hardware/visual adoption is implied.

Source-only limitations: the same-file sampler relocation needs existing physical-water regressions and independent exact F64 replay before acceptance. The nonempty seal and double-store witnesses are authored tests, not yet demonstrated outcomes. Empty skip is part of the written candidate and requires its explicit gate. Any unexpected global Y dependency or provider/layout incompatibility is a stop condition rather than a new broad fallback framework.
