# 3.6j brief: turn first — the feet put the board on its rail, the lean follows the turn

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-27.*

## The owner's question, his plan and his approval

**His rides and words are the target.**
- 2026-11-27, about 11:25 UTC, after riding 3.6i's combined fix (`c3x`) on his controller:
  "I played it, the balance of compress has improved but not crouch. compress is back to have a nudge while turning
  stoping the surfer to fully turn at will. This system is not correctly implemented".
- About 11:45 UTC: "give me in a html explanation the steps on what makes the surfer move. I want a diagram with the
  func() listed by steps of action. To understand what we are building and advice, because the balance is not
  working. I dont want a nudge in the middle of the turning".

**The page and the choice.**
- The coordinator answered with an explainer page. Its content, with every function and line at `a1f22e33`, is in
  the session scratchpad at `surfer-page/content.md`. Read it first.
- The page offered three options, and he chose **A, "turn first, the lean follows"** ("Yes, let's plan").
- He planned this round in two short rounds of questions (2026-11-27, about 16:10–17:05 UTC). He took every
  recommendation ("Use all recommended", twice), then said **"Yes, start 3.6j"**.

**His decisions.**
- **Q1, what the stick asks for.** The feet tilt the board past the body by **steer × the ankles' range**:
  `restRange()`, ±0.25 rad today, **unchanged**. The rail is then the body's lean plus that tilt.
- **Q2, where the lean comes from.** **The felt vertical**, sensed **0.1 s late like every other sense**. The body
  leans as much as the turn the board is actually making needs. No lead into the turn in this round.
- **Q3, what the balance stops aiming.** **The board's yaw rate and its slip, both.** It keeps holding the body's
  lean, the rail and the twist.
- **Q4, which stances.** **Standing tall, Compress and Crouch.** Snap keeps its own rules. Any tall or Snap ride that
  gets worse counts against the round (line 1).
- **Q5, the pass lines.** The last round's three lines plus a new **no-nudge line**; all four are below.
- **Q6, what waits.** The quicker rider, Crouch's dips before the turn, and the board's own turn speed in the water.
- **Q7, the arms.** Two:
  - **`?turnFirst=aim`**, "no aim" alone;
  - **`?turnFirst=on`**, the full A.
- **Q8, the switch.** `?turnFirst=aim|on`. Off by default, the new surfer only, pinned off in online rooms. Twist,
  trim, the hand and Snap work as today.
- **Q9, the start.** `claude/turn-entry` at `a1f22e33`. The new branch is `claude/turn-first`.
- **Q10, the builder.** Opus at **high** effort: `CLAUDE.md`'s rule for an implementation whose causes are still
  open. Pre-register before measuring. Amend only to fix a bug in your own build. Stop at 80 % of the 5-hour window.
- **Q11, his feel ride.** A passing arm goes on port 5177. If none passes, the closest arm that meets line 4 goes
  there, labelled as failing. If none meets line 4, nothing is served. The coordinator serves it after review; you
  do not touch the dev server.
- **Q12, Codex.** The coordinator posts this plan to the consult log, so Codex can review it alongside you.

**His standing rules:** "The turn is not to be limited." No hidden motors. No bound widened: a bound you find binding goes to him as a finding. The bots ride his way: R2 from 0.1–0.3 s after the stand, and the trim forward at the stand.

**Where it lives:**
- **Branch** `claude/turn-first`, worktree `.claude/worktrees/turn-first`. Its `node_modules` is a symlink to the main
  checkout's; never commit it.
- **Docs** go in `docs/research/stability/turn-first/`, and this file is its `BRIEF.md`.
- **Scratch** goes in the session scratchpad's `36j/`. Read the other folders freely, but write in none of them.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## What is known

All measurements below are the coordinator's own `--reuse` readings of 3.6i's saved rides, in the scratchpad's
`review36i/m/`.
- Big swell, seeds 1–3, switch off.
- Full stick from tS 1.0 to 2.0 s after the stand.
- Signs are toward the steer.
- Rides standing at tS 2.5.

