#!/bin/bash
# The Wave Pool's Barrel tube runs on the M4 Pro, in one command (pool-barrel, step 2): the Barrel floor's cases (one per
# size, on each arm's ray; tools/basilisk/run_periodic.sh's pool_barrel_*), each scouted at level 10, run at level 10
# then 13 in its break window, analysed, and turned into the swept barrel's case files and a report
# (docs/research/pool-tube-runs/). The same supervisor as the Canyon's (canyon_pipeline.py, TUBE_SET=pool); see
# tools/basilisk/README.md, "The Wave Pool's Barrel tube runs", and docs/research/pool-barrel-2026-11-01/README.md.
#
#   npm run barrels:pool                   check the prerequisites, then start (or resume) the runs in the background,
#                                          kept awake, and follow the log (Ctrl-C stops following, not the runs)
#   npm run barrels:pool -- status         where each case is, with an ETA
#   npm run barrels:pool -- log            follow the log again
#   npm run barrels:pool -- stop           stop the runs (rerun to resume from their 10-minute checkpoints)
#   npm run barrels:pool -- analyse        the analysis, case files and report again, from the finished runs
#   npm run barrels:pool -- check          the prerequisites only
#   npm run barrels:pool -- setup          install what's missing: Basilisk (into ~/basilisk-C) and the Python packages
#                                          (into tools/basilisk/.venv); both download
#   npm run barrels:pool -- smoke          a few seconds of one case at levels 7 and 8 (tools/basilisk/runs/smoke), to
#                                          prove the compile, run and analysis plumbing
#
# (tools/basilisk/run_pool.sh takes the same commands.) -j N (or JOBS=N): cases at once (default: both, at most one per
# performance core and per 4 GB of memory). LEVEL2=14 runs phase 2 one level finer (phase 1 is reused). OMP=1 gives each
# case its share of the performance cores with OpenMP (brew install libomp). PYTHON, BASILISK_HOME and RUNS as for the
# Canyon's. POOL_CASES="pool_barrel_small" runs one case only. Safe to rerun at any point.
HERE="$(cd "$(dirname "$0")" && pwd)"
export TUBE_SET=pool TUBE_SCRIPT="npm run barrels:pool --" TUBE_PREFIX=pool_barrel TUBE_USAGE="$HERE/run_pool.sh"
exec bash "$HERE/run_canyon.sh" "$@"
