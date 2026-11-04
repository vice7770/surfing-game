# The Canyon's version C: one straight bank peeling from +x into the reef bowl (2026-11-03)

Branch `claude/canyon-c` from main at 4eee1e5f. The design is the water-physics advisor's ruling with the owner's decisions
(`advisor-ruling.md`, logged in `docs/research/water-physics/consult-log.md`). Wave work only: no rider sessions in tests,
no tube work at the Canyon.

## Where it stands (2026-11-04)

- **Built: change (a), the advisor's second ruling (`advisor-ruling-2.md`, §2a), the default.** The bank's breaking-age
  join is keyed to the bed: rule A (J 0) on its face, seaward of its edge line (`canyonBankEdgeZ`), the reef's gate (J 0.5)
  on its top, back and inside, blended over 3 m (`bankJoinBlend`) and fading with the bank past its tip; the bowl as
  built. `canyonJoin(x, z, …)` fills the solver's per-cell field at each cell's centre, which the CPU step reads and the
  device uploads (`deviceLayout().breaking.joinField`, read per cell in WGSL): parity by construction, tested.
  `bankGateFrom` now serves only `?canyonJoin=zone`, the head at ca567450.
- **Built behind a switch only: option (b), `?canyonRamp=half`** (the owner's call): the edge 2.4 m at the tip, not
  3.6 m (`CANYON_HALF_RAMP`), with its own take-off fit (`CANYON_HALF_TAKE_OFF_DEPTH`) and starts
  (`CANYON_HALF_RIDE_LINEUP`, the bank's offsets, checked). The default stays the full ramp with (a).
- **Pinned** (`runs/pin-2.txt`): every other spot hashes as on main 4eee1e5f; `?canyonBed=b` 316bb67a and `?canyonBed=old`
  110c2d83, as main's, and their values JSON is byte for byte main's; `?canyonJoin=zone` 13e8a1d8, the head's Canyon;
  `?canyonBed=b` with `canyonJoin: 'zone'` still 316bb67a. The default is new (c169eb09).
- **Measured** (the frame probe and `pool.mjs`, 12 periods a seed; the bars table below):
  - **(a) did what the ruling predicted at Medium and Small,** within its spread: the line's own +x end stays home (92 %),
    the −x end travels 19 / 39 m (6 m / 15 m limits; the head 19 / 22 m), 30–41 % of waves reach the join, and the bowl's
    end 5–11 %, as predicted (that still fails the ≥ 70 % ideal, the ruling's §7.1). Patches on 27 % of a wave's frames
    (the head 22 % over its 3 seeds, 50 % on seeds 1–2; the ruling ~40 %); the typical white grew 21 → 32 m.
  - **At Big, (a) bridged the line but it now runs too fast.** The −x end travels 78 / 95 m (the head 26 / 56 m), 91 % of
    the sets reach the join and 45 % the bowl's end (15 m rule), but Hutt's peel on every 20 m stretch from x 0 to 120 is
    24–27° (the head 35–45°; the ruling predicted 33–40°): below Walker's 30° on the whole bank. This is the ruling's own
    risk §5.2 ("Big's peel may run faster than its natural line once its sections are bridged"), measured. **Not fixed: it
    goes back to the advisor** (a physical change is theirs to name; see "What failed").
  - **The onset face** (bar 6): 14° at Medium (just on the bar), 16° at Big, but 12° at Small (the head ≈ 14°); ξb
    0.26–0.29 everywhere (the bar's 0.25–0.3).
  - **(b)** buys a cleaner line at Medium (patches 14 %, no white more than 10 m up the line on 79 % of waves) but its sets start at the
    tip (70 % within 10 m), its peel drops below 30° over x 20–100 at Medium and everywhere at Big, and at Big the line
    runs back up past the tip on two of three sets. See "What (b) buys and costs".
  - **The current** along the bank, **health** and **edges** are the head's (1800 s at Medium; every run finite, no Froude
    caps). **The cost:** C's CPU step 129 ms against B's 111 ms (mean, Medium), (b) 149 ms.
- **Provisional:** the full ramp's take-off depth and starts (`CANYON_BANK_TAKE_OFF_DEPTH`, `CANYON_BANK_RIDE_LINEUP`; the
  ruling's §4: keep them), the half ramp's (one to two seeds a size, no catch measured), `SWELL_SURF.canyon`.
- **For the owner:** ride the four layouts (the shot list at the end); the calls in the ruling's §7 and the Big peel.

## The bars: (a) and (a) + (b) against the ruling's predictions, the head and B

The solver's white (strength > 0.3), frame by frame every 8 steps (0.267 s); `pool.mjs` over the seeds. "6 / 15 m" is a
measure with both jump limits (the ruling's §7.3): the probe's own 6 m a frame (the end also stops in any frame its white
is not seen) and the advisor's relaxed 15 m rule (the end holds through unseen frames and stops at the first jump over
15 m). Sets: each seed's top third by height at the first break. The head is `?canyonJoin=zone` (ca567450's runs,
`runs/medium-s*.txt`, `big-s*.txt`, `small-s*.txt`, re-pooled in `runs/pool-zone-*.txt`); B is canyon-b's README
(`?canyonBed=b`: one line from its peak's tip down its +x arm into its bowl, 6 m limit, 0.25 s frames). The ruling's
predictions are from one seed × 92 s (§3).

**Medium** ((a) seeds 1–3, the head seeds 1–3, (a) + (b) seeds 1–2; `runs/pool-a-medium.txt`, `pool-zone-medium.txt`,
`pool-ab-medium.txt`):

| Bar | (a) predicted | **(a)** | Head | B | (a) + (b) predicted | **(a) + (b)** |
| --- | --- | --- | --- | --- | --- | --- |
| 1. The line's own +x end ≤ 10 m | ≥ 90 % | **92 %** (sets 85 %) | 92 % (100 %) | — | — | **96 %** (90 %) |
| 1. Any white ≤ 10 m up the line | ~50 % | **54 %** | 44 % | — | ~80 % | **79 %** |
| 2. Sets' first break x p10/p50/p90 (spread) | p50 ~105, ~45 m | **75/107/122 (47 m)** | 77/106/123 (47 m) | its tip | x 115–135 | **126/133/137 (12 m)** |
| 2. Spearman(x*, H); within 10 m of the tip | ~0.85; 0 | **0.85; 0 of 37** | 0.87; 0 of 39 | — | ~25 % near the tip | **0.87; 7 of 28 (sets 7 of 10)** |
| 3. −x end travel p50, 6 / 15 m | ~25 / ~45 m | **19 / 39 m** (sets 40 / 49) | 19 / 22 m | 41–59 m | ~30 / ~42 m | **31 / 44 m** |
| 3. To the join, 6 / 15 m | ~30 % | **30 / 41 %** (sets 8 / 31 %) | 26 / 31 % (0 / 7 %) | — | ~40 % (sets ~25 %) | **29 / 36 %** (0 / 20 %) |
| 3. To the bowl's end, 6 / 15 m | 5–15 % (sets 0–15 %) | **5 / 11 %** (sets 0 / 15 %) | 5 / 5 % (0 / 0 %) | 18 % | 15–25 % | **11 / 18 %** (0 / 0 %) |
| 3. Frames with a patch (median per wave) | ~40 % | **27 %** | 22 % | 14–37 % | 7–15 % | **14 %** |
| 3. Typical / longest white (p50) | — | **32 / 64 m** | 21 / 53 m | 50–63 / 94–111 m | ~40 m | **32 / 63 m** |
| 4. Peel (Hutt) on the bank; 20 m stretches < 30° | 40–70°; none | **35°; x 40–60 at 20°** (15 m path: also 0–20, 29°) | 47°; none | 37–47° | — | **29°; x 20–100 at 19–29°** |
| 5. The bowl's own breaks | about the same | **18 of 33** | 17 of 33 | 8–11 of 15 | — | **12 of 18** |
| 6. Onset face p50; ξb p50 (the bank's face) | ≥ 14°; 0.25–0.3 | **14°; 0.27** | ≈ 16°; ≈ 0.27 (bins) | — | — | **13°; 0.28** |
| 7. Take-off column x 75: start depth p50 / p90; first tenth z | p50 2.25 m | **2.38 / 2.78 m; −205.5** | 2.25 / 2.59 m; −191.5 | — | ~25 m seaward | **2.12 / 2.89 m; −211.5** |

**Big** ((a) seeds 1–2, the head seeds 1–2, (a) + (b) seed 1; `runs/pool-a-big.txt`, `pool-zone-big.txt`, `pool-ab-big.txt`;
seed 1 alone: `pool-a-big-s1.txt`, `pool-zone-big-s1.txt`):

| Bar | (a) predicted | **(a)** | Head | B | (a) + (b) predicted | **(a) + (b)** |
| --- | --- | --- | --- | --- | --- | --- |
| 1. The line's own +x end ≤ 10 m; any white up ≤ 10 m | — | **94 %; 52 %** | 100 %; 50 % | — | — | **69 % (sets 33 %); 44 %** |
| 2. Sets' first break x p10/p50/p90; sets within 10 m of the tip | — | **118/136/139; 64 %** | 124/138/139; 67 % | its tip | all at the tip | **123/139/140; 83 %** |
| 3. −x end travel p50, 6 / 15 m | ~110 m | **78 / 95 m** (seed 1: 112 / 112) | 26 / 56 m (seed 1: 40 / 40) | 54–82 m | — | **134 / 154 m** |
| 3. To the join, 6 / 15 m | ~45 % | **52 / 61 %** (sets 91 / 100 %) | 9 / 41 % (0 / 67 %) | — | — | **50 / 56 %** (100 %) |
| 3. To the bowl's end, 6 / 15 m | 20–40 % | **10 / 26 %** (sets 9 / 45 %) | 3 / 13 % (0 / 17 %) | 52 % | — | **13 / 44 %** (17 / 67 %) |
| 3. Frames with a patch; typical / longest white | ~15 % | **18 %; 49 / 105 m** | 24 %; 49 / 103 m | 16–39 %; 55–62 / 118–138 m | — | **25 %; 49 / 108 m** |
| 4. Peel (Hutt) on the bank; stretches < 30° | 33–40° | **25°; every stretch x 0–120 (24–27°)** | 39°; none | — | — | **26°; every stretch x 0–120** |
| 5. The bowl's own breaks | fall | **10 of 28** | 9 of 28 | 14–16 of 15–16 | — | **3 of 13** (head seed 1: 1 of 13) |
| 6. Onset face p50; ξb p50 | ≥ 14°; 0.25–0.3 | **16°; 0.29** | ≈ 19°; ≈ 0.27 | — | — | **15°; 0.29** |
| 7. Take-off column: start depth p50 / p90; first tenth z | — | **3.48 / 3.80 m; −251.5** | 3.07 / 3.62 m; −241.5 | — | — | **3.32 / 3.80 m; −251.5** |

**Small** ((a) seeds 1–2, the head seeds 1–2, (a) + (b) seed 1; `runs/pool-a-small.txt`, `pool-zone-small.txt`,
`pool-ab-small.txt`):

| Bar | (a) predicted | **(a)** | Head | B | **(a) + (b)** |
| --- | --- | --- | --- | --- | --- |
| 1. The line's own +x end ≤ 10 m; any white up ≤ 10 m | — | **96 %; 43 %** | 96 %; 33 % | — | **87 %; 53 %** |
| 2. Sets' first break x p10/p50/p90; Spearman | unchanged | **32/50/56; 0.63** | 33/50/57; 0.71 | its tip | **76/116/136; 0.90** |
| 3. −x end travel p50, 6 / 15 m | unchanged | **29 / 31 m** | 31 / 36 m | 44 m (its −x arm) | **15 / 15 m** |
| 3. To the join / the bowl's end, 15 m | 30–40 % / ~0 | **46 % / 0** | 52 % / 0 | — | **27 % / 0** |
| 3. Frames with a patch; typical / longest white | — | **34 %; 17 / 39 m** | 32 %; 18 / 43 m | 18 %; 61 / 95 m | **29 %; 17 / 41 m** |
| 4. Peel on the bank; stretches < 30° | — | **50°; none** | 46°; none | — | **27° (one stretch)** |
| 6. Onset face p50; ξb p50 | ≥ 14°; 0.25–0.3 | **12°; 0.26** | ≈ 14°; ≈ 0.25 | — | **13°; 0.25** |
| 7. Take-off column | — | **breaks only on the beach face** (z −20) | the same | — | **1.69 / 2.18 m; −163.5** |

What the numbers say:

- **Medium, (a): the ruling holds.** One direction kept; the line carries further (the 15 m end 22 → 39 m; its sets 24 →
  49 m) and in fewer pieces (the typical white 21 → 32 m), but only one wave in ten reaches the bowl's end, sets one in
  seven on the 15 m rule. The outside section backs off and the inside one runs: the ruling's §7.1, measured on 3 seeds.
- **Big, (a): bridged, too fast.** The −x end's speed along its path is 10–12 m/s against crests at 4.5–5.3 m/s, so
  α = asin(c/V) is 24–27° on every stretch; the head's Big peeled at 35–45°, near the bank's own 39° (asin(0.885 sin 45°),
  the first ruling). With rule A on the face the age spreads through the diagonals into a shoulder that, at Big, is near
  breaking along much of the face; the onsets come shallower-faced (16° against ≈ 19°). The line reaches the join on 91 %
  of the sets, but a rider would be running from a section closing at a quarter to a third of the wave's own speed.
- **Bar 6 at Small:** the face onset median is 12° (seeds 1–2), under the 14° bar; ξb stays 0.26. Small's sets break at
  x 32–56 and do not reach the bowl with or without (a) (the ruling's §7.4).
- **The bowl** breaks on its own as often as on the head at every size (bar 5): the ruling's "falls at Big" did not show.
- **Take-off (bar 7):** with (a) the sets break on the face at x 75 at Medium and Big (start depth p90 2.78 and 3.80 m
  against the provisional fit's 2.50 and 3.61 m): the fit is now shallow by 0.2–0.3 m, so one set in ten breaks just
  outside the start; kept provisional, as the ruling says. At Small nothing breaks on the bank at x 75 (its sets break
  down the line, at x 32–56): the start sits on unbroken water there (as on the head).

## What (b) buys and costs (`?canyonRamp=half`, the owner's call)

- **Buys, at Medium:** a cleaner line. Patches on 14 % of a wave's frames (a: 27 %), no white more than 10 m up the line
  on 79 % of waves (a: 54 %; the line's own +x end 96 %), the −x end 31 / 44 m and the bowl's end 11 / 18 % of waves (a: 5 / 11 %). The
  sets break on the face, 23 m seaward of the 1.68 m edge at x 75 (the ruling: ~27 m).
- **Costs:**
  - **Where the sets start:** at the tip. Medium's sets break at x 126–137 (12 m spread, 70 % within 10 m of the tip;
    the ruling predicted ~25 %), Big's at 123–140 (83 %): the first break no longer moves with each wave's height at
    Big (Spearman 0.54).
  - **The peel:** below 30° over x 20–100 at Medium (19–29°) and on every stretch at Big (24–28°).
  - **One direction at Big:** the line's own +x end runs more than 10 m back up past where it started on 5 of 16 waves,
    4 of 6 sets (it does not on the full ramp: 94–100 %).
  - **Small:** its sets move up the line (x 76–136) and their line travels 15 m; nothing reaches the bowl.
  - **The surf at the start:** Medium's band reads 1.36 / 1.47 m (typical / sets), against 1.78 / 1.98 m with (a): the
    waves have broken up the line before they reach x 75.
  - **The cost:** 207 of 300 steps took two solver substeps (C 136, B 106): the CPU step's mean 149 ms against C's 129 ms.
- **Its starts:** the take-off fit through the column's p90 start depths (2.18, 2.89, 3.80 m at Small, Medium and Big):
  1.30 + 1.06 Hs, so the take-off lies at z −179.5, −203 and −249.5, 3.5, 12.5 and 10 m further out than the full
  ramp's; the bank's offsets (6 / 9 / 3 m) put each start seaward of where one wave in ten first broke there (z −163.5,
  −211.5 and −251.5): −185.5, −212 and −252.5. No catch was measured (no rider sessions).

## What failed, for the advisor

1. **Big's peel under (a):** 25° median, 24–27° on every 20 m stretch from x 0 to 120 (2 seeds, 96 stretches), against
   the predicted 33–40° and the head's 39°. The risk the ruling names in §5.2. A physical lever is the advisor's to name
   (for instance, where on the face rule A should give way to the gate at Big's depths); nothing was tried here.
2. **Bar 6 at Small:** the face onset 12° (< 14°), the head ≈ 14°; at Medium 14°, exactly on the bar.
3. **Medium's −x end on the 6 m limit:** 19 m, as the head's (predicted ~25 m); on the 15 m rule 39 m (~45 m). Within
   the ruling's one-seed spread; its sets travel 40 / 49 m.
4. **(b)'s first breaks:** 70 % of Medium's sets within 10 m of the tip against the predicted ~25 %.
5. **The bowl's own breaks at Big** did not fall (10 of 28 against the head's 9 of 28).

## The current, the cost and health

- **The current along the bank** (`crest-current.ts`, (a), Medium seed 1, 1800 s; `runs/crest-current-a-medium-s1.txt`;
  the head's `crest-current-zone-medium-s1.txt`): toward the bowl along the bank's line, the mean flow over each 100 s
  window ending at 600 / 1200 / 1800 s: **0.36 / 0.31 / 0.45 m/s** (p90 |v| 0.69 / 0.62 / 0.65); the head 0.35 / 0.31 /
  0.45. Over the inside 0.21 / 0.11 / 0.18 (the head 0.22 / 0.13 / 0.19); the bowl |v| 0.44 / 0.41 / 0.42; the channel
  0.03 / 0.03 / 0.10. Under Komar's 1.9 m/s bound and the advisor's 0.5–1.5 m/s.
- **Health:** every run finite with no Froude caps: the frame probe's fastest water 3.0–5.6 m/s and the volume within
  0.43 % over 12 periods ((a) and (b), all sizes; `runs/*.txt`'s last lines); the 1800 s run 6.24 m/s, volume 0.33 %
  (the head 5.91 m/s, 0.33 %).
- **The edges:** the crest lines and the edge chevrons are the head's to a tenth of a degree (the bank's take-off band
  6.6 / 15.3° p50 / p90 against 6.7 / 15.0°; the +x edge chevron 8.7 / 17.3° against 8.6 / 17.2°); crests two-sided
  (outer thirds past ±5°) 6 of 683, 5 of 106, 37 of 330 and 13 of 200 from the seaward band in, the head 6, 5, 39 and 26.
- **The cost** (`step-bench.ts`, Medium, 300 steps after the spin-up, CPU, `runs/cost.txt`): C 92 ms p50, 129 ms mean
  (136 of 300 steps two substeps); B 83 ms, 111 ms (106); (b) 175 ms, 149 ms (207). C's mean +17 % on B's (its cells
  +12.4 %); the join keyed to the bed costs nothing at the step (the field is filled once).

## The switches

- `?canyonJoin=zone`: the bank's join by its take-off zone (rule A to x +31, the gate up the line), the head at ca567450.
- `?canyonRamp=half`: the edge ramp halved (`canyonBed` 'half'), with its own take-off and starts; with `?canyonBed=b` or
  `=old` those win.
- `?canyonBed=b` (`CANYON_B`) and `?canyonBed=old` (`CANYON_BEACH`), as before.
- Online rooms pin all of them to the default (`main.ts`: `canyonBed: 'reef'`, `canyonJoin: undefined`).

## How to verify

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`.
- `npx vitest run src/wave/SurfZoneSimulation.test.ts --maxWorkers=3 -t "[Cc]anyon"`.
- The pins: bundle `pin-check.ts` (with `--switches`) and `pin-values.ts` against a `git archive 4eee1e5f`, the head
  `git archive ca567450` and the branch (`pin-values.ts` with `--bed b`, then `--bed old`) and compare (`runs/pin-2.txt`).
- The bars: bundle `frame-probe.ts` and run it per size and seed with `--periods 12 --json <file>` (`--bed half` for
  (b), `--join zone` for the head), then `node pool.mjs <a.json>,<b.json>,…`; `strip.mjs` tiles its `--stills`.
- **Last run** (`runs/tests.txt`): both type-checks clean; the main suite 313 files passed, 3008 tests passed, 20 expected
  fails (as before), 37 skipped, and 2 suites failed only because this sparse worktree lacks a tracked data file
  (`round6-tube-profiles/data/padang-ray-L11-profiles.json`; with it restored they pass, 16 tests); the Canyon subset 21
  passed. New tests: the join on and off the face, the zone rule, the half ramp's geometry and starts, the two switches,
  the per-cell field (B and A unchanged by the rule) and the device's z-keyed field. Changed: `Bathymetry.test.ts`'s
  `canyonJoin` calls take z (the signature), and its version C join test is split into the bed rule and the zone rule.

## The stills (`top-*.jpg`, the solver's white from above, seaward up, +x to the right, one set's line every 3–8 s)

- `top-a-medium-s1.jpg`: (a), a set first breaking at x 47 runs down the bank toward the bowl (t 100–116 s).
- `top-ab-medium-s1.jpg`: (b), a set breaking at the tip (x 130) and its line down the face (t 132–150 s).
- `top-a-big-s1.jpg`, `top-ab-big-s1.jpg`: Big's tip sets and their long lines down the bank (t 103–141 s).

## The bed (`src/wave/Bathymetry.ts`, `CANYON`'s `bank*` keys; the ruling's §1–4)

- **The bank:** its 1.9 m contour (the bowl's crest contour) runs straight at 45° to the shore from the join (x −22,
  z −67.3) out to its tip at x +140 (z −229.3), and the bank fades into the floor over x +140…+165, clear of the +x open
  edge's 20 m band.
  - **The join** is the flipped bowl's seaward (+x) end: B's bowl's −x end (u 55 from B's up-coast tip) mirrored, on its
    base bar's crest contour (`canyonBankJoin`). Re-deriving it after the flip, as the ruling asked, puts the bank 18 m
    further out than the advisor's sketch, which ran it through B's +x end (−24, −47): the flipped bowl's +x end lies 20 m
    further out than B's.
  - **The face:** 1:44 along +z, planar, from the floor up to the edge.
  - **The edge** (the top of the face): 1.2 m deep from the bowl to x +31, deepening linearly to 3.6 m at the tip
    (0.022 m per m). Each depth's contour is straight at 45° and ends where the edge reaches it.
  - **Behind the edge:** level for 8 m, then down at 1:30 to the inside, max(2 m, edge + 0.5 m), which the 1:15 beach
    face closes.
- **The bowl, flipped:** B's bowl and the bar under it, mirrored along shore about x −39.5 (the middle of the whole bowl,
  where its readout reads its breaker). Over the whole bowl and its back-off (x −55…−32) the bed is B's at the mirrored
  x, value for value: its transect (platform, knee, 1:18 face, 1.2 m crest, top, back), rock, rules and curl. It ramps in
  at its +x end (x −32…−22), where the bank fades out over the same 10 m, and backs off at its −x end (x −55), its base
  bar fading into the floor over 15 m to x −70.
- **The channel:** the plain floor and beach face from x −70 to the −x edge: 5 m inside z −230, the 6 m platform
  seaward of −260. Both A-frames are gone.
- **The tank:** the zone's inner edge moves from z −390 to −446, so the blend ends 20 m seaward of the tip's 5 m foot
  (z −365.7, `canyonFootZ`), the advisor's margin: 56 m, not the advisor's 40 m, because the join moved 18 m out.
  400 × 507 cells against B's 400 × 451 (+12.4 %).

## The spot's settings (`src/wave/SurfZoneSimulation.ts`)

- **The front:** `SPILLING_FRONT.canyon.direction` −1 (the bowl's own waves peel −x); B and A keep +1.
- **One beach-look group** for the bank (`CANYON_BANK_LOOK`): the beach peaks' 20° cap and no upcoast gate, each wave
  kept 30 s, not 20 s: the bank's line runs 162 m along shore from the tip to the bowl at 6.3–8.6 m/s (the advisor's peel
  speeds along the line, 8.9–12.1 m/s, times cos 45°), 19–26 s. The bowl's own front takes over where it ramps in.
- **The start:** x +75 for every size (`CANYON.takeOffX`), on the bank's face where it is as deep as the sets start
  breaking there, no shallower than the edge (2.17 m at x 75); with `?canyonRamp=half`, by its own fit
  (`CANYON_HALF_TAKE_OFF_DEPTH`).
- **The readout:** "Spilling bank into a plunging reef bowl, right …°" (the bank's −x arm's peel and the bowl's breaker;
  the bank's breaker at the start).
- **The bank's breaking age** (`canyonJoin`): rule A on its face, the reef's gate behind its edge (change (a), above);
  `?canyonJoin=zone` gives the take-off zone's gate.
- **Switches:** `?canyonBed=b` (`CANYON_B`), `?canyonBed=old` (`CANYON_BEACH`), `?canyonRamp=half` (`CANYON_HALF_RAMP`) and
  `?canyonJoin=zone`; online rooms run the default.

## The owner's shot list (wave work only; you ride, record and say what you see)

Solo Canyon. Facing out to sea from the lineup, the bank's tip is to your right (+x) and the bowl to your left (−x); the
waves peel toward the bowl, a right-hander as you ride in. Record two or three sets per row from the overview camera and
one ride from the front.

| Layout | Size | Where to sit | What to look for |
| --- | --- | --- | --- |
| Default (no switch; change (a)) | Medium | The spawn (x +75; 9 m outside the take-off) | Sets break up the line (x 75–122, 107 at the median: 30 m up) and come down to you. Does the white run on toward the bowl without gaps, or back off at x 60–75 and restart inside? About 1 wave in 3 should carry to the join (where the dark rock starts), 1 in 10 to the bowl's end. The line itself should not run back up the line (92 %), though on half the waves another patch breaks up the line on the same crest. |
| Default | Big | The spawn (3 m outside) | Sets break near the tip (x 118–139), 45–65 m up the line, and run the whole bank. The question: can you stay ahead of it, or does it close down on you (it measures 24–27°, fast)? Most sets reach the join. |
| Default | Small | The spawn, then paddle 20–40 m toward the bowl | Small's sets break down the line of the start (x 30–55); at x 75 nothing breaks on the bank. Is Small worth riding here, and from where? Nothing reaches the bowl's end. |
| `?canyonRamp=half` | Medium | The spawn (12 m further out than the default's) | The sets start at the tip (x 125–137), 55 m up the line; the line should look cleaner (fewer patches). Is it too fast in the middle (x 20–100)? Do you like starting the ride further out? |
| `?canyonRamp=half` | Big | The spawn | Everything breaks at the tip; on two sets in three the line's own end also runs more than 10 m back up the line (+x). Does it read as one direction? |
| `?canyonJoin=zone` (the head, ca567450) | Medium | The spawn | The stalling line before (a): white sections dying over the inside and restarting. Compare it with the default, one set after another. |
| `?canyonBed=b` (version B) | Medium and Big | Its own spawn (x −112, the old peak) | B's peak into its bowl, for the comparison: its lines run 40–80 m and reach the bowl's end on 18 % (Medium) and 52 % (Big) of waves. Which do you prefer to ride? |

For every row: does the bowl break on its own before the line arrives (it does on about half the waves at Medium), and
does any wave come from more than one side?
