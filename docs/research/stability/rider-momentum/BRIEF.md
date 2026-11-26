# 3.6f brief: where the rider's sideways momentum goes when the board turns

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-26.*

## The owner's question and approval

Vicente approved this round in his own words, "Yes, start 3.6f", on 2026-11-26. He was asked: "Start 3.6f, tracing where the rider's sideways momentum goes in the game?" He was told it is diagnosis only: a code read plus a small probe, whose answer decides whether the balance's picture of the board or the game's physics is corrected.

- **Builder:** Opus at **xhigh** effort. The reason: this is a hard root-cause investigation in a large coupled solver (`AttachedRider.ts` is about 6,000 lines), and the earlier readings on this track were corrected twice (3.6b's ledger attribution, 3.6e's lever).
- **Start:** `claude/board-fit` at `ef7908f2` (3.6e, reviewed). It carries 3.6d's probe (`docs/research/stability/response/`) and 3.6e's readers (`docs/research/stability/board-fit/`).
- **Branch** `claude/rider-momentum`, worktree `.claude/worktrees/rider-momentum`. Docs go in `docs/research/stability/rider-momentum/`; this brief is its `BRIEF.md`. Raw runs go in the session scratchpad's `36f/`.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## What is known (3.6e and its review, consult log `7c86cfa9`)

The board's closed yaw ledger (3.6c M1, `yawLedgerClosed`; 3.6d's probe turns it on) was regressed on the board's states after kicked twins. The coordinator's own regression reproduced it. Compress, speed bins with medians 6.0 / 9.3 / 10.5 m/s, per unit model-sign command, frames 0–59 after the kick:

| The rider's yaw moment on the board, per | Game | The balance's model |
| --- | --- | --- |
| r, the board's yaw rate | +4 / +10 / +10 | +111 / +164 / +188 (−x_f m V, x_f = −0.244 m, m = 73 kg) |
| β̇, the slip rate | ≈ 0 | +114 / +167 / +191 |
| ṙ, the yaw acceleration | −1.1 / −1.3 / −1.3 | −5.59 (the legs' 1.24 plus m x_f² = 4.35) |
| θ̈, the body's bank acceleration | +0.2 | +9.8 (−x_f m h) |
| β, the slip | −3 / −253 / −274 | 0 |

- **The lever is the game's own geometry.** `boardDerivatives(…, 0.236)` moves the lab's derivatives from the composite's centre of mass to the board's. The rider's centre is then 0.236 × 75.54 / 73 = 0.244 m behind the board's (the model's `feetStation`). The game couples the rider through its own centre of mass with the arm `position − board.centerOfMass` (`AttachedRider.prepare`), standing at the feet's midpoint (`riderPosture.ts`, `stanceFeet`).
- **The yaw inertia the board feels is the legs' alone.** It matches `coupleYaw`'s rigid `lower` share (`stanceAt`: 1.24 kg·m² in Compress, 0.86 in the tuck). None of the body's 4.35 kg·m² at its offset shows.
- **The water's yaw per ṙ** is +0.8 to +1.0 (a negative added inertia; the model's is −0.12). The rider's yaw per β (above 8.7 m/s) is a term the model lacks. Either could be the missing moment booked under another name.
- **The roll side shows the same.** The rider's roll moment per β̇ (the body's sideways push at the deck, −z_d m V) is 3–30 % of the model's. The ankle's roll torque per rest is 65–86 % of the model's.
- **3.6c found** the sideways tip is the body's speed across the feet, and that it follows the yaw swing.
- **Codex's ledger finding** (consult log, 3.6b review, `27b026f5`, verified in `5d832318`): the shipped yaw ledger booked part of the surface-normal impulse twice. 3.6c's closed ledger fixes the booking and keeps the old excess in `duplicate`. The closed ledger's closure has been shown on a bare board on a plane, not with a rider standing on a Canyon face.

## The questions

1. **The trace: how the body's translational momentum is carried as the board turns,** for the new rider standing, as the code implements it, substep by substep. Give `file:line` for each part.
   - The unknowns, the constraints and the springs: the leg's rate s′, the bank's u′, and the ninth unknown along the board.
   - What the rider adds to the board's system matrix and right-hand side (`coupleStanding`, `coupleYaw`), and which of those blocks carry the body's inertia into the board's angular rows (the m [a]× terms).
   - The drive velocity (`uprightVelocity`, `drive`); `settle`, `project` and `pushBoard` (an impulse the feet cannot give); `finish`; and `carried` and `arm` being re-set each substep.
   - **Name every path by which the rider's velocity can change without its reaction reaching the board,** and every path where the reaction does reach it.
   - Say whether the body's sideways speed relative to the feet (u′) is the bank's own rate, as in the model's pendulum (the body pinned at the feet), or a freedom the model lacks.
