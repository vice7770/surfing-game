# 3.6l brief: the lean's pace

*From the Claude coordinator (Opus 5.5), surfer track, 2026-11-28.*

> **Status:** planned with Vicente on 2026-11-28 ("Use all recommended", twice). **Not started:** it waits for his word, and no builder is dispatched.

## The owner's question

**His words:**
- 2026-11-25: "The turn is too slow in Compress and Crouch".
- 2026-11-27, after riding 3.6i's combination: "compress is back to have a nudge while turning stoping the surfer to fully turn at will. This system is not correctly implemented".
- 2026-11-27: "I dont want a nudge in the middle of the turning".

**How this round came about.**
- 3.6k stopped before any build (consult log `715eadda`). The water turns the board about right for its rail, at 40° too. So the coordinator recommended a round on "why the rider's rail stops at 17–20°".
- **That framing was wrong. The coordinator corrected it while planning.**
  - 17–20° was the mean over tS 1.5–2.0 of a one-second steer. Read tick by tick, the rail is still rising when the steer ends.
  - The body leans in at about a third of the pace asked, and the rail follows the body. Nothing is at a limit.
  - The balance's own picture leans just as slowly (below, "What is known").
- He planned this round in two rounds of questions on 2026-11-28 and took every recommendation.

## His decisions

- **Q1, the target: the lean's pace, with a gate.**
  - **Part 1 works on the balance's own picture** and changes nothing in the game. It finds:
    - what sets the pace: the weights, the senses' 0.1 s delay, the outward roll needed first;
    - the fastest lean the feet alone can make;
    - designs that lean faster, Codex's A2 among them.
  - **If one leans clearly faster on the picture** without turning the board further the wrong way (the gate, Q6), it is built behind an opt-in switch and tested in the game (Part 2).
  - **If none does,** the round stops and the finding goes to him.
  - The held turn is measured on the same rides, but it is not the target.
- **Q2, the yardstick.**
  - Forsyth et al. 2024: 99° in 0.96 s, with about 42° of rail set in about half a second.
  - The existing clip reads. Video 12's board is at about 45°. Videos 10 and 11 time the rail's bite against the rear arm's lead.
  - A new frame-by-frame read happens only if he sends a clip filmed from in front of or behind the rider.
  - His ride is the final judge.
- **Q3, the rides.**
  - Three stances: standing tall, Compress and Crouch. His Crouch is the tuck, 0.45 m with `deepen=on`.
  - Each stance is ridden four ways:
    - on the picture at 6–9.5 m/s;
    - on Big seeds 1–3 with the bench's one-second full stick;
    - with 3.6j's two-second held stick;
    - his way, with R2 held from the stand.
  - Standing tall is the clean case, because there the game matches its picture.
- **Q4, the study's freedom on the picture.**
  - Anything may change, one piece at a time, each labelled a diagnostic: the weights, the shape of the lean the balance aims for, the senses' 0.1 s delay, the muscle lag, the feet's strength and the hips.
  - None of it reaches the game.
- **Q5, what a design may change in the game.**
  - **Only the balance's own design:** its weights, the shape of the lean it aims for over time, and its feed-forward.
    - It may act at any time, not only while turning. The lines check straight riding.
  - **Unchanged:** the senses' 0.1 s delay, the muscle lag, the ankle's range, the rail's bite, the board, the water and every bound. No new motor.
  - **The feet's strength:** the design may not need more ankle torque than the feet can make any more often than the shipped balance does.
    - The feet can make their load × their half-width: 716 N × 0.13 m = 93 N·m standing tall.
    - This is checked, not added as a clamp: on his address the ankle has no strength limit.
  - **Ruled out:** a design that only repeats one of these:
    - 3.6b's faster ask (`?leanPace=stance`) or firmer gains (`?turnGains=firm`);
    - 3.6j's balance without its aim;
    - 3.2q's lean hold.
- **Q6, the gate.** See "The gate", below.
- **Q7, the pass lines.** See "The pass lines", below.
- **Q8, who.**
  - One Opus builder at **xhigh**. The round opens with a hard root-cause question: why the balance leans slowly even on its own picture. `CLAUDE.md` puts that at xhigh or max.
  - The build follows only if the gate passes.
  - No water-physics advisor. If the study finds that the water sets the pace, the round stops and reports.
  - Codex reviews alongside, from the plan in the consult log.
