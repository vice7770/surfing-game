# Minimum shared-sheet design, read only

Recommend a new authoritative paired sampling layout for the analytic sheet, with common coordinates before the final F32 store. Keep a fixed row size and the current indexed strip mechanism. Do not preserve all old analytic sampling corners merely to retain their indices. Auxiliary remeshing is the larger fallback if exact old polylines become a requirement.

This is a design proposal, not a validated model or an instruction to change the frozen candidate. No geometry evaluation, source change, build, server or native run was performed for this note. The canonical consumer source and every earlier failure receipt stay frozen. Precision-v2/v3 work is separate and remains the geometry worker's responsibility; none of the pending precision variants is presumed accepted here.

## Established failure and what a small fix cannot prove

The current final loft has clean individual rows, but one Reef roof/root triangle inversion remains after canonical physical diagonals: roof segment43 versus upper-root segment81, 0.3114571531508403mm. It occurs between ages1.786745309829712/1.7897453308105469, weights0.19581395387649536/0.05709647387266159, in sloped water. The two surfaces have different horizontal sampling stations, so corresponding physical diagonal direction alone does not give identical interpolation cells.

A common water datum or F32 store, by itself, cannot repair this missing correspondence. Earlier upper/underside inversions included flat water. A constant water height for a whole row would also change the retirement seam: as weight approaches zero the core would converge to that artificial flat datum instead of the live heightfield. Keep the existing collapse fade and live-water projection.

The tempting specific layout—leave return69..88 alone and put reversed matching stations in roof40..59—is not justified across the domain. The geometry worker confirms that return69..80 and root80..88 are monotone decreasing X, but their union is not proved to lie within roof32..60. U88.x can be as low as J.x−2R; the existing bounds allow a conservative crest−0.22W. Last-normal sign also matters at the right end. This concrete mapping must not be implemented with clamped samples, a raw fallback, or an unreported missing roof.

## The least complex construction with a useful guarantee

Treat the actual sheet as paired height boundaries on shared local-X stations, rather than independently sampled outer and inner vertex lists. The provider must first define the full valid paired domain, including its connection into the upper root. A named top boundary may need the carrier transition as well as the current crest-to-tip roof; the current roof32..60-only assumption is insufficient. The model's rolled cap and root/face connection must remain explicit boundaries, not be buried by a local thickness correction.

For every station k in an admitted paired region, publish local q[k], topY[k], returnY[k] and their physical semantics from the same parameter-first query. Each boundary must exist, and topY[k]>=returnY[k]. Sample both at the same q. This deliberately changes the analytic polygon's sampling; it need not preserve every old corner. It must be evaluated as a new representation using the unchanged physical shape controls, with explicit approximation errors and topology/endpoint checks. Choosing a resolution is a separately declared representation choice, not a hidden coefficient adjustment.

For each final row, compute once:

- worldXZ[k] = anchorXZ + q[k]*rayXZ, before storing either boundary;
- liveWater[k] = heightAt(worldXZ[k]);
- e = endWeight*collapseFade (the core's shared pin is zero);
- Ytop = liveWater + e*(stillLevel + topY - liveWater);
- Yreturn = liveWater + e*(stillLevel + returnY - liveWater).

Copy the same rounded world X/Z to the two boundary vertices. Deferred worker heights must use the same captured X/Z and blend, and the same datum calculation. Rounding Y monotonically cannot reverse ordered endpoint values, although it can make an unresolved thin gap zero. Give each paired cell the same actual XZ triangle vertices and physical diagonal on both boundaries. Then any common vertical query uses identical barycentric weights, so its interpolated separation is the weighted sum of nonnegative vertex separations. This guarantee survives nonlinear water, differing neighboring ages and end weights, and curved row rays. It covers the paired cells; cap collars, root joins, floor closure, zero-lift seams and ray/strip degeneracy require separate checks.

The current128-point analytic profile and134-vertex row are a sensible first container, not a geometric requirement. Retain them only if a declared allocation fits the complete paired sheet, cap/root/floor and carrier seams. Preserve named physical crest, cap, root and toe semantics. If an old numeric landmark blocks a valid allocation, introduce explicit landmark/range metadata and update its consumers; do not move the physical landmark to satisfy the index. A fixed row stride with explicit semantics remains much simpler than an unstructured auxiliary topology.

Crucially, put this sampling in the authoritative provider query, not only in the renderer: profileAt/pointAt/frameBlend, sheet/sky views, current void, prospective jet-water budget, draw and worker contact must receive the same new contour. The already separated boundary transport and approximate fluid velocity remain separate. Published foot height/depth and time still drive ordinary queries; no authored held shape substitutes for current geometry.

## Costs and compatibility

| Concern | Fixed-row paired sampling | Exact old-polyline auxiliary remesh |
|---|---|---|
| Geometry authority | New paired query contour; controls and physical landmarks explicit | Exact subdivisions of the old final F32 polylines, plus added vertices and provenance |
| Row budget |134 vertices per row retains floor(40000/134)=298 live rows | Prior upper-bound proposal adds up to300 new vertices per joined strip, unless clipped/reused |
| Worst-case40k illustration |298 rows,39932 primary vertices |134n+300(n−1)<=40000 permits92 rows; reuse across adjacent patches can improve the bound, but remains additional work |
| Triangle structure | Two actual triangles per existing indexed quad; physical paired direction shared | Variable triangles/cells; the existing133 fixed quads per strip no longer describe the mesh |
| Contact bins | Retain current per-strip grid and q buckets, actual-index lookup and Uint8 quad IDs | Replace fixedquad ranges and Uint8 IDs with indexed patch/triangle cells; auxiliary row/edge/normal provenance required |
| Renderer | Retain fixed-stride buffer iteration if stride/semantics unchanged; derive optics from new query | Change every vertex→row inference, row wall/tube/ray attributes, dev colours, index capacity, camera-water strip association and truncation checks |
| Worker packets | No extra mesh serialization: ordinary snapshots send fronts and each side rebuilds geometry | Also need not send meshes if deterministic reconstruction is retained, but cannot assume appended arrays/metadata are already serialized |
| Witness/scanner | Actual indexed crossings remain valid; stride and physical landmark metadata must match the new layout | Actual crossing math still works, but hardcoded134 row attribution and ordered row contour reconstruction fail for appended vertices |

The remesh bound is a static conservative illustration, not a measured average or FPS estimate. It comes from at most100 station values from two rows'29 roof and21 return vertices, at most400 patch vertices including reused original corners. Clipping may reduce it. Reusing insertion stations across both adjacent patches would need a per-row union and different provenance/budget logic. Increasing a fixed row reservation to hundreds of vertices would immediately reduce surveyed rows under the same40k cap; do not disguise that cost by expanding the budget.

No mesh is currently transferred in SurfZoneBuffers. front/frontCount, surface fields, rider and particle arrays are transferred; the worker builds contact from fronts, while SweptBarrel.draw rebuilds the drawing from the snapshot fronts and drawn heightfield. Those height samplers differ today (owned plain surface in physics; rich cubic or classic bilinear in drawing). A common construction guarantees topology and ordering within each build; it does not, by itself, prove identical numerical surfaces across different water samplers. Keep this distinction visible in validation and ordinary passage evidence.

## Exact current entry points

- source/src/wave/barrel/sweptLoft.ts:25–28,175:134 row samples and40k-derived row budget;791–825: final water projection;1021–1045: actual quad triangles. prepareRow/prepareNormal depend on vertex/S row attribution.
- source/src/wave/barrel/sweptContact.ts:78–82: S/Q constants;135–155: perquad ranges, Uint8 bucket IDs;201–245: captured row projections and actual strip index offsets;397–414: actual indexed triangle queries;555–626: fixedquad bucket preparation. profileIndex assumes vertex moduloS for the contact's lipShare.
- source/src/scene/barrel/SweptBarrelMesh.ts:15–16: fixed capacities;50–53: dev colour row/index inference;401–447: row-based wall, tube and ray attributes;449–480: actual mesh index copy/winding. It currently truncates at fixed capacities; a larger topology needs explicit admission, not silent clipping.
- source/src/scene/barrel/barrelWater.ts:32–51: boxes from two fixed rows and triangle ownership from floor(vertex/S). Appended vertices require explicit strip ownership.
- source/src/scene/barrel/SweptBarrel.ts:118–146: drawing rebuilt from fronts and drawn water, then mask and camera parity prepared together.
- source/src/wave/SurfZoneRunner.ts:249–279,739: snapshot arrays and published front records; source/src/game/SurfZoneWorkerCore.ts:29–33: transfer list. No loft packet currently exists.
- /private/tmp/tube-directed-entry-20261004/body-witnesses.mjs:4,31,44: hardcoded134 component-row attribution; exact triangle crossings and sphere distances use actual active indices.
- /private/tmp/tube-directed-entry-20261004/tube-target.mjs:3,25,39–56: hardcoded134, crest32 and averaged ordered row contour for coarse candidates, before exact active-index qualification.
- /private/tmp/tube-opening-inventory-20261004/inventory.mjs:3,17–20,29: hardcoded row/crest offsets and pervertex/perrow serialization lengths.

These line references describe the reviewed canonical source snapshot. The manifest pins its exact files; pending geometry-worker changes must not be confused with this read-only review.

## Recommended next bounded scope

1. Ask the geometry owner for a separately frozen paired-sheet representation with an explicit all-domain top/return graph and physical landmark mapping. Use one fixed row allocation; keep the current128/134 only if that allocation is valid. Do not port the disproved40..59/69..88 mapping directly.
2. Implement only provider sampling plus paired pre-F32 world projection and corresponding actual-index triangles first. Retain current contact bins, row metadata, packet format and40k budget. Recompute sheet, sky, void and prospective water from this authority; update semantic-index consumers only where the allocation actually changes.
3. Verify the original0.311mm Reef witness and all active case/water/neighbor-age final meshes, curved rays, exact cap/floor retirement, zero-loop growth/seal/release, and draw/contact behavior. Cover the precision-domain issues separately; passing one does not fix the other. No tolerance relaxation or locally lifted/thickened rows.
4. Measure vertex/index work and ordinary contact query cost before a native trial. Then use ordinary rider dynamics and moving pixels to establish a coherent shape and natural passage. Body witnesses alone remain narrower than full physical body/contact proof.

This scope targets a simpler coherent representation. If the provider cannot supply a valid paired domain within a compact fixed layout, report that structural failure and reconsider the whole face/cap/root together. Do not accumulate exact-preservation remesh complexity merely to keep an old sample numbering scheme.
