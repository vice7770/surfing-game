# Exact GPU solver optimizations — 2026-10-03

Two changes in `src/wave/gpu/boussinesqWgsl.ts` preserve the solver's float expressions and component accumulation order. Actual GPU comparisons passed with zero changed bits in all eight exported physical fields over 32 fixed steps. These comparisons establish field parity for the fixtures below; they do not measure an isolated performance gain.

## Changes

- **Row scratch layout:** `rowScratch(ix, iz) = ix * P.nz + iz` transposes the temporary row coefficients and Thomas forward/backward scratch. Neighbouring row-solving lanes now access neighbouring addresses. Final `QX` remains row-major; the column solve and its physical `QZ` layout are unchanged.
- **Shared side-feed times:** `relaxSides` computes each component's identical time cosine/sine factors once per 64-lane workgroup, storing them in a 512-byte `sideTimes` table. Slots consume components in their original order. Two barriers per chunk prevent reading unfinished factors or overwriting factors still in use. Inactive tail lanes reach both barriers before returning. No host buffer layout or dispatch count changes were required.

## Actual GPU evidence

[`scripts/browser/gpu-parity.mjs`](../../../scripts/browser/gpu-parity.mjs) starts identical seed-1 Padang simulations, pauses automatic lab advances, waits for each actual worker GPU step, and compares exported float32 arrays by their 32-bit representations. All three runs use Hs 4 m, period 10 s, direction 10°, spreading 12, `dx=2`, `fineSpacing=1.5`, and a 160 × 482 grid. Each performs 32 steps of 1/60 s, advancing solver time from 1 to 1.5333333333333314 with sea-time offset 399.

| Change | Components | Frozen builds | Initial and final result |
| --- | ---: | --- | --- |
| Row scratch | 64 | 4185 → 4186 | [Bit-exact fields and clocks](gpu-row-parity/report.json) |
| Shared side times | 24 | 4186 → 4188 | [Bit-exact fields and clocks](gpu-side-times-24/report.json) |
| Shared side times | 64 | 4186 → 4188 | [Bit-exact fields and clocks](gpu-side-times-64/report.json) |

The checked fields are `h`, `qx`, `qz`, `breakingStrength`, `breakingAge`, `plungeHold`, `predictor.x`, and `predictor.z`. Compute remained `gpu` at initialization and every measured step. Both solver time and sea-time offset match exactly. **`RATEH` and `NU` are absent from the network export and were not compared.** Foam, aeration, particles, and rendered pixels are also outside these field-parity assertions. The side-time runs force `renderSpacing=1` on both URLs to keep snapshot sampling consistent.

Artifact SHA-256 fingerprints cover `index.html` and sorted JavaScript assets, including their filenames:

| Frozen build | SHA-256 |
| --- | --- |
| 4185, pre-transpose | `474c3ea8bee1f082ab0f29b6754beabb9dbb710138aee432f8e506828234b3ae` |
| 4186, row scratch | `39eb0bce35c0eff8a6ec25739e0ac64a9f4fa02ed33db9c2dfeb2db54dc5a3c5` |
| 4188, fixed side times | `9c973728f9773479a9ad7543883ce5338fa33e54fc4cc32b70089c4e7db78697` |

The side-time reports additionally verify the served index and worker against the frozen files and assert the worker's `fn rowScratch(` / `var<workgroup> sideTimes:` markers. Their worker hashes and raw start/end state files are stored alongside each report. These artifact identities distinguish uncommitted builds sharing a Git revision.

## Rejected build and limits

The first shared-time build, frozen at 4187 (`012081a222cd49d7bfff291d42ade7fcbfa652f7c28c7afc20c85e0cd8e920db`), fell back to CPU and was rejected by the parity harness. Real Chrome `getCompilationInfo()` reported WGSL line 612: `'active' is a reserved keyword`. Renaming that identifier to `hasSlot` changed no arithmetic or barrier logic. Chrome then returned no compilation errors; the corrected artifact is 4188. Build 4187 is retained as a failed artifact and supplies no GPU parity evidence.

Five focused tests cover transposed rectangular-grid addresses, consistent scratch reads/writes, partial workgroups, ordered component consumption, and unchanged float expressions. The cooperative schedule test includes 65 and 129 components, but this is **CPU-only layout/logic coverage**. The attempted 65-component browser fixture stopped at `FarFieldOcean`'s existing 64-component cap before GPU execution; no live GPU result above 64 components is claimed.
