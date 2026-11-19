# The four headline numbers, re-measured through a stand

**Measurement only.** Nothing under `src/`. No behaviour, no constant, no switch. One probe
(`four-numbers.ts`), one reader (`four-numbers-read.py`), two populations measured by the same instrument on the same build.

PR #429 found why every bench on this track disagrees with the owner, and marked four published numbers conditional:

> The mount seeds `planing` from |world velocity| > 4, so every PLACED rider at ≥ 4 m/s is on the plane from frame 1
> with a 17–69° lean cap — while a pop-up mounts prone and the latch's test is speed THROUGH THE WATER, which a caught
> board does not sustain. So `tip` 90/90, the 10.9° stance, the 0.1 s lag and the 0.327 m demand are statements about
> a bench, not about his game, until re-measured through a stand.

This round re-measures all four **through the game's own take-off**, and re-measures them **on the placement too, with
the same instrument**, so that each comparison is one bench read twice rather than two papers compared.

**The answer, in six lines** (Canyon B, Medium; **39 stands over two seas** and **90 placed riders**; the owner's
address, no new switches):

1. ⭐⭐ **The brief's premise is a fact about one sea.** On seed 2 the take-off is planing for **80.6 %** of the first
   second — **more than the placement's 74.8 %** — and the lean cap is a median **0.53 rad**, not zero. The regime is
   set **wave by wave** by the board's speed through the water against `PLANING_SPEED = 4`. ⚠️ **And a parallel round
   on this branch narrows what the cap buys**: with the stick at zero the request it bounds is zero anyway
   (`ask` non-zero in **0 of 452** and **0 of 829** frames, measured here too), so the regime reaches the **board**,
   not the rider's lean (§3, §13).
2. ⭐ **And on seed 1 the published 18.0 % should read 34.5 %**: `TRIAL = 16` censored wave 6, which is the planing one.
3. ☠️ **The published pinned share is a LATCH, proved by measurement** — it returns to zero on **0 of 6 717** following
   frames — and on a take-off it flips **before the stand**, in `landing`, on 36 of 39. 52.0 % and 89.8 % cannot be
   quoted again in that form.
4. ⭐ **`tip`'s mechanism survives and its universality does not.** The **lateral** headroom is the one that goes at
   **29 of 31** take-off falls (two escape *along* instead, and are reported) — but **10 of 39 stands never pin, and
   all 10 carry the first second.**
5. ⭐ **10.9° and 0.327 m both survive.** The tolerance is **11.1–11.3°** through a stand against 10.650° placed, and
   the per-run peak demand is **0.315–0.318 m** against 0.327 m placed, on two independent seas.
6. ⭐ **0.87 survives; 0.1 s does not.** The follow gain is **0.78–0.87** through a stand and **does hold off the
   plane, 13 % weaker** — but the 0.100 s crossing appears only on the placement, and it tracks the **stick**, not the
   plane.

**Every number here passes a positive control that reproduces the papers it is read against**, and the one control
that failed named its own failure mode (§9).

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

**The three populations, with their sizes**, since every figure below carries one of them:

| population | runs | stands | standing frames kept | first-second frames | observed falls |
| --- | --- | --- | --- | --- | --- |
| **take-off, seed 1** (12 waves, 6 lit the cue) | 36 | **18** | 1 216 | 896 | 17 |
| **take-off, seed 2** (11 waves, 7 lit the cue) | 33 | **21** | 2 049 | 1 106 | 14 |
| **the placement**, seed 1, stick hard over | 90 | **90** | 7 118 | 4 952 | 90 |

`STAND_HOLD = 3` s, `TRIAL = 20` s, `PLACED_FOR = 4` s. **0 of 39 take-off stands are censored** and the first second
is available in 39 of 39.

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

**Every median here is a PLAIN median** — the mean of the two middle values at even length — in `four-numbers.ts` and
`four-numbers-read.py` alike. Every share carries the count it is a share of.

---

## 3. ⭐ The premise itself is a fact about ONE SEA, and on the other sea it inverts

Everything in #429's Part 4 — and therefore the brief that sent this round — rests on one claim: that a take-off is off
the plane where a placement is on it, so the lean a take-off rider may ask for is zero. **Measured on a second sea,
that inverts.**

| the first second after the stand | **the placement** (90 riders, stick hard over) | **take-off, seed 1** (18 stands) | **take-off, seed 2** (21 stands) |
| --- | --- | --- | --- |
| planing at the **first standing frame** | **66 of 90** | **6 of 18** | **15 of 21** |
| planing **through** the first second | **74.8 %** of 4 952 frames | **34.5 %** of 896 frames | **80.6 %** of 1 106 frames |
| median `leanProbe.cap` | 0.6193 rad | **0.0000 rad** | **0.5342 rad** |
| frames with a non-zero lean **ask** | 3 882 of 4 952 | 132 of 896 | 429 of 1 106 |
| *#429's own figures, same sea* | — | *6 of 18; **18.0 %** of 716; 0.000; 48 of 716* | — |

**On seed 2 the take-off is on the plane for MORE of its first second than the placement is** — 80.6 % against 74.8 % —
and the lean the rider **may** ask for is a median 0.53 rad (30.6°) against the placement's 0.62 rad (35.5°). The
regime gap #429 measured is real on seed 1 and **absent on seed 2.**

> ⚠️⚠️ **And a parallel round on this branch has already narrowed what that buys, correctly.** `stand.md` §4.1 found
> that the cap bounds `wantRef`/`wantOwn`, which are `steer × railRange` plus the hand — **so with the stick at zero
> the request is zero whatever the cap is**, and the latch has no consequence for the rider's lean. **That reproduces
> exactly on both of this round's seas**, independently measured: on the `cue` script, `leanProbe.ask` is non-zero in
> **0 of 452** seed-1 and **0 of 829** seed-2 standing frames, while `leanProbe.cap` is non-zero in **224** and **739**
> of those same frames. With the stick over it does bind — `ask` non-zero in 141 of 403, 109 of 361, 359 of 595 and
> 389 of 625 on the four turn-script populations.
>
> **So the two rounds correct two different links in #429's chain, and both are needed.** #429 argued *off the plane →
> cap 0 → the lean a rider may ask for is exactly 0*. This round shows the **regime** premise is a fact about one sea;
> the parallel round shows the **consequence** does not follow even where the premise holds, because a stick-zero
> rider asks for nothing regardless. What the regime still governs is the **board** — its speed through the water, its
> wetted area, and whether the deck is clear — which is `stand.md`'s own conclusion, and this round's §4.3 and §7
> agree with it from the fall's side.

