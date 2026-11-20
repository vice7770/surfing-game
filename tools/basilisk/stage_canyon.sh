#!/bin/bash
# The Canyon's tube cases into the game, in one command (the tube from Basilisk, 2026-10-22):
#
#   npm run barrels:canyon                 the three one-slope cases from docs/research/canyon-tube-runs/data
#   npm run barrels:canyon -- DIR          the same from another folder of runs (each case's _library.json,
#                                          _metrics.json and _case.json, as run_canyon.sh analyse copies them)
#
# For each of canyon23_a29, canyon23_a38 and canyon23_a49 it takes the finest level in DIR (a level-14 rerun replaces
# a level-13 case), and rewrites the game's index (src/wave/barrel/barrelLibraryIndex.ts), the case files
# (public/barrels/) and the validation table (docs/research/barrel-cases.md) with every other shipped case kept as it is.
# Which Canyon case is drawn is the game's (`BARREL_CASE_NOTES` in src/wave/barrel/barrelLibrary.ts: a38 alone; a49, a
# fold, and a29, a curl, are kept but not drawn). canyon23f74_a38 is never staged (the advisor, 2026-10-22).
set -euo pipefail
REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
DATA="${1:-docs/research/canyon-tube-runs/data}"
INDEX=src/wave/barrel/barrelLibraryIndex.ts

args=()
for case in canyon23_a29 canyon23_a38 canyon23_a49; do
  library="$(ls "$DATA"/periodic_${case}_L*_library.json 2>/dev/null | sort -V | tail -1 || true)"
  if [ -z "$library" ]; then
    echo "no periodic_${case}_L*_library.json in $DATA" >&2
    exit 1
  fi
  run="$(basename "$library" _library.json)"
  for part in metrics case; do
    [ -f "$DATA/${run}_${part}.json" ] || { echo "missing $DATA/${run}_${part}.json" >&2; exit 1; }
  done
  a0="$(node -e "process.stdout.write(String(JSON.parse(require('fs').readFileSync(process.argv[1], 'utf8')).a0.toFixed(4)))" "$DATA/${run}_case.json")"
  args+=(--run "$run" --spot "$run=canyon" --flat "$run=0.1666667" --a0 "$run=$a0")
  echo "staging $run (A0 $a0)"
done

# Every other shipped case, kept as it is (its .bin, its rows in barrel-cases.md).
keeps="$(node -e "
  const text = require('fs').readFileSync(process.argv[1], 'utf8');
  const from = text.indexOf('= [') + 2;
  const entries = JSON.parse(text.slice(from, text.lastIndexOf(']') + 1));
  for (const e of entries) if (e.spot !== 'canyon') console.log(e.id + ' ' + e.spot);
" "$INDEX")"
if [ -z "$keeps" ]; then
  echo "could not read the shipped cases from $INDEX" >&2
  exit 1
fi
while IFS=' ' read -r id spot; do
  args+=(--keep "$id" --spot "$id=$spot")
done <<< "$keeps"

# `npm run barrels` refits a kept case's tip and writes its .bin again; the other spots' cases stay byte for byte as
# committed (the Reef's refit differs from its committed file), so they are put back afterwards.
saved="$(mktemp -d)"
trap 'rm -rf "$saved"' EXIT
while IFS=' ' read -r id spot; do cp "public/barrels/$id.bin" "$saved/"; done <<< "$keeps"
npm run --silent barrels -- --runs "$DATA" "${args[@]}"
cp "$saved"/*.bin public/barrels/
