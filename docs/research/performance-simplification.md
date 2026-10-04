# Performance simplification · 2026-10-03

Continuation of the merged long run on `claude/wave-pool`, starting at `0cccd9552`. The aim is to reduce the work needed to draw the existing waves and particles while keeping their appearance. The original build was preserved before rendering edits for direct browser comparisons.

## Current live result: Padang Big on the M5 Pro

The latest [ordinary native GPU-overlap comparison](performance-2026-10-04/water-prefetch/README.md) reaches **59.98 fresh physics snapshots/s** and **1.000 simulation seconds/wall second**, against 58.25 and 0.971 in its adjacent baseline. Both draw 60 FPS; rendered interval p95 improves 25.0→17.5 ms and the complete recorded pipeline p50/p95 improves 16.6/20.9→12.1/17.0 ms. High graphics, Rich water, particles and the fixed physics step remain unchanged. The exact five-file candidate is adopted with portable lifecycle regressions: strict typing, all 92 focused tests and the production build pass, and the compiled worker is byte-identical to the measured candidate. Its independent native replay preserves mapped packets and committed state exactly across 48 paired calls. This single idle-rider sequence does not establish moving-tube or interactive ride quality.

A later [screen-fallback cost comparison](tube-stability-2026-10-04/screen-fallback-fps/README.md) keeps 60 rendered FPS in both arms, but its accepted-prefetch baseline averages 57.51 physics updates/s and slows to roughly 40–51/s in late wall-time bins. Sustained 60 Hz physics therefore remains unproven across runs. The isolated renderer candidate averages 57.06 updates/s, adds about 24% median triangles and raises the worst rendered interval from 41.8 to 83.9 ms; it is held back. The [current component seam check](tube-stability-2026-10-04/screen-fallback-current/README.md) preserves existing water/tube coverage and clears after fade, with ambiguous collapse-air regions kept explicit. These drawing results do not establish physical tube quality.

The subsequent [coarse-row fallback](tube-stability-2026-10-04/coarse-rowband/README.md) is provisionally adopted on `claude/wave-pool`. It retains the stencil seam repair but restricts its coarse-water indices to conservative mask-supported rows; unsupported geometry, transforms or masks retain the full repair range. In one ordinary High Padang Big pair, both arms render at 60 FPS, while fresh physics updates improve 58.07→59.31/s and simulated/wall progress improves .968→.989. Rendered interval p95 improves 25.1→18.3 ms and snapshot p95 improves 22.4→19.6 ms. Median triangles still rise 7.3%, draw calls rise 54→56, and the worst render/snapshot intervals worsen 50.1/38.5→67.1/76.9 ms. The single serial pair leaves those stalls and sustained 60 Hz physics unresolved.

All 42 settled same-context natural-cycle views are pixel-exact between the restricted and full repair, including a restored restricted draw. The original cross-context first-frame failure and the initial eight-pixel repeat difference remain retained; the latter also occurs with the full repair. This supports the conservative range in those captured views, not initial-frame equivalence or acceptable tube physics. Production strict typing, all 46 affected tests and the alternate-output build pass. All eleven emitted files match the measured candidate, and its physics worker remains byte-identical to the accepted prefetch worker. The earlier full-range fallback remains held; general Big tube shape, cavity views and rider behavior still require work.

The [dedicated full snapshot writer](performance-2026-10-04/full-snapshot-writer/README.md) is subsequently adopted. It removes optional-field checks from the required three-field path while retaining the original arithmetic, dynamic aeration calls, output-store order and scratch arrays. All 24 balanced held-state pairs preserve exact bits and save 0.662 ms at the paired median. In its ordinary native pair, both arms render at 60 FPS, fresh physics updates improve 56.82→57.92/s, and the observed snapshot-field p50/p95 improves 2.6/3.9→1.9/2.6 ms. Whole-pipeline p50/p95 changes 16.8/22.2→16.0/22.3 ms; render p95 changes 25.3→25.4 ms and snapshot p95 changes 22.9→23.4 ms. Worst render/snapshot intervals improve 67.2/65.3→56.8/64.0 ms, but both arms slow to about 40 physics updates/s in the final complete wall-time bins. This establishes a modest snapshot saving, not sustained 60 Hz physics or a cause for the late slowdown. Production strict typing, the existing snapshot regression plus three new compatibility tests, and the alternate build pass; all eleven outputs match the measured candidate exactly.

