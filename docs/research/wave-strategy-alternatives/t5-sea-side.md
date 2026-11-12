# T5, the sea's side: is the live sea's wave as tall as the case's wave 2 to 4 s before the throw? (2026-11-12)

Tags: [M] measured in this run, [C] read in the code, [R] reasoned.
For the route C2 (the hand-over from the live sea to a 2D Basilisk case). This is the probe that `t5-run.md`,
section 5, planned. No game code was changed. Probe: `t5-sea-probe.ts` (here). Its full output: `t5-sea-side-run.txt`.

## Answer

**FAIL.** 2 to 4 s before the throw, the sea's wave is about **17 % lower** than the case's wave, as the game places
the case (median ratio sea / case 0.83, 0.82, 0.84 at 2, 3 and 4 s; the bar is 0.90 to 1.10).
- The **place** agrees: the two crests stand within 0.1 to 1.3 m of each other along the ray.
- The **height** differs mostly at the **trough ahead**: the sea's trough is 0.10 to 0.17 m less deep than the case's.
  The sea's crest is also lower over still water, by 0.06 to 0.09 m (the medians of each side; per point 0.09 to 0.14 m).
- The **face** is flatter in the sea: 11 to 14° against the case's 15 to 20°.
- The far third of the reef (s 101 to 151 m, the `poolReach=long` part) is the worst: ratio 0.62 to 0.76. On the first
  two thirds it is 0.82 to 0.94.

**A units finding first.** The game does not draw the case at h0 = 5.0 m (4.5 m × 1.11). It scales each slice by its
foot crest: h0 = foot crest / A0 (A0 = 0.3547). For the thrown points h0 is **3.45 m** median (3.02 to 4.00 m) [M]. So at
the game's size the case's wave 2 to 4 s out is **1.6 to 1.8 m** high, not the 2.2 to 2.4 m of `t5-run.md`'s table
(that table is at the 4.5 m run's own size). Ruling 17's sea wall of about 1.5 m and this case side are close; the
"1.4 × fail" that `t5-run.md` feared was mostly this units mix. The real gap is about 17 %.

## What was measured, and how

- **The sea.** The game's own config path (`physicalSettingsFor`, `surfZoneConfigFor`) with
  `?poolSize=ref&wallBody=stream&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug` on a stand-in `location`, the
  game's library (`periodic-pool-straight-big-l13`), `SurfZoneSimulation` on the CPU, 300 s. Same build as
  ruling 17's probe (`ruling-17-runs/r17-probe3.ts`), with its bar readers left out.
- **A ring buffer** of the sea's surface η every 0.1 s for the last 5.2 s.
- **Each front point at its throw** (its clock's τ = 0; the throw time is now − τ). Throws from 60 to 270 s: 1776 points
  on 73 fronts. Its place P and its ray: the front's shoreward normal at P, from its neighbours along the front (as the
  loft stands a slice).
- **Look back** Δ = 2, 2.5, 3, 3.5, 4 s (and 1, 1.5 s as a check). The sea at t_throw − Δ, linear in time between two
  buffered frames, is sampled along the ray every 0.25 m. The crest = the local top nearest the case's crest place.
  H = crest over the lowest water within **3 h0** shoreward of it (the case's rule, h0 = the slice's own). Face = the
  steepest slope along the ray between the trough and the crest.
- **The case.** The committed level-10 scout track
  (`docs/research/pool-tube-runs/data/periodic_pool_straight_big_L13_scout_track.json`) at τ = −Δ, **scaled per point as
  the game scales it**: h0 = `library.caseBlend(...).scale` from the point's foot crest and foot depth (lengths × h0,
  times × √(h0/g)). The probe's case side equals `t5_case_side.py --scale 0.7156` (h0 3.22 m) to the digit in a short
  test run.
- **Checks.** (1) The ray against the sea's own gradient at the steepest place: 4 to 8° median, so the ray is square to
  the sea's crest. (2) At Δ = 1 and 1.5 s the game's library has frames: its H is 1.84 / 1.83 m against the track's
  1.80 / 1.83 m, its crest place 7.0 / 9.5 m against 6.6 / 9.8 m. The track's height is the library's. (The level-10
  track's face is 3 to 7° steeper than level 13's there, as `t5-run.md` found.)

