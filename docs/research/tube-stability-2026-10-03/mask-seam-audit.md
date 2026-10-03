# Remaining mask/seam audit — 2026-10-03

**Held rendering confirms two separate ways to expose seabed through wet water:** filtered mask outside indexed support, and both surfaces discarding at one pixel because their world positions differ. The ray correction removes the measured folds but leaves these seam defects. It reduces exposed pixels in archived state 10 and increases them in state 20. No production mask, visibility, erosion or optics change was made.

This is class evidence from archived states 10/20, **not identification of the moving C24 brown patch around seaTime 169.6**. Those photos span about 0.47 simulation seconds and have no exact matching full held state. The white lip seam remains separate from the object-ID finding.

## Held evidence

[summary.json](mask-seam/summary.json) records compact results and file hashes; [report.json](mask-seam/report.json) retains bundle, fixture, camera, material, GPU target and shader provenance. Four support reports and masked/unmasked/solid ID PNGs sit beside them. Original full physical captures and final continuous-plan/EEA geometry exports were used directly. EEA geometry runtime SHA256 is `20b5ffd3117d95990d64c4289a135db2069d1eb31d3f5c3b6c659d5f441c44a5`.

The camera, 1280×720 canvas, DPR 1, 52° FOV, midday lighting, water/front buffers, active indices/draw ranges and sea clocks stayed fixed within each pair: **173.88921329749155** and **179.9392132974912**. Physics took zero steps. Bed and far field were reconstructed from config; flow/aeration were zero and rider/particles/lip sheet were hidden, as the captures lack those fields.

Normal captures are **output 0 instrumented originals**, not byte-identical unwrapped production shader source. Original callbacks run first; displacement/discard code remain, and original depth/side/blending state is recorded. Only the labelled solid-swept pass bypasses its mask discard and hides water/bed/far field. One persistent shader/uniform instance avoids Three's material program/uniform cache switching. Baseline, repeat and post-ID normal PNGs match byte-for-byte within that wrapper; common states and active geometry match exactly.

GPU provenance caught the fixed-state 512² HalfFloat caustic target changing hash while the three 256² FFT targets stayed identical. This diagnostic therefore **holds the already-rendered original caustic framebuffer**, suppressing only its colour writes. Its original texture/filter/domain/time remain fixed and bytes are verified each normal draw. This is an isolated optics input, not a production fix or a claim that caustics always drift.

Pure foreground IDs identify water blue, swept red, seabed yellow. Far-field ID output intentionally overrides alpha to 1; distant fades and blended/antialiased/other pixels are excluded from foreground attribution. Normal output 0 retains original alpha.

## Causal breakdown

“Exposed” means an opaque seabed ID becomes an opaque water ID when the mask is disabled and swept geometry hidden at the **same pixel/camera/state**. Solid screen coverage and indexed xz projection are different tests.

| State | Geometry | Exposed pixels | No solid screen coverage | Solid coverage | Covered, both discard | Covered, below bed |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| 10 | EEA | 1,043 | 745 | 298 | 94 | 169 |
| 10 | Continuous rays | 440 | 344 | 96 | 52 | 13 |
| 20 | EEA | 595 | 332 | 263 | 215 | 0 |
| 20 | Continuous rays | 892 | 590 | 302 | 250 | 0 |

Remaining covered counts are explicit threshold/depth ambiguity: 31/29 at state 10 and 48/52 at state 20; 4/2 at state 10 fail world-coordinate confidence. No covered state-20 sample fails confidence. RGB24 world varyings come from actual post-displacement GPU positions, with encoding bounds and ≤0.75 pixel reprojection checked. RGB8 mask/dither comparisons use a 1/255 margin; view-depth ordering uses a provisional 2cm margin. Background “solid” coordinates with reliable=false are never geometry evidence.

