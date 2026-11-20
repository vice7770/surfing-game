# Carve flex: the legs bend with a standing turn (2026-11-10)

Opt-in: `?carveFlex=on`. Default off; with the switch off the game is the same, bit for bit. Online rooms stay on the
default. Nothing here was ridden: the owner rides (Canyon, `?canyonWaves=true&carveFlex=on`).

## The short answer

- **What it does.** On a standing turn made with the stick alone, the rider's knees now sink as the turn's load comes
  on and stand back up as the board rolls flat. Before, the legs never bent: the pelvis stayed 0.76–0.78 m over the
  deck all the way round.
- **How far.** A full-stick turn takes the pelvis down by 0.09–0.12 m (0.78 → 0.66–0.69 m); drawn knees go from
  about 125–140° to about 90–115° (180° is a straight leg). Half stick: 0.02–0.06 m. Compress is still 0.30 m.
- **What it does not do.** It does not make turns better or worse to ride. Lean, radius, speed kept and the time a
  held turn lasts are all within a few percent of today. **A standing rider still cannot finish a turn pair: 0 of 16,
  switch off or on.** A lower body alone is not the missing piece.
- **One cost.** Letting the stick go after a hard turn on flat water, 7 of 45 riders fall with the flex against 5 of
  45 without. Small, but it is worse, not better.

## The rule as built

All of it is in `src/physics/AttachedRider.ts` (`CARVE_FLEX`, `carveFlex()`, three lines in `prepareLeg`).

1. **The cause is the legs.** The flex moves the leg's own rest length, the same one Crouch and Compress move. The
   only force is the leg spring's, and the board gets the equal and opposite push through the feet: unloaded while the
   body sinks, pressed while the legs push back up. No new force, no moment, no brake.
2. **The driver is the turn's real load.** The load along the leg over the rider's weight (1 in trim; 1 / cos lean in
   a steady turn). The flex is full at the load a full stick's lean carries (1 / cos 50° = 1.56 body weights).
3. **The stick is the intent.** The flex is never more than the stick's share: no stick, no flex; half stick, half at
   most.
4. **Stick let go mid-turn.** The legs sink no further and stand up as the board rolls flat under them (bank over
   50°). Two other ways were measured and dropped, see "Letting go" below.
5. **Speed.** Down no faster than the body falls onto the legs (as Compress); up no faster than the stance's spring
   can catch the body (`projectionCatch`, 0.40–0.57 m/s; commit f468fab3).
6. **Compress and Crouch.** The legs take the deepest of Crouch, Compress and the flex. Compress from a flexed turn
   carries on down from where the legs are.

One new constant:

| Constant | Value | Why |
| --- | --- | --- |
| `CARVE_FLEX` | 0.4 of `CROUCH_DEPTH` = 0.12 m | The deep end of the surf stance's half-squat: knees flexed 30–80° (Borgonovo-Santos et al. 2021), de Sousa 2022's preparation with knees at 90–110°. The stance map reads the pumping crouch (0.117 m) at knees 102–104°. River-wave turns peak at 45–51° of knee flexion (Weiss et al. 2025), inside it. |

