# Snap turning up the face (snap-upturn, 2026-11-08)

The owner, on a pad with `?snapPivot=lean&snapStamp=on&snapDepth=deep`, backside, left to right:
"I can't turn UP the wave (a bottom turn up the face); I can only turn down. The surfer gets confused and falls."
Plain steer and Compress turn up fine.

## What the probes found

Headless probes only (`probes/zz-upturn.test.ts`, `probes/run.sh`). A rider on the static 15° plane and on a moving
FaceWater face, heading 35° off the fall line, at 7, 8 and 9 m/s. A full stick up the face for 0.4–0.8 s, Snap held with
it, then everything let go. Both stances, both directions.

- **Stance and direction change nothing.** Regular and goofy, frontside and backside give the same numbers to the
  digit. The turn's physics has no backside of its own. So the owner's fall is not a backside fault.
- **The shoulders wind the right way.** `snapAim` latches the target up the face from below ((0, −1)), and the twist
  goes to the full 45° toward the turn in every run. Wrong-way twist: 0 s in every case. Not the cause.
- **The stamp, the deep load and the recentre are not the cause.** Each alone falls no more than Snap with no switch.
  `snapRecentre=old` falls at the same times.
- **`snapPivot=lean` is the cause.** On the plane, Snap 0.6 s then let go:

| 0.6 s Snap up the plane | 7 m/s | 8 m/s | 9 m/s | bank at release |
|---|---|---|---|---|
| no switch | falls 2.08 s | on | on | 32° |
| `snapPivot=lean` alone | falls 1.40 s | falls 1.50 s | falls 1.58 s | 44° |
| all three switches | falls 1.35 s | falls 1.40 s | falls 1.52 s | 44° |

(Fall times are from the press. The cause is "balance": the rider falls in, toward the face.)

## The cause

Snap's lean asks for the top turn's 70° rail (Forsyth et al. 2024: 75° in top turns, 42° in bottom turns). In a bottom
turn the board climbs. The climb and the buried rail take the speed: 8.9 → 4.3 m/s in 0.3 s after the release. At
4.5 m/s the turn holds about 25° of lean. The body is still at 35–45°. The bank reference has gone to 0, the swing hits
its stop (−69°), and the rider falls in. The board, slowed and on its rail, slides back down: the owner's "only down".
Turning down the face, gravity feeds the speed back, so the same lean holds. That is why down works and up does not.

## The fix

With `snapPivot=lean`, a Snap whose turn goes up the face (the steer's way, or unsteered Snap's latched side, takes the
board toward the fall line reversed) asks for the steer's rail (50°), not 70°. Turns down the face, and flat water, keep
the 70° lean. `AttachedRider.turningUp()`, used in `prepareBank`.

- `?snapUpturn=old` restores the old lean (plumbed like `snapRecentre`: RideSession, SurfZoneSimulation, the runner,
  PhysicalMode, main's online list).
- Without `snapPivot=lean` nothing changes. Without Snap every ride is bit for bit (the snap stance hash passes).

## Numbers after

| 0.6 s Snap up the plane, all three switches | 7 m/s | 8 m/s | 9 m/s |
|---|---|---|---|
| before (`snapUpturn=old`) | falls 1.35 s, turned 33° | falls 1.40 s, 31° | falls 1.52 s, 33° |
| after | falls 1.90 s, 20° | falls 2.57 s, 18° | on, 16° |
| Snap, no switch | falls 2.08 s, 21° | on, 18° | on, 15° |

With 0.8 s of Snap: before falls at 1.45 / 1.53 / 1.70 s; after 1.82 / 2.48 s / on. The cost: the bottom turn under
Snap no longer turns as hard as the lean did (44° against 72° at 7 m/s, 0.8 s). It turns as far as Snap without the lean,
still more than the plain steer.

The 7 m/s falls are left: Snap sheds speed by design, and a climb at 7 m/s with the tail loaded stalls. On the moving
FaceWater face every move falls 1.3–2.3 s after a full 0.8 s steer, plain steer too: that rig cannot tell a fix from a
fall, so the plane is the measure. After the fix the face falls come 0.2–0.4 s later.

## Test

`snapStance.test.ts`, "Snap turning up the face (bottom turn)": at 8 and 9 m/s, all three switches, Snap and a full
steer up the 15° face for 0.6 s from 35° off the fall line. The rider stays on 2 s, the shoulders wind toward the turn
(past 0.5 rad), the board comes round up the face (more than 15°). With `snapUpturn: 'old'` it falls inside 1.6 s.

## Shot list (the owner rides)

1. `?snapPivot=lean&snapStamp=on&snapDepth=deep`, pad, backside. Drop in, at the bottom hold RB and a full stick up the
   face, about half a second, then let go. Does the rider stay on and go up?
2. The same with `&snapUpturn=old`. It should fall as before.
3. A top turn with Snap (down the face) with the switches on. The 70° lean should be as before.
4. The same bottom turn frontside.
5. A slow bottom turn (just after the take-off). Say if it still stalls.
