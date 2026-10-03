# V3 source-field audit against frozen56bf — no hardware

Read only the isolated archive's exact source. No production source was used as a mutable authority. Both QA source edits and the compiled build remain unchanged.

| Driver access | Actual frozen source contract |
| --- | --- |
| `breaklineDiagnostics` | `src/main.ts:1101–1102` exposes the `recording` adapter only for `?diagnostics`; no `?record` autostart is used. |
| `d.mode` / `d.canvas` / `d.water` / `d.step(input)` | `src/main.ts:284–313` returns the actual PhysicalMode, `renderer.domElement`, actual WaterSurface, and `physicalMode.advance(1,input)`. The driver never calls recording.resize (which forces DPR1). |
| `d.mode.ready` | `PhysicalMode.ts:467–469` means actual host exists. `start` waits host.ready and only then installs `this.host` at515–528, so readiness is independent of queued ongoing steps. |
| `host.snapshot.status` / `host.init.grid` | `WorkerSurfZone.ts:95–110` installs the actual ready/snapshot and init returned by the real worker. |
| `host.outstandingSteps` | `WorkerSurfZone.ts:117–120` returns pending+in-flight. It is checked only after RAF hold for v3 settlement and before the single manual step. |
| `host.port` / `maxBatchSteps` | Ordinary TS-private runtime fields in WorkerSurfZone (no JS `#` fields). The main observer requires this exact port to be one of its tracked workers; no last-worker guess is used. |
| `d.mode.config` / `particleLevel` | PhysicalMode installs actual config after host.ready (`533`); particleLevel is an ordinary TS-private field (`358`) and passed to the host (`530`). |
| `d.water.grid` / `barrelMaskGrid` / `drawnLook` | Actual WaterSurface getters at366/475/498. They provide the real resolved drawing/mask/look state. |
| `d.water.vertexNormals` | Ordinary TS-private bool atWaterSurface253, defaulted from actual URL. No waterNormals query/override is supplied. |
| Worker core runner / `stepping` | Ordinary TS-private fields; the QA-only entry uses its own actual core, refuses a pending step, and addresses `runner.simulation.aeration`. It does not expose a production API. |
| Field air/depth/turbulence and solver time/grid | Actual AerationField public F64 arrays and actual solver fields. The sink only stores counts/scalars; public identity checks compare the exact pre-arm references. Solver dz is an array and metadata correctly uses first/last dz. |

The NativeWorker wrapper passes ordinary request/transfer arguments unchanged. QA replies are consumed by its early listener before the host's handler. The worker entry's early QA listener consumes only tagged controls before the normal core handler. The run/start/advance/field IDs identify the next request on this exact instance. Actual request options preserve the canonical own `renderSpacing:undefined` marker and four cases/rider. Stage/backend/request/cell/window/native guards still require live execution to pass.

The only v3 behavior change is the initial scene-ready predicate. It now requires ride screen + mode.readytrue + actual GPU snapshot, then performs the unchanged5s normal wall warmup, holds RAF, settles pending+in-flight to zero, arms and completes exactly one normal1/60 update. No shader/geometry/physics/particle/clock patch and no build change was introduced.
