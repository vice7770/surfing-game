# Snap's driving legs (`?snapLegs=drive`), 2026-11-10

Opt-in, default off. Nothing was ridden or seen on screen: every number here is from scripted probes on flat water
and on the analytic test wave matched to Canyon B (`MATCH=canyon`: arm 1.4 m, 16°, 5.7 m/s). The owner rides and judges.

## What was wrong

Under Snap the legs went to Compress's full depth (rest length −0.30 m) and stayed there for as long as Snap was
held. The turning-body study (`../turn-body-2026-11-10/`) measured the result on the drawn rig: knees 52–104° through
the whole cutback, pelvis at 0.52 m, against its targets of 100–130° front / 110–140° rear. The stance map's snap row
(de Sousa 2022) says the surfer goes in low and is "extending through the snap"; ours never extended.

## The rule as built

`src/physics/AttachedRider.ts`, `snapLoad()` called from `prepareLeg`. It changes one thing: the leg's rest length
while Snap is held. The leg's spring does the rest, so the board gets the equal and opposite force through the feet.
No other force, moment or brake was added.

- **Load.** Snap begins at its own depth exactly as today (0.30 m, or 0.45 m with `?snapDepth=deep`).
- **Cause of the extension.** The surfer pushes the board round with the legs. So the legs go out as the board
  comes round, and only then.
- **Driver.** The board's heading. The rule remembers the furthest the heading got the old way (against the stick)
  since Snap began or the stick changed side, and measures how far it has come back round the stick's way from there.
  It is a ratchet: it never goes back down while Snap is held on the same side.
