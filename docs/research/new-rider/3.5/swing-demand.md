# Step 3.5k — the lateral demand, decomposed: ⛔ the premise is wrong, and the allocation build is already refuted

**The question this round was given**, verbatim: *"WHY does a delivered, settled lateral weight shift of 1.12
sole-widths make the exit worse?"* — with the gate attached to it: *"the obvious next build is a control-allocation
change so the hip is asked with the steer instead of after the ankle saturates. But if a lateral weight shift is
harmful, that build is pointless. Answer this first."*

⛔ **MEASUREMENT ONLY.** `git diff -- src/` on this branch is **empty**: no constant, force, switch, pose or getter. The
probe reads private fields through one accessor that only gets, exactly as `take-off/four-numbers.ts` and `stand.ts`
already do, and the one half of the decomposition that is not already a column — the engine's own `local.x` — is
`board.toLocal(rider.position).x`, which the probe computed on its own side all along for `comH`.

> ## ⛔⛔ THE HEADLINE: THERE WAS NO DELIVERED LATERAL WEIGHT SHIFT, AND THE 0.5 s IS NOT IN THE TURN
>
> **1. The 1.12 sole-widths is a different quantity.** `−0.14625 m` is `localCenter.x − base.x`, the **posture's own
> internal lateral offset**. The **body's centre of mass across the board** — `board.toLocal(position).x`, which is
> `project`'s own `local.x`, the one the sole's moment and `across` are built from — is **`+0.00540 m` on the same
> frames: 0.04× the 0.130 m sole half-width.** On that very cell the **shipped** arm's settled figure is
> **−0.12944 m, 1.00× the sole.** ⭐ **The switch did not add a sole-width of lateral weight; measured on the board,
> it REMOVED one.** The balance's own independent report agrees: `CaptureState.offsetAcross` at the rotor's 68.755°
> stop reads **+0.00946 / +0.00349 / −0.03507 m**.
>
> **2. The arms are identical through the whole turn.** The steer runs +0.300 → **+1.200 s** after the stand. Compared
> frame by frame on **every** emitted column, wave 2 `cueL` first differs anywhere at **t+1.43333 s — 0.233 s after
> the stick centred** — and wave 2 `cueR` at **t+1.51667 s, +0.317 s after.** ⛔ **So neither 0.517 s nor 0.533 s can
> be attributed to the turn. Both are divergences in the post-steer recovery, with the stick at zero.**
>
> **3. The demand is not the centre of mass's. It is the impulse ratio, and the centre of mass is NET PROTECTIVE.**
> Counterfactually on wave 2 `cueL`: hold the CoM term at zero and `across` goes **0.742 → 0.702** (ships) and
> **0.597 → 0.593** (swing), with frames outside the sole rising **13 → 22** and **8 → 19**. Hold the force's lateral
> run at zero instead and `across` goes **0.742 → 0.844** and **0.597 → 0.862**.
>
> **4. And the lean IS paid for.** `d(dLever)/d(comOff)` through the origin is **1.172 / 1.037** (R² 0.43 / 0.38), and
> in the fall test's own shipped decomposition `d(capDemand)/d(capOffset)` is **0.862 / 0.903** (R² 0.53 / 0.54). ⛔ **The
> lead I was handed — that the lateral force does not follow, so the demand walks off the sole — is measurably not
> what happens on this cell.** What happens is the opposite: through the turn the felt vertical earns
> `capDemand` **−0.085 m** of lean while the body holds `capOffset` **+0.016 m**. **He is leaning the wrong way, by
> 0.101 m — 0.78 sole-widths of lean he does not take.**
>
> ⭐⭐ **5. And the allocation build is already built, swept and refuted — on 636 falls, by `HIP_CAPTURE_GAIN`.** The
> brief's reason for discounting that sweep (*"the hip was never ASKED"*) belongs to step **3.2w**, the round before.
> **3.2x asked it.** See §6; it is the part of this report that decides the build, and none of it is mine.

---

## 0. Population, controls and seatbelts

**Canyon B, Medium, seed 2, the owner's own address through the game's own switch parsing, steer only
(`TURN_COMPRESS=0`), `STAND_HOLD=4`, `PERIODS=4`, `ARMS=ships,swing`, `SCRIPTS=cue,cueL,cueR`.** 5 waves triggered,
30 runs, **9 wave×script cells produced a stand** (waves 1, 2 and 5), one run per cell, 454.9 s wall. This is PR
#444's population exactly, re-run so the decomposition sits on the same frames as the claim it tests.

