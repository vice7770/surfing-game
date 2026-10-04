# Carrier support: actual indexed loft analysis

The two recorded sections contain a hollow cavity with a rounded upper return and a long straight inner wall. The actual cavity is roughly as wide as it is tall; the 24 m full-tail contour used for the exterior camera policy is not cavity width. This analysis does not justify an arbitrary width reshape.

| Actual recorded epoch | Initial(step 0, front 106) | First phase2 checkpoint(step 47, front 120) |
|---|---:|---:|
| Fixed station X(m) |16.161534309387207|16.161534309387207|
| Eye-connected three-crossing cavity horizontal span(m)|2.496147155761719|2.511417060521495|
| Maximum vertical air height(m)|2.868026966527971|2.674753792234562|
| Span / maximum height|0.8703360132|0.9389339190|
| Actual crest→toe horizontal span(m)|2.920578002929688|2.924477727608689|
| Actual crest→toe vertical difference(m)|3.153142139315605|2.953964933211829|
| Exactly vertical inner contour88..92 span(m)|1.692149698734283|1.503085312724739|
| Current joined bracket rows/t|88,89 /0.5|90,91 /0.995591304790511|
| Nearby indexed rows|86..91|88..93|
| Strict crossings in actual fixed-X section|0|0|
| Strict projected self-crossings in nearby row contours|0|0|
| Paired upper/underside horizontal divergence(m)|0|0|
| Nearby paired vertical thickness range(m)|0.1770298481..1.0516195893|0.1093778610..1.0502219796|

Profile 88..92 has exactly constant horizontal coordinates at the selected plane. Profile 80..88 supplies the upper bend; profile 92..96 supplies the floor fillet. In the phase2 bracketing rows 90/91, the largest adjacent supplied-normal changes around 80..96 are24.8077° at 94 and23.6205° at 95. The largest cross-front normal change in all six nearby phase2 rows is22.8444° at 87 between 88/89. Full chord, curvature and normal tables are in actual/analysis.json. This identifies actual geometric facets and a straight wall; it does not assign the visible green wall, dark crease, curtain or fins to a particular pixel source.

The first phase2 label is the recorded checkpoint name. Its bracket has row 90 in phase 2 and row 91 in phase 1; the selected station is almost at 91. This is not a claim that every local row has collapsed or entered phase 2.

All 31,122 initial and 39,634 phase2 triangles match the source C index sequence. Every supplied normal at all 15,946/20,234 indexed vertices reconstructs with zero Float32-word differences. The local six-row inventories have 54/42 exact zero-area triangles among 1,330 each and no positive face-versus-mean-normal alignments. Global counts are 10,837/11,428 exact zero-area triangles and 3/1 positive alignments, all retained in the report. Source face/vertex-normal orientation is opposite on a flat reference surface, so negative alignment alone is not a winding defect. Triangle counts are geometry evidence, not an FPS measurement.

The recorded initial exterior ray exactly reproduces the declared obstruction: triangle 25639, vertices 13050/13183/13184, rows 97/98/98, front 106, fraction 0.9438726216286225, distance 56.57878288984361m. Its contour cell is profile 48→49 on the **same selected tube's outer roof**. Its world point is(20.593705357538212,2.1021397689411274,−133.34951798117584). This one fixed ray does not establish a globally absent entrance, rendered pixel ownership or physical body passage.

The actual capture inputs are untouched: report SHA a4934771a954d4363d3618719ac0e4ef236aeac1ca2f6d938940dabd7f87a988; initial sidecar SHA 1a9722cc198f7cb4c4df56de1ece30e2417fbd462df2249c54d4cb143f17c32f; phase2 sidecar SHA fbbfce1016677cfdf0f87c38207602148870de1910b68d3a284a89acaf4b3f2d. All input pins were rechecked after analysis.

View actual/initial-cavity-detail.png and actual/first-phase2-cavity-detail.png for the exact indexed local cross-sections. SVG companions retain labelled world scales. The root plots compare actual neighboring contours; the exterior plot shows only the recorded segment and first triangle. Geometry analysis produces 11 paired SVG/PNG plots, distinct from the frozen native media.

Run only after the corresponding actual terminal capture is authorized:

```sh
/Users/regina/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3 analyze_loft.py --report /private/tmp/tube-bounded-c-carrier-support-native-20261004/candidate-first/report.json --out /private/tmp/tube-carrier-loft-geometry-analysis-20261004/actual --terminal-capture-authorized
```

Nine synthetic unit tests passed, and the actual offline command terminated with exit0. See source-methods.md for grouping, indexed intersection, exact normal/word checks, half-open cavity definition and fixed-ray rules. No source/build/native/browser/port/Git changes or body/FPS/visibility/adoption claims are made.
