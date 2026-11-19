# The across-speed against a human's — the primaries opened, and the `[S needed]` closed twice

Written 2026-11-19 by a literature agent (Opus 5) on branch `claude/across-speed-lit`, cut from `claude/the-record`
at **904803a2** (step 3.5j). **Docs only. No source file is touched, no bench was run, and no tuning is proposed.**

Tags as in the 3.2 series: [M] measured by a probe; [R] read in the code; [S] from a source I opened myself;
[S*] from a source I could **not** open; [I] my inference or arithmetic.

---

## 0. ⚠️ FIRST, THE THING THAT MATTERS MOST: THIS JOB WAS ALREADY DONE FOUR DAYS AGO

The brief for this round said the `[S needed]` marker in Part 23 §7 was *"a sourcing job that has never been done."*
**It was done on 2026-11-15 and it is merged on `main`.** It is
[`docs/research/new-rider/3.2/README.md` **Part 24**](../3.2/README.md) — *"the across-speed against a human's, from
the literature"*, step 3.2z, branch `claude/rider-new-32z`. It answers the question in the same words the brief uses,
reaches the verdict **"outside, and the test is not mis-scaled"**, and refutes both of the branches Part 23 set up.

**PR #445's `swing-demand.md` §6 re-raises it as open** (*"source a human's own across-speed at the feet's edge
against the model's measured median 1.21 m/s … it is marked `[S needed]`, so it is a reading job and not a build"*),
and this round's brief then re-commissioned it from that. **Part 24 is on `main` and on `claude/the-record`; the
`[S needed]` string in Part 23 §7 is simply never struck through, so it keeps recruiting rounds.** That is the
process finding, and it is worth more than any number below: **three rounds have now been spent on one marker.**

**So what this round actually is: an independent verification of Part 24 from the primaries, plus the two questions
Part 24 did not answer.** It changes Part 24's verdict in **no** respect. It makes it **stronger**, puts a **number**
on the one term Part 24 could only bound at "zero", and answers the pendulum length.

---

## 1. The six sentences the round is for

1. **Part 24's literature is sound. I re-opened five of its ten rows from the primaries and every figure I could
   check was right, including the ones it flagged as second-hand.** Hof's Table 1 — which Part 24 explicitly
   *"will not claim from my own reading"* (§7) because the machine has no `pdftoppm` — **is now read from the primary
   PDF** and its quiet-standing CoM velocity is **2.6 (1) mm·s⁻¹ r.m.s., two feet, eyes open**, exactly as Part 24's
   delegated agent reported [S]. Stein & Mombaur's slackline accelerations (**1.70 / 1.44 / 1.26** m·s⁻² stance foot
   against **0.34 / 0.29 / 0.28** CoM, r = 0.83 → 0.64, n = 20, 18–32 y, a 3 m × **5 cm** line 31 cm up, 8 cameras at
   150 Hz) are right to the digit [S]. Hasson 2008 is right to the digit **including its subtlety** — the
   251/324/321 mm·s⁻¹ row really is labelled a *range across challenge levels*, and the paper really does report no
   absolute boundary velocity [S]. **Part 24's provenance discipline survives being checked**, which after
   2026-11-18's provenance correction is itself worth recording.
2. ⭐ **The term Part 24 could only bound at "zero" now has a measured size, and it is 3.5–5.5 cm.** Part 24's §5
   says the game's allowance is *larger* than a human's because the feet-in-place theorem credits counter-rotation
   with nothing. It does — but the literature does not stop at the theorem. Inkol's trajectory-optimisation model of
   **lateral** balance recovery, evaluated against **10 subjects'** own perturbation data, puts the whole benefit of
   the counterbalance strategy over Hof's inverted pendulum at **3.50 to 5.50 cm of extra XcoM excursion**, and at a
   normalised CoM position of 0.5 at **116 % (3.50 cm)** more than Hof's bound [S]. Its experimental margins agree:
   **21.67 ± 0.55 cm (Hof) against 25.09 ± 0.600 cm (counterbalance)** in quiet stance, a gap of **3.42 cm** [S].
   ⭐ **The game's `reachAcross` is 0.175–0.396 m [M, Part 24 §3] — 3.2 to 11.3 times that credit** [I, the division].
   **So the test is not merely "more generous than a feet-in-place human". It is 3–11× more generous than the
   literature's own best model of the very mechanism it is crediting**, and the direction of the error is **leniency**.
