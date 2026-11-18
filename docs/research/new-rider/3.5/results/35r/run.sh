#!/bin/sh
# Step 3.5r — the rulers, calibrated on the game's own rider. `SP` is a scratch directory; run from the repository's
# root. Nothing under `src/` or `server/` is touched, and nothing is installed.
#
#   SP=<scratch> sh docs/research/new-rider/3.5/results/35r/run.sh
#
# The whole report is one deterministic run: the only randomness is the seeded Monte Carlo of the pixel jitter
# (`random(seed)` in the probe), so `out.txt` reproduces byte for byte. It takes about 12 s and no memory
# worth naming.
set -e
: "${SP:?set SP to a scratch directory}"
./node_modules/.bin/rolldown docs/research/new-rider/3.5/rulers.ts -o "$SP/r.mjs" --format esm --platform node
node "$SP/r.mjs" > "$SP/out.txt"
echo "report in $SP/out.txt ($(wc -l < "$SP/out.txt") lines)"
