# Wave-frame measurement repair; natural catch remains unproven

The repair removes origin-dependent crest displacement and incoming/back-slope direction reversal. The fresh ordinary takeoff attempt still remains prone for all 762 steps / 12.7 physical seconds: no cue, pop-up, standing, fall or measured tube entry. The unchanged pilot ends with `missed the wave`. This result establishes neither usable natural entry nor a visual improvement.

The gauge now differences actual world-space sampled crest points and projects displacement onto the normalized mean of consecutive directions. It orients the locally sampled wave axis against the configured incoming seed, allowing oblique and curved fronts within that incoming hemisphere. Cue thresholds, crest reseed threshold, smoothing and ordinary input policy are preserved. [Exact patch](source/gauge.patch) and before/after source snapshots are retained.

| Recorded metric | Prior 957 attempt | Gauge candidate |
| --- | ---: | ---: |
| Direction opposing incoming seed | 381 steps | 0 steps |
| Minimum incoming dot | −1.000 | 0.443 |
| Valid gauge frames | 394 | 518 |
| Valid crest-speed range | −176.091 to 178.943 m/s | −7.292 to 62.418 m/s |
| Maximum valid shoreward speed | 2.775 m/s | 3.955 m/s |
| Maximum rider speed | 3.917 m/s | 4.556 m/s |
| Joint crest-distance-band passes | 0 | 0 |
| Caught-speed gate passes | 0 | 0 |
| Cue / pop-up / standing | 0 / 0 / 0 | 0 / 0 / 0 |

Recorded configuration, policy, initial board/body pose and initial sea time match. The independent attempts use the same ordinary Autopilot line policy: waitOutside 5 m, rise 1 m, line 60 degrees, giveUp 8 s, no stall. Input follows each attempt's actual published view; the changed gauge changes input and trajectory. There is no equal-trajectory or physical-state equality claim. The baseline uses the older 957 foam-ball renderer; the candidate includes the accepted 8f79 visual omission plus the intentional gauge change. [Baseline archive](../natural-entry/README.md) is referenced without duplicating it, with [hashes](baseline-references.json).

Crest identity remains unresolved. At steps 419→420, ahead-of-crest jumps from +5.628 m to −5.725 m while the board moves only 0.06575 m and local direction turns 1.8766 degrees. The reported 21.2656 m/s crest speed remains unchanged. Source selects the highest sampled height across the 40 m behind / 12 m ahead ray window; a projected jump over 3 m clears its seed but retains the previous speed in a valid frame. The event supports selected-crest discontinuity and stale speed, not proof that a nearer catchable crest existed. The next bounded source action is a deterministic two-crest selection/reseed regression, then coherent selection/invalidation, preserving thresholds and policy. [Detailed evidence](next-source-action.json) records the inference limits.

The candidate reaches the 3 m/s shoreward floor in 233 rows but never satisfies the full caught-speed clause. No valid row lies jointly within the crest-distance band. The closest is step 419: 5.628 m ahead versus the 2–4 m band. The separate private rider-cue speed requirement rejects 302 rows; 460 meet that requirement, but pressure support, local downhill slope and sample-domain reasons are unlogged. No exact private refusal cause is inferred.

**Inherited wording correction:** the candidate report says “No worker internals changed.” This means no added private worker instrumentation. The gauge intentionally changes physical host/control measurement; worker asset hashes differ. That inherited sentence is not evidence of unchanged physics or equal trajectory.

The final prone [PNG](candidate/native-first/00-final.png) is retained as the original capture, with no tube-appearance acceptance claim. The optional connected-witness/body detector has zero runtime samples because the rider never stands. It cannot establish full-body clearance or connected air volume.

Six focused gauge/cue/pilot/consumer suites pass 111 tests; the final gauge+cue run passes 16 overlapping tests after the additional incoming-seed case. Strict TypeScript checking, diff checking, the fresh Vite build and four offline helper/source checks pass. [Validation notes](validation-notes.json) distinguish completed execution notes from retained raw native evidence and record the before-fix regressions.

Root launched this fresh attempt once. The owner exits 0, reports complete with no failure, and independently closes 4289/9699 in 47.682 s. Both user servers 4310/4311 remain open before and after. Frozen preparation/source/dist hashes verify unchanged. Native runtime errors are empty. Caps are 1080 steps / 18 physical seconds, 180 s whole / 168 s command / 7 s cleanup, 32 MiB report and 24 MiB NDJSON; first fall or pilot completion ends the attempt. No retry, placement, reset, forced cue or time/pose search occurs.

Report and per-step NDJSON are compressed losslessly with gzip mtime 0. [Archive origins](archive-origins.json) record original and retained hashes; [manifest](manifest.json) covers all retained files. Protocol source keeps its original scratch paths as a record of the completed launch, not an armed archive entry point. Full runtime assets are represented by frozen preparation hashes; the diagnostic input module, worker hash comparison, source snapshots and all finite driver/helper sources are retained. Run `python3 verify.py` for bounded offline archive verification only.