| stance | n | lean asked | body's bank reached | rail, mean / peak | ankle (bank − roll) | turned since the steer began, +1.0 / +1.5 s |
| --- | --- | --- | --- | --- | --- | --- |
| standing tall | 20 | 43.0° | 22.6° | 20.6° / 34.0° | 2.7° | 17.5° / 37.2° |
| Compress | 16 | 38.0° | 19.7° | 16.6° / 23.5° | 3.7° | 11.4° / 22.9° |
| Crouch | 11 | 31.2° | 16.9° | 13.5° / 20.9° | 4.0° | 8.7° / 23.7° |

**The chain** (`content.md`, line numbers at `a1f22e33`):
- `prepareBank()` (`AttachedRider.ts:3864`) turns the stick into the lean asked: steer × `RAIL_RANGE` (50°), capped at the lean a 4.5 m turn holds at the current speed (`TURN_RADIUS`), and eased in at no more than 1.4 rad/s.
- `predictiveBank()` (`:4014`) calls `PredictiveController.tick()` (`predictiveBalance.ts:1854`), which runs these steps:
  - blends the designs (`blend()`, `:1776`);
  - takes the delayed senses (0.1 s) through a Kalman filter;
  - predicts 0.1 s ahead;
  - forms the reference as `steadyTurn()` for the lean asked (`:1561`), a solve in which the board's roll, yaw rate and slip and both commands are free while the bank and the twist are fixed;
  - commands `u_ref − bias − K (x̂ − x_ref)`;
  - clamps the result.
- The cost weights come from `stateScale` (`DEFAULT_WEIGHTS`, about `:1016`; Q at about `:1231`, `q[i][i] = 1 / stateScale[i]²`). In the state order [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, …], the yaw rate r is weighted at 0.2 rad/s and the slip β at 0.02 rad.
- **The capture point and the fall test** are `HumanBalance.capture()` (`humanBalance.ts:472`), reached through `captureStep()` (`AttachedRider.ts:5534`).
  - The felt vector is the specific force the rider feels: gravity plus the board's acceleration, in the deck's frame under `feltFrame=deck`.
  - The capture point is measured along that felt vector.

**The balance expects about twice the turn the board makes** (Compress, tS 1.5–2.0, n 16, switch off):
- the steady turn's yaw rate (`rYaw`) is 44.5 deg/s on average;
- the board turns about 21 deg/s (10.7° over that half second);
- the predicted yaw rate (`pYaw`) is 14.9 deg/s.

**The picture misreads the ankle** (3.6d, `docs/research/stability/response/README.md`):
- after an open ankle nudge the board's sensed yaw rate reaches −0.38 rad/s per rad of command within 3 ticks in Compress;
- the model's is about +0.007.

