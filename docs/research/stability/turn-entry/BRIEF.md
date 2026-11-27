# 3.6i brief: the turn round — stop the deep-stance turns tipping him over as he steers

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-27.*

## The owner's question, his plan and his approval

**His rides.** His own words are the target:
- 2026-11-25, on the controller: turning in Compress and Crouch throws him, as does a turn just after letting go of R2.
- 2026-11-27, about 00:40 UTC, on 3.6h's drift head with `&wobbleNotch=1`: "it still seems to have the same problem. Maybe less wobble. But the surfer still falls on turn". Asked when, he answered **"As I steer"**.

Vicente planned this round with the coordinator on 2026-11-27, 00:50–01:02 UTC, in three short rounds of questions. He took every recommendation ("Use all recommended", three times). That includes Q8, the dispatch tonight once the null-change result was in. What he decided:

- **Q1, the target:** the **balance falls during the steer** in **Compress and Crouch** (his Crouch is the 0.45 m tuck with `deepen=on`), both **with R2 held** and **with R2 let go as the steer starts**. Falls after the steer are measured, not targeted.
- **Q2, diagnosis first, in this round:** find **which way the body goes over** on the falling turns before choosing the fix, by a rule written before the data is read (stage 1 below).
- **Q3, the fixes allowed** (each behind its own opt-in switch, off by default):
  - **(i) the aim matched to the board:** in the deep stances the balance's steady turn asks the board for 4–6° less roll than standing tall for the same lean, so the board carries less rail and turns at a third of the rate (3.6b). Take the aim from how the board really turns. No gain change, so the gain lock does not move.
  - **(ii) a planned lean:** when the stick moves, the body starts the lean at once as a planned movement (people prepare a movement they choose; anticipatory postural adjustments), instead of waiting for its balance's feedback to pull it over. The feedback, and so the wobble, stays as it is.
  - **Not** firmer gains while turning (3.6b's `turnGains=firm`: the board turned away further and Big's balance falls rose, 77 → 80).
  - **Out of scope:** the board's physics, the water, the rider's body, the stance depths, easing the stick (3.6b §2: the stick's step is not the cause), anything that limits the turn, any hidden push, any widened bound.
- **Q4, the quicker rider** (67 ms instead of 100 ms) is a **yardstick only**. `BALANCE_DELAY` is 0.1 s by its cited source (leg postural responses start at about 90–100 ms; Nashner 1977). Keep the 100 ms sensing and muscle lag.
- **Q5, the wobble filter:** build on `claude/drift` so `?wobbleNotch` stays available. Judge each fix alone, then the best fix with the best filter variant.
- **Q6 / Q9, line 1:** no more regressions than a do-nothing change produces (the null-change floor below), each one explained. Not Codex's absolute line; he chose this one after reading both.
- **Q7 / Q10, line 2:** halve the balance falls **over the whole ride** in three places (below). The R2-let-go turn is a target with its own line, not only a check. Counting the whole ride stops a fix passing by delaying the fall: with the notch, 23 fewer benchmark turns fall during the steer but 9 more fall after it.
- **Q11, two filter variants from Codex**, each judged alone (stage 3 below).
- **Carried from his plan of 2026-11-26:** tune in the game behind opt-in switches; the bots ride his way; the gain lock moves only after he rides a passing change and accepts it (do not edit the gain-lock test); **if nothing passes, stop and report**; his ride is the final judge.

**Codex's work order** (consult log `8aa48d38`, 2026-11-27) is folded in below wherever it fits his scope: the entry built as a transient reference, the candidate keyed to the stance asked, and its screening and measurement list. Where it differed (line 1, the let-go turn's role, the extra filter arms), his answers above decide.

