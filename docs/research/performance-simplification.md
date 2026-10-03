# Performance simplification · 2026-10-03

Continuation of the merged long run on `claude/wave-pool`, starting at `0cccd9552`. The aim is to reduce the work needed to draw the existing waves and particles while keeping their appearance. The original build was preserved before rendering edits for direct browser comparisons.

## Current live result: Padang Big on the M5 Pro

### Later continuation on the tube-stability checkpoint

The source checkpoint `1bcc7c0c` now shares a continuous crest-ray plan across drawing, contact and crash placement. The retained [moving geometry checks](tube-stability-2026-10-03/README.md) remove the reproduced across-front ray reversals; they do not establish acceptable cavity shape, seam coverage or rider behavior. The earlier unresolved-front statements below describe the first performance pass.

Two further ordinary 90-second checks of this checkpoint reached **60 display FPS**, **56.98 and 56.35 fresh physics frames/s**, and **0.950 and 0.939 simulation seconds/wall second**. A 30 Hz interpolated FFT shading candidate reached 57.44 fresh frames/s between them. That small single-sequence difference does not establish a repeatable gain, and the extra cache, targets and shading approximation were rejected. The simpler original FFT remains the production choice. [Candidate, rejection and raw measurements](performance-2026-10-03/fft-temporal-candidate.md).

An isolated [GPU kernel probe](performance-2026-10-03/gpu-kernel-probe.md) preserved all nine mapped fields, CPU uploads and clocks. The original full compute pass took a median 0.918 ms per CFL substep in its warm held fixture. The intrusive split classified columns as the largest kernel there, but does not explain late live map waits or establish an FPS optimization. Further work must address the actual live critical path without treating warm kernel timings or a 60 FPS display counter as complete simulation evidence.

The subsequent [zero-foam interpolation shortcut](performance-2026-10-03/foam-zero-advection.md) preserves all compared arrays across 72 paired replay steps, but saves only 0.084 ms median in the complete foam/source/aeration pass on a prescribed ordinary-size sparse fixture. It is rejected; production foam remains unchanged. This isolated CPU result is not live FPS evidence. The [critical-path audit](performance-2026-10-03/live-critical-path-audit.md) records why whole-foam cadence reduction also affects material air and gameplay, and why already fused snapshot writes cannot simply lose another packing pass.

A [worker message trace](performance-2026-10-03/worker-port-trace.md) forms differences on 5,138 matched interior requests. Its median non-pipeline latency is 0.2 ms and queued receipt-to-send median is below the approximately 0.1 ms clock granularity; only 1.527% of backlogged cycle time lies outside the recorded pipeline. This does not establish a worthwhile third-buffer/serial-queue gain. The trace is observational, with callback instrumentation, and does not replace passive FPS evidence. [Foam/air loop ordering](performance-2026-10-03/foam-air-joint-pass-audit.md) likewise prevents a simple exact single-cell fusion from eliminating the source-preparation traversal.

A subsequent [uniform dx2 → dx4 quality trial](performance-2026-10-03/dx24-quality.md) is rejected as a default. Both grids complete the same controlled sea clocks with verified contact and native graphics, but dx4 delays the first new material lip launch by 3.5 seconds and has no drawable tube at five seconds. Similar distant images and fewer cells do not justify that gameplay loss. No ordinary FPS run or production grid change followed this rejection.

The [combined tube-rendering prototype](tube-stability-2026-10-03/combined-repair/ordinary-fps.md) reaches 59.7 drawn FPS and 56.54 fresh physics steps/s against an adjacent 60.0/55.48 canonical sample. Its unexplained 375.7 ms stall and 36.5% additional median triangles remain explicit. Neither average establishes steady 60 Hz physics or accepts the isolated repair for production.

