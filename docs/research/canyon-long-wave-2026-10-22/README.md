# The Canyon's long wave: a planar arm whose break runs into the beach (2026-10-22)

Branch `claude/canyon-long-wave`, from `main` (`bff9a874`, with `7b79f085` merged in: the rock bed). Wave only, no riders
(the owner rides), on the 8 GB M1 with other agents working.

## The complaint and the diagnosis

The owner, on the M4, after canyon-layout's short arm (PR #141): "Canyon with the latest build shows everything fixed:
waves are now going the right direction and the foam is good. But the wave has small progress; the wave itself is not
long. A lot of foam, but no long wave or steep wave." In the video, from the start looking seaward, the crest humps up
by the peak, breaks into a patch of whitewater on the upcoast side, and the breaking runs only a short way. The goal:
the barefoot_surf reel (Jesse Mendes), a long, steep left peeling along a reef (the advisor: weak-to-moderate plunging,
ξb about 0.42–0.55, on about 1:22–1:30, 12–16 s).

**Measured on main** (the size report's onsets, 3 seeds × 14 periods a size, re-read by `ride-report.ts`, below): half of
Medium's crests broke for 1.4 s or less: a patch 8–15 m along shore at the arm's upcoast end and the peak, then nothing,
or a few scattered breaks further down. 13 of 40 crests broke on down the arm for 10 s or more. Big's sets broke across
the fan's 55° deep face within 3–4 s, a fast section, and stopped. `ride-medium-146.png` and `ride-big-155.png` (left)
show it for one crest each: the blue patch at the peak, gaps, then a few late breaks near the beach.

**The water-physics advisor** (consult log, 2026-10-22, "Canyon long wave"), ranked:

1. With crests arriving square to the shore, a ride lasts about Δz / c0: how far its trail of breaks runs across shore,
   over the crest speed on the 6 m platform (about 7.5 m/s). The 55° deep face, where Medium and Big break, ended in the
   taper past the line's end, about 90 m from the beach, so the trail ran only 30–60 m across shore: 4–8 s.
2. The taper's corner and the 1:4 upcoast end focus the swell: a section breaks first at the end, and the hump the owner
   saw is the end's focus.
3. An oblique face spreads its waves (K = cos φ / cos α, about 0.64 at Medium): the face's waves are smaller than the
   flanks', whose shore break is taller than the reef wave.
4. The wall ahead of the break, the crest's stretch with H/h ≥ 0.6, is 16–21 m on any of these beds: intrinsic. What
   was missing is how long it lasts.
5. Medium at 40–60° on the tracker is out of reach from a 6 m platform at any reef angle, by rays (Snell; ten Voorde et
   al. 2009: the peel angle peaks at a 66° reef angle; a 4 m approach would be needed, where Big breaks).

It advised running the 15° fan's deep face on into the beach (A, with a 260 m window), a softer end for the hump (A2), or
a planar 50–52° wedge (B), and rejected a pre-rotating ramp, a curved reef and a steeper face.

**The solver disagreed with the rays** on the narrow arm (the sweep, below). Rays refract the whole crest onto the arm's
contours; the arm is narrower than a wavelength (60–80 m at 11 s), so the solver's crests turn far less, and its waves
break down the arm much more slowly than the rays say. On the fan, A rode 2 s at the median at Medium; on a planar face
at 70° the break ran down the arm for 11 s and peeled at 64° by the tracker (the rays: 35°).

## What changed (`src/wave/Bathymetry.ts`, `CANYON`)

| | Before (main, now `?canyonBed=old`) | Now |
| --- | --- | --- |
| The arm's face | 1:23 below a 2.2 m hinge, then a 15° fan: deep contours at 55°, the shallow face 1:31 at the take-off, 1:54 by x 18 | **one planar face, 1:23 along +z from the 6 m shelf to the 1 m crest line, contours at 70° all the way** (`fan` 0) |
| Past the line's end on the beach face | the terrace tapered (x 28–40) | **the face runs on until its foot meets the beach face's 6 m contour** (`runOn` 1, `canyonReefEndX`: x 31), then tapers (to x 43) |
| Peak (x, z); line | (−10, −120); 70° | **(−22, −120)**; 70° |
| Take-off x | −2 (8 m downcoast of the peak) | **−14** (8 m downcoast) |
| Footprint, upcoast end to the taper's end | x −30…40 | **x −42…43**, centred (open water 68 m and 67 m to the window's sides) |
| Window, tank, cells, beach | 220 m, zone from z −390, 220 × 451, 1:15 | the same |
| Take-off depth (`CANYON_TAKE_OFF_DEPTH`) | 1.14 + 1.12 Hs | **1.50 + 1.00 Hs** (refitted, below) |
| Starts (`CANYON_RIDE_LINEUP`) | 11, 11 and 6 m out | **11, 11 and 11 m** (re-measured, below) |

