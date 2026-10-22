# The Canyon's long wave: a planar arm whose break runs into the beach (2026-10-22)

Branch `claude/canyon-long-wave`, from `main` (`bff9a874`, with `7b79f085` merged in: the rock bed). Wave only, no riders
(the owner rides), on the 8 GB M1 with other agents working.

## The complaint and the diagnosis

The owner, on the M4, after canyon-layout's short arm (PR #141): "Canyon with the latest build shows everything fixed:
waves are now going the right direction and the foam is good. But the wave has small progress; the wave itself is not
long. A lot of foam, but no long wave or steep wave." In the video, from the start looking seaward, the crest humps up
by the peak, breaks into a patch of whitewater on the upcoast side, and the breaking runs only a short way. The goal is
the barefoot_surf reel (Jesse Mendes): a long, steep left peeling along a reef. The advisor read it as weak-to-moderate
plunging, ξb about 0.42–0.55, on about 1:22–1:30, 12–16 s.

**Measured on main** (the size report's onsets, 3 seeds × 14 periods a size, re-read by `ride-report.ts`, below):

- **Medium:** half the crests rode 1.4 s or less from their first break, and 13 of 40 rode 10 s or more.
  - The peak's hump closes out at once at the arm's upcoast end: 8–10 m within half a second.
  - The crest breaks on down the arm in sections. A fast run crosses the fan's 55° deep face; then, seconds later, it
    re-breaks by the beach.
  - Counted whatever its peel, Medium's crest keeps breaking somewhere down the arm for 14 s. Almost none of that is a
    peel you can ride.
- **Big:** the sets break across the 55° deep face in 3–5 s, a fast section, and stop.
- **Medium and Big are fast:** the readout says "closes out" 39 % and 46 % of the time.

`ride-medium-155.png` and `ride-big-155.png` (left) show it.

**The water-physics advisor** (consult log, 2026-10-22, "Canyon long wave"), ranked:

1. **Ride time.** With crests arriving square to the shore, a ride lasts about Δz / c0: how far its trail of breaks runs
   across shore, over the crest speed on the 6 m platform (about 7.5 m/s). The 55° deep face ended in the taper past
   the line's end, about 90 m from the beach. So the trail ran only 30–60 m across shore: 4–8 s.
2. **The hump.** The taper's corner and the 1:4 upcoast end focus the swell. A section breaks first at the end, and that
   focus is the hump the owner saw.
3. **The face spreads its waves.** An oblique face spreads them out (K = cos φ / cos α, about 0.64 at Medium). The
   face's waves are smaller than the flanks', whose shore break stands taller than the reef wave.
4. **The wall is intrinsic.** The stretch of crest ahead of the break with H/h ≥ 0.6 is 16–21 m on any of these beds.
   What was missing is how long the wave lasts.
5. **Medium at 40–60° is out of reach by rays.** From a 6 m platform no reef angle gets there (Snell; ten Voorde et al.
   2009: the peel angle peaks at a 66° reef angle). It would need a 4 m approach, where Big breaks.

The advisor's candidates:

- **Advised:** A, running the 15° fan's deep face on into the beach in a 260 m window; A2, A with a softer end for the
  hump; B, a planar 50–52° wedge.
- **Rejected:** a pre-rotating ramp, a curved reef and a steeper face.

**The solver disagreed with the rays on the narrow arm** (the sweep, below):

- **Why.** Rays refract the whole crest onto the arm's contours. The arm is narrower than a wavelength (60–80 m at
  11 s), so the solver's crests turn far less.
- **What it means.** Down a planar arm the solver's waves break much more slowly than the rays say. A rode 2 s at the
  median at Medium. A planar face at 70° ran the break down the arm for 11 s, at a 64° tracker peel (the rays: 35°).

## What changed (`src/wave/Bathymetry.ts`, `CANYON`)

| | Before (main, now `?canyonBed=old`) | Now |
| --- | --- | --- |
| The arm's face | 1:23 below a 2.2 m hinge, then a 15° fan: deep contours at 55°, the shallow face 1:31 at the take-off and 1:54 by x 18 | **one planar face, 1:23 along +z from the 6 m shelf to the 1 m crest line, its contours at 70° all the way** (`fan` 0) |
| Past the line's end on the beach face | the terrace tapered (x 28–40) | **the face runs on until its foot meets the beach face's 6 m contour** (`runOn` 1, `canyonReefEndX`: x 36), then tapers (to x 48) |
| Peak (x, z); line | (−10, −120); 70° | **(−17, −120)**; 70° |
| Take-off x | −2 (8 m downcoast of the peak) | **−9** (8 m downcoast) |
| Footprint (upcoast end to the taper's end) | x −30…40 | **x −37…48** (open water 83 m and 72 m to the window's sides; 80 m and 70 m before) |
| Window; cells | 220 m; 220 × 451 = 99,220 | **240 m; 240 × 451 = 108,240** (+9 %) |
| Tank, beach | zone from z −390; 1:15 | the same |
| Take-off depth (`CANYON_TAKE_OFF_DEPTH`) | 1.14 + 1.12 Hs | **1.50 + 1.00 Hs** (refitted, below) |
| Starts (`CANYON_RIDE_LINEUP`) | 11, 11 and 6 m out | **11, 11 and 11 m** (re-measured, below) |

