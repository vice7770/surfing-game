# Step 3.3i: the fall, drawn — is the board rolling under him, or going out from under him? (2026-11-16)

The coordinator's question, which four rounds of columns did not settle, and which the owner answered half of:
*"I think the surfer falls over. Not sure if the board goes away from him."*

**The answer is that the deck rolls under him, and the board going out from under him is not a thing this rider can
do.** Both halves are measured, and the second one is structural rather than statistical.

| | |
| --- | --- |
| `compress-full-stick.svg` | **look at this one first.** Compress, a full stick, entry +0 m/s, `?feltFrame=deck` — the arm every roll number in Part 31 and Part 32 is measured on. Six panels at 0.1 s, the fall's own frame last, `shipped` above and `?ankleLimit=feet` below |
| `compress-quarter-stick.svg` | the owner's **own** case: Compress at a **quarter** stick, the low speed of getting into position. **It is a different fall**, and that is the thing worth seeing |
| `compress-full-stick.txt`, `compress-quarter-stick.txt` | every number on every panel, as the probe printed it |
| `fall-frame-sweep.txt` | the last panel of **24 runs an arm** (3 entry speeds × 4 sticks × 2 stances, the deck filter — `fall.ts`'s own grid), both legs, so nothing below rests on one run |

## How to read a panel

Each panel is a **section across the board**, looking along it from behind the tail.

- the **tan block** is the board's own section at mid-length (beam and thickness read off the live shape), turned by
  its **measured roll**;
- the **red bar** is the feet's own width across, ±0.13 m, on the deck;
- the **black line and dot** are the body's line to its **centre of mass**, drawn at its measured place in the
  **board's** frame and then turned with the board, so what you see is where the body actually is;
- the **grey dashed line** is the **world vertical** through the board's centre — how far from plumb the pair is;
- the **blue line** is the water surface at its measured across slope. **Its height is a datum, not a measurement**:
  it is drawn through the board's own centre of mass, because this probe does not read the board's immersion.

**The last panel is not the separation frame.** Step 3.2z's rule, which `deck.ts` already applies to its own across
split: the split is read on the **latest frame where its two halves still reconstruct the capture point's velocity
term**, *"because on the separation frame the rider's velocity and the feet's point have already been re-set"*. These
sequences follow it — the panels are the consistent frames, the last one is the last of them, and the separation
frame's own time and roll are printed in each leg's heading instead. With that rule the last shipped full-stick panel
reproduces `deck.ts`'s own published split **to the digit**: body **0.95** / feet **−1.44** m/s at its `splitAtS` of
2.600 s.

**The datum of the whole drawing is the board's own frame** (x across toward the +x rail, drawn to the right; y up off
the deck), turned into the world by the roll. That is the one frame in which the two readings differ, and it does not
drift as the board turns — which a fixed world axis would have done over a turn that changes heading by 60°/s.

**It is the Canyon-matched `FaceWater`, not Canyon** (1.4 m / 16° / 5.7 m/s, 2.6 m deep, the board 0.75 fronts ahead
of the crest and 45° off the fall line). That is the same cell every column in Parts 24–32 is measured on, which is
the point: a still from the live Canyon would be a different population from the numbers printed beside it.

## What the full-stick sequence shows, and the number that settles it

| **[M]** shipped, Compress, full stick, entry +0 (fell at 2.65 s, roll 88.7° there) | t−0.5 s | −0.4 | −0.3 | −0.2 | −0.1 | the last panel |
| --- | --- | --- | --- | --- | --- | --- |
| the deck's **roll**, ° | 16.7 | 26.6 | 38.6 | 53.4 | 70.5 | **89.8** |
| the body's bank, ° | 19.1 | 27.5 | 37.9 | 51.4 | 68.5 | 70.0 |
| **the centre of mass across the board's own centreline, m** | **0.025** | **0.011** | **−0.002** | **−0.015** | **−0.016** | **−0.005** |
| across speed, m/s: body / feet (raw, board frame) | 0.82 / 0.02 | 1.16 / 0.16 | 1.50 / 0.29 | 1.88 / 0.39 | 2.22 / 0.36 | 2.27 / 0.28 |
| step 3.3g's own split (felt frame): body / feet | 0.77 / 0.08 | 1.06 / 0.20 | 1.34 / 0.30 | 1.66 / 0.38 | 1.83 / 0.30 | **0.95 / −1.44** |

**The roll goes 17° → 90° while the rider's centre of mass stays within two and a half centimetres of the board's own
centreline, and ends five millimetres off it.** That is the deck rolling under him, drawn. It is not the board
translating away: for that, the body's offset in the board's frame would have to grow, and it does not.

**And over 24 runs, not this one** (`fall-frame-sweep.txt`, the same last-panel frame):