### ⚠️ And on seed 1 it was overstated, by its own censoring

#429's seed-1 figure is **18.0 % of 716 frames**; the same sea, same address, same arm here reads **34.5 % of 896**.
The difference is exactly the censored wave. `TRIAL = 16` retired wave 6 on its standing frame, and **wave 6 is the
planing one** — its three stands are planing in 61 of 61 frames each. 716 + 183 = 899 ≈ 896, and
0.180 × 716 + 183 = 312 ≈ 309. **So the harness dropped the one planing wave and halved the statistic that the
round's central claim rests on.** The claim's direction is unaffected on this sea; its size was double what was
published.

### ⭐ And the censored wave, resolved: it DID ride the window out — with nothing asked

#429's Part 13 withdrew *"wave 6 rode the 3 s out"* because `TRIAL = 16` retired the trial on wave 6's standing frame,
making it a non-observation. **With `TRIAL = 20` the same three riders on the same sea are followed, and:**

| seed 1, wave 6 (stands at 16.0167 s) | outcome |
| --- | --- |
| `cue` — nothing asked | **no fall: it rode the whole 3 s window out** |
| `cueL` — full steer + Compress | fell **2.4333 s** after the stand |
| `cueR` — full steer + Compress | fell **1.7333 s** after the stand |

**So the claim was unsupported as published and is true as measured, for the no-stick script.** It is also the only
seed-1 stand that carries the window, and it is one of the two planing ones. ⚠️ The turn scripts send `steer: ±1`
**and** `compress: 1` together while the neutral script sends neither, so this trio cannot separate the steer from the
Compress, and **nothing here is a verdict on turning** — the actual turn and climb stay pending.

### Why, in the engine's own terms — and it is not placement versus take-off

Both paths test the **same** number, `PLANING_SPEED = 4` m/s. The mount (`:2857`) tests `board.velocity.length()`, the
board's speed over the ground; `planingStep` (`:3495`) tests `hypot(vx − flowX, vz − flowZ)`, its speed **through the
water**. So:

* the **placement** is on the plane at frame 1 **iff its entry exceeds 4 m/s** — and it is off the plane at frame 1 in
  **24 of 90** runs here, because 2 of its 10 entries (2 and 3 m/s) are below the threshold. A placement is not
  uniformly "on the plane from frame 1"; it is on the plane when it is fast enough, like anything else;
* the **take-off** is on the plane when the caught board sustains 4 m/s **through the water** — and at the stand, on
  seed 2's seven cue waves, it makes **4.19, 4.35, 4.41, 4.52 and 4.64 m/s** on five of them (planing, cap
  0.378–0.454 rad) against **2.36 and 3.73** on the other two (cap exactly 0). On seed 1's six cue waves it clears the
  threshold on **two** (waves 6 and 10, cap 0.436–0.642 rad) and misses on four (cap exactly 0).

> **So #429's "a caught board does not sustain 4 m/s through the water" is false on five of seven of seed 2's cue
> waves, by 0.19–0.64 m/s, and on two of six of seed 1's.** The regime is decided **wave by wave**, by the board's
> speed through the water at the stand — not by whether the rider was placed or popped up. What seed 1 measured was a
> sea on which most caught waves fall below the threshold; seed 2 is a sea on which most clear it.

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
| **the take-off, seed 1** | **0 of 1 124** following standing frames, in 18 of 18 runs |
| **the take-off, seed 2** | **0 of 2 028** following standing frames, in 21 of 21 runs |
| **the placement** | **0 of 3 565** following standing frames, in 90 of 90 runs |

> **It is a latch, not a share of pinned frames.** "Pinned in 89.8 % of the first second" means *"the first tip substep
> happened before 10.2 % of the way into the window"*, and nothing more. A high share is **guaranteed** by an early
> flip, which is the shape of metric this project keeps catching itself on.

**And on a take-off the flip is not even in the stand.** It goes positive **before** the stand in **21 of 21** seed-2
stands and **15 of 18** seed-1 stands — in the `landing` phase every time — so the first second's "pinned" share is a
memory of the pop-up's own landing, inherited by a window it is then attributed to. A placement cannot show this,
because a placement's mount *is* its first standing frame.

### 4.2 The three honest readings, side by side

| the first second after the stand | **the placement** | **take-off, seed 1** | **take-off, seed 2** |
| --- | --- | --- | --- |
| `limit === 'tip'` ever fired (per run) | **88 of 90** | **17 of 18** | **14 of 21** |
| `limitTime.tip > 0` ever (the published test) | **90 of 90** | 18 of 18 | 21 of 21 |
| the raw demand outside the support box, ever | 88 of 90 | 17 of 18 | 14 of 21 |
| first `tip`, median after the stand | **0.7500 s** | **0.4333 s** | **0.5083 s** |
| share of frames `limit === 'tip'` | **10.5 %** (520 of 4 952) | **21.3 %** (191 of 896) | **15.0 %** (166 of 1 106) |
| share of frames `limitTime.tip > 0` | 37.9 % | 91.7 % | 100.0 % |
| memory ÷ now | **3.61** | 4.30 | 6.66 |
| frames outside the box that `limit` does **not** call `'tip'` (masked by `'impact'`) | **13 of 531** | 0 of 191 | 0 of 166 |

**`tip` 90 of 90 reproduces exactly on the placement — as the latch.** Read as `limit === 'tip'`, the same 90 riders
give **88 of 90**; read as the geometry, 88 of 90. So the published figure was the latch's, and the latch's own value
is 90 of 90: the number is right about *what it measured*.

**Through a stand it is 17 of 18 on seed 1 and 14 of 21 on seed 2.** The stands that never pin are the ones that
live. And #429's own published pinned share for seed 1, **89.8 %**, reproduces here as **91.7 %** — the latch again,
on the sea it was taken from.

### 4.3 ⭐ What the instantaneous pin does instead, on 39 stands over two seas

Part 13.3 of #429's README flagged this on 7 stands. On 39:

| | stands | carried the first second | lost inside it |
| --- | --- | --- | --- |
| **seed 2**, `pinNow == 0` | **8** | **8** | **0** |
| **seed 2**, `pinNow > 0` | **13** | **0** | **13** |
| **seed 1**, `pinNow == 0` | **2** | **2** | **0** |
| **seed 1**, `pinNow > 0` | **16** | **4** | **12** |
| **both seas**, `pinNow > 0` | **29** | 4 | **25** |
| **both seas**, `pinNow == 0` | **10** | **10** | **0** |