For current state 20 pixel **(861,407)**, unmasked water xz is **(46.705811,−104.367902)** and mask α **1** exceeds dither **0.901961**. Solid-swept xz is **(47.131095,−104.876801)** and its α **0.866667** is below that same dither. Its view depth **47.759726m** is well in front of actual scene bed **56.052379m**. Both surfaces discard, exposing bed, although the source water column is **3.388m**, with 0 dry-packed neighbours. World reprojection errors are below 0.004 pixels. This disproves a complementary same-pixel seam test based only on independently sampled world xz.

Current state 20 pixel **(424,457)** has water xz **(20.168224,−110.348819)**, α **0.133333** > dither **0.094118**, source column **1.276m**, 0 dry neighbours, **no indexed xz support and no solid screen coverage**. This is a filtered-mask hole. Across all positive-mask cells, 4×4 midpoint sampling found:

| State | EEA outside alpha-area | Current outside alpha-area | Current maximum outside α |
| --- | ---: | ---: | ---: |
| 10 | 1.271m² | 1.639m² | 0.530 |
| 20 | 2.652m² | 4.720m² | 0.920 |

Sampling covers 346/238 cells at state 10 and 567/463 at state 20, without truncation. Alpha-area is sampled rejection potential, not exact geometric area or screen-hole count. Of 12 sampled exposed water points per variant, indexed xz support is absent in 2/10 at state 10 and 8/9 at state 20. Every sampled exposed point has 0 dry-packed neighbours. The four sampled bed pixels remaining after mask removal at state 10 lie **outside the snapshot's x±160m window**; they do not establish solver dry packing. CPU height interpolation is not a raycast of water's flat CPU vertices or its actual shader triangles.

## Source implications and next fix boundary

`rasterizeBarrelMask` writes nodes inside indexed triangle projections, then `waterBarrelMaskAt` linearly filters bytes. A positive node influences adjacent 1m cells outside those triangles; zero mask at sealed/cut endpoints does not ensure filtered support. Separately, the world-space water and swept tests complement only at the same xz, while their camera-ray intersections differ. A coverage correction must address both mechanisms; blunt erosion would not fix covered double-discard and could hide valid thin tubes.

The source also retains mask bytes when active=0; water honours active while swept does not. This is a conservative risk, **not observed in these active=1 captures**. At state 10, some solid loft lies behind actual bed, so changing clipping alone cannot restore those pixels. Resting triangle interpolation and different swept/base foam-normal compositions remain additional seam hypotheses. No optics tuning follows from these captures.

Next bounded validation should freeze the actual moving 169.6 C24 state and repeat the object/world/depth comparison before attributing its brown polygon. A production seam fix must preserve wet replacement coverage, live thin roofs, sealed ends and contact geometry; these ID/support fixtures form its regression evidence.

## Reproduction/checks

```sh
node scripts/browser/tube-frozen-render.mjs --url=http://127.0.0.1:4201/ --frames=10,20 --mask-diagnostic=true --freeze-caustics=true --dir=/private/tmp/surf-tube-stability-current-20261003 --out=/private/tmp/tube-mask-held-causal
./node_modules/.bin/rolldown scripts/barrel-mask-support-report.ts -o /private/tmp/barrel-mask-support.mjs --format esm --platform node
node /private/tmp/barrel-mask-support.mjs --input /private/tmp/tube-mask-held-causal/at-20.current.support-input.json --out /private/tmp/at-20.support.json
npx vitest run scripts/barrel-mask-support-report.test.ts
npx tsc --noEmit --strict --skipLibCheck --target ES2022 --module ESNext --moduleResolution Bundler --types node scripts/barrel-mask-support-report.ts scripts/barrel-mask-support-report.test.ts
```

The bounded capture is valid; all 5 analytic helper tests, strict helper typecheck and browser-script syntax check passed. Chrome closed after capture. Full held arrays remain in the temporary output; durable compact geometry fixtures are separate. This provides no moving-tube, complete-physics or FPS guarantee.