| **[M]** 24 runs, deck filter | shipped | `?ankleLimit=feet` |
| --- | --- | --- |
| \|centre of mass across the centreline\|, m | **0.002–0.173** | 0.006–**0.418** |
| … over the feet's own 0.13 m | **2 of 24** | **10 of 24** |
| … over 0.26 m (a whole foot-width out) | **0 of 24** | **3 of 24** |
| \|roll\| at the separation frame, ° | 1.1–91.1 | 0.4–100.9 |
| … over 60° | 17 of 24 | 15 of 24 |
| \|centre of mass across\| **in those 17 (15) runs**, m | **0.003–0.113** | 0.006–0.418 |
| \|body\| across speed against \|feet\|, m/s | 0.49–2.84 against 0.05–2.01 | 0.00–2.57 against 0.02–1.91 |
| … the body the faster one | **21 of 24** | 18 of 24 |

**In every one of the 24 shipped runs the body is still over the board when it goes** — never more than 1.33× the
feet's own half-width out, and **inside** the feet in 22 of 24 — and in the 17 where the roll passes 60° it is inside
**0.113 m**, which is inside the feet, in all 17. **The board does not leave him. It tips him off.**

## The structural half, which is why no amount of statistics was going to settle it

`deck.ts`'s `feetAcross` column is `board.velocityAt(captureFeet)`, and `AttachedRider.captureStep` builds
`captureFeet` as `board.toWorld(midX, deckHeight(midZ), midZ)` — **the middle of the support region, a point fixed in
the board's frame**, re-expressed in the world every substep. So that column is **the velocity of a board-fixed
point, by construction**. It cannot contain any sliding of the feet on the deck, because while the rider is attached
there is none to contain: the feet do not move in the board's frame at all.

**So step 3.3g's reading of its own 8-of-12 is refuted, and its measurement is not.** The column is right —
`relAcross` really does run 1.399–2.432 m/s with the feet's term the larger — but *"the board slides out from under
him more often than he topples off it"* is not what it says. Two things make the feet's term large:

1. that point is **carried** by a board which is rolling at up to 354 °/s and turning at up to 234 °/s, so a
   board-fixed point above the centre of mass really is moving across fast; and
2. the split is taken in the **felt** frame (the board-frame velocity less its component along the felt vertical), and
   at 89° of roll the felt vertical is nowhere near the deck's up, so that subtraction moves a large share of the
   carried velocity from one column into the other. **In the board's own geometric frame the body is the faster one in
   21 of 24 runs** (body 0.49–2.84 m/s against the feet's 0.05–2.01).

**The owner's words and the measurement are the same event.** A deck that rolls from 20° to 89° under a man whose
weight never leaves it looks, from outside, exactly like *"the surfer falls over"*.

## The owner's own case is a different fall, and this is the find

`compress-quarter-stick.svg`. At a **quarter** stick — their stated bar, the low speed of getting into position —
the roll only reaches **−43.6°**, and what crosses the line is the **body**:

| **[M]** shipped, Compress, **quarter** stick, entry +0 (fell at 3.82 s, roll −43.6° there) | t−0.5 s | −0.4 | −0.3 | −0.2 | −0.1 | the last panel |
| --- | --- | --- | --- | --- | --- | --- |
| the deck's roll, ° | 10.5 | 10.6 | 11.5 | 14.4 | −4.1 | **−29.8** |
| the body's bank, ° | 7.8 | 9.0 | 10.6 | 7.2 | −17.2 | **−34.1** |
| **the centre of mass across the centreline, m** | −0.024 | −0.013 | −0.005 | −0.062 | **−0.127** | −0.059 |
| the ankle's torque, N·m | 11 | 2 | −14 | 80 | 134 | **151** |

**The body banks past the deck, not with it** (−34.1° of bank against −29.8° of roll), the centre of mass reaches the
feet's own edge on the way, and the ankle's demand runs to **151 N·m** — 1.6× what the soles can transmit. In the
full-stick panels the body's bank is **behind or level with** the roll the whole way down (19.1 against 16.7, 27.5
against 26.6, 37.9 against 38.6, 51.4 against 53.4, 68.5 against 70.5).

**And that difference holds over the 24 runs, which is what makes it a finding and not a trace.** Taking
`|bank| − |roll|` at the last panel: in the **17** runs whose separation roll passes 60° it is **−20.0 to +0.6°** —
the body is never ahead of the deck by more than half a degree; in the **7** whose roll stays under 60° it is
**−8.0 to +15.4°** [M]. **Two different falls, and the owner's bar is about the second one**, which the roll finding
of Part 31 is not primarily about. One honest caution: each drawn sequence is **one run**; the sweep is what carries
the population claim.

## And what the ankle's own bound does to the picture — which is why it is not shipped on

Compare the two rows of `compress-quarter-stick.svg`. With `?ankleLimit=feet` the ride is 0.07 s longer, the
separation roll is only **−18.6°**, and the body ends **−0.217 m** off the centreline — and over the 24 runs the
centre of mass is outside the feet in **10 of 24** against the shipped **2 of 24**, a whole foot-width out in
**3 of 24** against **0**, and as far as **0.418 m** out against the shipped **0.173**. **The bound lets go of him:
it makes the fall worse and more absurd-looking, which is the measured reason it stays opt-in and off.** See
`../README.md` Part 32 §4.

## Not shown here

Motion, water, and the board's immersion. Every panel is one held still of a section, the water line is a datum and
not a reading, and **no bot ride is offered as evidence of feel anywhere in this directory.**