**The implication holds one way, 10 of 10: a stand never instantaneously pinned inside the window never loses it.**
Seven ride the whole 3 s out and the others go at 1.7–2.4 s. The converse is weaker — 29 pinned stands, of which 25
are lost inside the second and 4 carry it — so pinning is necessary for a fall in this window and not sufficient. The
latch, over the same 39 stands, reads **91.7–100 % of every window** and separates nothing.

⚠️ **Two seas, 39 stands, 13 independent waves.** The placement's own version is much weaker — `pinNow == 0` in 26 of
62 carried and `pinNow > 0` in 27 of 28 lost — so this is **a lead on the take-off, not a law**, and the next thing to
vary is the spot and the size.

### 4.4 Does the conclusion survive?

**The number survives as a statement about the latch, and the conclusion survives in its careful form and not in its
loose one.** #419's mechanism — *the demand leaves the support, the CoP pins at the edge, and from there the contact
cannot put force where the body needs it* — is **exactly what happens at every fall measured here**, on all three
populations (§8). What does **not** survive is *"90 of 90"* read as *"every ride pins"*: through a stand, **10 of 39
stands never pin and all 10 are the ones that carry the first second.** Pinning is not the condition of riding; it is
the event that ends a ride. And the **share** that carried the claim's weight in #421 and #429 — 52.0 % and 89.8 % —
is a latch, not a share, so **it should not be quoted again in either paper's form.** The honest readings are
`limit === 'tip'` (10.5–21.3 % of the first second) and the geometry (identical to it within 13 frames of 531).

---

## 5. NUMBER 2 — the stance tolerates 10.9°

**The published claim** (#419): *"with the CoM a median 0.676 m above the deck, the stance allows 10.9° of mismatch
between the body's lean and the deck's bank. A turn is worth 20°+."*

The support's half-width across is **`riderPosture.ts:96`'s ±0.130 m**, and the same object is returned for both
`standing` and `landing`, so the only measured input is the CoM's height above the deck.

| | **the placement** | **take-off, seed 1** | **take-off, seed 2** |
| --- | --- | --- | --- |
| support half-width across, at the stand | **0.130 m** (the only value, in every run) | **0.130 m** | **0.130 m** |
| CoM above the deck **at the stand** | **0.84924 m** | **0.56008 m** | **0.57595 m** |
| → tolerance at the stand | **8.703°** | **13.067°** | **12.719°** |
| CoM above the deck, median **through the first second** | **0.69134 m** (0.389–0.859) | **0.65342 m** (0.511–0.861) | **0.66121 m** (0.521–0.868) |
| → tolerance through the first second | **10.650°** (8.611–18.496) | **11.252°** (8.590–14.265) | **11.123°** (8.520–13.998) |
| measured \|mismatch\| median | **2.278°** | **3.113°** | **1.072°** |
| frames with \|mismatch\| past the tolerance | 307 of 4 952 (6.2 %) | **136 of 896 (15.2 %)** | **72 of 1 109 (6.5 %)** |
| stands on which it is ever past | **60 of 90** | **16 of 18** | **8 of 21** |
| load at the stand / front SHARE OF LOAD | 0.998 bw / 0.7266 | **1.034 bw / 0.6656** | 0.805 bw / 0.3431 |

*(#429 reports the seed-1 stand at load **1.03 bw** and front share **0.666**; this round reads **1.034** and
**0.6656** on the same sea. ⚠️ `front` is the **share of load** on the front foot, not a position — the
deck-relative foot speed is exactly **0 in all 2 049 standing frames** and `inContact` is true in 2 049 of 2 049, so
nothing slides.)*

**#419's 0.676 m and 10.9° reproduce as the placement's first-second medians** — 0.691 m and 10.650° here, within
0.015 m and 0.25°. **And through a stand the tolerance is the same number: 11.123°.** It is not a placement artefact;
it is a geometric identity on a constant support and a CoM height that both benches share to within 0.03 m.

### 5.1 ⭐ But the pop-up walks the rider down to it, and no placement can see that

Measured on every attached frame of the drive, both seas (seed 1 / seed 2):

| phase | frames | support half-width | CoM above the deck | **the tolerance** |
| --- | --- | --- | --- | --- |
| `prone` | 2 076 / 1 764 | **±0.18 m** | 0.124 / 0.124 m | **55.46° / 55.46°** |
| `push` | 774 / 903 | **±0.23 m** | 0.250 / 0.260 m | **42.61° / 41.50°** |
| `landing` | 522 / 609 | ±0.13 m | 0.474 / 0.478 m | **15.33° / 15.21°** |
| `standing` | 1 216 / 2 049 | ±0.13 m | 0.653 / 0.711 m | **11.25° / 10.36°** |

The pop-up is a **collapse of the stance's own tolerance from 41° to 10°** in the 1.20 s between the press and the
stand, in two steps: the support narrows from ±0.23 to ±0.13 m at the `push` → `landing` transition, and the CoM then
climbs from 0.26 m to 0.71 m. **A placed rider is constructed at the bottom of that ladder and never walks it.** This
is new, and it is the one part of #419's picture a placement structurally cannot reach.

### 5.2 Does the conclusion survive?

**The number survives, and the inference drawn from it does not.** 10.9° is right — **10.650° placed, 11.252° and
11.123° through a stand** — and `riderPosture.ts:96` does fix the half-width for every standing pose, so #419's *"no
stance a player can hold changes it"* is confirmed by measurement (0.130 m is the only value in every run of all three
populations). But *"a turn is worth 20°+, so the fall is inevitable"* does not follow through a stand: the
**measured** mismatch is a median **3.113°** on seed 1 and **1.072°** on seed 2 — a third to a seventh of the
tolerance — and it passes the tolerance on 15.2 % and 6.5 % of frames. On seed 2 only **8 of 21** stands ever pass it,
and 13 fall. **The stance is narrow and the body is not filling it.** What fills it is the event of §8, and the
mismatch is a **consequence** of the demand leaving the feet, not its cause.

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

### 6.2 Through a stand: the GAIN survives and the 0.100 s does not reproduce

