# Passive tube-approach telemetry candidate — source only

Baseline: `2f43b943cfb29419a063c6ee31813e4f116c7a7a` in `/Users/regina/Desktop/Projects/surfing-game`.

This directory contains temporary baseline/candidate copies and a repository-relative patch. It has not been applied, compiled, tested, built, or run in a native/browser capture. It changes no production source, dist, port, sealed attempt, seed, physics, controller, or camera.

The actual runner path is `src/wave/SurfZoneRunner.ts`. The patch changes only these six existing files:

- `src/wave/barrel/tubeApproach.ts`
- `src/wave/barrel/sweptContact.ts`
- `src/wave/SurfZoneRunner.ts`
- `src/wave/barrel/tubeApproach.test.ts`
- `src/wave/barrel/sweptContact.test.ts`
- `src/wave/SurfZoneRunner.tube.test.ts`

## Runtime scope

`approachNear(request, observation?)` and the final optional `routeForStrip(..., observation?)` parameter instrument the same existing invocation. The ordinary owner still publishes exactly `query`, `floorAt`, and `approachNear`. There is no getter, global sink, second route search, extra cap/station enumeration, counterfactual envelope, or cue/control change. Existing candidate filters, preference/distance/strip sorting, index selection, endpoint deduplication, route acceptance, first accepted early return, and full-height/reduced-height short-circuit remain in their original order.

The request, mature-cap projection, rejection, obstruction offset, and counters are scalar copies. The nearest eligible projection is measured before the existing reach filter; it is explicitly not a validated mouth. First attempt and nearest rejected attempt refer only to attempts already made. Nearest rejected is selected by squared cap-projection distance, retaining the first observed attempt on ties; preferred-front ordering is untouched. Rejection labeling repeats some pure scalar tests such as `Number.isFinite(outer.roof)` and endpoint roof checks. Claims of equivalent execution must be scoped to existing geometry/search/control call ordering and returned cues, not identical scalar predicate evaluation counts.

Runner collection uses only the existing `tubeGuide` path after its existing enabled/standing/attached/contact gate. `tubeApproachObservation` is explicitly cleared by `invalidateTubeApproach`, which existing restore/restart/place code already calls. Status publishes a deep scalar copy only for the current sea time. It does not duplicate the fourteen body witnesses, expose arrays/contact/loft references, or feed the observation back to a controller.

## Bounds

The output contains one request object, one bounded fifteen-key route-rejection histogram, at most one nearest-eligible cap projection, one first attempt, one nearest rejected attempt, and one accepted summary. Each attempt is flat scalars plus one cap object. No attempt history or per-column/per-triangle log exists. Per query, a single mutable route scratch and cap scratch serve every existing candidate. Nearest projection/nearest rejection records are mutated in place; no replacement object is allocated on each improvement. Initial/reset templates, first/nearest/accepted records and detached status copies have a constant object-count bound independent of the number of candidates or columns. Existing candidate and triangle objects gain opt-in scalar fields; their numbers and existing arrays/geometry searches are unchanged. No additional per-route callback is introduced.

`columnCalls` counts all existing route column invocations, including any post-acceptance body-containment columns. `clearRouteCalls` counts only the existing full/reduced envelope calls. `firstBlockingTriangleOffset` and `firstBlockingRouteSegment` record the first actual obstruction in the envelope sweeps. Later body-containment checks neither reject the cue nor overwrite that envelope obstruction record. A reduced-height clearance field stays undefined when the original short-circuit skips the reduced route.

## Authored verification, unexecuted

Eight new test cases are authored in the temporary copies:

1. Three route parity cases using shipped metric geometry: accepted, too tall but reduced-height accepted, and indexed finite-width obstruction rejected. They compare returned cues, constant-size position-read counts/order hashes, and lazy row preparation sequences with and without the sink. Empty-body accepted cases assert exactly two endpoint plus ten-per-station column calls; they assert that reduced-height evaluation follows the existing short-circuit.
2. One reused route-sink early-return test verifies that invalid input touches no position, column, or envelope and clears stale fields.
3. Two eager contact parity cases compare exact exported route call count/order and the original seven arguments for accepted/rejected queries. They also check histogram scope and nested clone detachment.
4. One contact reset test verifies that out-of-reach eligible cap projections never trigger route validation, and invalid/empty generations cannot retain old attempts.
5. One runner plumbing test checks dev opt-in, detached nested scalars, same-time explicit invalidation, prone placement and retry. This is a controlled standing/mock query fixture, not evidence of a paddled tube ride or an executed restore integration.

The position-read receipt is an order-sensitive 32-bit hash plus count, not a collision-free trace proof. Exact returned cue and lazy preparation comparisons, direct column budgets, and route-spy comparisons supply independent checks. Root should apply only after checking baseline pins and run these tests/builds; this directory makes no passing-test claim.

Suggested root check after applying: `npm test -- src/wave/barrel/tubeApproach.test.ts src/wave/barrel/sweptContact.test.ts src/wave/SurfZoneRunner.tube.test.ts --maxWorkers=1`, followed by the normal application TypeScript/build check as appropriate. No command in this paragraph was executed by this agent.

## Interpretation limits

A cap projection is not a mouth. `bodyFitsMouth=false` alone does not reject when the existing reduced-height route clears; `bodyInCavity=false` never rejects. The envelope combines board and body extents; an obstruction does not separately prove which component was decisive. A missing observation from a disabled/ineligible runner is unobserved, not an enumerated failure outcome. New telemetry can diagnose future generations only, and cannot reconstruct the lost V3 geometry or explain its earlier 292 undefined-guide rows retrospectively.
