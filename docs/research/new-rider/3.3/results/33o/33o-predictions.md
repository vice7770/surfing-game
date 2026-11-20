# Step 3.3o — every prediction, written before its read

Written on `claude/rider-new-33o`, cut from `main` at **15e34a41** (step 3.3n's merge), **before `plant.ts` was run
once**. Each prediction carries its own falsification. The brief is Part 37's own closing recommendation: *measure
how wrong the balance's internal plant is, per part, with populations and datums.* No fix is built.

The four candidates Part 37 named: **the water's captive derivatives** (`PLANT_SPEEDS`, `twistRows`), **the
point-mass body**, **the free-versus-held table**, **the rail schedule** (`SCHEDULE_RAIL_CAP`, `RAIL_BITE`).

## R — the reads made before anything ran (and they are already answers)

- **R1.** The rail the schedule is read at is **not the board's rail**. `AttachedRider.predictiveBank` computes
  `rail = atan(tan(min(MAX_BANK, |leanAsked|)) / railPull(speed, rail))` over two passes and then
  `rail = min(this.railCap, rail)` with `railCap = SCHEDULE_RAIL_CAP = 12°`
  [R, `AttachedRider.ts:3448–3452`, `:628`, `:2313`]. It is a function of the **lean asked for**, not of the measured
  roll. **With the stick untouched `leanAsked = 0`, so the schedule's rail is identically 0.**
- **R2.** `railCorrection` and `frozenCorrection` share one body (`correctionIn`) whose first line is
  `if (deg <= 0) return zero` [R, `predictiveBalance.ts:316`], and `DEFAULT_WEIGHTS.heaveSense` is `false`
  [R, `:781`], so `plantAt`'s `sink` is never set. **On any arm where the stick is untouched the free and the held
  tables are the same table — `PLANT_SPEEDS` — and the free-versus-held candidate cannot be the wrong part there.**
  It is inert in the shipped default, by reading, before a ride.
- **R3.** `labAt`, `boardInertiaAt` and `PredictiveController.blend` all **clamp the speed to the table's own ends**,
  and the lowest end is **4 m/s** [R, `:596–604`, `:574–582`, `:1125`]. The owner's own bar cell is **1–6 m/s**.

## P0 — the controls

- **P0a (the state reconstruction is a read, not a model).** Nine of the ten states are the controller's own sense
  line read backwards: `θ = s₀`, `θ̇ = s₁`, `ω_u = s₂`, `θ_t = s₃`, `r = s₂ − s₄`, `φ = s₀ − s₅`, `φ̇ = s₁ − s₆`
  [R, `AttachedRider.ts:3429–3436`, `senseMatrix`], and `δ = −ankleRest`, `τ_a = −twistBody.active`. **Predicted:
  `C x_recon − sense` is exactly 0 on all seven rows, every tick, every run.** Falsified by any non-zero.
- **P0b (the ledger's own axis is the model's own axis).** `bankLedger.deckTotal` is `ω̇ · rollAxis` and
  `ownTotal = θ̈_body`, both rad/s² about `AttachedRider.rollAxis`, + toward the board's +x, and the model's
  `φ = −roll`, `θ = −bank` by P0a's signs. **Predicted: `−deckTotal` against the finite difference of the model's own
  `φ̇` over the step agrees to within a few per cent at the median** — not exactly, because the ledger's mean is over
  the frame's substeps and `rollAxis` itself yaws within the frame. Falsified if the two have different signs or
  differ by more than a factor of two at the median.
- **P0c (the ledger closes).** `split`, `closure` and `residual` ~0 on every step. Falsified by any growth.
- **P0d (the rider is unchanged).** Every ride arm's `fell`, `fellAt`, `rollFall`, `bankFall`, `railFall`, `frames`
  against step 3.3l's and 3.3n's published rows, column by column. Falsified by one mismatch.
- **P0e (the three model groups sum to the model's own row).** The roll row split into water, rider-through-the-feet
  and board-own must reproduce `A[1] · x` to floating point, and the bank row's three must reproduce `A[3] · x`.
  Falsified by a relative residual above 1e-12.
- **P0f (a positive control predicted before it runs).** Over the first six ticks the filter has not run, so
  `x̂ = Φ^N · 0 + Σ Φ^{N−1−j} Γ u ≈ 0` — but **`x_recon` is the game's own state and has no such property.** So the
  one-step residual over ticks 1–6 must be **as large as the state's own motion**, not small: the model is being fed
  the real state from the first tick. Predicted: the residual's ratio to the component's own change is **not** smaller
  over ticks 1–6 than over the rest of the run. (If it were, something in the instrument is reading `x̂` and not the
  game.)

## P1 — the headline: the one-step residual of the controller's own blended model

`resid = Φ x_k + Γ u_k − x_{k+1}`, with Φ and Γ the controller's **own blended** matrices at tick k and u_k its own
`sent`. This is the model's own arithmetic against the game's own next state; nothing is modelled on either side.

- **P1a.** The residual on the board's roll rate `φ̇` **exceeds that component's own one-step change in a majority of
  ticks** — i.e. the model gets the sign-and-size of the board's roll acceleration wrong more often than right.
  Falsified if the ratio's median is below 1 on the unsteered deck arm.
- **P1b.** The residual is **relatively smaller on the body's bank rate `θ̇` than on `φ̇`**, in a majority of the 24
  unsteered runs. *Reason:* 3.3m and 3.3l closed the body's own end (the ankle's authority, the body/board ratio, the
  stance's reach) and found it right; the board's roll is where the water's twelve derivatives land. Falsified if
  `θ̇`'s ratio is the larger.
- **P1c, written opposed to P1b on purpose.** The residual on `θ̇` is **also** above 1 at the median, so *both* rows
  are wrong and the point-mass body is not exonerated. Exactly one of P1b and P1c can be the headline.

## P2 — per part, against the ledger

- **P2a (the water).** The model's own water term in the roll row,
  `(heelRoll φ + slipRoll β + yawRoll r + rollDamping φ̇) / I₀`, against the ledger's summed water sources' `deck`
  column (buoyancy, pressure, suction, friction, fins, rails, addedMass, froth): **they differ by more than 100 % of
  the game's own at the median in a majority of the 24 runs.** Falsified by agreement inside ±50 %.
- **P2b (the rider through the feet).** The model's `(τ_ankle + deckHeight · push) / I₀` against the ledger's
  rider sources' `deck` column: **agreement inside a factor of two at the median**, because 3.3m measured the
  ankle's own authority right to a median 0.0004–0.0027 of the booked ratio. Falsified outside it.
- **P2c (the term the model does not have).** The ledger's `carry` — *"the board having moved under the feet since the
  body's velocity was last set … the term with no name in any force diagram"* [R, `bankLedger.ts`] — has **no
  counterpart anywhere in `twistRows`**. Predicted: its own `deck` and `own` entries are **not negligible**: at least
  a tenth of the respective total at the median in a majority of runs. Falsified if it is under a hundredth.
- **P2d (the gyro).** `twistRows` has no `−ω × Iω`. Predicted: the ledger's `gyro` `deck` entry is **smaller than
  `carry`'s** at the median. Falsified the other way.

## P3 — the rail schedule

- **P3a.** `schedRail` is **0.000000° on every tick of every unsteered and every low-speed run**, while the measured
  `|rail|` at the fall reaches **past 20°** in a majority of them. Falsified by one non-zero `schedRail` on an
  unsteered run.
- **P3b.** The model's own roll-righting coefficient `heelRoll` **changes sign** between rail 0 and the measured rail
  somewhere in the ride, in a majority of the 24 unsteered runs. *Reason:* `RAIL_PLANT` at 7 m/s reads K per roll
  −283, −121, −45, +40, +54, +70 over 0–40° [R]. Falsified if it keeps its sign throughout in most runs.
- **P3c, the decisive one.** Evaluating the roll row with the rail-corrected derivatives at the **measured** rail gets
  **closer** to the game's own measured roll acceleration than rail 0 does, in a majority of live ticks on the
  unsteered deck arm. **If this is falsified the rail schedule is NOT the wrong part**, whatever P3a and P3b say, and
  I will report it that way.

## P4 — the speed clamp

- **P4a.** On the owner's own low-speed cell the design's speed is clamped at the table's 4 m/s floor in **1.000 of
  the live ticks of every run whose entry is 1, 2 or 3 m/s** (9 of 18 runs). Falsified by any run of those nine with
  a tick under the floor that is not clamped.
- **P4b.** The one-step residual on `φ̇` is **larger** on the owner's low-speed cell than on the unsteered arm, at the
  median of the per-run medians. Falsified the other way.

## What this round will not do

Build anything. **No source file is touched**, no switch is added, no constant moved. A measured diagnosis with
nothing built is a complete round.
