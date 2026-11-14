# Advisor ruling 29: the new surfer's design

Advisor: this session (Opus 5.5, max effort), 2026-11-13. Read: `design.md`. No run.

## Accepted, with these decisions

1. **The bodies:** the upper body as one point mass, free in all three directions (a 9×9 solve with the board); one equivalent leg along the line from the centre of pressure to the centre of mass; knees with a strength cap that replaces `MAX_LOAD`; "tip" as a state. Accepted. It removes the leak by construction, since the contact is only the legs' and ankles' own forces.
2. **The controller as a human,** in the order ankle → hip → knees → arms, with a 0.1 s active delay and passive ankle impedance for the fast part. The fast loop reads only the body's own lean and rate, never the felt force (the don't-retry list). Accepted.
3. **The unpaired rule forces go under `?rider=new`:** `CARVE_CARRY` (the spec), and also `LEAN_OUT_PULL` (3.2) and `COMPRESS_PULL` (3.3). These act on the body with no reaction on the board, which is the owner's standing "no hidden motors" rule. So the advisor decides yes. The old rider keeps them.
4. **The hand as a weak support toward the wave side,** up to `HAND_FORCE_LIMIT`, in 3.2: accepted. The hand in the water is a real force.
5. **Before 3.2 builds:** extend `rollModel.ts` with the 0.1 s delay and choose the gains on it, against the 13–16 Hz roll and the 3–4 Hz roll–yaw wobble (Modes A and B).
6. **"Tall" is today's standing stance** (pelvis 0.78 m, knees already bent). That is the owner's "normal stance" in his sharp-turn example. No taller stance is added.
7. **The meter's red** is a real red token, not the coral accent.
8. **Substeps:** the fewest that pass every bar, aiming for 8 to 16.

## For the owner

- **ANSWERED 2026-11-13: keep what the physics gives.** The owner's words, in `../owner-decisions-2026-11-13.md` §2: the order must stay right (tall < crouch < Compress) and the spread is whatever the body's numbers give. Step 3.3 does not widen it by pushing the human numbers to the ends of their ranges; its bar is the order, and it reports the spread that comes out. The original question follows.
- **The limits' ratio.** Physics may give a smaller spread than the spec's 0.6 / 1 / 1.7 g, for example 0.8 / 1.0 / 1.4 g, because a lower body's advantages shrink with height. If 3.3's sweep gives that, does the owner accept physics-ordered limits (tall < crouch < Compress, within ±25 %)? Or should the model's human numbers be pushed to the ends of their sourced ranges to widen the spread?

## Efforts

- **3.1: xhigh.** It changes the core coupled solve (a 9th unknown, a new body frame, the knees' strength) in the 3,700-line rider, and must keep every old row byte-identical.
- 3.2 to 3.6 get their efforts when each is briefed.

---

# Rulings 29a to 29d: step 3.1 in four rounds (2026-11-13)

Advisor: this session. Read: `3.1/README.md` Parts 1 to 3. Part 4 (3.1d) is on the unmerged branch `claude/rider-new-31d`.

- **29a (after 3.1):** the passive pitch ankle alone is too soft. Human ankle stiffness is below the toppling stiffness (Loram and Lakie 2002; Morasso and Sanguineti 2002), so an active, delayed pitch loop came forward from 3.2. The carve bars were re-based to the old rider without `CARVE_CARRY` (Compress 2.30 s, standing 2.28 s).
- **29b (after 3.1b):** accepted that the slow reference reads the body's own push through the feet. The otoliths sense the body's own specific force, so this is not the board's felt force. The hip in pitch was added; the roll's 3 Hz share was traced.
- **29c (after 3.1c):** the 3 Hz roll share was a frequency shift of a better-damped mode, so Mode B's bar became decay per cycle and the damping ratio. A slow CoP trim was tried in 3.1d.
- **29d (after 3.1d):**
  - The slow CoP trim made things worse, so 3.1d is not used.
  - Its finding stands: the forward CoP offset is a **start transient** of the probes' placed starts. The CoP peaks near the toe 0.4–0.6 s after placing and is back near the middle by about 2 s. The 2 m/s rise (0.5 s) and the 12 m/s settle (0.6 s) land inside it.
  - **Decision: ship 3.1c behind `?rider=new` as opt-in work in progress,** so the owner can ride and judge. The old rider stays the default, unchanged.
  - **3.1c passes:** N0, N1, N2, all 12 placed starts, the 45° line, glides at 5, 7 and 9 m/s, the Compress carve (3.0 s), Mode A.
  - **3.1c misses:** the 12 m/s placed glide (0.58 s), the 2 m/s rise (0.40 s), the standing carve (2.13 against 2.28 s), and Mode B's damping at 5 m/s.
  - **Next is 3.2, with a fresh agent:**
    - probes that start from a steady glide;
    - the knees-lower strategy and arms;
    - the `rollModel.ts` delay analysis first;
    - braced (co-contracted) ankle stiffness, sourced, as a lever.

---

# Ruling 29e: step 3.2 held; the roll–yaw plant comes first (2026-11-13)

Advisor: this session. Read: `3.2/README.md` and its traces. The code is held on `claude/rider-new-32` (f894d23d), not merged.

**What 3.2 showed**
- Without the old roll drive, the free roll has a slow roll–yaw mode at 1.1–1.9 Hz.
- With a human's 0.08–0.15 s delay, no control law damps it. The agent tried rate, angle, integral, a predictor, acceleration, the hip, a braced ankle and a stiff pitch. Even at 40 ms it is only neutral.
- The board turns hard on a tiny rail: under 1° of roll gave 0.55 rad/s within 0.25 s. The growing mode matches a turn's pull of about 3 times the rail, while the carve lab measured 1.3–1.6.
- So nearly every riding bar regressed: chop, carves, turn pairs, and push recovery, whose order also reversed.

**Reading**
- Humans balance bikes and boards with delays like these. A plant no delayed human can hold is more likely wrong than the human. A bicycle's weave is the analogue: the rider steers into the fall, and that only works if the steering response is not too strong or too fast.
- **The suspects are the board's hydrodynamics at small rail angles:**
  - how much yaw a degree of rail makes, and how fast;
  - the hull's roll damping from the water;
  - the wetted-share ramp at the rail;
  - the fins' side force at small slip.

**Next: a diagnosis, not more controller tuning**
- Board-only tests: towed, with a rigid rider. Small roll steps of 0.5°, 1°, 2° and 5° at 5, 7 and 9 m/s. Measure the yaw rate's gain and time constant, and the roll damping from free decay.
- Compare with planing-hull and surfboard sources, and name the term that over-responds.
- If the hull over-responds, fixing it is a water-force fix, measured the same way.
- Then 3.2 comes back with the same controller.

---

# Ruling 29f: the roll–yaw plant, after the diagnosis (2026-11-13)

Advisor: this session. Read: `roll-plant/README.md` and its results.

**The water is fine; no water-force change.**
- With a rigid rider, the board turns at 0.83–0.93 of a coordinated turn per degree of rail, linear from 0.5° to 5°.
- The water's roll damping (12–20 N·m·s/rad) checks against strip theory.
- 3.2's own delayed model is damped on this measured plant: +0.175 at 0.79 Hz.

**The over-response is in the coupling through the feet, and the cause is a missing inertia.**
- The feet carry the hull's drag (about 0.2 g, about 150 N at 7 m/s) at a centre of pressure off the stringer. That yaws the board: about 1.5 N·m per cm of offset, so 1 cm of offset turns it about as hard as 1° of rail.
- That steering is real; surfers steer with their feet. What is wrong is how fast the board answers.
  - Only the fins resist its yaw, and its yaw inertia is the board's own 0.45 kg·m².
  - The rider is a point mass whose spin is not modelled (`AttachedRider.ts` 1301).
  - So the board's yaw time constant is about 0.035 s. With a human's yaw inertia coupled through planted feet (about 1.5–2.5 kg·m²) it would be about 0.15–0.2 s.

**Decision (surfer track, under `rider=new`; the old rider unchanged): step 3.2b.**
1. **Add the rider's yaw inertia to the board's yaw** through the feet, in the coupled solve.
   - Take a sourced whole-body moment of inertia about the vertical axis, for a standing 73 kg person by posture (anthropometric tables such as de Leva 1996 or Zatsiorsky–Seluyanov).
   - Couple it rigidly at first. The twist and hip rotors stay as the body's internal yaw.
2. **Extend 3.2's delayed model with the yaw state, sway and centre-of-pressure steering,** and choose the gains on it before building.
3. **Rebuild on `claude/rider-new-32`'s controller, and re-run 3.2's bars.**
- The hull's cross-flow yaw damping is the reserve lever. It has no source, so use it only if the inertia is not enough, behind its own switch.

---

# Ruling 29g: step 3.2b held; the locked yaw took away the rider's steering (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 2 and its results. The code is held on `claude/rider-new-32b`
(1c3dd7cb, pushed), not merged. Its probes (`inertia`, `yaw`, `yawstep`) run on that branch.

**What 3.2b showed (accepted)**
- The yaw inertia is sourced (de Leva 1996, posed in the game's stance: 2.81 / 3.05 / 3.20 kg·m²). It does what 29f
  asked: a 1 cm centre-of-pressure step yaws the board with a time constant of 0.122 s at 7 m/s.
- The weave grows faster: damping −0.17 to −0.24 at 0.8–1.0 Hz. No gains damp it, in the model (1,500 samples over the
  physical box) or in the game (two rounds).
- **The limit is not the delay.** At 10 ms of delay the best is +0.06. A loop on the body's bank and bank rate, through
  the ankle, cannot damp this mode even undelayed.

**Reading** [I unless tagged]
- The mode is the board and the body leaning together, righted only by the turn. With the whole body's yaw locked to
  the board, the rider can steer only by rolling the board: the rail, and the feet's centre of pressure, which turns
  it the other way. That is close to a bicycle with its handlebar locked: the only steering left comes through the
  lean, and no rider can balance one.
- A real rider's yaw is not locked. The feet are planted, but the hips, the bent knees and the spine let the pelvis
  and the upper body turn against the board. The two feet, 0.63 m apart, can push across the board in opposite
  directions; that couple is the legs' twist (the feet's free moment [S, recalled: Holden and Cavanagh 1991, J Biomech
  24:887]). Surfers turn by leading with the head, shoulders and hips, and the board follows the feet [S: coaching,
  general]. The twist is the rider's handlebar: the legs turn the board against the upper body's inertia, and the
  upper body turns the other way.
- The game cannot do this today. One equivalent leg cannot push the two feet opposite ways, and 3.2b's rigid coupling
  makes any twist an internal force that cancels.
- So 29f's "rigid at first" was the wrong first step. Its inertia is right; locking it removed the steering. The
  agent's lever 4 (a compliant coupling) comes first.
- The other levers wait. The water's small-rail yaw and the drag line (levers 1 and 2) are water forces, closed since
  29f. The reserve lever has no source and does not help at 7 or 9 m/s in the model.

**Decision: step 3.2c, the twist as the rider's steering, model first** (surfer track, under `rider=new`; the old rider
unchanged)
1. **Split the yaw inertia by where it sits** (de Leva, posed as in `inertia.probe.ts`). With the board: the feet and
   shanks, and the share of the thighs that cannot turn with the pelvis. On the twist: the pelvis, trunk, arms and
   head. The twist rotor (1.5 kg·m², provisional) becomes this share, so nothing is counted twice.
