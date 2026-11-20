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

---

# The second block: the brief's premise is refuted, and these are the predictions for the arms that test what replaces it

**Written after P1–P10's own instrument first ran and before the face sweep's arms ran, and before any `l-*.mount`
column of this round or of step 3.4e had been read.** The refutations below are measured, so they are stated here as
facts and not as predictions; what follows them is pre-registered.

**The brief's premise — *"it is the shape of a cancellation"* — is false, and my own P1 and P2 are refuted with
it.** On one 99-tick smoke run of the glide (`tall`, `extra 0`, the two-body plant) the two feedback terms come out
`K·Δx̂ = −0.1756` and `K·Δx_ref = +0.1547` rad — **opposite signs**, so their contributions to the command
(`−K·Δx̂` and `+K·Δx_ref`) have the **same** sign and **ADD**. In the roll row's own units the prediction half's
reach is **−651 °/s²**, the reference half's **−1 045**, and `both`'s is their sum, **−1 696 °/s²** —
`cancelShare = 1.62`. **It is not a cancellation; it is a reinforcement of about one and six tenths.** P1 predicted
the same sign for the two terms and P2 predicted a cancellation under a half; both are refuted, and P3 (the
reference's term the larger, 8.82° against 4.96° of roll) is upheld.

**And P7 and P8 are refuted off step 3.4e's own kept dumps.** `gm |rollCmd|` over the glide's mount window is
**41.5 / 327.1 / 681.3 / 734.4 °/s²** on off / predict / ref / both — `both` is the **loudest**, not the quietest.
`gm |roll − tilt|` over every tick is **7.18 / 5.72 / 6.67 / 10.17°** — `both`'s heel is the **largest**, not the
smallest.

**The replacement, which the predictions below test.** Each half alone commands a correction that brings the board
back toward level and it oscillates and survives; the two halves' reaches **add**, so `both` commands about 1.6
times as much, the board goes **through** level and over onto the other rail, and the ride ends. The quantity both
reaches are proportional to is the **face's own tilt**, so the face is the parameter the mechanism lives on.

**P11 — the reinforcement is proportional to the tilt, so the face decides whether `both` over-corrects.** On a
shallower face (`FACE=1.4,8,5.7`, every other thing equal) `both`'s glide median will be **at or above `ref`'s on
that same face**, where on the 16° face it is 0.19 × `ref`'s. *Falsified* if `both` is still below `ref`.

**P12 — and on a steeper face the single halves join it.** On `FACE=1.4,24,5.7`, `ref` alone's glide median will be
**below `off`'s on that same face**, where on the 16° face it is 2.54 × `off`'s. *Falsified* if `ref` is at or above
`off` there.

**P13 — the reach scales with the tilt.** The gm of `|rowTiltBoth|` over the mount will scale with the gm `|tilt|`
across the three faces to within ±25 % of proportionality. *Falsified* outside that.

**P14 — and the two terms' disagreement is the plant's, not the face's.** `tiltSameSign` will be **0 in more than
0.95 of ticks** on every arm of every face. *Falsified* by any arm above 0.05.

**P15 — the owner's own cell, unread, will show the same thing, and there the reference half alone already
over-corrects.** On the low cell at frame 1, `|sent0|` will sit **exactly on the ankle's own bound in 18 of 18 runs
on both `ref` and `tilt`** (it does on the glide, where `sent0 = +0.25000` to five decimals on both). *Falsified* by
any run off the bound.

**P16 — and the term table will still not contain any of it.** P5 and P6 stand as written: the brief's named
instrument will separate the arms by where their rides went and not by which half they ran, and the **phantom** at
the mount will agree across the four glide arms within 5 %.

---

# The third block: the ankle's own bound, and the one switch that separates the two explanations

**Written before any `ARANGE` arm ran, and after the second block's arms.** The measured facts it stands on are
stated as facts: the ankle's own bound is **`ANKLE_REST_RANGE = 0.25 rad = 14.32°` at every one of 42 458 ticks of
eighteen arms**, and at frame 1 the loop's raw ankle command is **0.000000 / 0.086–0.194 / 0.271–0.350 /
0.357–0.544 rad** on the glide's four arms (24 runs each) and **0.000000 / 0.083–0.222 / 0.271–0.357 /
0.353–0.579** on the owner's own cell (18 runs each) — so `ref` asks **1.08–1.43 ×** the bound and `both` asks
**1.41–2.32 ×** it, and `both` is **on the bound in 24 of 24 and 18 of 18 runs at frame 1** and in **0.462 and
0.783** of the mount's first twelve frames.

**So there are two explanations of `both`'s collapse and they are different.** (i) *The correction is too big* — the
two halves add, so `both` over-corrects whatever the ankle can deliver. (ii) *The correction does not fit through
the ankle* — the loop asks for twice the range the feet have, the clamp decides the command for the mount's first
frames, and a clamped loop is a rail and not a loop. **`?ankleRange=wide` separates them in one character**: step
3.3k built it, it doubles the bound to **±0.5 rad = ±28.65°** (`ANKLE_RANGE_WIDE = 2`, *"and no geometry pays for
it"* [R]), which is just above `both`'s own ask — **and it has never been ridden with `WHEEL` on.**

**P17 — the discriminator.** On the glide with the bound doubled, `g-tilt-wide`'s median will be **at or above
`g-ref`'s 3.683 s** if the collapse is the clamp, and will stay **below both halves' own medians (4.033 and 3.683)**
if the collapse is the over-correction itself. I am predicting **the clamp**: `g-tilt-wide` ≥ 3.683 s. *Falsified*
if it comes in under 3.683 s — in which case explanation (i) stands and the clamp is a passenger.

**P18 — and the bound will stop binding.** The share of the mount's first twelve frames on the bound will fall from
**0.462 to under 0.10** on `g-tilt-wide` and from **0.783 to under 0.25** on `l-tilt-wide`. *Falsified* above
those.

**P19 — the switch's own null, which is a control by construction.** On `g-off` the bound is never reached (on the
bound in **0 of 288** of the mount's ticks), so `g-off-wide` will be **identical to `g-off` over the mount's 288
ticks**, and its whole-ride median will move by at most one run of 24. *Falsified* by any difference at the mount.

**P20 — the reinforcement itself will not move, because it is upstream of the clamp.** `cancelShare` and
`tiltSameSign` on the `-wide` arms will be **1.56–1.70 and 0.000**, the same as every other arm: the decomposition
is of `raw`, before the clamp. *Falsified* outside that range.
