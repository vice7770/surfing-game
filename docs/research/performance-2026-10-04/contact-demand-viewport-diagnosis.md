# Contact-demand viewport diagnosis and next scope

Source/report-only examination. No source changes, compilation, test, replay, benchmark, browser/server/GPU run or Git action. Original frozen v1/v2 authorities remain untouched. Numerical source authority is the archived `58ceb6a29617c00f93fb3b21eff3058d824319d5` runtime, not root's newer ClockLink reconciliation.

## What is proved, and what remains unknown

V1 reached the ordinary ride with every actual physics/start/quality/backend guard passing, then rejected its viewport: CSS1708×891,DPR2,backing2989×1559. That backing is exactly the original High-native calculation: floor(1708×1.75)=2989 and floor(891×1.75)=1559. It does **not** indicate a wrong renderer pixel ratio. V1 collected zero count polls/epochs and is invalid.

V2 moved the fit onto the loaded menu, then timed out on the conjunctive CSS1708×926/backing2989×1620 condition **before Surf**. Its `menuViewportSettled` and `initial` fields are absent, because recording followed the wait. There is no actual post-fit inner/outer/window/screen/canvas observation in that report. It collected zero polls/epochs and is invalid. We cannot tell which part of the conjunction failed or attribute that failure to a menu canvas rule.

`Page.fitViewport` (`scripts/browser/cdp.mjs:108`) is three best-effort native-window adjustment passes: read inner dimensions; return if already equal; read Browser.getWindowBounds; request width+target−inner/height+target−inner; wait300ms. It does not record requested/accepted bounds, assert the final result, or even read inner dimensions after its third set. Its comment promises an exact viewport more strongly than its implementation proves. A desktop/window constraint, Chrome app-window chrome, or an unsettled resize are hypotheses; neither report proves any of them. The35px v1 discrepancy is descriptive evidence, not a diagnosed OS/window limit.

No source-supported menu-only versus ride-only size difference exists in the main canvas path. `main.ts:217–218` initially sets native ratio and innerWidth/innerHeight. Constructor `main.ts:271–272` calls the common resize and installs its resize listener. `applyGraphics` at332 calls that same resize. `resize` at1092 sets resolved native ratio, sizes from **window.innerWidth/innerHeight**, and updates spectator aspect without a screen/menu/ride branch. `Graphics.ts:89–92` resolves High to min(max(1,DPR),1.75)×renderScale1. Installed Three WebGLRenderer.setSize uses floor(width×ratio)/floor(height×ratio), with matching CSS logical size. `recording.canvas` at298 is this exact renderer element; it does not accidentally identify a separate preview canvas. The dev recording.resize hook at293 intentionally forces DPR1, but neither adapter calls it. Thus demanding ride-sized pixels on the menu is not independently invalid by source; demanding unobserved canonical window dimensions is the unsupported premise.

## Why contact counts can use an actual native viewport

The worker start accepts config/options, not CSS or camera dimensions. Runner's solver/front/profile/contact grid comes from the actual config plus renderSpacing; original `updateContact` and `afterWater` at488/502 operate on solver-world coordinates. The board/session and gauge run at fixed SURF_ZONE_STEP1/60. Physical water queries use world x/y/z and physical/render node spacing, not screen coordinates.

The one real input dependence is screen-relative steering: `main.ts:692–695` maps steer/rotate through PhysicalMode.screenSteer. That method at652–657 returns literal0 **before reading camera matrices** when steer is0. Controls.rideRequest at129–164 reads held keys, pads/touch and axis ramps, not viewport dimensions. With no held input the axes remain0. Camera aspect/follow, underwater presentation, shader patch placement and rendering change presentation; they do not inject worker swept queries. The main camera samples its snapshot host, separate from the worker contact instance. Pocket reflex is disabled by the ordinary `practice` setting on Big (`pocketReflex.ts:56–57`); no override is needed.

Viewport/render workload can change wall-time progress and whether the150s deadline reaches the late gate. It can also change nonzero camera-relative input; live gamepads or user interaction cannot merely be assumed absent. Therefore a count capture at recorded native dimensions is valid only with exact actual start/config, original fixed-step clock/order, and observed zero-input requests. It is **not** a same-pixel FPS/render-quality comparison, and does not make v1/v2 retrospectively valid.

## Recommended new plan, before any v3 preparation

Use the unchanged frozen source/build/observer and a separately reviewed adapter. Remove native fit/setWindowBounds entirely; launch the same ordinary Chrome app window request and record what the desktop actually supplies. Do not call diagnostics.resize, emulate DPR/device metrics, retarget camera, change graphics, force input, coerce seed/config, or modify worker RNG. This avoids another sizing setup trial unrelated to the contact question.

