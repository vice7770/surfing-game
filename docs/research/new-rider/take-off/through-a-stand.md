# The four headline numbers, re-measured through a stand

**Measurement only.** Nothing under `src/`. No behaviour, no constant, no switch. One probe
(`stand.ts`), one reader (`stand-read.py`), two populations measured by the same instrument on the same build.

PR #429 found why every bench on this track disagrees with the owner, and marked four published numbers conditional:

> The mount seeds `planing` from |world velocity| > 4, so every PLACED rider at ≥ 4 m/s is on the plane from frame 1
> with a 17–69° lean cap — while a pop-up mounts prone and the latch's test is speed THROUGH THE WATER, which a caught
> board does not sustain. So `tip` 90/90, the 10.9° stance, the 0.1 s lag and the 0.327 m demand are statements about
> a bench, not about his game, until re-measured through a stand.

This round re-measures all four **through the game's own take-off**, and re-measures them **on the placement too, with
the same instrument**, so that each comparison is one bench read twice rather than two papers compared.

---

## 1. What was measured, and where each quantity comes from

| number | from | the quantity, named in the engine's own terms |
| --- | --- | --- |
| **`tip` 90 of 90** | #419 | `limit === 'tip'` is set in `project` (`AttachedRider.ts:5373`) when the clipped centre of pressure differs from the free one — i.e. **when the CoM's push line meets the deck outside the support box** |
| **the stance tolerates 10.9°** | #419, #421 | `atan(halfAcross / height)`, where `halfAcross` is the support's own half-width across and `height` is `project`'s own `local.y − deckHeight(shape, local.z)` (`:5347`) — the CoM above the deck, and the very factor that scales the demand at `:5364` |
| **the body follows the deck at 0.87, 0.1 s late** | #421, #424 | `d(body bank)/d(deck bank at t − lag)` through the origin, pooled over live frames; `bank` is `AttachedRider.bank.angle`, `roll` is `atan2(up·s, up.y)` off the board's orientation. **Two independent reads**, neither computed from the other |
| **the demand is 0.327 m outside the feet** | #425 | `outX = max(0, max(xMin − wantX, wantX − xMax))` on `desiredCop`, the free line of action's meeting point — `save.ts`'s own expression, character for character |

### The two populations

| | **the take-off** | **the placement** |
| --- | --- | --- |
| rig | #429's drive, carried over unchanged | `3.5/bank.ts`'s `MODE=sea` rig, carried over unchanged |
| start | `RideSession.place({ phase: 'prone', speed: 0 })` at the game's own lineup — `SurfZoneRunner.launchRide` | `AttachedRider({ phase: 'standing' })` flush at the break point, 45° off the fall line, `SINK = 0.06` |
| the catch | paddle in, sprint when the crest is 2 s away, **pop at the game's own cue** (`rider.popUpCue \|\| inTakeOffWindow`) | — |
| the stick | zero (`cue`), or a full steer **and** Compress from 0.3 s after the stand for 0.9 s (`cueL`/`cueR`) | **hard over**, from frame 1 |
| the grid | 3 trials × 10 entries (2–12 m/s) × 3 stances | |
| why this rig | it is the owner's own sequence | **it is the rig behind all four published numbers**, so the placed column is this round's positive control |

Both run the owner's address — `?canyonWaves=true&rider=new&feltFrame=deck&riderBody=two&stanceReach=keep&deepen=on` —
**through the game's own switch parsing** (`surfZoneConfigFor` → `switchedConfigFor` off `globalThis.location.search`),
on `claude/the-record`, whose `src/` is `main`'s. No switch is needed for any of the four numbers, so none is on.

---

## 2. What a broken result would look like, and the controls that catch it

Named before anything was run, because today a control read zero because a filter compared against `NaN`, another was
zero by construction, a third compared a substep against a step, and a fourth was guaranteed by an unsigned extension.

1. **The address not arriving.** A bare-string `globalThis.location` has no `.search` (`devTools.ts:9`), so every
   switch goes missing and the bench quietly measures the default Canyon with the default rider. The wrapper prepends
   an **OBJECT**; the control line prints the grid **off the solver** and the parsed switches; the process exits
   non-zero unless `canyonBed === 'b'` and `rider === 'new'`.
