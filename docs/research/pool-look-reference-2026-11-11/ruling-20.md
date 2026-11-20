# Advisor ruling 20: after `?frameJoin=arc` (step 7, branch `claude/pool-frame-join`, d95fd451)

Water-physics advisor, 2026-11-12.
Tags: [M] measured by me for this ruling, [M7] measured in `step7/README.md`, [C] read in code, [R] reasoned.
Runs: `ruling-20-runs/flagged-frames.py` on the committed Basilisk library files (no sea, no game code, a few seconds). Outputs `flagged-frames-big.txt`, `-small.txt`, `-canyon-a38.txt`. No heavy run.

## Short answers

1. **The refilled frames are good water with a bad mark.** Keep the run's own frames. Build a second stored library for the switch. Do not re-make them from neighbours.
2. **The face anchor reads the truer curve.** Take a new base list. Today's list is not worth pinning: it is built on a curve that is up to 0.32 m off the Basilisk run.
3. **Finish it, but as the library fix, and after the foot-line probe.** `wallRise=carry` needs the real frames more than before.
4. **Hold the branch.** Do not merge it as it stands.

A correction first. My ruling 19 test (0.097 → 0.016 m) ran on `a38`, not on the ref pool's case `big`. The builder found that. My bar A2 was set from the wrong case.

## 1. The refilled frames

Why they are refilled [C]: `tools/basilisk/analysis/library.py` flags a frame when a mark moves too far in one frame. `caseFromLibrary.ts` (:140–166) then throws the whole frame away and stores the point-by-point join of the nearest clean frames.

What the flags are [M]:

| Case | Frames before the throw | Flagged | Flags |
|---|---|---|---|
| `big` (ref pool) | 120 | 30 | `jump_lip` 30, `jump_toe` 4, `toe_collapsed` 3 |
| `small` | 120 | 18 | `jump_lip` 18 |
| Canyon `a38` | 120 | 38 | `jump_lip` 38, `toe_collapsed` 2 |

- Every flagged frame carries `jump_lip`. That is the lip mark, "the steepest point", which ruling 19 showed is noise before the throw.
- None is torn, none lacks a profile.

Is the water in them bad? No [M]. For each flagged frame I compared its own curve, crest to toe, with two rebuilt curves:

| `big`, frames flagged `jump_lip` only (25) | median | 90 % | most |
|---|---|---|---|
| own curve off the arc join of its clean neighbours | 0.016 m | 0.021 m | 0.021 m |
| own curve off the stored refill (what the game draws today) | 0.026 m | 0.129 m | 0.318 m |
| the same, last 0.6 s only (10 frames): off the arc join | 0.016 m | — | 0.021 m |
| the same, last 0.6 s: off the stored refill | 0.123 m | — | 0.318 m |

- 0.016 m is the floor of this measure: clean frames rebuilt from clean neighbours give the same 0.016 m.
- So the run's own frames are sound. The refill is the error: 0.12 m at the median in the last 0.6 s, 0.32 m at clock −0.05 s.
- **This is in the default game today**, not only under the switch. The stored curve just before the throw is up to 0.3 m off the Basilisk run on `big`. `small`: up to 0.06 m. Canyon `a38`: up to 0.14 m.
- Five frames of `big` carry a toe flag. Three (`toe_collapsed`, clocks −1.39, −1.19, −0.18 s) are truly broken: the toe mark stands 1.2–1.9 m away. Those must stay refilled.

Ruling: none of (i), (ii) as written. Build **a second stored library**, made by the builder, loaded only under `?frameJoin=arc`:
- A frame before the throw whose only flag is `jump_lip`: keep its own curve. Space it by arc (crest to toe, lip at the throw's share).
- A frame with any other flag: refill it by the arc join of the nearest kept frames.
- Clean frames: spaced by arc, as the switch does at load today.
- From the throw on: byte for byte today's frames.
- New files beside today's (for example `…-l13-arc.bin`). Today's files and the default do not change. The library JSON files are committed (`docs/research/pool-tube-runs/data`, `canyon-tube-runs/data`), so the builder can read them on this machine [C].
- Why not (i), re-make by arc at load: it invents up to 5 frames in a row (0.08 s) when the real ones exist.
- If the builder cannot read the JSON for a case, (i) is the fallback for that case. Say so in the write-up.

Bars (library probe, on `big` and `small`):
- L1, hard: every kept frame lies within 0.005 m of the run's own curve (the JSON's), crest to toe.
- L2, hard: leave-one-out in the last 0.6 s, all frames but the toe-flagged ones: 0.02 m at 90 %.
- L3, hard: from the throw on, bytes equal today's.
- L4, report: how many frames are kept, refilled, and which.
- L5, report: the largest slide of a vertex along the curve between two stored frames. Reason: on `big` the crest mark itself jumps 1.0 m in one frame at clock −0.86 s, on frames flagged clean (crest-to-toe arc 6.43 → 5.49 m) [M]. The surface does not jump; the mark does. If L5 shows it (a slide near 0.9 m), hand it back. Do not fix it in this build.

