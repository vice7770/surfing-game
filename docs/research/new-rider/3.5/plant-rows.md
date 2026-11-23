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

## 7. Results (added after the measurement, 2026-11-23)

### 7.1 The method control passes

`plant-rows.ts` at 5 m/s at the lab's own free trim (19.33°) reproduces `FROZEN_PLANT['5|0']` **to the digit on all
twelve** (roll −101.8, −354.6, −328.1; slip −28.7, 712, −278.8; yaw −3.3, 9.3, −7.7; rate −1.5, −14.1, −0.6). At
6 m/s (12.61°) it reproduces `PLANT_SPEEDS['6']` within 2 % on ten of twelve; the side force and roll moment per yaw
rate are 30.3 / −15.7 against the shipped 50.0 / −31.7, the known 0.6 s one-sided reading (§3). Every ladder settled
(the hold is frozen, so nothing rings). `results/35w/rows.jsonl`.

### 7.2 The rows, [N, Y, K] (N·m, N, N·m per rad, per rad, per rad/s, per rad/s; the table's axes)

| row | attitude: trim ° / tail m (lab: nose m, Z/W) | roll | slip | yaw rate | roll rate |
| --- | --- | --- | --- | --- | --- |
| **new `'3'`** | 14.8 / 0.201 (−0.305, 0.36) | −35.7, −137.7, −187.3 | −29.4, 273.8, −133.5 | −3.4, 11.2, −8.0 | −0.1, −9.1, −0.3 |
| **new `'3.5'`** | 15.3 / 0.178 (−0.342, 0.38) | −20.2, −183.4, −156.1 | −37.1, 367.7, −161.5 | −3.7, 12.4, −8.3 | −0.2, −10.4, −0.9 |
| **new `'4'`** | 10.3 / 0.101 (−0.278, 0.33) | −24.9, −121.3, −218.2 | −92.6, 471.1, −157.9 | −6.6, 24.8, −9.9 | 1.6, −11.8, −1.4 |
| **new `'4.5'`** | 7.6 / 0.081 (−0.220, 0.37) | −22.6, −155.5, −170.5 | −141.4, 608.6, −252.2 | −10.4, 33.3, −15.9 | 2.4, −13.4, −1.3 |
| shipped `'4'` | 46.4° / draft 0.513 | −37.2, −177.6, −268.7 | +143.8, 343.8, −63.0 | −18.7, 43.0, −61.3 | −7.69, −8.0, −4.33 |
| shipped `'4.5'` | 25.9° / 0.293 | −98.0, −326.6, −322.0 | +41.3, 550.0, −191.4 | −3.8, 31.0, −32.5 | −3.52, −12.0, −1.51 |
| shipped `'5'` | 19.3° / 0.215 | −98.0, −361.0, −310.0 | −28.6, 704.7, −272.7 | −3.3, 37.0, −30.0 | −1.63, −13.9, −0.84 |
| shipped `'5.5'` | 15.3° / 0.166 | −98.5, −383.9, −299.7 | −95.1, 865.2, −354.1 | −5.1, 43.0, −30.7 | −0.27, −15.55, −0.43 |
| shipped `'6'` | 12.6° / 0.133 | −105.4, −395.3, −296.8 | −161.0, 1031.3, −411.4 | −7.6, 50.0, −31.7 | 0.87, −17.0, −0.62 |
| control: 5 m/s at the game's 6.2° / 0.052 | (Z/W 0.33) | −38.2, −125.5, −270.7 | −192.3, 731.9, −249.0 | −12.9, 40.4, −15.3 | 3.2, −14.6, −2.4 |
| control: 6 m/s at the game's 7.0° / 0.071 | (Z/W 0.41) | −37.1, −249.6, −146.1 | −256.9, 1059.0, −418.6 | −14.5, 45.5, −20.6 | 3.3, −17.4, −1.5 |

Bracket at the lasting stands' attitude (§2): `'3'` 8.4° / 0.143: roll −41.5, −127.5, −212.0; slip −55.1, 289.4,
−168.0. `'3.5'` 7.6° / 0.151: −75.9, −170.3, −209.2; −77.7, 395.6, −237.3. `'4'` and `'4.5'` within 10–25 % of the
primary rows (`rows.jsonl`, tag `lasting`).

**Prediction 1 holds:** N per slip is negative at every new row (−29 to −141; shipped +144 and +41), so the weathercock
is back. N per roll rate is −0.1 / −0.2 at 3 / 3.5 and +1.6 / +2.4 at 4 / 4.5 (I predicted negative; all four are
within ±2.4 of zero). **The side force and roll moment per roll are about half the shipped 5 m/s row's** (Y −121 to
−183 against −361; K −156 to −218 against −310), and so is everything the hull's lift carries.

### 7.3 The doubt that decides the next step: at the game's geometry the flat-water lab carries a third of the weight

At the ridden trim and tail immersion, the lab's hull carries **Z/W = 0.33–0.38** of the pair's weight at 3–4.5 m/s
(and 0.33 / 0.41 at the 5 / 6 m/s controls). The game's hull at the same schedule speeds carries **Fp + Fb = 0.71–0.78
W** (`attitude.md`, `before` cut). A bisection on the tail immersion at 4 m/s and 10.3° could not reach 0.71 W at all:
fully sunk (tail 0.60 m, nose under) it gives 0.38 W. So the game's hull on the face meets roughly **twice the dynamic
pressure** the lab's meets at the same horizontal speed through the water and the same geometry. The extra is the
face's flow: the board descends the face while the water rises up it, which the horizontal `speed` the schedule reads
leaves out. Pressure scales with the square of the flow; a factor of 2.1 in support is a factor of about 1.45 in speed,
which puts the game's hull at schedule 4 m/s near the lab at about 6 m/s. That is one reading of why `plantFloor=6`
works (3.5v). **It is an inference from support alone, not a measured derivative.**

