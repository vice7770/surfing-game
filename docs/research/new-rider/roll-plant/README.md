# The board's roll–yaw plant (ruling 29e)

Written 2026-11-13 by the plant agent (Opus 5.5, effort high), on branch `claude/roll-plant` from main 0403a19f.
No change to `src/`. Probes and this note only.

Tags: [M] measured by a probe here; [R] read in the code; [S] from a source, with a link; [I] my inference.

All numbers come from analytic flat water. No ride session, no catch report, no autopilot ride, no game page.

## 1. Short answer

- **The water does not over-respond.** With a rigid rider the board turns 0.017–0.029 rad/s per degree of rail
  (5–9 m/s). The turn's pull is 0.83–0.93 of the rail (G). A coordinated turn, where the tilted lift alone pulls the
  turn, is G = 1. So the hull turns slightly less than the tilted lift asks, not 3 times more. [M]
- **It is fast.** Half of the pull comes at once (the lift tilts with the board). The rest follows in 0.05–0.07 s.
  The yaw rate overshoots 2–4.6 times its steady value in the first 0.03–0.1 s, then settles. [M]
- **The 3.2 delayed model with the measured water plant is damped:** +0.175 at 0.79 Hz (bank gain 0.25, rate gain
  0.15 s), gains ×0.75–1.41, delay up to 0.15 s. With 3.2's plant it was +0.037. [M, model]
- **The carve lab's G of 1.3–1.6 (the number 3.2 used) is not the water.** I reran the carve lab's test today: it
  still gives 1.32–1.63. Its extra pull comes through the held rider's feet: at 7 m/s and 2.7° of rail the feet turn
  the board with 9.5 N·m, and the fins resist with 9.5 N·m. Most of it is the hull's drag (carried by the body) passing
  through a centre of pressure 5 cm off the stringer. [M]
- **What over-responds is a coupling term, not a water term:** the along-board force the feet carry (about the whole
  hull drag, 0.2 g) acting at the feet's centre of pressure off the stringer. Each cm of offset gives 1.5 N·m of yaw at
  7 m/s. The board meets it only with its fins (89 % of its yaw damping) and its own 0.45 kg·m² of yaw inertia: the
  rider adds none (`AttachedRider.ts` 1301, "a point mass; its own spin is not modelled"). 3 cm of offset yaws the
  board at 0.12 rad/s within 0.03 s. In 3.2's carve trace the centre of pressure moved 1.7–7.5 cm. [M, I]
- **So I propose no water-force fix.** Section 6 gives the one water lever that would help (hull yaw damping), with
  its cost, but it has no source and it is not the cause. The orchestrator's call.

## 2. The lab (`plant.ts`)

- The real `BoardBody` with a rigid rider as fixed payload masses (no `AttachedRider`), 32 substeps, on flat still
  water. 73 kg, centre of mass 0.915 m over the bottom and 0.30 m behind mid-length (where the old rider sits in a
  7 m/s glide, `scout.probe.ts`).
  - `point`: one point mass. This is the game's riders' yaw inertia (none of their own).
  - `human`: the same mass spread to give a standing human's own inertia (roll 10, yaw 2, pitch 10 kg·m²; values from
    body-segment tables, recalled, de Leva 1996). Used as a check only: its trim settled less well.