## 2. The face anchor

- **Let it read the truer curve.** One curve for the drawing, the contact, the wall water and the anchor. Two curves for one wave is a break of "one water", even at 0.0012 m median.
- The "byte for byte" bar was mine. It assumed today's curve was the true one. It is not [M, section 1].
- The 0.21 m "most" [M7]: very likely a refilled frame [R]. The stored refill is off by 0.19 m at −0.11 s and 0.32 m at −0.05 s, right where the anchor reads. The builder should print the clock of that 0.21 m. With the new library the anchor's move against today's will not shrink. It is today's error being removed.

What replaces "byte for byte", once, for this step only (new run against `step6/arc.txt`):
- Throws: count within 0.5 %. Asked water within 0.5 %. Thrown/asked 0.999 or more. Missed 0. Covered no more than the base.
- Jets: 99 % in the same step; 99 % within 0.05 m in place; the largest change in asked water on one jet reported.
- A within 0.02 m. B (peel) within 0.1 m/s. C (first break depth) within 0.02 m. F no more than the base + 0.1 m/s.
- J3, J4 within 0.02 m. The crest's largest step no larger than 0.355 m.
- Step 7's drift already sits inside these (throws +1 of 1293, asked +0.08 %, A −0.01 m) [M7].
- Then the new list **is** the base. Every later build (the carry) must match it byte for byte again.
- The default's list stays byte-equal to today's. That bar does not move.

## 3. Is it still worth finishing?

- By eye, no gain. A5 barely moved. That stands.
- But the reason to do it grew. `wallRise=carry` differences frames. Today's stored frames hold steps of 0.12 m (median, last 0.6 s) where a real frame meets a refilled one. Over two frames that is about 4 m/s of false rise [M, R]. The carry would put that into the felt water.
- Could the carry difference only real frames? Not with today's files: the stored library does not record which frames are refilled [C], and 11 of the last 40 on `big` are. It needs the real frames. That is the same library job.
- So: do not park it. Re-aim it. The work left is the second library (section 1) and the anchor's read (section 2). The join code on the branch stays.
- One easing for the carry: read G as the curve's speed along its own normal (nearest distance between the two curves), not vertex against vertex. Then a sliding mark cannot enter G at all [R].
- Order: the foot-line probe goes first. It is probe-only, it is what the eye sees, and it does not depend on this.

A4 (lower face at the mouth, 1.2 % over 90°): split the count at the throw. If what is left is after the throw, it is the opening lip joined to slices not yet thrown. The fix is then ruling 18's: no two neighbour slices more than 0.04 s apart in clock between −0.2 and +0.2 s. A report for now, not a gate.

## 4. Merge or hold

Hold. It misses A1, A2 and the list, shows nothing by eye, and the fix changes what the switch loads. Merge it once sections 1 and 2 are in and L1–L3 and the list's bars pass. Then it is an opt-in switch with a reason.

## For the owner, one plain line

The wave shapes stored in the game today are, on about a quarter of the moments before the lip throws, not the simulated wave but a rough stand-in. The stand-in is up to 0.3 m off just before the throw. The real shapes were there all along and are good. This step puts them back, behind a switch.

## Build order

One change at a time. Each opt-in. The default byte-identical. Canyon hash check before each merge.

1. Foot-line probe (the slope's jump across the foot line, per slice, by clock). Then a ruling. No build.
2. The second library + `?frameJoin=arc` loading it + the anchor on the same curve. Bars L1–L5, A3, A6, the list's tolerances (section 2). Then merge the branch, opt-in. Take the new list as the base.
3. `?wallRise=carry` (ruling 19's spec, G along the normal). Bars W1–W3, the list byte-equal to the new base. Stop rule as in ruling 19.
4. The owner rides it.
5. Remove `anchorLine=smooth`.
6. C2 on the pool (owner's call).

Not asked, for the owner's list: the default library has the same stand-in frames. Fixing the default is a change to every tube in the game. That is an owner's call, after the switch has been ridden.
