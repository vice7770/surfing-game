# Moving tube regression

These four serial runs compare the frozen eea68720f build with the shared crest-ray build on actual moving Wave Lab physics. Each used seed 1, Padang Hs4m/T10s/direction10°, spreading11.720624206334085, start sea time164, dx1/fineSpacing1/renderSpacing1, High particles and Rich water. Actual viewport was1708×926 CSS, DPR2, canvas2989×1620. The requested window was clamped by macOS; the reports retain both requested and actual dimensions.

[comparison.json](comparison.json) records exact served bundle hashes, checker revisions, configuration, outcomes and photograph clock brackets. The four `*.json.gz` files retain complete reports, with original uncompressed SHA256 values in the comparison. Decode them with `gzip -dc`. The selected PNGs are byte-identical copies of their original captures.

| Components | Baseline reversed indexed rows | Candidate reversed indexed rows | Candidate minimum across-front advance |
| --- | ---: | ---: | ---: |
| 24 | 55,900 | 0 | 84.99mm |
| 64 | 89,426 | 0 | 13.73mm |

Both candidate runs passed finiteness, actual uploaded positions/draw range, indexed topology, strictly positive advance at both endpoint tangents, indexed run-end closure, logical lifted-vertex mask support and water/mesh snapshot freshness checks. The close camera saw126/128 open-tube snapshots. New throws and touchdowns occurred in both runs. No candidate failure fixtures were generated because no checked invariant failed.

The C24 baseline used checker revision1, which counted unused isolated vertices as run ends. Its five alleged lifted-end snapshots cannot establish rendered holes. The negative-row count is unaffected. The C64 baseline and both candidates use revision2, which checks only actually indexed run ends. Raw missing raster nodes also include unused vertices and do not establish filtered-mask coverage or visible holes.

The checker examines every newly consumed snapshot and captures screenshots. Its CPU/GPU work and explicitly fine simulation grid make the reported59.8 display FPS and roughly35 publicationHz unsuitable as ordinary-default performance evidence. See the separate ordinary Padang FPS reports for that measurement.

Photographs bracket advancing source clocks by approximately0.45–0.55 simulated seconds. They document appearance qualitatively; they are not matched-state pixel comparisons. The candidate still has flat roof, fin/facet and seam artifacts. Positive across-front advance does not establish reference-level visual quality or flawless tube physics.

Retained examples:

- [C24 baseline open tube](before-c24-01-first-open.png)
- [C24 candidate open tube](after-c24-01-first-open.png)
- [C24 candidate touchdown and angular patch](after-c24-02-first-touchdown.png)
- [C64 candidate open tube](after-c64-01-first-open.png)

The corresponding harness is `scripts/browser/tube-live-regression.mjs`. Its preparation and seven analytic checker tests launch no browser:

```sh
node scripts/browser/tube-live-regression.mjs --self-test
node scripts/browser/tube-live-regression.mjs --plan --before=http://localhost:4192/ --after=http://localhost:4201/
```

To capture, build separate immutable previews, coordinate exclusive GPU access, and supply `--run`, `--beforeDir`, `--afterDir` and `--out` to the plan command. The harness checks that every served bundle matches its stated directory and refuses the user play port4200. Frozen replay of the two CPU fixtures is documented in `../shared-rays.md`; it does not initialize the complete moving solver.
