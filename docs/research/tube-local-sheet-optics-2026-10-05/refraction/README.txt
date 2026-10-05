Fixed offline sheet-refraction comparison, prepared source-only 2026-10-05.

No execution, syntax checks or numerical experiments occurred during preparation.
Root reviews and executes directly:
  python3 /private/tmp/tube-c-sheet-refraction-audit-20261005/refraction-audit.py --run

Default invocation is a no-op. --run writes exclusive analysis-first.json only
in this fresh directory, never overwrites an existing output and starts no
browser/server, simulation, build, port probe or production change. The prior
ray script's pinned definitions are loaded without pycache writes or invoking
its main block. Existing sources, captures and human preview4314 are preserved.
Bounds: 30 seconds via monotonic checks plus SIGALRM, the same five prior nearest
geometric candidates, <=8 second-ray candidates each, one JSON <=2 MiB, no media.

The completed parent ray result is byte-pinned:
  /private/tmp/tube-c-mature-sheet-ray-audit-20261005/analysis-first.json
It supplies the existing canonical camera/epoch and center, right-center,
lower-right, top-right and left-center candidates. There is no new selector,
pose search, candidate ranking by colour or trajectory/controller audit.

Comparison1 reproduces current frozen shader approximation from base normals:
each row's outer chord40->60 yields across/up, then lipAcross=-up/length and
lipUp=across/length (zero chord fallback0,1). RayX/Z and chord components are
rounded to their actual Float32 upload, barycentrically interpolated as vec4,
then the far outer normal is normalized from [v.z*v.x, v.w, v.z*v.y]. Entry
incident is -waterV. GLSL eta literals are0.750188 at entry and1.333000 at exit.
The source far inward normal keeps outerN when dot(entryN,outerN)>=0, otherwise
negates it. The refract-produced inside vector passes directly to exit refract.
The strict gate requires dot(inside,farInwardN)<0 and length(outgoing)>0; TIR is
the zero vector, and the shader fallback sky ray is the original incident ray.
This audit uses CPU doubles, not exact GPU arithmetic, and pre-chop/ripple
entry normals, not the live fragment normal or actual shader transmission gate.

Comparison2 reconstructs the generic source sheetAcross opposite-run search
on final stored rows. Inner points65..87 search outer segments32..63; outer
points33..63 search inner segments64..87. Segment projection clamps t to0..1,
strict squared-distance minima win and exact ties choose the lowest segment.
It reports the paired segment's tangent normal and interpolated stored loft
normal separately, then a barycentric blend of per-entry-vertex paired normals.
The original query-profile/table foot is not serialized; this is not the exact
nearest-foot mapping at the interior hit. Inner sheetBack is source constant1.
The separate conditional C sharedSheet index mapping68..88->126-i is reported
with its flag unavailable; it is not substituted for generic sheetAcross.

Comparison3 traces the base-normal air-to-water direction through all exact
indexed active loft triangles, retaining the nearest candidate beyond1 micrometre
and up to3000m plus up to7 farther candidates. Only geometry direction is
normalized for distance; the original inside vector is passed to exit refract.
No origin shift or front/profile filtering hides nearby interfaces. Candidate
positions, rows/fronts/profile indices, raw/paired winding, vertex normal
interpolants and fields are reported. Exit refraction is compared using the
source entry-normal hemisphere rule and separately normals facing the incident
ray. These are diagnostic conventions, not proof of actual water membership.

A geometric candidate may be discarded or be a different surface/front. No
closed water volume, second physical air/water interface, GPU raster coverage,
global XZ mask/dither/stencil, other-surface depth, final chop/ripple, lighting,
environment sampling, attenuation or outgoing-ray sky visibility is certified.
Positive alternate base transmission alone cannot prove the dark wedge cause.
The left-center candidate may be a non-sheet wall; its hypothetical comparison
retains the actual sheet weight and pairing-unavailable reason.

Source-only review of the frozen pairing/chord/refraction APIs identified the
above distinctions before preparation. Root owns final script review, checks
and actual result interpretation. No quality, mouth, passage, gameplay or FPS
acceptance and no production lighting change are made by this preparation.
