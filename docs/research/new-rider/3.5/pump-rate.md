# Row 6's rate: the leg-depth pump, measured

**A measurement round. Nothing was tuned, switched, added or enabled.** No file under `src/` or `server/` was
touched; the diff is this document and the probe beside it (`3.5/pump.ts`). The probe reads public fields off the
rider and replicates `prepareLeg`'s own lines in a second, isolated arm for attribution.

> **Corrections carried in this document.** Two things this round first published were wrong and are fixed here, not
> quietly: **(1)** the `hold0` negative control was **guaranteed to report zero by a filter bug** and measured
> nothing (§5.1) — it is fixed, re-run, and **it no longer reports zero**; **(2)** the write-up described the bench
> as holding the board's orientation, which **`steer = 0` does not do** (§3.1). A third correction arrived from
> outside: **the 0.22 s footage figure this round was built to test has been withdrawn** (§2), so the headline is
> now a statement about the game alone.

---

## 1. The answer, in one sentence

**The game's leg-depth channel completes a half-cycle at a 0.22 s command — the achieved half-cycle time is
0.217 s, the median of 401 half-cycles over 69 of 72 runs — but it carries only 0.078 m of the asked-for 0.195 m
rung (40 %), so the follower does flatten it; the excursion falls below half the rung at a command half-cycle of
about 0.27 s, and that is row 6's number.**

The follower alone, with the game's coupling removed, crosses half the rung at **0.24 s**. The in-game channel
delivers **82–96 %** of the isolated follower at every one of the seven periods measured, so the attribution is
clean: **the critically damped follower is the governor, and everything else in the game costs 4–18 %.**

**These numbers are unchanged by the control fix.** The corrected `hold0` run left every positive arm
byte-identical — the 0.217 s half-cycle, the 0.078 m excursion, the 40 % share and the 0.27 s halving point are
exactly as first measured. The fix changed the control, not the result.

---

## 2. ⚠️ What this is *not* a verdict on: the footage target has been withdrawn

This round was commissioned to test the game against **video 14**: *"four half-cycles in 0.88 s, ≈0.22 s each, in
trim with no direction change."* **That figure has since been withdrawn.** A second reader could not reproduce the
four half-strokes, called the number a **one-window average**, and found **the board was rolling and turning
through that passage** — so *"in trim with no direction change"* may not describe it at all.

**So 0.22 s in every table below is a probed command period, not a footage target.** It is kept, and labelled
**⚠️ withdrawn comparison**, because the round was designed around it and hiding the column would hide why these
periods were chosen.

**Row 6 currently has no reliable footage target — neither rate nor depth.**

- **Depth:** row 6's own ⚠️ **SAT** marker. Every footage leg figure for a pump comes off a **saturated leg chain**
  (99–100 % on every readable frame), so the series has **no measured depth for any pump**.
- **Rate:** withdrawn, as above.

**This round therefore measures the game in the game's own units and compares it to nothing.** The measurement
stands on its own. **No row, and no later round, may read "40 % of the rung" as a shortfall against a rider.**
Closing that needs a reproduced rate **and** a non-saturating depth excursion from footage, and neither exists.

---

## 3. The bench, and the frame every number is in

