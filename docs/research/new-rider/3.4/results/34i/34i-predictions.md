# Step 3.4i — the ten predictions, written and committed BEFORE any arm was read

Committed on `claude/rider-clamp-34i`, cut from `main` at `2b5574ce`. The instrument is built, type-checked and
smoke-run on **one** ride (one frame of which is quoted in P1 below as the licence for that prediction and for
nothing else); **no arm of Part A or Part B has been generated or read** at the time of this commit.

My brief's own three premises, named before they are tested, because two of them look wrong on the reads:

- **(a) "the board's roll inertia is 0.5–1.1 kg·m² against the body's 52–54, so the ankle keeps only 0.25–0.40 of
  its authority (3.3l)".** Step **3.3m is merged on `main`** and refutes the second half of that sentence: 52–54 is
  `A[7][7]·L²`, **a diagonal**, and the body's *effective* roll inertia read off the same matrix is **1.00–2.52
  kg·m²**, so the inertia ratio is **0.273–0.955**, not 46–109× [R, 3.3 README Part 36 §2]. I will re-measure both
  ends rather than quote either.
- **(b) "the ankle already carries the whole 33 N·m".** 3.3h's 33.47 N·m is a **static roll balance on the board**;
  3.3m measured the ankle **delivering** 5.43–36.62 N·m at the median and peaking at 40.14–90.36 [R]. Those are two
  different quantities and the budget will print both.
- **(c) "a flat board already makes 221–840 N sideways (3.2u)".** A **force**, not an inertia and not a stiffness.
  It cannot enter a roll budget without a lever, and the budget will supply the lever rather than assume one.

## The predictions

**P1. The moment partition closes to machine zero.** `mSplit` (Σ sources − the whole row) and `mResid`
(`mDiag + mCoup − mTotal`) are **< 1×10⁻⁶ N·m** at their maxima over every frame of every arm. *(Licence: the one
smoke frame read 0 and 0 exactly. If a real arm breaks this, nothing else in Part B may be quoted.)*

**P2. The single-body roll budget does NOT close, and it is out by more than an order of magnitude.**
`|bodyHeld × ownAcc − mTotal|` is **≥ 10 × |mTotal|** at the per-run median on **every** arm and every stance.

**P3. The missing term is the stance point's own acceleration, and it is the budget's largest term.** `|mDiag|` and
`|mCoup|` are each **≥ 5 × |mTotal|** at the median, and they **oppose each other in sign in ≥ 90 %** of frames.

**P4. The ankle's own moment is the largest entry in the body's row, and gravity's is second**, on every arm, at
the median of |N·m|.

**P5. The board's roll row nearly cancels.** `|bdTotal|` is **≤ 0.25 ×** the largest single entry of that row at
the median, on every arm — the hull's roll spring against the rider's own share through the arm, which is step
3.3h's +33.47/−33.40 read dynamically instead of statically.

**P6 (a read, kept as a control). The ankle books exactly 0 on the board's roll row in every frame.** `bdAnkle`
is `0` in 100 % of frames, because `coupleStanding` writes the ankle's torque into row 7 alone and the board's
reaction is carried by the kinematics [R, 3.3m §3's counterfactual].

**P7. The clamp is biting at the fall on most runs of the shipped arm.** The share of runs with
`|bankRaw| > 70°` at the fall is **≥ 0.5** on the shipped glide arm (`f73-g`), which is 3.4h's "70.00 exactly in
21 of 24" seen from the other side.

**P8. Re-read on `bankRaw`, the fall mix moves TOWARD "sudden" and the "other" population shrinks by at least
half** on the gentle face. I.e. the slow topple 3.4h could not name is mostly a clamped reading of a body that is
in fact past 45°. *(The one I am least sure of, and the one the round exists to answer.)*

**P9. Lifting the clamp changes the falls, and does not stop them.** At least one arm's median ride time moves by
**> 5 %** between `bankClamp` shipped and `off`, and **100 % still fall on every arm**.

**P10. The clamp-off arms are bit-identical to the shipped ones until the first clamped frame.** On every run whose
shipped trace has a clamped frame, every column before that frame matches to the printed precision; on every run
with no clamped frame at all, the whole trace matches.

## What I will take as the round's answer either way

If **P2 fails** — if the single-body budget closes — then the fall is a body that is genuinely being tipped by the
moments on it, and Part C's answer is "the budget closes and the fall is therefore gravity beating the ankle",
which is a bigger result than naming a missing term. If **P2 holds**, the residual's size and sign is the result,
and Part C must argue from it and not from plausibility.
