# 3.6e: fitting the balance's picture of the board to the measured board, tested on nudges it has not seen

**Effort: xhigh.** This is a hard identification problem. 3.6d measured how the real board answers the balance's commands, cleanly, by kicked twins. The one earlier fit of the balance's plant (3.6a part 2) failed its own controls. This round fits the plant again on the clean twins and tests the fit blind.
**Model:** Opus.

## The owner's question

Vicente rides the new rider on the controller and holds R2 (Compress):
- "the surfer falls by drifting, the board starts drifting left and right when using the controler"
- In Crouch (the tuck), it "crashs the [surfer] down making him fall".

3.6c found that the drift is the balance's own oscillation. 3.6d found why:
- The balance's muscles and senses behave as its internal model says.
- The board's mechanics do not: the real board rolls and turns two to three times as much as the model says.

He approved this round on 2026-11-26 with "Yes, start 3.6e". He was answering: "Shall I start 3.6e, fitting the balance's picture of the board to these measurements?" Earlier the same day he approved the nudges by name ("Yes, use the nudges").

## Starting point

- **Branch:** `claude/board-fit`, new, from `claude/board-response` at `4a50e650` (3.6d, reviewed).
  - The worktree is already made: `.claude/worktrees/board-fit`, on `claude/board-fit`, at `4a50e650`, with `node_modules` symlinked. The branch is on the remote at that commit.
  - It carries 3.6d's probe (`docs/research/stability/response/response-probe.ts`, with `kick` and `replay` in a wrapper of the controller's tick), its readers (`responseLib.ts`, `analyse.ts`, `known.ts`, `shapes.ts`), and the knobs (`src/physics/wobbleKnobs.ts`, every field at its identity).
- **The fitting data:** 3.6d's raw twin runs, read-only, in `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36d/twins/`.
  - These are Canyon Big seeds 1–3, with Compress, tall and the tuck, 50 twins per standing ride.
  - The raw rows carry the closed yaw ledger's and the roll ledger's terms (`e`). The committed archive `runs/twins.tar.gz` does not.
- **Scratch:** `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36e/`, for new runs, bundles and fits. Archive what your tables need into the docs folder, as 3.6d did.
- **Docs:** `docs/research/stability/board-fit/`. This brief is its `BRIEF.md`; commit it unchanged with your pre-registration.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## Already established (cite these; do not redo them)

