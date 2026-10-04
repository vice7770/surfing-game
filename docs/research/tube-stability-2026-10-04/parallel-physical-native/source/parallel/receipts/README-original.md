The isolated bounded-C parallel-ray experiment is ready for root review. Its sole runtime change is `src/wave/barrel/crestRays.ts`: bounded-C uses the exact shoreward ray `[0,1]`; RAW retains its original code path and arithmetic. The parent is `/private/tmp/tube-bounded-c-fullsheet-demand-20261004/source`. Nothing is adopted, built, or launched here.

`recipe.json` and578 verified parent pins were recorded before implementation. The source was frozen before evaluation and remains unchanged. `runtime.patch` contains one runtime file; `experiment.patch` additionally contains one new regression suite and three copied harness path relocations. Those relocations only move receipt/input-root paths into this scratch directory. Immutable original-provider/golden imports remain read-only. The inherited CPU microtiming is explicitly skipped.

Axis and geometric scope

Positive Z is shoreward in all three swept-library spots: tank offshore−330/shore30; `crestOnset.ts:70` scans the face in increasing Z; Padang and Reef define seaward distance as `(crestZ−z)cos(angle)`; Point defines offshore distance as `shoreline−z`. This establishes the coordinate convention. It does not make positive Z the crest-normal direction on oblique fronts or the physical direction of every swell component.

For parallel rays, an own profile offset contributes exactly zero to world X. Both adjacent cross-section endpoint half-plane advances are therefore the positive crest delta-X, independent of profile reach, phase, cap/root geometry, and remote component endpoints. The bounded-C early branch computes the minimum captured delta-X/delta-sigma, including shoulder endpoint extrapolation, and subtracts a conservative two-F32-ULP allowance for final X upload divided by the declared minimum refined spacing. It reports reversed/coincident/unresolved controls through existing diagnostics; it does not move anchors, adjust coefficients, or switch geometry. The old whole-front reference/bound/bisection and raw-vector normalization remain exclusively on the RAW path.

Validation

- First focused run:17 suites,246 passed,0 failed,1 inherited CPU test skipped;11.24s. Strict TypeScript:exit0. Exact commands and tool session IDs are in `commands.json`; full logs are retained.
- Existing provider/equivalence suites still cover6447 frozen numerical queries,12894 cap stencils and5616 library queries. Actual contours, controls, cap clocks/velocities, sheet/void channels, lifecycle, and raw fixtures remain exact. The provider, factory, packets and physics input source files are byte-identical to the parent.
- Across24 saved observations,2022 actual metric provider contours/lookups equal the parent. RAW rays/diagnostics also compare exactly to the parent over every captured component and refined/shoulder sample. Bounded-C rays remain exactly `[0,1]` across saved69→71 splitting, remote endpoint removal, X/Z translation, sigma rebasing, and object/record input paths.
- 18,376 refined/shoulder intervals, with independent±100m endpoint profile offsets, retain positive stored X advance:minimum0.152279376984m. Unsafe large-origin upload spacing is diagnosed. Existing final actual-triangle/contact tests check47046 ordered air columns with0 mesh failures; existing crash/launch/current-air/pour integration assertions pass. These tests are bounded fixtures, not proof for every physical/native state.

Orientation and physical limits

At the saved fixed crest stationX16.1258587837, parent ray angles−9.919424°→−15.270635° change to0°→0°. This removes the5.351211° ray jump caused by that component change. It leaves component relabeling, local clock smoothing, sigma rebasing, end fades, surface feedback, and other motion changes in place.

The absolute change is substantial: maximum departure from the parent29.910021°; maximum skew from the local crest normal45°. Full128-point metric profile horizontal projections can differ by7.199508m, including long retained outside-profile reach. At the locked column the physical cap's projected horizontal departure is0.370178m before and0.568846m after the split. `orientation-receipt.json` measures unweighted profile projections at saved packet controls. It does not reproduce the saved live-water rest/fade projection or assert actual native displacement/appearance.

Ray-dependent drawing/contact/flow/pour geometry changes. In particular `CrashCurve.slice:160` still assigns width from half neighboring arc-length delta-sigma, while the new cross-section planes are X-constant. A literal extrusion volume uses projected delta-X span; the existing arc-span water/air budget is therefore an approximation on oblique crests (a45° skew admits an arc/X span ratio of√2). The existing water/air formulas and clocks are deliberately unchanged by this experiment. Passing ledger tests does not establish geometric volume equality for this new orientation. A conservation decision would be separate work before adoption.

The parent's full-sheet sampling switch still has its recorded 0.218595% local-scale displacement; its source bytes are unchanged. No generic body/corridor clearance, vertical continuity, native rolling appearance, entry/pass, FPS, build, or adoption claim is made. Root owns any build or native comparison.

Integrity

`verify.py` reads parent and copied source pins, patches and output receipts only; it performs no game evaluation, build, launch, or port operation. `readiness.json` contains all579 copied source/test pins and runtime pin. Parent578 pins and all pre-validation copied source bytes are checked. The verifier also proves that deleting only the two added bounded-C branches restores the parent's entire RAW source file byte-for-byte.
