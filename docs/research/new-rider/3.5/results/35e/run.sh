#!/bin/sh
# Step 3.5e's three runs. `SP` is a scratch directory; run from the repository's root.
#
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/foam.ts     -o "$SP/foam.mjs" --format esm --platform node
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/foamread.ts -o "$SP/fr.mjs"   --format esm --platform node
#   SP=<scratch> sh docs/research/new-rider/3.5/results/35e/run.sh
#
# Every rider is the owner's own address — `?rider=new&feltFrame=deck&riderBody=two` — on the owner's own spot, the
# real Canyon sea as `?canyonWaves=true` builds it (`canyonBed: 'b'`), stepped on the CPU at 1/60 s. The riders read
# the water and never push it, so all four arms share one sea.
#
# The full `ride` dump is ~80 MB (9 MB gzipped) and is NOT committed: `results/35e/` keeps the field dump, the
# reader's own report, and the ride dump's first three frames and run rows (which carry the exact frame-1 A/B and
# every fall time). This script regenerates the rest.
set -e
: "${SP:?set SP to a scratch directory}"

# 1. the field, no rider: 3 periods of the corridor around the break point, one summary row a frame.
rm -f "$SP/field.jsonl"
env MODE=field PERIODS=3 XSPAN=60 ZMIN=-40 ZMAX=120 OUT="$SP/field.jsonl" \
    node --max-old-space-size=3000 "$SP/foam.mjs"
echo "field: $(wc -l < "$SP/field.jsonl") rows"

# 2. the ride: 6 trials x 4 arms x 3 stances x 2 entries x 6 placements = 864 riders, 3 s each.
rm -f "$SP/ride.jsonl"
env MODE=ride PERIODS=3 TRIALS=6 GAP=4 SECONDS=3 XSPAN=60 ZMIN=-40 ZMAX=120 \
    ARMS=all,noAir,noFroth,noCarry AHEAD=0,1,2,3,5,8 ENTRIES=2,5 \
    RIDER=new FELT=deck BODY=two OUT="$SP/ride.jsonl" \
    node --max-old-space-size=3500 "$SP/foam.mjs"
echo "ride: $(wc -l < "$SP/ride.jsonl") rows"

# 3. the replication on the default swell (`DEFAULT_CONDITIONS.swell = 'practice'`), three arms.
rm -f "$SP/ride-practice.jsonl"
env MODE=ride SIZE=practice PERIODS=3 TRIALS=3 GAP=5 SECONDS=3 XSPAN=60 ZMIN=-40 ZMAX=120 \
    ARMS=all,noAir,noFroth AHEAD=0,3,8 ENTRIES=2,5 \
    RIDER=new FELT=deck BODY=two OUT="$SP/ride-practice.jsonl" \
    node --max-old-space-size=2500 "$SP/foam.mjs"
echo "practice: $(wc -l < "$SP/ride-practice.jsonl") rows"

node "$SP/fr.mjs" "$SP/ride.jsonl" "$SP/field.jsonl" > "$SP/report.txt"
node "$SP/fr.mjs" "$SP/ride-practice.jsonl" > "$SP/report-practice.txt"
echo "reports in $SP/report.txt and $SP/report-practice.txt"
