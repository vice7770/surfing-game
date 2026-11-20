# Step 3.5f — the planing latch's own band, 3–4 m/s

**The question.** Planing is a latch (`AttachedRider.ts:342–343`, `:3495`):

```ts
const PLANING_SPEED = 4;
const PLANING_DROP  = 3;
if (this.planing ? speed < PLANING_DROP : speed > PLANING_SPEED) this.planing = !this.planing;
```

so not planing needs `speed > 4` to start and planing holds until `speed < 3`; between 3 and 4 the state is **history**.
Below the plane the lean the rider may ask for is capped at exactly 0 (`:3531`), so the stick asks for no lean at all.
The project's headline flat-control result — stick hard over against never touched, 0 mismatches over 67 767
column-values — was measured over **1–3 m/s**, entirely inside the always-off region. *Measure the band.*

**Which rider every number belongs to.** Every figure below is `RIDER=new FELT=deck BODY=two`, i.e. the owner's own
`?rider=new&feltFrame=deck&riderBody=two`, at the folder's own placement (`AHEAD` 0.75, `SIDE` −45, 9 s a run, the
stance held). `s16` is `FACE=1.4,16,5.7`, the Canyon-matched arm (PR #223); `f73` is `FACE=1.4,7.32,5.7`, step 3.4h's
closest fit to the owner's own water. §6's riders are on the **real Canyon sea**. Nothing here is the plain
`?rider=new`'s, and no `planing` was ever set by hand.

---

## The answer in five lines

1. **Yes — the same stick produces a different ride across the latch, and the difference is not a gradient, it is
   total.** Off the plane and having never planed, moving the stick from never-touched to hard over changes **0 of
   220 248 column-values** (24 + 27 run-pairs, 1 656 frames, 133 columns a frame), of which **0 of 125 419
   column-values on the 943 frames inside the band itself**. On the plane the same comparison moves **61.5 % and
   62.1 %** of column-values (s16, f73), peak |Δroll| 1.0–73.7°, peak |Δheading| 0.2–52.0°. **Step 3.5a's 1–3 m/s
   result extends into the band unchanged: the gate, not the speed, is what makes the stick dead.**
2. **But the band's own hysteresis explains almost none of a real Canyon ride.** On the real Canyon sea
   (`?canyonWaves=true`, `canyonBed: 'b'`, 24 riders, 1 291 live frames), the 3–4 m/s band holds **8.1–10.2 %** of a
   planing ride's live frames and **0.0 %** of a crawling one's, and in all 24 riders it was **never once occupied in
   the off-plane state**. On the bench the longest a run ever sits in the band off the plane is **0.033–0.733 s**, in
   6–8 runs of 17 per stance. **The hysteresis band is thin and, on the owner's own spot, one-sided. That closes it as
   an explanation of "unresponsive" and it is a real result.**
3. **What bites is the plain off-plane state, and it is enormous on the owner's spot.** **100 % of 541 live frames**
   of the 12 slow Canyon riders (entry 2 m/s) are below 3 m/s through the water — the ask cap is exactly 0 for the
   whole ride, whatever the history. Of the 12 fast riders (entry 5 m/s), **29.8–43.7 %** of live frames are below 3,
   because 6 of 12 **lose the plane at t ≈ 0.77–0.82 s** and never get it back while still attached. *That* is the
   measured form of the owner's "feels unresponsive", and it is the gate at `PLANING_DROP`, not the hysteresis above
   it.
4. **Three speeds, two of them 4, and the pop-up uses the wrong one.** The latch tests the level magnitude through
   the water; the cap formula the component along the heading; and the **mount** tests `board.velocity.length()` —
   the full 3-D speed **with the water's own flow still in it** (`:2857`), which on these arms runs a median
   **0.46–0.72 m/s larger** than the latch's quantity. So the pop-up latches the board **on** at **3.655 m/s** (s16)
   and **3.856 m/s** (f73) through the water, inside the band, and the state the rest of the ride inherits is decided
   by a quantity the latch never reads again.
5. **The latch's own channel, isolated, turns the board without rolling it.** On `?mountAgree=deck` — the one arm on
   which the mount's two channels can be separated, because it sets `banked` whatever the speed — the pair that
   differs **only** in `planing` (Δthrough 0.0098 m/s, Δbank at frame 1 **0.002°**, Δcap **16.7°**) diverges by
   **12.59–13.47° of heading in 0.27 s** against **0.00–1.99°** for its null pairs, with peak |Δroll| of only
   **2.12–2.89°** and peak |Δbank| of **10.94–13.44°**. The cap's authority shows up in **yaw and in the body's
   bank**, not in the board's roll — which sits beside 3.5d's finding that the roll is the ankle's.

**The brief's framing, corrected in one place.** It says the latch's state decides "the stick's whole authority". It
decides more than that: `reset` sets **`planing` and `banked` off the same test** (`:2857–2860`), and `banked` is the
body's own placement — plumb across, or square to the deck. Measured at the crossing on the owner's default mount,
the body starts at bank **−0.04°** on the off side and **+8.72°** on the on side, the face's whole tilt, and with the
stick never touched (where the ask is identically 0 on both sides) that channel alone carries peak |Δroll| of
**48.95–70.03°** and **8.04–32.39°** of heading. So the mount's step is two channels; §4 reads them together as the
latch at the mount, §5 reads the cap's alone.

---

## 0. The rig, and why it is instrument-only

`3.3/plant.ts`'s `MOUNT=` dump, unmodified, read by a new file `3.5/latch.ts`; plus five read-only columns added to
`3.5/foam.ts`'s ride row for §6 (`through`, `throughProbe`, `planingNow`, `capDeg`, `askDeg`). **No byte under `src/`
or `server/` is changed** — `git diff --stat` against the merge base touches only files under `docs/`. So there is no
default to keep, no switch to add and no Canyon hash to check: the round is a read.

The four columns the question rests on are the game's own read-only `leanProbe` record, added by steps 3.3f and 3.5a
and already in the dump: `planingNow` (`leanProbe.planing`), `capDeg` (`.cap`), `askDeg` (`.ask`), `throughProbe`
(`.speedThrough`). The latch's own speed is the dump's `through`, which `3.3/plant.ts:1075` computes with the same
expression `planingStep` tests (`hypot(v.x − flowX, v.z − flowZ)` at the board's own sample) — so it is not a model
of the latch, it is the latch's own argument. `leanProbe.want` and `.held` were not needed: with no hand and no Snap,
`want` is `steer × RAIL_RANGE` and `held` is `atan(v²/(g·4.5))` at `throughProbe`, both recoverable from the columns
already there.

**The live window.** `AttachedRider.separate` (`:4586`) sets `attached`/`climbing`/`inContact`/`separation` and never
`phase` or `upright`, so every rider column freezes after separation. `plant.ts` breaks each run on the first frame
with `!attached || !upright || phase !== 'standing'` and emits that frame; **this round cuts each run at its first
`attached == 0` and keeps the rest.** That drops exactly **51 frames an arm — one a run** (the frame the rider came
off on), and **0 of 204 runs** has a frame that is attached while not upright or not standing, so plant.ts's other
two conditions never bit first and nothing in this document is read on a frozen frame.

### The three speeds, named once

| quantity | where | what it is | column |
| --- | --- | --- | --- |
| the **latch's** | `planingStep`, `:3493` | `hypot(v.x − flowX, v.z − flowZ)` — the level **magnitude** through the water | `through` |
| the **cap's** | `prepareBank`, `:3524` | `v·f̂ − flow·f̂` — the component **along the heading** | `throughProbe` |
| the **mount's** | `reset`, `:2857` | `board.velocity.length()` — the full 3-D speed, **the flow still in it** | `speed` |

`PLANING_SPEED = 4`, `PLANING_DROP = 3` and `PLANT_SPEEDS`' own floor of 4 are three further different things, two of
them 4; the floor is not read anywhere in this round.

Measured on the same live frames, per arm (median / max of the absolute difference, m/s):

| arm | runs | frames (all → live) | \|through − probe\| | \|speed3D − through\| |
| --- | --- | --- | --- | --- |
| s16-s0 | 51 | 3 693 → 3 642 | 0.011 / 1.095 | **0.716** / 1.646 |
| s16-s1 | 51 | 1 710 → 1 659 | 0.016 / 1.367 | **0.536** / 1.646 |
| f73-s0 | 51 | 3 928 → 3 877 | 0.005 / 1.839 | **0.546** / 1.857 |
| f73-s1 | 51 | 2 582 → 2 531 | 0.014 / 1.839 | **0.464** / 1.297 |

The latch's and the cap's speeds agree to 0.005–0.016 m/s on the median frame and part by up to 1.8 m/s in a turn.
The mount's is a different animal: a **median 0.46–0.72 m/s above** the latch's, which is the whole of line 4 above.

### The two histories, and exactly how each was produced

Only the **entry speed** was varied, which is a thing a player causes (how fast the board was going at the pop-up).
The ladder is `ENTRIES=1,2,3,3.5,3.6,3.64,3.65,3.66,3.67,3.68,3.69,3.7,3.75,4,4.5,5,6`, absolute, × 3 stances ×
{stick never touched, stick hard over} × 2 faces = **204 runs**.

- **H1, the mount's own step.** Because the mount's test carries the flow and the latch's does not, there is an entry
  at which standing up 0.01 m/s faster latches the board **on** at a speed through the water that is otherwise in the
  always-off region. The reader finds it from the data (the adjacent pair whose frame-1 `planingNow` differs): on s16
  it is **3.66 / 3.67** (`through` 3.6423 → 3.6550 in the tall stance, Δ **0.0127 m/s** = 0.35 %, cap 0.00° →
  **16.71°**); on f73 **3.67 / 3.68** (`through` 3.8451 → 3.8562, Δ **0.0111**, cap 0.00° → **18.47°**). The crossing
  falls between the same two entries in all three stances, and Δ`through` is the same to four decimals in each — as it
  must be, because the mount's test is on the board's speed and not the rider's.
- **H1's null controls.** The adjacent pairs immediately **below** and **above** the crossing, same spacing
  (Δthrough 0.0098–0.0100 m/s), same water, same stance, same stick, **no latch step**. So "the divergence is the
  latch" is measured against "the divergence is the 0.3 % of speed", and not against nothing.
- **H2, within a ride.** A run entered below 3 that accelerates past 4 keeps planing all the way back down to 3; one
  that never reaches 4 never planes. Both halves occur on the ladder: §1 lists all 100 state changes, and §5 reads
  the band's matched bins.

---

## 1. The latch on a ride: the rule in the source is the rule the ride shows

**100 of 100** changes of `planingNow` across the 204 runs are consistent with the rule on `through` within one frame
(the dump reads `through` after the step and `planingNow` from the last `prepare` inside it, so the crossing is
expected one frame early). No exceptions, no unexplained flip. Examples, s16, stick never touched:

| stance | entry | frame | t (s) | change | through (prev → now) | probe | cap |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 3.66 | 11 | 0.183 | 0 → 1 | 3.966 → 4.087 | 4.075 | 20.62° |
| crouch | 4.00 | 355 | 5.917 | 1 → 0 | 3.016 → 2.970 | 2.963 | 0.00° |

On the s16 face every run entered at 3.50–3.66 crosses **up** through 4 within **0.183–0.483 s**, which is how the
band gets its on-state frames from below; the 1 → 0 crossings sit at 0.717–5.917 s, which is how it gets them from
above.

## 2. How much of a ride sits in the band, and in which state

Live frames, band on the latch's own speed. Per stance and stick, never pooled; 17 runs a cell.

| arm | stance | stick | live | band | on | off | runs with on/off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| s16 | tall | never | 1 220 | 34.0 % | 26.5 % | 7.5 % | 11 / 6 of 17 |
| s16 | crouch | never | 1 336 | 30.5 % | 21.9 % | 8.6 % | 11 / 6 |
| s16 | compress | never | 1 086 | 30.3 % | 19.6 % | 10.7 % | 11 / 6 |
| s16 | tall | hard over | 556 | 32.9 % | 16.4 % | 16.5 % | 11 / 6 |
| s16 | crouch | hard over | 559 | 39.5 % | 19.0 % | 20.6 % | 11 / 6 |
| s16 | compress | hard over | 544 | 39.2 % | 17.8 % | 21.3 % | 11 / 6 |
| f73 | tall | never | 1 403 | 33.6 % | 21.6 % | 12.0 % | 11 / 7 |
| f73 | crouch | never | 1 242 | 38.7 % | 24.2 % | 14.5 % | 13 / 8 |
| f73 | compress | never | 1 232 | 43.4 % | 20.9 % | 22.6 % | 9 / 8 |
| f73 | tall | hard over | 804 | 38.4 % | 15.0 % | 23.4 % | 10 / 7 |
| f73 | crouch | hard over | 773 | 42.8 % | 16.4 % | 26.4 % | 12 / 8 |
| f73 | compress | hard over | 954 | 42.6 % | 12.9 % | 29.7 % | 9 / 8 |

So **on the bench ladder the band is well occupied — 30.3–43.4 % of live frames — and both states are reached**,
off-plane on **7.5–29.7 %** of frames. But the dwell is short: the longest unbroken stretch one run spends in the band
off the plane is **0.033–0.733 s** (medians 0.167–0.717 s), in **6–8 runs of 17** per stance. A player can be at
3–4 m/s with no steering at all, but on this ladder never for as long as a second at a time.

## 3. The owner's own question — how much does the stick change, in each latch state?

For every face, stance and entry, the run with the stick **never touched** is paired with the run with the stick
**hard over**: same water, same placement, same stance, same entry, one input changed. Every numeric column of the
dump that is not a label (**133 columns**) is compared frame to frame over the frames both runs are live for, and the
frames are split by latch state. `virgin` = off the plane with **neither** run having planed yet (the honest
off-plane population); `after` = off the plane but one of them has already planed, so the pair had already parted;
`on` = planing.

| face | state | run-pairs | frames | column-values | mismatches (>1e-9) | share | \|Δroll\| max span | \|Δhead\| last span |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s16 | **virgin** | 24 | 561 | **74 613** | **0** | **0.00 %** | 0.00–0.00 | 0.00–0.00 |
| s16 | on | 42 | 1 093 | 145 369 | 89 366 | 61.48 % | 1.04–59.29 | 0.19–39.64 |
| f73 | **virgin** | 27 | 1 095 | **145 635** | **0** | **0.00 %** | 0.00–0.00 | 0.00–0.00 |
| f73 | after | 11 | 97 | 12 901 | 8 580 | 66.51 % | 25.18–81.56 | 1.52–43.34 |
| f73 | on | 36 | 1 312 | 174 496 | 108 419 | 62.13 % | 7.22–73.73 | 0.45–52.03 |

And restricted to the band itself, which is the population the question is about:

| face | state | frames | column-values | mismatches | share | \|Δroll\| max | \|Δrail\| max | \|Δbank\| max |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| s16 | **virgin** | 323 | **42 959** | **0** | **0.00 %** | 0.00 | 0.00 | 0.00 |
| s16 | on | 386 | 51 338 | 31 643 | 61.64 % | 5.18 | 4.89 | 13.44 |
| f73 | **virgin** | 620 | **82 460** | **0** | **0.00 %** | 0.00 | 0.00 | 0.00 |
| f73 | after | 6 | 798 | 527 | 66.04 % | 52.01 | 56.38 | 48.04 |
| f73 | on | 587 | 78 071 | 49 557 | 63.48 % | 73.73 | 74.78 | 71.12 |

**This is the round's headline.** Off the plane, at **3.0–4.0 m/s through the water**, the stick moves **nothing** —
not the roll, not the rail, not the bank, not one of 133 columns, on 943 frames and 125 419 comparisons. On the plane
at the same speeds, it moves **61.6–63.5 %** of them. The two states are not "more and less responsive"; they are
**steering and no steering**, and which one the rider is in at 3–4 m/s is decided by history.

The `after` bucket matters only as hygiene: a frame off the plane whose run has already planed is not a test of the
stick off the plane, because by then the pair has parted. Partitioned by frame state alone, f73 showed 8 580
"off-plane" mismatches; every one of them is in `after`. **The honest off-plane population has zero.**

## 4. H1 — the latch at the MOUNT (two channels), against its null pairs

Same stick on both sides, Δthrough at frame 1 printed on every row. Collected over the 12 pairs of each kind
(both faces, three stances, both sticks):

| kind | pairs | Δthrough(f1) | \|Δroll\| max span | \|Δrail\| max span | \|Δyaw rate\| max span | \|Δhead\| at last common frame | n |
| --- | --- | --- | --- | --- | --- | --- | --- |
| null− | 12 | 0.0098–0.0099 | 0.21–5.52° | 0.14–5.61° | 2.16–43.86 °/s | **0.05–0.46°** | 26–73 |
| **LATCH** | 12 | 0.0111–0.0127 | **6.03–85.38°** | **6.84–85.43°** | **98.04–338.70 °/s** | **4.00–32.39°** | 16–73 |
| null+ | 12 | 0.0099–0.0100 | 0.00–10.28° | 0.00–9.93° | 0.06–31.08 °/s | **0.00–0.57°** | 16–91 |

**No overlap** on the heading (LATCH min 4.00° > null max 0.57°, a factor of 7) or on the peak yaw rate (LATCH min
98.04 °/s > null max 43.86 °/s). The 0.3 % of speed the pair carries does not do this; the latch does.

**But two channels do it, not one.** At the crossing on the owner's **default** mount, frame 1 reads:

| entry | planing | cap | ask | bank | roll | rail | through |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.66 | 0 | 0.00° | 0.00° | **−0.039°** | 8.325° | −0.632° | 3.6423 |
| 3.67 | 1 | 16.71° | 0.00° | **+8.717°** | 8.899° | −0.060° | 3.6550 |

(s16, the tall stance, the stick never touched; the other two stances are the same to within 0.1°.)

`reset` sets `planing` **and** `banked` off the same 3-D-speed test, and `banked` is whether the body is placed plumb
across or **square to the deck** — so the on side starts banked by the face's whole tilt. With the stick never touched
the ask is identically 0 on both sides (Δask **0.00 / 0.00** on every one of the six `-s0` LATCH rows), so that
channel alone carries peak |Δroll| of **48.95–70.03°** and **8.04–32.39°** of heading. The body's starting bank is a
bigger lever at the mount than the stick's cap is.

## 5. The cap's own channel, isolated — `?mountAgree=deck`

`mountAgree: 'deck'` (`:2862`, step 3.4e's shipped switch) sets `banked` at the mount **whatever the entry speed**,
leaving `planing` as the only thing the crossing flips. Frame 1 of the s16 pair under it:

| entry | planing | cap | ask | bank | roll | rail | through |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 3.66 | 0 | 0.00° | 0.00° | 8.717° | 8.899° | −0.060° | 3.6452 |
| 3.67 | 1 | **16.71°** | 1.34° | 8.719° | 8.894° | −0.064° | 3.6550 |

(s16, the tall stance, the stick **hard over** — which is why the on side's ask is already 1.34° at frame 1 and the
off side's is 0: the cap is the only thing between them.) Δbank **0.002°**, Δroll **0.005°**, Δthrough
**0.0098 m/s**: one channel. Collected over the six pairs (three
stances × two sticks) on s16:

| kind | pairs | \|Δroll\| max | \|Δrail\| max | \|Δyaw\| max | \|Δhead\| last |
| --- | --- | --- | --- | --- | --- | --- |
| null− | 6 | 0.09–9.88° | 0.09–9.12° | 1.86–42.24 °/s | 0.02–7.17° |
| LATCH | 6 | 0.62–22.13° | 0.68–20.77° | 10.62–212.64 °/s | 0.43–13.47° |
| null+ | 6 | 0.00–10.28° | 0.01–9.93° | 0.06–31.08 °/s | 0.00–0.57° |

Split by stick, which is the reading that matters:

- **Stick never touched** (3 pairs): LATCH Δroll max **0.62–22.13°**, Δhead **0.43–5.30°** — **inside the nulls'
  own span on the same three pairs** (Δroll 0.68–9.88°, Δhead 0.24–7.17°). With no stick the cap channel does nothing distinguishable from the
  0.3 % speed step, which is what it should do: the ask is 0 on both sides whatever the cap is.
- **Stick hard over** (3 pairs): Δcap median **16.57–17.12°**, Δask median **12.03°**, and
  Δhead at the last common frame **12.59 / 13.22 / 13.47°** against the nulls' **0.00–1.99°** — no overlap. But
  Δroll max is only **2.12–2.89°** and Δrail max **1.40–2.44°**, while Δbank max is **10.94–13.44°**.

Read frame by frame (s16, tall, stick hard over), the on side's ask climbs 1.34° → 16.29° over 0.25 s, its body's bank
goes 8.72 → 9.83 → **−0.01°** as the upper body swings across, and its heading turns from −46.32° to **−35.61°**
(10.7°) while the off side's turns 1.6° — with the two boards' **roll** still within 0.6° of each other (9.04 vs
8.46). **Isolated, the latch's cap channel turns the board by moving the body, not by rolling the board onto a rail.**
That sits beside 3.5d: the roll is the ankle's, and the cap is not where it comes from.

**The limitation, stated.** `?mountAgree=deck` is **not** the owner's address — it changes the ride — so §5 is a
single-channel read on an opt-in arm and not a figure about what he rides. And on the f73 face under that switch the
**probe's own** counterfactual `design()` call throws `singular` four runs in, so that arm has no window at all;
whether the degeneracy is in the ride or only in the probe's counterfactual was not chased. §5 is s16 only, 6 pairs.

## 6. The real Canyon sea — and the premise this refutes

`3.5/foam.ts`'s `MODE=ride` rig on the owner's own spot: the real Canyon sea as `?canyonWaves=true` builds it
(`canyonBed: 'b'`, stage 2, CPU, 1/60 s, seed 1, medium swell), riders placed where the corridor's foam toe crosses
the ride line, 2 trials × 2 placements (0 and 3 m seaward of the toe) × 3 stances × 2 entries = **24 riders, 1 291
live frames, 3 s each**. **The rig's stick is never touched**, so this is the band's **occupancy**, not a steering
test.

| stance | entry | riders | live | through < 3 | 3–4 band | on | off | through ≥ 4 | planed | lost the plane |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| tall | 2 | 4 | 187 | **100.0 %** | 0.0 % | 0 | 0 | 0.0 % | 0/4 | 0/4 |
| crouch | 2 | 4 | 172 | **100.0 %** | 0.0 % | 0 | 0 | 0.0 % | 0/4 | 0/4 |
| compress | 2 | 4 | 182 | **100.0 %** | 0.0 % | 0 | 0 | 0.0 % | 0/4 | 0/4 |
| tall | 5 | 4 | 255 | 29.8 % | 10.2 % | 26 | **0** | 60.0 % | 4/4 | 2/4 |
| crouch | 5 | 4 | 247 | 43.7 % | 8.1 % | 20 | **0** | 48.2 % | 4/4 | 2/4 |
| compress | 5 | 4 | 248 | 30.6 % | 8.1 % | 20 | **0** | 61.3 % | 4/4 | 2/4 |

Three readings, in order of how much they matter:

1. **The band is thin and one-sided.** 8.1–10.2 % of a planing ride's live frames, 0.0 % of a crawling one's, and
   **not one frame of it in the off-plane state in 24 riders.** To be off the plane inside the band a rider has to
   come **up** from below 3 and not yet have crossed 4 — a few frames — and the slow riders never get there at all.
   **So the hysteresis cannot be carrying the owner's complaint, and this closes that lead.**
2. **The off-plane state itself is most of the slow ride.** Every one of 541 live frames of the 12 entry-2 riders is
   below 3 m/s through the water. The ask cap is **exactly 0** on all of them. A rider positioning at walking pace on
   the real Canyon has **no steering authority at all**, and no history can give it to him.
3. **The fast riders lose it.** Of the 12 entry-5 riders, the 6 placed 3 m seaward of the foam toe decelerate from
   5.1 m/s to 0.6–1.7 m/s, cross `PLANING_DROP` at **t = 0.77–0.82 s**, and then spend **32–65 frames (0.53–1.08 s)**
   off the plane while still attached. The 6 placed on the toe keep the plane for their whole live window.

## 7. What this round did not do, and the premises it refuted

- **Refuted:** that the 3–4 m/s hysteresis band is where the owner's "unresponsive" lives. On his own spot the band
  holds 8–10 % of a planing ride, 0 % of a slow one, and its off-plane half was never occupied. §6.
- **Refuted:** that the latch's state is the ask cap and nothing else. It is also `banked` at the mount, and that
  channel is the bigger lever there (§4); it also gates `projecting` in `humanBank` (`:3620`) and the tall projection
  (`:4199`). `COMPRESS_PULL` (`:3890`) and the leg drive (`:3926`) are planing-gated too but are inert on the owner's
  address — the first returns early for the new rider, the second needs `legDrive`, which is off.
- **Refuted, of my own first design:** that a matched-speed comparison of the two states inside the band (`§5` of
  `latch.ts`, printed in the report) can answer the question. It cannot: the two states' frames in a bin come from
  different trajectories at different stages of their own roll, several bins are carried by one run, and the medians
  of |rail|, |bank| and |yaw| do not separate. The only columns in it that mean anything are the ones that are true
  by construction — `cap` median 0.00° off the plane against 11.9–19.6° on it, and |ask| median 0.00° against
  9.4–14.6° with the stick over. The instrument that answers the question is §3's paired stick, not a bin.
- **Not measured:** anything about whether a bigger cap would ride better. No constant is proposed and nothing was
  built. No ride time or survival figure is used as a result anywhere in this document; §6's fall times appear only
  as *when the latch dropped*, which is a latch reading.
- **Not measured:** the band with the stick moved **during** a run (every arm holds its stick for the whole ride), and
  the band on a two-train or bigger Canyon sea than seed 1's medium swell.

## 8. The one-line changes this points at — named, not built

1. **The planing gate on the ask cap is the thing with the measured effect, and the switch for it already exists**:
   `?askCap=4.5` (`AttachedRiderOptions.askCap`, step 3.5a, PR #389, unmerged) is exactly "the planing gate removed
   and nothing else", keeping `TURN_RADIUS = 4.5 m`. §3 and §6 together say that is the switch that would give the
   slow Canyon rider a stick at all. **Not built here; already written and waiting on the owner.**
2. **The mount reads the wrong speed.** `reset:2857` tests `board.velocity.length()` — the flow included, a median
   0.46–0.72 m/s high — where `planingStep` tests the speed through the water. Making the mount's test read the
   latch's own quantity is one line and would remove the 3.655–3.856 m/s latch-on measured in §0. It would also
   change the ride, and it is **not** proposed as a fix: §5 says the cap channel at the mount is small, and §4 says
   the `banked` channel beside it is not.

---

## Reproducing it

```sh
SP=<scratch>
./node_modules/.bin/rolldown docs/research/new-rider/3.3/plant.ts  -o "$SP/pl.mjs"   --format esm --platform node
./node_modules/.bin/rolldown docs/research/new-rider/3.5/latch.ts  -o "$SP/lt.mjs"   --format esm --platform node
./node_modules/.bin/rolldown docs/research/new-rider/3.5/foam.ts   -o "$SP/foam.mjs" --format esm --platform node
SP=$SP sh docs/research/new-rider/3.5/results/35f/run.sh
```

`results/35f/` keeps the four main arms' and the two `mountAgree=deck` arms' gzipped `MOUNT=` dumps, the real-Canyon
ride dump, the reader's two reports (`out.txt`, the owner's default mount; `out-deck.txt`, the single-channel arm) and
the per-arm fall summaries. A bench arm of 51 runs costs 26 s (~0.5 s a run); the real-Canyon arm cost 103 s for its 24 riders.