The arm's crest line, its 1:4 upcoast end, its flat top and lagoon, the platform, the tank and the beach are unchanged.
`canyonArmAt` and `canyonPeelAt` (the readout's peel) now reach the reef's end, and past the crest line's end count a
break only where the reef, not the beach face, makes the bed, so the shore break behind it does not read as the wave.
The rock bed (`src/scene/water/rockBed.ts`) follows: it reads `canyonTerraceDepth`, `shelfDepth` and `shoreSlope`, all kept.

**`?canyonBed=old`** now returns main's whole layout at `bff9a874` (`CANYON_OLD`: canyon-layout's short arm on its fan,
with its take-off 1.14 + 1.12 Hs and starts 11, 11 and 6 m). The test pins it to main's own build: bed depths, window,
tank, rider bounds, take-offs, starts, grid, curl sizes and the readout's breaker, every value exactly. The long arm the
switch rode until now is no longer reachable (`CANYON_OLD` at `bff9a874`).

## How it was measured

Each size's own swell (`SWELLS`: Small Hs 0.9 m and Tp 9 s, Medium 1.4 m and 11 s, Big 2.4 m and 14 s), square, s = 150,
mid tide, calm. Main's runs re-read here reproduce canyon-layout's tables line for line, so main's waves have not moved
since. The tools, here unless said:

- **`scripts/canyon-size-report.ts`** (3 seeds × 14 periods, `--stability`): the tracker, the readout every second, each
  crest's start, close-out and upcoast run, the onsets, the health. It now pools seeds run apart (`--from a,b,c`).
