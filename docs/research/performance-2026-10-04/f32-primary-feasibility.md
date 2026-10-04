# Persistent Float32 primary water storage: source-only feasibility

Status: next distinct **approximation option**, not prepared implementation or an accepted optimization. The exact side-feed component-count cache is being prepared/measured first. This note records completed source inspection only: no production edits, module imports, tests, build, benchmark, GPU/browser work or Git mutation.

Source basis: accepted `b0e003b8670c9d0be83bc9bb24c30b5382a54499`. Read-only byte comparison confirmed the inspected GPU/Simulation/Runner/Core/worker-entry/Boussinesq sources matched that commit. References below use that revision's line numbers, before any later side-feed cache adoption.

## Finding and smallest viable design

Persistent worker-owned Float32 primary **h/qx/qz** storage can remove real bulk conversion work. This is distinct from replacing scalar loops with native copies: the existing conversion paths already use `TypedArray.set`.

Use one persistent owned `3N` Float32 block, with three disjoint `N`-element views in h/qx/qz order. Restrict initial activation to the private ordinary solo GPU owner; keep public/generic devices and CPU-only simulations on their current Float64 storage. Preserve F64 bed/grid data, water constants, material state, CPU numerical scratch and JavaScript Number arithmetic.

Activate only after the selected GPU device and successful GPU spin-up have passed their generation checks, before the first worker ready publication. Quantize the currently committed three primary fields once. During steady operation:

- Copy the mapped H/QX/QZ prefix into the owned Float32 primary block at the actual commit, using same-type `set` rather than F32→F64 conversion.
- Upload that contiguous primary block directly for the next GPU step, eliminating the aggregate F64→F32 packing pass.
- Keep the six other readback targets unchanged in the first candidate.
- On any entry into the CPU numerical solver, promote the last committed primary state once into owned Float64 fields. CPU fallback then retains F64 state and scratch, starting from the approximated state already reached on the GPU path.

`src/wave/gpu/GpuBoussinesq.ts:330–334` currently converts all three F64 planes into its `3N` Float32 upload, followed by one contiguous `queue.writeBuffer`. Its deferred commit at `:423` and ordinary commit at `:436–438` widen mapped F32 planes into owned F64 solver destinations. The three upload/readback planes are contiguous in the existing order. A mapped GPU range cannot itself become primary storage: it is invalidated by unmap, and the prepared future must remain private until commit. Retain an independent CPU-owned block; this design removes conversions, not the required owned readback copy or GPU transfers.

## Concrete work removal at 116,000 cells

The three-plane design removes 348,000 F64→F32 upload conversions and 348,000 F32→F64 primary readback conversions per committed/requested steady step. It removes the 1,392,000-byte aggregate upload scratch write and its accompanying 2,784,000-byte F64 source read. First-three-plane readback destination writes fall from 2,784,000 to 1,392,000 bytes. These are source-derived work/byte counts, **not measured time or FPS savings**.

GPU upload remains 1,392,000 bytes; all nine readback planes remain 4,176,000 mapped bytes. GPU arithmetic, kernels, substeps, command submission, mapping waits, required CPU consumers and publication buffers remain.

One conversion can move rather than disappear. `src/physics/PhysicalSurfWater.ts:227–236` allocates an independent F64 h snapshot and copies live h into it. The private contact prepares this snapshot at `src/wave/barrel/sweptContact.ts:184–191` whenever a live front is captured. With F32 primary h, that copy becomes F32→F64 widening of 116,000 h values. Therefore do not claim that all h widening is removed. The upload/readback removal still has a net reduction, particularly for qx/qz. A later contact snapshot could use corresponding F32 storage, but that is additional ownership/typing scope and is unnecessary for the first three-plane experiment.

Full F64 shadows refreshed every normal step would relocate conversion and defeat this simplification. Retaining dormant original F64 arrays solely for rare fallback is different: it permits a one-time promotion, but increases retained memory instead of reducing it. Alternatively release those three original arrays after activation and allocate/promote on fallback; that requires an explicitly owned identity transition. Neither strategy should incur per-frame shadow refresh.

## Numerical approximation: earlier feedback rounding

Array reads become JavaScript Numbers and existing CPU expressions still evaluate in double precision. **Each store to F32 primary storage rounds immediately**, unlike the baseline's F64 stored feedback, which is rounded only at the next upload. Keeping the expression tree unchanged does not make this exact-state parity.

Regular early-rounding sites include:

| Feedback | Exact source | Changed storage boundary |
| --- | --- | --- |
| Local board/rider/fallen-surfer and remote horizontal impulses | `src/physics/PhysicalSurfWater.ts:410–423` | qx/qz decrement rounds after each wet-cell push. |
| Lip momentum withdrawal | `src/wave/PlungingLip.ts:629–644` | Each withdrawal rounds before later jets or feedback reread the shared cell. |
| Lip water withdrawal | `src/wave/PlungingLip.ts:646–647` | Each h subtraction rounds immediately. |
| Jet/splash landing | `src/wave/PlungingLip.ts:1195–1208` | Each h/qx/qz addition rounds before subsequent feedback and sampling. |
| Warm start/window/restore if activated during these paths | `src/wave/warmStart.ts:126–127`; `src/wave/ShallowWaterSolver.ts:426–460`; `src/wave/SurfZoneSimulation.ts:729–738` | Computed/decoded values are stored at F32 precision. Initial design should control activation and invalidate held results coherently. |

Small repeated impulses or volume increments can disappear when individually below a primary cell's F32 spacing. Wetness/dryness and breaking thresholds, starvation/momentum-clamp accounting, later body/contact/material samples, and the next GPU state may diverge. The GPU's existing F32 arithmetic does not eliminate this difference: the current CPU feedback accumulates in F64 between GPU operations. A sparse F64 feedback accumulator might preserve more of the old behavior, but reintroduces ownership/tracking complexity; it is not this smallest approximation design.

The proposed contract is similar visuals under a bounded quality assessment, not exact F64 continuation or universal raw NaN payload parity. Full CPU fallback promotes the already approximated committed state; it cannot recover the discarded historical low bits.

## Typing and alias constraints

`src/wave/ShallowWaterSolver.ts:184–187` declares readonly h/qx/qz properties as concrete Float64 arrays, and `:259` allocates them with the same F64 factory as the bed. Assigning F32 arrays through casts would break that contract. Use explicit internally selectable storage/accessors with a numeric cell-field type such as F64|F32; retain the current F64 default and the public/generic behavior.

Read-only numeric inputs can accept `ArrayLike<number>` or the cell-field union. Relevant constraints include `ShallowWaterSolver.sampleCentered` (`:302`), `PhysicalSurfWater.gradient` (`:535`), and Boussinesq derivative/second-derivative input parameters (`:827–880`) that can receive qx/qz. Keep numeric output scratch F64. Both typed-array types support the required `set`, `fill`, `slice` and `copyWithin` operations, including the shift loop at `ShallowWaterSolver:434–444`.

Most ordinary consumers retain the solver object and destructure its current fields within a call. `PhysicalSurfWater` retains the solver, Foam/Aeration retain the solver, and `BreakingModel` retains a Boussinesq solver object (`src/wave/Breaking.ts:57–61`), rather than a long-lived reference to primary h/qx/qz. The contact's plain-height state owns a separate copy, with explicit capture; it must retain that epoch independence. Any externally retained raw primary-array alias would become stale when storage switches, so the first option must remain within private worker ownership. Stable plane-view identities are required throughout normal GPU operation.

The new planes share one backing ArrayBuffer, unlike the old separate allocations. Their views must be disjoint, with correct offsets and lengths; local per-plane operations must not touch adjacent planes. Neither the primary block nor its complete backing may be included in snapshot transferables. Current `src/game/SurfZoneWorkerCore.ts:198–200` fills owned snapshot buffers and transfers those, which preserves separation.

`src/wave/SurfZoneState.ts:14` already permits F64|F32 state arrays, and its SET1 encoder (`:31–49`) writes through a Float32 destination. Only `SurfZoneSimulation.stateArrays` (`:687–703`) currently narrows its internal record to F64. Export's `slice` at `:715` must continue making independent owned copies. There is no need for per-frame export widening. An export's supported numeric transport type is not a license to alias live primary storage.

## GPU startup, prepared-result ownership and fallback

Activation must **not** occur inside asynchronous `GpuBoussinesq.create`. `SurfZoneRunner.useDevice` (`:490–509`) races creation against a timeout and disposes late devices. A late factory must not change the solver after its CPU startup has begun. The ordinary Core waits for the selected device, checks generation, spins up, checks generation again, then publishes ready (`src/game/SurfZoneWorkerCore.ts:93–109`). Activating only after successful spin-up keeps no-adapter, timeout, shader rejection and spin-up CPU-fallback paths F64.

Current fallback sites include `SurfZoneSimulation.spinUp:664–668` and ordinary `stepAsync:849–853`. The private three-plane storage must be promoted before any CPU numerical step if it is active. A central promotion gate before a direct solver CPU step also covers alternate synchronous entry paths; relying solely on the ordinary async catch would leave an accidental F32 CPU solver possible.

