# Step 3.2: balance moves and stance room (`?rider=new`)

Written 2026-11-13 by the build agent (Opus 5.5, effort xhigh), on branch `claude/rider-new-32` from main caca842e. The
contract: `../design.md` §1–§3, §6 and §7 "3.2", `../ruling-29.md` (29 and 29a–29d), the spec
`docs/superpowers/specs/2026-11-12-surfer-physics-redesign.md`.

Tags: [M] measured by a probe here; [R] read in the code; [I] my inference.

All numbers come from probes on analytic water (planes, a small seeded chop, a rising surface, `FaceWater` for the
turn pair). No ride session, no catch report, no autopilot ride, no game page.

## 1. Short answer

- **Built, behind `?rider=new` only.** The standing body is now a free centre of mass in all three directions: the
  roll drive, the balance shifts and the sway are gone. A human balance (`src/physics/humanBalance.ts`) senses the
  body's own bank and bank rate 0.10 s late and acts through a 0.05 s motor lag. It has the design's order (ankle,
  hip, knees lower, arms out), the stance room table, a capture-point fall test and the new `balanceReserve`.
  `LEAN_OUT_PULL` is off. The hand in the water is a weak support. The pitch ankle is braced (more damping). The
  probes now start from a steady glide. The old rider is unchanged.
- **The bars do not pass.** After two rounds inside the physical ranges I hand back, as the brief says. No merge
  checks were run (they run only if the bars pass).
- **What passes:** the glides on a plane at 5, 7, 9 and 12 m/s; the reaction time (0.107–0.109 s); Mode A (not
  seen); 3.1's N1 (the legs' power) and N4 (the placed steep starts); the old rider byte-identical (N0, section 6).
- **What misses:** the glides on chop (4 of 12 hold; old 11 of 12); the 20 cm rise at 2 m/s; both held carves; push
  recovery is ordered the wrong way (Compress > crouch > tall); the save window is too long; the turn pair (0 of 16);
  Mode B (the roll grows after a kick at every speed); N2's gain (+3.25 against 3.5 m/s).
- **The main finding (section 5): with the roll drive gone, the free roll has a slow roll–yaw mode at about 1.1–1.9 Hz
  that a 0.08–0.15 s human loop cannot damp.** Undelayed, a rate gain of 0.3 s damps it well (decay 0.42–0.61 a
  cycle). With the delay, every law I tried grows: rate only, rate and angle, a negative angle gain (the model's choice
  for a strong turn), a predictor, acceleration feedback, the hip as the damper, a braced ankle. Even at 40 ms delay
  it is only neutral. The board turns very hard on a small rail (the growing mode matches the model with the turn's
  pull at about 3 times the rail; the carve lab measured 1.3–1.6 in steady towing).
- **Mode B:** not the old 3–4 Hz wobble. The new rider's roll mode sits at 1.1–1.9 Hz and grows (damping −0.08 to
  −0.13 from a steady start). **Mode A:** not seen in any run (12–17 Hz share 0.000–0.004).

## 2. The model first (ruling 29, item 5)

`src/physics/rollModel.ts` now has the human loop (`humanRollLoop`, `humanRollModes`, `humanRollKick`,
`humanReferenceGain`, `padeDelay`): the old roll model's plant with the delay (a 5th-order Padé, and exact in
`humanRollKick`) and the motor lag. The command reads only the body's own bank and bank rate. The plant is the carve
lab's: the hull rights the board about the rider's load line (860–1,650 N·m/rad), the rail settles in 0.05 s, the
turn's pull follows in 0.035 s at 1.3–1.6 times the rail. Swept: the body 0.5–0.79 m over its feet, the board's roll
inertia with the water 0.03–0.3 kg·m², the felt gravity 1–1.8 g. Probe: `model.probe.ts`, results `results/model.jsonl`.

**Roll** [M, model]:

| Case | Least damping ratio | Where |
|---|---|---|
| No balance (passive) | −0.19 at 0.34 Hz | the lean weaves: the turn's pull over-rights the body |
| Best gains at the carve lab's turn (1–1.4 g) | +0.037 at 0.89 Hz | angle gain 0, rate gain 0.1 s (chosen) |
| The same at 1.8 g | −0.059 | no gains hold a hard carve |
| Best gains at a turn 3 times the rail | +0.15 | angle gain −0.75, rate 0 (a negative gain) |
| The old law undelayed (7.4, 3.6 s) on a free body | −0.16 at 2.3 Hz | the old needed its kinematic drive |

- **The chosen gains** (angle 0, rate 0.1 s): margins are thin. The gains may be scaled by 0.82 to 1.41, and the delay
  grown to 0.115 s, before a mode grows. Mode A and Mode B bands: no mode there. At a turn 3 times the rail they grow
  (−0.19 at 1.29 Hz).
- **Any gain on the bank's angle rings** through the delay (at the carve lab's turn): +1 rad/rad gives −0.28.
- **The lean asked for** is a feed-forward (not delayed): the model's steady rest is 0.22 rad per rad of lean at
  7 m/s. In the probes 0.1 to 0.4 all fall in the held carves; 0.1 is kept.

**Pitch** (`../3.1/pitchModel.ts`, the hull's measured pitch damping 20–30 N·m·s/rad, the board's pitch inertia
0.43–6 kg·m²) [M, model]:

| Case | Least damping ratio |
|---|---|
| 3.1c (ankle damping 0.1 s × k, gains 0.25 and 0.1 s) | +0.015 at 1.83 Hz: this is 3.1's 1.7 Hz pitch swing |
| 3.1c gains, ankle damping 0.3 s × k | +0.18 at 2.0 Hz |
| **3.2 (damping 0.3 s × k, gains 0.25 and 0.05 s)** | **+0.28 at 0.4 Hz** |

- The 3.2 pitch gains may be scaled by 0.02 to 3.7 before a mode grows.
- In the probes the braced pitch damping holds the 12 m/s glide on the plane (3.1c fell), and the placed 2 m/s rise
  (3.1c fell). The pitch swing is gone from the plane glides.

## 3. The steady start (the probes)

- **How a test starts:** the board is placed at the test's speed straight down the plane whose slope balances its
  drag at that speed (13.4° at 5 m/s, 11.0° at 7, 10.4° at 9, 11.1° at 12; `calib.probe.ts` with the old rider), and
  left 2.5 s. The body settles on its feet, the board at its own draft and trim, at its speed. Then the test begins.
  Chop and the rise are laid on the same plane (`OnFace` in `../../board-in-water/lab.ts`).
