# Face hold: carving up a moving face and back (2026-11-10)

**Result: no change shipped.** Five measured routes, none meets the bar (0 falls in
the 32 `release`+`steer` runs, at most 4 of 64). The only settings that cut the
falls do it by the rider no longer turning up the face. This folder records what
was measured so the next attempt starts from the mechanism, not from the levers.

No source file changed: `?faceHold=on` was **not** added. The levers tried are in
`scratch-levers.diff.txt` (env-driven scratch against `AttachedRider.ts` at
0e54ef4a, not for merging).

## The bar and how it is run

Probe: `steepface-probe.test.ts.txt` (copy to `src/physics/zz-steepface.test.ts`,
with `r2Lab.ts.txt` as `src/physics/zz-r2Lab.ts`). Water: `testing/FaceWater.ts`,
20° face, H 1.2 m and 2 m, the rider starting on the flat ahead of the toe, heading
45° off the fall line, the wave overtaking at 0.7 or 1.7 m/s. Plan `top`: steer up
the face (stick 0.5 or 1) until the heading is 65° or 80° off the fall line, then
`release` / `steer` (stick the other way) / `compress` / `snap`. 64 runs:
`run.sh.txt <tag> [ENV=...]`, summary `sum.py.txt`, frame trace `trace.py.txt`.

## The table

| setting (scratch env) | falls /64 | release+steer falls /32 | runs that come round |
|---|---|---|---|
| today (main, 0e54ef4a) | 61 | 32 | 3-4, Compress only (46-60° in ~0.65 s) |
| 1. lean toward the face capped by rail room (`FH_SPAN=30`, flow neutral off) | 62 | 32 | - |
| 2. neutral lean from the water's acceleration under the board | 63 | 32 | 19 (all fall after) |
| 2 + cap 34° | 64 | 32 | 20 (all fall after) |
| 3. feet keep their catch when the stick reverses (three forms, with 2 + cap) | 61-64 | 32 | 8-10 |
| 4. neutral lean from the board's own sideways acceleration, the turn's part taken out | 62 | 32 | 11 |
| 4 + cap 34° / 28° / 22° | 62 / 60 / 58 | 32 | 14 / 21 / 31 |
| 4 + cap 14° / 8° | 32 / 16 | 16 / 8 | **the rider no longer climbs** (heading at the top 36-47°, i.e. turned down the face) |
| 5. the lean leads the turn's pull by at most 15° / 10° | 60 / 60 | 32 | 19 / 4 |
| 5 at 6° | 36 | 16 | **no climb**; untouched riders fall 8 of 16 (today 4 of 16) |

"Cap N°" = the asked lean no further toward the face than N° from the water's
normal across the board. The best honest row is 4 + cap 22°: 58 falls (3 fewer
than today) and 31 runs come round (35-79° turned, peak 73-227°/s, in 0.5-0.7 s),
but 26 of those fall within about half a second of coming round. That is not
worth a switch.

Guard measured for reference: untouched riders (`PLANS=none`) on main fall 1 of 4
per call (3 of 4 stand), as stated in the brief.

## The mechanism (traced, frame by frame)

