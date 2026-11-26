# 3.6g brief: which body the board follows — the body's own rotational inertia in the balance's picture, against the kicked twins

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-26.*

## The owner's question and approval

Vicente approved this round in his own words, "Yes, start 3.6g", on 2026-11-26. He was asked: "Start 3.6g, testing the body's own rotational inertia in the balance's picture?" He was told:
- it runs only the balance's picture: no game change, about one to two hours;
- it puts the picture's own nudges, with and without the body's inertia, against the game's recorded nudges;
- if the inertia explains much of the gap, the next choice is his: change the picture (which moves the balance gains) or give the game's body that inertia (which changes how riding feels).

**The builder:** Opus at **high** effort.
- The reason: this is a model-only test on existing machinery and data, so the computation is set, but its reading is open.
- This track's readings have been corrected three times: 3.6b's ledger attribution, 3.6e's lever, and 3.6e's term table. So the registration and the controls carry the round.

**Where it lives:**
- **Start:** `claude/rider-momentum` at `fc466712` (3.6f, reviewed). It carries 3.6d's probe and readers (`docs/research/stability/response/`), 3.6e's fits and readers (`docs/research/stability/board-fit/`) and 3.6f's probe (`docs/research/stability/rider-momentum/`).
- **Branch** `claude/body-inertia`, worktree `.claude/worktrees/body-inertia`.
- **Docs** go in `docs/research/stability/body-inertia/`; this brief is its `BRIEF.md`.
- **Scratch** goes in the session scratchpad's `36g/`.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## What is known

