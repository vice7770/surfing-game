# Prospective ordinary-worker contact normals on demand

Source-only design in `/Users/regina/Desktop/Projects/surfing-game`, 2026-10-04. The previously accepted `/private/tmp/nearshore-domain-feasibility-20261004.md` is unchanged. No production/candidate implementation, tests, build, benchmark, server, browser/GPU operation, or Git operation was performed. This candidate remains prospective until actual demand counts justify a complete-path cost experiment.

## Chosen scope and ownership boundary

Keep the original full eager profiles, both Float32 Y stores and original height-call ordering, forward rests, planned rays, overlap retirement, seals, positions, diagnostics, indices, topology, captured contact projections, grid/index and lazy bucket preparation. Only the complete-run vertex-normal calculation may be skipped by a **private ordinary-worker query backend**. A successful nonanomalous query prepares the exact normals of the three vertices selected by the original crossing sort and surface selection. `floorAt`, candidate misses, overlap backstops and anomalous false queries prepare no normals.

Do not globally replace mutable `SweptContact.last` with a materializing getter. `SweptLoft` reuses one LoftResult and its typed arrays across updates; final run normals overwrite only those runs. Isolated/unjoined and inactive normal slots intentionally retain old contents, and a held public result/normal-array alias can observe later updates without reading `last` again. A getter that completes only the current runs cannot reconstruct historical unused slots after shrink; draining every prior epoch would defeat the proposed saving. Those are reasons to isolate the new backend, **not new parity requirements for its unpublished unused slots**.

`new SweptContact(...)`, its public/default `update`, `new SweptLoft(...).build`, direct/local `new SurfZoneRunner`, existing custom/stateful callbacks and all their full mutable public outputs remain eager. Do not add a generic `lazyNormals: true` ContactOptions/LoftOptions/SurfZoneConfig or serialized user setting. No changes are proposed to drawn lofts or generic public mutation semantics.

## One concrete minimal API

Use one worker-only owner factory whose result has two objects, neither exposing LoftResult or the raw SweptContact backend:

```ts
// Internal package API; not a config, request, or user-supplied callback option.
type SweptSurfaceQueries = Pick<SweptContact, 'query' | 'floorAt'>;
type OrdinaryContactOwner = {
  readonly queries: SweptSurfaceQueries;
  updateFromPlainSurface(
    records: Float32Array, count: number, stillLevel: number,
    water: PhysicalSurfWater,
  ): void;
};
createOrdinaryContactOwner(library, slope): OrdinaryContactOwner;
```

The factory closes over the private backend and returns a frozen facade of bound `query`/`floorAt` methods. It does not return a SweptContact instance cast to a smaller type: that still leaks `last` at runtime. Its internal `updateFromPlainSurface` uses only the actual ordinary PhysicalSurfWater's `plainSurfaceAt` under the existing synchronous node-cache scope, with the original read order. It accepts no arbitrary height function. Mutable `stats` may stay inside the owner for QA counters; no production consumer needs it published through the facade. The generic full-result class stays the public/default path.

Add an internal `SurfZoneRunner.forWorker(config,options,start)` construction entry used only by the two start paths in `SurfZoneWorkerCore` (warm/device and synchronous/CPU). It chooses the owner only when the actual runner constructs ordinary Padang swept contact: Padang, stage 2, a decoded library/slope, a real front, and rider/board/contact enabled; its real water is the `PhysicalSurfWater.forSimulation(simulation,queries,renderSpacing)` provider with swept contact and no carve. It is the worker factory's private decision, not a boolean read from posted options. All other construction/default paths create the original eager SweptContact. Eligibility need not guess from a function's identity or duck-type an arbitrary callback.

Runner internally stores `contactQueries` and optional `ordinaryContactOwner`. Default runners continue publishing their existing eager `readonly contact?: SweptContact`, with queries pointing to it. The privately owned worker runner uses the opaque facade instead; updateContact and the swept-vs-parcel-strike branch use the internal query source. Its raw backend is never put in `runner.contact`, snapshots, status or init. `PhysicalSurfWaterOptions.swept`/`forSimulation` need only the structural query interface, so default eager instances remain valid. Public `runner.contact` behavior is unchanged for default/direct/local runners; a worker-created runner never escapes as a public runner.

