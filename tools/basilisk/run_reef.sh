#!/bin/bash
# Run (or resume) the Reef's ledge transects in Basilisk, then analyse them.
#
#   tools/basilisk/run_reef.sh             start or resume both cases in the background
#   tools/basilisk/run_reef.sh status      show progress
#   tools/basilisk/run_reef.sh analyse     once they are done: metrics, the 128-point library, figures
#
# The two cases are the Reef's ledge along the wave's path at its peak, from the 10 m shelf
# to the 1.5 m reef crest, then the reef flat (src/wave/Bathymetry.ts, REEF). The ledge is
# 1:2.29 across its crest line, but the game's waves cross it obliquely: 1:4.2 at the steepest
# the Teahupo'o Reef report measured (57 degrees to its normal), and about 1:6 near the median
# of the game's own orthogonal-gradient readings (docs/research/teahupoo-reef-report.md).
# A 3 m solitary wave on the shelf (A0 = 0.3) breaks at about the Big swell's height.
#
# LEVEL=12 or 13 runs a finer grid (the default 11 was run on an M1 on 2026-09-30).
# OMP=1 uses Homebrew's libomp on macOS (brew install libomp; untested), otherwise
# each case uses one core. Safe to rerun: each case resumes from its last checkpoint.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LEVEL="${LEVEL:-11}"
BASILISK_HOME="${BASILISK_HOME:-$HOME/basilisk-C}"
export BASILISK="$BASILISK_HOME/basilisk-source/src"
export PATH="$PATH:$BASILISK"

# Dimensionless with h0 = 10 m (the shelf): case name, slope along the path, wave centre, toe,
# first time written finely, end time. The face goes vertical at about t = 11.9 on 1:4.2.
CASES="reef42:0.238095:8.0:16.0:10.5:16 reef60:0.166667:7.0:15.0:11.5:18"
COMMON="-DHMID=0.15 -DHS=0.15 -DA0=0.3 -DDOMAIN=28 -DDTOUT=0.025"

build_basilisk() {
  [ -x "$BASILISK/qcc" ] && return
  [ -d "$BASILISK_HOME" ] || git clone --depth 1 https://github.com/comphy-lab/basilisk-C.git "$BASILISK_HOME"
  cd "$BASILISK"
  if [ "$(uname)" = Darwin ]; then ln -sf config.osx config; else ln -sf config.gcc config; fi
  # Serially: a parallel make races. The GPU backends and viewers fail to build, which doesn't matter here.
  make -k > make.log 2>&1 || true
  [ -x "$BASILISK/qcc" ] || { echo "qcc did not build; see $BASILISK/make.log"; exit 1; }
}

omp_flags() {
  if [ "$(uname)" != Darwin ]; then echo "-fopenmp"; return; fi
  [ "${OMP:-0}" = 1 ] || return 0
  local p; p="$(brew --prefix libomp)"
  echo "-Xpreprocessor -fopenmp -I$p/include -L$p/lib -lomp"
}

each_case() {  # calls "$1 name slope xw xtoe tout0 tmax" for every case
  local c
  for c in $CASES; do IFS=: read -r name slope xw xtoe tout0 tmax <<< "$c"; "$1" "$name" "$slope" "$xw" "$xtoe" "$tout0" "$tmax"; done
}

start() {
  local name=$1 slope=$2 xw=$3 xtoe=$4 tout0=$5 tmax=$6
  local run="$HERE/runs/${name}_L$LEVEL" exe="${name}_L$LEVEL"
  [ -f "$run/done" ] && { echo "$name: done ($(cat "$run/done"))."; return; }
  pgrep -f "^\./$exe" > /dev/null && { echo "$name: already running."; return; }
  mkdir -p "$run/facets"
  cd "$run"
  if [ ! -x "$run/$exe" ]; then
    cp "$HERE/slope.c" slope.c   # qcc compiles in place, beside the source
    # shellcheck disable=SC2046,SC2086
    qcc -O2 $(omp_flags) -DLEVEL=$LEVEL -DS1=$slope -DXW=$xw -DXTOE=$xtoe -DTOUT0=$tout0 -DTMAX=$tmax $COMMON \
      slope.c -o "$exe" -lm
  fi
  [ -f restart ] && echo "$name: resuming from the last checkpoint." || echo "$name: starting."
  local keep_awake=""; [ "$(uname)" = Darwin ] && keep_awake="caffeinate -i"
  OMP_WAIT_POLICY=passive nohup $keep_awake "./$exe" >> out.log 2>> err.log < /dev/null &
}

report() {
  local name=$1 tmax=$6 run="$HERE/runs/${1}_L$LEVEL"
  if [ -f "$run/done" ]; then echo "$name: done ($(cat "$run/done"))"; return; fi
  pgrep -f "^\./${name}_L$LEVEL" > /dev/null && printf "%s: running" "$name" || printf "%s: not running (rerun to resume)" "$name"
  [ -f "$run/timing.log" ] && tail -1 "$run/timing.log" | awk -v T="$tmax" '{printf ", t = %s of %s, dt %s, cells %s, wall %s s", $5, T, $6, $7, $8}'
  echo
}

analyse() {
  local name=$1 slope=$2 tout0=$5 run="$HERE/runs/${1}_L$LEVEL"
  [ -f "$run/done" ] || { echo "$name: not finished yet."; return; }
  cd "$HERE/analysis"   # needs Python 3 with numpy, scipy and matplotlib
  python3 metrics.py "$run" "$LEVEL" 28 "$slope" 0.3 "$tout0"
  python3 library.py "$run" "$LEVEL" 28 "$slope" 0.3 10.0 "$tout0"
  python3 render.py "${run}_library.json" "${run}_strip.png" "${run}_tube.png" 3 \
    "Reef ledge, $name (1:$(python3 -c "print(round(1/$slope, 1))") along the path), level $LEVEL" "$run/bed.dat"
  echo "$name: wrote ${run}_metrics.json, ${run}_library.json, ${run}_strip.png and ${run}_tube.png"
}

case "${1:-run}" in
  run) build_basilisk; each_case start; echo "Progress: $0 status" ;;
  status) each_case report ;;
  analyse) each_case analyse ;;
  *) echo "Usage: $0 [run|status|analyse]"; exit 1 ;;
esac
