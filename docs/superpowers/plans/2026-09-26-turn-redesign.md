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

### Task 3: The banked rider in the solve (amended 2026-09-26)

The first pass (below, "Built so far") put the bank in the solve and found a balance that carves, but riders fell leaving turns, linking them and dragging a hand. Task 2's model left out what decided those: the planing hull's roll response, the turn's speed dependence, the board's roll–yaw mode and the feet's limit. The user chose to redesign the balance on a measured plant (3a–3c) rather than tune past the model again.

**Built so far (kept, uncommitted until 3c):**
- `AttachedRider`: the body banks about the feet. The bank is measured from where the centre of mass leans over the stance; the body's frame, `up` (the leg) and `across` bank with it, within MAX_BANK 70°. `bank: { angle, rate }` is public.
- The standing solve is 8 × 8 (`BoardBody.system8`): the bank's speed across the leg is the eighth unknown. The ankle's spring and damper are implicit in it (backward Euler). The board takes the ankle's couple through the contact's line through the centre of mass.
- Standing, the lateral balance shift and the steering lean are gone (the bank replaces them); the trim stays.
- The interim balance: δ = 7.4 (θ_ref − θ) − 3.6 θ̇ − φ_surface, through a 0.01 s motor lag, with the reference eased in over 0.1 s. The heading hold asks for 0.1 rad and reads a yaw rate smoothed over 0.25 s. It passes the hard turn, the carve, the wobble, the shove and the line hold; it fails exits, S-turns and the hand (Findings).

**Interfaces:**
- Produces: `AttachedRider.bank: { angle: number; rate: number }` (rad, rad/s; read by rendering and the lab). The 8 × 8 standing solve.
- 3a produces the plant table (`docs/research/carve-lab.md`, "The plant") that 3b reads into `rollModel.ts` as `PLANT` (speed → params). 3b produces the balance law and numbers that 3c builds in.

#### Task 3a: Measure the plant

**Files:**
- Create: `src/dev/heldRider.ts` (a lab rider whose bank is held and whose board takes a set couple), `src/dev/heldRider.test.ts`
- Modify: `scripts/carve-lab.ts` (a "plant" section), `docs/research/carve-lab.md`

- [ ] **Step 1: Write the failing tests** in `src/dev/heldRider.test.ts`:
  - with no couple, a held rider towed at 7 m/s on flat water keeps `bank` at 0, 0 for 2 s and stays on;
  - a +30 N·m couple rolls the board toward its +x rail (the rail grows positive) and turns it toward +x;
  - the couple's sign flips both.
