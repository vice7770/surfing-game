# TMP-only Foam destination fusion — prepared, unexecuted

Source extraction is the root-authorized read-only `git archive` of `e58e398555d8b4d4f7ada4b664d4a923d383f06a`, selecting only src/index/package/compiler/Vite/Vitest files. `input-source.tar` and `input-authority.json` retain the original file bytes/hashes. `oracle/src` was copied before either candidate edit and remains independent and untouched. Existing public and node_modules are read-only-use symlink references, with no asset/docs/full-checkout duplicate. `prepare.py` is the historical extraction/first-source-generation helper; the final reviewed source and `candidate.patch` are the authority, including subsequent source-only guard/test additions.

No tests, syntax/type checks, build, CPU benchmark, server/browser/GPU, replay, production mutation or Git mutation has run. The only Git operation was authorized read-only extraction. Root owns the next review and any quiet execution lease. The five-owner QA directory is untouched.

## Exact candidate scope

Only `src/wave/FoamField.ts` and the actual `src/wave/SurfZoneSimulation.ts` afterWater call differ from the oracle. Generic public `update` remains byte-for-byte unchanged. `@internal updateGrid` uses a whole-call native/standard-method/alias gate, follows the original moving window once, computes the original double-precision departures/weights/sums and finish expression per destination into existing private next arrays, then performs the original public `.set` copies and commits the same stencil. Public buffers are never swapped. The actual simulation completes this Foam path before unchanged aerateBores, unchanged Air.update and unchanged snapshot writers.

The eligibility gate is included in any later cost measurement. It captures validated initially native Math round/floor/min/max/sqrt/exp and TypedArray set/copyWithin/fill data methods. Initial nonnative/accessor authority disables fusion; current substitutions/accessors reject before mutation without invoking those getters. Ordinary constructed Float64 fields, numeric own solver/decay data descriptors, matching grid length, standard public/window methods and independent strength buffers are required. Unexpected source/scratch/solver/stencil buffer aliases, custom stencil begin/commit or accessor field values delegate to the original whole generic call. Authored stencil methods are captured from the immutable ordinary module at import; this is a standard constructed-field contract, not a generic Proxy/reentrancy framework or an attestation against hostile module-loading tampering.

The private nextDense/nextResidual end contents intentionally become final destination values. Their identities and subsequent public behaviour are preserved; their old raw advected contents are not a public/exported contract. All public dense/residual/source/index/count/dissipation bytes, inactive tails and identities must match. Dry cells do not clear stale dissipation/index/stencil entries, matching the oracle. The existing AdvectionStencil and AerationField source files are untouched and independent in each source tree.

## Prepared focused tests

`tests/parity.test.ts` is a new isolated suite, not yet executed. It covers:

- Generic update source identity; native eligible branch actually produces final private destinations.
-45 sequential steps each on uniform and stretched grids, mutable flow, wet/dry crossings, ±window shifts including complete-window clearing, varied dt, TRACE/caps, splashes and open-edge splashes. Every step compares full public arrays/tails/counts, public/private identities, complete stencil data/metadata, then ordered bore/stir injections and full Air arrays; Air consumes the lookup only once.
- dt0/negative/NaN no-op state, explicit signed zero/NaN payloads/infinities in foam and nonfinite water/velocity interpolation; comparisons are bytes, not NaN-aware numeric equality.
- Dense/residual/source/dissipation and typed-subarray strength aliases; default generic stateful breaking getters and mutation chronology.
- Substituted Math round/floor/min/max/sqrt/exp; accessor exp; own set/copyWithin/fill methods and accessor set; custom/accessor stencil commit/begin; accessor decay; originally nonnative exp at fresh import. Assertions check observed chronological states/calls and unchanged generic raw scratch when falling back.
- Air stale lookup rejection after dt/time/window changes or explicit invalidation.
-12 sequential prescribed water updates through the actual Simulation.afterWater entry, complete Foam→aerateBores→Air→fused snapshot comparison, no water solver execution. This is a small beach fixture, not an ordinary Padang performance fixture or gameplay-quality replay.

Future review-only commands, not executed here:

```
node_modules/.bin/vitest run tests/parity.test.ts --maxWorkers=1
node_modules/.bin/tsc -p tsconfig.qa.json
```

No cost script is prepared/executed yet. If parity and strict checks pass and root accepts the scope, use the corrected prior fixture decoder as an intake reference for one new bounded rotating-order complete Foam→sources→Air→snapshot cost gate, with guard overhead included. Do not transplant previous rejected microbenchmark numbers. The retained F32 poststate is a new controlled subsequent update; historical gated whitewater was not exported, and valid front sentinels may be nonfinite. One later approved experiment must hash/word-check raw intake, state its source proxy limits, and compare all public fields/stencil/solver before interpreting timings. A CPU saving is not an FPS result or production adoption.
