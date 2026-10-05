# Tube curve and ordinary-control checkpoint — 2026-10-05

The local curve refinement adds stations only where quarter, midpoint or three-quarter cap probes exceed a 1.5 cm chord error. It retains raw stations and existing clock midpoints, with three subdivision levels, a 6.25 cm minimum span and the existing hard geometry budget. The cap-only profile query uses the full profile’s existing float32 controls. This improves sampling; it does not change the authored opening coefficients.

The dev `tube` autopilot uses ordinary steering and crouch, with an opt-in current-geometry mouth query. Normal player steps do not perform the route search. Current status exposes seven published pose points and seven actual volume-equivalent physics part spheres for independent observation. These spheres and points do not enclose the complete skin or limb segments. The controller’s phases and cavity cue are not evidence of a completed ride.

Rich sheet body transmission now uses the mean geometric entry normal, consistent with its geometric exit normal; surface perturbation still shades gloss. The fixed-camera capture does not establish that this resolves the dark band.

Root executed the final 39-file scoped checks: **378/378 passed**, 24.61 s. Root separately executed the four cap tests and the production TypeScript/Vite build, both successfully. The retained logs are direct command outputs. Earlier failed interpolation checks led to the triad probe decision; the independent error test was not relaxed.

## Actual fixed-camera capture

Root executed the finite native capture successfully: zero physical steps, sea time 276.3293560552737, 127.70 s total. The first eligible joined pair has sampled cap64/floor104 clearances 1.2025576085 m and 1.2042677850 m. All 37 active loft arrays, raw fronts, eight board words, 33 rider words and the original camera survived each inspection and restoration unchanged. The prior side and interior camera poses/projections were copied exactly. The owner verified source/build pins before and after, closed only its owned 4301/9711 resources and preserved the four play previews, including 4315/PID87796.

Saved-loft analysis found identical raw front bytes and bounded-C control source. The visible prior corner at front41/x74.25 bends 33.8249 degrees in the baseline and 26.0085 degrees in this candidate. Visible row spacing changes from 0.25 m to 0.125–0.25 m. The candidate still has a 33.2759-degree local bend at x75.625. All twelve prior retained positive-fade raw stations remain; the candidate is below the vertex budget. Epoch metadata is not identical, and whole-geometry equality was not required.

Root actually viewed both baseline and candidate side/interior images. **The visual improvement is modest.** The side opening remains angular; the interior retains a prominent diagonal black strip, a broad grey angular band and dense stippled/triangular cuts. This is not reference-quality acceptance, body clearance, an exposed entrance, or proof of an ordinary ridden entry/travel/exit. The next work is the independent ordinary-control ride trial and a matched render that bypasses only the swept discard to investigate the cuts.

![Fixed prior side camera](cap/capture/side-mouth.png)

![Fixed prior interior camera](cap/capture/mature-core.png)

The manifest retains direct outputs and source pins. The full loft/raw-front sidecar is gzip-compressed without changing its contents. Helper files preserve their original absolute temporary dependency references; they are evidence of the actual run, not a portable one-command runner. Previous baseline outputs are retained in the adjacent `tube-body-mouth-2026-10-05` archive.

## Later observations in this checkpoint

The first ordinary-control native attempt stopped on an incorrect harness requirement that the rendered actor clock equal the worker clock. The actual game’s SnapshotTrack deliberately trails the newest physics snapshot by up to one step. One physical step advanced, but zero trace rows were retained before the assertion failed; this is an infrastructure failure, not a physical fall or a ride result. The native owner closed its resources and preserved4312–4315. Root separately verified all139 application/source pins after the failure. Original failed inputs/outputs remain unchanged under `ordinary-v1-clock-failure`. The replacement observer preserves interpolation and checks both current physical witnesses and the seven delayed displayed pose points.

