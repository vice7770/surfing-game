#!/bin/bash
# Run (or resume) periodic-wave cases in Basilisk: a train of cnoidal waves on the Reef's ledge
# or Padang Padang's wedge, so the wave studied (the second crest) breaks into the trough its
# predecessor leaves, the step a solitary wave can't have. Then analyse them.
#
#   tools/basilisk/run_periodic.sh [run|status|analyse] [CASE ...]    (default: every case)
#   tools/basilisk/run_periodic.sh fg CASE ...       run (or resume) the cases' phases in the foreground, one after another
#   tools/basilisk/run_periodic.sh scout CASE ...    a level-SCOUT_LEVEL run of the whole case, every frame fine, to place its
#                                                    switch, end and window (analysis/crest_track.py reads it), in the foreground
#   tools/basilisk/run_periodic.sh compile CASE ...  build Basilisk if needed and compile both phases, without running
#   tools/basilisk/run_periodic.sh cases CASE ...    print the cases' definitions
#   tools/basilisk/run_periodic.sh flags CASE ...    print the qcc command lines the phases compile with
#
# Two phases per case, to afford the fine grid:
#   1. LEVEL1 (default 10) from the start to TSWITCH, when the second crest nears the break.
#      The trough ahead of it is bulk drainage, already right at coarse levels.
#   2. LEVEL2 (default 12) from that state to TMAX, the finest two levels kept inside a window
#      around the break. The overturn gets 12 cm cells (Reef) or 11 cm (Padang).
#
# Cases, dimensionless with h0 the depth the train starts in:
#   reef42     the Reef's 10 m shelf, the ledge at 1:4.2 along the wave's path to the 1.5 m flat,
#              H 3 m at 14 s (the steepest crossing the Teahupo'o Reef report measured)
#   reef60     the same at 1:6 (near the game's median reading)
#   padang19   Padang Padang's 7 m foot, 1:19 along the path to the 1.25 m flat, H 2.1 m at 16 s
#              (round 6's transect; gives the swept barrel its onset lag for swell)
#   padang19b  the same with a 2.5 m foot crest at 18 s (H/h0 0.42), for the lag table's deep end
#   padang19c  the same with a 1.2 m foot crest at 14 s (H/h0 0.24), for its shallow end
#   padang19s  the Small swell: a 1.0 m foot crest at 16 s (H/h0 0.195, A0 about 0.14), for the barrel library
#   point21_a08/a15/a23/a30  the Point's 7 m foot, 1:21.5 along the contours' normal to a 0.35 m flat, foot crests A0
#              0.08 at 9 s, 0.15 at 11 s, 0.23 at 12 s, 0.30 at 14 s (PR 7; switch, end and window from level-9 scouts)
#   reef42_a35  the Reef's 1:4.2 ledge with a 3.5 m foot crest at 16 s (A0 0.35), its throw line's second point (PR 7)
#   canyon23_a29, canyon23_a38, canyon23_a49, canyon23f74_a38  the Canyon's reef bed (2026-10-22) from the arm's 6 m foot:
#              1:23 to the 2.2 m hinge (0.367 h0), then the fan to the 1.0 m crest (0.167 h0), 1:31 at x -30 (the take-off)
#              and 1:74 at x 10 (f74); H/h0 0.29 at 11 s (Medium's sets), 0.38 and 0.49 at 14 s (Big's typical wave and
#              its sets). Their switch, end and window here are provisional, from the bed alone; run_canyon.sh places
#              them from a scout of each case (docs/research/canyon-reef-bed-2026-10-22/README.md, the swept-barrel step).
# Each case uses one core (OMP=1: OMP_NUM_THREADS cores, with Homebrew's libomp on macOS). Safe to rerun: each phase
# resumes from its checkpoint.
#
# Environment: LEVEL1, LEVEL2, PYTHON (with numpy and scipy; matplotlib for the figures), BASILISK_HOME, RUNS (the runs'
# folder, tools/basilisk/runs), CASES_FILE (a file of case definitions, which replace the ones below by name or add to
# them), SCOUT_LEVEL (10), SCOUT_DTOUT (0.1), SCOUT_TMAX (the scout's end; default the case's end + SCOUT_EXTRA, 10).
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LEVEL1="${LEVEL1:-10}"
LEVEL2="${LEVEL2:-12}"
RUNS="${RUNS:-$HERE/runs}"
BASILISK_HOME="${BASILISK_HOME:-$HOME/basilisk-C}"
export BASILISK="$BASILISK_HOME/basilisk-source/src"
export PATH="$PATH:$BASILISK"
PY="${PYTHON:-python3}"   # needs numpy, scipy and matplotlib
SCOUT_LEVEL="${SCOUT_LEVEL:-10}"
SCOUT_DTOUT="${SCOUT_DTOUT:-0.1}"
SCOUT_EXTRA="${SCOUT_EXTRA:-10}"

