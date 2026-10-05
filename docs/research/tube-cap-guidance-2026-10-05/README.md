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