| | lag-0 slope | the crossing of 1 | the peak | frames | \|deck roll\| median / max |
| --- | --- | --- | --- | --- | --- |
| **the placement**, every standing frame | **0.8764** | **0.0983 s** | 1.409 at 0.400 s | 7 118 | 15.51° / 90.56° |
| … **on** the plane at both ends | 0.8920 | **0.0849 s** | 1.414 at 0.400 s | 5 497 | 16.21° / 90.08° |
| … **off** the plane at both ends | 0.8352 | **0.1163 s** | 1.697 at 0.400 s | 1 621 | 12.23° / 90.56° |
| **take-off, seed 1**, every standing frame | **0.7823** | **0.2381 s** | 1.025 at 0.267 s | 1 216 | 5.05° / 85.69° |
| … **on** the plane at both ends | **0.8435** | **none** | 0.8807 at 0.400 s | 558 | 2.37° / 55.35° |
| … **off** the plane at both ends | **0.7499** | **0.1689 s** | 1.500 at 0.400 s | **658 → 370** | 6.74° / 85.69° |
| … deck past 2° at the predictor end | 0.7826 | 0.2390 s | 1.020 at 0.267 s | 615 | 17.92° / 85.69° |
| **take-off, seed 2**, every standing frame | **0.8668** | **none** | **0.8668 at lag 0** | 2 049 | 1.43° / 69.69° |
| … **on** the plane at both ends | **0.8915** | **none** | 0.8915 at lag 0 | 1 834 | 1.30° / 69.69° |
| … **off** the plane at both ends | **0.7548** | 0.1844 s ⚠️ | 5.88 at 0.400 s ⚠️ | **215 → 40** | 3.68° / 53.09° |
| … deck past 2° at the predictor end | **0.8676** | none | 0.8676 at lag 0 | 901 | 6.27° / 69.69° |
| … deck past 5° at the predictor end | **0.8715** | none | 0.8715 at lag 0 | 543 | 10.35° / 28.95° |

**The gain survives on both seas and in both regimes, and it splits cleanly by the plane:** **0.7499 and 0.7548 off
the plane** (two seas, independently), **0.8435 and 0.8915 on it**, against the placement's 0.8352 off and 0.8920 on
and #421's 0.8748. **Off the plane the body follows the deck about 0.75 for 1; on the plane, about 0.85–0.89.** That is
a real, reproducible regime effect on the gain — and it is the brief's own question answered: the follow **does** hold
off the plane, 13 % weaker.

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

**The gain is robust to the regression's own weakness.** A through-origin gain is dominated by its largest |x|, so it
is also reported restricted to the frames that carry the leverage: on seed 2 the deck-past-2° and deck-past-5°
populations give 0.8676 and 0.8715 against the pooled 0.8668, and on seed 1 the deck-past-2° population gives 0.7826
against 0.7823. **Restricting to the leverage does not move it**, which is the check that makes the agreement with
0.8748 meaningful rather than lucky.