A later [interleaved spray upload](performance-2026-10-04/spray-interleaved-rejected/README.md) passes nine ownership, logical-value, shader and actual Three upload-plumbing checks, but remains rejected. In one bounded whole-update CPU gate, Rich copying at 4,096 particles saves only 0.010479 ms at the paired median across 96 pairs; at the 5,120 cap it saves 0.013042 ms. Both fall far below the predeclared 0.1 ms usefulness threshold. Those finite synthetic inputs preserve exact output words; arbitrary NaN payload bits are outside that claim. The three actual Big capture frames independently report 4,096 particles, without establishing a typical long-run count. No native pixel/FPS run or production adoption follows. The first strict-type failure and its annotation-only harness repair remain retained.

A subsequent [source audit of late work and copying](performance-2026-10-04/late-work-and-copy-source-audit.md) finds fixed-size stages slowing alongside fronts, foam and air, without recorded counts that establish growing work as the cause. Accepted prefetch already defers its nine F64 writes until commit; it has no per-step thirteen-plane checkpoint to remove. The earlier dx4 trial already retained one-metre cross-shore spacing while halving alongshore cells, so that failed quality gate is not repeated. No new optimization or timing run follows these source-only conclusions.

A further [source-only Float32 primary-storage assessment](performance-2026-10-04/f32-primary-feasibility.md) identifies a distinct approximation option: one private owned h/qx/qz block could remove the aggregate upload-copy pass and primary widening/narrowing, while GPU transfers remain. Board/lip feedback would round after each store, contact capture can relocate an h widening, and storage transitions require explicit startup/fallback/future ownership. The old Canyon drift experiment rounded only once per complete CPU step and does not validate this design. No implementation, performance or Padang quality result exists yet; the simpler exact side-feed component-count cache is investigated first.

The separately tested [sparse-upload candidate](performance-2026-10-04/sparse-upload/README.md) remains unadopted. Its ordinary pair increases fresh updates 59.08→59.92 Hz, but rendered interval p95 worsens 17.6→24.8 ms and p99 worsens 25.2→25.3 ms. The modest packing saving and mixed rendering result do not justify its additional mutation tracking, or an untested combination with GPU overlap. Its source, failed check and repair, successful native parity/cost gate and full ordinary FPS evidence are retained in the archive.

### Later continuation on the tube-stability checkpoint

The source checkpoint `1bcc7c0c` now shares a continuous crest-ray plan across drawing, contact and crash placement. The retained [moving geometry checks](tube-stability-2026-10-03/README.md) remove the reproduced across-front ray reversals; they do not establish acceptable cavity shape, seam coverage or rider behavior. The earlier unresolved-front statements below describe the first performance pass.

Two further ordinary 90-second checks of this checkpoint reached **60 display FPS**, **56.98 and 56.35 fresh physics frames/s**, and **0.950 and 0.939 simulation seconds/wall second**. A 30 Hz interpolated FFT shading candidate reached 57.44 fresh frames/s between them. That small single-sequence difference does not establish a repeatable gain, and the extra cache, targets and shading approximation were rejected. The simpler original FFT remains the production choice. [Candidate, rejection and raw measurements](performance-2026-10-03/fft-temporal-candidate.md).

An isolated [GPU kernel probe](performance-2026-10-03/gpu-kernel-probe.md) preserved all nine mapped fields, CPU uploads and clocks. The original full compute pass took a median 0.918 ms per CFL substep in its warm held fixture. The intrusive split classified columns as the largest kernel there, but does not explain late live map waits or establish an FPS optimization. Further work must address the actual live critical path without treating warm kernel timings or a 60 FPS display counter as complete simulation evidence.

The subsequent [zero-foam interpolation shortcut](performance-2026-10-03/foam-zero-advection.md) preserves all compared arrays across 72 paired replay steps, but saves only 0.084 ms median in the complete foam/source/aeration pass on a prescribed ordinary-size sparse fixture. It is rejected; production foam remains unchanged. This isolated CPU result is not live FPS evidence. The [critical-path audit](performance-2026-10-03/live-critical-path-audit.md) records why whole-foam cadence reduction also affects material air and gameplay, and why already fused snapshot writes cannot simply lose another packing pass.