- **Amount.** `depth = snapDepth − stick × driven × (snapDepth − SNAP_DRIVE_DEPTH)`, where `driven` runs 0 → 1 over
  `SNAP_DRIVE_TURN` of heading. Stick is the stick's size (0–1), so half a stick gives half the move and no stick
  gives none (Snap's old hold, bit for bit).
- **Speed.** The legs already lengthen no faster than the stance's spring can catch the body
  (`projectionCatch`, 0.40–0.57 m/s); the drive rides that existing limit. No new rate.
- **Release.** Letting go of Snap is unchanged (the stance returns as today); the drive's memory clears.

| constant | value | where it comes from |
| --- | --- | --- |
| `SNAP_DRIVE_DEPTH` | `CARVE_FLEX` = 0.4 of the crouch, 0.12 m | The depth a loaded standing turn already holds (`?carveFlex=on`, commit 871dada1). The legs drive out to a turning stance, not to straight legs. Measured against 0 and 0.2 below. |
| `SNAP_DRIVE_TURN` | `TWIST_RANGE` = 45° | The Snap's own twist range: the board has come round as far as the body was wound. Measured against 90° below. |

## Before → after

Means over 24 runs a row: 6 speeds (6–11 m/s) × both sides × flat and the Canyon-matched wave. Knees are the drawn
rig's, front/rear, degrees. "old s" is the time the board still turns the old way after Snap. "kept" is speed out /
speed in. Full per-run tables and every row: `results.txt`.

| script | switch | knees mid | knees exit | pelvis mid / exit (m) | roll new rail | peak yaw °/s | old s | turned ° | kept | v out | falls in hold | falls in all | to fall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1. cutback from a Compress carve | off | 79/64 | 75/65 | 0.52 / 0.52 | 28 | 112 | 0.41 | 55 | 0.46 | 4.2 | 7 | 21 | 1.99 |
| | on | 86/76 | 87/82 | 0.60 / 0.64 | 31 | 126 | 0.41 | 55 | 0.51 | 4.6 | 7 | 22 | 1.89 |
| 2. Snap from a stick-only carve | off | 72/77 | 65/78 | 0.51 / 0.51 | 29 | 177 | 0.51 | 68 | 0.35 | 2.8 | 15 | 21 | 1.47 |
| | on | 71/82 | 78/93 | 0.53 / 0.60 | 33 | 192 | 0.51 | 66 | 0.44 | 3.5 | 14 | 21 | 1.35 |
| 3. cutback, half stick | off | 77/72 | 72/67 | 0.53 / 0.52 | 13 | 100 | 0.37 | 28 | 0.48 | 4.5 | 6 | 12 | 2.24 |
| | on | 78/72 | 74/72 | 0.53 / 0.56 | 13 | 102 | 0.37 | 28 | 0.49 | 4.5 | 6 | 12 | 2.24 |
| Snap with the stick from trim | off | 86/54 | 81/58 | 0.52 / 0.53 | 42 | 117 | 0.09 | 67 | 0.60 | 5.1 | 4 | 23 | 1.94 |
| | on | 99/69 | 105/80 | 0.63 / 0.69 | 48 | 123 | 0.09 | 78 | 0.66 | 5.5 | 4 | 24 | 1.89 |

In one run (flat, 8.5 m/s, in the unit test): the rest length holds −0.30 m for 0.5 s while the board still turns the
old way, then goes −0.30 → −0.13 m over about 0.8 s as the board comes round. The leg's force in the first 0.15 s of
the push is higher than with the switch off (817–828 N against 662–697 N at the same moments): the board is pressed.

**4. Guards.** With the switch on and no Snap held, trim, a Compress carve and a stick-only carve are byte-identical
to the switch off, on flat water and on the wave, at 6, 8 and 11 m/s; the same with `?legDrive=on` and
`?carveFlex=on` both on (12 file compares, all identical; end of `results.txt`).

## With the other Snap switches (same 24 runs, cutback / stick-only cutback)

| with | switch | pelvis exit | peak yaw | turned | kept | falls in hold | falls in all | to fall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `snapDepth=deep` | off | 0.41 / 0.43 | 122 / 153 | 55 / 57 | 0.41 / 0.33 | 4 / 15 | 16 / 21 | 2.20 / 1.36 |
| | on | 0.62 / 0.55 | 102 / 172 | 47 / 60 | 0.49 / 0.43 | 4 / 17 | 20 / 20 | 2.08 / 1.28 |
| `snapStamp=on` | off | 0.54 / 0.54 | 96 / 171 | 50 / 55 | 0.45 / 0.29 | 7 / 12 | 21 / 21 | 1.95 / 1.42 |
| | on | 0.65 / 0.63 | 111 / 177 | 46 / 53 | 0.45 / 0.31 | 8 / 12 | 22 / 21 | 1.81 / 1.39 |
| `snapPivot=lean` | off | 0.53 / 0.51 | 138 / 170 | 71 / 76 | 0.43 / 0.32 | 7 / 13 | 22 / 21 | 1.75 / 1.47 |
| | on | 0.65 / 0.60 | 162 / 189 | 71 / 71 | 0.53 / 0.43 | 8 / 13 | 22 / 21 | 1.56 / 1.37 |
| `agile=on` | off | 0.52 / 0.52 | 150 / 177 | 52 / 76 | 0.44 / 0.32 | 9 / 9 | 21 / 21 | 1.72 / 1.59 |
| | on | 0.62 / 0.63 | 163 / 183 | 50 / 78 | 0.50 / 0.38 | 8 / 11 | 22 / 21 | 1.59 / 1.55 |
| `legDrive=on` + `carveFlex=on` | off | 0.52 / 0.51 | 110 / 168 | 52 / 73 | 0.52 / 0.35 | 6 / 11 | 19 / 22 | 2.13 / 1.55 |
| | on | 0.63 / 0.62 | 120 / 182 | 49 / 66 | 0.59 / 0.45 | 7 / 15 | 21 / 22 | 1.98 / 1.41 |

The switch works with every one of them (the legs go out, nothing breaks, no yield was built). `snapRecentre`,
`snapUpturn`, `snapQuick` and `snapDepth` do not touch the leg's rest length under Snap and are unaffected.

## What is worse (honest)

- **Falls come a little sooner.** Mean time to fall drops by about 0.1 s in every pairing (1.99 → 1.89 s, 1.47 →
  1.35 s). The number of falls while Snap is held is the same (7 → 7, 15 → 14), and over the whole run it is 21 → 22
  and 21 → 21. One Canyon run that rode out with the switch off (11 m/s, heel side) falls 2.8 s after Snap with it on.
- **With `snapDepth=deep` the cutback is worse to ride.** Deep's own gain (16 falls of 24 instead of 21) is lost
  (20), the board turns less (55° → 47°) and peak yaw drops (122 → 102 °/s). Deep and drive should not be combined
  until someone rides it; alone, each is fine.
- **With `legDrive` + `carveFlex`, the stick-only cutback** has more falls while Snap is held (11 → 15) and turns
  less (73° → 66°).
- **With `snapStamp=on`** the cutback turns a little less (50° → 46°).
- The 0.3–0.5 s in which the board "turns the old way first" is **unchanged** (0.41 s, 0.51 s). The legs do not fix it.

## What is still off

- **Knees are still short of the study's targets** (100–130° / 110–140°), most of all on the heel side (85/75° at a
  pelvis height of 0.68 m). The drawn Snap pose sets them more than the leg's length does: with the legs fully out
  (depth 0) heel-side knees still read about 90/82°. That is a rig matter, not a physics one.
