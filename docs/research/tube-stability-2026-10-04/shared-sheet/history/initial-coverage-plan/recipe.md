# Shared upper-root station experiment — declared before evaluation

The copied precision-v4 scalar construction and its coefficients/lifecycle remain unchanged. This is a new authoritative sampling representation of its outer polygon, applied by ProfileLibrary before metric scaling/caching, not a renderer-only lift or thickness repair.

Resolved upper-root vertices80..88 retain their exact v4 coordinates. Require their X to be nonincreasing and their complete actual domain [X88,X80] to lie inside the actual forward outer-roof domain [X32,X60]. Reject any missing domain or negative top/return separation; no clamping, raw fallback or unreported branch. This condition supplies the domain that the previous unsupported40..59/69..88 mapping lacked. It is an explicit representation constraint, not an assertion that v4 proves it for every possible parameter.

Outer points32 and60, cap/root/face/floor60..112 and all outside0..32/112..127 remain exact. Reallocate only outer33..59 in the existing29-point outer block:

-33..39: seven interior uniform-X stations from crest32 to root88's X (eight cells).
-40..48: the exact X of root88..80, in reversed order; topY comes from the original v4 piecewise-linear forward roof at that X.
-49..59: eleven interior uniform-X stations from root80's X to cap attachment60 (twelve cells).

The root/top station40+k ↔88−k has the same F32 profile X. A vertical quantized roof facet uses its highest existing endpoint as the graph boundary; no new branch from the preserved carrier is assumed. Validate every paired endpoint topY≥returnY exactly. Record the maximum envelope height change at the union of old/new roof breakpoints and any coalesced paired stations; this is a change of polygon sampling, not physical equivalence or a new continuous-curve proof. Unresolved v4 contours are left exact, including cap64 and the constant-X connector.

Final projection computes and shares each pair's pre-F32 worldXZ and live-water datum. The existing end×collapse weight and water convergence remain. Deferred contact capture reuses the same coordinates/datum. Existing canonical physical diagonals pair the top40..48 cells with backward-running root80..88 cells; actual contact triangle indices remain authoritative.128 profile points,134 row vertices,40k vertex budget, contact bins and worker packet format stay fixed. Named landmarks32/60/64/80/88/112 retain their physical locations; outer interpolation stations change.

Evaluate the exact prior0.311457153mm Reef witness, all existing focused/legacy consumer checks, fixed provider goldens and full declared original profile groups. New representation tests apply this sampling to the original39+522 goldens and1224+3648 frame/blend queries, retaining failures rather than changing tolerances. Include curved-ray neighboring-row tests and exact common physical triangle/XZ checks. No production, old scratch, native, browser, build, Git or port changes; native and adoption remain root-owned.