The exact internal method shape used by SweptLoft to finish runs can be a query-only build entry owned by this factory; the important implementation constraint is no public normal-mode option and no shared mutable mode across instances. Public `build` always requests the original eager normal pass. Runtime query-only build records final-run bounds while leaving `finishRun` mouth/join behavior, all seals and all other writes intact. No indices, diagnostic or sheet-output removal is part of this candidate.

## Actual readers and escape points checked

- `SurfZoneRunner.ts:362–363` currently creates contact and passes it to water. `updateContact` (:489–498) is the one production contact update site, writing front records then caching plain physical heights synchronously. The only other production use of its contact field is presence for the parcel-strike branch (:528). It does not read `contact.last` or normals for status, fill, gauge or rendering.
- `PhysicalSurfWater.sampleAt` (:180 onward) calls `swept.query` into one reused private `ContactHit`, and `fromContact` (:398 onward) consumes the answer. `surfaceAt` (:230–237) calls `floorAt`. It never reads `last`, result arrays or the backend class. Its generic options can accept an eager instance unchanged.
- `SurfZoneWorkerCore.runner` is private (:45). Both start paths construct and privately retain a runner (:82/:96). `ready` (:134–142) publishes the render grid/bed/focus/window/dx and normal worker snapshot; `reply` fills fields/status; `exportState` serializes `runner.simulation.exportState`; restore imports solver/front state. None publishes the contact/runner/LoftResult or normal arrays. WorkerSurfZone only receives those transferable fields and status.
- Direct/local `SurfZoneHost` constructs `new SurfZoneRunner` and exposes its runner, so it stays eager. `SurfZoneRunner.test.ts:655` inspects `runner.contact.last`; it also stays eager. `sweptContact.test.ts` reads and mutates last arrays/topology, spies on the loft build result, and tests captured projections after mutation; those are authoritative public eager semantics, unchanged. PhysicalSurfWater tests comparing complete lofts and scene SweptBarrelMesh normals also stay eager.
- Source-level private-field casts used by QA scratch tooling are not production escape points. An approved private-backend QA capture must use copied input/output or explicit instrumentation; it must not expose a mutable production LoftResult in order to satisfy the old test helper shape.

## Exact original per-vertex recipe

Record final runs **where `sealRuns` calls `finishRun`**, after overlap decisions and all position seals for that run (`sweptLoft.ts:870–905`). A live slice that belongs to no final joined run gets no valid normal recipe and must never be selected by an indexed strip. Each row in a run stores its first/last row, or its clamped row-neighbor indices. The original normal routine (`:1080–1115`) uses final Float32 positions, never profileAt/pointAt or a water callback:

```text
sBack=max(runFirst,s−1); sAhead=min(runLast,s+1)
jBack=max(0,j−1);        jAhead=min(133,j+1)
a0=3*(s*134+jBack);     a1=3*(s*134+jAhead)
b0=3*(sBack*134+j);     b1=3*(sAhead*134+j)
ax=p[a1]−p[a0]; ay=p[a1+1]−p[a0+1]; az=p[a1+2]−p[a0+2]
bx=p[b1]−p[b0]; by=p[b1+1]−p[b0+1]; bz=p[b1+2]−p[b0+2]
cx=ay*bz−az*by; cy=az*bx−ax*bz; cz=ax*by−ay*bx
length=sqrt(cx*cx+cy*cy+cz*cz)
if length>1e−12: cx/=length; cy/=length; cz/=length
else: cx=0; cy=1; cz=0
normals[3*v]=cx; normals[3*v+1]=cy; normals[3*v+2]=cz // Float32 stores
```

Keep operand/evaluation/store order and the fallback literally. Do not replace sqrt with hypot, change the threshold, use face normals, choose a wider halo, normalize after Float32 rounding instead of before, or interpolate Float64 components without the three original Float32 stores. Clamp row neighbors to the **captured final run**, not front ID, current sliceJoined flags or adjacent live row. Cut ends and faded gaps produce different normals even when their front IDs match. The j=0/133 sample end cases are one-sided differences.

