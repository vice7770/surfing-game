# The Wave Pool's Barrel, redone straight: one right-hander from the +x wall (2026-11-01)

**The owner's decision.** Looking at step 1's top-view strips, the owner said the pool's waves were "not straight… the
waves are funnelling". The A-frame's V reef bent each crest into a ∧ over the finger, and the two arms' white ran into the
middle and met there. That breaks their standing rule that waves never come from more than one side. Their decision: "It
should be straight starting from right to left and the surfer start at the right to have a full uninterrupted wave."
- one wave that starts breaking at the +x end (the right, seen from the beach looking out to sea) and peels all the way
  toward −x: a right-hander;
- crests straight from the machine to the beach;
- the rider starts at the right end and rides one full, uninterrupted line;
- no mirrored left for now (the code mirrors with one sign, `POOL_STRAIGHT.side`; no UI);
- Training exactly as it is.

Branch `claude/pool-barrel-straight` from main at c7fb4176 (step 1 merged, PR #179). Wave work only: no rider sessions.
**Switches:** the Barrel mode is itself the switch for Training (its hashes match main's, below). Step 1's A-frame stays
behind `?poolBarrel=aframe` for A/B (its own hashes match main's Barrel too); online rooms always run the default.

## In one paragraph

The machine now sends its regular wave at an angle, 39° at the feed, onto one straight reef laid at 40° from the +x
wall's corner (s 0 at x 115, z −221) in toward the beach at −x (s 235 at x −65, z −70). Every crest is one straight
line, tilted the same way from the machine to the beach (39° at the machine, 32° at the take-off, 27° inside, 15–19° on
the beach's last metres), and never from two sides. Each wave starts breaking at the same place, at the same moment
(x 93–94, sd 1–2 m; 8.3–8.8 s into the period, sd 0.2 s), and its white runs down the reef as one travelling line for a
median 120 m of reef (to u ≈ 150) in about 18 s, then fades as the wave is spent. It plunges (lip jets on 90–100 % of
onsets) from the take-off to about u 90, then turns to a spilling bore. The peel runs 8.5–10.4 m/s over the first 25 m
past the take-off, then 6.5 (1.5 m) / 7.1 (1.8 m) m/s down the barrel section, a peel angle of about 67–72° (Walker's
30° minimum met with room). The catch is the weak part: the chosen start catches up to 4 of 12 at 1.5 m and 2–4 of 12 at
1.8 m nose in (8 of 12 for one script angled 35° down the line); Training catches 10 of 12.

## The design and why (the water-physics advisor's layout; `docs/research/water-physics/consult-log.md`, top row)

- **Why the reef is turned, not the machine's wave alone.** On a bed that is the same all along x, the place where an
  oblique crest breaks moves along x at the crest's trace speed, c_feed / sin θ_feed ≥ 8.8 m/s at every angle the window
  fits: a peel only pros make. Turning the reef by φ slows it to V_reef = c_p / sin(θ_p + φ) along the reef (Hutt, Black
  & Mead 2001: V_p = c_b / sin α). With θ_p ≈ 27–32° on the platform and φ = 40°, V_reef ≈ 1.05–1.1 c_p.
- **Why periodic sides with two wavelengths across.** An oblique wave needs its crests to carry on past the window's side
  edges. Measured first (`runs/e1-*.txt`, small wave, 8 periods): with open sides at 40° the zone's +x corner shaded the
  start and the break began somewhere new every wave (sd 2.9 s and 50 m), and the line passed u 100 on 2 of 11 waves; at
  20° the start held, but the line passed u 150 on 3 of 10 and never u 200. Periodic sides keep every crest whole: n = 1
  (18°) carried the line furthest but its crests meet the reef nearly square to the machine and the peel is too fast to
  make; n = 2 (kx·W = 4π, 39.1° at the 9 m feed) is the advisor's pick and the layout built. The solver's own k and W
  set the angle (`poolStraightDirection`), so the crest's phase matches across the wrap.
- **The reef.** Step 1's 4.5 m platform (20 m lead) and 1:9.5 face (knee rounded ±3 m), now one straight ridge: its
  crest 4.5 → 1.6 m deep over s 0–30 (the start's convex end), 1.6 → 0.9 m to s 65 (the take-off section), 0.9 m to
  s 175 (the barrel section), 0.9 → 2.0 m to s 205 (back-off) and 2.0 → 4.5 m to s 235 (the end, 25 m clear of the
  wrap). A 6 m flat top, then back down at 1:10 to the platform: no shallow lagoon behind it. The breaking-age gate stays
  at J 0.5 (the reef's start is a convex end, as the A-frame's tip and the Canyon's).
- **Sizes.** 1.05 m and 1.32 m at the feed give 1.52 m (sets 1.54) and 1.79 m (sets 1.83) faces on the take-off's meter,
  the targets 1.5 / 1.8 m (`runs/e2-*.txt`, `runs/e3-base*.txt`; the advisor's 1.25–1.55 m guess was high). The A-frame,
  behind `?poolBarrel=aframe`, now also runs at these heights (its own were 0.99 / 1.24).
- **The rider.** Riders wait at s 40 (x 84) on the face, 18 m (1.5 m) / 13.5 m (1.8 m) seaward of the take-off (both at
  z −213.5, 3.1 m deep: the spot where the catch probe found the most rides), nose to the beach; the overview camera sits on the beach's −x side looking back up the reef toward the
  start (`SpectatorCamera.overviewSide`). The readout, the Surf screen's blurb ("…an A-frame to practise on, or a
  barrelling right") and the size words are the straight floor's.

Code: `src/wave/pool.ts` (`POOL_STRAIGHT`, `poolStraightDepth`, `poolStraightDirection`, `poolStraightStartOut`,
`poolFloorOf`, `poolTankLayout(shore, floor)`), `src/wave/SurfZoneSimulation.ts` (the `poolBarrel` config, the oblique
sea, `xBoundary: 'periodic'` for the straight floor, the take-off, start and age gate per floor), `src/wave/Bathymetry.ts`,
`src/game/PhysicalMode.ts` (the `?poolBarrel=aframe` switch, the camera side), `src/game/SurfConditions.ts`,
`src/scene/SpectatorCamera.ts`, `src/main.ts` (online rooms pin `poolBarrel: undefined`), `src/ui/strings.ts`, tests in
`src/wave/pool.test.ts` and `src/game/SurfConditions.test.ts`.

## Frame by frame (`frame-probe.ts`, `runs/frame-small.txt`, `runs/frame-big.txt`; 12 periods after 50 s, 14 waves)

u is metres along the reef from its start (u 40 is the take-off). The probe follows each wave's white as one travelling
line from where it first goes white.

| | 1.5 m (1.05 m at the feed) | 1.8 m (1.32 m at the feed) |
|---|---|---|
| Faces on the meter | 1.52 m, sets 1.54 | 1.79 m, sets 1.83 |
| Where it starts | x 93 (sd 1.4 m), z −199, 1.6 m deep; 8.80 s in the period (sd 0.25) | x 94 (sd 1.8 m), z −202, 1.6 m deep; 8.27 s (sd 0.16) |
| The line reached u 65 / 100 / 150 / 175 / 205 | 13 / 13 / 8 / 2 / 0 of 14 | 13 / 11 / 8 / 3 / 1 of 14 |
| Where the line ends (median, 10th pct) | u 149 (108) | u 149 (95) |
| Peel u 40–65 | 8.5 m/s (7.8–9.4) | 10.4 m/s (8.5–11.7) |
| Peel u 65–175 | 6.45 m/s (5.7–6.45) | 7.1 m/s (6.1–7.1) |
| Lip jets on ≥ 90 % of onsets | u 40–80 (83 % at 80–90, 59 % at 90–100) | u 40–90 (66 % at 90–100) |
| ξb along the ray, plunging section | 0.60–0.74 | 0.49–0.69 |
| Mead & Black's X / Y there | 15–20 / 1.8–2.2 | 15–22 / 1.8–2.3 |
| The tube's void (the solver's fit): height × length | 0.60–0.68 × 1.40–1.46 m | 0.57–0.86 × 1.56–1.74 m |
| Wave to wave | start sd 0.25 s, 1.4 m; reach times sd 0.1–0.9 s to u 100 | start sd 0.16 s, 1.8 m; sd 0.2–1.5 s |

The 600 s run at 1.8 m (`runs/health-big-600s.txt`, 59 waves) agrees: start 8.13 s (sd 0.19), x 94 (sd 5); the line
reached u 100 on 52, u 150 on 42, u 175 on 16, u 205 on 5; end median u 152 (10th 96); peel 10.4 / 6.9 m/s.

**What the numbers say.** One wave, one start, one line: every wave starts within a couple of metres and a quarter of a
second of the last, and its white runs unbroken down the reef. Past u 90–100 the wave on the 0.9 m crest has spent its
height (H 0.85–1.0 m at 0.9 m deep) and breaks as a spilling bore, so the plunging, barrelling part is about the first
50–60 m past the take-off and the line fades between u 100 and u 175. The onsets the probe lists before u 20 and past
u 210 are not the reef: they are the beach's shore break at z ≈ −10, where crests that pass the reef's ends reach the
beach. The tube is under the 1–1.2 m target in the shallow-water solver's fit (0.6–0.85 m high); step 2's Navier–Stokes
cases measure the real one on this transect.

## Crests everywhere (`scripts/crest-angle-report.ts --spot pool --waves barrel`, 600 s; `runs/crests-*.txt`)

The crests are followed across the whole window (x −128…128), every second, in four bands from the machine to the beach:

| Band | 1.5 m: \|angle\| p50 / p90 | two-sided | 1.8 m: \|angle\| p50 / p90 | two-sided |
|---|---|---|---|---|
| seaward (machine to the reef) | 27.6 / 31.3° | 0 of 89 | 27.9 / 30.6° | 0 of 91 |
| take-off | 27.7 / 30.9° | 1 of 350 | 28.6 / 31.0° | 0 of 270 |
| inside (over and behind the reef) | 26.6 / 34.0° | 0 of 134 | 27.3 / 34.5° | 0 of 165 |
| inner (the lagoon to the beach) | 16.9 / 34.3° | 0 of 0 | 18.6 / 34.6° | 0 of 1 |

- Signed medians in the outer thirds are the same sign on both sides everywhere (+27…+30° seaward to inside, +13…+19°
  inner): every crest is tilted the one way, as one straight line from a single side. "Two-sided" (a crest whose outer
  thirds tilt opposite ways past ±5°, the A-frame's ∧) is 0–1 out of hundreds in every band.
- The followed crest lines: 39.3–39.4° at the machine (std 0.1°), 31.7–32.7° at the take-off line (std 0.1–0.2°), 26.5–27.6°
  inside, all steady over 600 s (the per-100 s means move by 0.5° at most). Refraction turns them gradually; the crest bends
  by about 10° from end to end across the take-off line, where half of it is over the reef and half over the platform,
  one way.
- The report's "edge chevron" column is twice the angle at the window's edges; at the periodic pool it is just the tilt
  doubled, not a chevron.

## Catch and the start (`catch-probe.ts`; headless riders, no rider sessions)

Twelve waves per start, four scripts (good, early, late, lift). Counts are waves ridden out of 12.

| Start (seaward of the take-off at s 40) | 1.5 m nose in | 1.5 m angled 35° | 1.8 m nose in | 1.8 m angled 35° |
|---|---|---|---|---|
| 6 m | 0 | 0–2 | 0 | 0–2 |
| 11 m | 0–3 | 0–5 (early 5) | 0–2 | 0–8 (early 8) |
| 16 m | 0–4 (good, early, lift 4) | 0 (no cue) | 0 | 0 |
| At s 75 instead: 6 / 11 / 16 m | 0 / 1–3 / 1–4 | 0–2 / 0 / 0 | 0–1 / 0 / 2–3 | — |

The check at the chosen starts, nose in (`runs/catch-*-chosen-h0.txt`, all fourteen scripts, the start ±5 m):

| | 5 m nearer | the chosen start | 5 m further out |
|---|---|---|---|
| 1.5 m (18 m out, 3.1 m deep) | 0–4 (good 3, early 2, late 0, lift 3; share70 4) | 0–4 (good 4, early 4, late 0, lift 4) | 0 (no cue on 10–12) |
| 1.8 m (13.5 m out, 3.1 m deep) | 0 (left on the crest or white water) | 0–4 (good 3, early 3, late 2, lift 3; steep 4) | 0 |

The chosen starts are the best of the three at both sizes.

Most misses are "left on the crest": the rider pops but the wave goes on without them, because on this reef the wave
reaches the rider moving along the reef as well as in, and its face under a rider who waits nose to the beach is
shallower than Training's (the advisor's 1:12.4 along +z at s 40). The start was set where the most rides came: s 40,
18 m out at 1.5 m and 13.5 m out at 1.8 m (the take-off point sits 2 m further in at 1.5 m than in the first runs, so
both land at z −213.5: the first runs' "16 m" at 1.5 m and, within half a metre, their "11 m" at 1.8 m). Training's catch, for comparison, was 10 of 12 (step 1). This is the main open
item for the owner's play: whether a player who paddles angled down the line catches it better than the scripts.

## Health over 600 s and the current behind the reef

| | 1.5 m | 1.8 m | 1.8 m, wall on the wrap |
|---|---|---|---|
| finite, Froude caps | yes, 0 | yes, 0 | yes |
| fastest water | 6.40 m/s | 6.98 m/s | 11.3 m/s |
| volume drift | 0.17 % | 0.24 % | 0.03 % |
| least water on the reef top | 0.17 m | 0.10 m | 0.12 m |
| mean along-shore current behind the reef (z −100…−45), last 100 s | — | −0.33 m/s | +0.03 m/s (−0.15 at most) |

The periodic window lets the water the breaking waves push along the reef (S_xy, the advisor's 1.2–1.6 kN/m) circulate
round the wrap, so a current builds behind the reef toward −x: −0.05 m/s at 100 s, −0.18 at 300 s, −0.26 at 450 s,
−0.27 at 550 s and −0.33 m/s by 600 s, just past the advisor's 0.3 m/s bar. The start and the line held over the 600 s (above),
but the meter over the whole run reads 1.67 m (sets 1.69) against 1.79 m over the first 12 periods: the faces at the
take-off come down about 7 % as the current builds (inferred from the timing; not separated from the meter's window). The advisor's fix is a land barrier on the wrap column (the pool's real side wall where the
bores and the current run); it is built as an option (`POOL_STRAIGHT.wrapWallWidth`, off by default) because it is the
owner's call: it stops the current, but the beach's waves reflect off it at the −x side.
Measured with a 2 m wall from the beach out to z −150 (`runs/health-big-600s-wall.txt`, 600 s at 1.8 m): the current
stays small (−0.07, −0.03, −0.12, −0.15, −0.03 m/s per 100 s, +0.03 at the end), but the waves get worse: the line's end
median falls from u 152 to u 136 (u 150 on 11 of 57 waves against 42 of 59), the meter reads 2.08 m against 1.67 m over
the same 600 s (likely the beach's waves reflecting off the wall; inferred), and the fastest water rises to 11.3 m/s against 7.0. So it
stays off; the default is the plain periodic window, and the current is an open item for the owner's play.

## Cost (`../pool-barrel-2026-11-01/step-bench.ts`, `cost.txt`)

The GPU refuses periodic boundaries (its cyclic solves stay on the CPU: `deviceStepRefusal`, "periodic along shore"),
so the straight Barrel steps on the CPU even when the GPU is asked for (the water sheet says "water on the CPU (ASKED FOR
THE GPU)"). On the M1 (busy with other runs), per step: Training 50.6–51.4 ms p50; Barrel 1.5 m 52.7–53.3 ms; Barrel
1.8 m 54.5 ms p50 (p95 105 ms: occasional second CFL substeps); 280 × 374 cells against Training's 280 × 359. So on the
CPU the straight Barrel costs about 4–8 % more than Training; against Training on the GPU it is the CPU's cost. On the M4
the GPU path would be the thing to add if the Barrel needs it (periodic cyclic solves on the device).

## Strips (from the start camera and from above; rich, midday)

- `strip-small-start.jpg`, `strip-big-start.jpg`: the start camera (eye 14, 16, −102 looking to 84, 0, −237: from the
  beach's −x side back up the reef toward the start), six frames 2 s apart from 1 s before the wave starts.
- `strip-small-above.jpg`, `strip-big-above.jpg`: from above (170 m up over x 25, z −150), six frames 4 s apart. The
  reef runs from the top right (the +x wall's corner) to the bottom left. At any moment two or three waves are breaking
  along it, one wave every 10 s, each one's white travelling down the line; the crests between are straight diagonal
  bands, all tilted the one way.

## Byte identity (`pin-check.ts`, `runs/pin-main.txt`, `runs/pin-branch.txt`)

Every spot's sea hash, grid, take-off, start and tank, at every size, on main and on this branch: IDENTICAL, including
the Training pool's and the A-frame's (`?poolBarrel=aframe`) at their own heights.

## Step 2: the Basilisk tube cases (on the M4; the owner holds the runs until this is merged)

Re-staged on the straight reef's ray over the barrel section (`tools/basilisk/run_periodic.sh`, `canyon_pipeline.py`,
`run_pool.sh`, `tools/basilisk/README.md`): `pool_straight_small` (h0 4.5, H/h0 0.352, T 10 s, S1 0.0535, the face 1:18.7
along the ray) and `pool_straight_big` (H/h0 0.437, S1 0.0463, 1:21.6); step 1's `pool_barrel_*` cases were never run and
are replaced. On the M4 Pro, from the repo:

```
git fetch origin
git checkout main && git pull                # once this is merged (or claude/pool-barrel-straight before)
npm run barrels:pool -- check                # what's missing, and how to install it
npm run barrels:pool -- setup                # only if check asked
npm run barrels:pool -- smoke                # optional, about a minute
npm run barrels:pool                         # the runs, in the background; about 2.5–4.5 h for the pair
npm run barrels:pool -- status               # each case's phase and ETA
```

Afterwards commit `public/barrels/periodic-pool-straight-*.bin` and `docs/research/pool-tube-runs/`.

## Tests

`npx tsc --noEmit -p .`, `npx tsc -p server/tsconfig.json --noEmit`: clean. Main suite (`npx vitest run src
--maxWorkers=2 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`): MAIN_SUITE. The
SurfZoneSimulation subset (`-t "[Pp]ool|[Bb]arrel|[Tt]ube|[Rr]oller|[Bb]oard|[Rr]ider"`): SZS_SUITE.

## Open items and risks

1. **The catch** is poor next to Training's (up to 4 / 12 at 1.5 m, 2–4 / 12 at 1.8 m nose in, 8 / 12 for one script
   angled down the line). The
   owner's play decides whether angling down the line makes it fine; if not, the next physical lever is the face along
   the rider's paddling line at the take-off (a slightly steeper face or a shallower crest at s 30–50), not the size.
2. **The plunging section** is the first ~50–60 m past the take-off (to u 90–100); after that the wave spills, and the
   line fades by u 150 (median). Making it barrel further needs more height left on the barrel section (e.g. a crest
   stepping deeper along the reef, so the wave breaks later rather than spending itself), which is a new floor question
   for the advisor.
3. **The tube** in the shallow-water fit is 0.6–0.85 m high, under the 1–1.2 m target; step 2 measures it properly.
4. **The current behind the reef** reaches −0.33 m/s by 600 s, and the take-off's faces come down about 7 % over that
   time. The wall on the wrap (built as an option, off) stops the current but shortens the line and adds fast water, so
   it stays off; the owner's play decides whether the current matters.
5. **The GPU** cannot run periodic sides; the straight Barrel is CPU-only (4–8 % over Training's CPU cost on the M1). A
   device path for cyclic solves would be its own job.
6. **The reef top** keeps 0.10–0.17 m of water at the least (the advisor's bar 0.2 m): it does not dry, but the inside
   is shallow under the biggest sets.
7. **The A-frame** behind `?poolBarrel=aframe` runs at the straight heights (1.05 / 1.32 m), not its own 0.99 / 1.24.

## Shot list for the owner

1. Wave Pool, Barrel, 1.5 m, the overview camera: watch three waves from the start camera; does each start at the same
   place by the +x corner and peel right to left?
2. The same from above (the water sheet or a high free camera): are the crests straight, all one way, from the machine
   to the beach? Is the line one unbroken run?
3. Paddle for ten waves from the start, nose in, then ten angled 30–40° down the line (toward −x): how many do you catch?
4. Ride three waves as far as they go: where does the barrel end and the wave go soft?
5. The same at 1.8 m.
6. Leave the pool running ten minutes, then ride: does the water behind the reef feel like it is dragging you toward −x?
7. A/B: `?poolBarrel=aframe` for step 1's A-frame.

## Files

- `frame-probe.ts`: the frame-by-frame probe on the straight floor (`--size small|big`, `--H`, `--periods`,
  `--straight key=value`, `--profile 's:d;…'`, `--join`, `--json`); `runs/frame-*.txt`, `runs/e1-*`, `e2-*`, `e3-*`
  (the layout and size sweeps), `runs/health-big-600s*.txt`.
- `catch-probe.ts`: the catch probe (`--heading`, `--straight`, `--starts`); `runs/catch-*.txt`.
- `bed-check.ts`: the floor's depths along and across the reef. `pin-check.ts`: the byte-identity hashes.
- Build any of them with `rolldown <file> -o dist/scripts/<name>.mjs --format esm --platform node`, then `node
  dist/scripts/<name>.mjs …`. The JSON outputs stay out of git (`runs/.gitignore`).
