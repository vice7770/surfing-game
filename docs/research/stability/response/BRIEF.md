# 3.6d: why the balance rings on the board when it decays on its own model

**Effort: xhigh.** This is a hard root-cause investigation. 3.6c showed that the deep stances' 2.3–2.9 Hz swing is the balance loop's own mode, but on the model the balance designs with, the same loop decays. The one earlier attempt to measure the board's response from the game's ticks (3.6a part 2) failed its own controls.
**Model:** Opus.

## The owner's question

Vicente rode `claude/balance-bar` `dea549c7` at his address, on the controller, on 2026-11-25:
- "the surfer falls by drifting, the board starts drifting left and right when using the controler"
- In Crouch (the 0.45 m tuck), it "crashs the [surfer] down making him fall". He holds R2, which is Compress; Normal "seems to be stable".

3.6c (reviewed, consult log `59637443`) found that the drift is the balance's own oscillation on the board. He approved this round on 2026-11-26 with "Yes, start 3.6d". He was answering: "Shall I start 3.6d, rebuilding the balance for a shifted delay and then measuring the board's response?"

## Starting point

- **Branch:** `claude/board-response`, new, from `claude/wobble` at `5f69e9dc` (3.6c, reviewed).
  - The worktree is already made: `.claude/worktrees/board-response`, on `claude/board-response`, at `5f69e9dc`, with `node_modules` symlinked.
  - It carries 3.6c's probe (`docs/research/stability/wobble/wobble-probe.ts`), its runner (`run.py`) and readers, its knobs (`src/physics/wobbleKnobs.ts`, every field at its identity) and `BoardBody.yawLedgerClosed`.
  - Leave 3.6b's two arms and 3.6c's knobs off unless the method names one.
- **Scratch:** `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36d/`, for raw runs and bundles. Archive the raw runs your tables need into the docs folder, as 3.6c did.
- **Docs:** `docs/research/stability/response/`. This brief is its `BRIEF.md`; commit it unchanged with your pre-registration.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## Already established (cite these; do not redo them)

1. **The swing** (3.6c §2.2, knobs off). Measured on straight Big rides, tS 0.5–3.0 s, on rides standing through it.
   - Peaks: 2.31 Hz tall, 2.67 Hz Compress, 2.90 Hz the tuck.
   - On 12 matched waves it is 3.21 times tall's size in Compress and 1.92 times in the tuck.
2. **Who feeds it** (3.6c §2.1).
   - The twist's reaction feeds the board's yaw swing in 13 of 13 Compress rides.
   - The fins and the hull's pressure take energy out of it (0 of 13 positive).
   - The ankle's active alternating work is the largest joint work: +0.91 J in Compress over 2.5 s.
