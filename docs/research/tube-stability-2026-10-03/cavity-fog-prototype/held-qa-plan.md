# Isolated held cavity-fog validation plan

Prepared only; no Chrome, GPU, solver advancement, or production integration. The plan and both generated adapters passed syntax/dry `--plan` validation: eight views each, zero physics steps. Root must release the GPU lease before `--run=true`.

The adapter derives the committed `scripts/browser/tube-frozen-render.mjs` through guarded exact replacements. It replaces the frozen helper's fake draw with `Object.getPrototypeOf(mode).drawBarrel.bind(mode)`. The captured host snapshot/front/status and actual WaterSurface source are installed normally. Each render goes through the actual recording.renderView → water.update → original PhysicalMode.drawBarrel → native classifier/render path. No private freshness record is written, no material/shader/fog classification is overridden, and no rendered geometry is manually uploaded.

Actual generated position, normal, canonical index and vertex-mask prefixes must equal the continuous canonical exports. Actual uploaded facing-normalized indices, start-zero/full draw range and rasterized water-mask texture must also match. The retained independent indexed/contact witness then certifies the same column; the lower eye lies strictly between its floor and underside. Source/front/seaTime remain exact and snapshot.tubeCount must be zero. Any mismatch fails before a valid result can be claimed. Existing projected-tube/frustum checks remain active for every view.

The actual supplied view is distinct from PhysicalMode's own unused high camera (y=20). This proves renderView classifies its supplied lower/control view. Shader onAfterRender observation reads native USE_FOG, FogExp2 and actual fog uniforms without changing program source. Native High/Rich, original pixel normals, 256 FFT, midday lighting, caustics and normal depth/discard shaders remain enabled. Normal/repeat PNGs retain caustic variability; geometry/source/fog repeats must still be exact.

## Exact eight views

All true/false entries below are expected *underwater fog* classifications. Roof controls report the unchanged raw-height result, despite independently being inside physical roof water; this prototype only overrides bounded rendered air and is not a replacement water-volume classifier.

| Capture | View | Eye (x,y,z) | Raw bilinear height | Canonical4201 | Fog4207 |
|---|---|---|---|---|---|
| 10 | lower-air | 114.491677628, 0.83554038266, -9.80154073715 | 1.05073834081 | true | false |
| 10 | under-floor | 114.491677628, 0.520342424508, -9.80154073715 | 1.05073834081 | true | true |
| 10 | roof-band | 114.491677628, 1.53917964722, -9.80154073715 | 1.05073834081 | false | false |
| 10 | outside | 114.491677628, 0.71784568276, -28.9517555237 | 0.91784568276 | true | true |
| 20 | lower-air | 46.0455493927, 1.13914686752, -108.538169022 | 1.49976648893 | true | false |
| 20 | under-floor | 46.0455493927, 0.678527246105, -108.538169022 | 1.49976648893 | true | true |
| 20 | roof-band | 46.0455493927, 2.72707612392, -108.538169022 | 1.49976648893 | false | false |
| 20 | outside | 46.0455493927, -0.786751569689, -136.983566284 | -0.586751569689 | true | true |

Each of eight views has normal and normal-repeat captures per runtime (32 PNGs across the sequential pair). Lower-air: true→false. Under-floor: true→true. Roof-band: raw false→false for these exact data. Outside the indexed global min-z bound: raw true→true. No control is forced to a desired classification. Actual raw host.heightAt, tubeCount, local mask nodes/weights/opaque support, camera matrices, drawn clock, independent witness, native fog state and shader flags/uniforms are saved in the report.

## Provenance and deadline

- Driver SHA256: `7bc73083535604e9db242a0efc49649e0fe9bbc61e33a2aea91601376c3d4df7`
- Observation helper SHA256: `5315625e7be418d28a18d37a6cdee25620d534602d3af24603d9f3c4a1986a4c`
- Driver plan SHA256: `aca6ebfb9254e2edf09608acfe1ed1dba75b6d284db5b1acef360719e27696bc`
- Canonical held base SHA256: `8babd6f3a9edb0dc92434e5df57fb7302a6412d6fcf88eabc652cb5158b9f487`
- Air witness SHA256: `17c251e10dc1bb49e532e18b829e059d15661185c4b1ea997fbdda1af3d7dd53`
- Fog manifest SHA256: `8f2275fd2422de6432b24abe66bdb1650a9b035826e9c84bb155e5a94aebece4`
- Fog patch SHA256: `bc6e2e9a99107c70976f6465a29d744bf13b387935323b81bbc6c2c61a8ae547`
- Derived baseline adapter SHA256: `b0c24a659ec4759070f3bdbca3122eaa6d0b0c0544f2f718c718a8d7a03d9bb7`
- Derived candidate adapter SHA256: `9946a2409be70729b4eec8eb885eb0277aaf4de703c6c6481c439a6fc06ac861`

Both runtimes' index and every served JavaScript bundle are verified byte-for-byte against their explicit immutable directories. The candidate manifest separately identifies the four scratch source files and byte-exact physics worker. `harnessContextSourceHashes` identify the canonical root used to derive QA, not candidate source authority.

Default plan: `/private/tmp/tube-cavity-fog-held-plan.json`; semantic dry plans: `/private/tmp/tube-cavity-fog-held-{baseline,candidate}-plan.json`; reviewable derived sources: `/private/tmp/tube-cavity-fog-held-plan-source/`.

Run only after explicit root lease:

```sh
node /private/tmp/tube-cavity-fog-held-driver.mjs --run=true --before=http://localhost:4201/ --beforeDir=/private/tmp/surf-tube-stability-current-20261003 --after=http://localhost:4207/ --afterDir=/private/tmp/surf-cavity-fog-20261003/dist --out=/private/tmp/tube-cavity-fog-held --timeoutSeconds=60
```

Two jobs run sequentially. The canonical child budget is at most28sec, then the candidate gets only the remaining overall time minus2sec cleanup reserve. Each child retains the original Chrome watchdog/finally cleanup. A parent deadline stops that child's owned detached process group, including its new-profile Chrome; it never touches user/browser preview processes. A failed/expired first job prevents launching the second. Actual source/report/PNG artifacts are retained; no timing result or live FPS claim is produced.

This held proof has no captured particles, flow/aeration or rider pose; it isolates camera/fog behavior. It does not validate moving lifecycle, audio-listener pre-draw fallback, or arbitrary late collapsed contacts. Full-opacity local support only certifies the bounded contract; dithered seams, empty/hidden/stale/partial geometry and ambiguous/degenerate/overflow columns retain raw classification (covered by the existing scratch focused tests).