Immediately before the unchanged barycentric loop in `SweptContact.normalAt` (:426–441), prepare/cache vertices `at[3*k+m]` for m=0,1,2 of the original selected surface crossing. Even zero-weight vertices are prepared: original multiplication reads every component, and 0×NaN/Infinity/signed-zero semantics must not be optimized away. `normalAt` then accumulates in the original m/component order from the stored Float32 normals and normalizes its resulting Float64 sum with the original 1e−12 fallback. The per-vertex fallback and final hit fallback are two separate stages.

The private cache marks a vertex ready only after all three Float32 stores. A Uint8 ready array reset once per contact update is sufficient; no cached normals survive the update. Run bounds and ready state are owned by the same backend as its final positions, with no query-time allocation or public aliases. At maximum capacity the existing normal array is 480,792 bytes (40,066 vertex slots); one new Uint8 cache is 40,066 bytes and two Int32 bounds arrays for 299 rows are 2,392 bytes. Buffers are preallocated/reused; this is capacity, not per-frame allocation saving. A full active maximum run has 39,932 normals; the private path prepares at most three per successful query before cache hits, and one per distinct demanded vertex per epoch. Count actual demand, including sampleAt calls from bodies and gauge bookkeeping; do not assume gauge activity is all floorAt.

## Query ordering and reused-hit contracts

The original query sequence remains: increment stats.queries; select first owning strip with exact ray-half-open tests/nudge and candidate crossings; run later-front XZ overlap backstop without replacing count/at/weights; classify sorted crossings above y; update layer/lip-reset fields; reject air below every crossing as an anomaly; set surfaceY; prepare the selected three vertex normals; interpolate normal; derive tangent/life/lip material velocities; increment stats.hits; return true.

An outside/candidate-miss false query leaves the reused hit untouched. The anomaly false path already writes `inWater`, `floorY`, resets water/ceiling/lip fields, but leaves prior surfaceY/normals/tangent/life because it returns before those assignments. Preserve that exact partial output, not a freshly initialized miss. PhysicalSurfWater calls fromContact only on true, so stale hit fields are not generally consumed there; direct query's observable hit still has to match on false. `floorAt` does not write ContactHit or call normalAt, and may update quad statistics through the existing crossings path. Preserve every stats counter and candidate order.

Overlaps require no normal for a later front used solely by `heldByAnother`; its `ensureBucket`/meets path reads XZ. The selected first front's count/at/weights survive that check. Do not switch to a later surface, cache by query point/strip/triangle, or compute normals for all crossings. Cache only by vertex within the contact epoch.

## Lifetime and snapshot semantics

All positions/Y/metadata are captured by the original eager build before updateContact's water node cache closes. Lazy normal calls after that scope, during board/rider stepping, later gauge calls, status's fallback gauge, or synchronous public query facade reads use only the stored Float32 positions and final run recipe. Physical water h/bed changes, board q impulses, a window shift or solver import after update do not change the current contact normals, just as eager normals already reflect the previous build. No new height epoch, h/bed copy, provider memo, borrowed callback, or cache scope extension is needed.

At the next contact update, invalidate ready/bounds **before** rebuilding/indexing and replace the internal current geometry generation at the same point as the original update. No snapshot of a previous raw LoftResult escapes. Input records and provider callbacks are fully consumed in the synchronous build; later record reuse is irrelevant. Until the next update, solver restore changes simulation state but the contact geometry/cache remains that of the old contact epoch, matching existing restore ordering; the next afterWater rebuild replaces it. Empty or shrinking lofts invalidate every cached vertex and final-run recipe. An exception follows the existing eager update's partial-state contract; do not add a retry using changed water. Reentrant/stateful callbacks are ineligible for the private factory and continue through the untouched eager public path.

Inactive private normal slots may remain unprepared/stale because there is no result-array contract for that private backend. This is deliberately not an excuse to ignore any actual selected vertex, ContactHit field, floor result, callback order, stats/order, provider lifetime or gameplay outcome. Default/public historical unused buffer behavior must still pass unchanged tests. No materialize-all-at-end-update/end-epoch fallback is part of the private design.

