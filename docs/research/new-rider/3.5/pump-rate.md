# Row 6's rate: the leg-depth pump, measured

**A measurement round. Nothing was tuned, switched, added or enabled.** No file under `src/` or `server/` was
touched; the diff is this document and the probe beside it (`3.5/pump.ts`). The probe reads public fields off the
rider and replicates `prepareLeg`'s own lines in a second, isolated arm for attribution.

---

## The answer, in one sentence

**The game's leg-depth channel does complete a half-cycle at the footage's 0.22 s — the achieved half-cycle time is
0.217 s, the median of 401 half-cycles over 69 of 72 runs — but it carries only 0.078 m of the asked-for 0.195 m
(40 %), so the follower does flatten it; the excursion falls below half the rung at a half-cycle of 0.27 s, and
0.27 s is row 6's number.**

The follower alone, with the game's coupling removed, crosses half the rung at **0.24 s**. The in-game channel
delivers **82–96 %** of the isolated follower at every one of the seven periods measured, so the attribution
is clean: **the critically damped follower is the governor, and everything else in the game costs 4–18 %.**

---

## Whether the brief's arithmetic was right — **it was wrong in the half it was confident about**

The brief offered two candidate governors and said it could not work out which one wins. **The settle wins.**

| the brief's claim | verdict | what was measured |
|---|---|---|
| "acceleration-limited, a full 0.195 m down-stroke takes √(2·0.195/6) ≈ **0.255 s**" | **wrong, twice** | (a) It omits the deceleration. A bang-bang traverse at 6 m/s² that **ends at rest** needs 2√(d/a) = **0.36 s**, not 0.255 s — so the figure is wrong even on its own premise. (b) The acceleration limit is **not** the governor: the measured peak rest rate is **0.791 m/s**, barely half of `CROUCH_SPEED`'s 1.5 m/s, and in a held step the acceleration clamp binds on only **3.9 %** of ticks — its first few. The critically damped term decelerates the leg long before 6 m/s² would. |
| "an up-stroke √(2·0.195/15) ≈ **0.161 s**" | **wrong, same two ways** | The up-stroke is governed by the same ω, not by `EXTEND_ACCELERATION`; the clamp binds only at the flip. |
| "a full cycle ≈ 0.42 s, **half-cycles averaging ≈0.21 s, essentially the footage's 0.22 s**" | **right conclusion, wrong reason — and it does not carry the amplitude** | The channel *can* keep a 0.22 s beat (achieved 0.217 s), but the brief read that as the pump working. It does not: at that beat the depth is 40 % of the rung. **Timing and amplitude are separate answers and the arithmetic conflated them.** |
| "the critically damped follower at 12 rad/s settles to 95 % in roughly **4.75/ω ≈ 0.40 s**" | **the formula is right, the percentile is not — and this is the governor** | Measured on `prepareLeg`'s own lines: **90 % at 0.400 s** (so 4.80/ω is the 90 % point, not the 95 %), 95 % at 0.483 s, **within 5 mm of the rung at 0.567 s**, 99 % at 0.683 s. The in-game leg agrees: the `hold1` arm reaches the rung in **0.517–0.600 s in 72 of 72 runs**. |
| "**which one governs a pump is exactly what I cannot work out on paper**" | **settled: the settle governs** | Any half-period under about 0.6 s is amplitude-limited by the ω = 12 follower. At 0.60 s the follower reaches 0.97 of the rung; at 0.45 s, 0.90; at 0.30 s, 0.67; at 0.22 s, 0.43. |

The four constants themselves were read and are as the brief states: `LEG_FREQUENCY = 12`,
`CROUCH_ACCELERATION = 6`, `CROUCH_SPEED = 1.5`, `EXTEND_ACCELERATION = 15` (`AttachedRider.ts:1052–1055`,
applied at `:4216–4226`), and the pumping crouch is a named rung at `CROUCH_SHARE × CROUCH_DEPTH` = **0.195 m**
(`:1014–1015`, `humanBalance.ts:62`, `:125`). **Every constant in the brief checked out. Only the arithmetic on
them did not.**