Its later [moving lifecycle probe](tube-stability-2026-10-03/moving-repair-incomplete/README.md) remains incomplete: the selected young end-tapered source disappears without an observed touchdown, despite consecutive fixed-step publications. Fog/cache witnesses are narrower successes, with camera QA failures retained. A [row-range feasibility audit](tube-stability-2026-10-03/coarse-fallback-range-feasibility.md) identifies inexpensive index subsets but unresolved conservative displacement/interpolation bounds; no culling code or measured improvement follows it.

### Earlier accepted performance pass

The ordinary menu → Padang Padang → Big → Paddle out test now averages **60.0 rendered FPS over 90 seconds** at High settings, Rich water, 64 wave components and High particles. The actual visible Chrome viewport is 1708 × 926, with a 2989 × 1620 drawing buffer on the 120 Hz display. No resolution override or vertex-normal shader was used. [Final passive live report](performance-2026-10-03/padang-live-frame-pacing.json). The script verified the served index, main entry and worker against the frozen build; combined bundle SHA-256 is `a493f04df31c598c1bb86575d9ee69617bac187d5407d27ac5c34c10db5b0a7d`.

Rendering and advancing the sea are measured separately: this run published **57.70 fresh water snapshots/s**, advancing **0.962 simulation seconds per wall second**. Most early two-second intervals reached 60 water updates/s, but late heavy-breaking intervals fell to about 45–55. Actual rendered intervals were 16.7 ms median, 25.0 ms p95, 25.7 ms p99 and 32.8 ms maximum: **60 is the average, not a guarantee that every frame takes 16.7 ms**. This is a substantial improvement, with remaining frame jitter and contact/solver throughput gaps; a 60 FPS display alone does not establish a steady 60 Hz simulation.

An earlier [passive run](performance-2026-10-03/padang-live-passive-defaults.json) rendered 60.0 FPS and published 57.76 water snapshots/s. The subsequent [lazy-bucket build](performance-2026-10-03/padang-live-final-passive.json) rendered 57.4 FPS, despite 120 callbacks/s, exposing phase drift in the old frame cap: resetting its clock to each draw accumulates callback lateness. The corrected cap advances whole scheduled periods, skips obsolete periods after a stall, and retains actual timestamps for physics elapsed time. A deterministic jitter regression produces 600 requested draws per ten seconds instead of fewer than 570 with the old clock. The final run above includes this correction and lazy buckets; it uses the same verified worker as the 57.4 FPS run. Other machine/scheduling variation remains uncontrolled, so this pair is not an isolated wall-time attribution.

The separately GPU-instrumented 90-second run rendered 59.9 FPS and published 53.58 water snapshots/s ([report](performance-2026-10-03/padang-live-final-defaults.json)). Different load and GPU timer queries can affect the result; the passive/instrumented runs do not isolate that cause.

| Live Padang Big measurement | Earlier live baseline | Current passive run |
| --- | ---: | ---: |
| Rendered FPS | 113.1, uncapped on 120 Hz | 60.0, capped at 60 |
| Fresh water snapshots/s | 3.02 | 57.70 |
| Simulation seconds/wall second | 0.302 | 0.962 |
| Median complete worker pipeline, ms | 54.82 per step; six-step publishing batches | 16.7 per step; one-step publishing batches |
| Physical cells | 232,000 | 116,000 |

The [earlier baseline](performance-2026-10-03/padang-live-pipeline-baseline.json) already contained the first particle/render reuse pass described below, so it is not an untouched merged-HEAD comparison. Water-device timings vary considerably between runs. The baseline's six-step batches make its snapshot rate different from its internal step rate; the simulation/wall ratio captures actual progress.

The current production choices are:

