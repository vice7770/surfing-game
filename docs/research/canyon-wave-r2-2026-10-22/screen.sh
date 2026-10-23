#!/bin/zsh
# One candidate at one size (canyon-wave-r2): the size report (seeds × periods, --stability), then the ride report with
# the faces down the line and the arm report (ξb along the arm, the take-off's column), all to $OUT/<name>-<size>.txt.
#   docs/research/canyon-wave-r2-2026-10-22/screen.sh <name> <size> '<canyon spec or ->' [seeds] [periods] [first-seed]
# The bundles: rolldown each of scripts/canyon-size-report.ts, docs/research/canyon-wave-r2-2026-10-22/ride-report.ts
# (ride-report-r2.mjs) and docs/research/canyon-long-wave-2026-10-22/arm-report.ts into dist/scripts first.
set -e
name=$1; size=$2; spec=$3; seeds=${4:-1}; periods=${5:-8}; first=${6:-1}
OUT=${OUT:-/tmp/claude-501/r2}
mkdir -p $OUT
json=$OUT/$name-$size-s$first.json
canyon=()
[[ "$spec" != "-" ]] && canyon=(--canyon $spec)
node dist/scripts/canyon-size-report.mjs --size $size --seeds $seeds --first-seed $first --periods $periods --stability $canyon --json $json > $OUT/$name-$size-s$first.txt 2>&1
node dist/scripts/ride-report-r2.mjs $json >> $OUT/$name-$size-s$first.txt 2>&1
node dist/scripts/arm-report.mjs $json >> $OUT/$name-$size-s$first.txt 2>&1
echo done $name $size
