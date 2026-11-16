# Step 3.4f — the predictions, written before any number of this round

Committed before the first arm and before any analysis of step 3.4e's kept dumps. Written on branch
`claude/rider-two-body-f`, cut from `main` at `3fd8668c` (step 3.4e). Each prediction has its own falsification.

The brief is step 3.4e's own step-six item 1: *"The interaction, not another datum. Two halves that each help and
together hurt is the round's one new fact and it is the shape of a cancellation. The instrument exists — Part 4 §5's
own term table, run on the four datum arms instead of the shipped one. A measurement, one round."*

The fact to explain, glide medians over 24 runs an arm on the two-body plant: the datum **off 1.450 s**, the
**prediction alone 4.033**, the **reference alone 3.683**, **both 0.683**.

## The reads that came before the predictions, and are declared as reads

**R0 [R]. The command's own line, and the two places the tilt reaches it.** `PredictiveController.tick` ends
`u_q = ref.u_q − b̂_q − Σ_j K_q[j] (x̂_j − x_ref,j)` [R, `predictiveBalance.ts:1453–1459`]. The datum's two halves
enter it in two different places:

- the **prediction** half adds `Δx̂_i = Σ_{jj<N} predD[jj][i][0] · τ` to the estimate and nothing else
  [R, `:1438`], where `τ` is the face's tilt in the model's sign (`faceTilt = −(roll − rail)` rad
  [R, `AttachedRider.ts:3536`]);
- the **reference** half hands `drive_i = gammaD[i][0] · τ` to `steadyTurn` on the equilibrium's right-hand side
  [R, `:1442`, `:1261`], which moves both `x_ref` and `u_ref`.

**R1 [R]. So, at a fixed state and a fixed operating point, the command is EXACTLY additive in the two halves, and
the two halves enter the feedback bracket with opposite signs.** `steadyTurn` is a least-squares solve of a linear
system whose right-hand side the drive enters additively, and `x[2]`, `x[6]` are written after the solve [R,
`:1255–1274`], so `Δx_ref` and `Δu_ref` are the drive's own response alone, independent of `bankAsked` and
`twistAsked`. Writing `u_off` for the shipped command at that point:

| the flag | the command at that point |
|---|---|
| off | `u_off` |
| `predict` | `u_off − K·Δx̂` |
| `ref` | `u_off + Δu_ref + K·Δx_ref` |
| `both` | `u_off + Δu_ref + K·Δx_ref − K·Δx̂` |

**`both = predict + ref − off` identically, and the tilt's whole reach into `both`'s feedback is the DIFFERENCE
`K·(Δx_ref − Δx̂)`, where each half alone gets one of the two terms undifferenced.** Both terms are the same input
`τ` through the same plant over two horizons — `Δx̂` over the 0.1 s sensing delay, `Δx_ref` to the equilibrium — so
if they share a sign they subtract. **This is read off one line; it is not a measurement, and it says nothing about
how big either term is or what the closed loop then does.** Every prediction below is about the sizes.

**R2 [R]. The instrument can be built at the exact operating point from one design object.** `design` builds `gammaD`
and `predD` whenever `w.waterHeel` is set, and the comment that ships says Φ, Γ, the LQR gain and the filter are
untouched by the flag [R, `:996–1103`, `:793`]. So `design(y, t, {...w, waterHeel: 'both'})` gives `phi`, `gamma`,
`k`, `steps`, `gammaD` and `predD` for all four arms from one function at one point — and whether the flag really
leaves `phi`, `gamma` and `k` alone is **C2** below rather than a trusted comment.

**R3 [R]. The term table's own columns already exist on all sixteen of step 3.4e's kept arms.** The per-tick dumps
carry `eWater`, `eAnkle`, `eRest`, `gWaterBoard`, `gAnkleSrc`, `gRestSrc`, `rollAccFull`, `rollAccTilt`,
`rollAccGame`, `rollAccTwo`, `mWaterAllTwo`, `mAnkleTwo`, `mRestTwo` — Part 4 §5's whole table — so the brief's named
instrument needs no new ride at all. **No number was read off them before these predictions were written.**

## The predictions

**P1 — the two tilt terms share a sign, so they subtract in `both`.** Over the glide's mount window (`t ≤ 0.2 s`,
unfiltered, 264 ticks) the ankle channel's `K·Δx̂` and `K·Δx_ref` will have the **same sign in more than 0.90 of
ticks**. *Falsified* at or below 0.90.

