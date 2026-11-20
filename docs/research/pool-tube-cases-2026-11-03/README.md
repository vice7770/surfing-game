# The Wave Pool's straight Barrel: its own tube cases (2026-11-03)

The owner's two level-13 runs on the straight reef's ray (PR #183; `docs/research/pool-tube-runs/report.md`) replace
step 3's stand-in, the Canyon's a38 (`docs/research/pool-barrel-drawing-2026-11-01`). Branch `claude/pool-tube-cases`
from main 7cfe29a1. Nothing changes the floor or the tube's size: a separate job redesigns the reef's transect for a
bigger tube (see "Why the tubes came out small"). No rider sessions were run.

## Where it stands

- **Built and pushed:**
  - the two cases in the game's index;
  - `POOL_TUBE_CASES` swapped to them, as one family by A0;
  - a38 behind `?poolTubeCase=a38`;
  - the throw line from the runs;
  - tests.
- **Measured:**
  - the shape at the game's foot crests;
  - the tube in the game at 1.5 and 1.8 m;
  - the cost;
  - byte identity: every spot, Training and the A-frame hash exactly as main's.
- **Ride-camera strips:** see "Stills".
- **Tests:** tsc clean; the main suite and the SurfZoneSimulation subset pass (see "Tests").

## Next steps

1. The reef's redesign job: start from "Why the tubes came out small" below.
2. The owner's look pass: the shot list at the end.
3. When new cases land, the same procedure ("How to verify"): restage with `stage_pool.sh`'s commands, change
   `POOL_TUBE_CASES`, rerun the probes.

## How to verify

- **Types:** `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`.
- **Unit tests:** `npx vitest run src/wave/barrel src/scene/barrel`.
- **Probes** (results in `runs/`):
  - shape: `PROBE=1 TUBE_MODE=shape FEET=0.84,0.97,1.08,1.22,1.6 npx vitest run src/wave/probes/poolTube.probe.test.ts`;
  - in game: `TUBE_MODE=front H=1.05` (and `H=1.32`);
  - cost: `TUBE_MODE=cost`.
- **Byte identity:** bundle `docs/research/pool-barrel-straight-2026-11-01/pin-check.ts` with rolldown, run it, and diff
  against that folder's `runs/pin-branch.txt`.
- **In game:** Wave Pool, Waves: Barrel; `?poolTubeCase=a38` for the stand-in.

## What changed

- **The index** (`src/wave/barrel/barrelLibraryIndex.ts`, `docs/research/barrel-cases.md`) takes
  `periodic-pool-straight-small-l13` (A0 0.2706, slope 1:18.7) and `periodic-pool-straight-big-l13` (A0 0.3547, 1:21.6).
  - Made with `npm run barrels -- --runs docs/research/pool-tube-runs/data --run periodic_pool_straight_small_L13 --run
    periodic_pool_straight_big_L13 --spot <run>=pool --flat <run>=0.2 --a0 <run>=<A0>`, with every other shipped case
    `--keep` and its `.bin` put back as committed (as `stage_canyon.sh` does).
  - The regenerated pool files match the M4's byte for byte.
- **`POOL_TUBE_CASES`** = the two, read as one family by A0 (`BarrelSpot.family`). `?poolTubeCase=a38`
  (`SurfZoneConfig.poolTubeCase`, page and worker alike; online rooms pin the default) draws and feels the stand-in. The
  bounded-C A/B (`?tubeShape=c`) leaves the pool's cases raw, as it does the Canyon's.
- **The throw:** the line through the two runs' vertical depths (2.19 m at a 1.22 m foot crest, 2.54 m at 1.60 m),
  clamped to them, as the Canyon's (`POOL_RUNS` in `barrelSpots.ts`).
  - It lies deeper than every join row, so the lip still throws where the crest joins: zero lag, as before.
  - The measurement agrees. Scaled by Froude to the game's own foot crests (0.84 / 1.08 m on the knee), the runs go vertical
    at 1.51 and 1.94 m; the solver's white starts at 1.43 and 1.91 m.
- **Re-checked against the real cases, unchanged:** the breaking-depth table (the solver's white), `joinPast` 3 H (the
  plunging section's coverage is the same: 0.67–1.0 of the waves per column at 1.5 m, 0.67–1.25 at 1.8 m), the plunge gate
  s ≤ 100, and the foot on the knee. Nothing measured asked for a change.

## The shape (`runs/shape-cases.txt`)

At the game's foot crests, both sizes sit under the small case's A0 (0.19 and 0.245 against 0.271). The family therefore
draws the small case alone, Froude-scaled by 0.69 and 0.89. The big case (A0 0.355) is reached only by foot crests over
1.19 m. Values at 0.5 / 0.8 / 0.95 of touchdown:

| | Drawn H (meter) | Lip (H) | Tip (H) | Void (H²) | L/W | Air gap | Open, collapse |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1.5 m (foot 0.84 m) | 1.49 / 1.38 / 1.34 m (1.52) | 0.30 / 0.31 / 0.16 | 0.07 / 0.09 / 0.13 | 0.11 / 0.02 / 0.07 | 4.6 / 2.6 / 4.7 | 0.35 / 0.22 / 0.26 m | 1.24 s, 0.21 s |
| 1.8 m (foot 1.08 m) | 1.92 / 1.77 / 1.73 m (1.79) | as above | as above | as above | as above | 0.45 / 0.28 / 0.33 m | 1.40 s, 0.24 s |
| a38 (the stand-in), 1.5 m | 1.52 / 1.40 / 1.35 m | 0.19 / 0.17 / 0.15 | 0.06 / 0.12 / 0.14 | 0.21 / 0.20 / 0.17 | 2.5–2.9 | 0.79 / 0.56 / 0.51 m | 0.70 s, 0.32 s |
| a38, 1.8 m | 1.96 / 1.80 / 1.74 m | as above | as above | as above | as above | 1.02 / 0.71 / 0.66 m | 0.79 s, 0.36 s |

- **What still holds:** the breaker stays within about 10 % of the meter.
- **What doesn't:**
  - the lip is thick, 0.30 H mid-flight (target 0.1–0.2);
  - the void is a sliver (0.02–0.11 H²);
  - the tube is long and flat (L/W 2.6–4.7, against Mead & Black's 1.8–2.2 here);
  - the air gap is a third of the stand-in's.
- **Open time:** it stays open much longer (1.2–1.4 s against 0.7–0.8 s).

## The tube in the game (`runs/cases-*.txt`; the game's front and loft, CPU, 12 periods after 50 s)

| | 1.5 m faces | 1.8 m faces | (a38, step 3) |
| --- | --- | --- | --- |
| Drawn H, open standing slices, p50 (the meter 1.52 / 1.79 m) | 1.43 m | 1.85 m | 1.44 / 1.86 m |
| Vertical air gap, p10 / p50 / p90 (each wave's p90) | 0.09 / 0.32 / 0.52 m (0.53) | 0.12 / 0.43 / 0.67 m (0.68) | 0.63 / 0.83 m median |
| Waves joined per column on s 30–90 (of 12) | 0.67–1.0 | 0.67–1.25 | the same |
| Each wave's longest open run (in its H) | 7.55 m (4.47 H) | 9.72 m (5.06 H) | 4.41 / 5.23 m |
| Open-curl band, 1.3–3.5 H/tan α (the barrel section; past the take-off) | 1.7–4.5; 2.6–7.1 m | 1.75–4.7; 3.6–9.6 m | |
| Folds / holes, a loft | 0.011 / 0.010 | 0 / 0 | 0 / 0 |
| Lip foam on standing slices before touchdown | 13.3 % (p90 0.034) | 11.1 % (p90 0.017) | 18.6 / 19.9 % |

- **The open curl runs longer** than its band, slightly over the band's top past the take-off. The cause is the cases' long
  open time (1.24–1.40 s), not a front setting, so nothing is tuned.
- **The lip foam before touchdown** improved (19 → 11–13 %) but stays over the advisor's 5 % bar. The latch is still at the
  join (zero lag): the throw line is deeper than the join.
- **The holes at 1.5 m** (0.010 a loft) are new and small; not traced.

## Cost (`runs/cases-cost-1.05.txt`)

- The pool's CPU step at 1.5 m (300 steps each, alternated, this M1 under load): 78.2 ms p50 with the tube, 75.9 without
  (`?poolTube=off`), so +3 %, as with a38.
- The front costs 1.8–1.9 ms a step (p50; p90 2.5). The page's loft costs 1.4–1.6 ms a build (p90 2.1–2.3).
- No shader change.

## Byte identity (`runs/pin-cases.txt`)

The straight floor's pin check (`docs/research/pool-barrel-straight-2026-11-01/pin-check.ts`) gives IDENTICAL to main's
lines: every spot on the shared swell, the Wave Pool's three Training sizes, and the A-frame Barrel. The straight Barrel
itself changes by design.

## Why the tubes came out small (for the reef's redesign job)

Inferred from the runs and these measurements:

1. **The 2D waves are bigger than the game's.**
   - The runs' foot crests on the platform are 1.22 / 1.60 m (A0 0.27 / 0.355). The game's front measures 0.84 / 1.08 m
     on the knee, 0.69× as tall.
   - A 2D ray has no spreading: the advisor's K_r estimate was 0.68–0.81 for the crest turning from 67–72° on the platform
     to about 50° at the break, and the measured 0.69 sits at its low end.
   - So both sizes key under the small case, and the big case is never reached. The runs' H/h0 (0.352 / 0.437) came from
     the platform's wave height, while the library keys by the crest; the game's crest is about 0.53 of H, the 2D
     cnoidal train's about 0.77.
   - **For the next runs:** size the cases by the game's crest on the knee (A0 about 0.19 and 0.245), or include the
     spreading.
2. **The ray is gentle.** The 1:9.5 face, square to the reef, is crossed at about 50°, so along the ray it is 1:18.7 and
   1:21.6. Mead & Black's Y is 2.04 / 2.23 there, and the runs' tubes are longer still (L/W 4.5 / 5.3). A steeper face
   along the ray (a reef laid nearer square to the crests, or a steeper face) is the lever for a rounder tube.
3. **They break early and deep.** The faces went vertical at 2.19 / 2.54 m, 1.3–1.6 m above the 0.9 m crest, with H at
   vertical 2.39 / 2.59 m (H/d about 1.1). The lip throws over a still-deep face and lands on the face itself. The big case
   closes (a void of 0.20 × 0.04 m), its lip 4.8 cells across (under the 6 the grid rule asks).
4. **Pick & Feddersen's fits miss by 5–300×:** void 0.05 / 0.001 H² against 0.35 / 0.28. These are plane-slope fits;
   Padang's and the Canyon's reef cases ran under them as well, but not this far.
5. **The 2D domain is flat to a closed wall behind the 0.9 m crest** (`slope.c`). The advisor's caveat: its backwash is
   stronger than the real lagoon's sideways drain, and may choke the cavity.

## Stills (the water sheet, the straight Barrel's own CPU water, Rich; shot in a hidden pane)

- `pool-small-cases-ride-strip.jpg` and `pool-big-cases-ride-strip.jpg`: from the ride camera (`curl-ride`, 8 m down the
  line, 3 m in front of the toe, 1.8 m up), held on the longest open curl (4.4 m at 1.5 m, 7.6 m at 1.8 m), six frames
  0.25 s apart as the wave passes the fixed camera.
  - **1.5 m:** a small, thick curl with a dark slit of a mouth.
  - **1.8 m:** a long, thick lip throwing over the camera, its lit edge a white band, with a crumpled run toward the
    curl's leading end.
  - **Defects to look into:** thin dark seam lines along the face (both sizes), and at 1.8 m, at +1.0 s, a loose sliver of
    lip left behind after the curl passed.
- `pool-small-cases-views.jpg`, `pool-big-cases-views.jpg`: the ride, front, close and inside views at midday and sunset.
- The stand-in's looks are step 3's stills (`docs/research/pool-barrel-drawing-2026-11-01/stills/pool-small-rich.jpg`);
  the `?poolTubeCase=a38` A/B was not reshot on these seas.

## Tests

- **Type-check:** `npx tsc --noEmit -p .` and the server's are clean.
- **Main suite** (`npx vitest run src --maxWorkers=3`, without SurfZoneSimulation and SurfZoneRunner): 314 files passed, 1
  failed, 31 skipped; 3,011 tests passed. The one failure, `heldOverturn.test.ts`'s check of every shipped case's held frame
  against its metrics frame, was stale. It now takes the pool's small case (0.99 / 1.01 of its metrics), and checks the big
  case apart: its held frame holds a 0.13 H_I² void and a 0.25 H_I² jet, 0.05 √(h0/g) before touchdown, and the cavity
  closes in between (the report's 0.001 H_I² is that closing). The file passes.
- **SurfZoneSimulation subset** (`-t "[Pp]ool|[Bb]arrel|[Tt]ube|[Pp]adang|[Rr]oller|[Bb]oard|[Rr]ider"`): 36 passed, 68
  skipped by the filter (6,917 s).
- **Changed:**
  - `poolTube.test.ts`: the two cases; a38 by the switch; one family (a blend between their A0, the small one alone
    under it); the throw line through the runs, deeper than every join row.
  - `everySpot.test.ts`: the pool's cases loaded as one family; its front on the Barrel floor.
- No rider sessions.

## Shot list for the owner

Wave Pool, Waves: Barrel, Rich, midday, the ride camera.

1. **1.5 m, from the take-off:** the lip should throw thick and the tube stay low and long, about 0.3 m of air under the
   lip and open about 1.2 s. Is it a tube you could duck into, or a thick, low curl?
2. **1.8 m:** the same, a little more room (about 0.4 m of air), open about 1.4 s.
3. **A/B with `?poolTubeCase=a38`:** step 3's stand-in, a rounder tube with 0.6–0.8 m of air, open about 0.7–0.8 s.
4. **From beside the take-off:** the lip against the sky. The thick lip should still glow at its edge until it lands.
