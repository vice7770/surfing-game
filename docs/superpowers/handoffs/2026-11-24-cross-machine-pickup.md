# Cross-machine pickup, 2026-11-24

*Claude coordinator (Opus 5.5), surfer and wave tracks.*
- This page succeeds the [2026-11-20 pickup](2026-11-20-cross-machine-pickup.md).
- Every commit named below was verified on the remote on 2026-11-24 at about 18:15 UTC.
- Nothing is merged, and there are no PRs.
- **Status, 2026-11-26, about 18:25 UTC.**
  - **Vicente's ride verdict (2026-11-25).**
    - He rode the ride build his way: Compress from 0.1–0.3 s after the stand, the trim fully forward from the stand and released once moving, and the stick centred after turns. He likes the stability.
    - On Canyon's big swell he did not fall, and could turn and ride the wave a bit.
    - The turn is too slow in Compress and Crouch.
  - **His next steps:** validate the gain values, and build stability tests; then faster turns.
    - They are proposed as 3.6a (gains and a stability suite) and 3.6b (faster turns in the deep stances), after 3.5z.
    - He set the order ("Stability, then turns"): 3.6a starts once 3.5z is reviewed, and 3.6b follows it. See consult-log entry `7ec10c29` and the entry after it.
  - Vicente asked to continue, and 3.5x ran on the first machine. It is done and reviewed: `claude/what-fails-first` `b0d19ee8`, from `1be12ee7`.
  - Vicente chose the returning taper. 3.5y (`?plantSpeed=taper6`) is done and reviewed: `claude/return-taper` `61dd1c43`. It loses to `plantFloor=6` his way, which stays the ride build.
  - **Vicente chose the take-off falls** (2026-11-25). 3.5z, their fore/aft diagnosis on `plantFloor=6`, is done and reviewed.
    - It is on `claude/take-off-stall` `b66eb87c`, from `b0d19ee8`: docs and probes only, with no `src` change.
    - The review is consult-log entry `f8edd8e3`.
    - **The tail-stall falls** (16 of 30) are set before the stand, on waves already losing the board: the prone twin stalls too.
    - **The other falls** are mostly a whitewater brake at the foot of the face.
    - **Forward trim rescues none.**
  - **The stability system was agreed with Vicente by grilling** (2026-11-25). The spec is consult-log entry `cef3aa44`.
    - **The bar:** the game's exact balance reserve with no look-ahead, red below 0.3, with a direction tick below 0.6, as a readout only. It is on by default behind `rider=new`, shown online and hidden in tournaments.
    - **The benchmark:** `npm run report:stability`, a fixed bot matrix judged against a committed baseline. It is required in every surfer round (`CLAUDE.md`).
    - **3.6a part 1** (the benchmark and the gain lock) is done and reviewed: `claude/stability-report` `f3d7de27`, from `claude/take-off-stall` `b66eb87c`. The review is consult-log entry `c8516a81`.
      - `npm run report:stability` works: quick (the test wave, 26 rides, 10 min) and full (227 rides, 29 min). The baselines are committed, and the gain lock is `src/physics/stabilityGains.test.ts`.
      - His way falls for balance once in 31 Canyon stands. The steered rides fall: 78 of 186 before the release.
      - **He took both amendments** ("Yes, both"; consult log `73c8a415`).
        - The tick follows the tipping margin, because the knees hold the reserve below 0.6 for most of a ride.
        - A balance fall 0.25 s or more sooner is a regression (`CLAUDE.md` `7cd101c9`).
    - **Done and reviewed** (consult log `a64a691b`), by one builder, Sonnet at medium effort:
      - **The rule:** `claude/stability-report` `3778d3b6`.
      - **The bar:** `claude/balance-bar` `dea549c7`, behind `rider=new`.
        - It shows while standing on every swell unless the setting is Never.
        - A board-glyph tick lights the edge he is nearest to tipping over, when the margin is below 0.6.
        - The limit names moved to the dev telemetry.
        - Its quick report and the byte check are identical to the baseline, and the coordinator saw it work in the browser.
      - **Waiting for his ride,** at his usual address on `claude/balance-bar`. On 2026-11-26 the coordinator served the latest reviewed head with the bar (`claude/rider-momentum` `fc466712`) as dev server `breakline-latest`, port 5177, for him to ride.
    - **3.6a part 2 is done and reviewed** (dispatched as consult log `af31121a`; the review is `02d03650`).
      - It is on `claude/slow-board` `5450d8b3`, from `3778d3b6`: docs and probes only, with no `src` change.
      - **No plant identified from the game's ticks passes its own controls.**
        - The registered fit fails its known-plant recovery under the game's colored disturbance.
        - The amended grey-box fit recovers known plants in part, but beats both truths on the held-out rides in 0 of 16 cells.
        - Both identified plants make the ride build's controller diverge at 6–7 m/s, where it rides.
      - **So the gain lock stays at 5–8 m/s, and below 5 m/s 3.6b's arms are judged by the benchmark alone.**
      - The builder's candidate (a), a command-dither identification round, is probe-only, but it is an input the rider does not make, so it needs his word.
    - **3.6b is done and reviewed** (dispatched as consult log `0057220b`; the review is `65039723`).
      - It is on `claude/faster-turns` `340fc560`, from `dea549c7`. Its two arms, `?leanPace=stance` and `?turnGains=firm`, are behind opt-in switches, off by default and pinned off online.
      - **Neither arm passes the stability line.** The full run gives `leanPace` 51 regressing rides and `turnGains` 30. With the switches off, the full report and the byte check are identical.
      - **The diagnosis:**
        - In every stance the balance asks for little lean and first rolls the board out, so it turns the wrong way for 0.35–0.45 s.
        - The deep stances then carry less rail.
        - Their 2.5–3 Hz yaw swing, already there on straight rides, grows into a sideways tip.
        - Before the release on Big, the turn's own falls are 1 of 36 standing tall, against 12 of 36 in Compress and 12 in Crouch.
      - **What drives the swing is not identified.** Codex's review (`27b026f5`, verified in `5d832318`) withdrew the ledger-based attribution, because the yaw ledger books part of the water's push twice.
    - **His controller falls** (the evening of 2026-11-25; consult log `891ef88a` and `432d755f`).
      - He fell turning with the controller but not with the arrows. The D-pad and Precise response did not help: "the board starts drifting left and right".
      - He turned tall on the arrows, and on the pad he holds R2 (Compress). So the stance is the difference, not the device.
      - On the pad, turns in Normal hold. Turns in Compress and in Crouch (the tuck, with `deepen=on`) throw him, and so does a turn just after letting go of R2.
    - **3.6c is done and reviewed** (dispatched as consult log `65039723`; the review is `59637443`). Vicente approved it in his own words: "Yes, start it", then "i say yes to this to continue during the night".
      - It is on `claude/wobble` `5f69e9dc`, from `340fc560`: docs, probes and diagnostic knobs, at their identity by default and read by no address. With the knobs off, the full report and the byte check are identical.
      - **The swing is the balance loop's own mode, on the board as it rides.**
        - The rider's twist and ankle feed it, and the fins and the hull take energy out.
        - The knees and the fins do not set its frequency. The senses' age against the design does, and the ankle gain sets its size.
        - On the design's own model nothing at 2.5–3 Hz is lightly damped, so the swing comes from the gap between the model and the board.
      - **Deep is worse** partly through the yaw inertia's split: about half of Compress's excess over tall, and two-thirds of the tuck's.
      - **The sideways tip** is the body's speed across the feet, which follows the yaw swing. The felt tilt plays no part.
      - **A turn just after letting go of R2** falls until the leg is up, about half a second later. On Big, balance falls inside the steer:
        - let go at the steer, 15 of 36 (Compress held, 12);
        - let go 0.2 s before, 6;
        - let go 0.4–0.6 s before, 3, against tall's 1. Those turns then fall after the steer about as tall turns do.
      - **The review qualifies one inference:** the delay knob moved the senses, not the design, so it shows a dependence on the senses' age against the design, not yet on the delay as designed. It also corrects one stale table column.
      - **Open:** why the loop rings on the board when it decays on its model. That is 3.6d, below.
    - **3.6d is done and reviewed** (Vicente: "Yes, start 3.6d", then "Yes, use the nudges"; dispatched as consult log `ae22e9bb`; the review is `3e8755c5`).
      - It is on `claude/board-response` `4a50e650`, from `5f69e9dc`: docs, probes and two diagnostic knobs, at their identity by default and read by no address. With the knobs off, the quick and full reports and the byte check are identical.
      - **The matched delay** (the design and the senses moved together) sets part of the swing's frequency and most of its size.
        - Compress: 3.08 / 2.67 / 2.36 Hz at 4 / 6 / 8 ticks. The swing is 0.30 of itself at 4 ticks and 2.36 times at 8.
        - 3.6c's growth at −2 ticks came from the mismatch. The second 0.1 s line plays no part.
      - **The board's response, by kicked twins.** The command path and the senses match the balance's model; the board's mechanics do not.
        - Per ankle command, the board rolls 2.75 times the model's and yaws 2.05 times, 44° earlier.
        - Per twist command, the board slips 3.88 times the model's.
      - **The closure.** With the balance's own design, the measured mechanics give an undamped mode at the swing's frequency; the model's give ζ 0.66–0.81. No single part of the mechanics carries the ring.
      - **The review's qualifications.**
        - The closure reproduces the game's loop in only 2 of 38 sets, and it misses the 4-tick peak.
        - The game's own damping is within about ±0.04 of zero, with its sign set by the read-out.
        - A ledger lead: the board's immediate yaw after an ankle nudge is the fins against the rider's coupling.
      - **Open:** fitting `plantAt`'s mechanical terms to the twins, read blind on held-out kicks. That is 3.6e, below. A design on a corrected model would be an arm and would move the gain lock.
    - **3.6e is done and reviewed** (Vicente: "Yes, start 3.6e", 2026-11-26; dispatched as consult log `4144ff19`; the review is `7c86cfa9`).
      - It is on `claude/board-fit` `ef7908f2`, from `4a50e650`: docs, fits and probes, with no `src` change. The full report (227 of 227 and 26 of 26 identical) and the byte check are identical. The held-out seeds stayed blind until the fits were frozen.
      - **Its term table is withdrawn by the 3.6f review (`0247a8e2`).**
        - The table read the board as barely feeling the rider's sideways momentum in yaw: those terms were 0–9 % of the model's, and the yaw inertia it felt was the legs' share alone. It also read the board and the water as rolling with 0–0.3 kg·m², against the model's 0.63–1.0.
        - 3.6f shows that the same regression returns those small yaw coefficients for a term with the full lever built in. So the yaw reading is the method's, not the board's. The roll side rests on the same regression and has not been tested.
        - Neither is to be used to correct the balance's picture.
      - **The fit** (`plantAt`'s own parameters) halves the error on every fresh Compress nudge but misses the bar narrowly: 0.514 against 0.5, within sampling. The fitted numbers are not physical.
      - **The closure** (the fitted model with the shipped design) matches the game's swing frequency on the fitting seeds only. On the fresh seeds it misses by +0.30 and +0.51 Hz in Compress. The registered waveform bound was out of reach for any one response per speed bin.
      - **The lever, which stands:** the model's 0.244 m lever is the game's own geometry.
    - **3.6f is done and reviewed** (Vicente: "Yes, start 3.6f", 2026-11-26; dispatched as consult log `dab31365`; the review is `0247a8e2`).
      - It is on `claude/rider-momentum` `fc466712`, from `ef7908f2`: docs and probes, with no `src` change.
        - The full report gives 227 of 227 and 26 of 26 identical. The byte check, `tsc` and the gain lock pass.
        - The coordinator checked each of these and recomputed the key numbers from the raw rows with its own reader.
      - **The game does not lose the rider's sideways momentum.**
        - The coupled solve gives the board the body's reaction at the body's own arm, 0.25–0.30 m behind the board's centre.
        - The books close to rounding on every substep.
        - The controls closed first: a bare board on the Canyon face, the rider prone, and unit pushes with known answers.
      - **3.6e's term table could not see it.** A test term with the full lever built in, put through the same regression, comes out just as small: the regression files the rider's push under the ankle's states.
      - **At the instant a turn starts, neither the game's board nor the balance's picture meets the body's mass at its lever.** The light board slides sideways under it. In both, what the board meets is the board, the water and the legs.
      - **One real difference.** The picture's body has its own rotational inertia (4.6 kg·m² in Compress), which makes the feet drag 12.7 kg of the body sideways. The game's point-mass body drags none.
        - A sideways push at the feet turns the game's board 3–5 times as much as the picture's.
        - Without that inertia the picture matches the game's yaw answer but overshoots the side push. So the board's sway differs too.
        - Their effect on the 2.5–3 Hz swing is not measured.
      - **Three small bookkeeping faults in the game, named and not fixed.** They are a game-physics question for Vicente.
        - The legs' spin tilts with the leg line without a torque.
        - On substeps where the feet cannot hold, the trunk's pitch couple reaches nothing.
        - At the stand, the legs' spin starts from the board's.

        All three are small except where the feet have already lost their hold.
    - **3.6g is done and reviewed** (Vicente: "Yes, start 3.6g", 2026-11-26; dispatched as consult log `a606635c`; the review is `215caf8a`).
      - It is on `claude/body-inertia` `ef4b86c8`, from `fc466712`: docs and scripts, model-only, with no `src` change.
        - The full report gives 227 of 227 and 26 of 26 identical. The byte check, `tsc` and the gain lock pass.
        - The coordinator recomputed the open errors set by set through 3.6e's own reviewed code, and they are identical.
      - **With the picture's current water, the game's recorded nudges follow the picture with the body's inertia (`riderBody=two`), not without it.** Removing the inertia makes the open predictions worse, the median on the same sets:
        - Compress: 1.11 (fitting seeds) and 1.24 (fresh seeds);
        - tall: 1.35 and 1.53;
        - the tuck: undecided (0.92 and 0.98).
      - **No inertia gives the game's ring.**
        - Without it, the shipped balance rings as lightly as the game, but 0.5 Hz low and out of phase.
        - With more of it, the ring is too high and calms too fast.
      - **3.6e's regression gives the same "missing lever" from the picture's own nudges.** So its term table says nothing about the lever or the inertia, in the game or the picture.
      - **The coordinator's qualification:** with the water fitted freely, 3.6e's fit dropped the inertia to about zero in most speed bins. The inertia and the water trade off, and the nudges cannot separate them.
      - **Where this leaves the track:** 3.6c–3.6g have mapped where the picture and the board disagree. No single fix to the picture closes it. The only model that predicts fresh nudges by 3.6e's bar is the board's own measured response per speed bin.
      - **Next:** to be planned with Vicente, toward faster turns in Compress and Crouch. Nothing is dispatched.
  - The coordinator's reviews are in the consult log.
  - The reset hold below no longer applies. On 2026-11-25 the account read 3 % of its weekly limit, with extra usage disabled.
  - Read the consult log's newest entry before starting anything on the surfer track.

## Start here

1. **Read the consult log.** Its newest entries are on `claude/the-record` at `215caf8a`, in the [consult log](https://github.com/vice7770/surfing-game/blob/claude/the-record/docs/research/new-rider/3.5/consult-codex-2026-11-18.md).
   - Start at "3.5s" (2026-11-23).
   - Read through to the 2026-11-24 entry, "Vicente rides the later cue with `taper` and with `plantFloor=6`".
   - Each step's evidence is linked from its entry.
2. **Check usage before anything else** (see [Usage](#usage)). Start no builder before the weekly reset on **2026-11-25 at 14:00 UTC**.
3. **To ride the current build:**
   1. Check out `claude/plant-rows` at `1be12ee7` in its own worktree.
   2. Link or install `node_modules`, and run the dev server.
   3. Open the game with Vicente's address and the switches:

      ```
      ?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on&cueLater=on&plantFloor=6
      ```

   - **`&plantFloor=6`** is his preference. The measured alternative is `&plantSpeed=taper` in its place.
   - **The test wave.** Add `&testWave=catch` (lying down, paddling in) or `&testWave=ride` (standing, across the face).
     - On this branch, reload the page rather than pressing R if you need an exact repeat.
     - The restart fix is on `claude/test-wave`, which is not merged into this line.

## The owner's verdict (2026-11-24)

> "I tested the code it seem to improve with both option &plantFloor=6 improved the stability. The surfer is able to turn but still not enough balance yet."

## The open question, and the proposed next round (needs his word)

**"Not enough balance yet."** The proposed next round is **3.5x**, a diagnosis:

- **Base:** `claude/plant-rows` `1be12ee7`, with `?cueLater=on&plantFloor=6` (his preference) as the base and `&plantSpeed=taper` beside it.
- **What still fails, on his address:**
  - take-offs;
  - turns;
  - the climb after a turn.
- **How the bot rides:** steer only, and his way, holding Compress (R2) from 0.1–0.3 s after the stand.
- **Instruments:** 3.5v's bank ledger, the capture-point split, and the controller's per-state decomposition (`docs/research/new-rider/3.5/sideways-falls.ts`).
- **The question:** what fails first now, at what speed, and is it within the balance's authority?
- **The builder:** Opus at high effort, in its own worktree, with a usage guard.

Also open:

1. **The delay question** (Claude's reading, put to Codex).
   - The true low-speed water is weak, so the balance's design asks for high gains.
   - With the controller's 0.1 s blind start after the pop-up, those gains grow into the fall.
   - Both working variants lower the low-speed gains, and neither models the delay.
   - A design that accounts for its own sense delay might replace both the floor and the speed map.
2. **The climb after a turn.** With both `plantFloor=6` and `taper`, the board rolls to the outside at 5.4–6.3 m/s on the climb, and the climb survivor (seed 2, wave 2, left) never reaches 0.90 m.
3. **Smaller items:**
   - 3.5u's 3.8 m/s cue fallback;
   - a quieter pop-up landing (his design call);
   - the two pop-up separations at 3.6–3.7 m/s;
   - the fore/aft falls 3.5v found (s2w6 and s2w10 under `cue`).

## Branches

| branch | head | what it holds |
| --- | --- | --- |
| `claude/plant-rows` | `1be12ee7` | 3.5w: `?plantSpeed=face` and `?plantSpeed=taper`; it contains 3.5u and 3.5v. **The ride build.** ⚠ Its `results/35w/steer/` carries 143 MB of phase-2 steering output. Cut it before any integration; rewriting history needs Vicente's word. |
| `claude/sideways-falls` | `3a2404c6` | 3.5v: the sideways-fall diagnosis (docs and probes) |
| `claude/cue-later` | `4ccda729` | 3.5u: `?cueLater=on` |
| `claude/slow-take-off` | `21d4352d` | 3.5t: the slow take-off diagnosis |
| `claude/hold-line` | `6e8bdc2d` | 3.5s: `?holdLine=ref` (not fit for his address) |
| `claude/face-trim` | `41748e53` | 3.5r: `?faceTrim=on` |
| `claude/test-wave` | `0da1eda4` | the test wave (`?testWave=ride\|catch`, `&testFoam=on`), with exact restarts |
| `claude/what-fails-first` | `b0d19ee8` | 3.5x: what fails first on `plantFloor=6` and `taper` (docs and probes; from `1be12ee7`) |
| `claude/return-taper` | `61dd1c43` | 3.5y: `?plantSpeed=taper6` (not adopted: it loses to `plantFloor=6` his way) |
| `claude/take-off-stall` | `b66eb87c` | 3.5z: the take-off falls' fore/aft diagnosis (docs and probes; from `b0d19ee8`) |
| `claude/stability-report` | `3778d3b6` | 3.6a part 1: `npm run report:stability`, its baselines and the gain lock, plus the sooner-fall rule (scripts, docs and one test; from `b66eb87c`) |
| `claude/balance-bar` | `dea549c7` | the balance bar's UI behind `rider=new` (from `3778d3b6`); it contains the ride build |
| `claude/slow-board` | `5450d8b3` | 3.6a part 2: no plant identified from the game's ticks passes its controls, so the lock is unchanged (docs and probes; from `3778d3b6`) |
| `claude/faster-turns` | `340fc560` | 3.6b: faster turns in Compress and Crouch; neither arm passes, and the diagnosis is the result (from `dea549c7`) |
| `claude/wobble` | `5f69e9dc` | 3.6c: the deep stances' wobble is the balance loop's own mode on the board as it rides; the tip is the body's speed across the feet; a turn after letting go of R2 falls until the leg is up (docs, probes and diagnostic knobs, off by default; from `340fc560`) |
| `claude/board-response` | `4a50e650` | 3.6d: the matched delay sets the swing's size and part of its frequency; the command path and senses match the balance's model and the board's mechanics do not (docs, probes and diagnostic knobs, off by default; from `5f69e9dc`) |
| `claude/board-fit` | `ef7908f2` | 3.6e: the fit halves the error on fresh nudges but misses the bar narrowly; the closure matches the swing's frequency on the fitting seeds only; its term table (the board barely feeling the rider in yaw, rolling far lighter) is withdrawn by the 3.6f review (docs, fits and probes; from `4a50e650`) |
| `claude/rider-momentum` | `fc466712` | 3.6f: the game's coupled solve conserves the rider's momentum, and the board meets the body's push at its arm; 3.6e's term table could not see it; the picture's body has a rotational inertia the game's lacks (docs and probes; from `ef7908f2`) |
| `claude/body-inertia` | `ef4b86c8` | 3.6g: with the picture's own water, the kicked twins follow the body's inertia, not a body without it; no inertia gives the game's ring; 3.6e's regression returns the same "missing lever" from the picture itself (model-only; from `fc466712`) |
| `claude/the-record` | `215caf8a` | the consult log (verified on the remote 2026-11-26) |
| `claude/ride-everything` | this commit | orchestration: `CLAUDE.md`, `AGENTS.md`, the handoffs |
| `main` | `1a29a6c7` | untouched |

Every switch is opt-in, pinned off online, and byte-identical when off. The Canyon byte check gives snapshots `a367d938f15fa934` and state `9e5831f80e38abd9`.

## What the 2026-11-23 thread established

1. **3.5s: hold the line.** On a face, the board turns at the coordinated rate of the body's bank. `?holdLine=ref` halves the drift, but it ends every test-wave ride turning back up the face. It is not fit for his address.
2. **3.5t: the slow take-off falls are a stall over the crest.**
   - He stands at 2.3–2.8 m/s at the top of the face, and the crest passes under him.
   - The cue lit at about 3.0 m/s through the water.
   - Every stand that lasted was at ≥ 4.4 m/s.
3. **3.5u: `?cueLater=on`.** The pop-up prompt waits until the board moves 3.6 m/s through the water.
   - Only the prompt moves. The paddle sprint reads the rider's own cue (`AttachedRider.ts`, `advanceStroke`) and keeps today's timing, as does the drawn body.
   - On the test wave, the stands that last go from 4 of 10 to 9 of 10.
   - On his waves, the crest stalls end, and the share of pops that last doubles.
4. **3.5v: the remaining slow-stand falls are sideways, and they come from the balance's own loop.**
   - The pop-up's landing roll (5–29°), the 0.1 s blind start, and gains about 2.5 times the planing design's below a 4.5 m/s schedule combine.
   - Rows `'4'` and `'4.5'` of `PLANT_SPEEDS` describe a lab board that does not plane, at 46° and 26° of trim.
   - `plantFloor=6` rescues 9 of 12 catch collapses and loses none of 34 lasting stands.
5. **3.5w: the low-speed settings.**
   - **Phase 1.** Flat-water rows measured at the board's ridden attitude make the balance stiffer, not softer. A double-counted weight was found and corrected in phase 2: the lab carries 90–98 % of the game's support.
   - **Phase 2.** The equivalent-speed table (`face`, 1.68 v) gives the best take-offs yet, but it fails above about 6 m/s.
   - **Phase 3.** `taper`, max(v, min(1.68 v, 7.8)), keeps the take-off gains and all 34 controls, and rides the plumb grid longer (median fall 3.25 s against 2.53). The climb after a turn still stalls.

## Owner rulings in this thread

| date | his answer | what it decided |
| --- | --- | --- |
| 2026-11-23 | "Hold the line" | With the stick centred, the balance holds the line across the face. |
| 2026-11-23 | "Yes, cue later" | The take-off cue waits until the board can carry him standing. |
| 2026-11-23 | "Yes, diagnose it" | The sideways-fall diagnosis (3.5v). |
| 2026-11-23 | "Yes, build them" | Build the low-speed settings from the game's own board. |
| 2026-11-23 | "Equivalent-speed table" | Phase 2's design. |
| 2026-11-23 | "Build the tapered table" | Phase 3's design. |

**Standing rulings:**
- The turn is not to be limited.
- The fall comes from a balance that lacks the ability to stand.
- No hidden motors.
- No PRs.
- Merge only on his word.
- He rides holding Compress (R2) from 0.1–0.3 s after standing, so every fall measurement needs a drive that rides his way.

## Usage

- **The weekly limit** was at **89 %** at 18:15 UTC on 2026-11-24. It resets on 2026-11-25 at 14:00 UTC.
- **Extra usage is enabled on the account again** (€25.11 of €50 spent). On 2026-11-23 Vicente asked that the extra credits not be spent. Past the weekly limit, work would bill them, so hold builders until the reset.
- **Builder costs measured on 2026-11-23,** as shares of the 5-hour window:

  | builder | share of the window |
  |---|---|
  | medium switch build with paired arms | about 19 % |
  | high diagnosis with five arms | about 29 % |
  | high build with steering and the grid | about 40 % |

  The coordinator's review adds about 5 %. A full window of builder work costs about 8–10 % of the weekly limit.
- **Brief every builder with a usage guard:** stop at 80 % of the window, and push what is green.

## Working notes

- **Tests.**
  - Never run the whole vitest suite: `SurfZoneSimulation.test.ts` alone carries hours of timeouts.
  - In worktrees under `.claude/`, `--dir src` finds no tests, so use path filters, e.g. `npx vitest run src/physics/plantSpeed`.
  - Console output needs `--silent=false --reporter=verbose`.
- **Probes.**
  - Bundle with `./node_modules/.bin/rolldown … --format esm --platform node`, and prepend `globalThis.location = { search: '' };`.
  - One run per process, at most about 4 in parallel, with `node --max-old-space-size=3200`.
  - Keep per-frame output out of the repository.
- **The Canyon byte check.**
  1. Bundle `scripts/m1-cpu-bench.ts`.
  2. Prepend `globalThis.location = { search: '?canyonWaves=true' };`.
  3. Run the Canyon, medium size, 3600 steps, from a fresh spin-up.
- **Git.**
  - Other agents commit in the main checkout and switch its branch, so work in worktrees.
  - Push with `git push origin "HEAD:refs/heads/<branch>"`, then verify with `git ls-remote`.
- **The shell is zsh.** Quote globs. In `git show`, write `"${B}:path"`, not `$B:path`.

## Left behind on the first machine (not portable)

- **Port 5174:** `claude/test-wave` `0da1eda4`.
- **Port 5175:** `claude/plant-rows` `1be12ee7`, served from the `balance` worktree, which is detached.
- **The worktrees:** `.claude/worktrees/` holds `record`, `balance`, `sideways`, `plant-rows` and `test-wave`.