Unchanged: the arm's crest line, its 1:4 upcoast end, its flat top and lagoon, the platform, the tank and the beach.

**The readout.** `canyonArmAt` and `canyonPeelAt` now reach the reef's end. Past the crest line's end a break counts
only where the reef, not the beach face, makes the bed, so the shore break behind the reef does not read as the wave.

**The rock bed** (`src/scene/water/rockBed.ts`) follows the new arm. It reads `canyonTerraceDepth`, `shelfDepth` and
`shoreSlope`, which all keep their meaning, and its tests now pin points that only one of the two layouts covers.

**`?canyonBed=old`** now returns main's whole layout at `bff9a874`:

- **What it is:** `CANYON_OLD`, canyon-layout's short arm on its fan, in its 220 m window, with its take-off
  (1.14 + 1.12 Hs) and starts (11, 11 and 6 m).
- **The pin:** a test pins it to main's own build, every value exactly: bed depths, window, tank, rider bounds,
  take-offs, starts, grid, curl sizes and the readout's breaker.
- **What is gone:** the long arm this switch rode until now is no longer reachable (it is `CANYON_OLD` at `bff9a874`).

## How it was measured

Each size's own swell (`SWELLS`: Small Hs 0.9 m and Tp 9 s, Medium 1.4 m and 11 s, Big 2.4 m and 14 s), square, s = 150,
mid tide, calm. Main's runs re-read here reproduce canyon-layout's tables line for line, so main's waves have not moved
since. The tools, here unless said:

- **`scripts/canyon-size-report.ts`** (3 seeds × 14 periods, `--stability`): the tracker, the readout every second, each
  crest's start, close-out and upcoast run, the onsets and the health. It now pools seeds run apart (`--from a,b,c`).
