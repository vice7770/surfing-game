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