- **Two pulls were tried and dropped** [M]:
  - a pull on board and body to hold the speed on flat water, reset every frame: the 3.1c pitch loop rang and grew
    (the board's pitch 1–31° at about 1.3 Hz, a fall at 2.95 s at 7 m/s);
  - the same pull as a slow governor: it holds 3.1c, but it tilts the felt gravity off the water's normal by the drag's
    angle (8–16°), which the pitch reference does not see;
  - on the board alone, as a kick each frame: it threw even the old rider (the 2.5 kg board takes the whole pull).
- **The placed starts** (3.1's probe, `results/bars31-new.jsonl`) are kept as a report.
- **What the steady start shows:** the old rider also falls in the 2 m/s rise from a steady start (0.32 s), though it
  holds from 3.1's placed start.

## 4. What was built

All under `rider: 'new'` and standing (`freeBody`), unless said.

**`src/physics/humanBalance.ts` (new, 343 lines):**
- `BALANCE_DELAY` 0.10 s and `MOTOR_LAG` 0.05 s (26–28);
- the roll's gains `HUMAN_BANK_GAIN` 0, `HUMAN_BANK_RATE_GAIN` 0.1 s, `HUMAN_BANK_FORWARD` 0.1 (39–41);
- the ankle across `HUMAN_ANKLE_STIFFNESS` 800 and `HUMAN_ANKLE_DAMPING` 80 (the old's), with their sources (49–50);
- the order: `HIP_SHARE` 0.8 of the feet's reach, `KNEE_SHARE` 0.7 of the hip's range, `KNEE_PAST_FULL` 0.15 m;
  `SWING_INERTIA_SET` 6 and `SWING_INERTIA_ARMS` 10 kg·m² (52–63);
- `stanceRoom`: the design's table (knee travel left, hip range, arms) by the leg's depth (66–90);
- `DelayLine`: a time-stamped ring of channels (92–160);
- `HumanBalance` (187–336): `sense` (the body's own bank and its rate into the delay line), `sensedBank`,
  `sensedBankRate`, `lagRest` (the motor lag), `strategies` (knees lower and arms out, in proportion, from the hip near
  its range or the capture point off the feet, sensed 0.1 s late), `swingInertia`, `capture` (the capture point
  against the feet; Hof et al. 2005), `fallen` (the capture point past the feet's edge by more than the room's reach,
  and the centre of mass itself past the edge);
- `rotorImpulse`: what a rotor can still give before its range (341).

**`src/physics/AttachedRider.ts`:**
- the free body: no roll drive (`uprightVelocity` 3997), no balance shifts and no sway in the drive (2517), no sway on
  a lip strike (2415); free across at every speed (`planingStep` 2593);
- `humanBank` (2667–2702): the bank law's form on the delayed senses, the ankle on its own relative angle and rate
  (implicit in the solve, no lag), the hip across on the command past 80 % of the feet's reach, within the stance's
  range, with the arms' inertia (`humanSwingStep` 2704);
- the knees lower inside `prepareLeg` (3048–3057): the stance held keys the room; the balance's drop spends its travel
  at the crouch's pace;
- `captureStep` (3867–3902): the capture point in the board's frame, with the felt vertical of the pair (board and body
  together, low-passed 0.1 s); the room's reach from the hip rotors; the fall test (3851–3855) in place of the sway's
  `RECOVERABLE_ERROR`. `RECOVERABLE_ERROR` stays only as the posture's range backstop (the leg past its travel, the
  lean past `MAX_BANK` or `MAX_PITCH`);
- `balanceReserve` (2124): the least of the capture point's margin, 1 − the grip used, 1 − the knees' strength used
  (design §6);
- `LEAN_OUT_PULL` off for the new rider (2842; ruling 29);
- the hand as a weak support (3199, `wetForce` 3325): a plate's lift out of the water along its normal, `HAND_LIFT` 1
  on `HAND_AREA` 0.013 m², with the drag capped at `HAND_FORCE_LIMIT` (1034–1040);
- `standingSubsteps` (1824) and the option `standingSubsteps` (probes only); `NEW_STANDING_SUBSTEPS` 16 (46).

**`src/physics/BoardBody.ts`** (701–702): the rider's own substep count while standing free; the old's stays 32.

**`src/physics/standingBody.ts`:** `PITCH_DAMPING_TIME` 0.1 → 0.3 s (51, braced), `PITCH_RATE_GAIN` 0.1 → 0.05 s (75).

**`src/physics/rollModel.ts`** (215–375): the human roll model (section 2).

**Tests:** `src/physics/humanBalance.test.ts` (11 tests: the room table, the delay line, the senses, the capture point
and the fall test, the knees and arms, the rotor, the model). `standingBody.test.ts` now counts the rider's own
substeps in its 0.5 s window.

**Probes** (`docs/research/new-rider/3.2/`): `bars.probe.ts` (the bars from steady starts), `model.probe.ts`,
`calib.probe.ts` (the terminal planes), `trace.probe.ts` (one run frame by frame). `../../board-in-water/lab.ts`
gains `Chop` (a small seeded chop, about 0.2 m significant height), `OnFace` (any water on a plane) and `SUBSTEPS`.

## 5. Why the roll fails (the traces)

- **The kick at 7 m/s** (`results/trace-kick7.jsonl`): the board's roll rate is absorbed at once (the passive ankle),
  then a slow mode rings at about 1.1 Hz and does not die: the bank's peaks −0.2°, +0.6°, −0.2°, +0.4° over 1.5 s,
  the yaw rate in step. The yaw rate's damping ratio is −0.075 (bars). The delayed rate loop acts about a quarter cycle
  late. In an earlier build of round 1 (the 3.1c pitch damping) the same mode grew to 2.9° in 2.3 s with the speed
  swinging ±0.5 m/s, and fell.
- **The held carve, standing** (`results/trace-carve-tall.jsonl`): the lean asked for is a small counter-steer (the
  rest up to 3.9° in 0.2 s). The board turns the other way at 0.55 rad/s on under 1° of rail, the feet run out from
  under the body, and the capture point is past the feet 0.2 s after the steer; the fall comes at 0.4 s. The old rider leans in by throwing its upper body (the swing) and catches the lean
  with an undelayed loop of gain 7.4; the human loop cannot do either fast enough.
- **The chop** (`results/trace-chop2-7.jsonl`) and **the 2 m/s rise** (`results/trace-rise2.jsonl`): these are pitch
  falls, over the nose (the ankle 17–28° forward, the capture point along 0.9–1.7 m past the middle).
- **What I tried in the two rounds** (all on the free body, the kick at 5, 7, 9 m/s; damping ratio of the yaw ringing
  and the roll's decay per cycle; the brief's ranges unless said):

| Round | Law | Result |
|---|---|---|
| 1 | the old law delayed: angle 0.5–7.4, rate 0.2–3.6 s | falls; the carves in 0.05–0.15 s |
| 1 | rate only, 0.1–0.2 s (the model's choice) | grows, −0.08 to −0.14, 1.1–1.5 Hz; no fall in 3 s |
| 1 | a negative angle gain −0.5 to −1 (the model's choice for a strong turn), with a feed-forward 0.1–0.4 | falls |
| 1 | a slow integral on the bank's error (model only) | the model rings at 0.4 Hz |
| 2 | the ankle across braced: damping 160–320, stiffness 1,200–1,600 | grows |
| 2 | the pitch made very stiff (ankle 2.5–4 m g L) | the roll still grows |
| 2 | the hip across as the damper (100–600 N·m per rad/s) | grows faster |
| 2 | a predictor (the state extrapolated over the delay), acceleration feedback | grows faster |
| 2 | delay 0.08 s and lag 0.03 s (the shortest) | grows, −0.04 to −0.17 |
| — | delay 0.04 s, lag 0.03 s (outside the range) | neutral (−0.03 to +0.03) |
| — | **undelayed, rate 0.3 s** | **decays, 0.42–0.61 a cycle** |

- **My reading [I]:** the board's turn answers a small rail very strongly and fast (in the carve trace, under 1° of rail
  turned the board at 0.55 rad/s within 0.25 s; in an earlier build, 2.5° gave 0.74 rad/s). A free body on such a board needs a fast, strong damper on its lean,
  which a human with a 0.1 s delay does not have. Either the board's yaw response to a small rail is too strong (the
  water track's question, not this step's), or a real rider has a fast mechanism the point-mass body lacks. I did not
  add a drive or a rule force to pass.

## 6. The bars, old against new (steady starts, 16 substeps)

Results: `results/bars-old.jsonl`, `results/bars-new.jsonl`; 3.1's probe (placed starts) `results/bars31-new.jsonl`;
the turn pair `results/turnpair-B-new.txt`.

| Bar | Old | New (3.2) | Pass? |
|---|---|---|---|
| N0: `rider=old` byte-identical (the study 6, A-lite 12, B-wall bars and trace, 3.1's `bars-old`) | — | 21 of 21 files the same bytes | yes |
| Push recovery, 7 m/s: largest shove saved, tall > crouch > Compress | 192 / 188 / 191 N·s (2.6 m/s) | 81 / 114 / 131 N·s toward the board's +x (Compress 93 toward −x; tall and crouch the same both ways) | no: the order is reversed |
| Reaction: the first corrective move 0.08–0.12 s after a shove | 0.001 s (no delay) | 0.107–0.109 s | yes |
| Save window, tall 0.25–0.35 s, Compress 0.15–0.25 s | — | tall 0.70–0.80; Compress 0.25–1.12 | no (too long) |
| Glides on the plane, 5 / 7 / 9 / 12 m/s, hold 3 s | 4 of 4 | 4 of 4 | yes |
| Glides on chop (3 seeds), hold 3 s | 11 of 12 | 4 of 12 | no |
| 20 cm rise at 2 m/s: no fall | falls 0.32 s | falls 0.42 s | no |
| Held carve standing ≥ 2.28 s | 1.93 s | 0.40 s | no |
| Held carve Compress ≥ 2.30 s | 3.0 s (with the carry) | 1.22 s | no |
| Turn pair, Compress-held set B, one pair in ≥ 12 of 16 | 14 of 16 | 0 of 16 (3.1c: 4) | no |
| Mode B: roll decay per cycle ≤ the old's | 1.42 / 0.35 / 0.46 | 2.89 / 17.9 / 2.66 | no |
| Mode B: damping ratio ≥ 0.05 at 5 / 7 / 9 m/s | −0.015 / +0.079 / +0.103 | −0.109 / −0.075 / −0.131 at 1.1–1.4 Hz | no |
| Mode A: not seen (12–17 Hz share) | 0.000–0.007 | 0.000–0.004 | yes |
| N1 (3.1): legs per frame < ~2 kW; ≤ 1.46 kW over 0.5 s | to 30.9 kW | 0.55 kW / 0.31 kW | yes |
| N2 (3.1): 20° from 4 m/s, gain ≥ 3.5 m/s, trim 5–9.5° | +1.7, 15.6° | +3.25, 7.5° | no (gain) |
| (3.1) N4 placed straight down and up, 25–50°: hold 0.5 s; the board under 5 g | 2 of 12; to 16.8 g | 12 of 12; to 1.5 g | yes |
| (report) the 45° line placed: hold 0.5 s | 3 of 6 | 5 of 6 (3.1c 6 of 6); one row to 8.9 g | — |
| (report) 3.1's placed glides 5 / 7 / 9 / 12 m/s | 4 of 4 | 3 of 4 (5 m/s falls at 2.58 s as it stalls) | — |
| (report) 3.1's placed 2 m/s rise | holds | holds (3.1c fell) | — |

Notes:
- The push bar: the shove changes the body's velocity across, on a 7 m/s glide down its terminal plane, then 2 s;
  the largest saved by bisection. With the capture point and the knees, the lower stances save more (their ω₀ is
  higher, so a given velocity puts the capture point less far out). The room table's larger hip range in the tall
  stance does not make up for it.
- The save window: a shove puts the capture point off the feet at once (0.001 s), and the fall test then waits for the
  centre of mass to pass the edge with no room left: 0.5–1.1 s. The window is the time the weight takes to drift out.
- The reaction: the active rest's first move of 0.005 rad. The feet's pressure itself moves at once (0.001 s, the
  passive ankle).
- The held carves are on the 7.7 m/s terminal plane (10.8°), not flat water: the old rider holds 1.93 s there
  standing (2.28 s from 3.1's placed start on flat water).

## 7. Sources

- Ankle stiffness in standing, intrinsic, under the toppling stiffness m g h: Loram and Lakie 2002 (J Physiol; 91 ±
  23 % of m g h; recalled in `standingBody.ts`); Vlutters, Boonstra, Schouten and van der Kooij 2015, J Biomech
  48(7):1258–1263, 0.44–0.93 m g h (https://research.utwente.nl/en/publications/direct-measurement-of-the-intrinsic-ankle-stiffness-during-standi/);
  Amiri and Kearney 2020, J Neurophysiol 123(2):743–754, 0.08–0.75 across postures, always under (https://pubmed.ncbi.nlm.nih.gov/31913747/).
  So there is no sourced "braced" stiffness above the 1.2 m g h the design already allows; I did not raise it.
- Co-contraction raises the ankle's stiffness and viscosity: Weiss, Hunter and Kearney 1988, J Biomech 21(7):539–544
  (https://scilit.com/publications/c7f2af4c1e5291244ffcbd628812c971; the abstract was not reachable, so this is
  recalled); a model of anticipatory co-contraction that raises stiffness toward the critical one: Le Mouel and
  Brette 2019 (via https://pmc.ncbi.nlm.nih.gov/articles/PMC6897426). This is the basis for the braced pitch damping
  (0.3 s × k); the value itself comes from the pitch model, not from a measurement.
- The whole balance loop: Peterka 2002, J Neurophysiol 88:1097–1118 (https://pubmed.ncbi.nlm.nih.gov/12205132/): the
  stiffness of the active, delayed loop is about a third above m g h, and damping comes mostly with a shorter delay.
- The delay: Nashner 1977 (leg responses at 90–100 ms; recalled, as in the design). The capture point: Hof, Gazendam
  and Sinke 2005 (recalled). The order of the moves: Horak and Nashner 1986 (as in the design). The hand's lift: a flat
  plate's C_L about 1 at 20–40° (Hoerner and Borst 1985, recalled).

## 8. Substeps

The glides, the rise, the carves and the kicks at 8, 16 and 32 standing substeps (`results/bars-new-sub8.jsonl`,
`bars-new.jsonl`, `bars-new-sub32.jsonl`) [M]:

| Substeps | Plane glides | Chop glides | 2 m/s rise | Held carves (tall / Compress) | Kick: damping ratio at 5 / 7 / 9 m/s | Mode A share |
|---|---|---|---|---|---|---|
| 8 | 4 of 4 | 3 of 12 | falls 0.42 s | 0.40 / 1.22 s | −0.107 / −0.079 / −0.133 | 0 |
| 16 (kept) | 4 of 4 | 4 of 12 | falls 0.42 s | 0.40 / 1.22 s | −0.109 / −0.075 / −0.131 | 0 |
| 32 | 4 of 4 | 6 of 12 | falls 0.42 s | 0.40 / 1.22 s | −0.109 / −0.075 / −0.131 | 0 |

- With the drive gone there is no Mode A at any count: the old reason for 32 is gone.
- The misses are not the substeps': the roll mode is the same at 8, 16 and 32. Only the chop changes a little (the
  small bumps' timing). 16 is kept for now; 8 would pass the same bars as 16 today. The step time was not measured
  (no merge checks).

## 9. What was not run

- The merge checks (the full suite, the Canyon byte check, the headless fps trace, the step time): the bars do not
  pass. Run: `tsc` (app and server), `humanBalance.test.ts`, `rollModel.test.ts`, `standingBody.test.ts`.
- B-wall's `realwall.probe.ts` (a long run on the pool's case water).
- No ride, no game page, no Basilisk case.

## 10. How the owner rides it

The new rider is not ready to judge in turns: it falls in held turns and over chop, sooner than the old one. If the
owner wants to feel it anyway (straight glides and drops):
- Canyon: Menu → Canyon with `?canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on&rider=new`.
- The 2 m pool: Menu → Wave Pool → Waves: Barrel with
  `?poolSize=ref&wallBody=stream&tubeLook=merge&lipLook=fray&afterTube=roller&tubeForm=early&poolReach=long&loftMesh=arc&wallFoot=dug&rider=new`.
- What to look for: the body leans into drops and holds straight glides; it falls in turns. The balance meter now
  reads the capture point, the grip and the knees.

## Files

- `bars.probe.ts`: the bars from steady starts. From the repo root:
  `OUT=/tmp/out.jsonl RIDER=new npx vitest run --config docs/research/new-rider/3.2/vitest.probe.config.ts bars`
  (without `RIDER=new` the old rider; `PART=glide,rise,carve,push,modes` picks parts; `SUBSTEPS=n`).
- `model.probe.ts` (the models), `calib.probe.ts` (the terminal planes), `trace.probe.ts` (`CASE=flat|chopN|riseR`,
  `FACE`, `SPEED`, `KICK_AT`, `STEER`, `STEER_AT`, `COMPRESS`, `CROUCH`, `SECONDS`).
- The turn pair: `../../turn-pair-2026-11-10/run.sh.txt` set B with `OPTS='{"rider":"new"}' CLIMBS=hold DRIVES=off`.
- `results/`: `bars-old.jsonl`, `bars-new.jsonl`, `bars31-new.jsonl`, `model.jsonl`, `turnpair-B-new.txt`,
  `trace-*.jsonl`.

---

# Part 2: step 3.2b, the rider's yaw inertia (ruling 29f)

Written 2026-11-13 by the build agent (Opus 5.5, effort xhigh), on branch `claude/rider-new-32b` (from
`claude/rider-new-32`, rebased on main 733f0377). The contract: `../ruling-29.md` 29f, `../roll-plant/README.md`.

Tags as above: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **Built, behind `?rider=new` only:** the rider's own yaw inertia turns with the board through the planted feet, in
  the board's solve. It is an inertia, not a force. The old rider is unchanged (N0: byte-identical).
- **Sourced:** 2.81 kg·m² standing tall, 3.05 crouched, 3.20 in Compress (de Leva 1996, posed in the game's stance).
- **It does what ruling 29f asked of the board:** a 1 cm centre-of-pressure step at 7 m/s now yaws the board with a time
  constant of 0.122 s (3.2: 0.049 s). The bar is 0.12–0.25 s: a pass, at its low edge.
- **It does not make the delayed balance work. It makes the roll worse.** The slow mode moves from 1.07 to 0.78 Hz at
  7 m/s and grows faster (damping ratio −0.075 → −0.237). Chop falls more, and the shoves saved shrink.
- **The model with yaw predicted this before the game showed it.** With the inertia, no balance gains damp the mode
  in the model, and none did in the game (two rounds). So I hand back, as the brief says.
- **The main finding:** the growing mode is not the feet steering the board. It is the board and the body leaning
  together, a bicycle-like weave. The rail's turn is what rights that lean. A slower yaw makes the turn come later, so
  the weave grows. The roll-plant lab already showed this for a rigid rider with a human's inertia (0.38 Hz, ζ −0.15).
- **The feet's steering is real too, but it is the carve's problem.** In the tall carve the centre of pressure moves
  7 cm toward the lean and turns the board away at 0.44 rad/s (3.2: 0.56). The inertia delays this by about 0.1 s.
  It does not remove it.

## 2. The inertia and its source

**Source** [S]: de Leva, P. 1996, "Adjustments to Zatsiorsky-Seluyanov's segment inertia parameters", J Biomech
29(9):1223–1230. The male sample is 73.0 kg, the game's rider. I used its segment masses, centre-of-mass places and radii
of gyration, as tabulated in Duarte's BMC notebook
(https://raw.githubusercontent.com/demotu/BMC/master/notebooks/BodySegmentParameters.ipynb). The segment lengths are
the male means of de Leva's Table 1, recalled, not read: the paper's scan did not decode. The trunk's three parts sum to
its whole (170.7 + 215.5 + 145.7 = 531.9 mm), as they should.

**Posture** [R, I]: the game's standing pose (`riderPosture.ts`): the feet 0.63 m apart along the board, the hips 0.78 m
over the deck, the hands about 0.45 m out along the board. The crouch ladder lowers the hips by 0.195 m (the pumping
crouch) and 0.30 m (Compress). The joints between are this probe's choice (`inertia.probe.ts`).

**Whole body about the vertical through its centre of mass, kg·m²** [M, from the source]
(`results/inertia.jsonl`):

| Posture | Arms in at the sides | Arms in the riding pose (used) | Arms out wide |
|---|---|---|---|
| Tall | 2.15 | **2.81** | 3.65 |
| Pumping crouch | 2.48 | **3.05** | 3.97 |
| Compress | 2.62 | **3.20** | 4.12 |

- Most of it is the legs spread along the board (1.5–1.6) and the arms (0.9 in the pose).
- **The method's check:** standing straight, the feet together, the arms at the sides, it gives 0.93. With the arms
  out level it gives 2.44, 2.6 times as much. A sports-biomechanics text says a skater "can more than double" it this
  way (Masaryk University, https://www.fsps.muni.cz/emuni/data/reader/book-2/31.html).
- **Not read:** the measured whole-body values (Santschi, DuBois and Omoto 1963, AMRL-TDR-63-36; Griffiths, Watkins and
  Sharpe 2005, Am J Phys 73:85). DTIC returned 403 and the journal is paywalled.
- These are larger than ruling 29f's estimate (1.5–2.5). The difference is the feet spread 0.63 m apart.

**How it is coupled** [R] (`AttachedRider.coupleYaw`, `humanBalance.ts` `riderYawInertia`):
- The point mass carries the body's translation, as before. Its spin about its long axis (the leg line) gets the whole
  body's inertia, by the leg's depth below the riding stance and the balance's arms-out share (+0.85 at full).
- While the feet are on the deck, that spin is held rigid to the board's turn about the same axis. In the board's 6 × 6
  rows: I n nᵀ on the rotation, and the body's own spin's momentum on the right-hand side. So the standing solve and the
  solves apart both carry it.
- In flight the body keeps its spin. Back on the deck the coupling starts from the board's own turn, with no impulse.
- The twist and hip rotors stay the body's internal yaw. The trunk's share overlaps the twist rotor's 1.5 kg·m²; this
  was already marked provisional there.
- A probe option, `yawInertiaScale` (`YAW_SCALE` in `lab.ts`), scales it; 0 is 3.2's point mass. With 0 the kick trace
  is 3.2's byte for byte.

## 3. The model with yaw

**What changed** (`rollModel.ts`: `YawPlant`, `humanYawLoop`, `humanYawModes`, `humanYawKick`, `boardDerivatives`):
- The board is a body of its own: roll, sway and yaw about its own centre of mass. The body is a point mass on its leg
  over the feet. The balance is 3.2's: delay, motor lag, gains on the body's own bank and bank rate.
- The water is the lab's 12 captive derivatives with the rigid point rider: yaw moment, side force and roll moment per
  roll, slip, yaw rate and roll rate (`../roll-plant/results/plant-point.jsonl`). They replace 3.2's lumped hull.
- The lab measured them about the composite centre of mass, over the feet. I moved them to the board's own centre of
  mass, 0.236 m further forward. About the board's own centre, the heel's yaw moment nearly cancels (105 → 7.5 N·m/rad at
  7 m/s), and the fins' weathercock and damping grow (296 → 626, −13 → −49).
- The feet: their forward force (the drag the body carries, 1.5 N·m per cm at 7 m/s, scaled with speed by the terminal
  planes) at the centre of pressure; the body's push across, at the feet's station 0.244 m behind the board's centre of
  mass; the rider's yaw inertia added to the board's.

**First check: the water against the lab** [M] (`yaw.probe.ts` PART=rigid). The lab's free roll decay with the rigid
point rider:

| Speed | Lab | Model |
|---|---|---|
| 5 m/s | grows, capsizes at 1.6 s | grows, ζ −0.32 at 1.14 Hz |
| 7 m/s | 0.945 Hz, ζ −0.021 | 1.27 Hz, ζ +0.013 |
| 9 m/s | 0.882 Hz, ζ +0.081 | 1.53 Hz, ζ +0.062 |

The damping matches at every speed; the frequency is 35–70 % high. Without the roll moments from slip and yaw rate the
model grows at all three speeds, so they matter.

**Second check: 3.2's mode without the inertia** [M]. 3.2's gains (bank 0, rate 0.1 s), the tall body:

| Speed | Game (3.2) | Model |
|---|---|---|
| 5 m/s | ζ −0.109 at 1.18 Hz | diverges (−0.69 at 0.73 Hz) |
| 7 m/s | ζ −0.075 at 1.07 Hz | ζ −0.245 at 1.09 Hz |
| 9 m/s | ζ −0.131 at 1.43 Hz | ζ −0.224 at 1.27 Hz |

It reproduces the growing mode and its frequency at 7 and 9 m/s. It grows 2–3 times faster than the game, and it is
too pessimistic at 5 m/s.

**With the inertia** [M] (3.2's gains, 7 m/s, tall): 1.0 kg·m² → ζ −0.251 at 0.82 Hz; 2.15 → −0.259 at 0.65 Hz; 2.81 →
−0.266 at 0.59 Hz; 3.65 → −0.279 at 0.52 Hz. The inertia slows the mode and does not damp it. The game then showed the
same: 0.78 Hz, ζ −0.237 (section 4).

**The gains and their margins** [M] (the grid bank −2 to 4, rate −0.3 to 0.8 s; over the stance heights and the board's
roll inertia 0.03–0.3 kg·m²):

| Rider's yaw inertia | Speed | Best gains (bank, rate s) | Least damping |
|---|---|---|---|
| none | 7 m/s | 0, 0 (passive) | −0.062 |
| none | 9 m/s | 0, 0 (passive) | +0.100 |
| 2.15–3.2 | 5 m/s | 0.25, 0 | −0.703 |
| 2.15–3.2 | 7 m/s | 0, 0.55 | −0.220 |
| 2.15–3.2 | 9 m/s | 0, 0.05 | −0.201 |

- **There are no margins to give:** with the inertia no gain pair damps the mode at any speed.
- **A random search over the physical box** (1,500 samples at 7 and 9 m/s: ankle 420–1,600 N·m/rad and 40–320
  N·m·s/rad, delay 0.08–0.15 s, motor lag 0.03–0.05 s, the inertia 2.15–3.65, the gains). The best is ζ −0.254 with
  the inertia and −0.028 without.
- **The delay:** at 10 ms of delay and 10 ms of lag the best is +0.059 (rate 0.7 s, gains ×0.4–1.22). At 50 ms it is
  −0.051. So the ankle can barely damp this mode even undelayed.
- **Two levers, in the model only:**
  - The reserve lever, a hull cross-flow damping over the board's back half (unsourced; 50, 150 and 400 N·s/m per m).
    It helps at 5 m/s (−0.30, +0.004, +0.035) and not at 7 m/s (−0.215, −0.238, −0.214) or 9 m/s (−0.32, −0.28, −0.27).
  - The hip taking a share of the rest (±200 N·m/rad): no.
- **The model is sensitive** (PART=sens): scaling single derivatives by 0 or 2 often turns the mode into a static
  divergence. Trust it for trends, not for gains.

## 4. What the game shows

**The yaw step** [M] (`yawstep.probe.ts`, `results/yawstep-32b.jsonl`). From a steady glide, a step couple of the feet's
forward force times 1 cm is added to the board's solve. The time to 63 % of the yaw rate's first peak:

| Speed | Old rider | 3.2 (no inertia) | 3.2b | Inertia the board meets (3.2 → 3.2b) |
|---|---|---|---|---|
| 5 m/s | 0.023 s | 0.061 s | 0.145 s | 0.81 → 3.60 kg·m² |
| 7 m/s | 0.019 s | 0.049 s | **0.122 s** | 0.86 → 3.63 |
| 9 m/s | 0.016 s | 0.039 s | 0.095 s | 0.93 → 3.66 |

**The kick at 7 m/s** [M] (`results/trace-kick7-32b.jsonl`; 3.2's is `trace-kick7.jsonl`):
- The growing mode is the board and the body leaning together. The ankle barely deflects and the centre of pressure
  stays within 1.5 cm. The yaw rate follows the lean a little late.
- This is the rigid rider's weave from the roll-plant lab, which was neutral at 7 m/s with a point rider and grew with
  a human's inertia.
- The bank's peaks: 3.2 (no inertia) ±0.6°, slowly growing; 3.2b ±2–3° within 2 s.

**The tall carve** [M] (`results/trace-carve-tall-32b.jsonl`; the same run without the inertia, `-y0`):
- The counter-steer starts the lean: the rest asks 4°, and the board rolls 1° onto the other rail.
- As the body falls toward the lean, the ankle catches it. The centre of pressure moves 1 → 7.6 cm toward the lean.
  The feet's forward force there turns the board away at up to 0.44 rad/s (3.2: 0.56 rad/s, 0.1 s sooner).
- The feet run out from under the body: the fall comes at 0.48 s (3.2: 0.40 s).

## 5. The bars (steady starts, 16 substeps; `RIDER=new` against the old rider)

Results: `results/bars-new-32b.jsonl`, `bars31-new-32b.jsonl`, `yawstep-32b.jsonl`, `kicks-32b.txt`,
`turnpair-B-new-32b.txt`. The old rider's rows are `bars-old.jsonl` (unchanged).

| Bar | Old | 3.2 | 3.2b | Pass? |
|---|---|---|---|---|
| N0: `rider=old` byte-identical | — | — | 3.2's `bars-old` and 3.1's `bars-old` the same bytes | yes |
| Board yaw time constant, 1 cm CoP step at 7 m/s: 0.12–0.25 s | 0.019 s | 0.049 s | 0.122 s | yes |
| Mode B: roll decay per cycle ≤ the old's (5 / 7 / 9 m/s) | 1.42 / 0.35 / 0.46 | 2.89 / 17.9 / 2.66 | 4.90 / 3.46 / 18.1 | no |
| Mode B: damping ratio ≥ 0.05 (5 / 7 / 9 m/s) | −0.015 / +0.079 / +0.103 | −0.109 / −0.075 / −0.131 | −0.166 / −0.237 / −0.194 at 0.93 / 0.78 / 0.98 Hz | no |
| Mode A not seen (12–17 Hz share) | 0.000–0.007 | 0.000–0.004 | 0.000 | yes |
| Push recovery, 7 m/s: tall > crouch > Compress | 192 / 188 / 191 N·s | 81 / 114 / 131 | 21 / 11 / 5 | no: ordered right, but tiny |
| Reaction 0.08–0.12 s | 0.001 s | 0.107–0.109 | 0.107–0.110 | yes |
| Save window: tall 0.25–0.35 s, Compress 0.15–0.25 s | — | 0.70–0.80 / 0.25–1.12 | tall 1.47–1.53, Compress 0.69–0.71 | no (too long) |
| Glides on the plane, 5 / 7 / 9 / 12 m/s, 3 s | 4 of 4 | 4 of 4 | 4 of 4 | yes |
| Glides on chop, 3 seeds, 3 s: at least 11 of 12 | 11 of 12 | 4 of 12 | 0 of 12 | no |
| 20 cm rise at 2 m/s (report) | falls 0.32 s | falls 0.42 s | falls 0.42 s | — |
| Held carve standing ≥ 2.28 s | 1.93 s | 0.40 s | 0.48 s | no |
| Held carve Compress ≥ 2.30 s | 3.0 s | 1.22 s | 1.27 s | no |
| Turn pair set B: one pair in ≥ 12 of 16 | 14 of 16 | 0 of 16 | 0 of 16 | no |
| N1 (3.1): legs per frame < ~2 kW; ≤ 1.46 kW over 0.5 s | to 30.9 kW | 0.55 / 0.31 kW | 0.55 / 0.27 kW | yes |
| N2 (3.1): 20° from 4 m/s, gain ≥ 3.5 m/s | +1.7 | +3.25 | +3.25 | no |

Notes:
- **The save window's fall:** the capture point past the feet's edge by more than the room's reach, and the centre of
  mass itself past the edge (3.2's test, unchanged). The window is from the capture point first leaving the feet to
  that fall. With the inertia the weight drifts out even more slowly.
- **The push bar:** the largest shove across the body saved on a 7 m/s glide, by bisection (3.2's). The lower stances
  now save less, as they should, but every save is small: the shove wakes the weave.
- **3.1's probe (placed starts):**
  - N4, placed straight down and up at 25–50°: 12 of 12 hold 0.5 s, the board at most 1.8 g, as in 3.2.
  - The 45° line: 4 of 6 hold (3.2: 5 of 6). Of all 30 placed rows, 4 put the board over 5 g (3.2: 1); the
    oblique ones changed most. N3 as in 3.2.
  - Its kick: 5 m/s +0.106, 7 m/s −0.084, 9 m/s −0.139 (3.2: +0.056, −0.062, −0.095).

## 6. The two rounds

Each row: the kick at 5 / 7 / 9 m/s, damping ratio (F: a fall within 3 s). All in `results/kicks-32b.txt`.

| Round | Inertia | Gains (bank, rate s, lean fed forward) | Kick | Result |
|---|---|---|---|---|
| 1 | 2.81 (sourced) | 3.2's (0, 0.1, 0.1) | −0.17 / −0.24 / −0.19 | grows |
| 1 | 2.81 | rate 0, 0.05, 0.2, 0.3, 0.5 | falls, or −0.04 to −0.36 | grows or falls |
| 1 | 2.81 | bank +0.5, +1 | falls at 5 and 7 m/s | falls |
| 1 | 2.81 | bank −0.5, rate 0.1 | −0.10 F / −0.05 F / −0.11 | falls |
| 2 | 2.15 (the arms in) | (−0.25, 0.05) | −0.04 F / **+0.14** / +0.03 | 5 m/s falls |
| 2 | 2.15 | (−0.2, 0.04) | −0.04 F / +0.04 / +0.08 | 5 m/s falls |
| 2 | 2.15 and 1.4 | the other 18 runs around those | falls at 5 m/s, or grows | no pass |
| 2 | 2.81 | (−0.15, 0.05) | −0.06 F / +0.20 / −0.07 | 5 m/s falls |

- The landscape is rough: neighbouring gains flip between ζ +0.14 and a fall.
- A small negative gain on the bank (as 3.2's model chose for a strong turn) helps 7 m/s and throws 5 m/s every time.
- I did not build the reserve lever (the hull's cross-flow damping) in the game. It has no source, it reaches every
  rider, and the model says it does not help at 7 or 9 m/s. That is the orchestrator's call.

## 7. What it means [I]

- Ruling 29f's premise was that a slower board yaw would let a delayed human damp the roll. In this plant it does the
  opposite, in both the model and the game.
- **The slow mode is a weave of board and body together.** It is damped by how fast and how strongly the rail turns
  the board, not by how slowly the feet steer it. A human's yaw inertia, which is real, slows the rail's turn too.
- **The feet's steering through the centre of pressure is a separate problem**, the carve's. It acts at once, while the
  rail's turn builds behind the roll: an early wrong-way turn that a 0.1 s loop cannot handle.
- About the board's own centre of mass, the rail turns the board very little (7.5 N·m/rad). The lab's 105 N·m/rad was
  about the rider, where a rigid rider pinned the board.
- **A question for the water track [I]:** in steady planing the hull's pressure and its drag sit under the load. If the
  drag's line followed the feet's centre of pressure across faster, the feet's steering couple would mostly cancel. The
  game's drag line follows only through the roll (about 1 cm per degree), and the roll lags. I did not test this; it
  is a water-force question, which ruling 29f closed.
- Levers for the advisor, in order [I]:
  1. the rail's turn per degree about the board's own centre (the heel side force's station, the hull's share);
  2. how fast the drag line follows the load across;
  3. the reserve lever (it helps only at 5 m/s in the model);
  4. a compliant coupling of the upper body's yaw (the brief's "rigid at first"), untested.

## 8. What was not run

- **The merge checks** (the full suite, the Canyon byte check, the headless fps trace, the step time): the bars do not
  pass. Run: `tsc` (app and server), `humanBalance.test.ts`, `standingBody.test.ts`, `rollModel.test.ts`.
- **B-wall's long run** on the pool's case water.
- **In the game:** the reserve lever and the compliant yaw coupling.
- No ride, no game page, no Basilisk case.

## 9. How the owner rides it

It is not ready to judge. It falls on chop and in turns, as 3.2 did, and it wobbles more slowly and more widely when
gliding. To feel it anyway, use 3.2's addresses (section 10 above, with `&rider=new`). There is no switch to turn the
inertia off in the game; that is probe-only (`yawInertiaScale`).

## Files (3.2b)

- `inertia.probe.ts`: the yaw inertia by posture from de Leva's table (`results/inertia.jsonl`).
- `yaw.probe.ts`: the model (`PART=rigid,check,inertia,gains,sens,box`; env in the file's header;
  `results/yaw-model.jsonl`).
- `yawstep.probe.ts`: the board's yaw step in the game (`RIDER=new`, `YAW_SCALE`; `results/yawstep-32b.jsonl`).
- `bars.probe.ts` and `trace.probe.ts` as before, with `YAW_SCALE=k` and `GAINS=bank,rate,forward` (`lab.ts`).
- `results/`: `bars-new-32b.jsonl`, `bars31-new-32b.jsonl`, `kicks-32b.txt`, `trace-kick7-32b.jsonl`,
  `trace-carve-tall-32b.jsonl` (and `-y0`, without the inertia), `turnpair-B-new-32b.txt`.

---

# Part 3: step 3.2c, the twist as the rider's steering (ruling 29g)

Written 2026-11-13 by the build agent (Opus 5.5, effort xhigh), on branch `claude/rider-new-32c` (from
`claude/rider-new-32b`, rebased on main 18aaace1). The contract: `../ruling-29.md` 29g, items 1–7.

Tags as above: [M] measured by a probe here (on the model); [R] read in the code; [S] from a source; [I] my inference.
Sources marked "recalled" were not read.

## 1. Short answer

- **Miss at the gate (item 5). Nothing was built in the game**, as the stop rule says. The old rider is untouched: the
  only `src/` change is the model in `rollModel.ts` (new functions; the game does not call them).
- **The split (item 1)** [M, from de Leva]: with the board 1.37 / 1.37 / 1.24 kg·m² (tall / crouch / Compress), on the
  twist 1.44 / 1.68 / 1.96 (+0.87 with the arms out). The old twist rotor's 1.5 is the tall share.
- **The upper bound (item 4)** [M, model]: full-state feedback, no delay, with the 0.05 s motor lag, efforts within
  the limits. (a) The ankle alone, the twist passive: +0.26 / +0.26 / +0.25 at 5 / 7 / 9 m/s. (b) The ankle and the
  twist: **+0.69 / +0.76 / +0.78**. So the twist has the authority; the stop rule's 4(b) bar (+0.05) is met easily.
- **A human law (item 5)** [M, model]: delay 0.1 s and lag 0.05 s on both channels, the senses the brief allows.
  - At each speed and stance alone there are laws that pass with the margins (+0.02 to +0.40).
  - **No single law passes 5, 7 and 9 m/s together** (best −0.33). The gains that work change a lot between speeds and
    stances, and a table of them fails in between (−0.35 at 6 m/s).
  - The one law found for 7–9 m/s that passes (+0.015) works only by cancelling the twist's own stiffness with a
    delayed reflex. With that stiffness halved or doubled (well inside its sourced range) it fails.
  - So by the stop rule I hand back before building.
- **A finding beside the brief** [M, model]: the ankle alone, with full-state feedback, damps 3.2b's rigid case well
  when undelayed (+0.45 to +0.71). 3.2b's "the ankle cannot damp it even undelayed" holds for the bank and bank rate
  only. The ankle needs the board's yaw rate and slip, which the delay then spoils.

## 2. The split (item 1)

**Method** [M, R] (`inertia.probe.ts`, `yawSplit`; `results/inertia.jsonl`, the `split` rows): the posture and
segments of Part 2 (de Leva 1996, posed in the game's stance). Two yaw coordinates:
- the board's turn: the feet, the shanks and the knees go with it (planted);
- the twist: the pelvis, trunk, arms and head turn as one body about the vertical through the body's centre of mass;
- the thighs run from the hip (with the twist) to the knee (with the board). Their speed in a twist falls linearly
  along them, so their share is m [(1 − c)² + r²] d², d the hip's distance from the twist's axis.

| Stance (arms in the pose) | Whole | With the board | On the twist | Of which the thighs | What the board meets, the upper body free |
|---|---|---|---|---|---|
| Tall | 2.81 | **1.37** | **1.44** | 0.11 | 1.32 |
| Pumping crouch | 3.05 | **1.37** | **1.68** | 0.27 | 1.41 |
| Compress | 3.20 | **1.24** | **1.96** | 0.37 | 1.33 |

- The arms out add 0.85–0.92 to the twist and nothing to the board.
- The last column uses the exact coupling term. It is within 3–7 % of the lumped share, so the lumped split is used.
- The twist about the pelvis's vertical instead (the check row) puts most of a crouched trunk's lean on the twist
  (Compress 3.07 / 0.13). I chose the centre of mass because the game's body spins about its leg line through it, as
  3.2b's whole inertia did [I].
- Under `rider=new` this would replace the provisional `TWIST_INERTIA` 1.5, so nothing is counted twice. (Not built.)

## 3. The twist's numbers and their sources (item 2)

A research helper searched; PubMed was blocked, Europe PMC worked. [S] = read in the text or abstract; [S, 2nd] = read
only through a review or a search result.

- **The trunk's axial stiffness, passive:**
  - Kosmopoulos et al. 2012, Open Spine J 4:1–4 (https://benthamopenarchives.com/contents/pdf/TOSPINEJ/TOSPINEJ-4-1.pdf):
    seated, men 19.6–22.6 N·m/rad [S].
  - McGill, Seguin and Bennett 1994, Spine 19:696: standing, 7.4 N·m/rad near neutral, 37 at 24° [S, 2nd: Watt et al.
    2022, Med Biol Eng Comput 60:2133, Table 4, https://www.ebi.ac.uk/europepmc/webservices/rest/PMC9293810/fullTextXML].
- **The hip's rotation, passive:** no value in living people found. A cadaver capsule is slack for about ±50° (van
  Arkel et al. 2015, J Biomech 48:3803, https://www.ebi.ac.uk/europepmc/webservices/rest/PMC4655836/fullTextXML) [S].
- **The bent knee's axial rotation:** 47.5 N·m/rad passive, men, knee at 60° (ISB 2005 abstract,
  https://media.isbweb.org/images/conf/2005/abstracts/0667.pdf) [S]; 9 N·m/rad relaxed to 146 co-contracted (Louie and
  Mote 1987, J Biomech 20:281, abstract, https://www.bisp-surf.de/Record/PU198706030393) [S].
- **The lower leg and foot:** 4.9 N·m/rad and 2.25 N·m·s/rad, relaxed, unloaded (Ficanha et al. 2015, Front Bioeng
  Biotechnol 3:198, https://www.frontiersin.org/journals/bioengineering-and-biotechnology/articles/10.3389/fbioe.2015.00198/full) [S].
  Damping elsewhere: not found.
- **What the model uses** [I]: each leg is the hip, knee and foot in series; the two legs work in parallel; the trunk
  sits in series above them. Relaxed, this gives about 5–10 N·m/rad. Co-contraction raises the knee 16-fold. The
  nominal twist's own (undelayed) stiffness is 20 N·m/rad (about the trunk's own value) and its damping 3 N·m·s/rad;
  the rider's bracing may pick 5–150 N·m/rad and 1–15 N·m·s/rad (the `BRACE` searches).
- **Strength:** hip internal rotation 0.72 and external 0.66 N·m/kg (McNabb et al. 2024, PLoS One 19:e0308956,
  https://www.ebi.ac.uk/europepmc/webservices/rest/PMC11329127/fullTextXML) [S]: 53 and 48 N·m per leg at 73 kg. In a
  twist one hip turns in and the other out, so **about 100 N·m** for both [I]. The trunk's rotation: 69 N·m, seated
  [S, 2nd]. The feet's grip for two feet 0.63 m apart pushing opposite ways: 0.9 × 716 N × 0.315 m ≈ 200 N·m [R, I].
  So the hips are the limit.
- **Range:** hips in 29–36°, out 36–45° (Simoneau et al. 1998, JOSPT 28:158 [S, 2nd]; Hogg et al. 2018, J Athl Train
  53:560 [S]); the bent knee about 18–20° at 4 N·m (Lorenz et al. 2015, BMC Musculoskelet Disord 16:373) [S]; the trunk
  25° (T1 against L1) to 56° (Fujii et al. 2007, Eur Spine J 16:1867) [S, 2nd]. The pelvis against the feet:
  about 30° + 20° = **50° (0.87 rad)** [I]; the shoulders add the trunk's.
- **The feet's free moment:** 8–16 N·m per foot in running (Holden and Cavanagh 1991, via Almosnino et al. 2009)
  [S, 2nd]. That is one foot; the two-foot couple is far larger.
- **The delay:** no axial value found; trunk responses 50–64 ms [S, 2nd]. The brief's 0.1 s is used.
- **Bicycles:** Moore 2012, PhD thesis, UC Davis (https://moorepants.github.io/dissertation/control.html) [S, read by
  the helper]: steering with the roll rate stabilises below the weave speed; roll-angle feedback above the capsize
  speed; the identified rider's loops are nested (steer, roll rate, roll angle, heading), and **the gains rise roughly
  linearly with speed**. Schwab, Meijaard and Kooijman 2012, Vehicle Syst Dyn 50:1209: **only the abstract** (the
  full text refused: TU Delft, Taylor & Francis 403): the bicycle is controllable by steer torque or by the upper
  body's lean, and steer torque is much easier.

## 4. The model with the twist (item 3)

**What changed** [R] (`rollModel.ts`: `TwistPlant`, `TwistGains`, `twistRows`, `humanTwistLoop`, `humanTwistModes`,
`humanTwistKick`):
- 3.2b's `YawPlant`, with `riderYawInertia` now the board's share. The upper body is a second yaw body.
- The twist θ_t is the upper body's yaw less the board's. The legs put τ_b = τ_a + k θ_t + c θ̇_t on the board and −τ_b
  on the upper body: the active twist and the legs' own stiffness and damping. A limb's force with its reaction.
- τ_b enters the board's yaw before the feet's acceleration, so the body's bank feels the turn it makes.
- The human loop has two commands, each delayed 0.1 s (a Padé) and lagged 0.05 s: the ankle's rest, as before (now
  also optionally on the head's yaw rate), and the twist torque
  u_t = K_b θ + K_br θ̇ + K_r ω_u + K_t θ_t + K_tr θ̇_t.
  The senses: the body's bank and its rate, the head's yaw rate (the head turns with the upper body), the twist and
  its rate. Never the board's roll or slip.

**Checks** [M] (`twist.probe.ts` PART=check, `results/twist-check.jsonl`; 3.2's gains, no twist law, tall, 7 m/s):
- a stiff twist is 3.2b's rigid model: −0.266 at 0.59 Hz both (and at 5 and 9 m/s within 0.001);
- the upper body free (no stiffness): −0.253 at 0.76 Hz;
- the twist passive (20 N·m/rad, 3 N·m·s/rad): **−0.034 at 0.52 Hz**. The passive twist alone takes much of 3.2b's
  growth away at 7 and 9 m/s (9 m/s: −0.228 → −0.090), not at 5 m/s (−0.68).
- Swept (PART=passive): the best passive twist is near 20 N·m/rad and 2–5 N·m·s/rad (−0.06). Stiffer is worse; at
  400 N·m/rad it is 3.2b's.
- The time runs with the exact delay (`humanTwistKick`) agree with the Padé modes in sign (`twist-kick.jsonl`).
- Tests: `humanBalance.test.ts` (the stiff limit, the twist's equal and opposite moments, time against modes).

## 5. The upper bound (item 4)

`twist.probe.ts` PART=lqr, `results/twist-lqr.jsonl`. Full state, no delay. Each plant gets its own gains: the best
over Bryson weights (ρ 10⁻⁴ to 10⁴, the bank's weight ×1, 10, 100). The efforts must stay within the limits for the
bars' kick and for a 20 N·s shove of the body: the ankle 72 N·m (the centre of pressure 9 cm off), the twist 100 N·m
and 0.87 rad. The worst over tall and Compress and the board's roll inertia 0.03 and 0.3 [M]:

| Case | No lag: 5 / 7 / 9 m/s | Lag 0.05 s: 5 / 7 / 9 m/s | Efforts used (lag) |
|---|---|---|---|
| (a0) 3.2b's rigid yaw, the ankle alone | +0.71 / +0.45 / +0.45 | +0.71 / +0.53 / +0.55 | ankle 41–60 N·m |
| (a) the twist passive, the ankle alone | +0.25 / +0.25 / +0.24 | +0.26 / +0.26 / +0.25 | ankle 40–58 N·m |
| (b) the ankle and the twist | **+0.71 / +0.79 / +0.89** | **+0.69 / +0.76 / +0.78** | ankle 11–33, twist 11–13 N·m, 0.10–0.12 rad |

- In (a) the limit is the twist's own passive mode (its damping c / 2√(k I) is 0.24–0.28), which the ankle cannot
  reach. The weave itself is damped.
- In (b) the gains (`lqrgain` rows, 7 m/s tall) push into the fall hard: 200–600 N·m per rad of bank, 30–90 per rad/s
  of bank rate, −25 to −86 per rad/s of the board's yaw rate, and they soften the twist (−23 to −35 N·m/rad).
- Keeping only what a human senses (dropping the board's roll, roll rate and slip): +0.32 to +0.60, undelayed.

## 6. A human law (item 5)

`twist.probe.ts` PART=opt (a pattern search, Hooke and Jeeves, from several starts), PART=schedule, PART=margins;
`results/twist-search.jsonl` (each row says its run), `twist-schedule.jsonl`, `twist-sens.txt`. The margins: gains
×0.75 / ×1 / ×1.33, delay 0.1 and 0.15 s, the board's roll inertia 0.03 and 0.3, tall and Compress [M]:

| Law | Where | Worst least damping |
|---|---|---|
| any of the eight gains, one law | 5, 7, 9 m/s | −0.33 (nominal only: −0.19) |
| into the fall + the bracing free | 5, 7, 9 m/s | −0.35 |
| yaw-rate damping + the bracing free | 5, 7, 9 m/s | −0.35 |
| gains linear in speed (Moore) | 5–9 m/s | −0.33 |
| one law per speed and stance | each of 5 / 7 / 9 m/s | +0.016 to +0.36 (pass) |
| that table, linear in between | 5.5–6.5 m/s | down to **−0.35** (miss) |
| one law per speed and stance | 5.5, 6, 6.5, 8 m/s | +0.14 to +0.39, but in other basins |
| one law | 7, 8, 9 m/s | **+0.015** (pass), see below |
| no twist reflex, the bracing free, per speed and stance | 7 / 9 m/s; 5 m/s | +0.30 to +0.40; **−0.05 / −0.08** |
| no twist reflex, one law | 6–9 m/s; 5–9 m/s | −0.17; −0.34 |

- **The 7–9 m/s law** (ankle 0.007, −0.021 s; twist 52 N·m per rad of bank, 8.4 per rad/s, −7.2 on the head's yaw
  rate, −15 N·m/rad on the twist, +9 on its rate) passes only because its −15 cancels most of the twist's own 20. With
  that stiffness at 10 the twist drifts (a static divergence); at 40 it grows (−0.46) (`twist-sens.txt`). The twist's
  own stiffness is the least sourced number here (no living hip value), so this law is not robust.
- **Without the reflex** the laws are plainer and hold their own case with the margins: the twist relaxed (10–15
  N·m/rad, 5–14 N·m·s/rad), the head's yaw rate resisted (−0.3 to −10 N·m·s/rad), the twist damped (+0.6 to +9), the
  ankle nearly passive (bank gain 0 to −0.1). Three of the four push gently into the fall (10–23 N·m per rad of bank,
  5–7.5 per rad/s); the fourth (7 m/s Compress) pushes the other way. In time at 7 m/s tall, the tall law's kick dies
  within a cycle (bank under 0.2°; `twist-kick.jsonl`). The same law grows at 5 m/s (−0.54), and in Compress at 7–9
  m/s it misses with the margins (−0.11 to −0.13; `twist-schedule.jsonl`).
- **5 m/s wants other gains:** a positive ankle gain on the bank (0.1–0.8) and more push into the fall. 3.2b found the
  model too pessimistic at 5 m/s (the model diverged where the game was −0.11).
- This was one round, as the brief allows. The landscape is rough (neighbouring gains flip sign), and a local search
  may miss a law; I did not find one.

## 7. What it means [I]

- **The twist is the rider's handlebar, in the model.** With it, full-state feedback damps the weave well, using
  modest torques (11–13 N·m) and small twists (6–7°). Even passive, a relaxed twist takes much of 3.2b's growth away
  at 7 and 9 m/s: the upper body works like a tuned absorber on the board's yaw.
- **The delay is still the problem**, now in a different way. The laws that work push into the fall and damp the yaw,
  as a bicycle rider does, but their gains must change with speed and stance more sharply than a smooth schedule
  allows. Moore's riders change gains with speed too, so a schedule is human; this one is not smooth enough.
- **The ankle can do more than 3.2b thought**, if it reads the yaw rate, but only undelayed.
- **Options for the advisor**, in my order:
  1. Rule whether a 7–9 m/s pass (no reflex, the twist relaxed, gains by stance) is enough to build and let the game's
     bars judge 5 m/s, where the model is least trusted. That bends item 5's gate, so it is the advisor's call.
  2. The water's small-rail yaw (levers 1 and 2), as item 7 says, if the gate stands.
  3. A better-sourced passive hip rotation stiffness: every law here leans on the twist's own stiffness.

## 8. What was not run

- **No game build**, so none of 3.2's bars, no yaw step, no pose, no merge checks (the stop rule).
- `tsc` (app and server) and `humanBalance.test.ts` were run and pass.
- The 6 and 8 m/s plants are the measured ones interpolated, not measured.
- No ride, no game page, no Basilisk case.

## Files (3.2c)

- `inertia.probe.ts`: the split (`yawSplit`; the `split` rows of `results/inertia.jsonl`; the older rows unchanged).
- `twist.probe.ts`: the model with the twist. Parts: `check`, `passive`, `lqr`, `lqrgain`, `opt` (env `CASESET`,
  `FREE`, `DIMS`, `BRACE`, `NOMINAL`, `CASE_SPEEDS`, `CASE_STANCES`, `STARTS`, `SCALES`), `schedule` (`SCHEDULE`),
  `margins` and `kick` (`LAW`, `ANKLE`, `KT`, `CT`), `map`, `percase`, `search`. Header of the file for the command.
- `lqr.ts`: a small dense LQR (the Riccati equation by the matrix sign function) for the probe.
- `results/`: `twist-check.jsonl`, `twist-lqr.jsonl`, `twist-search.jsonl`, `twist-schedule.jsonl`, `twist-kick.jsonl`,
  `twist-sens.txt`.

---

# Part 4: step 3.2d, balance by prediction (ruling 29h)

Written 2026-11-13 by the build agent (Opus 5.5, effort xhigh), on branch `claude/rider-new-32d` (from
`claude/rider-new-32c`, rebased on main 3b6d5ae9). The contract: `../ruling-29.md` 29h.

Tags as above: [M] measured by a probe here (on the model); [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **Miss at the robustness gate (item 4). Nothing was built in the game**, as the stop rule says.
- **Nominally it works well** [M]: at all 51 points (4–12 m/s every 0.5, tall, crouch and Compress) the least
  damping is at least +0.62. At 7 m/s tall a 20 N·s shove peaks at 3.1° of bank, with 8.6° of twist and 11 N·m of
  twist torque, and dies away. The schedule is smooth above 6 m/s, and the controller read between its points holds
  (+0.16 at worst).
- **It is not robust enough** [M]:
  - with the true delay at 0.15 s, it fails at 4–8 m/s (5 m/s: −0.09; 7 m/s: −0.01);
  - with all twelve derivatives scaled together by ±30 %, 1–20 % of the 200 sets drift away at 6–12 m/s, and more
    at 4.5–5.5 m/s;
  - at 4 m/s the board does not plane, and nearly every test fails.
- **Where it holds** [M]: each derivative ±30 % alone at 6–12 m/s (except 7.5 m/s Compress); all twelve together
  within **±15 %** (0 of 200 fail at 5–12 m/s, tall and Compress); the twist's own stiffness 5–60 N·m/rad at 6–12 m/s;
  the board's roll inertia 0.03–0.3 everywhere above 4 m/s.

## 2. The plants by speed (all measured)

- The roll-plant lab (`../roll-plant/plant.ts`, part `captive`, the rigid point rider) measured the twelve
  derivatives at every speed of the table: 5, 7 and 9 m/s from the roll-plant study; 4, 4.5, 5.5, 6, 6.5, 7.5, 8,
  8.5, 9.5, 10, 10.5, 11, 11.5 and 12 m/s for this step (`results/plant-speeds.jsonl`, about 17 s each) [M]. Nothing is
  extrapolated; between the table's speeds the plant is linear.
- **Below 5 m/s the board does not plane** [M]: it trims 26° at 4.5 m/s and 46° at 4 m/s, and the fins'
  weathercock turns over (N per slip +41 and +144 against −29 at 5 m/s).
- **The trims are noisy at 7.5–12 m/s** [M]: 8.8° at 7.5 between 9.2° (7) and 5.6° (8). The derivatives move with
  them (K per roll at 7.5 m/s is half its neighbours'). I kept the measurements as they are.
- The feet's forward force uses the terminal planes' drag (5, 7, 9, 12 m/s; linear between, held below 5) [I].

## 3. The controller (`src/physics/predictiveBalance.ts`)

- **The plant** [R]: 3.2c's `twistRows` (split, twist numbers, `TwistPlant` kept), with the muscles' 0.05 s lag on both
  commands. State [φ, φ̇, θ, θ̇, r, β, θ_t, ω_u, δ, τ_a].
- **The senses**, all 0.1 s late: the body's bank and its rate; the head's yaw rate; the twist and its rate; the
  ankle's own angle (θ − φ) and rate. Not the slip.
- **Every frame (1/60 s), with the commands held:**
  1. a steady Kalman filter estimates the whole state as it was 0.1 s ago, the slip included, and a slow bias on each
     command (the muscles' offset; offset-free control);
  2. a predictor runs the internal model forward over the 0.1 s with the commands already sent, to now;
  3. LQR gains act on the prediction, both channels; the estimated bias is cancelled.
  A surprise is still answered 0.1 s late.
- **The analysis is exact for the delay** [R]: the loop is discrete (the plant held over each frame, exactly), with
  the senses' delay line, the estimate and the commands' line as states. No Padé. `humanTwistKick`-style runs in
  continuous time check the worst cases (section 6).
- **The design** [R]: Bryson's scales (the state as in 3.2c; the ankle's rest 0.09 rad, the twist 30 N·m), ρ = 10;
  the filter's noises from human thresholds (recalled: about 1° and 0.5°/s for the vestibular sense, 1° for the
  legs' joints); the bias as a slow random walk (0.01 rad and 5 N·m per √s). These are the weights the round chose.
- **The player's lean asked for** would enter as a reference, as in 3.2. It is not built, because the gate missed.
- Tests: `predictiveBalance.test.ts` (an exact discretisation; the nominal loop keeps the gains' own modes, the
  separation principle with the predictor exact).

## 4. The schedule (`results/predict-design.jsonl`, PART=between)

The gains on the predicted state, tall / Compress [M]:

| Speed | Ankle per bank | Twist per bank (N·m/rad) | Twist per bank rate | Twist per board yaw rate | Twist per twist |
|---|---|---|---|---|---|
| 4 m/s | −3.9 / −3.7 | +72 / −344 | 158 / 95 | −147 / −178 | −60 / −74 |
| 5 m/s | −2.0 / −1.9 | +335 / +53 | 84 / 47 | −92 / −100 | −42 / −54 |
| 6 m/s | −0.90 / −1.33 | +478 / +322 | 78 / 44 | −66 / −56 | −27 / −19 |
| 7 m/s | −0.96 / −1.13 | +456 / +344 | 66 / 39 | −66 / −54 | −27 / −19 |
| 9 m/s | −0.89 / −0.89 | +430 / +337 | 56 / 33 | −61 / −50 | −26 / −18 |
| 12 m/s | −0.85 / −0.66 | +391 / +302 | 47 / 28 | −55 / −47 | −24 / −18 |

- The law is the bicycle rider's: the twist steers into the fall (on the bank and its rate), damps the board's
  yaw, and lets the twist go a little (a negative twist gain softens the twist's own 20 N·m/rad).
- Above 6 m/s every gain changes smoothly with speed and stance. Below 5.5 m/s the gains change fast, and the
  Compress twist gain changes sign, because the plant stops planing.
- **Read between its points** (the four nearest designs blended, on the plant at the point; 4–12 m/s every 0.25,
  five depths): the least damping is +0.163 at worst (4.25 m/s, Compress) [M]. So the schedule is connected.

## 5. The gate (`results/predict-gate.jsonl`; 51 points)

| Test | Passes | Worst | What drives it |
|---|---|---|---|
| Nominal ≥ +0.05 | 51 of 51 | +0.62 | the least damped modes are the discrete ones near 30 Hz |
| True delay 0.15 s (model 0.1) | 27 of 51 | −0.55 (4 m/s Compress); 5 m/s −0.09; 7 m/s −0.01 | a 6.7–7.3 Hz ringing of the fast loop at 4–8 m/s; holds at 8.5–12 |
| Each derivative ×0.7 and ×1.3 alone | 41 of 51 | −1 | 4–5.5 m/s (K per roll, N per roll) and 7.5 m/s Compress (Y per roll ×0.7) |
| 200 random sets, ±30 % together | 0 of 51 | −1 | 2–41 sets of 200 at 6–12 m/s; 21–67 at 4.5–5.5; 123–194 at 4 |
| The twist's own stiffness 5–60 | 44 of 51 | −1 | 4–5.5 m/s, at 40–60 N·m/rad |
| The board's roll inertia 0.03–0.3 | 50 of 51 | −0.04 | 4 m/s |

- **The random sets** [M]: the sets that fail drift slowly (growth 0.15–0.86 per second at 7 m/s tall). Against the
  passing sets, they have the rail's forces weaker together (N, Y and K per roll about ×0.82–0.87), the fins' side
  force per slip weaker (×0.80) and their yaw per slip stronger (×1.16): the board turns less per degree of rail and
  slips more. The same gains on the true state hold these plants; so does the filter with one frame of delay. They
  fail when the internal model predicts over 3 frames or more (ρ 100) or 6 or more (ρ 1). It is the wrong model's
  prediction over the delay, not the gains.
- **The spread** (`results/predict-spread.jsonl`, 5–12 m/s, tall and Compress): ±10 % and ±15 % together, 0 of 200
  fail (worst +0.03 at 12 m/s tall); ±20 %, 0–4 of 200 fail.

## 6. In time, the delay exact (`results/predict-time.jsonl`; a 0.5 rad/s kick, a 20 N·s shove, 4 s)

| Case | Modes | Kick | Shove |
|---|---|---|---|
| 7 m/s tall, nominal | +0.64 | dies (end/start 0.006) | bank 3.1°, twist 8.6°, 11 N·m; dies |
| 7 m/s tall, true delay 0.15 s | −0.009 at 6.7 Hz | dies (0.66) | bank 4.0°, twist 13°, 28 N·m; dies (0.38) |
| 5 m/s tall, true delay 0.15 s | −0.092 | grows (bank 30°) | falls at 2.8 s |
| 7 m/s tall, worst random set | −1 | slow drift (1.004) | twist 58° (past the 50° range), grows |
| 9 m/s tall, the same set | −1 | grows | falls at 3.9 s |
| 12 m/s Compress, the same set | −1 | grows | bank 24°, the ankle 84 N·m (past 72) |
| 5.5 m/s tall, twist stiffness 60 | −0.13 | grows | bank 11.5°, grows |

The time runs agree with the modes: the passes and misses are real, not the analysis's.

## 7. The weights' round (`results/predict-weights.jsonl`)

| Tried | Effect |
|---|---|
| ρ 0.3 to 10⁴ | higher gains hold the random sets better and the 0.15 s delay worse; no ρ passes both |
| the bank's weight ×1 to ×100 | helps the heel pair a little at ρ 10; not the gate |
| the filter's process noise ×0.3 to ×10, per state | no effect on the random sets |
| the commands' bias (none to 0.3 rad and 50 N·m per √s) | fixes the twist stiffness test at 12 m/s; worsens the delay |
| the ankle's penalty ×1 to ×81 | no help |
| the twist's penalty 100 to 3 N·m | 30 N·m and ρ 10–100 hold the 0.15 s delay at 7 m/s (+0.10 at ρ 100); the random sets still fail |

## 8. What it means [I]

- **Prediction works as the literature says, on a true model.** The nominal loop has the undelayed loop's modes,
  small efforts, human reactions and a smooth schedule.
- **Its weakness is the model.** A predictor on an unstable plant (the body's lean grows at about 4 per second on its
  own) multiplies the model's error over the delay. A fixed internal model holds ±15 % errors in all derivatives
  together, but not ±30 %. The weakest point is the rail's turn per degree, as in 3.2b: about the board's own centre
  the heel's yaw moment is a small difference of two large numbers (105 − 97 N·m/rad at 7 m/s). Its sign changes in
  40 % of the random sets.
- **The 0.15 s delay error** is a fast ringing that softer twist gains remove. The softer gains then hold the model
  errors less well. This round did not find a design that holds both.
- **Below 5 m/s the board does not plane.** The ±30 % tests there are tests of a different hull state.
- **Options for the advisor**, in my order:
  1. The plant: levers 1 and 2 (the rail's yaw and side force about the board's centre, the drag line), as item 6
     says. Pinning those numbers is what would narrow the error the controller must carry.
  2. Rule whether the gate's ±30 % joint error is the right test for a measured plant. At ±15 % it passes at
     5–12 m/s, and the 0.15 s delay would then be the last miss (fails at ≤ 8 m/s).
  3. An internal model that adapts slowly, as humans' do (recalled: Shadmehr and Mussa-Ivaldi 1994; Wolpert,
     Ghahramani and Jordan 1995). That is a new step, not a weight.
  4. Treat 4–4.5 m/s (not planing) apart, or drop it from the gate.

## 9. What was not run

- **No game build**, so none of 3.2's bars, no yaw step, no pose, no merge checks (the stop rule).
- `tsc` (app and server) and the model tests (`rollModel`, `humanBalance`, `predictiveBalance`: 29) pass.
- The reference input (the lean asked for) was not built.
- No ride, no game page, no Basilisk case.

## Files (3.2d)

- `src/physics/predictiveBalance.ts`: the measured plant table, `plantAt`, the controller's design (`design`: ZOH,
  DLQR and Kalman by doubling, the predictor's terms), the exact closed loop (`closedLoop`) and `leastDamping`.
  `rollModel.ts`: `eigenvalues` takes `{ balance, maxIterations }` (defaults as before).
- `predict.probe.ts`: parts `design`, `gate`, `between`, `time`, and the round's `tune`, `pair`, `horizon`, `diag`
  (the file's header has the command and the env).
- `results/`: `plant-speeds.jsonl` (the lab at 14 more speeds), `predict-design.jsonl`, `predict-gate.jsonl`,
  `predict-spread.jsonl`, `predict-time.jsonl`, `predict-weights.jsonl`.

---

# Part 5: step 3.2e, balance by prediction in the game (ruling 29i)

Written 2026-11-13 by the build agent (Opus 5.5, effort xhigh), on branch `claude/rider-new-32e` (from
`claude/rider-new-32d`, rebased on main 7ae69c18). The contract: `../ruling-29.md` 29i, items 1–6.

Tags as above: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **Miss.** Built in the game behind `?rider=new`; the old rider is byte-identical (N0). The model gate passes. In the
  game the controller works as the model says for small upsets, but several bars miss, so no merge checks were run.
- **The model gate passes** [M]: with the true delay one frame off (0.083 and 0.117 s against the 0.1 s predictor), the
  least damping is at least **+0.029** at 5–12 m/s, all three stances (worst 5.5 m/s Compress, 0.083 s).
- **Model and game agree on a shove** [M]: 20 N·s at 7 m/s tall peaks at 2.9° of bank, 9.4° of twist and 11.9 N·m of
  twist torque in the game; the model says 3.1°, 9.1° and 12.5 N·m. It dies away in both.
- **Passes:** N0; reaction 0.103–0.105 s; plane glides 4 of 4; Mode A not seen; N1; push saves are large again
  (138–175 N·s, 3.2b had 5–21).
- **Misses:** Mode B (damping +0.03 / +0.02 / +0.06 at 5 / 7 / 9 m/s; decay per cycle 0.54 / 1.62 / 0.55); the push
  order (Compress > crouch > tall); the save window (too long); chop 4 of 12 (pitch falls); the held carves (0.30 /
  0.68 s); the turn pair (0 of 16); N2 (+3.25 m/s, unchanged).
- **Three things found on the way** [M]:
  1. The board's roll inertia, as the game's solve meets it (the water's added mass), is **0.55–1.4 kg·m²**, not the
     model's 0.1. The internal model now uses the game's own value (ruling 29i says it should).
  2. The old rider's heading hold (`holdLine`), used as a reference, rang with the board's yaw and grew. Left out.
  3. `COMPRESS_PULL` and `CARVE_CARRY` were still on for the new rider (only `LEAN_OUT_PULL` was off). Now off.

## 2. The model checks (item 1)

**(a) A frame of timing error** (`predict.probe.ts` PART=timing; `results/predict-timing-32e.jsonl`) [M]. The true
delay 5 and 7 frames, the predictor 6:

| Speed | 0.083 s (tall / crouch / Compress) | 0.117 s (tall / crouch / Compress) |
|---|---|---|
| 5 m/s | +0.036 / +0.036 / +0.036 | +0.066 / +0.064 / +0.067 |
| 6 m/s | +0.095 / +0.086 / +0.088 | +0.111 / +0.103 / +0.101 |
| 7 m/s | +0.144 / +0.148 / +0.159 | +0.148 / +0.150 / +0.145 |
| 9 m/s | +0.175 / +0.186 / +0.205 | +0.168 / +0.176 / +0.187 |
| 12 m/s | +0.188 / +0.197 / +0.206 | +0.168 / +0.176 / +0.185 |

- Worst +0.029 at 5.5 m/s Compress (0.083 s, 5.1 Hz). **Pass.** A delay shorter than the model's is the harder one, at
  5–5.5 m/s.
- These use the game's board inertia (section 3). With 3.2d's 0.1 kg·m² the worst was +0.042 (5.5 m/s crouch).

**(b) Errors by contributor** (PART=contrib; `results/predict-contrib-32e.jsonl`; report only) [M]. The roll-plant
ledger (`../roll-plant/results/plant-point.jsonl`) splits each of the twelve derivatives by contributor. Each
contributor's part is scaled; the rest of the derivative is kept. Least damping, tall / Compress:

| Speed | Pressure ×0.7 | Pressure ×1.3 | Fins ×0.7 | Fins ×1.3 | Friction ×0.7 / ×1.3 | Feet ×0.7 / ×1.3 | All 16 together |
|---|---|---|---|---|---|---|---|
| 5 m/s | −0.06 / −0.37 | +0.18 / +0.15 | +0.11 / +0.08 | +0.25 / +0.24 | ≥ +0.36 | ≥ +0.32 | 11 / 12 of 16 fail |
| 7 m/s | −1 / −1 | +0.36 / +0.36 | +0.33 / +0.27 | +0.31 / +0.27 | ≥ +0.38 | ≥ +0.32 | 8 of 16 fail |
| 9 m/s | −1 / −1 | +0.29 / +0.31 | +0.34 / +0.32 | +0.36 / +0.30 | ≥ +0.40 | ≥ +0.33 | 8 of 16 fail |

- Only the hull's pressure ×0.7 fails alone (−1: a slow divergence). At 7 and 9 m/s 8 of the 16 sets fail, as many as
  have pressure ×0.7.
- At 9 m/s it is the heel's side force per roll alone (Y per roll ×0.52). Its pressure part is 1.6 times the whole:
  it is the hull's lift tilted with the board (W φ), which the ledger also showed (roll-plant 3.3) [M].
- **My reading** [I]: the hull's lift must carry the weight. A pressure ×0.7 is a board that does not carry its
  rider, so it is not a plant the game can have. Fins, friction and the feet's force ±30 % are held everywhere.
- At 5 m/s fins ×0.7 with pressure ×1.3 also fail together.

## 3. The board's inertia in the model (found while building)

- The 3.2d model took the board's roll inertia as 0.1 kg·m² (the gate tested 0.03–0.3). The game's own (0.026) is
  smaller. But the solve meets the hull's added mass too.
- **Measured** (`e32.probe.ts` PART=inertia, `results/e32-inertia-32e.jsonl`) [M]: the board's 6 × 6 system, projected
  on its roll and yaw axes, after a steady glide, before the rider's terms:

| Speed | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 m/s |
|---|---|---|---|---|---|---|---|---|---|
| Roll, kg·m² | 1.40 | 1.07 | 1.06 | 0.93 | 0.74 | 0.77 | 0.73 | 0.60 | 0.55 |
| Yaw, kg·m² | 0.70 | 0.56 | 0.56 | 0.55 | 0.57 | 0.56 | 0.58 | 0.59 | 0.60 |

- Crouch and Compress are within 0.15 of these above 4.5 m/s. The implicit damping times the substep is about 0.01.
- `predictiveBalance.ts` `BOARD_INERTIA` holds this table; `plantAt` uses it by default. 3.2d's numbers used 0.1 and
  0.449 (pass `rollInertia`, `yawInertia` to rerun them).
- **Its effect in the model** (PART=inertia, `results/predict-inertia-32e.jsonl`) [M]: 3.2d's design on the game's
  inertia still holds (+0.08 to +0.32), but less; a design on it gets +0.45 to +0.69.
- In the game (the kicks), the internal model with the game's inertia matched the game's response better: the kick's
  bank peak at 7 m/s 0.29° in the game, 0.15° in the model (0.02° with 0.1).

## 4. What was built (item 2; all under `rider: 'new'` and standing free)

**The twist as a body degree of freedom** (`AttachedRider.coupleYaw`, `finish`) [R]:
- The board's share of the rider's yaw inertia (`stanceAt`'s `lower`: 1.37 / 1.37 / 1.24 kg·m²) turns rigidly with the
  board, as 3.2b's whole did.
- The upper body's share (`upper`: 1.44 / 1.68 / 1.96, +0.87 with the arms out) turns on the twist θ_t. The legs put
  τ_b = τ_a + k θ_t + c θ̇_t on the board and −τ_b on the upper body (k 20 N·m/rad, c 3 N·m·s/rad; past 0.87 rad an end
  stop, 2000 N·m/rad, not sourced).
- In the solve: backward Euler, the upper body's spin eliminated. The board meets β n nᵀ, β = I_U α / (I_U + α), α =
  h (k h + c), and a right-hand side. `finish` moves the twist on. No force but the legs', with its reaction.
- The active torque τ_a comes from the controller through the muscles' 0.05 s lag, within 100 N·m and the feet's grip
  (0.9 × the leg's load × 0.315 m).
- This replaces 3.2b's rigid whole-body coupling and the old twist rotor (`TWIST_INERTIA`, `twistStep`) under
  `rider=new`. The pad's rotation and Snap's aim become the twist's reference.
- The legs' twist work is booked in the power ledger (both sides) and in the power window's check.

**The controller** (`predictiveBalance.ts` `PredictiveController`, `AttachedRider.predictiveBank`) [R]:
- 3.2d's design, unchanged in form: the steady Kalman filter, the predictor over 6 frames with the commands sent, the
  DLQR gains, the commands' bias. The table (4–12 m/s every 0.5, three stances) is designed lazily, once per page
  (about 7 ms a point), and read between its points as 3.2d's `between` did (four designs blended).
- It runs on its own clock: one tick per 1/60 s of simulated time, the commands held between, whatever the substeps.
- The senses (all 0.1 s late through the filter's line, never the slip): the body's bank; its rate, as the canals
  sense it (the body's own angular rate: its rate on the board plus the board's roll rate); the head's yaw rate (the
  upper body's spin); the twist and its rate; the ankle's angle and rate. 3.2's bank rate was the bank's change over a
  substep: right after a shove it lagged one frame, and the reaction was 0.122 s. With the canals' rate it is 0.104 s.
- The signs: the model's axes are x forward, y right; the game's +x is the board's left. Every angle and moment is
  turned over.
- The ankle's command goes through the feet's reach and the rail's bite as 3.2's did; the hip across takes what the
  command asks past 80 % of the reach. The predictor is fed what the ankle was sent.
- **A runtime test** (`predictiveBalance.test.ts`): on the model's own plant the class gives the analysis's loop
  (`closedLoop`) to 1e-9 over 120 ticks, and holds the plant's steady turn between the table's points.

**The reference** (item 2, the lean asked for) [R, M]:
- The lean the player asks (the steer, the hand's bend), eased as the old bank reference (0.05 s, at most 5 rad/s),
  enters as the plant's own steady turn: (Φ − I) x + Γ u = 0 with the bank and the twist set and the rates nothing,
  from the blended model. The LQR acts on the error: u = u_ref − K (x̂ − x_ref) − b̂.
- **The line held on its own is left out.** The old rider's `holdLine` (a heading loop: a lean against the heading's
  error and the yaw rate) is part of the old bank reference. As a reference it made the yaw ring and grow: the kick at
  7 m/s grew (late over early 2.8; damping −0.11), at 5 m/s the twist reached 47°. Without it the kicks die
  (`results/rounds-32e.txt`, HOLDREF; measured before the inertia fix of section 3). So the new rider does not hold a line by itself; the player steers.

**The pose** [R]: the drawn twist is the twist body's angle. With `?rider=new`, `RIG_SWITCHES.twistHips` turns the
hips by the whole twist, as the chest (the old rig turned them by 0.35 of it): the twist is the pelvis's too.

**The pulls** [R]: `compressAssist` now returns at once for the new rider, so `COMPRESS_PULL` and `CARVE_CARRY` are off
as ruling 29 decided. In 3.2–3.2d they were still on (only `LEAN_OUT_PULL` was off).

## 5. Model against game (item 3; `e32.probe.ts` PART=compare, `results/e32-compare-32e.jsonl`) [M]

From the bars' steady start, 4 s. Peaks are from the start's own values.

| Case | Bank peak (game / model) | Twist peak | Twist torque peak | Ankle peak | Yaw mode (game / model) |
|---|---|---|---|---|---|
| Shove 20 N·s, 7 m/s tall | 2.94° / 3.14° | 9.4° / 9.1° | 11.9 / 12.5 N·m | 11.3 / 14.6 N·m | 1.26 Hz, +0.19 / dies before a cycle |
| Kick 0.5 rad/s, 5 m/s | 0.20° / 0.58° | 0.9° / 5.2° | 1.6 / 3.7 N·m | 8.4 / 12.3 N·m | 2.9 Hz, +0.02 / dies |
| Kick, 7 m/s | 0.29° / 0.15° | 1.0° / 0.4° | 1.4 / 0.7 N·m | 7.4 / 11.5 N·m | 2.5 Hz, +0.06 / 2.1 Hz, +0.20 |
| Kick, 9 m/s | 0.15° / 0.10° | 0.3° / 0.2° | 1.2 / 0.4 N·m | 4.8 / 8.9 N·m | 1.3 Hz, +0.08 / 2.1 Hz, +0.24 |

- The shove agrees within 7 % in its peaks. Its decay does not: the game's bank over its last second is 0.19 of its
  first; the model's is 0.
- The kick is small in both (the ankle takes it). The game rings longer, at 2.5–2.9 Hz, more lightly damped.
- **My reading** [I]: the shove's agreement says the build is the model (signs, inertias, the twist, the clock). The
  rest is the plant: the game has a pitch loop, a hip, a free body on a leg and a hull that the 12 derivatives only
  approximate.

## 6. The bars (item 4; steady starts, 16 substeps)

Results: `results/bars-new-32e.jsonl`, `bars31-new-32e.jsonl`, `turnpair-B-new-32e.txt`, `yawstep-32e.jsonl`. The old
rider's rows are `bars-old.jsonl` (unchanged).

| Bar | Old | 3.2b | 3.2e | Pass? |
|---|---|---|---|---|
| N0: `rider=old` byte-identical | — | yes | 3.2's `bars-old` and 3.1's `bars-old` the same bytes | yes |
| Mode B: damping ≥ 0.05 (5 / 7 / 9 m/s) | −0.015 / +0.079 / +0.103 | −0.166 / −0.237 / −0.194 | +0.030 / +0.018 / +0.058 (3.4 / 2.2 / 1.5 Hz) | no |
| Mode B: roll decay per cycle ≤ the old's | 1.42 / 0.35 / 0.46 | 4.90 / 3.46 / 18.1 | 0.54 / 1.62 / 0.55 | no (5 m/s yes) |
| Mode A not seen (12–17 Hz share) | 0.000–0.007 | 0.000 | 0.000–0.009 | yes |
| Push recovery, 7 m/s: tall > crouch > Compress, not tiny | 192 / 188 / 191 N·s | 21 / 11 / 5 | 138 / 155 / 170–175 | no: the order is reversed |
| Reaction 0.08–0.12 s | 0.001 s | 0.107–0.110 | 0.103–0.105 | yes |
| Save window: tall 0.25–0.35 s, Compress 0.15–0.25 s | — | 1.47–1.53 / 0.69–0.71 | 0.85 / 0.28–0.33 (hard shoves 0.20 / 0.14) | no |
| Glides on the plane, 3 s | 4 of 4 | 4 of 4 | 4 of 4 | yes |
| Glides on chop ≥ 11 of 12 | 11 of 12 | 0 of 12 | 4 of 12 | no |
| Held carve standing ≥ 2.28 s | 1.93 s | 0.48 s | 0.30 s | no |
| Held carve Compress ≥ 2.30 s | 3.0 s | 1.27 s | 0.68 s | no |
| Turn pair set B ≥ 12 of 16 | 14 of 16 | 0 of 16 | 0 of 16 | no |
| N1: legs < ~2 kW per frame, ≤ 1.46 kW over 0.5 s | to 30.9 kW | 0.55 / 0.27 kW | 0.55 / 0.26 kW | yes |
| N2: 20° from 4 m/s, gain ≥ 3.5 m/s | +1.7 | +3.25 | +3.25 | no |
| (report) 20 cm rise at 2 / 4 m/s | falls | falls 0.42 s | falls 0.42 / 0.40 s (1 m/s holds) | — |
| (report) N4 placed straight down and up | 2 of 12 | 12 of 12 | 12 of 12, the board to 1.8 g | — |
| (report) the 45° line placed | 3 of 6 | 4 of 6 | 4 of 6 | — |

Notes [M, I]:
- **Mode B:** the kick is taken at once by the ankle; what is left is small (yaw rate peaks 0.03 rad/s) and dies in
  about 0.8 s, but the bar's fit reads its last small wiggles. It rings at 2–3.5 Hz, which 3.2b did not show.
- **The push order** is the capture point's: a lower stance has a higher ω₀, so a given shove puts the capture point
  less far out (as 3.2 found). ρ 1 reverses it to the bar's order (134 / 84 / 53 N·s) but cuts crouch and Compress
  and the carves (section 7).
- **The save window** is still the time for the weight to drift out after the capture point leaves the feet. The fall
  test is 3.2's.
- **Chop** falls are pitch falls, mostly while settling on chop 2 and 3 at every speed (the pitch ankle 15° forward,
  the capture point 0.7 m along). 3.2 and 3.2b fell there too. The roll controller does not reach them.
- **Held carves and the turn pair** fall early, at 10–27° of bank (0.3–0.7 s): the lean asked reaches 44° in 0.15 s
  and 49° in 0.25 s, the LQR counter-steers hard (the board turns the wrong way at up to 0.87 rad/s, the twist torque
  32 N·m), and the feet run out from under the body (`trace` with STEER=1). The plant table is about riding straight; at 40–50° of rail the hull is far
  from its 12 derivatives. Section 7 has two reference levers that change this; I did not adopt them.
- **N2** is a straight drop; the number is 3.2b's to the last digit. It is the pitch and the hull's drag, not the roll.

**The yaw step (report;** `yawstep.probe.ts`, `results/yawstep-32e.jsonl`) [M]. Time to 63 % of the first peak, 5 / 7 /
9 m/s: nominal (k 20) 0.064 / 0.061 / 0.057 s; braced (k 150, c 15) 0.058 / 0.057 / 0.053 s; relaxed (k 5, c 1) 0.067 /
0.064 / 0.059 s. 3.2b: 0.145 / 0.122 / 0.095 s. The board now meets its own 0.55 kg·m², the lower share 1.37 and a
little of the upper body's through the twist (2.2 kg·m² in the first 10 ms; 3.2b 3.6). The first peak comes at
0.134–0.139 s, when the balance answers.

## 7. The tuning rounds (item 5; `results/rounds-32e.txt`)

Each candidate on the kicks, the carves, the push and the glides [M]:

| Round | Weights | Kick damping 5 / 7 / 9 | Decay 5 / 7 / 9 | Carves | Push tall / crouch / Compress | Chop |
|---|---|---|---|---|---|---|
| — | 3.2d's (kept) | 0.030 / 0.018 / 0.058 | 0.54 / 1.62 / 0.55 | 0.30 / 0.68 | 138 / 155 / 170 | 4 |
| 1 | ρ 1 | 0.030 / 0.028 / 0.070 | 0.59 / 0.97 / 0.34 | 0.25 / 0.27 | 134 / 84 / 53 | 5 |
| 1 | ρ 100 | 0.010 / 0.046 / −0.036 | 0.91 / 1.63 / 0.71 | 0.87 / 0.77 | 107 / 121 / 160 | 2 |
| 1 | process noise ×3 / ×0.3 | 0.033 / 0.034 / 0.041; 0.008 / 0.013 / 0.043 | 0.50 / 1.28 / 0.77; 0.79 / 0.20 / 0.49 | 0.30 / 0.68 | as kept | 2; 4 |
| 1 | sense noise ×0.5 | 0.033 / 0.033 / 0.030 | 0.53 / 1.21 / 0.97 | 0.30 / 0.68 | as kept | 1 |
| 2 | ρ 3 | 0.037 / 0.033 / 0.051 | 0.57 / 1.22 / 0.43 | 0.27 / 0.58 | 139 / 150 / 99 | 5 |
| 2 | yaw-rate weight ×4 | 0.031 / 0.024 / 0.091 | 0.34 / 0.50 / 0.49 | 0.33 / 0.70 | 141 / 154 / 170 | 5 |
| 2 | ρ 3 and yaw rate ×4 | 0.038 / 0.038 / 0.085 | 0.48 / 0.70 / 4.84 | 0.28 / 0.62 | 139 / 156 / 161 | 6 |
| 2 | bank weight ×4 | 0.039 / 0.047 / 0.083 | 0.57 / 0.88 / 0.58 | 0.23 / 0.25 | 145 / 160 / 175 | 5 |
| 2 | ρ 1 and yaw rate ×4 | 0.039 / 0.035 / 0.087 | 0.37 / 0.78 / 0.71 | 0.27 / 0.23 | 133 / 74 / 133 | 6 |

- No weights pass Mode B at 5 m/s (best +0.039) or its decay at 7 m/s (best 0.20, with chop 4). The kept weights are
  3.2d's: no round was better on every bar, and the model gate was checked with them.
- **Not tuning, two levers on the reference, measured and not adopted** (they change what ruling 29i fixed):
  - the lean asked's pace (`balance.leanRate`): at 1 rad/s the carves hold 1.23 / 1.30 s; at 0.5 rad/s 2.08 / 2.03 s;
  - the steady turn that balances the lean (`balance.turn: 'tan'`: the linear bank is the lean's tangent in the body's
    balance; at 49° the linear model's turn is 0.78 rad/s where a lean that size needs about 1.5): with 0.5 rad/s the
    carves hold **2.38 / 2.58 s** (both bars pass), with 1 rad/s 1.43 / 1.60 s. The falls still come into the turn at the
    end (bank 60–70°).
  - On the turn pair neither lever helps: 0 of 16 (with 'tan' at 0.5 rad/s, 4 of 16 come out of the bottom turn and
    fall climbing).
- **Tried and reverted:** the senses on a face taken from the water's surface (the rail for the board's roll, the
  ankle's rest from the board so laid). Chop fell to 0 of 12 (the chop's own slope came in as noise) and the turn pair
  stayed at 0 of 16.
- **The stop rule's identification was not run.** The game does not drift as the model's failing sets did: the plane
  glides hold, the kicks die, and the shove matches the model within 7 %. The misses are of other kinds (pitch on
  chop, the big lean of a carve, the fall test). I measured the one plant number that was wrong instead (section 3).

## 8. What it means [I]

- **Prediction works in the game for small upsets.** The shove is the model's, and the reaction is a human's.
- **The board's roll inertia was the model's biggest error,** and it was the game's own value, so it is now in.
- **What is left is outside the controller's design:**
  1. **Big leans.** The table is the plant about riding straight. A held carve asks 44° in 0.15 s. The next step could
     be a plant table about turning (the roll-plant lab at held rails of 10–40°), or a reference that a delayed body
     can follow (the lean's pace, the turn that balances it). That is the advisor's call.
  2. **Pitch on chop.** The pitch ankle (3.1c) falls over the nose on chop 2 and 3 while settling. It is not this step's
     loop.
  3. **The fall test** sets the save window and the push order; it is 3.2's capture point test.
  4. **The heading.** With the heading hold left out, nothing keeps a line but the player.
- Options for the advisor, in my order:
  1. A turning plant (the lab with the rail held at 10–40°) and the reference from it, then the carves and the pair again.
  2. Rule on the reference's pace and the balancing turn (both measured above).
  3. The pitch loop on chop, as its own step.

## 9. What was not run

- **The merge checks** (the full suite, the Canyon byte check, the fps trace): the bars miss. Run here: `tsc` (app and
  server), `predictiveBalance.test.ts`, `humanBalance.test.ts`, `standingBody.test.ts`, `rollModel.test.ts` (36 tests).
- The closed-loop identification of the game's plant (section 7).
- B-wall's long run. No ride, no game page, no Basilisk case.
- `standingBody.test.ts`'s 3.2b test now checks the lower share (1.24–1.5 kg·m² met per substep; the couple's answer
  about 2 times slower than the point mass's, was 2.5).

## Files (3.2e)

- `src/physics/predictiveBalance.ts`: `BOARD_INERTIA`, `boardInertiaAt` (`plantAt`'s default now), `plantAt`'s
  `feetScale` and `yawInertia`, `scheduledDesign`, `steadyTurn`, `PredictiveController` (the runtime controller).
- `src/physics/AttachedRider.ts`: the twist body (`twistBody`, `coupleYaw`, `finish`), `predictiveBank`, the reference
  (`leanAsked`), the pulls off for the new rider, the probe-only option `balance` (`weights`, `leanRate`, `turn`,
  `rateSense`, `twist`). `src/scene/rig/`: `RIG_SWITCHES.twistHips`; `src/game/PhysicalMode.ts` sets it with
  `?rider=new`.
- `../../board-in-water/lab.ts`: `BALANCE={...}` (JSON) for the option.
- `predict.probe.ts`: parts `timing`, `contrib`, `inertia`. `e32.probe.ts`: parts `trace`, `compare`, `inertia` (its
  header has the env).
- `results/`: `predict-timing-32e.jsonl`, `predict-contrib-32e.jsonl`, `predict-inertia-32e.jsonl`,
  `e32-inertia-32e.jsonl`, `e32-compare-32e.jsonl`, `bars-new-32e.jsonl`, `bars31-new-32e.jsonl`, `yawstep-32e.jsonl`,
  `turnpair-B-new-32e.txt`, `rounds-32e.txt`.

---

# Part 6: step 3.2f, the carve (ruling 29j)

Written 2026-11-13 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32f` (from
`claude/rider-new-32e`, rebased on main 5d1a8c13). The contract: `../ruling-29.md` 29j.

Tags as above: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **The held carves pass, for the first time** [M]: standing **2.83 s** and Compress **2.98 s** (the bars are 2.28 and
  2.30; 3.2e was 0.30 and 0.68). The rest of the bars are 3.2e's. **The turn pair still fails, 0 of 16**, so this is a
  miss overall and no merge checks were run.
- **Both reference corrections are adopted** [R]: the steady turn that balances the lean (`turn: 'tan'`, now the
  default) and a lean-in rate of **0.5 rad/s** (`LEAN_IN_RATE`, in place of the old rider's 5).
- **The plant is measured at big rails** [M] and keyed by rail in `plantAt`: 13 of 15 points (0, 10, 20, 30, 40° at 5,
  7 and 9 m/s); at 5 m/s the board holds no turn at 30° or 40°.
- **It is not linear in the rail, and three of the twelve derivatives change sign between 10° and 20°** [M], including
  the hull's righting moment about the feet. That is why 3.2e's carve failed, and the model now says so in numbers: the
  straight-running design on a big-rail plant is unstable at nearly every point (−0.26 to −1).
- **But scheduling the controller on the rail does not help the game** [M]. Read to 5° the carves are longest
  (2.83 / 2.98 s); read to 10° the turn pair gets furthest (its falls move out of the bottom turn); read to 20° or more
  the carve is worse than 3.2e's. So `SCHEDULE_RAIL_CAP` is 5°, and the measured table sits behind an option.
- **Two faults in the lab's harness were found and fixed** (they are the reason the first measurements were nonsense):
  the roll-rate hold injected a vertical velocity that compounded, and the sideslip to hold is the path's angle in the
  level plane, not the body-frame reading. Rail 0 is unaffected: it reproduces the roll-plant study's table exactly.

## 2. The reference (item 1)

**The turn that balances the lean** [R]. `PredictiveController`'s `turn` is `'tan'` by default now. The reference is the
steady turn for `tan` of the lean asked, with the angles brought back to the lean. The linearised plant's own steady
turn is the small-angle shadow of it: at 49° of lean it asks 0.78 rad/s where the lean needs about 1.5.

**The lean-in rate** [R, S, M]. `LEAN_IN_RATE` is 0.5 rad/s. There is no measured roll rate for a rider setting a rail.
What is sourced is the turn: a real bottom turn comes round 99° in 0.96 s (Forsyth et al. 2024, as `COMPRESS_PULL`
cites it). The roll-plant lab's 1.9 rad/s is a **yaw** rate on a 42° rail, not a roll rate, so it is not taken as one.
If the rail is set over about the first half of such a turn, 0.7 rad in 0.5 s is about 1.4 rad/s, which is the sourced
upper end. Measured here (`results/rounds-32f.txt`), with the schedule at the kept cap:

| Lean-in rate | Held carve, tall / Compress |
|---|---|
| 0.5 rad/s (kept) | 2.83 / 2.98 s |
| 1 rad/s | 1.43 / 1.60 s |
| 1.4 rad/s | fails (0.75 / 0.45 s, uncapped schedule) |
| 5 rad/s (3.2e, the old rider's) | 0.30 / 0.68 s |

So 0.5 rad/s is **the rate the carve needs**, not a measured human rate. A rider reaching 40° of rail takes 1.4 s at
it, where a whole bottom turn takes about 1 s: it is at the slow end of human. [I]

## 3. The plant at a big rail (item 2)

`../roll-plant/plant.probe.ts` PART=rail, `../roll-plant/results/plant-rail.jsonl`. At each speed and rail the board is
held at that roll with its **yaw and sideslip free** until it settles into the turn that rail makes (the trim); the
twelve derivatives are then central differences about that trim, held (roll ±1°, slip ±1°, yaw rate ±0.1 rad/s, roll
rate about the deck ±0.2 rad/s).

**The trims** [M]:

| Speed | Rail | Yaw rate | Sideslip (level) | Pitch | Turn's pull over the lean's |
|---|---|---|---|---|---|
| 5 m/s | 10° | −0.29 rad/s | −3.5° | 18.6° | 0.845 |
| 5 m/s | 20° | −0.59 | −7.2° | 18.6° | 0.827 |
| 7 m/s | 10 / 20 / 30 / 40° | −0.22 / −0.43 / −0.68 / −0.97 | −1.5 / −3.3 / −5.6 / −9.1° | 8.8–10.6° | 0.876 / 0.845 / 0.838 / 0.824 |
| 9 m/s | 10 / 20 / 30 / 40° | −0.17 / −0.32 / −0.49 / −0.69 | −0.9 / −2.3 / −4.7 / −7.9° | 5.7–8.5° | 0.865 / 0.805 / 0.775 / 0.757 |

- **Measured:** every row above, and the 0° rows. **Not measured:** 5 m/s at 30° and 40°. There the board holds no
  turn: at 30° the run goes non-finite, and at 40° it spins out to 71° of sideslip and sinks to the tank's floor. The
  model clamps the rail to 20° at 5 m/s. Between the table's points everything is linear (speed and rail both).
- The turn's pull is 0.76–0.88 of what that rail's own lean would balance, and it **falls** as the rail grows and as the
  speed grows. So the rail a lean needs is more than the lean, by 6–15 % in the tangent (`railPull`).
- A board at 40° of rail is sliding 8–9°. The sideslip is not small at a big rail.

**The derivatives against the rail** (7 m/s; N·m, N and N·m per rad) [M]:

| Per | 0° | 10° | 20° | 30° | 40° |
|---|---|---|---|---|---|
| N per roll | −105 | −104 | −150 | −513 | −342 |
| Y per roll | −413 | −541 | −1298 | −2086 | −3401 |
| **K per roll (the deck)** | **−285** | **−180** | **+250** | **+286** | **+435** |
| N per slip | −296 | −344 | −663 | −1060 | −877 |
| **Y per slip** | **+1398** | **+825** | **−1387** | **−2610** | **−4143** |
| **K per slip** | **−531** | **−90** | **+886** | **+959** | **+1040** |
| N per yaw rate | −13 | −17 | −31 | −67 | −49 |
| Y per yaw rate | +63 | +46 | −73 | −72 | −206 |
| Y per roll rate | −20 | −46 | −63 | −84 | −259 |

- **It is not linear in the rail.** Three of the twelve change sign between 10° and 20°, at every speed:
  - **the hull's righting moment about the feet** (K per roll: −310 → −37 → +15 at 5 m/s; −285 → −180 → +250 at 7;
    −296 → −153 → +47 at 9). Beyond about 15° of rail **the water no longer rights the board under the rider: it rolls
    it further in.**
  - **the side force per degree of sideslip** (Y per slip: +705 → +321 → −378 at 5 m/s; +1398 → +825 → −1387 at 7;
    +2272 → +1573 → −358 at 9). Beyond about 15° a slide feeds itself. That is the lab's spin-out.
  - the roll moment per sideslip, the same way.
- The magnitudes grow 2 to 8 times by 40° (Y per roll, Y per roll rate most).
- **The 30° and 40° rows are the least steady** (the trim's yaw spread 0.07–0.92 rad/s against 0.00–0.06 at 10–20°), and
  several derivatives are not monotone there (N per roll at 7 m/s: −513 then −342). I kept them as measured. [M, I]

**Two faults in the lab's harness, found and fixed** [R, M] (`../roll-plant/plant.ts`, `plant.probe.ts`):
1. The `rollRate` hold adds the axis point's velocity term to the board each substep. Its level part is harmless (the
   speed hold rewrites v.x and v.z), but **the vertical part compounded**: at a rolled board it reached 22 m/s within a
   frame and threw the board out of the water, which is why the first big-rail derivatives came out in the thousands.
   It is now a set, not an addition. At rail 0 the term is level, so nothing there changes.
2. **The sideslip to hold is the path's angle in the level plane**, which is what the hold means by it. `read().slip` is
   the body-frame one, and at a rolled board it mixes in the heave: at 30° of rail it reads 0.06° where the level slip
   is −5.6°. Held at the body-frame value the board **sank to the tank's floor within a second**; held at the level
   value its pitch, draft and forces are steady to the last digit over 3 s.

**What the model says with it** (`predict.probe.ts` PART=railmodel, `results/predict-railmodel-32f.jsonl`) [M]:

| Speed, rail | A design made on that rail's plant | With a frame of timing error | **3.2e's straight design on it** |
|---|---|---|---|
| 7 m/s, 0° | +0.68 | +0.14 | +0.68 |
| 7 m/s, 10° | +0.68 | +0.20 | +0.15 |
| 7 m/s, 20° | +0.48 | −0.12 | **−0.31** |
| 7 m/s, 30° | +0.37 | −1 | **−1** |
| 7 m/s, 40° | **−1** | −1 | **−1** |
| 9 m/s, 20 / 30 / 40° | +0.66 / +0.65 / +0.65 | +0.19 / +0.11 / +0.06 | **−1 / −0.36 / −0.40** |
| 5 m/s, 10 / 20° | +0.60 / +0.55 | +0.08 / −0.09 | **−1 / −0.26** |

- **Ruling 29j's diagnosis is confirmed in numbers:** the straight-running design is unstable on the plant of a carve at
  nearly every rail, which is what 3.2e's rider was doing.
- A design made on the rail's own plant is sound to 20–40°, except 7 m/s at 40°, where the plant is not stabilisable at
  all: with the side force per sideslip reversed, a slide feeds itself and neither the ankle nor the twist can reach it.
- Above 20° at 7 m/s the design fails a frame of timing error. ρ from 30 to 1000 does not fix it (5 points still fail).

## 4. In the game: the rail in the schedule, and its cap (items 2 and 3)

The controller now blends **eight** designs (two speeds × two stances × two rails) instead of four, and the rail it
reads is the rail that holds the lean asked (`railPull` inverted, two passes), capped at `SCHEDULE_RAIL_CAP` [R].

The cap's screen (`results/rounds-32f.txt`; the held carves, and the turn pair's first fall at drop 20) [M]:

| Cap | Held carve, tall / Compress | The turn pair's first fall |
|---|---|---|
| 0° (3.2e's plant) | 2.38 / 2.58 s | 0.73–1.03 s, in the bottom turn |
| **5° (kept)** | **2.83 / 2.98 s** | 1.18–2.02 s, 12 of 16 in the climb |
| 10° | 2.38 / 2.30 s | **2.42–3.68 s, every one in the climb** |
| 12° | 2.07 / 2.72 s | — |
| 15° | 1.38 / 2.87 s | 1.52–2.58 s, in the climb |
| 20° | 1.30 / 2.88 s | — |
| 30° / 40° | 0.68 / 0.95 s | — |

- **The measured big-rail plant makes the carve worse, not better, once the schedule reads past about 10°.** I did not
  expect that, and I cannot explain it from the model: the model says the straight design on a big-rail plant diverges,
  yet in the game it holds the carve 2.4 s. My reading [I]: the lab's trim is a *forced* steady turn of a rigid rider
  (and the hull sits deeper there: draft 13–15 cm against 9 cm straight), while the game's carve is a transient with a
  free body on its leg. The rail-keyed plant is the right plant for a *held* turn, not for entering one.
- **5° is kept** because both carve bars pass with margin there. **10° is the better choice if the turn pair is what
  matters:** its falls move out of the bottom turn entirely, at the cost of the Compress carve sitting exactly on its
  bar (2.30). It is one constant (`SCHEDULE_RAIL_CAP`), and that is the advisor's call.
- The landscape is rough: 2.38, 2.83, 2.38, 2.07, 1.38, 1.30 over caps 0, 5, 10, 12, 15, 20. Neighbouring caps differ
  by half a second. [M]

## 5. The bars (item 3; steady starts, 16 substeps)

Results: `results/bars-new-32f.jsonl`, `bars31-new-32f.jsonl`, `yawstep-32f.jsonl`, `e32-kicktrace-32f.jsonl`,
`e32-compare-32f.jsonl`. The old rider's rows are `bars-old.jsonl` (unchanged).

| Bar | Old | 3.2e | 3.2f | Pass? |
|---|---|---|---|---|
| N0: `rider=old` byte-identical | — | yes | 3.2's and 3.1's `bars-old` the same bytes | yes |
| **Held carve standing ≥ 2.28 s** | 1.93 | 0.30 | **2.83** | **yes** |
| **Held carve Compress ≥ 2.30 s** | 3.0 | 0.68 | **2.98** | **yes** |
| Turn pair set B ≥ 12 of 16 | 14 of 16 | 0 of 16 | 0 of 16 (falls 1.18–2.02 s) | no |
| Mode B: damping ≥ 0.05 (5 / 7 / 9 m/s) | −0.015 / +0.079 / +0.103 | +0.030 / +0.018 / +0.058 | +0.030 / +0.018 / +0.058 | no (near) |
| Mode B: roll decay per cycle ≤ the old's | 1.42 / 0.35 / 0.46 | 0.54 / 1.62 / 0.55 | 0.54 / 1.62 / 0.55 | no (5 and 9 m/s yes) |
| Mode A not seen | 0.000–0.007 | 0.000–0.009 | 0.000–0.009 | yes |
| Push recovery, 7 m/s: tall > crouch > Compress | 192 / 188 / 191 N·s | 138 / 155 / 170 | 138 / 155 / 170 | no: the order is reversed |
| Reaction 0.08–0.12 s | 0.001 | 0.105 | 0.105 | yes |
| Glides on the plane | 4 of 4 | 4 of 4 | 4 of 4 | yes |
| N1: legs < ~2 kW per frame; ≤ 1.46 kW over 0.5 s | to 30.9 kW | 0.55 / 0.26 kW | 0.55 / 0.26 kW | yes |
| N2: 20° from 4 m/s, gain ≥ 3.5 m/s | +1.7 | +3.25 | +3.25 | no |
| Save window, chop, the 2 m/s rise | — | — | unchanged (0.85 s; 4 of 12; falls 0.42 s) | step 3.2g |
| (report) 3.1's N5 held carves, tall / Compress | — | 0.52 / 0.53 s | 1.42 / 1.27 s | — |
| (report) N4 placed straight down and up | 2 of 12 | 12 of 12 | 12 of 12, the board to 1.8 g | — |
| (report) the 45° line placed | 3 of 6 | 4 of 6 | 4 of 6 | — |

- Only the carves moved. Everything the controller does while riding straight is 3.2e's, to the digit: the reference's
  corrections act only when a lean is asked for, and the schedule's rail is 0 when it is not. [M, I]
- 3.1's own held carves (flat water, its placed start) also more than doubled, 0.52 → 1.42 s and 0.53 → 1.27 s, without
  reaching their 2.28 / 2.30 bars there. [M]

**The yaw step (report;** `results/yawstep-32f.jsonl`) [M]: the time to 63 % of the first peak is 0.064 / 0.061 /
0.057 s at 5 / 7 / 9 m/s, and the first peak comes at 0.133–0.137 s, when the balance answers. The same as 3.2e: the
twist body and the inertia it meets (2.2 kg·m² in the first 10 ms) did not change in this step.

**The turn pair, where it falls** [M] (`results/rounds-32f.txt`). Nobody begins the top turn, at any cap, so **there is
no second rail change to trace.** What the record shows:
- At the kept cap (5°) the first fall is at 1.18–2.02 s: 4 of 16 in the bottom turn, 12 of 16 in the climb, at the
  bottom of the face (`frac` 0–0.03) with 61° of bank asked and the board still at 8.5 m/s.
- At 10° every fall is in the climb, at 2.42–3.68 s, and the board has **slowed to 3.0–5.7 m/s** at the base of the
  face. So the bottom turn is survived and the rider then runs out of speed before it can climb. Pumping and the climb
  are not this step's work, and `CARVE_CARRY` is off for the new rider (ruling 29), which is where the old rider's
  Compress carve got its speed. [I]

## 6. Mode B, the trace beside the fit (item 4)

`e32.probe.ts` PART=kicktrace, `results/e32-kicktrace-32f.jsonl`. The kick is the bar's: the board's roll rate +0.5
rad/s from a steady glide. The peaks, in order [M]:

| Speed | Fitted (Hz, damping) | The body's bank, peak by peak | The yaw rate, peak by peak (rad/s) | Yaw envelope over two cycles |
|---|---|---|---|---|
| 5 m/s | 3.64, +0.030 | 0.20°, 0.16°, 0.13°, 0.03° | 0.003, 0.011, 0.008, 0.032, 0.007, 0.012 | 2.24 |
| 7 m/s | 2.54, +0.018 | 0.29°, 0.29°, −0.07°, −0.03° | 0.015, 0.007, 0.033, 0.020, 0.017, 0.004 | 1.13 |
| 9 m/s | 1.49, +0.058 | 0.14°, −0.11°, 0.05°, −0.03° | 0.012, 0.006, 0.018, 0.003, 0.005, 0.003 | 0.41 |

- **The kick dies in the body's bank within about two cycles at all three speeds** (the bank's peaks fall to a sixth or
  less by the fourth). The rider's lean, which is what a rider feels, settles.
- **The yaw rate does not read as a clean mode.** Its peaks are 0.003–0.033 rad/s (0.2–1.9 °/s) and they wander: the
  largest comes third or fourth, not first, and at 5 m/s the envelope over two cycles is 2.24. The bar fits a damped
  mode to this signal, so **its +0.018 at 7 m/s is a fit to a wander of under 2 °/s, not to a weave.** [M, I]
- My reading [I]: the bar as written cannot tell a dying weave from the board's small wandering on its own fins. The
  owner's ride is the test the ruling already named. A bar on the bank's envelope (say, under a fifth within two
  cycles) would say what Mode B was meant to say.

## 7. The rounds (item 6) and what I am unsure of

Two rounds, as the stop rule allows [M]: (1) the rail in the schedule, uncapped, with the lean-in rate at 1, 0.5 and
1.4 rad/s; (2) the cap, over 0, 5, 10, 12, 15, 20, 30 and 40°, with the lean-in rate at 0.5 and 1. The weights are
3.2d's throughout, untouched. I stopped there, as the ruling says.

- **I cannot explain why the measured big-rail plant makes the carve worse.** The model says the opposite. Until that
  is understood, the rail table is a measurement the game barely uses.
- The 30° and 40° trims are the least steady rows, and 5 m/s above 20° has no row at all.
- The lab's harness faults mean every big-rail number in this part is new. Rail 0 reproducing the roll-plant study
  exactly is the only check I have on the method.
- The turn pair's falls in the climb look like lost speed, not lost balance, and that is a different step's work.

## 8. What was not run

- **The merge checks** (the suite, the Canyon byte check, the fps trace): the turn pair, Mode B, the push order and N2
  still miss. Run here: `tsc` (app and server), and `predictiveBalance.test.ts`, `humanBalance.test.ts`,
  `standingBody.test.ts`, `rollModel.test.ts` (36 tests).
- The chop, the save window and the 2 m/s rise, which ruling 29j puts in step 3.2g. Nothing in this step touched the
  pitch loop.
- No ride, no game page, no Basilisk case.

## Files (3.2f)

- `src/physics/predictiveBalance.ts`: `RAIL_PLANT` (the measured table), `railCorrection`, `railPull`, `railLimit`,
  `plantAt`'s `rail`, `scheduledDesign`'s rail, the eight-design blend, `turn: 'tan'` by default.
- `src/physics/AttachedRider.ts`: `LEAN_IN_RATE`, `SCHEDULE_RAIL_CAP`, the schedule's rail from the lean asked, and the
  probe-only `balance.railCap`.
- `../roll-plant/plant.ts`: the `rollRate` hold's vertical term is a set (the fault above). `plant.probe.ts`: PART=rail.
- `predict.probe.ts`: PART=railmodel. `e32.probe.ts`: PART=kicktrace.
- `results/`: `bars-new-32f.jsonl`, `bars31-new-32f.jsonl`, `yawstep-32f.jsonl`, `e32-kicktrace-32f.jsonl`,
  `e32-compare-32f.jsonl`, `predict-railmodel-32f.jsonl`, `rounds-32f.txt`; `../roll-plant/results/plant-rail.jsonl`.

---

# Part 7: step 3.2g, the pitch loop — measured and diagnosed, not rebuilt (ruling 29k)

Written 2026-11-13 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32g` (from
`claude/rider-new-32f`, rebased on main b206cae8). The contract: `../ruling-29.md` 29k.

Tags as above: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **Miss, and I stopped where the stop rule says to stop.** The pitch plant is measured, and the chop fall is traced.
  **The chop fall is not the pitch loop's gains**, so I did not rebuild the loop and did not tune. No game code changed
  in this step: the bars are 3.2f's, unchanged, and nothing can have regressed.
- **The pitch plant bends harder than the rail plant did, and it has a sign change** [M]: at a nose-down trim the
  hull's **lift per sinkage reverses** — lifting the board then adds lift instead of losing it, so the heave is
  unstable. That is the bow burying, and it is a finding in its own right.
- **At 2 m/s there is no pitch plant at all** [M]: the lab's board with a 73 kg rider does not plane, it sinks and
  stands on its tail (trim 90°, draft 3 m, the tank's floor). The 2 m/s rise bar is a floating board, not a planing one.
- **The hull's pitch damping is 2 to 4 times smaller than the pitch loop assumed** [M]: 7.7–22.7 N·m·s/rad over
  5–12 m/s, against the 20–30 the braced damping was designed against (`standingBody.ts` PITCH_DAMPING_TIME's note).
- **What the chop fall actually is** [M]: the board's pitch swings the same amount under the old rider, which does not
  fall. The new rider's **load falls to 0.10 of body weight** where the old rider's stays at 0.56, and the fall is then
  called by the capture point, which **is not valid while the rider is light**: its ω₀ is floored at √(0.5/h), so as
  the felt gravity goes to zero the capture point runs away on its own.
- **I am nearly out of context.** The build this step needs (a pitch controller on the measured plant, scheduled by
  pitch as the rail is, and a fall test that does not fire while unloaded) is a fresh agent's work. The measurement and
  the diagnosis below are what it needs to start.

## 2. The pitch plant (item 2)

`../roll-plant/plant.probe.ts` PART=pitch, `../roll-plant/results/plant-pitch.jsonl`. The board is towed straight and
left free in pitch and heave until it settles (the trim); then the pitch and the height are held there and the pitch
moment M (nose up +, about the board's lateral axis through the deck under the rider) and the vertical force Z (up +)
are central differences about it: per rad of pitch (±1°), per metre of heave (±2 cm), per rad/s of pitch rate (±0.2) and
per m/s of heave rate (±0.2). `PITCHES` offsets the held pitch from the trim, in degrees. The lab needed three new
holds (pitch, height, pitch rate), and the height must be written to the board's **centre of mass**, which is its own
state; writing `position` does nothing, because `syncPosition` derives it back (that cost me a round) [R].

**At the trim** [M]:

| Speed | Trim | Draft | M per pitch | Z per pitch | M per heave | **Z per heave** | M per pitch rate | Z per heave rate |
|---|---|---|---|---|---|---|---|---|
| 5 m/s | 19.3° | 21.5 cm | −1770 N·m/rad | +319 N/rad | −1648 N·m/m | **−701 N/m** | −7.7 N·m·s/rad | −364 N·s/m |
| 7 m/s | 9.2° | 9.1 cm | −953 | −357 | −1567 | **−3910** | −11.2 | −539 |
| 9 m/s | 5.8° | 5.1 cm | −410 | +2069 | −3722 | **−10294** | −16.6 | −707 |
| 12 m/s | 3.8° | 2.4 cm | −1400 | +2343 | −5322 | **−19039** | −22.7 | −899 |

- The base vertical force is 741 N at every speed from 5 up, which is the rider's and the board's weight (740 N): the
  method's check, as rail 0 was for the roll plant [M].
- The heave stiffness grows 27 times from 5 to 12 m/s. With the pair's 75.5 kg that is a heave mode at 0.5 Hz at 5 m/s
  and 2.5 Hz at 12 [I].
- The pitch stiffness is restoring at every speed but **not monotone** in it (−1770, −953, −410, −1400).
- **The pitch damping is small:** 7.7 N·m·s/rad at 5 m/s and 11.2 at 7, where `PITCH_DAMPING_TIME`'s note assumed
  20–30. The braced ankle (0.3 s × k) was chosen against a hull damping that is 2 to 4 times too large at the speeds
  where the chop bar fails [M, R].

**Does it bend? Yes, and it changes sign** [M]. The same point, with the held pitch offset from the trim:

| Speed | Offset | Pitch | Draft | M per pitch | **Z per heave** |
|---|---|---|---|---|---|
| 7 m/s | −3° | 6.2° | 12.6 cm | −204 | **+606** |
| 7 m/s | trim | 9.2° | 9.1 cm | −953 | −3910 |
| 7 m/s | +3° | 12.2° | 10.0 cm | −695 | −5588 |
| 7 m/s | +6° | 15.2° | 12.3 cm | −1713 | −5519 |
| 9 m/s | −3° / trim | 2.8° / 5.8° | 9.4 / 4.9 cm | −525 / −410 | **+226** / −10294 |
| 12 m/s | −3° / trim | 0.8° / 3.8° | 5.1 / 2.3 cm | −1895 / −1400 | **−1469** / −19039 |
| 5 m/s | −3° / trim | 16.3° / 19.3° | 28.6 / 21.5 cm | −14 / −1770 | **+621** / −701 |

- **Three degrees nose-down of the trim, the lift per sinkage changes sign** at 5, 7 and 9 m/s (and falls by 13 times at
  12). There the bow is buried (the draft grows by 3–4 cm as the nose drops), and lifting the board **adds** lift
  instead of losing it: the heave runs away from its trim. That is the bow burying the ruling asked me to watch, and it
  is the pitch plant's equivalent of the rail plant's slide that feeds itself. [M, I]
- M per pitch varies by 8 times over ±6° at one speed, and not monotonically. The plant is not linear in pitch over the
  range a chop drives it through, so a controller designed at the trim alone does not hold at the ends — exactly the
  lesson of the rail plant, in the other axis. [M, I]
- **At 2 m/s there is no plant.** The board sinks to the tank's floor and stands on its tail (trim 90°). Every
  derivative there is of a sunk board, and I report them only so nobody mistakes them for a planing hull's. The 20 cm
  rise bar at 2 m/s is therefore not a test of a planing pitch loop. [M]

## 3. What the chop fall is (item 4, the stop rule)

`e32.probe.ts` PART=trace with CHOP=2, at 7 m/s, from the bars' own steady start
(`results/trace-chop2-32g.jsonl`, and the old rider's `trace-chop2-old-32g.jsonl`) [M]:

| | The new rider (falls at 0.83 s) | The old rider (3 s, no fall) |
|---|---|---|
| The board's pitch | +5° to −13.6° | +4.7° to −12.0°, cycling about 0.55 s |
| The leg's load | 1.31 → **0.10** body weights | never below **0.56** |
| The knees' travel | about 3 cm | — |
| The ankle's angle | 12° → 16° forward, and it stays | — |
| The capture point along the deck | 0.34 → **0.84 m** (the feet reach 0.32) | — |

- **The board's pitch swing is the chop's, not the rider's.** Both riders' boards swing ±12°, and the old rider holds.
  So no pitch loop could have held the board flatter: the swing is what a 0.2 m chop does to this hull at 7 m/s. [M, I]
- **The difference is the load.** The old rider is carried by its drive, so it stays on the deck (0.56 BW). The new
  rider is a free body: when the board drops away into the trough, it unloads to 0.10 BW. A rider that light has almost
  no ankle authority (the feet's torque is bounded by the load), so nothing can be done in that window. A real rider
  rides that out — they go light, and the board comes back up. [M, I]
- **The fall is then called by the capture point, which is not valid there** [R, M]. `HumanBalance.capture` uses
  ω₀ = √(max(0.5, g) / h) with g the felt gravity. As the board drops away g goes to zero, ω₀ falls to its floor
  (0.75 /s at h = 0.9 m), and the capture point is the centre of mass's place plus its speed over ω₀: a drift of
  0.5 m/s alone then puts it 0.67 m along, twice the feet's reach, **with no loss of balance at all.** The capture
  point is a theorem about a body on a fixed support under gravity (Hof et al. 2005). It says nothing while the support
  is falling. [I]
- **The same test sets the save window**, which is why that bar is long: the window is the time the centre of mass takes
  to pass the feet's edge after the capture point first leaves them, and the capture point leaves them at the first
  touch of any shove (0.001 s).
- **So the chop and the save window are one fault, and it is the fall test, not the pitch loop.** The 2 m/s rise is a
  third thing: a board that does not plane (section 2).

## 4. What the next agent should build [I]

In this order:
1. **A fall test that holds while the rider is light.** The capture point should be read only against the support that
   exists: freeze it (or hold the last valid margin) while the load is under about a fifth of body weight, and let the
   existing posture backstops (the leg past its travel, the lean past MAX_PITCH, the feet off the deck) carry those
   windows. Expect the chop and the save window to move together, and check the push bar does not get easier.
2. **The legs' absorption.** 3 cm of knee travel over a 0.2 m chop is not a rider absorbing it. The knee spring is
   20,000 N/m, which with 73 kg is a 2.6 Hz mode, right on the board's pitch and heave swing. A rider's legs are much
   softer in that band. This is the physical half of the chop bar, and it is a stance question (the design's §6
   strength and travel), not a controller one.
3. **Then the pitch loop under prediction**, as 29k asks, on the measured plant — but **scheduled by the pitch offset
   as well as the speed**, because of section 2's sign change, and with the honest knowledge from 3.2f that a
   schedule read too far into the non-linear region made the carve worse, not better. The plant's own numbers are now
   in `plant-pitch.jsonl`; a `pitchPlantAt(speed, offset)` beside `plantAt` is the shape of it.
4. The 2 m/s rise is a non-planing case and should be judged separately, if at all: the old rider falls there too.

## 5. The bars

Unchanged from 3.2f, because no game code changed in this step: the held carves 2.83 / 2.98 s, Mode B passing on its
restated bar (the bank's envelope halves within two cycles at 5, 7 and 9 m/s), N0 byte-identical, the chop 4 of 12, the
save window 0.85 s, the 2 m/s rise falling at 0.42 s. `tsc` (app and server) and the four model and rider test files
(36 tests) pass. The merge checks are not run: the three bars this step was given do not pass.

## 6. How it rides, and what is still missing (for the owner)

Plain words, as the ruling asks.

**What works now** (behind `?rider=new`, not yet merged):
- The rider stands with no hidden hand holding it. It balances like a person: it feels its body late, predicts, and
  moves its ankles, hips and shoulders.
- It holds a hard carve: 2.8 seconds standing and 3.0 in Compress, which the old rider could not do without a hidden
  push.
- A shove no longer starts a wobble. The wobble that broke four earlier steps is gone.
- It answers a push in about 0.1 seconds, like a person, not instantly like a machine.

**What is still missing:**
- **Small chop throws it.** When the board drops into a trough the rider goes light, and the game calls that a fall
  even though nothing is wrong. This is the next thing to fix, and it is one rule, not a redesign.
- **The legs do not soak up bumps.** They are too stiff: about 3 cm of give where a rider would use 10 or more.
- **No pumping yet.** The rider cannot gain speed by working the board, so after a bottom turn it runs out of speed and
  cannot climb back up the face. That is why the two-turn test still fails; it is a speed problem, not a balance one.
- **Slow water, under about 5 m/s, is not covered.** The board does not plane there, and the rider's model has nothing
  to say about it.

**My honest view:** the side-to-side balance is done, and it is better than the old rider in the hardest thing it was
asked to do. The front-to-back side is one rule and one spring away from being judgeable, and the pumping is a separate
piece of work. It is worth a ride once the chop rule is in; riding it today, the first bump would end it. [I]

## Files (3.2g)

- `../roll-plant/plant.ts`: the `pitch`, `height`, `heaveRate` and `pitchRate` holds (and the note that the height is
  the centre of mass's). `plant.probe.ts`: PART=pitch.
- `results/trace-chop2-32g.jsonl`, `trace-chop2-old-32g.jsonl`; `../roll-plant/results/plant-pitch.jsonl`.
- No change to `src/`.

---

# Part 8: step 3.2h, the fall test and the legs (ruling 29l)

Written 2026-11-13 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32h` (from
`claude/rider-new-32f`, rebased on main 6897a18f). The contract: `../ruling-29.md` 29l.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **The chop still misses at 4 of 12, and I stopped where the stop rule says to stop.** Both things the ruling asked
  for are built and both did what they were meant to do, but neither is what the remaining eight falls are.
- **The fall test has its validity condition** (`CAPTURE_LOAD` 0.2 body weights): while the feet carry less than that,
  `capture` holds its last state, so the test can neither call a fall nor clear one. **The push bar did not get
  easier** — the largest shove saved is identical to the digit in all six rows, and the window's asymptote moved by
  0.006 s [M].
- **The legs' fault was a rule, not the stiffness** [M, R]. "Feet on a deck only push" was gated on the *stance's* own
  compressing, so the **balance's** own knee drop was exempt. In a chop's trough it drove the leg's rest 0.18 m under
  the body and the spring pulled the body **down with 3.6 kN — five body weights — on a rider the water was carrying
  nothing of.** With the rule extended to the balance's drop, the knees' travel on the 20 cm rise goes from 2.8 cm to
  **25 cm**, and that bar passes for the first time.
- **The 20 cm rise at 2 m/s passes** (old rider: falls at 0.32 s; 3.2f: 0.42 s; now: holds 1.7 s) [M]. Ruling 29l
  demoted it to a report on the grounds that the board does not plane at 2 m/s — but **the 2 m/s is the surface's rise
  rate, not the board's speed**: the board glides at 7.4 m/s throughout (`bars.probe.ts`, the `rise` part). The
  demotion rested on a misreading, and the bar should come back [M, R].
- **Softening the knee spring makes the chop worse, not better** [M]: at 20 / 12 / 8 / 5 / 3 kN/m the chop is 4 / 3 /
  3 / 3 / 3 of 12. So does meeting the chop in a crouch or in Compress: 4 of 12 in all three stances. The 20 kN/m
  stays, and I say why below.
- **The eight remaining chop falls are side-to-side, not front-to-back, and the roll is the rider's own** [M]. On the
  same water the old rider's board stays inside ±11° of roll; the new rider's reaches 35–63°, with the body banked
  30–54° and going over with it. That is the opposite of 3.2g's pitch finding, where the swing was the chop's and the
  same under both riders. **Ruling 29k's "everything still missing is front-to-back" is refuted** [M].
- **The save-window bar was read at a singular point** [M]. The time to fall diverges as the shove approaches the
  largest savable one (1.02× → 1.20 s, 1.1× → 0.87, 1.2× → 0.47, 1.5× → 0.195, and flat beyond), and the bar reads the
  1.1× row. The design's save window is the body's own tipping time √(h/g_eff), which is the ladder's **asymptote**:
  tall 0.187, crouch 0.165, Compress 0.144 s, ordered as the spec wants, against bars of 0.25–0.35 and 0.15–0.25.
  Both are short, not long, and the shortfall is explained.

## 2. The fall test's validity condition (item 1)

`src/physics/humanBalance.ts`: `CAPTURE_LOAD` and the gate at the head of `capture`; `AttachedRider.captureStep` now
passes the feet's own load for the substep (the contact impulse along the board's up over h·m·g) and the substep.

**The condition, and why the load is the right one** [I, R]. The capture point is a theorem about a body on a fixed
support under gravity. The reason to condition it on the **load** rather than on anything else is that the test is a
statement about the feet, and the feet's authority is bounded by the load they carry: the centre of pressure can only
move inside a foot that bears weight, so the whole foot's moment is at most the load times its half-length (about
0.1 m). At 0.2 body weights that is 0.2 × 716 N × 0.1 m ≈ 14 N·m against the body's toppling stiffness m g h of about
645 N·m/rad — a correction of 1.3°. Below that the test asks where the feet must be while the feet can do nothing.

**Why 0.2** [M, I]:
- 3.2g's chop trough reaches **0.10** body weights, so a gate at 0.10 would not engage at the moment that started this
  step. 0.2 clears it with room.
- The code already holds the same idea at the same place: the old rider's `BALANCE_LOAD` is 0.1 body weights, "below
  this load the centre of pressure says nothing and the rider does not rebalance" [R].
- Above, the gate must not reach a shove. In the push bar the feet never go below **0.50** body weights under a shove
  just past the savable one, and **0.16–0.23** under a hard one [M]. So 0.2 sits in the gap: under the trough's floor,
  over nothing a savable shove reaches.

**The freeze, exactly** [R]: under the gate `capture` returns the state untouched — the point, how far past the feet it
is, whether it is beyond the room, the margin, and the time it left the feet. Three consequences, all wanted: the fall
test cannot fire (its two conditions are frozen); a fall **already** called stands through the light window (the freeze
never clears one, and there is a test for that); and `strategies` keeps reading the frozen `past` through the delay
line, so the knees and arms hold the demand they had rather than lurching. The felt vertical's own 0.1 s low pass keeps
running inside `captureStep`, so nothing is stale when the test resumes.

**On the way back into load** [I]: the test resumes at once, on the state the body is then in. No grace period and no
memory of the light window. That is deliberate: a rider who goes light and comes down with its weight off its feet does
fall, and the first loaded substep's own reading is exactly that judgement. The only thing the freeze costs is a fall
that would have been called *during* the light window — where, by the paragraph above, the feet could neither have
caused it nor saved it. No hysteresis band is needed because freezing only skips an update: a load that crosses the gate
back and forth leaves the state current whenever the feet carry anything.

**Did the push bar get easier? No** [M] (`results/bars-new-32h.jsonl`):

| | 3.2f | 3.2h |
|---|---|---|
| Largest shove saved, tall / crouch / Compress (m/s) | 1.887 / 2.127 / 2.326 (2.391 the other way) | **the same to the digit** |
| The reaction, first active rest move (s) | 0.105 / 0.104 / 0.103 | 0.105 / 0.104 / 0.103 |
| The window at a decisive shove (1.5×, s) | 0.199 / 0.165 / 0.143 | 0.193 / 0.164 / 0.143 |

The lowest load the feet see under the bar's own shoves is 0.50–0.68 (just past the margin) and 0.16–0.23 (hard), so
the gate touches only the hard rows and takes 0.006 s off the tall one. The test did not become a test that never
fires.

**The gate's sensitivity, measured** [M] (`results/push-gate010-32h.jsonl`, `push-gate040-32h.jsonl`): the push bar at
a gate of 0.1, 0.2 and 0.4 body weights.

| `CAPTURE_LOAD` | Largest shove saved (tall / crouch / Compress) | The window at 1.5× |
|---|---|---|
| 0.1 | 1.887 / 2.127 / 2.326 | 0.193 / 0.164 / 0.143 |
| **0.2 (kept)** | 1.887 / 2.127 / 2.326 | 0.193 / 0.164 / 0.143 |
| 0.4 | 1.887 / 2.127 / 2.326 | **0.214 / 0.265 / 0.265** |

Nothing at all changes between 0.1 and 0.2 — the savable shove never takes the feet that light. By **0.4 the gate
begins to shelter a hard shove**: the window grows by a tenth in the tall stance and by two thirds in the crouch and in
Compress, which is the test firing later than it should. So the choice is bounded from below by the chop's trough (0.10)
and from above by the shove (somewhere under 0.4), and 0.2 sits in the middle of that window with the push bar's own
numbers unchanged. [M, I]

## 3. The legs (item 2)

### What the chop's trough was really doing to them

`e32.probe.ts` PART=trace, chop 2 at 7 m/s from the bars' own start, with the leg's state added to the trace
(`results/trace-chop2-32h-legs.jsonl`) [M]:

| | At the trough |
|---|---|
| The feet's load | 1.43 → **0.10 → 0** body weights |
| The pair's felt gravity | 13.2 → **1.1** m/s² |
| The balance's knee drop | the rest driven to **−0.26 m** (the capture point was 0.33 m past the feet, over KNEE_PAST_FULL, so the knees are asked all the way down) |
| The leg's force | **−3624 N**, pulling the body **down** |
| The body off its posture | 0 → **0.26 m**, and separated by `RECOVERABLE_ERROR` |

The rule that should have stopped it is already in `prepareLeg` and already written in the right words — *"Feet on a
deck only push: compressing, the legs fold no faster than the body falls onto them, so a board dropping or rolling away
from under the rider unloads the feet rather than being pulled up by them"* — but its condition is `compressing`, which
is the **stance's** own compress, Snap or carve flex. The new surfer's balance lowers the knees through a different
path (`human.knees` × the stance's travel, `HumanBalance.strategies`), and that path was exempt. So the one place in the
rider where a board falls away from under the feet by design was the one place the rule did not cover [R, I].

**The change:** the rule now also holds while the balance's own knee drop is under way. One condition, no new constant.

### What it bought, and what it did not

| | Old rider | 3.2f | 3.2h |
|---|---|---|---|
| 20 cm rise at 1 m/s: knee travel / fall | 1.0 cm / holds | 24 cm / holds | 20.9 cm / holds |
| **20 cm rise at 2 m/s** (the bar) | 1.8 cm / **falls 0.32 s** | 2.8 cm / **falls 0.42 s** | **25 cm / holds** |
| 20 cm rise at 4 m/s (no bar) | 6.3 cm / falls 0.22 s | 8.9 cm / falls 0.40 s | 8.9 cm / falls 0.63 s |

Three centimetres of knee travel over a 0.2 m stroke was not the spring's doing: it was the spring being asked to pull
against its own rest. With the rule in, the same spring spends **25 cm** — the stance's whole travel — and the rise
bar passes [M].

### The knee stiffness: measured, and kept

The ruling's reading was that 20,000 N/m puts a 2.6 Hz mode on the board's swing and should come down. I measured it
rather than assuming, over the chop bar [M]:

| Knee spring | 20 kN/m (kept) | 12 | 8 | 5 | 3 |
|---|---|---|---|---|---|
| Plane glides | 4 of 4 | 4 of 4 | 4 of 4 | 4 of 4 | 4 of 4 |
| Chop glides | **4 of 12** | 3 of 12 | 3 of 12 | 3 of 12 | 3 of 12 |

Softer is worse, monotonically in the held times (chop 3 at 9 m/s, for instance, goes from holding 3 s to falling at
1.22, 0.70, 0.23 and 0.17 s). So I did **not** change it, and I would not change it on the sources either without a
reason the bars can see.

**What the sources say, for the record** [S]:
- The 20 kN/m comes from Matsumoto and Griffin 1998 (*J Sound Vib* 212(1):85–107), whose legs-bent standing posture
  resonates near 2.75 Hz, i.e. about 22 kN/m against 73 kg. That is a **small-amplitude apparent mass**, measured at
  0.125–2.0 m/s² r.m.s.
- The same paper is the source for softening with amplitude: in the normal standing posture the resonance falls from
  about 6.75 Hz to 5.25 Hz as the input rises from 0.125 to 2.0 m/s² r.m.s., and it is lower again with the knees bent
  (https://eprints.soton.ac.uk/429461). The chop here drives the board at about 13 m/s² peak, well outside that range,
  so the measured 22 kN/m is read beyond its own conditions — the same kind of error as the fall test's [I].
- A leg deliberately absorbing a large stroke is an order of magnitude softer. A biplane-fluoroscopy drop-landing study
  reports a "soft" landing (about 117° of knee flexion against 77° for a stiff one) peaking at **1.63 ± 0.73 body
  weights** against 2.60 ± 1.32 (https://read.qxmd.com/read/21602566, read from the abstract only). With the 0.3–0.4 m
  of centre-of-mass travel such a landing uses, that is an effective vertical stiffness of **1.2–3.9 kN/m** — my
  arithmetic on their numbers, not theirs [I].
- So the honest sourced band for "a rider's legs absorbing a 0.2 m chop" is a few kN/m, and 20 kN/m is the
  standing-still number. **The band and the bars disagree**, and I report that rather than resolving it: the sources say
  softer, the measurement says softer is worse. My reading is that the leg is not the chop's limit at all (section 4),
  so the band has nothing to act on yet; when the across axis holds, this is worth re-measuring, and 3–5 kN/m is where
  a source would put it.

## 4. What the chop's eight remaining falls are (the stop rule's trace)

`e32.probe.ts` PART=chopfall runs the bars' own twelve chop glides and keeps the last eight frames before each fall
(`results/chopfall-32h.jsonl`; the old rider's `chopfall-old-32h.jsonl`) [M]. The state at the fall:

| Case | Fell at | The board's roll | The body's bank | The hip used | Feet's load | The test | What it is |
|---|---|---|---|---|---|---|---|
| chop 1, 5 m/s | 1.98 s (settling) | **63°** | −54° | 6.8° of 69° | 0.45 | valid, past 0.44 > reach 0.438 | topples across |
| chop 2, 5 m/s | 1.58 s (settling) | −46° | +44° | 1.1° | 0.78 | valid, 0.458 > 0.457 | topples across |
| chop 3, 5 m/s | 1.07 s (settling) | −35° | +29° | 1.3° | 0.56 | valid, 0.386 > 0.384 | topples across |
| chop 2, 7 m/s | 1.65 s | 40° (pitch 24°) | −34° | 15.1° | 0.59 | valid, 0.323 > 0.322 | topples across |
| chop 1, 12 m/s | 1.78 s | −4° | +7° | 0.8° | 0.95 | valid, 0.545 > 0.366 | thrown across |
| chop 2, 9 m/s | 0.83 s (settling) | −5° | +2° | 0 | **0** (frozen 0.30 s) | frozen; `RECOVERABLE_ERROR` | the board dives away |
| chop 2, 12 m/s | 0.65 s (settling) | −3° | +3° | 0 | **0** (frozen 0.27 s) | frozen; `RECOVERABLE_ERROR` | the board dives away |
| chop 3, 7 m/s | 2.70 s | 28° | **−70° (MAX_BANK)** | **68.8° of 69°** | 0.01 | frozen; `RECOVERABLE_ERROR` | the room is spent |

So, by cause [M, I]:

- **Five are a real topple across, with the test inside its conditions and the room fully credited.** The feet carry
  0.45–1.03 body weights, so the freeze is not involved; and `past` passes `reach` only just, which means the test has
  already granted the rider the whole hip's angular impulse before calling it. These are falls, not readings.
- **Two are the board diving nose-down out from under the feet.** The feet carry nothing, the freeze holds the capture
  point for 0.27–0.30 s as it should, and the posture backstop separates the rider when the body is 0.25 m off its
  stance — which is what ruling 29l item 1 asked those backstops to do. The leg has 0.1 m of extension and the board
  goes further than that.
- **One is the room genuinely spent:** the hip at 68.8° of its 69° range, the bank at MAX_BANK, and the posture
  backstop. Nothing is left to try.

### The roll is the rider's own, and this is the opposite of 3.2g's pitch finding

The same twelve runs with the old rider [M]:

| | The old rider | The new rider |
|---|---|---|
| The board's roll at the end of each chop run | **−10.7° to +10.8°** | **−46° to +63°** on the five that topple |
| The body's bank | −2° to +0.2° on the eleven it holds | −54° to +44° |
| Chop glides held | 11 of 12 | 4 of 12 |

3.2g's trace showed the board's **pitch** swinging ±12° under both riders, and concluded correctly that no pitch
controller could have held it flatter: the swing was the chop's. **The roll is not like that.** It is 6 times larger
under the new rider, so it is the free body's own, and a controller could in principle hold it. [M, I]

### Why the ankle cannot hold it, in one number

The feet's half-width across is 0.13 m and the centre of mass sits 0.68 m over them, so the ankle runs out of moment
at asin(0.13/0.68) = **11° of body lean**: the toppling moment m g h sin(11°) = 93 N·m is exactly the load times the
half-width. Past 11° only the hip, the arms and the twist are left — and a human cannot step on a surfboard. [I]

The trace of chop 1 at 5 m/s shows that playing out (`results/trace-chop1-5-32h.jsonl`) [M]: the bank crosses 11° at
about 1.2 s, and the controller's commands **saturate only at 1.88 s** (the ankle at `ANKLE_REST_RANGE` 14.32°, the
twist at its grip cap of 100 N·m), with the board already at 50° of roll. The hip then has 0.1 s and reaches 6.8° of
its 69°. Three readings from that [I]:

- The loop's ankle command is small while the bank grows from 4° to 25°, and only saturates once it is hopeless. That
  is a gain question in the roll schedule at its lowest speed, not a fall-test question.
- **The hip is triggered by the ankle's command, not by the capture point.** `strategies` already drops the knees and
  puts the arms out when the capture point leaves the feet, but the hip across waits for the ankle's command to pass
  HIP_SHARE of its reach. So steps 3 and 4 of the design's order answer the capture point and step 2 does not.
- **The fall test credits a hip impulse the rider never asks for.** `reach` is `rotorImpulse` to the hip's remaining
  range — the whole of it, as if spent instantly — while the rotor needs about 0.5 s to do it and the capture point's
  own horizon is 1/ω₀ ≈ 0.3 s. Making `reach` honest would make the test stricter and the chop worse, so I did not
  touch it; it is recorded because it is a real over-credit in the test I was asked to condition.

All three are the roll loop and the order of the moves. Ruling 29l item 4 says to hand back rather than start that, and
that is what I am doing.

## 5. The save window (item 3)

The bar is tall 0.25–0.35 s and Compress 0.15–0.25 s, and the design says where it comes from: *"the save window is the
body's own tipping time, τ = √(h/g_eff)"*, which it works out as 0.29 / 0.26 / 0.24 s upright and 0.27 / 0.21 / 0.17 s
at each stance's limit (`design.md` §6). It is a property of the body, not of a particular shove.

**What the probe measures instead** [R]: the time from the capture point's first touch outside the feet to the
separation, at a shove 1.1× the largest savable one. The capture point leaves the feet at the first substep of any
shove (0.001 s), so the measure is really "how long the rider survives this shove" — and **that diverges as the shove
approaches the margin**. The ladder (`LADDER=1`, `results/bars-new-32h.jsonl`, rows `bar: "ladder"`) [M]:

| Shove, × the largest saved | 1.02 | 1.05 | 1.1 (the bar's row) | 1.2 | 1.5 | 2 | 3 |
|---|---|---|---|---|---|---|---|
| Tall: time to fall, s | 1.200 | 1.135 | **0.872** | 0.472 | 0.195 | 0.187 | 0.187 |
| Crouch | 0.942 | 0.710 | 0.540 | 0.336 | 0.165 | 0.165 | 0.165 |
| Compress | 0.986 | 0.647 | 0.328 | 0.254 | 0.144 | 0.144 | 0.144 |

The bar is read on the steep part of a divergence, two rows from the singularity. **The body's tipping time is the
asymptote**: tall 0.187, crouch 0.165, Compress 0.144 s, flat from 1.5× on and ordered tall > crouch > Compress as the
spec wants [M].

**Against the bars that is still a miss, and now from the other side**: tall 0.187 against 0.25–0.35, Compress 0.144
against 0.15–0.25 — both a little short. The shortfall has a cause I can name [M, I]: τ = √(h/g_eff), and under the
probe's shove the pair's felt gravity is **13–19 m/s²**, not 9.81, because a 150 N·s impulse through a 0.1 s low pass
is a 20 m/s² step. With h = 0.68 m that gives τ = 0.19–0.23 s, which is what the asymptote measures. At 9.81 m/s² the
same body gives 0.26 s, inside the tall bar. So the asymptote is the design's own number evaluated at the felt gravity
the test itself creates, and the remaining gap is the shove's shape, not the rider's.

**What I did not do:** change the measure in `bars.probe.ts`. The old column stays, the ladder is beside it, and the
advisor can decide whether the bar reads the asymptote. Moving the measure myself and then reporting a pass would be
marking my own homework.

## 6. The bars (item 3; steady starts, 16 substeps)

Results: `results/bars-new-32h.jsonl` (with the ladder), `bars-old-32h.jsonl`, `bars31-new-32h.jsonl`,
`e32-kicktrace-32h.jsonl`, `chopfall-32h.jsonl`, `chopfall-old-32h.jsonl`.

| Bar | Old | 3.2f | 3.2h | Pass? |
|---|---|---|---|---|
| N0: `rider=old` unchanged | — | yes | 3.1's `bars-old` byte-identical; 3.2's identical on every key the step did not add | yes |
| Held carve standing ≥ 2.28 s | 1.93 | 2.83 | **2.85** | yes |
| Held carve Compress ≥ 2.30 s | 3.0 | 2.98 | **2.98** | yes |
| Glides on the plane, 5 / 7 / 9 / 12 m/s | 4 of 4 | 4 of 4 | 4 of 4 | yes |
| **Glides on chop (3 seeds)** | 11 of 12 | 4 of 12 | **4 of 12** | **no** |
| **20 cm rise at 2 m/s: no fall** | falls 0.32 s | falls 0.42 s | **holds** | **yes** |
| **Save window**, the probe's measure at 1.1× (tall / Compress) | — | 0.85 / 0.28–0.33 | 0.87 / 0.33 | no |
| **Save window**, the ladder's asymptote (tall / crouch / Compress) | — | — | **0.187 / 0.165 / 0.144** | no (short) |
| Push recovery, 7 m/s: tall > crouch > Compress | 192 / 188 / 191 N·s | 138 / 155 / 170 | **138 / 155 / 170** | no: the order is still reversed |
| Reaction 0.08–0.12 s | 0.001 | 0.105 | 0.105 | yes |
| Mode B: damping ≥ 0.05 (5 / 7 / 9 m/s) | −0.015 / +0.079 / +0.103 | +0.030 / +0.018 / +0.058 | the same | no (superseded below) |
| **Mode B restated (29k): the bank's envelope halves within two cycles** | — | yes | **yes, the kick's trace identical to 3.2f's** | yes |
| Mode A not seen | 0.000–0.007 | 0.000–0.009 | 0.000–0.009 | yes |
| Turn pair set B ≥ 12 of 16 | 14 of 16 | 0 of 16 | suspended (ruling 29k) | — |
| N1: legs < ~2 kW per frame; ≤ 1.46 kW over 0.5 s | to 30.9 kW | 0.55 / 0.26 kW | **1.52 / 0.20 kW** | yes (but see below) |
| N2: 20° from 4 m/s, gain ≥ 3.5 m/s | +1.7 | +3.25 | suspended (ruling 29k) | — |
| (report) 3.1's N5 held carves, tall / Compress | — | 1.42 / 1.27 s | 1.43 / 1.27 s | — |
| (report) N4 placed straight down and up, the board under 5 g | 2 of 12, to 16.8 g | 12 of 12, to 1.8 g | 12 of 12, to 4.5 g | — |
| (report) the 45° line placed | 3 of 6 | 4 of 6 | **3 of 6** | — |
| (report) 20 cm rise at 1 / 4 m/s | holds / falls 0.22 s | holds / falls 0.40 s | **holds / falls 0.63 s** | — |
| (report) the knees' travel on the 20 cm rise, 1 / 2 / 4 m/s | 1.0 / 1.8 / 6.3 cm | 24 / 2.8 / 8.9 cm | **20.9 / 25 / 8.9 cm** | — |

**Three things moved on 3.1's own probe (placed starts) that are worth naming** [M]
(`results/bars31-new-32h.jsonl`):

- **N1's peak per-frame leg power goes 0.55 → 1.52 kW**, against a bar of about 2 kW, and the 0.5 s window *falls*
  from 0.26 to 0.20 kW. The peak is one row — the tilted 30° face, placed straight down — which now survives to
  **1.90 s** instead of 0.82 s and so reaches much harder water before it goes. (The row beside it, tilted 20° at 30°,
  goes 1.18 → 1.93 s.) So the extra power comes with surviving longer, not from the rule putting energy in on smooth
  water: on a plane glide neither change is active at all. It is still worth watching, because a leg spring whose rest
  is allowed to follow the body can do work in the frame it catches up.
- **The 45° placed line goes 4 of 6 to 3 of 6** (a report, never a bar; the old rider gets 3 of 6).
- 3.1's own placed rise at 4 m/s improves the same way as 3.2's: a fall at 0.30 s becomes one at 0.63 s.

- **Everything the rider does on smooth water is 3.2f's**, and the carves are within 0.02 s. The two changes act only
  where the feet go light or the balance's own knee drop is under way, and on a plane glide neither happens. [M, I]
- The chop's *held times* did move even though the count did not: chop 2 at 7 m/s from falling in the settle to 1.65 s
  into the test, chop 3 at 7 m/s from 2.25 to 2.70 s, chop 1 at 12 m/s from 1.50 to 1.78 s. Two more (chop 2 at 9 and
  12 m/s) changed cause, from the capture point to the posture backstop. [M]

## 7. The rounds, and what I am unsure of

Two rounds, as the stop rule allows [M]:

1. The fall test's validity condition, measured on the chop and the push bar. It removed the invalid fall (3.2g's
   0.10-body-weight case now survives the settle and falls 1.65 s into the test, with the board at 40° of roll), and it
   moved two more falls later, but the count stayed at 4 of 12. Then the legs' "only push" rule, which carried the 20 cm
   rise bar and left the chop count where it was.
2. The knee stiffness over 12, 8, 5 and 3 kN/m, and the chop ridden in the crouch and in Compress. Both negative, both
   reported above. I stopped there, as ruling 29l item 4 says to.

What I am unsure of:

- **The 0.2 body weights is reasoned, not measured.** The reasoning (the foot's moment is bounded by the load) gives an
  order, not a value; the trough's 0.10 and the shove's 0.50 bracket it, and anything in 0.15–0.35 would behave the
  same on today's bars. If a later step finds the gate mattering, that is the number to question first.
- **I cannot reconcile the sources on the knee spring with the measurement.** The sources put a leg absorbing a 0.2 m
  stroke at a few kN/m; every value I tried under 20 kN/m made the chop worse. My reading is that the leg is not the
  binding constraint while the across axis is losing, so the softer spring only gives the body more freedom to go the
  way it was already going. That is a guess.
- **The two "board dives away" falls may not be falls.** A board that drops 0.16 m out from under a surfer's feet is a
  moment they ride out; the game separates the rider when the body is 0.25 m off its stance. The backstop is doing what
  the ruling asked, but whether `RECOVERABLE_ERROR` of 0.25 m is the right number for a *free* body (it was set for a
  rigid one) is a question I did not open.
- **The chop at 5 m/s may not be a fair bar.** The hull there sits at a 19° trim with 21 cm of draft (3.2g's plant), so
  it is a barely-planing board with the weakest roll plant of any speed measured — the same objection that moved the
  2 m/s rise to a report, one step up. All three seeds fail there and all three fail *during the settle*, before the
  test begins. I report the objection; I did not act on it.

## 8. What was not run

- **The merge checks** (the full suite, the Canyon byte check, the fps trace): the chop and the save window still miss,
  so by ruling 29j's rule nothing merges. Run here: `tsc` (app and server, both clean); the four model and rider test
  files (`humanBalance.test.ts`, `predictiveBalance.test.ts`, `standingBody.test.ts`, `rollModel.test.ts`), 37 tests
  passing with the new one for the freeze; and `src/game/PhysicalMode.test.ts` (92 tests), which carries the
  `?rider=new` switch. Those four files and `PhysicalMode` are the only tests in the tree that build a `rider: 'new'`
  rider at all, and both changes are inside `freeBody`, so nothing else can see them (`src/physics` as a whole was left
  for the merge run).
- The turn pair and N2 (suspended, ruling 29k), and the pitch loop (held, ruling 29l).
- No ride, no game page, no Basilisk case.

## 9. How it rides, and what is still missing (for the owner)

Plain words, as the ruling asks.

**What changed in this step:**
- The game no longer calls a fall when the board drops away under the rider. Before, a small bump could make the rider
  weightless for a moment, and the game read that as a fall even though nothing was wrong. Now it waits until the feet
  carry weight again before it judges.
- The rider's legs now bend properly. Before, the knees gave about 3 cm on a bump. Now they give up to 25 cm, like a
  real rider soaking it up. A surface rising fast under the board used to throw the rider off; now it does not.
- Carving is unchanged: still 2.9 seconds standing and 3.0 in a crouch, the best the rebuild has done.

**What is still wrong:**
- **On choppy water the rider still falls over sideways.** This is the real problem now, and it is not the same one as
  before. I measured it: the old rider's board stays almost flat on this water, within 11 degrees. The new rider's
  board rolls over to 35, 50, even 63 degrees, and the rider goes with it. So the board is not being tipped by the
  water — the rider is tipping it.
- The reason is simple. Standing on a board, your feet are only about 13 cm wide side to side, and your weight is 68 cm
  above them. That gives you about 11 degrees of lean before your ankles run out of strength. After that only your hips
  and arms can help, and they are slow. On land you would take a step. On a board you cannot.
- The rider's hips are also late. They only start to help once the ankles are already at their limit, which by then is
  too late.
- Still no pumping, so the two-turn test still fails on speed, not balance.

**My honest view:** the two things this step was asked to fix are fixed, and they were real faults. But they were not
what the chop bar is failing on. The chop is a side-to-side problem in the rider's own steering of the board at slow
speed, and it needs the roll loop opened again — which the ruling told me not to start. I would not put this in front
of you to ride yet: on flat water and in a carve it is good, but a choppy wave face would still drop you.

## Files (3.2h)

- `src/physics/humanBalance.ts`: `CAPTURE_LOAD` with its reasoning, the gate at the head of `capture` (a new `load` and
  `h`, both defaulted so the existing callers and tests read as before), `frozen`, `lightFor` and `lightLongest`, and
  the reset.
- `src/physics/AttachedRider.ts`: `captureLoad` (the feet's load this substep, in body weights) and its pass into
  `captureStep` → `capture`; the "feet on a deck only push" rule extended to the balance's own knee drop in
  `prepareLeg`.
- `src/physics/humanBalance.test.ts`: one test for the freeze (it holds the state, calls no fall, does not clear one,
  and reads again on the way back into load).
- `docs/research/new-rider/3.2/bars.probe.ts`: `STANCE` on the glide part; `beyondAfter`, `lostWindowS` and `loadMin`
  on the push rows; `LADDER=1` for the window against the shove's size.
- `docs/research/new-rider/3.2/e32.probe.ts`: PART=chopfall (the twelve chop glides with the last eight frames before
  each fall); `SHOVE` on the trace's shove, and the capture state, the leg and the posture error in the trace's rows.
- `results/`: `bars-new-32h.jsonl`, `bars-old-32h.jsonl`, `bars31-new-32h.jsonl`, `e32-kicktrace-32h.jsonl`,
  `chopfall-32h.jsonl`, `chopfall-old-32h.jsonl`, `trace-chop1-5-32h.jsonl`, `trace-chop2-32h.jsonl`,
  `trace-chop2-32h-legs.jsonl` (the 3.6 kN pull, taken with the freeze in and the legs' rule still out),
  `glide-stance-32h.jsonl` (the stance sweep), `glide-knee-32h.jsonl` (the stiffness sweep),
  `push-gate010-32h.jsonl` and `push-gate040-32h.jsonl` (the gate's sensitivity).

---

# Part 9: step 3.2i, the hip in time — built, measured, refuted (ruling 29m)

Written 2026-11-13 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32i` (from
`claude/rider-new-32h`, rebased on main a17f5e1d). The contract: `../ruling-29.md` 29m.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **Miss. The chop stays at 4 of 12, and both of the ruling's two changes are built, measured and refuted.** Neither is
  kept, so the game behaves exactly as 3.2h does and the bars are 3.2h's to the digit. What the step delivers is three
  measurements and the real cause.
- **The hip triggered from the capture point is pumped, not late** [M]. On a **plane**, with a pure shove and no chop at
  all, the capture point rings in and out of the feet at about **2 Hz**; `BALANCE_DELAY` is a fifth of that period, and
  any demand over 0.1 × SWING_TORQUE switches off `humanSwingStep`'s own centring (its `back` term). So the swing rotor
  ratchets — **0 → −55° of its ±69° range in 1.3 s** — and the board rolls with it, because the swing's reaction is a
  couple on the board through the feet. The tall push bar's largest saved shove fell **1.887 → 0.615 m/s** asking the
  hip at the knees' own scale, and **→ 1.061 m/s** asking it only for the moment the capture point needs. The chop went
  4 → 3 → 4 of 12.
- **The reach's horizon cap buys nothing on the chop and costs the push bar 44 %** [M]. With the arms in, the hip's
  inertia is 6 kg·m² and the cap does not bind at all (τ/ω₀ = 58 N·m·s against √(2 I τ left) = 53.7), so the twelve chop
  cells come out **identical to 3.2h's, cell for cell**. Under a shove it binds hard, because ω₀ is read from a felt
  gravity the impulse itself inflates to 13–19 m/s², and the saved shove falls 1.887 → 1.061 m/s with the tall carve
  2.85 → 2.75 s.
- **So my own Part 8 claim was wrong, and the ruling repeated it.** Part 8 said making `reach` honest "would make the
  chop worse"; that was an [I], not an [M], and ruling 29m took it as measured and used it to bundle the two changes.
  **Measured, it makes no difference to the chop whatever.** The bundling was not needed.
- **The real cause, measured, and it is not the hip's trigger** [M]: **the roll loop asks the ankle for its whole range
  only at about 40° of body bank, while the ankle's authority ends at 11°.** In the chop 1 / 5 m/s fall the bank crosses
  11° at 1.2 s and the loop's ankle command reaches `ANKLE_REST_RANGE` only at **1.88 s** — 0.68 s in which three
  quarters of the ankle's range sat unused while the capture point was 0.06–0.20 m outside the feet. The hip was never
  the thing that was late. **The ankle was not being asked.**
- **The chop by speed and seed** [M]: 5 m/s is **0 of 3**, and all three fail *during the 2.5 s settle*, before the test
  begins. 7, 9 and 12 m/s are 2 of 3 each. The numbers are in §4; the ruling asked for them and not for my opinion.

## 2. The hip from the capture point (item 1)

### What was built

`HumanBalance` gained the signal: `CaptureState.pastAcross`, how far past the feet's edge the capture point is
**across**, signed with the side it is past and zero inside, carried on a fourth delay-line channel and read back as
`sensedCaptureAcross` — the same shape as `sensedCapturePast`, which the knees and the arms already answer. That part is
kept (§7). On top of it the hip's demand gained a term, in two forms, both measured:

- **(a) the knees' own scale:** the hip's whole torque once the point is KNEE_PAST_FULL (0.15 m) past the edge, in
  proportion under that. This is the literal reading of "as the knees and the arms already are".
- **(b) the need:** `rotorImpulse`'s conversion read backwards. The test turns an angular impulse L into a
  capture-point distance L / (m h ω₀), so bringing the point back from `past` needs L = past · m h ω₀, and delivering
  that inside the point's own horizon of 1/ω₀ s needs **past · m h ω₀²** — 29 N·m at 0.05 m out, 86 N·m at 0.15 m,
  against the hip's 200 N·m. No free gain, and the action and the test are then the same arithmetic in both directions.

The sign was taken from the loop, not guessed: in the chop 1 / 5 m/s trace the capture point out at +x goes with the
loop's own ankle command negative, so the capture term carries the same sign the existing hip path already gives that
lean [M, R]. The trace confirms it does the right thing at first — at 1.35–1.62 s the swing goes to −11.6° and **the
board's roll comes down from 19.4° to 11.6° and the capture point from 0.187 m to 0.024 m.** The hip saves it once.

### Why it fails, and it is not the trigger

`results/trace-shove-tall-hipfull-32i.jsonl` [M]: form (a), tall, a 0.7 m/s shove, on a **plane** — no chop:

| t (s) | capture point across (m) | past the feet (m) | swing (°) | board roll (°) |
|---|---|---|---|---|
| 2.52 | +0.258 | 0.128 | 0 | −0.3 |
| 2.77 | −0.124 | 0 | −4.5 | −10.6 |
| 3.02 | +0.110 | 0 | −10.5 | −10.1 |
| 3.27 | −0.031 | 0 | −15.4 | +3.5 |
| 3.52 | +0.307 | 0.177 | −37.5 | −2.9 |
| 3.77 | −0.547 | 0.417 | **−54.1** | −1.0 |

- The capture point **crosses the feet's middle five times in 1.27 s — about 2 Hz** — and is outside the feet in 40 of
  77 frames, by a median of 0.106 m. That is the balance loop's own ringing on smooth water, and the rider survives
  shoves of 1.887 m/s through it in 3.2h: these excursions are normal, not a loss of balance. [M]
- **The swing never comes back.** It ratchets one way through every cycle, to −54° of its ±69°. Two things make it
  ratchet, and both are in the code already [R]: `humanSwingStep`'s centring spring is scaled by
  `back = max(0, 1 − |demand| / (0.1 · SWING_TORQUE))`, so **any demand over 20 N·m switches the centring off** (the
  design's own way of saying "the body still needs the swing, do not give it back"); and the demand is read
  BALANCE_DELAY late, which at 2 Hz is a fifth of a period of phase lag on a signal that is already oscillating.
- **And a thrown hip rolls the board.** The swing's reaction is a couple on the board through the feet, and the board's
  roll stiffness at 7 m/s is −285 N·m/rad (3.2f's plant), so 200 N·m of hip is 0.7 rad of equivalent roll. The hip
  strategy is not free on a surfboard: windmilling tips the board. `reach` does not know this — it counts only the
  capture-point shift the rotor buys and not the roll it pays. [M, I]

The consequence is a regression on the bar the ruling told me to guard, and it is not the fall test getting easier —
it is the rider genuinely falling sooner [M]:

| | 3.2h | (a) the knees' scale | (b) the need |
|---|---|---|---|
| Largest shove saved, **tall** | **1.887** | **0.615** | **1.061** |
| crouch | 2.127 | 2.209 | 2.162 |
| Compress | 2.326 | 2.408 | 2.361 |
| Held carve tall / Compress | 2.85 / 2.98 | 2.90 / 2.98 | — |
| Mode B (5 / 7 / 9 m/s) | 0.030 / 0.018 / 0.058 | identical | — |
| Chop glides | 4 of 12 | 3 of 12 | 4 of 12 |

The stance ordering is the tell: the crouch and Compress get slightly **better**, and only the tall stance collapses.
Their hip ranges are ±0.8 and ±0.4 rad against the tall stance's ±1.2 (`stanceRoom`), so the more range the rider has
to throw, the more harm a pumped hip does. [M, I]

**Not kept.** It regresses the push bar's saved shove, which ruling 29m lists as must-not-regress, and I could not fix
it without either changing `humanSwingStep`'s centring rule or putting a damping gain on the new term — the first is the
swing's own design and the second is the tuning the stop rule forbids. The signal is kept; the demand is not.

## 3. The reach's horizon (item 2)

`rotorReach(inertia, torque, left, horizon) = min(τ · horizon, √(2 I τ left))`: the rotor driven at τ gives τ t, so
inside a horizon it can give at most τ · horizon, and never more than its remaining range allows. The horizon is the
capture point's own, 1/ω₀. The formula is in `humanBalance.ts` with its derivation; **it is not wired**, and these are
the measurements that say why [M] (`results/bars-reachonly-32i.jsonl`, with the hip's term off):

| | 3.2h | with the horizon cap |
|---|---|---|
| Chop glides, cell for cell | 4 of 12 | **identical, every cell** (chop 1 at 12 m/s 1.78 s, chop 2 at 7 m/s 1.65 s, chop 3 at 7 m/s 2.70 s …) |
| Largest shove saved, tall | 1.887 | **1.061** |
| Held carve tall | 2.85 s | 2.75 s |

- **It does not bind where the chop fails.** The hip's inertia is `SWING_INERTIA_SET` 6 kg·m² with the arms in, so
  √(2 · 6 · 200 · 1.2) = **53.7 N·m·s** while τ/ω₀ at ω₀ ≈ 3.4 is **58 N·m·s**: the range runs out before the horizon
  does, and the cap is inert. That is why the twelve chop cells do not move by a frame. [M, I]
- **It binds in the two places the arms go out**, because `strategies` puts the arms out with the knees whenever the
  capture point leaves the feet, and that raises the rotor's inertia to `SWING_INERTIA_ARMS` 10 kg·m², so the uncapped
  reach becomes 69 N·m·s and the horizon does bind. In a carve that costs 0.1 s (2.85 → 2.75). Under a shove it binds
  doubly: the pair's felt gravity is 13–19 m/s² (Part 8 §5), so ω₀ reaches 6.6 and the horizon 1/ω₀ falls to 0.15 s,
  halving τ · horizon to 30 N·m·s. **The cap is therefore harshest exactly where ω₀ is an artefact of how the shove is
  applied.** [M, I]
- **So the formula is right and the horizon it was given is not.** It waits for a horizon that does not come from the
  felt gravity — the plain √(h/g) would give 0.26 s everywhere and make the cap inert, which is no use either. That is
  a real open question and I did not invent an answer to it.

And the correction I owe: **Part 8's claim that an honest reach would make the chop worse was an inference, not a
measurement**, and ruling 29m took it as measured and bundled the two changes on it. Measured, the chop does not move
at all. The bundling cost nothing, but it was not founded.

## 4. The chop by speed and by seed (item 3)

The bars' own twelve glides: a steady start on the terminal plane under each seeded chop, 2.5 s to settle, then 3 s.
`*` marks a fall **during the settle**, before the test begins. Cells are old rider / 3.2h / 3.2i. [M]
(`results/bars-old.jsonl`, `bars-new-32h.jsonl`, `bars-new-32i.jsonl`.)

| Seed | 5 m/s | 7 m/s | 9 m/s | 12 m/s |
|---|---|---|---|---|
| chop 1 | hold / **0 \*** / 0 \* | hold / hold / hold | hold / hold / hold | hold / 1.78 s / 1.78 s |
| chop 2 | hold / **0 \*** / 0 \* | hold / 1.65 s / 1.65 s | hold / **0 \*** / 0 \* | 0 \* / 0 \* / 0 \* |
| chop 3 | hold / **0 \*** / 0 \* | hold / 2.70 s / 2.70 s | hold / hold / hold | hold / hold / hold |

By speed, the new rider holds **0 of 3 at 5 m/s, 2 of 3 at 7, 2 of 3 at 9, 2 of 3 at 12**; the old rider holds 12 of 12
except chop 2 at 12 m/s. By seed it is 2 of 4 (chop 1), 0 of 4 (chop 2), 2 of 4 (chop 3).

What the grid says, without my opinion on it [M]:

- **The whole 5 m/s column fails, and all three fail during the settle** — at 1.07, 1.58 and 1.98 s of the 2.5 s, so
  none of the three reaches the test at all.
- The hull there is at a 19.3° trim with 21.5 cm of draft, and its roll stiffness is the weakest of any speed measured
  (3.2f's plant: K per roll −285 N·m/rad at 7 m/s; 3.2g's pitch plant at 5 m/s has the draft and trim above). The old
  rider holds all three, so it is not impossible water; it is water the free body cannot hold with the authority it has.
- **Chop 2 fails at every speed**, including the one speed where the old rider also fails (12 m/s). It is the harshest
  of the three seeds for both riders.
- Nothing in the 3.2i grid moved from 3.2h: the two changes are not in the kept build.

## 5. The fall at the moment the ankle saturates (the stop rule's trace)

`results/trace-chop1-5-hipfull-32i.jsonl` and 3.2h's `trace-chop1-5-32h.jsonl`, chop 1 at 5 m/s [M]:

| t (s) | board roll (°) | body bank (°) | the loop's ankle command (°) | the ankle's rest (°) | hip (°) | capture point past the feet (m) |
|---|---|---|---|---|---|---|
| 0.68 | 8.1 | −6.8 | 2.9 | 2.6 | 0 | 0 |
| 1.18 | 12.1 | **−11.3** | 3.8 | 2.9 | 0 | 0 |
| 1.22 | 13.5 | −12.4 | 4.3 | 3.6 | 0 | 0.057 |
| 1.62 | 21.7 | −24.6 | 0.9 | −2.0 | 0 | 0.113 |
| 1.75 | 31.6 | −32.7 | 9.0 | 4.8 | 0 | 0.167 |
| **1.88** | **49.6** | −42.6 | **14.32 (saturated)** | 7.1 | −1.1 | 0.221 |
| 1.98 | 63.1 | −53.8 | 14.32 | 1.0 | −6.8 | 0.440 → fall |

- **The body's bank crosses 11° — the whole of the ankle's authority across — at 1.18 s.** The ankle's moment there is
  m g h sin(11°) = 93 N·m, which is exactly the load times the feet's 0.13 m half-width: past it the ankle has nothing
  left to give, whatever rest it is asked for. [M, I]
- **The loop's ankle command reaches `ANKLE_REST_RANGE` only at 1.88 s**, by which time the board is at 50° of roll.
  For the 0.7 s in between it asks for 0.9–9.0° of a 14.32° range — **three quarters of the ankle unused** — while the
  capture point sits 0.06–0.22 m outside the feet.
- The ratio is steady and it is the number to take away: the loop asks about **0.35–0.41 rad of ankle rest per rad of
  bank**, so it asks for the ankle's whole range at a bank of **about 40°**, nearly four times the 11° where the ankle's
  authority ends. [M]
- **So the hip did not arrive late because of its trigger. It arrived late because the thing ahead of it in the order
  was never asked for.** The predictive loop's state is the board's roll and rate, the body's bank and rate, the twist,
  the yaw and the slip (`predictiveBalance.ts`); **there is no term in it for where the body's weight is over the feet**,
  so nothing in the loop knows the ankle is out of authority at 11°, and the gains were designed for stability margins
  rather than against a saturation limit. That is the roll loop, which ruling 29l and 29m both hold. [R, I]

## 6. The bars (item 4; steady starts, 16 substeps)

`results/bars-new-32i.jsonl` is **identical to `bars-new-32h.jsonl` row for row, all 30 rows**, and
`bars-old-32i.jsonl` likewise, because the kept build changes nothing the game does. The table is here so the advisor has one place to read it [M]:

| Bar | Old | 3.2h | 3.2i | Pass? |
|---|---|---|---|---|
| N0: `rider=old` unchanged | — | 3.1's `bars-old` byte-identical | 3.2's `bars-old` identical row for row, 3.1's byte-identical | yes |
| Held carve standing ≥ 2.28 s | 1.93 | 2.85 | **2.85** | yes |
| Held carve Compress ≥ 2.30 s | 3.0 | 2.98 | **2.98** | yes |
| Glides on the plane | 4 of 4 | 4 of 4 | 4 of 4 | yes |
| **Glides on chop (3 seeds), bar 11 of 12** | 11 of 12 | 4 of 12 | **4 of 12** | **no** |
| 20 cm rise at 2 m/s: no fall | falls 0.32 s | holds | **holds** | yes |
| **Save window, the asymptote, ordered and within 20 % of √(h/g_eff)** | — | 0.187 / 0.165 / 0.144 | **the same** | **yes** |
| Push recovery: largest shove saved (tall / crouch / Compress) | 192 / 188 / 191 N·s | 138 / 155 / 170 | **138 / 155 / 170** | yes (unchanged, the guard holds) |
| Push recovery ordered tall > crouch > Compress | yes | no (reversed) | no (reversed) | no |
| Reaction 0.08–0.12 s | 0.001 | 0.105 | 0.105 | yes |
| Mode B: the bank's envelope halves within two cycles | — | yes | yes (the kick's rows identical) | yes |
| Mode A not seen | 0.000–0.007 | 0.000–0.009 | 0.000–0.009 | yes |
| N1: legs < ~2 kW per frame | to 30.9 kW | 1.52 kW | **1.52 kW** | yes |
| Turn pair, N2 | 14 of 16, +1.7 | suspended (29k) | suspended | — |

**The save window now passes** on 29m's restated measure: the asymptote is 0.187 / 0.165 / 0.144 s, ordered
tall > crouch > Compress, and √(h/g_eff) at the test's own felt gravity (h = 0.68 m, g_eff 13–19 m/s²) is 0.19–0.23 s,
so the tall row is inside 20 % and the lower stances are shorter for the reason the spec wants. **The chop is the only
bar of the step still missing**, with the push ordering (29's own, long-standing) beside it.

## 7. What is in the tree, and what is not

**Kept** (no change to what the game does):
- `CaptureState.pastAcross`, the fourth delay-line channel and `HumanBalance.sensedCaptureAcross`: the signal the hip
  would answer, sensed BALANCE_DELAY late like everything else. Written only inside `capture`; nothing in the game
  reads it, the probes do. It is here because the next step needs it and it costs nothing.
- `rotorReach`, with its derivation and with the measurements above recorded against it in its own comment. Not wired.
- The notes in `captureStep` and in `rotorReach` saying what was measured and why neither is wired, so the next agent
  does not spend a round rediscovering it.

**Not kept:** the hip's demand from the capture point, in either form, and the horizon cap in `reach`. Both regress the
push bar's largest saved shove, which ruling 29m lists as must-not-regress, and the stop rule's two rounds went on
measuring them honestly rather than on finding a third form that scrapes past.

## 8. What I am unsure of, and what was not run

- **Whether the hip is salvageable at all on a board.** Two of the three obstacles are structural, not gains: the swing
  rotor's centring is switched off by any demand over 20 N·m, and the rotor's reaction rolls the board. A form that
  damped the demand by the swing's own rate would probably stop the ratchet, but it is a new gain and the stop rule
  forbids it; I would want it designed on the roll model (as 3.2d designed the rest) rather than hand-set.
- **Whether `reach` should be capped at all.** The formula is right. Its horizon is the one quantity in the test that
  comes from the felt gravity, and the felt gravity is exactly what 3.2h found untrustworthy under an impulse. I have no
  honest horizon to offer.
- **The 2 Hz ring.** I measured it on a plane under one shove in one stance. I did not check whether it is the balance
  loop's design frequency or an artefact of the probe's instantaneous shove, and that matters for how seriously to take
  it.
- **The 5 m/s question.** The grid is in §4; the reading is the advisor's, as the ruling says.
- **Not run:** the merge checks (the chop still misses, so nothing merges), the turn pair and N2 (suspended, 29k), the
  pitch loop (held, 29l). No ride, no game page, no Basilisk case.

## 9. How it rides, and what is still missing (for the owner)

Plain words, as the ruling asks. **Nothing changed in how it rides this time.** I tried two things, measured both, and
took both out because they made it worse. So it rides exactly as the last step left it.

**What I tried, in plain words:**
- When you stand on a board your ankles can only hold you to about 11 degrees of lean. That is simple geometry: your
  feet are about 13 cm wide side to side and your weight sits 68 cm above them. Past 11 degrees your ankles have
  nothing left, and your hips have to take over.
- The rider's hips were waiting too long. So I made the hips start as soon as the rider's weight goes outside its feet.
- **It did not work, and I can say exactly why.** When you ride, your weight wobbles in and out over your feet about
  twice a second. If the hips answer every one of those wobbles, they swing a little further each time and never come
  back — after a second they are all the way over and the rider goes down. And on a surfboard swinging your hips also
  rolls the board, so a rider throwing its hips tips its own board over. A shove the rider used to survive at
  1.9 m/s now took it down at 0.6 m/s. So the hips came out again.

**What I found instead, and this is the real problem:**
- The rider's balance brain does not ask its ankles for enough. It asks for the ankles' full effort only at about
  40 degrees of lean — but the ankles stop working at 11 degrees. So for most of a fall the rider has three quarters of
  its ankle strength sitting unused, and by the time it does ask, the board is already 50 degrees over and nothing can
  save it.
- The reason is that the balance brain does not know where the rider's weight is over its feet. It watches the board
  and the body's angle, not the weight. That is the piece to fix, and it is a bigger job than one rule.

**Where the rider stands today:**
- Flat water, any speed: fine.
- A hard carve: 2.9 seconds standing, 3.0 crouched. Better than the old rider.
- A shove: it saves about 1.9 m/s standing, and it answers in a tenth of a second like a person.
- A surface rising fast under the board: fine now, the knees soak it up.
- **Choppy water: it falls.** It holds 4 of 12 chop tests against the old rider's 11. At the slowest speed (5 m/s) it
  falls all three times, and so quickly that it never even finishes settling.
- No pumping yet, so it still cannot gain speed and link two turns.

**My honest view:** I would not ask you to ride this yet, and I would not want you to spend a session on it until the
balance brain is taught about the rider's weight over its feet. On a flat, clean wave face it would feel good; on
anything bumpy the first chop would drop you. The carving is genuinely better than the old rider and that part is
worth keeping.

## Files (3.2i)

- `src/physics/humanBalance.ts`: `CaptureState.pastAcross`, the fourth delay-line channel, `sensedCaptureAcross`, and
  `rotorReach` with its derivation and with the measurement that says why it is not wired.
- `src/physics/humanBalance.test.ts`: one test for `rotorReach` (including the inert case with the arms in).
- `src/physics/AttachedRider.ts`: the note in `captureStep` recording what the horizon cap cost.
- `results/`: `bars-new-32i.jsonl`, `bars-old-32i.jsonl` (N0); `glide-hipfull-32i.jsonl` and `bars-hipfull-32i.jsonl`
  (the hip at the knees' scale); `bars-hipneed-32i.jsonl` (the hip at the need); `bars-reachonly-32i.jsonl` (the
  horizon cap alone); `trace-chop1-5-hipfull-32i.jsonl` and `trace-shove-tall-hipfull-32i.jsonl` (the ratchet).
- No change to what the game does.

---

# Part 10: step 3.2j, the variable the loop was missing (ruling 29n)

Written 2026-11-13 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32j` (from
`claude/rider-new-32i`, rebased on main 917efc89). The contract: `../ruling-29.md` 29n.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **Miss, at 8 of 12 against a bar of 11 — but the chop doubled, and every cell of that came from the settle, not from
  the controller.** Fixing the probe's settle (ruling 29n's decision 2) takes the chop from 4 of 12 to **8 of 12** with
  the rider byte-for-byte as 3.2h left it [M]. The controller change is built, measured and **refuted by the guard bar**,
  and is not kept.
- **The quantity the loop was missing is not a state.** On this plant the body is a point mass on its leg, so the
  capture point across is the **linear functional ξ = L (θ + θ̇/ω₀)** of two states the loop already carries. Adding it
  would have been a duplicate. What the loop was missing is the **cost**: a diagonal Q penalises θ² and θ̇² separately
  and can never express the cross term 2 θ θ̇ / ω₀, and that cross term is the whole difference between a bank that is
  coming back and one that is going over. [I, R]
- **A second thing was missing, and it is plainer: the design was told the ankle may give a third of what it has.**
  `commandScale[0]` is 0.09 rad against `ANKLE_REST_RANGE` 0.25 — **36 % of the bound** — and Bryson's rule is that a
  command's scale is the largest *acceptable* command. That, not the state vector, is the direct reason the loop asks
  3.8° at 11° of body bank. [R, I]
- **The model could not have found the bound, because it had neither input saturation nor a fall test.** With the
  commands clipped at their real bounds and the game's own fall test on it (the capture point past the feet plus the
  room), the model reproduces the game's pathology exactly: at 5 m/s the base design lets the capture point reach
  **40.8 cm** while asking **2.65° of a 14.32° ankle**, and 5 m/s is weak by a factor of three (a disturbance margin of
  47.7 rad/s² against 131.8 at 7 and 174.0 at 9). [M]
- **On the model the fix works: +51 to +65 % of disturbance margin**, and it is the first design in which the ankle
  reaches its bound at 5 m/s at all. **In the game it collapses the saved shove in the lower stances** — the crouch
  2.127 → 0.79–0.89 m/s and Compress 2.326 → 0.42–0.79 — for *every* variant that raises the gain, including the
  mildest. The model's own robustness warned (the delayed-sense damping at 5 m/s −0.128 → −0.241) and I underweighted
  it. The guard bar is what caught it, twice in two steps. [M]
- **Explicit constraint handling is worse, measured.** A reference governor that drives the ankle to its bound whenever
  the *predicted* capture point is outside the feet — the textbook capture-point balance law — costs **−60 % of
  disturbance margin at 5 m/s** on the model (18.9 against 47.7). So the ruling's open question has an answer: neither
  the bang-bang constraint law nor a big re-weighting. **The binding constraint is the loop's robustness on the game's
  plant, not the ankle's bound.** [M, I]

## 2. The model first (item 2)

`src/physics/predictiveBalance.ts`: `captureRow(y)` and `DesignWeights.captureScale`.
`docs/research/new-rider/3.2/predict.probe.ts` PART=bound. Results `results/predict-bound-32j.jsonl`.

### What the model was missing

Two things, and both had to be added before any design could be judged [R, M]:

- **No input saturation.** `timeRun` and the gate both ran the commands unclipped, so no design in 3.2d–3.2i could ever
  meet the ankle's 0.25 rad bound, let alone be designed against it.
- **No fall test.** The old run stopped only at |θ| > 0.7 rad. The game stops when the capture point passes the feet by
  more than the room the hip can catch, which in the game's traces is 0.13 + 0.28–0.32 m. With that in, the model's
  runs end where the game's do.

The disturbance is the chop's shape: a sinusoidal roll acceleration on the board at 1.8 Hz, and the measure is the
**disturbance margin** — the largest amplitude the design survives for 4 s, by bisection. It is monotone and it compares
designs cleanly.

### What the base design does, with the bound in

| | 5 m/s | 7 m/s | 9 m/s |
|---|---|---|---|
| Disturbance margin, rad/s² | **47.7** | 131.8 | 174.0 |
| Peak capture point | 40.8 cm | 40.8 | 40.8 |
| Peak ankle command, of 14.32° | **2.65°** | 10.18° | 8.97° |
| Share of frames at the bound | **0** | 0 | 0 |

**The model reproduces the game's fault.** At 5 m/s the loop lets the capture point run to 41 cm — three times the
feet's half-width — while never asking the ankle for more than a fifth of its range, and 5 m/s is weak by a factor of
three. That is the trace of Part 9 §5, on the model. [M]

### What the new cost buys

The designs: `bound` is `commandScale[0] = 0.25`, the ankle's real range; `capture c` is `captureScale = c` m. Tall
stance [M]:

| design | margin at 5 m/s | at 7 | at 9 | ankle gain on the bank | kθ / kθ̇ | nominal damping at 5 m/s |
|---|---|---|---|---|---|---|
| base (3.2h) | 47.7 | 131.8 | 174.0 | −1.98 | 14.8 | 0.579 |
| bound only | 48.8 | 155.0 | 199.2 | −4.35 | 14.9 | 0.494 |
| capture 0.05 only | 50.6 | 137.5 | 183.8 | −2.19 | 13.3 | 0.554 |
| bound + capture 0.02 | 68.8 | 159.6 | 215.4 | −5.25 | 9.3 | 0.384 |
| **bound + capture 0.013** | **78.7** | 158.6 | 218.4 | −5.82 | **7.6** | 0.337 |
| bound + capture 0.008 | 69.1 | 156.1 | 215.8 | −6.42 | 6.3 | 0.301 |
| bound + capture 0.005 | 62.3 | 153.1 | 207.4 | −6.88 | 5.7 | 0.283 |

- **The margin peaks at `captureScale` 0.013 m in all three stances** and turns over below it: tall 47.7 → **78.7**
  (+65 %), crouch 48.2 → **78.9** (+64 %), Compress 48.4 → **73.1** (+51 %) [M].
- **0.013 is picked by a stated condition, not by taste:** it is the tightest value at which the loop reaches the
  ankle's bound **at 5 m/s** — the speed that fails — before the capture point leaves the feet, which is exactly
  "spend it early, while it still exists". At 0.02 the ankle still never saturates at 5 m/s; at 0.013 it is at the bound
  for 40 % of the frames. [M, I]
- **The gain ratio is the tell.** A controller acting on ξ alone would have kθ/kθ̇ = ω₀ = 3.8. The base design sits at
  14.8, i.e. it is almost blind to the bank's *rate*, which is half of the capture point. The capture cost walks it from
  14.8 down toward 7.6. [M, I]
- **Loosening the bank's own scales barely matters** (the margin goes 77.7 at ×1 to 78.7 at ×12), so the bank and its
  rate keep their own limits and only two numbers change. [M]
- **The robustness gate is not worsened, and it was already failing.** 3.2d's gate has missed since it was written
  (0 of 51 points pass with the base weights, 1530 of 10200 random plants unstable); with the new weights it is 0 of 51
  and **1541** — within noise of the same. The nominal damping's worst falls from 0.452 to 0.280, still far above the
  gate's 0.05. So the model gave no reason to stop. [M]

### The governor, which is the structure the ruling asked about

The textbook capture-point law: while the **predicted** capture point is outside the feet, the recoverable set of a
bounded-input inverted pendulum has already been left, so command the ankle to its bound toward the side it is going.
No gain of its own. On the model [M]:

| | 5 m/s | 7 m/s | 9 m/s |
|---|---|---|---|
| base | 47.7 | 131.8 | 174.0 |
| base + governor | **18.9** | 60.6 | 72.0 |
| bound + capture + governor | 22.1 | 90.4 | 98.8 |

**It costs 55–60 % of the margin everywhere.** The reason is the same one the hip hit in 3.2i: the capture point is
outside the feet routinely and for short stretches, so a law that slams the input every time it happens is a bang-bang
loop closed on a signal that is already oscillating. **So the answer to 29n's question is: not explicit constraint
handling, and (below) not a re-weighting either.** [M, I]

## 3. In the game: the guard bar refuses it (item 2's outcome)

Built as the model asked — `commandScale[0] = 0.25`, `captureScale = 0.013` — and then split, because the first
measurement was a collapse. Each row is one build of the game [M] (`results/predict-weights-32j.jsonl`):

| `commandScale[0]` | `captureScale` | Saved shove, tall / crouch / Compress (m/s) | Held carve tall / Compress (s) | Chop |
|---|---|---|---|---|
| **0.09 (kept)** | **off** | **1.887 / 2.127 / 2.326** | **2.85 / 2.98** | 8 of 12 |
| 0.25 | off | 1.629 / **0.791** / **0.580** | 2.75 / 2.82 | — |
| 0.09 | 0.013 | 1.975 / **0.891** / **0.785** | 2.58 / 2.87 | — |
| 0.25 | 0.03 | **0.516 / 0.451 / 0.416** | 2.63 / 2.72 | — |
| 0.25 | 0.013 | **0.205 / 0.234 / 0.258** | 2.47 / 2.52 | 8 of 12 |

- **Every variant that raises the ankle's gain collapses the crouch and Compress saved shove**, from 2.1–2.3 m/s to
  0.4–0.9, including the mildest one tried. The tall stance tolerates it, and with the capture cost alone it even
  improves (1.887 → 1.975) — but the lower stances do not, and they are where a surfer actually rides. [M]
- **Why the lower stances.** Their centre of mass is 0.65 and 0.55 m against the tall stance's 0.85, so ω₀ is higher and
  the loop is faster; the same gain rise eats more of the 0.1 s delay's phase margin. The model saw it: the crouch and
  Compress had the lowest nominal damping of the new design (0.304 and 0.290 against tall's 0.337) and the delayed-sense
  damping at 5 m/s went −0.128 → −0.241. [M, I]
- **And it bought nothing on the chop:** 8 of 12 either way, with one cell's held time up (chop 1 at 12 m/s, 0.2 →
  2.02 s) and one down (chop 2 at 5 m/s, 1.82 → 1.60 s). [M]

**So the honest finding is not that the loop should regulate the capture point — it should — but that this plant will
not take the gain that doing so costs.** The margin the model gains and the shove the game loses are the same gain
rise seen from two sides, and the game is the one the owner rides. Not kept.

## 4. The settle, and it is the whole of this step's gain (item 3)

Ruling 29n's decision 2 was right. Before: the board was **placed into** the chop and the clock started 2.5 s later;
every 5 m/s fall was at 1.07–1.98 s of that settle, i.e. while the rider was still being placed. Now
(`lab.ts` `Chop.gain` / `rampFrom` / `rampTo`, and the glide bar's own settle):

- the chop's trains are a linear superposition of small-amplitude waves, so **scaling their sum is exactly a smaller
  chop** — the ramp is a smaller chop, not a different one;
- the chop glide settles **4 s**: smooth for 1 s, the chop ramping in from 1 to 2.5 s, then **1.5 s at full strength**
  before the 3 s bar begins. The plane, carve, push and mode rows keep their own 2.5 s settle, untouched;
- any fall still inside the settle is reported with `settleFall` and the chop's gain at that moment, never dropped.

**With the rider exactly as 3.2h left it, the chop goes 4 of 12 to 8 of 12** [M]. A first attempt (the ramp over the
first 1.5 s of the old 2.5 s settle) gave 7 of 12 and pushed two falls into the settle *at full chop*, which is why the
settle is 4 s and not 2.5: a settle has to include time at the disturbance the bar is about.

## 5. The chop by speed and by seed (item 4)

Cells are **old rider / 3.2h on the old settle / 3.2j on the new settle**; `*` marks a fall inside the settle, `s` a
fall after it, with the held time. [M] (`results/bars-old-32j.jsonl`, `bars-new-32h.jsonl`, `bars-new-32j.jsonl`.)

| Seed | 5 m/s | 7 m/s | 9 m/s | 12 m/s |
|---|---|---|---|---|
| chop 1 | hold / 0 s / **hold** | hold / hold / hold | hold / hold / hold | hold / 1.78 s / **0.2 s** |
| chop 2 | hold / 0 s / **1.82 s** | hold / 1.65 s / **hold** | hold / 0 s / 0 \* | 0.02 s / 0 s / 0 \* |
| chop 3 | hold / 0 s / **hold** | hold / 2.70 s / **hold** | hold / hold / hold | hold / hold / hold |

| | total | by speed (5 / 7 / 9 / 12) | by seed (1 / 2 / 3) |
|---|---|---|---|
| old rider, old settle | 11 of 12 | 3 / 3 / 3 / 2 | 4 / 3 / 4 |
| **old rider, new settle** | **11 of 12** | 3 / 3 / 3 / 2 | 4 / 3 / 4 |
| 3.2h, old settle | 4 of 12 | 0 / 1 / 2 / 1 | 2 / 0 / 2 |
| **3.2j, new settle** | **8 of 12** | **2 / 3 / 2 / 1** | 3 / 1 / 4 |

- **The settle change does not flatter the bar: the old rider scores 11 of 12 on both settles, cell for cell.** It was
  only ever the new rider that the old settle was hurting, which is what a probe fault looks like. [M]
- **The 5 m/s column goes 0 of 3 to 2 of 3**, and the one that still falls (chop 2) now falls at 1.82 s *after* a proper
  settle, so it is a real fall and not a placement. 29n's decision 2 is settled on numbers: three of the four cells it
  queried were the probe.
- **12 m/s is now the worst column, 1 of 3**, and one cell got *worse* with the proper settle (chop 1, 1.78 → 0.2 s):
  the rider meets the chop already trimmed for smooth water at 12 m/s, which is a harder entry than being placed into
  it. That is honest and I did not smooth it over.
- **Chop 2 is the hard seed for both riders** (1 of 4 new, 3 of 4 old — it is also the only seed the old rider loses a
  cell on).
- The two chop 2 settle falls at 9 and 12 m/s are step 3.2h §4's board-diving case, now inside a 4 s settle; they are
  reported with `settleFall` and the chop's gain at 1.0.

## 6. The bars (item 5; steady starts, 16 substeps)

Results `results/bars-new-32j.jsonl`, `bars-old-32j.jsonl`. [M]

| Bar | Old | 3.2h | 3.2j | Pass? |
|---|---|---|---|---|
| N0: `rider=old` unchanged | — | byte-identical | 3.1's `bars-old` byte-identical; of 3.2's 30 rows only the 12 chop ones move, in their read-outs, **because the probe's water changed** — every hold and fall the same except chop 2 at 12 m/s, whose fall crosses the settle boundary by 0.02 s | yes |
| Held carve standing ≥ 2.28 s | 1.93 | 2.85 | **2.85** | yes |
| Held carve Compress ≥ 2.30 s | 3.0 | 2.98 | **2.98** | yes |
| Glides on the plane | 4 of 4 | 4 of 4 | 4 of 4 | yes |
| **Glides on chop, bar 11 of 12** | 11 of 12 | 4 of 12 | **8 of 12** | **no** |
| 20 cm rise at 2 m/s | falls 0.32 s | holds | **holds** | yes |
| **Saved shove, tall / crouch / Compress (the guard)** | 192 / 188 / 191 N·s | 138 / 155 / 170 | **138 / 155 / 170** | yes, unchanged to the digit |
| Save window, the asymptote | — | 0.187 / 0.165 / 0.144 | the same | yes |
| Reaction 0.08–0.12 s | 0.001 | 0.105 | 0.105 | yes |
| Mode B: the bank's envelope halves within two cycles | — | yes | yes (the kick rows identical) | yes |
| Mode A not seen | 0.000–0.007 | 0.000–0.009 | 0.000–0.009 | yes |
| N1: legs < ~2 kW per frame | to 30.9 kW | 1.52 kW | 1.52 kW | yes |
| Push ordering tall > crouch > Compress | yes | no | no | no (29's own, long-standing) |
| Turn pair, N2 | 14 of 16, +1.7 | suspended (29k) | suspended | — |

Every row outside the chop is identical to 3.2h's, because the kept change is in the probe's water and in the model, not
in the rider. The chop is the only bar that moved, and the guard bar is untouched at 138 / 155 / 170 N·s.

## 6b. The 2 Hz ring, measured properly (the advisor's extra)

Step 3.2i measured the capture point's crossings once — one stance, one shove — and called it "about 2 Hz", and I
flagged that it mattered. Measured across three stances and three shove sizes on the kept build
(`results/ring-32j.txt`, 2 s each at 7 m/s) [M]:

| shove (m/s) | tall | crouch | Compress |
|---|---|---|---|
| 0.3 | 0.76 Hz (outside 1 of 120 frames) | 1.26 (0) | 1.77 (0) |
| 1.0 | 1.51 (18) | 1.01 (2) | 0.76 (2) |
| 1.8 | 0.76 (34) | 1.51 (24) | 0.50 (11) |

**It is 0.50–1.77 Hz with no pattern in stance or shove size, so it is not a mode — it is the loop's own wander**, and
3.2i's "2 Hz" was the top of a spread read from one case. That weakens the phase-lag half of 3.2i's account of the hip's
ratchet: `BALANCE_DELAY` is between a twentieth and a fifth of a period here, not reliably half of one. **The other two
causes stand unchanged and they are the structural ones** — the centring switched off above 20 N·m, and the roll a thrown
hip pays — and they are enough on their own. I am correcting my own [M] to a weaker claim rather than leaving it. [M, I]

What does rise with the shove is how long the capture point spends outside the feet: 1, 18 and 34 of 120 frames in the
tall stance at 0.3, 1.0 and 1.8 m/s. So the signal a hip would answer is mostly *inside* the feet in ordinary riding and
only becomes busy under a real shove, which is the right shape for a trigger — the fault was the size asked for, not the
trigger.

## 7. What is in the tree, and what is not

**Kept:**
- `lab.ts`: `Chop.gain`, `rampFrom` and `rampTo` — the chop's own settle, with the note that scaling a linear
  superposition of small waves is exactly a smaller chop.
- `bars.probe.ts`: the chop glide's own 4 s settle (`CHOP_SETTLE`, `CHOP_QUIET`, `CHOP_RAMP`), and `settleFall` and
  `chopGainAtEnd` on every chop row so a settle fall is reported and never dropped.
- `predictiveBalance.ts`: `captureRow` (the capture point as a row over the state, with the note that it is a
  functional of two existing states and not a new one) and the optional `DesignWeights.captureScale`, which builds the
  rank-one cost. **The default has it off**, with the measurements recorded on both it and `commandScale[0]`.
- `predict.probe.ts` PART=bound: the model with its commands bounded, the game's fall test on it, the disturbance
  margin by bisection, and the reference governor — the first model runs in this rebuild that can see a saturating input.

**Not kept:** `commandScale[0] = 0.25` and `captureScale = 0.013` as defaults, and the governor. All three are measured
and all three cost the guard bar or the model's own margin.

## 8. What I am unsure of, and what was not run

- **Whether the right structure is MPC after all.** The governor I tried is the crudest constrained law there is
  (bang-bang on a one-step test). A real receding-horizon controller would trade the bound against the delay instead of
  ignoring it, and it is the one structure 29n listed that I did not build, because it is a different controller and not
  a weight. I would want it designed and gated like 3.2d's before it went near the game.
- **Why the model and the game disagree by this much.** The model says +65 % of margin; the game says the same gains
  lose four fifths of the saved shove. The gate's random-plant failures (15 % of 10200, unchanged since 3.2d) say the
  model's plant is not the game's, and until that gate passes the model cannot be trusted to pick gains. **That is the
  deeper finding of this step**, and I think it outranks the chop.
- **The two chop 2 settle falls** (9 and 12 m/s) are the board diving nose-down away from the feet, step 3.2h's §4
  case, now inside a 4 s settle instead of a 2.5 s one. They are honest falls, reported separately. Whether
  `RECOVERABLE_ERROR`'s 0.25 m is right for a free body is still the open question from 3.2h.
- **The merge checks are run**, because the advisor merges this as opt-in work in progress for the owner to ride even
  though the chop misses (ruling 29o). All on this M1 with three of ruling 31's Basilisk runs alongside the whole time
  [M] (`results/suite-32j.txt`, `canyon-byte-32j.txt`, `fps-32j.txt`):
  - `npx tsc --noEmit -p .` and `npx tsc -p server/tsconfig.json --noEmit`: **both clean**.
  - **The suite** (`npx vitest run src --maxWorkers=3`, without `SurfZoneSimulation.test.ts` and
    `SurfZoneRunner.test.ts`): 351 of 352 files and **3,425 tests passed**, 23 expected fail, 43 skipped. The one
    failure is the known flake, `src/wave/barrel/poolBarrelPerf.test.ts`, which ran 77.5 s past its 60 s timeout under
    this load; **alone with `--testTimeout=300000` it passes in 55.5 s** (8 tests). Neither it nor the code it
    exercises is in this branch's diff.
  - **The Canyon byte check** (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, fresh spin-ups): **Canyon B snapshots
    a367d938f15fa934, state 9e5831f80e38abd9; the default Canyon snapshots ea3d57a4d49f4b48, state a1a2555739210f96 —
    all four the same as main.**
  - **The fps trace** (Canyon, `?physical&canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on`, 60 s, run twice
    back to back): from 20 s on **48.3 then 47.7 fps mean, lowest second 43 both**, worker 124 and 135 ms mean. The two
    runs agree; the absolute numbers sit under the wave track's quiet-machine references because three Basilisk runs and
    the byte check's own 3600 steps were running throughout, so read it as with-against-without, not against a historic
    number. The trace's rider stays prone, so `?rider=new`'s standing path is never entered by it. A first attempt
    measured the **menu** rather than the ride (`visualStatus` absent) — the trace now clicks the Surf tile and waits
    for the ride before it samples, which is what the wave track's own runs did.
- **Not run:** the turn pair and N2 (suspended, 29k), the pitch loop (held, 29l), the hip (refuted, 29n). No ride, no
  game page, no Basilisk case.

## 9. How it rides, and what to feel for (for the owner)

Plain words. **This is the first step of the rebuild that goes onto main, as opt-in work in progress**, so you can ride
it and tell me what is wrong. Nothing is on by default: the old rider is byte-identical to what it was.

**The address.** Add `&rider=new` to the Canyon ride you already use:

```
?physical&canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on&rider=new
```

Drop `&rider=new` and you are back on the old rider in the same wave, so you can switch back and forth in one session
and compare.

**What is better than the old rider:**
- **Carving.** It holds a hard carve 2.9 seconds standing and 3.0 crouched. The old rider managed 1.9 standing, and
  only did better crouched because it had a hidden push helping it. **This rider has no hidden push at all** — no
  invisible hand holding it upright, no secret speed.
- **It balances like a person.** It feels its own body about a tenth of a second late, predicts where it will be, and
  answers with its ankles first, then its hips, then its knees, then its arms — the order a person uses.
- **A shove no longer starts a wobble.** The wobble that broke four earlier steps is gone.
- **The knees soak up a bump.** A surface rising fast under the board used to throw the old rider off in a third of a
  second; this one rides it out, using about 25 cm of knee travel where the old rider used 2.

**What is worse than the old rider, and it is one thing: chop.**
- On the twelve chop tests it holds **8**; the old rider holds **11**. At 7 m/s it holds all three chops; at 5 and
  9 m/s two of three; **at 12 m/s only one of three**. The faster and rougher the water, the more likely it drops you.
- There is no quick fix waiting. The cause is measured: the balance loop asks its ankles for too little, too late — it
  only asks for their full strength at about 40° of lean, and the ankles stop working at 11°. Three honest attempts at
  that are in sections 2 to 4, and each one made something else worse.

**What to feel for — this is what I most want from the ride:**
1. **A carve.** Set a rail and hold it. Does it feel like it is biting and holding, or sliding away? The numbers say
   this is the best part; I would like to know whether it feels that way.
2. **The moment it drops you.** Does it feel like a fall *you* would have made — the board getting away from you — or
   like the game deciding you fell when you were still fine? That difference is the one thing I cannot measure, and two
   whole steps were spent on it.
3. **Chop on a face.** Ride a rough section at speed. Expect to go down about a third of the time. Does it go over
   **sideways**, or does the board **dive out from under your feet**? Both happen in the tests and they need different
   fixes, so which one it feels like is worth a lot.
4. **Slow water**, under about 5 m/s, where the board barely planes: sluggish, or wrong?
5. **Anything that feels like fighting itself** — a twitch, a shake, a correction that overshoots. The rider has a real
   reaction delay now, and that is exactly the fault a delay produces.

**What is still missing, so you are not surprised:**
- **No pumping.** It cannot gain speed by working the board, so after a bottom turn it runs out of speed and cannot
  climb back up the face. Linking two turns will fail, and that is speed, not balance.
- The fast crouch-to-crouch moves (snaps, cutbacks) are not rebuilt yet.
- The front-to-back loop is still the old one: it has not needed rebuilding, but it has not been redesigned either.

**My honest view:** worth a ride, not worth a long session. On a clean face it should feel better than the old rider,
and that part is real. On anything rough it will drop you more often than the old rider does, and I would rather have
ten minutes of you telling me how the falls *feel* than an hour of you riding around them.

## Files (3.2j)

- `docs/research/board-in-water/lab.ts`: `Chop.gain`, `rampFrom`, `rampTo`.
- `docs/research/new-rider/3.2/bars.probe.ts`: the chop glide's own settle (`CHOP_SETTLE` 4 s, `CHOP_QUIET` 1,
  `CHOP_RAMP` 2.5), `steady`'s settle argument, and `settleFall` / `chopGainAtEnd` / `chopSettleS` on the chop rows.
- `src/physics/predictiveBalance.ts`: `captureRow`, the optional `DesignWeights.captureScale` and its rank-one term in
  `design`, and the accounts on `commandScale` and `captureScale` of what was measured and why neither is the default.
- `docs/research/new-rider/3.2/predict.probe.ts`: PART=bound — the model with bounded commands, the game's fall test,
  the disturbance margin by bisection, the design sets and the reference governor.
- `results/`: `bars-new-32j.jsonl`, `bars-old-32j.jsonl`, `predict-bound-32j.jsonl`, `predict-gate-32j.jsonl`,
  `predict-weights-32j.jsonl` (the five builds of the game), `glide-ramp15-32j.jsonl` (the first settle attempt, 7 of
  12), `ring-32j.txt`; the merge checks' own `suite-32j.txt`, `canyon-byte-32j.txt` and `fps-32j.txt`.
- No change to what the game does.

---

# Part 11: step 3.2L, the turn restored (rulings 29p and 29q)

Written 2026-11-13 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32L` (from
`claude/rider-new-32j`, rebased on main 8aa55380). The contract: `../ruling-29.md` 29p and 29q.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

**Can he turn? Yes. Can he get around the wave? No — and at no corner of the grid.**

- **The turn start is restored and measured.** `LEAN_IN_RATE` 0.5 → **1.4 rad/s**: the time from full stick to a 30°
  rail goes **2.55 s → 0.85 s standing**, and in Compress from **never reaching one at all → 0.97 s** (the old rider:
  0.60 and 0.58 s). Peak turn rate 56 → 95 °/s standing and 41 → 61 °/s in Compress (old: 76 and 80). In a held
  Compress carve the board now reaches **42.8° of bank where it reached 23.4°** [M].
- **And the turn-pair probe — the one that measures what the owner actually asked for — still reads 0.** Top turns
  begun: **old rider 8 of 8, two pairs linked in 6 of 8. The new rider 0 of 8, at lean 0.5 and 1.4 and at caps of 5,
  12 and 20 alike** [M]. He starts a turn now; he falls 0.5–2.6 s later, in the bottom turn or the first climb, every
  single run. **So "he can almost only go in front" is not fixed by this step.**
- **It is not speed, and I checked before saying so** (ruling 29q item 5): the new rider enters the bottom turn at
  **7.4 m/s against the old rider's 7.5**, comes out of the stick-up at **8.5 against 8.8**, and reaches the **same
  height on the face (frac 0.05 against 0.03)**. Then it falls across in the climb. **`CARVE_CARRY`'s speed is not the
  blocker here** — the across-axis balance is, which is steps 3.2h–3.2j's finding and ruling 29o's model work.
- **1.4 rad/s is derived from the body, not fitted to a feel** (29q's steer). The rider's lean is its mass turning
  about its feet: inertia m h² = 33.8 kg·m², and the largest moment the feet can apply is m g d = 716 × 0.13 =
  93 N·m — so the body's own angular acceleration is **g d / h² = 2.76 rad/s²**, and over the ~0.5 s in which a bottom
  turn sets its rail that reaches **1.38 rad/s**. Mass, centre-of-mass height, feet width, gravity: **no water in it,
  so two-way coupling cannot invalidate it.** The sourced turn geometry gives 1.4 by a different route; they agree to
  within 2 %.
- **The structural cap change is right and the measurement does not support it, so I did not make it.** `SCHEDULE_RAIL_CAP`
  stays 5°. Raising it to 12° or 20° makes the standing rider fall in 0.3–0.4 s on a full stick **and the turn pair is
  0 of 8 at every cap**, so the cap is not what is stopping him. 3.2f's own measurement says why: past about 15° of
  rail the plant's sideslip mode has changed sign, and gains designed there are designed on a plant that cannot be
  stabilised by any controller. **Reading the schedule further is only correct where the plant is stabilisable.** That
  is a finding against my own instruction to lead with it, and it is in §3's grid.
- **Seatbelts, all held** [M] (`results/suite-32L.txt`, `canyon-byte-32L.txt`, `fps-32L.txt`): `tsc` clean on both
  projects; the suite **352 files and 3,426 tests passing, zero failures** (23 expected fail, 43 skipped — even the
  `poolBarrelPerf` flake passed this time); **all four Canyon hashes the same as main** (Canyon B
  `a367d938f15fa934` / `9e5831f80e38abd9`, the default `ea3d57a4d49f4b48` / `a1a2555739210f96`, both from fresh
  spin-ups); 3.1's old-rider bars byte-identical; and **no new force of any kind** — the step changes one constant that
  is a rate limit on a reference, so there is nothing for the owner's "no hidden motors" rule to catch. The fps trace
  is noisy and I am not smoothing it: two 60 s ride traces back to back gave 36.1 and 46.4 fps mean from 20 s on
  (lowest second 30 and 29), and they disagree by 10 fps where 3.2j's agreed to 0.6, because three Basilisk runs **and**
  the byte check's own 3600 steps were running throughout. Read it as with-against-without.
- **Hand-set numbers that will need re-checking when two-way coupling lands**, as 29q asks: `SCHEDULE_RAIL_CAP` (5°,
  the plant it reads is a non-digging rail's), `KNEE_STIFFNESS` (20 kN/m, step 3.2h's sources disagree with its bars),
  `CAPTURE_LOAD` (0.2 body weights, reasoned not measured), `RECOVERABLE_ERROR` (0.25 m, set for a rigid rider), and
  `LEAN_IN_RATE`'s own 0.5 s rail-set window — the 1.4 rad/s follows from the body, but the **0.5 s** it is multiplied
  by comes from a turn's geometry and a digging rail may set its rail in a different time.


## 2. The old rider's four numbers, which are the bars (29p item 1)

`turn.probe.ts` PART=turn, from the bars' own steady start on the 10.8° terminal plane at 7.7 m/s, full stick slammed
and held for 4 s. Results `results/turn-old-32L.jsonl` [M]:

| | Standing | Compress |
|---|---|---|
| **Peak turn rate** | 76.4 °/s | **79.8 °/s** |
| **Full stick to a 30° rail** | 0.60 s | **0.58 s** |
| **Turn radius at the peak** | 6.5 m | **6.1 m** |
| **90° of direction change** | 1.50 s, speed kept 0.94 | **1.67 s, speed kept 1.32** |
| Peak rail, and whether it fell in 4 s | 85.1°, fell at 1.93 s | 48.3°, **did not fall** |

**What the owner would feel if each improved** (29p's standing instruction, and I am applying it to my own bars):
- peak turn rate: *the board comes round quicker under the same stick*;
- time to a 30° rail: *the stick bites at once instead of after a beat* — this is the "too stiff" complaint;
- turn radius: *a tighter line off the bottom, so the section ahead is still makeable*;
- 90° with speed kept: *still having drive at the top of the turn instead of stalling* — the "wave navigation";
- travel speed in km/h: *a ride that is neither sluggish nor a rocket*.

Each of those is something the owner can report on without a probe. The held carve — "how long a lean is held" — is not,
and that is why it failed as a bar.

## 3. The grid (29p item 2) — the whole of it, not the best corner

`turn.probe.ts` with `BALANCE='{"leanRate":L,"railCap":C}'`; 10 lean rates × up to 8 caps, both stances, 90 rows in
`results/turn-grid-32L.jsonl`. Each cell is **time to a 30° rail / peak turn rate °/s / when it fell**, and `-` means
it never reached a 30° rail in 4 s of held full stick [M].

**Standing:**

| lean \ cap | 5° | 8° | 10° | 12° | 15° | 20° | 30° | 40° |
|---|---|---|---|---|---|---|---|---|
| 0.5 | 2.55/56/2.85 | | −/44/2.38 | | | −/18/0.87 | −/28/0.68 | −/28/0.68 |
| 1 | 1.00/67/1.77 | | 0.93/101/2.10 | | | −/14/0.53 | −/129/0.45 | −/129/0.45 |
| 1.2 | 0.92/76/1.48 | 0.85/78/1.55 | | | | | | |
| **1.4 (kept)** | **0.85/95/1.37** | 0.78/77/1.38 | | | | | | |
| 1.5 | 0.82/99/1.32 | 0.75/77/1.35 | | −/20/0.42 | −/19/0.42 | | | |
| 2 | 0.73/113/1.20 | 0.67/79/1.15 | −/25/0.40 | −/26/0.37 | −/25/0.38 | −/23/0.40 | −/147/0.33 | −/140/0.33 |
| 2.5 | 0.68/98/1.13 | −/29/0.37 | | −/32/0.33 | −/29/0.35 | | | |
| 3 | −/33/0.35 | −/34/0.33 | | −/37/0.32 | −/33/0.33 | | | |
| 3.5 | −/38/0.33 | | −/41/0.30 | | | −/45/0.35 | −/127/0.45 | −/132/0.30 |
| 5 | −/49/0.30 | | −/53/0.27 | | | −/60/0.33 | −/106/0.48 | −/149/0.25 |

**Compress:**

| lean \ cap | 5° | 8° | 10° | 12° | 15° | 20° | 30° | 40° |
|---|---|---|---|---|---|---|---|---|
| 0.5 | −/41/2.98 | | −/47/2.30 | | 1.90/76/2.88 | −/10/0.95 | −/13/0.95 | |
| 1 | 1.48/53/2.42 | | −/60/1.93 | | 0.97/144/1.95 | −/11/0.55 | −/52/0.57 | |
| 1.2 | 1.27/73/2.47 | −/56/2.07 | | | | | | |
| **1.4 (kept)** | **0.97/61/2.23** | 1.07/52/1.90 | | | | | | |
| 1.5 | 0.90/59/1.98 | 0.97/53/1.88 | | 0.88/50/1.80 | 0.80/76/1.90 | | | |
| 2 | 0.80/57/1.70 | 0.85/52/1.80 | −/58/1.73 | 0.77/81/2.17 | 0.67/64/1.35 | −/21/0.42 | −/32/0.38 | −/58/0.43 |
| 2.5 | 0.77/59/1.73 | 0.87/77/2.40 | | 0.65/50/1.52 | 0.58/75/1.32 | | | |
| 3 | 0.75/59/1.87 | 0.77/54/2.22 | | 0.60/60/1.62 | −/30/0.35 | | | |
| 3.5 | 0.73/59/1.90 | | 0.68/82/2.27 | | −/35/0.32 | −/80/0.32 | −/210/0.88 | |
| 5 | 0.68/64/1.80 | | 0.60/55/1.75 | | −/45/0.28 | −/88/0.28 | 0.45/74/0.45 | |

**What the grid says** [M, I]:

- **29p's suspicion is confirmed, and the other way round.** The two were never swept together, and the interaction is
  real — but it is **the cap that is the hard wall, not the lean rate.** Standing, *every* cap over 8° fails at *every*
  lean rate: the board never reaches a 30° rail and the rider is down in 0.3–0.5 s. That is 3.2f's sign change showing
  up in the ride: past about 15° of rail the hull stops righting the board, so a schedule read further out is holding it
  with gains for a plant that no longer exists.
- **The region where both stances turn is cap 5–8° with lean 1–2.5.** Outside it one stance or the other is gone. The
  kept cell is inside it.
- **Faster is not better past about 2 rad/s.** At lean 3 and above the standing stance collapses at every cap, and
  Compress stops improving (0.73–0.75 s at cap 5, against 0.80 at lean 2 and 0.97 at lean 1.4) while falling sooner.
  **So the old rider's 5 rad/s is not reachable by this controller** — at lean 5 the standing rider is down in 0.30 s.
  The honest statement 29p asked for is therefore: *the controller cannot hold the old rider's rail-set rate, but it
  does not need to* — 1.4 rad/s already restores the turn the owner was missing, and the sourced human rate is 1.4.
- **There is one genuinely better corner for Compress alone, and I refused it.** Cap 12 with lean 2 gives Compress
  81 °/s, a 30° rail in 0.77 s, a 5.6 m radius **and the 90° change at 2.03 s with 0.95 of its speed** — the only cell
  in the grid that completes 90°, and the closest thing to the old rider's Compress row. **It falls the standing stance
  at 0.37 s.** A rider who can only turn in one stance is not playable, so cap 5 stays. The trade is in the table and
  it is the advisor's to overturn if they disagree.

## 4. What was kept, and what it cost

**`LEAN_IN_RATE` 0.5 → 1.4 rad/s** (`AttachedRider.ts`), and `SCHEDULE_RAIL_CAP` stays 5°. 1.4 is not a number I
invented: it is the sourced upper end already written in that constant's own comment — a bottom turn comes round 99° in
0.96 s (Forsyth et al. 2024), and setting the rail over the first half of it is about 0.7 rad in 0.5 s [S]. The grid
says faster does not turn better, so there is no reason to go outside the source.

| | Old rider | 3.2j (lean 0.5) | **3.2L (lean 1.4)** |
|---|---|---|---|
| To a 30° rail, standing / Compress | 0.60 / 0.58 s | 2.55 s / **never** | **0.85 / 0.97 s** |
| Peak turn rate, standing / Compress | 76.4 / 79.8 °/s | 56.3 / 40.5 | **94.7 / 60.8** |
| Turn radius, standing / Compress | 6.5 / 6.1 m | 8.4 / 11.3 | **4.3 / 7.3 m** |
| Peak bank in a held Compress carve | — | 23.4° | **42.8°** |
| 90° of direction change | 1.50 / 1.67 s | never | **never** |
| Held full stick: when it falls | 1.93 s / never | 2.85 / 2.98 s | **1.37 / 2.23 s** |

So: **the rail time is 2.6–3× the old rider's instead of 4× or never; the turn rate is 124 % of it standing and 76 %
in Compress; the radius is tighter standing and 20 % wider in Compress.** The 90° change is the one number still out of
reach, and section 1 says why it is not this constant's fault.

## 4b. The turn pair — what the owner actually asked for (revised orders)

The owner: *"the canyon wave was not rideable because the surfer was too slow to turn and position himself on the
proper section on the wave, the surfer can almost only go in front."* The turn-pair probe
(`docs/research/turn-pair-2026-11-10`, set B: the pair on the face, Compress held, leg drive off, 8 runs) measures
exactly that — can he link a bottom turn to a top turn and move up and down the face. **This is the only thing that
decides the step.** `results/turnpair-32L.jsonl` [M]:

| | Top turns begun | One pair linked | Two pairs | When it fell |
|---|---|---|---|---|
| **Old rider** | **8 of 8** | **7 of 8** | **6 of 8** | 2 of 8, at 5.6–11.5 s |
| new, lean 0.5 / cap 5 (3.2j) | 0 of 8 | 0 | 0 | 8 of 8, at 1.2–1.7 s |
| new, lean 1.4 / cap 5 (**kept**) | 0 of 8 | 0 | 0 | 8 of 8, at 0.7–1.2 s |
| new, lean 1.4 / cap 12 | 0 of 8 | 0 | 0 | 8 of 8, at 0.7–2.6 s |
| new, lean 1.4 / cap 20 | 0 of 8 | 0 | 0 | 8 of 8, at 0.5–2.3 s |

**No corner gets him round the wave.** He now *starts* the turn (§4) and then goes down in the bottom turn or the first
climb within a second or two, at every lean rate and every cap tried.

**And it is not the speed `CARVE_CARRY` used to give** [M]. Taking the first runs of each set: the new rider drops into
the bottom turn at **7.4 m/s** against the old rider's 7.5, comes out of the stick-up at **8.5** against 8.8, and
climbs to the **same height on the face** (frac 0.05 against 0.03). The entry is the old rider's; what fails is the
**balance in the climb**, which is the across-axis fall steps 3.2h to 3.2j traced and which ruling 29o's model work
owns. I am saying this rather than re-adding a carry, as ruling 29q item 5 requires.

**Is the probe unsuitable for a fast-turning rider?** No — it is the right probe and it is reading a real failure. Its
one weakness is that it holds the stick through the whole pair, so a rider that falls early never reaches the second
half; a version that eased the stick when the rider's balance margin collapsed would separate "cannot turn" from
"cannot hold the turn". But that would be measuring a different, kinder input than the owner's, and the result here is
not marginal: 0 of 8 against 8 of 8.

## 5. The old bars, as information only (revised orders: no gating)

`results/bars-new-32L.jsonl` against `bars-new-32j.jsonl`, the same 30 rows, **reported and not tuned to**. Two rows
differ, and they are both the carve ruling 29p demoted [M]:

| | 3.2j | 3.2L | |
|---|---|---|---|
| **Saved shove, tall / crouch / Compress** | 138 / 155 / 170 N·s | **138 / 155 / 170** | yes, to the digit |
| **Chop glides** | 8 of 12 | **8 of 12**, cell for cell | yes |
| **Mode B**: the bank's envelope, and the kick's rows | passes | **identical rows** | yes |
| Mode A not seen | 0.000–0.009 | identical | yes |
| Reaction 0.08–0.12 s | 0.105 | 0.105 | yes |
| Plane glides | 4 of 4 | 4 of 4 | yes |
| 20 cm rise at 1 / 2 / 4 m/s | holds / holds / falls 0.63 s | identical | yes |
| N1: legs under ~2 kW | 1.52 kW | identical | yes |
| **N0: `rider=old`** | byte-identical | **3.1's `bars-old` byte-identical** | yes |
| (report) held carve, tall / Compress | 2.85 / 2.98 s | **1.37 / 2.23 s** | demoted (29p) |

**Why the guards are untouched, and it is structural rather than lucky** [R, I]: `leanPace` is read in one place, inside
`if (this.predictive)`, and only where the lean the player asks for is eased toward the stick. **The push bar, Mode B,
the glides and the rise all ask for no lean at all**, so the constant cannot reach them; and the old rider never enters
that branch, which is why N0 holds without anything being gated. The chop holding at 8 of 12 cell for cell is the one
that could have gone either way, and it did not.

## 6. The travel speed (29q's band)

`turn.probe.ts` PART=travel: from a planing steady start on a fixed face slope, let run 8 s and read the speed it
settles at. A board placed *slow* on a face does not plane and the rider falls before it can accelerate, which is why
the measure starts planing [M].

| Face slope | Old rider | 3.2j | 3.2L | In 29q's 27–42 km/h? |
|---|---|---|---|---|
| 8° | stalls, falls | stalls, falls | stalls, falls | no — does not plane |
| 10° | 8.8 km/h | 8.4 | 8.4 | no — does not plane |
| **12°** | **34.2 km/h** | **34.8** | **34.8** | **yes** |
| 14° | 46.5 km/h | 46.2 | 46.2 | no — too fast |

**The rider does not set the travel speed; the face does, and the two riders agree to within 2 %.** The old rider's
"45 km/h, gigantic-waves speed" is a 14° face and the owner's 27–42 band is about a 12° one. With `CARVE_CARRY` gone
neither rider adds any speed of its own, so this bar cannot distinguish them: it is a statement about the wave the
owner is riding. **It becomes a real bar on the rider only once pumping exists** — then a rider should be able to hold
the band on a face that would otherwise be too slow, which is the whole point of pumping. Recorded, not claimed as
passed or failed by this step. [M, I]

## 7. What I am unsure of, and what was not run

- **Snap is not measured.** The owner said "even in compress **and snap**". The turn probe drives the crouch and
  Compress inputs; Snap is a separate input with its own depth, rail range and recentre, and I did not build a row for
  it in the time this step had. The Compress fix should carry most of it, since Snap's lean comes through the same
  `leanAsked` path, but **that is an inference and the owner's ride is the test.**
- **The grid is one run per cell on one input** — full stick slammed and held, at one speed, on one face. It is the
  owner's own input and the right one for "too stiff", but near the fall the plant is chaotic and neighbouring cells
  differ by more than I would like (compare lean 1.2 and 1.4 in Compress: 73 against 61 °/s). **The choice between 1.2,
  1.4 and 2 rad/s is within that noise**; I took 1.4 because it is the sourced bound, not because the grid resolved it.
- **The 90° number needs pumping**, and until then no corner of the grid reaches it without losing a stance.
- **Not run:** the turn pair / wave navigation (still blocked on pumping), the pitch loop (held), the hip (refuted).
  No Basilisk case.

## 8. How it rides, and what to feel for (for the owner)

**You said it barely turns, and you were right. Here is what was wrong and what I changed.**

The rider had a setting for how fast it leans onto its rail. It was set to 0.5 — at that rate a 45° rail takes
**1.6 seconds**. Measured properly: standing it took **2.55 s to get onto a 30° rail**, and in Compress **it never got
there at all** in four seconds of you holding the stick. The old rider does it in about **0.6 s**. So "too stiff,
barely turns in compress" was not a feeling, it was the number.

**Why it was set that way, and it was my side's mistake, not a physics finding.** I measured how long the rider could
*hold* a carve and picked the setting that held longest. But a rider that leans slowly spends longer leaning, so that
test rewarded exactly the thing you were complaining about. That bar is now a report, not a target.

**What it does now:**
- Onto a 30° rail in **0.85 s standing and 0.97 s in Compress** — about a second, instead of two and a half or never.
- The board comes round at **95 °/s standing and 61 °/s in Compress**; the old rider did 76 and 80. So standing it now
  turns *harder* than the old rider, and in Compress about three quarters as hard.
- In a held Compress carve the board now goes onto **43° of rail where it managed 23°**. That is the difference you
  should feel most.

**What it costs, and I want you to know before you ride it:** **it falls sooner.** If you hold a full stick, it goes
down after about 1.4 s standing and 2.2 s in Compress, where before it hung on for about 3 s doing almost nothing. That
is the deal — a turn you can use, and more falls. If that trade feels wrong, say so and I will move the setting back
toward the middle; the whole grid of options is measured and written down.

**What is still missing, and it is one thing, not many:**
- **The rider cannot gain speed in a turn.** The old rider came *out* of a 90° turn going 32 % faster than it went in —
  that was a push with nothing pushing back, and it was removed on purpose. Nothing has replaced it yet. So the new
  rider slows through a hard turn and runs out before it can link a second one. **That is pumping, and it is next.**
- Travel speed is set by how steep the face is, not by the rider: on a 12° face both riders ride at about 35 km/h,
  which is inside the 27–42 band from your clip; on a 14° face both do 46 km/h, which is the "gigantic waves" speed you
  did not want. Once pumping exists the rider will be able to hold the band on a face that is otherwise too slow.

**And I have to be straight with you about the main thing: this does not fix what you described.** You said he cannot
position himself on the wave and can almost only go forward. There is a test that measures exactly that — link a bottom
turn into a top turn and move up and down the face. **The old rider does it 8 times out of 8. This one does it 0 times
out of 8** — and 0 at every setting I tried, fast lean or slow, wide rail or narrow. He now *starts* the turn properly,
and then falls over about a second into it.

**It is not that he is too slow any more.** I checked: he drops into the turn at the same speed as the old rider
(7.4 against 7.5 m/s), comes out of it at the same speed (8.5 against 8.8), and gets to the same height on the face.
He then loses his balance sideways in the climb. So the missing piece is not speed and not the turn rate — it is that
he cannot hold himself up through a turn once he is in one.

**What to feel for:**
1. **Does the stick bite now?** Slam it in Compress. It should go onto its rail in about a second, not hang. That part
   I am confident about.
2. **Can you get up the face at all**, or does he drop you as soon as you commit? I expect the second, and I would like
   to know whether it feels like the fall you would have made.
3. **Snap**, which I could not measure this round: does it turn now too, or is it still stiff?
4. If the turn itself now feels about right in speed — you said the old one was "closer to reality and enjoyable" —
   then the setting is where it should be and the next job is keeping him on his feet through the turn, not making the
   turn faster.
5. If the turn feels too loose or the falls too cheap, **tell me and I will move it**: it is now a dial with a measured
   table behind it, and the number came out of the body's own strength rather than out of my taste.

## Files (3.2L)

- `src/physics/AttachedRider.ts`: `LEAN_IN_RATE` 0.5 → 1.4, with the account of why 0.5 was wrong and where 1.4 comes
  from; `SCHEDULE_RAIL_CAP` keeps 5° with the grid's reason added (every cap over 8° loses the standing stance).
- `docs/research/new-rider/3.2/turn.probe.ts` (new): PART=turn (the four turn numbers, both stances, full stick from
  the bars' own steady start) and PART=travel (the speed a planing board settles at on a fixed face slope, km/h).
  `BALANCE='{"leanRate":L,"railCap":C}'` is how the grid was swept; no game code is touched to sweep it.
- `results/`: `turn-old-32L.jsonl` (the bars), `turn-new-32L.jsonl` (the kept cell), `turn-grid-32L.jsonl` (all 90 grid
  rows), `travel-old-32L.jsonl` and `travel-new-32j.jsonl`, `bars-new-32L.jsonl` (all 30 guard rows),
  `suite-32L.txt`, `canyon-byte-32L.txt`, `fps-32L.txt`.

# Part 12: step 3.2m, the plant held until it settles, heave and pitch in the model, and the rail cap (ruling 29t)

Written 2026-11-13 by the rail-dig agent (Opus 5, effort xhigh), on branch `claude/rider-new-32m` (from
`claude/rail-dig`, rebased on main 5e841464). The contract: `../ruling-29.md` 29t.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **The big-rail plant is re-measured with every hold shown settled, and it replaces 3.2f's** [M]. Each number is the
  mean of the last second of a **ten-second** hold, and the probe prints a ladder against how long the hold has run
  beside every one. At 7 m/s the side force per radian of sideslip now runs **+1409, +936, +405, −188, −796, −576**
  over 0, 10, 15, 20, 30 and 40° of rail, where 3.2f read +1398, +825, —, −1387, −2610, −4143. The 15° row is new.
- **"Past 15° of rail the plant cannot be stabilised by any controller" is gone** [M]. On this table a controller
  designed at the rail is positively damped at **every** point: 7 m/s at 40°, which 3.2f read as **−1**, is **+0.49**.
  It also survives a frame of timing error — the only model gate — to 20° at every speed and stance.
- **The sign change itself survives**, at about 18° of rail at 7 and 9 m/s, and **at 5 m/s it does not happen at all**
  up to 20° (+107 where 3.2f read −378) [M].
- **The pitch plant (3.2g) does not have the same fault and needs no change** [M]. Its holds pin the roll, the yaw, the
  slip, the pitch *and* the height, which leaves the board no free degree of freedom, so the water's force is algebraic
  in the state: the ladder is constant to the digit from 0.35 s to 4 s at every point. 3.2g's 5 and 7 m/s rows
  reproduce exactly; its 9 m/s rows are 5–12 % apart (§2.3).
- **The balance model now carries the board's heave and pitch as four more states** [R, M]. It confirms the answer —
  nominal damping positive at every rail — and it finds the next wall: the least damped mode is now the board's own
  **0.33–0.74 Hz heave and pitch**, and **the rider has no sense of it at all**, so a frame of timing error takes it
  negative. That is a sensing gap, not a rail problem.
- **Condensing heave and pitch quasi-statically, as the ten-state plant does, is ill conditioned** [M]: at 20° of rail
  the answer is the residual of terms **10 to 18 times** larger than itself, and the elimination's own error (260 to
  1,200 N) is bigger than the answer. That is a second, independent reason not to fold them in.
- **`SCHEDULE_RAIL_CAP` rises from 5° to 12°, and the game is why** [M]. **Both stances come round 90° for the first
  time**: standing 1.73 s keeping 0.95 of the speed, Compress 2.02 s keeping 0.88, against the old rider's 1.50 s /
  0.94 and 1.67 s / 1.32. 3.2L refused 12° because it "costs the standing stance altogether" — on this plant the
  standing rider survives a held full stick **2.13 s** there, against 1.37 s at the old cap on the old table.
- **The turn pair, the gate (ruling 29r): still 0 of 8.** But it moved, and in the way the owner described: at caps 9
  to 13 **no fall happens in the bottom turn any more**, and the earliest fall goes from 0.68 s (cap 5) to 1.52 s
  (cap 10), with 4 of 8 runs now completing the bottom turn, climbing, and waiting for the wave [M].
- **Seatbelts held** [M]: `tsc` clean, the suite green, the default game byte-identical, 28 of the 30 old bar rows
  unchanged (the two that moved are the held carves, which is what this step touches).

## 2. The plant held until it settles (item 1)

### 2.1 How it is measured, and the standing rule

`../rail-dig/settled.probe.ts`, on the roll-plant lab. At each speed and rail the board is held at that roll with its
**yaw and sideslip free** for 8 s, so it settles into the turn that rail makes (the trim). Each of the twelve
derivatives is then a central difference about that trim with the triple held — exactly 3.2f's method — except that
**the hold runs 10 s and the number kept is the mean of its last second**, and the probe reports:

- a **ladder**: the derivative at 0.35, 0.6, 1, 2, 4, 6, 8 and 10 s of hold, so the reader sees it come to rest;
- a **settled flag**: whether the two halves of that last second agree within 3 % (or 3 units);
- how far it moved over that last half-second, for the cells that do not settle.

**Ruling 29t's standing rule — a captive hold's number is not used until the hold is shown settled — is met for every
cell except three, which are named below and cannot meet it in principle.**

Why 0.6 s was not enough, in one table (7 m/s, the side force per radian of sideslip; `results/settled-long.jsonl`) [M]:

| Rail | 0.35 s | **0.6 s** | 1 s | 2 s | 4 s | 6 s | 8 s | **10 s** | 3.2f's reading |
|---|---|---|---|---|---|---|---|---|---|
| 0° | 1409 | 1409 | 1409 | 1409 | 1409 | 1409 | 1409 | **1409** | +1398 |
| 10° | 547 | 963 | 823 | 945 | 936 | 936 | 936 | **936** | +825 |
| 15° | 287 | −168 | 664 | 365 | 406 | 405 | 404 | **405** | — |
| 20° | −223 | **−1078** | 273 | −177 | −188 | −188 | −188 | **−188** | **−1387** |
| 30° | −420 | **−1920** | −442 | −552 | −779 | −797 | −798 | **−796** | **−2610** |
| 40° | −77 | **−2042** | −846 | −514 | −538 | −573 | −578 | **−576** | **−4143** |

At no rail the hold is already at rest in the first frame. At a rail it rings for one to two seconds, because a slide
at heel costs the flat bottom its lift and the board answers by sinking (`../rail-dig/README.md`). 3.2f averaged the
last quarter of a 0.6 s hold, which is where the sink overshoots.

### 2.2 The table

`src/physics/predictiveBalance.ts` `RAIL_PLANT`, every row replaced and a 15° row added (`RAIL_ANGLES` is now
0, 10, 15, 20, 30, 40). The 0° rows are this method's own; `railCorrection` adds the difference from the 0° row to
`PLANT_SPEEDS`, so straight running is untouched and the rail's effect is internally consistent.

**The side force per radian of sideslip** — the number ruling 29s turned on [M]:

| Speed | 0° | 10° | 15° | 20° | 30° | 40° |
|---|---|---|---|---|---|---|
| 5 m/s, settled | +712 | +521 | +250 | **+107** | — | — |
| 5 m/s, 3.2f | +705 | +321 | — | **−378** | — | — |
| 7 m/s, settled | +1409 | +936 | +405 | **−188** | −796 | −576 |
| 7 m/s, 3.2f | +1398 | +825 | — | **−1387** | −2610 | −4143 |
| 9 m/s, settled | +2274 | +1582 | +589 | **−152** | −548 | −537 |
| 9 m/s, 3.2f | +2272 | +1573 | — | **−358** | −418 | −530 |

- **The flip is real and it crosses at about 18° of rail** at 7 and 9 m/s. **At 5 m/s it never crosses** up to 20°,
  where the board stops holding a turn at all.
- It is **three to seven times weaker** than published at 7 m/s and it **stops growing past 30°**.
- At 9 m/s 3.2f's numbers were already modest and the correction is small; the big error was at 7 m/s, which is the
  ride speed.

**The righting moment about the feet** (K per rad of roll), the other derivative 3.2f reported as changing sign [M]:

| Speed | 0° | 10° | 15° | 20° | 30° | 40° |
|---|---|---|---|---|---|---|
| 7 m/s, settled | −283 | −134 | −45 | **+41** | +40 | +60 |
| 7 m/s, 3.2f | −285 | −180 | — | **+250** | +286 | +435 |
| 5 m/s, settled | −313 | −81 | −68 | **−82** | — | — |

It still turns over past about 18° at 7 and 9 m/s, but by **a seventh to a twentieth** of what was read, and **at
5 m/s the water rights the board under the rider at every rail**, where 3.2f read it going over.

**The three cells that do not settle, and why they cannot** [M, I]: 7 m/s at 10° (the roll and roll-rate columns),
9 m/s at 0° (roll) and 9 m/s at 10° (slip). Their ladders do not decay — they **ripple at 2 to 4 % of the value and
keep rippling**, because the plant itself has a mode that does not decay there: with the yaw free, a rigid rider on
this board weaves at about 0.9 Hz with a damping ratio of about zero at 7 m/s (`../roll-plant/README.md` §3.4). The
number kept is then a mean over about two whole cycles of that ripple, and the row says so in a comment. That is the
honest reading of the standing rule at a neutrally damped point: it cannot be met, and the size of what is left is on
the record.

### 2.3 The pitch plant (3.2g) is already settled

Ruling 29t asked whether 3.2g's table has the same problem. **It does not**, and the reason is structural [M, R]:

3.2g holds the roll, the yaw rate, the sideslip, **the pitch and the centre of mass's height**. That is six
constraints on six degrees of freedom, so the board has none left and the water's force is a function of the state
alone, with no transient to wait for. Measured here with the same ladder (`../rail-dig/results/settled.jsonl`, the
`frozen` rows at rail 0), every one of the pitch plant's eight numbers is **constant to the digit from 0.35 s to 4 s**:

| Speed | M per pitch | Z per pitch | M per heave | Z per heave | M per pitch rate | Z per heave rate | 3.2g's |
|---|---|---|---|---|---|---|---|
| 5 m/s | −1769.7 | +319.3 | −1648.2 | −701.2 | −7.7 | −364.4 | **all six exact** |
| 7 m/s | −953.0 | −357.2 | −1566.6 | −3910.4 | −11.2 | −538.5 | **all six exact** |
| 9 m/s | −498.1 | +2122.5 | −3535.9 | −9064.7 | −16.3 | −702.5 | −410, +2069, −3722, −10294, −16.6, −707 |

5 and 7 m/s reproduce 3.2g to the digit. The 9 m/s rows differ by 5–12 %: the trim there is only 5 cm of draft and the
two runs read its height over different windows, which at that draft is enough. **No change to 3.2g's table is
proposed**; its 9 m/s row carries a 10 % uncertainty that is now on the record.

## 3. Heave and pitch in the balance model (item 2)

### 3.1 What was added

`src/physics/rollModel.ts`, **additive and optional**: `YawPlant.heave` (a `HeavePlant`) carries the water's
[N, Y, K, M, Z] per metre of heave, per m/s of heave rate, per rad of pitch and per rad/s of pitch rate, plus the M
and Z the four states already there make. `heaveRows` builds the four new rows — ḣ = w, m ẇ = Z, θ̇_b = q,
I_yy q̇ = M — and `twistRows` appends them at `HEAVE_AT` = 11. Without the block **nothing moves**: every index is
where it was.

`src/physics/predictiveBalance.ts` is now **size-agnostic**: `continuousPlant` returns ten states as before, or
fourteen when the plant carries the block (the new states on the end, so the game's own indices are untouched), and
`design`, `closedLoop`, `senseMatrix` and `captureRow` take their sizes from the matrices instead of the module's
constants. `DesignWeights` gains `heaveScale` and `heaveNoise`, used only by the fourteen-state path.

**The proof that this changed nothing**: `predict.probe.ts PART=railmodel` on the *shipped* table reproduces all 30 of
3.2f's recorded rows — damping, frequency and all ten gains — **byte for byte** [M].

The derivatives it is fed are the **captive** ones (`results/settled.jsonl`, the `frozen` rows): the free ones would
double-count the re-trim this block now models.

### 3.2 What it says about a carve

`heave.probe.ts`, `results/heave-32m.jsonl`. Least damping of the closed loop; negative means a mode grows [M]:

| | 0° | 10° | 15° | 20° | 30° | 40° |
|---|---|---|---|---|---|---|
| **Ten-state, corrected free plant** (7 m/s, tall) | +0.699 | +0.655 | +0.670 | +0.562 | +0.449 | **+0.477** |
| with a frame of timing error | +0.17 | +0.14 | +0.14 | +0.17 | −0.01 | −0.09 |
| **Fourteen-state, heave and pitch carried** | +0.105 | +0.370 | +0.278 | +0.260 | +0.201 | **+0.301** |
| its least-damped mode | 0.63 Hz | 0.38 | 0.33 | 0.36 | 0.35 | 0.46 |
| with a frame of timing error | +0.11 | −0.07 | −0.21 | −0.30 | −0.34 | −0.34 |
| **the straight (0°) design held on it** | +0.11 | −0.60 | −0.83 | −0.96 | −0.96 | −1 |
| 3.2f's shipped numbers | +0.681 | +0.679 | — | +0.475 | +0.374 | **−1** |

**The answer to the question asked: the carve's first second stays stabilisable, and it does not stop being so at any
rail measured.** Both models say so, at every speed and stance (`predict-railmodel-32m.jsonl` has all 54 points).

**Where the margin actually goes thin is somewhere else.** With heave and pitch carried, the least damped mode is no
longer anything to do with the rail: it is the board's own **0.33 to 0.74 Hz** heave and pitch, and its damping is
+0.105 to +0.64 rather than the ten-state model's +0.45 to +0.70. A frame of timing error takes it negative at almost
every rail. **The reason is that the rider cannot feel it**: `senseMatrix` gives the balance the body's bank and its
rate, the head's yaw rate, the twist and its rate, and the ankle's angle and rate — **nothing about the board's height
or pitch**. So the predictor runs that mode open-loop. The 0.33–0.74 Hz also matches the measured heave ring (one to
two seconds to settle, §2.1), which is a cross-check that the four states are modelling the right thing [M, I].

**That is this round's new lead, and it is cheap:** the game already measures the load through the feet
(`rider.contact.load`) and the board's pitch. A sense of either would close the loop on the mode that is now the
weakest, and it needs no new water force. I did not build it.

At 5 and 9 m/s the fourteen-state eigensolver did not converge at some points (an 84×84 non-symmetric matrix), and
those cells say "did not converge" rather than a number. Every 7 m/s point converged.

### 3.3 Why folding heave into the twelve derivatives cannot work

`heave.probe.ts PART=check`. The quasi-static elimination says the free derivative should be the captive one plus the
heave's and pitch's contributions. It is exact at no rail and it falls apart at a rail [M]:

| 7 m/s | captive | via the heave | via the pitch | predicted | **measured** | the error | largest term over the answer |
|---|---|---|---|---|---|---|---|
| 0° | +1409 | 0 | 0 | +1409 | **+1409** | 0.2 | 1× |
| 10° | +1542 | −306 | +82 | +1318 | **+936** | 382 | 1.6× |
| 15° | +1685 | −1028 | +163 | +820 | **+405** | 415 | 4.2× |
| 20° | +1816 | −1380 | +224 | +660 | **−188** | 847 | **9.7×** |
| 40° | +2229 | −2579 | +293 | −57 | **−559** | 502 | 4.6× |
| 9 m/s, 20° | +2700 | −863 | −1211 | +626 | **−152** | 777 | **17.8×** |

Past 15° of rail the free derivative is the residual of terms ten to eighteen times its own size, and the
elimination's error is **larger than the answer**. So the condensed number is not something the plant's own linear
derivatives determine: the measured value is trustworthy (it comes from a ten-second settle, not a subtraction) but it
carries the plant's nonlinearity inside it. **Carrying the states is not a refinement; it is the only well conditioned
way to hold that information.** [M, I]

## 4. The rail cap, re-asked on the corrected plant (item 3)

3.2L kept `SCHEDULE_RAIL_CAP` at 5°, and its reason was 3.2f's reading. Both halves of that reason are now withdrawn:

- **the model half** — "past about 15° of rail the plant cannot be stabilised by any controller" — is false on the
  settled table (§3.2);
- **the game half** — "every cap over 8° loses the standing stance, falling on a full stick in 0.3–0.4 s" — **does not
  happen on this plant**. The standing rider survives 1.6 to 2.3 s at every cap up to 25° [M].

And the structural argument the model makes is the opposite of a cap: **the straight (0°) design held on the plant at a
rail is unstable at every rail above 0**, at every speed and stance (−0.13 to −1). Capping the schedule *is* holding
the wrong design.

**The grid** (`results/turn-capgrid-32m.jsonl`; the full-stick turn at 7.7 m/s on the bars' own steady start, lean
1.4 rad/s, and the turn pair at each cap) [M]:

| Cap | tall: peak yaw | to a 30° rail | 90° in | kept | fell | Compress: peak yaw | 90° in | kept | fell | turn pair: falls, and where |
|---|---|---|---|---|---|---|---|---|---|---|
| **5° (was)** | 84 °/s | 1.13 s | 2.27 s | 0.945 | 2.30 s | 60 °/s | — | — | 2.80 s | 0.68–1.98 s, **4 of 8 in the bottom turn** |
| 8° | 91 | 1.85 | — | — | 2.07 | 75 | — | — | 1.52 | 0.93–3.50, 2 in the bottom turn |
| 9° | 106 | — | — | — | 1.60 | 108 | 2.18 | 0.823 | 2.32 | 1.12–3.58, none in the bottom turn |
| 10° | 123 | 1.25 | 1.67 | 0.903 | 1.70 | 92 | — | — | 2.07 | **1.52–3.78, none, 4 of 8 reach the wait** |
| 11° | 118 | 1.30 | 1.68 | 0.959 | 1.83 | 101 | 2.03 | 0.893 | 2.10 | 1.27–3.78, none, 4 of 8 reach the wait |
| **12° (kept)** | 114 | 1.35 | **1.73** | **0.951** | **2.13** | 112 | **2.02** | 0.875 | **2.17** | 1.13–3.72, none, 2 of 8 reach the wait |
| 13° | 121 | 1.38 | 1.77 | 0.949 | 1.85 | 106 | 2.00 | 0.882 | 2.10 | 1.05–3.43, none in the bottom turn |
| 15° | 110 | 1.47 | — | — | 1.78 | 122 | 1.95 | 0.962 | 2.02 | 0.85–3.70, 2 in the bottom turn |
| 20° | 280 | — | 1.87 | 1.024 | 1.93 | 318 | 1.63 | 0.862 | 1.67 | 0.77–3.47, 2 in the bottom turn |
| 25° | 120 | 0.98 | — | — | 1.58 | 79 | 2.93 | 0.841 | 3.07 | 0.57–0.88, **8 of 8 in the bottom turn** |
| 30° | 32 | 1.05 | — | — | 1.10 | 46 | — | — | 1.73 | — |
| 40° | 27 | 0.90 | — | — | 0.92 | 26 | — | — | 1.02 | — |
| **the old rider** | **76** | **0.60** | **1.50** | **0.942** | 1.93 | **80** | **1.67** | **1.316** | never | **8 of 8 top turns, 7 of 8 one pair** |

**12° is kept, and the reasons are these** [M, I]:

1. **Both stances come round 90° — the first time the new rider has** (1.73 s and 2.02 s against the old rider's 1.50
   and 1.67). At 5° Compress never came round at all. That is the owner's own complaint — *"the surfer can almost only
   go in front"* — moving.
2. **It survives a held full stick longest of any cap in both stances at once** (2.13 s and 2.17 s).
3. **Caps 9 to 13 are a plateau in which no turn-pair fall happens in the bottom turn**, and 12 is in the middle of it
   rather than at its single best cell. 3.2L warned that neighbouring caps differ by half a second; picking a plateau's
   middle is the answer to that, not picking its peak.
4. At 20° the board spins out (280–318 °/s peak yaw); at 25° and above the turn goes slow and the rider falls sooner.

**10° and 11° are the turn pair's own best cells** (earliest fall 1.52 and 1.27 s, 4 of 8 reaching the wait step), and
10° does not bring Compress round. If the advisor or the owner wants the gate's peak rather than the plateau's middle,
10° is the number, and it is one constant. The whole grid is in the results file.

**The corrected table alone is worth something, before the cap moves**: at the unchanged cap of 5° the standing rider
goes from falling at 1.37 s to 2.30 s and comes round 90° for the first time (2.27 s), and Compress from 2.23 s to
2.80 s [M]. So about half of this round's gain is the table and half is the cap.

## 5. The turn pair — the gate (item 4)

`docs/research/turn-pair-2026-11-10`, set B (the pair on the face, Compress held, leg drive off, 8 runs), exactly as
ruling 29r reads it. `results/turnpair-32m.jsonl` [M]:

| | Top turns begun | One pair | Two pairs | Fell | When | Where the falls are |
|---|---|---|---|---|---|---|
| **Old rider** | **8 of 8** | **7 of 8** | **6 of 8** | 2 of 8 | 5.63–11.53 s | — |
| new, 3.2L (cap 5, old table) | 0 of 8 | 0 | 0 | 8 | 0.72–1.15 s | 2 up, 6 down |
| **new, 3.2m, cap 5** | 0 of 8 | 0 | 0 | 8 | **0.68–1.98 s** | 2 up, **6 down** |
| **new, 3.2m, cap 10** | 0 of 8 | 0 | 0 | 8 | **1.52–3.78 s** | 4 **wait**, 4 up, **0 down** |
| **new, 3.2m, cap 12 (kept)** | 0 of 8 | 0 | 0 | 8 | **1.13–3.72 s** | 2 **wait**, 6 up, **0 down** |
| new, 3.2m, cap 15 | 0 of 8 | 0 | 0 | 8 | 0.85–3.70 s | 2 wait, 4 up, 2 down |
| new, 3.2m, cap 20 | 0 of 8 | 0 | 0 | 8 | 0.77–3.47 s | 2 wait, 6 up, 2 down |
| new, 3.2m, cap 25 | 0 of 8 | 0 | 0 | 8 | 0.57–0.88 s | **8 down** |

**It is still 0 of 8, and I am not going to dress that up.** No run links a bottom turn to a top turn.

**But it moved, and it moved in the direction the owner described.** At the kept cap no fall happens in the bottom turn
at all — against 6 of 8 at the old cap — the earliest fall doubles from 0.68 s to 1.13 s, the latest reaches 3.72 s,
and two of the eight runs now finish the bottom turn, climb, and stand there waiting for the wave. The step that fails
has moved from *"he goes down in the bottom turn"* to *"he gets up the face and loses it in the climb or while
waiting"*. §3.2 names what is most likely under that: the 0.33–0.74 Hz board mode the rider has no sense of.

## 6. The old bars, as information only (revised orders: no gating)

`results/bars-new-32m.jsonl` against `bars-new-32L.jsonl`, the same 30 rows, **reported and not tuned to**.
**28 of the 30 are identical row for row.** The two that moved are the held carves — the only rows a rail plant and a
rail cap can touch [M]:

| | 3.2L | 3.2m | |
|---|---|---|---|
| **Held carve, tall** | 1.37 s, bank to 70°, 6.04 m/s at the end | **2.13 s**, bank to 49°, 1.82 m/s | longer, and it no longer banks to 70° |
| **Held carve, Compress** | 2.23 s, bank to 43°, 5.76 m/s | **2.17 s**, bank to 22°, 6.80 m/s | the same length, flatter, faster |
| the other 28 rows (glide, rise, push, modes, chop) | — | **identical** | yes |

The travel rows (the speed a rider settles at on a face, 29q's 27–42 km/h band) are **identical to 32j's**: 34.8 and
35.1 km/h in band on a 12° face, out of band on 8, 10 and 14°. Straight running is untouched by this step, as the
design intends.

## 7. Seatbelts

These are not bars; they protect what already works (ruling 29r item 3) [M]:

| | Result |
|---|---|
| `tsc` clean (app and tests) | **yes**, nothing reported |
| The full suite | **pass: 361 passed, 37 skipped, 1 failed** - `src/wave/SurfZoneRunner.test.ts`, 4 tests. **The same 4 fail on pristine main**, verified by stashing this step's three `src/` files and re-running that file (4 failed / 39 passed, the same names). They are PR #204's known stale 4, and that file is outside the merge suite |
| The default game byte-identical (`scripts/m1-cpu-bench.ts`, medium, 3,600 steps, fresh spin-ups) | **yes, all four hashes the same as 3.2L's** from fresh spin-ups: Canyon B snapshots `a367d938f15fa934`, state `9e5831f80e38abd9`; default Canyon snapshots `ea3d57a4d49f4b48`, state `a1a2555739210f96`. `SCHEDULE_RAIL_CAP` and `RAIL_PLANT` are only ever read through `this.predictive`, which is `newRider && …` (`AttachedRider.ts` 1925), so the default rider cannot see them |
| No unpaired rule forces or hidden motors | **yes, by construction**: this step applies no force at all. Every new number is a measured water derivative or a scheduling constant |
| The shipped ten-state controller unchanged by the size-agnostic refactor | **yes**: all 30 of 3.2f's `railmodel` rows reproduce byte for byte, gains included |

The fps trace is not in this round's seatbelt list (ruling 29t), and nothing here touches the render or the default
rider's code path: `SCHEDULE_RAIL_CAP` and `RAIL_PLANT` are read only by the new rider's predictive balance, and the
byte check covers the default sea and rider.

## 7b. A seatbelt I ran wrong, and what it cost

The first suite run reported **47 failed files and 68 failed tests**, and it was my own measurement at fault, not the
change. The worktree was a sparse checkout (`docs/`, `src/`, `scripts/`, `*.json`, `*.ts`, `*.js`) with **no `public/`
pattern**, so `public/assets/surfers/surfers.json` was checked out and the four `surfer*.glb` files were not. Every
failing file read an asset off disk - `src/scene/rig/` (glbSkeleton 5 of 5, fallReflexes 14 of 14, deepTubePose 4 of 4,
stanceArms, stanceGauge, stanceExtremities), `scripts/assets/surferAssets.test.ts`, the `src/wave/barrel/` library
tests, `SurfZoneRunner*`, `sweptEverySpot`, `stanceFigure`, `cueMeasures`, `soundManifest` - and whole files failed in
5 to 13 ms, which is a missing file and not a logic change. A further 26 files reported "(0 test)" for the same reason
at collection.

**The worktree recipe in the task is right for probes and wrong for a seatbelt**, and I used it for a seatbelt without
checking. `git sparse-checkout disable` fixed it. The lesson worth keeping: a suite run in an incomplete tree could not
have caught a real break in those areas either, so a green tick from it would have been worth nothing.

## 8. What I am not sure about

- **The cap is still a hand-set number off a rough landscape.** The plateau 9–13 is four cells wide and its members
  differ by half a second in the turn pair. 12 is the plateau's middle, not a derived value. It will have to be
  re-checked when two-way coupling lands, because digging the rail changes that plant.
- **Three cells of the table do not settle and cannot** (§2.2). They ripple at 2–4 % on a neutrally damped weave. I
  kept their mean over whole cycles and said so; a stricter reading of the standing rule would drop those three points
  and interpolate, and I did not do that because dropping 7 m/s at 10° would remove the ride speed's own first rail.
- **The fourteen-state model is not in the game.** The capability is in `src/`, the analysis is done, and the shipped
  controller is still the ten-state one. Wiring it in needs a frozen table in `src/` and a sense of heave or pitch;
  without the sense it is worse than what ships (§3.2), so I did not wire it.
- **The fourteen-state eigensolver does not converge at some 5 and 9 m/s points.** Those cells say so. The 7 m/s
  column, which is the ride speed and where ruling 29s's claim lived, converged at every rail.
- **3.2g's 9 m/s pitch row carries about 10 % of uncertainty** (§2.3). I did not chase it; the pitch loop is held
  (ruling 29l).
- **The turn pair is still 0 of 8.** Nothing here claims the rider can get round the wave. The step that fails has
  moved out of the bottom turn, which is a different failure, not a solved one.

## 9. What the owner would feel, and what to try

The ride address is unchanged in form; the cap and the table are not switches, they are the new rider's own:
`?rider=new` as before.

1. **Does the stick come round now?** Slam it in Compress and in standing. Both should turn through about a quarter
   circle in about two seconds. Compress never did that before.
2. **Does he still go down in the bottom turn?** He should not — every measured fall has moved past it. What should
   happen instead is that he gets up the face and loses it in the climb, or while sitting there waiting for the wave.
   If that is what it feels like, the measurement and the ride agree and the next job is §3.2's missing sense.
3. **Does the turn feel too loose at a bigger rail?** The cap is one constant and the whole grid is measured, so it can
   move either way on a word.


## 11. The owner's three points from riding 3.2L, and his own acceptance test

Written after the coordinator's messages of 2026-11-13. The owner rode 3.2L and said the body and arms read well, the
turning is still not fast enough, the body adjusts to the opposite side during the turn, and **the balance is too soft
when lowered**; and separately that he is stable at low speed and loses the turn as the speed rises, that **a
compressed turn to take the wave on the side must never fall**, and that falls belong at high speed or in a hard
reversal and nowhere else.

### 11.1 His acceptance test, built and calibrated (`hold.probe.ts`)

The movement: on the Canyon-matched wave face (`FaceWater`, 1.4 m, 2.6 m deep, 16°, running at 5.7 m/s - the turn-pair
probe's wave), placed in trim 0.75 face lengths ahead of the crest heading 45° off the fall line at the wave's pace
plus 0, 1.5 or 3 m/s, Compress or tall, stick 0.5 or 1. Bring the board round until it is **85° off the fall line** -
the wave on the side - then centre the stick and hold.

**The first version of this test was wrong and I am recording that rather than quietly replacing it.** I built it on
`Slope`, flat water. With the stick centred a plane gives nothing to hold a line: the board carries on turning until it
points up the slope, slows and drops the rider. **That version failed the old rider 4 of 20** - the rider the owner
calls closer to reality - so it was measuring the plane, not the movement.

On the face it calibrates, and the result is stark [M]:

| | Reaches the wave on the side | When | Rail used | Heading actually turned |
|---|---|---|---|---|
| **Old rider** | **12 of 12** | 2.2–4.0 s | **41–48°** | **56–92°** |
| **New rider (3.2m, cap 12, lean 1.4)** | **0 of 12** | — | 24–66° | **1.9–2.7°** (one run 28.6°) |

The new rider puts the board on its rail and **the board does not turn**. Neither rider survives the extra 5 s hold
afterwards, which I now think nothing can: `FaceWater` is uniform along the crest with no pocket, so with the stick
centred there is no line to hold (the turn-pair README says the same). **So the gate is "reaches the wave on the side
without falling", which the old rider passes 12 of 12 and the new rider fails 12 of 12.**

### 11.2 Point 1 refuted: it is not the lean rate, and it is not the cap

The coordinator asked me to re-derive `LEAN_IN_RATE`'s bound with the body thrown, the legs driving and the rail's own
lift included, on the reading that 1.4 rad/s is a lower bound. **I measured before deriving, and the measurement says
the rate is not the limit** (`results/hold-grid-32m.jsonl`) [M]:

| lean \ cap | 5° | 8° | 12° | 20° | 30° |
|---|---|---|---|---|---|
| 1.4 rad/s | 0/12 | 0/12 | 0/12 | 0/12 | 0/12 |
| 2.5 | 0/12 | 0/12 | 0/12 | 0/12 | 0/12 |
| 3.5 | 0/12 | 0/12 | 0/12 | 0/12 | 0/12 |
| **5 (the old rider's own)** | 0/12 | **1/12** | 0/12 | 0/12 | 0/12 |

**Flat zero across twenty cells**, and the median heading reached barely moves: 47.3° at lean 1.4 to 50.8° at lean 5,
against the 85° the test asks and the 112–137° the old rider gets. A capture-point cost (§11.4) at 0.05, 0.08, 0.13 and
0.2 m is also 0 of 12 at every value. **So re-deriving the bound would have raised a number that is not the limit**,
which is the trap the last six rounds fell into, and I did not build it.

### 11.3 What the limit is: he leans past the rail's bite, not too slowly

The old rider reaches **41–48° of rail and turns 56–92°**. The new rider reaches **60–66° and turns 2°**. `RAIL_BITE` is
**48°** - and the note on it says the rail is read from **the water's surface under the board**, not the world's level,
because "the rail bogs against the water it cuts"; it records that on a 30° face a board's downhill rail was past the
bite 18° into the water while its uphill rail bit on to 78°.

That is the whole asymmetry. **On flat water the same new rider with the same stick turns 90°** (§4, cap 12: 1.73 s
standing, 2.02 s Compress). On a 16° face the same balance drives the downhill rail past the 48° bite - a face puts the
rail about its own slope closer to the bite - the board stops carving, and he falls over sideways having changed heading
by two degrees.

**So the owner's "the turning is still not fast enough" is the symptom of leaning too far, not too slowly.** Raising the
lean rate gets him past the bite sooner; raising the cap changes which gains he holds while he does it. Neither can
help, and the measurement says neither does. [M, I]

**What would change it, named and not built:** the balance needs a limit on the rail it may *set*, referenced to the
water's surface under the board at `RAIL_BITE`, which is a different lever from `SCHEDULE_RAIL_CAP` (that caps which
gains are looked up, not the rail the rider asks for). The old rider has such a limit in effect and stops at 41–48°.
This is the next thing to try and it is one bound, not a tune.

### 11.4 Point 3: the schedule designs per stance; the weights are in the wrong units

`stance.probe.ts`, `results/stance-32m.jsonl` [M, R].

**The schedule does design per stance.** `SCHEDULE_DEPTHS = [0, 0.195, 0.3]`, and Compress at 0.3 is a corner, so it
gets a design made on its own plant - not an interpolated shape. **That branch of the coordinator's question is
refuted.**

**The weights are the problem, and specifically their units.** There is no capture-point cost in what ships
(`captureScale` is absent from `DEFAULT_WEIGHTS`; 3.2j built it and did not keep it). The only thing standing for
"about to fall" is `stateScale[2] = 0.05 rad` - **a 2.9° bank limit, the same for all three stances** - while the lean
at which the capture point actually leaves the feet is:

| Stance | Height over the feet | ω₀ = √(g/L) | 0.1 s delay as a share of 1/ω₀ | Lean at the feet's edge | Least damping, rail 0, 5 / 7 / 9 m/s |
|---|---|---|---|---|---|
| tall | 0.84 m | 3.42 | 0.342 | **8.9°** | 0.579 / 0.681 / 0.675 |
| crouch | 0.65 | 3.89 | 0.388 | **11.5°** | 0.499 / 0.683 / 0.691 |
| **Compress** | 0.55 | 4.22 | **0.422** | **13.5°** | **0.452 / 0.598 / 0.660** |

The physics already says a low stance has 53 % more room before the capture point leaves the feet - the owner is right
that crouching should be *more* stable - and the cost tells the designer all three have the same 2.9°. Compress is also
the least damped stance at rail 0 at every speed, and the fixed delay is 42 % of its own time constant against 34 % for
tall. The LQR answers by giving Compress **less gain and less damping** than tall (ankle-bank −1.067 against −0.972,
ankle-bank-rate −0.089 against −0.111 at 7 m/s), where the coordinator's reading - less gain and *more* damping - is the
right shape.

**But a capture-point cost does not rescue the acceptance test** (§11.2): 0 of 12 at 0.05, 0.08, 0.13 and 0.2 m. So the
units are wrong and worth fixing, and they are not what is dropping him on a face. §11.3 is.

### 11.5 Point 2: the counter-steer is not in the reference, and most of it is a 5 m/s saturation

Two separate things, separated by measurement [M]:

- **The reference never asks for the opposite rail.** `steadyTurn`'s board roll has the same sign as the lean asked at
  all 18 points measured (a 30° lean asks +19° to +39° of rail). So `turn: 'tan'` is not the cause.
- **The board does go 0.9–2.1° onto the other rail for about 0.13 s**, in the ideal loop with no delay and exact state,
  so it is the design's own. But it is also **Newton's third law at the ankle**: the ankle applies equal and opposite
  torques to the board and the body, so a jointed rider banking one way necessarily rolls the board the other until the
  water answers. A surfer does lean the body and let the board follow; this is not a bicycle's handlebar.
- **What the owner can actually see is the ankle joint, and that is a 5 m/s saturation.** With the schedule read near
  rail 0 the reference demands an ankle rest of **−20.5° / −30.8° / −46.2°** for leans of 20° / 30° / 45°, against the
  ankle's whole range of **±14.3°** (`ANKLE_REST_RANGE` 0.25 rad) - two to three times its range, in the wrong
  direction. It saturates, and the joint swings +4 to +6° then settles hard the other way. At 7 and 9 m/s the same
  reference is +1 to +8°, inside range. **Reading the schedule at the rail removes it: at cap 12 the demand is −1.4° to
  −4.0° at every speed and stance.**

**And that is why the three 5 m/s cells matter the way the owner says and not the way they were argued before.** The
5 m/s falls are not a settle artefact: at 5 m/s the capped schedule asks the ankle for an impossible angle. The cap
raise is one fix for the 5 m/s falls, for the visible counter-adjustment, and for part of the slow start.

### 11.6 The fall shape the owner asked for

He wants the fall rate to **rise** with speed. On the acceptance test the new rider fails at every speed, which is flat
and therefore wrong in shape as well as in level - as the coordinator said. I have not fixed the shape and I am not
claiming the cap raise does. What is on the record is that the mechanism in §11.3 is **worse at low speed on a face**,
because a slower board needs more rail for the same turn and therefore reaches the bite sooner, which is the right
direction for explaining why he is dropped where he should be most solid. That is reasoning, not a measurement, and it
wants a probe of its own.

## 12. Files (3.2m)

- `src/physics/predictiveBalance.ts`: `RAIL_PLANT` replaced with the settled table and a 15° row (`RAIL_ANGLES` now
  0, 10, 15, 20, 30, 40), with the account of why 3.2f's numbers were three to nine times too large; `continuousPlant`,
  `design`, `closedLoop`, `senseMatrix` and `captureRow` take their sizes from the matrices instead of the module's
  constants, so a fourteen-state plant can be designed on without touching the ten-state one; `plantAt` passes a heave
  block through; `DesignWeights` gains `heaveScale` and `heaveNoise`.
- `src/physics/rollModel.ts`: `HeavePlant`, `YawPlant.heave`, `heaveRows`, `twistStateCount`, and the heave and pitch
  columns in `yawRows`' water rows. All optional: without the block nothing moves.
- `src/physics/AttachedRider.ts`: `SCHEDULE_RAIL_CAP` 5 → 12, with the account of why 5 was 5 and what withdrew it.
- `docs/research/new-rider/rail-dig/settled.probe.ts` (new): the rail sweep with every hold shown settled, as a ladder,
  free and captive, plus the heave and pitch derivatives the model needs.
- `docs/research/new-rider/3.2/heave.probe.ts` (new): the fourteen-state model against the ten-state one at every rail,
  and the conditioning of the quasi-static elimination.
- `docs/research/new-rider/3.2/stance.probe.ts` (new): what the schedule does per stance, and where the counter-steer
  comes from (the reference against the LQR's own transient).
- `docs/research/new-rider/3.2/hold.probe.ts` (new): **the owner's acceptance test** - a compressed turn to take the
  wave on the side, on the Canyon-matched face, with the old rider's score beside it as the test's calibration.
- `results/`: `stance-32m.jsonl`, `hold-32m.jsonl`, `hold-old-32m.jsonl`, `hold-grid-32m.jsonl`,
  `hold-capture-32m.jsonl`, `../rail-dig/results/settled-long.jsonl` (the table, ten-second holds) and `settled.jsonl` (the
  four-second sweep, both sets, and the captive heave and pitch rows), `predict-railmodel-32m.jsonl`, `heave-32m.jsonl`,
  `turn-new-32m.jsonl` (the kept cell), `turn-capgrid-32m.jsonl` (the whole cap grid), `turnpair-32m.jsonl` (the gate,
  every cap, with the old rider's row), `bars-new-32m.jsonl` (all 30 guard rows), `suite-32m.txt`,
  `canyon-byte-32m.txt`.