- **`ride-report.ts`** (new): each crest's ride along the reef from the size report's onsets: from its first break toward
  +x while the next break comes within 8 m along shore, no earlier than the last, and at a 27° peel or more over 10 m
  (the readout's close-out line); its length along shore and along its breaks, and how long it lasts.
- **`ride-map.ts`** (new): one crest's breaks over the bed, coloured by time: the stills.
- **`arm-report.ts`** (canyon-layout's, its bins running on to the reef's end): ξb along the arm, and the take-off column's
  start depths.
- **`transect-probe.ts`**, **`analyze.mjs`** (big-start's) and **`pool.mjs`** (canyon-layout's): the faces along the take-off's
  column and the starts (2 seeds × 12 periods, pooled with the size report's).
- **`scripts/crest-angle-report.ts`** and **`crest-angle-compare.ts`**, 600 s, seed 1, 64 components, against the Beach.
- **`peel-model.ts`** (new): a quick linear-ray screen (an eikonal on the bed). It ranked the plan shapes as the advisor's
  rays did, and, like them, missed the narrow arm's weak refraction: the solver decided.
- **`wall-probe.ts`** (new): the steep unbroken face standing down the line from the break, every 0.5 s (below).
- **`layout-numbers.ts`** (canyon-layout's, with the reef's end): the static numbers.

## The sweep (Medium, seed 1, 12 periods; `sweep.txt`)

| Bed | Rides: median; ≥ 10 s | Along its breaks: median / 90th | Tracker: median | Readout: closes out / left / right |
| --- | --- | --- | --- | --- |
| Main: 15° fan, tapering past the line's end (14 periods) | 1.4 s; 3 of 14 | 11 / 93 m | 37° | 14 / 86 / 0 % |
| A: the fan's deep face run on to the beach, peak x −40, window 260 m | 1.7 s; 2 of 11 | 19 / 68 m | 43° | 22 / 69 / 9 % |
| A2: A with a 1:7 end, peak x −33, window 275 m | 2.5 s; 2 of 13 | 16 / 81 m | 29° | 40 / 60 / 0 % |
| An 8° fan run on, peak x −25, window 240 m | 5.2 s; 5 of 13 | 26 / 90 m | 34° | 25 / 75 / 0 % |
| Planar 60°, run on, peak x −42, window 260 m | 1.8 s; 1 of 12 | 19 / 68 m | 29° | 33 / 66 / 1 % |
| Planar 65°, run on, peak x −30, window 240 m | 9.2 s; 6 of 14 | 53 / 123 m | 47° | 15 / 85 / 0 % |
| Planar 70°, tapering past the line's end (10 periods) | 8.1 s; 4 of 9 | 52 / 129 m | 68° | 10 / 88 / 2 % |
| **Planar 70°, run on** | **11.2 s; 6 of 11** | **56 / 88 m** | **64°** | **16 / 83 / 1 %** |

The fan's deep face takes the break away from the line whatever the window: the sets break at the end and the peak and
seldom carry on down the 55° face. A planar face keeps the breaking contour beside the line, and the steeper the line the
longer and slower the ride. Two finalists, then three seeds at Medium (peak x −10): the planar 70° arm rode 13.0 s at the
median (24 of 37 crests 10 s or more) at a 50° tracker peel, the planar 65° arm 8.7 s (17 of 41) at 38°, with "closes out"
36 % of the time. The 70° arm won at every bar but the readout's peel, which on three seeds came back into the 40–60°
band, and it keeps the window and the cells. Built at peak x −22, so its 15 m longer footprint stays centred.

## The bars, 3 seeds × 14 periods a size (main → now; `sizes.txt`, `rides.txt`, `arm.txt`)

| Bar | Small (0.9 m, 9 s) | Medium (1.4 m, 11 s) | Big (2.4 m, 14 s) |
| --- | --- | --- | --- |
| **Rides: median duration** | 2.5 s → **10.5 s** | 1.4 s → **10.6 s** | 1.8 s → **6.0 s** |
| **Rides of 10 s or more** | 9 of 36 → **20 of 39** | 13 of 40 → **22 of 41** | 9 of 43 → **21 of 47** |
| **Rides along their breaks: median / 90th** | 12 / 83 m → **55 / 103 m** | 14 / 98 m → **59 / 127 m** | 21 / 77 m → **53 / 132 m** |
| Rides along shore: median / 90th | 9 / 27 m → **19 / 31 m** | 9 / 36 m → **21 / 40 m** | 13 / 37 m → **18 / 46 m** |
| Rides: 75th / 90th duration | 11.8 / 15.3 s → **15.4 / 18.1 s** | 14.1 / 18.8 s → **16.9 / 20.0 s** | 7.8 / 13.4 s → **15.3 / 17.7 s** |
| Peel over the ride (median) | 42° → 49° | 42° → 49° | 30° → 46° |
| 2. Tracker: clean samples toward +x; median | 25 of 25; 28° → **28 of 28; 37°** | 36 of 36; 34° → **36 of 36; 44°** | 37 of 38; 30° → **31 of 32; 47°** |
| 2. Readout every second: closes out / a left / a right | 51 / 49 / 0 % → **29 / 71 / 0 %** | 39 / 61 / 0 % → **24 / 76 / 0 %** | 46 / 53 / 1 % → **35 / 64 / 1 %** (mixed 1 %) |
| 2. Readout: clean reads toward +x | 208 of 208 → **197 of 197** | 366 of 367 → **377 of 377** | 468 of 485 → **429 of 432** |
| 2. Each crest's own fit along the arm: +x; median | 33 of 33; 50° → **35 of 35; 33°** | 40 of 40; 51° → **41 of 41; 43°** | 32 of 32; 31° → **44 of 44; 48°** |
| 3. Starts within ±10 m of their median (median x) | 32 of 40 (x −7) → **31 of 40 (x −21)** | 41 of 45 (x −11) → **39 of 44 (x −24)** | 46 of 48 (x −14) → **44 of 50 (x −26)** |
| 3. Where the crests start | face 23, end 13, top 3, beach face 1 → **face 21, end 16, top 3** | end 25, face 19, beach face 1 → **end 31, face 9, top 3, beach face 1** | end 41, face 7 → **end 34, face 14, top 2** |
| 3. Close-outs (≥ 40 m within 2 s): all; off the beach face | 1; 0 → **0; 0** | 0; 0 → **1; 0** | 2; 2 → **2; 2** |
| 3. Upcoast runs: all (largest reach); off the beach face | 3 (100 m); 2 (29 m) → **1 (17 m); 1 (17 m)** | 2 (12 m); 2 (12 m) → **3 (100 m); 2 (9 m)** | 24 (96 m); 24 (96 m) → **16 (30 m); 16 (30 m)** |
| 3. Onsets on the beach face (the flanks' shore break) | 40 % → 47 % | 64 % → 66 % | 66 % → 66 % |
| 5. ξb of the sets, 5 / 15 / 25 / 35 / 45 m downcoast of the peak | 0.31, 0.33, 0.26, 0.21 → **0.35, 0.46, 0.53, 0.54, 0.58** | 0.37, 0.41, 0.48, 0.27 → **0.39, 0.47, 0.56, 0.62, 0.66** | 0.45, 0.49, 0.54, 0.55 → **0.46, 0.50, 0.56, 0.59, 0.58** |
| 5. The sets' faces there, m | 2.02, 1.43, 0.99, 0.69 → **1.94, 1.11, 0.84, 0.81, 0.87** | 2.44, 1.84, 1.38, 1.15 → **2.30, 1.61, 1.11, 0.92, 0.99** | 2.80, 2.36, 1.87, 1.85 → **2.71, 2.33, 1.86, 1.67, 1.74** |
| 5. ξb of the sets over the whole arm; share ≥ 0.4 | 0.29; 2 % → **0.47; 63 %** | 0.38; 36 % → **0.48; 73 %** | 0.46; 79 % → **0.50; 87 %** |
| 6. Take-off's column: 90th percentile start depth | 2.19 m → **2.43 m** | 2.65 m → **2.85 m** | 3.85 m → **3.91 m** |
| 4. Health: fastest water; Froude caps; volume | 4.5–5.0 m/s; 0; within 0.12 % → **5.6–6.7 m/s; 0; within 0.11 %** | 5.8–7.6 m/s; 0; within 0.38 % → **7.8–8.7 m/s; 0; within 0.40 %** | 8.7–9.7 m/s; 0; within 1.17 % → **9.7–10.1 m/s; 11 (none in water); within 1.35 %** |

What they mean:

- **The break runs down the arm.** The median crest now breaks on the reef for 10.5–10.6 s at Small and Medium (1.4–2.5 s
  on main) and 6.0 s at Big (1.8 s), along 53–59 m of breaks; half of every size's crests ride 10 s or more (a quarter to
  a third on main), the longest 18–20 s and 103–132 m, from the peak to the beach face. The stills show it (below).
- **It peels at a makeable angle.** The readout's peel rises at every size: Medium's tracker 34° → 44°, inside the 40–60°
  band, and Big's 30° → 47°; "closes out" falls from 39–51 % of the reads to 24–35 %. The rays had put Medium's ceiling at
  about 35°; the narrow arm refracts the crests less than rays assume. Small's own fits slow from 50° to 33° (its breaks
  on the planar face come further out, where the face is steep).
- **It plunges all along the arm.** On the planar 1:23 face the sets' ξb is 0.35–0.66 from the peak to the beach face at
  every size (0.47–0.50 over the arm, 63–87 % at 0.4 or more), where the fan's gentle shallow face made Medium and Small
  spill down the line (0.21–0.27). Small plunges weakly too now.
- **But the waves shrink down the line, as before.** The oblique face spreads them: Medium's sets are 2.3 m faces by the
  peak and 0.9–1.0 m 35–45 m down the arm (2.4 and 1.2 m on main, where the fan ended at 35 m); Big's 2.7 m and 1.7 m.
  The wall the rider races is steep but small by the end of the ride.
- **The starts stay at the peak** (31 of 40, 39 of 44 and 44 of 50 crests within ±10 m of their median, about 10 m upcoast
  of the take-off, as on main), mostly on the arm's end and face. Close-outs off the beach face: Small 0, Medium 0, Big 2 (2 on main): Big's
  biggest sets starting deep on the arm's upcoast end (3.9 and 4.9 m deep, faces 3.1 and 3.9 m), 52 and 58 m within 2 s,
  24–30 m of it upcoast. Big's upcoast runs fall from 24 to 16, their reach from 96 m to 30 m at most.
- **The flanks still close out on the beach** either side after the ride (47–66 % of all onsets on the beach face).
- **Health:** no Froude cap in water, volumes within 0.40 % at Small and Medium and 1.35 % at Big (seed 3's drift, 1.17 %
  on main). The fastest water rises with the plunging (Big 10.1 m/s against 9.7 m/s). Big's seed 1 capped 11 times, none
  in water (under 5 cm deep: the swash).

### The stills (`ride-*.png`)

Each is one crest of seed 1, the same sea on both beds: main on the left, now on the right, seaward up, x growing to the
right, the bed shaded by depth with its 1–6 m contours (the crest line, 1 m, darkest). Dots are the crest's breaks on the
reef, coloured by the time since its first: blue, green at about 7 s, yellow at about 13 s, red at 20 s; grey the beach
face's shore break.

- `ride-medium-146.png` (Medium, t 146 s): on main the patch at the peak, a few breaks down the fan's deep face, then a
  gap until two late breaks by the beach; now one line of breaks from the peak to the beach face, 18.5 s.
- `ride-medium-127.png` (t 127 s): main 4.7 s, x −8…8; now 16.5 s, from the peak 32 m along shore.
- `ride-big-155.png` (Big, t 155 s): on main the set breaks across the fan's 55° deep face in 4 s, a fast section, and
  stops; now it peels down the arm for 16.7 s.

## The wall down the line (`wall-probe.ts`)

Every 0.5 s over Medium, seed 1, 11 periods: each column's steepest unbroken crest over the reef, its height and its top
third's slope. The solver's unbroken faces are gentle until they break (their top thirds 3° at the median, 6° at the 90th
percentile, 11–12° at the 99th, on either bed), so a wall standing 0.6 Hs high and steeper than 8° spans 0–13 m along
shore at any moment on main and 0–7 m now; the advisor's rays give 16–21 m with H/h ≥ 0.6 on every bed. The change
lengthens the ride, not the wall at an instant: as the advisor said, a longer instantaneous wall needs a gentler face
(spilling) or a lower peel angle (a close-out).

## Straight crests (bar 1; `crests.txt`)

PENDING

## Stable for 600 s (bar 4)

PENDING

## Cost (`cost.txt`)

PENDING

## The take-off and the start (bars 6 and 7; `start.txt`)

**The take-off** (`CANYON_TAKE_OFF_DEPTH`, refitted): the line through each size's 90th-percentile start depth in the
take-off's column (x −14 ± 4 m), **1.50 + 1.00 Hs**: 2.40, 2.90 and 3.90 m for Small, Medium and Big, within 0.05 m of the
measured 2.43, 2.85 and 3.91 m. On the planar face the waves start breaking over a wider band across shore than on the fan,
so the nine-in-ten depth is 0.06–0.24 m deeper (2.19, 2.65 and 3.85 m on main).

**The start** (`CANYON_RIDE_LINEUP`): big-start's rule, where the faces become catchable (about 17° over the highest third)
but seaward of where one wave in ten starts breaking; the pooled starts are the size report's (3 × 14) and the probe's
(2 × 12).

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Top-third front, 11 m out (±3 m) | 6.2° (6.5°) | 6.2° (6.6°) | 12.2° (12.3°) |
| Top-third front, 6 m out | 7.3° (8.5°) | 6.9° (7.3°) | 12.1° (12.5°) |
| Top-third front, at the take-off | 10.1° (11.3°) | 7.0° (7.9°) | 13.0° (13.7°) |
| First reaches 17° | 21 m inside (18 m, ±3 m) | 23 m inside (20 m, ±3 m) | 40 m inside (37 m, ±3 m) |
| One wave in ten starts breaking (pooled: 50, 60, 64 waves) | 7.5 m seaward | 4.0 m seaward | 10.0 m seaward |
| Median break | 11.5 m inside | 9.0 m inside | 10.0 m inside |
| **Start** | **11 m** (as before) | **11 m** (as before) | **11 m** (6 m on main) |
| Waves breaking seaward of the start (pooled) | 2 of 50 | 1 of 60 | 6 of 64 (9 of 64 at 6 m out) |

On the planar face the faces stand up later, well inside the take-off (17° 18–40 m inside it; 1–25 m on main), so the
two halves of the rule meet at no size, and the start keeps the rule's priority (the owner's 2026-10-11 "not on top of
the breaking"): 11 m out at every size. Big moves from 6 m to 11 m: one in ten of its waves now starts breaking 10 m
seaward of the take-off, and its faces are as steep 11 m out as 6 m out (12°).

## The beach and the start, per size (bar 7; `layout-numbers.txt`)

Mid tide puts the waterline at z 0. The rider is held within x ±89 (21 m inside each open side) and from z −386.

| | Take-off (x, z), depth | Start, depth | Start to the waterline | To the window's centre; its −x / +x edges | To the rider's −x / +x bounds |
| --- | --- | --- | --- | --- | --- |
| Small, main | (−2, −134.0), 2.14 m | 11 m out, 2.58 m | 145 m | 2 m; 108 / 112 m | 87 / 91 m |
| **Small, now** | **(−14, −130.0), 2.39 m** | **11 m out, 2.87 m** | **141 m** | **14 m; 96 / 124 m** | **75 / 103 m** |
| Medium, main | (−2, −147.5), 2.69 m | 11 m out, 3.17 m | 159 m | 2 m; 108 / 112 m | 87 / 91 m |
| **Medium, now** | **(−14, −141.5), 2.89 m** | **11 m out, 3.37 m** | **153 m** | **14 m; 96 / 124 m** | **75 / 103 m** |
| Big, main | (−2, −173.5), 3.82 m | 6 m out, 4.08 m | 180 m | 2 m; 108 / 112 m | 87 / 91 m |
| **Big, now** | **(−14, −164.5), 3.89 m** | **11 m out, 4.37 m** | **176 m** | **14 m; 96 / 124 m** | **75 / 103 m** |

The peak stays 120 m from the waterline; the ride runs from it down the arm to the beach face 15–40 m from the waterline,
38–53 m along shore. Online spawns lie 4–19 m beyond the start, ±20 m along shore, as before.

## The tube runs (`canyon-tube-runs.patch`)

The take-off's transect changes: along the waves' path from the 6 m foot the face is now one plane at 1:23 to the 1.0 m
crest (0.167 h0), where on the fan it rounded at the 2.2 m hinge (0.367 h0) into 1:31. And it is the same at every column
of the arm, so the down-the-line case on its own transect (`canyon23f54_a38`, the fan's 1:54 at x 18) has no place: its
waves on the planar face are the same transect's smaller ones, and a fourth case of the same slope would only blur the
loft's A0 key. The patch, for `claude/canyon-tube-runs` at `37168cd6` (`git apply --check` clean there):

- `tools/basilisk/run_periodic.sh`: `canyon23_a29`, `canyon23_a38` and `canyon23_a49` become one-slope beds (their
  `:0.3666667:0.0322581` tails dropped; one slope to the flat at 0.167 h0), relabelled x −14; `canyon23f54_a38` removed:

      canyon23_a29:6:0.29:11:0.0434783:0.1666667:56:26.5:41.5:31.5:52.5
      canyon23_a38:6:0.38:14:0.0434783:0.1666667:64:25:40:35:56
      canyon23_a49:6:0.49:14:0.0434783:0.1666667:64:22:37:34:55

  (their domains, switches, ends and windows provisional as before; `run_canyon.sh` re-places them from its scout);
- `canyon_pipeline.py`: `CASES` and the labels (three cases, "x −14 (take-off), planar 1:23"), the report's bed line, and
  the wiring note (one transect, so the loft's slope-and-A0 key holds);
- `run_canyon.sh` and the README: three cases, the planar transect, this README cited.

Not committed to that branch.

## What to ride (the owner)

Ride the Canyon, mid tide, calm, several sets each way, and record; then the same with **`?canyonBed=old`** (main's short
arm on its fan, exactly) to compare.

1. **Medium from the start.** Take off at the peak and go left (toward +x, to your right seen from the beach): does the
   wave keep breaking down the reef all the way to the beach, 15–20 s, instead of a patch at the peak? Is the peel
   makeable (the readout should say "a left" about three times in four)?
2. **The wall.** Down the line the face stays steep and pitching (plunging all along the arm now) but gets smaller, about
   half its height by the end. Does it feel like a wall to race, or does it fade too much?
3. **Big from the new start, 11 m out** (6 m before). Do you still get picked up from there? Then `?startOut=0` (the
   take-off; 14 of 64 waves break seaward of it) and `?startOut=6`. Big now peels at about 47° by the tracker (30° before):
   does it section less, and does the ride run on to the beach?
4. **Small** now plunges weakly on the planar face (it spilled down the fan): too dumpy, or fine?
5. **The crests and the beach.** The crests should still come in straight across the open water either side, and the
   beach is as near (the starts 141–176 m from the waterline). The reef sits 12 m further upcoast; the start is 14 m
   from the window's centre.
6. **The look.** The rock bed follows the new arm (its planar face and the run-on toward the beach).

## Risks

- **The waves fade down the line:** the planar face spreads them more than the fan did; Medium's sets are about 1 m faces
  for the last 20 m of the ride. Steep (ξb 0.5–0.66) but small.
- **The instantaneous wall is short** (0–13 m in the solver at either bed): this lengthens the ride, not the wall at an
  instant.
- **Big's start** moves out to 11 m on faces of 12°; the catch diagnosis found Big's riders left on the crest from 14° faces
  11 m out on the long arm. If they are, `?startOut=6` or `0` is the A/B.
- **Big's close-outs:** 2 in 50, its biggest sets starting deep on the arm's upcoast end, as on main (2 in 48).
- **Rays and solver disagree on this arm;** the solver's numbers are the ones built on. Single-seed sweep rows carry seed
  noise (the 70° arm's tracker read 64° on seed 1 and 50° over three seeds).
- **The beach face share** of onsets stays 47–66 %; the flanks close out on the beach after the ride, as before.
- **Not re-recorded:** the dev bots' track (`server/bots/canyon-medium.bin`) and the surf forecast's Canyon fit
  (`SURF_FORECAST`), as on canyon-layout.
- **`?canyonBed=old`** now means main's short arm; the long arm before it is gone.

## Tests

PENDING