3. ⭐ **The pendulum length is wrong, by a known rule, in the lenient direction, by 8–9 %.** The game sets
   `height = offset · n̂`, the CoM's own height above the feet point along the felt vertical [R, `humanBalance.ts`:469],
   so its `ℓ` **is** the CoM height. Hof's §2.2 — the same paper the file cites — says plainly that `ℓ` is an
   **equivalent** pendulum length, **1.20 or 1.24 times trochanteric height** fore-aft (Geurtsen 1975 with Winter's
   1979 mass data) and **1.34 times** it in the frontal plane (Massen & Kodde 1979) [S]. Inkol's model fixes both
   numbers on one body: `ω₀ = 2.74 s⁻¹` from `ℓ = 1.34 ×` trochanteric height, with a **CoM height of 1.01 m** on a
   1.80 m, 75 kg model — so **`ℓ / h_CoM` = 1.294** measured on their own table [S, their Table 6.1; I, the division].
   Carried to the fore-aft rule that fits **our** axis, `ℓ` should be **1.159–1.197 × h_CoM** [I], i.e. **0.824–0.851 m**
   for our 0.711 m rider, not 0.711 m. **`1/ω₀` should be 0.290–0.295 s where the game computes 0.269 s at one g, so
   the velocity term is 7.6–9.4 % too small** [I]. A test that under-counts velocity is a test that is too kind.
4. ⭐ **And the coefficient question answers itself: `0.22–0.32 m per m/s` and `1/ω₀ = 0.249–0.308 s` are the same
   number.** `m / (m·s⁻¹)` **is** seconds. `swing-demand.md` §4.2 already says so (*"`1/ω₀` measures 0.249–0.308 s,
   which reproduces step 3.2x's 0.22–0.32 m per m/s"*), and the brief asked them as two questions. **A human's own
   value is 0.338–0.358 s** on Hof's own subjects (leg length 0.936 m, the three multipliers above) and **0.365 s** on
   Inkol's model [I, arithmetic on sourced lengths]. **So the game's coefficient is the right order and 10–30 %
   low** — the same error as §3, seen from the other side, because it is the same error.
5. ⭐ **The one comparison that needs no arithmetic at all, and it is the answer: the velocity term in metres.** The
   quantity `v/ω₀` **is** `XcoM − CoM`, and Hof reports it directly, in metres, on humans, in his own words:
   **"about 1 mm in standing on two feet"**, **"up to 1 cm"** standing on tiptoe, and **"up to 4 cm"** in walking
   (§5.3, Fig. 6) [S]. The game's shipped twelve run a velocity term of **0.164–0.344 m, median 0.260** [M, Part 24
   §3] and PR #445's two arms peak at **0.478 and 0.787 m** [M]. ⭐ **6.5 times Hof's largest human figure at the
   median, and 12–20 times it at the peak — same construction, same units, same frame, same author.** No source I
   opened puts a human within a factor of six of the game's median.
6. ⭐ **But Hof's own data contain the one regime where a human does run a velocity term bigger than the base, and
   what they do about it is exactly what Part 24 §6 said was missing.** In walking the term reaches 4 cm while the
   margin `b` is *"in the range of only 2–3 cm"* [S] — ratio **1.3–2.0**, above one. Humans live there by **moving
   the base**: Hof 2010's finding is that *"mean centre of pressure (foot) position is a constant distance outward of
   the extrapolated centre of mass"* [S*, abstract only]. **The game's rider cannot step. Its base is a board, and
   `HumanBalance` cannot aim it** [R, Part 24 §6]. ⭐ **So the literature's answer to a large velocity term is the
   base's own placement, which is the measurement Part 24 named as next and nobody has taken.** That is now a
   sourced recommendation rather than a diagnosis.

---

## 2. The sources, with populations, conditions, instruments — and whether I opened them

