#!/bin/sh
# Step 3.5d's five arms. `SP` is a scratch directory; run from the repository's root.
#
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.3/plant.ts -o "$SP/pl.mjs" --format esm --platform node
#   SP=<scratch> sh docs/research/new-rider/3.5/results/35d/run.sh
#
# Every arm is the owner's own address — `?rider=new&feltFrame=deck&riderBody=two` — at the folder's own placement
# (`AHEAD` 0.75, `SIDE` −45, 9 s a run, the stance held). `f73` is FACE 1.4,7.32,5.7, step 3.4h's closest fit to the
# water the owner rides; `s16` is FACE 1.4,16,5.7, the Canyon-matched arm (PR #223). `-ls` is the stick hard over
# (`STEERS=1`), `-l` the stick never touched. `ENTRIES=1..6` is absolute, so 1–3 is the owner's crawl, where the ask's
# own cap is exactly 0.
set -e
: "${SP:?set SP to a scratch directory}"
GL=4.435,5.435,6.435,7.435,8.435,8.935,9.435,10.435
run() {  # name FACE ENTRIES STEERS
  n=$1; face=$2; ents=$3; st=$4
  rm -f "$SP/$n.mount.jsonl"
  env RIDER=new FELT=deck BODY=two FACE="$face" AHEAD=0.75 SIDE=-45 SECONDS=9 \
      ENTRIES="$ents" STEERS="$st" MOUNT="$SP/$n.mount.jsonl" node "$SP/pl.mjs" > "$SP/$n.log" 2>&1
  echo "$n: $(grep '^# fell' "$SP/$n.log")  rows $(wc -l < "$SP/$n.mount.jsonl")"
}
run f73-ls 1.4,7.32,5.7 1,2,3,4,5,6 1
run s16-ls 1.4,16,5.7   1,2,3,4,5,6 1
run f73-l  1.4,7.32,5.7 1,2,3,4,5,6 0
run s16-l  1.4,16,5.7   1,2,3,4,5,6 0
run f73-g  1.4,7.32,5.7 "$GL"       0

# and the reader, three cells:
#   ./node_modules/.bin/rolldown docs/research/new-rider/3.5/roll.ts -o "$SP/rl.mjs" --format esm --platform node
#   DIR=$SP ARMS=f73-ls,s16-ls,f73-l,s16-l CELL=low  node "$SP/rl.mjs" > "$SP/out-low.txt"
#   DIR=$SP ARMS=f73-ls,s16-ls,f73-l,s16-l CELL=high node "$SP/rl.mjs" > "$SP/out-high.txt"
#   DIR=$SP ARMS=f73-g                     CELL=all  node "$SP/rl.mjs" > "$SP/out-g.txt"