**The 0.100 s lag does not reproduce through a stand.** Where a crossing exists at all it is at **0.169–0.238 s**, and
on the plane there is **no crossing on either sea** — on seed 2 the slope peaks at lag 0 and falls monotonically
(0.867 → 0.810 at 0.1 s → 0.603 at 0.4 s), so the body's bank matches the deck's **best at zero lag**. The published
0.100 s is reproduced **only on the placement** (0.0983 s here, 0.100 s in #421, 0.105 s in #424).

⚠️ **And the crossings that do appear should be read with their populations.** Every one of them comes with a slope
that keeps climbing past 1 while its frame count falls — seed 1 off-plane 658 → 370 frames reaching 1.50, seed 2
off-plane 215 → 40 reaching 5.88 — which is the signature of a predictor **decorrelating**, not of a longer lag. At
0.4 s a 60 Hz deck has moved on; a slope of 5.88 is not a measurement of anything. The quantity to carry forward is
the **lag-0 gain**, which is stable on every population measured.

### 6.3 #421's other form of the same claim, and #424's refutation of it

`|mismatch| = lag × |deck roll rate|`, as **band medians** (#421 published 40–80 ms on the sea, 73–104 ms on the face):

| \|deck roll rate\| | the placement | take-off, seed 1 | take-off, seed 2 |
| --- | --- | --- | --- |
| 0–20 °/s | **193.6 ms** (1 895 frames) | 82.4 ms (374) | **78.3 ms** (1 122) |
| 20–50 °/s | 88.7 ms (1 409) | 93.1 ms (299) | 56.6 ms (447) |
| 50–100 °/s | 46.6 ms (2 051) | 68.9 ms (194) | 46.9 ms (274) |
| 100–200 °/s | 50.1 ms (1 342) | 49.7 ms (245) | 38.4 ms (155) |
| 200+ °/s | 38.9 ms (331) | 22.8 ms (85) | 51.2 ms (30) |
| **the per-frame law through the origin** | **B = 37.8 ms, R² = −0.090** | **B = 44.0 ms, R² = −0.164** | **B = 50.9 ms, R² = 0.303** |
| the body banks the same way, deck past 2° | 0.976 | **0.915** | **0.883** |

**#424's refutation reproduces on two of the three populations — R² = −0.090 placed and −0.164 on seed 1, both worse
than the mean** — and the band medians fall by a factor of 5 across the bands, which is what a ratio does when it is
not a constant. Only seed 2 is weakly positive (R² = 0.303). **No population supports `mismatch = lag × rate` as a
law**, and #421's 40–80 ms band range reproduces (23–93 ms across both take-off seas) **as band medians only**, which
is exactly what #424 said it was.

### 6.4 Does the conclusion survive?

* **"The body already banks with the deck" — SURVIVES**, on both seas and in both regimes. 0.7823 and 0.8668 pooled
  through a stand, 0.915 and 0.883 of frames in the same direction, and the gain is unmoved by restricting to the
  frames that carry the leverage. #421's correction of its own brief holds, and it is the single most durable of the
  four numbers.
* ⭐ **The brief's own question — does it hold off the plane? — is answered YES, 13 % weaker.** 0.7499 (seed 1, 658
  frames) and 0.7548 (seed 2, 215 frames) off the plane against 0.8435 and 0.8915 on it, with the placement reading
  0.8352 off and 0.8920 on. **The plane costs the follow about a tenth of its gain and does not remove it.**
* **"What it is instead is 0.1 s LATE" — DOES NOT SURVIVE through a stand.** The crossing is at **0.169–0.238 s**
  where it exists and **absent on the plane on both seas**; 0.100 s reproduces only on the placement. And the
  crossings that remain are all accompanied by a slope climbing past 1 on a collapsing population, so they are
  decorrelation, not lag.
* **And the lag is not about the plane either** — the placement crosses 1 off the plane too (0.1163 s on 1 621 frames)
  — **it tracks the stick**, which drives the placement's deck through a median 12–16° of roll against the
  take-off's 1.4–5.0°. The 0.100 s is a measurement of a body chasing a hard-over turn.
* **"The stance is too narrow for a deck that banks FAST" — not supported here.** The reachable statement on a
  take-off is that the body is 13–22 % short of the deck at zero lag, not that it arrives 0.1 s behind it.

---

## 7. NUMBER 4 — the demand is 0.327 m outside the feet

**The published claim** (#425): *"when the palm lands, the demand is a median 0.327 m outside the feet — about twice
the board's half-width — past what the palm covers on 159 of 176 palm-down frames"*, against a measured palm ceiling
of **0.10194 m**; and, as its general figures, the demand outside the feet across on **1 075 of 7 208 frames (14.9 %)**
with a median excursion of **0.0891 m** and **0.0071 m on the first escaping frame of a run**.

`outX` here is `save.ts`'s own expression on `desiredCop`, character for character.

| | **the placement** | **take-off, seed 1** | **take-off, seed 2** |
| --- | --- | --- | --- |
| **at the stand**, the demand is outside the feet | **9 of 90** | **0 of 18** | **0 of 21** |
| first second: outside **across** | 408 of 4 952 (**8.2 %**) | 191 of 896 (**21.3 %**) | 163 of 1 109 (**14.7 %**) |
| first second: outside **along** | 154 of 4 952 (3.1 %) | **0 of 896** | 8 of 1 109 (0.7 %) |
| the excursion over escaping frames | **0.07404 m** | **0.07432 m** | **0.12427 m** |
| … over escaping frames the feet **carry** (≥ 0.5 bw) | **0.03207 m** (272 of 408) | **0.05349 m** (159 of 191) | **0.08000 m** (127 of 163) |
| on the **first** escaping frame of a run | **0.00191 m** (63 runs) | **0.01616 m** (16 runs) | **0.01169 m** (13 runs) |
| **per-run peak** excursion across | 0.00133 m | **0.31827 m** | **0.31453 m** |
| **at the fall**, the excursion | **0.09246 m** (66 of 90 outside) | **0.01228 m** (11 of 17 outside) | **1.10027 m** (12 of 14 outside) |
| the capture point past the feet at the fall (a different quantity) | 0.28209 m | 0.40861 m | 0.60975 m |

⚠️ **`outX` has an unbounded tail, and it is a LOAD tail, not a lean tail.** `freeX = local.x − height·j.x/j.y`
diverges as the normal impulse vanishes, so the peaks (6.18 m placed, 2.50 m through a stand) are frames where the
feet carry almost nothing. The load-matched row is the comparable one, and #425's palm-down population was loaded by
construction.

**#425's general figures reproduce on the placement** — 8.2 % of first-second frames escaping against its 14.9 % over
whole rides, a median excursion of 0.074 m against its 0.0891 m, and 0.0019 m on the first escaping frame against its
0.0071 m. **And 0.327 m reproduces through a stand as the per-run PEAK: 0.31827 m on seed 1 and 0.31453 m on seed 2**,
within 3 % of each other on two independent seas. So the quantity #425 named — the excursion on the frames where it
has run away far enough and long enough for an arm to arrive — is **0.31–0.32 m through a stand against 0.327 m
placed.** That is the closest like-for-like this round can offer, because the palm-down population itself exists only
on #425's branch.

### 7.1 Does the conclusion survive?

**SURVIVES, and it strengthens.** #425's two refutations were *"the deck is the wrong surface for this fall"* (a palm's
patch edge can add 0.102 m and no more) and *"the escape an arm can be on time for is a blip too small to matter"*.
Through a stand:

* the first escaping frame of a run carries **0.01169 m** (seed 2) and **0.01616 m** (seed 1) — still a blip, an order
  of magnitude inside the palm's reach;
* the per-run peak is **0.315–0.318 m**, **3.1× the palm's whole ceiling**;
* at the fall the demand is a median **1.10027 m** outside the feet on seed 2, **10.8× the ceiling**;
* and the demand is inside the feet at **every one of the 39 stands on both seas**, so there is nothing for a hand to
  answer at the moment the rider stands up.

⚠️ **One figure moves the other way and is reported rather than smoothed:** at the fall, seed 1's demand is a median
**0.01228 m** — *inside* a palm's reach — against seed 2's 1.10027 m. The two seas' falls are not the same event:
seed 1's are off-plane stands on a buried board (`feet under water` in 12 of 18) that go quietly, and seed 2's are
planing stands that run away. **The claim rests on the peak and on the fall of the sea that runs away, not on both.**

**A deck palm is as far from reaching the take-off's demand as it was from reaching the placement's, and further.**

---

## 8. Which constraint goes first — the measurement `rawMargin` could not make

*(⭐ A parallel round on this branch reached the same answer independently and from a different instrument; see §13.)*

Part 13.4 of #429's README left this open: *"`rawMargin` still cannot name which constraint went (it is a filtered
minimum of three headrooms). Reading the three separately through that pair is the measurement that would."* Here they
are, read separately, with the engine's own scalar as their control.

