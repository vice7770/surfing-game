# New C normal rider and spawn audit

Read-only source and bounded saved-geometry analysis. Only this directory was written; no native run, runtime/test execution, source/build/Git/port/resource change or altered control/spawn occurred. Earlier RAW body traces were not consulted and do not establish an outcome for this NEW C capture.

## Actual initial separation

The normal board starts at `(−50,2.800649235,−271.091378705)`, prone. The complete initial saved mesh contains 31,122 indexed triangles in two actual joined components: front 76, rows 0–60, and front 106, rows 61–118. All were searched; the selected diagnostic front was not privileged.

- Closest indexed barrel to board position: **67.198290894 m in 3D**, triangle 10108, front 76, rows 38–39. Its nearest point is `(−50.067497240,−0.647749500,−203.981660412)`. The same projected triangle is **67.109727896 m** away horizontally. It is a back-extension seam triangle with all three lifts zero, not raised tube wall.
- The exact horizontal convex hull of the saved board position and seven drawn rider landmarks is **66.763956775 m** from that mesh. Its closest footprint location is the head landmark. This is the measured landmark footprint; full board hull/body radii were not retained and are not reconstructed. The entire mesh and footprint are separated along Z, so the projected hull distance has no unhandled crossing case.
- Nearest actual joined crest segment: front 76 rows 38–39, projected point `(−50,−188.5)`, **82.591378705 m** from the board. The nearest triangle with *any* lifted vertex is 81.292192321 m away, but its minimizing point still has lift0; this is explicitly not a positive-height tube-contact result.
- Front106's nearest indexed triangle is **126.950581030 m** from the board. The selected diagnostic eye is **150.406445514 m** away horizontally. Its internal camera proves no normal rider presence there.

`geometry.json` contains exact point/triangle barycentric minima for board and each of the seven rider landmarks, per-component minima, measured-footprint coordinates and slice/contour/lift annotations. No per-fragment ownership or body-contact claim follows from these closest-geometry measurements.

## Why the normal spawn is offshore

The frozen capture source has **no instantaneous wave-coherent spawn scorer**. Root independently confirmed the normal spawn paths also match the current repository bytes. “Coherent” preparation describes the water warmup; it does not describe candidate scoring.

`SurfZoneSimulation.takeOffPoint` selects a fixed Padang peak transect and the first bed depth reaching an empirical shoaled breaker target (`SurfZoneSimulation.ts:430–453`). The target uses `.47+.19*edgeHeight`, a provisional fit from earlier size reports, rather than the current solver crest/front or prepared loft. `breakPoint()` caches it (`1314–1316`). `SurfZoneRunner` computes focus and `rideLineup=(focus.x,focus.z−6)` during construction (`362–376`), before the worker's water spin-up; after spin-up `seat()` calls `launchRide` (`394–403`, `604–607`). `RideSession.reset` places the rider prone, heading0, with the local water's velocity (`RideSession.ts:138–169`).

The captured focus is exactly `(−50,−265.091378705)`; subtracting the normal six-metre offset exactly reproduces the captured initial board X/Z. Thus “far offshore” is relative to the currently prepared barrel components, not a six-metre error in the seating operation. Warmstart prepares height and flux from the same transformed linear-wave values (`warmStart.ts:104–127`), and handover time is planned from a set peak at the offshore feed reference (`SurfZoneSimulation.ts:584–587`, `warmStart.ts:141–149`). These paths do not score nearby live barrels or move the fixed lineup to them. A prepared front 76 is present near the peak, but it is never a spawn candidate under this algorithm; calling it an incorrectly rejected score would be inaccurate.

## Cue, line and actual incoming-wave progress

At initial capture, the gauge reports a valid 4.067814 m face, faceFraction 0.846515, aheadOfCrest 5.337442 m, crestBreaking 0 and no curl within its search. Initial crestSpeed 0 is the reset gauge's unmeasured speed, not an observed stationary crest (`waveFrame.ts:126–132,187–211`; initial status can call the gauge with dt0 at `SurfZoneRunner.ts:807`). Serialized null curlDistance/requiredSpeed represents Infinity, not a measured zero distance/speed.