Record metadata **before any acceptance wait/guard**: (1) owned about:blank window, (2) actual ready menu, (3) Surf/ride-ready state, (4) late count gate/end and natural pause. Read innerWidth/innerHeight, outerWidth/outerHeight, screenX/screenY, devicePixelRatio, screen.width/height/availWidth/availHeight/availLeft/availTop, visualViewport dimensions/scale/offsets, the exact game canvas backing/client dimensions/style and bounding rect, Browser.getWindowForTarget/getWindowBounds, current resolved/stored graphics and screen state. Persist each observation immediately. No guessed title-bar delta. If a future exact-window investigation is separately required, record requested and accepted Browser bounds plus before/after dimensions on every fit pass; that investigation is not necessary to count contact demand.

Predeclare a **stable actual native dimensional tuple** after loaded-menu settling (inner/outer widths/heights, screen/available dimensions, native DPR, actual game canvas CSS/backing) and require it to remain unchanged at ride-ready and through capture/pause. Position and visualViewport metadata remain reported context. Canvas backing must match the source High resolver/floor calculation at the observed native DPR; no canonical1708×926/2989×1620 equality. Observe resize/DPR/layout changes and retain an invalid outcome if stability breaks. Do not silently relabel resize events as harmless or resize again. All required snapshots should be taken before any failure throw, preserving the currently missing diagnosis evidence.

Keep exact config and actual worker start: Padang Big seed8761,Hs3.8,T18,dir0,spread150,tide0,wind0,stage2,computeauto,64components,dx2/fine1,render2/mask1,ridertrue,4case files,maxBatch1,GPU116000cells,High/Rich/pixel normals/particlesHigh. Keep the explicit page-only canonical Mulberry32 bootstrap and verify native worker Math.random; do not call this override-free. Pin the same source/build hashes.

Observe the **actual** advance input passed through NativeWorker.postMessage, without editing it: all nonzero steering/rotate/trim/crouch/compress/duck or paddle/popUp/hand/reel/retry/place/spawn/remote reaction interventions invalidate idle scope. Preserve a compact request serial/input signature/change-count, plus the actual15epoch source/query transcript; do not add extra gauge/status calls. Absence/undefined optional fields is preserved and reported. No connected-pad or user-input suppression.

The observation-only metadata stage is embedded in the same proposed count run: if native consistency or idle/physics guards fail, stop before90s; there is no separate automatic setup retry. Only after those guards pass does unchanged ordinary advancement proceed to the first15consecutive post-water epochs at90simseconds beyond completed spin-up. Same150s overall from owned Chrome spawn, no fast-forward, no manual steps, no retries/deadline widening. Pause naturally, collect after outstandingSteps0 and prove owned Chrome/server closure. No FPS/render-quality/adoption claim. This note proposes scope; it does not authorize preparation or a third hardware launch.

## Authorities inspected

Original v1 failure report SHA256: `db5e3e0471228d196cb04d479cb1b0428d6985de078e778674f42cc677b74eed`.

Original v2 failure report SHA256: `f3adac332dc5f924d2d7f9f494d9088a6ee4e7ffc54a02596c9fbcb8e33a3a71`.

| Frozen source path (relative to original scratch runtime) | SHA256 |
|---|---|
| `scripts/browser/cdp.mjs` | `e8fa0a2e4967e11b93a1b3187363414af8d0e5b1a39aaefc351f19ae585f8091` |
| `src/main.ts` | `95d52f07d106be65fa2509a7a6c5fefc736244f61a27c8fbcced5f9ed9037490` |
| `src/game/Graphics.ts` | `39e0bd72abe3bee7daf39f022775a4a2688a6ba798f02ca3564a1109ebfcea42` |
| `src/game/Controls.ts` | `98887c898a92c6f662d5b5fbbef60576f07c0aca84837e7c24bd0000d4b9a358` |
| `src/game/PhysicalMode.ts` | `588f59b12a5aec7a1d51af16fed5949bcfadf61eb42503ed54391c31a19cf63f` |
| `src/game/pocketReflex.ts` | `2e6bd57cac901031b091e71a0edd0742d607609165fd47b666b0b54ef5f28c64` |
| `src/wave/SurfZoneRunner.ts` | `78eb334ff36986d5a5f46c9bd86d9bc9a87857289c45cd1db8a6b31cebd2c477` |