- **`ride-report.ts`** (new): each crest's ride along the reef, from the size report's onsets, and how long the crest keeps
  breaking down the reef whatever its peel. A ride runs from the crest's first break toward +x and lasts while:
  - the next break comes within 8 m along shore;
  - it comes no earlier than the last;
  - it peels at 27° or more over 10 m (the readout's close-out line).
- **`ride-map.ts`** (new): one crest's breaks over the bed, coloured by time. These are the stills.
- **`arm-report.ts`** (canyon-layout's, its bins running on to the reef's end): ξb along the arm, and the take-off
  column's start depths.
- **`transect-probe.ts`** and **`analyze.mjs`** (big-start's), with **`pool.mjs`** (canyon-layout's): the faces along the
  take-off's column, and the starts. The probe ran 2 seeds × 12 periods; its starts are pooled with the size report's.
- **`scripts/crest-angle-report.ts`** and **`crest-angle-compare.ts`**: 600 s, seed 1, 64 components, against the Beach.
- **`peel-model.ts`** (new): a quick linear-ray screen, an eikonal on the bed. It ranked the plan shapes as the advisor's
  rays did and, like them, missed the narrow arm's weak refraction. The solver decided.
- **`wall-probe.ts`** (new): the steep, unbroken face standing down the line from the break, read every 0.5 s (below).
- **`layout-numbers.ts`** (canyon-layout's, with the reef's end) and **`step-bench.ts`** (canyon-layout's): the static
  numbers and the CPU step.

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

**What the sweep shows:**

- **The fan loses the break.** Its deep face takes the break away from the line whatever the window. The sets break at
  the end and the peak and seldom carry on down the 55° face.
- **A planar face keeps it.** Its breaking contour stays beside the line. The steeper the line, the longer and slower
  the ride.

**Two finalists**, run at 3 seeds at Medium (peak x −10):

| Arm | Rides: median; ≥ 10 s | Tracker | "Closes out" |
| --- | --- | --- | --- |
| Planar 70° | 13.0 s; 24 of 37 | 50° | — |
| Planar 65° | 8.7 s; 17 of 41 | 38° | 36 % of the time |

The 70° arm won at every bar. On three seeds its peel came back into the 40–60° band, and it keeps the cells.

**Placing it.** It was first built at peak x −22 in the 220 m window, so its footprint, 15 m longer, stayed centred
(3 × 14 a size; `sizes.txt`, `rides.txt`). Its rides matched those below. But its crests failed bar 1 at the −x side
inshore:

- the crests wrapping round its upcoast end came back from that side's mirror as a chevron: Big's p90 was 24° inside
  the take-off (Beach 10°, main 16°), Medium's 19° (Beach 10°, main 11°);
- with only 67–68 m of open water each side.

So the window grew to 240 m and the peak moved to x −17, giving 72–83 m of open water. Every bar below is that
layout's.

## The bars, 3 seeds × 14 periods a size (main → now; `sizes.txt`, `rides.txt`, `arm.txt`)

| Bar | Small (0.9 m, 9 s) | Medium (1.4 m, 11 s) | Big (2.4 m, 14 s) |
| --- | --- | --- | --- |
| **Rides: median duration** | 2.5 s → **10.8 s** | 1.4 s → **9.5 s** | 1.8 s → **9.7 s** |
| **Rides of 10 s or more** | 9 of 36 → **21 of 38** | 13 of 40 → **21 of 43** | 9 of 43 → **23 of 48** |
| **Rides along their breaks: median / 90th** | 12 / 83 m → **54 / 100 m** | 14 / 98 m → **56 / 128 m** | 21 / 77 m → **44 / 138 m** |
| Rides along shore: median / 90th | 9 / 27 m → **18 / 31 m** | 9 / 36 m → **19 / 38 m** | 13 / 37 m → **18 / 45 m** |
| Rides: 75th / 90th duration | 11.8 / 15.3 s → **16.0 / 17.9 s** | 14.1 / 18.8 s → **16.8 / 19.5 s** | 7.8 / 13.4 s → **16.6 / 18.4 s** |
| Peel over the ride (median) | 42° → 48° | 42° → 52° | 30° → 49° |
| Breaking down the reef whatever its peel: median; ≥ 10 s | 13.8 s; 21 of 36 → 12.3 s; 25 of 38 | 14.1 s; 24 of 40 → 14.2 s; 26 of 43 | 5.0 s; 10 of 43 → **15.0 s; 34 of 48** |
| 2. Tracker: clean samples toward +x; median | 25 of 25; 28° → **29 of 30; 38°** | 36 of 36; 34° → **34 of 34; 39°** | 37 of 38; 30° → **31 of 32; 44°** |
| 2. Readout every second: closes out / a left / a right | 51 / 49 / 0 % → **32 / 65 / 3 %** | 39 / 61 / 0 % → **25 / 74 / 1 %** | 46 / 53 / 1 % → **29 / 68 / 2 %** |
| 2. Readout: clean reads toward +x | 208 of 208 → **217 of 224** | 366 of 367 → **365 of 369** | 468 of 485 → **428 of 439** |
| 2. Each crest's own fit along the arm: +x; median | 33 of 33; 50° → **37 of 37; 32°** | 40 of 40; 51° → **40 of 40; 44°** | 32 of 32; 31° → **43 of 43; 46°** |
| 3. Starts within ±10 m of their median (median x) | 32 of 40 (x −7) → **30 of 39 (x −18)** | 41 of 45 (x −11) → **39 of 44 (x −19)** | 46 of 48 (x −14) → **43 of 52 (x −21)** |
| 3. Where the crests start | face 23, end 13, top 3, beach face 1 → **face 19, end 19, top 1** | end 25, face 19, beach face 1 → **end 30, face 14** | end 41, face 7 → **end 37, face 13, shelf 1, top 1** |
| 3. Close-outs (≥ 40 m within 2 s): all; off the beach face | 1; 0 → **0; 0** | 0; 0 → **0; 0** | 2; 2 → **3; 3** |
| 3. Upcoast runs: all (largest reach); off the beach face | 3 (100 m); 2 (29 m) → **0 (7 m); 0** | 2 (12 m); 2 (12 m) → **4 (26 m); 4 (26 m)** | 24 (96 m); 24 (96 m) → **22 (136 m); 20 (39 m)** |
| 3. Onsets on the beach face (the flanks' shore break) | 40 % → 46 % | 64 % → 69 % | 66 % → 69 % |
| 5. ξb of the sets, 5 / 15 / 25 / 35 / 45 m downcoast of the peak | 0.31, 0.33, 0.26, 0.21, — → **0.35, 0.46, 0.52, 0.54, 0.60** | 0.37, 0.41, 0.48, 0.27, — → **0.39, 0.47, 0.55, 0.61, 0.65** | 0.45, 0.49, 0.54, 0.55, — → **0.46, 0.50, 0.54, 0.58, 0.58** |
| 5. The sets' faces there, m | 2.02, 1.43, 0.99, 0.69, — → **1.92, 1.14, 0.83, 0.80, 0.85** | 2.44, 1.84, 1.38, 1.15, — → **2.35, 1.62, 1.15, 0.93, 1.04** | 2.80, 2.36, 1.87, 1.85, — → **2.70, 2.30, 1.94, 1.73, 1.80** |
| 5. ξb of the sets over the whole arm; share ≥ 0.4 | 0.29; 2 % → **0.46; 64 %** | 0.38; 36 % → **0.47; 70 %** | 0.46; 79 % → **0.50; 87 %** |
| 6. Take-off's column: 90th percentile start depth | 2.19 m → **2.39 m** | 2.65 m → **2.86 m** | 3.85 m → **4.00 m** |
| 4. Health: fastest water; Froude caps; volume | 4.5–5.0 m/s; 0; within 0.12 % → **5.7–6.8 m/s; 0; within 0.10 %** | 5.8–7.6 m/s; 0; within 0.38 % → **7.3–8.8 m/s; 0; within 0.39 %** | 8.7–9.7 m/s; 0; within 1.17 % → **10.0–10.6 m/s; 105, none in water; within 1.11 %** |

What they mean:

- **The wave peels down the arm from the peak.**
  - Rides at the median: 9.5–10.8 s now, against 1.4–2.5 s on main.
  - Half of every size's crests ride 10 s or more (a fifth to a third on main). The longest run 18–20 s along
    100–138 m of breaks, from the peak to the beach face.
  - At Small and Medium the crest keeps breaking about as long as on main (12–14 s whatever its peel). On main it
    breaks in sections: the hump closing out, the fast run across the fan, then the re-break by the beach. Now it is one
    peel you can ride.
  - At Big the break also runs three times longer (15 s against 5 s): it no longer crosses the fan in one fast run.
- **It peels at a makeable angle.**
  - The readout says "closes out" 25–32 % of the time, against 39–51 %.
  - The tracker reads Medium 34° → 39° and Big 30° → 44°. Medium sits at the band's edge: 39° on these 3 seeds, 44° and
    50° on the two other 3-seed sets.
  - The rays had put Medium's ceiling at about 35°. The narrow arm refracts the crests less than rays assume.
  - Small's own fits slow from 50° to 32°: on the planar face its breaks come further out, where the face is steep.
- **It plunges all along the arm.**
  - On the planar 1:23 face the sets' ξb is 0.35–0.65 from the peak to the beach face, at every size (0.46–0.50 over the
    whole arm, 64–87 % at 0.4 or more).
  - On main the fan's gentle shallow face made Medium and Small spill down the line (0.21–0.27).
  - Small now plunges weakly too.
- **The waves shrink down the line, as before.**
  - The oblique face spreads them. Medium's sets are 2.35 m faces by the peak and 0.9–1.0 m by 35–45 m down the arm (on
    main 2.44 m and 1.15 m, where the fan ended at 35 m). Big's are 2.7 m and 1.7–1.8 m.
  - So the wall the rider races is steep but small by the end of the ride.
- **The starts stay at the peak,** about 10 m upcoast of the take-off as on main, mostly on the arm's end and face: 30 of
  39, 39 of 44 and 43 of 52 crests start within ±10 m of their median.
- **Big's close-outs off the beach face: 3 of 52** (2 of 48 on main).
  - Two are its biggest sets starting deep on the arm's upcoast end, as on main: 3.6 and 4.9 m deep, 43 and 59 m within
    2 s, 19–29 m of it upcoast.
  - The third is a 1.2 m wave by the beach whose few breaks spread 129 m (x 15).
  - Big's upcoast runs fall from 24 to 20 off the beach face, their reach from 96 m to 39 m at most.
- **The readout's "a right"** is 1–3 % of the time (0–1 % on main). At Small it is 7 reads of 265.
- **The flanks still close out on the beach** either side after the ride: 46–69 % of all onsets are on the beach face.
- **Health.**
  - No Froude cap in water. Volumes stay within 0.10–1.11 %; Big's 1.11 % is seed 3's drift, as main's 1.17 %.
  - The fastest water rises with the plunging (Big 10.6 m/s, against 9.7 m/s).
  - Big's seed 1 capped 105 times, none in water: the swash under 5 cm, where the cap only clips it.

### The stills (`ride-*.png`)

Each still is one crest of seed 1, the same sea on both beds: main on the left, now on the right.

- **Orientation:** seaward is up, and x grows to the right.
- **The bed:** shaded by depth, with its 1–6 m contours. The crest line (1 m) is darkest.
- **The dots:** the crest's breaks on the reef, coloured by the time since its first. Blue, then green at about 7 s,
  yellow at about 13 s, red at 20 s; grey is the beach face's shore break.

The three crests:

- **`ride-medium-155.png` (Medium, t 155 s).** On main: the hump at the peak, a run down the fan's deep face, then a gap
  of 60 m across shore until the crest re-breaks by the beach (the ride ends in the hump, 0.6 s). Now: one line of
  breaks from the peak to the beach face, 19.5 s.
- **`ride-medium-128.png` (t 124–128 s).** Main: 4.7 s, x −8…8. Now: 16.0 s from the peak, 26 m along shore.
- **`ride-big-155.png` (Big, t 155 s).** On main the set breaks across the fan's 55° deep face in 4 s, a fast section,
  and stops. Now it peels down the arm for 17.0 s.

## The wall down the line (`wall-probe.ts`)

Every 0.5 s over Medium, seed 1, 11 periods (the arm as first built, peak x −22 in the 220 m window, against main), the
probe reads each column's steepest unbroken crest over the reef: its height and the slope of its top third.

- **The solver's faces are gentle until they break.** Their top thirds stand 3° at the median, 6° at the 90th
  percentile and 11–12° at the 99th, on either bed.
- **So the instantaneous wall is short on both.** A wall 0.6 Hs high and steeper than 8° spans 0–13 m along shore at any
  moment on main and 0–7 m now. The advisor's rays give 16–21 m with H/h ≥ 0.6 on every bed.
- **The change lengthens the ride, not the wall at an instant.** As the advisor said, a longer instantaneous wall needs
  a gentler face (spilling) or a lower peel angle (a close-out).

## Straight crests (bar 1; `crests.txt`)

The extended bar, as on canyon-layout: seed 1, 600 s, 64 components. It reads crest lines every second, at stations
every 15 m along shore and 12 m inside each open side. Each run is set against the Beach (Medium, the 2026-10-05
reference, reproduced exactly).

- **Edge chevron:** twice the angle at the edge station, because the edge band mirrors the water past each open side.
- **Two-sided:** a crest whose outer thirds lean opposite ways, each past the Beach's 90th percentile.
- **Main's numbers** are canyon-layout's (its "now"), which main reproduces.

| Band (Beach p90 \|angle\|; its chevron 2 × p90) | Run | Open water −x / +x: p50 / p90 ° | Over the arm: p50 / p90 ° | Edge chevron −x / +x: p50 / p90 ° | Two-sided |
| --- | --- | --- | --- | --- | --- |
| seaward (6.2°; 2.6°) | Medium, main | 2.5 / 6.2 · 1.6 / 4.5 | 2.1 / 6.8 | 3.5 / 8.8 · 2.5 / 6.5 | 3 of 746 |
| | **Medium, now** | **2.6 / 6.3 · 1.7 / 4.7** | 2.3 / 7.1 | **3.6 / 9.0 · 2.3 / 6.7** | **4 of 788** |
| | Big, main | 2.1 / 6.0 · 1.6 / 3.9 | 2.1 / 6.6 | 3.0 / 9.4 · 2.4 / 5.8 | 0 of 639 |
| | **Big, now** | **2.3 / 6.5 · 1.6 / 4.1** | 2.2 / 6.7 | **3.2 / 9.9 · 2.2 / 5.6** | **0 of 663** |
| | Small, main | 2.7 / 7.0 · 1.4 / 4.5 | 2.2 / 6.7 | 4.1 / 10.7 · 2.2 / 6.9 | 0 of 835 |
| | **Small, now** | **2.6 / 6.9 · 1.5 / 4.8** | 2.3 / 7.0 | **4.0 / 10.5 · 2.3 / 6.8** | **1 of 859** |
| take-off (6.7°; 8.4°) | Medium, main | 2.2 / 7.6 · 1.5 / 4.1 | 4.2 / 12.8 | 2.8 / 7.7 · 2.2 / 7.1 | 0 of 90 |
| | **Medium, now** | **2.2 / 7.5 · 1.5 / 4.5** | 4.7 / 13.7 | **2.8 / 7.0 · 1.8 / 6.5** | **0 of 81** |
| | Big, main | 2.4 / 8.0 · 1.7 / 4.7 | 3.5 / 9.7 | 3.1 / 9.8 · 2.9 / 7.4 | 0 of 117 |
| | **Big, now** | **2.4 / 7.1 · 1.7 / 5.5** | 4.0 / 11.4 | **3.5 / 9.9 · 2.4 / 8.2** | **0 of 115** |
| | Small, main | 2.9 / 8.8 · 1.6 / 4.5 | 6.9 / 16.7 | 4.3 / 9.7 · 2.8 / 7.5 | 0 of 65 |
| | **Small, now** | **2.9 / 8.4 · 1.8 / 5.1** | 5.6 / 15.6 | **3.9 / 8.8 · 2.2 / 7.6** | **0 of 58** |
| inside (8.9°; 10.4°) | Medium, main | 3.3 / 14.1 · 2.1 / 6.7 | 11.5 / 26.4 | 3.4 / 10.5 · 4.3 / 11.9 | 0 of 67 |
| | **Medium, now** | **3.6 / 16.5 · 2.6 / 8.1** | 7.7 / 24.4 | **3.6 / 14.7 · 3.3 / 11.3** | **0 of 80** |
| | Big, main | 3.7 / 12.0 · 2.2 / 5.9 | 8.2 / 21.7 | 4.9 / 15.5 · 3.2 / 8.5 | 0 of 202 |
| | **Big, now** | **4.1 / 15.1 · 2.1 / 6.3** | 6.1 / 16.8 | **4.8 / 17.3 · 2.8 / 7.7** | **0 of 183** |
| | Small, main | 2.6 / 9.5 · 2.4 / 5.9 | 14.4 / 30.5 | 3.5 / 9.9 · 4.7 / 11.9 | 0 of 8 |
| | **Small, now** | **2.9 / 12.2 · 2.5 / 6.8** | 9.8 / 29.1 | **3.3 / 9.7 · 3.4 / 9.0** | **0 of 10** |
| inner (8.7°; 11.5°) | Medium, main | 4.0 / 13.2 · 3.7 / 12.1 | 13.7 / 33.9 | 4.4 / 11.5 · 5.3 / 12.3 | 2 of 24 |
| | **Medium, now** | **4.6 / 13.4 · 2.6 / 8.1** | 10.8 / 28.2 | **4.2 / 13.5 · 4.4 / 12.4** | **0 of 19** |
| | Big, main | 5.3 / 14.2 · 4.1 / 12.2 | 10.4 / 28.0 | 6.2 / 17.4 · 5.2 / 13.7 | 3 of 116 |
| | **Big, now** | **5.0 / 12.8 · 3.3 / 9.3** | 7.9 / 20.3 | **6.2 / 18.6 · 4.4 / 13.7** | **0 of 192** |
| | Small, main | 2.8 / 9.4 · 2.7 / 8.4 | 16.5 / 33.9 | 3.1 / 7.3 · 3.4 / 9.1 | 0 of 6 |
| | **Small, now** | **3.0 / 8.6 · 2.1 / 6.8** | 12.3 / 29.9 | **2.5 / 8.7 · 3.1 / 7.9** | **0 of 1** |

What the table says:

- **No crest comes from two sides.** Inshore, from the take-off line to the beach, no crest is two-sided at any size:
  0 of 19–192 a band (main had 2 and 3 in the inner band at Medium and Big). Seaward of the arm the count is 0–4 of
  660–860, as on main (0–3).
- **The open water and the take-off line are as straight as on main.** Seaward of the take-off and by it, both sides
  read within the Beach's spread or near it (p90 4.1–8.4° against 6.2–6.7°), and the edge chevrons are within 1° of
  main's.
- **One regression, on the −x side inshore,** round the arm's upcoast end:
  - Medium's −x edge chevron is p90 14.7° inside the take-off and 13.5° near the beach. Main's are 10.5° and 11.5°, the
    Beach's 10.4° and 11.5°.
  - Big's is 17.3° and 18.6°, against main's 15.5° and 17.4°.
  - The open water there reads p90 15–17° against main's 12–14°.
  - In the 220 m window this was much worse (Medium 19.1°, Big 23.7°). Widening to 240 m brought most of it back.
  - A 260 m window, or the peak a few metres further downcoast, would likely close the rest, at more cells.
- **Over the arm the crests bend less than on main** (p90 17–29° inshore against 22–34°): the planar face wraps them
  less than the fan did.

## Stable for 600 s (bar 4)

From the crest runs, the game's own sea (seed 1, 600 s, 64 components). The fastest water is |q|/h where h > 5 cm,
read every 10 steps.

| | Small: main → now | Medium: main → now | Big: main → now | Beach, Medium |
| --- | --- | --- | --- | --- |
| Fastest water | 5.10 → 6.53 m/s | 6.65 → 9.34 m/s | 8.59 → 10.55 m/s | 3.29 m/s |
| Froude caps (in water) | 0 (0) → 0 (0) | 0 (0) → 0 (0) | 2 (0) → 9 (0) | 0 (0) |
| Volume over 600 s | 0.16 → 0.16 % | 0.34 → 0.29 % | −0.10 → −0.07 % | 0.88 % |
| Finite | yes | yes | yes | yes |

The fastest water rises 1.4–2.7 m/s with the plunging along the arm and its bores running into the beach. Big's 9 caps
were all in water under 5 cm deep.

## Cost (`cost.txt`)

The whole `SurfZoneSimulation.step`, Medium and Big: the game's sea (64 components), stage 2 on the CPU, 300 steps
after spin-up on this M1. Each pair ran twice, alternating; the load average was 1.3–3.8.

| | Medium: main → now | Big: main → now |
| --- | --- | --- |
| Cells | 220 × 451 = 99,220 → **240 × 451 = 108,240** (+9.1 %) | the same |
| CPU step, p50, both runs | 43.0, 43.1 → **47.8, 46.8 ms** (+9 %) | 44.1, 43.5 → **48.5, 47.3 ms** (+9 %) |
| Spin-up on the CPU | 22 s → 24 s | 52 s → 54–55 s |

The step costs what the cells do: 0.43–0.45 µs a cell on both. Nothing on the GPU tier changes but the grid's width
(240 against 220 columns).

## The take-off and the start (bars 6 and 7; `start.txt`)

**The take-off** (`CANYON_TAKE_OFF_DEPTH`, refitted): the line through each size's 90th-percentile start depth in the
take-off's column (its x ± 4 m), **1.50 + 1.00 Hs**: 2.40, 2.90 and 3.90 m for Small, Medium and Big.

- **The fit:** within 0.05 m of the arm's measured 2.43, 2.85 and 3.91 m, in the 220 m window it was built in.
- **The final window:** in the 240 m window the depths are 2.39, 2.86 and 4.00 m, within 0.1 m.
- **Why deeper than main:** on the planar face the waves start breaking over a wider band across shore than on the
  fan, so the nine-in-ten depth is 0.2 m deeper (main: 2.19, 2.65 and 3.85 m).

**The start** (`CANYON_RIDE_LINEUP`) follows big-start's rule: start where the faces become catchable (about 17° over
the highest third), but seaward of where one wave in ten starts breaking. The starts are pooled from the size report
(3 × 14, the 240 m window) and the probe (2 × 12).

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Top-third front, 11 m out (±3 m) | 6.2° (6.5°) | 6.2° (6.6°) | 12.2° (12.3°) |
| Top-third front, 6 m out | 7.3° (8.5°) | 6.9° (7.3°) | 12.1° (12.5°) |
| Top-third front, at the take-off | 10.1° (11.3°) | 7.0° (7.9°) | 13.0° (13.7°) |
| First reaches 17° | 21 m inside (18 m, ±3 m) | 23 m inside (20 m, ±3 m) | 40 m inside (37 m, ±3 m) |
| One wave in ten starts breaking (pooled: 50, 63, 66 waves) | 9.5 m seaward | 6.0 m seaward | 10.0 m seaward |
| Median break | 11.5 m inside | 10.0 m inside | 10.0 m inside |
| **Start** | **11 m** (as before) | **11 m** (as before) | **11 m** (6 m on main) |
| Waves breaking seaward of the start (pooled) | 3 of 50 | 1 of 63 | 6 of 66 (8 of 66 at 6 m out) |

