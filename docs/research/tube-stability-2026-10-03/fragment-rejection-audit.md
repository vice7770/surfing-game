# Fragment rejection source audit

No meaningful discard-hoisting candidate was found. Current ordinary water and swept shaders already reject the barrel footprint and Rich patch overlap before their expensive normal/optical/PBR work. There is no existing wet/dry fragment predicate to move. No source was changed, and no test, build, GPU probe or timing was run for this audit. Scope is canonical production source at `58a75a07f20952e6a580748e9a4c9aa4d3c4b7fb`; isolated ownership/fog prototypes are excluded and the frozen fog archive is untouched.

## Exact execution order

| Predicate/path | Injection location | What happens before/after |
|---|---|---|
| Rich coarse-water patch exclusion + skirt backface rejection | WaterSurface.ts:326; richPatch.ts:25–29 | Runs first, before the barrel texture read. Coarse water under the inset patch and rejected skirt faces do not reach custom fragment normal or optics. |
| Water barrel footprint | WaterSurface.ts:326(Rich)/348(Classic); barrelMaskGlsl.ts:23 | Same interpolated `vWaterWorld.xz` and `gl_FragCoord.xy` used by the final shaded fragment. Active flag avoids mask read when off. |
| Swept complementary footprint | SweptBarrelMesh.ts:315; barrelMaskGlsl.ts:26 | Reads the same mask/dither before custom swept normal, sheet optics and PBR. |

Three's installed `meshphysical.glsl.js` runs `<clipping_planes_fragment>` at fragment main:169. This is immediately after `diffuseColor` initialization, before reflected-light setup:171, normal:182, emissive/water-body:186, and lighting:189–192. GLSL helper declarations in `<common>` are not executed before main. Normal-map/alpha/displacement chunks do not add a custom late footprint rejection. Moving an existing predicate ahead of the cheap diffuse initialization would remove no material optical work; the current app has no clipping planes configured, so there is no active clipping loop to bypass either.

The current coordinates must be preserved. Rich `vWaterWorld` is assigned after cubic height and the 0.3 m patch-skirt offset(richWaterGlsl.ts:70–74); Classic assigns it after height displacement(WaterSurface.ts:338); swept uses authored final world-position vertices(SweptBarrelMesh.ts:310). A test against undeformed vertex xz/local UV, a reconstructed per-pixel cubic height, or a different mask/dither precision is not the same predicate. Height is interpolated from the actually drawn triangles, while the Rich fragment re-samples cubic *slopes* for shading.

## Work the existing early rejects already bypass

These are source-level call counts for an otherwise surviving fragment, not measured hardware texture transactions or time. Compiler reuse, branches, quad helper execution and depth rejection can change executed work.

- Rich heightfield pixel normals call a 16-node Catmull-Rom evaluation(cubicSurface.ts:54–67), plus optional legacy tube-carve slope evaluations(tubeCarve.ts:160–169). The ordinary GPU chop path reads one FFT texture; the alternative evaluates six analytic waves(waterChop.ts:17–31).
- Rich normals also read four mipmapped ripple samples(rippleTexture.ts:149–152); fresh-foam relief can call three two-tap churn evaluations(churnTexture.ts:93–96). The subsequent Rich foam body has its own churn/lace/streak/plume work(richWaterGlsl.ts:84–97).
- Surviving heightfield optical fragments compute refracted-path/Beer–Lambert math, optional caustic lookup, and conditional four-sample crest marching(waterOptics.ts:203–235 and104). PBR lighting, environment sampling, tone mapping and fog are later still.
- Swept normals already use authored normals instead of a cubic fragment sample; their early mask bypasses chop/ripples, foam, sheet/back-wall/lip optical math and PBR(SweptBarrelMesh.ts:316–319). Swept crest marching is intentionally disabled.

Fragment rejection never removes the already executed vertex displacement/field sampling, primitive processing, rasterization, or initial mask lookup. It also cannot promise that rejected lanes avoid all quad-helper work. The whole FFT/caustic map passes occur before the scene draw(main.ts:drawPhysical), independent of these material discards.

## Wet/dry is not an existing exact visibility test

There is no water or swept `discard` based on `vWaterDepth`, water height or bed height. `vWaterDepth=max(0,height−bed)` is calculated at vertices for optical shading(WaterSurface.ts:173; richWaterGlsl.ts:55; SweptBarrelMesh.ts:112). It is interpolated optical metadata, not an authoritative signed fragment depth. The base geometry covers the entire rectangle(WaterSurface.ts:685–695); the visible dry-ground result relies on the drawn surfaces and depth buffer.

