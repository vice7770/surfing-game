# The leg drive: the rail change's righting push through the legs (2026-11-10)

Opt-in, `?legDrive=on` (`AttachedRiderOptions.legDrive: 'on'`). Default behaviour is unchanged; online rooms run the default.

## The idea

`LEAN_OUT_PULL` rights a body that still leans the old way at a rail change by pushing its centre of mass from outside:
a force with no reaction. The replacement is the same push made by the legs against the board. Under the same gate
(the board planes, the rider steers, the body still leans the other way by more than 2°), the body is pushed toward the
new rail, level and across the board's path, and the board takes the equal and opposite push at the back foot. With
the switch on the lean-out pull is off (never both), and the push no longer needs Compress: a standing rider has it
too, with less reach. `COMPRESS_PULL` and `CARVE_CARRY` are untouched.

Three bounds, all from the limbs:

| Bound | Figure | Where it comes from |
| --- | --- | --- |
| Strength | 0.35 of body weight, scaled by the steer | `LEG_SIDE_STRENGTH`, the figure the agile legs already use for one leg's push sideways (hip abduction and adduction, Bohannon 1997). One leg, because the reaction is at the back foot. |
| Grip | 0.9 × the back foot's own load | `FOOT_FRICTION` and the contact's front share. Not in the brief, added because it is needed (see the surprises). |
| Reach | sqrt(straight² − pelvis²) | Below. |

## Is the idea right against the code?

Partly. Three things to know.

1. **Linear momentum: right.** The pair adds nothing to rider plus board (a test reads this off the solve's right-hand
   side). The yaw from pushing behind the board's centre is part of the pair, as asked.