2. **The three headrooms not being the engine's three.** `rawMargin` is `max(0, min(1, across, along, 1 − t/f))`
   (`:5393`), and `balanceMargin` — the column every earlier trace called *the margin* — is that scalar **low-passed**
   (`:5050`), so neither can name which constraint went. A recomputation of the three separately can be checked
   against `rawMargin` **frame by frame** (`rawOk`). A mismatch means the arithmetic is not the engine's and the
   three may not be read.
3. **A pinned share that cannot fail.** `limitTime.tip` only ever *adds* and otherwise decays, so under the published
   `> 0` test it may be a **latch** rather than a share. Tested, not argued: after the first positive frame, is it ever
   zero again?
4. **A frozen column read as a live one.** `AttachedRider.separate` (`:5227–5232`) clears `attached`, `climbing` and
   `inContact` and **never `phase` or `upright`**, so every rider column freezes at the separation. Every run stops at
   its first `attached === 0`; the fall is read off `atFall`, the **last attached frame**.
5. **A censored window read as a carried ride.** #429's `TRIAL = 16 s` retired the trial on wave 6's standing frame.
   `TRIAL = 20` here — which only ever *adds* frames after t = 16 s — and every summary carries `standExposure` and
   `censored`.
6. **A survival clock that is not one.** `riding` only ticks while the rider is ahead of the crest **and** at 0.6 of
   its speed. It is emitted for continuity and **nothing here reads it**; post-stand exposure is `fell − stand`
   against `standExposure`.
7. **A load share read as a position.** `contact.frontShare` is the **share of load** on the front foot. Nothing in it
   says a foot moved; the deck-relative foot speed is the column that would.
8. **A regression with no leverage.** A through-origin gain is dominated by its largest |x|. The published 0.8748 was
   taken where the deck banks 28–66°; a take-off with the stick at zero barely banks, so the gain is reported on the
   full population **and** restricted to frames whose predictor is past 2° and past 5°.
9. **A regime filter that pairs two regimes.** The off-plane gain requires `planing == 0` at **both** ends of each
   lagged pair, not only at the response.
10. **The probe changing what it measures.** `PROBE=off` removes the probe's own reads — the drawn feet
    (`renderPoint`, twice) and the one `sampleAt` under the board — and never builds a row, while every measured
    column is computed identically. A `PROBE=off` run and a `PROBE=on` run must agree value for value.
11. **The zsh integer trap.** `SECONDS=0.5 node` arrives as `"0"` through zsh's special variable. This probe has no
    `SECONDS` (its horizons are `STAND_HOLD`, `PERIODS`, `PLACED_FOR`, `TRIAL`) and every invocation uses `env`.

**Every median here is a PLAIN median** — the mean of the two middle values at even length — in `stand.ts` and
`stand-read.py` alike. Every share carries the count it is a share of.

---

## 3. ⭐ The premise itself is a fact about ONE SEA, and on the other sea it inverts

Everything in #429's Part 4 — and therefore the brief that sent this round — rests on one claim: that a take-off is off
the plane where a placement is on it, so the lean a take-off rider may ask for is zero. **Measured on a second sea,
that inverts.**

| the first second after the stand | **the placement** (90 riders, stick hard over) | **take-off, seed 2** (21 stands) | take-off, seed 1 (#429's own) |
| --- | --- | --- | --- |
| planing at the **first standing frame** | **66 of 90** | **15 of 21** | 6 of 18 |
| planing **through** the first second | **74.8 %** of 4 952 frames | **80.6 %** of 1 106 frames | **18.0 %** of 716 |
| median `leanProbe.cap` | 0.6193 rad | **0.5342 rad** | 0.000 |
| frames with a non-zero lean **ask** | 3 882 of 4 952 | 429 of 1 106 | 48 of 716 |

**On seed 2 the take-off is on the plane for MORE of its first second than the placement is** — 80.6 % against 74.8 % —
and the rider may ask for a lean of a median 0.53 rad (30.6°) against the placement's 0.62 rad (35.5°). The regime gap
#429 measured is real on seed 1 and **absent on seed 2.**

### Why, in the engine's own terms — and it is not placement versus take-off

Both paths test the **same** number, `PLANING_SPEED = 4` m/s. The mount (`:2857`) tests `board.velocity.length()`, the
board's speed over the ground; `planingStep` (`:3495`) tests `hypot(vx − flowX, vz − flowZ)`, its speed **through the
water**. So:

* the **placement** is on the plane at frame 1 **iff its entry exceeds 4 m/s** — and it is off the plane at frame 1 in
  **24 of 90** runs here, because 2 of its 10 entries (2 and 3 m/s) are below the threshold. A placement is not
  uniformly "on the plane from frame 1"; it is on the plane when it is fast enough, like anything else;
* the **take-off** is on the plane when the caught board sustains 4 m/s **through the water** — and at the stand, on
  seed 2's seven cue waves, it makes **4.19, 4.35, 4.41, 4.52 and 4.64 m/s** on five of them (planing, cap
  0.378–0.454 rad) against **2.36 and 3.73** on the other two (cap exactly 0).

