# Snap round 4: the stamp (2026-11-08)

Branch `claude/snap-stamp`, from main 0f036e68. Opt-in: `?snapStamp=on`. The default is today's Snap.

## The owner's ask

- "There is not enough sharp turn: I turn my stick all the way and the turn is still not narrow or fast."
- "I need someone to have the ability to turn less or very sharply with snap."
- The agreed model: the stick sets the sharpness. Partial stick is today's carve. Full stick is a short, hard stamp onto the tail.

## Status

- **Built, opt-in** (`snapStamp: 'on'` in `AttachedRider.ts`, STAMP_ constants).
  - Under Snap, a steer up to 0.8 is today's Snap, bit for bit.
  - Past 0.8, once per press-and-turn, the rider stamps: the upper body slams back 0.15 m past the hips (already over the back foot) for 0.25 s, then comes back over the hips and the side fins at the same pace.
  - The depth scales with the steer past 0.8, and the length from half to the full 0.25 s.
  - The stamp waits until Snap has been held 0.3 s: the hips are over the tail by then (snap-quick's set-up).
- **Physics only.** No yaw torque, no pull. The weight behind the fins unloads the nose; the hull pivots and the tail slides when the centre fin passes FIN_STALL. Back over the fins, they grip again. The cost is speed.
- **Sharper on the static climbs, no more falls there.** On the moving faces nothing changes: every Snap falls there, the stamp included (see below).
- Stand-ins: none new. STAMP_BACK and STAMP_TIME are tuned by the probe below (round 3's lever was 0.25 m for 0.3 s).

## Why these values

- **STAMP_STEER 0.8**: the last fifth of the stick's throw. "All the way" is the stick at its rim, which reads 0.8–1 past a pad's deadzone. Keys reach 1, so keys under Snap always stamp.
- **STAMP_SET 0.3 s**: stamped at once (round 3's way), the lean came before the hips were over the tail. The turns were shorter than without it (150° climb at 8 m/s: 41° against 60°). Waiting for the set-up: 62°.
- **STAMP_BACK 0.15 m**: 0.25 m turns a little more but falls as today does (150° at 6.7 m/s). 0.15 m keeps every climb on.
- **STAMP_TIME 0.25 s**: 0.15 s turns less (150° at 8 m/s: 43–52° against 62°) and does not fall less.
- The pressure target pushed further back too: no effect (the balance's band absorbs it). Not kept.
- The return's pace (STAMP_RETURN 0.4 s) against none: within 4° either way. Kept, as the re-grip's own pace.

## The table

Headless, instant input (a pad), Snap held 0.6 s. Each cell: the turn by 1 s from the press, the peak yaw rate, the speed kept at 1 s, the centre fin past 18° within the first second. "falls" counts riders off by the end of the run.

### The 15° plane's climbs (the steer held on 1.8 s)

| Start | Today | `snapPivot=lean` | `snapStamp=on` | stamp + lean |
|---|---|---|---|---|
| 150°, 6.7 m/s | 79°, 174°/s, 0.37, 0 s, **falls** | 84°, 182, 0.49, 0, **falls** | **96°, 237, 0.22, 0** | 95°, 224, 0.43, 0, **falls** |
| 150°, 8 m/s | 60°, 182, 0.36, 0.02 | 82°, 178, 0.60, 0, **falls** | 62°, 245, 0.30, 0.20 | 92°, 206, 0.49, 0 |
| 120°, 6.7 m/s | 50°, 205, 0.38, 0.07 | 76°, 261, 0.35, 0.03 | 69°, 260, 0.33, 0.20 | 101°, 315, 0.31, 0.23 |
| 120°, 8 m/s | 31°, 149, 0.54, 0.05 | 61°, 190, 0.48, 0 | 31°, 185, 0.38, 0.07 | 59°, 240, 0.35, 0.05 |
| Falls | 1 of 4 | 2 of 4 | **0 of 4** | 1 of 4 |

- Time to 90°: today 1.45–1.5 s (2 of 4 get there); the stamp 0.93 s (150°, 6.7); lean 1.07–1.45 s; stamp + lean 0.85–1.0 s.
- No run reaches 150° from the press. The static face slows every board toward its apex stall.
- Peaks: the stamp 185–260°/s (3 of 4 in the 200–300 target), today 149–205.

### Still water (Snap 0.6 s, then let go)

| Speed | Today | Lean | Stamp |
|---|---|---|---|
| 7 m/s | 36°, 189, 0.45, **falls** | 69°, 212, 0.39, **falls** | 37°, 239, 0.38, **falls** |
| 9 m/s | 28°, 126, 0.68 | 41°, 193, 0.57, **falls** | 25°, 139, 0.63 |

### The moving faces (round 2's two moves: a full bottom turn up, 0.15 s straight, then Snap with the steer down)

- FaceWater 1.2 m at 7, 8, 9 m/s; 0.85 m at 7, 8 m/s.
- **Every variant falls in 5 of 5**, today, lean and stamp alike, 0.28–1.5 s after the press.
- Today and lean are identical. The stamp changes two: 1.2 m at 9 m/s (37° against 29°, falls 1.2 s against 1.5 s) and 0.85 m at 8 m/s (84° against 60°, falls 1.02 s against 1.05 s).
- Why: the bottom turn tops out at 81–90° from the fall line, low on the face (0.04–0.34 of its height). The board keeps climbing after the rail change (round 2's deep U, R2.3). Three of five fall within 0.6 s, so the stamp (at 0.3 s) barely acts.
- Placing the rider high on the face, climbing, does not help: the lab's placement loses the board within 0.5 s. So there is **no clean headless face top turn** for any Snap. The owner's ride is the face test.

## Balance through the stamp

- **What keeps the rider on:**
  - stamping after Snap's set-up (0.3 s), not at the press;
  - a shallow stamp (0.15 m past the hips), not round 3's 0.25 m;
  - coming back over the fins at the stamp's own fast pace.
- **What it cannot have:** the speed. The stamp keeps 0.22–0.38 of the speed by 1 s on the static climbs (today 0.36–0.54). From 150° at 6.7 m/s the board slows to 1.3 m/s. The coaching says a snap "consumes enormous speed"; on a wave the face feeds it back, here nothing does.
- **The slide comes late.** The fin passes 18° for about 0.2 s, but 0.3–0.4 s after the stamp, as the board slows (the attack every 0.1 s over the first 0.6 s stays under 10°). The tail slides at the end of the turn, not under the stamp.
- **The fall that stays:** 150° at 6.7 m/s in the suite's set-up (a slightly different placement) still stalls and falls, as today does, 0.05 s later. It sits right at the stall, so small changes tip it either way.
- **Speed-in limit:** not built. Below about 7 m/s the stamp ends near 1 m/s on the static face. A limit would cut the sharpness exactly where the owner climbs slowest. The owner's ride decides.

## The pass

- Sharper with full stick: **yes on the climbs** (peak +36–63°/s, the turn by 1 s +0–19°, 0.93 s to 90° against 1.45 s). **No change on the moving faces.**
- No more falls than today's Snap: **yes** (climbs 0 against 1, still water 1 against 1, faces 5 against 5).
- Partial stick unchanged: **yes**, bit for bit (the probe's runs and the suite).

## Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- `npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`: 3148 passed, 23 expected fail, 40 skipped.
- New in `snapStance.test.ts`, "Snap's stamp (opt-in)":
  - a full steer turns sharper on the 150° and 120° climbs (+12° by 1 s, peak over 200°/s), the centre fin past 18° for 0.1–0.4 s, and no more falls than today;
  - a partial steer (0.6, 0.75) under Snap is bit for bit today's;
  - the switch with no Snap rides the scripted ride's hash.
- `PhysicalMode.test.ts`: the `?snapStamp=on` switch on every spot, off otherwise and online.

## Shot list for the owner

Ride each at the Wave Pool and the Point, recording. Snap held through the top move.

1. `?snapStamp=on`: a bottom turn, release, then Snap at the top with **partial stick** (about half). It should feel exactly like today's Snap.
2. Same, with **full stick**. Look for: a sharper, faster pivot; the tail sliding briefly near the end; the board slowing hard.
3. Same, full stick, coming in slow (a weak bottom turn). Does the rider stall and fall at the top?
4. `?snapStamp=on&snapPivot=lean`: partial then full stick. The lean adds the rail; it turned furthest on the climbs (59–101° by 1 s) but fell more on still water.
5. With keys: keys always reach full steer, so Snap with keys always stamps. Say whether that is wanted.
6. Tell us: is it sharp enough, does it fall, and is the speed it costs too much?

## Probes

- `probes/zz-stamp.test.ts`: copy into `src/physics/` with round 2's `zz-r2Lab.ts` (`../snap-stance-2026-11-03/probes/round2/`). Delete both afterwards (`zz-r2Lab.ts` is not git-excluded).
  - `CASE=face|climb|flat`, `S` (the steer under Snap), `OPTS` (rider options JSON), `RAMP` (0 for a pad).
  - Face options: `UP`, `TOP`, `GAP`, `HOLD2`; `PLACED=<deg>` with `START` places the rider climbing (loses the board, see above).
- `probes/run.sh NAME CASE S OPTS`: one line per case.

## Sources

- The coaching: "slam the weight onto the tail, then centre it" (the owner's research, snap-quick).
- Rapture's snap: the fins "momentarily lose grip", the tail slides; centre the weight to re-engage them.
- Round 3's stamp lever: `../snap-fan-2026-11-05/README.md` (130° at up to 305°/s off the 150° climb, but 0.07 of the speed kept).
- Round 2's lab and the deep U: `../snap-stance-2026-11-03/README.md`.
- FIN_STALL 18°: `src/physics/finForces.ts`.