---

## The bench, and the frame every number below is in

| what | which |
|---|---|
| water | **`FaceWater`** — the analytic Canyon-matched face of PR #223, **1.4 m / 16° / 5.7 m/s, 2.6 m still depth**. A **fit** to Canyon B, **not Canyon**. It writes **`breaking: 0`, `voidFraction: 0` and no foam**, so nothing here comes from whitewater, aeration or a lip. |
| rider | **`rider: 'new'`, `feltFrame: 'deck'`, `riderBody: 'two'`** — the rider the owner rides. |
| input | A square wave on **`crouch`** between 0 and 1 (`compress = 0`, `snap = 0`), from 0.5 s. `crouch = 1` commands exactly the **0.195 m** pumping rung. |
| trim | **`steer = 0` for the whole run — no direction change**, which is the footage's own condition (V14; V8 T5 and V9 T1 before it). |
| population | **72 runs an arm**: 3 entry speeds × 4 wave phases × 2 headings × 3 start points. 12 arms, **864 runs**, 9 s each. |
| frame | **Every depth is metres of leg-spring rest-length shortening below the riding stance.** `rest` = `−leg.rest`, `got` = `−leg.extension` (where the centre of mass actually is), `drawn` = `stanceBlend.depth × CROUCH_DEPTH` read through `pelvisOverDeck` off `renderPoint`'s own points, `target` = the chain's own ask reconstructed as `prepareLeg` builds it. |
| live frames | **91 562 ticks kept over 864 runs. 0 frozen.** `AttachedRider.separate` (`:4586`) never clears `phase` or `upright`, so every rider column freezes after separation; this probe breaks the loop on **`!rider.attached`**, so no post-separation frame is in any figure. |
| medians | **`qt(v, 0.5)` — the UPPER MIDDLE element of an even sample**, as every probe in 3.2–3.5 defines it. Not a plain median. Every "median" below is that. |
| half-cycles | Detected by a **zigzag with a 2 mm reversal threshold, on the signal itself**. The input's toggle times are never used, so lag, overshoot and clipping are measured as they are. Turning points before the first key press are discarded. |

All 864 runs ended with the rider off the board, at 0.65–4.60 s. **That is this rider's known baseline; it is
reported and not used.** No number below is a survival rate and no arm was compared on one.

---

## The table — pooled over every half-cycle of every run

Excursions are peak-to-trough of the signal named, in metres. "Share of 0.195" is the **median** excursion over the
rung.

| asked half-cycle, s | pooled half-cycles | runs that gave one | **rest excursion, m** (least / **median** / most) | **share of 0.195** | **achieved half-cycle, s** (least / **median** / most) | got excursion, m | drawn excursion, m | target excursion, m |
|---|---|---|---|---|---|---|---|---|
| **hold0** — key never pressed | **0** | **0/72** | **none** | – | – | – | – | – |
| **hold1** — key held down | **4** | **4/72** | 0.005 / **0.005** / 0.005 | **0.03** | 0.400 / **0.400** / 0.400 | 0.006 (152) | 0.007 (144) | 0.008 (24) |
| 0.10 | 841 | 63/72 | 0.002 / **0.016** / 0.290 | **0.08** | 0.033 / **0.100** / 0.717 | 0.006 (512) | 0.006 (518) | 0.195 (1218) |
| 0.15 | 594 | 70/72 | 0.003 / **0.038** / 0.299 | **0.20** | 0.067 / **0.150** / 0.783 | 0.026 (548) | 0.026 (555) | 0.195 (815) |
| **0.22 — the footage** | **401** | **69/72** | 0.002 / **0.078** / 0.311 | **0.40** | 0.033 / **0.217** / 0.683 | 0.076 (387) | 0.076 (408) | 0.194 (525) |
| 0.24 | 373 | 66/72 | 0.002 / **0.085** / 0.320 | **0.43** | 0.017 / **0.233** / 0.867 | 0.089 (372) | 0.090 (386) | 0.190 (499) |
| 0.26 | 357 | 65/72 | 0.002 / **0.095** / 0.249 | **0.49** | 0.017 / **0.250** / 0.767 | 0.103 (348) | 0.104 (363) | 0.189 (474) |
| **0.28 — half the rung** | **339** | **65/72** | 0.002 / **0.100** / 0.269 | **0.51** | 0.017 / **0.267** / 0.800 | 0.119 (322) | 0.119 (333) | 0.183 (451) |
| 0.30 | 306 | 63/72 | 0.002 / **0.112** / 0.243 | **0.57** | 0.017 / **0.300** / 0.917 | 0.128 (305) | 0.130 (314) | 0.166 (481) |
| 0.45 | 193 | 56/72 | 0.002 / **0.160** / 0.296 | **0.82** | 0.017 / **0.433** / 0.717 | 0.186 (187) | 0.185 (195) | 0.165 (280) |
| 0.60 | 135 | 50/72 | 0.003 / **0.182** / 0.278 | **0.93** | 0.067 / **0.600** / 0.950 | 0.198 (136) | 0.189 (152) | 0.166 (200) |
| 1.50 ⚠️ window-limited | 61 | 38/72 | 0.003 / **0.136** / 0.278 | **0.70** | 0.017 / **0.567** / 2.350 | 0.048 (129) | 0.030 (141) | 0.064 (112) |

