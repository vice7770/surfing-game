# Frozen descending Hermite / discrete-facet sheet — 2026-10-04

ONE new structural representation trial, offline only. Rejected ellipse and
current production0.25 source bytes remain unchanged. No parameter grid, frame
exceptions, time gate, raw-vertex morph or fallback after invalid construction.
This full recipe is written before candidate measurements.

## Fixed anchors and complete formation model

Retain32=A,64=L original X AND Y,88=B and all0..32/88..127 points exactly.
W=L.x-A.x, D=A.y-L.y must be positive. Zero/negative W or D is an explicit
invalid domain and will be retained in results, not repaired silently.
R=L.x-B.x must be nonnegative. Formation m=smoothstep(clamp((R/W)/0.6,0,1)).
There is no descending-face gate. The same model reconstructs every frame,
including zero reach. At R=0 the original L/B anchors must coincide in X/Y;
the interior65..87 collapses to that same point and thickness is zero. The
ordinary non-curl outer32..64 is still reconstructed, explicitly changing old
surface geometry; its displacement, joins and crossings will be reported.

The geometric model changes shared curve parameters as reach grows. It NEVER
blends old and new vertex arrays. Exactly preserved64 is the original material
tip; it is not asserted to remain the lowest lip point or geometric floor impact.

## Convex forward cubic Hermite roof

Use incoming31->32 tangent; captured32..112 outlines lack31 and explicitly use
outgoing32->33 instead. Let slope=ct.y/ct.x, which requires ct.x>0.
Use the true retained B->89 unit tangent bt. Ordinary forward roof angle is
thetaOrd=atan2(bt.y,abs(bt.x)); reflected X keeps the reconstructed roof forward,
and any ordinary end-tangent mismatch is recorded. P1=A+(W/3,slope*W/3).
The required convex secant angle is
thetaConvex=atan2(-(D+slope*W/3),2W/3). Its numerator must represent a positive
drop; otherwise the fixed root-handle convex domain fails explicitly.
thetaBase=min(thetaOrd,thetaConvex), thetaTip=(1-m)*thetaBase-m*pi/2.
Let e=(cos(thetaTip),sin(thetaTip)). Tip handle h starts at D and is capped by
2W/(3e.x) when e.x>0 and by (D+slope*W)/(slope*e.x-e.y) when that denominator
is positive. These are exact control-polygon constraints, not tuned coefficients.
P2=L-h*e. Sample the cubic [A,P1,P2,L] at u=(index-32)/32.
Its control polygon is forward and clockwise; the roof has a descending lip
at original64 and a high curved arch, without the floor-normal-depth ellipse
restriction. Round its interior33..63 to F32 FIRST; paired geometry reads those
actual stored facets, not an unrendered smooth curve. Preserve A/L exactly.

## One discrete paired sheet with finite thickness

Let v_i be each unit output roof-facet tangent and n_i=(-v_i.y,v_i.x), the outward
normal. The unit-thickness inward miter displacement at an interior vertex is
d_i=-(n_prev+n_next)/(1+n_prev dot n_next). End displacements are -n_first
and -n_last. Zero facets or opposite adjacent normals are explicit failures.
Q_i=P_i+T*d_i. Each Q edge is parallel to its SAME discrete P edge.

For roof edge length ell and a=dot(d_next-d_current,v_edge), a<0 means that
offset edge shrinks. Its thickness budget is0.25*ell/(-a); a>=0 has no shrink
budget. This guarantees at least0.75 of each source edge length, so the paired
discrete path cannot fold locally. It is not a continuous normal offset sampled
at an unrelated parameter spacing.

At L.x find the highest retained-floor88..127 intersection (through112 in
captures), with H=A.y-floorY>0. Desired thickness is0.10H*m. Physical ceiling
Tmax=min(W/8,R/4,all edge-shrink budgets). Float32 representability floor is
Tmin=8*ulp32(max absolute original Q/Y coordinate). If Tmax<Tmin, record an
unrepresentable fixed-anchor domain; do not change anchors, fallback or invent a
frame exception. Otherwise T=min(Tmax,max(desiredThickness,Tmin)). This is an
explicit global finite-precision floor, with its subvisual formation jump recorded.
For R=0 thickness stays zero as already declared.

