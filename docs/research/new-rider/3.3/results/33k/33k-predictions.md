# Step 3.3k — every prediction, as written BEFORE its read

Written on branch `claude/rider-new-33k`, cut from `main` at `6b94c922` (step 3.3j's merge). Nothing below was edited
after the arm it names was run; where one failed, the failure is kept here and reported in the round's §7.

## The switch's own control (ran first, in `ankleLedger.test.ts`)

- **P0a** With `ankleRange: 'load'` the booked bound is `0.25 × legLoad / (m g)` in **every** step, to nine decimals,
  because the live support is exactly ±0.13 m and the two 0.13 m cancel. **At one body weight it is the shipped
  0.25 rad identically**, which is what makes this an A/B on a bound and not a second rider.
- **P0b** With `'wide'` it is exactly 0.5 rad in every step; with the switch off, exactly 0.25.
- **P0c** The doubled bound moves the trajectory (the board's orientation after 60 frames differs). Which **way** is a
  measurement and not a test.

## The A/B, as step 3.3j specified it (its §10 item 4, quoted)

- **P1** *"If it is the binding limit, widening it moves the flat fall and leaves the capsize alone; if it moves
  neither, it is innocent and I will publish that."* The regimes are step 3.3j's own: **A flat** (|roll| < 10° at the
  fall), **B partial** (10–60°), **C capsize** (≥ 60°).
- **P2** `'load'` will be **narrower than shipped in most frames, not wider**, because the fall happens on a face at
  low speed where the load through the legs is at or under one body weight. If so it is a *tightening* of the same
  bound and `'wide'` is the only widening in the round — and the two arms then bracket the bound rather than both
  pushing one way.

## Standing still (the stick never touched), which is the round's own question

- **P3** The ankle's **spring angle** `θ − φ − δ` is small — of order `τ/K`, which is 2.4° at 33 N·m on
  K = 800 N·m/rad — so **the deck's roll is the body's bank less the commanded rest, to within a few degrees**, and
  the split's own residual is under 1°. Falsification: a spring angle of the deck's own order (tens of degrees), which
  would mean the water and not the ankle sets where the deck sits.
- **P4** If the deck's roll is the body's bank carried through the ankle, then **the body's bank passes 10° before the
  deck's roll does**, in most runs. Falsification: the deck gets there first, which makes the water the mover and the
  body the passenger.
- **P5** The commanded rest is **at its bound** at the fall in most unsteered runs too, as it was in 62 of 72 of step
  3.3j's gentle ladder — the unsteered arm is the one step 3.3j never measured this on.

## The seatbelt predictions

- **P6** With no switch set, `fall.ts` reproduces step 3.3g's and 3.3i's published **world** arm and step 3.3i's
  **deck** grid **to the digit**, as it did in step 3.3j, since the probe's only source change is a window that is
  only reached when the stick is inside its deadband.
- **P7** `vitest` on the four suites returns step 3.3j's own counts, with the two new tests added.
