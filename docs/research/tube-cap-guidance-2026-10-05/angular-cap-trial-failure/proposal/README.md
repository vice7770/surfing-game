# Angular cap refinement — source-only trial

This proposal is an isolated copy of two files from the root's held `3e75550c2` source. The original files have not been changed. No compiler, test, geometry evaluator, build, native/browser process or port command has run for this proposal. The test sources are planned assertions, not results.

The reported fixed-view bend at X74.25 was 26.06 degrees. Its falling-height chord remainder was 14.895mm, below the existing 15mm criterion. That read-only observation motivates an angular criterion; the original quarter samples were not recorded, so this proposal does not establish that it repairs that particular bend.

## Proposed change

`sampledCapQuarterTurn` uses the existing left, quarter, half, three-quarter and right cap probes to measure the largest of three adjacent quarter-chord turns in stored-X / metric-Y / stored-Z space. A measured turn above the predeclared **8 degree trial threshold** requests the same bounded midpoint subdivision as a chord error above 15mm. The old chord criterion, mature/pre-impact eligibility, stored-X/sigma guards, three levels, 0.0625m minimum span, raw/clock merge priority and hard prefix budget remain unchanged. Recursive children still have `clockMidpoint=false`.

There are still five cap probes and ten `pointAt` calls for each fully eligible tested interval. The angle computation adds no provider queries to that decision. More intervals may now subdivide, so total queries and retained rows can increase within the existing tree limits: at most seven tested intervals / 35 cap probes / 70 point queries and seven insertions per initial interval. The cap scratch changes from 18 to 30 doubles, adding 96 bytes.

A repeated F32 probe X, nonfinite chord or direction no larger than `64 * Number.EPSILON * max(1, endpoint coordinate magnitudes)` is indeterminate, rather than a fabricated zero angle. An eligible indeterminate interval requests bounded subdivision. The arithmetic guard is not a new geometric clearance tolerance.

## Reporting and limits

The existing `LoftResult.cSampling` report receives one directly related `capRefinement` subrecord. It records measured parent turns, angular split requests, indeterminate probes, unverified depth/spacing leaves, blocked stored stations and fronts whose refinement was skipped for budget. No other production file, worker packet or serialization API is changed; consumers that explicitly copy selected fields will not automatically export this new subrecord.

The diagnostics do **not** certify an 8 degree maximum for the retained mesh. Parent probes precede the final live-water/end-weight projection. An interval corner between two refinement trees is not itself measured by this local criterion. Maximum-depth and minimum-spacing leaves are untested under the retained guards, so they remain explicitly unverified. A small measured parent angle alone is not a global C1 proof.

The existing budget keeps a sealed prefix and can omit later mandatory raw/clock stations if the refined plan fills the hard cap. This proposal retains that existing priority and truncation policy; it does not promise all mandatory stations survive an overflowing plan. Existing `budgetTruncated`, `firstOmittedPlannedX`, omitted-front and retirement-budget diagnostics remain authoritative. Changing that allocation policy would require a separate reviewed scope.

## Planned checks for root

The candidate test file retains the four prior assertions and proposes four additional tests:

- A generic steep C1 cap oracle has all three positional chord errors below 15mm but a sampled turn above 8 degrees. It calls the actual bounded refinement routine, checks finite dyadic stations and probe count, and independently checks that its retained corner decreases. It also deliberately asserts that unchanged spacing/depth limits can leave a corner above 8 degrees. This is a named unit oracle, not native or body evidence.
- Zero/nearly-zero and repeated-F32 directions return indeterminate; an ordinary straight span returns zero.
- An actual straight mature provider interval uses exactly five cap probes / ten point queries; the original clock midpoint remains mandatory and child decisions use the same probe cost.
- The existing actual provider fixture compares refined cap bends against its mandatory lattice/clock plan, without a saved native seed or camera. This comparison is not against the previous positional adaptive output and has not been executed.

Root should run `boundedCCapRefinement.test.ts`, then the existing `stableXSampling.test.ts`, `retirementCapPrefix.test.ts`, `retirementBoundary.test.ts` and `carrierSupport.test.ts` gates, plus the relevant drawing/contact checks and strict TypeScript check. None has been run here. A failing proposed assertion must be retained as evidence before any revised trial.

`baseline.json` pins the exact input files. `proposal.patch` is a complete unified patch against those copies, generated without Git. `readiness.json` pins both candidate files, the patch and this note and records the original source equality check. Root owns review, application and all execution after the identity capture.
