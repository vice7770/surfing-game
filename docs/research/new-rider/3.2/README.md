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

# Part 13: step 3.2n, the bite lever refuted, and the stance's units built but not switched on (ruling 29w)

Written 2026-11-13 by the rail-dig agent (Opus 5, effort xhigh), on branch `claude/rider-new-32n` (from
`claude/rider-new-32m`, rebased on main d937b8d8). The contract: `../ruling-29.md` 29w.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **The lever I named last round does not exist, and the mistake was mine.** 3.2m said the old rider stops at 41–48° of
  rail and the new one blows through to 60–66°, with `RAIL_BITE` at 48°. **I compared the world-referenced column to a
  constant that is defined against the water.** Measured properly, the **old rider is past the bite in 12 of 12 runs**,
  for 0.23 to 1.12 s, reaching **54 to 94°** of water-referenced rail — and it still passes the owner's test 12 of 12.
  So a limit at the bite would clamp the good rider harder than the bad one. **I did not build it.** [M]
- **The real discriminator is heading turned per rail used, and the new rider's rail does not hold.** Both riders put
  the board on a big rail. The old rider turns **86–137°** of heading; the new rider turns **2–32°**. A trace shows why:
  the new rider's rail peaks and then **unwinds** (water-referenced rail +24° at 0.9 s, back to +4° at 1.8 s) while its
  body's bank stalls at **25°** against the 50° asked, where the old rider's bank reaches **49°** and its rail holds
  −41° for 1.2 s. The ankle never saturates (±1–5° of a ±14.3° range). **It reaches a rail and cannot keep it.** [M]
- **The stance's units are a real bug and it is now fixed in the code, in two forms, both measured — and neither is
  switched on.** The bank's cost was one 2.9° limit for all three stances where the physical limit is 8.9 / 11.5 /
  13.5°. Both forms improve the model's margin against a frame of timing error at **every one of the 18 table points**,
  most for Compress, and both **cost the standing stance its quarter-circle turn in the game**. The owner's acceptance
  test does not move (0 of 12, or 1 of 12 with the blunter form). **`feetReach` is an available weight, absent from
  `DEFAULT_WEIGHTS`, and the switch is the advisor's call** — §4 has the trade in numbers.
- **What the units fix does buy, measured:** the turn pair's two falls-while-waiting-in-Compress disappear (0 of 8
  against 2 of 8), which is exactly the owner's "the surfer should not fall so much when lowered". What it costs: the
  standing stance's 90° turn (1.73 s → never, and its fall at 2.13 s → 1.10 s). [M]
- **The shipped behaviour of this step is identical to 3.2m**, proven: all **54** `railmodel` rows reproduce byte for
  byte, gains included. So **this round gives the owner nothing new to ride, and I am not going to present it as a
  ship.** It is a refutation plus a built, measured, documented fix awaiting a ruling. [M]
- **The gate: the owner's acceptance test is 0 of 12 against the old rider's 12 of 12.** Unchanged. [M]

## 2. The bite lever, refuted

`hold.probe.ts` now reads the rail **the way `AttachedRider.prepareBank` reads it for `RAIL_BITE`** — the board's roll
about its heading taken from the water's surface normal under the board, not the world's level [R, M]:

| | World rail | **Water rail** (what the 48° bite is of) | Past the bite | Heading turned | Reaches across |
|---|---|---|---|---|---|
| **Old rider** | 37–84° | **54–94°** | **12 of 12**, 0.23–1.12 s | **86–137°** | **12 of 12** |
| **New rider** | 24–83° | **25–90°** | 10 of 12, 0.02–0.70 s | 2–32° | 0 of 12 |

3.2m's "old 41–48°, new 60–66°" were both **world** figures. Against the water the old rider is the one that goes
furthest past the bite. The bite is not what separates them, and clamping it would hurt the rider that works.

**`RAIL_BITE` stays on the re-check list for two-way coupling** (the owner's standing instruction): it is a hand-set
48° and a digging rail may bite past it. That is unchanged by this round, and it is now also recorded that the riders
spend a quarter to a whole second past it in normal use, so it is not a wall either rider respects.

## 3. What the trace says instead

`results/hold-trace-new-32n.jsonl` and `hold-trace-old-32n.jsonl`, Compress, the wave's own pace, full stick [M]:

| | 0.3 s | 0.5 s | 0.9 s | 1.3 s | 1.8 s | 2.5 s |
|---|---|---|---|---|---|---|
| **Old** heading off the fall line | 49.7° | 37.6° | 9.7° | 18.6° | 48.9° | **85.1°** |
| **Old** world roll / bank | −2 / 13 | −16 / 25 | −35 / 39 | −41 / **45** | −42 / **48** | −40 / **49** |
| **New** heading off the fall line | 46.0° | 43.6° | 27.4° | 13.9° | 0.4° | fell 2.2 s |
| **New** world roll / bank | −4 / 12 | −8 / 17 | −23 / **25** | −22 / **24** | **−4** / 10 | — |

Both drop down the face first, as a bottom turn should. The old rider's rail and bank then **hold** (−41°/48° for over a
second) and the heading comes round. The new rider's **unwind** at 1.8 s — the rail falls back to −4° and the bank to
10° — and it falls. Its lean asked was pinned at 50° throughout and its ankle rest sat between −4° and +7°, nowhere near
its ±14.3°. **Nothing is saturating and nothing is being asked for too slowly; the balance simply does not hold the
lean it has.** [M, I]

## 4. The stance's units (item 2): built, measured, not switched on

`DesignWeights.feetReach` (`predictiveBalance.ts`): when set, the bank's cost stops being one angle for every stance.
Two forms were built and measured.

**Form A, the physical limits outright** (`bankLimit = feetReach / L`: 8.9 / 11.5 / 13.5°): gains fall most for the
lowest stance (Compress −22 to −25 % against tall's −10 %), timing margin up at all 18 points (Compress at 5 m/s, no
rail: 0.036 → 0.052). **Gate 1 of 12.** Cost: the held carve standing 2.13 s → 1.12 s, 90° no longer reached.