**The 1.50 arm is a floor, not a flat.** Rides end at 0.65–4.60 s, so a 3 s cycle rarely completes inside one; its
figure is the window's and not the channel's. The isolated follower below carries that period.

**The spans reach past the rung** (up to 1.6 of it) because the balance's own knee drop adds depth at the deep end:
the chain's `target` reaches 0.345 m = 0.195 + 1.0 × 0.15, the pumping crouch's own knee travel. Those are tails.
The pooled medians are the figures.

### The isolated follower — `prepareLeg`'s lines alone, no water, no board, no balance, no fall

A replica of `AttachedRider.ts:4216–4226` and nothing else, so the flattening can be attributed rather than
asserted. Its steady-state excursion is the median of its own zigzag half-cycles over the **second half** of a 20 s
run, measured exactly as the in-game arm is.

**Step response to the rung, held:** 50 % at 0.183 s, 90 % at **0.400 s**, 95 % at 0.483 s, **within 5 mm at
0.567 s**, 99 % at 0.683 s. **Peak rate 0.791 m/s against a `CROUCH_SPEED` of 1.5 m/s — the speed limit never
binds.** The acceleration clamp binds on **0.039** of the step's ticks.

| asked half-cycle, s | half-cycles | **steady excursion, m** | **share of 0.195** | achieved half-cycle, s | deepest, m | accel clamp, share of ticks | **in-game ÷ follower** |
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

The acceleration clamp binds on **31–61 %** of ticks at the short periods — the brief was right that it is active
there — **but it is not what sets the amplitude**, because the peak rate never reaches half the speed cap and the
clamp's own bound (0.36 s for the full rung) is looser than the settle's 0.567 s.

---

## Beware a metric that cannot fail — what a broken channel would look like, and that this is not it

**If the leg-depth channel were flattened to nothing, every excursion would sit under the zigzag's 2 mm threshold,
no turning point would be recorded, and every arm would report `none`.** That is exactly what the two no-pump arms
report, and exactly what the pumped arms do not:

- **`hold0`**, the crouch key never pressed: **0 half-cycles, 0 of 72 runs.** The detector invents nothing.
- **`hold1`**, the key held down for the whole run: **4 half-cycles in 4 of 72 runs, 0.005 m** — 2.6 % of the rung,
  the balance's own residue and nothing more.
- **`1.50` on the isolated follower**, the positive control: **1.00 of the rung.** So the chain is sound end to end
  and the shortfall at 0.22 s is rate, not breakage.
- And the pumped arms are **monotone in period** across seven periods, in two independent arms, agreeing to within
  4–18 % of each other. A noise-reading detector would not be monotone.

