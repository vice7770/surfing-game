# Render-scale graphics tradeoff: intent and guard history

The reviewed v3 pair has completed. [Results and lossless archive](render-scale.md) record no material fresh-update gain; the native production default remains unchanged. This file retains the declared protocol and the preparation corrections.

This isolated QA proposal keeps the canonical `1bcc7c0c9` game on immutable port 4201: ordinary Padang → Big → Paddle out, seed 8761, Hs 3.8 m, period 18 s, 64 components, default dx 2 / fine spacing 1, render spacing 2, independent 1 m barrel mask, High particles, Rich water, production pixel normals and 60 Hz frame cap. No production defaults or source changes are proposed. Execution used the parent's controlled hardware lease.

The candidate loads Custom settings with detected preset High and only `renderScale=6/7` changed. The URL contains only `?diagnostics`: `?graphics=high` would overwrite the saved scale. At browser DPR 2 and CSS viewport 1708 × 926, the actual `resolveGraphics` function returns just one differing resolved value, `pixelRatio`: 1.75 → 1.5. The canvas changes 2989 × 1620 → 2562 × 1389, 26.508% fewer pixels. This is a graphics approximation, not an exact optimization or a measured frame-time saving. Physics, contact, foam, aeration, worker packing, FFT target resolution and caustic target resolution retain their existing costs.

`main.applyGraphics` (332–352) calls `resize` (1092–1096), which sets the renderer's pixel ratio and size and repeats the physical camera's CSS-aspect resize. The other resolved values, shadow level, own-surfer Infinity/2048 detail, particle level, water look and compute tier are identical. `SprayPoints` (89–94) computes point sizing from the actual drawing-buffer height during rendering. Three's `WebGLMaterials.refreshUniformsPoints` (303–308) uses material size × pixel ratio and CSS height / 2. Direct held raster changes can therefore exercise the same resolution effect without reconstructing the scene; runtime guards must corroborate this source argument.

## Prepared execution

```sh
node /private/tmp/render-scale-passive-adapter-v3.mjs --variant=baseline --plan=false
node /private/tmp/render-scale-passive-adapter-v3.mjs --variant=candidate --plan=false
```

The runs are sequential, each with five seconds of warmup and a passive 90-second sample. The adapter reuses the unchanged ordinary FPS harness, validates every served JS/CSS asset against `/private/tmp/surf-tube-stability-current-20261003`, requires aggregate build SHA-256 `7c2e14bade277ece4f1100a09dda8fe731073a41572a6619cfeb2970328fc7a3`, and checks the quality source files against `1bcc7c0c9`. It observes the actual worker start request, then restores that postMessage wrapper before sampling. The actual request must retain the default config, rider, four barrel cases and the canonical own `renderSpacing` property whose value is `undefined` (recorded as `renderSpacing:null, renderSpacingValueIsUndefined:true, renderSpacingHasOwn:true`); the actual resulting grid must use spacing 2 and the independent mask spacing 1. Batch capacity, fresh publications, fixed physics progress, interval tails and per-stage costs remain separately reported. Custom is explicitly marked as a graphics tradeoff, not native-quality-preserved.

Each owned Chrome has bounded startup and cleanup, and each complete passive/held operation has a 360-second deadline. Errors retain the partial report and failure screenshot before cleanup. No extra fluid quality run is performed.

## Held evidence outside sampling

After the sample is validated, Escape pauses the game and outstanding steps settle. RAF is temporarily held, one zero-dt presentation update and real `renderView` calls refresh the complete loaded scene, and its own camera is cloned at the same CSS aspect. The baseline scene is rendered at 1.75 → 1.5 → 1.75; the separate candidate run captures its actual Custom final scene but is not treated as matching the baseline's evolving physics state.

Full snapshot/init/water/loft and actual scene attribute/index/skeleton arrays are retained as binary bytes. Guards require unchanged array, object, geometry and attribute identities; bytes; attribute versions; draw ranges; mesh/world transforms; camera projection; config/status and sea clock; and decompressed SET1 export bytes. Actual compiled shader sources/defines, lights, shadow configuration and own-surfer detail must match. Visible nonzero bubbles/spray must actually draw; their resolution uniforms are required and checked against the real raster size, not silently skipped if absent. The physical own-camera resize must reproduce its existing projection exactly.

