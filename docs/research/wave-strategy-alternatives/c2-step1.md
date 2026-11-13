# C2, step 1: the Basilisk side, and the pool library's runs (2026-11-13)

Tags: [M] measured here, [C] read in the code, [R] reasoned, [P] provisional.
For the route C2 (the owner's choice: "the whole breaking wave from the Basilisk library"). The plan is `c2-plan.md`,
steps 1 and 2; the advisor's decisions are `ruling-28-c2-plan.md`. No game code was changed (`src/` is as it was).
The owner's decision (2026-11-13): run the pool library at level 12 on the M1 first.

## 1. What changed

All in `tools/basilisk/` (plus three options in this folder's sea probe).

- **`periodic.c`: QOUT.** A new opt-in output, like VELOUT. With `-DQOUT`, every fine frame also writes `q/q<t>.dat`:
  one row per x bin over the whole domain, `x bed h q top air`.
  - `h`: the water's volume per unit width (f less the bed's fraction).
  - `q`: the integral of u.x over the water (the flux).
  - `top`: the highest water in the bin.
  - `air`: the air under the top (the tube, bubbles, the bore's froth). It is counted on the finest columns
    (L0/2^LEVEL), each below its own top, so a sloping surface does not count as air.
  - The bin is L0/2^(LEVEL−2) by default (`QDX`): 0.0625 h0 = 0.31 m at level 12 and 5 m.
  - Without `-DQOUT` the code and the files are as before.
- **`run_periodic.sh`.** `QOUT=1` adds `-DQOUT` to phase 2 only (as `VELOUT=1`) and makes `q/`. Nine new case lines,
  `pool_c2_<bed>_<a0>` (section 4).
- **The longer, wider runs.** `analysis/crest_track.py` has two new options, `--after` (the end after touchdown,
  default 3) and `--ahead` (the window past the vertical place, default 8). `canyon_pipeline.py`'s `EARLY` gives the
  C2 cases lead 10, library 8, after 8, ahead 20. So their fine frames run from 8 before the face goes vertical to
  touchdown + 8, and the window reaches about 58 h0. On `pool_straight_big`'s scout this gives switch 18, end 39,
  window 25–58 (today's case: 23, 34, 31–47) [M].
- **`canyon_pipeline.py`.** A third batch, `c2`, for the nine cases. Its report goes to `docs/research/pool-c2-library/`
  and its `.bin` files to `barrels/` there, never to `public/barrels`. Its phase 2 builds with `VELOUT=1 QOUT=1`. After
  the usual analysis it runs `c2_library.py` for every case whose face went vertical (a tube or not), and copies the
  file into `data/`.
- **`analysis/c2_library.py` (new).** It writes `<run>_c2.json.gz` (gzipped JSON), per case:
  - every fine frame from τ −8 to the end, as 128 points with the landmarks at today's indices;
  - before the throw, the crest-to-toe arc is spaced by arc, with the lip and the throat at their shares in the
    throw's frame (ruling 19). From the throw on, the frame's own landmarks, as today;
  - per frame `use`: "own" (clean, or only `jump_lip` before the throw: ruling 20) or "refill" (any other flag);
  - the path table per frame: crest place and height, the trough ahead, H, the still depth under the crest d, H/d,
    the crest's speed, the face's angle. These come from the phase's crest track, which does not jump to another crest;
  - checks on the path: d falling and H/d rising over τ −8 to 0 (smoothed over 0.5);
  - the water's velocity at two depths at every profile point (1.5 cells under the surface, and 0.1 h0), from VELOUT;
  - from QOUT, every 0.1 √(h0/g): the columns (h, q, top, air share) over the window, at 0.25 h0;
  - the bore from touchdown on: its front (the steepest falling top, followed from frame to frame), its top and its air
    share; and the bore front's speed;
  - the QOUT mass check: the domain's water in every fine frame against the first frame's.
- **`analysis/periodic_library.py`.** `build()` takes an optional `capture` list (c2_library.py uses it). Without it the
  output is the same.
- **`t5-sea-probe.ts` (this folder).** Three options: `--deltas`, `--case-bin` (the "lib" columns and the case's scale
  from another case file, such as T5's), `--keys` (the library keys, section 3). Without them it runs as before.

Not done in step 1 (it is game-side or later): `scripts/barrel-library.ts --format brl3`, `src/wave/library/*`,
the state matching in code, the leave-one-out and reproduce bars.

## 2. Checks

**Byte-identical compile lines [M].** `run_periodic.sh flags` for every case, on `origin/main` and on this branch, three
ways: plain, `LEVEL2=14 BO=4000`, `VELOUT=1 LEVEL2=13`. The first 50 lines (all the old cases, `pool_far_big`
included) are byte for byte the same in all three. The only new lines are the 18 of the nine C2 cases.

**`crest_track.summarise` [M].** On `pool_straight_big`'s committed scout track, main's and this branch's give the same
output with the defaults and with T5's 10 and 8.

**The smoke run [M].** One C2 case line (`pool_c2_b1_a2` with a provisional bed, A0 0.258) through the whole
pipeline, at scout level 9, phases 8 and 9 (`SCOUT_LEVEL=9 LEVEL1=8 LEVEL2=9`, scratch `RUNS` and `CANYON_OUT`), on the
M1. Phase 2 was then run again with the final `periodic.c` (the QOUT top and air fix), and `c2_library.py` on it.
- The plumbing works: scout, the frozen window (switch 22, end 41, window 29–60), phase 1, phase 2 with VELOUT and
  QOUT, the analysis, the C2 file (0.71 MB for 658 frames).
- **QOUT mass: constant within 0.0056 % over 760 frames** (largest drift from the first frame 5.6e-5, largest step
  between two frames 5.8e-7). The bar is 0.1 % per frame: **pass.**
- Velocity found at 80 449 of 84 224 profile points (95 %).
- At level 9 the case has no "pre-touchdown" lip (no jet 3 cells off the face), so no `.bin`. That is the coarse grid.
  The C2 file is written anyway.
- Level 9 is coarse, so these are only plumbing numbers: 371 of 658 frames are "refill" (most after touchdown), and
  H/d goes the wrong way in 13 % of the smoothed steps. Read them again at level 12.
- QOUT's air before the break: under 0.02 on the plain wave (0.0006 at level 8 on the still train).

## 3. The pool's measured keys

How [M]: `t5-sea-probe.ts --keys` on the game's own config, `?poolSize=ref&wallBody=stream&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug`
(the 311 m window and the long reach), CPU sea, 300 s, every front point at its throw from 60 to 270 s: 1776 points on
73 fronts. For each point, along its ray (the front's normal at the throw), Δ seconds before the throw: the sea's crest,
the still depth under it (d_h), the bed's slope along the ray from there to the throw place (a fit), the reef crest's
depth along the ray, the throw place's depth, and the game's foot crest. Output: `c2-step1-keys-run.txt`.

At the hand-over (Δ = 5 s; median, 10–90 %, 1–99 %):

| Key | Median | 10–90 % | 1–99 % |
|---|---|---|---|
| h0, the platform's depth (m) | 5.0 | 5.0 | 5.0 |
| slope along the ray, S | 0.071 | 0.055–0.090 | 0.038–0.102 |
| reef crest's depth along the ray, HS (m) | 1.00 | 1.00–1.12 | 1.00–1.46 |
| HS/h0 | 0.20 | 0.20–0.22 | 0.20–0.29 |
| A0 = foot crest / foot depth (the game's) | 0.250 | 0.219–0.290 | 0.199–0.332 |
| still depth under the sea's crest, d_h (m) | 4.57 | 3.81–5.00 | 3.29–5.00 |
| d_h / h0 | 0.91 | 0.76–1.00 | 0.66–1.00 |
| the sea's H / d_h | 0.28 | 0.22–0.36 | 0.15–0.46 |
| the throw place's depth (m) | 2.19 | 1.91–2.47 | 1.72–2.67 |
| T √(g/h0) | 14.7 (10.5 s) | | |

- At Δ 4.5 and 5.4 s the slope and HS are the same within 0.001 and 0.01 m; d_h moves with Δ.
- Along the reef: the near end (s 30–63 m) has the steepest rays (S 0.083) and the deeper crests (to 1.38 m); its
  crests 5 s out still stand on the platform (d_h 5.0). The middle (s 63–101) has S 0.065; the far third S 0.067.
- The fitted slope along the ray is steeper than the face's 1:9.5 × cos α (0.053 at the median cos α 0.51). The crest
  covers 33 m from 4.6 m to 2.2 m deep in the last 5 s, so 0.071 is what the wave meets. The library uses it.
- The platform is 5.0 m everywhere the rays start. The game's foot depth is 4.88 m [M].

**A0: by what measure? [M, R].** The foot crest gives A0 0.20–0.33. But the sea's H/d_h at 5 s is lower than any case
of that A0: its trough ahead is shallow (ruling 26). Case paths at d/h0 = 0.91, from level-10 scouts at 10.5 s on a
5 m platform [M]:

| Case A0 (H/h0 of the train) | H/d at d/h0 0.91 | at 0.85 | at 0.80 |
|---|---|---|---|
| 0.178 (0.25) | 0.226 | 0.261 | 0.300 |
| 0.261 (0.34) | 0.342 | 0.400 | 0.437 |
| 0.358 (0.44) | 0.470 | 0.546 | 0.619 |

So if a slice is matched on H/d at 5 s, the sea's median 0.28 sits between A0 0.18 and 0.26, and its lowest tenth
(under 0.22) below 0.18. If it is matched on the foot crest, 0.20–0.33. The library must hold both.
(These scouts are on S 0.0463; the paths on a steeper slope rise faster.)

## 4. The 9 cases chosen

**A0, 3 values: 0.15, 0.25, 0.355** (train H/h0 0.22, 0.33, 0.44; the A0 each gives is measured by its own scout).
- Not 0.355 ± 15 % as the plan wrote. That spread (0.30–0.41) is the game's case at its own scale (h0 3.45 m). On the
  real 5 m platform the pool's wave is A0 0.20–0.33 by its foot crest and lower by its H/d. 0.355 ± 15 % would leave
  nearly every slice outside.
- 0.15 holds most H/d matches at 5 s. 0.355 is today's case (T5's A0) and holds a bigger swell if the owner chooses
  one (ruling 26's 17 % gap: a swell 1.2 × bigger is A0 about 0.30). 0.25 is the pool's median.
- The H/h0 → A0 rule comes from three level-10 scouts at 10.5 s on a 5 m platform: 0.25 → 0.178, 0.34 → 0.261,
  0.44 → 0.358 [M].

**Beds, 3 points on one line of (S, HS/h0)** (a line of two straight pieces), from the gentlest rays to the steepest.
Most slices have HS/h0 0.20 at every slope; only the near end's steep rays reach 0.28. Each bed is a ray crossing a planar 1:9.5 reef at angle α, with cos α = S / 0.1053; its reef top is the
reference floor's 6.7 m `flatWidth` / cos α and its back slope `backSlope` × cos α, down to h0:

| Bed | S | HS/h0 | reef top (h0) | back slope | covers |
|---|---|---|---|---|---|
| b1 | 0.036 | 0.19 | 3.92 | 0.034 | below the 1 % slope (0.038) and the shallowest crest (0.20) |
| b2 | 0.068 | 0.205 | 2.07 | 0.065 | the median slope (0.071), the middle reef's 1.0 m crest |
| b3 | 0.105 | 0.30 | 1.34 | 0.100 | above the 99 % slope (0.102) and the 99 % crest (0.29); the ray square to the reef |

- h0 = 5 m, T = 10.5 s, domain 64 h0, Bo 1000, Re 40 000 (ruling 28), level 12 in the window.
- Every slice's S at the hand-over lies between b1 and b3 (the 1–99 % range is 0.038–0.102) [M].
- On HS/h0 the line is 0.19–0.21 from S 0.036 to 0.068, where most slices are (0.20); from 0.068 to 0.105 it rises to
  0.30, above most steep slices (0.20–0.28). A steep slice blended there gets a crest up to about 0.05 h0 (0.25 m) too
  deep. HS mostly shapes the bore, not the break [R].
- A first start (00:37) had b2 at 0.235; I stopped it in its scouts (no phase had run), set 0.205 and restarted at
  00:45.

The lines (`run_periodic.sh`, `name:h0:H/h0:T:S:HS:domain:switch:end:win0:win1:::top:back`; the switch, end and
window are provisional, the scout places them):

```
pool_c2_b1_a1:5:0.22:10.5:0.036:0.19:64:18:44:25:58:::3.92:0.0342
pool_c2_b2_a1:5:0.22:10.5:0.068:0.205:64:18:44:25:58:::2.07:0.0646
pool_c2_b3_a1:5:0.22:10.5:0.105:0.3:64:18:44:25:58:::1.34:0.1
pool_c2_b1_a2:5:0.33:10.5:0.036:0.19:64:18:44:25:58:::3.92:0.0342
pool_c2_b2_a2:5:0.33:10.5:0.068:0.205:64:18:44:25:58:::2.07:0.0646
pool_c2_b3_a2:5:0.33:10.5:0.105:0.3:64:18:44:25:58:::1.34:0.1
pool_c2_b1_a3:5:0.44:10.5:0.036:0.19:64:18:44:25:58:::3.92:0.0342
pool_c2_b2_a3:5:0.44:10.5:0.068:0.205:64:18:44:25:58:::2.07:0.0646
pool_c2_b3_a3:5:0.44:10.5:0.105:0.3:64:18:44:25:58:::1.34:0.1
```

## 5. The runs (level 12, on the M1)

Folder: `/private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/c2runs`
(called `c2runs` below), a `git archive` of this branch with `node_modules` linked; its `EXPORTED_FROM` says which
commit. The runs themselves are in `c2runs/tools/basilisk/runs/c2`; the report and the C2 files will be written to
`c2runs/docs/research/pool-c2-library/`. Copy that folder into the repository when the set is done.

- **Started:** 00:37, stopped in the scouts to fix bed b2, restarted at **00:45** (2026-11-13). Detached: `nohup`,
  `caffeinate -ims`, `nice 10` (so T5 and the surfer track's tests come first), the usual supervisor
  (`canyon_pipeline.py run -j 3`).
- **At most 3 at once** (one core each, about 210 MB of memory each at level 12). The costliest row (A0 0.355) first.
- **Levels:** scout 10, phase 1 10, phase 2 12: cells of 64/4096 h0 = 7.8 cm at 5 m in the window.
- **The scouts placed** [M]: b3_a3 vertical t 24.39 (2.0 m deep), switch 14, end 35.5, window 21–54;
  b2_a3 t 26.71 (2.3 m), 16.5, 36, 24–57; b1_a3 t 29.90 (3.0 m), 19.5, 39.5, 27–60.
- **Speed** [M]: the first round's phase 2s (A0 0.355, 20–21 √(h0/g) each) took about 3 to 3.5 hours each, with
  T5 still running beside them until 03:24.
- **Expected finish: about 10:30 on 2026-11-13** (three rounds of three, about 3.3 hours a round, plus the analysis;
  it could be 09:00–13:00: the smaller waves may cost a little less, the shared machine more).
- **Disk** [M]: at level 12 a frame is about 0.54 MB before the break (facets 0.12, velocity 0.37, columns 0.06);
  more after it. About 800 frames a case: 0.5–0.9 GB a case, **5–8 GB for the nine**. 21 GB were free at the start,
  so 13–16 GB stay free (the bar is 8 GB). Not tight, unless other work fills the disk.

**The first case done** (`pool_c2_b3_a3`, 04:03) [M]: A0 0.358, face vertical at t 24.08, touchdown 25.35, a tube;
phase 2 2h56. Its C2 file: 778 frames (700 "own", 78 "refill"), τ −8 to +11.4, velocity on every frame, 1.2 MB.
**QOUT mass at level 12: drift under 0.0004 % over 860 frames** (largest 3.3e-6, largest step 1.6e-7). d falls
monotonically before the throw; H/d steps the wrong way in 15 % of the smoothed steps, all at τ −8 to −7.5 and under
0.0004 (the wave on the flat platform: H/d is flat there). The bore front is followed for 102 frames, at 0.93 √(gh0).
Its run folder is 523 MB. So nine cases make about 5 GB of runs and about 11 MB of C2 files.

Commands (all safe to rerun):

```
bash /private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/c2runs/c2.sh status   # where each case is, with an ETA
bash /private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/c2runs/c2.sh log      # the supervisor's log
bash /private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/c2runs/c2.sh stop     # stop these runs only (prefix pool_c2)
bash /private/tmp/claude-501/-Users-vicentealmeida-Documents-ChatGPT-surfing-game/ccce9afb-c899-492c-81da-476154da18db/scratchpad/c2runs/c2.sh start    # start, or resume after a stop, a failure or a reboot
```

`c2.sh` sets `TUBE_SET=pool`, `RUNS`, `LEVEL2=12`, `POOL_PREFIX=pool_c2`, the nine `POOL_CASES` and
`CANYON_OUT=docs/research/pool-c2-library`. (`status` needs `LEVEL2=12`: without it, it looks for level-13 folders.)

**If a run fails:** the supervisor writes `runs/c2/pool/<case>.failed` and goes on with the others. `c2.sh start`
again resumes every unfinished case from its last 10-minute checkpoint (scout, phase 1 or phase 2), and redoes only
the analysis of finished ones. A phase that ends before its own touchdown is carried on by 4 once, by itself
(`late()`).

When the set is done: `c2runs/docs/research/pool-c2-library/` holds `report.md`, `summary.json`, `data/` (per case the
analysis files and `_c2.json.gz`) and `barrels/` (today's `.bin` format, for comparison only).

## 6. T5's level-13 read

T5 landed at 03:24 (level 13 on the M1, 6h18). Its outputs are committed in `docs/research/pool-tube-runs-t5/`. The
full read is in `t5-sea-side.md`, "The level-13 read". In short [M]:

| Δ (s) | 2 | 3 | 4 | 4.5 | 5 | 5.4 |
|---|---|---|---|---|---|---|
| median ratio sea H / case H | 0.83 | 0.82 | 0.87 | 0.87 | **0.85** | 0.85 |

- Under 0.90 at 5 s: **ruling 26's branch 3**, state matching from the sea's own wave at the hand-over.
- The gap is the trough ahead, not the crest (the crests agree within 0.02–0.10 m at 4–5.4 s).
- T5 against today's library: H within 1 % to τ −1 s, crest place within 0.53 m; the same throw time.
- A finding for the library: T5's first 22 frames (τ −8 to −7.5) have their crest mark on the wave ahead.
  `c2_library.py` now fixes such frames (`crest_refound`); on T5's run it then gives 516 "own" frames of 553 and a
  monotone path table (d and H/d) over τ −8 to 0 [M].

## 7. Not done, and unsure

- Not done: the BRL3 format, `WaveLibrary`, the state matching in code, the bars "stored frames within 0.005 m" and
  "leave-one-out 0.02 m at 90 %" (they need the reader), T5 against today's library in code.
- The A0 choice is mine, against the plan's 0.355 ± 15 %. Section 3 says why. The advisor may want a fourth, lower A0
  row (about 0.12) if the matching uses H/d at 5 s, or a later hand-over.
- The bed line covers S fully; on HS/h0 the steep half of the line is above most steep slices (section 4).
- The bore front in `c2_library.py` is a simple rule (the steepest falling top, followed in time). At level 9 it lost
  the front after 24 frames. Check it on the level-12 files.
- Each case runs at one core. With the T5 run and the surfer track's tests, the M1 is busy: times may vary by 2 ×.
