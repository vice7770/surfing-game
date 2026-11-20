# The analyser's named bottom turns — the whole-input arm

`RideAnalyzer`'s bottom-turn columns taken **through the shipped feed** with the autopilot's
**whole input** reaching the rider: `trim`, `crouch`, `compress` and `rotate` as well as the
stick. Gathered 2026-11-20 with `?rideReports=8`, `?seed=N` and `&compute=gpu` in four real
browser sessions against a vite dev server, on the same four seeds and styles as
[`../steer-only/`](../steer-only/README.md), so the two arms are comparable.

The steer-only arm is kept beside this one because its figures were published. **It measured a
rider that was steered and never crouched** — the collector discarded four of the pilot's
fields. This arm is the one to quote.

Each run's own JSON records the sea it actually built (`run.sea`), read back off the host's
config: all three Canyon runs show `canyonBed: "b"`, so `?canyonWaves=true` reached the physics
rather than merely parsing.

## The two arms side by side

Canyon only (`?canyonWaves=true`, bed B, three seas: seeds 1, 2, 3; `point` is a separate
control and is never pooled with them).

| | steer-only | whole input |
| --- | --- | --- |
| autopilot attempts | 151 | 149 |
| analysed rides | 20 | 22 |
| runs the analyser measured | 13 | 17 |
| **named a bottom turn** | **3** (3 of 20 rides) | **2** (2 of 22 rides) |
| named a top turn | 7 | 9 |
| left `unjudged` | 3 | 6 |
| why unjudged | no carry ×2, path did not bend ×1 | **path did not bend ×5**, no carry ×1 |
| ride duration | n=20, median 1.94 s, range 0.00–8.40 | n=22, median **2.56 s**, range 0.50–9.93 |
| ride ends | fell ×18, kicked out ×2 | fell ×20, kicked out ×2 |

Per sea, so neither arm's total hides a single lucky run:

| run | sea / style | steer-only | whole input |
| --- | --- | --- | --- |
| `c1` | canyon seed 1, turns | 4 rides / 83 attempts / 1397 s | 6 rides / 86 attempts / 1454 s |
| `c2` | canyon seed 2, turns | 8 / 38 / 911 s | 8 / 34 / 792 s |
| `flow` | canyon seed 3, flow | 8 / 30 / 509 s | 8 / 29 / 510 s |
| `point` | point, turns — **control** | 8 / 42 / 799 s | 8 / 71 / 1445 s |

## The named bottom turns

**n = 2** in this arm, **n = 3** in the other. Both are populations, not distributions.

| column (the analyser's own) | steer-only, n=3 | whole input, n=2 |
| --- | --- | --- |
| `roll` — peak **board** roll | median 49.3°, range 40.5–54.1 | median 43.1°, range 40.0–46.1 |
| `pathYaw` — course, magnitude | median 22.2°, range 14.0–51.2 | median 26.9°, range 23.4–30.5 |
| `turn.yaw` — nose | median 39.3°, range 30.0–49.9 | median 39.0°, range 30.0–47.9 |
| `carry` — **mean** rise, 0.3 s window | median 0.050 m, range 0.041–0.050 | median **0.027 m**, range 0.015–0.038 |
| speed in, ground | median 6.52 m/s | median **7.47 m/s** |
| speed spent | median 7.1 %, range 4.5–23.4 | median **4.2 %**, range 0.5–8.0 |
| `throughWater` at release | median 5.41 m/s | median **7.13 m/s** |
| turn duration | median 0.47 s, range 0.38–0.58 | median 0.52 s, range 0.38–0.67 |
| `faceFraction` at peak | median 0.18 | median 0.07 |
| radius | median 9.42 m | median 8.32 m |
| lateral g | median 0.44 g | median **0.74 g** |
| in the pocket | 0 of 3 | 0 of 2 |

Both whole-input turns came from `c1` (canyon seed 1), one line each:

```
roll=46.1  path=30.5  carry=0.0383  6.69 -> 6.15 m/s  tw=5.94  0.67 s  face=0.09  0.56 g
roll=40.0  path=23.4  carry=0.0154  8.25 -> 8.21 m/s  tw=8.33  0.38 s  face=0.06  0.92 g
```

## What the fix changed, and what it did not

**It changed the ride.** With the crouch and Compress arriving, rides last longer (median
1.94 → 2.56 s, longest 8.40 → 9.93 s) and the analyser measures more runs (13 → 17). The turns
it does name hold far more speed through the water (5.41 → 7.13 m/s), spend less of it
(7.1 % → 4.2 %), pull harder (0.44 → 0.74 g) on a tighter radius, and sit lower on the face
(0.18 → 0.07).

**It did not rescue the bottom turn.** The count went *down*, 3 → 2, and the rejection reason
moved: `path did not bend` rose from 1 to 5 of 6 unjudged runs. A rider holding more speed and
banking hard swings its nose without bending its **travelled path** enough to pass condition 1,
so the analyser refuses to name it. And the climb got *smaller*, 0.050 → 0.027 m of mean rise.

**So the first arm's conclusion survives and is stronger.** The named bottom turns are still
short (≈0.5 s) and still cheap (4 % of ground speed, 0.027 m of mean rise), against a target
describing a turn three times longer. Twenty of 22 rides end in a fall. **The blocker is the
ride, not the classifier** — and feeding the rider its whole input made the rides longer without
making the turns bigger.

**The control sharpens it.** At the Point the whole-input rider produced **0** measured runs in
8 rides and 71 attempts, where the steer-only rider produced 2 in 8 rides and 42 attempts; its
rides are shorter and far more uniform (median 0.89 s, range 0.48–1.03, against 0.94 s,
0.32–3.27). On that spot the crouch and Compress cost the rider the long rides entirely.

## Read these before quoting any number above

1. **n = 2 named bottom turns.** Nothing here should move a constant.
2. ⛔ **`roll` is the BOARD's roll, not the rider's bank.** `RideSample.roll` is documented
   *"The board's roll, rad"* (`src/game/rideAnalysis.ts`). The rider's own bank exists live on
   `status.ride.bank` and the analyser never stores it, so **no bottom-turn number the game
   records today is a rider bank.**
3. ⛔ **`carry` is a mean rise over a 0.3 s window.** It is not a peak rise over 1.5 s and the
   two cannot be differenced. **State the window with every number.**
4. `pathYaw` is the path over the **ground**, which the analyser's own doc calls a known limit
   on a moving face.
5. The two arms differ only in the forwarded input, but they are different *runs*: the sea
   advances differently once the rider behaves differently, so a per-ride diff is not meaningful.
   Only the populations are comparable.