SET1 sea serialization uses Float32; the main snapshot and actual geometry are separately retained without numerical conversion. GPU-only FFT, caustic and shadow textures are not read back. Baseline-return native PNG differences are reported honestly, rather than required to be zero. A saved CPU plan is not proof that any live guard or visual comparison has passed.

The original baseline completed its passive sample but was rejected by an overly strict QA predicate requiring an explicit request spacing 2. The real request uses undefined: `main.surfZoneFactory` (91–97) creates `{ rider, renderSpacing, stance, ...extra }`, so the property is present even when no dev parameter exists. JSON omits an undefined value; structured clone preserves it. `SurfZoneRunner` (349–363) derives spacing 2 for broad Padang and constructs contact from the library plus `rider:true`. The raw report, failure PNG, original adapter/helper/derived sources/plans/metadata remain unchanged under `/private/tmp/render-scale-quality-20261003/failed-baseline-start-option-guard`. No held capture occurred, and that result is not a fully validated comparison.

Unexecuted v2 incorrectly required an absent property. Root source review rejected it; its tests used a missing-field fixture rather than the actual factory shape. Its sources/plans/metadata/tests are retained under `/private/tmp/render-scale-quality-omitted-spacing-20261003/rejected-v2-preparation`; no Chrome/GPU run occurred. Revision v3 requires the actual own undefined member plus observed grid/mask values and adds no request override. Its output is a new directory, `/private/tmp/render-scale-quality-default-option-20261003`; it passed fresh parent review before the declared pair ran.

CPU-only plan checks and ten tiny tests of the exact generated request observer/ordinary guard passed on 2026-10-03. They execute the exact `main.ts` factory body (verified against `1bcc7c0c9`) and structured-clone its options. They cover canonical own undefined/default, wrong actual grid/mask, explicit numeric 2/4/null, noncanonical missing property, absent rider, wrong case count and wrong config. The observer preserves request/transfer identity, `this` and return and restores itself after the captured start. Test script SHA-256 is `030ef0c00b2b12438a7546198a679269a042a05618e5518ed99d5a9ca0c1d83c`; result SHA-256 is `d7a1c5c611c3f7141275ae09ce50ba8db81bf9cdfcf113452836ba81d3af1808`. Exact revised prepared hashes:

| File | SHA-256 |
| --- | --- |
| `/private/tmp/render-scale-passive-adapter-v3.mjs` | `69a924aafbdbcc1f3f3ab946a5bb02ac53d9955c934c9a9aa605adc4180ab2aa` |
| `/private/tmp/render-scale-held-helper.mjs` | `20c448b16cb406460ec20d901caa2e877f0a489d561dee2c7062a7e4e3ea1054` |
| owned launcher | `2426a753ed68d3895cc8e0f13df94dcc082d709fbeaeb6acb15f64da0014cbd4` |
| baseline derived harness | `9c9f2a5bd988b1731de916310cedfaaef00ab6ba463b27267be5250fe3f36fdb` |
| candidate derived harness | `4b501cb2390d641149241276a5a6f199b8a168491144a8ddf4bad926f26f1653` |
| baseline plan | `05b32def700969d55ffec95b5fe4c7f927503ca6af50690dec551321530afc38` |
| candidate plan | `e84153d6a843fb4162cf54bf935220c22902df796739d3c51dc114b1861727eb` |

Revised plans and per-variant adapter metadata are in `/private/tmp/render-scale-baseline-plan-v3.json`, `/private/tmp/render-scale-candidate-plan-v3.json` and `/private/tmp/render-scale-quality-default-option-20261003`. Plan JSON bytes are unchanged because the change is in the runtime observation/validation predicates, whose separate derived hashes are shown above. Exact helper/adapter/launcher and derived sources will be archived with any subsequent measurement.
