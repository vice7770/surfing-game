# Shared leaf correction budget review

Source-only review by mature_camera_review, 2026-10-05. No tests, builds, numerical experiments, native attempts, or production edits were performed for this review. Root separately reported the adversarial regression failure and owns the subsequent correction and checks.

## Actual admitted-domain gap

For finite positive crest-to-toe width W and height H, the current .60/.80 profile uses

    B = min(.06H, W/16, .1 min((.85W)^2/H, (.4H)^2/(.85W))).

The fully formed airborne outer leaf endpoint has crest-relative reach

    R = .98W - 2B + saturatedDelta.

The old correction budget was B, so negative saturation approaches R = .98W - 3B. This loses the original .85W lower-bound premise whenever B/W > .13/3. That range exists in the admitted domain: W=1, H=1.6 gives B=.04515625 from the width-squared bound and an old saturation-limit reach .84453125. Valid positive incoming/outgoing x tangents do not exclude this width/height ratio.

This is also not categorically excluded by the provider's centered width mean. A fully enabled interior width peak of 1 between positive neighboring widths .1 has centered piecewise-linear mean .55 and raw correction -.45. Thus positivity of neighboring carrier widths alone does not imply the correction is too small to spend the missing curvature reserve. Actual asset occurrence was not measured here.

Root reported its old-candidate regression reached outer point60 x=.844531238 against the test minimum .8499998 without throwing. This is evidence of the missing reach guarantee, not a demonstrated contour intersection or native visual failure.

## Shared correction

The root-applied change at boundedCProfile.ts:65 is the largest symmetric correction budget that preserves both the original toe-side allowance and the fully formed reach premise:

    C = min(B, (.98-.85)W - 2B)
    Delta = C * requested / (C + abs(requested)).

Since B<=W/16, the second budget is at least .005W>0. For |Delta|<=C, R>=.98W-2B-C>=.85W. Because C<=B, positive correction also retains R<=.98W-B<W. No reduction in the original B/thickness is necessary. Computing this in ordinary() uses the final current crest/toe parameter domain, including case blends, and is shared by full profile construction, cap queries, and event construction.

Zero requested correction remains exactly zero; in particular, the final authored-hold enable=0 leaves the prior event geometry untouched. Saturation is C1 in the requested correction for fixed current W/H/B. This does not establish a C1 trajectory in time: the carrier parameters and minimum budget branches have their own regularity.

The reach statement is about the fully formed airborne leaf endpoint. Before full formation, roof() mixes the original midpoint K0 with that endpoint; its reach need not be .85W, and the original partial-formation thickness scaling remains a separate premise. Float32 output can round the real-number boundary slightly below .85W, so the regression must allow coordinate rounding; the current origin-zero unit-width tolerance is appropriate to that fixture, not a universal world-coordinate error bound.

## Regression and coverage

The new direct regression in boundedCLeafReach.test.ts, 'keeps the original leaf domain under extreme reach corrections', has the substantive adversarial fixture: its x scale makes W=1 and y scale gives H=1.6; tau=.625 with TD=1 is fully formed before fall. Negative extreme correction exposes the old gap, while zero/positive cases check ordinary behavior and toe room. It also checks finite output and the preserved toe-floor y equality. This directly exercises the corrected budget rather than depending on a representative asset that happens to have smaller B/W.

The existing 1224-frame/3648-interpolation direct bounded-C sweep supplies no leafWidthDelta, so it covers the default correction=0 path. The new library checks sample representative lifecycle times and a case blend; they are useful consumer parity checks but do not cover every corrected authored frame or every interpolation/time. The mathematical cap establishes the stated reach budget over the finite valid analytic domain; it does not upgrade those checks into a global corrected-contour or complete runtime guarantee.

No additional source change is recommended for this concern beyond root's current shared budget and adversarial regression. Existing offset-curvature, monotone sheet, root/floor, and consumer checks remain necessary for the other geometric invariants.
