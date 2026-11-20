# The Canyon's version B: a beach peak peeling into a reef bowl (2026-11-01)

The owner chose version B (2026-10-31): "the wave starts from the centre, is surfable into the reef area and forms a
tube … the most consistent, requires only wave work". Their decisions:
- the up-coast beach peak peels into the reef bowl;
- the down-coast peak stays a spilling A-frame;
- the bowl plunges over 15–25 m, with the tube off for now;
- its transect is fixed so that Basilisk tube cases can follow.

This replaces canyon-beach-break's "leave the reef as it is".

Branch `claude/canyon-b` from main at 376d9cd4. Wave work only: no rider sessions in tests.
Switch: `?canyonBed=old` is main's Canyon at 376d9cd4, byte for byte. Online rooms run the default.

## Results

- **One line from the tip into the bowl.** The up-coast peak's +x line travels unbroken into the bowl on about two
  waves in five at Medium and two in three at Big. It reaches the bowl's end on about one in five at Medium and one in
  two at Big. On the other waves the arm's white stalls 25–45 m from the tip, as it did on main, and the bowl breaks on
  its own.
- **The bowl stands up.** On the bowl, the waves' onsets have:
  - ξb 0.52–0.64, against 0.21–0.29 on the arm;
  - steepest faces of 21–26°, against 14–21° on the arm;
  - ξb of 0.5 or more in 57–87 % of them, against 0–7 % on the arm.
- **It plunges over 20 m at Medium and 25–30 m at Big** (u 60/65 to 85/95 from the tip). The owner asked for 15–25 m.
- **The catch at the start** is about main's: the bar's tip, the take-off and the start did not move. The probe's
  riders caught 35 of 52 set tries on B and 39 of 52 on main (Medium, 2 seeds; Big, 1).
- **Crests and health over 600 s:** the edge chevrons are main's; the crests are straighter where the reef was, and
  bend over the bowl near the beach. More crests read two-sided in the inner band (6 % at Medium, 11 % at Big), where
  main's report counted few whole crests; open. The water stays finite and slower than main's.
- **Cost:** B's CPU step is about a third cheaper than main's Canyon on average (83 against 127 ms at Medium, stage 2,
  this machine): its slower water never needs the solver's second CFL substep.
- **The readout** gives the up-coast peak as "Spilling peak into a plunging reef bowl, left …° and right …°". The bowl's
  ξb at its own take-off is 0.56, 0.58 and 0.56 at Small, Medium and Big; the peak's tip reads 0.20–0.21, spilling.
- **Other spots are byte-identical**, and `?canyonBed=old` is main's Canyon: the hashes and values match (below).
- **Three changes to the advisor's design**, each measured (below):
  - the +x arm runs at 32°, not 40°;
  - the bowl sits 5 m further along the arm;
  - its face is 1:18, not 1:21.

## The design (the water-physics advisor's, 2026-11-01)

The consult is logged in `docs/research/water-physics/consult-log.md`.

**The constraint.** On the bars the white travels along the arms by rule A's breaking age, at a visible 37–47°.
- A steep bowl breaks within about 2 m of the same place for each 0.1 m of wave height. The arm's peel arrives 6–9 m
  further out for each 0.1 m.
- So a bowl can be on time for one wave height only. The advisor tuned it to the smallest wave that breaks on it
  (about 1.2 m), so the bowl never breaks before the peel arrives.
- So bigger waves reach the bowl early: by the advisor's estimate the peel arrives 1–3 s before the bowl pitches at
  Medium and 5–9 s before at Big, and the wave backs off meanwhile. The alternative is to move the bowl 10 m seaward, so
  that Medium's sets are on time and its smaller waves 1–2 s early. That is the owner's call.