`project` (`:5389–5393`) builds three headrooms and keeps the **least**: `across` (the demand against the support's
edges across), `along` (only past a foot toward the support's end) and the **grip** (`1 − tangential/friction`).
`balanceMargin`, the column every earlier trace called *the margin*, is that minimum **low-passed** (`:5050`).

| | **the placement** | **take-off, seed 1** | **take-off, seed 2** |
| --- | --- | --- | --- |
| **at the stand**: across / along / grip | 0.9889 / 1.0000 / **0.8180** | 0.9150 / 1.0000 / **0.8978** | 0.9693 / 1.0000 / **0.8991** |
| which of the three is lowest, per run | grip 57, across 24, along 9 | **grip 12**, across 6 | **grip 18**, across 3 |
| the capture test's own three at the stand | knee 64, grip 26 | **knee 18 of 18** | knee 18, margin 3 |
| **at the fall**: across / along / grip | **−0.7113** / 1.0000 / 0.6337 | **−0.0945** / 1.0000 / 0.7161 | **−8.4636** / 1.0000 / 0.6522 |
| which is lowest at the fall | **across 70**, along 16, grip 4 | **across 17 of 17** | **across 12**, along 2 |
| the lowest one is **negative** at the fall | — | 11 of 17 | 11 of 14 |
| the capture test's own three (`balanceLimits`), at the fall | margin 79, grip 11 | **margin 17 of 17** | **margin 14 of 14** |

> **It is `across`, on 29 of the 31 take-off falls — and the two exceptions are real and go the other way.** The
> lateral headroom is the lowest of the three at **17 of 17** seed-1 falls and **12 of 14** seed-2 falls, and it is
> **negative** — the demand outside the support edge, which is the same event as `tip` — at **11 of 17** and **11 of
> 14**. `along` sits at exactly **1.0000** at 17 of 17 seed-1 falls and 11 of 14 seed-2 falls, **but on two seed-2
> falls the demand escapes ALONG instead**, with headrooms of **−10.22 and −16.45** against a positive or
> less-negative `across`. **So "the deck is narrow for a roll and wide for a pitch" is right 29 times in 31 and wrong
> twice, and the two exceptions are on disk.** The grip falls with the rest but stays positive (0.63–0.72) at every
> fall in every population, so **the feet never run out of friction.**
>
> **And on the falls where neither headroom is negative, the static demand is not what ends the ride.** `human.fallen`
> — the capture point, which carries the body's own velocity (`across = px + vx/ω`) and is the test that actually ends
> a free-body ride — binds at **31 of 31** take-off falls, with the capture point a median **0.409 m** (seed 1) and
> **0.610 m** (seed 2) past the feet. **The capture point leaves the feet before the static demand does**, which is
> why 6 of 17 seed-1 falls happen with `across` still positive.

**At the stand the lowest of the three is the GRIP**, on all three populations (12 of 18, 18 of 21, 57 of 90), with
`across` at 0.92–0.99. So the stand does not begin near its lateral limit; it begins with about 10–18 % of its
friction spent — and what the capture test finds nearest at that moment is the **knee** (18 of 18 and 64 of 90), the
legs' strength under the landing's own load.

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
| **the three headrooms are the engine's own** | a recomputation that is not `project`'s arithmetic | **take-off: 2 112 of 2 112 (seed 1) and 3 155 of 3 155 (seed 2)** window frames reproduce `rawMargin` exactly. **Placement: 12 066 of 12 070** — and the 3 distinct frames that miss are all `loadedNow == 0` with the feet carrying **0.020–0.095 bw**, where `desiredCop` is a stale substep by construction. The control named its own failure mode |
| **the pinned share cannot fail** | a monotone latch read as a share | **proved a latch by measurement**: 0 of 1 124, 0 of 2 028 and 0 of 3 565 following frames return to zero (§4.1) |
| **a frozen column read as live** | every rider column freezes at separation (`separate` never clears `phase`/`upright`, `:5227–5232`) | every run stops at its first `attached === 0`; the fall is read off `atFall`, the last attached frame. **Kept: 1 216 standing attached frames in 18 runs (seed 1), 2 049 in 21 (seed 2), 7 118 in 90 (placement)** |
| **a load share read as a position** | "the front foot slides" | `contact.frontShare` is the **share of load**. The column that would say a foot moved is the deck-relative foot speed, and it is **exactly 0 in all 2 049 standing frames**, with `inContact` true in **2 049 of 2 049**. Nothing slides |
| **a censored window read as a ride** | #429's `TRIAL = 16` retired wave 6 on its standing frame | `TRIAL = 20`; **0 of 39 stands censored** on either sea, post-stand exposure a median 3.000 s, the first second available in 39 of 39 — and the three censored stands are followed and reported (§3) |
| **cross-build against the published population** | this round's `src` (`main`'s) not being #429's rider | **seed 1: 423 shared summary values over 36 aligned runs, 0 differ. Seed 2: 426 over 33, 0 differ** — against #429's own committed `seed*-summaries.jsonl`, taken on `claude/ride-all-three`. The only 3 differences anywhere are the `face` column on a seed-2 rider that never stood: a running maximum over a life `TRIAL` lengthens, reported apart |
| **determinism across processes** | a bench that does not repeat | **5 093 summary values over 33 runs, 0 differ** between two separate processes running the same bundle at the same seed |
| **the positive control for the instrument** | a reader that cannot see what it claims to measure | the placement reproduces **#419's causes (balance 89, lost board 1, foot slip 0)**, **#419's `tip` 90 of 90**, **#421's 0.8748 → 0.8764**, **#421's 0.100 s → 0.0983 s**, **#421's 2.950° → 2.918°**, **#421's 0.976 → 0.976**, and **#425's 7 208 frames → 7 208 rows** |
| **the probe is inert** | the probe's own reads changing the drive | `PROBE=off` removes the two `renderPoint` reads and the one `sampleAt`, and builds no row: **0 rows emitted against the on arm's 1 708.** It still measures the window — 35 numeric values a block, `rawOk` 61 of 61 — and **10 runs aligned, 641 summary values compared, 0 differ.** ⚠️ 641 is a smaller population than #429's 2 538 because this control was run at 4 periods; it is the honest count |
| **the inertness control is not vacuous** | a control comparing nulls to nulls | the `PROBE=off` arm's own window columns are printed above: `n` 61, load 0.9465 bw, roll peak 1.6793°, CoM 0.77206 m, tolerance 9.5579°. It measured the same thing without the probe's reads |
| **the zsh integer trap** | `SECONDS=0.5` arriving as `"0"`, every run ending at frame 1 under a tidy summary | the probe has no `SECONDS`; every invocation uses `env` |
| **the committed probe reproducing the committed results** | the probe file changing after the runs were taken | ⚠️ **it did change**: a sibling commit (`c0e32007`) added `TURN_STEER`/`TURN_COMPRESS` **after** these bundles were built. Both default to 1, so the change is a no-op at the defaults — **proved twice**, not asserted: the rebuilt bundle differs from the one that produced these results in **exactly those two expressions and nothing else**, and re-running the 4-period config from the committed file gives **10 runs aligned, 1 380 summary values compared, 0 differ** (`results/four-numbers-rebuild-check.txt`) |

---

## 10. The four verdicts, in one table

