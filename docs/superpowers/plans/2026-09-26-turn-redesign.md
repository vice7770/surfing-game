# Turn Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A standing rider who can bank into a turn and hold the board on its rail, so carves reach Forsyth et al. 2024's turns (bottom turn about 100° in about 1 s, 1.9 rad/s peak, a 40° rail at 7 m/s) without the light board capsizing.

**Architecture:** The standing body gets a bank angle θ: an inverted pendulum about the stance, pulled by gravity and the turn. Finite ankle/knee roll stiffness k and damping c couple it to the board's roll φ. The torque they carry reaches the board as the centre of pressure across the feet, τ = N·c_x, capped at ±0.13 N (the feet's edges). The rider's balance sets the ankle's rest angle so the body's bank follows the turn. The design numbers (k, c, the balance gains) come from a small linear model, fitted to what a carve lab measures in the simulation, before any of it is built into the solve.

**Tech Stack:** TypeScript, three.js vectors, Vitest; rolldown-bundled Node scripts for the lab (as `scripts/ride-report.ts`).

**Spec:** this plan's Design section below. It argues from the evidence in `docs/superpowers/plans/2026-09-26-p9-riding.md` (Findings: Tasks 8–11 and Task 12), `docs/superpowers/plans/2026-09-26-p4e-fins-rails.md` (Task 2's carve items), and PR #17 (32 standing substeps).

## Design

