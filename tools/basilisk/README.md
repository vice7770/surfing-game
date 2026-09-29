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