| number | the **placed** figure (measured here) | the **through-a-stand** figure | does the conclusion survive? |
| --- | --- | --- | --- |
| **`tip` 90 of 90** (#419) | **90 of 90** by `limitTime.tip > 0`; **88 of 90** by `limit === 'tip'`; pinned share 37.9 % of the first second | **18 of 18** and **21 of 21** by the published test; **17 of 18** and **14 of 21** by `limit === 'tip'`; first `tip` a median **0.433–0.508 s** into the first second; instantaneous share **15.0–21.3 %** | ⚠️ **PARTLY.** The *mechanism* survives — the lateral headroom is the one that goes at **29 of 31** take-off falls (§8), and the capture point is past the feet at **31 of 31**. The *number* is a **latch**, not a share: it returns to zero on **0 of 6 717** following frames across all three populations, and on a take-off it flips **before the stand**, in `landing`, on 36 of 39. **"Pinned 52.0 %/89.8 %" must not be quoted again in that form.** And "every ride pins" is false: **10 of 39 stands never pin and all 10 carry the first second.** |
| **the stance tolerates 10.9°** (#419) | **10.650°** through the first second (CoM 0.69134 m above the deck, support ±0.130 m); 8.703° at the stand itself | **11.252°** (seed 1) and **11.123°** (seed 2); CoM 0.653 m and 0.661 m; support ±0.130 m, **the only value in every run of all three populations** | ⭐ **YES for the number** — it reproduces within 0.6° on two independent seas, and `riderPosture.ts:96` does fix it for every standing pose. ⚠️ **NO for the inference.** The **measured** mismatch is **3.113°** and **1.072°** — a third to a seventh of the tolerance — past it on 15.2 % and 6.5 % of frames. The stance is narrow and the body is not filling it. **New and placement-invisible:** the pop-up walks the tolerance from **42.6° → 15.3° → 11.3°** in its own 1.20 s. |
| **the body follows at 0.87, 0.1 s late** (#421) | **0.8764** at lag 0 (#421: 0.8748); crosses 1 at **0.0983 s** (#421: 0.100 s); mismatch **2.918°** (#421: 2.950°); same-way **0.976** (#421: 0.976) | **0.7823** and **0.8668** at lag 0; **off the plane 0.7499 and 0.7548**, on it **0.8435 and 0.8915**; crossing **0.169–0.238 s** where it exists and **none at all on the plane** | ⭐ **THE GAIN SURVIVES** — the most durable of the four, unmoved by restricting to the frames that carry the leverage, and it **does hold off the plane, 13 % weaker**, which is the brief's own question answered. ⚠️ **THE LAG DOES NOT.** 0.100 s reproduces only on the placement; it is a property of the **hard-over stick** (deck roll 12–16° against the take-off's 1.4–5.0°), not of the plane — the placement crosses off the plane too. |
| **the demand is 0.327 m outside the feet** (#425) | escaping on **8.2 %** of first-second frames, median excursion **0.07404 m** (#425: 14.9 % over whole rides, 0.0891 m); first escaping frame **0.00191 m** (#425: 0.0071 m) | escaping on **21.3 %** and **14.7 %**; **per-run peak 0.31827 m and 0.31453 m** — #425's 0.327 m, on two independent seas; first escaping frame **0.012–0.016 m**; at the fall **up to 1.10027 m** | ⭐ **SURVIVES, AND STRENGTHENS.** The blip an arm could be on time for is **0.012–0.016 m** and the escape that matters is **3.1× the palm's 0.10194 m ceiling**, up to **10.8×** at the fall. **And the demand is inside the feet at every one of the 39 stands**, so there is nothing for a hand to answer at the moment the rider stands. |

---

## 11. What refutes this brief

**The brief's own premise is the thing this round refutes**, and it is worth more than the four verdicts:

1. ⭐⭐ **"A take-off is off the plane for ~82 % of the first second, where the ask cap is EXACTLY 0" is a statement
   about one sea.** On seed 2 the take-off is **planing for 80.6 %** of its first second — **more than the placement's
   74.8 %** — with a median lean cap of 0.53 rad. The regime is set **wave by wave** by the board's speed through the
   water at the stand against `PLANING_SPEED = 4`, which seed 2's cue waves clear on **five of seven** by
   0.19–0.64 m/s and seed 1's on two of six.
   ⚠️ **Narrowed by the parallel round, correctly (§13):** the cap bounds a request that is **zero with the stick at
   zero**, measured here as `ask` non-zero in **0 of 452** and **0 of 829** stick-zero frames. So the regime claim is
   wrong about the **sea** and #429's consequence claim was wrong about the **rider**; what the regime governs is the
   **board**.
2. ⭐ **And on seed 1 the published figure was depressed by its own harness.** `TRIAL = 16` censored wave 6 — the
   planing wave — so 18.0 % of 716 frames should read **34.5 % of 896**. Nearly double.
3. ⭐ **"A placement is on the plane from frame 1" is not a property of placements either.** The mount tests the same
   `PLANING_SPEED = 4`, so the placement here is **off the plane at frame 1 in 24 of 90 runs** — its 2 and 3 m/s
   entries. A placement's regime is chosen by the experimenter and a take-off's by the wave; the difference is
   **sampling, not kind.**
4. **The brief's framing of the lag question — "does it hold off the plane?" — contains an assumption the data
   rejects.** The lag does not track the plane at all: the placement crosses 1 **off** the plane at 0.1163 s on 1 621
   frames. What it tracks is the stick.
5. **`tip` and the geometry are the same event, so the masking worry is nearly empty.** Of the frames whose demand is
   outside the support box, `limit` fails to call them `'tip'` on **13 of 531** placed and **0 of 357** take-off
   frames. The `'impact'` branch almost never masks.

**What does not refute it:** the regime difference #429 found is real on the sea it measured, the placement bench's own
numbers all reproduce, and nothing here rehabilitates reading a placed rider as the owner's rider. The correction is
that the reason is the **wave**, so the fix is to report the regime per wave — which every table above does.

---

## 12. What this round did not measure

* **One spot, one size.** Canyon B at Medium, two seeds. The regime finding says the sea decides, so **the next thing
  to vary is the spot and the size**, not the rider.
* **The instantaneous-pin lead is one direction on 39 stands.** `pinNow == 0` → carries the first second holds 10 of
  10; the converse is 25 of 29. It is a lead, and the honest test is another sea.
* **The riders do not push the water** (#429's one deliberate difference, inherited). A single rider whose reaction
  reaches the solver would close it.
* **The owner's own ride is not this ride.** His stick is not zero, his pop timing is his own, and **the actual turn
  and the climb stay pending** — he cannot judge a turn while he falls in under a second, and nothing here is offered
  as a verdict on turning.
* **The turn scripts confound the steer with Compress** (`steer: ±1` and `compress: 1` together, against a neutral
  script that sends neither). `cueL` against `cueR` is the only clean contrast in **this** data. ⭐ **The probe can now
  separate them** — a sibling change on this branch (`c0e32007`) added `TURN_STEER` and `TURN_COMPRESS`, both
  defaulting to 1 — but **no run in this document uses them**, so the confound stands over every figure here and the
  separation is the next round's, not this one's.
* **No `?askCap` arm was run.** #429 found it is the one switch that gives an off-plane rider a lean to ask for; on a
  sea that is already planing for 80 % of the window it should do much less, and that is an untested prediction.

---

## 13. ⭐ What a parallel round on this branch got to first, and where the two agree

`docs/research/new-rider/take-off/stand.md` — a **different** probe, also descended from #429's `bench.ts`, aimed at
the stand's refusal rather than at the four numbers — landed on `claude/the-record` while this round was running.
It reaches four of this document's findings independently, and that matters more than which came first:

| finding | `stand.md` | **this round** | agree? |
| --- | --- | --- | --- |
| the published pinned share is not a share | *"the pinning trap reproduces, with a much bigger factor"*: 97.6 % against 21.3 % (seed 1), 100.0 % against 11.0 % (seed 2) | 91.7 % against 21.3 % and 100.0 % against 15.0 %, on first-second windows rather than whole stands | ⭐ **yes, and two different ways.** This round adds the *proof that it is a latch* (0 of 6 717 returns to zero) and that **it flips before the stand, in `landing`, on 36 of 39** |
| the fall is lateral, and not only lateral | past the feet across in 983 of 2 123 (seed 1) and 780 of 3 744 (seed 2); **along in 2 of 2 123 but 132 of 3 744** | the lateral headroom is the lowest at 29 of 31 falls; **two seed-2 falls escape along instead** (−10.22, −16.45) | ⭐ **yes**, on two instruments and two definitions |
| `rawMargin` cannot name the failing constraint | confirmed from the data as well as the source: it touches zero twice without a fall on wave 10 | confirmed from the source (`:5393` min of three, `:5050` low-passed) and by recomputing the three separately, checked against it on **17 333 of 17 337** frames (2 112 + 3 155 + 12 066 of 2 112 + 3 155 + 12 070) | ⭐ **yes** |
| the lean cap bounds a request that is zero | §4.1, on 2 123 seed-1 frames | reproduced on both seas: `ask` non-zero in **0 of 452** and **0 of 829** stick-zero frames | ⭐ **yes** — and it **narrows this round's own headline** (§3) |

**Where they differ in emphasis, not in fact:** `stand.md` concludes *"the lever is the board's speed through the water;
everything else on the brief's list is that speed reported by another instrument"* — and this round's §3 measures
exactly that speed at the stand (**4.19–4.64 m/s on five of seven seed-2 cue waves against 2.36 and 3.73 on the other
two**) and finds it is what sets the regime wave by wave. **The two documents are the same mechanism from two sides.**

⚠️ **One thing `stand.md` pre-registered and did not run, which this round did not run either:** `?askCap=4.5` with
the stick at zero must be bit-identical to the shipped address. It follows from §4.1's own arithmetic and from this
round's measurement that `ask` is 0 on every stick-zero frame. **Still unanswered, and cheap.**

---

## 14. The files

| file | what it is |
| --- | --- |
| `four-numbers.ts` | the probe. `MODE=takeoff` is #429's drive carried over; `MODE=placed` is `3.5/bank.ts`'s `MODE=sea` rig carried over. One row schema for both. Run as its header says |
| `four-numbers-read.py` | the reader: the four comparisons, the latch test, the three headrooms, `--pair <wave>` for one wave's scripts side by side, `--control` for the inertness pair |
| `four-numbers-cross.py` | this build's take-off summaries against **#429's own committed ones**, value by value, with its earlier script names aliased |
| `results/four-numbers-takeoff-seed1.txt`, `results/four-numbers-takeoff-seed2.txt` | the two take-off populations in full, seed 2 with the wave-1 trace |
| `results/four-numbers-placed-seed1.txt` | the placement — **the positive control**, and the source of every "placed figure" above |
| `results/four-numbers-probe-inertness.txt` | `PROBE=on` against `PROBE=off` |
| `results/four-numbers-cross-build.txt` | both cross-build checks: 423 and 426 shared values, 0 differ |
| `results/four-numbers-*-summaries.jsonl` | every run's summary line, which is what every median above is computed from |
| `results/four-numbers-rebuild-check.txt` | the committed probe re-run and compared to the bundle that produced these results: 1 380 values, 0 differ |
| `results/four-numbers-*-control.jsonl` | each run's control line: the grid off the solver, the parsed switches, the spin-up |

The per-frame rows (5–9 MB a run) are **not** committed; every figure in this document is reproducible from the
summaries plus the probe, and the per-frame traces are reproducible by re-running the header's own invocations.

### Reproducing it

    ./node_modules/.bin/rolldown docs/research/new-rider/take-off/four-numbers.ts -o <s>/raw.mjs --format esm --platform node
    printf "globalThis.location = { search: '' };\n" > <s>/four-numbers.mjs   # an OBJECT, never a string
    cat <s>/raw.mjs >> <s>/four-numbers.mjs
    cd <s> && env MODE=takeoff SEED=1 PERIODS=12 ARMS=ships SCRIPTS=cue,cueL,cueR OUT=<s>/t1.jsonl node --max-old-space-size=3200 four-numbers.mjs
    cd <s> && env MODE=takeoff SEED=2 PERIODS=12 ARMS=ships SCRIPTS=cue,cueL,cueR OUT=<s>/t2.jsonl node --max-old-space-size=3200 four-numbers.mjs
    cd <s> && env MODE=placed  SEED=1            ARMS=ships OUT=<s>/p1.jsonl node --max-old-space-size=3200 four-numbers.mjs
    cd <s> && env MODE=takeoff SEED=2 PERIODS=4 ARMS=ships SCRIPTS=cue,cueL PROBE=off OUT=<s>/off.jsonl node four-numbers.mjs
    python3 -I docs/research/new-rider/take-off/four-numbers-read.py <s>/t2.jsonl --labels takeoff-seed2 --pair 1
    python3 -I docs/research/new-rider/take-off/four-numbers-cross.py <s>/t1.jsonl <429's seed1-summaries.jsonl>

Wall: 1 202 s (seed 2), 2 263 s (seed 1), 217 s (the placement), under CPU contention from another session's job on the
same machine. Spin-up alone is 56–96 s of that each.
