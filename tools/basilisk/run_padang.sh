#!/bin/bash
# Run (or resume) Padang Padang's 1:19 transect in Basilisk, then analyse it.
#
#   tools/basilisk/run_padang.sh           start or resume the level-13 run in the background
#   tools/basilisk/run_padang.sh status    show progress
#   tools/basilisk/run_padang.sh analyse   once it is done: metrics, the 128-point library, figures
#
# LEVEL=12 (or 11) runs a coarser grid. OMP=1 uses Homebrew's libomp on macOS
# (brew install libomp; untested), otherwise the run uses one core.
# A0 (the wave's height over the 7 m base, 0.3 by default) runs another swell size,
# with TOUT0 and TMAX (the fine output's start and the run's end) and its own NAME;
# the defaults are the owner's level-13 run.
# Safe to rerun: it resumes from the last checkpoint.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LEVEL="${LEVEL:-13}"
A0="${A0:-0.3}"
TOUT0="${TOUT0:-18.5}"
TMAX="${TMAX:-25}"
NAME="${NAME:-pad19_L$LEVEL}"
RUN="$HERE/runs/$NAME"
BASILISK_HOME="${BASILISK_HOME:-$HOME/basilisk-C}"
export BASILISK="$BASILISK_HOME/basilisk-source/src"
export PATH="$PATH:$BASILISK"

# Padang's peak, dimensionless with h0 = 7 m: 1:19 along the wave's path from the
# 7 m wedge base to the 1.25 m reef flat, a 2.1 m solitary wave (round 6 notes §4).
FLAGS="-DLEVEL=$LEVEL -DS1=0.0526316 -DHMID=0.1785714 -DHS=0.1785714 -DA0=$A0 \
  -DXW=8.0 -DXTOE=17.0 -DDOMAIN=48 -DTMAX=$TMAX -DTOUT0=$TOUT0 -DDTOUT=0.025"

build_basilisk() {
  [ -x "$BASILISK/qcc" ] && return
  [ -d "$BASILISK_HOME" ] || git clone --depth 1 https://github.com/comphy-lab/basilisk-C.git "$BASILISK_HOME"
  cd "$BASILISK"
  if [ "$(uname)" = Darwin ]; then ln -sf config.osx config; else ln -sf config.gcc config; fi
  # Serially: a parallel make races. The GPU backends fail to build, which doesn't matter here.
  make -k > make.log 2>&1 || true
  [ -x "$BASILISK/qcc" ] || { echo "qcc did not build; see $BASILISK/make.log"; exit 1; }
}

omp_flags() {
  if [ "$(uname)" != Darwin ]; then echo "-fopenmp"; return; fi
  [ "${OMP:-0}" = 1 ] || return 0
  local p; p="$(brew --prefix libomp)"
  echo "-Xpreprocessor -fopenmp -I$p/include -L$p/lib -lomp"
}

running() { pgrep -f "$RUN/pad19" > /dev/null; }

case "${1:-run}" in
  run)
    [ -f "$RUN/done" ] && { echo "Done: $(cat "$RUN/done"). Next: $0 analyse"; exit 0; }
    running && { echo "Already running."; exit 0; }
    build_basilisk
    mkdir -p "$RUN/facets"
    cd "$RUN"
    if [ ! -x "$RUN/pad19" ]; then
      cp "$HERE/slope.c" slope.c   # qcc compiles in place, beside the source
      # shellcheck disable=SC2046
      qcc -O2 $(omp_flags) $FLAGS slope.c -o "$RUN/pad19" -lm
    fi
    [ -f restart ] && echo "Resuming from the last checkpoint." || echo "Starting."
    KEEP_AWAKE=""; [ "$(uname)" = Darwin ] && KEEP_AWAKE="caffeinate -i"
    OMP_WAIT_POLICY=passive nohup $KEEP_AWAKE "$RUN/pad19" >> out.log 2>> err.log < /dev/null &
    echo "Running in the background. Progress: $0 status"
    ;;
  status)
    if [ -f "$RUN/done" ]; then echo "Done: $(cat "$RUN/done")"; exit 0; fi
    running && echo "Running." || echo "Not running; $0 resumes it."
    # Fields: step, t (at A0 0.3: vertical ≈ 21.45, touchdown ≈ 22.45), dt, cells, wall seconds.
    [ -f "$RUN/timing.log" ] && tail -1 "$RUN/timing.log" | awk -v end="$TMAX" '{print "step "$4", t = "$5" of "end", dt "$6", cells "$7", wall "$8" s"}'
    ;;
  analyse)
    [ -f "$RUN/done" ] || { echo "Not finished yet."; exit 1; }
    cd "$HERE/analysis"   # needs Python 3 with numpy, scipy and matplotlib
    python3 metrics.py "$RUN" "$LEVEL" 48 0.0526316 "$A0" "$TOUT0"
    python3 library.py "$RUN" "$LEVEL" 48 0.0526316 "$A0" 7.0 "$TOUT0"
    python3 render.py "${RUN}_library.json" "${RUN}_strip.png" "${RUN}_tube.png" 2 \
      "Padang 1:19 along the path, A0 $A0, level $LEVEL" "$RUN/bed.dat"
    echo "Wrote ${RUN}_metrics.json, ${RUN}_library.json, ${RUN}_strip.png and ${RUN}_tube.png"
    ;;
  *) echo "Usage: $0 [run|status|analyse]"; exit 1 ;;
esac
