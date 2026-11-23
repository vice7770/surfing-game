# 3.5w: low-speed rows for the balance's model, measured on the game's board as it rides

*Surfer-track builder, Claude Opus 5.5, high effort (an implementation with open causes), 2026-11-23. Branch
`claude/plant-rows` from `claude/sideways-falls` `3a2404c6`. The owner, asked after 3.5v "Build the low-speed settings
from the game's own board next?": **"Yes, build them."** Standing rulings: the turn is not limited; the falls are a
balance that lacks the ability to stand; no hidden motors; scope changes come from him.*

**Phase 1 (this note, the attitude, the rows, the offline gains). Nothing under `src/` changes in phase 1.** §1–§6 were
written and committed before any row was measured; §7 onward were added after.

## 1. What consumes `PLANT_SPEEDS` (read in `src/physics/predictiveBalance.ts`)

- `labAt(speed, floor?)` (`:688`) is the only reader. It clamps to the table's first speed (4) and interpolates
  linearly between rows. `plantAt` (`:712`) is its only caller. No water force in the game reads it (3.4k Part D,
  re-checked by grep: outside this file only comments in `PhysicalMode.ts`, `AttachedRider.ts`, `SurfZoneSimulation.ts`).
- `plantAt` adds `railCorrection(speed, rail)` (`RAIL_PLANT`, 5/7/9 m/s, **held at the 5 m/s correction below 5**,
  rail capped by `railLimit` at 10° below 5 m/s) to the twelve, then `boardDerivatives(…, speed, 0.236)` maps them to
  the model's axes at the true speed. `lab.drag` sets `feetForward` (the hull drag the feet carry; `drag` is held at
  0.2312 below 5 m/s). `boardInertiaAt` (game-measured, rows from 4, held below) is read at the true speed.
- `heavePlantAt` / `HEAVE_PLANT` and `frozenCorrection` / `FROZEN_PLANT` are read only with `heaveSense`, which is
  `false` in `DEFAULT_WEIGHTS` and on the owner's address. They do not read `PLANT_SPEEDS`.
- From `plantAt`'s `YawPlant`: `continuousPlant` → `design` (Φ, Γ, LQR K, Kalman L, the predictor), and every helper
  built on `y` (`faceColumn`, `faceTrimPoint`, `heelColumn`, `captureRow`). `scheduledDesign` builds designs only at
  `SCHEDULE_SPEEDS` (4 to 12 every 0.5) × depths × rails; `PredictiveController.blend` clamps the speed to 4–12 and
  blends the eight nearest designs (Φ, Γ, K, L, …), and `tick` solves `steadyTurn` on the **blended** Φ, Γ.
- So below 4 m/s nothing is designed at all: every tick under 4 m/s reads the 4 m/s designs, which read row `'4'`.

**Tables that must move with the rows for consistency (proposed, §4):** the schedule's knots (rows at 3 and 3.5 m/s
reach the controller only if `SCHEDULE_SPEEDS` has knots there) and `labAt`'s clamp. **Kept as shipped, and flagged:**
the rail correction (5 m/s's held below 5), `drag` (5 m/s's held), `BOARD_INERTIA` (held at 4), the heave block.

## 2. The ridden attitude (`plant-rows-attitude.py`, `results/35w/attitude.md`)

**Sample:** 3.5v's base arms (organic seeds 1–3 and catch runs 0–9, `cue` and `cueC`, `cueLater` on and off; the off
arms are 3.5t's runs reproduced to zero differences). `standing` frames with a controller tick, |roll| ≤ 10°, ≤ 3 s
after the stand, and on falling stands only frames ≥ 0.3 s before the fall (the `before` cut). Binned by the
**schedule speed** (`ctl.speed`, the speed `tick` reads the table at: forward speed through the water along the
heading), 0.5 m/s bins centred on each row.

**Definitions:** trim = deck world pitch + the surface's fall ahead of the nose along the heading (the board's pitch
against the local surface, nose up +; on flat water the lab's trim). Immersion = the rocker line's depth under the
surface 5 cm in from the tail (`tail`) and from the nose (`nose`), m, the probe's own fields.

