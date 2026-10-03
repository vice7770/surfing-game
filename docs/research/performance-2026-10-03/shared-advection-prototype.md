# Shared advection prototype CPU comparison

Three independent Node processes on the M5 Pro each ran 45 warm-up frames and three trials of 120 frames on the same deterministic 232,000-cell whitewater fixture. This measures combined foam, bore sources/stirring and aeration work, with no solver or browser. It is not a gameplay FPS claim.

| Prototype | Median trial foam, ms | Sources/stir, ms | Aeration, ms | Combined, ms | Extra memory |
| --- | ---: | ---: | ---: | ---: | ---: |
| baseline | 5.002 | 1.688 | 3.453 | 10.186 | 0.00 MB |
| fractions | 5.124 | 1.630 | 2.458 | 9.298 | 4.64 MB |
| four weights prototype | 5.273 | 1.664 | 2.527 | 9.528 | 8.35 MB |

The two-fraction stencil saves 0.888 ms (8.7%) on the median combined trial and uses 4.64 MB. The four-weight prototype loses part of that gain and uses 8.35 MB. Final sums of all five transported field arrays were identical, and separate replay tests verify bit-exact arrays.

The production candidate was simplified to the two-fraction layout after this comparison. A live worker measurement must establish whether this modest CPU saving is useful in the full frame budget. `scripts/shared-advection-report.ts` reproduces the baseline/shared comparison using independent processes and whole-array hashes.
