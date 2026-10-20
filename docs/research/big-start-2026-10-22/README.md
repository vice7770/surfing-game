# Canyon Big: a start where the faces become catchable (2026-10-22)

The owner approved this on 2026-10-22 ("Build it now"). The waves are unchanged: no bed, swell or solver change, only
where the rider starts.

## The problem

The catch diagnosis found that at Big the rider started 11 m seaward of the take-off, 4.40 m deep. There the faces of
the bigger waves were only 14° (seed 1) and 8° (seed 2). From rest, the board was picked up only 2–2.5 m ahead of the
crest, 90–93 % up the face. The rider popped up on the crest, the wave passed and the rider fell over the back
("balance"). A rider already paddling at the take-off dropped in.

## The rule and what changed

The start sits where the incoming faces become catchable, but stays seaward of where one wave in ten starts breaking
(the owner's 2026-10-11 rule: don't start on top of the breaking). "Catchable" means the highest third of the waves
passing a point have fronts of about 17°: each wave's steepest front slope over 1 m on the surface the rider feels,
taking the median over that third.

`rideLineupOffset(config)` (`src/wave/SurfZoneSimulation.ts`) gives the start, in metres seaward of the take-off. Its
`CANYON_RIDE_LINEUP` table is linear between the sizes and held beyond them.

| Canyon size | Start before | Start now |
| --- | --- | --- |
| Small (Hs 0.9 m, 9 s) | 11 m, 2.48 m deep | 11 m (unchanged) |
| Medium (Hs 1.4 m, 11 s) | 11 m, 3.15 m deep | 11 m (unchanged; see below) |
| Big (Hs 2.4 m, 14 s) | 11 m, 4.40 m deep | **0 m: the take-off, 4.03 m deep** |

- Every other spot keeps 11 m.
- Relaunches use the same start.
- Online, spawns run from the start out 24 m further (11–35 m elsewhere, as before; 0–24 m at Canyon Big). The first
  online spawn lies 4–19 m beyond the start.
- `?startOut=<m>` overrides the start at any spot (`SurfZoneConfig.startOut`). `?startOut=11` is Big's old start.

## Measured (no rider)

- Probe: `transect-probe.ts` and `analyze.mjs`; full output in `results.txt`.
- Seeds: 1 and 2, 12 peak periods each.
- Sea: stage 2 on the CPU, s = 150, square, mid tide, calm.
- Sampled: the take-off's column (x = −30), every 1 m from 30 m seaward of the take-off to 40 m inside it.
- Onsets: each wave's most seaward onset within x ± 4 m.
- Slopes are given at the point, then within ±3 m of it, both pooled over the 2 seeds.

| | Small | Medium | Big |
| --- | --- | --- | --- |
| Top-third front, 11 m out | 12.5° / 14.1° | 7.4° / 8.3° | 12.3° / 13.0° (seeds 14°, 10°) |
| Top-third front, at the take-off | 16.7° / 17.3° | 11.9° / 13.5° | 15.3° / 16.1° (seeds 17°, 12°) |
| First reaches 17° (seed 1, seed 2) | 2–5 m seaward (−1, −4) | 2 m inside (+11, −2) | 6–12 m inside (+1, +18) |
| One wave in ten starts breaking | 10.5 m seaward | 0.5 m seaward | 4 m inside |
| Waves breaking seaward of the take-off | 4 of 15 | 2 of 19 | 1 of 23 |
| Median break | 16.5 m inside | 29.5 m inside | 41 m inside (2.53 m deep) |

What the numbers mean for each size:

- **Big.** The faces reach 17° only inside the take-off, where the sets start breaking. The rule therefore puts Big's
  start at its take-off, 11 m further in than before. That is still 41 m seaward of its median break.
- **Medium.** The same rule would also start Medium at its take-off: its faces are only 7–8° at the 11 m start.
  As the brief asked, this is reported, not changed. Medium keeps 11 m (the owner on 2026-10-12: "fine for now").
- **Small.** One wave in ten starts breaking 10.5 m seaward of the take-off, so the rule keeps Small's 11 m.

## Two scripted catches at Big from the new start

The script is `catch-check.ts`. Both catches use seed 1 and the same set wave the diagnosis rode from 11 m out (2.8 m
at the take-off; its crest reaches the take-off at 71 s). In each, the rider paddles straight in and pops up at the cue.
Neither rider pushes on the water.

| Catch | Picked up (0.8 c) | After the pop-up |
| --- | --- | --- |
| From rest | 88 % up a 2.9 m face, 2.4 m ahead of the crest, 16° under the board | Dropped to the bottom of the face, 12.5 m/s, still standing 5 s later |
| Already paddling (1.6 m/s) | 85 % up, 2.7 m ahead, 18° under the board | Dropped in, 12.3 m/s, standing |

The diagnosis's catch from rest at 11 m out was picked up 90–93 % up. The new pickup is only a little lower. What
changed is the face it happens on: 16–19° rather than 14–15°, so the rider drops in instead of being left on the
crest. This is one wave on the steeper seed. Seed 2's faces are gentler: 12–13° at the take-off.

## What to ride

Ride the Canyon at Big, mid tide, calm, several sets each way:

1. The default start: at the take-off.
2. `?startOut=11`: today's start, for comparison.

Watch for two things:

- Whether the wave picks you up and you drop in, or leaves you on the crest.
- Whether sets break on top of you before you can paddle. One wave in 23 broke seaward of the new start.

Optionally, ride Medium with `?startOut=0` to try the start the same rule would give it.