## Exact parity test specification for an authorized prototype

These are tests to implement/run only after root authorizes a candidate, not new tests written in this task. Use the untouched original eager contact as answer authority with identical records/stillLevel/provider inputs. Avoid an oracle that shares a newly factored scalar normal helper; that can repeat the same bug on both sides. Comparison must include return booleans, every ContactHit property even on false, NaN and signed-zero identity (`Object.is`/bit inspection), floors, stats and observed provider call stream. JSON conversion is insufficient for nonfinite or signed-zero values.

1. **Real queries across geometry epochs.** Replay original actual front records and the actual ordered body/gauge query stream once it is captured, plus existing contact fixtures for steepening/open/closing/collapse/fade, real overlap cuts, end seals, folded triangles and multiple final runs. Compare each query/floor answer and fields literally at matching epoch/order; retain identical profile/Y/seal/indices/topology/projection bytes and height-call count/order. The primary capture's counts must not silently substitute floor-only demand for all sampleAt demand.
2. **Selected normal bits and numerical guards.** For every selected vertex, compare the three prepared Float32 bytes to the original eager output before barycentric interpolation, including j=0/133, interior, final run first/last rows, cut/fade/budget boundaries, short runs and repeated/shared vertices. A small independent original-normal fixture can exercise degenerate/near-1e−12/NaN/signed-zero cases, but integration answers remain the authority. Compare final normal interpolation/fallback too; no tolerance for a different Float32 stage.
3. **Miss/anomaly/reused hit and overlap ordering.** Seed the same reused hit with distinct prior values, interleave true, outside false, candidates with no crossings, anomalous air below all crossings, and y values exactly at crossings/rays/quad edges. Assert exact partial-field mutation and stats. Existing first-front overlap and captured-projection tests remain unchanged on the public path; private real overlaps must preserve at/count/weights and prepare normals only for the selected first-front surface.
4. **Cache/lifetime pressure.** Repeat queries at changed y selecting different crossings and at shared vertices; assert one preparation per unique demanded vertex in that epoch. Mix floorAt and query order; floor-only, miss-only and anomaly-only epochs must prepare zero normals. Change live solver h/bed/q or records after an eager update and query again before the next update: the private normals and answers must remain those captured by that update, with no extra height callback calls. Verify large→small→empty→large updates discard every cached vertex/bound, repeated updates at the same sea time still invalidate, and restore/query-before-next-afterWater ordering agrees with eager contact.
5. **Eligibility/public isolation.** Default public SweptContact/SweptLoft and direct/local Runner remain eager; retain existing full-output comparison and public mutation tests, including held result aliases and inactive/isolated normal slots across shrinking updates. No private instance drain is required for hypothetical unused outputs. Verify worker ready/reply/state export/init contain no backend/facade/result arrays and the facade has no last/normals/positions or raw instance. Custom/stateful public height callbacks retain original eager call streams and normal output. CPU and device worker starts must make the same explicit eligibility decision; non-Padang and missing-library/noncontact paths remain eager.
6. **Complete-path performance gate.** After exact parity passes, compare original contact build plus **all** body/query/gauge/status costs against private build plus demand-cache invalidation, run metadata and normal preparation, under equivalent actual late water/front/query epochs. Charge work shifted from contactMs into boardMs or later gauge/status timing. Include construction/storage and any new facade dispatch cost as appropriate. Capture unique demanded vertices divided by original eager final-run normal count, not just strip count or total queries. Do not infer an FPS gain from a cheaper build or a floor-only synthetic fixture.

## Decision boundary

This normal-only candidate is numerically narrower than demanded heights: all geometric dependencies are already captured, there is no physical height epoch, and query/floor sorting/support remains original. Its effectiveness still depends on actual unique selected vertices and complete-path timing. The concrete minimal contract is the private frozen query facade owned solely by WorkerCore's runner; a global public lazy-output replacement is rejected. No larger output removal, contact geometry simplification, new quality tier, changed normal formula, historical-drain requirement or FPS claim is included.
