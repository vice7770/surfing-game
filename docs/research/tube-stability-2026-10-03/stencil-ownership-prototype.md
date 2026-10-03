# Held screen ownership prototype

The isolated stencil prototype removes the demonstrated world-mask seam holes in two held states while retaining every original pure swept-roof pixel. This is evidence for a bounded rendering integration, not a production fix or a complete tube/cavity verdict. Production renderer files and the committed frozen harness are unchanged.

The [driver](../../../scripts/browser/tube-stencil-prototype.mjs) creates an ephemeral derived copy of `tube-frozen-render.mjs`. Every substitution must match exactly once; the report records the base, helper, derived-source and individual patch hashes. The [helper](../../../scripts/browser/tube-stencil-helper.mjs) requests stencil before WebGL2 context creation, then uses the original swept callback, geometry, indices, draw range, transforms and DoubleSide/depth function. The actual drawing buffer reports 24 depth bits and 8 stencil bits.

Rendering order is bed, ownership prepass, base water, ordinary swept mesh. The prepass keeps the original swept mask/dither discard and active guard, writes stencil 1 only on a passing depth sample, and writes neither colour nor depth. The water tests stencil 0 and bypasses only its world-mask discard. Ordinary swept shading keeps its original discard and depth write, with the same active guard. The bed's prior depth prevents below-bed swept samples claiming water. The rich patch uses the same water material/test as its parent; its separate patch/skirt discard remains intact.

The helper fails if later fragment behavior would invalidate early termination: log depth, map/alpha map, alpha test/hash/coverage, transmission, transparency, non-unit opacity or local clipping planes. It also rejects explicit later `discard`/`gl_FragDepth` and records the disabled generic alpha/log-depth chunks. Original prepass and normal-swept vertex/fragment inputs hash identically before the isolated guard/early return; shared geometry, draw range, sidedness and depth function are checked. No physical vertex array is treated as a shader-displaced world point.

## Results

The final run took 12.21 seconds with zero simulation steps, same 1280×720/DPR1 camera and fixed Rich pixel-normal/midday optics. Both variants use **the same final continuous-plan geometry**, rather than EEA versus current geometry. Cameras frame current bounds, so these counts differ from the earlier EEA-framed seam report.

| Captured state / exact sea clock | Exposed wet bed, world mask → stencil | Lost original pure roof pixels | Newly exposed pure bed |
| --- | ---: | ---: | ---: |
| 10 / 173.88921329749155 | 722 → 0 | 0 | 0 |
| 20 / 179.9392132974912 | 1,263 → 0 | 0 | 0 |

Bed-first ordering alone leaves the complete ID buffer exact. The inactive control has mask active 0, ordinary swept object still visible, prepass hidden; the active guard suppresses the retained mesh. The hidden control keeps mask active 1 but hides ordinary/prepass geometry. Both produce the exact complete ID buffer of mask-off plus swept-hidden water. All clocks, source/texture hashes, active geometry prefixes and normal-wrapper baseline/repeat/post-diagnostic PNGs remain exact.

Pure red roof counts increase 54,738→54,864 and 65,321→65,437 at edge samples; no original pure red sample is lost. Newly restored pure water includes 3 and 2 previously antialiased/other samples, respectively, with zero far-field→water samples. These counters describe resolved pixels, not triangle area or every MSAA sample. Far-field ID alpha overrides faded blending, so distant fades are excluded from the foreground interpretation.

The retained [summary](stencil-prototype/summary.json), [full report](stencil-prototype/report.json), complete normal/ID pairs and roof/mouth-edge crops preserve the proof. The crops show the same visible roof and green cavity boundaries with small bed-coloured seams replaced. They also retain the existing abrupt end/fin in state 20: this prototype does not repair every tube shape. It can restore the heightfield in an intended open cavity where no surviving swept sample projects; the counters cannot prove that water should occupy every restored pixel. A matched moving touchdown/cavity capture is required before accepting that behavior generally. The photographed moving C24 patch at sea clock ~169.6 is a different state and remains unattributed by these captures.

Caustics are an explicit diagnostic input: the already-rendered 512² half-float caustic FBO is held with actual bytes/filter/domain/time preserved; FFT targets remain fixed. Normal shots are output-0 instrumented originals within one persistent shader/uniform wrapper, not an assertion of unwrapped production byte equivalence. Chrome and its temporary profile are closed after each bounded run. No FPS or live physics claim follows.

## Reproduce and integration boundary

```sh
node scripts/browser/tube-stencil-prototype.mjs --plan
# Coordinate exclusive GPU use before this bounded held run:
node scripts/browser/tube-stencil-prototype.mjs \
  --url=http://127.0.0.1:4201/ \
  --dir=/private/tmp/surf-tube-stability-current-20261003 \
  --out=/private/tmp/tube-stencil-held-final --frames=10,20 --timeoutSeconds=60
```

The existing original full-state inputs and final geometry exports remain required under `/private/tmp/tube-live-original` and `/private/tmp/tube-geometry-final`; the compact proof is durable, not a copy of those large inputs. `--plan` checks markers, shader-helper serialization, fixture hashes and identical reference/candidate geometry without opening Chrome. Syntax was checked with `node --check` on both new modules. Port 4200 is forbidden.

An integration should request stencil at renderer construction; own one shared-geometry prepass with the swept renderer; synchronize its active/visibility/lifecycle with the normal barrel; apply water stencil only while replacement is enabled; and establish bed/prepass/water/swept order deliberately. Existing mask precision can remain unchanged for swept coverage. Focused tests should cover active/inactive/hidden/view/Classic/Rich transitions, shared draw range/disposal, shader discard/depth parity and default/offline controls. A separate frozen build, matched moving cavity/touchdown QA and actual display/fresh-water throughput check must precede a default change. Additional prepass rasterization and depth/stencil allocation have an unmeasured GPU cost.