> **So #429's "a caught board does not sustain 4 m/s through the water" is false on five of seven of seed 2's cue
> waves, by 0.19–0.64 m/s.** The regime is decided **wave by wave**, by the board's speed through the water at the
> stand — not by whether the rider was placed or popped up. What seed 1 measured was a sea whose caught waves
> happened to fall below the threshold.

**This is the single most consequential finding of the round, because it is the premise under all four numbers.** It
does not rescue the placement benches: a placed rider's regime is set by a number the experimenter chooses, and a
take-off's by the wave it caught, so a placement still cannot tell you which regime the owner is in. But the reason is
*sampling*, not *kind*, and the fix is to report the regime per wave — which every table below does.

---

## 4. NUMBER 1 — `tip` 90 of 90

**The published claim** (#419): *"the centre of pressure pins at the support edge (`limit = 'tip'`, 90 of 90 riders)"*,
with #421's *"CoP pinned 3 745/7 208 = 52.0 %"* and #429's *"89.8 % of the first second"*.

### 4.1 ☠️ The published pinned SHARE is a latch, and it is measured, not argued

`limitTime.tip` only ever **adds** `h` when tip binds and otherwise multiplies by `exp(−h/CAUSE_MEMORY)` with
`CAUSE_MEMORY = 0.2` s (`:5128–5131`). It is zeroed **only at the mount** (`:2874`). Under the published `> 0` test —
`3.5/bank.ts:317` and #429's `bench.ts:398` both write exactly that — it therefore cannot come back to zero within a
ride except by underflowing a double.

**Tested rather than reasoned.** After the frame on which it first goes positive:

| | returns to 0 on |
| --- | --- |
| **the take-off, seed 2** | **0 of 2 028** following standing frames, in 21 of 21 runs |
| **the placement** | **0 of 3 565** following standing frames, in 90 of 90 runs |

> **It is a latch, not a share of pinned frames.** "Pinned in 89.8 % of the first second" means *"the first tip substep
> happened before 10.2 % of the way into the window"*, and nothing more. A high share is **guaranteed** by an early
> flip, which is the shape of metric this project keeps catching itself on.

**And on a take-off the flip is not even in the stand.** On seed 2 it goes positive **before the stand in 21 of 21
stands, every one of them in the `landing` phase** — so the first second's "pinned" share is a memory of the pop-up's
own landing, inherited by a window it is then attributed to. A placement cannot show this, because a placement's mount
*is* its first standing frame.

### 4.2 The three honest readings, side by side

| the first second after the stand | **the placement** | **take-off, seed 2** |
| --- | --- | --- |
| `limit === 'tip'` ever fired (per run) | **88 of 90** | **14 of 21** |
| `limitTime.tip > 0` ever (the published test) | **90 of 90** | 21 of 21 |
| the raw demand outside the support box, ever | 88 of 90 | 14 of 21 |
| first `tip`, median after the stand | **0.7500 s** | **0.5083 s** |
| share of frames `limit === 'tip'` | **10.5 %** (520 of 4 952) | **15.0 %** (166 of 1 106) |
| share of frames `limitTime.tip > 0` | 37.9 % | 100.0 % |
| memory ÷ now | **3.61** | 6.66 |
| frames outside the box that `limit` does **not** call `'tip'` (masked by `'impact'`) | **13 of 531** | 0 of 166 |

**`tip` 90 of 90 reproduces exactly on the placement — as the latch.** Read as `limit === 'tip'`, the same 90 riders
give **88 of 90**; read as the geometry, 88 of 90. So the published figure was the latch's, and the latch's own value
is 90 of 90: the number is right about *what it measured*.

**Through a stand it is 14 of 21** — because 7 of 21 stands never put the demand outside the feet at all. Those 7 are
the carried ones.

### 4.3 ⭐ What the instantaneous pin does instead, on 21 stands

Part 13.3 of #429's README flagged this on 7 stands. On 21:

| | stands | carried the first second | lost inside it |
| --- | --- | --- | --- |
| `pinNow == 0` (never pinned in the window) | **8** | **8** | **0** |
| `pinNow > 0` | **13** | **0** | **13** |

**21 of 21.** Every stand that is never instantaneously pinned carries the first second — seven of them ride the whole
3 s window out and the eighth goes at **2.3 s** — and every stand that is pinned at any point inside the window is
gone. The latch, over the same 21 stands, reads **100 % of every window** and separates nothing.

⚠️ **One sea, 21 stands, 7 independent waves.** The placement's own version of the same split is much weaker —
`pinNow == 0` in 26 of 62 carried and `pinNow > 0` in 27 of 28 lost — so this is **a lead on the take-off, not a law**,
and the next thing to vary is the sea.

### 4.4 Does the conclusion survive?

**The number survives as a statement about the latch, and the conclusion survives in its careful form and not in its
loose one.** #419's mechanism — *the demand leaves the support, the CoP pins at the edge, and from there the contact
cannot put force where the body needs it* — is **exactly what happens at every fall measured here**, on both
populations (§8). What does **not** survive is *"90 of 90"* read as *"every ride pins"*: through a stand, **7 of 21
stands never pin and all 7 are the ones that live.** Pinning is not the condition of riding; it is the event that ends
a ride.

---

## 5. NUMBER 2 — the stance tolerates 10.9°

**The published claim** (#419): *"with the CoM a median 0.676 m above the deck, the stance allows 10.9° of mismatch
between the body's lean and the deck's bank. A turn is worth 20°+."*

The support's half-width across is **`riderPosture.ts:96`'s ±0.130 m**, and the same object is returned for both
`standing` and `landing`, so the only measured input is the CoM's height above the deck.

| | **the placement** | **take-off, seed 2** |
| --- | --- | --- |
| support half-width across, at the stand | **0.130 m** (the only value, in every run) | **0.130 m** (the only value) |
| CoM above the deck **at the stand** | **0.84924 m** | **0.57595 m** |
| → tolerance at the stand | **8.703°** | **12.719°** |
| CoM above the deck, median **through the first second** | **0.69134 m** (0.389–0.859) | **0.66121 m** (0.521–0.868) |
| → tolerance through the first second | **10.650°** (8.611–18.496) | **11.123°** (8.520–13.998) |
| measured \|mismatch\| median | **2.278°** | **1.072°** |
| frames with \|mismatch\| past the tolerance | 307 of 4 952 (6.2 %) | **72 of 1 109 (6.5 %)** |
| stands on which it is ever past | **60 of 90** | **8 of 21** |

**#419's 0.676 m and 10.9° reproduce as the placement's first-second medians** — 0.691 m and 10.650° here, within
0.015 m and 0.25°. **And through a stand the tolerance is the same number: 11.123°.** It is not a placement artefact;
it is a geometric identity on a constant support and a CoM height that both benches share to within 0.03 m.

### 5.1 ⭐ But the pop-up walks the rider down to it, and no placement can see that

Measured on every attached frame of the drive, seed 2:

| phase | frames | support half-width | CoM above the deck | **the tolerance** |
| --- | --- | --- | --- | --- |
| `prone` | 1 764 | **±0.18 m** | 0.124 m | **55.46°** |
| `push` | 903 | **±0.23 m** | 0.260 m | **41.50°** |
| `landing` | 609 | ±0.13 m | 0.478 m | **15.21°** |
| `standing` | 2 049 | ±0.13 m | 0.711 m | **10.36°** |

The pop-up is a **collapse of the stance's own tolerance from 41° to 10°** in the 1.20 s between the press and the
stand, in two steps: the support narrows from ±0.23 to ±0.13 m at the `push` → `landing` transition, and the CoM then
climbs from 0.26 m to 0.71 m. **A placed rider is constructed at the bottom of that ladder and never walks it.** This
is new, and it is the one part of #419's picture a placement structurally cannot reach.

### 5.2 Does the conclusion survive?

**The number survives, and the inference drawn from it does not.** 10.9° is right — 10.650° placed, 11.123° through a
stand — and `riderPosture.ts:96` does fix it for every standing pose, so #419's *"no stance a player can hold changes
it"* is confirmed. But *"a turn is worth 20°+, so the fall is inevitable"* does not follow through a stand: the
**measured** mismatch is a median **1.072°**, it passes the tolerance on **6.5 % of frames** and on **8 of 21 stands**,
and the 13 stands that fall include ones that never pass it. The stance is narrow; the body is not filling it. What
fills it is the event of §8, and the mismatch is a **consequence** of that, not its cause.

---

## 6. NUMBER 3 — the body follows the deck at 0.87, 0.1 s late

**The published claim** (#421): `d(body bank)/d(deck bank)` through the origin = **0.8748**, and *"the follow gain
reaches 1.0000 at a lag of 6 frames = 0.100 s"*. #424 reproduced both (0.8782 and 0.105 s) and then refuted the lag's
**identification** with `BALANCE_DELAY`, leaving the measurement standing.

Computed here by #421's own arithmetic, character for character — `slope = Σ roll[i−lag]·bank[i] / Σ roll[i−lag]²`
pooled over live frames, the crossing linearly interpolated between the bracketing lags.

### 6.1 The positive control first: the instrument reproduces #421

| the placement, 7 118 standing frames | this round | #421 | #424 |
| --- | --- | --- | --- |
| slope at lag 0 | **0.8764** | **0.8748** | 0.8782 |
| the follow gain crosses 1.000 at | **5.90 frames = 0.0983 s** | 6 frames = 0.100 s | 0.105 s |
| median \|mismatch\| at lag 0 | **2.918°** | **2.950°** | 2.951° |
| the body banks the same way as the deck, deck past 2° | **5 759 of 5 901 = 0.976** | **0.976** | — |

**Four quantities, three independent builds, agreement to 0.2 % and 2 ms.** The reader is #421's.

### 6.2 Through a stand: the GAIN survives and the LAG does not exist

| | lag-0 slope | the crossing of 1 | the peak | frames | \|deck roll\| median / max |
| --- | --- | --- | --- | --- | --- |
| **the placement**, every standing frame | **0.8764** | **0.0983 s** | 1.409 at 0.400 s | 7 118 | 15.51° / 90.56° |
| … **on** the plane at both ends | 0.8920 | **0.0849 s** | 1.414 at 0.400 s | 5 497 | 16.21° / 90.08° |
| … **off** the plane at both ends | 0.8352 | **0.1163 s** | 1.697 at 0.400 s | 1 621 | 12.23° / 90.56° |
| **take-off, seed 2**, every standing frame | **0.8668** | **none** | **0.8668 at lag 0** | 2 049 | 1.43° / 69.69° |
| … **on** the plane at both ends | **0.8915** | **none** | 0.8915 at lag 0 | 1 834 | 1.30° / 69.69° |
| … **off** the plane at both ends | **0.7548** | 0.1844 s ⚠️ | 5.88 at 0.400 s ⚠️ | **215 → 40** | 3.68° / 53.09° |
| … deck past 2° at the predictor end | **0.8676** | none | 0.8676 at lag 0 | 901 | 6.27° / 69.69° |
| … deck past 5° at the predictor end | **0.8715** | none | 0.8715 at lag 0 | 543 | 10.35° / 28.95° |

### ⭐ And the plane is not what decides it — the STICK is

**The brief's question was whether the follow and the lag hold off the plane. The placement answers it from the
inside: it crosses 1 in BOTH regimes** — at 0.0849 s on 5 497 planing frames and at **0.1163 s on 1 621 off-plane
frames** — while the take-off crosses in **neither** (robustly on the plane, on a collapsing population off it).
So the 0.1 s is not a property of the plane; it survives the loss of the plane on the placement and does not appear on
the take-off in either regime.

**What separates the two benches is the deck's own motion.** The placement's stick is hard over from frame 1 and its
deck rolls a median **12–16°**; the take-off's stick is zero (or asked only after 0.3 s) and its deck rolls a median
**1.3–1.4°**. A through-origin regression of a follower against a ramp rises with lag until it overshoots; a
regression of two signals that are both small and in step does not. **The 0.1 s lag is a measurement of a body
chasing a hard-over turn, and that is the one thing the owner's first second does not contain.**

**The gain survives, and it is robust.** 0.8668 pooled, 0.8915 on the plane, 0.8676 and 0.8715 when the population is
restricted to the frames that carry the regression's leverage — all within 2 % of the placement's 0.8764 and of #421's
0.8748. A through-origin gain is dominated by its largest |x|, and restricting to deck banks past 2° and past 5°
**does not move it**, which is the check that makes the agreement meaningful rather than lucky.

**The lag does not survive as a crossing.** On the placement the slope *rises* with lag and crosses 1 at 0.098 s. On a
take-off it **peaks at lag 0 and falls monotonically** — 0.867 → 0.810 at 0.1 s → 0.603 at 0.4 s — so there is no lag
at which the body's bank best matches the deck's: **it matches best at zero lag.** The body is not "0.1 s late" on a
take-off; it is in step and 13 % short.

⚠️ **The off-plane row is the one place a crossing appears, and it should not be quoted.** Its slope rises from 0.755
to 1.102 at 0.2 s and 5.88 at 0.4 s **while its population collapses from 215 frames to 40** — the signature of a
predictor decorrelating, not of a lag. Off the plane the honest statement is the lag-0 gain, **0.7548**: the body
follows the deck *less* closely off the plane than on it (0.755 against 0.892), which is the opposite of a body that
is merely late.

### 6.3 #421's other form of the same claim, and #424's refutation of it

`|mismatch| = lag × |deck roll rate|`, as **band medians** (#421 published 40–80 ms on the sea, 73–104 ms on the face):

| \|deck roll rate\| | the placement | take-off, seed 2 |
| --- | --- | --- |
| 0–20 °/s | **193.6 ms** (1 895 frames) | **78.3 ms** (1 122) |
| 20–50 °/s | 88.7 ms (1 409) | 56.6 ms (447) |
| 50–100 °/s | 46.6 ms (2 051) | 46.9 ms (274) |
| 100–200 °/s | 50.1 ms (1 342) | 38.4 ms (155) |
| 200+ °/s | 38.9 ms (331) | 51.2 ms (30) |
| **the per-frame law through the origin** | **B = 37.8 ms, R² = −0.090** | **B = 50.9 ms, R² = 0.303** |

**#424's refutation reproduces on the placement — R² = −0.090, worse than the mean** — and the band medians fall by a
factor of 5 across the bands, which is what a ratio does when it is not a constant. **Through a stand the per-frame
law is weakly positive (R² = 0.303) and the bands are flatter (78 → 38 ms).** Neither population supports
`mismatch = lag × rate` as a law; the take-off's is the less bad of the two.

### 6.4 Does the conclusion survive?

* **"The body already banks with the deck" — SURVIVES**, and strongly. 0.8668 through a stand, 0.883 of frames in the
  same direction. #421's correction of its own brief holds.
* **"What it is instead is LATE" — DOES NOT SURVIVE through a stand.** The follow gain peaks at **lag 0** and declines;
  there is no crossing of 1 at any lag. And the brief's own question is answered against it: the lag is **not** about
  the plane — the placement crosses 1 off the plane too (0.1163 s on 1 621 frames) — it is about the **stick**, which
  drives the placement's deck through 12–16° of roll against the take-off's 1.4°. With the stick at zero the body is
  in step and 13 % short, not 0.1 s behind.
* **"The stance is too narrow for a deck that banks FAST" — not supported here.** The reachable statement on a take-off
  is that the body is 13 % short of the deck at zero lag, not that it arrives 0.1 s behind it.

---

## 7. NUMBER 4 — the demand is 0.327 m outside the feet

**The published claim** (#425): *"when the palm lands, the demand is a median 0.327 m outside the feet — about twice
the board's half-width — past what the palm covers on 159 of 176 palm-down frames"*, against a measured palm ceiling
of **0.10194 m**; and, as its general figures, the demand outside the feet across on **1 075 of 7 208 frames (14.9 %)**
with a median excursion of **0.0891 m** and **0.0071 m on the first escaping frame of a run**.

`outX` here is `save.ts`'s own expression on `desiredCop`, character for character.

| | **the placement** | **take-off, seed 2** |
| --- | --- | --- |
| **at the stand**, the demand is outside the feet | **9 of 90** | **0 of 21** |
| first second: outside **across** | 408 of 4 952 (**8.2 %**) | 163 of 1 109 (**14.7 %**) |
| first second: outside **along** | 154 of 4 952 (3.1 %) | 8 of 1 109 (0.7 %) |
| the excursion over escaping frames | **0.07404 m** | **0.12427 m** |
| … over escaping frames the feet **carry** (≥ 0.5 bw) | **0.03207 m** (272 of 408) | **0.08000 m** (127 of 163) |
| on the **first** escaping frame of a run | **0.00191 m** (63 runs) | **0.01169 m** (13 runs) |
| **per-run peak** excursion across | 0.00133 m | **0.31453 m** |
| **at the fall**, the excursion | **0.09246 m** (66 of 90 outside) | **1.10027 m** (12 of 14 outside) |
| the capture point past the feet at the fall (a different quantity) | 0.28209 m | 0.60975 m |

⚠️ **`outX` has an unbounded tail, and it is a LOAD tail, not a lean tail.** `freeX = local.x − height·j.x/j.y`
diverges as the normal impulse vanishes, so the peaks (6.18 m placed, 2.50 m through a stand) are frames where the
feet carry almost nothing. The load-matched row is the comparable one, and #425's palm-down population was loaded by
construction.

**#425's general figures reproduce on the placement** — 8.2 % of first-second frames escaping against its 14.9 % over
whole rides, a median excursion of 0.074 m against its 0.0891 m, and 0.0019 m on the first escaping frame against its
0.0071 m. **And 0.327 m reproduces through a stand as the per-run PEAK: 0.31453 m.** So the quantity #425 named — the
excursion on the frames where it has run away far enough and long enough for an arm to arrive — is **0.31 m through a
stand against 0.327 m placed.**

### 7.1 Does the conclusion survive?

**SURVIVES, and it strengthens.** #425's two refutations were *"the deck is the wrong surface for this fall"* (a palm's
patch edge can add 0.102 m and no more) and *"the escape an arm can be on time for is a blip too small to matter"*.
Through a stand:

* the first escaping frame of a run carries **0.01169 m** — still a blip, an order of magnitude inside the palm's reach;
* the per-run peak is **0.31453 m**, **3.1× the palm's whole ceiling**;
* at the fall the demand is a median **1.10027 m** outside the feet, **10.8× the ceiling**;
* and the demand is inside the feet at **every one of the 21 stands**, so there is nothing for a hand to answer at the
  moment the rider stands up.

**A deck palm is as far from reaching the take-off's demand as it was from reaching the placement's, and further.**

---

## 8. Which constraint goes first — the measurement `rawMargin` could not make

Part 13.4 of #429's README left this open: *"`rawMargin` still cannot name which constraint went (it is a filtered
minimum of three headrooms). Reading the three separately through that pair is the measurement that would."* Here they
are, read separately, with the engine's own scalar as their control.

`project` (`:5389–5393`) builds three headrooms and keeps the **least**: `across` (the demand against the support's
edges across), `along` (only past a foot toward the support's end) and the **grip** (`1 − tangential/friction`).
`balanceMargin`, the column every earlier trace called *the margin*, is that minimum **low-passed** (`:5050`).

| | **the placement** | **take-off, seed 2** |
| --- | --- | --- |
| **at the stand**: across / along / grip | 0.9889 / 1.0000 / **0.8180** | 0.9693 / 1.0000 / **0.8991** |
| which of the three is lowest, per run | grip 57, across 24, along 9 | **grip 18**, across 3 |
| **at the fall**: across / along / grip | **−0.7113** / 1.0000 / 0.6337 | **−8.4636** / 1.0000 / 0.6522 |
| which is lowest at the fall | **across 70**, along 16, grip 4 | **across 12**, along 2 |
| the capture test's own three (`balanceLimits`), at the fall | margin 79, grip 11 | **margin 14 of 14** |

> **It is `across`, and `along` is not involved at all.** At the fall the lateral headroom is **negative** — the demand
> is outside the support edge, which is the same event as `tip` — in 70 of 90 placed runs and 12 of 14 take-off falls,
> while `along` sits at exactly **1.0000** in both populations at both frames. The grip falls with it but stays
> positive (0.63–0.65), so the feet never run out of friction. And `human.fallen` — the capture point alone, the test
> that actually ends a free-body ride — is what binds: `margin` in 14 of 14 take-off falls.

**At the stand the lowest of the three is the GRIP**, on both populations (18 of 21 and 57 of 90), with `across` at
0.97–0.99. So the stand does not begin near its lateral limit; it begins with about 10–18 % of its friction spent.

### 8.1 The same-wave, same-stand, opposite-outcome pair, read through the three

Seed 2, wave 1: the stand is identical to the frame in all three scripts, the no-stick script carries the 3 s window,
and both turn scripts fall. ⚠️ **The turn scripts send `steer: ±1` AND `compress: 1` together while the neutral script
sends neither, so this pair cannot separate the steer from the Compress** (`cueL` against `cueR` is the only clean
contrast, direction at equal compression). Nothing below is a verdict on turning — the owner cannot judge a turn while
he falls in under a second, and **the actual turn and climb stay pending.**

| t after the stand | `cue` (nothing asked) | `cueL` (steer + Compress) |
| --- | --- | --- |
| +0.30 s (the ask begins) | across 0.9416, along 1.0000, grip 0.9642, `limit` none | **identical** |
| +0.50 s | across 0.9724, along 1.0000, grip 0.9544 | across 0.9371, along 1.0000, grip 0.9301 |
| **+0.60 s** | across 0.9428, along 1.0000, grip 0.9630, `limit` **none** | **across −0.1233**, along 1.0000, grip 0.7323, `limit` **tip**, outX 0.0160 m |
| +0.70 s | across 0.9900, along 1.0000, grip 0.9158 | **across −0.3750**, grip 0.4939 — gone, `'balance'` |
| … to +3.00 s | across 0.81–0.99 throughout, `limit` none at every frame, roll to 16.7° | — |

**The constraint that goes is `across`, 0.3 s after the ask begins, with `along` untouched at 1.0000 and the grip still
holding half its friction.** That is the measurement Part 13.4 asked for.

---

## 9. The controls, each with its own number

| control | what a break would look like | **result** |
| --- | --- | --- |
| **the address arrived** | the default Canyon and the default rider, measured in silence | grid **400 × 451 = 180 400** off the solver on every run; the five switches parsed exactly as typed; `seaDiffs` empty; the process exits non-zero otherwise |
| **the three headrooms are the engine's own** | a recomputation that is not `project`'s arithmetic | **take-off: 3 155 of 3 155** window frames reproduce `rawMargin` exactly. **Placement: 12 066 of 12 070** — and the 3 distinct frames that miss are all `loadedNow == 0` with the feet carrying **0.020–0.095 bw**, where `desiredCop` is a stale substep by construction. The control named its own failure mode |
| **the pinned share cannot fail** | a monotone latch read as a share | **proved a latch by measurement**: 0 of 2 028 and 0 of 3 565 following frames return to zero (§4.1) |
| **a frozen column read as live** | every rider column freezes at separation (`separate` never clears `phase`/`upright`) | every run stops at its first `attached === 0`; the fall is read off `atFall`, the last attached frame. Seed 2: **2 049 standing attached frames kept in 21 runs**; placement: **7 118 in 90** |
| **a censored window read as a ride** | #429's `TRIAL = 16` retired wave 6 on its standing frame | `TRIAL = 20`; **0 of 21 seed-2 stands censored**, post-stand exposure a median 3.000 s, the first second available in 21 of 21 |
| **cross-build against the published population** | this round's `src` (`main`'s) not being #429's rider | **426 shared summary values over 33 aligned runs, 0 differ** against #429's own committed `seed2-summaries.jsonl`. The only 3 differences are the `face` column on a rider that never stood — a running maximum over a life `TRIAL` lengthens, reported apart |
| **determinism across processes** | a bench that does not repeat | **5 093 summary values over 33 runs, 0 differ** between two separate processes running the same bundle at the same seed |
| **the positive control for the instrument** | a reader that cannot see what it claims to measure | the placement reproduces **#419's causes (balance 89, lost board 1, foot slip 0)**, **#419's `tip` 90 of 90**, **#421's 0.8748 → 0.8764**, **#421's 0.100 s → 0.0983 s**, **#421's 2.950° → 2.918°**, **#421's 0.976 → 0.976**, and **#425's 7 208 frames → 7 208 rows** |
| **the probe is inert** | the probe's own reads changing the drive | `PROBE=off` removes the two `renderPoint` reads and the one `sampleAt`, and builds no row, while every measured column is computed identically — see `results/probe-inertness.txt` |
| **the zsh integer trap** | `SECONDS=0.5` arriving as `"0"`, every run ending at frame 1 under a tidy summary | the probe has no `SECONDS`; every invocation uses `env` |
