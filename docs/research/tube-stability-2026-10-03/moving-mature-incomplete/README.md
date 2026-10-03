# Mature moving probe: source continuity remains unproved

The reviewed fixed predicate was run once, serially on canonical 4201 and combined 4208, with the original 30-second observation and 60-second hard bound. **The baseline is initialization-invalid and the candidate lifecycle remains incomplete.** There was no retry, deadline extension, retargeting, source change or production rollout. Both owned Chromes closed; neither CDP port retained a listener.

[Raw baseline](baseline-report.json.gz), [raw combined](combined-report.json.gz), the exact [compact first-open checkpoint](combined-checkpoint-first-open.json.gz), source/plan hashes and the native image remain preserved. The [offline analysis](offline-analysis.json) distinguishes source loss, joined geometry, raw fog counts and the narrower tracked witness. [Archive hashes](archive-manifest.json) cover stored and decompressed bytes. The earlier [young-column failure](../moving-repair-incomplete/README.md) is unchanged.

## Baseline did not reach observation

Canonical's GPU initialization call timed out within the existing per-call bound. It exited after 25.244 seconds, before installing the mature helper, with zero inspected states, publications, checkpoints or images. The cause is not identified. This is not a baseline lifecycle failure or a valid paired performance/visual comparison; its invalid report is retained without widening the timeout.

## An eligible opening loses its fixed raw source

Combined selected the first qualifying control in source-record order, front 0 / sourceX 156.5, at sea 167.383333. Its exact actual-draw controls, indices, mask and current camera witness agree. The [selection record](offline-analysis.json) preserves all predicate fields:

| Local contract at selection | Observed |
| --- | ---: |
| Joined same-front run span | 22.273 m |
| Distance from nearest joined end / real control endpoint | 4.504 / 3.004 m |
| Distance from physical alongshore edge | 3.5 m |
| Both bracketing weights / underside formation | 1 / 1 |
| Both life fractions (`tau/touchdown`) | .217 / .232 |
| Both phases / overturn flags | 1 / 1 |
| Source tau | .139687 s |
| Eye / target floor-to-ceiling gap | .426 / .420 m |

The control is present for **exactly one inspected publication**, then absent at the next clock, 167.400000. Front 0 still has records through 177.683333. There are **zero source-present / phase-null rows**: this is a missing raw fixed source record, rather than only a joined-strip lookup failing while that record survives. Neither disappearance nor `phase=null` is touchdown. The tracker correctly keeps touchdown, retirement and complete false.

At the next publication, aggregate geometry changes from 46 slices / 45 joins to 54 slices / 31 joins; projected selected-front open vertices change from 313 to zero, and the last-good eye and target no longer classify as fresh air. Mask, water/swept stencil marks and fallback children remain active. These are separate observations. Aggregate joins are not persistent identities for the selected strip, and no complete next-step loft/front checkpoint was exported. The data **does not establish physical retirement of that particular roof or identify the control-removal cause**. The retained camera reports its old witness clock separately from the new failed planning attempt.

## Narrow successes and remaining acceptance gap

Combined inspects 964 consecutive states and 963 publications from sea 164.0 to 180.05: 16.05 simulated seconds during about 30.4 observed wall seconds including final settle/controls. Every clock advances by 1/60 s, with zero skipped publications or inspected states. No published phase 2 is hidden by a capture stall. This instrumented cadence is not ordinary FPS.

| Gate/count | Combined |
| --- | ---: |
| Candidate geometry/source/coverage/fog failure rows | 0 |
| Ordinary-moving / final-control QA-invalid rows | 0 / 0 |
| Fixed-source phase 1 / phase 2 rows | 1 / 0 |
| Raw fresh lower-air fog count | 2 |
| Tracked source eye **and** target-air fog witness | **1** |
| Actual cached draws | 857 |

The second raw fog witness, at 177.683333, is eye-only with no surviving fixed source, no target-air witness and no projected selected-front opening. It is valid for the broad rendering-air classifier, but **does not add a second tracked lifecycle witness**. The original raw count is preserved rather than silently narrowed.

The independent [offline contact oracle](contact-oracle.json) decodes the exact typed checkpoint and rebuilds contact from the full front and complete cubic base-height domain. Both selection eye and target are contact air, with floor/ceiling values exactly equal to the drawing witnesses. No water step, browser or rendering is performed; this does not test shader FFT/ripple displacement or later unretained roof geometry.

Real paused cached draws keep attribute/index/mask versions unchanged. Public unsupported → reactivated, hidden/visible and spot-off/restored controls clear/restore marks and fallback children correctly. These controls pass while missing moving touchdown and retirement remain failures. The raw report has exactly those lifecycle/screenshot failures; it is `pass=false`, `incomplete=true`.

## Compact checkpoint and delayed native image

The compact checkpoint is 3,190,038 bytes. Browser copy/encode is recorded as 32.7 ms; the first-open event precedes a 67.1 ms inspected-row gap. These timings do not measure total CDP serialization, file handling or screenshot cost and are not a speed comparison against the earlier differently instrumented run.

Schema 2 retains exact little-endian typed prefixes, complete Float32 height callback domain, front, mask, active loft (including four throat values per vertex), config/status/grid and camera/draw/classifier provenance. Static bed/init arrays and packed dry/foam surface channels are omitted: it supports the contact oracle, **not complete normal-render replay**. CPU base heights and loft vertices are not shader-displaced pixels.

The file named `first-open` is still a **delayed native screenshot**: actual capture bracket 167.483333–167.650000, starting .100 simulated seconds after selection and after the fixed source is absent. [Native combined image](combined-first-open-delayed.png) preserves normal shading and caustics, but does not depict the exact qualifying checkpoint. No baseline, touchdown or retirement image was obtained.

Nine pure tracker/maturity/transport tests and syntax checks passed before the run, including matching prior-draw controls when current-host sigma differs, without mutating either buffer. Prepared scripts, tests, decoder, plans and intent are saved as `.txt` or JSON; no archived source/report bytes were rewritten. The source/build guards still pin all 545 candidate source files, served index/JS/CSS/build bytes, BUILD_ID `eea68720f` and the canonical BH worker. No further threshold tuning or hardware trial is authorized by this result.

[Ordinary combined FPS](../combined-repair/ordinary-fps.md) remains provisional, including its extra geometry/draw calls and unexplained stall. This one qualified opening, passing cache controls and incomplete lifecycle do not accept the repair for production or establish steady 60 Hz physics.
