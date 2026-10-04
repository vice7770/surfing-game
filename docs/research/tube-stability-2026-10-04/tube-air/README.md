# Air beneath the drawn tube

The camera previously used the uncarved height field to decide whether to apply underwater fog and hide the sky. In a swept barrel, that hump can stand above a camera which is actually in air between the drawn floor and roof. The camera now queries vertical crossings of the current drawn triangles, with raw-height fallback outside the loft or in an unclosed column. Rendering updates the water and loft before classifying the camera, including an explicit diagnostic camera; sound uses the same camera classification.

`BarrelWater` prepares boxes and active triangle ranges once per loft rebuild, retains the current geometry without copying it, and caches the latest position/margin query between display repeats. It uses half-open triangle edges and first-front priority. Margin applies to depth below a water layer's top after parity determines water membership; it never moves an air query upward into a roof. This repairs atmosphere classification, not barrel geometry or rider physics.

## Actual scene and result

The fixed scene and sea clock match the [clear-roof comparison](../clear-roof/README.md): seed 1, Padang, Hs 4 m, Tp 10 s, 24 components, 1 m spacing, front 48 near sigma 32.3792 at sea time 553.173058749449. The old outside camera was 3 m shoreward of the crest, beyond its lip at about 2.45 m; it mostly showed the exterior canopy. The new camera uses the existing `curl-inside` landmark recipe, fixed once at **[150.38248443603516, 0.8194682382047176, −6.938247728347777]**, looking eight metres toward the younger shoulder. Reconstructed local crossings put its floor near 0.392 m and underside near 1.552 m. This recipe's actual height is 0.819 m, not the separate midpoint estimate of 0.972 m.

Raw water at the initial eye is 1.2113778501822083 m, so the old check incorrectly reports underwater. The final drawn-layer answer is air in the first three held snapshots, water in snapshots 3–10, and undefined at snapshot 11, where ordinary water answers. The camera stays fixed while the wave moves; this is not a rider passage or a camera held indefinitely in an air pocket. Native A/B still switches only the original versus held profile on each snapshot. The atmosphere change itself is compared across separate baseline/final builds; identical inputs, selected row and inside camera matrices are retained, without claiming exported full physical F64 equality.

The view still does not expose a convincing tunnel. The initial forward center ray intersects front 48's full-weight lip underside, profile points 71/72, only **0.539 m** ahead (row 124, sigma 31.38275909423828). The next two held snapshots hit it at 0.969 m and 1.290 m. This geometric support diagnostic does not apply pixel discard or establish whole-view visibility, but full lift excludes end tapering as the immediate center-ray obstruction. A curved cavity path and genuine rider entry still need investigation.

## Rejected shading candidate

An additional trial blended resting barrel normals and foam into the canonical Rich water equations. It compiled, but manual comparison found no meaningful aperture improvement; angular floor joins and hovering canopy sections remained. Exterior SSIM was 0.995286, with identical position/projection and only 2.22e−16 quaternion / 6.66e−16 matrix differences; that metric is not a quality criterion. The shader trial is **removed** from production. Its [patch](rejected-seam/rejected-seam.patch) and run are retained separately. The final run uses the original shader plus the accepted air classification change.

| Run | Outcome |
| --- | --- |
| [Baseline](baseline/report.json) | 12 pairs / 24 PNGs, 46.11 s; old atmosphere logic, original shader |
| [Rejected seam](rejected-seam/report.json) | 12 pairs plus one exterior image, 48.11 s; candidate shader plus air repair; no runtime/shader console errors |
| [Final](final/report.json) | 12 pairs plus one exterior image, 48.59 s; original shader plus air repair; no runtime/shader console errors |

All runs independently closed their owned groups and ports. Sources and supervisor/launcher receipts are retained beside reports. [Initial baseline PNG](baseline/inside-first.png), [initial final PNG](final/inside-first.png) and [final exterior PNG](final/outside-first.png) are original copied images. The interior is still dominated by the near underside; fog correctness alone does not make it look like a good tube. Other original PNG bodies and builds remain in their `/private/tmp/tube-*-20261004` folders; they are omitted here. Temporary-path harness dependencies are not packaged as a self-contained replay. [Copied-file hashes](copied-files.json) cover the copied artifacts, not this explanation. Original pre-review fields and inherited lineage labels in reports remain unchanged; completed receipts and the assessment here describe what actually ran.

Five focused tests cover real shipped Padang floor/cavity/roof parity against independent contact, shared edges, overlap order, active triangle ranges, missing floors, margin, cache invalidation and retirement. Together with existing renderer and clear-roof tests, **36 tests pass**. Strict TypeScript and the final production build pass; existing Vite chunk-size warnings remain. These are scoped geometry/render checks, with no FPS claim, major-fin fix, reference appearance acceptance or verified rider passage.

The good-tubes goal remains active. Next: inspect the actual cavity path through adjacent rows and test a rider moving through a shipped tube. Performance tuning remains paused.
