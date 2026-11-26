# 3.6h brief: the drift round — stop the deep-stance turns from drifting and throwing him

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-26.*

## The owner's question, his plan and his approval

Vicente planned this round with the coordinator on 2026-11-26 in two short rounds of questions. He took every recommendation ("go with your recommendations", twice) and approved the round in his own words: **"Yes, start 3.6h"**. What he decided:

- **The goal:** noticeably faster turns in Compress and Crouch, with no new balance falls anywhere. Stopping the deep-stance turns from drifting and falling comes first, and that is this round. "Faster" is measured as 3.6b measured it: how far the board has come round 0.5 s and 1.0 s after the steer, and its peak turn rate. His ride is the final judge.
- **The method:** tune the balance directly in the game. Each change goes behind its own switch and is judged by the stability report, then by his ride. This replaces correcting the balance's physics picture: 3.6c–3.6g found no single fix to the picture.
- **The changes allowed in this round:**
  - **(i)** match the balance's push to how strongly the board actually answers;
  - **(ii)** a filter that stops the balance feeding the 2.5–3 Hz wobble;
  - **both together**, if each helps;
  - **(iii) the quicker rider**, a reaction delay of about 67 ms instead of 100 ms, **as a reference only**. It shows the size of its effect; it is not a candidate. It is a realism choice that stays his.
  - **Not** a change to the board's physics.
- **The gains** may change behind a switch. The gain lock moves only after he rides a passing change and accepts it. Do not edit the gain-lock test.
- **The pass line**, all three in the full stability report at his address:
  1. no regression by the standing rule;
  2. of the Compress and Crouch turn rides that fall for balance today, at most half still fall;
  3. turns no slower: on average, the board has come round at least as far 0.5 s and 1.0 s after the steer.
  - **Reported beside them, deciding nothing:** the wobble's size on straight deep-stance rides, and the turn just after letting go of R2.
- **The turn just after letting go of R2** is measured in this round and targeted in the next (the turn round).
- **If nothing passes,** stop at a clean commit and report each change's numbers beside the quicker-rider reference. Vicente decides then.

**His rides.** His own words are the target:
- 2026-11-25, on the controller: turning in Compress and Crouch throws him, as does a turn just after letting go of R2, and "the board starts drifting left and right".
- 2026-11-26, on the current build (which has no change to how it rides): "I replayed with my controller, it seems like there is no improvement".

**The builder:** Opus at **high** effort. The reason: this is an implementation whose causes are mapped but not pinned, so the right change is found by measured trials. This track's readings have been corrected several times, so the registration and the controls carry the round.

**Where it lives:**
- **Start:** `claude/body-inertia` at `ef4b86c8` (3.6g, reviewed). Its `src` is the ride build with the balance bar, plus 3.6b's opt-in switches and 3.6c/3.6d's diagnostic knobs, all off.
- **Branch** `claude/drift`, worktree `.claude/worktrees/drift`.
- **Docs** go in `docs/research/stability/drift/`; this brief is its `BRIEF.md`.
- **Scratch** goes in the session scratchpad's `36h/`.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## What is known

- **3.6b** (`docs/research/stability/turns/README.md`; consult log `65039723`).
  - In every stance the balance asks for little lean and first rolls the board out, so the board turns the wrong way for 0.35–0.45 s.
  - The deep stances carry less rail. Their 2.5–3 Hz yaw swing, present on straight rides too, grows into a sideways tip.
  - On Big, before the release, the turn's own falls are 1 of 36 tall against 12 of 36 in Compress and 12 in Crouch.
  - Its two arms (`?leanPace=stance`, `?turnGains=firm`) failed the stability line, with 51 and 30 regressing rides.
- **3.6c** (`docs/research/stability/wobble/README.md`; consult log `59637443`).
  - The swing is the balance loop's own mode on the board as it rides.
  - The senses' age against the design sets its frequency, and the ankle gain sets its size.
  - The deep stances are worse partly through the yaw inertia's split.
  - The sideways tip is the body's speed across the feet.
  - A turn just after letting go of R2 falls until the leg is up, about 0.5 s later.
- **3.6d** (`docs/research/stability/response/README.md`; consult log `3e8755c5`).
  - **The matched delay** (design and senses together) sets most of the swing's size. At 4 ticks it is 0.30 of itself; at 8 ticks, 2.36 times. Its frequency is 3.08 / 2.67 / 2.36 Hz at 4 / 6 / 8 ticks in Compress.
  - **The board answers the balance more strongly than the balance expects.** Per ankle command it rolls 2.75 times the model's and yaws 2.05 times, 44° earlier. Per twist command it slips 3.88 times.
- **3.6e–3.6g** (consult log `7c86cfa9`, `0247a8e2`, `215caf8a`): no physical correction of the picture closes the gap. Its board's mechanics, its water and its body's inertia trade off. The one model that predicts fresh nudges is the board's own measured response per speed bin. So this round tunes in the game.

## The candidates

1. **C1, the push matched to the board.** Two implementations are allowed; say which you use and why.
   - **(a)** Scale the balance's feedback row per command: the ankle's rest and the twist's torque. 3.6c's `wobbleKnobs.ts` `ankleGain` and `twistGain` do exactly this, probe-side, so screen with them.
   - **(b)** Build the design on a plant whose command effect matches the board's measured answer. The design then computes its own gains, and its predictor expects the stronger board.

   For either, state what the controller's filter and predictor see, and whether the internal model stays consistent. Use a short sweep of scales per command, for example 1 / 0.75 / 0.5 / 0.35, informed by 3.6d's ratios.
