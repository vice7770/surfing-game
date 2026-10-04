# Worker-owned sparse h/qx/qz upload — preparation only

No shared production file has been edited. No test, compilation, simulation, browser, GPU or cost run is authorized or performed. The source baseline is accepted commit `6f321d704269f9f1afc73750ab2b1f4a86f61122`. Only its required relative static/type-import closure was independently copied into `original/` and `candidate/` (147 original files including configs, 148 candidate files after the new helper, about 1.70 MB per tree); public assets and dependencies are unchanged read-only-use symlinks.

## Target and ownership

The latest ordinary Padang Big report has devicePack p50 about 1 ms and p95 about 1.3 ms. The device currently converts all 3×116,000 h/qx/qz values from Float64 to Float32 and uploads 1,392,000 bytes before each step. The GPU already retains the previous step's Float32 water. This candidate skips only values untouched since that completed readback. These stage timings are hypotheses for choosing work, not a promised saving; late report bins are wall-time bins with different sea progress between arms.

Only the actual worker entry will opt in through an internal `GpuBoussinesq.createForWorker`. The existing `create` and all generic/public devices keep their complete upload. No request flag is added. WorkerCore exclusively retains its runner; snapshot buffers and exported state are copies, not aliases of solver h/qx/qz.

## Complete ordinary CPU mutation inventory

| Mutation | Current source | Proposed action |
| --- | --- | --- |
| Local hull, attached rider and fallen surfer reactions; remote board reactions | PhysicalSurfWater.addReaction/applyRemoteReaction → push, currently lines 377–424 | Mark the same final cell after the two existing qx/qz stores. No numerical expression changes. |
| Every normal/swept jet withdrawal | PlungingLip.launch/holdJet → drawFromCrest, currently 590–650 | Mark after each existing momentum-axis store and each h subtraction. Retain rings, ordering, F64 accumulation and callbacks. |
| Jet and splash landing | PlungingLip.deposit, currently 1198–1209 | Mark after the original h/qx/qz additions. Open-edge deletion and periodic wrapping stay unchanged. |
| Constructor warm start | SurfZoneSimulation constructor → warmStart, currently 575–576 and warmStart.ts 104–129 | Initial residency is invalid; conservatively invalidate at any public warmStart call before stores. |
| CPU numerical step or device fallback | ShallowWaterSolver.step, currently 334; BoussinesqSolver.step delegates to it; Simulation.stepAsync failure disposes device before CPU fallback | Invalidate once before CPU numerical work; do not track individual solver writes. Disposing unregisters the sparse owner. A replacement device starts full. |
| Window shift, new columns, open-edge bed relevel | ShallowWaterSolver.shiftAlongShore 426–464; BoussinesqSolver.shiftAlongShore increments layout version | Invalidate once before mutations, including a possible throwing depth callback. The existing layout-version path also forces full. No ordinary game call currently shifts this solver. |
| Handover/lesson restore, including partial import failure | SurfZoneSimulation.importState 716–744; successful imports invalidate device layout | Invalidate before the first target.set. Keep successful layout invalidation unchanged. Exports use slice and do not mutate. |
| Retry/place/board rescue | Runner.afterWater/launchRide | No independent fluid reset. Later actual reaction stores go through push. A new start owns a new solver/device and begins full. |
| Breaking, foam, aeration, contact, particle movement | afterWater and body reads | These mutate separate arrays or privately captured height copies, or only read live fluid. HOLD has its existing separate versioned upload. No h/qx/qz marks. |

Search covered direct properties, destructured h/qx/qz aliases, `.set`/`.fill`/`.copyWithin`, and the real worker/Core → Runner → Simulation/body/lip call chain. Custom code mutating public arrays belongs to the generic full-upload API, not this worker ownership contract.

## Concrete first candidate

