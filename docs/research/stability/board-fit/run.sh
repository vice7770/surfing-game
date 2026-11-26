#!/bin/bash
# 3.6e's held-out twin runs (README §0.5): 3.6d's probe bundle, unchanged, on Canyon Big seeds 4 and 5, the three
# straight stances with their 50 twins each, knobs off, one process per seed, both at once.
#   bash run.sh <probe bundle .mjs> <out dir>
set -u
BUNDLE="$1"; OUT="$2"
mkdir -p "$OUT"
TW='compress:straight,none:straight,crouch:straight'
for SEED in 4 5; do
  ( start=$(date -u +%s)
    env MODE=organic SWELL=big PERIODS=12 SEED=$SEED SCRIPTS=$TW TWINS=$TW EXTRA='&cueLater=on&plantFloor=6' \
      HOLD=5 TURN_AT=1 TURN_FOR=1 KNOBS= OUT="$OUT/big_s$SEED.jsonl" \
      node --max-old-space-size=3200 "$BUNDLE" > "$OUT/big_s$SEED.log" 2>&1
    echo "seed $SEED: exit $? in $(( $(date -u +%s) - start )) s, done $(date -u +%H:%M:%S)" >> "$OUT/status.txt" ) &
done
wait
