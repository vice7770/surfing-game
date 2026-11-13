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
