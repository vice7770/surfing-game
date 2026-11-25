#!/bin/bash
# 3.6a part 2: the whole analysis in its registered order (README §0.4, §0.8, §0.6, §0.9), for one intercept structure.
#   bash pipeline.sh <runs dir> <out dir> <cell|segment> <bundle id.mjs>
# Run from the repository root. The fit is frozen (its SHA-256 printed) before any held-out file is read; the recovery
# control runs before the identified plant is read against the truths.
set -euo pipefail
RUNS=$1; OUT=$2; STRUCT=$3; ID=$4
mkdir -p "$OUT"
run() { env STRUCT="$STRUCT" "$@" node --max-old-space-size=8000 "$ID"; }
echo "== fit (seeds 1-3) =="
run MODE=fit IN="$RUNS/id" OUT="$OUT/fit.json" BOOT="${BOOT:-200}" | tee "$OUT/fit.log"
echo "== replay (seeds 1-3) =="
run MODE=replay IN="$RUNS/id" | tee "$OUT/replay-id.log"
for K in K1 K2; do
  echo "== recovery $K =="
  R="$OUT/rec-$K"; mkdir -p "$R/sim"
  run MODE=simulate FIT="$OUT/fit.json" IN="$RUNS/id" KNOWN=$K OUT="$R/sim"
  run MODE=simulate FIT="$OUT/fit.json" IN="$RUNS/hold,$RUNS/tw" KNOWN=$K OUT="$R/sim"
  run MODE=fit IN="$R/sim/id" OUT="$R/fit.json" BOOT=0 | tee "$R/fit.log"
  run MODE=validate FIT="$R/fit.json" IN="$R/sim/hold,$R/sim/tw" KNOWN=$K OUT="$R/val.json"
  run MODE=check FIT="$R/fit.json" KNOWN=$K OUT="$R/check.json"
done
echo "== validation (held out) =="
run MODE=validate FIT="$OUT/fit.json" IN="$RUNS/hold,$RUNS/tw" OUT="$OUT/val.json"
run MODE=replay IN="$RUNS/hold,$RUNS/tw" | tee "$OUT/replay-hold.log"
echo "== check =="
run MODE=check FIT="$OUT/fit.json" OUT="$OUT/check.json"
echo "pipeline done $STRUCT"