The later [empty-neighborhood aeration candidate](performance-2026-10-04/aeration-empty-neighborhood/README.md) also remains rejected. Its full CPU foam/source/aeration/snapshot chain preserves exact bytes across 74 paired calls, but becomes 5.37 ms slower at the median in the imported zero-TKE condition and 4.81 ms slower in a declared dense-TKE counterfactual. Every measured pair is slower; source-call guards outweigh the skipped interpolation. The 26 portable cases pass, but no production change or FPS trial follows. This controlled F32 handover uses an ungated breaking-strength proxy and does not establish live wave behavior.

A [worker message trace](performance-2026-10-03/worker-port-trace.md) forms differences on 5,138 matched interior requests. Its median non-pipeline latency is 0.2 ms and queued receipt-to-send median is below the approximately 0.1 ms clock granularity; only 1.527% of backlogged cycle time lies outside the recorded pipeline. This does not establish a worthwhile third-buffer/serial-queue gain. The trace is observational, with callback instrumentation, and does not replace passive FPS evidence. [Foam/air loop ordering](performance-2026-10-03/foam-air-joint-pass-audit.md) likewise prevents a simple exact single-cell fusion from eliminating the source-preparation traversal.

A subsequent [alongshore dx2 → dx4 quality trial](performance-2026-10-03/dx24-quality.md) is rejected as a default. Both grids complete the same controlled sea clocks with verified contact and native graphics, but dx4 delays the first new material lip launch by 3.5 seconds and has no drawable tube at five seconds. Similar distant images and fewer cells do not justify that gameplay loss. No ordinary FPS run or production grid change followed this rejection.

The [combined tube-rendering prototype](tube-stability-2026-10-03/combined-repair/ordinary-fps.md) reaches 59.7 drawn FPS and 56.54 fresh physics steps/s against an adjacent 60.0/55.48 canonical sample. Its unexplained 375.7 ms stall and 36.5% additional median triangles remain explicit. Neither average establishes steady 60 Hz physics or accepts the isolated repair for production.

Its later [moving lifecycle probe](tube-stability-2026-10-03/moving-repair-incomplete/README.md) remains incomplete: the selected young end-tapered source disappears without an observed touchdown, despite consecutive fixed-step publications. Fog/cache witnesses are narrower successes, with camera QA failures retained. A [row-range feasibility audit](tube-stability-2026-10-03/coarse-fallback-range-feasibility.md) identifies inexpensive index subsets but unresolved conservative displacement/interpolation bounds; no culling code or measured improvement follows it.

The subsequent predeclared [mature-column probe](tube-stability-2026-10-03/moving-mature-incomplete/README.md) is also incomplete. Canonical initialization times out before observation; the combined candidate selects an interior, full-weight opening, but its fixed raw source survives only one publication. All 963 advancing publications are consecutive; no phase 2 or retirement is observed. The one tracked air/fog witness and real cached/unsupported/hidden controls pass, without accepting moving lifecycle or production repair.

A fresh [material-ID lifecycle check](tube-stability-2026-10-04/material-lifecycle/README.md) follows actual front point `3` and generated strip `2` through opening, touchdown, closure, F64/F32 fade completion and actual strip retirement. The point remains active after its tube retires, so point presence alone cannot establish tube persistence. Strict typing and the single bounded CPU test pass, with all 21 consecutive observations retained. This small-swell F64 CPU fixture does not establish Padang Big GPU behavior, visual quality or the earlier captured trajectory's lifecycle.

The subsequent [natural-cycle renderer playback](tube-stability-2026-10-04/natural-cycle-playback/README.md) uses the exact captured render inputs from those 21 steps, with no solver advancement or prescribed front geometry. Baseline and isolated seam candidate match all source, camera and drawn geometry hashes in both fixed views. Their images show the same overall shape; the candidate fills small gaps without establishing acceptable tube quality. At launch the close camera lies 2.5 cm below the sampled water surface, within the original 10 cm fog margin, and is not a verified interior-mouth view. This limitation and the complete sequence remain explicit. The candidate remains held after its ordinary FPS cost comparison; this playback supports neither live Big performance nor a physical tube fix.

