# Snap (c): the body turns on its own (2026-11-05)

Branch `claude/snap-body-yaw`, from main 108d97c3.

**The owner's call (2026-11-04):** for Snap's two moves back to back (Round 2, R2.3 of `docs/research/snap-stance-2026-11-03/README.md`), "(c) the body turns on its own" against the board, so that the board can pivot under a lean that stays put in the world. Every stance's two moves fell.

## Where it stands

- **Built, opt-in:** `?bodyYaw=on` (`AttachedRiderOptions.bodyYaw: 'on'`, carried to every spot). Online rooms run the default.
- **Not the default.** On the round-2 probes the owner's two moves still fall with it on: 0 of 40 riders stay on, against 2 of 40 without it.
  - What it fixes: the pinned deep U. A bottom turn carved up the 15° face to 120°, then the steer reversed, now comes back down past across with the rider on, on the still face and the moving face. These are `AttachedRider.test.ts`'s two `it.fails`, kept pinned there because the default is unchanged; `bodyYaw.test.ts` asserts them with the switch on.
  - What it changes: the bottom turn carves further. The table below gives the first move's turn in 1 s.
  - What it costs: with it on, 33 tuned riding tests no longer hold. See "Side effects".
- **The default is main byte for byte.** Every new term runs only with `bodyYaw: 'on'`:
  - the snap stance's hash test (`snapStance.test.ts`, "reproduces the scripted ride ... bit for bit") passes;
  - the two-move probe's output is identical byte for byte to main's.
- **For the owner:** ride it and say whether the board's pivot under the body feels right. If it does, the next step is re-tuning the rail change, the cutback and pumping with it on. If not, it stays parked.

## The model

Carried rigidly (the default), the standing solve moves the rider's centre of mass with the board: v = v_board + ω × r + the leg + the bank. When the board yaws, the whole lean swings round the stance point with it. A board pivoting under a body leaning 40° must swing about 75 kg at 0.6 m (about 28 kg m², against the board's 1–2). So it cannot pivot out from under the lean of a bottom turn. That was R2.3's diagnosis.

With `bodyYaw: 'on'`, standing on a planing board:

1. **The board's yaw carries the stance point, not the lean.** In the 8-unknown solve, the board's yaw column uses the arm to the stance point: the arm less the lean's level offset from the feet. The board's yaw torque row uses the same arm.
2. **The body has its own heading**, `bodyYaw.heading`. The lean, the bank and the body's frame are taken across it, and the lean turns round the stance point at the body's own rate (the drive).
3. **The hips turn the body after the board**, critically damped at BODY_YAW_FREQUENCY. Their torque is limited by HIP_TORQUE and by the feet's grip (FOOT_FRICTION times the leg's load over BODY_YAW_GRIP_RADIUS). The inertia is the body's own about its long axis plus the lean's mass at its lever. The board takes the hips' reaction through the feet, and the ledger books it.
4. **At the range's end** (BODY_YAW_RANGE, 45°), turning further out, the body is carried round rigidly that substep, as by default.
5. **The ankles** hold the board's roll as seen in the body's lean plane. The rail's bite is still read from the board's own roll.
6. **The weight along the board** (the trim) stays along the board. Only the lean is in the body's frame.

The sources are in the constants' comment (`AttachedRider.ts`, BODY_YAW_*):
- the hips' rotation range: AAOS norms; Roach & Miles 1991;
- the rotators' torque, in adults;
- the body's moment about its long axis: Zatsiorsky 2002.

## Measured (headless, round 2's probes; no browser, no rider sessions)

The probes are in `probes/`. Copy them into `src/physics/` and set `BODYYAW=on` to turn the switch on. `zz-r2Diag.test.ts` with `CASE=two` runs the owner's sequence:
- a stance and a full steer up the face for 0.8 s;
- 0.15 s neutral;
- a stance and a full steer back down.

It runs on the static 15° plane (8, 9 and 10 m/s), the moving 1.2 m face (7, 8 and 9 m/s) and the Wave Pool's 0.85 m face (7 and 8 m/s). Data is in `probes/data/`, and `table.py <default> <on>` prints the two side by side.

**The first move** (the bottom turn up the face), mean degrees turned:

| Water | Pair | Default | `bodyYaw=on` |
|---|---|---|---|
| plane 15° | steer | 26° | 32° |
| plane 15° | Compress | 38° | 52° |
| plane 15° | Snap | 35° | 38° |
| face 1.2 m | steer | 21° | 26° |
| face 1.2 m | Compress | 34° | 42° |
| face 1.2 m | Snap | 27° | 28° |
| face 0.85 m | steer | 19° | 18° |
| face 0.85 m | Compress | 36° | 40° |
| face 0.85 m | Snap | 27° | 24° |

**The two moves, riders on through the whole sequence:** default 2 of 40 (Compress then Compress on the 0.85 m face, both speeds); `bodyYaw=on` 0 of 40.

With it on, the first move carries the board further up the face (fromFall 140–170° on the plane, against 125–140°). The second move then starts slower and higher. Most riders fall in the second move, either into the new lean while the board drifts at 3–4 m/s near the top, or still into the old lean. Without it, they fall in the gap or early in the second move, into the old lean (bank −70°).

**A bug found and fixed while measuring:** the body's heading must be taken from the board's when the body starts turning on its own. Without that, every placed rider began up to 45° off its board.

**A variant tried and rejected:** the ankles holding the board's own roll (about its heading) against a bank taken across the body's heading. Riders on 0 of 40, and 45 riding tests off.

## Side effects with `bodyYaw=on` (the physics suite; the default passes all of them)

Measured with the switch forced on in every test, and fixed by nothing here:
- **The rail change** (`leanOut.test.ts`, the 5° face): the rider falls in all four runs. On the 3° face the four still pass.
- **The cutback** (`cutback.test.ts`): it keeps 4.1–4.3 m/s round 160°, against more than 4.5. Across 5°, one of the two runs planes past 160°.
- **The projection:** the feet roll the board 6.2° past the body while steering, against more than 8° (`projection.test.ts`). The 25° release keeps 0.7401 of its speed, against under 0.74 (`projectionLean.test.ts`).
- **Pumping** (`pumping.test.ts`): the timed pumps' gain over the steady stance fails.
- **Compress** taken mid-turn on flat water, at 7, 8, 10 and 11 m/s, is not held (`AttachedRider.test.ts`). The top turn that stalls from 4.5 and 5 m/s pulls the board.
- **Snap's round-2 physics** (`snapStance.test.ts`): seven of its tests fail.
- **Also:** the drawn swing, the reaching hand, the relaunch's neutral stance, the stance ladder's loaded feet, and the hash tests, which compare the default.

## Tests

- `src/physics/bodyYaw.test.ts` (new):
  - the default keeps the body on the board's heading;
  - with the switch on, the body starts on the board's heading and lags a turning board within the hips' 45°;
  - the deep U stays on with the switch on, on both faces, and falls without it.
- `src/game/PhysicalMode.test.ts`: `?bodyYaw=on` reaches every spot's config, other values do nothing, and an online room's config pins the default.
