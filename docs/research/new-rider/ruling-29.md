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