| # | Claim | Number | Population / condition / instrument | Source | Opened? |
|---|---|---|---|---|---|
| L1 | The construction the game implements | stable iff `x + v/ω₀` inside the BoS; `ω₀ = √(g/ℓ)`; the margin `b = \|u_max − (x + v/ω₀)\|` | an inverted pendulum on a **stationary** base under gravity. Derivation is analytic, no sample | Hof, Gazendam & Sinke 2005, *J Biomech* **38**:1–8 | ⭐ **YES — full text from the braceworks.ca PDF, extracted with `pypdf` + `fontTools`** |
| L2 | `ℓ` is **not** the CoM height | `ℓ = 1.20` or `1.24 ×` trochanteric height fore-aft (trunk vertical / trunk at the leg angle); **`1.34 ×`** in the frontal plane | analytic, from Geurtsen et al. 1975 and Massen & Kodde 1979 with Winter 1979's mass data | as L1, §2.2 | ⭐ **YES** |
| L3 | Quiet-standing velocities and margins, in full | see Table 1 reproduced in §3 below. Two feet EO: **CoM velocity 2.6 (1) mm·s⁻¹ r.m.s.**, `b_min` **64.2 (8) mm**; one foot on tiptoe EO: **17.7 (7) mm·s⁻¹** and `b_min` **−9.3 (14) mm** | **n = 10, 5 M / 5 F, 23.3 (1.3) y, 74.1 (12.4) kg, leg length 0.936 (0.06) m**; 30 s trials; Bertec 40 × 60 cm² force plate, CoM by Zatsiorsky & King's CoP + shear method; **velocities are the resultant √(mean(x²+y²)), not one axis** | as L1, Table 1 | ⭐ **YES — this is the table Part 24 §7 could not re-extract** |
| L4 | The velocity term's own size in humans | `XcoM − CoM` **≈ 1 mm** quiet two-foot standing; **up to 1 cm** tiptoe; **up to 4 cm** walking, where `b` is **2–3 cm** | as L1, plus one walking subject, **23 y, 85 kg, leg length 1.06 m**, treadmill with built-in transducers, ELITE optokinetic, 15-segment Winter model | as L1, §4 and §5.3 | ⭐ **YES** |
| L5 | A negative margin is normal, not fatal | *"a disbalance with the XcoM outside the BoS, thus with negative `b`, can still be restored"* by hip bending or arm movement, citing Otten 1999; tiptoe standing *"shows on average a negative `b`"* | as L1 | as L1, §5.3 | ⭐ **YES** |
| L6 | ⭐ What counter-rotation is actually worth | **3.50 to 5.50 cm** of additional XcoM excursion over the Hof bound across normalised CoM positions 0–1; **116 % (3.50 cm)** larger upper boundary at position 0.5; experimental quiet-stance margin **21.67 ± 0.55 cm (Hof) vs 25.09 ± 0.600 cm (counterbalance)**, p < 0.001. Boundary extrapolated excursions (Table 6.2, **units m**): **0.043 / 0.144 / 0.256 / 0.382 / 0.498** at normalised CoM 0 / 0.25 / 0.50 / 0.75 / 1.00 | **frontal (lateral) plane**, double support. A multi-segment **model**: direct-collocation trajectory optimisation, height 1.80 m, mass 75.0 kg, **CoM height 1.01 m**, `ω₀ = 2.74 s⁻¹`, single foot width 0.099 m, **total BoS width 0.542 m**. Experimental leg: **10 subjects**, lateral support-surface perturbation, 6 showed the counterbalance strategy and 6 stepped | Inkol, *Modelling Dynamic Postural Stability Margins during Fixed-Support Balance*, MSc thesis, U. Guelph, 2018 (§6.5, Tables 6.1–6.3) | ⭐ **YES — PDF downloaded and extracted** |
| L7 | A narrow base is not what makes a human fall | one foot, a ridge **a few millimetres** wide, **a few minutes**, with the CoM **beyond the surface of support**; the inverted-pendulum model does not explain it; recovery by **stance-leg hip moments varying the horizontal ground reaction force** | human experiments plus inverse-dynamic simulation; **n not stated in the abstract** | Otten 1999, *Phil Trans R Soc Lond B* **354**(1385):869–875 | ⚠️ **ABSTRACT ONLY.** PMC1692595 carries abstract + references only; the body is behind a PDF link I could not retrieve. **Same position as Part 24.** No ridge width in mm and no moment magnitude is published in what I read |
| L8 | Where the fore-aft limit bites, measured on people | CoM only **16.1 ± 8.2 %** (acceleration-based TtC), **30.8 ± 8.6 %** (velocity-based) and **29.3 ± 7.7 %** (XcoM-based) of the way from **ankle to toe** at minimum time-to-contact. The velocity row — **251 ± 45 / 324 ± 68 / 321 ± 75 mm·s⁻¹** — is labelled a **"CoM Velocity Range"**, each subject's max−min **across perturbation levels**, not a boundary velocity | **n = 10, 5 M / 5 F, 27 ± 2.7 y, 71.0 ± 14.3 kg, 1.72 ± 0.10 m**. A **15 kg** pendulum struck a backboard at **78 % of standing height**; shoulder and waist straps confined motion to sagittal rotation about the ankle; release angle from 10°, **+5°** (heavier) or **+2.5°** (lighter) a trial **until the subject stepped** | Hasson, Van Emmerik & Caldwell 2008, *J Biomech* **41**(10):2121–2129 | ⭐ **YES — PMC2562249, methods and table re-read** |
| L9 | A narrow compliant base: the base out-accelerates the weight | stance-foot sideways acceleration **1.70 ± 0.88 / 1.44 ± 0.57 / 1.26 ± 0.42 m·s⁻²** (beginners / sportive / professionals) against CoM **0.34 ± 0.11 / 0.29 ± 0.08 / 0.28 ± 0.08**; foot-to-CoM r = **0.83 → 0.64**. **No CoM velocity of any axis is reported**; the only velocities are walking speeds **0.26 ± 0.08 / 0.16 ± 0.10 / 0.15 ± 0.04 m·s⁻¹**, frame unstated | **n = 20, 18–32 y** (6 professional slackliners, 14 beginners split 8/6 by a static test), 72 ± 11 kg, 1.76 ± 0.10 m; one-leg stance and walking a **3 m × 5 cm** slackline **31 cm** up; Qualisys 8 × Oqus 500 at **150 Hz**, 51 markers | Stein & Mombaur 2022, *Front Sports Act Living* **4**:831362 | ⭐ **YES — full text** |
| L10 | The human answer to a large velocity term | balance held by a **stepping strategy** in which *"mean centre of pressure (foot) position is a constant distance outward of the extrapolated centre of mass"*, plus a lateral ankle strategy | healthy subjects, treadmill walking, **100 ms** lateral pushes/pulls at various intensities and gait phases | Hof, Vermerris & Gjaltema 2010, *J Exp Biol* **213**:2655–2664 | ⚠️ **ABSTRACT ONLY** — the JEB/silverchair full text returned **HTTP 403**. No velocity number is taken from it |
| L11 | Pai & Patton's feasible region | the construction and its agreement with Hof's model; Hof reproduces their Fig. 3 band as his own Fig. 2 | a **model** (inverted pendulum + foot + optimisation), no human sample | Pai & Patton 1997, *J Biomech* **30**(4):347–354 | ⚠️ **NOT OPENED.** Part 24's §1 reads **1.1 → 0.45 → 0 s⁻¹** off their Fig. 3 via an abstract and a delegated read; **I could not open the paper or the figure and I neither confirm nor dispute those three numbers.** Nothing below rests on them |

