# The Wave Pool's bigger-tube batch (2026-11-04)

The plan for the owner's M4 runs that decide the Barrel's floor. Branch `claude/pool-tube-runs-2`, from main c4bbb823. The
runs land in this folder: `report.md` and the rest are written by the runner, beside this README.

## Why

The water-physics advisor's step-7 ruling on the pool's surfable tube
(`docs/research/pool-tube-wall-2026-11-04/advisor-ruling.md`, §2.2 "The bigger tube", items 2–3) found:

- **Today's floor makes a small tube.** The pool's own level-13 cases (`docs/research/pool-tube-runs/`,
  `docs/research/pool-tube-cases-2026-11-03/README.md`) gave no clear cavity at 1.5 m and at best 0.46 m of usable
  clearance at 1.8 m.
- **The only floor in our own data that roughly doubles it** is a Reef-type ledge, about 1:4.5 along the ray, from the
  4.5 m platform to the 0.9 m crest. reef42 (`docs/research/water-physics/reef-ledge-runs.md`, a 1:4.2 ledge) is almost
  the pool on a ledge in its own units, with up to 0.60 H of usable clearance.
- **The level-10/11 scouts can place the break but cannot size the cavity.** The M1's level-11 run of the earlier small
  case gave a 0.40 H gap, against 0.24 H at level 13. Only the M4's level 13 can answer.

The owner's calls (2026-11-04): the bigger tube goes "within physics", the steep reef ledge adopted only if these runs show
it wins; six cases, after the run program's fix (the reef top below). The advisor's sizes ruling (2026-11-04, below) adds
two face-matched knee cases: eight in all.

## The eight cases (`tools/basilisk/run_periodic.sh`, `CASES_ALL`)

Every case is a two-crest cnoidal train of the pool's 10 s machine wave along the straight reef's ray, the second crest
studied, from the 4.5 m platform (h0) to the 0.9 m crest (HS 0.2).

| Case | Face along the ray | H/h0 | Foot crest A0 (target) | What it tests |
|---|---|---|---|---|
| `pool_knee_small` | today's knee, 1:18.7 (S1 0.0535) | 0.26 | 0.19 | the reference: today's floor at the game's own crest on the knee, 1.5 m faces |
| `pool_knee_big` | today's knee, 1:21.6 (S1 0.0463) | 0.32 | 0.245 | the same, 1.8 m faces |
| `pool_ledge_small` | the ledge, 1:4.5 (S1 0.2222) | 0.32 | 0.24 | the candidate, 1.5 m faces |
| `pool_ledge_big` | the ledge, 1:4.5 | 0.37 | 0.29 | the candidate, 1.8 m faces |
| `pool_steep9_small` | one face at 1:9 (S1 0.1111) | 0.26 | 0.19 | the trend between knee and ledge (the optional pair), 1.5 m |
| `pool_steep9_big` | one face at 1:9 | 0.32 | 0.245 | the same, 1.8 m |
| `pool_kneeface_small` | today's knee, 1:18.7 | 0.23 | — | the decision rule's comparator: the knee at the ledge's 2D face (about 1.62 m) |
| `pool_kneeface_big` | today's knee, 1:21.6 | 0.245 | — | the same at about 1.86 m |

- **The sizes:** the earlier pool cases were sized by the platform's wave height and came out 1.45× the game's crest on
  the knee. These are sized by that crest: H/h0 0.26 / 0.32 gave A0 0.187–0.191 / 0.242–0.248 in the advisor's scouts.
- **The ledge is sized taller** (A0 about 0.24 / 0.29) for the same faces: on a ledge the 2D face is about 1.4–1.7 A0,
  against 2.0–2.3 on today's face. If the game's measured knee crest on the new floor differs by more than 10 %, the
  ledge pair is rerun at the new size.
- **The 1:9 pair** shows whether the tube grows steadily with the face's steepness, or only at a ledge.

## The bed: the reef top and back slope

Until now `periodic.c`'s bed ran flat from the crest to the closed right wall. The advisor's concern: that over-drains a
ledge, the first wave's water having nowhere to go but back over the crest. The advisor recommended the reef top and
back slope, now `periodic.c`'s `REEFTOP` and
`SBACK` (the case fields 14–15, `…:w1:::2.7:0.05`; off by default, so every older case builds and runs as before):