- **3.6d** (consult log `3e8755c5`): the gap between the balance's picture and the board is in the board's mechanics, not the muscles or the senses. It was measured by kicked twins: open (the controller's output held) and closed.
- **3.6e** (consult log `7c86cfa9`; its results in `board-fit/results/final/`).
  - **The open twins** (question 2's metric, `predErr`): the shipped picture's median response error e on the held-out seeds (Big 4–5) is 1.061 in Compress, 1.140 in the tuck and 0.802 tall. The best grey-box fit, (c), reaches 0.587 in Compress, a ratio of 0.514 against the bar of 0.5.
  - **The closed twins** ring at 2.50–2.56 Hz with ζ ≈ 0.03 (envelope ratio 0.90–0.94). The shipped picture, closed with the shipped design, decays instead: Prony ζ 0.58–0.73, at 2.23–2.74 Hz.
- **3.6f** (consult log `0247a8e2`): the game's body is a point mass on a massless leg with soft joints (the leg, the ankle across, the pitch ankle).
  - At the substep, nothing of the body is tied to the feet's sideways motion.
  - The picture's two-body body (`riderBody=two`, step 3.4a) has its own frontal inertia J: 4.6 / 8.7 / 3.1 kg·m² in Compress / tall / tuck (`bodyInertiaAt`). J ties m J / (J + m h²) = 12.7 / 10.5 / 15.2 kg of the body to the feet.
  - Removing J matches the game's instantaneous yaw answer (1.82 against 1.81 kg·m² in Compress). But it overshoots the side push: per unit side impulse at the feet, it gives 1.4–1.9 times the game's yaw. So the board's sway differs too.
  - 3.6e's term table cannot test the lever or its roll terms (3.6f's C4). Do not use it.
- **Step 3.4a put J in the picture on purpose** (`docs/research/new-rider/3.4/README.md`, Part 1, §0 and §6–§8).
  - **What J bought:** on recorded rides it cut the lean row's one-step error about threefold (3.515 → 1.039). The gain was monotone over a sixteen-fold sweep of J (×0.25 … ×4), with the roll row unchanged.
  - **What J cost, two reads:**
    - the effective mass a side force meets: the game's own is 2.8–3.8 kg, J = 0 gives 2.54 kg, J gives 10.4–11.4 kg;
    - the ankle's authority over the lean, which J understates three to fivefold.
  - **Its controls:** `riderBody=control` is `{ inertia: 0, feetRoll: false }` (`predictiveBalance.ts:1501`) and reproduces the pre-3.4a plant exactly. `plantAt`'s `body: <number>` gives `{ inertia: <number> }` with the feet's roll coupling on (`predictiveBalance.ts:747–748`). 3.6e's `buildPlant` already carries a multiplier `J` on the sourced inertia.

**So the evidence points both ways.** 3.4a's evidence favours J on the body's lean. 3.6f's, and 3.4a's own side-mass read, favour no J at the feet. The kicked twins are the cleanest measurement of the board's own response that this track has. This round reads which body they follow, on which rows, and by how much.

## The questions

1. **The open twins.** Score these pictures by 3.6e's question-2 error e (`fitLib`'s `predErr`, the open response at the kick-tick speed, depth and rail), against 3.6e's open sets passing over 1.0 s at ≥ 4 m/s:
   - **P_two**, his picture (`body: true`: J sourced, the feet's roll coupling on); its e must reproduce 3.6e's;
   - **P_0**, the same with J = 0 and the feet's roll coupling on;
   - **P_control**, `{ inertia: 0, feetRoll: false }`, the pre-3.4a plant;
   - **a sweep** of J × 0, 0.25, 0.5, 1 and 2, feet's roll on.

   Score them on both seed groups, the fitting seeds (Big 1–3, 3.6d's) and the held-out seeds (Big 4–5, 3.6e's), reported apart. Nothing is fitted here, so both are out of sample.
   - Report per stance: the median e, e / e_two with its quartiles, and the count of sets better than P_two.
   - **Also report per channel**: the senses' waveform error, and the roll φ, the bank θ, the yaw rate Ω, the slip β and the twist. That shows which rows J helps and which it hurts.
   - Use 3.6e's speed-following variant as a secondary, as 3.6e did.
2. **The closed twins.** Close the same plants with **the shipped design, unchanged** (built on P_two, his `riderBody=two`) and score them against the closed twins with 3.6e's `closures.ts` rules: Prony f, the paired Δf, Prony ζ, the envelope ratio and the waveform error on Ω, frozen and speed-following.
   - Use 3.6e's "reproduces" line: |median paired Δf| ≤ 0.15 Hz and median waveform error on Ω ≤ 0.6.
   - Say plainly whether P_0 or P_control ring as the game does (ζ ≈ 0.03) where P_two decays.
3. **The method's like-for-like control** (the one 3.6e's question 1 lacked).
   - Simulate the picture's own twins, P_two and P_0, with 3.6e's known-plant machinery (`knownfit.ts`, `knownltv.ts`).
   - Form the picture's own rider yaw term on the board, for example from `twoBody`'s rows: the board's yaw row less its water terms.
   - Put it through 3.6e's question-1 regression (its 14 regressors and weighting).
   - Say whether the regression returns the picture's analytic coefficients (+111 … +188 per r, −5.59 per ṙ) or the ankle's form, as it does on the game.
   - If forming that term needs a `src` change, it must be a measurement switch at its identity (see How). If it cannot be done in the round's size, skip it and say why.