| what | which |
|---|---|
| water | **`FaceWater`** — the analytic Canyon-matched face of PR #223, **1.4 m / 16° / 5.7 m/s, 2.6 m still depth**. A **fit** to Canyon B, **not Canyon**. It writes **`breaking: 0`, `voidFraction: 0` and no foam**, so nothing here comes from whitewater, aeration or a lip. |
| rider | **`rider: 'new'`, `feltFrame: 'deck'`, `riderBody: 'two'`** — the rider the owner rides. |
| input | A square wave on **`crouch`** between 0 and 1 (`compress = 0`, `snap = 0`), from 0.5 s. `crouch = 1` commands exactly the **0.195 m** pumping rung. |
| population | **72 runs an arm**: 3 entry speeds × 4 wave phases × 2 headings × 3 start points. 12 arms, **864 runs**, 9 s each. |
| frame | **Every depth is metres of leg-spring rest-length shortening below the riding stance.** `rest` = `−leg.rest`, `got` = `−leg.extension` (where the centre of mass actually is), `drawn` = `stanceBlend.depth × CROUCH_DEPTH` read through `pelvisOverDeck` off `renderPoint`'s own points, `target` = the chain's own ask reconstructed as `prepareLeg` builds it. |
| live frames | **91 562 ticks kept over 864 runs. 0 frozen.** `AttachedRider.separate` (`:4586`) never clears `phase` or `upright`, so every rider column freezes after separation; this probe breaks the loop on **`!rider.attached`**, so no post-separation frame is in any figure. |
| medians | **`qt(v, 0.5)` — the UPPER MIDDLE element of an even sample**, as every probe in 3.2–3.5 defines it. Not a plain median. Every "median" below is that. |
| half-cycles | A **zigzag with a 2 mm reversal threshold, on the signal itself**. The input's toggle times are never used, so lag, overshoot and clipping are measured as they are. The detector's own self-test is §5.2. |

All 864 runs ended with the rider off the board, at 0.65–4.60 s. **That is this rider's known baseline; it is
reported and not used.** No number below is a survival rate and no arm was compared on one.

### 3.1 ⚠️ What `steer = 0` does and does not hold

**It locks the player's steering input** for the whole run, so there is **no commanded direction change** — which
is the condition the round was asked for. **It does not lock the board's orientation.** The board is free to yaw,
roll and pitch under the water's forces, and it does.

**This probe recorded neither trajectory nor exit speed.** So:

- it is **not a fixed-orientation benchmark**, and any earlier description of it as one is wrong;
- **a real clip's board path cannot be compared against this bench at all.** That comparison needs trajectory and
  exit speed, which are not measured here.

What the bench *does* support is the one question asked of it: what excursion the leg-depth channel reaches at a
given command rate, with no steering input.

---

## 4. The table — pooled over every half-cycle of every run

Excursions are peak-to-trough of the signal named, in metres. "Share of 0.195" is the **median** excursion over the
rung. **The two control rows are read in §5.**

| arm (command half-cycle, s) | pooled half-cycles | runs that gave one | **rest excursion, m** (least / **median** / most) | **share of 0.195** | **achieved half-cycle, s** (least / **median** / most) | got exc., m | drawn exc., m | target exc., m |
|---|---|---|---|---|---|---|---|---|
| **hold0** — key never pressed (control) | **20** | **16/72** | 0.003 / **0.016** / 0.125 | **0.08** | 0.150 / **0.650** / 3.450 | 0.004 (84) | 0.015 (76) | 0.020 (48) |
| **hold1** — key held down (control) | **4** | **4/72** | 0.005 / **0.005** / 0.005 | **0.03** | 0.400 / **0.400** / 0.400 | 0.006 (152) | 0.007 (144) | 0.008 (24) |
| 0.10 ⚠️ **at the control's floor** | 841 | 63/72 | 0.002 / **0.016** / 0.290 | **0.08** | 0.033 / **0.100** / 0.717 | 0.006 (512) | 0.006 (518) | 0.195 (1218) |
| 0.15 | 594 | 70/72 | 0.003 / **0.038** / 0.299 | **0.20** | 0.067 / **0.150** / 0.783 | 0.026 (548) | 0.026 (555) | 0.195 (815) |
| **0.22** ⚠️ withdrawn comparison | **401** | **69/72** | 0.002 / **0.078** / 0.311 | **0.40** | 0.033 / **0.217** / 0.683 | 0.076 (387) | 0.076 (408) | **0.194** (525) |
| 0.24 | 373 | 66/72 | 0.002 / **0.085** / 0.320 | **0.43** | 0.017 / **0.233** / 0.867 | 0.089 (372) | 0.090 (386) | 0.190 (499) |
| 0.26 | 357 | 65/72 | 0.002 / **0.095** / 0.249 | **0.49** | 0.017 / **0.250** / 0.767 | 0.103 (348) | 0.104 (363) | 0.189 (474) |
| **0.28 — half the rung** | 339 | 65/72 | 0.002 / **0.100** / 0.269 | **0.51** | 0.017 / **0.267** / 0.800 | 0.119 (322) | 0.119 (333) | 0.183 (451) |
| 0.30 | 306 | 63/72 | 0.002 / **0.112** / 0.243 | **0.57** | 0.017 / **0.300** / 0.917 | 0.128 (305) | 0.130 (314) | 0.166 (481) |
| 0.45 | 193 | 56/72 | 0.002 / **0.160** / 0.296 | **0.82** | 0.017 / **0.433** / 0.717 | 0.186 (187) | 0.185 (195) | 0.165 (280) |
| 0.60 | 135 | 50/72 | 0.003 / **0.182** / 0.278 | **0.93** | 0.067 / **0.600** / 0.950 | 0.198 (136) | 0.189 (152) | 0.166 (200) |
| 1.50 ⚠️ **window-limited, a floor not a flat** | 61 | 38/72 | 0.003 / **0.136** / 0.278 | **0.70** | 0.017 / **0.567** / 2.350 | 0.048 (129) | 0.030 (141) | 0.064 (112) |

