# Step 3.3e — how deep a real surfer stands, how deep ours stands, and why "deeper" is the wrong axis

Written 2026-11-15 by the research agent (Opus 5) on branch `claude/rider-stance-depth`, cut from `main` at
**2d37193a** (step 3.3c) and **rebased onto 9a6eaf92** (step 3.3d part 1b) before the push — see §7. **Research and
measurement only: no source file under `src/` is touched, so the game is unchanged by construction.** One probe is
added (`stance.ts`), read-only, driven only by the shipped inputs.

Tags as in 3.2 and 3.3: **[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source I or a
delegated searcher opened; **[I]** inferred from a model that is stated.

The owner set the question themselves:

> *"when a surfer starts a wave and position himself on the wave, how deep are they to allow them to turn sharply and
> keep balance. **This is what you should aim for.** I can give you feedback about how it feels but in the end i just
> want to play a game that feels like real surfing."*

And, of the shipped game on `?rider=new&feltFrame=deck`: *"in Compress the surfer is not down enough, or in Snap. So
the surfer doesn't turn fast enough."*

---

## 0. The answer in five sentences

1. **Our Compress is not shallow. It is deeper than every riding or turning posture ever measured in surfing, and it
   sits exactly on the deepest surf posture in the literature — an elite professional's aerial landing.** Measured on
   the Canyon-matched cell, the default rider's Compress holds the hips **0.48 m over the deck in 6 of 6 runs**, which
   on our own leg converts to a **66° included knee (114° of flexion)** [M]; Seixas et al. 2023's 97 aerial landings by
   top-5 WSL professionals mean **113.78 ± 19.90° of front-knee flexion**, which converts to **0.481 m** on the same
   leg [S, conversion mine].
2. **The only measured surfing *turn* posture there is is barely crouched at all.** Weiß et al. 2025 (n = 7) peak at
   **44.7° front / 51.1° rear of knee flexion** through a river-wave carve — **0.79–0.81 m** of hip height on our leg,
   which is our **standing** stance, not our Compress [S, conversion mine]. **There is no measurement of stance depth
   in an ocean bottom turn, a snap, a cutback or in trim. The field's own 2026 scoping review says so in as many
   words.**
3. **So "deeper" is the wrong axis, and the brief's premise and the owner's are both refuted on the same number.** My
   coordinator's framing (deeper is the axis) and the owner's (more down → sharper turn) are the two things this round
   was told to check first, and the measurement contradicts both: **across the depth ladder, our rider's peak turn rate
   FALLS as it crouches — lower in 6 of 6 paired runs on the default rider and 5 of 6 on the new rider** [M]. In our
   game deeper does not turn sharper; it turns flatter.
4. **There is, however, a real and specific defect behind the owner's words, and it is not a depth — it is a
   contrast.** On the rider the owner actually rides (`?rider=new`), the balance's own knee drop already crouches the
   *standing* stance by 0.05–0.29 m, so pressing Compress adds only **0.03–0.12 m in 4 of 6 paired runs** against the
   **0.30–0.34 m it adds in 6 of 6 on the default rider** [M]. The button is delivering a tenth to a third of its
   design change. *"Not down enough"* is a true report of a stance that barely changes, not of a stance that is high.
5. **And the turn's clock is the gap worth sizing.** Ours takes **2.30–3.53 s** to put 85° of heading on the board
   (default rider, Compress, 6 of 6) against Forsyth et al. 2024's **99 ± 4° in 0.96 ± 0.04 s** [S] and the owner's own
   read of their Nias reference at *"around two seconds turning"*. Our *peak* rate is not the problem — 77–228 °/s
   (1.3–4.0 rad/s) brackets Forsyth's 1.9 ± 0.1 rad/s [M, S]. **We have the rate in spikes and not in a sustained
   arc.**

---

## 1. What the sources actually have, with populations, conditions and datums

**The datum problem first, because it nearly inverted two readings.** The literature uses **both** conventions for knee
angle. Lynch 2021, Zöger 2025, Qin 2025 and Kröll 2016 state **180° = full extension**, so their "110°" is a shallow
bend. Chen 2016, DeVita & Skelly 1992 and Seixas 2023 state **0° = full extension**, so their "110°" is deep. Several
papers state no datum at all. Every row below carries its datum, and **every number is restated as *flexion from
straight*** so the column is comparable.

### 1.1 Stance depth in surfing

| Source | What it measures | Number | Datum | Population | Conditions |
|---|---|---|---|---|---|
| **[S] Weiß et al. 2025**, *Multibody Syst Dyn*, [10.1007/s11044-025-10071-3](https://doi.org/10.1007/s11044-025-10071-3), open access | **peak of a river-wave figure-eight carve** | peak knee flexion **rear 51.05°, front 44.74°**; peak hip flexion rear 55.01°, front 49.99°; peak ankle rear 21.06°, front 18.30° | **not stated by the paper**; OpenSim-named coordinates, so 0° = anatomical neutral, + = flexion **[I]** | n = 7 **male**, 44.8 ± 4.7 y, proficient river-wave surfers (5 regular, 2 goofy) | standing **river wave**, 8.2 m³/s over 8 m; 233 surf cycles; 10 IMUs + 2–4 cameras at 60 Hz; self-selected speed |
| **[S] Weiß et al. 2024**, ECSS Glasgow abstract (FAU CRIS 331306594) | same, pilot | peak knee flexion **64.5° back turn / 65.8° front**, front-leg absolute peak **69.8°** | same, not stated | **n = 1**, 9 surf cycles | same river wave |
| **[S] Seixas et al. 2023**, *Cuadernos de Psicología del Deporte* 23(2):169–193, [10.6018/cpd.534281](https://doi.org/10.6018/cpd.534281), open access, full text read | **aerial landing**, lowest point after touchdown | **front knee flexion 113.78 ± 19.90°**; front ankle dorsiflexion 32.74 ± 14.51°; base of support 79.17 ± 13.72 cm; CoM excursion from the flight's highest point to the landing's lowest **169.60 ± 52.85 cm** | **explicit and quoted**: *"knee angle was measured considering zero (0º) as total knee extension"* | **top-5 ranked male WSL surfers**, 2018 + 2019 seasons; 254 aerials observed, **97 measured** | WSL heat-analyser competition video, 19 WCT events; Kinovea 2D, scaled from each surfer's own shank length; intra-observer ICC > 0.90 |
| **[S] Borgonovo-Santos et al. 2021**, *Sensors* 21(5):1783, [PMC7961430](https://pmc.ncbi.nlm.nih.gov/articles/PMC7961430), full text read | **pop-up landing**, at peak reaching force | knee **front 99 ± 20°, rear 101 ± 14°**; feet 0.63 ± 0.10 m apart; landing peak **1.63 N/kg ≈ 160 % of body weight**; feet-base vs rear-knee r = −0.50, p = 0.01 | **NOT STATED** — Visual3D inverse kinematics, no sign convention, no reference posture. **Unusable as a depth figure.** | n = 23 **male**, 28.4 ± 10.1 y, **1.73 ± 0.07 m**, 68.3 ± 10.8 kg, 12.4 ± 8.9 y experience | **lab** simulated pop-up; 12-camera Qualisys 200 Hz, 46 markers, 4 Bertec plates laid out as a 74-inch board |
| **[S, secondary] Everline 2007**, *Strength Cond J* 29(3):32–40 — **could not open** | "the surfing stance" | **"half-squat position with knees flexed 30–80°"** | not available | **not available** | **not available** — the article's own title calls it *"a qualitative assessment of maneuvers"* |
| **[S, thesis] de Sousa 2022**, master's thesis, Faculdade de Motricidade Humana, U. Lisboa; validated with seven national coaches; the owner holds the copy | bottom-turn phases, **qualitative** | preparation: knees **90–110° included**; fundamental: knees and hips **90° or less included**; final: knees to **150° or more** | included angles, 180° straight | 7 coaches validating an observation tool; **no surfers measured** | observation-tool development, not a kinematic study |
| **[S, abstract only] Bruton, O'Dwyer & Adams 2013**, *Int J Perform Anal Sport* 13(2):388–402 | **"surfing crouch posture"** by skill | recreational **females** used a *"shallower surfing crouch posture, with less knee flexion than their competitive counterparts"*; lower-limb stiffness fell with expertise | not reachable | not reachable | **No degrees reachable.** The only study found that measured crouch depth against skill — the most valuable paywalled item in this search |

**The citation correction this turns up, and it lands in our own code.** `AttachedRider.ts`'s `CARVE_FLEX` comment
justifies its depth as *"the deep end of the surf stance's half-squat (knees flexed 30–80°, Borgonovo-Santos et al.
2021)"* [R]. **That attribution is wrong.** The 30–80° is Everline 2007, *quoted* by Borgonovo-Santos as their
reference [2]; Borgonovo-Santos measured no riding stance at all, and Everline is a practitioner review with no
population, no protocol and no datum. **A number currently load-bearing in our physics traces to an unsourced
practitioner claim.** The code's citation of Weiß 2025's 45–51° in the same comment is correct.

### 1.2 Turn kinematics — what exists beyond Forsyth

| | **[S] Forsyth et al. 2024** | **[S] Shormann & In Het Panhuis 2020**, *PLoS One* 15(4):e0232035, [PMC7173857](https://pmc.ncbi.nlm.nih.gov/articles/PMC7173857) |
|---|---|---|
| Population | n = 6 **male** accomplished surfers, 31 ± 6 y, 180 ± 9 cm, 76 ± 11 kg, 22 ± 5 y experience | n = 4, **sex not stated**; self-rated skill 6, 7, 8 and **9 (WSL CT professional)** |
| Conditions | **Macaronis, Mentawai Is., one left-hand reef**; mean wave power **450 ± 30 kW/m**; 227 waves, 835 turns; instrumented board, IMU + GPS | ocean breaks incl. Hawaii, 2015–2019, 146 sessions, **2,060 cutbacks on 1,920 waves**; TraceUp 9-axis IMU + **10 Hz GPS** on the nose; wave power **13–16 ± 3 kW/m** |
| Bottom turn | **7.3 ± 0.2 m/s, 1.9 ± 0.1 rad/s, 42 ± 3° roll, 99 ± 4° of yaw in 0.96 ± 0.04 s** | **0.8 ± 0.03 s**, 1.7–1.9 rad/s, 69–92° of yaw, 34–46° roll, initial speed 6.2–8.8 m/s |
| Cutback | **6.7 ± 0.1 m/s, 3.0 ± 0.1 rad/s, 75 ± 3° roll, 42 ± 2° pitch, 152 ± 3° in 0.96 ± 0.03 s** | **1.0–1.1 s**, 2.2–3.2 rad/s, 120–178° of yaw, 46–75° roll, 29–46° pitch, 5.7–7.4 m/s |
| Also | top speed 9.7 ± 0.1 m/s; session mean 6.4 ± 0.1; **3.8 ± 0.2 turns a wave** | total rotational power 278–326 W pooled; max speed 7.3–10.1 m/s |

Two independent populations, 835 and 2,060 turns, agreeing on duration within 0.2 s and on rate within 0.2 rad/s.
**This is the best-sourced thing in the whole report, and it is about the board.**

**On body kinematics in turns, the honest answer is that they do not exist.** The field's own scoping review
([S] *Biomechanics* 6(2):36, 2026, 26 studies / 490 surfers, PDF read) states verbatim: *"Biomechanical analyses of
manoeuvres such as bottom turns, cutbacks, and aerials are particularly rare, despite their central role in
competitive performance."* Its topic list names **trimming** as a phase with **zero** studies attached. Weiß 2025 is
the only field study that measures a surfer's body, and it measures a river wave.

### 1.3 What the snap scrubs — nothing in the literature answers this

The owner defines the snap as *"super sharp turns that decrease speed."* **No study reports entry-versus-exit speed or
deceleration for any manoeuvre.** I checked this specifically in both datasets above: each gives one mean speed per
turn *type*, never a within-turn delta. What exists:

- **[S] Between turn types, population-level:** bottom turn 7.3 ± 0.2 vs cutback 6.7 ± 0.1 m/s (Forsyth, 835 turns);
  pooled 7.1 vs 6.3–6.4 (Shormann, 2,060 cutbacks); the CT professional 7.4 → 6.9. **A 0.6–0.8 m/s standing difference
  between the two manoeuvre types, not a measured scrub.**
- **[S, one trace, do not promote]** Shormann's Fig. 2, one wave, one surfer: 9.2 m/s at drop-in → 11.5 at the bottom
  turn (t = 0.79 s) → 10.1 entering the cutback (t = 1.25 s) → cutback at 2.21 s. **1.4 m/s over 0.46 s ≈ 3 m/s²
  ≈ 0.3 g.** It is the only published speed-versus-time trace through a turn sequence I could find, it is **one trace
  on one wave**, and its GPS is 10 Hz — eight samples across a turn. **It is not a number and this round does not make
  it one.**
- **Nothing at all exists for a snap or an off-the-top.** The manoeuvre the owner wants tuned has no kinematic
  literature.

### 1.4 The crux: what the crouch actually buys, and in what proportion

**This is the part that refutes both framings, and it is arithmetic, not opinion.** With the base of support held
**fixed** — which is exactly surfing, because the feet are bolted to a board of fixed width — lowering the centre of
mass does not change the static stability limit **at all**. The term is not in the equation.

Inverted pendulum, pivot at the support plane, CoM at height *h*, base reaching *d* from the resting CoM projection,
mass *m*. Four places *h* can enter, and they do not point the same way:

| Term | Expression | Effect of lowering *h* | For 0.98 → 0.70 m (−28 %) |
|---|---|---|---|
| **Static limit** — the CoM projection against the base | topples when *x* > *d*; restoring moment *m·g·(d − x)* | ***h* is absent** | **0 %** |
| **Sustained lateral force / lean it can hold** | *a*_crit = *g·d/h*; θ_tol = atan(*d/h*) | better, **linearly (1/h)** | 2.50 → 3.50 m/s² (**+40 %**); 14.3° → 19.7° |
| **Velocity / impulse it can absorb** | *v*_max = ω₀·*d* = *d*·√(*g/h*); *J*_max = *m·v*_max (Hof et al. 2005 Eq. 8) | better, **as a square root (1/√h)** | 0.79 → 0.94 m/s (**+18 %**) |
| **Time to react; tolerable control delay** | 1/ω₀ ∝ √*h*; τ_crit = √2/ω₀ (Insperger & Milton 2017) | **WORSE**, as a square root (√h) | 0.316 → 0.267 s (**−15 %**) |

[S] for Hof, Gazendam & Sinke 2005, *J Biomech* 38:1–8 (n = 10 healthy young, 5 M / 5 F, 23.3 ± 1.3 y, leg length
0.936 ± 0.06 m, 30 s quiet standing, Bertec 40 × 60 cm plate), read in full; [S] for Insperger & Milton 2017 (IUTAM,
read in full: τ_crit,PD = √(4ℓ/3g), minimum balanceable length ℓ_crit = (3/4)gτ²; experts balance a 30 cm stick for
240 s at a 230 ms feedback delay); the arithmetic in the table is **[I]** with the model stated.

**So the crouch's balance payoff is the smallest of its three payoffs, it is not "harder to tip over", and it is bought
at a cost in reaction time.** The two experiments that exist point the same way: [S, abstract only] Ogihara, Kashimura
& Ishida 2003 (*Primate Research* 19(1):33–42, n = 5 male, stabilometer with horizontal surface perturbations) found
upright posture **not significantly less stable** than an ape-like bent-hip bent-knee posture *despite its higher
centre of mass*, with the flexed posture needing **more** muscle activation; and [S, full text] a 2025 Tai Chi
squat-depth study (PMC12193758, n = 13 male novices, depths set at 0.81 / 0.89 / 0.97 of standing height) found the
**low squat least stable on every index, all p < 0.01** — **even though the authors state the low squat gave a wider
base of support.** Neither is the clean experiment, and **the clean experiment has not been run**: nobody has held the
base fixed, manipulated CoM height, applied a mechanical perturbation and reported a margin of stability.

**What the crouch does buy, with factor-scale measured payoffs:**

- **Shock absorption — large, clean, four converging samples.** Peak landing force falls **1.54–1.76×** soft versus
  stiff: 1.63 ± 0.73 vs 2.60 ± 1.32 BW (n = 16, 40 cm drop, biplane fluoroscopy, Myers et al. 2011 *AJSM*
  39(8):1714–1722); 1.30 vs 2.28 BW at 22 cm and 1.76 vs 2.71 at 44 cm (n = 20 healthy males, Verniba et al. 2017
  *Sports Med Open* 3:6); 3.38 vs 5.36 BW for a drop *jump* (n = 24 male national-team lacrosse). Bought with
  **19–30° of extra knee flexion** and paid back as time: contact 0.52 ± 0.10 s soft vs 0.29 ± 0.05 s stiff, a factor
  **1.79×** against 1.54–1.76× on force — **the impulse closes with no residual.** All of the extra absorption is at
  the knee (−0.78 vs −0.47 J/kg, **+66 %**; hip and ankle unchanged). [S*, read by a delegated searcher.]
- **Turn drive — large, but *inverted* from how the brief put it.** A flexed leg does **not** press harder. Two-legged
  isometric leg-extension force **5461 ± 1131 N (7.3 BW) at a 140° knee against 2920 ± 633 N (3.9 BW) at 100°**
  (n = 28, datum stated 180° = extended, Zöger et al. 2025 *BMC SSMR* 17:14); isometric squat **1.92 BW net at 120°
  against 1.26 BW at 90°** (n = 59 healthy men, Lynch et al. 2021 *Sports* 9(10):140); replicated at 1.94× (n = 35).
  **Three samples agree the crouch costs ~1.9× of peak pressing force.** What it buys is *stroke*: push-off travel
  28.5 ± 4.8 cm from a 110° knee, 39.5 ± 5.5 at 90°, 47.1 ± 6.4 at 70° (n = 21) — **+39 % to +65 %** — plus about
  3.4 cm of jump height from pre-activation at identical geometry (n = 6, Bobbert et al. 1996, who ruled out elastic
  storage). [S*, delegated.]
- **And the sign of the vertical motion is the opposite of "get low when it gets hard".** In alpine skiing, expert
  skiers **flex in the transition between turns and extend through the turn** — corroborated independently by
  Komissarov 2022 (*Sports Biomech* 21(2):912–939), Supej & Holmberg 2019 and Falda-Buscaiot et al. 2017 — so the
  rider is lowest where force is lowest and highest through the loaded arc. The one real skateboarding physics paper
  (Kogelbauer et al. 2024, *Phys Rev Research* 6:033132, n = 2, half-pipe radius 1.9 m) finds the optimal pump is
  **stay crouched into the bottom, extend immediately after passing it, crouch again across the flat.** [S*,
  delegated.] **Across roughly twelve ski and snowboard papers read, not one gives "lowering the CoM for balance" as a
  reason to flex, and Komissarov argues the reverse** — vertical CoM motion raises peak ground force and should be
  minimised.

**Where the cross-sport borrowing holds and where it does not, stated because it must be.** The postural-control
arithmetic (§1.4's table) transfers outright: it is a human standing on a platform, and surfing is the *cleanest* case
of it because the base really is fixed. The landing and leg-extension numbers transfer as limb mechanics. The ski
literature's whole outside-leg / inside-leg structure **does not transfer**, and a ski paper names the reason: *"both
legs are fixed to one board"* compresses the usable knee-angle range (Klous et al. 2007, ISBS 25(1):91–94). And
*R* = *R*_SC·cos Φ, the carving-radius law, **does not transfer at all** — water has no sidecut and cuts no groove.
What does transfer from the snow is the force balance: *a*_lat/*g* = tan Φ. **Snowboarding, where the stance is closest
to ours, turns out to have no usable numbers at all**: the entire measured carving corpus is four studies at n = 5
(one turn), 4, 2 and 1, and **not one reports a measured edge angle, CoM height or knee/hip flexion in degrees with a
stated datum.**

---

## 2. The conversion, with the arithmetic shown and checked against a second instrument

The sources give angles; our model needs a length. The common currency chosen is **the hips' height above the deck, m**,
because it is the currency `AttachedRider` already states its own stances in (*"0.41 m standing (pelvis 0.78 m) and
0.72 m in Compress's crouch (0.48 m)"*, the leg-drive reach bound) [R].

**The model.** A two-link leg, thigh = shank, the hip over the ankle, so the hips' height

&nbsp;&nbsp;&nbsp;&nbsp;*h* = *L*_straight · sin(θ/2),&nbsp;&nbsp;&nbsp;&nbsp;θ = 2·arcsin(*h* / *L*_straight)

with θ the **included** knee angle (180° = straight) and *L*_straight the straight leg. **Our *L*_straight is 0.88 m**,
read off `legDrive`'s own `straight = stance + LEG_EXTENSION` = 0.78 + 0.10 [R], and confirmed by that comment's own
arithmetic: √(0.88² − 0.78²) = 0.407 ≈ its stated 0.41 m, and √(0.88² − 0.48²) = 0.737 ≈ its stated 0.72 m.

**What this conversion is not.** Our physics body is a **point mass on one spring leg**, not a linkage: it has no
knee, and the probe measures `snapDepth: 'deep'` on the default rider taking the hips to **−0.05 m**, below the deck,
which no two-link leg could do. **So the knee angle below is a *reading* of our stance in the literature's units, not
a quantity the model holds.** It also assumes the hip sits over the ankle and the two segments are equal; a real surf
crouch has a fore-aft offset and a trunk lean, both of which make the true knee shallower than this reading.

**The check, and it is an independent instrument.** The game has a second, unrelated measurement of the same thing:
`src/scene/rig/stanceGauge.ts` measures **included joint angles on the drawn four-surfer rig**, and `docs/research/stance-map.md`
publishes its readings. Two points where the two can be compared:

| our stance | hips over the deck | conversion says | the stance gauge says (drawn, 8 readings) | agreement |
|---|---|---|---|---|
| the drop, Shift 0.6 (0.117 m of crouch) | 0.663 m | **97.8° included** | **104°** front / 102° rear | within **6°** |
| Compress, frontside | 0.48 m | **66.1° included** | **69°** front (65–72°) / 88° rear | within **3°** |

**Two points, both within 6°, from instruments that share nothing.** That is what the conversion rests on, and it is
why the numbers below are offered as a reading rather than a guess.

### 2.1 Everything on one scale

Flexion is from straight; `h` is the hips over the deck on a 0.88 m leg.

| | knee, flexion from straight | included | **hips over the deck, m** |
|---|---|---|---|
| **[S] Weiß 2025, front knee, river-wave carve PEAK** (n = 7) | 44.7° | 135.3° | **0.814** |
| **[S] Weiß 2025, rear knee, same peak** | 51.1° | 128.9° | **0.794** |
| **[S] Weiß 2024 pilot, front knee** (**n = 1**) | 69.8° | 110.2° | **0.722** |
| **[S, thesis] de Sousa 2022, preparation** | 70–90° | 90–110° | **0.622–0.721** |
| **[S, thesis] de Sousa 2022, fundamental** | ≥ 90° | ≤ 90° | **≤ 0.622** |
| **[S, unsourced] Everline 2007 "half-squat"** | 30–80° | 100–150° | 0.674–0.850 |
| **[S] Seixas 2023, aerial landing, front knee −1 SD** (top-5 WSL) | 93.9° | 86.1° | **0.601** |
| **[S] Seixas 2023, aerial landing, front knee MEAN** | **113.8°** | **66.2°** | **0.481** |
| **[S] Seixas 2023, aerial landing, front knee +1 SD** | 133.7° | 46.3° | 0.346 |
| **[M] ours: tall, default rider** | 42.6–55.2° | 124.8–137.4° | **0.78–0.82** |
| **[M] ours: full manual crouch, default rider** | 97.5° | 82.5° | **0.58–0.60** |
| **[M] ours: Compress, default rider** | **113.9°** | **66.1°** | **0.48** |
| **[M] ours: Snap as shipped, default rider** | 113.9° (asked) | 66.1° | **0.25–0.59** (overshoots under load) |
| **[M] ours: tall, new rider (`?rider=new`)** | 67.9–113.9° | 66.1–112.1° | **0.48–0.73** |
| **[M] ours: Compress, new rider** | 113.9–120.0° | 60.0–66.1° | **0.44–0.48** |
| **[M] ours: `?snapDepth=deep` (opt-in, OFF)** | 131.7–134.5° | 45.5–48.3° | **0.34–0.36** |

**Read the two measured surfing rows against ours.** The only *riding/turning* posture ever measured sits at
**0.79–0.81 m**, which is our **tall** stance. The only posture in the literature as deep as our Compress is an **elite
professional's aerial landing**, and it lands on **0.481 m** against our **0.48 m** — a coincidence to three decimals
that I am reporting, not relying on.

---

## 3. Ours, measured on the owner's own test spot

**The water.** `stance.ts` runs the Canyon-matched `FaceWater` — **1.4 m, 2.6 m deep, 16°, 5.7 m/s** — which is PR
#223's calibration of the arm of Canyon B, the owner's stated test spot (*"The games Im testing on are the best waves
we have in the game which is canyonWaves=true with spilling waves"*). **It is a fit to Canyon, not Canyon**, and every
number below carries that. **The movement** is the owner's own, as `libturn.ts` fixed it: in trim across the face 45°
off the fall line, the stance held, the stick over until the board is 85° off the fall line, then centred and held.
**Six runs a stance** (3 entry speeds × 2 stick positions), 9 s each, seven stances, two riders — **84 runs**. The
first ~0.17 s of every run is a mount contact transient, as in every probe of this folder; the stance columns start at
0.5 s.

**One frame error, caught in my own probe, reported because the brief requires it.** The first version read the hips as
`parts[1] − deckY` and got **0.780 m to three decimals in all seven stances**. `AttachedRider.parts` is the pose's own
skeleton and is rewritten only when the phase changes, so **the crouch never touches it**: that expression is the
*posture datum*, not the stance. The hips are `posture + leg.extension`, which is what `legDrive` itself computes. The
column is kept in the probe precisely because it is constant — it is the check that the probe's public `deckY` equals
the code's private `base.y`, and 0.780 m matches the leg-drive comment's own figure. A second bug in the same run read
"reached 85° at 0.00 s" on every run that never reached it, because `Number(null)` is 0; both are fixed and commented
in the probe.

### 3.1 The depth ladder, paired run by run (the full table is `results/33e/33e-paired.txt`)

**Default rider (`RIDER=old`), tall → Compress, all six pairs:**

| cell (entry extra, stick) | hips, tall | hips, Compress | **Δ** | yaw peak, tall | yaw peak, Compress | to 85°, tall | to 85°, Compress |
|---|---|---|---|---|---|---|---|
| 0, 0.5 | 0.82 | 0.48 | **+0.336** | 98.6 | **77.5** | 2.97 | 2.93 |
| 0, 1 | 0.79 | 0.48 | +0.315 | 90.7 | **89.2** | 1.70 | 2.30 |
| 1.5, 0.5 | 0.80 | 0.48 | +0.315 | 96.2 | **78.3** | 3.00 | 3.17 |
| 1.5, 1 | 0.79 | 0.48 | +0.313 | 107.1 | **85.0** | 1.82 | 2.75 |
| 3, 0.5 | 0.78 | 0.48 | +0.300 | 139.9 | **99.8** | 3.60 | 3.53 |
| 3, 1 | 0.79 | 0.48 | +0.311 | 96.7 | **80.5** | 1.95 | 3.32 |

**Compress delivers its full 0.30–0.34 m in 6 of 6, and the peak turn rate is lower in 6 of 6.** At the **full** stick
the time to 85° is longer in **3 of 3** (1.70–1.95 s → 2.30–3.32 s); at the half stick it is a wash (2 faster, 1
slower, all within 0.2 s). [M]

**New rider (`RIDER=new`, the owner's), tall → Compress, all six pairs:**

| cell | hips, tall | hips, Compress | **Δ** | yaw peak, tall | yaw peak, Compress |
|---|---|---|---|---|---|
| 0, 0.5 | 0.50 | 0.47 | **+0.025** | 138.5 | **132.3** |
| 0, 1 | 0.67 | 0.48 | +0.188 | 160.5 | **82.2** |
| 1.5, 0.5 | 0.73 | 0.48 | +0.250 | 85.8 | 110.9 |
| 1.5, 1 | 0.48 | 0.44 | **+0.046** | 194.8 | **163.2** |
| 3, 0.5 | 0.57 | 0.45 | **+0.115** | 110.3 | **89.5** |
| 3, 1 | 0.50 | 0.46 | **+0.045** | 227.8 | **100.8** |

**In 4 of 6 pairs Compress adds 0.025–0.115 m over standing tall**, against 0.300–0.336 m on the default rider — and
the peak rate is still lower in 5 of 6. The reason is read in the code, not inferred: on the new rider the leg's rest
is additionally lowered by `HumanBalance.strategies`' own knee drop within the stance's travel (the capture point off
the feet, or the hip near its range) [R], and the probe measures the **tall** stance asking **0.09–0.30 m** of crouch
and getting **0.05–0.29 m** [M]. **The new rider's standing stance is already crouching, so the button has almost
nothing left to add.** That is a correction firing, not a stance — a body saving itself, drawn as a crouch.

### 3.2 The turn's clock, and the one number that is already right

| | to 85° of heading | peak heading rate |
|---|---|---|
| **[S] Forsyth 2024, bottom turn** (n = 6, 835 turns) | **99 ± 4° in 0.96 ± 0.04 s** | 1.9 ± 0.1 rad/s = **109 °/s** |
| **[S] Forsyth 2024, cutback** | 152 ± 3° in 0.96 ± 0.03 s | 3.0 ± 0.1 rad/s = **172 °/s** |
| **[S] Shormann 2020, bottom turn** (n = 4, ocean) | 69–92° in 0.8 ± 0.03 s | 1.7–1.9 rad/s |
| **the owner's own read of their Nias reference** | *"around two seconds turning"* | — |
| **[M] ours, Compress, default rider** | **2.30–3.53 s, 6 of 6** | 77.5–99.8 °/s |
| **[M] ours, Compress, new rider** | **2.97–3.17 s, only 2 of 6 reach it** | 82.2–163.2 °/s |
| **[M] ours, tall, default rider** | 1.70–3.60 s, 6 of 6 | 90.7–139.9 °/s |
| **[M] ours, all 84 runs** | — | **72.7–228.6 °/s = 1.3–4.0 rad/s** |

**The peak rate is not the gap.** Our 1.3–4.0 rad/s brackets both of Forsyth's manoeuvres. **The sustained arc is the
gap**: 85° takes us 2.3–3.5 s where a real bottom turn puts 99° on the board in 0.96 s and the owner reads their own
reference wave at about 2 s. **We have the rate in spikes and not in an arc** — and that is a different defect from
"not enough rate", which is what "doesn't turn fast enough" would ordinarily be read as.

**I did not find the mechanism, and I will not guess at it.** The obvious candidate was that the crouch leans less —
`across.ts` §3 established that on this plant **lean is the only steer** (*"nothing applies a yaw moment or a lateral
force to the board directly, so a steer costs exactly what a lean costs"*) [R], so a flatter turn should show as a
smaller lean. **It does not, cleanly**: paired tall → Compress, the roll peak is lower in **4 of 6** and the rail peak
in **4 of 6** [M]. Four of six is not a finding. Three code reads remain as candidates and none is measured here:
`COMPRESS_PULL = 0.5` (half the pull the lean asks for, an unpaired force), `CROUCH_SOFTENING` (the leg softens to
22 kN/m in Compress), and the lean cap `most = atan(v²/(g·TURN_RADIUS))` on a 4.5 m radius [R].

### 3.3 The owner's "crouching, not compressing" — checked, and it is already a held crouch

The owner's reading of their Nias reference was *"not compressing but more like crouching"*, which my coordinator read
as a possible mechanism mismatch — a pump where the real thing is a held low stance. **Read in the code, our Compress
is already a held crouch, not a pump** [R]: the asked depth is `-max(crouch, compress, snap·snapLoad) × CROUCH_DEPTH`,
a constant −0.30 m for as long as the input is held, and the extension happens only on **release** (`EXTENSION_TALL`,
0.04 m over the riding stance). The probe confirms it from the other end: over the hold the achieved depth is
**0.30–0.34 m with no drift** across 9 s [M]. **So that half of the coordinator's note is refuted: there is no down-up
cycle to remove.** The two opt-in switches that *do* put a cycle in — `carveFlex: 'on'` and `snapLegs: 'drive'` — both
ship **off**, and `carveFlex` is measured here as **bit-identical to Compress on every column** (its 0.4 × 0.3 = 0.12 m
of flex never exceeds Compress's 0.30 m, so the deeper of the two always wins) [M]. What the owner is distinguishing is
real, but it is the ski and skateboard literature's finding (§1.4) rather than a bug: the measured sequence in both
sports is **crouch into the loaded arc and extend through it**, which is what `snapLegs: 'drive'` was built for and
what Compress does not do.

---

## 4. The gap, in one sentence

**In real surfing the crouch buys lateral-force tolerance, stroke and shock absorption and buys *nothing* in static
balance (the term is absent from the equation), while in our game the crouch buys the full 0.30 m of depth it was
designed to and *costs* peak turn rate in 6 of 6 paired runs — so the defect is not that our surfer stands too high
but that our crouch is priced backwards: it is already deeper than any measured surfing posture except an elite
aerial landing, and it pays for that depth in the one currency the owner is asking for.**

---

## 5. What I could not open

- **Everline 2007**, *Strength Cond J* 29(3):32–40 (Lippincott) — **the source of the only riding-stance figure in
  existence**, the 30–80° our own `CARVE_FLEX` comment misattributes to Borgonovo-Santos.
- **Bruton, O'Dwyer & Adams 2013**, *Int J Perform Anal Sport* 13(2):388–402, and **Bruton, Adams & O'Dwyer 2017**,
  *Percept Mot Skills* 124(5–6):992–1008 — abstracts only. The 2013 paper is **the only study found that measured
  surfing crouch depth as a function of skill**, and its degrees are unreachable. **This is the most valuable
  outstanding item in the whole search.**
- **Whitting, Brinsmead, Forsyth, Hollier & Crowley-McHattan 2024**, *Scand J Med Sci Sports* 34(11):e14755 (Wiley; no
  accepted manuscript in the SCU or UOW repositories) — 199 frontside bottom turns from the 2017 WSL J-Bay finals with
  a 47-item critical-feature checklist. Everything visible says it is **qualitative features only, no angles**, but it
  is the most likely place for a sourced description of bottom-turn body position.
- **Forsyth et al. 2020**, *Scand J Med Sci Sports* 30(5):878–884 — abstract only (landing dorsiflexion 1.0–3.7°, knee
  and hip ROM lower in the harder aerial, p = .002–.048; n = 14 competitive surfers; magnitudes paywalled).
- **Lundgren 2015** ECU thesis, chapters 3–7 restricted; **Hébert-Losier, Supej & Holmberg 2013** *Sports Medicine*
  systematic review (login) — the obvious place for a field-wide answer on the (A)/(B)/(C) framing.
- **Ogihara et al. 2003** full text — a 1-bit encrypted scan, unreadable without OCR, so its perturbation magnitudes
  and p-values are not available. **Winter 1995**, *Gait & Posture* 3:193–214 — no full text obtainable anywhere
  tried, abstract level only, although `AttachedRider.ts` cites it [R].
- **Hof et al. 2005's Table 1** — the extraction's columns are misaligned (it yields a 76 mm base with a 64 mm margin
  inside it, which is impossible), so **those numbers are deliberately not quoted anywhere above.**
- I **cannot watch video**, so the owner's Nias reference (`youtube.com/shorts/GD8vS7_faSo`) is in this document only
  as **the owner's own words about it**. The stance map's video readings (Kerr, Gudauskas) are earlier rounds' and are
  quoted as theirs, not re-read here.

## 6. What I will not claim

- **I will not claim a stance depth for a real bottom turn, a snap, a cutback or trim, because nobody has measured
  one.** §1.1 is the whole of what exists, and the two numbers in it that bear on a turn are a *river wave* (n = 7,
  mean age 44.8, self-selected pace, a figure-eight carve closer to a wakesurf than a reef bottom turn) and an *aerial
  landing*. **I will not take a midpoint of that range.** The field's own review says the gap is real.
- **I will not carry Weiß 2025's front/rear split.** The paper's own appendix reports its model-versus-pose agreement
  as **knee RMSE 12.50° / 15.62° and hip 12.23° / 11.69°** — larger than the 6.3° knee and 5.0° hip differences it
  headlines. I use only the magnitude, ~45–51°, and the pilot's n = 1 at 64.5–69.8° is quoted separately and **never
  averaged with it.**
- **I will not claim our Compress leans less than our tall stance.** It was my mechanism for the slower turn and the
  paired roll and rail peaks say **4 of 6 each**, which is not a result. §3.2 names three unmeasured code candidates
  instead.
- **I will not claim `?snapDepth=deep` turns better because it is deeper.** It reaches 85° once in six runs at 1.50 s,
  and on the time to **45°** — which 6 of 6 reach — it is **indistinguishable from Compress** (1.05–2.62 s against
  1.10–2.70 s) [M]. **One run of six is not a number.** The `snap-carve-2026-11-08` doc also already measured 5 of 12
  riders falling after the release on still water at that depth, which is why it ships off.
- **I will not claim this is the owner's fall or the owner's feel.** Nothing fell this round: **84 of 84 runs stood**,
  on a cell where Part 22's twelve all fell — because the steer is on from the first frame here, not from 0.3 s. So
  **this round's runs are not comparable with 3.2's fall population** and no fall claim is made from them.
- **The `FaceWater` is a fit to Canyon, not Canyon**, and the rider is placed rather than paddled in. Every span above
  is **the whole population of six runs**, not a confidence interval.
- **I will not claim the conversion is a model quantity.** §2 is a reading of our stances in the literature's units,
  validated at two points against the drawn stance gauge to within 6°, on a point-mass leg that has no knee.
- **No bot ride is offered as evidence of feel anywhere in this document.** The owner rides and judges.

## 7. Seatbelts

- **No file under `src/` is touched**, so the game is unchanged by construction and the Canyon hashes cannot move. The
  deletions column was read before the push (`git diff --stat origin/main HEAD`) and is **additions only, all under
  `docs/research/new-rider/3.3/`**. The expensive Canyon byte bench is deliberately **not** run: with no source file
  changed it could only re-measure `origin/main`, and the brief's own three cautions about it (the
  `globalThis.location` wrapper, the grid, the "spun up on the CPU" line) exist for rounds that do change the solver.
- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- The root project includes only `src`, so the probe was type-checked separately on a throwaway project extending the
  root's options with `types: ["node"]` and an **absolute** `typeRoots` (a tsconfig outside the tree resolves
  `@types` from its own folder — 3.3b's note):
  **exit 0**
  and `--listFiles` confirmed it covered `docs/research/new-rider/3.3/stance.ts`, `src/physics/AttachedRider.ts` and
  `@types/node`.
- **The worktree's `node_modules` is a symlink to the main checkout's**, so `npx` never printed an install banner and
  the exit codes above are `tsc`'s own, read on their own line and never through a pipe.
- **The rider, board, HUD and runner test files were not run, and that is deliberate**: this round adds one file under
  `docs/` and edits nothing those suites cover. `src/wave/SurfZoneSimulation.test.ts` is closed by reading, as
  `c2-step5g.md` §7.4 requires.
- **The rebase, and why nothing was inherited across it. The deletions column earned its place again.** With the work
  staged, `git diff --cached --stat origin/main` showed **20,157 deletions across 97 files** — the surfer track had
  merged step 3.3d (`origin/main` **9a6eaf92**, three commits: `b0cfa5f5`, `02e43e21`, `9a6eaf92`) while this round
  ran, and the branch, being behind, would have reverted it. Rebased onto 9a6eaf92; no conflict, and the column is now
  **6 files, additions only, every one of them new and all under `docs/research/new-rider/3.3/`**.
- **And nothing was inherited: every number above was re-measured on the rebased tree.** 3.3d changes
  `src/physics/hullForces.ts` and `src/physics/BoardBody.ts`, which are inside this probe's own bundle. Its hydrostatic
  re-pointing is **opt-in and ships off** (`this.buoyHull = options.buoyFrame === 'hull' ? 1 : 0`, the `?buoyFrame=hull`
  dev switch) [R], so the default physics this probe drives is unchanged — and that is checked rather than asserted:
  the probe was rebuilt and both riders re-run on 9a6eaf92, and **all 84 rows are byte-identical to the pre-rebase
  runs** (`diff` on both `.jsonl` files, 42 rows each). The three `tsc` runs below were also re-run on the rebased
  tree and are that tree's.

## 8. Files (3.3e)

- `docs/research/new-rider/3.3/stance-depth.md` — this document.
- `docs/research/new-rider/3.3/stance.ts` — the probe. Read-only: it drives the shipped inputs (`crouch`, `compress`,
  `snap`, `steer`) and the three already-shipped opt-in switches, and changes no default.
- `docs/research/new-rider/3.3/results/33e/` — `33e-old.jsonl` and `33e-new.jsonl` (42 rows each), `33e-tables.txt`
  (both printed tables), `33e-paired.txt` (the ladder paired run by run, which is the instrument §3.1 quotes).

## 9. One line saying what we should aim at

> **Stop aiming at depth — our Compress already holds the hips 0.48 m over the deck, a 114°-flexed knee, deeper than
> every measured surfing posture except an elite pro's aerial landing — and aim instead at the turn's clock and at the
> contrast: 90° of heading in 1–2 s against our 2.3–3.5 s, a crouch that stops costing 15–30 % of the peak turn rate,
> and a Compress on `?rider=new` that visibly changes the stance by its designed 0.30 m instead of the 0.03–0.12 m it
> currently adds over a standing stance that is already crouching.**

## 10. For the owner, in plain words

**Your surfer is not standing too high. He is already crouched deeper than any surfer anyone has ever measured on a
wave.** I measured him on the wave you test on: in Compress his hips sit 48 cm over the board, which is a knee bent
114 degrees from straight. The only people measured that deep in surfing are the world's top five, and only at the
moment they land an air. The only time anyone has measured a surfer's body *through a turn*, his knees were bent about
45 to 50 degrees — which is roughly how your surfer stands when you are **not** pressing anything.

**So "more down" would make it worse, and I can show you why.** I ran the same turn at four depths, six runs each.
Every time he gets lower, his turn gets **flatter**: his fastest turning rate dropped in six out of six matched pairs
when he crouched, and at full stick his turn took half a second to a second and a half *longer*. In our physics, depth
and sharpness are currently trading against each other. The deep setting we already have behind a switch
(`?snapDepth=deep`) does not fix that either — it reached the full turn in one of six runs.

**But you were right that something is wrong with Compress, and I think I found it.** On the rider you are playing
(`?rider=new`), his *standing* stance is already sinking, because his balance system drops his knees to save itself.
So when you press Compress, in four of six runs he only goes down another **3 to 12 centimetres** — where the same
button on the old rider takes him down a full **30 to 34**. The stance is deep; the *change* you press the button for
has almost vanished. That is exactly what "not down enough" would feel like, and it is a fixable thing.

**And the turn is genuinely too slow, by about the factor you guessed.** You said the surfer in your Nias clip is
turning for around two seconds. Ours needs **2.3 to 3.5 seconds** just to get 85 degrees round, and the measured
professionals do 99 degrees in **under one second**. Here is the odd part: his *peak* turning rate is already right —
it lands between the two professional numbers. He has the speed in flicks and not in a sustained arc. That is a
different problem from "not enough power", and it is the one I would go after next.

**Nothing to ride this round: the game is byte-for-byte what you have.**
