# Snap carve: the deeper load and the arms (2026-11-08)

Branch `claude/snap-carve`, from main 9e7aa898. Worktree `.claude/worktrees/canyon-beach-break`.

The owner's feedback after riding `?snapPivot=lean`:
- "I can do a full turn down the wave and then continue surfing."
- "The surfer doesn't move the arms and doesn't lower the center of gravity so much."

The reference is Surf Analytica's "JJF and one perfect full rail carve" (youtube.com/shorts/OItLo9IiCpQ):
- 0–2 s: a deep bottom turn, the hips near the board, the inside hand at the water.
- 3–5 s: up the face, the arms out.
- 6–9 s: the rail carve at the top. The shoulders turn first, the leading arm points into the turn, the trailing arm swings up and back.
- 10–12 s: he recentres and compresses again.

## Status

- **The deeper load: built opt-in, `?snapDepth=deep`.** It did not earn the default. The turn is no sharper, and on still water more riders fall after the release (the table below). The default is unchanged.
- **The arms: built, default on. `?snapArms=old` draws them as before.** Drawing only. No physics changed.
- **Without Snap held, every ride is unchanged.** `snapStance.test.ts`'s hash test passes.
- **Online:** `snapDepth` is pinned to the default in online rooms (`main.ts`). The arms read only the drawn state, so other players' riders draw them the same way. One limit: they read `state.twist`, as the drawn chest already does.

## 1. The deeper load (`snapDepth: 'deep'`, `SNAP_DEPTH_DEEP`)

What it does:
- Snap's legs come down to the tube tuck's depth (`MANUAL_CROUCH_DEPTH`, 0.45 m), in place of Compress's 0.3 m.

Why (the cause and the sources):
- A loaded bottom turn sits in the deepest surf crouch: knees and hips at 90° or less (de Sousa 2022's fundamental phase), knees about 80° or less at the turn's base (the Kerr reading in `stanceMap.ts`).
- The tube tuck is the repo's own deepest stance (the owner's decision of 2026-10-06). The leg model already travels there.