- [ ] **Step 2: Run them.** Expected: FAIL (module not found).
- [ ] **Step 3: Implement `HeldRider`**, a subclass of `AttachedRider` for the lab only:
  - `couple` (N·m, about the board's roll axis, positive rolling the +x rail down) and `heldBank` (rad);
  - `coupleStanding` calls the parent's, then replaces row and column 7 with u′ = 0 (the body carried at its bank, as before the redesign) and adds h·couple·r to the board's angular rows, r = −(the heading's forward).
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Add the plant section to the lab.** On flat water, the board kept at speed along its heading each step (a tow that follows the heading), at 3, 5, 7, 9 and 11 m/s:
  1. **The hull's roll:** couples of ±20 and ±40 N·m for 1.5 s. Report the steady rail per N·m (1/K_h) and the time to 63 % (C_h/K_h).
  2. **The turn:** from the same runs, the steady yaw rate and the pull per rail, G = (v ω / g) / tan φ, and the pull's lag behind the rail, T.
  3. **The rail's drag:** without the tow, the speed lost per second at steady rails of 20°, 40° and 60°.
  4. **The load line:** the body held at a bank of 20° with no couple. Where does the board's rail settle, as a share of the bank?
  5. **Mode B with the body held:** the wobble ratio after a roll kick (the old rider's).
- [ ] **Step 6: Run** `npm run report:carve` and record the plant table.
- [ ] **Step 7: Commit** `feat: the carve lab measures the board's roll and turn under a held rider`.

#### Task 3b: Design the balance on the measured plant

**Files:**
- Modify: `src/physics/rollModel.ts`, `src/physics/rollModel.test.ts`

- [ ] **Step 1: Write the failing tests** in `rollModel.test.ts`:
  - `PLANT(v)` gives 3a's measured K_h, C_h, G and T at 3–11 m/s, interpolated between speeds.
  - `simulateBalance(plant, law, scenario)` (nonlinear: τ clamps at 0.13 N, the ankle's rest within its range) reports the rail, the bank, the heading and whether the rider tips.
  - With the chosen law, at 4, 7 and 11 m/s, the rider stays on through:
    - **entry:** steer 0 → 1;
    - **exit:** 1 → 0 after 1 s, back within 10° of upright in 1 s;
    - **reversal:** +1 → −1 at 2 s periods for 6 s;
    - **the hand's push:** a 90 N drag on the body, 1 s.
  - At 7 m/s, full steer settles at a 38–46° rail (Forsyth's 42°).
  - The balance on the bank alone still has the reference gain equal to the bank gain.
- [ ] **Step 2: Run them.** Expected: FAIL.
- [ ] **Step 3: Implement** `PLANT`, `simulateBalance` and the law. Its structure:
  - steer into the fall: the board's rail target leads the body's bank by the bank error and its rate;
  - the rail the balance may ask for is capped (RAIL_MAX), keeping headroom above the steady carve to tighten a turn on the way out;
  - anti-windup: the ankle's rest never asks for more than the feet's torque and the ankle's range can give;
  - its gains scheduled with the measured turn gain G(v), if the scenarios need it.
- [ ] **Step 4: Run them.** Expected: PASS.
- [ ] **Step 5: Commit** `feat: a balance for the banked rider, designed on the measured plant`.

#### Task 3c: Build the balance in and validate in the solve

**Files:**
- Modify: `src/physics/AttachedRider.ts`, `src/physics/AttachedRider.test.ts`, `src/physics/BoardBody.ts`

- [ ] **Step 1: Write the failing tests** in `AttachedRider.test.ts`, with the existing Task 3 tests:
  - **Linked turns:** from 6 m/s on the face, S-turns at steer 0.75 and at steer 1, 2 s periods, for 6 s: attached, the heading swinging at least 40°.
  - **The exit:** the existing "holds the new line after a turn".
  - **The hand:** the existing "drags a hand in the face".
  - **Review Focus 2, the relaunch:** carve 0.8 s at steer 1, then place the board afresh and attach, as `RideSession.reset` does. `rider.bank` reads 0, 0, and 2 s of straight riding stay attached.
  - **The carve hold:** steer 0.75 for 1.5 s holds a 25–50° rail.
- [ ] **Step 2: Run them.** Expected: the S-turns, the exit, the hand and the relaunch FAIL with the interim balance.
- [ ] **Step 3: Implement** 3b's law and numbers in `prepareBank`. Remove the lab's probe knobs.
- [ ] **Step 4: Run** `npx vitest run src/physics`, then the whole suite. Expected: all pass.
  - **Gate:** if the model's law fails the solve's scenarios and one re-measure of the plant does not explain why, stop and report to the user.
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

**Task 3, first pass (the interim balance).**
- The bank as an eighth unknown works. With Task 2's gains every standing test fell: the roll-rate gain cancelled most of the ankle's damping on the board, and the roll and pull feedbacks fed the board's 3–5 Hz roll–yaw mode, which the model leaves out.
- A balance with no motor lag rang from one substep to the next through the light board; 0.01 s cures it (0.02 s lets the 11 m/s wobble grow).
- The heading hold, sized for the old 0.2 m lean, drove the wobble through the bank; asking 0.1 rad and reading a yaw rate smoothed over 0.25 s fixes it.
- In a coordinated carve the ankle rests, so the reference gain is the bank gain.
- δ = 7.4 (θ_ref − θ) − 3.6 θ̇: the wobble decays at 5–11 m/s, the hard turn makes 66° in 1.2 s at 2.46 rad/s on a 54° rail, a 0.75 carve holds 38°. But riders fall leaving a turn, linking turns and dragging a hand: the ankle's rest winds far past what the feet can give, and the board rolls away onto a 45–85° rail.

**Task 3a, the plant** (a held rider, the board towed along its heading on flat water; `docs/research/carve-lab.md`).
- The board is stiff in roll under the rider: 850–910 N·m/rad at 5–7 m/s, 1,270–1,700 at 9–11 m/s, settling in 0.03–0.05 s (the prone kick's 100 was a paddling board). The feet's ~100 N·m move the rail only about 6°.
- It rights about the rider's load line: under a banked, held body the rail settles at 0.97–1.0 of the bank at 5–7 m/s, 0.8–0.9 at 9 m/s, 0.7–0.8 at 11 m/s. The rail comes from the body's bank.
- The turn follows the rail within about 0.03 s (Task 2 assumed 0.3 s), with a pull per rail G ≈ 1.0–1.2 under a banked load (1.3–1.7 at the couple's small rails). A banked turn loses about 2 m/s² of speed at 12–24° of rail.
- At 3 m/s the board hardly planes and a banked rider falls off.
- So the ankle's rest saturates the feet past about 0.25 rad (14°); anything more only over-rolls the board. With the rest capped there the hard turn makes 75° at 2.2 rad/s, but exits, S-turns and the hand still fall later: the bank can change only about 3.3 rad/s² on the feet (−40° to +40° takes about 1.3 s), on the face the body stalls banked while the board carves uphill and slows, and the hand's drag yaws the board so the body falls outward.

**Task 3b–3c, the balance built** (with the user: the upper body's swing, and a 50° steer).
- `rollModel.bankAuthority`: on the plant the bank answers the ankle's rest like a double integrator; the feet reach their edges at a rest of 0.23 rad at 7 m/s, about 3 rad/s² of bank. The rider caps the rest at 0.25 rad.
- Past about 45–50° of rail the board stops turning harder and bogs down (7 → 2 m/s in 0.5 s), so tightening a turn cannot lift a banked body out of it. Crouch pulses (unweighting through the leg, rate-limited at 0.6 g), picking up the line late, and asking for less bank did not fix full-steer reversals.
- The upper body's swing (a rotor of 10 kg·m², ±1.2 rad, up to 200 N·m from the hips) takes what the feet cannot give. It swings back only once the feet cope: given back while the body still needed it (a −259 N·m kick in the trace), it threw the rider into the turn. With it the hand drag holds (it slows the board by about 3.5 m/s over 1 s) and a quick full-steer turn exits and holds its line.
- The steer's full bank sets the trade (all with the swing): at 40°, the hard turn makes 39° and 0.75-steer S-turns link; at 50°, 62° at 2.2 rad/s, but 0.75- and full-steer S-turns at a 3 s period fall at the first reversal, after 1.5 s of carving has taken the board across or up the plane face. The user chose 50°.
- The heading hold now picks up its line once the turn has died down (yaw rate under 0.15 rad/s): the banked body carries the board on round a moment after the steer is let go (a half-steer turn drifted 13° past a line taken at release).
- A quicker reference ease (0.05 s) put the hard turn back over 60° after capping only the ankle's torque-producing rest (not the water's tilt it also takes up).

**Task 4, against Forsyth and the baseline** (`docs/research/carve-lab.md`).
- The lab's envelope found two defects the tests missed; both fixed with tests: a quarter steer at 5 m/s fell at 3.8 s, because the ankle laid the board flat on the face against the load-line hull and the swing then ran past its range taking up that steady demand. The ankle's rest now follows the body's line, and the swing bursts only while it can still stop inside its range.
- Hard turn (full steer, crouch 0.6, 7 m/s): 66° in 1.2 s, peak 2.14 rad/s, 60° reached at 1.13 s (before: 13°, 0.63 rad/s peak, a 9° rail). Forsyth's bottom turn: 99° in 0.96 s at 1.9 rad/s on 42°. The peak rate is there; the turn builds more slowly, and its rail runs deeper (50–60°).
- Held carves (4 s): a quarter steer holds at 5–9 m/s and a half steer at 7–9 m/s; three-quarter and full steer climb the plane face and stall (1.8–3.7 s), as a real carve held uphill would.
- The roll–yaw wobble (Mode B) now decays at 7, 9 and 11 m/s (ζ 0.053, 0.063, 0.069; before 0.005–0.019, and −0.002 at 11). At 5 m/s a slower 1.9 Hz mode reads ζ −0.015; the rider stays on.
- Lines up to 80° across the 15° face hold until the board slows below planing (5–9 s from 7 m/s); held upright they threw the rider at once (P4e).
- A shortboard still or gliding at 1.5 m/s sinks under a standing rider (0.6 m in 1.5–1.9 s, as before); the body stays upright over it.
- Performance: a standing rider's board step costs about 2.0–2.4 ms at 60 Hz in Node on the M1 Air (prone 0.3 ms), beside the water's ~35 ms (P9). Not a gate.
- **Open (merged after the user's playtest said it looks kinda ok): the autopilot's rides on the Canyon.** The pre-redesign rider (commit fa5c45d) made 14 stands and 10 rides of 3 s or more over two seeds × 5 min (mean 4.6 s, 1.5 turns a ride). The banked rider made 6 stands and none. Logged per fall, the falls after standing came at 1.2–2.2 m/s, below planing, with the bank at 70° and the swing at its stop.
  - Two causes fixed with tests: the rider leaned into hard steering with no turn under it (the bank is now capped at what a 3 m turn holds at the board's speed); and the pop-up's landing banked, against Review Focus 5 (it now lands upright, as before).
  - After both: 7 stands and still no ride of 3 s. The remaining standing falls come with no steer at all, at 1.3–2.2 m/s. Below planing the hull gives the ankles no roll support (the lab's held rider capsized at 3 m/s), so a free-banking body tips over; the old rider, carried upright over its feet, stayed up until the wave got the board moving. A nudged slow board on the plane face does not reproduce it, so the next step is a trace of those falls on the Canyon, then carrying the body upright below planing (as in the landing) if the trace confirms it.