# name:h0 m:H/h0:period s:slope:flat depth/h0:domain/h0:switch t:end t:window from:window to (h0 and sqrt(h0/g))
# [:mid depth/h0:second slope] — a two-slope bed: `slope` down to the mid depth, then the second slope to the flat
# (slope.c's HMID and S2). Without them the bed is one slope to the flat (HMID = HS).
CASES_ALL="reef42:10:0.3:14:0.238095:0.15:48:17:25:20:36 reef60:10:0.3:14:0.166667:0.15:48:18:27:21:38 padang19:7:0.3:16:0.0526316:0.1785714:64:31:41:37:56 padang19b:7:0.42:18:0.0526316:0.1785714:72:32:42:45:64 padang19c:7:0.24:14:0.0526316:0.1785714:64:31:41:38:52 padang19s:7:0.195:16:0.0526316:0.1785714:64:35:46:42:56 point21_a08:7:0.141:9:0.0465116:0.05:52:31:44:27:47 point21_a15:7:0.229:11:0.0465116:0.05:60:31:41.5:29:49 point21_a23:7:0.318:12:0.0465116:0.05:60:28:37.5:29:49 point21_a30:7:0.38:14:0.0465116:0.05:68:26:39:34:54 reef42_a35:10:0.439:16:0.238095:0.15:64:18.5:28:24:44"
# The Canyon (2026-10-22's reef bed): provisional windows, from the bed alone (run_canyon.sh scouts each case).
CASES_ALL="$CASES_ALL canyon23_a29:6:0.29:11:0.0434783:0.1666667:56:26.5:41.5:31.5:52.5:0.3666667:0.0322581 canyon23_a38:6:0.38:14:0.0434783:0.1666667:64:25:40:35:56:0.3666667:0.0322581 canyon23_a49:6:0.49:14:0.0434783:0.1666667:64:22:37:34:55:0.3666667:0.0322581 canyon23f74_a38:6:0.38:14:0.0434783:0.1666667:68:25:40:35:56:0.3666667:0.0135135"

if [ -n "${CASES_FILE:-}" ] && [ -f "$CASES_FILE" ]; then
  # Definitions in the file replace the built-in ones of the same name; new names are added.
  extra="$(grep -v '^[[:space:]]*#' "$CASES_FILE" | tr -s ' \t\n' '   ')"
  merged=""
  for c in $CASES_ALL; do
    keep=1
    for e in $extra; do [ "${e%%:*}" = "${c%%:*}" ] && keep=0; done
    [ "$keep" = 1 ] && merged="$merged $c"
  done
  CASES_ALL="$merged $extra"
fi

build_basilisk() {
  [ -x "$BASILISK/qcc" ] && return
  [ -d "$BASILISK_HOME" ] || git clone --depth 1 https://github.com/comphy-lab/basilisk-C.git "$BASILISK_HOME"
  cd "$BASILISK"
  if [ "$(uname)" = Darwin ]; then ln -sf config.osx config; else ln -sf config.gcc config; fi
  make -k > make.log 2>&1 || true   # serially; the GPU backends and viewers fail to build, which doesn't matter
  [ -x "$BASILISK/qcc" ] || { echo "qcc did not build; see $BASILISK/make.log"; exit 1; }
}

