# Step 3.5n — `|px|`'s pin at the support's half-width is the **stopping rule**, not a clamp and not the freeze

⛔ **Measurement and code-reading only.** `git diff -- src/` is empty. Nothing was re-run: every number below is read
out of PR #454's own saved runs (`3.5/results/35m/A-control.jsonl`, `B-rigs.jsonl`, `C-owner.jsonl`), with the reader
in `3.5/pxpin.py` and its output in `3.5/results/35n/35n-out.txt`. No tuning, no gain, no constant, no switch, no
ruling.

## 0. The question

PR #454 (step 3.5m, `3.5/README.md` Part 3 §9) flagged, as the one thing it wanted looked at before anything was
built on the across position term:

> ⛔ I will not claim the position term's saturation is understood. `|px|` sits at **0.1301 m** against a 0.13 m
> half-width in **67 of 100** steered falls. That it pins almost exactly at the support's edge is measured and
> unexplained.

If that term pinned at its own limit **by construction**, the 67 falls would be decided by a clamp and the same
round's published correction — *the position-only condition `weightPast` flips last in 87 of 142 falls* — would be
suspect with it. It is not a clamp.

## 1. The answer, in four lines

1. ⭐⭐ **`px` is a free quantity.** `humanBalance.ts:472` is `const px = offset.x - height * nx;` and nothing between
   there and the probe's read limits it. `halfAcross` never appears on the right-hand side of anything `px` is built
   from. Its four uses in `capture()` are all downstream of it: subtracted from `|s.across|` to form `pastX` (`:486`),
   scaled by `HIP_SHARE` for the hip's trigger (`:492`), **compared** against `|px|` (`:497`), and a **divisor** in
   the margin (`:499`). `reachAcross`'s three are the same: `:495`, `:496`, `:499`. Not one of them writes back into
   `px`, `s.pointAcross` or `s.across`. There is no `Math.min`, `Math.max`, projection or reconstruction of `px`,
   `s.pointAcross` or `s.across` against the support box anywhere in the file (the file's complete clamp list is
   `:76, :86, :157, :163, :387, :424, :425, :427, :429, :460, :468, :469, :486, :487, :488, :501, :521, :541`).
2. ⭐⭐ **It demonstrably exceeds the box.** On the same 100 steered capture-test falls `|px|` at the separating
   substep runs to **0.2591 m = 1.99 × halfAcross**; over all 142 separating substeps in the set to **0.7193 m =
   5.53 ×**. A clamped quantity cannot do that.
3. ⭐⭐ **The pin is a first-crossing artefact of where the quantity is sampled.** `|px|` is read **at the separating
   substep**, and `HumanBalance.fallen` is `beyond && weightPast` (`:512`) with
   `weightPast = Math.abs(px) > halfAcross || …` (`:497`). In **46 of 46** of the pinning falls, `|px|` one substep
   earlier (1/3840 s) was **at or inside 0.130 m** — median **0.1299 → 0.1301 m**, a step of **+0.0003 m** (range
   0.0000–0.0009), i.e. `h · |ṗx|` at |ṗx| ≈ 1.15 m/s. The run ends on the substep `|px|` first crosses the edge, so
   the only value of `|px|` the separating substep can hold is the edge plus one substep's travel. **All 46 are in
   the "`weightPast` flips last" group — unanimously.**
4. ⭐ **The same pin appears on the other leg, at a different edge.** Of the along-only falls whose `weightPast`
   flipped last (n=32), `|pz|` sits within **0.0010 m past 0.375 m in 30**, min 0.3750, median **0.3752**. Two
   different thresholds, two different numbers, the same pin: it belongs to the stopping rule, not to `halfAcross`.

## 2. It is not the freeze either

`CaptureState`'s published columns are held stale while the feet are light (`humanBalance.ts:457–462`,
`CAPTURE_LOAD = 0.2 bw`), and #454 recorded that trap. On the 46 pinning falls:

| | pinned (46) | further past (21) | inside (33) |
| --- | --- | --- | --- |
| frozen **at** the separating substep | **0** | 0 | 0 |
| `frozenShare` median | **0.0000** | 0.0055 | 0.0448 |
| `frozenShare` max | **0.0581** | 0.3267 | 0.2780 |
| runs with any frozen substep | **1 of 46** | 11 of 21 | 21 of 33 |

