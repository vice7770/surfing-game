# Step 3.3p — every prediction as written BEFORE its read, with its own falsification

Branch `claude/rider-new-33p`, cut from `main` at **8889c399** (step 3.3o's merge). Written before the first new
number of the round was produced. The brief is Part 38's ruling item 2: *"Re-derive the internal model against the
game's own 9×9 solve instead of a hand-built ten-state model with the masses and the rail put in by hand."*

## The reads made before anything ran (R1–R4)

**R1. `system[i * N + i] += m` is a DIAGONAL entry of `A`, and my own brief calls it an inertia.** The brief's §4
says *"the model's sway inertia is at least 29.7 times too small (75.54 / 2.54)"* and cites
`AttachedRider.coupleStanding`'s `for (let i = 0; i < 3; i += 1) system[i * N + i] += m` [R]. **Part 36 §2 reading 2
is that a diagonal of `A` is not an effective inertia**: `A[7][7] · L²` is `m L²` = 22–53 kg·m² and the body's
effective roll inertia off `A⁻¹` is **1.00–2.52 kg·m², a twenty-second of it** [M, 3.3m], because the across
coordinate is coupled to the board's roll and to all three of its translations. The sway row is coupled the same
way: `system[i * N + 7] += m t_i` and `system[7 * N + i] += m t_i` are written in the same loop, two lines below the
diagonal [R]. **So the brief's largest single defect is an arithmetic on two diagonals, and the quantity it should
be is `1 / (t̂ · Δv)` off the game's own `A⁻¹`.** That read does not exist yet; this round builds it.

**R2. The model's board roll inertia is already the game's own, measured.** `BOARD_INERTIA` is step 3.2e's in-game
measurement of the board's roll and yaw inertia *with the water's share*, and `plantAt` reads it
[R, `predictiveBalance.ts:569–584`, `:627`]. 3.3m measured the game's own coupled roll inertia at
**0.59–1.13 kg·m² (1.02–1.21 near trim)** against the table's 0.93–1.07 at these speeds. **The roll row's
denominator is NOT one of the hand-built numbers, and it is right.** Whatever is 7–22× out on the roll row, it is
not the roll inertia.

**R3. The water's side force reaches the roll row only through the slip.** `yawRows` writes
`slipAcc = (side + push) / (boardMass · V)` and `rollAcc = (roll + torque + deckHeight · push) / boardRollInertia`
[R, `rollModel.ts:545`, `:551`], and `side`'s own coefficients are the four side derivatives. So a side force
changes the roll row **only** by moving `β` one step and `slipRoll · β` then entering the roll moment. 3.3o's
largest single roll-row group (the side force derivatives, 3 950 °/s²) is therefore a statement about `boardMass`
and nothing else [R + A on 3.3o's [M]]. **And the bank row passes through the same channel**:
`feet = V · slipAcc + feetStation · yawAcc` and `bankAcc = (−cop − m h feet) / (m h²)` [R, `:547–549`]. **One wrong
denominator can make both rows too stiff, which is what 3.3o measured and could not attribute.**

**R4. The game's own 9×9 is assembled per substep from runtime geometry and destroyed by its own solve.**
`solveLinear(s8, r8, n)` eliminates in place [R, `BoardBody.ts:1526`], so `system9` after a substep is a
factorisation and not the matrix. The ledger's `solve` is called **before** it, holds the LU, and already
back-substitutes unit right-hand sides through it [R, 3.3m]. **So the only honest way to read the game's own
effective inertias is more unit right-hand sides on that same LU**, and the only way to have them at design time is
a measured table, which is exactly how `BOARD_INERTIA` got there (step 3.2e).

## The predictions

### P1 — the effective sway mass, the brief's own headline

**P1a.** `1 / (t̂ · Δv)` for one unit of side impulse on the board's own rows, over the unsteered 24, will be
**far below 75.54 kg: between 2 and 15 kg at the per-run median.** Reason: 3.3m measured the body's effective
across mass as a **reduced** mass `m M / (m + M)` = 2.71–3.98 kg, which is the board's own 2.54 kg plus about 0.9 kg
of water — because `1/75` is a thirtieth of `1/3`, the rider's mass hardly enters a combination across a compliant
ankle over a 1 ms substep. **Falsified** if the per-run median reads above 40 kg in more than half the runs.

**P1b.** So **the model's `boardMass: 2.54` will be within a factor of 6 of the game's own effective sway mass, not
29.7× out**, and the brief's §4 is refuted in its size. **Falsified** if the ratio exceeds 10 at the median.

**P1c, written opposed to P1a on purpose.** If the ankle is stiff enough over the substep that the rider's mass is
carried (the opposite of 3.3m's reading), the effective sway mass reads **above 40 kg** and the brief is right. One
of P1a and P1c must fail.

### P2 — the other three inertias

**P2a.** The effective **yaw** inertia `1 / (n̂ · Δω)` will be within a factor of **0.5 to 2** of the model's
`boardYawInertia + riderYawInertia` (0.55 + 1.24–1.44 ≈ 1.8–2.0 kg·m²), because `coupleYaw` puts the rider's yaw
inertia into the board's own rows **before** the copy [R, `BoardBody.ts:1513`], so it is in `A` on the diagonal
*and* the model has it on the diagonal too. **Falsified** outside 0.5–2×.

**P2b.** The **cross** compliance the model writes as `deckHeight · push` (0.031 m) is a tiny lever, while the
game's own coupling between a side impulse and the board's roll goes through `arm` and `carried`, whose across
component is the whole leg. So **the game's own roll-per-side-impulse will be at least 5× the model's**.
**Falsified** if it is within 2×.

**P2c.** The effective **roll** inertia will reproduce 3.3m's 0.59–1.13 kg·m² on these same arms, because it is the
same unit read on the same LU. **Falsified** if it disagrees with 3.3m's published span by more than 10 %. (This is
a reproduction control, not a finding.)

### P3 — the derived plant, which is the build

**P3a.** A plant whose four lateral inertias come from the game's own `A⁻¹` instead of from hand-built numbers will
**cut the roll row's residual ratio by at least a third** on the unsteered deck arm (median of per-run medians
10.050 → below 6.7). **Falsified** if it is not better in a majority of the 24 runs.

**P3b.** It will **not** take either row under 1 at the median in a majority of runs on any arm. Reason: 3.3o
measured that the water's own derivatives are 7–22× out *as a group* and the pendulum's own single term already
over-answers the whole lean row, and an inertia correction cannot touch either. **Falsified** if either row's
per-run median goes under 1 in more than half of any arm's runs — in which case the model is right and the fall is
the headline, which is the cleanest outcome this round could have.

**P3c.** The sign agreement on the board's roll acceleration will rise from 0.190–0.462 to **above 0.5 and below
0.9**. **Falsified** outside that band.

**P3d, written opposed to P3a.** Because the slip channel feeds both rows with opposite signs (R3), correcting the
sway mass alone may *trade* the rows as every repair in 3.3o did, and a correction of all four inertias may do the
same. **If P3a holds and the lean row gets worse in a majority, P3d is the reading and P3a's "improvement" is one
row.**

### P4 — the ride, if a switch is shipped

**P4a.** The owner's bar will **not** be met: Compress will still fall 6 of 6 on the owner's low-speed cell with the
switch on. **Falsified** by a single Compress ride reaching nine seconds. (Twenty-four consecutive rounds say this;
I am predicting it to make the opposite outcome reportable, not because it is interesting.)

**P4b.** The shipped rider with the switch **off** will be byte-identical to step 3.3l's and 3.3n's published
baselines on all eight columns, 0 mismatches. **Falsified** by one mismatch.

### P0 — the controls

**P0a.** The new unit reads are read-only: the ride with them on and off is identical on all eight baseline columns
and on `tickRows`, `liveRows` and `clampedRows`. **Falsified** by one difference.

**P0b.** The ledger's own `closure` and `residual` stay 0.00e+0 with the new reads in, because they are
back-substitutions through a finished factorisation and touch neither `parts` nor `total`.

**P0c, a positive control predicted before it runs.** A unit side impulse on a plant whose ankle is **rigid** (the
counterfactual with `A[7][7]` raised by a factor of 10⁶, so the body cannot move across) must read an effective
sway mass near the **sum** of the masses, 75.54 kg plus the water's. If it does not, the unit read is not measuring
what I say it measures. **Falsified** if the rigid-ankle read is below 50 kg.
