# A-lite: the legs' power limit, `?legPower=cap` (2026-11-12)

Step 1 of the surfer track (`docs/superpowers/specs/2026-11-12-surfer-physics-redesign.md`), ruling 27's A-lite
(`../ruling-27.md`). Off by default. Online rooms stay on the default.

All numbers here are from probes on analytic water (planar faces, a tilting face, flat water). No ride session, no
catch report, no autopilot ride, no game page.

## 1. The mechanism (the trace)

`trace.probe.ts` prints the standing contact substep by substep (32 substeps a frame), at 6 m/s, placed on a 35° face,
straight down and straight up, and on 25° as the control. Results: `results/trace-off.jsonl`, `results/trace-on.jsonl`.

The study's reading is right in its core, with one correction.

1. At 35° straight down the contact is met for 5 substeps. Then the limit is **tip**: the line from the body's centre of
   mass to the deck falls outside the feet (the body stands plumb, the deck is 35° off). It is not friction (`slip`).
2. When the contact is not met, `project` (`AttachedRider.ts`) keeps the impulse's **normal** part (up to 4 body weights)
   and cuts only the part along the deck. The board alone then takes that push (`pushBoard`, `BoardBody.ts`).
3. That normal push is sized by the coupled solve. It is the push the body needs to follow the board **as one body with
   it**, plus the catch-up of all the drift so far. It is not what the leg pushes with. In the trace the leg's own force
   (its load, spring and damper) falls to zero or below, while the push stays at 2 to 3.6 body weights.
4. The light board, pressed into a 35° face by 3.6 body weights, gets the water's reply along the face's normal. On a
   steep face that reply has a large part along the face. The board shoots away (13 to 18 g in the trace, 21 to 65 g at
   the frame level). The body cannot follow (tip), so the drift grows, so the next push grows. A loop.
5. The pair moves apart under a large push: the contact does positive work. 0.1 kW, 1.6, 5.8, 12 kW in four frames.

**The correction:** it is not that the board receives "a push sized for the pair" in mass. It is that the normal part
of the impulse is never limited by the leg. The leg can only push with its own force. The coupled solve's normal push
is free of that limit, and it grows with the drift. That is the leak.

## 2. What changed

