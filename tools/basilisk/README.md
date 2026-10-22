# Basilisk barrel profiles

Offline 2D simulations of waves overturning on the game's bed transects, for the swept barrel's profile library (see `docs/research/water-physics/basilisk-profiles.md` and the round 6 notes). Nothing here ships with the game.

## Licence

`slope.c` is a derivative of Basilisk's sandbox code (W. Mostert's `shallow.c`), so it is licensed under the GNU GPL version 3; see [COPYING](COPYING). The profiles it produces are data. The Python scripts in `analysis/` are the project's own.

## Running Padang Padang at level 13 on a Mac

The owner decided (2026-09-29) to run Padang's peak on a 1:19 wedge along the wave's path at level 13 (4 cm cells). It can't finish in a cloud session, whose container is reclaimed when idle.

1. Install the Xcode command line tools (`xcode-select --install`) and Python 3 with numpy, scipy and matplotlib.
2. Run `tools/basilisk/run_padang.sh`. The first time, it clones Basilisk's GitHub mirror to `~/basilisk-C` and builds it (about a minute). Then it starts the run in the background, kept awake with `caffeinate`.
3. Check on it with `tools/basilisk/run_padang.sh status`. The face goes vertical at t ≈ 21.45 and the lip lands at t ≈ 22.45; the run ends at t = 25.
4. When it's done, run `tools/basilisk/run_padang.sh analyse`. It writes the metrics, the 128-point profile library and two figures next to the run in `tools/basilisk/runs/` (git-ignored).

**Stopping and resuming.** The run saves a checkpoint every 10 minutes of wall time. If the Mac restarts or you stop it, run the script again and it resumes from the checkpoint.

**Time (estimates, not measured on a Mac):**
- On one core, as Apple's clang has no OpenMP: 8–35 h.
- With `brew install libomp` and `OMP=1 tools/basilisk/run_padang.sh`: roughly 3–8 h on the M4 Pro's performance cores. This mode is untested. Delete `tools/basilisk/runs/pad19_L13/pad19` before switching modes, so it recompiles.

**A coarser run:** `LEVEL=12` (about 4× cheaper) or `LEVEL=11` (the round 6 level) set before any command.

Set `BASILISK_HOME` to use an existing Basilisk build elsewhere.

## The barrel library's other swell sizes

