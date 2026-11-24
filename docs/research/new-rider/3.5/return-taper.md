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