### 7.4 The gains and the reference the controller would apply (`plant-rows-gains.ts`, owner's weights, rail 0)

The ankle row of the blended design `blend` returns, bank / bank rate / slip / yaw rate. `game` = the primary rows with
knots at 3 and 3.5; `load` = the same rows × (game support / lab support), 2.0–2.2, a sensitivity only.

**Tall (depth 0):**

| schedule m/s | shipped | `plantFloor=6` | **game rows** | lasting rows | load-scaled |
| --- | --- | --- | --- | --- | --- |
| 3.0 | 2.73 / 0.35 / −0.09 / 0.05 | 0.76 / 0.17 / 0.25 / −0.14 | **5.30 / 0.89 / 0.78 / −0.30** | 5.13 / 0.84 / 0.60 / −0.22 | 2.12 / 0.47 / 0.75 / −0.23 |
| 3.5 | (= 4.0) | (= 4.0) | **4.70 / 0.79 / 0.95 / −0.27** | 3.49 / 0.57 / 0.52 / −0.14 | 2.02 / 0.43 / 0.85 / −0.21 |
| 4.0 | 2.73 / 0.35 / −0.09 / 0.05 | 0.76 / 0.17 / 0.25 / −0.14 | **4.17 / 0.68 / 0.83 / −0.22** | 4.62 / 0.74 / 0.85 / −0.22 | 2.10 / 0.41 / 0.73 / −0.18 |
| 4.5 | 2.04 / 0.27 / 0.14 / 0.07 | 0.72 / 0.16 / 0.23 / −0.13 | **3.93 / 0.64 / 0.85 / −0.20** | 4.05 / 0.66 / 0.86 / −0.20 | 2.05 / 0.40 / 0.75 / −0.17 |
| 5.0 | 1.96 / 0.27 / 0.48 / 0.10 | 0.71 / 0.15 / 0.23 / −0.12 | (shipped) | (shipped) | (shipped) |
| 5.5 | 0.93 / 0.17 / 0.39 / −0.08 | 0.71 / 0.15 / 0.23 / −0.12 | (shipped) | | |
| 6.0 | 0.72 / 0.15 / 0.24 / −0.12 | same | (shipped) | | |