- **Q9, the start, the switch and his ride.**
  - **The start** is `claude/rail-hold` `92227e9b`: 3.6j's code, identical to the shipped ride with its switch off, plus 3.6k's notes.
  - **The branch** is `claude/lean-speed`, in the worktree `.claude/worktrees/lean-speed`.
  - **The switch** is `?leanSpeed=<arm>`, off by default and pinned off online.
  - **The names changed.** The plan said `claude/lean-in` and `?leanIn`, but that branch name belongs to a September study (below), so the coordinator renamed both. `?leanPace` is 3.6b's name and is still in the code.
  - **His ride on port 5177:**
    - a passing arm is served;
    - if none passes, the closest arm that meets lines 2 and 3 is served, labelled as failing;
    - if none meets them, nothing is served, and port 5177 keeps 3.6i's build (`claude/turn-entry` `a1f22e33`);
    - if the gate stops the round, nothing is built or served.

    The coordinator serves it.
- **Q10, what waits for a later round.**
  - the cause of the board's sideways swing (3.6b–3.6g);
  - option B, the picture built from the board's measured response;
  - the hips in the game;
  - the water's deep-rail mode and the free-motion lab line (3.6k);
  - the quicker rider, and Crouch's knee strength;
  - the falls after the steer;
  - `?hull=rail` as the default.

**His standing rules:**
- "The turn is not to be limited."
- No hidden motors.
- No bound widened: a binding bound goes to him as a finding.
- The bots ride his way.

## What is known

### Today's turn, tick by tick (the coordinator's measurement, 2026-11-28)

**The sample:**
- 3.6j's switch-off rows (the shipped ride; the `o` rows of `first-probe.ts`);
- Big seeds 1–3;
- the bench's full stick from tS 1.0 for 1 s (`none|compress|crouch:left|right`);
- rides still standing at tS 2.5;
- the mean over rides, in degrees toward the steer.

**The columns:** `ask` is the lean asked (`leanAsked`), `bank` is the body's bank, and `rail` is the board's rail. +0.5 s is tS 1.5, and +1.0 s is tS 2.0, the steer's end.

| stance | asked +0.5 s | body +0.5 s | rail +0.5 s | asked +1.0 s | body +1.0 s | rail +1.0 s | rail +1.2 s |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 36.5 | 12.4 | 11.1 | 44.6 | 29.6 | 27.6 | 30.2 |
| Compress | 34.1 | 10.8 | 8.2 | 40.1 | 24.2 | 19.5 | 21.6 |
| Crouch | 30.5 | 11.2 | 7.8 | 31.4 | 22.5 | 19.2 | 20.2 |

- **At +1.2 s** the ask is already falling (28.6°, 24.3° and 17.2°), and the rail is still deeper than at the steer's end.
- **Nothing is at a limit.**
  - The speed cap (`cap`) is 37–60° over the steer, above the ask standing tall and in Compress.
  - The ankle sits at its range on 2–4 % of the steer's ticks (`aSat`), and its raw command stays within about ±8°.
  - On his address the ankle has no strength limit.
- **The wrong way first:** 3.6b found the heading turns the wrong way first, for 0.35–0.45 s, in every stance.
- **Rows and readers.** They are in the coordinator's scratchpad, which a reboot may clear; regenerate them with `first-probe.ts` if so. `<scratch>` is `/private/tmp/claude-501/-Users-vicentealmeida-Documents-Codex-surfing-game/7f68bd0b-0784-4918-a0d6-f8978afbced6/scratchpad`.
  - the bench: `<scratch>/review36j/m/off/big/big_s{1,2,3}.jsonl`, read by `<scratch>/36l/series.py`;
  - the held turn: `<scratch>/36j/ext/off/big_s*.jsonl`, read by `<scratch>/36l/long.py`.

### The balance's own picture (3.6j's own-model loop)

**How 3.6j ran it** (`turn-first/tools/model.ts`, `results/model-loop.txt`, README §0.3):
- the controller closed on its own linear model, at rail 0;
- the lean asked ramping at 1.4 rad/s to 40° from tick 0, and back from +1.0 s;
- the felt lean taken as the coordinated turn's, atan(v r / g).

The table gives the body's bank, and the yaw rate at +0.25 s, toward the steer:

| stance, speed | body +0.25 s | body +0.5 s | body +1.0 s | yaw rate +0.25 s | the game's body +0.5 / +1.0 s |
| --- | --- | --- | --- | --- | --- |
| tall 0 m, 7.9 m/s | 1.9 | 11.8 | 33.3 | −21 deg/s | 12.4 / 29.6 |
| Compress 0.30 m, 7.5 m/s | 2.1 | 12.3 | 33.5 | −17 deg/s | 10.8 / 24.2 |
| Compress 0.30 m, 9.5 m/s | 2.6 | 14.7 | 36.7 | −12 deg/s | |
| the tuck 0.45 m, 7 m/s | 3.0 | 15.7 | 37.3 | −7 deg/s | 11.2 / 22.5 |

- **The game against its picture.**
  - Standing tall it is within 1° at +0.5 s and 4° behind at +1.0 s.
  - Compress is 2° and 9° behind.
  - The tuck is 4° and 15° behind.
- **The picture's ankle** peaks at 0.054–0.130 rad and never reaches its clamp.
- **Against the turn's pull** (atan(v r / g) at the picture's yaw rate):
  - at +0.5 s the picture's body leads it everywhere: 12–16° against 3–7°;
  - at +1.0 s it is about at it standing tall and in Compress at 7.5 m/s (33–34°);
  - in the tuck and at 9.5 m/s it still leads it, by 8–12°.

### The held turn (3.6j's extra set)

**The sample:** `none|compress|crouch:long`, +1 for 2 s from tS 1.0; switch off; Big seeds 1–3; 18 rides per stance. The falls are from 3.6j's README §6, and the rest is the coordinator's read of the rows.
- **Standing tall:**
  - the rail is 13.7° at +0.5 s, 29.1° at +1.0 s and 37.0° at +1.5 s (11 rides still standing), and keeps going;
  - 9 of 18 are balance falls, most going over into the turn with the rail at 60–92° on their last tick;
  - 7 stand at tS 3.0.
- **Compress and Crouch:**
  - 11 of 18 balance falls each, most within the first second of the steer;
  - 4 stand at tS 3.0.

### Earlier attempts (read these first; do not repeat them)

- **The September lean-in studies, on the old rider.** That was before the new rider and its predictive balance.
  - **Where they are:** `docs/research/lean-in-study.md` (2026-09-30) and `bottom-turn-entry-study.md`, with `body-lean-study.md`, `angulation-study.md` and `carve-drag-study.md`.
  - The coordinator found them after the plan was set. Vicente was told before the start.
  - **The old balance's lean was paced by its rate term,** a 0.49 s time constant.
    - Lower rate gains broke rail changes, the wobble and top turns.
    - A feed-forward on the reference's rate (`LEAN_IN_FEED`) dropped riders.
    - Both went on the don't-retry list.
  - **Reference shapes** (minimum-jerk, bang-bang) all fell when fed forward at full strength. Fed at half or not at all, all turned slower than the shipped reference.
  - **Its reading: the lean-in's pace is set by how fast the turn builds.**
    - A body that leans faster than its turn pulls falls in. The feet press its inside edge to hold it, which rolls the board past its bite (48°), and the board capsizes.
    - The plant's own bound allowed at most a 20–40 % quicker lean to 40°, and only if the turn's pull kept up.
    - Rolling the rail first bogs the board.
  - **Its open option: a rail-angle controller.** The rail leads the body by a small angle held below its bite, so the pull builds first and the body follows inside it. It needs the board's yaw build-up in the roll model.
  - **Part 1's first job is to test this reading on the new rider's picture.** If it holds, say so plainly. Candidates must then build the turn's pull sooner (for example, a small rail lead within the ankle's range), not lean the body further ahead of it.
- **3.6b** (`claude/faster-turns` `340fc560`, `docs/research/stability/turns/README.md`):
  - `?leanPace=stance` asked for the lean faster the lower the stance. 51 rides regressed, and the tuck was much worse.
  - `?turnGains=firm` halved ρ while a lean was asked. 30 rides regressed, and the board turned away further first.
  - The deep stances' swing blocked any faster turn.
- **3.6c–3.6g** mapped where the picture and the board disagree. No single fix to the picture closes the gap.
  - **3.6d's kicked twins** (`docs/research/stability/response/`):
    - per ankle command, the game's board rolls 2.75 times the picture's and yaws 2.05 times, 44° earlier;
    - per twist command, it slips 3.88 times;
    - after an open ankle nudge, the board's yaw rate reaches −0.38 rad/s per rad within 3 ticks in Compress, where the picture says +0.007.
  - **3.6d's closure:** with the shipped design, the measured mechanics give an undamped mode at the swing's frequency, where the picture gives ζ 0.66–0.81. That closure reproduces the game's loop in only 2 of 38 sets.