4. **The verdict, with sizes.**
   - Which body the twins follow: J, J = 0, or between (the sweep's best value, labelled exploratory).
   - On which rows it holds.
   - How much of the open gap the swap closes: e_two − e, beside 3.6e's best fit.
   - What it does to the closed ring.
   - If J = 0 closes the yaw rows but not the sway or roll rows, name what is left. The water's sway terms are a candidate: the game's board meets 2.8–3.8 kg under a side force, the picture's 2.54 kg.

## How

- **Pre-register before computing any P_0, P_control or sweep number,** and commit it. Include the method, the controls with their pass lines, the sets, your decision lines and your predictions. Later changes go in as dated amendments, committed before the numbers they govern are read.
- **Suggested decision lines** (set your own in the registration, before any number):
  - "J = 0 predicts" by 3.6e's own line: at least 75 % of sets better than P_two and a median ratio ≤ 0.5, on the held-out Compress sets;
  - "J carries part" if the median ratio is ≤ 0.8 on both seed groups;
  - "J does not" otherwise;
  - for the closure, 3.6e's "reproduces" line.
- **The controls, which must pass before any J = 0 number counts:**
  - P_two built through your code reproduces his plant bit for bit (3.6e's `shippedPlant` identity), and its held-out e reproduces 3.6e's 1.061 / 1.140 / 0.802;
  - P_control reproduces the pre-3.4a plant exactly, by 3.4a's own control (its test, or a matrix comparison to rounding);
  - the closure of P_two reproduces 3.6e's shipped closure rows (Compress frozen: Prony f 2.73 pooled, ζ 0.73).
- **Keep it small.** Use the existing twins only; no new game runs beyond the controls below. The sweep stays five values.
- **Model-side only.** Make the plant variants through `plantAt`'s and `buildPlant`'s own options, from the probe side. If a `src` change proves necessary, it must be a measurement switch at its identity: off by default and read by no address, like `yawLedgerClosed`. Then run the quick stability report and keep it identical.
- **Report every number with its sample, stance, seed group, speed bin and frame** (frozen or speed-following).

## Scope and rules

- **Diagnosis only:** scripts reading the existing twins and the shipped model code.
- No arm, no change to the shipped behaviour or any option's default, no gain change. The gain lock is untouched.
- Do not ride or benchmark `riderBody=control` in the game. That would be a later step and needs Vicente's word.
- No hidden motor, no bound widened, and the turn not limited.

## Evidence to return

- The pre-registration and the order of the round, with times.
- The controls.
- **The open table:** per stance, seed group and picture, with the per-channel errors.
- **The closed table**, frozen and speed-following.
- **The regression control** (question 3), or the reason it was skipped.
- **The verdict** with its numbers.
- **The round's controls:**
  - the full stability report before review (`npm run report:stability -- --mode full`): 227 of 227 lines identical to `baseline-full.json`, and its 26 test-wave lines identical to `baseline-quick.json`;
  - the quick report too if `src` changed;
  - the Canyon byte check (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`);
  - `npx tsc -b`;
  - the gain lock (`npx vitest run src/physics/stabilityGains`, 5 of 5);
  - `git diff fc466712 --stat -- src scripts`.
- The scripts in the docs folder. Results in `results/`; scratch in `36g/`.

## Read first

- 3.6f's `README.md` (`docs/research/stability/rider-momentum/`), §3 and §6, and the coordinator's review in the consult log on `claude/the-record` (`0247a8e2`), including its corrections.
- 3.6e's `README.md` (`docs/research/stability/board-fit/`): §0.3, §2 (the known-plant controls), and the question 2 and 3 sections. Its readers: `fitLib.ts` (`buildPlant`, `shippedPlant`, `disc`, `openResp`, `predErr`, `fitSets`, `loadRuns`, `ltvResp`), `heldout.ts`, `closures.ts`, `knownfit.ts` and `knownltv.ts`.
- Step 3.4's `README.md` (`docs/research/new-rider/3.4/`), Part 1: §0, §6, §7, §8 and §11.
- **The code:**
  - `rollModel.ts`: `RiderBody`, `twoBody`, `lateralMass`, `lateralCompliance`, `yawRows`;
  - `predictiveBalance.ts`: `plantAt` (its `body` option, `:747–748`), `bodyInertiaAt`, and `riderBody`'s weights (`:1501`).

## The data (read only)

- **The fitting twins:** `scratchpad/36d/twins/big_s{1,2,3}.jsonl`.
- **The held-out twins:** `scratchpad/36e/heldout/big_s{4,5}.jsonl`.
- Both are archived in `docs/research/stability/board-fit/runs/` (`fitting.tar.gz`, `heldout.tar.gz`). The scratchpad is `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad/`.

## Logistics

- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/body-inertia"` and check with `git ls-remote`.
- Stage only your own paths. Never `git add -A`, never commit `node_modules`, never run the whole vitest suite, and never use a bare `git stash`.
- At most 8 game processes at once.
- Aim for one to two hours. Stop at a clean commit if the coordinator says so.
