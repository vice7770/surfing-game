# Foam-ball billboards obscure the swept opening

**Accepted rendering simplification:** swept spots omit kind-2 roller billboards. Surface foam, ordinary spray/mist and tube spit/eruption still draw. Non-swept Rich waves retain the roller sprites, and Classic retains its existing filter. The worker's particle population, air release, roller area and rider physics are unchanged.

The fresh native baseline uses the accepted `957c6f9d0` runtime, the existing fixed seed/sea/graphics settings, front 48 and the predetermined exterior camera. After 1047 ordinary steps, two paused states are captured at sea times 553.4730587494489 and 553.673058749449. Only the actual kind-2 render opacity is set to zero for the attribution pictures; every attribute and visibility value is then restored. Both normal canvases restore byte for byte. This distinguishes the cotton-like blanket from the underlying surface foam and canopy geometry.

| State | Normal drawn sprites | Kind-2 sprites omitted | Candidate drawn sprites |
| --- | ---: | ---: | ---: |
| +0.3 s | 5120 | 921 | 4199 |
| +0.5 s | 5120 | 948 | 4172 |

The separate candidate build and fresh browser complete without console errors. Each candidate normal PNG is byte-identical to the corresponding baseline kind-2-hidden PNG. Actual settings, selection, camera, recorded barrel metrics, run/seal traces and snapshot kind counts match. The executable `surfZoneWorker` asset is byte-identical; the host-adapter bundle has a different hash. These checks do not assert equality of every physical state word.

The opening and curled roof are much easier to read without these billboards. Surface foam remains abundant through the checked transition, and smaller spray/burst particles remain visible. Broad canopy sections and difficult face/roof joins persist. Two paused views establish this narrow cleanup, not convincing moving geometry, safe entry, sustained passage, or overall tube completion.

Original baseline and same-state diagnostic PNGs:

| Time | Baseline normal | Kind-2 hidden / candidate normal |
| --- | --- | --- |
| +0.3 s | [Normal](baseline/normal-0.png) | [Clearer opening](baseline/no-rollers-0.png) |
| +0.5 s | [Normal](baseline/normal-1.png) | [Clearer opening](baseline/no-rollers-1.png) |

Both finite owners close their fresh server/browser groups and ports: baseline 4285/9695 in 57.113 s, candidate 4286/9696 in 49.273 s. They leave the user's frozen test at port 4310 unchanged. Exact capture source, launcher provenance, reports and owners are retained under `baseline/` and `candidate/`. Sources preserve their original scratch paths and are records of the completed commands, not an armed entry point here. Four relevant baseline PNGs are retained; the two all-particles-hidden inspection PNGs are not copied. Candidate normal PNGs are retained through their byte-identical baseline diagnostic files, with hashes and original paths in `candidate-png-references.json`; redundant candidate diagnostic PNGs are not copied.

[Comparison](comparison.json), [worker asset hashes](worker-comparison.json) and [checks](checks.json) record the acceptance scope. Focused spray/renderer tests pass 28/28, type checking and the separate Vite build pass. No FPS or full-suite claim is made. `python3 verify.py` checks retained artifact hashes and the declared comparisons offline.
