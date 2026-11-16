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
