# The reference wave

The [riding-the-wave spec](../superpowers/specs/2026-09-27-riding-the-wave.md) judges riding on one reference wave: the Canyon, tuned toward a long, steady peel with chest-to-head-high faces (1–1.5 m). The Practice swell was Hs 2 m, Tp 12 s: on the Canyon its faces were 2.2–2.8 m, and riders popped up straight down them, reached 11–12 m/s against a crest at 6–8 m/s, and fell in their first bottom turn (the turn-redesign plan's findings, "After the playtest").

## The sweep (2026-09-27)

`npm run report:ride -- --practice --height <Hs> --ghosts --style turns --seeds 2 --minutes 5 --spots canyon`, everything else the Practice swell (Tp 12 s, spreading s 40, band ±8 %, 10°), with the surface roller's push (riding-the-wave Task 4) and the honest ride ends (Task 2). Median and best count every ride the ride analyzer closed; speed, face height, bottom turns and peel the rides of 3 s or more.

| Hs m | Attempts | Stands | Rides ≥ 3 s | Median ride s | Best ride s | Mean speed m/s | Top m/s | Near the curl | Face height m | Peel ° |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.0 | 340 | 40 | 0 | 2.1 | 2.9 | — | — | 18 % | — | — |
| 1.2 | 351 | 44 | 6 | 2.4 | 3.6 | 6.1 | 10.4 | 17 % | 1.12 | 5 |
| 1.4 | 347 | 49 | 11 | 2.5 | 5.3 | 6.3 | 11.1 | 15 % | 1.31 | 6 |
| 2.0 (before this plan) | 335 | 25 | 3 | — | — | 8.3 | 13.0 | — | about 2.4 | — |

The 2 m row is the fall-fixes PR's run (the same command without `--height`, before the roller and the new ride ends), so its medians were not read.

Bottom turns at 1.4 m: 18 of them, 0.67 s, 56°, 2.1 rad/s peak at 6.3 m/s, 2.9 m radius, 1.17 g, 41° rail (Forsyth 2024: 0.96 s, 99°, 1.9 rad/s, 7.3 m/s, 3.8 m, 1.41 g, 42°).

## The choice

**Hs 1.4 m**: its faces average 1.31 m, inside the spec's 1–1.5 m; it gives the most stands (49) and the most rides of 3 s or more (11); its mean speed, 6.3 m/s, sits inside the spec's 6–9 m/s (Forsyth's accomplished surfers average 6.4). Smaller swells stood about as often but rode less: at 1.0 m no ride reached 3 s.

## Open

- **The peel.** The report's peel column is the simulation's peel estimate during rides: about 5–6° at every height, as at 2 m (the old report's required speed, 71.7 m/s, says the same). The rideability report puts the Canyon's peel at 55–58°. The curl the riders see (the gauge's nearest breaking crest) lies 13–25 m along the crest from them. Which measure describes the Canyon's waves, and whether the reference wave peels as the spec asks, is for the validation (riding-the-wave Task 7).

## The other spots

The Practice swell is shared by every spot. `npm run report:catch -- --practice --ghosts --seeds 1 --minutes 2`, the catch report's 30 ghost bots riding straight in, on this plan's code (the roller and the new ride ends), at the old and the new height:

| Spot | Cue lit 2 m → 1.4 m | Stood | Rides ≥ 3 s | Median ride s | Longest s |
|---|---:|---:|---:|---:|---:|
| Beach | 1 → 46 | 0 → 36 | 0 → 8 | — → 2.1 | — → 7.6 |
| Point | 92 → 116 | 19 → 55 | 3 → 13 | 1.1 → 1.5 | 4.5 → 7.6 |
| Reef | 25 → 33 | 8 → 9 | 0 → 0 | 0.9 → 0.6 | 1.6 → 1.9 |
| Canyon | 44 → 65 | 38 → 63 | 30 → 33 | 6.7 → 3.1 | 9.4 → 9.9 |

Every spot catches and stands more at 1.4 m, the Beach and the Point most. The Canyon's straight-in rides are shorter at the median (the smaller whitewater carries less far) but as long at best. One Practice swell stays for every spot.