**The bed** (`src/wave/Bathymetry.ts`: `CANYON`'s `reef` and `bowl*` keys, and `canyonBarDepth`'s `bowlProfile`):
- **No reef terrace.**
  - The old reef's arm, 120 m out at x −17, broke 25–35 m seaward of where the bar's peel had got to, so it always
    broke first.
  - The bowl takes its place and inherits its rock, its breaking rules (the spot's 0.65 onset, the 0.5 age gate), its
    spilling front and its readout.
- **The up-coast bar** (tip x −112, 1:50, the default start) is unchanged at its tip and on its −x arm.
  - Its +x arm runs on into the bowl with no rip.
  - The arm's contours run at `bowlArmAngle` 32° instead of 40°, from the tip on.
  - The +x arm's depths differ from main's by 0.02 m or less within 10 m of the tip, 0.05 m at 20 m and up to 0.17 m
    at 50 m (most where the arm meets the floor).
- **The bowl along the arm** (u from the tip):
  - ramping in over u 55–65, and whole to u 80;
  - its crest deepening from 1.2 to 2 m over u 80–88, so the wave backs off;
  - then bar and bowl fade into the floor over 15 m.
- **Its transect along +z** (Mead & Black's platform, ridge and wedge; Mead 2000):
  - the bar's 1:50 down to 3.0 m;
  - a platform level at 3.0 m for about 20 m, up to 0.35 m deeper than the bar beside it, which carries the waves
    unbroken to the face;
  - a knee rounded ±4 m;
  - a 1:18 face, 32 m wide, to a 1.2 m crest on the bar's 1.9 m contour, so its contours run with the arm's;
  - a top level for about 8 m, then down at 1:30 to meet the bar; no lagoon.
  - The figures for the Basilisk cases are below.
- **The channel** past the bowl is the plain 5 m floor.
  - It runs from x −14 to the down-coast arm, out to the floor's edge and in to the 1:15 face's toe at z −75.
  - It is never deeper than the floor: deeper water would lead the crests round the bowl's end (the advisor).
  - The old reef's 6 m pocket is gone.
- **The down-coast peak** (x 121) is unchanged, value for value.
- **Rock** covers the bowl where it stands above its bar: its upper face, top and back.
  - The bowl stands only 0.4–0.7 m proud, so its relief counts three times a ledge's (`BOWL_RELIEF`).
  - The bars and the channel stay sand.

**Breaking.** The bowl breaks by the reef's rules (0.65 onset at every depth, the 0.5 gate) from where it ramps in. The
beach's rules (0.40 onset on water 3 m deep or shallower, rule A) blend in over 5 m on the arm's side.

**The readout.** The bowl belongs to the up-coast peak; it is not a reef of its own.
- The readout says "Spilling peak into a plunging reef bowl, left …° and right …°" (`PeelEstimate.bowl`).
- The bowl's breaker is taken at the bowl's own take-off (`canyonBowlTakeOff`).
- The Wave Lab's peaks are the two beach peaks. The up-coast one's stretch runs on to the channel.

## The three measured changes (Medium, seed 1 unless given; `runs/screens.txt`)

"Into the bowl" counts the waves whose one travelling line reached u 55, 72.5 and 80 m from the tip: where the bowl
ramps in, its middle and its end. The +x line is the up-coast peak's.

| Bed | Into the bowl | +x line ≥ 40 m | +x end, median | Bowl ξb (median of its onsets) |
| --- | --- | --- | --- | --- |
| main (old), +x arm to its rip at u 55 | — | 7 of 16 | 28 m | — |
| advisor's: arm 40°, bowl 50–75 m, face 1:21 | 3 / 2 / 2 of 15 | 6 of 15 | 37 m | 0.5 and over, u 60–100 |
| arm 32° | 4 / 3 / 1 | 8 | 44 m | 0.5 and over, u 60–100 |
| arm 26° | 5 / 2 / 1 | 9 | 49 m | plunging over only 15 m |
| **arm 32°, bowl 55–80 m** | 4 / 3 / 1 | 9 | 45 m | 0.5 and over, u 65–105 |
| the same, face 1:21: seed 2 / seed 3 | 3 / 2 / 2 and 9 / 6 / 4 | 8 and 11 | 44 and 59 m | 0.43–0.52 at Medium (3 seeds) |
| **the same, face 1:18 (adopted)**: seed 1 / seed 3 | 5 / 2 / 0 and 9 / 6 / 5 | 8 and 11 | 42 and 59 m | 0.57–0.60 and 0.52–0.54 |

- **32°:** a flatter arm, nearer the crests' own line, carries the line further. 26° carried it a little further again,
  but the bowl then plunged over only 15 m, and its visible peel fell to 39°, near Walker's 30° minimum for riders.
- **55–80 m:** with the bowl 5 m further along the arm, the line reaches it a little more often.
- **1:18:** the advisor's 1:21 gave ξb 0.43–0.52 at the bowl's onsets at Medium, where the owner asked for 0.5–0.8. Its
  waves broke 1.2–1.9 m high, above the 1.2 m it was tuned to. At 1:18 the bowl reads 0.52–0.64 at Medium and Big, and
  the line reaches it as often as before.

## Frame by frame (the final bed; `frame-probe.ts`, 12 periods each, `runs/`)

The probe follows the white as a player sees it, every 0.25 s, for the solver's breaking (strength > 0.3). A line is
one: it never vanishes for a frame and its end never jumps more than 6 m.

**One line from the up-coast peak's tip, down its +x arm, into the bowl:**

| Run | Waves | +x line ≥ 40 m | Into the bowl: u 55 / 72.5 / 80 m | +x end, median (90th) | Longest line, median | Typical line, median | Frames with a patch, median |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Medium, seed 1 | 15 | 8 | 5 / 2 / 0 | 42 m (80) | 100 m | 52 m | 37 % |
| Medium, seed 2 | 15 | 8 | 3 / 3 / 3 | 41 m (83) | 94 m | 50 m | 14 % |
| Medium, seed 3 | 14 | 11 | 9 / 6 / 5 | 59 m (104) | 111 m | 63 m | 15 % |
| **Medium, all** | 44 | **27 (61 %)** | **17 / 11 / 8 (39 / 25 / 18 %)** | | | | |
| Big, seed 1 | 15 | 12 | 7 / 7 / 7 | 54 m (104) | 118 m | 62 m | 39 % |
| Big, seed 2 | 16 | 14 | 13 / 11 / 9 | 82 m (104) | 138 m | 55 m | 16 % |
| **Big, all** | 31 | **26 (84 %)** | **20 / 18 / 16 (65 / 58 / 52 %)** | | | | |
| main (old), Medium seeds 1 and 2 | 30 | 13 (43 %) | its arm ends at u 55: 7 (23 %) | 28 and 37 m | 71 and 82 m | 34 and 43 m | 24 and 14 % |
| main (old), Big seed 1 | 18 | 13 (72 %) | its arm ends at u 55: 11 (61 %) | 58 m (68) | 121 m | 52 m | 39 % |

- The longest lines are the peak's two arms together (the −x arm runs 50–60 m as well).
- On main the +x arm ended in a rip at u 55, and the reef broke on its own, seaward and first. On B the line carries on
  into the bowl.
  - At Medium it reaches u 55 about as often as main's line reached its rip: seeds 1 and 2, 8 of 30 against 7 of 30.
  - At Big, seed 1, less often: 7 of 15 against 11 of 18. Main's count allows 4 m short of the rip.
  - Main's arm ended there; B's line goes on to u 80 on 8 of 44 waves at Medium and 16 of 31 at Big.
- **Where the line stops:** on the waves that don't reach the bowl, the arm's white stalls 25–45 m from the tip. There
  the onsets are shallower (1.4–1.6 m against 1.8–1.9 m at the tip; Medium, seed 1) and the waves smaller. The stall is
  canyon-beach-break's (the `bowlArmAngle` screens eased it).
- **The bowl's own breaking:** it breaks on 8, 10 and 11 of 15 waves at Medium (seeds 1–3) and on 14 of 15 and 16 of 16
  at Big. Its line runs 24–36 m (median longest; 48 m, the whole bowl, at the 90th). It never closes out at its start
  (0 of 8–16 waves 40 m wide 2 s after it starts; 1 of 14 at Big, seed 1).

**The shape along the arm** (each column's first onset, by distance u from the tip; median of the bins in each stretch):

| Run | The arm, u 0–55 | The ramp, u 55–65 | The bowl, u 65–85 |
| --- | --- | --- | --- |
| Medium, seed 1 | faces 14–18°, ξb 0.24–0.29, 0–5 % ≥ 0.5 | 21–22°, 0.23–0.42 | 21–22°, **0.57–0.60, 58–76 %** |
| Medium, seed 2 | 16–19°, 0.24–0.27, 0–5 % | 20–23°, 0.25–0.40 | 21–26°, **0.53–0.56, 57–63 %** |
| Medium, seed 3 | 18–20°, 0.21–0.23, 0 % | 25–26°, 0.26–0.47 | 21–26°, **0.52–0.54, 64–87 %** |
| Big, seed 1 | 19–21°, 0.22–0.24, 0 % | 25–26°, 0.28–0.50 | 23–26°, **0.59–0.62, 59–65 %** |
| Big, seed 2 | 18–19°, 0.23–0.25, 0–7 % | 25°, 0.25–0.47 | 23–25°, **0.61–0.64, 61–77 %** |

- The faces are each onset's steepest slope along +z. ξb = tan β / √(H/L0), with the bed's slope along +z at the onset,
  the wave's height there and the deep-water wavelength. Battjes (1974): plunging from about 0.4–0.5.
- At Medium the waves break on the bowl 1.2–1.7 m deep, at Big 1.8–2.4 m: on its face, between the platform's 3.0 m and
  the crest's 1.2 m.
- **The plunging stretch** (bins with median ξb ≥ 0.5, on the bowl's bed):
  - Medium: u 65–85, **20 m**, on all three seeds;
  - Big: u 60–85, **25 m** (seed 1), and u 65–95, **30 m** (seed 2), where the bowl's back-off still plunges.
  - Past u 95 the few onsets are the beach's 1:15 face in the channel's lee, not the bowl.

**Small** (seed 1, `runs/small-s1.txt`): Small's waves, 1.1–1.35 m high at the bowl, break late, on its crest and top, and
mostly spill.
- One line reaches the bowl on 2 of 11 waves (u 55), its middle on 1 and its end on none.
- The bowl breaks by itself on 6 waves, in lines of about 21 m.
- Its onsets lie 1.20–1.26 m deep, on its crest and top: faces 22–25°, ξb 0.28–0.44 (19–32 % at 0.5 or more).
- So at Small the up-coast peak is a spilling peak, and the bowl a small spilling section.

**The drawn curl on the bowl** (`SpillingCurl`, the spilling lip the bowl draws with the tube off).
- Each column's curl is sized by the bed it climbs at the sea's breaker depth h_b: 1.59, 2.25 and 3.43 m at Small,
  Medium and Big.
- At Big that depth lies seaward of the bowl's 3.0 m platform, on the bar's 1:50. The bowl's columns drew the bar's
  0.23 H, though its waves break on the face.
- Now the bowl's columns are sized no deeper than 0.2 m above the platform (`BOWL_FACE_BELOW_PLATFORM`, as the readout's
  bowl take-off; `SpillingCurlOptions.breakerDepthAt`).
- The curl stands 0.40 H over the whole bowl (u 70–85) at Medium and at Big. It is 0.23–0.25 H on the arm before it,
  growing over the ramp. Small and Medium are unchanged; so are the other spots and `?canyonBed=old`.

## Crests and health (600 s; `scripts/crest-angle-report.ts`, seed 1, 64 components)

`crests.txt`; main's are canyon-beach-break's `crests.txt` (its layout is `?canyonBed=old`'s). |angle| p90, °, by band
across shore from the take-off: seaward of it; its 30 m; inside to halfway to the beach; the rest. Against the Beach's p90
(2.6, 8.4, 10.4, 11.5°; its edge chevron 2 × p90). Station groups: the open water; the up-coast peak's −x arm (x −165 to
−120); its +x arm, and on B the bowl (x −105 to −15; main's to −45); main's reef (x −30 to 45) or B's channel (x 0); the
down-coast peak's arms (x 75–120 / 135–165).

| Medium: main → B | Beach | Open | Up peak, −x arm | Up peak, +x arm (B: and bowl) | Reef → channel | Down peak, arms | Edge chevron −x / +x |
| --- | --- | --- | --- | --- | --- | --- | --- |
| seaward | 2.6 | 5.1 → 5.3 | 7.9 → 7.8 | 8.4 → 7.6 | 8.0 → 6.4 | 6.2 / 5.4 → 5.7 / 5.4 | 9.0 / 7.3 → 9.1 / 7.0 |
| take-off | 8.4 | 8.7 → 7.2 | 11.2 → 11.5 | 13.1 → 10.7 | 16.7 → 7.1 | 12.9 / 6.1 → 6.8 / 5.9 | 13.7 / 7.4 → 12.9 / 6.9 |
| inside | 10.4 | 16.6 → 14.7 | 19.9 → 19.8 | 21.4 → 18.1 | 25.6 → 14.8 | 23.5 / 14.3 → 16.5 / 13.6 | 21.4 / 20.5 → 22.3 / 19.3 |
| inner | 11.5 | 17.6 → 15.2 | 23.8 → 23.6 | 20.6 → 25.2 | 30.4 → 15.9 | 20.9 / 19.8 → 20.9 / 19.0 | 23.1 / 23.8 → 22.3 / 21.2 |

| Big: main → B | Beach | Open | Up peak, −x arm | Up peak, +x arm (B: and bowl) | Reef → channel | Down peak, arms | Edge chevron −x / +x |
| --- | --- | --- | --- | --- | --- | --- | --- |
| seaward | 2.6 | 5.0 → 5.3 | 8.0 → 8.1 | 7.1 → 6.8 | 6.2 → 6.4 | 5.8 / 4.8 → 5.8 / 4.8 | 11.6 / 6.4 → 11.5 / 6.4 |
| take-off | 8.4 | 5.0 → 5.7 | 7.0 → 7.3 | 9.4 → 7.3 | 10.1 → 6.9 | 7.3 / 5.4 → 6.4 / 5.1 | 8.2 / 5.6 → 9.2 / 5.5 |
| inside | 10.4 | 9.6 → 8.8 | 11.5 → 9.9 | 16.7 → 10.6 | 17.6 → 8.4 | 14.3 / 8.1 → 10.4 / 8.1 | 14.3 / 10.6 → 15.5 / 10.8 |
| inner | 11.5 | 12.8 → 12.9 | 20.3 → 21.3 | 19.7 → 23.6 | 24.5 → 16.5 | 20.0 / 17.5 → 17.0 / 17.5 | 20.6 / 19.7 → 21.5 / 19.6 |

- **The edge chevrons are main's** at both sizes (within 1°). Inside the take-off they are within the Beach's 2 × p90
  (16.8, 20.8, 23°) but for Medium's −x edge in the inside band, 22.3° (main's 21.4°).
- **With the reef gone, the crests are straighter** from the take-off line to halfway to the beach: the channel reads
  7–15° p90 where main's reef read 10–26°, and the up-coast peak's +x arm 7–18° against main's 9–21°.
- **Near the beach, over the bowl, they bend more:** the +x arm and bowl group reads 25.2° at Medium and 23.6° at Big in
  the inner band, against main's 20.6 and 19.7° there. The bowl breaks, and its broken crest lags the water either side,
  as main's reef did (its 30.4 and 24.5°).
- **Crests from two sides** (the outer thirds of the window leaning opposite ways, each past 5°):
  - seaward of the take-off line and inside it, 0–6 a band, as main's (Medium 1 of 800, 0 of 135, 1 of 235; Big 6 of
    526, 1 of 130, 0 of 380);
  - **in the inner band, more than on main:** 12 of 202 at Medium and 34 of 320 at Big, against main's 0 of 0 and 3 of
    112. Main's report followed few whole crests across the window there; B's follows many more.
  - The outer thirds' signed medians are near main's: Medium −8.6 / +1.6° (main −7.6 / +1.0°), Big −5.6 / +1.4° (main
    −6.1 / −0.5°). So the typical crest's shape near the beach is main's, with the +x third leaning a little more.
  - Not resolved here: whether the extra two-sided crests come from the channel (the 5 m floor where main's reef was)
    or were there on main unseen. An open item for the owner's eye (the shot list).
- **Health over the 600 s:**
  - Medium: the fastest water 4.94 m/s (main 7.18); no Froude cap; volume 0.50 % (main 0.58 %); finite.
  - Big: 7.01 m/s (main 8.42); 4 Froude caps, none in water (main none); volume −0.33 % (main −0.46 %); finite.

## The start and the catch

**The take-off and the start did not move.** The up-coast bar's tip and its −x arm are unchanged, value for value:
- `CANYON_TAKE_OFF_DEPTH` and `CANYON_RIDE_LINEUP` are as on main;
- the starts lie 103, 134 and 183.5 m from the waterline at Small, Medium and Big;
- so `SWELL_SURF.canyon` was not re-measured: the set faces at the start are within 0.02 m of main's (below).

**The catch** (`docs/research/canyon-catch-2026-10-29/catch-probe.ts --strokes feather`, B and `--bed old` on this
branch; headless riders paddling for the waves from the default start, as canyon-catch; `runs/catch-*.txt`). Each cell:
rides out of the tries. A ride is standing at least 2 s on the face ahead of the crest. The misses are all "no cue" or
"left on the crest": no rider fell or was caught by white water on either bed.

**Medium** (start 9 m out, 2.68 m deep, 134 m from the waterline; seeds 1 and 2 pooled):

| Script | Sets: B | Sets: main | All waves: B | All waves: main |
| --- | --- | --- | --- | --- |
| good | 5 of 8 | 6 of 8 | 7 of 23 | 8 of 23 |
| early | 6 of 8 | 7 of 8 | 9 of 23 | 9 of 23 |
| late | 5 of 8 | 5 of 8 | 7 of 23 | 7 of 23 |
| lift | 5 of 8 | 6 of 8 | 7 of 23 | 8 of 23 |

**Big** (start 3 m out, 3.67 m deep, 183.5 m; seed 1):

| Script | Sets: B | Sets: main | All waves: B | All waves: main |
| --- | --- | --- | --- | --- |
| good | 3 of 5 | 4 of 5 | 6 of 14 | 8 of 14 |
| early | 5 of 5 | 4 of 5 | 8 of 14 | 8 of 14 |
| late | 3 of 5 | 3 of 5 | 6 of 14 | 6 of 14 |
| lift | 3 of 5 | 4 of 5 | 6 of 14 | 8 of 14 |

- **About main's:** 35 of 52 set tries against 39 of 52. Medium's seed 2 is identical on both beds. On Medium's seed 1
  and Big's, B's riders were left on the crest of one more set in good and lift.
- The tip and its −x arm are main's. The +x arm at 32° is within 0.02 m of main's for 10 m from the tip, so the sea at
  the start differs only slightly: the sets' faces there are 1.65, 1.60 and 2.30 m against 1.67, 1.62 and 2.29 m.
- The rides look alike on both beds: the pop 0.95–1.25 s after the crest passes the start at Medium and 0.5–0.8 s at
  Big, on a face of 14–19°, 0.6–0.9 of the way up.
- canyon-catch's figures (2026-10-29: 25–50 % of sets) were on older code; both beds here run this branch's.

## Cost

`step-bench.ts` (canyon-beach-break's): the game's sea at Medium, 64 components, stage 2 on the CPU, 150 steps of 1/30 s
after the spin-up, B and old alternately, twice each, on a quiet machine (`cost.txt`).

| | Cells | Step p50 | Mean | p95 |
| --- | --- | --- | --- | --- |
| B | 400 × 451 | 83.1 and 82.8 ms | 83.2 and 82.9 ms | 83.4 and 83.3 ms |
| old (main) | 400 × 451 | 161.8 and 160.4 ms | 127.4 and 126.4 ms | 162.4 and 161.3 ms |

- **The grid and the fields are the same.** The difference is the solver's CFL substeps.
  - Old's faster water (its rip and reef: 7.18 m/s at most over 600 s at Medium, against B's 4.94) needs two substeps
    on about half its steps (71 of 150 in a check), B's on none.
  - So B's step costs about a third less on average, and every step costs the same.
- Neither threw a lip jet in the bench's 5 s.

## Strips (the water sheet, `?inpage&waterSheet&spot=canyon&swell=<size>&compute=gpu&graphics=ultra`, Rich, midday)

Each strip is 12 frames, one a second (`window.waterSheetStrip`).
- **From above** (eye 120 m over x −70, z −112): the up-coast peak on the right, the bowl's rock patch on the left of
  the middle, the channel at the far left. +x runs right to left, the beach is at the top.
  - `strip-medium-above.jpg`: a wave starts breaking at 2 s, at the tip and in a patch on the +x arm, which join by
    4 s. The line then runs down the arm, past the bowl's rock patch (7–9 s), and stops at the channel (10–11 s).
  - `strip-big-above.jpg`: Big breaks further out, and its line spans the peak and the bowl. Shot before the bowl's
    drawn curl was sized on its face at Big (below); from 120 m up the curl's height does not show.
  - `strip-old-medium-above.jpg`: main's Canyon (`?canyonBed=old`) from the same eye, for comparison: the reef and its
    rip at the left, the bar's +x arm ending at the rip.
- **From the start camera** (the spectator's overview, as canyon-beach-break's: 70 m beside and 95 m inshore of the
  take-off, 16 m up, looking out at it): `strip-medium-start.jpg` and `strip-big-start.jpg`. The tip is left of
  centre, far out; the bowl lies in the foreground on the right. The Big one was shot after the curl fix.

## The bowl's transect for the Basilisk cases

Along +z through the middle of the whole bowl: u 72.5, x −39.5, at mid tide (`Bathymetry.ts`, `createSpot('canyon')`).
Depths in m:

| z | −265 and seaward | −250 | −235 | −220 | −197 | −177 | −157 | −137 | −117 | −113 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| depth | 6.00 | 5.74 | 5.07 | 5.00 | 4.71 | 4.31 | 3.91 | 3.51 | 3.11 | 3.03 |

| z | −109 to −93 | −89 | −85 | −81 | −77 | −73 | −69 | −65 | −61 | −57 | −53 | −49 | −45 | −41 | −37 | −33 | −25 | −17 | −13 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| depth | 3.00 | 2.95 | 2.78 | 2.56 | 2.33 | 2.11 | 1.89 | 1.67 | 1.45 | 1.22 | 1.20 | 1.20 | 1.29 | 1.42 | 1.51 | 1.43 | 1.27 | 1.11 | 0.87 |

- **Seaward:**
  - the solver's tank: 7.9 m under its relaxation zone (z −480 to −390), blended into the spot's bed by z −330
    (`tankLayout`, `tankDepth`; the same at every size);
  - the spot's 6 m floor to z −265, its edge rounding down to 5 m by z −220;
  - then the bar's 1:50 from 4.9 m.
- **The platform:** 3.0 m, level from z −111 to −91.
- **The knee:** rounded ±4 m about z −89.
- **The face:** 1:18 along +z, from 3.0 m at z −89 to the crest's 1.2 m at z −57, 32 m.
  - Its contours run at 32° to the shore, with the arm's.
  - So the face's slope normal to its contours is 1:(18 cos 32°) ≈ 1:15.
- **The top:** 1.2 m, level from z −57 to −49.
- **The back:** 1:30 down to 1.51 m at z −37, where it meets the bar.
- **Inshore:** the bar's 1:50; the beach's 1:15 face from z −15; the waterline at about z 0; the tank's shore at z 30.
- Along the arm the bowl is whole over u 65–80 (x −47 to −32). It ramps in over u 55–65, and its crest backs off to
  2 m over u 80–88. Each transect there is the same profile, its z shifted with the bar's 1.9 m contour
  (`canyonBreakLineZ`).
- The waves at its middle (Medium, Hs 1.4 m, Tp 11 s; Big, 2.4 m, 14 s) break 1.2–2.4 m high at ξb 0.52–0.64 (above).

**The M4's earlier Canyon reef cases no longer apply** to the default layout: that reef (the 1:23 take-off transect from
the 6 m foot at x −9) is gone. They still describe `?canyonBed=old`. New cases would take the transect above.

## The switch and byte identity

- `?canyonBed=old` (`canyonBedSwitch`, `SurfZoneConfig.canyonBed`) runs `CANYON_BEACH`. It is main's layout at
  376d9cd4: its reef terrace, its rip and the +x arm at 40°.
- `pin-check.ts` steps each spot 60 steps on the branch and on a `git archive` of main 376d9cd4, then hashes the bed, h,
  qx, qz and the breaking strength (FNV).
  - The branch's `canyon old` hashes 110c2d83, as main's `canyon` does.
  - The Beach, the Point, the Reef, Padang Padang and the Pool hash the same on both.
- `pin-values.ts` prints the readout, take-offs, starts, bounds and grid of each spot on both. The JSON is identical.
- The tests pin main's values on the old layout: `SurfZoneSimulation.test.ts`'s "rebuilds main's Canyon".

## Tests

No rider sessions; the catch probe's riders run outside the tests.
- `tsc -b`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude
  "**/SurfZoneRunner.test.ts"`): 314 files passed, 30 skipped; 2980 tests passed, 20 expected to fail, 36 skipped.
- `SurfZoneSimulation.test.ts -t "[Cc]anyon|[Bb]arrel|[Tt]ube|[Bb]oard|[Rr]ider|[Ss]urfer|[Rr]oller|[Pp]addl|[Dd]uck|[Ss]wim"`:
  27 passed, 77 skipped by the filter (1299 s).
- New and changed tests:
  - `Bathymetry.test.ts`: version B's bed (the tip and −x arm unchanged, the arm's angle, the bowl's transect, its
    platform, back-off, channel, rock, span and peel) and its breaking rules. The reef's tests run on `CANYON_BEACH`.
  - `SpillingCurl.test.ts`: the bowl's curl stands 0.40 H over the whole bowl at Medium and Big. The reef's curl tests
    run on the old layout.
  - `SurfZoneSimulation.test.ts`: main's Canyon rebuilt value for value on `?canyonBed=old`; the bowl's take-off on its
    face; the reef's tube, take-off and shoulder tests on the old layout.
  - `waveInfo.test.ts`: the readout's "Spilling peak into a plunging reef bowl".
  - `rockBed.test.ts`: rock on the bowl, sand on the bars and the channel; the old layout as before.
  - `OnlinePlay.test.ts`: the old layout's starts.

## Risks and open items

- **Medium's line reaches the bowl on two waves in five.** The rest stall on the arm 25–45 m from the tip, and the
  bowl breaks by itself a few seconds later. That is the beach-break stall, eased but not removed. Further steps would
  be the owner's call:
  - a steeper arm beyond u 25 (more breaking there, a faster peel);
  - or the bowl 10 m seaward (the advisor's alternative: Medium's sets on time, its small waves 1–2 s early).
- **Big's line is long, and its bowl plunges over 25–30 m**, at the top of the owner's 15–25 m.
- **The readout at Small** names a plunging bowl (ξb 0.56 at its take-off on the face), but Small's waves break on its
  crest and top, where they spill or barely plunge (0.28–0.44 measured). The readout reads every peak at one point, as
  the other spots' do.
- **The tube is off** at the Canyon. The bowl draws the spilling curl and the white water; its transect is fixed above
  for the Basilisk cases.
- **The rip current** in the channel beside the bowl (0.3–0.7 m/s, the advisor's inference) is not measured.

## Shot list for the owner

The Canyon, the default start (the up-coast peak), Rich water. The bowl is on the readout's left arm: ride left, toward
+x and the down-coast peak.

1. **Medium, ride the left into the bowl.** Take off at the start and go left down the line. Record:
   - whether the white runs ahead of you down the arm and on into the bowl (its dark rock patch) with no gap;
   - whether the wave stands up and pitches on the bowl, and where it backs off at the channel;
   - on waves where the arm's white stops, how the bowl breaks on its own a few seconds later.
2. **The same at Big.** The line should run the whole way more often; the bowl plunges over a longer stretch.
3. **The same at Small.** The bowl should only spill there; say whether that reads right.
4. **`?canyonBed=old` at Medium**, the same ride, for A/B: main's arm ends at the rip, and the reef breaks on its own,
   seaward.
5. **Paddle out and sit at the start** (Medium and Big) for a few sets: is it as easy to catch as main's?
6. **Crests near the beach:** from the start camera, watch the crests reaching the beach either side of the bowl and the
   channel. Do any look as if they come from two sides at once? (The report counts more than on main there.)
7. **The readout** (the HUD and the Wave Lab) on the up-coast peak: "Spilling peak into a plunging reef bowl" at Medium
   and Big; at Small it says the same, though the bowl only spills there.
8. **The look:** rock on the bowl and sand on the bars and the channel; the down-coast peak's A-frame as before.
