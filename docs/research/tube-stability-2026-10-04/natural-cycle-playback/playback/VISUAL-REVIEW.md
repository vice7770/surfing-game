# Read-only visual review

The saved natural-cycle playback is valid, with all42 frame/view metadata comparisons identical between baseline and candidate: captured inputs, cameras, sampled fog predicate, local selected bracket, and complete drawn position/index hashes. This establishes controlled renderer inputs and lifecycle continuity. It does not establish a convincing interior camera or acceptable tube shape.

I inspected the original baseline/candidate close-camera launch and touchdown PNGs. Both launch images show the same large teal/blue overhead sheet, foam pattern and exposed sand/bed. The candidate does not introduce a gross new shape in these images. Both touchdown images show mostly flat water and sky. The images alone cannot attribute the overhead surface to the selected point's primitive, nor establish why its curled part is no longer prominent.

At launch the fixed close camera is(-31.90008493528543,.9189809322357178,-159.0299284327788), while the actual SnapshotSampler.heightAt is .9436585972430667. The camera is .0246776650073489m below that sampled raw height, within the actual .1m cameraBelowSurface margin; false/no underwater fog is the correct production predicate. No fog override exists. All21 actual captured tube-table counts are zero. The actual `PlungingLip.writeTubes` excludes swept strips (src/wave/PlungingLip.ts927–928), so camera heightAt adds no separate legacy carve. Swept drawing still receives the captured front stream and real authored cases. Zero tube-table count is not zero swept geometry or missing physical strip evidence.

The close camera was fixed using the selected strip's launch horizontal ray:1m along ray,−4.8m along tangent, and y=the physical tube.y+.35. Those calculations match the source metadata; they place an oblique camera near the solver water, not a proven mouth/interior camera. The launch physical tube length.347727m, width.174780m and span2.005486m do not bound the drawn authored/interpolated loft or prove that the camera occupies its cavity. The chosen point's launch bracket also straddles open/prevertical phases1/0, so this is an early natural opening rather than a mature prescribed tube view.

By touchdown679 the selected x/z moved3.269306m shoreward while the camera stayed fixed. The recorded reference at x=-27,z=-155.9314081758774,y=.6 is still inside the view (NDC .3319486,.0101188,.982199). That projection uses an arbitrary fixed y=.6; it is not a primitive envelope. The local joined bracket remains present with phases2/1 and weights.547408/.776542, and the actual material observer records crashedAt/strip closedAt. Consequently “the curl left the camera” is not proved by these diagnostics, and the flat-looking image is not evidence of physical point/strip disappearance. At684 strip2 is truly absent and the selected local bracket is null while point3 and other front geometry survive. The close-camera retirement PNGs are byte-identical. Whole-scene emptiness is not required.

This run is useful as a small natural material lifecycle playback and a limited exterior/motion comparison. The close view is insufficient to judge interior continuity, cavity shape, a mature BigPadang barrel, camera collision logic, rider/contact response, or live GPU physics. The overhead sheet/bed observation remains visible in both arms; no speculative material-shader, physics, camera API, or GPU-cause diagnosis follows. Renderer fallback remains independently subject to the parent's performance hold and visual review.

Original report: `/private/tmp/surf-tube-natural-playback-20261004/root-native-authority-fixed/report.json`,274084B,SHA256 `1c7de6887101a9069673cbde98782b6352e4e55f43d1abd7d918d589d6e1dd02`.

Inspected original PNGs (all1920×1080):

| Path under root-native-authority-fixed | Bytes | SHA256 |
| --- | ---: | --- |
| baseline-view1-step664.png | 577311 | 4be599ed692e32829c23492beccf140814174e6355005affd07b06b8b9fd794e |
| candidate-view1-step664.png | 575649 | 997c527c6956dfcab3363fca1866d1eabe28966ea5fce1dd4c26cfae2eec1977 |
| baseline-view1-step679.png | 392708 | 537f9cbd975e5556a4f53470a64d5154a7f141ea95b458df4e459d0bc0ab91e5 |
| candidate-view1-step679.png | 392379 | 13e1c3bb44f8e47c158e4614d42a43047b04017ae3aa5ec7eeb66e23e1b40d51 |

The16 matched checkpoint image aliases total16978280B (before exact-byte dedup), below the20MB archive bound. The42-frame candidate sequence remains externally hash-bound. `visual-review.json` records exact paths/hashes for every retained checkpoint, camera witnesses and the metadata comparison, without altering any image.
