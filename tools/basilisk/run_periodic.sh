#!/bin/bash
# Run (or resume) periodic-wave cases in Basilisk: a train of cnoidal waves on the Reef's ledge
# or Padang Padang's wedge, so the wave studied (the second crest) breaks into the trough its
# predecessor leaves, the step a solitary wave can't have. Then analyse them.
#
#   tools/basilisk/run_periodic.sh [run|status|analyse] [CASE ...]    (default: every case)
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
# Each case uses one core. Safe to rerun: each phase resumes from its checkpoint.
set -euo pipefail

HERE="$(cd "$(dirname "$0")" && pwd)"
LEVEL1="${LEVEL1:-10}"
LEVEL2="${LEVEL2:-12}"
BASILISK_HOME="${BASILISK_HOME:-$HOME/basilisk-C}"
export BASILISK="$BASILISK_HOME/basilisk-source/src"
export PATH="$PATH:$BASILISK"
PY="${PYTHON:-python3}"   # needs numpy, scipy and matplotlib

# name:h0 m:H/h0:period s:slope:flat depth/h0:domain/h0:switch t:end t:window from:window to (h0 and sqrt(h0/g))
CASES_ALL="reef42:10:0.3:14:0.238095:0.15:48:17:25:20:36 reef60:10:0.3:14:0.166667:0.15:48:18:27:21:38 padang19:7:0.3:16:0.0526316:0.1785714:64:31:41:37:56 padang19b:7:0.42:18:0.0526316:0.1785714:72:32:42:45:64 padang19c:7:0.24:14:0.0526316:0.1785714:64:31:41:38:52 padang19s:7:0.195:16:0.0526316:0.1785714:64:35:46:42:56 point21_a08:7:0.141:9:0.0465116:0.05:52:31:44:27:47 point21_a15:7:0.229:11:0.0465116:0.05:60:31:41.5:29:49 point21_a23:7:0.318:12:0.0465116:0.05:60:28:37.5:29:49 point21_a30:7:0.38:14:0.0465116:0.05:68:26:39:34:54 reef42_a35:10:0.439:16:0.238095:0.15:64:18.5:28:24:44"

build_basilisk() {
  [ -x "$BASILISK/qcc" ] && return
  [ -d "$BASILISK_HOME" ] || git clone --depth 1 https://github.com/comphy-lab/basilisk-C.git "$BASILISK_HOME"
  cd "$BASILISK"
  if [ "$(uname)" = Darwin ]; then ln -sf config.osx config; else ln -sf config.gcc config; fi
  make -k > make.log 2>&1 || true   # serially; the GPU backends and viewers fail to build, which doesn't matter
  [ -x "$BASILISK/qcc" ] || { echo "qcc did not build; see $BASILISK/make.log"; exit 1; }
}

selected() {  # the cases named on the command line, or all
  local c w
  for c in $CASES_ALL; do
    if [ $# -eq 0 ]; then echo "$c"; continue; fi
    for w in "$@"; do [ "${c%%:*}" = "$w" ] && echo "$c"; done
  done
}

dirs() { P1="$HERE/runs/periodic_${1}_p1_L$LEVEL1"; P2="$HERE/runs/periodic_${1}_L$LEVEL2"; }

start() {
  IFS=: read -r name h0 hh period slope hs domain tsw tmax w0 w1 <<< "$1"
  dirs "$name"
  [ -f "$P2/done" ] && { echo "$name: done ($(cat "$P2/done"))."; return; }
  pgrep -f "periodic_${name}_(p1|p2)" > /dev/null && { echo "$name: already running."; return; }
  mkdir -p "$P1/facets" "$P2/facets"
  if [ ! -f "$P1/train.json" ]; then
    "$PY" "$HERE/analysis/cnoidal_train.py" "$hh" "$period" "$h0" 2 "$P1" > "$P1/train.log"
    cp "$P1/train.dat" "$P1/train.json" "$P2/"
  fi
  local c xtoe common
  c=$("$PY" -c "import json; print(json.load(open('$P1/train.json'))['c'])")
  xtoe=$("$PY" -c "import json; print(round(json.load(open('$P1/train.json'))['front'] + 2.0, 3))")
  common="-DS1=$slope -DHMID=$hs -DHS=$hs -DXTOE=$xtoe -DDOMAIN=$domain -DTRAIN_C=$c -DDTOUT=0.025"
  if [ ! -x "$P1/periodic_${name}_p1" ]; then
    (cd "$P1" && cp "$HERE/periodic.c" . && \
      qcc -O2 -DLEVEL="$LEVEL1" $common -DTMAX="$tsw" -DTOUT0="$tsw" periodic.c -o "periodic_${name}_p1" -lm)
  fi
  if [ ! -x "$P2/periodic_${name}_p2" ]; then
    (cd "$P2" && cp "$HERE/periodic.c" . && \
      qcc -O2 -DLEVEL="$LEVEL2" $common -DTMAX="$tmax" -DTOUT0="$tsw" -DXWIN0="$w0" -DXWIN1="$w1" \
        periodic.c -o "periodic_${name}_p2" -lm)
  fi
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

report() {
  IFS=: read -r name h0 hh period slope hs domain tsw tmax w0 w1 <<< "$1"
  dirs "$name"
  if [ -f "$P2/done" ]; then echo "$name: done ($(cat "$P2/done"))"; return; fi
  local ph=1 dir="$P1"; [ -f "$P1/done" ] && { ph=2; dir="$P2"; }
  pgrep -f "periodic_${name}_p$ph" > /dev/null && printf "%s: phase %s running" "$name" "$ph" || printf "%s: phase %s not running (rerun to resume)" "$name" "$ph"
  [ -f "$dir/timing.log" ] && tail -1 "$dir/timing.log" | awk -v T="$tmax" '{printf ", t = %s of %s, dt %s, cells %s, wall %s s", $5, T, $6, $7, $8}'
  echo
}

analyse() {
  IFS=: read -r name h0 hh period slope hs domain tsw tmax w0 w1 <<< "$1"
  dirs "$name"
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
  *) echo "Usage: $0 [run|status|analyse] [CASE ...]"; exit 1 ;;
esac