2. **The momentum accounting, measured.** Per substep on a few of his rides, before and after the substep:
   - the composite's linear momentum (board plus rider), and its angular momentum about a fixed world point (with the rider's yaw rotors and the twist's upper body);
   - against the external impulses (the water's settled impulses, gravity).
   - Report the residual, the momentum the coupling creates or destroys, as a yaw moment about the board's centre of mass. Give it per unit of the board's yaw rate and yaw acceleration, the way 3.6e's question 1 regressed, beside the missing m V x_f and m x_f² ṙ.
   - **Controls, which must close before any standing number counts:**
     - the bare board (no rider);
     - the rider lying prone (carried rigid);
     - a case whose answer is known, for example the rider's mass carried rigidly at its arm, built with a probe-side wrapper or a measurement knob at its identity.
3. **The yaw inertia the board feels, directly.** Use the bank ledger's unit impulses on the substep's own solved system (`bankLedger.ts`, (iv) the unit side impulse on the board's rows and (v) the unit yaw impulse about the body's up).
   - On a steady straight glide in each of his three stances, and on the kicked twins' frames: the board's yaw-rate answer to a unit yaw impulse, against 1 / (I_board + the legs) and 1 / (I_board + the legs + m x_f²).
   - The same for a unit side impulse at the feet's station.
4. **The ledger's booking.** Does the closed yaw ledger book any of the rider's reaction as water while he stands?
   - The closed ledger's closure with no rider on a Canyon face, not a plane.
   - Then with the rider standing: whether `addedMass`, `radiation` or any water entry answers the rider's mass. For example, a probe-only twin with the rider's mass or arm changed for one step, the water held.
   - The candidates are the water's yaw per ṙ and the rider's yaw per β.
5. **The verdict, with sizes.** Which of these carries 3.6e's gap, and how much of it each carries (N·m per rad/s of yaw rate and per rad/s² of yaw acceleration):
   - **(a) a leak or hidden source in the coupling:** the body's velocity changes without its reaction on the board;
   - **(b) the reaction present but booked as water** by the ledger;
   - **(c) the reaction present and physical,** but carried through a freedom the model lacks (for example the body sliding across the feet, or the feet's grip projecting the impulse), so it does not act at the swing's 2.5–3 Hz.

   If (a), state the size of the leak and where it is. **Do not fix it.** A fix changes the game's physics and needs Vicente's word.

## How

- **Pre-register before any run**, and commit it: the method, the controls with their pass lines, the rides, and your predictions. Later changes go in as dated amendments, committed before the rows they govern are read.
- **Keep it small.** Vicente was told "a code read plus a small probe".
  - Use a few rides: his three straight stances on Canyon Big seed 1, and a steady glide (the test wave or flat water).
  - Use 3.6d's twin kick times where kicks are needed. This is not a campaign.
- **Instrument from the probe side if you can,** wrapping methods in the probe bundle as 3.6d's probe wraps `tick` and `finish`.
  - Any `src` change must be a measurement switch at its identity: off by default, read by no address, like `yawLedgerClosed`.
  - With any `src` change, run the quick stability report after it and keep it identical.
- **Report every physical number with its input, sample, time and reference frame.** For example: the yaw axis (world up or the board's normal), the point the angular momentum is taken about, and the sign.

## Scope and rules

- **Diagnosis only:** code reading, probes, scripts and measurement switches.
- No arm, no change to the shipped behaviour, no hidden motor, no bound widened, and the turn not limited.
- The shipped design, its gains and the gain lock are untouched.

## Evidence to return

- The trace (question 1) with `file:line`.
- The momentum tables with their controls (question 2).
- The unit-impulse table (question 3).
- The ledger check (question 4).
- The verdict with its numbers (question 5).
- The pre-registration and the order of the round, with times.
- **The controls:**
  - the full stability report before review (`npm run report:stability -- --mode full`): 227 of 227 lines identical to `baseline-full.json`, and its 26 test-wave lines identical to `baseline-quick.json`;
  - the quick report too if `src` changed;
  - the Canyon byte check (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`);
  - `npx tsc -b`;
  - the gain lock (`npx vitest run src/physics/stabilityGains`, 5 of 5).
- `git diff ef7908f2 --stat -- src scripts`.
- The raw runs in `36f/`. Archive into `runs/` only the rows the tables need.

## Read first

- 3.6e's `README.md` (`docs/research/stability/board-fit/`), and the consult log on `claude/the-record` from 3.6e's dispatch (`4144ff19`) through its review (`7c86cfa9`).
- Codex's ledger finding (the 3.6b review, `27b026f5` and `5d832318`), and 3.6c's M1 (`docs/research/stability/wobble/README.md`).
- **The code:**
  - `AttachedRider.ts`: `prepare`, `frame`, `uprightVelocity`, `coupleStanding`, `coupleYaw`, `settle`, `project`, `pushBoard`, `finish`;
  - `BoardBody.ts`: `step`, `advance`, the settle loop, the yaw and roll ledgers;
  - `riderPosture.ts`;
  - `bankLedger.ts`;
  - `standingBody.test.ts`: the coupling's own tests, including "turns its own yaw inertia with the board through the feet";
  - in `predictiveBalance.ts` and `rollModel.ts`, the model's two-body solve, for the comparison.

## Logistics

- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/rider-momentum"` and check with `git ls-remote`.
- Stage only your own paths. Never `git add -A`, never commit `node_modules`, never run the whole vitest suite, and never use a bare `git stash`.
- At most 8 game processes at once.
- Aim for two to three hours. Stop at a clean commit if the coordinator says so.