**Compress (depth 0.3, the owner's way):**

| schedule m/s | shipped | `plantFloor=6` | **game rows** | lasting rows | load-scaled |
| --- | --- | --- | --- | --- | --- |
| 3.0 | 2.23 / 0.35 / 0.69 / −0.03 | 0.97 / 0.17 / 0.39 / −0.10 | **3.99 / 0.57 / 0.42 / −0.21** | 3.56 / 0.49 / 0.14 / −0.11 | 1.58 / 0.29 / 0.48 / −0.17 |
| 3.5 | (= 4.0) | (= 4.0) | **3.96 / 0.57 / 0.66 / −0.21** | 3.06 / 0.39 / 0.10 / −0.02 | 1.74 / 0.31 / 0.69 / −0.17 |
| 4.0 | 2.23 / 0.35 / 0.69 / −0.03 | 0.97 / 0.17 / 0.39 / −0.10 | **3.17 / 0.44 / 0.53 / −0.15** | 3.70 / 0.50 / 0.52 / −0.14 | 1.25 / 0.21 / 0.40 / −0.11 |
| 4.5 | 1.44 / 0.19 / 0.13 / 0.04 | 0.94 / 0.16 / 0.38 / −0.09 | **3.28 / 0.45 / 0.55 / −0.13** | 3.38 / 0.46 / 0.55 / −0.13 | 1.32 / 0.22 / 0.42 / −0.10 |
| 5.0 | 1.50 / 0.20 / 0.36 / 0.06 | 0.93 / 0.16 / 0.38 / −0.09 | (shipped) | | |
| 6.0 | 0.93 / 0.15 / 0.40 / −0.08 | same | (shipped) | | |

Nominal least damping of each design's own closed loop (no timing error) is 0.57–0.67 at every knot in every variant:
the model alone does not separate them; the ride does (3.5v).

**The reference, `steadyTurn` on the blended model, leans 1–25°, 3–6 m/s** (β_ref at a 21° lean; the worst anywhere):

| | 3.0 | 3.5 | 4.0 | 4.5 | 5.0 | 6.0 | worst |β_ref| |
| --- | --- | --- | --- | --- | --- | --- | --- |
| shipped, tall | 34.8 | 34.8 | 34.8 | 5.2 | 4.7 | 2.5 | **546° at 4.3 m/s** |
| `plantFloor=6` | −1.3 | −1.3 | −1.3 | −0.5 | 1.8 | 2.5 | 3.0° |
| **game rows** | **−27.1** | **−33.8** | **−28.9** | **−22.8** | 4.7 | 2.5 | **41° (tall), 55° (Compress) at 3.5 m/s** |

With the 5 m/s rail correction zeroed below 5 (a diagnostic, `RAILZERO=1`, `gains-*-railzero.jsonl`) the game rows'
reference is worse (singular near 3.6–3.75 m/s), so the held rail correction is not what tips it.

### 7.5 Against the predictions

1. Weathercock back: **yes** (N per slip −29 to −141).
2. No singular speed, |β_ref| ≤ 10°: **half.** The 546° spike at 4.3 m/s is gone, but the reference asks 23–45° of
   sideslip **the other way** at 3–4.5 m/s for a 21° lean (worst 41° tall, 55° Compress). **Fail by §6's model line
   (> 20°).**
3. Gains lower than shipped: **no, the opposite.** The bank gain rises to 3.2–5.3 (shipped 2.2–2.7, `plantFloor=6`
   0.76–0.97) because the measured rows carry half the water's righting and side force. Only the load-scaled
   sensitivity lands between shipped and `plantFloor=6` (1.3–2.1).
4–5. Not tested (phase 2).

### 7.6 What this says about the approach

The rows are a faithful captive measurement at the game's geometry, and the geometry is the right one. They are not the
water the game's board is in: on the face the hull carries twice the support, so a flat-water row at the same
horizontal speed under-states every lift-borne derivative by about half. Designed on them, the balance would be
**stiffer than shipped** and its reference would ask a large wrong-way sideslip in a turn. **I do not recommend phase 2
on these rows.** Options for the coordinator and Vicente, none built:

- **(a) Rows measured with the face's flow** (the next measurement): the same frozen hold at the ridden geometry plus
  a held heave rate (`Hold.heaveRate`, already in the lab) or an imposed upward flow, sized so the hull carries the
  game's 0.71–0.78 W; first check that this reproduces the game's own per-tick side force and roll moment (3.4l's
  `yGame`/`kGame` instrument) before any design.
- **(b) Read the existing table at an effective speed**, √(game support / lab support) × the schedule speed (about
  1.45×), which is the arithmetic behind §7.3 and close to what `plantFloor=6` does by accident. A model-only change;
  it would need its own check against the game's forces.
- **(c) `plantFloor=6`** as 3.5v measured it (0 of 34 controls lost), with its reference already well behaved (|β_ref|
  ≤ 3°).

Phase-1 files: `plant-rows-attitude.py`, `plant-rows.ts`, `plant-rows-gains.ts`; `results/35w/attitude.md`,
`rows.jsonl`, `gains-<shipped|pf6|game|lasting>.jsonl`, `gains-<game|shipped>-railzero.jsonl` (the `load` variant
stopped in the damping step on a non-converging eigenvalue at depth 0.3, 5 m/s; its gains and Compress damping to
4.5 m/s are in `gains-load.jsonl`).

## 8. Phase 2: the equivalent-speed table (pre-registered before any check or arm, 2026-11-23)

**The owner's choice.** Asked "Which fix should phase 2 build and test?", Vicente chose **"Equivalent-speed table"**
(2026-11-23), §7.6's option (b). The coordinator's review of phase 1 is on the record at `1a320c1b`.

### 8.1 A correction to §7.3, found while designing the map (it changes the map's basis, not the owner's choice)

**§7.3's support figures are wrong by a factor of 1.966.** `plant-rows.ts` divides the vertical force by
`(73 + board.mass) · g`, but `BoardBody.mass` already includes the payloads (`BoardBody.ts:558`, shape mass plus the
73 kg rider), so the weight was counted twice. The check that exposes it is in the data: at the lab's own free trim,
where the towed board is in vertical equilibrium by construction, the probe printed Z/W = **0.509** at both 5 and
6 m/s; corrected it is **1.001**. Corrected (× 148.54 / 75.54):

| row | lab Z/W at the ridden geometry (corrected) | game Fp + Fb (`attitude.md`) | lab / game |
| --- | --- | --- | --- |
| 3 | 0.704 | 0.78 | 0.90 |
| 3.5 | 0.743 | 0.77 | 0.96 |
| 4 | 0.653 | 0.71 | 0.92 |
| 4.5 | 0.722 | 0.74 | 0.98 |
| 5 (control) | 0.643 | 0.68 | 0.95 |
| 6 (control) | 0.808 | 0.88 | 0.92 |

**So at the game's geometry the flat-water lab carries 90–98 % of the support the game's hull carries.** The "twice the
dynamic pressure" inference and its "about 1.45×" are withdrawn. Two consequences, stated before anything runs:
- §7.2's rows are, by this measure, the water the board is actually in (the remaining 2–10 % and the face's slope are
  the unmeasured part). Both the game's hull and the lab's carry only about three quarters of the weight there: the
  board is not in vertical equilibrium; it is descending the face.
- **The equivalent speed is therefore not a better model of the water; it reads a stiffer water than the board meets**
  (the shipped free-trim rows at about 1.6–1.7× the speed have the board's geometry *and* the full weight carried).
  Its basis is the attitude match (below) and 3.5v's evidence that `plantFloor=6` (also a stiffer water) holds the
  landings. Read as a design choice: the balance's model and gains are those of a faster board. Whether that stands
  the board up is what the arms test. (The §7.4 gains on the true rows rise, which fits: the LQR on the weaker water
  asks for more, and more is what 3.5v showed growing into the fall.)

### 8.2 The map

**Form: one constant factor, v_eq = min(12, k · v), k = 1.68.** k is the mean of ten matches of the game's ridden
attitude (`attitude.md`, `before` cut) to the shipped table's own free-trim rows (`PLANT_SPEEDS`' comments), by trim and
by draft, linear between rows on the table's monotone stretch (4–7.5 m/s), at the five row speeds 3–5 m/s (the lab's
deepest patch and the game's tail point agree to 3–5 mm in §7.2, so the two measures are comparable):

| game v | trim / tail | speed with that trim | ratio | speed with that draft | ratio |
| --- | --- | --- | --- | --- | --- |
| 3.0 | 14.8° / 0.201 | 5.59 | 1.864 | 5.14 | 1.714 |
| 3.5 | 15.3° / 0.178 | 5.50 | 1.571 | 5.38 | 1.536 |
| 4.0 | 10.3° / 0.101 | 6.63 | 1.658 | 6.72 | 1.681 |
| 4.5 | 7.6° / 0.081 | 7.69 | 1.708 | 7.57 | 1.682 |
| 5.0 | 6.2° / 0.052 | 7.91 | 1.581 | 8.86 | 1.772 |

