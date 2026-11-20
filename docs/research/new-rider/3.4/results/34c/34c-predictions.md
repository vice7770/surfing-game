# Step 3.4c — every prediction as written BEFORE its read, each with its own falsification

Written on branch `claude/rider-two-body-c`, cut from `main` at `bac85c61`, before the probe was extended and before
any arm ran. The brief is 3.4b §7 item 1: *"the gains move the board's row. Measure the roll row per source against
the game at a FIXED trajectory — one recorded ride, several sets of gains."*

## The four reads made before anything ran (R1–R4) are in the README's §1.

## P1 — the control, and it is an identity rather than a measurement

At a FIXED trajectory — the recorded states `x` and the recorded commands `u` — the model's roll row
`(Φ[1]·x + Γ[1]·u − φ̇)/h` is **identical across the four cost arms**, because `DesignWeights.feetReach`,
`captureScale` and `captureOmega` enter `design` only through the LQR gain `k`, and the roll row reads only `Φ` and
`Γ`. **Predicted: peak difference exactly 0** over every live tick of every run.

*Falsified if any difference is non-zero.* If it is non-zero, either the cost reaches the plant (which 3.4b's C2
denies at one schedule point) or my own extension has a leak.

## P2 — the command reconstruction, and the blend

Rebuilding the sent command as `ref.u − b̂ − K (x̂ − ref.x)` with the ankle clamp, using the design at the
controller's own **exact** point rather than its eight-point blend, reproduces `sent` to within the blend's own error
and **not** to machine precision. 3.3p measured the blend's error on the roll row at 0.001–0.056 relative.
**Predicted: the reconstruction's median relative gap on the ankle command sits in 0.001–0.3, and its peak is above
1e-6.**

*Falsified if it is exact to 1e-12 (the blend would not be a blend) or if the median gap is above 0.5 (the
reconstruction would be wrong rather than blended).*

## P3 — the loop's own ceiling on the roll row

The command's own share of the model's roll row, `|Γ[1]·u| / |row|`, is **under 0.2 at the median**; and the swing
another gain set's command makes at the same state, `|Γ[1]·(u' − u)| / |the game's own row|`, is **under 0.5 at the
median**. So at a fixed state the loop cannot own an error of ten times.

*Falsified if either median exceeds 1.*

## P4 — which source owns the ten times

The matched per-source gap on the roll row is **largest on the WATER** — `|mWaterAll − (gWater + gBoard)|` — and it
carries **at least half** the net error, because 3.3p measured the model's own water roll moment at 2.28× the game's
with no inertia in between, and the row's conditioning at 6–7× in both.

*Falsified if a rider source (ankle, twist, the remainder) carries more than the water does, or if the water carries
under half.*

## P5 — the shift–share of 3.4b's own gain effect

3.4b's roll row moved 10.050 → 2.622 with the plant byte-identical. Decomposed over state bins into a composition
term (which states the arm visits) and a within-bin term (the same state, a different command), **the composition
term carries more than half** of the move.

*Falsified if the within-bin term carries more than half.* This is a consequence of P3 but is measured on the arms
rather than inferred from P3.

## P6 — the owner's bar

**Not met in any arm.** Every ride of every arm ends before nine seconds and Compress falls in every cell.

*Falsified by one ride that reaches nine seconds.*

## P7 — the one-second window

On the common window nobody falls in (`SECONDS=1`), the per-source ownership of P4 is **the same** — the water still
carries the largest gap — because the window is a subset of the same trajectories rather than a different plant.

*Falsified if the ownership changes source between the nine-second arm and the one-second window.*