The freeze is **least** present exactly where the pin is. And the pinning value is not read off a published column at
all: §6's `posTerm` is `fallEPx`, the probe's own live reconstruction, whose control (`offsetMiss`, `vxMiss`) is
**exactly zero** on unfrozen substeps. Where the published column and the live reconstruction do disagree by more
than 0.0005 m (11 of 100 runs), the state was frozen in **11 of 11** — the trap is real, it is just not under this
pin.

## 3. Does it genuinely exceed the box, or only touch it?

It exceeds it, by at most one substep's travel. The test is a strict `>` (`:497`); in all **46 of 46** pinning falls
`weightPast` is true at the separating substep while the along leg is false (`|pz| ≤ 0.261 m` against 0.375 m), so
`|px| > 0.130 m` strictly held — including the **9** that print as exactly `0.1300` at four decimals, whose excess is
therefore under 0.00005 m. The band as a whole is 0.1300–0.1305: an excess of **≤ 0.0005 m, ≤ 0.4 % of the
half-width**. The saved data is rounded to 4 dp, so the unrounded excess per run is not recoverable from it; the
strict inequality is, from `fallWeightPast`.

## 4. The shape this project was bitten by once — found, and it is a different quantity

The warning was right that this shape exists in the contact, and it is worth naming so no round confuses the two:

- `AttachedRider.ts:5364` builds `freeX = local.x - (height * j.x) / j.y`, the **free** centre of pressure — the same
  geometric form as `px`, but off the contact impulse `j`.
- `:5371` clamps it: `const copX = Math.min(support.xMax, Math.max(support.xMin, freeX));`, and `:5373` calls that
  `limit = 'tip'`.
- `:5374–5384` builds the tangential force from the **clamped** CoP and then friction-limits it, and `:5394–5396`
  reconstructs the **exposed** `contact.centreOfPressure` from the friction-limited force. So the exposed transverse
  contact centre is indeed not the free demand; the free demand is `desiredCop` (`:5368`).
- `:3236` `soleBound()` caps the moment the soles may transmit at `legLoad × halfAcross`.

⭐ **None of them touches `px`.** `px` is built from `offset` (the rider's own centre of mass minus the feet's
middle, `:5160`) and `felt` (the **pair's** specific force from a momentum difference, `:5166, :5188–5196`,
low-passed) — both **delivered** quantities, neither passing through the contact's clamp or its friction cap. And the
direction of the contact clamp's effect is the opposite of a pin: once the free CoP leaves the box the feet can no
longer make the restoring moment, so `px` runs *away* past the edge, which is what the 0.2591 m and 0.7193 m
readings are.

The two floors in the `px` chain do not bind: `height = Math.max(0.2, offset·n)` (`:468`) has min **0.2048 m** over
the 100 steered falls and binds in **0** of them and **0** of the 46 pinned; `Math.max(0.5, g)` (`:469`) sees a
minimum `|felt|` of **1.827 m/s²**.

## 5. Which leg of `weightPast`, and on the owner's address

| band | n | across leg (`\|px\| ≥ 0.130`) | along leg (`\|pz\| ≥ 0.375`) | both |
| --- | --- | --- | --- | --- |
| pinned (0.1295–0.1310) | 46 | **46** | **0** | 0 |
| further past (> 0.1310) | 21 | 21 | 4 | 4 |
| inside (< 0.1295) | 33 | 0 | 33 | 0 |

The pinning falls are the across leg and nothing else; the falls where `|px|` is inside the box are the along leg.
That is the same statement as §1.3 read from the other side.

**The owner's address pins too** (`{ feltFrame: 'deck', riderBody: 'two', stanceReach: 'keep', deepen: 'on' }`,
`3.5/forward.ts:142`): of his 48 steered capture-test falls, `|px| ≥ 0.130` in **31**, the pinned band holds **21**,
median `|px|` **0.1301 m**, and in **21 of 21** `|px|` was at or inside the edge one substep earlier with the same
median step of **+0.0003 m**. The probe's arm: 52 falls, 36, 25, 0.1301 m, 25 of 25. ⭐ **The mechanism is the same on
both arms**, which is worth having, because #454 found his arm harsher on the *outcome* (0 of 24 surviving against
1 of 24).

