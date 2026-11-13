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