**The 1.50 arm is a floor, not a flat.** Rides end at 0.65–4.60 s, so a 3 s cycle rarely completes inside one; its
figure is the window's, not the channel's. The isolated follower below carries that period.

**The spans reach past the rung** (up to 1.6 of it) because the balance's own knee drop adds depth at the deep end:
the chain's `target` reaches 0.345 m = 0.195 + 1.0 × 0.15, the pumping crouch's own knee travel. Those are tails.
The pooled medians are the figures.

**Excursions are a ~5 % underestimate.** The detector's self-test (§5.2) recovers 0.186 m from a known 0.195 m
oscillation and 0.074 m from a known 0.078 m one — the cost of locating a turning point on a 1/60 s grid. So the
shares above are slightly low and **the halving point is between 0.26 and 0.28 s**; 0.27 s is the midpoint quoted.

### 4.1 The isolated follower — `prepareLeg`'s lines alone, no water, no board, no balance, no fall

A replica of `AttachedRider.ts:4216–4226` and nothing else, so the flattening can be attributed rather than
asserted. Its steady-state excursion is the median of its own zigzag half-cycles over the **second half** of a 20 s
run, measured exactly as the in-game arm is.

**Step response to the rung, held:** 50 % at 0.183 s, 90 % at **0.400 s**, 95 % at 0.483 s, **within 5 mm at
0.567 s**, 99 % at 0.683 s. **Peak rate 0.791 m/s against a `CROUCH_SPEED` of 1.5 m/s — the speed limit never
binds.** The acceleration clamp binds on **0.039** of the step's ticks.

| command half-cycle, s | half-cycles | **steady excursion, m** | **share of 0.195** | achieved half-cycle, s | deepest, m | accel clamp, share of ticks | **in-game ÷ follower** |
|---|---|---|---|---|---|---|---|
| 0.10 | 197 | **0.018** | **0.09** | 0.033–0.133 | 0.069 | 0.57 | 0.89 |
| 0.15 | 131 | **0.040** | **0.21** | 0.133–0.167 | 0.078 | 0.61 | 0.95 |
| **0.22** | 88 | **0.085** | **0.43** | 0.200–0.233 | 0.127 | 0.46 | **0.92** |
| **0.24 — half the rung** | 81 | **0.099** | **0.51** | 0.217–0.250 | 0.134 | 0.42 | 0.86 |
| 0.26 | 74 | **0.110** | **0.56** | 0.233–0.283 | 0.141 | 0.39 | 0.86 |
| 0.28 | 69 | **0.122** | **0.63** | 0.250–0.300 | 0.148 | 0.36 | 0.82 |
| 0.30 | 64 | **0.131** | **0.67** | 0.283–0.317 | 0.154 | 0.31 | 0.85 |
| 0.45 | 42 | **0.175** | **0.90** | 0.433–0.467 | 0.185 | 0.21 | 0.91 |
| 0.60 | 31 | **0.189** | **0.97** | 0.600–0.600 | 0.192 | 0.13 | 0.96 |
| **1.50 — positive control** | 11 | **0.195** | **1.00** | 1.500–1.500 | 0.195 | 0.05 | – |

