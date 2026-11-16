# Step 3.3l — every prediction, written before its read

Written on `claude/rider-new-33l`, cut from `main` at `c3e87e2a`, **before `bank.ts` was run once**. Each prediction
names the quantity, the population it is about and what would falsify it. The round's report quotes these verbatim and
says which held.

## The reasoning the predictions come from, stated so it can be wrong

The body is a point mass of 75 kg on a leg of about 0.9 m, so its inertia about the stance point in roll is
`m L²` ≈ **61 kg·m²**. Step 3.3j's read (a) measured the **board's** own roll inertia in the solve, added mass and all,
at **0.498–1.140 kg·m²**. The two differ by a factor of about **60**, and every prediction below is a consequence of
that ratio.

- Gravity on a leaning body is destabilising: with the leg at θ from the vertical, the weight's component across the
  leg is `m g sin θ`, so the lean's own acceleration from it is about `g sin θ / L` = **10.9 sin θ rad/s²** (0.19
  rad/s² at 1°, 1.9 at 10°).
- The ankle's spring is `K (θ − φ − δ)` with K = 800 N·m/rad. On the **body** that is `800/61` = **13.1 rad/s² per rad**
  of joint angle, which is larger than gravity's 10.9 — so at the joint the ankle wins. But the spring acts on
  **θ − φ**, not θ: it cannot see a lean the deck has followed, which is step 3.3k's `φ ≈ θ − δ`.
- An internal joint cannot change the pair's angular momentum. So the ankle's torque, booked on its own, must move the
  **board** about 60 times as much as it moves the body, and the body's own absolute lean should barely answer it.

## The predictions

**P0 (the controls, and the round is void without them).** The three closure tests in `bankLedger` all come back at
machine precision on every substep of every run:

- `split` (`max |Σ parts − b|`, N·s and N·m·s) **≤ 1e-9**;
- `closure` (`max |Σ_source A⁻¹ part − A⁻¹ b|` on rows 3, 4, 5 and 7, m/s and rad/s) **≤ 1e-9**;
- `residual` (this file's own `A⁻¹ b` against the game's `solveLinear`, same rows) **≤ 1e-9**.

And `apart` = **0** substeps on the unsteered arm (the standing 8×8/9×9 decides every substep), `singular` = 0.
**Falsified if any of the three exceeds 1e-6**, in which case no attribution below is reported as one.

**P0b (the rider is unchanged).** `bank.ts` with the ledger **off** reproduces step 3.3k's published unsteered arm to
the digit — 24 of 24 falling at **1.10–2.07 s** on the deck filter and **0.77–1.95 s** on the world one — and with the
ledger **on** reproduces the same times to the digit, because the ledger is a pure observer. **Falsified by one run
differing by one frame.**

**P1 (the ankle is not the brake it looks like).** Booked on its own, the ankle's entry is **large in `relative` and
large and opposite in `deck`**, and its **`own` entry is small**: `|own(ankle)|` under **0.25 ×** `|relative(ankle)|`
at the median frame of the live ride. The ankle rolls the deck under the body instead of righting the body.
**Falsified if `own(ankle)` is the largest driving entry** — in which case the ankle is the lean's source and the
inertia ratio above is the wrong model.

