# Eager contact: unused work without a height epoch

Source-only scoped follow-up in `/Users/regina/Desktop/Projects/surfing-game`. Physical runtime at baseline `58ceb6a29`; root has since committed documentation only. No production edits, tests, builds, timing, browser work or Git operations were performed. Previous whole-contact skip and complete-front ray-plan audits are accepted; this note does not repeat them.

## Finding

The ordinary worker contact consumes only positions, selected normals, final joined/front topology, rays, life, lip material velocity, anchor velocity and final slice weight. Several drawing/diagnostic outputs are still eagerly built because SweptContact owns a general SweptLoft/LoftResult. There is **no second full drawn profile** in contact mode: one whole contact `profileAt` runs per live slice; drawing landmarks are read individually. Sheet/throat table computation is already off. Forward rests, drawn crest/toe/front landmarks, global overlap and final seals remain necessary.

The simplest independent candidate is **eager original positions/seals plus demanded normal vertices and optional indices**. It needs no new water-height epoch: all normal inputs have already been captured into the original final Float32 positions. Eliminating unused render/diagnostic output is also possible under an explicit runtime-only contract, but preserving every public LoftResult field on inspection requires more retained recipes or a separate eager reference path. Do not silently remove fields from default public build/update.

## Strictly unused in ordinary contact

| Preparation/output | Source | Actual consumer constraint | Static work that could disappear |
| --- | --- | --- | --- |
| Triangle index writes | `sweptLoft.ts:943–960` | Contact derives the two triangles from strip/sample indices; it never reads `loft.indices` or `indexCount`. | `6 × 133 × J` Uint32 writes and indexCount increments for J final joined strips. |
| Mask calculations/stores and seal mask multiplications | `sweptLoft.ts:621,698–763,898` | Contact never reads mask. Pin, initial lift and seal position arithmetic must stay. | N mask stores plus maskAlong clamp calculations and seal multiplications. |
| Sheet/sheetWeight/sheetBack/throat stores and seal output multiplications | `sweptLoft.ts:637–648,697–763,895–896` | Ordinary contact `measureSheet=false`; formed=0, no sheet table or throatViews calls occur. Query never reads these outputs. | Seven per-vertex Float32 stores (three sheet arrays plus four throat channels), along with output-only zero multiplications. |
| Drawn lip gap | `sweptLoft.ts:572–579,657–658` | `sliceTipGap/tipGap` used by tests/report diagnostics; absent from ContactHit/runner status. Drawn crest/toe/front reads immediately afterward remain required. | One drawing `pointAt(lip)` and one sqrt per live slice, plus metadata stores/max. |
| Lip geometric transport | `sweptLoft.ts:674–677,925–940` | ContactHit uses lookup.tipAlong/Up and crest anchor velocity, not sliceTipTransportAlong/Up. Geometry transport fields occur in regression reports/tests. | Two contact `pointAt(lip)` calls per live slice, ±4-frame subtraction/division and two stores. Retain crestPointVelocity and its crest landmark reads. |
| Drawn tip location, formed/mouth metadata | `sweptLoft.ts:650,765–768,839–853,900` | Drawing mesh reads these, worker contact does not. formed is zero in ordinary contact. | Three tip stores per row and two mouth run traversals. Preserve final run joins. |
| Ray advance verification | `sweptLoft.ts:341,775–792` | rayMinAdvance is diagnostic; it does not set ray blend/topology or branch any geometry. CrestRayPlan's actual complete-front stabilization and input checks remain required. | One XZ central row-advance verification per sample of each **pre-overlap** joined strip, two dot products/min comparisons, diagnostic store. |
| Rest output counters/climbs | `sweptLoft.ts:659–662,814` | Contact does not consume sliceRestHold/End/Climb/ToeClimb or restSamples. The actual restHold/restEnd computation drives pins/footprints and must stay. | Diagnostic stores/counter increments only; no rest-ray reads are removed. |

Other output-only counters are similarly unused by ContactHit, but their few increments are not a meaningful independent optimization. `slicePhase` and `sliceOverturned` participate in overlap diagnostic classification; even though the classification does not control retirement, removing that classification should remain a separately explicit runtime-output decision. Keep the current overlap ordering/resting-strip decisions intact.

## Counts, not measured costs