The acceleration clamp binds on **31–61 %** of ticks at the short periods — so it *is* active there — **but it is
not what sets the amplitude**, because the peak rate never reaches half the speed cap and the clamp's own bound
(0.36 s for the full rung) is looser than the settle's 0.567 s.

---

## 5. The controls — including the one that was broken

### 5.1 ⚠️ `hold0` was a tautology in `ff750da4`, and this is what it actually gives

**The bug.** `firstPress` was set only on a tick where the key was down:

```js
if (key > 0 && !Number.isFinite(firstPress)) firstPress = t;   // never runs on hold0
const after = (t: Turn[]) => t.filter((x) => x.t >= firstPress);
```

On `hold0` the key is **never** pressed, so `firstPress` stayed `NaN`; `x.t >= NaN` is `false` for every turning
point; `after()` returned an **empty array on every channel**. **So the published "`hold0`: 0 half-cycles, 0 of 72
runs" was guaranteed by the filter and measured nothing.** It is exactly the error class this document's own
"beware a metric that cannot fail" section warns about, published inside that section — **a control is the easiest
place in a round to hide a tautology, because nobody interrogates a zero.** Found by review, not by me.

**The fix.** A no-press arm observes from a finite start; actuated arms keep `firstPress`, where it is correct and
is what the first stroke must be measured from:

```js
const watchFrom = Number.isFinite(firstPress) ? firstPress : START;
const after = (t: Turn[]) => t.filter((x) => x.t >= watchFrom);
```

**What the corrected control actually gives, on the same 72 runs — it is not a zero:**

| | half-cycles | runs that gave one | rest excursion, m (least / median / most) | achieved half-cycle, s (least / median / most) |
|---|---|---|---|---|
| `hold0`, as published in `ff750da4` | **0** *(artefact)* | 0/72 | – | – |
| **`hold0`, corrected** | **20** | **16/72** | 0.003 / **0.016** / 0.125 | 0.150 / **0.650** / 3.450 |

**This is the more informative result and it costs the round one row.** The balance's own knee drop, with the crouch
key **never touched**, produces a measurable wander: 20 half-cycles across 16 of 72 runs, median **0.016 m**, and a
tail reaching **0.125 m** on one run.

**Consequence, stated plainly: the 0.10 s arm is withdrawn as an amplitude measurement.** Its median excursion is
**0.016 m — identical to the corrected control's 0.016 m.** At that command period the channel's amplitude is
indistinguishable from what the rider does with no input at all. What still separates the 0.10 arm from the control
is **rate and count, not depth**: 841 half-cycles in 63 of 72 runs at a median 0.100 s, against 20 in 16 of 72 at a
median 0.650 s. So the 0.10 row's *timing* is a reading and its *excursion* is not.

**Every other arm clears the floor**, and the headline clears it comfortably:

| arm | median excursion, m | × the corrected control's 0.016 m | half-cycles | runs |
|---|---|---|---|---|
| `hold0` (control) | 0.016 | 1.0 | 20 | 16/72 |
| 0.10 | 0.016 | **1.0 — withdrawn** | 841 | 63/72 |
| 0.15 | 0.038 | 2.4 | 594 | 70/72 |
| **0.22** | **0.078** | **4.9** | **401** | **69/72** |
| 0.30 | 0.112 | 7.0 | 306 | 63/72 |
| 0.60 | 0.182 | 11.4 | 135 | 50/72 |

**And the control's own tail overlaps the 0.22 arm's median** (0.125 m against 0.078 m), on one run of 72. The
medians and the counts separate them; a single run does not. That is said here rather than left for a reader to
find.

**`hold1` is the valid negative control and now carries that weight.** The key held *down* gives a finite
`firstPress`, so its window was never broken: **4 half-cycles in 4 of 72 runs at 0.005 m**, 2.6 % of the rung. It
is a real measurement of a channel that is not being pumped.

### 5.2 The detector's self-test — it fires when the signal moves

A silent control proves nothing unless the detector is shown to **speak**. Synthetic triangles of known amplitude
at a known 0.22 s half-period, straddling the 2 mm threshold:

| synthetic amplitude, m | half-cycles found | excursion recovered, m | error, m | achieved half-cycle, s | verdict |
|---|---|---|---|---|---|
| 0.0000 | 0 | – | – | – | **silent, as it must be** |
| 0.0005 | 0 | – | – | – | **silent, as it must be** |
| 0.0010 | 0 | – | – | – | **silent, as it must be** |
| 0.0020 | 0 | – | – | – | **silent, as it must be** (at the threshold) |
| 0.0030 | 39 | 0.003 | 0.000 | 0.217–0.233 | **fires, recovers it** |
| 0.0050 | 39 | 0.005 | 0.000 | 0.217–0.233 | **fires, recovers it** |
| 0.0100 | 39 | 0.010 | 0.000 | 0.217–0.233 | **fires, recovers it** |
| 0.0500 | 39 | 0.048 | 0.002 | 0.217–0.233 | **fires, recovers it** |
| 0.0780 | 39 | 0.074 | 0.004 | 0.217–0.233 | **fires, recovers it** |
| 0.1950 | 39 | 0.186 | 0.009 | 0.217–0.233 | **fires, recovers it** |

Silent at and below 2 mm, firing from 3 mm up, and recovering both the amplitude and the 0.22 s period every time.
The ~5 % under-recovery at the large amplitudes is 1/60 s sampling of a turning point, and §4 carries it as a
caveat on the shares. **Review also exercised the no-press path through the live `watchFrom`/`after` independently:
a moving trace gives five half-cycles and a flat trace zero.**

### 5.3 The positive control

The isolated follower reaches **1.00 of the rung at a 1.50 s half-period** (§4.1), so the chain is sound end to end
and the shortfall at the short periods is rate, not breakage. The pumped arms are also **monotone in period across
seven periods in two independent arms, agreeing to within 4–18 %** — a noise-reading detector would not be.

---

## 6. Whether the brief's arithmetic was right — **it was wrong in the half it was confident about**

| the claim | verdict | what was measured |
|---|---|---|
| "acceleration-limited, a full 0.195 m down-stroke takes √(2·0.195/6) ≈ **0.255 s**" | **wrong, twice** | (a) It omits the deceleration. A bang-bang traverse at 6 m/s² that **ends at rest** needs 2√(d/a) = **0.36 s** — so the figure is wrong on its own premise. (b) The acceleration limit is **not** the governor: the measured peak rest rate is **0.791 m/s**, barely half of `CROUCH_SPEED`'s 1.5 m/s, and in a held step the acceleration clamp binds on **3.9 %** of ticks. The critically damped term decelerates the leg long before 6 m/s² would. |
| "an up-stroke √(2·0.195/15) ≈ **0.161 s**" | **wrong, the same two ways** | Governed by the same ω, not by `EXTEND_ACCELERATION`. |
| "half-cycles averaging ≈0.21 s, **essentially the footage's 0.22 s**" | **right timing, wrong reason — and it does not carry the amplitude** | The channel can keep a 0.22 s beat (achieved 0.217 s), but at that beat the depth is 40 % of the rung. **Timing and amplitude are separate answers and the arithmetic conflated them.** (And the footage half of the claim is now withdrawn — §2.) |
| "the critically damped follower settles to 95 % in roughly **4.75/ω ≈ 0.40 s**" | **the formula is right, the percentile is not — and this is the governor** | 4.80/ω is the **90 %** point. Measured: 90 % at **0.400 s**, 95 % at 0.483 s, **within 5 mm at 0.567 s**, 99 % at 0.683 s. The in-game leg agrees — `hold1` reaches the rung in **0.517–0.600 s in 72 of 72 runs**. |
| "**which one governs a pump is exactly what I cannot work out on paper**" | **settled: the settle governs** | Any half-period under about 0.6 s is amplitude-limited by the ω = 12 follower. |