---

## What this round refutes — including two of its own readings

**1. The brief's arithmetic.** Above. The rate limits do not govern; the settle does; the 0.255 s figure is wrong
on its own premise before it is wrong in fact.

**2. My own first reading, from a single tick trace.** Watching one 0.22 s run, the balance's knee drop appeared to
eat the pump: released, `human.knees` climbed from 0 to 0.63 within 0.15 s and refilled the target, and in `hold0`
the leg walks itself to 0.30 m with the key **never pressed** (`knees` ends at 0.98 in 72 of 72 runs). I was about
to report that as the cause. **Pooled over 864 runs it is wrong at 0.22 s**: the chain's own `target` excursion
there is **0.194 m over 525 half-cycles — essentially the whole rung.** The knee drop moves the pump's *mean
depth*, not its *excursion*. It does begin to eat the excursion at **0.30 s and longer**, where `target` falls to
0.166 m, because `stanceRoom`'s knee travel is **0.30 m at tall and 0.15 m at the pumping crouch**
(`humanBalance.ts:159–160`) and a saturated `knees` therefore narrows the two ends of the square wave to 0.045 m.
**That is a real second mechanism, but it is not the one at 0.22 s.** One trace was not a number.

**3. Row 6's classification.** Row 6 files "pumping in trim is trunk fold, not leg depth" as an **expressibility
limit**. For the **rate** half that is wrong: the leg-depth pump is not inexpressible at the footage's beat — it is
present, timed to within 0.003 s of it, and short on depth by a measured factor of 2.5. **It is a quantitative
shortfall with a number, not a limit of what the engine can represent.** Row 6 needs reclassifying on that half.
(Nothing here speaks to the trunk half; §4 below.)

**4. "The drawing loses it."** It does not. At 0.22 s, `rest` 0.078 m, `got` 0.076 m, `drawn` 0.076 m. Whatever the
leg's rest length does, the body and the drawing do. There is no loss downstream of the follower.

---

## What this round cannot say

**It cannot say whether 0.078 m is what video 14's rider does.** Row 6's own ⚠️ SAT marker is the reason: the
footage's leg figures come off a **saturated leg chain** (99–100 % on every frame it could read), so the series has
**no measured depth for any pump**. This round measured the game in the game's own units and the footage's *rate*
is the only footage quantity it could compare against. **The depth comparison needs a measured excursion from the
footage — in head-lengths or any ruler that does not saturate — and no round has one.** Until then "40 % of the
rung" is a fact about the game and not a verdict against the clip.

It also says nothing about the trunk. Row 6's other half — that the fold does the work — is rows 1 and 2's
business, and this probe does not touch `hip.angle`.

---

## Row 6's number

**A half-cycle of 0.27 s.** Below that the game's leg-depth pump carries less than half its own rung: 0.100 m at
0.28 s, 0.095 m at 0.26 s, **0.078 m at the footage's 0.22 s**. The cause is the critically damped follower at
`LEG_FREQUENCY = 12` rad/s, whose step response needs **0.567 s** to come within 5 mm of the 0.195 m rung.

**What to do about it is a separate decision for the owner and is deliberately not proposed here.** This round
changed no behaviour, tuned no constant and added no switch.

---

## Reproducing it

```
./node_modules/.bin/rolldown docs/research/new-rider/3.5/pump.ts -o <scratch>/p.mjs --format esm --platform node
HALVES=hold0,hold1,0.10,0.15,0.22,0.24,0.26,0.28,0.30,0.45,0.60,1.50 \
  RIDER=new FELT=deck BODY=two OUT=<scratch>/rows.jsonl node <scratch>/p.mjs
RIDER=new FELT=deck BODY=two HALVES=0.22 EXTRAS=0 PHASES=0 SIDES=-45 AHEADS=0.75 TICKS=1 node <scratch>/p.mjs
```

The full matrix is 864 runs and takes about 1 min 54 s on one worker. **One worker only** — this machine has 8 GB
and `--maxWorkers=2` is OOM-killed.