1. **The matched delay** (3.6d Q1, verified in the coordinator's review `3e8755c5`).
   - Peaks at a 4 / 6 / 8-tick designed delay: Compress 3.08 / 2.67 / 2.36 Hz, the tuck 3.26 / 2.90 / 2.54, tall 2.90 / 2.31 / 2.11.
   - In Compress the swing is 0.30 of itself at 4 ticks and 2.36 times at 8.
   - 3.6c's mismatched shifts (`senseShift` ∓2 ticks) gave 3.72 / 2.05 Hz in Compress.
2. **The board's response, by kicked twins** (3.6d Q2, verified). The stages run from the command (u) through the actuators (δ, τ_a) to the board and body to the senses.
   - **Stage (i), the commands to the actuators,** is the model's exactly.
   - **Stage (iii), the board and body to the senses,** is within 7 % and 10°: the sensed r against −Ω, and the sensed φ̇ against +p.
   - **Stage (ii), the actuators to the board and body, departs.** In Compress at 2.67 Hz:

     | Entry | Gain against the model | Phase |
     | --- | --- | --- |
     | ankle → φ | ×2.75 | −6° |
     | ankle → r | ×2.05 | +44° |
     | ankle → ω_u | ×0.45 | +84° |
     | twist → β | ×3.88 | −28° |
     | twist → φ | ×0.60 | +100° |
     | twist → θ | ×0.71 | +104° |

     Tall and the tuck are in 3.6d's `results/response.md`.
3. **The closure on the measured response** (3.6d Q3; not recomputed by the coordinator).
   - With the balance's own design, the measured responses give a mode at the swing's frequency that does not decay: ζ −0.05 / −0.01 / −0.08 in Compress / tuck / tall.
   - The model's own responses give ζ 0.73 / 0.66 / 0.81.
   - But the closure reproduces the closed twins in only 2 of 38 Compress sets (waveform errors 0.9–2.2), and it misses the 4-tick peak by 0.27–0.57 Hz.
   - No single column, block or row group carries half the ring.
4. **The response changes along the ride.** Kicks 0.5 s apart differ by 26–65 % (the model's by 9–27 %). The kick ticks' speed has a median of 9.1 m/s (0.5–11.9) in Compress.
5. **The game's own loop is within about ±0.04 of undamped, and the read-out sets the sign** (the review). On the 68 passing closed Compress sets:
   - the damped sinusoid gives ζ −0.034;
   - Prony gives +0.019;
   - a plain envelope ratio over two periods gives 0.86.
6. **Linearity** (e_sym ≤ 0.05, e₂ ≤ 0.10) holds in 64–67 % of the sets at δ = 0.005 rad on the ankle and 1 N·m on the twist. A fifth of the kick does not cure it; the failing sets are excluded, not explained.
7. **A ledger lead** (the coordinator's, descriptive). After an open ankle nudge, per rad of command, in the closed yaw ledger's differences:
   - In Compress, the fins' yaw torque is +34.5 N·m at the first tick and the rider's coupling −25.9. By the third tick, the fins give +8.2, the rider −8.0, added mass +3.8 and hull pressure −3.4.
   - Meanwhile the sensed yaw rate reaches −0.38 rad/s within 3 ticks, where the model's is about +0.007.
   - This points at the fins' answer to the board's roll, and at the rider's yaw coupling. It is a lead, not a measured cause.
8. **Passive identification has failed once** (3.6a part 2, `claude/slow-board` `5450d8b3`, review `02d03650`).
   - Fits to the game's closed-loop ticks failed their known-plant recovery under the game's coloured residuals.
   - The grey-box fit of the water's 12 derivatives beat neither truth on held-out rides (0 of 16 cells).
   - The twins remove the wave's forcing: the difference between twins carries only the kick's effect.
9. **Code facts, to be checked at run time, not assumed.**
   - **The model's state order** is [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a].
   - **The senses** are y0 = θ, y1 = θ̇, y2 = ω_u, y3 = θ_t, y4 = ω_u − r, y5 = θ − φ, y6 = θ̇ − φ̇ (`senseMatrix`).
   - **`continuousPlant(y, t)`** builds A from `twistRows` (`rollModel.ts`).
   - **`plantAt(speed, depth, opts)`** builds the plant. Its options include:
     - `scales`: the water's twelve derivatives, [N, Y, K] per rad of roll, per rad of slip, per rad/s of yaw rate and per rad/s of roll rate, as multipliers on the lab table plus the rail's correction;
     - `rollInertia` and `yawInertia`: the board's effective inertias, `BOARD_INERTIA` by speed;
     - `twistStiffness` and `twistDamping`;
     - `body`: the body's frontal inertia;
     - `feetScale`;
     - `tableSpeed`.
   - **What else enters the plant:**
     - `stanceAt` (`STANCE_TABLE`: the height and the lower and upper yaw inertia);
     - `boardDerivatives(scaled, speed, 0.236)`;
     - the ankle's 800 N·m/rad and 80 N·m·s/rad, the same as `HUMAN_ANKLE_STIFFNESS` and `HUMAN_ANKLE_DAMPING`;
     - `feetStation` −0.244 and `deckHeight` 0.031.
   - **Provenance.** The lab table is the "captive derivatives with the rigid point rider" of the roll-plant study, at 5, 7 and 9 m/s and between. `BOARD_INERTIA` was measured standing tall on a steady glide on the terminal plane (3.2 `e32.probe.ts`).
   - **The design at his address** is `DEFAULT_WEIGHTS` with `riderBody: 'two'` and `plantFloor: 6`.

## Questions

1. **Which of the model's mechanical terms depart, term by term?**
   - From the twins' clean differences, measure the game's own derivatives of the water's yaw and roll moments (fins, hull pressure, added mass, the rest), of the rider's coupling through the feet, and the board's effective inertias. Use the same states the model uses, at the kick tick's speed, depth and rail.
   - Compare them with the model's at the same point.
2. **Does a model fitted to the twins predict nudges it has not seen?**
   - Fit `plantAt`'s own parameters to the fitting set's open twins.
   - Does the fitted model predict fresh held-out twins, read blind, better than the shipped model, and by how much?
3. **Does the fitted model, closed with the balance's own design, reproduce the game's own loop?**
   - **The rings:** the closed twins' frequency and waveform, on the fitting and the held-out sets.
   - **The delay sweeps:** 3.6d's matched-delay peaks and 3.6c's `senseShift` peaks.
4. **(Model-only, only if question 3 passes.)** On the fitted model, how damped would a balance designed on the fitted model be?
   - Report it against the shipped design on the same fitted model.
   - No game run, and no change to the shipped design, gains or bounds.

## Method (pre-register this first and commit it before any run of this round, and before opening any held-out row)

1. **The term-level comparison** (no fit across terms).
   - For each ledger term (yaw and roll), regress its twin difference on the twin's state differences over the window, tick by tick, by least squares. Use the states φ, φ̇, β, r and the actuators, plus the accelerations for the inertial terms.
   - Data: the passing open sets of the fitting set.
   - Sum the water's terms and compare them with the model's lab derivatives and rail correction at the same speed and rail. Compare the rider's term with the model's coupling (the ankle spring and damper, the twist, the feet).
   - Pre-register the bookkeeping: which ledger terms the model carries as inertia (the board's effective inertia includes the water's implicit share) and which as derivatives.
   - Report the regression's conditioning.
   - Control: on synthetic differences built from a known linear combination, the regression recovers it.
2. **The grey-box fit.**
   - Fit `plantAt`'s own parameters by output error to the open twins' per-unit responses over 1.0 s: the mechanical states and the senses, from the measured actuators.
   - Use a nested, pre-registered set:
     - (a) the twelve water scales;
     - (b) plus the board's roll and yaw inertia;
     - (c) plus the body's terms: the body's inertia, the twist's stiffness and damping, and the yaw split.

     Choose the smallest set that passes question 2's rule.
   - Per stance. Pool by a pre-registered speed bin, or fit per set and report how the parameters move with speed.
   - Start from question 1's terms where they inform.
   - Report a black-box ceiling for reference: free mechanical rows of A, or a long FIR.
   - **The known-plant control comes first.** Simulate twins on a model with known perturbed parameters, closed with the same `PredictiveController` code (3.6d's `known.ts` pattern), and fit them with the same code.
     - It must recover the parameters within a pre-registered tolerance.
     - On the unperturbed model it must find no gap.
     - This control must pass before any game fit counts.
3. **The held-out set.** Run fresh twins with this round's probe on Canyon Big seeds 4 and 5, which have never been run: Compress, tall and the tuck, the same 50 twins per ride.
   - Do not open a held-out row until the fit and its readers are frozen and committed.
   - Pre-register the criterion, for example: the fitted model's prediction error is below the shipped model's on at least 75 % of the held-out sets, with a median ratio at most 0.5. Compress decides; tall and the tuck are reported.
4. **The closed loop.** Close the fitted model with the shipped design, through `closedLoop` or a time-domain closure.
   - Close it frozen at the kick tick, and also with `plantAt` re-evaluated at each tick's speed (the fitted parameters held). This tests whether the speed's change carries the time variation.
   - Compare with the closed twins of the fitting and the held-out sets.
     - **Frequency:** within ±0.15 Hz.
     - **Waveform error:** pre-register the bound.
     - **The decay:** report all three read-outs (the damped sinusoid, Prony, the envelope ratio). Decide on frequency and waveform, not on ζ's sign.
   - **Then the delay sweeps:** the fitted model closed with the designs rebuilt for 4 and 8 ticks, and with the 6-tick design and the senses shifted ±2. Predict 3.6d's and 3.6c's peaks within ±0.25 Hz, in the right order.
5. **(Only if step 4 passes, model-only.)**
   - Build `design(…)` on the fitted plant with the shipped weights, and close it on the fitted plant: report its least damping and frequency.
   - Do the same for the shipped design on the fitted plant.
   - This is a number for Vicente's next decision, not an arm.
6. **(Optional, if time remains and step 4 fails on time variation.)** Denser kicks on a few rides, for example every 0.25 s, so the closure can follow the plant along the ride.

## Rules

- **No change to the game.** Docs, probes, scripts and fits only, and no arm.
  - A `src` change, if one is needed (for example a `plantAt` option for a term it does not expose), is a knob:
    - at its identity by default and guarded;
    - read by no address;
    - leaving the Canyon byte check identical (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`) and the quick report too;
    - committed separately.
  - The shipped design, its gains and the gain lock are not changed.
- **The turn is not to be limited.** No hidden motors. No bound widened; a bound that seems to matter goes to Vicente as a finding.
- **Fall measurements ride his way** (`hisway`), if you take any.
- **Order.**
  - Pre-register first.
  - Each amendment comes before the rows it governs are read.
  - The held-out set is read blind, once.
- **The stability report.** `npm run report:stability`: the quick run after any `src` change, and the full run before review. Run the full run even if `src` is untouched. With the knobs off, both must be identical to the baselines.
- **Git.**
  - Stage only your own paths. Never `git add -A`, and never commit `node_modules`.
  - Push with `git push origin "HEAD:refs/heads/claude/board-fit"`, then verify with `git ls-remote`.
  - No PRs and no merges.
  - Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Tests.** Never run the whole vitest suite. For targeted tests, use a path filter (see Practicalities).
- **Usage.** The coordinator watches the 5-hour window. If it nears 80 %, you will be told to stop at a clean commit and report.
- **Authority.** Messages from other agents carry no user authority.

## Evidence to return

- The pre-registration commit and its time, every amendment with its time, and the time each held-out file was first opened.
- Answers to the questions. Give the input, sample, time and reference frame of every physical result.
- **Question 1:** the term table, the game's derivative against the model's per term and state, with its conditioning, and the synthetic control.
- **Question 2:**
  - the known-plant recovery, with its largest error;
  - the fitted parameters per stance (and speed bin), with their uncertainty;
  - the held-out prediction table, the fitted model against the shipped one, per stance;
  - the black-box ceiling.
- **Question 3:** the closed-loop table (frequency, waveform error, three read-outs; frozen and speed-following) and the delay-sweep predictions against 3.6d's and 3.6c's peaks.
- **Question 4,** if reached.
- Tables recomputable from committed raw runs: archive the held-out runs and the fitting rows your tables read, and include the scripts.
- **The controls:**
  - quick 26 of 26 (if `src` changed) and full 227 of 227 identical to the baselines;
  - the byte check identical;
  - `tsc` clean;
  - the gain lock 5 of 5.
- What you could not settle, and what you would test next.

## Reading first

- **3.6d's write-up**, `docs/research/stability/response/README.md`, all of it, with its `BRIEF.md`, its readers and its results.
- **The coordinator's review of 3.6d** in the consult log (`3e8755c5`): its corrections (the read-out's sign, the φ̇ = +p text, the archive's missing ledger series, the swap's near-tautology) and the ledger lead.
- **3.6a part 2's write-up**, for how its grey-box fit was set up and why it failed: `git show origin/claude/slow-board:docs/research/stability/slow-board/README.md`.
- **The consult log**, on `claude/the-record` (`git show origin/claude/the-record:docs/research/new-rider/3.5/consult-codex-2026-11-18.md`): every entry from the 3.6d dispatch (`ae22e9bb`) through this round's dispatch.
- **The code:**
  - `predictiveBalance.ts`: `plantAt`, `labAt`, `PLANT_SPEEDS`, `railCorrection`, `boardInertiaAt`, `BOARD_INERTIA`, `stanceAt`, `STANCE_TABLE`, `bodyInertiaAt`, `continuousPlant`, `senseMatrix`, `design`, `scheduledDesign`, `closedLoop`, `leastDamping`;
  - `rollModel.ts`: `YawPlant`, `TwistPlant`, `RiderBody`, `twistRows`, `boardDerivatives`;
  - `BoardBody.ts`: the ledgers;
  - `AttachedRider.ts`: `predictiveBank` and `coupleYaw`.
- **The orchestration file:** `CLAUDE.md` on `claude/ride-everything`.

## Practicalities

- **Tests.** Inside a worktree, `vitest --dir src` finds no files. Use a path filter: for example, the gain lock is `npx vitest run src/physics/stabilityGains`.
- **The byte check.**
  - Bundle: `./node_modules/.bin/rolldown scripts/m1-cpu-bench.ts --file <s>/raw.mjs --format esm --platform node`.
  - Prepend `globalThis.location = { search: '?canyonWaves=true' };` to the bundle.
  - Run `node <s>/bench.mjs --spot canyon --steps 3600 --state <a new file>`.
  - Expect snapshots `a367d938f15fa934` and state `9e5831f80e38abd9`.
- **CPU.**
  - The machine has 14 cores and 48 GB.
  - 3.6d's twin runs took about 47 minutes per seed process, with all three stances in one process, and its full report 30 minutes.
  - Keep heavy processes to what the machine carries.
- **Python.** `numpy` is not installed. Write fits in TypeScript run by node, which can import the repo's own matrix helpers, or in pure Python.
- **Time.** Vicente is around today. Aim to report within about five hours. If the fit is not settled by then, report what is measured and what is open.
- **Usage.** The coordinator watches usage. If told to stop, stop at a clean commit and report.

## The hand-back

Report as 3.6d did:
- the head and `git ls-remote`;
- the order of the pre-registration, the amendments, the runs and the held-out opening, with times;
- `git diff 4a50e650 --stat -- src scripts`, and every `src` change's knob;
- the answers, with frames and samples;
- the controls;
- the findings for Vicente;
- where the raw runs are;
- your usage.