Mean 16.767 / 10 = **1.677 → 1.68** (spread 1.54–1.86). The coordinator's own match (3.5 → 5.5, 4 → 6.5, 4.5 → 7.5,
5 → 8) gives 1.57–1.67. At 5.5 and 6 m/s the same match gives 1.45 and 1.29 (the game's trim stops falling while the
table's keeps falling); a constant factor over-reads there, which the neutral riders and the grid test.

- **Above the table:** every water table already clamps at its top (`PLANT_SPEEDS` 12, the rail and heave tables 9);
  v_eq is capped at 12, so every schedule speed ≥ 7.14 m/s reads the 12 m/s rows.
- **Below the table:** with the switch on, the schedule gains knots at **3 and 3.5 m/s** (true speed), whose water is
  read at 5.04 and 5.88; below 3 m/s the controller holds the 3 m/s design, as the shipped one holds 4's. **No design
  with the switch on reads row `'4'` or `'4.5'`.**

### 8.3 The switch, and what reads v_eq

**`?plantSpeed=face`**: off by default, one value only, pinned off for online rooms in `main.ts`, printed back from the
host by the probes (`kind: 'built'`). Routed as `plantFloor` is: `PhysicalMode.plantSpeedSwitch` →
`SurfZoneConfig.plantSpeed` → `SurfZoneRunner` → `RideSessionOptions` → `AttachedRiderOptions` →
`DesignWeights.plantSpeed`, so the design cache's key carries it.

| consumer | with the switch on | why |
| --- | --- | --- |
| `labAt`'s twelve derivatives | **v_eq** | the water's table |
| `railCorrection` (`RAIL_PLANT`), `railLimit` in `blend` | **v_eq** | the water's table, and the rail range that table has at the speed read |
| `railPull` in `AttachedRider`'s schedule rail | **v_eq** | the same table's pull, so the design point and the table agree |
| `frozenCorrection`, `heavePlantAt` (only with `heaveSense`, off) | **v_eq** | the water's tables |
| `steadyTurn`'s reference, `faceColumn`, `faceTrimPoint`, `heelColumn`, `captureRow` | through the design | built on the same `YawPlant` |
| `lab.drag` → `feetForward` | **true v** | the terminal glide's measured drag (`bars.probe.ts`), not a captive derivative |
| `boardInertiaAt` | **true v** | measured in the game (3.2e), not in the lab |
| the kinematic V (`boardDerivatives`' sweep, the slip row's V, `holdLine`'s coordinated lean) | **true v** | kinematics, not water |
| weights, senses, delay, the ankle and twist clamps, the stick, the lean cap | unchanged | — |

No force, clamp, authority or stick change; the only thing that moves outside the model is the ankle's commanded rest
and the twist's commanded torque, as with `plantFloor` (3.4k Part D). **Off, everything byte-identical**: `labAt`,
`plantAt` and every schedule cell compared bit for bit with and without the field absent, then the Canyon byte check.

**With `plantFloor`:** the floor clamps the lookup **after** the map, `labAt(v_eq, floor)`. With k · 3 = 5.04, floors
4.5 and 5 are inert under the switch; floor 6 lifts v_eq < 6 (v < 3.57). Not combined in any arm.

### 8.4 Model checks, offline, before any arm (`plant-rows-gains.ts`, `VARIANT=face`)

Gains per schedule speed 3–9 m/s (tall and Compress), shipped / `plantFloor=6` / face; nominal damping at the knots;
`steadyTurn`'s β_ref at a 21° lean (and the worst over 1–25°) at 3–9 m/s. **Pass: no singular speed and |β_ref| ≤ 10°
at every speed (21° lean). Fail → stop and report before any arm.**

**Predicted:** at 3–4.5 m/s the face design equals the shipped 5–7.5 m/s designs' water with the true kinematics, so
Compress bank gain about 0.9–1.5 and its rate 0.15–0.20 (shipped at 4: 2.23 / 0.35; `plantFloor=6`: 0.97 / 0.17);
|β_ref| ≤ 5° at 3–7 m/s; at ≥ 7.14 m/s the 12 m/s water, gains within ±30 % of shipped there.

### 8.5 Arms, pass and fail lines

Paired by stand against shipped and `plantFloor=6`, one run per process, the owner's address, `cue` and `cueC`; 3.5v's
rule (rescue ≥ 3 s, delay ≥ +0.25 s, worse ≤ −0.25 s). Order: model, take-offs, steering, grid.

| population | n | pass | fail |
| --- | --- | --- | --- |
| organic `cueLater` on, sideways falls | 9 | rescued + delayed ≥ `plantFloor=6`'s (6) | < 4 |
| organic `cueLater` off, not crest stalls | 19 | ≥ `plantFloor=6`'s (12) | < 9 |
| catch collapses (switch off) | 12 | ≥ `plantFloor=6`'s (12; 9 rescued) | < 9 |
| lasting controls | 34 | none lost (all ≥ 3 s) | any lost |
| sharp-steer collapses, seeds 1–9 | 10 | no worse than shipped on the paired median, and none worse by ≥ 0.25 s; reported against `plantFloor=4.5` | median worse, or ≥ 2 worse |
| Steer + Compress | 6 | as above | as above |
| seed-2 wave-2 left climb at 0.90 m | 1 | within 0.1 m/s and 2° of shipped (3.31 m/s, 46.4°) | outside |
| neutral riders | 59 | paired median Δ within ±0.1 s | outside |
| 3.5p plumb grid, no input | 27 | paired median Δ ≥ −0.1 s and ≤ 2 cells worse by ≥ 0.25 s | otherwise |
| `npx tsc -b`, targeted tests incl. a new map/switch test, Canyon byte check before and after | — | pass; `a367d938f15fa934` / `9e5831f80e38abd9` both times | any difference |

**Predicted:** take-offs about as `plantFloor=6` (both read ≥ 5–6 m/s water at these speeds); controls kept;
sharp-steer carried like 3.5o's schedule floor; the neutral riders and the grid within ±0.1 s, with the risk at
≥ 6 m/s, where a constant factor reads the 10–12 m/s water.

### 8.6 Model checks (run after §8.1–§8.5 were committed at `0ddd042a`; `results/35w/model-<variant>.jsonl`)

Built: `DesignWeights.plantSpeed`, `equivalentSpeed`, `tableSpeedFor`, `SCHEDULE_SPEEDS_FACE`, `plantAt`'s `tableSpeed`,
the route to `?plantSpeed=face`, `main.ts`'s pin, and `src/physics/plantSpeed.test.ts` (off is bit for bit the shipped
plant; on reads the water at v_eq and the kinematics, drag and inertia at v; the controller holds the 3 m/s design
below 3). Owner's weights (`riderBody: 'two'`), rail 0; the ankle row of the design `blend` returns.

**Gains, bank / bank rate / slip / yaw rate, Compress (depth 0.3):**

| schedule m/s | shipped | `plantFloor=6` | **face** | `plantFloor=4.5` |
| --- | --- | --- | --- | --- |
| 3.0 | 2.23 / 0.35 / 0.69 / −0.03 | 0.97 / 0.17 / 0.39 / −0.10 | **1.57 / 0.23 / 0.37 / 0.05** | 1.43 / 0.19 / 0.10 / 0.05 |
| 3.5 | (= 4) | (= 4) | **1.05 / 0.19 / 0.44 / −0.11** | (= 4) |
| 4.0 | 2.23 / 0.35 / 0.69 / −0.03 | 0.97 / 0.17 / 0.39 / −0.10 | **0.94 / 0.17 / 0.36 / −0.10** | 1.43 / 0.19 / 0.10 / 0.05 |
| 4.5 | 1.44 / 0.19 / 0.13 / 0.04 | 0.94 / 0.16 / 0.38 / −0.09 | **1.28 / 0.22 / 0.50 / −0.11** | 1.44 / 0.19 / 0.13 / 0.04 |
| 5.0 | 1.50 / 0.20 / 0.36 / 0.06 | 0.93 / 0.16 / 0.38 / −0.09 | **1.00 / 0.17 / 0.40 / −0.09** | (= shipped) |
| 5.5 | 1.34 / 0.20 / 0.62 / −0.02 | 0.93 / 0.15 / 0.39 / −0.08 | **0.78 / 0.14 / 0.30 / −0.08** | |
| 6.0 | 0.93 / 0.15 / 0.40 / −0.08 | (= shipped) | **0.78 / 0.14 / 0.32 / −0.08** | |
| 7.0 | 0.84 / 0.14 / 0.36 / −0.08 | | **0.60 / 0.11 / 0.20 / −0.07** | |
| 7.5 | 1.22 / 0.19 / 0.52 / −0.10 | | **0.58 / 0.11 / 0.17 / −0.06** | |
| 8.0 | 0.98 / 0.16 / 0.41 / −0.08 | | **0.57 / 0.10 / 0.18 / −0.06** | |
| 9.0 | 0.70 / 0.12 / 0.32 / −0.07 | | **0.56 / 0.10 / 0.18 / −0.06** | |

**Tall (depth 0):** face 2.02 / 0.31 at 3.0, 0.77 / 0.18 at 3.5, 0.95 / 0.21 at 4.0, 1.21 / 0.25 at 4.5, 0.90–1.02 at
5–6.5, 0.82–0.86 at 7–9 (shipped 2.73 / 0.35 at ≤ 4, 2.04 at 4.5, 0.72–1.96 at 5–9; `plantFloor=6` 0.71–0.76 below 6).

**Nominal least damping** of each design's own loop: face 0.59–0.68 at every knot 3–9 m/s (shipped 0.57–0.65,
`plantFloor=6` 0.59–0.65). Not a discriminator, as in §7.4.

