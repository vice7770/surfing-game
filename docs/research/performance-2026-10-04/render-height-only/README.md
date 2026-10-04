# Rich height-only sampler · rejected

The isolated candidate adds a scalar Catmull–Rom height sampler and uses it only for Rich barrel drawing. The existing callback asks the public height-and-slope sampler for its height; the candidate removes four temporary arrays, the returned object and the unused slope arithmetic per callback. It keeps the coefficient expressions, clamped indices, nested sum order and nonfinite behavior. The original public sampler, slope consumers and shader GLSL remain unchanged. The [two-file patch](source/candidate.patch) was never applied to production.

The complete drawing-loft build plus footprint rasterization saves only **0.0344 ms** paired median at the 10-second fixture and **0.0573 ms** at the 20-second fixture. Both marginal p95 timings worsen. This small gain does not justify duplicating 38 lines of interpolation coefficients; the candidate is **not adopted**, and no ordinary FPS trial followed it.

| Complete build + mask, ms | At 10 s | At 20 s |
| --- | ---: | ---: |
| Before median | 0.8196 | 1.4250 |
| After median | 0.7736 | 1.3472 |
| Paired median saving | 0.0344 | 0.0573 |
| Before p95 | 1.2161 | 1.7588 |
| After p95 | 1.5069 | 1.8516 |
| Positive pairs / 24 | 16 | 17 |

One bounded operation runs four warm pairs and 24 balanced before/after and after/before pairs per fixture. Before-first paired medians are 0.0650/0.1006 ms; after-first medians are 0.0344/0.0305 ms. These retained order differences and latency tails limit attribution. Parsing, library creation, output comparisons and hashing are outside the timers; profiling, mesh upload, rendering, worker snapshots and solver steps are absent. The [raw report](cost/report.json.gz) retains every pair and the [actual command terminal](cost/terminal.json) records the single successful root operation, 03:21:28.493–03:21:28.879 UTC.

Two literal tests, strict TypeScript and eight selected numeric tests pass: four new sampler/geometry tests and four unchanged normal/boundary/material tests, with seven intentional skips in the selected files. Height parity uses `Object.is`, including edges, shifted origins, unusual grid shapes, signed zero and nonfinite inputs. The retained fixture builds make **6,200 and 13,708 ordered height callbacks**; every active geometry array, normal, index, metadata value and footprint-mask byte agrees. The seven-check operation preserves all 119 input pins; the separate cost operation preserves all 121 pins. [Check terminal](checks/terminal.json), [numeric results](checks/vitest.json) and [literal results](checks/03.stdout.log) preserve the original outcomes.

The two cropped fixtures represent Hs 4 m / T 10 s mixed seas and 1 m rendering, rather than current ordinary dx2/render2 or a moving ride. They establish neither broad epoch equivalence nor FPS or snapshot-stall improvement. There is no allocation profiler or GC attribution; an engine may already eliminate some original temporary allocations.

[Manifest](manifest.json) maps all 51 original file aliases to 39 lossless stored payloads, including the eight original source records and fifteen harness records without duplicate storage. The original readiness files retain their historical source-only status; later checks and cost evidence establish execution. Source/config/test copies use `.txt` where appropriate and require the recorded layout when reconstructed. The 80 canonical source dependencies, seven fixture/case inputs and eight package identities are references in [the original intake inventory](source/inputs.json.gz), not copied modules or assets. The baseline is Git `3062582964f6f910d2e1d51afd0b14243abee2c5`; the two candidate baseline files also match accepted runtime `6f321d704269f9f1afc73750ab2b1f4a86f61122`.

The compiled 111,760 B cost bundle is intentionally omitted. Its SHA-256 `3d90916a6f758239d0785b17c147b69cec6de94c7dde0d9c79e0205f376a01f8` is retained in [compiled identity](identity/compiled.json); the archived source and exact build command identify how it was made. Gzip payloads decompress to the original byte hashes, and identical empty logs and before/after inventories retain every original alias in the manifest. No numerical replay was performed during archival.
