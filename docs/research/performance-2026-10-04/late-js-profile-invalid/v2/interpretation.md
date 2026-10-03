# Late JS profile interpretation — v2 invalid, zero profiles

Root started the separately reviewed v2 once at 2026-10-03 23:34:41 UTC, owned CDP 9547. This note alone may change; prepared source/readiness files remain frozen. No game-server fetch, CDP command, browser, build or production mutation is performed by this interpretation. The protocol analysis below reads public primary source only.

Exact source authority is frozen 4211: main `fd2c2bd093073e04d25b191833a9b45b4465554b743cf1fd1faca7208987e8a0`, worker `21b796673a700d9ecb8c46fb32c913795a89134c51adb0860e98f646f65371fa`. Raw profile URL and zero-based line/column, plus pinned excerpts and raw parent chains, determine mappings. The invalid v1 contains zero profiles and no cost finding.

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


## Observed v2 result

The v2 run ended invalid before any Profiler command. Its sole worker target had the expected page parentFrameId and browser context; direct browser-root flat attachment returned session IDs. The subsequent worker-session Runtime.evaluate of self.location.href hit the local SessionCDP 10-second command deadline. No inside-worker URL observation or profile exists. The record does not establish whether Chrome failed to process the command, failed to route a response, or another cause applied.

Raw profiles remain {}, and the command list contains only the failed identity Runtime.evaluate, with no Profiler enable/start/stop. There is no main or worker CPU cost finding, and no evidence about tuple allocation, GPU wait or a particular contact/shading bottleneck. Root forbids a third trial or deadline widening.

Workflow ended at 2026-10-03 23:36:43 UTC with exit 1; TCP ECONNREFUSED proves owned CDP 9547 closed. All v1/v2 sources, raw reports and console are retained, and no production change was made. The v2 dry preparation/readiness bytes remain preserved; separate runtime-preparation.json records the live invocation. FPS rows from these failed attribution attempts are diagnostic and cannot supply passive acceptance.


## Primary-source protocol findings — mechanism, not a diagnosed cause

The Chromium source explains why target discovery and successful attachment need not establish an operational worker backend:

1. `WorkerDevToolsManager::WorkerCreated` constructs a dedicated-worker host with empty URL/name and the parent identifiers (lines 43–68). `AddAllAgentHosts` exposes those hosts; the destruction path explicitly allows a worker that never established its Mojo connection (lines 74–91). An empty target URL can therefore describe a browser-side placeholder rather than the executing script URL. [Worker manager](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/worker_devtools_manager.cc).
2. Parent-renderer `ChildTargetCreated` finds that placeholder, supplies its URL/name, and binds its renderer agent (lines 151–218). Session attachment only attaches to an agent when the channel has one (lines 95–104). [Renderer channel](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/devtools_renderer_channel.cc).
3. `RendererAutoAttacherBase::UpdateAutoAttach` enables the parent renderer's child-target reporting when auto-attachment is active (lines 148–161). This is an actual initialization path, not merely a change in how the client labels an existing session. [Auto-attacher](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/target_auto_attacher.cc).
4. Browser `Target.attachToTarget` looks up the host and returns the result of session attachment; it does not activate that parent's child-target reporting (lines 1119–1137). [Target handler](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/protocol/target_handler.cc).
5. Renderer-bound messages are retained as pending; `DispatchToAgent` sends only when the renderer session/IO session is present (lines 416–429 and 457–479). `AttachToAgent` later resends outstanding messages (lines 192–258). A successful browser-side session with no renderer channel can thus leave a renderer command awaiting a response. [Session implementation](https://raw.githubusercontent.com/chromium/chromium/main/content/browser/devtools/devtools_session.cc).

**Inference:** parent auto-attachment/child reporting is a plausible missing initialization step for this specific discovery-first route. Both observed workers had empty URL, and v2 obtained a session but no Runtime response, which is consistent with that mechanism. The retained command/report bytes do not establish backend binding state or exclude a client routing problem. There is no demonstrated repair and no third trial is authorized.

`Runtime.enable` is not established as a prerequisite: V8's `evaluate` implementation resolves and enters a context without checking its `m_enabled` flag (lines 330–426). Its enable path reports execution contexts; it could supply diagnostic context events, but the source does not show that it would connect a missing worker agent or fix this timeout. [V8 Runtime implementation](https://raw.githubusercontent.com/v8/v8/main/src/inspector/v8-runtime-agent-impl.cc).

These are primary-source observations from the current `main` branches, accessed 2026-10-04, not a verified source revision matching the run's Chrome 154.0.8037.93. Attempts to read the matching Chromium release paths failed; no release-specific behavior is asserted. The existing v1/v2 protocol sources, readiness records, reports and errors remain unchanged. No CPU cost or profiling FPS conclusion follows from this analysis.