## The table (all points; median, 10 to 90 %; metres in the game's size)

| Δ (s) | ratio sea / case H | sea H | case H | crest rise, case − sea | crest before the throw: sea | case | face: sea (deg) | case (deg) |
|---|---|---|---|---|---|---|---|---|
| 2.0 | **0.83** (0.54–1.05) | 1.61 | 1.81 | 0.14 (−0.11–0.38) | 12.5 | 12.6 | 14 (8–18) | 19 |
| 2.5 | 0.83 (0.60–1.05) | 1.59 | 1.76 | 0.10 (−0.15–0.31) | 15.8 | 15.4 | 13 (9–17) | 20 |
| 3.0 | **0.82** (0.61–1.01) | 1.52 | 1.75 | 0.09 (−0.15–0.29) | 19.3 | 18.8 | 12 (8–15) | 18 |
| 3.5 | 0.82 (0.60–1.01) | 1.45 | 1.68 | 0.10 (−0.16–0.32) | 22.5 | 21.6 | 11 (8–14) | 16 |
| 4.0 | **0.84** (0.65–1.03) | 1.38 | 1.57 | 0.10 (−0.15–0.28) | 26.0 | 24.7 | 11 (8–13) | 15 |

The trough ahead (crest − H, over still water, m): sea −0.34, −0.32, −0.27, −0.22, −0.17 at 2 to 4 s; case −0.44,
−0.44, −0.44, −0.39, −0.31. Some sea points have their trough above still water (90 % line +0.13 to +0.22 m): water
ahead of the crest is raised there; those make the low tail (ratio 0.5 to 0.6).

Along the reef (s at the throw), ratio at 2 / 3 / 4 s:

| s (m) | 2 s | 3 s | 4 s |
|---|---|---|---|
| 30–63 | 0.94 | 0.86 | 0.82 |
| 63–101 | 0.86 | 0.88 | 0.92 |
| 101–151 | 0.62 | 0.68 | 0.76 |

Per front (the median of each front with 5 or more points, then the median of those, 55 fronts): 0.70, 0.77, 0.82 at
2, 3, 4 s. Short fronts are lower than long ones.

## What it means for C2's hand-over [R]

- At 2 to 4 s the case, scaled from the foot crest, is 0.2 to 0.3 m taller than the sea under it, and its face is 5 to
  7° steeper. A switch there would show a step. The step is mostly a deeper trough in front of the case's crest, not a
  higher crest.
- The place is not the problem: the case's crest stands where the sea's crest stands (within about 1 m). The sea's crest
  moves a little faster (about 6.8 m/s between −4 and −2 s, the case's 6.0 m/s), so the gap in place grows with Δ.
- Ways out, for the advisor: scale the case at the hand-over from the sea's own H there (not from the foot crest), or
  blend height over a second or more, or pick the hand-over where the two agree best (2 s on the near third). Scaling
  from the sea's H would make h0 about 0.83 × smaller, so the case's clock and its throw place would move too.
- The far third (the `poolReach=long` reef) needs its own look: its sea wave is 25 to 40 % lower than the case.

## What was not run

- No T5 level-13 frames: the T5 run is still running; the case side is the committed level-10 scout track of
  `pool_straight_big` (the same scout as T5's, to the digit, per `t5-run.md`). The level-13 library only reaches −1.7 s at
  the game's scale, so it is a check at 1 and 1.5 s only.
- One configuration only (the ride address's switches), one 300 s run, CPU solver, one seed. The run is deterministic
  (two runs gave the same numbers).
- No riders, no catch reports, no browser, no GPU sea. No change to `src/`.

Rerun (from the repository's root; about 13 minutes on the M1):

```
npx rolldown docs/research/wave-strategy-alternatives/t5-sea-probe.ts -o <scratch>/t5-sea-probe.mjs --format esm --platform node
node <scratch>/t5-sea-probe.mjs --ref --until 300 --extra "&wallBody=stream&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug"
```
