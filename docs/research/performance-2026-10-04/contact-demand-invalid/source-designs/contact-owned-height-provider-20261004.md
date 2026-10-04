# Owned exact plain-height provider for demanded contact

Source-only feasibility audit in `/Users/regina/Desktop/Projects/surfing-game`; current runtime derives from `58ceb6a29` (subsequent root commits are documentation). Owned output is this note only. No implementation, tests, build, benchmark, browser work or Git commands. Prior global topology/demanded-row findings are accepted. This provides a candidate boundary and copy counts, not a performance or quality verdict.

## Answer and eligibility

Yes: the ordinary **swept** PhysicalSurfWater plain-height provider can be recreated exactly from owned Float64 h/bed and owned fixed grid inputs. It can remain valid between updates even when the live solver steps, shifts its alongshore window or imports state. It requires no borrowed solver-height epoch and no force-all drain at the end of the synchronous body phase.

`PhysicalSurfWater.forSimulation` (`PhysicalSurfWater.ts:116–125`) installs `swept` instead of `carve` when SweptContact exists. `plainSurfaceAt` never consults swept geometry, front/library, foam, air/plume/turbulence, flow q, materialAt, peak period or solver time. Its only nodeHeight dependency is separate depth and bed interpolation (`PhysicalSurfWater.ts:301–307`). The inherited ShallowWaterSolver sampleCentered implementation reads only the supplied field and grid; BoussinesqSolver does not override it. No cached eta or extra smoothing field participates.

This eligibility must be explicit. A custom PhysicalSurfWater with a stateful carve callback, a custom solver sampleCentered override, or a generic arbitrary/stateful `heightAt` callback cannot be captured by this provider. Keep existing public SweptLoft.build / SweptContact.update and arbitrary callbacks eager. The runtime-private owned-provider factory belongs beside PhysicalSurfWater's plain height seam, selected only by its known ordinary swept setup; do not create a cast fake complete ShallowWaterSolver or construct another solver with all its unrelated buffers.

## Complete captured input set

At construction for one ordinary fixed solver layout, own nx, nz, dx, nodeSpacing, restLevel, and a **Float64 copy of zCenters** plus first/last dz scalar. ShallowWaterSolver initializes zCenters/dz once (`ShallowWaterSolver.ts:241–255`); ordinary alongshore shift changes xCenters but not the crossshore grid. The full xCenters array is not needed: height sampling and bounds use only xCenters[0]. Solver zEdges/zGaps, q/u/w/eta, gravity, solver dryDepth, bathymetry callback and interpolation scratch are not inputs. The height dry convention uses PhysicalSurfWater WET=0.01, rather than the solver's dryDepth default.

At every new live contact preparation, copy **all Float64 h and bed** into preallocated owned arrays, and capture the actual xCenters[0]. Keep the rest/layout primitives in the owned provider. Copies run synchronously after the physical water step and before the global rest/profile preparation reads the provider. The same provider and node memo must serve global forward rests, initial demanded vertex reads, seals and later query/inspection materialization for this contact generation.

Do not borrow bed: shiftAlongShore changes old bed values through open-edge leveling, copyWithin and newly revealed bathymetry (`ShallowWaterSolver.ts:425–463`); importState sets the stored state arrays (`SurfZoneSimulation.ts:716–727`). A tracked bed-version optimization is separate scope. The minimal auditable implementation copies both fields every live preparation. It may skip capture when the prepared contact is empty and no height reads/recipes exist, only after explicit empty-path checks.

Capture grid values from PhysicalSurfWater's actual solver expressions, not a nominal renderer grid object. `gatherNodes` uses zMin=zCenters[0]−dz[0]/2, then zSpan=zCenters[nz−1]+dz[nz−1]/2−zMin and rounded lastZ. `SurfZoneSimulation.renderGrid` instead uses tank.offshore/shore. Those are mathematically related, but substituting them can change floating-point bits. Preserve original coordinate construction and subtraction order. Likewise do not regenerate zCenters from nominal spacing: the solver is stretched crossshore and its exact original Float64 centres matter.

## Exact numerical algorithm

The private provider should preserve these existing stages, including operation order and strict boundaries:

1. Outside test (`PhysicalSurfWater.ts:475–480`): xMin=xCentre0−dx/2, zMin=zCenters[0]−dz0/2, zMax=zCenters[nz−1]+dzLast/2. Return captured restLevel when x<xMin or x>xMin+nx×dx or z<zMin or z>zMax. Boundary equality stays inside. Do not clamp the outer query instead of returning rest level.
2. Uniform-node addressing (`PhysicalSurfWater.ts:312–361`): lastX=round(nx×dx/nodeSpacing); lastZ=round((zMax−zMin)/nodeSpacing). gx=(x−xMin)/spacing, gz=(z−zMin)/spacing, i0/j0=floor(gx/gz). Each of the 4×4 node indices is independently clamped to [0,lastX/Z]. Node coordinates are the original additions xMin+ix×spacing and zMin+iz×spacing.
3. For each needed node, separately invoke the exact original bilinear arithmetic for owned h and bed (`ShallowWaterSolver.ts:294–316`): gx clamp to [0,nx−1], ix=min(nx−2,floor(gx)), tx=gx−ix; binary rowBelow using zCenters[middle]≤z, clamped to nz−2; tz=clamp((z−zCenters[iz])/(zCenters[iz+1]−zCenters[iz]),0,1). Preserve `(a×(1−tx)+b×tx)×(1−tz)+(c×(1−tx)+d×tx)×tz`. Do not change this into four precombined weights or interpolate h+bed together.
4. Apply depth>0.01 ? depth+bottom : bottom−0.05 at the **node**, before cubic interpolation. In swept mode no carve follows it. Combining fields first, applying wetness only at the final query, or using solver dryDepth changes the surface.
5. Store/read node height in Float64 memo and the 16-slot Float64 stencil. Compute original Catmull-Rom weights (`PhysicalSurfWater.ts:43–47`) from gx−floor(gx) / gz−floor(gz). Start value=0 and add `wz[j]×wx[i]×nodes[j×4+i]` in outer j=0..3, inner i=0..3 order (`PhysicalSurfWater.ts:240–248`). Do not reassociate, pre-round to Float32, substitute the fused renderer snapshot, or introduce a different interpolator.

