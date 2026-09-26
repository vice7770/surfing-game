# Breakline: surf-science grounding for gameplay mechanics

Research date: 2026-09-26. Scope: numbers and mechanisms from real studies to set targets, ranges and validation checks for a physics-first surf game (Boussinesq surf zone, 1.778 m / 25.75 L / 2.54 kg thruster, Savitsky planing, 73 kg rider coupled through feet and hands).

The sources already cited in the project (Borgonovo-Santos 2021 pop-up, Van Der Sandt 2026, Volschenk 2021, Kimura & Kakinuma 2015, Sheppard 2012/2013, Connellan 2026, Oggiano & Pierella 2018, D'Ambrosio 2020, Falk 2019, Kniesburges 2025, Shormann & in het Panhuis 2020, Lestrade 2015, Whitting 2024, Bruton 2017, Williams & Knight 2010, Landell-Mills 2021, Feddersen 2023, Hutt/Black/Mead) were not researched again. Nothing I found contradicts them. Three notes:
- A second 2021 paper by Borgonovo-Santos et al., on paddling fatigue, is new and is cited in section 4.
- Pool sprint-paddle speeds vary between studies (1.5–1.9 m/s). The reasons are the board, the distance, and how speed was measured.
- The peel-angle geometry in section 1 matches the Hutt et al. skill limits (~27–30° for experts), given the measured top speeds.

Source-type tags: **[P]** peer-reviewed primary study · **[R]** review · **[M]** theoretical/numerical model · **[T]** thesis or technical report · **[I]** industry/rulebook/manufacturer · **[A]** anecdote/coaching media · **[D]** derived by me from the cited numbers (arithmetic shown; treat as an estimate, not data).

---

## 0. The numbers most likely to change a design choice

| Quantity | Value | Source |
|---|---|---|
| Share of session spent riding | 2.5–8% (paddling 42–54%, stationary 28–53%) | several GPS/video studies (section 1) |
| Ride duration | mean 10–22 s; range 1–44 s (pro heats) | Mendez-Villanueva 2006; Barlow 2014; Forsyth 2024 |
| Waves per session | ~5 per 25-min pro heat (2–8); ~20 per hour for recreational surfers | Mendez-Villanueva 2006; Barlow 2014 |
| Ride speed | mean 6.4 m/s, top 9.7 m/s (accomplished surfers); peak 9.3 m/s mean max in competition, 12.5 m/s highest | Forsyth 2024; Farley 2012 |
| Bottom turn | 0.96 s, 99° yaw, 1.9 rad/s, 7.3 m/s, rail 42° → radius ≈ 3.8 m, ≈1.4 g lateral | Forsyth 2024 + [D] |
| Cutback/top turn | 0.96 s, 152° yaw, 3.0 rad/s, 6.7 m/s, rail 75°, pitch 42° → radius ≈ 2.2 m, ≈2.0 g lateral | Forsyth 2024 + [D] |
| Speed kept through a turn sequence | "turn flow" 0.88–0.95 (cutback speed / bottom-turn speed ≈ 0.92) | Forsyth 2024 |
| Paddling | endurance 0.8–1.1 m/s; sprint 1.5–1.9 m/s; cadence 36→54 strokes/min per arm; board pitched 12° nose-up; roll 27→45° per stroke | Nessler 2019 and others |
| Breath-hold | 68 s at rest; 36 s at 20% and 17 s at 50% of peak aerobic power (untrained) | Guimard 2021 |
| Wave sets (my Markov model) | runs of waves ≥ H1/3: 1.2–1.4 waves (wind sea) to 1.7–2.8 (swell); a new group every ~9–21 waves (≈2–5 min at T = 12–15 s) | Kimura 1980 / Longuet-Higgins 1984 + [D] |
| Scores | pro waves with aerials average 7.4; tube rides 6.8; other manoeuvres 5.1. Aerials land only 45–55% of the time vs ~90% for turns | Lundgren 2014; Forsyth 2017 |
| Pumping | no measured surf-pumping study exists. Physics limit: gain per pump ≈ m·Δh·(a_n,high − a_n,low) → ~0.3–0.6 m/s per pump on a curved face, ~0 on flat water | Kogelbauer 2024 model + [D] |

---

## 1. Ride speeds, time-motion and position on the face

### Key numbers

**Time-motion (share of total time):**

| Study | Sample / conditions | Paddling | Stationary | Riding | Other |
|---|---|---|---|---|---|
| Meir et al. 1991 [P] | 1 h recreational, n≈6 | 44% | 35% | 5% | 16% |
| Mendez-Villanueva et al. 2006 [P] | 42 pros, 42 heats of 25 min, video | 51% (25–70) | 42% (23–72) | 4% (2–7) | 2% |
| Farley et al. 2012 [P] | 12 national-level, 20-min heats, GPS+video | 54 ± 6% (+4% paddling for waves) | 28 ± 7% | 8 ± 2% | — |
| Barlow et al. 2014 [P] | 39 recreational, 60 sessions, GPS 1 Hz | 47.0 ± 6.1% | 41.8 ± 9.8% | 8.1 ± 5.3% | 3.1% |
| Secomb et al. 2015 [P] | 15 amateurs, 2-h training, GPS 4 Hz + video | 42.6 ± 9.9% (sprint 4.1%) | 52.8 ± 12.4% | 2.5 ± 1.9% | — |
| Barlow et al. 2018 (via Mejuto 2024) [P] | 22 female competitors, UK, 10 Hz | 30.7% | 62.6% | 6.7% | — |

**Bout structure (Mendez-Villanueva 2006):**
- Per 25-min heat: 26 paddling bouts (15–37), 17 stationary (10–26), 5 rides (2–8), 6 miscellaneous.
- Mean durations: paddling 30.1 s (1–286), stationary 37.7 s (1–413), riding 11.6 s (1–44), miscellaneous 5 s (1–31).
- About 60% of paddling bouts last 1–20 s, as do about 51% of rests.

**Ride duration and distance:**
- Barlow 2014: 13.0 ± 5.0 s, 54.8 ± 25.4 m.
- Barlow 2018 (female competitors): 18.1 ± 12.6 s, 78 ± 80 m.
- Forsyth et al. 2024 (6 accomplished surfers, 227 waves, instrumented boards): 22 ± 1 s, 138 ± 6 m, 3.8 turns per wave.
- Moreira et al. 2020 (smartphone IMU, 5 advanced surfers): wave 9.7 ± 5.4 s; manoeuvre 2.45 ± 0.75 s.
- Farley 2014 (via Mejuto): longest ride per heat 132 m (82–180).

**Waves per session:**
- Pro heats: 5 per 25 min (Mendez-Villanueva 2006); 2.2–7.7 per 20 min (Farley 2018, n = 41 pros, via Mejuto); 7 ± 3 (female competitors, Barlow 2018).
- Recreational: 20.6 ± 11.4 per hour (Barlow 2014).

**Ride speeds:**
- Recreational: maximum 6.1 ± 1.2 m/s (Barlow 2014).
- Female competitors: maximum 6.55 ± 0.97 m/s (Barlow 2018).
- Competitive surfers (Farley 2012): mean maximum 33.4 ± 6.5 km/h (9.3 m/s); highest 45 km/h (12.5 m/s). Whole-heat average 3.7 km/h.
- Competition (Farley 2014): peak 25.2 km/h (19–31); average 16.7 km/h per wave.
- Pro heats (Farley 2018): maximum 18.5–28.3 km/h, average 16.6–20.2 km/h.
- Accomplished surfers (Forsyth 2024): top 9.7 ± 0.1 m/s, average 6.4 ± 0.1 m/s, bottom turn 7.3 m/s, cutback 6.7 m/s.
- Recreational, 2-h session (O'Neill 2021, via Mejuto): peak 31.9 ± 3.5 km/h.
- Historical pitot-tube board (Paine 1974 thesis [T], a few rides at Sydney beaches): 5–10 m/s, typically about 27 ft/s (8.2 m/s) on a ~6 ft (1.8 m) wave.
- The Mejuto 2024 review lists Fernández-Gamboa 2018 "wave velocities" of 0.5–0.6 m/s. These cannot be ride speeds (probably whole-heat averages or a unit error), so do not use them.

**Geometry of the required speed** (Walker 1974; Hutt et al. 2001; Scarfe et al. 2003 review [R]):
- The surfer must keep pace with the break point. The breaker's shoreward celerity c and the peel rate along the crest, V_p = c / tan α, add as vectors, so **V_s = c / sin α**, where α is the peel angle between the crest and the trail of whitewater.
- Scarfe (2002, in the 2003 review) found that peel angle, not peel rate, controls which manoeuvres surfers perform.
- Moores (2001, same review) found that skilled surfers need less entry speed because they can generate their own. Surfers at skill 3 or below cannot make sections.

[D] Required speed V_s = c / sin α, with c between √(g·h_b) and √(g·(h_b + H_b)) and h_b = H_b / 0.78:

| H_b | c | α = 60° | α = 45° | α = 35° | α = 30° | α = 25° |
|---|---|---|---|---|---|---|
| 1.0 m | 3.5–4.7 | 4.1–5.5 | 5.0–6.7 | 6.2–8.2 | 7.1–9.5 | 8.4–11.2 |
| 1.5 m | 4.3–5.8 | 5.0–6.7 | 6.1–8.2 | 7.6–10.1 | 8.7–11.6 | 10.3–13.7 |
| 2.0 m | 5.0–6.7 | 5.8–7.7 | 7.1–9.5 | 8.7–11.7 | 10.0–13.4 | 11.9–15.8 |

(all speeds in m/s)

With measured top speeds of 9–12.5 m/s, the fastest sections that experts can make on 1–2 m waves have peel angles of about 25–35°. This is consistent with the Hutt et al. skill limits already cited.

**Position on the face:**
- Hornung & Killen 1976 (JFM [P], lab stationary oblique breaker, 18 cm wave): model surfboards ride unsupported only if the correctly scaled weight is loaded at the right centre-of-mass position. Their 1977 follow-up locates the steepest face slope in the transition from unbroken to broken, which is the "pocket".
- Sugimoto 1998 (SIAM Review [M]): equilibrium is possible only on the lower part of the concave front face, at slopes between 0° and −35°.
- Paine 1974 [T/M]: board speed through the water ≈ 1.5 c when riding at about mid-height.

### Mechanism
- In the wave frame, the face is a steady, sloped moving ramp. Gravity along the rider's path is balanced by planing drag plus fin and rail forces (section 2).
- Speed demand comes from the geometry (V_s = c / sin α). Speed supply comes from the face slope along the path and from manoeuvres such as pumping and turns.

### Sources
- Mendez-Villanueva A, Bishop D, Hamer P (2006). Activity profile of world-class professional surfers during competition: a case study. *J Strength Cond Res* 20(3):477–482. doi:10.1519/16574.1
- Farley ORL, Harris NK, Kilding AE (2012). Physiological demands of competitive surfing. *J Strength Cond Res* 26(7):1887–1896. doi:10.1519/JSC.0b013e3182392c4b
- Barlow MJ, Gresty K, Findlay M, Cooke CB, Davidson MA (2014). The effect of wave conditions and surfer ability on performance and the physiological response of recreational surfers. *J Strength Cond Res* 28(10):2946–2953. doi:10.1519/JSC.0000000000000491
- Secomb JL, Sheppard JM, Dascombe BJ (2015). Time–motion analysis of a 2-hour surfing training session. *Int J Sports Physiol Perform* 10(1):17–22. doi:10.1123/ijspp.2014-0002
- Meir RA, Lowdon BJ, Davie AJ (1991). Heart rates and estimated energy expenditure during recreational surfing. *Aust J Sci Med Sport* 23(3):70–74 (issue/pages not verified). Numbers are as summarised in Mendez-Villanueva & Bishop 2005.
- Mendez-Villanueva A, Bishop D (2005). Physiological aspects of surfboard riding performance. *Sports Med* 35(1):55–70. doi:10.2165/00007256-200535010-00005 [R]
- Mejuto G, Gómez-Carmona CD, Gracia J, Rico-González M (2024). Surfing time–motion characteristics possible to gain using GNSS: a systematic review. *Sensors* 24(11):3455. doi:10.3390/s24113455 [R]. Source of the Barlow 2018, Farley 2014/2018, O'Neill 2021 and Silva 2020 numbers.
- Forsyth JR, Barnsley G, Amirghasemi M, et al. (2024). Understanding the relationship between surfing performance and fin design. *Sci Rep* 14:8734. doi:10.1038/s41598-024-58387-y. Table 2 values, 214–227 waves, 6 surfers, board-embedded GPS+IMU at 10 Hz.
- Moreira D, Gomes D, Graça R, et al. (2020). Real-time surf manoeuvres' detection using smartphones' inertial sensors. *AIAI 2020*, IFIP AICT 584. doi:10.1007/978-3-030-49186-4_22
- Scarfe BE, Elwany MHS, Mead ST, Black KP (2003). The science of surfing waves and surfing breaks – a review. Scripps Inst. Oceanogr. Tech. Rep. https://escholarship.org/uc/item/6h72j1fz [R/T]. See also Scarfe, Healy & Rennie (2009) *J Coastal Res* 25(3):539–557, doi:10.2112/07-0958.1.
- Dally WR (2001). The maximum speed of surfers. *J Coastal Res* SI 29:33–40. Photogrammetry of two videos, speed vs wave height. Full text not retrieved.
- Hornung HG, Killen PD (1976). A stationary oblique breaking wave for laboratory testing of surfboards. *J Fluid Mech* 78:459–480. doi:10.1017/S0022112076002553
- Sugimoto T (1998). How to ride a wave: mechanics of surfing. *SIAM Rev* 40(2):341–343. doi:10.1137/S0036144596316212 [M]
- Paine M (1974). Hydrodynamics of surfboards. BE thesis, Univ. Sydney. https://www.vdrsyd.com/filechute/paine_surf_thesis1974.pdf [T]

### Use in game
- **Validation:** a skilled autopilot on a 1.5 m wave with α ≈ 35–45° should average 6–7 m/s and peak at 9–10 m/s. On a slow, high-α wave the peak should not exceed ~7 m/s.
- **Validation:** check V_s ≈ c / sin α per section. If the sim's peel angle falls below ~25° on 1–2 m waves, making the section should be impossible without speed brought from upstream.
- **Target:** ride length 10–25 s and 50–150 m on a good point or reef set-up. Beach-break closeouts should average about 10 s.
- **Target:** session pacing of ~5 rides per 25 min for good players. Riding is under 10% of wall-clock time, so the paddle/wait loop has to be engaging in its own right.
- **Validation:** equilibrium trim should occur on the lower-to-mid concave face (slope < ~35°), not on the upper lip.

---

## 2. Trim, high/low line and stall

### Key numbers
- **Force balance** (Paine 1974 [T/M]):
  - For unaccelerated riding, lift / drag = cot(θ_eff), where θ_eff is the face slope along the direction of travel.
  - Stepping forward raises L/D, and "the surfer will shoot forward down the face". Stepping back lowers it, and the surfer is "swept back over the crest".
  - Paine's worked example (face 16°, heading 20° across): trim ≈ 6°, roll ≈ 15°, L/D ≈ 5.
- **Porpoising** (Paine 1974 [T]):
  - Porpoising theory predicts that a man-plus-board system should porpoise in the range of surfing speeds, and that porpoising is more likely on a wave than on flat water.
  - It is not seen in practice. Paine's explanations are that angling across the wave is more stable, and that human reflexes and the moments applied by the feet damp it.
  - Moving the load forward (lower trim, longer wetted length) stabilises the board.
- **Surface-following trim** (Hornung & Killen 1976 [P]): a lab model rides unsupported only at the correct centre-of-mass position. Trim is set by where the rider's weight sits along the board.
- **Hand-drag hydrodynamics:**
  - The drag coefficient of a hand at 90° to the flow is about 0.9–1.2 (Bilinauskaite et al. 2013 [P, CFD]; Berger, de Groot & Hollander 1995 [P, towing tank]).
  - [D] At 6 m/s relative water speed:
    - fingertips (~0.004 m²): 65–90 N, i.e. 0.9–1.2 m/s² deceleration of the 75.5 kg system;
    - flat hand (~0.013 m²): 215–290 N, 2.9–3.8 m/s²;
    - hand plus forearm (~0.03 m²): 500–660 N, 6.6–8.8 m/s². That is beyond what one arm can hold comfortably, so a real hand drag is partly immersed.
  - The drag acts at arm's length from the centre of mass, so it also yaws the board toward the face. This is the stall-and-turn effect used before tube rides.
- **Measured speed changes from trim, weight shift or stall:** none found. **Gap.**

### Mechanism
- Moving weight aft raises the trim angle. The pressure-drag term (~W·tan τ, Savitsky) and the wetted length both grow, and above a threshold the board stops planing ("stall" or "kick stall").
- Moving weight forward lowers trim and lengthens the wetted area. At equal lift this means less induced drag, but more friction and a risk of nose-diving (Paine flags the convex nose).
- High line: riding higher on the face reduces θ_eff along the path, so there is less gravity drive but the rider stays near the pocket. Low line: more drive, and the rider drifts away from the curl.
- The hand drag adds a drag force and a yaw moment. Its magnitude grows with the square of the relative speed and linearly with immersed area, which the rider controls through how deep the hand goes.

### Sources
- Paine 1974 (above) [T].
- Hornung & Killen 1976 (above) [P].
- Bilinauskaite M, Mantha VR, Rouboa AI, Ziliukas P, Silva AJ (2013). Computational fluid dynamics study of swimmer's hand velocity, orientation, and shape. *BioMed Res Int* 2013:140487. doi:10.1155/2013/140487
- Berger MAM, de Groot G, Hollander AP (1995). Hydrodynamic drag and lift forces on human hand/arm models. *J Biomech* 28(2):125–133. doi:10.1016/0021-9290(94)00053-7
- Surf-media descriptions of stall, kick stall and single/double hand drag [A]: https://www.surfertoday.com/surfing/how-to-stall-a-surfboard

### Use in game
- **Mechanic:** trim comes only from the rider's centre-of-mass position along the board, through the Savitsky wetted length and trim. There should be no speed multiplier.
- **Validation:** stepping back about 10–20 cm from neutral trim on a 6–7 m/s line should cause a visible deceleration of a few m/s² within about 1 s, and eventually a loss of planing. Tune this to taste, because no measured target exists.
- **Target range:** hand-drag deceleration of 0.5–4 m/s², controlled by immersion depth and capped by an arm-force limit of a few hundred newtons. Tie this to the hand-contact force in the rider model.
- **Risk to check:** the Savitsky + rigid-rider model may porpoise, as Paine predicts. The physical fix is rider impedance (active knee/ankle damping) and heading across the face, not scripted damping.

---

## 3. Pumping

### Key numbers
- **Skateboard half-pipe pumping** (Kogelbauer et al. 2024, *Phys Rev Research* [M + motion capture, n = 2 skaters]):
  - The model is a variable-length pendulum. The optimal control (frictionless case) is to stay crouched (low centre of mass) from the top of the ramp until the lowest point, then extend (rise) as the board climbs.
  - With the rise constrained to accelerations |ḧ| ≤ g, the optimum is bang-bang-like, timed around the bottom.
  - Energy enters as work against the normal load N = m(g cos θ + ḧ + (L − h)θ̇²). Rising while the centrifugal load is high adds energy.
  - The skater with 11 years' experience followed the optimum more closely than the one with 2 years.
  - Ramp radius 1.9 m, flat section 3.2 m.
- **Pump-track / BMX / ski-cross pumping** (Luginbühl et al. 2023, *Sports* [M]):
  - The optimum depends on maximal leg force and on timing. Effective body height varies between 0.7 and 1.2 m.
  - The normal force oscillates between 0 and 2 g.
  - Poor timing degrades performance even when physical capacity is identical.
- **Hydrofoil pumping** (Rozhdestvensky 2023, *JMSE* [M]): the rider's oscillation is modelled as an oscillating mass driving a lifting foil. Period-averaged thrust must balance viscous, wave and induced drag.
- **Human flapping frequencies:** 1–2 Hz in human-powered flapping foils (review-level statement). Windsurf sail pumping runs at 0.7–2 Hz with <20% propulsive efficiency (Perez et al. 2017 [T], 15.8–18.2%). About 75 W sustained a 1.69 m/s sailboard.
- **Nonholonomic propulsion on flat ground** (snakeboard; Ostrowski, Lewis, Murray, Burdick 1994 [M]): a board with side-force constraints (wheels, or fins) can be propelled by coupled body twist and steering. This is the theoretical basis for "carving pumps" on flat surfaces.
- **Surfing:** I found no peer-reviewed measurement of speed gain, frequency or energy per pump. **Gap.** Indirect clues:
  - Forsyth 2024 turn durations are about 1 s per turn.
  - Moreira 2020 manoeuvres last 2.45 ± 0.75 s.
  - So pump cycles are plausibly 1–2 s (0.5–1 Hz). This is an inference.

### Mechanism, derived for a wave face [D]
- In the wave frame the face is a curved ramp. The rider does net work W ≈ m·Δh·(a_n,high − a_n,low) per cycle: extending over Δh while the normal acceleration is high (bottom/transition curvature, turn apex, a_n = g cos θ + v²/R), and compressing while it is low (cresting, turn transitions).
- For Δh = 0.25 m, 73 kg, with a_n,high = 2 g and a_n,low = 0.5 g: W ≈ 270 J, which is Δv ≈ +0.57 m/s at 6 m/s. With 1.5 g and 0.8 g: Δv ≈ +0.27 m/s. These are upper bounds before losses.
- About 270 J per ~1 s cycle is ~270 W of leg power, which is plausible.
- On flat water, a_n,high ≈ a_n,low ≈ g, so this term is zero.
- The only flat-water route left is fin/rail thrust from heave/roll (Knoller–Betz), a "flapping" mechanism. Surf fins have low aspect ratio and small area (~0.03 m² for the set). If efficiency is below 20%, as in sail pumping, sustaining a planing drag of ~150 N at 4 m/s (~600 W useful) would need several kW of rider input.
- **Conclusion:** there should be effectively no sustained flat-water planing from pumping a shortboard. Small glide extensions near the planing threshold are plausible.

### Sources
- Kogelbauer F, Koyama S, Callan DE, Shinomoto S (2024). Mechanical optimization of skateboard pumping. *Phys Rev Research* 6:033132. doi:10.1103/PhysRevResearch.6.033132 (arXiv:2312.17671)
- Luginbühl M, Gross M, Lorenzetti S, Graf D, Bünner MJ (2023). Identification of optimal movement patterns for energy pumping. *Sports* 11(2):31. doi:10.3390/sports11020031
- Rozhdestvensky K (2023). A simplified mathematical model of pumped hydrofoils. *J Mar Sci Eng* 11(5):913. doi:10.3390/jmse11050913
- Perez SE, Wisniewski M, Kendall J (2017). Efficiency of human-powered sail pumping. *Human Power eJournal* 9, art. 23. https://hupi.org/HPeJ/0023/0023.html [T]
- Ostrowski J, Lewis A, Murray R, Burdick J (1994). Nonholonomic mechanics and locomotion: the snakeboard example. *Proc IEEE ICRA* 2391–2397. doi:10.1109/ROBOT.1994.351153

### Use in game
- **Mechanic:** pumping must come out of the rider's stance-height input (leg extension and compression) working against the physical normal load. There should be no pump bonus.
- **Validation (flat water):** a pumping autopilot on a 25.75 L shortboard should show no sustained planing. Deceleration may reduce slightly at most.
- **Validation (on a wave):** extension timed with the high-load phase of up/down-the-face S-turns should give roughly +0.2–0.6 m/s per cycle before losses. Mistimed pumping (extending when the load is low) should lose speed.
- **Design parameter:** player pump frequency is likely 0.5–1 Hz on a wave (no data). The gain should peak when the timing matches the face curvature, so the skill is emergent.

---

## 4. Sprint paddling, take-off and stamina

### Key numbers
- **Paddle speed and cadence** (Nessler et al. 2019 [P], 12 recreational surfers, swim flume, shortboard):
  - Endurance paddling 0.8–1.1 m/s. A 400 m paddle takes about 360 s (1.1 m/s).
  - Sprint maxima reported in the literature: 1.6, 1.7, 1.77 m/s over 15 m, and 1.89 m/s over 10 s.
  - Cadence rose from 35.9 ± 9.7 to 53.6 ± 5.1 strokes/min per arm between 0.6 and 2.0 m/s.
  - Board pitch was 12.3 ± 2.3° nose-up, largely independent of speed.
  - Board roll per stroke rose from 27 ± 8° to 45 ± 0.6° (0.6 → 1.9 m/s).
  - Peak VO₂ 31 ± 6 ml·kg⁻¹·min⁻¹.
- **Paddling fatigue** (Borgonovo-Santos, Zacca, Fernandes, Vilas-Boas 2021, *Sci Rep* [P], 16 competitive males, 25 m pool):
  - 20 m sprint 1.52 ± 0.28 m/s before, 1.46 ± 0.28 m/s after 6 min of paddling at 60% (1.15 m/s). That is −4% after one sprint–endurance–sprint cycle.
  - Energy cost of the sprint rose from 1.40 to 1.81 kJ/m; the endurance paddle cost 0.73 kJ/m.
  - Time to peak velocity shifted from 4–6 s to 6–8 s.
  - HR 142 → 167 bpm across the 6 min.
  - Cost rises exponentially with speed: E = 0.0661·e^(2.12·v) kJ/m, R² = 0.83.
- **Sprint power** (Minahan et al. 2016 [P], junior males, n = 8 + 8): 30 s peak sprint-paddle power 404 ± 98 W (competitive) vs 292 ± 56 W (recreational). Accumulated O₂ deficit 1.60 vs 1.14 L. VO₂peak not different (2.7 vs 2.5 L/min).
- **Stroke technique** (Gosney et al. 2026 [P], 31 competitive surfers, 15 m sprints): longer push distance during acceleration and longer pull distance at speed predicted faster splits.
- **Repeated sprints** (Farley et al. 2016 [P], 24 adolescents):
  - The repeated-sprint paddle test (RSPT) is 10 × 15 m, one starting every 40 s. Fatigue index = first minus slowest sprint.
  - Sprint-interval training cut total RSPT time by 6.5 ± 4.3 s and lowered the fatigue index.
  - Exact decrement percentages were not retrieved. **Gap.**
- **Heart rate and energy:**
  - Competition: mean 139 ± 11 bpm (64% HRmax), peak 190 ± 12 (87%) (Farley 2012).
  - 2-h training: 128 ± 13 bpm mean, 171 ± 12 peak (Secomb 2015).
  - Recreational: 64–85% HRmax, about 500 kcal/h (Barlow 2014; Meir 1991).
- **Paddle speed vs wave speed:** Paine's (1974) field notes list small-wave celerity of about 3 m/s (10 ft/s) and peel of 1.5–2.1 m/s. [D] Maximum paddle speed (1.5–1.9 m/s) is therefore about 50–60% of c on small waves and less on bigger ones. The rest has to come from the face slope as the wave lifts the board, per the take-off criteria of Kimura & Kakinuma, already cited.
- **Late take-offs, air drops and landings:**
  - Forsyth et al. 2018 [P] analysed 121 WSL CT aerials (2015 finals series). Successful landings were associated with landing over the centre of the board and landing with the lead ankle dorsiflexed.
  - Forsyth et al. 2020 [P], 14 surfers: simulated aerial landings used only 1.0–3.7° of ankle dorsiflexion.
  - Tran et al. 2015 [P], drop-and-stick from a 0.5 m box: time to stabilisation 0.69 ± 0.13 s for senior elite vs 0.85 ± 0.25 s for junior development surfers.
  - Lundgren et al. 2016 [P], n = 11: tibial peak accelerations were about 50% higher when landing on a foam board off a mini-trampoline than off a 50 cm box.
  - Verniba et al. 2017 [P], 20 males, drop landings from 22–44 cm: peak knee compression 11.8 (soft), 17.0 (natural), 20.2 (stiff) N/kg; knee flexion moment 1.9–2.2 N·m/kg.
- **Angled take-offs:** no biomechanics study found. **Gap.**

### Mechanism
- Paddle thrust comes from arm pull and push distance and from cadence. Board roll per stroke grows with effort, and the board sits nose-up at about 12°.
- Energy cost per metre rises exponentially with speed, so short, hard efforts fatigue quickly.
- A late or air drop turns height into landing impact. Success depends on landing the centre of mass over the board and absorbing the load through ankle, knee and hip flexion.

### Sources
- Nessler JA, Ponce-Gonzalez JG, Robles-Rodriguez C, Furr H, Warner M, Newcomer SC (2019). Electromyographic analysis of the surf paddling stroke across multiple intensities. *J Strength Cond Res* 33(4):1102–1110. doi:10.1519/JSC.0000000000003070
- Borgonovo-Santos M, Zacca R, Fernandes RJ, Vilas-Boas JP (2021). The impact of a single surfing paddling cycle on fatigue and energy cost. *Sci Rep* 11:4566. doi:10.1038/s41598-021-83900-y
- Minahan CL, Pirera DJ, Sheehan B, MacDonald L, Bellinger PM (2016). Anaerobic energy production during sprint paddling in junior competitive and recreational surfers. *Int J Sports Physiol Perform* 11(6):810–815. doi:10.1123/ijspp.2015-0558
- Gosney S, MacDonald L, Parsonage J, et al. (2026). Stroke characteristics are associated with sprint-paddling performance in female and male competitive surfers. *Sports Biomech*. doi:10.1080/14763141.2025.2549137
- Farley ORL, Secomb JL, Parsonage JR, Lundgren LE, Abbiss CR, Sheppard JM (2016). Five weeks of sprint and high-intensity interval training improves paddling performance in adolescent surfers. *J Strength Cond Res* 30(9):2446–2452. doi:10.1519/JSC.0000000000001364. See also Farley O (2016), PhD thesis, Edith Cowan Univ.: https://ro.ecu.edu.au/theses/1912/ [T]
- Forsyth JR, Riddiford-Harland DL, Whitting JW, Sheppard JM, Steele JR (2018). Understanding successful and unsuccessful landings of aerial maneuver variations in professional surfing. *Scand J Med Sci Sports* 28(5):1615–1624. doi:10.1111/sms.13055
- Forsyth JR, et al. (2020). Training for success: do simulated aerial landings replicate successful aerial landings performed in the ocean? *Scand J Med Sci Sports* 30(5):878–884. doi:10.1111/sms.13639
- Forsyth JR, Tsai MC, Sheppard JM, et al. (2021). Can we predict the landing performance of simulated aerials in surfing? *J Sports Sci* 39(22):2567–2576. doi:10.1080/02640414.2021.1945204
- Tran TT, Lundgren L, Secomb J, Farley ORL, et al. (2015). Development and evaluation of a drop-and-stick method to assess landing skills in various levels of competitive surfers. *Int J Sports Physiol Perform* 10(3):396–400. doi:10.1123/ijspp.2014-0375
- Lundgren LE, Tran TT, Nimphius S, et al. (2016). Comparison of impact forces, accelerations and ankle range of motion in surfing-related landing tasks. *J Sports Sci* 34(11):1051–1057. doi:10.1080/02640414.2015.1088164
- Verniba D, Vescovi JD, Hood DA, Gage WH (2017). The analysis of knee joint loading during drop landing from different heights and under different instruction sets in healthy males. *Sports Med Open* 3:6. doi:10.1186/s40798-016-0072-x

### Use in game
- **Targets:**
  - Sprint paddle speed 1.5–1.9 m/s after 4–8 s of acceleration.
  - Cruise 0.8–1.1 m/s.
  - Cadence 35–55 strokes/min per arm.
  - Board nose-up about 12° and rolling 25–45° per stroke. This can come from the rider's arm-reaction forces rather than an animation.
- **Stamina model** (design parameter anchored to data):
  - Metabolic cost per metre ∝ e^(2.1·v).
  - A single 6 min paddle cycle should cost about 4% of sprint speed.
  - Recovery on the minute scale. Repeated 15 m sprints every 40 s should show a measurable decrement.
  - Peak sprint power budget ~300–400 W.
- **Validation:** on waves with c ≈ 4–6 m/s the rider cannot catch unbroken waves by paddling alone. The catch has to come from being lifted onto the slope, so the take-off window is geometric, not a speed threshold.
- **Landing:** a successful drop or air should need the centre of mass over the board centre and flexed joints. Time to stabilisation of about 0.7 s (expert) is a good target for rider-controller settling after a 0.5 m drop.

---

## 5. Duck dive and turtle roll

### Key numbers
- **Duck-dive biomechanics:** no peer-reviewed study found. **Gap.** Coaching sources [A] describe sinking the nose about 40–60 cm and starting 1–2 body lengths before the whitewater arrives.
- **Buoyancy to overcome** [D]:
  - 25.75 L board → 259 N of buoyancy, minus 25 N weight = **~234 N net** that the arms, knee and foot must push down. The rider's own body is roughly neutral.
  - A 60–80 L longboard needs 600–800 N. This is why longboarders turtle-roll instead.
- **Bubble entrainment:** the characteristic entrainment depth is about one wave height, with bubble populations decaying roughly exponentially with depth. This is a review statement for wind-wave breaking. Deep-water field plumes reach a mean of >10 m and a maximum of 30 m in storms (Derakhti et al. 2024 [P], H_s up to 10 m).
- **Surf-zone turbulence:**
  - Plunging breakers transport turbulent kinetic energy landward and dissipate it within about one wave period. Spilling breakers transport it seaward and dissipate it more slowly (Ting & Kirby 1995, 1996 [P], lab slope 1:35).
  - Obliquely descending eddies generated by the roller penetrate the water column and can reach the bed (Nadaoka, Hino & Koyano 1989 [P]).
- **Void fraction:** peak void fraction under lab breakers is about 18% for plunging and about 12% for spilling (lab review statement; see Blenkinsopp & Chaplin 2007, 2011 for measured fields).
- **Shallow-water kinematics** (linear theory, textbook): orbital horizontal velocity is nearly uniform with depth when kh ≪ 1.

### Mechanism, why duck diving works (synthesis)
- The broken wave's momentum is concentrated in the aerated surface roller moving at about c, and in the turbulence it injects, which is strongest near the surface and decays with depth.
- Getting the board and body under the roller for the second or two it passes avoids most of the roller's push and the low-lift aerated water. Aerated water has 10–20% void fraction, so less buoyancy and planing support.
- In the inner surf zone (h ≈ 1–1.3 H), the depth-uniform bore velocity and eddies that reach the bed mean that no depth is fully quiet. Duck dives should get less effective in very shallow water and against large bores.

### Sources
- Ting FCK, Kirby JT (1995). Dynamics of surf-zone turbulence in a strong plunging breaker. *Coast Eng* 24:177–204. doi:10.1016/0378-3839(94)00036-W. Also Ting & Kirby (1996), spilling breaker, *Coast Eng* 27:131–160, doi:10.1016/0378-3839(95)00037-2.
- Nadaoka K, Hino M, Koyano Y (1989). Structure of the turbulent flow field under breaking waves in the surf zone. *J Fluid Mech* 204:359–387. doi:10.1017/S0022112089001783
- Derakhti M, Thomson J, Bassett C, Malila M, Kirby JT (2024). Statistics of bubble plumes generated by breaking surface waves. *J Geophys Res Oceans* 129. doi:10.1029/2023JC019753
- Blenkinsopp CE, Chaplin JR (2007). Void fraction measurements in breaking waves. *Proc R Soc A* 463:3151–3170. doi:10.1098/rspa.2007.1901
- Blenkinsopp CE, Chaplin JR (2011). Void fraction measurements and scale effects in breaking waves in freshwater and seawater. *Coast Eng* 58:417–428. doi:10.1016/j.coastaleng.2010.12.006
- "Bubbles produced by breaking wind waves" (Springer chapter, doi:10.1007/978-94-017-1660-4_20): source of the ~1 wave height entrainment-depth statement.

### Use in game
- **Mechanic:** the duck dive is a physical push. The rider applies about 250 N or more through the hand and knee/foot contacts to submerge the board, and the rider's body follows.
- **Validation:** the 25.75 L board sinks roughly 0.5–1 m with a strong push. A board over about 50 L should be practically un-diveable, which leaves the turtle roll.
- **Validation:** duck-dive pushback reduction should depend on depth relative to the roller and aerated layer, and on timing. It should be weaker in shallow inner-surf bores. Surf-zone model output (roller thickness, turbulence/aeration depth) should decay over about 1 H and over about one wave period.
- **Gap:** the depth reached, time underwater and forces of the duck dive are design parameters.

---

## 6. Wipeouts, hold-downs, breath-hold and leash

### Key numbers
- **Hold-down duration:** no peer-reviewed measurements found. **Gap.**
  - Surf media and coaching sources [A]: 5–8 s in small waves; 12–20 s for head-high-plus; two-wave hold-downs in big surf about 30 s or more.
  - [D] This is consistent with plunging-breaker turbulence dissipating within about one wave period (8–15 s) (Ting & Kirby 1995).
- **Breath-hold capacity:**
  - Guimard et al. 2021 [P], 10 untrained active men:
    - static apnea 68.1 ± 23.6 s;
    - dynamic apnea at 20%, 30%, 40%, 50% of peak aerobic power: 35.6, 25.6, 19.2, 16.9 s;
    - apnea duration = 56.4·e^(−0.025·x) s, where x = % of peak aerobic power;
    - SpO₂ fell about 10% in dynamic apneas.
  - Parkes 2006 [R]: most people cannot hold a maximal-inspiration breath of room air for more than about 1 min.
  - Big-wave surfers show raised maximal inspiratory and expiratory pressures (Seixas et al. 2025, conference abstract).
- **Injuries** (Nathanson et al. 2002 [P], 1237 injuries, survey):
  - Causes: own board 55%, another surfer's board 12%, sea floor 17%.
  - Types: lacerations 42%, contusions 13%, sprains/strains 12%, fractures 8%.
- **Competition injuries** (Nathanson et al. 2007 [P]): 13 per 1000 h of competitive surfing; 6.6 significant injuries per 1000 h. Struck by own board 29% of 116 injuries.
- **Fatalities** (Lawes et al. 2023 [P], Australia 2004–2020):
  - 155 surfing and bodyboarding deaths; drowning 58%; cardiac conditions in 33%.
  - 0.06 deaths per million exposed hours.
  - Australians surf 45.7 times a year, 1.88 h per session.
- **Leash:** no peer-reviewed load measurements found. **Gap.**
  - Manufacturers quote tensile strengths around 100 kg (~1 kN) for some cords [I].
  - [D] The drag of a bore on the tethered board, 0.5·ρ·C_d·A·v² at 4 m/s, gives about 0.6 kN edge-on (A ≈ 0.06 m²) and up to about 3 kN flat-on (0.33 m²). Snapped leashes in big whitewater are physically plausible.

### Mechanism
- A hold-down is set by the downward and advective turbulent flow and the aerated, low-buoyancy water under the roller. It lasts about as long as the turbulent patch passes and decays, and repeats with each set wave.
- Breath-hold time drops steeply with exertion. Struggling shortens it, and relaxing extends it.
- The leash couples the rider to a large-drag object (the board). It transmits tension to the ankle, can pull the rider shoreward and down, and causes recoil strikes. "Own board" is the most common injury cause.

### Sources
- Guimard A, Joulia F, Prieur F, et al. (2021). Exponential relationship between maximal apnea duration and exercise intensity in non-apnea trained individuals. *Front Physiol* 12:815824. doi:10.3389/fphys.2021.815824
- Parkes MJ (2006). Breath-holding and its breakpoint. *Exp Physiol* 91(1):1–15. doi:10.1113/expphysiol.2005.031625
- Nathanson A, Haynes P, Galanis D (2002). Surfing injuries. *Am J Emerg Med* 20(3):155–160. doi:10.1053/ajem.2002.32650
- Nathanson A, Bird S, Dao L, Tam-Sing K (2007). Competitive surfing injuries: a prospective study of surfing-related injuries among contest surfers. *Am J Sports Med* 35(1):113–117. doi:10.1177/0363546506293702
- Lawes JC, Koon W, Berg I, van de Schoot D, Peden AE (2023). The epidemiology, risk factors and impact of exposure on unintentional surfer and bodyboarder deaths. *PLoS One* 18(5):e0285928. doi:10.1371/journal.pone.0285928
- Seixas P, et al. (2025). Ventilatory profile of big wave surfers: an exploratory study. *CiiEM 2025*. doi:10.3390/msf2025037019 (abstract only)
- Hold-down anecdotes [A]: https://www.surfer.com/news/big-wave-breath-hold-wipeout-survival

### Use in game
- **Breath budget (design parameter from data):**
  - about 60–70 s at rest;
  - drain rate rising with effort, with ≈ 56·e^(−0.025·%effort) s available at a given effort;
  - thrashing at 50% effort gives about 17 s.
  - Hold-down time should come from the simulated turbulence and roller passage, which should give about 5–15 s per wave, not from a timer.
- **Validation:** hold-downs in 1–2 m plunging surf should mostly fall in 5–15 s. Back-to-back set waves can compound this.
- **Leash:** model it as an elastic tether (design stiffness). A break threshold of about 1 kN or more is optional. Expect the board-recoil hazard, since own-board strikes are the most common injury.

---

## 7. Tube riding

### Key numbers
- **Tube shape** (Mead & Black 2001 [P], cubic fits to 28 world-class breaks):
  - Vortex ratio (tube length / width) ranges from 1.42 to 3.43, and follows **Y = 0.065·X + 0.821** (R² = 0.71), where X is the orthogonal seabed gradient as 1:X over the break zone. Seabed gradients spanned 1:8 to 1:40.
  - Intensity classes:

    | Class | Vortex ratio | Example breaks |
    |---|---|---|
    | Extreme | 1.6–1.9 | Pipeline, Shark Island |
    | Very high | 1.91–2.2 | Backdoor, Padang |
    | High | 2.21–2.5 | Kirra, Off-The-Wall |
    | Medium/high | 2.51–2.8 | Bells, Bingin |
    | Medium | 2.81–3.1 | Manu Bay, Whangamata |

  - Longuet-Higgins' (1982) parametric aspect ratio is 2.75. Other field fits give 1.73–4.43.
  - Vortex angle 29–58°, with no relationship to the other parameters.
- **Tube size relative to wave height** (Mead & Black Table 6.1):
  - The two ratio columns appear to be swapped in the source, so I infer: length / H ≈ 0.33–1.11 and width / H ≈ 0.12–0.58.
  - Pipeline: length ≈ 0.9–1.0 H, width ≈ 0.5–0.6 H.
  - Bells: 0.69 H and 0.26 H.
- [D] For a 2 m Pipeline-type wave, the tube is about 1.0–1.2 m wide and about 2 m long, tilted about 40°. A 1.75 m surfer (roughly 1.4–1.5 m tall in stance) has to crouch to about 1 m.
- **Tube speed:** not measured. **Gap.** Physically it must match the peel speed V_s = c / sin α of the hollow section, which is usually low-α "speed sections" (Scarfe 2003). When the pocket is slower than the rider's line, stalling (hand drag, weight back) is how riders stay in.
- **Scoring:** tube rides average 6.82 ± 2.13 (Lundgren 2014); see section 10.
- **Rail grab (pig-dog), hand-in-face and crouch knee flexion:** no quantitative studies found. **Gap.**
  - Mechanism inference [D]: the rail grab adds a third contact (hand to board). The rider can then apply roll moment to keep the inside rail engaged while lowering the centre of mass and hanging it toward the face. That lowers stance height by about 0.2–0.4 m and shortens the lever arm of lateral loads.
  - A trailing hand in the face gives both drag (stall) and a yaw moment toward the face (section 2).

### Sources
- Mead ST, Black KP (2001). Predicting the breaking intensity of surfing waves. *J Coastal Res* SI 29 (pages not verified). PDF: http://joas.free.fr/studies/bei/g2s/predicting_the_breaking_waves_intensity.pdf
- Longuet-Higgins MS (1982). Parametric solutions for breaking waves. *J Fluid Mech* 121:403–424. doi:10.1017/S0022112082001967. Cited via Mead & Black.
- Lundgren L, Newton RU, Tran TT, et al. (2014). Analysis of manoeuvres and scoring in competitive surfing. *Int J Sports Sci Coach* 9(4):663–669. doi:10.1260/1747-9541.9.4.663

### Use in game
- **Validation:** from the Boussinesq plus lip model, fit a cubic and compute the vortex ratio. Steep reef slopes (1:10) should give about 1.5–1.9, and a 1:30 slope about 2.8. Tube width should be about 0.2–0.6 H.
- **Mechanic:** clearance inside the tube should come from rider crouch height, which is a real input. A pig-dog posture should be available as a hand–rail contact that lowers the centre of mass and adds roll authority.
- **Gap:** crouch knee angles and tube speeds are design parameters. Check that the rider model's deep crouch gets to about 0.6–0.7 of standing height.

---

## 8. Turns, stance, balance and a finite-impedance rider

### Key numbers
**Turn kinematics** (Forsyth et al. 2024 [P], 6 accomplished surfers, 214 waves, 835 turns, board GPS+IMU at 10 Hz; mean ± 95% CI across fins):

| Turn | Duration | Yaw | Yaw rate | Speed | Rail (roll) | Pitch |
|---|---|---|---|---|---|---|
| Bottom turn | 0.96 ± 0.04 s | 99 ± 4° | 1.9 ± 0.1 rad/s | 7.3 ± 0.2 m/s | 42 ± 3° | — |
| Cutback / top turn | 0.96 ± 0.03 s | 152 ± 3° | 3.0 ± 0.1 rad/s | 6.7 ± 0.1 m/s | 75 ± 3° | 42 ± 2° |

Turns per wave 3.8. "Turn flow" (≈ cutback speed / bottom-turn speed) 0.88–0.95.

[D] Derived from v and ω:

| Turn | Radius R = v/ω | Lateral acceleration | Coordinated bank angle | Resultant load |
|---|---|---|---|---|
| Bottom turn | 3.8 m | 13.9 m/s² (1.41 g) | atan(a/g) ≈ 55° | ≈ 1.7 g |
| Cutback | 2.2 m (≈ 1.25 board lengths) | 20.1 m/s² (2.05 g) | ≈ 64° | ≈ 2.3 g |

These fit the measured rail angles of 42° and 75°, given that the rail angle is measured relative to a sloping face.

**Other turn and manoeuvre data:**
- Whitting 2024 (already cited): critical features of the frontside bottom turn.
- Moreira 2020: manoeuvres last 2.45 ± 0.75 s.
- Snaps, off-the-lips and floaters: no sensor data found. **Gap.**

**Stance and loads:**
- Weiss et al. 2025 [P + optimal-control model], 7 experienced surfers on a river wave, 10 IMUs plus video pose:
  - rear/front differences in joint angles and moments up to 47% (not statistically significant at n = 7);
  - peak hip angle 55.0° (rear) vs 50.0° (front);
  - peak hip moment 66.7 N·m (rear) vs 45.3 N·m (front);
  - muscle forces higher in the front leg.
- The already-cited pop-up paper reports about 60% of body weight on the front foot during the reaching phase, and knee flexion of 30–80° in stance.
- Stance width: only coaching sources [A], about shoulder width or slightly more. **Gap.**

**Balance and experience:**
- Paillard et al. 2011 [P]: national/international surfers had better postural control on unstable support and relied less on vision than local-level surfers.
- Chapman et al. 2008 [P], n = 60: experience changes postural control under dual-task conditions.
- Anthony et al. 2016 [P], n = 20: regular-stance surfers stayed balanced 66% of the time vs 44% for goofy-stance surfers on a Biodex device (stance-specific adaptation).

**Reaction and reflex latencies:**
- Automatic postural responses to support-surface perturbations: 73–110 ms EMG onset, starting at the ankle and radiating to thigh and trunk (Horak & Nashner 1986 [P]).
- Longer functional responses: 120–180 ms.
- Short-latency stretch reflex: about 30–50 ms (textbook value, not re-sourced here).
- Visual simple reaction time: about 243 ms in elite athletes vs 274 ms in non-athletes (Barrett et al. 2020 [P]).

**Impedance values for the rider model:**
- **Whole-body vertical mode** (Matsumoto & Griffin 1998 [P], 12 subjects, 0.5–30 Hz random vibration):
  - apparent-mass resonance 5.5 Hz with normal posture, **2.75 Hz with legs bent**, 3.75 Hz on one leg;
  - in normal posture the resonance drops from 6.75 to 5.25 Hz as vibration grows from 0.125 to 2.0 m/s² rms.
  - [D] k = m·(2πf)² for 73 kg gives about 87 kN/m (upright) and **about 22 kN/m (surf crouch)**.
  - Their 2-DOF lumped models (Matsumoto & Griffin 2003) provide fitted damping. Values were not retrieved, so tune ζ in roughly 0.2–0.5 (**assumption**).
- **Leg spring stiffness:**
  - running: 25–35 kN/m at 2.6–6.6 m/s (Farley & González 1996 [P]);
  - self-selected hopping: 2.0–2.9 Hz (Farley et al. 1991 [P]).
- **Ankle:** intrinsic stiffness about 91% of the gravitational toppling stiffness mgh (range 37–135%) (Loram & Lakie 2002 [P]). [D] With 73 kg and h ≈ 0.9 m, mgh ≈ 645 N·m/rad, so intrinsic stiffness is about 590 N·m/rad. This is insufficient alone, which is why active neural control is required.
- **Knee quasi-stiffness in landing** (first 60 ms): 0.045 ± 0.01 N·m·deg⁻¹·kg⁻¹·m⁻¹ in healthy limbs (Brightwell et al. 2023 [P]). [D] For 73 kg and 1.75 m that is about 5.7 N·m/deg ≈ 330 N·m/rad per knee.

### Sources
- Forsyth et al. 2024 (above).
- Weiss A, Lluch È, Masmoudi I, Döllinger M, Heinrich D, Koelewijn A (2025). Simulating surfing with optimal control: sensor fusion for biomechanical analysis. *Multibody Syst Dyn* 66(4):955–975. doi:10.1007/s11044-025-10071-3
- Paillard T, Margnes E, Portet M, Breucq A (2011). Postural ability reflects the athletic skill level of surfers. *Eur J Appl Physiol* 111:1619–1623. doi:10.1007/s00421-010-1782-2
- Chapman DW, Needham KJ, Allison GT, Lay B, Edwards DJ (2008). Effects of experience in a dynamic environment on postural control. *Br J Sports Med* 42:16–21. doi:10.1136/bjsm.2006.033688
- Anthony CC, Brown LE, Coburn JW, Galpin AJ, Tran TT (2016). Stance affects balance in surfers. *Int J Sports Sci Coach* 11(3):446–450. doi:10.1177/1747954116645208
- Horak FB, Nashner LM (1986). Central programming of postural movements: adaptation to altered support-surface configurations. *J Neurophysiol* 55(6):1369–1381. doi:10.1152/jn.1986.55.6.1369
- Barrett BT, Cruickshank AG, Flavell JC, et al. (2020). Faster visual reaction times in elite athletes are not linked to better gaze stability. *Sci Rep* 10:13216. doi:10.1038/s41598-020-69975-z
- Matsumoto Y, Griffin MJ (1998). Dynamic response of the standing human body exposed to vertical vibration: influence of posture and vibration magnitude. *J Sound Vib* 212(1):85–107. doi:10.1006/jsvi.1997.1376
- Matsumoto Y, Griffin MJ (2003). Mathematical models for the apparent masses of standing subjects exposed to vertical whole-body vibration. *J Sound Vib* 260(3):431–451. doi:10.1016/S0022-460X(02)00941-0
- Farley CT, González O (1996). Leg stiffness and stride frequency in human running. *J Biomech* 29(2):181–186. doi:10.1016/0021-9290(95)00029-1
- Farley CT, Blickhan R, Saito J, Taylor CR (1991). Hopping frequency in humans. *J Appl Physiol* 71(6):2127–2132. doi:10.1152/jappl.1991.71.6.2127
- Loram ID, Lakie M (2002). Direct measurement of human ankle stiffness during quiet standing: the intrinsic mechanical stiffness is insufficient for stability. *J Physiol* 545(3):1041–1053. doi:10.1113/jphysiol.2002.025049
- Brightwell BD, Samaan MA, Johnson D, Noehren B (2023). Dynamic knee joint stiffness during bilateral lower extremity landing 6 months after ACL reconstruction. *Knee* 42:73–81. doi:10.1016/j.knee.2023.02.017

### Use in game
- **Validation targets for autopilot and player turns:**
  - bottom turn about 1 s, 90–110° of yaw, peak yaw rate about 2 rad/s, radius 3–4 m at 7 m/s, rail 35–50°;
  - cutback/top turn about 1 s, 140–160° of yaw, about 3 rad/s, radius about 2 m, rail 70–80°;
  - foot loads 1.7–2.3 body weights;
  - about 4 turns per wave;
  - speed retained through a bottom-turn-to-top-turn pair about 0.9.
- **Rider impedance starting point:**
  - vertical leg spring about 20–25 kN/m in a crouch (about 2.5–3 Hz with 73 kg), about 80 kN/m more upright;
  - ankle about 600 N·m/rad (both ankles; add neural control on top);
  - knee about 300–350 N·m/rad per knee in landing;
  - damping ζ 0.2–0.5 (tune);
  - control delays of about 40 ms (reflex), 75–110 ms (postural), 200–250 ms (voluntary/visual).
- **Check:** a stiffer or more upright rider should transmit more chop, and a crouched rider should filter above about 3 Hz, as in Matsumoto & Griffin.
- **Gap:** snap and off-the-lip kinematics. Use the cutback numbers as the lower bound, with a higher yaw rate expected.

---

## 9. Reading sets: wave groupiness and lineup choice

### Key numbers
- **Theory:** wave-height sequences behave like a two-state Markov chain (Kimura 1980; Longuet-Higgins 1984 showed this matches the envelope approach for narrow spectra).
  - Mean run length of waves above a threshold is m = 1/(1 − p₁₁), where p₁₁ is the probability that the next wave also exceeds.
  - The mean total run (onset to onset) is M = m/P, where P is the exceedance probability. For H > H1/3 under a Rayleigh distribution, P ≈ e⁻² ≈ 0.135.
- **Measured correlations:** successive wave heights correlate at 0.2–0.3 in North Sea storm seas (Rye 1974; Arhan & Ezraty 1978; via Shuttler, HR Wallingford SR39 [T]).
- **Groupiness factor GF** (Funke & Mansard): 0.75–0.81 for broad spectra (Pierson–Moskowitz, JONSWAP, bimodal) vs 1.06 ± 0.11 for a narrow spectrum. GF has large scatter; mean group length ("NGBAR") discriminates better. Groupiness increases with spectral peakedness and does not depend on directionality (lab and field, Shuttler SR39).
- [D] Monte-Carlo of a bivariate Rayleigh model (my calculation), for waves ≥ H1/3:

| Sea state | Height correlation r(H₁,H₂) | Mean run | New group every |
|---|---|---|---|
| Wind sea | 0.04–0.23 | 1.2–1.4 waves | 9–10 waves |
| Moderate swell | 0.34–0.46 | 1.5–1.7 waves | 11–13 waves |
| Long, clean swell | 0.61–0.79 | 2.1–2.8 waves | 15–21 waves |

  - At T = 12–15 s, that is a set about every 2–5 min.
  - Surf media [A] say sets of 2–8 waves arrive every few minutes up to half an hour. "Set" to surfers usually means a lower threshold than H1/3, which gives more waves per set.
- **Lineup choice:**
  - Competitors paddle about 44% of the time. Beach breaks have a higher work-to-rest ratio than point breaks, and point breaks have longer continuous paddles and longer rides (Farley 2016 thesis [T]).
  - Skill, wave size and period are all associated with ride counts and physiological load (Barlow 2014).
  - No peer-reviewed study of positioning strategy was found. **Gap.** Coaching sources [A] describe triangulating onshore landmarks and sitting at the peak.

### Sources
- Longuet-Higgins MS (1984). Statistical properties of wave groups in a random sea state. *Phil Trans R Soc Lond A* 312:219–250. doi:10.1098/rsta.1984.0061
- Kimura A (1980). Statistical properties of random wave groups. *Proc 17th ICCE*, Sydney, 2955–2973. doi:10.9753/icce.v17.175
- Shuttler RM (1987 approx.). Wave groups. HR Wallingford Report SR 39. https://eprints.hrwallingford.com/id/eprint/80/1/SR39.pdf [T]
- Farley 2016 thesis; Barlow 2014 (above).

### Use in game
- **Validation of the swell generator:**
  - measure r(H_n, H_n+1) and the run lengths of waves ≥ H1/3 in the offshore boundary signal;
  - a groundswell preset should give r ≈ 0.5–0.8, runs of 2–3 and a set about every 2–5 min;
  - a wind-swell preset should give r < 0.3, runs of about 1.2 and more random timing.
- **Design:** players read sets from the horizon, so the swell source must produce groups physically (spectral width), not a scripted "set every N s".
- **Gap:** lineup-positioning behaviour is a design parameter (the AI should sit near the peak and adjust after each set).

---

## 10. Scoring

### Key numbers
- **WSL 2026 Rule Book** [I]:
  - Rides are scored 0.1–10.0 in one-tenth increments.
  - Five judges; the highest and lowest are dropped and the middle three averaged. Big Wave events average to two decimals.
  - Heat = best two waves, out of 20.
  - Criteria (Rule 13.05, shortboard):
    - commitment and degree of difficulty;
    - innovative and progressive manoeuvres;
    - combination of major manoeuvres;
    - variety of manoeuvres;
    - speed, power and flow.
  - The emphasis varies with location and conditions, and the head judge sets it each day.
  - Descriptors: 0–1.9 poor; 2.0–4.9 fair; 5.0–6.4 good; 6.5–7.9 very good; 8.0–10 excellent.
  - Longboard criteria (4.13) emphasise nose riding, rail surfing, critical section, variety, speed/power, commitment, control and footwork.
  - Nazaré big-wave criteria (7.16) are commitment, degree of difficulty, intensity and size of the wave, control and manoeuvres.
  - Interference: the offender's heat counts only their best wave; two interferences means disqualification.
- **Lundgren et al. 2014** [P], 2012 World Championship Tour, all quarter-finals and later:
  - Re-entries were the most common manoeuvre.
  - Waves with aerials averaged **7.40 ± 1.53** and tube rides **6.82 ± 2.13**, vs **5.08 ± 2.21** for other manoeuvres (p < 0.001).
  - The high-scoring manoeuvres were completed about 50–60% of the time, vs about 90% for others.
- **Forsyth et al. 2017** [P], all 11 events of the 2015 WSL CT:
  - Aerials scored higher than tube rides and turns.
  - Aerial completion was 45.4% overall and 55.4% in the finals series.
  - Frontside air reverse was the most common aerial and averaged 6.77.
- **Peirão & dos Santos 2012** [P], 164 waves, 21 surfers, Brazilian ASP events 2007/2010: scores differed significantly with drop quality (poor/good/exceptional) and with finish (controlled finish vs falling in the main section vs falling after it).
- **Klingner et al. 2022** [R], 31 studies: completing aerials and tubes at a high rate translates directly into scoring potential. 15 m and 400 m paddle performance and relative strength are higher in better surfers.
- Critical features of scoring manoeuvres: Forsyth 2018 (aerial landings); Whitting 2024 (bottom turn, already cited).

### Sources
- World Surf League (2026). 2026 WSL Rule Book, rules 4.13, 7.16–7.17, 13.04–13.05. https://www.worldsurfleague.com/asset/43277/2026+WSL+Rule+Book+clean+0720026.pdf [I]
- Lundgren L, Newton RU, Tran TT, Dunn M, Nimphius S, Sheppard J (2014). Analysis of manoeuvres and scoring in competitive surfing. *Int J Sports Sci Coach* 9(4):663–669. doi:10.1260/1747-9541.9.4.663
- Forsyth JR, de la Harpe R, Riddiford-Harland DL, Whitting JW, Steele JR (2017). Analysis of scoring of maneuvers performed in elite men's professional surfing competitions. *Int J Sports Physiol Perform* 12(9):1243–1248. doi:10.1123/ijspp.2016-0561
- Peirão R, dos Santos SG (2012). Critérios de julgamento em campeonatos internacionais de surfe profissional. *Rev Bras Cineantropom Desempenho Hum* 14(4):439ff. doi:10.5007/1980-0037.2012v14n4p439
- Klingner FC, Klingner FP, Elferink-Gemser MT (2022). Riding to the top – a systematic review on multidimensional performance indicators in surfing. *Int J Sports Sci Coach* 17(3):655–682. doi:10.1177/17479541211042108

### Use in game
Compute a judged score only from measured physical quantities:

| Criterion | Physical measure |
|---|---|
| Commitment and critical section | Distance from the curl/lip at manoeuvre time; local breaking intensity (vortex ratio) |
| Degree of difficulty | Yaw magnitude × yaw rate × speed; rail angle; peak g; airtime and rotation |
| Completion | Controlled finish required. A fall in the main section scores low, per Peirão & dos Santos |
| Speed / power / flow | Speed retained ("turn flow" ≈ 0.9 is good); spray or displaced-water power |
| Variety and combination | Distinct manoeuvre classes linked with little dead time |

- **Validation:** a scripted pro-level ride with turns only should land around 5–6. A clean tube should reach about 6.5–7.5. A landed air reverse plus turns should reach about 7–8.
- Aerial completion for skilled play should end up around 45–55%. If it is much higher, the physics is too forgiving.

---

## Gaps (no usable primary data found)
1. Measured surf pumping: speed gain per pump, frequency, energy. Only the model and analogue physics above exist.
2. Controlled measurements of speed change from fore/aft weight shift, trim, stall or hand drag.
3. Duck-dive and turtle-roll biomechanics: depth, forces, timing.
4. Hold-down durations measured with sensors; leash loads measured in the field.
5. Tube-riding speed and crouch posture (knee/hip angles); pig-dog mechanics.
6. Snap / off-the-lip / floater sensor kinematics. Only bottom turn and cutback have data (Forsyth 2024).
7. Stance width and in-ride joint angles. Weiss 2025 (river wave, n = 7) is the only in-ride musculoskeletal dataset; I saw its abstract and summary values, not the full tables.
8. Surfer-specific reaction times and breath-hold capacity.
9. Lineup-positioning strategy.
10. Dally 2001 ("maximum speed of surfers") and Matsumoto & Griffin 2003 damping values: full texts not retrieved.

## Cautions on the numbers
- In the Mead & Black 2001 Table 6.1, the "length/H" and "width/H" columns appear swapped. I corrected them using the length/width ratio.
- The Mejuto 2024 review's Fernández-Gamboa 2018 speeds (0.5–0.6 m/s) cannot be ride speeds. Do not use them.
- All [D] values are single-number physics estimates (drag coefficients, areas, effective masses assumed as stated). Use them as order-of-magnitude checks, not targets.