**The reference, β_ref at a 21° lean (°):**

| | 3.0 | 3.5 | 4.0 | 4.5 | 5.0 | 6.0 | 7.0 | 8.0 | 9.0 | cells with \|β_ref\| > 10°, leans 1–25°, 3–9 m/s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| shipped, tall | 34.8 | 34.8 | 34.8 | 5.2 | 4.7 | 2.5 | 1.6 | 1.5 | 1.1 | 515 (3–5.15 m/s, every lean); worst 546° at 4.3 |
| `plantFloor=6` | −1.3 | −1.3 | −1.3 | −0.5 | 1.8 | 2.5 | 1.6 | 1.5 | 1.1 | 0 |
| `plantFloor=4.5` | 4.9 | 4.9 | 4.9 | 5.2 | 4.7 | 2.5 | 1.6 | 1.5 | 1.1 | 41 (leans 1–6°); worst −389° at 4.5 |
| **face, tall** | **0.5** | **−0.7** | **−0.8** | **−1.1** | **−0.3** | **0.1** | **0.1** | **0.2** | **0.4** | **2** (3.0–3.1 m/s, leans 1–2°); worst −13.4° |
| **face, Compress** | 0.6 | −0.7 | −0.8 | −1.2 | −0.3 | 0.1 | 0.1 | 0.2 | 0.3 | **1** (3.05 m/s, lean 2°): −46.9° |