## 6. ⭐ Does #454's published correction survive?

**Yes — and the pin is its mechanism, not a threat to it.** Reproduced exactly from the saved runs, as the positive
control:

| published in #454 | reproduced |
| --- | --- |
| `weightPast` flips last 87, `beyond` 38, both 17, over 142 falls | **87 / 38 / 17** |
| of which zero-stick 16 / 6 / 14 | **16 / 6 / 14** |
| 100 steered falls, `\|px\| ≥ 0.13` in 67, median 0.1301 m | **100 / 67 / 0.1301 m** |
| median `\|vx/ω\|` 0.3635 m | **0.3635 m** |
| inside `weightPast`: across 63, along 63, both 9, neither 7 | **63 / 63 / 9 / 7** (read as exclusive categories) |

`|px|` pinning at the edge is what *"a position condition closed last"* looks like when it is true: `beyond` is
reached early on the capture point, whose own distance is the larger of the two (median `|vx/ω|` 0.3635 m against
`|px|` 0.1301 m), and the run then waits for the centre of mass itself to cross the support — and ends on the substep
it does. Had the position term been irrelevant, the separating substep would have found `|px|` long past the edge in
those falls; in 46 of them it finds it one substep inside it.

Two scope notes, neither of which overturns the correction:

- ⚠️ **17 of the 142 falls did not separate by the capture test at all** (5 `lost board` = MAX_FLIGHT, 12 on a
  posture/sway backstop; `humanFallen` is false on them). For those the "which half flipped last" classification
  reads `endBeyond`/`endWeightPast` on a run the test did not end, so it means nothing. Over the **125** that the
  test did end: **`weightPast` last 82, `beyond` last 38, both 5.** The conclusion is unchanged and the margin is
  slightly wider (82 against 38); the exact figure **87** should be quoted as *over all 142 falls, 17 of which
  separated for another reason*, or replaced by **82 of 125**.
- #454's own scope limit still binds and this reading does not widen it: flat still water, two unphysical speed
  conditions, one hull, two stances, three entry speeds. ⛔ Nothing here is carried to the live wave, and the
  across-channel readings remain unreadable below 9 m/s for the reason #454 gave (the tow amplifies across velocity
  3.16× at 5 m/s, 1.87× at 7, 1.00× at 9).

## 7. What this means for the builder, and what it does not

- ⭐ **The across position term may be built on.** It is the free centre-of-mass projection along the felt vertical,
  unclamped, and its appearance at 0.1301 m is the test's own threshold crossing, not a limit inside the quantity.
- ⚠️ **Do not read `|px|` at the separating substep as a magnitude.** It is conditioned on the crossing, so its
  distribution there is the threshold plus `h · |ṗx|` by construction, for *either* leg, at *whatever* the edge is.
  Any future round that wants the position term's size must read it over the run, or at a fixed time, not at the
  fall.
- ⚠️ **"Which half flips last" is a 0.26 ms-resolution statement.** It is a true statement about the test's
  arithmetic and it does refute *"the position term never trips"*; it is not by itself a statement about which
  physical quantity drove the fall, since both conditions approach their thresholds together.
- ⛔ **Nothing here is a reason to change `weightPast`, `CAPTURE_LOAD`, the support box or the substep count.**

## 8. Controls

| control | result |
| --- | --- |
| #454's §8 counts, its 100/67/0.1301, its 0.3635 and its 63/63/9/7 | **all reproduced exactly** (§6) |
| `git diff -- src/` | **empty** |
| the floors at `humanBalance.ts:468` and `:469` | **bind in 0 of 100** |
| `\|px\|` one substep before the separating substep, pinning falls | **≤ halfAcross in 46 of 46** |
| the same pin on the along leg at 0.375 m | **30 of 32 within 0.0010 m** |
| frozen at the separating substep, pinning falls | **0 of 46** |
