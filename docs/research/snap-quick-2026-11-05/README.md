# Snap set up at full effort (2026-11-05)

Branch `claude/snap-quick`, from main c00528ac (after the keyboard's stance hand-over, PR #194).

## The ask

The owner asked why Snap from Compress takes "almost a second" when the legs are already down, and brought surf-coaching research:
- From a compressed stance, a snap is set up and started in about 0.2–0.5 s. The legs are already loaded, so no time goes on dropping the centre of mass.
- The order is the head and eyes first, abruptly; then the front shoulder and the torso uncoil; the hips follow; and the legs drive the weight onto the tail (the back knee forward and down, the front leg extending to unweight the nose), so the fins pivot or break free.

Rapture's coaching agrees: the head and shoulders rotate "as fast as possible", and that rotation sets the snap's speed.

## What took the time (headless probe, pad, flat water at 8 m/s)

From Compress, the legs do not move: Snap's depth is Compress's (0.3 m). The time went on two things paced at the balance's calm rate, which every stance shares:
- **The shoulders' wind toward the turn** (`twistStep`), critically damped at TWIST_FREQUENCY 7 rad/s: 90 % in 0.45–0.55 s. The hips' torque and the feet's grip allow the full 45° in about 0.22 s.
- **The weight's shift back over the tail** (`shiftAxis`): STANDING_BALANCE_TIME 0.15 s, 0.6 m/s and 3 m/s².
  - The body 90 % of the way back at 0.48–0.67 s, the drawn hips at 0.85 s straight on, and all of it at 1.3 s.
  - A crouched body can take it faster: an inverted pendulum's acceleration is g times how far the pressure goes ahead of the body (to the front foot, half the stance) over its height above the feet (Winter 1995; Hof et al. 2005). That is about 4 m/s² crouched in Compress, against 3 standing tall.

## The change (`AttachedRider`, only while Snap is held)

While Snap is held the body goes about as fast as it can; every other stance keeps the calm pace.
- **The shoulders:** SNAP_TWIST_FREQUENCY 11 rad/s, within TWIST_TORQUE and the feet's grip.
- **The weight:** SNAP_SHIFT_TIME 0.09 s, within the inverted pendulum's acceleration (g × half the stance / the body's height) and SNAP_SHIFT_SPEED 1.2 m/s, which is no tighter than that acceleration reaches over Snap's 0.25 m.
- **The switch:** `?snapQuick=old` (`snapQuick: 'old'`) sets Snap up at the calm pace, as before. Every spot; online rooms run the default.
- **Unchanged when Snap is not held:** the snap stance's hash test (every ride without Snap, bit for bit) passes.

## Measured (`probes/zz-stanceTiming.test.ts`; copy it into `src/physics/` with round 2's `zz-r2Lab.ts`)

Time to 90 %, from Compress to Snap:

| | Calm (`=old`) | Full effort |
|---|---|---|
| Full steer: the shoulders' wind | 0.45 s | 0.35 s |
| Full steer: the weight back over the tail | 0.48 s | 0.42 s |
| Full steer: the drawn hips | 0.48 s | 0.42 s |
| Straight on: the weight back | 0.67 s | 0.43 s (all of it at 0.45 s, against 0.93) |
| Straight on: the drawn hips | 0.85 s | 0.58 s |

`snapStance.test.ts`'s new timing test measures 0.35 s and 0.43 s against 0.48 s and 0.52 s.

**Faster settings tried and not kept:**
- The shoulders at 16 rad/s took the 45° in 0.27 s. But the twist's reaction, which first turns the board away from the turn, grew with them and cut the snap's turn: its peak was 132°/s at 9 m/s against 148.
- The weight at 0.06 s was in place by 0.35 s. But the body moving back that fast pushed the board on under it (+0.5 m/s for a moment), so the turn slowed mid-hold (39° by 0.8 s against 43°). Near the stop (about 2 m/s) the heading ran up to 48° off the path, against the round-2 bar of 30°.

**What it costs:** the body moving back onto the tail still pushes the board on a little. On still water at 7 m/s Snap keeps 5.0 m/s at 0.8 s, against 4.7 at the calm pace. That is still more speed shed than a carve (6.1 m/s), both in time and per degree turned. `snapStance.test.ts`'s bar moved from 0.8 to 0.85 of the carve's speed, with this note.

## Tests

- `snapStance.test.ts`:
  - new: "the snap set up from Compress": the shoulders under 0.4 s and the weight under 0.47 s, sooner than the calm pace;
  - the speed bar as above;
  - every other Snap test, including byte identity without Snap, passes unchanged.
- `PhysicalMode.test.ts`: `?snapQuick=old` reaches every spot's config, other values do nothing, and an online room pins the default.