- **3.6h** (`claude/drift` `d5c8ccf9`): `?pushAnkle`, `?pushTwist` and `?wobbleNotch`. The closest was the notch at 1, with 13 regressions.
- **3.6i** (`claude/turn-entry` `a1f22e33`): `turnAim=board` gave the nudge he felt. Port 5177 serves its c3x.
- **3.6j** (`claude/turn-first` `7e4e149d`): `?turnFirst=on|aim`. Nothing passes.
  - Without the aim the board barely comes round: the turn as it ships is the balance's aim.
  - `on` (a rail target 0.25 rad past the body) went outward: rolling the board in with the ankle pushes the body out. 41 of 47 bench falls during the steer went over the outside rail.
- **3.2q's lean hold:** a loop lean → rail → turn → felt vertical → lean, through `pairFelt`'s 0.1 s low-pass.
  - He rode it on 2026-11-14: "the compress is still to slow and barely turns now, if turn a bit falls immediately".
  - It was removed "so nobody rebuilds it".
- **`HIP_CAPTURE_GAIN`** is 0, after three measurements that were not kept (`AttachedRider.ts` L443 and its note).
- **`LEAN_IN_RATE`** (1.4 rad/s, `AttachedRider.ts` L595–614) is derived from the body's own torque bound: g d / h² over half of Forsyth's turn.
  - Faster values turned no better in Compress and fell sooner.
  - The 93 N·m in its note is a derivation, not an active clamp on his address. `setAnkle` bounds the ankle by the soles only with `ankleLimit: 'feet'`.
- **`SCHEDULE_RAIL_CAP`** is 12°: the schedule's design is trusted to 12° of rail. 3.2m's grid found 9–13° a plateau, and 20° spins out.

### The chain

The living doc How the Surfer Moves (`docs/research/new-rider/how-the-surfer-moves.html` on `claude/ride-everything`) walks it.
- **`AttachedRider.prepareBank`:**
  - `want = steer × RAIL_RANGE (50°) + hand`;
  - `most = atan(v² / (g · TURN_RADIUS 4.5 m))` while planing;
  - `leanAsked` eased at `LEAN_IN_RATE`.
- **`predictiveBank`:**
  - the schedule's rail is `atan(tan(lean) / railPull)`, capped at 12°;
  - then `predictor.tick(…)`;
  - the ankle is clamped to `ANKLE_REST_RANGE` (0.25 rad) and the rail's bite room.
- **`PredictiveController.tick`** (`predictiveBalance.ts`):
  - `steadyTurn` (`'tan'`) gives the reference;
  - `u = u_ref − b − K(x̂ − x_ref)`;
  - `DEFAULT_WEIGHTS`: `stateScale` [0.05, 0.5, 0.05, 0.25, 0.2, 0.02, 0.5, 1], ρ 10;
  - `feetReach`, and 3.6j's `turnFree`.

### The yardstick

- **Forsyth et al. 2024,** as `COMPRESS_PULL` cites it: 99° of heading in 0.96 s. The water-physics advisor reads its Table 2 as a rail of 42 ± 3° at 7.3 m/s (`rail-hold/ADVISOR.md`), set in about the first half of the turn.
- **A rough bound** (the coordinator's, small-angle, not checked).
  - With the centre of pressure held at the feet's edge (d = 0.13 m) and the centre of mass h = 0.68 m up, the body tips (d / h)(cosh(t / √(h / g)) − 1).
  - That is about 26° in 0.5 s standing tall.
  - Part 1 computes the real one.

## Part 1: the study, on the picture (no game change)

1. **Reproduce** 3.6j's own-model loop for the shipped design.
   - Each stance: tall, Compress 0.30 m and the tuck 0.45 m.
   - At 6, 7, 8 and 9.5 m/s.
   - With the bench's ask (1 s) and the held ask (2 s).
   - At rail 0, and with the schedule's rail as the game reads it (up to 12°).
2. **Test the September reading** on this picture: is the pace set by how fast the turn's pull builds? Record the body's lean against the pull (atan(v r / g)), and the feet's torque against their bound.
3. **Find what sets the pace** (Q4). Change one piece at a time, each labelled a diagnostic:
   - each weight (`stateScale` and ρ);
   - the reference's shape (`steadyTurn` and the ask's easing);
   - the senses' delay, with the design and the senses moved together, as in 3.6d's matched delay;
   - the muscle lag;
   - the feet's strength;
   - the hips (model-only);
   - the feed-forward.

   Report what each does to the lean at +0.5 s and +1.0 s, to the wrong-way turn and to the ankle.
