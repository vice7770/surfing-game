# Rejected exact one-entry degas cache — complete CPU update gate

The single reviewed v2 corrected attempt passed all intake and parity guards, but did not reduce complete AerationField.update cost. Reject the candidate; production remains unchanged. There was one failed pre-measurement v1 intake and one valid corrected v2 run, with no timing repeat, browser/GPU work, or FPS trial.

| Complete update path | Original median ms | Candidate median ms | Adjacent paired saving median ms | Paired saving mean ms |
|---|---:|---:|---:|---:|
| shared-stencil | 1.531250 | 1.596938 | -0.100416 | -0.059656 |
| full-advection | 1.981458 | 2.080750 | -0.138417 | -0.112617 |

Saving is original minus candidate **within each adjacent pair**. Negative values mean slower. These are medians of the actual paired differences, not subtracted independent medians/quantiles. Raw rows retain AB/BA order and both update costs. Descriptor/branch, original advection, degas and turbulence finishing are included. Reset, initial stencil preparation, hashing and parity checks are outside update timers.

Both paths used12 matched warm pairs and30 measured adjacent alternating AB/BA pairs. Total intake/construction/warmup/measurement elapsed1,183.39ms under the original20s bound. All measured pairs compare exact bytes of air/depth/turbulence/nextAir/nextDepth/nextTurbulence/stirred and their original public/scratch identities. Held solver h/bed/qx/qz/xCenters/zCenters/dz identities/bytes, solver clock, and shared-stencil indices/F64 fractions remain unchanged. Original8 focused tests pass, including native selection, shared-stencil, changed dt/window/sources/stir, NaN/signed-zero, changed/accessor/nonnative Math.exp fallback call effects. Strict tsc and bundle/plan checks pass.

The actual retained116,000-cell160×725 physics grid has dx2, stretched offshore dz to1m near shore, T18 and dt1/60. The retained F32 post-state is imported into the exact58ceb original simulation only to restore its actual grid/material arrays; no water/front/library step runs. ImportState zeros turbulence equally, and each controlled update resets captured air/depth plus zero turbulence/stirred. No new bore/plunge source is injected in this cost fixture; separate parity tests cover those. This is a **new controlled update from a saved post-state**, not the historical pre-degas arguments observed in the separate old56bf live counter. That observation's89.1756% repeats among10,153 eligible cells does not establish complete-update saving. It covers only8.75% of116k cells in one actual update, not all cells or steady-state.

Gzip95f3937160eff73a9c751fcbdc2246a811978b49be7dbbda0e56ed9dea69e584, JSON8e73b4d10d268081891d0bf89b93c6706b37617a6bea5543af443d6963443587 and raw SET1 bytes38b63fbe297eeb143c6449902855be39802455d4f14d540a07d152ead7ec32e0 match. Decoder receives an owning plain Uint8Array; every decoded F32 word is independently checked against raw header offsets. Finite gates cover actual consumed material/grid data. Unconsumed history sentinels retain original values.

The v1 generic all-array finite guard wrongly rejected the valid lastThrow=-Infinity sentinel before simulation construction or any timing. Original58ceb initializes that field to -Infinity; it is not a material defect. V1 source/bundle/ready/stdout/stderr are preserved unchanged. V2 corrects only consumed-input guards, output/version paths and final dz identity/byte checking. No widening or automatic retry occurred; root reviewed the frozen corrected hashes before authorizing one run.

This short Node microbenchmark has JIT/layout/runtime variability; it measures the full controlled field update but cannot establish browser FPS or moving-trajectory impact. Both measured paths failed to show benefit; there is no reason here to add the cache's extra branch/native-descriptor logic to production. No adoption, steady-cache, or causal FPS claim is made.
