# 3.5y: the returning taper, `?plantSpeed=taper6`

*Surfer-track builder, Claude Opus 5.5, high effort (an implementation whose cause is partly open: does `taper`'s edge
in turns come from its low-speed reading or from its stiff-water plateau?), 2026-11-24. Branch `claude/return-taper`
from `claude/what-fails-first` `b0d19ee8`. The owner's ruling after 3.5x (2026-11-24): **"Returning taper"** — keep
`taper`'s low-speed setting and drop the stiff-water band that makes it wobble with Compress. His standing rulings: the
turn is not to be limited; the fall comes from a balance that lacks the ability to stand; no hidden motors, no bound
widened; he rides holding Compress (R2) from 0.1–0.3 s after the stand, and crosses the face with the stick centred
after every turn.*

## 0. Pre-registration (written and committed before the build, the model check and any arm)

### 0.1 The map

**`?plantSpeed=taper6`: v_eq = max(v, min(1.68 v, 6.0)).** A third value of the same switch; `face` and `taper` stay
as they are.

| true v (m/s) | 3 | 3.5 | 3.571 | 4 | 4.5 | 4.643 | 5 | 6 | 7 | 7.8 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `taper` (B) v_eq | 5.04 | 5.88 | 6.00 | 6.72 | 7.56 | 7.80 | 7.80 | 7.80 | 7.80 | 7.80 | 8 |
| **`taper6` (Y) v_eq** | 5.04 | 5.88 | **6.00** | **6.00** | **6.00** | **6.00** | **6.00** | **6.00** | **7** | **7.8** | **8** |
| `plantFloor=6` (A): the twelve and the drag read at | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 6 | 7 | 7.8 | 8 |

- Below 6 / 1.68 = 3.571 m/s it is `taper`'s (and `face`'s) 1.68 v, bit for bit.
- From 3.571 m/s to a true 6 m/s it reads the 6 m/s water: never stiffer than `plantFloor=6`'s 6 m/s row. B's 7.8 m/s
  plateau is gone.
- At and above 6 m/s it is the true speed: the shipped plant, as A is there.
- Everything else is `taper`'s machinery, unchanged: every water table read at v_eq (`labAt`'s twelve, `railCorrection`
  and `railLimit` in `blend`, `railPull` in `AttachedRider`'s schedule rail, the held and heave tables); the kinematic V,
  `lab.drag` → `feetForward` and `boardInertiaAt` at the true speed; the schedule's knots at 3 and 3.5 m/s
  (`SCHEDULE_SPEEDS_FACE`), with the 3 m/s design held below 3.
