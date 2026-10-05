# Current-source to frozen retirement candidate adoption map

Read-only comparison of `/Users/regina/Desktop/Projects/surfing-game` with `/private/tmp/tube-bounded-c-retirement-boundary-20261005/cap-prefix-v2/source`. Current `src/` differs in exactly15runtime TypeScript files:12changed and3new. There are also14candidate-only tests and1fixture. Every other current/candidate `src` file is byte-identical at this review. No source/helper edits, tests, build, browser/native resources, port probes, player interaction or Git operation occurred; only this notes directory was written.

## What ordinary Padang Big uses now

The current source already enables swept barrels for ordinary Padang (`SurfZoneSimulation.ts:115–119`); this is independent of Big versus other size selection. Big selects3.8m significant height/18s period/zero spread/zero direction (`game/SurfConditions.ts:88–95,160–180`). Normal conditions/spawn/controls, random menu seed, stage2 policy and authored camera paths are unchanged in the candidate. Ordinary no-override Padang config already uses dx2/fineSpacing1 (`PhysicalMode.ts:488–515`), with the existing GPU capability path determining actual solver hardware. This map is source routing, not proof of the build cached in any already open browser.

Both page drawing and worker/runner physics load the same spot's case bytes: `PhysicalMode.ts:513–515,542–545` and `SurfZoneRunner.ts:348–351`. Current `barrelLibrary.ts:38–40` constructs `new ProfileLibrary(decodedCases)` with the existing RAW implementation. Thus a fresh current-source ordinary Padang Big game uses RAW swept drawing/contact/crash, not this experimental C bundle. There is no present C selector to turn on with a URL or ordinary UI setting.

Frozen candidate `barrelLibrary.ts:38–43` changes this factory to `geometry:'bounded-C'` when **every decoded case ID** appears in the shipped eight-case index. Padang's normal four files satisfy that condition. Candidate `ProfileLibrary` itself still defaults to RAW when manually constructed without options. The factory selector is by ID, not an asset-content hash, spot-specific user option or gameplay config flag. Adopting that factory and complete bundle automatically exposes C to ordinary Padang play; other shipped-case subsets also select C if a caller enables a swept spot. Default `SWEPT_BARREL` remains Padang only.

The page already defaults to `holdClearDrawing=true`, sheet shown and faces out (`scene/barrel/SweptBarrel.ts:31`, `SweptBarrelMesh.ts:303,312`). C's provider uses its evolving geometry for both analytic hold modes; no additional hold/roof toggle is required. Material appearance and Rich/Classic selection remain the existing renderer's policy. The separately prepared soft-transmitted-light material trial is **not** included in this candidate.

## Runtime file map

Paths below are relative to each tree. The full pinned paths and current/candidate hashes are in `comparison.json`.

| Runtime path | Status | Coordinated candidate change |
|---|---|---|
| `src/wave/barrel/barrelLibrary.ts` | Changed | Selects C by shipped case IDs for the shared factory. |
| `src/wave/barrel/ProfileLibrary.ts` | Changed | Adds explicit C option, parameter-before-contour construction, evolving analytic clocks/channels, shared-sheet geometry and provider reach/incident bounds. |
| `src/wave/barrel/boundedCProfile.ts` | New | C profile, finite lifecycle, cap/thickness/fluid channels and precision collapse. |
| `src/wave/barrel/sharedUpperRoot.ts` | New | Paired inner/exterior shared sheet sampling consumed by ProfileLibrary. |
| `src/wave/barrel/crestRays.ts` | Changed | Provider reach bounds; C fixedshoreward `[0,1]` drawing rays and actual stored-column X/sigma proof. |
| `src/wave/barrel/sweptLoft.ts` | Changed | C profile/material channels and physical diagonals; stable-X/raw-knot sampling; bounded ordered-prefix cap; flat adjacent retirement support and intrinsic mask fade. |
| `src/wave/barrel/lipSheet.ts` | Changed | Analytic sheet lookup derives from the exact query contour rather than RAW case tables. |
| `src/wave/barrel/sweptContact.ts` | Changed | Contact consumes actual indexed triangles/diagonals, including overlap tests; C exactzero-local-weight closure returns ordinary water/continues other candidates, positive interiors remain indexed contact. |
| `src/wave/barrel/crashCurve.ts` | Changed | C projected-X quadrature width; separates prospective launch-water demand from current drawn void geometry and fluid motion. |
| `src/wave/barrel/SweptCrash.ts` | Changed | Physical crest-direction projection for C column pace; C launch/void/air consumption; incident carrier refresh and watchdog release. |
| `src/wave/PlungingLip.ts` | Changed | Accepts current analytic swept void volume; prospective open geometry updates, fixed trapped-air ledger after closure and monotone air release. |
| `src/wave/barrel/carrierSupport.ts` | New | Provider-derived incident carrier lease/history/copy logic, preserving individual physical cutoff. |
| `src/wave/barrel/BreakingFront.ts` | Changed | Uses incident support when matching/coasting paced controls, refreshes history and deepcopies nested export/import evidence. |
| `src/wave/barrel/frontRecords.ts` | Changed | Publishes C geometric pace while incident support is active; retains original RAW cutoff path. |
| `src/wave/SurfZoneSimulation.ts` | Changed | Installs C carrier support into the tracker when library/slope/crash conditions permit. |

