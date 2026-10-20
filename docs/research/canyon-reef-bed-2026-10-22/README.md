# The Canyon's reef bed: plunging sets like the owner's reel (2026-10-22)

The owner approved the plan on 2026-10-22 ("all recommended"). Branch `claude/canyon-reef-bed`, from `main` (`fade7dd2`).

## The target and the change

The water-physics advisor read the owner's reference reel (Jesse Mendes, barefoot_surf `DVbYA9hgsuB`; the consult log,
2026-10-22): a weak-to-moderate **plunging left** on reef, ξb about 0.42–0.55 (Mead & Black "Medium/high" to "High"), on
about 1:22–1:30 along the wave's path, 12–16 s, faces 1.5–2.2 m (about the Canyon's Medium), its shoulder steep along the
line.

The Canyon spilled at every size, and more softly down the line: the fan's shallow face takes over there, 1:36 at x −30
to 1:95 by x 50 at Medium's breaking depth. The advisor's item 1, built here:

- `CANYON.pathSlope` 1/30 → **1/23**, `CANYON.hingeDepth` 2.8 → **2.2 m** (`src/wave/Bathymetry.ts`). The 15° fan, the 70°
  line, the platform, the arm's end, the tank and the trough's 2 m are unchanged; behind the line the top still falls at
  `pathSlope` to the trough, so now at 1:23 (as the advisor's slope script modelled it).
- The drawn curl's ψ clamp runs to 1:23 (`SPILLING_CURL.psi`, `src/wave/SpillingCurl.ts`), look only (Q24).
- `CANYON_TAKE_OFF_DEPTH` and `CANYON_RIDE_LINEUP` re-measured (`src/wave/SurfZoneSimulation.ts`).
- The Canyon stays in `SPILLING_SPOTS`: `throwLip` reads the contour-normal slope, about 3× the path slope on the 70° arm,
  so jets would fire on the gentle fan too. The swept barrel is the next step (below).

Every other spot is byte-identical: only `CANYON`'s two values, the Canyon's take-off and start, and the curl's clamp (drawn
at spilling spots, the Canyon alone) change.

## How it was measured