One WeakMap associates the worker-owned solver with a tracker. The tracker allocates two row-bound arrays at device creation and a reused 16-word range buffer. Coupling stores only update row bounds after the old arithmetic has completed. Joined row spans include up to one row of unchanged gap. At most 8 ranges (24 h/qx/qz queue writes) and at most 25% of the grid, including joined gaps, use the sparse path; dense or fragmented changes retain the old one-command full upload. These are conservative initial bounds, not tuned thresholds.

Sparse packing reads final F64 h/qx/qz numbers only at the next upload. Each Float32 assignment therefore performs the same conversion as the original full Float32Array.set. It does not round a momentum addition early. Untouched finite values, infinities and signed zero were widened directly from the resident F32 values and therefore reconvert exactly. A no-allocation scan of all 3 water readback fields rejects NaNs before residency is established; the old F64→F32 conversion can otherwise change a NaN payload. This scan is part of the candidate overhead.

Layout changes, first step, restore, warm start, CPU step, dense edits, excessive ranges, readback=false and any different diagnostic kernel sequence keep full uploads. Before executing kernels the tracker is made invalid; only a completed supported readback can establish a new resident baseline. Failed queue/encode/map/adoption therefore cannot leave an eligible stale baseline. Disposal removes only its own tracker.

There is no change to the nine fields read back, shader, substeps, coupling physics, serialization, snapshot ownership or public array identities. The upload staging buffer is private scratch, and its untouched regions need not contain current water after a sparse step.

## Proposed checks, in order — execution requires a later lease

1. Cheap isolated tests and strict TypeScript: independent untouched source versus candidate, in-memory WebGPU queue/readback recorder. Compare the full resident h/qx/qz input bytes immediately before every submit, all nine readback bytes and public F64 arrays after every step. Explicitly distinguish this payload/lifetime test from a hardware/WGSL parity run.
2. Exercise actual body local/remote reactions, two-axis crest withdrawal, normal/swept launch and actual landing; duplicate edits and dry/boundary cells; initial import, restore, partial import exception, shift ± columns, invalid shift, CPU numerical reset and warm start; dense/fragmented ranges; disposal and a new device; generic direct public writes; diagnostic no-readback/custom/restored kernel paths; signed zero, infinities and NaN payloads. Assert original array identities, clocks, lip exported state/counters and source order. Include consecutive GPU steps with no CPU edits.
3. If these pass and parent grants GPU lease, compare the actual nine mapped field bytes and complete step state for full-versus-sparse devices at identical fixed clocks and exact material inputs, including the actual post-water body/lip order. Byte parity is the gate; transferred-byte reduction alone is not validation.
4. Only after parity and compiled-source review, run one bounded rotating adjacent AB/BA complete-step cost gate on the current ordinary 116k-cell workload. Include mutation arithmetic, WeakMap marks, range preparation, NaN scan, packing, commands, all unchanged GPU work/readback and remaining CPU stages. Report paired complete duration plus actual pack/map/changed-cell statistics and work counts. No publication/FPS claim from this diagnostic or independent stage-quantile sums. Reject if tracking/scans/write overhead consumes the gain; do not automatically retune/repeat.

## First proposed execution lease

Fifteen prepared focused tests are in `parity.test.ts`; the memory queue is explicitly protocol-only. Each actor is constructed using its own arm's solver/water/lip/simulation classes, and the common initializer uses a narrow public numeric interface. No solver with private fields is passed into the other arm's nominal APIs. The tested wave material arrays and render snapshot bytes remain the real public APIs.

After root review only, run sequentially from this TMP directory:

```
/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/vitest run --config=/private/tmp/surf-sparse-upload-20261004/vitest.config.ts --maxWorkers=1
/Users/regina/Desktop/Projects/surfing-game/node_modules/.bin/tsc -p /private/tmp/surf-sparse-upload-20261004/tsconfig.qa.json
```

Preserve source/patch/readiness and separate stdout/stderr/terminal records for either outcome. Stop at a terminal failure for review; these proposed commands are not authorization for automatic correction, benchmark or hardware work.