**The builder:** Opus at **high** effort. The reason: a diagnosis plus fixes whose cause is still open (`CLAUDE.md`'s rule for high). This track's readings have been corrected several times, so the pre-registration and the controls carry the round.

**Where it lives:**
- **Start:** `claude/drift` at `d5c8ccf9` (3.6h, reviewed; consult log `7f8d0877`). Its `src` is the ride build with the balance bar, 3.6b's switches, 3.6c/3.6d's diagnostic knobs and 3.6h's `?pushAnkle` / `?pushTwist` / `?wobbleNotch`, all off.
- **Branch** `claude/turn-entry`, worktree `.claude/worktrees/turn-entry` (`node_modules` symlinked to the main checkout's).
- **Docs** go in `docs/research/stability/turn-entry/`; this brief is its `BRIEF.md`.
- **Scratch** goes in the session scratchpad's `36i/`. Do not write in `nullfloor/`, `36h/` or `review36h/`; read them freely.
- **His address:** `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6`.

## What is known

- **The steer already sets the aim at once.** `PredictiveController.tick` (`predictiveBalance.ts`, about L1893–1978 at `d5c8ccf9`) builds the reference as the steady turn for the lean asked (`steadyTurn(...)`, the `'tan'` correction), and the command is `ref.u − bias − K (x̂ − x_ref)`. So the lean asked reaches the reference on the tick the stick moves; what lags is the closed loop's tracking.
- **3.6b** (`docs/research/stability/turns/README.md` §1.4, §5, §6; consult log `65039723`): the body's bank is 27° behind the lean asked at +0.5 s, with the ankle at a third of its range; the balance first rolls the board out, so it turns the wrong way for 0.35–0.45 s; in Compress and Crouch the steady turn asks 4–6° less board roll for the same lean, so the board carries 3–4° less rail at +0.5 s and yaws at a third of the rate.
- **3.6c** (`docs/research/stability/wobble/README.md`): the sideways tip is the body's speed across the feet; a turn just after letting go of R2 falls until the leg is up, about 0.5 s later.
- **3.6d** (`docs/research/stability/response/README.md`): the matched delay sets most of the swing's size (0.30× at 4 ticks, 2.36× at 8); the board answers the ankle more strongly than the balance expects (roll 2.75×, yaw 2.05×, 44° earlier).
- **3.6h** (`docs/research/stability/drift/README.md`; review `7f8d0877`): nothing passed. `?wobbleNotch=1` (an RBJ notch on the ankle row's `K (x̂ − x_ref)`, weighted by the leg's depth): 13 regressions (7 tall or Snap, from the depth weighting), 32 of 47 still falling, course +1.41° / +0.81°, the straight swing 0.42 / 0.60 of itself. R (the quicker rider): 14 regressions, 25 of 47.
- **The coordinator's turn read** (frames; `scratchpad/nullfloor/turnread.py`; the steer's onset is the first frame with `st` ≠ 0, at +1.00 s after the stand):
  - the benchmark's 80 deep steer rides, switch off: 47 balance falls, 28 at 0.5–1.0 s into the steer and 18 after it, 1 at 0.25–0.5 s, none earlier; on the last standing frame the limit is the tipping margin in 44, grip in 3, the knee in none; the bar's red comes about 0.6 s into the steer, about 0.18 s before the fall; the 33 that stand bottom at a median reserve of 0.19 inside the steer;
  - his way with a 1 s full steer on Big (`hisway:left|right`, 36 rides, 3.6h's probe): 19 fall, 12 during the steer, 18 by tipping; the notch 10 (5 during); R 6 (none during);
  - R2 let go as the steer starts on Big (`release0:left|right`, 36 rides): 15 fall before +2.0 s, 22 over the ride; the notch 11 / 18; R 2 / 16.
- **Codex** (consult log `8aa48d38`): every first sampled beyond-recovery frame of the final escape is sideways; at the Compress fall's escape the sideways-velocity term is 0.403 m of the 0.500 m change in capture position. In the four `tw-ride` placed starts the board is already yawing −32 to −34 deg/s, rolled −19.5° to −21.3° about its heading, with the twist at +0.78 to +0.88 rad, when the steer starts; they detach 0.48–0.92 s into it. In the four `tw-catch` paddle-ins, three fall after the steer (3.10–3.65 s after the stand), two with no sampled capture crossing: treat them as possible failures of recovery after a turn. The notch acts on `K (x̂ − x_ref)` and so also filters the changing reference's part of the command. *(The coordinator confirmed this last point in the code. Codex's test-wave numbers are under the coordinator's check; corrections, if any, come by message and as an amendment to this brief.)*
- **The null-change floor** (coordinator, 2026-11-27; `scratchpad/nullfloor/`, three full reports through 3.6h's probe bundle): measured 00:33–01:36 UTC. With `ankleGain` 0.99, **1** ride regresses: `big:s2:w16:crouch:left`, its lowest reserve 0.160 → 0.041 on a wave fall at +3.87 s (a ride that regresses under 10 of 3.6h's 11 configurations too). With 1.01, **none**. The probe with no knob gives 227 of 227 rides identical to `baseline-full.json` in every field, so the comparison is clean. Fall times move by at most 0.05 s on 90 % of rides; all 47 deep-turn falls still fall; the turn numbers move by about ±0.05°. So the benchmark's regressions are real effects of a change: 12 of the notch's 13 and 13 of R's 14 lie beyond the floor. `big:s2:w16:crouch:left` is the one ride known to be on the edge.

## Stage 1: which way the body goes over (switch off; before any fix is chosen)

- Record, on the falling deep turns (the benchmark's 80 deep steer rides, `hisway:left|right` and `release0:left|right` on Big), **the side of the escape relative to the turn**: into the turn (the inside rail), thrown outward (the outside rail), or over the nose or tail. Take it from the capture state (`humanBalance.ts`: the capture point against the feet's edges). The benchmark's frame rows do not carry it; a probe must.
- Over the steer and at the first beyond-recovery frame, record: the lean asked, the body's bank, the board's roll and rail, the yaw rate and course, the body's sideways speed relative to the feet, the sideways capture headroom, and the delivered ankle and twist commands (sign and timing). Name each quantity's frame and sign convention (force or felt).
- Write up **one named paired fall and one survivor** step by step (Codex).
- **The rule, registered before any of this is read:** the side with more of the falls during the steer sets the order. Into the turn: E1 first. Thrown outward: E2 first. If most go over the nose or tail, report it and stop: no fix is built. Both E1 and E2 are built in any case; the order sets which is screened first and which leads the combination.

## Stage 2: the entry fixes (each behind its own switch)

Every entry fix changes the **reference during the entry**, not the gains, the filter, the predictor, the clamps or the bounds. The same final lean is asked, with the full steer request and today's limb and contact authority.
- **E1, the aim matched to the board** (his (i)): in Compress and Crouch, the board roll the reference asks for a lean is set from the board's measured answer in a steady turn at that speed and depth (3.6d's response ratios and 3.6b's onset rows are the starting evidence). Say how it is measured and how it stays consistent with the design's model.
- **E2, the planned lean** (his (ii)): when the steer asks a lean, the reference carries a planned transient for the body's bank and its rate (and the board roll and rate it needs), with the feed-forward command that follows it on the design's model. The feedback `K (x̂ − x_ref)` is unchanged.
- **E12, the two together**, as Codex frames it: one transient entry reference built around compatible board roll, body bank, their rates and the board's lateral response.
- **Keyed to the stance asked:** each fix acts only when Compress or Crouch is asked. Turning tall or in Snap gets no contribution, and a turn begun in a deep stance keeps its fix while the legs extend after R2 is let go. Check both.
- A shorter countersteer (the board's first wrong-way turn) counts as promising only if it also arrests the sideways capture speed and meets the course and stability lines (Codex).

## Stage 3: the filter variants (each alone), then the combination

- **N1, the notch on the state feedback only** (Codex): filter `K x̂` and keep the reference's part `K x_ref` direct, with the same steady-state gain.
- **N2, the shipped notch scoped to the stance asked** (Codex; a control): `?wobbleNotch=1`'s filter, acting only in Compress and Crouch.
- `?wobbleNotch=1` as built, for reference.
- **Then the best entry fix with the best filter variant** (his Q5).

## The pass lines (the full stability report at his address, plus 3.6h's probe drives)

1. **Regressions** by the standing rule, as `scripts/stability-report.ts` implements it, against `baseline-full.json`: **no more than 1**, the worse of the two null nudges. Each is explained. Name the ones that also regress under a nudge (`scratchpad/nullfloor/` lists them) as on the edge.
2. **Balance falls over the whole ride, halved in each of three places:**
   - the benchmark's 80 Compress and Crouch steer rides: **47 → at most 23**;
   - his way with the 1 s full steer on Big (`hisway:left|right`): **19 → at most 9 of 36**;
   - R2 let go as the steer starts on Big (`release0:left|right`): **22 → at most 11 of 36**.

   Report the split during and after the steer beside each.
3. **Turns no slower:** the mean paired change of `course05` and of `course10` over the 80 deep steer rides is at least 0 (rides reaching the time both ways, as 3.6h registered it; report the rest).

**Reported, deciding nothing:** the straight swing (3.6h's measure); the release offsets 0.2 / 0.4 / 0.6 s; peak yaw; the largest outward roll and course excursion; the minimum sideways capture headroom; tall and Snap turns (expected unchanged); untouched controls for a continued turn, a reversal and recovery after the release (Codex); R beside everything as the yardstick.

## How

- **Pre-register before any run,** and commit it: stage 1's records and rule, the fixes' definitions, the screening order, the pass lines above, and your predictions. Later changes go in as dated amendments, committed before the numbers they govern are read.
- **Screen cheaply first:** probe-side wrappers and the quick report; 3.6h's probe (`docs/research/stability/drift/drift-probe.ts`, `run.py`, the wide set) for `hisway:*` and `release*:*` on Big. Give only finalists the full report.
- **Count only balance falls against turn work.** Explain regressions against the equivalent placed straight rides where the benchmark has them, and keep the benchmark's rows as they are.
- **Make a passing fix a proper opt-in switch** for his ride, following 3.6b's and 3.6h's pattern: a `devParam` in `PhysicalMode.ts`, carried to the rider or the balance; pinned off online in `main.ts` beside `wobbleNotch`; off by default. **With every new switch off, the build is byte-identical:** the quick and full reports identical to the baselines, and the Canyon byte check identical.
- **Report every number with its sample, stance, wave, seed and speed,** and its frame where one applies.

## Scope and rules

- **Allowed:** the balance's reference and command path (the entry reference, the feed-forward, the filter variants) behind the new switches; probes; scripts; docs.
- **Not allowed:** the board's physics, the water, the rider's body, the stance depths, the limb and contact bounds, the steer's request, any default, the shipped design with the switches off, the gain-lock test, the 100 ms sensing and muscle lag.
- No hidden motor, no bound widened, and the turn not limited. The quicker rider is a yardstick, not a candidate.
- The bots ride his way (R2 from 0.1–0.3 s after the stand, the trim forward at the stand), as the report already does.
- **Usage:** call `mcp__ccd_session_mgmt__get_usage` at each stage boundary and at least every 45 minutes. At **80 % of the 5-hour window**, stop at a clean pushed commit and hand back: what is done, what is next, and where the raw runs are. Extra usage is off; never try to enable it.
- **If nothing passes,** stop at a clean commit and report each fix's numbers beside R. Vicente decides then.

## Evidence to return

- The pre-registration and the order of the round, with times (commits before the runs they govern).
- **Stage 1:** the side counts per drive and stance; the named fall and survivor; the order the rule chose.
- **The screening table:** per fix and variant, the three falling counts (with the during / after split), the turn numbers and the straight swing, beside switch-off and R.
- **For each finalist, the full report's three lines:** the regressions, each explained (the edge ones named); the falls in the three places; the turn numbers.
- **For his ride:** the switch's name, the URL at his address with it on, and one plain paragraph on what he should feel.
- **The controls:** with every new switch off, the quick report identical to `baseline-quick.json` and the full report's 227 lines identical to `baseline-full.json`; the Canyon byte check (snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`); `npx tsc -b`; the gain lock (`npx vitest run src/physics/stabilityGains`, 5 of 5, untouched); the new switches' own tests; `git diff d5c8ccf9 --stat -- src scripts`.
- The raw runs in `36i/`. Archive into `runs/` only the rows the tables need.

## Read first

- 3.6b's README (`docs/research/stability/turns/`) §1, §5, §6, its probe drives, and its switches (`leanPaceSwitch`, `turnGains`) as the pattern.
- 3.6h's README and brief (`docs/research/stability/drift/`), its probe and `run.py`; the coordinator's review (consult log `7f8d0877`).
- Codex's entry `8aa48d38` and the coordinator's entry after it (the null floor, his ride, the turn read, this plan) in `docs/research/new-rider/3.5/consult-codex-2026-11-18.md` on `claude/the-record`.
- `scratchpad/nullfloor/turnread.py` and `nullfloor.py` (the coordinator's readers).
- `predictiveBalance.ts` (`PredictiveController.tick`, `steadyTurn`, `scheduledDesign`, `plantAt`, `tunedCommand`); `humanBalance.ts` (the capture point, the margin); `AttachedRider.ts` (the lean asked, `bankReference`, `LEAN_IN_RATE`, the stance handling).
- **The stability report:** `scripts/stability-report.ts`, `scripts/stability-ride.ts`, `docs/research/stability/baseline-*.json`, and the regression rule in `CLAUDE.md` on `claude/ride-everything`.

## Logistics

- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/turn-entry"` and check with `git ls-remote`.
- Stage only your own paths. Never `git add -A`, never commit `node_modules`, never run the whole vitest suite, never use a bare `git stash`, never open a PR, never merge.
- At most 8 game processes at once.
- Aim for three to four hours. Stop at a clean, pushed commit if the coordinator says so.