**Every constant the brief quoted checked out** — `LEG_FREQUENCY = 12`, `CROUCH_ACCELERATION = 6`,
`CROUCH_SPEED = 1.5`, `EXTEND_ACCELERATION = 15` (`AttachedRider.ts:1052–1055`, applied at `:4216–4226`), and the
pumping crouch as a named rung at `CROUCH_SHARE × CROUCH_DEPTH` = **0.195 m** (`:1014–1015`, `humanBalance.ts:62`,
`:125`). **Only the arithmetic on them did not.**

---

## 7. What this round refutes — including three of its own readings

**1. The brief's arithmetic.** §6.

**2. My own first reading, off a single tick trace.** Watching one 0.22 s run, the balance's knee drop appeared to
eat the pump: released, `human.knees` climbed 0 → 0.63 in 0.15 s and refilled the target, and in `hold0` the leg
walks itself to 0.30 m with the key **never pressed** (`knees` ends at 0.98 in 72 of 72 runs). **Pooled over 864
runs that is wrong at 0.22 s**: the chain's own `target` excursion there is **0.194 m over 525 half-cycles**,
essentially the whole rung. The knee drop moves the pump's *mean depth*, not its *excursion* — until **0.30 s and
longer**, where `target` falls to 0.166 m, because `stanceRoom`'s knee travel is **0.30 m at tall and only 0.15 m
at the pumping crouch** (`humanBalance.ts:159–160`), narrowing the square wave's two ends to 0.045 m at saturated
`knees`. A real second mechanism, but not the one at 0.22 s. **One trace was not a number.**

**3. My own `hold0` control, and my own 0.10 s row.** §5.1. The control was an artefact; corrected, it reports a
real 0.016 m wander that **withdraws the 0.10 s arm's amplitude**.

**4. My own description of the bench.** §3.1. `steer = 0` holds the player's input, not the board's orientation,
and no trajectory or exit speed was recorded.

**5. Row 6's classification, for the rate half only.** Row 6 files "pumping in trim is trunk fold, not leg depth"
as an **expressibility limit**. The leg-depth pump is not inexpressible at a 0.22 s command: it is present, timed to
0.217 s, and short on depth by a measured factor of 2.5. **That is a quantitative shortfall with a number, not a
limit of what the engine can represent** — though, with the footage target withdrawn (§2), **the number is not yet
known to be a shortfall against anything.** Row 6 needs reclassifying on that half; nothing here speaks to the
trunk half, and `hip.angle` was never read.

**6. "The drawing loses it."** It does not. At 0.22 s: `rest` 0.078 m, `got` 0.076 m, `drawn` 0.076 m. Whatever the
leg's rest length does, the body and the drawing do.

---

## 8. Row 6's number

**A command half-cycle of about 0.27 s** (bracketed 0.26–0.28 s by the measurement, and ~0.26 s once the
detector's 5 % under-recovery is allowed for). Below it the game's leg-depth pump carries less than half its own
rung: 0.100 m at 0.28 s, 0.095 m at 0.26 s, **0.078 m at 0.22 s**. The cause is the critically damped follower at
`LEG_FREQUENCY = 12` rad/s, whose step response needs **0.567 s** to come within 5 mm of the 0.195 m rung.

**This is a fact about the game and not a verdict against any rider** (§2). **What to do about it is a separate
decision for the owner and is deliberately not proposed here.** This round changed no behaviour, tuned no constant
and added no switch.

---

## 9. Reproducing it

```
./node_modules/.bin/rolldown docs/research/new-rider/3.5/pump.ts -o <scratch>/p.mjs --format esm --platform node
HALVES=hold0,hold1,0.10,0.15,0.22,0.24,0.26,0.28,0.30,0.45,0.60,1.50 \
  RIDER=new FELT=deck BODY=two OUT=<scratch>/rows.jsonl node <scratch>/p.mjs
RIDER=new FELT=deck BODY=two HALVES=0.22 EXTRAS=0 PHASES=0 SIDES=-45 AHEADS=0.75 TICKS=1 node <scratch>/p.mjs
```

The full matrix is 864 runs and takes about 1 min 57 s on one worker. **One worker only** — this machine has 8 GB
and `--maxWorkers=2` is OOM-killed. The detector's self-test and the isolated follower run with it and need no
arguments.