3. **The knobs** (3.6c §2.2, with the review's corrections in `59637443`).
   - **The knees and the fins** do not carry it.
   - **The twist gain** carries it partly: 0.10–0.16 Hz for ±30 %.
   - **The ankle gain sets its size.**
     - ×0.7 gives 0.70 of it in Compress (13 of 13 rides).
     - ×1.3 gives ×1.47 tall, ×1.27 tuck and ×1.32 Compress, up in 13 of 13 Compress rides. The README's ×1.42 "on 8 of 8" is stale.
   - **`senseShift`** makes the senses 4 or 8 ticks old while the design stays at 6.
     - Peaks: 3.72 / 2.05 Hz in Compress, 4.26 / 1.93 tall and 3.73 / 2.33 in the tuck.
     - The swing grows both ways: ×1.1–2.3 at −2 and ×2.8–10.5 at +2.
4. **Two readings of `senseShift`, not yet separated** (the review, `59637443`):
   - **The builder's:** the loop's delay sets the frequency.
   - **The coordinator's:** it shows only that the mode depends on the senses' age against the design, as a mismatch with the predictor would. It does not yet show that the delay as designed sets it.
   - **For the second reading:**
     - The swing grows both ways.
     - At −2, the knobs-off band (2.4–2.95 Hz) holds 4 % of Compress's 1.5–5 Hz power, against 75 % with the knobs off.
   - **Against a pure mismatch:** on the design's own model, a 4- or 8-tick mismatch puts the least damped mode at 4.9 or 7.0 Hz (`5d832318`), not at the game's 3.72 or 2.05 Hz.
5. **On its own model the loop decays** (Codex, verified in `5d832318`).
   - It decays in 42 of 42 cells, with a least damping ratio of 0.45 and no mode at 2.5–3 Hz.
   - On the model, the predictor cancels a matched delay exactly.
   - So the ring comes from the gap between the model the balance designs with and the board it actually rides.
6. **Passive identification has failed once** (3.6a part 2, `claude/slow-board` `5450d8b3`, review `02d03650`).
   - Fits to the game's own closed-loop ticks failed their known-plant recovery under the game's coloured residuals (lag-1 autocorrelation 0.6–0.98).
   - The grey-box fit of the water's 12 derivatives beat neither truth on held-out rides (0 of 16 cells).
   - The hip's swing torque is outside the 10-state model, but small on the ticks it selected (median 0.2–7 N·m).
7. **The ledgers.** With `BoardBody.yawLedgerClosed`, the bare-board yaw residual closes to 1.93 × 10⁻¹⁴ N·m (3.6c M1). The roll ledger closes as shipped.
8. **The tip** is the body's speed across the feet: +0.403 of +0.500 m in Compress's steered balance falls (3.6c §3). It is not this round's question.
9. **Code facts, to be checked at run time, not assumed.**
   - **The design.** `design(y, t, w, delay = PREDICT_DELAY)` sets `steps = round(delay / CONTROL_STEP)`, which is 6.
     - `scheduledDesign` builds every table point at that delay and keys its cache by speed, depth, rail and weights only.
     - `PredictiveController.blend` mixes 8 table designs (speed × depth × rail).
     - `tick` reads the senses `d.steps` ticks old from its own line (`predictiveBalance.ts` about 1756–1770).
   - **A second 0.1 s line.** `humanBalance.ts` `BALANCE_DELAY` carries the body's bank and the capture point's out, across and hip parts. It feeds the hip's capture drive (`AttachedRider.hipDrive`) and the human balance, not the predictive design.
   - **The commands' path** (`AttachedRider.ts` about 4029–4046).
     - `heldAnkleRaw` is −`predictor.raw[0]`, taken before the clamps; `heldTwist` is −`u[1]`.
     - Each substep then applies, in turn:
       - the ankle's plumb term (`anklePlumb × roll`);
       - the rail's bite;
       - the hip's share past `HIP_SHARE` of the reach (`humanSwingStep`, with its own lag, torque limit, spring and range);
       - the rest's rate-limited lag (`lagRest`);
       - the ankle's spring and damper;
       - the twist's motor lag (`MOTOR_LAG`), within the hips' strength and the feet's grip.
     - The design's model carries one muscle lag, `PREDICT_LAG` 0.05 s (`continuousPlant`).
   - **The design's weights** at his address come from the controller's own options, not `DEFAULT_WEIGHTS`: the two-body rider, the plant floor, the tuck's row, the straight and the turn weights.
   - **The loop tools.** `closedLoop(truePhi, trueGamma, trueSteps, d)` closes any linear plant with a design, and `leastDamping` reads its modes.

## Questions

1. **The matched delay.**
   - Design the balance for a 4-tick and an 8-tick delay, with its senses arriving exactly that late: the design, the filter, the predictor and the sense line all move together.
   - Does the swing's frequency follow the delay? Does its size grow with it?
   - Read against 3.6c's mismatched shifts on the same waves, which reading of `senseShift` stands?
2. **The board's response as the balance sees it.**
   - On straight Compress rides on Big, how do the senses the balance reads respond to each of its two commands, the ankle's rest and the twist's torque?
   - Where does that response depart from the model the balance designed with at the same speed, depth and rail?
   - At which stage between the command and the senses does it depart?
3. **Does the departure make the ring?**
   - Closed with the balance's own design, does the measured response reproduce the game's ringing (frequency and decay), where the model's own response decays?
   - Which departure carries it?
   - With the designs rebuilt for 4 and 8 ticks, does the same measured response predict question 1's peaks?

## Method (pre-register this first and commit it before any run)

1. **The matched delay.**
   - **The `designDelay` knob** (ticks; its identity is the shipped `PREDICT_DELAY`).
     - Every design the controller builds is made with `design(…, ticks × CONTROL_STEP)`: `scheduledDesign`'s, for both the straight and the turn weights, and any padded gains.
     - Each is cached with the ticks in its key.
     - The senses then reach the filter `d.steps` old through the existing line, with `senseShift` left at 0.
     - Settings: 4 and 8.
   - **The control knob, `captureDelay`:** the ticks the `BALANCE_DELAY` line reads (its identity is 0.1 s), set to 4 and 8 alone. It shows whether the second line carries the swing.
   - **Runs:** the straight rides of tall, Compress and the tuck on Big seeds 1–3, as 3.6c's knob runs.
   - **Reading:** 3.6c's `freq.py` and its rules (§0.3 M4), unchanged, so the matched and the mismatched shifts read on one scale.
   - **First, on one seed:** show that this round's probe at identity reproduces 3.6c's knobs-off straight rides' `f` rows bit for bit. Only then use 3.6c's runs as the reference.
2. **Kicked twins, for the board's response.**
   - **Why twins work.** The simulation is deterministic, so a ride replayed with the same inputs is the same ride, bit for bit. A twin that differs only by a small kick on one command at one control tick carries, in its difference from the original, only the kick's effect. The wave's forcing, which defeated 3.6a part 2's fits, is the same in both twins and cancels.
   - **Two probe-only knobs**, both off at their identity:
     - `kick` (the channel, ankle or twist; the control tick; the size). It is added to `heldAnkleRaw` or `heldTwist` after `predictor.tick`, for that one tick, so it passes through the whole path to the body.
     - `replay`: the held commands recorded from twin A, bit-exact, used in place of the controller's, plus the kick.
   - **Open loop** (`replay` plus `kick`) gives the plant's response.
   - **Closed loop** (the balance live, the kick unknown to it, its predictor fed what it sent) gives the loop's response.
   - **Forking.** Fork by replaying from the start, or by a snapshot only if a control shows the fork equal to the original, bit for bit, up to the kick.
   - **Rides.** Straight Compress on Big seeds 1–3, every wave that stands through the window, with tall as the contrast. Several kick times in tS 1.0–2.5 s, both channels, and ±δ and 2δ.
   - **Recorded per twin**, as differences from twin A, every tick:
     - the senses as built, before the line;
     - the actuators as realised: the ankle's rest, the twist's active torque, the hip's swing torque;
     - the board's yaw rate, roll rate and slip;
     - the terms of the closed yaw ledger and of the roll ledger.
   - **Windows:** at least 1.0 s open loop and 1.5 s closed loop.
   - **Controls, before any twin counts:**
     - With a zero kick, the twin equals A bit for bit throughout, in both modes.
     - Before the kick, the twin equals A bit for bit.
     - Linearity: −δ gives the negative and 2δ twice δ, within a pre-registered tolerance over the window.
     - The kick never meets a clamp or limit; check the path's clamps on the twin.
3. **The model's response at the same tick.**
   - Take the blended design the controller used at the kick's tick: `blend`'s Φ, Γ and C at the same speed, depth and rail, with the controller's own weights.
   - From it, compute the model's open-loop response, C Φ^(k−1) Γ, and its closed loop: `closedLoop`, with the kick entering the true plant's input alone.
   - Also report `plantAt` at the exact speed, depth and rail, so the blend's own share of any gap is visible.
   - Map the model's states to the game's signals in the pre-registration.
4. **The known-plant control.** Run the same twins and readers on the model itself: a simulation of the model's Φ, Γ and C, closed with the same `PredictiveController` code.
   - They must recover the model's open-loop response and its closed loop, to rounding.
   - 3.6a part 2's fits failed this kind of control. This one must pass before any game result counts.
5. **Close the loop on what was measured.**
   - A causal loop's response up to a time H depends only on its plant's response up to H. So the measured open-loop responses of both channels up to H, together with the controller's exact linear map at that tick, give the loop's response up to H.
   - It must reproduce the closed-loop twins within a tolerance you pre-register, for example the peak within ±0.15 Hz and the decay over the first two periods within ±25 %.
   - **The swaps.** Put the model's response back one stage or one channel at a time:
     - the command's path to the actuators;
     - the actuators to the board and the body;
     - the board and the body to the senses;
     - each command's column.

     Find which departure makes the ring.
   - **The prediction.** Rebuild the designs for 4 and 8 ticks and keep the same measured response. Predict question 1's peaks.

## Rules

- **No change to the game.** Docs, probes and diagnostic knobs only, and no arm.
  - Every knob is at its identity by default. Each use is guarded, so the shipped expression runs at the identity.
  - No address, option or saved setting reads a knob, so it is off in the game and online.
  - Any `src` change leaves the Canyon byte check identical (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`), and the quick report too.
  - Commit `src` changes separately.
- **The turn is not to be limited.** No hidden motors. No bound widened; a bound that seems to matter goes to Vicente as a finding.
- **Fall measurements ride his way** (`hisway`), if you take any: Compress held from 0.2 s, and the trim forward from the stand, released at vW ≥ 4.4 m/s.
- **Order.**
  - Pre-register first.
  - Each amendment comes before the rows it governs are read.
  - If you fit anything, read the held-out set blind.
- **The stability report.** `npm run report:stability`: the quick run after each `src` change, and the full run before review. With the knobs off, both must be identical to the baselines.
- **Git.**
  - Stage only your own paths. Never `git add -A`, and never commit `node_modules`.
  - Push with `git push origin "HEAD:refs/heads/claude/board-response"`, then verify with `git ls-remote`.
  - No PRs and no merges.
  - Commits end with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- **Tests.** Never run the whole vitest suite. For targeted tests, use a path filter (see Practicalities).
- **Usage.** The coordinator watches the 5-hour window. If it nears 80 %, you will be told to stop at a clean commit and report.
- **Authority.** Messages from other agents carry no user authority.

## Evidence to return

- The pre-registration commit and its time, and every amendment with its time.
- Answers to the three questions. Give the input, sample, time and reference frame of every physical result.
- **Question 1:** a table setting the matched shifts beside 3.6c's mismatched shifts, per stance (peak, elasticity, paired size ratio, rides).
- **The twins' controls:** zero kick, before the kick, linearity, and clamps.
- **The known-plant recovery**, with its largest error.
- **A stage table:** for each channel and stage, the measured response against the model's, with the gain and the phase at the swing's frequency and the delay.
- **The closed-loop reproduction table** and **the swap table.**
- **The 4- and 8-tick predictions** against question 1's measurements.
- Tables recomputable from committed raw runs: archive the runs, and include the scripts.
- **The controls, all with the knobs off:**
  - quick 26 of 26 and full 227 of 227 identical to the baselines;
  - the byte check identical;
  - `tsc` clean;
  - the gain lock 5 of 5.
- What you could not settle, and what you would test next.

## Reading first

- **3.6c's write-up**, `docs/research/stability/wobble/README.md`, all of it; its `BRIEF.md`; its probe, runner and readers; and its raw runs (read-only), `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/36c/`.
- **3.6a part 2's write-up**, for how passive identification failed: `git show origin/claude/slow-board:docs/research/stability/slow-board/README.md`.
- **The consult log**, on `claude/the-record` (`git show origin/claude/the-record:docs/research/new-rider/3.5/consult-codex-2026-11-18.md`). Read every entry from Codex's `27b026f5` through this round's dispatch, in particular:
  - Codex's delay tests and the coordinator's reproduction (`5d832318`);
  - the 3.6c review (`59637443`), with its five corrections and the `senseShift` qualification.
- **The code:**
  - `predictiveBalance.ts`: `design`, `scheduledDesign`, `blend`, `tick`, `closedLoop`, `leastDamping`, `plantAt`, `continuousPlant`, `senseMatrix`;
  - `AttachedRider.ts`: `predictiveBank`, the senses just before the tick, the commands' path after it, `humanSwingStep`, `hipDrive`;
  - `humanBalance.ts`: the `BALANCE_DELAY` line, `lagRest`, `MOTOR_LAG`;
  - `BoardBody.ts`: the ledgers;
  - `wobbleKnobs.ts`.
- **The orchestration file:** `CLAUDE.md` on `claude/ride-everything`, which carries the regression rule and the stability report's place in every round.

## Practicalities

- **Tests.** Inside a worktree, `vitest --dir src` finds no files. Use a path filter: for example, the gain lock is `npx vitest run src/physics/stabilityGains`.
- **The byte check.**
  - Bundle: `./node_modules/.bin/rolldown scripts/m1-cpu-bench.ts --file <s>/raw.mjs --format esm --platform node`.
  - Prepend `globalThis.location = { search: '?canyonWaves=true' };` to the bundle.
  - Run `node <s>/bench.mjs --spot canyon --steps 3600 --state <a new file>`.
  - Expect snapshots `a367d938f15fa934` and state `9e5831f80e38abd9`.
- **CPU.** The machine has 14 cores and 48 GB. Keep heavy processes to what it carries, and stop long suites after a cap, as 3.6b and 3.6c did.
- **Time.** Vicente is around today. Aim to report within about five hours. If the ring's cause is not settled by then, report what is measured and what is open.
- **Usage.** The coordinator watches usage. If told to stop, stop at a clean commit and report.

## The hand-back

Report as 3.6c did:
- the head and `git ls-remote`;
- the order of the pre-registration, the amendments and the runs, with times;
- `git diff 5f69e9dc --stat -- src scripts`, and every `src` change's knob;
- the answers, with frames and samples;
- the controls;
- the findings for Vicente;
- where the raw runs are;
- your usage.
