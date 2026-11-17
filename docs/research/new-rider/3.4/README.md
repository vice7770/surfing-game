# Step 3.4 — the two-body rider

The owner, asked directly with the alternatives and their costs, chose to build the two-body rider over patching the
balance's numbers. Their bar is unchanged and is the acceptance test: **in Compress the surfer must never fall at the
low speeds of getting into position — 100 %, not "fewer".** Tall may legitimately fall on a sharp turn.

Step 3.3's Parts 35–39 are this folder's base (`docs/research/new-rider/3.3/README.md`). Tags as in 3.2 and 3.3:
**[M]** measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my inference from a stated
model; **[A]** arithmetic on measured numbers, labelled as such.

# Part 1 — the shipped plant is a body with no inertia of its own, the invented foot force is the residue of that, and
putting the inertia back triples the accuracy of the row the fall is in

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-a`, cut from `main` at
**c8461904** (step 3.3p's merge), so Part 39 is its base. It ships **the lateral block of the balance's internal plant
re-assembled as two bodies with one real joint** (`YawPlant.body`, `RiderBody`, `lateralMass`, `lateralCompliance`),
**one new opt-in switch with three values** (`?riderBody=two|control|symmetric`, off by default and pinned off for
online rooms), **six new tests**, and **504 rides over twenty-four arms**: step 3.3p's own five, the same five with the
switch on, the same five with the switch on its control value, the same five with its third value, and four more arms
sweeping the body's own inertia over a sixteen-fold range. **43 373 control ticks read, 36 078 of them live.**

**The controller is untouched.** The cost function, the senses, the delay, the filter's noises, `captureRow`'s own
point-mass ω₀ and `feetReach`'s own `feetReach / L` are all exactly what shipped. Only the plant changed.

**And the brief's own scope question, answered straight: the body's shape CAN be fixed without the controller, and it
was — but fixing it does not reach the bar with the shipped controller, and the cost function is now inconsistent
with the plant in two named places.** `captureRow`'s ω₀ = √(g/L) and `feetReach`'s bank limit `feetReach / L` are both
the point-mass body's, on a plant whose bank coordinate now meets **seven times** the inertia (§6 reading 3). That is
step two, it is named in §15, and it is not something this round is entitled to infer the size of.

## 0. The nine sentences the round is for

1. **The owner's bar is NOT met and this step does not come close to meeting it.** On the owner's own low-speed cell —
   entries set **absolutely** at 1–6 m/s through the water × three stances, the stick never touched — the two-body
   plant ridden ends **18 of 18 at 0.500–6.233 s** on the deck filter (median 1.033, against the shipped 1.033) and
   **18 of 18 at 0.117–6.250 s** on the world one (0.733 against 0.767), with **Compress 6 of 6 on each** [M].
   **Across the twenty-four arms, 504 of 504 rides ended before nine seconds and Compress fell in every one.**
2. **The plant came right on the row the fall is in, and that is this step's result.** Scored on 3.3p's own rows — the
   same recorded states, the same commands, the plant swapped — the **lean row's** relative error against the bank
   ledger falls from **3.515 → 1.039** on the unsteered deck arm, **3.269 → 1.109** world, **3.713 → 1.413** on the
   owner's cell, **3.901 → 1.284** world, **7.475 → 1.967** steered [M]. **Better in 96 of 96 live runs, on all five
   arms, with no exception.** The one-step residual on the body's bank rate — 3.3o's own headline instrument — falls
   from **2.552 → 0.884**, **3.097 → 0.993**, **4.620 → 1.395**, **3.634 → 1.318**, **5.131 → 1.342**, and goes
   **under one at the median in 44 of 96 runs** where 3.3o's four plants and 3.3p's two took **neither row under one
   in a single run of 96**.
3. **The roll row is unchanged at the median and worse where the bar is.** **10.300 → 10.066**, **9.385 → 9.922**,
   **2.797 → 3.982**, **7.423 → 9.065**, **3.851 → 3.267** [M] — better in **39 of 96** runs, and worst on the owner's
   own low-speed cell. **This step buys one row and not the other**, which is the shape every repair this folder has
   measured has had, and §4 reading 3 measures what is left of 3.3p's cancellation argument on the new plant: about
   half of the unsteered arms' error and all of the owner's cell's, the same as before.
4. **The invented foot force is gone, and it was never invented: it is the residue of a body with no inertia.** The
   shipped plant's `push = τ / h − m g θ` is **exactly** the constraint force of a point mass on a massless leg — from
   its own two lines, `m h² θ̈ = m g h θ − τ − m h a_f` and `H = m (a_f + h θ̈)`, the feet's own acceleration cancels
   identically [R + A]. In the assembly the ankle's generalised force is `(+1, −1, 0, 0) τ` — a torque on the board,
   its reaction on the body, **zero on the sway row and zero on the yaw row** — and the force at the feet is an
   **outcome of the solve**. Measured on the same rides, that outcome is **0.584–0.883 (0.749)** of the shipped closed
   form on the unsteered deck arm and **0.089–0.816 (0.629)** on the owner's cell [M]. **P2 holds, by a test, at
   nine decimals.**
5. **The control is exact, and it is the step's strongest single number.** The same assembly with the body's inertia at
   **zero** and the shipped coupling reproduces the shipped plant's own `A` to **1.2 × 10⁻¹⁴ of each row's largest
   entry over all 306 points of the schedule the game reads** [M, tested], its roll row's relative error to
   **5.2 × 10⁻¹⁰**, its force at the feet to **4.8 × 10⁻¹¹**, and its side→roll cross term to within **1 × 10⁻¹⁵** of the exact zero it must be; and
   **ridden** it matched the shipped rider on `fell`, `fellAt`, `rollFall`, `bankFall`, `railFall`, `frames`, `stance`
   and `steer` over **102 runs and 816 column reads with 0 mismatches** [M]. **The shipped plant is the zero-inertia
   limit of a two-body system, measured, not argued.**
6. **And my own control refuted my own prediction, which is the second finding.** I predicted the limit would hold at
   `inertia = 0` outright. It does not: the shipped coupling is **asymmetric**. The feet sit `z_d` = 0.031 m over the
   board's centre of mass, so the board's roll moves them across at `z_d φ̈` — which the shipped `feet` row omits
   **while its roll row still carries `z_d F`** [R]. One lever on the force path and none on the kinematic path is
   half of a pair, and `lateralMass` is asymmetric by exactly `m z_d` = **2.263 kg·m** [M, tested]. Correcting it
   alone is a per-cent effect: the roll row **10.300 → 10.142**, the lean row **3.515 → 3.082**, the ride ×1.03 [M].
7. **The brief's second "independent measurement" is refuted, and replaced by a bigger one in the same direction.**
   3.3o §2.3 reading 3 compared the model's **line** `g/h · θ` (121–453 °/s²) with the game's **whole** lean
   acceleration (20–206). Against the game's own matching source — the bank ledger's `gravity` column on the body's
   own lean row — **the line is right to 0.924–1.103, median 0.982** [M]. What is wrong is what the lateral solve does
   with it: the shipped plant's **solved** answer to the body's own weight is **29.6–35.4× the game's own
   (median 31.5)**, and the two-body plant's is **4.0–5.3× (4.401)** [M]. **A line read and a solved row are two
   quantities, and this folder has now made that mistake in both directions.**
8. **Two new disagreements the step creates, both measured and both reported with the win.** The effective mass a side
   force meets goes from **2.54 kg** (the game's own: 2.796–3.787, so 1.10–1.49× under) to **10.407–11.377 kg** (3.4×
   over); and the ankle's own authority over the body's absolute lean goes from **1.21–1.95× the game's** to
   **0.185–0.312×** — the new plant **understates the ankle by three to five times** [M]. The step trades two reads it
   had right for one row it had wrong.
9. **The lean row's gain is not an artefact of one value: it is monotone in the body's inertia over a sixteen-fold
   sweep.** At ×0.25, ×0.5, ×1 (the sourced value), ×2 and ×4 of it the lean row reads **2.022 / 1.584 / 1.039 /
   0.836 / 0.800** and the bank-rate residual **1.669 / 1.229 / 0.884 / 0.749 / 0.823**, while the roll row stays
   **9.680 / 9.649 / 10.066 / 10.238 / 10.402** [M]. The sourced value sits just inside the knee; at ×4 the lean row
   is **under 1 in 24 of 24 runs** and **×4 the sourced inertia is not a body**, so that is reported and not offered.

## 1. (A) The four reads that had to come first

**R1 [R]. The game's rider is a point mass too, so "the model's body is a point mass" is not by itself the mismatch.**
`AttachedRider.coupleStanding` carries the rider as a point mass `m` at `carried` with three **scalar** freedoms — the
leg along `up`, the bank across `across`, the body's own forward — and **no rotational inertia of the rider's own
appears anywhere in the 9×9** [R, `:4365–4440`]. The rider's `yawInertia` is `coupleYaw`'s, about the leg line, and is
a different coupling. So this step makes the plant's body **less** like the game's rider in one respect while making it
more like a body; §6 is where that bites and §11 is what it means for the game's own rider.

**R2 [R]. For a standing free rider `carried` equals `arm`**, because `off = position − target` is resolved on the
orthonormal `up`/`across`/`forward` basis and added back [R, `:3179–3186`], so the game's own coupling is symmetric and
the ankle's internal force (`rhs[7] += −h τ / L`) acts between the board and the rider **at the rider's own centre of
mass**, 0.55–0.85 m up — not at the feet.

**R3 [R + A]. The shipped `push` is the exact constraint force of a zero-inertia body.** `yawRows` writes
`push = torque / h` with `push[2] −= m g` [R, `rollModel.ts:510–511`]. Take the model's own bank row,
`m h² θ̈ = m g h θ − τ − m h a_f`, and the body's own lateral equation, `H = m (a_f + h θ̈)`: substituting the first
into the second cancels `a_f` **identically** and leaves `H = m g θ − τ / h`. So the famous horizontal force at the
feet is not a force someone bolted on; it is what is left when a body that **cannot resist being accelerated
sideways** is eliminated in closed form. *The brief asked whether the new body produces a force with no counterpart in
the game. The answer turned out to be about the old body: it produces one, and the reason is the missing inertia.*

**R4 [A on R3]. So the shipped lateral block is the `J → 0` limit of**

> `M q̈ = f`, `M = diag(I_x, J, I_z, m_b) + m v_f v_kᵀ`, `v_k = v_f = [z_d, h, x_f, 1]`,
> `f = [K + τ, −τ + m g h θ, N − F_x y_c, Y]`, `q = [φ̈, θ̈, ṙ, a_y]`, `a_y = V (β̇ + r)`

— the kinetic energy's own Hessian for one mass rigidly jointed through one point, a **rank-one** coupling through one
lever, with the ankle as a torque and its reaction and **no constraint force written down anywhere**. `lateralMass`
and `twoBody` are that, and §2 is the control that says the limit is exact.

**R5 [S + A]. The body's own frontal-plane inertia, sourced, posed in the game's own stances.** de Leva 1996's segment
table, in the same `posture` and the same three stances the rider's **yaw** inertia already shipped from
(`3.2/inertia.probe.ts`, extended here with one new block and nothing removed): about the board's long axis through
the body's own centre of mass, **9.686 / 7.010 / 5.620 kg·m²** tall / crouch / Compress at the game's own arm pose,
against `m h²` of 47.79 / 29.56 / 21.16 — a share of **0.1685 / 0.1917 / 0.2099** [S + A]. The **share** is what the
plant carries (`BODY_FRONTAL_SHARE`, `bodyInertiaAt`), so the plant's own `height` sets the scale; the arms in or out
move the share by less than 0.01. The raw read is `results/34a/34a-body-inertia.txt`.

## 2. (B) The control, and the asymmetry it refuted

The cells are step 3.3k's, 3.3l's, 3.3m's, 3.3n's, 3.3o's and 3.3p's own, unchanged: the Canyon-matched `FaceWater`
(1.4 m / 16° / 5.7 m/s, 2.6 m deep, the board 0.75 fronts ahead of the crest, 45° off the fall line), the stance held,
9 s a run. Every window starts after 0.2 s and excludes the `MAX_BANK` clamp's frames, which are counted and
published. The datum for every acceleration is **°/s² about `AttachedRider.rollAxis`**, as every `deck` reading on this
ledger is, and every state is the model's own (`φ = −roll`, `θ = −bank`).

| **[M]** the assembly at `inertia: 0` against the shipped plant | over 306 schedule points, tested | over 36 078 live ticks of 24 arms |
|---|---|---|
| `A`, entry by entry, over its own row's largest entry | **< 1 × 10⁻¹²** | **≤ 1.2 × 10⁻¹⁴** |
| its roll row's relative error against the shipped one | — | **≤ 5.2 × 10⁻¹⁰** |
| the force at the feet | — | **≤ 4.8 × 10⁻¹¹** |
| its side→roll cross term, which must be exactly nothing | — | **≤ 1 × 10⁻¹⁵** |
| **ridden**: `fell`, `fellAt`, `rollFall`, `bankFall`, `railFall`, `frames`, `stance`, `steer` | — | **102 runs, 816 column reads, 0 mismatches** |
| the same, at `inertia: 0` with the coupling made **consistent** | — | **differs in 98 of 102 runs** |

**Four readings.**

1. **The control holds, and it is what makes everything else in this document a comparison.** The shipped plant is the
   zero-inertia limit of R4's system to fourteen decimals in the matrix and **to the bit in the ride**. Nothing below
   can be the assembly reaching a different plant by accident.
2. **My own P1 is refuted as written, and the refutation is the second finding.** I predicted the limit at
   `inertia = 0` alone. It needs `feetRoll: false` as well, because the shipped coupling is **not symmetric**: the
   feet's own lateral acceleration omits `z_d φ̈` while the roll row carries `z_d F`. `lateralMass` without a body is
   asymmetric by exactly **m z_d = 2.263 kg·m** [M, tested]. At `J = 0` the omission is invisible in the **force**
   (`H` has no `a_f` in it at all) and visible in `θ̈`, which keeps `− z_d φ̈ / h` — 3.7 % of the roll row, on a bank
   row whose own `β` entry is **−2.61 against the −41.2 the term supplies** at 8 m/s crouched at 20° of rail [M]. *A
   term sixteen times the entry it corrects is the shape Part 35 first described, one level further in.*
3. **The symmetry on its own is a per-cent effect, measured rather than assumed.** Roll **10.300 → 10.142**, lean
   **3.515 → 3.082** on the unsteered deck arm; ridden, the median **1.183 → 1.217** (×1.03), **0.950 → 0.967**,
   **1.033 → 1.050**, **0.767 → 0.767**, **3.067 → 3.000** [M]. It ships as `?riderBody=symmetric` because it is a
   defect I can show by pointing at two lines, not because it does anything.
4. **And `symmetric` is the control on the control.** It differs from the shipped ride in **98 of 102** runs, so
   `control`'s byte-identical ride is a property of that plant and not of the switch failing to arrive. *The first
   draft of this round did fail to arrive — `?riderBody=symmetric` fell through a type guard and rode the shipped
   plant, and this column is what caught it, not the eye.*

## 3. (B) The force at the feet: an input in the shipped plant, an outcome in this one

| **[M]** per-run medians | unsteered deck 24 | unsteered world 24 | the owner's low deck 18 | the same world 18 | steered 18 |
|---|---|---|---|---|---|
| the shipped plant's own closed form `τ / h − m g θ`, N | 122.4–263.2 (**214.7**) | 122.3–240.4 (172.7) | 63.5–613.1 (308.9) | 8.0–235.0 (135.3) | 37.3–406.7 (214.5) |
| the two-body plant's **outcome** `m a_m`, N | 91.5–218.8 (**157.7**) | 89.5–193.4 (126.3) | 49.5–208.4 (126.4) | 47.2–158.9 (112.8) | 60.9–289.6 (173.6) |
| the ratio | 0.584–0.883 (**0.749**) | 0.593–0.948 (0.804) | 0.089–0.816 (0.629) | **−16.934**–16.043 (0.790) | 0.680–1.393 (0.847) |
| the water's **side force** group on the roll row, °/s², shipped | 1356.5–5058.1 (**3950.4**) | 1334.6–5016.8 (3047.5) | 829.2–3160.5 (2048.8) | 783.5–2767.5 (1865.6) | 498.4–3801.2 (1952.7) |
| … on the two-body plant | 237.6–866.0 (**596.8**) | 235.0–789.0 (496.5) | 120.4–505.6 (215.7) | 119.5–494.9 (329.8) | 118.2–797.8 (389.1) |

**Three readings.**

1. **The ankle is a torque with a reaction and nothing else, and that is a test and not a claim.** The assembly's
   ankle column on the four coordinates is `(+1, −1, 0, 0) τ`, asserted to **nine decimals** against the plant's own
   `δ` column put through `lateralCompliance`; the shipped plant's slip row reads **exactly** `−k / (h m_b V)`, the
   horizontal force `τ / h` divided by the dry board's mass, and the assembly's reads
   `(c[3][0] − c[3][1]) (−k) / V`, which is **under half** of it [M, tested]. **The number `1 / h` appears nowhere in
   the new lateral block.**
2. **The closed form overstates the honest force by a quarter to a third at the median**, and on the owner's own cell
   by up to eleven times (0.089) — the arm where the body is lowest, the ankle's lever shortest and `τ / h` largest.
   The **−16.934** is one low-world run where the shipped closed form passes through zero while the outcome does not;
   it is the whole population's edge and it is printed rather than trimmed.
3. **And the biggest single group 3.3o found in the roll row drops by five to ten times.** 3.3o's headline per-part
   number was *"the model's largest single roll-row group is the water's SIDE force at 3 950 °/s²"* — larger than its
   own roll moments. With the body's inertia resisting the slip, that group is **596.8** [M]. **The group is fixed and
   the row is not** (§4), which is the honest shape of this result.

## 4. (B) The two rows, on 3.3p's own rows, with the blend separated out

The counterfactual is 3.3p's: the same recorded states, the same commands, the plant swapped, scored against the bank
ledger's own `deckTotal` and `ownTotal`. **The shipped column here is the plant rebuilt at the controller's own exact
point**, which is what the three body plants are built at too; the controller's own eight-point **blend** differs from
it by 0.001–0.056 [M, 3.3p P0h] and is printed separately so the comparison is like for like. The blended column
reproduces 3.3p's published figures to the digit (§9).

| **[M]** per-run medians, **the ROLL row's relative error** | shipped (exact point) | the coupling consistent | **the two-body rider** | two better in |
|---|---|---|---|---|
| unsteered, deck, 24 | 4.323–16.203 (**10.300**) | 4.248–15.931 (10.142) | 5.654–18.730 (**10.066**) | **10 of 24** |
| unsteered, world, 24 | 4.046–22.981 (9.385) | 3.960–22.678 (9.217) | 4.339–26.943 (9.922) | 10 of 24 |
| **the owner's low speed, deck, 18** | 0.902–16.618 (**2.797**) | 0.903–16.362 (2.746) | 0.847–19.283 (**3.982**) | **6 of 18** |
| the same, world, 12 | 0.891–18.459 (7.423) | 0.893–18.190 (7.326) | 0.870–20.104 (9.065) | 2 of 12 |
| steered, deck, 18 | 2.336–8.773 (3.851) | 2.297–8.596 (3.771) | 1.773–11.330 (**3.267**) | 11 of 18 |

| **[M]** per-run medians, **the LEAN row's relative error** | shipped (exact point) | the coupling consistent | **the two-body rider** | two better in | under 1 at the median |
|---|---|---|---|---|---|
| unsteered, deck, 24 | 1.863–9.601 (**3.515**) | 1.470–10.817 (3.082) | 0.487–2.738 (**1.039**) | **24 of 24** | **10 of 24** (shipped 0) |
| unsteered, world, 24 | 2.307–9.723 (3.269) | 1.569–10.976 (3.290) | 0.561–2.827 (**1.109**) | **24 of 24** | 10 of 24 (0) |
| **the owner's low speed, deck, 18** | 2.295–9.126 (3.713) | 1.997–9.200 (4.007) | 0.622–3.970 (**1.413**) | **18 of 18** | 3 of 18 (0) |
| the same, world, 12 | 2.414–14.023 (3.901) | 2.032–14.490 (3.990) | 0.622–3.194 (**1.284**) | **12 of 12** | 1 of 12 (0) |
| steered, deck, 18 | 3.654–18.941 (**7.475**) | 3.588–18.807 (8.077) | 0.849–6.645 (**1.967**) | **18 of 18** | 3 of 18 (0) |

| **[M]** the share of ticks whose **sign** the plant gets right | shipped | two-body |
|---|---|---|
| the board's roll acceleration, unsteered deck | 0.190–0.462 (0.338) | 0.190–0.448 (**0.338**) |
| … unsteered world / low deck / low world / steered | 0.333 / 0.579 / 0.378 / 0.609 | 0.339 / 0.549 / 0.378 / 0.624 |
| the body's lean acceleration, unsteered deck | 0.474–0.845 (0.696) | 0.627–0.852 (**0.785**) |
| … unsteered world / low deck / low world / steered | 0.738 / 0.625 / 0.686 / 0.650 | **0.758** / 0.625 / **0.759** / 0.650 |

**Four readings.**

1. **The lean row is better in 96 of 96 live runs and there is no arm, and no run, where it is not.** A factor of
   **2.6 to 3.8** at the median on the five arms. Against 3.3o §6's own table — *"no variant takes the lean row under
   1 in a single run of 96"* — this one takes it under 1 at the median in **10 of 24, 10 of 24, 3 of 18, 1 of 12 and
   3 of 18**. **That is the first time either row has gone under one anywhere in this folder outside the low-speed
   roll column that was already there before any change.**
2. **The roll row does not move at the median and gets worse where the bar is.** 10.300 → 10.066 is nothing; the
   owner's own cell goes **2.797 → 3.982** and its world twin 7.423 → 9.065. The arm it helps is the steered one
   (3.851 → 3.267, 11 of 18), which is the arm the owner is not asking about. **The arm where the correction is
   biggest is the arm where it does least, for the fifth time in this folder.**
3. **And the roll row's conditioning barely moved either, so 3.3p's own bound explains exactly as much as it did
   before and no more.** The row's largest single term over the net it produces goes **2.37 → 2.08** on the unsteered
   deck arm and **2.12 → 1.38** on the owner's cell, against the game's own **3.64** and **2.78** [M] — so the model's
   roll row is now **better conditioned than the game's own** and still wrong by ten times. 3.3p's arithmetic — a term
   wrong by a factor `f` makes a net error of about `(f − 1) ×` the conditioning — with 3.3p's own measured
   roll-moment ratios (medians 3.302 / 2.638 / 4.166 / 3.479 on the four unsteered and low arms) accounts for
   **4.8 of the measured 10.07**, 3.9 of 9.92, **4.4 of 3.98** and 4.0 of 9.07 [A]: all of the owner's cell and
   **about half** of the unsteered arms', which is what it accounted for on the shipped plant too (5.5 of 10.30).
   **So the body's shape is not what was left over, and what is left over is unchanged.** This round narrows the roll
   row's residue to something that is not the inertias (3.3p), not the side force (3.3p), not the body's shape (here)
   and not newly explained by the conditioning (here).
4. **The sign agreement moves on the lean row and not on the roll row**, which is the same split: 0.696 → 0.785 and
   0.338 → 0.338 on the unsteered deck arm.

## 5. (B) The one-step residual, 3.3o's own headline instrument

`resid = Φ x_k + Γ u_k − x_{k+1}` over the component's own one-step change, with the plant swapped and the previous
tick's own Φ, Γ and command — the same shape 3.3p used for its tilt plant and nothing of this tick in it.

| **[M]** per-run medians | the board's **roll rate**, shipped → two | the body's **bank rate**, shipped → two | bank rate under 1 at the median |
|---|---|---|---|
| unsteered, deck, 24 | 4.155–15.915 (10.641) → 5.454–18.440 (**10.332**) | 1.415–9.497 (2.552) → 0.535–3.321 (**0.884**) | **19 of 24** (shipped 0) |
| unsteered, world, 24 | 3.796–19.418 (9.092) → 4.319–21.420 (9.964) | 2.022–10.029 (3.097) → 0.619–3.452 (**0.993**) | **13 of 24** (0) |
| the owner's low speed, deck, 18 | 1.441–18.771 (3.980) → 2.028–20.387 (5.369) | 1.970–22.273 (4.620) → 0.602–5.122 (**1.395**) | 4 of 18 (0) |
| the same, world, 12 | 2.999–19.753 (7.857) → 4.567–23.064 (10.732) | 1.099–5.060 (3.634) → 0.139–1.846 (**1.318**) | 4 of 12 (0) |
| steered, deck, 18 | 2.471–9.084 (3.934) → 1.820–11.599 (3.821) | 3.966–23.179 (5.131) → 0.880–6.492 (**1.342**) | 4 of 18 (0) |

**Two readings.**

1. **Two independent instruments agree, as they did in 3.3o.** The ledger's rows (§4) and the state line here give the
   lean row's gain as ×0.30 and ×0.35 on the unsteered deck arm. **3.3o's own sentence — *"it is above 1 at the median
   in 96 of 96 live runs, on both rows, in every arm"* — is now false on the bank row in 44 of 96 runs.**
2. **The roll rate is the same number it was.** 10.641 → 10.332, 9.092 → 9.964, 3.980 → 5.369, 7.857 → 10.732,
   3.934 → 3.821. **The model still does not know which way the board is about to roll**, and nothing in this step was
   ever going to tell it.

## 6. (B) The four lateral reads, against the game's own `A⁻¹` — what the step buys and what it costs

The bank ledger publishes the whole 4×4 lateral compliance of the game's own matrix (3.3p); `lateralCompliance` is the
same four reads off the model's own, and both sides are reads.

| **[M]** per-run medians, unsteered deck 24 | the GAME, off its own `A⁻¹` | shipped | two-body | game/shipped | game/two |
|---|---|---|---|---|---|
| **the mass a side force meets**, kg | 2.796–3.787 (3.225) | **2.540** | 10.407–11.377 (11.097) | 1.101–1.491 (**1.270**) | 0.260–0.336 (**0.297**) |
| **a side impulse's own roll**, rad/s per N·s | −0.1192 to −0.0372 (−0.0708) | **exactly 0** | −0.0355 to −0.0202 (**−0.0310**) | — | 1.807–3.999 (**2.708**) |
| the board's roll inertia, kg·m² | — | — | — | 0.747–1.184 (0.929) | 0.746–1.182 (0.926) |
| its yaw inertia, kg·m² | — | — | — | 0.964–1.061 (1.021) | 0.908–0.999 (0.959) |
| **the inertia the BANK coordinate meets**, kg·m² | — | 0.688–1.611 (0.964) | 5.324–10.287 (6.874) | — | — |
| **the ankle's own authority over the lean**, \|model/game\| | the ledger's `ankleOwn` | 1.213–1.949 (**1.537**) | 0.185–0.312 (**0.233**) | — | — |

**Five readings.**

1. **The structural term the model had none of is there, with the right sign and two to eleven times too small.**
   3.3p reading 5: *"a water side force on the board produces no roll acceleration at all in the model."* It now
   produces **−0.0202 to −0.0363** rad/s per N·s against the game's **−0.3363 to −0.0360**; game/two medians by arm
   **2.708 / 2.256 / 10.694 / 2.398 / 3.532** [M]. **P3 holds in sign and in order and is refuted at its own upper
   edge** (I wrote −0.015 to −0.030; the span reaches −0.0363).
2. **And the sway mass, which the shipped plant had right, is now wrong the other way.** 2.54 kg was 1.10–1.49× under
   the game's; 11.097 kg is **3.4× over**. **P4 holds in direction and is refuted in magnitude** — I predicted 7–9 kg.
   The cause is in the algebra: a body with inertia `J` about its own centre resists having its feet moved sideways
   with an effective mass `m J / (J + m h²)`, about 11 kg here, **and the game's rider does not, because the game's
   rider is a point mass with a nearly free slider** (R1). *The more physical body is the one that disagrees with the
   game, and that sentence is the round's own warning label.*
3. **The ankle's authority over the lean goes from 1.5× too strong to 4× too weak.** This is the same fact as the bank
   inertia: the shipped plant's bank coordinate meets **0.964 kg·m²** against the two-body's **6.874**, and the
   ankle's torque divides by it. 3.3m measured the game's as 1.00–2.52 kg·m² off `A⁻¹`, which is the shipped plant's
   neighbourhood and not the new one's — **so the plant that predicts the lean ROW three times better meets a bank
   inertia seven times larger than the game's.** I do not have a mechanism for that and I am not inventing one; §8
   says what the sweep says about it.
4. **The two inertias 3.3p found already right stay right.** The board's roll inertia 0.929 → 0.926 and its yaw
   inertia 1.021 → 0.959 of the game's [M]. **The step did not disturb what was correct**, which is the control on it
   not being a wholesale rescaling.
5. **The datum, stated once more because it is the round's own frame risk.** The ledger's `ankleOwn` is the response
   to `b[7] = 1/L` as `coupleStanding` books it, and the model's is `c[1][0] − c[1][1]` for the ankle's own
   `(+1, −1, 0, 0)` column; the units agree (rad/s per N·m·s is rad/s² per N·m) and **the sign conventions do not**, so
   only the magnitudes are divided and the signs are printed. A sign error there flips a ratio, not its size.

## 7. (B) The body's own weight on its own lean: the line is right, the solved row is thirty times out

| **[M]** per-run medians, °/s² | unsteered deck | unsteered world | low deck | low world | steered |
|---|---|---|---|---|---|
| the game's own `gravity` source on the lean row | 114.2–495.0 (320.7) | 113.0–434.6 (269.4) | 50.3–505.9 (327.3) | 23.3–273.4 (199.3) | 100.4–670.5 (318.3) |
| 3.3o's **line** read, `g/h · θ` | 121.1–452.7 (318.2) | — | — | — | — |
| … its ratio to the game's own source | 0.924–1.103 (**0.982**) | 0.930–1.079 (0.962) | 0.785–1.259 (0.955) | 0.714–9.763 (1.013) | 0.631–1.000 (0.922) |
| the shipped plant's **solved** answer | 3871–14541 (**10231**) | — | — | — | — |
| … its ratio to the game's own source | 29.572–35.406 (**31.470**) | 29.778–34.651 (30.845) | 25.011–40.165 (30.413) | 22.724–310.884 (32.511) | 20.189–32.142 (29.494) |
| the **two-body** plant's solved answer, ratio | 4.022–5.272 (**4.401**) | 3.942–5.302 (4.360) | 3.593–6.300 (4.283) | 3.514–46.312 (4.544) | 2.695–4.625 (3.874) |

**Three readings.**

1. **The brief's second independent measurement does not survive, as a comparison.** The line `g/h · θ` is the
   model's own coefficient as written, with none of the coupling the row then does; the game's 20–206 °/s² was its
   **whole** lean acceleration. Against the game's own matching source the line is **right to 2 %**. 3.3o's
   `mPendulum` column reproduces here to the digit (121.1–452.7), so this is a correction to the comparison and not to
   the number.
2. **The defect is larger than the brief said, in the same direction, and the step removes seven times of it.**
   Shipped **31.5× the game's**; two-body **4.4×** [M]. *The point-mass body was not over-answering by a factor of
   two; it was over-answering by a factor of thirty, and the reason is the bank inertia of §6 reading 3, not the
   gravity coefficient.*
3. **I will not net the two.** §6 reading 3 says the two-body bank inertia is seven times the game's and §7 says its
   weight response is four times instead of thirty-one. Both are measured; they do not compose into one verdict, and
   I am not going to pretend they do.

## 8. (B) The sweep, because one value is not a measurement

`BODYJ` scales the sourced inertia on the `Two` plant alone, on the unsteered deck arm (24 runs), scored as a
counterfactual on the shipped ride.

| **[M]** the body's own inertia | J, kg·m² | the ROLL row | the LEAN row | the bank-rate residual | the sway mass, kg | side→roll | \|ankle authority\| |
|---|---|---|---|---|---|---|---|
| the shipped point mass | 0 | **10.300** | **3.515** | **2.552** | 2.540 | 0 | 1.537 |
| ×0.25 | 1.478 | 9.680 | 2.022 | 1.669 | 5.569 | −0.0213 | 0.655 |
| ×0.5 | 2.956 | 9.649 | 1.584 | 1.229 | 7.858 | −0.0271 | 0.413 |
| **×1, the sourced value** | **5.913** | **10.066** | **1.039** | **0.884** | 11.097 | −0.0310 | 0.233 |
| ×2 | 11.825 | 10.238 | 0.836 | **0.749** | 14.853 | −0.0336 | 0.125 |
| ×4 | 23.651 | 10.402 | **0.800** | 0.823 | 18.135 | −0.0350 | 0.065 |

**Three readings.**

1. **The lean row's gain is monotone over a sixteen-fold range and the roll row is flat across all of it.** So the
   result of §4 is not a coincidence at one value, and the roll row's immunity is not either.
2. **The bank-rate residual has a minimum near ×2 and the sourced value sits just inside the knee** (0.884 against
   0.749). **The sourced number is not the best-fitting number**, which is the only thing that would have made me
   suspicious of it; it is near it and it is sourced, and that is the combination this folder wants.
3. **At ×4 the lean row is under 1 in 24 of 24 runs, and ×4 the sourced inertia is not a body.** 23.7 kg·m² about a
   73 kg body's own centre of mass is a radius of gyration of 0.57 m — a body with its mass out at arm's length in
   the frontal plane, in every stance. **It is reported because the monotonicity is the finding and withheld as a
   value because the source is the point.**

## 9. (B) Ridden — the fall, as a separate fact

| **[M]** arm | n | shipped | `?riderBody=control` | `?riderBody=symmetric` | **`?riderBody=two`** | Compress |
|---|---|---|---|---|---|---|
| unsteered, deck | 24 | 1.100–2.067 (**1.183**) | 1.100–2.067 (**1.183**) | 1.050–2.100 (1.217) | 1.083–2.683 (**1.450**) | **8 of 8 in all four** |
| unsteered, world | 24 | 0.767–1.950 (0.950) | 0.767–1.950 (0.950) | 0.767–2.000 (0.967) | 0.733–2.567 (**1.283**) | 8 of 8 |
| **the owner's low speed, deck** | 18 | 0.517–7.100 (**1.033**) | 0.517–7.100 (**1.033**) | 0.517–7.183 (1.050) | 0.500–6.233 (**1.033**) | **6 of 6 in all four** |
| the same, world | 18 | 0.117–6.900 (0.767) | 0.117–6.900 (0.767) | 0.117–7.200 (0.767) | 0.117–6.250 (0.733) | 6 of 6 |
| steered, deck | 18 | 1.367–4.117 (3.067) | 1.367–4.117 (3.067) | 1.367–4.083 (3.000) | 1.317–3.183 (**2.500**) | 6 of 6 |

**Four readings.**

1. **The owner's bar is not met and barely moves.** The low-speed deck cell's median is **1.033 s both before and
   after**, its world twin **0.767 → 0.733**, and Compress falls **6 of 6** on each. **504 of 504 rides over the
   twenty-four arms ended before nine seconds.**
2. **The unsteered ride lengthens by a quarter to a third** (×1.23 deck, ×1.35 world; longer in 15 of 24 and 14 of 24)
   and **the steered ride shortens by a fifth** (×0.82, longer in 6 of 18). That is the shape of every ride effect
   this track has measured: a trade.
3. **The plant ridden is the plant scored, which is worth one line.** On its **own** ride the two-body plant's lean
   row reads **0.648–4.129 (1.609)** and its bank-rate residual **0.658–2.978 (1.079)** on the unsteered deck arm —
   worse than the 1.039 and 0.884 it scores on the shipped ride, because the ride it produces visits a different
   state. **Both are printed; neither is the other.**
4. **And nothing here is evidence of feel.** No bot ride is offered as such anywhere in this document.

## 10. What I refuted

- **The brief's second independent measurement**, as a comparison: *"the point mass's own gravity term alone is
  121–453 °/s² where the game's whole lean acceleration is 20–206."* The line is right to **0.924–1.103** against the
  game's own `gravity` source; the **solved** row is **29.6–35.4×**. A line and a row are two quantities. **The defect
  is seven times bigger than the brief said and in the same direction**, so the brief's conclusion stands on a
  measurement the brief did not make.
- **My own P1, which was the round's own control, as written.** The shipped plant is **not** the `J = 0` limit of a
  symmetric system; its coupling is asymmetric by `m z_d` = 2.263 kg·m, and the control needs `feetRoll: false`.
  **Sixth consecutive round to find its error in the half its brief called settled** — and this time the half was
  mine.
- **My own P4, in magnitude**: the sway mass goes to **10.4–11.4 kg**, not the 7–9 I predicted, so the step's cost on
  that read is larger than I wrote.
- **My own P3, at its upper edge**: the cross term reaches **−0.0363**, outside the −0.030 I wrote; it holds in sign
  and in order.
- **My own P5 and my own P6, which I wrote opposed to each other so that one had to fail — and both did.** The roll
  row's median landed at **10.066**, outside P5's 5.0–10.0 by 0.7 % and above P6's 5.0 outright. The honest statement
  is the one neither prediction made: **the roll row does not move.**
- **My own P7, by the largest margin of the round and in the direction of the step working.** I predicted the lean row
  would move by less than 25 %. It fell by **70 %**, in 96 of 96 runs.
- **My own P8**: the pendulum term does not fall by the factor `1 / (1 + J/m h²)`, because that factor is the **line's**
  and the quantity that matters is the **solved row's**.
- **A defect in step 3.3p's own probe, found by type-checking it separately as the brief's seatbelt asks.**
  `RiderInner.schedTilt` was declared **twice** (TS2300) and `Tick` had no `schedTilt` member at all while the probe
  wrote one and the summary read it (TS2353, TS2345) — so **3.3p's probe does not type-check on 3.3p's own tree.**
  Fixed here (one duplicate line removed, one member added). **Its run-time effect is none**: rolldown does not
  type-check, the field was written and read under the same name, and 3.3p's published `schedTilt` columns are
  reproduced here unchanged.
- **The first build of this round's own switch, before any number was reported.** `?riderBody=symmetric` fell through
  a type guard in `AttachedRider` that only named `'two'` and `'control'`, so the symmetric arm rode the **shipped**
  plant and came out identical to it in every ride-dependent column. Caught by §2 reading 4's own column, not by
  reading the diff.

## 11. What I will not claim

- **I will not claim the owner's bar is any closer.** 504 of 504, Compress in every arm, and the low-speed cell's
  median unmoved to the millisecond.
- **I will not claim the plant is right.** The roll row is still wrong by ten times at the median on the arm 3.3o led
  with, and its sign is still worse than a coin. **One row of two.**
- **I will not claim the two-body plant is more like the game's own solve.** On two of the four reads it is further
  away (the sway mass, the ankle's authority), and the reason is read, not guessed: **the game's own rider is a point
  mass with a nearly free slider across** (R1). A plant can be more faithful to a body and less faithful to this game
  at the same time, and both of those were measured here.
- **I will not claim this step needs the controller to be touched, or that it does not.** What I measured is that the
  cost function now disagrees with the plant in two named places — `captureRow`'s ω₀ = √(g/L) and `feetReach`'s bank
  limit `feetReach / L` are both the **point-mass** body's, on a plant whose bank coordinate now meets seven times the
  inertia — and that the ride moved by a quarter with them left alone. **Whether fixing them meets the bar is step
  two's measurement, not an inference I am entitled to here.**
- **I will not claim the ×2 or ×4 inertias**, for the reason in §8 reading 3.
- **I will not claim anything from the low-world arm's per-source numbers.** Its ledger control degrades to 12.470
  relative (3.3p §9) and six of its eighteen runs have no live tick; its force-at-the-feet ratio spans −16.934 to
  16.043 for that reason and its median is what is read.
- **The `FaceWater` is a fit to Canyon, not Canyon**; the rider is **placed**, not paddled or popped up; every span
  above is **the whole population of its arm**, not a confidence interval.
- **No bot ride is offered as evidence of feel anywhere in this document.**
- **Carried, not mine, not touched**: `steadyTurn`'s `ref.u[0]` peaking at 2 675° in 1 of 18 steered runs (Part 37
  §6); the `cos³` added-mass frame defect; `AttachedRider.frame`'s hard clamp of the measured bank at 70° at three
  sites; `?waterHeel`, which trades and is not a fix.

## 12. The controls

**C1, the state is a read**: the reconstruction pushed back through the controller's own `C`, all seven rows, **peak
over every tick of every one of the 504 runs: exactly 0**; tick spacing exactly `CONTROL_STEP`, **0.000e+0 off** [M].

**C2, the zero-inertia limit, in the matrix**: the assembly at `{ inertia: 0, feetRoll: false }` against the shipped
`continuousPlant` over **all 306 points of the schedule** (17 speeds × 3 depths × 6 rails), **worst entry
< 1 × 10⁻¹² of its own row's largest**, asserted by `predictiveBalance.test.ts`; over the rides, **≤ 1.2 × 10⁻¹⁴** [M].

**C3, the zero-inertia limit, in the ride**: `?riderBody=control` against the shipped rider on `fell`, `fellAt`,
`rollFall`, `bankFall`, `railFall`, `frames`, `stance` and `steer` — **102 runs, 816 column reads, 0 mismatches** [M].
And it is not vacuous: `?riderBody=symmetric` differs in **98 of 102** runs.

**C4, the assembly is a mass matrix and its compliance is symmetric**: with `feetRoll` on, `|M − Mᵀ|` and
`|M⁻¹ − M⁻ᵀ|` are **0 to twelve decimals** [tested], and over the rides the compliance's two roll–sway corners agree
to **≤ 1 × 10⁻¹⁵** [M]. With it off, `M` is asymmetric by exactly `m · deckHeight` [tested].

**C5, the ankle is a torque with a reaction**: the assembly's ankle column on the four coordinates is
`(+1, −1, 0, 0) τ` to **nine decimals**, the shipped plant's slip row is **exactly** `−k / (h m_b V)`, and the
assembly's is under half of it [tested].

**C6, the groups still sum to the row** on the two-body plant: the six zeroable groups plus the named remainder
against the row's own implied mean acceleration, **peak 1.2 × 10⁻¹² (roll)** and **7.4 × 10⁻¹³ (bank)** over every
live tick of every run of every arm [M].

**C7, 3.3p and 3.3o reproduced on this tree, which is what makes §4 a comparison**: the shipped arms' blended roll row
**10.050 / 9.366 / 2.725 / 7.420 / 4.035**, the lean row **3.540 / 3.310 / 3.833 / 3.722 / 8.298**, the one-step roll
rate **10.641 / 9.092 / 3.980 / 7.857 / 3.934** and bank rate **2.552 / 3.097 / 4.620 / 3.634 / 5.131**, the roll
sign **0.338 / 0.333 / 0.579 / 0.378 / 0.605**, the pendulum line **121.1–452.7 °/s²**, and the falls
**1.183 / 0.950 / 1.033 / 0.767 / 3.067 s** — **every one of them 3.3p's or 3.3o's published figure to the digit**
[M]. The median convention is the probe's own (`s[⌊p n⌋]`), stated because with 18 runs the other convention reads
0.950 where 3.3p reads 1.033.

**C8, the ledger's own control, carried**: `−deckTotal` against the game's own `φ̇` change, **0.009–0.046** (unsteered
deck) and **0.008–0.044** (world), the lean column 0.092–0.455, the owner's cell 0.009–29.763 — 3.3o's and 3.3p's own
spans to the digit, and the reason no per-source ledger number is reported for that arm [M].

**C9, a positive control predicted before it ran.** Over the first six ticks the filter has not run, so a probe
reading `x̂` would be small there and one reading the game's own state must not be. The roll-rate ratio over ticks 1–6
is **4.809–65.259** on the low-world arm against 2.999–19.753 over the rest [M]. **Held** — 3.3p's own number, since
the instrument is unchanged.

**C10, `lateralMass`'s own rank-one structure read rather than asserted**: the board's roll inertia and its yaw
inertia off the two-body compliance are **0.926** and **0.959** of the game's against the shipped plant's 0.929 and
1.021 [M], so the assembly did not rescale what 3.3p found already right.

## 13. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`:
  **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`:
  **exit 0**
- the probe type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]` and
  an **absolute** `typeRoots`: **exit 0**, with `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/plant.ts`, `src/physics/rollModel.ts`, `src/physics/predictiveBalance.ts`,
  `src/physics/AttachedRider.ts`, `src/physics/bankLedger.ts` and `@types/node` (668 files). **This is what found
  3.3p's three type errors** (§10).
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 630 passed, 21 expected fail** — step 3.3p's 624 plus this round's six.
  `vitest run src/game src/scene/rig`: **70 files, 734 passed** — 3.3p's 733 plus the switch's own.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical to 3.3p's.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round touches no solver, no wave and no spot file,
  and its one `SurfZoneSimulation.ts` change is a new optional config field threaded through `SurfZoneRunner` to the
  rider.
- **The Canyon byte check, run because `src/` DID change**, with the brief's three checks read rather than assumed —
  the wrapper prepends `globalThis.location = { search: '?canyonWaves=true' }` to the bundle, the grid line is read,
  and the "spun up on the CPU in … s" line is read so that no kept `.sea` was imported:
  - Canyon B (`?canyonWaves=true`), **400 × 451 = 180 400 cells**, spun up on the CPU in **47.9 s**: snapshots
    **a367d938f15fa934**, state **9e5831f80e38abd9** — **the same as main.**
  - the default Canyon, **400 × 507 = 202 800 cells**, spun up on the CPU in **59.6 s**: snapshots
    **ea3d57a4d49f4b48**, state **a1a2555739210f96** — **the same as main.**

  **All four match.** `src/` did change — ten files, two of them tests — but every behavioural line is behind
  `DesignWeights.riderBody`, which is unset by default and pinned off for online rooms; no solver, no wave, no spot
  file and no hull law is touched. The raw output is `results/34a/34a-canyon-byte-check.txt`.
- **the shipped rider is proved unchanged with the switch off**: the five shipped arms reproduce 3.3p's and 3.3o's
  published rows and falls to the digit (C7), and the switch's control value is byte-identical ridden over 102 runs
  and 816 column reads (C3).

## 13b. The deletions column, read line by line

`git diff --cached --numstat origin/main` before the commit, read file by file: **65 files, 2 907 insertions and 16
deletions** (this section included), and **all sixteen deletions read one by one.**

```
 52   0  docs/research/new-rider/3.2/inertia.probe.ts
301   4  docs/research/new-rider/3.3/plant.ts
 31   1  src/game/PhysicalMode.test.ts
 19   0  src/game/PhysicalMode.ts
  2   2  src/main.ts
 17   2  src/physics/AttachedRider.ts
  8   0  src/physics/RideSession.ts
115   2  src/physics/predictiveBalance.test.ts
 53   4  src/physics/predictiveBalance.ts
144   0  src/physics/rollModel.ts
  1   1  src/wave/SurfZoneRunner.ts
 11   0  src/wave/SurfZoneSimulation.ts
```

`src/physics/rollModel.ts` (**+144**), `src/game/PhysicalMode.ts` (**+19**), `src/physics/RideSession.ts` (**+8**),
`src/wave/SurfZoneSimulation.ts` (**+11**), `docs/research/new-rider/3.2/inertia.probe.ts` (**+52**),
`docs/research/new-rider/3.4/README.md` (**+674**) and the fifty-two files under `results/34a/` are **insertions only,
zero deletions.**

- **`plant.ts`, 4**: its two `import` lines, both re-added extended (`bodyInertiaAt`; `lateralCompliance` and
  `RiderBody`); and **the only real removal of the round** — `RiderInner`'s **duplicate** `schedTilt` declaration and
  its comment line, which were a TypeScript error (TS2300) in 3.3p's own probe. The identifier survives: it is still
  declared once in `RiderInner` above and is now also a member of `Tick`, which it was written to and read from
  without one. §10 has its measured run-time effect, which is none.
- **`predictiveBalance.ts`, 4**: the `rollModel` import (re-added with `RiderBody`), `plantAt`'s signature (re-added
  with `body`), and `scheduledDesign`'s two `plantAt(...)` calls (each re-added with the body option spread in).
- **`AttachedRider.ts`, 2**: the two lines of the `weights` expression, both re-added with `bodyWeights` in them and
  nothing dropped — `options.balance?.weights`, `heelWeights` and `DEFAULT_WEIGHTS` are all still there, in order.
- **`predictiveBalance.test.ts`, 2**: both import lines, extended (`lateralCompliance`, `lateralMass`;
  `SCHEDULE_DEPTHS`, `SCHEDULE_RAILS`, `SCHEDULE_SPEEDS`, `bodyInertiaAt`).
- **`main.ts`, 2**: the online-room override line and its comment line, both re-added with `riderBody` in them.
- **`PhysicalMode.test.ts`, 1** and **`SurfZoneRunner.ts`, 1**: the import line and the config spread line, each
  re-added with one more name.

**A token-by-token check was run rather than trusted to the eye**: every identifier on every one of the sixteen
deleted lines was searched for in the round's insertions, and all of them are present, with the one intended
exception named above (the duplicate declaration, whose identifier survives in two places).

## 14. Files (3.4a)

- `src/physics/rollModel.ts` — `RiderBody` (`inertia`, `feetRoll`), `YawPlant.body`, `lateralMass` (the lateral
  block's own 4×4, `diag(I_x, J, I_z, m_b) + m v_f v_kᵀ`), `lateralCompliance` (its inverse, the four reads the ledger
  publishes for the game), `solve4`, and `twoBody` — the lateral block assembled and **solved** instead of
  eliminated, with the ankle as a torque and its reaction and no constraint force written down. `yawRows` takes the
  assembly only when `y.body` is set; without it every line is the one that shipped.
- `src/physics/predictiveBalance.ts` — `BODY_FRONTAL_SHARE` and `bodyInertiaAt` (de Leva 1996 posed in the game's own
  stances), `plantAt`'s `body` option (`true` the sourced inertia, a number or a `RiderBody` outright, **and `0` the
  control, which is why the test is not truthiness**), `DesignWeights.riderBody` and its one line in
  `scheduledDesign`.
- `src/physics/AttachedRider.ts` — `AttachedRiderOptions.riderBody`, reaching the same weights route `waterHeel` does.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts` — the switch's own chain and its pin for online rooms.
- `src/physics/predictiveBalance.test.ts`, `src/game/PhysicalMode.test.ts` — **six new tests**: the zero-inertia limit
  over all 306 schedule points, its non-vacuity, the shipped coupling's asymmetry and the consistent one's symmetry,
  the ankle's own column with no horizontal force at the feet, the sourced inertia at each stance, and the switch's
  address with its room pin.
- `docs/research/new-rider/3.2/inertia.probe.ts` — **one new function and one new block, nothing removed**: the body's
  own frontal-plane inertia about its own centre of mass, from the same sourced table and the same posed stances the
  yaw inertia already shipped from.
- `docs/research/new-rider/3.3/plant.ts` — step 3.3p's probe, extended: the three body plants as counterfactuals on
  every ride, the control's own per-tick number, the force at the feet both ways, the four lateral reads off
  `lateralCompliance`, the groups and the conditioning on the two-body plant, the body's weight solved through each
  plant's own compliance against the ledger's own `gravity` source, `BODY=two|control|symmetric` so the ridden arm is
  the same probe on the same cells, and `BODYJ` for §8's sweep. Its two pre-existing type errors are fixed (§10).
- `docs/research/new-rider/3.4/results/34a/` — **52 files**: the twenty-four arms as `.jsonl` and `.txt`,
  `34a-summary.txt`, `34a-body-inertia.txt`, `34a-canyon-byte-check.txt` and `34a-predictions.md` (every prediction as
  written before its read, each with its own falsification, plus the five reads R1–R5 made before anything ran).
- `docs/research/new-rider/3.4/README.md` — this Part.

## 15. For the owner, in plain words — and the shot list

**You chose the two-body rider. This is step one of it, and here is what it bought and what it did not.**

**One: his balance's model of his own body was a stick with a weight on top and no stiffness of its own.** A real body
resists being twisted about itself; a weight on a stick does not. I put that resistance in — nine kilogram-metres
squared standing, five crouched, taken from the same anthropometric table his turning inertia already comes from — and
re-solved the four sideways motions together instead of one at a time.

**Two: the thing I was sent to delete was never a bug, it was a symptom.** The balance had a sideways shove at his
feet that the game has no counterpart for. It turns out that shove is **exactly** what you get when you eliminate a
body with no stiffness of its own: the arithmetic leaves it behind. Put the stiffness back and it disappears on its
own — and the honest force that replaces it is **a quarter smaller** than the invented one, and up to eleven times
smaller when he is low and slow.

**Three: the half of the model that is about HIS BODY is now three times more accurate, everywhere, with no
exceptions.** Every sixtieth of a second the balance predicts how fast his body is about to lean. Measured against
what the game then does: **wrong by three and a half times the whole movement before, wrong by one times it after** —
and better in **ninety-six of ninety-six** test rides. For the first time in this whole investigation that prediction
is **as good as the thing it is predicting** rather than several times worse, in nearly half the rides.

**Four: the half that is about THE BOARD did not move at all.** Still wrong by ten times, still gets the direction of
the board's roll right only a third of the time. Last round I told you that error survives because the sum is a
near-cancellation; on this new model the cancellation is **slightly milder and the error is the same size**, and the
same arithmetic still accounts for about **half** of it on the straight rides and **all** of it on your own slow cell.
So the board's half is not his body's shape — and after six rounds of clearing suspects it is now the whole of what is
left.

**Five: and there is a price, which I found by looking for it.** Two numbers the old model had right, the new one has
wrong the other way: how heavy the board feels when the water shoves it sideways (two and a half kilos was a bit
light; eleven is three times too heavy) and how much authority his ankle has over his lean (half again too much
before, four times too little now). The reason is almost funny: **the game's own rider is also a weight on a stick.**
So a model that describes a real body better describes *this game's* rider worse. That is a thing to fix in the game,
not in the model, and it is on the list for later steps.

**Six: your bar is not met and it barely moved.** Getting into position slowly in Compress: he still falls, six of six,
and the median time is **one point zero three three seconds before and one point zero three three after**. Riding
straight and not steering he stays on **a quarter longer**; holding a turn, a fifth shorter. Five hundred and four
test rides, every one of them ended inside nine seconds.

**My own honest summary: this was the right thing to build, it came right where it was supposed to, and it is not the
fall.** The fall is in the board's half.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, and `?rider=new&feltFrame=deck` as always.

1. **`?riderBody=two`, no stick, just glide.** The bench says he stays on about a quarter longer. **Does his body feel
   steadier under you — less of a flick, more of a lean?** That is the half that got three times better, and it is the
   half you feel in your own body rather than in the board.
2. **The same, then get into position slowly in Compress.** The bench says it changes **nothing** — same median, still
   six of six. **I want to know whether it feels different even though it falls at the same time**, because on this
   track "falls at the same moment" and "feels the same" have come apart before.
3. **The same, and hold a turn.** The bench says a held turn goes from three seconds to two and a half. If the turn
   gives way earlier, that is this number.
4. **`?riderBody=control` once, for one minute, and tell me if you can tell.** It is the same new code with the body's
   stiffness set to zero, which my measurements say is **exactly** the rider that ships. If it feels any different at
   all, something is wrong that 816 machine comparisons did not catch, and I want to know.
5. **And a ruling, not a ride.** Step one is done and measured. What I think step two is, in order:
   - **The cost function still thinks he is a stick with a weight on top.** Two constants in the balance's own
     objective — the one that says how fast a lean runs away (√(g/L)) and the one that says how far he can lean before
     his feet run out — are the old body's. The plant under them has changed by a factor of seven in one place. **This
     is the smallest honest next step and it is the one that could turn a better model into a better ride.**
   - **The board's half, which is now the whole of the problem.** Six rounds have cleared the inertias, the side
     force, the rail schedule, the speed clamp, the free-versus-held table, the body's shape and the conditioning. I
     would stop guessing and measure the roll row against the game **per source**, the way the lean row already is.
   - **The game's own rider is a weight on a stick too** (point five above). Making *it* two bodies is a much bigger
     job than making the model's two bodies, it is the route the parked duck-dive work named as the faithful one, and
     it is the only version of this that fixes the two reads this step made worse.
   **My recommendation is the first, then the second, and the third when you want the duck-dive back.** Your call.

# Part 2 — neither of the cost function's two named constants is in the shipped cost function, only one of them was
the point mass's, and that one was already five times wrong on the plant that shipped

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-b`, cut from `main` at
**99854a51** (Part 1's merge), so Part 1 is its base. Its brief is Part 1 §8 item 1 and §15's first ruling item:
*"the cost function's two point-mass constants — the smallest honest step, and the only one that could turn a better
plant into a better ride."*

It ships **`captureOmega`** (`'line' | 'fixed' | 'solved'`, the three definitions of the lean's own divergence rate),
**`captureOmega()`** as the one place in the cost function that holds one, **`costWeights()`** and
**one new opt-in switch with three values** (`?riderCost=point|fixed|plant`, off by default and pinned off for online
rooms), **four new tests**, and **1 008 rides over forty-eight arms**: the shipped plant and the two-body plant × the
shipped cost function and the three cost arms × five cells, plus eight arms on a common one-second window.
**119 947 control ticks read, 106 313 of them live.**

**The plant is untouched.** Φ, Γ, the senses, the delay, the filter's noises, the twelve derivatives, the rail
schedule and `?riderBody`'s own assembly are exactly what Part 1 merged; a test asserts Φ and Γ are identical across
all four cost arms on both plants. **Only the cost changed.**

## 0. The nine sentences the round is for

1. **The owner's bar is NOT met and no arm of this round comes close.** On the owner's own low-speed cell — entries
   set **absolutely** at 1–6 m/s through the water × three stances, the stick never touched — the eight arms end
   **18 of 18** every time, with medians on the deck filter of **1.033 s shipped, 1.267 with the two costs on,
   1.217 with the constant corrected**, and on the two-body plant **1.033 → 0.850 → 0.883**; **Compress falls 6 of 6
   in all eight** [M]. **Across the forty-eight arms, 1 008 of 1 008 rides ended before nine seconds and Compress
   fell in every one.**
2. **Neither constant the brief sent me to fix is in the shipped cost function, so the step as named cannot change
   the shipped ride by one bit.** `DEFAULT_WEIGHTS` holds `stateScale`, `commandScale`, `rho`, `processNoise`,
   `senseNoise`, `bias` and `heaveSense` — and **neither `feetReach` nor `captureScale`** [M, read off the object, not
   the source]. `captureRow`'s ω₀ is read only inside `if (capture)` and the bank limit only inside
   `if (w.feetReach)`. The round's own correction applied to the shipped weights is byte-identical at **every one of
   the 306 points of the schedule the game reads — worst entry exactly 0** [M, tested], and non-vacuous with the two
   weights on (smallest relative move over the 306 points **1.19 × 10⁻²**). 3.2j built `captureScale` and did not keep
   it; 3.2n built `feetReach` and did not keep it; both of those rounds' own READMEs say so in as many words.
   **The brief's "the only one that could turn a better plant into a better ride" is refuted as written.**
3. **Of the two, only one was ever the point mass's.** `feetReach / L` is where the centre of mass sits over the feet,
   `h sin θ`, and a rigid body's centre of mass sits at `h` whatever its own `J` is — so the bank limit is
   **kinematic, inertia-free, and the same number for a point mass and for a body** [A, tested on the capture row's
   own θ coefficient at all three stances]. **I did not change it, and Part 1's §8 item 1 is half the size it says.**
4. **The one that is a plant constant was already wrong on the plant that SHIPPED, by two and a half times more than
   Part 1's plant made it wrong.** `√(g/L)` is **3.417–4.223 rad/s** (3.885) over the 306 points. The **shipped**
   plant's own solved lean divergence — the body's own weight `m g h θ` through the plant's own lateral compliance —
   is **19.284–23.952 (21.971)**, which is **5.656×** it; the two-body plant's is **7.644–8.605 (8.229)**, **2.118×**
   [M]. *The inconsistency the brief attributes to step 3.4a is the smaller half of an inconsistency that was already
   in the shipped design.*
5. **And there is no unique lean rate on this plant to be consistent with — three honest definitions disagree by
   5.7× and the matrices cannot choose between them.** Held feet and no body: 3.885. Held feet with the body's own
   inertia: 3.559 (**0.916×**, the `fixed` arm). The plant's own freedoms: 8.229 (**2.118×**, the `plant` arm). And the
   plant's own whole `θ̈` per `θ` — the thing a divergence rate would be read from — is **negative at 306 of 306
   points on both plants** (−641 to −147, median −379 rad/s² per rad shipped; −92 to −27, −60 two-body), because the
   ankle's own 800 N·m/rad spring is in the plant and dominates gravity by one to two orders [M]. **The capture
   point's own premise — a lean that runs away at ω₀ — is false on this plant's own A**, which is why the switch ships
   three values and the ride decides rather than the algebra.
6. **Turning the two weights on is a factor of three to four on the ride; correcting the constant is per cent to tens
   of per cent.** Unsteered deck: **1.183 → 4.317 s** with the weights on (×3.65), and **4.317 → 4.000** when the
   constant is corrected (×0.93). Every `plant`-against-`point` ratio over the ten plant × cell combinations sits in
   **0.74–1.64** [M]. **P7 held.** *The brief asked for the constant and the constant is the small term.*
7. **The ROLL ROW MOVED — the row six rounds called immovable — and the plant did not change.** With Φ and Γ identical
   and only the gains different, the roll row's relative error against the bank ledger falls **10.050 → 2.622** on the
   shipped plant and **9.087 → 2.259** on the two-body one, and its sign goes **0.338 → 0.673** and **0.321 → 0.679**;
   better in **10 of 10** plant × cell combinations on both reads, and in the five of ten where the sign started below
   a coin it crossed above it [M].
8. **And a control I predicted before it ran splits that finding in half.** On a window every arm survives
   (`SECONDS=1`, so the window is 0.2–1.0 s and **nobody has fallen in any of 192 runs**), the shipped plant's gain
   **disappears** — 9.774 → 9.418, **×1.04** against ×3.83 at nine seconds — and the two-body plant's **keeps 55 %**
   — 6.512 → 2.944, **×2.21** against ×4.02 [M]. **So on the shipped plant the roll row's gain is the trajectory and
   not the gains; on the two-body plant about half of it is the gains. P9 is refuted on one plant and held on the
   other, and I will not report the nine-second number without this one beside it.**
9. **The gain is not the rider doing less.** In the weighted two-body arms the game's **own** lean acceleration is
   **168–220 °/s² against 83** and its own roll acceleration **349–411 against 162**, while the measured rail falls
   from **15.6° to 8.0°** and the speed from **8.7 to 6.5 m/s** [M]. The relative error halves to quarters while the
   motion it is measured against **doubles**.

## 1. (A) The four reads that had to come first

**R1 [M, not R].** `DEFAULT_WEIGHTS`'s own keys, printed from the object rather than read off the source:
`stateScale, commandScale, rho, processNoise, senseNoise, bias, heaveSense`. `'feetReach' in DEFAULT_WEIGHTS` is
**false** and `'captureScale' in DEFAULT_WEIGHTS` is **false**. Both constants the brief names live behind `if`s that
no default opens.

**R2 [R].** 3.2's own README says it twice and in its own merge table: *"`captureScale` is absent from
`DEFAULT_WEIGHTS`; 3.2j built it and did not keep it"*; *"`feetReach` is an available weight, absent from
`DEFAULT_WEIGHTS`"*; *"`feetReach` is absent from `DEFAULT_WEIGHTS` and every use of it is behind
`if (w.feetReach)`"*. **This was not hidden. Part 1 wrote "the cost function is now inconsistent with the plant in two
named places" and that sentence is true of two weights; the brief read it as true of the shipped cost function.**

**R3 [R]. A documentation defect in the brief's own quoted place, now corrected.** `DesignWeights.feetReach`'s own
comment said *"It also sets the capture point's own cost (`captureScale`) to the same metres unless that is given
separately"*. **It does not**: `design` reads `const capture = w.captureScale` with no fallback, and the comment eight
lines below it says the opposite — *"`feetReach` sets the bank's ranking and nothing else"*. Two comments in one file
disagreed about one `if`. The sentence is replaced by what the code does.

**R4 [R]. A third site of the point-mass ω₀, and it is the only live one.** `HumanBalance.capture` computes
`ω₀ = √(g_eff / h)` from the felt gravity and the centre of mass's height and it is **on by default** — it drives the
knees and the arms through `sensedCapturePast` (`strategies`), while the hip's own gain `HIP_CAPTURE_GAIN` is **0**
[R]. It is **consistent there**, because the game's own rider *is* a point mass on a scalar leg (Part 1 R1) — so it
is Part 1 §8 **item 3** that would make it wrong, not item 1, and that is a thing to carry into item 3 rather than a
defect now.

## 2. (B) Whether either constant is in the shipped cost function — the column, not the code read

| **[M]** over the 306 schedule points (17 speeds × 3 depths × 6 rails) | result |
|---|---|
| the correction (`captureOmega: 'fixed'` and `'solved'`) on the **shipped** weights, against the shipped design's `K` | **worst entry exactly 0**, 306 of 306 |
| the same correction with the two weights **on**, smallest relative move of `K` over the 306 points | **1.19 × 10⁻²** |
| `'feetReach' in DEFAULT_WEIGHTS` / `'captureScale' in DEFAULT_WEIGHTS` | **false / false** |

**Two readings.** The first line is the refutation and the second is what stops it being a refutation of the whole
step: the constant is dead in the shipped design and alive the moment the weights are set, so the round's question is
answerable but only on an arm that sets them. The tests assert both, and the non-vacuity bound is the one that would
have caught a `captureOmega` that fell through a type guard — 3.4a's own first build did exactly that.

## 3. (B) The lean's own divergence rate, by every definition that has one

| **[M]** rad/s, 306 schedule points, medians in brackets | the SHIPPED plant | the TWO-BODY plant | two/shipped | against `line` |
|---|---|---|---|---|
| `line` = `√(g/L)` — a point mass, feet nailed down (what ships) | 3.4174–4.2233 (**3.8849**) | the same | 1.0000 | 1.0000 |
| `fixed` = `√(m g L / (J + m L²))` — the body's own inertia, feet still nailed | 3.4174–4.2233 (3.8849) | 3.1614–3.8395 (**3.5587**) | 0.9160 | **0.9160** |
| `solved` = `√(C₁₁ m g L)` — the plant's own lateral compliance, the board free | 19.2841–23.9523 (**21.9711**) | 7.6443–8.6045 (**8.2290**) | **0.3745** | **5.6555 / 2.1182** |
| the plant's **whole** `θ̈` per `θ` (`A[3][2]`), rad/s² per rad | −641.4 to −147.0 (−378.8) | −92.1 to −27.1 (−59.9) | — | **positive at 0 of 306** |
| the plant's largest real **unstable eigenvalue** of its own 10×10 `A` | 0.4226–7.1585 (3.8213) | 0.3397–6.0141 (2.3513) | 0.6153 | 0.9836 / 0.6053 |
| … the share of that eigenvector's own norm on `(θ, θ̇)` / on `(φ, φ̇)` | 0.735 / 0.663 | 0.718 / 0.649 | — | — |

**Five readings.**

1. **`√(g/L)` is the rate of a pendulum whose feet are nailed down, and this plant's feet are not nailed down.** On
   the **shipped** plant — a point mass, no body inertia at all — the free reading is already **5.656×** the line,
   because the board's own sway mass is 2.54 kg against the rider's 73 and the lean's own weight shoves the board
   out from under the feet. **The ω₀ in the cost function was never this plant's.**
2. **The body's inertia moves the held reading by 8.4 % and the free one by a factor of 2.67.** `0.9160` and
   `0.3745` [M] — and `1/0.3745 = 2.670 = √7.13`, which is Part 1 §6 reading 3's seven-fold bank inertia, arrived at
   from the other side. **P4 and P5 both held**, at 2.67× and 8.4 %.
3. **The held reading is the mass matrix's own bank diagonal and nothing else, and that is the one quantity a
   diagonal honestly is.** `|√(m g h / M₁₁) − fixed| = 0.0000` at all 306 points on both plants [M, tested]. Stated
   because this folder has twice read a diagonal of `A` as a physical quantity it was not: a diagonal **is** the
   coordinate's inertia **with the others held**, which is exactly the definition `fixed` carries and exactly what
   `solved` does not.
4. **The plant's own whole lean coefficient is negative everywhere, so the quantity ω₀ is supposed to be does not
   exist on this plant with the sign the formula needs.** The ankle's 800 N·m/rad spring is in the plant at every
   tick and beats gravity by one to two orders. The capture point is a theorem about a body falling about a support
   under gravity alone; the internal model's lean is a **sprung** coordinate. **I am not going to call any of the
   three "the right one" from the matrices.**
5. **The plant's unstable mode is a coupled one, so it is not a lean rate.** Three-quarters of its eigenvector sits
   on the lean and two-thirds on the board, at 0.42–7.16 rad/s. Its median, 3.821, happens to sit within 1.7 % of the
   line's 3.885 on the shipped plant. **I will not net that against reading 1.** They are two quantities and this
   folder has made that mistake in both directions already.

## 4. (B) What the correction does to the gains, before any ride

| **[M]** the two weights ON, `plant`'s constant against `point`'s, 306 points | the SHIPPED plant | the TWO-BODY plant |
|---|---|---|
| `\|ΔK\| / \|K\|` | 0.0119–2.1237 (**0.1795**) | 0.0074–0.2858 (**0.1064**) |
| the ankle's own gain on the **bank** | 0.7709–1.1367 (0.9496) | 0.8642–1.0098 (0.9510) |
| the ankle's own gain on the bank's **rate** | 0.4602–1.0289 (**0.6828**) | 0.6738–0.9911 (**0.8262**) |
| the capture row's own `θ̇` coefficient, m per rad/s (tall / crouch / Compress) | line **0.2458 / 0.1673 / 0.1302**; solved **0.0435 / 0.0296 / 0.0230** | fixed **0.2657 / 0.1826 / 0.1432**; solved **0.1098 / 0.0790 / 0.0639** |

**Two readings.** A faster ω₀ weights the lean's **rate** less, so the corrected cost asks the ankle for **32 % less
gain on the bank rate** on the shipped plant and 17 % less on the two-body one, with the gain on the bank itself
within 5 %. And the capture row's `θ` coefficient is `L` in all four — §5's kinematic reading, in the row itself.

## 5. (B) The bank limit is kinematic, and that is half the brief gone

`feetReach / L` is the lean at which the capture point leaves the feet. The capture point's own lean coefficient is
where the centre of mass sits over the feet: `h sin θ`, about `h θ`. **A rigid body's centre of mass sits at `h`
whatever its own inertia about it is**, so the limit is the same for a point mass and for a body with any `J`, and
the shipped `stateScale[2] × (L_tall / L)` ranking carries no inertia to correct. Measured in the row itself: the
`θ` coefficient is **0.8400 / 0.6500 / 0.5500 m per rad** — exactly `L` — in all three modes and on both plants, and
every other entry of the row is 0 [M, tested]. The limits themselves are **8.87° / 11.46° / 13.54°** against the
shipped ranking's **2.86° / 3.70° / 4.38°**, which is 3.2n's own "the ranking, not the level" and is not touched here.

**So Part 1 §8 item 1 names two constants and one of them was not a constant of the body at all.** *The brief's half
that called itself settled is the half that was wrong, for the seventh consecutive round.*

## 6. (B) The fall, every arm — the owner's bar first

| **[M]** median s (span), ×/× the arm above | shipped plant: off → point → fixed → plant | two-body plant: off → point → fixed → plant |
|---|---|---|
| **the owner's low speed, deck (18)** | **1.033** → **1.267** → 1.267 → **1.217** | **1.033** → **0.850** → 0.850 → **0.883** |
| the same, world (18) | 0.767 → 1.233 → 1.233 → 1.133 | 0.733 → 0.600 → 0.600 → **0.983** |
| unsteered, deck (24) | 1.183 → **4.317** → 4.317 → 4.000 | 1.450 → 4.050 → 3.950 → 3.933 |
| unsteered, world (24) | 0.950 → **4.467** → 4.467 → 3.317 | 1.283 → 3.883 → 3.983 → 3.883 |
| steered, deck (18) | 3.067 → **1.967** → 1.967 → 2.033 | 2.500 → **1.300** → 1.300 → **1.667** |
| **Compress, every cell** | **6 of 6 / 8 of 8 in all four** | **6 of 6 / 8 of 8 in all four** |

**Five readings.**

1. **The bar is not met and it is not close.** 18 of 18 on the owner's cell in all eight arms; Compress 6 of 6 in all
   eight; **1 008 of 1 008 rides over the forty-eight arms ended**. **P6 held.**
2. **The weights are a factor of three to four on the straight arms and a third off the held turn, on both plants.**
   ×3.65 and ×4.70 unsteered; ×0.64 and ×0.52 steered. **That is the same trade every repair this folder has
   measured** — and it is the *weights*, measured in 3.2j and 3.2n and rejected there on the same shape of evidence.
3. **Turning the weights on is better than leaving them off on the shipped plant's own low-speed cell and WORSE on the
   two-body plant's.** 1.033 → 1.267 and 0.767 → 1.233 against 1.033 → 0.850 and 0.733 → 0.600 [M]. **P8 is refuted
   on one plant and held on the other**, which is the second time this round a prediction split by plant.
4. **Correcting the constant lengthens the ride where the ride is shortest and shortens it where it is longest — on
   the plant it was derived for.** On the two-body plant `plant` against `point` is longer on the owner's deck cell
   (×1.04), on its world twin (**×1.64**) and on the held turn (**×1.28**), level unsteered world and ×0.97 unsteered
   deck. On the **shipped** plant it is shorter in four cells of five (×0.96, ×0.92, ×0.93, ×0.74) and longer in one
   (×1.03) [M]. **Four of five each way, in opposite directions, by the plant the constant was read from** — which is
   the round's own best evidence that consistency between the cost and the plant is a real effect. **It is also five
   cells, not a population of cells, and I am not going to call it a mechanism.**
5. **`fixed` is `point` on the shipped plant, byte for byte, and that is a control rather than a result.** With no
   body the held reading **is** the point mass's, so the two arms must be one arm: **1 260 ride-column reads over six
   cells, 0 mismatches** [M], the assertion written before the columns were read. On the two-body plant they differ
   in every cell.

## 7. (B) The rows, per arm — and the row six rounds called immovable

| **[M]** per-run medians, unsteered deck 24 | lean row | roll row | one-step bank-rate residual | lean sign | roll sign |
|---|---|---|---|---|---|
| shipped plant, shipped cost (3.3p's own) | 3.540 | **10.050** | 2.552 | 0.696 | **0.338** |
| shipped plant + the weights, `point` | 4.764 | **2.622** | 4.925 | 0.674 | **0.673** |
| shipped plant + the weights, `plant` | 4.565 | 4.449 | 4.888 | 0.645 | 0.618 |
| two-body plant, shipped cost (3.4a's own) | 1.638 | 9.087 | 1.097 | 0.716 | 0.321 |
| two-body + the weights, `point` | 1.026 | 2.259 | 1.051 | 0.702 | 0.679 |
| two-body + the weights, **`fixed`** | **0.899** | **2.135** | **0.982** | 0.719 | 0.680 |
| two-body + the weights, `plant` | 1.137 | 2.957 | 1.270 | 0.669 | 0.643 |

| **[M]** the common one-second window, 0.2–1.0 s, **nobody fallen in 192 runs** | lean row | roll row | residual | roll sign |
|---|---|---|---|---|
| shipped plant, shipped cost | 3.190 | 9.774 | 2.948 | 0.354 |
| shipped plant + the weights, `point` | 4.650 | **9.418** | 4.822 | 0.500 |
| two-body plant, shipped cost | 1.301 | 6.512 | 1.244 | 0.417 |
| two-body + the weights, `point` | **0.740** | **2.944** | 0.788 | 0.583 |
| two-body + the weights, `fixed` | 0.746 | 3.105 | **0.750** | 0.583 |
| two-body + the weights, `plant` | 0.825 | 3.510 | 0.823 | 0.563 |

**Six readings.**

1. **The roll row's error and its sign are not properties of the model alone.** The model is byte-identical across
   the four cost arms — Φ, Γ and the ledger's own controls unchanged, asserted and read — and the roll row still
   falls from 10.050 to 2.622 and its sign crosses a coin. **Six rounds have cleared the inertias, the side force,
   the rail schedule, the speed clamp, the free-versus-held table, the body's shape and the conditioning on the
   premise that the roll row is the model's; part of it is where the controller takes the rider.**
2. **And at nine seconds that part is most of it on the shipped plant and about half of it on the two-body one.** The
   common window is the instrument: the shipped plant keeps **×1.04** of a ×3.83 and the two-body plant **×2.21** of a
   ×4.02 [M]. **P9 refuted on one plant, held on the other.** *The arm with a body in its plant is the arm where the
   gains themselves buy a better row; the arm without one only rides somewhere gentler.*
3. **The weights buy the lean row and the residual only on the plant that has the body.** Lean row with the weights
   on: **worse in 3 of 5 cells** on the shipped plant (3.540 → 4.764, 3.310 → 4.290, 3.833 → 4.931) and **better in
   4 of 5** on the two-body plant; the one-step bank-rate residual **worse in 4 of 5** shipped and **better in 5 of 5**
   two-body [M]. **The consistency that buys the rows is the plant's having a body at all, not which ω₀ is used.**
4. **The best rows this folder has measured are `two-fixed`'s, and I will not call them a better plant.** 0.899 /
   2.135 / 0.982 with both signs above a coin, against Part 1's 1.039 / 10.066 / 0.884 — but those were scored as a
   counterfactual on the **shipped** ride and these are scored on **their own**, which is 2.7× longer and visits
   different states. **Both are printed; neither is the other**, which is Part 1 §9 reading 3's own warning applied to
   this round.
5. **The most plant-consistent ω₀ is the worst of the three on the rows and the best of the three on the fall where
   the fall is shortest.** `plant` reads 1.137 / 2.957 / 1.270 against `fixed`'s 0.899 / 2.135 / 0.982, and rides
   longer than both on the owner's world cell (0.983 against 0.600) and on the held turn (1.667 against 1.300) [M].
   **Those two facts point opposite ways and I am not going to resolve them with an argument.**
6. **The rider is not riding less.** §0 sentence 9's numbers: the game's own lean and roll accelerations roughly
   double in the weighted two-body arms while the measured rail halves. A relative error that falls while its
   denominator doubles is not a quiet ride.

## 8. What I refuted

- **The brief's own premise, as written**: *"the cost function's two point-mass constants — the smallest honest step,
  and the only one that could turn a better plant into a better ride."* **Neither constant is in the shipped cost
  function** (§2, worst entry exactly 0 over 306 points), so correcting them cannot turn anything into a better ride
  until two weights that 3.2j and 3.2n each measured and rejected are turned on. **Seventh consecutive round to find
  its error in the half its brief called settled.**
- **Half of "two point-mass constants"**: `feetReach / L` is **kinematic** and carries no inertia (§5), so there was
  one constant, not two.
- **The size and the ownership of the one that was real**: `√(g/L)` is **5.656×** out on the **shipped** plant and
  **2.118×** out on the two-body one (§3). The defect is not something Part 1 created; Part 1 made it **2.7× smaller**.
- **My own P8, on one plant.** I predicted the two weights would be worse than leaving them off on the owner's
  low-speed cell on **both** plants, because that is what 3.2j and 3.2n measured in the game. On the shipped plant
  they are **better** (1.033 → 1.267 deck, 0.767 → 1.233 world). On the two-body plant they are worse. **A prediction
  that splits by plant is a prediction I should not have written as one sentence.**
- **My own P9, on one plant, and it is the round's most useful refutation.** I predicted the roll row's whole gain
  would be the trajectory. On the shipped plant it is (×1.04 of ×3.83). **On the two-body plant 55 % of it survives a
  window nobody falls in**, so the gains themselves do buy a better roll row there — which no round of this folder
  has measured before.
- **A documentation defect in the brief's own quoted sentence** (§1 R3): `feetReach` does **not** set `captureScale`,
  and the file said both.
- **My own first reading of the Canyon byte check, refuted by my own control within the hour.** From a run that had
  silently imported a kept `.sea` I wrote that Part 1's published hashes were stale. **A fresh spin-up reproduces them
  exactly, on `main` and on this branch, on both arms** (§11b). The stale thing was the state file in a shared
  scratchpad, and the brief's own instruction to read the "spun up on the CPU" line is what exposed it.
- **"Six rounds say the roll row does not move."** It moves, by 2–4× and across its sign, with the plant
  byte-identical (§7). What has not moved is the roll row **at a fixed trajectory on the shipped plant** — which is a
  narrower statement than the one the folder has been carrying.

## 9. What I will not claim

- **I will not claim the owner's bar is any closer.** 1 008 of 1 008, Compress in every arm, the low-speed deck cell
  at 1.033 s shipped against 1.267 at best and **0.850 at worst**.
- **I will not claim the two weights should ship.** They are a factor of 3.7 on straight running and a **third off
  the held turn**, and 3.2j and 3.2n each rejected them in the game on the lower stances' saved shove, which this
  round did not re-measure.
- **I will not claim which ω₀ is right.** Three definitions, 5.7× apart, the plant's own whole lean coefficient
  negative at 306 of 306 points, and the best-on-the-rows arm (`fixed`) and the best-on-the-fall-where-it-matters arm
  (`plant`) are different arms.
- **I will not claim the roll row's gain is a repair.** Half of it is the trajectory even on the two-body plant, and
  all of it is on rides that are three to four times longer than the ones the row was measured on before.
- **I will not claim anything from five cells as a mechanism** — §6 reading 4's four-of-five-each-way is a direction,
  not a population of spots, and the low-world arm's own ledger control still degrades as Part 1 §11 says.
- **I will not claim the live `ω₀` in `HumanBalance` is wrong.** It is right for the rider the game has (a point
  mass); it becomes wrong exactly when Part 1 §8 item 3 is done.
- **Carried, not mine, not touched**: `steadyTurn`'s `ref.u[0]` peaking at 2 675°; the `cos³` added-mass frame
  defect; `AttachedRider.frame`'s 70° bank clamp at three sites; the roll row per source against the game (Part 1 §8
  item 2); the game's own rider as two bodies (item 3).
- **No bot ride is offered as evidence of feel anywhere in this document.**

## 10. The controls

**C1, the state is a read**: the reconstruction pushed back through the controller's own `C`, **peak over every tick
of every one of the 1 008 runs: exactly 0**; tick spacing **0.000e+0 s** off `CONTROL_STEP` [M].

**C2, the plant is untouched by the cost**: `Φ` and `Γ` identical across all four cost arms on both plants, at the
schedule point the test reads, and `K` different in all of them [tested]. Over the rides, the ledger's own control
(`−deckTotal` against the game's own `φ̇` change) reads **0.009–0.046 (0.020)** on the shipped arm and
**0.005–0.050 (0.026)** on the two-body one — 3.3o's, 3.3p's and Part 1's own spans.

**C3, the fix cannot move the shipped rider**: `captureOmega: 'fixed'` and `'solved'` on `DEFAULT_WEIGHTS` against the
shipped design's `K`, **306 of 306 points, worst entry exactly 0** [M, tested].

**C4, and it is not vacuous**: with the two weights on, the same change moves `K` by at least **1.19 × 10⁻²** relative
at every one of the 306 points [M, tested], and the `?riderCost` values are named exhaustively in `AttachedRider`
rather than passed through, because 3.4a's own first build had a value fall into the default arm.

**C5, `fixed` is `point` with no body, in the matrices and in the ride**: `captureOmega(y, g, 'fixed')` equals
`'line'` to twelve decimals on every plant without a body [tested], the designs are `toEqual`-identical [tested], and
**ridden, 1 260 column reads over six cells with 0 mismatches** [M] — written as an assertion before the columns were
read.

**C6, the held reading is the mass matrix's own diagonal**: `|√(m g h / M₁₁) − fixed| = 0.0000` at all 306 points on
both plants [M], and `'solved'` is `√(C₁₁ m g h)` off `lateralCompliance` to twelve decimals [tested].

**C7, the groups still sum to the row**: peak **6.8 × 10⁻¹²** (roll) and **7.1 × 10⁻¹²** (bank) over every live tick
of every run of every one of the forty-eight arms [M].

**C8, 3.3p and Part 1 reproduced on this tree, which is what makes §6 and §7 comparisons**: the shipped arms' roll row
**10.050 / 9.366 / 2.725 / 7.420 / 4.035**, lean row **3.540 / 3.310 / 3.833 / 3.722 / 8.298**, bank-rate residual
**2.552 / 3.097 / 4.620 / 3.634 / 5.131**, roll sign **0.338 / 0.333 / 0.579 / 0.378 / 0.605** and falls
**1.183 / 0.950 / 1.033 / 0.767 / 3.067 s** — **every one 3.3p's published figure to the digit**; and the two-body
arms' falls **1.450 / 1.283 / 1.033 / 0.733 / 2.500 s** — **every one Part 1 §9's, to the digit** [M].

**C9, a positive control predicted before it ran**: §0 sentence 8's common window. I predicted the roll row's gain
would mostly vanish there. It vanished on one plant and did not on the other, which is why it is a control and not a
decoration.

**C10, the capture row's own support**: every entry outside `θ` and `θ̇` is **0** in all three modes at all three
stances, and the two-argument call is the shipped row byte for byte [tested].

## 11. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probes type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming it covered
  `docs/research/new-rider/3.3/plant.ts`, `docs/research/new-rider/3.4/cost.ts`, `src/physics/rollModel.ts`,
  `src/physics/predictiveBalance.ts`, `src/physics/AttachedRider.ts`, `src/physics/bankLedger.ts` and `@types/node`
  (672 files). **It found three unused-binding errors in this round's own probe**, which are fixed.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 634 passed, 21 expected fail** — Part 1's 630 plus this round's four.
  `vitest run src/game src/scene/rig`: **70 files, 735 passed** — Part 1's 734 plus the switch's own.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  identical to Part 1's.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round touches no solver, no wave and no spot file,
  and its one `SurfZoneSimulation.ts` change is one more optional config field threaded to the rider.
- **the shipped rider is proved unchanged with every switch off**: the five shipped arms reproduce 3.3p's published
  rows and falls to the digit (C8), and the correction itself is byte-identical on the shipped weights over all 306
  schedule points (C3).

### 11b. The Canyon byte check — it passes, and reading the "spun up" line is what made it mean anything

`src/` changed (ten files, three of them tests), so the check was run with the brief's three reads **done** rather
than assumed: the wrapper prepends `globalThis.location = { search: … }` to the bundle, the grid line is read, and the
**"spun up on the CPU in … s" line is read** so that no kept `.sea` is imported silently.

| **[M]** 3 600 steps | grid | spin-up | snapshots | state |
|---|---|---|---|---|
| **fresh**, Canyon B (`?canyonWaves=true`), **this branch** | 400 × 451 | **44.4 s** | **`a367d938f15fa934`** | **`9e5831f80e38abd9`** |
| **fresh**, Canyon B, **`main` at `99854a51`**, tree clean | 400 × 451 | 47.9 s | `a367d938f15fa934` | `9e5831f80e38abd9` |
| **fresh**, the default Canyon, **this branch** | 400 × 507 | **68.7 s** | **`ea3d57a4d49f4b48`** | **`a1a2555739210f96`** |
| *the first attempt*, Canyon B, **a kept `.sea` imported** (no spin-up line), this branch | 400 × 451 | — | `d236d12d682dc4f6` | `ab2156bcafecc1c0` |
| *the same kept `.sea`* on **`main`**, as the control | 400 × 451 | — | `d236d12d682dc4f6` | `ab2156bcafecc1c0` |
| *the same kept `.sea`*, the default Canyon, branch **and** `main` | 400 × 507 | — | `a8ac71b70eac2add` | `6319ed883e54b32e` |

**All four fresh hashes are the brief's own references, to the character** — Canyon B `a367d938f15fa934` /
`9e5831f80e38abd9` on **both** the branch and a clean `main`, and the default Canyon `ea3d57a4d49f4b48` /
`a1a2555739210f96`. **The check passes.**

**And the way it nearly did not is worth the three lines.** The first run printed **no "spun up" line**, so it had
imported a kept `.sea` from the scratchpad path Part 1's own run names — a path **another session has been writing
benches into**, so the state there was no longer Part 1's — and it produced hashes that match neither reference.
I wrote, from that run alone, that *"the reference is stale"*. **It is not: a fresh spin-up on `main` reproduces it
exactly, and so does the branch's.** What was stale was the kept state. **The brief's instruction to read the spin-up
line is the whole reason that was caught**, and the control that settled it was branch-against-`main` on the **same**
sea (identical on both arms) followed by a fresh spin-up on each. The raw record of all four runs, in order, is
`results/34b/34b-canyon-byte-check.txt`.

**And it cannot differ, for a reason that is read and not inferred**: every behavioural line of this round is behind
`DesignWeights.captureScale` and `DesignWeights.feetReach`, which no default sets (§2, worst entry exactly 0 over all
306 schedule points), `captureOmega`'s `'line'` branch is `Math.sqrt(gravity / y.height)` — the expression that
shipped — and `riderCostSwitch()` returns `{}` for every address but its own three values.

## 12. Files (3.4b)

- `src/physics/predictiveBalance.ts` — `CaptureOmega` and **`captureOmega()`**, the one place in the cost function
  that holds a lean divergence rate, with its three definitions each stated and each derivable from the plant it is
  handed; `captureRow`'s fourth argument (`'line'` by default, so the two-argument call is byte for byte the row that
  shipped); `DesignWeights.captureOmega`; `COST_FEET_REACH`, `COST_CAPTURE_SCALE` and `costWeights()`, the switch's
  two weights at the values 3.2n and 3.2j measured; and the corrections to `DesignWeights.feetReach`'s own comment
  (§1 R3 — it does **not** set `captureScale`, and the ω₀ in the sentence that followed was the nailed-feet one).
- `src/physics/AttachedRider.ts` — `AttachedRiderOptions.riderCost`, reaching the same weights route `waterHeel` and
  `riderBody` do, with the three values **named exhaustively** rather than passed through.
- `src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts` (`riderCostSwitch`), `src/main.ts` — the switch's own chain and its pin for online rooms.
- `src/physics/predictiveBalance.test.ts`, `src/game/PhysicalMode.test.ts` — **four new tests**: the correction is
  byte-identical on the shipped weights over all 306 schedule points **and** non-vacuous with the two weights on; the
  three definitions each against their own statement (including `fixed` against the mass matrix's own bank diagonal
  and `fixed` ≡ `line` with no body); the capture row's own support and its `L` coefficient in every mode (§5's
  kinematic reading); and the switch's address with its room pin.
- `docs/research/new-rider/3.4/cost.ts` — **the round's own matrix probe**: the liveness column, the five candidate
  ω₀ with the two reads that say what the plant's own instability is, the gains both ways, and the capture row and
  bank limit per stance. Read-only.
- `docs/research/new-rider/3.3/plant.ts` — step 3.3p's probe, extended with **`COST=point|fixed|plant`** so the
  ridden arm is the same probe on the same cells, and with the arm's own ω₀ printed in every run's row so no arm's
  number is ever reported against another arm's constant.
- `docs/research/new-rider/3.4/results/34b/` — the forty-eight arms as `.jsonl` and `.txt`, `34b-summary.txt`,
  `34b-omega.txt`/`.jsonl`, `34b-canyon-byte-check.txt` and `34b-predictions.md` (every prediction as written before
  its read, each with its own falsification, plus the four reads R1–R4 made before anything ran, and P9 written
  after the forty arms and before the control that tests it).
- `docs/research/new-rider/3.4/README.md` — this Part.

## 13. For the owner, in plain words — and the shot list

**I was sent to fix two numbers in his balance's rulebook. One of them was not broken, and neither of them is
switched on.**

**One: the two numbers live in two rules the balance does not use.** His balance scores every possible move against a
list of what it minds — how far he is leaning, how fast, how hard his ankle is working. Two extra items were written
for that list in earlier rounds and **neither was kept**: one that says each stance has its own lean limit, and one
that scores where his weight is heading rather than only where it is. They are in the code, with their measurements,
switched off. So "fix the two constants in those rules" cannot change the rider that ships **at all** — and I proved
that rather than argued it: with the fix applied, his gains come out identical at all 306 points of the table he
reads, to the last bit.

**Two: of the two numbers, only one was ever about his body.** The other one is where his weight sits over his feet,
and that is the same distance whether you model him as a weight on a stick or as a real body — **it is geometry, not
inertia**. So last round's "two point-mass constants" was one.

**Three: and the one that was real was already five times wrong before last round touched anything.** The number is
how fast a lean runs away from you. The rulebook says **3.9 a second**. On the plant that *ships* — a weight on a
stick, as it always was — it is **22 a second**, because his board weighs two and a half kilos sideways and his lean
shoves it out from under his feet. Last round's two-body plant made it **8**. So last round did not create this
problem: **it made it two and a half times smaller.**

**Four: and I cannot tell you which number is right, because the lean in his model does not actually run away.** His
ankle is a stiff spring in that model and it always wins: the model's own lean coefficient is **negative at every one
of the 306 table points**, on both plants. The whole idea the number comes from — a body toppling about its feet
under gravity alone — **is not what his model describes.** So I shipped all three readings as a switch and let the
riding decide, instead of picking one with an argument.

**Five: and then the real result, which I did not go looking for.** When I turned those two unused rules **on**, the
straight ride went from **1.2 seconds to 4.3** — three and a half times — and the held turn got a third *shorter*.
That is the trade this track has measured a dozen times. But the thing worth your attention is the other half:
**the board's half of the model, the half I told you last round was now the whole problem, got four times more
accurate and started getting the direction of the board's roll right more often than a coin** — and the model itself
did not change by one byte. Only the gains did. **Part of what six rounds have blamed on the model is where the
controller takes him.** I then built the control that tests that: on a one-second window nobody falls in, the gain
**vanishes** on the old plant and **half of it survives** on the two-body one. So: on the plant with a real body in
it, better gains really do buy a better model; on the old plant, he was just riding somewhere gentler.

**Six: your bar is not met, and on your own slow cell one of these arms is worse than what ships.** Getting into
position slowly in Compress: still six of six, and the median time is **1.033 s shipped**, 1.267 with the rules on,
**0.850** with the rules on top of the two-body plant. One thousand and eight test rides this round, every one ended
inside nine seconds.

**My honest summary: the step I was sent to do was half a step, it is measured, and the fall did not move. The thing
I would chase next is the accident — that the gains move the board's half of the model at all.**

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, and `?rider=new&feltFrame=deck` as always.

1. **`?rider=new&feltFrame=deck&riderCost=point`, no stick, just glide.** The bench says he stays up **three and a
   half times longer** than what ships. **That is the biggest ride effect this track has produced, and it comes from
   two rules two earlier rounds rejected** — on probes, not on your ride. **Does he feel steadier, or does he feel
   like he is refusing to turn?** That is the question those two rounds answered with "it costs the lower stances
   their save", and your ride is the only thing that can overrule them.
2. **The same, and hold a turn.** The bench says the held turn goes from 3.07 s to 1.97 — **a third shorter**. If the
   turn gives way much earlier, that is this number and it is the reason not to ship these two rules.
3. **`?riderBody=two&riderCost=plant` against `?riderBody=two&riderCost=point`.** This is the actual question I was
   sent to answer — the corrected constant against the old one, on the plant that has a body. The bench says the
   difference is **tens of per cent, not a factor**: the corrected one rides **longer** on your own slow cell and on
   a held turn and slightly shorter running straight. **Can you feel a difference at all?** If you cannot, that is
   worth knowing: it would say the constant is not where the next effort goes.
4. **`?riderBody=two&riderCost=fixed` once.** On the shipped plant this is **byte-identical** to `point` (1 260
   machine comparisons, 0 mismatches) — on the two-body plant it is the arm with **the best model accuracy this whole
   investigation has recorded** (lean row 0.899, board row 2.135, both signs better than a coin). **If the best
   numbers feel worst, I want to know that before I chase them further.**
5. **And a ruling, not a ride.** What I think step three is, in order:
   - **The accident, which is the biggest thing this round found: the gains move the board's row.** Six rounds have
     been measuring the roll row as if it were a property of the model. It is partly a property of the trajectory,
     and on the two-body plant about half of it is the gains themselves. **I would measure the roll row per source
     against the game at a FIXED trajectory** — the same recorded ride, three sets of gains — which is Part 1 §8
     item 2's measurement with this round's control built into it. That is the first thing I would do.
   - **The two rules themselves, properly, against your bar and not against a probe.** They are the factor of three
     and a half in the ride and nobody has ridden them. Shot 1 and shot 2 are that measurement, and they are yours.
   - **The game's own rider as two bodies** (Part 1 §8 item 3). It is still the only thing that fixes the two reads
     Part 1 made worse, it is still the route the parked duck-dive work named as the faithful one — **and this round
     found that the live capture point in the game's own rider, the one that lowers his knees, carries the same
     nailed-feet ω₀. It is right today because the game's rider is a weight on a stick. It stops being right the day
     item 3 lands**, so it belongs in item 3's own scope.
   **My recommendation is the first, then your two shots, then the third. Your call.**

## 14. The deletions column, read line by line

`git diff --cached --numstat origin/main` before the commit, read file by file: **113 files, 5 637 insertions and 19
deletions** (this section included), and **all nineteen deletions read one by one.**

```
 22   2  docs/research/new-rider/3.3/plant.ts
 31   1  src/game/PhysicalMode.test.ts
 18   0  src/game/PhysicalMode.ts
  2   2  src/main.ts
 23   3  src/physics/AttachedRider.ts
  8   0  src/physics/RideSession.ts
115   1  src/physics/predictiveBalance.test.ts
 76   9  src/physics/predictiveBalance.ts
  1   1  src/wave/SurfZoneRunner.ts
 10   0  src/wave/SurfZoneSimulation.ts
```

`src/game/PhysicalMode.ts` (**+18**), `src/physics/RideSession.ts` (**+8**), `src/wave/SurfZoneSimulation.ts`
(**+10**), `docs/research/new-rider/3.4/cost.ts` (**+294**), `docs/research/new-rider/3.4/README.md` (**+557**) and
the **101** files under `results/34b/` are **insertions only, zero deletions.**

- **`predictiveBalance.ts`, 9** — and **five of them are the only real removal of the round**: the `rollModel` import
  (re-added with `lateralCompliance`); **the five comment lines of `DesignWeights.feetReach` that said it sets
  `captureScale` and that each stance's ω₀ is `√(g/L)`** — both false of the code (§1 R3), replaced by what the code
  does and by the measured rate; `captureRow`'s signature (re-added with `mode`); `row[3] = y.height / Math.sqrt(…)`
  (re-added as `y.height / captureOmega(y, gravity, mode)`, whose `'line'` branch **is** that expression); and
  `design`'s own `captureRow(y, 9.81, nState)` call (re-added with `w.captureOmega ?? 'line'`).
- **`AttachedRider.ts`, 3**: the `predictiveBalance` import (re-added with `costWeights` and `type CaptureOmega`) and
  the two lines of the `weights` expression, both re-added with `costs` in them and nothing dropped —
  `options.balance?.weights`, `heelWeights`, `bodyWeights` and `DEFAULT_WEIGHTS` are all still there, in order.
- **`plant.ts`, 2**: its `predictiveBalance` import (re-added with `captureOmega`) and the summary's header line
  (re-added with the arm's own `body` and `cost`).
- **`main.ts`, 2**: the online-room override comment and the override line itself, both re-added with `riderCost` in
  them.
- **`PhysicalMode.test.ts`, 1**, **`predictiveBalance.test.ts`, 1** and **`SurfZoneRunner.ts`, 1**: one import line
  each and the config spread line, each re-added with one more name.

**A token-by-token check was run rather than trusted to the eye**: every identifier on every one of the nineteen
deleted lines was searched for across the round's insertions. **Every code identifier is present.** The only tokens
that are not are twelve ordinary English words (`carries`, `coming`, `difference`, `express`, `faster`, `going`,
`larger`, `matters`, `most`, `radians`, `share`, `delay`) and all twelve are from the five removed comment lines —
the intended removal named above.

# Part 3 — the roll row's error is the model's, and it is not one number: six to eleven times in a ride's first
second and one to two times after a second and a half, on the same runs

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-c`, cut from `main` at
**bac85c61** (Part 2's merge plus the owner's ruling handoff), so Part 2 is its base. Its brief is Part 2 §7 item 1,
the round's own accident: *"**The gains move the board's row.** Measure the roll row per source against the game at a
**FIXED trajectory** — one recorded ride, several sets of gains. Six rounds have been measuring that row as if it
were the model's alone."*

It ships **no source change at all** — `git diff origin/main -- src/ server/` is **empty** — and instead extends two
read-only probes: `3.3/plant.ts` with the roll row's **twenty-three-source** partition, the row's own two halves, the
**four gain sets' commands substituted into one recorded ride**, and the ankle rest's authority on both sides
(`TICKS=<path>`, `GAINS=1`, both off by default); and a new probe `3.4/row.ts` that does the matched-state
decomposition. **Forty arms, 816 rides, 72 339 live control ticks of 83 655 read** on the shipped plant and the two-body plant ×
the four cost arms × five cells, two of which are one-second windows built so that nobody falls.

**The owner rode this track between Part 2 and this Part, and their two sentences are the frame for what follows:**
*"gets on the board down turn just falls very easily"* and *"seems that the movement is very fluid in the sense that
doesnt look like a stick but an actual human movement."* The second is Part 1's lean row felt from the inside; the
first is this Part's subject. **Nothing here proposes reverting the two-body plant**, and §3's turn arms exist because
their fall is a bottom turn.

## 0. The ten sentences the round is for

1. **The owner's bar is NOT met in any arm.** **480 of 480 rides given nine seconds ended before nine seconds, and
   Compress fell in 160 of 160 of them** [M], over twenty-four arms on two plants and four cost arms. On the owner's own
   low-speed cell the medians are **1.033 s shipped / 1.267 point / 1.267 fixed / 1.217 plant** and, on the two-body
   plant, **1.033 / 0.850 / 0.850 / 0.883** — Part 2's figures to the digit. The other eight arms are one-second
   windows built so that nobody falls; twelve of the sixteen are clean and the four that are not are named in §8.
2. **None of the roll row's error is the gains, and that is an identity rather than a measurement.** The cost weights
   enter `design` only through `q`, hence only through `k`; `Φ` and `Γ` come from `continuousPlant`/`discretise` on
   the plant alone [R]. So at a fixed state **and** a fixed command the four cost arms' roll rows are one number:
   **peak difference exactly 0 across all four designs, at every one of 72 339 live ticks of all 816 runs, and
   `|ΔΦ|`, `|ΔΓ|` exactly 0 too** [M, P1 as written before it ran]. **Whatever moved the row in
   Part 2, it was not a better model.**
3. **And almost none of it is the gains at a matched window either.** On the one-second window where both arms hold
   **exactly the same 1 152 ticks at exactly the same times and nobody falls**, the shipped plant's roll row moves
   **9.774 → 9.418** (per-run median, ×0.964) and **10.663 → 9.607** (geometric mean over ticks, ×0.901) — against
   **10.050 → 2.622** (×0.261) at nine seconds. **In log terms 91–97 % of Part 2's headline is not the gains** [M].
   Part 2's own one-second control said this (×1.04) and this Part reproduces its numbers **to the digit** and says
   what the other 91–97 % is.
4. **It is the ride's own LENGTH, and not which states the ride visits.** Over five independent binnings the
   **composition** term — the arm's own distribution over states — carries **0.4–16 %** of the nine-second move on
   the glide, and the error's own denominator barely moves (`|the game's roll acceleration|` **159.7 → 166.9 °/s²**)
   while the **absolute** error halves (1 362.7 → 681.4 °/s²) [M]. Dropping every run's last 0.3 s changes nothing
   (×0.318 against ×0.309). Cutting both arms to the same clock time takes ×0.309 to ×0.533; cutting them to a window
   nobody falls in takes it to ×0.901. **Part 2's "the arm without a body only rides somewhere gentler" is refuted as
   written: the states are not gentler, the ride is longer.**
5. **Because the roll row's error is not one number. It is 6–11× in a ride's first second and 1.0–2.4× after a second
   and a half — on the same runs.** Geometric means by the ride's own age, unsteered deck: the weighted arm reads
   **6.75 / 10.67 / 9.17 / 12.54** over 0.2–1.0 s and **4.55 / 1.82 / 1.89 / 2.33 / 1.37 / 1.53** over 1.0–5.0+ s
   [M]. **And it is not survivorship**: taking only the **19 runs that live past 3 s** and reading their own profile
   from 0.2 s gives **6.46 / 9.76 / 9.50 / 10.88** then **3.92 / 1.34 / 1.84 / 2.33 / 1.37 / 1.53**, and the
   `plant` arm's 14 such runs give **6.60 / 10.80 / 10.77 / 6.26** then **3.06 / 1.98 / 2.37 / 2.26 / 1.63 / 1.05**
   [M]. ***Six rounds have reported "the model's roll row is wrong by ten times" from a population that is almost
   entirely the first second of a placed ride, because almost every arm this folder has measured died inside 1.5 s.***
6. **Per source: three cells, three different owners — and the glide, the only cell this folder has been measuring,
   is the only one the water owns.** The share of ticks on which each gap is the largest of the five [M, 40 arms,
   both plants]: **the water 0.585–1.000 on the glide, 0.317–0.410 on the owner's own low-speed cell, 0.250–0.438 on
   a turn**; **the ankle 0–0.148 on the glide and 0.256–0.475 on the low cell** — where its size, **2 227–5 624
   °/s²**, is two to five times its size anywhere else; **the model's own remainder 0–0.297 on the glide and
   0.292–0.688 on the turn.** *Six rounds have hunted the water because six rounds have only measured glides.*
7. **And on the glide the row is the small difference of two gaps of opposite sign, which is why repairing one term
   at a time has moved nothing.** The water's gap is **3.20–4.21× the net error** and the remainder's
   **2.11–2.46×**, and **their signs are opposite in 86.1–99.4 % of the shipped plant's glide ticks** [M]. On the
   **two-body** plant the same two gaps are opposite in only **43.2–59.2 %** — near a coin — **so the knife-edge is
   the shipped plant's, not the problem's.** On the turn: shipped 69.2–89.5 %, two-body 64.0–75.4 %. **A net that is
   the difference of two terms each three times itself moves by most of whatever you fix, in whichever direction the
   cancellation leaves.**
8. **The brief's own measurement, taken literally, overstates the loop's part about five times, and a read made
   before the arms ran said it would.** Substituting each gain set's own command into one recorded ride — the same
   states, the same plant, the same game row — moves the roll row **10.658 → 6.003 (×0.563)** on the one-second
   window and brings it closer in **95 % of ticks** [M]. But the game's own roll row answers the same ankle rest at
   **0.84× the model's rate** (instantaneous authority: model 62 313 vs game 49 819 °/s² per rad, per-tick ratio
   median **1.19**, span 0.17–2.36) [M], so a two-sided change moves both rows together and the one-sided reading
   books the whole of it as error. From that ratio alone the overstatement is **1/(1 − 1/1.19) = 6.3×**; measured
   against the ridden ×0.901 it is **5.5×** [A]. **The direction was written into the probe's own docstring before any
   arm ran; the factor was not.**
9. **The loop's own reach is real but bounded, and on the owner's cell it is almost gone because the ankle is
   saturated.** The command's own half of the model's roll row is **7–27 % of the model's row and 37–101 % of the
   game's whole roll acceleration**, and the swing another gain set's command makes is **18–78 % of the roll row's own
   net error** [M]. On the owner's own low-speed cell the ankle's command **sits on its 0.25 rad bound in 71–86 % of
   ticks** — so there the gains cannot move the ride much whatever they are, which is Part 2's own low-cell result
   from the other side.
10. **Three of my own seven predictions are refuted, including both of the two that mattered.** P3 (the loop's reach
    under half the game's row) is refuted — the swing is 1.7–7.9× it. P4 ("the water carries at least half the net")
    is refuted in shape, not direction — it carries **210–420 %** of the net, and so does the remainder with the
    opposite sign. P5 (the composition term carries more than half) is refuted as a decomposition — it carries
    0.4–16 % — **while the conclusion it pointed at, that the trajectory owns the move, is upheld by the right
    instrument**: the ride's length, which a state binning cannot see.

## 1. (A) The four reads that had to come first

**R1 [R]. The cost cannot reach the plant, so the brief's "a fixed trajectory, several sets of gains" is an identity
before it is a measurement.** `design` builds `phi` and `gamma` from `continuousPlant(y, t)` and `discretise` alone;
`feetReach`, `captureScale` and `captureOmega` enter only the state-cost `q`, and `q` enters only `dlqr`, hence only
`k`; the filter gain `l` comes from `processNoise`, `senseNoise` and `bias` [R, `predictiveBalance.ts:985–1092`]. The
roll row is `(Φ[1]·x + Γ[1]·u − φ̇)/h`. **So at a fixed `x` and a fixed `u` the four cost arms' rows are the same
number by construction**, and the only question a fixed trajectory can answer is how much the gains move `u`. §2 reads
that identity at every tick anyway, because this folder has had a value fall through a type guard before.

**R2 [R]. The commands reach nothing instantaneously, on either side, and they reach it through the same lag.** `B`
is zero in every entry but `B[8][0] = B[9][1] = 1/lag` [R, `continuousPlant`] — measured as well as read: **`max |B|`
over every other entry is exactly 0 at all 72 339 live ticks** [M]. And the game's own `ankleRest` follows the
commanded lean through `MOTOR_LAG = 0.05 s` while the model's `PREDICT_LAG` is **0.05 s** [R, two files, one number].
**So the authority that is comparable on the two sides is the one per radian of the ankle's commanded REST, not per
unit of command** — and the first version of §4's read was in the wrong frame, compared a step-averaged `Γ[1][0]/h`
with an instantaneous `ankleDeck × 800`, and said the model understated the game by thirteen times. **It does not;
that was this folder's twenty-fifth frame error in a fortnight and it was caught by writing the frame down.**

**R3 [R]. The ankle's stiffness is one number in two files.** `HUMAN_ANKLE_STIFFNESS = 800` [R, `humanBalance.ts:50`]
and `YawPlant.ankleStiffness = 800` [R, `rollModel.ts:164`], and `AttachedRider.setAnkle` uses the first on the
commanded rest [R, `:3536`]. So `ankleDeck × 800` is the game's own roll response per radian of rest with no constant
guessed.

**R4 [R]. The matched map between the model's groups and the ledger's sources is a partition on both sides.** The
model's roll row splits exactly into six zeroable groups plus a named remainder (`without`, 3.3o's instrument 4) and
the game's into the ledger's twenty-three sources. The map used here is: the model's three water groups ↔ the
ledger's eight hull/foil/froth/added-mass sources **plus** the board's own weight and gyro (the model has no separate
term for either); `ankle` ↔ `ankle`; `twist` ↔ `twist`; the model's remainder ↔ every other rider source
(`gravity`, `carry`, `riderWater`, `assist`, `leg`, `swing`, `hand`, `pitch`, `drive`, `limbs`, `yawCouple`); and the
model's `feetForward` group ↔ **nothing**, so it is reported unmatched rather than folded in. Both partitions' closure
is read, not asserted (§10 C3).

## 2. (B) P1: at a fixed state and a fixed command the roll row cannot see the gains

| **[M]** over 72 339 live ticks of 816 runs, forty arms | peak |
|---|---|
| `max` over the four cost arms of `\|Φ_arm − Φ_off\|` and `\|Γ_arm − Γ_off\|`, **and** against the exact-point plant the groups are built on | **exactly 0** |
| `max` over the four cost arms of `\|the model's roll row\|` with the **recorded** state and the **recorded** command | **exactly 0 °/s²** |
| `max \|B\|` over every input entry but the two muscle-lag rows' | **exactly 0** |

**Two readings.**

1. **The brief's measurement, taken as written, has one answer and it is zero.** "The roll row per source against the
   game at a fixed trajectory, several sets of gains" is, for the row itself, four readings of one number. **So no
   part of Part 2's 10.050 → 2.622 is the model being better**, and the question becomes which of the two remaining
   routes — the command, or the trajectory — carries it. §3 and §5 are those two routes.
2. **It is worth having read rather than argued.** 3.4a's own first build had a `captureOmega` value fall into a
   default arm, and Part 2's §10 C4 was built for exactly that. This is the same check one level up, and it is the
   cheapest one in the round.

## 3. (B) The roll row PER SOURCE — no source owns it, and the ownership changes on a turn

Each gap is the model's own matched term minus the game's, °/s², at the controller's **exact** point so that the five
gaps are a partition of `rollAccFull − rollAccGame`; the median is of `|gap|` over the arm's own live ticks, pooled
per arm over per-run medians. The datum is the model's own sign (`−deck[src] · DEG`, + leaning the body and rolling
the deck toward the board's +x), the bank ledger's own [R].

| **[M]** median `\|gap\|`, °/s², shipped plant | water+board | ankle | twist | remainder | feetFwd (no game source) | the NET error | water's share of `\|net\|` | remainder's | water the largest in |
|---|---|---|---|---|---|---|---|---|---|
| **glide**, unsteered 24, shipped cost | **6 197.0** | 906.2 | 134.3 | **4 029.8** | 87.0 | **1 647.1** | **3.40** | **2.11** | 0.86 |
| … + the two weights (`point`) | 2 669.2 | 837.3 | 125.3 | 2 069.1 | 43.2 | 738.1 | 3.40 | 2.33 | 0.69 |
| **glide, the one-second window** (nobody falls), shipped cost | **6 434.3** | 801.8 | 124.1 | 3 704.2 | 72.2 | 1 415.3 | **3.75** | 2.38 | **1.00** |
| … + the two weights | 5 116.7 | 771.5 | 84.2 | 2 979.6 | 38.9 | 1 140.4 | 3.83 | 2.18 | 1.00 |
| **the TURN**, steered 18, shipped cost | 2 358.5 | **1 142.7** | 81.0 | **2 422.4** | 27.7 | 845.7 | 3.14 | **3.17** | **0.32** |
| … + the two weights | 2 763.2 | **1 445.5** | 39.2 | **2 796.1** | 41.2 | 1 178.1 | 2.31 | **3.45** | **0.41** |
| **the turn's one-second window** (nobody falls), shipped cost | 3 054.6 | 763.5 | — | 2 416.8 | — | 839.5 | — | — | **0.44** |
| … the same with `plant`'s constant | 2 113.3 | 1 010.8 | — | **2 867.1** | — | 1 161.3 | — | — | **0.25** |
| the game's own side, glide / turn | 439–1 541 | 1 846–3 544 | **0.0 everywhere** | 1 613–2 193 | — | — | — | — | — |

The spans quoted in the readings below are over **all** the arms of each cell group (16 glide, 8 low, 16 turn), not
over the rows of this table, which are one arm each and are shown so the sizes are visible.

| **[M]** the same five on the **two-body** plant, scored on the same ticks | water+board | remainder | ankle | the NET |
|---|---|---|---|---|
| glide, unsteered, shipped cost | 2 949.9 | **765.9** | — | 1 477.7 | 
| glide, the one-second window | 2 861.1 | **613.8** | — | 1 283.5 |
| **the turn**, steered, shipped cost | 1 278.0 | **1 404.8** | — | 762.7 |
| the turn's one-second window, ridden two-body | 2 939.7 | 2 509.7 | **1 103.7** | 1 119.1 |
| … + the two weights (8 of 18 fell inside the second, so this row is not a clean window) | 1 740.8 | 2 585.3 | **2 184.5** | 1 329.5 |

**Six readings.**

1. **The roll row is the small difference of two large gaps of opposite sign, and that is why six rounds of repairing
   one term at a time have moved nothing.** On the shipped plant's glide the water's gap is **3.20–4.21× the net**
   and the remainder's **2.11–2.46×**, and **their signs are opposite in 86.1–99.4 % of ticks** [M, 16 arms]. A row
   whose two biggest errors each exceed its own net by three times, and cancel, moves by the *difference* of whatever
   you fix — so a 20 % repair of the water's term moves the net by 60–80 % of itself, in whichever direction the
   cancellation leaves. **This is 3.3p's conditioning argument measured per source instead of inferred from a
   ratio** — and on the **two-body** plant the same two gaps are opposite in only **43.2–59.2 %**, so **the
   knife-edge belongs to the shipped plant and not to the question.**
2. **Three cells, three owners, counted per tick** — the share of ticks on which each gap is the largest of the five
   [M, 40 arms, both plants]:

   | | the water's twelve derivatives | the ankle | the model's own remainder |
   |---|---|---|---|
   | **the glide** (unsteered + its window, 16 arms) | **0.585–1.000** | 0–0.148 | 0–0.297 |
   | **the owner's own low-speed cell** (8 arms) | 0.317–0.410 | **0.256–0.475** | 0.105–0.228 |
   | **a commanded TURN** (steered + its window, 16 arms) | 0.250–0.438 | 0–0.313 | **0.292–0.688** |

   **The owner's fall is a bottom turn, and on a turn the suspect is not the water**: it is gravity through the
   feet, the pendulum's own `g/L`, the inertias and the pure kinematics — the model's own **remainder**, the one
   term `without` cannot zero and six rounds have never separated. **And on the owner's own slow cell it is the
   ankle**, whose gap there is 2 227–5 624 °/s² against 761–1 121 on the glide, which is §4 reading 3 from the
   other side.
3. **The ankle's own gap is 761–1 121 °/s² on the glide, 764–2 641 on the turn and 2 227–5 624 on the owner's own
   low-speed cell** [M, 40 arms] — and on the low cell it is the largest of the five gaps on a quarter to a half of
   ticks. Part 1 §6 reading 3 measured the two-body plant understating the ankle's authority over the **lean** by
   three to five times; this is the same joint showing up on the **roll** row, biggest exactly where the owner's bar
   is and where §4 reading 3 finds the command saturated and the game answering five times harder than the model.
4. **The two-body plant halves the remainder's gap on the glide and does not on the turn.** 766 and 614 against the
   shipped plant's 4 030 and 3 704 on the glide; **1 405 against 2 422** on the turn [M]. So Part 1's gain on the
   body's half shows in the roll row's remainder too — on a glide.
5. **`twist` is zero on the game's side at every tick of every arm** (the ledger's `twist` source reads 0.0), while
   the model's twist group carries 39–142 °/s². That is the model answering for a source the game has none of in
   these cells; it is small and it is reported rather than netted.
6. **The partitions are exact and read**: the ledger's own twenty-three-way split of its roll row closes to
   **4.1 × 10⁻¹¹** relative and the five gaps' partition of the net to **3.4 × 10⁻¹¹** (3.6 × 10⁻¹¹ on the two-body
   plant), peak over every live tick of every one of the forty arms [M].

## 4. (B) The half of the roll row the gains can reach, and the ankle rest's authority on both sides

| **[M]** per-run medians, spans over the arm's runs | glide 24 | the owner's low cell 18 | the turn 18 | the glide's one-second window 24 |
|---|---|---|---|---|
| the command's own half of the model's roll row, °/s² | 95.5 | **460.6** | 137.2 | 88.1 |
| … as a share of the **model's** row | 0.069 | 0.133 | 0.152 | 0.070 |
| … as a share of the **game's** whole roll acceleration | **0.575** | 0.371 | 0.649 | 0.622 |
| the swing another gain set's command makes, over the roll row's own **net error** | 0.299 (0.209–0.764) | 0.233 (0–0.512) | **0.777 (0.533–1.371)** | 0.391 (0.203–1.379) |
| the ankle's own 0.25 rad bound: a command sits **on** it in | 0.36 | **0.71–0.86** | 0.40 | 0.12 |
| the ankle rest's **instantaneous** authority over the roll row, °/s² per rad — the model's | 62 989 | 37 113 | 56 918 | 62 313 |
| … the **game's** own (`\|ankleDeck × 800\|`) | 56 952 | **188 472** | 63 107 | 49 819 |
| … the per-tick **ratio**, model/game, median (span) | 1.019 (0.12–2.36) | **0.601 (0.09–3.55)** | 0.859 (0.09–2.42) | **1.19 (0.17–2.36)** |
| the zero-order hold's own attenuation on the model's side (`Γ[1][0]/h` over `A[1][8]`) | 0.053 | 0.068 | 0.065 | 0.055 |

**Four readings.**

1. **The command's own half is a fourteenth of the model's row and two thirds of the game's whole roll
   acceleration.** That is the shape of the row: dominated by state terms that nearly cancel (§3), with a command
   term small against those terms and large against the thing being predicted. So the loop's reach into the row is
   real — **18–78 % of the row's own net error, 53–137 % on the turn** — and it is not the whole of it.
2. **The two sides answer the ankle's commanded rest at within a factor of two of each other, in both directions.**
   Per-arm median ratios **0.420–1.557** across the forty arms, per-tick spans **0.087–2.4** (one arm's per-tick
   peak is 186, printed and not used) [M]. The structures match by
   construction — both have a first-order 0.05 s lag then the same 800 N·m/rad spring (§1 R2, R3) — and the sizes
   match to about a factor of two. **So a command change moves the game's roll row almost as much as the model's,
   which is exactly why §5's one-sided substitution overstates the loop's part.**
3. **On the owner's own low-speed cell the game answers the rest FIVE times harder than the model does** (188 472
   against 37 113 °/s² per rad) **and the ankle's command is on its bound in 71–86 % of ticks** [M]. Two facts that
   belong together: at the speeds of getting into position the balance is asking for more ankle than it has, and the
   board answers what it does get five times more than the model expects. **Neither is a gain the gains can fix.**
4. **The medians are not each other's quotient and are printed separately for that reason.** The low cell's
   per-tick ratio median is 0.601 while 37 113 / 188 472 is 0.197; a median of ratios is not a ratio of medians, and
   this folder has published the second as the first before.

## 5. (B) The brief's own measurement: one recorded ride, four sets of gains

The same recorded ticks — the same states, the same plant, the same game row — with each cost arm's **own** command
substituted: `u_arm = ref.u − b̂ − K_arm (x̂ − ref.x)`, the controller's own line [R], the ankle clamped to the rider's
own `ankleRoom`. The ride's own arm's entry is the row itself by construction, and that is read: **`subst_off`
equals `relFull` and `substSign_off` equals `rollSignFull` in 24 of 24 runs** [M].

| **[M]** the shipped arm's own recorded ticks, geometric mean of `\|rollRel\|` | off | point | fixed | plant | off→point |
|---|---|---|---|---|---|
| **the glide's one-second window** (nobody falls, 1 152 ticks) | **10.658** | **6.003** | 6.003 | 6.810 | **×0.563** |
| the glide, nine seconds (1 529 ticks) | 9.737 | 5.746 | 5.746 | 6.287 | ×0.590 |
| … the substituted command brings the row **closer** in | — | **0.950** | 0.950 | 0.960 | — |
| … the **lean** row, median, over the same ticks | 3.190 | **5.822** | 5.822 | 4.916 | ×1.82 **worse** |
| **ridden**, the same window, the same two arms | 10.663 | **9.607** | 9.607 | — | **×0.901** |

**Four readings.**

1. **The brief's measurement says the command is worth ×0.563 and riding it says ×0.901.** The one-sided
   substitution **overstates the loop's part by 5.5×** in log terms. §4 reading 2 is why: the game's own row answers
   the same rest at 0.84× the model's rate on this arm, so a two-sided change moves both rows and only the
   difference is error. **From the authority ratio alone the predicted overstatement is `1/(1 − 1/1.19) = 6.3×`** [A,
   on two measured numbers, assuming the two sides' step attenuation is alike, which this round cannot measure];
   **measured 5.5×.** The direction was written into the probe's docstring before any arm ran; the factor was not.
2. **It is systematic, not noise**: the substituted command brings the roll row closer in **95 % of ticks** and the
   sign right more often (0.354 → 0.500 ridden; 0.604 → 0.688 on the turn's window) [M]. So the loop's part is small
   and real rather than absent.
3. **`fixed` is `point` byte for byte on the shipped plant, in this instrument too** — identical to every printed
   digit in all twenty arms and both windows, which is Part 2's C5 reproduced on a new column [M].
4. **And the same substitution makes the LEAN row 1.8× worse.** 3.190 → 5.822 on the glide's window, 3.352 → 5.069
   at nine seconds [M]. **The gains that buy the board's row cost the body's**, which is the trade this folder has
   measured a dozen times and the owner has now felt from the other side.

## 6. (B) The ridden comparison, matched — and the result for the plant the owner rides

| **[M]** geometric mean of `\|rollRel\|` over ticks, off → point | the whole arm | the **one-second window, nobody falls** | the share of the move that survives the window |
|---|---|---|---|
| **the glide, the SHIPPED plant** | 9.725 → 3.004 (**×0.309**) | 10.663 → 9.607 (**×0.901**) | **8.9 %** |
| **the glide, the TWO-BODY plant** | 9.513 → 2.656 (×0.279) | 8.452 → 3.305 (**×0.391**) | **73.6 %** |
| **the turn, the SHIPPED plant** | 3.814 → 3.471 (**×0.910**) | 3.922 → 3.601 (×0.918) | 90.7 % of a move that is 9 % |
| **the turn, the TWO-BODY plant** | 2.346 → 1.703 (**×0.726**) | 1.650 → 1.293 (**×0.784**) | **76.0 %** |

And the per-run medians, which are Part 2's own column and reproduce it to the digit: shipped glide **10.050 →
2.622**, its one-second window **9.774 → 9.418**; two-body glide **9.087 → 2.259**, its window **6.512 → 2.944**.

| **[M]** the shift–share over state bins, shipped plant's glide, off → point | composition (which states) | within-bin (the same state) |
|---|---|---|
| all ticks, five binnings (game's row / rail / cond / time / time × row) | −9.1 %, 2.3 %, 9.1 %, 16.1 %, 8.5 % | 109.1, 97.7, 90.9, 83.9, 91.5 % |
| the arms' common clock time (t ≤ 1.933 s), the same five | 12.1, 4.3, 7.3, 16.2, 9.7 % | 87.9, 95.7, 92.7, 83.8, 90.3 % |
| every tick more than 0.3 s before its own run's end | 3.7, 0.6, …  | 96.3, 99.4, … |
| the **turn**, all ticks (the composition term **exceeds** the whole move and the within-bin term is **positive**) | 164–806 % | **−64 to −706 %** |

**Six readings.**

1. **On the shipped plant the roll row's gain is the ride's own length: 91 % of it goes when both arms are given the
   same second.** ×0.309 over nine seconds and ×0.901 over a window nobody falls in. Part 2 said this (×1.04) and
   this Part reproduces its figures exactly and measures what the rest is.
2. **It is NOT which states the arm visits.** The composition term is **0.4–16 %** in five independent binnings;
   the error's own denominator is unchanged (159.7 → 166.9 °/s²); and the **absolute** error halves, 1 362.7 → 681.4
   °/s² [M]. **Part 2's own words — *"the arm without one only rides somewhere gentler"* — are refuted as written.**
3. **And the shift–share is the wrong instrument for this question, which is a finding about method.** It books the
   ride's own LENGTH into its within-bin term, because the arms' tick populations differ in age inside every state
   bin and the roll row's error depends on age (§7). A state binning cannot see that. **The window nobody falls in
   is the instrument; the shift–share agrees with it only once the window is imposed.** I report the shift–share
   because I ran it, and I do not rest the answer on it.
4. **On the plant the owner rides, better gains DO buy the board's row — and that is this round's one positive
   result.** Two-body glide **×0.391** and two-body turn **×0.784** on windows nobody falls in, against the shipped
   plant's ×0.901 and ×0.918 [M]. **74–76 % of the two-body plant's gain survives the window; 9 % of the shipped
   plant's does.** Part 2's ×2.21-against-×4.02 split by plant, confirmed from an independent re-run and extended to
   the turn.
5. **And on the turn the two-body plant's roll row is TWICE as accurate as the shipped plant's before any gain
   change**: geometric mean **1.650–2.346 against 3.814–3.922**, and its lean row **0.889 against 5.968** [M]. The
   owner's *"doesn't look like a stick"* is the lean row; this is the same plant's board row on the manoeuvre they
   fall on. **Nothing in this round is an argument for reverting the two-body plant and this row is the opposite.**
6. **On the turn the shipped plant's gains push the row the WRONG way at a matched state.** The within-bin term is
   **positive** in every binning (−64 to −706 % of a move that is itself only ×0.91), so what little the turn's row
   gains is the states visited and the command alone makes it worse [M]. **On the shipped plant there is nothing for
   the gains to buy on a turn.**

## 7. (B) The roll row's error is not one number — the ride's own age, and the survivorship control

Geometric means of `|rollRel|` by the tick's own time in the ride, per arm, with every bin's population printed.

| **[M]** the GLIDE, unsteered deck | 0.2–0.4 | 0.4–0.6 | 0.6–0.8 | 0.8–1.0 | 1.0–1.5 | 1.5–2.0 | 2.0–3.0 | 3.0–4.0 | 4.0–5.0 | 5.0+ |
|---|---|---|---|---|---|---|---|---|---|---|
| shipped cost (n per bin 264–401; the arm ends at 1.1–2.07 s) | 8.16 | 8.68 | **15.90** | 11.33 | 6.53 | 15.18 *(n=63)* | — | — | — | — |
| + the two weights, `point` (n 264–1 154) | 6.75 | 10.67 | 9.17 | **12.54** | 4.55 | **1.82** | **1.89** | 2.33 | **1.37** | 1.53 |
| … `plant` | 7.62 | 12.34 | 10.61 | 7.47 | 4.19 | 2.99 | 2.67 | 2.26 | 1.63 | **1.05** |
| **the survivorship control**: only `point`'s **19 runs** that live past 3 s, read from their own 0.2 s | **6.46** | 9.76 | 9.50 | 10.88 | 3.92 | **1.34** | 1.84 | 2.33 | 1.37 | 1.53 |
| … only `plant`'s **14** such runs | **6.60** | 10.80 | 10.77 | 6.26 | 3.06 | 1.98 | 2.37 | 2.26 | 1.63 | 1.05 |
| **the TURN**, steered deck, shipped cost (n 198–620) | 3.84 | 3.53 | **2.88** | 5.82 | 5.28 | 6.08 | 3.22 | 1.44 | — | — |
| … + the two weights | 3.46 | 2.94 | **2.29** | 6.76 | 4.89 | 3.90 | 1.13 | — | — | — |

**Five readings.**

1. **On a glide the roll row's error falls from six-to-sixteen times to one-to-two times with the ride's own age, and
   it is not survivorship.** The same 19 runs that live past three seconds are wrong by **6.46–10.88×** in their own
   first second and **1.34–2.33×** after a second and a half; `plant`'s 14 such runs read 6.60–10.80 then 1.05–2.37
   [M]. ***So "the model's roll row is wrong by ten times" is a statement about the first second of a placed ride,
   and this folder has made it six times from a population that was almost nothing else.***
2. **On a TURN there is no age profile at all: 1.4–6.1× throughout.** So the first second's blow-up is the glide's,
   not a ride's [M]. **And the turn's row is two to four times better than the glide's first second from the start.**
3. **None of the four diagnostics I carry tracks the profile.** Per bin, over the glide's own ten bins: the command's
   share of the game's row is 0.42–1.32 with no trend, the water's gap over the net 1.2–6.2, the remainder's 1.3–6.1,
   and the game's own near-cancellation 2.3–6.4 except where the shipped arm is falling (12.5, 48.4) [M]. **I have
   the fact and not the mechanism, and I am not going to supply one.** §13 makes it step four's first job.
4. **The shipped arm's own last bin is its worst** (15.18 on 63 ticks at 1.5–2.0 s), which is 3.3p's `rollRelLate`;
   but dropping every run's last 0.3 s moves the nine-second comparison from ×0.309 to ×0.318 [M], **so the death
   throes are not the explanation either.** It is the first second that is different, not the last.
5. **The populations are printed because two of these bins are thin.** The shipped arm's 1.5–2.0 s bin is 63 ticks
   and `point`'s 5.0+ bin is 82; nothing above rests on either, and the survivorship control's own bins are 154–1 140.

## 8. (B) The owner's bar

| **[M]** median s, every arm, deck filter | shipped plant: off → point → fixed → plant | two-body plant: off → point → fixed → plant |
|---|---|---|---|
| **the owner's own low speed, 18 runs** | **1.033** → 1.267 → 1.267 → 1.217 | **1.033** → **0.850** → 0.850 → 0.883 |
| the glide, 24 | 1.183 → 4.317 → 4.317 → 4.000 | 1.450 → 4.050 → 3.950 → 3.933 |
| the turn, 18 | 3.067 → 1.967 → 1.967 → 2.033 | **2.500 → 1.300 → 1.300 → 1.667** |
| **Compress, every nine-second cell** | **6 of 6 / 8 of 8 in all four** | **6 of 6 / 8 of 8 in all four** |
| **every nine-second ride, every arm** | **480 of 480 ended before nine seconds; Compress 160 of 160** | — |

**Every one of those twelve medians is Part 2 §6's own figure to the digit**, including the two-body turn's
2.500 / 1.300 / 1.300 / 1.667, which Part 2 published and this round re-rode on a fresh tree (§10 C1).

**Three readings.**

1. **The bar is not met and no arm of this round comes near it.** **480 of 480 nine-second rides ended before nine
   seconds and Compress fell in 160 of 160** [M], over twenty-four nine-second arms on two plants. The sixteen
   one-second arms are windows built so that nobody falls — **they are an instrument, not a result, and they are
   never counted as rides that survived.** Twelve of the sixteen are clean (0 of 18 or 0 of 24); **four are not**:
   `two-point`, `two-fixed` (8 of 18) and `two-plant` (4 of 18) fall inside the **turn's** own second, and
   §6 reading 4's two-body turn figure carries that caveat on its face.
2. **Nothing in this round was built to move the fall.** It is a measurement round with no source change: §9's own
   first line.
3. **And the owner's own cell has a mechanical reason the gains cannot help it**, measured here and not inferred:
   the ankle's command sits on its 0.25 rad bound in **71–86 % of ticks** there, and the game answers the rest
   **five times** harder than the model expects (§4 reading 3).

## 9. What I refuted

- **The brief's own framing, as an experiment.** *"The roll row per source against the game at a FIXED trajectory —
  one recorded ride, several sets of gains."* At a fixed state **and** command the row is one number in all four
  gain sets, exactly, at 72 339 of 72 339 live ticks (§2). **So the experiment as named has no variance in it**, and
  the version that does — substituting each gain set's own command — **overstates the loop's part 5.5 times**,
  because the game's own roll row answers the same ankle rest at 0.84× the model's rate (§5 reading 1).
  **Twenty-eighth consecutive round to find its brief's premise wrong, and eighth to find it in the half the brief
  called settled** — here the half that called the measurement well posed.
- **Part 2's own §7 reading 2, in its stated mechanism.** *"The arm without a body only rides somewhere gentler."*
  The states are **not** gentler: the composition term over five state binnings is **0.4–16 %**, the error's own
  denominator is unchanged (159.7 → 166.9 °/s²), and the **absolute** error halves (1 362.7 → 681.4 °/s²). **The arm
  rides LONGER, and the roll row's error is six to eleven times in a glide's first second and one to two times after
  a second and a half** (§7). Part 2's conclusion holds; its reason does not.
- **"The model's roll row is wrong by ten times."** It is wrong by **6–11×** in the first second of an unsteered
  glide, **1.0–2.4×** after a second and a half **on the same runs** (19 and 14 runs, survivorship controlled), and
  **1.4–6.1× with no age profile at all on a commanded turn** (§7). Six rounds have carried one number for three
  different quantities, because almost every arm this folder has measured died inside 1.5 s.
- **"The roll row's residue is one thing to find."** On the shipped plant's glide it is the difference of two gaps,
  the water's at **3.20–4.21× the net** and the remainder's at **2.11–2.46×**, with **opposite signs in 86.1–99.4 %
  of ticks** (§3) — and **which of the five is biggest depends on the cell**: the water owns the glide (largest in
  0.585–1.000 of ticks), the **ankle** the owner's own low-speed cell (0.256–0.475, with a gap two to five times its
  size anywhere else), and the model's own **remainder** the turn (0.292–0.688) [M, 40 arms, both plants]. **Six
  rounds have hunted the water because six rounds have only measured glides.**
- **My own P3**, that the loop's reach would be under half the game's row: the swing another gain set's command
  makes is **1.7–7.9× the game's whole roll acceleration** and **18–137 % of the roll row's own net error**.
- **My own P4**, that the water would carry *at least half* the net error: it carries **210–420 %** of it, and the
  remainder carries 210–345 % with the opposite sign. **The prediction had the wrong shape, not the wrong
  direction** — the water is still the largest single gap on the glide.
- **My own P5**, that the composition term would carry more than half: it carries **0.4–16 %**. And the conclusion it
  pointed at — that the trajectory owns the move — **is upheld by a different instrument**, the window nobody falls
  in. **A shift–share over state bins cannot see the ride's own length, and it books it into the within-bin term.**
  That is a methodological refutation of my own method, and it is why §6 reading 3 exists.
- **My own first version of §4's authority read**, within the hour and before any arm ran: it compared a
  step-averaged `Γ[1][0]/h` with an instantaneous `ankleDeck × 800` and said the model understated the game
  thirteen-fold. The right comparison is per radian of the **rest state**, `A[1][8]` against `ankleDeck × 800`, with
  the same 0.05 s lag behind both sides [R, two files], and it is **1.019 rather than 0.076**.

## 10. What I will not claim

- **I will not claim the bar is any closer.** 480 of 480, Compress 160 of 160, and the owner's own cell at 1.033 s
  shipped against 0.850 at worst.
- **I will not claim a mechanism for the glide's first second.** The fact is measured and survivorship-controlled;
  none of the four diagnostics I carry — the command's share, the water's gap over the net, the remainder's, the
  game's own near-cancellation — tracks it (§7 reading 3). **I have a fact and I am not going to supply a cause.**
- **I will not claim the two-body plant's gain on the roll row is a repair.** 74–76 % of it survives the window,
  which is Part 2's finding confirmed; but the two-body turn's own window is **contaminated by falls in three of its
  four arms** (§8 reading 1), and the glide's ×0.391 is one cell.
- **I will not claim which of the two per-source gaps to fix.** They cancel; fixing either alone moves the net by
  two to four times the fix, in a direction the cancellation chooses.
- **I will not claim the one-sided substitution is the loop's share.** It is an upper bound on it, over by about
  5.5× on the one arm where I can compare it with a ride, and the factor depends on the cell (the authority ratio's
  own per-arm medians span **0.420–1.557**).
- **I will not claim anything from the turn's two-body window as a ride**, for the reason above, and **no bot ride
  is offered as evidence of feel anywhere in this document.**
- **I will not propose reverting the two-body plant.** Part 1 measured its lean row better in 96 of 96 runs, the
  owner felt it (*"doesn't look like a stick but an actual human movement"*), and this round measures its roll row on
  the turn at **half** the shipped plant's error and its lean row at a sixth. **Where this round favours the shipped
  plant on anything, that is a statement about the roll row's instrument, not about the body.**
- **Carried, flagged, not mine, not touched**: `steadyTurn`'s `ref.u[0]` at 2 675°; the `cos³` added-mass frame
  defect; `AttachedRider.frame`'s 70° bank clamp at three sites; the live point-mass `ω₀` in `HumanBalance.capture`
  (right for the game's own point-mass rider, wrong the day Part 1 §8 item 3 lands); the game's own rider as two
  bodies.

## 11. The controls

**C1, the whole of Parts 1 and 2 reproduced on this tree, which is what makes every comparison above a comparison.**
Shipped plant, the five arms: roll row **10.050 / 2.725 / 4.035**, lean row **3.540 / 3.833 / 8.298**, bank-rate
residual **2.552 / 4.620 / 5.131**, roll sign **0.338 / 0.579 / 0.605**, falls **1.183 / 1.033 / 3.067 s**; the
one-second window **9.774 → 9.418** roll, **3.190 → 4.650** lean, **0.354 → 0.500** sign; the two-body plant
**9.087 / 1.638 / 1.097 / 0.321 / 1.450 s**, its window **6.512 → 2.944** roll and **1.301 → 0.740** lean, its turn
**2.500 → 1.300 → 1.300 → 1.667 s**; and `relTwo` on the shipped ride **10.066** — **every one 3.3p's, Part 1's or
Part 2's published figure to the digit** [M].

**C2, the state is a read.** The reconstruction pushed back through the controller's own `C`: **peak over every tick
of every one of the 816 runs exactly 0**; tick spacing **exactly 0** off `CONTROL_STEP`; the ledger's own closure and
residual **exactly 0** [M].

**C3, every partition read rather than asserted.** The ledger's twenty-three-way split of its own roll row closes to
**4.1 × 10⁻¹¹** relative; the five matched gaps' partition of the net to **3.4 × 10⁻¹¹** (shipped) and
**3.6 × 10⁻¹¹** (two-body); the model's own six groups plus remainder to **1.6 × 10⁻¹²** — peaks over every live
tick of every arm [M].

**C4, P1 as an identity, read at every tick** (§2): `|ΔΦ|`, `|ΔΓ|` and the roll row's own difference across the four
cost arms **exactly 0**, and `max |B|` outside the two muscle-lag rows **exactly 0**.

**C5, 3.4a's zero-inertia control still exact**: the control plant's own `A` against the shipped plant's,
**1.2 × 10⁻¹⁴** peak over its row's largest, and its roll row's relative error **1.2 × 10⁻¹⁰** [M].

**C6, the substitution's own arm is the row itself.** `subst_off` equals `relFull` and `substSign_off` equals
`rollSignFull` in **24 of 24 runs**, by construction and read [M].

**C7, the command rebuild, and P2.** Rebuilding the sent command at the controller's **exact** point reproduces it to
**0.104 relative at the median** (per-run medians 0.006–3.02) and **not** to machine precision, which is the blend's
own error — `blendRelMed` reads **0.050** at the median across the arms, 3.3p's own 0.001–0.056. **P2 as written
holds**: not exact, median gap inside 0.001–0.3.

**C8, `fixed` ≡ `point` on the shipped plant**, in every new column of this round as well as Part 2's: identical to
every printed digit in all twenty shipped-plant arms and both windows [M].

**C9, the survivorship control on §7's headline, predicted to be the discriminating read before it ran**: the 19
`point` runs and 14 `plant` runs that live past three seconds, read from their own 0.2 s, show the **same** first
second (6.46–10.88×) and the **same** settled ride (1.05–2.37×) as the pooled arms. **The profile is the ride's age.**

**C10, the authority read's own direction, written into the probe before the arms ran.** The docstring says *"a ratio
near 1 means both sides would move together and the substitution's one-sided reading overstates the loop's share."*
Measured ratio **1.19** on the arm the substitution is taken from, predicted overstatement **6.3×**, measured
**5.5×** [A, with its two assumptions named in §5 reading 1].

## 12. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probes type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming 670 files including
  `docs/research/new-rider/3.3/plant.ts`, `docs/research/new-rider/3.4/row.ts`,
  `docs/research/new-rider/3.4/cost.ts`, `src/physics/bankLedger.ts`, `src/physics/predictiveBalance.ts`,
  `src/physics/rollModel.ts`, `src/physics/AttachedRider.ts` and `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code above
  is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 634 passed, 21 expected fail** — Part 2's exactly.
  `vitest run src/game src/scene/rig`: **70 files, 735 passed** — Part 2's exactly.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** —
  Part 2's exactly. `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand:
  **43 of 43**. `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round changes no file under `src/`.
- **The Canyon byte check is not run, and the reason is stronger than a hash.** The brief gates it on `src/`
  changing. `git diff origin/main -- src/ server/` is **empty**: not one byte of the game changed, so the two
  Canyon hashes cannot differ from Part 2's by construction. The whole round is two read-only probe files under
  `docs/`. (Part 2's own fresh spin-up reproduced the references `a367d938f15fa934` / `9e5831f80e38abd9` and
  `ea3d57a4d49f4b48` / `a1a2555739210f96`, and nothing since has touched the solver.)
- **the shipped rider is proved unchanged with every switch off** by the same read: there is no source change for a
  switch to be off of, and §11 C1 reproduces 3.3p's, Part 1's and Part 2's published rows and falls to the digit.
- **`3.3/plant.ts`'s two new switches are off by default** (`TICKS` unset, `GAINS` unset), so every arm run without
  them is Part 2's own probe on Part 2's own cells, which C1 is the read of.

## 13. Files (3.4c)

- `docs/research/new-rider/3.3/plant.ts` — step 3.3p's probe, extended with: the roll row's **twenty-three-source**
  partition off the bank ledger (`gDeck`, with its own closure column); the row's own two halves (`rollCmd`,
  `rollState`) and the command's share of each side; the **five matched per-source gaps** on both plants with their
  partition's closure; `GAINS=1`, which rebuilds the four cost arms' designs at the controller's exact point every
  tick and from each one's `k` reconstructs **the command that arm would have sent at this very state**, giving P1's
  identity, the command-rebuild control, the swing, and **the brief's own measurement** (`relSubst`, `relSubstBank`,
  `substHelps` per arm); the ankle rest's **authority** on both sides in one frame, with the zero-order hold's
  attenuation printed beside it and `bZeroOff` as the read that the commands enter only the two lag rows; and
  `TICKS=<path>`, a per-tick `.jsonl` dump of columns already computed. **Read-only; nothing under `src/` changed.**
- `docs/research/new-rider/3.4/row.ts` — **new**: the matched-state decomposition. Five binnings, three windows (all
  ticks, the arms' common clock time, and every tick more than 0.3 s before its own run's end), the exact shift–share
  on the log mean with its closure, the per-source table per arm, the substitution's own table, **the roll row's
  error against the ride's own age with the survivorship control**, and the denominator read that says whether a
  smaller relative error is a bigger denominator. Read-only; it reads the `.jsonl` dumps and imports nothing from
  `src/`.
- `docs/research/new-rider/3.4/results/34c/` — the forty arms as `.jsonl` and `.txt`, `34c-summary.txt` (every table
  above, generated), `34c-predictions.md` (every prediction as written **before** its read, each with its own
  falsification), and the **per-tick record, gzipped, for the seventeen arms every published figure is taken from**.
  **All twenty-one are load-bearing** — every geometric mean, every window ratio, the time profile, the survivorship
  control and the shift–share are read from one of them. The other nineteen arms' per-tick dumps are not kept: they
  are one documented command each (`TICKS=… GAINS=1 … node pl.mjs`), and keeping all forty put the folder at
  **29 MB**; the twenty-one put it at **19 MB** against 34b's 5.8. **Every one of the forty arms' per-run summaries
  is kept in full**, and every figure in this Part that is not a per-tick statistic is read from those.
- `docs/research/new-rider/3.4/README.md` — this Part.

## 14. For the owner, in plain words — and the shot list

**You rode it and said two things. The second one — *"doesn't look like a stick but an actual human movement"* — is
the half of his balance I was told last round was fixed, and you felt it without being asked. The first one — *"down
turn just falls very easily"* — is this round's subject, and I have four things to tell you about it.**

**One: the number everyone on this track has been quoting about the board is three different numbers.** His balance
predicts, sixty times a second, how fast the board is about to roll under him. For six rounds we have said that
prediction is **wrong by ten times**. Measured properly: it is wrong by **six to eleven times in the first second
after he stands up**, by **one to two times once the ride settles**, and by **one and a half to six times on a
turn, with no pattern in time at all.** The reason nobody saw this is that almost every test ride this track has ever
run **fell inside the first second and a half**, so the only number anyone ever measured was the first second's.
**The board half of his balance is not uniformly broken. The start is.**

**Two: last round's good news was mostly an illusion, and I can say exactly how much.** Last round turned two unused
rules on and the board's prediction got **four times** more accurate. I gave both arms **the same one second** —
a window nobody falls in — and the improvement shrank to **a tenth**. **Ninety-one per cent of it was that the
rider with the new rules simply stayed up three and a half times longer, and a longer ride is mostly settled riding,
where the prediction is good anyway.** Not "he rides somewhere gentler" — I checked, the water and the rail he meets
are the same. He just rides for longer.

**Three: on the rider YOU rode — the two-body one — the gains really do buy the board's prediction, and that is the
one piece of good news I have.** Same test, same second, nobody falling: on the old point-mass plant better gains buy
**nothing** (a tenth). On the two-body plant they buy **a factor of two and a half on a glide and a quarter on a
turn** — three quarters of it survives the fair window. **And before any gain change, on the turn you fall on, the
two-body plant's board prediction is already twice as good as the old one's and its body prediction six times.**
Whatever else this round says, it says keep the body you felt.

**Four: and here is why fixing the board half one piece at a time has failed five times.** I split the prediction by
source — water, ankle, twist, everything else — against the game's own books, source by source. Two of those sources
are each wrong by **two to four times the whole error**, and **they point opposite ways in ninety-five to ninety-nine
per cent of ticks**. The prediction is the small difference of two big mistakes that cancel. Fix either one by a
fifth and the answer moves by most of itself, in whichever direction the cancellation happens to leave. **That is
why six rounds of clearing suspects moved nothing.** And the pair swaps roles depending on what you are doing: **on
a glide the water is the bigger mistake; on a turn — your turn — it is his own body's gravity, inertia and geometry.**

**Five: your bar is not met and this round did not try.** 480 test rides given nine seconds, 480 ended, Compress
fell in all 160 of its own. Nothing in the game changed; this was a measurement round.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, `?rider=new&feltFrame=deck` as always, and **`?riderBody=two` on
everything** — it is the plant you already rode and liked.

1. **`?riderBody=two&riderCost=point`, and hold a bottom turn.** This is the one combination my numbers say should
   feel different on the manoeuvre you fall on: on the turn it is the only arm where better gains buy the board's own
   row (a quarter better, three quarters of it surviving a fair window). **Does the board feel like it is going where
   you expect under you, or does the turn still give way?** The bench says the turn's own time gets *shorter*
   (2.50 s → 1.30 s), so I expect you to fall sooner and I want to know whether it feels **more** or **less**
   predictable while you do.
2. **`?riderBody=two` alone, and ride past the first two seconds once.** If you can get past the first second and a
   half at all, my numbers say the board's prediction becomes four to eight times better from there. **Does it feel
   like it settles?** Everything this track knows about the board comes from the first second, and I cannot tell you
   from a bench what settled riding feels like.
3. **And a ruling, not a ride.** What I think step four is, in order:
   - **The first second.** It is six to eleven times wrong there and one to two times after, on the same runs, and
     **none of the four things I can measure explains why.** That is the single biggest unexplained number on this
     track and it sits exactly where you said you fall (*"gets on the board"*). I would spend step four on it, and
     the first thing I would do is instrument the placement itself rather than the plant.
   - **The turn's own source**, which is his own body's gravity, inertia and geometry rather than the water. That is
     the model's one term nobody has ever separated — six rounds could zero the water, the ankle and the twist, and
     never this. Splitting it is a day's work on the same probe.
   - **Not the gains, and not another cost constant.** They are a tenth on the old plant and a quarter on the new
     one, they cost the body's half 1.8× every time, and your own slow cell cannot use them at all — the ankle's
     command is already jammed against its limit in **seven to nine ticks out of ten** there, and the board answers
     what it does get **five times** harder than the balance expects.
   **My recommendation is the first, then the second. Your call.**

## 15. The deletions column, read line by line

`git diff --cached --numstat origin/main` before the commit, read file by file. **`src/` and `server/` are empty on
both sides of the diff — not one byte of the game changed** — and the whole round is two files under `docs/` plus a
results folder.

```
522   1  docs/research/new-rider/3.3/plant.ts
650   0  docs/research/new-rider/3.4/README.md
379   0  docs/research/new-rider/3.4/row.ts
   … and 103 files under docs/research/new-rider/3.4/results/34c/, insertions only
──────────────────────────────────────────────
106 files, 7 555 insertions, 1 deletion
```

`git diff --cached --numstat origin/main -- src/ server/` prints **nothing at all**, and the one commit `origin/main`
gained while this round ran (`62f39d95`, the owner's ride) touches one handoff `.md` and no code — this branch is
rebased onto it.

- **`docs/research/new-rider/3.3/plant.ts` — one deletion, and it is an import line.** The
  `predictiveBalance` import, re-added with `DEFAULT_WEIGHTS`, `type DesignWeights`, `costWeights` and `design` added
  to it and **nothing dropped**: `CONTROL_STEP`, `bodyInertiaAt`, `captureOmega`, `continuousPlant`, `discretise`,
  `heelColumn`, `plantAt` and `railLimit` are all still there, in order.
- **Every other file in the round is insertions only, zero deletions**: `docs/research/new-rider/3.4/row.ts` (new),
  `docs/research/new-rider/3.4/README.md` (this Part appended, Parts 1 and 2 untouched) and the files under
  `results/34c/`.
- **A token-by-token check was run rather than trusted to the eye**: every identifier on the one deleted line was
  searched for across the round's insertions. **All eight are present**, in the same import statement.
- **And the round's own data accident is recorded rather than hidden.** A shell loop meant to keep the per-tick
  record for seventeen arms and drop the other twenty-three deleted **all forty** (zsh matched `*.ticks.jsonl.gz`,
  the prefix-strip in the keep test did not, and every file failed the test). The seventeen were **regenerated from
  the probe**, which re-ran the published analysis end to end, and §11 C1's reproduction figures were re-read from
  the regenerated files. **Every per-run summary survived untouched**, so no measurement in this document was
  recomputed from a different number than the one it was first read from; the two spans that changed when I checked
  them against the 40-arm population rather than one arm's are §0 sentences 6, 7 and 9, and they are corrected in
  place with the population named.

# Part 4 — the first second is the mount's own equilibrium read by a model whose roll datum is the world's
vertical: the window this folder has always filtered out is the worst of the ride, 21.6–32.4 times, and the
placement's defect is permanent while only its share is a transient

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-d`, cut from `main` at
**f6f891ef** (Part 3's merge plus its follow-up), so Part 3 is its base. Its brief is item 1 of Part 3 §14's own
step-four list, the round's own ruling: *"**The glide's first second** — 6–11× there, 1.0–2.4× after, same runs, nothing explains it; it sits
exactly where the owner says 'gets on the board'. **Instrument the placement, not the plant.**"*

It ships **no source change at all** — `git diff origin/main -- src/ server/` is **empty** — and instead extends
`3.3/plant.ts` with two read-only switches (`MOUNT=<path>`, a per-**frame** record from frame 1, and `PLACE=level`,
the mount's own positive control) and adds `3.4/mount.ts`, which reads the dumps and generates every table below.
**Ten arms, 210 rides, 23 446 frames and 23 446 control ticks of which 20 264 are 3.4c's own live population**: the
shipped and the two-body plants on each of the three cells (the glide, the owner's own low speed, a commanded turn),
the glide once more with Part 2's two cost weights on, and **three more with only the mount changed** (`PLACE=level`
on the glide, on the two-body glide and on the owner's own cell).

**The owner rode this track before Part 3 and their two sentences are still the frame:** *"gets on the board down
turn just falls very easily"* and *"seems that the movement is very fluid in the sense that doesnt look like a stick
but an actual human movement."* **Nothing here proposes reverting the two-body plant**; the two-body arms are here
because the owner rides it.

## 0. The ten sentences the round is for

1. **The owner's bar is NOT met in any arm. 210 of 210 rides ended before nine seconds and Compress fell in 70 of
   70** [M], over ten arms. The owner's own low-speed cell is **1.033 s** on both plants, the glide **1.183 /
   1.450 s**, the turn **3.067 / 2.500 s** — **every one Part 2's and Part 3's published figure to the digit**
   (§12 C1), and the mount's own control arm is **0.383 s**.
2. **The window the whole folder filters out is the worst of the ride.** `3.3/plant.ts`'s own `live` filter is
   `t > 0.2 && clamped === 0`, commented *"the placement's contact transient"* [R] — so **no number in 3.3k…3.4c
   contains the mount's first twelve frames.** Measured for the first time: the roll row's error there is
   **29.6× (off), 21.6× (point), 32.4× (two-body)** on the glide against the 6.6–12.6× of 3.4c's own first second,
   **7.3×** on the owner's own cell and **6.5×** on a turn [M, 264 / 264 / 264 / 198 / 198 ticks].
3. **And the filter's own premise is wrong: the placement's transient is not over at 0.2 s.** The board's own heel
   against the water does not exceed the face's tilt under it until **0.583 s** (24 of 24 runs) on the glide and
   **0.392–0.458 s** (18 of 18) on the low and steered cells [M].
4. **The age profile splits exactly, because a geometric mean is multiplicative.**
   `gm(|m−g|/|g|) ≡ gm(|m−g|)/gm(|g|)`, read with its own closure (3 × 10⁻⁸ at the median, 6.4 × 10⁻⁶ peak, the
   residue of the three means dropping different zero entries). From the mount to the settled ride on the arm with
   by far the largest settled population (`point`, 264 ticks then 1 592 at 3–5 s, against 23–469 on the other
   nine): **21.598 → 1.921 is ×3.69 of numerator and ×3.04 of denominator — 54 % and 46 % of it in log terms**
   [M]. On 3.4c's own windows (0.2–1.0 s against >1.5 s) it is
   ×3.56 and ×1.46, **77 % and 23 %** [M]. **Half of the mount's error is that the game's own board is quiet
   there**, and no round before this one has separated the two.
5. **The game's board is quiet at the mount because the mount is built as an equilibrium.** `board.place` builds the
   board's up axis from the **water's normal** [R], so at frame 1 its heel against the water is **0.046–0.059°**
   (0.23–0.24° as a geometric mean over the window) while the face's tilt under it is **8.81–8.82°**. The game's
   own roll row there is **30.5–44.3 °/s²**; at the **same 5–10° of board roll** later in the ride it is
   **114–222 °/s²**, two to five times louder [M, two-way read].
6. **The model cannot be in that equilibrium, because its roll datum is the world's vertical.** Its water term at
   the mount is **2 724 °/s² against the game's 184, and of the opposite sign** (signed medians +2 782 and −254),
   and **84 % of it is the phantom heel** — the face's tilt read as the board's, exactly one column of the plant
   (`rollAccFull − rollAccTilt`, `heelColumn` imported, not reimplemented). The phantom alone is **51–75 times the
   game's whole roll row** at the mount [M].
7. **The phantom is not a transient. Only its share is.** It is **2 278 °/s² at the mount and 391–443 °/s² after
   three seconds**, where the net error is 259 and the game's whole row 135 — still **1.5–1.7× the game's row and
   0.8–1.6× the error it is supposed to explain** [M]. Its share of the model's own water term falls
   **0.84 → 0.07**. And **the reference is wrong in the same datum for the whole ride**: `|φ_ref|` is **exactly
   0.0000° at every one of 18 182 frames of every unsteered, low and level run**, while the face's tilt under the
   board is 7.6–10.5° at the median [M] — the trim the loop holds is level with the **world**, not with the face.
8. **Nothing in the mount's own initialisation has a one-second scale, so the first second is not a filter
   transient.** The loop sends **exactly zero for frames 1–6 in 144 of 144 frames of 24 of 24 runs** (the estimate
   is zeroed by `resetBalance` and the filter cannot run until the sense line is longer than the delay, `steps = 6`
   [R]); it first sends anything at **0.117 s**; the felt vertical starts at the **world's** gravity (−7.545° across
   the deck, where the deck's own tilt is −8.85°) and is within a degree of the **face's normal** by **0.250 s**,
   24 of 24 [M]. **The one mount quantity with a near-second scale is the geometry of sentence 3.**
9. **The positive control, predicted before it ran, and it moves the mount's window by sixteen times.**
   `PLACE=level` changes **only** the placement — the board's up axis the world's vertical instead of the water's
   normal, same water, heading, entry and rider. The mount's first 0.2 s goes from **21.6–29.6× to 1.329×**, the
   game's own roll row from **33–44 to 1 290 °/s²** (×29–39), the model's water term from **2 724 to 355** (×0.13),
   and the share of ticks on which the model **over**-predicts from **1.000 to 0.280** [M]. **The rider falls
   sooner, 0.383 s against 1.183/1.450** — an instrument, not a result.
10. **Three of my own nine predictions are refuted, and one of them is this round's own leading explanation.**
    Conditioning on the phantom's share of the heel the model reads does **not** flatten the age profile: at a share
    **under a quarter** the error still runs **20.8 → 5.6 → 2.0 → 2.0** with age, and at a fixed age the share does
    not order the error and partly reverses it (20.8 / 13.8 / 7.0 / 8.1 / 3.4 from least phantom to most) [M].
    **So the phantom heel is the mount's biggest single term error and it is not, by itself, what makes the first
    second different.** I have two measured halves and I am not going to collapse them into one cause.

## 1. (A) The five reads that had to come first

**R1 [R]. The probe's mount is the game's mount, which is what lets this Part speak to the owner's sentence.**
`AttachedRider`'s attach path calls `resetBalance()` — `predictor.reset()`, `controlDue = 0`, `heldAnkleRaw = 0` —
and sets `pairFresh = true`, and it is the same path whichever way the rider arrives at `phase: 'standing'`
[R, `AttachedRider.ts:2650–2730`, `:3806–3815`]. So the estimate's zero, the felt vertical's world gravity and the
cleared sense line are the game's own stand-up, not the probe's artefact.

**R2 [R]. The mount places the board FLUSH with the water and the body SQUARE to the deck, and the second has a
stated physical reason that contradicts the plant's datum.** The probe's `board.place` builds the orientation from
the basis `(left, normal, forward)` with `normal` the water's own [R, `plant.ts`], so the heel is zero by
construction. The body's placement is the game's: *"the body square to the deck … on a planing board, across too:
as a body balances on a board sliding freely down its face, **where the felt vertical is the face's normal**"*
[R, `AttachedRider.ts:2655–2657`]. **The mount's own argument is that the vertical that matters is the face's
normal; every one of the twelve captive derivatives in the balance's plant is read at the roll from the world's
level** [R, 3.3p §6]. The two disagree by exactly the face's tilt, and §5 is the size of that.

**R3 [R]. The loop cannot act for six frames and that is arithmetic, not a tuning.** `PredictiveController.reset`
empties `senses` and `estimate`; `tick` only runs the filter `if (this.senses.length > N)` with `N = d.steps`, and
`estimate` is `new Array(ne).fill(0)` until then [R, `predictiveBalance.ts:1304–1312, 1375–1400`]. With
`PREDICT_DELAY = 0.1 s` and `CONTROL_STEP = 1/60 s`, `N = 6`. And with `x̂ = 0` and the reference's own `x_ref = 0`
on an unsteered arm, `u = u_ref − K(x̂ − x_ref) = u_ref = 0` **exactly** — which §4 reads at every frame rather than
inferring.

**R4 [R]. The delay line is undelayed until it has filled.** `DelayLine.at` returns `values[first]` when
`t <= times[first]` [R, `humanBalance.ts:218–224`], so for the first `BALANCE_DELAY = 0.1 s` the human loop reads
the mount's own first frame held, not a delayed sense. A third 0.1 s constant, and the third one shorter than the
second this Part is about.

**R5 [R]. `MOUNT` and `PLACE` are reads and a placement, and neither can reach the game.** `MOUNT` writes columns
the probe already has (plus `rider.predictor.reference`, `.sent`, `.raw` and `AttachedRider.pairFelt`, each named in
`RiderInner` as this probe names every private it reads). `PLACE` changes the probe's own `board.place` call and
nothing else. §12 C2 is the read that they change no ride: **0 differing cells over 24 runs × 349 columns** with
both dumps off against both on.

## 2. (B) The window every published figure in this folder excludes

| **[M]** the mount's first 0.2 s, every tick, 12 frames a run | n | gm rel | gm \|err\| | gm \|the game's row\| | gm \|the model's row\| | the phantom | phantom / the game's row | model over-predicts in |
|---|---|---|---|---|---|---|---|---|
| **the glide, shipped cost** (`off`) | 264 | **29.610** | 989.7 | **33.4** | 977.0 | 2 279.2 | **68.2** | **1.000** |
| the glide, + the two weights (`point`) | 264 | **21.598** | 956.2 | **44.3** | 923.5 | 2 278.2 | **51.5** | **1.000** |
| the glide, the **two-body** plant | 264 | **32.429** | 988.5 | **30.5** | 975.9 | 2 279.3 | **74.8** | **1.000** |
| **the owner's own low-speed cell** | 198 | 7.303 | 1 076.8 | 147.4 | 1 112.0 | 1 781.3 | 12.1 | 0.798 |
| a commanded turn | 198 | 6.454 | 398.4 | 61.7 | 386.6 | 1 361.7 | 22.1 | 0.889 |
| **the same `point` glide at 0.2–1.0 s**, 3.4c's own first second | 1 152 | 6.6–12.6 | 843–1 166 | 87–129 | 828–1 022 | 1 255–2 234 | 12.4–23.6 | 0.93–0.97 |

**Four readings.**

1. **The first number this round measured is three times the number six rounds have been quoting, and it was
   excluded by a filter that calls it a transient.** 21.6–32.4× against 6.6–12.6×, on the same arms, 264 ticks each
   [M]. The filter is `t > 0.2` and it has been in every window since 3.3k [R].
2. **The filter's premise is measurable and it is wrong.** "The placement's contact transient" is not over at
   0.2 s: the board's own heel first exceeds the face's tilt at **0.583 s** on the glide (24 of 24 runs) and
   0.392–0.458 s on the low and steered cells (18 of 18) [M, §4]. **Either the window should start after the
   geometry has turned over, or — better — the mount should be reported rather than dropped**, which is what this
   Part does.
3. **At the mount the model over-predicts in 1.000 of ticks on all three glide arms** (264 of 264 each) [M]. Not
   scattered error: a one-signed offset.
4. **And the error is the model's whole row.** `gm |(m − g)/m|` is **1.013–1.181** in every age bin of the glide
   arms to 1.0 s [M]: the game's row is a small correction to the model's, not a thing the model is near.
   Equivalently **predicting "the deck is not rolling" beats the model's own row in 1.000 of the mount's ticks on
   both glide arms** (264 of 264 each) and in 0.54–0.98 of every later bin; on the owner's own low cell the mount's
   share is 0.778.

## 3. (B) The split, which is an identity and not a decomposition

`rollRel = (m − g)/|g|`, and a geometric mean is multiplicative, so **`gm(|m−g|/|g|)` is exactly
`gm(|m−g|)/gm(|g|)`**. The profile this folder has quoted for six rounds is therefore the product of two profiles,
and this is the first round to print them apart.

| **[M]** `point`, the arm with by far the largest settled population (1 592 ticks at 3–5 s against 23–469 on the other nine) | the mount, 0–0.2 s (264) | the settled ride, 3–5 s (1 592) | the ratio | log share |
|---|---|---|---|---|
| **gm rel** | **21.598** | **1.921** | **×11.24** | — |
| gm \|the model's absolute error\|, °/s² | 956.2 | 259.0 | ×3.69 | **54 %** |
| gm \|the game's own roll row\|, °/s² | **44.3** | 134.8 | ×3.04 | **46 %** |
| the closure of the identity, relative | 3.3 × 10⁻⁸ | 4.0 × 10⁻⁶ | — | — |

| **[M]** the same arm on **3.4c's own windows**, live ticks | 0.2–1.0 s (1 152) | >1.5 s (3 477) | ratio | log share |
|---|---|---|---|---|
| gm rel | 9.627 | 1.856 | ×5.19 | — |
| gm \|error\| | — | — | ×3.56 | **77 %** |
| gm \|the game's row\| | — | — | ×1.46 | **23 %** |

**Four readings.**

1. **Which half carries the profile depends on which window you ask about, and this is the first round that can
   say so.** From the mount it is **half the denominator**; from 3.4c's own first second it is **a quarter**. My own
   P1 said "at least a third" and is **upheld on the first and refuted on the second**; both are printed with their
   windows named, because the one number has already been three quantities in this folder.
2. **The model's error does not settle in the first second and a half; on the shipped cost arm it rises.** 989.7 →
   676.2 → 730.1 → 1 526.2 → **2 642.5** → 5 100.2 °/s² over 0–1.5 s [M, `off`], while the game's row rises faster
   (33.4 → 851.0), so the ratio falls from 29.6 to 6.0. On the `point` arm the error is flat to 1 s (956 → 1 166)
   and only falls once the ride has flattened out (257–259 at 2–5 s). **"The row gets better after a second and a
   half" is, on these arms, the game getting louder and the ride getting flatter.**
3. **The closure is read and it is not machine zero, for a stated reason.** 3 × 10⁻⁸ to 6 × 10⁻⁶ relative: the three
   geometric means drop different entries (a tick with `m = g` exactly, or `g = 0`, leaves one mean and not
   another). Printed rather than asserted, and small enough that no reading above turns on it.
4. **The denominator's own size is the mount's, not the arm's.** 30.5–44.3 °/s² at the mount on all three glide
   arms — the shipped cost, the two weights and the two-body plant agree to within a half [M].

## 4. (B) The mount's own frames, and what settles over what time

| **[M]** the glide, `off`, medians over 24 runs, **from frame 1** | fr 1 | fr 6 | fr 7 | fr 12 | fr 24 | fr 60 |
|---|---|---|---|---|---|---|
| t, s | 0.0167 | 0.1000 | **0.1167** | 0.2000 | 0.4000 | 1.0000 |
| the filter running, share of runs | **0.00** | **0.00** | **1.00** | 1.00 | 1.00 | 1.00 |
| the command **exactly** zero, share | **1.00** | **1.00** | 0.00 | 0.00 | 0.00 | 0.00 |
| the estimate **exactly** zero, share | **1.00** | **1.00** | 0.00 | 0.00 | 0.00 | 0.00 |
| the estimate's own φ, ° | 0.000 | 0.000 | −0.332 | −1.999 | −5.717 | −27.295 |
| the state's own φ, ° | **−8.847** | −8.998 | −9.079 | −9.573 | −10.701 | −40.019 |
| the reference's φ, ° | **0.000** | **0.000** | **0.000** | **0.000** | **0.000** | **0.000** |
| the felt vertical across the deck, ° | **−7.545** | −3.981 | −3.539 | −1.579 | **0.017** | −4.818 |
| its magnitude, m/s² | **9.534** | 7.568 | 7.194 | 6.785 | 10.020 | 8.127 |
| the board's roll from the world's level, ° | 8.857 | 9.005 | 9.079 | 9.575 | 10.811 | 40.534 |
| the face's tilt under it, ° | 8.824 | 8.880 | 8.889 | 8.856 | 8.326 | 5.037 |
| **the board's own heel against the water, °** | **0.059** | 0.331 | 0.437 | 1.006 | 3.184 | 36.756 |
| the body's bank from the world's level, ° | 8.697 | 8.809 | 8.917 | 9.655 | 13.267 | 42.663 |
| the game's own roll row, °/s² | −4.4 | −50.9 | −42.7 | 74.1 | −149.6 | 50.2 |

| **[M]** the mount's three settling reads, per arm | the loop first sends anything | the felt vertical within 1° of the face's normal | the board's heel first exceeds the face's tilt |
|---|---|---|---|
| the glide, `off` / `point` / two-body (24 runs each) | **0.117 s, 24 of 24** | **0.250 s, 24 of 24** | **0.583 / 0.583 / 0.592 s, 24 of 24** |
| the owner's own low cell, shipped / two-body (18) | 0.117 s, 18 of 18 | 0.183 / 0.175 s, 18 of 18 | **0.392 / 0.425 s, 18 of 18** |
| the turn, shipped / two-body (18) | **0.017 s** (the reference is not zero there) | 0.233 / 0.258 s, **12 of 18** | 0.458 / 0.392 s, 18 of 18 |
| `PLACE=level`, the glide (24) | 0.117 s | **0.017 s** (the deck IS level) | **0.017 s, 22 of 24** |

**Five readings.**

1. **The loop is silent for exactly six frames, and it is an identity rather than a transient.** The command is
   **exactly** zero in 144 of 144 frames of 24 of 24 runs on every unsteered and low arm, because the estimate is
   zero, the filter cannot run before the sense line is longer than the delay, and the reference's own command is
   zero where no lean is asked [R, §1 R3]. **On the steered arm it is not zero** (the lean asked makes
   `u_ref ≠ 0`), 0 of 108 — so this is an unsteered and low-cell fact and it is named as one.
2. **Every stated mount constant is 0.05–0.1 s and every measured settling is 0.018–0.30 s.** `MOTOR_LAG = 0.05`,
   `PREDICT_LAG = 0.05`, `BALANCE_DELAY = 0.1`, `SPECIFIC_FORCE_TIME = 0.1`, `PREDICT_DELAY = 0.1` [R, five
   constants, three files]. **So the first second is not a filter, a lag or a delay line filling.**
3. **The one mount quantity with a near-second scale is the geometry**: the board is placed with **0.06° of its own
   heel under 8.82° of face tilt**, and its heel does not exceed the tilt until **0.583 s** (glide) or
   **0.392–0.458 s** (low, steered). That is the clock the error profile runs on, and §6 is the read that says it is
   not the whole of it.
4. **The mount's own two halves disagree about which vertical is real, for a quarter of a second.** The body is
   placed square to the deck on the argument that the felt vertical is the face's normal [R, §1 R2] — and the felt
   vertical the body's own balance reads at frame 1 is the **world's** gravity, 7.545° across the deck, reaching the
   face's normal only at **0.250 s** [M]. Its magnitude is **9.534 m/s² at frame 1 against 8.127 at a second**, so
   the capture point's own `ω₀ = √(|felt|/h)` is **8 % high** at the mount [M, and `ω₀` is `captureRow`'s, the
   quantity Part 2 §5 found carried for three different things].
5. **The reference is the datum defect in its purest form and it is not the mount's.** `|φ_ref|` is **exactly
   0.0000°** at every one of **18 182 frames** of the eight unsteered, low and `PLACE=level` arms, peak exactly
   0.0000 [M], while the face's tilt under the board is 6.6–10.5° at the median. **The trim the loop holds is the board
   level with the WORLD for the whole ride.** On the **steered** arm it is not zero and not sane either — median
   **43.7–44.7°, peak 172–2 249°** — which is 3.4c's own carried `steadyTurn` flag turning up in a new column, and
   it refutes my own P7 as written. **Flagged, not mine, not touched.**

## 5. (B) The phantom heel, as one exact column of the plant

Every one of the twelve captive derivatives was measured **per radian of the board's heel against a flat free
surface**; the model is fed `φ`, the roll from the **world's** level [R, both in 3.3p §6]. The size of the
difference is exactly `rollAccFull − rollAccTilt` — the plant against step 3.3p's tilt plant, whose extra input
column is `heelColumn` **imported** from `predictiveBalance`.

| **[M]** `point`, the glide, gm \|°/s²\| | the model's water | the model's ankle | the model's rest | the model's row | the game's water+board | the game's ankle | the game's row | the phantom | phantom / the model's water | phantom / the game's row | removing it HELPS in |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **0–0.2 s, the mount** (264) | **2 724** | 1 025 | 582 | 924 | **184** | 192 | **44** | **2 278** | **0.84** | **51.5** | **0.246** |
| 0.2–0.4 (288) | 3 132 | 533 | 1 360 | 828 | 323 | 283 | 129 | 2 234 | 0.71 | 17.4 | 0.253 |
| 0.4–0.6 (288) | 3 728 | 805 | 1 737 | 901 | 227 | 406 | 87 | 2 047 | 0.55 | 23.6 | 0.403 |
| 0.6–1.0 (576) | 4 073 | 1 105 | 1 739 | 1 004 | 558 | 573 | 105 | 1 413 | 0.35 | 12.4–13.2 | 0.597 |
| 1.0–1.5 (720) | 4 983 | 1 722 | 2 033 | 1 023 | 654 | 1 546 | 222 | 962 | **0.21** | 3.7 | 0.483 |
| 1.5–3.0 (1 872) | 1 782 | 836 | 982 | 461 | 481 | 567 | 189 | 302 | **0.07** | 0.6–1.0 | 0.100–0.249 |
| **3.0 s and after** (1 674) | 569 | 317 | 380 | 258 | 278 | 307 | **129** | **394** | 0.34 | **1.5–1.7** | 0.161–0.244 |
| the signed medians at the mount | **+2 782** | — | −689 | — | **−254** | — | — | **+2 326** | — | — | — |

**Five readings.**

1. **At the mount the model's water term is the phantom.** 0.84 of it, 2 724 °/s² against the game's own 184 **of
   the opposite sign** [M]. The board is flat on the water and the model believes it is heeled by nine degrees.
2. **The phantom alone is fifty to seventy-five times the game's whole roll row at the mount** (51.5 on `point`,
   68.2 on `off`, 74.8 on the two-body plant) [M]. That is the sharpest single number in this Part.
3. **And it is permanent. Only its share is a transient.** After three seconds it is still **394 °/s²** — 1.5–1.7×
   the game's whole row and 0.8–1.6× the net error it is supposed to explain — while its share of the model's own
   water term has fallen from 0.84 to 0.07–0.34 [M]. **The mount does not create the datum defect; it is the one
   moment in the ride when the defect is the whole of the model's heel.**
4. **Removing it alone makes the row worse almost everywhere, which is Part 3 §3 reading 1 at the mount.**
   Subtracting the phantom brings the row **closer in 0.246 of the mount's ticks** and 0.100–0.253 of the settled
   ride's; it helps in 0.40–0.60 only in the 0.4–1.0 s band [M]. **The row is the small difference of two large
   terms of opposite sign** (the model's water +2 782 against its own remainder −689, the game's water −254), so a
   correct repair of one term of it overshoots. **My own P5 predicted this direction before the arms ran and it
   holds.** 3.3p's ridden `?waterHeel` arms are the same result from the other side (10.050 → 11.640 pooled, and a
   0.283 s ride).
5. **`?waterHeel` is NOT a recommendation of this Part.** 3.3p measured it ridden and it halves the owner's own
   cell. What this Part adds is **where** the defect lives and **how big** it is at the mount, not a switch to turn
   on.

## 6. (B) My own leading explanation, refuted by my own two-way read

If the first second were the phantom's share of the heel the model reads, then conditioning on
`|tilt| / |roll|` — that share, per tick — would flatten the age profile.

| **[M]** `point`, the glide, the **gm relative error** | 0–0.2 s | 0.2–0.6 | 0.6–1.0 | 1.0–1.5 | 1.5–3.0 | 3.0+ |
|---|---|---|---|---|---|---|
| the phantom is **under a quarter** of the model's heel | — | — | **20.8** (197) | 5.6 (435) | 2.0 (1 710) | 2.0 (1 197) |
| a quarter to a half | — | 15.6 (72) | 13.8 (143) | 3.1 (139) | 1.0 (77) | 1.7 (150) |
| a half to four fifths | — | 9.9 (204) | 7.0 (124) | 2.1 (76) | 1.3 (38) | 1.4 (104) |
| four fifths to all of it | **21.5** (186) | 5.7 (198) | 8.1 (18) | 2.1 (18) | 0.9 (37) | 1.3 (56) |
| **more** than all of it (the heel's sign is the tilt's) | **21.8** (78) | 8.3 (97) | 3.4 (94) | 6.8 (52) | — | 1.7 (165) |
| every tick | **21.6** (264) | 8.4 (576) | 10.8 (576) | 4.4 (720) | 1.9 (1 872) | 1.9 (1 674) |

| **[M]** the same arm, **gm \|the game's own roll row\|**, °/s², by the board's own roll | 0–0.2 s | 0.2–0.6 | 0.6–1.0 | 1.0–1.5 | 1.5–3.0 | 3.0+ |
|---|---|---|---|---|---|---|
| the board rolled **5–10°** from the world's level | **44.3** (264) | 114.1 (273) | 143.7 (98) | 186.0 (121) | 222.3 (397) | 140.8 (239) |
| 10–15° | — | 93.2 (288) | 84.6 (201) | 202.4 (135) | 374.0 (156) | 162.0 (128) |
| 15–25° | — | 278.5 (15) | 100.3 (237) | 258.4 (301) | 468.6 (325) | 237.4 (179) |

**Four readings.**

1. **The phantom's share does not explain the profile.** With the phantom **under a quarter** of the model's heel
   the error still runs **20.8 → 5.6 → 2.0 → 2.0** with age [M, 197 to 1 710 ticks a cell]. **A ten-fold age
   profile with almost no phantom in it.**
2. **And within an age the share does not order the error — it partly reverses it.** At 0.6–1.0 s:
   20.8 / 13.8 / 7.0 / 8.1 / 3.4 going from the least phantom to the most [M]. **The cells with the most phantom
   are the better ones**, which is §5 reading 4 from the other side: the phantom is partly cancelling something
   else.
3. **What does survive conditioning is the mount's own equilibrium.** At a **fixed** 5–10° of board roll the game's
   own roll row is **44.3 °/s² in the mount's first 0.2 s and 114–222 later — two to five times louder at the same
   angle** [M]. The placement is built to be an equilibrium (§1 R2) and the board is not in one again.
4. **So I have two measured halves and no single cause.** The numerator's half is the model's row being ~1 000 °/s²
   at a state the game answers with 33–44; the denominator's half is that equilibrium. The phantom is the largest
   single term in the first, 84 % of the term it lives in, **and conditioning on it does not reproduce the
   profile.** **I am not going to supply a mechanism that my own instrument refuses.**

## 7. (B) The mount's own positive control: `PLACE=level`

One thing changed in the **mount** — the board's up axis the **world's** vertical instead of the water's normal, at
the same position, heading, entry speed and rider. Predicted in `34d-predictions.md` before it ran.

| **[M]** the glide's first 0.2 s, 264 ticks each | `PLACE=flush` (shipped) | **`PLACE=level`** | the move | predicted? |
|---|---|---|---|---|
| the board's own heel at frame 1, ° | **+0.059** | **−8.668** | — | by construction |
| its roll from the world's level at frame 1, ° | +8.857 | **−0.002** | — | by construction |
| **gm \|the game's own roll row\|**, °/s² | **33–44** | **1 290** | **×29–39** | yes (over 400) |
| gm \|the model's own row\|, °/s² | 924–977 | **661** | ×0.68 | **no** (predicted under 300) |
| the model's own **water** term, °/s² | **2 724** | **355** | **×0.13** | yes, in the term |
| **gm rel** | **21.6–29.6** | **1.329** | **×16–22** | yes |
| the model **over**-predicts in | **1.000** | **0.280** | the sign flips | yes |
| the ride's own median, s | 1.183 / 1.450 | **0.383** | ×0.26–0.32 | yes (under 1.0) |

**Four readings.**

1. **Sixteen to twenty-two times, from changing nothing but how the board is laid on the water.** The mount's own
   window goes from 21.6–29.6× to **1.329×** [M, 264 ticks each]. **The first window's blow-up is the mount's
   geometry**, demonstrated rather than argued.
2. **And it is mostly the denominator.** The game's row goes up ×29–39 while the model's goes **down only ×0.68**;
   the model's absolute error actually **rises** (990 → 1 714 °/s²) [M]. **The mount's window is not a window where
   the model is especially wrong in °/s² — it is a window where the game's board is especially quiet.**
3. **My own P6 is half refuted and the half that failed is informative.** The model's **water term** collapses
   ×0.13 exactly as the phantom predicts; **its row does not**, because a board laid level on a 9° face starts
   rolling at once (roll 0.00° → 6.30° in twelve frames) and the row's other terms — the rate, the ankle, the
   remainder — take over. **A term's repair is not a row's repair**, for the fourth time in this folder.
4. **The rider falls three times sooner on it and that is not a result.** 0.383 s against 1.183/1.450 [M, 24 of 24
   each]. **`PLACE=level` is an instrument. Nothing in this Part proposes changing the placement.**

## 8. (B) The owner's own cell, where the mount switches rule at four metres a second

| **[M]** the low cell at frame 1, 18 runs, the entry set absolutely | the board's roll, ° | **the body's bank, °** | bank / roll | the board's own heel, ° | the ride's own end, s |
|---|---|---|---|---|---|
| entry **1 m/s** (3 runs) | 8.338 | **−0.036** | **−0.004** | −0.712 | 0.600–0.633 |
| entry 2 (3) | 8.334 | **−0.037** | −0.004 | −0.682 | 0.517–0.533 |
| entry 3 (3) | 8.329 | **−0.038** | −0.005 | −0.651 | 0.550–0.867 |
| entry **4** (3) | 8.895 | **8.715** | **0.980** | −0.052 | 1.383–7.100 |
| entry 5 (3) | 8.883 | 8.709 | 0.980 | −0.028 | 1.200–1.350 |
| entry 6 (3) | 8.872 | 8.703 | 0.981 | −0.003 | 1.033–1.183 |

**Three readings.**

1. **Nine of the eighteen runs of the owner's own bar cell are mounted with the body plumb to the world and nine
   square to the deck, and the switch is a one-metre-a-second step in the entry.** `PLANING_SPEED = 4` [R,
   `AttachedRider.ts:342`], and the attach path takes the planing branch only above it [R, `:2668`]. **The body's
   own starting lean differs by 8.37° across that step** [M] — and the three entries below it are the owner's own
   "getting into position" speeds.
2. **And the three slowest runs are over before the mount's geometry has turned over.** They end at
   **0.517–0.867 s**, against a heel-exceeds-tilt crossover of 0.392 s and a felt-vertical settling of 0.183 s [M].
   **On the owner's own cell the whole ride is the mount.**
3. **I am not claiming which placement is right.** The game's own argument for square-to-the-deck is the felt
   vertical being the face's normal [R], and §4 reading 4 measures that the felt vertical does not read the face's
   normal for the first 0.25 s. **That is a contradiction inside the mount, measured; which side of it to move is
   step five's question and the owner's.**

## 9. (B) The owner's bar

| **[M]** median s, 210 rides, deck filter | runs | fell | median | span | Compress fell | Compress median |
|---|---|---|---|---|---|---|
| the glide, shipped cost | 24 | **24** | **1.183** | 1.100–2.067 | **8 of 8** | 1.217 |
| the glide, + the two weights | 24 | 24 | 4.317 | 1.717–6.083 | 8 of 8 | 3.900 |
| the glide, the two-body plant | 24 | 24 | **1.450** | 1.083–2.683 | 8 of 8 | 1.483 |
| **the owner's own low cell**, shipped / two-body | 18 / 18 | 18 / 18 | **1.033 / 1.033** | 0.517–7.100 / 0.500–6.233 | **6 of 6 / 6 of 6** | 1.183 / 1.167 |
| the turn, shipped / two-body | 18 / 18 | 18 / 18 | **3.067 / 2.500** | 1.367–4.117 / 1.317–3.183 | 6 of 6 / 6 of 6 | 3.317 / 2.717 |
| **`PLACE=level`**, the glide / two-body / low | 24 / 24 / 18 | all | **0.383 / 0.383 / 0.933** | 0.283–5.400 | 8 of 8 / 8 of 8 / 6 of 6 | 1.133 / 1.033 / 0.933 |

**Three readings.**

1. **The bar is not met in any arm and nothing in this round was built to move it.** 210 of 210 rides ended;
   **Compress fell in 70 of 70** [M]. It is a measurement round with no source change: §14's own first line.
2. **Every one of the seven shipped-placement medians is Part 2's and Part 3's own figure to the digit** — 1.183,
   4.317, 1.450, 1.033, 1.033, 3.067, 2.500 — which is §12 C1, and the fall lists match **value for value, 18 of
   18** on the low cell [M].
3. **And the rides end inside or just after the mount's own window.** The glide at 1.183–1.450 s against a
   crossover at 0.583 s; the owner's cell at 1.033 s against 0.392 s; its three slowest entries at 0.517–0.867 s.
   **Every fall this folder has measured happens within two crossovers of the mount.** That is a coincidence of
   timing stated as one — **I am not claiming the mount causes the fall.**

## 10. What I refuted

- **The filter that has defined every population in this folder since 3.3k, as a description of itself.**
  `live = t > 0.2 && clamped === 0`, *"the placement's contact transient"* [R]. The transient it names is not over
  at 0.2 s — the board's own heel does not exceed the face's tilt until **0.583 s** (24 of 24 glide runs) — and the
  window it drops is **the worst of the whole ride, 21.6–32.4× against 6.6–12.6×** (§2). **Twenty-ninth
  consecutive round to find its brief's premise wrong, and ninth to find it in the half the brief called settled** —
  here the half that said the first second had been measured at all.
- **"The roll row's error settles after a second and a half."** The model's **absolute** error does not settle: on
  the shipped cost arm it **rises** 989.7 → 2 642.5 → 5 100.2 °/s² through the first 1.5 s, and the ratio falls
  only because the game's own row rises faster (33.4 → 851.0) [M]. On the `point` arm it is flat to a second and
  falls once the ride has flattened out. **What settles is the quotient, and half of the quotient is the game.**
- **My own P1, as written, on one of its two windows.** "The denominator carries at least a third": **46 % from the
  mount to the settled ride, 23 % on 3.4c's own windows** [M]. The prediction was right about the mount and wrong
  about the window six rounds have used, and both are printed with their populations named.
- **My own P6's model half.** `PLACE=level` was predicted to take the model's row under 300 °/s²; it takes it to
  **661** from 924–977. Its **water term** does collapse, ×0.13. **A term's repair is not a row's repair.**
- **My own P7, on the steered arm.** `|φ_ref|` is exactly 0.0000° at every frame of every unsteered, low and level
  run (18 182 frames over eight arms) and is a median **43.7–44.7°** with a peak of **2 249°** on the steered
  arm — 3.4c's own carried `steadyTurn` flag, in a new column. Flagged, not mine, not touched.
- **This round's own leading explanation, by this round's own instrument.** The phantom heel is 84 % of the model's
  water term at the mount and 51–75× the game's whole row, **and conditioning on its share does not flatten the age
  profile**: 20.8 → 5.6 → 2.0 → 2.0 with the phantom under a quarter of the heel, and within an age the share
  partly **reverses** the ordering (§6). **The biggest term error is not the same thing as the cause of the
  profile.**
- **"Fix the water's heel datum" as a repair, measured at the mount this time.** Subtracting the phantom brings the
  row closer in **0.246 of the mount's ticks**: it hurts in three of four. The row is the small difference of two
  large terms of opposite sign (+2 782 against −689, the game's own −254), so a correct repair of one of them
  overshoots. 3.3p measured the ridden version (pooled 10.050 → 11.640; a 0.283 s ride).
- **A median convention that would have read as a difference of ride.** My first table printed **0.950 s** for the
  low cell's median where the whole folder prints **1.033** — the folder's `median` is `qt(v, 0.5)`, the **upper**
  element of the middle pair [R, `plant.ts:241`], not the pair's mean, and the eighteen fall times are identical
  value for value. **`3.4/mount.ts` now carries the folder's own convention with a comment saying why.**

## 11. What I will not claim

- **I will not claim the bar is any closer.** 210 of 210, Compress 70 of 70, the owner's own cell at 1.033 s, and
  the mount's control arm three times worse.
- **I will not claim a single cause for the first second.** I have two measured halves — a model row of ~1 000 °/s²
  at a state the game answers with 33–44, and a placement built as an equilibrium — and the term that dominates the
  first does not reproduce the profile when I condition on it (§6). **Part 3 said "I have a fact and not a
  mechanism"; I have two facts, their sizes, and a positive control, and still not a mechanism.**
- **I will not claim `?waterHeel` as the repair**, nor any other one-term fix. 3.3p rode it and it halves the
  owner's own cell; §5 reading 4 says why one term cannot be fixed alone here.
- **I will not claim the placement should change.** `PLACE=level` is an instrument; it falls three times sooner. The
  game's own argument for the flush placement is physical and stated [R], and **the contradiction §4 reading 4
  measures is between the placement and the model's datum, not inside the placement.**
- **I will not claim the mount causes the owner's fall.** The rides end at 1.03–1.45 s and the mount's geometry
  turns over at 0.39–0.58 s; that is timing, not causation, and §9 reading 3 says so on its face.
- **I will not claim the two-body plant is better or worse here.** At the mount the three glide arms agree to within
  a half on every column (§3 reading 4); the mount is not where the two plants differ. Part 1 measured its lean row
  better in 96 of 96 and the owner felt it; **nothing in this Part is an argument for reverting it.**
- **I will not offer any bot ride as evidence of feel**, anywhere in this document.
- **Carried, flagged, not mine, not touched**: `steadyTurn`'s own reference (median 43.7–44.7°, peak 2 249° on the
  steered arm, §4 reading 5); the `cos³` added-mass frame defect; `AttachedRider.frame`'s 70° bank clamp; the live
  point-mass `ω₀` in `HumanBalance.capture`, which §4 reading 4 now also measures as **8 % high at the mount**; the
  game's own rider as two bodies.

## 12. The controls

**C1, every one of 3.4c's seven shipped-placement arms reproduced column by column, not median by median.** The
per-run summaries of `off-unsteered`, `point-unsteered`, `two-off-unsteered`, `off-low`, `two-off-low`,
`off-steered` and `two-off-steered` against 3.4c's own files: **144 runs × 349 columns, and the only differing
columns are the 37 that `GAINS=1` writes** — null on this round's side, because this round does not run that switch.
**Every other column is identical to the digit in all seven arms** [M], and the low cell's eighteen fall times match
value for value.

**C2, the two new switches change no ride.** `off-unsteered` with `MOUNT` and `TICKS` **off** against the same arm
with both **on**: **0 differing cells over 24 runs × 349 columns** [M].

**C3, no source change, which is stronger than a hash.** `git diff origin/main -- src/ server/` prints **nothing**,
so the Canyon byte check cannot differ from Part 2's by construction and the brief's own gate (`src/` changing) is
not met. The whole round is one probe extension and one new probe under `docs/`.

**C4, the identity §3 rests on, read at every bin.** `gm(rel)` against `gm(|err|)/gm(|game|)`: **3 × 10⁻⁸ at the
median and 6.4 × 10⁻⁶ at the peak**, relative, over every bin of every arm, with the residue's own cause named (the
three means drop different zero entries) [M].

**C5, the folder's own closures, on this round's arms.** The sense reconstruction **exactly 0** and the tick spacing
**exactly 0** in all ten arms; the ledger's split, closure and residual **exactly 0**; the model's six groups plus
remainder to **8.2 × 10⁻¹³**; the ledger's twenty-three-source partition to **2.5 × 10⁻¹¹**; the five matched gaps'
partition to **1.3 × 10⁻¹¹** [M, peaks over every arm].

**C6, 3.4a's zero-inertia control, both halves.** Over the **306 points of the schedule** the game reads
(17 speeds × 3 depths × 6 rails): the shipped-weights fix against the shipped design, **worst entry 0.000e+0**, and
non-vacuous with the two weights on (smallest relative move **1.193 × 10⁻²**) [M, `3.4/cost.ts`, re-run on this
tree]. Per tick: the control plant's own `A` against the shipped plant's **1.2 × 10⁻¹⁴**, its roll row's relative
error **1.2 × 10⁻¹⁰**, the foot force **7.3 × 10⁻¹¹**, the asymmetric coupling's own corner **1 × 10⁻¹⁵** [M, peaks
over all ten arms].

**C7, the generated summary and the independent implementation agree.** Every table in this Part is generated by
`3.4/mount.ts` into `34d-summary.txt`; every headline figure was first computed by a separate throwaway script in
another language, and the two agree **to every printed digit** on §2, §3, §5, §6 and §7. The one place they
disagreed was the median convention, and that is §10's last bullet.

**C8, the predictions were written before the arms.** `34d-predictions.md` holds nine, each with its own
falsification, committed before any arm of this round ran; three are refuted (§10) and the refutations are in this
document rather than in the file.

## 13. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probes type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming **671 files** including
  `docs/research/new-rider/3.3/plant.ts`, `docs/research/new-rider/3.4/mount.ts`, `3.4/row.ts`, `3.4/cost.ts`,
  `src/physics/bankLedger.ts`, `src/physics/predictiveBalance.ts`, `src/physics/rollModel.ts`,
  `src/physics/AttachedRider.ts` and `@types/node`. (It caught one unused helper in `mount.ts`, which is why the
  probes are checked separately rather than trusted to the root project, whose `include` is `["src"]`.)
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code
  above is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 634 passed, 21 expected fail** — Part 2's and Part 3's exactly.
  `vitest run src/game src/scene/rig`: **70 files, 735 passed** — the same.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail**.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: this round changes no file under `src/`.
- **The Canyon byte check is not run and the reason is stronger than a hash** (§12 C3): the brief gates it on `src/`
  changing and `git diff origin/main -- src/ server/` is empty.
- **The shipped rider is proved unchanged with every switch off by the same read** — there is no source change for a
  switch to be off of — and §12 C1 reproduces 3.4c's seven arms column by column, 144 runs × 312 columns.

## 14. Files (3.4d)

- `docs/research/new-rider/3.3/plant.ts` — step 3.3p's probe, extended with **`MOUNT=<path>`**, one row per **frame
  from frame 1** (the predictor's tick count, its sense line against the delay it needs, whether its filter has
  started, its estimate of the two angles against the state the game is in, its command bias, the reference it
  holds, the felt vertical's size and its angle across the deck, the ankle's lagged rest and the raw command, the
  geometry including the board's own heel beside the face's tilt and where on the face it is, and the game's own
  roll row off the ledger) and **`PLACE=level`**, the mount's own positive control. Its per-tick dump now carries
  **every** tick with a `live` column (3.4c's own population is `live === 1`) plus the tilt plant's own roll row,
  from which the phantom is one subtraction. **Read-only; nothing under `src/` changed.**
- `docs/research/new-rider/3.4/mount.ts` — **new**: the analysis. The age profile split exactly with its own
  closure, the two rows' own terms with the phantom beside them, the two-way reads over the phantom's share and over
  the board's roll, the mount's own frames with three settling reads, the falls and the controls. Read-only; it
  reads the `.jsonl` dumps and imports nothing from `src/`.
- `docs/research/new-rider/3.4/results/34d/` — the ten arms as `.jsonl` (per run), `.ticks.jsonl` (per tick) and
  `.mount.jsonl` (per frame), with `34d-summary.txt` (every table above, generated) and `34d-predictions.md` (nine
  predictions as written **before** their reads, each with its own falsification). **The per-frame and per-tick
  dumps are kept in full for all ten arms, gzipped**: 10 MB together against 49 MB raw, every figure in this Part is
  read from one of them, and the mount's first twelve frames exist nowhere else. `3.4/mount.ts` reads `.jsonl` or
  `.jsonl.gz` either way, and the generated summary is **byte-identical** read from the raw dumps and from the
  gzipped ones (the same MD5) — the read that says the compression lost nothing.
- `docs/research/new-rider/3.4/README.md` — this Part.

## 15. For the owner, in plain words — and the shot list

**You said *"gets on the board down turn just falls very easily."* I spent this round on the moment he gets on the
board, and I have five things to tell you.**

**One: the worst moment of his whole ride was being thrown away by a filter, for six rounds.** Every measurement
this track has published starts a fifth of a second after he stands up, with a note in the code calling that fifth
of a second "the placement's transient". It is not a transient and it is not small: in those first twelve frames
his balance's guess about how fast the board is rolling is wrong by **twenty-two to thirty-two times**, against the
six to eleven times we have been quoting. **The single worst number on this track was the one nobody was allowed to
see.**

**Two: and half of that number is not him being wrong — it is the board being quiet.** When the game puts him on
the board, it lays the board **flat on the water**, which means the water is pushing it almost nowhere: the board's
real roll force at that instant is **thirty-three units** where a moment later, at the very same board angle, it is
**a hundred and fifty to two hundred**. His balance, meanwhile, is shouting **a thousand**. So the "error" is partly
a big guess divided by a very small truth. **I can now say how much: about half of it, in the right units.**

**Three: and the other half has a name, a size, and it never goes away.** His balance measures the board's tilt
**from the world's upright** — but the water's own numbers were measured from the **water's** surface. On a wave
face those differ by the slope of the face. At the moment he stands up the board is flat on a nine-degree face, so
**everything his balance thinks is "tilt" is the face, not the board** — eighty-four per cent of the water part of
his guess, and **fifty to seventy-five times** the real force on the board. That part shrinks as he actually starts
leaning, but it never leaves: **three seconds in it is still one and a half times the whole real force.** And the
posture he is steering toward is "board level with the world" at **every single frame of every single run** —
never "level with the wave".

**Four: I proved it by moving one thing and nothing else.** I laid the board **level with the world** instead of
flat on the face — same wave, same speed, same direction, same rider — and his first fifth of a second went from
**twenty-two to thirty times wrong down to one and a third**, with the real force on the board going up thirty-fold
and the sign of his mistake flipping over. **Only the placement changed.** (He also falls three times faster that
way, so it is a measuring tool and not a suggestion.)

**Five: and the honest part. Fixing the tilt datum on its own makes him worse, and I checked.** His guess is the
small difference between two big mistakes that point opposite ways, so correcting either one overshoots — removing
the face-tilt mistake makes the answer worse in **three ticks out of four** at the moment he stands up. I also
tested my own best explanation and it failed: when I look only at ticks where almost none of his tilt is the face's,
**the first second is still ten times worse than the settled ride.** So I have the two halves, their sizes and a
control, and I do **not** have one cause. I am telling you that rather than picking one.

**And one thing I found about your own slow speeds.** At the entry speeds you use getting into position, the game
mounts him **two different ways** depending on a one-metre-a-second line: below four metres a second his body is
placed **upright to the world**, above it **square to the deck** — an eight-degree difference in where his body
starts. Half of your own test cell is mounted one way and half the other. And the three slowest runs are **over
inside nine tenths of a second**, before the board has even started leaning more than the wave does. **On your own
cell, the whole ride is the mount.**

**Your bar is not met and this round did not try.** 210 test rides, 210 ended, Compress fell in all 70 of its own.
Nothing in the game changed.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, `?rider=new&feltFrame=deck`, and **`?riderBody=two` on everything** —
the plant you rode and liked, and nothing in this round argues against it.

1. **Ride and pay attention to the first half second only.** Stand up and watch what the board does under you before
   you do anything. My numbers say his balance is at its most wrong **in the first twelve frames**, that it is
   wrong in **one direction** there (it thinks the board is about to snap flat when it is already flat on the
   water), and that it is silent for the first six frames by construction. **Does the board feel like it is being
   corrected toward "level with the world" the moment you stand up?** That is the one thing a bench cannot tell me
   and the shape I would expect you to feel.
2. **Then try standing up on the flattest part of the wave you can find, and on the steepest.** The whole of this
   round says the defect's size is the **face's slope** at the moment you stand. If getting on the board is
   noticeably easier where the face is flat, that is this round's finding from the chair.
3. **And a ruling, not a ride.** What I think step five is, in order:
   - **The datum, in both places, together.** The water's terms are read from the world's upright and the trim the
     loop holds is "level with the world" at every frame. Those are the same mistake in two places, and 3.3p's own
     `?waterHeel` arm changed only the first and got worse. **Changing both at once has never been measured**, and
     it is the one repair this round's numbers point at. It is the same switch plus the reference, already written.
   - **The mount's own contradiction, which is one line of code and an eight-degree difference on your own cell.**
     The body is placed square to the deck on the argument that the felt vertical is the face's normal — and the
     felt vertical his balance actually reads for the first quarter second is the **world's** upright. Below four
     metres a second the placement rule flips. **Pick one of the two and make the mount agree with itself.**
   - **Not the gains, not another cost constant, and not the body.** Part 3 settled the first two; the mount is the
     same on all three plants to within a half, so it is not the body either.
   **My recommendation is the first, then the second. Your call.**

## 16. The deletions column, read line by line

`git diff --cached --numstat origin/main` before the commit, read file by file. **`src/` and `server/` are empty on
both sides of the diff — not one byte of the game changed** — and the whole round is one probe extension, one new
probe and a results folder.

```
  91   6  docs/research/new-rider/3.3/plant.ts
 653   0  docs/research/new-rider/3.4/README.md
 273   0  docs/research/new-rider/3.4/mount.ts
   … and 42 files under docs/research/new-rider/3.4/results/34d/, insertions only
──────────────────────────────────────────────
45 files, 2 868 insertions, 6 deletions
```

`git diff --cached --numstat origin/main -- src/ server/` prints **nothing at all**.

- **`docs/research/new-rider/3.3/plant.ts` — six deletions, and every one is a line re-emitted in place. Read as a
  column, one by one:**
  1. `const forward = level.addScaledVector(normal, …)` → the same line with `up` for `normal`, where
     `up === normal` unless `PLACE=level`.
  2. `const left = new Vector3().crossVectors(normal, forward)` → the same, `up` for `normal`.
  3. `new Vector3(0, here.surfaceY, pz).addScaledVector(normal, board.shape.centerOfMass.y)` → the same, `up` for
     `normal`. `here.surfaceY`, `pz` and `board.shape.centerOfMass.y` all still present.
  4. `new Quaternion().setFromRotationMatrix(new Matrix4().makeBasis(left, normal, forward))` → the same,
     `makeBasis(left, up, forward)`.
  5. `for (const xx of live)` → `for (const xx of ticks)`, the per-tick dump widened to every tick with a `live`
     column. **`live` itself is not deleted**: it is still the filter every summary statistic in the file is
     computed over, and `live === 1` in the dump is that same expression.
  6. The dumped object's first line, re-emitted with `place`, `live`, `clamped` and `ticks` added and **nothing
     dropped**: `body`, `cost`, `stance`, `steer`, `entryAsked` and `extra` are all still there, in order.
  **A token-by-token check was run rather than trusted to the eye**: every identifier on all six deleted lines was
  searched for across the round's insertions, and **all twenty-one are present**.
- **Every other file in the round is insertions only, zero deletions**:
  `docs/research/new-rider/3.4/mount.ts` (new), `docs/research/new-rider/3.4/README.md` (this Part appended, Parts 1
  to 3 untouched) and the forty-two files under `results/34d/`.
- **One line was deleted from `mount.ts` after it was written and before it was committed** — an unused `binOf`
  helper the separate probe type-check caught (`TS6133`). It was never called; `twoWay` does its own banding. It
  does not appear in the diff because it never reached a commit, and it is recorded here rather than left out.
- **And one number was corrected rather than published**: the falls table first printed 0.950 s for the owner's own
  cell where the folder prints 1.033, because `mount.ts` used a symmetric median and the folder's `median` is
  `qt(v, 0.5)` [R, §10]. The eighteen fall times are identical value for value to 3.4c's; only the convention
  differed, and `mount.ts` now carries the folder's with a comment saying why.

# Part 5 — the datum in both places already exists, it is `?waterHeel=tilt`, and the 2×2's missing cell refutes the
reason it was rejected: each half alone more than doubles the glide and together they halve it. And the mount's two
agreements are a ride and a row moving in opposite directions on the same runs

Written 2026-11-16 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-e`, cut from `main` at
**95829b02** (Part 4's merge), so Part 4 is its base. Its brief is items 1 and 2 of Part 4 §15's own step-five
ruling: *"**The datum, in both places at once** … 3.3p changed only the first and it got worse; both together has
never been measured, and both switches already exist"* and *"the body is placed square to the deck on the argument
that the felt vertical is the face's normal … below 4 m/s the rule flips. **Make the mount agree with itself.**"*

It ships **two switches, both opt-in, both off by default, both pinned off for online rooms**: `?waterHeel=ref`, the
fourth cell of a 2×2 whose other three step 3.3p built, and `?mountAgree=deck|felt|both`, the mount's own two
agreements. **Sixteen arms, 336 rides, 28 723 control ticks and 28 723 frames** on the two-body plant the owner
rides: the four datum cells and the three mount values and their combination, each on the glide (24 runs) and on the
owner's own low-speed cell (18).

**The owner's two sentences are still the frame** — *"gets on the board down turn just falls very easily"* and
*"seems that the movement is very fluid … an actual human movement"* — and **nothing here proposes reverting the
two-body plant**; every arm of this round runs it.

## 0. The ten sentences the round is for

1. **The owner's bar is NOT met in any arm. 336 of 336 rides ended before nine seconds and Compress fell in 112 of
   112** [M], over sixteen arms. The best single move in the whole round is the owner's own low cell going from
   **1.033 s to 1.167 s** on `?mountAgree=deck`, and its three slowest entries from **0.617 to 1.000 s**.
2. **The brief's first premise is false, and one column settles it.** `?waterHeel=tilt` already carries the datum
   into **both** places: with it on, the trim the loop holds is **`|φ_ref| = 9.1052°` at frame 1** against a face
   tilt of 8.811° under the board — **1.0378 × the face's own tilt**, in the sign that makes the board flush with
   the face — and `|φ_ref|` is **exactly 0.0000° in 0.000 of 845 frames** on that arm against **1.000 of 2 193** on
   the shipped one [M]. 3.3p rode it and published it: median **0.283 s**. *"Both together has never been measured"*
   is wrong; what had never been measured is **which half does what**.
3. **So this round built the 2×2's missing cell, and it refutes 3.3p's own attribution.** Glide medians, 24 runs
   each: the datum **off 1.450 s**, the **prediction alone 4.033**, the **reference alone 3.683**, **both 0.683**
   [M]. **Each half alone nearly triples the ride; the two together halve it.** 3.3p's sentence *"the reference is
   the destabiliser, and that is a measured split"* was a difference of two arms that differ in **both** halves;
   with the fourth cell in hand the destabiliser is **neither half — it is the pair**.
4. **And the two cells disagree about the ordering, so neither may be pooled.** On the owner's own low cell (18
   runs): off **1.033**, prediction alone **0.967**, reference alone **0.483**, both **0.433** [M]. There the
   reference's half halves the ride and the prediction's is neutral. **Two populations, two orderings, one switch.**
5. **On the rows the datum correction is enormous, and almost all of it is the denominator.** The mount's own window,
   **unfiltered, from frame 1**, 264 ticks a glide arm: the model each arm ran goes **39.002 → 1.514 → 1.150 →
   0.750** across off / prediction / reference / both — **fifty-two times** — while the game's own roll row there
   goes **30.5 → 562.6 → 1 147.0 → 2 659.9 °/s²** (×18 to ×87) and **the model's own absolute error gets worse,
   1 188.9 → 1 993.8 °/s²** [M]. **The ratio is repaired by making the board move, not by making the model right**,
   which is Part 4 §7's `PLACE=level` reading for the fourth time in this folder.
6. **The folder's `live` filter does not merely hide the mount's size — it hides its sign.** Against the whole live
   population of the same arm the mount is **1.76–3.78 × worse** on the two shipped-datum arms and
   **3.0–7.1 × BETTER** on every datum-corrected one [M, 16 arms]. **A filter chosen on one configuration is not a
   filter**, and `t > 0.2 && clamped === 0` has defined every population in this folder since 3.3k.
7. **The mount's four-metre-a-second contradiction is one line and `?mountAgree=deck` closes it exactly.** The nine
   1–3 m/s runs of the owner's own cell go from a body bank at frame 1 of **[−0.039°, −0.036°]** to
   **[8.723°, 8.745°]**, inside 0.5° of the **8.703–8.715°** the 4–6 m/s runs start at, **9 of 9** [M]. On the glide,
   where every entry is above 4 m/s, it is a **null by construction and that is its own control: 2 193 ticks and 24
   fall times identical to the shipped arm to the digit.**
8. **And on that arm the ride and the row move in opposite directions, on the same runs.** The low cell's median
   goes **1.033 → 1.167 s** and its three slowest entries **0.617 → 1.000 s** (+62 %), while the mount's own roll
   row goes **7.415 → 29.912** — *worse* by four times — because the game's own row there falls from **140.8 to
   35.8 °/s²**: a body placed in its own equilibrium leaves the board quieter still [M]. **A row is not a ride, and
   this is the round's cleanest instance of it.**
9. **The felt vertical's own agreement is complete and buys nothing, and the reason is a read.**
   `?mountAgree=felt` takes `|feltAcross|` at frame 1 from **7.520–7.566° to 0.341–0.376°** and the first frame at
   which the felt vertical agrees with the face's normal from **0.217 s to 0.017 s — frame 1 — 24 of 24 and 18 of
   18** [M]. The glide's median moves **1.450 → 1.467 s** (one run of 24), and over the mount's whole window the
   roll row's columns are **identical: 0 differing over 21 648 column reads on 264 ticks, first differing at
   0.883 s** [M]. **The datum it repairs is not in the roll row's loop at the mount.**
10. **Four of my own ten predictions are refuted and a fifth is unanswerable, two of them caught by my own
    instruments before publication**, including
    a test whose first draft asserted a separation that does not survive a closed loop (§11) and a magnitude
    prediction that confused a filter's **seed** with its **frame-1 reading** (§8). **I have two switches, their
    sizes, their populations and a contradiction closed; I do not have the bar.**

## 1. (A) The four reads that had to come first

**R1 [R]. `?waterHeel=tilt` reaches `DesignWeights.waterHeel = 'both'`, and `'both'` is the word for two halves.**
`AttachedRider` maps `'tilt' → 'both'` and `'predict' → 'predict'` [R, `:2356–2360`], and `PredictiveController.tick`
does exactly two things with the flag: it propagates `predD · tilt` through the forward prediction over the sensing
delay, and — **only on `'both'`** — it hands `Γ_d · tilt` to `steadyTurn` as a known input on the equilibrium's
right-hand side, *"so the reference is the steady turn ON this face and not on flat water"* [R,
`predictiveBalance.ts:1424–1437`, `:1249`]. **The brief's "both places at once" is `'both'`, by reading, before any
arm ran.** §2 is the read that it also *works* — that the trim actually moves to the face.

**R2 [R]. The fourth cell did not exist, and that is the round's one real gap in item 1.** 3.3p shipped `'both'`
(prediction + reference) and `'predict'` (prediction alone) and inferred the reference's effect from their
difference. **There was no value that moves the reference alone**, so `?waterHeel=ref` is this round's addition: one
condition on the propagation line and one on the drive line, and `Design` unchanged, so all three values share one
design object. §3 and §4 are what it buys.

**R3 [R]. The mount's low-speed branch disagrees with the frame after it, for the new surfer, by the code's own
lines.** `reset` sets `banked = true` only above `PLANING_SPEED = 4` [R, `:2708`], and `planingStep` — which runs in
`prepare`, before the board's solve, on the **next** frame — ends with `if (this.freeBody) this.banked = true;`
[R, `:3305`]. **So for the new surfer the mount is the one frame of the whole ride that places the body plumb to the
world**, and `?mountAgree=deck` sets the same flag one frame earlier. It sets `banked` and **not** `planing`,
deliberately: the board is not planing and `planingStep` would flip a mounted `planing = true` back on that same
next frame.

**R4 [R]. The felt vertical's seed is the world's and the placement's argument is the face's, in two comments eleven
hundred lines apart.** `reset`: the body square to the deck *"as a body balances on a board sliding freely down its
face, **where the felt vertical is the face's normal**"* [R, `:2695–2697`]. `captureStep`: `if (this.pairFresh)
this.pairFelt.set(0, WATER.gravity, 0)` [R, `:4998`]. `?mountAgree=felt` seeds it instead at `g (n̂·ŷ) n̂` — the
specific force of a body sliding freely down a plane of normal `n̂`, which is that sentence written as a vector —
with `n̂` the water's own normal under the board, which `planingStep` has already set this frame [R, R3's own call
order]. **An initial condition of a first-order filter, not a force.**

## 2. (B) The trim the loop holds, as a column

Part 4 §4 reading 5 measured `|φ_ref|` at **exactly 0.0000°** at every one of 18 182 frames of eight arms and read
it as *"the trim the loop holds is the board level with the WORLD for the whole ride."* This is the same column on
the arms that move the reference.

| **[M]** every frame of every run | frames | \|φ_ref\| median, ° | \|φ_ref\| peak, ° | \|φ_ref\| frame 1, ° | the face's tilt, frame 1, ° | φ_ref / −tilt, frame 1 | exactly 0.0000 in |
|---|---|---|---|---|---|---|---|
| **the glide, the datum off** | 2 193 | **0.0000** | 0.000 | **0.0000** | 8.824 | 0.0000 | **1.000** |
| the glide, the prediction alone | 5 144 | 0.0000 | 0.000 | 0.0000 | 8.815 | 0.0000 | 1.000 |
| **the glide, the reference alone** | 4 144 | 6.794 | 15.655 | **9.1052** | 8.815 | **1.0373** | 0.091 |
| **the glide, both** | 845 | **8.887** | 14.248 | **9.1052** | 8.811 | **1.0378** | **0.000** |
| the owner's cell, the reference alone | 555 | 9.565 | 13.667 | 9.1052 | 8.979 | 1.0180 | 0.000 |
| the owner's cell, both | 497 | 9.375 | 12.992 | 9.1052 | 8.983 | 1.0174 | 0.000 |
| the three `?mountAgree` arms, either cell | 1 422–2 207 | 0.0000 | 0.000 | 0.0000 | 8.824–8.981 | 0.0000 | **1.000** |

**Four readings.**

1. **The trim does move to the face, and by the face's own size.** 9.1052° of reference against 8.811° of tilt,
   **1.0378 ×**, at frame 1 of every run of both reference-moving arms [M, 24 and 18 runs]. **The brief's item 1 is
   a switch that exists and has been ridden**, and §3 is what it does.
2. **The 3.8 % is not noise and it is not mine to explain.** `steadyTurn` solves the whole equilibrium of the
   tilt-driven plant, not a datum shift: `φ_ref` comes out beside a slip, a yaw rate, an ankle rest and a twist
   torque, all free [R, `:1409`]. That it lands within four per cent of the face is a property of that solve.
   **I measured it; I did not design it.**
3. **The 0.091 of exactly-zero frames on one arm is an identity, read rather than waved at.** All **377 of 377** of
   them have the face's tilt **exactly 0** — the board is off the face — so the drive is zero and the trim is the
   flat-water one [M]. Not a leak.
4. **And `?mountAgree` touches the trim in neither of its halves**: exactly 0.0000° in 1.000 of 1 422–2 207 frames on
   all six mount arms [M]. The two items of the brief are separable in this column, by measurement.

## 3. (B) The 2×2, and the refutation it was built for

| **[M]** median ride, s, the folder's own `qt(v, 0.5)` | runs | fell | the datum **off** | the **prediction** alone | the **reference** alone (new) | **both** |
|---|---|---|---|---|---|---|
| **the glide** (8 entries × 3 stances) | 24 | 24 of 24 in all four | **1.450** | **4.033** | **3.683** | **0.683** |
| the glide, its span | — | — | 1.083–2.683 | 1.117–5.817 | 0.833–4.350 | 0.217–1.117 |
| the glide, **Compress** | 8 | 8 of 8 in all four | 1.483 | 4.367 | 4.150 | 0.683 |
| **the owner's own low cell** (6 entries × 3) | 18 | 18 of 18 in all four | **1.033** | **0.967** | **0.483** | **0.433** |
| the low cell, its span | — | — | 0.500–6.233 | 0.150–5.983 | 0.117–1.317 | 0.133–0.900 |
| the low cell, its three slowest entries (1–3 m/s, 9 runs) | 9 | 9 of 9 | **0.617** | 0.183 | 0.133 | 0.150 |

**Five readings.**

1. **The round's own headline, and it is a refutation.** On the glide **each half alone nearly triples the ride and
   the two together halve it**: 1.450 → 4.033 (prediction) → 3.683 (reference) → 0.683 (both) [M, 24 runs a cell].
   3.3p's published sentence is *"the reference is the destabiliser, and that is a measured split, not a"* —
   **it is not a split; it is an interaction**, and the cell that shows it is the one that did not exist until this
   round.
2. **And the interaction is not small or marginal: it is a factor of five and six.** `both` is **0.17 ×** the
   prediction arm and **0.19 ×** the reference arm, on the same water, the same placement, the same entries and the
   same plant [M]. **Two corrections that each help, and hurt when combined**, which is what §5's near-cancellation
   predicts qualitatively and which I will not dress up as a mechanism.
3. **The owner's own cell orders them differently and I am not pooling them.** There the prediction's half is
   **−6 %** (1.033 → 0.967) and the reference's is **−53 %** (→ 0.483), and both is 0.433 [M, 18 runs]. On that cell
   3.3p's attribution is **upheld**. **The same switch, two cells, two answers** — and the glide is the cell with
   three times the settled population.
4. **Every datum arm costs the owner's own slow entries dearly.** 0.617 s → 0.133–0.183 s on all three [M, 9 runs
   each]. **Whatever the datum correction is for, it is not for the speeds the owner gets into position at.**
5. **My own P1 and P10 are upheld and my own P2 is refuted in both of its clauses.** P2 said the reference alone
   would fall **below** the shipped median and sit nearer `both` than `predict`. It sits **above** the shipped
   median (3.683 against 1.450) and nearer `predict` (|ln| gap 0.09 against 1.69) [M]. **Written down before the
   arms and wrong, in the half the brief called settled.**

## 4. (B) The rows, filtered and unfiltered, on both quantities

Two different things are printed and never divided by one another:
- **`rollRel`** — the roll row of **the model that arm actually ran**, which on a datum arm includes its own tilt
  input by the controller's own line [R]. A different model on a different trajectory in each arm.
- **`relFull`** — the **shipped** plant rebuilt at the controller's own exact point on that arm's trajectory. The
  same model everywhere, so it separates "which model" from "where on the wave this ride went".

| **[M]** the mount, `t < 0.2 s`, **unfiltered from frame 1** | n | **gm rel, the model run** | gm rel, the shipped plant | gm \|error\|, °/s² | **gm \|the game's row\|, °/s²** |
|---|---|---|---|---|---|
| **the glide, the datum off** | 264 | **39.002** | **32.429** | 1 188.9 | **30.5** |
| the glide, the prediction alone | 264 | **1.514** | 2.076 | 851.8 | 562.6 |
| the glide, the reference alone | 264 | **1.150** | 1.353 | 1 319.2 | 1 147.0 |
| **the glide, both** | 264 | **0.750** | 0.333 | **1 993.8** | **2 659.9** |
| the glide, both + both mount halves | 262 | 0.759 | 0.355 | 1 953.5 | 2 574.2 |
| **the owner's cell, the datum off** | 198 | **7.415** | **7.823** | 1 044.4 | **140.8** |
| the owner's cell, the prediction alone | 191 | 0.850 | 1.993 | 783.0 | 921.4 |
| the owner's cell, the reference alone | 176 | 0.987 | 1.172 | 1 256.7 | 1 273.8 |
| the owner's cell, both | 180 | **0.677** | 0.430 | 1 704.5 | 2 516.1 |
| **the owner's cell, `mountAgree=deck`** | 198 | **29.912** | 17.863 | 1 070.9 | **35.8** |
| the owner's cell, `mountAgree=felt` | 198 | 7.472 | 7.606 | 1 031.5 | 138.1 |
| the glide, either mount half or both | 264 | **39.002** | **32.429** | **1 188.9** | **30.5** |

| **[M]** the mount against the arm's **whole live population** (the folder's own filter) | mount, gm rel | all live, gm rel | ratio |
|---|---|---|---|
| the glide, off / `mountAgree=deck` / `=felt` / `=both` | 35.609 / 35.609 / 35.609 / 35.609 | 9.513 / 9.513 / 9.415 / 9.415 | **3.74 / 3.74 / 3.78 / 3.78** |
| the glide, prediction / reference / both / all on | 1.599 / 1.308 / 0.708 / 0.722 | 4.917 / 4.980 / 3.129 / 3.632 | **0.33 / 0.26 / 0.23 / 0.20** |
| the owner's cell, off / `=deck` / `=felt` / `=both` | 6.943 / 24.150 / 7.068 / 24.150 | 3.942 / 3.487 / 3.919 / 3.490 | **1.76 / 6.93 / 1.80 / 6.92** |
| the owner's cell, prediction / reference / both / all on | 0.872 / 1.078 / 0.655 / 0.475 | 6.443 / 4.159 / 3.064 / 2.570 | **0.14 / 0.26 / 0.21 / 0.18** |

**Six readings.**

1. **The control first: 32.429 and 7.823, to the digit.** The shipped-datum, shipped-mount arms of this round
   reproduce step 3.4d's own mount figures for the two-body plant exactly, on a fresh run through a different
   script [M, 264 and 198 ticks]. **Every other number in this table is read on a pipeline that passes that.**
   (Step 3.4d's §2 low-cell row prints **7.303**; recomputed from 3.4d's own dumps that is the **point-mass** arm
   and the two-body one is **7.823** — the row's plant was not named where its glide rows' were. Stated, not
   hidden.)
2. **The datum correction moves the mount's ratio by fifty-two times, and it is the denominator.** 39.002 → 0.750
   on the glide, while the game's own roll row goes **30.5 → 2 659.9 °/s², ×87**, and the model's own absolute
   error goes the **wrong way, 1 188.9 → 1 993.8** [M]. **On every datum arm of both cells the error in °/s² is
   within a factor of two of the shipped one or worse; only the quotient moves.** This is Part 4 §7 reading 2 again
   on a different switch: *"a window where the game's board is especially quiet"*, repaired by making it loud.
3. **The blend is not small at the mount, and that is new.** 3.3p measured the controller's eight-point blend
   against the plant rebuilt at its own point at **0.001–0.056** on the live window. At the mount it is
   **39.002 against 32.429 — 0.20** [M, the same 264 ticks]. **The quantity the folder has been quoting is the
   rebuilt plant's; the model the rider actually runs is a fifth worse there.**
4. **The filter hides the sign.** On the shipped datum the mount is the arm's **worst** window (1.76–3.78 ×); on
   every corrected arm it is its **best** (3.0–7.1 × better) [M, 16 arms]. **`t > 0.2` was chosen on one
   configuration and it does not describe another**, which is the second round running to find the premise of that
   filter wrong.
5. **My own P3 is refuted and in the direction that matters.** I predicted all three corrected arms would land
   between 1 and 20 at the mount. **Five of the eight go under 1** (0.475–0.987) [M]. I under-estimated the move
   because I was thinking about the numerator and the move is the denominator — **the same error §2 reading 2 of
   Part 4 names, made again by me, one round later.**
6. **And my own P4 is NOT upheld — it is unanswerable, because the arm it asks about does not live that long.**
   P4 asked whether any age bin **after 1.5 s** is worse on `both` than on the shipped datum. **On both cells
   `both` has no bin after 1.5 s at all**: its last is 1.0–1.5 s on the glide (21 ticks) and 0.6–1.0 s on the
   owner's cell (110), because the ride is over [M]. **A prediction with no population is not a prediction**, and I
   am recording it as unanswerable rather than scoring it either way. What the bins it does have say is that the row
   is better in each of them (the glide: **1.653** at 0.2–0.6 s against 9.120 off, **6.087** at 0.6–1.0 s against
   8.024) — **the window the shipped datum is worst in is the only window the corrected datum lives to see.**

## 5. (B) `?mountAgree=deck` — the four-metre-a-second contradiction, closed

| **[M]** the owner's own cell at frame 1, 3 runs an entry, the entry set absolutely | the board's roll, ° | the face's tilt, ° | the board's heel, ° | **the body's bank, °** | bank / roll |
|---|---|---|---|---|---|
| **as it ships**, entry 1 / 2 / 3 m/s | 8.338 / 8.334 / 8.329 | 9.050 / 9.016 / 8.980 | −0.712 / −0.682 / −0.651 | **−0.036 / −0.037 / −0.038** | **−0.004 / −0.004 / −0.005** |
| as it ships, entry 4 / 5 / 6 | 8.895 / 8.883 / 8.872 | 8.947 / 8.911 / 8.876 | −0.052 / −0.028 / −0.003 | **8.715 / 8.709 / 8.703** | 0.980 / 0.980 / 0.981 |
| **`mountAgree=deck`**, entry 1 / 2 / 3 | 8.933 / 8.919 / 8.906 | 9.050 / 9.016 / 8.982 | −0.117 / −0.097 / −0.075 | **8.745 / 8.732 / 8.723** | **0.979 / 0.979 / 0.979** |
| `mountAgree=deck`, entry 4 / 5 / 6 | 8.895 / 8.883 / 8.872 | 8.947 / 8.911 / 8.876 | −0.052 / −0.028 / −0.003 | 8.715 / 8.709 / 8.703 | 0.980 / 0.980 / 0.981 |

| **[M]** what it costs and buys | the shipped mount | `mountAgree=deck` | the move |
|---|---|---|---|
| the low cell's median ride, s (18 runs) | **1.033** | **1.167** | **+13 %** |
| its span, s | 0.500–6.233 | **0.833**–6.233 | the **minimum +67 %** |
| its three slowest entries' median, s (9 runs) | **0.617** | **1.000** | **+62 %** |
| Compress, fell / median s (6 runs) | 6 of 6 / 1.167 | 6 of 6 / **1.167** | **nothing** |
| **the mount's own roll row** (198 ticks, unfiltered) | **7.415** | **29.912** | **×4.0 worse** |
| the game's own roll row at the mount, °/s² | **140.8** | **35.8** | **×0.25** |
| the model's own absolute error at the mount, °/s² | 1 044.4 | 1 070.9 | ×1.03 |
| **the glide** (every entry above 4 m/s): ticks, median, row | 2 193 / 1.450 / 39.002 | **2 193 / 1.450 / 39.002** | **identical** |

**Five readings.**

1. **The contradiction is closed exactly and per run, not per median.** The nine 1–3 m/s runs go from a body bank
   at frame 1 of **[−0.039°, −0.036°]** to **[8.723°, 8.745°]** against the 4–6 m/s band's **8.703–8.715°** —
   inside 0.5° in **9 of 9** [M]. **P6, written before the arm, upheld.**
2. **It is the largest move toward the owner's bar in this round, and it is small.** 1.033 → 1.167 s on the cell,
   0.617 → 1.000 s on the three entries the owner uses getting into position, and the cell's **worst** ride up
   two thirds [M, 18 and 9 runs]. **P9, upheld.** It is also not nine seconds and Compress does not move at all.
3. **And it makes the roll row four times worse on the same runs.** 7.415 → 29.912, because the game's own row at
   the mount falls to **a quarter** (140.8 → 35.8 °/s²) while the model's error barely moves (×1.03) [M]. **A body
   placed in its own equilibrium leaves the board quieter, and a quieter board is a bigger quotient.** This is the
   round's cleanest case of **a row and a ride moving in opposite directions on the same arm**, and I am reporting
   both rather than picking the flattering one.
4. **The glide is a null by construction and that is the switch's own positive control.** Every glide entry is above
   `PLANING_SPEED`, so the branch never fires: **2 193 ticks and all 24 fall times identical to the shipped arm to
   the digit**, and the mount's row **39.002 against 39.002** [M]. A switch that cannot act where it should not act,
   read rather than argued.
5. **I am not claiming which placement is right.** The game's own argument is for square-to-the-deck [R, §1 R4] and
   this arm is that argument applied at every speed; the other side of the contradiction — placing the body plumb
   at **every** speed — is not built and not measured here, and it is the owner's call which side of a stated
   physical argument to move.

## 6. (B) `?mountAgree=felt` — the agreement that is complete and buys nothing

| **[M]** the felt vertical at frame 1 | as it ships | `mountAgree=felt` |
|---|---|---|
| the glide, \|the angle across the deck\|, ° (24 runs) | **7.520–7.566** | **0.341–0.376** |
| inside 1.5° of the face's normal | **0 of 24** | **24 of 24** |
| the owner's cell, \|the angle across the deck\|, ° (18 runs) | 7.519–7.578 | **0.324–0.376** |
| inside 1.5° | **0 of 18** | **18 of 18** |
| its magnitude, m/s² (the glide) | 9.524–9.553 | **9.342–9.362** |
| **the first frame the felt vertical agrees with the face's normal within 1°** | **0.217 s**, 24 of 24 | **0.017 s — frame 1 —** 24 of 24 |
| the same, the owner's cell | 0.233 s, **10 of 18** | **0.017 s**, 18 of 18 |
| the glide's median ride, s | 1.450 | **1.467** |
| the owner's cell's median, s / its three slowest | 1.033 / 0.617 | **1.033 / 0.633** |
| the mount's own roll row, the glide / the cell | 39.002 / 7.415 | **39.002** / 7.472 |
| **the roll row's columns over the glide's mount** | — | **0 differing of 21 648 reads, 264 ticks** |
| the glide's first differing tick | — | **t = 0.883 s** |
| the owner's cell's first differing frame | — | **t = 0.117 s**, the frame the loop first sends anything |

**Four readings.**

1. **The disagreement is removed outright, at frame 1, in every run of both cells.** The felt vertical goes from
   7.52–7.58° away from the face's normal to 0.32–0.38°, and the settling time Part 4 measured at 0.250 s becomes
   **one frame** [M, 24 and 18 runs]. **The mount now says the same thing twice**, which is what the brief asked
   for.
2. **And the ride does not care.** The glide's median moves by **one run of 24** (1.450 → 1.467) and the owner's
   cell's not at all; its three slowest entries move 0.617 → 0.633 s [M]. **A measured result with the bar
   unmoved.**
3. **The reason is a read, not a shrug: on the glide the felt vertical is not in the roll row's loop at the
   mount.** Every roll-row column of the per-tick dump is **identical over the mount's whole window — 0 of 21 648
   reads — and the ride first differs at 0.883 s** [M]. The felt vertical's route is the capture point: `ω₀`, the
   margin, the fall test. **On the owner's own cell it is not an identity** — the first differing frame is
   **0.117 s**, the frame the loop first sends a command, and the mount's ratio moves 7.415 → 7.472 (+0.8 %) [M].
   **Two cells, two answers again, and the second one is stated without a mechanism.**
4. **My own P7 is half upheld and half refuted, by my own column.** The angle half holds in 42 of 42 runs. The
   magnitude half — "9.69 ± 0.10, which is `g cos 8.81°`" — is **refuted: 9.342–9.390 m/s²** [M]. `g (n̂·ŷ)` **is**
   9.694, but that is the **seed**, and the column is **frame 1, already low-passed** over
   `SPECIFIC_FORCE_TIME = 0.1 s`; the shipped seed of 9.81 reads 9.524–9.553 there by the same arithmetic.
   **"A step-averaged quantity is not an instantaneous one" in a new dress: a filter's seed is not its first
   reading.** And Part 4 §4 reading 4's *"ω₀ is 8 % high at the mount"* is **not** repaired by this switch:
   `ω₀ ∝ √|felt|` and the magnitude goes from 9.53 to 9.35 against a settled 8.13, i.e. from **8 % to 7 %** high.

## 7. (B) The combination, and the owner's bar

| **[M]** 336 rides, 16 arms, the deck filter | runs | fell | median, s | span, s | Compress fell | Compress median, s |
|---|---|---|---|---|---|---|
| **the glide**: off / predict / ref / both | 24 each | **24 of 24 each** | 1.450 / 4.033 / 3.683 / **0.683** | 1.083–2.683 / 1.117–5.817 / 0.833–4.350 / 0.217–1.117 | **8 of 8 each** | 1.483 / 4.367 / 4.150 / 0.683 |
| the glide: `=deck` / `=felt` / `=both` / **all on** | 24 each | 24 of 24 each | 1.450 / 1.467 / 1.467 / **0.683** | 1.083–2.683 ×3 / 0.167–1.117 | 8 of 8 each | 1.483 / 1.483 / 1.483 / 0.683 |
| **the owner's cell**: off / predict / ref / both | 18 each | **18 of 18 each** | **1.033** / 0.967 / 0.483 / 0.433 | 0.500–6.233 / 0.150–5.983 / 0.117–1.317 / 0.133–0.900 | **6 of 6 each** | 1.167 / 1.050 / 0.483 / 0.433 |
| the owner's cell: `=deck` / `=felt` / `=both` / **all on** | 18 each | 18 of 18 each | **1.167** / 1.033 / **1.167** / 0.733 | 0.833–6.233 / 0.500–6.233 / 0.833–6.233 / 0.167–0.917 | 6 of 6 each | 1.167 / 1.167 / 1.167 / 0.783 |

**Four readings.**

1. **The bar is not met in any arm.** 336 of 336 rides ended; **Compress fell in 112 of 112** [M]. The owner's bar
   is *"Compress must never fall at the low speeds of getting into position, 100 %"*, and the best this round has is
   a Compress median of **1.167 s** on the owner's own cell, which is the shipped one.
2. **The combination is not the sum, and P10 is upheld.** All on is **0.683 s** on the glide and **0.733 s** on the
   cell — worse than four of its five components on the glide and than six of seven arms on the cell [M].
   **The datum's collapse dominates the mount's gain wherever both are on.**
3. **`mountAgree=both` is `deck` to the digit on the cell** — 1.167 s, the same span, the same 24.150 mount row,
   the same 1 607 ticks [M] — which is a third, independent read that the felt half does not reach the ride there
   in any way the fall sees.
4. **And every number in this table is the deck filter's, on the folder's own median.** `qt(v, 0.5)`, the upper
   element of the middle pair [R]: a symmetric median would print 0.950 where this folder prints 1.033 for the
   same eighteen numbers, which is 3.4d's own last bullet and is why `datum.ts` carries the convention with a
   comment.

## 8. What I refuted

- **The brief's own first premise, by one column.** *"3.3p changed only the first and it got worse; both together
  has never been measured."* `?waterHeel=tilt` **is** both together — the trim it holds is **9.1052°** against a
  face tilt of 8.811°, `1.0378 ×` it, where the shipped trim is **exactly 0.0000°** in 1.000 of 2 193 frames — and
  3.3p rode it and published its median, 0.283 s. **Thirtieth consecutive round to find its brief's premise wrong,
  and tenth to find it in the half the brief called settled.**
- **3.3p's own attribution, *"the reference is the destabiliser, and that is a measured split"*, by the cell that
  was missing.** On the glide the prediction alone gives **4.033 s** and the reference alone **3.683 s** against
  **1.450** shipped, and the two together **0.683** [M, 24 runs each]. **Each half helps and the pair hurts.** It
  was never a split; it is an interaction, and a difference of two arms that differ in both halves cannot see one.
- **My own P2, in both clauses.** The reference alone was predicted below the shipped median and nearer `both`; it
  is **above** it and nearer **`predict`** [M].
- **My own P3, by a factor I had the wrong end of.** Predicted 1–20 at the mount for all three corrected arms;
  **five of eight go under 1** (0.475–0.987). I was reasoning about the model's error, and the move is the game's
  own row — **Part 4's own reading, repeated as my own mistake one round later.**
- **My own P5, as written.** "More than a factor of three on every datum arm of both cells": the owner's cell with
  the datum **off** is **1.76** [M]. What survives is better than the prediction: the **direction** flips, 1.76–3.78
  worse on the shipped datum and 3.0–7.1 **better** on every corrected one.
- **My own P4, which turns out to be unanswerable rather than right or wrong**, because the arm it asks about has
  no age bin after 1.5 s on either cell: the ride is over first (§4 reading 6). Recorded as unanswerable.
- **My own P7's magnitude half, by confusing a seed with a reading.** `g (n̂·ŷ)` is 9.694 and the frame-1 column is
  **9.342–9.390** [M], because the frame-1 column has already been low-passed; the shipped 9.81 seed reads
  9.524–9.553 by the same arithmetic.
- **This round's own first test draft, by the test itself, before it was committed.** The 2×2 separation
  (`'ref'` leaves the prediction alone, `'predict'` leaves the trim alone) was first asserted over forty ticks and
  **failed**: a moved trim sends different commands, and the commands enter the forward prediction, so **the two
  halves are separable in the controller's line and not along a trajectory.** Read at the first tick — where the
  sense line is shorter than the delay, the estimate is zero and no command has been sent — it is an **identity**,
  and the test now says so with the reason in its comment.
- **`ledgerApart` as a closure.** Part 4's §12 C5 lists the folder's exact-zero closures and this round's first
  summary printed `ledgerApart` beside them at **16**. It is **a count of substeps the standing solve did not
  decide** [R, `bankLedger.ts:189`], not a residual. **`datum.ts` now prints it apart, with its meaning.**
  A sixteen there is sixteen substeps.

## 9. What I will not claim

- **I will not claim the bar is any closer.** 336 of 336, Compress **112 of 112**, and the one arm that moves the
  owner's own cell moves it from 1.033 to 1.167 s.
- **I will not claim the datum correction repairs the model.** On every corrected arm the model's own absolute
  error at the mount is **within a factor of two of the shipped one or worse** (851.8–1 993.8 against 1 044.4–1 188.9
  °/s²); what moves is the quotient, by the game's own row going up 18–87 times. **A quotient is not a model.**
- **I will not claim a mechanism for the interaction.** Two corrections that each nearly triple the glide and halve
  it together is a measured fact with a plausible shape (§5 of Part 4: the row is the small difference of two large
  terms of opposite sign) and **I did not measure that shape on these arms**, so it stays a fact.
- **I will not claim which side of the mount's contradiction is right.** `?mountAgree=deck` applies the game's own
  stated argument at every speed and lengthens the owner's own cell by 13 % while making its roll row four times
  worse. The other side — plumb at every speed — is not built here. **The owner's call.**
- **I will not claim `?mountAgree=felt` does anything for the ride.** It closes the mount's own 0.25 s disagreement
  in 42 of 42 runs and moves one glide run of 24.
- **I will not claim either new switch should be on by default.** Both are opt-in, off by default, pinned off for
  online rooms, and the datum ones halve the owner's own cell.
- **I will not claim the two-body plant is better or worse here.** Every arm of this round runs it, because the
  owner rides it; nothing here is an argument for reverting it.
- **I will not offer any bot ride as evidence of feel**, anywhere in this document.
- **Carried, flagged, not mine, not touched**: `steadyTurn`'s own reference on a **steered** arm (Part 4's median
  43.7–44.7°, peak 2 249°) — this round ran no steered arm, so it adds nothing to that flag and does not close it;
  the `cos³` added-mass frame defect; `AttachedRider.frame`'s 70° bank clamp; the live point-mass `ω₀` in
  `HumanBalance.capture`, which §6 reading 4 measures as 8 % high at the mount off and **7 %** high with
  `mountAgree=felt`; the `live` filter itself, which this round refutes for the second time and does not change.

## 10. The controls

**C1, the shipped rider is byte-identical with every switch off, over 14 658 column reads.** This round's two
shipped-datum, shipped-mount arms against step 3.4d's own `two-off-unsteered` and `two-off-low`, column by column
over every shared column of the per-run summary: **24 runs × 349 columns = 8 376 reads, 0 differing**, and
**18 × 349 = 6 282 reads, 0 differing** [M]. The two columns `wheel` and `mount` are this round's own and are
excluded **by name**, which is stated rather than hidden.

**C2, the mount's own window reproduces 3.4d to the digit on a different script.** `relFull` over `t < 0.2 s`:
**32.429** on the glide (264 ticks) and **7.823** on the owner's cell (198), against 3.4d's own published 32.429 and
its own dumps' 7.823 recomputed here [M].

**C3, `?mountAgree=deck`'s own null.** On the glide every entry is above `PLANING_SPEED`, so the branch cannot fire:
**2 193 ticks and 24 fall times identical to the shipped arm** [M].

**C4, `?mountAgree=felt`'s own identity at the mount.** Every roll-row column over the glide's mount window:
**0 differing of 21 648 reads on 264 ticks**, first difference at **0.883 s** [M].

**C5, the 2×2 is an identity at the first tick, asserted in the suite.** `predictiveBalance.test.ts`: with a 10°
tilt, the shipped trim is **exactly zero in every entry**, `'predict'`'s trim **equals** the shipped one entry for
entry, `'both'`'s **equals** `'ref'`'s, the shipped prediction is **exactly zero in every entry**, `'ref'`'s
**equals** it and `'both'`'s **equals** `'predict'`'s. And the existing control holds for the new value: with the
tilt handed in as **zero**, `'ref'` sends the same commands as the flag off over forty ticks, and with a 10° tilt it
does not.

**C6, the folder's own closures on all sixteen arms** (peaks over every arm): the sense reconstruction **exactly 0**,
the tick spacing **exactly 0**, the ledger's split, closure and residual **exactly 0** [M]. `ledgerApart` is printed
apart as **a count** (peak 16 substeps) and is not a closure (§8).

**C7, 3.4a's zero-inertia cost control, both halves, re-run on this tree.** Over the **306 points of the schedule**
the game reads: the shipped-weights fix against the shipped design, **worst entry 0.000e+0**, and non-vacuous with
the two weights on (smallest relative move **1.193 × 10⁻²**) [M, `3.4/cost.ts`] — Part 4's own figures.

**C8, the predictions were written before the arms**, in `results/34e/34e-predictions.md`, committed in `81ba9f9a`
before the first arm ran; **four of the ten are refuted** (§8) and the refutations are in this document rather than
in the file. The one read taken **before** the predictions — a single `WHEEL=tilt` run to read `refPhi` — is declared
as a read in that file's own first section, because it chose the round's direction.

## 11. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probes type-checked **separately** on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming **672 files** including
  `3.3/plant.ts`, `3.4/datum.ts`, `3.4/mount.ts`, `3.4/cost.ts`, `3.4/row.ts`, `src/physics/bankLedger.ts`,
  `src/physics/predictiveBalance.ts`, `src/physics/AttachedRider.ts` and `@types/node`.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran and every exit code
  above is `tsc`'s own, read on its own line and never through a pipe.
- `vitest run src/physics`: **58 files, 635 passed, 21 expected fail** — Part 4's 634 plus this round's one new test.
  `vitest run src/game src/scene/rig`: **70 files, 736 passed** — Part 4's 735 plus this round's one.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail** — the
  same as Part 4.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: nothing in this round touches the solver, the sea, the
  snapshot or any spot's configuration, and the Canyon byte check below is the stronger read of the same thing.
- **The Canyon byte check, run because `src/` DID change**, with the brief's three reads done rather than assumed —
  the wrapper prepends `globalThis.location = { search: … }`, the **grid line** is read, and the **"spun up on the
  CPU in … s" line** is read so that no kept `.sea` can have been imported silently. §11b.

### 11b. The Canyon byte check

| **[M]** 3 600 steps, fresh spin-up, this branch | grid | spin-up | snapshots | state |
|---|---|---|---|---|
| **Canyon B** (`?canyonWaves=true`) | 400 × 451 | **78.6 s** | **`a367d938f15fa934`** | **`9e5831f80e38abd9`** |
| the brief's own reference | 400 × 451 | — | `a367d938f15fa934` | `9e5831f80e38abd9` |
| **the default Canyon** | 400 × 507 | **62.9 s** | **`ea3d57a4d49f4b48`** | **`a1a2555739210f96`** |
| the brief's own reference | 400 × 507 | — | `ea3d57a4d49f4b48` | `a1a2555739210f96` |

**All four hashes are the brief's own references, to the character**, on seas spun up fresh in this round's own
scratchpad — the spin-up lines are 78.6 s and 62.9 s and are read, so neither run imported a kept `.sea` (Part 2
§11b's own trap, which cost that round an hour). The raw record, with the grid and spin-up lines in place, is
`results/34e/34e-canyon-byte-check.txt`.

**And it cannot differ, for a reason that is read and not inferred.** Every behavioural line of this round is behind
one of two flags that no default sets: `DesignWeights.waterHeel === 'ref'` (a condition on two lines of `tick`,
`undefined` unless `?waterHeel` is one of its three values) and `AttachedRider.mountDeck` / `.mountFelt` (both
`false` unless `?mountAgree` is one of its three values). With both off, `tick`'s propagation condition is the same
`if (d.predD)` it was, `drive` is `undefined` as it was, the mount's `else if` is not taken and the felt vertical's
seed is `this.pairFelt.set(0, WATER.gravity, 0)` — the line that shipped. C1's 14 658 column reads are the
measurement of that reading.

## 12. Files (3.4e)

- `src/physics/predictiveBalance.ts` — `DesignWeights.waterHeel` widened to `'both' | 'predict' | 'ref'`, and the
  two lines in `tick` that make the 2×2: the tilt's propagation gated on the value instead of on `predD`'s
  presence, and the reference's drive taken on `'both'` **or** `'ref'`.
- `src/physics/AttachedRider.ts` — `AttachedRiderOptions.waterHeel` widened with `'ref'`; the new
  `AttachedRiderOptions.mountAgree: 'deck' | 'felt' | 'both'` with `mountDeck` and `mountFelt` behind it; the
  mount's own `else if` that places the standing body square to the deck at any entry speed; the felt vertical's
  seed at the face's own normal.
- `src/game/PhysicalMode.ts` — `waterHeelSwitch` accepts `ref`; **`mountAgreeSwitch`** and its line in the config.
- `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`, `src/physics/RideSession.ts` — `mountAgree`
  carried end to end, and `waterHeel`'s type widened in each.
- `src/main.ts` — `mountAgree: undefined` in the online room's overrides, and its clause in the comment that names
  every pinned switch.
- `src/game/PhysicalMode.test.ts`, `src/physics/predictiveBalance.test.ts` — the switch's own address tests
  (`?mountAgree`, `?waterHeel=ref`, the room's pin read out of `main.ts`) and the 2×2 identity at the first tick.
- `docs/research/new-rider/3.3/plant.ts` — `WHEEL=ref` and **`MOUNTA=deck|felt|both`**, and `wheel` / `mount`
  columns on all three dumps so no pooled read can mix arms. **Read-only.**
- `docs/research/new-rider/3.4/datum.ts` — **new**: the analysis. The trim as a column, the rows per arm per filter
  on both quantities, the mount's own frame 1 per entry speed, the settling reads, the falls on the folder's own
  median, and the controls. It reads the `.jsonl` dumps and imports **nothing** from `src/`.
- `docs/research/new-rider/3.4/results/34e/` — the sixteen arms as `.jsonl` (per run), `.ticks.jsonl.gz` (per tick)
  and `.mount.jsonl.gz` (per frame), with `34e-summary.txt` (every table above, generated), `34e-predictions.md`
  (ten predictions as written **before** their arms) and `34e-canyon-byte-check.txt`. **The per-tick and per-frame
  dumps are kept in full for all sixteen arms, gzipped**: 13 MB against 64 MB raw, every figure in this Part is
  read from one of them, and the generated summary is **byte-identical** read from the raw dumps and from the
  gzipped ones (`md5 a5344dabc471ac8af845bbd4dc0bf82b` both ways) — the read that says the compression lost
  nothing. The per-arm `.log` files (the probe's own console tables, every figure in them also in a dump) are the
  one thing not kept.
- `docs/research/new-rider/3.4/README.md` — this Part.

## 13. For the owner, in plain words — and the shot list

**Last round I told you the next thing to try was "the datum in both places at once". I was wrong about why: it was
already there.**

**One: the repair I recommended last round is a switch that already exists, and we already know what it does.**
`?waterHeel=tilt` already does both halves — I checked the number the rider is steering toward and it really does
move from "board level with the world" to "board flush with the wave face". It was built and ridden eight months of
rounds ago, and it drops him faster. **My own last-round recommendation was a thing on the shelf.**

**Two: so I built the one piece that was genuinely missing, and it says something nobody expected.** The correction
has two halves — what he *predicts* and what he *aims at*. Nobody had ever run the second half on its own. I did.
**Each half on its own nearly triples his ride on the test wave — one and a half seconds to about four. Both halves
together cut it to two thirds of a second.** Two fixes that each help, and hurt when you combine them. I do not have
an explanation for that and I am not going to invent one; I have the measurement, on twenty-four rides a case.

**Three: and on your own slow speeds the answer is different again**, which is why I am not giving you one number.
There the prediction half does nothing and the aiming half halves the ride.

**Four: the mount's own contradiction is closed, and it is the only thing in this round that helps you.** Below four
metres a second the game was standing him up with his body upright to the world, and above it leaning with the
deck — and then changing its mind on the very next frame. `?mountAgree=deck` makes it one rule. **Your own test cell
goes from a one-second ride to one and one sixth, and the three slowest entries — the speeds you use getting into
position — from about six tenths of a second to a full second.** The worst ride of the eighteen goes up by two
thirds.

**Five: and the honest part, twice.** That same switch makes his *internal model* four times worse at the moment he
stands up — because standing him up already balanced leaves the board almost still, and "almost still" is a very
small number to divide by. The ride got longer and the error got worse, on the same eighteen rides. I am telling you
both. **And the other mount fix — making the vertical he feels at the instant he stands up be the wave's and not the
world's — works perfectly and changes nothing you could feel: one ride of twenty-four moved by a sixtieth of a
second.** It turns out that reading does not reach his balance's commands at all for the first nine tenths of a
second; it only reaches the test for whether he has fallen.

**Your bar is not met.** 336 test rides, 336 ended, Compress fell in all 112 of its own.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your test spot, `?rider=new&feltFrame=deck&riderBody=two` — the body you said feels
human, on everything.

1. **Add `&mountAgree=deck` and stand up slowly.** Paddle into position, stand up at the slowest speed you can, and
   do it ten times. My numbers say the first moment should feel different — he starts already leaning with the deck
   instead of bolt upright — and that his slowest stand-ups last about half again as long. **Does standing up slowly
   feel less like being thrown?** That is the one thing a bench cannot tell me.
2. **Then the same thing without it, back to back.** It is one character in the address and the glide is unchanged
   by it, so the only difference you can feel is the slow stand-up itself.
3. **Do NOT bother with `&waterHeel=tilt`.** It halves your own cell and cuts the glide to two thirds of a second.
   `&waterHeel=predict` or `&waterHeel=ref` on the glide is the interesting ride if you are curious — each nearly
   triples it — but both are worse than nothing at your slow speeds.
4. **And a ruling, not a ride.** What I think step six is, in order:
   - **The interaction, not another datum.** Two halves that each help and together hurt is the one new fact of this
     round, and it is the shape of a cancellation. The instrument for it exists: Part 4 §5's own term table, run on
     the four datum arms rather than on the shipped one. **That is a measurement, not a build, and it is one round.**
   - **The other side of the mount's contradiction.** I applied the game's own argument at every speed. Nobody has
     measured the opposite — the body plumb to the world at **every** speed — and it is the same one line. On your
     own cell the whole ride is the mount, so the cheap experiment is worth having.
   - **Not the gains, not the cost, not the body, and not the `live` filter.** Parts 3 and 4 settled the first three;
     the filter is now refuted twice and changing it would re-date every number in the folder, which is a job and
     not a step.
   **My recommendation is the first, then the second. Your call.**

## 14. The deletions column, read line by line

`git diff --numstat` against `main`, read file by file. **Twenty-four deletions, and every one is a line re-emitted
in place with something added.** Read as a column, file by file:

```
  23   3  docs/research/new-rider/3.3/plant.ts
 627   0  docs/research/new-rider/3.4/README.md
 288   0  docs/research/new-rider/3.4/datum.ts            (new)
  35   2  src/game/PhysicalMode.test.ts
  23   3  src/game/PhysicalMode.ts
   2   2  src/main.ts
  59   6  src/physics/AttachedRider.ts
   9   1  src/physics/RideSession.ts
  42   0  src/physics/predictiveBalance.test.ts
  21   5  src/physics/predictiveBalance.ts
   1   1  src/wave/SurfZoneRunner.ts
  10   1  src/wave/SurfZoneSimulation.ts
   … and 51 files under docs/research/new-rider/3.4/results/34e/, insertions only
──────────────────────────────────────────────
63 files, 2 251 insertions, 24 deletions
```

`git diff --cached --numstat main -- src/ server/` is **nine files and 21 of the 24 deletions** (the other three are
the probe's own `Env:`, doc and `WHEEL` lines); `server/` is empty on both sides.

- **`src/physics/predictiveBalance.ts`, 5.** `DesignWeights.waterHeel`'s type line and its "Two values" doc line,
  both re-emitted (`'both' | 'predict' | 'ref'`, "**Three** values"); `tick`'s propagation line, re-emitted with
  `&& this.weights?.waterHeel !== 'ref'` and **nothing else changed** (`d.predD`, `jj`, `N`, `i`, `n`, `xh`,
  `predD[jj][i][0]`, `tilt` all present); its comment line, re-emitted; and the `drive` line, re-emitted as
  `refHeel` plus the same `d.gammaD.map((row) => row[0] * tilt)`.
- **`src/physics/AttachedRider.ts`, 6.** `AttachedRiderOptions.waterHeel`'s type line and its doc line, re-emitted
  with `'ref'`; `this.waterHeel = …`, re-emitted with `|| options.waterHeel === 'ref'`; the `heelWeights` type and
  ternary lines, re-emitted with the third branch; and `this.pairFelt.set(0, WATER.gravity, 0)`, re-emitted
  **unchanged** inside an `else`. The felt vertical's shipped seed is therefore still the exact expression it was.
- **`src/game/PhysicalMode.ts`, 3**: `waterHeelSwitch`'s signature, its `return` line and one doc line, all three
  re-emitted with `ref` added and every other value kept (`'tilt'`, `'predict'`, `devParam`, `trim`,
  `toLowerCase`).
- **`src/main.ts`, 2**: the online-room override line and its comment line, both re-emitted with `mountAgree` in
  them and **every other switch still named** — checked as a column, not by eye: the override line's **75** names
  are all 75 still there with `mountAgree` the 76th, and the comment line's **19** are all 19 with `mountAgree` the
  20th.
- **`src/wave/SurfZoneRunner.ts`, 1** and **`src/wave/SurfZoneSimulation.ts`, 1** and
  **`src/physics/RideSession.ts`, 1**: one line each, re-emitted with `mountAgree` spliced in beside `waterHeel`
  and nothing dropped.
- **`src/game/PhysicalMode.test.ts`, 2**: the import line (extended with `mountAgreeSwitch` — its **68** names are
  all 68 still there, read as a column, with the new one the 69th) and the `waterHeel` negative-case loop (extended
  with `'?waterHeel=reference'`, all six original cases kept).
- **`docs/research/new-rider/3.3/plant.ts`, 3**: the `Env:` line, the `WHEEL` doc line and the `WHEEL` constant,
  all three re-emitted with `ref` and `MOUNTA` — `'tilt'`, `'predict'`, `process.env.WHEEL` and `undefined` all
  still present.
- **Every other file is insertions only, zero deletions**: `docs/research/new-rider/3.4/datum.ts` (new),
  `src/physics/predictiveBalance.test.ts`, `docs/research/new-rider/3.4/README.md` (this Part appended, Parts 1 to
  4 untouched) and the results folder.
- **And one line was deleted after it was written and before it was committed**: the forty-tick body of this
  round's own 2×2 test, replaced by the first-tick read when the forty-tick version refuted its own assertion
  (§8). It does not appear in the diff because it never reached a commit, and it is recorded here rather than left
  out.

## 0. The ten sentences the round is for

1. **The owner's bar is NOT met in any arm. 533 of 534 rides ended before nine seconds and Compress fell in 177 of
   178** [M], over twenty-four arms, and the one survivor is a single `s24-ref` Compress run. Nothing in this round
   moves the bar and nothing in it was built to: it is a measurement.
2. **The brief's premise is false. The two halves do not cancel — they ADD.** The command's own last line puts the
   prediction half at `−K·Δx̂` and the reference half at `+Δu_ref + K·Δx_ref` [R], and `K·Δx̂` and `K·Δx_ref` come
   out with **opposite** signs, so the two contributions share one. `tiltSameSign` is **0 in 56 757 of 56 757 ticks
   of 24 arms** [M]. `cancelShare = |both| / max(|pred|, |ref|)` is **1.575–1.686 on every arm and every window** —
   over one everywhere, which is a reinforcement of about one and six tenths.
3. **And it is exact in the game's own `tick`, not just in my arithmetic.** Four shipped controllers, one tick each,
   the same sense line and a 10° tilt: the raw ankle command is **0.000000000 / 0.155631330 / 0.344847850 /
   0.500479180 rad** on off / predict / ref / both, and
   **`|raw_both + raw_off − raw_predict − raw_ref| = 0.000e+0`** [M]. On the rides themselves, at frame 1, per run,
   the same residual is **1.000 × 10⁻⁶ — the dump's own rounding — in 24 of 24 and 18 of 18 runs** [M].
4. **The brief's named instrument cannot contain the interaction, and the reason is one word: monotone.** Part 4 §5's
   term table at the mount, unfiltered, across off / predict / ref / both: the model's water term **2 693 → 2 810 →
   2 956 → 3 044**, the game's **248 → 749 → 1 154 → 1 305**, the model's row **954 → 1 762 → 2 823 → 3 470**, the
   game's row **32 → 542 → 1 035 → 2 901 °/s²**, and the signed medians likewise [M, 288 ticks an arm]. **Every
   column rises in that order while the rides go 1.450 → 4.033 → 3.683 → 0.683 s. A monotone instrument cannot
   explain a non-monotone fact**, and the phantom is the one column that nearly refuses to move at all
   (2 280 → 2 023, falling).
5. **The reach is proportional to the face's own tilt, measured to two per cent over a 3.4-fold range.**
   `gm |rowTiltBoth| / gm |tilt|` at the mount is **202.02–202.13** on an 8° face, **203.44–203.70** on the 16° one
   and **204.17–206.00** on a 24° one, at tilts of 4.06°, 8.22° and 12.04–14.06° [M, 288 ticks an arm, 12 arms].
   **P13, written before those arms ran, upheld.**
6. **So the face sweep was built, and it refutes the fact the brief handed me.** *"Two halves that each help"* is a
   property of the 16° face. On an 8° face **neither half helps**: off **4.600**, predict **3.300**, ref **3.000**,
   both **2.250 s** [M, 24 runs an arm]. On a 24° face one helps and one hurts: **0.917 / 1.600 / 0.833 / 0.233**.
7. **What does reproduce is `both`.** Against its own cell's shipped-datum arm, `both` is **×0.47 (glide), ×0.42
   (the owner's cell), ×0.49 (8°) and ×0.25 (24°)** [M, 4 cells, 84 runs]. **It is the worst of the four in all
   four cells, and it roughly halves the ride wherever it is on.** That is the interaction, and it is the sum.
8. **The ankle's own bound is exactly where the sum lands — and the bound is NOT why `both` falls.** The bound is
   `ANKLE_REST_RANGE = 0.25 rad = 14.32°` at **every one of 56 757 ticks** [M], and at frame 1 `both` asks
   **1.805 × it on the glide and 2.315 × on the owner's cell**, on the bound in **24 of 24 and 18 of 18 runs** and
   in **0.462 and 0.783** of the mount's first twelve frames [M]. **`?ankleRange=wide` doubles the bound and buys
   nothing**: the glide goes **1.450 → 1.467, 4.033 → 4.033, 3.683 → 3.700, 0.683 → 0.717 s** — every arm one run of
   24 — while the bound stops binding (`both` on it in 0.010 of the mount, from 0.462) [M]. **My own P17 is refuted,
   and the 8° face says the same thing independently**: there `both` is never clamped (ask/bound **0.862**, on the
   bound in 0.010) and still rides **×0.49**.
9. **Two cells and two faces disagree about everything except that, so nothing here is pooled.** The ratio
   `|K·Δx_ref| / |K·Δx̂|` at the mount is **0.954–0.959 on the glide and 0.780–0.835 on the owner's own cell** —
   **smaller** on the cell, which refutes my own P4 as written, the one prediction I called the positive control.
   What survives in its place is **the ask against the bound**: 0 / 0.545 / 1.251 / 1.805 on the glide against 0 /
   0.888 / 1.427 / 2.315 on the cell [M].
10. **Of my own twenty predictions, eight are upheld, nine are refuted, one is convention-dependent and two are half
    each** (§8), and the nine include **both of the first two, which were the brief's premise written in my own
    hand**, and **P17, which was this round's own discriminator.** I have a mechanism measured four ways, a
    proportionality to 2 %, a named instrument shown to be the wrong instrument for the question, and the obvious
    remedy refuted. **I do not have the bar, and I built nothing.**

## 1. (A) The four reads that had to come first

**R1 [R]. The command's own last line, and the two places the tilt reaches it.** `PredictiveController.tick` ends
`u_q = ref.u_q − b̂_q − Σ_j K_q[j] (x̂_j − x_ref,j)` and then clamps [R, `predictiveBalance.ts:1453–1462`]. The
datum's two halves enter that line in two different places: the **prediction** half adds
`Δx̂_i = Σ_{jj<N} predD[jj][i][0]·τ` to the estimate and nothing else [R, `:1438`], and the **reference** half hands
`drive_i = gammaD[i][0]·τ` to `steadyTurn` on the equilibrium's right-hand side [R, `:1442`, `:1261`], which moves
`x_ref` **and** `u_ref`. `τ` is the face's own tilt in the model's sign, `faceTilt = −(roll − rail)` rad
[R, `AttachedRider.ts:3536`].

**R2 [R]. So at a fixed state and a fixed operating point the command is EXACTLY additive in the two halves.**
`steadyTurn` least-squares-solves a linear system whose right-hand side the drive enters additively, and `x[2]`,
`x[6]` are written after the solve [R, `:1255–1274`], so `Δx_ref` and `Δu_ref` are the drive's own response alone,
whatever lean and twist are asked (§10 C4 measures that rather than assuming it). Writing `u_off` for the shipped
command at that point:

| the flag | the command there |
|---|---|
| off | `u_off` |
| `predict` | `u_off − K·Δx̂` |
| `ref` | `u_off + Δu_ref + K·Δx_ref` |
| **`both`** | **`u_off + Δu_ref + K·Δx_ref − K·Δx̂`** |

**`both = predict + ref − off`, identically.** The brief's premise needs `K·Δx̂` and `K·Δx_ref` to **share** a sign,
so that `−K·Δx̂` and `+K·Δx_ref` subtract. §3 is the measurement of their signs, and they never do.

**R3 [R]. The instrument can be built at the exact operating point out of one design object, and whether that is
legitimate is itself a measurement.** `design` builds `gammaD` and `predD` whenever `w.waterHeel` is set, and the
shipped comment says Φ, Γ, the LQR gain and the filter are untouched by the flag [R, `:1090–1103`, `:793`]. So
`design(y, t, {…w, waterHeel: 'both'})` gives one `phi`, `gamma`, `k`, `steps`, `gammaD` and `predD` for **all four
arms at one point** — the same function of the operating point on each — and §10's C2 is the read that forcing the
flag on moves no entry of any of them, instead of the comment's word for it.

**R4 [R]. Part 4 §5's whole term table was already in step 3.4e's kept dumps, on all sixteen of its arms.** `eWater`,
`eAnkle`, `eRest`, `gWaterBoard`, `gAnkleSrc`, `gRestSrc`, `rollAccFull`, `rollAccTilt`, `rollAccGame`, `rollAccTwo`,
`mWaterAllTwo`, `mAnkleTwo`, `mRestTwo` [R]. **The brief's named instrument needed no new ride at all**, and §2 is
it. The arms were re-run anyway, because the round's own new columns are per-tick and because re-running is what
makes §10's C1 a control instead of an assurance.

## 2. (B) The brief's named instrument, run on the four datum arms — and it is monotone where the rides are not

| **[M]** the mount, `t ≤ 0.2 s`, **unfiltered from frame 1**, the shipped plant rebuilt at the controller's point | n | M water | G water | **phantom** | M row | **G row** | gm \|err\| | sgn M water | sgn G water | sgn phantom | ph / G row |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **the glide, the datum off** | 288 | 2 693 | **248** | **2 280** | 954 | **32** | 958 | +2 751 | −272 | +2 339 | **72.0** |
| the glide, the prediction alone | 288 | 2 810 | 749 | 2 177 | 1 762 | 542 | 1 229 | +2 893 | −907 | +2 227 | 4.0 |
| the glide, the reference alone | 288 | 2 956 | 1 154 | 2 123 | 2 823 | 1 035 | 1 629 | +3 640 | −1 010 | +2 163 | 2.1 |
| **the glide, both** | 288 | **3 044** | **1 305** | **2 023** | **3 470** | **2 901** | 978 | **+3 773** | **−1 295** | **+1 994** | **0.7** |
| **the owner's cell, off** | 216 | 1 139 | 661 | 1 803 | 1 228 | 159 | 1 137 | +1 392 | −484 | +1 643 | 11.3 |
| the owner's cell, the prediction alone | 203 | 2 047 | 947 | 1 809 | 2 377 | 932 | 1 890 | +2 173 | −1 097 | +1 686 | 1.9 |
| the owner's cell, the reference alone | 185 | 1 940 | 993 | 1 755 | 2 471 | 1 202 | 1 551 | +2 028 | −1 225 | +1 570 | 1.5 |
| the owner's cell, both | 189 | 2 117 | 1 253 | 1 744 | 3 112 | 2 481 | 1 083 | +2 339 | −1 403 | +1 623 | 0.7 |

**Five readings.**

1. **The brief's own question gets a measured answer and the answer is "not in this table".** Every column rises
   monotonically in off < predict < ref < both on **both** cells — the model's water term, the game's, the model's
   row, the game's row, and all three signed medians — while the rides on the same eight arms are **1.450 / 4.033 /
   3.683 / 0.683** and **1.033 / 0.967 / 0.483 / 0.433 s** [M]. **A monotone instrument cannot produce a
   non-monotone fact.** That is the whole of what Part 4 §5's table, run on four arms instead of one, has to say
   about the interaction, and it is a real result rather than a shrug: the row's terms are where the ride **went**,
   not which half it **ran**.
2. **The phantom is the one column that barely moves, and it moves the wrong way.** 2 280 → 2 177 → 2 123 → 2 023 on
   the glide and 1 803 → 1 809 → 1 755 → 1 744 on the cell [M] — a 12.7 % and a 3.7 % span, **falling** as the datum
   is corrected, because the phantom is `heelColumn · tilt` and the corrected arms spend the mount at a slightly
   smaller tilt (gm |tilt| 8.794 → 7.850° over `t ≤ 0.2 s`). **My own P5 is refuted by that 12.7 %** (I predicted 5 %), and the reason is the
   refutation: the datum arms **send a command at frame 1**, so their trajectories differ inside the mount window
   itself and they do not meet the same face.
3. **P6 and P10 are upheld, and P10 is Part 4's own reading for the fifth time.** The model's water term is within
   **1.13 ×** across the four glide arms (2 693–3 044); the model's own absolute error at the mount is **958 → 1 229
   → 1 629 → 978 °/s²**, within a factor of two of the shipped arm's **or worse on all three** [M]. **The quotient
   moves because the game's own row goes up ninety times (32 → 2 901 °/s²). A ratio repaired by its denominator is
   not a repair**, and this is the fourth round in a row to print that sentence about a different switch.
4. **`ph / G row` collapses 72.0 → 0.7 and that is the same sentence again.** The phantom's dominance over the game's
   whole roll row falls by a hundred times across the four arms, and **not one part of that is the phantom** (it
   falls 11 %); all of it is the game's row [M].
5. **The two-body plant's own columns say the same thing and are printed in the summary rather than here.** Every
   arm's table is given twice, on `rollAccFull` and on `rollAccTwo` (the plant the owner rides), and under the
   folder's `live` filter as well as unfiltered, in `results/34f/34f-summary.txt` §1. **Nothing in any of the four
   versions is non-monotone.**

## 3. (B) The interaction, where it actually is: the two halves ADD, measured four ways

| **[M]** the mount, `t ≤ 0.2 s`, unfiltered, gm \|°/s²\| in the roll row's units | n | pred | ref FF | ref FB | ref | **BOTH** | **cancelSh** | **sameSign** | \|Δφ̂\|, ° | \|Δφ_ref\|, ° | Δφ_ref/Δφ̂ |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **the glide**, off / predict / ref / both | 288 ea | 660 / 630 / 615 / 587 | 513 / 490 / 483 / 461 | 611 / 583 / 572 / 546 | 1 126 / 1 075 / 1 057 / 1 009 | **1 789 / 1 708 / 1 674 / 1 599** | **1.589 / 1.589 / 1.585 / 1.584** | **0.000 ×4** | 5.64 / 5.38 / 5.22 / 4.98 | 8.79 / 8.40 / 8.22 / 7.85 | 1.560–1.577 |
| **the owner's cell**, the same four | 216/203/185/189 | 633 / 623 / 576 / 569 | 451 / 452 / 438 / 437 | 547 / 551 / 531 / 525 | 1 002 / 1 007 / 973 / 967 | **1 652 / 1 647 / 1 563 / 1 551** | **1.645 / 1.634 / 1.606 / 1.604** | **0.000 ×4** | 6.09 / 6.08 / 5.81 / 5.77 | 9.67 / 9.62 / 9.21 / 9.21 | 1.583–1.595 |
| every arm of the round, every window (mount / live / all) | 24 arms | — | — | — | — | — | **1.575–1.686** | **0.000** | — | — | 1.239–1.595 |

**Four readings.**

1. **`cancelShare` is over one everywhere, so the word for this is reinforcement.** 1.575 at its smallest
   (`s8-tilt`, the mount) and 1.686 at its largest (`g-predict`, the live window), on **8 arms × 3 windows and 14 further arms at the mount — 38 arm-windows** [M].
   **The brief's *"it is the shape of a cancellation"* is refuted by the sign of one column**, and so are my own P1
   and P2, which said the same thing in my hand.
2. **The two terms never share a sign — not once.** `tiltSameSign` is **0 in 56 757 of 56 757 ticks of 24 arms**
   [M], so `−K·Δx̂` and `+K·Δx_ref` have the same sign in every tick that has ever been recorded of this switch.
   **P14, upheld; P1, refuted in the same column.**
3. **And the additivity is the game's own line, read two ways rather than asserted from R2.** Four shipped
   `PredictiveController`s, one tick each, the same sense line, a 10° tilt: raw ankle **0.000000000 / 0.155631330 /
   0.344847850 / 0.500479180** rad, raw twist **0 / −53.879680146 / −34.274178704 / −88.153858850** N·m, and
   **`|raw_both + raw_off − raw_predict − raw_ref| = 0.000e+0`** on both channels; with the tilt handed in as
   **zero** all four agree outright (spread 0.000e+0) [M, §10 C4b]. And on the rides, at frame 1, **per run**: the
   same residual is **1.000 × 10⁻⁶, which is the dump's own sixth decimal, in 24 of 24 and 18 of 18 runs** [M].
   **The sum is the game's, not the probe's.**
4. **P3 is upheld and it is why the reference's half is the bigger one.** `|Δφ_ref| / |Δφ̂|` is **1.560–1.595** at the
   mount on every arm [M]: the reference takes the same input `τ` to its equilibrium while the prediction takes it
   over the 0.1 s sensing delay, so the equilibrium's shift is about three fifths larger. **Each half is "where the
   tilt takes you"; the loop gets both and goes there twice.**

## 4. (B) The ankle's own bound — where the sum lands, and the arm that proves it is not the cause

| **[M]** frame 1, the mount dump's `raw0` (asked) against `sent0` (sent) | runs | bound, rad | asked, rad, the span | ask / bound | on the bound, fr 1 | on the bound, fr 1–12 | median ride, s |
|---|---|---|---|---|---|---|---|
| **the glide**, off | 24 | 0.2500 | 0.000000 | 0.000 | 0 of 24 | 0.000 | 1.450 |
| the glide, the prediction alone | 24 | 0.2500 | 0.086328–0.193536 | 0.545 | 0 of 24 | 0.000 | 4.033 |
| the glide, the reference alone | 24 | 0.2500 | 0.270765–0.350214 | **1.251** | **24 of 24** | 0.188 | 3.683 |
| **the glide, both** | 24 | 0.2500 | **0.357093–0.543750** | **1.805** | **24 of 24** | **0.462** | **0.683** |
| **the owner's cell**, off / predict / ref / both | 18 ea | 0.2500 | 0 / 0.0826–0.2219 / 0.2709–0.3569 / **0.3535–0.5788** | 0 / 0.888 / 1.427 / **2.315** | 0 / 0 / **18 of 18** / **18 of 18** | 0.176 / 0.158 / 0.411 / **0.783** | 1.033 / 0.967 / 0.483 / 0.433 |
| **the bound DOUBLED** (`ARANGE=wide`), the glide's four | 24 ea | **0.5000** | the same asks | 0 / 0.273 / 0.625 / **0.902** | 0 / 0 / 0 / **3 of 24** | 0.000 / 0.000 / 0.000 / **0.010** | **1.467 / 4.033 / 3.700 / 0.717** |
| the bound doubled, the owner's cell: off / both | 18 ea | 0.5000 | the same asks | 0 / 1.158 | 0 / 12 of 18 | 0.032 / **0.153** | **1.033 / 0.433** |
| **the 8° face**, off / predict / ref / both | 24 ea | 0.2500 | 0 / 0.0383–0.0898 / 0.1263–0.1671 / 0.1646–0.2569 | 0 / 0.263 / 0.599 / **0.862** | 0 / 0 / 0 / **3 of 24** | 0.000 ×3 / **0.010** | 4.600 / 3.300 / 3.000 / **2.250** |
| the 24° face, off / predict / ref / both | 24 ea | 0.2500 | 0 / 0.1519–0.3211 / 0.4484–0.5614 / 0.6016–0.8825 | 0 / 0.858 / **1.996** / **2.861** | 0 / 3 of 24 / **24 of 24** / **24 of 24** | 0.000 / 0.031 / **0.628** / **0.691** | 0.917 / 1.600 / 0.833 / **0.233** |

**Five readings.**

1. **The bound is a constant and a physical one, read before it was moved.** `ANKLE_REST_RANGE = 0.25 rad = 14.32°`
   at **every one of 56 757 ticks of 24 arms** [M], and it is *"`bankAuthority`'s `restRange` at one body weight on
   a 0.13 m sole"* — the rest at which the feet's centre of pressure reaches the sole's edge, past which *"more only
   rolls the board away onto its rail"* [R, `AttachedRider.ts:408–419`, `:3090–3108`]. **Not a tuning knob.**
2. **The sum lands squarely on it.** `both` asks **1.805 ×** the bound on the glide and **2.315 ×** on the owner's own
   cell at frame 1, and the loop's command is the clamp's — not the loop's — in **24 of 24 and 18 of 18 runs**, and
   through **0.462 and 0.783** of the mount's first twelve frames [M]. On the arm the owner would ride (`l-tilt`) the
   ankle sits on its bound for the **first seven frames straight**, `raw0` falling 0.579 → 0.297 while `sent0` reads
   **0.25000 to five decimals** [M, 18 runs, §3 of the summary].
3. **And it is not why `both` falls. `?ankleRange=wide` takes the bound out of the picture and the ride does not
   care.** The glide's four medians go **1.450 → 1.467, 4.033 → 4.033, 3.683 → 3.700, 0.683 → 0.717 s** — every one
   a move of at most one run of 24 — while `both` goes from on the bound in 0.462 of the mount to **0.010** [M, 24
   runs an arm]. On the owner's own cell the median does not move at all (1.033 → 1.033, 0.433 → 0.433) [M, 18 runs].
   **My own P17 is refuted and it was this round's own discriminator**: of the two explanations it was built to tell
   apart, *"the correction does not fit through the ankle"* is dead and *"the correction is too big"* is what is
   left. **P18 is upheld** (the bound stops binding) and that is what makes the refutation mean something: the
   switch did the thing it was for and the ride still did not move.
4. **The 8° face says it again, independently and without any switch.** There `both` asks **0.862** of the bound and
   is on it in **0.010** of the mount — never clamped in any way that matters — and still rides **2.250 s against
   its own face's 4.600, a factor of 0.489** [M, 24 runs each]. `g-tilt-wide` is **0.717 against 1.467, a factor of
   0.489** [M]. **Two routes past the clamp, two factors that agree to three digits** — and two numbers are not a
   law, so it is printed and not promoted.
5. **P19 is upheld on the glide and refuted on the owner's cell, which is two cells and two answers again.** With
   the datum off, doubling the bound changes **0 of 27 648** of the glide's mount column reads and first changes
   anything at **t = 0.883 s**; on the owner's cell it changes **1 964 of 20 736** and first changes something at
   **t = 0.15 s**, inside the mount [M]. **The shipped bound already binds at the mount on the owner's own cell with
   no datum correction at all** (on the bound in 0.176 of its first twelve frames) — which is a fact about the cell
   the owner rides and is flagged rather than chased here.

## 5. (B) The face sweep — the proportionality, and the premise

| **[M]** 24 runs an arm, the glide cell, the two-body plant | the datum off | the prediction alone | the reference alone | **both** |
|---|---|---|---|---|
| **an 8° face** (`FACE=1.4,8,5.7`), tilt 4.06° | **4.600** | 3.300 (**×0.72**) | 3.000 (**×0.65**) | **2.250 (×0.49)** |
| **the 16° face** (the folder's own), tilt 8.22° | **1.450** | 4.033 (**×2.78**) | 3.683 (**×2.54**) | **0.683 (×0.47)** |
| **a 24° face**, tilt 12.04–14.06° | **0.917** | 1.600 (**×1.74**) | 0.833 / 1.017 (**×0.91 / ×1.11**) | **0.233 (×0.25)** |
| the owner's own low cell, 18 runs, the 16° face | **1.033** | 0.967 (×0.94) | 0.483 (×0.47) | **0.433 (×0.42)** |
| **`gm \|rowTiltBoth\| / gm \|tilt\|`** at the mount, °/s² per ° | — | — | — | **202.02–202.13 / 203.44–203.70 / 204.17–206.00** |

**Four readings.**

1. **P13 is upheld and it is the roundest number in the round.** The reach per degree of face tilt is **202.0, 203.6
   and 205.0** on the three faces — a **2.0 % span over a 3.4-fold range of tilt** [M, 288 ticks × 12 arms] — which
   is what `Δx̂ ∝ τ` and `drive ∝ τ` being linear [R] predicts and is now measured rather than read.
2. **P11 is refuted, and the refutation is bigger than the prediction.** I predicted that halving the face would
   lift `both` to or above `ref`. It does not (2.250 against 3.000) — **and on that face no datum arm helps at all**:
   off is the best of the four at 4.600 s. **So *"each half alone nearly triples the ride"*, the fact the brief
   handed me, is a property of the 16° face and not of the correction.** Fourth refutation of this brief's own
   premises, after the cancellation, P5 and P17.
3. **P12 is convention-dependent and therefore not settled.** On the 24° face `ref`'s median is **0.833 s** under the
   convention step 3.4e published with (fallers only, as `datum.ts` computes it) and **1.017 s** under `mount.ts`'s
   (a non-faller counts as 9 s), against `off`'s 0.917 [M]. **One of 24 runs survived nine seconds and the verdict
   turns on it.** Recorded as convention-dependent rather than scored, and both conventions are printed for every
   arm in the summary.
4. **What reproduces across all four cells is `both`, and only `both`.** ×0.47, ×0.42, ×0.49, ×0.25 of its own
   cell's shipped arm [M, 84 runs]. The single halves range from ×0.65 to ×2.78 — **they flip sign with the face**.
   **The interaction's sign is robust; the premise about its two halves is not.**

## 6. (B) What I will not infer from these arms, with the reads that stopped me

1. **The overshoot is not the discriminator, and my first read of it was survivorship.** Looking at the per-frame
   medians I had `g-tilt`'s board roll at **−61° at 1.0 s** and nearly wrote the mechanism around it. That frame has
   **n = 4 of 24 runs** — the other twenty are already over [M]. Read **per run** instead: `g-predict` and `g-ref`
   cross level in **24 of 24** runs and reach **−54.5° and −71.6°** and ride 4.033 and 3.683 s, while `g-tilt`
   crosses in **17 of 24** and reaches only **−6.4°** because it dies first [M]. **The arms that overshoot most ride
   longest. The overshoot is a consequence of surviving, not a cause of falling**, and the first version of this
   section said the opposite.
2. **The command's size does not order the rides, and it orders them backwards inside an arm.** Across the glide's
   four arms `gm |rollCmd|` at the mount is **41.5 / 327.1 / 681.3 / 734.4 °/s²** and over 0.2–0.6 s it is **71.4 /
   130.6 / 256.3 / 504.2** — monotone, while the rides are not, so **P7 is refuted** (I predicted `both` quietest;
   it is loudest). And **within** each arm, the Spearman of a run's own first-half-second command against its own
   fall time is **negative on 19 of 24 arms** (the glide's four: +0.095, −0.541, −0.530, −0.308), so **P9 is refuted
   too**: the runs that command harder fall sooner while the arms that command harder ride longer. **Two levels, two
   signs, one quantity — and I am not pooling them or calling either one the mechanism.**
3. **P8 is refuted and the heel says nothing I can use.** `gm |roll − tilt|` over every tick is **7.18 / 5.72 / 6.67
   / 10.17°** on the glide's four arms — `both`'s board is the most heeled, not the least [M]. The "flush board" idea
   this round started with is dead.
4. **I will not claim the two halves are separable along a trajectory.** Everything in §3 is a decomposition **at a
   point**, on each arm's own recorded ride. A moved trim sends different commands and the commands enter the
   forward prediction — step 3.4e's own refuted draft — and the term tables in §2 are the measurement of how far the
   trajectories do diverge, inside the mount window itself (gm `|tilt|` 8.794 → 7.850° over the four glide arms).
5. **And I will not say which amount of correction is right.** The round says the loop gets 1.6 times one half's
   worth and that one half's worth is sometimes too much and sometimes too little depending on the face. **There is
   no arm here that delivers a half-sized correction, because none exists**: the switch has four values and no scale.
   §9's step seven is that arm.

## 7. (B) The owner's bar

| **[M]** 534 rides, 24 arms, the deck filter, the folder's own `qt(v, 0.5)` | runs | fell | median, s | Compress fell | Compress median, s |
|---|---|---|---|---|---|
| **the glide**: off / predict / ref / both | 24 ea | **24 of 24 ea** | 1.450 / 4.033 / 3.683 / **0.683** | **8 of 8 ea** | 1.483 / 4.367 / 4.150 / 0.683 |
| **the owner's cell**: off / predict / ref / both | 18 ea | **18 of 18 ea** | **1.033** / 0.967 / 0.483 / 0.433 | **6 of 6 ea** | 1.167 / 1.050 / 0.483 / 0.433 |
| the glide, the bound doubled: off / predict / ref / both | 24 ea | 24 of 24 ea | 1.467 / 4.033 / 3.700 / 0.717 | 8 of 8 ea | 1.483 / 4.367 / 4.133 / 0.750 |
| the owner's cell, the bound doubled: off / both | 18 ea | 18 of 18 ea | **1.033** / 0.433 | 6 of 6 ea | 1.167 / 0.433 |
| the 8° face: off / predict / ref / both | 24 ea | 24 of 24 ea | **4.600** / 3.300 / 3.000 / 2.250 | 8 of 8 ea | **4.600** / 4.633 / 3.650 / 2.767 |
| the 24° face: off / predict / ref / both | 24 ea | 24 / 24 / **23** / 24 | 0.917 / 1.600 / 1.017 / 0.233 | 8 of 8 / 8 of 8 / **7 of 8** / 8 of 8 | 0.933 / 1.600 / **3.217** / 0.267 |
| the two `GAINS`-off control arms | 24 / 18 | 24 / 18 | 1.450 / 1.033 | 8 of 8 / 6 of 6 | 1.483 / 1.167 |

**Three readings.**

1. **The bar is not met in any arm.** *"Compress must never fall at the low speeds of getting into position,
   100 %"*, and Compress fell in **177 of 178 runs** [M]. The single survivor is one `s24-ref` run, on a 24° face
   that is not the owner's spot, and that arm's Compress median of **3.217 s** is the only Compress figure above
   three seconds outside the 8° face.
2. **The longest ride in the round is the shipped rider on a gentler face.** `s8-off` is **4.600 s**, 24 of 24, with
   a Compress median of **4.600 s** — against **1.450 s** on the 16° face and **0.917 s** on the 24° one [M]. **The
   test wave's own steepness is doing more to the fall than any switch in this round**, which is a measurement and
   not a recommendation: the owner's note that *"gentle waves are no reason to fall"* cuts the other way, and 4.6 s
   is still not nine.
3. **And the owner's own low cell moves on nothing in this round.** 1.033 s off, 0.967 / 0.483 / 0.433 on the three
   datum arms, 1.033 with the ankle's bound doubled [M, 18 runs each]. **The one switch that has ever moved that
   cell is still step 3.4e's `?mountAgree=deck`, at 1.167 s.**

## 8. What I refuted

- **The brief's premise, by the sign of one column.** *"Two halves that each help and together hurt … is the shape
  of a cancellation."* It is a **reinforcement**: `cancelShare` **1.575–1.686** on 24 arms and every window, and
  `tiltSameSign` **0 of 56 757 ticks** [M]. **Thirty-first consecutive round to find its brief's premise wrong, and
  eleventh to find it in the half the brief called settled.**
- **The brief's own supporting fact, by a face.** *"Each half alone nearly triples the ride"* holds on the 16° face
  and **nowhere else**: on an 8° face off is the best of the four (4.600 against 3.300 / 3.000 / 2.250) and on a 24°
  face one half helps and one hurts [M, 24 runs an arm].
- **The brief's named instrument, as an instrument for this question.** Every column of Part 4 §5's term table, on
  both cells, filtered and unfiltered, on both plants, is **monotone in off < predict < ref < both** where the rides
  are not [M]. The table is right; it is about where the ride went.
- **My own P1 and P2, which were the brief's premise in my hand**, in 0 of 56 757 ticks and 0 of 38 arm-windows.
- **My own P4, the one I called the positive control.** `|K·Δx_ref| / |K·Δx̂|` at the mount is **0.954–0.959 on the
  glide and 0.780–0.835 on the owner's cell** — smaller where I predicted at least 20 % larger [M]. What orders the
  two cells instead is the **ask against the ankle's bound** (0.545 / 1.251 / 1.805 against 0.888 / 1.427 / 2.315).
- **My own P5, by 12.7 %**, and the reason is better than the prediction: the datum arms **command at frame 1**, so
  their mount windows are already different trajectories (gm `|tilt|` 8.794 → 7.850°).
- **My own P7 and P8.** `both` is the **loudest**-commanding arm at the mount (734.4 against 41.5 °/s²) and over
  0.2–0.6 s (504.2 against 71.4), and its board is the **most** heeled (10.17° against 7.18°) [M].
- **My own P9, at both levels and in opposite directions.** Negative on **19 of 24** arms within the arm; the
  louder-commanding **arms** ride longer. **Recorded as two readings, not resolved into one.**
- **My own P11, and my own P17 — this round's own discriminator.** Doubling the ankle's bound takes `both` off the
  bound (0.462 → 0.010 of the mount) and moves the glide's medians by **at most one run of 24** [M]. **The clamp is
  a passenger.** The 8° face, where `both` is never clamped and still rides ×0.49, is the independent second read.
- **My own P19, on one of its two cells.** With the datum off the bound never binds at the glide's mount (0 of
  27 648 reads) and **does** bind at the owner's cell's mount (first difference at 0.15 s) [M].
- **My own first draft of §6 reading 1, by my own instrument, before it was committed.** It had the mechanism built
  on `g-tilt`'s board rolling to −61° by one second. **That frame is 4 of 24 runs**; the per-run read says the arms
  that overshoot most ride longest. **A median over survivors is not a median over runs**, and this folder has
  caught that twice now.

## 9. What I will not claim

- **I will not claim the bar is any closer.** 533 of 534, Compress **177 of 178**, and the owner's own cell is
  1.033 s off and 1.033 s with the ankle's bound doubled.
- **I will not claim a cause for `both` beyond the sum.** I have measured that the two halves add, exactly, in the
  game's own line, and that the sum is about 1.6 times either half; I have measured that the clamp is not what the
  sum does its damage through; and I have **not** measured what a 0.6-times or 1.2-times correction does, because
  **no such arm exists**. "1.6 times is too much" is an inference from four cells, not a measurement of a scale.
- **I will not claim the term table is wrong.** It reproduces Part 4's own figures and it answers a different
  question than the brief asked it. **A monotone instrument is not a broken one.**
- **I will not claim the 8° face is a recommendation.** `s8-off`'s 4.600 s is the longest ride in the round and it
  is still not nine seconds, Compress still fell 8 of 8, and the face is not the owner's spot. **The face arms are
  an instrument.**
- **I will not claim `?ankleRange=wide` should be on or off.** It is step 3.3k's switch, it does what it says, and on
  these arms it buys one run of 24. Its own flag columns (`ankleRoomHere`, and this round's `predOverRoom` /
  `refOverRoom`) differ by construction and are excluded by name from every comparison that uses it.
- **I will not claim the two cells or the three faces can be pooled.** They order the arms differently and every
  table above names its own population.
- **I will not offer any bot ride as evidence of feel**, anywhere in this document.
- **Carried, flagged, not mine, not touched**: `steadyTurn`'s own reference on a **steered** arm (Part 4's median
  43.7–44.7°, peak 2 249°) — this round ran no steered arm either, so it still does not close; the `cos³` added-mass
  frame defect; `AttachedRider.frame`'s 70° bank clamp (which is what the `live` filter's `clamped` column is, and
  **not** the ankle's clamp this round is about — the two were nearly confused in §4's first draft and are now named
  apart); the live point-mass `ω₀` in `HumanBalance.capture`; the `live` filter itself, unchanged for the third
  round running. **New flag, measured and not chased:** `cmdRebuild` at the exact point is **0.605 median, 51.76
  peak** on the shipped glide arm [M] — the blend's own error on the rebuilt command, which step 3.4c's
  counterfactuals rest on.

## 10. The controls

**C1, the shipped rider is byte-identical to step 3.4e's, over 14 742 column reads.** `g-off-nog` and `l-off-nog`
against step 3.4e's own `g-off` and `l-off`, column by column over every shared column of the per-run summary:
**24 × 351 = 8 424 reads, 0 differing**, and **18 × 351 = 6 318 reads, 0 differing** [M]. This round's five new
summary columns are excluded **by name**. **And the `-nog` arms are the comparison for a reason that is itself a
measurement**: step 3.4e ran without `GAINS=1`, so **37** of its columns are `null` by construction (13 `gain*` /
`cmdRebuild*`, 24 `subst*`), and comparing a `GAINS=1` arm prints 888 and 666 differences that are every one a
`null` against a number. Both pairs are printed in the summary rather than the flattering one.

**C1b, and the rides themselves, three ways on all eight datum arms.** The tick count, the frame count and the fall
median against step 3.4e's own: **2193/5144/4144/845 and 1433/1309/555/497 ticks, the same frames, and 1.450 /
4.033 / 3.683 / 0.683 and 1.033 / 0.967 / 0.483 / 0.433 s — every one identical** [M].

**C2, the flag's reach into the design is exactly nothing.** `design(y, t, w)` against
`design(y, t, {…w, waterHeel: 'both'})`, every entry of Φ, Γ and the LQR gain, at every tick of every arm:
**peak difference 0.00e+0** [M]. The shipped comment said so; this is the measurement.

**C3, the flat equilibrium is the origin, exactly.** `steadyTurn(Φ, Γ, 0, 0)` with no drive: peak **0.00e+0** over
every state and both commands at every tick of every arm [M]. And on the game's own `tick`, with the tilt handed in
as zero, all four flags agree outright (spread **0.000e+0**).

**C4, `steadyTurn`'s superposition, measured because `solveSmall` pivots.** The drive's own response is the same
whatever lean and twist are asked — `(x_ref(b, t, drive) − x_ref(b, t)) − x_ref(0, 0, drive)` — **peak 0.00e+0**
relative, at every tick of every arm [M]. Without this, `Δx_ref` is not a property of the tilt and §1 R2's table is
wrong.

**C4b, the additivity off the GAME'S own `tick`, not the probe's arithmetic.** Four shipped controllers, one tick
each: **`|raw_both + raw_off − raw_predict − raw_ref| = 0.000e+0`** on both channels at a 10° tilt, with the four
commands **not** equal (spread from off 8.815e+1), and **0.000e+0** spread at zero tilt [M]. Printed as a `#` line
by every arm the probe runs.

**C5, the folder's own five closures on all 24 arms** (peaks): the sense reconstruction **exactly 0**, the tick
spacing **exactly 0**, the ledger's split, closure and residual **exactly 0** [M]. `ledgerApart` is printed apart as
**a count of substeps** (peak 16) and is not a closure.

**C6, the per-run frame-1 additivity on the rides.** `|raw_tilt + raw_off − raw_predict − raw_ref|` at frame 1, run
by run: **peak 1.000 × 10⁻⁶ against a scale of 0.54–0.58 rad, 24 of 24 and 18 of 18** [M] — the dump's own sixth
decimal, which is the precision the column is written at.

**C7, the compression lost nothing.** `34f-summary.txt` regenerated from the **gzipped** per-tick and per-frame
dumps is **byte-identical** to the one generated from the raw ones, `md5 02ea0daf9c65516e1953e111e2d829e6` both
ways [M].

**C8, the predictions were written before their arms**, in three blocks in `results/34f/34f-predictions.md`:
P1–P10 and C1–C6 committed in `97206098` before any arm ran, P11–P16 in `7d0a0e1` after the first instrument had
run and **with the refutation of the brief's premise declared in the same commit**, and P17–P20 in `f9d6ace9`, before any `ARANGE` arm existed. **Nine of the twenty are refuted and one is convention-dependent**, and the refutations are in
this document rather than in that file.

## 11. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probes type-checked **separately**, on a throwaway project extending the root's options with `types: ["node"]`
  and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming **673 files** including `3.3/plant.ts`,
  `3.4/cancel.ts`, `3.4/datum.ts`, `3.4/mount.ts`, `3.4/cost.ts`, `3.4/row.ts`, `src/physics/predictiveBalance.ts`,
  `src/physics/AttachedRider.ts`, `src/physics/bankLedger.ts` and `@types/node`. Every exit code above is read **on
  its own line and never through a pipe**.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran.
- `vitest run src/physics`: **58 files, 635 passed, 21 expected fail**.
  `vitest run src/game src/scene/rig`: **70 files, 736 passed**.
  `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail**.
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.
  All four are step 3.4e's own figures to the test.
  `src/wave/SurfZoneSimulation.test.ts` is closed by reading: nothing in this round touches the solver, the sea, the
  snapshot or any spot's configuration.
- **`src/` does not change in this round, and that is a stronger read than any hash of the Canyon's state.**
  `git diff --numstat main -- src/ server/` is **empty**: two files move, `docs/research/new-rider/3.3/plant.ts`
  (the ride probe) and `docs/research/new-rider/3.4/cancel.ts` (new, the analysis), plus the results folder. **If no
  byte of the game moves, no ride of the game can**, and the Canyon byte check would be a slower way of asking a
  question the diff has already answered. C1's 14 742 column reads against step 3.4e's own arms are the measurement
  that the probe's own change moved no ride either.

## 12. Files (3.4f)

- `docs/research/new-rider/3.3/plant.ts` — **read-only, and the only ride probe.** The 3.4f per-tick columns
  (`rowTiltPred`, `rowTiltRefFF`, `rowTiltRefFB`, `rowTiltRef`, `rowTiltBoth`, `cancelShare`, `dxHatPhi`,
  `dxRefPhi`, `kDxHatA`, `kDxRefA`, `tiltSameSign`, `predOverRoom`, `refOverRoom`, `heelDesignOff`, `refFlatOff`,
  `superOff`) with the algebra in the `Tick` comment; five per-run summary columns; `ARANGE=load|wide` (step 3.3k's
  own shipped switch, ridden with `WHEEL` for the first time) and its `arange` label column; and `additivity()`,
  C4b's read off the game's own `tick`, printed once per arm. It imports `PredictiveController` and `steadyTurn`
  from `src/physics/predictiveBalance` and **writes nothing**.
- `docs/research/new-rider/3.4/cancel.ts` — **new**: the analysis. Part 4 §5's term table on the four datum arms ×
  two cells × two plants × two filters; the two halves in the command; the loop's own error, the ankle's bound and
  the overshoot **per run**; the falls on the folder's own median; the face sweep; P9 inside each arm; and the
  controls. It reads the `.jsonl` dumps and imports **nothing** from `src/`.
- `docs/research/new-rider/3.4/results/34f/` — **24 arms** as `.jsonl` (per run), `.ticks.jsonl.gz` (per tick) and
  `.mount.jsonl.gz` (per frame), with `34f-summary.txt` (every table above, generated) and `34f-predictions.md`
  (twenty predictions in three blocks, each committed before its own arms). 29 MB gzipped against 162 MB raw, and
  the summary is byte-identical read either way (§10 C7).
- `docs/research/new-rider/3.4/README.md` — this Part.
- **`src/` and `server/`: nothing.**

## 13. For the owner, in plain words — and the shot list

**Last round I told you the two halves of the wave-tilt fix each help on their own and hurt together, and said it
looked like they cancel. They don't cancel. They add up.**

**One: I found the line, and it is one line.** The rider's balance works out a correction twice over — once in what
it *predicts* the wave will do to him, once in what it *aims* at. Both corrections point the same way. So with both
halves on he asks for about **one and six tenths** of the right-sized correction, and he over-does it. I checked
this four different ways, including by running the game's own balance code four times side by side: the two halves
add to the last decimal place.

**Two: the obvious fix is not the fix, and I tested it rather than guessing.** With both halves on he asks his ankle
for about **twice the range his feet actually have** — so the game pins it at the limit for the first few frames.
There is already a switch that doubles that range. I turned it on. **Nothing happened**: your test cell went from a
1.033 second ride to 1.033, and the glide from 0.683 to 0.717 — one ride in twenty-four. **So it is not that the
correction cannot get through his ankle. It is that the correction is too big.**

**Three: and here is the uncomfortable one.** I ran the same four arms on a **gentler wave** (half the face angle)
and on a **steeper** one. On the gentle wave **neither half helps** — the plain shipped rider is the best of the
four, and it rides **4.6 seconds**, the longest ride anywhere in this round. On the 16° wave we have always tested
on, each half nearly triples the ride. **So "each half helps" was never a fact about the fix; it was a fact about
our test wave.** The one thing that holds everywhere is that **both halves together roughly halve the ride**, on
every wave I tried.

**Four: your bar is not met.** 534 test rides, 533 ended before nine seconds, and Compress fell in 177 of its 178.

**Five: I built nothing.** This round is a measurement. The thing I would build next is in the shot list.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your spot, `?physical&rider=new&feltFrame=deck&riderBody=two` — the body you said feels
human, on everything.

1. **Nothing new to ride from this round, and I would rather say so than invent a shot.** Every arm here is a bench
   measurement of switches you have already been told to leave off. `&waterHeel=tilt` still halves your cell and
   `&ankleRange=wide` still changes nothing on it.
2. **If you want one ride anyway, ride `&mountAgree=deck` again.** It is still the only switch in three rounds that
   has moved your own cell (1.033 → 1.167 s, and your three slowest stand-ups 0.617 → 1.000 s), and step 3.4e asked
   you whether standing up slowly feels less like being thrown. **That question is still open and a bench cannot
   answer it.**
3. **And one ruling I would like, not a ride.** This round's own finding is that the fix is **1.6 times too big**.
   The switch has four values and **no scale** — there is no way to ask for a half-sized or a 60 % correction, so I
   cannot measure whether the right amount exists. **Adding that scale is one number in one line.** It is step
   seven and it is the first thing in it.
4. **What I think step seven is, in order:**
   - **A scale on the correction, and a sweep of it.** The round's one new fact is that the two halves add to about
     1.6 ×, and that the clamp is not what breaks it. **The missing arm is a correction at 0.3, 0.5, 0.8, 1.0 and
     1.3 times, on both cells and on all three faces.** If there is a size that helps, the sweep finds it; if
     nothing helps at any size, the datum correction is finished as a route and that is worth knowing too. It is one
     multiplier in `tick`'s two tilt lines, opt-in, off by default — and it is the only step I can name that the
     measurement actually points at.
   - **The face, as a thing we chose rather than a thing we measured.** The shipped rider rides **4.600 s** on an 8°
     face, **1.450 s** on the 16° one we test on, and **0.917 s** on a 24° one. Nothing about the rider changed
     between those. **Before any more switches, it is worth settling whether the test face is the face you ride**,
     because every number in this folder since 3.3k is 16°, and your spot's own arm was last calibrated at 16°
     (PR #223). That is a read and a ruling, not a build.
   - **Not another datum arm, not the term table, not the clamp, not the gains, not the cost, not the body, not the
     `live` filter.** The first is refuted as a question (the interaction is the sum), the second is refuted as an
     instrument (monotone where the rides are not), the third is refuted as a cause (one run of 24), and the rest
     were settled by Parts 3, 4 and 5.
   **My recommendation is the first, then the second. Your call.**

## 14. The deletions column, read line by line

`git diff --cached --numstat main`, read file by file. **Three deletions, and every one is a line re-emitted in
place with something added. `src/` and `server/` are empty on both sides.**

```
 223   3  docs/research/new-rider/3.3/plant.ts
 504   0  docs/research/new-rider/3.4/README.md        (this Part appended, Parts 1-5 untouched)
 401   0  docs/research/new-rider/3.4/cancel.ts        (new)
 205   0  docs/research/new-rider/3.4/results/34f/34f-predictions.md
 622   0  docs/research/new-rider/3.4/results/34f/34f-summary.txt
   …  …   and 72 further files under results/34f/, insertions only (48 of them binary `.gz`, 24 `.jsonl`)
──────────────────────────────────────────────
77 files, 2 489 insertions, 3 deletions
```

- **`docs/research/new-rider/3.3/plant.ts`, 3, and that is all three of them.**
  - **The import line**, re-emitted with two names added. Read as a **column** and not by eye: the old line names
    **12** imports and the new one **14**; the dropped set is **empty** and the added set is exactly
    `['PredictiveController', 'steadyTurn']`. `CONTROL_STEP`, `DEFAULT_WEIGHTS`, `type DesignWeights`,
    `bodyInertiaAt`, `captureOmega`, `continuousPlant`, `costWeights`, `design`, `discretise`, `heelColumn`,
    `plantAt` and `railLimit` are all still there.
  - **The two arm-label lines** (`:911` on the `MOUNT` dump and `:1850` on the `TICKS` dump), each re-emitted with
    `arange: ARANGE ?? 'ships'` spliced in. Read as a column: **2** entries before and **3** after, dropped set
    **empty**, and `wheel: WHEEL ?? 'off'` and `mount: MOUNTA ?? 'ships'` both still present on both lines. The
    per-run summary's own `arange` is an **insertion**, not a re-emission, which is why it is not in this list.
- **Every other file is insertions only, zero deletions**: `docs/research/new-rider/3.4/cancel.ts` (new),
  `docs/research/new-rider/3.4/README.md` (this Part appended), and the 74 files of `results/34f/`.
- **`git diff --cached --numstat main -- src/ server/` prints nothing at all.** That is §11's own seatbelt and it is
  this round's strongest single line: **no byte of the game moved.**
- **And one thing was written and then deleted before it was committed**: the first draft of §6 reading 1, which had
  this round's mechanism built on `g-tilt`'s board rolling to −61° by one second. Its own per-frame table said
  `n = 4 of 24` and the paragraph was replaced by the per-run read that contradicts it (§8's last bullet). It is not
  in the diff because it never reached a commit, and it is recorded here rather than left out.

# Part 7 — the 16° is the right metric and the owner's own wave, but it is that wave in the moment it BREAKS: his
clean face reads 11.7°, and the probe puts the board where the test wave gives 12.3° and his spot gives 5.6° — twice
the water under the same board

Written 2026-11-16/17 by the build agent (Opus 5, effort high) on branch `claude/rider-two-body-g`, cut from
`main` at **dde6bb66** (Part 6's merge), so Part 6 is its base. Its brief is item 2 of Part 6 §13's own step-seven ruling:
*"**Settle whether the 16° test face is the face the owner rides.** … A read and a ruling, not a build."* **Nothing
under `src/` or `server/` moves and no rider runs on a sea in this round** (§11).

**The owner confirmed the spot mid-round, in their own words**: *"Measure the `?canyonWave=true` its the one i test
on"* — so every Canyon figure below is **Canyon B**, read off the built config and the solver's own grid rather than
off the URL (§10 C1), on the owner's own default swell (`DEFAULT_CONDITIONS.swell = 'practice'` [R]).

## 0. The ten sentences the round is for

1. **The ruling, in one sentence: the metric is right, the wave is the owner's own, the 16° is its BREAKING moment
   rather than the face he rides along — and the probe has never put the board on 16° of anything.**
   `FaceWater` at `FACE=1.4,16,5.7` reads **`local` 16.0°, `turn` 16.0°, `upper80` 13.1°, `chord2` 15.6°**
   [M, analytic]; the board is placed 0.75 fronts onshore of the crest, which is **`faceFrac` 0.16**, and there the
   same water reports **12.1–12.3° along the face** and **8.8–9.0° across the board** at frame 1, in **24 of 24 and
   18 of 18 runs of every arm** [M, 21 621 frames of 8 arms].
2. **So "the 16° face" was never the water the rider is on, and that is this folder's own sentence, now measured in
   the loop's own column.** Step 3.2t wrote *"every '16° face' and '31° face' in this thread is the face's steepest
   point; it is not the water the board is on"*; what is new here is the number at the board — and the **chain**
   from one to the other, closed to **0.003° over 21 621 frames** (§10 C2): `|tilt| = |atan(tan(slope_at_faceFrac) ·
   sin ψ)|`, with ψ the crossing angle the probe sets at 45°.
3. **The metric is not confused, and the four are printed together so it cannot be.** `FaceWater`'s `slope` option is
   *"the face's slope at its steepest"* [R] and it is realised exactly: the probe's own read of it through the same
   `sampleAt` the board is handed gives `local` **16.00°**. On `FaceWater` **`local` and `turn` are identical by
   construction** (its trough is flat), so for the test wave there is no 16-against-31 ambiguity at all; the two
   differ only on a real face.
4. **The provenance of 16° is the owner's own spot, not the pool.** It is **PR #223's fit to Canyon B's arm** —
   `CANYON_B_MATCH`'s `height 1.4 m, depth 2.6 m, slope 16°, speed 5.7 m/s`, fitted to a solver measurement of
   Canyon B at the take-off (x −112): **crest 1.39 m (1.10–1.79), 5.6 m/s (5.2–6.3), steepest slope 15.5°
   (13.5–16.6) median before breaking, highest per wave 18.2°** [R, `calibration-canyon.md`, 3 Practice seeds, 22
   clean breaks at that column]. The **pool's** own matched rows are **19° and 21°**, and the old default test wave
   was **20°** [R, `calibration.md`] — so the coincidence with step 5e's *"the 2 m pool reads `local` 16.4°"* is a
   coincidence and nothing in this folder was ever fitted to the pool.
5. **The fit is right to half a degree against the window #223 fitted it in, and that window is the breaking
   moment — it is not the gentle end of the owner's ride, it is the sharp end of it.** 16.0° against #223's 15.5°
   (13.5–16.6) in the 3.0–0.4 s before the wave breaks at the take-off; but the **same calibration** measured the same
   arm steepening onshore to **19.6° (17.7–21.7) in the bowl at x −52 and 21.6° at x −42**, and **Big at
   18.4–20.1°** [R]; and the **highest** `local` inside any one wave's own pre-break window is a couple of degrees
   more again — **18.2°** at the take-off, **23.6–24.3°** in the bowl [R]. **The spot is not one face: #223 fitted it
   five rows, from 1.4 m at 16° to 2.85 m at 21°, and this folder has only ever run the first.**
6. **And the second half of the ruling is a factor of two at the place that matters.** On the owner's own swell the
   spot's **clean ridable** faces give **5.5 / 5.4 / 5.6°** at 0.16 of their height, where the test wave gives
   **12.3°** [M, 3 seeds, 5 677 faces against an exact analytic figure]. **×2.2.** The spot's **breaking** faces give
   **10.5 / 11.5 / 10.1°** there — so **the probe's placement sits on water like the spot's breaking face, not like
   the face a rider trims along.**
7. **The cause is the profile's shape, and it is why matching a face by its steepest angle does not match it where a
   board is.** The spot's steepest point sits at **0.62–0.64 of the height** [M; #223 read 0.60–0.65], `FaceWater`'s
   at **0.50** by construction, so the real face keeps a long gentle toe: at 0.16 of the height it gives
   **0.46–0.48** of its own `local` where the smoothstep gives **0.77** [M]. The two waves agree to within a fifth
   high on the face and are a factor of **three** apart at 0.05 of it.
8. **The two published Canyon numbers were never in conflict — the window was.** Step 5e's **`local` 5.4° (most
   20.7)** reproduces here **to every digit including `n`** on its own configuration (§10 C3), and it reads
   **7.8–8.7°** on the owner's swell, because it takes the tallest crest in a 90 m window that **ends at z −110** —
   offshore of the arm's own onsets at z −98 … −102 [R, #223]. Conditioned on the water a rider is on, the same seas
   read **11.5–11.9°**. **Step 5e's ruling that Canyon B cannot present 30–45° stands** (0 of 22 989 faces reach
   30°), **and its stated maximum should be 26.7°, not 20.7°** [M].
9. **A third conditionality, unnamed until now, is in every ride time this folder has published: a fifth to a third
   of the frames have no face under the board at all.** `faceFrac ≤ 0.001` — at or past the trough, where
   `FaceWater` is exactly flat and exactly still by construction [R] — in **22.5 %** of the shipped glide arm's
   frames, **31.6 %** of the prediction arm's, **14.0 %** of the reference arm's and **11.0 %** of the owner's own
   cell's, against **0 of 845** and **0 of 497** on the two `both` arms, which die before they get there [M, 21 621
   frames]. **The arms differ in that share by three times, so their ride times are not times on a face.**
10. **Of my own ten predictions six are upheld, two are refuted and two are half** (§5c), and the two refuted are
    **P1** (I expected the spot's clean face at 13–18° and it is 11.5–11.9°) and **P5**, the round's own quantitative
    bridge (I expected 0.6–0.8 of `local` at the board's place and it is 0.46–0.48). **Both refutations make the gap
    bigger than I predicted.** I have the ruling, its metric, its populations and its cause; **the owner's bar is
    untouched and I built nothing.**
## 1. (A) The five reads that had to come first

**R1 [R]. `FaceWater`'s one angle is `local`, by its own documentation and by construction.** `slope` is *"the face's
slope at its steepest, degrees"*, and the surface is a smoothstep over `front = 1.5 H / tan(slope)`, *"so it is
steepest halfway down at `slope`, concave below and convex above"* [R, `src/physics/testing/FaceWater.ts:1–45`]. So
the steepest point sits at **0.50 of the height** by construction, and the trough is **flat** — which is why `turn`
(the slope change from the trough to the steepest point) **equals** `local` on it, and why the 16-against-31
confusion step 5e warns about cannot arise for the test wave. It is *"the same along x and never breaks"* [R], which
is the first thing a spot is not.

**R2 [R]. The probes' number comes from the owner's own spot, and the folder says so on its own title page.**
`fall.ts`: *"the Canyon-matched `FaceWater` (1.4 m, 2.6 m deep, 16°, 5.7 m/s — PR #223's **fit** to Canyon B's arm,
not Canyon)"* [R, `3.3/fall.ts:48–49`], and `plant.ts` repeats it with the placement [R, `:106–108`]. `FACE`'s
default is the string `'1.4,16,5.7'` and `DEPTH`'s is `2.6` [R, `plant.ts:143–144`]. **PR #223's own fitted table**
gives `height 1.4 · depth 2.6 · slope 16 · speed 5.7` for *"Practice, typical (arm)"*, and its `depth` is **not** the
measured 2.2 m: it is chosen so that `FaceWater`'s current `c·η/(d+η)` reproduces the measured 2.0 m/s at the crest
[R, `calibration-canyon.md` part 2].

**R3 [R]. The owner's spot is Canyon B on the Practice swell, and both halves of that are defaults, not choices.**
`?canyonWaves=true` maps to `canyonBed: 'b'` — *"version B, the waves before version C"* [R,
`PhysicalMode.ts:464`, `:1362–1369`] — and the conditions the game starts from are
`DEFAULT_CONDITIONS = { swell: 'practice', tide: 'mid', wind: 'calm', time: 'midday' }` [R,
`SurfConditions.ts:68`]. **Step 5e's Canyon row ran `medium`** [R, `c2-step5e-face.ts`, part C], so it is not the
owner's swell; §4 runs both and prints both.

**R4 [R]. The dumped `tilt` column is the controller's own datum, not a quantity of the probe's.** The game computes
`faceTilt = −(roll − rail)` and its comment names it *"the face's own tilt under the board — the angle the measured
`rail` is `roll` less, which is `atan2(waterUp · side, waterUp.y)`"* [R, `AttachedRider.ts:3530–3536`], and
`plant.ts` writes exactly `tilt = atan2(nW · sideV, nW.y)` with `rail = roll − tilt` [R, `plant.ts:891–893`]. **So
§3's column is the number the loop reads when `?waterHeel` is on, in the loop's own sign.** Part 5 quoted its frame-1
value as **8.811°** and Part 6's mount figures as **gm |tilt| 8.22°** on the 16° face; §3 is the whole distribution
behind those, per arm.

**R5 [R]. The four metrics, and which of them each published number is.** Step 5e defines `local`, `upper80`,
`chord2`/`chord1` and `turn` [R, `c2-step5e.md` §1]. **16° is `local`** — on the probes' wave by construction and in
PR #223's measurement by name (*"steepest slope"*). **31.3° and 51.0° are `turn`** [R, step 3.2t's own table].
**20.7° is `local`**, a **maximum over 3 356 faces** of Canyon B and not a median [R, step 5e §4]. §4's tables print
all four for every population, so no row can be read in the wrong frame.

## 2. (B) The test face itself, reduced step 5e's four ways

| **[M]** `FaceWater` read along +z through the same `sampleAt` the board is handed, every 5 cm; analytic, so exact | front, m | **local** | upper80 | chord2 | chord1 | **turn** | steepest at | **at the board's own place (0.16 of H)** |
|---|---|---|---|---|---|---|---|---|
| **`FACE=1.4,8,5.7`** (Part 6's gentle arm) | 14.94 | **8.00** | 6.53 | 7.96 | 7.99 | **8.00** | 0.50 of H | **6.1°** |
| **`FACE=1.4,16,5.7`** (the folder's own, since 3.3f) | 7.32 | **16.00** | 13.13 | 15.62 | 15.91 | **16.00** | 0.50 of H | **12.3°** |
| **`FACE=1.4,24,5.7`** (Part 6's steep arm) | 4.72 | **24.00** | 19.88 | 22.71 | 23.68 | **24.00** | 0.50 of H | **18.8°** |
| the 16° face's profile up the face | — | 5 % **7.5°** · 15 % 11.9° · 16 % **12.3°** · 30 % 14.9° · 45 % 15.9° · 50 % **16.0°** · 70 % 14.8° · 85 % 12.0° · 95 % 7.7° | | | | | | |

**Four readings.**

1. **`local` is realised to the second decimal, so the probe's own instrument agrees with the construction**: 8.00,
   16.00, 24.00 against the `slope` asked for [M]. That is the control that makes the rest of this round's angles
   comparable with step 5e's.
2. **`local` and `turn` are the same number on this wave**, to the second decimal, on all three faces [M] — the
   trough is flat, so there is nothing for `turn` to subtract. **The test wave cannot be read in the wrong one of
   those two metrics.**
3. **`upper80` is 2.3–4.1° below `local`** (13.13 against 16.00), which is the curvature, and it is the metric
   Carini's 4 200 real waves are in: her plunging median is 16.45° and her 95th 27.46° [S, via step 5e]. **Our 16°
   test face sits at the median of her population on `local` and just below it on her own metric.**
4. **The profile is symmetric about mid-face and it falls away fast**: 16.0° at the half-height, **12.3° at 0.16**
   and **7.5° at 0.05** [M]. **The face's nominal angle is available at exactly one height**, and where the board is
   put decides which part of it the ride happens on. §3 is where the board is put.

## 3. (B) The face the board actually MEETS — step 3.4f's own kept dumps, nothing re-run

| **[M]** every frame of every run, step 3.4f's `*.mount.jsonl.gz` | frames | runs | **faceFrac**, median (5–95 %) | **along the face**, ° | **across the board (`tilt`)**, ° | frame 1: along / across | C2 resid, ° |
|---|---|---|---|---|---|---|---|
| **the glide, the datum off** (`g-off`, local 16°) | 2 193 | 24 | **0.096** (0.000–0.350) | **10.1** (0.0–15.4) | **6.6** (0.0–10.2) | **12.1 / 8.8** | 0.0019 |
| the glide, the prediction alone | 5 144 | 24 | 0.033 (0.000–0.306) | 6.4 (0.0–14.9) | 4.0 (0.0–11.0) | 12.1 / 8.8 | 0.0028 |
| the glide, the reference alone | 4 144 | 24 | 0.073 (0.000–0.268) | 9.0 (0.0–14.4) | 6.4 (0.0–11.9) | 12.1 / 8.8 | 0.0023 |
| **the glide, both** (`g-tilt`) | 845 | 24 | 0.161 (0.092–0.261) | **12.3** (9.9–14.3) | **8.6** (6.1–11.9) | 12.1 / 8.8 | 0.0016 |
| **the owner's cell, the datum off** (`l-off`) | 1 433 | 18 | **0.277** (0.000–0.483) | **14.6** (0.0–16.0) | **9.6** (0.0–13.7) | **12.3 / 9.0** | 0.0023 |
| the owner's cell, both (`l-tilt`) | 497 | 18 | 0.202 (0.163–0.309) | 13.3 (12.3–15.0) | 9.3 (7.9–10.9) | 12.3 / 9.0 | 0.0011 |
| **the 8° face, off** (`s8-off`) | 5 097 | 24 | 0.110 (0.001–0.354) | **5.3** (0.4–7.7) | **2.6** (0.2–5.2) | **6.0 / 4.3** | 0.0009 |
| **the 24° face, off** (`s24-off`) | 1 268 | 24 | 0.130 (0.000–0.375) | **17.3** (0.0–23.4) | **12.5** (0.0–16.6) | **18.4 / 13.9** | 0.0030 |

**Five readings.**

1. **At frame 1 the board meets 12.1–12.3° of face and the loop reads 8.8–9.0°, in every run of every 16° arm** —
   the spread across 24 runs is **0.3°** [M]. **Part 5's 8.811° and Part 6's gm |tilt| 8.22° are this number**, and
   neither is 16°. The folder's own name for its cell — *"the 16° face"* — is the wave's steepest point, 0.34 of its
   height above where the board was put.
2. **The chain is measured, not asserted.** `|atan(tan(slope at the board's own `faceFrac`) · sin ψ)|` against the
   dumped `tilt`, frame by frame: **peak 0.0009–0.0030° over 21 621 frames of 8 arms** [M, §10 C2]. So the two
   columns above are one quantity read two ways, and the **0.71** between them is `sin 45°` — the probe's own
   crossing angle, **not** a property of any face.
3. **Part 6's face sweep, restated in the water the board was on.** The shipped rider rides **4.600 s** where the
   board meets **6.0° / 4.3°**, **1.450 s** where it meets **12.1° / 8.8°**, and **0.917 s** where it meets
   **18.4° / 13.9°** [M, 24 runs an arm]. The sweep is real and its direction is unchanged; what moves is the
   **numbers it should be quoted at**, and every one of them is about two thirds of the label it has carried.
4. **The arms do not ride the same face, and over a whole ride the gap is far wider than Part 6's mount window
   showed.** Part 6 measured gm |tilt| **8.794 → 7.850°** over `t ≤ 0.2 s`; over **every** frame the four glide arms'
   medians are **10.1 / 6.4 / 9.0 / 12.3°** along the face — a **1.9-fold** spread — because the long-riding arms
   spend their time nearer the trough (`faceFrac` 0.033 against 0.161) [M]. **A comparison of ride times across these
   arms is not a comparison at a fixed face**, and this is the measurement of by how much.
5. **And on three of the four glide arms the board spends between a seventh and a third of the ride with no face
   under it at all.** `faceFrac ≤ 0.001` — at or past the trough, where `FaceWater`'s surface is **exactly flat and
   exactly still** by construction [R] — happens in **494 of 2 193 (22.5 %)** frames of the shipped glide arm,
   **1 627 of 5 144 (31.6 %)** of the prediction arm, **581 of 4 144 (14.0 %)** of the reference arm and **157 of
   1 433 (11.0 %)** of the owner's own cell, against **0 of 845** and **0 of 497** on the two `both` arms, which die
   before they get there [M]. **A ride time on these arms is not a time spent on a face**, and the arms differ in
   that share by three times.
6. **I will not turn readings 4 and 5 into a mechanism.** The arms that sit flattest ride longest *and* the arms
   that ride longest have more time to drift onto flat water; these dumps cannot separate those, exactly as Part 6
   §6's overshoot could not. It is printed as a confound on the comparison, not as a cause of anything.
7. **The guards, because `Number(null) === 0`.** Rows whose four read columns are not all finite numbers: **0 of
   21 621** across the eight arms [M]. So every zero above is a measured zero.
## 4. (B) Canyon B's own water — and why the two published Canyon numbers are both right

Step 5e published **`local` 5.4° (2.3–17.7, most 20.7) over 3 356 faces** of Canyon B's arm; PR #223 published
**15.5° (13.5–16.6)** at the same spot's take-off. **Both are `local`, and both are right**: they are different
windows over different populations of the same water. This section measures them on one sea, at one set of instants,
with one reducer.

**The populations, named.** `?canyonWaves=true` (`canyonBed 'b'`, grid 400 × 451), tide mid, stage 2, CPU, the arm's
columns, the face read along the ray through `PhysicalSurfWater.forSimulation` — the water the bodies read, at the
render nodes the snapshot draws — every 5 cm. `n` counts **faces**, not independent waves: consecutive frames of the
same crest are correlated, so a 1 826-face population is of the order of tens of waves. The median is the folder's
own convention (`q(v, 0.5)`, the **upper middle element**), the band is the 5th–95th, and *most* is the maximum.

### 4a. Step 5e's swell (medium, seed 1, 60–120 s, its own six columns, every 0.1 s) — the control, and the window

| **[M]** | n | H, m | **local** | upper80 | chord2 | **turn** | **at 0.16 of H** | steepest at |
|---|---|---|---|---|---|---|---|---|
| **step 5e's own read**: the tallest crest in z −200 … −110, one face a column-frame | **3 356** | **0.72** (0.37–1.59) | **5.4** (2.3–17.7, most **20.7**) | 4.2 | 5.3 | 5.0 | **3.4** | 0.58 |
| **step 5e's published row, for comparison** [R, `c2-step5e.md` §4] | 3 356 | 0.72 (0.37–1.59) | 5.4 (2.3–17.7, most 20.7) | 4.2 | 5.3 | 5.0 | — | 0.58 |
| every crest of H ≥ 0.30 m in z −175 … −60 (this round's window, which reaches the onsets) | 10 069 | 0.65 (0.36–1.52) | 6.2 (2.6–17.7, most 21.1) | 4.8 | 6.0 | 6.0 | 3.7 | 0.58 |
| **the clean ridable faces**: H ≥ 1.00 m, nothing breaking anywhere on them | **1 826** | **1.33** (1.03–1.63) | **12.2** (5.5–18.8, most 20.8) | 10.0 | 11.9 | **12.2** | **6.1** (3.3–9.3) | **0.62** |
| the clean faces of H ≥ 1.30 m (#223's sets) | 979 | 1.49 (1.32–1.65) | **14.5** (10.5–19.4, most 20.8) | 12.0 | 14.0 | 14.5 | **7.1** (5.1–9.5) | 0.64 |
| **the clean faces whose crest is within 25 m of the take-off** (z −125) | **1 084** | **1.36** (1.09–1.65) | **13.4** (7.8–19.3, most 20.8) | 11.0 | 12.9 | **13.4** | **6.6** (3.8–9.4) | 0.63 |
| the **breaking** faces (`breaking > 0` anywhere on them) | 1 532 | 1.11 (0.59–1.54) | **15.1** (11.5–19.5, most 21.1) | 11.6 | 14.2 | 14.7 | **9.7** (6.7–14.1) | 0.53 |

**C3 passes exactly: the first two rows are the same numbers, to every digit printed, including `n`.** So the copies
of step 5e's `faceOf`, `band`, `q` and `feltFace` in this round's probe are its reducer, and everything below is
comparable with everything it published.

### 4b. The owner's own swell (practice, seeds 1 / 2 / 3, 60–200 s, seven columns x −122 … −62, every 0.2 s)

Three seeds, each printed on its own line, **never pooled**: the medians are of faces, and the seeds are the only
independent thing here.

| **[M]** seed 1 / 2 / 3 | n | H, m | **local** | upper80 | chord2 | **turn** | **at 0.16 of H** | steepest at |
|---|---|---|---|---|---|---|---|---|
| **step 5e's own read** (the tallest crest in z −200 … −110) | 4 594 / 4 617 / 4 617 | 1.18 / 1.58 / 1.26 | **7.8 / 8.7 / 8.3** (max 19.8 / 21.5 / 20.3) | 6.3 / 6.2 / 6.7 | 7.5 / 8.5 / 8.0 | 7.1 / 8.3 / 7.6 | **3.6 / 3.1 / 3.8** | 0.62 ×3 |
| every crest of H ≥ 0.30 m in z −175 … −60 | 7 953 / 7 165 / 7 871 | 1.25 / 1.47 / 1.28 | **12.1 / 14.2 / 13.2** (max **26.7** / 22.5 / 21.2) | 9.6 / 11.0 / 10.4 | 11.5 / 13.5 / 12.7 | 11.2 / 13.1 / 12.4 | 5.8 / 7.6 / 6.6 | 0.60 / 0.57 / 0.59 |
| **the clean ridable faces** (H ≥ 1.00 m, nothing breaking) | 3 485 / 2 510 / 3 537 | **1.34 / 1.69 / 1.39** | **10.5 / 10.3 / 10.9** (max 20.9 / 21.8 / 20.3) | 8.6 / 8.2 / 8.9 | 10.2 / 10.1 / 10.6 | **10.5 / 10.3 / 10.9** | **4.9 / 4.7 / 5.1** | 0.63 / 0.64 / 0.63 |
| the clean faces of H ≥ 1.30 m (#223's sets) | 1 968 / 1 942 / 2 182 | 1.46 / 1.82 / 1.51 | 12.0 / 11.0 / 12.3 | 9.9 / 8.7 / 10.2 | 11.7 / 10.7 / 12.0 | 12.0 / 11.0 / 12.3 | 5.7 / 5.0 / 5.9 | 0.63 / 0.64 / 0.63 |
| **the clean faces within 25 m of the take-off** (z −125) | **2 152 / 1 331 / 2 194** | **1.39 / 1.67 / 1.39** | **11.5 / 11.9 / 11.7** (max 19.4 / 21.8 / 20.1) | 9.5 / 9.5 / 9.6 | 11.2 / 11.6 / 11.4 | **11.5 / 11.9 / 11.7** | **5.5 / 5.4 / 5.6** | 0.63 / 0.63 / 0.62 |
| **the breaking faces** (`breaking > 0` anywhere on them) | 2 621 / 3 157 / 2 911 | 1.34 / 1.56 / 1.35 | **16.9 / 18.4 / 16.5** (max **26.7** / 22.5 / 21.2) | 12.8 / 13.9 / 12.6 | 16.0 / 17.5 / 15.6 | 16.6 / 18.2 / 16.1 | **10.5 / 11.5 / 10.1** | 0.52 / 0.51 / 0.52 |
| the share of all faces with any breaking on them | — | — | **33.0 % / 44.1 % / 37.0 %** of 7 953 / 7 165 / 7 871 | | | | | |

**The profile up the face, the clean faces within 25 m of the take-off, against the test wave's own** [M]:

| of the height | 5 % | 15 % | **16 %** | 30 % | 45 % | **50 %** | 70 % | 85 % | 95 % |
|---|---|---|---|---|---|---|---|---|---|
| **Canyon B, Practice, seed 3** (n 2 194) | 2.3° | 5.3° | **5.6°** | 8.7° | 10.8° | 11.2° | **11.4°** | 9.6° | 6.0° |
| **the 16° test face** | 7.5° | 11.9° | **12.3°** | 14.9° | 15.9° | **16.0°** | 14.8° | 12.0° | 7.7° |
| the ratio | 0.31 | 0.45 | **0.46** | 0.58 | 0.68 | 0.70 | 0.77 | 0.80 | 0.78 |

**Six readings.**

1. **The two published Canyon numbers are the same metric over two windows, and both reproduce here.** Step 5e's own
   read gives **5.4°** on its own swell (its published figure, to the digit) and **7.8–8.7°** on the owner's, because
   it takes **one** face a column-frame — the tallest crest in a 90 m window that **ends at z −110**, offshore of
   where the arm's onsets sit (z −98 … −102 [R, #223]) — so most of its population is open swell. Conditioned on the
   water a rider is actually on, the same sea reads **11.5–11.9°**. **Neither number was wrong; the window was the
   whole disagreement.**
2. **The spot's clean ridable face is 11.5–11.9° `local`, and its breaking face is 16.5–18.4°.** The test wave's
   **16.0°** sits **between** them: about **4° steeper than the face a rider rides** and about **1° gentler than the
   face in the moment it breaks**. PR #223's **15.5°** is the same water in its own narrower window — the 3.0–0.4 s
   before it breaks at that column — and it lands, as it should, between my clean 11.7° and my breaking 16.5°.
   **Three populations, three numbers, one wave, and they are consistent.**
3. **At the place the board is actually put, the gap is a factor of two and it is the round's real number.** The
   clean faces near the take-off give **5.4–5.6°** at 0.16 of their height; the test wave gives **12.3°**. **×2.2.**
   Against the **breaking** faces (10.1–11.5°) the test wave is within 10 %. So the probe's placement is on water
   like the spot's **breaking** face, not like the face a rider trims on.
4. **The reason is the profile's shape, not its peak, and `steepest at` is the tell.** The spot's steepest point sits
   at **0.62–0.64 of H** (#223 measured 0.60–0.65 [R]); `FaceWater`'s sits at **0.50** by construction. So the real
   face has a **long gentle toe** and gives only **0.46–0.48 of its own `local`** at 0.16 of the height, where the
   smoothstep gives **0.77**. The two waves agree best high on the face (0.77–0.80 of each other at 0.70–0.95 of H)
   and worst at the bottom (**0.31** at 0.05). **Matching a face by its steepest angle does not match it where a
   board sits.**
5. **`local` and `turn` are the same number on the spot's clean faces too** — 10.5 / 10.3 / 10.9 against 10.5 / 10.3
   / 10.9 — because its trough is nearly flat as well [M]. **So no figure in this round depends on telling those two
   apart**, and the metric confusion step 5e warned about cannot be hiding in it. `upper80` sits 1.9–2.1° below
   `local`, as it does on the test wave (2.9°) and in 5e's own rows.
6. **Step 5e's ruling stands, and its maximum was understated.** In the corrected window, on the owner's own swell,
   **not one face of 22 989 reaches 30°** — but the steepest reaches **26.7°** (seed 1), against step 5e's published
   maximum of **20.7°** [M]. So *"Canyon B cannot present the 30–45° a bottom turn wants"* is unchanged; *"its
   steepest is 20.7°"* should read **26.7°**, and the extra 6° is in the water that is breaking, which 5e's window
   never reached.
## 5. (B) Do they match? The ruling, quantity by quantity

| **[M]/[R]** the same quantity on both sides, each with its own metric named | **the test face** (`FACE=1.4,16,5.7`, 2.6 m) | **Canyon B, the owner's spot** (`?canyonWaves=true`, Practice) | the gap, and which way |
|---|---|---|---|
| **`local`**, the face's steepest slope | **16.00°** [M, exact] | **11.5 / 11.9 / 11.7°** on the clean ridable faces near the take-off [M, 3 seeds, 5 677 faces]; **16.9 / 18.4 / 16.5°** while breaking [M]; **15.5° (13.5–16.6)** in the 3.0–0.4 s before breaking [R, #223]; **19.6°** in the bowl, **21.6°** further in [R, #223] | **the test is ~4° steeper than the clean face and ~1° gentler than the breaking one; it is 3–6° gentler than the bowl** |
| **`turn`**, the slope change trough → steepest | **16.00°** (identical to `local`: the trough is flat) [M] | **11.5 / 11.9 / 11.7°** on the same faces — identical to its own `local` too [M, 3 seeds] | **the two metrics cannot be confused on either wave** |
| **`upper80`**, Carini's window | **13.13°** [M] | **9.5 / 9.5 / 9.6°** near the take-off [M] | the test is 3.6° steeper on Carini's own metric |
| the crest's height over the trough | **1.40 m** | **1.39 m (1.10–1.79)** at the take-off; 1.80 m on the sets; 2.31 m on Big [R] | **the median matches; the test is one wave and the spot is a factor of 1.6 between its tenth and ninetieth** |
| the crest's speed | **5.7 m/s** | **5.6 m/s (5.2–6.3)** [R] | matches |
| where the steepest point sits | **0.502 of H** [M] | **0.62–0.64 of H** [M, 3 seeds; #223 read 0.60–0.65] | **the test's steep band is lower on the face, so its toe is far steeper than the spot's** |
| **the slope where the board actually is** (`faceFrac` 0.16) | **12.3°** [M] | **5.5 / 5.4 / 5.6°** on the clean face near the take-off; **10.5 / 11.5 / 10.1°** on the breaking one [M] | **×2.2 against the face a rider trims on, ×1.1 against the one that is breaking — the ruling's real number** |
| **the datum the loop reads** (across the deck, ψ 45°) | **8.8°** [M, 24 of 24 runs] | **3.9°** at the same place and heading on the clean face [I, 5.6° × sin 45°] | the factor 0.71 is the **heading**, not the face |
| the water at the crest / at the steepest point / at the trough | **2.0 / 1.21 / 0.00 m/s** [M] | **1.9–2.1 / 1.2–1.3 / −0.65 to −1.0 m/s** [R, #223] | the crest and the steepest point match **by construction** (#223 fitted `depth` to them); **the trough does not: the spot's runs seaward and the test's is still** |
| the peel | **none — one face repeated along x, never breaking** [R] | **about 12.5 m/s along x, in sections**, faster than any rider in these tables travels [R] | **outside what `FaceWater` can represent at all** |
| the crest-to-trough run | **7.35 m** [M] | **11.2–14.2 m** (sets 16.6 m) [R] | the test's face is **a third to a half shorter** |

**Four readings, and the first is the ruling.**

1. **The answer, in the metric both sides are measured in: the test's 16° is the owner's wave in the moment it
   breaks, not the wave he rides along.** `local` **16.00°** against the spot's **11.5–11.9°** on the clean ridable
   faces near the take-off [M, 3 seeds] and **16.5–18.4°** on the faces that are breaking [M]. PR #223's **15.5°**
   is the same water in the narrower window just before it breaks, and it falls between my two. The **height** and
   the **crest speed** match (1.39–1.67 m against 1.4; 5.6 against 5.7 m/s), and the water at the crest matches
   because #223 fitted the depth to make it. **So: right wave, right metric, and about four degrees steep for the
   part of the ride that is not the breaking moment.**
2. **And it is the wrong question, because the probe never puts the board on that 16°.** The board is placed at
   `faceFrac` **0.16**, where the same wave is **12.3°**, and the loop's datum is **8.8°**. **A reader of this folder
   who assumed "16° face" meant 16° of water under the rider was out by a factor of 1.3 along the face and 1.8 in the
   loop's own column** — and the three faces Part 6 swept are **6.0 / 12.1 / 18.4°** at the board, not 8 / 16 / 24.
3. **The spot is five fitted rows and the folder has run one.** #223's own table: the arm at **1.4 m / 16°**, the
   Practice **set** at **1.95 m / 16°**, the **bowl** at **2.1 m / 21°**, Big at **2.3 m / 19°** and Big's sets at
   **2.85 m / 21°** [R]. **Three of those five are steeper than anything this folder has ridden**, and Part 6's own
   sweep says the shipped rider goes from 1.450 s to 0.917 s between 16° and 24°.
4. **What `FaceWater` cannot carry is not the angle.** #223 listed it and nothing since has closed it: the **peel at
   12.5 m/s in sections**, the **trough running seaward at 0.65–1.3 m/s** where the test's is still, a face **a third
   to a half longer**, the **spread** (1.6 × in height between the tenth and ninetieth percentile, and 16 of 38 waves
   pass the take-off without breaking there), and the bowl's jump. **The test face is a good fit to one of the
   spot's rows and a poor model of the spot**, and those are different statements.

### 5c. The ten predictions, scored against the file committed before the arms (`e7e657ca`)

| | what it said | what the arms say | verdict |
|---|---|---|---|
| **P1** | the clean faces near the take-off read `local` **13–18°** | **11.5 / 11.9 / 11.7°** [M, 3 seeds] | **refuted**, and below the band |
| **P2** | step 5e's own read comes out **under 8°** on the same sea | **5.4°** on its own swell, **7.8 / 8.7 / 8.3°** on the owner's | **refuted as stated** on two of three practice seeds; the point it was testing — that the window, not the metric, is the disagreement — is upheld |
| **P3** | `local` and `turn` agree within **1°** on the clean faces | **identical** on all three seeds (10.5 / 10.3 / 10.9 both) | **upheld** |
| **P4** | `upper80` sits **2–4°** below `local` | **1.9 / 2.1 / 2.0°** below | **upheld**, at the edge |
| **P5** | the slope at 0.16 of H is **0.6–0.8 ×** their own `local` | **0.46 / 0.46 / 0.48 ×** | **refuted**, and this is the round's own bridge: the gap at the board is **bigger** than I predicted |
| **P6** | `breaking > 0` on at least **2 %** of faces | **33.0 / 44.1 / 37.0 %** | **upheld** |
| **P7** | the steepest point at **0.55–0.70 of H** | **0.63 / 0.64 / 0.63** | **upheld**, and it matches #223's 0.60–0.65 |
| **P8** | the clean faces' median height **1.1–1.5 m** | **1.34 / 1.69 / 1.39 m** | **half**: two seeds inside, seed 2 at 1.69 m is outside |
| **P9** | the breaking faces' `local` **at or above** the clean ones' | **16.9 / 18.4 / 16.5** against **10.5 / 10.3 / 10.9** | **upheld** |
| **P10** | **no face reaches 30°** | 0 of 22 989; the steepest is **26.7°** | **upheld** |

**Six upheld, two refuted, two half** — and the two refutations are the two that carried the round's own arithmetic.
## 6. (B) What this does to the folder's conclusions — named one by one, and what would have to be re-run

**Three conditionalities, not one.** Every ride-time number in this folder since step 3.3f carries all three, and they
are different: the face's **nominal** angle (`FACE`'s second number, swept once, in Part 6 §5), **where on that face
the board is put** (`AHEAD`, never swept, and §3 is the first measurement of what it costs), and **the heading it
crosses at** (`SIDE = −45°`, never swept, and it is the factor **sin ψ = 0.71** between §3's two columns).

**Not face-conditional** — these are identities, constants, reads, or were themselves measured across the sweep:

| the finding | why it stands | population |
|---|---|---|
| `both = predict + ref − off`, identically, and the frame-1 residual **1.000 × 10⁻⁶** | the command's own algebra, and it was measured on **all 24 arms**, the 8° and 24° faces among them | 24 arms, 56 757 ticks [M, Part 6 §3] |
| `tiltSameSign` **0 of 56 757** and `cancelShare` **1.575–1.686** | the same 24 arms, both other faces included | 38 arm-windows [M] |
| the reach per degree of tilt, **202.02–206.00 °/s² per °**, a 2.0 % span | this one is **validated by** the sweep, not threatened by it: it is the quantity that was measured on all three faces | 288 ticks × 12 arms [M] |
| `ANKLE_REST_RANGE = 0.25 rad` at every tick | a constant of the plant, read and then measured | 56 757 ticks [M] |
| `?waterHeel=tilt` carries the datum into both places; `Design` is untouched by the flag (peak 0.00e+0) | reads and an exact control | every tick of every arm [M, Part 5 R1, Part 6 C2] |
| the model's absolute error being within 2 × of the shipped arm's or worse on all three datum arms — *"a ratio is not a repair"* | a statement about two columns at one operating point, and the operating point is the one each arm actually ran | 288 ticks an arm [M] |

**Face-conditional** — every one of these is a 16°-only measurement, and the sweep shows the 16° row is not
representative:

| the finding | what the sweep does to it | status |
|---|---|---|
| *"each half alone nearly triples the ride"* | on 8° **no** datum arm helps (off 4.600 best of four); on 24° one helps and one hurts | **already declared refuted** by Part 6 §5 |
| the **ordering** off < predict / ref | flips with the face | **face-conditional** |
| `both` roughly **halves** the ride | ×0.47 / 0.42 / 0.49 / 0.25 — holds in **sign** on four cells, varies 2 × in size | **robust in sign, conditional in size** |
| the shipped rider's own medians, **1.450 s** (glide) and **1.033 s** (the owner's cell) | **4.600 s** on 8°, **0.917 s** on 24°, nothing about the rider changed | **face-conditional, by a factor of five** |
| **`?mountAgree=deck`'s 1.033 → 1.167 s** — the only switch in four rounds that has moved the owner's cell | measured on **one face only**, never on another | **face-conditional and untested**; §9's step eight |
| the ankle's clamp binding at the mount | at 16° on the owner's cell it binds with the datum **off**; at 8° `both` is **never** clamped | **face-conditional**, and Part 6 measured it so |
| the two **kinds** of fall (sudden into the face / slow stall) | PR #223 measured the mix moving with the face: the gentler 16° arm shifts falls from sudden to stall (mild: 2 sudden, 14 stalls) | **face-conditional**, measured [R, #223 part 3] |
| every falls-per-runs figure of Parts 1–6 and of steps 3.3f–3.3p | all 16°, all at `AHEAD` 0.75, all at ψ 45° | **triply conditional** |

**What would have to be re-run, and what would not.** Nothing above needs re-running to be **valid at 16°** — the
arms are what they are and their populations are named. What needs new arms before anything in this folder may be
said about **the owner's spot** is short and specific:

1. **The bowl's face.** `FACE=2.1,21,6.1` with `DEPTH=3.4` — PR #223's own fitted row for the part of the arm the
   owner rides **into**, which this folder has never run. The sweep's 24° row is close to it and rides **0.917 s**
   against 16°'s 1.450.
2. **The sets' height.** `FACE=1.95,16,6.8`, `DEPTH=3.7` — #223's own Practice-set row. Height moves the face's
   **length**, not its angle, and nothing in this folder has varied it.
3. **`?mountAgree=deck` on a second face.** It is the only live candidate in four rounds and it exists on one face.
4. **`AHEAD`, as a sweep.** 0.50 / 0.65 / 0.75 / 0.90 of the front, which on the **same** 16° wave puts the board on
   **16.0° / 14.6° / 12.3° / 5.9°** (`faceFrac` 0.50 / 0.27 / 0.16 / 0.03) — **a range as wide as the whole `FACE`
   sweep, reached without changing the wave at all.** `FaceWater`'s profile is symmetric about mid-face, so 0.25 of
   the front gives the same 12.3° high on the face that 0.75 gives low on it: the placement picks the **slope**, and
   the side of the face it picks it on is a second, independent choice.

**And what does not need re-running:** the algebra, the controls, the constants, the reads, the proportionality and
the term table's reading. **A monotone instrument is still monotone on any face**, and the reason Part 6 could reject
it is internal to its own cell: the table and the rides it was compared against are the same arms.
## 7. (B) The owner's bar, separately

**The bar is not met, it is not closer, and this round could not have moved it: it ran no rides.** The bar is the
owner's own sentence — *"in compress the surfer should not fall in the lower speed of getting positioning in a wave …
100 %"* — and where Part 6 left it is where it still is: **533 of 534 rides ended before nine seconds and Compress
fell in 177 of 178**, over twenty-four arms [M, Part 6 §7]. **Nothing in this document is a ride**; the only
new rides it names are in §9's step eight.

**What the round does add to the bar is a correction to how it should be quoted.** The best Compress figure anywhere
in the folder is **4.600 s on Part 6's 8° arm** — which is a face the board meets at **4.3°** across the deck, a
fifth of the owner's spot at its steepest point and less than half of what the folder's own cell gives the loop. The
bar is nine seconds on the owner's spot. **No arm in this folder has ever been run on the part of that spot the owner
rides into** (§6's list, item 1).

## 8. What I refuted

- **The brief's own premise, as it expected.** *"The likeliest error is my assumption that there is a single face to
  compare against."* There is not one: PR #223's own calibration gives Canyon B **five** fitted rows (16° on the arm,
  21° in the bowl, 19–21° on Big, heights 1.4–2.85 m), the arm's `local` runs **15.5° before breaking and 15–18.5°
  while breaking**, and the spot is **a peel at about 12.5 m/s along x, in sections** that `FaceWater` cannot carry
  at all [R]. **The folder's one cell is one of five rows of one swell of one spot.**
- **My own framing of the question, by my own part F.** I set out to settle "is 16° right" and the answer is that the
  **16° is right and irrelevant**: it is `local`, it is a half-degree fit to the owner's own take-off in that metric,
  and the board is never on it. **The quantity that governs the ride is the slope where the board sits**, and on the
  same wave that is **12.3°**, with **8.8°** reaching the loop.
- **The suggestion that the probes' 16° came from the 2 m pool's 16.4°.** It did not: the pool's own fitted rows are
  **19° and 21°** and the old default test wave was **20°** [R, `calibration.md`]; the probes' row is
  `CANYON_B_MATCH`'s, dated **2026-11-10**, and both `fall.ts` and `plant.ts` name PR #223 in their headers [R].
  **The coincidence is a coincidence**, and step 5e's sentence about it is about a different wave measured over a
  different population.
- **The reading that step 5e's Canyon row contradicts PR #223's.** It does not: they are the same metric over
  different windows, and §4 reproduces **both** on one sea at one set of instants — 5e's own figure **to every digit
  including `n`** on its own configuration, and #223's between my clean (11.7°) and breaking (16.5°) buckets.
- **Step 5e's stated maximum, by 6°.** *"Over 3 356 faces the steepest is 20.7°"* — in a window that reaches the
  arm's own onsets, on the owner's own swell, the steepest is **26.7°** [M, 22 989 faces]. **Its ruling is
  untouched**: still **0 of 22 989** over 30°.
- **My own P1 and P5, and P5 was this round's own bridge.** The spot's clean ridable face is **11.5–11.9°**, not the
  13–18° I predicted; and at the board's own place it gives **0.46–0.48** of its `local`, not the 0.6–0.8 I took
  from the test wave's shape. **Both make the gap larger than I predicted, which is the direction that should make a
  reader trust it less, not more — so the populations are printed three seeds apart and never pooled.**
- **The unstated assumption that a ride in these arms happens on a face.** On three of the four glide arms the board
  is at or past the trough — on water `FaceWater` makes **exactly flat and exactly still** — in **11.0 % to 31.6 %**
  of all frames, and on the shipped glide arm in **22.5 %** [M, 21 621 frames]. **Twenty rounds of ride times
  include that**, and no document in the folder has said so.
- **My own P6, before this round's long arms ran.** The 7 s pilot window found `breaking > 0` on **5 of 193 faces**
  — above the 2 % I predicted, so P6 survives — but it found **0 clean faces of H ≥ 1 m in 193**, which is why the
  arms in §4 are 140 s long and why a short window cannot answer this question at all.

## 9. What I will not claim

- **I will not claim the test face should change.** It is a fitted row of the owner's own spot and the fit is good in
  the metric both sides are measured in. What I claim is that **four more rows of the same calibration exist and one
  of them is the part of the arm the owner rides into**, and that the **placement**, not the row, is where the
  folder's labels went wrong.
- **I will not claim a ride time for any face I have not run.** §6's four items are arms that do not exist yet;
  nothing here predicts what they will give, and Part 6's own sweep is the warning: the ordering of the datum arms
  changes sign between faces.
- **I will not claim that `FaceWater` is or is not adequate for the owner's spot.** PR #223 listed six things it
  cannot copy — the peel, the long toe and the seaward trough, the steepest point's place, the spread, the bowl's
  jump, and faces under 1 m of grid — and measured that its **rider tables are "not harsher"** than the default
  wave's on the same plans [R]. **That was a different experiment** (climbing riders with the stick over) from this
  folder's arms (unsteered, the stick never touched), and I am not pooling the two.
- **I will not claim the board's `faceFrac` in the probes is where a rider sits on a real wave.** Nobody has
  measured that on Canyon B. The one real-rider number anywhere near it is the catch study's trace of a pop-up
  *"0.79 up a 20° face"* [R, `canyon-catch-2026-10-29`] — **on a different Canyon bed, before `?canyonWaves` existed**,
  and one trace is not a number.
- **I will not offer any bot ride as evidence of feel**, anywhere in this document.
- **I will not re-open what Part 6 settled**: the two datum halves add (`cancelShare` 1.575–1.686, `tiltSameSign` 0 of
  56 757), the term table is monotone where the rides are not, and the ankle's clamp is a passenger.
- **Carried, flagged, not mine, not touched**: `steadyTurn`'s own reference on a **steered** arm (four rounds with no
  steered arm); the `cos³` added-mass frame defect; `AttachedRider.frame`'s 70° bank clamp (which is what the `live`
  filter's `clamped` column is, **not** the ankle's); the live point-mass `ω₀`; the `live` filter itself; and
  `cmdRebuild` at 0.605 median / 51.76 peak.
## 10. The controls

**C1, the spot is Canyon B and the probe proves it from the config, not the URL.** Every Canyon arm prints
`spot canyon · canyonBed b · swell <the arm's> · grid 400 × 451 = 180 400 · stage 2`, read off the built
`SurfZoneConfig` and the solver's own grid [M]. **Canyon B is 400 × 451 = 180 400; the default Canyon is
400 × 507 = 202 800** — a different spot, and this line is what tells them apart.

**C2, the chain from the face's angle to the loop's datum, measured frame by frame.** `|atan(tan(slope at the board's
own `faceFrac`) · sin ψ)|` against step 3.4f's dumped `tilt`: **peak 0.0009–0.0030° on 21 621 frames of 8 arms**,
against a scale of 2.6–17.3° [M]. Without this, §3's two columns are two different quantities and the 0.71 between
them is a guess.

**C3, this round's copy of step 5e's reducer reproduces step 5e's own Canyon row** on step 5e's own configuration —
medium swell, seed 1, tide mid, its six columns, its window (the tallest crest in z −200 … −110), every 0.1 s, node
spacing 1 m. `faceOf`, `band`, `q` and `feltFace` are copies rather than imports because importing
`c2-step5e-face.ts` runs its own parts and then calls `process.exit(0)`; the control is what makes the copies
legitimate.

**C4, the swell is the owner's own**, `DEFAULT_CONDITIONS.swell = 'practice'` [R], and step 5e's `medium` is printed
beside it rather than instead of it.

**C5, part F's instrument against its own construction.** `FaceWater`'s realised `local` is **8.00 / 16.00 / 24.00°**
against the `slope` asked for, and its steepest point sits at **0.502–0.503 of H** against the construction's 0.5
[M]. The probe reads the face through `sampleAt`, the same call the board is handed, not through a finite difference
of its own.

**C6, part B is a read of kept dumps and nothing was re-run.** Every figure in §3 comes out of step 3.4f's own
`results/34f/*.mount.jsonl.gz`, which are in the repository; the frame and run counts match Part 6's own
(**2 193 / 5 144 / 4 144 / 845** and **1 433 / … / 497** frames, 24 and 18 runs) [M]. **If the rides are not re-run,
they cannot disagree with Part 6**, and the counts are the check that the right arms were read.

**C6b, and the one column this round turns on reproduces step 3.4f's own printed table to the digit.** Step 3.4f's
`34f-summary.txt` prints the glide's per-frame table with `tilt` **8.824°** at frame 1 over its 24 runs; this round's
read of the same dump gives a frame-1 median of **8.8242°** [M]. Its `gm |tilt| mt` column reads **4.262 / 8.794 /
14.055°** for the 8° / 16° / 24° faces — so **the folder has been printing the across-deck tilt beside the label
"the 16° face" since step 3.3k**; what is new here is the chain that connects the two, and the slope **along** the
face in between. (Part 6 §5 quoted the 16° row's tilt as **8.22°**, which is the `g-ref` arm's own value; across that
row's four arms the column runs **7.850–8.794°**. Named because a number quoted without its arm is how this folder
has gone wrong before, not because it changes anything.)

**C7, the predictions were committed before the arms that test them**, in `results/34g/34g-predictions.md` at
**e7e657ca**, with parts F and B declared **given** in the same file because they had already run. Every score in
§5 is against that file as committed.

## 11. Seatbelts

- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**
- `./node_modules/.bin/tsc --noEmit -p server/tsconfig.json`: **exit 0**
- the probe type-checked **separately**, on a throwaway project extending the root's options with
  `types: ["node", "@webgpu/types"]` and **absolute** `typeRoots` (the root's own config is `include: ["src"]`, so a
  `docs/` probe is outside it): **exit 0**. Every exit code above is read **on its own line and never through a
  pipe**. `@webgpu/types` is in the list because this probe imports the solver, which the 3.4f probes did not.
- the worktree's `node_modules` is a **symlink** to the main checkout's, so `npx` never ran.
- **The four suites, run although nothing they cover moves** (§11's last bullet is why they could have been skipped):
  `vitest run src/physics` **58 files, 635 passed, 21 expected fail**; `vitest run src/game src/scene/rig`
  **736 passed**; `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts` **56 files, 482 passed, 2 expected fail**;
  `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand, **43 of 43**. Every one is
  step 3.4f's own figure to the test.
- **And one red that was not news, chased because a red there would be:** the first pass of `SurfZoneRunner.test.ts`
  came back **1 failed, 42 passed**, and the `src/ui …` suite **1 failed, 481 passed** — both run while **three
  Canyon solver arms and two other suites** had every core busy. Re-run on a quiet machine they are **43 of 43** and
  **56 files, 482 passed, 2 expected fail**. Both files time the solver, `src/` is byte-identical to `main` (the next bullet), and a timing red
  under five CPU-bound jobs is a measurement of the machine. **It is recorded rather than dropped, because the
  folder's own rule is that a red in that file is news.**
- **`src/` and `server/` do not change in this round, and that is a stronger read than any hash of the Canyon's
  state.** `git diff --numstat main -- src/ server/` prints **nothing at all**: the only files that move are
  `docs/research/new-rider/3.4/face.ts` (new), `docs/research/new-rider/3.4/README.md` (this Part appended) and
  `results/34g/`. **If no byte of the game moves, no ride of the game can**, so the Canyon byte check would be a
  slower way of asking a question the diff has already answered — and the four test suites and
  `SurfZoneRunner.test.ts` cover code none of which this round touches.
- **The sea was spun fresh in every arm and the "spun up on the CPU in … s" line is printed with the solver's own
  time after it** (38.9–77.5 s, solver at t 22.0–24.0 s). No `.sea` cache was read or written.

## 12. Files (3.4g)

- **`docs/research/new-rider/3.4/face.ts` — new, and the only file with code in this round.** Three parts: **F**, the
  test `FaceWater` reduced step 5e's four ways through the same `sampleAt` the board is handed; **B**, the face the
  board meets, read out of step 3.4f's kept per-frame dumps with the projection control; **C**, Canyon B's own water
  over a window that reaches the arm's onsets, in six populations, with step 5e's own read printed beside it as the
  control. It imports from `src/` and **writes nothing** but its own `--out` json.
- `docs/research/new-rider/3.4/results/34g/` — `34g-predictions.md` (committed before the arms),
  `34g-summary.txt` (every table above, as the probe printed it: parts F and B, the C3 control arm and the three
  practice arms) and the five `*.json` the probe wrote beside them.
- `docs/research/new-rider/3.4/README.md` — this Part. Parts 1 to 6 untouched.
- **`src/` and `server/`: nothing.**
## 13. For the owner, in plain words — and the shot list

**You asked one question — "is the 16° test wave the wave I actually ride?" — and the answer has two halves.**

**One: the 16° itself is your own spot, measured — nobody picked it off the wave pool.** Back on 10 November we
measured Canyon B with `?canyonWaves=true` properly: at the take-off its waves are **1.39 m tall, moving at
5.6 m/s**, and in the last three seconds before each one breaks its steepest part is **15.5°**. The test wave was
built to match that: **1.4 m, 5.7 m/s, 16°**. I re-measured the same spot on your own swell this round and the
height came out **1.39 m** again, to the centimetre.

**But the 16° is your wave at the moment it breaks, not the face you ride along.** Measured over the clean,
ridable faces — the ones you are actually trimming on — your spot's steepest part is **11.7°**, and only once it
starts breaking does it reach **16.5–18.4°**. So the test wave is about **four degrees steeper** than the face you
spend most of a ride on.

**Two: the test never puts the surfer on that part of the wave, and that is the real finding.** "16°" is the wave's
**steepest point**, which on the test wave is halfway up its face. The test drops the board **near the bottom of the
face** — at 16 % of the height — and down there the same wave is only **12.3°**. Then, because the board crosses at
45° rather than pointing straight down the face, the balance loop reads **8.8°** of it. **So every ride in this
folder for twenty rounds has been on a 12° face read as 9°, labelled 16°.** I checked that chain against the game's
own recorded numbers on 21 621 frames and it closes to three thousandths of a degree.

**And at that same spot on the face, your wave gives 5.6°.** Twice as gentle. The reason is the shape: a real wave's
steepest part sits about **two thirds** of the way up and it keeps a long gentle **toe** at the bottom; the test
wave's smoothstep puts its steepest part exactly halfway up and has almost no toe. **Matching a wave by its steepest
angle does not match it where a board actually sits** — which is the one sentence I would keep from this round.

**Why that matters to you, in one line:** last round I told you the surfer lasts **4.6 s** on a gentle wave, **1.45 s**
on our test wave and **0.92 s** on a steep one. Those three faces are, under the board, **4.3°, 8.8° and 13.9°**. The
difference between "he stays up" and "he falls in under a second" is about **nine degrees of water under his feet** —
and the test has been choosing that by where it drops him, not by what wave it builds.

**Three: your spot is not one wave, and we have only ever run one row of it.** The same 10 November measurement
found the arm **steepening as it goes**: 15.5° at the take-off, **19.6° in the bowl**, **21.6°** further in — and
within any one wave the steepest moment is a couple of degrees more again (18.2° at the take-off, 24° in the bowl).
Its five fitted rows run from **1.4 m at 16°** to **2.85 m at 21°**, and **every number in this folder is the first
one.** On last round's sweep, going from 16° to 24° took the surfer from 1.45 s to 0.92 s — so the parts of your
wave we have never tested are the harder parts.

**Also worth knowing: for a fifth to a third of each test ride there is no wave under the board at all.** The test
drops him near the bottom of the face, and once he drifts past the trough the water there is dead flat and dead
still by construction — 22 % of the frames on the plain arm, 32 % on one of the others. **Nobody had checked that,
and it means the ride times have been part ride and part flat water.**

**Four: your bar is where it was.** 534 test rides last round, 533 under nine seconds, Compress fell in 177 of 178.
**This round ran no rides at all** — it is a read — so nothing in it moves that, and nothing in it was meant to.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your spot, `?physical&rider=new&feltFrame=deck&riderBody=two` — the body you said feels
human, on everything.

1. **Nothing new to ride from this round.** It is a measurement with no switch in it. If you ride anything, ride
   **`&mountAgree=deck`** again — still the only switch in four rounds that has moved your own low-speed cell
   (1.033 → 1.167 s, your three slowest stand-ups 0.617 → 1.000 s), and step 3.4e's question about whether standing
   up more slowly *feels* less like being thrown is still open and a bench cannot answer it.
2. **One thing worth watching while you ride, and it is free.** Ride a wave on the arm and then ride one **into the
   bowl** (the end of the arm, where it bends). If falling feels different in the bowl, that is the 19–22° row we
   have never tested, and it would tell us where to point the next arms.
3. **And one ruling I would like.** Last round's recommendation was a **scale on the correction** (a 0.3 / 0.5 / 0.8
   / 1.0 / 1.3 × sweep). I still think that is the next build — **but it should be run on more than one face and
   with the board placed somewhere other than the bottom of it**, because this round shows those two choices move
   the water under his feet as much as the wave does. **Your call on the order; my recommendation is below.**

**My recommendation, in order:**

- **Step eight (a): the scale sweep, on three rows instead of one.** Part 6's own next step, run on the take-off row
  (1.4 m / 16°), the **bowl** row (2.1 m / 21°, 3.4 m deep) and the **set** row (1.95 m / 16°, 3.7 m deep) — all
  three of them PR #223's own fits to your spot. One multiplier in one line, opt-in, off by default.
- **Step eight (b): a placement arm, which costs nothing to build because the switch exists.** `AHEAD` is already an
  environment variable on the probe. 0.50 / 0.65 / 0.75 / 0.90 of the face's length puts the board on **16.0 / 14.6 /
  12.3 / 5.9°** of the *same* wave. If the ride times move as much across that as they did across the face sweep,
  then "which wave" was never the question and "where on it" always was.
- **Not** another datum arm, not the term table, not the clamp, not the gains, not the cost, not the body, not the
  `live` filter — Parts 3 to 6 settled those.

## 14. The deletions column, read line by line

`git diff --cached --numstat dde6bb66` — **the merge base, and reading it against `main`'s tip instead is the first
thing this column caught** (below). **Zero deletions anywhere; nine files; `src/` and `server/` empty on both
sides.**

```
 638   0  docs/research/new-rider/3.4/README.md                       (this Part appended, Parts 1-6 untouched)
 441   0  docs/research/new-rider/3.4/face.ts                         (new; 4 lines of it were re-emitted mid-round, below)
  48   0  docs/research/new-rider/3.4/results/34g/34g-predictions.md  (new, committed before the arms)
 305   0  docs/research/new-rider/3.4/results/34g/34g-summary.txt     (new, generated)
   1   0  …/34g-fb.json, 34g-medium-5e.json, 34g-practice-1/2/3.json  (new, one line each)
──────────────────────────────────────────────
9 files, 1 437 insertions, 0 deletions, nothing under src/ or server/
```

- **`git diff --cached --numstat main` prints four files with deletions and not one of them is mine.**
  `.claude/skills/surf-video-read/SKILL.md` (0/67), `docs/research/new-rider/3.4/kirra-reference.md` (0/65),
  `docs/research/new-rider/3.4/video-ref-2.md` (0/80) and
  `docs/superpowers/handoffs/2026-11-16-surfer-and-wave-handoff.md` (0/17). **They are `main`'s own additions since
  this branch was cut**: `main` moved from **dde6bb66** to **7b7b2cc5** mid-round, six commits of another session's
  video-reference work, and against a tip that has files a branch does not, every one of them reads as a deletion.
  **Read against the merge base, which is what a pull request diffs, the column is zero.** None of those six commits
  touches this README, `src/` or `server/` (`git diff --name-only dde6bb66..main --` on all three prints nothing), so
  there is nothing to merge and nothing conflicts. **This is the column doing its job, and it is recorded rather than
  quietly corrected.**

- **`docs/research/new-rider/3.4/face.ts` is new against the merge base (441 / 0), but it was committed before the
  arms ran** (with the predictions, at `e7e657ca`) and then edited, so **within the branch** it has a deletions
  column of its own — `git diff --numstat e7e657ca` reads **20 / 4** — and all four are read here like any other:
  - **the per-arm json line of part B**, re-emitted with `nonFinite, offFace` added. Read as a column: **3** entries
    before and **5** after, dropped set **empty** — `frames`, `runs` and `slope` are all still there.
  - **part C's header line**, re-emitted with the literal `every 0.1 s` replaced by `every ${f(EVERY, 2)} s`;
    every other field of the line (`swell`, `tide mid`, `stage 2`, `CPU`, `FROM`–`UNTIL`, `columns`, `seeds`,
    `window z`) is still there, in the same order.
  - **`next += 0.1;` → `next += EVERY;`**, the same statement with the constant named.
  - **one `report(...)` label**, re-emitted as *"every crest of H ≥ 0.30 m in z …"* so the bucket's own prominence
    floor is printed with it rather than left to the code.
- **`git diff --numstat main -- src/ server/` prints nothing at all.** That is §11's seatbelt and this round's
  strongest single line.
- **`docs/research/new-rider/3.4/README.md`**: Part 7 appended below Part 6's last line; the first six Parts are
  byte-identical, which the numstat's `0` in the deletions column is the check for.
- **Nothing was written and then deleted before committing in this round**, with one exception recorded here rather
  than left out: the probe's part C first read its faces the way step 5e does — **one face a column-frame, the
  tallest crest in a 90 m window that stops at z −110** — and the pilot run showed that window sits **offshore of
  where the arm breaks**, with **no clean face of H ≥ 1 m in 193**. The multi-crest read (`feltFaces`) replaced it
  before any published arm ran, and step 5e's own version is **kept in the probe and printed as the control** rather
  than dropped.
# Part 8 — the placement arm is NOT free: `AHEAD` moves four quantities at once and reaches every slope twice, and
the one knob that moves only the water under the board is the FACE. On the owner's own 5.5°, with no flat-water
frames at all, **626 of 626 rides fell and Compress fell in 205 of 205**

Written 2026-11-17 by the build agent (Opus 5, effort high) on branch `claude/rider-place-34h`, cut from `main` at
**9cf08a90** (Part 7's merge plus the handoff), so Part 7 is its base. Its brief is the handoff's own first resume
item: *"**The placement arm — free, and start here.** `AHEAD` 0.50 / 0.65 / 0.75 / 0.90 puts the board on 16.0 /
14.6 / 12.3 / 5.9° of the *same* wave — as wide as the whole `FACE` sweep without changing the wave."* **Nothing
under `src/` or `server/` moves** (§10), so this round adds no switch: there is no default to keep, because no
default exists to change.

## 0. The ten sentences the round is for

1. **Part C's answer first, because it is the one the owner is waiting on: the falls persist, and that is the good
   result.** **626 rides, 29 arms, nine placements from just under the crest to the very bottom of the face, two faces, and
   626 of 626 fell. Compress fell in 205 of 205. Not one run of the 626 reached nine seconds; the longest was 7.75 s** [M].
   So **the 24-of-24 at 12.3° was not a test artefact**, and the twenty-three rounds of falls-per-runs findings the
   handoff put on its FACE-CONDITIONAL list are **unconditional again**. What was conditional is the *ride time*,
   and only that.
2. **The handoff's own span is confirmed to the digit, analytically.** `AHEAD` 0.50 / 0.65 / 0.75 / 0.90 puts the
   board on **16.00 / 14.62 / 12.14 / 5.89°** along the face and **11.46 / 10.45 / 8.65 / 4.17°** across the deck, at
   `faceFrac` **0.500 / 0.282 / 0.156 / 0.028** [M, exact: the closed forms agree with `FaceWater.sampleAt` and
   `.faceFraction` to **1.8 × 10⁻¹⁵°** and **2.2 × 10⁻¹⁶** at the same twelve placements, §9 C1]. The handoff's
   "12.3" is 3.4g's *measured frame-1* value after one frame of drift, and this round's own frame-1 read reproduces
   it: **12.12°** over 24 runs and **12.33°** over 18 [M].
3. **But "free" is refuted three times over, and that is this round's own first finding.** `AHEAD` does not move one
   quantity, it moves **four**, and they are not independent: the **slope** under the board, **where on the face**
   the board sits, the **room** left between the board and the trough (past which `FaceWater` is a flat still lake),
   and — because `3.3/plant.ts` builds its `EXTRAS` entry as `(c − u)/cos 45°` with `u` the water's own flow at the
   placement [R, `:813`] — **the entry speed band itself**, which runs **5.28 → 8.03 m/s** over the sweep against
   the glide cell's own 6 m/s span of `EXTRAS` [M]. Every ride in this round is therefore on **absolute** entries.
4. **And `4 AHEAD (1 − AHEAD)` is symmetric, so every slope below the nominal one is reached twice** — once high on
   the face and once low — and the two are **not** the same ride. **12.30° high rides 1.100 s against 12.12° low at
   1.467 s; 5.80° high rides 2.200 s against 5.52° low at 2.750 s** [M, 22–24 runs an arm, the same eight absolute
   entries]. **The slope under the board does not by itself set the ride time.**
5. **The knob that moves only the water under the board is the FACE, at the shipped placement.**
   `FACE=1.4,7.32,5.7` at `AHEAD` 0.75 puts the board on **5.50° along / 3.91° across at `faceFrac` 0.1560** — and
   the owner's own clean face near the take-off presents **5.4–5.8°** at **0.157 of its height** [M/R, 3 seeds,
   5 677 faces in 3.4g plus this round's own 1 527-face control]. Same height fraction, same 7.435 m/s entry
   baseline, same heading, and a crest-to-trough run of **16.35 m** against his measured **15.4 m (11.2–24.4)** [M].
   **It is the closest the folder has ever come to the water he rides**, and it rides **4.650 s** against 1.467 —
   with **24 of 24 still falling**.
6. **Part B's mechanism, named and tested: the off-face frames are the board running off the ONSHORE end of the
   face, and the three-fold spread across arms is survivorship, measured.** `faceFrac` recomputed from
   `aheadFronts` alone closes to **1.2 × 10⁻⁴ over 21 621 frames of 3.4f's eight arms and 58 210 of this round's 23 reported ones**
   [M, §9 C2], every off-face frame has `aheadFronts` **0.981–2.013** (past the trough) and **0 of them** is behind
   the crest, so it is **geometry, not a guard, a datum or a `Number(null)`**. In a window every arm lives through
   (t 0.2–0.7 s) the share is **0 of 720 / 720 / 720 / 427 / 505 / 255** on 3.4f's six 16° arms [M]: **the arms do
   not differ there at all.** `g-tilt`'s "0 of 845" is because **no frame of it reaches 1.15 s**, which is where
   `g-off`'s first off-face frame is. **So it cannot be the interaction Part 5 could not explain** — the arrow runs
   from ride length to flat water, not back.
7. **It is not a probe defect, and it is worse than the handoff thought: on the shipped glide arm the ride ENDS on
   flat water in 15 of 24 runs**, at `faceFrac` **0.0000** and `|tilt|` **0.000°** [M]. The board needs only
   **1.83 m** of onshore gain at `AHEAD` 0.75 and gains at **+1.228 m/s**, so it leaves the face at **1.150 s** and
   the recorded fall comes **0.300 s later** — and which runs leave is chosen by the **entry speed**: every run at
   `extra ≥ 0` leaves, no run at `extra ≤ −1` does. **The bias has a sign: the flat-water frames LENGTHEN the ride.**
8. **Taking them out flips an ordering inside the folder's own table.** Counting only the frames with a face under
   the board, 3.4f's four glide arms read **1.183 / 2.250 / 2.900 / 0.683 s** against the published **1.450 /
   4.033 / 3.683 / 0.683** — so **`ref` overtakes `predict`**, which it does not in the published row [M, the same
   24 runs an arm, this round's probe reproducing all sixteen published medians exactly, §9 C3]. **The owner's own
   cell is clean** (0–11 % off-face, and 0 % on every arm of the gentler face), so **1.033 s was never contaminated.**
9. **`?mountAgree=deck`, the only switch in four rounds that had moved the owner's cell, is now measured on a second
   face — and what it does is not what its median said.** Its median gain is **1.033 → 1.167 s** at 12.33° and
   **1.450 → 1.450 s** at 5.55° [M, 18 runs each]; but on **both** faces it lifts the runs **below the plant
   tables' 4 m/s floor** (**0.617 → 1.000 s** and **0.833 → 1.000 s**, 9 runs each) and leaves the 4–6 m/s runs
   **identical to the millisecond in 9 of 9** [M]. **So it is a mount fix for sub-floor entries, its direction is
   not face-conditional and its median is**, and on neither face does it stop a single fall.
10. **Of my ten scored predictions five are upheld, four are refuted and one is half** (§6b), and the refutations
    are the useful ones: `?mountAgree=deck`'s median does not survive the face change (**P6**), the fall mix does **not**
    move toward the slow stall — **stalls are 0 of 309 on every glide arm in this round** and the falls are
    capsizes of **42.6–70.0°** median bank at **1.16–8.97 m/s** through the water (**P10**), and the low-side 5.5°
    placements are **not** dominated by off-face frames in the way I predicted (**P8**, 28.7–29.1 % of frames, not
    over 60 %, and **0 of 24 runs end** off the face because the crest catches them up). **I built nothing and the
    owner's bar is untouched.**

## 1. (A) The four reads that had to come first

**R1 [R]. `FaceWater`'s placement algebra, closed.** `η = H (1 − smoothstep(a/front))` with
`front = 1.5 H / tan(slope)` and `smoothstep(t) = t²(3 − 2t)` [R, `src/physics/testing/FaceWater.ts`], so at
`a = AHEAD · front` the height fraction is `1 − smoothstep(AHEAD)` — **which is exactly the probe's own `faceFrac`
column** — and the slope is `atan(tan(slope) · 4 AHEAD (1 − AHEAD))`. The factor `4 AHEAD (1 − AHEAD)` is **1 at
mid-face and symmetric about it**, which is R1's load-bearing half: *the placement cannot pick a slope without also
picking which side of the face it is on.*

**R2 [R]. The entry speed is a function of the placement.** `3.3/plant.ts:813`:
`entry = entry0 ?? ((FACE[2] − alongFlow) / cos 45° + extra)`, and `alongFlow` is `FaceWater`'s own
`u = c η/(d + η)` **at the placement**. So an `EXTRAS` arm at `AHEAD` 0.0925 rides a band centred **2.67 m/s slower**
than one at `AHEAD` 0.95. This read is why the first batch of this round's arms was thrown away and re-run on
`ENTRIES`: the discarded arms are declared in §13.

**R3 [R]. The game never calls `design` at the controller's exact point; the probe does.** `scheduledDesign` is
called at **table points** (`plantAt(speed, depth, …)`, cached by `speed|depth|rail|weights`) and the controller
**blends** them [R, `predictiveBalance.ts:1186–1213`, `:1348–1357`]. The probe's `design(y, tw, wArm)` at
`3.3/plant.ts:1381` is a **measurement** call at the exact point, feeding `heelDesignOff` and the 3.4f columns and
nothing the ride reads. That matters because at a placement high on the face its `dlqr` **throws `singular`** — so
**the throw is the probe's, not the game's, and no rider in the game can reach it.** It is why the three high-side
arms were run **one process per (stance, entry)**: a throw then costs that one run (§9 C4).

**R4 [R]. The two kinds of fall have one published definition and this round uses it unchanged.** *"(a) the sudden
fall into the face: the body's bank past 45° at the end …; (b) the slow stall: cause `balance` with the bank within
20° of upright and the speed through the water under 2.5 m/s; (c) anything else"* [R,
`docs/research/face-hold-2026-11-10/kinds.py.txt:1–2`], read off `3.3/plant.ts`'s own `bankFall` and `throughFall`
[R, `:1921–1923`]. **And its threshold sits on a clamped column**: `AttachedRider` hard-clamps the measured bank at
`MAX_BANK = 70°` [R, the handoff's queued round], and `bankFall` is **70.00 exactly** in 6–21 of 24 runs an arm
here [M]. **So "sudden" partly counts runs that reached the clamp**, and §4's mix is reported with that said.

## 2. (B) Part A — the placement sweep, exact, and the four quantities it moves

| **[M]** `FACE=1.4,16,5.7`, `front` 7.32 m; exact (§9 C1) | `faceFrac` | **along the face** | **across the deck** (ψ 45°) | room to the trough | the water `u` | the `EXTRAS` entry | where on the owner's own face that slope lives |
|---|---|---|---|---|---|---|---|
| `AHEAD` **0.0925** (upper) | **0.976** | **5.50°** | **3.89°** | 6.65 m | 1.964 m/s | 5.284 m/s | **0.157 of H** |
| 0.15 (upper) | 0.939 | 8.32° | 5.90° | 6.23 m | 1.915 | 5.353 | 0.283 of H |
| **0.25** (upper) | 0.844 | **12.14°** | 8.65° | 5.49 m | 1.781 | 5.543 | above its profile |
| 0.35 (upper) | 0.718 | 14.62° | 10.45° | 4.76 m | 1.590 | 5.813 | above its profile |
| **0.50** (mid) | 0.500 | **16.00°** | 11.46° | 3.66 m | 1.209 | 6.351 | above its profile |
| **0.65** | 0.282 | **14.62°** | 10.45° | 2.56 m | 0.751 | 6.999 | above its profile |
| **0.75 — the folder's own** | **0.156** | **12.14°** | **8.65°** | **1.83 m** | 0.442 | **7.435** | above its profile |
| 0.85 | 0.061 | 8.32° | 5.90° | 1.10 m | 0.181 | 7.806 | 0.283 of H |
| **0.90** | 0.028 | **5.89°** | **4.17°** | 0.73 m | 0.085 | 7.941 | 0.173 of H |
| **0.9075** | 0.024 | **5.50°** | **3.89°** | 0.68 m | 0.073 | 7.958 | **0.157 of H** |
| 0.95 | 0.007 | 3.12° | 2.21° | 0.37 m | 0.022 | 8.030 | 0.077 of H |

**And the owner's own wave, read again this round as its own control** — Canyon B (`?canyonWaves=true`, `canyonBed
'b'`, grid **400 × 451**, read off the built config), swell **Practice**, tide mid, stage 2, CPU, **seed 3**,
60–160 s every 0.2 s, seven columns, **the clean ridable faces whose crest is within 25 m of the take-off, n 1 527
faces**, spun up fresh on the CPU in **47.2 s** (read, so nothing was imported):

| **[M]** | H | run | `local` | **at 0.16 of H** | steepest at | the profile up the face |
|---|---|---|---|---|---|---|
| this round, seed 3, n **1 527** | **1.43 m** (1.06–1.90) | **15.4 m** (11.2–24.4) | **12.2°** (7.6–17.3) | **5.8°** (2.9–8.5) | **0.63** | 2.3 / 5.5 / **5.8** / 9.0 / 11.2 / 11.7 / 11.9 / 10.2 / 6.3° |
| step 3.4g, seed 3, n 2 194, 60–200 s [R] | 1.39 m | — | 11.7° | **5.6°** | 0.62 | 2.3 / 5.3 / **5.6** / 8.7 / 10.8 / 11.2 / 11.4 / 9.6 / 6.0° |
| step 3.4g, seeds 1 / 2 / 3, n 5 677 [R] | 1.39 / 1.67 / 1.39 | — | 11.5 / 11.9 / 11.7° | **5.5 / 5.4 / 5.6°** | 0.63 / 0.63 / 0.62 | — |

**So the target is 5.4–5.8° across three seeds and two windows**, and the two reads of seed 3 agree to **0.2°** at
the board's place on a window 40 s shorter. *n* counts faces, not independent waves.

**Four readings, and the first two are the round's own refutations of its brief.**

1. **The span is real and exact, and the handoff's four numbers are right.** 16.00 / 14.62 / 12.14 / 5.89° against
   its 16.0 / 14.6 / 12.3 / 5.9, and `faceFrac` 0.500 / 0.282 / 0.156 / 0.028 against its 0.50 / 0.27 / 0.16 / 0.03.
   **Confirmed, not refuted** — and the only discrepancy, 12.14 against 12.3, is the one frame of drift between the
   placement and the first dumped frame, which this round measures at **12.12° (24 runs) and 12.33° (18 runs)** [M].
2. **"Free" is refuted.** Of the four columns the placement moves, **two have nothing to do with the face's angle**:
   the room (0.37–6.65 m, an **18-fold** range) and the entry band (5.28–8.03 m/s, **2.67 m/s**, which is **45 %**
   of the glide cell's whole `EXTRAS` span). An `AHEAD` sweep on `EXTRAS` is therefore a sweep of **two** things at
   once, and this round's own first batch of six arms was discarded for exactly that (§13).
3. **There is no placement on this wave that puts the board on his 5.4–5.8° where his wave presents it.** His clean
   face gives 5.5° at **0.157 of its height**; `AHEAD` 0.9075 gives that slope at `faceFrac` **0.024** and `AHEAD`
   0.0925 at **0.976** — a factor of **6.5** either way. **And the shipped placement's 12.14° is above his clean
   profile's highest point** (11.9° at 0.70 of H, n 1 527): on the median clean face near his take-off, the water
   the board is put on **does not occur at any height at all**. It occurs on his **breaking** faces, which read
   9.8–11.5° at 0.16 of H and reach 19.3° [M/R].
4. **The face's own slope is the one knob that moves the water under the board and nothing else the probe sets.**
   `FACE=1.4,7.32,5.7` at `AHEAD` 0.75 holds `faceFrac` (0.1560), the heading (ψ 45°), the entry baseline
   (7.435 m/s), the height (1.4 m), the depth (2.6 m) and the crest speed (5.7 m/s), and moves the slope from
   **12.14° to 5.50°**. It is **not** a change of one number in the water: the front grows **7.32 → 16.35 m**, so
   the room grows 1.83 → 4.09 m and the face's curvature halves. **Both of those move the wave TOWARD the owner's
   own** (his run is 15.4 m, 11.2–24.4), which is why this is the round's headline arm and not a confound to
   apologise for — but it is two consequences of one knob and it is named as such.

## 3. (B) Part B — the frames with no face under the board

### 3a. The mechanism, against the brief's own four candidates

| **[M]** the candidate | the read | the verdict |
|---|---|---|
| **a guard returning a zero rather than an absence** | `faceFrac` recomputed from `aheadFronts` alone, as `1 − smoothstep` (or 1 behind the crest), against the dumped column: peak residual **1.2 × 10⁻⁴** over 3.4f's **21 621** frames and this round's **58 210** | **refuted — it is geometry**; and rows whose four columns are not all finite: **0** [R, 3.4g §3 reading 7] |
| **running off the BACK of the patch** | the `aheadFronts` of the off-face frames: **0.981–2.013** on every arm; **behind the crest: 0 frames** of 71 000. `faceFraction` returns **1** for `ahead < 0` by construction [R], so it cannot appear | **refuted, and impossible** |
| **outside the lateral extent** | `FaceWater` is *"the same along x"* [R]; `sampleAt` ignores `x` entirely | **refuted by construction** |
| **a datum or initialisation artefact** | the share at the ride's own age: **0 % in the first 0.5 s of every arm of both rounds** | **refuted** |
| **the board running off the FRONT, onto the flat still water ahead of the trough** | `aheadFronts ≥ 0.981` is at or past the trough, where `FaceWater`'s surface is `H(1 − smoothstep(≥1)) = 0` and its flow is `c·0/(d+0) = 0` — **flat to the last bit and still to the last bit** | **this is it** |

**And the quantitative closure**: at `AHEAD` 0.75 the board has **1.83 m** of face left; on `g-off` it gains on the
wave at a median **+1.228 m/s**, which is **1.49 s** of room, against a measured median first-off-face frame at
**1.150 s** [M, 24 runs]. On `s8-off` the room is **3.74 m** and the drift is **−0.270 m/s** (the crest gains on the
board), and **3 of 24** runs ever leave [M].

### 3b. It is survivorship, and the three-fold spread is not a property of the arms

| **[M]** step 3.4f's own arms | published median | **t 0.2–0.7 s, off-face** | off-face, all frames | runs that leave | **own duration off, median** | **ends off the face** |
|---|---|---|---|---|---|---|
| `g-off` (the shipped glide arm) | 1.450 s | **0 of 720** | 22.5 % | 15 of 24 | **16.4 %** | **15 of 24** |
| `g-predict` | 4.033 s | **0 of 720** | 31.6 % | 14 of 24 | **31.1 %** | 0 of 24 |
| `g-ref` | 3.683 s | **0 of 720** | 14.0 % | 6 of 24 | 0.0 % | 0 of 24 |
| `g-tilt` (`both`) | 0.683 s | **0 of 427** | 0.0 % | 0 of 24 | 0.0 % | 0 of 24 |
| `l-off` (the owner's cell) | 1.033 s | **0 of 505** | 11.0 % | 1 of 18 | 0.0 % | 0 of 18 |
| `l-tilt` | 0.433 s | **0 of 255** | 0.0 % | 0 of 18 | 0.0 % | 0 of 18 |
| `s8-off` | 4.600 s | 0 of 720 | 5.5 % | 3 of 24 | 0.0 % | 0 of 24 |
| `s24-off` | 0.917 s | 16 of 715 | 8.8 % | 10 of 24 | 0.0 % | **10 of 24** |

**Four readings.**

1. **At a matched age the arms are identical, and the identity is zero.** Seven of the eight read **0 of 427–720**
   frames in t 0.2–0.7 s [M]. The only arm with any is `s24-off`, whose face is **4.72 m** long. **So the
   three-fold spread the handoff called *"a live candidate"* for Part 5's unexplained ordering is a difference of
   ride LENGTH, not of arm**, and `g-tilt`'s and `l-tilt`'s zeroes are because **their longest frame is at 1.183 s
   and 0.683 s** against a median first-off-face of 1.150–1.550 s. **The candidate is refuted**, and by the arms'
   own frames.
2. **But the shipped glide arm's ride ENDS on a flat still lake in 15 of 24 runs**, with `faceFrac` **0.0000** and
   `|tilt|` **0.000°** at the last frame [M] — which the handoff did not know and which is worse than a share of
   frames. The fall comes **0.300 s** (0.067–1.900) after the board leaves the face.
3. **Which runs leave is chosen by the entry speed, so the bias is systematic and signed.** On `g-off` **every** run
   at `extra ≥ 0` leaves the face and **no** run at `extra ≤ −1` does; the three longest rides in the arm (1.800,
   2.117, 2.683 s) are all `extra = 3` and spend **0.98 / 1.32 / 1.90 s** of themselves on flat water [M]. **The
   flat-water frames lengthen the ride**, and they lengthen the fastest runs most.
4. **The owner's own cell is clean.** `l-off` **1 of 18** runs, `l-tilt` 0 of 18, and **0 of 18 on every arm of the
   gentler face in this round** [M] — because its 1–6 m/s entries are slower than the wave, so the crest catches the
   board up (drift **−0.97 to −2.25 m/s**) instead of the board outrunning it. **1.033 s was never contaminated.**

### 3c. What it does to the published rows, and the ordering it flips

| **[M]** the same 24 / 18 runs an arm, this round's probe | published median | **on-face prefix** (`until off`) | **total face time** | the ordering |
|---|---|---|---|---|
| the glide: `off` / `predict` / `ref` / `both` | **1.450 / 4.033 / 3.683 / 0.683** | 1.183 / 1.783 / 1.583 / 0.683 | **1.183 / 2.250 / 2.900 / 0.683** | **`ref` overtakes `predict`** |
| the owner's cell: `off` / `predict` / `ref` / `both` | 1.033 / 0.967 / 0.483 / 0.433 | **unchanged** | **unchanged** | unchanged |
| the 8° face: `off` / `predict` / `ref` / `both` | 4.600 / 3.300 / 3.000 / 2.250 | 2.283 / 3.300 / 3.000 / 2.250 | **3.417** / 3.300 / 3.000 / 2.250 | unchanged, and `off`'s lead narrows to 0.117 s |
| the 24° face: `off` / `predict` / `ref` / `both` | 0.917 / 1.600 / 1.017 / 0.233 | 0.833 / 1.067 / 0.733 / 0.233 | 0.817 / 1.067 / 0.833 / 0.233 | unchanged |

**Two readings, and a refusal.**

1. **This probe reproduces all sixteen published medians exactly** — 1.450, 4.033, 3.683, 0.683, 1.033, 0.967,
   0.483, 0.433, 4.600, 3.300, 3.000, 2.250, 0.917, 1.600, 1.017, 0.233 [M, §9 C3] — so the corrected columns beside
   them are the same runs read a second way and not a different arm.
2. **One ordering in the folder's own table does not survive the correction.** Part 6 published `predict` 4.033 >
   `ref` 3.683 and called the two halves' effects *"a property of the 16° face"*; on face time they are **2.250 <
   2.900** [M]. And `s8-off`'s lead over `s8-predict` falls from **1.300 s to 0.117 s**. **`both` is untouched on
   all four cells** — it never leaves the face.
3. **I will not call either column the right one.** The published median is *the time before the rider fell*, which
   is what the owner's bar is about; the face-time column is *the time there was a wave under him*, which is what a
   comparison across arms needs. **They are two quantities, both printed, and the probe now carries both.** That is
   this round's probe fix: `place.ts`'s §R prints `median s`, `until off, med` and `face time, med` side by side.

## 4. (B) Part C — the falls, at the placement and on the face that put the board where he rides

**All arms: `RIDER=new FELT=deck BODY=two` — the rider the owner actually rode on 2026-11-16 night — the stance
held, the stick never touched, 9 s a run, and the SAME eight absolute entries (4.435 … 10.435 m/s) at every
placement so the entry band cannot move with it.**

| **[M]** the glide cell, 24 runs an arm unless said | at the board: along / across | `faceFrac` | **fell** | **median s** | **face time, med** | Compress fell | off-face frames |
|---|---|---|---|---|---|---|---|
| `p50-g`, mid-face | **16.00 / 11.89°** | 0.496 | **24 of 24** | **1.050** | 1.050 | **8 of 8** | 5.4 % |
| `p35-g`, upper | 14.71 / 10.85° | 0.714 | **24 of 24** | 1.000 | 1.000 | **8 of 8** | 5.8 % |
| `p65-g`, lower | 14.60 / 10.77° | 0.280 | **24 of 24** | 1.183 | 1.083 | **8 of 8** | 9.5 % |
| `p25-g`, upper | **12.30 / 8.96°** | 0.839 | **24 of 24** | **1.100** | 1.100 | **8 of 8** | 14.2 % |
| **`c-a75-g-abs`, the shipped placement** | **12.12 / 8.82°** | **0.156** | **24 of 24** | **1.467** | 1.183 | **8 of 8** | 22.6 % |
| `p15-g`, upper (23 runs) | 8.50 / 6.10° | 0.936 | **23 of 23** | 2.000 | 1.667 | **7 of 7** | 35.7 % |
| `p0925-g`, upper (22 runs) | **5.80 / 4.12°** | 0.973 | **22 of 22** | 2.200 | 1.833 | **7 of 7** | 47.3 % |
| `p90-g`, lower | 5.91 / 4.21° | 0.028 | **24 of 24** | 2.700 | 1.967 | **8 of 8** | 29.1 % |
| `p9075-g`, lower | **5.52 / 3.93°** | 0.024 | **24 of 24** | **2.750** | 2.067 | **8 of 8** | 28.7 % |
| **`f73-g` — the 7.32° face at the shipped placement** | **5.50 / 3.91°** | **0.156** | **24 of 24** | **4.650** | **4.483** | **8 of 8** | **1.2 %** |

| **[M]** the owner's own cell, `ENTRIES=1…6`, 18 runs an arm unless said | at the board | `faceFrac` | **fell** | **median s** | Compress fell | Compress med | off-face |
|---|---|---|---|---|---|---|---|
| `p50-l`, mid-face | **16.00 / 11.89°** | 0.506 | **18 of 18** | **0.933** | **6 of 6** | 1.033 | 0.0 % |
| `p25-l`, upper (16 runs) | 12.09 / 8.80° | 0.845 | **16 of 16** | 1.233 | **5 of 5** | 1.233 | 0.0 % |
| **`a75-l-off`, the shipped placement** | **12.33 / 8.98°** | 0.163 | **18 of 18** | **1.033** | **6 of 6** | 1.167 | 11.0 % |
| `p90-l` / `p9075-l`, lower | 6.28 / 4.47° · 5.89 / 4.20° | 0.032 / 0.028 | **18 of 18** ea | **1.133** ea | **6 of 6** ea | 1.200 ea | 0.0 % |
| `p0925-l`, upper (13 runs) | 5.43 / 3.86° | 0.977 | **13 of 13** | 1.583 | **2 of 2** | *7.283* | 30.6 % |
| **`f73-l` — the 7.32° face** | **5.55 / 3.95°** | **0.160** | **18 of 18** | **1.450** | **6 of 6** | **1.450** | **0.0 %** |

**Six readings, and the first is Part C's answer.**

1. **The falls persist, everywhere, and that is the result the brief said would be equally good.** **626 rides, 29
   arms, 626 of 626 fell. Compress: 205 of 205.** The longest ride of the 626 is **7.75 s** and **nothing reached
   nine seconds** [M]. The owner's bar — *"in Compress the surfer should not fall at the low speeds of getting into
   position … 100 %"* — is **not met at any slope under the board from 5.4° to 16.0°, on either side of the face, at any of the nine
   placements, on two faces, at entry speeds from 1 to 10.4 m/s.** **The 24-of-24 at 12.3° was not a test artefact.**
2. **The ride time is strongly ordered by the slope under the board, and that is real.** On the lower face the glide
   cell runs **1.050 → 1.183 → 1.467 → 2.700 → 2.750 s** as the slope falls **16.00 → 14.60 → 12.12 → 5.91 →
   5.52°** [M, 24 runs each], monotone in five steps, and on the corrected face-time column it is **1.050 → 1.083 →
   1.183 → 1.967 → 2.067 s** — still monotone. **P3 upheld.**
3. **But the slope is not sufficient, and the symmetry proves it.** **12.30° high on the face rides 1.100 s against
   12.12° low at 1.467; 5.80° high rides 2.200 against 5.52° low at 2.750** [M]. The same water angle, two sides,
   and the lower side rides **1.25–1.33 ×** longer. The lower side is also where the water is slower (`u` 0.07–0.44
   against 1.78–1.96 m/s) and the room is shorter. **This is a measurement that the handoff's one-number-per-
   placement framing cannot carry.**
4. **And the room is worth as much as the slope.** `f73-g` and `p9075-g` put the board on the **same** slope — 5.50°
   against 5.52° — and ride **4.650 s** against **2.750**. What differs is the face: 16.35 m of front against 7.32,
   4.09 m of room against 0.72, `faceFrac` 0.156 against 0.024 [M]. **A ×1.69 ride difference at a matched slope.**
5. **`f73-g` is the longest glide median in the folder and the first one with no flat water in it.** 4.650 s against
   `s8-off`'s 4.600, with **1.2 % of frames off the face** against `s8-off`'s 5.5 % and `g-off`'s 22.6 %, and a
   **face time of 4.483 s** [M]. Its structure is clean and bimodal by entry: the four runs at 8.435–10.435 m/s ride
   **4.65–5.18 s** with **0 off-face frames**, the four at 4.435–7.435 ride **1.67–2.48 s**. **P4 upheld.**
6. **The owner's own cell barely moves, and this is the sentence that matters for his bar.** Its median spans
   **0.933 → 1.450 s** across every placement and both faces — a factor of **1.55**, against the glide cell's
   **4.43** — and **18 of 18 fall in all of them** [M]. **P5 upheld.** Its entries are 1–6 m/s and the plant's own
   tables begin at **4 m/s** [R], so three of its six speeds are below the floor on every arm. **Making the wave
   gentler does not reach the cell the owner's bar is about.**

### 4b. The kinds of fall, and a third population the classifier does not name

| **[M]** by the published classifier (§1 R4) | sudden | **slow stall** | other | \|bank\| at the fall, median (span) | `through` at the fall |
|---|---|---|---|---|---|
| `c-a75-g-abs`, 12.12° | **24** | **0** | 0 | **70.0°** (52.6–70.0) | 6.47 m/s |
| `p50-g`, 16.00° | 15 | **0** | 9 | 57.8° (30.9–70.0) | 8.97 m/s |
| `p9075-g`, 5.52° | 12 | **0** | 12 | 50.8° (7.8–70.0) | 2.45 m/s |
| **`f73-g`, 5.50°** | 14 | **0** | 10 | **48.5°** (32.6–70.0) | **1.31 m/s** |
| `a75-l-off`, 12.33° (18) | 15 | **0** | 3 | 63.7° (29.4–70.0) | 2.86 m/s |
| **`f73-l`, 5.55°** (18) | 8 | **0** | 10 | **42.6°** (29.4–70.0) | **1.16 m/s** |
| 3.4f's `l-predict` / `l-ref` / `l-tilt` (18 ea) [M] | 10 / 6 / 8 | **6 / 6 / 4** | 2 / 6 / 6 | — | — |

**Three readings.**

1. **P10 is refuted: the mix does not move toward the slow stall on the gentler face. It moves toward "other".**
   **0 stalls in 309 glide runs of this round**, on every slope from 5.5 to 16.0°, and the `other` share rises from
   **0 of 24** at 12.12° to **9–12 of 24** on the gentler and upper arms [M]. The stalls that exist in this folder
   are in the owner's own **low-speed** cell with a datum arm on — 3.4f's `l-predict`, `l-ref`, `l-tilt`, 4–6 of 18
   each — and **not one of this round's own arms produced one.**
2. **What "other" is, is a slow capsize, and it is a third kind.** On `f73-g` the ten `other` falls end with a
   median bank of **48.5°** at **1.31 m/s** through the water — too banked for the stall's 20° and, where they fall
   between 20 and 45°, not past the sudden kind's threshold either. **The gentler the face, the slower the fall and
   the smaller the bank it falls at**: 70.0° at 6.47 m/s on the shipped arm against 42.6° at 1.16 m/s on `f73-l`.
   **The fall is becoming a slow topple, and the two published kinds do not have a name for it.**
3. **And the column the classifier reads is clamped.** `bankFall` is **70.00 exactly** in **21 of 24** runs of the
   shipped arm and 6–8 of 24 on the gentler ones [M, §1 R4]. So part of "sudden 24 of 24 → 14 of 24" is **how many
   runs reached `MAX_BANK`**, not how the fall changed. **The mix is reported; it is not a finding until the clamp
   round has run.**

## 5. (B) `?mountAgree=deck` on a second face — the handoff's resume item 3

| **[M]** the owner's own cell, 18 runs an arm | median, all 18 | **median, entries 1–3 m/s** (9 runs) | the 4–6 m/s runs | fell | Compress |
|---|---|---|---|---|---|
| `a75-l-off`, 12.33° | **1.033 s** | **0.617 s** (0.500–1.000) | — | 18 of 18 | 6 of 6 |
| `c-a75-l-mdeck`, 12.33° | **1.167 s** (**×1.13**) | **1.000 s** (0.833–1.300) — **×1.62** | **identical to the millisecond in 9 of 9** | 18 of 18 | 6 of 6 |
| `f73-l`, 5.55° | **1.450 s** | **0.833 s** (0.617–1.283) | — | 18 of 18 | 6 of 6 |
| `f73-l-mdeck`, 5.55° | **1.450 s** (**×1.00**) | **1.000 s** (0.833–1.250) — **×1.20** | **identical to the millisecond in 9 of 9** | 18 of 18 | 6 of 6 |

**Three readings.**

1. **P6 is refuted as stated and upheld as a mechanism.** Its **median** gain does not survive the face change
   (×1.13 → ×1.00), so *"the only switch in four rounds that has moved the owner's cell"* **is face-conditional as a
   headline**. But on **both** faces it lifts the nine runs below the plant tables' 4 m/s floor, and on both it
   leaves the nine at or above the floor **bit-identical** [M]. **So the switch is a sub-floor mount fix, its
   direction holds on two faces, and its published number was a property of where the other nine runs happened to
   sit around the median.**
2. **It lands the sub-floor runs on the same 1.000 s from both sides** — 0.617 → 1.000 and 0.833 → 1.000 — which is
   what a fix to the mount's own geometry, rather than to the ride, would do.
3. **And it stops no fall on either face.** 18 of 18 and 6 of 6 Compress, both arms, both faces [M].

## 6. (B) Part D — what the rest would cost, and what would change sign or ordering

**The measured unit cost, so the price is not a guess.** One 24-run glide arm with its per-frame dump is **about
30 s** of one core and **1.5–3.5 MB** of dump; one 18-run owner's-cell arm about **20 s** and 1 MB. **This round is
29 arms and 626 rides, and it cost about 15 minutes of one core plus 12 MB committed gzipped.** A `TICKS=` dump
multiplies the bytes by roughly 7 and the time by about 1.6 [R, 3.4f's own 29 MB for 24 arms], and nothing in this
round needed one.

**So the honest price of the whole re-run is small, and the expensive part is not the CPU.**

| what | arms × runs | CPU | verdict |
|---|---|---|---|
| **the four datum arms × two cells, on the corrected face** | 8 × 24/18 | **~4 min** | **already done in this round** (`f73-g`, `f73-g-predict`, `f73-g-ref`, `f73-g-tilt`, `f73-l`, `f73-l-tilt`) |
| `?mountAgree=deck` on a second face | 2 × 18 | ~40 s | **already done** (§5) |
| **every falls-per-runs figure of steps 3.3f–3.4f** | ~24 × 24 | **~12 min** | **does not need re-running: the counts are saturated.** 626 of 626 here, on nine placements and two faces |
| the whole of Parts 1–6's **ride-time** tables, on the corrected face | ~48 arms | ~25 min of CPU | **the CPU is nothing; the rewriting is the cost.** Six Parts of tables and readings |
| **`ARANGE=wide`** (the ankle's bound) on the corrected face | 4 × 24 | ~2 min | **cheap and worth it**: 3.4f measured it *"never clamped"* on 8° and binding on 16° |
| PR #223's **bowl** row, `FACE=2.1,21,6.1 DEPTH=3.4` | 2 × 24/18 | ~1 min | **cheap, and the handoff's item 2** — the part of the arm the owner rides **into**, never run |
| #223's **set** row, `FACE=1.95,16,6.8 DEPTH=3.7` | 2 × 24/18 | ~1 min | cheap; moves the face's **length**, which §2 reading 4 shows is worth as much as its angle |
| the clamp round (`MAX_BANK`) | — | — | **blocks §4b**: the fall-kind mix cannot be read while its threshold sits on a clamped column |

**And the handoff's FACE-CONDITIONAL list, entry by entry, with what this round does to it.**

| the entry | what this round says | status now |
|---|---|---|
| *"each half alone nearly triples the ride"* | on the corrected face `off` is best of four — **4.650 / 3.283 / 2.983 / 2.250** — as on 8° and unlike 16° | **refutation CONFIRMED on a third face** |
| the **ordering** `off < predict / ref` | **off is first** on both gentle faces; and on the 16° face **`predict` and `ref` swap** once the flat-water frames come out (2.250 against 2.900) | **face-conditional AND contaminated**; two separate reasons |
| `both` roughly **halves** the ride | ×0.47 / 0.42 / 0.49 / 0.25 [R] and **×0.48** on `f73-g`, **×0.66** on `f73-l` | **robust in sign on six cells** |
| the shipped medians **1.450 / 1.033 s** | **1.467 / 1.033** reproduced; at 5.5° they are **4.650 / 1.450**; across every placement **1.000–2.750 / 0.933–1.583** | **conditional by ×4.4 on the glide cell and ×1.55 on the owner's** |
| **`?mountAgree=deck`'s 1.033 → 1.167** | **×1.13 → ×1.00** on the median; **×1.62 → ×1.20** on the sub-floor runs | **the median is conditional; the mechanism is not** (§5) |
| the ankle's clamp binding at the mount | not measured here | **still open; 2 min of CPU** |
| the two **kinds** of fall | **0 stalls in 309 runs**; the mix moves to "other", and the column is clamped | **re-opened, and blocked on the clamp round** |
| **every falls-per-runs figure of Parts 1–6 and of 3.3f–3.3p** | **626 of 626, 205 of 205 Compress, nine placements, two faces** | **NOT conditional. Unconditional again.** |

### 6b. The ten predictions, scored against the file committed before the arms (`bc63d94a`)

| | what it said | what the arms say | verdict |
|---|---|---|---|
| **P1** | `c-a75-g-abs` reproduces `g-off`'s **1.450 s, 24 of 24** to the frame | **22 of 24 runs identical, 24 of 24 within 0.034 s**, median **1.467** | **half**: the rides reproduce, the median moves one frame because two runs crossed it — the eight absolute entries are the `EXTRAS` values rounded to three decimals |
| **P2** | **the falls persist at every placement and on every face** | **626 of 626; Compress 205 of 205** | **upheld**, and it is Part C's answer |
| **P3** | the median rises **monotonically** as the slope under the board falls | on the lower face **1.050 → 1.183 → 1.467 → 2.700 → 2.750 s** over **16.00 → 5.52°**, monotone in five steps, and monotone again on the face-time column | **upheld** on the lower face; on the **upper** face it is not the same curve (§4 reading 3), which P3 did not anticipate |
| **P4** | `f73-g` gives **the longest glide median in the folder**, above 4.600 s | **4.650 s**, and with **1.2 %** off-face against `s8-off`'s 5.5 % | **upheld** |
| **P5** | the owner's own cell **moves less**, staying inside a factor of two of 1.033 s | **0.933–1.583 s** over every placement and both faces — ×0.90 to ×1.53 | **upheld** |
| **P6** | `?mountAgree=deck` **keeps its sign** on the 7.32° face | the **median** goes ×1.13 → **×1.00**; the **sub-floor runs** go ×1.62 → **×1.20** | **refuted as stated**, upheld as a mechanism (§5) |
| **P7** | `both` is still **the shortest** of the four datum arms | **2.250** of 4.650 / 3.283 / 2.983 / 2.250 — ×0.48 | **upheld**, a sixth cell |
| **P8** | the **low-side** 5.5° placements are **over 60 %** off-face | **28.7–29.1 %**, and **0 of 24 runs end** off the face | **refuted**, and for the opposite reason: the crest catches them up |
| **P9** | the **upper-side** placements have **almost no** off-face frames | **47.3 %** and **35.7 %** — the **highest** shares in the round | **refuted**, and the sign is inverted: they have the most room *and* the longest rides, so they have the most time to cross it |
| **P10** | the fall mix moves toward the **slow stall** on gentler faces | **0 stalls in 309 glide runs**; what grows is a kind the classifier does not name | **refuted** (§4b) |

**Five upheld, four refuted, one half** — and the four refutations are P6, P8, P9 and P10, every one of which was a
prediction about the *mechanism* rather than about a ride time.

## 7. What I refuted

- **The handoff's own word, "free", by four columns of one table.** `AHEAD` moves the slope, the height fraction,
  the room and the entry band together, and two of those four have nothing to do with the face's angle (§2).
  **My own first batch of six arms was discarded for walking into it** (§13).
- **My own P6.** I predicted `?mountAgree=deck` would keep its median gain on a second face. It does not (×1.00),
  and the measurement that saved the finding — the sub-floor split — was a read I made **because** the median came
  out flat (§5).
- **My own P10, and the brief's framing of it.** I predicted the fall mix would move toward the slow stall on
  gentler faces, as #223 measured on its own mild arm. **There are no stalls at all in 309 glide runs**, and what
  grows is a kind the classifier does not name (§4b).
- **My own P8 and P9, in size and in sign, and they are the pair.** I predicted the **low**-side 5.5° placements
  would be over 60 % off-face and the **upper**-side ones almost clean. It is **the other way round**: the low side
  is **28.7–29.1 %** with **0 of 24 runs ending** off the face, because the crest **catches it up** (drift −0.35 to
  −0.40 m/s); the upper side is **35.7 % and 47.3 %**, the highest shares in the round, because it has 6.2–6.7 m of
  face to cross, outruns the wave at **+2.0 to +2.4 m/s** and lives long enough to do it. **I had the room right and
  the direction of travel backwards.**
- **The handoff's live candidate for Part 5's unexplained ordering**, by the arms' own frames: at a matched age the
  off-face share is **0 of 427–720 on seven of eight arms** (§3b).
- **And 3.4g's reading 6, which declined to separate two confounds, is now separated in one direction.** It wrote
  *"the arms that sit flattest ride longest and the arms that ride longest have more time to drift onto flat water;
  these dumps cannot separate those."* The matched-age read separates them: **flat water cannot cause the early
  divergence, because there is none of it before 0.5 s in any arm.** The other direction — that long rides acquire
  flat water — is confirmed and signed (§3b reading 3).

## 8. What I will not claim

1. **I will not claim `f73` is the owner's wave.** It matches him on five quantities at once — the slope at the
   board (5.50 against 5.4–5.8°), the height fraction (0.156 against 0.157), the height (1.4 against 1.43 m), the
   crest speed (5.7 against 5.6 m/s) and the crest-to-trough run (16.35 against 15.4 m) — and it is **wrong on his
   `local`** (7.32° against 12.2°) and on where his steepest point sits (**0.50 against 0.63 of H**). **A smoothstep
   cannot have his toe and his peak at once**, which is 3.4g's §4b reading 4, and this round chose the toe because
   the toe is where the board is. **It is a better model of the water under the rider and a worse model of his wave.**
2. **I will not claim the room is a mechanism.** §4 reading 4 is **two arms**, matched on slope and differing in
   three things (front length, room, height fraction). It is a measurement that the slope is insufficient, not an
   attribution to the room.
3. **I will not read `p0925-l`'s Compress median.** It is **2 runs**, because four of that cell's six Compress runs
   were lost to the probe's own singular design (§9 C4). It is printed in italics in §4 and nothing is built on it.
4. **I will not call the upper/lower asymmetry the water's.** The two sides differ in the along-face current by a
   factor of **4 to 27** as well as in the room, and `FaceWater`'s current is `c η/(d + η)`, a construction, not a
   measurement of anything.
5. **I will not say the face-time column is the ride time.** §3c reading 3.
6. **No claim at all about feel.** 626 bot rides, not one of them evidence of anything the owner would feel. The
   shot list in §12 is the only thing in this document that can answer that.
7. **And I will not price the clamp round's outcome.** §4b's mix sits on a column clamped at 70° and I do not know
   which way it moves when the clamp does.

## 9. The controls

- **C1, Part P's algebra against `FaceWater` itself.** The closed forms for the slope and the height fraction
  against `sampleAt` and `faceFraction` at the same twelve placements, on four faces: **peak |Δslope| 1.8 × 10⁻¹⁵°,
  peak |ΔfaceFrac| 2.3 × 10⁻¹⁶** [M]. So §2's table is the probe's own water and not an algebra that resembles it.
- **C2, the `faceFrac` identity.** `faceFrac` recomputed from `aheadFronts` alone against the dumped column: peak
  **1.2 × 10⁻⁴** over **21 621** frames of 3.4f's eight arms and **58 210** of this round's 23 reported ones [M]. The residual is
  the dump's own 4-decimal rounding.
- **C3, the published medians, reproduced.** This round's probe, reading 3.4f's own kept `.jsonl` files, prints
  **1.450 / 4.033 / 3.683 / 0.683 / 1.033 / 0.967 / 0.483 / 0.433 / 4.600 / 3.300 / 3.000 / 2.250 / 0.917 / 1.600 /
  1.017 / 0.233** — **all sixteen of Part 6 §7's medians, to the millisecond** [M, `34h-34f-reread.txt`]. And
  `c-a75-g-abs`, the shipped placement re-run here on **absolute** entries, gives **1.467 s** against `g-off`'s
  **1.450**: the eight entries are the same eight rounded to three decimals, so the runs differ in their last digits
  and the median moves by one frame. **Declared, not hidden.**
- **C4, the join, and the runs that were lost.** The two dumps are joined on `(stance, entry)` and not on their
  order, because in the three per-process arms a crashed run leaves per-frame rows and **no** summary row.
  **Unjoined summary rows: 0 of 626.** Spare per-frame runs, dropped from both parts: **2 of `p0925-g`, 1 of
  `p15-g`, 2 of `p25-l`, 5 of `p0925-l`** — every one of them a `design` throw, logged per arm in `*.lost`.
  **Reading `runs[i]` instead of joining put a 7.28 s per-frame record against a 1.100 s ride in this round's own
  first draft**, and the fix is in the committed probe.
- **C5, the Canyon control.** This round's own read of Canyon B reproduces 3.4g's seed-3 profile to **0.2–0.5°** at
  every height fraction on a window 40 s shorter, off a sea spun up fresh on the CPU in **47.2 s** and a config read
  for `canyonBed 'b'` and grid **400 × 451** [M, §2].
- **C6, `fell` is read as a column and not as a diff.** 626 of 626 is `summary.filter(r => r.fell).length`, and the
  survivor list is **empty**; the longest ride of the 626 is 7.75 s, printed from the same column.
- **C7, the committed dumps read the same as the scratch ones.** §R run against `results/34h/` after gzipping gives
  the same table as against the scratchpad [M].

## 10. Seatbelts

- **`git diff --numstat main -- src/ server/` prints nothing at all.** No byte of the game moves in this round, so
  no ride of the game can. Two files are added (`3.4/place.ts`, the results folder) and one is appended to
  (`3.4/README.md`); `3.3/plant.ts` is **unchanged** — this round rode it exactly as Part 7 left it.
- `./node_modules/.bin/tsc --noEmit -p .`: **exit 0**. `-p server/tsconfig.json`: **exit 0**.
- the probes type-checked **separately**, on a throwaway project extending the root's options with
  `types: ["node", "@webgpu/types", "three"]` and an **absolute** `typeRoots`: **exit 0**, `--listFiles` confirming
  **915 files** including `3.4/place.ts`, `3.4/face.ts` and `3.3/plant.ts`. Every exit code read **on its own line
  and never through a pipe**; the worktree's `node_modules` is a **symlink**, so `npx` never ran.
- `vitest`: the three merge suites, below.
- **The Canyon byte check**, §10b below, with its three cautions: the wrapper **prepended to the bundle**, the **grid**
  read, and the **spin-up line** read so nothing was imported.
- `src/wave/SurfZoneSimulation.test.ts` is closed by reading: nothing in this round touches the solver, the sea, a
  snapshot or any spot's configuration, and its own per-test timeout is 644.5 minutes [R], so it could not gate
  anything if it did.

### 10b. The suites and the Canyon byte check

| **[M]** 3 600 steps, fresh spin-up, this branch (`bc63d94a`) | grid | spin-up | snapshots | state |
|---|---|---|---|---|
| **Canyon B** (`?canyonWaves=true`) | **400 × 451** | **58.3 s** | **`a367d938f15fa934`** | **`9e5831f80e38abd9`** |
| the brief's own reference | 400 × 451 | — | `a367d938f15fa934` | `9e5831f80e38abd9` |
| **the default Canyon** | **400 × 507** | **54.3 s** | **`ea3d57a4d49f4b48`** | **`a1a2555739210f96`** |
| the brief's own reference | 400 × 507 | — | `ea3d57a4d49f4b48` | `a1a2555739210f96` |

**All four hashes are the brief's own references, to the character.** The three cautions, each read rather than
assumed: the wrapper is `globalThis.location = { search: '?canyonWaves=true' };` **prepended to the bundle** with
`cat`, so `devTools.ts:9` sees a real `search`; the **grids are read off the bench's own line** and they are the two
different spots (180 400 against 202 800 cells); and the **spin-up lines are 58.3 s and 54.3 s**, so neither run
imported a kept `.sea` — both `--state` paths were new files in this round's scratchpad. The raw record, with the
grid and spin-up lines in place, is `results/34h/34h-canyon-byte-check.txt`. The p50/p95 timings in it were taken
while other work ran on the machine and **nothing in this document quotes them**.

**And the check cannot have failed, for a reason that is read and not inferred: `git diff --numstat main -- src/
server/` prints nothing.** The byte check is run anyway, because the brief asked for it and because a diff is a
claim about the files while the hashes are a claim about the bytes the sea actually produced.

- `vitest run src/physics`: **58 files, 635 passed, 21 expected fail** — step 3.4e's and 3.4f's own figures to the
  test.
- `vitest run src/game src/scene/rig`: **70 files, 736 passed** — the same.
- `vitest run src/ui src/dev src/net src/audio src/devTools.test.ts`: **56 files, 482 passed, 2 expected fail**.
- `vitest run src/wave/SurfZoneRunner.test.ts`, outside the merge suite and run by hand: **43 of 43**.

## 11. Files (3.4h)

- **`docs/research/new-rider/3.4/place.ts` — new, and the only file of code in this round.** Part **P**, the
  placement sweep's closed forms with the control against `FaceWater`'s own `sampleAt` and `faceFraction`, the
  entry-speed column and the owner's own measured profile as data; Part **O**, the off-face read with the
  `faceFrac`-from-`aheadFronts` identity, the matched-age window, the per-run share and the drift; Part **R**, the
  falls with each arm's own frame-1 geometry, the published median beside `until off` and `face time`, the published
  fall-kind classifier, and every run printed. It imports `FaceWater` and `createWaterSample` from `src/` for Part P
  and **nothing at all** for Parts O and R, and it **writes nothing**.
- **`docs/research/new-rider/3.3/plant.ts` — unchanged.** This round rode Part 7's own probe byte for byte; every
  arm here is `AHEAD`, `FACE`, `ENTRIES`, `WHEEL` and `MOUNTA`, all five of which already existed.
- `docs/research/new-rider/3.4/results/34h/` — **29 arms** as `.jsonl` (per run) and `.mount.jsonl.gz` (per frame),
  **12 MB gzipped against 55 MB raw**, plus:
  - `34h-predictions.md`, committed at **bc63d94a** before any arm of §4 was read, with Parts P and O declared as
    already read;
  - `34h-summary.txt`, Parts P, O and R generated over this round's arms;
  - `34h-34f-reread.txt`, the same two parts over **step 3.4f's own kept dumps** — §9 C3's control and §3c's table;
  - `34h-canyon-b-control.txt`, this round's own Canyon B read (§2, C5);
  - `34h-canyon-byte-check.txt`, the four hashes with their grids and spin-up lines;
  - `p0925-g.lost`, `p15-g.lost`, `p25-l.lost`, `p0925-l.lost` — the ten runs lost to the probe's own singular
    exact-point design, named by stance and entry (§9 C4).
- `docs/research/new-rider/3.4/README.md` — this Part, appended below Part 7's last line.
- **`src/` and `server/`: nothing.**

## 12. For the owner, in plain words — and the shot list

**Last round I told you our test wave was your wave in the moment it breaks, and that the board was sitting on
twice the water yours gives. I have now put the board on your own water. He still falls, every time.**

**One: the number you were waiting for.** I ran **626 rides** — nine different spots on the wave's face from just
under the crest to the very bottom, two different waves, speeds from 1 to 10.4 metres a second. **All 626 fell.
Compress fell in all 205 of its runs. Nothing got past 7.75 seconds, and nine is the bar.** That sounds like bad
news and it is actually the good kind: it means the last twenty-three rounds of *"he falls every time"* were **not**
an accident of a test wave that was too steep. The target is real.

**Two: what the gentler water does change.** The ride gets about **three times longer** on the flatter wave — 1.5
seconds to 4.7 — and the fall itself changes character. On the steep wave he is thrown at 70° of lean doing 6.5
metres a second. On the gentle one he topples at 43–48° doing 1.2 metres a second. **It is the same fall in slow
motion**, not a different one. **And your own slow stand-up barely moves at all**: 1.03 seconds on the steep wave,
1.45 on the gentle one, 18 of 18 falling in both. Making the wave kinder does not reach the part of the ride you
complained about.

**Three: a mistake in the last four rounds that I found and can now state.** Our test wave is a single hump with
flat water in front of it. On the standard test the board **outruns the wave after about 1.2 seconds** and spends
the rest of the "ride" on a dead flat lake — and in **15 of 24 runs the recorded fall happens on that lake**, not on
a wave at all. So some of the ride times in my last four reports were partly time spent on still water. **Your own
slow cell was never affected** (your board is slower than the wave, so the wave catches it). The probe now reports
both numbers side by side and I have re-stated the affected tables.

**Four: `&mountAgree=deck`, the one switch that looked like progress, measured again.** It still helps — it makes
your three slowest stand-ups last **half again as long** — and it does that on both waves, so it is a real fix to
how the rider is first placed on the board. **But it stops no falls at all**, and its headline number (1.03 → 1.17)
was an accident of where the other runs sat. I would keep it; I would stop calling it progress.

### The shot list, if you want to ride it

Canyon, `?canyonWaves=true`, your spot, `?physical&rider=new&feltFrame=deck&riderBody=two` — the body you said feels
human.

1. **Nothing new to ride from this round. There is no switch in it.** It is a measurement, and it says the thing we
   were worried about is not a measurement error.
2. **If you ride one thing, ride the bowl** — the end of the arm where it bends. Every arm in this folder has been
   fitted to your **take-off**, and your spot's bowl is **19–22°** where the take-off is 16° [R, PR #223]. If
   falling feels different there, that is a row we have never tested and it is one minute of CPU to add.
3. **And one question only you can answer, because a bench cannot.** On the gentle wave the fall became a **slow
   topple at 1.2 m/s** instead of a throw at 6.5. **Does a slow topple feel better or worse than being thrown?**
   If it feels worse — if slowly sinking is more annoying than being flicked off — then "make the ride longer" is
   the wrong target and I should stop optimising it.

**My recommendation, in order.** The rider-side levers are spent and the water-side ones are now measured too, so
I would stop sweeping the wave.

- **Step nine: the two-body rider's second half.** The handoff's own ruling after your 2026-11-16 ride was that
  *"the BODY is right and feels right; what remains wrong is what the board does underneath him"*, and the roll
  inertia finding (3.3l: the ankle keeps only **0.25–0.40** of its authority over the body, because the board's roll
  inertia is 0.5–1.1 kg·m² against the body's 52–54) is still the only unexplained mechanism on the chain. **This
  round removes the last excuse for not facing it**: it is not the wave.
- **Then the clamp round**, because §4b cannot be read until it runs: the fall-kind classifier's 45° threshold sits
  on a column `AttachedRider` hard-clamps at 70°.
- **Not** another face, another placement, another datum arm or another stance. Nine placements and two faces say the same thing the one face said.

## 13. The deletions column, read line by line

`git diff --numstat main HEAD`, read for the **deletions** column before every push, which has caught a silent
revert on sixteen consecutive rounds:

- **`docs/research/new-rider/3.4/place.ts`** — new, insertions only.
- **`docs/research/new-rider/3.4/results/34h/…`** — new, insertions only. `34h-predictions.md` was committed at
  **bc63d94a** before the arms and **has not been edited since**, so within the branch its own numstat is `0` in
  both columns after that commit.
- **`docs/research/new-rider/3.4/README.md`** — Part 8 appended below Part 7's last line. **Parts 1–7 are
  byte-identical, and the `0` in this file's deletions column is the check for it.**
- **`git diff --numstat main -- src/ server/` prints nothing at all** — §10's seatbelt and this round's strongest
  single line.
- **`docs/research/new-rider/3.3/plant.ts` does not appear in the diff at all.** This is the first round since 3.3k
  that did not touch the ride probe.
- **What was written and then thrown away, declared rather than left out.** The round's **first** six arms
  (`a25-g-off`, `a50-g-off`, `a65-g-off`, `a75-g-off`, `a90-g-off`, `a9075-g-off`, `a75-l-off`) were run on
  `EXTRAS`, the probe's **relative** entry, before §1 R2 was read. `EXTRAS` takes the water's own flow at the
  placement off the entry, so those arms rode a speed band that moved with the placement by up to 2.67 m/s and
  **their ride times are not comparable across placements.** They were re-run on `ENTRIES` as the `p*` arms and
  **only the `ENTRIES` arms are reported** — except `a75-l-off`, which was already on `ENTRIES=1…6` and is the
  owner's own cell's shipped row, and `a75-g-off`, which is §9 C3's own `EXTRAS`-against-`ENTRIES` comparison.
  **All seven are committed as `.jsonl` anyway**, because a discarded arm that is quoted nowhere is still part of the
  record of what the round ran; what is *not* committed is the per-frame dump of `a0925-g-off`, the one `EXTRAS` arm
  that crashed partway and has no summary row at all to join it to (§1 R3). **No table in §2–§6 reads any of the
  five.**
- **And one real error of my own, found by its own control and fixed in the committed probe.** The first draft of
  §R joined each summary row to `runs[i]` of the per-frame dump. In the three arms run one process per run, a
  crashed run leaves per-frame rows with **no** summary row, so the two files hold different numbers of runs: the
  draft printed a **7.28 s** per-frame record against a **1.100 s** ride. The probe now joins on
  `(stance, entry)` and prints `unjoined` — **0 of 626** — and §9 C4 is that control.

# Part 9 — the 70° clamp cannot move the fall mix, because the classifier's threshold is 45° and a truncation at 70
cannot carry a reading across it; the roll budget closes to **the last bit** once the stance point's own acceleration
is in it; and the term a real surfer has that we do not is **the water's own centre of lift travelling across the
board's beam — ours travels 3.3–19.9 % of it, and the hull answers 11.2–17.2 % of the moment the rider's own weight
puts on the deck**

Written 2026-11-17 by the build agent (Opus 5, effort high) on branch `claude/rider-clamp-34i`, cut from `main` at
**2b5574ce** (Part 8's merge plus the handoff), so Part 8 is its base. Its brief is the handoff's own resume items 2
and 3: lift the clamp so §4b can be read, close the roll budget in one frame, and name the term that is missing.
**One opt-in switch is added** (`?bankClamp=off`) and **two measurement-only reads** (`AttachedRider.bankRaw` and
`bankLedger`'s N·m view); the default game is byte-identical and §10 is the control that says so.

## 0. The ten sentences the round is for

1. **Part B's answer first, because the brief asked for it first: the budget closes, exactly, and it closes to
   machine zero — but only when the stance point's own acceleration is one of the terms.** Over **9 016 frames of 84
   rides on four arms**, the partition of the body's own moment row and the identity `diagonal + coupling = the sum
   of the moments` both close at **0.0 × 10⁰ N·m — not small, zero to the last bit** [M]. **P1 upheld.**
2. **And the budget a force diagram of the body alone would write does NOT close: it is out by 1.24–3.32 ×**
   `|mTotal|` **at the median of the per-run medians** [M, 24/18/24/18 runs]. **P2 is upheld in its direction and
   refuted in its size: I predicted ≥ 10 × and it is 1.2–3.3 ×.** The missing term is named, measured and exact —
   `Σ_{j≠7} A[7][j] x[j] · L / dt`, the stance point accelerating under the feet — and **it is the largest single
   term in the budget on three of the four arms** (`|mCoup|` 54.3 / 436.6 / 194.7 / 454.9 N·m against `|mTotal|`
   39.3 / 57.0 / 137.8 / 103.1) [M].
3. **Part C: the term a real surfer has that we do not is the water's own roll answer, and it is undersized by
   between 2 × and 140 × depending on which of the game's own three figures you measure it against.** On the board's
   own roll row the hull's whole water column — pressure, buoyancy, suction, friction, fins, rails — answers
   **11.2–17.2 %** of the moment the rider's own weight puts on the deck, on **every** arm [M]. Divided by one body
   weight, that is a centre of lift that has travelled **0.0075–0.046 m** across a **0.232 m** half-beam: **3.3–19.9
   % of the width the load could use** [M/A]. **The board's hull does not push back where a surfer pushes.**
4. **The stiffness is the quantity, and it is 12–54 N·m/rad on the ride against the 733 the game's own ankle range
   was derived from.** `ANKLE_REST_RANGE = 0.25 rad` is `footReach · m g / series` with `series = k K/(k + K)`, which
   at `k` = `HUMAN_ANKLE_STIFFNESS` = 800 and `DESIGN_PARAMS.mass` = 75 kg solves to **K_hull = 733 N·m/rad** (697 at
   the reference rider's own 73 kg) [A on the code's own constants]; `rollModel.DESIGN_PARAMS` carries **100**; and `rollModel`'s own comment cites the carve lab's measured **850–1 700** [R]. **Measured: 12–54 N·m/rad
   over the ride (a fit, R² 0.514–0.822), and 70–153 at trim on a bare board that collapses to zero by 15–20° of
   heel and reverses past 20°** [M, §5]. **So the ankle and the hull are in series and the series stiffness is the
   HULL's**: 11.8–50.6 N·m/rad, **1.5–6.3 % of the ankle's own 800**, and the ankle's whole commanded ±0.25 rad buys
   **3.0–12.6 N·m** of righting — against a gravity term that measures **3.7–196.8 N·m** across the twelve
   arm-and-stance cells and **316 N·m** at the lean his own Compress actually falls at (§4 step 4)
   [A on two [M]s].
5. **Part A: the clamp cannot move the fall mix, and the handoff's reason for a clamp round is refuted by
   arithmetic.** The published classifier's first test is `|bank| > 45°` and the clamp is at **70°**; a reading
   truncated at 70 is already past 45, so **it cannot cross the threshold in either direction.** Re-read on the
   unclamped column the mix is **identical on all eight arms** — 14/0/10, 8/0/10, 24/0/0, 15/0/3 — to the run [M].
   **P8 refuted, and it was my own prediction.**
6. **But the third population now has a name, and it is one thing.** `other` is **23 of 23** runs across every arm a
   **balance fall with the body's bank between 20° and 45°** — too banked for the published stall's 20°, not past the
   sudden kind's 45° [M]. Not one is a non-balance cause, a fast fall under 20°, or a run that did not fall.
   **The third kind is the mid-bank topple, and it is 10 of 24 on the owner's own face.**
7. **The clamp is nevertheless truncating the magnitude, which is why it was worth lifting.** On step 3.4h's own
   shipped arm `|bankFall|` reads **70.0°** and the unclamped column reads **86.8°** at the same falls [M], and
   3.4h's "70.00 exactly in 21 of 24" is reproduced here as **21 of 24 past the clamp at the fall**. Every ride time,
   every fall count and every fall kind of 3.4h stands; only the *size* of the bank at the fall was understated.
8. **Lifting the clamp changes almost nothing, and the control proves the switch is what it says it is.** Four
   paired arms, `bankClamp` shipped against `off`: **ratio 1.000 on all four medians, 84 of 84 still fall**, and the
   two riders are **identical in 19 columns on 84 of 84 runs up to the first clamped frame, with no mismatch
   anywhere** [M]. **P9 refuted as stated** (no arm median moved; two Compress cells moved, 1.483 → 1.583 and
   1.167 → 1.200), **P10 upheld.**
9. **Two of my brief's three premises are already dead on `main`, and the third is a category error.** The ankle does
   **not** carry the whole 33 N·m — its own moment about the contact is **0.2–26.9 N·m** against gravity's **3.7–196.8**
   [M], so **P4 is refuted and reversed: gravity is the largest entry on the body's row, by 1.4–25 ×, on every arm.**
   And 3.3h's static "+33.47 against −33.40, net +0.04" does **not** reproduce dynamically: `bdTotal` is
   **+8.0 to +137.2 N·m** [M], **P5 refuted.** The "52–54 kg·m² against 0.5–1.1" is step 3.3m's refuted diagonal, and
   this round reproduces 3.3m's correction independently: `bodyHeld` **31.3–37.3** against `1/ankleOwn` **1.15–2.02**,
   a ratio of **27 ×**, and the inertia ratio `I₀/I_body` is **0.958–6.166** — on two arms the **board is harder to
   roll than the body's own end** [M].
10. **What the round does NOT say.** It does not say the hull's roll stiffness is the cause of the fall — it says it
    is the term the budget is missing a real surfer's version of, and that the three figures the game itself was
    designed against are all 2–140 × larger than the one it delivers. **No ride was taken and no claim about feel is
    made** (§8). The owner's bar is unmet on every arm: **84 of 84 fell, Compress 28 of 28.**

## 1. (A) The four reads that had to come first

**R1 [R]. The clamp is on a READING, and the reading is a datum for two forces.** `AttachedRider.frame` writes
`bank.angle` at three sites — on this branch `:5132` (standing, measured), `:5140` (a new mount, square to the
deck) and `:5161` (the old rider) — each `Math.max(-MAX_BANK, Math.min(MAX_BANK, angle))` with `MAX_BANK = 70°` [R].
That angle is then (i) the ankle's own spring datum, `HUMAN_ANKLE_STIFFNESS × (bank.angle − roll − ankleRest) + …`
[R, `:3616` for the predictive balance and `:3502` for the reactive one], and (ii) the body's own frame,
`standingBody.frame(heading, bank.angle, bodyFrame)` [R, `:5148`]. **So past 70° the
spring pulls against a lean the body is not at.** Every *other* `MAX_BANK` in the file bounds a force or a command —
`SNAP_RAIL_RANGE`, `railPull`'s fixed point, `CARVE_CARRY`'s tangent, the steer's rail hold — and this round leaves
all of them exactly as they ship, so the switch is one change.

**R2 [R]. The classifier's threshold is BELOW the clamp, which settles the handoff's reason for this round before
any arm runs.** *"(a) the sudden fall into the face: the body's bank past **45°** at the end; (b) the slow stall:
cause `balance` with the bank within 20° of upright and the speed through the water under 2.5 m/s; (c) anything
else"* [R, `docs/research/face-hold-2026-11-10/kinds.py.txt:1–2`]. **45 < 70.** A clamp at 70 can only make a large
reading smaller *within* the "sudden" class; it can never move a run from "sudden" to anything else, nor the other
way. The handoff's *"that mix cannot be read until the clamp round has run"* is therefore wrong as reasoning, and
§2 confirms it as measurement. What the clamp *can* do is hide the bank's own size, and §2 measures that too.

**R3 [R]. The bank's row of the standing solve is a generalized IMPULSE, so a moment comes out of it with no
derivative in it.** `coupleStanding` writes `rhs[7] += t̂·f − h(τ_ankle + τ_swing)/L` with `f = h·external − m·mismatch`
and `t̂ = across`, the body's own across axis [R, `AttachedRider.ts`]. The row's unit is N·s — a generalized impulse
for the linear coordinate `u`, the body's speed across the leg — so **`b[7] · L / dt` is the mean moment over the
step about the stance point**, at the leg's own lever. The ankle's entry returns exactly `−τ_ankle`; gravity's
returns `L (m g · t̂)` = `−m g L sin θ_body`, the inverted pendulum's own term. And `A[7][7] = m + h(k h + c)/L²`, so
`A[7][7] · L² = m L² + h(k h + c)` is `bodyHeld` — the body's own roll inertia about the stance point **as the matrix
holds it**, which step 3.3m warned is a **diagonal** and not an effective inertia [R, 3.3 README Part 36 §2].

**R4 [R]. The hull's forces are in the HULL's own frame on the roll row, and the ledger's arms are the right ones —
checked, because this was my first candidate for a frame error and it is not one.** `patchForce` returns
`out.pressure = −pressure · n̂` with `n̂` the **patch's own normal** [R, `hullForces.ts:406`], and the roll ledger books
it as `pressure × rollOf(cx, cy, cz)` with `cx = r × n̂` — the hull normal — while `radiation` and `addedMass` are
booked on `sx = r × û`, the water's surface normal, which is the frame they act in [R, `BoardBody.ts:1578–1589`,
`:1621–1623`]. **So §5's small stiffness is not step 3.3m's `cos³` arm defect reappearing in the pressure**: that
defect is in the added-mass term and the added-mass term is excluded from every "hull" figure below, because it
resists a roll **rate** and not a roll **angle**. My own suspicion is refuted by the read.

## 2. (B) Part A — the fall mix on a column that is not truncated

**All arms `RIDER=new FELT=deck BODY=two`** — the rider the owner rode on 2026-11-16 night — the stance held, the
stick never touched, 9 s a run, `AHEAD` 0.75, `SIDE` −45. Two faces: **`f73`** = `FACE=1.4,7.32,5.7`, step 3.4h's
corrected face, which puts the board on **5.50°** at `faceFrac` 0.156, the owner's own water; **`s16`** =
`FACE=1.4,16,5.7`, the folder's standing face at **12.1°**. Two cells: **`-g`** the glide cell, eight absolute
entries 4.435–10.435 m/s × three stances = 24 runs; **`-l`** the owner's own low-speed cell, 1–6 m/s × three = 18.
A `c` suffix is `bankClamp: 'off'`.

| **[M]** the published classifier, read twice on the same runs | runs | fell | med s | **published mix** s/st/o | \|bank\| at the fall, med | **RAW mix** | **\|bankRaw\| at the fall, med (span)** | past the clamp at the fall |
|---|---|---|---|---|---|---|---|---|
| **`f73-g`**, 5.50°, clamp ships | 24 | **24** | 4.650 | **14/0/10** | 48.5° | **14/0/10** | **48.5° (33–86)** | 6 of 24 |
| `f73-gc`, clamp off | 24 | **24** | 4.650 | 14/0/10 | 48.5° | 14/0/10 | 48.5° (33–82) | 6 of 24 |
| **`f73-l`**, 5.55°, clamp ships | 18 | **18** | 1.450 | **8/0/10** | 42.6° | **8/0/10** | **42.6° (29–89)** | 6 of 18 |
| `f73-lc`, clamp off | 18 | **18** | 1.450 | 8/0/10 | 42.6° | 8/0/10 | 42.6° (29–89) | 6 of 18 |
| **`s16-g`** — step 3.4h's own `c-a75-g-abs` | 24 | **24** | 1.467 | **24/0/0** | **70.0°** | **24/0/0** | **86.8° (53–90)** | **21 of 24** |
| `s16-gc`, clamp off | 24 | **24** | 1.467 | 24/0/0 | 86.0° | 24/0/0 | 86.0° (53–90) | 21 of 24 |
| **`s16-l`** — 3.4h's own `a75-l-off` | 18 | **18** | 1.033 | **15/0/3** | 63.7° | **15/0/3** | 63.7° (29–89) | 7 of 18 |
| `s16-lc`, clamp off | 18 | **18** | 1.033 | 15/0/3 | 63.7° | 15/0/3 | 63.7° (29–81) | 7 of 18 |

**Four readings.**

1. **The mix does not move, on any arm, by a single run — and the reason is R2's arithmetic and not a null result.**
   The clamp sits at 70° and the classifier's first test is 45°, so truncating a reading at 70 cannot carry it across
   45. **The handoff's and step 3.4h's "the mix cannot be read until the clamp round has run" is refuted**, and it is
   refuted the cheap way: by reading the two thresholds against each other. **P8, my own prediction, is refuted with
   it** — I predicted the mix would move toward "sudden" and the "other" population halve.
2. **What the clamp DID hide is the bank's own size: 16.8° of it on the shipped face.** `s16-g`'s `|bankFall|`
   reads **70.0°** clamped and its `|bankRaw|` **86.8°** at the same falls, with runs out to **90°** [M] — so the
   published column understated the lean at the fall by **19 % of its true size** [A on two [M]s]. **Step 3.4h's
   "`bankFall` is 70.00 exactly in 21 of 24" is reproduced exactly** as 21 of 24 runs past the clamp at the fall.
   So every figure 3.4h published stands; the one sentence that needed this round is *"part of 'sudden 24 of 24 → 14
   of 24' is how many runs reached MAX_BANK"* — and the answer is **none of it**.
3. **The gentle face's falls really are at a smaller bank, unclamped.** `f73-g` 48.5° and `f73-l` 42.6° against
   `s16-g`'s 86.8°, on the uncensored column, at 1.31 and 1.16 m/s through the water against 6.47 [M]. **3.4h's
   "the same fall in slow motion" survives the clamp being lifted off it.**
4. **And the clamp is rare on the owner's own water.** The median run on `f73-g`, `f73-l` and `s16-l` has **0.0 %**
   of its frames clamped; `s16-g`'s has 8.4 % [M]. Over the whole window the count is **38 of 4 743**, **36 of 1 148**,
   **161 of 1 908** and **37 of 1 217** frames [M].

### 2b. What `other` IS — the third population, named

| **[M]** `other`, split into the classifier's own disjoint complement, read on `bankRaw` | `other` | **bank 20–45°, a balance fall** | bank ≤ 20°, through ≥ 2.5 | bank ≤ 20°, cause ≠ balance | 20–45° but not balance | did not fall |
|---|---|---|---|---|---|---|
| `f73-g` / `f73-gc` | 10 of 24 | **10** | 0 | 0 | 0 | 0 |
| `f73-l` / `f73-lc` | 10 of 18 | **10** | 0 | 0 | 0 | 0 |
| `s16-g` / `s16-gc` | 0 of 24 | 0 | 0 | 0 | 0 | 0 |
| `s16-l` / `s16-lc` | 3 of 18 | **3** | 0 | 0 | 0 | 0 |

**`other` is one thing, in 23 of 23 runs: a balance fall with the body's bank between 20° and 45°.** Not a
non-balance cause, not a fast fall under 20°, not a run that survived. The two published kinds leave a gap between
their own thresholds and **the whole third population lives in it** — and on the owner's own face it is **10 of 24**
of the glide cell and **10 of 18** of his own. The fall causes bear it out: `balance` in **23 of 24** on both glide
arms and **18 of 18** on both low arms, the one exception a `lost board` [M].

### 2c. The switch's own A/B, and the control that it is one change

| **[M]** `bankClamp` shipped → `off`, same face, entries and stances | runs | fell | med s | ratio | runs with a clamped frame | **identical in 19 columns up to the first clamped frame** | first mismatch |
|---|---|---|---|---|---|---|---|
| `f73-g` → `f73-gc` | 24 | 24 / 24 | 4.650 → 4.650 | **1.000** | 7 of 24 | **24 of 24** | none |
| `f73-l` → `f73-lc` | 18 | 18 / 18 | 1.450 → 1.450 | **1.000** | 6 of 18 | **18 of 18** | none |
| `s16-g` → `s16-gc` | 24 | 24 / 24 | 1.467 → 1.467 | **1.000** | 21 of 24 | **24 of 24** | none |
| `s16-l` → `s16-lc` | 18 | 18 / 18 | 1.033 → 1.033 | **1.000** | 7 of 18 | **18 of 18** | none |

**Three readings.** **(1)** The switch stops no fall: **84 of 84** on both sides, Compress **28 of 28**. **(2)** It
moves no arm's median — ratio 1.000 four times — and **P9 is refuted as stated**; what it does move is two Compress
cells, `s16-gc` **1.483 → 1.583 s** and `s16-lc` **1.167 → 1.200**, both *longer*, on 8 and 6 runs. **(3)** The
control holds: the two riders are bit-identical in 19 columns on **84 of 84** runs until the clamp first bites, with
**no mismatch at any frame of any run** — so the switch changes the rider **only** where it says it does.
**P10 upheld.**

## 3. (B) Part B — the roll budget about the contact, closed, with the residual printed

**The window, stated.** Every row is a **median of the per-run medians** over `t > 0.2 s` (the folder's own mount
filter) to the fall, on the frames the standing 8×8/9×9 decided whole and the body banked through. `early` is
`t` 0.2–0.7 s, step 3.4h's matched age, where step 3.3l put the fall's start. **Every term is a mean over its own
frame** — the ledger's own step mean — and an instantaneous value at the fall frame is a different quantity, printed
only in §2.

| **[M]** window `ride`, N·m | runs | frames | **\|mTotal\|** the moments' sum | **\|mDiag\|** `A[7][7]x[7]L/dt` | **\|mCoup\|** the stance point's own | opposed in sign | **single body** `bodyHeld × ownAcc` | **\|residual\|** | **resid / \|mTotal\|** | split max | resid max |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **`f73-g`**, 5.50° | 24 | 4 743 | **39.3** | 29.8 | **54.3** | 71.5 % | **1.0** | **50.7** | **1.29** | **0.0e+0** | **0.0e+0** |
| **`f73-l`**, 5.55° | 18 | 1 148 | **57.0** | **464.5** | **436.6** | **95.4 %** | −28.8 | **189.3** | **3.32** | **0.0e+0** | **0.0e+0** |
| **`s16-g`**, 12.1° | 24 | 1 908 | **137.8** | 87.4 | **194.7** | 80.0 % | 24.5 | **171.1** | **1.24** | **0.0e+0** | **0.0e+0** |
| **`s16-l`**, 12.3° | 18 | 1 217 | **103.1** | **519.8** | **454.9** | **93.6 %** | 47.6 | **263.0** | **2.55** | **0.0e+0** | **0.0e+0** |
| the same four, window `early` | — | 696 / 515 / 696 / 487 | 41.0 / 39.6 / 90.9 / 95.8 | 15.2 / **254.0** / 47.9 / **589.1** | 53.9 / **251.4** / 132.1 / **572.2** | 82.8 / 96.6 / 79.3 / 96.6 % | −8.8 / −6.2 / −8.1 / 20.6 | 51.6 / 88.6 / 121.9 / 237.1 | 1.26 / 2.24 / 1.34 / 2.48 | 0.0e+0 | 0.0e+0 |

**Six readings, and the first two are the brief's own question.**

1. **The budget closes, and it closes exactly.** `Σ sources − the whole row` is **0.0 × 10⁰ N·m** and
   `diagonal + coupling − the sum of the moments` is **0.0 × 10⁰ N·m**, as maxima over **9 016 frames** of 84 rides
   on four arms [M]. Not "below a tolerance": the two controls are **zero to the last bit**, because the partition is
   of the right-hand side the game assembled and the split is of the row the game solved. **P1 upheld, and nothing in
   this section may be quoted without it.**
2. **The single-body budget does NOT close, and it is out by 1.24–3.32 ×.** `bodyHeld × ownAcc` — what a force
   diagram of the body alone puts on the left — is **1.0 / −28.8 / 24.5 / 47.6 N·m** against moments summing to
   **39.3 / 57.0 / 137.8 / 103.1** [M]. **P2 is upheld in direction and refuted in size: I predicted ≥ 10 × and it
   is 1.2–3.3 ×.** My licence for the 10 × was **one frame of one smoke run**, where it reads 33 ×; the ride's
   median is a different quantity and this is that error made in my own prediction file.
3. **The missing term is the stance point accelerating under the feet, it is exact, and it is the budget's largest
   term on three of four arms.** `|mCoup|` is **54.3 / 436.6 / 194.7 / 454.9 N·m** [M]. It is not a fudge and not a
   residual: it is `Σ_{j≠7} A[7][j] x[j] · L / dt`, the other columns of the row the solve already writes, and
   `coupleStanding`'s own assembly says what that is. Row 7 carries `m t̂` on the board's three translations and
   `m (b × t̂)` on its three rotations [R], so the sum is `m t̂ · (Δv + Δω × b) · L / dt` — **the rider's mass times
   the across component of the STANCE POINT's own acceleration, at the leg's lever** [A on the code's own lines].
   It is the term an inverted-pendulum force diagram omits by assuming its base is still. **The body's lean is not what
   the moments on it do to it; it is mostly what the deck does underneath it.**
4. **The two internal terms nearly cancel, and on the owner's own cell they cancel by an order of magnitude.**
   `|mDiag|` 464.5 against `|mCoup|` 436.6 on `f73-l` and 519.8 against 454.9 on `s16-l`, opposed in sign in
   **95.4 %** and **93.6 %** of frames, for a net of 57.0 and 103.1 [M]. **The low-speed cell the owner's bar is
   about is where the cancellation is tightest** — an 8–9 × cancellation, which is step 3.3p's conditioning finding
   seen in newton-metres instead of in the model's own rows.
5. **`P3 is refuted.`** I predicted `|mDiag|` and `|mCoup|` would each be ≥ 5 × `|mTotal|` and opposed in ≥ 90 % of
   frames. On `f73-g` they are **0.76 ×** and **1.38 ×**, and the opposed share is **71.5 %** [M]. **The cancellation
   is a property of the owner's low-speed cell, not of the budget**, and a prediction that pooled them was wrong.
6. **And the single-body left-hand side is near zero on the glide arm, which is the one honest piece of good news.**
   `bodyHeld × ownAcc` = **1.0 N·m** over 4 743 frames of `f73-g` [M]: at the median the body's own lean is barely
   accelerating at all while 39.3 N·m of moment acts on it. **The median frame of the owner's own face is not a body
   toppling.** The fall is in the tail and at the end, which is where §2's 42.6–48.5° at 1.16–1.31 m/s lives.

### 3a. Every moment on the body's own row, by source

| **[M]** window `ride`, N·m, signed median of the per-run medians | runs | **ankle** | **gravity** | water on body | carry | swing | assist | limbs | **Σ = mTotal** | the ankle's τ |
|---|---|---|---|---|---|---|---|---|---|---|
| `f73-g` tall / crouch / **compress** | 8 ea | 0.2 / −1.2 / **−3.9** | **38.7 / 42.0 / 43.8** | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 40.8 / 40.2 / **39.3** | 1.0 / 1.7 / 4.3 |
| `f73-l` tall / crouch / **compress** | 6 ea | 0.4 / 7.4 / **9.5** | **11.3 / 3.7 / 3.7** | 0.00 / 0.03 / 0.45 | 0.00 | 0.20 / 0 / 0 | 0.00 | 0.00 | 18.5 / 13.6 / **9.0** | 2.4 / −3.9 / −6.2 |
| `s16-g` tall / crouch / **compress** | 8 ea | −19.8 / −26.3 / **−26.9** | **196.8 / 184.0 / 172.4** | 0.00 | 0.00 | 0.00 | 0.00 | 0.00 | 175.3 / 138.6 / **133.5** | 23.6 / 28.6 / 28.0 |
| `s16-l` tall / crouch / **compress** | 6 ea | −12.5 / 2.5 / **24.7** | **93.4 / 32.3 / 83.4** | 0.00 / 0 / 1.61 | 0.00 | 0.00 | 0.00 | 0.00 | 87.5 / 40.0 / **76.4** | 28.5 / 6.7 / 6.3 |

**Three readings.**

1. **`P4 is refuted and reversed: gravity is the largest entry, not the ankle, on every arm and every stance.**
   Gravity's own moment about the stance point is **3.7–196.8 N·m** against the ankle's **0.2–26.9** — a factor of
   **1.4 to 25** [M]. And gravity's entry is exactly `−m g L sin θ_body`, so it is readable as an angle: on `f73-g`
   its 38.7 / 42.0 / 43.8 N·m at `L` = 0.849 / 0.654 / 0.550 m is a body leaning **3.6° / 5.0° / 6.4°** off its own
   feet at `m` = 73 kg [A on three [M]s per stance], against §5's `|bank|` median of **5.75°** **pooled over the
   three stances** — the same order from two independent columns, and **not** a tie, because the two populations are
   not the same one.
2. **So my brief's "the ankle already carries the whole 33 N·m" is wrong as a statement about the body's roll.** The
   33.47 N·m of step 3.3h is a **static roll balance on the BOARD**, which §3b reads dynamically and finds does not
   hold either. What carries the body against gravity here is **not the ankle**: it is `mCoup`, the stance point
   accelerating — which is physically right (a surfer leans into a turn and the board's own lateral acceleration
   holds him up) and is exactly why the hull's answer in §3b and §5 is the quantity that matters.
3. **The water on the body, the carry, the swing, the assist and the limbs are all ~0.00 N·m**, on every arm and
   stance [M]. The `assist` entry is booked anyway so the partition is read rather than assumed — `compressAssist`
   returns at once on `newRider` [R] — and it reads 0.00, which is that control.

### 3b. The board's own roll row, by source — and 3.3h's static balance does not hold dynamically

| **[M]** window `ride`, N·m about `rollAxis` | runs | **bdTotal** | pressure | buoyancy | suction | friction | fins | rails | addedMass | gyro | **gravity (the rider's own)** | **ankle** |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **`f73-g`** | 24 | **+38.91** | −2.89 | −0.77 | 0.00 | 0.01 | −0.20 | 0.03 | −0.63 | −0.00 | **+44.49** | **0.00** |
| **`f73-l`** | 18 | **+8.03** | +3.34 | −0.42 | 0.00 | 0.01 | 0.60 | 0.04 | 0.25 | 0.02 | **+3.59** | **0.00** |
| **`s16-g`** | 24 | **+137.18** | **−25.72** | −3.67 | 0.00 | 0.02 | −0.11 | 0.11 | −3.14 | −0.00 | **+191.62** | **0.00** |
| **`s16-l`** | 18 | **+34.10** | +12.95 | +2.48 | 0.00 | 0.02 | 0.26 | 0.00 | 0.23 | 0.00 | **+33.75** | **0.00** |

**Three readings.**

1. **`P6 upheld, as a read: the ankle books exactly 0.00 on the board's roll row, on every frame of every arm.**
   `coupleStanding` writes the ankle's torque into row 7 alone and the board's reaction is carried by the kinematics
   [R], and step 3.3m's counterfactual showed booking it twice gives the ankle *less* authority, not more. **So "the
   board's roll spring" and "the water on the rail" — two of the five terms my brief asked me to put in the body's
   budget — are not on the body's row at all.** They reach the body only through `mCoup`. That is a read, and it is
   the structural reason §5's stiffness is the quantity to measure rather than a moment on the body.
2. **`P5 is refuted: the board's roll row does not nearly cancel.`** `bdTotal` is **+8.0 to +137.2 N·m**, which is
   0.87 / 2.24 / 0.72 / 1.01 of its own largest entry [A on the table] — not the ≤ 0.25 I predicted. **Step 3.3h's
   "+33.47 against −33.40, net +0.04" is a static balance and this round does not reproduce it on a ride.**
3. **And the hull answers a tenth to a sixth of what the rider puts on the deck.** Summing the six water entries the
   pressure field owns — pressure, buoyancy, suction, friction, fins, rails — against the rider's own `gravity`
   entry: **5.40 / 8.77 / 32.98 / 17.47 N·m against 44.49 / 78.45 / 191.62 / 145.74**, a ratio of **0.121 / 0.112 /
   0.172 / 0.120** [M]. **11.2–17.2 %, on all four arms, on two faces, at two speed bands.** §4 is what that is.

## 4. (B) Part C — the term a real surfer has that we do not, argued from §3's numbers

**The question the budget forces.** §3a says gravity applies **39–197 N·m** about the stance point and the ankle
answers **0.2–26.9**. §3 says the body nevertheless barely accelerates in lean at the median, because `mCoup` — the
stance point's own acceleration — carries the rest. **So the thing that holds a surfer up is the board accelerating
under him, and the thing that lets him choose that acceleration is the water pushing back on a loaded rail.** §3b
measures that push at **11.2–17.2 %** of what he is putting in. **That is the term.**

| **[M]/[A]** the same four arms, window `ride` | **the hull's six water entries, N·m** | **the rider's own, N·m** | **hull / rider** | **the CoP travel it implies, m** | **of the 0.232 m half-beam** | rail ° med |
|---|---|---|---|---|---|---|
| `f73-g`, 5.50° | **5.40** | 44.49 | **0.121** | **0.0075** | **3.3 %** | 3.96 |
| `f73-l`, 5.55° | **8.77** | 78.45 | **0.112** | **0.0122** | **5.3 %** | 15.36 |
| `s16-g`, 12.1° | **32.98** | 191.62 | **0.172** | **0.0461** | **19.9 %** | 19.28 |
| `s16-l`, 12.3° | **17.47** | 145.74 | **0.120** | **0.0244** | **10.5 %** | 27.37 |

`CoP travel` is the hull's own roll moment divided by **one body weight, 716 N** — how far across the board the
water's centre of lift has had to move to make that moment — against the board's own half-beam, **0.232 m** on the
0.464 m beam [R, `boardReference.ts`]. It is **[A] on one [M] and one [R]**, and it assumes the whole moment is the
load's own centre moving, which is the most generous reading available: any part of the moment that is not the load
shifting makes the travel smaller still.

**The argument, in four steps, each from a number above.**

1. **A planing board's roll answer is a load times a lever, and the lever available is the beam.** With the rider's
   716 N and the centre of lift free to reach the rail, the restoring moment available is **716 × 0.232 = 166 N·m**
   [A]. **Ours delivers 5.4–33.0.** The load is there; the lever is not being used.
2. **As a stiffness, that is 12–54 N·m/rad on the ride, and the game's own three figures for it are 100, 733 and
   850–1 700.** §5 measures the stiffness two ways. **Every one of the game's own design figures is 2–140 × larger
   than what the hull delivers**, and the largest of them is the one the *carve lab measured* [R].
3. **The ankle and the hull are in SERIES, so the series stiffness is the hull's, and the ankle's own 800 N·m/rad
   is irrelevant to it.** The code says so itself: `bankAuthority`'s `series = k K_hull/(k + K_hull)` [R,
   `rollModel.ts:185`]. At `k` = `HUMAN_ANKLE_STIFFNESS` = 800 [R] and the measured `K_hull` = 12–54, **series = 11.8–50.6 N·m/rad — 1.5–6.3 % of
   the ankle's own**, and `share = k/(k + K_hull)` = **0.937–0.985**, meaning **94–99 % of every ankle correction
   rolls the board instead of righting the body** — **[A] on the code's own two-spring formula with this round's
   [M], and not a read of the 9×9**, whose own analogous number is the authority `|own/relative|` = **0.204–0.511**
   in §5's table (§8 item 8 keeps the two apart).
4. **And so the ankle's whole commanded range buys a fraction of gravity's own term at the lean the falls reach.**
   `ANKLE_REST_RANGE` is ±0.25 rad; at the measured series stiffness that is **3.0–12.6 N·m** of righting [A].
   Against the **ride-median** gravity term that is **7–33 %** on the glide arm at 5.50° (38.7–43.8 N·m) and
   **2–7 %** on the steep one (172.4–196.8) [M]. **On the owner's own low-speed cell it is adequate at the median
   and nowhere near adequate at the fall**: the ride-median gravity term there is only 3.7–11.3 N·m, but his six
   Compress runs on `f73-l` end at a median **52.3°** of unclamped bank, where gravity's own term is
   `m g L sin θ` = **316 N·m** at that stance's own `L` = 0.558 m [A on two [M]s] — **25 to 105 × the whole
   commanded range.** (The median is of six runs and the span of their own banks is 34.4–81.3°, so the figure is
   quoted with its population and not as a property of the cell.) Nine rounds have asked why widening,
   bounding or re-deriving the ankle's range changed nothing. **This is why: the range is multiplied by a stiffness
   that is 1/27th of the one its own formula was solved at.**

**The term, named: the hull's hydrodynamic roll stiffness — the water's own centre of lift travelling across the
beam as the rider loads a rail.** It is in the brief's own list as *"the foot's pressure distribution across the
board's width"*, and the measurement moves which side of that contact is the limiting one: **the foot's pressure
is not the short side — the water's is.** The foot can reach its own 0.13 m sole edge (3.3i: the joint is at its
bound in 1 of 72, so it is not even trying); the water's centre of lift travels **3.3–19.9 %** of its 0.232 m.

**What this is NOT, named one by one, because four of these have been proposed and closed on this track.**
- **Not the roll inertia.** Step 3.3m sourced it and found it generous (1.7 × the planing value) [R], and §5
  reproduces its numbers independently. An inertia resists a **rate**; this is a missing **spring**.
- **Not the ankle's own stiffness.** 800 N·m/rad, already above a braced human's [R, 3.3i], and in series with
  12–54 it cannot matter: `share` is 0.937–0.985.
- **Not counter-roll at the ankle, hip or whole body.** Each lowers the roll and none moves the fall (3.2w/x/y) —
  and §4 step 3 says why: they all push against the same compliance.
- **Not the board's width.** The width is there (0.464 m); **the water is not using it.**
- **Not added mass on the wall.** The brief's second candidate. `addedMass` on the board's roll row is
  **−3.14 to +0.25 N·m** [M] — two orders under the rider's own — and it is an inertia besides.
- **And not the clamp.** §2.

## 5. (B) The stiffness, measured twice, with the second one a static control

**The ride's own fit, over the window, per run, N·m/rad** — and it is a **fit**, labelled as one, of the hull's six
water entries against the board's heel against the water:

| **[M]** window `ride` | runs | `bodyHeld` kg·m² | **`1/ankleOwn`** kg·m² | **`1/\|ankleDeck\|`** kg·m² | `I₀/I_body` | ankle authority | **K_hull, fit, N·m/rad** | **R² of that fit** |
|---|---|---|---|---|---|---|---|---|
| `f73-g` | 24 | 31.32 | **1.15** | 1.229 | **0.958** | 0.511 | **−35** | 0.822 |
| `f73-l` | 18 | 31.41 | **1.30** | 1.368 | **1.190** | 0.496 | **−12** | 0.514 |
| `s16-g` | 24 | 31.33 | **1.71** | 0.674 | **2.548** | 0.287 | **−54** | 0.769 |
| `s16-l` | 18 | 37.34 | **2.02** | 0.461 | **6.166** | 0.204 | **−18** | 0.588 |

**The static control, because a fit over a trajectory confounds the heel with the speed, the trim and the depth.**
A **bare board** (no rider, so none of the ride's dynamics is in it) on a flat free surface, driven forward at a
**held** speed and **held** at a heel about its own long axis, the roll ledger read after 40 steps. One deterministic
cell per row, so **there is no population here to take a median over**, and the pose is held rather than trimmed, so
the magnitudes are a bare board's and **only the shape transfers** — which is the whole point of printing it.

| **[M]** `hull` N·m (bare board, held pose) | heel 0° | 2° | 5° | **10°** | **15°** | **20°** | 30° |
|---|---|---|---|---|---|---|---|
| 4 m/s | −0.00 | −2.44 | −4.89 | −7.93 | −8.49 | −9.26 | −8.63 |
| 6 m/s | 0.00 | −3.68 | −7.39 | −11.10 | −11.30 | −12.46 | −11.52 |
| 8 m/s | −0.00 | −5.33 | −10.75 | −14.60 | −15.16 | −15.95 | −15.05 |
| **the stiffness `dτ/dφ`, N·m/rad, at 8 m/s** | **−152.6** | −123.2 | −66.4 | **−25.3** | **−7.7** | **+0.4** | **+5.1** |
| the same at 6 m/s | −105.4 | −84.7 | −53.2 | −22.4 | −7.8 | −0.8 | +5.4 |
| the same at 4 m/s | −69.9 | −56.0 | −39.3 | −20.6 | −7.6 | −0.5 | +3.6 |
| the same at 0 m/s (hydrostatic alone) | −34.3 | −33.8 | −29.5 | −17.0 | −4.7 | −0.3 | +0.8 |
| the wetted area, m², at 8 m/s | 0.0412 | 0.0999 | 0.1527 | 0.1826 | 0.1987 | 0.2191 | 0.2510 |

**Six readings, and the last one is a caveat the control's own columns force.**

1. **At trim the hull is stiff and it scales with speed: 70 / 105 / 153 N·m/rad at 4 / 6 / 8 m/s**, against 34 at
   rest [M]. So the hydrodynamic part exists and is the larger part. **It is the only figure in this round that is
   the same order as the game's own `DESIGN_PARAMS.hullStiffness = 100`.**
2. **And it collapses, to nothing, by the heel every ride reaches.** 153 → **25** by 10°, **−7.7** by 15°, **+0.4**
   at 20° and **+5.1** at 30° at 8 m/s, and the same shape at every speed [M]. The rides' own median rail is
   **3.96–27.37°** (§4's table) and the bank at the fall is **42.6–86.8°** (§2). **Past 20° the hull stops
   resisting the roll and begins to assist it.**
3. **It is not the wetted area: the area GROWS** 0.041 → 0.251 m² across the sweep while the moment saturates at
   **−9 to −16 N·m** [M]. This is step 3.3m's §4 reading 1 reappearing in a different quantity, and §1 R4 is the
   read that says the *mechanism* is not the same one: the pressure is in the hull's frame with the hull's arm.
4. **So the fit and the control agree on the number that matters.** The ride's fit gives **12–54 N·m/rad** over rails
   of 4–27°, and the control gives **−7.7 to −25.3** over heels of 10–15° — the band the rides live in [M]. The
   trim-stiffness of 70–153 is real and is **not** what the ride is operating at.
5. **And this round reproduces step 3.3m's two corrections independently, which is the tie between the two rounds.**
   `1/ankleOwn` = **1.15–2.02 kg·m²** against 3.3m's 1.00–2.52; `1/|ankleDeck|` = **0.461–1.368** against its
   0.650–1.130; the authority **0.204–0.511** against its 0.214–0.488; `bodyHeld` **31.3–37.3** against its
   22.22–52.82 [M both]. **The inertia ratio is 0.958–6.166 — on `s16-g` and `s16-l` the board is 2.5 × and 6.2 ×
   HARDER to roll than the body's own end.** My brief's "0.5–1.1 against 52–54, so the ankle keeps 0.25–0.40" is a
   diagonal divided by an effective inertia, and **it is dead twice over.**
6. **The caveat, in the control's own numbers: in the held pose the hull's moment is very nearly cancelled by the
   water's inertia.** At 8 m/s and 2° the `hull` sum is **−5.33** and `addedMass` is **+4.66 N·m**, and the ledger's
   own `total` — the board's `I·Δω` over the step — is **−0.38** [M]. That is what a plate pushed into water does:
   the pressure field's moment is taken up by the water it entrains. **So `hull` is the pressure field's own
   restoring gradient and not the net torque on a free board**, which is the quantity a spring's `dτ/dφ` is and the
   quantity §4 step 3 puts in series with the ankle — but a reader who takes the 70–153 N·m/rad as "what the board
   would right itself at if released" would be wrong, and §8 item 9 says so.

## 6. The owner's bar

> *"In compress the surfer should not fall in the lower speed of getting positioning in a wave … because the center
> of gravity is supposed to do that."* **100 %, not "fewer".**

| **[M]** Compress only, the stick never touched | runs | fell | median s | the mix, on the unclamped column |
|---|---|---|---|---|
| `f73-g`, the owner's own 5.50°, glide entries | 8 | **8** | 4.650 | 5/0/3 |
| `f73-l`, the owner's own 5.55°, **his own 1–6 m/s** | 6 | **6** | **1.450** | 4/0/2 |
| `s16-g`, 12.1° | 8 | **8** | 1.483 | 8/0/0 |
| `s16-l`, 12.3°, his own 1–6 m/s | 6 | **6** | 1.167 | 5/0/1 |
| with `bankClamp: 'off'`, all four | 28 | **28** | 4.650 / 1.450 / **1.583** / **1.200** | the **mix** unchanged, run for run |

**28 of 28, both sides of the switch. The bar is not met and this round does not move it.** What it moves is the
reason, and the reason is on his own cell: his six Compress runs on `f73-l` fall at **34.4 / 36.0 / 46.0 / 52.3 /
71.4 / 81.3°** of unclamped bank, a median of **52.3°**, where gravity's own moment about his feet is
`m g L sin θ` = **316 N·m** at `L` = 0.558 m [A on two [M]s]. At §4's series stiffness of **11.8–50.6 N·m/rad** the
whole ±0.25 rad his ankle may command is **3.0–12.6 N·m** — **a twenty-fifth to a hundredth of it** — whatever the
stance does. *"The center of gravity is supposed to do that"* is exactly right, and the hull
is what is not letting it: on the code's own two-spring reduction **94–99 % of every correction he makes rolls the
board instead** (§8 item 8 on what that figure is and is not).

## 7. What I refuted

1. **The handoff's own reason for this round: *"that mix cannot be read until the clamp round has run"*.** The
   classifier's threshold is **45°** and the clamp is **70°**; a truncation above a threshold cannot carry a reading
   across it. The mix is **identical on all eight arms, run for run** [M], and the read that settles it is two
   constants against each other (§1 R2).
2. **My own P8**, which predicted the mix would move toward "sudden" and halve the "other" population. It moved by
   **zero runs**. The prediction and its reasoning are both in `34i-predictions.md` at `36105b1a`.
3. **My brief's premise that the ankle carries the whole 33 N·m.** Gravity's moment about the stance point is
   **1.4–25 × the ankle's**, on every arm and stance [M]. **P4 refuted and reversed.**
4. **Step 3.3h's static roll balance, as a statement about a ride.** +33.47 against −33.40, net +0.04 does not
   reproduce: `bdTotal` is **+8.0 to +137.2 N·m** and the hull answers **11.2–17.2 %** of the rider's own entry [M].
   **P5 refuted.** 3.3h's own measurement is not withdrawn — it was static and it was right as such.
5. **My brief's "the board's roll inertia is 0.5–1.1 against the body's 52–54".** A diagonal against an effective
   inertia, already refuted by step 3.3m on `main`, and reproduced here: the ratio is **0.958–6.166** and on two arms
   the board is the **harder** end [M].
6. **My own P2 and P3 in their sizes.** The single-body budget is out by **1.24–3.32 ×**, not ≥ 10 ×, and the two
   internal terms are each ≥ 5 × the net **only on the owner's low-speed cell**, not on the glide arm (0.76 × and
   1.38 ×) [M]. My licence for the 10 × was **one frame of one smoke run**, which reads 33 ×. **That is this
   round's own instance of the error this track keeps making, and it is in my prediction file in my own hand.**
7. **The handoff's own third Canyon caution is now measured rather than warned about — on `main`, not on this
   branch.** The same build, grid, seed and step count gives **`c601393e8d626f2a`/`23bc1585cc56f647`** spun up fresh
   and **`1d7f9125628f21d2`/`ff3d2edee6c660ad`** from the same state imported [M, §10b]. Nothing is refuted here; a
   warning became a number, and the number says the two cannot be told apart from the hashes alone.
8. **My own first candidate for a frame error, refuted by reading it.** I suspected the roll ledger booked the
   planing pressure on the water's surface normal, which would have made §5's collapse step 3.3m's `cos³` arm defect
   in a new place. It books it on `r × n̂`, the hull's own normal, and the added-mass entries on `r × û` — both right
   [R, §1 R4].
9. **My own P9 as stated.** No arm's median moved at all with the clamp lifted; four ratios of **1.000** [M].

### 7b. The ten predictions, scored against the file committed before the arms (`36105b1a`)

**Three upheld (P1, P6, P10), five refuted (P3, P4, P5, P8, P9-as-stated), two half (P2, P7).** The scorecard is
`results/34i/34i-predictions-scored.md`, line by line against the committed file. **Two of the refutations are of my
own reasoning rather than of a size** — P8, which a comparison of two constants would have settled before I wrote
it, and P7, where I named the wrong face for step 3.4h's own "21 of 24" figure.

## 8. What I will not claim

1. **I will not claim the hull's roll stiffness is the cause of the fall.** It is the term the budget is missing a
   real surfer's version of, and the three figures the game was designed against are 2–140 × larger than the one it
   delivers. **No counterfactual was run on it**, so "raise it and he stops falling" is not measured and I am not
   offering it. Step 3.3m's own warning stands: *nobody has measured `A₄₄` for a flat, surface-piercing planing
   surface at beam Froude 3.5 and 20–60° of roll*, and the same is true of its stiffness.
2. **I will not call `166 N·m` the right answer.** It is `716 × the half-beam` — the moment a load makes if its own
   centre of lift reaches the rail — and a real board's centre of lift does not reach its rail at every heel. It is
   an **upper bound on one mechanism**, and it is in §4 as a scale, not a target.
3. **`K_hull` from the ride is a FIT** (R² 0.514–0.822), over a window in which the speed, the trim and the depth
   all move. The static control is a **bare board at a held pose**, so its magnitudes are not the loaded ones. I
   quote the two as agreeing on an **order** over the heels the rides reach, and on nothing finer.
4. **The CoP travel is [A] on one [M] and one [R]**, and it assumes the whole hull moment is the load's own centre
   moving — the most generous reading there is. Any other part of that moment makes the travel smaller.
5. **I will not re-interpret a single one of step 3.4h's published numbers.** §2 reproduces its arms **to the digit**
   (§9 C1) and finds its tables right; the only thing it changes is the *size* of the bank at the fall on the steep
   face, 70.0 → 86.8°, which 3.4h itself flagged and declined to quote.
6. **No ride was taken and nothing here is a claim about feel.** The owner rides and judges.
7. **"The body barely accelerates in lean at the median" is a median, not a ride.** `f73-g`'s single-body left-hand
   side is 1.0 N·m over 4 743 frames and its rides still end at 42.6–48.5° of bank. The tail is the fall.
8. **I will not claim `series = 11.8–50.6` or the 94–99 % share is off the matrix.** Both are
   `bankAuthority`'s own two-spring formula [R, `rollModel.ts:185`] evaluated at this round's measured `K_hull`, and
   that formula is a reduction of a 9×9 solve, not the solve. **The matrix's own analogous number is a different
   quantity and is in §5's table**: the ankle's authority `|own/relative|` is **0.204–0.511**, so 49–80 % of the
   joint's own motion does not arrive at the body as absolute lean. **The two must not be quoted as one** — that
   substitution is the kind of thing step 3.3m caught my brief doing with a diagonal.
9. **And I will not call the static control's 70–153 N·m/rad "the rate the board rights itself at".** In the held
   pose the water's inertia takes almost all of the pressure field's moment (§5 reading 6: −5.33 against +4.66, a
   net `I·Δω` of −0.38 N·m). The figure is a **pressure-field gradient**, which is the right thing to put in series
   with the ankle and the wrong thing to read as a free board's righting rate.

## 9. The controls

**C1. This round's four default arms reproduce step 3.4h's own arms to the digit.** `f73-g`, `f73-l`, `s16-g`
(= 3.4h's `c-a75-g-abs`) and `s16-l` (= its `a75-l-off`): **84 of 84 runs matched on 7 columns — `fellAt`, `fell`,
`bankFall`, `rollFall`, `railFall`, `throughFall`, `frames` — with 0 mismatches** [M], and the frame counts agree
too (5 031 against 3.4h's 5 031). **So `bankRaw` and the ledger's N·m view changed nothing**, which is the control
that §2 and §3 are measured on the shipped rider.

**C2. The partition and the identity are both exactly zero**, over 9 016 frames: `momentSplit` and `momentResidual`
are `0.0e+0` as maxima on every arm [M]. The existing `ledgerSplit`/`ledgerClosure`/`ledgerResidual` controls are
unchanged by this round's additions.

**C3. The `assist` entry reads 0.00 N·m** on every arm and stance, as `compressAssist`'s early return on `newRider`
requires [R] — the partition is read, not assumed. **The `bdAnkle` entry reads 0.00** on every frame, as
`coupleStanding`'s row-7-only booking requires [R].

**C4. The two dumps are joined on `(stance, entry)` and `unjoined` is 0 on all eight arms** [M], which is step
3.4h's own §9 C4 control carried forward. No run crashed in this round: 24/24/18/18 summary rows and 24/24/18/18
joined per-frame runs on every arm.

**C5. This round reads no new corner of `A⁻¹`.** `ankleOwn`, `ankleRelative`, `ankleDeck`, `rollDeckPer` and
`bodyHeld` are step 3.3m's own five, unchanged, and §5 reading 5 is the tie: all five reproduce 3.3m's published
bands on four arms it never ran. **The one genuinely new instrument is the N·m view, and C2 is its control.**

**C6. The static heel sweep's own control is its 0 m/s row**, which must be the hydrostatic stiffness alone and
reads **−34.3 N·m/rad at trim** against the planing rows' −69.9 / −105.4 / −152.6 [M]: the hydrodynamic part is
1.0–3.5 × the hydrostatic one, which is the sign that the control is measuring a planing hull and not a float.

## 10. Seatbelts

- **`./node_modules/.bin/tsc --noEmit -p tsconfig.json`: exit 0**, with `node_modules` symlinked from the main
  checkout (never `npx tsc` in a worktree — the handoff's trap).
- **The default game is byte-identical.** `bankMax` is `MAX_BANK` unless `bankClamp === 'off'`; `bankRaw` is written
  and read by nothing; `bankLedger`'s new fields are filled only while `on`, which is false in the game. **C1 is the
  measurement that says so**, 84 runs on 7 columns.
- **No unpaired force.** This round adds no force at all. `bankClamp: 'off'` *removes* a truncation from a reading;
  the ankle's spring then sees the angle the geometry gives, which is the paired quantity it was always meant to see.
- **The switch is pinned off in the online rooms** (`main.ts`'s `overrides`), and `PhysicalMode.test.ts` reads that
  pin out of `main.ts` and fails if it is removed.
- **The Canyon byte check: identical on both grids**, `main` against this branch, like for like — §10b.
- **The suites.** `vitest run --exclude 'src/wave/SurfZoneSimulation.test.ts'` — the excluded file declares 644.5
  minutes of per-test timeout and cannot gate anything (`c2-step5g.md` §7.3). **367 files passed, 37 skipped;
  3 651 tests passed, 23 expected-fail, 43 skipped; 431 s; exit 0.**
- **`SurfZoneRunner.test.ts` is outside the merge suite** and is run by hand after start/spray/duck changes; this
  round touches none of those.

### 10b. The Canyon byte check, in its A/B form, and the handoff's third caution confirmed on `main`

**The three cautions, each honoured and each visible in `results/34i/34i-canyon-byte-check.txt`:** the wrapper is
`globalThis.location = { search: '?canyonWaves=true' }` **prepended to the bundle** for the B grid and absent for
the default one; the **grid** is printed and read, **B 400 × 451 = 180 400** and **default 400 × 507 = 202 800**;
and the **"spun up on the CPU in … s"** line is printed, with every pairing **like for like** on it.

| **[M]** 120 steps, same machine, same seed, both runs of a pair importing the SAME state | snapshots | final state |
|---|---|---|
| **Canyon B** — `main` (`2b5574ce`) | `daad779700490728` | `07cbc2c756e95179` |
| **Canyon B** — this branch | **`daad779700490728`** | **`07cbc2c756e95179`** |
| **the default Canyon** — `main` | `1d7f9125628f21d2` | `ff3d2edee6c660ad` |
| **the default Canyon** — this branch | **`1d7f9125628f21d2`** | **`ff3d2edee6c660ad`** |

**Identical in both columns on both grids.** No reference hash from an earlier round is quoted: the folder's
references were taken at **3 600** steps with a fresh spin-up and cannot be compared with a 120-step run. What is
compared is **the two trees against each other**, which is what the seatbelt is for, and which is a tighter test
than matching a figure from another machine-day.

**Why 120 and not 3 600, stated rather than hidden.** The machine ran out of memory — **8 GB of RAM with 57 MB
free** and swapping onto a volume **98 % full** — and a 3 600-step arm that takes about ten minutes rested took over
an hour and was abandoned twice. The per-step rate is unaffected (**77.7–85.8 ms** of CPU solver against step 3.4h's
84.3–88.4), so the cost was wall clock, not the measurement. 120 steps hashes 120 consecutive snapshots and the
whole final state over two seconds of sea, with the rider stepped on every one of them (`board` 0.98–1.08 ms p50 in
both columns), which is enough for any difference in the board's or the rider's code to appear.

**And the third caution is now a measurement, taken on `main` alone.** Same build, same grid, same 120 steps, same
seed, the only difference being whether the sea was spun up in that process or imported:

| **[M]** `main` alone, the default Canyon | snapshots | final state |
|---|---|---|
| **FRESH spin-up** | `c601393e8d626f2a` | `23bc1585cc56f647` |
| **the same state imported** | `1d7f9125628f21d2` | `ff3d2edee6c660ad` |

**A kept `.sea` does not reproduce a fresh spin-up's hashes, confirmed with nothing else changed.** The handoff's
warning is real, it is not about this branch, and it is why every pairing above is like for like. **It also means a
round that benches fresh and compares against a reference taken fresh is fine, and a round that benches an imported
state and compares against that reference is not — and the two cannot be told apart from the hashes alone.**

## 11. Files (3.4i)

- **`src/physics/AttachedRider.ts`** — `AttachedRiderOptions.bankClamp?: 'off'`, the private `bankMax`, the public
  measurement field `bankRaw`, and the three clamp sites in `frame` reading `this.bankMax` instead of the constant.
  Nothing else moves; every other `MAX_BANK` is untouched.
- **`src/physics/bankLedger.ts`** — the N·m view of the partition it already splits: `moment` and `momentTotal` per
  source, `diagonal`, `coupling`, `boardMoment` and `boardMomentTotal`, with `momentSplit` and `momentResidual` as
  their controls. Filled only while `on`.
- **`src/physics/RideSession.ts`, `src/wave/SurfZoneSimulation.ts`, `src/wave/SurfZoneRunner.ts`,
  `src/game/PhysicalMode.ts`, `src/main.ts`** — the switch's chain and its room pin, one line each.
- **`src/game/PhysicalMode.test.ts`** — `bankClampSwitch` parsed, applied at three spots, pinned off in the room,
  and absent by default.
- **`docs/research/new-rider/3.3/plant.ts`** — `BANKC=off`, three privates added to `RiderInner` (`legLength`,
  `ankleTorque`, `legLoad`), and the per-frame dump's new columns: `bankRaw`, `clampedBank`, the whole moment budget
  and the board's roll row by source. The arms it runs are otherwise Part 8's own.
- **`docs/research/new-rider/3.4/clamp.ts` — new.** Part **A**, the fall mix read twice with the `other` population
  split into its disjoint causes and the clamp A/B with its identical-prefix control; Part **B**, the budget on both
  windows with the per-source body row and board row; Part **C**, the compliances, the hull's answer and the CoP
  travel. Imports nothing from `src/` and writes nothing.
- **`docs/research/new-rider/3.4/hull.ts` — new.** The static control: a bare board at a held heel and a held forward
  speed on `PlaneWater`, read through the game's own roll ledger.
- **`docs/research/new-rider/3.4/results/34i/`** — eight arms as `.jsonl` (per run) and `.mount.jsonl.gz` (per
  frame), **6.4 MB gzipped**, plus `34i-predictions.md` (committed at `36105b1a`, before any arm was read),
  `34i-predictions-scored.md`, `34i-summary.txt`, `34i-hull-stiffness.txt` and `34i-canyon-byte-check.txt` (the
  A/B hashes, both grids, with the fresh-against-imported measurement on `main`).
- **`docs/research/new-rider/3.4/README.md`** — this Part, appended below Part 8's last line.

## 12. For the owner, in plain words — and the shot list

**Short version: I found the thing that was missing, and it is not in the surfer. It is in the water under the
board.**

When you stand on a board and lean, your foot presses harder on one side. A real board answers that: the water under
it pushes back harder on that side, and the push moves across the board toward your foot. That push is what you
stand against. It is the whole reason leaning works.

**Our board gives back a tenth of it.** I measured what the surfer's weight asks of the board, and what the water
answers, on four different waves: he asks for 44 to 192, and the water answers 5 to 33. The water's push moves
**3 to 20 % of the way across the board** when it should travel much further. So when he leans, there is not much
there to lean on, and 94 to 99 % of every correction his ankle makes just rolls the board instead of standing him
up. His ankle is strong — stronger than a real person's braced ankle. It is pushing against something soft.

**And it gets worse exactly where he falls.** On a flat board the water's push is firm. By the time the board is
tilted 15–20°, the push is gone. Past 20° the water starts helping him over instead of holding him up. He falls at
43–87° of lean.

**Two smaller things.** First, the 70° limit on how far his body was allowed to lean, which I was sent to lift:
lifting it changes nothing. His falls are counted at 45°, and a limit at 70 cannot hide anything at 45. The only
thing it hid was how far over he really goes — 87° instead of 70° on the steeper wave. Second, I can now name the
third kind of fall we could not name: it is **a fall at 20–45° of lean** — not thrown, not a slow stall, just over.
It is **10 of 24 falls on your own wave.**

**I did not fix anything.** I am not going to raise the water's push and tell you it is fixed, because nobody has
measured what that number should be for a board like ours, and a number I pick to stop the falls is a number I
picked. **The next round should ask the water-physics advisor what the right one is, then change that one thing and
have you ride it.**

### The shot list, if you want to ride it

Nothing in this round changes the game, so there is nothing new to feel. If you want to check the one switch it
adds:

`?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&bankClamp=off`

against the same address without `&bankClamp=off`. **I expect them to feel the same** — the bench says 84 of 84
rides are identical until the body is past 70°, which is after the fall has started. If they feel *different*, that
is news and worth telling me.

The question only you can answer is still step 3.4h's: **does a slow topple at 1.2 m/s feel better or worse than
being thrown at 6.5?** If worse, "make the ride longer" is the wrong target.

## 13. The deletions column, read line by line

`git diff --stat origin/main HEAD` before the push, read for the deletions number, as every round since step 3.2 has.
This round's own: **41 files, 2 467 insertions and 7 deletions** against `origin/main`, of which, read with
`git stash` so the docs do not hide them, **8 files under `src/`, 193 insertions and 7 deletions** — and every one of the seven is a line **replaced in place**: the three `MAX_BANK` clamp
expressions in `frame`, the three `begin()`/`close()`/loop lines in `bankLedger` the new entries were threaded into,
and `main.ts`'s pinned-list line. **No file under `src/` is deleted, renamed or emptied, and no probe of any earlier
round loses a line: `3.3/plant.ts` gains an env read, three privates and the dump's columns and loses nothing.** The
whole-branch number is in the PR body.

# Part 10 — step 3.4j: is the stance point's across acceleration in the balance's own model?

**One question, read off the matrices and not off the comments. The answer is YES, in all three places, with the right
sign and the right frame, and it is the LARGEST single term in the controller's bank row — 95.8–96.7 % of that row's
L1 norm on the shipped plant, over all twelve table cells read (4 speeds × 3 stances).**

**So the advisor's closing sentence — "which is what your own `mCoup` already measures as the budget's largest term",
offered as the thing the rider is held by and implicitly as the thing we lack — does not land as a gap.** `mCoup` is
the largest term in the *solve's* budget (3.4i §3) **and** the largest term in the *controller's internal model*. The
rider is not blind to it. **The advisor's physics is not refuted; its implied diagnosis is.** Nothing here touches the
hull's ~100 N·m/rad, the clamp, the wave, the placement or the ankle's range.

## 1. Where it is, by line

**(a) `rollModel.ts` — the shipped plant (`yawRows`, the no-`body` branch), lines 689–694:**

```
const slipAcc = side.map((w, j) => (w + push[j]) / (y.boardMass * v));
slipAcc[4] -= 1;                                              // β̇ = a_y/V − r
const feet = slipAcc.map((s, j) => v * s + y.feetStation * yawAcc[j]);
feet[4] += v;                                                 // undoes the −1 above, so `feet` is a_y + x_f ṙ
const bankAcc = cop.map((t, j) => (-t - m * hh * feet[j]) / (m * hh * hh));
bankAcc[2] += g / hh;
```

`feet` **is** the stance point's across acceleration — the board's own lateral acceleration `a_y = V(β̇ + r)` plus the
yaw-acceleration lever at the feet station `x_f ṙ` — and the body's bank row carries it at `−feet / h`. That is exactly
the `− m h a_f` term an inverted pendulum omits by assuming its base is still, i.e. the controller-side twin of
`coupleStanding`'s `m t̂·(Δv + Δω × b)`. It is a **state-dependent disturbance**: not a separate state, a linear
functional of the states the loop already carries (β and r).

**(b) `rollModel.ts`'s older five-state `plantMatrix` (line 60)** carries it as an explicit state instead: `a = a_lat/g`
with `−topple/inertia` on the bank row, driven by `ȧ = (φ − a)/T`. That model does not ship (its own header says so).

**(c) `predictiveBalance.ts` — the design, the Kalman filter and the Smith predictor all run on (a).** `continuousPlant`
(line 173) is `twistRows` re-ordered; `design` (line 996) discretises it, and Φ, Γ, K and L are all built on it. So the
prediction over the delay and the LQR gain both have the term in them.

**(d) `humanBalance.ts` — the capture test has it too, by a different route: the felt vertical.** `capture` reads
`felt`, which `AttachedRider.captureStep` (lines 5038–5072) builds as the **pair's specific force** — the momentum
difference of board + body over the substep, plus `g ŷ`, low-passed — and then
`nx = felt.x/|felt|`, `px = offset.x − height·nx` (`humanBalance.ts:472` — **the brief cited 428; that line is the knees' motor lag, and the term is twelve lines in the same method at 472**). Subtracting `height·nx` is the
accelerating-base correction written as a frame tilt: `nx ≈ a_x/g`, so `px ≈ offset.x − h a_x/g`. **The brief asked whether `humanBalance.ts:428` is the term; the
term is real and is at line 472, not 428.**

**What is genuinely absent, and it is small and already named:** the `z_d φ̈` lever (the feet sit 0.031 m over the
board's centre of mass, so the board's roll acceleration moves them across). The shipped `feet` row omits it while the
roll row still carries `z_d F` — half of a pair. `?riderBody=two`'s `feetRoll` adds it; 3.4a measured it at **3.7 % of
the roll row**. Also absent from (d): the stance point's rotational term `Δω × b`, deliberately — the comment at
`captureStep` records that the feet's *own* specific force swung by a g and more against the 2.54 kg board and read a
fall in 0.07 s of a lean begun (the don't-retry list), which is why the **pair's** centre of mass is used instead.

## 2. The brief's two suspicions, read

- **`predictiveBalance.ts` "the rider feels and anticipates the board; it does not pretend to steer it"** is at
  **line 1031**, inside the comment on `DesignWeights.heaveScale`, and it is about the board's **heave and pitch**
  states carrying no cost because neither command can heave or pitch the board. **It is not an admission about the
  across acceleration.** (The same sentence repeats at line 1205 for the same reason.) The brief's "may be exactly the
  admission, or may be about something else" resolves to the second.
- **`humanBalance.ts:428`** *is* the across-acceleration term, as above.

## 3. The sign and the frame, checked against a column and not a comment

The identity below is read entirely off the assembled matrix `A = twistRows(y, t, 1, n)` — the bank row against the
plant's **own** slip and yaw rows — with no reference to any comment:

> **`A[3][j] = −( V·(A[5][j] + [j = 4]) + x_f·A[4][j] ) / h`** for every column `j`, with the bracket the `β̇ = a_y/V − r`
> bookkeeping at the yaw-rate column.

**It holds on every column of all twelve shipped cells.** Worked at column 5 (the slip), 1.31 m/s tall:
`A[5][5] = −1.0332e+2`, `A[4][5] = −3.0316e+1`, `V = 1.31`, `x_f = −0.244`, `h = 0.84` →
`−(1.31·(−103.32) + (−0.244)(−30.32))/0.84 = +1.5233e+2`, and `A[3][5] = +1.5233e+2`. Matched at every cell
(5 significant figures printed; the predicted and the actual column entry are the same number).

**The sign is right, by the pendulum and not by assertion.** A positive slip gives `a_y = V·A[5][5] = −135.4 m/s²` —
the stance point accelerates toward **−x** — and the body's bank accelerates **+**: the base runs out from under the
body one way and the body goes over the other. `θ` and `φ` are positive toward the same rail (the file header), so this
is the across axis of the board's own frame, which is the frame `coupleStanding`'s `t̂` is in.

**The frame of (d) is also right.** `pairFelt` is `a + g ŷ` in the world (`captureStep`: `ay = Δp_y/(h·total) + gravity`),
which is the accelerometer's specific force `a − g⃗`, then rotated into the deck's axes. A stance point accelerating
`+x` gives `nx > 0` and `px` more negative, i.e. the body effectively leaning toward `−x` of the feet. Correct.

**No frame error found. The seventeenth was not here.**

## 4. How big it is in the controller's own bank row

L1 norm of each part of the bank row, over the whole 11-state row, at the four arms' speeds and the three stances
(**12 shipped cells; this is a model read, not a ride — one number per cell, no distribution**):

| speed | stance | `|coup|` the base-acceleration part | `|grav|` | `|rest|` the ankle/cop part | coup's share |
| --- | --- | --- | --- | --- | --- |
| 1.31 (`f73-g`) | tall / crouch / compress | 1384.9 / 2368.7 / 3372.4 | 11.7 / 15.1 / 17.8 | 49.7 / 83.0 / 115.9 | **0.958 / 0.960 / 0.962** |
| 1.16 (`f73-l`) | tall / crouch / compress | 1388.4 / 2373.3 / 3377.8 | 11.7 / 15.1 / 17.8 | 49.7 / 83.0 / 115.9 | **0.958 / 0.960 / 0.962** |
| 6.47 (`s16-g`) | tall / crouch / compress | 1760.0 / 2856.3 / 3963.4 | 11.7 / 15.1 / 17.8 | 49.7 / 83.0 / 115.9 | **0.966 / 0.967 / 0.967** |
| 6.50 (`s16-l`-ish) | tall / crouch / compress | 1765.6 / 2863.6 / 3972.1 | 11.7 / 15.1 / 17.8 | 49.7 / 83.0 / 115.9 | **0.966 / 0.967 / 0.967** |

With `?riderBody=two` the same shares are **0.596–0.678** — the identity stops holding exactly there, as it must,
because the two-body solve adds the `z_d φ̈` lever and the body's own inertia, which is that switch's whole content.

**The question 2 of the brief ("if it is absent, how large is what the controller is not modelling") does not apply.**
What it is not modelling is the 3.7 %-of-the-roll-row `z_d φ̈` half-pair, already measured in 3.4a and already
switchable.

## 5. And it is not modelled-but-unusable: both ranks are full

A term in a plant is only usable if the states carrying it can be reconstructed from the senses and reached by the
commands. Both checked on the shipped 10-state design (`senseMatrix`'s seven senses; `discretise` at `CONTROL_STEP`),
six cells, 2 speeds × 3 stances:

- **observability rank 10 of 10 in all six cells.** The slip β is **not** directly sensed (the header says so), but it
  is reconstructable: `r` falls straight out of two senses (`ω_u` and `ω_u − r`), and β follows through the dynamics.
- **controllability rank 10 of 10 in all six cells.**
- **and the shipped LQR actually feeds back on it:** `K_ankle[β]` = **2.461 / 3.974 / 3.280** rad per rad at 1.31 m/s
  (tall / crouch / compress) and **0.433 / 0.586 / 0.646** at 6.47, against `K_ankle[θ]` = 6.082 / 7.006 / 5.159 and
  0.927 / 1.048 / 1.093. **The gain on the slip is 40–63 % of the gain on the bank itself at 1.3 m/s and 47–59 % at
  6.5.** The loop is not ignoring the base.

## 6. The consequence, in one sentence — and the (a)-or-(b)

**The falls are not a missing model term: the balance already models the stance point's across acceleration, with the
right sign and frame, as the dominant entry of its bank row, and it can both observe and act on the states that carry
it — so whatever stops the rider holding a turn is not the controller's ignorance of `mCoup`, and the next round must
not be briefed as "add the term".**

**On (a) vs (b): the question is moot as asked, because there is nothing to fix in the model.** Had the term been
absent, adding it would have been **(a)** — a change to the internal model only, which is Φ, Γ, K and L rebuilt on a
different plant, no force and no hidden motor; that is exactly the shape of `?riderBody=two` (3.4a's own scope line:
"a change of plant, not of controller"). **The thing that is still open — the advisor's `θ_max = atan(v²/(g·R_min))`
ask-cap — is a different animal and it is NOT (a):** it changes the **reference** the loop holds, which is the
commanded bank, so it changes what the ankle does and therefore the forces at the deck. That makes it closer to **(b)**
in effect while being (a) in mechanism: no new force term is written down, but a real force (the ankle's, paired with
its reaction on the board's roll row) changes because the command changed. **Whether that counts as a hidden motor is
still the owner's ruling and this round does not settle it; it only narrows it to "a bound on the command", not "a
force added".** It is not built here.

## 7. What this round did NOT do

- Shipped nothing. **No file under `src/` is changed by this round** — the three probes were run from scratch files
  and removed, and the §3 identity is short enough to re-derive from the lines quoted in §1.
- No ride, no fall counts, no byte check (nothing to byte-check: the default is unchanged by construction, there being
  no change).
- Did not re-open the hull (~100), the clamp, the wave, the placement or the ankle's range.
- Did not build the ask-cap.

**The honest limit of this round:** everything above is a read of the controller's **model**, at table points, with one
number per cell. It says the term is there, correctly signed and dominant. It does **not** say the model's *value* for
that term matches what the solve delivers — the controller's plant is the captive-derivative table, clamped at 4 m/s
below that speed, and the 1.16–1.31 m/s arms both sit under the clamp. **Whether the modelled `a_y` and the solved one
agree in size at the owner's own speeds is the obvious next measurement, and it is a different question from this one.**

# Part 11 — step 3.4k: the 4 m/s floor under `PLANT_SPEEDS`, measured

**One question. The lead 3.4j ended on: `labAt` (`predictiveBalance.ts:618`) clamps with `Math.max(speeds[0], …)` and
`PLANT_SPEEDS` (`:203`) starts at 4 m/s, so at the owner's own falling speeds — 1.16 and 1.31 m/s — the balance is
designed on the water's derivatives at 4 m/s. Does that matter, and by how much?**

**The answer in one line: YES at the low-speed cell, and the size is that the model's side force — the term that makes
`a_y`, 95.8–96.7 % of the controller's own bank row (3.4j) — is 1.6–2.3× too large and points the WRONG WAY on 59–72 %
of ticks there, against 0.77–0.93× and 2–8 % wrong-signed where the table is honest. And extending the table downward
is (a): a model-only change, no force written down, the shape of `?riderBody=two`. It needs no owner's ruling — but it
needs an instrument that does not exist yet, because at 1.16–3 m/s the captive rig's board SINKS, so there is no
honest row below 4 m/s to measure, and the one the clamp lands on is the table's own most anomalous row.**

**And the constraint holds, loudly: this explains the low-speed cell and NOTHING ELSE.** 3.4h measured 626 of 626 falls
over entries of 1 to 10.4 m/s, Compress 205 of 205. The arms with **no clamped tick at all** (420 arm-rows, 33 335 live
ticks, Part A §1) have a model whose side force is right to 7–23 % with the sign right on 92–98 % of ticks — **and the
rider still falls in every one of them.** If a later round reads this section as the cause of the falls, it has made
the error 3.4i named: the clamp can move at most the arms below ~4 m/s.

## 1. Part A — the size of the mismatch, per arm, with populations

**The instrument is already in the dumps and I read its definition before quoting it.** `3.3/plant.ts` Part 7 is FORCE
against FORCE with no inertia and no solve on either side: `kModel`/`yModel`/`nModel` are the model's water roll
moment, side force and yaw moment built by `loads(y, x[0])` from the twelve derivatives at the tick's own state, with
`y = plantAt(speedUsed, depth, …)` and therefore `labAt`-clamped below 4 m/s (`:1044`, `:1049`, `:1221`); and
`kGame`/`yGame`/`nGame` are `BoardBody`'s own per-source water ledgers at the same tick (`:1227–1232`, `:1686–1691`).
`yAbsRatioMed` is the **median over the arm's live ticks of `|yModel/yGame|`** (`:2124`), not a ratio of medians, and
`ySignRight` is the share of live ticks whose two signs agree. `speedClampedShare` (`:1613`, `:2092`) is the share of
live ticks whose `speedUsed` fell outside the table's 4–12 m/s. **All of these are already dumped in 34h and 34i**, so
Part A needs no new ride. **A counting honesty: the dumps carry counterfactual variants beside each ride (for
instance `?bankClamp=off`), and a variant that does not change the water's forces has force columns identical to its
partner's — so the row counts below are ARM-ROWS, not independent rides, and the tick counts are the honest measure of
population.**

Banded by the clamp, **arm by arm, never pooled across stances**, from the 34h and 34i arm dumps
(`results/34k/34k-force-ratios.txt` §A1 has all eighteen rows; each figure is the median over that band's arms of that
arm's own per-tick median):

| round | stance | band | arms | live ticks | speed med | **side force `|model/game|`** | **sign right** | roll moment `|ratio|` | yaw moment `|ratio|` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 34h | tall | **every tick clamped** | 31 | 1 334 | 2.39 | **1.382** | **0.516** | 5.111 | 1.052 |
| 34h | tall | no tick clamped | 122 | 9 828 | 6.89 | 0.929 | 0.921 | 2.855 | 0.606 |
| 34h | crouch | **every tick clamped** | 27 | 985 | 2.17 | **1.238** | **0.509** | 3.267 | 1.056 |
| 34h | crouch | no tick clamped | 112 | 8 894 | 6.92 | 0.872 | 0.926 | 2.702 | 0.581 |
| 34h | compress | **every tick clamped** | 27 | 967 | 2.30 | **1.094** | **0.585** | 3.172 | 0.997 |
| 34h | compress | no tick clamped | 105 | 8 249 | 6.94 | 0.830 | 0.939 | 2.715 | 0.506 |
| 34i | tall | **every tick clamped** | 12 | 392 | 2.42 | **1.573** | **0.485** | 11.941 | 1.268 |
| 34i | tall | no tick clamped | 30 | 2 454 | 6.20 | 0.914 | 0.947 | 3.318 | 0.606 |
| 34i | crouch | **every tick clamped** | 12 | 378 | 2.30 | **2.236** | **0.332** | 4.169 | 1.065 |
| 34i | crouch | no tick clamped | 26 | 1 982 | 6.41 | 0.851 | 0.955 | 3.584 | 0.636 |
| 34i | compress | **every tick clamped** | 12 | 382 | 2.29 | **2.001** | **0.313** | 3.527 | 1.606 |
| 34i | compress | no tick clamped | 25 | 1 928 | 6.51 | 0.769 | 0.978 | 3.396 | 0.458 |

**And at the owner's own speeds rather than the clamped band's middle** — the arms whose median tick speed is at or
below 1.6 m/s with **100 % of ticks clamped** (§A2; 34h and 34i together, by stance, never pooled across stances):

| stance | arms | live ticks | speed med | side force `|model/game|` | **sign right** | `|yModel|` N | `|yGame|` N | roll `|ratio|` | yaw `|ratio|` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 13 | 334 | **1.31** | **1.622** | **0.409** | 131.0 | 68.8 | 6.726 | 1.748 |
| crouch | 13 | 316 | **1.252** | **2.216** | **0.345** | 170.6 | 84.5 | 4.541 | 1.605 |
| compress | 12 | 274 | **1.226** | **2.329** | **0.280** | 145.6 | 89.6 | 8.194 | 1.839 |

**The mismatch's size, stated once: 1.6–2.3× in magnitude, and the sign wrong on 59–72 % of ticks.** The magnitude is
the smaller half of it. A dominant bank-row term that is twice too big is a badly tuned loop; one whose **sign** is
wrong more often than right is a loop feeding back the opposite way, and 0.280–0.409 is worse than a coin toss.

**What held up in the honest band is the control that makes this readable.** Where no tick is clamped the same model's
side force is 0.77–0.93× with the sign right on 92–98 % — so the instrument is not simply broken, and the roll moment
`K` (2.5–3.6× everywhere, which 3.3o already published) is not what moved: **the side force and the yaw moment are,
and they move only under the clamp.**

**Two honesties about this, both stated before anyone builds on it.**

1. **The sign share is not yet conditioned on magnitude.** `|yGame|` at those arms is 68.8–89.6 N, so the typical tick
   is far from zero and the disagreement is not a zero-crossing artefact *at the median*. But the share is taken over
   **all** live ticks, and the dumps carry no tick-level `yGame`, so I cannot show the share restricted to
   `|yGame| > 20 N`. **What it would take:** re-run `3.3/plant.ts` on these arms with the tick rows kept (it already
   computes them; only the dump is summarised). One run, no new rider.
2. **The band confounds the clamp with low speed itself.** Everything below 4 m/s is clamped by construction, so
   "clamped" and "slow" cannot be separated by banding the arms. §2 separates them a different way — model-only, with
   the speed held and only the row swapped.

## 2. Part B — what the clamp costs the design, with only measured rows

**`plantAt`'s `speed` is NOT clamped.** V enters the kinematic rows at its true value (`v * slipAcc`, the feet
station's lever, `boardDerivatives(scaled, speed, 0.236)`); only the twelve water derivatives, `boardInertiaAt` and
`lab.drag` are pinned to row '4'. So "what does the clamp cost" is exactly "how far does the design move when the row
the clamp lands on moves", and the honest way to ask it is to swap row '4' for the **next rows the table actually
measured** — 4.5, 5 and 6 m/s — holding V at 1.16 and 1.31. **No row is invented and none is designed on.**
`docs/research/new-rider/3.4/floor.ts`, dump `results/34k/34k-design-sensitivity.jsonl`.

**The control passes first:** the shipped design reproduces 3.4j's figures exactly — `K_ankle[θ]` 6.082 / 7.006 /
5.159 and `K_ankle[β]` 2.461 / 3.974 / 3.280 at 1.31 m/s, and 0.927 / 1.048 / 1.093 and 0.433 / 0.586 / 0.646 at
6.47. **And the 6.47 m/s cells do not move by a digit under any swap**, which is the negative control the swap
needs: it touches only what the clamp touches.

At **1.31 m/s** (tall / crouch / compress; one design per cell, a model read, no distribution):

| row the clamp lands on | `K_ankle[β]` | `K_ankle[θ]` | `K_twist[θ]` |
| --- | --- | --- | --- |
| **'4' (shipped)** | **2.461 / 3.974 / 3.280** | **6.082 / 7.006 / 5.159** | −1897.5 / −520.2 / **+99.8** |
| '4.5' | 0.772 / 1.004 / 1.048 | 2.714 / 2.551 / 2.275 | −853.1 / −578.1 / −383.7 |
| '5' | 0.896 / 0.819 / 0.709 | 2.968 / 2.297 / 1.844 | −568.6 / −339.7 / −217.0 |
| '6' | 1.305 / 1.291 / 1.070 | 3.448 / 3.148 / 2.590 | −918.3 / −477.1 / −230.2 |

At **1.16 m/s** the same shape: `K_ankle[β]` 4.389 / 3.713 / 2.485 shipped against 0.975 / 1.196 / 1.180 at '4.5';
`K_ankle[θ]` 9.908 / 7.141 / 4.528 against 3.146 / 2.899 / 2.496.

**The cost, stated:** moving the clamped row by the table's own smallest step — 0.5 m/s, to the next measured row —
**cuts the shipped gain on the slip by a factor of 2.5–4.0 and the gain on the bank by 2.2–2.8**, and in Compress at
1.31 m/s it **flips the sign of the twist gain** (+99.8 → −383.7). The three swap rows agree with each other within
about 1.8× and disagree with the shipped row by 2.5–4×, so **the shipped low-speed design is not bracketed by its
neighbours: it is an outlier produced by one row.**

**And the mechanism is visible in the table itself, which is the part that makes this more than a sensitivity.** Row
'4' is the table's own anomaly: its comment records **trim 46.4°, draft 0.513 m** — a board that is not planing but
half sunk — and several of its derivatives have the opposite sign to the entire rest of the table. The yaw moment per
radian of slip runs **+143.8 at 4 m/s, +41.3 at 4.5, −28.6 at 5, −161.0 at 6** and stays negative to 12; the roll
moment per radian of roll is **−37.2 at 4** against −98.0 at 4.5 and 5. **So the clamp does not extrapolate the
planing table downward. It pins every sub-4 m/s design to the single row where the hull has changed regime and the
signs have turned over** — which is exactly the shape of Part A's finding that what breaks under the clamp is the
*sign* of the side force and the yaw moment, not their size.

**Where honest derivatives below 4 m/s do not exist, and I will not invent a row.** §3 is the measurement.

## 3. The rig cannot measure below 4 m/s, because the board sinks

`../roll-plant/plant.probe.ts` PART=captive, SPEEDS=1.16,1.31,2,3,4, dump `results/34k/plant-low-34k.jsonl`.

**The pipeline is verified against the published row before anything new is read.** Group `all`, the `Kdeck` column,
the **1° roll** case, the **1° slip** case, the **−0.1 rad/s yaw-rate** case and the **mean of the two
`rollRate-deck`** cases reproduce `PLANT_SPEEDS['4']`'s `roll`, `slip` and `yaw` **exactly** off the stored
`3.2/results/plant-speeds.jsonl` (−37.2, −177.6, −268.7 / 143.8, 343.8, −63.0 / −18.7, 43.0, −61.3), and the `rate`
triple exactly too (−7.69, −8.0, −4.33). A **fresh** run at 4 m/s reproduces roll, slip and yaw exactly and the
roll-rate triple to 2–3 % (−7.55, −8.0, −4.20) — so eleven of the twelve are reproducible to the digit and the
twelfth to a few per cent, and the twelfth is the one the 3.2 README already records a harness fix for.

**Then the finding.** The rig's steady glide (2.5 s of tow, roll / yaw rate / slip held, **pitch and heave free**):

| v m/s | trim ° | draft m |
| --- | --- | --- |
| 4.00 | 46.41 | 0.5130 |
| 3.00 | **90.00** | **3.0021** |
| 2.00 | **90.00** | **3.0021** |
| 1.31 | **90.00** | **3.0020** |
| 1.16 | **90.00** | **3.0020** |

`Flat` (`../roll-plant/plant.ts:16–25`) returns `waterDepth: 3`, `bedY: -3`. **A draft of 3.002 m at 90° of trim is the
board stood on its end and sunk through the lab's bed**, and the same number at four different speeds is the bed, not a
balance. The physics is not a bug: 73 kg of rider on a 2.54 kg board cannot be held up by a surfboard's displacement,
so below the speed at which the hull makes dynamic lift the assembly has **no equilibrium at all** — row '4' is already
46° of trim and half a metre of draft, and 0.5 m/s slower there is no trim point to take a derivative about.

**So "extend the table downward" is not a small job, and the four low-speed triples the probe prints are not a row.**
They are recorded in `results/34k/34k-force-ratios.txt` §A3 only so nobody re-runs the rig expecting one, and **they
must not be put in `PLANT_SPEEDS`.**

**What it would take to get an honest sub-4 m/s row, in order of cost:**
1. **A rider that floats.** The lab's rider is a rigid point mass; a real surfer at 1.3 m/s is mostly *in* the water
   and displaces his own weight, which is why he does not sink. A `RiderKind` whose weight is partly carried by its own
   buoyancy would have a trim point at 1.3 m/s. This is the physically right instrument and the largest change.
2. **Derivatives on the wave face instead of flat water.** The game's board at 1.3 m/s is on a sloping, moving face,
   not on a flat lake, and `speedUsed` is already relative to the local flow. A captive hold in `FaceWater` would be
   measuring the water the board is actually in. **Cheapest open question first:** the mount dumps carry no draft or
   trim column, so **nobody knows whether the game's board at `speedUsed` ≈ 1.3 m/s is planing or half sunk.** If it is
   half sunk, row '4' may be the *closest* row the table owns and the clamp is less wrong than §2's sensitivity
   suggests. Adding a draft/trim column to the ride dump is one run and should come before any table work.
3. **System identification from the ride itself** — the force-against-force columns of `3.3/plant.ts` are already most
   of this; kept per tick they would give the derivatives at the states the rider actually visits.

## 4. Part C — is this plausibly the low-speed fall, and what would refute it

**What it predicts, if it is a cause:** in the band below ~4 m/s the loop feeds the ankle back on a side force whose
sign is wrong more often than right, so the command should be **wrong-way as often as it is late** — the rider should
go over *toward* the lean rather than merely fail to catch it, and the fall should be the "sudden into the face" kind
rather than the "slow stall" kind. It predicts a **discontinuity at 4 m/s**, not a trend: rides entered at 4.5 m/s and
above should not show it, and 4.435 m/s arms (82 %, 75 %, 67 % of ticks clamped) should sit between.

**How the owner could tell, and it is a shot and not a probe:** ride Canyon with `?canyonWaves=true` and take off
**twice at a crawl and twice with speed already made**, same spot. If the slow take-offs drop him in a way the fast
ones do not — going over toward his own lean within the first second, rather than stalling — that is the shape. **If
both feel the same, this is not it.**

**What refutes it outright, and either is cheap:**
- **The honest band already falls.** 420 arm-rows and 33 335 live ticks with **no clamped tick**, a side force right to
  7–23 % with the sign right on 92–98 %, and the rider falls in all of them. So the clamp is **already refuted as the
  phenomenon** and can only be a term in the low-speed cell.
- **The §3 open question.** If the game's board at `speedUsed` ≈ 1.3 m/s turns out to be half sunk at 40–50° of trim,
  row '4' is the nearest honest row the table has and §2's 2.5–4× is an overstatement of the clamp's error. One dump
  column decides it.

## 5. Part D — the classification, exactly

**Extending `PLANT_SPEEDS` downward, or measuring derivatives below 4 m/s, is (a): a model-only change.** Traced, not
asserted:

- `PLANT_SPEEDS` and `labAt` are read by **`plantAt` alone**, and `plantAt` is called from exactly two places in
  shipped code, both inside `predictiveBalance.ts` (`:1201`, `:1206`, in `PredictiveController`). A grep of `src/` and
  `server/` for `labAt`, `PLANT_SPEEDS` and `plantAt(` finds **no other consumer** — the only other hits are
  `predictiveBalance.test.ts`.
- From there the table reaches `continuousPlant` → `discretise` → Φ, Γ, **K** and **L**, and nothing else. **No water
  force in the game is computed from it.** The game's water forces come from `BoardBody`'s own ledgers, which is why
  Part A can put the two side by side as model against game.
- The only thing that changes outside the model is the **ankle's commanded rest angle**, and the ankle is a real spring
  whose torque is already paired by its reaction on the board's roll row (`coupleStanding`). **No force is written
  down, no moment appears without a reaction, and no kinematic prescription is realised by whatever force it takes.
  It is not a hidden motor.**
- **This is the same shape 3.4j classified and the same shape `?riderBody=two` has** — 3.4a's own scope line, "a change
  of plant, not of controller". It is NOT the shape of the `θ_max = atan(v²/(g·R_min))` ask-cap, which changes the
  **reference** the loop holds and is still waiting on the owner.

**So the next round does not need the owner's ruling to change the table.** What it needs is §3's instrument, and that
is a measurement problem, not a permission problem.

## 6. What I refuted, and what I will not claim

**Refuted, in my own brief:** nothing about the clamp — the brief's premise is right and verified twice (the floor, and
`labAt`'s `Math.max`). But **one of its framings is wrong and should not be repeated**: the brief and 3.4j both say the
advisor "puts that regime below planing entirely … so the clamped 4 m/s derivatives may describe water the board is
not even in." The 4 m/s row is **not an extrapolation of the planing rows** — it is a *measured* row, taken at 46.4°
of trim and 0.513 m of draft, i.e. **measured in exactly the non-planing regime the advisor describes**. The fault is
not that row '4' describes planing water; it is that row '4' is the table's **sign-turnover row** and the clamp makes
every speed below 4 m/s inherit it (§2). Those are different faults with different fixes.

**I will not claim:**
- that the clamp causes the falls. It cannot: 626 of 626, and the honest band's 277 arms fall with a model that is
  right. **At most the low-speed cell.**
- that the side force's sign share survives conditioning on magnitude. Not measured; §1 says what it would take.
- that an honest sub-4 m/s row exists. §3 says it does not, with the rig we have.
- anything about the hull's ≈100 N·m/rad, the 70° clamp, the wave, the placement, the ankle's range, or "the rider is
  blind to the across acceleration" (3.4j: present, correctly signed, 95.8–96.7 % of the bank row). None re-opened.
- any comparison against the old rider's benchmark. Retired by 3.4y and not used here.

## 7. What this round did NOT do

- **Shipped nothing. No byte under `src/` or `server/` is changed**, so there is no switch to add, no default to keep
  and nothing to byte-check. The two instruments are `3.4/floor.ts` (model only, and it restores `PLANT_SPEEDS` and
  prints the restored row so a reader can see it) and `../roll-plant/plant.probe.ts` PART=captive, unmodified, at new
  speeds.
- No ride and no fall counts of its own: Part A reads 34h's and 34i's dumps.
- Did not build the ask-cap, and did not write a row into `PLANT_SPEEDS`.

## 8. Files (3.4k)

- `3.4/floor.ts` — Part B, the design's sensitivity to the row the clamp lands on. Model only.
- `3.4/results/34k/34k-design-sensitivity.jsonl` — its dump, 36 designs + the restore check.
- `3.4/results/34k/plant-low-34k.jsonl` — the captive rig at 1.16, 1.31, 2, 3 and 4 m/s (`../roll-plant/plant.probe.ts`
  PART=captive, unmodified).
- `3.4/results/34k/34k-force-ratios.txt` — Part A §A1/§A2 in full (eighteen banded rows and three at the owner's own
  speeds), the derivative pipeline's verification against row '4', and §A3's sunk-board table.

## 9. For the owner, in plain words

**Your balance is designed on a table of how the water pushes the board, and that table starts at 4 m/s. Below that it
just re-uses the 4 m/s line. At the speed you fall at — about 1.2 m/s — the sideways push the balance *thinks* the
water is making is about twice as big as the push the game actually makes, and it points the wrong way more often than
the right way. Where the table is honest it is right to about a tenth and points the right way nineteen times in
twenty.**

**But this is not why you fall.** The rides that never touch the clamp — four hundred of them — fall too, with a
model that is right. So fixing this would fix the slow take-off and leave the rest.

**The shot that would tell us:** Canyon, `?canyonWaves=true`, two take-offs at a crawl and two with speed already
made, from the same spot. **If the slow ones drop you by throwing you over toward your own lean inside the first
second and the fast ones do not, this is a real part of it. If they feel the same, it is not, and we should say so and
move on.**

# Part 12 — step 3.4l: the two things step 3.4k listed under "Not claimed"

**Two cheap checks and nothing else, both named by step 3.4k itself. The answers in one line each: the sign finding
is NOT a zero-crossing artefact — it holds at the largest forces and in two stances it is WORSE there (0.000–0.500
on the top tercile against 0.954–0.986 where the table is honest), so the headline SURVIVES. The magnitude half of
it is overstated: the 1.6–2.3× is carried by the smallest-force third (ratio 1.86–6.06 there against 0.61–1.16 on
the largest third), so at the ticks where the side force matters the model has roughly the right SIZE and the wrong
SIGN. And the game's board below 4 m/s is NOT planing — draft 0.27–0.30 m against 0.039–0.068 m where the table is
honest, trim 16.0–17.2° against 3.0–4.5° — but it is NOT at row `'4'` either: its own trim and draft land on rows
`'4.5'`–`'5.5'`, which are exactly the rows §2 swapped in, so §2's 2.5–4× is NOT overstated. If anything this
vindicates it.**

**And one confound 3.4k did not name, found while cutting the data and stated before anyone builds on the band: at
the owner's own speeds the clamped live window is mostly the capsize itself.** Only **19 / 34 / 29 %** of the
≤ 1.6 m/s live ticks (tall / crouch / compress) have the board rolled inside 25°, against **64 / 61 / 64 %** over
the whole clamped band and **69 / 76 / 63 %** where the table is honest. So any figure read on that band is thin
(17–24 ticks a stance survive the roll filter) and is partly a reading of the fall rather than of the design. The
sign finding survives that cut in crouch and compress (0.167, 0.292) and **does not survive it in tall** (0.42 over
the whole window → **0.824** inside 25° of roll, n = 17).

## 0. The rig, and the one identity check it needs

`3.3/plant.ts` with step 3.4k's own prescription applied and nothing else: the Part 7 force-against-force columns
(`yGame`/`yModel`/`kGame`/`kModel`/`nGame`/`nModel`, plus `speedUsed`/`speedClamped`) and six new trim/draft columns
are now written **per tick** by the `TICKS=` switch step 3.4c already added. **Nothing is computed for the dump that
was not already on the row** — `3.3/plant.ts:1686–1691` builds the game's three off `BoardBody`'s own per-source
water ledgers and `:1690` the model's three off the twelve derivatives at the tick's own state. **No byte under
`src/` or `server/` is changed by this round**, so there is no switch to add, no default to keep and nothing to
byte-check in the game; the byte check this round owes is on the *probe*, and it is below.

**The identity check: `f73-l` re-run with the new columns reproduces step 3.4i's published arm exactly** — 18 of 18
fell, **0.617–2.533 s, median 1.450 s**, against `results/34i/f73-l.log`'s `fell 18 of 18, at 0.617–2.533 s, median
1.450`. The added columns move no ride.

**Arms** (step 3.4i's own, `RIDER=new FELT=deck BODY=two`, `AHEAD` 0.75, `SIDE` −45, 9 s a run, the stance held, the
stick never touched): `f73-l` (FACE 1.4,7.32,5.7, `ENTRIES=1..6` × 3 stances, 18 runs), `s16-l` (FACE 1.4,16,5.7,
the same entries, 18) and `s16-g` (FACE 1.4,16,5.7, the default eight relative entries, 24). **4 990 tick rows,
4 038 of them live.** `f73-g` was attempted and **abandoned**: the design goes singular partway through that arm
(`dare` → `inverse` throws `singular`), a pre-existing limit of the probe at that cell, not a change of this round.
Its partial dump is excluded, so nothing here is read off a truncated arm.

**Column definitions, read before quoting, all three the captive lab's own** (`../roll-plant/plant.ts:357–368`):
`draftFace` m is the deepest patch under **the water's own surface over that patch** (`BoardBody.toWorld` into the
world, the surface sampled per patch, because on a face it is not at y = 0); `trimWorld` ° is the lab's own
`asin(f.y)`, nose up +; `facePitch` ° is the **surface's** own pitch along the board's heading (for a plane
`n·x = c`, `dy/ds = −(n·ŝ)/n_y`, so `atan2(−n·fwd, n_y)`); **`trimFace = trimWorld − facePitch`** is the board's trim
against the water under it, and on flat water `facePitch = 0` so `trimFace` is the lab's own number — which is the
control on the definition. `wetShare` is the share of patches under the surface.

## 1. CHECK 1 — the sign share conditioned on `|yGame|`. Not a zero-crossing artefact.

**Live ticks, clamped (`speedUsed` outside 4–12) with `speed ≤ 1.6 m/s` — the owner's own cell — terciles of
`|yGame|` taken WITHIN each stance's cell, never pooled:**

| stance | n | speed med | tercile | n | `|yGame|` med N | `|model/game|` med | **sign right** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 88 | 1.190 | **all** | 88 | 113.2 | 1.517 | **0.420** |
| | | | low | 29 | 57.2 | 2.434 | 0.448 |
| | | | mid | 29 | 112.2 | 1.295 | 0.379 |
| | | | **high** | 30 | **144.7** | **0.782** | **0.433** |
| crouch | 71 | 1.240 | **all** | 71 | 101.1 | 2.124 | **0.324** |
| | | | low | 23 | 34.7 | 4.162 | 0.174 |
| | | | mid | 24 | 101.0 | 3.122 | 0.333 |
| | | | **high** | 24 | **133.8** | **1.203** | **0.458** |
| compress | 82 | 1.218 | **all** | 82 | 95.1 | 1.836 | **0.329** |
| | | | low | 27 | 34.2 | 2.582 | 0.222 |
| | | | mid | 27 | 93.5 | 2.158 | 0.519 |
| | | | **high** | 28 | **148.0** | **1.114** | **0.250** |

**And the control, the same table where no tick is clamped** (the honest band, `s16-g` and the fast ticks of the two
`-l` arms):

| stance | n | speed med | tercile | n | `|yGame|` med N | `|model/game|` med | **sign right** |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 945 | 6.649 | all | 945 | 140.9 | 0.891 | 0.937 |
| | | | low | 315 | 89.3 | 0.688 | 0.844 |
| | | | **high** | 315 | **247.5** | **0.982** | **1.000** |
| crouch | 1 134 | 6.824 | all | 1 134 | 140.3 | 0.749 | 0.924 |
| | | | low | 378 | 75.1 | 0.729 | 0.841 |
| | | | **high** | 378 | **242.8** | **0.723** | **1.000** |
| compress | 937 | 6.704 | all | 937 | 179.0 | 0.736 | 0.957 |
| | | | low | 312 | 107.2 | 0.825 | 0.913 |
| | | | **high** | 313 | **311.5** | **0.631** | **1.000** |

**Read it in three sentences.**

1. **The wrong sign is not concentrated at small forces.** On the clamped cell the top tercile's own `|yGame|`
   medians are **133.8–148.0 N** — nowhere near zero — and the sign share there is **0.433 / 0.458 / 0.250**, i.e.
   no better than the cell's own average in tall and compress and still worse than a coin toss in all three.
2. **The honest band does the opposite, which is the control that makes (1) readable.** There the share **rises**
   with the force and reaches **1.000 on the top tercile in all three stances** — 315, 378 and 313 ticks with not
   one sign disagreement — while its own low tercile sits at 0.841–0.913. So the instrument behaves exactly as a
   correct model should when conditioned on magnitude, and the clamped cell does not.
3. **But the MAGNITUDE half of 3.4k's headline is overstated, and the direction is the same in both bands.** The
   ratio falls monotonically with the force: 2.43 → 0.78 (tall), 4.16 → 1.20 (crouch), 2.58 → 1.11 (compress), and
   on the whole clamped band under a roll filter it runs **1.86–6.06** on the low tercile against **0.61–1.16** on
   the high one. **So "the model's side force is 1.6–2.3× too large" is a statement about the ticks where the force
   is smallest. At the ticks where it matters the model has roughly the right size and the wrong sign** — which
   sharpens 3.4k's own sentence ("the magnitude is the smaller half of it") rather than contradicting it.

**And the confound, stated with its numbers.** Filtering the same cells to ticks with the board rolled inside 25° —
i.e. before the capsize has taken the geometry over — leaves only **17 / 24 / 24** ticks at ≤ 1.6 m/s (19 / 34 /
29 % of the live ticks there), against 241 / 216 / 184 over the whole clamped band (61–64 %) and 653 / 862 / 588 in
the honest band (63–76 %). On that cut the sign share is **tall 0.824 (n = 17), crouch 0.167 (24), compress 0.292
(24)**, against **0.908 / 0.900 / 0.932** in the honest band at the same roll filter. **So in crouch and compress
the wrong sign is there before the fall; in tall it is not, and tall's published 0.409 is in large part a reading of
the capsize.** With 17 ticks nothing stronger than that should be said about tall.

## 2. CHECK 2 — the game's board below 4 m/s is half sunk, but it is NOT at row `'4'`

**The columns step 3.4k's cheapest-first list asked for, live ticks, the board rolled inside 25° so the capsize's own
pitch-up is not being read as a trim (populations for both cuts are in the results file):**

| band | stance | ticks | speed med | **`trimFace` med °** (10–90) | **`draftFace` med m** (10–90) | `wetShare` | nearest row by trim / by draft |
| --- | --- | --- | --- | --- | --- | --- | --- |
| **clamped (< 4 m/s)** | tall | 241 | 3.00 | **17.24** (5.2–31.9) | **0.3011** (0.109–0.530) | 0.604 | **`'5.5'` / `'4.5'`** |
| | crouch | 216 | 3.12 | **17.25** (3.0–31.2) | **0.2812** (0.064–0.473) | 0.562 | **`'5.5'` / `'4.5'`** |
| | compress | 184 | 2.82 | **15.96** (3.1–32.5) | **0.2728** (0.064–0.481) | 0.583 | **`'5.5'` / `'4.5'`** |
| **clamped, ≤ 1.6 m/s** | tall | 17 | 1.50 | 5.85 | 0.1454 | 0.646 | `'9'` / `'6'` |
| | crouch | 24 | 1.26 | 4.35 | 0.1024 | 0.594 | `'11'` / `'6.5'` |
| | compress | 24 | 1.33 | 4.66 | 0.1106 | 0.594 | `'9.5'` / `'6.5'` |
| **honest (4–12)** | tall | 653 | 6.09 | **3.03** (1.7–7.9) | **0.0388** (0.016–0.122) | 0.542 | `'12'` / `'9.5'` |
| | crouch | 862 | 6.39 | **4.46** (1.3–11.1) | **0.0675** (0.004–0.170) | 0.521 | `'11'` / `'8.5'` |
| | compress | 588 | 6.02 | **3.75** (1.1–10.0) | **0.0444** (0.008–0.148) | 0.500 | `'10.5'` / `'9'` |

`PLANT_SPEEDS`' own trim and draft per row, off its own comments [R, `predictiveBalance.ts:204–220`]: `'4'` 46.4°
0.513 m, `'4.5'` 25.9° 0.293, `'5'` 19.3° 0.215, `'5.5'` 15.3° 0.166, `'6'` 12.6° 0.133, `'6.5'` 10.7° 0.109,
`'7'` 9.2° 0.091, `'12'` 2.9° 0.017.

**The verdict, in the brief's own two words: HALF SUNK, but not at row `'4'`.**

1. **It is not planing.** Below 4 m/s the board carries **0.27–0.30 m** of draft at **16.0–17.2°** of trim with
   **56–60 %** of its patches wet; in the honest band the same board carries **0.039–0.068 m** at **3.0–4.5°** with
   **50–54 %** wet. **That is 4–7× the draft and 4–5× the trim**, and it is the table's own non-planing regime, not
   planing water. **So step 3.4k's correction to its own brief is confirmed from the ride's side too**: row `'4'`
   does not describe water the board is not in.
2. **But row `'4'` is not the nearest honest row.** 46.4° and 0.513 m is the deepest, most-trimmed row the table
   owns, and the ride's own pair lands a row or three shallower: nearest by draft **`'4.5'`** in all three stances
   (per-tick modal nearest row `'4.5'` with `'4'` second), nearest by trim **`'5.5'`**. At the owner's own ≤ 1.6 m/s
   ticks it is shallower still — 0.10–0.15 m and 4.4–5.9°, nearest rows `'6'`–`'6.5'` — although that is 17–24
   ticks a stance and should be quoted as such.
3. **Therefore §2's 2.5–4× is NOT overstated.** §2 swapped row `'4'` for rows **`'4.5'`, `'5'` and `'6'`** and found
   those three agree with each other within ~1.8× and disagree with the shipped row by 2.5–4×. **The rows the
   board's own trim and draft pick out are inside that swap cluster.** So the swap was not a sensitivity about an
   arbitrary neighbour: it was, by this measurement, a swap toward the row the board is actually in. Step 3.4k's
   §4 offered "if it is half sunk at 40–50° of trim and ~0.5 m of draft, row `'4'` is the nearest honest row and
   §2's 2.5–4× is an overstatement" — **the board is half sunk, but at 16–17° and 0.27–0.30 m, not 40–50° and
   0.5 m, so that refutation does not fire.**
4. **One thing the honest band also says, and it is a new lead and not this round's business.** At 6.0–6.4 m/s the
   game's board sits at **0.039–0.068 m of draft and 3.0–4.5° of trim**, where the table's rows at that speed record
   **0.109–0.133 m and 10.7–12.6°** — nearest rows `'8.5'`–`'12'`. **The game's board on a wave face is consistently
   LESS sunk than the captive rig at the same speed**, which is what the face's own orbital lift and slope would do
   and is the same argument §3's item 2 makes for measuring in `FaceWater`. It means the clamp is not the only place
   the table and the ride disagree about regime — but the honest band's model is right to 7–23 % with the sign right
   on 92–98 %, so whatever that mismatch costs, it is not costing the sign.

## 3. What this round refuted, and what it will not claim

**Refuted:** step 3.4k's §4 escape hatch — *"if the game's board at `speedUsed` ≈ 1.3 m/s turns out to be half sunk
at 40–50° of trim, row `'4'` is the nearest honest row the table has and §2's 2.5–4× is an overstatement."* The
board **is** half sunk and row `'4'` is **not** the nearest row; the nearest rows are the ones §2 already swapped in.

**Also refuted, in my own brief:** its framing that this round could only confirm or demolish. It does both in
different places — the sign survives, the magnitude is overstated, §2 is vindicated — and it found a confound
neither it nor 3.4k named (the ≤ 1.6 m/s live window is mostly the capsize).

**I will not claim:**
- that tall's wrong sign is real before the fall. 17 ticks inside 25° of roll, share 0.824. **Crouch and compress's
  is** (0.167 and 0.292 on 24 ticks each, against 0.900–0.932 in the honest band on the same cut) — and that is
  still 24 ticks a stance.
- that trim and draft are derivatives. They are a **geometric** proxy for which regime the hull is in, measured to
  the lab's own two definitions so the two can be compared at all. The ride's water is also moving with the board,
  so the same draft at a lower through-speed is not the same hydrodynamics; nothing here is a sub-4 m/s row and
  **§3's finding that no honest row exists below 4 m/s is untouched.**
- that the clamp causes the falls. 3.4k's constraint is carried unchanged: 626 of 626, and the honest band falls too.
- anything about the hull's ≈100 N·m/rad, the 70° clamp, the wave, the placement, the ankle's range, or "the rider
  is blind to the across acceleration" (3.4j: present, correctly signed, 95.8–96.7 % of the bank row). None
  re-opened. No comparison against the old rider's retired benchmark.

## 4. What this round did NOT do

- **Shipped nothing.** The only file changed is the probe `3.3/plant.ts` (six trim/draft columns on the per-tick
  dump and the Part 7 force columns carried into it); `src/` and `server/` are byte-identical to `main`. The probe
  change is identity-checked against step 3.4i's own published arm (§0).
- Did not write a row into `PLANT_SPEEDS`, did not build the `θ_max` ask-cap, did not touch `labAt`.
- Did not ride `f73-g` (singular design, pre-existing) and did not re-run the captive rig.

## 5. Files (3.4l)

- `3.4/results/34l/34l-sign-magnitude-and-trim.txt` — both checks in full, with every cut's populations.
- `3.4/results/34l/f73-l.ticks.jsonl.gz`, `s16-l.ticks.jsonl.gz`, `s16-g.ticks.jsonl.gz` — the per-tick dumps
  (4 990 rows), and the three arms' own summary dumps beside them.
- `3.4/results/34l/34l-read.py`, `34l-read-cuts.py` — the reads above, so every table can be rebuilt from the dumps.

## 6. For the owner, in plain words

**Two questions were open about last round's finding, and both are now answered.**

**First: was "the balance pushes the wrong way at your falling speed" just noise about zero?** No. When the sideways
push is at its biggest — about 140 N, a fifth of your own weight — the balance still gets its direction wrong two
times in three on two of the three stances. Where the balance's table is honest, the same test gets the direction
right **every single time** out of three hundred. So the finding stands. What does NOT stand is the size: the "twice
too big" was measured mostly on the small pushes; on the big ones the size is about right and only the direction is
wrong.

**Second: is the board at your falling speed sliding on top of the water or ploughing through it?** Ploughing —
about 30 cm deep and 17° nose-up, against 4 cm and 3° when you have speed. So the balance's table is at least
reading the right kind of water. **But the particular line it falls back on is too deep even for that**: the board's
own depth and angle match the table's 4.5-to-5.5 m/s lines, not the 4 m/s line the code pins it to. **So last
round's fix — use the next lines up instead of the 4 m/s one — is pointed the right way, and this round makes it a
better bet than it looked.**

**One honest caveat, and it changes nothing you would ride.** At a crawl you fall so fast that there is barely any
ride to measure: only about a fifth to a third of those moments have the board still roughly level. **Your shot is
unchanged and still the thing that would settle it**: Canyon with `?canyonWaves=true`, two take-offs at a crawl and
two with speed already made, same spot. If the slow ones throw you over **toward your own lean** inside the first
second and the fast ones do not, this is real. If they feel the same, it is not, and we close the lead.

# Part 13 — step 3.4m: the fix built, opt-in, and the measurement that refutes it

**The eleven rounds before this one narrowed to one change, and this round built it: `?plantFloor=4.5|5|6`, an opt-in
switch that stops a sub-4 m/s design inheriting row `'4'` of `PLANT_SPEEDS`. The default is byte-identical and that is
measured, not asserted. And the primary metric says the change does not work: the sign-correct share of the model's
side force before the fall moves 0.167 → 0.227 in crouch and 0.292 → 0.222 in compress, against the honest band's
0.900 / 0.932 it was meant to reach, and in tall — the negative control — it falls from 0.824 to 0.083. The whole
bracket (4.5, 5 and 6) is a null: nothing reaches 0.9.**

**And the decisive read says it could not have worked, which is the round's real finding.** With the state held — the
shipped ride's own ticks, row `'4'` swapped for row `'4.5'` in the model and nothing else — the sign of the side force
flips on **4.1 % / 0.5 % / 0.0 %** of the clamped ticks (tall / crouch / compress) and the share moves
**0.718 → 0.718, 0.519 → 0.514, 0.397 → 0.397**. Crouch's 0.167 and compress's 0.292 are **bit-identical** under the
swap. The ride-side differences above are the *trajectory* changing, not the sign being repaired.

**The mechanism, read off the table's own header and not off a comment: the side force has no sign turnover anywhere in
the table.** Of the twelve derivatives exactly **two** change sign across the whole 4–12 m/s range, and **both are yaw
moments** — N per radian of slip (+143.8, +41.3, −28.6, … −1115.5) and N per radian of roll rate (−7.69, −3.52, −1.63,
+0.87, … +8.01). **Not one of the four side-force derivatives changes sign at any row.** Y per radian of roll runs
−177.6 → −395.3, Y per radian of slip +343.8 → +3741.4, Y per rad/s of yaw rate +43 → +117, Y per rad/s of roll rate
−8.0 → −30.1. So **no choice of row can repair the sign of Y**; it can only re-weight four terms whose signs are
fixed, and the weights barely move (slipSide/heelSide is −1.936 at row `'4'` against −1.684 at `'4.5'` and −1.952 at
`'5'`). The brief's chain — "row `'4'` is the table's sign-turnover row" ∧ "in the clamped band the model's side force
points the wrong way" ⟹ "fix the row and fix the sign" — joined two true facts that share no mechanism.

**Nothing here re-opens** the hull's ≈100 N·m/rad, the 70° clamp, the wave, the placement, the ankle's range, or 3.4j's
"the rider is not blind to the across acceleration". **The constraint is carried unchanged: 3.4h measured 626 of 626
falls over 1–10.4 m/s and the honest band falls with a model that is right, so the clamp was already refuted as the
cause of the falls.** Every arm here still falls in every run at every floor, which is the expected and accepted
result.

## 0. What was built, by line

One mechanism, one constant: **the lowest row of `PLANT_SPEEDS` the lookup may land on.**

- `predictiveBalance.ts` `labAt(speed, floor?)` — the lower clamp becomes `floor ?? speeds[0]`, itself clamped into the
  table. Omitted, it is 4 and the function is what it was.
- `plantAt(speed, depth, { plantFloor })` — passes it to `labAt` and **nothing else**: `speed` still enters the
  kinematic rows, `railCorrection`/`frozenCorrection`, `boardInertiaAt` and `heavePlantAt` at its true value.
- `DesignWeights.plantFloor?: number` — so it travels the route `riderBody` travels, and `scheduledDesign`'s cache key
  already carries the weights, so two designs cannot be confused.
- `AttachedRiderOptions.plantFloor?: '4.5' | '5' | '6'` → the weights, named exhaustively (`Number(null) === 0`, so the
  three are matched as strings and never parsed), with an explicit `plantFloor` in `balance.weights` still winning.
- `RideSessionOptions` → `SurfZoneConfig` → `SurfZoneRunner`'s passthrough → `PhysicalMode.ts`'s `plantFloorSwitch()`
  with its comment line in the switch list, its own test, and **`plantFloor: undefined` in `main.ts`'s online-room
  overrides**, which the test asserts by reading `main.ts`.

**Why the floor and not a draft lookup**, which is what the brief suggested first. Selecting the row by the board's own
measured draft is **worse supported by this folder's own numbers**: 3.4l §2 item 4 measured the game's board in the
*honest* band at **0.039–0.068 m of draft and 3.0–4.5° of trim**, whose nearest rows are **`'8.5'`–`'12'`** — so a
draft-keyed lookup would hand the controller the 8.5–12 m/s derivatives at 6 m/s and change the one band where the
model is right to 7–23 % with the sign right on 92–98 %. It would also need the board's live draft plumbed into a
controller that has no such input. The floor delivers the row the draft evidence picks (modal nearest row `'4.5'` per
tick, all three stances, below 4 m/s) exactly where the evidence is, with one constant and no new input. `5` and `6`
are offered beside it because those are the other two rows 3.4k's sensitivity swapped in, so the bracket can be ridden.

**It is (a), a model-only change, and not a hidden motor** — 3.4k Part D's classification is carried, re-checked and
unchanged: the table is read by `plantAt` alone, `plantAt` by this file alone, and from there it reaches Φ, Γ, K and L
and nothing else. The only thing that changes outside the model is the ankle's **commanded rest angle**, and the ankle
is a real spring already paired by its reaction on the board's roll row. **The `θ_max` ask-cap is NOT in this change.**

## 1. The default is byte-identical, measured twice

**On the model** (`3.4/floor-switch.ts`): `labAt(v)` and `plantAt(v, d, { rail })` with no floor against the same calls
with `plantFloor: 4` — the table's own first speed, which is what the shipped clamp lands on — over 21 speeds from 0 to
99 m/s, three stances and two rails: **168 comparisons, identical bit for bit, largest difference 0.** And the whole
gain schedule, which is what the game reads: **17 speeds × 3 depths × 6 rails = 306 cells × 767 numbers a cell,
identical bit for bit, largest difference 0.**

**On the ride** (`3.3/plant.ts`, the switch unset): `f73-l` reproduces step 3.4i's and step 3.4l's own published arm
**exactly — 18 of 18 fell, 0.617–2.533 s, median 1.450 s.** The two counterfactual column trios this round adds to the
probe (§3, §4c) move no ride: the same arm prints the same table with them on.

**And the switch is step 3.4k's own swap, verified against it.** `plantFloor: 5` and `plantFloor: 6` reproduce
`floor.ts`'s `row4:=5` and `row4:=6` arms **bit for bit**; `plantFloor: 4.5` reproduces `row4:=4.5` to
**3.6 × 10⁻¹⁵** — thirteen significant figures — because the shipped lookup reaches row `'4.5'` as an f = 1
interpolation from row `'4'` rather than as the row itself, which is exactly how the shipped design at 4.5 m/s reaches
it too. So the switch at floor 4.5 hands a sub-4 design the same numbers the shipped 4.5 m/s design is built on.

## 2. The primary metric, ride against ride — the bracket is a null

Step 3.4l's own arms, step 3.4l's own cuts, read the same way (`results/34m/34m-read.py`, `bracket.py`). **Every count
is live ticks, per stance, never pooled.** `speedClamped` keeps the **shipped** 4–12 m/s definition in every arm, so
"clamped" names the same band of speeds either side of the switch. **The rides are not the same ticks across arms —
the switch changes the design, so it changes the trajectory — which is why every n is printed.**

**Cut A — clamped (< 4 m/s), the board inside 25° of roll. The sign-correct share of the side force:**

| stance | shipped (floor 4) | floor 4.5 | floor 5 | floor 6 |
| --- | --- | --- | --- | --- |
| tall | **0.718** (n = 241) | 0.516 (161) | 0.453 (150) | 0.528 (161) |
| crouch | **0.519** (216) | 0.487 (156) | 0.497 (143) | 0.537 (147) |
| compress | **0.397** (184) | 0.441 (152) | 0.438 (137) | 0.489 (135) |

**Cut B — the same, at or below 1.6 m/s: the owner's own cell, and thin (12–27 ticks a stance):**

| stance | shipped | floor 4.5 | floor 5 | floor 6 |
| --- | --- | --- | --- | --- |
| tall | **0.824** (n = 17) | 0.083 (12) | 0.083 (12) | 0.000 (15) |
| crouch | **0.167** (24) | 0.227 (22) | 0.333 (18) | 0.316 (19) |
| compress | **0.292** (24) | 0.222 (27) | 0.294 (17) | 0.222 (18) |

**Cut C — the honest band (4–12 m/s), the control that must not move:**

| stance | shipped | floor 4.5 | floor 5 | floor 6 |
| --- | --- | --- | --- | --- |
| tall | 0.908 (n = 653) | 0.913 (589) | 0.901 (583) | 0.937 (586) |
| crouch | 0.900 (862) | 0.916 (595) | 0.910 (590) | 0.931 (576) |
| compress | 0.932 (588) | 0.940 (568) | 0.936 (566) | 0.957 (554) |

**Read it in four sentences.** (1) **The target is not met**: crouch's 0.167 reaches 0.227–0.333 and compress's 0.292
reaches 0.222–0.294, against the 0.900 / 0.932 the brief set, and on the larger cut A (n = 135–241 rather than 12–27)
crouch moves −0.032 to +0.018 and compress +0.041 to +0.092. (2) **Tall, the negative control, gets worse and not
better** — 0.718 → 0.453–0.528 on cut A and 0.824 → 0.000–0.083 on cut B, where 3.4l had already warned that tall's
cut-B number rests on 17 ticks. (3) **The control holds**: the honest band does not move (0.90–0.96 throughout), as it
must, because those ticks read the same rows at every floor. (4) **The magnitude gets worse, not better** — the
median `|model/game|` on cut B runs 4.49 → 5.31 → 9.04 → 11.55 in crouch and 2.48 → 3.38 → 11.24 → 15.47 in compress,
which is what Y per radian of slip growing from +343.8 to +1031.3 across those rows must do.

**The fall counts, reported and not targeted.** Every arm still falls in every run at every floor: `f73-l` 18 of 18,
`s16-l` 18 of 18, `s16-g` 24 of 24. The medians do not move at floor 4.5 (1.450, 1.033, 1.450 either way). **`s16-g` is
byte-identical in its whole fall table** — 24 of 24 at 1.083–2.683 s, median 1.450, at floor 4.5 as shipped — because
that arm's ticks are all in the honest band, which is the ride-side control on the switch's reach. What does change is
the **tail**, for the worse: the longest ride on `s16-l` goes from **6.233 s to 1.417 s** and on `f73-l` from 2.533 to
1.700. One run each; stated, not built on.

## 3. The decisive read: the same ticks, the same state, the row swapped

Ride-against-ride cannot separate "the row repaired the sign" from "the trajectory moved". So the probe now carries the
row's own counterfactual **on every ride**: `yModelFloor` is the same three water loads from **the same tick's state**
with the table read off a 4.5 m/s floor (`3.3/plant.ts`, one `plantAt` and one `loads` a tick, nothing else).

**On the shipped ride's own ticks, with the state held:**

| cut | stance | n | share, row `'4'` | share, row `'4.5'` | ticks whose sign FLIPS | `\|ratio\|` row `'4'` → `'4.5'` |
| --- | --- | --- | --- | --- | --- | --- |
| A clamped, `\|roll\|` ≤ 25 | tall | 241 | 0.718 | **0.718** | 0.041 | 0.916 → 1.210 |
| | crouch | 216 | 0.519 | **0.514** | 0.005 | 1.470 → 1.976 |
| | compress | 184 | 0.397 | **0.397** | 0.000 | 2.036 → 2.823 |
| B clamped, ≤ 1.6 m/s | tall | 17 | 0.824 | 0.706 | 0.235 | 2.238 → 3.046 |
| | crouch | 24 | 0.167 | **0.167** | 0.000 | 4.487 → 6.900 |
| | compress | 24 | 0.292 | **0.292** | 0.000 | 2.481 → 3.315 |
| C honest band | tall | 653 | 0.908 | 0.908 | 0.000 | 0.811 → 0.829 |
| | crouch | 862 | 0.900 | 0.900 | 0.000 | 0.712 → 0.727 |
| | compress | 588 | 0.932 | 0.935 | 0.003 | 0.700 → 0.706 |

**The two numbers the brief asked to move — 0.167 and 0.292 — do not move by a digit under the change itself.** The row
swap flips the sign on nought to four per cent of the clamped ticks, and the magnitude it does move it moves the wrong
way (1.3–1.4× further from the game). On the floor-4.5 ride the same two columns are identical to each other, which is
the internal check that `FLOOR=4.5` really reaches the probe's model.

## 4. Why — and three things the chain had wrong

**4a. Which derivatives turn over, read off `LabPlant`'s own `[N, Y, K]` ordering.** Each array is
[yaw moment, side force, roll moment] per radian of roll, per radian of slip, per rad/s of yaw rate and per rad/s of
roll rate (the type's own header). Over all seventeen rows:

| per | channel | 4 | 4.5 | 5 | 6 | 12 | one sign over all 17 rows? |
| --- | --- | --- | --- | --- | --- | --- | --- |
| roll | N (yaw moment) | −37.2 | −98.0 | −98.0 | −105.4 | −161.0 | yes |
| roll | **Y (side force)** | −177.6 | −326.6 | −361.0 | −395.3 | −395.3 | **yes** |
| roll | K (roll moment) | −268.7 | −322.0 | −310.0 | −296.8 | −448.6 | yes |
| slip | N (yaw moment) | +143.8 | +41.3 | −28.6 | −161.0 | −1115.5 | **NO — it turns over** |
| slip | **Y (side force)** | +343.8 | +550.0 | +704.7 | +1031.3 | +3741.4 | **yes** |
| slip | K (roll moment) | −63.0 | −191.4 | −272.7 | −411.4 | −1006.1 | yes |
| yaw | N (yaw moment) | −18.7 | −3.8 | −3.3 | −7.6 | −34.4 | yes |
| yaw | **Y (side force)** | +43.0 | +31.0 | +37.0 | +50.0 | +117.0 | **yes** |
| yaw | K (roll moment) | −61.3 | −32.5 | −30.0 | −31.7 | −43.3 | yes |
| rate | N (yaw moment) | −7.69 | −3.52 | −1.63 | **+0.87** | +8.01 | **NO — it turns over** |
| rate | **Y (side force)** | −8.0 | −12.0 | −13.9 | −17.0 | −30.1 | **yes** |
| rate | K (roll moment) | −4.33 | −1.51 | −0.84 | −0.62 | −6.15 | yes |

**Two of twelve turn over and both are yaw moments.** And the slip's yaw moment turns over **between 4.5 and 5**, so
row `'4.5'` is on the **same side of that turnover as row `'4'`** (+41.3 beside +143.8): the fix the eleven rounds
converged on does not even cross the sign change it was named after. **The side force's four derivatives keep their
signs at every row, so the sign of the model's side force is very nearly row-independent**, and §3 measures exactly
that.

**4b. And 3.4k's second anomaly is a column misread.** README Part 11 §2 says *"the roll moment per radian of roll is
−37.2 at 4 against −98.0 at 4.5 and 5"*. **−37.2 is `roll[0]`, which by the table's own `[N, Y, K]` header is the YAW
moment per radian of roll.** The roll moment per radian of roll is `roll[2]`: **−268.7 at 4 against −322.0 at 4.5 and
−310.0 at 5** — a 20 % step and no anomaly at all. The number quoted is real and the name on it is wrong, and the
sentence it supports ("several of its derivatives have the opposite sign to the entire rest of the table") survives
only for the slip's yaw moment, where 3.4k's own figures are right. **Nineteenth column error in a fortnight, found by
reading the type's header before quoting the array.**

**4c. The shipped controller never designs at 1.31 m/s, so 3.4k's §2 sensitivity is not the shipped controller's.**
`PredictiveController.blend` clamps the schedule's speed to `SCHEDULE_SPEEDS[0] = 4` and reads `scheduledDesign` at the
**grid** speeds only, so the design every sub-4 m/s tick runs on is the **v = 4 column** — the plant at **V = 4 m/s**
with row `'4'`'s derivatives, not the plant at V = 1.31 with row `'4'`'s derivatives. `floor.ts`'s
`K_ankle[β]` 2.461 / 3.974 / 3.280 and `K_ankle[θ]` 6.082 / 7.006 / 5.159 at 1.31 m/s — this round reproduces them
exactly, which is the control on the instrument — are the model read at **the tick's own V**, which is the right
quantity for `3.3/plant.ts`'s `yModel` columns and therefore for the sign share. **They are not the gains the game
runs.** The schedule's own 4.0 m/s column is:

| the schedule's 4.0 m/s column | K_ankle[β] (tall / crouch / compress) | K_ankle[θ] | K_twist[θ] |
| --- | --- | --- | --- |
| **shipped (floor 4)** | **0.180 / 0.642 / 0.884** | **2.949 / 2.630 / 2.291** | −540.5 / −413.9 / −334.9 |
| floor 4.5 | 0.303 / 0.319 / 0.294 | 2.045 / 1.769 / 1.526 | −381.1 / −254.7 / −188.4 |
| floor 5 | 0.610 / 0.613 / 0.543 | 1.957 / 1.800 / 1.593 | −506.1 / −320.2 / −215.7 |
| floor 6 | 0.429 / 0.611 / 0.678 | 0.942 / 1.152 / 1.229 | −601.6 / −499.6 / −396.0 |

So the clamp's cost **to the design the game actually runs** is about **1.3–1.5× on the bank gain** and a slip gain that
rises in tall and falls by about half in crouch and Compress — **not the 2.5–4.0× 3.4k published**, which is the cost at
a design point the shipped controller never builds. **And the sign share is insensitive to this too**, which the probe
now measures rather than argues: `yModelSched` is the same three loads at the same state with the plant built at the
controller's own design speed, V = 4 (the twelve derivatives carry no V at all; `boardDerivatives`' yaw sweep over the
feet station, `yawSide = Y_r + ahead·Y_β/V`, is the only term that does, and it is positive either way — +104.9 at
V = 1.31 against +63.3 at V = 4 on row `'4'`). On the shipped ride's own clamped ticks the sign-correct share at the
controller's own design point is **0.689 / 0.509 / 0.380** (n = 241 / 216 / 184) against **0.718 / 0.519 / 0.397** at
the tick's own V — the same number to within two or three ticks in a hundred — and at or below 1.6 m/s
**0.588 / 0.208 / 0.167** against 0.824 / 0.167 / 0.292 (n = 17 / 24 / 24). **So step 3.4l's sign finding transfers
to the design the game actually builds, and this correction is about the magnitude only.** The median `|model/game|`
at the design point is a little smaller (0.828 / 1.345 / 1.872 against 0.916 / 1.470 / 2.036 on cut A), which is the
yaw sweep's V in the denominator.

**4d. The secondary metric, and its negative control.** `K_ankle[β]`, `K_ankle[θ]` and `K_twist[θ]` at 1.31 m/s
(`plantAt(1.31, …)`, the quantity above): shipped **2.461 / 3.974 / 3.280**, **6.082 / 7.006 / 5.159** and
−1897.5 / −520.2 / **+99.8**; at floor 4.5 **0.772 / 1.004 / 1.048**, **2.714 / 2.551 / 2.275** and
−853.1 / −578.1 / −383.7, so Compress's twist gain does flip sign as 3.4k said the row swap would.
**And the 6.47 m/s cells do not move a digit at any floor** — 0.433 / 0.586 / 0.646 and 0.927 / 1.048 / 1.093 and
−499.7 / −426.7 / −353.2, identical at floors 4, 4.5, 5 and 6. At the schedule level the same control is exact:
**at floor 4.5 exactly 18 of 306 schedule cells move, and they are exactly the 18 below the floor** (the 4.0 m/s
column, 3 depths × 6 rails); 36 of 306 at floor 5 and 72 of 306 at floor 6, each time exactly the cells below the
floor, with the largest difference among the cells at or above the floor **0**.

**4e. The schedule stays continuous across the floor**, which a bare "clamp the schedule to 4.5" would not: at the
crouch's depth and no rail, `K_ankle[θ]` runs 2.6304 (every v ≤ 4) → 2.4712 → 2.2325 → 1.9938 → 1.8347 (4.5) shipped,
and flat 1.7695 → 1.7825 → 1.8021 → 1.8216 → 1.8347 (4.5) at floor 4.5. The switch removes a 43 % ramp across 4 → 4.5
and leaves no step anywhere.

## 5. What I refuted, and what I will not claim

**Refuted, in my own brief, and this is the round's work:**
- **"The obvious candidate is to select the row by the board's own measured draft."** It is worse supported: in the
  honest band the game's board's draft picks rows `'8.5'`–`'12'` at 6 m/s (3.4l §2 item 4), so a draft-keyed lookup
  changes the one band whose model is right. §0 states it.
- **"Row `'4'` is the table's own sign-turnover row [therefore] the controller's dominant term points the wrong way."**
  The turnover is in the **yaw moment**, not the side force; **no side-force derivative changes sign at any row**; and
  the turnover it does name lies between 4.5 and 5, so the fix does not cross it (§4a).
- **"Target: move 0.167 and 0.292 toward 0.900 / 0.932."** Measured, and they do not move: under the change itself,
  with the state held, they are bit-identical (§3).
- **"Report tall too as a negative control — it should not get worse."** It gets worse, on both cuts (§2).
- **3.4k §2's 2.5–4.0× as "what the clamp costs the design"**: the design it is measured on is not one the shipped
  controller builds (§4c).
- **3.4k §2's "the roll moment per radian of roll is −37.2 at 4"**: that is the yaw moment per radian of roll (§4b).

**I will not claim:**
- that the switch helps. It does not, on the metric this round was told to judge it by. Its one defensible use is as
  the instrument that closed the lead, and as an A/B the owner can ride if they want to feel it.
- that the switch is harmful beyond what is measured. The shortened tails are one run each on two arms; the fall counts
  and the medians do not move; the honest band does not move.
- that anything here moves the falls, in either direction. 3.4h's 626 of 626 stands and was never in question.
- that tall's cut-B numbers (12–17 ticks) mean anything on their own. Cut A's tall (n = 161–241) is the one that says
  tall gets worse.
- anything about the hull's ≈100 N·m/rad, the 70° clamp, the wave, the placement, the ankle's range, or "the rider is
  blind to the across acceleration". None re-opened. No comparison against the old rider's retired benchmark.
- that an honest sub-4 m/s row exists. 3.4k §3 is untouched: no row was invented and the switch only ever selects
  among rows the lab measured.

## 6. What this round did NOT do

- Did not build the `θ_max = atan(v²/(g·R_min))` ask-cap, and nothing here bounds a command.
- Did not write a row into `PLANT_SPEEDS`, and did not touch any row's numbers.
- Did not change `PredictiveController.blend`'s own clamp: the floor does its work inside `labAt`, which is why the
  schedule's grid, the kinematic V and every cell at or above the floor are untouched.
- Did not re-run the captive rig, did not ride `f73-g` (singular design partway through that cell, pre-existing).
- Did not suspend or weaken any probe. The cuts, the window and the `speedClamped` definition are step 3.4l's own.

## 7. The controls, listed

1. The default, bit for bit, on the model (168 comparisons; 306 schedule cells × 767 numbers) and on the ride
   (`f73-l` 18 of 18, 0.617–2.533 s, median 1.450 s, step 3.4i's published arm).
2. `floor.ts`'s own figures reproduced exactly at 1.16, 1.31 and 6.47 m/s, so the instrument is 3.4j's and 3.4k's.
3. The switch against 3.4k's row swap: bit-identical at floors 5 and 6, 3.6 × 10⁻¹⁵ at 4.5.
4. The 6.47 m/s cells unmoved at every floor; the schedule cells at or above the floor unmoved bit for bit.
5. `s16-g`'s whole fall table unmoved at floor 4.5 — the arm the switch cannot reach.
6. The honest band's sign share unmoved (cut C).
7. On the floor-4.5 ride, `yModel` and `yModelFloor` identical — the check that the probe's switch reaches its model.
8. The Canyon byte check: **the branch's hashes are `main`'s to the digit.** Protocol
   stated, since a fresh spin-up and an imported `--state` give different hashes: **fresh spin-up on both legs**, the
   wrapper `globalThis.location = { search: '?canyonWaves=true' }` **prepended to the bundle**, the grid read as
   **B, 400 × 451 = 180 400 cells** (not the default's 202 800), `--spot canyon --steps 3600`, and the
   "spun up on the CPU in … s" line present on both (78.0 s on `main`, 45.0 s on the branch — the wall clock, which the
   hash does not depend on). `main` **`a367d938f15fa934` / `9e5831f80e38abd9`**, the branch **the same two**, and that
   pair is also the handoff's own recorded B reference. A second leg covers the one guard line added to `labAt` after
   that bundle was built: **the `main` bundle, the branch bundle and the final branch bundle all give
   `548f3db7ca81d898` / `475f8c56c9debccc`** from the same imported `.sea` over 240 steps.

## 8. Files (3.4m)

- `3.4/floor-switch.ts` — the model reads: the default's identity, the switch against 3.4k's swap, both gain
  quantities, the negative control, the continuity across the floor, and §4a's derivative table. Model only.
- `3.3/plant.ts` — the `FLOOR=4.5|5|6` switch and the two counterfactual column trios (`*ModelFloor`, `*ModelSched`).
  Identity-checked against step 3.4i's published arm.
- `3.4/results/34m/34m-sign-share-and-gains.txt` — every table above with every cut's populations.
- `3.4/results/34m/*.ticks.jsonl.gz`, `*.jsonl.gz`, `*.log` — the twelve arms (three arms × four floors; the per-tick
  dumps for the shipped and floor-4.5 arms, the summary dumps and the logs for all four).
- `3.4/results/34m/34m-read.py`, `bracket.py`, `same.py`, `sched.py` — the four reads, so every table above can be
  rebuilt from the dumps (gunzip them first).
- `3.4/results/34m/34m-model.txt` — `floor-switch.ts`'s own output, which §1, §4a, §4c–e are read off.
- `3.4/results/34m/34m-canyon-*.txt` — the Canyon byte check's five legs, raw (both fresh 3600-step legs and the
  three 240-step imported-state legs that cover the late guard line).

## 9. For the owner, in plain words

**We built the fix the last three rounds pointed at, and then measured it, and it does not work. Saying so is the
result.**

The balance keeps a table of how the water pushes the board, and below 4 m/s it was re-using the 4 m/s line. Last
round found that line is the odd one out and that your board down there matches the 4.5 m/s line instead. So this round
made the balance able to use the 4.5 line (or the 5, or the 6) — one switch, nothing else changed, and the default is
exactly what you ride today, which we checked to the last digit on both the maths and a whole set of rides.

**Then the test.** The thing we were trying to fix is that the balance's idea of the sideways push points the wrong way
at your slow speeds. With the 4.5 line instead of the 4 line, and everything else held identical, **the direction is
right on exactly the same share of moments — on two of the three stances it does not change by a single moment.** And
when we looked at why, the table says it plainly: **the sideways push's four numbers never change direction anywhere in
the table, from 4 m/s to 12.** What changes direction is a *turning* number, not a *sideways* one. The two were put
together by mistake. So no line in that table could ever have fixed this.

**What this closes.** The 4 m/s floor is no longer a lead. It is a real flaw and worth tidying one day, but it is not
what drops you, and three rounds of work on it now have an answer.

**If you want to feel it anyway**, the address is
`?physical&canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&plantFloor=4.5` against the same address without
`&plantFloor=4.5`. We expect them to feel the same, or the slow take-offs slightly worse. **If a slow take-off feels
clearly better with it, that is news and it beats everything above.** `&plantFloor=5` and `&plantFloor=6` are the other
two lines, for the same look.