**And the negative result, which is a result.** ⚠️ **There is no published measurement of a surfer's — or a
skateboarder's, or a snowboarder's — centre-of-mass velocity relative to the board.** I looked. The closest is a 2025
multibody-dynamics surfing model whose own framing is that **no established biomechanical model for surfing exists**
(paywalled at Springer, **not opened**), a 2015 instrumented surfboard that measures **centre of pressure** under the
front foot, and L9's slackline work, which reports accelerations and no CoM velocity. **The athletic upper end of this
quantity is not in the literature**, so §1.5's comparison is against walking, which is the most dynamic whole-body
task anybody has published it for. **That is a real limit on this round and I am not papering over it.**

---

## 3. Hof's Table 1, read from the primary — the table Part 24 could not get

> *"Stability in standing. `b_min`: minimum spatial margin of stability, i.e. minimum distance of XcoM to BoS.
> `t_min`: minimum time-to-boundary of BoS. Diameter BoS has been defined as distance from average position CoM to BoS
> margin. Sway of CoP and XcoM has been given as r.m.s. value = √(mean(x² + y²)). Average values (SD) for 10 healthy
> young subjects."*

| Stance | Condition | Diam BoS (mm) | `b_min` (mm) | `t_min` (s) | CoP sway (mm r.m.s.) | XcoM sway (mm r.m.s.) | CoM sway (mm r.m.s.) | **V CoM (mm·s⁻¹ r.m.s.)** |
|---|---|---|---|---|---|---|---|---|
| Two feet | eyes open | 76 (11) | 64.2 (8) | 14.1 (3) | 5.0 (2) | 5.0 (2) | 4.9 (2) | **2.6 (1)** |
| | eyes closed | | 64.7 (10) | 12.9 (5) | 5.2 (2) | 4.4 (1) | 4.4 (1) | **2.8 (1)** |
| One foot | eyes open | 22 (5) | 15.5 (6) | 2.3 (1) | 8.1 (3) | 5.3 (3) | 5.0 (3) | **5.1 (1)** |
| | eyes closed | | 7.3 (6) | 0.4 (0.5) | 15.9 (2) | 10.2 (2) | 9.0 (2) | **14.3 (4)** |
| 2 ft, toes | eyes open | 16 (4) | 5.6 (12) | 1.3 (6) | 7.7 (2) | 8.6 (4) | 8.5 (5) | **4.4 (1)** |
| | eyes closed | | 12.2 (11) | 0.7 (3) | 16.5 (2) | 11.8 (5) | 11.4 (5) | **10.1 (3)** |
| 1 ft, toes | eyes open | 15 (4) | **−9.3 (14)** | **−1.8 (2)** | 10.6 (3) | 8.3 (3) | 6.1 (2) | **17.7 (7)** |

**Three readings, all of them bearing on this project.**

- ⭐ **The bottom row's `b_min` is negative — mean −9.3 mm — and those subjects stood for 30 s.** That is the whole of
  Part 24 §1.3 and §5's refutation of *"more than one contact across"*, from the primary, **with a number instead of
  Otten's unquantified "a few millimetres"**. Hof names the cause himself in §5.3 [L5] and observes *"major trunk and
  arm movements"* in that posture. **A human's XcoM routinely sits about a centimetre outside the base and the human
  stays up.**
- ⚠️ **The velocity column is a resultant, not an axis**, by the caption's own definition — Part 24 flagged this and
  it is correct. Our `speedAcross` is **one axis**. So a single-axis human figure would be *smaller* than the table's,
  which makes every ratio below a **lower bound**.
