#!/usr/bin/env bash
# The Wave Pool Barrel's frame-rate check on this machine (pool-barrel-perf, 2026-11-06), in real Chrome:
# build the game, serve it locally, run the fps survey on the Barrel for the default and each A/B, stop the server,
# and print one table. Run from the repo root, with Chrome installed and nothing else heavy running:
#   npm run survey:barrel                       the M4 Pro, 1.5 m
#   npm run survey:barrel -- m4-pro "1.8 m"     another label or swell
# Each run writes docs/research/fps/<date>-<label>-barrel-<swell>-<variant>.json; commit and push that folder.
set -euo pipefail
cd "$(dirname "$0")/../.."

LABEL="${1:-m4-pro}"
SWELL="${2:-1.5 m}"
SECONDS_PER_RIDE="${RIDE_SECONDS:-30}"
PORT=4173
DATE="$(date +%Y-%m-%d)"
COMMIT="$(git rev-parse --short HEAD)"
OUT_DIR="docs/research/fps"
STEM="$OUT_DIR/$DATE-$LABEL-barrel-${SWELL// /}"
mkdir -p "$OUT_DIR"

echo "Building $COMMIT…"
npm run build

echo "Serving the build on http://127.0.0.1:$PORT…"
npx vite preview --host 127.0.0.1 --port "$PORT" --strictPort > "${TMPDIR:-/tmp}/barrel-fps-preview.log" 2>&1 &
PREVIEW=$!
trap 'kill "$PREVIEW" 2>/dev/null || true' EXIT
for _ in $(seq 1 60); do
  if curl -sf "http://127.0.0.1:$PORT/" > /dev/null; then break; fi
  sleep 1
done
curl -sf "http://127.0.0.1:$PORT/" > /dev/null || { echo "The preview server did not start; see ${TMPDIR:-/tmp}/barrel-fps-preview.log"; exit 1; }

FILES=()
# One survey run: a variant's name, its URL switches (empty for the default) and the settings rows to sample.
run() {
  local name="$1" query="$2" only="$3"
  local out="$STEM-$name.json"
  echo
  echo "=== $name ${query:-(the default)}"
  npm run survey:fps -- "$out" --commit="$COMMIT" --features --spot="Wave Pool" --waves=Barrel --swell="$SWELL" \
    --only="$only" --rideSeconds="$SECONDS_PER_RIDE" --url="http://127.0.0.1:$PORT/$query"
  FILES+=("$out")
}

# The default, then whether the spray or the resolution is the limit.
run default "" "High (baseline),Particles: low,Render scale 0.5"
# The owner's own M4 cases.
run pool "?poolTubeCase=pool" "High (baseline)"
# The Barrel before the tube work: the fitted piece exactly as before.
run pretube "?tubeFace=old&tubeFrom=piece" "High (baseline)"
# PR #200's speed-ups off.
run perfold "?plainHeight=old&contactRows=old&barrelHeight=old&cameraWater=old&barrelMesh=old" "High (baseline)"
# The wall formed late and fast, as before step 7 (fewer slices).
run tubeformold "?tubeForm=old" "High (baseline)"
# The Barrel's water back on the CPU, as before barrel-gpu (its periodic sea was refused the graphics card): the gain.
run barrelgpuoff "?barrelGpu=off" "High (baseline)"
# barrel-gpu's three upload fixes off: the water the graphics card is sent each step as before (the same water).
run uploadsold "?deviceWater=old&launchWater=old&devicePlunge=old" "High (baseline)"

echo
echo "=== Summary ($LABEL, the Barrel at $SWELL, $COMMIT)"
node -e '
const fs = require("fs");
const cell = (v, d) => (v === undefined || v === null || !Number.isFinite(Number(v)) ? "-" : (d === undefined ? String(v) : Number(v).toFixed(d)));
const kb = (b) => (Number.isFinite(b) ? (b / 1024).toFixed(0) : "-");
console.log(["variant", "setting", "water on", "fps", "1% low", "gpu ms", "main ms", "worker ms", "water ms", "map ms", "upload kB p50/p95", "whole/s", "readback kB", "sea ×", "snap ms p95"].join("\t"));
for (const file of process.argv.slice(1)) {
  const name = file.replace(/^.*-barrel-[^-]+-/, "").replace(/\.json$/, "");
  for (const r of JSON.parse(fs.readFileSync(file, "utf8")).results) {
    if (!r.screen.startsWith("Ride")) continue;
    const p = r.pipelineMsP50 ?? {};
    const q = r.pipelineMsP95 ?? {};
    const on = r.observed?.compute ?? (/ GPU /.test(r.solver ?? "") ? "gpu" : / CPU /.test(r.solver ?? "") ? "cpu" : "-");
    console.log([name, r.setting, on.toUpperCase(), cell(r.renderedFps ?? r.fps), cell(r.fps1Low), cell(r.gpuMsP50), cell(r.mainThreadMsP50),
      cell(p.total, 1), cell(p.water, 1), cell(p.deviceMap, 1), `${kb(p.deviceUploadBytes)}/${kb(q.deviceUploadBytes)}`,
      `${cell(p.deviceFullWater, 0)}+${cell(p.deviceFullPlunge, 0)}`, kb(p.deviceReadbackBytes),
      cell(r.simulationSecondsPerWallSecond), cell(r.snapshotIntervalMsP95)].join("\t"));
  }
}' "${FILES[@]}"
echo
echo "Done. Commit and push $OUT_DIR (the $DATE-$LABEL-barrel-* files) so the numbers can be read."
