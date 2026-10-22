#!/bin/bash
# The Canyon's tube runs on the M4 Pro, in one command: three periodic cases on the Canyon's reef bed, each scouted at
# level 10, run at level 10 then 13 in its break window, analysed, and turned into the swept barrel's case files and a
# report (docs/research/canyon-tube-runs/). See tools/basilisk/README.md, "The Canyon's tube runs".
#
#   tools/basilisk/run_canyon.sh [-j N]      check the prerequisites, then start (or resume) the runs in the background,
#                                            kept awake, and follow the log (Ctrl-C stops following, not the runs)
#   tools/basilisk/run_canyon.sh status      where each case is, with an ETA
#   tools/basilisk/run_canyon.sh log         follow the log again
#   tools/basilisk/run_canyon.sh stop        stop the runs (rerun to resume from their 10-minute checkpoints)
#   tools/basilisk/run_canyon.sh analyse     the analysis, case files and report again, from the finished runs
#   tools/basilisk/run_canyon.sh check       the prerequisites only
#   tools/basilisk/run_canyon.sh setup       install what's missing: Basilisk (into ~/basilisk-C) and the Python packages
#                                            (into tools/basilisk/.venv); both download
#   tools/basilisk/run_canyon.sh smoke       a few seconds of one case at levels 7 and 8 (tools/basilisk/runs/smoke), to
#                                            prove the compile, run and analysis plumbing
#
# -j N (or JOBS=N): cases at once (default: all three, at most one per performance core and per 4 GB of memory).
# LEVEL2=14 runs phase 2 one level finer (phase 1 is reused). OMP=1 gives each case its share of the performance cores
# with OpenMP (brew install libomp; its speed-up isn't measured). PYTHON picks the Python (default tools/basilisk/.venv's,
# else python3). BASILISK_HOME (default ~/basilisk-C) picks the Basilisk build. Safe to rerun at any point.
set -uo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
BASILISK_HOME="${BASILISK_HOME:-$HOME/basilisk-C}"
BASILISK="$BASILISK_HOME/basilisk-source/src"
VENV="$HERE/.venv"
if [ -n "${PYTHON:-}" ]; then PY="$PYTHON"; elif [ -x "$VENV/bin/python" ]; then PY="$VENV/bin/python"; else PY="python3"; fi
export PYTHON="$PY" BASILISK_HOME
STATE="${RUNS:-$HERE/runs}/canyon"

JOBS_ARG=()
CMD=""
while [ $# -gt 0 ]; do
  case "$1" in
    -j) JOBS_ARG=(-j "$2"); shift 2 ;;
    -j*) JOBS_ARG=(-j "${1#-j}"); shift ;;
    *) [ -z "$CMD" ] && CMD="$1"; shift ;;
  esac
done
CMD="${CMD:-run}"

problems=0
problem() {  # what is missing, then how to install it
  problems=$((problems + 1))
  printf '\n  MISSING: %s\n    %s\n' "$1" "$2"
}

check() {
  echo "Checking the prerequisites…"
  if [ "$(uname)" != Darwin ] || [ "$(uname -m)" != arm64 ]; then
    echo "  (Not macOS on Apple silicon: the scripts should still work, but they were written for the M4 Pro.)"
  fi
  if ! xcode-select -p > /dev/null 2>&1 || ! command -v cc > /dev/null || ! command -v make > /dev/null; then
    problem "a C compiler and make (Xcode's command line tools)" "xcode-select --install"
  fi
  if [ ! -x "$BASILISK/qcc" ]; then
    problem "Basilisk's qcc compiler (looked in $BASILISK)" \
      "tools/basilisk/run_canyon.sh setup    # clones github.com/comphy-lab/basilisk-C into $BASILISK_HOME and builds it: about a minute, 2.8 GB"
  fi
  if ! "$PY" -c 'import sys; assert sys.version_info >= (3, 9)' 2> /dev/null; then
    problem "Python 3.9 or newer (tried $PY)" "brew install python    # then: tools/basilisk/run_canyon.sh setup"
  elif ! "$PY" -c 'import numpy, scipy.special, scipy.optimize, scipy.spatial' 2> /dev/null; then
    problem "numpy and scipy for $PY" \
      "tools/basilisk/run_canyon.sh setup    # makes tools/basilisk/.venv from tools/basilisk/analysis/requirements.txt"
  elif ! "$PY" -c 'import matplotlib' 2> /dev/null; then
    echo "  (matplotlib is missing for $PY: the runs go ahead, without figures. tools/basilisk/run_canyon.sh setup adds it.)"
  fi
  if ! command -v npm > /dev/null || [ ! -e "$REPO/node_modules/.bin/rolldown" ]; then
    echo "  (npm or the repo's node_modules is missing: the runs go ahead, but the last step, the game's case files,"
    echo "   needs them: run 'npm ci' in $REPO, then tools/basilisk/run_canyon.sh analyse.)"
  fi
  mkdir -p "$STATE"
  local free_gb
  free_gb=$(df -k "$STATE" | awk 'NR == 2 {printf "%d", $4 / 1048576}')
  if [ "${free_gb:-0}" -lt "${NEED_GB:-5}" ]; then
    problem "free disk space: ${free_gb} GB free where the runs go ($STATE), at least ${NEED_GB:-5} GB wanted" \
      "free some space, or set RUNS to a folder on a larger disk (each case writes a few hundred MB)"
  else
    echo "  Disk: ${free_gb} GB free (the three cases write about 1–2 GB)."
  fi
  if [ "${OMP:-0}" = 1 ] && [ "$(uname)" = Darwin ] && [ ! -f "$(brew --prefix libomp 2> /dev/null)/include/omp.h" ]; then
    problem "Homebrew's libomp, for OMP=1" "brew install libomp    # or run without OMP=1: one core per case"
  fi
  command -v caffeinate > /dev/null || echo "  (caffeinate is missing: keep the Mac from sleeping yourself.)"
  if [ "$problems" -gt 0 ]; then
    printf '\n%s prerequisite(s) missing; install them as above, then run tools/basilisk/run_canyon.sh again.\n' "$problems"
    return 1
  fi
  echo "  All there: $("$PY" --version 2>&1), Basilisk in $BASILISK_HOME, $(sysctl -n hw.perflevel0.physicalcpu 2> /dev/null || echo '?') performance cores."
}