1. **The climb is a stall the wave wins.** The wave moves at 5.6 m/s (H 1.2) or
   6.7 m/s (H 2); the rider reaches the face at 4.5-6 m/s through the water. To
   hold a heading θ off the fall line without sliding sideways through the water
   the board needs tan θ × (wave speed − the water's own drift) of speed along the
   crest: about 48° is the most a 5 m/s board can hold on the 2 m wave, and 65°
   needs ~10 m/s. Turned to 65-80° the board is broadside to water crossing it at
   1-2 m/s (fin slip 5-8° in the traces), the wave passes under it in about one
   second (face fraction 0.3 → 0.7 in 0.9 s), and the water pushes the feet toward
   the shore at 2-7 m/s² the whole time.
2. **So the balanced body line is away from the face, and the rider is asked to
   lean into it.** The body's balance on the face sits 8-37° to the shore side of
   where a flat-water turn would put it (measured: the board's sideways
   acceleration with the turn's own part taken out, 7-10° in a fast climb, 19-37°
   in a slow one). The reference still asks the flat-water lean (up to 42° at 6
   m/s). At half stick the body holds 14-17° into the face only with the feet's
   catch pinned at its 14° stop for the whole climb; at full stick it reaches 29°
   and the rail passes its bite (53°), which closes the catch.
3. **The feet's catch does not work on the face.** It rights the body by rolling
   the board further onto the inside rail so the carve tightens under the body. On
   the face the board is already 15-20° onto that rail from the face's tilt alone
   (rail 38-50° with a 8-16° lean), and the tighter carve does not come: the water
   crossing the board holds the yaw (13°/s at 20° of roll, where flat water gives
   ~40°/s). The ankle carries about 55 N·m, not its 200.
4. **The upper body's swing pays the difference and runs out.** It winds from 0 to
   its 69° stop in 0.4-0.7 s. At the stop the body, still on the face side of its
   balance, drops into the face (bank −70°), the board unloads (load 1.2 → 0) and
   leaves: every fall in the table ends `bank -70 ... flight`.
5. **Letting go or reversing the stick makes it worse today.** The existing rule
   (steering into a lean the body lags, the feet give nothing and the upper body
   throws) withdraws the catch at the top; the board's yaw then reverses on its own
   (−60 → +100°/s in 0.3 s, the water turning it down the face) while the body is
   still 15° inside. Keeping the catch (route 3) moves the body 8° toward upright
   and then loses the same way.

The two questions in the brief, answered: the board "keeps turning up after the
stick lets go" because the feet's catch is rolling it onto the inside rail to hold
the body, not because of the stick; and its yaw collapses because the water crossing
the broadside board turns it back, not because the rail lets go. The convex top
does unload the board (0.6 g at 5 m/s on the 2 m wave) but the falls begin below
it, at face fraction 0.5-0.65. The lean cap `most` does not starve the way down:
at 5.5 m/s it allows 34°, the body never gets past upright to use it.

## Why each route failed

- **1, cap by rail room.** The rail stays off its bite, but the steady push toward
  the shore is still unpaid: ankle at its stop, swing winds out in 0.7 s.
- **2, neutral from the water's acceleration.** The water's acceleration under the
  board reads 3-8°, a third of the real push (the board slips through that water),
  and at full stick the lean still goes to 39°.
- **3, keep the catch.** The catch has nothing to push against (mechanism 3).
- **4, neutral from the board's own acceleration.** It reads the push correctly
  (up to 37°) but only as it arrives; the push grows at ~80°/s of lean and the body
  has 200 N·m of swing and a dead ankle to follow it. A body already 10° into the
  face cannot cross to 25° the other way while its feet are being carried shoreward.
  Tight caps "work" only by refusing the climb.
- **5, lean leads the turn's pull.** Above ~50° off the fall line the board makes
  no pull to lean on, so the cap either does nothing or forbids the turn; at 6° it
  also makes untouched riders worse.

## The hand on the face (sized, not built)

Sized against the need rather than built, because the numbers do not close:

- Need: the feet are pushed shoreward at 3-5 m/s² for ~0.5 s; keeping a 75 kg body
  with them takes about 225-375 N on the body toward the shore (340 N·m about the
  feet at the worst).
- Supply: a palm (0.013 m², the area the code already uses for the standing hand)
  planing at a lift coefficient of ~0.5 (my estimate for a low-aspect plate at
  ~30°, not a sourced value) gives 3.25 v² N: **40 N at 3.5 m/s, 66 N at 4.5,
  81 N at 5**. Palm and forearm (~0.03-0.04 m²): 100-200 N. That is 12-25 % of the
  need for the palm, 30-60 % with the forearm.
- Reach: standing, the hand meets the water only when the body is 40-55° from the
  face's normal, which is past the point of return in the traces. Crouched
  (Compress) it reaches earlier; the few runs that survive today are Compress runs.

A hand would slow the fall, and would also drag the board further up the face
(its drag is on the face side). It would not turn the table.

## What would be needed instead

The fall is the physics of this water, not a missing reflex: a rider at 5 m/s
cannot hold 65-80° on a wave moving 6-7 m/s. A top turn that survives has to be
planned as one move with the wave's clock: the lean goes to the shore side
*before* the heading passes ~50°, while the board still carries up the face on its
momentum, and the stick-down turn starts with the body already downhill. That is
a change to what the stick asks for on a face (a judgment about the wave's speed
against the board's), and to the probe (a plan that turns at a heading the speed
can hold, or a faster entry), not a balance gain. Also worth knowing before
building it: on these faces the feet's catch (mechanism 3) is the weak part, and
any design that leaves the body on the face side of its balance for more than
~0.4 s will fail the same way.

## Do not retry (added to the existing list)

Cap the lean by rail room alone; neutral lean from the water's acceleration under
the board; neutral lean from the board's own acceleration (reactive); keeping the
feet's catch on a stick reversal; a lean that may only lead the turn's pull; a palm
brace as the fix for a standing rider.