**Form B, the ranking only** (`bankLimit = stateScale[2] × L_tall / L`, so the tall value is untouched and the ratio is
the physics'): the **tall design is byte-identical at all six of its points**; Compress −13 % of gain and timing margin
up everywhere (5 m/s, no rail: 0.036 → 0.046). **Gate 0 of 12.** Cost: the standing turn still goes.

**Why form B still costs the tall turn, which I did not expect:** the schedule reads the **instantaneous leg depth**
(`yawDepth`, the leg's own rest), not the stance the player chose. A rider nominally standing tall compresses as it
balances, so it blends into the crouch and Compress designs continuously. **The stances are never isolated**, so there
is no form of this fix that changes the low stances and leaves the tall ride alone. That is worth knowing on its own. [M, R]

**The trade, measured both ways on the same machine in the same session** (`results/turnpair-32n.jsonl`,
`turn-new-32n.jsonl`, `turn-off.jsonl`) [M]:

| | feetReach off (= what ships) | feetReach on (form B) |
|---|---|---|
| Turn pair, where the 8 falls are | **2 while waiting**, 6 in the climb | **0 while waiting**, 8 in the climb |
| Turn probe, standing | 90° in **1.73 s**, falls 2.13 s | **never reaches 90°**, falls **1.10 s** |
| Turn probe, Compress | 90° in 2.02 s, falls 2.17 s | 90° in 2.05 s, falls 2.15 s |
| The owner's acceptance test | 0 of 12 | 0 of 12 |
| Model: margin on a frame of timing error | — | **up at all 18 points** |

**I did not switch it on.** The gate does not move, and it costs the standing stance the quarter-circle turn whose loss
the owner complained about in so many words two rounds ago ("the surfer is no longer able to turn sharply"). The
benefit it buys is on a probe ruling 29r says to report rather than gate. `feetReach` is in the code with its full
account, reachable as `BALANCE='{"weights":{"feetReach":0.13}}'`, and **the switch is the advisor's ruling to make** —
the numbers above are the whole input to it.

## 5. The gate, and the reports (items 3 and 4)

**The owner's acceptance test** (`hold.probe.ts`, the Canyon-matched face; a compressed turn to take the wave on the
side) [M]:

| | Reaches the wave on the side | Heading turned | Water rail used |
|---|---|---|---|
| **Old rider** | **12 of 12** | 86–137° | 54–94° |
| **New rider, 3.2n (what ships)** | **0 of 12** | 2–32° | 25–90° |

**The turn pair** (ruling 29r's gate, set B, 8 runs): **0 of 8**, falls 1.13–3.72 s, 2 while waiting and 6 in the climb
— **the same as 3.2m**, since nothing shipped changed. The old rider is 8 of 8 with 7 of 8 linking a pair.

**The chop by speed, and the old bars:** unchanged from 3.2m by construction (the 54-row design check). 3.2m's reading
stands: the chop grid is 2 / 3 / 2 / 1 of 3 at 5 / 7 / 9 / 12 m/s, and 28 of its 30 bar rows matched 3.2L.

**The fall shape the owner asked for** (rising with speed) is still not there and I have not addressed it this round.

## 6. What I am not sure about

- **Why the new rider's rail unwinds** is the question I would take next, and it is the same place 3.2m pointed: the
  least-damped mode is the board's own 0.33–0.74 Hz heave and pitch, which the balance has no sense of. I was told not
  to start on that this round and I have not.
- **Form A against form B** is a judgement I have left open rather than resolved: A is the physics and costs more; B is
  the ranking and costs less. Both fail the gate.
- **The acceptance test's hold phase cannot be passed by anyone** on a uniform `FaceWater` (no pocket, nothing to hold a
  trim line), so the gate is "reaches across", not "reaches across and then holds for five seconds". The old rider's
  12 of 12 is what calibrates it.

## 7. Seatbelts

| | Result |
|---|---|
| `tsc` clean (app and tests) | **yes** |
| The shipped design unchanged | **yes** — all **54** `railmodel` rows byte-identical to 3.2m, gains included; `feetReach` is absent from `DEFAULT_WEIGHTS` and every use of it is behind `if (w.feetReach)` |
| The full suite | **pass: 361 passed, 37 skipped, 1 failed** (`src/wave/SurfZoneRunner.test.ts`, 4 tests) - **exactly 3.2m's result**, and those 4 are PR #204's known stale tests that fail on pristine main in a file outside the merge suite |
| The default game byte-identical | **not run - stopped at the usage limit.** It cannot differ: the shipped design is byte-identical (the 54-row check above) and `feetReach` is absent from the defaults, so the default rider's path is untouched. Run it before any merge |
| No unpaired rule forces or hidden motors | **yes, by construction**: no force is added; the only `src/` change is an optional LQR weight |

Run from a **full checkout** this time, not the sparse one that voided 3.2m's first suite run.

## 8. Files (3.2n)

- `src/physics/predictiveBalance.ts`: `DesignWeights.feetReach` (optional, absent by default) and the bank's
  stance-ranked cost behind it, with both forms' measurements in the note.
- `docs/research/new-rider/3.2/hold.probe.ts`: the acceptance test now also reads the **water-referenced** rail, the
  time spent past `RAIL_BITE`, and a per-frame trace (`TRACE=1`).
- `results/`: `hold-32n.jsonl`, `hold-old-32n.jsonl`, `hold-trace-new-32n.jsonl`, `hold-trace-old-32n.jsonl`,
  `stance-32n-base.jsonl` / `-ranking` / `-limits`, `turn-new-32n.jsonl`, `turn-off.jsonl`, `turnpair-32n.jsonl`,
  `suite-32n.txt`, `canyon-byte-32n.txt`.

# Part 14: step 3.2p, the board's heave and pitch sensed — and the plant that carries them refuted (ruling 29w item 1)

Written 2026-11-14 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32p` (from
`claude/rider-new-32n`, rebased on main d7f121a3). The contract: `../ruling-29.md` 29w item 1.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

- **The two senses are built and wired, exactly as asked** [R]: the load through the feet (`rider.contact.load`'s own
  substep value, less the slow part the soles have adapted to) and the board's nose-up pitch rate. Both go into the
  same sense line as the other seven, so both arrive **0.1 s late**, and the commands keep the **0.05 s** motor lag.
- **It is off by default, and the reason is not the sense. It is the plant the sense requires** [M]. A sense is of a
  state, so the four board states have to be carried, and carrying them means reading the **held** table — the free one
  has the board's re-trim folded in already, and adding the block on top would count it twice. In the game the held
  table is worse in **every** role it can take, on the owner's own test: gains designed on it fall at **0.55–0.93 s**,
  with the senses on **0.50–0.72 s**, and with the shipped gains and the held plant only in the predictor and the
  filter **0.47–1.68 s** — against **1.10–3.43 s** for what ships. The same loss appears with the senses switched off,
  so **it is the plant and not the sense**.
- **The cause is in this round's own measurement.** `boardmode.probe.ts` measures the board's heave-and-pitch mode in
  the game for the first time: **1.41 / 1.01 / 1.33 / 1.41 Hz** at 5 / 7 / 9 / 12 m/s. A period of 0.7–1.0 s. A loop
  acting over a turn therefore meets the water's answer **with the re-trim already in it**, which is the free table.
  3.2m's finding that the elimination is ill conditioned says the free numbers cannot be *derived* from the captive
  ones; it does not say the captive ones are what the loop meets.
- **3.2m's `null` cells are not an eigensolver failure: the design has no solution there** [M]. At no rail the hull's
  own symmetry makes a roll, a slide or a yaw rate produce no net vertical force and no net pitching moment — measured,
  `HEAVE_PLANT`'s cross terms are zero at rail 0 — so the four board states are **uncontrollable**; and the block's own
  pair is **unstable** at 5 and 9 m/s. A cost on an unstabilisable mode asks for a gain that cannot exist. Fixed by
  giving those states **no cost at all**, which is the only honest weight: this balance's two commands are the ankle
  across and the twist, and neither can pitch the board. That is the pitch ankle's loop (`StandingBody`), not this one.
- **At 5 m/s the board's own pitch barely damps** — a damping ratio of **+0.03 to −0.08** across kick sizes, against
  **+0.10 to +0.29** at 7 and 9 m/s [M]. This is new, it is nothing to do with the balance controller, and it is a
  candidate cause for the low-speed falls ruling 29v says are the strongest signal we have.
- **What the sense buys, in the model** [M]: the four states go from **unobservable at no rail (rank 10 of 14)** to
  rank 14 of 14 at every table point; the filter's error on the board's pitch falls from **1.1–2.8° to 0.18–0.35°** and
  on its pitch rate from 5.7–11.4 °/s to 1.7–1.9; and at the rails the schedule's cap allows, a frame of timing error
  turns a growing mode into a decaying one. **The pitch rate carries nearly all of it.**
- **What it does not buy, and this is worth saying plainly:** the nominal damping does not move at all. A sense cannot
  change an LQR gain. 3.2m's hope that the unsensed mode was the wall is only half right — the mode is real and the
  rider was running it blind, but seeing it is not the same as being able to act on it.
- **The gate: the owner's acceptance test is 0 of 12, unchanged, against the old rider's 12 of 12** [M].
- **Seatbelts held** [M]: `tsc` clean on both projects, the suite as 3.2n's, the shipped design byte-identical to
  3.2m (all 54 `railmodel` rows, gains included), and the Canyon byte check — 3.2n's unfinished one — run and clean.

## 2. What was wired, and how (item 1)

`AttachedRider.predictiveBank`, under `rider: 'new'` as everything in this part is [R]:

**The load through the feet.** `captureLoad` is the water's push on the rider through the feet along the board's up
this substep, in body weights, straight off the contact ledger — the same number the capture point's validity
condition already reads (`CAPTURE_LOAD`, step 3.2h). In m/s² and less the slow part the soles have adapted to
(`LOAD_ADAPT`, 2 s), it is the deck's own vertical acceleration, and it is **zero in any steady trim and in any steady
turn**, whatever the bank, the face's slope or the apparent gravity — which is exactly where the model's heave states
are zero. A pressure sense that did not adapt would read a banked turn's own extra load as a board sinking for ever.
The adaptation is also what the receptors do: skin pressure and muscle force senses adapt to a held load and report
its changes [S, recalled].

**The board's pitch rate.** The board's spin about the heading's forward crossed with the world's up — nose up
positive. Absolute, not relative to the water, because that is what the canals sense, and the water's slope turns far
slower than the mode this is for.

**Both are already measured in the game and neither was connected**, which is what ruling 29w said. In the model they
are two more rows of `senseMatrix`: the load's row is the plant's **own ẇ row**, so it carries the heave, the pitch,
their rates and the four older states each at its measured weight; the pitch rate's is a unit row.

**Sizes.** `design`, `steadyTurn`, `closedLoop` and the runtime controller take their sizes from the matrices. The
runtime test proves the class still runs the analysis's loop to 1e-9 over 120 ticks **on both sizes**.

## 3. The model first, before the game (item 2)

`sink.probe.ts`, model only. Each number is at 7 m/s; the whole 18-point table is in the results file.

### 3.1 The reproduction check

`heavePlantAt` reproduces the block 3.2m built by hand **to the last digit** at all 16 measured points, and the
fourteen-state damping it gives matches 3.2m's own `heave` column (7 m/s tall: 0.105, 0.370, 0.278, 0.260, 0.201,
0.301) [M]. Building the twelve as a correction on `PLANT_SPEEDS` rather than replacing them outright moves the damping
by at most 0.02, so the game's own construction and 3.2m's agree.

### 3.2 What the rider can know about the board (`PART=obs`) [M]

The square root of the filter's own steady error covariance — "how well the rider knows this state". 7 m/s, tall:

| Rail | | observability | the board's heave | its pitch | its pitch rate | the body's bank |
|---|---|---|---|---|---|---|
| 0° | seven senses | **rank 10 of 14** | 8.8 mm | **2.80°** | 11.2 °/s | 0.244° |
| 0° | nine senses | **14 of 14** | 4.0 mm | **0.23°** | 1.7 °/s | 0.244° |
| 10° | seven senses | 14 of 14 | 6.9 mm | 1.99° | 7.7 °/s | 0.251° |
| 10° | nine senses | 14 of 14 | 5.6 mm | **0.28°** | 1.8 °/s | 0.222° |
| 20° | seven senses | 14 of 14 | 10.8 mm | 2.40° | 7.6 °/s | 0.265° |
| 20° | nine senses | 14 of 14 | 6.0 mm | **0.28°** | 1.7 °/s | 0.224° |
| 40° | seven senses | 14 of 14 | 12.3 mm | 1.44° | 5.7 °/s | 0.273° |
| 40° | nine senses | 14 of 14 | 6.5 mm | **0.27°** | 1.7 °/s | 0.246° |

**At no rail the four board states are not reconstructable at all.** Elsewhere they are formally observable through
the rail's coupling and the estimate is poor. With the two senses the pitch is known to about a third of a degree
everywhere, and the bank's own estimate improves a little as well. **The pitch rate alone does nearly all of this**;
the load alone leaves the pitch at 1.0–2.7°.

### 3.3 The damping, and where the sense pays (`PART=modes`) [M]

Least damping of the closed loop: nominal / with the true delay a frame early / a frame late. 7 m/s:

| | rail 0 | 10° | 15° | 20° | 30° | 40° |
|---|---|---|---|---|---|---|
| **tall, seven senses** | 0.105 / 0.105 / 0.105 | 0.377 / **−0.104** / **−0.160** | 0.280 / −0.233 / −0.242 | 0.260 / −0.309 / −0.362 | 0.201 / −0.352 / −0.420 | 0.306 / −0.332 / −0.420 |
| **tall, nine senses** | 0.105 / 0.105 / 0.105 | 0.377 / **+0.016** / **+0.058** | 0.280 / −0.166 / −0.159 | 0.260 / −0.259 / −0.290 | 0.201 / −0.320 / −0.373 | 0.306 / −0.311 / −0.386 |
| the pitch rate alone | — | 0.377 / −0.022 / +0.036 | 0.280 / −0.175 / −0.173 | 0.260 / −0.262 / −0.294 | — | — |
| the load alone | 0.090 / … | 0.377 / −0.069 / −0.156 | 0.280 / −0.218 / −0.250 | 0.260 / −0.294 / −0.348 | — | — |
| **Compress, seven senses** | 0.153 / 0.153 / 0.145 | 0.372 / **−0.059** / **−0.107** | 0.351 / −0.201 / −0.183 | 0.315 / −0.266 / −0.298 | 0.306 / −0.338 / −0.401 | 0.352 / −0.328 / −0.420 |
| **Compress, nine senses** | 0.153 / 0.153 / 0.145 | 0.372 / **+0.051** / **+0.014** | **0.505** / −0.118 / −0.120 | **0.406** / −0.206 / −0.223 | 0.306 / −0.290 / −0.314 | 0.352 / −0.313 / −0.386 |

- **The nominal damping does not move**, except in two Compress cells where the limiting nominal mode *was* an observer
  mode (rail 15 and 20: 0.351 → 0.505 and 0.315 → 0.406). A sense changes the estimator, not the regulator.
- **Where it pays is a frame of timing error, and at a rail of 10° it changes the sign** in both stances — from a mode
  that grows to one that decays. That is the rail the shipped cap (12°) actually lets the schedule read.
- Past 15° it improves everywhere and stays negative. **The sense does not make a committed carve robust.**
- A cost on the board's states (`heaveScale`) raises the nominal damping a long way (rail 10, tall: 0.377 → 0.55) and
  does **nothing** for the timing error, and with seven senses it makes the timing case worse. It is not kept.

### 3.4 A lean put over and held (`PART=time`) [M]

The model's first reproduction of 3.2n's trace. 7 m/s tall, the reference brought in at `LEAN_IN_RATE`, the board's
roll at 0.3 / 0.5 / 0.9 / 1.3 / 1.8 / 2.5 s:

| | asks | and reaches |
|---|---|---|
| **the ten-state design on the free plant** (what ships), rail 10 | 49.8° of rail | 2.2 / 12 / 34.6 / 40.4 / **40.8 / 40.8** — it holds |
| **the fourteen-state design on the held plant**, rail 10 | 38.2° | 2.7 / 9 / 11.3 / 12.4 / **4.9 / 7.6** — it peaks at 14° and unwinds |

**That is 3.2n's game trace** ("the rail peaks at +24° and unwinds to +4°, with nothing saturating") **in the model.**
The two models of the same water disagree about whether the rail holds, and the game behaved like the fourteen-state
one — which is why I went on to measure the board in the game rather than believe either.

**A caveat I am putting on the record rather than burying:** past 15° of rail those runs drive the board 8–24 cm in
heave and 20–35° in pitch, far outside the ±2 cm and ±1° the derivatives were measured over. The big-rail collapse in
this table is an extrapolation and I do not quote it as physics. The rail-10 row reaches −76 mm, which is still four
times the measurement window.

## 4. The board's own mode, measured in the game (`boardmode.probe.ts`)

This probe exists because of this folder's standing rule: **a captive hold's number is not used until it is checked.**
The block says the board, with its rider, porpoises in straight running at 5, 9 and 12 m/s. The glide bars say it holds
a steady glide at all four speeds. So: a steady glide, the board's pitch kicked 0.5 rad/s, and watch it come back [M]:

| Speed | **the game**, a 0.5 rad/s kick | **across kicks of 0.2, 0.5 and 1 rad/s** | the block, rigid pair | the block, board alone |
|---|---|---|---|---|
| 5 m/s | 1.41 Hz, damping **−0.084** | 1.16–1.41 Hz, damping **+0.029 / −0.084 / −0.078** | +0.386 /s, 0.95 Hz — grows | −2.35 /s — decays |
| 7 m/s | 1.01 Hz, damping **+0.102** | 0.94–1.60 Hz, damping **+0.173 / +0.102 / +0.290** | −0.418 /s, 0.63 Hz → damping **+0.104** | −6.09 /s |
| 9 m/s | 1.33 Hz, damping **+0.26** | 1.33–1.75 Hz, damping **+0.191 / +0.260 / +0.190** | +0.569 /s, 0.80 Hz — grows | −4.66 /s |
| 12 m/s | 1.41 Hz, damping **+0.23** | — | (the table is held at 9 m/s) | — |

**The kick sweep is the one that should be quoted, and it tightens my own claim.** The frequency carries real scatter
(0.94–1.75 Hz: this is a fit to a short ring in a nonlinear system, not a clean modal test), so "1.0–1.4 Hz" is better
read as **about 1 to 1.5 Hz**. What is robust is the **ordering and the sign**: at 5 m/s the mode is **neutral to
slightly growing (+0.03 to −0.08)** at every kick size, while at 7 and 9 m/s it is solidly damped (+0.10 to +0.29).
So "unstable at 5 m/s" overstates it; **"the board's pitch barely damps at 5 m/s and damps well at 7 and 9"** is what
the measurement supports, and it carries the same consequence.

Four things come out of this, and they are the most useful numbers in the round [M, I]:

1. **The rigid pair is the right modelling choice, not the fault I suspected.** Its damping at 7 m/s is 0.104 against
   the game's 0.102. Treating the board alone (2.54 kg) puts the mode at 6.3 Hz, nowhere near.
2. **3.2m's "0.33–0.74 Hz" is the model's frequency, and it is 30–60 % low.** The game's board mode is at 1.0–1.4 Hz.
3. **At 5 m/s the board's own pitch barely damps at all.** Not the balance's — the board's, with the shipped
   ten-state controller and no stick input: a damping ratio of +0.03 to −0.08 across kick sizes, against +0.10 to
   +0.29 at 7 and 9 m/s. A glide survives, but a disturbance leaves a ring that does not die. Ruling 29v says low speed
   is where a surfer is most solid and where a fall is the strongest signal we have. **This is a mechanism for that,
   and it is not in the balance at all.**
4. **The block is wrong at 9 m/s**, where it predicts a flutter the game damps at 0.26.

The load sense's own spread over these runs, which is where `HEAVE_SENSE_NOISE`'s first number comes from: rms
0.34 / 0.20 / 0.17 / 0.14 m/s² at 5 / 7 / 9 / 12, peaks 1.2–1.7 [M]. 1.1 m/s² is between the rms and the peak and is a
hand-set number.

## 5. The gate — the owner's acceptance test (item 3)

`hold.probe.ts`, the Canyon-matched face, a compressed turn to take the wave on the side. **Rail used and heading
turned beside the count, as 3.2m's table showed they must be** [M]:

| | Reaches the wave on the side | Heading turned | Water rail used | Falls at |
|---|---|---|---|---|
| **Old rider** (29w's calibration) | **12 of 12** | 86–137° | 54–94° | — |
| **New rider, 3.2p (what ships)** | **0 of 12** | 1.9–31.9° | 24.6–89.6° | 1.10–3.43 s |
| new, the board carried, gains on the held plant | 0 of 12 | 1.6–10.6° | 3.8–11.3° | 0.50–0.72 s |
| new, the board carried, senses off | 0 of 12 | 2.0–2.5° | 8.5–23.6° | 0.55–0.93 s |
| new, the board carried, the shipped gains | 0 of 12 | 1.8–5.5° | 4.5–43.4° | 0.47–1.68 s |

**The gate does not move, and the three rows below the ship line are why `heaveSense` is off.** Every way of putting
the board's own states into this loop costs the rider half the time he currently survives, and the rail he reaches
collapses with it. The senses-off row is the proof that it is the plant: the loss is there before any new sense is read.

**The shipped row is 3.2n's row** — the design is byte-identical — and it is verified twice over. Within this session
it reproduces **exactly**: a baseline run made in this worktree *before* any `src/` change and the shipped run made
*after* are identical on every recorded column in all 12 runs (`results/hold-base-32p.jsonl` against
`results/ask-ten-32p.jsonl`).

**Against 3.2n's stored file, though, several cells differ a long way** — the heading turned in one Compress run reads
28.6° there and 7.3° here, and in one tall run 31.9° there and 2.6° here — while the headline (0 of 12, every run
falling) is the same. I cannot account for that: the design is byte-identical and the probe is deterministic within a
session. **So this probe's absolute per-run numbers should be compared only inside one session's results**, and the
ranges across the twelve are what should be quoted across parts. That is a caveat on every hold-probe number in Parts
12 to 14, including mine.

## 5b. The owner's own words after riding 3.2n, and the number he can feel

The coordinator asked him whether the surfer never starts the turn or starts it and loses it. He answered:

> "starts turning just not fast enough and doesn't have the balance expected for a surfer, movement is not enough
> responsive to surf the wave"

The coordinator read that together with 3.2n's trace ("the bank stalls at 25° against the 50° asked") as one
observation from two seats, made **the lean asked against the lean reached** the headline number, and named a
candidate: the balance's bank cost is a **2.9° limit for every stance** where the capture point actually leaves the
feet at 8.9 / 11.5 / 13.5°, so a balance that believes it is falling at 2.9° would resist a 50° lean the whole way.

**I measured the pair before building anything, and the premise does not survive it.** `hold.probe.ts` now records the
lean asked, the bank at the moment the ask arrives, the best bank reached at all, and the share [M].

**First, two corrections to my own first reading of this table, because I nearly reported it wrong.** The stick asks
**25° at half and 50° at full**, not 50° throughout; and the bank to quote is the one **at the moment the ask arrives**,
not the peak over the run, because the peak includes the fall and a falling body banks to `MAX_BANK` (70°). Per run,
what ships:

| Case | asked | **bank at the ask** | best bank | falls at |
|---|---|---|---|---|
| Compress, wave's pace, full stick | **50°** | **11.3°** | 25.5° | 2.17 s |
| Compress, +1.5 m/s, full | 50° | **68.8°** | 68.8° | 1.10 s |
| Compress, +3 m/s, full | 50° | **70.0°** | 70.0° | 1.28 s |
| tall, wave's pace, full | 50° | **48.3°** | 50.2° | 2.22 s |
| tall, +1.5 m/s, full | 50° | **70.0°** | 70.0° | 1.20 s |
| tall, +3 m/s, full | 50° | **70.0°** | 70.0° | 1.42 s |
| the six half-stick runs | **25°** | 8.5 / 10.7 / 11.1 / 11.2 / 17.5 / 24.6° | 26.3–70.0° | 2.90–3.43 s |

**At the big ask the lean is not short — it is delivered to the body's own limit.** Of the six runs that ask 50°, one
reaches 11.3°, one 48.3°, and **four reach 68.8–70.0°, which is `MAX_BANK` itself**. Those four are the earliest falls
in the whole set (1.10–1.42 s): the body leans as far as it is allowed to and goes over. At the small ask the bank
arrives at a third to all of it, and those runs survive longest (2.90–3.43 s).

| | Best bank, 12 runs | Water rail used | **Heading turned** | Reaches across |
|---|---|---|---|---|
| **Old rider** (passes) | **24.2–70.0°** | 54–94° | **40.6–91.6°** | **12 of 12** |
| **New rider (ships)** | **25.5–70.0°** | 24.6–89.6° | **1.9–31.9°** | 0 of 12 |
| new + `feetReach` | 26.2–70.0° | 26.1–89.9° | 1.9–29.3° | 0 of 12 |

So **"the bank stalls at 25° against the 50° asked" is one run of twelve** — Compress, the wave's own pace, full stick
— and the old rider, which passes, reaches the same 24–70° range of bank. (Its bank-at-the-ask cannot be read:
`leanAsked` is the new rider's own field.) A fix aimed at the lean is aimed at something missing in one case of twelve.

**`feetReach` was re-measured on top of the sense, as asked, and it does not do what was hoped** [M]. On that one short
run its bank **at the ask** goes **11.3° → 9.9°** — slightly *worse* — and only its later peak rises, 25.5° → 34.6°.
**The heading that run turns goes 2.7° → 2.6°. Nothing.** Across the twelve, the falls are 1.13–3.32 s against
1.10–3.43 s and the heading turned 1.9–29.3° against 1.9–31.9°. So on the owner's own test `feetReach` costs nothing
(3.2n's "it costs the standing stance its 90° turn" was measured on the flat-water turn probe, and that cost does not
appear here) **and it buys nothing either.** It is still not landed: the gate does not move, and the contract's third
"do not" stands.

**Where the gap actually is, and it is one line:** both riders put the board on a big rail — 54–94° against 24.6–89.6°,
overlapping — and the old rider's heading comes round 40.6–91.6° while the new rider's comes round 1.9–31.9°.
**The lean arrives, the rail arrives, and the turn does not follow.** Same stick, same body angle, same rail, a
twentieth of the heading. The responsiveness the owner is describing is the **board's** response to the rail, not the
body's response to the stick.

3.2n reached the same place from a single trace ("the real discriminator is heading turned per rail used") and I have
now measured it across twelve runs, with the old rider's bank beside it to remove the lean as a candidate. **The next
measurement this wants is the yaw the board makes per degree of rail, old rider against new, at the same rail and
speed — and, if they differ, where the old rider's yaw moment comes from.** Its `holdLine` heading loop was dropped
for the new rider in 3.2e, and `COMPRESS_PULL` and `CARVE_CARRY` were switched off for it in the same step; if the old
rider's turn is coming from those rather than from its rail, that is the owner's no-hidden-motors rule and not a
controller question at all. That is a measurement, not a build, and it is the one I would spend the next round on.

## 6. The old bars, as information only (revised orders: no gating)

Reported with no judgement attached, as ruling 29r requires. **The shipped design is byte-identical to 3.2m's**, so
every row is 3.2m's row; the table is in `results/bars-new-32p.jsonl` for the record.

## 7. Seatbelts

| | Result |
|---|---|
| `tsc` clean (app and server) | **yes**, nothing reported |
| The shipped design unchanged | **yes** — all **54** `railmodel` rows byte-identical to 3.2m, gains included; `heaveSense` is `false` in `DEFAULT_WEIGHTS` and every use of the block is behind it |
| `predictiveBalance.test.ts` | **6 passed** — the runtime class runs the analysis's loop to 1e-9 on **both** plant sizes |
| Every schedule point finite | **yes**, all 306 (17 speeds × 3 stances × 6 rails), worst gain 1.15e4, **6.4 ms a point** — and that was measured with the sense **on**, which designs twice per point (the fourteen-state model and the ten-state gains), so it is the worst case and it is still the ten-state design's own 7 ms. The default, with the sense off, designs once |
| The full suite | **killed before it finished** (SIGTERM at about 1 h 45 m) — see §7.1. Up to that point the only failures were the 4 known pre-existing `SurfZoneRunner.test.ts` ones. **It needs re-running on a quiet machine before this work is relied on.** |
| The default game byte-identical (Canyon byte check) | **yes, all four hashes** — **this is 3.2n's unfinished check, now run**: Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`, the default `ea3d57a4d49f4b48` / `a1a2555739210f96`, both from fresh spin-ups (`results/canyon-byte-32p.txt`) |
| No unpaired rule forces or hidden motors | **yes, by construction**: this step applies no force at all. The two senses are read-outs of numbers the contact ledger and the board's own spin already carry, and the only `src/` additions are a sense row, a table of measured water derivatives and an optional LQR weight |

## 7.1 The two seatbelts that needed care, and one of them was my own mistake

**The Canyon byte check (3.2n's leftover) passes on all four hashes** [M]: Canyon B `a367d938f15fa934` /
`9e5831f80e38abd9`, the default `ea3d57a4d49f4b48` / `a1a2555739210f96`, medium, 3,600 steps, fresh spin-ups.
Expected, since `heaveSense` is off and every use of the block is behind it — but unverified until now, and ruling 29w
said it must not be merged on that reasoning alone.

**Canyon B is `?canyonWaves=true`, and the bench has no flag for it.** The config reads the switch off
`location.search`, so it is run through a three-line wrapper that sets `globalThis.location` before the bench's module
is evaluated (as `wave-strategy-alternatives/c2-step5a` did). The grid it builds confirms the config is the right one:
**400 × 451 = 180,400 cells**, exactly the recorded Canyon B's, against the default's 400 × 507. My first attempt used
`--swept 0`, which is a **no-op for the Canyon at medium** (no swept barrel at that size) and reproduces the *default*
pair — worth recording so the next agent does not repeat it.

**My first suite run was void, and the fault was mine, not the change** [M]. I ran the full suite **while** the Canyon
byte check was stepping 3,600 frames, and two long files failed:
`src/wave/uniformSnapshot.test.ts` (one test, 226.9 s) and `src/wave/barrel/poolBarrelPerf.test.ts` (one test, 88.0 s),
both far past the 60 s `testTimeout`. **Neither file touches a rider** — one compares the worker's snapshot fields
against a reference implementation, the other the camera's water in typed arrays — so neither can see this branch's
diff. **Run alone the two files pass, 10 tests in 66.0 s.** `poolBarrelPerf` is a documented flake of exactly this
kind: 3.2j recorded it running "77.5 s past its 60 s timeout under this load" and passing alone.

**This is 3.2m §7b's lesson a second time**, in a new form: that time a sparse checkout voided a suite run, this time my
own concurrent probe did. The clean re-run uses `--maxWorkers=3`, which is the load control 3.2j used.

**The clean re-run never finished: it was killed, and I am not going to describe it as passing.** It ran about 1 h 45 m
with nothing else on the machine and then **exited on a SIGTERM (code 143)** when this session's environment was reset
under it, without printing a summary. Up to that point **the only failures it had reported were the 4 known
`SurfZoneRunner.test.ts` ones** — PR #204's stale tests, which failed on pristine main and sit in a file outside the
merge suite, exactly as 3.2m and 3.2n recorded. `results/suite-32p.txt` is that partial log, and it is a partial log:
it is not evidence that the rest passed, only that nothing else had failed yet. **It wants re-running on a quiet
machine before this work is relied on** — and that re-run should now come back **completely clean**, because PR #204
landed on main as `58553e21` while this was being written. Those four are fixed, and the standing note that main fails
them is out of date from that commit on.

**What stands in for it, and why I think the residual risk is small** [M]: `tsc` clean on both projects;
`predictiveBalance.test.ts` 6 of 6 including the runtime loop on both plant sizes; the shipped design byte-identical on
all 54 `railmodel` rows; **all 30 old bar rows byte-identical to 3.2m**; the owner's test identical on every recorded
column across all 12 runs against a baseline taken in this worktree before any `src/` change; and all four Canyon
hashes. The whole change is behind `DEFAULT_WEIGHTS.heaveSense`, which is `false`. **The advisor should still see a
finished suite before merging**, and it needs a machine with nothing else on it.

## 8. What I am unsure of

- **Whether the sense is worth anything on a plant the loop can use.** Everything in §3 is measured on the held plant,
  which §5 then refutes for this loop. The sense's value (§3.2) is a property of the fourteen-state model, and there is
  no fourteen-state model built on the free table that is not double counting. **That is the open question this round
  leaves**, and it is a modelling question, not a tuning one.
- **The 5 m/s result is measured at one stance, on the terminal plane, with no chop.** It reproduces across three kick
  sizes and across the sense being on and off (identical to the digit at a 0.5 rad/s kick), so it is not an artefact
  of one disturbance. It still wants a stance and a seed sweep, and a chop, before anything is built on it. The
  frequency fits carry 0.94–1.75 Hz of scatter, so only the damping's ordering and sign should be quoted.
- **`LOAD_ADAPT` (2 s) and `HEAVE_SENSE_NOISE` (1.1 m/s², 0.017 rad/s) are hand-set**, and on the re-check list for
  two-way coupling. The adaptation is chosen against the mode, not tuned; the load's noise is between the measured rms
  and peak; the pitch rate's is the head yaw rate's own value, because it is the same organ.
- **The block's frequency is 30–60 % low against the game's** even where its damping is right. I have not chased why.
  The most likely candidate is that the derivatives were taken about the deck under the rider while the pair's pitch
  inertia is computed about the same point with the rider as a point mass at 0.84 m — a 52 kg·m² lever arm that a real
  crouching body does not have rigidly.
- **The hold probe does not reproduce across sessions** (§5), and I do not know why. Everything I conclude is from
  runs made inside this session against each other, which is the comparison that is sound; but it means 3.2m's and
  3.2n's per-run cells and mine are not directly comparable, and that is worth an advisor's look since this probe is
  now the gate.
- **I did not try the one combination that might still work**: the free twelve derivatives with a heave block whose
  own stiffness has been reduced to remove the double count. That is a derivation, not a measurement, and it belongs
  in a ruling.

## 9. Files (3.2p)

- `src/physics/predictiveBalance.ts`: `FROZEN_PLANT` (the held twelve derivatives, 16 points), `HEAVE_PLANT` (the
  water's answer per metre of heave and radian of pitch, with the two numbers that set the mode), `frozenCorrection`,
  `heavePlantAt`, `plantAt`'s `sink`, `senseMatrix`'s two new rows, `DesignWeights.heaveSense` / `heaveSenseNoise` /
  `heaveGains`, `HEAVE_SENSE_NOISE`, the heave states' zero cost with the account of why a cost cannot exist, a
  size-agnostic `steadyTurn` and `design`, and `scheduledDesign`'s gain split.
- `src/physics/AttachedRider.ts`: the two senses, `LOAD_ADAPT`, the soles' adaptation and its first-reading start.
- `src/physics/predictiveBalance.test.ts`: the runtime checks run on both plant sizes.
- `docs/research/new-rider/3.2/sink.probe.ts` (new): the model step — the reproduction check, the observability and the
  filter's error, the damping with each sense and each cost, and a lean put over and held.
- `docs/research/new-rider/3.2/boardmode.probe.ts` (new): **the board's own heave-and-pitch mode in the game**, against
  the captive block's, with the load sense's own spread.
- `results/`: `sink-repro-32p.jsonl`, `sink-obstime-32p.jsonl`, `sink-modes-32p.jsonl`, `boardmode-32p.jsonl`,
  `boardmode-ten-32p.jsonl`, `hold-32p-32p.jsonl` (the board carried and sensed), `hold-blind-32p.jsonl`,
  `hold-free-32p.jsonl`, `hold-ten-32p.jsonl` (what ships), `hold-base-32p.jsonl`, `bars-new-32p.jsonl`,
  `suite-32p.txt`, `canyon-byte-32p.txt`.

## 10. For the owner, in plain words

**Nothing changes in the game this round.** The surfer rides exactly as he did when you last rode him. I am not
presenting this as a ship.

What I was asked to do was give the surfer a **feel for the board under his feet** — the pressure through his soles
when the board sinks, and the board tipping nose-up and nose-down. The game already measures both; nobody had connected
them to his balance. I connected them, both arriving a tenth of a second late, like a real person's.

**It made him worse, and I found out why.** To feel the board moving, his internal picture of the board has to include
that movement. The only measurements we have of that are from a test where the board was **clamped** — and a clamped
board is not what a surfer's feet meet during a turn. I measured how fast the board really bobs and tips: about one
cycle a second. A turn takes about a second. So by the time the turn has happened, the board has already finished
bobbing, and the clamped numbers describe a moment that is already over. Riding on them, he fell in half a second
instead of two or three. So the feel is built and switched **off**, with the measurements written down.

**Two things I found that are worth more than the thing I was sent to build:**

1. **At slow speed the board itself barely settles.** Give it a small nudge nose-up at 5 m/s and the nodding keeps
   going, or grows a little; at 7 and 9 m/s it dies away in a cycle or two. That is the board and the water, not the
   surfer's balance. You have said several times that a surfer is at his most solid at low speed — and our board is at
   its least. This is a real cause, and it is in a different place from where we have been looking.
2. **Last round's headline number was wrong, and I can now say what it should be.** The previous round said the
   troublesome wobble was at a third to three quarters of a cycle a second. In the game it is one to one and a half.
   The wobble is real; the number came from the model, not the game.

**What I would do next**, for your call: look at the slow-speed nodding, because it is measured, it is in the right
place to explain the falls you dislike most, and it has nothing to do with the balance work that has absorbed the last
ten rounds.

# Part 15: step 3.2q, where the board's yaw comes from — and the metric that hid the answer

Written 2026-11-14 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32q`, rebased on main
b4604833 (which carries 3.2n and 3.2p, so Parts 13 and 14 above are its base). The contract: Part 14 §5's closing
paragraph — decompose the board's yaw by source, old rider against new,
and settle whether the old rider's turn is honest or `CARVE_CARRY`.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer

**Heading turned on the owner's acceptance test: 10–123° (old rider 72–179°).** With this round's change shipped,
12.5–144.5°.

Both riders' boards come round. Part 14's "new 1.9–31.9° against old 40.6–91.6°" is an artefact of the metric, and
every number built on it — including the brief I was given, which I wrote this part to correct — goes with it.

- **The metric.** `hold.probe.ts` reports `maxFromFallDeg`, the largest *unsigned* angle between the heading and the
  fall line. **A compressed bottom turn passes through the fall line**: in **24 of 24 runs**, both riders, the heading
  swings to within 1.5° of straight down the face and comes out the other side [M]. A board that has rotated 120°
  therefore reads 30 if it stops 30° past the line. Measured properly — the signed heading integrated frame by frame —
  the new rider turns **10–123°** against the old rider's **72–179°**, and swings **51–134°** against **148–256°**.
  A factor of about **1.7**, not a factor of 20.
- **The yaw decomposition** (§3, a new ledger in `BoardBody`): of the water's yaw torque that drives the turn,
  **hull pressure is 10–86 %, the fins 5–68 %, the rail side faces 1.3–6.1 %** — the rails are nothing, in both riders
  [M]. The rider's coupling **resists** the turn by nearly the whole of what the water gives (its own yaw inertia
  dragged round through the feet), and the board's net yaw torque is **0.07–0.61 N·m**: a quasi-steady turn.
- **Yaw per degree of rail: old rider 1.50–2.80 °/s per degree, new rider 1.60–2.08** [M]. They overlap, and both sit
  at or above the roll-plant lab's towed hull (1.0–1.6 °/s per degree, `../roll-plant/README.md` §3.1).
  **The board carves, and it carves the same for both riders.** The brief's hypothesis — that the board has no honest
  way to curve its path — is refuted by the board's own plant, which this folder had already measured.
- **Question 2, in plain words: the old rider's turn is NOT `CARVE_CARRY`.** Ablated on its own the gate does not move,
  12 of 12 either way [M] — what it costs is time: the compressed runs then fall 0.6–4.9 s sooner, which is the speed
  it was written to give back, not the turn. And **all three gameplay pulls are gated on `compress > crouch`** [R, :3070], so in
  the **tall** stance none of them has ever been running — and the tall old rider still reaches the wave on the side
  **6 of 6** against the new rider's **0 of 6**, with no unpaired force anywhere. The honest old rider (all three off,
  all twelve runs) scores **7 of 12**.
- **But `COMPRESS_PULL` is load-bearing in Compress, and that half of the old rider's pass is a hidden motor** [M]:
  switch it off and the compressed old rider goes from 6 of 6 to **0 of 6**, its rail collapsing from 7–39° to
  0.1–3.3° (with all three off, 1 of 6 survives).
  The owner compresses because the game rewards it, and what rewards it is a force with no reaction.
- **Lending the new rider those same pulls makes it worse: 1 of 12, with four falls inside a second at 9.6–11.5 m/s**
  [M]. `COMPRESS_PULL` leads a lean that a *driven* bank then holds; a free body given the same shove just goes over.
  **A kinematically driven lean is itself a hidden support, and that — not `CARVE_CARRY` — is what the old rider has
  and the new rider does not.** There is nothing to copy here in either direction.
- **What actually fails** (§5): the new rider's twelve falls are two families. At **full stick** the lean runs past its
  own 50° reference to `MAX_BANK` (70°) and he topples inward in **1.10–1.42 s**; at **half stick** he survives
  2.9–3.4 s and stalls at 1.9–5.4 m/s with the turn still running. The first family is a **timing** fault: the stick
  asks 50° and `LEAN_IN_RATE` delivers it in 0.6 s, while the turn that must balance it needs about a second to build,
  and the trace shows the lean ahead of the turn by up to **0.24 g** for half a second [M].
- **What shipped** (§6): the **lean hold**, on for `?rider=new`. A body may not ask for more lean than the turn it
  already has will carry: the lean asked for is held where the force adds up, the tilt of the felt vertical (`pairFelt`,
  which this balance already computes and already low-passes over its own 0.1 s sense delay) plus what the ankles hold
  unaided (`ANKLE_REST_RANGE`, as a force). **No force, no new constant.** On the owner's test he **stays up longer in
  11 of 12 runs** (mean 2.36 → **3.06 s**; the three earliest falls 1.10 / 1.20 / 1.28 → **1.58 / 1.77 / 3.80 s**),
  turns **more heading in 10 of 12** (+20 % in all), and **the gate moves off zero for the first time in this step:
  0 of 12 → 1 of 12**. Nineteen of the twenty-one step-3.2 bars are byte-identical; the two that move are the held
  carves (tall 2.13 → 2.85 s held, Compress 2.17 → 1.62 s).
- **The water-physics advisor was consulted** and its answer is in `docs/research/water-physics/consult-log.md`. It got
  NACA TN 4187 open — the source two earlier agents failed on — and its ruling is blunt: **the carve is the heeled
  bottom, the rail is a detail, do not build on it.** A real carve runs at a **load factor of 2.1**, where a board
  turning at constant height can only reach 1/cos φ: `ω = n g sin φ / v`, so **a real bottom turn is 1.8× faster than
  any level-flight board at the same rail, because it is simultaneously arresting a drop.** §7 has the whole of it and
  it is the strongest lead for the next round.

## 2. The probe, and why its numbers can be trusted against Part 14's

`yawsource.probe.ts` is `hold.probe.ts`'s movement frame for frame, with the ledger on and the heading recorded in
time. Part 14 flagged that the hold probe does not reproduce across sessions. **It reproduces here exactly**: the old
rider's twelve fall times are 5.15, 7.50, 5.72, 5.32, 6.18, 6.13, 4.55, 2.45, 4.98, 2.47, 6.17 and 2.60 s, the same to
the last digit as `results/hold-old-32m.jsonl` [M]. So the extra sampling does not perturb the sim, and this round's
old-rider column is 3.2m's column. (I cannot explain why 3.2p's session differed; I can only report that mine does
not.)

One correction to the record while I am here: **the old rider does not "hold" this test either.** It reaches the wave
on the side 12 of 12 and then falls, in **12 of 12**, at 2.45–7.50 s, mostly at 0.6–1.2 m/s, having ridden the turn out
until the board stopped. The gate Parts 12–14 report as "12 of 12" is `reachedAcross`, not `held`.

## 3. The yaw ledger (question 1)

`BoardBody.yaw` (new; `BoardBody.yawLedger` switches it on, so the default game pays one branch per substep and nothing
else): the mean torque about the world's up over the step, by source, positive turning the nose toward the board's
left. It books the explicit right-hand side, the implicit per-patch pressure, radiation and added mass, the foils'
implicit sideways impulses and the bed, and takes the board's own **I·Δω** as the total, so the parts sum to the turn
the board actually made and `rider` is the residual — everything the rider's coupling carries.

Means over the turn phase, with the turn's own sign taken out (+ drives the turn the stick asked for), N·m [M]:

| | hull pressure | fins | **rails** | friction | buoyancy | added mass | radiation | **rider** | total |
|---|---|---|---|---|---|---|---|---|---|
| **old**, tall, full stick, wave's pace | −56.0 | −6.0 | **−0.8** | +0.6 | −0.8 | −1.5 | −0.3 | **+65.0** | +0.23 |
| **new**, the same run | −29.4 | −10.8 | **−1.1** | +0.4 | −1.5 | −2.6 | −0.8 | **+46.0** | +0.11 |
| **old**, Compress, full stick, wave's pace | −46.2 | −2.7 | **−0.9** | +2.1 | −0.9 | −3.0 | −0.5 | **+52.2** | +0.17 |
| **new**, the same run | −6.8 | −6.7 | **−0.6** | +0.8 | −2.0 | −3.6 | −1.1 | **+20.1** | +0.07 |

Over all twelve runs each:

| | hull pressure | fins | **rails** | yaw per degree of rail |
|---|---|---|---|---|
| **old rider** | 10–86 % of the water's drive | 5–68 % | **1.3–5.7 %** | **1.50–2.80 °/s per degree** |
| **new rider** | 32–74 % | 13–54 % | **1.9–6.1 %** | **1.60–2.08** |

- **The rails do nothing.** 1.3–6.1 % of the driving torque, and most of that is the fore/aft asymmetry of their
  wetting rather than a turning force: every rail face's normal is the board's own ±x [R, `buildFoils` :561], so its
  force is purely lateral and its yaw is −Σ z·F over the stations — zero for symmetric wetting and *stabilising* when
  the wetted centroid is aft, which on a trimmed board it is. The advisor's independent reading of the same code, and
  of TN 4187's measurements on a real planing surface, agrees (§7).
- **The rider resists.** Its entry is positive in every run of both riders — the yaw inertia the feet must drag round,
  plus whatever the feet push — and it nearly cancels the water. The roll-plant lab's "the feet steer the board through
  their centre of pressure" was measured on a *towed* board on flat water; in a developed turn on a wave the feet are a
  brake on the yaw, not its source.
- **The total is 0.07–0.61 N·m** against driving torques of 5–66, so the turn is quasi-steady almost from the start,
  as the lab's 0.12 s settling says it should be.
- **The board yaws per rail the same for both riders**, and both are at or above the towed plant. Whatever the new
  rider's problem is, it is not that its board will not carve.

The turn's force budget across the path, in system weights, over the same frames [M] — what the turn needs (m v ω),
what the lean asks for (tan of the bank), what the water gives, and what the gameplay pulls give with no reaction.
These are medians, so they are not an instantaneous balance, and §5 says why that matters:

| | needs | lean asks | water gives | the pulls give |
|---|---|---|---|---|
| old, tall, full stick, wave's pace | 0.89 | 0.95 | 0.65 | 0 |
| old, Compress, full stick, wave's pace | 1.01 | 0.99 | 0.63 | **+0.19** |
| new, tall, full stick, wave's pace | 0.58 | 0.75 | 0.53 | 0 |
| new, Compress, full stick, wave's pace | 0.40 | 0.33 | 0.20 | 0 |

## 4. Question 2, measured: the ablation

`ASSIST` wraps `compressAssist`, which writes the three pulls into the rider's own vectors and is read on the next
line, so wrapping it is exactly switching a rule off. Reaches the wave on the side, out of 12 [M]:

| | gate | heading turned | what changes |
|---|---|---|---|
| **old rider, as shipped** | **12 of 12** | net 72–179° | — |
| old rider, `CARVE_CARRY` off | **12 of 12** | net 72.1–179.2° | **the gate not at all.** The 6 tall runs are identical to the line above; the 6 compressed all still get across, their `maxFromFall` moving −12 to +28° (114.0–132.9°), and they **fall 0.6–4.9 s sooner** (2.57–5.63 s against 5.15–7.50) |
| old rider, `COMPRESS_PULL` off | **6 of 12** | net 2.1–151.3° (compressed 2.1–69.9°) | **0 of 6 compressed runs get across** (the 6 tall are untouched): the compressed rail collapses to 0.1–3.3° and their net heading to 2.1–69.9°, and they ride on to 5.32–5.97 s without ever getting round |
| old rider, all three off | **7 of 12** | net 2.8–162° | the 6 tall runs identical; 1 of 6 compressed survives |
| **new rider, as shipped (3.2p)** | **0 of 12** | net 10–123° | — |
| new rider, lent all three | **1 of 12** | net 10–133° | four falls inside 1 s, at 9.6–11.5 m/s |

(All six rows are from the rebased tree. The old rider's own twelve runs are byte-identical before and after the
rebase, and each ablation's six **tall** rows are byte-identical to the shipped old rider's, which is the check that
the ablation only touches what it says it touches.)

Read it this way:

1. **The tall rows never had an assist**, so the tall old rider's 6 of 6 is honest, and it is the row that answers the
   brief. Its turn comes from the hull and the fins, exactly as the ledger says.
2. **`CARVE_CARRY` is not the turn.** It is a thrust **along** the path (`carryForce.copy(along)`, :3086), not across
   it — so the coordinator's arithmetic, that `m g tan θ` is the banked turn's own force, lands on `COMPRESS_PULL`
   (across the path, 0.5 of `tan`, capped at `TURN_PULL_LIMIT`) and not on the carry. Ablated, the gate does not move
   and the tall runs do not change by a bit; what it costs is **time** — the compressed runs fall 0.6–4.9 s sooner,
   which is exactly the carry's stated job (giving back the speed the carve sheds) and exactly the fault §9 says is
   next. So it is a hidden motor too, and it is propping up the wrong thing honestly.
3. **`COMPRESS_PULL` is load-bearing in Compress, and it is a hidden motor.** Half of the old rider's pass is bought
   with an unpaired sideways force worth about +0.19 g of the turn, and without it the compressed old rider cannot even
   get the board on a rail. By the owner's standing rule that half is a result to replace, not a target to copy.
4. **There is nothing to copy anyway**, because the pull only works on a driven bank. §6's change is therefore not a
   replacement for `COMPRESS_PULL`; it is on the other side of the same problem.

## 5. What actually fails, and it is a timing fault

The new rider's twelve falls, as 3.2p shipped them [M]:

| | falls at | speed then | bank then | rail (median, turn phase) |
|---|---|---|---|---|
| **full stick** (6 runs) | **1.10–2.22 s** | 3.0–8.7 m/s | 25–70°, **four at `MAX_BANK`** | 14–34° |
| **half stick** (6 runs) | 2.90–3.43 s | 1.9–5.4 m/s | −3 to 70° | 11–24° |

The traced toppling run (tall, +1.5 m/s, full stick, falls at 1.20 s), against what the lean asks and what the turn
gives at the same instant, in system weights [M]:

| t, s | rail | bank | **turn gives** | **lean asks** | gap |
|---|---|---|---|---|---|
| 0.42 | −7.8° | 16.3° | 0.11 | 0.29 | **−0.19** |
| 0.55 | −12.8° | 21.2° | 0.15 | 0.39 | **−0.24** |
| 0.68 | −20.9° | 28.3° | 0.63 | 0.54 | +0.09 |
| 0.88 | −35.4° | 42.4° | 0.69 | 0.91 | **−0.22** |
| 1.02 | −50.8° | 56.7° | 1.54 | 1.52 | +0.02 |
| 1.15 | −69.3° | **70.0° = `MAX_BANK`** | 2.33 | 2.75 | **−0.42** |

The bank climbs monotonically from 8.7° to the stop in 1.15 s and he is gone at 1.20 s. The lean is ahead of the turn
by 0.19–0.24 g through the lean-in, which is the half-second the body spends leaning on nothing, and it never recovers
the margin.

**Three readings of this round that go against me:**

- I came in expecting to find that the rail could not steer. **It steers**, and the per-degree number was already in
  this folder, measured on a towed board. I should have compared the two before building anything.
- **The two fall families are different animals, and the half-stick one is not this round's.** Those runs stall: the
  carve sheds 60 % of its speed in 2 s where Forsyth et al. measure a real bottom turn keeping 88–95 % [S]. The traced
  tall-at-the-wave's-pace run is one of them — its lean and its turn track each other within 10 % the whole way and it
  still fell, at 3.0 m/s. `CARVE_CARRY` exists because of exactly that, and the honest version of it is not in this
  part.
- **The force budget in §3 is medians, and medians mislead here**: at the peak of a new-rider turn the water gives
  **1.94 g**, more than the lean asks. The shortfall is in **when**, not in **how much**.

## 6. What shipped: the lean hold (on for `?rider=new`)

One change, in `prepareBank` under the new rider's own reference [R]:

> A body may not ask for more lean than the turn it already has will carry. A lean of θ asks for `tan θ` of sideways
> force; the turn supplies the felt vertical's own tilt; the difference is an unbalanced pull inward that nothing in the
> water answers. So the lean asked for is held at **(the felt vertical's tilt) + tan(`ANKLE_REST_RANGE`)**, composed as
> forces — `pairFelt` being the pair's own specific force, which this balance already computes for the capture point
> and already low-passes over `SPECIFIC_FORCE_TIME` (0.1 s, this rider's own sense delay), and `ANKLE_REST_RANGE`
> (14.3°) being what the ankles hold with no help from the turn.

It is a change to what the rider *intends*, not a force, so nothing is added without a reaction, and it introduces
**no new constant**: both terms are already in the file. It bootstraps rather than locking him upright — the ankles
roll the board onto its rail, the turn comes, the felt vertical tilts, the cap opens, and the lean follows the turn
instead of leading it off the board. The cap is recorded frame by frame in
`results/yaw-trace-ship-32q.jsonl`: **15.4° at the start, 29.8° by 0.72 s, 50.6° by 1.42 s, 58° by 1.72 s**, which is
the turn building. The bank follows it and then **overshoots it by up to 11°** (69.0° against a 58.0° cap at 1.72 s) —
the cap does what it can about the lean the rider *asks* for, and the balance's own tracking error is still there.

On the owner's acceptance test, twelve runs, against 3.2p's behaviour in the same session
(`balance: { leanHold: 'off' }`) [M]:

| | 3.2p | **shipped** |
|---|---|---|
| Reaches the wave on the side | 0 of 12 | **1 of 12** |
| Falls at | 1.10–3.43 s | **1.58–3.80 s** |
| Mean time up | 2.36 s | **3.06 s** (+30 %) |
| Stays up longer | — | **11 of 12** (the twelfth is −0.01 s) |
| The three runs that fell earliest | 1.10, 1.20, 1.28 s | **1.58, 1.77, 3.80 s** |
| Heading turned (net) | 10–123° | **12.5–144.5°**, more in **10 of 12**, +20 % in all |

**The composition matters and was measured, not chosen.** Adding the ankle's margin as an *angle*
(`atan(tilt) + ANKLE_REST_RANGE`) rather than as a force gives half the gain — mean time up 2.74 s against 3.06, total
heading +12 % against +20 %, and the gate stays at 0 of 12 — because at a big lean 14° of extra angle is a much larger
extra force demand than 14° is at a small one. The force form is both the honest reading and the better number, and it
is what ships. (`results/yaw-new-felt-32q.jsonl` has the angle form's twelve runs for the record.)

**The step-3.2 bars, same comparison** [M]: **19 of the 21 rows are byte-identical** — all sixteen glides (a plane and
three chop seeds at 5, 7, 9 and 12 m/s) and all three rises. The cap cannot bind in a straight line, because the lean
asked for there is about zero and the cap is never below 14.3°. The two that move are the held carves:

- **tall: 2.13 s → the whole 3 s with no fall at all** (`fell` goes from `balance` to empty), and it ends at 4.21 m/s
  against 1.82. That bar has missed since 3.2f.
- **Compress: 2.17 → 1.62 s**, and its Mode B share rises 0.022 → 0.46.

So the change wins the tall carve outright and costs the compressed one half a second, which is the same split the
gate shows. I am not tuning that away: §9 says what I think it is.

**Why it ships although the gate is 1 of 12 and not 12.** Ruling 29r: a merge is gated on seatbelts, not on a probe
bar. It is on for `?rider=new` only, which is itself opt-in, so the default game cannot move; `leanHold: 'off'` is one
word back. It moves the owner's own number in the right direction in 11 of 12 runs with no straight-line regression,
and the part that needs his hands is the part a probe cannot tell me: whether a lean that follows the turn *feels*
like surfing or like a rider who will not commit.

**What the owner would feel if this improved, in one line:** putting the stick hard over no longer drops him in a
second — the surfer holds the compressed turn half again as long and comes round further before he goes.

**To re-check when two-way coupling lands:** the cap reads the pair's specific force, which is exactly what a sinking
board changes. A board that digs in and pulls harder opens the cap on its own, which is the behaviour wanted, but the
ankle's 14.3° was measured on a board that does not sink.

## 7. The water-physics advisor (consulted this round)

Logged in `docs/research/water-physics/consult-log.md`. It opened **NACA TN 4187** (Savitsky, Prowse & Lueders 1958) —
a flat plate rolled ±15° and yawed 0–20° at trims 6–30°, with side force, yawing and rolling moments, centre of
pressure and chine-edge forces — which two earlier agents could not get open. Trimmed to what bears on this part [S]:

- **A flat side face cannot curve the path, and our rails are flat side faces.** TN 4187 measures the body-axis side
  force on a planing flat plate as "nearly zero" and its yaw moment as viscous and "very small": there is almost no
  cross-flow across a planing bottom for a side plate to catch. Our ledger's 1.3–6.1 % is the same answer from the
  other end.
- **What a real engaged rail adds is edge suction on the buried chine**, which TN 4187 sees switching on suddenly past
  a critical roll and off again past a yaw angle, and whose magnitude it does **not** publish. The exposed leading
  chine's coefficient is 1.0–1.3 of full dynamic pressure, acting at 0.65 of the immersed length. If a rail force is
  ever built, that is its form — immersion through the **wetted length**, speed as **V²**, the flow angle through an
  **onset boundary** — and the advisor's own warning is that it is still a weathercock and **will not make the board
  come round**.
- **Rail-line curvature is not a force.** Water holds no groove, and the arithmetic kills it anyway: our rocker fits
  R = 6.5 m and our planform is *convex* (the opposite of a ski's sidecut), so the heeled rail's own arc is 9.7 m at
  42° — 0.52 g and 41 °/s — against a measured bottom turn's 3.84 m, 1.41 g and 109 °/s.
- **The calibration we have been missing.** Forsyth et al. 2024 (214 waves, 10 competitive surfers): a bottom turn at
  **42° of rail, 7.3 m/s, 1.9 rad/s, 99° in 0.96 s**; a cutback at 75° of rail, 3.0 rad/s, 152°. The advisor's
  reduction is the useful part: **G scatters 0.55–1.57 but the load factor is 2.1 in both**, so **ω = n g sin φ / v**
  and **G = n cos φ**. A board turning at constant height can only reach n = 1/cos φ, which at 42° is **64 °/s against
  the real 109** — *a real bottom turn is 1.8× faster than any level-flight board at the same rail, because the board
  is simultaneously arresting a drop.* Our medians sit at n ≈ 1.0–1.3.
- **A real carve does need a slip angle**, so the weathercock structure we have is right in kind, and the fix belongs
  in neither the fins' slip response nor the rail.
- Its ranked suggestion: **log the hull's normal force through the carve and aim at n = 2.1**, with `ω = n g sin φ / v`
  as the bar; then the pressure-centre law (ours 0.667 against a measured 0.69–0.80, roll- and yaw-independent); then
  rail-dig's Y_β sign change past ~18° of rail; deadrise last.

Its caveats, passed on unsoftened: TN 4187 ran at speed coefficients 7–18 and our board at 7 m/s is 3.3, below the
range; its roll went to ±15°, so everything about 42–94° of rail is extrapolation; Forsyth's angular velocity is a
resultant from a board-mounted device, not a pure yaw rate; and the load-factor reduction is the advisor's own
arithmetic on published means.

## 8. Seatbelts

- `npx tsc --noEmit -p .`: **clean**. `npx tsc -p server/tsconfig.json --noEmit`: **clean** [M].
- The suite (`--exclude SurfZoneSimulation.test.ts --exclude SurfZoneRunner.test.ts`, as the owner's rule says, with
  `--testTimeout=300000`): **3,483 passed, 23 expected-fail, 8 failed — and every one of the 8 is a timeout.** Nine
  `Test timed out` / `Hook timed out` messages and **zero assertion failures anywhere in the run**
  (`results/suite-32q.txt`). The seven failing files are all wave code plus `src/dev/stanceTargets.test.ts`, each with
  its own per-test timeout below my override, and the run was made with **another session's suite on the same cores**:
  22 vitest workers for 12 cores, which shows in the durations — `stanceTargets` took **1,765 s** and
  `BoussinesqSolver` **2,224 s** for files that normally take seconds. This is the pattern C2 step 5c recorded on the
  same machine the same day, and it is not a signal about this branch. **It is also not a pass, and I am not calling it
  one.**
- **What I can say instead, and it is the check that bears on this change**: the six files that touch the rider and the
  board — `AttachedRider`, `predictiveBalance`, `standingBody`, `humanBalance`, `BoardBody` and `PhysicalMode` — were
  run **alone**: **6 files, 276 passed, 8 expected-fail, 0 failed** (`results/suite-rider-32q.txt`).
- The Canyon byte check (`scripts/m1-cpu-bench.ts`, medium, 3600 steps, fresh spin-ups, Canyon B through a
  `globalThis.location` wrapper): **started and not finished, and I am not calling it a pass.** Both spin-ups
  completed and both runs were stepping when the round ended; the other session's suite had 22 vitest workers on 12
  cores for the whole round and the bench was getting 15–29 % of one core.
  `results/canyon-byte-32q.txt` has the two commands, the expected hashes, and — in place of them — what *is*
  established about the default path: the ledger writes only behind a static false, the lean hold is inside the new
  surfer's own branch, **the old rider's twelve runs on this very test are byte-identical to 3.2m's stored file**, the
  six rider-and-board test files pass alone, and the suite's own Canyon byte test timed out rather than failing.
  Budget half an hour for the rerun, not the four minutes 3.2p's spin-up times imply: the 3600-step phase is what
  costs, and each run had burned 11–14 minutes of CPU here without finishing.
- **No unpaired force is added.** The ledger is bookkeeping behind a flag; the lean hold changes a reference, not a
  force, and is on only under `rider: 'new'`.

## 9. What I am unsure of, and what I would do next

- **The half-stick stall family is the next round, and the advisor has handed it a number.** Those falls are the carve
  eating the speed until the board drops off the plane and a leaning rider with no lift goes over. `ω = n g sin φ / v`
  with n = 2.1 is a bar with a sourced value, and "log the hull's normal force through the carve" is a measurement, not
  a build. That is where `CARVE_CARRY`'s honest replacement lives.
- **Whether the lean hold should also hold the *rail*.** It holds the lean, and the schedule derives its rail from the
  lean, so the rail follows — but the ankle's own command is the predictor's and can still roll the board past what the
  cap implies. In the traced run the bank still reaches `MAX_BANK`, 0.4 s later than before. A rail that leads the lean
  is the next thing I would look at inside the balance.
- **Compress loses 0.55 s of its held carve, and it rings.** Its Mode B share goes 0.022 → 0.46. **The cap closes a
  new loop** — the lean sets the rail, the rail makes the turn, the turn tilts the felt vertical, the felt vertical
  caps the lean — through a 0.1 s low-pass, and a loop like that can oscillate. It does not in the tall stance (Mode B
  0.153 → 0.140) and it does in Compress. **This is the one real risk in what I shipped**, and if the owner finds
  Compress worse than 3.2p that is the cause. The two ways out I would try, in order: rate-limit how fast the cap
  *opens* (it already cannot close faster than `leanPace`), or feed it the turn the internal model **predicts** from
  the rail rather than the turn the body feels, which takes the low-pass out of the loop. It may also be the thing
  ruling 29w named — the schedule reads the instantaneous leg depth, so the stances are never isolated.
- **The `rider` entry in the ledger lumps the rider's yaw inertia with its feet's push**, because it is a residual.
  The sign (a brake, in a developed turn) is the useful part; splitting it needs the contact impulse booked separately,
  which is another half-day in `BoardBody`.
- **Whether 0.7 s of extra time on a probe earns the owner's attention.** I think it does, because the falls that move
  most are the ones he is describing, and one run now finishes the turn. But he is the judge.

## 10. For the owner, in plain words

The surfer's board was never the problem. It turns, and it turns at the same rate per degree of rail as the old
surfer's — about 1.5 to 2.8 degrees of heading a second for every degree the board is on its rail, which is what the
towed measurement says the hull gives. What was wrong was the number we were reading. A bottom turn swings *through*
straight-down-the-face, and our measure counted only how far past that line you end, so a turn of 120 degrees was
reported as 30. The new surfer was never failing to come round by a factor of twenty; it was about a factor of one and
a half.

I also checked whether the old surfer's turn was coming from the hidden push we took out of the new one. It was not:
in the upright stance that push has never been switched on at all, and the old surfer still gets round. But in the
compressed stance it *is* doing half the work — so the thing you reach for most, compressing into the turn, is the one
place the old game was cheating. Lending that push to the new surfer makes him fall faster, not slower, so there is
nothing to copy.

What actually drops him is timing. The stick asks for 50 degrees of lean and his body gets there in six tenths of a
second, while the turn that has to hold that lean up needs about a second to build. In between he is leaning on
nothing. So from this round he will not ask for more lean than the turn he has got will carry, plus what his ankles can
hold on their own — which is how leaning into a turn on a board actually works. He stays up longer in eleven of the
twelve test turns, the three worst falls go from about one second to one and three quarters, and one of the twelve now
finishes the turn with the wave on his side, which none did before.

He still falls at the end of the hardest turns, and the reason is the one thing left that is clearly wrong against the
real world: **our carve eats too much speed.** A measured bottom turn keeps 88–95 % of its speed; ours keeps about 40.
The old surfer had a hidden push along the board that gave some of it back, which is part of why it felt better and why
we took it out. Putting that right honestly is the next round, and thanks to the research advisor we now have a
measured number to aim at.

## 11. Files (3.2q)

- `src/physics/BoardBody.ts`: the yaw ledger (`yaw`, `yawLedger`), off by default.
- `src/physics/AttachedRider.ts`: `balance: { leanHold }`, `leanHeld`, and the cap in `prepareBank`.
- `docs/research/new-rider/3.2/yawsource.probe.ts`: the owner's test with the ledger on, the heading in time, the
  turn's force budget, and `ASSIST` for the ablation.
- Results: `results/yaw-old-32q.jsonl` and `yaw-new-32q.jsonl` (the two shipped columns, with the whole ledger),
  `yaw-old-off-32q.jsonl`, `yaw-old-nopull-32q.jsonl`, `yaw-old-nocarry-32q.jsonl`, `yaw-new-on-32q.jsonl` (the
  ablations), `yaw-new-off-32q.jsonl` (3.2p's behaviour, the same session) and `yaw-new-felt-32q.jsonl` (the angle
  form), `yaw-trace-old-32q.jsonl`, `yaw-trace-new-32q.jsonl` and `yaw-trace-topple-32q.jsonl` (the traces §5 reads) with
  `yaw-trace-ship-32q.jsonl` (the same run with the lean hold on, the cap recorded),
  `bars-new-32q.jsonl` against `bars-new-off-32q.jsonl`, `suite-32q.txt`, `suite-rider-32q.txt`,
  `canyon-byte-32q.txt`.

# Part 16 — the carve's load factor: the premise, measured, and where the 2.1 actually lives

Written 2026-11-14 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32r`, cut from
`claude/rider-new-32q` (PR #330), so Part 15 above is its base. The contract: Part 15 §9's first item and the
water-physics advisor's ranked first step — **log the hull's normal force through the carve and report the load factor
n we actually reach, against the real 2.1** — and then settle whether letting the board arrest a drop fixes both the
speed loss and the turn rate.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. Short answer: half the premise is wrong, and the half that is right is not ours to fix

**The brief's premise has three parts. One is wrong, one is right, and the cure it proposes is unavailable on the
surfer's side.**

1. **"Our carve sheds 60 % of its speed in 2 seconds where real bottom turns keep 88–95 %" is wrong twice over.**
   Measured over a real bottom turn's own duration (Forsyth: 0.96 s), the old rider keeps **93–132 %** of the speed it
   started the turn with (median 105 %) and the new rider **90–110 %** (median 102 %) [M]. Over 2 s — twice a real
   bottom turn — it is **73–143 %** (median 82 %) and **63–92 %** (median 71 %). The "60 % in 2 s" figure is what you
   get by reading the speed at the *fall*, which on the old rider comes at **2.4–7.5 s** after riding the turn out
   until the board stopped. And the bar it was measured against does not exist: **Forsyth's 0.92 is the cutback's speed
   over the bottom turn's speed — a ratio between two turns, not within one** [S, the advisor, primary text]. The paper
   publishes no within-turn speed ratio. I have corrected the record in `../../water-physics/sources.md`.
2. **"Our load factor is far below the real 2.1" is right, and now has a population.** n (the water's whole force on
   the board over the system's weight) is **1.02–1.28 per-run median, peak 1.17–2.01** on the old rider and
   **1.01–1.26, peak 1.12–1.78** on the new, over twelve runs each [M].
3. **"Does letting the board arrest a drop fix both?" — there is no drop to arrest, and nothing in `BoardBody` can
   make one.** n is **1/cos φ identically**, because n cos φ = 1 + a_com/g is vertical equilibrium and our system's
   vertical acceleration is **zero to within 4 %** (1 + a_com/g measures **0.96–1.05**, median 0.98–0.99, over all 24
   runs) [M]. **The only thing that can raise n is real vertical acceleration**, and I tried all three routes to it:
   - **a run-up down the fall line**: 0.8–1.2 s of straight-down-the-face before the stick, on faces up to 2.2 m / 30°,
     buys **0.44–0.94 m/s** of descent and moves n **not at all** (1.20 → 1.16 median, peak 1.55 → 1.26) [M];
   - **the hull's own lift law**, corrected: a sourced **+64 % at 18° of incidence** moves the carve by **nothing**,
     and costs the old rider a run (§5) [M];
   - **the leg stroke**, which does give **+0.41 to +0.51 g** of genuine upward acceleration — but for about 0.3 s, so
     the turn rate moves 52.8 → 51.7 °/s [M].

   **The advisor's reduction splits the problem at 61.6° of rail** [S, its arithmetic on Forsyth's means]: n = 2.1 at
   a_y = 0 means cos φ = 1/2.1. **Below ~62° of rail n = 2.1 needs the wave** — +0.57 g for 0.96 s, 5.4 m/s of vertical
   turn-around, which on a 16° face needs the board closing on the wave at **9.4 m/s over a 50 m run** where the face
   offers **7.6 m**, short by about **7×**. **Above ~62° it costs the wave nothing**, and there it is a board problem.
   **A Forsyth-class bottom turn needs a 30–45° face over about 2 m.** That is the wave track's number, and it is the
   owner's "steep faces for tricks" ruling with arithmetic attached.

**So the honest restatement of the bar: on the face we have, n ≈ 1.25–1.33/cos φ is the ceiling, not 2.1** [S, the
advisor] — worth about 90–96 °/s against the measured 109 and our 70. The load-factor gap is 2×; the **path-rate gap is
only 1.2–1.5×**.

**Does this round touch the default path? No.** No file under `src/` is changed, so the Canyon byte hashes cannot move
and **the owner types nothing**. What shipped is the probe, the corrected record, and the one build this round made —
measured, and parked with its patch and its numbers (§5), because it is right and premature.

## 2. The headline asked for

Population: the owner's acceptance test, twelve runs per rider (two stances × three entry speeds × two stick
positions), the Canyon-matched face (1.4 m, 16°, 5.7 m/s). Every figure [M], ranges then medians.

| | **speed kept through the carve** | **load factor reached** | **reaches the wave on the side** |
|---|---|---|---|
| **old rider** | at 1 s **93–132 %** (med 105) · at 2 s 73–143 % (82) | **median 1.02–1.28** (1.09) · peak 1.17–2.01 (1.54) | **12 of 12** |
| **new rider** | at 1 s **90–110 %** (med 102) · at 2 s 63–92 % (71) | **median 1.01–1.26** (1.05) · peak 1.12–1.78 (1.44) | **1 of 12** |

The brief's reference points for the gate are reproduced exactly: old rider as shipped 12 of 12, new rider 1 of 12
(Part 15's lean hold). "Real 88–95 %" is struck — see §1 item 1. "Real 2.1" stands as the advisor's arithmetic on
Forsyth's published means, and §1 item 3 says where it is reachable.

## 3. What the measurement actually says, and the identity behind it

`load.probe.ts` books, frame by frame through the turn, the water's whole force on the board — hull pressure,
buoyancy, added mass, radiation, friction, the foils, froth and the bed — three ways, in units of the system's weight
(board 2.54 kg + rider 73 kg):

- `n` = |F| / W, the load factor, with **φ_F = the tilt of that resultant from the world vertical**;
- `liftShare` = F_y / W. Gravity is the only other external force on the system, so **F_y / W = 1 + a_com/g exactly**,
  and no rider velocity is needed to get it;
- and so `n cos φ_F = liftShare` **by construction** — which is the point. It says in one line that **n can exceed
  1/cos φ only by accelerating the system upward.**

| | n, per-run median | n, peak | **1 + a_com/g**, median | 1 + a_com/g, peak | φ_F median | incidence on the wetted bottom | wetted area |
|---|---|---|---|---|---|---|---|
| **old rider** | 1.023–1.280 (**1.085**) | 1.171–2.013 (1.540) | 0.959–1.005 (**0.993**) | 1.119–1.705 (1.220) | 12.7–42.6° (19.1) | 5.2–8.1° (**6.5**) | 0.224–0.389 m² (0.349) |
| **new rider** | 1.012–1.255 (**1.047**) | 1.115–1.779 (1.435) | 0.955–1.050 (**0.981**) | 1.071–1.370 (1.268) | 14.6–29.6° (19.4) | 3.2–9.3° (**6.2**) | 0.316–0.376 m² (0.350) |

Read it this way:

1. **The system is in vertical equilibrium through the whole carve.** 1 + a_com/g is 0.98–0.99 in the median and never
   leaves 0.96–1.05. So n = 1/cos φ_F is not a coincidence and not a model fault — **it is Newton**, and it is why the
   measurement could not have come out any other way. **In steady trim a hull force law sets the draft and the trim,
   not the force; the force is set by the weight.**
2. **Two definitions in my own first pass were wrong, and the advisor caught both.** I had taken φ from the rider's
   bank (on a 16° face a board sitting flat already has its hull force 16° off vertical, so the bank understates φ by
   up to the face slope) and the vertical acceleration from the *board's* y when the rider is 73 of the 75.5 kg. Every
   number above is after the fix. This is Part 15's lesson again: **check what a probe column means before quoting it.**
3. **ω = n g sin φ / v describes our board.** With the corrected φ_F the law's median rate is 15.0–57.5 °/s against the
   path's own 15.9–69.8 (old) and 19.7–37.8 against 21.9–42.5 (new) [M] — the law under-reads by about 10–30 %, the
   residual being the fins' and friction's own share of the turn and the face's gravity. The mechanism is sound; the
   lever is n, and n is pinned.
4. **Our carve runs at 6° of incidence on 0.35 m².** A real 2.1-g turn runs **11–13° on 0.4–0.5 m²** [S, the advisor's
   arithmetic on Forsyth at 6.7 m/s]. Ours is at *less* incidence than a real one — which is the same fact once more:
   the incidence is whatever carries the weight, and the weight is all it is carrying.
5. **At big rail the hull unloads, and that is how all 24 runs end** [M]. The traced old-rider tall full-stick run: at
   50° of roll n_up is 1.57 on 0.356 m² of wetted bottom; by 67° it is 0.94; by 81–83° it is 0.51 then **0.19** on
   0.231 m², with the speed down from 7.9 to 3.0 m/s, and the rider is dropped. The advisor sized it: **6.9× in
   dynamic pressure and 2.7× in area, 19× together**, against which a coefficient is worth at most 1.9×. **The unload
   is the speed and area collapsing, not the lift law** — and at 3.0 m/s nothing can make 2.1 g.

## 4. The drop, and the leg stroke: the two routes to a_com, measured

**The run-up.** `DELAY` holds the stick at zero while the board goes down the fall line, then turns — the order a real
bottom turn happens in. Old rider, tall, full stick, one run each [M]:

| face | run-up | descent it bought | descent in the turn | n median (perp to path) | n peak |
|---|---|---|---|---|---|
| 1.4 m / 16°, across the face (the test) | none | — | 0.49 m/s | 1.200 | 1.545 |
| 1.4 m / 16°, 10° off the fall line | 0.8 s | 0.44 m/s | 0.16 m/s | 1.192 | 1.364 |
| 1.4 m / 16°, straight down | 1.2 s | 0.46 m/s | 0.19 m/s | 1.205 | 1.313 |
| 2.2 m / 30°, straight down | 1.2 s | **0.94 m/s** | 0.20 m/s | 1.157 | 1.263 |
| 3.0 m / 45°, straight down | 1.2 s | 7.34 m/s | — | — | fell at 0.05 s |

The advisor's formula says why, and it is the useful part: **descent is the closing speed on the wave times the face
slope, w = u_rel · tan θ — not the ground speed times the slope** [S]. The probe matches its entry speed to the wave
(`load.probe.ts:87`), so u_rel is −1.0 to +1.1 m/s and the geometry allows at most 0.32 m/s; we measure 0.44–0.49.
**The board is already taking everything the face offers. The missing descent is not a board failure.** (The 45° row is
the test water blowing up, not a result.)

**The leg stroke** is the one source of a_com a gentle face leaves, and it is legal under no-hidden-motors: it is
visible limbs and its reaction is on the board through the feet. `STROKE` enters the turn compressed and lets the legs
extend as the stick goes over (`release`, the projection), or enters tall and compresses under the turn (`load`). Old
rider, tall, six runs, with a 1 s run-up [M]:

| | gate | **1 + a_com/g, peak** | n peak | path rate, median | speed kept at 1 s | falls at |
|---|---|---|---|---|---|---|
| `off` | 6 of 6 | 1.026–1.173 (**1.079**) | 1.133–1.398 (1.321) | 34.7–71.3 (52.8) | 0.802–0.880 (0.838) | 3.00–5.60 (3.60) |
| `release` | 6 of 6 | 1.405–1.509 (**1.413**) | 1.412–1.527 (1.426) | 35.4–65.3 (51.7) | 0.805–0.918 (0.839) | 2.98–5.58 (3.60) |
| `load` | 6 of 6 | 1.277–1.366 (1.329) | 1.360–1.747 (1.493) | **40.5–72.2 (56.4)** | **0.891–1.021 (0.943)** | **3.73–7.23 (5.51)** |

- **The extension works, and it is worth +0.33 to +0.43 g of real upward acceleration** (peak 1.413 against 1.079).
  That is the advisor's own budget (a 0.26 m leg extension gives about +0.57 g for ~0.3 s) landing where it said it
  would. **But the turn rate does not move**, because ω answers to n over the whole turn and the stroke lasts a third
  of one. A leg drive cannot be the source of a 0.96 s turn at 2.1 g; only the wave can.
- **The one thing in this round the owner can use today**: `load` — Compress taken **as the turn loads up** rather than
  held from the start — keeps more speed and stays up far longer, and it does so in **12 of 12** runs across both the
  run-up set (speed kept at 1 s median 0.838 → 0.943, falls 3.60 → 5.51 s) and the plain set (1.035 → 1.067, falls
  3.58 → 5.92 s), gate 6 of 6 either way [M]. Part 15 measured Compress *held from the start* as **worse** (its held
  carve 2.17 → 1.62 s). **The difference is timing, not the stance**, which is also what a surfer does — compress under
  the load, once the rail is set. It does not help the new rider (1 of 6 → 0 of 6).
- `carveFlex` (`?carveFlex=on`, built 2026-11-10) is the small version of this and was already measured to change turns
  "within a few percent" with 7 of 45 falls against 5 — so this is not a case for flipping that default [R].

## 5. What was built, measured and parked: Shuford's cross-flow term

The advisor's ranked build, and the one place a hull law is genuinely wrong. `hullForces.patchForce` gives a wetted face
Savitsky's **small-trim** coefficient (0.4575, his own validity 2–15° of trim) at *every* incidence, and adds the
cross-flow term only when the board is a **fully submerged** plate — so a planing hull banked over in a carve has never
had it [R]. Against NACA TN 3939's Langley-tank table at λ = 3 that is **30–46 % low at 12–30° of incidence** [S].

I built Shuford's eq. (23) in its place: `C_N = CROSS_FLOW_LINEAR·sin α + (4/3)·sin²α·cos α`, with the linear
coefficient **derived, not tuned** — whatever is left of this file's existing anchor once the cross-flow term is taken
out of it at the same τ = 4°, λ = 3 — so ordinary trim is unchanged to the last digit and both coefficients ramp back to
`SUBMERGED`'s own law by `submergedShare`, leaving the duck-dive force byte-identical. Verified against the measured
table: **−30 % → −3 % at 12°, −37 % → +4 % at 18°, −44 % → +5 % at 24°, −46 % → +11 % at 30°**; exactly neutral at 4°,
+20 % at 8° [M].

**It is parked, with its patch and all of its numbers, in `crossflow-32r.patch.txt`.** Two measured reasons:

1. **It moves the carve by nothing**, because **our median incidence is 6°**, where the law is neutral by construction.
   Old rider: gate 12 of 12 → **11 of 12**, n median 1.085 → 1.083, path rate 33.99 → 32.04 °/s, speed kept at 1 s
   1.052 → 1.046. New rider: gate 1 of 12 → 1 of 12, path rate 32.63 → 32.03 [M]. The correction lives at 12–30° of
   incidence, which our board only reaches once the face is steep enough to give a real bottom turn — §1's 30–45°.
2. **It is not free.** Run alone, **ten default-path assertions fail** in `AttachedRider.test.ts` — all real
   `AssertionError`s, no timeouts — nine of them the banked-turn tests, including "makes a deep U at the bottom of the
   face" (expected > 30, got **9.04**). The cause is the advisor's own warning: the cross-flow force is along the patch
   normal, so at a big incidence a large part of it points **backwards along the path**. It is drag in proportion to
   sin α as well as lift.

**I am not shipping a measured regression on the path the owner rides, and I am not adding a switch to hide one.** The
patch file says exactly when to take it off the shelf, and what comes free with it when the time is right: the
pressure-centre law (ours 0.667 fixed, measured 0.69–0.80 varying) falls out of Shuford's own cp split as a consequence
rather than a tune.

## 6. The advisor (consulted this round)

Logged in `../../water-physics/consult-log.md`; it opened **NACA TN 3939** (Shuford 1957) and Forsyth's Table 2 in the
primary text, both now in `../../water-physics/sources.md`. It agreed my reading of n, found the two probe bugs §3
names, corrected my cutback speed (**6.7 m/s, not 3.0 — 3.0 is the rad/s**, and `sources.md` was already right; the
error was mine alone), struck the "88–95 % kept" bar's provenance, and gave the 61.6° split, the `w = u_rel tan θ`
budget and the 30–45° face. Its caveats, passed on unsoftened: our board at 7 m/s is at **speed coefficient 3.3**,
below TN 3939's 9–18 and TN 4187's 7–18; **everything above 34° of incidence and ±15° of roll is extrapolation**, and a
carve is 42–75° of roll; Shuford's law is for pure planing with buoyancy excluded by his own criterion, where ours adds
buoyancy separately; Forsyth's angular velocity is a resultant from a board-mounted device; and **the whole n = 2.1
target is the advisor's arithmetic on published means, not a measured load**.

Its rank 1, which I did not finish: book, against roll, **who carries the weight** — hull pressure against buoyancy
against the rider's contact — and the buried rail's immersion. Its hypothesis is that the board is **held out of the
water at high rail**, by the standing contact or by the roll outrunning the sinking. §3 item 5's area collapse
(0.356 → 0.231 m²) is consistent with it and does not prove it.

## 7. Seatbelts

- `npx tsc --noEmit -p .`: **clean**. `npx tsc -p server/tsconfig.json --noEmit`: **clean** [M].
- **No file under `src/` is changed** (`git diff --stat` against main shows only `docs/`), so the suite cannot be
  affected, the default path cannot move, and the Canyon byte hashes cannot move. I did not run the Canyon bench for
  that reason and say so plainly rather than quote a pass.
- The six files that cover the rider and the board — `AttachedRider`, `predictiveBalance`, `standingBody`,
  `humanBalance`, `BoardBody`, `PhysicalMode` — run **alone**: see `results/suite-rider-32r.txt`.
- **No unpaired force is added.** Nothing in the sim changed at all.
- Five Basilisk runs and a wave-track agent shared the machine for the whole round; none of it was stopped.

## 8. What I am unsure of

- **Whether the 61.6° split survives a measured load.** Everything about n = 2.1 traces back to one reduction of
  Forsyth's published means. If their 1.9 rad/s resultant is not mostly yaw, the whole bar moves.
- **Whether the cross-flow correction would help once the face is steep.** I measured that it does nothing at 6° of
  incidence and that it costs ten tests; I did **not** measure it on a 30–45° face, because we have none. That is the
  experiment that settles it, and it needs the wave track first.
- **The ten failing tests might be the old law's behaviour rather than a regression.** I did not investigate which, and
  I would not re-baseline ten default-path turn tests without the owner.
- **Whether `load`'s 2 s of extra time is a technique or an artifact of a statically-set stance.** The probe flips
  Compress on in one frame; a player's thumb is slower, and the leg model paces the depth but not the intent.
- **The advisor's rank 1 is the live hypothesis and I leave it open**: at 81° of roll the board may be held out of the
  water by its own contact, which would be the owner's "board sinks into water" thread at a rail angle study #285
  never tested.

## 9. For the owner, in plain words

The surfer's turn is too slow, and this round found out why with a number. A real bottom turn pulls about **2.1 times
the surfer's weight** through the water. Ours pulls **1.0 to 1.3** — and it turns out it *cannot* pull more, for a
reason that is arithmetic rather than a bug: a board only presses on the water as hard as it needs to hold the surfer
up. Press harder and you go up. A real surfer gets to 2.1 by **dropping down the face and then turning the drop
around** — all that extra pressure is them stopping a fall. On our test wave the surfer never falls: it measures under
half a metre a second of descent, and I gave it a run-up straight down the steepest face we have and it still would
not.

**So the thing standing between you and a fast turn is the wave, not the board.** The research advisor put the number
on it: a turn like the ones measured on real surfers needs a face of **30 to 45 degrees over about two metres**. Ours
is 16 degrees over 1.4 m. That is your own "steep faces for tricks" note, now with arithmetic. The good news inside it
is that the *turn rate* gap is much smaller than the force gap — about 1.2 to 1.5 times, not 2 — so a steeper face
should buy most of it.

Two other things worth your time:

1. **I built the one real fault I could find in the board's own physics and then shelved it.** Our board's lift law is
   a small-angle formula being used at big angles, and against 1957 towing-tank measurements it is 30 to 46 per cent
   low once the board is leaned over hard. The fix is sourced and I verified it to within a few per cent. But measured
   on your own test it changes your turn by *nothing* — because our board never actually gets to the angles where the
   old law is wrong — and it breaks ten turn tests, including making the deep bottom turn much worse. So it is sitting
   in the folder with the patch and the numbers, ready for the day the waves get steep enough to need it. I would
   rather hand you that than a change you would feel as a step backwards.
2. **One thing to try with your hands.** Compressing **as the turn loads up** is much better than compressing before
   it: in twelve of twelve test turns the surfer keeps more speed and stays up about two seconds longer. Holding
   Compress from the start, which is what the earlier round measured, is worse. Shot list: on Canyon with
   `?canyonWaves=true`, take the turn standing tall, then squash down just as the board bites, and compare it against
   squashing down first.

And one correction I owe you. The figure that started this round — "a real bottom turn keeps 88 to 95 per cent of its
speed, ours keeps 40" — is not in the paper it was credited to. The paper's 92 per cent is the speed of a *cutback*
compared with the speed of a *bottom turn*, two different turns. Measured over the length of a real bottom turn, ours
keeps **93 to 132 per cent**. Our carve was never eating the speed.

## 10. Files (3.2r)

- `load.probe.ts`: the load factor through the carve on the owner's acceptance test — n and its own tilt, 1 + a_com/g,
  the incidence and area the force is made from, the speed kept at fixed times into the turn, and `DELAY`/`HEADING`/
  `FACE` for the run-up and `STROKE` for the leg stroke.
- `crossflow-32r.patch.txt`: Shuford's cross-flow term, built, verified against NACA TN 3939, measured on the
  acceptance test, and parked — with the ten failing tests named and the condition for taking it off the shelf.
- Results: `results/n-old-32r.jsonl` and `n-new-32r.jsonl` (the two twelve-run columns), `n-trace-old-32r.jsonl` and
  `n-trace-new-32r.jsonl` (the frame-by-frame traces §3 item 5 reads), `n-drop-32r.jsonl` (the run-up sweep),
  `n-stroke-32r.jsonl` and `n-stroke2-32r.jsonl` (the leg stroke, without and with a run-up),
  `n-old-cross-32r.jsonl` and `n-new-cross-32r.jsonl` (the parked patch's twelve runs each),
  `results/suite-rider-32r.txt`.
- `../../water-physics/sources.md`: NACA TN 3939 added, and the Forsyth speed-ratio provenance corrected.
- `../../water-physics/consult-log.md`: this round's consult.

# Part 17 — who carries the weight against roll, and how deep the buried rail is

Written 2026-11-14 by the build agent (Opus 5, effort xhigh), on branch `claude/rider-new-32s`, cut from
`origin/main` at **8708dd15** (Part 16's merge), so Part 16 above is its base. The contract: the water-physics
advisor's rank 1, stated at the end of Part 16 §6 — **book the vertical load by source through a carve as the roll goes
from flat to its stop, with the buried rail's immersion beside it, and say whether the standing contact is holding the
board out of the water.**

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

## 1. The one sentence the round was for

**No — the contact is not holding the board out of the water, and nothing else is either: the rider's contact presses
*down* on the board in every frame of all 24 runs (never once upward), the buried rail goes *deeper* as the roll goes
over — 0.055 m under at flat to 0.26 m at the stop, 2.4–4.1× the board's own thickness, its deck edge under water
throughout — and the hull wets **0.69–0.91** of what flat-plate geometry says it should (0.74–0.91 above 30° of
roll), at every roll rate from 3 to 173 °/s** [M, 2,423 old-rider and 2,197 new-rider turn frames over 12 runs each].

So the advisor's hypothesis is refuted, and its own prior (§3 case C of its consult) is what the ledger shows: **nothing
holds the board up at high rail because the hull genuinely cannot carry weight there, and the system falls.** But the
reason is not the one anybody in this thread had in mind, and it is not a coefficient:

> **The vertical collapse is the `cos φ` projection, not the force law. `pressure.y / |pressure|` equals cos(roll) to
> within 0.008–0.077 in all eighteen bins, both riders, while the pressure's own *magnitude* RISES to 1.21–1.24 W at
> 40–50° of roll and is still 0.38–0.51 W at 80–90°** [M]. The force is there. It is pointing sideways.

And it can only point sideways, because **the board has exactly one surface and its patch normals have no x-component
at all** — `BoardShape.ts:114` builds every bottom patch with `normal: { x: 0, y: −1/norm, z: slope/norm }` [R]. Rolled
83°, that single normal is 83° off vertical and there is no other surface in the model. **No coefficient, on any patch,
can make vertical force there.** The only force law that would not be pinned to that normal — the cross-flow term — is
gated off in every carve (§5).

## 2. The ledger, binned by roll

Population: the owner's acceptance test, twelve runs per rider (two stances × three entry speeds × two stick
positions) on the Canyon-matched face (1.4 m, 16°, 5.7 m/s) — the same movement and the same runs as `load.probe.ts`,
and the gate reproduces exactly: **old rider reaches the wave on the side 12 of 12, new rider 1 of 12** [M]. Every
figure [M], in **system weights** (board 2.54 kg + rider 73 kg) and on the **world vertical**. Medians per bin, with
the min and max over the pooled frames where they matter. `waterUp` is the water's whole force on the vertical, which
is `1 + a_com/g` exactly; `contactUp` is the rider's contact on the board, **positive meaning the contact lifts it**.

**Old rider.** Bins beyond 60° hold 5–16 frames from 2–3 runs; that thinness is the advisor's own warning and it binds.

| \|roll\| | frames (runs) | speed | **waterUp** = 1 + a_com/g | **contactUp** | buoyancy | pressure | addedMass | radiation | friction | fins | rails |
|---|---|---|---|---|---|---|---|---|---|---|---|
| 0–10° | 924 (12) | 8.50 | **0.975** [0.16, 1.44] | **−0.941** [−1.40, −0.15] | 0.115 | **0.786** | 0.037 | 0.032 | −0.003 | −0.002 | 0.000 |
| 10–20° | 457 (12) | 8.22 | **0.998** [0.66, 1.48] | **−0.964** [−1.45, −0.63] | 0.149 | **0.839** | 0.005 | 0.027 | −0.005 | −0.004 | 0.002 |
| 20–30° | 482 (12) | 7.00 | **1.004** [0.79, 1.71] | **−0.971** [−1.66, −0.76] | 0.178 | **0.821** | 0.004 | 0.026 | −0.007 | −0.011 | 0.003 |
| 30–40° | 231 (9) | 8.49 | **0.996** [0.87, 1.50] | **−0.964** [−1.46, −0.86] | 0.159 | **0.764** | 0.022 | 0.047 | −0.007 | −0.015 | 0.005 |
| 40–50° | 185 (8) | 8.97 | **1.038** [0.85, 1.21] | **−1.005** [−1.17, −0.82] | 0.135 | **0.889** | −0.005 | 0.009 | −0.007 | −0.015 | 0.007 |
| 50–60° | 111 (3) | 7.04 | **0.946** [0.39, 1.10] | **−0.911** [−1.06, −0.35] | 0.213 | **0.716** | −0.021 | 0.041 | −0.007 | −0.020 | 0.010 |
| 60–70° | 16 (3) | 6.05 | **0.359** [0.28, 0.44] | **−0.321** [−0.39, −0.24] | 0.186 | 0.400 | −0.116 | −0.082 | −0.007 | −0.041 | 0.006 |
| 70–80° | 12 (2) | 5.85 | **0.170** [0.09, 0.28] | **−0.133** [−0.24, −0.05] | 0.128 | 0.120 | −0.025 | −0.048 | −0.005 | −0.005 | 0.006 |
| 80–90° | 5 (2) | 5.09 | **0.057** [0.04, 0.08] | **−0.023** [−0.04, −0.01] | **0.080** | 0.026 | 0.001 | −0.015 | −0.003 | −0.031 | 0.002 |

**New rider.** Same structure, and — this is the second finding of the round — **near-identical numbers wherever it
spends its time.**

| \|roll\| | frames (runs) | speed | **waterUp** | **contactUp** | buoyancy | pressure | addedMass | radiation | fins | rails |
|---|---|---|---|---|---|---|---|---|---|---|
| 0–10° | 770 (12) | 7.53 | **0.948** | **−0.915** | 0.138 | **0.677** | 0.082 | 0.048 | 0.000 | 0.000 |
| 10–20° | 587 (12) | 7.92 | **1.031** | **−0.997** | 0.169 | **0.842** | −0.002 | 0.033 | −0.006 | 0.001 |
| 20–30° | 387 (12) | 8.79 | **0.999** | **−0.965** | 0.171 | **0.821** | −0.034 | 0.028 | −0.010 | 0.002 |
| 30–40° | 241 (11) | 7.95 | **1.013** | **−0.973** | 0.171 | **0.841** | 0.009 | 0.025 | −0.015 | 0.004 |
| 40–50° | 108 (10) | 7.59 | **0.979** | **−0.944** | 0.165 | **0.855** | 0.068 | 0.041 | −0.019 | 0.008 |
| 50–60° | 71 (8) | 5.31 | **0.821** | **−0.792** | 0.173 | 0.460 | 0.059 | 0.052 | 0.001 | 0.011 |
| 60–70° | 19 (5) | 5.71 | **0.708** | **−0.678** | 0.166 | 0.380 | 0.069 | 0.039 | −0.010 | 0.017 |
| 70–80° | 11 (3) | 7.54 | **0.515** | **−0.486** | 0.160 | 0.208 | 0.044 | 0.004 | 0.074 | 0.028 |
| 80–90° | 3 (2) | 4.83 | **0.263** | **−0.191** | **0.217** | 0.081 | −0.029 | 0.013 | −0.002 | 0.018 |

Read it in five lines:

1. **Hull planing pressure carries the weight, at every roll angle the board actually turns on.** 0.72–1.09 W of the
   0.95–1.04 W total from 0° to 60°, with **buoyancy a steady 0.12–0.22 W** beside it. Everything else — added mass,
   radiation, friction, fins, froth, bed — is within ±0.12 W of nothing, and all of it together never reaches 0.15 W.
2. **The rail side faces carry 0.000 to 0.030 W at any roll — at most 3 % of the weight** [M]. The advisor's own
   ceiling for them was 0.046 W and we do not even reach it. **3.2q's ruling stands: build nothing on the rail.**
   (3.2q measured the rails at 1.3–6.1 % of the *yaw*; this is the same answer on the vertical.)
3. **`contactUp` is negative in every bin and in every one of the 24 runs**, the per-run worst running −1.04 to
   −1.66 W and the least-negative value anywhere in the data being **−0.007 W** [M]. The rider presses down, always.
   What it does at high rail is **press less**, falling from −1.005 W at 40–50° to −0.023 W at 80–90° — because the
   water's lift and the rider's weight-on-the-board go to zero *together*. That is not support; that is the rider
   leaving with the board.
4. **The fall is twice a real cutback's.** The advisor predicted `1 + a_y/g` = 0.45–0.55 in the 75–85° bin, from
   Forsyth's own means (a real 75° cutback is a controlled drop at −0.45 g). We measure **0.057** (old) and **0.263**
   (new) — the system falls at −0.94 g and −0.74 g. So "a hull that stops carrying weight at big rail is correct
   physics" is right in kind and wrong in degree by about 2×.
5. **The new rider's 1-of-12 is not a lift problem.** Over 0–50° of roll, which holds 2,093 of its 2,197 turn frames,
   its vertical ledger is within a few per cent of the old rider's in every row (40–50°: waterUp 0.979 against 1.038,
   pressure 0.855 against 0.889, buoyancy 0.165 against 0.135). **The water carries the new rider exactly as it
   carries the old one.** Whatever makes it fall is not here, and the next round should not look here for it.

## 3. The buried rail, measured

| \|roll\| | buried rail, **bottom edge** under the surface (m) | its **deck edge** | the **high** rail's bottom edge | wetted area (m²) | share on the buried side | wetted beam | beam the geometry asks for, `d/sin φ` | ratio |
|---|---|---|---|---|---|---|---|---|
| 0–10° | **0.055** [0.003, 0.115] | 0.052 | +0.031 | 0.331 | 0.57 | 0.319 | (0.464, saturated) | — |
| 10–20° | **0.109** [0.039, 0.167] | 0.106 | +0.048 | 0.347 | 0.62 | 0.293 | (0.445, saturated) | — |
| 20–30° | **0.172** [0.071, 0.291] | 0.169 | +0.057 | 0.362 | 0.65 | 0.282 | 0.409 | 0.69 |
| 30–40° | **0.177** [0.100, 0.383] | 0.174 | +0.013 | 0.332 | 0.74 | 0.237 | 0.300 | **0.79** |
| 40–50° | **0.173** [0.110, 0.419] | 0.170 | −0.026 | 0.279 | 0.86 | 0.203 | 0.244 | **0.83** |
| 50–60° | **0.254** [0.206, 0.311] | 0.252 | +0.033 | 0.388 | 0.70 | 0.262 | 0.322 | **0.81** |
| 60–70° | **0.260** [0.239, 0.310] | 0.258 | +0.014 | 0.336 | 0.76 | 0.230 | 0.292 | **0.79** |
| 70–80° | **0.207** [0.173, 0.233] | 0.206 | −0.061 | 0.234 | 0.91 | 0.175 | 0.213 | **0.82** |
| 80–90° | **0.150** [0.139, 0.162] | 0.150 | −0.128 | 0.165 | 1.00 | 0.139 | 0.152 | **0.91** |

Four things in it:

1. **The board sinks, and it sinks about as much as a real one.** The buried rail's bottom edge goes **0.055 → 0.26 m**
   under as the roll goes over, against the advisor's sourced expectation of **0.10–0.19 m at 42–75° of rail** [S, its
   `w = d / sin φ` on the area a real carve needs]. Ours is at the top of that band or slightly past it. The deepest
   value reached inside a single turn, over the 24 runs, is **0.18–0.57 m** [M]. **This is the first measurement of
   #285's question at a rail angle** — #285 found the board's planing realistic but never tested it rolled — and the
   answer is that the sinking is not the fault.
2. **The deck edge is under water the whole time, and that fact is nearly empty**, because the buried rail's deck edge
   sits **0.001–0.003 m above its bottom edge** [M]: the board has no rail band. The advisor traced it to the volume
   taper solving to a ≈ 0.925, which leaves a 2–5 mm knife edge [S/R]. So "the rail bites" has nothing in our geometry
   to bite with.
3. **The hull wets 0.69–0.91 of what a rolled flat plate would** (0.74–0.91 above 30°), and the ratio *rises* with roll
   rather than falling.
   It is **not** a board held out of the water. The missing fifth is where the advisor said it would be: 4 patches
   across at 0.116 m, keyed on each patch's *centre*, cannot resolve a wetted beam of 0.14–0.26 m, and the outermost
   centre sits 0.058 m inboard of the rail [R]. The two saturated rows are the formula's own degeneracy — `d/sin φ`
   exceeds the beam below ~20° of roll — not a measurement.
4. **Buoyancy is the last thing holding the board up, and it is small.** At 80–90° it is 0.080 W (old) and 0.217 W
   (new) of a 0.057 W and 0.263 W total — more than all the rest put together. The advisor flagged that `patchForce`
   gives the full ρg·V whether or not the deck is in the hollow's air cavity (`hullForces.ts:195`; `deckWet` scales
   deck pressure, friction and wetted area, not buoyancy) and that a ventilated board would not have it, with a
   ceiling of 0.350 W [S]. **Measured, that mechanism is worth at most 0.08–0.22 W, and removing it would deepen the
   fall rather than fix anything.** Recorded, not pursued.

## 4. The two causes, told apart

The advisor's discriminator, run as asked.

- **"Held out by the standing contact": refuted by §2 line 3.** `contactUp` never once goes to zero or positive in
  4,620 turn frames. There is nothing to ablate, so I did **not** run its ballast-payload ablation — a riderless board
  cannot be made to carve, and the column it was meant to settle is already unambiguous.
- **"The roll outran the sinking": refuted by a rate sweep.** Old rider, stick at 0.25, 0.5 and 1.0, binned by roll
  [M]:

  | stick | 30–40° | 40–50° | 50–60° | 60–70° | 70–80° |
  |---|---|---|---|---|---|
  | 0.25 — roll rate (°/s) | 99 | 128 | 156 | 173 | 121 |
  | 0.25 — wetted beam / geometric | 0.76 | 0.82 | 0.84 | 0.81 | 0.81 |
  | 1.0 — roll rate (°/s) | 28 | 9 | 3 | 115 | 107 |
  | 1.0 — wetted beam / geometric | 0.83 | 0.82 | 0.81 | 0.79 | 0.82 |

  **The deficit is 0.76–0.84 at 3 °/s and 0.76–0.84 at 173 °/s** — a 58-fold range of roll rate and no trend. It is a
  constant, and §3 item 3 says what it is: patch quantization, not a lag.
- **"Nothing holds it up; the hull cannot carry weight there": confirmed, with a mechanism the advisor's case C did
  not name.** The hull *can* still make force — 0.38–0.51 W of it at 80–90° — it just cannot point any of it up.

**The fall, traced.** Old rider, tall, full stick, entry +1.5 m/s, the run that reaches 82° (`results/lift-32s-trace-old-tall-full.jsonl`).
Everything happens in **0.39 s**, between t = 2.08 s and t = 2.47 s [M]:

| t (s) | roll | speed | waterUp | contactUp | buoyancy↑ | pressure↑ | buried rail (m) | wetted area |
|---|---|---|---|---|---|---|---|---|
| 1.40 | 49° | 8.40 | 1.001 | −0.975 | 0.163 | 0.807 | 0.208 | 0.316 |
| 2.08 | 52° | 6.43 | 0.796 | −0.759 | 0.223 | 0.631 | **0.276** | **0.388** |
| 2.27 | 66° | 6.04 | 0.362 | −0.327 | 0.173 | 0.313 | 0.253 | 0.316 |
| 2.40 | 80° | 5.29 | 0.092 | −0.053 | 0.106 | 0.054 | 0.176 | 0.205 |
| 2.47 | 83° | 4.38 | **0.034** | **−0.001** | 0.057 | **0.011** | 0.127 | 0.126 |

The vertical pressure goes **0.631 → 0.011 W, 98 % of it gone**, and the rider's press on the board goes
**−0.759 → −0.001 W**. At the last frame the contact transmits nothing: the rider is in free fall beside the board.
One thing I measured and cannot attribute: the rail **un-buries** over that window, 0.276 → 0.127 m. The system's
centre of mass is accelerating downward at ~0.97 g throughout, so this is the board rotating and the face moving, not
anything lifting it; the window coincides with the board's speed falling through the wave's own 5.7 m/s, which is the
mechanism #93/#96 already named for falls high on the face, but **I did not isolate it and I am not claiming it** [I].

## 5. The gap the round found, and why I am not building in it

Two gates, both read in the code and both verified by me, not taken on the advisor's word [R]:

- `src/physics/hullForces.ts:226` — `const deep = bottom >= 1 && deck >= 1 ? submergedShareHere : 0;` — the cross-flow
  term needs a patch fully submerged **and** a non-zero board-wide plate share.
- `src/physics/BoardBody.ts:990` — `const plateDepth = this.plate && this.plateAllowed && !this.rider?.attached ? this.plateDepth() : -Infinity;` —
  the plate law is off **whenever a rider is attached**, which is always in a carve, so `plateShareNow` is
  `submergedShare(−Infinity)` = 0 and `deep` is **identically zero in every carve at every roll**. (And `plateDepth()`
  takes the *shallowest* face over all 48 patches, so one dry high-rail patch would zero it anyway.)

So from about 45° to 85° of roll the board runs on the bare small-trim coefficient along a single flat-bottom normal,
and §1 is the consequence. **Three reasons I am shipping the read and no code:**

1. **It is a structure problem, and every structural fix is a default-path hull-law change.** Giving the section a
   deadrise, a bilge or a real rail band, or opening either gate, changes the law `BoardBody.ts:987` says in its own
   comment every rider was calibrated on. 3.2r already built one such change, measured it, and parked it for the same
   reason; a second one, bigger, is the owner's call and not a round's.
2. **It would not fix the ride.** A real bottom turn is **42° of rail** [S, Forsyth's mean], and at 40–50° we already
   make **0.89–1.04 W** of vertical and the old rider passes the gate **12 of 12**. The 80–90° bin is somewhere our
   rider only arrives *because the turn has already failed* — it is reached in 5 frames of 2 runs, both of them
   tall-full-stick runs that roll past 70° and fall. **Fixing 83° of roll would make the failure prettier, not rarer.**
3. **The advisor's own arithmetic says the payoff is lateral, not vertical**, and the identity from Part 16 still
   forbids the vertical one: `n = (1 + a_y/g)/cos φ`, so no board change raises steady load factor on this face. Our
   |water| at 40–60° is already **1.55–1.59 W** against Forsyth's 2.11 — the *magnitude* is not far off. What a correct
   high-roll law would buy is a rail that keeps biting sideways as it buries (ours 0.03 W against a real cutback's
   2.05 W of lateral) and a release with a cause. **In the owner's terms: at full rail the board would feel set in the
   water instead of letting go, and the turn would end when the rail ventilates — a spin-out — rather than when the
   force law runs out of surface.** That is worth a round. It is not worth this round's remaining hour, and it needs
   the owner's yes on the default path first.

What I did ship beside the probe: the record. `crossflow-32r.patch.txt` now carries the correction that **3.2r's
"30–46 % low" is a zero-roll result** — on the roll axis the law it replaces is 2–8× too *generous* [S, the advisor's
Shuford deadrise factor with TN 4187's rolled-plate equivalence] — so nobody takes that patch off the shelf for a
steep face believing it also fixes the carve.

## 6. The advisor (consulted this round)

Logged in `../../water-physics/consult-log.md`; it opened **Breslin & Skalak 1959, NASA Memo 2-23-59W** (ventilation of
surface-piercing struts), now in `../../water-physics/sources.md`. It did something worth saying plainly: **it predicted
its own hypothesis would half-fail, and named the one mechanism that could have saved it** (full ρg·V on a deck that
should be in air). Both calls were right — the hypothesis failed, and buoyancy was indeed the last row standing, just
too small to matter. It also supplied every bar in §5 item 3, the `w = d / sin φ` geometry §3 is read against, the
0.55 W prediction §2 line 4 scores, and both gates in §5.

Its caveats, passed on unsoftened: our board at 7 m/s is at **speed coefficient 3.3**, below TN 3939's 9–18 and
TN 4187's 7–18; everything past **34° of incidence, 40° of deadrise and ±15° of roll** is extrapolation, and a carve is
42–83° of roll, so the roll→deadrise mapping it reasons with is [I] on TN 4187's measured *spray-root* equivalence and
unproven below 40°. **n = 2.1 and the 1.57/0.55 vertical split remain its arithmetic on two published means, not a
measured load.** And it flagged one thing it would not choose: whether buoyancy should follow the deck hollow is a
default-path change and the owner's.

## 7. Seatbelts

- **No file under `src/` is changed.** `git diff --stat` against `origin/main` shows only `docs/`, so the default path
  cannot move, the suite cannot be affected and the Canyon byte hashes cannot move. I did not run the Canyon bench for
  that reason and say so rather than quote a pass.
- `npx tsc --noEmit -p .`: **clean, exit 0** on its own line. `npx tsc -p server/tsconfig.json --noEmit`: **clean, exit
  0** [M]. Run in a worktree whose `node_modules` is linked to the main checkout's, so `tsc` really ran.
- The six files that cover the rider and the board — `AttachedRider`, `predictiveBalance`, `standingBody`,
  `humanBalance`, `BoardBody` (`src/physics/`) and `PhysicalMode` (**`src/game/`**, not `src/physics/` — Part 16's
  command silently matched five files, not six) — run **alone**: **276 passed, 8 expected fail, 0 failures**, and
  `grep -E "Error:|AssertionError"` over both logs is empty. See `results/suite-rider-32s.txt`.
- **The probe's own seatbelt, and it is the reason any of §2 can be believed**: on a **riderless** board the same
  vertical balance closes with a residual of **exactly 0** — median and peak, over 240 frames, in board weights [M]
  (`results/lift-32s-closure.jsonl`). The water ledger plus gravity accounts for the board's vertical momentum
  completely, so the residual with a rider on it *is* the contact and nothing else.
- **No force is added, paired or unpaired.** Nothing in the sim changed at all; `board.forces` was already a
  per-source ledger, which is why this round needed no `src/` change where 3.2q needed a `yawLedger`.
- A wave-track agent and five Basilisk runs shared the machine throughout; none of it was stopped.

## 8. What I am unsure of

- **The high-roll bins are thin.** 3–19 frames from 2–5 runs above 60°. Every number there is a handful of frames from
  the two or three tall-full-stick runs that get that far, and I would not defend the third digit of any of them. The
  claims that carry the round — the sign of `contactUp`, the `cos φ` identity, the rail going deeper — are all also
  true in the fat bins, which is why I rest on them and not on the 80–90° row.
- **The `cos φ` identity is tested against roll measured to the *water surface*, not the world vertical.** On a 16°
  face those differ by up to the face slope, which is why the ratio sits 0.008–0.077 *below* cos(roll) rather than on
  it. I read that residual as the face slope's own tilt; I did not prove it is only that.
- **Why the rail un-buries in the last 0.39 s** (§4). I have a plausible mechanism and no isolation.
- **Whether a sectioned hull would actually buy the lateral bite.** §5 item 3's payoff is the advisor's arithmetic and
  my inference from it, not a measurement. Nobody has built it, and 3.2r's experience says a sourced correction can
  measure to nothing.
- **Whether `beam/beamGeo` ≈ 0.8 is really patch quantization.** The rate sweep rules out a lag and the arithmetic
  fits, but I did not test it by refining the patch grid, which would settle it in one run.

## 9. Files (3.2s)

- `lift.probe.ts`: the vertical-load ledger — every water source on the world vertical in system weights, the rider's
  contact as the residual of the board's own vertical momentum balance, each rail's bottom and deck edge immersion
  separately, the wetted bottom split across the stringer and the beam against the rolled-plate geometry, the attitude,
  the roll and immersion rates and the along-path share, all binned by \|roll\|; `PART=closure` is the riderless check.
- Results: `results/lift-32s-old.jsonl` and `lift-32s-new.jsonl` (the nine bins and the twelve runs, per rider),
  `lift-32s-rollrate.jsonl` (the stick sweep §4 reads), `lift-32s-closure.jsonl` (the seatbelt),
  `lift-32s-trace-old-tall-full.jsonl` (the frame-by-frame fall §4 traces), `results/suite-rider-32s.txt`.
- `crossflow-32r.patch.txt`: the zero-roll correction added to its shelf note, and the second gate named.
- `../../water-physics/sources.md`: NASA Memo 2-23-59W added. `../../water-physics/consult-log.md`: this round's consult.

## 10. For the owner, in plain words

You have said for weeks that the game feels like a floor and that real boards sink. **This round measured the sinking at
a rail angle for the first time, and the board sinks properly**: rolled over in a carve, its buried rail goes a quarter
of a metre under — about four times the board's own thickness, and as deep as the real thing. That is not what is wrong.

What is wrong is narrower and stranger. **Our board is a flat sheet.** It has a bottom and nothing else — no curve into
the rail, no edge with any thickness to it (the rail in the model is two to five millimetres). While the board is fairly
flat, the bottom faces downward and holds you up. Rolled right over on its edge, that same bottom now faces *sideways*,
and there is simply no part of the board left pointing down. The water is still pushing just as hard — we measured it,
and the push is nearly as strong as a real surfer's — but almost none of it is holding you up any more. So past about
sixty degrees of rail you fall, and you fall about twice as fast as a real surfer would.

The honest news is that **this is not where your rides are going wrong.** A real bottom turn sits at about forty-two
degrees of rail, and there our board holds you up fine — the surfer makes it across the wave twelve times out of twelve.
The sixty-plus degrees is somewhere he only ends up when the turn has already gone bad. Giving the board a proper edge
would make that moment *feel* right — the rail would keep gripping as it buries, and the turn would end with the board
breaking loose and sliding out, the way a real one does, instead of the board quietly running out of something to push
against. **That is a real improvement and I think it is worth doing, but it changes how every board in the game behaves,
so it is your call and not mine.** Nothing shipped this round but the measurement.

One thing I can rule out for you: **the new surfer's problem is not here.** Wherever he spends his time on the wave, the
water carries him exactly as it carries the old one, to within a few per cent. His falling is something else.

# Part 18 — the lean hold taken out, and the compressed turn's pull paid for honestly

Written 2026-11-14 by the build agent (Opus 5, effort xhigh) on branch `claude/rider-new-32t`, cut from `origin/main`
and rebased onto **009a9c51** (C2 step 5f's merge), so Part 17 above and step 5f are both its base.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

**The round was re-aimed twice while it ran, by the coordinator, on the owner's own words.** It began as "measure a
bottom turn on the library face, then shape the hull". It ended as: take out 3.2q's lean hold, which the owner had just
ridden and disliked; then build the compressed turn's hidden pull as an honest force pair and score it against the old
rider on Canyon. Both of those are done. The library-face read was already finished when it was cancelled, so §4
reports it rather than throwing it away, and the hull's cross-section is **not** built — §5 says what the advisor
handed over and why the next round should not simply build it.

## 1. The three sentences the round is for

1. **3.2q's lean hold rang, and the ring is measured.** In Compress the lean the body asks for **turns around 1.51
   times a second** with the hold and **0.00 times** without it, and it reaches **33.7°** of the 50° the stick asks for
   with it against the full **50°** without [M, 6 runs a cell]. Tall it rings 0.62/s against 0.35/s — **2.4× harder in
   Compress than tall**, which is what 3.2q's §9 said would happen and what the owner felt: *"the compress is still to
   slow and barely turns now"*. The hold is removed, not repaired.
2. **The compressed turn's pull cannot be paid for by the legs, and the reason is the reaction, not the strength.**
   `?legDrive=turn` makes COMPRESS_PULL's inward pull an honest leg pair — the legs push the body in, the board takes
   the opposite at the back foot. The old rider's compressed gate goes **6 of 6 → 0 of 6** [M]. Three bounds on the
   push were built and measured; the decisive one is the third: **capped at COMPRESS_PULL's own magnitude**, so the
   only difference from the unpaired pull is the board's half, it is still 0 of 6 and still falls at full stick in
   **0.65–0.73 s**. So the old rider's 6 of 6 rests on the force being *unpaired*, and no bound on an internal pair
   recovers it.
3. **The acceptance test never puts the board on the steep part of any face.** Placed where the owner's test places him
   — 0.75 of the face's own run onshore of the crest — the water under the board reads **1.9–2.8° of slope and 0.0 % of
   frames over 30°** through the whole turn, on a `?wave=library` face whose own steepest is **31.3°** [M, 12 runs].
   On the 16° `FaceWater` the same column reads **0.0–13.0°**. Every "16° face" and "31° face" in this thread is the
   face's *steepest point*; it is not the water the board is on. §4.

## 2. Job 0 — the lean hold, measured and removed

3.2q wrote its own falsification test and it is worth quoting again, because this is the round that ran it:

> *"The one real risk: the cap closes a new loop (lean → rail → turn → felt vertical → lean) through a 0.1 s low-pass.
> It does not ring tall and it does in Compress (Mode B 0.022 → 0.46). **If the owner finds Compress worse than 3.2p,
> that is the cause**; the ways out are to rate-limit the cap's opening, or to feed it the turn the internal model
> predicts from the rail."*

The owner rode `?physical&canyonWaves=true&turnBody=on&snapLegs=drive&snapCross=on&rider=new` on 2026-11-14 and
reported *"The compress is still to slow and barely turns now, if turn a bit falls immediately"* and *"produced the
same stuck moviment and balance"*. So the antecedent held.

**The ring, measured** (`libturn.ts` part F, the Canyon-matched face — 1.4 m, 2.6 m deep, 16°, 5.7 m/s, the wave
`MATCH=canyon` fits; the owner's own movement; 6 runs a cell = 3 entry speeds × 2 stick positions). `ring` counts the
sign changes of the lean the body asks for, per second of the turn; `lean asked` is its peak against the 50° the stick
asks for; `round at 1 s` is how far off the fall line the board has come, which is "barely turns" as a number.

| | gate: across | **ring /s** | **lean asked** | round at 1 s | rail median | rail peak | up, mean |
|---|---|---|---|---|---|---|---|
| **old rider**, Compress | **6 of 6** | — | — | 17.7° | 10.9° | 40.4° | 6.00 s |
| new rider, hold **on**, Compress | 0 of 6 | **1.51** | **33.7°** | 22.3° | 15.1° | 59.5° | 3.18 s |
| new rider, hold **off**, Compress | 0 of 6 | **0.00** | **50.0°** | 20.7° | 16.4° | 60.7° | 2.38 s |
| **old rider**, tall | **6 of 6** | — | — | 32.5° | 42.3° | 69.9° | 3.87 s |
| new rider, hold **on**, tall | 1 of 6 | 0.62 | 35.8° | 27.0° | 23.6° | 77.9° | 2.94 s |
| new rider, hold **off**, tall | 0 of 6 | 0.35 | 50.0° | 25.4° | 24.4° | 74.0° | 2.34 s |

All [M]. The old rider's ring columns are empty because `leanAsked` is the predictive balance's own reference and the
old rider has none [R].

Read it in three lines:

- **The hold's cost is exactly what the owner described.** It holds the asked lean to two thirds of the stick and
  chatters at about 1.5 Hz while doing it. "Barely turns" is 33.7° of lean asked where 50° was asked for.
- **It rings in Compress and not tall**, 1.51/s against 0.62/s, as 3.2q predicted. Tall was never the problem and is
  reported separately throughout for that reason.
- **Removing it costs the small thing it bought**, and the cost is stated rather than hidden: mean time up 3.18 → 2.38 s
  in Compress and 2.94 → 2.34 s tall, and tall's gate 1 of 6 → 0 of 6. The hold is one round old and has never earned a
  ride, so it is removed rather than rate-limited — the coordinator's call, and the measurement does not argue with it.

**Why not the second way out** (feed the cap the turn the internal model predicts from the rail). It would keep a cap
whose only demonstrated effect on a ride is the one the owner disliked, and it would do it through the same `railPull`
inversion the predictor already runs twice a substep [R]. Nothing in this round's numbers says a cap is wanted at all:
without it the lean reaches the full 50° and the rail reaches *more*, not less (16.4° median against 15.1°). I did not
build it and I am not holding it in reserve.

## 3. Job 1 — the compressed turn's pull, made honest

`COMPRESS_PULL` is the larger of the old rider's two hidden supports: about 0.19 g of sideways force on the body with
nothing pushing back, applied at its centre of mass [R]. Its own comment says what the body is really doing — *"leaning
in first means pushing the feet out"* — so the honest version is the pair the legs already make at a rail change
(`legDriveStep`, leg-drive 2026-11-10): **the legs push the body toward the lean it is being asked for while the body is
behind that lean, and the board takes the equal and opposite push at the back foot.** Same three limb bounds as the
rail change's push: the back leg's sideways strength (LEG_SIDE_STRENGTH, by the steer), the back foot's grip
(FOOT_FRICTION times its own load), and the legs' sideways reach at this pelvis height. No new constant. Opt-in as
`?legDrive=turn`, so `?legDrive=on` and the default ride are untouched.

**I wrote the prediction into the constant's note before measuring it**, and it is the thing to score me on: *an
internal pair is net zero on board and rider together, so it cannot supply COMPRESS_PULL's 0.19 g to the system — it
can only move the body in and the board out, sooner.*

**The scores** (old rider, the same Canyon-matched face and the same 6-run cells; `legWork` is the legs' own work on
the body through the turn, which is the seatbelt — a drive that is switched on and never fires would otherwise measure
exactly like one that is off).

| Compress | gate: across | rail median | rail peak | path rate | up, mean | legWork |
|---|---|---|---|---|---|---|
| **COMPRESS_PULL** (today, unpaired) | **6 of 6** | 10.9° | 40.4° | 34.2 °/s | 6.00 s | 0 J |
| `?legDrive=on` (control: the rail change's pair only) | **6 of 6** | 11.7° | 40.6° | 34.2 °/s | 6.06 s | 0.1 J |
| `?legDrive=turn`, the three limb bounds | **0 of 6** | 13.9° | 19.8° | 30.9 °/s | 3.98 s | 128.6 J |
| …eased by how far behind the lean the body is | 0 of 6 | 11.3° | 19.6° | 30.8 °/s | — | 116.8 J |
| …**capped at COMPRESS_PULL's own magnitude** | **0 of 6** | 11.5° | 21.8° | 27.6 °/s | — | 126.8 J |

| tall | gate | rail median | rail peak | path rate | up, mean | legWork |
|---|---|---|---|---|---|---|
| all three columns, identical | **6 of 6** | 42.3° | 69.9° | 54.6 °/s | 3.87 s | 0 J |

All [M]. Tall being identical in every column is the control that says the change touches Compress and nothing else:
Compress's own gate never opens tall, so neither the pull nor the legs' lead-in fires there [R].

**The run-by-run split is where the answer is**, and the cell medians hide it. With the honest pair, by stick position:

| stick | reaches, of the 85° the gate asks | still up for | rail peak |
|---|---|---|---|
| **half** (0.5) | **76.7–82.4°** | **6.4–7.8 s** | 19.6–21.8° |
| **full** (1.0) | 46.3–53.3° | **0.65–0.78 s** | 15.5–30.1° |

So at half stick the honest pair comes within **3–8°** of the gate and keeps the rider up **longer than the unpaired
pull does** (6.4–7.8 s against 6.00 s). At full stick it throws him off in two thirds of a second, every time, in all
three variants.

**And the third variant settles the cause.** Capped at COMPRESS_PULL's own magnitude, the paired push is the *same
force on the body* as today's cheat; the only difference left is the equal and opposite on the board. It still falls at
0.65–0.73 s and still scores 0 of 6. **So the 6 of 6 rests on the missing reaction, not on the force's size.** The
board's half pushes the board sideways out from under a rider whose rail has not yet engaged (rail peak 15.5–21.8°
against the pull's 40.4°), and he loses balance before the turn can be bought from the water.

What that means for the route the coordinator chose, stated plainly because it is the decision this feeds: **paying for
the old rider's cheats from above is not a matter of finding the right bound.** The two bounds I tried are the obvious
ones and both are inert. The honest pair's half-stick behaviour (up longer, 3–8° short) says the lean it produces is
usable; what is missing is the *system's* sideways force, which can only come from the water — the rail, at a rail angle
the pair itself prevents the board from reaching. That is a hull question, which is §5.

Two bounds measured and **not** shipped, so nobody rebuilds them: easing the push in proportion to how far behind its
lean the body still is is **inert**, because early in a turn the body is always more than the feet's own reach (14.3°)
behind it; and the COMPRESS_PULL cap is the diagnostic above, not an improvement. The code carries the simplest form —
strength, grip, reach — and its note carries both negatives.

## 4. The library face, measured before the job was cancelled

This was the round's first job and was cancelled mid-round as answering a different question than the owner's. It had
already run, so here it is, and it should be read as a side measurement.

**First, the harness check, which is the reason any of it can be believed.** The same probe, same movement, on the
Canyon-matched `FaceWater`, reproduces 3.2r's published references: old rider **n(up) 1.085** against the reference
1.09 and the gate **12 of 12**; new rider **1.043** against 1.05 and **1 of 12** [M, 12 runs each]. And this probe's
copy of step 5e's `faceOf` reproduces step 5e's own τ rows on the same sea: **35.6°** at τ −1.5…−0.75 against 5e's
35.9°, and **47.5°** at τ −0.75…−0.25 against its 47.3° [M, 1,121 faces over 40 frames here against 5e's 80,253 over
600].

**The owner's acceptance test on `?wave=library`** (the address in the brief, the sim stepped under the rider frame by
frame from step 5e's own spun-up cache, each run from the same imported state; 12 runs a cell).

| where | the face there | old rider: across | n(up) | new rider: across | n(up) | slope **under the board** | frames over 30° |
|---|---|---|---|---|---|---|---|
| τ −1.01, lane 32, placed 0.75 of the run onshore (the owner's test) | turn 31.3°, H 1.69 m, pace 5.65 m/s | **6 of 12** | 1.091 | 0 of 12 | 1.039 | **1.9°** med, 17.2° most | **0.0 %** |
| τ −1.01, lane 32, placed 0.45 of the run (mid-face) | the same | **7 of 12** | 1.064 | 0 of 12 | 0.000 | 2.8° med, 9.9° most | 0.0 % |
| τ −0.31, lane 105, placed 0.45 of the run | turn **51.0°**, H 2.41 m, pace 5.92 m/s | 1 of 12 | 0.196 | 0 of 12 | −0.117 | old 5.4°, **new 35.0°** med | old 0 %, **new 100 %** |
| the Canyon-matched `FaceWater` (the reference) | turn 16°, H 1.4 m | 12 of 12 | 1.085 | 1 of 12 | 1.043 | 0.0–13.0° | 0.0 % |

All [M]. Four things in it, and the third is the one that matters:

1. **The steep face does not raise the load factor on this movement.** At τ −1.01 the old rider's n(up) is **1.091**
   against **1.085** on the 16° reference — the same number. The brief's premise was that the missing g could only come
   from the wave; on the wave that has it, this movement does not collect it.
2. **The gate gets *worse*, not better, as the face steepens**: old rider 12 of 12 on the 16° plane, 6–7 of 12 at
   31.3°, **1 of 12** at 51.0°, where n collapses to 0.196 and the new rider's goes **negative** (−0.117 — the water's
   resultant is below the board's own up at 80.3° of φ_F). A 51° face at these speeds is not a face this rider turns
   on; it drops him.
3. **The test's own geometry keeps the board off the steep water, and that invalidates the framing more than any of the
   numbers.** Placed where the owner's test places him, the slope under the board is **1.9° median and 0.0 % of frames
   over 30°** on a 31.3° face. The face's "16°" and "31°" are its *steepest point*, halfway up; 0.75 of the run onshore
   of the crest is near the trough, where the profile is gentle by construction. Only the one cell that is both high on
   the face and late in τ gets the board onto 35° water — and that is the cell that scores 1 of 12.
4. **The one cell on steep water is the one where the turn stops being a turn.** Note which rider gets there: the old
   rider's board stays on 5.4° water even here, the new rider's sits on 35.0° for every frame — they go to different
   places on the same wave, so that row is not a paired comparison and I am not reading it as one.: path rate 380 °/s median with peaks in
   the thousands, rail 4.5°, up for well under a second. The board is being dropped down a 35° wall, not carving it.

So: the brief's premise — *"the steep face now exists in the game and no rider has been put on it"* — is true, and the
read refutes the hope attached to it. **The missing load factor does not come from the steeper face on this movement**,
and I am saying so in the paragraph the brief asked me to say it in. What a 35–47° face would need is a rider placed
*on* it and a movement that climbs, which this test is not.

## 5. The hull's cross-section — consulted, designed, **not built**, and why the next round should pause

The owner approved the section explicitly and it was this round's job 2. It is not built: jobs 0 and 1 filled the round,
and the advisor's own answer is a reason to pause rather than to hurry. Its consult is logged in
`../../water-physics/consult-log.md` with six new sources in `../../water-physics/sources.md` (Aguiar Ferreira et al.
2025 on ventilation inception, the USNA planing-hull tow tests via Fu et al. 2012, three surfboard CFD papers, BoardCAD's
own rail read-out). The headline it handed back, which the next round needs before it writes any geometry:

- **The section alone buys a vertical-load multiplier of ×1.05–1.09 at 40–50° of roll** and ×1.44–1.75 at 80–90°, which
  takes Part 17's 0.889 W to 0.93–0.97 W and its 0.026 W to 0.037–0.046 W [I, the advisor's facet integral at Part 17's
  own measured immersions]. In its words: *if you ship the section alone, I expect the ride to measure the same, exactly
  as 3.2r did.*
- **The owner's actual bar needs two more things, and one of them is structurally absent.** "Set in the water, and lets
  go when the rail ventilates" needs **suction on the buried rail band** and a **ventilation latch** to release it — and
  `hullForces.ts:160` makes no suction at all, by construction [R, confirmed by me]. Its ruling: *build the suction with
  the section, or build neither.*
- **The resolution is not more patches.** 4 across is 0.116 m and 8 is 0.058 m; a 12–25 mm rail band gets less than one
  facet either way. The advisor's route is a per-station analytic section integral with 12–36 water samples instead of
  48, precomputed over (roll, immersion) — which it argues is **cheaper than today** [I, from reading the code, not
  profiled].
- **Shuford's own cut-off is 50° of effective dead rise** [S, TN 3939]; past it the planing law must hand over to the
  water-entry branch, and the advisor could not open a tabulated steep-wedge coefficient, which it flagged as a real gap.
- **Its falsifiable prediction, to score it the way Part 17 scored its last one:** the band's share of the hull's
  vertical at 40–50° of roll will be **9–14 %**, and `pressure.y / |pressure|` must stop equalling cos(roll) — exceeding
  it by +0.02–0.06 at 40–60°. If the ratio still equals cos(roll) to within 0.01, the band is not wetted or not
  resolved: a build bug, not physics.
- **Three traps it found in the code, each of which would silently eat the change** [R, its reading]:
  `hullForces.ts:182` derives the deck point along the patch normal, so a near-horizontal band facet collapses its deck
  onto its bottom; `BoardBody.ts:486` computes each station's beam from patch area over length, so tilted facet areas
  inflate the beam and drift `planingScales`, `addedMassPerArea` and `radiationPerArea`; and `BoardBody.ts:545` feeds
  `shape.taper` to `buildFoils`, so changing the taper **moves the fins**.
- **Its own caveat, unsoftened:** every millimetre of its proposed section is [I] — it found no measured shortboard
  cross-section in the open literature. Its ten-minute replacement for all of it is a straightedge and a ruler on the
  owner's own board.

## 6. Seatbelts

- **The deletions column, checked before the push, as the brief requires.** The first check caught the exact failure it
  was written for: branched at 9678ca94, `git diff --stat origin/main` showed **437 deletions** across step 5f's
  document, five library `.bin` cases, `libraryCases.ts` and `tools/basilisk` — the wave track's work, merged while this
  round ran. Rebased onto **009a9c51**; the diff is now **8 files, 186 insertions, 53 deletions, all of them mine** (the
  lean hold's own lines and the lines they replaced). `git merge-base --is-ancestor` would not have caught it.
- `npx tsc --noEmit -p .`: **exit 0**, on its own line, in a worktree whose `node_modules` is linked to the main
  checkout's, so `tsc` really ran. `npx tsc -p server/tsconfig.json --noEmit`: **exit 0** [M].
- The files that cover the rider and the board, run alone — `AttachedRider`, `predictiveBalance`, `standingBody`,
  `humanBalance`, `BoardBody` (`src/physics/`), `PhysicalMode` (**`src/game/`**), plus `legDrive`, `snapCross` and
  `legPower`, which are the ones this change touches: **296 passed, 8 expected fail, 0 failures**, exit 0, and
  `grep -E "Error:|AssertionError"` over the log is **empty**. `results/suite-rider-32t.txt`.
- **Six new tests** for `legDrive: 'turn'`: the default and `'on'` unchanged (COMPRESS_PULL still the body's own, the
  legs still leading nothing); the pull replaced and never both; the push level, toward the lean asked for, within
  LEG_SIDE_STRENGTH, and only while the body is behind that lean; nothing riding straight and nothing out of Compress;
  and **the pair summing to nothing on rider plus board** with its moment equal to the two forces' couple, which is the
  "no hidden motors" rule as an assertion. Plus `?legDrive=turn` in `PhysicalMode.test.ts`'s switch case.
- **No unpaired force is added.** The one force this round adds is a pair by construction and the test above asserts it.
  The one force it removes (3.2q's cap) was never a force — it was a limit on an intention.
- **The Canyon bench, shown rather than claimed**: `results/canyon-bytes-32t.txt`, the same command and the same
  reference as step 5f's `canyon-bytes.txt`, Canyon B and the default Canyon, 3600 steps each from fresh spin-ups.
  **Both are byte for byte step 5f's** [M]: Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`, default Canyon
  `ea3d57a4d49f4b48` / `a1a2555739210f96`, all four identical. Both of this round's changes are opt-in (`?rider=new`,
  `?legDrive=turn`), so that is the expected result and not a surprise. The per-step times are *faster* than 5f's
  (11.79/13.03 ms against 14.04/16.24 for the default Canyon) because the machine was less loaded, not because anything
  here is quicker — the hashes are the claim, the milliseconds are not.
- A wave-track agent shared the machine throughout; nothing of theirs was stopped.

## 7. What I am unsure of

- **The ring is measured on a `FaceWater`, not on Canyon's own water.** `MATCH=canyon`'s 1.4 m / 16° / 5.7 m/s fit is
  the wave the surfer track has always probed against, and the owner rides the real Canyon. The hold's 1.51/s ring and
  the 33.7°-of-50° lean are robust to that (they are properties of a feedback loop through a 0.1 s low-pass, not of the
  face), but the gate counts and the times up are the plane's.
- **"Barely turns" is 33.7° of lean asked, and I am inferring the link.** The owner feels a turn; I measure a lean
  reference and a ring. The chain between them is 3.2q's own and I did not re-derive it.
- **The honest pair's half-stick result is six runs.** 76.7–82.4° of 85° in three runs and up for 6.4–7.8 s in three is
  a thin population to hang "within reach" on, and I would not defend the 3–8° figure to a degree.
- **I did not re-measure the 6-of-6 → 0-of-6 ablation of COMPRESS_PULL itself** (the pull removed with nothing in its
  place). That number is the balance-redesign notes' [S], quoted, not reproduced here; what I measured is the pull
  against the pair.
- **The library-face read's crest pace is coarse.** The crest's station moves in `LANE.step` = 0.25 m, so a pace
  differenced over 0.1 s is quantized to 2.5 m/s; I interpolate the crest parabolically and difference over 1 s, which
  gives 5.65 and 5.92 m/s, but the entry speed each run is placed at inherits whatever that estimate's error is.
- **One lane, one instant, per library cell.** Each of those cells is twelve runs on the *same* slice at the *same*
  start instant, so they share whatever that slice happens to be doing. Step 5e's own population is 80,253 faces; mine
  is one of them, twelve times.
- **Whether a cap on the lean is wanted at all.** I removed 3.2q's and argued against rebuilding it from the measured
  rail going *up* without it. That is an argument from six runs a cell on a plane, not a proof.

## 8. Files (3.2t)

- `libturn.ts` (new): the owner's acceptance test on **any** water — a `FaceWater` of any height and slope (part F) or
  the **live `?wave=library` sea** (part T), with part S the scout that finds a steep slice and its lane. It reports
  everything `load.probe.ts` reports plus three things this round needed: the **slope of the water actually under the
  board** every frame, the **ring** of the lean the body asks for, and the **legs' own work**, so a leg drive that is
  switched on and never fires cannot pass for one that is off. Its header carries the commands.
- Results: `results/suite-rider-32t.txt`, `results/canyon-bytes-32t.txt`, and under `results/32t/` the job-0 ring runs,
  the job-1 pull-against-pair runs with both rejected bounds, and the library-face cells.
- `src/physics/AttachedRider.ts`: 3.2q's lean hold removed (its note kept as the reason); `legTurn` and the
  lead-in in `legDriveStep`; `legDrive?: 'on' | 'turn'`.
- `src/game/PhysicalMode.ts`, `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`: `?legDrive=turn` through
  the config.
- `src/physics/legDrive.test.ts`, `src/game/PhysicalMode.test.ts`: the six new tests and the switch case.
- `../../water-physics/consult-log.md`, `../../water-physics/sources.md`: the cross-section consult and its six sources.

## 9. For the owner, in plain words

**Two things you felt have been found and one of them is fixed.**

You said the compressed turn got slower and barely turns, and that it felt stuck. The first half of that was a real bug
and it is out. Last round's change had the surfer refuse to lean further than the turn he already had would carry — a
sensible-sounding rule that turned into a stutter: he asked for a lean, got a bit of turn, allowed himself a bit more
lean, and so on, wobbling about one and a half times a second and never getting past two thirds of the lean your stick
was asking for. That is gone. He now leans as far as you ask again. **It is honest to say that this does not make him
good** — he still falls more than the old surfer on the same wave — but the specific thing you felt is no longer there.

The second half, the stuck feeling, is the deeper one, and this round tested the planned cure and **it did not work.**
The old surfer — the one you like — cheats: when you compress into a turn, the game simply shoves his body into the turn
with a force that nothing pushes back against. Real surfers make that force by shoving their feet out against the board.
So I built that: the legs push the body in, and the board gets pushed the other way, exactly as it would in life. The
result is clear and a bit disappointing. With a gentle stick he actually rides *longer* than the cheating version and
comes almost all the way round. With a full stick he is on his back in two thirds of a second, every time — his own legs
shove the board out from under him before the board's rail has bitten into the water hard enough to hold him. I then
tried making the honest push exactly as weak as the cheat, so the only difference left was the board getting pushed
back, and it still failed the same way. **So the old surfer's turn depends on that force being free. There is no setting
that makes it honest.**

What that points at is the board, not the surfer: the push has to be bought from the water by the rail digging in, and
our board's rail cannot dig in — which is what last round measured and what you approved shaping. I did not get to the
shaping this round. I did get a specialist's full design for it, and one warning worth passing on: **the shaped edge on
its own will probably change nothing you can feel.** The reason the rail does not hold is that our board can only ever
*push* on the water, never *grip* it — there is no suck on the buried edge at all in the model. Shaping the edge without
adding that grip would be a nicely shaped edge that behaves exactly like today's. So the next round should do both
together, or neither.

One smaller thing you may want to know, because it quietly undermines a number this thread has repeated for weeks: we
have been saying your waves give the surfer a 16° face. That is the steepest point of the face, halfway up it. During
the turn your surfer actually does, the water under his board is sloped **about two degrees**. Even on the new steep
wave, with a 31° face, the water under the board during the turn is two to three degrees. He is turning in the flat
bottom of the wave, not on its wall. Whatever we fix next, that is worth fixing too.

# Part 19 — the hull given a real rail, and the premise it refutes

Written 2026-11-14 by the build agent (Opus 5, effort xhigh) on branch `claude/rider-new-32u`, cut from `origin/main`
at **691cac46** (step 3.2t's merge), so Part 18 above is its base.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

**The brief's premise is wrong, and this is the paragraph it asked me to say so in.** The brief, and 3.2t's own
conclusion, was: *"the sideways force the system is missing cannot come from inside the rider. It must come from the
water, through the rail."* Measured at a fixed pose, fixed immersion and the same foils, **the flat board the game has
already makes 221–840 N of force toward the buried rail at 20–60° of roll, against the 141 N `COMPRESS_PULL` fakes —
and the shaped rail makes LESS of it at every one of the twenty cells, by 0.4 to 20 %** [M, 120 bench cells]. The system was never short of
sideways force. So the round's one question — *can a shaped hull with suction on the buried rail supply the sideways
force the cheat fakes?* — has a cleaner answer than "no, not enough": **the hull does not need to supply it, and the
old rider's compressed turn still scores 0 of 6 with the cheat deleted on every hull I built.**

## 1. The four sentences the round is for

1. **The section and the suction are built, opt-in as `?hull=rail` (and `?railSuction=off`, `?compressPull=off`), and
   the build is sound.** The advisor's own build check — `max |normal.x|` over the wetted patches, **identically 0** on
   the flat board because `BoardShape.ts` gives every patch `normal: { x: 0, … }` — reads **0.913–1.000** at the bench
   and **0.93–0.97** through the ride
   [M]. Part 17's identity breaks exactly where the advisor first predicted it would: `pressure.y / |pressure|` leaves
   cos(roll) by **+0.034 at 40° and +0.043 at 50°** (and +0.064 at 60°, +0.113 at 70°) against its prediction of
   +0.02–0.06 at 40–60°, where Part 17 measured the identity holding to 0.008–0.077 in all eighteen bins [M].
2. **The suction is real, correct in direction, and worth nothing in this ride, for a reason that is geometry and not a
   coefficient.** With the flow along the rail, `v_rel · n` is the same on every facet of a station whatever its turn
   angle — turning a normal about the axis the flow runs along does not change `v·n` — so **no facet is leeward and the
   band makes no suction at all by construction**. It is driven entirely by the board's sideways slip. The slip the ride
   measures is **0.8–3.3° median**; the slip the law needs for the advisor's 2–3 kPa is **15–18°**. Median suction
   through the ride: **0.0 N**. Peak in any frame: **6.5–8.3 N** [M].
3. **The win condition is not met, and not nearly.** Old rider, compressed, the owner's acceptance test, 6 runs a cell:
   the cheat's own score is **6 of 6, rail 10.0° median, path rate 33.9 °/s, 6.00 s up** (Part 18's row, reproduced to
   the first decimal). With `COMPRESS_PULL` deleted: flat **0 of 6**, the section **0 of 6**, the section with its
   suction **0 of 6** [M].
4. **But the section is not inert, and what it does is the round's real finding.** With the cheat deleted it takes the
   compressed turn's **body lean from 0.60° to 31.1°** and the system's lateral load factor toward the buried rail from
   **0.005 g to 0.418 g** — more than twice the 0.19 g the cheat fakes — and he still scores 0 of 6, reaching 49–79° of
   the 85° the gate asks for. At full stick the turn ends in a **spin-out**: drift 18–24°, path rate peaks 307–426 °/s,
   the rail ventilated 32–39 %, down at 2.2–3.5 s [M]. **So the owner's bar on feel is met and the gate is not**, and
   what is missing is no longer a force.

## 2. What was built

**The section** (`BoardShape.ts`, `RAIL_BAND`). A flat bottom out to the band's start, then a circular band tangent to
it, **four facets a rail spaced by equal turn angle** — the advisor's requirement, because four patches across the whole
beam cannot see a 12 mm band at all. 48 patches become **144**. The band takes the **outer** part of each station's own
half-beam, so:

| | flat (today) | the section |
|---|---|---|
| patches | 48 | **144** (96 of them band facets) |
| planform area | 0.620623 m² | **0.620623 m²**, and every station beam identical to 12 decimal places [M] |
| maximum width | 0.464 m | **0.464 m** |
| volume | 25.750 L | **25.750 L** (closes to 0.002 %) |
| `max \|normal.x\|` | **0.000** | **0.981** (patch) / 0.93–0.97 (wetted, in the ride) |
| taper a | 0.924649, on u² | **0.567984, on |u|** |
| rail thickness at u = 1, mid | **5.0 mm** | **28.8 mm** |
| band radius | — | **6.7 mm at the tail → 12.6 mm mid → 11.1 mm in the nose third**; apex 0.9 → 12.6 mm; sweep 30° → 90° |
| roll inertia (board alone) | 0.0262 kg·m² | 0.0283 |
| centre of mass | y 0.038756, z −0.056038 | y 0.037603, z −0.057400 |

All [M]. **The band forced one change the advisor did not foresee and it is the interesting part of the geometry.** Its
section asked for a 12/18/25 mm radius. A band of radius R turns the bottom over to an apex R above it, so a coherent
section needs the local rail at least 2R thick — and today's thickness across the beam, `t(1 − a u²)` with a solved at
**0.925** to hold 25.75 L, leaves the rail **5 mm**. That is the same number Part 17 §3 item 2 measured from the other
end (the buried rail's deck edge sitting 1–3 mm above its bottom edge: *"the board has no rail band"*). 18 mm of radius
in a 5 mm rail puts the bottom through the deck.

The exponent is nobody's measurement. With the taper **linear** across the beam the **same section-area coefficient**
gives a = 0.568 and a **29 mm rail**, which carries a 12.6 mm band. Same volume, same maximum thickness, same beam, same
planform, same coefficient (0.711 on this 4-across grid, identical for both hulls [M]; 0.692 is the continuum
parabola's own value, which is the figure the advisor quoted). So `'rail'` is **a linear taper plus the band**, and
`RAIL_BAND.power` is the one number in the section that is a modelling choice rather than a measurement [I].

**The advisor's three code traps, each handled and each verified by me** [R]:
`hullForces.ts:182` derived the deck along the patch normal, which collapses for a near-horizontal band facet — band
facets now carry the **station's own up** and the flat path is untouched (for a flat patch, `up` is `−normal` exactly).
`BoardBody.ts:486` reads each station's beam as Σ area/length — `area` stays the **planform** and a new `faceArea`
carries the facet's true area for the pressure, the friction and the suction, so the beam, `addedMassPerArea`,
`radiationPerArea` and `planingScales` do not move (the table above is the check). `BoardBody.ts:545` feeds
`shape.taper` to `buildFoils` — and the **rail side-face foils go with the band**, because they were a bluff stand-in
for exactly the surface the band now carries and keeping both would count the rail twice; so `shape.taper` no longer
reaches anything that can move, and the fins never used it. A fourth trap the advisor found while this ran:
`hullForces.ts:220`'s `face = normalSpeed > 0 ? bottom : deck` already applies a force along **+n** on a leeward facet,
so on a band facet the suction **replaces** that deck pressure rather than adding to it.

**The suction** (`hullForces.ts`, `RAIL_SUCTION`). On the band's leeward facets only, a base pressure
`C_S · ½ρ u_c²` along +n, with `u_c` the **cross-plane** speed (the part of the flow that has to turn around the band),
`C_S = 1.15` — Hoerner's bluff-body C_D90, which is already in the file as `SUBMERGED.normalDrag = 1.18` [S] — capped
at **2.5 ρ g h**, Breslin & Skalak's own faired ventilation boundary `C_s F_h² = 5` re-read as a loading, which is for
once a datum that **brackets** our rail depth (their 0.032–0.152 m against our 0.17–0.26 m) instead of being
extrapolated to [S]. Cut off at 0.35 V of cross-plane speed and 0.35 m of depth; the pressure↔suction switch blended
over 0.2 m/s of `v·n`. No cavitation clamp: σ = 3.0–3.2 against a demanded |C_p| of 0.07–0.15, twenty times away [S].

**The ventilation latch** (`BoardBody.ts`, `RAIL_LATCH`, `placeBand`). Per station and per rail: the gate opens over
15–20° of **wetted leeward arc** (a hard 30° tucked edge never reaches it, which is why this section's tail third makes
no suction and the round forward rail does); the rail ventilates when the suction the flow asks for passes Breslin's
line **with** the arc past 24° of inception, an air path (this rail buried and the other rail's band out of the water)
and Taylor's condition `u > √(g c)`; it re-wets when the asked pressure falls back under; both through a first-order lag
of 0.15 s, one convective time, because the suction's roll moment increases the roll and an instant switch rings at four
substeps [S, Aguiar Ferreira et al. 2026 measure 3.5 c/u to establish a cavity, 0.47–0.65 s at our lengths].

## 3. The bench: the sideways force, at a frame that can be stated

Still water, no flow, V 7.5 m/s, τ 6° nose up, rolled by φ about the board's own long axis (which buries the −x rail),
immersed so the hull's deepest point sits at **Part 17 §3's own measured buried-rail depth for that roll bin**, drift =
the path's angle off the nose **toward the high rail** (the way a carving board slips, outward). No rider. One substep.
φ is unsigned roll from horizontal; "inward" is the world horizontal component **toward the buried rail**. `railbench.ts`.

**Drift 3°, which is the ride's own** [M]:

| roll | flat, inward (N) | **section, inward (N)** | flat `p.y/\|p\|` vs cos φ | section `p.y/\|p\|` (departure) | band's share of the hull's vertical | suction (N) |
|---|---|---|---|---|---|---|
| 10° | 135.5 | **123.5** | 0.974 / 0.985 | 0.976 (−0.009) | 6.2 % | 0.7 |
| 20° | 269.4 | **237.8** | 0.922 / 0.940 | 0.935 (−0.005) | 7.7 % | **0.0** |
| 30° | 321.6 | **283.0** | 0.852 / 0.866 | 0.877 (**+0.011**) | 9.1 % | **0.0** |
| 40° | **328.2** | **273.0** | 0.753 / 0.766 | 0.800 (**+0.034**) | 13.3 % | **0.0** |
| 50° | **346.3** | **319.6** | 0.628 / 0.643 | 0.686 (**+0.043**) | 16.9 % | **0.0** |
| 60° | 318.1 | 293.9 | 0.487 / 0.500 | 0.564 (**+0.064**) | 24.5 % | 0.0 |
| 70° | 244.9 | 195.2 | 0.330 / 0.342 | 0.455 (**+0.113**) | 45.1 % | 0.0 |
| 80° | 121.0 | 76.3 | 0.163 / 0.174 | 0.445 (**+0.271**) | 87.5 % | 0.0 |

Five things in it:

1. **The premise, refuted.** `COMPRESS_PULL` is 141 N. The **flat** hull's pressure already points 221–346 N inward at
   every roll from 20° to 60° at the ride's own 3° of drift, and 563–840 N at 20° of drift. There is no sideways-force shortage to fix.
2. **And the section makes it worse, not better, which is the advisor's own prediction landing:** *"lateral force falls
   1–8 %: a round rail does not add bite."* Measured, it falls at **every one of the twenty cells**, by **0.4 to 20 %** (ratio 0.798–0.996), because the band's planform is
   turned away from horizontal and the force it makes points further from the horizontal with it.
3. **The vertical is where the section pays, and it pays what the advisor said it would.** `pressureUp` in system
   weights, flat → section: 40° 0.533 → 0.517, 50° 0.397 → **0.430**, 60° 0.253 → **0.288**, 70° 0.126 → **0.148**,
   80° 0.034 → **0.066**, 90° −0.002 → **0.038**. That is ×0.97–1.09 at 40–50° (its ×1.05–1.09) and ×1.2–1.9 past 70°
   (its ×1.44–1.75 at 80–90°). **Its own summary of that was the right one: "if you ship the section alone, I expect
   the ride to measure the same."**
4. **Part 17's identity breaks, by the margin the advisor first predicted and then withdrew.** It replaced +0.02–0.06
   with +0.005–0.02 on the reasoning that the leeward band would carry no pressure; with the ride's drift there is no
   leeward band, so the whole band carries pressure and the first prediction was right. Its own note on that, in its
   words: *"I revised a correct prediction using a flow condition I had not checked against the ride."* Its original
   **9–14 %** band share was also the better of its two: measured 13.3 % at 40° and 16.9 % at 50°, against its revised
   3–10 %.
5. **At 3° of drift the suction is 0.0 N at every roll from 20° to 80°.** Not small — zero, because no facet is leeward.

**The drift sweep, which is the suction's whole story** [M, 40–50° of roll]:

| drift | suction (N) | its downward part | its inward part | Δp (Pa) | the cap 2.5ρgh (Pa) | at the cap |
|---|---|---|---|---|---|---|
| 0° | 0.1–0.7 | 0.1–0.3 | −0.1 to −0.6 | 257–308 | 257–787 | 27–100 % |
| **3°** (the ride's) | **0.0** | **0.0** | **0.0** | 0 | 0 | — |
| 10° | 0.0–2.4 | 1.9 | 1.4 | 1 374 | 4 749 | 0 |
| 20° | **16.9–18.0** | **14.7–14.9** | **8.0–10.3** | 3 714–4 061 | 4 142–5 825 | 0–29 % |

So at 20° of drift the suction reaches 18 N, of which **14.7 N is downward and 10.3 N inward** — the advisor's revised
prediction of 16–90 N, at its bottom end, and its direction (90 % down, 37 % inward) close to right. **Its own
refutation test 1 — "the suction's median downward component at 40–50° of roll is below 20 N" — is met**, and met with
room: 0.0 N through the ride.

## 4. The ride: the gate, old rider against old rider, on the owner's own yardstick

The owner's acceptance test, the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s — the wave the surfer
track has always probed against), old rider, 6 runs a stance-cell (3 entry speeds × 2 stick positions). `libturn.ts`
part F. **Compressed, which is the yardstick:**

| hull | `COMPRESS_PULL` | **gate: across** | body bank | board rail | rail peak | path rate | lateral g | up, mean | reached |
|---|---|---|---|---|---|---|---|---|---|
| flat (today) | **on** | **6 of 6** | 12.5° | 10.0° | 42.6° | 33.9 °/s | **0.167** | **6.00 s** | 101–137° |
| flat | **off** | **0 of 6** | 0.6° | 0.6° | 30.0° | 3.0 °/s | 0.005 | 5.59 s | 50–59° |
| flat, **12 across** | off | **0 of 6** | 1.0° | 0.9° | 38.3° | 3.5 °/s | 0.006 | 5.82 s | 50–58° |
| **section**, no suction | on | 4 of 6 | 33.8° | 31.5° | 56.6° | 42.0 °/s | 0.460 | 5.77 s | 48–142° |
| **section + suction** | on | 5 of 6 | 33.8° | 31.3° | 56.0° | 41.9 °/s | 0.459 | 6.69 s | 48–140° |
| **section**, no suction | **off** | **0 of 6** | 31.1° | 26.5° | 57.4° | 28.2 °/s | **0.416** | 4.73 s | 49–78° |
| **section + suction** | **off** | **0 of 6** | 31.1° | 26.5° | 57.4° | 28.1 °/s | **0.418** | 4.71 s | 49–79° |

**Tall, the control** (Compress's gate never opens tall, so the cheat never fires there and the `off` rows are the `on`
rows exactly) [M]: flat **6 of 6**, bank 33.9°, rail 32.9°, lateral 0.601 g, 3.87 s up; the section **3 of 6**, bank 33.5°, rail 35.5°,
lateral 0.540 g, 3.45–3.46 s up.

The water under the board, every cell, as the brief requires: **slope 0.0–1.6° median, 12.3–13.0° at most, 0.0 % of
frames over 30°** — unchanged from 3.2t, and the same answer. Every fall in all 84 runs is `balance` or `lost board`;
none is a bed strike or a lip.

Read it in six lines:

1. **The win condition fails on every hull.** 0 of 6 with the cheat off, with the section, with the suction, and with
   both. The brief asked me to say this plainly and early and §1 does.
2. **The ablation is reproduced for the first time.** 3.2t quoted the balance-redesign notes' 6-of-6 → 0-of-6 without
   running it; here it is, 0 of 6, body bank 0.60°, path rate 3.0 °/s. Without the cheat the old rider **does not lean
   at all**, so he does not turn.
3. **The section restores the lean — and that is the whole of the lateral force.** Bank 0.60° → 31.1°; and the lateral
   load factor is just tan(bank): tan 31.1° = 0.604 against 0.418 measured at the board's 26.5° of roll (tan 26.5° =
   0.499), where tan 0.6° = 0.010 against 0.005 measured. **It is Part 16's identity again, not a new force.** So the
   section's effect is to make the rider lean, and the water then supplies 0.42 g — more than twice the cheat's 0.19 g
   — off the rolled hull, exactly as the bench says it would.
4. **More than twice the force and still 0 of 6.** He reaches 49–79° of the 85° the gate asks, against 101–142° with
   the cheat. So the shortage is not the lateral force: with 2.5× the cheat's lateral g the turn still stops at 60–90 %
   of the way round. **Whatever stops it is in the roll path and the rider's balance, not in the hull law.**
5. **The suction's only visible effect in the whole ride is the spin-out, and it is a good one.** The section with the
   suction and the section without differ by 0.002 g of lateral and 0 of 6 against 0 of 6 — the advisor's refutation
   test 2, met. What differs is the end of the turn: at full stick, drift peaks **18.1–23.9°**, the rail ventilates
   **32–39 %**, the path rate peaks **307–426 °/s** and he is down at **2.18–2.40 s**. That is a rail letting go, with a
   measured cause, which is the second half of the owner's bar. Its refutation test 5 ("roll rate up and time up below
   3 s") is met too — so the mechanism is real and it ends the turn **earlier**, not later.
6. **It costs rides on the path the owner would ride, so it should not be default.** With the cheat on, compressed goes
   6 of 6 → 4 of 6 (section) and → 5 of 6 (section + suction); tall goes 6 of 6 → 3 of 6; mean time up tall 3.87 →
   3.45 s. The advisor's own caveat binds here and I am taking it: **six runs a cell makes 6-of-6 against 0-of-6 solid
   and 6-of-6 against 4-of-6 not a difference**, so the honest statement is that the section is at best neutral and at
   worst a cost with the cheat in place, and nobody should rank hulls on these rows.

## 5. Why the section makes him lean — the one thing I measured and could not attribute

This is the round's loose end and I am naming it rather than guessing at it. Three candidates were on the table; **the
advisor's own leading one is refuted by its own named test.**

- **Patch resolution: refuted.** Its hypothesis was `WET_RAMP` keyed on the patch *centre*: with 4 across, the
  outermost high-side centre sits 0.176 m out and dries by about 1.6° of roll, switching a quarter of the station's
  lift off at a long lever inside three degrees — a wall at the toe that pins the flat board at 0.55°. Its test was the
  **flat** board at the section's own across-count, which `buildBoardShape` has always taken as a parameter. Ridden with
  the cheat off, 12 across gives **bank 0.95°, rail 0.90°, path rate 3.5 °/s, lateral 0.006 g, 0 of 6** — against 4 across's 0.60°,
  0.55°, 3.0 °/s, 0.005 g and 0 of 6, and 6 of 6 either way with the cheat on
  [M, 6 runs]. **It is not resolution.**
- **The hull's own roll stiffness: not it either.** Swept 0→30° in 1° steps at a fixed 0.055 m immersion, τ 6°, drift
  3°, the water's net roll torque on the riderless board is **smooth on both hulls with no step anywhere** and crosses
  zero at 21–22° for both: the flat board 0.12 → 0.27 → 0.08 N·m over 0/15/20° with its sign change at **22°**, the section 0.14 → 0.27 → 0.02 with
  its sign change at **21°**, the flat board at 12 across 0.12 → 0.20 → −0.01 at **20°**; the biggest one-degree step
  anywhere in any of the three sweeps is 0.29 N·m and it is at 26–30°, not at the toe [M, 93 cells]. The predicted
  cliff is not there. Past 40° the section's **righting** is the stronger of the two (at 3° of drift: −21.0 / −29.9 /
  −54.7 rad/s² at 40 / 50 / 60° against the flat board's −17.3 / −22.6 / −30.8), so the section is if anything *harder*
  to hold over, not easier. **The caveat that keeps this from being conclusive: the bench carries no rider**, and in the
  ride the roll is driven through a 73 kg rider's contact, so this measures the hull's own spring and not the system's.
- **The band's normals do make a seed the flat bottom cannot have, and that part is measured.** At **zero roll**, where
  the two hulls are otherwise the same board, the flat hull's pressure makes **exactly 0.0 N** of lateral force at
  **every** drift — it cannot make any, because every one of its normals has `x = 0` — while the section makes
  **10.3 N at 3° of drift, 27.0 N at 10° and 41.2 N at 20°**, toward the rail the board is slipping away from, with a
  roll moment **0.02 to 0.12 N·m** above the flat board's in the direction of going over onto it [M]. So the section
  gives a small drift something to bite, from flat, which the flat sheet is structurally incapable of. **What I have not
  measured is that this seed is what grows to 31° of lean** through the rider's balance loop; the seed's existence is a
  measurement and the growth is [I].
- **What is left**, unseparated: the thickness redistribution (taper 0.925 → 0.568, which moves buoyancy and roll
  inertia outboard, 0.0262 → 0.0283 kg·m²; the advisor puts its buoyancy-lever channel at about 1 N·m), the dropped
  rail side faces (the bench puts them at −11 to −16 N inward and ≤ 3.8 N·m of roll), and the band's own normals, which
  are the only thing in the model that can make a **rolling** moment from a small drift at zero roll, because every
  other patch normal has `x = 0`. I think the third is the mechanism, for the reason in the bullet above, and the step from its seed to 31° is [I]. Two flags would
  settle it and neither needs a fourth hull: the squared taper on the same patch layout, and the side-face foils
  re-enabled. What I can say without them is that the advisor's own arithmetic bounds the first two well under what
  would be needed — about 1 N·m for the buoyancy lever and ≤ 3.8 N·m for the side faces, against a board that goes from
  0.55° of roll to 26.5° — and that my roll-torque sweep puts the two hulls' own springs within 0.07 N·m of each other
  over the first fifteen degrees. Both flags are an hour's work and I did not spend the round's last hour guessing
  instead.

## 6. Should the acceptance test start the rider on the face? — the one sentence the brief asked for

**Yes, it should gain a cell on the face and keep the trough cell as the one with history**: every run in this round
reads **0.0–1.6° of slope under the board with 0.0 % of frames over 30°**, so the test as it stands cannot see anything
a steep face does — but 3.2t already measured that the one cell that *is* on 35° water scores 1 of 12 and drops the
rider, so moving the test onto the face would replace a yardstick that discriminates the two riders with one that fails
both, and the right change is to add the face cell beside it, not to move it.

## 7. Seatbelts

- **The deletions column, checked before the push, as the brief requires.** `git diff --stat origin/main HEAD`:
  **37 files, 3 594 insertions, 61 deletions, and every one of the 61 is a line of mine that another line of mine
  replaced** (28 in `boardShape.ts`, 18 in `BoardBody.ts`, 9 in `hullForces.ts` and 5 single-line replacements) [M].
  **And the check earned its place twice in one round.** Branched at 691cac46. The first run showed **15 deletions**
  across `c2-step5b-runs/setup.txt` and `setup-120s.txt` — the wave track had pushed **ebd79d76** while this ran, and my
  branch would have reverted it by being behind. Rebased. The second run, three hours later while the Canyon bench
  crawled, showed **1 676 deletions** across `c2-step5g.md`, **`src/wave/SprayCloud.ts` (244)**,
  `SprayCloud.test.ts` (130) and eleven `c2-step5g-*` files — step 5g, merged in the meantime. Rebased onto
  **47ac8719** (one conflict, `src/main.ts`'s switch list, resolved as the union of its `lipVeil` and my three), and the
  column is 61 and all mine. `git merge-base --is-ancestor` would not have caught either one, and neither would reading
  the insertions.
- `npx tsc --noEmit -p .`: **exit 0**, on its own line, in a worktree whose `node_modules` is linked to the main
  checkout's. **And the check is proved able to fail**: with one line of `const x: number = 'not a number'` injected
  into `hullForces.ts` it exits **2** [M]. `npx tsc -p server/tsconfig.json --noEmit`: **exit 0**.
- The files that cover the rider and the board, run alone — `AttachedRider`, `AttachedRider.deepCrouch`,
  `predictiveBalance`, `standingBody`, `humanBalance`, `BoardBody`, `boardShape`, `hullForces`, `railSection`,
  `legDrive`, `snapCross`, `legPower`, `compressTurn`, `cutback`, `leanOut`, `carveFlex`, `RideSession`, `duckTwoBody`,
  `deckHollow`, `finForces`, `BoardRecovery`, `duckDive` (`src/physics/`) and `PhysicalMode` (**`src/game/`**):
  plus `SprayCloud` (`src/wave/`, step 5g's, so the rebase is covered too):
  **24 files passed, 468 passed, 13 expected fail, 0 failures**, exit 0, and
  `grep -E "Error:|AssertionError"` over the log is **empty** [M]. `results/suite-rider-32u.txt`.
- **One red test earned its keep and it is worth recording why.** The first run of that suite failed `duckTwoBody`'s
  3 s dive — and it was right to. Writing the taper's solve to take either exponent had changed
  `area * stringer * u * u` into `area * stringer * (|u| ** power)`, which is the same number in arithmetic and **not
  the same double**, so the flat board's taper drifted in its last bits and a chaotic dive flipped a boolean. The flat
  path now takes the old expressions verbatim (`BoardShape.ts`'s `squared` branch) and the test is green. Nothing else
  in the round moved by more than its last bits, but it is exactly the kind of drift that would have shown up later as
  a Canyon hash nobody could explain.
- **Eleven new tests** (`src/physics/railSection.test.ts`): the flat board unchanged, with its 48 patches, its 0.925
  taper and `max |normal.x|` **exactly 0**; the planform, every station beam, the width and the volume held; the band's
  four facets a rail at equal turn angle, every normal a unit vector pointing down or outward and never up, every true
  area at least its planform, and the deck direction the station's own; the rail thick enough for the band that turns it
  over, with the same section-area coefficient as the flat board; the suction acting **only along +n**, only on a
  leeward facet, nothing without a band, a gate or water; **never above 2.5 ρ g h**, and its cap not growing past
  `depthCap`; nothing at all when the flow runs along the rail; and the board reporting the band's ledger with nothing
  on the flat board. Plus `?hull=rail`, `?railSuction=off` and `?compressPull=off` in `PhysicalMode.test.ts`'s switch
  case, and `compressPull: 'off'` removing the assist while leaving CARVE_CARRY alone.
- **No unpaired force is added, and nothing was added from inside the rider at all.** Every force this round adds is
  the water's on the hull — external by construction, appearing in the board's own `forces.suction` and `work.suction`
  ledgers and in the per-patch reaction the water takes back (`addReaction`). The one force it *removes*
  (`COMPRESS_PULL`, behind `?compressPull=off`) is the unpaired one.
- **The default flat board is main's own, every double.** Beyond the Canyon hash: both checkouts' `buildBoardShape()`
  printed as raw IEEE bit patterns — the taper, the volume, the planform, the width, the centre of mass, all nine
  inertia terms and all ten fields of all 48 patches — **diff clean** [M]. That is the check that would have found the
  drift in the paragraph above in one second instead of one red test, and it is the one I would run first next time.
- **The Canyon bench, shown rather than claimed**: `results/canyon-bytes-32u.txt`, the same command and the same
  reference as step 5f's and 3.2t's, Canyon B and the default Canyon, 3600 steps each from fresh spin-ups.
  **All four hashes are byte for byte step 5f's and 3.2t's** [M]: Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`,
  default Canyon `ea3d57a4d49f4b48` / `a1a2555739210f96`. Every change this round is opt-in (`?hull=rail`,
  `?railSuction=off`, `?compressPull=off`), so that is the expected result and not a surprise. The per-step times are
  *slower* than 3.2t's (18.17/28.16 ms against 11.79/13.03 for Canyon B) because a wave-track agent held two cores at
  about 92 % throughout — the run took three hours of wall clock for eighteen minutes of CPU. **The hashes are the
  claim; the milliseconds are not.** One honest caveat on the chain: those hashes were measured on this branch **before**
  the rebase onto step 5g, and I did not spend another three hours re-running them afterwards. The chain holds because
  **5g's own leg A — the default Canyon on its merged code — reports `ea3d57a4d49f4b48` / `a1a2555739210f96` too**
  (`c2-step5g-runs/canyon-bytes.txt`), so 5g did not move the default path either [M, its measurement, not mine]. The
  rebase's one code conflict was a switch list in `src/main.ts`, and `tsc` and the 24-file suite were both re-run on the
  rebased tree. **What making it default would cost is in §4 line 6 and it is not nothing**, which is why it is not default.
- A wave-track agent shared the machine throughout; nothing of theirs was stopped, and its two uncommitted files in the
  main checkout were left alone (this round ran in a worktree).

## 8. What I am unsure of

- **§5 is half open and it is the most interesting number in the round.** Measured: the section makes the rider lean
  31° where he leant 0.6°; the lateral force is tan(lean) and not a new force; it is not the patch count; and the band's
  normals make a lateral force and a roll moment at **zero** roll that the flat sheet is structurally incapable of.
  **Not measured: that the second of those causes the first.** The chain from a 0.02–0.12 N·m seed to 31° of body lean
  runs through the rider's balance loop and I did not trace it, so anyone reading §4 line 3 as "the band's normals buy
  the turn" is reading my inference for that step.
- **Six runs a cell.** 6-of-6 against 0-of-6 is solid; 6-of-6 against 4-of-6 is not a difference, and §4 line 6 says so
  rather than ranking the hulls on it.
- **The band's millimetres are all [I] and now so is the taper's exponent.** The advisor found no measured shortboard
  cross-section in the open literature and said its own ten-minute replacement for the whole section is a straightedge
  and a ruler on the owner's own board. The linear taper is mine, chosen because the squared one cannot hold a rail at
  the measured volume; I did not measure a real board's thickness across the beam either.
- **The cross-plane speed in the model is the free stream's, and a real rolled planing hull also has a chine
  squeeze-out** running down the dead rise toward the deepest chine (TN 4187's "high-velocity flow across the keel",
  which that report *conjectures* and does not measure). The advisor flagged this as the one free parameter that could
  be several times larger. If it is, the suction's numbers here are low — but the ride's drift being 0.8–3.3° is a
  measurement, not an assumption, and the geometry argument in §1 line 2 does not depend on the magnitude.
- **The bench has no rider on the board.** Its forces are the water's on a free hull at a placed pose; the ride's roll
  is driven through a 73 kg contact. That is why §5's roll-torque sweep cannot close §5.
- **`?hull=rail` has never been ridden by a person.** Everything here is a probe. The section is a visible change to
  every board in the game and the owner approved the work, not this geometry.
- **The 20° drift row is a bench cell, not a ride.** The ride reaches 18–24° of drift only in the full-stick spin-out
  frames, which are the frames the rider is already losing.

## 9. Files (3.2u)

- `src/physics/BoardShape.ts`: `BoardSection`, `RAIL_BAND`, `HullPatch.band`, `BoardShape.section`; the band built at
  equal turn angle inside the station's own half-beam, and the taper solved for either exponent in one line.
- `src/physics/hullForces.ts`: `RAIL_SUCTION`; `WorldPatch.band` (`faceArea`, `up`, `tangent`, `gate`);
  `PatchForce.suction` and its pressure/cap columns; the band's true area on the pressure and the friction; the
  station's own up for the deck point; the leeward blend, and the suction replacing the leeward deck pressure.
- `src/physics/BoardBody.ts`: `BoardBodyOptions.hull` and `.railSuction`; `RAIL_LATCH` and `placeBand`; the suction in
  the solve's right-hand side, in `forces.suction`, `work.suction` and `yaw.suction`, and in the per-patch reaction;
  `bandLedger` for the probes; the rail side-face foils dropped with the section.
- `src/physics/AttachedRider.ts`: `AttachedRiderOptions.compressPull`, and the one gate that deletes `COMPRESS_PULL`.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`, `src/game/PhysicalMode.ts`
  (`hullSwitch`), `src/main.ts`: `?hull=rail`, `?railSuction=off`, `?compressPull=off` through the config.
- `src/physics/railSection.test.ts` (new), `src/game/PhysicalMode.test.ts`: the eleven tests and the switch case.
- `docs/research/new-rider/3.2/railbench.ts` (new): the hull's force at a stated roll, trim, speed, drift and immersion,
  with no rider and no wave — the advisor's score card, the build check and the drift sweep. Its header carries the
  commands.
- `docs/research/new-rider/3.2/libturn.ts`: `HULL`, `RAIL_SUCTION`, `PULL` and `ACROSS_N`, and the band's columns every
  frame — the drift, the suction and its direction, the band's share, `max |normal.x|`, the ventilated share, and the
  lateral load factor toward the buried rail.
- Results: `results/suite-rider-32u.txt`, `results/canyon-bytes-32u.txt`, and under `results/32u/` the six-cell grid,
  the 12-across control, the bench and the roll-torque sweep.
- `docs/research/water-physics/consult-log.md`: this round's two consults, with the advisor's own corrections.

## 10. For the owner, in plain words

**You approved shaping the board's rail, and it is shaped. The short answer is that it did not buy back the turn you
like, and along the way it showed that the thing we thought was missing was never missing.**

What I built is a real cross-section for the first time: until today the board in the game was a flat sheet with a 5 mm
edge, and every square inch of its bottom pointed the same way. It now has a proper rail — a 7–13 mm roll from the
bottom round to the edge, and an edge **29 mm thick instead of 5**, which it had to be, because you cannot put a 13 mm
curve on a 5 mm edge. It has the suck on the buried rail you were told it lacked, and it lets go — ventilates — when
the rail is loaded past what water at that depth can hold, which is the thing you asked for: *at full rail the board is
set in the water, and the turn ends with a spin-out instead of just running out.*

**Three findings, and the first one is the one that matters.**

**One. The board was never short of sideways push.** We have been saying for weeks that the surfer falls because the
water cannot push him sideways hard enough. Measured properly — same board position, same depth, same fins — the flat
board already pushes **244 to 840 newtons** toward the inside of the turn, where the cheat we are trying to replace
supplies **141**. More than twice over. And shaping the rail makes that push slightly *smaller*, not bigger, because a
rounded rail points its force further sideways. So the specialist's warning was right in the end but for a different
reason than it thought: the grip was never the shortage.

**Two. The suck on the rail is real and worth nothing, for a reason that will not change with tuning.** Water only
sucks on a rail if it has to wrap *around* it — which means the board has to be sliding sideways. The law needs about
15–18 degrees of sideways slide. Your surfer's board slides about **1 to 3 degrees** through a bottom turn. So for
nearly every frame of nearly every turn, there is nothing for the rail to grip with. The one place it does fire is
exactly where it should: at full stick the board breaks loose, slides 18–24 degrees, spins at 300–400 degrees a second
and he is down in two seconds. **That is a spin-out, with a cause, and it is yours to keep.** It is just not a force.

**Three. The shaped rail does make him lean — a lot — and he still does not make it round.** With the cheat deleted the
old surfer on the flat board barely leans at all (half a degree) and barely turns. With the shaped rail he leans **31
degrees**, the board goes over onto its edge, and the water gives him **0.42 g** of turn — two and a half times what
the cheat was giving him. **And he still fails: he gets 49 to 79 degrees round where the cheat gets him 101 to 142.** So
the thing that is stopping the turn is not the water and not the board. It is somewhere in how the surfer's balance
handles being three-quarters of the way through a turn. That is where the next round should go, and it is a different
kind of problem from the one we have been chasing.

**What I am not asking you to ride yet.** The shaped board is behind a switch (`?hull=rail`) and it is **not** the
default, because with the cheat still in place it costs rides: the compressed turn goes from 6 out of 6 across the wave
to 4 or 5 out of 6, and standing tall from 6 out of 6 to 3. Those are small samples and I would not swear to them, but
they point the wrong way and the honest thing is to leave the default alone until we know why. If you want to feel the
spin-out, `?physical&canyonWaves=true&hull=rail` will give it to you.

**And one correction to something this thread told you.** You were told the board has no rail to bite with and that
giving it one is what the turn needs. The first half was true — 5 mm is not a rail. The second half is now measured and
it is false.

# Part 20 — the falls, named; and the missing turn, found

Written 2026-11-15 by the build agent (Opus 5, effort xhigh) on branch `claude/rider-new-32v`, cut from `origin/main`
at **30b2accb** (step 3.2u's merge), so Part 19 above is its base.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

**The round was re-aimed four times while it ran**, by the coordinator, on the owner's own ride and then on the owner's
own corrections of the coordinator. It began as *"where does the rest of the turn go?"*; the owner then rode
`?rider=new` and said *"the balance is not good enough. The surfer falls too much"*, which made the falls job 1 and the
turn job 2; then a design for a balance cycle arrived, and then most of it was withdrawn. **Nothing of the withdrawn
design was built.** What this round ships is the measurement both halves needed, one readout the owner can see, and one
bug fix in a measurement tool.

## 1. The five sentences the round is for

1. **The missing turn is two different bugs, three runs each, and neither is a force shortage.** Section, cheat
   deleted, the owner's acceptance test, 6 runs: **3 fall before the turn window closes** (2.18–3.52 s, heading still
   climbing) and **3 run the window out at 4.00 s still short** — and those three do not fall for another 1.3–3.8 s, so
   a fall is not what stopped them [M]. Part 19's "49–79° of 85°" is a median over those two failures mixed.
2. **For the runs the window stopped, the limit is time, and the proof is one flag.** Open the window from 4 s to 8 s
   and nothing else, and the gate goes **0 of 6 → 2 of 6**: the two half-stick runs that lean reach 85° at **5.43 s and
   5.83 s** and go on to 112° and 115°, against the cheat's 3.77–4.00 s [M]. The honest hull gets to the same place,
   **1.4–1.8 s later**. The three full-stick runs are unchanged by the window; they fall.
3. **Part 19 §5's open `[I]` is closed by elimination: both flags it named come back null.** The squared taper on the
   section's own layout (`RAIL_POWER=2`) and the rail side-face foils re-enabled (`RAIL_FACES=on`) each leave the lean,
   the roll and the reach where the section put them [M, 6 runs a cell]. With the patch count already refuted by its
   own named test, the band's own normals are what is left.
4. **Job 1a, answered with a population: the capture point's margin binds, and the weight leaves the feet *across* the
   board.** New rider, flat board, 30 runs (18 running the owner's own movement at three stick positions, 12 in trim
   with the stick at zero throughout; §3 states both populations exactly):
   **margin bound in 30 of 30, across in 30 of 30**, past the feet's edge by **0.1–0.8 m**, with the feet still holding
   **86–91 %** of their grip and the contact's own limit never once `'slip'` [M].
5. **Job 1b: the slide is not what precedes these falls, and there is no window to catch one in.** The board slid more
   than 8° before only 12 of the 18 turn falls and **0 of the 12 trim falls**, and where it slid at all it slid for
   **0.0–0.3 s** before he went [M]. **And the new rider falls 12 of 12 in trim with the stick never touched, on water
   the old rider rides without falling** — no move, no slide, the board tracking inside 3.2°, the body banking to
   **65.7°** where the stick asked for **1.1°** [M]. So a recovery from a slide would have had nothing to catch in the
   runs I can measure, and I did not build one.

## 2. Job 2 — the missing turn, told apart

The owner's acceptance test, the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s), old rider, Compress,
6 runs a cell (3 entry speeds × 2 stick positions). `turnpath.ts`. **Every number in this section is Compress only**;
Part 19's own tables are too, and the probes' printed summaries are **not** — `libturn.ts`'s `sweep` prints one line
over all twelve runs of both stances, which is a trap for anyone reading the `.txt` files rather than the `.jsonl`.

**First, the harness reproduces Part 19 exactly**, which is why any of the rest can be believed: flat with the cheat
**6 of 6, reached 100.8–136.6°** against Part 19's 101–137°; flat with it deleted **0 of 6, 49.8–59.4°** against its
50–59°; the section with it deleted **0 of 6, 48.7–78.2°** against its 49–78° [M].

**One line of the harness is worth stating because leaving it out moved every number.** `libturn.ts` steps the wave
under the rider (`water.advance`). This probe's first run did not, and on a standing wave the flat/cheat-on cell read
110–156° instead of 101–137° and the flat/cheat-off gate read **2 of 6** instead of 0 of 6. A wave that never catches
up never takes the face away. The numbers below are all with it in.

### The three bugs, separated

The movement centres the stick when the gate's metric reaches 85° **or** when `TURN_LIMIT` (4 s) runs out, whichever
comes first, and then holds for 5 s. So each run stops for exactly one of three reasons, and `acrossAt` says which:

| section, cheat deleted | stick | reached | why it stopped | fell at | rail | bank | lateral g |
|---|---|---|---|---|---|---|---|
| entry +0 | half | 72.5° | **window**, 4.00 s | 7.13 s | 20.4° | 21.0° | 0.287 |
| entry +1.5 | half | 49.4° | **window**, 4.00 s | 7.80 s | 18.4° | 21.2° | 0.248 |
| entry +3 | half | 48.7° | **window**, 4.00 s | 5.33 s | **0.1°** | **0.1°** | **0.001** |
| entry +0 | full | 78.2° | **fell**, 3.52 s | 3.52 s | 42.4° | 47.9° | 0.703 |
| entry +1.5 | full | 52.1° | **fell**, 2.40 s | 2.40 s | 36.9° | 42.7° | 0.579 |
| entry +3 | full | 51.1° | **fell**, 2.18 s | 2.18 s | 32.5° | 40.8° | 0.546 |

All [M]. Three things in it:

1. **At full stick the fall arrives first.** Down at 2.18–3.52 s, inside the 4 s window, with the heading still
   advancing. More window buys these nothing (§2's ladder below).
2. **At half stick the window closes first and the fall is not involved.** Those three are still up when the stick
   centres and stay up for another **1.3–3.8 s** afterwards. Calling their 48.7–72.5° a fall would be wrong.
3. **And one of the six never leans at all.** At the highest entry speed and half stick the section's bank is **0.1°**
   and its lateral **0.001 g** — the flat board's own numbers. So Part 19's "body lean 0.60° → 31.1°" and
   "0.005 g → 0.418 g" are **medians of a bimodal population**: five runs at 18–48° of rail and 0.25–0.70 g, and one at
   0.1° and 0.001 g. The medians are arithmetically right (I reproduced all four to the third decimal) and they are not
   a description of any run.

### The window ladder: the half-stick limit is time

`TURN_LIMIT` swept and **nothing else changed**, 6 runs a cell [M]:

| | window 4 s | window 8 s | window 12 s |
|---|---|---|---|
| **section, cheat deleted** | **0 of 6** | **2 of 6** | **2 of 6** |
| …reached | 48.7–78.2° | 48.7–115.0° | 48.7–115.0° |
| …when the two that pass get there | — | **5.43 s, 5.83 s** | 5.43 s, 5.83 s |
| **flat, the cheat** | **6 of 6** | 6 of 6 | 6 of 6 |
| …when the half-stick runs get there | **3.77, 3.98, 4.00 s** | 3.77, 3.98, 4.32 s | identical |

So: **the honest hull reaches the same 85° the cheat does, 1.4–1.8 s later** — 5.43 and 5.83 s against 3.77 and 3.98 s,
a factor 1.44–1.47. The 12 s column is identical to the 8 s one, so it is not a longer tail: it is a turn that takes
about 5.5 s where the gate allows 4.

**And the cheat's own 6 of 6 is a knife edge, which is worth knowing before anyone ranks a hull on it.** Its three
half-stick runs reach 85° at 3.77, 3.98 and 4.00 s of a 4.00 s window — by **0.00 to 0.23 s** — and the third of them
only gets there *after* the stick has been centred, during the coast. Three of its six passes are comfortable (full
stick, 2.50–3.95 s) and three are not.

### Two things about the gate itself, since the brief asked

**The gate's 85° is about 130° of heading rotation, not 40°, and its metric is not monotonic.** The board is placed 45°
round from the fall line and the stick turns it **toward and straight through** the fall line: the signed heading runs
−45° → 0° → +87°, so the gate's own `acos(fwd · fall)` reads **45° → 0.5° at 1.45 s → 85.4°** [M, trace]. I had started
to write that the gate asks for only 40° of turn; it does not, and I am recording the correction rather than the claim.
The metric does **not** fold in any of the 84 runs here (the unfolded heading and the `acos` agree to 0.0° in every
one), so 3.2q's artefact is present in the shape of the metric and does not bite at these angles.

**Is 85° the wrong target? No — but the 4 s is generous and both riders need nearly all of it.** The source
`COMPRESS_PULL` itself cites for a bottom turn is **99° in 0.96 s** (Forsyth et al. 2024, quoted in
`AttachedRider.ts:508`) [S]. Our gate asks for less rotation than that and allows **four times** the time, and the
cheat's half-stick runs still finish with 0.00–0.23 s to spare while the honest hull wants 5.5 s. So the target angle is
not the problem and I am not recommending it be moved; what the numbers say is that **both riders turn three to five
times slower than the sourced turn**, and the gate is only the place that shows it.

### Where the heading comes from, and why more force did not buy more of it

The paradox in the brief, sharpened: at half stick and entry +0 the section with the cheat deleted has **0.342 g** of
lateral load against the cheat's **0.234 g** — 1.46× more — and it needs **1.44× longer** to get round (5.43 s against
3.77 s) [M]. More sideways force, slower turn.

The yaw ledger, integrated over the turn — angular impulse, **N·m·s, about the world vertical**, **positive the way the
heading actually goes** (the ledger's own convention is "the nose toward the board's left", and in this movement that is
the turn's direction: the signed heading rises from −45° to +87°). From `BoardBody.yawLedger`, step 3.2q's tool, with
its suction entry fixed below [M]:

| | flat, the cheat, **6 runs** | new rider, in the turn, **18 runs** | new rider, in trim, **12 runs** |
|---|---|---|---|
| hull pressure | **−43.6** | −20.5 | −2.0 |
| fins | −9.0 | **−18.4** | −2.4 |
| rails' side faces | −2.1 | −1.6 | −0.2 |
| added mass | −15.2 | −15.8 | **−22.7** |
| friction | +3.7 | +2.3 | +0.7 |
| **the water, summed** | **−66.2** | **−54.0** | **−26.6** |
| **`rider`** (the residual that closes the ledger) | **+72.2** | **+58.6** | **+38.8** |
| `total` (the **board's** own I·Δω) | +0.49 | +0.26 | +0.22 |

**I had these signs backwards in this document's first draft and the corrected table is above.** The draft quoted the
probe's first run, which was both before the `water.advance` line went in and read with the turn's sign inverted; the
numbers above are from the runs every other number in this part comes from. It is the second sign error this thread has
made on an angular quantity.

**What I will claim from this, and what I will not.** `total` is the **board's** own change of yaw momentum, so `rider`
is a **residual** — `total` less every water term — and it carries the rider's own yaw inertia and the contact's
constraint torque together. Its magnitude is **not** "a torque the feet apply" and I will not read it as one; the books
do not close on the rider's side in the naive way, which is the honest statement of the ledger's limit.

Two things in it are safe, because they are the water's own columns and nothing else:

1. **The water's net yaw torque is against the turn in all three cells** — summed, −66.2, −54.0 and −26.6 N·m·s — and
   the hull's pressure and the fins are both on the resisting side. **So the water is not what brings the nose round
   here; it is what the nose is brought round against.** That is the resolution of the paradox at the top of this
   section: the section's extra 1.46× of lateral load comes with more water resistance to the heading, not less, which
   is why 2.5× the cheat's lateral g buys 0.7× its rate.
2. **The board's own net yaw momentum change over a ~130° turn is +0.2 to +0.5 N·m·s against a ~66 N·m·s traffic** —
   three parts in a thousand. Almost nothing in this ledger is going into turning the board; it is a near-balance
   between the water and the contact.

Separating the rider's inertia from the contact's constraint needs a term the ledger does not have, and naming that is
this section's loose end. A `rider` column split into the two would be a ten-line change to the tool and is the first
thing I would add next round.

**One bug fixed in the ledger while reading it** [R, mine]: `BoardBody.ts:1529` accumulated `this.yaw.suction += totals.sty`
where all twelve other entries accumulate `h × τ`, so the ledger's `/ dt` left that one entry a factor `substeps`
(about 1 920) too large. It is a measurement tool only (`yawLedger` is off in the game) and it never showed because the
suction measures 0.0 N through every ride Part 19 ran. It would have corrupted every `?hull=rail` row of this section.
Fixed, with a test that bounds the entry by the force times the board's own length.

### Part 19 §5's open `[I]`, closed by elimination

Part 19 could not say why the section makes the rider lean (0.55° of roll flat, 26.5° with the section) and named two
flags that settle it without a fourth hull. Both run, 6 runs a cell, cheat deleted [M]:

| | bank, median | board roll | lateral g | reached | gate |
|---|---|---|---|---|---|
| flat | 0.3° | 0.2° | 0.005 | 49.8–59.4° | 0 of 6 |
| **the section** | 21.1° | 19.4° | 0.248 | 48.7–78.2° | 0 of 6 |
| the section, **squared taper** (`RAIL_POWER=2`) | 25.3° | 22.9° | 0.257 | 49.6–76.8° | 0 of 6 |
| the section, **side faces back** (`RAIL_FACES=on`) | 22.1° | 23.5° | 0.286 | 48.3–72.9° | 0 of 6 |

**Both flags are null.** The squared taper undoes the thickness redistribution — taper 0.568 → **0.916**, the same
layout, the same band, the same planform and beam to twelve decimals — and the lean, the roll and the reach all stay
where the section put them. Re-enabling the side-face foils beside the band (which deliberately counts the rail twice)
does the same. With the advisor's patch-centre-quantization hypothesis already refuted by its own named test (12 across:
bank 0.95° against 4-across's 0.60°), **the band's own normals are the only candidate left**, which is what Part 19
inferred and now has three refuted alternatives behind it. It is still [I]: elimination over a named list is not a
positive measurement of the mechanism, and the list was Part 19's, not an exhaustive one.

A side measurement the squared-taper flag produced, which is the reason `'rail'` is linear, now measured from the other
end: the squared taper's rail is thin enough that `RAIL_BAND.minSlab`'s 2 mm floor begins to bind, and the volume stops
closing — **0.002 % with the linear taper against 0.04 % with the squared one**, twenty-five times worse [M].

## 3. Job 1a — which of the three limits binds when he goes down

`balanceReserve` is `min(capture-point margin, 1 − frictionUsed, 1 − kneeUsed)` for the new rider
(`AttachedRider.ts:2366`), and the game computed which one it was and threw it away. Here it is, new rider, flat board,
the Canyon-matched face [M].

**The two populations, exactly.** The **turn** cell is 18 runs: 2 stances (Compress and tall) × 3 entry speeds (+0,
+1.5, +3 m/s on the trim speed) × **3 stick positions (0.25, 0.5, 1.0)** — the owner's own movement, with a third,
gentler stick position added to the two the acceptance test uses, because the question here is the fall and not the
gate. Job 2 above keeps the acceptance test's own two positions, so its cells stay comparable with Part 19's. The
**trim** cell is 12 runs: 2 stances × 6 entry speeds (−3 to +3 m/s) × **the stick at zero throughout**.

| | the owner's acceptance turn, 18 runs | trim, the stick never touched, 12 runs |
|---|---|---|
| fell | **18 of 18** | **12 of 12** |
| the cause the game names | `balance` 18 | `balance` 12 |
| **which of the three bound at the fall** | **margin 18**, grip 0, knee 0 | **margin 12**, grip 0, knee 0 |
| the three over the last loaded half second | margin **0.480**, grip left **0.858**, knee left **0.542** | margin 0.454, grip left **0.913**, knee left 0.532 |
| the contact's own limit at the fall | tip 8, none 10, **slip 0** | none 12, **slip 0** |
| frames of the last 0.5 s with the grip saturated | **0 of 30–31** | **0 of 30–31** |
| **which way the weight left the feet** | **across 18**, along 0 | **across 12**, along 0 |
| past the feet's edge by | **0.1–0.8 m** | 0.2–0.4 m |

**Read it in four lines, and the first is a caveat against over-reading the headline.**

1. **"Margin 18 of 18" is partly by construction and I am saying so first.** The fall test standing free is
   `human.fallen`, which is `beyond && weightPast` — **the capture point alone** (`AttachedRider.ts:4366`,
   `humanBalance.ts:423`) [R]. `frictionUsed` and `kneeUsed` narrow the meter and re-label the separation; **neither can
   trip a fall.** So the margin was always going to be at zero when he goes.
2. **What is not by construction is how much of the other two is left, and it is a lot.** The feet hold **86–91 %** of
   their grip over the half second he goes down in, and the contact's limit is `'slip'` in **0 of 60 frames** across
   both populations. **These are not the feet losing grip.** The knees are the nearer of the two at 0.504–0.542 and
   still never bind.
3. **And it is *across*, in every one of the 30.** The weight leaves the feet rail-to-rail, not over the nose or the
   tail, by 0.1–0.8 m past an edge the feet's own half-width puts at about 0.13 m. 0.8 m past 0.13 m is not a near
   miss.
4. **The old rider, in the identical harness, sits somewhere else entirely**: over the same 18 turn runs the grip term
   is the smallest at the fall in **13 of 18** and its capture point's `past` is **0.000 m in all 18** [M]. That is not
   a paired comparison of fall causes — the old rider's fall test is a different one (`sway > RECOVERABLE_ERROR`), so
   its `balanceReserve` is not the min-of-three at all — but it does say the two riders operate in different places.

**What the capture point is made of, since the two terms are two different bugs.** It is
`pointAcross + speedAcross / ω`: where the body's own weight line meets the deck (the body **leaning out**, a position)
plus how fast the body is moving across relative to the feet over the pendulum's rate (the body **being left behind**, a
velocity). At the fall, medians [M]: in the turn **0.382 m = 0.131 + 0.225**, in trim **0.397 m = 0.137 + 0.266**. So
**about two thirds of it is the velocity term in both**. He is not mostly out of place; he is mostly moving.

## 4. Job 1b — is a slide terminal? And the one measurement that re-frames the round

### Read first: there is no path from sliding back to riding, and nothing senses a slide

[R, and I checked each]: nothing in `AttachedRider` reads the board's sideways slip at all — a slide reaches the
balance only indirectly, as the felt vertical tilting and the body being left behind. The only authority past the feet's
own edge is `reachAcross` = `rotorImpulse(swingInertia, SWING_TORQUE, hipRange − |swing.angle|) / (m · height · ω)`
(`AttachedRider.ts:4414`) — **the hip swing, and nothing else.** There is no unweighting, no shift back toward the tail,
no re-plant of the feet. `RiderPhase`'s `'recover'` is the paddling recovery and `BoardRecovery` is getting the board
back after a fall; neither is this. So **the coordinator's candidate is right that the mechanism is missing.**

### And measured, it would not have helped in these runs

- The board slid more than 8° before **12 of the 18** turn falls and **0 of the 12** trim falls [M].
- Where it slid at all, it slid for **0.02–0.32 s** before he went. The drift at the fall is 0.1–8.6° in most runs and
  only −36 to −62° in three of thirty.
- The margin's **whole** collapse, from over half-reserve to the fall, takes **0.1–1.1 s, median 0.21 s** in the turn
  and median 0.50 s in trim [M].

**So the washout and the fall are the same event, not a sequence.** The owner's 0.5 s instinct for the window is well
calibrated — median 0.50 s in trim is almost exactly it — but in the turn population there is a median 0.21 s, and a
recovery that gets a fifth of a second to arrest a body already 0.4 m past its feet and moving would delay the fall, not
prevent it. **I did not build the slide recovery, on these numbers.**

### The measurement that re-frames it: he falls in trim with the stick untouched

This is the round's most important number and it was a control, not the plan. Same harness, same water, same placement,
same stances; `STEERS=0`, so the stick is never touched; 12 runs each (2 stances × 6 entry speeds, −3 to +3 m/s) [M]:

| | new rider | old rider |
|---|---|---|
| fell inside the 4 s window | **12 of 12** | **0 of 12** |
| fell at all in 9 s | 12 of 12, at **0.77–1.70 s** | 3 of 12 |
| which of the three bound | **margin 12** | grip 3 (of the 3 that fell) |
| the weight left the feet across | **12 of 12**, by 0.2–0.4 m | 0 of 12 (`past` 0.000 m) |
| the board slid over 8° first | **0 of 12** | 3 of 3 (at 0.6–1.0 m/s — the board has stopped and spun) |
| the lean the stick asked for | **1.1° peak** | 2.9° peak |
| the bank the body reached | **65.7° peak**, 13.8° median | −2.3° median, 1.9° peak |

**The body banks to 65.7° where the stick asked for 1.1°, the board tracks inside 3.2° of straight, the feet keep 91 %
of their grip, and he is down in 0.77–1.70 s — on water the old rider rides out.** One trace, tall, entry +0: the margin
holds 0.78–0.84 for the first 0.7 s with the capture point *shrinking* to 0.012 m, then from 0.8 s the bank runs
8.8 → 13.5 → 19.1 → 25.7 → 38.5 → 47.7 → **60.7°** monotonically, the roll follows to −57.7°, and the contact's limit
reads `'none'` the whole way down. That is a divergence of the balance loop, not the cost of a move and not a slide.

**What it means for the three briefs this round received.** The owner's model is *player makes a move → balance changes
→ the surfer's own system fixes it*. In 12 of 12 runs there is **no move** and he falls anyway. So a recovery phase has
nothing to catch here, and a target that follows the player's input changes nothing here either — and the worry that the
controller "manufactures error by fighting the input" does not apply, because **there is no input to fight.** By the
owner's own rule that small wobbles should be caught automatically and only a real slide should need the player, this
fall is squarely in the "caught automatically" class: the player did nothing, and standing still is exactly the stance a
real surfer would reach for. **My judgement, which is what the coordinator asked for: neither half of the model first.
The one change is whatever lets the new rider stand up going straight, and it is upstream of both halves.** Build the
model after that, so its window and its recovery are measured against a disturbance the player caused.

### Does a postural settle exist today? No

The coordinator asked this directly, and the movement already answers it: it centres the stick mid-run and then holds
for 5 s, so a settle is in every run that gets that far [M].

| | runs reaching the centring | reserve at it | +0.5 s | +1 s | +2 s | best gain, median | runs whose reserve rose at all |
|---|---|---|---|---|---|---|---|
| old rider, after a turn | 17 of 18 | 0.755 | 0.693 | 0.413 | **0.000** | **0.000** (−0.3 to +0.7) | 8 of 17 |
| old rider, in trim | 12 of 12 | 0.821 | 0.851 | 0.788 | 0.802 | **0.002** (−0.1 to +0.6) | 6 of 12 |
| **new rider, either** | **0 of 30** | — | — | — | — | — | — |

**The reserve is a derived readout and nothing drives it back**, which is what the coordinator suspected and what the
numbers say: it holds roughly level while the physics is steady (0.821 → 0.802 over 2 s in trim) and it keeps falling
while the physics is diverging (0.755 → 0.000 over 2 s after a turn). The median gain is 0.000–0.002 and only about half
the runs show any rise, which is the wobble of a reflected quantity, not a mechanism. **And the new rider never reaches
the release at all in any of the thirty runs**, so for the rider the owner is actually riding the question cannot yet be
posed.

**A plane-water version of the trim test, and why it is not in the headline.** I ran the new rider standing on bare
`PlaneWater` with no wave, and it diverges there too — but **so does the old rider** (both down in 1.5–4.6 s at 0, 4
and 8 m/s), so a board on a flat plane is not a configuration either rider holds and the test discriminates nothing. It
is recorded here because it is the kind of single result I would otherwise have promoted.

## 5. Job 1d — the limit, named on screen

`showsBalanceMeter` already gates a meter on the Practice swell, and `RideHud` drew only the minimum of the three. Now
it names **which**: `Weight`, `Grip` or `Knees` under the meter while standing, and on a fall the one that let go plus
the speed — *"Weight off the side — 29km/h"* — held until the rider is back on the board. Behind the same
`balanceMeter` setting; **no new URL switch and no new setting.**

- `AttachedRider.balanceLimits` returns the three, which of them is least, whether the weight left the feet **across**
  the board, and how far past the edge it is. It agrees with `balanceReserve` to twelve decimals by test. The old rider
  and a prone one have one number with no three terms behind it, so theirs reads `'posture'`.
- `SurfZoneRunner`'s ride status carries it, plus `broke` — the limit at the moment of the latest fall and the speed
  there, taken on the first snapshot after the rider comes off (nothing calls `project` once he is off, so the values
  are the fall's) and cleared when he is back up.
- `balanceLimitLabel` in `RideHud.ts` is the pure function the tests cover.

**Why this is worth more than another probe of mine**, in the coordinator's words and I agree: it turns every wave the
owner rides into a labelled data point. The label carries real information rather than restating the bar — over these 30
runs the margin bound in every one and the weight went off the **side** in every one with the feet still holding 86–91 %
of their grip, and the meter could not say any of that.

## 6. Seatbelts

- **The deletions column, checked before the push.** `git diff --stat origin/main HEAD`: see §8; every deletion is a
  line of mine that another line of mine replaced, and the wave track's work on `main` is untouched.
- `npx tsc --noEmit -p .`: **exit 0**, on its own line, read from `tsc`'s own exit status and not through a pipe.
  `npx tsc --noEmit -p server/tsconfig.json`: **exit 0**.
- The rider and board files run alone, including `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`) and
  `SurfZoneRunner` (`src/wave/`), which are the three this round's readout touches. `results/suite-rider-32v.txt`.
- **Five new tests**: the squared taper on the section's layout (band kept, the flat board bit-identical whatever
  exponent is passed, and the volume closing twenty-five times worse, which is why `'rail'` is linear); the side-face
  foils back beside the band and only when asked; the suction's yaw entry bounded by force × the board's length, which
  is the ledger bug; `balanceLimits` agreeing with `balanceReserve` to twelve decimals and naming the argument of its
  own minimum; and the old rider's single number reading `'posture'`. Plus four on `balanceLimitLabel`.
- **No force was added or removed.** Everything this round ships is a readout, a measurement tool, two probe-only
  diagnostics and one fix to a measurement tool. `RAIL_FACES=on` deliberately double-counts the rail and therefore
  reaches no switch and no default.
- **The default board is bit for bit `main`'s**, checked the way Part 19 said it would check first next time: both
  checkouts' `buildBoardShape()` printed as raw IEEE bit patterns — the taper, the volume, the planform, the width, the
  centre of mass, all nine inertia terms and all ten fields of all 48 patches — **diff clean** [M].
  `results/32v/shapebits-32v.txt`.
- **The Canyon bench, all four hashes identical**: `results/canyon-bytes-32v.txt`, the same command and the same
  reference as step 5f's, 3.2t's and 3.2u's, Canyon B and the default Canyon, 3600 steps each from fresh spin-ups, run
  **last**. Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`, default Canyon `ea3d57a4d49f4b48` / `a1a2555739210f96`
  [M]. Every change this round is a readout, a measurement tool, a probe-only diagnostic or a fix to a tool whose own
  switch is off in the game, so that is the expected result and not a surprise.
- **The deletions check earned its place for the third round running, and this time it needs no caveat.** After the
  hashes were measured, the column showed **16 deletions in `docs/research/wave-strategy-alternatives/c2-step5g.md`** —
  the wave track had merged **89af1077** while this round ran, and the branch, being behind, would have reverted it.
  Rebased onto 89af1077; no conflict, and the column is back to **9 deletions, every one mine**. 3.2u had to state an
  unverified caveat at exactly this point; this round does not, and the reason is checkable rather than argued:
  `git show --stat 89af1077` is **one documentation file, +16/−1, and no source file at all**, so the solver, the board,
  the rider and every switch are byte-identical across the rebase and the four hashes are the rebased tree's own. Both
  `tsc` runs and the 25-file suite were re-run on the rebased tree.
- A wave-track agent shared the machine throughout; nothing of theirs was stopped.

## 7. What I am unsure of

- **The acceptance test's `FaceWater` is a fit to Canyon, and the owner rides Canyon.** `MATCH=canyon`'s 1.4 m / 16° /
  5.7 m/s is the wave this track has always probed against and it is what makes these numbers comparable to Part 19's;
  it is not the water the owner's ride happened on. The trim result's 12 of 12 against 0 of 12 is a comparison *within*
  that harness, which is its strength and its whole claim.
- **The rider is placed, not paddled in.** In the trim runs he is dropped onto the face at a chosen speed and
  orientation. The first 0.7 s of the trace are stable and the divergence then takes 0.8 s, which argues against a
  placement transient, but it does not rule one out, and 0.77–1.70 s is a short life to draw a wave's worth of
  conclusion from.
- **Thirty runs, and six a cell in job 2.** 18-of-18 and 12-of-12 against 0-of-12 are solid; 0 of 6 against 2 of 6 in
  the window ladder is two runs and I would not defend the 1.44–1.47 factor to a decimal.
- **The yaw ledger's `rider` is a residual** that carries the rider's own yaw inertia and the contact's constraint
  torque together. §2's last paragraph says what I will not claim from it, and separating the two needs a term the
  ledger does not have.
- **Part 19 §5 is closed by elimination over its own list**, which is not a positive measurement of the band's normals
  and not an exhaustive list.
- **`past` of 0.1–0.8 m is a large number against a 0.13 m support and I do not fully understand it.** The capture point
  is a predicted landing place, not a position, so it can run far past the feet while the body is still over the board;
  how far past is "a lot" is a question about `reachAcross`, which I measured the use of but not the calibration.
- **Nothing here has been ridden by a person.** Every number is a probe, and the owner's ride is the evidence that
  started the round.

## 8. Files (3.2v)

- `docs/research/new-rider/3.2/turnpath.ts` (new): the owner's acceptance movement on the Canyon-matched face with the
  heading signed and unwrapped beside the gate's own unsigned metric, the roll path link by link, the yaw ledger by
  source, the three bugs told apart per run, the balance's three limits every frame with which one binds and which way
  the weight left the feet, the capture point split into its position and velocity terms, and the settle after the
  stick is centred. Its header carries the commands and the two flags.
- `src/physics/AttachedRider.ts`: `balanceLimits` — the three, which binds, `across` and `past`.
- `src/physics/BoardBody.ts`: the yaw ledger's suction entry scaled like the other twelve; `BoardBodyOptions.railFaces`.
- `src/physics/boardShape.ts`: `buildBoardShape`'s fifth parameter, the rail section's taper exponent (the flat path
  unchanged, bit for bit).
- `src/wave/SurfZoneRunner.ts`: `ride.balanceLimit` and `ride.broke` in the status.
- `src/ui/RideHud.ts`, `src/ui/strings.ts`, `src/ui/ui.css`: `balanceLimitLabel`, the line under the meter, its strings
  and its style.
- `src/physics/railSection.test.ts`, `src/ui/RideHud.test.ts`: the nine new tests.
- Results under `results/32v/`: the window ladder (`*-tl4/8/12`), the six job-2 cells and the two flags (`m5-*`), the
  no-stick control (`m9-*`), the settle (`m10-*`), and the default board's bits.

## 9. For the owner, in plain words

**You said the surfer falls too much and that he slides out sideways. I went looking for which of the three things that
hold him up gives way, and found something I did not expect: he falls when you are not doing anything at all.**

**What gives way, every time.** The balance meter you can see is the smallest of three numbers: how far your weight is
from going past your feet, how much grip your feet have left, and how much strength your knees have left. Over thirty
rides I measured, **it is always the weight going past your feet, and it always goes past them sideways — off the rail,
not over the nose.** The feet are never the problem: they still have **86 to 91 per cent** of their grip when he goes
down, and the game never once registers them slipping. So the thing you see as a slide-out is really your weight leaving
your feet off the side of the board.

**And the board isn't what slides.** I expected to find the tail breaking loose and dumping him. It does not. In the
rides where the board slides sideways at all it only does so for **a fifth of a second** before he is already going —
the slide and the fall are the same moment, not one then the other. In the rides where he is just going straight, the
board never slides at all and he still falls.

**That last one is the finding.** I ran twelve rides where **the stick is never touched** — he is just riding along the
face. The new surfer fell in **all twelve**, within one to one and three-quarter seconds. The old surfer, same wave,
same place, same speed, fell in **none** of them. And here is the part that says what is wrong: during those rides the
stick is asking him to lean about **one degree**, and his body leans over to **sixty-five**. The board is pointing
straight. Nothing pushed him. He just slowly falls over, faster and faster, and goes in.

**So about the balance cycle you described** — you make a move, it costs balance, then the surfer fixes it. I think the
model is right, and I think it cannot be tested yet, for a simple reason: **in the rides I can measure there is no move
and he falls anyway.** A system that fixes things up after a move has nothing to fix here, and giving him half a second
to save a slide does not help when there is no slide. I also checked whether anything fixes his balance back up today,
the way you describe: **nothing does.** The bar just reflects what his body is doing — it holds steady when he is
steady and it keeps falling when he is falling, and no part of the game pushes it back toward the middle. So your
instinct that something is missing there is correct.

**My recommendation, and it is one change.** Before building the balance cycle, fix the thing that makes him fall over
standing still. Everything else is measured against it: if he is already tipping over for free, then whatever a move
"costs" and whatever the recovery "saves" is mixed up with a fall that was coming anyway, and your next ride would be
impossible to read.

**One thing you can now see for yourself.** The balance bar used to tell you how close you were and nothing about why.
It now says which of the three is nearest — **Weight**, **Grip** or **Knees** — and when you go down it names the one
that let go and how fast you were going: *"Weight off the side — 29km/h"*. It is on wherever your balance meter is on,
with no new setting. Every wave you ride is now a labelled data point, and if it ever says **Grip** or **Knees** on a
fall, that is news and worth telling me.

**And one honest note on the turn we were chasing last round.** It is two different problems, not one. At full stick he
falls before the turn finishes. At half stick he does not fall at all — he just runs out of time: the test gives him
four seconds and the honest board needs about five and a half. Give it eight seconds and two of the six get all the way
round. So the shaped board's turn is not weak, it is **slow** — about one and a half times slower than the version with
the cheat in it. That is a smaller and more specific problem than "the turn is missing", and it waits behind the falls.

# Part 21 — the trim fall, named: the pair capsizes

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-32w`, cut from `origin/main`
at **b3ed7397** (step 3.2v's merge), so Part 20 above is its base.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

**The round had one job**, in the coordinator's words: *the new rider falls 12 of 12 riding in trim with the stick never
touched, the old rider falls 0 of 12 on the same water — find out why.* The brief carried no hypothesis, on purpose,
after three rounds whose premises the agent refuted. This round ships **no change to the game**: one probe, two ladders
and a diagnosis. The diagnosis filled the round, and the reason it did is §1.1 — the fall is not the one Part 20
described, and the difference is a sign.

**The harness is 3.2v's trim cell, unchanged** (3.2u's ruling: add cells, do not move the acceptance test): the
Canyon-matched `FaceWater` — 1.4 m, 2.6 m deep, 16°, 5.7 m/s — the board placed 0.75 fronts ahead of the crest and 45°
off the fall line, the entry speed the face's own plus −3, −2, −1, 0, +1.5 or +3 m/s, the stances Compress and tall,
`water.advance(STEP)` every frame, 9 s a run, the stick **at zero every frame**. **12 runs a cell** (2 stances × 6
entry speeds). The probe is `3.2/trimbank.ts`; the cells are `results/32w/cells.txt`, the ladders
`results/32w/ladders.txt`, three frame traces beside them.

## 1. The five sentences the round is for

1. **The fall is a capsize, not a dismount: the board and the body go over together and the ankle never opens.** New
   rider, 12 runs: the body's bank peaks **20.7–65.7°**, the board's roll about the heading **20.9–63.0°**, the rail
   against the water's own normal **10.9–62.9°** — and the **ankle's own span stays within 2.7–9.5° peak, median
   0.3–1.6°** [M]. The old rider on the same 12: the board's roll peaks 8.3° in the nine that stand and 71.6° in its
   three falls. **Part 20's trace reads the body banking +60.7° while the board rolls −57.7°, which looks like the body
   leaving the board; both angles taken about the heading from the same datum are the same way and within 2.7° of each
   other.** Part 20's roll column is the rail against the water's normal, signed by the stick's way; this one is the
   deck against the world's level, the angle the ankle actually spans. The sign is the whole round: one says the body
   falls off the board, the other says the pair goes over as one.
2. **It topples at the bare inverted pendulum's own rate, so the hull gives no net roll restoring with the rider on
   it.** One trace (tall, entry +0, `results/32w/trace-new-tall0.jsonl`): the rail runs 0.69° at 0.183 s to 5.84° at
   0.700 s, a log-linear fit of **4.07 /s (τ 0.245 s)**, and 2.80 /s (τ 0.357 s) over the whole 1.63 s. The capture
   point's own ω₀ = √(g_eff/h), with the centre of mass 0.834 m over the feet, reads **3.39 1/s median** in the same
   run [M]. The arithmetic behind that is read, not measured here [R]: the rider's overturning stiffness about the feet
   is m g h = 73 × 9.81 × 0.834 = **597 N·m/rad**, against the water's own righting moment per radian of roll about the
   feet in `PLANT_SPEEDS` at this board's speed — **−143 N·m/rad at 7.5 m/s, −227 at 8 m/s**. The plant is two to four
   times too top-heavy for its hull. A surfboard is; that is the game the balance has to win.
3. **The roll is away before the balance meter moves, so it is the cause and not the consequence.** At 0.700 s the rail
   is 5.84° and climbing at 4 /s while the margin still reads **0.794** of 1 and the contact's own limit reads `'none'`
   [M]. The margin's whole collapse and the rail's last 57° are the same 0.9 s.
4. **Five candidates refuted, each on 12 runs and one switch** — §3 has them in full. The ankle's command authority
   (the first thing I tried), the mount's own lean (the most attractive, and 3.2v's own open question), the rate sense,
   the face's slope, and where on the face he starts. None of them is it.
5. **No setting of one gain stands him up: holding the roll makes the fall come sooner, not later.** Ten rate gains
   from 0 to 5 through `humanGains`, 12 runs each (§4). The roll peak falls monotonically with the gain — 68.9° of rail
   at gain 0 down to **4.9–9.8°** at gain 3, the old rider's own order — and the fall time falls with it, to
   **0.38–0.43 s** in all twelve. At gain 3 the ankle's rest is slewed to **−13.37°** of its 14.3° range over 0.2 s,
   which drags the centre of mass from +0.108 m across the middle to −0.131 m — **one millimetre past the feet's
   0.130 m edge** — at an across speed of **1.44 m/s**, so the capture point reads **−0.570 m = −0.131 of position +
   −0.439 of velocity** (77 % velocity) and the fall fires. **The roll and the fall test pull opposite ways.**

## 2. What the fall actually is, link by link

`trimbank.ts` reads every link of the roll loop off the live instance (private to TypeScript, present at run time), so
a command that saturates shows as a flat top and a command that is simply absent shows as a zero. The shipped cell,
12 runs:

| | new rider (predictor) | old rider |
|---|---|---|
| fell inside 9 s | **12 of 12**, 0.77–1.70 s | 3 of 12, 7.78–8.87 s |
| which bound | margin 12 | grip 3 |
| the body's bank, peak | 20.7–65.7° | 2.5° (nine that stand), 66.6° (three falls) |
| the board's roll about the heading, peak | **20.9–63.0°** | **8.3–71.6°** |
| the rail against the water's normal, peak | 10.9–62.9° | 10.8–71.1° |
| **the ankle's own span, peak** | **2.7–9.5°** | **11.7–66.2°** |
| the ankle's rest commanded, peak | 1.97–9.03° of 14.3 | 4.31–14.32° of 14.3 |
| the hip's swing torque, peak | **0–8 N·m** | 0–142 N·m |
| the hip's swing angle, peak | **0.0–0.3°** | 0.0–68.8° |
| the board's drift, peak | 1.9–4.9° | 2.5–103.1° |

Read down the ankle-span row and the hip rows together. **The new rider's ankle never opens past 9.5° and his hip never
moves**: the body is locked square to a deck that is rolling over, and the one joint with the inertia to do anything
about it contributes 8 N·m at its best. The old rider's ankle spans up to 66° and his hip swings up to 69°, because its
loop drives the body's bank to **0.8–3.3°** of the world vertical at every slope measured while the deck sits at the
face's own tilt — so its ankle is permanently open by the face's angle and its hip is in the fight.

**Why the hip never fires, read in the code [R].** It gets a command only from what the ankle's own command asks
**past** HIP_SHARE × ANKLE_REST_RANGE — 0.8 × 14.3° = 11.5° — and the shipped predictor asks 2.63–14.35° raw,
1.97–9.03° after the clips. It is not wired to the capture point at all; `HumanBalance.sensedCaptureAcross` says so in
its own comment, and Part 9 §2 is why. **And the fall test pays for it anyway**: `reachAcross`, the room the margin
credits the hip with catching past the feet's edge, reads **0.169–0.300 m** through these runs, about twice the feet's
own half-width, and 0.172–0.385 m at the fall [M]. That it fires at gain 3 — **233 N·m of swing torque, 15.5° of swing
angle, and the roll held to 4.9–9.8° of rail** — is the measurement that says the authority is there and only the
trigger is missing. **This is 3.2v's own flagged `reachAcross` lead, and it is where I would go next.**

## 3. The five refutations, with their switches

- **The ankle's command authority — refuted, and the trade the code records is not a trade.** `DEFAULT_WEIGHTS`'
  `commandScale[0]` is 0.09 rad against an ankle range of 0.25, and its own comment says step 3.2j raised it and did
  not keep it because "every variant that raises the ankle's gain collapses the saved shove in the lower stances". Run
  at 0.15 / 0.25 / 0.5 rad, 12 runs a cell: **12 of 12 in every one**, falling at 0.98–4.28 / 1.00–6.32 / 1.10–5.88 s
  against the shipped 0.77–1.70 — and the **roll peak rises** (66.9 / 90.2 / 85.7°), the raw command reaches
  57.7 / 449.3 / 207.9° and the ankle torque 167 / **1279** / 611 N·m [M]. Raising the ankle's scale buys a later fall
  in some runs and a worse capsize; it does not stand him up, so the shove bar is not what is keeping him down.
- **The mount's own lean — refuted, and this was the attractive one.** The new rider mounts **square to the deck**
  (`frame`'s `measure = false` path: "square in pitch alone, plumb across (step 3.1), a start across a face had its
  bank run uphill"), which on this face is **8.69–8.71° of body lean with the centre of mass 0.126 m across against a
  feet half-width of 0.130 m** — 97 % of his whole support budget, before the first frame. The old rider mounts plumb:
  **0.00° and 0.000 m across in every cell of both ladders** [M]. So the two riders are not placed the same way, which
  is worth saying on its own. Mounted plumb across instead (one line in `frame`, probe-only, reverted before the push):
  **12 of 12**, 0.52–5.68 s, bank peak 22.2–64.6°, roll peak 15.7–57.1°. The offset is real and it is not the cause.
  (And the mount is square to a felt vertical that is the face's normal for 0.17 s: the felt vertical's own tilt across
  runs **−7.6° → −1.4° over 0.167 s** in the trace while the body's bank stays at 8.7° [M]. The premise of the step 3.1
  choice holds for a sixth of a second.)
- **The rate sense — refuted.** `balance.rateSense: 'difference'` (the bank's change over a substep) against the
  shipped `'canal'` (the body's own angular rate): **12 of 12 both**, the same 0.77–1.70 s, roll peak 62.8 against
  63.0°, commands within 0.11° [M]. The two senses agree, which also says the angle and the rate the filter is fed are
  consistent.
- **The face's slope — refuted.** 1, 2, 4, 8, 12, 16, 20°, 12 runs a cell: the new rider is **12 of 12 at every one**,
  0.65–5.53 s [M].
- **Where on the face he starts — refuted.** SIDE 0, −10, −20, −30, −45, −60°, 12 runs a cell: **12 of 12 at every
  one**, including SIDE 0 where the mount's across offset is exactly 0.000 m and the deck's roll 0.00° [M].

## 4. The gain ladder, and why the fix is not a gain

`humanGains` replaces the predictor with step 3.2's own delayed law (δ = K_ref θ_ref − G θ − G_r θ̇ on senses
BALANCE_DELAY old, through MOTOR_LAG). With the angle gain at 0 throughout — HUMAN_BANK_GAIN's own value, and the
value the roll model picked because any gain on the angle rings through the delay — the rate gain alone, 12 runs a cell:

| rate gain | fell | at | the board's roll peak | the rail peak | the body's bank peak |
|---|---|---|---|---|---|
| 0 (rest held at 0: the passive ankle alone, no control) | 12 of 12 | 0.63–3.08 s | 25.6–68.9° | 14.5–68.9° | 27.0–70.0° |
| 0.1 (HUMAN_BANK_RATE_GAIN's own) | 12 of 12 | 0.78–3.90 s | 27.4–77.4° | 22.2–78.0° | 24.3–70.0° |
| 0.3 | 12 of 12 | **1.27–3.55 s** | 11.8–79.8° | 11.8–80.1° | 13.5–65.0° |
| 0.5 | 12 of 12 | 0.70–4.07 s | 13.0–60.8° | 7.6–66.5° | 13.3–58.2° |
| 0.8 | 12 of 12 | 0.62–2.15 s | 12.2–32.9° | 5.8–26.3° | 13.7–26.8° |
| 1 | 12 of 12 | 0.58–1.38 s | 12.7–32.6° | 5.0–24.8° | 13.4–36.8° |
| 1.5 | 12 of 12 | 0.42–1.02 s | 12.8–28.3° | 6.1–17.8° | 10.3–26.4° |
| 2 | 12 of 12 | 0.40–1.03 s | 12.9–28.3° | 4.9–22.6° | 10.0–31.6° |
| 3 | 12 of 12 | 0.38–0.43 s | **12.9–17.2°** | **4.9–9.8°** | **9.9–10.4°** |
| 5 | 12 of 12 | 0.37–0.43 s | 14.6–18.3° | 4.5–11.7° | 10.2–10.7° |
| **the shipped predictor** | 12 of 12 | 0.77–1.70 s | 20.9–63.0° | 10.9–62.9° | 20.7–65.7° |
| the old rider's own gains (7.4 / 3.6 / 0.1) on the new rider | 12 of 12 | 0.18–0.22 s | 15.9–17.4° | 6.9–9.3° | 8.3–8.4° |

Two readings, and they are the round's recommendation:

**The shipped predictor does no better than no control at all.** Gain 0 holds the ankle's rest at exactly zero — a
passive spring and damper and nothing else — and falls at 0.63–3.08 s against the predictor's 0.77–1.70 s, with a
comparable roll peak. The predictor's commands ring in sign while the rail climbs monotonically: over 0.77–1.18 s of
the trace the raw ankle command runs **−3.33, −7.45, +2.45, −2.02, +4.09, −1.34°** while the rail goes 7.4 → 10.2 →
12.8 → 14.0 → 15.9 → 17.9°. Whatever it is answering, it is not the capsize.

**And a loop that does hold the roll trips the fall test instead.** At gain 3 the body is held to 9.9–10.4° and the
board to 4.9–9.8° of rail — the old rider's own numbers — and every run is down in 0.38–0.43 s, margin-bound. The
mechanism, from the trace (`results/32w/trace-rate3-tall0.jsonl`): the ankle's rest is a **position** command through
an 800 N·m/rad spring with no rate limit of its own, and slewing it 0.29 rad in 0.2 s throws the centre of mass across
at 1.44 m/s; the capture point counts that velocity at 77 % of itself and calls the correction a fall. The ankle torque
peaks at **252 N·m** in that run and **1279 N·m** in the commandScale-0.25 cell, and **nothing in the model bounds it
to a human ankle's strength** — a human's sagittal ankle peaks near 100–140 N·m a leg [S, order of size], and the
frontal-plane ankle is far weaker again.

So the next change is not a number in this loop. On these measurements it is one of: **bound the ankle's torque and
give the hip the capture point** (the authority is measured, at 233 N·m and 15.5° of swing, and the fall test is
already paying for it); or **give the plant some roll restoring it does not have**, since 597 N·m/rad of top-heaviness
against −143 to −227 of hull is a plant no 0.15 s loop can hold. I did not pick between them, because picking needs a
measurement I did not take.

## 5. What Part 20's headline is, exactly, and what it is not

The 12 of 12 against 0 of 12 reproduces: the shipped new rider **12 of 12 at 0.77–1.70 s**, the old rider **3 of 12 at
7.78–8.87 s** over 9 s, which is 0 of 12 inside the 4 s window Part 20 reported. Two caveats on it, both measured:

- **The two riders do not share a fall test.** Standing free the test is `human.fallen`, the capture point; otherwise it
  is the sway and the postural error against RECOVERABLE_ERROR = 0.25 m [R]. In these runs the old rider's three falls
  are **grip**-bound (`limit === 'slip'`), not postural, and the new rider's twelve are all the capture point's. So the
  comparison is partly between a rider carrying a test that reads where his weight is going and a rider carrying none.
  **I could not make that comparison sharp**: the `postureError` field reads 0.000 m for **both** riders through every
  cell of this probe, so I will not claim from it that the new rider would have stood under the old test. What the
  capsize does not need any test to say is that **a board at 63° of rail in trim is a capsize**, and the old rider's
  board holds 8.3°.
- **The old rider's 0-of-12 belongs to a band, not to the water.** Over the slope ladder the old rider is **12 of 12 at
  1, 2, 4 and 8°** (1.73–7.20 s, grip-bound, the board rolling to 46–64°) and only 4, 3 and 3 of 12 at 12, 16 and 20°.
  With the wave not advanced under him he is 12 of 12 at 2.22–5.15 s with the board at 49.1–68.6°. So the 16° cell is
  near the old rider's own best, which is the right place to test and worth saying out loud.

## 6. Seatbelts

- **This round changes no source file at all.** `git diff --stat origin/main HEAD -- src/` is empty; everything shipped
  is under `docs/research/new-rider/3.2/`. The one source edit this round made — the plumb mount in `frame` — was a
  probe-only trial, measured in §3, and reverted before the first commit.
- `npx tsc --noEmit -p .`: **exit 0**, on its own line, read from `tsc`'s own exit status and not through a pipe.
  `npx tsc --noEmit -p server/tsconfig.json`: **exit 0**. The root project includes only `src`, so the probe was
  type-checked too, on a throwaway project that extends the root's options and adds the one file: **exit 0**.
- The rider, board, HUD and runner test files run alone, `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`) and
  `SurfZoneRunner` (`src/wave/`) included — the last of those is outside the merge suite, so a red there is news:
  **57 files passed, 740 tests passed and 21 expected fail, vitest exit 0**, 146 s, and **58 / 783 / 21, exit 0** on
  the rebased tree with `SprayCloud.test.ts` added (see the rebase bullet). `results/32w/suite-rider-32w.txt`.
  `src/wave/SurfZoneSimulation.test.ts` is deliberately not in it (`c2-step5g.md` §7.4).
- **The Canyon bench, all four hashes**: `results/32w/canyon-bytes-32w.txt`, the same command and the same reference as
  step 5f's, 3.2t's, 3.2u's and 3.2v's — Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`, default Canyon
  `ea3d57a4d49f4b48` / `a1a2555739210f96`. With no source file touched this is the only possible result, and it is run
  anyway because that is what a seatbelt is for.
- **The default board**: unchanged by construction, since `boardShape.ts` is untouched; the bit-for-bit check 3.2v
  introduced has nothing to compare that the empty `src/` diff does not already settle.
- **The deletions column, checked before the push**: `git diff --stat origin/main HEAD` — two added files and one
  appended README section, no deletions anywhere, so nothing of the wave track's can have been reverted.
- No force was added or removed, and no switch reaches the game. `MOUNT_PLUMB` existed for one measurement and is gone.
- **The rebase, and why it was not optional.** The deletions column earned its place for the fourth round running.
  With the work committed, `git diff --stat origin/main HEAD` showed **1,640 deletions across 34 files** of the wave
  track's — `c2-step5h.md`, its runs and stills, `whitewater-sources.md` and **`src/wave/SprayCloud.ts` (−148) and its
  test (−124)**: the wave track had merged C2 step 5h (`origin/main` **f7f08766**) while this round ran, and the
  branch, being behind, would have reverted it. Rebased onto f7f08766; no conflict, and the column is back to
  **11 files, 2,072 insertions and no deletions at all.** Unlike 3.2v's rebase this one **moves a source file in the
  Canyon path**, so neither `tsc` run nor the suite nor the four hashes could be inherited: all of them were re-run on
  the rebased tree, and the hashes above are that tree's own. The wave track's own leg A on the same tree reads the
  same default-Canyon pair, independently.
- A wave-track agent shared the machine throughout; nothing of theirs was stopped. The per-cell wall-clock seconds in
  `cells.txt` are a loaded machine's.

## 7. What I am unsure of

- **The `FaceWater` is a fit to Canyon, not Canyon**, and every number above is within that harness. The owner rides
  Canyon.
- **The hull arithmetic in §1.2 is read, not measured here.** −143 and −227 N·m/rad are `PLANT_SPEEDS`' 7.5 and 8 m/s
  rows and 597 N·m/rad is the code's own masses; what I measured is the toppling rate, 4.07 /s early and 2.80 /s over
  the run, against an ω₀ of 3.39. I did not measure the hull's roll spring under this rider in this probe, and the two
  are not the same claim.
- **The gain ladder is step 3.2's delayed law, not the predictor.** It says what one ankle-rest gain can and cannot
  buy against this plant and this fall test. It does not say the predictor could not be redesigned to do better, and
  the 1.27–3.55 s best at gain 0.3 is a non-monotonic ladder I would not defend to a decimal.
- **The ankle-torque numbers are the model's, and the human figures I set them against are an order of size [S]**, not
  a sourced table for the frontal plane. The claim I will defend is that nothing bounds the model's ankle at all, which
  is read in the code; the claim that 1279 N·m is 10 times a human's is an order-of-size comparison.
- **The rider is placed, not paddled in.** The placement ladder narrows this — the mount's across offset is 0.126 m at
  SIDE −45 and 0.000 m at SIDE 0 and he falls 12 of 12 at both — but the first 0.17 s of every trace carries a contact
  transient (the felt vertical's tilt across runs −7.6° → −1.4°), and a 0.52 s life is a short run to conclude a wave
  from.
- **Twelve runs a cell, two stances, one face.** Every span above is the whole population, not a confidence interval.
- **Nothing here has been ridden by a person.** Every number is a probe, and the owner's ride is the evidence that
  started the thread.

## 8. Files (3.2w)

- `docs/research/new-rider/3.2/trimbank.ts` (new): the trim cell with the roll loop read link by link — the body's
  bank, the board's roll about the heading from the world's level, the rail against the water's normal, the ankle's own
  span, the rest commanded and the raw command behind the clips, the ankle and hip torques, the hip's swing, the three
  senses the controller is fed, the three limits, and the capture point split into position and velocity with ω₀, the
  CoM height, the felt vertical's tilt and the hip's credited reach. Switches: `GAINS`, `WEIGHTS`, `RATE_SENSE`,
  `RAIL_CAP`, `FACE`, `SIDE`, `AHEAD`, `DEPTH`, `SECONDS`, `FROZEN`, `SUBSTEPS`, `YAW_INERTIA`. Its header carries the
  commands.
- `docs/research/new-rider/3.2/results/32w/`: `cells.txt` (the fifteen cells), `ladders.txt` (the slope and placement
  ladders, 12 runs a cell), `rows.jsonl`, three frame traces (`trace-new-tall0`, `trace-rate3-tall0`, `trace-old-tall0`),
  `suite-rider-32w.txt`, `canyon-bytes-32w.txt`.
- No source file.

## 9. For the owner, in plain words

**You said the surfer falls too much and slides out sideways. Step 3.2v found he falls even when you do nothing at all.
This round found out what that fall is, and it is not what it looked like.**

**He is not falling off the board. The board is tipping over and taking him with it.** When he is just riding along the
face with the stick untouched, the board rolls from flat onto its rail — all the way to about **sixty degrees** — and he
stays stood square on it the whole way down. His ankles barely bend: they stay within nine degrees of straight. The old
surfer on the same wave keeps the board at about **eight degrees** and stands up for the whole ride. So the thing to
picture is not a man losing his footing. It is a man standing to attention on a board that is slowly capsizing.

**And it tips over at exactly the speed a broom handle falls over.** I measured how fast the roll runs away: it doubles
about every quarter of a second, which is what a weight your height above your feet does when nothing is holding it. In
other words, once he is stood on it, the board gives him almost nothing to stand on. That is actually true of a real
surfboard too — standing on one is genuinely unstable — so the fix is not to make the board stiffer and call it done.

**The part that matters for your balance idea.** His balance has one thing it can do about this: roll his ankles to push
the board back flat. I tried turning that response up, all the way from off to much stronger than the old surfer's, ten
settings. Here is the problem, and it is the finding of the round: **the harder he corrects, the sooner he falls.** Turn
it up enough to actually hold the board flat and the game calls a fall in **four tenths of a second** — because the
correction itself throws his weight sideways at about 1.4 m/s, and the game's fall test counts how fast his weight is
moving as three quarters of its verdict. So the board tipping over and the fall test are pulling in opposite directions,
and no setting of that one dial gets him both.

**What he never does.** He has hips and arms, which are the strongest thing a person has for not falling sideways — and
in all twelve rides they contribute almost nothing: eight newton-metres at best and a third of a degree of movement. Yet
the fall test is already giving him credit for a hip catch of about a quarter of a metre, twice the width of his feet.
When I forced the response up high enough that his hips did fire, they gave **233 newton-metres** and held the board
flat. **The strength is there and nothing is telling him to use it.** That is the one thing I would do next.

**Five things I checked that are not the cause**, so nobody spends a round on them: giving his ankle more command
authority (it makes the capsize worse, and the trade-off the code was worried about turns out not to matter); the fact
that he stands up square to the deck instead of upright, which starts him with his weight almost over the edge of his
feet — real, and still not the cause; which rate his inner ear is fed; how steep the face is; and where on the face he
starts. He falls twelve out of twelve in every one of those.

**Nothing in this round changes the game.** There is nothing new to ride. The next round has a measured target and I did
not want to guess at it with an hour left.

# Part 22 — the hip's trigger, wired and refuted; and the fall's own gate

Written 2026-11-15 by the build agent (Opus 5, effort high) on branch `claude/rider-new-32x`, cut from `main` at
**9b3bb346** (step 3.2w's merge), so Part 21 above is its base.

Tags as before: [M] measured by a probe here; [R] read in the code; [S] from a source; [I] my inference.

**The round had one job**, in the coordinator's words: *"the fall test credits the hip with 0.169–0.300 m of catch, in
the shipped falls the hip delivers 0–8 N·m, and it is not wired to the capture point at all. The authority is there
and only the trigger is missing. Wire it, measure it, and tell me whether it stands him up."* It is wired. **It does
not stand him up, and the premise behind the brief does not survive the wider population either.** This round ships
**no change to the game** — the shipped rider is identical on all 46 columns of the probe across the twelve runs — and
three new switches, all off, with the measurement that turned each one off.

**Every angle below has its datum stated, as Part 21's lesson requires.** The body's bank and the board's roll are
about the heading **from the world's level**; the rail is that same roll **minus the water's own normal**; the ankle's
span is `bank − roll − rest`. `capPoint` is the centre of mass's own place **across the felt vertical** from the feet's
middle, m, and the feet's half-width across is **0.130 m**.

## 1. The four sentences the round is for

1. **The hip's trigger was missing, wiring it to the capture point works as a control, and the rider still falls 12 of
   12.** The hip is now driven at HIP_CAPTURE_GAIN N·m per metre of `sensedCaptureHip` — the capture point past
   HIP_SHARE × the feet's half-width (0.8 × 0.130 = 0.104 m), delayed BALANCE_DELAY as every other sense is. On the
   16° trim cell it fires in every run of every gain: **35–179 N·m and 0.7–68.8° of swing at 2,000 N·m/m, 112–264 N·m
   at 8,000**, against the shipped **0–8 N·m and 0.0–0.3°** — and it takes the roll down: at 20° of face slope the
   board's rail peak falls from **13.8–34.4° to 5.9–24.4°** at 2,000 N·m/m, 12 runs a cell [M]. The sign is confirmed against its own reverse: at −2,000 N·m/m the rider falls
   **sooner** (0.60–1.25 s against 0.77–1.70) and the capture point runs further out [M]. And **12 of 12 fall at every
   gain from 500 to 8,000 N·m/m** [M].
2. **Paired run for run across five face slopes it makes the fall come sooner, not later.** 60 runs a gain, each one
   set against the same run with the trigger off: at 2,000 N·m/m **20 later, 4 the same, 36 sooner**; at 1,000, 24 / 4
   / 32; at 500, 33 / 9 / 18 [M]. This is step 3.2w's own ankle trade measured on the other limb — whatever limb holds
   the roll adds across speed, and the capture point counts across speed at 1/ω₀, which over these 636 runs is
   **0.22–0.32 m per m/s**. **The fix is not a limb and it is not a gain.**
3. **The 16° acceptance cell is the one cell that flatters the trigger, and it is also the only cell where 3.2w's
   premise holds.** At 16° the trigger is 11 later / 1 same / 0 sooner at 2,000 N·m/m; **at the same gain its four
   neighbouring slopes are 1/2/9 (4°), 1/0/11 (8°), 1/1/10 (12°) and 6/0/6 (20°)**, and at 16° its own neighbouring
   gains are 6/0/6 (1,750) and 4/0/8 (2,250) [M]. And **the shipped hip, with none of this round's wiring, already delivers 15–270 N·m
   and 1.8–68.8° of swing at 4, 8, 12 and 20° of face slope**, through the old ankle-overflow path, opening 0.08–1.87 s
   in — and falls 48 of 48 anyway [M]. 3.2w's "the hip never moves" is true of the 16° cell and of no other cell
   measured. **So the hip firing was never the missing piece: the rider already falls with the hip at 270 N·m.**
4. **The fall's own gate is the centre of mass crossing the edge of the feet, in 635 of 636 falls.** Over every
   new-rider fall this round measured — 53 cells, 636 falls — `|capPoint|` at the fall has quartiles **0.130 / 0.131 /
   0.131 m** against a feet half-width of 0.130; 635 of 636 are at or past it and 543 are within 10 mm of it [M]. The
   fall test is `beyond && weightPast`, and `weightPast` is exactly `|capPoint| > 0.130`: the velocity term decides
   *when*, and the position term decides *that*. **The thing to change is what puts the weight at the edge of the feet,
   which is the board rolling to 60° and taking a body standing square to it along.** That is Part 21 §1.2's plant, and
   of its two named options the limb option is now measured and spent.

## 2. The hip's trigger: what was wrong, and what it does now

**What was wrong, read in the code [R].** `humanBalance.ts`' own header states the design's order of the moves (Horak
and Nashner 1986): *"the ankle first, within the feet; **the hip once the feet's pressure passes HIP_SHARE of their
reach**"*. What `predictiveBank` and `humanBank` implemented was the hip taking what the **ankle's own command angle**
asked past HIP_SHARE × ANKLE_REST_RANGE — 0.8 × 0.25 rad = **11.5°** — of a rest the predictor asks 2.6–14.4° of.
Those are two different quantities: one is a pressure demand in metres against the foot, the other an angle against
the ankle's own travel. `sensedCaptureAcross` existed for the first of them since step 3.2i and nothing read it.

**What is wired now.** `CaptureState.hipPast` is the capture point past HIP_SHARE of the feet's half-width across,
signed board +x, 0 inside; it goes down the same delay line as the other senses and comes back as
`HumanBalance.sensedCaptureHip`; `AttachedRider.hipDrive` turns it into a torque added to the swing rotor's existing
demand. Nothing new pushes on anything: it is the rotor the hip already drove, its reaction is booked on the board
(`rhs[3..5] -= h × swingTorque × rollAxis`) and in the work ledger exactly as before, and the sign follows from row 7
of the solve (`rhs[7] -= h × swingTorque / length`), so a capture point gone to +x is answered by a positive torque,
which pushes the body's centre of mass toward −x. The sign check in §1.1 is the measurement that confirms it.

**When it opens.** On the 16° cell the trigger opens at **0.22–1.02 s** of runs that fall at 0.77–1.70 s, so it has
0.23–0.90 s to work in, which is about one to four times Part 21's single-trace τ of 0.245 s [M, the window; the τ is
Part 21's and stays a single trace]. It is not late. It is not enough.

## 3. The gain ladder, and the cell that flattered it

`ladders.txt` §A in full; here are the paired totals, 60 runs a gain over face slopes 4, 8, 12, 16 and 20°, each run
set against **the same stance and entry speed** with the trigger off:

| hip gain, N·m/m | fell | later | same | **sooner** |
|---|---|---|---|---|
| 500 | 60 of 60 | 33 | 9 | **18** |
| 1,000 | 60 of 60 | 24 | 4 | **32** |
| 2,000 | 60 of 60 | 20 | 4 | **36** |

And at the 16° cell alone, 12 runs a gain: 500 → 8/4/0, 1,000 → 10/1/1, **2,000 → 11/1/0**, 2,250 → 4/0/8, 2,500 →
4/0/8, 3,000 → 5/0/7, 4,000 → 9/0/3, 8,000 → 7/0/5 [M]. **2,000 is a spike and not a plateau**: its immediate
neighbours at 1,750 (6/0/6) and 2,250 (4/0/8) are both worse than the trigger being off. A number that good only at
one gain on one slope is a fit, not a finding, and that is why HIP_CAPTURE_GAIN ships at **0**.

What the trigger does buy, everywhere, is roll: the rail's peak comes down in every cell of the ladder (20°:
13.8–34.4 → 5.9–24.4°; 8°: 12.7–60.0 → 7.3–52.5°) [M]. A roll control that falls sooner is 3.2w §4's finding again,
and now it holds for both limbs, which makes it a statement about the pair — plant and fall test — and not about
either limb's authority.

## 4. The ankle rest's slew bound: 3.2w's attribution, refuted

Part 21 §4 named the unbounded rest as the mechanism behind its gain-3 cell's 0.38–0.43 s falls: the rest slewed
0.29 rad in 0.2 s and threw the centre of mass across at 1.44 m/s. `HumanBalance.lagRest` now takes a slew bound.
On **3.2w's own gain-3 law**, where the mechanism was diagnosed, 12 runs a cell:

| ANKLE_RATE, rad/s | fell at | the rail's peak | the ankle's torque peak |
|---|---|---|---|
| ∞ (3.2w's) | 0.38–0.43 s | 4.9–9.8° | 181–290 N·m |
| 4 | 0.38–0.43 s | 4.2–9.8° | 170–258 N·m |
| 1.5 | **0.38–0.45 s** | 3.5–8.0° | **59–162 N·m** |
| 0.5 | 0.42–1.30 s | 3.8–61.4° | 75–192 N·m |

**At 1.5 rad/s the bound takes the ankle's peak torque from 181–290 to 59–162 N·m — into a human's own band — holds
the rail to 3.5–8.0°, and leaves the fall time unchanged.** So the slew is not what fires that fall; something else at
0.4 s is, and 3.2w's §4 mechanism is refuted as the cause while its arithmetic stands as a description. On the shipped
predictor the bound changes nothing at all: 0.77–1.70 s at 0.5, 1.5, 4 and ∞ rad/s, the same twelve runs [M]. At
0.5 rad/s the bound loses the roll (rail to 61.4°) and with the hip's trigger on it is worse still. **A real ankle has
this bound and this is where it goes; nothing measured here turns on it, so it ships at ∞ and the switch stays.**

## 5. The deck's roll in the ankle's rest: the most ordinary stance there is, and it is not enough either

The owner's rule is that a stance a real surfer would reach for must be rewarded, and the most ordinary stance there
is, is standing plumb. 3.2w measured the new rider's ankle span at **0.3–1.6° median on a deck rolled 8.8° and
climbing** — a body square to a capsizing deck — against the old rider, whose body holds **0.8–3.3° of the world
vertical** while the deck sits at the face's own tilt. A person stands plumb on a slope by opening the ankle by the
slope's angle, and nothing in the new rider's rest carries the deck's roll [R]. `ANKLE_PLUMB` adds it, 12 runs a cell:

| plumb share | fell at | the body's bank peak | the ankle's span, median / peak |
|---|---|---|---|
| 0 (shipped) | 0.77–1.70 s | 20.7–65.7° | 0.3–1.6 / 2.7–9.5° |
| 0.5 | 1.00–6.73 s | 17.2–70.0° | 1.2–4.6 / 7.0–54.9° |
| 1 | 0.53–4.32 s | **12.1–34.6°** | **3.8–7.8 / 10.2–22.3°** |
| 1, with the hip's trigger at 2,000 | 0.48–1.68 s | 12.5–38.1° | 2.7–6.1 / 8.4–20.3° |

It does what it is supposed to: the ankle opens and the body's bank peak comes down by a factor of two. **12 of 12
still fall**, the earliest sooner than the shipped rider's, and with the hip's trigger as well it is worse. The reason
is a ceiling that is itself physical: the rest is clipped at ANKLE_REST_RANGE, **14.3°**, so the ankle can hold a body
plumb on a deck up to 14.3° of roll and no further — and the capsize goes to 60°. Past 14.3° the hip must take over,
which is exactly the design's order, and §3 is what the hip can do about a 60° deck.

## 6. What I will not claim

- **I will not claim the hip's trigger is wrong, only that it does not pay.** It is the signal this design named, it
  fires when it should, its sign is verified and it lowers the roll in every cell. What it does not do is stand the
  rider up, and on 36 of 60 paired runs it costs time. Both halves are measured.
- **I will not claim the fall test is wrong.** At the fall the centre of mass is at the edge of the feet and moving
  across it at a median of **1.21 m/s over all 636 falls** (0.19–3.13 m/s; `capSpeed` × ω₀ run by run, which is the
  across speed the capture point was built from) [M]. A surfer whose weight is off the edge of his feet at better than
  a metre a second is going down. The test's verdict looks right; what is wrong is upstream of it.
- **I will not claim a toppling rate on a population.** I built a log-linear fit of the rail's growth into the probe
  to give Part 21 §1.2's one-trace 4.07 /s a population, and **took it out again**: windowed from the start it reads
  8.15 /s on the new rider and **9.05 /s on the old rider, who stands for the whole nine seconds**, so it was fitting
  the mount's contact transient and not the capsize. One weak number is not improved by replacing it with another.
  Part 21's 4.07 /s remains a single trace, and is still the only fit there is.
- **I will not claim that top-heaviness alone predicts the fall, which is a caution on my own §1.4.** Over the 636
  runs, Compress carries the centre of mass **0.502–0.784 m** over the feet and tall **0.597–0.848 m** — 25–30 % less
  m g h in the lower stance — and the two fall identically: **318 of 318 each, median 1.02 s against 1.00 s** [M]. So
  "the plant is two to four times too top-heavy for its hull" is the right ratio to quote and the wrong thing to tune:
  taking a quarter of the height out changes nothing measurable here. What the plant's round has to change is the
  hull's own roll restoring, not the rider's height, and the number it needs is a *measured* hull roll spring under
  this rider, which neither 3.2w (read from `PLANT_SPEEDS`) nor this round has.
- **I will not claim the two riders' falls are comparable**, and Part 21's asterisk stands untouched: the new rider's
  twelve are the capture point's, the old rider's three are grip-bound, and `postureError` reads 0.000 m for both.
- **I will not claim this is the owner's fall.** Every drift peak measured this round is inside 5°; nothing here
  slides out sideways. The balance HUD is the instrument for that.
- **The `FaceWater` is a fit to Canyon, not Canyon**, and the rider is placed, not paddled in: the first ~0.17 s of
  every run carries a contact transient. Twelve runs a cell, two stances, five face slopes — every span above is the
  whole population, not a confidence interval.

## 7. Seatbelts

- **The game is unchanged.** All three switches ship off (HIP_CAPTURE_GAIN 0, ANKLE_REST_RATE ∞, ANKLE_PLUMB 0), and
  the shipped rider was measured against 3.2w's own rows: **identical on all 46 shared columns across the twelve
  runs** of the trim cell.
- `npx tsc --noEmit -p .`: **exit 0**, read from `tsc`'s own exit status on its own line, never through a pipe.
  `npx tsc --noEmit -p server/tsconfig.json`: **exit 0**. The root project includes only `src`, so the probe was
  type-checked separately on a throwaway project extending the root's options: **exit 0**.
- The rider, board, HUD and runner test files run alone, `PhysicalMode` (`src/game/`), `RideHud` (`src/ui/`) and
  `SurfZoneRunner` (`src/wave/`) included — the last is outside the merge suite, so a red there is news.
  `results/32x/suite-rider-32x.txt`. `src/wave/SurfZoneSimulation.test.ts` is deliberately not in it
  (`c2-step5g.md` §7.4).
- **The Canyon bench, all four hashes**: `results/32x/canyon-bytes-32x.txt`, the same command and reference as step
  5f's and 3.2t–3.2w's — Canyon B `a367d938f15fa934` / `9e5831f80e38abd9`, default Canyon `ea3d57a4d49f4b48` /
  `a1a2555739210f96`.
- **The default board**: `boardShape.ts` is untouched and the default rider's path is untouched, so the default board
  is unchanged by construction; the four Canyon hashes are the check that says so.
- **The deletions column, checked before the push**: `git diff --stat origin/main HEAD`, deletions read off the
  summary line. It has caught a silent revert on five consecutive rounds.
- No force was added or removed. The hip's swing rotor is the limb it always was, with its reaction on the board and
  in the work ledger; nothing restores without a source.
- **The rebase, and why nothing was inherited across it.** The deletions column earned its place for the fifth round
  running. With the work committed, `git diff --stat origin/main HEAD` showed **1,178 deletions across 35 files** of
  the wave track's — `c2-step5i.md`, its runs and stills, and **`src/scene/water/foamAlbedo.ts` (−159) and its test
  (−165)**: the wave track had merged C2 step 5i (`origin/main` **b73b8eb6**) while this round ran, and the branch,
  being behind, would have reverted it. Rebased onto b73b8eb6; no conflict, and the column is back to **10 files,
  1,607 insertions and 16 deletions, every one of them a line this round replaced** (checked line by line:
  `git diff --cached -- src/ | grep '^-'`). 5i moves `src/scene/WaterSurface.ts` and `src/scene/FarFieldOcean.ts`, and
  **both are inside `m1-cpu-bench.ts`'s own bundle**, so the Canyon run already going was killed by process group and
  re-run from fresh spin-ups on the rebased tree; both `tsc` runs, the probe's type-check, the suite and the
  default-identity check were all re-run there too, and the numbers above are that tree's.

## 8. Files (3.2x)

- `src/physics/humanBalance.ts`: `CaptureState.hipPast`, a fifth delay-line channel and `sensedCaptureHip` (the hip's
  trigger); `lagRest` takes a slew bound. No default behaviour changed.
- `src/physics/AttachedRider.ts`: `hipDrive` adds the trigger's torque to the swing rotor; the ankle's rest takes the
  deck's roll by `ANKLE_PLUMB` and its slew by `ANKLE_REST_RATE`; three `balance` options for the probes. All three
  constants are 0 / ∞ / 0, each with the measurement that set it there in its own comment.
- `docs/research/new-rider/3.2/trimbank.ts`: `HIP_GAIN`, `ANKLE_RATE` and `PLUMB` switches, and the hip's own columns
  (the trigger's signal, when it opened, when the swing passed 20 N·m).
- `docs/research/new-rider/3.2/results/32x/`: `cells.txt` (the shipped rider, the old rider, the twelve-gain ladder),
  `ladders.txt` (the paired slope ladder, the fall's gate over 636 falls, the slew ladder, the plumb ladder, the
  shipped hip by slope), `rows.jsonl` (648 rows), two frame traces, `suite-rider-32x.txt`, `canyon-bytes-32x.txt`.

## 9. For the owner, in plain words

**Last round found that your surfer's board tips over and takes him with it, and that his hips — the strongest thing a
person has for not falling sideways — were doing nothing. This round gave his hips the right thing to listen to. They
now fire hard, 35 to 264 newton-metres, and they do flatten the board. He still falls every time.**

**And the reason is worth knowing, because it closes off a whole direction.** When I checked the same rider on gentler
and steeper faces, it turned out his hips were *already* firing on four of the five slopes I tried — up to 270
newton-metres, without any of my changes — and he falls on all of those too. The one slope where his hips were silent
happens to be the one we have been testing on. So "his hips weren't working" was true of our test wave and of nowhere
else, and fixing it was never going to be the answer.

**What the fall actually is, now measured over 636 of them.** The game calls a fall when the surfer's weight crosses
the edge of his feet. In 635 of those 636 falls, his weight is within a hair of exactly that edge at the moment it is
called — so it is not a judgement call or a tuning threshold, it is a line he crosses. And he crosses it because the
board rolls over to sixty degrees while he stands square on it. **Every correction I can give him makes it worse in the
same way: to pull his weight back he has to move it, and moving it fast is itself the thing the test counts.** Turn his
ankle up — last round — and he falls sooner. Turn his hips up — this round — and he falls sooner on 36 of 60 rides.

**I also tried the most obvious thing a real surfer does: stand upright instead of square to a tilted board.** His
ankles currently bend about one degree on a board tilted nine. Making him stand plumb halves how far his body leans
over — a real improvement — and he still falls every time, because his ankle can only take up about fourteen degrees
of tilt and the board goes to sixty.

**So: nothing to ride this round, and the game is byte-for-byte what you have.** What is now settled is that the
surfer's limbs are not the problem — I have now tried both of them, hard, and both make it worse. The board is: it
gives him two to four times less to stand on than his own weight needs. **One caution on that, and it is my own
measurement against my own conclusion**: I compared his crouched stance, which carries his weight a quarter lower,
against his tall one over all 636 rides, and they fall at exactly the same rate. So it is not simply "he is too tall
for the board" — it is the board's own tendency to roll, which is the next round and the one thing last round left on
the table.