**Verdict on §8.4's line: PASS** — |β_ref| ≤ 1.2° at a 21° lean at every speed 3–9 m/s, no singular speed along it.
**Flagged:** a residual corner at the bottom knot, 3.0–3.1 m/s with a 1–2° lean (3 of 3 025 cells; −47° in
Compress at 3.05 m/s), the same kind as 3.5o's second corner; `plantFloor=6` has none. The 3 m/s design reads row
`'5'` (v_eq 5.04), whose yaw moment per slip (−28.6) is the table's smallest, with the true V of 3. Prediction check:
Compress gains at 3.5–5 m/s 0.94–1.28 (predicted 0.9–1.5, held), but 1.57 at 3.0; above 7 m/s the face gains are
30–55 % **below** shipped (predicted within ±30 %: missed), because 7.14 m/s and up read the 12 m/s water.

### 8.7 Take-offs (`plant-rows-takeoffs.py`, `results/35w/takeoffs.md`)

**Reproduction first.** Shipped and `plantFloor=6` are 3.5v's own arms (`results/35v/data`, the same probe). On this
branch, with the switch off, catch runs 2 and 7 (`cue`, base) and run 2 (`cueC`, `plantFloor=6`) were re-run and
compared frame by frame with 3.5v's files: **zero differences** in every value 3.5v kept (7 043, 7 931 and 6 650
fields; the summaries differ only in wall-clock seconds). The face arm (`fs`) prints its build back as
`plantSpeed: 'face'` on every stand. Every pair below has the same stand time and speed (no unpaired stand).

| population | n | `plantFloor=6`: rescue / delay / none / worse, median Δ | **face** | pass line | verdict |
| --- | --- | --- | --- | --- | --- |
| organic `cueLater` on, sideways falls | 9 | 2 / 4 / 3 / 0, +0.50 | **3 / 4 / 2 / 0, +0.58** | ≥ 6 helped | pass (7) |
| organic `cueLater` off, not crest stalls | 19 | 4 / 8 / 6 / 1, +0.53 | **4 / 8 / 4 / 3, +0.67** | ≥ 12 helped | pass (12) |
| catch collapses | 12 | 9 / 3 / 0 / 0, +2.08 | **10 / 2 / 0 / 0, +2.08** | ≥ 12 helped | pass (12) |
| lasting controls | 34 | 34 kept | **32 kept, 2 lost** | none lost | **FAIL** |

**The two lost controls are the same rider, s1w6 `cueC`, on both cue arms** (organic `cueLater` on: falls at 2.45 s;
off: 2.87 s; shipped and `plantFloor=6` carry both). It is not a take-off fall. The stand lands at 4.4–4.9 m/s and
the board accelerates down the face to **7–8 m/s**, where the face design reads the **12 m/s water** (v_eq capped). There
the board's roll drifts from 1–2° to 60° over about 2 s (+8° at +1.4 s, +20° at +2.0 s) and the body's bank follows it,
while the raw ankle command stays at 1–3°: **a slow lean divergence the low-gain design does not correct**. The
shipped design on the same stand holds the roll within ±4° with commands of the same size and the other sign. This is
§8.2's flagged risk (a constant factor over-reads above about 5.5 m/s, where the attitude match gives 1.29–1.45, not
1.68) and §8.6's missed prediction (gains 30–55 % below shipped above 7 m/s).

