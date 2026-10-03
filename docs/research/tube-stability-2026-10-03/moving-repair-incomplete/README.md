# Actual moving repair probe: incomplete lifecycle

The serial canonical 4201 and isolated combined 4208 C24 probes are **incomplete**, with their original failure reports retained. Neither observes the required same-front/source-column open → touchdown → retirement cycle. No production repair was applied, retry performed or deadline extended. Both owned Chromes closed.

The [offline analysis](offline-analysis.json) separates lifecycle, camera, fog and cache findings. [Raw baseline](baseline-report.json.gz) and [combined](combined-report.json.gz) reports preserve every inspected row, publication and source/build hash; exact first-open checkpoints are compressed alongside them. The [archive manifest](archive-manifest.json) verifies stored and decompressed bytes.

## Fixed source disappeared before touchdown

Both runs lock front 0 / sourceX 158.5 forever. They inspect 955 successive states and record 954 worker publications from sea 164.0 to 179.9: **15.9 simulated seconds in about 30 observed wall seconds**, including final settle/controls. Every publication and inspected state is consecutive at 1/60 s. This instrumented cadence is not ordinary FPS.

| Observation | Canonical | Combined candidate |
| --- | ---: | ---: |
| First observed open clock | 167.266667 | 167.250000 |
| Same-column phase 1 rows | 8 | 9 |
| Source tau, first → last, s | .064012 → .180652 | .049731 → .180652 |
| Last source present / first absent | 167.383333 / 167.400000 | 167.383333 / 167.400000 |
| Last front 0 record present | 177.683333 | 177.683333 |
| Candidate geometry/source/coverage/fog failure rows | 0 | 0 |
| Camera/classifier QA-invalid rows | 9 | 3 |
| Valid fresh lower-air fog witnesses | 0 | 6 |

The fixed column disappears without any published phase 2; its front continues another 10.28 simulated seconds. This is an interrupted local source record, **not a skipped touchdown or completed retirement**. These captures do not establish why the control is removed.

The joined run spans 19.012 / 20.276 m, but the source is only 1.003 m from its real control endpoint, 2.503 m from the extended joined end and 1.5 m from the physical alongshore boundary. Adjacent slice weights are .604/.316 and .629/.336; life fractions are .087/.101 and .025/.078. Underside formation is .863–.884 and .724–.864. The selected source is young and end-tapered. Whole-run length does not establish local maturity.

[The source contracts](../../../../src/wave/barrel/sweptLoft.ts) specify `LOFT.endBlend=2.5 m`, an end smooth blend multiplied by post-touchdown fade, and a further blend at cut runs. `sliceLife=tau/touchdown` is a fraction, not seconds. `sliceTipGap` is zero in drawing mode, so sorting drawn strips by that diagnostic cannot prioritize a mature opening.

## Fog witnesses and cache controls are narrower successes

Canonical's camera uses the preceding draw; combined naturally classifies after the current draw. Canonical's eight moving camera failures lose fresh eye or target air as the small opening changes. Its ninth failure belongs to the **final paused control**: source 179.9 has settled while the last ordinary classifier predicate remains 179.883333. This control provenance failure is separate from moving physics.

Combined has six fresh opaque indexed eye/target-air witnesses with a raw-underwater predicate, actual classifier false, fog absent and 104–110 projected open vertices. Three other phase 1 rows lack fresh eye/target air; their conservative underwater fog is a **camera QA failure**, not a candidate physics failure. No failure was waived.

The independent [offline contact oracle](contact-oracle.json) rebuilt stored Float32 front controls and cubic base height without water stepping. It agrees that combined's checkpoint eye and target are air, with exact drawing floor/ceiling agreement. At canonical's next-step checkpoint the eye remains air, while the preceding target is now water. This makes no claim about shader FFT/ripple displacement or unretained moving frames.

The actual original `PhysicalMode.drawBarrel` runs throughout, with no manual upload, synchronization or provenance edits. Final repeated real cached draws retain attribute/index/mask versions. Combined's public unsupported → reactivated control clears/restores marks and fallback children without uploads; hidden/visible and spot-off/restored controls also pass. These controls do **not** satisfy moving touchdown or ownership retirement.

## Delayed native captures and instrumentation

Each checkpoint is about 19.8 MB of JSON. Its event precedes a 315.0 / 331.7 ms inspected-row gap; nearby publication gaps are 295.6 / 342.2 ms. Browser array copying, CDP serialization, Node JSON/file handling and screenshot costs were not separately timed. The lightweight `inspectMs` excludes checkpoint copying. No published phase 2 is hidden: all state clocks remain consecutive.

Files named `first-open` are **delayed native screenshots**, taken after the selected control disappeared:

| Screenshot clock bracket | Canonical | Combined candidate |
| --- | ---: | ---: |
| Actual sea clock before → after | 167.616667 → 167.816667 | 167.583333 → 167.733333 |
| Event → shot-start advance, s | .350000 | .333333 |

[Canonical native image](baseline-first-open-delayed.png) and [combined native image](combined-first-open-delayed.png) preserve original normal shading and caustics. They are not an exact-state comparison or exact first-open image. There is no touchdown or retirement screenshot.

## Proposed fixed eligibility; not executed

Evaluate source controls in their recorded order and lock the **first** one satisfying all thresholds. Do not rank by appearance or retarget after selection:

- Same-front joined span ≥12 m; source ≥4.5 m (`endBlend+2 m`) from joined ends/cuts, and ≥3 m from real control endpoints and physical alongshore edges.
- Both bracketing slices phase 1 / overturned, weight ≥.9, formed ≥.9 and life fraction .2–.75.
- Fresh actual indexed eye and target air, unique three layers, floor/ceiling gap ≥.15 m, complete draw range and full opaque mask support.
- Record maturity and source/camera provenance per publication. Preserve original timing, identity and hard bounds; no eligible or complete cycle still means incomplete.

These are engineering QA thresholds grounded in the end/fade/formation contracts. They exclude this young boundary source but cannot guarantee future source continuity. Keep canonical's preceding-field limitation explicit and camera failures classified as QA invalid. Reduce checkpoint copying and retain screenshot brackets before another trial. An exact-event image needs a separately labeled held follow-up, without changing moving time.

The rule remains offline only. Four pure tracker tests and syntax checks passed before the trials. Preserved driver/helper/query/plan sources use `.txt`; this archive adds no executable test suite. Regeneration requires original paths or deliberate remapping and the separately archived combined manifest. The driver checks every served JS/CSS/build asset, all 545 candidate source hashes and CDP-port ownership.

The [ordinary combined FPS result](../combined-repair/ordinary-fps.md) remains provisional: 500,224 additional median triangles, two extra draw calls and an unexplained 375.7 ms stall. Held foreground preservation, these cache/fog witnesses and average throughput do not accept production rollout or establish steady 60 Hz physics.
