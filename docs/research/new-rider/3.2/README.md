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