- All named graphics presets use a 60 FPS cap. Saved named presets migrate the old `screen` cap to 60; explicit Custom frame limits remain authoritative.
- Ordinary Padang uses 2 m alongshore cells while retaining the 1 m fine cross-shore grid. Supplied room, replay and report overrides retain their own parameters. The [actual GPU fidelity comparison](performance-2026-10-03/gpu-resolution-fidelity.md) found similar broad crests/foam but material numerical differences: near-crest height RMS 7–9 cm, and entrained air differing by −22% at the 30 s sample. This is a performance/visual tradeoff, not exact physics parity.
- Large Padang snapshots use a 2 m render grid; the barrel footprint mask remains independently sampled at 1 m. [Frozen render-grid comparison](performance-2026-10-03/render-spacing-fidelity.md). Explicit render spacing remains available.
- Offline workers publish each completed step instead of withholding six steps at once. Pending inputs and bounded catch-up are retained; online queue behavior is preserved.
- GPU row scratch is transposed for coalesced access and each workgroup shares the boundary wave phases. Actual 24- and 64-component worker comparisons preserve all eight exported fields and clocks exactly ([GPU evidence](performance-2026-10-03/gpu-exact-optimizations.md)); rate/viscosity arrays are outside that export.
- Foam and aeration share one-use departure-cell/fraction data with explicit solver/time/grid guards. Snapshot height/air/flow writes share one traversal. Exact field-array and snapshot parity tests cover both changes. [Bounded advection measurement](performance-2026-10-03/shared-advection-prototype.md).
- Contact construction uses scoped exact render-node heights and binary front lookup, preserving geometry and query results. Strip buckets are prepared only when queried, using the same captured projections and arithmetic as the eager path. [Contact evidence](performance-2026-10-03/contact-exact-optimizations.md). Profile-query and triangulation-cache prototypes were rejected because their sub-0.1 ms savings did not justify extra production state.

The cheaper vertex-normal shader remains a diagnostic option only. High/Ultra particle capacities are retained. The video also exposed rectangular loft cut edges and truncated long-front refinement; those defects were corrected, and the inherited tip-velocity residual now passes without weakening its 0.5 m/s limit. **Tube self-folding and unstable front normals remain unresolved**; FPS evidence must not be read as a tube-physics acceptance.

## First pass: duplicate rendering and particle work

| Work | Previous behavior | Current behavior |
|---|---|---|
| Water heights, aeration and tube textures | Rewrite and upload each display frame | Once per published snapshot |
| Particle buffers, lip sheet and far-ocean phases | Update each display frame | Once per snapshot; graphics changes invalidate the result |
| Swept barrel loft, footprint mask and mesh | Rebuild every draw | Reuse the published front and drawn-water revision |
| FFT chop | 17 rendering passes per display frame | 17 passes per distinct sea time, wind, seed and renderer |
| Bore particle sources | Spray and bubbles separately scan the whole water grid | Foam's existing pass records positive source cells; both clouds visit that sorted list |
| Particle presentation arrays | Pack after every physics step | Pack on read, once for a published worker batch |
| Particle GPU buffers | Upload full pool capacities | Upload the live prefixes using dynamic buffers |
| Rich spray lighting | Repeat sprite-constant view/lighting calculations per fragment | Calculate those values once per point vertex |
| Spray and mist off | Hide the mesh but keep simulating spray | Clear the invisible spray and skip its updates |
| Medium graphics | High particle budget | Medium particle budget, including Auto's Medium result |

High and Ultra retain their particle budgets. Lower budgets already existed; this pass does not retune their values. Explicit saved particle settings are preserved. The Medium default is the only intended appearance change.

The indexed source traversal retains the original random starting cell and cyclic visit order, so source visits and random draws remain identical. Existing High and Classic checksum tests still pass. Lazy packing preserves the last simulated mist width if a particle setting changes before a presentation read.

Water and front caches use published status identity rather than sea time alone. A restore or manual refresh can change buffers at the same time, and still invalidates the cache. New hosts, look changes, particle detail, window changes and barrel library/diagnostic changes are covered. Unversioned mutable source and barrel callers continue to update unconditionally.