| schedule speed | frames / stands | **trim vs surface °** median (10–90) | **tail immersion m** | nose m | lasting stands only: trim / tail |
| --- | --- | --- | --- | --- | --- |
| 3.0 (2.75–3.25) | 205 / 31 | **14.8** (7.9–27.2) | **0.201** (0.139–0.526) | −0.272 | 8.4 / 0.143 (38 / 7) |
| 3.5 (3.25–3.75) | 480 / 47 | **15.3** (6.7–23.0) | **0.178** (0.103–0.501) | −0.322 | 7.6 / 0.151 (106 / 15) |
| 4.0 (3.75–4.25) | 684 / 54 | **10.3** (5.1–15.2) | **0.101** (0.047–0.166) | −0.287 | 7.9 / 0.082 (224 / 22) |
| 4.5 (4.25–4.75) | 606 / 55 | **7.6** (3.7–14.5) | **0.081** (0.014–0.167) | −0.222 | 7.0 / 0.074 (374 / 29) |
| 5.0 (control) | 655 / 61 | 6.2 (2.8–12.7) | 0.052 | −0.203 | 5.8 / 0.046 |
| 6.0 (control) | 1074 / 54 | 7.0 (2.7–11.0) | 0.071 | −0.208 | 7.2 / 0.072 |

Against the lab rows (`PLANT_SPEEDS` comments): `'4'` 46.4°, `'4.5'` 25.9°, `'5'` 19.3°, `'6'` 12.6° of trim. The game's
board rides at a third to a sixth of the lab's trim below 5 m/s, and at half of it at 5–6 m/s too (3.4l saw the same).
3.5v's "−5° to +7°" is the deck's **world** pitch at the stand; against the face it is the +6° to +15° above.

## 3. Method (the existing captive lab, held at the ridden attitude)

`roll-plant/plant.ts`'s `Lab` (the real `BoardBody`, the rigid 73 kg point rider at 0.915 m up and 0.30 m behind
mid-length, 32 substeps, flat still water), and `rail-dig/settled.probe.ts`'s **`frozen`** procedure unchanged: the
roll, slip, yaw rate, **pitch and the centre of mass's height held**, each derivative a central difference (roll ±1°,
slip ±1°, yaw rate ±0.1 rad/s, roll rate ±0.2 rad/s about the deck at (0, 0.07, −0.30)), each perturbation held 4 s
after 0.8 s of the base, the last 1 s kept, with the settling ladder printed. Outputs [N, Y, K]: N about the centre of
mass (world up), Y along the level left axis, K about the deck along the long axis — the table's own axes.

**Why the frozen hold:** below 4.5 m/s the free lab has no equilibrium (3.4k: 46° at 4 m/s, sunk through the bed at 3).
The frozen hold needs none: the vertical force the hull does not carry is carried by the hold. At no rail the frozen
and free tables agree within 2 % on every derivative (`FROZEN_PLANT` `'5|0'` against `RAIL_PLANT` `'5|0'`).

**The attitude:** pitch = the trim of §2; height set so the lab's tail immersion (same rocker point, 5 cm in) equals
§2's. The lab's nose immersion, wetted area, submerged volume and vertical force (Z/W) are printed as checks.

**Controls:** (i) **method**: the same probe at 5 m/s at the lab's own free-settled trim must reproduce `FROZEN_PLANT`
`'5|0'` (and `PLANT_SPEEDS['5']` on eleven of twelve; the side force per yaw rate is the known one-sided 0.6 s
reading, 37 against 9.3). (ii) **attitude**: 5 and 6 m/s at the game's attitude, reported beside the shipped rows and
**not** proposed for the table. (iii) **bracket**: 3, 3.5 and 4 m/s also at the lasting-stands attitude.

## 4. How the rows would enter (phase 2), behind one switch

