# Step 3.4e — the ten predictions, written before any arm of this round ran

Committed before the first arm. Each has its own falsification. Written on branch `claude/rider-two-body-e`, cut from
`main` at `95829b02` (step 3.4d).

## The one read that came before the predictions, and is declared as a read

**R0.** Before writing these, one run of `WHEEL=tilt` (`BODY=two`, the glide, `tall`, `extra 0`, 3 s) was taken to read
`refPhi` off the `MOUNT` dump, because the brief's whole first item turns on whether that value moves. **It does:
`refPhi = −9.1052°` at frame 1 where the face's tilt under the board is `8.8107°` and the model's sign is `φ = −roll`,
against the `|φ_ref|` of **exactly 0.0000°** step 3.4d read at every one of 18 182 frames with the flag off.** So
`?waterHeel=tilt` already is the datum in both places at once, and the brief's *"both together has never been
measured"* is in doubt before the round starts. This is one run of one cell and it is **not** a mechanism, a median or
a population; it is the read that chose the round's direction, and §2 measures it over arms.

## The predictions

**P1 — the brief's premise is false, and the falls will say so.** `WHEEL=tilt` on the two-body glide (24 runs) will
have a median ride **under 1.0 s**, against the 1.450 s step 3.4d measured for the same arm with the datum off — i.e.
the same direction as 3.3p's own ridden `?waterHeel=tilt` (median 0.283 s on the shipped point-mass plant).
*Falsified* if the median is 1.0 s or more.

**P2 — the 2×2's missing cell is not innocent, and it is the reference's half that carries the collapse.**
`WHEEL=ref` (the reference alone, this round's new value) will have a glide median **below** the shipped arm's
1.450 s, and in log terms it will be **nearer `tilt`'s median than `predict`'s**. *Falsified* if `ref` is at or above
the shipped median, or if `|ln(ref) − ln(predict)| < |ln(ref) − ln(tilt)|`.

**P3 — the correction will cut the mount's own row, and not to under one.** The gm relative error of the model's own
roll row over the mount's first 0.2 s, **unfiltered, from frame 1**, will be **between 1 and 20** on each of
`predict`, `ref` and `tilt` on the two-body glide, against the **32.429** step 3.4d measured there with the datum off.
*Falsified* by any of the three landing at or under 1, or at or above 20.

**P4 — and it will not be better everywhere, because the row is a near-cancellation.** On at least one of the two
cells, at least one age bin **after 1.5 s** will be **worse** on `tilt` than on the shipped datum. *Falsified* if every
bin after 1.5 s on both cells is better on `tilt`.

**P5 — the `live` filter hides the size of the move, on every arm.** The gm relative error over `t ≤ 0.2 s`
unfiltered against the folder's own `live` window on the same arm will differ by **more than a factor of three** on
every datum arm of both cells. *Falsified* by any arm under three.

**P6 — `mountAgree=deck` removes the four-metre-a-second step exactly.** On the owner's own low cell the body's bank
at frame 1 for entries 1, 2 and 3 m/s will move from the **−0.036 / −0.037 / −0.038°** of step 3.4d to within
**0.5°** of the **8.70–8.72°** the 4, 5 and 6 m/s entries start at, in **9 of 9** runs. *Falsified* by any of the nine
staying under 4°.

**P7 — `mountAgree=felt` puts the felt vertical on the face at frame 1, in both of its numbers.** On the glide,
`feltAcross` at frame 1 goes from **−7.545°** to **|feltAcross| < 1.5°** in 24 of 24 runs (the board's own heel
against the water there is 0.059°), and `feltMag` from **9.534** to **9.69 ± 0.10 m/s²**, which is `g cos 8.81°`.
*Falsified* by either number missing its bound in any run.

**P8 — no arm meets the owner's bar.** Compress falls in **every** run of **every** arm of this round. *Falsified* by
one Compress run reaching nine seconds.

**P9 — `mountAgree=deck` buys the owner's own three slowest entries more than half again.** The median ride of the
nine 1–3 m/s runs rises by at least **50 %** from the **0.517–0.867 s** step 3.4d measured. *Falsified* if the rise is
under 50 %.

**P10 — the combination is not the sum.** The all-on arm (`WHEEL=tilt` with `MOUNTA=both`) will **not** have a longer
glide median than every one of the five arms that make it up. *Falsified* if it beats all of them.
