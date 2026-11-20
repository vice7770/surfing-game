# Step 8: the foot-line probe

2026-11-12. Asked by rulings 19 and 20. Branch `claude/pool-foot-line`. **A probe only: no game code. Not pushed, not merged.**

The question: the stills of the 2 m pool show a bright line at the foot of the pre-made wall ahead of the tube, and a streak on the lower face. What is it?

## The short answer

- **The bright line is not at the case's toe.** At the profile's toe mark, and at the mesh's seaward end, the drawn surface lies on the sea: no height step (0.000 m), no corner (1 to 2°, the sea's own turn), normals within 0.3° of the sea's.
- **The line is a tight hollow corner part-way up the face.** The stored case's lower face is dug under the live sea (its toe 0.3 to 0.4 m under). The seam draws the sea wherever the case is under it. So the drawn wall ends where the case dives under the sea: about 2 m up the face from the toe mark, at 0.4 to 0.5 of the wall's height. There the case's face (50 to 54°) meets the sea's face (17 to 19°) inside about 0.4 m.
- **Its size:** 31 to 33° median, 38 to 42° at 90 %, 44 to 49° at 99 %, up to 56°, in the last 0.5 s before the throw. On 9 of 10 slices it is over 20°. There is no height step at it (0.01 m): it is a bend, not a ledge.
- **It is geometry first, then the render.** The dev view that shows normals only (`barrelView=front`) shows the same edge at the same place. The Rich look paints it white; the Classic look shows the same edge as a soft change from dark to pale, with no white line.
- **There is a second line, at the top of the wall.** Before the throw the lip's 25 points (lip mark to throat mark) lie on one point, 0.5 to 0.6 m past the crest. Their mesh normals differ by 56 to 67° median (to 89°). That is a hard shading edge. The steep dark wall is only the stretch between these two edges: about 0.4 m along the ray, about 0.45 m tall.
- **The streak is the same hollow corner seen along the wall.** Ahead of the throw the corner climbs the face (from 1.9 m to 2.5 m and more up from the toe mark) as the share grows, and it is not straight there (0.4 m off its neighbours' line at 1 m, 0.8 m at 90 %). From the channel that reads as a curved pale line running down the face.
- **Not told apart:** in the Rich look, whether the white is the sun's highlight or the reflected sky. The game has no switch that turns off one alone (see below).

## What was run

- The probe: `step8/crash-probe.ts` (step 6's probe plus a "step 8" block). Built with `npx rolldown docs/research/pool-look-reference-2026-11-11/step8/crash-probe.ts -o dist/scripts/crash-probe8.mjs --format esm --platform node`.
- The run: `node dist/scripts/crash-probe8.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&loftMesh=arc"` → `step8/arc-foot.txt`. The same base as `step6/arc.txt`; its lines before "step 8" are step 6's.
- What it reads: every 0.5 s in 60 to 270 s (394 frames), each slice of the loft as the game draws it (26270 slices of weight 0.99 or more; 9264 lighter ones left out). Per slice: the drawn curve, the raw case (the same loft with no seam), and the sea, on a 0.1 m grid along the slice's ray. Slopes and turns are read over 0.4 m each side unless said.
- The sea is read with the solver's own bilinear height. The Rich look draws a smoother (cubic) sea. That can change the sea's own small turns, not the corner.
- The clock is the slice's own (0 = the throw). The share at the median depth: 0 to 0.2 at −1.7 to −1.3 s, 0.2 to 0.7 at −1.3 to −0.9 s, 0.7 to 1 at −0.9 to −0.5 s, whole after.

## The numbers

Each cell: median / 90 % / 99 %. "Past the toe" is along the slice's ray, seaward of the profile's toe mark; minus is up the face.

### F1, the slope's jump

| Clock, s | At the toe mark, ° | At the mesh's end, ° | The hollow corner, ° | Over 20°, share | Drawn slope above it, ° | Drawn slope below it, ° | Sea's slope below it, ° | The raw case's own turn there, ° |
|---|---|---|---|---|---|---|---|---|
| −1.7 to −1.3 | 0.8 / 1.8 / 2.5 | under 1 | 2.4 / 3.1 / 3.7 | 0 | (no corner) | | | |
| −1.3 to −0.9 | 1.1 / 2.8 / 4.3 | under 1 | 3.6 / 9.1 / 15.0 | 0 | (no corner) | | | |
| −0.9 to −0.5 | 1.2 / 3.1 / 4.9 | under 1 | 12.9 / 28.9 / 34.3 | 0.3 | −31.2 | −15.5 | −13.5 | 0.5 |
| −0.5 to −0.2 | 1.3 / 3.7 / 5.8 | under 1 | 31.4 / 38.3 / 44.2 | 0.9 | −50.6 | −19.1 | −17.2 | 6.9 |
| −0.2 to 0 | 1.6 / 4.6 / 7.0 | under 1 | 32.8 / 42.2 / 48.8 | 0.9 | −54.2 | −21.4 | −19.0 | 13.6 |
| 0 to 0.3 | 1.8 / 5.3 / 7.6 | under 1 | 29.4 / 39.2 / 46.1 | 0.8 | −51.6 | −20.2 | −18.5 | 17.9 |
| 0.3 to 1 | 2.4 / 6.1 / 8.4 | under 1 | 25.3 / 36.4 / 43.7 | 0.7 | −49.9 | −20.4 | −17.5 | 16.7 |

- The sea's own turn at the corner is about 0° (−0.4 to 1.2° median). The corner is not in the sea.
- Before −0.5 s the corner is all the join (the raw case turns 0.5° there). Near and after the throw about half of it is the case's own bend into its trough (14 to 18°), which the join then cuts short.
- How tight: over 0.2 m each side the corner still reads 33 to 36° at 90 % (38 to 41° over 0.4 m). Most of the turn happens inside about 0.4 m.
- The mesh's seaward end is about 5.0 m past the toe mark. That is the band's own seaward edge. Nothing happens there.

### F2, the height step

| Where | Drawn less the sea, m |
|---|---|
| At the toe mark, before the throw | 0.000 / 0.000 / 0.005 at most |
| At the toe mark, after the throw | 0.000 / 0.015 / 0.085 |
| At the mesh's seaward end, any clock | 0.000 / 0.000 / 0.000 |
| At the hollow corner | 0.007 to 0.013 median; 0.03 to 0.05 at 90 % before the throw |
| 0.4 m above the hollow corner | 0.15 (−0.9 to −0.5 s), 0.38, 0.44, 0.37 |
| 0.4 m below the hollow corner | 0.000 |
| The raw case's toe against the sea | −0.29 to −0.41 median before the throw (dug under; −1.14 at most); −0.19, −0.13 after |

### F3, the normals (what a shader sees)

| Clock, s | Mesh normal's turn across the hollow corner (0.4 m each side), ° | Largest turn between two neighbouring vertices there (0.1 to 0.2 m apart), ° | Mesh normal against the sea's normal at the corner, ° | Coincident lip points: largest normal turn between two on one point, ° |
|---|---|---|---|---|
| −0.9 to −0.5 | 25.6 / 38.2 / 58.6 | 11.5 / 16.2 / 21.4 | 12.1 / 23.1 / 49.3 | 42.2 / 51.5 / 55.6 |
| −0.5 to −0.2 | 29.1 / 42.5 / 51.3 | 15.4 / 20.6 / 25.7 | 17.9 / 28.5 / 37.1 | 56.6 / 65.3 / 70.8 |
| −0.2 to 0 | 35.0 / 54.4 / 66.7 | 15.5 / 23.2 / 33.4 | 17.4 / 38.1 / 54.7 | 66.9 / 81.3 / 89.2 |
| 0 to 0.3 | 56.2 / 67.4 / 76.7 | 15.9 / 22.5 / 28.9 | 1.6 / 18.0 / 28.8 | (the lip has opened) |
| 0.3 to 1 | 54.9 / 67.5 / 76.9 | 11.4 / 18.9 / 26.0 | 5.9 / 21.3 / 27.7 | (the lip has opened) |

- At the mesh's seaward end the mesh normal is 0.2 to 0.3° off the sea's (2.6° at 99 %). At the toe mark the same. No shading seam there.
- Across slices (the next slice 0.5 m along the wall, each at its own largest corner, hollow or convex) the normal turns 5 to 15° median, 19 to 32° at 90 %, before the throw. This reading mixes the two corners.
- The coincident points: before the throw the lip mark and the throat mark are the same point (0.000 m apart, every slice). 24 vertex pairs sit on it. It stands 0.5 to 0.6 m past the crest mark, at 0.80 of the drawn height, 0.3 to 0.5 m above the surface of the sea. The mesh normal at the crest mark against the lip mark's: 56 / 69 / 80° at −0.5 to −0.2 s, 68 / 93 / 98° at −0.2 to 0 s.
- That point is 0.4 m up the ray from the hollow corner. So the two shading edges are 0.4 m apart.

### F4, where the foot stands

| Clock, s | Hollow corner, m past the toe mark | Its height, share of the drawn crest over the toe | Raw case dives under the sea at, m past the toe | Sea at the toe mark over its trough, m |
|---|---|---|---|---|
| −0.9 to −0.5 | −2.5 | 0.49 | −2.5 | 0.47 to 0.63 |
| −0.5 to −0.2 | −2.1 | 0.48 | −2.0 | same |
| −0.2 to 0 | −1.9 | 0.38 | −1.7 | same |
| 0 to 0.3 | −1.7 | 0.30 | −1.6 | same |
| 0.3 to 1 | −1.2 | 0.21 | −1.1 | same |

- The hollow corner sits where the drawn surface first lies on the sea (0.0 m from it) and 0.1 to 0.2 m above where the raw case dives under.
- The sea's own trough is 12 to 14.5 m ahead of the toe mark. The sea's crest stands 1.73 to 1.77 m over it. The raw case's toe stands 0.19 to 0.26 m over the trough's level; the sea above it is 0.3 to 0.4 m higher. So the case's foot is dug under the sea's lower face, not at or above it.
- The drawn crest over the toe mark: 1.17 m (−1.7 to −1.3 s), 1.42 m (−0.5 to −0.2 s), 1.60 m (−0.2 to 0 s), 1.69 to 1.74 m after.
- Along the wall, the hollow corner's place against the line through its neighbours:

| Clock, s | Off the line, 1 m each side, m | Off the line, 2 m each side, m | Height off the neighbours' mean (1 m), m | Step to the next slice along the ray, m |
|---|---|---|---|---|
| −0.9 to −0.5 | 0.4 / 0.8 / 1.0 | 0.8 / 1.0 / 1.2 | 0.075 / 0.220 / 0.288 | 0.064 / 0.228 / 1.460 |
| −0.5 to −0.2 | 0.1 / 0.1 / 0.4 | 0.1 / 0.8 / 1.1 | 0.023 / 0.064 / 0.135 | 0.074 / 0.165 / 0.320 |
| −0.2 to 0 | 0.1 / 0.3 / 0.7 | 0.2 / 0.5 / 0.9 | 0.040 / 0.118 / 0.291 | 0.122 / 0.362 / 0.789 |
| 0 to 0.3 | 0.0 / 0.1 / 0.3 | 0.1 / 0.3 / 0.4 | 0.024 / 0.068 / 0.138 | 0.037 / 0.104 / 0.147 |

  (The first two columns were printed to 0.1 m.) The toe mark itself is straighter: 0.06 m off at 1 m (0.13 at 90 %) from −0.5 s on; 0.37 m at −0.9 to −0.5 s.

### F5, along the wall (before the throw, by the distance ahead of the front's leading thrown slice)

| Ahead, m | Hollow corner, ° | Over 10° / over 20°, share | Face's steepest 0.2 m, ° (the sea's) | Normal's turn across the corner, ° | Jump at the toe mark, ° |
|---|---|---|---|---|---|
| 0 to 2.5 | 33.2 / 41.4 / 47.7 | 1.0 / 0.9 | 59.3 (17.0) | 36.4 / 51.5 / 65.5 | 1.4 |
| 2.5 to 7.5 | 15.4 / 33.0 / 39.8 | 0.6 / 0.4 | 36.8 (15.4) | 28.1 / 40.0 / 57.7 | 1.1 |
| 7.5 to 15 | 2.8 / 11.7 / 27.7 | 0.1 / 0.0 | 16.2 (12.9) | 24.0 / 38.8 / 58.7 (157 slices) | 0.8 |

- There are no slices of weight more than 15 m ahead. So "5, 10, 20 m": at 5 m the corner is half-formed (15°, on 6 of 10 slices over 10°); at 10 m it is nearly gone (3°); at 20 m there is no pre-made wall.
- The normal's turn in the last column is read only on slices whose corner is over 10°.

### F6, the lower face (the streak)

| Clock, s | The convex corner near the crest, ° | Its place, m past the crest | A second corner over 0.6 m from the largest, ° | Over 10°, share | Drawn face's steepest 0.2 m, ° |
|---|---|---|---|---|---|
| −0.9 to −0.5 | 15.9 / 29.5 / 34.3 | 0.45 to 0.63 | 5.4 / 12.5 / 16.1 | 0.2 | 33.9 / 50.5 / 55.2 |
| −0.5 to −0.2 | 31.1 / 38.5 / 45.0 | same | 4.1 / 22.6 / 33.4 | 0.4 | 56.8 / 62.1 / 65.4 |
| −0.2 to 0 | 21.7 / 43.7 / 52.4 | same | 5.7 / 37.5 / 46.3 | 0.4 | 62.1 / 68.2 / 72.0 |
| after the throw | about 1 | | 3.8 / 5.9 / 8.9 | 0.0 | 36 to 43 |

- Between the toe mark and the hollow corner the drawn surface is the sea (drawn less sea 0.000 m). There is no further jump inside that stretch beyond the sea's own turns (2 to 5°).
- So before the throw the face holds two corners: the convex one at the lip's point (the case's own shoulder, −16 to −29° in the raw case) and the hollow one at the join. After the throw only the hollow one is left.
- The foam at the corner is 0.00 median, 0.02 to 0.03 at 90 %. The line is not foam.