Camera movement, rider interpolation, camera-dependent caustics, shadow following and water-patch placement still run per display frame. Flow retains its original every-other-display-frame cadence, but the same current data is uploaded only once. Disabling spray does not alter water, lip, rider, bubbles or sound; spray starts producing fresh drops when re-enabled.

## Measurements

### Isolated particle work

[Raw report](performance-2026-10-03/particle-overhead.md), Apple M5 Pro, Node v23.10.0, seven trials of 360 fixed steps after warm-up. These measurements isolate particle work and exclude the water solver and browser rendering.

| Case | Before ms/step | After ms/step |
|---|---:|---:|
| Sparse-source spray: 128 active cells in a 320 × 725 grid | 1.0471 | 0.0098 |
| Sparse-source bubbles: same grid | 0.9961 | 0.0397 |
| Busy spray: presentation read every step versus every fourth step | 0.3279 | 0.3020 |
| Busy bubbles: same read schedules | 0.0451 | 0.0435 |

The benchmark asserts identical final Float32 arrays for indexed/full-grid traversal and all presentation-read schedules. The sparse case shows the cost of searching inactive cells, not a claim about total frame rate. The game's index is written during FoamField's existing pass; that pass is outside this isolated benchmark.

### Repeated display-frame work

Held-snapshot tests exercise 120 display updates. Particle/lip/far-field updates run once, with all 120 camera updates retained. Water texture writes and barrel loft/mesh updates run once per held revision. For 121 FFT calls at the same time, the renderer submits 17 passes instead of 2,057. These are deterministic counts, not timing estimates.

### Browser comparison

The browser captures use a frozen original production build and the updated production build, seed 1, Big swell, High graphics, Rich water, calm wind, mid tide and midday. The held benchmark fixes the viewport and drawing buffer at 1280 × 720 and times front/close views with a synchronous one-pixel readback. The same scene centre is used for both versions. WebGPU solver time is excluded from the held WebGL timing.

Browser results and screenshot comparisons are saved under [performance-2026-10-03](performance-2026-10-03/). Headless timings measure work; display FPS must be measured separately in visible Chrome. The feature FPS survey now retains High surfer/shadow detail for Custom setting comparisons, which previously fell back to Medium and contaminated the comparisons.

Reef Big at 20 seconds: [before](performance-2026-10-03/before.json), [after](performance-2026-10-03/after.json). Both front screenshots are pixel-identical across all 921,600 pixels (maximum RGB difference 0), with identical particle counts, kinds and estimated coverage. This moment has surface spray/mist but no lip parcels or foam balls.

| Reef High measurement | Before | After |
|---|---:|---:|
| Held front view, GPU ms/frame | 6.40 | 2.17 |
| Held close view, GPU ms/frame | 8.09 | 2.00 |
| Ordinary ride callback work, median ms/frame | 2.10 | 1.40 |
| Ordinary ride callback work, 95th percentile ms/frame | 2.70 | 1.80 |

The ordinary ride samples contain 360 callbacks over six seconds each at the headless browser's 60 Hz scheduling. The callback includes snapshot consumption and scene rendering, but excludes asynchronous worker work. Its measured median falls by one third. Solver telemetry also fell from 6.6 to 4.5 ms/step, although solver code is unchanged; GPU contention and machine load affect that reading.

These before/after timings are indicative single-run comparisons. Some held hide-variant differences were noisy or negative, so they cannot reliably attribute a cost to spray alone. Identical images/counts and the deterministic eliminated-work checks give stronger evidence of visual preservation than a headline FPS claim.

Padang Big at 30 seconds covers the active swept barrel and whitewater: [before](performance-2026-10-03/padang-before.json), [after](performance-2026-10-03/padang-after.json). Both versions reach exactly sea time 391.80670943367926 with 236 front points, 61 lip parcels, 5,120 spray/whitewater particles and 4,096 bubbles. Kind counts and estimated coverage match. Its front screenshot is also pixel-identical across all 921,600 pixels, including the water crop; [Reef pixel comparison](performance-2026-10-03/reef-image-diff.json) and [Padang pixel comparison](performance-2026-10-03/padang-image-diff.json) contain the full measurements.

