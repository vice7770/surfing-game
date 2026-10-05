# Offset prefix plus one return-to-floor cubic — frozen source design

2026-10-05. Source analysis only. No profile, distance, derivative root, numerical fit, test/build or native run was executed for this note. No runtime/test/audit file was modified. **Hold runtime edits:** the source supplies a viable construction and conditional feasibility criteria, but does not establish full T/2 clearance for every legal phase with fixed J/F0. Failure of a conservative corridor certificate must not become a dropped age, RAW fallback, vertex clamp, reduced thickness or weakened clearance gate.

## Read evidence and source pins

The preserved V1 receipt records clearance failures 29/217/264/265 and paired-separation failures 218/359. The V2 receipt records ten phase376 failures: paired separation at 29/217/218/264/359 and clearance at 76/123/170/265/311. These are existing recorded results; no distances or profiles were recomputed. Root reported strict compilation passed and geometry14/15 for both drafts. They do not demonstrate feasibility or infeasibility of the structural alternative below.

SHA-256 sources/evidence read:

| Artifact | SHA-256 |
| --- | --- |
| `/private/tmp/tube-C-single-inner-contour-20261005/source/src/wave/barrel/boundedCProfile.ts` | `0dba650afc9844df79c1beb61319bddbc257562c0f93ff083fe3838e0cebbd98` |
| `/private/tmp/tube-C-single-inner-contour-20261005/source/src/wave/barrel/sharedUpperRoot.ts` | `d9a57460bca867f392b6c6986414f66ed0aa8e7ed8be7bd9bb99b326e673e15a` |
| `/private/tmp/tube-C-two-branch-inner-contour-20261005/source/src/wave/barrel/boundedCProfile.ts` | `31e1a55524536b63207bb745ed860881e3ad8565efaa180f2ef8a8f07dcd9e45` |
| `/private/tmp/tube-C-two-branch-inner-contour-20261005/fullsheet-query-receipt.json` | `585b0904c7e18f91f41eb29d417bad7387465f7e3c46bd479496b5b1a9763edc` |
| `/private/tmp/tube-C-two-branch-inner-contour-v2-20261005/source/src/wave/barrel/boundedCProfile.ts` | `9adb31158319636dbf79beb52b25d162164c7ba2c9f8671c57d4ee646ed39a94` |
| `/private/tmp/tube-C-two-branch-inner-contour-v2-20261005/fullsheet-query-receipt.json` | `6f313d150d74b052b52f4b5cb438750b6e234de61424f03d6905f1174944d07d` |

The single-inner parent contains the offset construction at151–155, old circle/face root at100–114, floor/plateau at156–158, and existing arc-length sampling at78–81. sharedUpperRoot40–63 defines actual pairing and its domain guards.

## Concrete construction and what it preserves

Use the original current P/V/N/Q calculation, qJ cut, actual J and the original `chain=[Q28,Q27,...,J]` with `arcSample(chain,12)` for indices68..80. Retain original rounded cap60..68, lifecycle, thickness law/precision-collapse branch, carrier prefix, F0 at102, plateau102..106 and tail106..112. Change only the resolved shared-provider return81..101; index80 remains J. RAW/unpaired mode and all collapsed construction remain unchanged.

Set unit tangents `u=-V[e]`, `p=pv`, positive lengths alpha/beta and one cubic:

```text
C0=J
C1=J+alpha*u
C2=F0-beta*p
C3=F0
B(t)=(1-t)^3*C0+3(1-t)^2*t*C1+3(1-t)*t^2*C2+t^3*C3.
```

The underlying miter facet ending at J is parallel to -V[e], so this supplies analytic G1 there, and `B'(1)=3*beta*p` supplies analytic floor/plateau G1. These are not claims of exact finite-chord G1 after sampling/Float32 rounding. `arcSample` can skip miter corners: its final stored segment79→80 is parallel to -V[e] only when it lies entirely in the terminal offset facet. Keeping that sampling verbatim cannot promise exact polygon-seam tangent equality for every input.

Retaining inner68..80 also retains paired roof46..58, because `j=126-i`; roof59/cap60 stay unchanged. New roof38..45 pairs the new return88..81, and the crest-prefix33..37 depends on its new minimum X. Consequently root's recorded V1 closest outer52/inner73 and outer46/inner79 involve segments/coordinates restored to the old offset-prefix construction, conditional on identical input/J/rounding. A new lower return can still approach these preserved roof facets, so this equality is a structural rationale, not a clearance proof.

## Exactly one minimum X and complete paired domain

Let delta=F0-J. In the nondegenerate domain `u.x<0`, `p.x>0`, alpha/beta>0:

```text
B'(t)/3 = (1-t)^2*alpha*u
        +2*t*(1-t)*(delta-alpha*u-beta*p)
        +t^2*beta*p.
```

The X derivative is a quadratic negative at0 and positive at1, hence has exactly one simple root tStar in(0,1), with negative X derivative before and positive after. This proves a single minimum-X station, not its height, downward tangent, clearance or a simple closed contour.

Place index88 at `B(tStar)`: sample81..87 in(0,tStar),89..101 in(tStar,1), and keep exact endpoints80/102. Then68..88 has nonincreasing X, since the original Q chain is forward-X monotone before reversal. The sufficient control-domain constraints are:

```text
0<alpha <= (J.x-crest.x)/(-u.x)
0<beta  <= (F0.x-crest.x)/p.x.
```

Together with J.x/F0.x>=crest.x, they put the entire cubic control hull at X>=crest.x. Original cap X supplies the right paired-domain bound. Actual Float32 monotonicity/endpoint coverage must still pass sharedUpperRoot's existing guards; do not repair a failed bound by clamping vertices.