The take-off window needs crestSpeed≥3, shoreward board speed≥max(.8*crestSpeed,3), faceFraction≥.5, and on this large face 2–4 m ahead (`takeOffCue.ts:26–39`). Initial speed 0 and ahead 5.337 m both fail. The HUD cue is the rider's local pressure/slope cue OR that gauge window, while prone (`SurfZoneRunner.ts:622–625`). The local rule requires pressure≥35% of combined weight, speed≥2 m/s and downhill slope≥2° (`AttachedRider.ts:625–627,1418–1427`).

The saved NEW C run retains **69 normal rider observations over 68 ordinary steps /1.133333 s** even though the diagnostic camera follows the other tube. All 69 remain prone, with no popup, fall, reset or rescue. The board advances 8.521829566 m shoreward and 1.020180248 m toward−X.

- First cue: **step 21 /0.350000 s**, board Z−268.606065233. Ahead4.209215 m and speed7.184992 m/s versus crest9.910557 m/s still fail the gauge window, so the source OR implies the local rider cue supplied this first positive cue.
- First exact source take-off-window pass: **step 44 /0.733333 s**. This is a calculation on retained frame fields, not a new source/test/native run.
- Board crosses the empirical focus Z at **step 50 /0.833333 s** while still prone and unfallen; its measured local crestBreaking is still 0. Crossing that predicted transect does not establish reaching the actual drawn barrel region.
- Terminal step 68: board Z−262.569549139, prone speed8.162771 m/s, ahead2.884623 m, crestSpeed9.518688 m/s, cue true. Every retained local crestBreaking remains0, and every curlDistance is Infinity. The record stops for diagnostic loft-join loss, not rider fall or successful body entry.

Normal controls do not automatically popup or steer toward the camera's tube. `RideSession.step` pops only on the requested key (`196–218`). Standing `holdLine` preserves the established heading and steering chooses a new one (`AttachedRider.ts:2459–2482`). The optional pocket reflex changes trim, not steering, and returns 0 when curlDistance is infinite (`pocketReflex.ts:35–42`). None provides a barrel-navigation line from the remote diagnostic camera.

## What remains unproved and the smallest next step

The captured incoming face catches/cues the prone rider, and the rider survives this short interval. It has not reached a measured breaking crest or actual nearby barrel. This snapshot does not retain solver surface/current arrays or an identity linking that gauge crest to a future breaking-front component. A straight extrapolation at current speed cannot establish its travel time, loss of speed, tip or fall. Separation depends on evolving board forces, contact limits, flight/posture error and standing sway (`AttachedRider.ts:2119–2127`), not static barrel distance alone.

No normal spawn/cue/line correction is justified by this evidence alone. In particular, the initial false cue is consistent with the current rules, and there is already an honest early cue on the normal incoming wave. The required next evidence is a **finite ordinary rider run from the unchanged normal start, using an existing documented normal gameplay control sequence**, retaining rider/body/contact and local wave frames through that incoming wave's approach to breaking or the first honest fall/reset. It must keep the actual rider camera/body distinct from a geometry-only tube camera. No invented placement, teleport, new control script or earlier RAW 395-step outcome substitutes for that NEW C run.

## Pins

Input native report9,452,886 bytes, SHA256 `a4934771a954d4363d3618719ac0e4ef236aeac1ca2f6d938940dabd7f87a988`; initial sidecar1,796,420 bytes, SHA256 `1a9722cc198f7cb4c4df56de1ece30e2417fbd462df2249c54d4cb143f17c32f`, step0 / seaTime361.80670943368096 / surfaceRevision2. Twelve needed source files match capture-seal bytes/hashes and remain unchanged. Exact pins are retained in `geometry.json`.