S=134 samples/row, MAX_SLICES=floor(40000/134)=298 live rows, capacity=299 rows/40,066 vertices. Let N=134×L live vertex slots, J=number of final joined strips, and J0=joined strips before overlap removal. A single maximum live run has N=39,932 and J=J0=297.

* Drawing-only per-vertex arrays listed above (mask plus seven sheet/throat channels) allocate **1,282,112 bytes** at construction and write up to **319,456 Float32 values per full build**, before sealing. Indices allocate **954,408 bytes** and a single maximum run writes **237,006 Uint32 values / 948,024 bytes** per build. These buffers are reused: this is startup heap capacity and recurring writes, not evidence of per-frame allocation or GC reduction.
* Tip gap can avoid 298 pointAt calls/sqrts; transport can avoid 596 pointAt calls at the live limit. Drawn crest/toe/front reads and crest anchor velocity do not disappear.
* rayMinAdvance scans 134×J0 sample pairs: 39,798 at the single-run limit. Reconstruction on public inspection must use original pre-overlap join metadata; using final joined flags changes this diagnostic.
* A maximum fully joined run eagerly calculates 39,932 normals, each with a sqrt, normalization and three Float32 stores. This is necessary output only where a successful nonanomalous query later selects a crossing. `floorAt` uses no normal, so the gauge's 185 surface-height queries demand zero normals by themselves. The source does not establish how many distinct normal vertices body/sampleAt queries demand.

## Demanded normals: lowest-complexity exact boundary

Keep existing eager height and seal loops byte-for-byte. Record each final run's first/last row. For each of a successful query's three crossing vertices, calculate the original central-difference normal from the existing final position array, clamping row neighbor to the final run and sample neighbor to [0,133]. Preserve the exact operation order, 1e−12 fallback and Float32 component store before barycentric interpolation in `SweptContact.normalAt` (`sweptContact.ts:425–440`). Cache by vertex once per update. This can remove all unqueried normal work with no delayed height reads, extra halo height construction, or changed floor/triangle sorting.

At most three normal preparations arise per successful query before cache hits; repeated queries share them. This is not a timing claim. Original normal output is captured before any public LoftResult mutations. Therefore exposing `contact.last` must first prepare all original run normals, and subsequent queries must reuse them even if the caller edits positions. Public eager SweptLoft tests and default Contact behavior can retain full preparation. Internal runtime queries need a private prepared-result reference; reading a full-materializing last getter internally would defeat the optimization.

Optional omitted triangle indices can be filled on inspection directly from the captured original final joins, in original strip/sample order, without reading water. Unlike heights/masks, this fallback needs no original double profile recipe. Keep original indexCount semantics and stale inactive buffer slots if preserving full mutable output compatibility.

## Compatibility and allocation cautions

The actual drawing uses a separate SweptLoft in `scene/barrel/SweptBarrel.ts:93`; its mesh consumes the outputs listed as unused **for contact**. Leave that path unchanged. Full public contact loft fields are inspected by `sweptContact.test.ts`, `PhysicalSurfWater.test.ts` and geometry report tooling, including mutations after update. A runtime-only specialization cannot merely expose empty arrays as a full LoftResult. The broader shading/diagnostic omission needs an explicit internal result contract and preserved eager public path, or capture/reconstruction before public exposure. Unlike deferred normals/indices, rebuilding exact mask/diagnostic values later can require original unrounded sample/profile recipes; rerunning a full loft against a later height callback is not equivalent.

`fronts`, survey/refinement arrays, complete-front ray data, forward-rest reads, overlap corners/boxes, final seal lifts, captured XZ projections and contact grid/buckets are actual input/preparation for answers, not dead drawing work. Constructors already reuse their large typed arrays. Source-level short-lived tuple/box/Front arrays exist in the overlap/planning loops, but whether V8 allocates them after optimization is unmeasured; replacing them should not be presented as a proven GC fix.

The omitted tip-gap/transport pointAt calls only overwrite shared query/point/velocity scratch; the subsequent required drawing landmarks and next slice reset the relevant query fields before use. A prototype must preserve those resets and compare exact contacts/full forced outputs rather than relying solely on this source argument. Charge demanded normal work to the complete contact path when timing; moving it from contactMs to boardMs alone is not a gain.