| control | result |
| --- | --- |
| `seaDiffs` | **empty** — the arms ride the same sea; the only config difference is `swing: 'mass'` |
| `bodyBank` on either arm | **absent from both** (printed off the parsed config), so `project`'s `moment` term is 0 and `freeX` is the two-term form throughout |
| the three headrooms against the engine's own `rawMargin` | **2 216 of 2 216 loaded standing frames** across all 18 arm×cell series, n/n on every one |
| PR #444's committed exits | **reproduced on all 9 cells to the digit** (3.900/3.833 · 0.700/0.700 · 0.717/0.717 · out/out · 3.700/**3.183** · 3.133/**2.600** · 0.950/0.967 · 0.767/0.817 · 1.150/1.100) |
| PR #444's committed settled `comX` | **reproduced**: −0.14625 and +0.12597 m |
| `foldA` on the `ships` arm | **0.000 on every standing frame of all 9 cells** |
| the added columns' inertness | an earlier run of the same seed/arms with **22 of these columns absent** agrees **value for value on every shared column over 5 272 shared rows** — zero differences |

**Two bounds on the one approximation, stated because this file has produced six units/frame errors in a day.**
`desiredCop.x` **is** `project`'s `freeX` (written only inside `if (this.loaded)`), and `comH` **is** its `height`;
both are read at the frame boundary while `project` ran on the last of 32 substeps.

* **The frame-boundary-versus-substep error on `local.x`**: the per-frame drift of `comLX` is **0.00025–0.0122 m**, so
  one substep of it is **0.000008–0.00038 m** — sub-millimetre against a 0.130 m sole.
* **The decomposition against the force actually delivered**: on frames with `limit === 'none'` the contact's own
  delivered ratio `cFx/cFy` must equal the demanded `j.x/j.y` identically. Measured `|dRatio − cRatio|` median
  **0.00025–0.00726** per cell.

⚠️ **One correction to PR #444 on its own strongest line.** *"Wave 1 `cueL`/`cueR` being bit-equal across arms"* is
**exit**-equal, not bit-equal: the arms differ on **8 of 156** and **7 of 157** shared emitted frames, first at
**t+0.583** and **t+0.617 s**, by up to **14.6 N** and **27.1 N** of normal contact force (`cFy`) and **14.0 N** and
**6.1 N** of `legLoad`. The exits are identical to the digit and the inertness conclusion stands; the word does not.