4. **Find the fastest lean the feet alone can make,** under these limits:
   - the ankle within its range and the rail's bite room;
   - its torque within the feet's bound (load × half-width, with the turn's load);
   - no motor;
   - the senses as they ship.

   Report the lean it reaches at +0.5 s against the wrong-way turn it costs, as a curve.
5. **Build candidates** (Q5): designs that change only the balance's weights, the shape of the lean it aims for over time, and its feed-forward.
   - **Codex's A2 is one:** the stick as an offset on the ankle's rest; the balance keeps the body over the feet; no lean or turn target. It fits Q5 as a feed-forward and a reference.
   - **A small rail lead,** September's open option, is another.
   - **Out:** the repeats that Q5 rules out.

## The gate (Q6; pre-register it before any candidate is read)

**A candidate passes** when all of these hold in every stance at 6, 7, 8 and 9.5 m/s on the picture, with the bench's ask:
- **Faster:** the body's lean at +0.5 s is at least 1.5 times the shipped design's. Today that is 11.8–15.7°.
- **No more wrong-way turn** than the shipped design, by both measures in the first 0.5 s:
  - the most negative yaw rate is no larger;
  - the least heading change toward the steer is no larger.
- **Within the ankle and the feet:**
  - the ankle is at its clamp no more often than with the shipped design (today never);
  - its torque is over the feet's bound no more often.
- **Settles without a new swing:**
  - the least-damped closed-loop mode, with the delay, is damped no less than the shipped design's at that point;
  - the loop is stable wherever the shipped design's is.

**The measured board, an early warning.** Each candidate is also closed on 3.6d's measured board.
- **The tools:** 3.6d's closings (`response/response.ts`, on `responseLib.ts` and `analyse.ts`), with 3.6e's `board-fit/closures.ts` for its references.
- **How far to trust it:** today's balance swings there as it does in the game, but the closure matched the game in only 2 of 38 sets.
- **How it is used:**
  - A passing candidate that is less damped there than the shipped design is named a risk.
  - The builder takes the best-damped passing candidate to the game.
  - One arm goes to the game. A second needs his word.

Whatever the outcome, compare the best candidate with Forsyth.

**If no candidate passes:** stop, commit, push and hand back the study: what sets the pace, the fastest lean, and why each candidate fails. Nothing is built.

**If one passes:** commit and push the study and the gate's table before building, so the coordinator can check them while you build.

## Part 2: the build and the test (only if the gate passes)

- **The switch.**
  - `?leanSpeed=<arm>` (`SurfZoneConfig.leanSpeed`) is read through `devParam` (`src/devTools.ts`), as 3.6b's `leanPaceSwitch` in `src/game/PhysicalMode.ts` is. That keeps it off by default and pinned off online.
  - **With the switch off, the ride is unchanged:**
    - the byte check is identical;
    - the quick and full reports are identical;
    - `tsc` is clean;
    - the gain lock (`npx vitest run src/physics/stabilityGains`) passes, with its file untouched.
  - Gains move only behind the switch. The lock moves only when Vicente accepts.
- **Pre-register** before any game run, and commit it:
  - the design as built, with its signs and derivation;
  - the arm;
  - the lines and your readers;
  - your predictions from the picture.

  Later changes go in only as dated amendments that fix a bug in your build. Commit each one before the numbers it governs are read.
- **Screen** with 3.6j's tools as the pattern: `turn-first/first-probe.ts`, `run.py`, `line4.py`, `quantities.py` and `measure.sh`, and 3.6i's `turn-entry/screen.py`, `release.py` and `side.py`. Extend the probe for the new switch.
  - **The screening set,** on Big seeds 1–3: `none|compress|crouch:left|right`, `hisway:left|right`, `release0:left|right`, `compress|crouch:straight` and `snap:left|right`. Add the test wave's 8.
  - **The extra set:** `none|compress|crouch:long` (the held turn), `none|compress|crouch:rev` and `release0.2|0.4|0.6:left|right`.
