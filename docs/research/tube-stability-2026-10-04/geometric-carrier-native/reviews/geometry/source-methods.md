# Exact indexed loft method

This analyzer reads two completed, frozen native sidecars. Root authorized analysis after session74434 terminated with exit0. It runs offline; it advances no simulation and changes no source, camera, capture, build, browser, port or repository state. Its outputs are derived scientific geometry plots, not native screenshots.

The input manifest validates sidecar SHA256/bytes, labels, active counts, every array descriptor, the active typed-array byte total and exact checkpoint/draw epochs. It rejects capacity words, unsupported/missing arrays, nonfinite indexed geometry and indices outside active words. The source-method manifest pins all sources used below. Input byte pins are rechecked after the analysis.

## Row and contour authority

ProfileLibrary.PROFILE_POINTS is128. sweptLoft.LOFT.extensionSamples is3 and LOFT_SAMPLES is134: each row has3 back extensions, profile0..127, and3 front extensions. sealRuns tapers the existing run rows; it adds no seal rows. The complete active index sequence is reconstructed from the captured sliceJoined edges, captured physical ray and C forward/reverse quad-diagonal rule. It must exactly equal the captured Uint32 index words before contour bands are attributed.

Contour labels are source-index bands: back slope0..31, outer roof32..63, returning lip/underside64..87, inner wall/floor88..111, and forward rest112..127. Band naming describes source geometry and never identifies a rendered material or pixel. Nearby contours are restricted to the unique current-front joined crest-X bracket and two rows on either side inside the same final indexed run.

## Cross-section and cavity

The section intersects every relevant active indexed triangle with worldX equal to the recorded fixed station. Edge intersections are cached so adjacent triangles share the identical point. It retains triangle-diagonal kinks; interpolating entire row contours is not substituted for the indexed section. Coplanar triangles are recorded separately. Proper strict section intersections exclude shared endpoints and coincident contacts, and their Z coordinates join the piecewise-linear breakpoints.

Cavity intervals use sweptContact's exact lower-vertex XZ edge-function and half-open inclusion rule, applied to the actual current-component indexed triangles. Three strictly ordered heights define the air gap between the lowest (floor) and middle (underside) crossing. The eye's three heights must exactly reproduce the native report. For open Z intervals, height limits come from the actual crossing triangles' linear planes. The eye-connected interval supplies horizontal span and maximum vertical air height. This is a geometric air-band measure, not a body's traversable envelope or a raster visibility result. The exterior policy's full128-point contour width includes long tails and is not the cavity width.

Source profile-edge points at the fixed plane are intersections with actual indexed cross-row edges. They supply crest-to-toe span and inner88..92 wall extent. Interior triangle kinks remain separately represented in the exact section.

## Sheet pairing and local shape

sharedUpperRoot pairs upper38..58 with underside126−i (88..68). sweptLoft gives these paired vertices identical X/Z and water sampling. The analyzer measures all21 vertical/separation pairs in each nearby indexed row, not arbitrary nearest points. Zero thickness can be intentional collapse; negative thickness or horizontal divergence would be reported. Lip64 versus floor104 is recorded without asserting a closed body.

Contour80..96 tables report positions, supplied normals, actual adjacent chord lengths, unsigned turn angles, and turn divided by mean chord length. These are discrete polygon curvature measurements, not fitted-circle radii. Normal changes are computed both along the profile and across adjacent nearby rows. A backwards return is an authored overhang; strict nonadjacent intersections are a separate measure.

## Normals and winding

Every indexed supplied normal is reconstructed from sweptLoft's profile central/one-sided difference crossed with its front central/one-sided difference within the final joined run. Length<=1e−12 uses[0,1,0]; the result is stored asFloat32 before word comparison. These are vertex normals supplied to the draw mesh, not fragment normals or G-buffer values.

Face winding is the cross product of the actual indexed triangle edges. Its alignment with the mean supplied vertex normal is reported by contour band, along with exact zero-area triangles. Source convention matters: a flat +Z profile/+X front produces+Y central-difference normals while the source index order produces−Y triangle cross products. Negative alignment alone is therefore not evidence of broken winding, visibility or an incorrect shader. A small global positive-alignment inventory also remains in the report; nothing is silently culled.

## Recorded exterior segment

The initial exterior origin comes from mouth.exterior.eye and must equal the recorded exterior camera.position; the target must equal mouth.exterior.target. It uses the initial snapshot epoch and current front. station-tools.firstHit is mirrored exactly: double-sided Möller–Trumbore, abs(det)<1e−12 rejection, barycentrics in the closed triangle, strict1e−6<t<1−1e−6 segment, and earliest strictly smaller t wins. Math.hypot supplies the distance. Triangle, vertices, rows, fronts, fraction, distance, point and tested count must exactly reproduce the declared native first hit. There is no pose search or new air search.

## Plots and checks

NumPy handles exact geometry, and Python's standard XML tools write standalone scientificSVG. Pillow writes PNG previews from the same axis transform and coordinate series. Matplotlib was unavailable; no installation or browser was used. Eleven plots each have SVG and PNG forms: five per epoch (complete section, cavity detail, paired thickness, root80..96, supplied normal changes), plus the initial exterior ray plan. World geometry plots use equal metre scales; angle/thickness plots label their own units.

Nine in-memory synthetic unit tests cover endian decode/count bounds, exact source index/normal convention, retained triangle-diagonal kink, ray band/segment bounds, half-open vertical crossing/slope, cavity span/height and collapsed roof, strict crossings versus shared endpoints, and unique current station. They are mock fixtures only; no synthetic native sidecar was created. The actual terminal-capture analysis verifies the final CLI output and immutable input pins. This two-epoch analysis proves no temporal stability, body passage, FPS, adoption or pixel ownership.