No main/UI/normal spawn, follower camera, controls, worker entry/transport, graphics settings, ordinary water, barrel renderer/shaders, mask rasterizer, stencil fallback, standard physics solver or package manifest changes appear in this source delta. Some shared methods above change source bytes even for RAW consumers (for example consuming actual draw indices); this map is not a claim that the full runtime source is RAW-byte-identical. Preserving RAW behavior is a separately scoped semantic requirement, not inferred from C-only branch labels.

## Dependencies and practical adoption requirements

1. Integrate the **full15file current-to-candidate runtime delta** together, with its14focused tests and retirement fixture if proceeding to reviewable adoption. The frozen tree is the cumulative provider→sharedsheet→parallel rays→physical coupling→carrier→stableX→retirement result. `cap-prefix-v2/runtime.patch` contains only `sweptLoft.ts` and `sweptContact.ts` relative to the earlier frozen stable-X parent; `cap-prefix.patch` is a further incremental loft/test change. Neither patch alone represents adoption from the current repository. A loft-only visual copy would omit required provider methods/modules and leave drawing/contact/crash/packet consumers inconsistent.

2. Retain the coordinated factory selection for page and worker. The unchanged `PhysicalMode` and `SurfZoneRunner` both call it, so there is no additional posted worker flag required. An optional rollout switch would be a separate source decision and must select the same provider for both; the frozen candidate currently enables C automatically for recognized IDs.

3. Retain `sweptBarrel` enabled (ordinary Padang already does), valid spot slope, loaded canonical case assets and `sweptCrash !== false` for the full candidate's paced/incident-support/air behavior. Explicitly disabling swept crash leaves C drawing without this full physical coupling/lease route and is not the tested complete candidate behavior. Direct `new ProfileLibrary(cases)` remains RAW unless explicitly passed the C option. C's increasing finite stored-X/packet domain checks and hard caps remain part of the candidate contract; unsupported imported data must not be silently coerced.

4. No package installation or regenerated Basilisk case data is needed for this delta. `package.json`, `package-lock.json` and generated `barrelLibraryIndex.ts` are byte-identical; all8canonical public barrel binaries are byte-identical between current and candidate. Padang ordinarily loads4: `pad19-a20-l12.bin`, `pad19-a30-l12.bin`, `pad19-a45-l12.bin`, `periodic-padang19s-l12.bin`. Preserve those existing files in any complete deploy/build; missing files leave the library/mesh unavailable.

5. Build/reload the integrated application and worker together and start a fresh normal sea; existing library and spot-byte caches do not change an already-running RAW instance into C. Preserve the existing ordinary menu/spawn/controller/camera/graphics paths. Relevant scoped semantic/type checks and finite actual normal gameplay evidence remain needed for the integrated bytes; adopting a prepared source bundle is not itself mouth/body/FPS or production acceptance. This review performs none of those actions.

## Candidate and review scope

The frozen candidate readiness identifies588prepared source inputs and declines normal continuity, continuous raster ownership, native shape, visible mouth, body passage, FPS and production adoption claims. This map does not upgrade that readiness or any green capture into tube acceptance, infer currently served app bytes, or rewrite any earlier failed receipts. It supplies the exact integration surface for a future deliberate source decision.