## What the stills show

All at 90 s and 150 s, the ride switches plus `poolSize=ref&tubeForm=early&loftMesh=arc`.

| Still | What it shows |
|---|---|
| `still-base-front-150s.jpg` (Rich, midday) | Left of the tube: a dark blue band with a thin white line along its lower edge and another along its top. Below the lower line the water is pale. |
| `still-view-front-150s.jpg` (the same with `barrelView=front`: flat colour times the normal's tilt) | The same band, with a sharp change of shade at the same lower edge. The loft goes on well below it (to about 5 m past the toe), with no edge at its end. |
| `still-noglitter-front-150s.jpg` (`glitter=off`) | No visible change from the base: the white line stays. |
| `still-classic-front-150s.jpg` (Classic look, same frame) | The dark band and its lower edge stay. The white line is gone: the edge is a soft change from dark to pale. |
| `still-base-along-150s.jpg` (Rich, sunset) | A pale curved line runs down the face ahead of the tube, from the crest toward the trough. |
| `still-view-along-150s.jpg` | A crease on the same curve in the normals-only view. |

The 90 s stills show the same.

## The render side, from the code

- No term draws a line by itself here. The loft (`src/scene/barrel/SweptBarrelMesh.ts`) has no edge or foam term at the join: lift and mask are both 1.00 at the corner and fall to 0 only at the mesh's seaward end, where the normals agree with the sea's to 0.3°. Foam is 0 there.
- What the Rich look does with a 30° turn of the normal inside 0.4 m: the steep side shows the water's dark body colour; the flatter side reflects the sky (`skyReflection.ts`) and catches the sun's highlight (the glitter, or three's GGX when `glitter=off`). The corner is where one turns into the other, so it shows as a line.
- The Classic look has neither the sky's reflection nor the sharp highlight. Its line is the shade change only.
- The stretch from the hollow corner down to 5 m past the toe is drawn by the loft, as "lifted" water, though it lies on the sea. Its foam is the slice's own, its lace is off. I saw no edge from that in the stills.

## What could not be told apart

- **Sun or sky in the Rich look.** `glitter=off` only swaps the sun's glitter for three's own highlight; the line stays. There is no switch for the sky's reflection alone. The sunset still (sun behind the wave) still shows the pale line, so the sky alone is enough to draw it. Whether the sun adds the white in the midday still, I cannot say.
- **How much of the top line is the coincident lip points and how much the convex shoulder.** They are at the same place (within 0.1 m). The probe reads both; the stills cannot split them.
- **The streak in the step 6 still.** I read it as the hollow corner's line climbing the face. The normals-only still agrees. I did not measure the streak's place in the picture against the probe's corner, point by point.

## Not run

- No rider sessions, rides or catch reports. No two-train run, no 600 s run.
- The default pool (not `--ref`) and Canyon: not read.
- No build of any fix.

## For the advisor (questions, nothing built)

1. The case's lower face is dug under the sea by 0.3 to 0.4 m, so the join is a corner at mid-face. Should the case be placed (or its foot re-made) so that it meets the sea's face at the sea's slope, over a longer stretch than the seam's 0.3 to 0.5 m band? What length is right for a 2 m wave?
2. Or should the join stand lower: the case lifted or scaled so its toe meets the sea near the toe mark, where the sea is flatter?
3. The lip's 25 points on one place before the throw carry normals 56 to 67° apart. Should they share one normal until the lip opens?
4. The corner is not straight along the wall while the share grows (−0.9 to −0.5 s: 0.4 m off at 1 m). Is that part of the same fix, or the frame join's (ruling 20's second library)?
5. Is the Classic look's soft edge acceptable as the target, with the geometry as it is, or must the corner itself go?