**Units, frames and axes, for everything below.** Metres, newtons, degrees, seconds. **Board-local +x is the board's
LEFT rail** (`balanceStep`'s own note) and every lateral quantity is on it unless its name ends in `H`, which is the
**world horizontal across the heading** (`sideV`, `(fwd.z, 0, −fwd.x)`, = board +x when level). `dRatio`, `needRatio`
and the payment slopes are dimensionless. **Every force quoted is DELIVERED** — a ledger of what the water or the
contact did over the step — except where a line says "needs", which is **requested**. `across`, `comLX`, `freeX` and
the whole of §2–§4 are at the frame boundary after the last substep.

---

## 1. The identity, and which half of it carries the demand

`project` (`AttachedRider.ts:5364` on `the-record`, `:5591` on `claude/swing-mass` where step 3.5i's note sits above
it) computes, with no torque term because the address carries no `?bodyBank=hip`:

```
freeX  = local.x − height · (j.x / j.y)
across = 1 − |freeX − midX| / halfWidth            halfWidth = 0.130 m, midX = 0 standing
```

so with `local.x` emitted beside `freeX` the split is an **identity**:

```
across = 1 − |comOff − dLever| / 0.130       comOff = local.x − midX      dLever = height · j.x/j.y
```

### 1.1 ⭐ Through the turn the demand is ~100 % impulse ratio and the centre of mass contributes almost nothing

Wave 2 `cueL`, the `ships` arm (the `swing` arm is identical on these frames — §3), every 0.1 s:

| t+s | `comOff` | `dLever` | `freeX` | `needRatio` | `dRatio` | `across` | load bw | roll° |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 0.300 | +0.0025 | +0.0012 | +0.0013 | +0.004 | +0.002 | 0.990 | 1.271 | +1.27 |
| 0.600 | +0.0219 | −0.0105 | +0.0324 | +0.026 | −0.013 | 0.751 | 0.733 | +4.95 |
| **0.800** | **+0.0290** | **−0.0943** | **+0.1233** | +0.034 | −0.111 | **0.051** | 0.401 | +11.15 |
| 1.000 | +0.0161 | −0.0747 | +0.0908 | +0.022 | −0.101 | 0.302 | 0.872 | +21.70 |
| 1.200 | +0.0054 | −0.0540 | +0.0595 | +0.009 | −0.090 | 0.543 | 1.600 | +35.78 |
| 1.400 | +0.0028 | −0.0314 | +0.0342 | +0.005 | −0.058 | 0.737 | 2.077 | +42.35 |

⭐ **Through the whole steer window the body's centre of mass stays between +0.0025 and +0.0290 m of the stringer —
at most 0.22 of the sole half-width — while the impulse-ratio term reaches 0.094 m.** At the frame the headroom nearly
closes (t+0.800,
`across` 0.051) the two terms are **+0.029 and −0.094**: they have **opposite signs, so they ADD**, and 77 % of the
0.123 m demand is the impulse ratio. **The rider does not lean into his bottom turn at all; the demand is made
entirely by where the contact's line of action points.** That is #437's conclusion — *"the ankle is its one route"* —
measured on the frames rather than read off the chain.

### 1.2 ⭐⭐ Counterfactually, the centre-of-mass term is PROTECTING the headroom, not spending it

Hold one term at zero and recompute `across` on the same frames. Medians, and frames with `across < 0`:

| arm | cell | `across` | frames out | **CoM term zeroed** | frames out | **force's lateral run zeroed** | frames out |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ships | **w2 `cueL`** | **+0.742** | 13/222 | ⛔ **+0.702** | ⛔ **22**/222 | ⭐ **+0.844** | **9**/222 |
| swing | **w2 `cueL`** | **+0.597** | 8/191 | ⛔ **+0.593** | ⛔ **19**/191 | ⭐ **+0.862** | 11/191 |
| ships | w2 `cueR` | +0.538 | 16/184 | +0.591 | 34/184 | +0.817 | 5/184 |
| swing | w2 `cueR` | +0.544 | 19/156 | +0.613 | 25/156 | +0.849 | 0/156 |
| ships | w1 `cueL` | +0.941 | 5/42 | +0.924 | 6/42 | +0.918 | 2/42 |
| ships | w5 `cueR` | −0.040 | 40/69 | −0.750 | 42/69 | +0.254 | 24/69 |

⭐ **Counted over all 18 arm×cells: zeroing the centre-of-mass term puts MORE frames outside the sole on 14, the same
number on 4, and FEWER on none. Zeroing the force's lateral run puts fewer outside on 15, the same on 2 and more on
1.** (By medians it is 10 of 18 for the lateral run; the 8 that go the other way are the near-flat cells — wave 1 at
0.67° of median roll, wave 2 `cue` at 0.03° — where both terms are under 0.005 m and the median `across` is 0.88–0.99,
so the comparison is between two kinds of nothing. **Frames-outside is the statistic with the dynamic range**, and it
is unanimous in sign for the centre-of-mass term.) The lean is not what spends the lateral headroom. On wave 2 `cueL`
it is what keeps 9 frames inside it.

---

## 2. Does the board's lateral water force rise with the lean, and by how much?

**Yes, steeply — and on the axis that pays for a BANK, not for an offset on the deck.**

`BoardBody.forces` are mean forces over the latest step, N, world frame, and always ship. Summed over every water
source (buoyancy, pressure, added mass, radiation, friction, bed, fins, rails, froth, suction) and projected two ways:

| arm | cell | `fwH` med | **peak \|`fwH`\|** | **`fwH`/sin(roll)** | R² | `fwB` med | peak \|`fwB`\| |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ships | **w2 `cueL`** | +41.8 | ⭐ **994.5** | ⭐ **+921.0** | 0.599 | −38.1 | 197.3 |
| swing | w2 `cueL` | +23.6 | **994.5** | **+756.6** | 0.783 | −8.3 | 282.1 |
| ships | w2 `cueR` | +11.0 | **943.0** | **+976.8** | 0.792 | +4.5 | 277.4 |
| swing | w2 `cueR` | −1.9 | **943.0** | **+719.2** | 0.742 | +4.0 | 248.1 |
| ships | w2 `cue` (neutral) | −0.3 | 29.3 | +648.4 | 0.909 | +0.1 | 7.8 |

⭐ **719–977 N per unit sin(roll), R² 0.60–0.79** on the four steered cells that reach real roll. **That independently
reproduces the 2026-11-15 consult-log row's 709 N (557–935 over its seven cells)** on a live steered turn with the
fins and rails in the ledger, which that row did not have. ⚠️ The low-roll cells are degenerate — `sin(roll) ≈ 0` —
and are reported, not used: wave 1 (0.67° median roll) and wave 5 (0.18–2.33°) give 130–410 N at R² 0.03–0.88, and the
wave-2 neutral's tidy 648.4 at R² 0.909 is a fit to a 0.03° median roll and a 29 N force.

⚠️ **The peak-`|fwH|` and peak-roll frames are not always the same frame**; §2.1's last column pairs them properly.
The ships `cueL` peak of **994.5 N** is at **+42.35° of roll and 2.077 bw of load** (t+1.400), and `994.5 / sin(42.35°)
= 1 477 N` against that load's own `2.077 × 73 × 9.81 = 1 487 N` — **99.3 %**, which is the same closure §2.1 makes
over a population.

### 2.1 ⭐ And it balances the rider's own reaction to within 2 % of the normal — so it is the DECK NORMAL, projected

The contact's reaction on the board has a world-horizontal across component of `−(cFy·sin roll + cFx·cos roll)`, and
the board masses 2.54 kg, so a water force that merely balances it reads `fwH = cFy·sin roll + cFx·cos roll`.
Measured on frames with `|roll| ≥ 10°`:

| arm | cell | n | `fwH` med | the reaction, med | ratio | **residual / cFy** | at the peak-roll frame |
| --- | --- | --- | --- | --- | --- | --- | --- |
| ships | w2 `cueL` | 103 | +124.8 | +142.1 | 1.002 | ⭐ **+0.0009** | +91.8 against +107.6 |
| swing | w2 `cueL` | 116 | +46.7 | +46.5 | 1.046 | ⭐ **−0.0019** | **−366.2 against −337.6** |
| ships | w2 `cueR` | 88 | −92.2 | −96.3 | 1.051 | **−0.0240** | **−939.7 against −888.6** |
| swing | w2 `cueR` | 79 | −178.4 | −166.1 | 1.051 | **−0.0182** | +322.7 against +293.9 |

**The water's whole lateral answer to a bank is the rider's own contact reaction, to 0.1–2.4 % of the normal load.**

### 2.2 ⭐⭐ The force that COULD pay for a lateral offset is the in-deck-plane one, and the hull makes 0.8 N of it

A lateral centre-of-mass offset costs no headroom **only** if `j.x/j.y` matches `local.x/height` — i.e. only if there
is force **in the plane of the deck, across it**. A deck-normal force contributes **exactly zero** to `j.x`, which is
why §2.1's closure matters: it says the bank's whole 994 N buys nothing for an offset.

`fwB` is that in-deck-plane across force. By source, board-local +x, N, median over wave 2 `cueL`'s standing frames:

| arm | pressure | buoyancy | added mass | radiation | friction | **fins** | rails | froth | suction | bed |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ships | ⭐ **−0.8** | **−37.7** | −0.1 | −16.7 | −0.1 | **+11.9** | −0.2 | 0.0 | 0.0 | 0.0 |
| swing | ⭐ **−0.2** | −3.8 | +0.6 | −2.9 | −0.1 | +0.7 | −0.2 | 0.0 | 0.0 | 0.0 |

⭐ **A third independent confirmation of the 2026-11-15 diagnosis, on a live steered turn.** The advisor predicted
*"a flat-bottomed board cannot make any [in-plane across force] … `pressure` is identically 0 in `F_s`"* and that
*"only `buoyancy` of the three suspects carries weight"*. Measured: **the planing `pressure` term — the largest force
on the board — contributes 0.2–0.8 N across the plane of its own bottom**, buoyancy carries 3.8–37.7 N, and the
**fins**, which are a real board's answer, carry 0.7–11.9 N.

**The arithmetic that closes it.** Holding the posture's own **0.146 m** at the measured **0.711 m** standing
centre-of-mass height needs `j.x/j.y = 0.205`, i.e. **147 N of in-deck-plane across force at one body weight
(requested)**. The whole in-deck-plane water force on the board has a **median of 4–38 N (delivered)** and peaks of
197–282 N. ⭐ **So the water can pay for roughly a tenth to a quarter of a sole-width-of-lean's bill in the steady
state** — and #437's identity says the rest has to come out of the sole: at 0.711 m and one body weight the whole
support buys `0.130 × 716 / 0.711 ≈ 131 N`.

---

## 3. So where DID the 0.5 s come from? Not from the turn.

Every emitted column compared frame by frame between the arms (`arm` excluded, nothing else):

| cell | shared frames | differ | **first difference at t+** | **after the steer centred (+1.200 s)?** | the columns that first move |
| --- | --- | --- | --- | --- | --- |
| w2 `cue` | 357 | **0** | never | — | **bit-identical** |
| **w2 `cueL`** | 307 | 106 | **1.43333** | ⭐ **YES, +0.233 s** | `foldA`, `legLoad` |
| **w2 `cueR`** | 272 | 66 | **1.51667** | ⭐ **YES, +0.317 s** | `bank`, `bankRaw`, `comX`, `foldA`, `legLoad` |
| w1 `cue` | 344 | 141 | 1.50000 | YES, +0.300 s | `legLoad` |
| w1 `cueL` / `cueR` | 156 / 157 | 8 / 7 | 0.583 / 0.617 | no | `bank`, `bankRaw`, `cFx`, `cFy`, `bGrip` |
| w3, w4 (all 3 scripts) | 47–114 | **0** | never | — | **bit-identical** |
| w5 all three | 164–184 | 31–51 | 0.26667 | no (before the steer) | `bank`, `bankRaw`, `comX`, `dRatio`, `foldA` |

⛔ **On both cells the brief is built on, the switch is provably inert for the whole turn and for a further 0.23–0.32 s
after the stick centres.** `foldA` is **0.00° through t+1.400** on wave 2 `cueL`. **"A delivered lateral weight shift
made the turn worse" is not a thing this experiment measured.** What it measured is a rotor opening in the recovery
and the two rides diverging from there — and diverging hard: by t+2.300 the arms' deck roll is **+5.62°** and
**−3.25°**, and they end at **+54.76°** and **−68.29°**, opposite rails.

⚠️ **And the population cannot carry the direction anyway.** Two cells, one run each, late falls at 2.600–3.700 s
inside a 4 s window, against seven cells that move by ≤ 0.067 s. **I would not publish a 0.5 s direction off that**
([[one-trace-is-not-a-number]]), and the answer above does not need it.

---

## 4. What the mass fold actually did to the body's lean — two instruments, same answer

`frame()` defines `bank.angle = atan2(lean·side, lean.y) − atan2(localCenter.x − base.x, localCenter.y − base.y)`, so
the **posture's** own lateral lean (`postA`) is subtracted out of the signal the controller senses. The probe emits
`postA`, the world lean line it is subtracted from (`leanLine`), the posture offset (`comX`), the centre of mass across
the board (`comLX`) and the balance's own independent `CaptureState.offsetAcross`.

| wave 2 `cueL` | `foldA` | `postA` | `comX` (posture) | ⭐ `comLX` (CoM on the board) | ⭐ `capOffset` (the balance's own) | `across` |
| --- | --- | --- | --- | --- | --- | --- |
| swing, t+2.700 | 34.24° | — | — | +0.1650 | +0.16500 | +0.167 |
| swing, t+2.900 | 66.41° | — | — | −0.0045 | −0.00451 | +0.634 |
| **swing, t+3.000** | **68.755°** (the stop) | — | — | ⭐ **+0.0095** | ⭐ **+0.00946** | +0.554 |
| **swing, t+3.100** | **68.755°** | — | — | ⭐ **+0.0035** | ⭐ **+0.00349** | +0.449 |
| **swing, t+3.167** (last) | **68.755°** | **−11.06° pk** | **−0.14625 settled** | ⭐ **−0.0351** | ⭐ **−0.03507** | +0.230 |
| **ships, t+3.683** (last) | **0.000°** | 0.000° | **0.00000** | ⭐ **−0.1181** | ⭐ **−0.11809** | −0.701 |

⭐ **The two columns are independent reads** — mine is `board.toLocal(rider.position).x`, computed on the probe's side
from the rider's world position and the board's orientation; the engine's is `CaptureState.offsetAcross`, written
inside `HumanBalance.capture` off the balance's own geometry. **Measured, they are identical at the emitted six
decimals on 2 215 of the 2 216 loaded standing frames**; the single exception is one frame of wave 5 `cueL` on the
`ships` arm, differing by 0.0094 m. **So the headline quantity is not one reader's arithmetic.**

⭐ **At the rotor's full 1.2 rad stop — the frames PR #444 calls a settled 1.12-sole-width weight shift — the body's
centre of mass sits 0.0095, 0.0035 and 0.0351 m across the board: 0.07×, 0.03× and 0.27× of the sole half-width.
Two independent instruments give the same numbers to five decimals.** The posture's internal **−0.146 m** does not
arrive as a lean over the rail; the body frame's own roll absorbs it, which is what `frame()`'s subtraction is.

⭐ **And on the same cell the SHIPPED rider's settled centre of mass is −0.12944 m, 1.00× the sole.** Per cell, settled
over the last 0.2 s:

| cell | `comX` ships → swing | **`comLX` ships → swing** | exit ships → swing |
| --- | --- | --- | --- |
| **w2 `cueL`** | 0.00000 → **−0.14625** | ⭐ **−0.12944 → +0.00540** | 3.700 → 3.183 |
| **w2 `cueR`** | 0.00000 → **+0.12597** | ⭐ **+0.10788 → −0.03800** | 3.133 → 2.600 |
| w1 `cue` | 0.00000 → +0.04126 | −0.07796 → −0.11095 | 3.900 → 3.833 |
| w5 `cueL` | +0.00003 → −0.08687 | +0.24065 → +0.18989 | 0.767 → 0.817 |
| w5 `cueR` | 0.00000 → −0.03592 | −0.14220 → −0.18738 | 1.150 → 1.100 |
| w5 `cue` | 0.00000 → +0.01090 | −0.14210 → −0.15607 | 0.950 → 0.967 |

⚠️ **Read with its caveat:** the two arms' last 0.2 s are at different roll states (+25…+55° against −46…−68° on
wave 2 `cueL`), so the cross-arm pair is not a matched-time comparison. §4's frame table is. **But within the pair the
direction is the inverse of the premise: the arm holding 1.00 sole-width of lateral weight is the one that rode
0.5 s LONGER.**

### 4.1 ⭐⭐ And the fall test says the rider is UNDER-leaning, by 0.78 sole-widths, all through the turn

`CaptureState` already carries the same decomposition in the units `human.fallen` uses, and nothing in `src` reads it:
`pointAcross = offsetAcross − height·feltAcross`, where `offsetAcross` is the lean **achieved** and `height·feltAcross`
is, in the file's own words, *"the across offset the body would have to hold for `pointAcross` to be zero: **the
demand**"* — the felt vertical leans to the **inside** of a banked turn, so this is the lean the water has **earned**.

Wave 2 `cueL`, through the steer window (both arms, identical here):

| t+s | `capOffset` (achieved) | `capDemand` (earned) | `capPoint` | `capTilt°` | roll° |
| --- | --- | --- | --- | --- | --- |
| 0.600 | +0.0219 | −0.0081 | +0.0300 | −0.56 | +4.95 |
| 0.800 | +0.0290 | −0.0599 | +0.0889 | −4.06 | +11.15 |
| **0.900** | **+0.0163** | **−0.0851** | ⭐ **+0.1014** | **−6.12** | +15.97 |
| 1.000 | +0.0161 | −0.0748 | +0.0909 | −5.83 | +21.70 |
| 1.200 | +0.0054 | −0.0553 | +0.0607 | −5.33 | +35.78 |

⭐⭐ **The felt vertical tilts 6.1° to the inside and earns 0.0851 m of lean; the body holds 0.0163 m the OTHER way.
The error is 0.1014 m — 0.78 of the sole half-width — and all of it is lean he does not take.** At the rotor's stop in
the swing arm the same gap is **0.0411 → 0.1183 m** with `capDemand` **2.4×, 5.4× and 18.4×** `capOffset` on its three
stop frames.

> ⛔ **So the rider's problem on this turn is not a lateral weight shift he cannot afford. It is a lateral weight
> shift he never makes**, and `?swing=mass` at its 68.755° stop does not make one either.

### 4.2 ⭐ What ends these rides is a VELOCITY, and it is 4–7× the position term

| wave 2 `cueL` | `|capOffset|` pk | `|capDemand|` pk | `|capSpeed|` pk | `1/ω₀` med | **`|speed/ω₀|` pk** | `|capPoint|` pk | `|capAcross|` pk | `weightPast` |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ships | 0.15613 | 0.23073 | **2.0863 m/s** | 0.2791 s | ⭐ **0.78716** | **0.11344** | 0.89980 | **0 of 222** |
| swing | 0.16541 | 0.21689 | **1.7933 m/s** | 0.2660 s | ⭐ **0.47780** | **0.11826** | 0.59606 | **0 of 191** |

⭐ **The static capture point never reaches the feet's edge on either arm — 0.113 and 0.118 m against 0.130 m, and
`weightPast` is false on 222 of 222 and 191 of 191 frames — while the across-SPEED term runs to 0.478 and 0.787 m,
3.7 and 6.1 sole-widths.** `1/ω₀` measures **0.249–0.308 s**, which reproduces step 3.2x's **0.22–0.32 m per m/s**.
And at the swing arm's end `capReach` has collapsed to **0.00000** with `beyond` true.

⚠️ **This sizes the terms; it does not name the trip.** The handoff records that `beyond && weightPast` is both-true on
**0 of 2 123** and **0 of 3 744** frames because the conjunction is reached **inside a substep**, and these rows are
frame-boundary reads, so nothing here identifies which test fired.

---

## 5. The answer to the question as asked

**"Why does a delivered, settled lateral weight shift of 1.12 sole-widths make the exit worse?"**

> ⛔ **It does not, because there was no such shift and the exits that moved were not in the turn.** The 1.12
> sole-widths is the **posture's internal offset**; the body's centre of mass across the board over the same frames is
> **0.03–0.27 sole-widths**, on two independent instruments, and **less** than the shipped rider's **1.00** on the
> same cell. The two cells whose exits moved are **bit-identical to the shipped arm through the whole steer window and
> for 0.23–0.32 s beyond it**, so the 0.517 s and 0.533 s are post-steer trajectory divergence on **n = 1 per cell**,
> against seven sibling cells that move by ≤ 0.067 s.

**And the lead I was asked to test is refuted in its own terms.** The demand does **not** walk off the sole because
the lateral force fails to follow a lean:

* Through the turn the **centre-of-mass term is 0.0007–0.029 m** while the **impulse-ratio term reaches 0.094 m**; at
  the near-closure frame the split is 23 % / 77 %.
* **Zeroing the centre-of-mass term makes `across` worse** on 16 of 18 arm×cells by frames-outside.
* The force **does** follow at **1.037–1.172** of the lean (`project`'s terms) and **0.862–0.903** (the fall test's),
  loosely (R² 0.38–0.54).
* The board's lateral force rises with the bank at **757–977 N per unit sin(roll)** and peaks at **994.5 N**, which
  closes against the rider's own reaction to **0.1–2.4 % of the normal**. ⭐ **But that force is the deck normal
  projected, and contributes exactly zero to `j.x`.** The in-deck-plane across force — the only kind that can hold an
  offset without spending sole — has a **median of 4–38 N** against the **147 N (requested)** a 0.146 m offset at
  0.711 m needs, and the planing **pressure** term contributes **0.2–0.8 N** of it.

**So the structural statement, with its evidence rather than its intuition:** a bank is paid for generously, through
the normal, at no cost in `across`; a lateral **offset on the deck** is not paid for by this hull at all, because a
flat planing section makes no across force in the plane of its own bottom — and in these turns the rider never asks
for one, because he is **under-leaning by 0.78 sole-widths** throughout.

---

## 6. ⛔⛔ The verdict on the allocation build: it is already built, swept and refuted, and the brief's reason for discounting that is wrong on its own source

**None of this section is mine.** It is `3.2/README.md` Parts 22 and 23, and `HIP_CAPTURE_GAIN`'s own note in
`AttachedRider.ts:421–441`.

**1. `HIP_CAPTURE_GAIN` IS the early hip demand.** It drives the swing rotor from `CaptureState.hipPast` — the
capture point past `HIP_SHARE × the feet's half-width`, 0.104 m — instead of from the ankle's command overflow. That
is exactly *"ask the hip with the steer instead of after the ankle saturates"*, in the quantity
`humanBalance.ts`'s own header names. **It is wired, it works as a control, and it was swept.**

**2. It opens early and delivers.** Part 22 §1.1 and §2, 12 runs a cell: *"On the 16° trim cell it fires in every run
of every gain: **35–179 N·m and 0.7–68.8° of swing at 2 000 N·m/m, 112–264 N·m at 8 000**, against the shipped
**0–8 N·m and 0.0–0.3°** — and it takes the roll down: at 20° of face slope the board's rail peak falls from
**13.8–34.4° to 5.9–24.4°**."* On when: *"the trigger opens at **0.22–1.02 s** of runs that fall at 0.77–1.70 s, so it
has 0.23–0.90 s to work in."* Its own verdict: ⭐ ***"It is not late. It is not enough."***

**3. Paired run for run, it makes the fall come SOONER.** Part 22 §3, **60 runs a gain across five face slopes**, each
set against the same stance and entry speed with the trigger off:

| hip gain, N·m/m | fell | later | same | **sooner** |
| --- | --- | --- | --- | --- |
| 500 | 60 of 60 | 33 | 9 | **18** |
| 1 000 | 60 of 60 | 24 | 4 | **32** |
| 2 000 | 60 of 60 | 20 | 4 | **36** |

and *"12 of 12 fall at every gain from 500 to 8 000 N·m/m"*. The one cell that flatters it (16°, 11/1/0 at 2 000) has
neighbours at 1/2/9, 1/0/11, 1/1/10 and 6/0/6, and neighbouring gains of 6/0/6 and 4/0/8 — *"a fit, not a finding"*.

⛔ **4. So the brief's premise about that sweep is wrong.** *"This is why the `HIP_CAPTURE_GAIN` sweep 500 → 8 000 fell
12 of 12 at every value: the hip was never weak, it was never ASKED."* **The "never asked" finding is step 3.2w's, the
round before** — there the hip delivered 0–8 N·m and 0.3°, through the ankle-overflow path. **3.2x asked it, from the
capture point, early, and it delivered up to 68.8° and 264 N·m.** The sweep is not evidence of a hip that was never
asked; it is the measurement of a hip that was.

⛔ **5. And the dead band is not even the rule.** Part 22 §1.3: *"the shipped hip, with none of this round's wiring,
already delivers **15–270 N·m and 1.8–68.8° of swing at 4, 8, 12 and 20° of face slope**, through the old
ankle-overflow path, **opening 0.08–1.87 s in — and falls 48 of 48 anyway**. 3.2w's 'the hip never moves' is true of
the 16° cell and of no other cell measured."* **Wave 1's 0.07 s is one cell, not a law** — and this round's own §3
shows the same: on wave 5 the switch is live from **t+0.267 s, before the steer**, on all three scripts.

**6. The reason every limb fails, which is the one line that generalises.** Part 23 §7, after a third authority:
*"Three roll authorities are now measured — the ankle's command (3.2w, ten gains), the hip's capture-point trigger
(3.2x, twelve gains across five slopes, **636 falls**) and a kinematic counter-roll of the whole body (here) — and
**all three lower the roll and none of them moves the fall.** The common term is 3.2x's: **the capture point counts
across-speed at 0.22–0.32 m per m/s, and every authority must move the weight to use it.** So the next measurement is
not a fourth authority."* ⭐ **This round reproduces that constant at 0.249–0.308 s and measures the term it feeds at
0.478–0.787 m against a 0.130 m sole (§4.2).**

> ## ⛔ **RECOMMENDATION: DO NOT BUILD THE ALLOCATION CHANGE.**
>
> Not because a lateral weight shift is harmful — it is not, and PR #444 did not deliver one — but because **an early
> hip demand is already built, swept over twelve gains and five face slopes, and measured to bring the fall forward on
> a majority of 60 paired runs at the two higher gains, with 636 falls behind the law that explains why.** Re-asking
> the hip from the steer rather than from `hipPast` is the same authority through a different trigger, at 1/35 of that
> population.
>
> ⛔ **And I am not proposing a tuning.** What the project's own files already name as open, for the owner's ruling and
> nobody else's: **(a)** source a human's own across-speed at the feet's edge against the model's measured median
> **1.21 m/s** — Part 23 says plainly *"if slower, the test is mis-scaled and the plant is survivable"*, and it is
> marked `[S needed]`, so it is a reading job and not a build; **(b)** *"more than one contact across"* — which on the
> owner's own list is the two-body rider and the parked hand, not a limb gain.

---

## 7. What I am NOT claiming

* **Nothing here says `?swing=mass` is inert.** It is not: it changes 106 and 66 of the shared frames on wave 2, moves
  `legLoad` by up to 14 N on wave 1, and produces genuinely different post-steer rides. **What it does not produce is
  a lateral centre-of-mass offset over the rail**, which is the quantity the owner's ruling and the advisor's
  `L·tan(tilt)` both name.
* **Nothing here says the switch should be merged or dropped.** That is the owner's call and he rides it; §4's note
  that the drawn lateral lean now goes 0.35ψ → 1.0ψ with the fold reaching 68.755° is still unopened in a browser.
* **Nothing here identifies which fall test fired**, on either arm. §4.2 sizes the terms at a frame boundary; the
  conjunction is reached inside a substep.
* **Nothing here attributes anything to `BoardBody`'s yaw residual**, which its own source documents as
  double-counting and unable to close.
* **The regressions are descriptive, not causal.** `comOff` and `dLever` are both driven by the same turn, R² is
  0.38–0.54, and both are reported with their R² and their n for that reason.
* **Population: one sea, one seed, 9 cells, one run per cell, 1 795 loaded standing frames.** The structure carries
  this — an identical-sea control, a reproduced committed table, a frame-by-frame bit comparison and two independent
  instruments on the headline quantity — **not the n**. §6's population is 636 falls and is not mine.

---

## 8. Reproducing it

The probe is `take-off/four-numbers.ts` copied verbatim with the `swing`/`trunk` arm suffixes, `'swing'` in
`RIDER_KEYS`, and peek-only columns: the decomposition (`comLX`, `comOff`, `dLever`, `dRatio`, `needRatio`), the fold
and posture offset (`foldA`, `comX`, `postA`, `leanLine`, `legH`, `swingR`), the clamped contact force on the board's
own axes (`cFx`/`cFy`/`cFz`/`cRatio`), the water's force by source on two axes (`fwB`/`fwH` and ten `f*B`), the
ankle's rest and room, and the eleven `CaptureState` reports. ⚠️ **`?swing=mass` lives on `claude/swing-mass` and not
on this docs branch**, so the run was taken against that worktree's `src` by rewriting the probe's eleven import
prefixes with one `sed` and nothing else:

```
sed "s|'\.\./\.\./\.\./\.\./src/|'<swing-mass worktree>/src/|g" \
  docs/research/new-rider/3.5/swing-demand.ts > <s>/swing-demand.ts
./node_modules/.bin/rolldown <s>/swing-demand.ts -o <s>/raw.mjs --format esm --platform node
printf "globalThis.location = { search: '' };\n" > <s>/probe.mjs   # an OBJECT, never a string
cat <s>/raw.mjs >> <s>/probe.mjs
ln -s <repo>/node_modules <s>/node_modules                         # `three` is external to the bundle
cd <s> && env MODE=takeoff SEED=2 PERIODS=4 ARMS=ships,swing SCRIPTS=cue,cueL,cueR \
  TURN_COMPRESS=0 STAND_HOLD=4 LOG=window OUT=<s>/ab.jsonl node --max-old-space-size=3200 probe.mjs
python3 -I docs/research/new-rider/3.5/swing-demand-read.py <s>/ab.jsonl --wave 2 --script cueL
```

The run is `results/35k/35k-s2-steer-only-ships-vs-swing.jsonl.gz` and the reader's whole output is
`results/35k/35k-read.txt`. ☠️ **Two traps re-hit and worth repeating:** a bare `&`-backgrounded `node` from a tool
shell was killed at 8 minutes with an empty log and no `done` line (use the harness's own background runner), and
`grep '"kind": "done"'` **never matches** — `JSON.stringify` emits no space after the colon, so a completed run reads
as an unfinished one.
