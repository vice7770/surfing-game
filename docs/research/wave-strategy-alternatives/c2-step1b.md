# C2, step 1b: the BRL3 case format and the wave library (2026-11-13)

Tags: [M] measured here, [C] read in the code, [R] reasoned, [P] provisional.
For the route C2 (the owner's choice: "the whole breaking wave from the Basilisk library"). The plan is `c2-plan.md`,
§1 and §2 step 1; the advisor's decisions are `ruling-28-c2-plan.md` and `ruling-30-c2-step1.md`; the Basilisk side is
`c2-step1.md`. **Nothing in the running game uses the new code** (step 3 wires it). The bars' script is
`c2-step1b-bars.ts` (here); its output is `c2-step1b-bars-run.txt`. The coverage's inputs are here too:
`c2-step1b-keys-rows.json.gz` (the probe's rows), `c2-step1b-keys-run.txt` (its printout) and
`c2-step1b-scout-paths.json` (the nine scouts' paths).

## 1. What was built

- **`scripts/barrel-library.ts --format brl3`** (`scripts/brl3.ts`). It packs c2_library.py's `<run>_c2.json.gz` into a
  BRL3 file. There is no default folder: `--assets` must be given. Without `--format`, or with `--format brl2`, the script
  is the same as before (section 4, L5).
- **`src/wave/library/caseFormat.ts`**: BRL3, encode and decode. **`caseFromC2.ts`**: c2_library.py's file as a case.
- **`src/wave/library/WaveLibrary.ts`**: `StateMatcher` (the matching on the cases' path tables alone) and
  `WaveLibrary` (the slices: surface, crest and velocity at a depth, at a time).
- Unit tests: `caseFormat.test.ts` (5) and `WaveLibrary.test.ts` (11).
- Research tools (here): `c2-step1b-bars.ts` (the bars), `c2_scout_paths.py` (a scout's path table, for coverage), and
  `t5-sea-probe.ts --keys-out FILE` (every key row as JSON; H also over a 15 m trough window, `--key-trough`).

## 2. The format, BRL3

`u32 "BRL3" · u32 header length · header (JSON) · padding to 4 · eleven sections, each padded to 4`, little-endian.
The header holds every number the sections do not: the keys (A0, the slope S, HS/h0), the period T √(g/h0), h0, τ's
start and step, touchdown, the frames' x origin, the velocity depths, the arc shares, the uses, c2_library.py's checks,
the QOUT grid and mass check, and each section's offset and length (the reader checks them).

| Section | Type | Per | Holds |
|---|---|---|---|
| frames | f32 | frame × 128 × 2 | the profile, h0: x from the crest at τ = 0, y from still water |
| use | u8 | frame | 1 own, 0 refill |
| path | f32 | frame × 9 | τ, crest x and y, trough, H, d, H/d, crest speed, face angle (NaN for null) |
| velocity | f16 | frame × 128 × 2 depths × 2 | (u, v), √(g h0), at 1.5 cells and 0.1 h0 under the surface |
| qTime, qFlow | f32 | column frame (× bin × 2) | QOUT: τ; per 0.25 h0 bin the volume h and the flux q |
| qTop, qAir | f16 | column frame × bin | QOUT: the top, and the air share under it |
| bore, boreTop, boreAir | f32, f16, f16 | bore frame (× bin) | τ, the front, its first bin and count; the top and air over its bins |

- Frames stay f32: f16 would round x to 8 cm at 16 h0. h and q stay f32 for the mass.
- float16 is done by bits (no `Math.pow`), so it reads the same everywhere. All 65 536 values round-trip [M].
- **Size [M]:** 1.77–1.95 MB a level-12 case (1.05–1.15 MB gzipped); T5 (no velocity, no QOUT) 1.15 MB. Nine cases make
  about **17 MB, over step 2's 15 MB bar** (about 10 MB gzipped). Half of each file is the velocity (2 depths × 128 points
  on every frame). Options for step 2: keep velocity only from τ −8 to touchdown + 3, or every second frame.

## 3. The library's mathematics

**Joins by arc.** c2_library.py already spaces every frame by arc between its landmarks, along the run's fine surface,
and before the throw puts the lip and throat at the throw's shares of the crest-to-toe arc. So index i is the same share
of the same piece in every frame. The library therefore joins frames index to index, in time and across cases: that is
the join by arc of rulings 19 and 20, done once, where the fine surface is known. Refill frames are rebuilt the same way,
from the nearest own frames on the same side of the throw.
- **Not done: respacing again in the reader.** I built it first: each piece respaced evenly along the 128-point
  polyline. It cuts the corners of the stored curve [M]: median 0.4 mm before the throw, but up to 0.4 m in the open tube
  and 0.4–0.8 m (median) in the bore, because points evenly spaced along a rough fine surface are not evenly spaced along
  their own chords. So the reader keeps the stored points.
- `frameJoin=arc` (claude/pool-frame-join) was not reused: it fixes BRL2 frames whose lip mark slides; C2 files are made
  without that fault.

**State matching** (ruling 28, decision 1). A slice gives r = H/d_h, P = T √(g/d_h), the slope S along its ray and HS/h0.
1. In each case: its path's H/d, smoothed over ±0.25 τ (c2_library.py's check) and made monotone by a running maximum up
   to the throw. τ_h is where that first reaches r, linear between frames; d̂ = d(τ_h). If r is below the case's first
   frame, τ_h is the first frame (`tauClamp −1`); above it at the throw, τ_h = 0 (`+1`).
2. **Slope:** bracketed among the cases' distinct slopes (two levels, linear weight).
3. **HS/h0:** bracketed among the beds at each slope level. With one bed per level (the 9 runs' line), HS is not a key
   yet: the slice takes the bed's HS and the library reports `one` and how far off (`reefOff`). The three runs at
   S 0.105, HS 0.20 (ruling 30, decision 6) make it a key at the steep end with no code change (a test covers the partial
   grid).
4. **A0, within a bed:** each case's matched point is (its H/d at τ_h, d̂ (T̄/T)²), the slice's (r, (T̄/P)²), T̄ the cases'
   mean period. The second axis is the depth ratio when the periods agree: (T̄/P)² = d_h / (g T²/T̄²) = d_h / 5.0 m for the
   pool. The slice is projected onto the polyline through the cases (by A0) and weighted along it; outside its ends A0 is
   `low` or `high`. When every case matched r, this is bracketing by depth; where a case clamped in τ, its own H/d enters.
5. Weights multiply (up to 2 × 2 × 2 = 8 cases). h0 = d_h / Σ w d̂(τ_h).

**Time.** Δ = Σ w (−τ_h,i). Before the throw each case runs from its τ_h at the rate (−τ_h,i)/Δ, so all throw together
at t_h + Δ √(h0/g); after it, at rate 1. With one case this is exactly τ(t) = τ_h + (t − t_h)/√(h0/g) (the plan). Without
the common throw, cases with different τ_h would blend two lips at two times [R].

**Outputs.** `surfaceAt` (128 points, m, x along the ray from the slice's crest at the hand-over), `crestAt`,
`velocityAt` (a profile point and a depth in m: linear between the stored depths, held beyond them; m/s), and
`caseFrameAt` (one case at a τ). Velocity gaps (about 4.5 % of samples) are filled from the nearest point along the
profile at load.

**Determinism.** Only + − × ÷ and √ (with floor, min, max, abs), no `Math.hypot`. Sums are float64, written once to
float32.

## 4. The bars

Cases finished at level 12 during this step: `pool_c2_b1_a3`, `b2_a3`, `b3_a3` (the A0 0.355 row on all three beds).
The others were in their phase 2 or not started (c2.sh status at 05:10). T5 (level 13, `pool_far_big`) was converted
from `wave-track/t5_c2.json.gz` (c2_library.py on T5's run, made in step 1).

| Bar | Result | Numbers [M] |
|---|---|---|
| **L1** stored frames within 5 mm | **pass** | Against c2_library.py's own file: at most 0.005 mm (b1_a3 0.002, b2_a3 0.004, b3_a3 0.005, T5 0.002, the level-9 smoke case 0.005). Through a slice matched on the case's own state at τ −7, every own frame after it at its own time: at most 0.008 mm. |
| **L2** leave one out, 2 cm at 90 % | **miss** (the one pair testable) | Only one pair could be tested: b2_a3 (S 0.068) from b1_a3 (0.036) and b3_a3 (0.105), weights 0.54 / 0.46. Over the wave (2 h0 behind to 3 h0 ahead of the crest), from the hand-over to touchdown, p90 **50 cm** from τ −7 and **27 cm** from τ −4; ≤ 2 cm on only 5–18 % of points. Registered on the throw, crest on crest: p90 18–25 cm before the throw, 37–41 cm in the open tube. Crest place p90 2.1 m, H p90 10–13 %. The blend does help: either neighbour alone gives p90 46–94 cm. No A0 pair yet: each bed has one finished case. |
| **L3** path monotone near the break | **pass** | d falls at every step from τ −8 to 0 on all four cases. H/d rises at every smoothed step from τ −4 to 0 on b2_a3, b3_a3 and T5; b1_a3 has 2.5 % wrong-way steps, the largest 3e-5. From τ −8: b3_a3 has 15 % wrong-way steps, all on the flat platform (τ −8 to −7.5), the largest 4e-4. |
| **L4** T5 against today's library: H 2 %, crest 0.5 m | **near miss** (both just over, as ruling 30 found) | T5 through BRL3 and `WaveLibrary` against today's game case (`periodic-pool-straight-big-l13.bin` through `ProfileLibrary`), both at 4.5 m, over today's case's frames (τ −3 to touchdown, 179 frames). Before τ −1.4: H within 0.73 %, but the crest place is 0.49 m median and **0.527 m at most (τ −2.35), 11 frames over 0.5 m**: ruling 30's 0.53 m, as noted. τ −1.4 to 0: place within 0.28 m, H within 2.2 % (13 frames over 2 %). Throw to touchdown: place within 0.11 m, **H 2.0 % median, 2.41 % at most (37 of 58 frames over 2 %)**. These are the two runs' own differences (T5 is the truer case, `t5-run.md`); the format adds nothing: T5 through BRL3 against T5's own BRL2 file is the same within 1.3 % in H and 0.12 m in place from τ −7.375 to touchdown (0.01 % and 0 m median). Its first 25 frames (τ −8 to −7.4) miss by 13–18 % and 69 m there: BRL2's crest mark is on the wave ahead (ruling 30, point 3), which the C2 file's `crest_refound` corrects. |
| **L5** BRL2 byte-identical | **pass** | 13 shipped cases rebuilt with main's script and with this branch's: every `.bin`, the index and the table are byte for byte the same. Against the committed files, 12 of 13 match; `periodic-reef42-l12.bin` differs on main too (stage_canyon.sh says so: the Reef's refit differs from its committed file). T5's BRL2 rebuilt from its committed library: the same as its committed file. |
| **L6** determinism | **pass** | 2000 surfaces and velocities over 200 slices, twice: the same FNV hash. Every BRL3 file re-encodes to the same bytes. The sea probe also ran twice (300 s): the same H/d at Δ 5 s for all 1776 rows. Unit test: byte-equal on repeat. |


## 5. Coverage: the pool's 1776 slices

How [M]: the sea probe again (`t5-sea-probe.ts --keys --keys-out`, the same config as `c2-step1-keys-run.txt`, 300 s,
CPU sea; its printed output was the same as step 1's). Each of the 1776 thrown points gives a state at Δ before its
throw: H/d_h, P = T √(g/d_h) with T 10.5 s (the pool's one swell component), S, and HS over the 5 m platform.

**The cases' paths.** Only the A0 0.355 row was finished at level 12, and those cases start at τ −8. So coverage was run
on the **level-10 scouts' paths** of all nine cases (crest track, `c2_scout_paths.py`, τ −12 to 0). The a1 row's three
scouts (A0 0.151, 0.152, 0.154) were run here, in `scratchpad/c2s1b/scouts` (one at a time, about 10 min each on the M1).
The pipeline will run the same scouts again for its own a1 cases. The other six scouts are c2runs' own (read only).
Scout paths are level 10, not 12; repeat the coverage on the level-12 paths when the set lands (section 9).

**Which H.** The cases' H is the crest over the lowest water within 3 h0 ahead: 15 m at h0 5 m. The probe's H used
3 × the game's library h0 (3.45 m), so 10.4 m: it misses part of the trough and reads H/d 0.28 median where the 15 m
window reads 0.33. The matching must use the cases' own rule, so the main numbers use the 15 m window (`Hd15`);
the 10.4 m numbers are given for comparison.

Share of slices clamped, per key (the 9 scouts' paths; the 15 m window; the 10.4 m window in brackets):

| Δ (s) | slope low / high | HS off its bed | A0 under the a1 row (any weight) | τ clamped (weight share) | crest on the platform | the slices' A0 under 0.12 (extrapolated) |
|---|---|---|---|---|---|---|
| 4 | 1.0 / 10.6 % | 100 %, 0.010 h0 median | 13.8 % (20.9 %) | 8.2 % (16.5 %) | 13.4 % | 4.8 % (9.0 %) |
| 4.5 | 0.8 / 5.1 % | 100 %, 0.011 h0 | 10.3 % (16.7 %) | 13.7 % (22.9 %) | 19.0 % | 1.7 % (6.3 %) |
| **5** | **0.8 / 0.3 %** | 100 %, 0.013 h0 | **5.6 % (14.2 %)** | 19.2 % (34.2 %) | 26.0 % | **0.6 % (4.0 %)** |
| 5.4 | 0.7 / 0.0 % | 100 %, 0.013 h0 | 3.3 % (11.2 %) | 21.6 % (48.4 %) | 35.8 % | 0.1 % (2.8 %) |

- **The slope** is inside the cases for 99 % of slices at 5 s (low 0.8 %: S under 0.036; high 0.3 %).
- **HS/h0** is never exactly a bed's, but it is close: 0.013 h0 (6 cm) median, 0.052 h0 (26 cm) at p90 (the steep end).
- **A0.** At 5 s, 5.6 % of slices fall under the a1 row (A0 0.15); with the 10.4 m window, 14.2 %. **Almost all of them are
  on the far third of the reef** (s 101–151 m: 16.7 % there; 0 % on the first two thirds). Read off the cases'
  own A0 (linear, and on past the a1 row), the slices' A0 is 0.248 median (0.176–0.290, 10–90 %).
- **The fourth row at A0 0.12** (ruling 30, decision 7): with it, the share under the cases at 5 s would be about
  **0.6 %** (the slices whose A0 reads under 0.12, an extrapolation [R]), inside the 2 % bar. Without it, 5.6 % misses the bar. With the
  10.4 m window the row would still leave 4.0 %. So [R]: **add the 0.12 row** (or hand over at 5.4 s, where 3.3 % fall
  under 0.15 and 0.1 % under 0.12). Before it, settle the window: it moves the answer more than the row does.
- **τ clamps.** Where a slice blends a small case that matched and a big case that did not reach the slice's H/d by its
  first frame, the big case enters at its first frame. That is 19 % of the weight at 5 s. It is the A0 axis doing its
  job (the point of the big case sits at its own first H/d), but it means the big case's shape at τ −12 is blended in.
- **The time to the throw** [M]: the matched cases throw 6.07 s (5.14–7.45) after a hand-over 5 s before the sea's own
  throw; at 4 s, 5.12 s. So the library's break comes about **1 s later** than the sea's own. It is likely the same
  effect as ruling 26's gap (the sea's wave of a given H/d is nearer its break than the case's) [R]. It matters for
  step 6's throw-line bar (0.2 s). For the advisor: match on the distance to the throw place as well as on H/d?
- **The platform.** 26 % of the slices' crests still stand on the 5 m platform at 5 s. See section 8.

## 6. Cost

Measured on this M1 [M], node 22, while three Basilisk cases (and the Canyon check) ran beside it (load about 5):
- **The match at the hand-over:** 6–14 µs a slice, once per slice.
- **A surface of 128 points from 4 cases:** 2.6–2.7 µs a slice: **1.6 ms a step for 600 slices**. Over a mix of 2–4
  cases, 2.0 µs (1.2 ms). The plan guessed 0.5–1 ms for the whole library; the surface alone is over it.
- **One velocity sample:** 0.15–0.2 µs.
- Under heavier load (four jobs and the probe) the same surface took 4.1 µs. The figures need a quiet machine.
- For step 7 [R]: not every slice needs all 128 points every step (the felt surface is a few points under the board; the
  drawn one could be blended in a vertex shader, the plan's fallback).

## 7. Merge checks [M]

- `npx tsc -b --noEmit` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The suite (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation.test.ts` and `SurfZoneRunner.test.ts`):
  **348 files passed**, 37 skipped; **3373 tests passed**, 23 expected fail, 43 skipped. Main: 346 files, 3357 tests;
  the two new files and their 16 tests are the difference.
- The Canyon byte check (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, state files in `scratchpad/c2s1b`), the same
  as main: Canyon B (`?canyonWaves=true`) snapshots a367d938f15fa934, state 9e5831f80e38abd9; default Canyon
  ea3d57a4d49f4b48, state a1a2555739210f96. Nothing in the game imports the new code, so this is a guard.

## 8. Not done, and unsure

- **Not wired.** No `?wave=library`, no hand-over, no slices in the sea, no loft: step 3.
- **L2 along A0** could not be tested: no bed had two finished level-12 cases during this step (the a2 row was in
  phase 2, the a1 row not started). Run `c2-step1b-bars.ts` again when the set lands (section 9).
- **QOUT and the bore** are packed and decoded, but the library has no reader for them yet (step 5's hand-back). No bar
  on them here; c2_library.py's mass check is carried in the header.
- **T5 has no velocity** (no VELOUT in its run): its velocity reads as 0 after the fill.
- **The platform plateau [M, R].** Where a case's crest still stands on the 5 m platform, its H/d is flat (b3_a3 from
  τ −8 to −5), so H/d cannot tell τ there. b3_a3 matched at τ −7 lands at τ_h −8 (the first crossing): its throw then
  comes 1 τ (0.7 s) late. In the pool 26 % of slices still stand on the platform 5 s before the throw (36 % at 5.4 s,
  13 % at 4 s). Those need another clock: the crest's distance to the slope's foot along the ray, or a later hand-over.
  This is a decision for the advisor.
- **The time to the throw** is a useful check of the match: the matched cases throw Δ √(h0/g) after the hand-over, where
  the sea's slice throws 5 s after it. Section 5 gives both.
- **HS/h0** is not a key yet (one bed per slope). The report says how far each slice is from its bed's HS.
- **Size:** about 17 MB for nine cases, over step 2's 15 MB bar (section 2).
- **Unsure:** the A0 axis weighs H/d and the depth ratio equally [P]; the 15 m trough window for the sea's H (section 5)
  changes the coverage a lot, and the cases' own rule (3 h0 at h0 5 m) is what it should match.

## 9. How to run it again

From the repository's root, with the C2 files in DIR (when the set lands: `c2runs/docs/research/pool-c2-library/data`):

```
npx rolldown scripts/barrel-library.ts -o <scratch>/barrel-library.mjs --format esm --platform node
node <scratch>/barrel-library.mjs --format brl3 --assets <scratch>/brl3 --c2 DIR/periodic_pool_c2_b1_a1_L12_c2.json.gz …
npx rolldown docs/research/wave-strategy-alternatives/c2-step1b-bars.ts -o <scratch>/bars.mjs --format esm --platform node
node <scratch>/bars.mjs --cases <scratch>/brl3 --c2 DIR/…_c2.json.gz … --cost \
  --keys docs/research/wave-strategy-alternatives/c2-step1b-keys-rows.json.gz --hd Hd15
```

With every bed holding three A0 rows, L2 tests each middle case along A0 too, and the coverage runs on the level-12
paths themselves (they start at τ −8, so slices smaller than a case at τ −8 clamp there).