- In code: `PlantSpeed` gains `'taper6'`; a named constant `EQUIVALENT_SPEED_RETURN = 6.0` beside
  `EQUIVALENT_SPEED_CAP` 7.8; `equivalentSpeed(v, 'taper6')` = max(v, min(1.68 v, 6.0)); `plantSpeedSwitch` accepts
  `taper6`; the type unions on the route (`SurfZoneConfig`, `RideSessionOptions`, `AttachedRider`'s value check) carry
  it; the online pin (`main.ts`, `plantSpeed: undefined`) already pins every value off and is left as it is. Tests in
  `src/physics/plantSpeed.test.ts` and the parse in `src/game/PhysicalMode.test.ts`. Nothing else under `src/` or
  `scripts/`.

### 0.2 What the map isolates

**Y − B** differs only in the band 3.571–7.8 m/s (true speed), where Y reads the 6 m/s water (or v, above 6) and B
reads 6.0–7.8 m/s water. Below 3.571 m/s and at or above 7.8 m/s the two are the same design, bit for bit. **So Y − B
isolates the plateau.**

**Y − A** differs everywhere below 6 m/s, in two ways together:
1. **B's low-speed reading:** below 3.571 m/s Y reads 1.68 v (5.04 m/s water at 3 m/s), A the 6 m/s row.
2. **The machinery:** Y's schedule has knots at 3 and 3.5 m/s, built with the true kinematic V there; A's schedule
   starts at 4 and holds the 4 m/s design (kinematic V = 4) below 4. Y reads the rail correction, rail range and rail
   pull at v_eq; A reads them at the true v. Y's feet carry the drag of the true v; A's the floored row's.

**So Y − A isolates B's low-speed reading together with that machinery**, not the reading alone. From 3.571 to 6 m/s
the two read the same twelve derivatives of the 6 m/s row and differ only through the machinery. At and above 6 m/s Y
and A are the shipped design.

**Steer only, 3.5x measured B − A = +0.275 s** (14 later, 2 sooner). If that edge is the low-speed reading (with the
machinery), Y − A ≈ +0.275 s and Y − B ≈ 0. If it is the plateau during the turn, Y − A ≈ 0 and Y − B ≈ −0.275 s.

### 0.3 Model check, offline, before any arm, and its pass line

- **Delay check:** 3.5x's `what-fails-first-model.ts` with Y added as a fourth arm (`plantSpeed: 'taper6'`), R, A and B
  unchanged. `TRUTH=table` and `TRUTH=game`; schedule speeds 3–8 m/s (3.5x's 17 speeds); depths 0, 0.195, 0.30, 0.45;
  the true 6-tick delay and 5 and 7. **Control:** R's, A's and B's cells must be byte-identical to the committed
  `results/35x/model-table.jsonl` and `model-game.jsonl`.
- **Reference:** `plant-rows-gains.ts` with `VARIANT=taper6` (`TOP=9`): the gains, the nominal damping and
  `steadyTurn`'s β_ref at a 21° lean, 3–9 m/s.
- **Pass line (as written in the work order, read literally):** least damping > 0 at **every** cell from 5.0 to 8.0 m/s
  inclusive (5, 5.25, 5.5, 5.75, 6, 6.5, 7, 7.5, 8), in every stance (0, 0.195, 0.30, 0.45), at 5, 6 and 7 ticks, on
  both truths (the truths agree from 5 m/s up, as 3.5x §8 shows); **and** |β_ref| ≤ 10° at a 21° lean at every speed
  3–9 m/s with no singular speed (3.5w §8.4's line).
- **Fail → stop and report before any arm runs.**
- **Noted before running:** 3.5x's own A fails this literal line. Its least damping is "div" (a real root outside the
  unit circle) at 5.0 m/s in all four stances and at 5.25 m/s at 0.30 and 0.45 m, at every delay
  (`results/35x/model-table.jsonl`). B fails it at 5.0 and 5.25 too. The line is kept as written; if Y fails it only
  where A fails it, that is reported as such, and the round still stops.

### 0.4 Arms and populations (3.5x's probe and definitions, unchanged)

| arm | `EXTRA` | source |
| --- | --- | --- |
| **Y** | `&cueLater=on&plantSpeed=taper6` | new, this round |
| A | `&cueLater=on&plantFloor=6` | 3.5x's runs (seeds 1–3; seeds 4–9 `cue`, `cueL`, `cueR`), after the reproduction control |
| B | `&cueLater=on&plantSpeed=taper` | 3.5x's runs, seeds 1–3 |
| R | `&cueLater=on` | 3.5x's runs, seeds 1–3 (reported beside, no line) |

- **The probe:** `what-fails-first.ts` unchanged, bundled once from this branch's build; Y and the reproduction control
  run on the same bundle. One process per arm per seed, all six scripts (`cue`, `cueC`, `cueL`, `cueR`, `cueCL`,
  `cueCR`), `STAND_HOLD=5`, Canyon B Medium, `PERIODS=12`. His way = Compress held from +0.2 s (`cueC`, `cueCL`,
  `cueCR`); the turn holds the stick ±1 from +0.3 s for 0.9 s, then centres it.
- **Reproduction control (before Y counts):** on the new build, seed 2, arm A, all six scripts; it must be row-for-row
  identical to `35x/runs/o-s2-A.jsonl` (every row, every field). Only then do 3.5x's A, B and R runs serve as the
  comparison arms.
- **Populations:** (1) organic seeds 1–3, Y; (2) the catch start, runs 0–9, `cue` and `cueC`, on 3.5v's
  `sideways-falls.ts` unchanged, Y; (3) if the usage and power guards allow, seeds 4–9 for Y **and A**, all six
  scripts (3.5x ran A there with `cue`, `cueL`, `cueR` only; those three must reproduce 3.5x's s4–s9 files, a second
  reproduction check), his way and steer only: the out-of-sample check of the main line.
- **The reader:** 3.5x's `what-fails-first.py` extended for Y (its classes, final escape, pairs, divergence, climb), plus
  the turn-twin split (3.5x's `turn-twins.md` definitions, which it computed outside the committed reader). The
  extended reader must reproduce 3.5x's `summary.md`, `turn-twins.md` and `diverge-AB.md` numbers for R, A and B before
  any Y number is read.

### 0.5 Pass and fail lines (3.5x's definitions; paired by stand; censored at the hold; |Δ| ≥ 0.25 s counts as later or sooner)

| line | population | pass | fail |
| --- | --- | --- | --- |
| **main: turns his way vs A** | `cueCL`, `cueCR`, seeds 1–3 (26 pairs) | paired median Y − A ≥ +0.10 s, **and** later > sooner, **and** ≤ 2 riders worse by ≥ 0.5 s | median < 0, **or** sooner > later |
| main, out of sample | the same, seeds 4–9 (if run) | the same | the same |
| turns his way vs B | `cueCL`, `cueCR`, seeds 1–3 | paired median Y − B > 0 with later > sooner, **and** of B's 11 turn-caused falls whose final escape is inside +0.3–1.5 s, at least 6 under Y either hold 5 s or have their final escape outside +0.3–1.5 s | median Y − B < 0, or sooner > later, or ≤ 3 of the 11 move out |
| turns steer only vs A and B | `cueL`, `cueR`, seeds 1–3 (and 4–9 vs A) | reported, no line; which of Y − A or Y − B carries B's +0.275 s | — |
| take-offs | `cue`, `cueC`, seeds 1–3, 3 s hold | none of the stands A carries 3 s is lost **and** paired median Y − A within ±0.1 s | any lost, or median outside ±0.1 s |
| catch start | runs 0–9 × `cue`, `cueC` | all 18 stands carry 3 s (run 3 has none, as on A, B, R) | any of the 18 lost |
| neutral riders | `cue`, `cueC` as the turn twins, ridden 5 s, seeds 1–3 | paired median Y − A within ±0.1 s | outside |
| the climb | turn riders, 3.5x §0.6's rule | reported: climbers, the 0.50 m and 0.90 m lines, the roll-out O | — |

"Between" is neither pass nor fail. For every line: the counts, the medians, and the riders that move most; and what
fails first under Y in 3.5x's classes (§0.4 of `what-fails-first.md`) with its final escape (§0.10).

### 0.6 Predictions (before the build, the model check and any arm)

1. **Model check: FAIL on the literal line, at 5.0 m/s (all stances) and 5.25 m/s (0.30 and 0.45 m), the cells where A
   fails.** At the 5 m/s knot Y's design reads the same twelve derivatives as A's (the 6 m/s row) with the same
   kinematic V; it differs only in the feet's drag and the rail machinery at rail 0, so it should share A's real
   divergence there. At 5.5–8 m/s: pass, at about A's +0.15–0.20 (worst over ±1 frame); ≥ 6 m/s identical to A and R.
   |β_ref| at 21°: pass, ≤ 2° at every speed 3–9 m/s (below 3.571 it is `face`'s −0.8 to +0.6°; at 3.571–6 between).
   **If this prediction holds, the round stops here** by the work order's rule, and only the build, its checks and the
   model check are reported.
2. **Main line (his way vs A): pass**, paired median +0.10 to +0.30 s, later > sooner, ≤ 2 worse by ≥ 0.5 s; about
   55 % confident. A's his-way turn-caused falls come on the slow board (schedule speed 2.3 m/s at the final escape),
   where Y reads B's 1.68 v; Y has no plateau to loop on.
3. **His way vs B: pass.** Median Y − B ≥ +0.3 s; at least 8 of B's 11 in-window turn-caused falls move out.
4. **Steer only:** the edge splits, the larger share in **Y − A** (the low-speed reading and machinery): Y − A
   +0.10 to +0.20 s, Y − B −0.05 to −0.15 s. B's and A's steer-only turn-caused falls come at schedule speeds of 3.4
   and 3.8 m/s, below or near 3.571, where Y and B read almost the same water.
5. **Take-offs: pass** (A − B was +0.00 s, 0 later and 2 sooner of 13 per script; Y lies between them). **Catch: pass,
   18 of 18. Neutral riders: pass**, median within ±0.05 s.
6. **The climb:** Y's climbers between A's 8 and B's 12; 0.90 m reached by 2 or 3 riders.
7. **What fails first under Y:** turns, both drives, the slow roll after the release with the ankle range unused (U on
   the first escape, as A); no loop past the range inside the turn window at 4.4–7.5 m/s. Take-offs: A's set (the
   fore/aft pitch-up on s1w8 and s3w9, F on s2w6 and s2w10 `cue`).

### 0.7 Guards

Usage at each phase boundary; at 80 % of the 5-hour window (resets 23:20 UTC) stop, push what is green and write what
is left. Power: no new batch below 25 % while discharging (87 %, charging, at this pre-registration). At most four
processes, from one queue only.

## 1. Result: the model check fails its line where A fails it, so the round stops before any arm (2026-11-24)

*Written after the build and the model check; no Y arm has run. Speeds here are the controller's schedule speed (its
forward speed through the water, m/s); "least damping" is the code's `leastDamping` of the closed loop (design at that
schedule speed, rail 0, owner's weights, closed on the plant at the true speed), worst over 5, 6 and 7 ticks of delay
unless named; "div" is a real root outside the unit circle (reported as −1).*

### 1.1 The build and its checks

- **Commit `a7398222`.** `PlantSpeed = 'face' | 'taper' | 'taper6'`; `EQUIVALENT_SPEED_RETURN = 6.0`, documented
  beside `EQUIVALENT_SPEED_CAP`; `equivalentSpeed(v, 'taper6')` = max(v, min(1.68 v, 6)); `plantSpeedSwitch` accepts
  `taper6`; the route's type unions (`SurfZoneSimulation`, `RideSession`) and `AttachedRider`'s value check carry it.
  `main.ts`'s online pin (`plantSpeed: undefined`) already pins every value off and is unchanged.
  `git diff b0d19ee8..a7398222 --stat -- src scripts`: those five files and the two test files, nothing in `scripts/`.
- **`npx tsc -b`:** clean.
- **Targeted tests** (`npx vitest run src/physics/plantSpeed src/physics/predictiveBalance.test
  src/game/PhysicalMode.test`): **151 of 151 pass** (149 before, plus two `taper6` tests; one parse assertion block
  extended). The new tests check the map at its knee (6 / 1.68), its corners (3, 3.5, 4–6, 6–14 m/s), that it is
  `face`/`taper` bit for bit below 3.571 m/s, never stiffer than `taper`, ≤ 6 below a true 6, continuous and monotone;
  that its designs are `face`'s at the 3 and 3.5 knots, read the 6 m/s row's water with the true V at 4–5.5, and are
  the shipped designs at 6–12 m/s; and that `face` and `taper` are unchanged.
- **Canyon byte check** (Medium, 3 600 steps, fresh spin-up; `results/35y/canyon-byte-check.txt`): before (no `src`
  change) snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`; after (`a7398222`, switch off) snapshots
  `a367d938f15fa934`, state `9e5831f80e38abd9`. **Identical, and the reference pair.**

### 1.2 The delay check (`what-fails-first-model.ts` with Y; `results/35y/model-table.jsonl`, `model-game.jsonl`)

**Control:** R's, A's and B's cells, and the header, are identical to 3.5x's committed `model-table.jsonl` and
`model-game.jsonl` on both truths (every cell compared as parsed JSON). Y's cells at 6–8 m/s are identical to A's (and
R's) on both truths, as the map requires.

**Y, worst least damping over 5, 6, 7 ticks (at the true 6 ticks in brackets; cells that diverge / cells):**

| truth | stance | 3–4.25 m/s | 4.5–4.75 | **5.0** | **5.25** | 5.5–6 | 6.5–8 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| table | tall (0) | div (4/6) | div (2/2) | **div (1/1)** | +0.16 (+0.22) | +0.16 (+0.42) | +0.17 (+0.65) |
| table | crouch (0.195) | div (4/6) | div (2/2) | **div (1/1)** | +0.16 (+0.25) | +0.15 (+0.43) | +0.17 (+0.65) |
| table | compress (0.30) | div (4/6) | div (2/2) | **div (1/1)** | **div (1/1)** | +0.15 (+0.45) | +0.18 (+0.66) |
| table | tuck (0.45) | div (5/6) | div (2/2) | **div (1/1)** | **div (1/1)** | +0.17 (+0.46) | +0.18 (+0.67) |
| game | every stance | div (6/6) | div (2/2) | as `table` | as `table` | as `table` | as `table` |

**The same cells, A and B (3.5x's numbers, reproduced here):**

| cell | Y | A (`plantFloor=6`) | B (`taper`) |
| --- | --- | --- | --- |
| 5.0 m/s, every stance | div (radius 1.014–1.039 per tick at 6 ticks) | div (1.011–1.039) | div (1.012–1.049) |
| 5.25, tall | **+0.157 to +0.222** (5/6/7: +0.170, +0.222, +0.163) | +0.164 to +0.197 | **−0.062, −0.060, −0.058** |
| 5.25, crouch | **+0.157, +0.252, +0.159** | +0.166, +0.203, +0.163 | **−0.044, −0.042, −0.041** |
| 5.25, compress / tuck | div (1.006 / 1.017) | div (1.005 / 1.017) | div (1.008 / 1.022) |
| 5.5, compress | +0.158, +0.446, +0.161 | +0.164, +0.406, +0.163 | +0.194, +0.136, **−0.004** |
| 5.5–6, every stance | +0.152 to +0.193 worst | +0.152 to +0.194 | −0.004 to +0.240 |

**The growing mode at 5.0 and 5.25 m/s** (`results/35y/model-modes-5-table.jsonl`, `MODES=1`, true delay): on Y it is
the one A has, led by the sideslip (1.00 in the design's state scale), then roll and yaw rate (0.2–0.65), the same
shape to within 0.1 on every cell. It is 3.5x §8's directional divergence of a design built on stiffer water closed
on the table's own 5 m/s row.

**Reference** (`plant-rows-gains.ts`, `VARIANT=taper6`, `TOP=9`; `results/35y/gains-taper6.jsonl`): |β_ref| at a 21°
lean is at most **2.46° (tall, 6 m/s) and 2.34° (Compress, 6 m/s)** over 3–9 m/s; no singular speed. Over leans
1–25° the only cells past 10° are `face`'s bottom-knot corner (3.0–3.1 m/s, leans 1–2°: −13.4° tall, −46.9° Compress
at 3.05), the same cells as `taper`'s. **Pass.** Compress gains (bank / bank rate / slip / yaw rate): 1.57 / 0.23 /
0.37 / +0.05 at 3 (= `taper`), 1.05 / 0.19 at 3.5 (= `taper`), 0.97 / 0.17 at 4, 0.93–0.94 / 0.15–0.16 at 4.5–6, the
shipped 0.84 / 0.14 at 7. At 4.5–6 m/s they are A's to the second decimal (A 0.926–0.937), against `taper`'s
1.09–1.28.

### 1.3 Verdict on §0.3's line

- **The literal line fails**: least damping is not > 0 at 5.0 m/s in any stance, nor at 5.25 m/s at 0.30 and 0.45 m,
  at any of the three delays, on both truths. These are **exactly the cells where A fails** (3.5x), and B fails them
  too. The prediction (§0.6 item 1) held to the cell.
- **Where Y differs from A and B in the checked band:** at 5.25 m/s tall and crouch, Y is stable (+0.157 worst) where
  B was not (−0.06 / −0.04 at the true delay); at 5.5 m/s Compress Y is +0.158 where B was −0.004 a frame late. From
  5.5 m/s up Y is within 0.01 of A's worst cell everywhere, and identical to A from 6 m/s. **Measured: the map removes
  every cell where B was worse than A, and adds none where A was stable.**
- **What I did not do:** by the work order's rule (§0.3), no Y arm ran: no organic seed, no catch start, no seeds
  4–9. The pass and fail lines of §0.5 are untested. The one run made after the check is the reproduction control of
  A (§1.4), which runs no Y and was made so that the arms can start at once if the line is ruled on.

### 1.4 The reproduction control (A, seed 2, all six scripts, on the probe bundle Y would ride)

- **The bundle:** `what-fails-first.ts` (unchanged) built from this branch at `a7398222`, location prepended; SHA-256
  `f1a7eb420a90f85e9a7f884e15318a1fffa58351c2efc67ad3b93f24ed9b309f`. It differs from 3.5x's
  (`bf340599…`) because `src` now carries `taper6`.
- **The run:** `MODE=organic SEED=2 PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueC,cueL,cueR,cueCL,cueCR
  EXTRA='&cueLater=on&plantFloor=6'`, alone, 20:22–20:33 UTC.
- **Against `35x/runs/o-s2-A.jsonl`:** 11 237 rows each, in the same order. **11 235 lines byte-identical.** The other
  two differ only in wall-clock fields: the `control` row's `spinUp` (31.189 against 27.908 s) and the `done` row's
  `seconds`. Every stand, frame, summary and controller row is identical. **Pass:** with `taper6` in `src` and off,
  the probe rides A exactly as 3.5x did, so 3.5x's A, B and R runs can serve as the comparison arms once Y runs.

### 1.5 What this leaves for the coordinator and Vicente

- **The decision the line asks for.** Read literally, §0.3's line (> 0 at 5–8 m/s, every stance, ±1 frame) cannot be
  met by Y, nor by A, his preference, nor by B: all three diverge at 5.0 m/s, and at 5.25 m/s in the deep stances,
  on both truths. In 3.5x the coordinator and the builder read 5.0 m/s as the edge of the band where the linear model
  does not describe the game (A and B carry stands there that the model says diverge). If the line is meant as
  "no cell where Y is worse than A, and no cell from 5.25 m/s up where A is stable and Y is not", Y meets it: every
  cell from 5.25 m/s up where A is stable, Y is stable too (+0.152 worst), and the cells where B failed and A held,
  Y holds. **That reading is a change of line, so it is the coordinator's and Vicente's to make, not mine.**
- **If the arms are released**, everything they need is in place: the build (`a7398222`), the probe bundle above, the
  reproduction control passed, and the pre-registered lines of §0.5 untouched. Y's seeds 1–3 take about 11 minutes
  with four running; the catch start about 7 minutes; seeds 4–9 for Y and A about 35 minutes.
- **Vicente can ride Y now**, independent of the line: the switch is built, off by default, pinned off online, and
  byte-identical when off:

      ?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantSpeed=taper6

  (his address with the later cue; `plantSpeed=taper6` replaces `plantFloor=6`). Do not combine it with `plantFloor`.

**Not done:** every arm of §0.4 (Y seeds 1–3, the catch start, seeds 4–9 for Y and A), the extended reader (§0.4's
reader work was not needed before the check), every pass and fail line of §0.5, and the climb.

**Reproduce:**

    # the build's checks
    npx tsc -b
    npx vitest run src/physics/plantSpeed src/physics/predictiveBalance.test src/game/PhysicalMode.test
    ./node_modules/.bin/rolldown scripts/m1-cpu-bench.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '?canyonWaves=true' };\n" > <s>/bench.mjs && cat <s>/raw.mjs >> <s>/bench.mjs
    node --max-old-space-size=3200 <s>/bench.mjs --spot canyon --size medium --steps 3600 --state <s>/fresh
    # the model check (each bundled with `globalThis.location = { search: '' };` prepended, run from the repository root)
    env TRUTH=table node <s>/what-fails-first-model.mjs > model-table.jsonl      # TRUTH=game for model-game.jsonl
    env TRUTH=table MODES=1 SPEEDS=5,5.25 node <s>/what-fails-first-model.mjs     # model-modes-5-table.jsonl
    env VARIANT=taper6 TOP=9 node <s>/plant-rows-gains.mjs > gains-taper6.jsonl
    # the reproduction control
    env MODE=organic SEED=2 PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueC,cueL,cueR,cueCL,cueCR EXTRA='&cueLater=on&plantFloor=6' OUT=<s>/o-s2-A-repro.jsonl node --max-old-space-size=3200 <s>/wff.mjs

The per-frame reproduction run (27 MB) stays in the session scratchpad, `35y/runs/o-s2-A-repro.jsonl`.

## 2. Dated addition: the model-check line amended by the coordinator, before any Y arm (2026-11-24, 20:34 UTC)

After §1 was pushed (`006997fc`), the coordinator amended §0.3's line. The amendment is recorded and signed in the
consult log on `claude/the-record` at `cd1aab16` ("3.5y's model check fails my line exactly where A fails it; I
amend the line (Y stable wherever A is) and release the arms"). The amended line, quoted:

> The model check passes if, at 5.0–8 m/s, in every stance, at 5, 6 and 7 ticks and on both truths, Y is stable in
> every cell where A is stable, and |β_ref| is within 3.5w's line.

**Its reason, as the coordinator gives it:** the literal line fails A, his preferred arm, at exactly the cells where
3.5x showed the linear model no longer describes the game (5.0 m/s in every stance, 5.25 m/s at 0.30 and 0.45 m),
where A and B carry stands the model says diverge.

**Order of events:** the literal line failed (§1.3) and the round stopped; the coordinator made this amendment
afterwards; **no Y arm had run** when it was made or when this addition was committed. The only run on the new
build before it is §1.4's reproduction control of A.

**§1.2's numbers read against it: pass.** At 5.0–8 m/s, every cell where A is stable (at 5, 6 and 7 ticks, every
stance, both truths) Y is stable too, worst +0.152 (crouch, 6 m/s, 5 ticks, where A has the same value); Y diverges
only in A's own diverging cells. |β_ref| at 21° ≤ 2.46°. **The §0.5 lines, the populations and the predictions of
§0.6 items 2–7 are unchanged.**

## 3. Results, seeds 1–3 and the catch start (run 20:35–20:51 UTC, after §2 was pushed at 20:35:27)

*Canyon B Medium, 12 periods, one process per arm per seed, all six scripts, `STAND_HOLD=5`. Y's runs are new; A, B
and R are 3.5x's runs (`35x/runs/`), valid by §1.4's control. Times are seconds after the stand; speeds are horizontal
|v_board − flow| (vW, m/s, world) or the controller's schedule speed (sched, m/s); `rollS` is 3.5o's roll (+ with
the +x rail down; for a left turn + is the inside); |raw| is the ankle command (deg) against its ±14.3° range. Paired
by stand, censored at the hold (3 s take-offs, 5 s turns and neutral riders); "later"/"sooner" = |Δ| ≥ 0.25 s.
Tables: `results/35y/lines.md`, `summary.md`, `twins.md`, `classify.md`, `climb.md`, `diverge-YA.md`,
`diverge-YB.md`, `catch.md`, `checks.md`.*

### 3.1 Controls

- Every Y file prints back `cueLater` on and `plantSpeed` `taper6` (`control`, `built` and every `stand` row).
- The extended reader reproduces 3.5x's committed `summary.md`, `classify.md`, `turn-twins.md`, `diverge-AB.md`,
  `climb.md` (R, A, B rows) and `catch.md` byte for byte from 3.5x's runs; its `checks` still finds R's and A's
  take-off rows identical to 3.5v's (riders and frame rows) and B's summaries identical to 3.5w's.
- Every Y stand is A's, B's and R's stand to the frame (no unpaired rider in any pair below).
- Cross-check against the coordinator's independent reader (`review35x.py`'s list): B's 11 in-window turn-caused falls
  his way are the same 11 riders, at the same final-escape times.

### 3.2 The lines (§0.5)

| line | n | Y − A: later / sooner, median, worse ≥ 0.5 s | Y − B | verdict |
| --- | --- | --- | --- | --- |
| **main: turns his way vs A** | 26 | **0 / 6, +0.000 s, 3** | — | **FAIL** (sooner > later; also 3 worse by ≥ 0.5 s) |
| turns his way vs B | 26 | — | **15 / 5, +0.367 s**; **10 of B's 11** in-window falls move out | **PASS** |
| turns steer only | 26 | 1 / 3, +0.000 s, 1 | **2 / 11, −0.100 s, 7 worse by ≥ 0.5 s** | reported |
| take-offs (`cue`, `cueC`, 3 s) | 26 | 1 / 1 and 0 / 0, +0.000 s; 0 of A's 17 lasting stands lost | — | **PASS** |
| catch start | 18 stands | all 18 carry 3 s; run 3 separates in the pop-up, no stand, as on A, B, R | — | **PASS** |
| neutral riders (5 s) | 26 | 1 / 1, +0.000 s | — | **PASS** |
| Y − R (reported) | 26 + 26 | steer only 14 / 1, +0.550 s; his way 16 / 2, +0.450 s | — | — |

**The riders that move most.**
- His way, Y against A, all six sooner: s2w2 `cueCL` 4.80 → 3.98 s; s1w10 `cueCR` 4.13 → 3.53; s2w1 `cueCR`
  3.62 → 3.07; s2w10 `cueCL` 1.48 → 1.03; s2w6 `cueCR` 3.70 → 3.27; s2w6 `cueCL` 3.32 → 2.97.
- His way, Y against B: s3w6 `cueCL` 1.07 → 5.00 (held), s3w6 `cueCR` 1.37 → 5.00, s1w6 `cueCL` 1.38 → 5.00,
  s3w12 `cueCR` 1.60 → 5.00, s2w1 `cueCL` 1.17 → 3.87, s1w10 `cueCL` 1.58 → 4.15. The one of B's 11 that stays in
  the window is s2w10 `cueCL` (final escape 0.95 s at a schedule speed of 2.04 m/s on both arms: below 3.571 m/s,
  where Y and B are the same design).
- Steer only, Y against B: s3w6 `cueL` 5.00 → 2.22, s3w6 `cueR` 5.00 → 2.48, s1w10 `cueL` 4.12 → 2.23, s3w12 `cueL`
  3.87 → 1.98, s3w12 `cueR` 4.55 → 2.82 (B's best steer-only riders lose what B gave them); s2w6 `cueR` 0.87 → 2.45.
- Take-offs: s2w5 `cue` 2.15 → 1.72, s3w9 `cue` 0.92 → 1.35; every other pair within 0.18 s.

### 3.3 Which of Y − A or Y − B carries B's steer-only +0.275 s

**Measured: Y − B.** Steer only, B − A is +0.275 s (14 later, 2 sooner), as 3.5x. Y − A is +0.000 s (1 later,
3 sooner) and Y − B is −0.100 s (2 later, 11 sooner, 7 worse by ≥ 0.5 s). The riders B carries furthest steer only
(s3w6, s3w12, s1w10) are carried by B and not by Y. Where the rides part (the first frame with roll > 2° apart,
`diverge-*.md`):

| pair | drive | riders that part | median time (s) | median sched there (m/s) | below 3.571 / 3.571–4.6 / 4.6–7.8 |
| --- | --- | --- | --- | --- | --- |
| Y, B | steer only | 22 | 0.61 | 5.59 | 0 / 6 / 16 |
| Y, B | his way | 22 | 0.60 | 5.95 | 3 / 4 / 12 |
| Y, A | steer only | 20 | 1.04 | 3.70 | 9 / 5 / 6 |
| Y, A | his way | 24 | 1.02 | 3.14 | 13 / 6 / 5 |

**Read.** B's edge steer only is the plateau during the turn: Y and B part early in the turn at 5.6 m/s, inside the
band where only the plateau separates them, and B's best riders keep their gain only with the plateau. B's
low-speed reading, which Y keeps, adds nothing steer only (Y − A +0.000 s). **This is the opposite of my
prediction** (§0.6 item 4: the larger share in Y − A).

### 3.4 What fails first under Y, and why the main line fails

| arm | drive | stood | fell | median fall (s) | final escape: median t (s), vW / sched (m/s) | rolled ≥ 20° inside / outside | final escape: median max \|raw\| (deg); past the range | turn-caused (twin outlives ≥ 0.5 s); median fall; sched; in +0.3–1.5 s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| A | steer only | 26 | 24 | 2.42 | 2.12; 3.37 / 2.59 | 16 / 6 | 10.3; 1 of 24 | 14; 2.52; 3.83; 0 |
| **Y** | steer only | 26 | 24 | 2.28 | 1.95; 3.47 / 3.17 | 16 / 3 | **12.1; 9 of 24** | 14; 2.51; 4.33; 0 |
| B | steer only | 26 | 22 | 2.74 | 2.61; 2.44 / 2.50 | 10 / 4 | 17.0; 14 of 22 | 12; 2.90; 3.37; 3 |
| A | his way | 26 | 19 | 3.27 | 3.10; 2.39 / 1.59 | 14 / 4 | 9.6; **0 of 19** | 9; 3.70; 2.31; 0 |
| **Y** | his way | 26 | 19 | 2.97 | 2.75; 2.71 / 2.04 | 11 / 4 | **19.1; 14 of 19** | 12; 3.27; 2.55; **1** |
| B | his way | 26 | 23 | 1.38 | 1.05; 3.35 / 3.28 | 5 / 5 | 27.3; 21 of 23 | 16; 1.41; 4.91; 11 |

Registered classes (first escape, §0.4 of 3.5x), Y: take-offs centred F 2, N 3 (held 8); his way L-gain 1, U 2, N 1
(held 9); turns steer only F 3, U 15, N 6 (held 2); **turns his way O 2, L-gain 7 (1 in the turn), U 2, N 8 (held 7)**.

- **Take-offs:** A's set, unchanged in kind: the two fore/aft falls (s2w6, s2w10 `cue`, F), and the slowest
  landings s1w8 and s3w9 (3.5x's fore/aft pitch-up on the face), with s3w9 `cue` lasting 0.43 s longer and s2w5
  `cue` 0.43 s shorter.
- **Turns, steer only:** A's picture. The final escape comes after the release (none of 14 turn-caused falls in the
  window), median 1.95 s, on a board slowed to a schedule speed of about 3.2 m/s, rolled ≥ 20° (16 inside, 3
  outside). The command is still mostly inside the range (median 12°), but 9 of 24 overflow it at the final
  escape, against A's 1.
- **Turns, his way: the loop on the slow board.** B's in-turn loop is gone (1 turn-caused fall in the window, against
  B's 11). What fails first instead is the slow board after the release: final escape a median 2.75 s at a schedule
  speed of 2.04 m/s (vW 2.7 m/s), and there **the command overflows the range** in 14 of 19 falls (median max |raw|
  19°), the ankle windows rising into the escape (e.g. s2w10 `cueCL` 19 → 18 → 35°, s2w2 `cueCL` 14 → 14 → 25°).
  On the same riders A stays inside the range (median 9.6°, 0 of 19) and falls later. In 18 of 19 the command is
  unsaturated or pointing away from the fall over the last 0.1 s, so by 3.5x's rule this is **within the balance's
  authority: an over-gained loop**, R's kind, not a lack of ankle.
- **Why (measured gains, inferred cause):** Y and A part his way at a median 1.02 s and 3.14 m/s, 13 of 24 below
  3.571 m/s. There Y keeps `taper`'s reading. Below 3.5 m/s Y blends toward, and below 3 m/s holds, the 3 m/s design
  built on 5.04 m/s water with the true V = 3. A holds the 4 m/s design on the 6 m/s row. The gains differ by
  1.6–2.7×. At 3 m/s Compress bank / bank rate is 1.57 / 0.23 (Y) against 0.97 / 0.17 (A); tall it is 2.02 / 0.31
  against 0.76 / 0.18. From 3.5 to 5 m/s the two agree within 9 % (Compress bank 1.05 against 0.97 at 3.5 m/s). The board with Compress held after the release
  spends its last second below 3 m/s (median schedule speed 2.0 m/s at the final escape). **Inferred:** there Y's
  stiffer low-speed gains drive the ankle past its range, and A's softer ones do not. Three of the six his-way losses
  part from A at 4.2–5.8 m/s instead (s2w1 `cueCR`, s2w6 `cueCR`, s2w6 `cueCL`). There the two read the same twelve
  derivatives and differ only by the rail machinery (`railCorrection`, `railLimit` and `railPull` at v_eq = 6 rather
  than at v) and the drag. That part of Y − A is not separated from the low-speed reading.

### 3.5 The climb (3.5x §0.6's rule; `climb.md`)

Climbers: **Y 9** (A 8, B 12, R 4). 3.5o's 0.90 m line is reached on Y by s1w6 `cueL` (+2.93 s, vW 2.1 m/s) and
s2w11 `cueR` (+3.07 s, 1.7 m/s), the two A riders that reach it, plus s3w9 `cueR`, a slow take-off rising on the
face that the rule admits. The roll-out O (≥ 20° to the outside after +1.2 s) comes on s1w6 `cueL` at +2.53 s
(3.9 m/s). The seed-2 wave-2 left survivor (`cueL`) reaches 0.50 m at +2.17 s (4.4 m/s) and falls at 2.55 s without
0.90 m, as on A (A: 0.50 m at +2.18 s, falls 2.47 s).

### 3.6 Against the predictions (§0.6)

1. Model check: failed the literal line at A's cells — **held** (§1).
2. Main line pass — **wrong: fail** (0 later, 6 sooner).
3. His way against B, median ≥ +0.3 s and ≥ 8 of 11 out — **held** (+0.367 s; 10 of 11).
4. Steer only, the larger share in Y − A — **wrong**: Y − B carries it (−0.100 s, 11 sooner); Y − A +0.000 s.
5. Take-offs, catch, neutral riders pass — **held**.
6. Climbers between 8 and 12, 0.90 m by 2 or 3 — **held** (9; 2 turn riders and 1 take-off).
7. What fails first, U after the release with no in-window loop — **held steer only; wrong his way**, where the first
   failure is the loop past the range on the slow board below 3 m/s.

## 4. Seeds 4–9, Y and A, all six scripts: the out-of-sample check (run 20:51–21:23 UTC)

*Same probe bundle, same definitions; 12 new runs (Y and A on seeds 4–9). B and R were not run on these seeds, so
only Y − A is read. Tables: `results/35y/lines-s49.md`, `summary-s49.md`, `twins-s49.md`, `classify-s49.md`,
`climb-s49.md`, `diverge-YA-s49.md`, `checks-s49.md`.*

**Second reproduction check: passes.** A's new runs carry all six scripts; their `cue`, `cueL` and `cueR` rows are
identical, line for line and in order, to 3.5x's A seeds 4–9 files (which rode only those three): 6 660, 7 960,
11 188, 6 046, 4 333 and 5 389 rows, 41 576 of 41 576. Every file prints back its build (12 of 12).

| line | n | Y − A: later / sooner, median, worse ≥ 0.5 s | verdict |
| --- | --- | --- | --- |
| **main: turns his way** | 42 | **6 / 13, −0.083 s, 7** | **FAIL** (median < 0; sooner > later) |
| turns steer only | 42 | 2 / 10, +0.000 s, 6 | reported |
| take-offs (3 s) | 42 | `cue` 1 / 3, `cueC` 2 / 1, +0.000 s; 0 of A's 21 lasting stands lost | **PASS** |
| neutral riders (5 s) | 42 | 7 / 5, +0.000 s | **PASS** |

- **Most moved, his way:** s8w5 `cueCL` 4.75 → 3.43 s, s4w10 `cueCR` 3.20 → 2.10, s7w5 `cueCR` 2.02 → 1.27,
  s7w5 `cueCL` 2.28 → 1.60, s8w1 `cueCL` 2.45 → 1.82, s5w3 `cueCL` 3.17 → 2.57. Steer only: s9w8 `cueL`
  3.73 → 2.53, s9w8 `cueR` 4.08 → 3.10, s7w4 `cueL` 1.72 → 1.03.
- **The command at the final escape, turns:**
  - Y: median max |raw| 20.4° steer only (24 of 40 past the range) and 19.5° his way (30 of 38).
  - A: 8.2° (4 of 41) and 10.5° (11 of 37).
  - This is seeds 1–3's split, out of sample. On Y the command over the last 0.1 s is unsaturated or points away
    from the fall in 39 of 41 turn falls steer only and 38 of 38 his way (A: 41 of 41, 37 of 37), so the loss is
    within the balance's authority.
- **Turn-caused (twin outlives by ≥ 0.5 s), his way:**

  | arm | turn-caused falls | median fall (s) | median sched at the final escape (m/s) | final escape in +0.3–1.5 s | registered classes |
  | --- | --- | --- | --- | --- | --- |
  | Y | 18 | 1.82 | 3.86 | 6 | 6 L-gain in the turn, 9 N |
  | A | 13 | 2.13 | 5.18 | 4 | 6 L-gain in the turn |

  On these seeds A his way also loses some riders inside the turn at 5–6 m/s. Its median fall his way is 1.25 s,
  against 3.27 s on seeds 1–3.
- **Where Y and A part:**
  - his way, a median 0.76 s at 3.44 m/s (18 of 34 below 3.571 m/s, 11 at 4.6–7.8);
  - steer only, 0.85 s at 4.02 m/s.
- **The climb:** climbers Y 4, A 6. The 0.90 m line is reached by one turn rider on each arm, the same
  rider: s6w5 `cueR`, Y at +3.42 s and 3.5 m/s, A at +3.45 s and 3.4 m/s.

## 5. The answer

**The returning taper does what the ruling asked of it against B, and it is worse than A his way.**
- **Against B, his way: removing the plateau removes B's loop in the turn.** Y − B is +0.367 s (15 later, 5 sooner).
  10 of B's 11 in-window turn-caused falls move out of +0.3–1.5 s, and 4 of those hold the whole 5 s.
- **Against A, his way: the main line fails, in and out of sample.**
  - seeds 1–3: Y − A 0 later, 6 sooner, median +0.000 s;
  - seeds 4–9: 6 later, 13 sooner, −0.083 s, 7 worse by ≥ 0.5 s.
- **What fails first under Y with Compress is the slow board.** After the release, with the board below about 3 m/s,
  Y's ankle command oscillates past its ±14.3° range: 14 of 19 falls on seeds 1–3, 30 of 38 on seeds 4–9. On the
  same riders A stays inside its range (0 of 19; 11 of 37).
- **That is the part of `taper` Y keeps:** its 1.68 v reading and its 3 and 3.5 m/s knots. At 3 m/s they give
  Compress bank gains of 1.57 against A's 0.97, and tall bank gains of 2.02 against 0.76.
- **The open cause, resolved:**
  - **Measured:** B's steer-only edge over A (+0.275 s) is carried by Y − B (−0.100 s, 11 sooner), not by Y − A
    (+0.000 s). So it came from the plateau during the turn, not from the low-speed reading.
  - **Inferred:** B's low-speed reading helps neither drive, and with Compress on the slow board it costs time.
  - **Not separated:** about a third of the his-way losses part from A at 4.2–6 m/s. There Y and A differ only by
    the rail machinery and the drag, so that share of Y − A is not attributed between the reading and the
    machinery.
- **What stays as it was:** take-offs, the catch start (18 of 18) and the neutral riders are A's, within ±0.1 s.
  The climb is A's: the same riders reach 0.90 m.

**For the coordinator and Vicente (not built; each needs his word):**
1. **Keep A for his way.** No arm measured here beats A with Compress held.
2. **Measured: the plateau helps steer only and hurts his way. Inferred: the low-speed reading hurts his way.** The
   evidence points to a map that is A below about 4 m/s (the 6 m/s row, A's held 4 m/s design) and keeps some of
   B's stiffer water only in the turn's 5–7 m/s band. That map would bring back the very band where B loops with
   Compress, so it would be a trade the owner's riding has to judge. I do not recommend building it before he
   rides Y.
3. **The slow board after the release is still what fails first on every arm:**
   - A under-asks there (the range unused);
   - B's and Y's low-speed gains over-ask there (the range overflowed);
   - R's own gains overflow there too.

   A design for 2–4 m/s that is robust to its delay needs 3.5x's candidate 4 first: the slow board's plant,
   identified from the game's own ticks.

**Ride Y** (built at `a7398222`, on `claude/return-taper`; off by default, pinned off online):

    ?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantSpeed=taper6

**Reproduce:**

    S=<scratch>/35y
    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/what-fails-first.ts -o $S/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > $S/wff.mjs && cat $S/raw.mjs >> $S/wff.mjs      # SHA-256 f1a7eb42…
    ./node_modules/.bin/rolldown docs/research/new-rider/3.5/sideways-falls.ts -o $S/sfraw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > $S/sf.mjs && cat $S/sfraw.mjs >> $S/sf.mjs        # SHA-256 d28b0bc6…
    env MODE=organic SEED=<1-9> PERIODS=12 STAND_HOLD=5 SCRIPTS=cue,cueC,cueL,cueR,cueCL,cueCR EXTRA='&cueLater=on&plantSpeed=taper6' OUT=$S/runs/o-s<seed>-Y.jsonl node --max-old-space-size=3200 $S/wff.mjs
    env ... EXTRA='&cueLater=on&plantFloor=6' OUT=$S/runs/o-s<4-9>-A.jsonl ...
    env MODE=catch RUN=<0-9> SCRIPT=<cue|cueC> EXTRA='&cueLater=on&plantSpeed=taper6' OUT=$S/catch/c-<script>-on-t6-<run>.jsonl node --max-old-space-size=3200 $S/sf.mjs
    # reads: seeds 1-3 in one directory with 3.5x's o-s<1-3>-{A,B,R}.jsonl linked beside Y's; seeds 4-9 with Y and A
    python3 docs/research/new-rider/3.5/what-fails-first.py <dir> checks|lines|summary|twins|classify|climb
    python3 docs/research/new-rider/3.5/what-fails-first.py <dir> diverge Y A      # and Y B
    env TAGS=pf6,tp,t6 YDIR=$S python3 docs/research/new-rider/3.5/what-fails-first-catch.py <3.5x scratch> docs/research/new-rider/3.5/results/35v/data

**Data in the repository** (`results/35y/`, 0.3 MB):
- the model check (`model-*.jsonl`, `gains-taper6.jsonl`);
- the byte check;
- the reads named above;
- `run-summaries.jsonl.gz`: every new run's control, stand (weights once per file), summary and done rows,
  reproduction control and catch included.

The per-frame runs (288 MB) stay in the session scratchpad, under `35y/runs/` and `35y/catch/`.