- ⚠️ **`Diam BoS` is not a foot length.** It is the distance from the mean CoM to the nearest BoS margin, which for
  two-foot standing is **76 mm** — **smaller than our 0.130 m across half-width.** Our base is not the narrow one.
  Part 24's correction of the brief's *"narrow lateral base"* framing is right and this is the number behind it.

---

## 4. The comparison, on the axis that is frame-safe and unit-safe

**The frame, stated once.** `speedAcross` is the **body's velocity relative to the feet**, resolved on the board's
**+x** (across) axis after the component along the **felt vertical** is removed [R, `humanBalance.ts`; M, Part 24 §0
and §4]. Hof's `v` is the **CoM's velocity relative to a stationary base of support** [S, L1]. ⭐ **Those are the same
frame** — body relative to base — which is why the comparison is legitimate at all, and it is the single thing that
makes it so. Our **across** axis is the rider's **toes-to-heels** direction, which is a human's **anteroposterior**
direction over a half-foot-length base; our *lateral* direction (feet ~0.63 m apart) is the wide one.

**⛔ The frame trap I avoided, because the brief warned about it.** Athletic "lateral CoM velocity" figures — a
slalom skier crossing the fall line, a cutting footballer — are **world-frame** translations of the whole body
*including* its base. They are metres per second, and they are **not this quantity**. L9's slackliners walk at
0.15–0.26 m·s⁻¹ with the frame unstated, and I do not use that number for anything.

### 4.1 The velocity term, in metres, human against model

| | velocity term `v/ω₀` | room available (`Diam BoS` / half-width) | ratio |
|---|---|---|---|
| Hof, quiet standing on two feet [S] | **≈ 1 mm** | 76 mm | **0.013** |
| Hof, one foot on tiptoe, eyes open [S, I] | ≈ 6.3 mm r.m.s. (17.7 mm·s⁻¹ × 0.358 s) | 15 mm | 0.42 |
| Hof, walking [S] | **up to 40 mm** | `b` **20–30 mm** | **1.3–2.0** |
| ⭐ the shipped rider's twelve, median [M, Part 24 §3] | **260 mm** | 130 mm | **2.00** |
| ⭐ PR #445's two arms, peak [M] | **478 and 787 mm** | 130 mm | **3.7 and 6.1** |

- ⭐ **At the median the game's velocity term is 6.5× the largest figure Hof publishes for a human, and 12–20× it at
  PR #445's peaks** [I, the division on L4 and the two [M] rows].
- ⚠️ **I will not make a headline of the 2.00 lining up with walking's 1.3–2.0.** The two "rooms" are different bases
  measured different ways, and a digit that coincides across two definitions is a coincidence, not a finding. **What
  the row establishes is the regime, not the number:** the only human condition in which the velocity term exceeds the
  base's own margin is the one in which the base is **deliberately relocated every step** [S, L4; S*, L10].

### 4.2 How far past the edge, and how fast the body is turning over the feet

- **Past the edge.** The game's capture point overshoots the feet's edge by **0.202 / 0.263 / 0.334 m**
  (min / median / max) on the shipped twelve [I, Part 24 §3's velocity term divided by its own 0.81 / 0.99 / 1.03
  share-of-overshoot column]. Against Hof's least stable measured posture at **−9.3 mm**, that is **28× at the
  median**, and PR #445's peaks are **51× and 85×** [I].
- ⭐ **The lean rate, which is the sanity check nobody here has run.** A CoM moving at `v` relative to the feet with
  the CoM `h` above them is the whole body rotating about the feet at `v/h`. At the measured `h` of **0.711 m** [M]:

  | | across-speed | body rotation about the feet |
  |---|---|---|
  | Hof, quiet standing on two feet [S] | 2.6 mm·s⁻¹ | **0.1 °·s⁻¹** |
  | Hof, walking, at his largest velocity term [S, I] | ≈ 0.110 m·s⁻¹ | **6.2 °·s⁻¹** |
  | the shipped rider's twelve, median [M] | 0.968 m·s⁻¹ | **78 °·s⁻¹** |
  | 3.2x's 636 falls, median [M] | **1.21 m·s⁻¹** | **97 °·s⁻¹** |
  | PR #445's `ships` arm, peak [M] | 2.086 m·s⁻¹ | **168 °·s⁻¹** |

  [I for every rotation figure: `v/h`, with `h` = 1.01 m for Hof's subjects and 0.711 m for the rider.] ⭐ **A body
  crossing its own feet at 1.21 m·s⁻¹ is a body rotating over them at about 97 degrees a second. That is roughly the
  rate of a free topple, not of a sway**, and it is **sixteen times** the fastest whole-body rate Hof publishes.
  **No source is needed to see that this is not a recoverable state; it needs only the model's own two numbers and
  the definition of an angle.**
- **And where the weight is when it happens.** Hasson's subjects, escalated to the level that finally made them step,
  reached minimum time-to-contact with the CoM only **16–31 % of the way from ankle to toe** [S, L8] — **the human's
  weight never approaches the toe.** The game's rider is at **0.121–0.200 m against a 0.130 m half-width** [M,
  Part 24 §3]: **at the edge and past it.** ⚠️ The two percentages are measured from different origins (ankle→toe vs
  feet-centre→edge) and I do **not** divide them; the point is the **side of the base** each population is on.