What it reaches:
- Within a 0.6 s Snap the legs reach 0.33–0.37 m, not 0.45 (the crouch's speed, the load). Held longer, 0.44–0.45 m.
- The drawn rear knee then closes to 30–46° (included angle), against 52–65° at Compress's depth. That is near the end of the knee's range. The tube's grab pose no longer kicks in for a deep Snap (see the arms).

### Measured (headless, round 2's single moves)

Probe: `probes/zz-snapCarve.test.ts` (round 2's `zz-r2Lab.ts` beside it). Snap held 0.6 s with a full steer from 0.2 s, the steer held after. Keys (0.2 s ramp).

Each cell: the turn by 1 s / the peak (°/s), the speed kept at the end, the deepest leg (m). F = the rider fell, at that time (s).

| Snap | Flat 7 m/s | Flat 9 m/s | Climb 150°, 6.7 | Climb 150°, 8 | Climb 120°, 6.7 | Climb 120°, 8 | Falls, flat (pad) |
|---|---|---|---|---|---|---|---|
| Default (0.3 m) | 59° / 151, 0.41, 0.28 | 30° / 122, 0.49, 0.28 | 104° / 238, 0.32 | 68° / 179, 0.42 | 58° / 157, 0.46 | 39° / 148, 0.57 | 2 of 12 (2) |
| 0.33 m (1.1×) | 59° / 162, 0.36 | 30° / 122, F 2.0 | 103° / 239 | 68° / 180 | 58° / 164 | 39° / 158 | 4 (2) |
| 0.375 m (1.25×) | 61° / 174, F 1.88 | 30° / 124, F 1.87 | 103° / 240 | 68° / 180 | 59° / 177 | 40° / 175 | 6 (3) |
| **Deep (0.45 m)** | 63° / 174, 0.29, 0.37, F 1.92 | 31° / 125, 0.61, 0.37, F 1.85 | 102° / 242, 0.38 | 68° / 175, 0.39 | 60° / 186, 0.46 | 42° / 178, 0.65 | **5 (2)** |
| Lean, default | 89° / 217, F 1.73 | 60° / 192, F 1.68 | 95° / 217 | 101° / 240 | 80° / 222 | 67° / 188 | 11 (6) |
| Lean, deep | 86° / 230, F 1.73 | 68° / 214, F 1.65 | 92° / 214 | 101° / 246 | 83° / 224 | 68° / 184 | 11 (6) |

- "Falls, flat" is round 2's still-water protocol: 7 and 9 m/s, the steer held, eased to half or let go with Snap, keys or pad (12 runs).
- The climbs (round 1's static 15° plane, 1.6 s): nobody falls at any depth.
- The turn by 1 s moves by 4° or less. The peak rises by up to 29°/s on flat water and the 120° climb, and stays the same off the 150° climb.
- The extra still-water falls all come 1.0–1.2 s after the release, with the board stalled to 26–61 % of its speed. The trace (`data/trace.txt`, 9 m/s): both depths lose balance the same way (margin 0.04–0.06 at 1.4 s). The deeper legs take longer to rise and tip it over.
- Leaning (`?snapPivot=lean`, what the owner rides): 11 of 12 fall on still water at either depth. The deeper load costs nothing there.
- The two moves back to back (`zz-r2Diag` CASE=two, Compress or Snap up then Snap down, round 2's eight waters, `data/two-*.json`): every rider falls at either depth, as in round 3 (the deep U, not the depth). A snap taken deep turns less on the second snap (plane 15° at 8 m/s: 3° against 39°).
- `snapStance.test.ts` (instant input, 7 m/s): the legs 0.35 m down against 0.28; 46° by 1 s against 43°; peak 193°/s against 198. Leaning: 73° against 77°, peak 211 against 218.

So the deeper load does not turn sharper, and it brings still-water falls. It stays opt-in for the owner to try with `?snapPivot=lean`, where it costs no falls.

## 2. The arms (`RIG_DETAIL.snapArms`, `RIG_SWITCHES.snapArms`)

Drawn only, from the drawn state (`HumanoidRig.ts`). It reuses the rig's machinery: the arms' turn share (`armTurn`), the leading arm as pointer (`leadArm`), the free arm's swing (`spreadArm`), and the reach-down with its spine bend (`followReach`, `reachBend`).

- **Snap read from the drawn state** (`snapShare`, `stanceBlend.ts`): the weight back (`weightBack`) times the shoulders' wind (`state.twist`, Snap's aim, full at 45°). Either alone is not Snap: the backside tube sits the pelvis back on a pitched board (gating on the weight alone broke the tube's pig-dog test), and the pad's rotation stick winds the shoulders.
- **The shoulders lead, the arms with them.** In Snap the arms count the turn as started, as a yaw rate does. The leading arm points along the look, which the twist turns. So it points into the turn before the board comes round. (Rapture: the head and shoulders rotate first. De Sousa 2022: the chest and the leading arm to the lip. The video at 6–9 s.)
- **The trailing arm swings up and back.** Opposite the look, 55° from the trunk's down, the elbow soft. 55° is the animation plan's top-turn limit (§5.11: the arms at chest height or below). (The video at 6–9 s.)
- **The inside hand at the water.** Low in the loaded turn, the inside hand reaches off the low rail toward the water. The spine bends toward it, as it does for Compress's hand. This happens when the weight is back, the legs are loaded (depth 0.6–0.9), the board is on its rail (rolled 10–25°) and not yet climbing (rising under 0.3–1 m/s). Frontside it is the trailing arm, backside the leading arm, the physics' own rule for Compress's hand (`REACH_ALONG`). (De Sousa 2022: the body leans in until the inside hand nears the water. The video at 0–2 s.)
- **No tube pose in a deep Snap.** The tube's stage needs the pelvis past 0.31 m, which a deep Snap reaches. Snap (`snapShare`) now reads as no tube (`stageBlend.ts`). `?snapArms=old` restores this too.

Measured on the test humanoid (`snapArms.test.ts`; the probe `probes/zz-snapArmsProbe.test.ts`, data `data/arms3.txt`). Flat water, 8 m/s, Snap with a full steer, Regular and Goofy:

| 0.6 s into the snap | Default | `?snapArms=old` |
|---|---|---|
| Leading hand off the nose, into the turn | 17–33° | 0–15° |
| Trailing arm from the trunk's down | 58–63° | 20–37° |
| Trailing hand | behind its shoulder, toward the tail | by the knee |
| Elbows | 122–149° | 128–147° |

| 0.9 s, loaded on the rail | Default | `?snapArms=old` |
|---|---|---|
| The inside wrist over the board's centre | 0.16–0.36 m | 0.29–0.59 m |
| How far out from the stringer | 0.19–0.40 m, by the low rail | 0.25–0.78 m, held out |

- The arms point the way the board turns, for both stances and both steers.
- Compress's arms are the same with either switch (tested bit for bit).
- Elbows stay 90–170° in the tested snaps. One pre-existing case locks the trailing elbow at 180° (Snap off a 15° face toward it, 0.6–0.9 s in). It does so with `=old` too: it comes from the balance alarm spreading the arms.

## Tests

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The main suite (`npx vitest run src --maxWorkers=3 --exclude "**/SurfZoneSimulation.test.ts" --exclude "**/SurfZoneRunner.test.ts"`): 3,144 passed, 23 expected fails, 0 failed.
- New:
  - `snapStance.test.ts`, "Snap's deeper load (opt-in)": deeper than Compress, within the tuck, the turn within 5° and the peak within 10°/s, default and leaning.
  - `snapArms.test.ts`: the leading arm into the turn, the trailing arm up (45–70°) and back, soft elbows; the inside hand lower and by the low rail; Compress unchanged.
  - `PhysicalMode.test.ts`: `?snapDepth=deep` (carried to every spot's config, pinned online) and `?snapArms=old`.

## How to rerun the probes

1. Copy `../snap-stance-2026-11-03/probes/round2/zz-r2Lab.ts` and `probes/zz-snapCarve.test.ts` into `src/physics/`.
2. `OUT=<file> DEPTHS=1,1.5 npx vitest run src/physics/zz-snapCarve.test.ts` (`LEAN=0|1` for one arm). `python3 probes/table.py <file>` prints the table.
3. The arms: copy `probes/zz-snapArmsProbe.test.ts` into `src/scene/rig/` and run it with `OUT=<file>`. Its deep rows need `mount()` in `src/dev/ridingPoses.ts` to pass `snapDepth: 'deep'` (a temporary edit).
4. Delete the copies afterwards (`zz-r2Lab.ts` is not git-excluded).

## Shot list for the owner (the JJF sequence)

Ride at the Point or the Wave Pool, a medium swell. Record each one.

1. `?snapPivot=lean`: a deep bottom turn with Compress, up the face, Snap at the top with the steer back down, let go. Look for: the leading arm pointing into the turn as the shoulders wind; the trailing arm swinging up and back; the recentre after.
2. The same with `?snapPivot=lean&snapArms=old`, to compare the arms.
3. `?snapPivot=lean&snapDepth=deep`: the same sequence, with Snap for the bottom turn too. Look for: the hips lower; the inside hand reaching for the water low in the bottom turn; any fall after the release.
4. Frontside and backside, once each.
5. Tell us: do the arms read as the video's? Is the deep load worth making the default?
