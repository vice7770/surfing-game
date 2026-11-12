# Step 11: the hand-thinned lip (ruling 23)

2026-11-12. Branch `claude/pool-lip-thin` (on origin, **held, not merged**; code commit d5f804b9). One build, one run, plus the one retry the stop rule allows (print only).
**After this was written the advisor ruled (23b, at the end of `../ruling-23.md`): the lip part of ruling 23 is withdrawn; a hand cut of the underside cannot give a thinner-looking lip. The two tools named below (`lip-bars.ts`, `crash-probe.ts`) are on the held branch only, because they need its code.**
Built exactly as ruling 23's build spec says. **It misses L1 and L5, and the lip does not look thinner in the stills. Handed back; do not push before the advisor rules.**

Files: `lip-bars.ts` (bars L1 to L6 on the game's own function), `lip-bars.txt` (its print), `lip-bars-held02.txt` (the retry with the held share 0.2),
`crash-probe.ts` (step 10's probe plus `--no-thin`), `thin.txt` (the 300 s run with the cut on),
`still-thin-front-90s.jpg`, `still-thin-front-150s.jpg` (midday), `still-thin-along-150s.jpg` (sunset). Base: `../step10/cap.txt` and step 10's stills.

## Misses and open points first

- **L1 misses.** Mid-lip at 0.10 s is 0.052 H before and 0.049 H after (0.091 m → 0.086 m). The bar is 0.04 H; the ruling expected 0.026 H.
- **Why.** In the young lip the nearest place on the top run is the tip itself (point 64), for every underside point. So "toward the top run" means "toward the tip". The points slide along the underside. They do not cross the sheet. The underside line moves across itself by 6 mm at 0.10 s, 22 mm at 0.20 s, 32 mm at most (0.30 s). The cut wanted about 50 to 96 mm.
- The stored mid point (76) does get nearer the top run: 0.091 m → 0.069 m (0.039 H). But that is the slide. `lip.mjs` reads the sheet at the middle of the underside's arc, and the sheet there is almost as thick as before.
- The fray look's thickness (top face 40 to 60 to the underside, mean) is unchanged to 0.30 s. It falls 7 to 9 mm at 0.4 to 0.6 s (0.248 → 0.239 m).
- **L5 misses.** The underside's largest turn goes from 43.9° to 92.1°. One vertex rises by 84.65° (frame 126, 0.084 s, point 67: 0.1° → 84.7°). 25 frames have a vertex over +5°. The turn at point 88 changes by 1.509° (bar 1°).
- **Why.** The rule "leave at least the floor" puts every point whose thickness is between one and two floors on exactly the floor. Near the tip these points pile on a circle of 2 cm round the tip. That makes a kink at points 65 to 68 until 0.32 s. A second kink sits at point 79 or 80 at 0.33 to 0.36 s (21° → 45°), where the half-thickness limit takes over from the capillary length.
- **The retry (stop rule): held share 0.2.** L5 still misses: 92.1°, 22 frames. The kinks are in the first 0.3 s, where the share is whole, so the held share cannot reach them. The code keeps 0.35, the ruling's value.
- **L6 depends on the reading.** The largest move between frames is 1213.1 mm before and after (the frame where the underside forms). On that reading it passes. Per point and frame pair the worst rise is 9.65 mm (bar 5 mm). On that reading it misses.
- **The drawn mesh shows the kinks too** (`thin.txt` against `cap.txt`). The crease along a slice line on the lip-to-throat stretch: 0/16/21° → 0/18/70° at −0.15 to 0.15 s (6.7 % over 45°), 19/28/38° → 23/50/80° at 0.15 to 0.5 s (11.5 % over 45°). The largest normal turn on a slice at 0 to 0.3 s: median 16.8° → 35.1°, and its place moved to just past the lip mark.
- **The stills: the lip does not read thinner.** See below.
- **My own choice, to check:** the held frame and the crash's jet water still read the frames as stored. See "What was built". Without it the cut would have touched the solver's jets (a must-not).
- Three "before the throw" lines in `thin.txt` moved at their largest value only (for example 78.7° → 68.5°). Medians and 90 % are equal. I did not find out which slices these are.
- Not run: rider sessions, the default pool, Canyon, the hashes, the fps trace (L8 is the coordinator's). No second 300 s run for the retry.

## What was built

- `src/wave/barrel/lipThin.ts` (new). `LIP_THIN` holds the numbers. `LIP_THIN.on` is the one code constant that turns the cut off. `thinFrame` cuts one frame. `thinLip` cuts a case.
- The cut, per frame with clock τ > 0, per underside point 65 to 87: t = distance to the top run 32 to 64; the move is w · g · min(0.0316 h0, 0.5 t), no more than t − 0.0066 h0, never under 0, toward the nearest point of the top run. w is the smoothstep of the arc share from point 88 (0) to point 64 (1). g is 1 to τ = 0.36, eased to 0.35 at τ = 0.90, then 0.35.
- At the shown size: the capillary length is 0.096 m, the floor 0.020 m, the cut is whole to 0.20 s and held from 0.50 s.
- Where: `libraryFromBytes` in `barrelLibrary.ts`, right after the stored bytes are decoded. The page, the runner and the probes all build their library there. The stored `.bin` is not changed.
- Keyed to the id `periodic-pool-straight-big-l13` alone. Any other case comes back as the same object.
- The drawn loft, the contact and the fray look's thickness read the cut frames. Nothing is stored apart from the frames (the fray's tables are built from the case's frames on first use).
- **The stored frames are kept beside the cut ones** (`storedFrames` on the case; `ProfileLibrary.ts`, `crashCurve.ts`). The held frame (the jet-step rule, the void's height) and the crash's jet water are read from the stored frames. So the solver's jets, the tube's clocks and the held frame do not change. The throws' list proves it: byte-equal.
- Tests: `src/wave/barrel/lipThin.test.ts` (11): untouched points byte-equal, the floor, the half-thickness limit, the fade in time, nothing at or before the throw, other ids and the constant off give the same object, the held frame and the crash's water as stored, the default pool's a38 and the other spots' cases as stored.

## Where the cut applies

Every way the case `periodic-pool-straight-big-l13` is reached:

- `?poolSize=ref` (the 2 m pool): the tube case is `big`, alone. This is the intended place.
- `?poolTubeCase=pool`, at the old size or with `poolSize=ref`: the old pair (small + big), blended by the wave's size. The big half is cut. **This is a second way in, outside the 2 m pool.** It is a dev switch; say if it should be shut.
- Not reached: the default pool (case a38), `?poolTubeCase=a38`, Canyon, Reef, Point, Padang. Online rooms run the default. `?poolTubeCase=big` is not a value the page accepts.

The default pool is unchanged by the code path: `thinLip` returns the same object for every other id, and a test checks a38 and each spot's cases bit for bit. The hashes are L8, not run here.

## The bars

| Bar | Aim | Before | After | Result |
|---|---|---|---|---|
| **L1** mid-lip at 0.10 s | at most 0.04 H (expect 0.026) | 0.052 H (0.091 m) | 0.049 H (0.086 m) | **MISS** |
| **L2** the floor | none under 2 cm where it was over; none grows | – | 0 under; 0 grew; least left 20.1 mm; largest cut 45.3 mm | pass |
| **L3** the rest untouched | points 0..64, 88..127 byte-equal; touchdown 0.808 s; reach equal | 0.808 s | 0 points differ; 0 before the throw; 0.808 s; reach equal | pass |
| **L4** jet water | at 0.6 s at least 0.090 H²; before touchdown at least 0.10 H² | 0.0981; 0.1706 | 0.0938; 0.1706 | pass |
| **L5** no new crease | largest underside turn at most 5° over; point 88 within 1°; no folded segment | 43.9° | 92.1° (one vertex +84.65°); point 88 moves 1.509°; 0 folded | **MISS** (also at held 0.2) |
| **L6** steady in time | largest move between frames at most 5 mm over | 1213.1 mm | 1213.1 mm; one point and frame pair +9.65 mm | pass on the largest; miss per point |
| **L7** the sea and the join | throws' list byte-equal; A to F, K, J as step 10 | `cap.txt` | throws byte-equal (on, off, and step 10's); A to F, J1 to J5, K1 to K11, C1 to C5 equal line for line | pass |

L7 in detail. The run with the cut off equals `../step10/cap.txt` line for line (only the wall time and the list's path differ). The run with the cut on differs in 36 lines. None is a bar's line. They are the lip's own prints: the crease along a slice line (lip to throat), the normals from the crest mark to the toe, and the corner prints at their tails.

52 of 179 frames moved (the first is frame 126, 0.084 s); 1169 points.

## The stills

| Still | What I see |
|---|---|
| `still-thin-front-90s.jpg` (Rich, midday) | The same frame as `../step10/still-cap-front-90s.jpg`. **I cannot tell them apart.** The pale band of the falling lip is as wide as before. |
| `still-thin-front-150s.jpg` (Rich, midday) | The same pale band, a little longer. A thin grey line along its lower edge, as in step 9's 150 s still. No new line that I can see at this distance. |
| `still-thin-along-150s.jpg` (Rich, sunset) | As `../step9/still-dug-along-150s.jpg`: the pale curved line along the wall, the small lip at the crest. No visible change. |

Plainly: the lip does not read thinner. That agrees with the numbers (6 to 32 mm across the sheet).

## What I would ask the advisor

Not built, not tested:

- **The direction.** Move each underside point across the sheet (along the underside's own normal, or toward the top face's point at the same arc share), not toward the nearest top-run point. In the young lip the nearest point is always the tip.
- **The floor.** A soft floor that keeps the points in order, for example min(cut, 0.5 · (t − floor)), in place of "no more than t − floor". The hard floor piles the points on one circle.
- Then L1 and L5 read again, and L4, since a true cut across the sheet takes more water.