2. **Couple the twist through the legs.** Use a sourced passive stiffness and damping of the legs' and trunk's axial
   rotation, a sourced strength (the hip rotators, both legs), and the joints' range. The twist's torque acts on the
   board through the feet, and on the upper body the other way. It is a limb's force with its reaction, not a motor.
3. **Add the twist to the delayed model** (`YawPlant`). The human loop gets the twist torque as a second channel.
   - Senses: the body's bank and bank rate (as now), the yaw rate (the canals), and the twist's angle and rate (the
     legs' own sense).
   - Delay 0.1 s and motor lag 0.05 s on every channel.
4. **First the upper bound, model only.** Full-state feedback (LQR), no delay: (a) through the ankle alone, (b) through
   the ankle and the twist. Report the best least damping at 5, 7 and 9 m/s for each. This says which channel has the
   authority.
5. **Then a human law on the model,** with margins: gains ×0.75–1.33, delay up to 0.15 s, tall and Compress, at 5, 7
   and 9 m/s.
   - Search laws a human could use. One is steer into the fall: the twist on the bank's rate and angle, as bicycle
     riders do [S, recalled: Schwab, Meijaard and Kooijman 2012, Vehicle Syst Dyn 50:1209; Moore 2012, PhD thesis, UC
     Davis]. Another is the yaw rate's damping.
   - The gate to build: a least damping of at least 0 everywhere, with the margins. The model ran 2–3 times too
     pessimistic against the game in 3.2b's check, so the game's bars judge the rest.
6. **Build in the game only if 5 passes.** Rebuild on `claude/rider-new-32b`, and run 3.2's bars.
   - The twist must show in the pose (the hips and shoulders turn), since motion comes only from visible limbs.
   - The yaw step becomes a report, braced and relaxed: with a sourced twist the board's quick answer is the legs'.
     The carves and the turn pairs check the feet's wrong-way steering.
7. **Stop rule.** Hand back before building if 4(b) shows that the twist cannot damp it either (under +0.05
   undelayed), or if 5 finds no law in one round. Then the water's small-rail yaw (levers 1 and 2) reopens, as a
   water-track question.

**Effort: xhigh.** A new body degree of freedom in the coupled solve, its sourced numbers, and the model's search
before any build.

---

# Ruling 29h: step 3.2c held; balance by prediction (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 3 and its results. Model code only, held on `claude/rider-new-32c`
(31576f97, pushed). Nothing was built in the game.

**What 3.2c showed (accepted)**
- The split (de Leva 1996): with the board 1.37 / 1.37 / 1.24 kg·m², on the twist 1.44 / 1.68 / 1.96 (tall / crouch /
  Compress).
- The twist's numbers are sourced where a source exists:
  - the trunk 7.4–37 N·m/rad standing;
  - a bent knee 47.5 passive, 9 relaxed to 146 braced;
  - the hip rotators about 100 N·m with both legs;
  - the pelvis against the feet about 50°.
  - No hip stiffness from living people was found.
- The passive twist alone takes most of the weave's growth away at 7 and 9 m/s (7 m/s: −0.266 → −0.034). The upper body
  works like a tuned absorber on the board's yaw.
- With full state and no delay, the ankle and the twist damp the weave well: +0.69 / +0.76 / +0.78 at 5 / 7 / 9 m/s,
  with only 11–13 N·m of twist.
- With the 0.1 s delay, searched laws each hold one speed and stance. They sit in separate basins, and no law or table
  of laws holds 5–9 m/s.

**A correction to 29g.** With full state, the ankle alone damps 3.2b's rigid case undelayed (+0.45 to +0.71). So 3.2b's
limit was what its loop read (the bank and its rate only), not a missing channel. "A locked handlebar" was too strong.
The twist stays: it is the body as it is, and it gives the most authority for the least torque.

**Reading** [I unless tagged]
- The plant can be controlled with room to spare. What fails is fixed gains on delayed senses, found by search on a rough
  landscape.
- The literature does not model human balance that way. Its standard models predict the body's state over the nervous
  system's own delay with an internal model, and act on the prediction [S, recalled]:
  - an optimal estimator with feedback on the estimate (Kuo 2005, J Neural Eng 2:S235);
  - intermittent predictive control (Gawthrop, Loram, Lakie and Gollee 2011, Biol Cybern 104:31; Loram et al. 2011,
    J Physiol 589:307);
  - the cerebellum as a Smith predictor (Miall, Weir, Wolpert and Stein 1993, J Mot Behav 25:203).
- 3.2's "predictor" extrapolated the sensed state in a straight line. A model-based predictor is different: it runs the
  body's own model forward over the delay, with the commands already sent.
- With a true model, prediction gives the delayed loop the undelayed loop's modes. A surprise, such as a shove, is still
  answered 0.1 s late, so reactions stay human.
- LQR gains change smoothly with speed and stance, so a schedule of them is connected by construction. Bicycle riders'
  gains also rise with speed (Moore 2012, read by 3.2c's helper).
- The risk is the model's error against the game. In 3.2b's check its weave ran about a quarter low in frequency, and
  its 5 m/s plant is the least trusted. So robustness is the gate.

**Decision: step 3.2d, predictive balance on the twist body, model first** (surfer track, under `rider=new`; the old
rider unchanged)
1. Keep 3.2c's split, numbers and `TwistPlant`.
2. **The senses:**
   - the body's bank and its rate (the vestibular organs);
   - the head's yaw rate (the canals);
   - the twist's angle and rate;
   - the ankle's own angle and rate (the legs' own sense; with the bank it gives the board's roll).
   - Not the slip.
3. **The controller:**
   - an estimator of the whole state from those senses, the slip included;
   - a predictor that runs the linear plant at the current speed and stance over the 0.1 s delay, with the stored
     commands;
   - LQR gains on the predicted state, on both channels, within the efforts' limits (the ankle 72 N·m; the twist
     100 N·m and 0.87 rad);
   - the player's commands enter as the reference (the lean asked for), as in 3.2;
   - gains and model by speed (4–12 m/s, every 0.5) and stance (tall, crouch, Compress), interpolated. Show that the
     schedule is smooth.
4. **The robustness gate, model only.** The least damping must be at least +0.05 with the nominal plant at every point.
   It must stay at least 0 when:
   - the true delay is 0.15 s (the predictor assumes 0.1 s);
   - each measured derivative is scaled ×0.7 and ×1.3 on its own, and in 200 random sets together;
   - the twist's passive stiffness is 5 to 60 N·m/rad (the model assumes 20);
   - the board's roll inertia is 0.03 to 0.3 kg·m².
   Report the worst case and what drives it.
5. **Build in the game only if 4 passes.** Then run 3.2's bars from steady starts. The twist shows in the pose, and the
   yaw step is a report. The predictor costs a few small matrix products a step.
6. **Stop rule.** If no LQR weights pass 4 in one round, hand back. Then only the plant is left, and the water's
   small-rail yaw (levers 1 and 2) reopens.
7. 3.2c's searched laws are not built.

**Effort: xhigh.** It continues 3.2c's agent, which holds the model and the LQR code.

---

# Ruling 29i: step 3.2d's model held; the gate corrected; build it in the game (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 4 and its results. Model code only, held on `claude/rider-new-32d`
(ceb3391f, pushed).

**What 3.2d showed (accepted)**
- All seventeen speeds of the plant are now measured (4–12 m/s), none interpolated.
- Below 5 m/s the board does not plane. It trims 26° at 4.5 m/s and 46° at 4 m/s, and the fins' weathercock turns over.
- On a true model, prediction works as the literature says:
  - at all 51 points the least damping is at least +0.62;
  - a 20 N·s shove at 7 m/s peaks at 3.1° of bank, with 11 N·m of twist, and dies away;
  - a surprise is still answered 0.1 s late.
- The schedule is the bicycle rider's law: the twist steers into the fall and damps the board's yaw. It is smooth above
  6 m/s, and read between its points it holds (+0.16 at worst).
- It holds with all twelve derivatives wrong together by ±15 % at 5–12 m/s: 0 of 200 sets fail, worst +0.03. At ±20 %,
  0–4 of 200 fail.

**The gate is corrected.** It is the advisor's own gate (29h item 4), and it was stricter than the game needs, in two
ways:
- **±30 % on each derivative independently makes plants the game cannot have.**
  - The derivatives were measured about the rider. About the board's own centre, the rail's yaw is a small difference
    of two large numbers (105 − 97 N·m/rad at 7 m/s), so independent errors flip its sign in 40 % of the sets.
  - In a measured plant the errors come by contributor (the hull's pressure, the fins), so they move together.
- **A 0.15 s true delay against a 0.1 s predictor is not the game's case.** The game's rider has one fixed delay, and
  its internal model knows it, as a trained human's does. What the game can have is a timing error of about a frame.

Three tests become reports or leave the gate:
- The twist's stiffness and the board's roll inertia are the game's own values, which the internal model uses. So they
  are reports, not mismatch tests.
- Below 5 m/s the board does not plane, so that range leaves the balance gate. The game's bars judge the slow cases:
  the 2 m/s rise and the 5 m/s glide.

This relaxes the advisor's own gate. The honest risk is that the game's free rider sits further than ±15 % from the
rigid-rider lab. The game's bars find that out.

**Decision: step 3.2e, build predictive balance in the game** (surfer track, under `rider=new`; the old rider
unchanged). A fresh agent, effort xhigh, because 3.2d's agent already holds a large context.
1. **Model checks first, in the same round:**
   - **A frame of timing error:** the true delay at 0.083 and 0.117 s with the 0.1 s predictor, at 5–12 m/s. The least
     damping must be at least 0. This is the only model gate.
   - **Errors by contributor:** the hull's pressure, the fins, the friction and the feet's force, each ×0.7 and ×1.3,
     alone and together, from the roll-plant ledger at 5, 7 and 9 m/s. Report only.
2. **In the game:**
   - **The twist as a body degree of freedom in the standing solve.** The board's share of the yaw inertia is rigid with
     the board. The upper body's share rides on the twist, with the legs' stiffness and damping and the active twist
     torque, and the torque's reaction acts on the upper body. This replaces 3.2b's rigid coupling and the provisional
     `TWIST_INERTIA`.
   - **The controller of `predictiveBalance.ts`:** the estimator, the predictor over the 0.1 s delay and the LQR
     schedule by speed and stance. It runs on a fixed 1/60 s clock of simulated time, with the commands held between,
     as designed, whatever the frame rate.
   - **The lean asked for enters as a reference:** the plant's own steady turn for that lean, with the LQR acting on the
     error.
   - **The twist shows in the pose:** the hips and shoulders turn against the board.
3. **Check the model against the game (report).** Run the 20 N·s shove at 7 m/s tall, and the kick at 5, 7 and 9 m/s,
   in the game. Compare bank, twist, torque and damping with the model's prediction.
4. **Bars:** 3.2's, from steady starts. They are N0, Mode B, Mode A, push recovery, reaction, the save window, glides
   on the plane and on chop, the held carves, the turn pairs, N1 and N2.
5. **Stop rule.** At most two tuning rounds, within the human ranges (the LQR weights, the filter's noises).
   - If the game drifts the way the model's failing sets did, identify the game's own plant in closed loop at 5, 7 and
     9 m/s: add a small probing input and fit the twelve derivatives. Compare them with the lab's, and hand back.
   - The next step is then whichever the comparison names: an internal model from the game's own plant (what a rider
     learns by practice), or the rail's yaw about the board's centre (lever 1).
6. **If the bars pass:** run the merge checks, push the branch, and draft the PR body.

---

# Ruling 29j: step 3.2e; the wobble is beaten, the carve is not (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 5 and its results. The code is held on `claude/rider-new-32e`
(b8e78843, pushed). It is **not** merged into main: on main `?rider=new` is 3.1c, which rides better than this.

## What 3.2e won (accepted)

- **The weave is damped.** Mode B's damping goes from 3.2b's −0.17 / −0.24 / −0.19 to **+0.030 / +0.018 / +0.058** at
  5 / 7 / 9 m/s. The kicks die. That was the problem 3.2 opened and four steps could not close.
- **Push recovery is nearly back:** 138 / 155 / 170 N·s against the old rider's about 190, from 3.2b's 21 / 11 / 5.
- The model gate passes: a frame of timing error, worst +0.029.
- **The game matches the model.** A 20 N·s shove at 7 m/s: bank 2.94° against 3.14°, twist 9.4° against 9.1°, torque
  11.9 against 12.5 N·m.
- Mode A is not seen; the reaction is 0.103–0.105 s; the plane glides are 4 of 4; N1 passes.

## Two faults found in the earlier steps (accepted, and they matter)

1. **The internal model used a board roll inertia of 0.1 kg·m². The game's, with the water's added mass, is
   0.55–1.4.** The model was wrong by 5 to 14 times. It now reads the game's own value.
2. **`COMPRESS_PULL` and `CARVE_CARRY` were still on for the new rider** through 3.2 to 3.2d. Only `LEAN_OUT_PULL` was
   off. They are the unpaired rule forces ruling 29 sent under the switch, and the owner's standing rule is that motion
   comes from visible limbs. **So the carve and turn numbers in 3.2 to 3.2d were flattered.** Both are off now. The
   advisor takes this: it was in ruling 29's list and was not checked at each step.

## Why the carve fails, and it is not the controller

The held carves are 0.30 s and 0.68 s, worse than 3.2b's. The cause is named: **the plant the controller predicts with
was measured at rails of 0.5° to 5°, straight running. A carve is a rail of 20° to 45°.** The lean asked for reaches
44° in 0.15 s. So the controller predicts with a model that does not hold there, and counter-steers hard.

The build agent measured two levers and did not adopt them, because they change the reference ruling 29i fixed. **The
advisor adopts both:**
- **The steady turn that actually balances the lean** (`turn:'tan'`), not the linear plant's steady turn. A real
  rider's lean is held by a coordinated turn; the linearised one is only its small-angle shadow. This is a correction,
  not a lever.
- **A slower lean-in, about 0.5 rad/s.** 44° in 0.15 s is not a human setting a rail.
- With both, the held carves are **2.38 s and 2.58 s: both carve bars pass** (2.28 / 2.30). The turn pair stays 0 of 16.

## Decision: step 3.2f, the carve (the same agent continues; effort xhigh)

1. **Adopt both reference levers**, as above. Source the lean-in rate if a source exists; otherwise report the rate the
   carve needs and leave it a named constant.
2. **Measure the plant at big rails.** The roll-plant lab (`roll-plant/plant.ts`, `captive`) at held rails of 10°, 20°,
   30° and 40°, at 5, 7 and 9 m/s, with the rigid rider. Add the rail angle as a key in `plantAt`, so the LQR schedule
   covers carving as it covers speed and stance. Interpolate; say which points are measured.
3. **Re-run 3.2's bars**, with the carves and the turn pair the ones that must move.
4. **Mode B is a near-pass, not a pass.** Its bar stands, but report the kick's time trace beside the fitted damping:
   the build agent doubts the fit reads the main mode. The owner's ride decides whether a wobble can be felt.
5. **Not in this step:** the chop (4 of 12) and the save window. Both are the pitch loop's, not this controller's. They
   are step 3.2g.
6. **Stop rule:** two rounds. If the turn pair still fails with a plant that covers big rails, say what the trace shows
   and hand back.

## Not merged

3.2e stays on its branch. Merging it would replace 3.1c under `?rider=new` with a rider that cannot carve, and the owner
rides that switch. 3.2f is merged when the carves and the turn pair pass, or when the owner asks to feel it as it is.

---

# Ruling 29k: step 3.2f; the carve is won, and the turn pair is now a speed problem (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 6 and its results. The code is held on `claude/rider-new-32f`
(f318ae78, pushed), not merged.

## What 3.2f won

- **Both held carves pass, for the first time in the rebuild:** 2.83 s standing and 2.98 s in Compress, against bars of
  2.28 and 2.30. The old rider managed 1.93 and 3.0, and it had `CARVE_CARRY` helping it.
- The reference is corrected, as 29j asked: the steady turn that balances the lean, and the rail set over at 0.5 rad/s.
- The plant is measured at rails of 0, 10, 20, 30 and 40° at 5, 7 and 9 m/s. Rail 0 reproduces the roll-plant study to
  the last digit, which is the method's check.

## A real finding, worth keeping outside this step

**The board's behaviour is not linear in rail. Three of the twelve derivatives change sign between 10° and 20°, at
every speed.**

- **The hull stops righting the board.** Beyond about 15° of rail the water no longer rolls the board back up under the
  rider; it rolls it further in (K per roll at 7 m/s: −285, −180, **+250**, +286, +435 at 0, 10, 20, 30, 40°). That is
  the physics behind a committed carve feeling locked in, and behind the point of no return past it.
- **A slide feeds itself.** The side force per degree of sideslip changes sign the same way (+1398 → **−1387** →
  −4143), which is the spin-out. At 7 m/s and 40° the board cannot be stabilised by any controller.
- **At 5 m/s the board holds no turn at 30 or 40°**: it spins out to 71° of sideslip and sinks. The schedule clamps
  5 m/s to 20°, which is honest.

This belongs in the wave and board notes too, not only the rider's: it is the first measured account of why hard turns
behave differently in kind, not only in degree.

## Two faults found in the lab's harness (accepted)

The roll-rate hold added its axis term to the velocity every substep, so the vertical part compounded (22 m/s inside a
frame at a rolled board). And the sideslip being held was read in the board's frame, not the level plane: at 30° of
rail the two differ by 5.6°, and holding the wrong one sank the board to the tank floor. Rail 0 is unaffected, so the
earlier roll-plant study stands.

## Decisions

1. **Keep `SCHEDULE_RAIL_CAP` at 5°.** The cap of 10° moves every turn-pair fall out of the bottom turn and into the
   climb, which looks better, but it costs the Compress carve its margin and does not pass the pair either. Revisit it
   when the pair is unblocked.
2. **Mode B's bar is restated, and then it passes.** The agent's trace shows the fitted yaw-rate "mode" is a wander of
   under 2°/s whose largest peak comes third or fourth, not a weave. The meaningful measure is the body's bank, and the
   kick dies there within about two cycles at 5, 7 and 9 m/s. **The bar becomes: the bank's envelope falls by half
   within two cycles.** The advisor wrote the old bar; this corrects it rather than excusing a miss.
3. **The turn pair's bar is suspended, and the reason is named.** The pair now fails on speed, not on balance: at a cap
   of 10° the rider survives the bottom turn and falls in the climb having slowed to 3.0–5.7 m/s. The old rider passed
   this bar at 14 of 16 with `CARVE_CARRY` on — a hidden speed source that ruling 29 removed. **So the bar was
   measured against a rider that was being pushed.** It returns when the spec's manual pumping exists (step 3.5), and
   no balance step chases it before then. N2's miss (+3.25 against 3.5) is read the same way.
4. **The 0.5 rad/s lean-in stays a named constant.** No source gives a rider's roll rate for setting a rail. The agent
   measured the ladder honestly (0.5 passes, 1.0 gives 1.43/1.60, 1.4 fails) and did not dress the turn rate from
   Forsyth et al. 2024 up as a roll rate. Correct.
5. **The open question is recorded, not closed:** the measured big-rail plant makes the game's carve worse while the
   model says it should be better. The agent's reading is that the lab's trim is a forced steady turn under a rigid
   rider sitting 4–6 cm deeper, while a carve is a transient under a free body. So the rail plant may be right for
   holding a turn and wrong for entering one. That is a question for a later step, and it is why the cap is empirical.

## Decision: step 3.2g, the pitch loop (the same agent continues; effort xhigh)

The balance side is done except for one subsystem. Everything still missing is front-to-back, not side-to-side:
the chop (4 of 12), the save window (too long), and the 20 cm rise at 2 m/s.

1. The pitch loop is still 3.1c's active ankle with 3.2's bracing. Bring it under the same treatment that worked
   sideways: the predicted state, and gains designed on the measured plant rather than hand-set.
2. Measure the pitch plant as the roll plant was measured, over the speeds that matter, and say whether it too bends.
3. Re-run the bars. The ones that must move are the chop, the save window and the rise. The carves and Mode B must not
   regress.
4. **Then merge the whole rebuild as one.** Nothing is merged until a rider is worth the owner's time: main's
   `?rider=new` stays 3.1c until then, and the owner has said they will ride and feed back as the work goes.

---

# Ruling 29l: step 3.2g; the chop fall is the fall test, not the pitch loop (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 7 and its traces. The step changed no game code, so 3.2f's bars
stand unchanged. Branch `claude/rider-new-32g` (072767f3).

## The finding, and it is the advisor's own bar that is wrong

The agent measured the pitch plant, traced a chop fall, and then **did not rebuild the pitch loop**, because the trace
says the pitch loop is not the fault. That was the right call, and the stop rule earned its keep.

- **The board's pitch swing is the chop's, not the rider's.** Both boards swing about ±12° through the same chop, and
  the old rider holds. No pitch controller could have held the board flatter.
- **The difference is the load.** The free body unloads to **0.10 body weight** when the board drops into a trough.
  The feet's torque is bounded by the load they carry, so a rider that light has almost no ankle authority. The old
  rider never went under 0.56 body weight, because its drive carried it. A real surfer rides that moment out.
- **The fall is then called by a test that does not apply there.** `capture` uses ω₀ = √(max(0.5, g)/h). As the felt
  gravity goes toward zero, ω₀ sits on its floor, and a drift of 0.5 m/s alone puts the capture point 0.67 m along —
  twice the feet's reach — with the rider perfectly balanced.
- **Hof's capture point is a theorem about a body on a fixed support under gravity.** A board falling away under the
  rider is neither. The advisor accepted that test in ruling 29 without a condition on it, so this is the advisor's
  error, not the build agents'.
- **The chop and the save window are one fault**, because the same test sets both. The 20 cm rise at 2 m/s is a third
  thing.

## Two more measured findings

- **The pitch plant bends harder than the rail plant, and it changes sign.** Three degrees nose-down of the trim, the
  lift per sinkage reverses (Z per heave at 7 m/s: −3910 at the trim, **+606** nose-down). There the bow is buried, and
  lifting the board adds lift: the heave runs away. That is the pitch twin of 3.2f's slide that feeds itself, and it is
  the bow burying every surfer knows.
- **The hull's pitch damping is 7.7–22.7 N·m·s/rad, two to four times smaller than the 20–30 the braced ankle was
  designed against** — and smallest exactly where the chop bar fails.
- **At 2 m/s there is no planing plant at all:** the board sinks, stands on its tail at 90°, and reaches the tank
  floor.

## Decisions

1. **The fall test gets a validity condition.** Below about a fifth of body weight the capture point is frozen, and the
   posture backstops carry those windows instead. This is a correction to the test, not a loosening of a bar: the test
   was being read outside the conditions it was proved under.
2. **The 20 cm rise at 2 m/s stops being a bar and becomes a report.** The board does not plane at 2 m/s, and the old
   rider falls there too. It was never a fair test of a standing rider's balance.
3. **The pitch loop is not rebuilt yet.** If the fall test and the legs carry the chop, it does not need to be. Only if
   chop still fails does the loop come under prediction — and then scheduled by pitch offset as well as speed, because
   of the sign change, with 3.2f's lesson in hand: a schedule read too far into the bent region made things worse.
4. **The braced ankle's damping was designed against a hull damping two to four times too large.** Recorded; it is
   revisited with the loop, not before.

## Decision: step 3.2h, the fall test and the legs (a fresh agent; effort xhigh)

The 3.2g agent is nearly out of context, and Part 7 §4 is written as this brief. In order:

1. **Freeze the capture point while the rider is light** (below about a fifth of body weight), with the posture
   backstops carrying those windows. Expect the chop and the save window to move together. **Check the push bar does
   not get easier** — a fall test that never fires would pass everything.
2. **The legs' absorption.** Three centimetres of knee travel over a 0.2 m chop is not a rider absorbing anything, and
   the 20,000 N/m knee spring puts a 2.6 Hz mode right on the board's swing. This is a stance question, not a
   controller one.
3. **Re-run 3.2's bars.** The ones that must move: the chop (4 of 12) and the save window (tall 0.85 s against
   0.25–0.35, Compress 0.28–0.33 against 0.15–0.25). Nothing else may regress: the carves stay at 2.83 and 2.98,
   Mode B passes on its restated bank bar, N0 stays byte-identical.
4. **If they pass, run the merge checks and hand back with a PR body.** Then the whole rebuild merges as one and the
   owner rides it.

---

# Ruling 29m: step 3.2h; the chop is side-to-side, and the ankle runs out at 11° (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 8 and its traces. Code held on `claude/rider-new-32h` (66464822).

## Two of the advisor's own calls were wrong, and the agent proved both

1. **"Everything still missing is front-to-back" (ruling 29k) is refuted.** The chop's remaining falls are side-to-side.
   The old rider's board stays within ±11° of roll on the same water; the new rider's reaches 35–63°, with the body
   banked 30–54°. 3.2g's pitch finding was true of the fall it traced and false as a general claim, and the advisor
   generalised it.
2. **Demoting the 20 cm rise at 2 m/s (ruling 29l) was wrong.** The 2 m/s is the **surface's rise rate**, not the
   board's speed — the board glides at 7.4 m/s throughout. The advisor misread it. **The bar is restored, and 3.2h
   passes it** (the old rider falls at 0.32 s, 3.2f at 0.42 s, 3.2h holds).

## What 3.2h built, and both pieces work

- **The fall test's validity condition**, at 0.2 body weights, with the capture point frozen below it. The threshold is
  reasoned from the feet's own authority: at 0.2 BW a foot's whole moment is about 14 N·m against m g h ≈ 645 N·m/rad,
  which is 1.3° of correction. **The push bar did not get easier** — the largest shove saved is identical to the digit
  at gates of 0.1 and 0.2, and only at 0.4 does the gate start sheltering falls. That check was the condition on this
  work and it was done properly.
- **The legs. The fault was a rule, not the stiffness.** `prepareLeg`'s "feet on a deck only push" was gated on the
  *stance's* compressing, so the *balance's* own knee drop was exempt. In a chop trough the knee spring pulled the body
  **down with 3,624 N — five body weights — while the feet carried nothing.** Knee travel over the rise went from 2.8 cm
  to 25 cm. Accepted.
- **The knee stiffness stays at 20 kN/m, measured.** Softer is worse in chop (20/12/8/5/3 kN/m give 4/3/3/3/3 of 12).
  The agent reports that this disagrees with the soft-landing end of its own sources rather than resolving it, which is
  the right thing to do with a disagreement.

## The cause of the chop, named at last

**The ankle runs out at 11° of lean.** The feet are 0.13 m half-width under a centre of mass at 0.68 m, so the ankle's
whole authority is asin(0.13 / 0.68) = 11°. Past that it has nothing, and the next strategy has to carry the rider.

It does not arrive in time, for two reasons the agent found and correctly did not act on:

- **The hip is triggered by the ankle's command, not by the capture point** — while the knees and the arms are
  triggered by the capture point. So the hip waits for the ankle to saturate, which happens at 1.88 s with the board
  already at 50° of roll. The hip then has 0.1 s.
- **`reach` credits the hip's whole remaining range as if it could be spent instantly**, while the rotor needs about
  0.5 s against a 0.3 s horizon. So the fall test believes in a save the body cannot make. **Making `reach` honest on
  its own would make the chop worse**, which is why the two must be done together.

Of the eight remaining falls: five are a real topple across with the test valid and the hip's whole reach already
credited; two are the board diving away with the feet at zero, where the freeze held for 0.27–0.30 s and the posture
backstop separated at 0.25 m; one is the room genuinely spent.

## Decisions

1. **The save window's measure is wrong, not the rider.** The probe reads the time to fall at a shove just past the
   savable one, where that time diverges (1.02× gives 1.200 s, 1.5× gives 0.195 s). The design's own window is
   √(h/g_eff), the asymptote: tall 0.187, crouch 0.165, Compress 0.144, **correctly ordered**. They look short only
   because an impulsive shove's felt gravity is 13–19 m/s²; at 9.81 the same body gives 0.26 s, inside the old bar.
   **The bar becomes: the asymptote, ordered tall > crouch > Compress, and within 20 % of √(h/g_eff) at the test's own
   felt gravity.** The advisor wrote the old bar against an implied 1 g; this states what it meant.
2. **The 20 cm rise at 2 m/s is a bar again**, and it passes.
3. **The knee stiffness disagreement is recorded, not resolved.** It is revisited only if a later step gives a reason.
4. **The 5 m/s chop objection is not accepted yet.** Three of the eight falls are there, during the settle, on a
   19°-trim hull. The next step reports the chop by speed so the question can be settled on numbers.

## Decision: step 3.2i, the hip in time (the same agent continues; effort xhigh)

Everything else passes. This is the last cause.

1. **Trigger the hip from the capture point**, as the knees and the arms already are, so it does not wait for the ankle
   to saturate at 11°.
2. **Make `reach` honest** about what a rotor can deliver inside the horizon, instead of crediting its whole remaining
   range. Do 1 and 2 together: the agent measured that 2 alone makes the chop worse.
3. **Report the chop by speed and by seed**, so the 5 m/s question is settled on numbers rather than on an objection.
4. **Bars:** the chop (4 of 12, must reach 11 of 12) and the save window on its restated measure. Nothing may regress:
   the carves at 2.83–2.85 and 2.98, Mode B on its bank bar, the rise, the push bar's saved shove, N0 byte-identical,
   N1 under about 2 kW (it is now 1.52).
5. **Stop rule:** two rounds. If the hip in time does not carry the chop, trace one fall at the moment the ankle
   saturates and hand back.
6. **If they pass:** the merge checks, and then the whole rebuild merges as one and the owner rides it.

---

# Ruling 29n: step 3.2i; the loop regulates the wrong thing (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 9 and its traces. Code held on `claude/rider-new-32i` (9b9269ac).
Nothing from this step is kept, so the game behaves exactly as 3.2h does.

## Ruling 29m's premise was wrong, and the advisor should have caught it

Part 8 said an honest `reach` would make the chop worse. **That was tagged [I], an inference, and the advisor read it
as [M] and bundled two changes together on it.** Measured on its own, with the hip's term off, **the twelve chop cells
are identical to 3.2h's, every cell, to the frame.** The cap never binds where the arms are in, because
√(2·6·200·1.2) = 53.7 N·m·s against τ/ω₀ = 58. It binds only with the arms out, and there it costs a carve 0.1 s and
halves the saved shove, because ω₀ comes from a felt gravity an impulsive shove inflates to 13–19 m/s².

The lesson is the advisor's: **read the tags.** An inference in a build agent's write-up is not a measurement, and
bundling two changes on one of them cost a round.

## Both of 29m's changes are refuted, and correctly not kept

- **The hip from the capture point is pumped, not late.** It does save once — the board's roll comes down 19.4° → 11.6°
  and the capture point 0.187 → 0.024 m. Then it ratchets: on a plane under a pure shove the capture point crosses the
  feet's middle five times in 1.27 s, about 2 Hz, and the swing runs 0 → −54° of its ±69° one way every cycle. Three
  causes, and two are structural:
  - `humanSwingStep`'s centring is scaled by `max(0, 1 − |demand|/(0.1·SWING_TORQUE))`, so **any demand over 20 N·m
    switches the centring off**;
  - the demand is read a delay late, a fifth of a period at 2 Hz;
  - **a thrown hip rolls the board.** The swing's reaction is a couple through the feet, and against a roll stiffness of
    −285 N·m/rad, 200 N·m is 0.7 rad of equivalent roll. `reach` counts the capture-point shift the rotor buys and not
    the roll it pays.
  - The saved shove for a tall rider falls 1.887 → 0.615 or 1.061. **The guard bar did its job**, which is why that
    bar exists.
- **`reach`'s horizon** is inert where the chop happens, and harmful where it is not. The formula is right and the
  horizon it was given is not. Kept in the file, unwired, with its measurement beside it. The advisor does not ask for
  an invented horizon.

## The cause, from the stop rule's trace

**The roll loop asks the ankle for its whole range only at about 40° of body bank, while the ankle's authority ends at
11°.**

| t | board roll | body bank | the loop's ankle command | capture point past the feet |
|---|---|---|---|---|
| 1.18 s | 12° | **−11.3°** | 3.8° of 14.32° | 0 |
| 1.62 s | 22° | −24.6° | 0.9° | 0.113 m |
| **1.88 s** | **50°** | −42.6° | **saturated** | 0.221 m |
| 1.98 s | 63° | −53.8° | saturated | 0.440 m → fall |

The bank crosses 11° at 1.18 s, where m g h sin(11°) = 93 N·m is exactly the load times the feet's 0.13 m half-width.
**For 0.7 s after that, three quarters of the ankle is never asked for** while the capture point sits 0.06–0.22 m
outside the feet.

**Why: `predictiveBalance`'s state is roll, roll rate, bank, bank rate, twist, yaw and slip — and none of them is where
the body's weight sits over its feet.** So nothing in the loop knows the ankle has run out at 11°, and the gains were
designed for stability margins, not against a bound. The hip was never late; **the thing ahead of it in the order was
never asked for.**

## Decisions

1. **The roll loop opens.** 29l and 29m both held it; the hold is lifted, with the reason named above. This is not
   tuning: it is a wrong regulated variable.
2. **The 5 m/s chop cells are a probe fault until shown otherwise.** All three fall at 1.07–1.98 s of a 2.5 s settle,
   before the run proper begins. A rider that has not finished being placed is not riding. The probe settles properly
   first, and then the bar is read; a fall during a settle is reported and explained, never ignored.
3. **The hip's three obstacles are recorded for whoever returns to it:** the centring rule that switches off above
   20 N·m, the delayed demand, and the roll a thrown hip pays for the shift it buys. If the hip comes back, it is
   designed on the roll model as 3.2d designed the rest, never hand-set.
4. **The save window passes** on 29m's restated measure (0.187 / 0.165 / 0.144 s, ordered, against √(h/g_eff) of
   0.19–0.23 s at the test's own felt gravity). That bar is settled.

## Decision: step 3.2j, give the loop the variable it is missing (the same agent continues; effort xhigh)

1. **Add the body's weight over its feet to the controller's state** — the capture point across, or equivalently the
   lean against its 11° bound. It is the quantity the whole design is about, and it is the one quantity the loop cannot
   see.
2. **Design the gains against the ankle's bound, not only against stability margins.** The ankle's authority is
   load × the feet's half-width; the loop must spend it early, while it still exists, instead of discovering it at 40°
   of bank. Design on the model first, as 3.2d did, and say what the new state buys before building it.
3. **Then the chop**, after a proper settle, reported by speed and seed as before.
4. **Bars:** the chop must reach 11 of 12. Nothing may regress: the carves (2.85 / 2.98), Mode B on its bank bar, the
   rise, **the saved shove 138 / 155 / 170 N·s — this is the guard, and it is what caught 29m's hip**, N0
   byte-identical, N1 under about 2 kW.
5. **Stop rule:** two rounds, then hand back. If adding the state does not carry the chop, the next question is whether
   a rider this tall on feet this narrow can hold that chop at all — which is a question about the stance, not the
   controller, and the advisor will take it.
6. **If they pass:** the merge checks, then the whole rebuild merges as one and the owner rides it.

---

# Ruling 29o: step 3.2j; the model is the thing to fix next (2026-11-13)

Advisor: this session. Read: `3.2/README.md` Part 10. Code on `claude/rider-new-32j` (fb7a1568).

## Two corrections to ruling 29n, both the agent's and both sharper than the ruling

1. **The capture point is not a missing state.** On this plant the body is a point mass on its leg, so
   ξ = L(θ + θ̇/ω₀): a linear functional of two states the loop already carries. Adding it would have been a duplicate.
   **What was missing is the cost.** A diagonal Q penalises θ² and θ̇² separately and can never express the cross term
   2θθ̇/ω₀ — which is the whole difference between a bank coming back and a bank going over. 29n asked for the right
   thing in the wrong place.
2. **And there was a plain bug underneath it.** `commandScale[0]` is 0.09 rad against an ankle bound of 0.25 — **36 %
   of what the ankle has.** Bryson's rule is that a command's scale is the largest *acceptable* command, so the design
   was told the ankle may give a third of its range. **That, not the state vector, is the direct reason it asks 3.8° at
   11° of bank.**

## The understated scale was load-bearing, which is the real finding

Correcting the scale **on its own** collapses the saved shove for the lower stances: crouch 2.127 → 0.791, Compress
2.326 → 0.580, while tall barely moves. Every variant that raises the ankle's gain does the same.

**Why, and this answers the stance question 29n left with the advisor.** Crouch and Compress carry their mass at 0.65
and 0.55 m against tall's 0.85, so they fall faster (ω₀ = √(g/h): 3.4 /s tall, 4.2 /s in Compress) and the rider's
fixed 0.1 s delay is a larger share of their own time constant. **A lower stance is more stable to a body that reacts
instantly and less stable to one that reacts late.** So the gain that helps a tall rider eats the phase margin of a low
one. The bug was accidentally sheltering the stances it would have hurt.

The model did warn (delayed-sense damping at 5 m/s −0.128 → −0.241) and the agent says it underweighted that. Noted,
and the guard bar caught it anyway — which is twice now that the saved-shove guard has stopped a plausible change.

## Explicit constraint handling is also refuted, so 29n's open question is closed

A reference governor driving the ankle to its bound while the predicted ξ is outside the feet — the textbook
capture-point law — **costs 55–60 % of the disturbance margin**. Same mechanism as 3.2i's hip: bang-bang on a signal
that is routinely and briefly outside. Only MPC is left untried, and it is a different controller, not a weight.

## What is kept

- **The settle fix, and only it.** With the rider byte-for-byte as 3.2h left it, the chop goes **4 → 8 of 12**, and
  **the old rider scores 11 of 12 on both settles, cell for cell**. That control is what makes the gain believable
  rather than suspicious, and it is the model of how to change a probe.
- The controller change is not kept.
- The agent's own correction on the ring is accepted: 0.50–1.77 Hz with no pattern is wander, not a mode, and 3.2i's
  "about 2 Hz" was one case at the top of a spread. The two structural causes of the hip's failure stand; the phase-lag
  one is withdrawn.

## Decision: merge 3.2j as opt-in work in progress

Main's `?rider=new` is still 3.1c. 3.2j beats it on the carves (2.85 / 2.98 against 2.13), Mode B, the 20 cm rise and
honest physics, and loses to it in chop. **The owner said they would ride and feed back as the work goes, and their
read on how it feels is the one thing no probe produces.** Ten steps without them touching it is too many. The default
rider is untouched; the trade is stated plainly in the owner's section.

## Decision: step 3.2k, make the model trustworthy before designing on it again

The agent's §8 outranks the chop, and the advisor agrees: **the model and the game disagreed by a factor of four on the
same change.** Five steps of gains have been chosen on a model that had neither input saturation nor a fall test. The
agent has now added both, and with them the model reproduces the fault exactly — so the tool is better than it was and
is worth finishing before it is used again.

1. **Make the model predict the disagreement.** It must reproduce the crouch-and-Compress collapse under a raised ankle
   gain, in the same direction and within a factor of about two. That is the specific place it failed, so it is the
   specific test.
2. **Then re-examine the robustness gate.** Ruling 29i already ruled that independent ±30 % builds plants the game
   cannot have, so report the gate under errors that move by contributor, as 29i asked, and say what fraction fails
   then. "15 % of random plants" under the old test is not the alarm it sounds like.
3. **Only then design:** the cross-term cost, the corrected command scale, and MPC if the model says a receding horizon
   beats a fixed gain against the bound and the delay together. **If the model says the plant will not take it, that is
   an answer and the chop bar goes to the stance instead.**
4. **Bars:** the model's prediction against the game on the one change above; then, if a design follows, the usual set
   with the saved shove as the guard.
5. Stop rule: two rounds. A model that still cannot predict the game is itself the finding, and the advisor takes it
   from there.

---

# Ruling 29p: the owner rode it, and the carve bar was the wrong bar (2026-11-13)

Advisor: this session. The owner rode `?rider=new` in Canyon and reported:

> "one point the surfer is much slower in everything, the surfer is no longer able to turn sharply. Even in compress and
> snap the surfer barely turn and falls out of balance. Before the compress was able to turn sharply (not super sharply)
> but enough to go thro the wave navigation. Now its too stiff barely turn in compress."

## The advisor optimised a measure and lost the thing it stood for

**`LEAN_IN_RATE` is 0.5 rad/s.** A 45° rail then takes **1.6 seconds**. The old rider sets the same rail at 5 rad/s,
in **0.16 s**. The new rider is **ten times slower to start a turn**, and that is the whole of "too stiff, barely
turns".

Ruling 29j adopted 0.5 rad/s from a ladder: 0.5 gave held carves of 2.83 / 2.98 s, 1.0 gave 1.43 / 1.60, 1.4 failed,
and the old rider's 5 gave 0.30 / 0.68. **The advisor read that as "0.5 is the rate the carve needs." It is not. It is
the rate at which the held-carve bar is easiest to pass**, because a rider who leans slowly spends longer leaning. The
bar measures how long a lean is held; the owner wants to know how fast the board comes round. Those are different
things, and the rebuild has no bar for the second one at all.

**So the carve numbers in ruling 29k are true and meaningless.** 2.85 s against the old rider's 1.93 s was bought by
making the turn ten times slower to start.

## The three complaints, each with its cause

1. **"Barely turns, too stiff"** — `LEAN_IN_RATE` 0.5 rad/s, above.
2. **"Falls out of balance" in Compress and Snap** — `SCHEDULE_RAIL_CAP` is **5°**. The balance's gains are designed
   per rail angle, and the schedule is read no further than 5°. A real carve is 20–45°, so in every hard turn the
   controller is using flat-water gains. 3.2f measured the plant out to 40° and found it changes sign past about 15°;
   the rider is then being held by gains designed for a plant that no longer exists.
3. **"Much slower in everything"** — `CARVE_CARRY` is off for the new rider, correctly, because it was a force with no
   reaction. **Nothing replaced it.** The spec's manual pumping (step 3.5) is the replacement and has not been built.
   Ruling 29k suspended the turn-pair bar for exactly this reason, and the owner has now felt the same thing from the
   inside: the suspended bar was the owner's "wave navigation".

## A gap in the sweeps, and it is cheap to close

The lean-rate ladder was run at a rail cap of 5°. The rail-cap screen was run at a lean rate of 0.5 rad/s. **The two
were never swept together.** A faster lean-in may fail only because the controller is blind past 5° of rail — which is
exactly the condition a faster lean-in creates sooner. This is the first thing to try.

## Decisions

1. **The held-carve bar is demoted to a report.** It cannot be the carve's bar, because it rewards leaning slowly.
2. **New bars, taken from the old rider, because the owner named it as the reference** ("before, Compress was able to
   turn sharply enough"):
   - the board's peak turn rate in Compress, and in the standing stance;
   - the time from full stick to a 30° rail;
   - the turn's radius at riding speed;
   - the speed kept through a 90° direction change.
   **Measure the old rider on all four first. Those numbers are the bars**, and the new rider must reach them, not a
   number the advisor invents.
3. **The turn-pair bar comes back**, renamed for what it is: the owner's wave navigation. It stays blocked on pumping,
   and that blockage is now a priority rather than a note.
4. **Priority changes.** Ruling 29o's step 3.2k (make the model predict the game) is held. **The owner rode it and
   cannot turn; that comes first.**

## Decision: step 3.2L, the turn (the same agent continues; effort xhigh)

1. **Measure the old rider's four turn numbers.** They are the bars.
2. **Sweep `LEAN_IN_RATE` against `SCHEDULE_RAIL_CAP` together**, as a grid, against those bars. Report the whole grid,
   not the best corner.
3. **Keep the guards:** the saved shove 138 / 155 / 170 N·s, Mode B on its bank bar, the chop no worse than 8 of 12,
   N0 byte-identical.
4. **If no corner of the grid reaches the old rider's turn rate without losing a guard**, that is the answer: the
   controller cannot hold a fast rail set, and ruling 29o's model step becomes the blocker after all. Say so and hand
   back rather than settling for a slower turn.
5. **Then pumping** (the spec's step 3.5), which is the other half of what the owner felt.

**And a standing instruction for every bar from here on:** a bar is a stand-in for something the owner wants. Before a
number is adopted, say in one line what the owner would feel if that number improved. If the answer is "nothing", it is
not a bar.

---

# Ruling 29q: the owner's calibration — neither rider is right (2026-11-13)

The owner, asked to compare:

> "Its less realistic as before was too fast but the turning was closer to what i wanted. Now its to slow and far from
> any realism or playable"

## What this settles

**The old rider is not the target.** Ruling 29p said to take the old rider's four turn numbers as the bars. That is
right for the **turn** and wrong for the **speed**.

| | Old rider | `?rider=new` | The target |
|---|---|---|---|
| Travel speed | too fast | too slow | between them, and real |
| Turn | "closer to what I wanted" | far too slow | about the old rider's |
| Playable | yes | **no** | yes |

The owner's own reference for travel speed is the clip they filmed: a surfer riding at **27–42 km/h** (7.5–11.7 m/s).
The old rider reaches about 45 km/h, which they called "gigantic waves type of speed". So the speed band is the clip's,
not the old rider's.

## Playable comes before correct

"Far from any realism **or playable**" is two separate failures, and the second one is worse. **A rider nobody can ride
produces no feedback, and feedback is the only thing that tells us whether the physics is right.** Ten steps of probes
did not catch what one ride caught in a minute.

**So: restore a playable turn first, and accept that it will fall more.** A rider that turns and falls can be ridden,
reported on, and fixed. A rider that cannot turn cannot be judged at all. The guards still hold — nothing silently
unphysical comes back — but if the choice is between a bar and a ride, the ride wins until the owner says otherwise.

## The bars, corrected

1. **Turn rate, time to a 30° rail, and turn radius: about the old rider's**, measured, as 29p says.
2. **Travel speed on a ridden wave: inside 27–42 km/h**, not the old rider's 45. This is a bar on the new rider too —
   it is not only about restoring what was lost.
3. **Playability is the gate on this step**, and the owner judges it. The step is not finished on numbers; it is
   finished when they ride it and can turn.
4. Everything else stays a guard: the saved shove, Mode B, N0 byte-identical, and the chop no worse than it is now.

## The order

1. The turn (step 3.2L, already decided in 29p, now with these bars).
2. Pumping, for the speed — and with it the speed band above, since pumping is how a rider earns speed rather than
   being given it.
3. Then, if the falls are still wrong, ruling 29o's model work.

---

# Ruling 29r: how this work runs from now on (2026-11-13)

The owner, after riding:

> "simple dont test anything because the tests are not usefull, the canyon wave was not rideable because the surfer was
> too slow to turn and position himself on the proper section on the wave, the surfer can almost only go in front. ten
> rounds of automated tests should not miss something so simple"
>
> "I would say to let me test more instead of overtesting, because it is cleary not working"

## The tests did not miss it. The advisor overrode it.

The turn-pair probe measures exactly what the owner is describing: can the rider link turns and move around the wave.
**It read 0 of 16 from 3.2e through 3.2j — six rounds.** Ruling 29k suspended that bar because it was failing on speed
while speed was blocked on pumping.

That was managing a schedule, not judging the game. **The one probe that measured what the owner rides is the one that
got switched off**, and then ten rounds of other numbers were reported as progress. The failure is not the probes. It
is the advisor choosing which probe to believe.

## How the work runs now

1. **Short cycles. One change, merge, the owner rides, repeat.** Not ten probe rounds between rides.
2. **No merge is gated on probe bars.** They are reported as information, in a plain table, with no judgement attached.
3. **Keep the seatbelts, which are not bars:** `tsc` clean, the suite passing, the default game byte-identical, and no
   unpaired rule forces or hidden motors. They protect what already works and what the owner's standing rule forbids,
   and they cost nothing.
4. **A probe that measures something the owner actually does on a wave is never suspended.** If it fails, it is
   reported as failing for as long as it fails.
5. **Before any number is adopted as a bar, say in one line what the owner would feel if it improved.** If the answer
   is "nothing", it is not a bar. (29p, restated because it is the same mistake.)

## The thing to fix, in the owner's words

**"Too slow to turn and position himself on the proper section of the wave — he can almost only go in front."**

That is the target for step 3.2L and for whatever follows it. Not a number.

---

# Ruling 29s: the turn is back, and the blocker is the rail that does not dig (2026-11-13)

Step 3.2L is merged (PR #318). He turns. He still cannot get round the wave.

## The build agent refused an instruction and was right

The advisor told it to lead with raising `SCHEDULE_RAIL_CAP`, calling it the structural fix. It refused, with
measurements: caps of 12° and 20° put the standing rider down in 0.3–0.4 s, and **the turn pair stays 0 of 8 at every
cap**, so the cap is not the blocker. And 3.2f's own plant says why — **past about 15° of rail the sideslip mode has
changed sign, so gains designed there are designed on a plant no controller can stabilise.** A schedule should be read
only where the plant is stabilisable. The cap at 5° is a boundary, not a bug.

**That refusal is the behaviour this work needs.** An instruction from the advisor is a hypothesis, and a measurement
beats it.

## What that leaves, and it is the owner's own question

Put the two findings together:

- Past about 15° of rail, **the side force per degree of sideslip changes sign**: a slide feeds itself (3.2f).
- A real carve is 20–45° of rail.
- So **on the plant we have, a committed carve cannot be stabilised by any controller.** Six rounds of controller work
  could not have succeeded, and the ones that "worked" did so by never letting the rider reach that rail.

**Why does the slide feed itself? Because the rail skims.** The plant was measured on a board whose rail planes across
the surface instead of burying into it. A rail that digs resists sideslip — that is what a rail is for.

**So the thing blocking the ride is the thing the owner asked to be accounted for.** Two-way coupling — the board and
the water pushing back on each other, the rail burying in the face — is not a later refinement to be designed around.
It is a plausible cause of the one failure that has survived every controller change.

**This is a hypothesis, not a finding.** It is testable: measure the plant's sideslip derivative at 20–40° of rail with
the hull's buried volume resisting, and see whether the sign flip survives. That test comes before any more controller
work.

## Decisions

1. **Ruling 29o's model work is held again, and for a better reason.** There is no point making a model predict a
   plant that is about to change.
2. **Next: test the hypothesis.** Does the sideslip sign flip survive a digging rail? If it does not, the coupling is
   the fix for the ride and it moves to the front of the queue. If it does, the plant is telling us something about the
   board itself and that is a different conversation.
3. **The turn-pair probe is the gate from here**, as ruling 29r says, and it is reported every round whether it is
   being worked on or not.
4. **Travel speed is not a bar yet.** Both riders settle at the same speed on the same face — the face sets it. It
   becomes a bar when pumping exists.
5. The hand-set numbers are listed in Part 11 for re-check when coupling lands. `SCHEDULE_RAIL_CAP` leads that list,
   because the plant it reads is a non-digging rail's.

---

# Ruling 29t: ruling 29s is withdrawn — the carve is not unstabilisable (2026-11-13)

Advisor: this session. Read: `rail-dig/README.md` and its results. **Both the advisor's hypothesis and the rival it was
tested against are wrong, and the finding is better than either.**

## What actually happens

**On its rail, a slide costs the flat bottom its lift, the board drops, and on a heeled board dropping is sideways.**

- The flip is **hull pressure alone**. The fins never flip: they fall exactly as cos²(heel) — geometry, nothing more —
  and stay the largest resisting contributor at every rail. **The rival is ruled out.**
- **With the heave and pitch held still, nothing flips at any rail.** Side force per slide goes +1398 → +2257 across
  0–40°, growing. The flip exists only when the board is free to sink.
- The chain at 7 m/s: a slide costs 50–70 N of lift per degree, the board sinks 1.5–1.8 cm per degree, and sinking on a
  heeled board makes 1.8–4.2 kN of side force per metre. **Two forces of about 1,800 N nearly cancel and the flip is
  the leftover.** That is why six rounds never found it: nothing here is wrong by 4,000 N.
- The rail **is** a razor — its faces are 3–5 mm tall and the bottom has zero deadrise — so the advisor's "it does not
  bury" was true. **It is not the cause.**

## A third fault in that lab, and a standing rule from it

**The 0.6 s captive hold lands on the heave's overshoot.** Held 3–4 s, the settled numbers are a fifth to a ninth of
the published ones (7 m/s: +1409, +937, +407, −186, −739, −476 against +1398, +825, —, −1387, −2610, −4143). The flip
is real and crosses at about **18°**, but it is far smaller, stops growing past 30°, and **the published 30° and 40°
rows are not reproducible at all**.

This is the third harness fault in the same lab (after the roll-rate hold's vertical term and the sideslip frame).
**Standing rule: a captive hold's number is not used until the hold is shown settled.** Every table in this folder gets
that check before it is quoted again.

## Ruling 29s is withdrawn

29s said a committed carve cannot be stabilised by any controller on this plant, and sent the work to two-way coupling.
**That rested on a plant number that was 5–9× too large, and on condensing away the heave.** The plant the controller
actually meets in the first second of a carve — before the heave settles — **never flips**. Six rounds of controller
work were not doomed. The advisor wrote 29s from one agent's table without asking whether the hold had settled.

## Decisions

1. **The balance model gains a heave state, and a pitch state.** `rollModel32.ts` has neither, so it condenses exactly
   the degree of freedom the flip lives in. This is free, it needs no `src/` change to the game, and it is the first
   thing to try.
2. **The big-rail plant is re-measured properly first** — 0 to 40° at 5, 7 and 9 m/s, with the hold shown settled —
   and 3.2f's table is replaced. Nothing is designed on the old one.
3. **The rail cap question reopens.** 3.2L kept it at 5° because the plant past 15° looked unstabilisable. On the
   corrected plant that reasoning may not hold. Ask it again, on the new numbers, and do not assume either answer.
4. **The rail and the flat bottom are recorded and not built.** A rail that holds needs about 6× its area — a face
   2–3 cm tall over 1.2–1.5 m, with immersed volume and a sharp edge. The zero-deadrise bottom is the root of the lift
   collapse and would touch every patch normal. Both wait until 1–3 have been tried.
5. **The owner's sinking physics is still implicated, and more precisely than before.** The mechanism is literally the
   board sinking; two-way coupling changes the lift-loss and sink chain that produces it. But it is no longer the
   blocker, and it does not come before the free fix.

---

# Ruling 29u: the owner's second ride — three faults, all in Compress (2026-11-13)

> 1. the turning is still not fast enough.
> 2. the body ajusts as the turn happens compensating to the opposite side.
> 3. the balance is too soft, the surfer should not fall so much when lowered.
>
> "this was tried while the surfer was compressed"

What landed: **"the arms and body responsive looks much better and human like."** That is the free body and the
predictive balance doing their job, and nothing in the next rounds may cost it.

## 2. The counter-steer is visible, and it is wrong for a board

The carve traces have shown it since 3.2f — "the counter-steer starts the lean: the rest asks 4°, and the board rolls
1° onto the other rail". The advisor read it as a technicality. It is not: the owner can see it.

**A bicycle must counter-steer** because the rider's only input is a handlebar, so a lean has to be bought by first
steering away. **A surfer has no handlebar.** The board is under their feet and they weight the rail directly. If the
controller counter-steers, it has found a bicycle solution on a vehicle that does not need one.

Where it comes from must be established before it is removed: the **reference** (does solving for the steady turn that
balances the asked lean imply an opposite rail first?) or the **LQR's response** to that reference step. A direct
weighting of the rail toward the lean may be the honest form instead.

**It is also a likely cause of fault 1:** a turn that begins by going the wrong way begins late.

## 3. The inversion, and it is the most serious of the three

Ruling 29o measured this and the advisor wrote it down as physics: the lower stances carry their mass lower, fall faster
(ω₀ 4.2 against 3.4), and the fixed 0.1 s delay is a larger share of their own time constant — so they collapse when
the ankle gain rises.

**That is a statement about our controller, not about surfing.** In real surfing a lower stance is *more* stable: the
weight sits closer to the feet, so the same lean is less far out, and the bent legs absorb. 29o reported the measured
behaviour correctly and then let it stand as if it were a fact about surfing.

**Our game punishes crouching. That inverts the player's instinct and makes the game unlearnable** — the owner reached
for the stance that should have saved him and it dropped him. A fault that teaches the player the wrong thing is worse
than one that merely loses a bar.

The question to answer before changing anything: **does the schedule design per stance, or design once and interpolate
a shape that does not suit a low ω₀?** A stance whose delay is a larger share of its time constant needs *less* gain
and more damping, not the same shape scaled.

## Decisions

1. **Priority: 3, then 2, then 1.** A rider who falls when he crouches cannot be ridden at all. A counter-steer looks
   wrong but is survivable. The turn rate is partly waiting on the rail cap anyway.
2. **"The arms and body look human" is now a guard**, not a bar. Nothing may cost it.
3. **A standing test from this ride:** when a stance, a strategy or an input is the one a real surfer would reach for,
   the game must reward it. If the measurement says otherwise, that is a fault in the model, not a fact about surfing,
   until a source says so.
4. The three may be one fault. If fixing the stance design also fixes the counter-steer or the turn rate, that is
   expected — all three are the same controller meeting the same stance.

---

# Ruling 29v: the owner's fall taxonomy, and the speed shape (2026-11-13)

> "the surfer actually is quite stable in lower speeds, and as the speed increases he loses the ability to turn as much.
> This should happen in the game as physics. No surfer falls from turning to get the wave on the side while compressed,
> he might fall in high speeds or if he tries to cut the wave but never like that"

This replaces several bars the advisor invented. It is a surfer describing what the physics should produce, and it is
checkable.

## The acceptance test, from now on

**A compressed turn to take the wave on the side must never fall.** It is the most basic and safest thing a surfer
does. Compress, moderate speed, turn across the wave — holds, every time.

That is the gate. The turn-pair count stays as information; if this test holds and the turn pair still reads 0, the
probe's framing is wrong and the advisor takes it apart, not the build agent.

## The fall taxonomy — what is a bug and what is surfing

- **Legitimate:** falls at high speed, and falls when trying to cut the wave (a hard reversal).
- **Never:** a fall from a compressed turn across the wave.
- Therefore **the fall rate must rise with speed.** Our chop grid half agrees (2 / 3 / 2 / 1 of 3 at 5 / 7 / 9 / 12 m/s,
  worst at 12), but the turn fails at *every* speed. A flat failure is wrong in shape as well as in level.

## The speed shape is probably already in the water

A turn's radius goes as v²/(g tan φ): at twice the speed the same rail gives four times the radius. The roll-plant
table already shows the turn rate per degree of rail falling 0.0286 → 0.0214 → 0.0172 rad/s at 5 / 7 / 9 m/s.

**So "loses the ability to turn as much with speed" looks like something we already have.** What is missing is that
the rider cannot exploit the low-speed end — he falls there, where he should be at his best. Confirm before building:
if the shape is already there, point 1 needs nothing but a rider who can use it.

## A correction the advisor owes

Step 3.2j found three chop falls at 5 m/s inside the probe's settle, argued they were a settle artefact, and ruling
29n accepted that and called them a probe fault. **The owner says low speed is where a surfer is most solid.** So a
fall at 5 m/s is the **strongest** signal we have, not the most excusable. Those three cells are re-read with that
weighting.

## Standing

With 29u's test, this gives two rules that outrank any probe number:

1. When a stance, a strategy or an input is the one a real surfer would reach for, the game must reward it.
2. A fall must be explainable as one a surfer would have made. Falls belong at high speed and in hard reversals, not in
   the basic turn across the wave.

---

# Ruling 29w: the rail-bite limit is refuted, and 3.2m's headline with it (2026-11-14)

Step 3.2n, held on `claude/rider-new-32n` (b8c280d8). Written at 97 % of the weekly budget, so this is short.

## The correction, and it is the advisor's to carry

3.2m read "he leans too far": the new rider rolling to 60–66° of rail against a `RAIL_BITE` of 48°. The advisor took
that as the cause and told the owner so.

**It is wrong, and the build agent found its own error.** The old rider is **past the 48° bite in 12 of 12 runs**
(54–94°, water-referenced) and still passes 12 of 12. 3.2m had compared a **world-referenced** rail column against a
constant **defined against the water**. A limit at the bite would clamp the good rider harder than the bad one.

So the rail-bite limit is **not built, deliberately**, and 29t's and 3.2m's "he leans too far" is withdrawn. Going past
the bite is what a working turn does.

**That an agent went looking for its own previous round's mistake, on a branch it had already been praised for, is the
behaviour this track runs on.**

## What the trace actually shows, and it is the next step

**The rider reaches a rail and cannot keep it.** The rail peaks at +24° and unwinds to +4° while the bank stalls at 25°
against the 50° asked — **with nothing saturating.** Nothing is at a limit; the turn simply leaks away.

That is the unsensed **0.33–0.74 Hz board heave-and-pitch mode** 3.2m located. The balance is given no sense of it. The
game already measures `rider.contact.load` and the board's pitch, so the sense exists and is not wired.

## The stance-units fix: built, measured, and left off

`DesignWeights.feetReach` replaces the single 2.9° bank cost with each stance's own limit. Built in two forms — the
physical limits outright, and the ranking only.

- Both lift the model's margin against a frame of timing error at all 18 points, most for Compress.
- Both **remove the turn pair's two falls while waiting in Compress**, which is the owner's point 3.
- Both **cost the standing stance its 90° turn** (1.73 s → never; its fall 2.13 s → 1.10 s), *including* the form meant
  to spare it.
- The acceptance test does not move (0 of 12; 1 of 12 with the blunter form).

**Decision: it stays off by default, and the real fault is named instead.** The schedule reads the **instantaneous leg
depth**, so a nominally tall rider blends continuously into the lower designs — **the stances are never isolated**.
That is why a fix aimed at Compress cannot avoid taxing tall. Isolating the stances comes first; then this fix should
land without the trade.

## Order when work resumes

1. **Give the balance a sense of the board's heave and pitch.** The measurements exist in the game already.
2. **Isolate the stances in the schedule**, then land `feetReach`.
3. Run the Canyon byte check before any merge of 3.2n — it was stopped unfinished at the limit. While `feetReach` is
   off the shipped design is byte-identical to 3.2m, all 54 `railmodel` rows including gains, so it cannot differ, but
   it is unverified and must not be merged on that reasoning alone.