Reused, not changed: `RAIL_RANGE` (50°, the full stick's lean), `CROUCH_DEPTH` (0.3 m), `STEER_DEADBAND`. No stance
map target moved. `CARVE_CARRY`, `COMPRESS_PULL` and every default are untouched.

## 1. Stick-only carves, switch off → on

Full stick, held 3 s. Pelvis is its height over the deck at the lowest point of the turn. Knees are the drawn
front/rear knee angles there. `*` = the rider did not reach 90° of turn. Toe and heel are the same on flat water.

| Run | Pelvis m | Leg rest m | Drawn knees F/R | Lean ° | Radius m | Speed kept at 90° | Falls at s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Flat 6 m/s | 0.69 → 0.68 | 0 → −0.021 | 76/138 → 74/134 | 22 → 22 | 4.3* → 4.4* | – | 2.87 → 2.87 |
| Flat 8 m/s | 0.76 → 0.67 | 0 → −0.091 | 106/142 → 90/117 | 45 → 46 | 5.7 → 5.6 | 0.64 → 0.60 | 2.63 → 2.67 |
| Flat 11 m/s | 0.78 → 0.69 | 0 → −0.094 | 123/131 → 98/112 | 50 → 49 | 10.0* → 9.7 | – → 0.64 | 2.77 → 2.83 |
| Canyon 6 toe | 0.78 → 0.73 | 0 → −0.046 | 132/125 → 115/124 | 36 → 35 | 11.1* → 11.4* | – | 1.87 → 1.85 |
| Canyon 6 heel | 0.78 → 0.66 | 0 → −0.117 | 165/136 → 100/108 | 49 → 48 | 7.5 → 7.5 | 1.16 → 1.15 | 2.88 → 2.90 |
| Canyon 8 toe | 0.78 → 0.69 | 0 → −0.093 | 130/129 → 102/112 | 43 → 43 | 13.2* → 13.2* | – | 2.00 → 2.00 |
| Canyon 8 heel | 0.78 → 0.66 | 0 → −0.119 | 127/156 → 96/111 | 50 → 48 | 8.9 → 8.7 | 0.83 → 0.81 | 2.80 → 2.95 |
| Canyon 11 toe | 0.77 → 0.69 | 0 → −0.085 | 111/127 → 97/109 | 48 → 47 | 13.8* → 13.6* | – | 2.42 → 2.38 |
| Canyon 11 heel | 0.78 → 0.67 | 0 → −0.111 | 140/154 → 98/113 | 51 → 50 | 11.4 → 11.3 | 0.65 → 0.64 | 3.07 → 3.05 |

Largest arc: 123–149° → 130–152° on the runs that turn; no run changes from "falls" to "rides" or back.

Half stick: the legs come down 0.02–0.03 m on flat water and 0.02–0.06 m on the wave; knees change by a few degrees.
The same runs ride (flat 11, all three Canyon heel runs) and the same runs fall, within 0.03 s.

At 6 m/s on flat water the turn never loads the legs (the rider stalls at 22° of lean), so there is almost no flex.
That is the rule working: the bend follows the load, not the stick.

## 2. The standing turn pair (16 runs each)

| Rider | Leg drive | Top turn begun, off → on | One pair, off → on | Two pairs |
| --- | --- | --- | --- | --- |
| Compress down, stands to climb | off | 10 → 12 | 0 → 0 | 0 → 0 |
| Compress down, stands to climb | on | 14 → 12 | 0 → 0 | 0 → 0 |
| Standing all the way | off | 14 → 14 | 0 → 0 | 0 → 0 |
| Standing all the way | on | 8 → 10 | 0 → 0 | 0 → 0 |
| Compress held | off | 15 → 15 | 14 → 14 | 6 → 6 |
| Compress held | on | 16 → 16 | 5 → 5 | 3 → 3 |

Failures are where they were: sudden falls in the down turn or just after it (12–14 of 16). With the leg drive on and
standing all the way, 8 "other falls in the climb" become 4 sudden + 2 other. The Compress-held rows are identical
(Compress is deeper than the flex, so the flex never acts).

**So: no, a lower body does not let the standing rider exit a turn.** 0.1 m of knee bend is not what separates the
standing rider from the Compress rider.

## 3. Trim and Compress carves

- Trim with no stick, flat and Canyon, 6/8/11 m/s: the probe's output files are byte-identical off and on.
- Compress carves, flat and Canyon, 6/8/11 m/s, both sides: byte-identical off and on.

## 4. With `?legDrive=on` as well

Stick-only carves, trim and Compress carves give the same numbers as with the leg drive off (the leg drive acts at a
rail change, and these runs have none). The pair table above has both. Exits: 5 → 7 of 45, the same as without it.

## Letting go (the one place it is worse)

45 flat-water runs: 7–11 m/s, stick 0.5 / 0.7 / 1, held 0.7 / 1.0 / 1.3 s, then released, 1.5 s to recover.

| Legs after the stick is let go | Falls of 45 |
| --- | --- |
| Switch off (straight legs) | 5 |
| Stand up at once | 27 |
| Stand up as the load eases | 15 |
| **Stand up as the board rolls flat (built)** | **7** |
| Never stand up (not a rule, a check) | 6 |

Standing up while the board is still banked throws the slowed rider back into its old lean. The built rule waits for
the board. It still loses three full-stick runs held 1.0 s (7, 8, 9 m/s) and wins one back (10 m/s held 1.3 s).

## What the player will see

- Turn with the stick only: the knees bend into the turn and the body rides visibly lower through its loaded part,
  then stands up as the board comes flat. More at speed and on a face, almost nothing in a slow, weak turn.
- Trim, paddling, Compress turns, snaps: no change.
- The turn itself feels the same. The same turns still fall at the same time.

## What is still off

- A held full-stick standing turn still falls after 1.9–3.1 s, flex or not.
- The standing rider still cannot link two turns.
- After the stick is let go the board stays banked 15–25° for over a second (today's behaviour), so the legs stay
  partly bent that long too. It may look slow to stand up.
- Slightly more falls on a hard exit (7 vs 5 of 45).
- The front knee already folded to 57–76° at 6 m/s on flat water before this change (the body falling over its front
  leg in a stall). The flex does not fix that.

## Unverified

- Nothing was ridden or looked at on screen. Knee angles are the drawn rig's numbers from the probe, not a picture.
- Only flat water and the analytic Canyon-matched test wave. No real sea, no Wave Pool.
- Goofy stance and the snap were not probed with the flex (unit tests cover both steer sides).
- Whether 0.12 m reads right to the eye is the owner's call; it is one constant.

## Files

- `run.sh.txt`: runs everything here (`sh docs/research/carve-flex-2026-11-10/run.sh.txt <out-dir>`).
- `results.txt`: its full output.
- `turnbody.test.ts.txt`: the turning-body probe, with a `STICK` setting. `exit.test.ts.txt`: the letting-go probe.
- `carvesum.py.txt`: the table maker. The pair probe is `docs/research/turn-pair-2026-11-10/`.
- Tests: `src/physics/carveFlex.test.ts`, and the switch in `src/game/PhysicalMode.test.ts`.
