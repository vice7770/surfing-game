# Step 3.4b — every prediction as written before its read

Written before any probe of this round ran, on branch `claude/rider-two-body-b` cut from `99854a51` (3.4a's merge).
Each has its own falsification. The reads R1–R4 were made before anything ran and are marked [R].

## The reads made first

- **R1 [R].** `DEFAULT_WEIGHTS` (`predictiveBalance.ts:813–865`) lists `stateScale`, `commandScale`, `rho`,
  `processNoise`, `senseNoise`, `bias`, `heaveSense`. **Neither `feetReach` nor `captureScale` is a key.** Both uses
  in `design` are behind `if (w.feetReach)` and `if (capture)`.
- **R2 [R].** 3.2's own README says so twice: *"`captureScale` is absent from `DEFAULT_WEIGHTS`; 3.2j built it and did
  not keep it"* (§ at line 3394) and *"`feetReach` is an available weight, absent from `DEFAULT_WEIGHTS`"* (3492),
  with its merge table row *"`feetReach` is absent from `DEFAULT_WEIGHTS` and every use of it is behind
  `if (w.feetReach)`"* (3605).
- **R3 [R].** `DesignWeights.feetReach`'s own doc comment says *"It also sets the capture point's own cost
  (`captureScale`) to the same metres unless that is given separately"* (`:702`). `design` reads
  `const capture = w.captureScale` with **no fallback to `feetReach`** (`:965`), and the comment eight lines above it
  says the opposite — *"`feetReach` sets the bank's ranking and nothing else"*. One of the two comments is wrong about
  the code.
- **R4 [R].** The values 3.2 measured and did not keep: `feetReach = 0.13` m (the feet's half-width the rest of the
  rider already uses) and `captureScale = 0.013` m (3.2j's margin peak in all three stances). This round uses those
  two numbers and tunes neither.

## The predictions

- **P1. Neither of the brief's two constants is in the shipped cost function.** A design built from
  `DEFAULT_WEIGHTS` is byte-identical when `captureRow` is replaced by a row of nonsense and when the `feetReach`
  bank-limit line is changed, at every one of the 306 schedule points. **Falsified** if any entry of `K`, `L` or `Φ`
  moves at any point, or if any default path sets either weight.
- **P2. The `feetReach` bank limit is kinematic and carries no inertia at all.** For a rigid body whose centre of
  mass is `h` over the feet the centre of mass's horizontal excursion is `h sin θ` whatever its own `J` is, so
  `feetReach / L` is the same limit for a point mass and for a body. **Falsified** if a derivation from the
  assembly's own `lateralMass`, or a measurement, shows the static lean at which the capture point leaves the feet
  depends on `J`.
- **P3. `ω₀ = √(g/L)` is already inconsistent with the SHIPPED plant, by more than it is with the two-body plant.**
  The shipped plant's own solved lean divergence — the body's own weight put through the plant's own lateral
  compliance, `√(C₁₁ m g h)` — will be at least **3×** `√(g/L)`. **Falsified** if it is within 1.5× of it.
- **P4. The two-body plant's solved lean divergence is slower than the shipped plant's by about √7 ≈ 2.6×**
  (3.4a §6 reading 3: the bank coordinate meets 0.964 → 6.874 kg·m²). **Falsified** outside 1.5–4×.
- **P5. The two-body plant's own fixed-feet divergence is 8–10 % slower than `√(g/L)`**, because
  `ω₀ = √(g/h) / √(1 + J/(m h²))` and the sourced share is 0.1685–0.2099. **Falsified** outside 5–15 %.
- **P6. The owner's bar is not met by any arm of this round.** Compress falls 6 of 6 on the owner's low-speed cell in
  every arm. **Falsified** by any arm with Compress 5 of 6 or better.
- **P7. With the two weights turned ON, making the constants plant-consistent moves the ride by less than a factor
  two** at the median of any arm, against the same weights with the point-mass constants. **Falsified** outside
  0.5–2.0×.
- **P8. Turning the two weights on at all is worse than leaving them off**, on the owner's low-speed cell, on both
  plants — because that is what 3.2j and 3.2n measured in the game (the crouch's and Compress's saved shove collapsed)
  and this round changes nothing about why. **Falsified** if any weighted arm's low-speed median is longer than its
  unweighted twin's.

## P9, written after the forty arms were read and before the control that tests it

The forty arms say the roll row's relative error falls from 10.050 to 2.622 (shipped plant) and 9.087 to 2.259
(two-body) and its sign crosses 0.5 in **10 of 10** plant × cell combinations, with the **plant byte-identical** —
only the gains moved. But the weighted arms also ride **three to four times longer**, so their scoring window is a
different stretch of a different trajectory, which is exactly the trap 3.4a §9 reading 3 names.

- **P9. On a window every arm survives — `SECONDS=1`, so the window is 0.2–1.0 s for all eight — the roll row's
  improvement is less than half of what it is at nine seconds.** That is, `(roll_off / roll_point)` at 1 s is under
  half of the 3.83× (shipped) and 4.02× (two-body) it is at 9 s. **Falsified** if the ratio keeps more than half of
  its nine-second size, which would say the gain is in the gains and not in the trajectory.