**P2 (gravity on the rider is what sustains the lean).** Over the last 0.5 s before the fall, `gravity` is the largest
**driving** entry of `own` (signed by the lean's own side) in the majority of runs, and its size is within a factor
**2** of `g sin θ / L` at the bank measured in the same window. **Falsified if gravity is not the largest driving
entry in at least half the runs**, or if it is restoring.

**P3 (what starts it is not what sustains it).** In the first measured window after the mount transient
(0.2 < t ≤ 0.4 s) the largest `|own|` entry is **`carry`** — the momentum the constraint must supply, i.e. the board
having moved under the feet since the body's velocity was last set — and after 1.0 s it is **`gravity`**. **Falsified
if the same entry is the largest in both windows.**

**P4 (the two halves swap over).** In the first window the **`relative`** half of `ownTotal` is the larger of the two
in absolute value at the median run; in the last 0.2 s before the fall the **`deck`** half is. This is step 3.3k's
clock (the bank leads the roll by a median +0.100 s) seen in the accelerations rather than in the angles.
**Falsified if the same half is the larger in both windows.**

**P5 (the small print).** The board's own `weight` and `gyro` entries are each under **5 %** of the largest entry's
size in the median frame. **Falsified at 10 %.**

**P6 (the owner's own low-speed cell).** Built for their words — *"the lower speed of getting positioning in a
wave"* — at entry speeds of **1, 2, 3, 4, 5 and 6 m/s** through the water, three stances, the stick never touched:
**he still falls in 18 of 18 on the deck filter and 18 of 18 on the world one**, and Compress falls in 6 of 6 on each.
**Falsified by one run that does not fall in nine seconds** — which would be the first cell in twenty rounds where the
owner's bar is met anywhere, and would be the round's headline.

**P7 (the low-speed cell is not a gentler cell).** The fall comes **sooner**, not later, at the low speeds than at the
4.99–10.00 m/s of step 3.3k's arm: the median fall time at 1–3 m/s is **under** 1.10 s (3.3k's own minimum).
**Falsified if the median is later**, which would say speed protects him and would matter to the owner.

**P8 (the second control, and it is the weak one).** The ledger's own `ownTotal`, integrated over the live ride,
reproduces the body's measured absolute lean rate (the bank angle differenced frame to frame) to within **20 %** of
the measured rate's own span, on the frames where the bank is inside MAX_BANK's 70° clamp. **This is
discretisation-limited and is reported as a cross-check, never as a closure**: the ledger's entries are substep means
and the angle is read once a frame, which is exactly the gap step 3.3k measured as its own instrument (−2.573 to
+0.748° of residual at 85–264 °/s). Falsified at 50 %.

## P9, written after P0–P8's reads and **before its own**, because the attribution asks for it

P0–P8's reads produced one number none of them predicted: **the body's bank is 8.69–8.71° at the first frame in 24 of
24 runs, with the joint at −0.18 to −0.14° and the rail at −0.4 to +0.9°.** The board is placed square to the water's
surface and the body is mounted square to the deck, so on a 16° face taken 45° off the fall line both the deck's roll
and the body's bank start at the face's own across tilt, **from the world vertical, with nothing having moved**. And
`gravity`'s entry — the one source with a consistent sign in 24 of 24 — is the inverted pendulum's own `g sin θ / L`,
which is **zero at θ = 0**.

So the attribution makes a falsifiable claim about a cell nobody has run: **take the across tilt away and the drive
goes away with it.**

**P9 (the counterfactual).** The same water, the same stance set, the same stick never touched, but the board placed
**straight down the fall line** (`SIDE=0`), so the face's slope is all pitch and its across tilt is **under 1°**:

- **P9a** The body's bank and the deck's roll at the first frame are both **under 1°**, and `gravity`'s entry in the
  mount window is **under 15 °/s²** — against 91.2–100.0 at 45° off. Falsified if either exceeds that.
- **P9b** The fall comes **later** than the 45° arm's 1.10–2.07 s in the **majority** of the 24 runs.
- **P9c** And the honest half, which I expect to fail my own hopes: **he still falls in 24 of 24**, because the
  pendulum is unstable about θ = 0 and any disturbance grows. Falsified by one run standing for nine seconds — which
  would be the first cell in twenty rounds where the owner's bar is met, and would be this round's headline.

If P9a and P9c both hold, the reading is that **the across tilt is not the cause but the starting value**, and the
cause is the pendulum itself. If P9c fails, the reading is that the probe's own placement has been half the fall for
nine rounds and every number on this track is about a cell that starts 8.7° over.