The matched mask diagnostic completed successfully with zero steps in194.31s. It reproduced the cap capture’s exact37 active loft arrays and raw fronts. Four region images compare the unchanged swept discard against removal of precisely that statement at the same two fixed cameras. Both masked repeats are pixel-exact; water-mask bytes/grid, actual indexed geometry, depth/stencil settings and original-state restoration passed. The owner preserved all previews and closed4301/9711.

Root actually viewed all four images. Bypassing the swept discard removes most stippling and exposes coherent solid floor/wall ownership, establishing that the discard contributes to those gaps. A broad grey angular gap remains. This bypass is a diagnostic, not a production change or proof that every authored fade is erroneous. Authored-mask support and the independent shaded transmission/reflection candidates need separate evaluation.

### Corrected ordinary-control trial

The replacement v2 owner completed successfully in 468.94 seconds, preserving the authored visual interpolation delay and checking exact requested controls. It advanced 1,535 steps (25.58 physical seconds) before a prone lost-board separation. The pilot received no positive takeoff cue, emitted no pop-up input, and never reached standing. It therefore supplied no tube-containment or entry/travel/exit observation. The initial and terminal normal-follower images show the ordinary spawn offshore; the terminal board was near x=-33.69, z=-239.94, away from the earlier fixed tube inspection.

The [ordinary-v2 archive](./ordinary-v2/manifest.json) preserves the closed owner, trace, two images, exact loft snapshots, helper sources and executed trace analysis. The owner checked every trace control and the intentional up-to-one-step interpolation lag, then closed its own 4301/9711 resources while preserving all four play previews. A complete infrastructure result is recorded separately from the failed ride acceptance. The next riding task is to understand normal takeoff reachability before using this controller as a tube trial.

### Authored coverage analysis and candidate

A root-executed four-ray analysis of the completed mask comparison found changed pixels at interpolated authored masks approximately 0.74856 and 0.93620; its sampled full-mask1 pixel was unchanged. This strengthens the discard-contribution observation without proving full-core coverage loss in the captured scene. The production candidate uploads the loft's existing final mask and retains max(texture coverage, authored coverage) under the original dither threshold. It does not multiply fades again. Ordinary water remains on the texture predicate, so extra retained loft pixels may overlap water; existing depth/stencil ordering decides visibility. Native appearance verification remains pending.

### Matched wall-light and reflection diagnostics

The [sheet-fill comparison](./sheet-fill/manifest.json) completed its zero-step owner in 149.08 seconds. It used the exact earlier full37 loft/raw fronts and fixed interior/side cameras. Six normal Rich images separately compare original shading, A (effective sky/wall background share), and B (reflection-occlusion multiplier bypass). All four restored baseline repeats were pixel exact; ordinary water, mask, drawing geometry, actors and depth/stencil settings stayed fixed. Root viewed all six images. A replaces the conspicuous black diagonal upper-right interior strip with modeled green wall light. B leaves that black strip and mainly changes floor reflection. The broad grey angular band, existing silhouette corners and stippling remain.

A is adopted in the source: the existing approximate direction/TIR gate controls the sky share once, and the remaining share receives the already-modeled wall background. The safe nonzero environment ray and Classic body remain intact. It does not trace a true internal reflection or wall hit. B is retained as a diagnostic only. Combined wall-light plus authored-coverage native verification is pending. The [four-ray support analysis](./mask-ray-analysis/manifest.json) is also archived with its actual output and visibility limitations.

### Source checkpoint verification

The source checkpoint adds the final authored mask to every swept look/view and the Rich-only effective sky/wall background. It also recognizes an already-positive crest during tube-style positioning, using the existing catch transition and actual-cue-only pop-up; other demo styles retain their original timing. The [verification receipts](./verification/manifest.json) record 57 passing scene-barrel tests, 43 passing Autopilot tests, and a terminal successful TypeScript/Vite build with BUILD_ID `tube-guided-early-crest-20261005`. The authored-support comparison stopped once before launching because a listener identity query exceeded its 0.35-second timeout; root verified no test resources or outputs started and all protected previews remained, then invoked the same sealed comparison again. Its native appearance result and the next actual riding result remain pending at this checkpoint.
