# Rejected candidate: skip interpolation of exactly zero foam

The scratch candidate preserves every 60 Hz advection departure for aeration and every cell's source, metadata, wet/dry clearing, caps and decay. It skips the four interpolation weights and eight foam multiplications only when all four upstream dense and residual values are zero. Summing those zero values in the original association preserves signed zero in the private scratch arrays; NaN departure fractions use the ordinary path. The canonical production `FoamField.ts` was retained and compiled before creating the candidate. **No production source was edited.**

Earlier retained live surface dumps had 86.3% / 81.7% exactly zero rendered foam at 10 / 20 seconds. Those 372,681-node dumps use the older fine grid and do not establish current raw-cell occupancy. They justified a bounded plausibility test, not a live saving claim.

The standalone [proof script](../../../scripts/foam-zero-advection-report.ts) passed 72 paired replay steps across normal, public-edge and stale-stencil fixtures. It compares bytes of every FoamField and AerationField public/private typed array, their identities and scalar state, and both recorded stencil arrays before and after material-air updates. Cases cover sources/splashes, decay and caps, dry thresholds, stretched rows, large boundary departures, mixed/all-negative signed zeros, NaN field/departure inputs, aliased breaking input, changing dt, consumed/invalidated stencils and moving/fully replaced windows.

One bounded CPU sample used the ordinary Padang Big 160 × 725 = 116,000-cell grid with prescribed sparse surf-band foam, flow and bores, unchanged 1/60 steps, 30 warmup pairs and 30 measured adjacent pairs. Before/candidate order alternates each frame. After warmup, 78,483 of 111,200 wet stencils (70.6%) qualified for the shortcut. Final foam, source, stencil and material-air fields remained byte exact.

| Measured stage | Before median | Candidate median | Median adjacent-pair saving |
| --- | ---: | ---: | ---: |
| Foam | 5.349 ms | 5.216 ms | 0.147 ms |
| Complete foam + bore sources + aeration | 6.709 ms | 6.616 ms | **0.084 ms** |

The complete-pass paired mean saving was 0.146 ms. Separate stage medians are not added into a total. These are isolated Node timings after small edge-case replays, not live worker costs; absolute values and noisy unchanged-stage differences should not be treated as gameplay timings. The candidate introduces no new hot-loop typed-array allocation, but allocation/GC were not instrumented.

**Recommendation: reject.** Even with substantial zero occupancy, the additional loads/checks/branch offset most avoided arithmetic, while departure mapping, stencil writes and finishing still run. The measured complete-pass saving is too small to justify the production branch and signed-zero/NaN handling. No browser, GPU, full water simulation or FPS trial was run, and no further tuning or timing repetitions were performed.

[Raw report](foam-zero-advection.json) retains all 30 paired rows, source hashes, fixture hashes, machine/runtime and unchanged-production verification. Compiled before/candidate modules and their patch remain at `/private/tmp/foam-zero-advection-20261003/`; the proof script regenerates them without modifying production.

Reproduction from the repository root:

```sh
node_modules/.bin/rolldown scripts/foam-zero-advection-report.ts -o /private/tmp/foam-zero-report.mjs --format esm --platform node
node /private/tmp/foam-zero-report.mjs --out /private/tmp/foam-zero-advection-20261003/report.json
```
