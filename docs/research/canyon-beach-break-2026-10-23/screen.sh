#!/bin/zsh
# One candidate at one size (canyon-beach-break): the size report (seeds × periods, --stability, --raw), then the beach
# report on its onsets (each peak's bars and the reef's, as the game counts breaks) and on its raw jumps (the beach peaks'
# bars without the onset filters, and every break's face shape), all to $OUT/<name>-<size>-s<first>.txt.
#   docs/research/canyon-beach-break-2026-10-23/screen.sh <name> <size> '<canyon spec or ->' [seeds] [periods] [first-seed] [--bed old]
# Bundle scripts/canyon-size-report.ts and docs/research/canyon-beach-break-2026-10-23/beach-report.ts into dist/scripts first.
set -e
name=$1; size=$2; spec=$3; seeds=${4:-1}; periods=${5:-12}; first=${6:-1}; extra=(${@:7})
OUT=${OUT:-/tmp/claude-501/bb}
mkdir -p $OUT
json=$OUT/$name-$size-s$first.json
canyon=()
[[ "$spec" != "-" ]] && canyon=(--canyon $spec)
node dist/scripts/canyon-size-report.mjs --size $size --seeds $seeds --first-seed $first --periods $periods --stability --raw $canyon $extra --json $json > $OUT/$name-$size-s$first.txt 2>&1
echo "\n=== the game's onsets" >> $OUT/$name-$size-s$first.txt
node dist/scripts/beach-report.mjs $json >> $OUT/$name-$size-s$first.txt 2>&1
echo "\n=== raw jumps" >> $OUT/$name-$size-s$first.txt
node dist/scripts/beach-report.mjs $json --raw --map $OUT/$name-$size-s$first-map >> $OUT/$name-$size-s$first.txt 2>&1
echo done $name $size