- **The faces stand up later.** On the planar face they reach 17° only 18–40 m inside the take-off (1–25 m on main).
  So the rule's two halves meet at no size.
- **The rule's priority decides:** the owner's 2026-10-11 "not on top of the breaking". Every size starts 11 m out.
- **Big moves from 6 m to 11 m.** One in ten of its waves now starts breaking 10 m seaward of the take-off, and its faces
  are as steep 11 m out as 6 m out (12°).

## The beach and the start, per size (bar 7; `layout-numbers.txt`)

Mid tide puts the waterline at z 0. The rider is held within x ±99 now (±89 on main), 21 m inside each open side, and
from z −386.

| | Take-off (x, z), depth | Start, depth | Start to the waterline | To the window's centre; its −x / +x edges | To the rider's −x / +x bounds |
| --- | --- | --- | --- | --- | --- |
| Small, main | (−2, −134.0), 2.14 m | 11 m out, 2.58 m | 145 m | 2 m; 108 / 112 m | 87 / 91 m |
| **Small, now** | **(−9, −130.0), 2.39 m** | **11 m out, 2.87 m** | **141 m** | **9 m; 111 / 129 m** | **90 / 108 m** |
| Medium, main | (−2, −147.5), 2.69 m | 11 m out, 3.17 m | 159 m | 2 m; 108 / 112 m | 87 / 91 m |
| **Medium, now** | **(−9, −141.5), 2.89 m** | **11 m out, 3.37 m** | **153 m** | **9 m; 111 / 129 m** | **90 / 108 m** |
| Big, main | (−2, −173.5), 3.82 m | 6 m out, 4.08 m | 180 m | 2 m; 108 / 112 m | 87 / 91 m |
| **Big, now** | **(−9, −164.5), 3.89 m** | **11 m out, 4.37 m** | **176 m** | **9 m; 111 / 129 m** | **90 / 108 m** |