- **From trim the load is cut short.** The board turns the stick's way almost at once (0.09 s), so the drive starts
  before the legs have reached Snap's depth: the lowest rest length is −0.22 to −0.25 m, not −0.30 m. The sink is
  shallower than in a cutback.
- On flat water and across a face Snap has no target, so the body's twist never unwinds; the body stays wound while
  the legs go out.
- Nearly every scripted run still ends in a fall (21 of 24), switch on or off. This change does not address that.

## Dropped, with numbers (cutback / stick-only cutback, same 24 runs)

| tried | pelvis exit | peak yaw | kept | falls in hold | to fall s | why dropped |
| --- | --- | --- | --- | --- | --- | --- |
| **built: heading, 45°, to 0.12 m** | 0.64 / 0.60 | 126 / 192 | 0.51 / 0.44 | 7 / 14 | 1.89 / 1.35 | |
| heading over 90° | 0.60 / 0.58 | 119 / 186 | 0.49 / 0.40 | 7 / 15 | 1.93 / 1.38 | Half the runs never turn 90°, so the legs stop half way. |
| heading, out to straight legs (depth 0) | 0.72 / 0.67 | 128 / 196 | 0.51 / 0.45 | 7 / 14 | 1.91 / 1.35 | Rides the same; ends standing tall in a turn, above the carve's own stance. |
| heading, to 0.2 of the crouch | 0.67 / 0.64 | 129 / 195 | 0.52 / 0.45 | 7 / 16 | 1.86 / 1.33 | No gain; two more falls in the stick-only cutback. |
| a bare timer (0.4 s from the rail change) | 0.64 / 0.58 | 131 / 181 | 0.51 / 0.40 | 7 / 15 | 1.86 / 1.44 | A clock, not a cause; no better. |
| the body's twist unwinding | 0.53 / 0.52 | 117 / 180 | 0.46 / 0.36 | 7 / 15 | 1.96 / 1.44 | The twist does not unwind without a Snap target, so the legs never move. |
| the body's lean coming over, 50° | 0.66 / 0.62 | 129 / 207 | 0.51 / 0.41 | 8 / 13 | 1.83 / 1.48 | Close to the built rule; lean is how far the body fell in, not how far the board came round. |
| lean coming over, 90° | 0.64 / 0.59 | 126 / 201 | 0.47 / 0.38 | 7 / 14 | 1.87 / 1.51 | Same, weaker. |

## Surprises

- The move changes the look a lot (pelvis +0.08 to +0.16 m) and the ride very little. Speed kept through the turn
  goes up (0.46 → 0.51, 0.35 → 0.44), heading turned does not.
- On flat water at 10–11 m/s "mid-turn" and "exit" are the same frame: the board comes round so slowly (73–89 °/s)
  that Snap ends before it is round.
- The Canyon toe-side cutback at 6 m/s falls 0.3 s after Snap either way, before any drive can begin.
- Small changes flip single runs between riding and falling (the 11 m/s heel run above rides again at depth 0).
  The fall counts are the same within that noise.

## Files

- `turnbody.test.ts.txt`: the probe (copy to `src/physics/zz-turnbody.test.ts`; physics plus the drawn rig).
- `run.sh.txt`: the whole matrix. `snapsum.py.txt`, `agg.py.txt`: the tables.
- `results.txt`: raw output of `run.sh.txt` on this commit.
- Unit tests: `src/physics/snapLegs.test.ts`.
