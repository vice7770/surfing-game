#!/bin/bash
# 3.6j (3.6i's, unchanged): measure one screening config dir with the benchmark's own report (`--reuse`): Big into <dir>, the test wave into <dir>/tw.
# usage: measure.sh <report.mjs> <dir> <switch-off tw-catch_twin.jsonl>; run from the worktree (the baseline path).
set -eu
REP=$1; D=$2; TWIN=$3
node "$REP" --mode full --reuse --only big --out "$D" > "$D/report-big.out" 2>&1 || true
mkdir -p "$D/tw"
for f in "$D"/tw-*.jsonl; do [ -e "$f" ] && ln -sf "$f" "$D/tw/$(basename "$f")"; done
cp "$TWIN" "$D/tw/tw-catch_twin.jsonl"
node "$REP" --mode full --reuse --only tw- --out "$D/tw" > "$D/tw/report.out" 2>&1 || true
