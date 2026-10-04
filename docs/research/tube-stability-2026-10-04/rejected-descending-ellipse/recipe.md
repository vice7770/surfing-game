# Frozen descending-tip paired ellipse recipe — 2026-10-04

This is ONE scratch-only representation trial. It was defined before evaluation.
The current production 0.25H C-curl is unchanged. Its native normal movie and
frames show a broad shelf, so numerical opening gains have not met the objective.
Native evidence: `/private/tmp/tube-whole-curl-stream-start-20261004/native-first/moving-normal.webm`
and `/private/tmp/tube-whole-curl-native-review-20261004/frame-03.png`, `frame-07.png`, `frame-10.png`.

## Anchors and formation

Retain all points 0..32 and 88..127 exactly, and retain tip64 X AND Y exactly.
A=32, L=64, B=88. Find the highest retained-floor intersection F at L.x using
nonvertical segments88..127 (or through112 for the truncated actual captures).
Orient its unit tangent t toward increasing X; let n=(-t.y,t.x), the upper normal.
H=A.y-F.y. Use the existing global formation recipe, with no clock/frame gate:
R=(L.x-B.x)/(L.x-A.x), reach=smoothstep((R-.15)/.45),
v=clamp(-unit(B->89).y,0,1), m=reach*smoothstep(v).
m=0 returns raw geometry. An active invalid geometric domain is an explicit
candidate failure; it does not silently revert the frame or individual vertices.

## Outer paired sheet and descending roll

Project the original crest-to-lip vector onto the floor basis:
w0=(L-A).t, d0=(A-L).n. Both must be positive.
Let c=crestUnit.n/crestUnit.t; crestUnit uses retained31->32. The captured
32..112 outlines do not retain31, so their outgoing32->33 tangent is used and
that limit is recorded. k=pi/2, f(u)=u*(1-u)^3.

Sheet thickness is T, roll radius r=T/2. Set C=L+r*(n+t), D=L+r*(n-t),
roll centre O=L+r*n, w=w0+r, d=d0-r, K=k*w*c. The outer curve is

P(u)=C-w*t*(1-sin(k*u))+d*n*cos(k*u)+K*f(u)*n, 0<=u<=1.

P(0)=A and P(1)=C. Its incoming tangent matches31->32; its outgoing
tangent is -n. Points32..60 sample u=(index-32)/28. Points60..68 use
O+r*(cos(theta)*t+sin(theta)*n), theta=-(index-60)*pi/8. Thus64=L exactly;
64 is the physical bottom/contact tangent of the rolled tip rather than the
outermost X of its circle. The lip is not raised. Its outermost X may move a
small sheet-radius distance forward. The circle is tangent to the local retained
floor at L, rather than deliberately sinking a half-circle below original64.

Let N=(-P'.y,P'.x)/|P'| in world coordinates. The underside is the inward
normal offset Q=P-T*N. At u=1 it equals D; tangent continuity follows from
offset regularity. This makes one paired water sheet with one thickness, not
independent raised inner vertices or a flat outer canopy.

## Deterministic thickness bound

Nominal thickness is0.10H. Set rMax=min(0.05H,w0/8,d0/8). For every
possible r in[0,rMax], w is in[w0,w0+rMax], d in[d0-rMax,d0], and
K=k*w*c. Partition u into128 fixed intervals. Exact monotone sine/cosine bounds
and polynomial extrema bound both components of P' and P'' on each interval.
Let sLow be the component-box distance of P' from zero and M2 the component-box
upper bound for |P''|. If any sLow=0, the conservative proof fails explicitly.
Otherwise curvature is at most kappaBound=max(M2/sLow^2). Choose
T=min(2*rMax,0.25/kappaBound). Thus T*kappa<=0.25 for the actual curve and
the inward offset has at least0.75 of the source tangent magnitude. This is a
physical bend-radius constraint applied globally, not a coefficient search or
failure-driven thickness adjustment. Bounds are conservative and may produce
very thin early-stage sheets; all such results will be reported.

## Return and throat attachment

bT=(B-A).t. The inner return ends at
uRoot=asin(clamp((max(0,bT)+T)/w,T/w,1-T/w))/k.
Points68..82 sample Q(u), with u decreasing linearly from1 to uRoot.
This starts the attachment at least one sheet thickness forward of the projected
throat/crest, and one thickness before the curl's projected end.
The82..88 cubic joins J=Q(uRoot) to retained B. Its initial tangent is -Q',
its final tangent is retained unit(B->89). Both handle lengths start as chord/3.
The first is capped at T/2, leaving the thin paired sheet through a short tangent
join. The final handle is capped so its control Y is<=A.y-T. Evaluate that cap
as a comparison v*(chord/3)>A.y-T-B.y before division, so near-horizontal
formation never divides a finite height by a vanishing v. A nonpositive ceiling
budget is an explicit invalid domain. This bounds the throat attachment below
the retained crest; numerical paired-surface checks still must test whether it
stays below the actual outer contour and avoids retained-face crossings.

All interior positions33..87, except64, blend raw->target by the same m.
No case/frame exceptions, no post-evaluation coefficient or construction changes.
All-frame factory application is only an offline scope here. No production
module, caches, touchdown clock, tip velocity, contact, build, server or native
instance is changed by this trial.

## Predeclared measurements and acceptance evidence

* Five original native-source saved32..112 projected outlines in actual metres.
* All1,224 raw BRL2 case frames from eight assets, including early, refill, and
  post-touchdown; transformed coordinates rounded to F32.
* All3,648 adjacent-frame samples at.25/.5/.75, interpolated then F32 rounded.
* Every domain/finite failure, proper crossing pair and inherited versus new
  clean-to-crossed/count increase; no collinear/endpoint-volume guarantee.
* Each continuous floor88..112-to-inner64..88 parity-air gap separately. Body
  evidence threshold1.13m with continuous horizontal width>=1.25m; also declare
  generous1.6m gap with the same1.25m width. Never sum disjoint vertical air.
  Case metre conversion7m is illustrative; captured outlines are actual metres.
* Original tip XY bit/coordinate equality, crest/throat/rest retention, lip drop,
  sampled turns, actual paired Euclidean and vertical thickness, roof curvature,
  offset tangent regularity, connection behaviour, and temporal displacement.
* Mature captured thin-sheet plausibility band0.10..0.35m where fitting; compare
  paired thickness and local opening, not nominal thickness alone.

Even a passing numerical corridor cannot establish moving curl appearance,
alongshore continuity, body/board/path clearance, contact state or hydrodynamics.
If this one recipe fails, stop and report the exact geometry cause. Do not tune
or relax targets to manufacture adoption.