Wave only, no riders (the owner's rule), on the 8 GB M1, one heavy job at a time. Each size's own swell (`SWELLS`: Small Hs
0.9 m and Tp 9 s, Medium 1.4 m and 11 s, Big 2.4 m and 14 s, given at the old 5 m edge), square, s = 150, tide 0, calm.

- **`scripts/canyon-size-report.ts`** (3 seeds × 14 periods per size, `--stability`): the tracker once a period, the readout
  replayed every second, each crest's start, close-out, upcoast run and own fit, where the onsets lie, and each seed's
  health. The sweep ran it on the old bed's build with `--canyon pathSlope=…,hingeDepth=…`, so today's bed and every
  candidate ran the same code.
- **`arm-report.ts`** (new, here): re-reads a size report's onsets for the breaker type along the arm and the take-off's
  column. Per onset on the arm's face or end, ξb = tan β / √(Hb / L0): tan β the bed's slope along +z across the onset's
  still depth ± 0.4 m (as the advisor's `canyon_slope.py`), L0 = g Tp² / 2π, and Hb either the onset's measured face
  (crest to trough, **ξb**) or the advisor's 0.78 h (**ξγ**). The solver's onsets come at H/h 0.4–0.7, so ξb reads higher
  than ξγ. Binned 20 m along shore, for all onsets and for **the sets**, the top third by face in each bin. The take-off's
  column (x −30 ± 4 m): each wave's most seaward onset, onsets under 0.35 Tp apart being one wave (big-start's
  `analyze.mjs`); the take-off is fitted to the 90th percentile of those start depths, as on 2026-10-11.
- **`slope-table.ts`** (new, here): the bed alone, its slope along +z at each size's breaking depths along the arm.
- **`scripts/crest-angle-report.ts`** and **`crest-angle-compare.ts`**, 600 s against the Beach (bar 1).
- **`docs/research/big-start-2026-10-22/transect-probe.ts`** and **`analyze.mjs`**, 2 seeds × 12 periods per size, for the
  start (bar 6).

Every number below is wave-only and from this branch's runs. The old bed was re-run with the same tools rather than taken
from the 2026-10-09 tables.

## The sweep (1 seed × 8 periods)

All in the advised range but E and F, which probe below it. Same sea (seed 1) on every bed. "Readout" is the reads every
second: closes out / a left / a right; "clean +x" is the clean reads toward +x. ξb and ξγ are the whole arm's medians for
the sets.

| Bed | Medium: tracker +x, angle | Medium: readout; clean +x | Medium sets ξb / ξγ | Big: tracker +x, angle | Big: readout; close-outs | Big sets ξb / ξγ | Small sets ξb |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Today, 1:30 below 2.8 m | 8 of 8, 33° | 21/78/1 %; 64 of 65 | 0.21 / 0.17 | 8 of 8, 38° | 15/84/1 %; 0 | 0.38 / 0.33 | 0.18 |
| **A, 1:23 below 2.2 m** | 6 of 8, 30° | 42/48/10 %; 61 of 70 | 0.18 / 0.15 | 8 of 8, 55° | 12/88/0 %; 0 | **0.56 / 0.44** | 0.15 |
| B, 1:24 below 2.1 m | 5 of 7, 29° | 29/62/9 %; 57 of 73 | 0.17 / 0.14 | 7 of 7, 53° | 15/85/0 %; 0 | 0.55 / 0.43 | — |
| C, 1:25 below 2.2 m | 6 of 8, 47° | 22/66/12 %; 63 of 72 | 0.18 / 0.15 | 8 of 8, 50° | 18/82/0 %; 1 | 0.51 / 0.40 | — |
| D, 1:23 below 2.0 m | 6 of 7, 33° | 22/68/10 %; 65 of 72 | 0.16 / 0.14 | 7 of 7, 53° | 19/81/0 %; 0 | 0.58 / 0.44 | 0.14 |
| F, 1:24 below 1.8 m | 7 of 8, 47° | 25/61/14 %; 55 of 65 | 0.19 / 0.15 | — | — | — | — |
| E, 1:24 below 1.6 m | 7 of 7, 34° | 48/52/0 %; 57 of 65 | 0.23 / 0.18 | — | — | — | 0.12 |

- **Big** plunges weakly on every candidate: its sets break 3–4 m deep, below the hinge, on the steep face all along the
  arm. The steeper the face, the higher ξ: A and D lead.
- **Medium** reads "a right" 9–14 % of the time on every candidate but E, against 1 % on the old bed. Traced (the tracker
  replayed at each such read): the shore break upcoast of the arm in the first seconds of a record (x −54…−39, z −26…−36),
  and short stretches of the fan down the line (x 18–34) breaking within a second of each other with a slight −x trend.
  The fan above the hinge is gentler on every candidate than on the old bed (the hinge's 1.2 m over the same widening), so
  its breaks are more sensitive to each crest's height along shore. A keeps it least gentle: the steepest face (the hinge
  line closest to the break line) and the deepest hinge.
- **Medium's waves down the line are small.** On one seed most of them break on the fan on every candidate, however
  shallow the hinge (E's 1.6 m too): by x 10 they are 0.8–1.1 m high. The 3 × 14 runs below, with more and bigger sets,
  put A's Medium sets at the hinge down to x 30 ("Why Medium's sets fade down the line").
- **A was kept**: the steepest face and deepest hinge in range, so Big's sets plunge most and the fan stays least gentle.

## Why Medium's sets fade down the line

The waves reaching the arm's downcoast stretch are smaller than those at the peak, on either bed. The fan's deep face runs
at 55° to the shore, so the bed shoals toward −x along every row: rays climbing it turn toward the peak (`rays.ts`, linear
rays at 11 s, square). Their concentration where each column first reaches a depth:

| Depth | x −30 | x −10 | x 10 | x 30 | x 50 |
| --- | --- | --- | --- | --- | --- |
| 3.5 m: old bed / reef bed | 1.11 / 1.02 | 0.71 / 0.71 | 0.71 / 0.71 | 0.71 / 0.71 | 0.84 / 0.71 |
| 2.6 m | 1.59 / 1.40 | 0.63 / 0.64 | 0.63 / 0.64 | 0.64 / 0.64 | 0.71 / 0.81 |
| 2.2 m | 2.02 / 1.76 | 0.59 / 0.61 | 0.59 / 0.60 | 0.60 / 0.61 | 0.03 / 0.78 |

Down the line the rays spread to about 0.6 of the open sea's, so the heights there fall to about 0.8 of what they would be
(√0.6), while the peak gathers 1.4–2 times. In the solver the Medium faces at onset are 2.1–2.3 m by the peak and 1.0–1.3 m
from x −10 on (the sets, below). Big's sets still reach the steep face all along the arm (they break 3–4 m deep); Medium's
reach the hinge, where the face rounds from 1:23 into the fan, and by x 50 only the fan.

So **at Medium the reel's plunge holds by the peak and fades down the line**: ξb about 0.4 from the peak to x −10, 0.3–0.4
to x 30, and spilling by x 50 (the tables below). Holding Medium's plunge all the way would take keeping the downcoast
waves' height (less oblique deep contours, which changes the peel) or a hinge so shallow that the fan all but goes, which
brings back mid-arm starts (the planar face's) and plunges Small. Both are outside the approved plan; they are the
advisor's to weigh with the swept barrel.

## The drawn lip (look only)

The owner's call (Q24): let Pick & Feddersen size the curl on the new slope. `SPILLING_CURL.psi` now runs from 1:50 to
**1:23** under H0/h0 0.28 (it ended at 1:30). Each column's curl takes the bed's gradient along +z across its breaker depth
± 2.5 m (unchanged), so the curl grows where the crest climbs the steep face:

| | Old span (1:30 cap) | Reef bed (1:23 cap) |
| --- | --- | --- |
| Curl height, Medium, along the arm | 0.23–0.33 H | 0.30–0.40 H (0.40 H from x −51 to −31, 0.30 H by x 60) |
| Curl height, Big, along the arm | 0.23–0.33 H | 0.33–0.40 H |
| Lip thickness | 0.052–0.06 H | 0.052–0.084 H |
| Where the lip lands, ahead of the crest | 0.60 H | 0.75 H (`LANDING_SHARE`: the span's far end, the coordinator's round-2 ruling) |
| At Big (H 2.5 m) | 0.58–0.83 m high, landing 1.5 m ahead, 0.13–0.15 m thick | 0.83–0.99 m high, landing 1.9 m ahead, 0.15–0.21 m thick |

At 1:23 the overturn is Pick & Feddersen's 0.275 H² void, 1.0 H long, tilted 41°. Small's curl stays 0.23 H down the line
(its gradient there is 1:58–1:130), 0.40 H by the peak. Nothing felt changes.

## The bars, 3 seeds × 14 periods per size (old bed → reef bed)

The old bed re-run here reproduces the 2026-10-09 tables exactly (canyon-spilling README §1), so nothing else in the code
moved its waves since.

| Bar | Small (0.9 m, 9 s) | Medium (1.4 m, 11 s) | Big (2.4 m, 14 s) |
| --- | --- | --- | --- |
| 2. Tracker, clean samples toward +x; median peel | 29 of 30; 29° → **32 of 34 (94 %); 28°** | 35 of 35; 30° → **32 of 34 (94 %); 28°** | 40 of 40; 31° → **40 of 41 (98 %); 36°** |
| 2. Readout every second: closes out / a left / a right | 70 / 30 / 1 % → **50 / 47 / 2 %** | 44 / 55 / 1 % → **57 / 40 / 3 %** | 41 / 59 / 0 % → **31 / 68 / 1 %** |
| 2. Readout: clean reads toward +x | 241 of 247 (98 %) → **258 of 271 (95 %)** | 355 of 362 (98 %) → **345 of 369 (93 %)** | 523 of 525 → **517 of 521 (99 %)** |
| 2. Each crest's own fit along the arm: +x; median | 35 of 36; 40° → **34 of 34; 37°** | 45 of 45; 44° → **40 of 40; 43°** | 39 of 39; 42° → **36 of 37; 40°** |
| 3. Starts within ±10 m of their median (median x) | 29 of 40 (x −33) → **32 of 43 (x −36)** | 41 of 50 (x −37) → **39 of 46 (x −39)** | 43 of 49 (x −43) → **44 of 50 (x −42)** |
| 3. Where the crests start | arm face 32, end 6, top 2 → **face 29, end 7, top 4, beach face 3** | face 28, end 16, top 3, platform 2, beach face 1 → **end 22, face 21, beach face 2, top 1** | end 38, face 9, beach face 1, platform 1 → **end 35, face 13, beach face 2** |
| 3. Close-outs (≥ 40 m within 2 s) | 0 → **0** | 1 → **1** (both a grouping in the +x edge strip) | 1 → **0** |
| 3. Crests also running upcoast (largest real reach) | 5 (9 m) → **0 (7 m)** | 8 → **4** (14 m) | 19 (26 m) → **22 (29 m)** |
| 3. Onsets on the platform | 0 % → **0.2 %** (+x edge strip) | 0.8 % → **1.0 %** (+x edge strip) | 5.3 % → **7.2 %**: edge strips 5.3 → 6.2 %, mid-arm 0 → 1.0 % (below) |
| 5. ξb of the sets along the arm (x −30, −10, 10, 30, 50) | 0.25, 0.23, 0.18, 0.15, 0.14 → **0.32, 0.24, 0.16, 0.13, 0.12** | 0.27, 0.26, 0.21, 0.20, 0.16 → **0.38, 0.42, 0.34, 0.41, 0.19** | 0.34, 0.43, 0.44, 0.43, 0.43 → **0.44, 0.56, 0.57, 0.59, 0.59** |
| 5. ξγ (Hb = 0.78 h) of the sets, same places | 0.26, 0.19, 0.14, 0.11, 0.10 → **0.33, 0.18, 0.13, 0.11, 0.09** | 0.30, 0.24, 0.18, 0.15, 0.12 → **0.41, 0.35, 0.27, 0.33, 0.14** | 0.35, 0.32, 0.31, 0.31, 0.33 → **0.45, 0.42, 0.41, 0.43, 0.44** |
| 5. Sets' depth and slope along +z there | 1.7–1.9 m on 1:35–1:90 → **1.7–2.0 m on 1:27–1:98** | 2.3–2.7 m on 1:32–1:90 → **2.2–2.5 m on 1:23–1:74** | 3.5–4.4 m on 1:30 → **3.5–4.3 m on 1:23** |
| 6. Take-off's column: 90th percentile start depth | 2.26 m → **2.23 m** | 2.65 m → **2.69 m** | 4.07 m → **3.82 m** |
| 4. Health over the 3 seeds: fastest water; Froude caps; volume | 4.0–4.8 m/s; 0; within 0.16 % → **4.5–5.1 m/s; 0; within 0.18 %** | 5.4–7.0 m/s; 0; within 0.40 % → **6.0–8.1 m/s; 0; within 0.40 %** | 8.4–8.5 m/s; 0; within 1.10 % → **8.3–8.8 m/s; 0; within 0.99 %** |

What they mean, size by size:

- **Big plunges weakly all along the arm**, as the reel: its sets break 3.5–4.3 m deep on the 1:23 face, ξγ 0.41–0.45 and
  ξb 0.44–0.59 (Mead & Black's 2001 fit gives a vortex ratio of 2.3 at 1:23, against 2.8 at 1:30). Every bar holds or improves, but two: the platform
  onsets (below) and the upcoast runs, 22 against 19, at most 29 m against 26 m. The solver's peel slows from 31° to 36°,
  so the readout says "closes out" less (31 % against 41 %).
- **Medium's sets plunge weakly by the peak and fade down the line**: ξγ 0.41 at x −30, 0.27–0.35 to x 30, 0.14 by x 50
  (above, "Why Medium's sets fade"). Its peel holds (94 % toward +x by the tracker, 93 % of the clean reads), but the
  readout says "closes out" more often (57 % against 44 %: the solver's peel sits on the 27° line, 28° against 30°) and
  "a right" 3 % of the time (1 % before; traced to the shore break at the record's start and short stretches of the fan
  down the line).
- **Small still spills** down the line (ξ 0.09–0.24); by the peak its sets reach 0.32–0.33, at the "about 0.3" line. Its
  readout improves: "closes out" 50 % against 70 %.
- **The platform onsets at Big.** Most are the open edges' strips, as before (−x: plain platform; +x: the arm's taper). The
  new 1 % lies mid-arm (x 20–55), 5.5–6 m deep: seed 3's biggest set (faces 3.5–3.9 m), breaking just seaward of the
  arm's foot. The same set breaks as deep on the old bed (its onsets deeper than 4.8 m: 169 there, 260 here), but there the
  face's foot was 35 m further out, so they counted as the face. The reef bed's face is shorter (1:23 from 6 m to 2.2 m).

## What the swept-barrel step will need

The Canyon stays a spilling spot here; the swept barrel on its 55° front is the advisor's item 2, after this bed is
measured. Its Basilisk runs go on the owner's M4 (`tools/basilisk/run_periodic.sh`, cnoidal trains, level 10 then 12 in a
window).

**The transects** along the waves' path (+z), metres from the arm's foot (6 m deep), on the reef bed:

| x | 1:23 face, 6 m → 2.2 m | Hinge (rounded ±8 m) | Fan, 2.2 m → 1.0 m | Break line | Behind it |
| --- | --- | --- | --- | --- | --- |
| −30 (take-off) | 0 → 86.9 m | z −321 | 1:31, 86.9 → 124.4 m | z −283 | 1.0 m for 10 m, 1:23 down to the 2.0 m trough |
| 10 | 0 → 88.6 m | z −264 | 1:74, 88.6 → 177.2 m | z −173 | the same |
| 30 | 0 → 89.0 m | z −236 | 1:98, 89.0 → 203.6 m | z −118 | the same |

In `slope.c`'s terms (h0 = 6 m): S1 = 1/23 = 0.043478 to HMID = 2.2/6 = 0.3667, then S2 = the fan's slope (0.0320 at
x −30, 0.0135 at x 10) to HS = 1/6 = 0.1667, the crest. The periodic runner passes HMID = HS and no S2 today, so its case
format needs those two fields; `slope.c` already takes them.

**The cases** (H at the 6 m platform: each size's Hs at the 7.9 m edge shoaled to 6 m by linear theory, Medium 1.35 m and
Big 2.30 m; the sets about 1.27 Hs):

| Case | Transect | H/h0 | T | What it sources |
| --- | --- | --- | --- | --- |
| `canyon23_a29` | x −30 | 0.29 | 11 s | Medium's sets by the peak (ξγ about 0.4) |
| `canyon23_a38` | x −30 | 0.38 | 14 s | Big's Hs wave by the peak |
| `canyon23_a49` | x −30 | 0.49 | 14 s | Big's sets (faces 2.9–3.9 m at onset; seed 3's biggest set broke just seaward of the foot) |
| `canyon23f74_a38` | x 10 | 0.38 | 14 s | Big down the line: it breaks 3.5–4.3 m deep, on the 1:23 part, before the fan |

What they should give the swept barrel: where the face goes vertical and the lip lands (the onset lag), the void's area,
W/L and tilt against Pick & Feddersen's fits at ψ0 = (1/23)/(H0/h0)^¼ (0.052–0.059, inside their 0.016–0.089), and
whether Medium's sets at H/h0 0.29 throw a real tube or only a curl, which decides whether the barrel draws at Medium.
Medium down the line (x 10 and beyond, ξ 0.14–0.34) spills and needs no case.

## Stable for 600 s (bar 4)

Seed 1 on the reef bed, `--stability` (the fastest water is |q|/h where h > 5 cm, every 10 steps); the old bed's from the
2026-10-09 tables, which the old bed's 3 × 14 re-run reproduced exactly.

| | Small (67 periods) | Medium (55 periods) | Big (43 periods) |
| --- | --- | --- | --- |
| Fastest water | 4.82 m/s | 5.98 m/s (6.15 before) | 9.30 m/s (8.40 before) |
| Froude caps | 0 | 0 (0) | 0 (0) |
| Volume | 0.02 % | 0.30 % (within 0.36 %) | −0.15 % (within 0.41 %) |
| Onsets per 100 s, throughout | 480–735 | 733–946 (657–889) | 760–908 (695–857) |
| Tracker: clean samples toward +x; median | 53 of 57 (93 %); 27° | 47 of 51 (92 %); 29° (44 of 45; 30°) | 43 of 43; 41° (40 of 41; 32°) |
| Readout every second: closes out / a left / a right | 49 / 50 / 1 % | 46 / 50 / 4 % (45 / 53 / 2 %) | 28 / 71 / 1 % (38 / 60 / 2 %) |
| Starts within ±10 m of their median | 53 of 66 | 52 of 56 (53 of 57) | 44 of 49 (43 of 48) |
| Close-outs | 0 | 0 (0) | 2 (1) |
| Each crest's own fit: toward +x; median | 55 of 55; 41° | 45 of 45; 45° (52 of 52; 48°) | 35 of 35; 46° (41 of 41; 46°) |

Big's two close-outs over 600 s: a 1.15 m face mid-arm (x −3, 81 m outside the line) breaking 41 m within 2 s, 36 m of it
upcoast; and a 3.0 m set wave at the arm's end breaking 42 m within 2 s, nearly all downcoast, a fast section. With the 3 × 14
runs' none, Big closes out 2 times in 99 crests, against 2 in 97 on the old bed. The fastest water at Big rises 0.9 m/s
on the steeper face, with no Froude cap.

## The take-off and the start (bars 6 and 7)

**The take-off** (`CANYON_TAKE_OFF_DEPTH`): the line through each size's 90th-percentile start depth in the take-off's
column (3 × 14), **1.24 + 1.07 Hs** (was 1.06 + 1.24 Hs): 2.20, 2.74 and 3.81 m for Small, Medium and Big, within 0.05 m of
the measured 2.23, 2.69 and 3.82 m. On the steeper, shorter face the take-offs move 4.5, 13.5 and 26.5 m inshore (z −320.5,
−333.5 and −358.0 at x −30).

**The start** (`CANYON_RIDE_LINEUP`, big-start's rule: where the faces become catchable, about 17° over the highest third,
but seaward of where one wave in ten starts breaking). Big-start's transect probe on the reef bed (`transects.txt`), the
waves' starts pooled with the size report's:

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Top-third front, 11 m out | 7.8° / 8.5° (±3 m) | 6.3° / 7.1° | 12.3° / 12.6° |
| Top-third front, 6 m out | 8.2° / 9.8° | 7.8° / 8.8° | 12.9° / 13.5° |
| Top-third front, at the take-off | 11.2° / 12.6° | 11.2° / 12.3° | 14.4° / 15.1° |
| First reaches 17° | 7–8 m inside | 9–12 m inside | 10–14 m inside |
| One wave in ten starts breaking (pooled: 51, 61, 64 waves) | 6.0 m seaward | 1.0 m seaward | 5.3 m seaward |
| Median break (pooled) | 14.1 m inside | 16.0 m inside | 20.5 m inside |
| Old bed, one in ten / median (big-start) | 10.5 m seaward / 16.5 m inside | 0.5 m seaward / 29.5 m inside | 4 m inside / 41 m inside |
| **Start** | **11 m** (unchanged) | **11 m** (unchanged; the rule would give 1–2 m) | **6 m** (was 0) |
| Waves breaking seaward of the start (pooled) | 0 of 51 | 0 of 61 | 4 of 64 |

**Bar 7, the risk, is real at Big.** The breaking band is narrower and closer: Big's median break comes 20.5 m inside its
take-off against 41 m, and one wave in ten now breaks seaward of the take-off. Kept seaward of that, Big's start sits 6 m
out, where the faces are 13° — as gentle as the 11 m start the catch diagnosis found Big's riders popping up on the crest
from (12–14°, picked up 90–93 % up the face). The two halves of the rule no longer meet at Big; the owner's 2026-10-11 rule
("don't start on top of the breaking") takes priority here, as big-start wrote it. `?startOut=0` starts at the take-off
(14–15°; 7 of 40 waves in the size report break seaward of it). Medium's and Small's 11 m starts stay clear of their
breaks (none seaward), Medium's on 6–7° faces as before (the owner: "fine for now").