The swept barrel blends cases by H0/h0 (the wave's height at the wedge's base over its 7 m depth), so the library holds three at level 12: 0.2, 0.3 (the owner's case) and 0.45. Each has its own output window, from level-10 scouts on the M1 (2026-09-30; a crude facet reader counting where the surface folds over, so ±0.3):

| A0 | Lip first folds over | Where | Touchdown | TOUT0 | TMAX |
|---|---|---|---|---|---|
| 0.2 | t ≈ 24.6 | on the reef flat, about 1 h0 past its edge | t ≈ 25.2 | 21.5 | 28 |
| 0.3 | t ≈ 21.45 (level 11) | at the reef flat's edge | t ≈ 22.45 | 18.5 | 25 |
| 0.45 | t ≈ 17.9 | on the wedge, about 2.6 h0 before the flat | t ≈ 19.1 | 15 | 21.5 |

```
LEVEL=12 A0=0.2 TOUT0=21.5 TMAX=28 NAME=pad19_a20_L12 tools/basilisk/run_padang.sh
LEVEL=12 A0=0.3 TOUT0=18.5 TMAX=25 NAME=pad19_a30_L12 tools/basilisk/run_padang.sh
LEVEL=12 A0=0.45 TOUT0=15 TMAX=21.5 NAME=pad19_a45_L12 tools/basilisk/run_padang.sh
```

The same variables, with `status` or `analyse`, check on or analyse each (`analyse` needs Python with numpy, scipy and matplotlib). Then `npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --flat 0.1785714` turns them into the game's cases (`docs/research/barrel-library.md`).

The runs (M1 Air, level 12, one core each, all three at once, 2026-09-29/30), at the last output before touchdown against Pick & Feddersen's fits, and their landmarks clean per phase (before vertical / open tube / after touchdown):

| Run | Wall | Vertical, touchdown (t) | A_O/H_I² | W_O/L_O | θ_O | L/W | Clean |
|---|---|---|---|---|---|---|---|
| `pad19_a20_L12` | 265 min | 24.40, 25.10 | 0.05 / 0.38 | 0.50 / 0.43 | 57° / 31° | 2.01 | 116/117, 27/27, 48/117 |
| `pad19_a30_L12` | 282 min | 21.24, 22.43 | 0.19 / 0.34 | 0.47 / 0.42 | 41° / 35° | 2.11 | 106/110, 47/47, 42/104 |
| `pad19_a45_L12` | 298 min | 17.68, 19.05 | 0.23 / 0.30 | 0.44 / 0.40 | 40° / 39° | 2.30 | 98/108, 54/54, 49/99 |

Why the tubes run smaller than the plane-slope fits (small waves make small, steep tubes on this wedge): `docs/research/barrel-library.md`.

## The Reef's ledge

`tools/basilisk/run_reef.sh` runs the Reef's peak in two cases, both from the 10 m shelf to the 1.5 m reef crest:
- **reef42:** the ledge at 1:4.2 along the wave's path, the steepest crossing the Teahupo'o Reef report measured;
- **reef60:** at 1:6, near the median of the game's own readings.

The owner asked for them (2026-09-30) to source the Reef's lip and tube, which are provisional beyond Pick & Feddersen's fits.
- **Commands:** `run`, `status` and `analyse`, as for Padang.
- **Level:** 11 by default. Each case uses one core.
- **Where it has run:** on the owner's M1 on 2026-09-30, alongside other work. `LEVEL=12` or `13` refines it on the M4 Pro.
- **Disk:** the Basilisk mirror takes about 2.8 GB in `~/basilisk-C`. On macOS its checkout reports errors outside `basilisk-source/src`, which doesn't matter here.
- **What it found:** a solitary wave climbs the Reef's ledge unbroken and breaks on the flat, so it can't source the Reef's ledge plunge.

## Periodic waves

`tools/basilisk/run_periodic.sh` runs a train of cnoidal waves, so the wave studied, the second crest, breaks into the trough its predecessor leaves. The owner approved these runs on 2026-09-30. A level-9 test on the Reef's 1:4.2 ledge shows the step: the first wave's backwash drains the ledge to about 1.8 m below still level, and the second crest breaks at the ledge top.
- **`periodic.c`:** `slope.c` with the solitary wave replaced by the train in `train.dat`, written by `analysis/cnoidal_train.py` (first-order cnoidal theory). It dumps `final` at the end, so a finer build can continue from it, and can keep its finest two levels inside a window (`XWIN0`, `XWIN1`).
- **Two phases per case:** level 10 until the second crest nears the break, then level 12 inside a window around it.
- **Cases:** `reef42` and `reef60` (the Reef's ledge at 1:4.2 and 1:6); `padang19`, `padang19b` and `padang19c` (Padang's 16 s, 18 s and 14 s swells, which give the swept barrel its onset lag for swell); `padang19s` (the Small swell, for the barrel library); `point21_a08`, `point21_a15`, `point21_a23` and `point21_a30` (the Point's transect at four sizes, for PR 7); `reef42_a35` (a 3.5 m crest on the Reef's ledge, the second point of its throw line); `canyon23_a29`, `canyon23_a38` and `canyon23_a49` (the Canyon's reef bed, below). PR 7's records say which of them the library uses, and why.
- **Two-slope beds:** a case may end with `:HMID:S2`, the depth where the first slope ends (in h0) and the second slope from there to the flat, as `slope.c` takes them. Without them the bed is one slope to the flat, and the old cases build exactly as before (their qcc command lines were checked byte for byte, 2026-10-21).
- **Commands:** `run`, `status` and `analyse`, optionally with case names. Set `PYTHON` to a Python with numpy, scipy and matplotlib. For a supervisor: `fg` (both phases in the foreground), `scout` (the whole case at `SCOUT_LEVEL`, 10, every frame written, which `analysis/crest_track.py` reads to place the switch, end and window), `compile`, `cases` and `flags` (the qcc command lines). `CASES_FILE` replaces or adds case definitions by name; `RUNS` moves the runs' folder; `OMP=1` builds with OpenMP.
- **Overview figure:** `analysis/train_overview.py` draws a run's surface along the whole domain at chosen times.

## The Canyon's tube runs

The swept barrel for the Canyon needs its own Navier–Stokes cases on the reef bed of 2026-10-22 (`docs/research/canyon-reef-bed-2026-10-22/README.md`, "What the swept-barrel step will need"), on canyon-long-wave's planar arm (`docs/research/canyon-long-wave-2026-10-22/README.md`, "The tube runs": the take-off 8 m downcoast of the peak, now x −9, on one 1:23 face). `tools/basilisk/run_canyon.sh` runs all three on the M4 Pro and turns them into the barrel library's files, in one command.

The cases are two-crest cnoidal trains, the second crest studied, along the wave's path from the arm's 6 m foot (h0): one planar face at 1:23 to the 1.0 m crest (0.167 h0), then flat to the closed right wall. Since canyon-long-wave (`docs/research/canyon-long-wave-2026-10-22/README.md`, "The tube runs") the arm's face is planar and runs into the beach: every column along it has this transect, so there is no separate down-the-line case (`canyon23f54_a38`, on the fan's 1:54 at x 18, is gone; on the fan the face rounded at the 2.2 m hinge, 0.367 h0, into 1:31 at the take-off).

| Case | Transect | H/h0 | T | What it sources |
|---|---|---|---|---|
| `canyon23_a29` | x −9, the take-off (planar 1:23) | 0.29 | 11 s | Medium's sets: a real tube, or only a curl? |
| `canyon23_a38` | x −9 (planar 1:23) | 0.38 | 14 s | Big's typical wave |
| `canyon23_a49` | x −9 (planar 1:23) | 0.49 | 14 s | Big's sets |

**What it does,** per case, three at once (one core each):
1. **Scout:** the whole case at level 10, every 0.1 written (minutes). `analysis/crest_track.py` follows the second crest and finds where its face goes vertical. That places phase 2 (in √(h0/g) and h0): the switch 5 before vertical, the end 3 after touchdown (at least 5 after vertical; 6.5 if the scout saw none), and the window from 3 h0 behind the crest as it stands 3 before vertical to at least 8 h0 ahead of where it goes vertical. They are frozen in `tools/basilisk/runs/canyon/cases.txt`, so a resumed run keeps them.
2. **Phase 1** at level 10 to the switch, then **phase 2** at level 13 inside the window (4.1–5.0 cm cells at the 56–68 h0 domains, so a lip of about 0.2 m spans about 4–5 cells; basilisk-profiles.md's rule asks for about 6). Each build is compiled once. If phase 2 ends too soon after its own break (finer grids can break a little later than the scout), it is carried on by 4, once, from its final state.
3. **Analysis:** the foot crest A0 from the scout; then `plunge_measure.py` (face vertical, touchdown, the tube and jet just before it) and `periodic_library.py` (the 128-point profiles), with the crest searches placed from the level-13 track; figures if matplotlib is there.
4. **The library's files:** `npm run barrels` writes each case that threw a tube to `public/barrels/periodic-canyon23-*-l13.bin`, the swept barrel's case format. The game's index (`src/wave/barrel/barrelLibraryIndex.ts`) is left alone: the cases' entries and validation table go to `docs/research/canyon-tube-runs/barrel-index.json` and `barrel-cases.md`.
5. **The report:** `docs/research/canyon-tube-runs/report.md` (and `summary.json`): per case, where the face went vertical and in what depth, H, the tube's open time, jet and tube per H² against Pick & Feddersen's fits, L/W, tilt, cells across the lip, clean frames and wall times. The analysis files are copied to its `data/`, so the cases can be rebuilt on any machine.

**On the M4 Pro**, from the repo. If you ran any Canyon case before 2026-10-22's long-wave face (the cases kept their names but their bed is now one 1:23 slope), delete `tools/basilisk/runs/canyon` first: its frozen `cases.txt` and finished phases would otherwise be reused.

```
git fetch origin
git checkout claude/canyon-tube-runs
git pull
tools/basilisk/run_canyon.sh check     # what's missing, and how to install it
tools/basilisk/run_canyon.sh setup     # only if check asked: Basilisk into ~/basilisk-C, numpy/scipy/matplotlib into tools/basilisk/.venv
tools/basilisk/run_canyon.sh smoke     # optional, about a minute: levels 7 and 8, proves the compile, run and analysis plumbing
tools/basilisk/run_canyon.sh           # the runs
```

`check` looks for Xcode's command line tools (`xcode-select --install`), Basilisk's `qcc`, Python 3.9+ with numpy and scipy (matplotlib for the figures), npm with the repo's `node_modules` (`npm ci`; only the last step needs it) and at least 5 GB free (the set writes about 1–2 GB, in `tools/basilisk/runs/`, git-ignored). `setup` downloads: a git clone of Basilisk's GitHub mirror (2.8 GB, built in about a minute) and the Python packages.

`tools/basilisk/run_canyon.sh` starts the runs in the background, kept awake with `caffeinate` (plugged in, the Mac won't sleep), and follows the log; Ctrl-C stops following, not the runs. The log is in `tools/basilisk/runs/canyon/logs/latest/`, one file per case beside the supervisor's.

- **Progress:** `tools/basilisk/run_canyon.sh status` (each case's phase, t, cells and ETA, and the set's), or `tools/basilisk/run_canyon.sh log` to follow again. The ETAs extrapolate the last 20 minutes; the set's is rough until every case is in phase 2.
- **How long** (an estimate, not measured on the M4): the scouts and phase 1 about 10–20 minutes; phase 2 at level 13 roughly 2–4 h per case on one performance core, all three at once; the analysis 10–20 minutes. So about 3–5 hours for the set. It rests on the level-12 periodic runs (phase 2 took 20–38 minutes on a quiet M1, 1.8–2.1 h under load) at about 5× per level and the M4's faster core. Up to about a day if it costs like whole-domain level-13 runs.
- **Stopping and resuming:** `tools/basilisk/run_canyon.sh stop`, then `tools/basilisk/run_canyon.sh` again; after a restart or a crash, just run it again. Each run resumes from its last 10-minute checkpoint, and finished scouts, phases and analyses are skipped.
- **Options:** `-j N` (cases at once; default all three, at most one per performance core and per 4 GB). `LEVEL2=14` runs phase 2 one level finer, reusing phase 1 (about 5× the cost), if the report shows fewer than about 4 cells across the lip; give `status` the same `LEVEL2`. `OMP=1` gives each case its share of the performance cores with OpenMP (needs `brew install libomp`; untested so far: libomp wasn't on the M1).
- **If a case fails,** the supervisor says so and carries on with the others; its log (`tools/basilisk/runs/canyon/logs/latest/<case>.log`) and the run's `err.log` say why. Rerun to retry it. To scout a case again, delete its line in `tools/basilisk/runs/canyon/cases.txt` and its `periodic_<case>_*` folders.
- **Again from the finished runs:** `tools/basilisk/run_canyon.sh analyse` redoes the analysis, the case files and the report (after installing matplotlib or `npm ci`, say).

**Afterwards, commit and push** the case files and the report folder, so the Canyon's swept barrel can be wired next:

```
git add public/barrels/periodic-canyon23-*.bin docs/research/canyon-tube-runs
git commit -m "data(canyon): the Canyon's tube runs at level 13"
git push
```

A case that threw no tube has no `.bin` (its row in the report says so, as `point21_a08` did at the Point); its analysis files are in `data/` all the same.