**What the evidence says** (this session's probes, all at 7 m/s on a 15° plane face):
- **The hull can carve.** Held at a 42° rail with a rigid load, it turns 1–1.4 rad/s (it bleeds speed, 7 → 4.6 m/s in 1.5 s).
- **The standing rider cannot hold the board on a rail.**
  - It is carried upright in the world and reaches the board only through its centre of pressure.
  - A full lean (0.2 m) settles at a 9–12° rail: about 0.2–0.25 rad/s.
  - Any larger lean — a 0.4–0.8 m cap, rail pressure 0.05–0.1 m, or a lean capped by the turn's pull — capsizes the board.
- **Why the board capsizes.** Once the centre of pressure pins at the feet's edge (0.13 m), the board rolls 15° → 45–60° in about 0.1 s.
  - The board is about 5 kg with almost no roll inertia of its own, and the upright body lends it none.
  - The balance loop (0.15 s) is slower than the capsize.
- **What is already fixed.** 32 standing substeps (PR #17) removed the numerical 13–16 Hz roll jitter (P4e's Mode A). The 4 s full-lock carve holds.

**The design.**
- **The ankle torque.** A real rider's ankles and knees tie the board's roll to the body's large roll inertia, about m·h² ≈ 60 kg·m² about the feet against the board's ~0.1. The torque between them is carried by the pressure across the feet:
  - τ = k (θ − φ − δ) + c (θ̇ − φ̇), with δ the rider's commanded body-to-board angle;
  - the centre of pressure sits at τ / N;
  - beyond ±0.13 m it clamps, and the rider tips (as now).
- **The body.** I_b θ̈ = m g h sin θ − m h a_lat cos θ − τ, with h the leg's height and a_lat the stance's lateral acceleration. The board receives +τ on its roll.
- **The balance** keeps the body's bank near the turn's equilibrium, θ* = atan(a_lat / g), by setting δ (a capture-point law on θ).
- **The steer command** sets the rail: δ biased by steer · RAIL_RANGE.

**The known risk.** P9 Task 5 found a finite leg across the body grew the 3 Hz roll–yaw wobble (P4e's Mode B) above about 8.5 m/s, at 16 substeps.
- The lab (Task 1) measures Mode B's damping for the current rider and for each candidate before it ships.
- The model (Task 2) picks k and c to keep it damped.
- If no k and c do, Task 3 stops at its gate and the plan reports to the user.

## Global Constraints

- Every mechanic is a physical rider input; the player gives intent and the rider's reflexes balance (gameplay spec, Principles).
- Study outcomes are validation checks, body limits are tunable parameters, and performance is measured, never a gate (gameplay spec, Principles).
- No test may be deleted or weakened to pass; a tolerance change needs a ledgered reason.
- The standing rider keeps `STANDING_SUBSTEPS = 32` (PR #17).
- Keyboard, gamepad and touch inputs stay as P9 built them (`steer`, `trim`, `crouch`, `hand`).

## Review Focus

1. **Goofy stance.** The same steer banks the same way over the ground, and the bank mirrors. (Test in Task 3.)
2. **A relaunch mid-carve** (retry, or a fall and remount) starts the body upright, with the bank rate and the ankle state reset and no NaN. (Test in Task 3.)
3. **Landing from the air.** A banked body landing on a rolled board brings no torque spike past the load cap, and the energy ledger closes. (Test in Task 3.)
4. **Slow riding (under 2 m/s)** and a still board on flat water: the bank stays near upright, and the rider does not tip over from a turn that is not there. (Test in Task 3.)
5. **Lying, pushing up and landing phases** are unchanged: the bank applies only while standing. (Test in Task 3.)

---

### Task 1: The carve lab

**Files:**
- Create: `src/dev/carveMetrics.ts`, `src/dev/carveMetrics.test.ts`, `scripts/carve-lab.ts`, `docs/research/carve-lab.md` (generated)
- Modify: `package.json` (script `report:carve`)

**Interfaces:**
- Produces:
  ```ts
  /** A damped oscillation's frequency (Hz) and damping ratio, from equally spaced samples, by the zero crossings and the logarithmic decrement of successive peaks. */
  export function dampedMode(samples: readonly number[], dt: number): { frequency: number; damping: number; peaks: number } | undefined;
  /** A turn's measures from a heading trace (rad) at step dt: yaw turned, peak yaw rate, and the time to reach `degrees`. */
  export function turnMeasures(headings: readonly number[], dt: number, degrees: number): { yaw: number; peakRate: number; timeTo: number | undefined };
  ```
  - `npm run report:carve` writes `docs/research/carve-lab.md`.

- [ ] **Step 1: Write the failing tests** in `src/dev/carveMetrics.test.ts`:
  - `dampedMode` on `e^(−ζωt) sin(ω_d t)` sampled at 1/60 s, for 3 Hz and ζ 0.1, and 1 Hz and ζ 0.3: frequency within 3 %, damping within 0.03;
  - `dampedMode` on a growing oscillation (ζ −0.05) returns a negative damping;
  - `dampedMode` on fewer than two peaks returns `undefined`;
  - `turnMeasures` on a heading ramp of 1.745 rad/s for 1 s: yaw 1.745 ± 0.01, peak 1.745 ± 0.01, `timeTo(60°)` 0.6 ± 1/60 s.

- [ ] **Step 2: Run them.** `npx vitest run src/dev/carveMetrics.test.ts`. Expected: FAIL (module not found).

- [ ] **Step 3: Implement `carveMetrics.ts`.**
  - `dampedMode`:
    1. remove the mean;
    2. find the local maxima above 5 % of the largest;
    3. take the frequency from the mean spacing of successive maxima;
    4. take the logarithmic decrement Λ from the mean of ln(x_i / x_{i+1});
    5. ζ = Λ / √(4π² + Λ²).
  - `turnMeasures`: unwrap the headings; yaw = last − first; peak = the largest |Δ|/dt; timeTo = the first time |yaw| ≥ degrees.

- [ ] **Step 4: Run them.** Expected: PASS.

- [ ] **Step 5: Write `scripts/carve-lab.ts`.** On the 15° plane face (`PlaneWater({ slopeZ: −tan 15° })`, the `acrossFace` set-up of `AttachedRider.test.ts`), it runs and tabulates:
  - **Hard turn:** straight down at 7 m/s, settle 0.3 s, then steer 1 and crouch 0.6 for 2 s. It reports yaw at 1.2 s, peak rate, rail angle (mean over the last 0.5 s), speed kept, whether the rider stays attached, and the load's peak (BW).
  - **Carve envelope:** steer 0.25, 0.5, 0.75 and 1 for 4 s, at 5, 7 and 9 m/s: steady yaw rate and rail, and survival.
  - **Roll–yaw wobble:** riding straight at 5, 7, 9 and 11 m/s, settle 1 s, add 0.5 rad/s of roll rate to the board, record the yaw rate for 3 s, and report `dampedMode` (Mode B).
  - **Hull roll:** a board with a prone rider (rigid with it) at 7 m/s. Give it a 10° roll kick and fit the roll trace's `dampedMode`. Report the frequency and damping, and derive K_h = I ω² and C_h = 2 ζ I ω with I from the board and prone rider's roll inertia (read `board.worldInertia`-equivalent: the board's `bodyInertia` about its forward axis plus the prone rider's `m·r²` from its parts).
  - **Forsyth targets beside each row:** bottom turn 99° in 0.96 s, 1.9 rad/s, 42° rail, 7.3 m/s; cutback 152°, 3.0 rad/s, 75° rail.

- [ ] **Step 6: Run it on today's rider.** `npm run report:carve`. Record the baseline in `docs/research/carve-lab.md`. Expected: a hard turn of about 13° in 1.2 s at ~0.25 rad/s. The Mode B damping at each speed is the reference Task 3 must not lose.

- [ ] **Step 7: Commit** `feat: a carve lab that measures turns, the roll–yaw wobble and the hull's roll`.

### Task 2: The roll model, and the design numbers

**Files:**
- Create: `src/physics/rollModel.ts`, `src/physics/rollModel.test.ts`

**Interfaces:**
- Consumes: the lab's hull roll K_h, C_h and board-plus-rider roll inertia (Task 1).
- Produces:
  ```ts
  export interface RollParams { boardInertia: number; hullStiffness: number; hullDamping: number; mass: number; height: number; ankleStiffness: number; ankleDamping: number; balanceGain: number; balanceRate: number }
  /** The linearised roll dynamics about upright, x = [φ, φ̇, θ, θ̇] (board roll, body bank): ẋ = A x. */
  export function rollMatrix(p: RollParams): number[][];
  /** The eigenvalues of a real square matrix (re, im). */
  export function eigenvalues(a: number[][]): { re: number; im: number }[];
  /** The steady bank (rad) and rail (rad) for a turn of lateral acceleration aLat (m/s²) at the given command. */
  export function steadyCarve(p: RollParams, aLat: number, command: number): { bank: number; rail: number };
  ```

- [ ] **Step 1: Write the failing tests** in `rollModel.test.ts`:
  - with the ankle stiffness and damping at 0, the body's pendulum is unstable: an eigenvalue with re ≈ +√(g/h) within 2 %;
  - with k = 800 N·m/rad, c = 80 N·m·s/rad and the balance on (gain 1.5, rate 4), every eigenvalue has re < 0;
  - `eigenvalues` of [[0,1],[−4,−0.4]] is −0.2 ± 1.99i;
  - `steadyCarve` at a_lat = g·tan 40° gives a bank of 40° ± 1°.

- [ ] **Step 2: Run them.** Expected: FAIL (module not found).

- [ ] **Step 3: Implement.**
  - The model, linearised about upright:
    - I_board φ̈ = −K_h φ − C_h φ̇ + k (θ − φ − δ) + c (θ̇ − φ̇);
    - I_body θ̈ = m g h θ − k (θ − φ − δ) − c (θ̇ − φ̇);
    - I_body = m h².
  - The balance law sets δ = −balanceGain (θ + θ̇ / balanceRate) (a capture-point law), folded into A.
  - `eigenvalues`: QR iteration with Hessenberg reduction and Wilkinson shifts, for up to 8 × 8; plain arrays.
  - `steadyCarve`: bank = atan(a_lat / g); rail from the steady moment balance K_h φ = k (θ − φ − δ) with δ from the command.

- [ ] **Step 4: Run them.** Expected: PASS.

- [ ] **Step 5: Choose the numbers.** Using the lab's K_h, C_h and inertias at 7 m/s:
  1. sweep k over 200–2000 N·m/rad and c over 20–200 N·m·s/rad;
  2. keep the pairs where every mode's damping ratio is at least 0.3 and the board's roll mode is slower than 6 Hz (a 0.15 s balance can follow it);
  3. pick the softest such k, which leaves the most room for the rail to follow the rider;
  4. check the pick at 5 and 9 m/s.

  Record the sweep and the pick as a table in the plan's Findings. The human-body references are Winter's ankle stiffness in stance of 400–1000 N·m/rad each, and the knee.

- [ ] **Step 6: Commit** `feat: a linear roll model of the board and a banked rider, and the design numbers from it`.

### Task 3: The banked rider in the solve

**Files:**
- Modify: `src/physics/AttachedRider.ts` (bank state, ankle torque, balance), `src/physics/BoardBody.ts` (the 8 × 8 standing solve), `src/physics/AttachedRider.test.ts`, `src/physics/BoardBody.test.ts`

**Interfaces:**
- Consumes: `RollParams` numbers from Task 2 (as constants `ANKLE_STIFFNESS`, `ANKLE_DAMPING`, `BANK_GAIN`, `BANK_RATE`, `RAIL_RANGE`).
- Produces: `AttachedRider.bank: { angle: number; rate: number }` (rad, rad/s; read by rendering and the lab).
  - The standing solve gains an eighth unknown, the bank rate's change. The ankle's spring and damper are implicit in it, as the leg's are in the seventh.

- [ ] **Step 1: Write the failing tests** in `AttachedRider.test.ts` (and flip the P9 hard-turn test from `it.fails` to `it`):
  - **Hard turn** (the existing P9 test): full lean and crouch 0.6 at 7 m/s turns at least 60° in 1.2 s, peaking above 1 rad/s, attached, keeping at least 0.7 of its speed.
  - **Holds a carve:** steer 0.75 for 4 s at 7 m/s: the rider stays on, and the rail settles between 25° and 50°.
  - **Review Focus 1:** a goofy rider's hard turn turns the same way over the ground, within 10°.
  - **Review Focus 2:** relaunched mid-carve (`board.attach(rider)` after 0.8 s of steer 1), `rider.bank` reads 0, 0, and a straight ride for 2 s stays attached with no NaN.
  - **Review Focus 3:** the 0.3 m drop at 7 m/s (the P9 landing test) keeps the load under the 4 BW cap, and the ledger closes within 2 %.
  - **Review Focus 4:** a standing rider on still flat water, and one gliding at 1.5 m/s: over 5 s, |bank| stays under 5° and the rider stays on.
  - **Review Focus 5:** lying and paddling for 3 s, `rider.bank` stays 0, 0.
  - **The wobble** (from the lab's measure, as a test): riding straight at 7 and 9 m/s after a 0.5 rad/s roll kick, the yaw rate's `dampedMode` damping is at least the baseline's.

- [ ] **Step 2: Run them.** Expected: the hard turn and the carve hold FAIL as today (13° in 1.2 s; the board capsizes past 0.4 m of lean); the others fail on the missing `bank`.

- [ ] **Step 3: Implement**, in this order, running the whole `AttachedRider.test.ts` after each:
  1. **The bank state and its pendulum, with the ankle torque.**
     - Add `bank` and integrate I θ̈ = m g h sin θ − m h a_lat cos θ − τ implicitly with the solve.
     - The body's centre of mass moves h sin θ across the stance frame. This replaces the kinematic `lean.x` while standing; `lean.z` stays the trim.
  2. **The torque on the board.**
     - τ reaches the board as the centre of pressure's offset, c_x = τ / N.
     - When |c_x| would pass 0.13 m, τ clamps and the existing `tip` limit applies.
  3. **The eighth unknown.** The bank rate enters the standing system as the leg's rate did: the ankle's damping c and stiffness k at h·c and h²·k, implicit on the substep.
  4. **The balance.**
     - δ = −BANK_GAIN (θ − θ* + θ̇ / BANK_RATE), with θ* = atan(a_lat / g) from the stance's lateral acceleration, low-passed over 0.1 s.
     - Plus the steer's rail command: δ += steer · RAIL_RANGE.
     - Heading hold's lean becomes a small δ bias; the hand's bend likewise.
  5. **Rendering:** the drawn body banks by θ about the stance's forward axis.

- [ ] **Step 4: Run** `npx vitest run src/physics`, then the whole suite. Expected: all pass, with the hard turn and the carve hold now passing. **Gate:** if the wobble test fails at any speed for every k and c the model allowed, stop. Record the measurements in Findings and report to the user; do not tune past the model.

- [ ] **Step 5: Commit** `feat: bank the standing rider into turns on its ankles`.

### Task 4: Validate against Forsyth and record

**Files:**
- Output: `docs/research/carve-lab.md` (regenerated), `docs/research/ride-report-practice.md` (regenerated on the Canyon), this plan's Findings, `ROADMAP.md`, the memory note `p4e-carve-root-cause`

- [ ] **Step 1: Run** `npm run report:carve`. Compare the hard turn, the carve envelope and Mode B with the baseline and with Forsyth (bottom turn about 100° in about 1 s, 1.9 rad/s, 42° rail; cutback 152°, 3.0 rad/s).
- [ ] **Step 2: Run** `npm run report:ride -- --practice --ghosts --style turns --seeds 2 --minutes 5 --spots canyon --out docs/research/ride-report-practice.md`. Read its turn table beside Forsyth's.
- [ ] **Step 3: Measure performance.** Time the standing step in Node, as in P9 Task 12.
- [ ] **Step 4: Record** the findings (what reached Forsyth and what did not) in this plan, update the ROADMAP's P9 entry and the memory note, then commit `docs: record the turn redesign`.
- [ ] **Step 5:** Open the PR and stop for the user's playtest.

## Findings

(Filled in as the tasks run.)