- **Full reports.** Run `npm run report:stability` with the two bundles from this branch, as 3.6j §0.5 ran them, with `&leanSpeed=<arm>` in place of `&turnFirst=<arm>`:
  - for the arm, if it meets lines 2–4 in the screening;
  - otherwise for it, labelled "closest, not passing", only if it meets lines 2 and 3;
  - and once with no switch.

  Run the quick report with no switch after each `src` change, as `CLAUDE.md` requires.

## The pass lines (with the switch off as the control)

1. **Regressions:** at most 1 by the standing rule, as `scripts/stability-report.ts` implements it against `baseline-full.json`, each explained.
   - Name `big:s2:w16:crouch:left` as on the edge if it appears, because it also regresses under the null nudge.
   - Tall and Snap rides count.
2. **Balance falls no worse than today** in each of three places, with the split during the steer ([1.0, 2.0) s) and after it (from 2.0 s):
   - the bench's 80 deep steer rides: at most 47;
   - `hisway:left|right` on Big: at most 19 of 36;
   - `release0:left|right` on Big: at most 22 of 36.

   Straight deep rides (`compress|crouch:straight`) are no worse either: at most 2 of 36. Halving is reported, not required.
3. **Turns no slower, and no nudge:** 3.6j's lines 3 and 4 as written, read by `line4.py`.
   - Over the 80, the mean paired change in `course05` and in `course10` is at least 0.
   - In each stance (standing tall `none:left|right`, Compress `compress:left|right` and Crouch `crouch:left|right`; Big seeds 1–3):
     - on the rides standing at tS 2.5 in both off and the arm, the mean paired heading change toward the steer from tS 1.0 to tS 2.5 is at least 0;
     - on the rides standing at tS 3.0 in both, the mean paired largest heading change toward the steer between tS 1.0 and tS 3.0 is at least 0.
   - Report `hisway:left|right` beside Compress.
4. **The lean comes in sooner** (new; write your reader before any number). In each stance, as in line 3:
   - on the rides standing at tS 1.5 in both, the arm's mean body lean (`bank`, toward the steer) at tS 1.5 is at least 1.25 times off's;
   - on the rides standing at tS 2.0 in both, the arm's mean rail (`rail`) at tS 2.0 is deeper than off's.

   Sign them as `line4.py` signs the heading, by off's lean asked at tS 1.5. The bar is lower than the gate's 1.5, because Compress and Crouch already lag their picture.
5. **His ride.**

**Reported, deciding nothing:**
- **The held turn** (`:long`): falls by stance, during and after the steer; the rail at +0.5, +1.0 and +1.5 s; the peak rail; which way the falls go.
- **His way:** the lean and the rail at +0.5 and +1.0 s.
- **The ankle and the feet,** for the arm and off: how often the ankle sits at its range during the steer, and how often the feet's torque is over their bound.
- **The other measures:**
  - the straight swing (3.6h's measure);
  - the peak yaw rate;
  - the release offsets;
  - which way the remaining falls go (`side.py --convention geometric`);
  - Snap;
  - Crouch's dips before the steer.
- **The comparison with Forsyth.**

## The evidence to return

- **Part 1's tables,** items 1–5, each with its input, sample, time and reference frame. Include the gate's table per stance and speed, and the measured-board damping per candidate.
- **If built:**
  - the pre-registration commit;
  - the screening tables per line;
  - the full reports, with each regression explained;
  - the byte check, `tsc` and the gain lock;
  - the switch-off identity.
- **A README in this folder** (`docs/research/stability/lean-speed/README.md`) with the findings, the predictions against the result, and "For Vicente" in plain words.
- **The living doc.** List the edits How the Surfer Moves needs in the hand-back; the coordinator applies them on `claude/ride-everything`. The stability README and baselines should not change; if they must, say why.

## Logistics

- Work only in `.claude/worktrees/lean-speed`, on `claude/lean-speed`.
- Commit with the trailer `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Push with `git push origin "HEAD:refs/heads/claude/lean-speed"`, and check it with `git ls-remote`.
- Stage only your own paths.
  - Never `git add -A`, never commit `node_modules`, and never use a bare `git stash`.
  - Never run the whole vitest suite. Inside a worktree, use a path filter, for example `npx vitest run src/physics/predictiveBalance`.
  - Never open a PR, and never merge.
- Run at most 8 game processes at once, counted machine-wide before each start.
- Benchmark timings in bundled Node (`npx rolldown file.ts -o out.mjs --format esm`), not under vitest.
- At 80 % of the 5-hour window, stop at a clean pushed commit and hand back.
