# Rejected monotone inner return, 2026-10-04

One fixed offline representation trial replaced only inner points 65–87. It deliberately changed X/Y, while retaining the outer curl, floor and endpoints 64/88 exactly. The trial used `u=(i−64)/24`, `X=lipX+(throatX−lipX)*u²(3−2u)`, and `Y=floor+[1−u+0.4sin²(πu)]*(ceiling−floor)`. Floor was the highest original 88–112 crossing; ceiling the lowest original 32–64 crossing strictly above it. No coefficient tuning or branch exceptions followed.

The opening grew locally, but the joins and wider geometry failed:

| Check | Result |
| --- | --- |
| All 5 captured sections | Max gap 1.188–1.213→1.574–1.602m; width at gap≥1.4m 0→0.627–0.694m; no proper crossings |
| Selected row 126 | Max gap 1.192469→1.573539m; useful width 0→0.642474m |
| Row126 endpoint joins | Lip turn 20.39→177.50°; throat 14.90→169.74°, nearly reversing the discrete contour |
| Row126 curvature/spacing | Max inner curvature 4.27→29.47m⁻¹; shortest inner segment 0.12549→0.02833m |
| All 293 eligible frames, 8 cases | 270 constructible candidates; 20 missing envelopes; 3 conservative throat-limit conflicts |
| Crossings among 270 candidates | 44 new outer/inner pairs across 21 frames; 19 previously clean profiles become crossed; 8 old pairs removed; 0 retained pairs move |
| Between-vertex envelope check | The same 21 constructed candidates leave the original envelope between their new vertices |

The 3 throat-limit conflicts are Padang a45 frame 136 and Reef frames 143/146. The prior vertical-crossing convention skips original vertical throat edges: the next nonvertical floor branch approaches 0.007780/0.008230/0.011170 h0 below retained point 88. These are one-sided return-limit conflicts, not changed endpoints. Missing-envelope and endpoint-conflict candidates have null after metrics; 270 constructible does not mean safe. Before crossing counts cover 293 frames, after counts 270; the 19 newly crossed clean profiles provide the paired deterioration. Full and core crossings are reported separately in the receipt.

This fixed candidate is rejected and stopped. Preserving the old outer curve and rolled lip while replacing only the inner return is too restrictive for this proposed smooth tube: it cannot maintain the endpoint joins and contour order. Future work needs a full curl representation that handles the rolled tip, outer and inner together, with coherent geometry-derived quantities. This conclusion concerns this exact formula and fixed boundaries; it is not proof that every possible inner-only construction fails.

No production geometry, physics, assets or root research README changed. No native/browser launch, solver run, retuning or adoption occurred. This follows the separately rejected roof-thinning trials; it does not revise them.

## Archived evidence

- `evidence/original-report.json.gz` preserves the exact 9,681,830-byte receipt. Uncompressed SHA256: `105ff8671dbaddbdfd33a58f6c290c9f5253c1c4e7a8573c5ce8e12acc2344e2`.
- `evidence/failure-receipt.json` records aggregates, all invalid-input details, all changed crossing pairs/coordinates and local join/curvature evidence. The two TSV files provide compact comparisons and exact pair labels.
- `source/` contains the original fixed prototype and unchanged parity/crossing/affine-width helpers. `input-references.json` reuses the 5 captured inputs and 293 frame byte offsets/hashes in `../rejected-roof-thinning/inputs/`, plus the 8 existing `public/barrels/*.bin` assets. Case frame payloads are not duplicated here.
- `replay.py` reconstructs those inputs in a fresh temporary directory and compares all numeric section/frame structures with the receipt. It is supplied for reproduction; numerical replay was not repeated during archiving. `manifest.json` records original/compressed hashes; `evidence/archive-verification.json` records the archival hash checks.

Shipped coordinates remain in h0; their threshold 1.4/7 h0 is an illustrative 7 m reference scale. Captured sections are initial Float32 projected outlines, not later PNG-frame polylines. Checks exclude joined triangles, alongshore ends, shader displacement, body trajectories, optical quality, FPS, collinear overlaps and endpoint touches.

If a new representation is integrated, drawing/contact/crash must share it and refresh held void height/collapse, sheet thickness/formation, sky-view factors and normals, overturn/crash area/volume/timing, contact projections/crossings/parity/clearance, loft/mouth/triangle data and camera-water/mask caches. Existing case/library-keyed caches assume immutable authored profiles. See `integration-review.md`; none of those changes was implemented.