setup() {
  if [ ! -x "$BASILISK/qcc" ]; then
    echo "Installing Basilisk into $BASILISK_HOME (a git clone, then a serial build of about a minute)…"
    [ -d "$BASILISK_HOME" ] || git clone --depth 1 https://github.com/comphy-lab/basilisk-C.git "$BASILISK_HOME" || exit 1
    (cd "$BASILISK" && { if [ "$(uname)" = Darwin ]; then ln -sf config.osx config; else ln -sf config.gcc config; fi; } &&
      make -k > make.log 2>&1)   # the GPU backends and viewers fail to build, which doesn't matter
    [ -x "$BASILISK/qcc" ] || { echo "qcc did not build; see $BASILISK/make.log"; exit 1; }
    echo "Basilisk built (its checkout reports errors outside basilisk-source/src on macOS, which don't matter)."
  fi
  if ! "$PY" -c 'import numpy, scipy.special, scipy.optimize, scipy.spatial, matplotlib' 2> /dev/null; then
    echo "Making $VENV with numpy, scipy and matplotlib…"
    python3 -m venv "$VENV" && "$VENV/bin/pip" install --quiet -r "$HERE/analysis/requirements.txt" || exit 1
    PY="$VENV/bin/python"; export PYTHON="$PY"
  fi
  problems=0
  check
}

supervisor() {  # the supervisor's pid, if it runs
  local pid
  pid=$(cat "$STATE/pipeline.pid" 2> /dev/null) || return 1
  ps -p "$pid" -o command= 2> /dev/null | grep -q canyon_pipeline && echo "$pid"
}

follow() {
  local pid log="$STATE/logs/latest/pipeline.log" i
  for i in $(seq 1 20); do [ -f "$log" ] && break; sleep 0.5; done
  [ -f "$log" ] || { echo "No log yet in $STATE/logs."; return; }
  pid=$(supervisor) || { tail -n 30 "$log"; return; }
  echo "Following $log (Ctrl-C stops following; the runs go on: tools/basilisk/run_canyon.sh status)."
  tail -n 40 -F "$log" &
  local tail_pid=$!
  trap 'kill $tail_pid 2> /dev/null; echo; echo "Stopped following; the runs go on. tools/basilisk/run_canyon.sh status or log."; exit 0' INT
  while kill -0 "$pid" 2> /dev/null; do sleep 5; done
  sleep 1; kill "$tail_pid" 2> /dev/null
  echo "The supervisor has finished (its last lines above say where the report is)."
}

case "$CMD" in
  run)
    if pid=$(supervisor); then echo "Already running (pid $pid)."; follow; exit 0; fi
    check || exit 1
    keep_awake=(); command -v caffeinate > /dev/null && keep_awake=(caffeinate -ims)
    mkdir -p "$STATE"
    nohup ${keep_awake[@]+"${keep_awake[@]}"} "$PY" "$HERE/canyon_pipeline.py" run ${JOBS_ARG[@]+"${JOBS_ARG[@]}"} \
      >> "$STATE/supervisor.out" 2>&1 < /dev/null &
    echo "Started the supervisor in the background ($( [ ${#keep_awake[@]} -gt 0 ] && echo 'kept awake with caffeinate; ' )log in $STATE/logs/latest)."
    sleep 2
    follow
    ;;
  status) "$PY" "$HERE/canyon_pipeline.py" status ;;
  log) follow ;;
  stop)
    if pid=$(supervisor); then kill -TERM "$pid"; echo "Stopping the supervisor (pid $pid)…"; sleep 5; fi
    pkill -f "^(/bin/)?bash .*run_periodic\.sh (fg|scout) canyon23" 2> /dev/null
    pkill -f "^\./periodic_canyon23[a-z0-9_]*_(scout|p1|p2)( |$)" 2> /dev/null
    echo "Stopped. tools/basilisk/run_canyon.sh resumes from the last checkpoints."
    ;;
  analyse) check || exit 1; "$PY" "$HERE/canyon_pipeline.py" analyse ;;
  check) check ;;
  setup) setup ;;
  smoke) NEED_GB="${NEED_GB:-1}"; check || exit 1; "$PY" "$HERE/canyon_pipeline.py" run --smoke ${JOBS_ARG[@]+"${JOBS_ARG[@]}"} ;;
  *) sed -n '2,24p' "$0"; exit 1 ;;
esac