omp_flags() {  # OMP=1: OpenMP (Homebrew's libomp with Apple's clang); otherwise nothing
  [ "${OMP:-0}" = 1 ] || return 0
  if [ "$(uname)" != Darwin ]; then echo "-fopenmp"; return; fi
  local p; p="$(brew --prefix libomp 2> /dev/null)"
  [ -f "$p/include/omp.h" ] || { echo "OMP=1 needs Homebrew's libomp: brew install libomp" >&2; return 1; }
  echo "-Xpreprocessor -fopenmp -I$p/include -L$p/lib -lomp"
}

selected() {  # the cases named on the command line, or all
  local c w
  for c in $CASES_ALL; do
    if [ $# -eq 0 ]; then echo "$c"; continue; fi
    for w in "$@"; do [ "${c%%:*}" = "$w" ] && echo "$c"; done
  done
  return 0
}

dirs() { P1="$RUNS/periodic_${1}_p1_L$LEVEL1"; P2="$RUNS/periodic_${1}_L$LEVEL2"; PS="$RUNS/periodic_${1}_scout_L$SCOUT_LEVEL"; }

parse() {  # a case's fields into globals
  name="" h0="" hh="" period="" slope="" hs="" domain="" tsw="" tmax="" w0="" w1="" hmid="" s2=""
  IFS=: read -r name h0 hh period slope hs domain tsw tmax w0 w1 hmid s2 <<< "$1"
  dirs "$name"
}

bed_flags() {  # the bed: one slope to the flat as before, or two (to HMID at S1, then S2 to HS)
  if [ -z "$hmid" ] && [ -z "$s2" ]; then echo "-DS1=$slope -DHMID=$hs -DHS=$hs"
  else echo "-DS1=$slope -DHMID=${hmid:-$hs} -DS2=${s2:-$slope} -DHS=$hs"; fi
}

train() {  # the cnoidal train into $1 (once), and its celerity and the slope's toe as $c and $xtoe
  local dir=$1
  mkdir -p "$dir/facets"
  if [ ! -f "$dir/train.json" ]; then
    "$PY" "$HERE/analysis/cnoidal_train.py" "$hh" "$period" "$h0" 2 "$dir" > "$dir/train.log"
  fi
  c=$("$PY" -c "import json; print(json.load(open('$dir/train.json'))['c'])")
  xtoe=$("$PY" -c "import json; print(round(json.load(open('$dir/train.json'))['front'] + 2.0, 3))")
}

params() {  # the case's parameters beside a build, for the analysis: $1 the folder, $2 its level, $3 its kind, $4 its start
  # (output from), $5 its end, $6 and $7 its window
  cat > "$1/params.txt" <<EOF
name=$name
kind=$3
level=$2
h0=$h0
H_over_h0=$hh
period=$period
S1=$slope
HMID=${hmid:-$hs}
S2=${s2:-$slope}
HS=$hs
domain=$domain
tout0=$4
tmax=$5
xwin0=$6
xwin1=$7
xtoe=$xtoe
train_c=$c
EOF
}

prepare() {  # the trains, the flags and both phases' builds (each compiled once)
  parse "$1"
  train "$P1"
  mkdir -p "$P2/facets"
  [ -f "$P2/train.json" ] || cp "$P1/train.dat" "$P1/train.json" "$P2/"
  local common omp
  omp="$(omp_flags)"
  common="$(bed_flags) -DXTOE=$xtoe -DDOMAIN=$domain -DTRAIN_C=$c -DDTOUT=0.025"
  if [ ! -x "$P1/periodic_${name}_p1" ]; then
    # shellcheck disable=SC2086
    (cd "$P1" && cp "$HERE/periodic.c" . && \
      qcc -O2 $omp -DLEVEL="$LEVEL1" $common -DTMAX="$tsw" -DTOUT0="$tsw" periodic.c -o "periodic_${name}_p1" -lm)
  fi
  if [ ! -x "$P2/periodic_${name}_p2" ]; then
    # shellcheck disable=SC2086
    (cd "$P2" && cp "$HERE/periodic.c" . && \
      qcc -O2 $omp -DLEVEL="$LEVEL2" $common -DTMAX="$tmax" -DTOUT0="$tsw" -DXWIN0="$w0" -DXWIN1="$w1" \
        periodic.c -o "periodic_${name}_p2" -lm)
  fi
  [ -f "$P1/params.txt" ] || params "$P1" "$LEVEL1" p1 "$tsw" "$tsw" "" ""
  [ -f "$P2/params.txt" ] || params "$P2" "$LEVEL2" p2 "$tsw" "$tmax" "$w0" "$w1"
}

start() {
  parse "$1"
  [ -f "$P2/done" ] && { echo "$name: done ($(cat "$P2/done"))."; return; }
  pgrep -f "periodic_${name}_(p1|p2)" > /dev/null && { echo "$name: already running."; return; }
  prepare "$1"
  local keep_awake=""; [ "$(uname)" = Darwin ] && keep_awake="caffeinate -i"
  # Phase 1 unless done; then seed phase 2 from its final state unless phase 2 has its own checkpoint.
  nohup $keep_awake bash -c "
    set -e
    if [ ! -f '$P1/done' ]; then cd '$P1' && ./periodic_${name}_p1 >> out.log 2>> err.log < /dev/null; fi
    if [ ! -f '$P2/restart' ]; then cp '$P1/final' '$P2/restart'; fi
    cd '$P2' && ./periodic_${name}_p2 >> out.log 2>> err.log < /dev/null
  " > /dev/null 2>&1 &
  echo "$name: running (phase $([ -f "$P1/done" ] && echo 2 || echo 1))."
}

wait_running() {  # a build of this case already running (another shell, or a stopped supervisor's): wait for it. The
  # pattern is anchored on the binary as started (./periodic_<case>_p1 in its folder), so a shell naming its path doesn't count.
  local pattern=$1 said=0
  while pgrep -f "$pattern" > /dev/null; do
    [ "$said" = 1 ] || { echo "$name: already running ($pattern); waiting for it."; said=1; }
    sleep 30
  done
}

foreground() {  # both phases in the foreground, resuming from the checkpoints; fails if a phase does
  parse "$1"
  [ -f "$P2/done" ] && { echo "$name: done ($(cat "$P2/done"))."; return; }
  wait_running "^\./periodic_${name}_(p1|p2)( |$)"
  [ -f "$P2/done" ] && { echo "$name: done ($(cat "$P2/done"))."; return; }
  prepare "$1"
  if [ ! -f "$P1/done" ]; then
    echo "$name: phase 1 (level $LEVEL1, t 0 to $tsw)$([ -f "$P1/restart" ] && echo ', resuming')."
    (cd "$P1" && OMP_WAIT_POLICY=passive ./periodic_"${name}"_p1 >> out.log 2>> err.log < /dev/null) || {
      echo "$name: phase 1 failed; see $P1/err.log"; return 1; }
    [ -f "$P1/done" ] || { echo "$name: phase 1 stopped before its end; rerun to resume."; return 1; }
  fi
  if [ ! -f "$P2/restart" ]; then cp "$P1/final" "$P2/restart"; fi
  echo "$name: phase 2 (level $LEVEL2, t $tsw to $tmax, window x $w0 to $w1)."
  (cd "$P2" && OMP_WAIT_POLICY=passive ./periodic_"${name}"_p2 >> out.log 2>> err.log < /dev/null) || {
    echo "$name: phase 2 failed; see $P2/err.log"; return 1; }
  [ -f "$P2/done" ] || { echo "$name: phase 2 stopped before its end; rerun to resume."; return 1; }
  echo "$name: done ($(cat "$P2/done"))."
}

scout() {  # one coarse run of the whole case, every frame written at SCOUT_DTOUT, in the foreground
  parse "$1"
  local end="${SCOUT_TMAX:-$("$PY" -c "print($tmax + $SCOUT_EXTRA)")}"
  [ -f "$PS/done" ] && { echo "$name: scout done ($(cat "$PS/done"))."; return; }
  wait_running "^\./periodic_${name}_scout( |$)"
  [ -f "$PS/done" ] && { echo "$name: scout done ($(cat "$PS/done"))."; return; }
  train "$PS"
  if [ ! -x "$PS/periodic_${name}_scout" ]; then
    local omp; omp="$(omp_flags)"
    # shellcheck disable=SC2046,SC2086
    (cd "$PS" && cp "$HERE/periodic.c" . && \
      qcc -O2 $omp -DLEVEL="$SCOUT_LEVEL" $(bed_flags) -DXTOE="$xtoe" -DDOMAIN="$domain" -DTRAIN_C="$c" \
        -DTMAX="$end" -DTOUT0=0 -DDTOUT="$SCOUT_DTOUT" periodic.c -o "periodic_${name}_scout" -lm)
    params "$PS" "$SCOUT_LEVEL" scout 0 "$end" "" ""
  fi
  echo "$name: scout (level $SCOUT_LEVEL, t 0 to $end)$([ -f "$PS/restart" ] && echo ', resuming')."
  (cd "$PS" && OMP_WAIT_POLICY=passive ./periodic_"${name}"_scout >> out.log 2>> err.log < /dev/null) || {
    echo "$name: scout failed; see $PS/err.log"; return 1; }
  [ -f "$PS/done" ] || { echo "$name: scout stopped before its end; rerun to resume."; return 1; }
  echo "$name: scout done ($(cat "$PS/done"))."
}

flags() {  # the qcc command lines, computed in a scratch folder (nothing is compiled)
  parse "$1"
  local tmp common; tmp="$(mktemp -d)"
  train "$tmp"
  common="$(bed_flags) -DXTOE=$xtoe -DDOMAIN=$domain -DTRAIN_C=$c -DDTOUT=0.025"
  local omp; omp="$(omp_flags)"
  echo "$name p1: qcc -O2 ${omp:+$omp }-DLEVEL=$LEVEL1 $common -DTMAX=$tsw -DTOUT0=$tsw periodic.c -o periodic_${name}_p1 -lm"
  echo "$name p2: qcc -O2 ${omp:+$omp }-DLEVEL=$LEVEL2 $common -DTMAX=$tmax -DTOUT0=$tsw -DXWIN0=$w0 -DXWIN1=$w1 periodic.c -o periodic_${name}_p2 -lm"
  rm -rf "$tmp"
}

report() {
  parse "$1"
  if [ -f "$P2/done" ]; then echo "$name: done ($(cat "$P2/done"))"; return; fi
  local ph=1 dir="$P1"; [ -f "$P1/done" ] && { ph=2; dir="$P2"; }
  pgrep -f "periodic_${name}_p$ph" > /dev/null && printf "%s: phase %s running" "$name" "$ph" || printf "%s: phase %s not running (rerun to resume)" "$name" "$ph"
  [ -f "$dir/timing.log" ] && tail -1 "$dir/timing.log" | awk -v T="$tmax" '{printf ", t = %s of %s, dt %s, cells %s, wall %s s", $5, T, $6, $7, $8}'
  echo
}

analyse() {
  parse "$1"
  [ -f "$P2/done" ] || { echo "$name: not finished yet."; return; }
  cd "$HERE/analysis"
  "$PY" metrics.py "$P2" "$LEVEL2" "$domain" "$slope" "$hh" "$tsw"
  "$PY" source_share.py "$P2" "$LEVEL2" "$domain"
  echo "$name: wrote ${P2}_metrics.json"
}

cmd="${1:-run}"; shift || true
case "$cmd" in
  run) build_basilisk; while read -r c; do start "$c"; done < <(selected "$@"); echo "Progress: $0 status" ;;
  status) while read -r c; do report "$c"; done < <(selected "$@") ;;
  analyse) while read -r c; do analyse "$c"; done < <(selected "$@") ;;
  fg) build_basilisk; for c in $(selected "$@"); do foreground "$c"; done ;;
  scout) build_basilisk; for c in $(selected "$@"); do scout "$c"; done ;;
  compile) build_basilisk; for c in $(selected "$@"); do prepare "$c"; echo "${c%%:*}: compiled."; done ;;
  cases) selected "$@" ;;
  flags) while read -r c; do flags "$c"; done < <(selected "$@") ;;
  *) echo "Usage: $0 [run|status|analyse|fg|scout|compile|cases|flags] [CASE ...]"; exit 1 ;;
esac
