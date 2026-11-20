# Step 3.4i — the ten predictions, scored against the file committed at `36105b1a`

**Three upheld, five refuted, two half.** Every refutation is of a mechanism, and two of them are of my own
reasoning rather than of a size.

| # | the prediction, in one line | verdict | what the arms said |
|---|---|---|---|
| **P1** | the moment partition and the `diagonal + coupling` identity close below 1×10⁻⁶ N·m | **UPHELD** | **`0.0e+0` exactly**, both, as maxima over 9 016 frames of 84 rides on four arms |
| **P2** | the single-body budget is out by **≥ 10 ×** `\|mTotal\|` at the median, on every arm | **HALF** | out by **1.24 / 3.32 / 1.24 / 2.55 ×** — the direction holds, the size does not. My licence for the 10 × was **one frame of one smoke run**, which reads 33 × |
| **P3** | `\|mDiag\|` and `\|mCoup\|` each ≥ 5 × `\|mTotal\|`, opposed in ≥ 90 % of frames | **REFUTED** | on `f73-g` they are **0.76 ×** and **1.38 ×** and the opposed share is **71.5 %**. The cancellation is a property of the owner's **low-speed** cell (8–9 ×, 93–96 %), not of the budget |
| **P4** | the ankle's moment is the largest entry on the body's row, gravity second | **REFUTED, REVERSED** | **gravity is 1.4–25 × the ankle**, on every arm and stance: 3.7–196.8 against 0.2–26.9 N·m |
| **P5** | the board's roll row nearly cancels: `\|bdTotal\|` ≤ 0.25 × its largest entry | **REFUTED** | **0.87 / 2.24 / 0.72 / 1.01 ×**. Step 3.3h's static +33.47/−33.40/net +0.04 does not reproduce on a ride |
| **P6** | `bdAnkle` is 0 in 100 % of frames (a read, kept as a control) | **UPHELD** | **0.00 on every arm**, as `coupleStanding`'s row-7-only booking requires |
| **P7** | ≥ 0.5 of the shipped glide arm's runs are past the clamp at the fall — *and I named `f73-g`* | **HALF** | `f73-g` is **6 of 24 = 0.25**, so refuted on the arm I named; `s16-g`, which is the arm step 3.4h's "21 of 24" came from, is **21 of 24 = 0.875**. **I named the wrong face in my own prediction** |
| **P8** | re-read unclamped, the mix moves toward "sudden" and "other" halves | **REFUTED** | the mix is **identical on all eight arms, run for run**. The classifier's threshold is 45° and the clamp is 70°: a truncation above a threshold cannot carry a reading across it, which is arithmetic I could have done before predicting |
| **P9** | at least one arm's median ride time moves > 5 % with the clamp lifted; 100 % still fall | **HALF** | **no arm median moved — four ratios of 1.000** — so refuted as stated; **84 of 84 still fall**, so the second half holds. Two Compress cells moved: 1.483 → 1.583 and 1.167 → 1.200 s |
| **P10** | the clamp-off arms are identical to the shipped ones until the first clamped frame | **UPHELD** | identical in **19 columns on 84 of 84 runs**, **no mismatch at any frame of any run** |

## The three premises my brief handed me, scored separately

- **(a) "the board's roll inertia is 0.5–1.1 kg·m² against the body's 52–54, so the ankle keeps only 0.25–0.40".**
  **DEAD, and dead twice.** Step 3.3m already refuted it on `main` (a diagonal read as an effective inertia), and
  this round reproduces 3.3m independently: `bodyHeld` 31.3–37.3 against `1/ankleOwn` **1.15–2.02**, a ratio of
  **27 ×**, and the inertia ratio **0.958–6.166** — on two arms the board is the **harder** end.
- **(b) "the ankle already carries the whole 33 N·m".** **WRONG about the body's roll.** It carries **0.2–26.9 N·m**
  against gravity's **3.7–196.8**. The 33.47 N·m is 3.3h's **static** balance on the **board**, which P5 refutes
  dynamically.
- **(c) "a flat board already makes 221–840 N sideways".** A **force**, and the round supplied the lever rather than
  assuming one: the hull's roll moment is **5.4–33.0 N·m**, which at one body weight is a centre of lift that has
  travelled **0.0075–0.046 m** of a **0.232 m** half-beam.

## The one thing the round would have got wrong without a read

I suspected the roll ledger booked the planing pressure on the **water's** surface normal, which would have made §5's
stiffness collapse a second instance of step 3.3m's `cos³` generalized-arm defect. **It does not.** `patchForce`
returns the pressure along the **hull's** own normal and the ledger books it on `r × n̂`, with the added-mass entries
on `r × û` where they belong [R, `hullForces.ts:406`, `BoardBody.ts:1544–1556`, `:1621–1623`]. **A seventeenth frame
error avoided by reading two lines instead of writing a finding.**
