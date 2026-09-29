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

The same variables, with `status` or `analyse`, check on or analyse each. Then `npm run barrels -- --run pad19_a20_L12 --run pad19_a30_L12 --run pad19_a45_L12 --flat 0.1785714` turns them into the game's cases (`docs/research/barrel-library.md`).