2. **C2, a wobble filter** on the balance's own commands, aimed at the swing measured in each stance and speed (about 2.2–3.3 Hz).
   - State its phase cost at the turn's frequencies.
   - It must not limit the turn.
3. **C3: C1 and C2 together**, only if each helps on its own.
4. **R, the quicker rider (reference only):** the matched delay at 4 ticks (3.6d's `designDelay` with `captureDelay` at 4), probe-side. Report it beside the candidates. It is not a candidate.

## How

- **Pre-register before any candidate run,** and commit it: the candidates, the sweep values, the screening rule, the pass line as above, and your predictions. Later changes go in as dated amendments, committed before the numbers they govern are read.
- **Screen cheaply first.**
  - Use the diagnostic knobs or probe-side wrappers, and the quick stability report.
  - Use probe drives for the deep-stance turns: the report's own steer rides in Compress and Crouch on Canyon Big, and **3.6b's probe drive "his way with a 1 s full steer"**, which is how he actually turns on the pad, holding R2.
  - Give only the finalists the full report.
- **Count only balance falls against turn work** (the standing rule). Take "faster" from the report's turn numbers, 3.6b's line: the course toward the steer at +0.5 s and +1.0 s, and the peak yaw, ride for ride against switch-off.
  - The fields per ride are `course05`, `course10` and `yawPeak`, with `…World` beside each.
  - The coordinator's count from `baseline-full.json`: **47 of the 80** Compress and Crouch steer rides fall for balance today. So the second pass line is **at most 23 of those 47** still falling for balance.
  - A ride that falls before +0.5 s or +1.0 s has `course05` or `course10` null. Pre-register how such rides enter the "no slower" line; for example, compare only rides that reach the time with the switch on and off, and report the rest.
- **"No regression" means zero regressing rides by the rule.**
  - Every regression is reported and explained.
  - A candidate that meets the other two lines but has regressions is reported as failing that line, with its regressions explained. The decision then goes to Vicente.
- **Make a passing candidate a proper opt-in switch** for his ride, following 3.6b's pattern:
  - a `devParam` switch in `PhysicalMode.ts`, like `leanPaceSwitch`, with the option carried to the rider or the balance;
  - pinned off online: add it to `main.ts`'s list of options cleared online, beside `leanPace` and `turnGains`;
  - off by default.
  - **With every new switch off, the shipped build must be byte-identical:** the quick and full reports identical to the baselines, and the Canyon byte check identical.
- **Report every number with its sample, stance, wave, seed and speed,** and its frame where one applies.

## Scope and rules

- **Allowed:** changes to the balance's own command path and design, behind the new switches; probes; scripts; docs.
- **Not allowed:**
  - changes to the board's physics, the water or the rider's body;
  - changes to any default or to the shipped design when the switches are off;
  - edits to the gain-lock test.
- No hidden motor, no bound widened, and the turn not limited.
- The quicker rider is a reference, not a candidate.
- The bots ride his way (R2 from 0.1–0.3 s after the stand, the trim forward at the stand), as the report already does.

## Evidence to return

- The pre-registration and the order of the round, with times.
- **The screening table:** per candidate and value, the deep-stance turn falls, the turn numbers and the wobble's size, beside switch-off and the reference.
- **For each finalist, the full report's three pass lines:**
  - the regressions, each explained;
  - today's falling Compress and Crouch turn rides that still fall;
  - the turn numbers.
- The turn just after letting go of R2, measured (3.6c's three release times).
- **For his ride:** the switch's name, the URL at his address with the switch on, and one plain paragraph on what he should feel.
- **The controls:**
  - with every new switch off: the quick report identical to `baseline-quick.json` and the full report's 227 lines identical to `baseline-full.json`;
  - the Canyon byte check (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`);
  - `npx tsc -b`;
  - the gain lock (`npx vitest run src/physics/stabilityGains`, 5 of 5, untouched);
  - the new switches' own tests;
  - `git diff ef4b86c8 --stat -- src scripts`.
- The raw runs in `36h/`. Archive into `runs/` only the rows the tables need.

## Read first

- 3.6b's `README.md` (`docs/research/stability/turns/`), its probe drives, and its two switches (`leanPaceSwitch`, `turnGains`) as the pattern.
- 3.6c's `README.md` (`docs/research/stability/wobble/`) and `src/physics/wobbleKnobs.ts`.
- 3.6d's `README.md` (`docs/research/stability/response/`), §0.3 and the response ratios.
- **The stability report:** `scripts/stability-report.ts`, `scripts/stability-ride.ts`, `docs/research/stability/baseline-*.json`, and the regression rule in `CLAUDE.md` on `claude/ride-everything`.
- `predictiveBalance.ts`: `PredictiveController.tick`, `scheduledDesign`, `plantAt`.

## Logistics

- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/drift"` and check with `git ls-remote`.
- Stage only your own paths. Never `git add -A`, never commit `node_modules`, never run the whole vitest suite, and never use a bare `git stash`.
- At most 8 game processes at once.
- Aim for three to four hours. Stop at a clean, pushed commit if the coordinator says so.