A later [profile-phase probe](tube-stability-2026-10-04/profile-phase/README.md) tests the suspected mismatch between blended touchdown times and common elapsed profile times. All 120 sampled drawing/contact sections from the actual Padang cases, at three authored ratios and two blend ratios with fixed 7 m foot depth, have zero proper intersections, collinear overlaps or inverted underside-to-face gaps. Six open drawing samples include a positive-weight post-touchdown contributor without those defects. Six initial sections retain collapsed lip/throat placeholders, recorded separately. Strict typing, eight small geometry-metric tests and the bounded numerical probe pass. This evidence does not justify a phase-warp change or establish live Big loft quality; the next observation must include actual joined geometry, its weights and camera/fog state.

The subsequent [actual Big-wave capture](tube-stability-2026-10-04/live-big-capture/README.md) retains three completed ordinary GPU draws with coherent water/loft publication revisions and one-step sea clocks. The five-draw gate then fails because a publication was not drawn; no retry, held view or image comparison follows. All 106 retained fields and the later committed F32 export are byte-verified. The export belongs to a different paused clock, and hash-only drawn flow and mesh attributes limit optical replay. Native browser/server closure is independently verified. These partial actual lofts support a narrower geometry audit, not a completed lifecycle, FPS result or tube-quality acceptance. Production remains at the accepted full snapshot writer checkpoint.

A bounded [audit of the three actual drawn lofts](tube-stability-2026-10-04/drawn-section-audit/README.md) decodes the captured positions, indices and slice fields without advancing physics. All 84 slices are flagged; 72 partial/unformed slices are excluded from formed-section topology, leaving four fully formed OPEN sections per frame. Each frame contains one projected underside self-crossing. The closed projected loops are only about 1.3–2.4 cm wide and 1–5 mm high, so they do not establish the cause of the larger reported tube problem. None of the twelve audited sections has an inverted underside-to-face gap, and no actual drawn triangle has zero area. The section projection has transverse F32 residuals below 15 micrometres; this is projected topology evidence, not an exact 3D-intersection or visual-quality verdict. The unchanged tested metric helper and all 56 input hashes remain verified.

The subsequent [exact source-profile trace](tube-stability-2026-10-04/underside-source-cause/README.md) rebuilds all three captured lofts from their actual front/surface inputs. Six fresh/sequential pure renderer builds reproduce every captured position, slice field and source index byte before recovering the twelve F64 profile queries. Nine sections remain clean; the three small crossings have identical source-profile segment pairs. One arises during cross-case blending of clean contributing interpolations, while the other two have a crossing in a contributing source endpoint. Full-weight crest-to-toe heights match the unwarped source profile. This identifies the small crease in the authored profile/blend path, without assigning the major tube problem to it or accepting a phase warp, physical fix or FPS gain.

A narrowly bounded [drawing-only underside cleanup](tube-stability-2026-10-04/tiny-underside-cleanup/README.md) remains an unadopted prototype. Strict typing and eight focused cases pass. In the twelve actual source profiles it removes all three small loops, changing three interior vertices and normals at eleven vertices per frame; the nine clean sections, fixed endpoints, other source geometry/material arrays and actual mask bytes stay exact. Six eager/deferred contact comparisons are byte-exact. One 180-pair whole-LOFT-plus-mask CPU gate adds 0.024247 ms at the paired mean, with an approximate upper 95% mean bound of 0.051151 ms below the declared 0.1 ms ceiling; paired overhead p95 is 0.324916 ms and remains explicit. This local crease evidence provides no native visual/FPS result or fix for the larger tube problem. No production change follows.

A [render-scale trial](performance-2026-10-03/render-scale.md) reduces the native ratio from 1.75 to 1.5, cutting backing pixels by 26.5%, but ordinary 90-second fresh updates remain 56.06 → 56.07 Hz while both draws average 60 FPS. Latency tails change in both directions. The default density remains unchanged; the same-state held return is pixel-exact, but this single pair establishes no material throughput benefit or close-cavity quality.

