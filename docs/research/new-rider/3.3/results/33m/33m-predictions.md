# Step 3.3m — every prediction as written, before its read

Written on `claude/rider-new-33m`, cut from `main` at **698a25d1** (step 3.3l's merge). Each line below was written
**before** the probe it names ran once, and each carries its own falsification. Where a prediction is a reading of
code I had already done, it says so.

The round's question, in step 3.3l's own words (Part 35 §12 item 4): *"Measure whether the board's roll resistance is
right (0.5–1.1 kg·m² in the solve) … and if the board's roll resistance is right then the two-body rider is the only
route left."*

## The reads this round adds

`src/physics/bankLedger.ts` gains nine read-only rows filled inside its existing `solve`, from the **same LU** the
attribution uses, by back-substituting three **unit** right-hand sides. They contain no force: they are `A⁻¹` itself.

## P0 — the controls

- **P0a, linearity.** The three unit solves are three right-hand sides through one `A⁻¹`, so
  `pairOwn = ankleOwn − (rollRelativePer + rollDeckPer)` identically. **Predicted: closes at machine precision
  (under 1e-12 relative).** Falsification: any larger gap means the back-substitution is not reading one
  factorisation.
- **P0b, the rider unchanged.** The ledger is still a pure observer: `bankLedger.test.ts`'s bit-identical assertion
  passes, and `bank.ts` with the ledger **off** reproduces step 3.3l's published arms to the digit.
- **P0c, the three closures.** `split`, `closure` and `residual` keep step 3.3l's values (1.110e-15, 5.329e-15,
  exactly 0), because nothing above them changed.

## P1 — the body's own end of the ratio, derived before it is read

Reduce the plant to the two coordinates that matter: the board's roll `φ` about `rollAxis`, inertia `I₀` (board,
water and foils), and the body's across coordinate `u`, a **relative** coordinate (`coupleStanding`'s own
`velocity = v + ω × carried + up ṡ + across u̇`). Carrying a point mass `m` at arm `L` gives

```
M = [[ I₀ + m L² ,  m L ],
     [    m L    ,   m  ]]        det = m I₀
```

so a unit torque booked in the `u` row alone (`b[7] = 1/L`) gives

```
Δφ̇ = −L / I₀        Δu̇ = (I₀ + m L²) / (m I₀)
relative = Δu̇ / L    own = relative + Δφ̇ = 1 / (m L²)
|own / relative| = I₀ / (I₀ + m L²)
```

**P1a: `1 / ankleOwn` = the body's own roll inertia about the stance point and nothing else, so it must agree with
`bodyHeld` (`A[7][7] · L²`) to within 5 %.** Falsification: a gap means the body's absolute response to its own
ankle is not `m L²`, and the derivation above is wrong about which coordinate `u` is.

**P1b: `1 / rollDeckPer` — the roll inertia the integrator actually divides a roll moment by — is 20–60 kg·m², not
0.5–1.1**, because `coupleStanding` adds `m((a·b) δ_ij − b_i a_j)` to the very same element, and on `rollAxis` that is
`m |a||b| ≈ m L² ≈ 54`. **Falsification: if it reads 0.5–1.1, the rider's coupling is not reaching the board's roll
row** — which would itself be the bug, and step 3.3l's ratio would stand.

**P1c: step 3.3j's 0.498–1.140 kg·m² is a read of `BoardBody.system`, the board's rows BEFORE `coupleStanding` runs**,
and this round reproduces it on the lean's own axis as the **board-alone** inertia `I₀`. That is a correct number
mis-used as a denominator, not a wrong number. [R, read before the probe ran: `BoardBody.ts:1519–1525` copies rows
0–5 into `system8`/`system9` and `coupleStanding` writes the rider into **that** copy.]

## P2 — the ankle's authority, and the ratio it implies

**P2a: `|ankleOwn / ankleRelative|`, read off `A` alone with the torque divided out, reproduces step 3.3l's booked
ankle ratio on the same runs — median 0.25–0.40 — to within 0.02.** The booked ratio is the compliance ratio times a
torque that cancels, so they must agree. Falsification: they differ, and one of the two readings has a bug.

**P2b: the inertia ratio the measured authority implies, `I₀ / (m L²) = a / (1 − a)` with `a` the authority, is
0.33–0.67 — so the board's effective roll resistance against the ankle is of the SAME ORDER as the body's, and step
3.3l's "the board is 46–109 times easier to roll" is refuted by its own measurement.** With `I₀` = 0.5–1.1 against
`m L²` = 52–54 the authority would have to be **0.009–0.021**, which is 15–40× below what step 3.3l measured.
Falsification: the authority reads 0.01–0.02 here, and step 3.3l's 0.25–0.40 was the thing that was wrong.

