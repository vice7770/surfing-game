# The Barrel's frame-rate run on the M4 Pro

For the owner. Run this on the M4 Pro, then commit and push the results so they can be analysed. It measures what holds the Wave Pool's Barrel at about 10 fps since the tube work. The owner's telemetry showed the worker's step over 16.7 ms, most of it "water". The first run (2026-11-06) showed why: the Barrel's sea stepped on the CPU, because the graphics card refused its periodic sides. Since barrel-gpu (`docs/research/barrel-gpu-2026-11-06/`) the graphics card steps it; `barrelgpuoff` is the Barrel as before, for the gain.

## Before you start

- Plug the M4 in.
- Close other heavy apps: games, video calls, and other browser tabs running the game.
- Chrome must be installed. The script opens its own Chrome window. Leave it alone and don't cover it while it runs.

## Run

From the repo folder:

```bash
git pull
```

```bash
npm install
```

```bash
npm run survey:barrel
```

```bash
npm run survey:barrel -- m4-pro "1.8 m"
```

Each run takes about 6–7 minutes. It:
1. builds the game;
2. serves it on http://127.0.0.1:4173;
3. rides the Barrel for 30 s in each variant below;
4. stops the server and prints one table.

Use `RIDE_SECONDS=60 npm run survey:barrel` for longer rides.

| Variant | What it is |
|---|---|
| `default` | Today's Barrel at High, then with Particles: low (the spray), then at Render scale 0.5 (the graphics card's fill) |
| `pool` | `?poolTubeCase=pool`, the owner's own M4 tube cases |
| `pretube` | `?tubeFace=old&tubeFrom=piece`, the Barrel before the tube work |
| `perfold` | PR #200's speed-ups off |
| `tubeformold` | `?tubeForm=old`, the wall formed late and fast, as before step 7 |
| `barrelgpuoff` | `?barrelGpu=off`, the Barrel's water on the CPU as before barrel-gpu: the gain is this row against `default` |
| `uploadsold` | `?deviceWater=old&launchWater=old&devicePlunge=old`, the graphics card sent the water as before barrel-gpu (the same water) |

## Send the results

```bash
git add docs/research/fps && git commit -m "fps: the M4 Pro's Barrel runs" && git push
```

If the push is refused, run `git pull --rebase`, then `git push` again.

Pasting the two printed tables into the chat works too, but the files carry more: the time line and every snapshot's step.

## Reading the table

| Column | Meaning | What points where |
|---|---|---|
| water on | Where the sea steps: GPU (the graphics card) or CPU | Every row but `barrelgpuoff` should say GPU. CPU there means the graphics card refused or failed: see the DEVICE row in the telemetry |
| fps, 1% low | Frames drawn a second, and the slowest 1 % | |
| gpu ms | The game's draw on the graphics card a frame | Over 8.3 means the drawing is the limit at 120 Hz |
| main ms | The page's own work a frame | High means the page's CPU work |
| worker ms | The sea's whole step in the worker | Over 16.7 means the sea falls behind real time |
| water ms | The water's share of that step, including the wait to read it back from the graphics card | Most of the worker ms means the graphics card's step |
| map ms | The wait for the read-back alone | High means the step stalls on the read-back |
| upload kB p50/p95 | Water sent to the graphics card a step | About 7–40 kB with barrel-gpu's upload fixes; hundreds of kB, or 1,200+ kB at p95, without them (`uploadsold`) |
| whole/s | Steps in the last second that sent the whole water + the whole plunge zone | 0+0 with the fixes; about 5+30 a second without them (`uploadsold`) |
| readback kB | Water read back a step | |
| sea × | The sea's seconds per real second | 1.00 keeps real time; 0.2 means the waves run at a fifth of their speed |
| snap ms p95 | The time between fresh snapshots (the motion you see) | About 17 is smooth; over 50 looks choppy |

## A quick manual check (optional)

In the game: Settings → Show telemetry, then Wave Pool → Barrel → 1.5 m. Note:
- the **WORKER** row, "… ms a step · water … · contact … · snapshot …";
- the **SOLVER** row: "Boussinesq · GPU · …" since barrel-gpu, "· CPU ·" before it;
- the **DEVICE** row: on the GPU, the kB sent and read back a step and the whole uploads in the last second; on the CPU, why;

with nothing in the address, then with `?barrelGpu=off` (the Barrel as before barrel-gpu).
