# Late JS profile interpretation — v1 invalid, zero profiles

This note is separate from the reviewed, frozen driver/readiness files. Root owns the single hardware run. No profiler/CDP call, build, replay or production mutation is performed by this interpretation.

Authority: exact frozen 4211 build; main SHA-256 `fd2c2bd093073e04d25b191833a9b45b4465554b743cf1fd1faca7208987e8a0`, worker `21b796673a700d9ecb8c46fb32c913795a89134c51adb0860e98f646f65371fa`. Each generated attribution row carries URL, zero-based line/column and the pinned source excerpt/hash. Names alone are insufficient: several different classes expose `build`, `update`, `render`, `prepare`, `index` and `normals`.

## Reading rules

- **Worker JavaScript:** sample-weighted self rows identify where the worker executes; a parent's inclusive column already contains its descendants. Do not add contact build, profile lookup, node sampling and their ancestor totals. Resolve anonymous/minified labels using the exact bundle location and raw profile parents, not by guessing from the label.
- **Worker idle:** `(idle)` reports an idle sample category. Awaiting WebGPU mapping can contribute, but so can waiting for the next main-thread request, event/microtask scheduling and other waits. Correlation with pipeline device-map/request witnesses is contextual evidence, not an exclusive attribution of idle to GPU. No GPU timestamp query was used.
- **GC/native/program:** keep these categories and unresolved source positions visible. CPU sampling does not establish whether a tuple/object escapes V8 optimization, nor whether a sampled native operation is computation or a blocked driver call.
- **Main rendering JavaScript:** WaterSurface snapshot consumption, actual drawing loft updates, FftChop/Caustics dispatch and Three renderer/WebGL submission occur in the page isolate. They are separate from worker simulation CPU and actual GPU execution. Main and worker profiles overlap in wall time, so their inclusive time is not one serial frame budget.
- **Timing:** profile sample weights approximate elapsed time represented by sampled stack positions; they are not per-function stopwatch or call-count measurements. Raw start/end/sample deltas and command boundaries show the actual capture span. FPS from this instrumented run is diagnostic, not passive acceptance.

## Source anchors to disambiguate actual rows

| Expected row/caller | Actual responsibility |
| --- | --- |
| `SurfZoneRunner.updateContact` → `SweptContact.update` → `SweptLoft.build` | Worker original full contact preparation before the body phase; includes loft construction, projected ranges and global strip indexing. Along-ray quad buckets are prepared lazily by later queried strips. |
| `SweptLoft.loftFront` / `profileAt` / `pointAt` / `landmarkVelocity` | Worker authored profile and landmark interpolation, contact/drawing hold conventions and transport velocities. Resolve contact context through parents; page drawing can invoke its own loft/library path. |
| `CrestRayPlan.prepareRecords` / `prepare` / `load` / `rayAt` | Shared-ray planning and queries; use actual source position and parents to distinguish contact preparation, crash planning and page drawing. |
| `PhysicalSurfWater.plainSurfaceAt` / `gatherNodes` / Catmull helpers | Worker full-node heights/interpolation while contact loft reads its plain underlying water; also body/gauge paths. The scoped node-height memo remains active during contact build. Visible source tuple/object expressions are not proof of allocations. |
| `FoamField`, `AerationField`, `AdvectionStencil` update bodies | Worker breaking/transport fields, with physical source dependencies. Do not assume visual-only shading work. |
| `SurfZoneSimulation.writeUniformFields` via runner fill | Worker fused publication output traversal, separate from subsequent page texture copies/uploads. |
| `GpuBoussinesq` pack/CFL/encode/unpack | JavaScript CPU preparation and readback consumption. GPU kernels and asynchronous map waiting are not directly represented as worker JS kernel execution. |
| `PhysicalMode.update`, `WaterSurface.update`, `drawBarrel` | Page latest-snapshot consumption and drawn geometry updates; avoid conflating them with worker contact construction. |
| `FftChop.render`, `Caustics.render`, Three `render`/WebGL submission | Page graphics preparation/submission; repeated generic `render` labels must be resolved from source locations and parent stacks. GPU elapsed work requires separate evidence. |

## V1 outcome

The attempted identity check stopped at 2026-10-03 23:32:13.724 UTC, before any Profiler enable/start/stop command. The actual host-port constructor URL/start/config/native guard passed. CDP returned a single worker belonging to the page frame, but its TargetInfo.url was empty, so the v1 exact target-URL predicate rejected it. The retained target inventory supports this observation; it does not establish why the URL was empty.

`result/cpu/report.json` is invalid, with an empty command list and empty profiles. No raw CPU profile or attribution table exists. There is **no worker/main cost finding** and no allocation or GPU-wait conclusion from this attempt. Existing profile anchors above are source context only. Root requested a separate reviewed v2 that verifies the uniquely related worker's own `self.location.href` before any profiling, with no automatic retry of v1.

All v1 driver/helper/readiness and raw reports/console remain unchanged. FPS from its observed run is diagnostic and cannot substitute for absent CPU attribution or passive acceptance.

V1 workflow finished at 23:32:31.101 UTC with exit 1 and TCP ECONNREFUSED proving owned CDP 9546 closed. The readiness manifest records prelaunch bytes: runtime intentionally wrote preparation.json with planOnly:false. Preserve that post-run metadata and the unchanged dry-plan/readiness evidence as separate states, rather than claiming all nine readiness records remained current after launch.
