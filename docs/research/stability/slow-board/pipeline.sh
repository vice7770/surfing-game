#!/bin/bash
# 3.6a part 2: the analysis in its registered order (README §0.4, §0.8, §0.6, §0.9), for one structure (grey | cell).
#   bash pipeline.sh <runs dir> <out dir> <grey|cell> <bundle id.mjs> <A|B>
# Run from the repository root. Phase A (training only): the fit, frozen (its SHA-256 in fit.log), the controller replay,
# and the recovery control's training rides and fits. Phase B (after the held-out runs): the recovery's held-out rides,
# its validation and check, then the identified plant's validation (open and closed loop) and check.
set -euo pipefail
RUNS=$1; OUT=$2; STRUCT=$3; ID=$4; PHASE=$5
run() { env STRUCT="$STRUCT" "$@" node --max-old-space-size=8000 "$ID"; }
mkdir -p "$OUT"
if [ "$PHASE" = A ]; then
  [ -f "$OUT/fit.json" ] || run MODE=fit IN="$RUNS/id" OUT="$OUT/fit.json" BOOT="${BOOT:-200}" > "$OUT/fit.log"
  run MODE=replay IN="$RUNS/id" > "$OUT/replay-id.log"
  for K in K1 K2; do
    R="$OUT/rec-$K"; mkdir -p "$R/sim"
    run MODE=simulate FIT="$OUT/fit.json" IN="$RUNS/id" KNOWN=$K OUT="$R/sim" > "$R/sim-id.log"
    run MODE=fit IN="$R/sim/id" OUT="$R/fit.json" BOOT=0 > "$R/fit.log"
  done
else
  for K in K1 K2; do
    R="$OUT/rec-$K"
    run MODE=simulate FIT="$OUT/fit.json" IN="$RUNS/hold,$RUNS/tw" KNOWN=$K OUT="$R/sim" > "$R/sim-hold.log"
    run MODE=validate FIT="$R/fit.json" IN="$R/sim/hold,$R/sim/tw" KNOWN=$K CLOSED=off OUT="$R/val.json" > "$R/val.log"
    run MODE=check FIT="$R/fit.json" KNOWN=$K OUT="$R/check.json" > "$R/check.log"
  done
  run MODE=validate FIT="$OUT/fit.json" IN="$RUNS/hold,$RUNS/tw" OUT="$OUT/val.json" > "$OUT/val.log"
  run MODE=replay IN="$RUNS/hold,$RUNS/tw" > "$OUT/replay-hold.log"
  run MODE=check FIT="$OUT/fit.json" OUT="$OUT/check.json" > "$OUT/check.log"
fi
echo "pipeline $STRUCT phase $PHASE done"