The first loft height query sees original **double** vertex px/pz before the stored Float32 XZ. A later seal query sees stored Float32 XZ. This provider accepts both unchanged; the existing row recipe must preserve their separate coordinates and first/seal Float32 Y stores as documented in the demanded-row audit. Copying h/bed from a Float32 saved checkpoint instead of actual captured Float64 runtime inputs is not exact to this generation.

## Private node cache and lifetime

Use an owned dense Float64 node cache plus Uint32 generation stamps, indexed by nodeZ×(lastX+1)+nodeX, and a 16-slot Float64 stencil. Reset validity on each capture by incrementing a generation; clear stamps on wrap just as current invalidateSurfaceNodeCache does (`PhysicalSurfWater.ts:147–155`). Reuse values for every read of the current contact. No live cache scope is borrowed, no ordinary flow query is memoized, and no body/gauge completion drains remaining rows.

The current withSurfaceNodeCache begins/ends invalidation because it borrows live mutable water. The owned provider replaces that dependency **only for contact construction**; ordinary PhysicalSurfWater samples/reactions continue to use their existing live solver, cache rules and current flow. Cross-contact cache reuse is prohibited even if the window appears unchanged, since h changes each water step. A captured x origin and owned h/bed keep prior contact answers correct while live h/bed/window/import change before the next contact preparation.

Reusing preallocated owned arrays at the next preparation is compatible with the current mutable contact generation: SweptLoft already reuses one result/typed-array set and an older public last reference aliases that set on the next update. Before overwriting the provider, retire all old row recipes/normal-ready flags atomically with replacing the contact generation; no old deferred recipe may later run against the newly captured fields. Public last exposure must materialize current output before callers can mutate arrays; it need not materialize every row merely because the live water begins another step. A separate consumer requiring independently retained immutable generations would need its own provider/storage; that stronger contract is not the current last behavior.

A known ordinary fixed grid can own zCenters once. A generic public caller can mutate its supposedly readonly typed arrays or provide different dimensions; keep that caller eager or explicitly rebuild provider/storage on layout replacement. Do not silently reuse an old grid under changed centres/dz. Precomputing node bilinear weights from relative coordinates is not the minimal exact candidate: x coordinate addition/subtraction rounding can depend on the shifted absolute origin. Reuse the original arithmetic first.

## Allocation and per-update copy accounting

For C=nx×nz physical cells, Z=nz, and R=(lastX+1)×(lastZ+1) actual uniform height nodes, typed-array payload is:

| Owned storage | Bytes |
| --- | ---: |
| Captured Float64 h + bed | 16C |
| Owned Float64 zCenters | 8Z |
| Float64 node cache + Uint32 stamps | 12R |
| Float64 16-node stencil | 128 |
| Total typed-array payload | 16C+8Z+12R+128 |

For the ordinary Padang layout C=160×725=116,000 and representative R=161×633=101,913: h+bed=1,856,000 B; zCenters=5,800 B; cache/stamps=1,222,956 B; stencil=128 B; **total 3,084,884 B (about 2.942 MiB)**. R must be checked against actual captured PhysicalSurfWater bounds/rounding, not inferred solely from renderer-grid metadata. Counts exclude JS objects, scalar field representation, optional captured row recipes and any unchanged contact arrays; they are payload accounting, not measured memory/VRAM. No full second ShallowWaterSolver allocation is justified.

Mandatory field-copy payload for a live generation is 16C=**1,856,000 B per contact update**, even when only a handful of rows are demanded. At nominal 60 updates/s that is 111.36 MB/s destination writes plus the same source reads, about 222.72 MB/s combined payload traffic. This does not predict actual cache bandwidth, wall cost or FPS. Node stamps normally incur one scalar generation update instead of an R-sized clear; first-use node samples remain demanded work. zCenters has a one-time 5,800 B copy for the fixed ordinary layout; capturing x origin/boundary values is scalar work. Length/layout changes require explicit storage replacement.

The complete-path benchmark must charge the two full-field copies, provider capture/cache invalidation, global forward rests/topology, all demanded row/seal/normal work and query bookkeeping. It must not exclude copy time as fixture initialization or report only a lower eager contactMs while demanded work moves into board/gauge. Initial persistent allocations and setup may be reported separately, but steady capture copies belong inside each update's cost. Full-result materialization and old-contact reads after live h/bed/window mutations need parity validation against the original eager contact. Only those comparisons and an actual demand trace can justify the candidate.
