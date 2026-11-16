# Step 3.4a — the predictions, each written before its own read, each with its falsification

Branch `claude/rider-two-body-a`, cut from `main` at `c8461904` (step 3.3p's merge). Tags as in 3.2 and 3.3: **[M]**
measured by a probe here; **[R]** read in the code; **[S]** from a source; **[I]** my inference; **[A]** arithmetic on
measured numbers.

## The reads made before anything ran

**R1 [R].** `AttachedRider.coupleStanding` carries the rider as a **point mass** `m` at `carried` with three scalar
freedoms — the leg along `up`, the bank across `across`, the body's own forward — and **no rotational inertia of the
rider's own appears anywhere in the 9×9**. The rider's `yawInertia` (`coupleYaw`) is about the leg line and is a
separate coupling. So the game's rider is a point mass too, and "the model's body is a point mass" is not by itself a
mismatch with the game.

**R2 [R].** For a standing free rider `carried` is `target + off` where `off = position − target` is resolved on the
orthonormal `up`/`across`/`forward` basis, so `carried = position − board.centerOfMass = arm`: the game's own coupling
is symmetric, and the ankle's internal force (`rhs[7] += −h τ / L`) acts between the board and the rider **at the
rider's own centre of mass**, 0.55–0.85 m up, not at the feet.

**R3 [R + A].** The model's `push` — `τ / h − m g θ`, a horizontal force at the feet [R, `rollModel.ts:510–511`] — is
**exactly** the constraint force of a body with **zero** rotational inertia about its own centre of mass. From the
model's own two lines, `m h² θ̈ = m g h θ − τ − m h a_f` and `H = m (a_f + h θ̈)`, the feet's own acceleration `a_f`
**cancels identically**, leaving `H = m g θ − τ / h`. So the invented foot force is not an extra force bolted on: it
is the residue of eliminating a body that cannot resist being accelerated sideways.

**R4 [A on R3].** The shipped `yawRows` is therefore the **J → 0 limit** of a symmetric two-body system whose mass
matrix is `diag(I_x, J, I_z, m_b) + m v vᵀ` with `v = [z_d, h, x_f, 1]` and whose generalised forces are
`[K + τ, −τ + m g h θ, N − F_x y_c, Y]` — the ankle as a torque with its reaction and nothing else.

**R5 [S + A].** de Leva 1996's segment table, posed in the game's own three stances (the same `posture` the yaw
inertia the plant already ships was read from, `3.2/inertia.probe.ts`): the body's own **frontal-plane** inertia about
its own centre of mass is **9.686 / 7.010 / 5.620 kg·m²** (tall / crouch / Compress, the game's arm pose), against
`m h²` of 47.79 / 29.56 / 21.16 — a share of **0.1685 / 0.1917 / 0.2099**. The centre of mass sits 0.809 / 0.636 /
0.538 m over the ankle line, against the plant's own `height` of 0.84 / 0.65 / 0.55.

## The predictions

**P1 — the positive control, predicted before it runs.** With `body.inertia = 0` the assembled plant's six rows equal
the **shipped** `yawRows`' six rows to a relative **1e-12 or better**, entry by entry, at every table point (speed ×
stance × rail), because R3 says the elimination the shipped model does by hand is exact in that limit.
**Falsified** if any entry differs by more than 1e-10 relative, or if the agreement needs `deckHeight` or the feet's
station changed to hold.

**P2 — the ankle is a torque with a reaction and nothing else.** In the assembled system the ankle's own column of the
generalised-force vector is exactly `(+1, −1, 0, 0) τ`: `+τ` on the board's roll row, `−τ` on the body's bank row,
**zero on the sway row and zero on the yaw row**, and the number `τ / h` appears nowhere.
**Falsified** if the sway or yaw entry of the ankle's column is non-zero, or if any entry scales as `1 / h`.

**P3 — the structural term the model has none of.** With R5's inertia the model's "a water side force's own roll"
cross term goes from **exactly 0** [M, 3.3p §2 reading 5] to **−0.015 to −0.030 rad/s per N·s**, the **same sign** as
the game's measured −0.3363 to −0.0360 and inside a factor of 10 of it.
**Falsified** if the sign is opposite, or if it stays under 1e-3, or if it exceeds the game's own span.

**P4 — and the sway mass overshoots, written against P3's good news.** The effective mass a side force meets rises
from the shipped **2.54 kg** to **7–9 kg**, which is **above** the game's own 2.796–5.580 — so the sway mass's
agreement with the game gets **worse**, by a factor of about 1.4–2.8 on the other side instead of 1.1–2.2 on this one.
**Falsified** if it stays under 5.58 kg or exceeds 12 kg.

**P5 — the roll row improves and by less than a factor of two.** On step 3.3o's and 3.3p's own unsteered deck arm (24
runs) the roll row's median of the per-run medians lands in **5.0–10.0**, against the shipped **10.050**; and the roll
row's **sign** agreement moves by **less than 0.10** from the shipped 0.338.
**Falsified** by either number landing outside those ranges.

**P6 — written opposed to P5 on purpose, so one of the two must fail.** The roll row improves by **more** than a
factor of two: the median lands **under 5.0**.
**Falsified** if it lands at or above 5.0.

**P7 — the lean row is not the row this buys.** The lean row's median on the same arm changes by **less than 25 %**
from the shipped 3.540 (so 2.66–4.43), because the only thing the body's inertia does to that row is divide it by
`1 + J/(m h²)` = 1.17–1.21.
**Falsified** outside that band.

**P8 — the pendulum's own term, exactly.** The model's `g h / (J + m h²) · θ` term falls from 3.3o's measured
**121–453 °/s²** by the factor `1 / (1 + J/(m h²))` = **0.826–0.856**, to about **100–385 °/s²** — still **above** the
game's whole measured lean acceleration of 20–206 °/s².
**Falsified** if it lands inside 20–206, or if the factor is not that ratio.

**P9 — the owner's bar is not met by this step.** Ridden with the switch on, Compress falls **6 of 6** on the owner's
own low-speed deck cell.
**Falsified** by a single Compress run surviving nine seconds.

**P10 — the ride is not transformed either way.** The unsteered deck arm's median fall time lands in **0.6–2.4 s**
against the shipped 1.183 s (within a factor of two in both directions).
**Falsified** outside that band.