- the crest flat 2.7 h0 (12.2 m) along the ray;
- then a 1:20 back slope down to h0 (4.5 m);
- then flat to the wall.

This is the floor's own crest profile (`POOL_STRAIGHT` in `src/wave/pool.ts`): its 6 m `flatWidth` and 1/10 `backSlope`,
square to the reef, crossed at cos α ≈ 0.5. The units are h0, as every length in `periodic.c`; the slopes are pure
numbers.

**The knee cases get it too.** The decision rule compares the ledge with the knee at the same face height, so the two
must differ in the face alone. The game's floor keeps the same crest profile on both, and the closed wall's backwash
(the earlier batch's caveat 5) would act on the knee as well.

**The domain stays 64 h0** (288 m), as the earlier pool cases, so level 13 keeps their 3.5 cm cells. It holds every
case's back slope; the knee's big case has the least deep water before the wall (0.57 h0, 2.5 m). No reflection from
the wall reaches the break before a run ends (inferred): the first wave's bore needs about 22 √(h0/g) at the long-wave
speed just to run down the back slope (2/SBACK × (1 − √HS)), and every run ends by t 37.5 (41.5 with the late-break
extension).

The beds, x along the ray from the domain's start (the train starts in the deep water before the toe), depth below still
water. Checked against the bed each scout built (`bed.dat`, the bed's facets): within 0.004 m.

| Case | Toe (4.5 m) | Crest edge (0.9 m) | Reef top ends | Back slope's foot (4.5 m) | Deep flat to the wall (x 64) |
|---|---|---|---|---|---|
| `pool_knee_small` | x 27.15 h0 (122.2 m) | 42.10 (189.5 m) | 44.80 (201.6 m) | 60.80 (273.6 m) | 3.20 h0 (14.4 m) |
| `pool_knee_big` | 27.46 (123.6 m) | 44.73 (201.3 m) | 47.43 (213.5 m) | 63.43 (285.5 m) | 0.57 h0 (2.5 m) |
| `pool_ledge_small` | 27.46 (123.6 m) | 31.06 (139.8 m) | 33.76 (151.9 m) | 49.76 (223.9 m) | 14.24 h0 (64.1 m) |
| `pool_ledge_big` | 27.76 (124.9 m) | 31.36 (141.1 m) | 34.06 (153.3 m) | 50.06 (225.3 m) | 13.94 h0 (62.7 m) |
| `pool_steep9_small` | 27.15 (122.2 m) | 34.35 (154.6 m) | 37.05 (166.7 m) | 53.05 (238.7 m) | 10.95 h0 (49.3 m) |
| `pool_steep9_big` | 27.46 (123.6 m) | 34.66 (156.0 m) | 37.36 (168.1 m) | 53.36 (240.1 m) | 10.64 h0 (47.9 m) |

The toe is where the train's front starts plus 2 h0, so it moves a little with the wave's size.

Depth (m) every 2 h0 along the ray, from the toe region to the wall:

| x (h0) | 28 | 30 | 32 | 34 | 36 | 38 | 40 | 42 | 44 | 46 | 48 | 50 | 52 | 54 | 56 | 58 | 60 | 62 | 64 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| `pool_knee_small` | 4.29 | 3.81 | 3.33 | 2.85 | 2.37 | 1.89 | 1.41 | 0.92 | 0.90 | 1.17 | 1.62 | 2.07 | 2.52 | 2.97 | 3.42 | 3.87 | 4.32 | 4.50 | 4.50 |
| `pool_knee_big` | 4.39 | 3.97 | 3.55 | 3.14 | 2.72 | 2.30 | 1.89 | 1.47 | 1.05 | 0.90 | 1.03 | 1.48 | 1.93 | 2.38 | 2.83 | 3.28 | 3.73 | 4.18 | 4.50 |
| `pool_ledge_small` | 3.96 | 1.96 | 0.90 | 0.95 | 1.40 | 1.85 | 2.30 | 2.75 | 3.20 | 3.65 | 4.10 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 |
| `pool_ledge_big` | 4.26 | 2.26 | 0.90 | 0.90 | 1.34 | 1.79 | 2.24 | 2.69 | 3.14 | 3.59 | 4.04 | 4.49 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 |
| `pool_steep9_small` | 4.07 | 3.07 | 2.07 | 1.07 | 0.90 | 1.11 | 1.56 | 2.01 | 2.46 | 2.91 | 3.36 | 3.81 | 4.26 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 |
| `pool_steep9_big` | 4.23 | 3.23 | 2.23 | 1.23 | 0.90 | 1.04 | 1.49 | 1.94 | 2.39 | 2.84 | 3.29 | 3.74 | 4.19 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 | 4.50 |

## The M1's level-10 scouts (2026-11-04)

The runner's own scout of each case (`run_periodic.sh scout`: level 10, every 0.1 written, to t 44; then
`analysis/crest_track.py`), all six at once on the M1 Air in 10–11 min. Level 10 places the break; it cannot size the
cavity (the ruling: level 11 overstated the earlier small case's gap 1.7×), so no tube number here decides anything.
Open time is vertical to touchdown, × √(h0/g) = 0.677 s.

| Case | A0, foot crest at the toe | Face vertical: t, x | Still depth there | H at vertical (crest, trough ahead) | Touchdown; open | The scout's window, tsw:tmax:w0:w1 |
|---|---|---|---|---|---|---|
| `pool_knee_small` | 0.187 (0.84 m) | t 32.39, x 39.05 h0 (175.7 m) | 1.63 m, on the face | 1.91 m (1.45, −0.46) | t 34.2; 1.23 s | 27:37.5:33:48 |
| `pool_knee_big` | 0.242 (1.09 m) | t 31.67, x 39.34 (177.0 m) | 2.02 m, on the face | 2.29 m (1.83, −0.47) | t 33.5; 1.24 s | 26.5:37:33:48 |
| `pool_ledge_small` | 0.211 (0.95 m) | t 22.74, x 31.21 (140.5 m) | 0.90 m, the crest edge | 1.63 m (1.23, −0.40) | t 24.0; 0.85 s | 17.5:28:24:40 |
| `pool_ledge_big` | 0.250 (1.13 m) | t 22.52, x 31.57 (142.1 m) | 0.90 m, the crest edge | 1.84 m (1.42, −0.42) | t 23.4; 0.60 s | 17.5:28:24:41 |
| `pool_steep9_small` | 0.191 (0.86 m) | t 27.74, x 34.55 (155.5 m) | 0.90 m, the crest edge | 1.74 m (1.39, −0.35) | t 28.5; 0.51 s | 22.5:33:28:43 |
| `pool_steep9_big` | 0.246 (1.11 m) | t 26.68, x 34.41 (154.8 m) | 1.02 m, just before it | 2.31 m (1.91, −0.40) | t 27.9; 0.83 s | 21.5:32:28:43 |

- **Every case breaks in the domain, as the ruling's scouts foresaw:** the knee on its face (1.63 / 2.02 m still depth;
  the ruling's level-11 1.71 / 1.98 m), the ledge at the crest edge, the 1:9 face at or just before it.
- **The windows.** The advisor's provisional `20:34:24:48` / `50` hold every break in x, but not in time for four
  cases: the knee pair lands at t 34.2 / 33.5, past or 0.5 before the end at t 34, and the ledge pair goes vertical
  2.5–2.7 after t 20, under the 3 before vertical the library's frames start at. The case lines now carry the scouts' windows (above).
  On the M4 the runner scouts each case again and freezes its own: crest_track.py's switch 5 before vertical, end 3
  after touchdown (at least 5 after vertical), window from 3 h0 behind the crest 3 before vertical to at least 8 h0 ahead.
  Phase 2 then spans 10.5 √(h0/g) over 15–17 h0 in every case, as the earlier pair's 10.5–11 over 16.
- **The reef top barely moves these breaks at level 10.** `pool_knee_small` went vertical at the same t, x and depth as
  the advisor's flat-to-wall scout of the same line (sB0a), and landed 0.9 earlier (t 34.2 against 35.1); the 1:9 pair
  within 0.15 in t, its crest 0.08–0.13 m lower. On the ledge, against a scout of `pool_ledge_big` with the flat run
  to the wall (to t 30, the same level): the same x of vertical, 0.09 earlier; the crest 0.11 m lower, the trough ahead
  0.05 m deeper (−0.42 against −0.37 m), H 1.84 against 1.90 m; touchdown 0.2 earlier. The first wave's water runs off
  into the lagoon instead of ponding on the flat (inferred). Whether that matters for the cavity is level 13's to say.
- **The faces, for "the same face height".** The ledge pair's faces at vertical, 1.63 / 1.84 m, sit 7 / 3 % over the
  game's meter (1.52 / 1.79 m); the knee pair's, 1.91 / 2.29 m, 26 / 28 % over it, the 2D overshoot the ruling measured on
  today's floor. H/A0 is 1.72 / 1.63 on the ledge and 2.27 / 2.10 on the knee, at or inside the ruling's 1.4–1.7 and 2.0–2.3.
  The raw 2D faces don't match, so the advisor's sizes ruling (below) adds face-matched knee cases and compares at equal
  2D faces.
- **The ledge's foot crest reads under its sizing:** A0 0.211 / 0.250 against the ruling's 0.24 / 0.29 (−12 / −14 %).
  The knee and 1:9 pairs land on theirs (0.187–0.191, 0.242–0.246). On the ledge the toe is only 3.6 h0 before the
  crest, so the crest passing it already feels the ledge (its reflection and the first wave's backwash; inferred). The
  swept barrel keys cases by this A0, so a wired ledge case would key lower than its size suggests.

## The advisor's sizes ruling (2026-11-04, after the scouts)

- **Keep all six lines as they are.** The ledge pair's faces at vertical, 1.63 / 1.84 m, are what the owner sized for
  (7 / 3 % over the meter's 1.52 / 1.79 m); raising it to reach A0 0.24 / 0.29 would push its faces to about 1.85 /
  2.1 m. The knee pair, sized by the game's knee crest, is what the game would key if the knee wins.
- **Add two face-matched knee comparators,** today's knee face at about 1.62 / 1.86 m (level-10 scouts at H/h0
  0.215–0.255 put the faces at 1.56–1.91 m; 0.23 interpolated): `pool_kneeface_small` (4.5:0.23:10:0.0535:0.2:64:
  28.5:39:34:48:::2.7:0.05) and `pool_kneeface_big` (4.5:0.245:10:0.0463:0.2:64:29.5:40:35:50:::2.7:0.05). Eight
  cases with `JOBS=8` cost no extra wall time on the M4's performance cores.
- **The ledge's low foot crest doesn't change what the ledge means:** the run's A0 is read 3.6 h0 (16 m) along the ray
  from the crest edge, where the game's own knee (`POOL_FOOT_DEPTH` 4.4 m) also sits on a ledge floor (inferred). And a
  correction to the step-7 ruling: on a ledge the machine needs about **0–10 %** taller waves, not 25–35 % (the game's
  faces on today's floor sit about 20 % under the 2D faces, put down to 3D refraction over the 34 m face; a 7 m ledge
  leaves little room for that; inferred). Rerun the ledge pair after the floor change only if the game's knee crest at
  1.5 / 1.8 m faces falls outside 0.86–1.04 / 1.02–1.24 m.

## The decision rule (the advisor's ruling, §2.2 item 3)

**The ledge is adopted if both hold:**

1. its **usable clearance over its face height** (at vertical) is at least **1.3×** the face-matched knee's
   (`pool_ledge_small` against `pool_kneeface_small`, `pool_ledge_big` against `pool_kneeface_big`);
2. its **lip lands within 0.6–1.6 of its face height**.

*(The advisor's sizes ruling, 2026-11-04: compare at equal 2D faces, not by foot crest. The knee's 2D faces overshoot the
game's meter by 26–28 %, the ledge's by 3–7 %, so scaling by foot crest would set a 1.9 m knee wave against a 1.6 m
ledge wave, and a bigger wave on the same slope has a relatively smaller tube: a bias toward the ledge.)*

- **Usable clearance:** the clearance held over a 0.3 m depth along the ray (a crouched body), at life 0.5–0.9, at game
  scale, each case's own. It is not the max vertical gap: that counts a vertical wall under a few centimetres of
  overhang as air.
- **Where it is read from:** each case's 128-point profiles, `data/periodic_<case>_L13_library.json` and
  `barrels/periodic-<case>-l13.bin` here. Report both at the game's faces too (× meter ÷ face height, 0.93 and 0.97 for
  each pair; within a pair the faces differ by at most 2 %, so the verdict is the same).
- **Information, not the rule:** the 1:9 pair (the trend), and the original knee pair: if its clearance per face height
  differs from the face-matched knee's by more than 20 %, that is size sensitivity, reported.

**If the ledge wins** (the ruling's order): the floor change in `POOL_STRAIGHT` (`gradient` from 1/9.5 to about 1/2.0
square to the reef, `kneeRounding` from 3 to 1, the crest profile kept), then the probes (sizes, X, break depth, the
plunging section, the peel, the water on top, the catch, the current, `POOL_JOIN`, `POOL_RUNS`,
`POOL_STRAIGHT_BREAK_DEPTH`), then these cases into the game. **If not,** today's floor stays, with the pool's own cases.

## On the M4 Pro

From the repo, on main once `claude/pool-tube-runs-2` is merged:

```
git pull
npm run barrels:pool -- check               # the prerequisites (setup installs what's missing)
JOBS=8 POOL_CASES="pool_ledge_big pool_ledge_small pool_kneeface_big pool_kneeface_small pool_knee_big pool_knee_small pool_steep9_big pool_steep9_small" CANYON_OUT=docs/research/pool-tube-runs-2 npm run barrels:pool
npm run barrels:pool -- status              # the last run's cases: phase, t and ETA
```

- **What runs:** per case, a level-10 scout places the switch, end and window; phase 1 at level 10, phase 2 at level 13
  (`LEVEL2` 13) inside the window; then the analysis, the case files and the report.
- **How long:** about 2.5–3 h with `JOBS=8` (an estimate). The earlier pair's phase 2 took 2h01 and 2h21 on the M4
  at the same level and domain; the scouts and phase 1 take minutes, the analysis about 10 minutes.
- **What it writes here:** `report.md`, `summary.json`, `data/`, the figures, `barrel-index.json`, `barrel-cases.md` and
  `barrels/*.bin`. Nothing goes to `public/barrels` or the game's index until the rule picks.
- **Stop and resume:** `npm run barrels:pool -- stop`, then the run command again (10-minute checkpoints).

**Send back** this folder:

```
git add docs/research/pool-tube-runs-2
git commit -m "data(pool): the bigger-tube batch at level 13"
git push
```

## Checks on this branch (the M1, 2026-11-04)

- **The option is off by default:** every older case's qcc line (`run_periodic.sh flags`, 16 cases) is byte for byte
  main's, and a level-8 run of `pool_straight_small` (t 0–3) with main's `periodic.c` and this one wrote identical facets
  (42 frames), `bed.dat` and `final`.
- **The runner:** `npm run barrels:pool -- check` passes; `-- smoke` passes (the converter's `.bin` matches the
  committed one byte for byte), and so does a smoke of the six batch cases at levels 7 and 8 (its report under the
  batch's title, every case file beside it). The batch's folders: report and `barrels/` in `docs/research/pool-tube-runs-2`
  by default; `CANYON_OUT=docs/research/pool-tube-runs` with a batch case is refused; the earlier pool and Canyon runs
  still write to their own folders and `public/barrels`.
- **Types and tests:** `npx tsc --noEmit -p .` clean; the main suite (`npx vitest run src --maxWorkers=3`, without
  SurfZoneSimulation and SurfZoneRunner) 317 files passed, 34 skipped; 3050 tests passed, 23 expected fails, 40 skipped.
  No `src/` change, so no SurfZoneSimulation subset. No test covers `tools/basilisk` itself; the smoke runs are its check.
- **The M1's Basilisk time:** about 15 minutes (levels 7–10 only).
