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
- **Cases:** `reef42` and `reef60` (the Reef's ledge at 1:4.2 and 1:6); `padang19`, `padang19b` and `padang19c` (Padang's 16 s, 18 s and 14 s swells, which give the swept barrel its onset lag for swell); `padang19s` (the Small swell, for the barrel library).
- **Commands:** `run`, `status` and `analyse`, optionally with case names. Set `PYTHON` to a Python with numpy, scipy and matplotlib.
- **Overview figure:** `analysis/train_overview.py` draws a run's surface along the whole domain at chosen times.