A new `vWaterDepth<=0` or per-pixel `waterHeightAt<=waterBedAt` rejection is a semantic change: vertex clamps lose the sign, cubic interiors can differ from the interpolated geometry/bed, skirts use pre-skirt optical depth, and authored swept roof/floor water cannot be classified by the source heightfield alone. Such a candidate would need a separate visual/model contract; it is not a proven equivalent hoist.

## Derivatives and depth/order constraints

GLSL ES 3.00 §6.4 states that subsequent implicit/explicit derivatives are undefined after a nonuniform discard; §8.8/8.9 applies this to implicit texture gradients and derivative functions. [Official Khronos GLSL ES 3.00 specification](https://registry.khronos.org/OpenGL/specs/es/3.0/GLSL_ES_Specification_3.00.pdf), printed pages 80, 98, 103–105. Current early predicates already precede `fwidth` in foam/streaks, mipmapped ripple reads, and Three's `dFdx/dFdy` geometric roughness(`lights_physical_fragment.glsl.js`:7). This is an existing boundary portability risk, **not an established visible defect from this audit**. New divergent rejection would expand that risk. Explicit derivative hoisting/gradient plumbing would require its own careful validation, not a blind discard move. The mask itself uses only level 0 with equal Linear min/mag filters(WaterSurface.ts:670–675).

Water/coarse patch and swept materials are opaque, DoubleSide, with ordinary depth test/write and LessEqual depth defaults(WaterSurface.ts:307–314; SweptBarrelMesh.ts:303; Three Material.js:124,211–231). The far ocean is transparent(FarFieldOcean.ts:155) and drawn in the later transparent list. The seabed is opaque(SpotSeabed.ts:22). The default opaque sorter prioritizes material ID before depth(WebGLRenderLists.js:1–25); water is constructed before PhysicalMode's seabed and the lazily created swept mesh(main.ts:252–256; PhysicalMode.ts:438,547). Therefore ordinary whole-surface ordering is not a strict global front-to-back arrangement. In particular, the bed may overwrite water shading already performed below it.

No logarithmic depth is requested(main.ts:216), so its conditional `gl_FragDepth` write is off. No custom fragment-depth write or early-fragment-tests qualifier is used in these materials. This avoids one obvious early-depth-test restriction, but early-Z behavior with discard is driver-dependent and was not observed here. A new depth-only/ownership pass would add vertex/draw work and must preserve all mask holes, dither, final displacement and equal-depth tie ordering. Simply drawing the seabed or swept mesh first is not proven identical: current LessEqual ties and overlapping patch/skirt/curl ownership can change visible winners.

The existing source tests cover shader strings/mask switching and mirror dither(waterLooks.test.ts:323,357–375; barrel/SweptBarrelMesh.test.ts), not hardware early-Z or portable boundary derivatives. Those tests were only read. There is no justified production mutation from this scope; measured render-stage attribution would be needed before proposing a more substantial rendering simplification.

## Source fingerprints

- `src/scene/WaterSurface.ts`: `3eda73239893f599e2c242ec6ef568f463b47fd0f2bc495768a24ec6de85a000`
- `src/scene/barrel/SweptBarrelMesh.ts`: `cc52d17fb7cbf90621ec51a50b0236a055bd44b8794459361e41277000a88186`
- `src/scene/barrel/barrelMaskGlsl.ts`: `d18790112d5c9b06903fffcce66f320e31974cec27e402c74b0030e608a1e589`
- `src/scene/water/richPatch.ts`: `fe564caa92e24ea5f15acc6d3cb4377bcda3ab0cf90e12b0ef599ef55f412fc9`
- `src/scene/water/richWaterGlsl.ts`: `3ffbf8004f0c8c5bea16f748031c9d67813c69de9b7b67b0ceefcea000d8c416`
- `src/scene/waterOptics.ts`: `3b235ece7102e835f467126158f961c45cdaaff5dbb32ce2b28544a26159ad07`
- `node_modules/three/src/renderers/shaders/ShaderLib/meshphysical.glsl.js`: `7dea93f1118b77d8d04f3b49797dc25dda49e37edf2c2a61b286c2a6297edc9c`
- `node_modules/three/src/renderers/webgl/WebGLRenderLists.js`: `3139dfcd01675333266c02d853a768913318f353e694de39545aa50747d2011a`
