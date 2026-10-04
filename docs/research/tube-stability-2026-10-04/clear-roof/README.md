# Clear roof continuity repair

The game drawing now holds each library case at its last clear profile through the existing touchdown/collapse transition. This removes the reproduced late-profile height jump without changing contact geometry, physical clocks, collapse timing or retirement. The drawing uses the same held frames for its profile and lip sheet measurements, and rebuilds its water mask with the geometry. `SweptLoft` remains opt-in for direct callers; `SweptBarrel` enables the repair by default, including asynchronous and cached library loads. Its diagnostic toggle can restore the original drawing.

This is a narrow geometry continuity repair. It is **not acceptance of good tubes** or a demonstrated fix for the fins in the user's unknown scene. The moving comparisons still show broad canopy sections, hard white rims and angular roof/face joins. The lower view exposes more space beneath the lip, but neither arm presents a convincing continuous hollow corridor. Both have a hovering-sheet appearance; the held arm shows no obvious new floating-geometry regression in the reviewed first pair. Rider passage remains unverified.

## Measured result

The focused actual game scene reproduces front 48, rows 126/127 at sea time 553.173058749449. At profile point 83, the rebuilt mesh's signed height difference changes from **−1.3689085245132446 m** to **+0.02395474910736084 m**. The separate query fixture's maximum absolute difference over points 32–88 changes from 1.3689085245132446 m to 0.030141592025756836 m. This query result is not the maximum over several neighboring mesh rows.

Within ±2 m of the selected row, the first four actual mesh snapshots have maximum absolute roof differences of 1.369/1.413/1.249/1.181 m with the original drawing and 0.239/0.283/0.074/0.064 m with held drawing. Horizontal joined-row advance stays positive in all twelve held snapshots. These local measurements support the repair's continuity scope, not a tube-quality threshold.

## Native comparison scope

Each pair switches the drawing synchronously on one drained snapshot, with identical camera matrices and no worker publication between arms. A/B share the same loaded worker. Identity checks do not export or establish equality of every physical F64 state word. The shared core edit changes compiled bundle hashes; old worker bundle equality is not claimed.

The scene uses seed 1, Padang, 24 components, 1 m physical/fine spacing, Hs 4 m, Tp 10 s, direction 10°, spreading exponent 11.720624206334085, zero tide/wind and no rider. Normal spinup and 1047 normal steps precede the focused views. Twelve pairs are separated by three normal steps (0.05 physical seconds); the first-to-last interval is 0.55 seconds. Cameras remain fixed within each run. Focused and mouth runs each resize once to 1708×879 diagnostic pixels at pixel ratio 1; these are not ordinary pixel-fidelity or FPS comparisons.

| Retained run | Outcome | Scope |
| --- | --- | --- |
| [Initial](initial/report.json) | Failed at the unchanged 96 MiB PNG cap: nine full pairs plus pair 9 A; 19 PNGs | Younger section mostly did not exercise the traced late roof. Earlier port preflight also failed before starting resources. |
| [Focused](focused/report.json) | Twelve complete pairs, 24 PNGs; 48.84 s | Exact late-roof pair reproduced, but the higher camera hides much of its underside. |
| [Mouth](mouth/report.json) | Twelve complete pairs, 24 PNGs; 45.86 s | Same scene with lower camera; stills expose more underside but retain canopy/face joining problems. |

All three invocations independently closed their owned process groups and ports; owner receipts are retained beside their reports. Original reports retain their pre-review `visualReview` fields unchanged. The assessment above records later manual review; independent review covered the first mouth A/B stills, not the movie's temporal continuity. These scenes do not reproduce the user's recording or prove the reference appearance.

The [comparison clip](comparison.mp4) places original drawing on the left and held drawing on the right. It is a lossy derived 0.6-second H.264 movie assembled at 20 FPS from all twelve mouth pairs, scaled to 854×440 per arm. The [first original A PNG](mouth/pair-00-A-default.png) and [first original B PNG](mouth/pair-00-B-clear-hold.png) are copied without pixel changes. Remaining original PNG bodies remain in the corresponding `/private/tmp/tube-clear-roof-*-20261004/native-first` folders and are omitted here to keep the checkpoint small. Their original hashes remain in each report. Sources and supervisor receipts are retained, but their original temporary-path dependencies and candidate build are not packaged as a self-contained replay. [Copied-file hashes](copied-files.json) cover only the copied files, not this later explanation.

## Verification

Six focused core tests pass: reproduced query, original default/off output parity, contact byte parity, held profile/sheet consistency, immutable options and safety across all eight shipped cases at four transition clocks. Twelve renderer tests pass, including default selection, synchronous mesh/mask refresh, cached library reload and asynchronous selection. Strict TypeScript and the final production Vite build pass. Existing Vite large-chunk warnings remain. Contact parity uses actual allocated buffers and scalars; no claim of verified rider passage follows from it.

The next work is the visible roof/face join and a readable hollow opening, followed by an actual rider passage through a shipped moving tube. FPS tuning remains paused.