**Which way he falls** (3.6i stage 1, the coordinator's recount):
- During the steer, 51 of 56 balance falls go into the turn, none over the nose or tail.
- The body leans in and the board swings away under it.

**The nudge he felt** was 3.6i's `turnAim=board` (consult log `55b05718`).
- It swapped the deep stance's steady turn for standing tall's, its commands included.
- The twist torque held was 23.8 N·m against 6.2 in the steer's second half.
- On the 16 Compress rides standing in both, the board had turned 13.2° by tS 2.5 against 22.9°. `c3x` reached 18.0°.
- Line 3 at +1.0 s understated this, which is why line 4 below exists.

**Crouch's bar dips before the turn** on 14–16 of 36 rides; Compress dips on 2–6. This is out of scope; report it unchanged.

## The design (opt-in, behind `?turnFirst`)

### `?turnFirst=on`: the full A

1. **The stick's ask is the feet's tilt.**
   - Under the switch, the predictive branch of `prepareBank()` no longer forms a lean from `RAIL_RANGE`.
   - The steer asks the board to be tilted past the body, toward the steer's side, by steer × `restRange()`. That is the ankle's angle: body bank minus board roll, in this file's terms.
   - The bound is the ankles' range as it ships. Set the signs from the existing conventions and pin them with a unit test.
2. **The body's lean follows the felt vertical.**
   - The bank reference is the lean across the heading that puts the body's centre of mass along the felt vertical. Use the same felt vector the capture point uses.
   - Sense it 0.1 s late, through the same delay line as the other senses (`BALANCE_DELAY`).
   - The hand's own bend (`HAND_BEND × handBend × HOLD_BANK`) adds on top, as it adds to the stick's lean today.
   - Say how the felt lean is filtered, if at all. A filter must not add delay beyond the senses' own without a pre-registered reason.
3. **The balance aims neither the turn rate nor the slip.**
   - In the designs the switch uses, the yaw rate (state 4) and slip (state 5) carry no weight in the cost. Every other weight stays as it ships.
   - No term may aim the board's yaw rate or slip: not the feedback, and not the feed-forward. The reference holds the body's lean and the board's tilt; its yaw rate and slip are free.
   - Derive the feed-forward so that it holds the lean and the tilt at the turn the board is making now (the estimate), not at a turn the picture predicts.
   - Write the derivation in the pre-registration, and show on the controller's own model that a change in the board's yaw rate alone produces no command.
4. **Where it acts.** Standing tall, Compress and Crouch. While Snap is held (`snapping > 0`), the path as it ships.
5. **Off by default and pinned off in online rooms,** beside the other dev switches in `main.ts`. New surfer only. With the switch off, the build is byte-identical.

### `?turnFirst=aim`: "no aim" alone

- Item 3 alone. The stick asks for lean as it ships, steer × `RAIL_RANGE` with the speed cap.
- The reference holds the lean asked and the board's roll that goes with it.
- The yaw rate and slip are unweighted. Neither the feedback nor the feed-forward aims them.

**For both arms**, record every frame of the probe with:
- the felt lean (sensed, and true);
- the tilt asked and reached;
- the rail;
- whether the ankle is at its range;
- the commands sent.

## The pass lines (pre-registered; switch off is the control)

1. **Regressions** by the standing rule, as `scripts/stability-report.ts` implements it, against `baseline-full.json`: **no more than 1**, each explained.
   - Name `big:s2:w16:crouch:left` as on the edge if it appears, because it also regresses under the null nudge.
   - Tall and Snap rides count.
2. **Balance falls over the whole ride, halved in each of three places.** Report the split during and after the steer beside each:
   - the benchmark's 80 Compress and Crouch steer rides: **47 → at most 23**;
   - his way with the 1 s full steer on Big (`hisway:left|right`): **19 → at most 9 of 36**;
   - R2 let go as the steer starts on Big (`release0:left|right`): **22 → at most 11 of 36**.
3. **Turns no slower.** Over the 80 deep steer rides, the mean paired change in `course05` and in `course10` is at least 0. Report standing tall's beside it.
4. **No nudge.** Big seeds 1–3, each stance on its own: standing tall (`none:left|right`), Compress (`compress:left|right`) and Crouch (`crouch:left|right`).
   - On the rides standing at tS 2.5 in both off and the arm, the mean paired heading change toward the steer from tS 1.0 to tS 2.5 is at least 0.
   - On the rides standing at tS 3.0 in both, the mean paired largest heading change toward the steer between tS 1.0 and tS 3.0 is at least 0.
   - Report n and both means per stance.
   - Report `hisway:left|right` beside Compress. If it is frame-identical to `compress:left|right`, say so and count it once.
   - Define the heading and sign as `scratchpad/review36i/aim36i.py` does, and write your own reader.

**Reported, deciding nothing:**
- the straight swing (3.6h's measure);
- the release offsets of 0.2 / 0.4 / 0.6 s;
- the peak yaw rate;
- the felt lean against the old lean asked;
- the tilt reached against the tilt asked, and how often the ankle sits at its range during the steer;
- the minimum sideways capture headroom;
- which way the remaining falls go;
- Snap turns (expected unchanged);
- Crouch's dips before the steer (expected unchanged);
- untouched controls: a continued turn, a reversal, and recovery after the release.

## How

- **Pre-register before any run, and commit it.** Include the design as you will build it (signs, the felt-vertical sense, the feed-forward's derivation and its no-aim check), the arms, the four lines, your readers, and your predictions. Later changes go in only as dated amendments that fix a bug in your build, each committed before the numbers it governs are read.
- **Screen first** with 3.6i's tools as the pattern: `docs/research/stability/turn-entry/entry-probe.ts`, `run.py`, `screen.py`, `release.py` and `side.py`.
  - Extend the probe for the new switch and the new frame fields.
  - Use 3.6i's screening sets: Big seeds 1–3 `compress|crouch:left|right`, `hisway:left|right`, `release0:left|right`, `compress|crouch:straight`, and the test wave's 8.
  - Add `none:left|right` and `snap:left|right` on Big, for line 4 and the controls.
- **Full reports.** Run `npm run report:stability` (full) for each arm that meets lines 2–4 in the screening. If none does, run it for the closest arm that meets line 4, the one with the fewest bench balance falls. Run the quick report after each change and the full one before handing back, as `CLAUDE.md` requires.
- **With every switch off, the build is byte-identical:**
  - the quick report is identical to `baseline-quick.json`, and the full report's 227 lines and 26 lines are identical to `baseline-full.json`;
  - the Canyon byte check matches (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`);
  - `npx tsc -b` passes;
  - the gain lock passes unchanged (`npx vitest run src/physics/stabilityGains`, 5 of 5; do not edit it).
- **Unit tests** cover the tilt's sign, the felt lean's delay, the no-aim check on the model, and the switch being off by default and pinned off online. Run only the files you touch, with `vitest --dir src`.
- **Report every number** with its sample, stance, wave, seed and speed, and its frame where one applies.

## Scope and rules

- **Allowed** behind the switch:
  - the balance's reference, cost and command path (`predictiveBalance.ts`);
  - the stick's ask and the felt-vertical sense (`AttachedRider.ts`: `prepareBank`, `predictiveBank`, the sense line);
  - the switch plumbing (`PhysicalMode.ts` `devParam`, `RideSession.ts`, `AttachedRiderOptions`, `main.ts`'s online pin);
  - probes, scripts, tests and docs.
- **Not allowed:**
  - the board's physics (`BoardBody.ts`) and the water;
  - the rider's body and the stance depths;
  - the limb and contact bounds (the ankle's range stays as it ships);
  - the 0.1 s sensing and the 0.05 s muscle lag;
  - Snap's rules;
  - any default, the shipped design with the switch off, and the gain-lock test.
- No hidden motor, no bound widened, and the turn not limited. The quicker rider is not part of this round.
- **Usage.** Call `mcp__ccd_session_mgmt__get_usage` at each stage boundary and at least every 45 minutes.
  - At **80 % of the 5-hour window**, stop at a clean pushed commit and hand back: what is done, what is next, and where the raw runs are.
  - Extra usage is off; never try to enable it.
- **If nothing passes,** stop at a clean commit and report each arm's numbers beside off. Vicente decides then.

## Evidence to return

- The pre-registration commit, and the order of the round with times.
- **The design as built:** the code paths, the signs, the felt-vertical sense and its delay, the feed-forward, the designs with the new cost, the no-aim check, and the unit tests.
- **The screening table** per arm beside off:
  - the three falling counts, with the during / after split;
  - line 3;
  - line 4 per stance;
  - the reported quantities.
- **For each full report:** the four lines, with the regressions each explained and the edge one named.
- **The controls** listed above.
- **For his ride:** the switch, the URL at his address with it on, and one plain paragraph on what he should feel.
- The raw runs stay in `36j/`. Archive into `runs/` only the rows the tables need.

## Read first

- `scratchpad/surfer-page/content.md`: the chain, step by step, with the functions and lines.
- 3.6i's `BRIEF.md` and `README.md` (`docs/research/stability/turn-entry/`), its probe and tools; the coordinator's review (consult log `836d2cdb`); his ride and the coordinator's checks (`55b05718`).
- The coordinator's readers in `scratchpad/review36i/`: `aim36i.py`, `aim36i_b.py`, `stance36i.py`, `crouch36i.py`, `crouch36i_b.py`.
- `predictiveBalance.ts`: `tick`, `steadyTurn`, `blend`, the design build and `stateScale`.
- `humanBalance.ts`: `capture` and the felt vector.
- `AttachedRider.ts`: `prepareBank`, `predictiveBank`, `captureStep`, `restRange`, `setAnkle`.
- The stability report: `scripts/stability-report.ts`, `scripts/stability-ride.ts`, `docs/research/stability/baseline-*.json`, and the regression rule in `CLAUDE.md` on `claude/ride-everything`.

## Logistics

- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/turn-first"` and check with `git ls-remote`.
- Stage only your own paths.
  - Never `git add -A`, never commit `node_modules`, never run the whole vitest suite, and never use a bare `git stash`.
  - Never open a PR and never merge.
  - Never touch the main checkout or another worktree.
- At most 8 game processes at once.
- Aim for three to four hours. Stop at a clean, pushed commit if the coordinator says so.