**P2 — and the cancellation is large.** The gm of `|K·(Δx_ref − Δx̂)|` will be **under half** the gm of
`max(|K·Δx̂|, |K·Δx_ref|)` on the glide's mount, ankle channel. *Falsified* at or above a half.

**P3 — the reference's term is the bigger of the two, because it is the same input taken to its equilibrium.** The gm
ratio `|Δφ_ref| / |Δφ̂|` in the roll state will be **above 1** on the glide's mount. *Falsified* at or below 1.

**P4 — the positive control, and it is the two cells' different ordering.** The glide puts `predict` above `ref`
(4.033 against 3.683) and the owner's own cell puts `ref` far below `predict` (0.483 against 0.967). If the
cancellation is the mechanism, the two cells must weight the two terms differently at their own operating points.
**Predicted: the gm ratio `|K·Δx_ref| / |K·Δx̂|` (ankle channel, the mount) is LARGER on the owner's own low cell
than on the glide**, by at least 20 %. *Falsified* if it is smaller, or within 20 %. **This is the one prediction
that can tell the mechanism from a coincidence, and it is written before the arms.**

**P5 — the term table will NOT contain the interaction, and the phantom is the read that says so.** At the mount,
unfiltered, the gm `|phantom|` (`rollAccFull − rollAccTilt`) will agree across all four datum arms of the glide
**within 5 %**, because the phantom is `heelColumn · tilt` on a face the four arms meet identically until the loop
first sends anything at 0.117 s. *Falsified* by any pair differing by more than 5 %.

**P6 — and the model's own water term will not separate the arms either.** At the mount, unfiltered, the gm model
water term (`eWater + gWaterBoard`) will be **within a factor of two** across the four glide arms. *Falsified* by
any pair outside a factor of two.

**P7 — what DOES separate the arms is the command, and `both` is the quiet one.** Over 0.2–0.6 s on the glide, gm
`|rollCmd|` (the command's own reach into the roll row, °/s²) will be **lower on `both` than on both `predict` and
`ref`**. *Falsified* if `both` is at or above either.

**P8 — the board ends up flush on `both`.** The gm of the board's own heel against the water (`|roll − tilt|`) over
every tick of the ride will be **lowest on `both`** of the four glide arms. *Falsified* if any arm is lower.

**P9 — the ride lengths will not be a population of four, and I will say so.** Within each glide arm separately (24
runs), the Spearman correlation between a run's gm `|rollCmd|` over its first 0.5 s and its own fall time will be
**positive on at least three of the four arms**. *Falsified* if two or more arms are negative or zero. **Whatever it
comes out as, four arm medians are four points and I will not report them as a correlation.**

**P10 — the mount's own rows will be worse on the corrected arms in °/s², again.** The gm model absolute error at the
mount (unfiltered, `|rollAccFull − rollAccGame|`) will be **within a factor of two of the shipped arm's or worse** on
all three corrected glide arms — step 3.4e's own §4 reading 2 re-read on the term table's own numerator.
*Falsified* if any corrected arm's error is under half the shipped arm's.

## The controls, each predicted before it runs

**C1.** The shipped-datum arm of this round is **byte-identical** to step 3.4e's own `g-off` and `l-off` over every
shared column of the per-run summary, this round's own new columns excluded **by name**. Predicted: 0 differing.

**C2.** `design(y, t, w)` and `design(y, t, {...w, waterHeel: 'both'})` have `phi`, `gamma` and `k` equal to the
**last bit** at every operating point of every tick. Predicted: peak difference exactly 0. (The shipped comment says
so; this is the measurement of it.)

**C3.** With the tilt handed in as **zero**, all four flags' rebuilt commands are **identical**. Predicted: exactly
0 difference, because `Δx̂` and `drive` are both linear in `τ`.

**C4.** The additivity of R1, measured rather than read: `|u_both − (u_predict + u_ref − u_off)|` over `|u_off|`,
pre-clamp, at every tick of every arm. Predicted: under `1e-9`.

**C5, the zero-inertia cost control and the folder's own closures** on every arm of this round, as step 3.4e ran
them.

**C6.** `src/` does not change in this round at all, which is a stronger read than any hash of the Canyon's state:
if no byte of the game moves, no ride of the game can.
