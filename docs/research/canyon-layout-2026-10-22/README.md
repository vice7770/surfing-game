# The Canyon's layout: a short reef near a visible beach (2026-10-22)

The owner approved the water-physics advisor's recommendations on 2026-10-22 ("use all recommended"). Branch
`claude/canyon-layout`, from `main` (`2dd9ba52`). Wave only, no riders (the owner rides), on the 8 GB M1 with other agents
working, one heavy job at a time.

## The complaint and the diagnosis

The owner: "canyon has a strange wave formation, should be straight. The beach is to far from the waves its unrealistic.
And the starts in the far conor of the map isolating him from the beach."

The advisor (consult log, 2026-10-22):

- **The V has two stacked causes.** The bed bent every crest inshore of the peak: across shore the window had a 6 m strip
  at −x, the 1:4 end wall, the 2 m lagoon, the 1 m top and the gentle fan, then the deep face and the taper's slots, so
  each crest ran ahead in deep water and lagged over the arm. The edge band mirrors the tank's water and bed past each open
  side (`edgeBandGlsl.ts`, `waterFold.ts`), so any lean at an open edge came back as a symmetric chevron. Not the swell,
  the far ocean or the open sides. The repo's crest tools watched only lines seaward of the arm and never the mirror,
  which is why the crest bar passed.
- **The beach** stood 330–365 m from the start: the 70° line spanned the window from x −38 to 64, 280 m across shore,
  plus the 2 m lagoon and a 150 m beach face at 1:25.
- **The start** was at (−30, −345) at Medium: 29 m from the −x rider bound and 345 m from the waterline.

## What changed

Design C with P4's beach, in P2w's window (`src/wave/Bathymetry.ts`, `CANYON`):

| | Before (main 2dd9ba52, now `?canyonBed=old`) | Now |
| --- | --- | --- |
| Peak (x, z) | (−38, −305) | **(−10, −120)** |
| Line angle; face; hinge; fan | 70°; 1:23; 2.2 m; 15° | the same |
| Arm along shore (peak to its end on the beach face) | 102 m (122 m with the upcoast end) | **38 m (58 m)** |
| Arm along its line | 298 m | **112 m** |
| Arm's footprint (upcoast end to taper) | x −58…76, the whole window | **x −30…40, centre x 5** |
| Beach face | 1:25 | **1:15** (provisional) |
| Window | 160 m | **220 m** (`CANYON.alongShore`, read by `alongShoreOf`) |
| Tank zone from | z −575 (foot −475) | **z −390** (foot −290; the blend still ends 40 m seaward of it) |
| Take-off x | −30 (8 m downcoast of the peak) | **−2** (8 m downcoast) |
| Cells | 160 × 636 = 101,760 | **220 × 451 = 99,220** |

The rest is generic and follows the layout: the rider bounds (`tankRiderBounds`, from the window), the edge band and
the far ocean's rim (from the grid and the tank), the seabed mesh, the spectator camera (it frames the take-off), online
spawns (±20 m along shore around the start). Online rooms run the default layout.

**`?canyonBed=old`** now returns main's whole Canyon layout (`CANYON_OLD`: window, bed, tank, take-off x and depth,
starts; its curl was already the default's), so the owner can A/B the two. A test pins it to main's own build at
2dd9ba52 (bed depths, window, tank, rider bounds, take-offs, starts, grid, curl sizes, the readout's breaker): every
value matched exactly. The 1:30 bed it rode before (`CANYON_OLD_BED`) is no longer reachable.

**The readout's peel** (`CANYON.peelReach`, `canyonPeelAt`): on the short arm the beach face lies 60–120 m behind the
break line, and its shore break upcoast of the peak, seconds after the arm's breaks, read as "a right" 8 % of the time at
Medium. A column's new break now counts toward the peel only up to the arm's 10 m flat top inshore of the line (the
lagoon's bores and the beach face's shore break do not). The waves are untouched; the old layout keeps every break, as
on main.

## How it was measured

Each size's own swell (`SWELLS`: Small Hs 0.9 m and Tp 9 s, Medium 1.4 m and 11 s, Big 2.4 m and 14 s, given at the old
5 m edge), square, s = 150, mid tide (0), calm. The tools, all on this branch:

- **`scripts/canyon-size-report.ts`**, 3 seeds × 14 periods a size, `--stability` (`sizes.txt`): the tracker, the
  readout replayed every second, each crest's start, close-out, upcoast run and own fit, where the onsets lie, the health.
  It now runs either layout (`--bed old`) on its own window; its replay and the crests' own fits count the breaks the
  game's tracker counts; close-outs and upcoast runs are also given off the beach face (the flanks' shore break left out).
- **`arm-report.ts`** (here; canyon-reef-bed's, on the run's layout): ξ along the arm in 10 m bins, and the take-off's
  column (x −2 ± 4 m) for the take-off's fit.
- **big-start's `transect-probe.ts` and `analyze.mjs`**, 2 seeds × 12 periods a size, with **`pool.mjs`** (here), which
  pools the waves' starts in the take-off's column with the size report's (`start.txt`).
- **`scripts/crest-angle-report.ts`**, extended (below), 600 s a run, seed 1, 64 components, and
  **`crest-angle-compare.ts`** against the Beach (`crests.txt`).
- **`step-bench.ts`** (here): the CPU step on this M1, both layouts (`cost.txt`).
- **`layout-numbers.ts`** (here): the static numbers (`layout-numbers.txt`).

"Today" below is main's Canyon (the long arm, now `?canyonBed=old`): its size-report bars are the reef bed's 3 × 14 runs
(docs/research/canyon-reef-bed-2026-10-22), which the old layout reproduces exactly (pinned test); its crest bar and cost
were re-run here with the extended tools.

Every other spot is byte-identical to main (`other-spots.txt`: window, tank, take-off, bounds, peel and a hash of the
water after 3 s, at every other spot, line for line the same as main built the same way).

## The bars, 3 seeds × 14 periods a size (today → now)

| Bar | Small (0.9 m, 9 s) | Medium (1.4 m, 11 s) | Big (2.4 m, 14 s) |
| --- | --- | --- | --- |
| 2. Tracker: clean samples toward +x; median | 32 of 34 (94 %); 28° → **25 of 25 (100 %); 28°** | 32 of 34 (94 %); 28° → **36 of 36 (100 %); 34°** | 40 of 41 (98 %); 36° → **37 of 38 (97 %); 30°** |
| 2. Readout every second: closes out / a left / a right | 50 / 47 / 2 % → **51 / 49 / 0 %** | 57 / 40 / 3 % → **39 / 61 / 0 %** | 31 / 68 / 1 % → **46 / 53 / 1 %** |
| 2. Readout: clean reads toward +x | 258 of 271 → **208 of 208** | 345 of 369 → **366 of 367** | 517 of 521 → **468 of 485** |
| 2. Each crest's own fit along the arm: +x; median | 34 of 34; 37° → **33 of 33; 50°** | 40 of 40; 43° → **40 of 40; 51°** | 36 of 37; 40° → **32 of 32; 31°** |
| 3. Starts within ±10 m of their median (median x) | 32 of 43 (x −36) → **32 of 40 (x −7)** | 39 of 46 (x −39) → **41 of 45 (x −11)** | 44 of 50 (x −42) → **46 of 48 (x −14)** |
| 3. Where the crests start | face 29, end 7, top 4, beach face 3 → **face 23, end 13, top 3, beach face 1** | end 22, face 21, beach face 2, top 1 → **end 25, face 19, beach face 1** | end 35, face 13, beach face 2 → **end 41, face 7** |
| 3. Close-outs (≥ 40 m within 2 s): all; off the beach face | 0 → **1; 0** | 1 → **0; 0** | 0 → **2; 2** |
| 3. Upcoast runs (largest reach): all; off the beach face | 0 (7 m) → **3 (100 m); 2 (29 m)** | 4 (14 m) → **2 (12 m); 2 (12 m)** | 22 (29 m) → **24 (96 m); 24 (96 m)** |
| 3. Onsets on the platform; on the beach face | 0.2 %; — → **0 %; 40 %** | 1.0 %; — → **0 %; 64 %** | 7.2 %; — → **3.6 %; 66 %** |
| 5. ξb of the sets along the arm | x −30…50: 0.32, 0.24, 0.16, 0.13, 0.12 → **x −15…25: 0.32, 0.31, 0.33, 0.26, 0.21** | 0.38, 0.42, 0.34, 0.41, 0.19 → **0.36, 0.37, 0.41, 0.48, 0.27** | 0.44, 0.56, 0.57, 0.59, 0.59 → **0.41, 0.45, 0.49, 0.54, 0.55** |
| 5. ξγ (Hb = 0.78 h) of the sets, same places | 0.33, 0.18, 0.13, 0.11, 0.09 → **0.39, 0.34, 0.31, 0.21, 0.17** | 0.41, 0.35, 0.27, 0.33, 0.14 → **0.43, 0.41, 0.39, 0.38, 0.22** | 0.45, 0.42, 0.41, 0.43, 0.44 → **0.46, 0.48, 0.45, 0.44, 0.43** |
| 6. Take-off's column: 90th percentile start depth | 2.23 m → **2.19 m** | 2.69 m → **2.65 m** | 3.82 m → **3.85 m** |
| 4. Health over the 3 seeds: fastest water; Froude caps; volume | 4.5–5.1 m/s; 0; within 0.18 % → **4.5–5.0 m/s; 0; within 0.12 %** | 6.0–8.1 m/s; 0; within 0.40 % → **5.8–7.6 m/s; 0; within 0.38 %** | 8.3–8.8 m/s; 0; within 0.99 % → **8.7–9.7 m/s; 0; within 1.17 %** |

