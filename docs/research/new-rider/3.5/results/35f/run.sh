#!/bin/sh
# Step 3.5f's arms — the planing latch's own band, 3–4 m/s. `SP` is a scratch directory; run from the repository's
# root. Nothing under `src/` or `server/` is touched by any of it.
#
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/plant.ts  -o "$SP/pl.mjs"   --format esm --platform node
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/latch.ts  -o "$SP/lt.mjs"   --format esm --platform node
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/foam.ts   -o "$SP/foam.mjs" --format esm --platform node
#   SP=<scratch> sh docs/research/new-rider/3.5/results/35f/run.sh
#
# Every rider is the owner's own address — `?rider=new&feltFrame=deck&riderBody=two` — at the folder's own placement
# (`AHEAD` 0.75, `SIDE` −45, 9 s a run, the stance held). `s16` is FACE 1.4,16,5.7, the Canyon-matched arm (PR #223);
# `f73` is FACE 1.4,7.32,5.7, step 3.4h's closest fit to the water the owner rides. `-s0` is the stick NEVER TOUCHED,
# `-s1` the stick HARD OVER. The entry ladder is ABSOLUTE and the five entries 3.64–3.69 are there for one reason:
# the latch's own state at frame 1 flips between two of them (3.66/3.67 on s16, 3.67/3.68 on f73) while the speed
# through the water moves 0.011–0.013 m/s, and the pairs either side of that step are the null controls.
set -e
: "${SP:?set SP to a scratch directory}"
ENTS=1,2,3,3.5,3.6,3.64,3.65,3.66,3.67,3.68,3.69,3.7,3.75,4,4.5,5,6

run() {  # name FACE STEERS [MOUNTA]
  n=$1; face=$2; st=$3; ma=$4
  rm -f "$SP/$n.mount.jsonl"
  env RIDER=new FELT=deck BODY=two FACE="$face" AHEAD=0.75 SIDE=-45 SECONDS=9 \
      STANCES=tall,crouch,compress ENTRIES="$ENTS" STEERS="$st" ${ma:+MOUNTA=$ma} \
      MOUNT="$SP/$n.mount.jsonl" node "$SP/pl.mjs" > "$SP/$n.log" 2>&1
  echo "$n: $(grep '^# fell' "$SP/$n.log")  rows $(wc -l < "$SP/$n.mount.jsonl")"
}

# 1. the four arms on the owner's own default mount — §0–§4 of the report.
run s16-s0 1.4,16,5.7   0
run s16-s1 1.4,16,5.7   1
run f73-s0 1.4,7.32,5.7 0
run f73-s1 1.4,7.32,5.7 1

# 2. the single-channel arm (§5): `?mountAgree=deck` sets `banked` whatever the entry speed, so the crossing flips
#    `planing` ALONE. NOTE: on the f73 face under this switch the PROBE's own counterfactual `design()` throws
#    `singular` four runs in, so that arm has no window and §5 is s16 only.
run s16d-s0 1.4,16,5.7 0 deck
run s16d-s1 1.4,16,5.7 1 deck

# 3. the real Canyon sea (§6): the band's OCCUPANCY on the owner's own spot. `foam.ts`'s rig holds the stick at 0.
rm -f "$SP/canyon-ride.jsonl"
env MODE=ride PERIODS=1 TRIALS=2 GAP=4 SECONDS=3 XSPAN=60 ZMIN=-40 ZMAX=120 \
    ARMS=all AHEAD=0,3 ENTRIES=2,5 STANCES=tall,crouch,compress \
    RIDER=new FELT=deck BODY=two OUT="$SP/canyon-ride.jsonl" \
    node --max-old-space-size=2500 "$SP/foam.mjs" > "$SP/canyon-ride.log" 2>&1
echo "canyon: $(wc -l < "$SP/canyon-ride.jsonl") rows"

# 4. the two reports.
DIR=$SP ARMS=s16-s0,s16-s1,f73-s0,f73-s1 CANYON="$SP/canyon-ride.jsonl" node "$SP/lt.mjs" > "$SP/out.txt"
DIR=$SP ARMS=s16d-s0,s16d-s1 node "$SP/lt.mjs" > "$SP/out-deck.txt"
echo "reports in $SP/out.txt and $SP/out-deck.txt"
