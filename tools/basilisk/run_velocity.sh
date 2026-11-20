#!/bin/bash
# The Barrel's tube cases again, with the water's velocity under the surface (2026-11-11; the Wave Pool Barrel's one
# interior flow: docs/research/pool-tube-track-2026-11-05/advisor-ruling-4.md, rank 3, and
# docs/research/tube-seam-2026-11-11/advisor-ruling-5.md). The first runs kept the surface only. This reruns the cases the
# game draws its pool tube from, each from its stored definition (the params.txt beside its library in docs/research), in
# a runs folder of its own (tools/basilisk/runs/vel), so no finished run is touched. Then it gives every point of every
# stored profile its velocity (analysis/profile_velocity.py) and writes one file per case to docs/research/pool-tube-flow/data.
#
#   tools/basilisk/run_velocity.sh            compile, run (or resume) the cases side by side, kept awake, then pack
#   tools/basilisk/run_velocity.sh status     where each case is
#   tools/basilisk/run_velocity.sh pack       the packing again, from the finished runs
#   tools/basilisk/run_velocity.sh cases      the definitions it would run
#
# VEL_CASES: the cases (default: pool_straight_small pool_straight_big canyon23_a38, the game's three). LEVEL2: phase 2's
# level (13; a case needs its level's params.txt and library.json in docs/research, so the level-14 knees run with
# LEVEL2=14 VEL_CASES="pool_knee_big pool_kneeface_big"). OMP=1, PYTHON, BASILISK_HOME as run_periodic.sh's; PYTHON defaults
# to tools/basilisk/.venv's when it is there (the wave train needs numpy; the packing needs nothing). VEL_OUT: where the
# packed files go. On the M4 Pro a level-13 case took 2 to 3.5 hours; the three run at once. Safe to rerun: each phase
# resumes from its checkpoint.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
REPO="$(cd "$HERE/../.." && pwd)"
CASES="${VEL_CASES:-pool_straight_small pool_straight_big canyon23_a38}"
export LEVEL2="${LEVEL2:-13}" VELOUT=1 RUNS="${RUNS:-$HERE/runs/vel}"
if [ -z "${PYTHON:-}" ] && [ -x "$HERE/.venv/bin/python" ]; then export PYTHON="$HERE/.venv/bin/python"; fi
OUT="${VEL_OUT:-$REPO/docs/research/pool-tube-flow/data}"
export CASES_FILE="$RUNS/cases.txt"

data_of() {  # a case's stored data prefix (…/data/periodic_<case>_L<level>), wherever its report lives
  local d p
  for d in "$REPO"/docs/research/*/data; do
    p="$d/periodic_${1}_L${LEVEL2}"
    if [ -f "${p}_params.txt" ] && [ -f "${p}_library.json" ]; then echo "$p"; return 0; fi
  done
  echo "run_velocity.sh: no stored params.txt and library.json for $1 at level $LEVEL2 under docs/research" >&2
  return 1
}

case_line() {  # run_periodic.sh's definition of a case, from its stored params.txt: the run as it was made
  awk -F= '{ v[$1] = $2 }
    END {
      printf "%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s:%s", v["name"], v["h0"], v["H_over_h0"], v["period"], v["S1"], v["HS"],
        v["domain"], v["tout0"], v["tmax"], v["xwin0"], v["xwin1"], v["HMID"], v["S2"]
      if ("REEFTOP" in v) printf ":%s:%s", v["REEFTOP"], v["SBACK"]
      printf "\n"
    }' "$1_params.txt"
}

write_cases() {
  mkdir -p "$RUNS"
  local c p; : > "$CASES_FILE.tmp"
  for c in $CASES; do p="$(data_of "$c")"; case_line "$p" >> "$CASES_FILE.tmp"; done
  mv "$CASES_FILE.tmp" "$CASES_FILE"
}

pack() {
  local c p failed=0
  for c in $CASES; do
    p="$(data_of "$c")"
    if [ ! -f "$RUNS/periodic_${c}_L$LEVEL2/done" ]; then echo "$c: not finished yet."; failed=1; continue; fi
    python3 "$HERE/analysis/profile_velocity.py" "${p}_library.json" "$RUNS/periodic_${c}_L$LEVEL2" \
      "$OUT/periodic_${c}_L${LEVEL2}_velocity.json" || failed=1
  done
  return $failed
}

cmd="${1:-run}"
case "$cmd" in
  cases) write_cases; cat "$CASES_FILE" ;;
  status) write_cases; bash "$HERE/run_periodic.sh" status $CASES ;;
  pack) pack ;;
  run)
    write_cases
    # Basilisk, the trains and both phases' builds first, one case after another; then the runs side by side.
    bash "$HERE/run_periodic.sh" compile $CASES
    keep=""; [ "$(uname)" = Darwin ] && keep="caffeinate -i"
    pids=""
    for c in $CASES; do
      $keep bash "$HERE/run_periodic.sh" fg "$c" > "$RUNS/$c.log" 2>&1 &
      pids="$pids $!"
      echo "$c: running (log: $RUNS/$c.log; progress: $0 status)."
    done
    failed=0
    for p in $pids; do wait "$p" || failed=1; done
    if [ "$failed" = 1 ]; then echo "A case stopped early (see its log); rerun to resume."; exit 1; fi
    pack
    echo "Packed into $OUT. Commit that folder; the runs themselves stay in $RUNS (git-ignored)."
    ;;
  *) echo "Usage: $0 [run|status|pack|cases]"; exit 1 ;;
esac
