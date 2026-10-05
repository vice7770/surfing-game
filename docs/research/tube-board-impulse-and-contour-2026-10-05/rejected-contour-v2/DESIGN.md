# Thickness-scaled cap handle: source-only V2

This fresh source is a literal 588-input copy of frozen V1, changing only `boundedCProfile.ts` and the existing `sharedUpperRoot.test.ts`. V1, its failed legal cases, production and preview work remain untouched. No geometry, test, build, native, resource or probe execution was performed for V2.

V1's actual root check passed strict TS and 14/15 geometry cases. Its full 6447-query gate retained six legal phase-grid failures:29,217,264,265 below the unchanged T/2 actual clearance bound, and218,359 with negative paired separation. The actual closest stored segments were outer52/inner73 for29,217,264 and outer46/inner79 for265. Pairing exceptions can partially rewrite `after`; those arrays are not authoritative completed paired polygons. The failures motivate an upper-branch refinement but do not establish which handle caused them.

The sole geometric change is:

    V1 hc = min(terminalOffsetFacetLength, upperChord/3, upperWidth/(-3*ux))
    V2 hc = min(T/2, V1 hc)

The unchanged rounded cap has radius T/2, and its unit tangent is `u=-V[27]`. Therefore the first upper control stays within that local cap-radius ball around unchanged cap68. Post-impact T follows the existing requested thickness `B*remaining²` and precision gate. A terminal roof sampling facet need not vanish at that rate; V1's handle had no O(T) bound. The unchanged upper-join handle already has one through `hu <= KAPPA*R` and `R <= 4*T`.

Resolved T is positive, so adding this positive bound preserves the existing nonzero cap tangent and ordered control X values. Both retained endpoints, minimum-X join88, plateau102..106, tail107..112, lower branch, common14/20 join ratio, lifecycle/collapse paths, carrier-prefix domain rules, authored roof/cap controls, and original unpaired v4/RAW routes remain as in V1. `innerContour` and the test receipt label identify V2. The new return stations can alter paired outer sampling and shared render/contact/air/optical geometry; no unchanged-geometry claim is made.

This is a bounded handle prototype, not a whole-spline clearance certificate. Distance to a fixed set is 1-Lipschitz: **if** unchanged cap68 has actual roof/carrier clearance at least T, a control within T/2 has clearance at least T/2 before rounding. Source establishes cap68's T normal offset from the terminal roof facet in unrounded construction, but not T clearance to every other finite segment or to the later paired roof chords. The cap-radius bound consequently does not certify control2, the whole cubic, sampled facets, noncrossing, Float32 ties, resampled roof separation or all legal lifecycle ages. A global facet-line halfspace corridor can also be infeasible for fixed endpoints under a nonconcave roof, so no such unsupported certificate is claimed.

All four existing shared-sheet cases remain, including every6447 query, actual positive stored-segment clearance, unchanged T/2 threshold/Float32 allowance, nonnegative paired separation, exact Reef column,40 precision switches and actual shared triangle footprints. No query, age, fixture, assertion or threshold was dropped or relaxed. Only their output paths and candidate label change to this fresh directory. No clamps, RAW fallback, retries, color/gain/shader edits or new test family were added.

Root must run the complete strict and geometry gates after the active observer native capture closes. Any remaining legal failure must be retained and refined. Tube quality, a wider mouth, ordinary standing, performance and adoption remain unproven.