2. **Angular momentum: not closed.** Two equal and opposite forces on different lines are a couple: the push times the
   body's height over the back foot. At 0.35 of body weight that is about 250 N × 0.85 m ≈ 210 N·m (estimate), which is
   what a real body takes at the hips, turning the trunk the other way. The model's rider is a point mass on one leg, so
   nothing takes it. It is the same size as the hips' swing torque the model already allows (200 N·m), which is one more
   reason to keep the strength at 0.35 and not at a body weight (about 610 N·m). A faithful version needs a body part to
   carry the couple (the agile legs' finding: couples need body rotors).
3. **A leg cannot push across itself by extending.** A leg's extension acts along the leg, and with the body leaning the
   old way that line points further the old way. A push across the leg is hip abduction. So the right strength is the
   hip's 0.35, not the leg press's body weight and more.

## Overlap with earlier work

Not a repeat of a measured failure.

- **Angulation study (PR #83).** It closed rail grip along the beam and found that only the fins take a push along the
  deck. The leg drive does not ask the rail for grip; its reaction lands at the back foot, over the fins, which is where
  that study says a sideways push can be taken.
- **Agile legs stage 1 (PR #219).** Its couples were zero-net pairs between the two feet, turning the hips and the
  trunk; none pushed the centre of mass. It warned that a sideways push at the back foot alone turns nothing (the fins
  sit under that foot) and that a board skidding over 200°/s throws the point-mass rider. Both held here: the board
  yawed only 5–9° during the push and its yaw rate stayed under 125°/s.
- **Do-not-retry list (face-hold).** None of its items is this lever: the lean reference, the lean cap, the balance
  gains, the ankle's rest and the feet's roll are all left as they are, and there is no added yaw moment or brake.

## Reach

The physics has the pelvis height: 0.78 m over the deck in the riding stance (`riderPosture`), moved by the leg's
extension (Compress lowers it by up to 0.3 m). The straight leg is that stance height plus `LEG_EXTENSION`, the travel
the model already gives the leg before it is straight: 0.88 m. No new tunable.

| Pelvis height | Reach |
| --- | --- |
| 0.88 m (leg straight) | 0 |
| 0.78 m (standing) | 0.41 m |
| 0.48 m (Compress's crouch) | 0.74 m |

Used reach is how far the back foot has gone from under the body, against the push, since the push began. The push ends
when it reaches the reach, and it starts again only at the next rail change.

In practice the reach bound rarely decides anything: lifting it changed no count on the medium arm rows.

## Results

`MATCH=canyon START=trim AT=0.75 SPEEDS=0,1.5`. Sudden / stall / stay, counts as measured. Sudden: bank at least 45° at
the fall. Stall: balance fall within 20° of upright under 2.5 m/s.

### The bar (arm rows, H 1.4 and 1.95)

| Row | Today | Leg drive on | Bar | |
| --- | --- | --- | --- | --- |
| Medium `compress` (16) | 2 / 7 / 7 | 4 / 0 / 12 | sudden at most 4 | met, at the limit |
| Medium `steer` (16) | 14 / 0 / 2 | 11 / 1 / 4 | report | |
| Medium `release` (16) | 8 / 8 / 0 | 8 / 8 / 0 | | unchanged, no steer at the top |
| Mild `steer` (8) | 2 / 2 / 4 | 0 / 4 / 4 | sudden at most 2 | met |
| Mild `release` (8) | 0 / 4 / 4 | 0 / 4 / 4 | sudden 0 | met |
| Mild `compress` (8) | 0 / 8 / 0 | 0 / 5 / 3 | | |
| Untouched, all five waves (10) | 0 falls | 0 falls | 0 of 10 | met |

The climb (`topFrom`): 65–66° and 81–82° with the drive, against 66–67° and 81–83° today: one degree less on the rows
that steer, because the gate also opens for a moment as the climb begins.

Compress falls suddenly twice more than today (4 against 2) and stalls seven times fewer (0 against 7): 12 of 16 stay
on against 7.

### Bowl and Big rows, medium

| Row | Today | Leg drive on |
| --- | --- | --- |
| Bowl `compress` (8) | 2 / 4 / 2 | 4 / 0 / 4 |
| Bowl `steer` (8) | 8 / 0 / 0 | 7 / 0 / 1 |
| Bowl `release` (8) | 8 / 0 / 0 | 8 / 0 / 0 |
| Big `compress` (16) | 11 / 3 / 2 | 9 / 0 / 7 |
| Big `steer` (16) | 16 / 0 / 0 | 16 / 0 / 0 |
| Big `release` (16) | 16 / 0 / 0 | 16 / 0 / 0 |

### Strength, grip and reach (arm rows, medium, 16 each)

Run with scratch knobs that are not in the shipped source.

| Variant | `compress` | `steer` |
| --- | --- | --- |
| Strength 0 (Compress without lean-out) | 6 / 0 / 10 | 14 / 0 / 2 |
| 0.35 (shipped) | 4 / 0 / 12 | 11 / 1 / 4 |
| 0.7 | 4 / 0 / 12 | 11 / 2 / 3 |
| 1.0 | 4 / 0 / 12 | 11 / 2 / 3 |
| 1.5 | 4 / 0 / 12 | 11 / 2 / 3 |
| 1.0, no reach limit | 4 / 0 / 12 | 11 / 2 / 3 |
| 1.0, no grip limit | 16 of 16 fall | 16 of 16 fall |

Above 0.7 the grip is the bound, so more strength changes nothing. Without the grip bound every rider is thrown within
0.2 s: a body weight on the tail of a light board with an unloaded foot shoots the board out from under the rider.

### With the other two rule forces off (arm rows, medium `compress`, 16, strength 0.35)

| | sudden / stall / stay |
| --- | --- |
| Leg drive, pull and carry on (shipped) | 4 / 0 / 12 |
| `COMPRESS_PULL` off | 4 / 3 / 9 |
| `CARVE_CARRY` off | 5 / 3 / 8 |
| Both off | 7 / 1 / 8 |

### The push itself (steer 1, climb 65°, wave +0; one run each)

| Run | Push | Force | Bank | Peak bank rate | Used reach | Board yaw rate | Board yawed in the push | Speed, start → least |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `compress`, H 1.4 | 0.51 s | 0.35 | −38° → −3° | 138°/s | 0.41 m of 0.41–0.72 | −66 to +106°/s | 9° the old way | 7.7 → 6.9 m/s |
| `compress`, H 1.95 | 0.50 s | 0.35 | −39° → −2° | 144°/s | 0.46 m of 0.41–0.71 | −86 to +125°/s | 5° the old way | 9.0 → 8.3 m/s |
| `steer`, H 1.4 | 0.68 s | 0.18–0.35 | −38° → −54°, falls | 15°/s | 0.00 m of 0.41 | −47 to +30°/s | 4° the old way | 7.7 → 5.1 m/s |
| `steer`, H 1.95 | 0.95 s | 0.22–0.35 | −39° → −59°, falls | 52°/s | 0.10 m of 0.41 | −58 to +168°/s | 6° the new way | 9.0 → 4.5 m/s |

Force in body weights. For comparison, the lean-out pull (a full body weight) righted the same Compress run in 0.5 s at
8.7 m/s.

- **Tail slide.** Not measured on its own. The used reach (0.41–0.46 m) is the feet's travel against the body, most of
  it the body coming upright over them. The board's net yaw of 5–9° puts the tail's own swing about its centre near
  0.1 m (estimate). The tail does not slide out as a snap's does: the fins under the back foot hold it.
- **Speed kept.** Compress riders who come round: 7.1–10.1 m/s at the top with the drive, 6.9–9.4 today.
- **Standing.** 0.35 of body weight does not right a standing rider from 38°: the body keeps falling into the face.
  The three more who stay on (4 against 2) come from shallower leans.

## What the drawing shows

Nothing new yet. The rig draws the body coming upright over the feet, as it does with the lean-out pull, and the board's
small yaw. The model keeps the pelvis on the line from the stance's middle, so there is no pelvis offset or longer back
leg to draw. `AttachedRider.legPush` exposes the push, the back foot, the used reach and the reach; the rig would need to
move the pelvis off the feet's line by the used reach, toward the new rail, and let the leg solve extend the back leg.

## Files

- `src/physics/AttachedRider.ts`: `legDriveStep`, `pushDrive`, the `LEAN_OUT_PULL` note; `src/physics/legDrive.test.ts`.
- Switch: `legDriveSwitch` in `src/game/PhysicalMode.ts`, pinned off for online rooms in `src/main.ts`.
- Scripts here: `steepface-probe.test.ts.txt` (with `r2Lab.ts.txt` from `../face-hold-2026-11-10/`), `batch.sh.txt`,
  `tab.py.txt`, `push.py.txt`. `run2.sh` and `kinds.py` are in `../face-hold-2026-11-10/`.
