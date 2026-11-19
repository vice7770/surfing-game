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
