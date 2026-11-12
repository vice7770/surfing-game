# T5: the 2 m pool's case from twice as far out (2026-11-12)

Tags: [M] measured (in a run or in the committed data), [C] read in the code, [R] reasoned, [U] recalled, not re-read.
For the route C2 (the owner's choice, 2026-11-12: "the whole breaking wave from the Basilisk library"). The plan's test
T5 (README.md here, the decision tests): one Basilisk run started twice as far out; its frames 2 to 4 s before the
throw against the live sea; bar: height within 10 %. No game code was changed. The owner's steps:
`docs/RUN-ON-M4.md`, section 3; the long version: `tools/basilisk/README.md`, "The T5 run".

## 1. How a case is made today [C]

- **Domain:** 2D, `size(DOMAIN)` = 64 h0 (288 m at the pool's 4.5 m) on a quadtree, h0 = 1, g = 1 (`periodic.c`). Not
  periodic: closed walls. The "periodic" in the name is the wave: a train of two first-order cnoidal crests
  (`analysis/cnoidal_train.py`, H/h0 and T), with a trough at the left wall. The second crest is studied, so it breaks
  into its predecessor's trough.
- **Bed:** a zero-velocity water-filled fraction (Mostert & Deike's trick): flat at h0, from the toe (XTOE = the train's
  front + 2 h0) one or two planar slopes to the reef crest HS, then flat to the right wall, or a reef top and a back
  slope (REEFTOP, SBACK). `pool_straight_big`: 1:21.6 along the ray from 4.5 m to 0.9 m, flat to the wall.
- **Physics:** two-phase centred Navier-Stokes, momentum-conserving VOF, surface tension, reduced gravity; Bond number
  1000 and Reynolds number 40000 on h0 (unless `BO`, `RE` are set).
- **When it breaks:** nothing forces it. The bed and the wave decide. A level-10 scout of the whole case (every 0.1)
  finds when the second crest's face goes vertical (`crest_track.py`); that places the rest.
- **How long:** phase 1 at level 10 from t 0 to the switch (5 √(h0/g) before vertical); phase 2 at level 13 from there
  to touchdown + 3 (at least vertical + 5), the finest two levels only inside a window (3 h0 behind the crest at
  vertical − 3, to 8 h0 or more past the vertical place). Checkpoints every 10 minutes.
- **What is saved:** the surface as VOF facets (`facets/f<t>.dat`) every 1.0 before the switch and every 0.025 after it
  (0.017 s at 4.5 m); `bed.dat`; `timing.log`; with `VELOUT`, the velocity under the surface. Time unit √(h0/g) =
  0.677 s at 4.5 m.
- **How it becomes a game case:** `plunge_measure.py` (vertical, touchdown), `periodic_library.py` (each frame as 128
  points, crest 32, lip 64, throat 88, toe 112, from 3 before vertical; τ from vertical), then `npm run barrels`
  (`scripts/barrel-library.ts`) writes the `.bin` that `ProfileLibrary.ts` reads (frames in h0, τ in √(h0/g), scaled
  by Froude from each slice's foot crest). Only the analysis files (`data/`) and the `.bin` leave the M4; the facets
  stay in `tools/basilisk/runs/` there.

**What "the cases start too late" means [M]:** `pool_straight_big`'s phase 2 has fine frames from τ −5.2 (−3.5 s);
its library keeps only τ ≥ −3 (−2.03 s, 14 m before the throw place); and its window starts at x 31 h0, so a profile
earlier than about −3 s would have its back on the coarse grid. The run itself started 133 m before the throw (the
second crest at x 7.9 h0): it is the saved fine part that is short, not the run.

## 2. The run [C, M]

`pool_far_big` = `pool_straight_big`'s line under its own name: the same bed, wave (H/h0 0.437, 10 s), domain, Bo,
Re, levels 10 and 13. Two numbers change (`canyon_pipeline.py`'s `EARLY`):

| | today (`pool_straight_big`) | T5 (`pool_far_big`) |
|---|---|---|
| level 13 from | 5 √(h0/g) before vertical: t 23 | 10 before: t 18 |
| library from | 3 before vertical (2.03 s, 14 m) | 8 before (5.4 s, 38 m) |
| window | x 31–47 h0 | x 25–47 h0 (the crest at t 18 stands 1 h0 before the face's toe) |
| end | t 34 (touchdown + 3) | t 34, the same |
| fine frames | 440 | 640 |

The switch, end and window above are what the scout places. The M1's level-10 scout of `pool_far_big` (2026-11-12,
Basilisk 082dd5c9) found the face vertical at t 28.49, x 37.99 h0, touchdown 30.70, exactly the M4's scout of
`pool_straight_big`, and placed 18, 34, 25–47 [M].

Why these numbers: 2 to 4 s before the throw is τ −3 to −5.9. The library starts at −8 so the bins have margin and the
game's larger scale (×1.11 lengths, ×1.054 times at `poolSize=ref`) still reaches 4 s. The switch is 2 √(h0/g) before
the library's first frame, as today's (23 vs 25.2), so the fine grid settles before it is read.

Why a name of its own: a run of the same name waits for any running build of that name (`wait_running`, `wait_orphans`),
so it would wait a day for the Bo 4000 run's `periodic_pool_straight_big_p2`. It also keeps the `.bin` id
(`periodic-pool-far-big-l13`) apart from the game's case.

**Level.** L13, as today, so the overlap τ −2 to +4 s can be read against today's library (it should agree; if not,
the switch time matters and that is a finding too). L14 is not needed for T5: the bar is a height 2 to 4 s out, where
the wave is smooth and the lip does not exist yet. A level-10 scout already gets that height within 2 % of level 13
(table in section 5) [M].

**Cost on the M4 Pro (estimates):**
- [M] today's phase 2: 2h21 for 11 √(h0/g) at L13 (`pool-tube-runs/summary.json`); level-14 phase 2 of the knee cases:
  20h42 and 22h31, about 9–10 × the L13 case's (different case, same domain and window kind).
- [M] the same two phase 2s at level 11 on the M1, one after the other (2026-11-12): T5's 375 s, today's window and
  span 258 s, so 1.46 ×. The cells differ little (39 200 against 36 900 on average): the cost is the 5 extra units.
  Those are not quiet: from t 18 to 23 the FIRST crest of the train breaks and runs as a bore at x 43–47 h0, inside
  T5's window (folds there in the level-11 frames). Today's run switches on after it has left the window.
- [R] T5 at L13: about 3.5 to 6 h for phase 2 (2h21 × 1.46 = 3h26 if the ratio holds; more if the first crest's bore,
  now resolved at 3.5 cm, costs like a break does), plus about 3 minutes of scout and phase 1 and 10–20 minutes of
  analysis. At L14: about 9–10 × that, 35–60 h. At L12: well under an hour, but not comparable with today's case.
- [M] Disk at level 11: 67 MB for the three builds. At level 13 a few hundred MB [R], well under the 5 GB `check` asks.

**Beside the Bo 4000 run:** yes. Separate `RUNS` folders, supervisors, state files and case names; nothing is shared
but the analysis scripts. T5 is one process on one core, about 100 MB at level 11 on the M1 [M] (level 13 has a few
times the cells: well under 1 GB [R]); the M4 Pro has 10 performance cores and 48 GB. The Bo 4000 run single-core: no
effect. With `OMP=1` (all performance cores): T5 takes one of them, so the Bo 4000 run may slow by around a tenth [R].
The one shared risk: the Bo 4000 section's stop line (prefix `pool`) also stops T5. T5's own stop has
`POOL_PREFIX=pool_far` and leaves the Bo 4000 run alone.

## 3. The commands (also in docs/RUN-ON-M4.md, section 3)

```
git pull
npm run barrels:pool -- check
RUNS="$PWD/tools/basilisk/runs/t5" POOL_CASES="pool_far_big" CANYON_OUT=docs/research/pool-tube-runs-t5 npm run barrels:pool
RUNS="$PWD/tools/basilisk/runs/t5" npm run barrels:pool -- status
RUNS="$PWD/tools/basilisk/runs/t5" POOL_PREFIX=pool_far npm run barrels:pool -- stop
git add docs/research/pool-tube-runs-t5 && git commit -m "data(pool): the T5 run, the 2 m pool's case from twice as far out" && git push
```

The script changes (all small; with nothing set, every other case runs exactly as before):
- `run_periodic.sh`: one new case line, `pool_far_big:4.5:0.437:10:0.0463:0.2:64:18:34:25:47`, and its comment.
- `analysis/crest_track.py`: `--lead` and `--lib-lead` (defaults 5 and 3, the old constants).
- `canyon_pipeline.py`: `EARLY` (the two numbers for `pool_far_big` only), the scout's track called with them, the
  library's first frame from them (3 for every other case), and a second "batch", `far`, so its report and `.bin`
  go to `docs/research/pool-tube-runs-t5/` even without `CANYON_OUT`, never to `public/barrels`.
- `run_pool.sh`: `TUBE_PREFIX="${POOL_PREFIX:-pool}"`, for a stop of this run alone.

## 4. What was checked, and what was not

Checked on the M1 (2026-11-12):
- `bash -n` on the four scripts; Python compiles.
- `run_periodic.sh flags` for all 48 earlier phase lines, plain, with `LEVEL2=14 BO=4000` and with `VELOUT=1 LEVEL2=13`:
  byte for byte the same as main's (the only new lines are `pool_far_big`'s). `cases` differs by the one new line.
- `crest_track.summarise` on `pool_straight_big`'s committed scout track: with the defaults the whole output is equal
  to main's, and it gives the M4's frozen window (23, 34, 31–47); with 10 and 8 it gives 18, 34, 25–47.
- The owner's command end to end, at coarse levels (`LEVEL2=11`, scout and phase 1 at 10, `RUNS` and `CANYON_OUT` in a
  scratch folder, `NEED_GB=1`, the M1's Basilisk 082dd5c9): `npm run barrels:pool` checked, started the supervisor,
  scouted (2m45s; vertical t 28.49, x 37.99 h0, touchdown 30.70: the M4's scout of `pool_straight_big` to the digit),
  froze 18, 34, 25–47, ran phase 1 (43 s) and phase 2 (6m13s), analysed it (a tube; A0 0.355), wrote
  `periodic-pool-far-big-l11.bin` and the report into the scratch folder's `out/` and `out/barrels/`, in 11 minutes. The
  library holds 320 frames before vertical (τ −5.42 to 0 s). `status` read the finished run without `POOL_CASES`;
  `git status` showed nothing in `public/barrels` or `src/`. Without `CANYON_OUT` the run's report goes to
  `docs/research/pool-tube-runs-t5`, and `CANYON_OUT=docs/research/pool-tube-runs` is refused.
- The selective stop: against stand-in processes named as the builds (`./periodic_pool_far_big_p2`,
  `./periodic_pool_straight_big_p2` and the two `run_periodic.sh fg` shells), the stop's patterns with `POOL_PREFIX=pool_far`
  match only T5's; with the default `pool`, both runs' (as the docs say).

Not checked: the full level-13 run (no time on the M1; the M4's Basilisk is newer, 4ec35831, than the M1's 082dd5c9);
a real `stop` while two runs go (only its patterns, above); `OMP=1`; two supervisors at once on one machine (they share
no file, by reading the code).

## 5. The measure plan (when the data lands)

**The case's side, already possible today [M].** `t5_case_side.py` (here; standard library) prints a case's wave per
half second before the throw: the crest's distance before its throw place, its height over still water, its height H
over the trough ahead (the lowest surface within 3 h0 ahead, the analysis's rule), the face's angle. On today's data
(4.5 m scale; the reference pool draws it ×1.11 in length, ×1.054 in time):

| τ (s) | crest before the throw place (m) | crest over still water (m) | H (m) | face (deg) | source |
|---|---|---|---|---|---|
| −6.0 | 42.2 | 1.60 | 1.90 | 13 | scout, L10 |
| −5.0 | 35.1 | 1.63 | 1.94 | 15 | scout, L10 |
| −4.0 | 28.2 | 1.68 | 2.19 | 16 | scout, L10 |
| −3.0 | 21.4 / 21.6 | 1.69 / 1.68 | 2.26 / 2.25 | 19 / 20 | scout L10 / phase 2 L13 |
| −2.0 | 14.6 / 14.2 | 1.81 / 1.81 | 2.37 / 2.37 | 23 / 20 | scout L10 / library L13 |
| −1.0 | 7.2 / 8.3 | 1.85 / 1.82 | 2.40 / 2.37 | 41 / 34 | scout L10 / library L13 |

So the case's wave 2 to 4 s out stands 14 to 28 m before the throw place, 2.2 to 2.4 m high (crest to the trough
ahead), its face 16 to 23°. Where L10 and L13 overlap (−3 to −2 s) their heights agree within 2 % [M]. **T5's height
bar can be read now** from the scout track against the sea; the run then adds the level-13 shape (the profiles, the
slope, the lip's start) that C2's library needs. Ruling 17 put the sea's wall 10 to 30 m ahead at 1.5 m and 9–13°;
if that is the same quantity, the bar fails by about 1.4 × [R]: but it was read along the crest of an unbroken
shoulder, not at each point's own clock, so the probe must decide.

```
python3 docs/research/wave-strategy-alternatives/t5_case_side.py \
  docs/research/pool-tube-runs-t5/data/periodic_pool_far_big_L13_library.json \
  docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_library.json
```
prints the T5 library's table and its overlap with today's (per half second, clean frames of both: the point gap's
median and 90 %, the crest place gap and the H gap, τ −2.5 to +3.5 s). Bar for the overlap [R]: the H gap under 2 %, the crest place gap under 0.5 m before τ 0.

**The sea's side: a solver probe (not built).** Reuse `docs/research/pool-look-reference-2026-11-11/ruling-17-runs/
r17-probe3.ts` (its `seamRead`: at each front point's clock, the case's crest, height over the sea's height, and the
face's steepest slope, by τ bin, with the game's own config and library). Its points join the front only 1.64 s before
their throw, so add:
1. a ring buffer of the sea's surface every 0.1 s for the last 5 s (the pool's 116 000 cells: about 23 MB);
2. at each point's throw (its first τ ≥ 0), look back along its ray (the reef's ray, `poolStraightFrame`) at 2.0, 2.5,
   3.0, 3.5 and 4.0 s: the sea's crest nearest the case's crest place at that τ, its height over the lowest water
   within 3 h0 ahead (the case's rule; h0 = the point's foot height / A0, as `profileAt` scales), its height over still
   water, its distance before the throw place and its face's steepest slope;
3. the case at τ = −Δ from the T5 library (`libraryFromBytes` on `docs/research/pool-tube-runs-t5/barrels/
   periodic-pool-far-big-l13.bin`; no game index change) and, until it lands, from the scout track (Froude-scaled by
   the same foot crest).
Print per Δ: the case/sea height ratio (median, 10–90 %), the crest rise (case − sea, m), both distances before the
throw place (m), both face slopes (deg), the sample count; config as ruling 17's runs (`--ref`, `tubeForm=early`,
`poolReach=long`). **Pass: median ratio 0.90–1.10 at 2, 3 and 4 s.** Also worth reading in the same run: whether the
two distances agree (the case's crest runs at about 7 m/s at 4.5 m [M]; if the sea's crest is slower, the hand-over place
moves with Δ).

## 6. C2's library: a first estimate

**What a case must be keyed by [R, from the case's own equations].** A 2D case is dimensionless (h0 = g = 1). It is
fixed by: the wave at the foot, A0 = H/h0 and the period T √(g/h0) (both shape the train, through the Ursell number);
the bed along the ray: its slope (or slopes, HMID, S2) and the reef crest's depth HS/h0 with what lies behind it (reef
top, back slope, or a beach); and Bo and Re (fixed by choice). Froude scaling then gives any h0 with the same numbers,
as the game does now. Tide changes HS/h0 and h0 together: one more key where a spot has tide.

**The angle to the contours can go into the slope, not a key of its own [R].** Each slice runs along the wave's own
ray (the wave's direction), and the bed it meets is the slope along that ray: the contours' slope × cos(angle). That is
Mead & Black's along-ray gradient, the slope the pool's cases already used (1:21.6 for the big wave's ray). The peel
then comes from the slices' start times along the crest, which the live sea gives. What 2D cannot hold: the flow along
the crest of a strongly oblique break, a ray that bends inside the break zone (a bowl), and two crests crossing.
Where the ray bends a lot, a slice needs a case on a two-slope bed (the slope before and after the bend).

**Sizes and costs (L13 per run [R], from [M] 2.0–3.8 h for today's phase-2 spans on the M4; a C2 run needs T5's early
part and a longer bore, about 2–3 × that):**

| Spot | Keys | Runs | Hours each: L12 / L13 / L14 | M4 time, 8 at once: L12 / L13 / L14 |
|---|---|---|---|---|
| Pool (the 2 m wave) | A0 3 (0.355 ± 15 %: the onset faces vary 1.8–2.5 m [M]) × T 1 (10.5 s) × bed 3 (the barrel section, the reef's ends, the beach break) | about 9 | 1–2 / 5–10 / 50–100 | 2–4 h / 10–20 h / 4–8 days |
| A beach like Canyon | A0 4 (0.2–0.5) × T 2 (11, 14 s) × bed 4 (the 1:23 arm, the bowl and bank, the beach's A-frames, a gentler shoulder) × tide 1–2 | 32–64 | 1–2 / 5–10 / 50–100 | 4–16 h / 1–3.5 days / 8–33 days |

- [R] Level: L13 for the drawn tube (the pool's lips are 4.8 and 8.1 cells across at L13 [M, pool-tube-runs/report.md]); L12 is enough for the wall
  and the white water ahead of and behind the tube; L14 only for the thin lip (the Bo 4000 question). A mixed library
  (L12 everywhere, L13 where a tube is drawn) is the cheap first library.
- [R] The ProfileLibrary blends by slope (nearest) and A0 (bracketing) only today; T and HS/h0 would be new keys.
- [M] The pool's case runs at 10 s; the reference pool at 10.5 s. A C2 library for the pool should be run at 10.5 s.

**Can 2D cases carry the white water to the beach? Part of the way [R].** Today's domain holds the bore for about 3 s
after touchdown (the run ends at touchdown + 3) over the flat behind the reef crest, then a closed wall 18 h0 (83 m)
behind it. In the pool the beach is about 215 m behind the reef line [M, step 5's probe output]. Three options:
1. Run longer in the same domain (tmax +10 √(h0/g), about 7 s more bore): cheap per run (the bore region stays at the
   window's level), but the closed wall reflects after about 30 √(h0/g).
2. A longer domain with the real bed behind the reef (reef top, back slope, the lagoon, the beach): a 128 h0 box needs
   L14 for the same 3.5 cm cells at the break, with the bore region coarser. A few times today's cost [R].
3. 2D for the break and the first 3–5 s of bore (the pile, the splash-up, the bore's birth), then the coarse sea
   carries the bore to the beach (depth-averaged models do bores well [U]) with today's roller drawing on it.
   I recommend 3: it keeps the bore in the sea that also carries the backwash and the currents, and 2D turbulence
   after a few seconds is not real turbulence anyway (no vortex stretching in 2D [U]).

## Open questions

1. Read T5's height bar now from the scout track (a probe build on the sea's side, no M4 time), or wait for the run?
2. Run T5 at 10 s (today's case, comparable) as designed, or at the reference pool's 10.5 s (the C2 library's
   period, not comparable with today's)?
3. If the overlap with today's library differs (the switch time matters, or the first crest's bore now resolved in
   the window), which one is the truer case?
4. A cheaper half-step, if the owner's M4 still has today's run folder (`tools/basilisk/runs/periodic_pool_straight_big_L13`
   with its facets): its phase 2 already has fine frames from τ −5.2 (−3.5 s), and its window lets a profile's back stay
   fine from about −2.9 s. Re-running only the library from there (minutes) would reach 3 s, not 4. Worth asking?

## The advisor's answers (2026-11-12, this session)

1. **Pre-read the sea side now: yes.** Build the sea-side probe (extend `ruling-17-runs/r17-probe3.ts` as section 5 says) and read it against the committed scout track. It costs no M4 time and tells early whether the sea and the case agree 2 to 4 s before the throw. The case side already reads H 2.2 to 2.4 m there, against ruling 17's 1.5 m sea wall, measured another way; the probe decides.
2. **T5 keeps 10 s.** Its job is to compare with today's case, so only the start may change. C2's library will use the reference pool's 10.5 s.
3. **If the overlap differs, T5 is the truer case.** Same physics, more of it resolved (the first crest's bore at level 13). The difference measures how much today's narrow window shaped today's case.
4. **No partial re-run of today's library.** T5 reaches −5.4 s; −3 s alone is not worth the owner's time.
5. **T5 runs on the session's M1.** Basilisk is installed here (`~/basilisk-C`, rev 082dd5c9); the run is one core and under 1 GB. The M1's level-10 scout matched the M4's to the digit, so the revision gap (the M4 has 4ec35831) should not matter for T5's bar. The owner's M4 commands stay documented for a re-run there.