The peak stays 120 m from the waterline. The ride runs from it down the arm to the beach face, 20–45 m from the
waterline and 38–53 m along shore. Online spawns lie 4–19 m beyond the start, ±20 m along shore, as before.

## The tube runs (`canyon-tube-runs.patch`)

The take-off's transect changes, along the waves' path from the 6 m foot:

- **Before:** the face rounded at the 2.2 m hinge (0.367 h0) into a 1:31 fan.
- **Now:** it is one plane at 1:23 to the 1.0 m crest (0.167 h0).
- **Down the line:** the transect is now the same at every column of the arm. So the down-the-line case on its own
  transect (`canyon23f54_a38`, on the fan's 1:54 at x 18) has no place: its waves are this transect's smaller ones, and
  a fourth case of the same slope would only blur the loft's A0 key.

The patch is for `claude/canyon-tube-runs` at `37168cd6`. `git apply --check` is clean there.

- **`tools/basilisk/run_periodic.sh`:**
  - `canyon23_a29`, `canyon23_a38` and `canyon23_a49` become one-slope beds, relabelled x −9 (the take-off, 8 m
    downcoast of the peak): their `:0.3666667:0.0322581` tails are dropped, giving one slope to the flat at 0.167 h0;
  - `canyon23f54_a38` is removed;
  - their domains, switches, ends and windows stay provisional; `run_canyon.sh` re-places them from its scout.

      canyon23_a29:6:0.29:11:0.0434783:0.1666667:56:26.5:41.5:31.5:52.5
      canyon23_a38:6:0.38:14:0.0434783:0.1666667:64:25:40:35:56
      canyon23_a49:6:0.49:14:0.0434783:0.1666667:64:22:37:34:55

- **`canyon_pipeline.py`:** `CASES` and the labels (three cases, "planar 1:23"), the report's bed line, and the wiring
  note (one transect, so the loft's slope-and-A0 key holds).
- **`run_canyon.sh` and the README:** three cases, the planar transect, this README cited.

Not committed to that branch.

## What to ride (the owner)

Ride the Canyon, mid tide, calm, several sets each way, and record. Then the same with **`?canyonBed=old`** (main's
short arm on its fan, exactly) to compare.

1. **Medium from the start.**
   - Take off at the peak and go left: toward +x, to your right seen from the beach.
   - Does the wave keep breaking down the reef to the beach for 15–20 s, rather than a patch at the peak?
   - Is the peel makeable? The readout should say "a left" about three times in four.
2. **The wall.** Down the line the face stays steep and pitching (it plunges all along the arm now) but gets smaller,
   about half its height by the end. Does it feel like a wall to race, or does it fade too much?
3. **Big from the new start, 11 m out** (6 m before).
   - Do you still get picked up from there? Then try `?startOut=0` (the take-off; 14 of 66 waves break seaward of it)
     and `?startOut=6`.
   - Big now peels at about 44° by the tracker (30° before). Does it section less, and does the ride run on to the
     beach?
4. **Small** now plunges weakly on the planar face (it spilled down the fan). Too dumpy, or fine?
5. **The crests.**
   - They should still come in straight across the open water either side.
   - Watch the upcoast side (−x) near the beach: the crests wrapping round the arm's end lean a little more there than
     on main.
   - The beach is as near: the starts are 141–176 m from the waterline. The reef sits 7 m further upcoast.
6. **The look.** The rock bed follows the new arm: its planar face, and the run-on toward the beach.

## Risks

- **The waves fade down the line.** The planar face spreads them more than the fan did. Medium's sets are about 1 m
  faces for the last 20 m of the ride: steep (ξb 0.55–0.65) but small.
- **The instantaneous wall is short** (0–13 m in the solver, on either bed). This change lengthens the ride, not the
  wall at an instant.
- **Medium's peel sits at the band's edge.** The tracker reads 39–50° over three 3-seed sets; the advisor's rays put a
  6 m platform's ceiling below 40°.
- **The −x side inshore leans more than on main.** The edge chevron p90 is 14.7° at Medium and 17.3° at Big inside the
  take-off (main 10.5° and 15.5°; the Beach 10.4°). No crest is two-sided. A wider window would cost more cells.
- **Big's start** moves out to 11 m on 12° faces. The catch diagnosis found riders left on the crest from 14° faces 11 m
  out on the long arm. If they are, `?startOut=6` or `?startOut=0` is the A/B.
- **Big's close-outs:** 3 in 52 (2 in 48 on main). Two are its biggest sets starting deep on the upcoast end, as on
  main.
- **The readout says "a right"** 1–3 % of the time (0–1 % on main).
- **Cost:** +9 % cells and CPU step (the 240 m window).
- **Rays and solver disagree on this arm.** The solver's numbers are the ones built on. Single-seed sweep rows carry seed
  noise: the 70° arm's tracker read 64° on seed 1 and 50° over three seeds.
- **The flanks' shore break** is still 46–69 % of all onsets: the flanks close out on the beach after the ride, as before.
- **Not re-recorded,** as on canyon-layout: the dev bots' track (`server/bots/canyon-medium.bin`) and the surf
  forecast's Canyon fit (`SURF_FORECAST`).
- **`?canyonBed=old`** now means main's short arm. The long arm before it is gone.

## Tests

On this branch (2026-10-22, the M1), per the owner's policy, no rider sessions:

- `npx tsc --noEmit -p .`: no errors.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`:
  300 files passed (26 skipped); 2,836 tests passed, 18 expected failures, 30 skipped.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts -t "[Cc]anyon"`: 13 passed (463 s).

Changed, with provenance in each:

- **The bed's tests** (`Bathymetry.test.ts`): the planar face running into the beach face; the footprint's open water; the
  run-on's breaks counted only off the beach face; the reef's end clear of both edges' levelling; the old layout's peel.
- **The old layout's pin** (`SurfZoneSimulation.test.ts`): main's values at `bff9a874`, every one exact.
- **The take-off's 90th-percentile depths** and the planar arm's take-offs.
- **The starts:** Big 11 m out, 176 m from the waterline. Two tests in `OnlinePlay.test.ts` and `PhysicalMode.test.ts`
  had assumed Big started nearer than 11 m; they now use the old layout's 6 m.
- **The rock bed's cover** (`rockBed.test.ts`): points that only one of the two layouts covers.
- **The roller's points over the arm**, and the shoulder test's band:
  - the band now runs from 15 m seaward of the take-off line to 40 m inshore of it;
  - on the planar arm the waves down the line break nearer its crest line, so the old ±15 m band held 13 fronts in 30 s
    at Medium, against 90 on the fan;
  - with the wider band, both sizes pass: at least 40 and 15 samples, foam at most 0.02.
