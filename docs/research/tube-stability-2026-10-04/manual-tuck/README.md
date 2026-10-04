# Deeper manual tube tuck

Full manual crouch now asks for 0.45 m of leg shortening, compared with the previous 0.195 m. Input through 0.6 retains the existing pumping response. Compress retains its 0.30 m sharp-turn stance and activation mechanics; when pressed during a deep tuck it eases the extra depth out through normal extension. Body collision radii, lowering acceleration/speed limits and foot-load limits stay unchanged. The bent-leg stiffness remains at the existing 22 kN/m minimum.

The first design accidentally disabled Compress assistance in a deep tuck. A revision restored its activation but left a slower deep stance through the turn; the final separation lets Compress select its existing stance. Independent review then found a partial-input valley: halfway between controls the rider rose above the final Compress stance. The repair fades only manual depth beyond the full Compress stance. The full-tuck target now moves monotonically from 0.45 to 0.30 m; normal intermediate-input and continuous-ramp tests cover it.

One normal standing placement on flat water, followed by unforced RideSession dynamics at initial 6, 8 and 11 m/s, keeps the rider standing and loaded. After a one-second preparation, the physical head-sphere top is 1.038–1.045 m above the deck. Published head points agree with the physical centres. This is readiness on flat water, not a tube ride or a promise of immediate clearance during a drop.

The final four-suite run passes 152 of 159 checks. The remaining seven failure names and numeric messages match the retained committed rider baseline exactly; the full suite is not green. Nine deep-tuck, 26 RideSession and five stance-ladder checks pass. The two obsolete height expectations now distinguish the intended manual/Compress stances. Pumping turn/braking fixtures keep their original thresholds at input 0.72, which gives approximately their old 0.195 m posture; separate checks cover the new deep stance. Strict TypeScript and the production build pass.

Handling changes with full tuck: a subsequent compressed bottom turn remains attached, reaches 90 degrees at 1.15 seconds and exits at 4.65 m/s, compared with 5.58 m/s from the legacy pumping posture. Its hand braking remains positive but weaker. These are deliberate posture differences, not preserved full-input handling.

All four committed GLB skeletons were also driven through normal physics, RiderMotion and PosedBody. Beyond Compress, the manual tuck lowers the published pelvis/head by about 146 mm and the actual hip bones by 143.5–143.9 mm, but head joints by only 49.4–59.5 mm as the trunk straightens. Feet retain the solved ankle joints. Those four new regressions pass; the relevant rig set has 17 passes and one existing expected failure. The head joint excludes skull/hair extent; it does not prove drawn-mesh clearance. No production rig change is made from the stanceBlend clamp alone.

The posture change is accepted with the limits below. The tube goal remains unfinished: broad canopy joins and a normal prepared entry/passage still need work.

The final native pair uses the actual worker, matching observed initial config, selected cavity/camera and all retained physics clocks. One ordinary standing placement in the existing cavity is followed by full manual crouch alone (`compress:0`) for 60 ordinary steps; twelve states are retained. The drawing advances through its normal update after every published step, with its observed one-step interpolation delay. The physical head sphere and the highest world-Y vertex with at least 0.5 head-bone influence in meshes marked visible are measured separately, including head-weighted hair/eyes. The vertex witness is not a complete mesh/water collision test.

| Time after placement | Old physical head top above feet | Old head/hair witness above drawn feet | New physical head top above feet | New head/hair witness above drawn feet |
| --- | --- | --- | --- | --- |
| 0.1 s | 1.472023 m | 1.532588 m | 1.472023 m | 1.532588 m |
| 0.5 s | 1.325802 m | 1.457270 m | 1.275450 m | 1.411427 m |
| 1.0 s | 1.307258 m | 1.187545 m | 1.265122 m | 1.110611 m |

Both arms stay standing throughout the retained second, with no recorded separation. They both intersect the roof initially and at 0.1 seconds; by 0.2 seconds the published head has left the overhead cavity. Consequently **neither arm proves sustained passage or a successful entry**. The moving-wave height change is smaller than the flat-water readiness result. The normal screenshots remain obscured by spray and do not establish a cleaner-looking tube. Original PNGs remain in the native work directory above.

An earlier declared attempt at prepared entry settled only 1,005 steps, selected front 48 near sigma 36.879, and intended one crest-side placement plus 0.7 seconds of normal preparation. That required section was not present at that clock, so the attempt stopped before placement; it proves no entry. A future route needs measured earlier wave geometry rather than that extrapolated row assumption.

The first paused drawing probe left the character interpolation behind the worker, so its rendered-head comparisons are superseded. After correcting drawing advancement, a candidate captured all twelve states but its Node CLI remained alive until the command deadline; the owner independently closed the owned resources. Explicit CLI exit after completed report/Chrome closure fixes that lifecycle issue. The final baseline and candidate owners complete in about 49 and 54 seconds, with no browser errors, no remaining owned PIDs and both owned ports closed. These outcomes are diagnostic integration evidence for the posture change, not FPS or tube-quality acceptance.