What they mean:

- **One-way peel holds at every size** (bar 2: 97–100 % of the tracker's clean samples toward +x; "a right" 0–1 % of the
  readout). Before the readout's fix the short arm read "a right" 8 % of the time at Medium: the shore break on the beach
  face behind the arm (above, `peelReach`).
- **Medium reads better** than today (61 % "a left" against 40 %, and 34° against 28°). **Big peels faster** on the short
  arm (the tracker's median 30° against 36°; each crest's own fit 31° against 40°), so its readout says "closes out" 46 %
  of the time against 31 % (the advisor's P4 run: 29°, 55 % "closes out"). Small's own fits slow to 50°.
- **The starts cluster at the peak** (bar 3: 80–96 % within ±10 m of their median, x −7 to −14 against the peak's −10),
  on the arm's end and face. Close-outs off the beach face: Small 0, Medium 0, Big 2 in 48: a fast section from the
  arm's end (seed 1, 40 m downcoast within 2 s, its own fit 14°), and seed 3's biggest set breaking 5.4 m deep on the
  taper past the arm's end, 96 m within 2 s, nearly all upcoast (on the long arm the same seed's set broke just seaward of
  the face's foot). Big's upcoast runs: 24 of 48 (22 of 50 today), their reach median 8 m and 90th 22 m; the 96 m one is
  that set. Small's one close-out is a lagoon bore reaching the beach face early in a record (0 off the beach face).
- **The flanks close out on the beach** either side after the peak's ride (40–66 % of all onsets are on the beach face),
  which the brief allowed. The platform onsets fall at Big (3.6 % against 7.2 %).
- **Breaker type (bar 5):** Small spills (ξb 0.21–0.33); Medium's sets plunge weakly all along the short arm to x 15
  (ξb 0.36–0.48, ξγ 0.38–0.43) and spill at its end (0.27), where on the long arm they faded from x 10; Big's sets plunge
  all along (ξb 0.41–0.55, ξγ 0.43–0.48). The short arm keeps Medium's waves on the 1:23 face: the fan's gentle part is
  only 38 m long.
- **Health (bar 4):** no Froude cap, finite, volumes within 0.12–1.17 % over 14 periods (Big's 1.17 % is seed 3, as
  today's 0.99 %); the 600 s runs are below.

## Straight crests (bar 1; `crests.txt`)

**The extended bar.** `scripts/crest-angle-report.ts` now also watches three lines inshore of the take-off and, every
second, every crest line in the fine zone (the advisor's `crests.ts`): its local angle at stations every 15 m along shore
and 12 m inside each open edge, by band across shore (`seaward` more than 30 m seaward of the take-off, `take-off` the
30 m seaward of it, `inside` to halfway to the waterline, `inner` the rest) and by station group (the open water either
side of the arm's footprint ± 10 m, and over it). The **edge chevron** is twice the angle at the edge stations: the edge
band draws the tank's water mirrored past each open side, so a crest leaning a° there is drawn as a chevron 2a° from
straight. **Two-sided**: a crest whose mean angles over the window's outer thirds lean opposite ways, each past the
Beach's 90th percentile in that band. `crest-angle-compare.ts` sets every run against the Beach (Medium, square, s = 150,
the 2026-10-05 reference, reproduced exactly here). Seed 1, 600 s, 64 components; Small, Medium and Big on the short arm,
Medium and Big on the long one.

|Band (Beach p90 \|angle\|; its chevron 2 × p90) | Run | Open water −x / +x: p50 / p90 ° | Over the arm: p50 / p90 ° | Edge chevron −x / +x: p50 / p90 ° | Two-sided |
| --- | --- | --- | --- | --- | --- |
| seaward (6.2°; 2.6°, 116 samples) | Medium, today | — | 2.0 / 5.8 (the window) | 4.1 / 9.7 · 2.2 / 6.8 | 0 of 957 |
| | **Medium, now** | **2.5 / 6.2 · 1.6 / 4.5** | 2.1 / 6.8 | **3.5 / 8.8 · 2.5 / 6.5** | **3 of 746** |
| | Big, today | — | 2.2 / 5.5 | 3.4 / 8.7 · 2.6 / 7.0 | 0 of 719 |
| | **Big, now** | **2.1 / 6.0 · 1.6 / 3.9** | 2.1 / 6.6 | **3.0 / 9.4 · 2.4 / 5.8** | **0 of 639** |
| | **Small, now** | **2.7 / 7.0 · 1.4 / 4.5** | 2.2 / 6.7 | **4.1 / 10.7 · 2.2 / 6.9** | **0 of 835** |
| take-off (6.7°; 8.4°) | Medium, today | — | 3.6 / 11.7 | 13.4 / 23.8 · 2.9 / 8.2 | 0 of 140 |
| | **Medium, now** | **2.2 / 7.6 · 1.5 / 4.1** | 4.2 / 12.8 | **2.8 / 7.7 · 2.2 / 7.1** | **0 of 90** |
| | Big, today | — | 2.9 / 8.5 | 8.0 / 17.4 · 2.9 / 7.7 | 0 of 124 |
| | **Big, now** | **2.4 / 8.0 · 1.7 / 4.7** | 3.5 / 9.7 | **3.1 / 9.8 · 2.9 / 7.4** | **0 of 117** |
| | **Small, now** | **2.9 / 8.8 · 1.6 / 4.5** | 6.9 / 16.7 | **4.3 / 9.7 · 2.8 / 7.5** | **0 of 65** |
| inside (8.9°; 10.4°) | Medium, today | — | 9.3 / 25.6 | 16.4 / 34.7 · 6.3 / 17.5 | 8 of 370 |
| | **Medium, now** | **3.3 / 14.1 · 2.1 / 6.7** | 11.5 / 26.4 | **3.4 / 10.5 · 4.3 / 11.9** | **0 of 67** |
| | Big, today | — | 7.0 / 19.2 | 16.6 / 31.9 · 6.1 / 18.8 | 32 of 551 |
| | **Big, now** | **3.7 / 12.0 · 2.2 / 5.9** | 8.2 / 21.7 | **4.9 / 15.5 · 3.2 / 8.5** | **0 of 202** |
| | **Small, now** | **2.6 / 9.5 · 2.4 / 5.9** | 14.4 / 30.5 | **3.5 / 9.9 · 4.7 / 11.9** | **0 of 8** |
| inner (8.7°; 11.5°) | Medium, today | — | 11.0 / 27.0 | 15.9 / 38.5 · 16.6 / 52.8 | 5 of 79 |
| | **Medium, now** | **4.0 / 13.2 · 3.7 / 12.1** | 13.7 / 33.9 | **4.4 / 11.5 · 5.3 / 12.3** | **2 of 24** |
| | Big, today | — | 11.3 / 27.2 | 15.6 / 37.1 · 14.1 / 43.1 | 49 of 310 |
| | **Big, now** | **5.3 / 14.2 · 4.1 / 12.2** | 10.4 / 28.0 | **6.2 / 17.4 · 5.2 / 13.7** | **3 of 116** |
| | **Small, now** | **2.8 / 9.4 · 2.7 / 8.4** | 16.5 / 33.9 | **3.1 / 7.3 · 3.4 / 9.1** | **0 of 6** |

On the long arm every station is over the arm (its footprint spans the window). What the table says:

- **The mirror's V is gone where it was.** Today the edge chevron at the −x side reaches 24–35° (p90) at Medium from the
  take-off line in, and 39–53° near the beach: the V the owner saw. Now it is 7.7–12.3° at Medium and 7.3–11.9° at
  Small, within or at the Beach's own spread (8.4–11.5°) from the take-off line in; at Big 9.8° at the take-off line,
  15.5° and 17.4° at the −x edge inshore (the Beach's 10.4–11.5°).
- **The open water is straight seaward of the take-off and by it** (p90 3.9–8.8° against the Beach's 6.2–6.7°) at
  every size. **Inshore it is straight on the +x side** (p90 5.9–6.7° inside, 8.4–12.2° in the inner band near the
  beach) and **less so on the −x side**, round the arm's upcoast end (p90 12–14° at Medium and Big inside and inshore;
  9.4–9.5° at Small), where the crests wrap round the end wall.
- **Over the arm the crests bend** as on any reef: it breaks there first, and the broken crest lags the open water
  either side (p90 10–13° by the take-off, 22–34° inshore, as over the long arm's 12–27°). Real, and local to the reef's
  60 m footprint.
- **Two-sided crests across the window:** today 8 and 5 at Medium inshore, 32 and 49 at Big; now 0–3 in every band at
  every size (the Beach 0). The signed leans in the inner band show the reef's own slight V where crests reach the beach
  (Medium −2.5° / +2.3°, Big −3.1° / +2.8° over the outer thirds, against today's 6.4° / −0.8° and −7.9° / −0.9°).
- **The old bar's two lines** (whole crests at the fine zone's first rows and 30 m seaward of the take-off): within the
  Beach's spread at every size, never two ways at once, as before (`crests.txt`).

## Stable for 600 s (bar 4)

The crest runs' health (the game's own sea, seed 1, 600 s, 64 components; the fastest water is |q|/h where h > 5 cm,
every 10 steps):

| | Small, now | Medium: today → now | Big: today → now | Beach, Medium |
| --- | --- | --- | --- | --- |
| Fastest water | 5.10 m/s | 6.19 → 6.65 m/s | 9.27 → 8.59 m/s | 3.29 m/s |
| Froude caps (in water) | 0 (0) | 0 (0) → 0 (0) | 0 (0) → 2 (0) | 0 (0) |
| Volume over 600 s | 0.16 % | −0.31 → 0.34 % | 0.34 → −0.10 % | 0.88 % |
| Finite | yes | yes | yes | yes |

Big's two Froude caps were in water under 5 cm deep (none counted in water), where the cap only clips the swash.

## Cost (`cost.txt`)

| | Medium: today → now | Big: today → now |
| --- | --- | --- |
| Cells | 160 × 636 = 101,760 → **220 × 451 = 99,220** (−2.5 %) | the same |
| CPU step, p50, quietest pair (all three runs) | 48.1 → **45.3 ms** (46.7, 48.1, 48.1 → 46.6, 45.3, 85.8) | 51.9 → **46.8 ms** (72.4, 51.9, 87.4 → 49.8, 46.8, 85.4) |
| Spin-up on the CPU | 24–38 s → 24–41 s | 88–102 s → 56–86 s |

The whole `SurfZoneSimulation.step` on this M1 in Node, the game's sea (64 components), stage 2 on the CPU, 300 steps
after spin-up. Other agents were working (load average 3.5–6), so the runs scatter by up to 1.9×; each pair was run three
times, alternating. The step costs the same or a little less (the cells fall 2.5 %); the spin-up times scatter with the
load. Nothing on the GPU tier changes but the grid's shape (220 × 451 against 160 × 636 cells).

## The take-off and the start (bars 6 and 7)

**The take-off** (`CANYON_TAKE_OFF_DEPTH`, refitted): the line through each size's 90th-percentile start depth in the
take-off's column, **1.14 + 1.12 Hs** (was 1.24 + 1.07): 2.15, 2.71 and 3.83 m for Small, Medium and Big, within 0.06 m of
the measured 2.19, 2.65 and 3.85 m. The column is again 8 m downcoast of the peak on the same face, so the depths barely
move. (The advisor's feasibility runs, one seed, read 2.4–2.5 m at Medium and 4.3 m at Big; three seeds put them at 2.65
and 3.85 m.)

**The start** (`CANYON_RIDE_LINEUP`, re-measured, unchanged: 11, 11 and 6 m; `start.txt`). Big-start's rule: where the
faces become catchable (about 17° over the highest third), but seaward of where one wave in ten starts breaking. The
probe's faces and the pooled starts (size report 3 × 14 plus probe 2 × 12):

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Top-third front, 11 m out (±3 m) | 10.3° (11.4°) | 8.2° (9.0°) | 13.8° (14.4°) |
| Top-third front, 6 m out | 12.2° (13.6°) | 10.2° (12.3°) | 14.9° (15.5°) |
| Top-third front, at the take-off | 16.0° (18.1°) | 14.7° (17.5°) | 14.7° (14.8°) |
| First reaches 17° | 1 m inside (2 m out, ±3 m) | 6 m inside (at the take-off, ±3 m) | 25 m inside (10 m, ±3 m) |
| One wave in ten starts breaking (pooled: 55, 59, 65 waves) | 5.5 m seaward | 3.0 m seaward | 6.0 m seaward |
| Median break | 10.5 m inside | 12 m inside | 18 m inside |
| **Start** | **11 m** | **11 m** (the owner's "fine for now"; the rule would give 3–4 m) | **6 m** |
| Waves breaking seaward of the start (pooled) | 2 of 55 | 1 of 59 | 5 of 65 |

## The beach and the start, per size (bar 7; `layout-numbers.txt`)

Mid tide puts the waterline at z 0 (low and high tide move it 9 m either way on the 1:15 face). The window is 220 m, x
−110…110; the rider is held within x ±89 (21 m inside each open side) and from z −386.

| | Take-off (x, z), depth | Start, depth | Start to the waterline | To the window's centre; its −x / +x edges | To the rider's −x / +x bounds |
| --- | --- | --- | --- | --- | --- |
| Small, today | (−30, −320.5), 2.20 m | 11 m out, 2.65 m | 332 m | 30 m; 50 / 110 m | 29 / 89 m |
| **Small, now** | **(−2, −134.0), 2.14 m** | **11 m out, 2.58 m** | **145 m** | **2 m; 108 / 112 m** | **87 / 91 m** |
| Medium, today | (−30, −333.5), 2.74 m | 11 m out, 3.21 m | 345 m | 30 m; 50 / 110 m | 29 / 89 m |
| **Medium, now** | **(−2, −147.5), 2.69 m** | **11 m out, 3.17 m** | **159 m** | **2 m; 108 / 112 m** | **87 / 91 m** |
| Big, today | (−30, −358.0), 3.80 m | 6 m out, 4.06 m | 364 m | 30 m; 50 / 110 m | 29 / 89 m |
| **Big, now** | **(−2, −173.5), 3.82 m** | **6 m out, 4.08 m** | **180 m** | **2 m; 108 / 112 m** | **87 / 91 m** |

The peak is 120 m from the waterline (305 m today) and the ride along the arm about 112 m to its end on the beach face,
15 m from the waterline. Online spawns lie 4–19 m beyond the start, ±20 m along shore.

## The tube runs (`canyon-tube-runs.patch`)

The take-off's transect is the same on the short arm as on the long one: the take-off is again 8 m downcoast of the peak,
so along the waves' path from the 6 m foot the face is 1:23 to the 2.2 m hinge, then the fan at 1:31 (1:31.8 exactly) to
the 1.0 m crest. **`canyon23_a29`, `canyon23_a38` and `canyon23_a49` are unchanged**, relabelled x −2. The down-the-line
case moves: the arm ends 38 m downcoast of the peak, so `canyon23f74_a38` (x 10, 48 m downcoast, fan 1:74) has no place on
it. Big's sets break 3.4–3.7 m deep on the 1:23 face from x 5 to 25 (bar 5), so the new case sits at x 18, 28 m downcoast
of the peak, three quarters of the way to the arm's end, where the fan is 1:54:

    canyon23f54_a38:6:0.38:14:0.0434783:0.1666667:68:25:40:35:56:0.3666667:0.0185928

(f74's domain, switch, end and window, provisional; `run_canyon.sh` re-places them from its scout.) The patch replaces f74
with f54 on `claude/canyon-tube-runs` (`tools/basilisk/run_periodic.sh`'s case list and notes, `canyon_pipeline.py`'s
`CASES` and labels, the README's table); it applies cleanly to that branch at 2ec54c94
(`git apply docs/research/canyon-layout-2026-10-22/canyon-tube-runs.patch`). Behind the break line, from about 20 m
downcoast of the peak, the 1:15 beach face closes the lagoon before it is 2 m deep; the cases end on a flat at the
crest's depth either way, so this does not reach them.

## What to ride (the owner)

Ride the Canyon, mid tide, calm, several sets each way, and record; then the same with **`?canyonBed=old`** (today's
layout exactly: the long arm, the 160 m window, the far beach and the corner start) to compare.

1. **The crests.** From the start and from the overview: do the crests come in straight across the open water either
   side of the reef, and does the V at the window's sides (the edge band's mirror) go? Over the reef they bend round it
   as it breaks (below).
2. **The beach.** Is it close enough now: 145–180 m from the start, the peak 120 m out? Does the beach face behind the
   reef read well, and the shore break on the flanks either side?
3. **The start.** Centred in the window (2 m from its centre, 87–91 m from each side bound): does it still feel isolated?
4. **Medium.** The sets stand up and pitch along the whole short arm (ξ 0.4–0.48 to x 15); does the shoulder hold to the
   arm's end on the beach (about 38 m along shore, 112 m along the line)? The readout should say "a left" more often.
5. **Big from the 6 m start.** The faces there are 15° (13° on the long arm). Do you drop in, or get left on the crest?
   Then `?startOut=0` (the take-off; 8 of 65 waves break seaward of it). Big peels faster on the short arm (30°): does it
   section, and how often does the readout say "closes out"?
6. **Small** spills, as before, near the beach.

## Risks

- **Over the reef the crests still bend** (bar 1): refraction round the arm and its peel lag the crest over it, and the
  flanks run ahead into the beach. In the open water either side they are square; the window-wide V should be gone.
- **Big peels faster** (30–31° against 36–40°): its readout says "closes out" 46 % of the time (31 % today), and it has 2
  close-outs in 48 crests (0 in 50), one of them seed 3's biggest set breaking on the taper past the arm's end.
- **Big's start** stays where one wave in ten breaks (5 of 65 seaward of it): the faces there are 15°, short of 17°.
  Medium starts 11 m out on 8° faces, the owner's earlier "fine for now"; the rule would give 3–4 m.
- **The 1:15 beach is provisional**; the flanks' shore break is 40–66 % of all onsets, drawn as whitewater close by.
- **The readout's tracker now ignores breaks inshore of the arm's flat top** (`peelReach`); the waves are unchanged.
- **Not re-recorded:** the dev bots' track (`server/bots/canyon-medium.bin`, git-ignored, `BOTS=1` only) was recorded on
  the long arm, where riders started 345 m out; on the short arm it rides empty water seaward of the reef. The surf
  forecast's Canyon fit (`SURF_FORECAST`, from 2026-09-27) was not refitted for this or any Canyon change since.
- **`?canyonBed=old`** now means main's whole layout; the 1:30 bed it used to select is gone.
- Measured on a shared M1 under load (load average 3.5–10 from other agents): the cost's step times carry that noise.