**P2c: whichever way P2a and P2b fall, the ankle keeps a minority of its authority, and that minority is a property
of `A` and not of any limit.** An internal torque at a joint can never give the body more than `I₀/(I₀ + I_body)` of
itself. Falsification: the authority reads above 0.5 anywhere near trim.

**P2d: the paired counterfactual (`pair…`, the same torque with `−r̂` also on rows 3–5) gives a DIFFERENT and larger
authority than the code's booking, and the code's booking is the right one**, because `u` is a relative coordinate
and the reaction is already carried by the kinematics; booking the couple as well double-counts it. [I, from the
code's own `velocity` line.] Falsification: the two agree, in which case the question of which is right is moot.

## P3 — the board's roll resistance against the SOURCED order

The advisor's roll-inertia consult (merged `5481822d`) sourced the **added** roll inertia of a planing surfboard at
**0.2–0.5 kg·m²**, halved again to 0.1–0.25 if the rising rail fully ventilates, and noted that our own constants
assemble 0.61–1.17 at trim.

**P3a: the board-alone inertia near trim is 1.5–4× the sourced total (0.2–0.5 added + 0.0262 dry = 0.23–0.53), so the
board's roll resistance is NOT short at trim — if anything it is generous**, because `ADDED_MASS_PER_AREA = π/8`
takes the surface-piercing halving but nothing takes the ventilation halving, and the mass is spread over the whole
wetted width. Falsification: it reads at or below 0.53.

**P3b: the hull's own roll damping reproduces step 3.3j's 9.4–16.2 N·m·s/rad, bracketing ITTC's sourced 12.7**, so
the rate-limited side of the advisor's ruling is unchanged. Falsification: a different band.

## P4 — the cos³ decay: correct, or the frame error the advisor suspected?

Read in the code before the probe ran [R]: `BoardBody.ts:1352–1382` points the water's inertia along the **water's
own surface normal û** (`sample.normalX…`), with its magnitude scaled by `projection = |n̂·û|`, and assembles the
generalized direction `[û, r × û]`. With `r` across the beam in the hull's plane and the deck rolled `φ` from the
surface, `(r × û)·x̂ = y cos φ` and `projection = cos φ`, so the roll–roll element carries **`y² cos³φ`** — the
advisor's own arithmetic, now located at a line number.

**P4a: the plate-normal reconstruction `Σ (m_a / |n̂·û|) ((r × n̂)·x̂)²`, taken off the same stored arrays on the same
substeps, exceeds the shipped `Σ m_a ((r × û)·x̂)²` by a factor near `1 / cos³(rail)`: within 5 % of 1.0 near trim and
5–12× past 60° of rail.** Falsification: the ratio does not track `cos⁻³` of the measured rail.

**P4b: so the shipped form's loss of ~90 % of the board's roll inertia past 60° is a frame artefact and not a
physical loss.** A plate's added-mass reaction acts along its **own** normal, and the plate's added mass per length
is set by its **own** wetted beam, not by the beam's projection on the free surface; the velocity's direction into
the surface is already carried separately by `intoSurface`, so `projection` on the mass is a second cosine for the
same geometry. Falsification: a source that gives a planing plate's `A₄₄` falling as `cos³` of its roll to the free
surface. **I will say plainly that nobody has measured `A₄₄` for this case** (the advisor's own §2), so this is an
argument from the plate's mechanics and a double-count, and not a measurement of the truth.

**P4c: and fixing it would not save the ride**, because at trim the two forms agree to a few per cent and trim is
where the fall starts (step 3.3l: the rail does not pass 2° until 0.217–0.983 s, and the lean is already running).
Falsification: the near-trim ratio is far from 1.

## P5 — the owner's bar

**P5a: the owner's own low-speed cell (absolute entries 1–6 m/s × three stances, stick never touched) falls 18 of 18
on the deck filter and 18 of 18 on the world one, and Compress 6 of 6 on each** — step 3.3l's result, reproduced
here because the bar is the headline and a headline is not inherited. Falsification: any run that stands for the
full nine seconds.

**P5b: the bar is not met.**

## P6 — what the round is for

**P6: if P3a and P2b both hold, then the board's roll resistance is right (generous, even) AND the ankle's authority
is a property of an internal torque between two comparable inertias, so no value of the board's roll inertia can
raise it above `I₀/(I₀ + m L²)` — and the route left is a second thing for the body to push against, i.e. the
two-body rider.** Falsification: the authority reads 0.01–0.02 and is dominated by a board inertia far below the
sourced order, in which case raising the board's roll inertia is a live tuning fix and step 3.3l's recommendation (a)
is the right one after all.