The [half-metre Rich patch](performance-2026-10-03/rich-patch-half-metre/v2/README.md) is adopted as a simpler drawing workload: one spacing constant reduces the same 96 m patch from 297,984 to 75,264 triangles and removes 5.11 MiB of typed geometry data. High resolution, pixel normals, particles, physics grids and worker stay unchanged. The valid same-renderer original→half→original images look very similar in the ordinary and elevated close-crest views, and both original returns/repeats are byte-exact. Adjacent ordinary 90-second samples both display 60 FPS, while fresh physics updates remain 56.45→56.56 Hz; this pair establishes no meaningful simulation-speed gain. The source audit retains narrow-grid/skirt limits, and these views do not establish cavity, grazing-seam or moving tube quality. The first failed held trial is preserved separately from the successful revised comparison.

A bounded [crest-ray preparation check](performance-2026-10-03/crest-ray-preparation/README.md) rejects sharing mutable scalar/contact plans. Preparing all 30 visited runs in one retained ordinary fixture takes 0.057 ms median and 0.206 ms p95 across 30 sequences, too little to justify additional state. No reuse code was added. This preparation-only CPU result does not establish a live FPS saving or the cause of late contact growth.

The isolated [height-demand contact prototype](performance-2026-10-04/contact-height-demand-prototype/README.md) avoids constructing unused contact-row heights and normals while retaining the eager geometry arithmetic, topology and owned water snapshot. Its first native F64 epoch reproduces all 627 mixed queries/floors and selected normal bits. Across 60 balanced fixed-workload blocks, the complete update/query path saves 1.258 ms median against eager contact (all 60 blocks positive), including the 1.857 MB height/bed capture. Strict typing and 38 focused checks passed; the subsequent [runner/worker/host integration](performance-2026-10-04/contact-height-demand-integration/README.md) passed all 74 unchanged tests. Both [matching client/worker builds](performance-2026-10-04/contact-height-demand-build/README.md) then passed their strict checks and bundling. The subsequent [passive native FPS pair](performance-2026-10-04/contact-height-demand-fps/README.md) displays 60 FPS in both arms and increases fresh water updates 56.77→57.87 Hz (+1.10), with contact p50/p95 falling 1.1/3.5→0.5/1.6 ms. Both late samples still slow down, and the maximum snapshot interval increases 41.4→54.3 ms. This single serial pair uses matched native 1708×879 CSS/DPR2/2989×1538 canvas; its retained timeline is wall-time only, not matched sea clocks. It supports a modest live improvement but does not establish steady 60 Hz physics, moving-tube quality or broader epoch equivalence. The exact candidate is now [adopted in the ordinary worker](performance-2026-10-04/contact-height-demand-adoption/README.md): production typing, all 178 focused tests and bundling passed, with the compiled worker byte-identical to the measured candidate. Public geometry remains eager; further experiments stay isolated.

The separately retained [Compress force ledger](performance-2026-10-04/compress-force-ledger-retained/README.md) passes 864 exact observed-versus-control state comparisons across eight rider cases. It preserves the first rail-edge contact failures and signed assistance work without tuning the model. A diagnostic phase collision made the raw yaw summaries empty; the separate derivation from retained step indexes confirms lower-speed detachment and higher-speed yaw swing remain. This trace supports later investigation, not a causal fix or closed energy proof. A separate [support-edge source audit](performance-2026-10-04/compress-support-edge-source-audit.md) identifies additional torque terms absent from the rejected-contact board solve, with continuity and physical-policy limits kept explicit.

The isolated [viscosity/update GPU fusion](performance-2026-10-04/viscous-update-fusion/README.md) preserves all nine mapped fields in six hardware cases and 24 paired complete water steps. Its paired median saving is only 0.10 ms on a supplied 116,000-cell synthetic fixture, with order sensitivity and a large baseline outlier. It remains unadopted; this is not ordinary FPS evidence. The archive retains the first TypeScript failure, the first browser-launch failure, their separate QA repairs and the successful numerical gate.

The isolated [Rich height-only sampler](performance-2026-10-04/render-height-only/README.md) preserves ordered height reads and every active drawing/mask byte on two retained fixtures, but complete loft-plus-mask paired median savings are only 0.034/0.057 ms and both marginal p95 timings worsen. The duplicated coefficient implementation is rejected; production keeps the shared height-and-slope sampler, and no ordinary FPS run followed this CPU gate.

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