- **`?plantRows=game`**: off by default, pinned off for online rooms (`main.ts` overrides), printed back from the host
  like the other 3.5 switches, routed as `plantFloor` is (`AttachedRiderOptions` → `DesignWeights.plantRows`, so the
  design cache's key carries it).
- With it on, `labAt` reads a second table, `PLANT_SPEEDS_GAME`: the measured rows `'3'`, `'3.5'`, `'4'`, `'4.5'` and
  the shipped rows from `'5'` up, unchanged. Linear between rows (4.5 → 5 interpolates the new `'4.5'` into the shipped
  `'5'`), clamped at 3 below.
- The schedule gains knots at 3 and 3.5 m/s (`blend` clamps to 3 instead of 4). Without them the 3 and 3.5 rows never
  reach the controller.
- Kept exactly as shipped: the rail correction, `drag`, `BOARD_INERTIA`, the heave block, the weights, the senses,
  the clamps. The switch changes only Φ, Γ, K, L and the reference's model below 5 m/s: no force, no authority, no motor
  (the 3.4k Part D classification carries over).
- With the switch off: `labAt`, the schedule and every design byte-identical (model check over every schedule cell,
  then the Canyon byte check: snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`).

## 5. Predictions (before any row is measured)

1. **The weathercock comes back.** N per radian of slip is negative at 3–4.5 m/s (about −40 to −110 N·m, against
   +143.8 and +41.3 in rows `'4'` and `'4.5'`): at 8–15° of trim the fins sit well aft of the centre of mass in plan.
   N per roll rate stays negative (as at 4–5.5).
2. **No sign turnover anywhere in the new table**, so `steadyTurn`'s reference has no singular speed between 3 and
   6 m/s: |β_ref| ≤ 10° for leans up to 25° (3.5o: 450° near 4.3 m/s and 35° below it).
3. **Gains (owner's weights, `riderBody: 'two'`, rail 0), on the body's bank and its rate:** at 4 m/s between the
   6 m/s design and the 4.5 m/s one, about 1.0–1.5 and 0.18–0.25 (shipped at 4: about 2.5 and 0.35; `plantFloor=6`:
   about 0.8 and 0.15); the slip gain falls by a factor of 2–5 from shipped. 3 and 3.5 m/s a little above the 4 m/s
   values, not a step.
4. **Take-offs:** the catch collapses rescued or delayed about as `plantFloor=6` did (≥ 9 of 12), organic switch-on
   falls ≥ 5 of 9; the roughest landings (raw > 14.3° at the first tick) still fall; no lasting control lost.
5. **Steering:** the sharp-steer collapses carried as 3.5o's schedule floor carried them (both seed-2 turns ≥ 3.5 s);
   the steady turn asked below 4.5 m/s becomes a coordinated one (a few degrees of slip), so the turn is not limited
   but stops pushing the board out.

## 6. Phase-2 evidence plan, with its pass and fail lines

All paired against shipped and `plantFloor=6`, one run per process, on
`?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on`, `cueC` (Compress from 0.1–0.3 s
after the stand) in every take-off comparison, by 3.5v's rule (rescue ≥ 3 s, delay ≥ +0.25 s).

| population | n | pass | fail |
| --- | --- | --- | --- |
| catch collapses (switch off) | 12 | rescued + delayed ≥ 9 | < 6, or fewer than `plantFloor=6`'s rescues minus 2 |
| organic `cueLater` on, sideways falls | 9 | ≥ 5 | ≤ 2 |
| organic `cueLater` off (not crest stalls) | 19 | ≥ 10 | ≤ 6 |
| lasting controls | 34 | 0–1 broken (fall < 3 s) | ≥ 2 broken |
| sharp-steer collapses, seeds 1–9 (3.5o) | 10 | ≥ 8 carried ≥ +1 s or rescued | ≤ 5 |
| Steer + Compress | 6 | ≥ 5 | ≤ 3 |
| seed-2 wave-2 left climb at 0.90 m | 1 | within 0.2 m/s and 5° of shipped (3.31 m/s, 46.4°) or better | slower by > 0.3 m/s |
| neutral riders (3.5o) | 59 | ≤ 2 fall ≥ 0.25 s earlier | ≥ 5 |
| 3.5p plumb grid, no input | 27 | no cell loses ≥ 0.25 s, or the losses are matched by gains | ≥ 3 cells lose |
| model: β_ref over 3–6 m/s × leans 0–25° | grid | max |β_ref| ≤ 10° | any |β_ref| > 20° |
| `npx tsc -b`, targeted tests, Canyon byte check before and after | — | pass, bytes identical | any difference |

Classification per take-off fall as 3.5v §0.5. Nothing is counted toward the pass that does not reproduce its shipped
arm first.