- Held each substep, as asked: the tow (the centre's level speed), the roll about the board's own long axis, the yaw
  rate, the slip, a roll rate about the deck, a push at the deck.
- **The ledger:** every water force and moment on the board, split by contributor, exactly as the solver applies it
  (each patch's explicit force plus its implicit share after the solve). Parts: hull pressure (left and right half),
  buoyancy, friction, radiation and entry (a damping), added-mass reaction (inertia), each fin, each rail's side faces,
  and the patches inside the wetting ramp (`WET_RAMP`). Closure check (`check.probe.ts`): on a free board the parts
  plus the weight match the momentum change within 0.3 N and the angular momentum change within 0.3 N·m. [M]
- The board starts from a 2.5 s towed straight glide (trim 19.3° at 5 m/s, 9.2° at 7, 5.7° at 9; draft 21.5, 9.1,
  4.5 cm).

## 3. The measured table (rigid point rider; `results/plant-point.jsonl`)

Signs: roll + = left rail up; "into the low rail" is reported positive.

### 3.1 Roll steps held, yaw and slip free (the turn per degree of rail)

| Speed | Yaw rate per ° (steady) | Coordinated g/V per ° | G steady | Pull at once | Pull 63 % of the rest | Yaw-rate peak per ° (when) | Settled |
|---|---|---|---|---|---|---|---|
| 5 m/s | 0.0286 rad/s | 0.0342 | 0.83 | 0.49–0.51 | 0.067 s | 0.131 (0.05–0.1 s) | swings, about 0.5 s |
| 7 m/s | 0.0214 | 0.0245 | 0.88 | 0.57–0.63 | 0.050 s | 0.058 (0.03–0.05 s) | 0.12 s |
| 9 m/s | 0.0172 | 0.0190 | 0.90 | 0.52–0.60 | 0.05–0.07 s | 0.036 (0.02–0.05 s) | 0.12 s |

- Linear from 0.5° to 5° (the gain per degree changes under 3 %). [M]
- The yaw rate reaches 63 % of its steady value in the first frame (under 0.017 s) at every speed: it is the heel's
  yaw moment acting before any slip (3.3). [M]
- The steady slip is tiny: 0.02–0.03° per degree of rail. [M]
- Rider placed 0.10–0.40 m behind mid-length: G 0.81–1.0 (`results/step-z.jsonl`; 0.40 m at 5 m/s stalls). [M]
- Human inertia (`results/plant-human.jsonl`): the same steady gain at 5 and 7 m/s (G 0.83, 1.18); the peak comes
  later (about 0.1 s). Its trim did not settle well at 9 m/s (0.1°), so its 9 m/s row (G 0.6) is not trusted. [M]

### 3.2 The captive derivatives (roll, slip and yaw rate held; per rad; the yaw moment N, side force Y)

| Speed | N per rad of roll | Y per rad of roll | N per rad of slip | Y per rad of slip | N per rad/s of yaw | Y per rad/s of yaw |
|---|---|---|---|---|---|---|
| 5 m/s | −98 N·m | −361 N | −29 N·m | 705 N | −3.3 N·m·s | 37 N·s |
| 7 m/s | −105 | −413 | −296 | 1398 | −13.1 | 63 |
| 9 m/s | −122 | −418 | −573 | 2235 | −21.5 | 86 |

(N per rad of roll is into the low rail; Y per rad of roll is toward the low rail.)

### 3.3 The split by contributor (7 m/s; 5 and 9 m/s alike unless said)

- **Heel yaw moment, per degree of rail (−1.83 N·m):** hull pressure −1.57 (86 %; the low half gains drag, the high
  half loses it), fins −0.69 (38 %), friction +0.42 (−23 %, resists), rails 0, buoyancy 0. [M]
  - The fins' part: rolling a board trimmed at 9° turns the upflow under it onto the fins. They see θ·φ of attack,
    0.16° per degree of roll at 7 m/s. [M, I]
  - The wetting ramp's patches (`WET_RAMP`, `hullForces.ts` 77) carry moments of ±1–10 N·m that nearly cancel; their
    net is not one-signed across speeds. The ramp is not the source. [M]
- **Heel side force, per degree (−7.2 N):** hull pressure −11.3 (the lift tilted: W·φ is −12.9), fins +3.7 (resist),
  rails +0.3. [M]
- **Slip:** fins carry 92 % of the side force and 99 % of the yaw moment; the rails' side faces 6 %; the hull bottom
  under 1 %. [M]
- **Yaw rate:** fins 89 % of the yaw damping; pressure, rails and friction 3–4 % each. [M]
- **At 5 m/s** the weathercock moment per slip is 10 times smaller (−29 against −296). The board trims at 19°, so with
  the centre of mass 0.9 m up, the fins sit almost under it in plan view. That is geometry, not a coefficient. [M, I]

### 3.4 Roll: stiffness and damping from the water

- **Roll damping about the deck** (a roll rate held about the deck under the rider, `rollRate-deck`): 11.9 / 16.3 /
  19.8 N·m·s/rad at 5 / 7 / 9 m/s. Split: hull pressure 59–62 %, radiation and entry 24–29 %, fins 12–14 %, rails 0. [M]
  - A strip-theory check, ½ρ C_n V A_wet b²/12 with the hull's own C_n 0.46: 11.9 N·m·s/rad at 7 m/s against the
    measured pressure part 9.9. So the planing law's lift damping is in place. [I]
  - **3.2's model assumed 0.05 × K = 43–83 N·m·s/rad, 3–5 times the water's.** [R, M]
- **Roll moment with the load leaning with the board** (roll held, the rigid rider tilts with it): the water rights the
  board about the deck by 222 N·m/rad at 7 m/s (239 at 5, 278 at 9) at 1°; it falls to 95–193 at 5°. A rigid 73 kg body
  0.85 m up overturns it by 609 N·m/rad. So a rigid rider must steer to stay up. [M]
- **Yaw from roll rate** (about the deck): −1.8 / +2.5 / +4.8 N·m·s/rad at 5 / 7 / 9 m/s (fins: they sit 0.13 m
  below the deck and sweep sideways). At 1.5 Hz this adds up to a quarter of the heel moment, with a phase lead. [M]
- **Free roll decay from 3°** (rigid rider, the tow on): [M]

| Rider | Yaw | 5 m/s | 7 m/s | 9 m/s |
|---|---|---|---|---|
| point (the game's) | free | grows, past 45° at 1.6 s | 0.95 Hz, ζ −0.02 | 0.88 Hz, ζ +0.08 |
| point | held | falls over (static) | falls over | falls over (slowly) |
| human inertia | free | falls over at 2 s | 0.38 Hz, ζ −0.15 | irregular |
| none (board alone) | free | 4.4 Hz, ζ 0.28 | 6.3 Hz, ζ 0.35 | 4.1 Hz, ζ 0.54 |

  - With yaw held, a rigid rider always falls: the water's righting (about 220 N·m/rad) is under m g h (609). With yaw
    free, the roll–yaw coupling steers the board under the body: a bicycle-like weave at about 0.9 Hz, neutral at
    7 m/s. This is a slow mode a balancing rider must damp. [M, I]

### 3.5 A yaw-rate kick of 0.2 rad/s at zero roll

| Speed | Roll held: to 37 % | Roll free: to 37 % |
|---|---|---|
| 5 m/s | 0.05 s (then swings) | 0.10 s |
| 7 m/s | 0.033 s | 0.067 s |
| 9 m/s | 0.017 s | 0.05 s |

With human yaw inertia: 0.117 / 0.067 / 0.05 s held. [M]

## 4. Where the 3.2 numbers came from

- **The carve lab's "under a couple" rerun today** (`couple.probe.ts`, `results/couple.jsonl`): G 1.63 / 1.45 (5 m/s),
  1.34 / 1.32 (7), 1.57 / 1.53 (9), the same as on 2026-09-27. Its yaw rate first goes the wrong way (−0.03 to
  −0.07 rad/s in 0.05 s), then overshoots 2–4 times. [M]
- **Its split** (`heldsplit.probe.ts`, `results/heldsplit.jsonl`): at the steady turn the water's yaw moment on the
  board is −7.6 to −10.8 N·m (fins, resisting), and the rider's contact gives +7.6 to +11.3 N·m. At 7 m/s: the feet's
  centre of pressure sits 5.1 cm toward the high rail (the board rolled under an upright body) and 6.4 cm behind the
  board's own centre. The forward force through the feet (the hull's drag, about 150 N, carried by the body: the tow
  pulls the body) gives about 7.4 N·m; the body's centripetal force at the feet's station about 2.8 N·m. Sum 10.2,
  measured 9.5. [M, I]
- **The same force on the rigid-rider board** (`cop` part, `results/cop.jsonl`): 0.2 g forward at the deck, 1 or 3 cm
  off the stringer, roll held. [M]

| Speed | 1 cm (1.5 N·m): peak yaw rate (when), then | 3 cm (4.4 N·m) |
|---|---|---|
| 5 m/s | the board spins out (weathercock too weak at 19° trim) | spins out |
| 7 m/s | 0.040 rad/s (0.03 s), then 0.004–0.006 | 0.121 (0.03 s), then 0.012–0.018 |
| 9 m/s | 0.026 (0.017 s), then 0.005 | 0.077 (0.017 s), then 0.014 |
| 7 m/s, human yaw inertia | 0.026 (0.1 s) | 0.077 (0.1 s) |

- **3.2's carve trace** (`../3.2/results/trace-carve-tall.jsonl`): the centre of pressure across went 0 → 1.7 → 4.2
  → 7.5 cm (toward the board's left, 2.68–2.88 s) while the yaw rate reached −0.52 to −0.54 rad/s (to the right) at
  under 1° of rail. The water gives 0.02 rad/s per degree of rail (steady) and 0.06 at the peak. The sign fits the feet:
  a forward force at the left turns the nose right. A 1.7–4.2 cm offset gives a quasi-static yaw rate N / N_r of
  2.5–6.3 N·m over 13 N·m·s/rad, 0.2–0.5 rad/s; the body's lateral push adds more. The order matches the trace's
  0.55. [I]
- So the "turn 3 times the rail" that 3.2's model fitted is the feet steering the board through their centre of
  pressure, not the hull's response to the rail. [I]

## 5. Sources

Measured, sourced and inferred are kept apart. Most primary papers would not open (403, paywalls, or PDFs the fetch
tool could not read); where I could not read a number, I say so.

- **Planing hulls heeled and yawed: measured side force and yaw moment.** Brown, P. W. and Klosinski, W. E., 1994,
  "Directional stability tests of two prismatic planing hulls", Davidson Laboratory, US Coast Guard report
  CG-D-11-94 (https://apps.dtic.mil/sti/pdfs/ADA282728.pdf). The report exists and measures side force and roll,
  pitch and yaw moments against heel and yaw. **I could not open it (403): no numbers.** Lewandowski (1996, J Ship
  Res 40(2)) built a coupled yaw–sway–roll model on this data (recalled, not read). [S, no numbers]
- **Heel turns a hull, and the sign is disputed outside planing.** A search found heel-induced sway force and yaw
  moment work on high-speed craft (Springer, J Mar Sci Technol 2019, https://link.springer.com/article/10.1007/s00773-019-00637-0;
  paywalled) and canoe and ship sources that disagree on the sign. **No planing-board number per degree.** [S, no numbers]
- **Planing-hull roll damping: the lift term dominates at speed.** Ikeda, Y. and Katayama, T., 2000, a quasi-static
  method for the lift part of roll damping (cited in later planing papers; not read). Katayama, T., Fujimoto, M.,
  Ikeda, Y., 2006, "A study on transverse stability loss of planing craft due to lift force caused by super high
  forward speed", J JASNAOE 3:215–223 (https://www.jstage.jst.go.jp/article/jjasnaoe/3/0/3_0_215/_article/-char/en):
  towing tests; the hydrodynamic roll moment changes with the running attitude at speed (qualitative in the abstract).
  The game's pressure law contains this lift damping, and a strip-theory check matches it (3.4). [S qualitative, I]
- **Surfboard fins.** Falk, S., Kniesburges, S., Janka, R., Grosso, R., Becker, S., Semmler, M., Döllinger, M., 2019,
  "Computational hydrodynamics of a typical 3-fin surfboard setup", J Fluids Struct 90:297–314
  (doi 10.1016/j.jfluidstructs.2019.07.006; https://cris.fau.de/publications/223556650): RANS/URANS at 5 m/s, 0–45°;
  lift rises to an optimum, separation and shedding above about 20°. **The per-degree lift was not readable.**
  Brandner, P. A. and Walker, G. J., 2004, "Hydrodynamic performance of a surfboard fin", 15th AFMC, Sydney
  (https://people.eng.unimelb.edu.au/imarusic/proceedings/15/AFMC00105.pdf): cavitation-tunnel lift and drag; **the
  PDF did not decode, no numbers.** The game's fins use Helmbold's slope, 1.97 /rad for their aspect ratio 1.39
  (`finForces.ts` 106); the whole set gives 1290 N/rad at 7 m/s (22.5 N per degree of slip) [M]. Not checked against
  data. [S, no numbers]
- **Surfboard turning.** Benjamin, R., 2026, UC Santa Cruz master's thesis, as reported by Santa Cruz Works
  (https://www.santacruzworks.org/news/the-physics-of-feel-a-ucsc-thesis-puts-numbers-to-a-surfboards-soul): wave-pool
  tests and CFD at about 6 m/s; forces peak near 35° of roll and 45° of yaw; a vee bottom gives "more negative roll
  and yaw moments" than a single concave, 2–4 % in lift and moments, 3–5 % in drag. **No N·m values published.** [S]
- **Real carves pull about 1.5 of the rail:** Forsyth et al. 2024, bottom turns at 1.9 rad/s on a 42° rail
  (`../../carve-lab.md`): G = v ω/(g tan φ) ≈ 1.5 at about 7 m/s. That is at big rails, where the rail's rocker carves;
  at 1–5° no source. [S via the repo, I]
- **Windsurf and kitesurf boards:** I found nothing with numbers. [—]
- **The bicycle analogue:** Meijaard, J. P., Papadopoulos, J. M., Ruina, A., Schwab, A. L., 2007, Proc R Soc A 463:1955–1982
  (recalled): the weave mode, and self-stability only in a speed window. Here the rigid rider on the free board shows
  the same kind of weave (3.4). [S recalled]

## 6. The over-responding term, and fixes

**Named term (coupling, not water):** the along-board force the feet carry, acting at the feet's centre of pressure off
the stringer, on a board whose yaw only the fins resist.
- Where: the contact's line through the centre of pressure (`AttachedRider.ts` 3823, 3865, 3880 set it; the standing
  couple `coupleStanding` 3284). The body is a point mass with no yaw inertia (`AttachedRider.ts` 1301). The board's
  yaw damping is the fins' (`BoardBody.ts` 784; `finForces.ts` 106).
- Size [M]: 1.5 N·m per cm at 7 m/s; 3 cm → 0.12 rad/s in 0.03 s. The hull's own heel moment is 1.8 N·m per degree.
  So 1 cm of the feet's centre of pressure turns the board about as hard as 1° of rail, and much faster.
- Physical? The mechanism is real (a surfer steers with foot pressure). What looks wrong is how fast the board answers:
  its yaw time constant I/N_r is 0.45/13 = 0.035 s at 7 m/s, because the rider adds no yaw inertia. With a human's
  1.5–2.5 kg·m² it would be 0.15–0.2 s, near the balance delay, as on a bicycle. [I]

**Water-force fixes: none proposed.** The water's numbers are in the physical range: G 0.83–0.93 (coordinated turn 1),
the lift's roll damping matches strip theory, the fins' slope is Helmbold's.

**The one water lever, if one is wanted (not recommended without a source):** a hull yaw damping from the bottom's
cross-flow (today the hull gives under 5 % of the yaw damping and 1 % of the side force; the fins give the rest).
- What it would change [I]: N_r up, the quasi-static yaw per cm of the feet's offset down in proportion; the steady
  turn per degree of rail unchanged (it is set by the tilted lift).
- The model cannot rate it: 3.2's roll model has no yaw state. No size is sourced (Brown and Klosinski would give it;
  not readable). Its reach would be every rider and every spot; it would need an A/B switch and the owner's ride.

**The 3.2 model rerun** (`model.probe.ts`, `results/model.jsonl` and `model-sweeps.jsonl`; delay 0.10 s, motor lag
0.05 s; plants K 860–1650, h 0.5–0.79 m, I_b 0.03–0.3, 1–1.4 g; best gains on 3.2's grid) [M, model]:

| Plant | Least damping | Best gains (bank, rate) | Gain margin | Delay holds to |
|---|---|---|---|---|
| 3.2 as built (G 1.3–1.6, none at once, lag 0.035 s, C 0.05 K) | +0.037 at 0.89 Hz | 0, 0.10 s | ×0.82–1.41 | 0.115 s |
| 3.2, G 3 | +0.150 at 0.69 Hz | −0.75, 0 | ×0.75–1.0 | 0.185 s |
| **Measured water** (G 0.83–0.93, 0.55 at once, lag 0.05 s, C 12–20) | **+0.175 at 0.79 Hz** | 0.25, 0.15 s | ×0.75–1.41 | 0.15 s |
| Measured pull, 3.2's damping | +0.285 | 0.25, 0.15 s | ×0.75–1.8 | 0.185 s |
| 3.2's pull, measured damping | −0.020 | — | — | — |
| G 1.3, 63 % at once, C 12–20 | +0.216 | 0, 0.10 s | ×0.28–1.98 | 0.18 s |
| G 1.6, 63 % at once | +0.318 | −0.25, 0.05 s | ×0.34–1.16 | 0.28 s |
| G 0.5 (scaled), C 12–20 | −0.020 | — | — | — |

- The share of the pull that comes at once matters more than its size. 3.2's model put all of it behind a lag.
- **No plant in this model reproduces the game's growing 1.1–1.9 Hz mode.** The model has no yaw and no sway, and the
  feet's centre of pressure does not steer in it. That is where 3.2's mode lives. [I]

## 7. What is unsure

- The coupling numbers come from the **old** rider held (`HeldRider`). The new rider's code is not on main, so I could
  not split its contact. The link to 3.2's 0.55 rad/s is an estimate (section 4).
- How much of the held rider's drag through the feet is real: on a wave the drive comes through the body (gravity), on
  flat water the body's inertia. Both pass the feet. Where the centre of pressure sits across is the rider's choice:
  rolling the board with the ankles puts it on the low rail, and then this moment turns the board the other way.
- The hull's yaw damping and side force from the bottom (near zero here) have no source to check against.
- The rigid rider's trim (19° at 5 m/s with the tow through the centre of mass) is higher than the old rider's on the
  terminal plane (15.5°). The 5 m/s weathercock numbers depend on it.
- The human-inertia payload settled poorly in pitch at 9 m/s; its 9 m/s rows are not used.
- Sources: no paper gave a number per degree for a planing board's heel yaw, side force or roll damping.

## Files

- `plant.ts`: the lab (rigid riders, holds, the contributor ledger). `check.probe.ts`: the ledger's closure.
- `plant.probe.ts`: `PART=captive,step,decay,kick,push,cop`, `RIDER=point|human`, `SPEEDS=5,7,9`, `RIDER_Z`,
  `TRACE`. From the repo root:
  `OUT=/tmp/out.jsonl PART=step npx vitest run --config docs/research/new-rider/roll-plant/vitest.probe.config.ts roll-plant/plant.probe`
- `couple.probe.ts`: the carve lab's couple test today. `heldsplit.probe.ts`: its water against the feet.
- `model.probe.ts` (`SWEEP=damping,lag,gain,instant`, `CASES`, `DELAY`) on `rollModel32.ts` (3.2's `rollModel.ts`
  from `claude/rider-new-32` f894d23d, copied unchanged).
- `scout.probe.ts`: where the old rider sits on the board.
- `results/`: `plant-point.jsonl`, `plant-human.jsonl`, `step-z.jsonl`, `couple.jsonl`, `heldsplit.jsonl`,
  `cop.jsonl`, `model.jsonl`, `model-sweeps.jsonl`.