The switch: `legPower: 'cap'` on `AttachedRider` (`?legPower=cap`, `legPowerSwitch` in `src/game/PhysicalMode.ts`),
forwarded by `SurfZoneConfig.legPower` (`src/wave/SurfZoneSimulation.ts`), `SurfZoneRunner.ts` and `RideSessionOptions.legPower`
(`src/physics/RideSession.ts`). Online rooms pin it to the default in `src/main.ts` (`legPower: undefined` in the
room's overrides); the test in `src/game/PhysicalMode.test.ts` reads that line.

The physics, standing only, only with the switch on:

- `src/physics/BoardBody.ts` 1219–1230: a met contact over the legs' power is solved apart too; apart, the board's push
  goes through `pushCapped` (1346–1364). The solve is linear in the push, so it solves the board once with none of the
  push and once with all of it, and takes the share in between.
- `src/physics/AttachedRider.ts`:
  - constants `LEG_POWER_PEAK` = 60 W/kg, `LEG_POWER_HELD` = 20 W/kg, `LEG_POWER_WINDOW` = 0.5 s (31–40);
  - the option (1128–1135) and the power window (1594–1605; `resetPower`, `preparePower`, `recordPower` 3333–3381);
  - `overPower` (3383–3412): the coupled solution's net contact work (the push, and the swing's, twist's and agile
    legs' couples, as `finish` books them); over the budget, the two are solved apart;
  - `apartRelative`, `legShare`, `pushKept`, `limitPush` (3414–3472): rules 1 and 2 below;
  - `finish` (3488–3562, under `capsLegs` only): each substep's net contact work goes into the window.

**Rule 1 (what the legs transmit).** Apart, the feet may **resist** as hard as the push asks, as long as that makes no
energy (holding and absorbing cost the legs nothing: the share s₀ of the push whose net work is ≤ 0). Beyond that they
push only with the **leg's own force** along the leg (its load, spring and damper, `prepareLeg`). The push keeps its
line, so its centre of pressure and the friction cone still hold.

**Rule 2 (the power cap).** The contact's net positive work in each substep is at most 60 W/kg × rider mass × the
substep, and over any 0.5 s at most 20 W/kg × mass × 0.5 s (about 4.4 kW and 1.5 kW at 73 kg). Absorbed work is not
limited, and it counts in the 0.5 s sum.

No new force. Gravity, the hull forces and the stance map's targets are unchanged. The leg drive's own push
(`legDrive`, Snap's rail change) is not capped; its share is left out of the window.

**A first build was stricter.** It limited the whole push to the leg's force, also when the feet only resist. It
stopped the leak too, but a normal stall turned into a fall: the face tilted in under a rider climbing at 20° fell at
0.67 s instead of 2.17 s. The feet then lost the hold they had. The final rule 1 lets the feet resist freely. The
numbers below are from the final build.

## 3. The bars (off → on)

Standing, 6 m/s, straight down (heading 0) and straight up (180). "Placed": put on the face at once. "Tilted": the face
tilts in from flat under the rider (down over 1.5 s, up over 0.8 s, as `../steep.probe.ts`). "Legs" = the contact's net
power on board and body together, the study's measure. Probe: `bars.probe.ts`. Results: `results/bars-off.jsonl`,
`results/bars-on.jsonl`. Rider 73 kg: 60 W/kg = 4380 W, 20 W/kg = 1460 W.

| Start | Line | Face | Off: legs, peak W | Off: board, peak g | Off: fall | On: legs, peak W (frame / substep / any 0.5 s) | On: board, peak g | On: fall, or the end |
|---|---|---|---|---|---|---|---|---|
| placed | down | 20° | 183 | 0.8 | holds, 8.1 m/s | 183 / 202 / 56 | 0.8 | holds, 8.1 m/s |
| placed | down | 25° | 497 | 1.3 | holds, 9.36 m/s | 498 / 509 / 106 | 1.3 | holds, 9.36 m/s |
| placed | down | 30° | 1309 | 12.9 | holds, 10.41 m/s | 3451 / 4380 / 380 | 8.3 | balance, 0.333 s |
| placed | down | 35° | 12166 | 20.8 | balance, 0.1 s | 248 / 289 / 29 | 2.4 | impact, 0.2 s |
| placed | down | 40° | 20777 | 33.6 | impact, 0.067 s | 48 / 95 / 4 | 2.2 | impact, 0.2 s |
| placed | down | 45° | 19511 | 48.2 | impact, 0.067 s | 35 / 87 / 2 | 2.3 | impact, 0.2 s |
| placed | down | 50° | 30864 | 64.6 | impact, 0.067 s | 26 / 76 / 2 | 2.4 | impact, 0.217 s |
| placed | up | 20° | 145 | 1.9 | holds, 0.4 m/s | 145 / 247 / 72 | 1.9 | holds, 0.4 m/s |
| placed | up | 25° | 4156 | 16.8 | balance, 0.183 s | 291 / 502 / 16 | 2.9 | impact, 0.2 s |
| placed | up | 30° | 12649 | 33.3 | balance, 0.1 s | 196 / 255 / 8 | 3.3 | impact, 0.167 s |
| placed | up | 35° | 12996 | 36.9 | impact, 0.067 s | 108 / 154 / 4 | 4 | impact, 0.167 s |
| placed | up | 40° | 23233 | 50.5 | impact, 0.05 s | 56 / 116 / 2 | 3.9 | impact, 0.183 s |
| placed | up | 45° | 21951 | 57.7 | impact, 0.05 s | 33 / 98 / 1 | 3.7 | balance, 0.2 s |
| placed | up | 50° | 28432 | 79 | impact, 0.05 s | 23 / 91 / 1 | 3.6 | balance, 0.217 s |
| tilted | down | 20° | 84 | 0.7 | holds, 7.5 m/s | 84 / 84 / 22 | 0.7 | holds, 7.5 m/s |
| tilted | down | 25° | 609 | 2.1 | holds, 9.19 m/s | 609 / 622 / 95 | 2.1 | holds, 9.19 m/s |
| tilted | down | 30° | 2011 | 8.1 | holds, 9.92 m/s | 2435 / 2977 / 390 | 8.1 | holds, 9.77 m/s |
| tilted | down | 35° | 9194 | 24.9 | balance, 1.467 s | 3960 / 4380 / 299 | 13.4 | holds, 12.16 m/s |
| tilted | down | 40° | 12674 | 23.9 | lost board, 1.417 s | 723 / 1147 / 54 | 7.2 | impact, 1.467 s |
| tilted | down | 45° | 42 | 8.5 | lost board, 1.533 s | 42 / 42 / 13 | 8.2 | lost board, 1.533 s |
| tilted | down | 50° | 42 | 19 | lost board, 1.75 s | 42 / 42 / 12 | 18.3 | lost board, 1.733 s |
| tilted | up | 20° | 88 | 2 | balance, 2.167 s | 36 / 67 / 0 | 3.2 | balance, 2.167 s |
| tilted | up | 25° | 2333 | 9.4 | balance, 0.983 s | 0 / 0 / 0 | 2.3 | balance, 0.717 s |
| tilted | up | 30° | 4761 | 16.2 | balance, 0.617 s | 0 / 0 / 0 | 3.6 | impact, 0.583 s |
| tilted | up | 35° | 8348 | 23.3 | balance, 0.55 s | 0 / 0 / 0 | 5 | impact, 0.533 s |
| tilted | up | 40° | 8286 | 23.3 | balance, 0.5 s | 0 / 0 / 0 | 6.2 | impact, 0.5 s |
| tilted | up | 45° | 8736 | 25.7 | balance, 0.467 s | 0 / 0 / 0 | 7.4 | impact, 0.467 s |
| tilted | up | 50° | 8993 | 24.4 | balance, 0.433 s | 0 / 0 / 0 | 8.1 | impact, 0.45 s |

"Board, peak g" = the board's acceleration per frame, the largest in the run (the first frames of a placed start included).

### L1: the legs' net power within the cap — **pass**

- At every substep: at most 4380 W (the cap binds exactly in three rows: placed 30° down, tilted 30° and 35° down).
- Per frame: at most 3960 W. Over any 0.5 s: at most 390 W (cap 1460 W).
- Off: up to 31 kW per frame and 66 kW per substep.

### L2: no board acceleration over 5 g from the contact — **partly**

- Every row that was **thrown** by the contact drops: placed rows from 17–79 g to 1.6–4.0 g; tilted 35–40° down from
  24 g to 7–13 g; tilted up 25–50° from 9–26 g to 2.3–8.1 g.
- Still over 5 g (on): placed 30° down 8.3 g; tilted 30° down 8.1 g (the same as off); tilted 35° down 13.4 g, 40° down
  7.2 g; tilted 45° and 50° down 8.2 and 18.3 g (the same as off: the legs do 42 W there, the rider has left the board,
  these are water slams); tilted up 35–50° 5.0–8.1 g, with the contact doing **zero** positive work.
- So the rest is the board slapping the water (skipping, landing, a board stopped hard on a steepening face). The
  contact only resists there. I count L2 as passed for the contact's throw, not for the board's total acceleration.

### L3: where the rider was thrown, a stall or a slide, no fall within 0.2 s — **fails on the placed rows, by a little**

- Placed (put on a steep face at once): the rider used to fall in 0.05–0.18 s. Now 0.167–0.217 s. Seven of eleven
  thrown rows fall at or under 0.2 s. The fall is no longer a throw: the legs do 23–291 W, the board 1.4–4 g. The body
  stands plumb on a deck 25–50° off, its weight line passes outside the feet (tip), and it drifts off its posture in
  0.2 s. The study already named these "start problems" (the body must lean first). Only the body lean (step 3.1 of the
  spec) can fix this.
- Tilted down: 35° now **holds** to the end (12 m/s; it fell at 1.47 s). 40° still falls at 1.47 s, but with 0.7 kW,
  not 12.7 kW.
- Tilted up: 20° still stalls and falls at 2.17 s, as before (a normal stop). 25–50°: the rider falls at 0.45–0.72 s
  (before: 0.43–0.98 s), now with **zero** positive leg power: the board stops and sinks (0.2–3.8 m/s, up to 0.7 m deep)
  and the rider steps off it. This is a stall, but the fall comes about as early as before.
- Fall causes now read "impact" in many rows. That is the label of the limit that bound longest
  (`dominantLimit`): the catch-up push asked for is over 4 body weights. It is not a real impact.

**The retune.** The stop rule allows one retune of the instant cap (40 to 80 W/kg) if L3 fails. I ran both ends: the
L3 fall times do not move at 40 or 80 W/kg (the cap does not bind in those rows; rule 1 does). So no retune is kept;
the cap stays at 60 W/kg. One side effect: at 40 W/kg the placed 30° down row holds (as off); at 60 and 80 it falls at
0.33 s (that row is on the edge: its posture error peaks at the 0.25 m limit; off it peaks at 0.14 m).

### L4: flat glide, carve, paddling, pop-up within 5 % — **pass (unchanged)**

`../draft.probe.ts` with `LEG_POWER=cap`: every flat-water row (board alone, lying, paddling, both pop-ups, standing at
rest, the glides at 5, 7, 9 and 12 m/s, the held carves standing and Compress, their deepest rails) prints the same
numbers as off. Draft, drag, slip: unchanged.

Rows that changed (planar faces, not bars):
- 20° and 35° face, across (90° off), placed: small changes (roll, draft by under 1 cm).
- **35° face, 45° off the fall line, placed: off holds 1.5 s; on falls at 1.15 s (balance).** The first frames differ
  (rule 1 cuts the start's push); then the bank runs on to 70° and does not come back. The same line tilted in (the fair
  start) is unchanged.
- 50° face, 45° off: both fall (off "balance", on "lost board").
- Straight down from 4 m/s, 35° and 50°: falls move from 0.07–0.08 s to 0.20–0.22 s, without the throw.
- The tilted-in across rows (20°, 35°, 50°): unchanged.

`../budget.probe.ts`: flat rows unchanged; the 20° face rows move by 0.001 g in the ledger.

### L5: switch off byte-identical — **pass**

- The six study probes with the switch off print the same bytes as `../results/*.jsonl`.
- `legPower.test.ts`: a flat glide gives the same positions step for step with the switch on and off.
- Suite and Canyon hashes: section 5.

### Bumps (no bar)

`../bumps.probe.ts` with `LEG_POWER=cap`: every row as before, except the 5 cm step up over 5 cm (the 45° wall): the
peak foot load 4.0 → 0.2 body weights, the rider still falls at 0.03 s (the nose is driven down, −37°). Rises of 20 cm at
4 m/s fall at 0.25 s (was 0.27); in the wall water at 4 m/s, 0.18 s (was 0.20). That is ruling 27's step B.

### Leg power in normal riding (`normal.probe.ts`)

| Case | Legs, peak per frame / per substep / most over 0.5 s, W | Solved apart for power | Push cut by rule 1 |
|---|---|---|---|
| Glide 7 m/s, 3 s | 25 / 25 / 10 | 0 | 0 |
| Held carve, standing (falls at 2.28 s, as off) | 255 / 266 / 100 | 0 | 19 of 4361 substeps |
| Held carve, Compress, 3 s | 60 / 61 / 6 | 0 | 0 |
| Paddling 8 s | 14 / 14 / 10 | 0 | 0 |
| Pop-up from the paddle speed (sinks and falls at 2.18 s on flat water, as off) | 406 / 445 / 269 (off 416 / 508 / 270) | 0 | 147 of 2929 |
| Pop-up from 5 m/s prone | 475 / 477 / 297 | 0 | 0 |
| 20° face, 45° off, 7 m/s, 3 s | 287 / 373 / 51 (off 285 / 354 / 51) | 0 | 129 of 5760 |

Normal riding stays at 10 % of the instant cap and 20 % of the held one. The power cap never binds there.

## 4. What was not run

- No ride session, catch report or autopilot ride. No real wave, no Basilisk case, no tube wall: analytic water only.
- The moving face (`../face.probe.ts`) and the rest of the study's probes ran with the switch
  (`results/study-*-on.jsonl`); I compared draft, bumps and budget row by row, face and steep only through the bars.
- I did not trace the pop-up's 147 cut substeps one by one; its rows print the same numbers.

## 5. Merge checks

- `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: clean.
- The suite (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation.test.ts` and `SurfZoneRunner.test.ts`):
  346 files passed, 37 skipped; 3355 tests passed, 23 expected fail, 43 skipped. Main: 345 files and 3351 tests; the
  new file `src/physics/legPower.test.ts` (3 tests) and the switch's test in `PhysicalMode.test.ts` (1) are the difference.

- The Canyon byte check (`scripts/m1-cpu-bench.ts`, medium, 3600 steps), the same as main:
  Canyon B snapshots a367d938f15fa934, state 9e5831f80e38abd9; default Canyon ea3d57a4d49f4b48, state a1a2555739210f96.

- The headless fps trace (Canyon, `?physical&canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on`, 60 s), run
  twice, one right after the other, under the same load (four Basilisk jobs on the M1 the whole time, about 95 % of a
  core each): without the switch mean 60.5 fps, lowest second 60, from 10 s on; with `&legPower=cap` mean 60.5, lowest
  60. The trace's rider stays prone (no input), so it does not stand on steep water there; the switch only costs when
  the standing contact is solved apart (one more 6 × 6 solve in that substep).

## 6. How the owner rides it

- Canyon:
  `?physical&canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on&legPower=cap`
- The 2 m pool: Menu → Wave Pool → Waves: Barrel, with the pool switches and `&legPower=cap`, for example
  `?physical&poolSize=ref&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug&legPower=cap`.
- What to look for: on steep water (the tube's wall, a late drop) the rider should no longer be thrown at once. The body
  still stands plumb, so on a steep face he still falls, but more slowly. In normal riding nothing should change.

## Files

- `trace.probe.ts`: the leak substep by substep (section 1).
- `bars.probe.ts`: L1–L3 (section 3).
- `normal.probe.ts`: the leg power in normal riding.
- `vitest.probe.config.ts`: runs them. From the repo root:
  `OUT=/tmp/out.jsonl npx vitest run --config docs/research/board-in-water/a-lite/vitest.probe.config.ts bars`;
  `LEG_POWER=cap` turns the switch on (also for the study's probes: `../lab.ts` reads it).
- `results/`: the outputs, `-off` and `-on`.