On the falls the face arm does as well as or better than `plantFloor=6` everywhere: 7 against 6, 12 against 12 and
12 against 12 helped. The three "worse" stands on the switch-off organic arm are s1w7 `cue` (`plantFloor=6` is
worse there too) and s3w2 ×2 (1.13 → 0.88 and 1.18 → 0.83 s; s3w2 is 3.5v's pop-up-separation wave).
**By the pre-registered line, the take-offs fail on the controls.** Steering and the grid ran in parallel with this
read and are reported below as measured.

### 8.8 Steering (`plant-rows-steer.py`, `results/35w/steer.md`; `sharp-steer.ts`, PERIODS 12, STAND_HOLD 5)

**Reproduction:** this round's shipped arm reproduces 3.5o's shipped population **435 of 435 riders to the identical
fall time**, so 3.5o's `plantFloor=4.5` arm is a valid comparison. Every arm printed its build back.

| | n | shipped median | `plantFloor=4.5` (3.5o) | `plantFloor=6` | **face** | pass line | verdict |
| --- | --- | --- | --- | --- | --- | --- | --- |
| sharp-steer collapses, steer only | 10 | 0.717 | 10 later, +2.083, median 3.067 | 10 later, +1.992, median 2.900 | **10 later, +1.217, median 2.042; none worse** | no worse than shipped | pass |
| Steer + Compress collapses | 6 | 0.842 | 6 later, +0.933 | 6 later, +1.125 | **6 later, +1.100; none worse** | no worse than shipped | pass |
| seed-2 wave-2 left climb at 0.90 m | 1 | +2.783 s, 3.31 m/s, 46.4° | — | not reached (falls 2.717) | **not reached: falls at 0.900 s** | within 0.1 m/s, 2° | **FAIL** |
| neutral riders, steer only | 59 | — | — | median +0.000 (9 worse ≥ 0.25 s) | **median +0.000 (11 worse)** | median within ±0.1 s | pass |
| neutral riders, Compress seeds | 20 | — | — | +0.017 (2 worse) | +0.000 (3 worse) | | |
| every steered rider, steer only | 118 | — | — | median +0.050, 22 worse | **median +0.033, 32 worse** | (not pre-registered) | |
| every steered rider, Compress | 40 | — | — | median +0.300, 4 worse | **median +0.150, 11 worse** | (not pre-registered) | |

**The climb fails, and its mechanism is the same as the lost control's.** On seed 2 wave 2 the left turn is asked at
6–7 m/s through the water; with the face design (the 10–12 m/s water) the lean ask ramps 0 → 40° in 0.4 s while the
board's course stays at +2° to −2° (shipped turns to +48°) and the board rolls to 13°: it leans without turning and
falls at +0.90 s. The face arm's six largest steering losses are all riders the shipped balance carried 3.7–5 s at
higher speed (s3w5 L/R, s1w6 R, s4w3 L, s2w2 L, s9w1 L: 5.00 → 0.97 s and similar).

### 8.9 The plumb grid (`results/35w/grid.md`; `straight-fall.ts` GRID=1, 3.5p's 27 cells, no input)

Shipped reproduces 3.5p's published column in **27 of 27 cells**. `plantFloor=6`: 23 same, median +0.000, none worse
(the grid's base speed is 7.7 m/s, above its floor). **Face: all 27 cells fall earlier, median −1.167 s (−0.73 to
−2.27), median fall 1.350 s against 2.533.** Pass line (median ≥ −0.1 s, ≤ 2 cells worse): **FAIL.** The cells start at
7.7 m/s, so every face design there reads the 12 m/s water.

### 8.10 Checks

- `npx tsc -b`: clean. Targeted tests: `src/physics/plantSpeed.test.ts` (new: the map, off bit for bit, on reads
  v_eq, the 3 m/s hold), `src/physics/predictiveBalance.test.ts`, `src/game/PhysicalMode.test.ts` (new: the switch,
  its parse, the online pin): **147 of 147 pass.**
- Canyon byte check (Medium, 3 600 steps, fresh spin-up): **before** (`0ddd042a`, before any `src/` change):
  snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`. **After** (`09294147`, the switch in `src/`, off): snapshots
  `a367d938f15fa934`, state `9e5831f80e38abd9`. **Identical** (`results/35w/canyon-byte-check.txt`).

### 8.11 Verdict and what it says

**Phase 2 fails its pre-registered lines, on one cause.** The model check passed (|β_ref| ≤ 1.2° at a 21° lean,
3–9 m/s). The equivalent speed does what it was built for at 3–5 m/s: the take-off falls are helped as often as or more
often than with `plantFloor=6` (7, 12 and 12 against 6, 12 and 12) and every sharp-steer collapse is later than shipped
(16 of 16). **But a single factor of 1.68 reads the 10–12 m/s water at 6–8 m/s**, where the shipped design already
holds, and there the low-gain design lets the board lean away slowly (2 of 34 lasting controls lost, the climb's
survivor lost, all 27 grid cells 0.7–2.3 s earlier). Both were named as risks before any arm ran (§8.2, §8.6).

What the measurements point to, for the coordinator and Vicente (nothing here is built):

1. **A map that returns to the speed itself above about 5 m/s** (e.g. v_eq = 1.68 v up to 3 m/s, tapering to v by
   5.5–6 m/s), which is what the attitude match itself says (1.29–1.45 at 5.5–6 m/s) and what `plantFloor=6` already
   is in effect: it changes nothing at or above 6 m/s, which is why it loses no control and moves no grid cell. That
   is a new pre-registration and a new run of these arms.
2. **`plantFloor=6` as it stands** (3.5v and here: 0 of 34 controls lost, the grid untouched, the collapses carried
   further than face, its climb survivor falls at 2.72 s rather than 3.70 s).
3. §8.1's reading stands whichever is chosen: these are stiffer-than-real designs; the board's own water at 3–4.5 m/s
   (§7.2) asks for higher gains, not lower, and 3.5v's falls show higher gains failing.

## 9. Phase 3: the tapered table, `?plantSpeed=taper` (pre-registered before any check or arm, 2026-11-23)

**The owner's choice.** After phase 2, asked "Build the tapered table, or pause until the weekly reset?", Vicente chose
**"Build the tapered table"** (2026-11-23), §8.11's option 1. His standing rulings hold: the turn is not to be limited;
the falls come from a balance that lacks the ability to stand; no hidden motors.

### 9.1 The map

**v_eq = max(v, min(1.68 v, V_CAP)), V_CAP = 7.8 m/s.** A second value of the same switch; `face` stays as it is.

**V_CAP is the plateau of the attitude match.** §8.2's method (the game's ridden attitude, `attitude.md`'s `before`
cut, matched to `PLANT_SPEEDS`' own free-trim rows, linear between rows), carried to 5.5 and 6 m/s:

| game v | trim / tail | speed with that trim | speed with that draft |
| --- | --- | --- | --- |
| 4.5 | 7.65° / 0.081 | 7.68 | 7.57 |
| 5.0 | 6.2° / 0.052 | 7.91 | (8.86) |
| 5.5 | 5.85° / 0.057 | 7.96 | 7.98 |
| 6.0 | 7.03° / 0.071 | 7.78 | 7.74 |

(7.5 → 8 m/s rows: trim 8.8° → 5.6°, draft 0.085 → 0.056 m.) The 5.0 m/s draft match (0.052 m) lies below row `'8'`'s
draft and is read off the 8.5 → 9 stretch, where the table's draft is not monotone (0.056, 0.070, 0.045); it is left
out. **Mean of the other seven: 7.803 → V_CAP = 7.8 m/s** (spread 7.57–7.98; the median of all eight is 7.85).

| true v | 3 | 3.5 | 4 | 4.5 | 4.643 | 5 | 6 | 7 | 7.5 | 7.8 | 8 | 9 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `face` v_eq | 5.04 | 5.88 | 6.72 | 7.56 | 7.80 | 8.40 | 10.08 | 11.76 | 12 | 12 | 12 | 12 |
| **`taper` v_eq** | 5.04 | 5.88 | 6.72 | 7.56 | 7.80 | **7.80** | **7.80** | **7.80** | **7.80** | **7.80** | **8** | **9** |

- **Below V_CAP / 1.68 = 4.643 m/s** it is `face`, bit for bit (the take-off gains).
- **4.643 m/s to 7.8 m/s** it reads the plateau's water, 7.8 m/s, with the true kinematics.
- **At and above 7.8 m/s** it is the speed itself: the shipped plant.
- Continuous and monotone (non-decreasing); the 3 and 3.5 m/s knots are kept (`SCHEDULE_SPEEDS_FACE`); no design reads
  row `'4'` or `'4.5'` (the lowest water read by any knot is 5.04). Everything §8.3 routes through v_eq is routed the
  same way; the kinematics, `drag` and `BOARD_INERTIA` stay at v. Off by default and pinned off online, as `face`.
- The schedule's knots 5–7.5 m/s all read the 7.8 m/s water; knot 4.5 reads 7.56; knot 8 and above are shipped. So
  between 7.5 and 8 m/s the blend still carries part of the plateau design; at ≥ 8 m/s it is the shipped controller.

### 9.2 Predicted gains and reference (before the model check)

- 3–4.5 m/s knots: equal to §8.6's face designs (Compress bank 1.57, 1.05, 0.94, 1.28; β_ref at 21° −0.8 to 0.6°).
- 5–7.5 m/s knots: the 7.8 m/s water, which lies between the face design at 4.5 (7.56 water, 1.28 / 0.22) and at 5
  (8.4 water, 1.00 / 0.17): **Compress bank gain about 1.0–1.3, rate 0.17–0.22**, against face's 0.58–0.78 at
  5.5–7.5 and shipped's 0.84–1.50 there. |β_ref| ≤ 2° at a 21° lean.
- ≥ 8 m/s: shipped's own gains and β_ref, identically.
- The bottom-knot corner (§8.6, 3.0–3.1 m/s, leans 1–2°) is unchanged, since that knot is `face`'s.

### 9.3 Model check, pass line (as §8.4)

Gains per schedule speed 3–9 m/s (tall and Compress) and `steadyTurn`'s β_ref at a 21° lean and over leans 1–25°, at
3–9 m/s (`plant-rows-gains.ts`, `VARIANT=taper`). **Pass: no singular speed and |β_ref| ≤ 10° at every speed (21°
lean). Fail → stop and report before any arm.**

### 9.4 Arms, pass and fail lines: §8.5's, exactly

Only the `taper` arm is run; shipped and `plantFloor=6` are 3.5v's (`results/35v/data`) and this round's
(`results/35w/steer`, `results/35w/grid`), `face` is phase 2's. Paired by stand / rider / cell against shipped and
`plantFloor=6`, one run per process, the owner's address, `cue` and `cueC`; 3.5v's rule (rescue ≥ 3 s, delay
≥ +0.25 s, worse ≤ −0.25 s).

| population | n | pass | fail |
| --- | --- | --- | --- |
| organic `cueLater` on, sideways falls | 9 | rescued + delayed ≥ `plantFloor=6`'s (6) | < 4 |
| organic `cueLater` off, not crest stalls | 19 | ≥ `plantFloor=6`'s (12) | < 9 |
| catch collapses (switch off) | 12 | ≥ `plantFloor=6`'s (12; 9 rescued) | < 9 |
| lasting controls | 34 | none lost (all ≥ 3 s) | any lost |
| sharp-steer collapses, seeds 1–9 | 10 | no worse than shipped on the paired median, and none worse by ≥ 0.25 s; reported against `plantFloor=4.5` | median worse, or ≥ 2 worse |
| Steer + Compress | 6 | as above | as above |
| seed-2 wave-2 left climb at 0.90 m | 1 | within 0.1 m/s and 2° of shipped (3.31 m/s, 46.4°) | outside |
| neutral riders | 59 | paired median Δ within ±0.1 s | outside |
| 3.5p plumb grid, no input | 27 | paired median Δ ≥ −0.1 s and ≤ 2 cells worse by ≥ 0.25 s | otherwise |
| `npx tsc -b`, targeted tests incl. the taper's map, Canyon byte check before and after | — | pass; `a367d938f15fa934` / `9e5831f80e38abd9` both times | any difference |

### 9.5 Predictions (before any arm)

- **Take-offs:** the stands land at 3–5 m/s, where taper is face below 4.64 m/s and a softer water (7.8, not
  7.8–8.4) just above: **about face's counts, 7 / 12 / 12 helped (pass), within ±1 each.**
- **Lasting controls: 34 of 34 kept.** s1w6 `cueC` runs at 7–8 m/s, where taper reads the 7.8 m/s water (Compress
  bank gain about 1.0–1.2, not face's 0.57) and is shipped at ≥ 8.
- **Sharp-steer collapses:** all 10 later than shipped (as face and both floors), median between face's +1.2 s and
  `plantFloor=6`'s +2.0 s; Steer + Compress 6 of 6 later. Pass.
- **The climb survivor:** the turn is asked at 6–7 m/s, where taper reads the 7.8 m/s water, not face's 10–12. My
  prediction is that it **survives the climb**, but I do not predict that it lands within 0.1 m/s and 2° of shipped's
  3.31 m/s, 46.4° at 0.90 m: the design at 6–7 m/s is not shipped's. **Predicted: survives, verdict on the 0.1 m/s / 2°
  line uncertain (about even).**
- **Neutral riders:** median Δ within ±0.1 s. Pass.
- **The grid:** the cells start at 7.2–8.2 m/s (7.7 ± 0.5), i.e. at the plateau's top and the shipped region.
  **Median Δ within ±0.1 s; at most 2 cells worse by ≥ 0.25 s (the 7.2 m/s column is the risk). Pass, with less
  confidence than the rest.**