| Padang High held view | Before GPU ms/frame | After GPU ms/frame | Before wall ms/frame | After wall ms/frame |
|---|---:|---:|---:|---:|
| Front | 5.123 | 3.737 | 11.5 | 4.9 |
| Close | 5.198 | 4.259 | 11.6 | 5.4 |

The captured production bundle hashes distinguish the frozen original (`829dda90b557e3f093329e6067eb2efb4f46f739267ae2e7f869e2d1b6a44276`) from the updated build (`ef5b931dac03c3b5638b202889c07a429764efdf82e0277e7f7f3ee9655a01b0`). Both were built at the same Git HEAD, with the updated version containing the working-tree changes.

## Validation

- `npm run build` and `npm run typecheck:server` pass.
- 196 tests pass across 19 affected/related suites, covering source/packing parity, snapshots, restores, settings, rendering, worker messages and spray visibility. The affected runner snapshot-fill check also passes (197 total); additional focused lip/barrel mesh checks pass.
- The initial pass reproduced the ten failures in the merged handoff. The subsequent barrel correction fixed `sweptLoft.test.ts`'s 5.7004 m/s velocity residual against the unchanged 0.5 m/s limit. Nine inherited `AttachedRider.test.ts` failures remain outside this performance change.
- Current focused checks also pass: 62 frame-cap/graphics/settings tests; 54 worker, particle, shared-advection and GPU-source tests; 55 runner/host/GPU tests (five long integrations skipped); 12 selected simulation tests (67 long cases skipped); 94 water/contact/loft tests plus four lazy-bucket regressions (18 contact tests total); the ordinary Padang/default-override regression; and the independent barrel-mask/render checks. Counts overlap older passes and are not a whole-suite total.
- The complete repository suite was not run.

## Reproduce

```sh
npm run report:particle-overhead
npm run build
node scripts/browser/particle-performance.mjs --serve=dist --url=http://localhost:4173/ --out=/tmp/reef-performance --label=current
```

`--serve=dist` serves the production build on the specified URL; omit it for an existing server. The browser script defaults to Reef Big at 20 seconds, then samples the ordinary ride's main-thread frame callbacks. `--spot=padang --at=30` selects the swept-barrel scene. `--centre=x,z` fixes framing to the before run's reported centre, and `--liveSeconds=0` skips the ordinary ride sample. Each result records the served asset hash and an explicit artifact label; an uncommitted after build can share the baseline's Git commit while containing different assets.

For the visible ordinary ride, serve an immutable production build and run alone:

```sh
node scripts/browser/fps-survey.mjs /tmp/padang-live.json \
  '--url=http://127.0.0.1:4192/?diagnostics' --dir=/private/tmp/surf-pipeline-frame-pacing-20261003 \
  --features --spot=Padang --swell=Big \
  '--only=High (baseline)' --width=1728 --height=1040 --rideSeconds=90 --gpuTiming=false
```

The OS clamps that requested window to its available work area; use the report's actual viewport/canvas. Passive mode retains draw/worker counters without issuing WebGL GPU timer queries. The report distinguishes callbacks, frames that actually issue draws, new water snapshots, simulation/wall progress and per-stage pipeline costs. Diagnostic flags expose metadata but do not override the grids in this command.

## Remaining work

The first pass preserves the prior wave dynamics; the accepted Padang alongshore-grid reduction changes numerical physics as quantified above. Late tube-contact construction and solver/readback remain the main observed throughput gap. Front self-folding, live rider/catch behavior after the numerical change, wider sea-state fidelity and nine inherited rider tests still need separate work. Menu/Auto tuning on slower hardware also remains open.