Every Q vertex must lie within all roof-facet halfplanes with margin T/2:
n_i dot(Q-P_i)<=-T/2. These finite output-facet checks also protect against
Float32 nonconvex jitter or nonlocal miter failure. Failure is recorded explicitly.
T is not subsequently reduced or retuned to pass those checks.

## Rolled tip and distributed C1 throat attachment

Original64 begins a clockwise semicircle of radius r=T/2, centre O=L-r*n_last,
sampled at65..70 with angle phi=(index-64)*pi/6:
O+r*(cos(phi)*n_last+sin(phi)*v_last). End70 equals Q64 exactly. It matches the
actual stored last roof facet, and its end tangent matches the reverse Q path.
The cap can lie BELOW original64 and can contact the retained floor earlier
than original64. Minimum cap-to-retained-floor gap and last-clear/TD traces are
mandatory measurements; authored TD is not treated as geometric impact.

Choose J on the monotone Q path at qRoot, where
qRoot=clamp(max(B.x+T,Q32.x+T),Q32.x+T,Q64.x-T).
Traverse Q backwards from Q64 to J. Attach a cubic J->B with initial tangent
the reversed Q facet and final tangent true bt. Both handle lengths start at
|J-B|/3. Clip each along its own ray against ALL shared roof-facet halfplanes
with margin T/2; require B itself in the same halfplanes. Also cap the final
control X<=J.x-T/2 when its ray would advance right, keeping the entire cubic
on the root side of the paired return. Any nonpositive feasible handle is an
explicit topology/domain failure, not a silent sharp-joint replacement.

The return and attachment share one arc-length table: exact Q facets followed
by64 fixed subdivisions of the cubic. Sample this path into18 equal-length
segments for70..88. There is no forced82 junction or T/2-short first handle.
The attachment's controls lie inside the convex region beneath shared roof
facets; their cubic and sampled chords stay there. The return sampling chords
also remain within that region. Source endpoint derivatives are C1, but actual
sampled turns and retained-floor crossings must still be reported.
Round inner65..87 to F32 after construction, preserving L/B exactly.

## Frozen evaluation scope and orders

* Five actual saved native-source32..112 projected outlines in metres.
* All1,224 raw frames from the eight exact BRL2 asset receipts, including early,
  zero-reach, formation, refill and postTD. No production factory imports.
* All3,648 fixed adjacent samples at.25/.50/.75. Proposed authoritative order
  is raw-frame interpolation F32 -> this joint construction -> output F32.
* The SAME recipe's pretransform-F32-endpoints -> interpolation-F32 order is
  measured as an integration-order diagnostic on the SAME3,648 grid, not another
  candidate. All invalid endpoints and invalid interpolated domains are retained.
* Proper crossing pairs versus paired originals; inherited versus new clean
  crossings/count increases; finite values; new zero edges; exact preserved
  anchors/rest; output facet margins/edge regularity; thickness and sampled turns.
* Each separate floor88..112-to-inner64..88 parity-air interval, with continuous
  width>=1.25m at gap>=1.13m AND separately at>=1.60m. Never combine disjoint
  vertical gaps. Case7m conversion is illustrative; actual captures are metres.
* All zero-reach surface displacement and joining behavior; negative/zero anchor
  domains; minimum cap-to-retained-floor gaps; original-held/last-clear and
  authoredTD neighbour traces; tip velocity/material64 unchanged but other flow
  and true impact semantics not assumed unchanged.

This recipe belongs after profile interpolation when joint output-facet
constraints matter. Fresh geometry-derived per-case caches would still need
the SAME construction before their measurements. Case/time blending of already
transformed geometry does not automatically preserve the pair, tangent or margin
constraints. Shared consumer readiness, performance cost, 3D continuity, moving
curl appearance, entry and body/board contact require later implementation and
native validation; none are claimed from numeric results.
