# Packed front coordinates and tracker identity

This is a source-only audit and an unexecuted CPU reproduction plan. No solver replay, browser, GPU run, build or production edit was performed. The reported C24 disappearance at sea time 167.38333333333316 → 167.3999999999998 is **not causally explained** by this audit.

## What the snapshots identify

[`SurfZoneRunner.fill`](../../../src/wave/SurfZoneRunner.ts#L712) writes only `simulation.front.points` through [`writeFrontRecords`](../../../src/wave/barrel/frontRecords.ts#L16). The nine Float32 fields are `x`, `z`, `front`, `sigma`, `tau`, `footHeight`, `footDepth`, `throwZ` and `pace`: neither `FrontPoint.id` nor its `column` is serialized. The reported half-integer X values 156.5 and 158.5 are exactly representable in Float32, so rounding does not explain their absence.

[`columnCrests`](../../../src/wave/barrel/crestOnset.ts#L81) assigns `column = ix` and `x = solver.xCenters[ix]`. [`BreakingFront.update`](../../../src/wave/barrel/BreakingFront.ts#L282) matches previous active or held points in the same column, then preserves their internal ID while replacing X with the new sample's X ([paced match](../../../src/wave/barrel/BreakingFront.ts#L302), [ordinary match](../../../src/wave/barrel/BreakingFront.ts#L326)). A new join allocates [`id: this.nextId++`](../../../src/wave/barrel/BreakingFront.ts#L385). X is consequently a present spatial column coordinate, which can be reused by a different tracker point; it is not a persistent point or fluid-material identifier.

On the **ordinary fixed grid**, a continuously matched point retains that column's X. The pacing in these sources changes Z only: [`BreakingFront` coasting](../../../src/wave/barrel/BreakingFront.ts#L407) retains the old X, and [`SweptCrash`](../../../src/wave/barrel/SweptCrash.ts#L194) finalizes `z = jetBase + jetPace * tau`. Its [pace setup](../../../src/wave/barrel/SweptCrash.ts#L385) changes no X. The X assignment in [`SweptCrash.pour`](../../../src/wave/barrel/SweptCrash.ts#L426) belongs to a separate pooled crash-curve point, not the `FrontPoint`. There is no source evidence that ordinary shoreward pacing moved the observed point to a nearby X. No separate `CrestPacer` implementation was found; these are the actual pacing paths.

The lower-level [`shiftAlongShore`](../../../src/wave/ShallowWaterSolver.ts#L426) API changes all X centres by an integer number of columns. A subsequently matched tracker ID could therefore receive a different world X. A search of non-test `src` callsites found only that declaration and [`BoussinesqSolver`'s forwarding override](../../../src/wave/BoussinesqSolver.ts#L581), with no ordinary runner, simulation or gameplay invocation. This supported operation is not evidence that the captured run shifted its window.

Front number, sigma and tau do not complete a persistent key. [`BreakingFront.link`](../../../src/wave/barrel/BreakingFront.ts#L574) assigns each current chain an inherited, unclaimed front number or a new one; the same point can acquire another front number while front 0 remains elsewhere. Sigma is geometry-derived arc length. [`advanceClocks`](../../../src/wave/barrel/sliceClock.ts#L161) makes tau nondecreasing but permits pauses and shared clock values. Thus even the fixed `(front, X)` pair is insufficient to follow a particular point through relinking or a different join in the same column.

The stable tracker key is **`FrontPoint.id` within one runner/state-history epoch**. Its [contract](../../../src/wave/barrel/BreakingFront.ts#L120) says “Fixed while the point is matched step to step.” Matched and coasting paths preserve it; [`FrontState` export/import](../../../src/wave/barrel/BreakingFront.ts#L626) preserves active and held IDs, their ordering and the allocation counters. [`SurfZoneSimulation` export/import](../../../src/wave/SurfZoneSimulation.ts#L705) carries that state. A fresh runner starts its counters again, and restoring an earlier history can revisit its IDs. This remains a geometrically matched tracker identity, not proof of a Lagrangian water parcel.

## What a disappearing coordinate does not establish

An unmatched active point can enter [`held`](../../../src/wave/barrel/BreakingFront.ts#L421) for up to 0.5 seconds and return with the same ID. A point on its pace can coast without a sampled crest while `tau < jetUntil`. [`SweptCrash.update`](../../../src/wave/barrel/SweptCrash.ts#L173) also removes points under explicit [stall/fade-stall rules](../../../src/wave/barrel/SweptCrash.ts#L318). These are possible transitions, not diagnoses of this capture. The packed writer is additionally capacity-limited to 2,048 points; this audit has no evidence that truncation caused the event.

The [mature combined report](moving-mature-incomplete/combined-report.json.gz) selects front 0/X 156.5 at sea time 167.38333333333316: phase 1, tau 0.1396869570016861, source record present. At the next publication, sea time 167.3999999999998, that pair is absent while front 0 remains. The earlier [moving probe](moving-repair-incomplete/README.md) reports the same boundary for its fixed X 158.5 witness. This establishes missing packed membership, **not** physical retirement, touchdown, movement to the nearest X, or the identity of a replacement. Closest-point substitution cannot recover an omitted tracker ID.

## Recorded C24 inputs and missing authority

The configuration below comes from `initial.config` in the **successful mature combined report**, also retained in its [first-open checkpoint](moving-mature-incomplete/combined-checkpoint-first-open.json.gz). It is not inferred from “C24”, the ordinary Padang Big defaults, a build label or a sea-time guess.

```json
{
  "spot": "padang", "seed": 1, "significantHeight": 4, "peakPeriod": 10,
  "directionDegrees": 10, "spreading": 11.720624206334085,
  "tide": 0, "windSpeed": 0, "stage": 2, "compute": "auto",
  "dx": 1, "fineSpacing": 1, "startSeaTime": 164,
  "spinUpPeriods": 2, "componentCount": 24
}
```

The retained [driver](moving-mature-incomplete/moving-driver.mjs.txt) supplies buoy settings with `spread: 0.4`, then explicitly overrides wave seed/spreading/grid/start/spin-up/component count to the values above. It starts `d.start(settings, overrides, {rider:false, lab:true})` while paused, verifies actual GPU compute/203,200 cells/config/clock scale 1, and then unpauses at scale 1. Its URL explicitly selects render spacing 1; the observed render grid is 321×1161, X minimum −160, spacing 1. The driver's page `Math.random` seed `0x5eed` is separate from, and does not replace, the explicit wave seed 1. The mature baseline failed before retaining `initial`; it is not an independent configuration witness.

The served physics worker was `surfZoneWorker-BH6FhcTP.js`, SHA256 `eb1a337b66c0eea19035241aee1c46a129a039548e21916d428a6a1a50d2d3c5`. The recorded source manifest agrees byte-for-byte with the current `SurfZoneSimulation`, `BreakingFront`, `SweptCrash`, `crestOnset` and `frontRecords` sources reviewed at HEAD `f765f5a41d68628d9b3d499e5845709d9e3993ae`.

| Retained authority | SHA256 |
| --- | --- |
| Mature combined report gzip | `ce3f60f0c8e44cf7cfe8e4ec611d9c2ea103941efbfa7bba910de8541f443fda` |
| First-open checkpoint gzip | `084104f8e3b6a02a8c6cc4f96648da2813ae5c36e7dd1eb9e605e66bcc22818a` |
| Moving driver | `dd67db48aaea3a88ab773280b5f4b9e1d9138439e20c680f9a24b10046a2703f` |
| Moving helper | `ccaa33b33af137fa4a35b9422810495f127ebd840005b534159bfef3d467178d` |

The compact first-open checkpoint contains the nine packed front fields, F32 render-node heights, loft, mask and presentation metadata. It does **not** contain `FrontState` active/held IDs and tracks, a full solver/state export, original post-water crest samples or all GPU input fields. It cannot restore the original 167.3833-second tracker state. Consequently the literal original GPU point's held/removed/relinked identity at 167.4 is not reconstructible from these retained inputs alone.

## Minimal CPU-only controlled plan — not executed

1. Prepare a new isolated Node harness from the recorded, hash-guarded physics sources, preserving all recorded config fields except the explicitly documented `compute: 'cpu'` choice. Load the exact Padang case assets in original index order and hash them; [`PhysicalMode.start`](../../../src/game/PhysicalMode.ts#L513) gives those bytes to the host even when `rider:false`, and [`SurfZoneRunner`](../../../src/wave/SurfZoneRunner.ts#L347) uses them to construct the material crash. Do not omit the library, invent a seed, add a rider/contact or silently use current default dx/component count. Render spacing 1 is only needed if comparing packed render outputs; physics observations can use the simulation directly.
2. Warm-start and spin up using the existing constructor/`spinUp` behavior. Here [`spinUpPeriods * peakPeriod`](../../../src/wave/SurfZoneSimulation.ts#L573) is 20 solver seconds, with sea offset 144, and spin-up uses the freshly checked [CFL-limited step](../../../src/wave/SurfZoneSimulation.ts#L668), not 1,200 forced 1/60 steps. Assert settled sea time 164 and 203,200 physics cells. Then advance only fixed 1/60 steps: publication 203 corresponds to about 167.3833 and 204 to about 167.4. No drawing, wall-clock advance or browser is needed.
3. Observe only the narrow interval 167.25–167.4167. In the isolated harness, wrap the original `front.update` and `crash.update` calls without changing their arguments, ordering or return values. Retain `front.exportState()` before/after matching/linking and after clocks/crash; log exact IDs, column/X/front, tau, joined/seen/throw/jet timing, active/held membership and the crash exit/fade-exit IDs. Capture IDs before relinking mutates front membership. At the chosen pre-step witness, require a **unique** `(front 0, X 156.5)` active point before adopting its internal ID. Track that ID across the next phases, not the closest coordinate. Separately log X 158.5 to compare the earlier witness, without retargeting either.
4. Classify only observed transitions: same ID active with changed front = relink; same ID held = matching loss/hold; present immediately before crash and in its explicit exit/fade-exit list = that removal rule. Absence without such evidence remains unclassified; it is not labelled retirement. Save array/config/source/case hashes, fixed-step clocks and all failed gates. Predeclare a hard CPU deadline (for example 120 seconds) and fail as incomplete if spin-up/target steps do not finish; do not widen it or repeat automatically.
5. Treat this as a controlled **CPU analogue**. CPU F64 solver arithmetic and original WebGPU F32 arithmetic can produce different crests, joins, clocks and IDs, including during spin-up. Require the target witness and record packed-record/geometry differences; if it does not occur, report that result without replacing it with a nearby point. Even a visually similar CPU event is not proof of the original GPU transition. Exact attribution would instead require the original internal tracker state plus ordered post-water crest/crash inputs (or an instrumented repeat on the original backend); neither was retained, and that hardware work is outside this plan.

No reproduction has been run, and no lifecycle acceptance, performance gain or source correction is proposed from this audit.