Prefetch continues to hold one mapped future privately. Current consumption (`SurfZoneSimulation:812–822`) commits it once; successful consumption skips another device step (`:847–848`). Runner finishes CPU feedback and then starts the next GPU-only operation (`src/wave/SurfZoneRunner.ts:470–473`) before Core fills/publishes the committed snapshot. A candidate must not copy a prepared future into the primary block before a matching request commits it.

Storage transitions must either await/discard the existing future first or include primary-storage generation and view identities in validation. Current deferred validation at `GpuBoussinesq:419` checks time, layout version and plunge version, not storage identity. Current simulation matching also checks device, dt and generation (`SurfZoneSimulation:813–815`). Backend replacement, restore, window changes and promotion must not let a held old result overwrite a different current storage owner. On fallback, retire/discard any held future, retain the last committed primary values, promote them once, and then step CPU.

## Why defer a nine-plane variant

All nine F32 primaries could be held in one owned `9N` block in readback order. Commit would become one same-type 4,176,000-byte owned copy, replacing nine widening copies with 8,352,000 destination bytes. The first three-plane prefix would remain the direct upload source.

This broadens typing/storage transitions to the actual RATEH `rateH` field/getter (`ShallowWaterSolver:201,369`), Boussinesq strength/age/viscosity (`BoussinesqSolver:141–144`) and protected predictor X/Z/getter (`ShallowWaterSolver:228–229`, `BoussinesqSolver:362–363`). **RATEH is `surfaceRiseRate`/`rateH`, not Boussinesq's separate public `riseRate` scratch.** All active F32 output fields must promote before CPU fallback.

Strength/age widening would move into BreakingModel's independent F64 mirrors (`src/wave/Breaking.ts:82–85`), and h widening can move into the private contact snapshot. NU still requires an exact peak scan for the next step's explicit viscosity limit (`BoussinesqSolver:395–406`). Extra six fields ordinarily originate as F32 GPU outputs without h/q's regular CPU feedback stores, but the wider API/lifecycle change is unnecessary to assess the first concrete three-plane saving. Start three; choose nine only after a useful complete-path result.

## Prior F32 evidence and its limits

Read `docs/research/drift-report.md` and the exact `scripts/drift-report.ts` implementation. The 2026-09-26 report used CPU stage-2 Canyon, medium swell/mid tide/calm/seed7, 64 components and 240 simulated seconds. Its “32-bit state (GPU-like)” copy rounded only h/qx/qz with `Math.fround` **after each complete `runner.advance(1)`** (`scripts/drift-report.ts:85–87,153–157`), while retaining F64 primary arrays.

That copy matched all 20 reference breaking onsets with zero reported timing/position differences at the displayed precision, and its reported surface RMS fractions rounded to 0.0000. The report's overall fail arose from late-join spin-up variants. Its own caveat says the CPU state-rounding difference is smaller than F32 GPU arithmetic.

This was continuous once-per-step state rounding, not just a one-time F32 handover. It did **not** test persistent F32 arrays, per-feedback-store rounding, conversion performance, this GPU path, Padang Big, or the current tube/body/landing workload. It is limited quality context, not acceptance of this new option.

Also read the sparse-upload and accepted water-prefetch histories under `docs/research/performance-2026-10-04/`. Sparse upload retained F64 feedback and was held after mixed native cadence/frame-interval results; prefetch retained F64 committed storage and overlapped one future GPU step. Neither supplies persistent-primary F32 evidence. No dedicated persistent F32-primary storage trial was found in the research Markdown/indexed source inspected here.

## Conclusion

The three-plane worker-owned F32 primary design removes bulk conversions and aggregate packing instead of merely rewriting already-native loops. Its complete-path gain remains unmeasured, with one h widening potentially relocated to contact capture. It deliberately changes feedback storage precision and needs bounded Padang/body/lip/landing/threshold and visual assessment if pursued. Preserve it as the next distinct approximation option while measuring the smaller exact side-feed component-count cache first.

Inspected b0 source identities: GpuBoussinesq `41e212604f0d7b889445edb17a05f38edf5044f66dceaa9eddaee4ebf69d8094`; SurfZoneSimulation `18e7928601d7208d5f7ff1a15a34995f7e63ebeec497dbe7bf7527b06d15948a`; SurfZoneRunner `1e82bd1e1a6d9022489c850ae645dca2a787f752eebff532a77a61b84b3a47a8`; SurfZoneWorkerCore `b6f31ca372bb8d20a6aa9a6023bd233fdc0a95862f4efd04caf3cb14acfef9b3`; worker entry `2f04572a34cc6f5a1a236d2c44f6ef878d03e1db229e7545f5f33e9daa5f84c6`; BoussinesqSolver `66cdbb3eb83f7d03ade33c11a429889b217d3b81cd6246b6dd5006a40b0e5d79`.