### 4.3 What a human-like rider could carry on **our** geometry

Hof's condition says the recoverable velocity is `ω₀ ×` (the distance still left to the edge in the direction of
travel), plus whatever counter-rotation buys. With the corrected `1/ω₀` of **0.292 s** (§1.3) and L6's **3.5–5.5 cm**:

| the CoM is… | recoverable across-speed |
|---|---|
| at the middle of the feet (0.130 m of room) | **0.445 m·s⁻¹** [I] |
| at the edge (0 m of room), counter-rotation only | **0.120–0.188 m·s⁻¹** [I] |

**Against a median of 0.968 m·s⁻¹ (shipped) and 1.21 m·s⁻¹ (3.2x's 636), measured with the CoM at or past the edge**
[M]. ⭐ **The model's rider is carrying five to ten times what the literature allows a human in the state the test
fires in, and about twice what it would allow one standing in the middle of the base with all of it still ahead.**

---

## 5. ⭐ THE VERDICT

> ## **THE FALL TEST IS NOT MIS-SCALED. Part 23's conditional — *"if slower, the test is mis-scaled and the plant is survivable"* — does not fire. 1.21 m·s⁻¹ is FASTER than a human's, by every route I could source, and the test's own allowance is already MORE generous than the literature's, not less.**

**This is Part 24's verdict, reached independently from the primaries, and sharpened in three places:**

1. **Part 24 said the game's allowance is larger than a human's "zero". It is larger than the human's *non*-zero
   too:** `reachAcross` 0.175–0.396 m against L6's measured **3.5–5.5 cm** for the same mechanism — **3.2 to 11.3×**.
2. **The pendulum length is wrong in the lenient direction**: `1/ω₀` is **7.6–9.4 % short** of the rule in the paper
   the code cites, so the velocity term is **under**-counted. **Correcting it would make the test stricter.**
3. **The coefficient and the pendulum length were one question, not two**, and the answer is **right order, 10–30 %
   low**: 0.22–0.32 s against a human's 0.338–0.365 s.

⛔ **And therefore: I propose no change to any constant.** Three defensible corrections exist — the pendulum length,
the counter-rotation credit, and the across/along reach's provenance — and **every one of them makes the rider fall
sooner.** Fixing them would tighten a gate that is already shut on 12 of 12, buy nothing for the ride, and spend the
owner's attention on a direction that four rounds have already closed. **They are recorded here for the owner's
ruling and for nobody else's.**

**The owner's standing rules are what make this the right call.** `reachAcross` is credited on the hip's *remaining*
range, which is a real impulse from a visible limb, so the structure is honest even where the magnitude is generous —
and the honest fix for a too-large reach is to measure the rotor, not to clip the number. Shrinking `reachAcross` to
0.05 m by decree would be a kinematic prescription of exactly the kind 3.2y's refutation of the old rider's
counter-roll — and Part 24 §5's refutation of the wider base — already rule out.

---

## 6. What follows — and it is the same thing Part 24 said, now with a source under it

**The literature's answer to a velocity term larger than the base is to put the base where the weight is going.**
That is Hof's walking data [S, L4] and it is Hof 2010's whole result [S*, L10]. **Our rider cannot step** — and the
board it stands on **can** move but is never aimed [R; M, Part 24 §6: the base carries a median absolute
across-acceleration of 1.42 m·s⁻² with peaks to 12.54, and a **net** of 0.15 against the body's 1.04].

⭐ **So the next measurement is still the board's own across authority — what lateral acceleration a steer produces on
this hull at 5–9 m·s⁻¹, against the 0.42–1.41 m·s⁻² the body's drift asks for** [M, Part 24 §6]. **I did not measure
it, and this round adds no evidence that the board can deliver it.** What it adds is that the literature names the
base, not the limb, as the thing that carries this case — which is independent support for a direction that was
reached from the game's own columns.

⚠️ **And Part 24's unresolved discrepancy is untouched and still first in line**: 3.2y's **−384 N/rad** of hull side
force at 7.5 m·s⁻¹ implies 1.8–5.6 m·s⁻² at the rolls these runs reach, against a measured net base drift of
0.00–0.38 m·s⁻². Two of the project's own measurements disagree. **Nothing in the literature resolves that; it is a
probe's job.**

---

## 7. What I will not claim

- ⛔ **I will not claim this round discovered the answer.** **Part 24 did, on 2026-11-15.** This is a verification and
  an extension, and §0 says so first because a reader who takes this file for the original will mis-count the
  evidence.
- ⛔ **I will not claim Pai & Patton 1997's numbers.** I could not open the paper or its Fig. 3. Part 24's
  **1.1 → 0.45 → 0 s⁻¹** boundary and its derived **0.79 m·s⁻¹** are **unverified by me**, and nothing above uses
  them. Strike them and §5 stands, because §5 rests on L1–L6, L8 and L9, all of which I opened.
- ⛔ **I will not claim Otten's ridge width or hip moments from the body of the paper.** Abstract only, as in
  Part 24 — *"a ridge of only a few millimetres wide on one foot for a few minutes"* and *"the centre of mass of the
  subjects sways beyond the surface of support"* is the whole of what I read. **Hof's Table 1 is the quantified
  version of the same claim and that one I did open**, so the refutation of *"more than one contact across"* no longer
  depends on an abstract.
- ⛔ **I will not claim a measured human figure in an athletic, loaded task, because there is not one.** §2's negative
  result is the finding. Walking is the most dynamic published case of this quantity and **surfing is not in the
  literature at all**. If the owner wants the athletic upper end, it needs footage or a lab, not a search.
- ⛔ **I will not claim the 1.159–1.197 ratio applies to a crouch.** `ℓ` is `I_feet / (m · h_CoM)`, so it depends on
  how the mass is distributed, and L2's multipliers are derived for an **upright** adult. A deep, folded surfing
  stance puts segments further from the CoM line, which if anything makes `ℓ/h_CoM` **larger** and the correction
  **bigger** — so **the direction of §1.3 is robust and its 7.6–9.4 % is not.** No source gives this ratio for a
  crouch.
- ⛔ **I will not claim the test's structure is wrong anywhere.** `beyond && weightPast`, the felt-vertical frame, the
  rotor-impulse reach and the load gate are all the constructions the literature uses, and two of them (the
  counter-rotation credit, the negative-margin tolerance) are things the literature says a bare inverted pendulum
  **needs** and most implementations omit. **The game is ahead of the field on structure and generous on magnitude.**
- ⛔ **I will not claim 1.21 m·s⁻¹ is the shipped figure.** It is the median of 3.2x's **636 falls over 53 cells**,
  which include hip gains that do not ship. The shipped twelve's median is **0.968 m·s⁻¹** and PR #445's `ships` arm
  peaks at **2.086**. **Three populations, one quantity**, and the verdict is the same on all three — which is the
  only reason the spread does not matter here.
- ⛔ **I will not claim a resolution of the ratio coincidence in §4.1**, and I say so there.
- ⛔ **Inkol 2018 is an MSc thesis, and L6's 3.5–5.5 cm is a MODEL's output**, not a measurement — a
  direct-collocation optimisation over a multi-segment body, with a 10-subject experimental leg used to evaluate the
  resulting margins. It is **frontal-plane and double-support** where our axis is fore-aft on one foot length. **It is
  the best-quantified estimate of the counter-rotation credit I could open, and it is not a measurement of a human's
  across-speed.** I did not establish whether it was published in a journal.
- ⛔ **No probe was run and no number above the [M] tag is mine.** Every [M] is lifted from Part 24 §3/§3a or PR
  #445's `swing-demand.md` §4.2, with the file and section named at the point of use.

---

## 8. Seatbelts

- ⛔ **No source file changed.** `git diff --stat -- src/` is **empty**, by construction: this round adds one file
  under `docs/research/new-rider/3.5/` and appends one block to the handoff. **No `src/`, not even a getter.**
- ⛔ **No bench was run, no solver was spun up, no gain, clip or threshold was changed, and no tuning is proposed.**
  The Canyon hash guard is not needed and is not claimed: with no source file touched there is nothing for it to
  catch, and running it would be a false reassurance about a docs-only branch. **This bullet is the honest version of
  that seatbelt, not a skipped one.**
- **The deletions column, before the push**: `git diff --stat claude/the-record HEAD` — **0 deletions**. Both files
  are new or appended to. (Part 24 §5 records a heading renamed four hundred lines up by a careless
  first-occurrence replace, caught only because that round had 0 deletions too; **this round does not edit
  `3.2/README.md` at all**, which is the cheapest way to not repeat it.)
- **Every figure above carries its unit, its frame and its axis**, as the brief required, and §4's opening paragraph
  states the frame once for the whole comparison. The two places where a comparison would have been frame-unsafe —
  world-frame athletic velocities, and Hof's resultant-vs-single-axis velocity column — are **named and declined**
  rather than used (§4's trap note, §3's second reading).
- **Provenance**: every row in §2 says whether I opened the primary. **Three are marked unopened (L7 body, L10, L11)
  and nothing in §5 rests on any of them.** The extraction route for the two PDFs is recorded in §9 so the next agent
  does not repeat Part 24's `pdftoppm` dead end.
- **Nothing in this file was taken from another agent's summary.** Part 24's rows were **re-opened**, not inherited;
  where I agree with it I say which primary I read to agree.

---

## 9. ⭐ For the next agent: how to read a paywalled-looking PDF on this machine

**Part 24 §7 recorded a dead end** — *"this machine has no `pdftoppm` and the hosted PDF uses subset fonts that
defeat a raw stream extraction"* — and delegated Hof's Table 1 to another agent as a result. **That dead end is not
real, and the fix is two commands.** `pdftotext`, `mutool`, `gs` and `qpdf` are all absent and the `Read` tool's PDF
path needs `pdftoppm`, but a throwaway venv does the job:

```sh
python3 -m venv /tmp/pdfvenv && /tmp/pdfvenv/bin/pip install pypdf fonttools
/tmp/pdfvenv/bin/python -c "
from pypdf import PdfReader; import sys
for i,p in enumerate(PdfReader(sys.argv[1]).pages,1): print(f'== p{i}'); print(p.extract_text())
" paper.pdf
```

⭐ **`fonttools` is the whole trick: without it `pypdf` cannot decode the CFF Type-1 subset fonts Elsevier embeds and
returns warnings instead of text — which is exactly the symptom Part 24 described.** With it, Hof 2005 extracts
cleanly, Table 1 included. Download with `curl -L` and a browser user-agent; `lirias.kuleuven.be` (504),
`cris.maastrichtuniversity.nl` (403) and JEB/silverchair (403) all refused, so **not every wall comes down** — but
`braceworks.ca`, `atrium.lib.uoguelph.ca` and PMC all served full text.

---

## 10. Files

- `docs/research/new-rider/3.5/across-speed-literature.md` (this file).
- `docs/superpowers/handoffs/2026-11-16-surfer-and-wave-handoff.md` (appended): one block recording that the
  `[S needed]` is closed, so a fourth round does not ask for it.
- **No source file. No results directory** — this round measured nothing and has nothing to deposit.

---

## 11. For the owner, in plain words

**Four days ago one of my predecessors looked up what a real person's balance can do and reported back that your
surfer's fall test is not too strict. I was sent to do the same job again, because the note asking for it was never
crossed off. So I spent the round checking its homework instead, from the original papers.**

**Its homework is good. And the answer is firmer than it was.**

**The question.** The game decides your surfer has fallen partly on **how fast** his weight is sliding across his
feet. It measures about **one metre a second**. Is that something a person catches?

**No — and here is the cleanest way to see it, which needed no papers at all.** His weight is about 71 cm above his
feet. Weight sliding sideways at one metre a second, 71 cm up, means **his whole body is tipping over his feet at
about ninety-seven degrees a second.** That is the speed of a topple. For comparison, a person standing still sways
at a tenth of a degree a second, and a person **walking** — the most violent everyday thing anyone has measured this
way — manages about six. **Your surfer is going sixteen times faster than that, and he is already at the edge of his
feet when it happens.** There is no reading of the literature in which that is a save.

**And the test is not just fair — it is already generous, and I can now say by how much.** The game gives him credit
for throwing his hips and arms to catch himself, which is the right trick and a real one. But I found a study that
modelled exactly that trick and checked it against ten people, and it buys a human about **three and a half to five
and a half centimetres** of extra room. **The game credits him with seventeen to forty.** So the allowance is three
to eleven times what a person gets.

**There is also a small genuine error in the game's maths, and it runs the kind way.** The formula needs a "pendulum
length". The game uses the height of his weight above his feet. The paper the code itself cites says that is not the
right length — it should be about 1.16 to 1.2 times that, because a body is not a point on a stick. Fixing it would
make his weight count about **eight per cent faster**, which would make him fall **sooner**.

⛔ **So I am not asking you to change a single number, and I want to be clear why.** I found three things that could
honestly be corrected — the pendulum length, the hip credit, and one more — and **all three make him fall earlier**.
The gate is already shut on twelve rides out of twelve. Tightening it buys nothing you can ride and costs you a
decision. **They are written down for you, and they stay yours.**

**What is actually missing is the same thing my predecessor said, and now the research agrees with him.** When a
person's weight is moving too fast for their feet, they do not tense a muscle — **they move their feet.** That is
what a step is, and it is the one thing in the whole balance literature that handles a weight moving this fast. Your
surfer cannot step. His feet are on a board. **But the board can move — and nothing in his balance is allowed to
point it.** His balance can tense an ankle, swing a hip, bend a knee. It cannot steer. So the deck stays tilted under
him and he slides down the tilt, and a surfer's answer to sliding down a tilt is to bank into the turn, which he never
does.

**So the next thing to find out is whether this board can actually be aimed hard enough to put his feet back under
him.** That was already the recommendation. It is now also what the research says to look at. **I did not test it and
I am not promising the board can do it.**

**Nothing in this round changes the game.** No file the game runs was touched, nothing was tuned, and there is nothing
new to ride.