The old legal shared root provides useful exact-arithmetic endpoint room, not a new certificate: `R>=T/2>0`, `U.x=J.x-R*(1+sin(oldBeta))>=crest.x`, and u.x<0 imply J.x>crest.x. The old lower endpoint has `E.x=U.x+R*(1+sin(floorAngle))`; with p.x>0 and the root's permitted floor angle, this increment is positive. Since F0.x>=E.x, F0.x>crest.x. Thus the two X-only upper bounds can be positive. Degenerate/tied Float32 domains still need actual evidence; existing legal ages may not be discarded because this sufficient bound is conservative.

Require `B'_y(tStar)<0` and nonzero for the intended downward wall. Also check return/prefix self-intersection, winding/area and hollow aperture: one minimum X alone does not prove these. Fixed endpoints and tangent rays leave two handle degrees of freedom; no source law uniquely selects them.

Linear remapping over8/14 intervals preserves analytic G1 at88 but is index-C1 only if `tStar/8=(1-tStar)/14`, i.e. tStar=4/11. If index-C1 is needed, a monotone Hermite remapping can use average index slopes dL=tStar/8,dR=(1-tStar)/14 and shared slope rho=2*dL*dR/(dL+dR). Left map controls `[0,tStar/3,tStar-8*rho/3,tStar]`, right `[tStar,tStar+14*rho/3,1-(1-tStar)/3,1]` are ordered because rho<=2*min(dL,dR). It makes the same geometric cubic index-C1 at88 without relocating vertices by a clamp. It does not fix geometric clearance or ensure index-C1 at80/102.

## Own clearance constraints, not an inherited circle certificate

Let d=T/2. Outer obstacles must be the **actual finite stored** roof/carrier segments, with their endpoint caps. Old root100–114 certifies its circle/face geometry only. Its carrier guard is a vertical shift by d, which is not itself a general Euclidean-normal clearance d for a sloped carrier. None of those old bounds automatically certify the new cubic or the later paired roof.

A constructive sufficient route is a convex corridor K, derived from actual obstacle segments, wholly outside their d-neighbourhoods and containing J,F0 plus the proposed tangent controls. If `K={x:n_k·x<=c_k}`, impose:

```text
n_k·J <= c_k; n_k·F0 <= c_k
alpha*(n_k·u) <= c_k-n_k·J
beta*(-n_k·p) <= c_k-n_k·F0.
```

These inequalities give explicit positive handle intervals (upper or lower bounds according to coefficient sign), alongside the X-domain bounds. The Bezier and every chord joining its sampled points lie in its control hull, hence in K. This is a genuine sufficient clearance certificate **if** K is independently shown d-clear of each actual obstacle; four controls merely below pointwise roofHeight values are insufficient for a nonconcave graph.

For a finite segment S=[A,B], an explicit separating-axis certificate is `max_i(n·Ci)+d <= min(n·A,n·B)` for unit n oriented toward S. It ensures Euclidean separation from the entire segment, including endpoints. Imposing all facet-line extensions on the whole cubic can be unnecessarily infeasible. Instead split B by de Casteljau into local subcurves; for every subcurve and every obstacle, use an appropriate separating axis and the same inequality on that subcurve's controls. This permits different local corridors without changing the curve or weakening d. Failure of one chosen separating axis/subdivision is a certificate failure, not proof that the cubic cannot fit.

Pairing creates new roof chords in38..45 and the crest prefix. Constraints against the unpaired original P alone must not be advertised as a certificate for those new chords. Certify the completed paired roof separately, or derive an envelope that provably bounds all the new sampled points/chords. Preserve all-query gates for the unchanged prefix, cap, plateau and tail too, since their clearance to the changed roof can differ.

A conditional existence theorem is useful before fitting: if a fixed reference corridor around the full J→F0 chord has strict clearance d+mu, with mu>0, and a valid independent paired-roof/carrier interpretation, then controls with alpha,beta<mu remain within the convex mu-neighbourhood of that chord; the complete cubic/sample chords retain clearance>d. Intersect with the positive X-domain intervals. This proves positive tangent-handle clearance feasibility **under that margin premise**. It does not automatically prove the downward-wall/simple-contour constraints. An old legal detouring circle/face path does not establish the chord/corridor premise, and an unsafe chord does not prove that all nonzero-handle cubics are impossible.

If a source-derived starting shape is needed after feasibility evidence exists, the old circle geometry supplies nominal tangent lengths `alpha0=(4/3)*tan(spanU/4)*R` and `beta0=|F0-E|+(4/3)*tan(spanL/4)*R`. These reflect the old tangent arcs plus floor lead, rather than an invented gain. They are only a geometric reference; their controls and the single cubic need the new constraints above. Acceptance must come from an independently feasible handle domain, not repeated hand-tuning of these lengths or reuse of the old circle certificate.

## Obstructions and required root evidence

Concrete fixed-endpoint obstructions: actual J or F0 clearance<d makes every such cubic invalid; J.x<=crest.x with u.x<0 makes every positive initial handle leave the paired domain locally. If every d-clear local corridor at J excludes the u ray, or every one at F0 excludes the -p ray, a positive tangent handle cannot fit that corridor. A conservative corridor failure alone is not a global impossibility proof. Likewise no observed legal old root implies that its replacement's control hull is safe.

Before a runtime draft, root needs bounded numerical evidence for the legal phase domain: fixed endpoint clearance and X room; a positive feasible alpha/beta region with complete finite-segment/capsule or local-hull certificates; actual tStar/minimum/downward-wall conditions; full return/prefix/plateau self-intersection and hollow aperture; and a completed authoritative paired roof for both separation and unchanged d clearance. Float32 errors require a derived rounding budget or certification of the actual stored geometry, not a relaxed tolerance. If feasibility remains unclear, preserve this note and hold edits. No global quality/native claim is made.
